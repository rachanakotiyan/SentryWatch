import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AlertBadge from "../components/AlertBadge";
import TerminalLogs from "../components/TerminalLogs";
import { getErrorMessage, getScanHistory, resolveAlert, scanAsset } from "../utils/storage";

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
  const asset = assets.find((item) => item.id === assetId);
  const [historyState, setHistoryState] = useState({ assetId: null, scans: [] });
  const [scanResponse, setScanResponse] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
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
    } catch (requestError) {
      setError(scanErrorMessage(requestError, asset.type));
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
  }, [asset, refreshData, scanning]);

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
  const assetTypeLabel = asset?.type === "EMAIL" ? "Email address" : asset?.type === "DOMAIN" ? "Domain" : "Repository";

  const handleResolve = async (alertId) => {
    setResolvingId(alertId);
    setError("");
    try {
      await resolveAlert(alertId, true);
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not update this alert."));
    } finally {
      setResolvingId(null);
    }
  };

  if (!asset) {
    return (
      <div className="card empty-state">
        <div className="empty-icon">⚠️</div>
        <h2 className="empty-title">Asset not found</h2>
        <p className="empty-desc">The asset may have been removed.</p>
        <button className="btn btn-secondary" type="button" onClick={() => navigate("/")}>Back to dashboard</button>
      </div>
    );
  }

  return (
    <div className="anim-fade-in scan-result-page">
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <section className="card scan-asset-header">
        <div>
          <span className="eyebrow">{assetTypeLabel}</span>
          <h1>{asset.name || asset.target}</h1>
          <p>Added {new Date(asset.createdAt).toLocaleString()} · Last scanned {asset.lastScanned ? new Date(asset.lastScanned).toLocaleString() : "never"}</p>
        </div>
        <div className="scan-header-actions">
          <button type="button" className="btn btn-primary" onClick={runScan} disabled={scanning}>
            {scanning ? "Scanning..." : "Scan now"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>Dashboard</button>
        </div>
      </section>

      <section className="scan-summary">
        <div className="card scan-status-card">
          <span className="summary-label">Current status</span>
          <div className="scan-status-value">
            <AlertBadge severity={asset.status} />
            <strong>{asset.status === "SECURE" ? "Secure" : asset.status}</strong>
          </div>
          <p>{assetAlerts.filter((alert) => !alert.resolved).length} open alert(s)</p>
        </div>
        <div className="card scan-risk-card">
          <span className="summary-label">Latest risk score</span>
          <strong className="risk-score-large">{Number.isFinite(Number(riskScore)) ? `${riskScore}/100` : "—"}</strong>
          <p>{riskScore === undefined || riskScore === null ? "Run a scan to calculate a score." : "Score from the latest scan."}</p>
        </div>
      </section>

      {scanning && (
        <div className="notice notice-info" role="status">
          Scan in progress. Repository scans can take up to 20 seconds; keep this page open.
        </div>
      )}

      <section className="scan-section">
        <div className="section-heading"><h2>Findings</h2></div>
        {assetAlerts.length === 0 ? (
          <div className="card empty-alerts">
            {scans.length ? "No open or historical alerts were returned for this asset." : "No scan results yet. Start a scan to see findings."}
          </div>
        ) : (
          <div className="alert-list">
            {assetAlerts.map((alert) => (
              <article className={`card finding-card${alert.resolved ? " resolved" : ""}`} key={alert.id}>
                <div className="finding-heading">
                  <AlertBadge severity={alert.severity} />
                  <div className="finding-title"><strong>{alert.title}</strong><time>{new Date(alert.createdAt).toLocaleString()}</time></div>
                  {!alert.resolved && (
                    <button className="btn btn-success" type="button" disabled={resolvingId === alert.id} onClick={() => handleResolve(alert.id)}>
                      {resolvingId === alert.id ? "Saving..." : "Resolve"}
                    </button>
                  )}
                  {alert.resolved && <span className="resolved-label">Resolved</span>}
                </div>
                <p className="finding-details">{alert.details || "No additional details were provided."}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="scan-section">
        <div className="section-heading"><h2>Scan history</h2></div>
        <TerminalLogs scans={scans} />
      </section>
    </div>
  );
}
