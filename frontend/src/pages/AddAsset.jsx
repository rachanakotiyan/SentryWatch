import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createAsset, getErrorMessage } from "../utils/storage";

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
      const asset = await createAsset({ type, target: target.trim(), ...(name.trim() ? { name: name.trim() } : {}) });
      await refreshData();
      navigate(`/assets/${asset.id}`, { state: { scanImmediately: true, from: location.pathname } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not add this asset."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="anim-fade-in add-asset-page">
      <header className="page-heading">
        <h1>Monitor an asset</h1>
        <p>Register an email, domain, or GitHub repository to start monitoring its exposure.</p>
      </header>
      <section className="card add-asset-card">
        <div className="asset-type-tabs" role="tablist" aria-label="Asset type">
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
            {type === "EMAIL" && "Checks breach exposure. Email scanning requires a configured HIBP API key."}
            {type === "DOMAIN" && "Enter a domain name or an HTTP(S) URL to check its certificate exposure."}
            {type === "REPOSITORY" && "Enter a repository as owner/repository or paste its GitHub URL."}
          </p>
          <label className="form-label" htmlFor="asset-name">Display name <span className="optional-label">(optional)</span></label>
          <input
            id="asset-name"
            className="form-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production website"
            maxLength={120}
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={!target.trim() || submitting}>
            {submitting ? "Adding asset..." : "Add asset and scan"}
          </button>
        </form>
      </section>
    </div>
  );
}
