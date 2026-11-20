import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "./ThemeToggle";

export default function AppHeader({ demoMode }) {
  const { user } = useAuth();
  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/app") return "Dashboard";
    if (path === "/app/assets/new") return "Add Monitored Asset";
    if (path.startsWith("/app/assets/")) return "Asset Telemetry & Findings";
    if (path === "/app/alerts") return "Vulnerability & Leak Alerts";
    return "Workspace";
  };

  return (
    <header className="app-top-header">
      <div className="header-breadcrumbs">
        <span className="crumb-root">SentryWatch</span>
        <span className="crumb-separator">/</span>
        <span className="crumb-current">{getBreadcrumbs()}</span>
      </div>

      <div className="header-right-actions">
        {demoMode && (
          <span className="demo-pill" title="Email scans return mock findings because no HIBP key is set">
            <span className="demo-pill-dot" />
            DEMO MODE
          </span>
        )}

        <ThemeToggle />

        <div className="user-profile-chip" title={`Signed in as ${user?.email || "Analyst"}`}>
          <div className="user-avatar">{user?.email ? user.email[0].toUpperCase() : "U"}</div>
          <span className="user-role-badge">ANALYST</span>
        </div>

        <Link to="/" className="view-landing-btn" title="View Public Landing Page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
