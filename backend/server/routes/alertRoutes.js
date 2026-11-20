import express from 'express';

export default function alertRoutes(store) {
  const router = express.Router();

  // GET /api/alerts?resolved=true|false
  router.get('/', async (req, res, next) => {
    try {
      const { resolved } = req.query;
      const filter = resolved === 'true' ? { resolved: true } : resolved === 'false' ? { resolved: false } : {};
      res.json({ alerts: await store.alerts.listByUser(req.user.id, filter) });
    } catch (err) { next(err); }
  });

  // PATCH /api/alerts/:id  { resolved: boolean }
  router.patch('/:id', async (req, res, next) => {
    try {
      const { resolved } = req.body || {};
      if (typeof resolved !== 'boolean') return res.status(400).json({ error: 'resolved must be a boolean' });
      const alert = await store.alerts.findOwned(req.params.id, req.user.id);
      if (!alert) return res.status(404).json({ error: 'Alert not found' });
      res.json({ alert: await store.alerts.setResolved(alert.id, resolved) });
    } catch (err) { next(err); }
  });

  return router;
}
