export default function TerminalLogs({ scans = [] }) {
  if (scans.length === 0) {
    return <div className="card terminal-empty">No scan history yet. Run a scan to see results here.</div>;
  }

  return (
    <section className="terminal" aria-label="Scan history">
      <div className="terminal-header"><span className="terminal-dot" /> Scan history</div>
      <div className="terminal-entries">
        {scans.map((scan) => {
          const date = scan.scannedAt || scan.createdAt;
          const score = Number(scan.riskScore);
          return (
            <div className="terminal-entry" key={scan.id}>
              <span className="terminal-prompt">&gt;</span>
              <span>{date ? new Date(date).toLocaleString() : "Scan"}</span>
              <span className="terminal-result">
                {Number.isFinite(score) ? `Risk score ${score}/100` : scan.passed ? "No findings" : "Findings detected"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
