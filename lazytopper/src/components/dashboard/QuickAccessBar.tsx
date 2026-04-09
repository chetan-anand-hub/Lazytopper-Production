
import { useThemeColors } from "./dashboardUtils";

export interface QuickAccessBarProps {
  gradeNum: string | number;
  subjectForQuickActions: string;
  navigate: (path: string, opts?: { state?: Record<string, unknown> }) => void;
}

export function QuickAccessBar({ gradeNum, subjectForQuickActions, navigate }: QuickAccessBarProps) {
  const tc = useThemeColors();
  const items = [
    { label: "Practice", icon: "✏️", path: `/practice/${gradeNum}/${subjectForQuickActions}` },
    { label: "Mock Tests", icon: "📝", path: "/predictive-papers" },
    { label: "Predicted Q's", icon: "🎯", path: `/highly-probable/${gradeNum}/${subjectForQuickActions}` },
    { label: "Daily Mix", icon: "🔥", path: `/daily-mix/${gradeNum}/${subjectForQuickActions}` },
    { label: "All Chapters", icon: "📚", path: `/topic-hub/${gradeNum}/${subjectForQuickActions}` },
  ];
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
      {items.map((a) => (
        <button key={a.label} onClick={() => navigate(a.path, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: "10px 14px", borderRadius: 12, border: `1px solid ${tc.cardBorder}`,
          background: tc.cardBg, color: tc.textPrimary, fontSize: 10, fontWeight: 600,
          cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 72,
        }}>
          <span style={{ fontSize: 18 }}>{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  );
}
