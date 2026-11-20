import tls from 'node:tls';
import dns from 'node:dns/promises';
import net from 'node:net';
import { ScanError } from './scanError.js';

const DAY_MS = 86_400_000;
const UNTRUSTED = {
  DEPTH_ZERO_SELF_SIGNED_CERT: 'The certificate is self-signed.',
  SELF_SIGNED_CERT_IN_CHAIN: 'The chain contains a self-signed certificate that is not trusted.',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'The certificate chain is incomplete or signed by an untrusted issuer.',
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: 'The issuing CA is not trusted.',
  ERR_TLS_CERT_ALTNAME_INVALID: 'The certificate does not match the domain name.',
};

/** True for loopback, private, link-local, CGNAT, multicast and unspecified addresses (SSRF guard). */
export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') ||
    v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb') || v6.startsWith('ff');
}

async function resolveTarget(host, allowPrivate) {
  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new ScanError(`Domain "${host}" could not be resolved`, 422);
  }
  if (!allowPrivate && addrs.some((a) => isPrivateAddress(a.address))) {
    throw new ScanError('Scanning private or internal addresses is not allowed', 422);
  }
  return addrs[0].address;
}

function handshake({ ip, host, port, timeoutMs }) {
  return new Promise((resolve, reject) => {
    // Connect to the already-validated IP (no second DNS lookup) but keep SNI/hostname checks on the real name.
    const socket = tls.connect({ host: ip, port, servername: host, rejectUnauthorized: false, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate();
      const result = {
        cert,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ? String(socket.authorizationError.code || socket.authorizationError) : null,
        protocol: socket.getProtocol(),
        cipher: socket.getCipher()?.name || null,
      };
      socket.end();
      resolve(result);
    });
    socket.on('timeout', () => { socket.destroy(); reject(new ScanError(`TLS connection to ${host}:${port} timed out`, 504)); });
    socket.on('error', (err) => reject(new ScanError(`Could not complete a TLS handshake with ${host}:${port} (${err.code || err.message})`, 502)));
  });
}

/**
 * Inspect the certificate a domain actually serves on :443.
 * @returns {{ findings: Array, telemetry: object }}
 */
export async function scanDomain(host, { port = 443, timeoutMs = 8000, allowPrivate = false } = {}) {
  const ip = await resolveTarget(host, allowPrivate);
  const { cert, authorized, authorizationError, protocol, cipher } = await handshake({ ip, host, port, timeoutMs });
  if (!cert || !cert.valid_to) throw new ScanError(`${host} did not present a certificate`, 502);

  const validTo = new Date(cert.valid_to);
  const validFrom = new Date(cert.valid_from);
  const daysRemaining = Math.floor((validTo - Date.now()) / DAY_MS);
  const issuer = cert.issuer?.O || cert.issuer?.CN || 'Unknown issuer';

  const telemetry = {
    host, port, ip, protocol, cipher, authorized, authorizationError,
    issuer, subject: cert.subject?.CN || null, altNames: cert.subjectaltname || null,
    validFrom: validFrom.toISOString(), validTo: validTo.toISOString(), daysRemaining,
    keyBits: cert.bits || null, fingerprint256: cert.fingerprint256 || null,
  };

  const findings = [];
  const when = validTo.toISOString().slice(0, 10);
  if (daysRemaining < 0) {
    findings.push({ severity: 'CRITICAL', title: 'SSL certificate expired',
      details: `The certificate for ${host} (issuer: ${issuer}) expired on ${when}, ${-daysRemaining} day(s) ago. Browsers will block visitors. Renew it immediately.` });
  } else if (daysRemaining <= 7) {
    findings.push({ severity: 'HIGH', title: 'SSL certificate expires within 7 days',
      details: `The certificate for ${host} (issuer: ${issuer}) expires on ${when} (${daysRemaining} day(s) left). Renew it now.` });
  } else if (daysRemaining <= 30) {
    findings.push({ severity: 'MEDIUM', title: 'SSL certificate expires within 30 days',
      details: `The certificate for ${host} (issuer: ${issuer}) expires on ${when} (${daysRemaining} days left). Schedule renewal.` });
  }

  if (authorizationError && UNTRUSTED[authorizationError]) {
    findings.push({ severity: 'HIGH', title: 'SSL certificate is not trusted',
      details: `${UNTRUSTED[authorizationError]} (${authorizationError}). Visitors will see a security warning.` });
  }
  if (cert.bits && cert.bits < 2048) {
    findings.push({ severity: 'MEDIUM', title: 'Weak certificate key',
      details: `The certificate uses a ${cert.bits}-bit RSA key. Use at least 2048 bits.` });
  }
  return { findings, telemetry };
}
