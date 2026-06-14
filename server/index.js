import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const HIBP_KEY = process.env.HIBP_API_KEY;

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => res.send('SentryWatch backend running'));

app.post('/api/github/scan', async (req, res) => {
  const { org } = req.body || {};
  if (!org) return res.status(400).json({ error: 'org is required' });

  const patterns = [
    { name: 'AWS Access Key', q: 'AKIA' },
    { name: 'GitHub Token', q: 'ghp_' },
    { name: 'Private Key', q: '-----BEGIN PRIVATE KEY-----' },
    { name: 'API Key', q: 'api_key=' },
    { name: 'Client Secret', q: 'client_secret' },
  ];

  const findings = [];

  for (const p of patterns) {
    const query = `${p.q} org:${org}`;
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`;

    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

    try {
      const response = await axios.get(url, { headers });
      if (response.data && Array.isArray(response.data.items)) {
        for (const item of response.data.items) {
          findings.push({
            pattern: p.name,
            text_match: p.q,
            repository: item.repository?.full_name || '',
            path: item.path,
            html_url: item.html_url,
          });
        }
      }
    } catch (err) {
      console.error('GitHub scan error for pattern', p.q, err?.response?.status || err.message || err);
    }
  }

  res.json(findings);
});

app.get('/api/hibp', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email is required' });

  if (!HIBP_KEY) {
    console.warn('HIBP API key not set.');
    return res.json([]);
  }

  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;

  try {
    const response = await axios.get(url, {
      headers: {
        'hibp-api-key': HIBP_KEY,
        'User-Agent': 'SentryWatch',
      },
    });

    return res.json(Array.isArray(response.data) ? response.data : []);
  } catch (err) {
    if (err.response && err.response.status === 404) return res.json([]);
    console.error('HIBP lookup error', err?.response?.status || err.message || err);
    return res.status(500).json({ error: 'HIBP lookup failed' });
  }
});

app.listen(PORT, () => {
  console.log(`SentryWatch backend listening on http://localhost:${PORT}`);
});
