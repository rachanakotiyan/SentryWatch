export default function AlertBadge({ severity = "LOW" }) {
  const isSecure = severity === "SECURE";
  const normalizedSeverity = isSecure
    ? "clean"
    : ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(severity) ? severity.toLowerCase() : "low";
  const label = isSecure ? "SECURE" : severity;

  return <span className={`badge badge-${normalizedSeverity}`}>{label}</span>;
}
