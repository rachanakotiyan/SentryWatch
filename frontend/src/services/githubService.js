import axios from "axios";

// Proxy to backend for GitHub scanning to keep tokens off the client.
export async function scanGitHubOrg(org) {
  if (!org) return [];

  try {
    const res = await axios.post("/api/scan/github", { value: org });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error calling backend /api/scan/github", err?.response?.status || err.message || err);
    return [];
  }
}
