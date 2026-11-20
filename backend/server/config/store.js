import crypto from 'node:crypto';
import { isMockDb } from './env.js';
import { getPrisma } from './prisma.js';

/**
 * Data-access layer with two interchangeable backends:
 *  - createMockStore():   in-memory arrays (USE_MOCK_DB="true")
 *  - createPrismaStore(): PostgreSQL via Prisma (production)
 * Routes only talk to this interface, so the Prisma schema stays the source of truth.
 */

const uid = () => crypto.randomUUID();
const now = () => new Date();

export function createMockStore() {
  const db = { users: [], assets: [], scans: [], alerts: [] };

  return {
    kind: 'mock',
    users: {
      async findByEmail(email) { return db.users.find((u) => u.email === email) || null; },
      async findById(id) { return db.users.find((u) => u.id === id) || null; },
      async create({ email, passwordHash, role = 'ANALYST' }) {
        const user = { id: uid(), email, passwordHash, role, createdAt: now() };
        db.users.push(user);
        return user;
      },
    },
    assets: {
      async listByUser(userId) {
        return db.assets.filter((a) => a.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
      },
      async findOwned(id, userId) { return db.assets.find((a) => a.id === id && a.userId === userId) || null; },
      async findDuplicate(userId, type, target) {
        return db.assets.find((a) => a.userId === userId && a.type === type && a.target === target) || null;
      },
      async create(userId, { name, type, target }) {
        const asset = { id: uid(), name, type, target, status: 'SECURE', lastScanned: null, userId, createdAt: now() };
        db.assets.push(asset);
        return asset;
      },
      async update(id, data) {
        const asset = db.assets.find((a) => a.id === id);
        if (!asset) return null;
        Object.assign(asset, data);
        return asset;
      },
      async remove(id) {
        db.assets = db.assets.filter((a) => a.id !== id);
        db.scans = db.scans.filter((s) => s.assetId !== id);
        db.alerts = db.alerts.filter((a) => a.assetId !== id);
      },
    },
    scans: {
      async create({ assetId, passed, riskScore, payload }) {
        const scan = { id: uid(), assetId, passed, riskScore, payload, scannedAt: now() };
        db.scans.push(scan);
        return scan;
      },
      async listByAsset(assetId) {
        return db.scans.filter((s) => s.assetId === assetId).sort((a, b) => b.scannedAt - a.scannedAt);
      },
    },
    alerts: {
      /** Rescans replace the asset's open alerts (no duplicates); resolved ones are kept as history. */
      async replaceOpenForAsset(assetId, items) {
        db.alerts = db.alerts.filter((a) => !(a.assetId === assetId && !a.resolved));
        const created = items.map((i) => ({
          id: uid(), assetId, severity: i.severity, title: i.title, details: i.details, resolved: false, createdAt: now(),
        }));
        db.alerts.push(...created);
        return created;
      },
      async listByUser(userId, { resolved } = {}) {
        const owned = new Set(db.assets.filter((a) => a.userId === userId).map((a) => a.id));
        return db.alerts
          .filter((a) => owned.has(a.assetId) && (resolved === undefined || a.resolved === resolved))
          .sort((a, b) => b.createdAt - a.createdAt);
      },
      async findOwned(id, userId) {
        const alert = db.alerts.find((a) => a.id === id);
        if (!alert) return null;
        return db.assets.some((a) => a.id === alert.assetId && a.userId === userId) ? alert : null;
      },
      async setResolved(id, resolved) {
        const alert = db.alerts.find((a) => a.id === id);
        if (alert) alert.resolved = resolved;
        return alert || null;
      },
    },
  };
}

export async function createPrismaStore() {
  const p = await getPrisma();
  return {
    kind: 'prisma',
    users: {
      findByEmail: (email) => p.user.findUnique({ where: { email } }),
      findById: (id) => p.user.findUnique({ where: { id } }),
      create: ({ email, passwordHash, role }) => p.user.create({ data: { email, passwordHash, ...(role && { role }) } }),
    },
    assets: {
      listByUser: (userId) => p.asset.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      findOwned: (id, userId) => p.asset.findFirst({ where: { id, userId } }),
      findDuplicate: (userId, type, target) => p.asset.findFirst({ where: { userId, type, target } }),
      create: (userId, { name, type, target }) => p.asset.create({ data: { userId, name, type, target } }),
      update: (id, data) => p.asset.update({ where: { id }, data }),
      remove: async (id) => { await p.asset.delete({ where: { id } }); }, // scans/alerts cascade in schema
    },
    scans: {
      create: ({ assetId, passed, riskScore, payload }) => p.scan.create({ data: { assetId, passed, riskScore, payload } }),
      listByAsset: (assetId) => p.scan.findMany({ where: { assetId }, orderBy: { scannedAt: 'desc' } }),
    },
    alerts: {
      async replaceOpenForAsset(assetId, items) {
        const [, ...created] = await p.$transaction([
          p.alert.deleteMany({ where: { assetId, resolved: false } }),
          ...items.map((i) => p.alert.create({ data: { assetId, severity: i.severity, title: i.title, details: i.details } })),
        ]);
        return created;
      },
      listByUser: (userId, { resolved } = {}) =>
        p.alert.findMany({
          where: { asset: { userId }, ...(resolved !== undefined && { resolved }) },
          orderBy: { createdAt: 'desc' },
        }),
      findOwned: (id, userId) => p.alert.findFirst({ where: { id, asset: { userId } } }),
      setResolved: (id, resolved) => p.alert.update({ where: { id }, data: { resolved } }),
    },
  };
}

export async function createStore() {
  return isMockDb() ? createMockStore() : createPrismaStore();
}
