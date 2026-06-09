// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.

import { useThemeColors } from "./dashboardUtils";
import { NewBadge } from "./DashboardWidgets";

export interface BadgeItem {
  icon: string;
  name: string;
  unlocked: boolean;
}

export interface BadgesSectionProps {
  badges: BadgeItem[];
  showNewBadge: boolean;
}

export function BadgesSection({ badges, showNewBadge }: BadgesSectionProps) {
  const tc = useThemeColors();
  if (badges.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
      <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "inline" }}>Badges & Achievements{showNewBadge && <NewBadge />}</span>
      <div style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {badges.map((b, i) => (
          <div key={i} style={{ flexShrink: 0, width: 64, textAlign: "center", opacity: b.unlocked ? 1 : 0.3 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, margin: "0 auto 4px",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              background: b.unlocked ? "rgba(34,197,94,0.1)" : tc.subtleBg,
              border: b.unlocked ? "1px solid rgba(34,197,94,0.2)" : `1px solid ${tc.cardBorder}`,
            }}>{b.unlocked ? b.icon : "🔒"}</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: tc.textSecondary, lineHeight: 1.2 }}>{b.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
