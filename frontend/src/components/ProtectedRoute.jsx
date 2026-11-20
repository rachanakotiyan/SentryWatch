import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute() {
  const { user, loading, authError } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading" role="status">Checking your session...</div>;
  }

  if (authError) {
    return (
      <main className="auth-page">
        <section className="card auth-card">
          <h1>Session check failed</h1>
          <p className="form-error" role="alert">{authError}</p>
          <Link className="btn btn-primary auth-submit" to="/login">Go to sign in</Link>
        </section>
      </main>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
