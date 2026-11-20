import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AlertBadge from "../components/AlertBadge";
import AssetCard from "../components/AssetCard";
import SeverityChart from "../components/SeverityChart";
import Modal from "../components/Modal";
import { deleteAsset, getErrorMessage, getScanHistory, scanAsset } from "../utils/storage";
import { useToast } from "../context/useToast";

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
  const { showToast } = useToast();
  const [scanningIds, setScanningIds] = useState({});
  const [scanHistories, setScanHistories] = useState({});
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  // Calculate average risk score
  const scoresWithValues = Object.values(scanHistories)
    .map((history) => latestScore(history))
    .filter((s) => s !== null && s !== undefined);
  const avgRiskScore = scoresWithValues.length
    ? Math.round(scoresWithValues.reduce((a, b) => a + b, 0) / scoresWithValues.length)
    : 0;

  const handleScan = async (asset) => {
    setError("");
    setScanningIds((current) => ({ ...current, [asset.id]: true }));
    try {
      const result = await scanAsset(asset.id);
      showToast(`Scan complete for ${asset.name || asset.target}. Score: ${result.riskScore}/100`, "success");
      if (result.demo) {
        showToast("Demo mode: email findings are generated sample data.", "info");
      }
    } catch (requestError) {
      const msg = scanErrorMessage(requestError, asset.type);
      setError(msg);
      showToast(msg, "error");
      setScanningIds((current) => ({ ...current, [asset.id]: false }));
      return;
    }
    try {
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Scan completed, but workspace could not be refreshed."));
    } finally {
      setScanningIds((current) => ({ ...current, [asset.id]: false }));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAsset(deleteTarget.id);
      showToast(`Deleted ${deleteTarget.name || deleteTarget.target}.`, "info");
      setDeleteTarget(null);
      await refreshData();
    } catch (requestError) {
      const msg = getErrorMessage(requestError, "Could not delete this asset.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="anim-fade-in dashboard-page">
      <header className="page-heading">
        <div className="page-heading-row">
          <div>
            <h1>Security overview</h1>
            <p>External perimeter monitoring across domains, email addresses, and source-code repositories.</p>
          </div>
          <Link className="btn btn-primary" to="/app/assets/new">
            + Add monitored asset
          </Link>
        </div>
      </header>

      {error && (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-link-retry" onClick={() => { setError(""); refreshData(); }}>
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="dashboard-stats">
        <div className="card stat-card">
          <span>Assets monitored</span>
          <strong>{assets.length}</strong>
          <small>Active endpoints</small>
        </div>
        <div className="card stat-card">
          <span>Open alerts</span>
          <strong className={activeAlerts.length ? "stat-warn" : "stat-good"}>
            {activeAlerts.length}
          </strong>
          <small>{activeAlerts.length ? "Requires attention" : "Perimeter clean"}</small>
        </div>
        <div className="card stat-card">
          <span>Critical threats</span>
          <strong className={criticalCount ? "stat-danger" : ""}>
            {criticalCount}
          </strong>
          <small>{criticalCount ? "Immediate action required" : "Zero critical issues"}</small>
        </div>
        <div className="card stat-card">
          <span>Average risk score</span>
          <strong className={avgRiskScore >= 50 ? "stat-danger" : avgRiskScore >= 20 ? "stat-warn" : "stat-good"}>
            {scoresWithValues.length ? `${avgRiskScore}/100` : "—"}
          </strong>
          <small>{resolvedThisSession > 0 ? `${resolvedThisSession} resolved this session` : scoresWithValues.length ? `From ${scoresWithValues.length} scanned assets` : "Awaiting initial scans"}</small>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🛡️</div>
          <h2 className="empty-title">No assets registered yet</h2>
          <p className="empty-desc">
            Add an email address, corporate domain, or public GitHub repository to start continuous perimeter monitoring.
          </p>
          <Link className="btn btn-primary" to="/app/assets/new">Add your first asset</Link>
        </div>
      ) : (
        <div className="dashboard-layout-grid">
          {/* Main Left Column: Asset list */}
          <section className="dashboard-main-col">
            <div className="section-heading">
              <h2>Monitored assets ({assets.length})</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={refreshData}
                title="Refresh asset status"
              >
                ↻ Refresh
              </button>
            </div>

            <div className="asset-list">
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  riskScore={latestScore(scanHistories[asset.id])}
                  scanning={Boolean(scanningIds[asset.id])}
                  onScan={() => handleScan(asset)}
                  onView={() => navigate(`/app/assets/${asset.id}`)}
                  onDelete={() => setDeleteTarget(asset)}
                />
              ))}
            </div>
          </section>

          {/* Right Column: Severity chart + Recent alerts */}
          <aside className="dashboard-side-col">
            <SeverityChart alerts={alerts} />

            <div className="card recent-alerts-card">
              <div className="section-heading">
                <h2>Recent alerts</h2>
                <Link className="text-link" to="/app/alerts">View all ({alerts.length})</Link>
              </div>

              {alerts.length === 0 ? (
                <div className="empty-alerts">No alerts recorded across assets.</div>
              ) : (
                <div className="recent-alert-list">
                  {[...alerts]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 5)
                    .map((alert) => {
                      const asset = assets.find((item) => item.id === alert.assetId);
                      return (
                        <article className={`recent-alert-item${alert.resolved ? " resolved" : ""}`} key={alert.id}>
                          <div className="recent-alert-top">
                            <AlertBadge severity={alert.severity} />
                            <time>{new Date(alert.createdAt).toLocaleDateString()}</time>
                          </div>
                          <strong className="recent-alert-title">{alert.title}</strong>
                          <span className="recent-alert-asset">
                            {asset?.name || asset?.target || "Monitored asset"}
                            {alert.resolved && <span className="resolved-tag"> &middot; Resolved</span>}
                          </span>
                        </article>
                      );
                    })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        title="Confirm Asset Deletion"
        onClose={() => !deleting && setDeleteTarget(null)}
      >
        <p>
          Are you sure you want to stop monitoring{" "}
          <strong>{deleteTarget?.name || deleteTarget?.target}</strong>?
        </p>
        <p className="modal-warning-text">
          All associated scan histories ({scanHistories[deleteTarget?.id]?.length || 0}) and active alerts will be permanently removed.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Asset"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
