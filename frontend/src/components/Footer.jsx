import { Link } from "react-router-dom";

export default function Footer({ slim = false }) {
  const currentYear = new Date().getFullYear();

  if (slim) {
    return (
      <footer className="footer-slim">
        <div className="footer-slim-content">
          <span>&copy; {currentYear} SentryWatch.</span>
          <span className="footer-slim-note">
            Honeywell Future Skills Edge Cybersecurity Internship &middot; UVCE Bengaluru
          </span>
          <div className="footer-slim-links">
            <a
              href="https://github.com/rachanakotiyan/SentryWatch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              GitHub
            </a>
            <span aria-hidden="true">&middot;</span>
            <Link to="/app" className="text-link">Dashboard</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-col footer-col-brand">
            <div className="brand footer-brand">
              <div className="brand-icon">S</div>
              <span className="brand-name">SentryWatch</span>
            </div>
            <p className="footer-tagline">
              External attack surface monitoring for modern engineering and security teams.
            </p>
            <div className="footer-brand-badge">
              <span>Non-invasive &middot; Open Architecture</span>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Product</h3>
            <ul className="footer-links">
              <li><a href="/#features">What it watches</a></li>
              <li><a href="/#how-it-works">How it works</a></li>
              <li><a href="/#about">About attack surfaces</a></li>
              <li><a href="/#security">Security model</a></li>
              <li><Link to="/app">Dashboard workspace</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Resources</h3>
            <ul className="footer-links">
              <li>
                <a
                  href="https://github.com/rachanakotiyan/SentryWatch"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/rachanakotiyan/SentryWatch#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  README &amp; documentation
                </a>
              </li>
              <li>
                <a
                  href="https://haveibeenpwned.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Have I Been Pwned
                </a>
              </li>
              <li>
                <a
                  href="https://certificate.transparency.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Certificate Transparency
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Responsible Use</h3>
            <p className="footer-responsible-text">
              SentryWatch performs external security posture assessments. Only scan domains,
              repositories, and email addresses that you own or have explicit written authorization
              to evaluate.
            </p>
            <div className="footer-responsible-pill">
              Ethical Security Research
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            &copy; {currentYear} SentryWatch. Built during the Honeywell Future Skills Edge
            Cybersecurity Internship (BharatCares), UVCE Bengaluru.
          </p>
          <p className="footer-notice">
            Notice: Only scan domains, repositories and emails you own or are authorised to test.
          </p>
        </div>
      </div>
    </footer>
  );
}
