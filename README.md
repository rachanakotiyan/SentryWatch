# SentryWatch — Digital Exposure Monitoring Platform

SentryWatch is a digital threat intelligence and risk monitoring platform. It passively monitors specific assets—email addresses, domains, and GitHub usernames/organizations—checking for credentials exposure, expiring SSL certificates, and hardcoded secrets.

This repository contains a fully working prototype featuring local storage-based persistence, an Express proxy backend, and a highly polished slate-themed React frontend.

---

## Key Features

1. **Multi-Asset Monitoring**:
   - **Emails**: Checks HaveIBeenPwned API for data breaches.
   - **Domains**: Queries crt.sh (certificate transparency logs) for SSL certificate expiries.
   - **GitHub Orgs/Users**: Searches GitHub public repositories for exposed credential patterns (e.g. AWS Keys, GitHub Access Tokens).
2. **Aggregated Dashboard**: Track asset status, active alerts, and resolved session counts with color-coded risk levels.
3. **Filterable Alerts Center**: Filter alerts by severity (Critical / High / Medium / Low) and status (Open / Resolved), with detailed threat descriptions and mitigations.
4. **Interactive ScanResult Explorer**: Run immediate manual scan triggers and inspect findings with expandable explanations of why they matter.
5. **Robust Mock Trigger Mode**: If no API keys are present, SentryWatch intelligently falls back to clearly-labeled demo threat data (prefixing titles with `[DEMO]`), ensuring the application remains 100% testable end-to-end.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
1. Install root dependencies (Express, Axios, Dotenv, Cors, Vite, React):
   ```bash
   npm install
   ```

2. Set up environmental configuration:
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and configure your API keys (optional):
   - **`PORT`**: Set to `5001` (default) to run the Express backend.
   - **`HIBP_API_KEY`**: Provide a HaveIBeenPwned API key (purchase at [HaveIBeenPwned](https://haveibeenpwned.com/API/Key)). If empty, the app runs in demo mode.
   - **`GITHUB_TOKEN`**: Provide a GitHub Personal Access Token (PAT) to increase GitHub API search rate limits (generate at [GitHub Settings](https://github.com/settings/tokens)). If empty, public unauthenticated search is used, falling back to mock results on rate limits.

---

## Running the Application

You must run both the Express backend server and the Vite frontend dev server.

### 1. Launch the Backend Proxy (Port 5001)
```bash
npm run server
```

### 2. Launch the React Dev Server (Port 5173)
```bash
npm run dev
```

Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## Prototype Persistence Notice

This application stores monitored assets and alert logs in the browser's `localStorage` and tracks resolved items in `sessionStorage`. All assets and data will persist across page refreshes, but clearing your browser's site data or changing browsers will clear SentryWatch's database.