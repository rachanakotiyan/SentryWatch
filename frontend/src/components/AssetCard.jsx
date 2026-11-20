import AlertBadge from "./AlertBadge";

const typeLabels = {
  DOMAIN: "Domain",
  REPOSITORY: "Repository",
  EMAIL: "Email",
};

export default function AssetCard({ asset, riskScore, scanning, onScan, onView, onDelete }) {
  const severity = asset.status || "SECURE";
  const icon = asset.type === "EMAIL" ? "✉️" : asset.type === "DOMAIN" ? "🌐" : "⌘";
  const riskColor = severity === "CRITICAL" || severity === "HIGH"
    ? "risk-red"
    : severity === "MEDIUM" ? "risk-amber" : "risk-green";

  return (
    <article className="card asset-card">
      <div className="asset-card-main">
        <div className="asset-icon" aria-hidden="true">{icon}</div>
        <div className="asset-card-info">
          <div className="asset-name">{asset.name || asset.target}</div>
          <div className="asset-meta">
            <span className={`risk-indicator ${riskColor}`} />
            <span>{typeLabels[asset.type] || asset.type}</span>
            <span className="meta-dot">·</span>
            <span>{asset.lastScanned ? `Scanned ${new Date(asset.lastScanned).toLocaleString()}` : "Never scanned"}</span>
          </div>
        </div>
      </div>
      <div className="asset-card-actions">
        {riskScore !== null && riskScore !== undefined && (
          <span className="risk-score">{riskScore}<small>/100</small></span>
        )}
        <AlertBadge severity={severity} />
        <button className="btn btn-secondary" type="button" onClick={onScan} disabled={scanning}>
          {scanning ? "Scanning..." : "Scan"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onView}>View</button>
        <button className="btn btn-danger" type="button" onClick={onDelete}>Delete</button>
      </div>
    </article>
  );
}
