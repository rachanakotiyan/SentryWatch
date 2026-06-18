import { useState } from "react";
import { deleteAsset, getAssets, getAlerts, saveAlert, updateAsset } from "../utils/storage";
import { checkHIBP } from "../services/hibpService";
import { checkSSL } from "../services/sslService";
import { scanGitHubOrg } from "../services/githubService";

export default function Dashboard({ 
  assets, 
  refreshData, 
  resolvedThisSession, 
  navigateToScanResult, 
  navigateToTab 
}) {
  const [scanningIds, setScanningIds] = useState({});
  const alerts = getAlerts();

  // Metric computations
  const totalAssets = assets.length;
  const activeAlerts = alerts.filter(a => !a.resolved);
  const openAlertsCount = activeAlerts.length;
  
  const criticalAlertsCount = activeAlerts.filter(a => a.severity === "CRITICAL").length;
  const highAlertsCount = activeAlerts.filter(a => a.severity === "HIGH").length;
  const mediumAlertsCount = activeAlerts.filter(a => a.severity === "MEDIUM").length;

  const handleIndividualScan = async (asset) => {
    setScanningIds(prev => ({ ...prev, [asset.id]: true }));
    try {
      let findings = [];
      const value = asset.value || asset.email || asset.domain || asset.githubOrg;

      if (asset.type === "email" || asset.email) {
        findings = await checkHIBP(value || asset.email);
      } else if (asset.type === "domain" || asset.domain) {
        findings = await checkSSL(value || asset.domain);
      } else if (asset.type === "github" || asset.githubOrg) {
        findings = await scanGitHubOrg(value || asset.githubOrg);
      }

      // 1. Remove previous alerts for this asset
      const allCurrentAlerts = getAlerts();
      const filteredAlerts = allCurrentAlerts.filter(a => a.assetId !== asset.id);
      localStorage.setItem("sw_alerts", JSON.stringify(filteredAlerts));

      // 2. Save new alerts
      const savedAlertsList = [];
      for (const finding of findings) {
        const saved = saveAlert({
          ...finding,
          assetId: asset.id,
          source: value
        });
        savedAlertsList.push(saved);
      }

      // 3. Update asset
      updateAsset(asset.id, {
        lastScan: new Date().toISOString(),
        lastScanResult: savedAlertsList
      });

    } catch (err) {
      console.error("Dashboard scan failed for asset", asset.id, err);
    } finally {
      setScanningIds(prev => ({ ...prev, [asset.id]: false }));
      refreshData();
    }
  };

  const handleDeleteAsset = (id) => {
    if (window.confirm("Are you sure you want to stop monitoring this asset? Associated alert logs will also be permanently deleted.")) {
      deleteAsset(id);
      refreshData();
    }
  };

  // Helper to determine asset threat level and risk dot color
  const getAssetRiskInfo = (assetId) => {
    const assetAlerts = activeAlerts.filter(a => a.assetId === assetId);
    if (assetAlerts.length === 0) {
      return { color: "risk-green", label: "Clean", textColor: "var(--severity-clean)" };
    }
    
    const hasCriticalOrHigh = assetAlerts.some(a => a.severity === "CRITICAL" || a.severity === "HIGH");
    if (hasCriticalOrHigh) {
      return { color: "risk-red", label: "High Risk", textColor: "var(--severity-critical)" };
    }
    
    return { color: "risk-amber", label: "Medium Risk", textColor: "var(--severity-high)" };
  };

  const formatLastScan = (isoString) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="anim-fade-in" style={{ textAlign: "left" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 4 }}>Security Overview</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Real-time analysis of digital leaks, SSL certificate lifecycles, and code credential warnings.
        </p>
      </header>

      {/* Top Stat Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 20,
        marginBottom: 36
      }}>
        {/* Card 1: Assets */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Assets Monitored</span>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-heading)" }}>{totalAssets}</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Active endpoints</span>
        </div>

        {/* Card 2: Open Alerts */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Open Alerts</span>
          <span style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            fontFamily: "var(--font-heading)",
            color: openAlertsCount > 0 ? "var(--severity-high)" : "var(--severity-clean)"
          }}>
            {openAlertsCount}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Requires action</span>
        </div>

        {/* Card 3: Critical Alerts */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Critical Threats</span>
          <span style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            fontFamily: "var(--font-heading)",
            color: criticalAlertsCount > 0 ? "var(--severity-critical)" : "inherit"
          }}>
            {criticalAlertsCount}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Immediate attention</span>
        </div>

        {/* Card 4: Resolved Session */}
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Resolved This Session</span>
          <span style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            fontFamily: "var(--font-heading)",
            color: resolvedThisSession > 0 ? "var(--severity-clean)" : "inherit"
          }}>
            {resolvedThisSession}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Session corrections</span>
        </div>
      </div>

      {/* Empty State Block */}
      {totalAssets === 0 ? (
        <div className="card empty-state" style={{ padding: "60px 24px" }}>
          <div className="empty-icon" style={{ fontSize: 56 }}>🛡️</div>
          <h2 className="empty-title" style={{ fontSize: 20 }}>No assets yet — add one to start monitoring</h2>
          <p className="empty-desc" style={{ fontSize: 15, marginBottom: 24 }}>
            Begin protecting your assets by configuring an email, domain, or GitHub account for threat scans.
          </p>
          <button className="btn btn-primary" onClick={() => navigateToTab("add-asset")}>
            Register First Asset
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start"
        }}>
          {/* Left: Assets Grid List */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Monitored Assets</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {assets.map((asset) => {
                const assetValue = asset.value || asset.email || asset.domain || asset.githubOrg;
                const risk = getAssetRiskInfo(asset.id);
                const isScanning = !!scanningIds[asset.id];
                
                return (
                  <div key={asset.id} className="card" style={{ 
                    padding: "16px 20px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 16
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Asset Type Icon representation */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: "var(--bg-hover)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18
                      }}>
                        {asset.type === "email" || asset.email ? "✉️" : ""}
                        {asset.type === "domain" || asset.domain ? "🌐" : ""}
                        {asset.type === "github" || asset.githubOrg ? "🐙" : ""}
                      </div>
                      
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{assetValue}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginTop: 4 }}>
                          <span className={`risk-indicator ${risk.color}`} style={{ margin: 0 }}></span>
                          <span style={{ color: risk.textColor, fontWeight: 600 }}>{risk.label}</span>
                          <span style={{ color: "var(--text-muted)" }}>•</span>
                          <span style={{ color: "var(--text-secondary)" }}>Scan: {formatLastScan(asset.lastScan)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: "6px 12px", fontSize: 13 }}
                        onClick={() => handleIndividualScan(asset)}
                        disabled={isScanning}
                      >
                        {isScanning ? (
                          <span>Scanning...</span>
                        ) : (
                          <span>Scan</span>
                        )}
                      </button>
                      
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: "6px 12px", fontSize: 13 }}
                        onClick={() => navigateToScanResult(asset.id)}
                      >
                        View
                      </button>
                      
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live alerts feed */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Recent Alerts</h2>
              {alerts.length > 0 && (
                <button 
                  style={{ background: "none", border: "none", color: "var(--severity-low)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  onClick={() => navigateToTab("alerts")}
                >
                  View All
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No threat warnings recorded.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="card" style={{ 
                    padding: 14, 
                    fontSize: 13, 
                    borderLeft: `3px solid var(--severity-${alert.severity.toLowerCase()})`,
                    opacity: alert.resolved ? 0.6 : 1
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <span className={`badge badge-${alert.severity.toLowerCase()}`} style={{ fontSize: 9, padding: "2px 5px" }}>
                        {alert.severity}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {formatLastScan(alert.timestamp)}
                      </span>
                    </div>
                    
                    <div style={{ 
                      fontWeight: 600, 
                      color: "var(--text-primary)", 
                      marginBottom: 2,
                      textDecoration: alert.resolved ? "line-through" : "none"
                    }}>
                      {alert.title}
                    </div>
                    
                    <div style={{ color: "var(--text-secondary)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Source: {alert.foundAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}