

export interface SessionStats {
  total: number;
  attemptedInSet: number;
  markedUnderstood: number;
  needsAnotherLook: number;
  localMcqAnswered: number;
  localMcqCorrect: number;
}

export function SessionProgressBar({ stats }: { stats: SessionStats }) {
  if (stats.total === 0 || stats.attemptedInSet === 0) return null;
  return (
    <div
      style={{
        marginTop: 16, padding: "12px 16px", borderRadius: 16,
        background: "#ffffff",
        border: "1px solid hsl(220, 18%, 90%)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        display: "flex", gap: 16, flexWrap: "wrap",
        alignItems: "center", fontSize: "0.8rem",
      }}
    >
      <span style={{ fontWeight: 700, color: "var(--text)" }}>Local practice notes</span>
      <span style={{ color: "hsl(220, 15%, 42%)" }}>
        This session only
      </span>
      <span style={{ color: "hsl(220, 25%, 12%)" }}>
        {stats.attemptedInSet}/{stats.total} attempted in this set
      </span>
      {stats.markedUnderstood > 0 && (
        <span style={{ color: "hsl(152, 55%, 28%)" }}>
          {stats.markedUnderstood} marked by you
        </span>
      )}
      {stats.needsAnotherLook > 0 && (
        <span style={{ color: "hsl(35, 80%, 35%)" }}>
          {stats.needsAnotherLook} needs another look
        </span>
      )}
      {stats.localMcqAnswered > 0 && (
        <span style={{ color: "hsl(215, 65%, 32%)" }}>
          MCQ feedback: {stats.localMcqCorrect}/{stats.localMcqAnswered}
        </span>
      )}
      <span style={{ color: "hsl(220, 15%, 42%)" }}>
        Not graded. Not saved to Me / Progress.
      </span>
    </div>
  );
}
