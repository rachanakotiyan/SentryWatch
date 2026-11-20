const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const GH_OWNER_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const GH_REPO_RE = /^[\w.-]{1,100}$/;

export const ASSET_TYPES = ['DOMAIN', 'REPOSITORY', 'EMAIL'];

export const isEmail = (v) => typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);

/** Normalise a raw user value for an asset type. Returns the canonical target or null if invalid. */
export function normalizeTarget(type, raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  if (type === 'EMAIL') {
    const email = value.toLowerCase();
    return isEmail(email) ? email : null;
  }
  if (type === 'DOMAIN') {
    const host = value.toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '');
    return DOMAIN_RE.test(host) ? host : null;
  }
  if (type === 'REPOSITORY') {
    const path = value.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
    const [owner, repo, ...rest] = path.split('/');
    if (rest.length || !owner || !repo || repo === '.' || repo === '..') return null;
    return GH_OWNER_RE.test(owner) && GH_REPO_RE.test(repo) ? `${owner}/${repo}` : null;
  }
  return null;
}
