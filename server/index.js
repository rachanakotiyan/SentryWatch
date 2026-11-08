import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import process from 'node:process';
import scanRoutes from './routes/scanRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => res.send('SentryWatch backend running'));
app.use(scanRoutes);

app.listen(PORT, () => {
  console.log(`SentryWatch backend listening on http://localhost:${PORT}`);
});
