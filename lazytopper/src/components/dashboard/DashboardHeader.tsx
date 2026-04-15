
import { greetingLabel, useThemeColors } from "./dashboardUtils";
import { getProfileConfig, type PaceProfileType } from "../../services/paceProfileService";

export interface DashboardHeaderProps {
  user: { displayName?: string | null; email?: string | null } | null;
  streak: number;
  xpEstimate: number;
  paceProfile: { type: PaceProfileType } | null;
  onTogglePaceSelector: () => void;
}

export function DashboardHeader({ user, streak, xpEstimate, paceProfile, onTogglePaceSelector }: DashboardHeaderProps) {
  const tc = useThemeColors();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e, #3b82f6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "var(--text)",
        }}>{(user?.displayName || user?.email || "S").charAt(0).toUpperCase()}</div>
        <div>
          <div style={{ fontSize: 11, color: tc.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{greetingLabel()}</div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{user?.displayName || "Student"}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {paceProfile && (() => {
          const pc: Record<string, string> = { marathon: "#3b82f6", sprint: "#f97316", crash: "#ef4444" };
          const color = pc[paceProfile.type] || "#3b82f6";
          const cfg = getProfileConfig(paceProfile.type);
          return (
            <button type="button" onClick={onTogglePaceSelector} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20,
              background: `${color}18`, border: `1px solid ${color}40`, cursor: "pointer",
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase" }}>{cfg.label}</span>
            </button>
          );
        })()}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
          <span style={{ fontSize: 14 }}>{"🔥"}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fb923c" }}>{streak}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <span style={{ fontSize: 14 }}>{"⚡"}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#c084fc" }}>{xpEstimate.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
