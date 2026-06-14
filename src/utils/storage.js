export const saveAsset = (asset) => {
  const assets = getAssets();

  assets.push({
    ...asset,
    id: Date.now(),
  });

  localStorage.setItem("sw_assets", JSON.stringify(assets));
};

export const getAssets = () => {
  return JSON.parse(localStorage.getItem("sw_assets") || "[]");
};

export const deleteAsset = (id) => {
  const assets = getAssets().filter(asset => asset.id !== id);

  localStorage.setItem(
    "sw_assets",
    JSON.stringify(assets)
  );
};

export const updateAsset = (id, updates) => {
  const assets = getAssets().map(a => {
    if (a.id === id) return { ...a, ...updates };
    return a;
  });

  localStorage.setItem("sw_assets", JSON.stringify(assets));
};

// Alerts storage helpers
export const saveAlert = (alert) => {
  const alerts = getAlerts();

  alerts.push({
    id: Date.now(),
    severity: alert.severity || "LOW",
    message: alert.message || "",
    source: alert.source || "",
    timestamp: alert.timestamp || new Date().toISOString(),
    resolved: !!alert.resolved,
  });

  localStorage.setItem("sw_alerts", JSON.stringify(alerts));
};

export const getAlerts = () => {
  return JSON.parse(localStorage.getItem("sw_alerts") || "[]");
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