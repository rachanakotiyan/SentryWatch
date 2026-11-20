import express from 'express';
import { scanDomain } from '../services/sslService.js';
import { scanRepository } from '../services/githubService.js';
import { scanEmail, pwnedPasswordCount } from '../services/hibpService.js';
import { calculateRiskScore, assetStatus } from '../services/riskScore.js';
import { ScanError } from '../services/scanError.js';

export const defaultScanners = {
  DOMAIN: scanDomain,
  REPOSITORY: scanRepository,
  EMAIL: scanEmail,
};

export default function scanRoutes(store, scanners = defaultScanners) {
  const router = express.Router();
  const running = new Set(); // one scan per asset at a time (protects third-party rate limits)

  // POST /api/scans/password-check  { password }  -> k-anonymity lookup, only a 5-char hash prefix leaves the server
  router.post('/password-check', async (req, res, next) => {
    try {
      const { password } = req.body || {};
      if (typeof password !== 'string' || !password) return res.status(400).json({ error: 'password is required' });
      const count = await pwnedPasswordCount(password);
      res.json({ pwned: count > 0, count });
    } catch (err) { next(err); }
  });

  // POST /api/scans/:assetId - run the scanner for the asset's type, score it, store scan + alerts
  router.post('/:assetId', async (req, res, next) => {
    let asset;
    try {
      asset = await store.assets.findOwned(req.params.assetId, req.user.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      if (running.has(asset.id)) return res.status(409).json({ error: 'A scan is already running for this asset' });

      const scanner = scanners[asset.type];
      if (!scanner) throw new ScanError(`No scanner for asset type ${asset.type}`, 501);

      running.add(asset.id);
      const { findings, telemetry } = await scanner(asset.target);

      const riskScore = calculateRiskScore(findings);
      const status = assetStatus(findings);
      const scan = await store.scans.create({
        assetId: asset.id,
        passed: findings.length === 0,
        riskScore,
        payload: { telemetry, findingCount: findings.length },
      });
      const alerts = await store.alerts.replaceOpenForAsset(asset.id, findings);
      const updated = await store.assets.update(asset.id, { status, lastScanned: scan.scannedAt });

      res.status(201).json({ scan, riskScore, status, alerts, asset: updated, demo: telemetry?.demo === true });
    } catch (err) {
      next(err);
    } finally {
      if (asset) running.delete(asset.id);
    }
  });

  // GET /api/scans/:assetId - scan history, newest first
  router.get('/:assetId', async (req, res, next) => {
    try {
      const asset = await store.assets.findOwned(req.params.assetId, req.user.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      res.json({ scans: await store.scans.listByAsset(asset.id) });
    } catch (err) { next(err); }
  });

  return router;
}
