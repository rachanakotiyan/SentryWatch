import axios from "axios";

// Proxy to backend for HIBP lookups to keep API keys off the client.
export async function checkHIBP(email) {
  if (!email) return [];

  try {
    const res = await axios.post("/api/scan/email", { value: email });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error calling backend /api/scan/email", err?.response?.status || err.message || err);
    return [];
  }
}
