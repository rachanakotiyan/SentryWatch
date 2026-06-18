import axios from "axios";

// Proxy to backend for SSL domain scans to avoid CORS issues and add caching/timeouts.
export async function checkSSL(domain) {
  if (!domain) return [];

  try {
    const res = await axios.post("/api/scan/domain", { value: domain });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error calling backend /api/scan/domain", err?.response?.status || err.message || err);
    return [];
  }
}