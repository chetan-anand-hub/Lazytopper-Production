

export interface ExploreMorePanelProps {
  gradeNum: string | number;
  subjectForQuickActions: string;
  daysLeftValue: number;
  navigate: (path: string, opts?: { state?: Record<string, unknown> }) => void;
}

export function ExploreMorePanel({ gradeNum, subjectForQuickActions, daysLeftValue, navigate }: ExploreMorePanelProps) {
  const items = [
    { label: "Trends", icon: "\uD83D\uDCC8", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", path: `/trends/${gradeNum}/${subjectForQuickActions}` },
    { label: "Chapter Hub", icon: "\uD83D\uDCDA", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", path: `/topic-hub/${gradeNum}/${subjectForQuickActions}` },
    { label: "Mock Test", icon: "\uD83D\uDCDD", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)", path: "/predictive-papers" },
    ...(daysLeftValue > 7 ? [{ label: "Weekly Wrapped", icon: "\uD83D\uDCCA", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", path: "/weekly-wrapped" }] : []),
    ...(daysLeftValue <= 30 ? [{ label: "Revision Calendar", icon: "\uD83D\uDCC5", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", path: "/revision-calendar" }] : []),
  ];
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 0 }}>
      <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>Explore More</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "14px 12px", borderRadius: 12, border: `1px solid ${a.border}`,
            background: a.bg, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}>
            <span style={{ fontSize: 16 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
