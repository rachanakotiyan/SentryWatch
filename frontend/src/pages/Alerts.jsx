import { useState } from "react";
import AlertBadge from "../components/AlertBadge";
import { getErrorMessage, resolveAlert } from "../utils/storage";

const severities = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const statuses = ["ALL", "OPEN", "RESOLVED"];

export default function Alerts({ assets, alerts, refreshData, incrementResolved }) {
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const filteredAlerts = alerts
    .filter((alert) => severityFilter === "ALL" || alert.severity === severityFilter)
    .filter((alert) => statusFilter === "ALL" || (statusFilter === "OPEN" ? !alert.resolved : alert.resolved))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleResolve = async (alert) => {
    setError("");
    setBusyId(alert.id);
    try {
      await resolveAlert(alert.id, true);
      incrementResolved();
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update this alert."));
    } finally {
      setBusyId(null);
    }
  };

  const filterButtons = (values, active, onChange, label) => (
    <div className="filter-row">
      <span className="filter-label">{label}</span>
      <div className="filter-options">
        {values.map((value) => (
          <button
            className={`filter-button${active === value ? " active" : ""}`}
            type="button"
            key={value}
            aria-pressed={active === value}
            onClick={() => onChange(value)}
          >
            {value === "ALL" ? `All ${label.toLowerCase()}` : value}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="anim-fade-in">
      <header className="page-heading">
        <h1>Vulnerability &amp; leak alerts</h1>
        <p>Review detected exposures and track remediation across monitored assets.</p>
      </header>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <section className="card alert-filters" aria-label="Alert filters">
        {filterButtons(severities, severityFilter, setSeverityFilter, "Severity")}
        {filterButtons(statuses, statusFilter, setStatusFilter, "Status")}
      </section>

      {filteredAlerts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">🛡️</div>
          <h2 className="empty-title">No alerts found</h2>
          <p className="empty-desc">
            {alerts.length === 0 ? "Run a scan on a monitored asset to check for exposure." : "No alerts match the selected filters."}
          </p>
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
                        Asset: {asset?.name || asset?.target || alert.assetId} · Detected: {new Date(alert.createdAt).toLocaleString()}
                      </small>
                    </span>
                    <span className={`expand-indicator${expanded ? " expanded" : ""}`} aria-hidden="true">⌄</span>
                  </button>
                  {!alert.resolved && (
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={busyId === alert.id}
                      onClick={() => handleResolve(alert)}
                    >
                      {busyId === alert.id ? "Saving..." : "Resolve"}
                    </button>
                  )}
                  {alert.resolved && <span className="resolved-label">Resolved</span>}
                </div>
                {expanded && (
                  <div className="alert-details">
                    <strong>Details</strong>
                    <p>{alert.details || "No additional details were provided."}</p>
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
