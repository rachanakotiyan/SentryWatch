import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlertBadge from "../components/AlertBadge";
import AssetCard from "../components/AssetCard";
import { deleteAsset, getErrorMessage, getScanHistory, scanAsset } from "../utils/storage";

const latestScore = (history = []) => {
  const scans = [...history].sort((a, b) => new Date(b.scannedAt || b.createdAt) - new Date(a.scannedAt || a.createdAt));
  const score = Number(scans[0]?.riskScore);
  return Number.isFinite(score) ? score : null;
};

function scanErrorMessage(error, type) {
  if (error.response?.status === 503 && type === "EMAIL") {
    return "Email scanning is not configured. Add a HIBP_API_KEY to the backend.";
  }
  if (error.response?.status === 409) {
    return "A scan is already running for this asset. Wait for it to finish before starting another.";
  }
  return getErrorMessage(error, "The scan failed. No results were saved.");
}

export default function Dashboard({ assets, alerts, refreshData, resolvedThisSession }) {
  const navigate = useNavigate();
  const [scanningIds, setScanningIds] = useState({});
  const [scanHistories, setScanHistories] = useState({});
  const [error, setError] = useState("");
  const historyRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    const requestId = ++historyRequestId.current;
    Promise.all(assets.map(async (asset) => [asset.id, await getScanHistory(asset.id)]))
      .then((entries) => {
        if (active && requestId === historyRequestId.current) setScanHistories(Object.fromEntries(entries));
      })
      .catch((requestError) => {
        if (active && requestId === historyRequestId.current) setError(getErrorMessage(requestError, "Unable to load scan history."));
      });
    return () => { active = false; };
  }, [assets]);

  const activeAlerts = alerts.filter((alert) => !alert.resolved);
  const criticalCount = activeAlerts.filter((alert) => alert.severity === "CRITICAL").length;
  const handleScan = async (asset) => {
    setError("");
    setScanningIds((current) => ({ ...current, [asset.id]: true }));
    try {
      await scanAsset(asset.id);
    } catch (requestError) {
      setError(scanErrorMessage(requestError, asset.type));
      setScanningIds((current) => ({ ...current, [asset.id]: false }));
      return;
    }
    try {
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Scan completed, but the workspace could not be refreshed."));
    } finally {
      setScanningIds((current) => ({ ...current, [asset.id]: false }));
    }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Stop monitoring ${asset.name || asset.target}? Its scans and alerts will also be deleted.`)) return;
    setError("");
    try {
      await deleteAsset(asset.id);
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not delete this asset."));
    }
  };

  return (
    <div className="anim-fade-in">
      <header className="page-heading">
        <h1>Security overview</h1>
        <p>Monitor exposure across your email addresses, domains, and source-code repositories.</p>
      </header>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="dashboard-stats">
        <div className="card stat-card"><span>Assets monitored</span><strong>{assets.length}</strong><small>Active endpoints</small></div>
        <div className="card stat-card"><span>Open alerts</span><strong className={activeAlerts.length ? "stat-warn" : "stat-good"}>{activeAlerts.length}</strong><small>Requires attention</small></div>
        <div className="card stat-card"><span>Critical threats</span><strong className={criticalCount ? "stat-danger" : ""}>{criticalCount}</strong><small>Immediate attention</small></div>
        <div className="card stat-card"><span>Resolved this session</span><strong className="stat-good">{resolvedThisSession}</strong><small>Session corrections</small></div>
      </div>

      {assets.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🛡️</div>
          <h2 className="empty-title">No assets yet</h2>
          <p className="empty-desc">Add an email, domain, or GitHub repository to start monitoring.</p>
          <Link className="btn btn-primary" to="/assets/new">Add your first asset</Link>
        </div>
      ) : (
        <div className="dashboard-columns">
          <section>
            <div className="section-heading">
              <h2>Monitored assets</h2>
              <Link className="btn btn-primary" to="/assets/new">Add asset</Link>
            </div>
            <div className="asset-list">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  riskScore={latestScore(scanHistories[asset.id])}
                  scanning={Boolean(scanningIds[asset.id])}
                  onScan={() => handleScan(asset)}
                  onView={() => navigate(`/assets/${asset.id}`)}
                  onDelete={() => handleDelete(asset)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="section-heading"><h2>Recent alerts</h2></div>
            {alerts.length === 0 ? (
              <div className="card empty-alerts">No alerts recorded.</div>
            ) : (
              <div className="recent-alert-list">
                {[...alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map((alert) => {
                  const asset = assets.find((item) => item.id === alert.assetId);
                  return (
                    <article className="card recent-alert" key={alert.id}>
                      <div className="recent-alert-top">
                        <AlertBadge severity={alert.severity} />
                        <time>{new Date(alert.createdAt).toLocaleDateString()}</time>
                      </div>
                      <strong>{alert.title}</strong>
                      <p>{asset?.name || asset?.target || "Monitored asset"}</p>
                    </article>
                  );
                })}
                <Link className="text-link" to="/alerts">View all alerts</Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
