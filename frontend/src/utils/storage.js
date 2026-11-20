import api from "../services/api";

export async function register(email, password) {
  const { data } = await api.post("/auth/register", { email, password });
  return data;
}

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data.user;
}

export async function getAssets() {
  const { data } = await api.get("/assets");
  return data.assets;
}

export async function createAsset(asset) {
  const { data } = await api.post("/assets", asset);
  return data.asset;
}

export async function deleteAsset(id) {
  await api.delete(`/assets/${id}`);
}

export async function scanAsset(id) {
  const { data } = await api.post(`/scans/${id}`);
  return data;
}

export async function getScanHistory(id) {
  const { data } = await api.get(`/scans/${id}`);
  return data.scans;
}

export async function getAlerts(resolved) {
  if (resolved !== undefined) {
    const { data } = await api.get("/alerts", { params: { resolved } });
    return data.alerts;
  }
  const [open, closed] = await Promise.all([
    api.get("/alerts", { params: { resolved: false } }),
    api.get("/alerts", { params: { resolved: true } }),
  ]);
  return [...open.data.alerts, ...closed.data.alerts];
}

export async function resolveAlert(id, resolved = true) {
  const { data } = await api.patch(`/alerts/${id}`, { resolved });
  return data.alert;
}

export async function getHealth() {
  try {
    const { data } = await api.get("/health");
    return data;
  } catch {
    return null;
  }
}

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error.response?.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }
  return error.response?.data?.error || fallback;
}

export function formatRelativeTime(dateString) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}
