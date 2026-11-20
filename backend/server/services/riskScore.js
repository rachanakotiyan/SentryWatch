export const SEVERITY_WEIGHT = { CRITICAL: 40, HIGH: 20, MEDIUM: 8, LOW: 2 };
const ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/** 0-100: sum of per-finding weights, capped. Two CRITICAL findings (80) or one CRITICAL + two HIGH hit 80+. */
export function calculateRiskScore(findings) {
  const total = findings.reduce((sum, f) => sum + (SEVERITY_WEIGHT[f.severity] || 0), 0);
  return Math.min(100, total);
}

/** Highest severity among findings, or "SECURE" when there are none. */
export function assetStatus(findings) {
  let top = -1;
  for (const f of findings) top = Math.max(top, ORDER.indexOf(f.severity));
  return top === -1 ? 'SECURE' : ORDER[top];
}
