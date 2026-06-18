import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import AddAsset from "./pages/AddAsset";
import Alerts from "./pages/Alerts";
import ScanResult from "./pages/ScanResult";
import { getAssets, getAlerts } from "./utils/storage";

function App() {
  const [currentTab, setCurrentTab] = useState("dashboard"); // dashboard, add-asset, alerts, scan-result
  const [activeAssetId, setActiveAssetId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  // Track resolved count this session (using sessionStorage to persist across refreshes)
  const [resolvedThisSession, setResolvedThisSession] = useState(() => {
    const val = sessionStorage.getItem("sw_resolved_this_session");
    return val ? parseInt(val, 10) : 0;
  });

  // Load and sync data initially and define a central refresh mechanism
  const refreshData = () => {
    setAssets(getAssets());
    setAlerts(getAlerts());
  };

  useEffect(() => {
    refreshData();
    
    // Periodically sync to handle other tab/refresh events if any
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  const incrementResolvedThisSession = () => {
    setResolvedThisSession(prev => {
      const next = prev + 1;
      sessionStorage.setItem("sw_resolved_this_session", next.toString());
      return next;
    });
  };

  const openAlertsCount = alerts.filter(a => !a.resolved).length;

  const navigateToScanResult = (assetId) => {
    setActiveAssetId(assetId);
    setCurrentTab("scan-result");
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation - Desktop */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span className="brand-name">SentryWatch</span>
        </div>
        
        <nav className="nav-menu">
          <li className="nav-item">
            <button 
              className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentTab('dashboard')}
            >
              <div className="nav-link-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Dashboard</span>
              </div>
            </button>
          </li>
          
          <li className="nav-item">
            <button 
              className={`nav-link ${currentTab === 'add-asset' ? 'active' : ''}`}
              onClick={() => setCurrentTab('add-asset')}
            >
              <div className="nav-link-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span>Add Asset</span>
              </div>
            </button>
          </li>
          
          <li className="nav-item">
            <button 
              className={`nav-link ${currentTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setCurrentTab('alerts')}
            >
              <div className="nav-link-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Alert Feed</span>
              </div>
              {openAlertsCount > 0 && <span className="nav-badge">{openAlertsCount}</span>}
            </button>
          </li>
        </nav>
        
        <div className="sidebar-footer">
          <div>SentryWatch Sentinel v1.0</div>
          <div>Local Persistence Mode</div>
        </div>
      </aside>

      {/* Bottom Navigation - Mobile */}
      <nav className="mobile-nav">
        <button 
          className={`mobile-nav-link ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Dashboard</span>
        </button>
        
        <button 
          className={`mobile-nav-link ${currentTab === 'add-asset' ? 'active' : ''}`}
          onClick={() => setCurrentTab('add-asset')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Add Asset</span>
        </button>
        
        <button 
          className={`mobile-nav-link ${currentTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setCurrentTab('alerts')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Alerts</span>
          {openAlertsCount > 0 && <span className="mobile-badge">{openAlertsCount}</span>}
        </button>
      </nav>

      {/* Main Content Pane */}
      <main className="main-content">
        {currentTab === 'dashboard' && (
          <Dashboard 
            assets={assets} 
            refreshData={refreshData}
            resolvedThisSession={resolvedThisSession}
            navigateToScanResult={navigateToScanResult}
            navigateToTab={setCurrentTab}
          />
        )}
        
        {currentTab === 'add-asset' && (
          <AddAsset 
            refreshData={refreshData}
            navigateToScanResult={navigateToScanResult}
          />
        )}
        
        {currentTab === 'alerts' && (
          <Alerts 
            alerts={alerts}
            refreshData={refreshData}
            incrementResolved={incrementResolvedThisSession}
          />
        )}
        
        {currentTab === 'scan-result' && (
          <ScanResult 
            assetId={activeAssetId}
            refreshData={refreshData}
            navigateTo={setCurrentTab}
            navigateToScanResult={navigateToScanResult}
          />
        )}
      </main>
    </div>
  );
}

export default App;