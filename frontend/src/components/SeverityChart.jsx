export default function SeverityChart({ alerts = [] }) {
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  alerts.forEach((alert) => {
    if (!alert.resolved && counts[alert.severity] !== undefined) {
      counts[alert.severity] += 1;
    }
  });

  const total = counts.CRITICAL + counts.HIGH + counts.MEDIUM + counts.LOW;

  const data = [
    { label: "Critical", severity: "CRITICAL", count: counts.CRITICAL, color: "var(--severity-critical)" },
    { label: "High", severity: "HIGH", count: counts.HIGH, color: "var(--severity-high)" },
    { label: "Medium", severity: "MEDIUM", count: counts.MEDIUM, color: "var(--severity-medium)" },
    { label: "Low", severity: "LOW", count: counts.LOW, color: "var(--severity-low)" },
  ];

  if (total === 0) {
    return (
      <div className="card severity-chart-card">
        <h3 className="section-title">Open alerts by severity</h3>
        <div className="severity-chart-empty">
          <span className="chart-clean-badge">&#10003;</span>
          <p>No open security alerts across your perimeter.</p>
        </div>
      </div>
    );
  }

  // Calculate SVG donut segments
  const size = 130;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="card severity-chart-card">
      <div className="severity-chart-header">
        <h3 className="section-title">Open alerts by severity</h3>
        <span className="severity-total-count">{total} open</span>
      </div>

      <div className="severity-chart-content">
        <div className="severity-donut-wrapper">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="severity-donut-svg"
            role="img"
            aria-label={`Donut chart of ${total} open alerts`}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--bg-active)"
              strokeWidth={strokeWidth}
            />
            {data.map((item) => {
              if (item.count === 0) return null;
              const fraction = item.count / total;
              const dashLength = fraction * circumference;
              const dashoffset = -accumulatedOffset;
              accumulatedOffset += dashLength;

              return (
                <circle
                  key={item.severity}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={dashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })}
          </svg>
          <div className="severity-donut-center">
            <strong>{total}</strong>
            <small>Alerts</small>
          </div>
        </div>

        <div className="severity-legend">
          {data.map((item) => (
            <div className="severity-legend-row" key={item.severity}>
              <span className="legend-dot" style={{ backgroundColor: item.color }} />
              <span className="legend-label">{item.label}</span>
              <span className="legend-count">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
