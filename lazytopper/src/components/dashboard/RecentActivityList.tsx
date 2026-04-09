
import { useThemeColors } from "./dashboardUtils";
import { NewBadge } from "./DashboardWidgets";

export interface ActivityItem {
  icon: string;
  action: string;
  subject?: string;
  time: string;
}

export interface RecentActivityListProps {
  activities: ActivityItem[];
  showNewBadge: boolean;
}

export function RecentActivityList({ activities, showNewBadge }: RecentActivityListProps) {
  const tc = useThemeColors();
  if (activities.length === 0) return null;
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
      <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "inline" }}>Recent Activity{showNewBadge && <NewBadge />}</span>
      <div style={{ marginBottom: 12 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {activities.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: i < activities.length - 1 ? `1px solid ${tc.divider}` : "none",
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: tc.subtleBg, fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{a.action}</div>
              {a.subject && <div style={{ fontSize: 10, color: tc.textMuted }}>{a.subject}</div>}
            </div>
            <span style={{ fontSize: 10, color: tc.textFaint, whiteSpace: "nowrap" }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
