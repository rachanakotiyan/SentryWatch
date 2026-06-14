import { useState } from "react";
import { getAlerts, deleteAlert, resolveAlert } from "../utils/storage";

const severityColor = (s) => {
  if (!s) return "#6b7280"; // gray
  if (s === "HIGH") return "#ef4444"; // red
  if (s === "MEDIUM") return "#f59e0b"; // amber
  return "#10b981"; // green for LOW
};

export default function Alerts() {
  const [alerts, setAlerts] = useState(getAlerts());

  const refresh = () => setAlerts(getAlerts());

  const handleResolve = (id) => {
    resolveAlert(id);
    refresh();
  };

  const handleDelete = (id) => {
    deleteAlert(id);
    refresh();
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div>
        <h2>Alerts</h2>
        <p>No Alerts Found</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Alerts</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map((a) => (
          <div key={a.id} style={{ border: "1px solid #e5e7eb", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: 4, background: severityColor(a.severity) }} />
              <div>
                <div style={{ fontWeight: 600 }}>{a.message}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{a.source} • {new Date(a.timestamp).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {!a.resolved && (
                <button onClick={() => handleResolve(a.id)} style={{ background: "#10b981", color: "white", border: "none", padding: "6px 10px", borderRadius: 6 }}>Resolve</button>
              )}
              <button onClick={() => handleDelete(a.id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 10px", borderRadius: 6 }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
