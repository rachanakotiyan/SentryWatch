import process from 'node:process';
import { ScanError } from './scanError.js';

const API = 'https://api.github.com';
const MAX_FILES = 60;
const MAX_BYTES = 200_000;
const MAX_FINDINGS = 50;

// Files that should never be in a public repo.
const SENSITIVE_FILE = /(^|\/)(\\.env(\\.[\\w.-]+)?|id_(rsa|dsa|ecdsa|ed25519)|\\.npmrc|\\.pgpass|\\.htpasswd|terraform\\.tfstate|[\\w.-]+\\.(pem|key|p12|pfx))$/i;
const SAFE_ENV_TEMPLATE = /\\.env\\.(example|sample|template|dist|defaults?)$/i;
const SKIP_PATH = /(^|\\/)(node_modules|vendor|dist|build|\\.git|__pycache__)\\/|package-lock\\.json$|yarn\\.lock$|pnpm-lock\\.yaml$|\\.min\\.(js|css)$|\\.(png|jpe?g|gif|svg|ico|pdf|zip|gz|woff2?|ttf|mp4|lock)$/i;
const TEXT_EXT = /\\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|java|php|cs|sh|bash|ya?ml|json|toml|ini|cfg|conf|properties|tf|xml|env|txt|md|gradle)$/i;
const PLACEHOLDER = /^(changeme|change_me|your[-_ ]|example|xxx+|\\*+|<.*>|\\$\\{.*\\}|\\{\\{.*\\}\\}|process\\.env|todo|dummy|test|password|secret|null|none|true|false)/i;

