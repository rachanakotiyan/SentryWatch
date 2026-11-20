import { useState, useEffect, useCallback } from "react";
import { getAssets, updateAsset, getAlerts, saveAlert, resolveAlert } from "../utils/storage";
import { checkHIBP } from "../services/hibpService";
import { checkSSL } from "../services/sslService";
import { scanGitHubOrg } from "../services/githubService";

export default function ScanResult({ assetId, refreshData, navigateTo }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  const runScan = useCallback(async (targetAsset) => {
    if (!targetAsset) return;
    setLoading(true);

    try {
      let findings = [];
      const value = targetAsset.value;

      if (targetAsset.type === "email" || targetAsset.email) {
        findings = await checkHIBP(value || targetAsset.email);
      } else if (targetAsset.type === "domain" || targetAsset.domain) {
        findings = await checkSSL(value || targetAsset.domain);
      } else if (targetAsset.type === "github" || targetAsset.githubOrg) {
        findings = await scanGitHubOrg(value || targetAsset.githubOrg);
      }

      // 1. Remove previous alerts for this asset to avoid duplicates on re-scan
      const allCurrentAlerts = getAlerts();
      const filteredAlerts = allCurrentAlerts.filter(a => a.assetId !== targetAsset.id);
      localStorage.setItem("sw_alerts", JSON.stringify(filteredAlerts));

      // 2. Save new alerts
      const savedAlertsList = [];
      for (const finding of findings) {
        const saved = saveAlert({
          ...finding,
          assetId: targetAsset.id,
          source: value
        });
        savedAlertsList.push(saved);
      }

      // 3. Update asset details in storage
      updateAsset(targetAsset.id, {
        lastScan: new Date().toISOString(),
        lastScanResult: savedAlertsList
      });

      // 4. Update local component state
      setAlerts(savedAlertsList);
      
      // Update asset locally
      const updatedAsset = getAssets().find(a => a.id === targetAsset.id);
      setAsset(updatedAsset);
    } catch (err) {
      console.error("Scan execution failed:", err);
    } finally {
      setLoading(false);
      refreshData();
    }
  }, [refreshData]);

  // Load asset on mount or ID change
  useEffect(() => {
    const foundAsset = getAssets().find(a => a.id === assetId);
    if (foundAsset) {
      setAsset(foundAsset);
      
      // Run scan automatically if it has never been scanned
      if (!foundAsset.lastScan) {
        runScan(foundAsset);
      } else {
        // Load existing alerts for this asset
        const assetAlerts = getAlerts().filter(a => a.assetId === foundAsset.id);
        setAlerts(assetAlerts);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [assetId, runScan]);

  const handleRescan = () => {
    if (asset) {
      runScan(asset);
    }
  };

  const handleResolveAlert = (id) => {
    resolveAlert(id);
    // Optimistic update of local state
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    refreshData();
  };

  const toggleExpand = (id) => {
    setExpandedAlertId(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div className="anim-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="card" style={{ padding: 40, textAlign: "left" }}>
          <div className="skeleton-line skeleton-title" style={{ height: 28 }}></div>
          <div className="skeleton-line" style={{ width: "30%", marginBottom: 32 }}></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="skeleton-line" style={{ height: 64, borderRadius: 8 }}></div>
            <div className="skeleton-line" style={{ height: 64, borderRadius: 8 }}></div>
            <div className="skeleton-line" style={{ height: 64, borderRadius: 8 }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="anim-fade-in" style={{ maxWidth: 500, margin: "40px auto", textAlign: "center" }}>
        <div className="card" style={{ padding: 32 }}>
          <div className="empty-icon">⚠️</div>
          <h2 className="empty-title">Asset Not Found</h2>
          <p className="empty-desc">The asset you are trying to view does not exist or has been removed.</p>
          <button className="btn btn-secondary" onClick={() => navigateTo("dashboard")}>
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const assetValue = asset.value || asset.email || asset.domain || asset.githubOrg;
  const assetTypeLabel = asset.type === "email" ? "Email Address" : (asset.type === "domain" ? "Domain Name" : "GitHub Org");
  const openAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="anim-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header Info */}
      <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, color: "var(--text-secondary)" }}>
              {assetTypeLabel}
            </span>
            <h1 style={{ fontSize: 24, margin: "4px 0 8px 0" }}>{assetValue}</h1>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Registered on: {new Date(asset.createdAt).toLocaleString()} • Last Scanned: {asset.lastScan ? new Date(asset.lastScan).toLocaleString() : "Never"}
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleRescan}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              Scan now
            </button>
            <button className="btn btn-secondary" onClick={() => navigateTo("dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Security Status Box */}
      {alerts.length === 0 ? (
        <div className="card" style={{ 
          padding: 32, 
          textAlign: "center", 
          borderColor: "rgba(16, 185, 129, 0.3)",
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          marginBottom: 24
        }}>
          <div style={{ fontSize: 48, color: "var(--severity-clean)", marginBottom: 12 }}>🛡️</div>
          <h2 style={{ color: "var(--severity-clean)", marginBottom: 8 }}>Asset is Secure</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 460, margin: "0 auto 0" }}>
            Our sentinel scan checked all public exposure records and found no compromised credentials or vulnerabilities for <strong>{assetValue}</strong>.
          </p>
        </div>
      ) : (
        <div className="card" style={{ 
          padding: 24, 
          textAlign: "left", 
          borderColor: openAlerts.length > 0 ? "rgba(249, 115, 22, 0.3)" : "rgba(16, 185, 129, 0.3)",
          backgroundColor: openAlerts.length > 0 ? "rgba(249, 115, 22, 0.03)" : "rgba(16, 185, 129, 0.03)",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16
        }}>
          <div style={{ 
            fontSize: 24, 
            background: openAlerts.length > 0 ? "rgba(249, 115, 22, 0.15)" : "rgba(16, 185, 129, 0.15)",
            padding: 12,
            borderRadius: 8
          }}>
            {openAlerts.length > 0 ? "⚠️" : "✓"}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {openAlerts.length > 0 ? `${openAlerts.length} Active Exposure(s) Detected` : "Exposures Resolved"}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              {openAlerts.length > 0 
                ? "Review the detailed vulnerability logs below and take corrective actions immediately." 
                : "All previously flagged exposures for this asset have been marked as resolved."}
            </p>
          </div>
        </div>
      )}

      {/* Alerts Feed */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", marginBottom: 24 }}>
          {alerts.map((a) => (
            <div key={a.id} className="card" style={{ 
              padding: 0, 
              overflow: "hidden",
              opacity: a.resolved ? 0.75 : 1,
              transition: "opacity 0.2s"
            }}>
              <div 
                style={{ 
                  padding: 18, 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={() => toggleExpand(a.id)}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span className={`badge badge-${a.severity.toLowerCase()}`}>
                    {a.severity}
                  </span>
                  <div>
                    <div style={{ 
                      fontWeight: 600, 
                      color: "var(--text-primary)",
                      textDecoration: a.resolved ? "line-through" : "none"
                    }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      Found at: {a.foundAt} • {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {!a.resolved && (
                    <button 
                      onClick={() => handleResolveAlert(a.id)} 
                      className="btn btn-success"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Resolve
                    </button>
                  )}
                  <span style={{ 
                    fontSize: 14, 
                    color: "var(--text-secondary)", 
                    transform: expandedAlertId === a.id ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                    padding: 4,
                    cursor: "pointer"
                  }}
                  onClick={() => toggleExpand(a.id)}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {expandedAlertId === a.id && (
                <div style={{ 
                  padding: "0 18px 18px 18px", 
                  borderTop: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-hover)",
                  fontSize: 14,
                  lineHeight: 1.6
                }}>
                  <div style={{ marginTop: 14 }}>
                    <strong>Detailed Log:</strong>
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
                    {a.type === "email" && " Compromised email accounts allow malicious actors to perform credential stuffing attacks on other platforms where you might share passwords. Reset your passwords instantly."}
                    {a.type === "domain" && " Expiring SSL certificates block inbound HTTPS traffic, causing web browsers to flag your site as insecure, disrupting user traffic and damaging brand trust."}
                    {a.type === "github" && " Hardcoded repository tokens or AWS credentials grant access to systems, leaving servers open to data theft, service injection, and heavy cloud computing costs."}
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
