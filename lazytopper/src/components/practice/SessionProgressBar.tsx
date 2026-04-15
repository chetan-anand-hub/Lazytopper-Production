

export interface SessionStats {
  total: number;
  gotIt: number;
  needPractice: number;
  accuracy: number;
}

export function SessionProgressBar({ stats }: { stats: SessionStats }) {
  if (stats.total === 0) return null;
  return (
    <div
      style={{
        marginTop: 16, padding: "12px 16px", borderRadius: 16,
        background: "rgba(34,197,94,0.06)",
        border: "1px solid rgba(34,197,94,0.3)",
        display: "flex", gap: 16, flexWrap: "wrap",
        alignItems: "center", fontSize: "0.8rem",
      }}
    >
      <span style={{ fontWeight: 700, color: "var(--text)" }}>Session Progress</span>
      <span style={{ color: "#22c55e" }}>{"\u2713"} {stats.gotIt} got it</span>
      <span style={{ color: "#ef4444" }}>{"\u21BB"} {stats.needPractice} need practice</span>
      <span style={{ color: "var(--text-muted)" }}>
        {Math.round(stats.accuracy * 100)}% accuracy
      </span>
    </div>
  );
}
