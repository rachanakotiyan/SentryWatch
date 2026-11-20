export default function DemoBanner({ onDismiss }) {
  return (
    <div className="demo-banner" role="status" aria-live="polite">
      <div className="demo-banner-content">
        <span className="demo-badge">DEMO MODE</span>
        <span>
          This scan returned demo findings. Email breach lookups use the free XposedOrNot API by default. Set <code>HIBP_API_KEY</code> in the backend for full Have I Been Pwned coverage. Domain &amp; repository scans are fully live.
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
