import crypto from 'node:crypto';
import process from 'node:process';
import { ScanError } from './scanError.js';

const UA = 'SentryWatch-scanner';
const CRITICAL_CLASSES = ['Credit cards', 'Bank account numbers', 'Social security numbers', 'Passport numbers', 'Government issued IDs', 'Payment histories'];
const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

/** Labelled sample data for demos. Emails containing "clean" or "safe" come back with no findings. */
export function demoEmailScan(email) {
  if (/clean|safe/i.test(email)) return { findings: [], telemetry: { demo: true, breaches: 0 } };
  const findings = [
    { severity: 'HIGH', title: '[DEMO] Email found in Adobe breach',
      details: `[DEMO DATA - not a real lookup] ${email} appeared in the Adobe breach (2013). Data: Email addresses, Password hints, Passwords. Reset this password everywhere it was reused and enable MFA.` },
    { severity: 'MEDIUM', title: '[DEMO] Email found in Canva breach',
      details: `[DEMO DATA - not a real lookup] ${email} appeared in the Canva breach (2019). Data: Email addresses, Names, Usernames.` },
  ];
  return { findings, telemetry: { demo: true, breaches: findings.length } };
}

/**
 * Email breach lookup. Needs a paid HIBP API key - there is no free email endpoint.
 * Without a key this throws (503) instead of inventing results.
 */
export async function scanEmail(email, { apiKey = process.env.HIBP_API_KEY, timeoutMs = 8000, demo = process.env.DEMO_MODE === 'true' } = {}) {
  if (!apiKey) {
    // Demo mode: only when explicitly enabled AND no real key is set. Always labelled, flagged in telemetry.
    if (demo) return demoEmailScan(email);
    throw new ScanError('Email breach scans need HIBP_API_KEY (haveibeenpwned.com/API/Key), or set DEMO_MODE=true for labelled sample data', 503);
  }

  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;
  let res;
  try {
    res = await fetch(url, { headers: { 'hibp-api-key': apiKey, 'user-agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new ScanError(`Could not reach Have I Been Pwned (${err.name === 'TimeoutError' ? 'timeout' : err.message})`, 502);
  }
  if (res.status === 404) return { findings: [], telemetry: { breaches: 0 } };
  if (res.status === 401) throw new ScanError('HIBP rejected the API key', 502);
  if (res.status === 429) throw new ScanError(`HIBP rate limit hit; retry in ${res.headers.get('retry-after') || '?'}s`, 429);
  if (!res.ok) throw new ScanError(`HIBP returned HTTP ${res.status}`, 502);

  const breaches = await res.json();
  const findings = breaches.map((b) => {
    const classes = b.DataClasses || [];
    const severity = classes.some((c) => CRITICAL_CLASSES.includes(c)) ? 'CRITICAL'
      : classes.includes('Passwords') ? 'HIGH' : 'MEDIUM';
    return {
      severity,
      title: `Email found in ${b.Title} breach`,
      details: `Exposed on ${b.BreachDate}. Data: ${classes.join(', ')}. ${stripHtml(b.Description)}` +
        (severity === 'MEDIUM' ? '' : ' Reset this password everywhere it was reused and enable MFA.'),
    };
  });
  return { findings, telemetry: { breaches: breaches.length, names: breaches.map((b) => b.Name) } };
}

/**
 * Pwned Passwords check using k-anonymity: only the first 5 hex chars of the SHA-1 leave this server,
 * the full hash and the password never do. Needs no API key.
 * @returns {Promise<number>} times the password appears in known breaches (0 = not found)
 */
export async function pwnedPasswordCount(password, { timeoutMs = 8000 } = {}) {
  const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  let res;
  try {
    res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'add-padding': 'true', 'user-agent': UA }, signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new ScanError(`Could not reach Pwned Passwords (${err.message})`, 502);
  }
  if (!res.ok) throw new ScanError(`Pwned Passwords returned HTTP ${res.status}`, 502);
  for (const line of (await res.text()).split('\n')) {
    const [hashSuffix, count] = line.trim().split(':');
    if (hashSuffix === suffix) return parseInt(count, 10) || 0; // padded decoys have count 0
  }
  return 0;
}
