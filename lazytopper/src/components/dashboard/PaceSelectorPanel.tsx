// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useThemeColors } from "./dashboardUtils";
import {
  setManualOverride,
  clearManualOverride,
  getProfileConfig,
  type PaceProfileType,
  type StoredPaceProfile,
} from "../../services/paceProfileService";

export interface PaceSelectorPanelProps {
  paceProfile: StoredPaceProfile;
  hideCountdown: boolean;
  onUpdateProfile: (profile: StoredPaceProfile) => void;
}

export function PaceSelectorPanel({ paceProfile, hideCountdown, onUpdateProfile }: PaceSelectorPanelProps) {
  const tc = useThemeColors();
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Study Pace Profile</div>
      <p style={{ fontSize: 11, color: tc.textSecondary, marginBottom: 12, lineHeight: 1.5 }}>
        {paceProfile.isManualOverride
          ? `You manually set ${getProfileConfig(paceProfile.type).label} mode. Auto-detected: ${getProfileConfig(paceProfile.detectedType).label}.`
          : hideCountdown ? `Currently using ${getProfileConfig(paceProfile.type).label} mode.` : `Auto-detected based on ${paceProfile.daysLeft} days until exam.`}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["marathon", "sprint", "crash"] as PaceProfileType[]).map((pt) => {
          const pc: Record<string, string> = { marathon: "#3b82f6", sprint: "#f97316", crash: "#ef4444" };
          const color = pc[pt];
          const cfg = getProfileConfig(pt);
          const isActive = paceProfile.type === pt;
          return (
            <button key={pt} type="button" onClick={() => {
              const updated = setManualOverride(pt);
              onUpdateProfile(updated);
            }} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12,
              border: isActive ? `2px solid ${color}` : `1px solid ${tc.cardBorder}`,
              background: isActive ? `${color}15` : tc.cardBg,
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: isActive ? color : tc.textSecondary, textTransform: "uppercase" }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: 9, color: tc.textMuted, marginTop: 2 }}>{cfg.tagline}</div>
            </button>
          );
        })}
      </div>
      {paceProfile.isManualOverride && (
        <button type="button" onClick={() => {
          const updated = clearManualOverride();
          if (updated) onUpdateProfile(updated);
        }} style={{
          marginTop: 8, padding: "6px 12px", borderRadius: 8, border: "none",
          background: tc.subtleBg, color: tc.textSecondary,
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          Reset to auto-detect
        </button>
      )}
    </div>
  );
}
