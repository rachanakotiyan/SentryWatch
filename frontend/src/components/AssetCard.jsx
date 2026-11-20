import AlertBadge from "./AlertBadge";
import { formatRelativeTime } from "../utils/storage";

const typeLabels = {
  DOMAIN: "Domain",
  REPOSITORY: "Repository",
  EMAIL: "Email",
};

export default function AssetCard({ asset, riskScore, scanning, onScan, onView, onDelete }) {
  const severity = asset.status || "SECURE";
  const icon = asset.type === "EMAIL" ? "✉️" : asset.type === "DOMAIN" ? "🌐" : "⌘";
  const numericScore = Number.isFinite(Number(riskScore)) ? Number(riskScore) : null;

  let scoreColorClass = "score-clean";
  if (numericScore >= 80) scoreColorClass = "score-critical";
  else if (numericScore >= 50) scoreColorClass = "score-high";
  else if (numericScore >= 20) scoreColorClass = "score-medium";
  else if (numericScore > 0) scoreColorClass = "score-low";

  const riskDotClass = severity === "CRITICAL" || severity === "HIGH"
    ? "risk-red"
    : severity === "MEDIUM" ? "risk-amber" : "risk-green";

  return (
    <article className="card asset-card">
      <div className="asset-card-main">
        <div className="asset-icon" aria-hidden="true">{icon}</div>
        <div className="asset-card-info">
          <div className="asset-name" title={asset.name || asset.target}>
            {asset.name || asset.target}
          </div>
          <div className="asset-meta">
            <span className={`risk-indicator ${riskDotClass}`} />
            <span>{typeLabels[asset.type] || asset.type}</span>
            <span className="meta-dot">&middot;</span>
            <span title={asset.lastScanned ? new Date(asset.lastScanned).toLocaleString() : undefined}>
              {asset.lastScanned ? `Scanned ${formatRelativeTime(asset.lastScanned)}` : "Never scanned"}
            </span>
          </div>

          {/* Risk score progress bar */}
          {numericScore !== null && (
            <div className="asset-score-bar-wrapper" title={`Risk score: ${numericScore}/100`}>
              <div className="asset-score-bar-bg">
                <div
                  className={`asset-score-bar-fill ${scoreColorClass}`}
                  style={{ width: `${Math.min(100, Math.max(4, numericScore))}%` }}
                />
              </div>
              <span className={`asset-score-text ${scoreColorClass}`}>{numericScore}</span>
            </div>
          )}
        </div>
      </div>

      <div className="asset-card-actions">
        <AlertBadge severity={severity} />
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onScan}
          disabled={scanning}
          aria-label={scanning ? `Scanning ${asset.name || asset.target}` : `Scan ${asset.name || asset.target}`}
        >
          {scanning ? (
            <>
              <span className="spinner-inline" aria-hidden="true" />
              Scanning...
            </>
          ) : (
            "Scan"
          )}
        </button>
        <button className="btn btn-secondary btn-sm" type="button" onClick={onView}>
          View
        </button>
        <button
          className="btn btn-danger btn-sm"
          type="button"
          onClick={onDelete}
          disabled={scanning}
          aria-label={`Delete ${asset.name || asset.target}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
