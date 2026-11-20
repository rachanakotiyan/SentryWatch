import 'dotenv/config';
import process from 'node:process';
import { createApp } from './app.js';
import { createStore } from './config/store.js';
import { getJwtSecret } from './config/env.js';

const PORT = process.env.PORT || 5001;

getJwtSecret(); // fail fast / warn at startup rather than on first login
const store = await createStore();
console.log(`[storage] ${store.kind === 'mock' ? 'in-memory mock DB (data resets on restart)' : 'PostgreSQL via Prisma'}`);

createApp({ store }).listen(PORT, () => {
  console.log(`SentryWatch backend listening on http://localhost:${PORT}`);
});
