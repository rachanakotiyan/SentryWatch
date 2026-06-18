import { useState } from "react";
import { resolveAlert, deleteAlert } from "../utils/storage";

export default function Alerts({ alerts, refreshData, incrementResolved }) {
  const [severityFilter, setSeverityFilter] = useState("ALL"); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OPEN, RESOLVED
  const [expandedId, setExpandedId] = useState(null);

  const handleResolve = (id) => {
    resolveAlert(id);
    incrementResolved();
    refreshData();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to permanently delete this alert log?")) {
      deleteAlert(id);
      refreshData();
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Filter logic
  const filteredAlerts = alerts.filter((a) => {
    const matchSeverity = severityFilter === "ALL" || a.severity === severityFilter;
    const matchStatus = 
      statusFilter === "ALL" || 
      (statusFilter === "OPEN" && !a.resolved) || 
      (statusFilter === "RESOLVED" && a.resolved);
    return matchSeverity && matchStatus;
  });

  const getSeverityBadgeClass = (s) => {
    return `badge badge-${s.toLowerCase()}`;
  };

  return (
    <div className="anim-fade-in" style={{ textAlign: "left" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 4 }}>Vulnerability & Leak Alerts</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Historical list of credentials exposed, configuration vulnerabilities, and security risks.
        </p>
      </header>

      {/* Filters Bar */}
      <div className="card" style={{ padding: 20, marginBottom: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Severity Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", minWidth: 90 }}>
            Severity:
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                className="btn"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  fontWeight: severityFilter === sev ? 600 : 500,
                  backgroundColor: severityFilter === sev ? "var(--text-primary)" : "var(--bg-hover)",
                  color: severityFilter === sev ? "var(--bg-panel)" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === "ALL" ? "All Severities" : sev}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", minWidth: 90 }}>
            Status:
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["ALL", "OPEN", "RESOLVED"].map((stat) => (
              <button
                key={stat}
                className="btn"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  fontWeight: statusFilter === stat ? 600 : 500,
                  backgroundColor: statusFilter === stat ? "var(--text-primary)" : "var(--bg-hover)",
                  color: statusFilter === stat ? "var(--bg-panel)" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setStatusFilter(stat)}
              >
                {stat === "ALL" ? "All Status" : stat === "OPEN" ? "Open Alerts" : "Resolved Alerts"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="card empty-state" style={{ padding: "48px 20px" }}>
          <div className="empty-icon">🛡️</div>
          <h2 className="empty-title">No alerts found</h2>
          <p className="empty-desc">
            {alerts.length === 0 
              ? "You haven't recorded any scan alerts yet. Run a scan from the dashboard or add a new monitored asset." 
              : "No alert history matches your selected severity and status filters."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAlerts.map((a) => (
            <div key={a.id} className="card" style={{ 
              padding: 0, 
              overflow: "hidden",
              opacity: a.resolved ? 0.75 : 1,
              transition: "opacity 0.2s"
            }}>
              <div 
                style={{ 
                  padding: "16px 20px", 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={() => toggleExpand(a.id)}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span className={getSeverityBadgeClass(a.severity)}>
                    {a.severity}
                  </span>
                  
                  <div>
                    <div style={{ 
                      fontWeight: 600, 
                      fontSize: 15,
                      color: "var(--text-primary)",
                      textDecoration: a.resolved ? "line-through" : "none"
                    }}>
                      {a.title}
                    </div>
                    
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      Asset: <strong>{a.foundAt}</strong> • Detected: {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {!a.resolved && (
                    <button 
                      onClick={() => handleResolve(a.id)} 
                      className="btn btn-success"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Resolve
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDelete(a.id)} 
                    className="btn btn-danger"
                    style={{ padding: "6px 10px", fontSize: 12 }}
                  >
                    Delete
                  </button>

                  <span style={{ 
                    fontSize: 14, 
                    color: "var(--text-secondary)", 
                    transform: expandedId === a.id ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                    padding: "4px 8px",
                    cursor: "pointer"
                  }}
                  onClick={() => toggleExpand(a.id)}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {expandedId === a.id && (
                <div style={{ 
                  padding: "0 20px 20px 20px", 
                  borderTop: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-hover)",
                  fontSize: 14,
                  lineHeight: 1.6
                }}>
                  <div style={{ marginTop: 14 }}>
                    <strong>Exposure Data Details:</strong>
                    <div style={{ 
                      fontFamily: "var(--font-mono)", 
                      fontSize: 13, 
                      backgroundColor: "var(--bg-panel)", 
                      padding: 12, 
                      borderRadius: 6,
                      marginTop: 6,
                      border: "1px solid var(--border-color)",
                      whiteSpace: "pre-wrap"
                    }}>
                      {a.description}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-secondary)" }}>
                    <strong>Why this matters:</strong>
                    {a.type === "email" && " Compromised email accounts allow credentials to be targeted by malicious logins. Reset accounts and enable 2FA."}
                    {a.type === "domain" && " Expiring SSL certificates cause connection security errors for users. Renew the certificate before it expires."}
                    {a.type === "github" && " Hardcoded API keys or secret strings in public repositories allow unauthorized access to systems. Revoke and delete this credentials pattern."}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
