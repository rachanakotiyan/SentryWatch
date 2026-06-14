import axios from "axios";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

// Scan a GitHub organization for likely exposed secrets using simple code search patterns.
// Returns an array of findings: { pattern, repository, path, html_url }
export async function scanGitHubOrg(org) {
	if (!org) return [];

	const patterns = [
		{ name: "AWS Access Key", q: "AKIA" },
		{ name: "GitHub Token", q: "ghp_" },
		{ name: "Private Key", q: "-----BEGIN PRIVATE KEY-----" },
		{ name: "API Key", q: "api_key=" },
		{ name: "Client Secret", q: "client_secret" },
	];

	const findings = [];

	for (const p of patterns) {
		const query = `${p.q} org:${org}`;
		const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`;

		const headers = {
			Accept: "application/vnd.github.v3+json",
		};

		if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

		try {
			const res = await axios.get(url, { headers });

			if (res.data && Array.isArray(res.data.items)) {
				for (const item of res.data.items) {
					findings.push({
						pattern: p.name,
						text_match: p.q,
						repository: item.repository?.full_name || "",
						path: item.path,
						html_url: item.html_url,
					});
				}
			}
		} catch (err) {
			// Don't fail the whole scan on a single pattern error — log and continue
			console.error("GitHub scan error for pattern", p.q, err?.response?.status || err.message || err);
		}
	}

	return findings;
}

