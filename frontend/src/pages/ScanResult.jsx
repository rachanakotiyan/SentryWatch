import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AlertBadge from "../components/AlertBadge";
import RiskGauge from "../components/RiskGauge";
import RiskHistoryChart from "../components/RiskHistoryChart";
import TerminalLogs from "../components/TerminalLogs";
import DemoBanner from "../components/DemoBanner";
import { getErrorMessage, getScanHistory, resolveAlert, scanAsset } from "../utils/storage";
import { useToast } from "../context/useToast";

function scanErrorMessage(error, type) {
  if (error.response?.status === 503 && type === "EMAIL") {
    return "Email scanning not configured. Add a HIBP_API_KEY to the backend to enable email scans.";
  }
  if (error.response?.status === 409) {
    return "A scan is already running for this asset. Wait for it to finish before starting another.";
  }
  return getErrorMessage(error, "The scan failed. No results were saved.");
}

function getLatestScan(scans) {
  return [...scans].sort((a, b) => new Date(b.scannedAt || b.createdAt) - new Date(a.scannedAt || a.createdAt))[0];
}

export default function ScanResult({ assets, alerts, refreshData }) {
  const { assetId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const asset = assets.find((item) => item.id === assetId);
  const [historyState, setHistoryState] = useState({ assetId: null, scans: [] });
  const [scanResponse, setScanResponse] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [busyAlertId, setBusyAlertId] = useState(null);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const historyRequestId = useRef(0);

  useEffect(() => {
    let active = true;
    const requestId = ++historyRequestId.current;
    getScanHistory(assetId)
      .then((scans) => {
        if (active && requestId === historyRequestId.current) setHistoryState({ assetId, scans });
      })
      .catch((requestError) => {
        if (active && requestId === historyRequestId.current) setError(getErrorMessage(requestError, "Unable to load scan history."));
      });
    return () => { active = false; };
  }, [assetId]);

  const runScan = useCallback(async () => {
    if (!asset || scanning) return;
    const requestId = ++historyRequestId.current;
    setScanning(true);
    setError("");
    let result;
    try {
      result = await scanAsset(asset.id);
      if (requestId === historyRequestId.current) setScanResponse(result);
      showToast(`Scan complete. Risk score: ${result.riskScore}/100 (${result.status})`, "success");
    } catch (requestError) {
      const msg = scanErrorMessage(requestError, asset.type);
      setError(msg);
      showToast(msg, "error");
      setScanning(false);
      return;
    }

    try {
      const history = await getScanHistory(asset.id);
      if (requestId === historyRequestId.current) setHistoryState({ assetId: asset.id, scans: history });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Scan completed, but its history could not be refreshed."));
    }
    try {
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Scan completed, but the workspace could not be refreshed."));
    } finally {
      setScanning(false);
    }
  }, [asset, refreshData, scanning, showToast]);

  useEffect(() => {
    if (!location.state?.scanImmediately || !asset) return;
    navigate(location.pathname, { replace: true, state: null });
    Promise.resolve().then(() => runScan());
  }, [asset, location.pathname, location.state, navigate, runScan]);

  const assetAlerts = useMemo(
    () => alerts.filter((alert) => alert.assetId === assetId),
    [alerts, assetId]
  );
  const scans = historyState.assetId === assetId ? historyState.scans : [];
  const latestScan = getLatestScan(scans);

  const riskScore = scanResponse?.asset?.id === assetId
    ? scanResponse.riskScore
    : latestScan?.riskScore;

  const telemetry = scanResponse?.scan?.payload?.telemetry || latestScan?.payload?.telemetry;
  const isDemoScan = scanResponse?.demo === true || Boolean(telemetry?.demo);

  const assetTypeLabel = asset?.type === "EMAIL" ? "Email Address" : asset?.type === "DOMAIN" ? "Domain Target" : "GitHub Repository";

  const handleToggleResolve = async (alert) => {
    setBusyAlertId(alert.id);
    setError("");
    const newStatus = !alert.resolved;
    try {
      await resolveAlert(alert.id, newStatus);
      showToast(`Alert marked ${newStatus ? "resolved" : "unresolved"}.`, "info");
      await refreshData();
    } catch (requestError) {
      const msg = getErrorMessage(requestError, "Could not update this alert.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setBusyAlertId(null);
    }
  };

  if (!asset) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">⚠️</div>
        <h2 className="empty-title">Asset not found</h2>
        <p className="empty-desc">The requested asset may have been removed or belongs to another account.</p>
        <Link className="btn btn-secondary" to="/app">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="anim-fade-in scan-result-page">
      {isDemoScan && (
        <DemoBanner />
      )}

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      {/* Header bar */}
      <section className="card scan-asset-header">
        <div>
          <span className="eyebrow">{assetTypeLabel}</span>
          <h1>{asset.name || asset.target}</h1>
          <p className="scan-target-url">
            Target: <code>{asset.target}</code> &middot; Registered {new Date(asset.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="scan-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={runScan}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <span className="spinner-inline" aria-hidden="true" />
                Scanning perimeter...
              </>
            ) : (
              "Scan now"
            )}
          </button>
          <Link to="/app" className="btn btn-secondary">
            &larr; Dashboard
          </Link>
        </div>
      </section>

      {/* Big Risk Gauge + Status Summary */}
      <section className="scan-summary-grid">
        <div className="card gauge-card">
          <span className="summary-label">Risk score</span>
          <RiskGauge score={riskScore} size={170} />
          <p className="gauge-explainer">
            {riskScore === undefined || riskScore === null
              ? "Run a scan to calculate exposure weighting."
              : "Calculated from open findings across this asset."}
          </p>
        </div>

        <div className="card status-overview-card">
          <span className="summary-label">Current posture</span>
          <div className="status-large-badge">
            <AlertBadge severity={asset.status} />
            <strong className="status-text">{asset.status === "SECURE" ? "Perimeter Secure" : `${asset.status} Risk`}</strong>
          </div>

          <div className="status-stats-list">
            <div className="status-stat-item">
              <span>Open findings:</span>
              <strong>{assetAlerts.filter((a) => !a.resolved).length}</strong>
            </div>
            <div className="status-stat-item">
              <span>Resolved findings:</span>
              <strong>{assetAlerts.filter((a) => a.resolved).length}</strong>
            </div>
            <div className="status-stat-item">
              <span>Last scanned:</span>
              <strong>{asset.lastScanned ? new Date(asset.lastScanned).toLocaleString() : "Never"}</strong>
            </div>
            <div className="status-stat-item">
              <span>Total scans logged:</span>
              <strong>{scans.length}</strong>
            </div>
          </div>
        </div>
      </section>

      {scanning && (
        <div className="notice notice-info" role="status">
          <span className="spinner-inline" aria-hidden="true" />
          Scan in progress. Repository and domain scans take up to 20 seconds. Handshaking and analyzing findings...
        </div>
      )}

      {/* Findings Section */}
      <section className="scan-section">
        <div className="section-heading">
          <h2>Security findings ({assetAlerts.length})</h2>
          <span className="finding-counts">
            {assetAlerts.filter((a) => !a.resolved).length} open &middot; {assetAlerts.filter((a) => a.resolved).length} resolved
          </span>
        </div>

        {assetAlerts.length === 0 ? (
          <div className="card empty-alerts">
            <span className="empty-check-icon">&#10003;</span>
            <p>
              {scans.length
                ? "No open or historical alerts were returned for this asset. Status is clean."
                : "No scan results recorded yet. Initiate a scan above to evaluate this asset."}
            </p>
          </div>
        ) : (
          <div className="alert-list">
            {assetAlerts.map((alert) => (
              <article className={`card finding-card${alert.resolved ? " resolved" : ""}`} key={alert.id}>
                <div className="finding-heading">
                  <AlertBadge severity={alert.severity} />
                  <div className="finding-title">
                    <strong>{alert.title}</strong>
                    <time>Detected {new Date(alert.createdAt).toLocaleString()}</time>
                  </div>
                  <button
                    className={`btn btn-sm ${alert.resolved ? "btn-secondary" : "btn-success"}`}
                    type="button"
                    disabled={busyAlertId === alert.id}
                    onClick={() => handleToggleResolve(alert)}
                  >
                    {busyAlertId === alert.id ? "Updating..." : alert.resolved ? "Mark Unresolved" : "Resolve"}
                  </button>
                </div>
                <div className="finding-details">
                  <p>{alert.details || "No additional technical description provided."}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Collapsible Telemetry Details Section */}
      {telemetry && (
        <section className="scan-section">
          <div className="card telemetry-card">
            <button
              type="button"
              className="telemetry-toggle-header"
              onClick={() => setShowTelemetry((prev) => !prev)}
              aria-expanded={showTelemetry}
            >
              <div className="telemetry-title-group">
                <span className="telemetry-icon">&#128421;</span>
                <h3>Scan Telemetry &amp; Technical Attributes</h3>
              </div>
              <span className={`expand-indicator${showTelemetry ? " expanded" : ""}`} aria-hidden="true">⌄</span>
            </button>

            {showTelemetry && (
              <div className="telemetry-content">
                {asset.type === "DOMAIN" && (
                  <div className="telemetry-grid">
                    <div><strong>Host:</strong> {telemetry.host}</div>
                    <div><strong>Resolved IP:</strong> {telemetry.ip || "—"}</div>
                    <div><strong>Issuer CA:</strong> {telemetry.issuer || "—"}</div>
                    <div><strong>Days Remaining:</strong> {telemetry.daysRemaining !== undefined ? `${telemetry.daysRemaining} days` : "—"}</div>
                    <div><strong>Valid From:</strong> {telemetry.validFrom ? new Date(telemetry.validFrom).toLocaleDateString() : "—"}</div>
                    <div><strong>Valid To:</strong> {telemetry.validTo ? new Date(telemetry.validTo).toLocaleDateString() : "—"}</div>
                    <div><strong>Protocol:</strong> {telemetry.protocol || "TLS"}</div>
                    <div><strong>Cipher Suite:</strong> {telemetry.cipher || "—"}</div>
                    <div><strong>Key Length:</strong> {telemetry.keyBits ? `${telemetry.keyBits} bits` : "—"}</div>
                    <div><strong>CA Authorized:</strong> {telemetry.authorized ? "Yes (Trusted)" : "No (Untrusted or Self-Signed)"}</div>
                  </div>
                )}

                {asset.type === "REPOSITORY" && (
                  <div className="telemetry-grid">
                    <div><strong>Repository:</strong> {telemetry.repository || asset.target}</div>
                    <div><strong>Default Branch:</strong> {telemetry.defaultBranch || "main"}</div>
                    <div><strong>Visibility:</strong> {telemetry.visibility || "public"}</div>
                    <div><strong>Files in Tree:</strong> {telemetry.filesInTree ?? "—"}</div>
                    <div><strong>Files Scanned:</strong> {telemetry.filesScanned ?? "—"}</div>
                    <div><strong>Tree Truncated:</strong> {telemetry.truncated ? "Yes (Large repo limit reached)" : "No"}</div>
                    <div><strong>Findings Capped:</strong> {telemetry.findingsCapped ? "Yes (50 max reached)" : "No"}</div>
                  </div>
                )}

                {asset.type === "EMAIL" && (
                  <div className="telemetry-grid">
                    <div><strong>Email Address:</strong> {asset.target}</div>
                    <div><strong>Breaches Found:</strong> {telemetry.breaches ?? "0"}</div>
                    <div><strong>Mode:</strong> {telemetry.demo ? "Demo Mode (Mock data)" : `Live ${telemetry.provider || "HIBP"} API`}</div>
                    {Array.isArray(telemetry.names) && telemetry.names.length > 0 && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <strong>Compromised In:</strong> {telemetry.names.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* History and Trends */}
      <section className="scan-section">
        <div className="section-heading"><h2>Scan history &amp; trajectory</h2></div>
        <RiskHistoryChart scans={scans} />
        <TerminalLogs scans={scans} />
      </section>
    </div>
  );
}
