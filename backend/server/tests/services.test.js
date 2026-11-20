import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDomain, isPrivateAddress } from '../services/sslService.js';
import { scanText, scanRepository } from '../services/githubService.js';
import { scanEmail, pwnedPasswordCount } from '../services/hibpService.js';
import { calculateRiskScore, assetStatus } from '../services/riskScore.js';
import { normalizeTarget } from '../utils/validators.js';

const fx = (f) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', f));
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function tlsServer(name) {
  return new Promise((resolve) => {
    const server = tls.createServer({ key: fx(`${name}.key`), cert: fx(`${name}.crt`) }, (s) => s.end());
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
const stubFetch = (routes) => {
  globalThis.fetch = async (url) => {
    for (const [pattern, resp] of routes) {
      if (url.includes(pattern)) return typeof resp === 'function' ? resp(url) : resp;
    }
    throw new Error(`unexpected fetch ${url}`);
  };
};
const json = (body, init = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

describe('sslService (real TLS handshake against a local server)', () => {
  for (const [name, severity, titleRe] of [
    ['expired', 'CRITICAL', /expired/],
    ['ok', 'MEDIUM', /within 30 days/],
  ]) {
    test(`${name} cert -> ${severity}`, async () => {
      const server = await tlsServer(name);
      try {
        const { findings, telemetry } = await scanDomain('localhost', { port: server.address().port, allowPrivate: true });
        const hit = findings.find((f) => titleRe.test(f.title));
        assert.ok(hit, JSON.stringify(findings));
        assert.equal(hit.severity, severity);
        // OpenSSL reports the first verify error: expired wins; otherwise the self-signed cert is flagged untrusted
        assert.equal(findings.some((f) => /not trusted/.test(f.title)), name !== 'expired');
        assert.equal(telemetry.issuer, name === 'ok' ? 'TestCA' : 'localhost');
        if (name === 'ok') assert.ok(telemetry.daysRemaining >= 19 && telemetry.daysRemaining <= 20);
      } finally { server.close(); }
    });
  }

  test('long-lived cert has no expiry finding', async () => {
    const server = await tlsServer('far');
    try {
      const { findings } = await scanDomain('localhost', { port: server.address().port, allowPrivate: true });
      assert.ok(!findings.some((f) => /expire/.test(f.title)));
    } finally { server.close(); }
  });

  test('SSRF guard blocks loopback/private targets by default', async () => {
    await assert.rejects(scanDomain('localhost'), /private or internal/);
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1'])
      assert.ok(isPrivateAddress(ip), ip);
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700::1111']) assert.ok(!isPrivateAddress(ip), ip);
  });

  test('connection refused is a ScanError, not a fake finding', async () => {
    await assert.rejects(scanDomain('localhost', { port: 1, allowPrivate: true }), { name: 'ScanError' });
  });
});

describe('githubService', () => {
  test('scanText finds real secrets, redacts them, ignores placeholders', () => {
    const text = [
      'const aws = "AKIAIOSFODNN7EXAMPLE";',
      `token=ghp_${'a1B2'.repeat(9)}`,
      'api_key = "your_api_key_here"',
      'password: "Sup3rS3cretValue"',
      '-----BEGIN RSA PRIVATE KEY-----',
    ].join('\n');
    const f = scanText('src/config.js', text);
    const titles = f.map((x) => x.title).join('|');
    assert.match(titles, /AWS access key/);
    assert.match(titles, /GitHub token/);
    assert.match(titles, /Private key/);
    assert.match(titles, /Hardcoded credential/);
    assert.equal(f.filter((x) => /Hardcoded/.test(x.title)).length, 1); // placeholder api_key skipped
    assert.ok(!f.some((x) => x.details.includes('AKIAIOSFODNN7EXAMPLE')), 'full secret must not be echoed');
    assert.equal(f.find((x) => /AWS/.test(x.title)).severity, 'CRITICAL');
  });

  test('scanText catches unquoted secrets only inside .env files', () => {
    assert.equal(scanText('a.js', 'DB_PASSWORD=hunter2hunter2').length, 0);
    assert.equal(scanText('.env', 'DB_PASSWORD=hunter2hunter2').length, 1);
  });

  test('scanRepository: flags committed .env, scans content, skips .env.example and node_modules', async () => {
    stubFetch([
      ['api.github.com/repos/acme/app/git/trees', json({ truncated: false, tree: [
        { type: 'blob', path: '.env', size: 40 }, { type: 'blob', path: '.env.example', size: 10 },
        { type: 'blob', path: 'src/index.js', size: 50 }, { type: 'blob', path: 'node_modules/x/index.js', size: 9 },
        { type: 'tree', path: 'src' }] })],
      ['api.github.com/repos/acme/app', json({ default_branch: 'main', private: false })],
      ['raw.githubusercontent.com/acme/app/main/.env', new Response('AWS_KEY=AKIAIOSFODNN7EXAMPLE\n')],
      ['raw.githubusercontent.com/acme/app/main/.env.example', new Response('KEY=\n')],
      ['raw.githubusercontent.com/acme/app/main/src/index.js', new Response('console.log("hi")')],
    ]);
    const { findings, telemetry } = await scanRepository('acme/app', { token: 't' });
    assert.ok(findings.some((f) => /Environment file committed: \.env$/.test(f.title)));
    assert.ok(findings.some((f) => /AWS access key/.test(f.title)));
    assert.ok(!findings.some((f) => f.title.includes('.env.example')));
    assert.equal(telemetry.filesScanned, 2); // .env + src/index.js (example & node_modules skipped/not secret-bearing)
  });

  test('404 and rate limit become ScanErrors with right status', async () => {
    stubFetch([['api.github.com', new Response('', { status: 404 })]]);
    await assert.rejects(scanRepository('a/b'), { status: 404 });
    stubFetch([['api.github.com', new Response('', { status: 403, headers: { 'x-ratelimit-reset': '1900000000' } })]]);
    await assert.rejects(scanRepository('a/b'), { status: 429 });
  });
});

describe('hibpService', () => {
  test('email: no API key and no demo flag -> 503, never fake data', async () => {
    await assert.rejects(scanEmail('a@b.com', { apiKey: '', demo: false }), { status: 503 });
  });

  test('email: demo mode returns labelled sample data; clean/safe emails are clean; real key wins', async () => {
    const d = await scanEmail('a@b.com', { apiKey: '', demo: true });
    assert.equal(d.telemetry.demo, true);
    assert.ok(d.findings.length === 2 && d.findings.every((f) => f.title.startsWith('[DEMO]')));
    assert.deepEqual((await scanEmail('safe@b.com', { apiKey: '', demo: true })).findings, []);
    stubFetch([['breachedaccount', new Response('', { status: 404 })]]);
    const real = await scanEmail('a@b.com', { apiKey: 'k', demo: true });
    assert.equal(real.telemetry.demo, undefined);
  });

  test('email: maps breaches to severities and strips HTML', async () => {
    stubFetch([['breachedaccount/a%40b.com', json([
      { Name: 'A', Title: 'Alpha', BreachDate: '2020-01-01', DataClasses: ['Email addresses', 'Passwords'], Description: 'Leak <a href="x">here</a> &amp; there' },
      { Name: 'B', Title: 'Beta', BreachDate: '2021-01-01', DataClasses: ['Email addresses'], Description: 'd' },
      { Name: 'C', Title: 'Gamma', BreachDate: '2022-01-01', DataClasses: ['Credit cards', 'Passwords'], Description: 'd' },
    ])]]);
    const { findings } = await scanEmail('a@b.com', { apiKey: 'k' });
    assert.deepEqual(findings.map((f) => f.severity), ['HIGH', 'MEDIUM', 'CRITICAL']);
    assert.match(findings[0].details, /Leak here & there/);
  });

  test('email: 404 = clean, 429 = rate limited', async () => {
    stubFetch([['breachedaccount', new Response('', { status: 404 })]]);
    assert.deepEqual((await scanEmail('a@b.com', { apiKey: 'k' })).findings, []);
    stubFetch([['breachedaccount', new Response('', { status: 429, headers: { 'retry-after': '3' } })]]);
    await assert.rejects(scanEmail('a@b.com', { apiKey: 'k' }), { status: 429 });
  });

  test('password k-anonymity: only 5-char SHA-1 prefix is sent; matches suffix locally', async () => {
    // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    let requested;
    stubFetch([['api.pwnedpasswords.com/range/', (url) => {
      requested = url;
      return new Response('0018A45C4D1DEF81644B54AB7F969B88D65:0\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\n');
    }]]);
    assert.equal(await pwnedPasswordCount('password'), 3861493);
    assert.equal(requested, 'https://api.pwnedpasswords.com/range/5BAA6');
    assert.ok(!new URL(requested).pathname.toLowerCase().includes('baa61e4c9b'), 'suffix must not be sent');
    assert.equal(await pwnedPasswordCount('some-unique-passphrase-xyz'), 0);
  });
});

describe('riskScore + validators', () => {
  test('score is weighted and capped at 100', () => {
    assert.equal(calculateRiskScore([]), 0);
    assert.equal(calculateRiskScore([{ severity: 'MEDIUM' }, { severity: 'LOW' }]), 10);
    assert.equal(calculateRiskScore([{ severity: 'CRITICAL' }, { severity: 'HIGH' }]), 60);
    assert.equal(calculateRiskScore(Array(5).fill({ severity: 'CRITICAL' })), 100);
  });
  test('assetStatus = worst severity or SECURE', () => {
    assert.equal(assetStatus([]), 'SECURE');
    assert.equal(assetStatus([{ severity: 'LOW' }, { severity: 'HIGH' }, { severity: 'MEDIUM' }]), 'HIGH');
  });
  test('normalizeTarget', () => {
    assert.equal(normalizeTarget('DOMAIN', ' https://Example.COM/path?q=1 '), 'example.com');
    assert.equal(normalizeTarget('DOMAIN', 'not a domain'), null);
    assert.equal(normalizeTarget('DOMAIN', 'localhost'), null);
    assert.equal(normalizeTarget('REPOSITORY', 'https://github.com/Foo/bar.git'), 'Foo/bar');
    assert.equal(normalizeTarget('REPOSITORY', 'foo/bar/baz'), null);
    assert.equal(normalizeTarget('REPOSITORY', '../etc'), null);
    assert.equal(normalizeTarget('EMAIL', 'A@B.com'), 'a@b.com');
    assert.equal(normalizeTarget('EMAIL', 'nope'), null);
  });
});
