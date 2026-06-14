import { useState } from "react";
import { deleteAsset, saveAlert, updateAsset, getAlerts } from "../utils/storage";
import { checkSSL } from "../services/sslService";
import { scanGitHubOrg } from "../services/githubService";
import { checkHIBP } from "../services/hibpService";

function Dashboard({ assets, setAssets }) {
  const [expanded, setExpanded] = useState({});

  const alerts = getAlerts();
  const totalAssets = assets.length;
  const totalAlerts = alerts.length;
  const highRisk = alerts.filter(a => a.severity === "HIGH" && !a.resolved).length;
  const lastScan = assets.reduce((acc, a) => {
    if (!a.lastScan) return acc;
    const d = new Date(a.lastScan);
    return !acc || d > acc ? d : acc;
  }, null);
  const handleScan = async (asset) => {
      // Domain SSL scan
    if (asset.domain) {
      try {
        const res = await checkSSL(asset.domain);

        if (!res) {
          window.alert(`Could not fetch certificate info for ${asset.domain}`);
          return;
        }

        if (typeof res.daysLeft === "number" && res.daysLeft <= 22) {
          saveAlert({
            severity: "HIGH",
            message: `SSL certificate for ${asset.domain} expires in ${res.daysLeft} days`,
            source: asset.domain,
          });

          window.alert(`HIGH alert created: ${asset.domain} expires in ${res.daysLeft} days`);
        } else {
          window.alert(`SSL OK for ${asset.domain}: ${res.daysLeft} days left`);
        }

        // persist last scan
        updateAsset(asset.id, { lastScan: new Date().toISOString(), lastScanResult: res });
        setAssets(getAssets());
      } catch (err) {
        console.error(err);
        window.alert("Error during SSL scan. See console for details.");
      }

      return;
    }

    // Email breach check via HaveIBeenPwned
    if (asset.email) {
      try {
        const breaches = await checkHIBP(asset.email);

        if (breaches && breaches.length > 0) {
          const names = breaches.map(b => b.Name).join(", ");
          saveAlert({
            severity: breaches.length > 1 ? "HIGH" : "MEDIUM",
            message: `${asset.email} found in ${breaches.length} breach(es): ${names}`,
            source: asset.email,
          });

          window.alert(`Alert: ${asset.email} found in ${breaches.length} breach(es)`);
        } else {
          window.alert(`${asset.email} not found in known breaches (or API key not set).`);
        }

        updateAsset(asset.id, { lastScan: new Date().toISOString(), lastScanResult: breaches });
        setAssets(getAssets());
      } catch (err) {
        console.error(err);
        window.alert("Error during HIBP scan. See console for details.");
      }

      return;
    }

    // GitHub org secret scan
    if (asset.githubOrg) {
      try {
        const findings = await scanGitHubOrg(asset.githubOrg);

        if (findings && findings.length > 0) {
          findings.forEach(f => {
            saveAlert({
              severity: "HIGH",
              message: `Potential secret in ${f.repository}/${f.path} (pattern: ${f.pattern})`,
              source: `${asset.githubOrg}`,
            });
          });

          window.alert(`Found ${findings.length} potential secret(s) in ${asset.githubOrg}. Alerts created.`);
        } else {
          window.alert(`No likely secrets found for ${asset.githubOrg}.`);
        }

        updateAsset(asset.id, { lastScan: new Date().toISOString(), lastScanResult: findings });
        setAssets(getAssets());
      } catch (err) {
        console.error(err);
        window.alert("Error during GitHub scan. See console for details.");
      }

      return;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Total Assets</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalAssets}</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Total Alerts</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalAlerts}</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>High Risk</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: highRisk > 0 ? '#ef4444' : '#10b981' }}>{highRisk}</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 240 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Last Scan</div>
          <div style={{ fontSize: 14 }}>{lastScan ? lastScan.toLocaleString() : 'Never'}</div>
        </div>
      </div>

      <h1>Dashboard</h1>

      {assets.length === 0 ? (
        <p>No assets found.</p>
      ) : (
        <table border="1">
          <thead>
            <tr>
                  <th>Email</th>
                  <th>Domain</th>
                  <th>GitHub Org</th>
                  <th>Last Scan</th>
                  <th>Actions</th>

                </tr>
          </thead>

          <tbody>
            {assets.map((asset) => (
              <>
                <tr key={asset.id}>
                  <td>{asset.email}</td>
                  <td>{asset.domain}</td>
                  <td>{asset.githubOrg}</td>
                  <td>{asset.lastScan ? new Date(asset.lastScan).toLocaleString() : '-'}</td>
                  <td>
                    <button onClick={() => handleScan(asset)}>Scan</button>
                    &nbsp;
                    <button onClick={() => setExpanded(prev => ({ ...prev, [asset.id]: !prev[asset.id] }))}>{expanded[asset.id] ? 'Hide' : 'View'}</button>
                    &nbsp;
                    <button onClick={() => {
          deleteAsset(asset.id);

          setAssets(
            assets.filter(
              (a) => a.id !== asset.id
            )
          );
        }}
      >
        Delete</button>
                  </td>
                </tr>

                {expanded[asset.id] && (
                  <tr key={asset.id+"-res"}>
                    <td colSpan={5}>
                      <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 6 }}>{JSON.stringify(asset.lastScanResult || { }, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;