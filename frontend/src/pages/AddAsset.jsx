import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createAsset, getErrorMessage } from "../utils/storage";
import { useToast } from "../context/useToast";

const types = [
  { value: "EMAIL", label: "Email Address", placeholder: "security-team@company.com" },
  { value: "DOMAIN", label: "Domain / URL", placeholder: "company.com or https://company.com" },
  { value: "REPOSITORY", label: "GitHub Repository", placeholder: "owner/repository or github.com/owner/repository" },
];

function validateTarget(type, input) {
  const target = input.trim();
  if (!target) return "This field is required.";

  if (type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    return "Enter a valid email address.";
  }

  if (type === "DOMAIN") {
    try {
      const url = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) {
        return "Enter a valid domain or HTTP(S) URL.";
      }
    } catch {
      return "Enter a valid domain or HTTP(S) URL.";
    }
  }

  if (type === "REPOSITORY") {
    let path = target;
    if (/^https?:\/\//i.test(path)) {
      try {
        const url = new URL(path);
        if (url.hostname.toLowerCase() !== "github.com") return "Enter a GitHub repository URL or owner/repository.";
        path = url.pathname.replace(/^\/|\/$/g, "");
      } catch {
        return "Enter a valid GitHub repository URL or owner/repository.";
      }
    } else {
      path = path.replace(/^github\.com\//i, "").replace(/\/$/g, "");
    }
    const parts = path.replace(/\.git$/i, "").split("/");
    if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) {
      return "Enter a repository as owner/repository or a GitHub repository URL.";
    }
  }

  return "";
}

export default function AddAsset({ refreshData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [type, setType] = useState("EMAIL");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedType = types.find((item) => item.value === type);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateTarget(type, target);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const asset = await createAsset({
        type,
        target: target.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      showToast(`Asset ${asset.name || asset.target} added successfully. Starting initial scan...`, "success");
      await refreshData();
      navigate(`/app/assets/${asset.id}`, { state: { scanImmediately: true, from: location.pathname } });
    } catch (requestError) {
      const msg = getErrorMessage(requestError, "Could not add this asset.");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="anim-fade-in add-asset-page">
      <header className="page-heading">
        <div className="page-heading-row">
          <div>
            <h1>Register monitored asset</h1>
            <p>Add a domain, corporate email address, or GitHub repository to external attack surface tracking.</p>
          </div>
          <Link to="/app" className="btn btn-secondary">
            &larr; Back to dashboard
          </Link>
        </div>
      </header>

      <section className="card add-asset-card">
        <div className="asset-type-tabs" role="tablist" aria-label="Asset type selection">
          {types.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={type === item.value}
              className={`asset-type-tab${type === item.value ? " active" : ""}`}
              onClick={() => { setType(item.value); setError(""); }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="asset-target">{selectedType.label}</label>
            <input
              id="asset-target"
              className="form-input"
              type={type === "EMAIL" ? "email" : "text"}
              value={target}
              onChange={(event) => { setTarget(event.target.value); setError(""); }}
              placeholder={selectedType.placeholder}
              autoFocus
              required
            />
            <p className="form-hint">
              {type === "EMAIL" && "Checks against public data breach databases (free XposedOrNot lookup, or HIBP if a key is set)."}
              {type === "DOMAIN" && "Inspects certificate trust, validity window, and RSA bit length over live port 443 TLS handshake."}
              {type === "REPOSITORY" && "Inspects public git trees for tracked secrets, private keys, and environment files without cloning."}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="asset-name">
              Friendly Display Name <span className="optional-label">(optional)</span>
            </label>
            <input
              id="asset-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Production API Gateway"
              maxLength={120}
            />
          </div>

          {error && <div className="notice notice-error" role="alert">{error}</div>}

          <div className="form-actions-row">
            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={!target.trim() || submitting}
            >
              {submitting ? "Registering & initiating scan..." : "Add asset and scan now"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
