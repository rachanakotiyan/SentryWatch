import { useState } from "react";
import AlertBadge from "../components/AlertBadge";
import { getErrorMessage, resolveAlert } from "../utils/storage";
import { useToast } from "../context/useToast";

const severities = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const statuses = ["ALL", "OPEN", "RESOLVED"];

export default function Alerts({ assets, alerts, refreshData, incrementResolved }) {
  const { showToast } = useToast();
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlerts = alerts
    .filter((alert) => severityFilter === "ALL" || alert.severity === severityFilter)
    .filter((alert) => statusFilter === "ALL" || (statusFilter === "OPEN" ? !alert.resolved : alert.resolved))
    .filter((alert) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const asset = assets.find((item) => item.id === alert.assetId);
      return (
        alert.title.toLowerCase().includes(q) ||
        (alert.details && alert.details.toLowerCase().includes(q)) ||
        (asset?.name && asset.name.toLowerCase().includes(q)) ||
        (asset?.target && asset.target.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleToggleResolve = async (alert) => {
    setError("");
    setBusyId(alert.id);
    const nextState = !alert.resolved;
    try {
      await resolveAlert(alert.id, nextState);
      if (nextState && incrementResolved) {
        incrementResolved();
      }
      showToast(`Alert marked ${nextState ? "resolved" : "unresolved"}.`, "info");
      await refreshData();
    } catch (requestError) {
      const msg = getErrorMessage(requestError, "Could not update this alert.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setBusyId(null);
    }
  };

  // Compute counts for badges
  const severityCounts = {
    ALL: alerts.length,
    CRITICAL: alerts.filter((a) => a.severity === "CRITICAL").length,
    HIGH: alerts.filter((a) => a.severity === "HIGH").length,
    MEDIUM: alerts.filter((a) => a.severity === "MEDIUM").length,
    LOW: alerts.filter((a) => a.severity === "LOW").length,
  };

  const statusCounts = {
    ALL: alerts.length,
    OPEN: alerts.filter((a) => !a.resolved).length,
    RESOLVED: alerts.filter((a) => a.resolved).length,
  };

  return (
    <div className="anim-fade-in alerts-page">
      <header className="page-heading">
        <div className="page-heading-row">
          <div>
            <h1>Vulnerability &amp; leak alerts</h1>
            <p>Triage detected exposures, review historical resolutions, and track remediation across monitored assets.</p>
          </div>
          <div className="alert-total-pill">
            <span>{statusCounts.OPEN} open</span> &middot; <span>{statusCounts.RESOLVED} resolved</span>
          </div>
        </div>
      </header>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <section className="card alert-filters-panel" aria-label="Alert filters">
        <div className="filter-search-row">
          <input
            type="search"
            className="form-input filter-search-input"
            placeholder="Search alerts by title, details, or asset target..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search alerts"
          />
        </div>

        <div className="filter-row">
          <span className="filter-label">Severity:</span>
          <div className="filter-options">
            {severities.map((sev) => (
              <button
                className={`filter-button${severityFilter === sev ? " active" : ""}`}
                type="button"
                key={sev}
                aria-pressed={severityFilter === sev}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === "ALL" ? "All severities" : sev}
                <span className="filter-count-chip">{severityCounts[sev] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">Status:</span>
          <div className="filter-options">
            {statuses.map((st) => (
              <button
                className={`filter-button${statusFilter === st ? " active" : ""}`}
                type="button"
                key={st}
                aria-pressed={statusFilter === st}
                onClick={() => setStatusFilter(st)}
              >
                {st === "ALL" ? "All statuses" : st}
                <span className="filter-count-chip">{statusCounts[st] || 0}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredAlerts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🛡️</div>
          <h2 className="empty-title">No alerts match criteria</h2>
          <p className="empty-desc">
            {alerts.length === 0
              ? "Run a scan on an asset to detect exposures."
              : "No alerts match the selected severity and status filters."}
          </p>
          {(severityFilter !== "ALL" || statusFilter !== "ALL" || searchQuery) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSeverityFilter("ALL");
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="alert-list">
          {filteredAlerts.map((alert) => {
            const asset = assets.find((item) => item.id === alert.assetId);
            const expanded = expandedId === alert.id;
            return (
              <article className={`card alert-item${alert.resolved ? " resolved" : ""}`} key={alert.id}>
                <div className="alert-item-header">
                  <button
                    className="alert-summary"
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : alert.id)}
                  >
                    <AlertBadge severity={alert.severity} />
                    <span className="alert-summary-text">
                      <strong>{alert.title}</strong>
                      <small>
                        Asset: {asset?.name || asset?.target || alert.assetId} &middot; Detected: {new Date(alert.createdAt).toLocaleString()}
                      </small>
                    </span>
                    <span className={`expand-indicator${expanded ? " expanded" : ""}`} aria-hidden="true">⌄</span>
                  </button>

                  <div className="alert-action-group">
                    <button
                      type="button"
                      className={`btn btn-sm ${alert.resolved ? "btn-secondary" : "btn-success"}`}
                      disabled={busyId === alert.id}
                      onClick={() => handleToggleResolve(alert)}
                    >
                      {busyId === alert.id ? "Updating..." : alert.resolved ? "Unresolve" : "Resolve"}
                    </button>
                    {alert.resolved && <span className="resolved-label">&check; Resolved</span>}
                  </div>
                </div>

                {expanded && (
                  <div className="alert-details">
                    <strong>Technical Details &amp; Remediation Guidance</strong>
                    <p>{alert.details || "No additional details provided."}</p>
                    {asset && (
                      <div className="alert-asset-ref">
                        <span>Target: <code>{asset.target}</code> ({asset.type})</span>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
