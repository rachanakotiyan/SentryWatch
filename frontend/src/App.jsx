import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import Navbar from "./components/Navbar";
import AppHeader from "./components/AppHeader";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/Toast";
import DemoBanner from "./components/DemoBanner";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddAsset from "./pages/AddAsset";
import ScanResult from "./pages/ScanResult";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";
import { getAlerts, getAssets, getErrorMessage, getHealth } from "./utils/storage";

function AppShell() {
  const [assets, setAssets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [dismissedDemo, setDismissedDemo] = useState(false);
  const [resolvedThisSession, setResolvedThisSession] = useState(() => {
    try {
      const count = Number(sessionStorage.getItem("sw_resolved_this_session"));
      return Number.isFinite(count) ? count : 0;
    } catch {
      return 0;
    }
  });

  const refreshData = useCallback(async () => {
    try {
      const [nextAssets, nextAlerts, health] = await Promise.all([
        getAssets(),
        getAlerts(),
        getHealth(),
      ]);
      setAssets(nextAssets);
      setAlerts(nextAlerts);
      if (health?.demoMode) {
        setDemoMode(true);
      }
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Unable to refresh workspace data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getAssets(), getAlerts(), getHealth()])
      .then(([nextAssets, nextAlerts, health]) => {
        if (!active) return;
        setAssets(nextAssets);
        setAlerts(nextAlerts);
        if (health?.demoMode) {
          setDemoMode(true);
        }
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
      try {
        sessionStorage.setItem("sw_resolved_this_session", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const openAlertsCount = alerts.filter((alert) => !alert.resolved).length;

  return (
    <div className="app-container">
      <Navbar openAlertsCount={openAlertsCount} />
      <div className="app-main-column">
        <AppHeader demoMode={demoMode} />

        {demoMode && !dismissedDemo && (
          <div className="app-banner-container">
            <DemoBanner onDismiss={() => setDismissedDemo(true)} />
          </div>
        )}

        <main className="main-content">
          {loadError && (
            <div className="notice notice-error" role="alert">
              <span>{loadError}</span>
              <button
                type="button"
                className="btn-link-retry"
                onClick={() => { setLoadError(""); refreshData(); }}
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="card loading-card" role="status">
              <div className="spinner-inline" aria-hidden="true" />
              <p style={{ marginTop: 12 }}>Loading your SentryWatch perimeter workspace...</p>
            </div>
          ) : (
            <Outlet context={{
              assets,
              alerts,
              refreshData,
              resolvedThisSession,
              incrementResolved,
              demoMode,
            }} />
          )}
        </main>

        <Footer slim />
      </div>
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
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Toast />
            <Routes>
              {/* Public landing page */}
              <Route path="/" element={<Landing />} />

              {/* Public Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected App Workspace */}
              <Route path="/app" element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<RoutedDashboard />} />
                  <Route path="assets/new" element={<RoutedAddAsset />} />
                  <Route path="assets/:assetId" element={<RoutedScanResult />} />
                  <Route path="alerts" element={<RoutedAlerts />} />
                </Route>
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
