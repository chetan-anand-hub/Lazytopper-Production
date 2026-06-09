// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.

import { useThemeColors } from "./dashboardUtils";
import { ProgressBar } from "./RingChart";

export interface WeakArea {
  topicKey: string;
  topicName: string;
  subject: string;
  accuracy: number;
}

export interface WeakAreasPanelProps {
  weakAreas: WeakArea[];
  gradeNum: string | number;
  navigate: (path: string, opts?: { state?: Record<string, unknown> }) => void;
}

export function WeakAreasPanel({ weakAreas, gradeNum, navigate }: WeakAreasPanelProps) {
  const tc = useThemeColors();
  if (weakAreas.length === 0) return null;
  return (
    <div className="glass-warn" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{"\u26A0\uFE0F"}</span>
        <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Weak Areas</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {weakAreas.map((w) => (
          <div key={w.topicKey}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{w.topicName}</span>
                <span style={{ fontSize: 10, color: tc.textMuted, marginLeft: 6 }}>{w.subject}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: w.accuracy < 50 ? "#ef4444" : "#fb923c" }}>{w.accuracy}%</span>
                <button onClick={() => navigate(`/practice/${gradeNum}/${w.subject}?topic=${encodeURIComponent(w.topicKey)}`, { state: { back: "/dashboard", backLabel: "Back to Dashboard" } })} style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                  background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
                  color: "#fb923c", cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
                }}>Practice</button>
              </div>
            </div>
            <ProgressBar value={w.accuracy} color={w.accuracy < 50 ? "#ef4444" : "#fb923c"} />
          </div>
        ))}
      </div>
    </div>
  );
}
