import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { createMockStore } from '../config/store.js';
import { ScanError } from '../services/scanError.js';

let server, base, calls;
const scanners = {
  DOMAIN: async (t) => { calls.push(t); return { findings: [{ severity: 'HIGH', title: 'cert soon', details: 'd' }, { severity: 'MEDIUM', title: 'weak', details: 'd' }], telemetry: { t } }; },
  REPOSITORY: async () => ({ findings: [], telemetry: {} }),
  EMAIL: async () => { throw new ScanError('no key', 503); },
};

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const register = async (email) => (await call('POST', '/api/auth/register', { body: { email, password: 'correct-horse' } })).body.token;

before(async () => {
  calls = [];
  const app = createApp({ store: createMockStore(), scanners, authLimit: 1000, scanLimit: 1000 });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

describe('auth', () => {
  test('register -> login -> me, with validation', async () => {
    assert.equal((await call('POST', '/api/auth/register', { body: { email: 'bad', password: 'correct-horse' } })).status, 400);
    assert.equal((await call('POST', '/api/auth/register', { body: { email: 'a@x.com', password: 'short' } })).status, 400);
    const reg = await call('POST', '/api/auth/register', { body: { email: 'A@X.com', password: 'correct-horse', role: 'ADMIN' } });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.user.role, 'ANALYST', 'role must not be client-controlled');
    assert.equal(reg.body.user.passwordHash, undefined);
    assert.equal((await call('POST', '/api/auth/register', { body: { email: 'a@x.com', password: 'correct-horse' } })).status, 409);

    const login = await call('POST', '/api/auth/login', { body: { email: 'a@x.com', password: 'correct-horse' } });
    assert.equal(login.status, 200);
    assert.equal((await call('POST', '/api/auth/login', { body: { email: 'a@x.com', password: 'wrong-password' } })).status, 401);
    assert.equal((await call('POST', '/api/auth/login', { body: { email: 'nobody@x.com', password: 'wrong-password' } })).status, 401);

    const me = await call('GET', '/api/auth/me', { token: login.body.token });
    assert.equal(me.body.user.email, 'a@x.com');
  });

  test('protected routes reject missing/garbage/forged tokens', async () => {
    assert.equal((await call('GET', '/api/assets')).status, 401);
    assert.equal((await call('GET', '/api/assets', { token: 'garbage' })).status, 401);
    // alg:none forgery
    const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"userId":"x"}').toString('base64url') + '.';
    assert.equal((await call('GET', '/api/auth/me', { token: none })).status, 401);
  });

  test('malformed JSON -> 400', async () => {
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
    assert.equal(res.status, 400);
  });
});

describe('assets + isolation', () => {
  test('CRUD, normalisation, duplicates, per-user isolation', async () => {
    const alice = await register('alice@x.com');
    const bob = await register('bob@x.com');

    assert.equal((await call('POST', '/api/assets', { token: alice, body: { type: 'NOPE', target: 'x' } })).status, 400);
    assert.equal((await call('POST', '/api/assets', { token: alice, body: { type: 'DOMAIN', target: 'bad_domain' } })).status, 400);

    const created = await call('POST', '/api/assets', { token: alice, body: { type: 'domain', target: 'https://Example.com/x' } });
    assert.equal(created.status, 201);
    assert.equal(created.body.asset.target, 'example.com');
    assert.equal(created.body.asset.status, 'SECURE');
    assert.equal((await call('POST', '/api/assets', { token: alice, body: { type: 'DOMAIN', target: 'example.com' } })).status, 409);

    const id = created.body.asset.id;
    assert.equal((await call('GET', '/api/assets', { token: alice })).body.assets.length, 1);
    assert.equal((await call('GET', '/api/assets', { token: bob })).body.assets.length, 0);

    // Bob cannot scan, read history of, or delete Alice's asset
    assert.equal((await call('POST', `/api/scans/${id}`, { token: bob })).status, 404);
    assert.equal((await call('GET', `/api/scans/${id}`, { token: bob })).status, 404);
    assert.equal((await call('DELETE', `/api/assets/${id}`, { token: bob })).status, 404);
    assert.equal((await call('GET', '/api/assets', { token: alice })).body.assets.length, 1);

    assert.equal((await call('DELETE', `/api/assets/${id}`, { token: alice })).status, 204);
    assert.equal((await call('GET', '/api/assets', { token: alice })).body.assets.length, 0);
  });
});

describe('scan orchestrator', () => {
  test('scan scores, stores alerts, updates asset; rescans do not duplicate; resolved kept', async () => {
    calls = [];
    const t = await register('carol@x.com');
    const { body: { asset } } = await call('POST', '/api/assets', { token: t, body: { type: 'DOMAIN', target: 'carol.com' } });

    const r1 = await call('POST', `/api/scans/${asset.id}`, { token: t });
    assert.equal(r1.status, 201);
    assert.equal(r1.body.riskScore, 28); // HIGH 20 + MEDIUM 8
    assert.equal(r1.body.status, 'HIGH');
    assert.equal(r1.body.alerts.length, 2);
    assert.equal(r1.body.asset.status, 'HIGH');
    assert.ok(r1.body.asset.lastScanned);
    assert.deepEqual(calls, ['carol.com']);

    // resolve one alert, rescan: open alerts replaced (2), resolved one kept as history
    const open = (await call('GET', '/api/alerts?resolved=false', { token: t })).body.alerts;
    assert.equal(open.length, 2);
    const patched = await call('PATCH', `/api/alerts/${open[0].id}`, { token: t, body: { resolved: true } });
    assert.equal(patched.body.alert.resolved, true);
    await call('POST', `/api/scans/${asset.id}`, { token: t });
    assert.equal((await call('GET', '/api/alerts?resolved=false', { token: t })).body.alerts.length, 2);
    assert.equal((await call('GET', '/api/alerts?resolved=true', { token: t })).body.alerts.length, 1);
    assert.equal((await call('GET', `/api/scans/${asset.id}`, { token: t })).body.scans.length, 2);

    // another user can't see or touch these alerts
    const other = await register('dave@x.com');
    assert.equal((await call('GET', '/api/alerts', { token: other })).body.alerts.length, 0);
    assert.equal((await call('PATCH', `/api/alerts/${open[1].id}`, { token: other, body: { resolved: true } })).status, 404);
  });

  test('clean repo -> score 0, SECURE; scanner failure -> error status, nothing stored', async () => {
    const t = await register('erin@x.com');
    const repo = (await call('POST', '/api/assets', { token: t, body: { type: 'REPOSITORY', target: 'github.com/x' } })).status;
    assert.equal(repo, 400);
    const { body: { asset: r } } = await call('POST', '/api/assets', { token: t, body: { type: 'REPOSITORY', target: 'acme/app' } });
    const clean = await call('POST', `/api/scans/${r.id}`, { token: t });
    assert.equal(clean.body.riskScore, 0);
    assert.equal(clean.body.status, 'SECURE');
    assert.equal(clean.body.scan.passed, true);

    const { body: { asset: e } } = await call('POST', '/api/assets', { token: t, body: { type: 'EMAIL', target: 'e@x.com' } });
    const failed = await call('POST', `/api/scans/${e.id}`, { token: t });
    assert.equal(failed.status, 503);
    assert.equal((await call('GET', `/api/scans/${e.id}`, { token: t })).body.scans.length, 0);
  });

  test('unauthenticated scan rejected', async () => {
    assert.equal((await call('POST', '/api/scans/abc')).status, 401);
  });
});
