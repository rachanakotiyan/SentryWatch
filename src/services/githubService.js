import axios from "axios";

// Proxy to backend for GitHub scanning to keep tokens off the client.
export async function scanGitHubOrg(org) {
	if (!org) return [];

	try {
		const res = await axios.post('/api/github/scan', { org });
		return Array.isArray(res.data) ? res.data : [];
	} catch (err) {
		console.error('Error calling backend /api/github/scan', err?.response?.status || err.message || err);
		return [];
	}
}

