export default function RiskHistoryChart({ scans = [] }) {
  if (!scans || scans.length === 0) {
    return null;
  }

  // Sort scans chronologically (oldest to newest) for chart
  const orderedScans = [...scans]
    .sort((a, b) => new Date(a.scannedAt || a.createdAt) - new Date(b.scannedAt || b.createdAt))
    .slice(-10); // Show last 10 scans

  if (orderedScans.length < 2) {
    return (
      <div className="risk-history-placeholder card">
        <small className="summary-label">Risk score trend</small>
        <p>Run additional scans over time to view vulnerability trajectory.</p>
      </div>
    );
  }

  const width = 500;
  const height = 150;
  const padding = { top: 20, right: 24, bottom: 30, left: 36 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const points = orderedScans.map((scan, i) => {
    const score = Number.isFinite(Number(scan.riskScore)) ? Number(scan.riskScore) : 0;
    const x = padding.left + (i / (orderedScans.length - 1)) * graphWidth;
    const y = padding.top + (1 - score / 100) * graphHeight;
    const date = scan.scannedAt || scan.createdAt;
    return { x, y, score, date };
  });

  const pathData = points.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, "");

  // Area under line
  const areaData = `${pathData} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;

  return (
    <div className="card risk-history-card">
      <div className="risk-history-header">
        <span className="summary-label">Risk score trajectory</span>
        <span className="risk-history-count">{orderedScans.length} scans</span>
      </div>

      <div className="risk-history-svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="risk-history-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label="Risk score line chart over recent scans"
        >
          {/* Y Axis Guide Lines */}
          {[0, 25, 50, 75, 100].map((level) => {
            const y = padding.top + (1 - level / 100) * graphHeight;
            return (
              <g key={level}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-color)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="var(--text-muted)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaData} fill="url(#riskGradient)" opacity="0.25" />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--bg-panel)"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
              />
              <text
                x={p.x}
                y={p.y - 8}
                fill="var(--text-primary)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {p.score}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="risk-history-dates">
        <span>{new Date(points[0].date).toLocaleDateString()}</span>
        <span>{new Date(points[points.length - 1].date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
