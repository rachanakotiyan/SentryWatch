import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AddAsset from "./pages/AddAsset";
import Alerts from "./pages/Alerts";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ScanResult from "./pages/ScanResult";
import { getAlerts, getAssets, getErrorMessage } from "./utils/storage";

function AppShell() {
  const [assets, setAssets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resolvedThisSession, setResolvedThisSession] = useState(() => {
    const count = Number(sessionStorage.getItem("sw_resolved_this_session"));
    return Number.isFinite(count) ? count : 0;
  });

  const refreshData = useCallback(async () => {
    const [nextAssets, nextAlerts] = await Promise.all([getAssets(), getAlerts()]);
    setAssets(nextAssets);
    setAlerts(nextAlerts);
    setLoadError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getAssets(), getAlerts()])
      .then(([nextAssets, nextAlerts]) => {
        if (!active) return;
        setAssets(nextAssets);
        setAlerts(nextAlerts);
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error, "Unable to load your monitoring data."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const incrementResolved = () => {
    setResolvedThisSession((current) => {
      const next = current + 1;
      sessionStorage.setItem("sw_resolved_this_session", String(next));
      return next;
    });
  };

  const openAlertsCount = alerts.filter((alert) => !alert.resolved).length;

  return (
    <div className="app-container">
      <Navbar openAlertsCount={openAlertsCount} />
      <main className="main-content">
        {loadError && <div className="notice notice-error" role="alert">{loadError}</div>}
        {loading ? (
          <div className="card loading-card" role="status">Loading your SentryWatch workspace...</div>
        ) : (
          <Outlet context={{
            assets,
            alerts,
            refreshData,
            resolvedThisSession,
            incrementResolved,
          }} />
        )}
      </main>
    </div>
  );
}

function RoutedDashboard() {
  const { assets, alerts, refreshData, resolvedThisSession } = useOutletContext();
  return (
    <Dashboard
      assets={assets}
      alerts={alerts}
      refreshData={refreshData}
      resolvedThisSession={resolvedThisSession}
    />
  );
}

function RoutedAddAsset() {
  const { refreshData } = useOutletContext();
  return <AddAsset refreshData={refreshData} />;
}

function RoutedAlerts() {
  const { assets, alerts, refreshData, incrementResolved } = useOutletContext();
  return <Alerts assets={assets} alerts={alerts} refreshData={refreshData} incrementResolved={incrementResolved} />;
}

function RoutedScanResult() {
  const { assets, alerts, refreshData } = useOutletContext();
  return <ScanResult assets={assets} alerts={alerts} refreshData={refreshData} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<RoutedDashboard />} />
              <Route path="assets/new" element={<RoutedAddAsset />} />
              <Route path="assets/:assetId" element={<RoutedScanResult />} />
              <Route path="alerts" element={<RoutedAlerts />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
