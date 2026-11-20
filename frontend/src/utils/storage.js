// Assets storage helpers
export const getAssets = () => {
  return JSON.parse(localStorage.getItem("sw_assets") || "[]");
};

export const saveAsset = (asset) => {
  const assets = getAssets();
  const newAsset = {
    ...asset,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    lastScan: null,
    lastScanResult: null
  };
  assets.push(newAsset);
  localStorage.setItem("sw_assets", JSON.stringify(assets));
  return newAsset;
};

export const deleteAsset = (id) => {
  const assets = getAssets().filter(asset => asset.id !== id);
  localStorage.setItem("sw_assets", JSON.stringify(assets));

  // Cascade delete alerts associated with this asset
  const alerts = getAlerts().filter(alert => alert.assetId !== id);
  localStorage.setItem("sw_alerts", JSON.stringify(alerts));
};

export const updateAsset = (id, updates) => {
  const assets = getAssets().map(a => {
    if (a.id === id) return { ...a, ...updates };
    return a;
  });
  localStorage.setItem("sw_assets", JSON.stringify(assets));
};

// Alerts storage helpers
export const getAlerts = () => {
  const alerts = JSON.parse(localStorage.getItem("sw_alerts") || "[]");
  // Sort by most recent by default (timestamp or createdAt)
  return alerts.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
};

export const saveAlert = (alert) => {
  const alerts = getAlerts();
  const newAlert = {
    id: Date.now() + Math.random(), // Add randomness to prevent ID collision during batch scans
    type: alert.type || "unknown",
    severity: alert.severity || "LOW",
    title: alert.title || alert.message || "Security Warning",
    description: alert.description || "",
    foundAt: alert.foundAt || alert.source || "External Scan",
    resolved: !!alert.resolved,
    assetId: alert.assetId || null,
    timestamp: alert.timestamp || new Date().toISOString(),
    createdAt: alert.createdAt || new Date().toISOString(),
  };
  alerts.push(newAlert);
  localStorage.setItem("sw_alerts", JSON.stringify(alerts));
  return newAlert;
};

export const deleteAlert = (id) => {
  const alerts = getAlerts().filter(a => a.id !== id);
  localStorage.setItem("sw_alerts", JSON.stringify(alerts));
};

export const resolveAlert = (id) => {
  const alerts = getAlerts().map(a => {
    if (a.id === id) return { ...a, resolved: true };
    return a;
  });
  localStorage.setItem("sw_alerts", JSON.stringify(alerts));
};