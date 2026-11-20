import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount authentication & asset API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);

app.listen(PORT, () => {
  console.log(`[SentryWatch Backend] Running on http://localhost:${PORT}`);
});
