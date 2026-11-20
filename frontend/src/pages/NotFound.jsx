import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "../components/ThemeToggle";
import Footer from "../components/Footer";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="not-found-page">
      <header className="auth-header-bar">
        <Link to="/" className="brand">
          <div className="brand-icon">S</div>
          <span className="brand-name">SentryWatch</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="not-found-main">
        <div className="card not-found-card">
          <div className="not-found-code">404</div>
          <h1 className="not-found-title">Target Not Located</h1>
          <p className="not-found-desc">
            The security perimeter route you requested does not exist or has been relocated.
          </p>
          <div className="not-found-actions">
            {user ? (
              <Link to="/app" className="btn btn-primary">Return to Dashboard</Link>
            ) : (
              <Link to="/" className="btn btn-primary">Return to Home</Link>
            )}
            <Link to="/login" className="btn btn-secondary">Sign In</Link>
          </div>
        </div>
      </main>

      <Footer slim />
    </div>
  );
}
