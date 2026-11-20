export default function RiskGauge({ score = 0, size = 160 }) {
  const numericScore = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Math.round(Number(score)))) : null;

  // Arc calculation for half/three-quarter gauge:
  // Let's do a clean 260-degree circular meter
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 240-degree arc (leave bottom 120 open)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = numericScore !== null
    ? arcLength - (numericScore / 100) * arcLength
    : arcLength;

  let color = "var(--severity-clean)";
  let level = "SECURE";
  if (numericScore === null) {
    color = "var(--text-muted)";
    level = "UNSCANNED";
  } else if (numericScore >= 80) {
    color = "var(--severity-critical)";
    level = "CRITICAL";
  } else if (numericScore >= 50) {
    color = "var(--severity-high)";
    level = "HIGH";
  } else if (numericScore >= 20) {
    color = "var(--severity-medium)";
    level = "MEDIUM";
  } else if (numericScore > 0) {
    color = "var(--severity-low)";
    level = "LOW";
  }

  return (
    <div className="risk-gauge-wrapper" style={{ width: size, height: size }}>
      <svg
        className="risk-gauge-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`Risk score gauge: ${numericScore !== null ? `${numericScore} out of 100 (${level})` : "Unscanned"}`}
        role="img"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--bg-active)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${center} ${center})`}
        />
        {numericScore !== null && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        )}
      </svg>
      <div className="risk-gauge-label">
        <span className="risk-gauge-value" style={{ color: numericScore !== null ? color : "inherit" }}>
          {numericScore !== null ? numericScore : "—"}
        </span>
        <span className="risk-gauge-max">/100</span>
        <span className="risk-gauge-level" style={{ color }}>{level}</span>
      </div>
    </div>
  );
}
