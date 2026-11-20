import process from 'node:process';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import scanRoutes from './routes/scanRoutes.js';
import legacyScanRoutes from './routes/legacyScanRoutes.js';
import { requireAuth } from './middleware/auth.js';
import { ScanError } from './services/scanError.js';

/**
 * Builds the Express app. `store` and `scanners` are injectable so tests can run without a DB or network.
 */
export function createApp({ store, scanners, authLimit = 20, scanLimit = 20 } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  const limiter = (max, windowMs) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many requests, slow down' } });

  app.get('/', (req, res) => res.send('SentryWatch backend running'));
  app.get('/api/health', (req, res) => res.json({ ok: true, storage: store.kind, demoMode: process.env.DEMO_MODE === 'true' }));

  const auth = requireAuth(store);
  app.use('/api/auth', limiter(authLimit, 15 * 60 * 1000), authRoutes(store));
  app.use('/api/assets', auth, assetRoutes(store));
  app.use('/api/alerts', auth, alertRoutes(store));
  app.use('/api/scans', auth, limiter(scanLimit, 60 * 1000), scanRoutes(store, scanners));

  // Old unauthenticated demo endpoints, kept only so the current localStorage frontend still works.
  app.use(legacyScanRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ScanError) return res.status(err.status).json({ error: err.message });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    console.error('[server error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
