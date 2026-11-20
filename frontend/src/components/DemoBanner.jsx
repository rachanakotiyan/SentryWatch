export default function DemoBanner({ onDismiss }) {
  return (
    <div className="demo-banner" role="status" aria-live="polite">
      <div className="demo-banner-content">
        <span className="demo-badge">DEMO MODE</span>
        <span>
          Email breach scans return sample findings because no <code>HIBP_API_KEY</code> is configured on the backend. Domain &amp; repository scans are fully live.
        </span>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="demo-banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss demo banner"
        >
          ×
        </button>
      )}
    </div>
  );
}
