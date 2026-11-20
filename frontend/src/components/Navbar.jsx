import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "./ThemeToggle";

const links = [
  { to: "/app", label: "Dashboard", icon: "▦", end: true },
  { to: "/app/assets/new", label: "Add Asset", icon: "+" },
  { to: "/app/alerts", label: "Alert Feed", icon: "△" },
];

export default function Navbar({ openAlertsCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderLinks = (mobile = false) => links.map(({ to, label, icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => `${mobile ? "mobile-nav-link" : "nav-link"}${isActive ? " active" : ""}`}
    >
      <span className={mobile ? "nav-link-content mobile-link-content" : "nav-link-content"}>
        <span className="nav-icon" aria-hidden="true">{icon}</span>
        <span>{mobile && label === "Alert Feed" ? "Alerts" : label}</span>
      </span>
      {label === "Alert Feed" && openAlertsCount > 0 && (
        <span className={mobile ? "mobile-badge" : "nav-badge"}>{openAlertsCount}</span>
      )}
    </NavLink>
  ));

  return (
    <>
      <aside className="sidebar">
        <Link to="/" className="brand" title="SentryWatch Home">
          <div className="brand-icon">S</div>
          <span className="brand-name">SentryWatch</span>
        </Link>

        <nav className="nav-menu" aria-label="Main navigation">
          {renderLinks()}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-theme-row">
            <span>Theme:</span>
            <ThemeToggle />
          </div>
          <span className="user-email-text" title={user?.email}>{user?.email || "Signed in"}</span>
          <button type="button" className="sign-out-button" onClick={signOut}>
            Sign out &rarr;
          </button>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {renderLinks(true)}
      </nav>
    </>
  );
}
