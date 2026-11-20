import express from 'express';
import { ASSET_TYPES, normalizeTarget } from '../utils/validators.js';

export default function assetRoutes(store) {
  const router = express.Router();

  // GET /api/assets - only the caller's assets
  router.get('/', async (req, res, next) => {
    try {
      res.json({ assets: await store.assets.listByUser(req.user.id) });
    } catch (err) { next(err); }
  });

  // POST /api/assets  { type: DOMAIN|REPOSITORY|EMAIL, target, name? }
  router.post('/', async (req, res, next) => {
    try {
      const { type: rawType, target: rawTarget, name } = req.body || {};
      const type = typeof rawType === 'string' ? rawType.trim().toUpperCase() : '';
      if (!ASSET_TYPES.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${ASSET_TYPES.join(', ')}` });
      }
      const target = normalizeTarget(type, rawTarget);
      if (!target) return res.status(400).json({ error: `Invalid ${type.toLowerCase()} target` });
      if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
        return res.status(400).json({ error: 'name must be a string up to 100 characters' });
      }
      if (await store.assets.findDuplicate(req.user.id, type, target)) {
        return res.status(409).json({ error: 'You are already monitoring this asset' });
      }
      const asset = await store.assets.create(req.user.id, { name: name?.trim() || target, type, target });
      res.status(201).json({ asset });
    } catch (err) { next(err); }
  });

  // DELETE /api/assets/:id - 404 (not 403) for other users' assets so ids can't be probed
  router.delete('/:id', async (req, res, next) => {
    try {
      const asset = await store.assets.findOwned(req.params.id, req.user.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      await store.assets.remove(asset.id);
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}
