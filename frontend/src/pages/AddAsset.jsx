import { useState } from "react";
import { saveAsset } from "../utils/storage";

export default function AddAsset({ refreshData, navigateToScanResult }) {
  const [activeTab, setActiveTab] = useState("email"); // email, domain, github
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  const githubRegex = /^[a-zA-Z0-9-]{1,39}$/; // GitHub username: max 39 chars, alphanumeric, hyphens

  const validate = (type, val) => {
    if (!val) {
      return "This field is required";
    }
    
    const trimmedVal = val.trim();
    if (type === "email") {
      if (!emailRegex.test(trimmedVal)) {
        return "Please enter a valid email address (e.g. user@company.com)";
      }
    } else if (type === "domain") {
      if (!domainRegex.test(trimmedVal)) {
        return "Please enter a valid domain (e.g. company.com)";
      }
    } else if (type === "github") {
      if (!githubRegex.test(trimmedVal)) {
        return "Valid characters: letters, numbers, and hyphens (max 39 characters)";
      }
    }
    return "";
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (val) {
      setError(validate(activeTab, val));
    } else {
      setError("");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setInputValue("");
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate(activeTab, inputValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const assetToSave = {
        type: activeTab,
        value: inputValue.trim(),
        email: activeTab === "email" ? inputValue.trim() : null,
        domain: activeTab === "domain" ? inputValue.trim() : null,
        githubOrg: activeTab === "github" ? inputValue.trim() : null,
      };

      const savedAsset = saveAsset(assetToSave);
      refreshData();
      
      // Navigate directly to the scan result page for this asset to run the initial scan
      navigateToScanResult(savedAsset.id);
    } catch (err) {
      console.error(err);
      setError("Failed to save asset. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="anim-fade-in" style={{ maxWidth: 580, margin: "0 auto", padding: "10px 0" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Monitor Asset</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
          Register a digital asset to monitor external leaks, compromised credentials, and SSL security vulnerabilities.
        </p>
      </header>

      <div className="card" style={{ padding: 32 }}>
        {/* Tab Selector */}
        <div style={{
          display: "flex",
          backgroundColor: "var(--bg-hover)",
          padding: 4,
          borderRadius: 8,
          border: "1px solid var(--border-color)",
          marginBottom: 28
        }}>
          <button
            type="button"
            className="tab-btn"
            style={{
              flex: 1,
              background: activeTab === "email" ? "var(--bg-panel)" : "none",
              border: "none",
              padding: "10px 16px",
              fontWeight: activeTab === "email" ? 600 : 500,
              fontSize: 14,
              color: activeTab === "email" ? "var(--text-primary)" : "var(--text-secondary)",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow: activeTab === "email" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s ease"
            }}
            onClick={() => handleTabChange("email")}
          >
            Email Address
          </button>
          
          <button
            type="button"
            className="tab-btn"
            style={{
              flex: 1,
              background: activeTab === "domain" ? "var(--bg-panel)" : "none",
              border: "none",
              padding: "10px 16px",
              fontWeight: activeTab === "domain" ? 600 : 500,
              fontSize: 14,
              color: activeTab === "domain" ? "var(--text-primary)" : "var(--text-secondary)",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow: activeTab === "domain" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s ease"
            }}
            onClick={() => handleTabChange("domain")}
          >
            Domain Name
          </button>
          
          <button
            type="button"
            className="tab-btn"
            style={{
              flex: 1,
              background: activeTab === "github" ? "var(--bg-panel)" : "none",
              border: "none",
              padding: "10px 16px",
              fontWeight: activeTab === "github" ? 600 : 500,
              fontSize: 14,
              color: activeTab === "github" ? "var(--text-primary)" : "var(--text-secondary)",
              borderRadius: 6,
              cursor: "pointer",
              boxShadow: activeTab === "github" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s ease"
            }}
            onClick={() => handleTabChange("github")}
          >
            GitHub Org
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 24, textAlign: "left" }}>
            <label style={{ 
              display: "block", 
              fontSize: 14, 
              fontWeight: 600, 
              marginBottom: 8, 
              color: "var(--text-primary)" 
            }}>
              {activeTab === "email" && "Email Address"}
              {activeTab === "domain" && "Domain Name"}
              {activeTab === "github" && "GitHub Org or Account"}
            </label>
            
            <input
              type={activeTab === "email" ? "email" : "text"}
              value={inputValue}
              onChange={handleInputChange}
              placeholder={
                activeTab === "email" ? "security-team@company.com" :
                activeTab === "domain" ? "company.com" : "demo"
              }
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 15,
                borderRadius: 8,
                border: error ? "1.5px solid var(--severity-critical)" : "1px solid var(--border-color)",
                backgroundColor: "var(--bg-panel)",
                color: "var(--text-primary)",
                transition: "all 0.2s ease"
              }}
              autoFocus
            />
            
            {/* Context/Help Messages */}
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>
              {activeTab === "email" && "Checks the HaveIBeenPwned database to identify if this email was compromised in public data breaches."}
              {activeTab === "domain" && "Scans SSL logs (crt.sh) for valid certificates and reports warning if expiration is within 30 days."}
              {activeTab === "github" && "Searches public codebases via the GitHub search API for exposed authentication keys, tokens, or API credentials."}
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ 
                color: "var(--severity-critical)", 
                fontSize: 13, 
                fontWeight: 500, 
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputValue || !!error || isSubmitting}
            style={{ width: "100%", padding: "14px", fontSize: 15 }}
          >
            {isSubmitting ? "Processing..." : "Register and Initiate Scan"}
          </button>
        </form>
      </div>
    </div>
  );
}