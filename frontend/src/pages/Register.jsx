import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../utils/storage";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8 || password.length > 72) {
      setError("Password must be between 8 and 72 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create your account."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="card auth-card">
        <div className="brand auth-brand"><div className="brand-icon">S</div><span className="brand-name">SentryWatch</span></div>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Set up an account to start monitoring your assets.</p>
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="register-email">Email address</label>
          <input id="register-email" className="form-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="form-label" htmlFor="register-password">Password</label>
          <input id="register-password" className="form-input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} />
          <p className="form-hint">Use 8–72 characters.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
