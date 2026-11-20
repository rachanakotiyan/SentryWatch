import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../utils/storage";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to sign in. Check your email and password."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="card auth-card">
        <div className="brand auth-brand"><div className="brand-icon">S</div><span className="brand-name">SentryWatch</span></div>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to monitor your digital exposure.</p>
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="login-email">Email address</label>
          <input id="login-email" className="form-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="form-label" htmlFor="login-password">Password</label>
          <input id="login-password" className="form-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">New to SentryWatch? <Link to="/register">Create an account</Link></p>
      </section>
    </main>
  );
}
