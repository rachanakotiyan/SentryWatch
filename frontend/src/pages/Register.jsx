import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../utils/storage";
import ThemeToggle from "../components/ThemeToggle";
import Footer from "../components/Footer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 8 || password.length > 72) {
      errs.password = "Password must be 8–72 characters.";
    }
    return errs;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setError("");
    setSubmitting(true);

    try {
      await register(email.trim(), password);
      navigate("/app", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create your account."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <header className="auth-header-bar">
        <Link to="/" className="brand">
          <div className="brand-icon">S</div>
          <span className="brand-name">SentryWatch</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="auth-page">
        <section className="card auth-card">
          <div className="brand auth-brand">
            <div className="brand-icon">S</div>
            <span className="brand-name">SentryWatch</span>
          </div>

          <h1>Create account</h1>
          <p className="auth-subtitle">Set up a security analyst workspace to monitor perimeter exposure.</p>

          {user && (
            <div className="notice notice-info" role="status">
              You are currently signed in as <strong>{user.email}</strong>.
              <div style={{ marginTop: 8 }}>
                <Link to="/app" className="btn btn-primary btn-sm">Go to dashboard</Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                className={`form-input${fieldErrors.email ? " input-error" : ""}`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="analyst@company.com"
                required
                aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
              />
              {fieldErrors.email && (
                <span id="reg-email-error" className="field-error-text" role="alert">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="register-password"
                  className={`form-input${fieldErrors.password ? " input-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="8–72 characters"
                  required
                  aria-describedby="password-rules"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p id="password-rules" className="form-hint">Use 8–72 characters. Encrypted with bcrypt.</p>
              {fieldErrors.password && (
                <span className="field-error-text" role="alert">{fieldErrors.password}</span>
              )}
            </div>

            {error && <div className="notice notice-error" role="alert">{error}</div>}

            <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>

      <Footer slim />
    </div>
  );
}
