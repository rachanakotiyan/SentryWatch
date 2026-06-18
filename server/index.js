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

/**
 * POST /api/scan/email
 * Expects: { value: "email@address.com" }
 * Returns: Array of normalized alerts
 */
app.post('/api/scan/email', async (req, res) => {
  const { value } = req.body || {};
  if (!value) {
    return res.status(400).json({ error: 'Email value is required' });
  }

  const email = value.trim();
  const lowercaseEmail = email.toLowerCase();
  
  // Custom demo mode triggers
  const isCleanDemo = lowercaseEmail.includes('clean') || lowercaseEmail.includes('safe');

  // Fallback if HIBP Key is not present or if it is a clean demo trigger
  if (!HIBP_KEY) {
    console.log(`[Email Scan] No HIBP API Key, using demo data. Email: ${email}`);
    if (isCleanDemo) {
      return res.json([]);
    }
    
    // Return mock breach alerts
    return res.json([
      {
        type: 'email',
        severity: 'HIGH',
        title: '[DEMO] Adobe Account Breach',
        description: `The email address '${email}' was identified in the Adobe database compromise (October 2013). Compromised info: Usernames, Email addresses, Passwords, Password hints. We recommend changing passwords on all systems using this email.`,
        foundAt: 'Adobe (Mock)',
        resolved: false,
        timestamp: new Date().toISOString()
      },
      {
        type: 'email',
        severity: 'MEDIUM',
        title: '[DEMO] Canva Account Exposure',
        description: `The email address '${email}' was found in the Canva database leak (May 2019). Compromised info: Names, Usernames, Email addresses, Passwords. Enable Multi-Factor Authentication (MFA) on your account.`,
        foundAt: 'Canva (Mock)',
        resolved: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }

  // Real API scan
  // TODO: plug in a real HIBP API key in the environment variables to check live breaches.
  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;

  try {
    const response = await axios.get(url, {
      headers: {
        'hibp-api-key': HIBP_KEY,
        'User-Agent': 'SentryWatch',
      },
    });

    const breaches = Array.isArray(response.data) ? response.data : [];
    const alerts = breaches.map(b => ({
      type: 'email',
      severity: b.DataClasses.includes('Passwords') ? 'HIGH' : 'MEDIUM',
      title: `Account Breached in ${b.Title}`,
      description: `Email address was exposed in the ${b.Title} breach (${b.BreachDate}). Compromised data: ${b.DataClasses.join(', ')}. ${b.Description.replace(/<\/?[^>]+(>|$)/g, "")}`,
      foundAt: b.Name,
      resolved: false,
      timestamp: new Date().toISOString()
    }));

    return res.json(alerts);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.json([]); // Not found = no breaches
    }
    console.error('HIBP lookup error', err?.response?.status || err.message);
    
    // In case the real API fails (rate limits or block), fallback to demo mode so app stays demoable
    return res.json([
      {
        type: 'email',
        severity: 'HIGH',
        title: '[DEMO] Fallback: Adobe Breach Warning',
        description: `The real HIBP query failed. Showing demo findings: Email '${email}' was historically compromised in Adobe data breach.`,
        foundAt: 'HIBP (Mock Fallback)',
        resolved: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }
});

/**
 * POST /api/scan/domain
 * Expects: { value: "domain.com" }
 * Returns: Array of normalized alerts
 */
app.post('/api/scan/domain', async (req, res) => {
  const { value } = req.body || {};
  if (!value) {
    return res.status(400).json({ error: 'Domain value is required' });
  }

  const domain = value.trim().toLowerCase();
  const isCleanDemo = domain.includes('clean') || domain.includes('safe');

  try {
    // Call crt.sh for real SSL cert data
    const response = await axios.get(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, {
      timeout: 8000 // crt.sh can be extremely slow
    });

    const certs = response.data;
    if (!Array.isArray(certs) || certs.length === 0) {
      return res.json([]);
    }

    // Sort or get latest cert
    const latest = certs[0];
    if (!latest || !latest.not_after) {
      return res.json([]);
    }

    const expiryDate = new Date(latest.not_after);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 30) {
      const severity = daysLeft <= 0 ? 'CRITICAL' : (daysLeft < 10 ? 'HIGH' : 'MEDIUM');
      const statusText = daysLeft <= 0 ? 'expired' : `expires in ${daysLeft} days`;
      
      return res.json([
        {
          type: 'domain',
          severity: severity,
          title: `SSL Certificate ${daysLeft <= 0 ? 'Expired' : 'Expiring Soon'}`,
          description: `The SSL certificate for domain '${domain}' is ${statusText} (Expiry: ${expiryDate.toLocaleDateString()}). A renewed certificate must be installed immediately to maintain secure traffic.`,
          foundAt: latest.issuer_name || 'crt.sh',
          resolved: false,
          timestamp: new Date().toISOString()
        }
      ]);
    }

    return res.json([]); // Clean!
  } catch (err) {
    console.warn('crt.sh query failed or timed out for domain', domain, err.message);

    // Fallback if crt.sh fails or times out
    if (isCleanDemo) {
      return res.json([]);
    }

    // Default demo behavior: if domain is example.com or contains expire/warn, trigger an alert
    const isExpiringMock = domain.includes('expire') || domain.includes('warn') || domain === 'example.com' || domain.includes('test');
    
    if (isExpiringMock) {
      return res.json([
        {
          type: 'domain',
          severity: 'HIGH',
          title: '[DEMO] SSL Certificate Expiring Soon',
          description: `SSL certificate for domain '${domain}' is expiring in 12 days (Mock Expiry). Active renewal is required to prevent browser security warnings.`,
          foundAt: "Let's Encrypt (Mock)",
          resolved: false,
          timestamp: new Date().toISOString()
        }
      ]);
    }
    
    return res.json([]);
  }
});

/**
 * POST /api/scan/github
 * Expects: { value: "github_org_or_username" }
 * Returns: Array of normalized alerts
 */
app.post('/api/scan/github', async (req, res) => {
  const { value } = req.body || {};
  if (!value) {
    return res.status(400).json({ error: 'GitHub target is required' });
  }

  const target = value.trim();
  const lowercaseTarget = target.toLowerCase();
  const isCleanDemo = lowercaseTarget.includes('clean') || lowercaseTarget.includes('safe');

  // Fallback to demo mode if GITHUB_TOKEN is not set or clean demo is triggered
  if (!GITHUB_TOKEN) {
    console.log(`[GitHub Scan] No GITHUB_TOKEN environment variable. Using mock findings. Target: ${target}`);
    if (isCleanDemo) {
      return res.json([]);
    }

    return res.json([
      {
        type: 'github',
        severity: 'CRITICAL',
        title: '[DEMO] AWS Credentials Exposure',
        description: `Found a potential AWS Access Key ID (AKIA...) in file 'config/aws.yml' under repository '${target}/cloud-infra'. Exposed keys allow unauthorized root control of cloud assets.`,
        foundAt: `https://github.com/${target}/cloud-infra/blob/main/config/aws.yml`,
        resolved: false,
        timestamp: new Date().toISOString()
      },
      {
        type: 'github',
        severity: 'HIGH',
        title: '[DEMO] Exposed GitHub Access Token',
        description: `Found a potential Personal Access Token (ghp_...) in file 'scripts/deploy.js' under repository '${target}/utilities'. This allows external read/write repository access.`,
        foundAt: `https://github.com/${target}/utilities/blob/main/scripts/deploy.js`,
        resolved: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }

  // Real API scan
  // Note: GitHub search API rate limits unauthenticated requests to 10/min, and authenticated to 30/min.
  const patterns = [
    { name: 'AWS Access Key', q: 'AKIA' },
    { name: 'GitHub Token', q: 'ghp_' },
    { name: 'Private Key', q: '-----BEGIN PRIVATE KEY-----' },
    { name: 'API Key', q: 'api_key=' },
    { name: 'Client Secret', q: 'client_secret' },
  ];

  const findings = [];
  const headers = { Accept: 'application/vnd.github.v3+json' };
  headers.Authorization = `token ${GITHUB_TOKEN}`;

  try {
    for (const p of patterns) {
      const query = `${p.q} user:${target}`;
      const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=3`;
      
      try {
        const response = await axios.get(url, { headers, timeout: 5000 });
        if (response.data && Array.isArray(response.data.items)) {
          for (const item of response.data.items) {
            findings.push({
              type: 'github',
              severity: p.name.includes('Key') || p.name.includes('Token') || p.name.includes('Private') ? 'CRITICAL' : 'HIGH',
              title: `Exposed ${p.name}`,
              description: `Found potential secret matching '${p.q}' in repository '${item.repository?.full_name}' at path '${item.path}'.`,
              foundAt: item.html_url || `https://github.com/${item.repository?.full_name}/blob/main/${item.path}`,
              resolved: false,
              timestamp: new Date().toISOString()
            });
          }
        }
        // Small delay to reduce hitting abuse limits
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`GitHub API search failed for pattern ${p.name}:`, err.message);
        if (err.response && err.response.status === 403) {
          // Rate limited on real search, break loop and return what we have or fallback to mock
          break;
        }
      }
    }

    // If real queries succeeded but rate limits blocked us mid-way and we found nothing,
    // or if we hit rate limit on the first try, return mock data to prevent blocking prototype flow
    if (findings.length === 0 && !isCleanDemo) {
      // Just in case, return a mock demo alert so the UI functions as expected
      return res.json([
        {
          type: 'github',
          severity: 'HIGH',
          title: '[DEMO] Hardcoded API Credentials',
          description: `Scan completed but rate-limiting occurred or no live leaks were found. Mock exposure shown: found database API key in '${target}/backend/config.js'.`,
          foundAt: `https://github.com/${target}/backend/blob/main/config.js`,
          resolved: false,
          timestamp: new Date().toISOString()
        }
      ]);
    }

    return res.json(findings);
  } catch (err) {
    console.error('GitHub overall scan error', err.message);
    return res.json([
      {
        type: 'github',
        severity: 'CRITICAL',
        title: '[DEMO] GitHub API Error Fallback',
        description: `GitHub query failed. Demonstrating mock finding: AWS Secret Key leak detected in '${target}/app/keys.json'.`,
        foundAt: `https://github.com/${target}/app/keys.json`,
        resolved: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }
});

app.listen(PORT, () => {
  console.log(`SentryWatch backend listening on http://localhost:${PORT}`);
});
