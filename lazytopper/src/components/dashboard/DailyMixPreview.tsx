// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.

import { useThemeColors } from "./dashboardUtils";
import type { DailyMixItem } from "../../services/dailyMixPlayback";

export interface DailyMixPreviewProps {
  items: DailyMixItem[];
  totalMinutes: number;
  gradeNum: string | number;
  subjectForQuickActions: string;
  navigate: (path: string, opts?: { state?: Record<string, unknown> }) => void;
}

export function DailyMixPreview({ items, totalMinutes, gradeNum, subjectForQuickActions, navigate }: DailyMixPreviewProps) {
  const tc = useThemeColors();
  if (items.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Today's Mix</span>
        <span style={{ fontSize: 11, color: tc.textMuted }}>{items.length} items · ~{totalMinutes} min</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: tc.subtleBg }}>
            <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.type === "question" ? "✏️" : item.type === "video" ? "🎬" : "📖"}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: tc.textSecondary, flex: 1 }}>{item.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 6px", borderRadius: 4,
              background: item.type === "question" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)",
              color: item.type === "question" ? "#60a5fa" : "#4ade80",
            }}>{item.type}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate(`/daily-mix/${gradeNum}/${subjectForQuickActions}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })} style={{
        width: "100%", padding: "12px 0", borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)",
        color: "#60a5fa", fontWeight: 700, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer", marginTop: 10,
      }}>Play Daily Mix</button>
    </div>
  );
}
