import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import ThemeToggle from "../components/ThemeToggle";
import Footer from "../components/Footer";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      {/* 1. Sticky Navbar */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <Link to="/" className="brand">
            <div className="brand-icon">S</div>
            <span className="brand-name">SentryWatch</span>
          </Link>

          <nav className="landing-nav-links" aria-label="Landing page links">
            <a href="#about" className="landing-nav-item">About</a>
            <a href="#features" className="landing-nav-item">What It Watches</a>
            <a href="#how-it-works" className="landing-nav-item">How It Works</a>
            <a href="#security" className="landing-nav-item">Security</a>
          </nav>

          <div className="landing-nav-actions">
            <ThemeToggle />
            {user ? (
              <Link to="/app" className="btn btn-primary">Go to dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Log in</Link>
                <Link to="/register" className="btn btn-primary">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="landing-hero-section">
          <div className="landing-container hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                <span>External Attack Surface Management</span>
              </div>
              <h1 className="hero-title">
                Know what your organisation exposes before attackers do.
              </h1>
              <p className="hero-subtitle">
                Continuous perimeter monitoring for exposed employee credentials, expiring SSL certificates, and leaked API secrets in public repositories.
              </p>
              <div className="hero-cta-group">
                {user ? (
                  <Link to="/app" className="btn btn-primary btn-lg">Go to dashboard &rarr;</Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-primary btn-lg">Get started free</Link>
                    <Link to="/login" className="btn btn-secondary btn-lg">Sign in</Link>
                  </>
                )}
              </div>
              <div className="hero-proof-list">
                <span>&check; Real TLS Handshakes</span>
                <span>&check; Git Tree Inspections</span>
                <span>&check; k-Anonymity Breach Lookups</span>
              </div>
            </div>

            {/* Dashboard Mock Illustration */}
            <div className="hero-mock-wrapper" aria-hidden="true">
              <div className="mock-window card">
                <div className="mock-window-header">
                  <div className="mock-dots">
                    <span className="mock-dot red" />
                    <span className="mock-dot yellow" />
                    <span className="mock-dot green" />
                  </div>
                  <div className="mock-address-bar">sentrywatch.internal/app</div>
                  <span className="mock-badge">LIVE PREVIEW SAMPLE</span>
                </div>
                <div className="mock-window-body">
                  <div className="mock-stat-row">
                    <div className="mock-stat">
                      <small>MONITORED</small>
                      <strong>3 Assets</strong>
                    </div>
                    <div className="mock-stat">
                      <small>RISK SCORE</small>
                      <strong className="text-warning">28 / 100</strong>
                    </div>
                    <div className="mock-stat">
                      <small>OPEN FINDINGS</small>
                      <strong className="text-danger">2 Active</strong>
                    </div>
                  </div>
                  <div className="mock-asset-row">
                    <div className="mock-asset-icon">🌐</div>
                    <div className="mock-asset-meta">
                      <strong>api.acme-corp.com</strong>
                      <small>TLS: Certificate expires in 12 days</small>
                    </div>
                    <span className="badge badge-high">HIGH</span>
                  </div>
                  <div className="mock-asset-row">
                    <div className="mock-asset-icon">⌘</div>
                    <div className="mock-asset-meta">
                      <strong>acme-corp/cloud-infra</strong>
                      <small>Git: AKIA... (20 chars) in aws.yml</small>
                    </div>
                    <span className="badge badge-critical">CRITICAL</span>
                  </div>
                  <div className="mock-asset-row">
                    <div className="mock-asset-icon">✉️</div>
                    <div className="mock-asset-meta">
                      <strong>security@acme-corp.com</strong>
                      <small>Breaches: No exposed hashes detected</small>
                    </div>
                    <span className="badge badge-clean">SECURE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. What is SentryWatch */}
        <section id="about" className="landing-section">
          <div className="landing-container">
            <div className="section-intro">
              <span className="eyebrow">The Fundamentals</span>
              <h2 className="section-heading-text">What is External Attack Surface Monitoring?</h2>
              <p className="section-desc">
                Most breaches do not begin with sophisticated zero-days—they begin with credentials leaked on third-party sites, lapsed certificates triggering security warnings, or developer keys inadvertently committed to public repositories.
              </p>
            </div>

            <div className="card about-card">
              <div className="about-grid">
                <div className="about-item">
                  <div className="about-icon">&#128065;</div>
                  <h3>The Attacker&apos;s Perspective</h3>
                  <p>
                    Rather than installing internal agents, SentryWatch evaluates your infrastructure from the outside in—just as an adversary or reconnaissance bot would scan your public perimeter.
                  </p>
                </div>
                <div className="about-item">
                  <div className="about-icon">&#9889;</div>
                  <h3>Non-Invasive Verification</h3>
                  <p>
                    Probes use standard network handshakes, official GitHub metadata trees, and privacy-preserving hash queries. No disruption to your production workloads.
                  </p>
                </div>
                <div className="about-item">
                  <div className="about-icon">&#128202;</div>
                  <h3>Actionable Prioritisation</h3>
                  <p>
                    Clear 0–100 risk scoring separates false alarms from critical credential leaks, so your team focuses on what exposes immediate risk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. What it watches */}
        <section id="features" className="landing-section bg-alt">
          <div className="landing-container">
            <div className="section-intro">
              <span className="eyebrow">Monitoring Capabilities</span>
              <h2 className="section-heading-text">What SentryWatch Watches</h2>
              <p className="section-desc">
                Three critical vector categories that account for the majority of initial access incidents.
              </p>
            </div>

            <div className="features-grid">
              <article className="card feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">✉️</span>
                  <span className="badge badge-high">CREDENTIAL RISK</span>
                </div>
                <h3 className="feature-title">Breached Emails</h3>
                <p className="feature-why">
                  <strong>Why it matters:</strong> Compromised email accounts provide initial foothold access when employees reuse corporate passwords across compromised third-party services.
                </p>
                <ul className="feature-bullets">
                  <li>Checks against Have I Been Pwned breach repositories</li>
                  <li>Identifies compromised data classes (passwords, PII, financial details)</li>
                  <li>Includes zero-knowledge k-anonymity password verification</li>
                </ul>
              </article>

              <article className="card feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">🌐</span>
                  <span className="badge badge-medium">ENCRYPTION HEALTH</span>
                </div>
                <h3 className="feature-title">SSL / TLS Certificates</h3>
                <p className="feature-why">
                  <strong>Why it matters:</strong> Expired certificates immediately halt client traffic and erode user trust, while self-signed or weak RSA keys expose traffic to interception.
                </p>
                <ul className="feature-bullets">
                  <li>Real port 443 TLS handshake inspections (no cached lookup lag)</li>
                  <li>Early expiration alerts at 30 days and critical warnings at 7 days</li>
                  <li>Cryptographic validation for key strength (&ge; 2048 bits) and CA trust</li>
                </ul>
              </article>

              <article className="card feature-card">
                <div className="feature-icon-wrapper">
                  <span className="feature-icon">⌘</span>
                  <span className="badge badge-critical">SECRET LEAKS</span>
                </div>
                <h3 className="feature-title">GitHub Repositories</h3>
                <p className="feature-why">
                  <strong>Why it matters:</strong> Hardcoded secrets and committed configuration files grant automated bots root control of your cloud accounts within minutes of pushing.
                </p>
                <ul className="feature-bullets">
                  <li>Git-tree scanning without clone overhead or code-search limit traps</li>
                  <li>Flags sensitive tracked files: <code>.env</code>, private keys, certificates</li>
                  <li>Detects active AWS access keys, GitHub tokens, Stripe live secrets, and API credentials</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* 5. How it works */}
        <section id="how-it-works" className="landing-section">
          <div className="landing-container">
            <div className="section-intro">
              <span className="eyebrow">Workflow</span>
              <h2 className="section-heading-text">How It Works</h2>
              <p className="section-desc">
                Four simple steps from registering an asset to remediating an exposure.
              </p>
            </div>

            <div className="steps-grid">
              <div className="step-card card">
                <div className="step-number">01</div>
                <h3 className="step-title">Add an Asset</h3>
                <p className="step-desc">
                  Register a corporate domain (<code>company.com</code>), a team email, or a GitHub repository (<code>org/repo</code>). SentryWatch validates the target format and enforces per-user deduplication.
                </p>
              </div>

              <div className="step-card card">
                <div className="step-number">02</div>
                <h3 className="step-title">Run a Scan</h3>
                <p className="step-desc">
                  Initiate an automated scan. SentryWatch connects over direct TLS sockets, traverses the remote git tree, or queries privacy-preserving k-anonymity APIs without touching your backend.
                </p>
              </div>

              <div className="step-card card">
                <div className="step-number">03</div>
                <h3 className="step-title">Get a 0–100 Risk Score</h3>
                <p className="step-desc">
                  Each finding carries a severity weighting. The platform computes a capped 0–100 composite risk score and updates the asset status to reflect its most urgent exposure.
                </p>
              </div>

              <div className="step-card card">
                <div className="step-number">04</div>
                <h3 className="step-title">Triage &amp; Remediate</h3>
                <p className="step-desc">
                  Inspect redacted finding samples, revoke exposed secrets, renew impending certificates, and mark alerts resolved. Rescanning automatically cleans up resolved items.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Severity & Risk Score Explainer */}
        <section className="landing-section bg-alt">
          <div className="landing-container">
            <div className="section-intro">
              <span className="eyebrow">Transparent Scoring</span>
              <h2 className="section-heading-text">Severity Weights &amp; Risk Scoring</h2>
              <p className="section-desc">
                No opaque &ldquo;AI magic&rdquo;. The overall risk score (0–100) is a deterministic weighted sum of all open findings, capped at 100.
              </p>
            </div>

            <div className="card scoring-card">
              <div className="scoring-formula-banner">
                <strong>Formula:</strong> <code>RiskScore = min(100, &sum; [Critical &times; 40 + High &times; 20 + Medium &times; 8 + Low &times; 2])</code>
              </div>

              <div className="severity-chips-grid">
                <div className="severity-chip-card critical">
                  <div className="chip-header">
                    <span className="badge badge-critical">CRITICAL</span>
                    <span className="chip-weight">+40 pts</span>
                  </div>
                  <h4>Immediate Compromise</h4>
                  <p>
                    Direct account takeover or exposed keys. Examples: plaintext AWS keys, private RSA keys, or expired SSL certificates currently failing browser connections.
                  </p>
                </div>

                <div className="severity-chip-card high">
                  <div className="chip-header">
                    <span className="badge badge-high">HIGH</span>
                    <span className="chip-weight">+20 pts</span>
                  </div>
                  <h4>Severe Vulnerability</h4>
                  <p>
                    Committed <code>.env</code> files holding environment configurations, SSL certificates expiring in &le; 7 days, or password-bearing breach dumps.
                  </p>
                </div>

                <div className="severity-chip-card medium">
                  <div className="chip-header">
                    <span className="badge badge-medium">MEDIUM</span>
                    <span className="chip-weight">+8 pts</span>
                  </div>
                  <h4>Elevated Risk</h4>
                  <p>
                    SSL certificates expiring in &le; 30 days, weak RSA keys (&lt; 2048-bit), or username-only breach appearances.
                  </p>
                </div>

                <div className="severity-chip-card low">
                  <div className="chip-header">
                    <span className="badge badge-low">LOW</span>
                    <span className="chip-weight">+2 pts</span>
                  </div>
                  <h4>Minor Hygiene</h4>
                  <p>
                    Minor security deviations and informational telemetry signals that do not represent active compromise vectors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Built Securely */}
        <section id="security" className="landing-section">
          <div className="landing-container">
            <div className="section-intro">
              <span className="eyebrow">Security Architecture</span>
              <h2 className="section-heading-text">Built Securely by Design</h2>
              <p className="section-desc">
                A security tool must uphold higher standards than the assets it monitors.
              </p>
            </div>

            <div className="security-grid">
              <div className="card security-item">
                <div className="security-icon">&#128272;</div>
                <h3>Server-Side Credential Isolation</h3>
                <p>
                  API keys (such as GitHub PATs and HIBP subscriptions) are stored exclusively in backend environment variables and are never transmitted to client browsers.
                </p>
              </div>

              <div className="card security-item">
                <div className="security-icon">&#129525;</div>
                <h3>bcrypt Password Hashing</h3>
                <p>
                  User passwords are salted and hashed using bcrypt at work factor 12. Password hashes never leave the database and are never returned in auth endpoints.
                </p>
              </div>

              <div className="card security-item">
                <div className="security-icon">&#128179;</div>
                <h3>HMAC-SHA256 JWT Sessions</h3>
                <p>
                  Stateless authenticated sessions use HS256 tokens expiring in 24 hours, with strict algorithm validation and rejection of insecure <code>none</code> algorithms.
                </p>
              </div>

              <div className="card security-item">
                <div className="security-icon">&#128526;</div>
                <h3>k-Anonymity Breach Queries</h3>
                <p>
                  Password lookups use Cloudflare/PwnedPasswords k-anonymity: only the first 5 characters of a SHA-1 hash leave the server, keeping the actual password impossible to reconstruct.
                </p>
              </div>

              <div className="card security-item">
                <div className="security-icon">&#9986;</div>
                <h3>Redacted Secret Findings</h3>
                <p>
                  When a leaked secret is found in a repository, only an obfuscated prefix (e.g. <code>AKIA...(20 chars)</code>) is stored and shown. Raw credentials are never echoed.
                </p>
              </div>

              <div className="card security-item">
                <div className="security-icon">&#128277;</div>
                <h3>SSRF &amp; Target Validation</h3>
                <p>
                  Domain scans strictly resolve against public DNS before initiating TLS handshakes, blocking internal, loopback, and cloud metadata addresses (169.254.169.254).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final CTA Band */}
        <section className="landing-cta-band">
          <div className="landing-container cta-container">
            <h2 className="cta-title">Start monitoring your attack surface today</h2>
            <p className="cta-desc">
              Discover exposed credentials, inspect certificate validity, and catch leaked secrets before threat actors leverage them.
            </p>
            <div className="cta-buttons">
              {user ? (
                <Link to="/app" className="btn btn-primary btn-lg">Open Dashboard &rarr;</Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">Create free account</Link>
                  <Link to="/login" className="btn btn-secondary btn-lg">Sign in</Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