export const SECRET_PATTERNS = [
  { id: 'aws-access-key', name: 'AWS access key ID', severity: 'CRITICAL', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: 'private-key', name: 'Private key', severity: 'CRITICAL', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g },
  { id: 'github-token', name: 'GitHub token', severity: 'CRITICAL', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/g },
  { id: 'stripe-live-key', name: 'Stripe live secret key', severity: 'CRITICAL', re: /\bsk_live_[0-9a-zA-Z]{24,}\b/g },
  { id: 'slack-token', name: 'Slack token', severity: 'HIGH', re: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/g },
  { id: 'google-api-key', name: 'Google API key', severity: 'HIGH', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  // password/secret/token = "literal value" (generic, so only MEDIUM and placeholder-filtered)
  { id: 'generic-secret', name: 'Hardcoded credential', severity: 'MEDIUM', group: 1,
    re: /(?:api[_-]?key|secret|passwd|password|auth[_-]?token|access[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi },
];
// KEY=value lines inside committed .env files (unquoted).
const ENV_LINE = { id: 'env-secret', name: 'Secret in .env file', severity: 'HIGH', group: 1,
  re: /^[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*["']?([^\s"'#]{8,})/gim };

const redact = (v) => `${v.slice(0, 4)}…(${v.length} chars)`;
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Scan one file's text. Pure function: easy to unit test. Matches are redacted, never returned in full. */
export function scanText(path, text) {
  const isEnv = SENSITIVE_FILE.test(path) && /\.env/i.test(path);
  const patterns = isEnv ? [...SECRET_PATTERNS, ENV_LINE] : SECRET_PATTERNS;
  const hits = [];
  for (const p of patterns) {
    for (const m of text.matchAll(p.re)) {
      const value = m[p.group || 0];
      if (p.group && PLACEHOLDER.test(value)) continue;
      hits.push({ pattern: p, line: lineOf(text, m.index), sample: p.id === 'private-key' ? 'BEGIN PRIVATE KEY header' : redact(value) });
    }
  }
  // collapse to one finding per pattern per file
  const byPattern = new Map();
  for (const h of hits) {
    const entry = byPattern.get(h.pattern.id) || { pattern: h.pattern, lines: [], sample: h.sample };
    entry.lines.push(h.line);
    byPattern.set(h.pattern.id, entry);
  }
  return [...byPattern.values()].map(({ pattern, lines, sample }) => ({
    severity: pattern.severity,
    title: `${pattern.name} exposed in ${path}`,
    details: `${pattern.name} found in "${path}" (line${lines.length > 1 ? 's' : ''} ${[...new Set(lines)].slice(0, 5).join(', ')}; sample ${sample}). ` +
      'Revoke and rotate it now - removing it from the latest commit does not remove it from git history.',
  }));
}

async function gh(path, token, signal) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'SentryWatch-scanner', 'x-github-api-version': '2022-11-28' };
  if (token) headers.authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API}${path}`, { headers, signal });
  } catch (err) {
    throw new ScanError(`Could not reach GitHub (${err.name === 'TimeoutError' ? 'timeout' : err.message})`, 502);
  }
  if (res.status === 401) throw new ScanError('GitHub rejected GITHUB_TOKEN (invalid or expired) - fix or unset it', 502);
  if (res.status === 404) throw new ScanError('Repository not found (it may be private - set GITHUB_TOKEN with access)', 404);
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw new ScanError(`GitHub rate limit reached${reset ? `; resets at ${new Date(reset * 1000).toISOString()}` : ''}. Set GITHUB_TOKEN to raise the limit.`, 429);
  }
  if (!res.ok) throw new ScanError(`GitHub returned HTTP ${res.status}`, 502);
  return res.json();
}

async function fetchRaw(owner, repo, sha, path, token, signal) {
  const headers = { 'user-agent': 'SentryWatch-scanner' };
  if (token) headers.authorization = `Bearer ${token}`;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
  try {
    const res = await fetch(url, { headers, signal });
    return res.ok ? await res.text() : null;
  } catch { return null; }
}

/**
 * Scan a repository ("owner/repo"): committed secret-bearing files plus secret patterns in text files.
 * Uses the git tree + raw file downloads, so it isn't bound by the strict code-search rate limit.
 */
export async function scanRepository(target, { token = process.env.GITHUB_TOKEN, timeoutMs = 20000 } = {}) {
  const [owner, repo] = target.split('/');
  const signal = AbortSignal.timeout(timeoutMs);

  const meta = await gh(`/repos/${owner}/${repo}`, token, signal);
  const branch = meta.default_branch;
  const tree = await gh(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token, signal);

  const blobs = (tree.tree || []).filter((n) => n.type === 'blob' && !SKIP_PATH.test(n.path) && (n.size ?? 0) <= MAX_BYTES);
  const findings = [];

  for (const n of blobs.filter((b) => SENSITIVE_FILE.test(b.path) && !SAFE_ENV_TEMPLATE.test(b.path))) {
    const isEnv = /\.env/i.test(n.path);
    findings.push({
      severity: 'HIGH',
      title: `${isEnv ? 'Environment file' : 'Sensitive file'} committed: ${n.path}`,
      details: `"${n.path}" is tracked in ${target}. ${isEnv ? '.env files normally hold secrets' : 'Key and credential files'} must not be in git. Remove it, add it to .gitignore and rotate anything it contained.`,
    });
  }

  const sensitiveFirst = (p) => (SENSITIVE_FILE.test(p) ? 0 : 1);
  const candidates = blobs
    .filter((b) => TEXT_EXT.test(b.path) || SENSITIVE_FILE.test(b.path))
    .sort((a, b) => sensitiveFirst(a.path) - sensitiveFirst(b.path))
    .slice(0, MAX_FILES);

  let scanned = 0;
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = candidates.slice(i, i + 5);
    const texts = await Promise.all(batch.map((n) => fetchRaw(owner, repo, branch, n.path, token, signal)));
    texts.forEach((text, idx) => {
      if (text === null) return;
      scanned += 1;
      findings.push(...scanText(batch[idx].path, text));
    });
  }

  return {
    findings: findings.slice(0, MAX_FINDINGS),
    telemetry: {
      repository: target, defaultBranch: branch, visibility: meta.private ? 'private' : 'public',
      filesInTree: (tree.tree || []).length, filesScanned: scanned,
      truncated: Boolean(tree.truncated) || candidates.length === MAX_FILES, findingsCapped: findings.length > MAX_FINDINGS,
    },
  };
}
