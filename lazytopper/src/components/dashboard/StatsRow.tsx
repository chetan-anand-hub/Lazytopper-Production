
import { useThemeColors } from "./dashboardUtils";
import { RingChart } from "./RingChart";

export interface StatsRowProps {
  streak: number;
  xpEstimate: number;
  avgAccuracy: number;
  topicsMastered: number;
  topicsStarted: number;
}

export function StatsRow({ streak, xpEstimate, avgAccuracy, topicsMastered, topicsStarted }: StatsRowProps) {
  const tc = useThemeColors();
  const items = [
    { label: "Streak", value: `${streak}d`, icon: "🔥", color: "#fb923c" },
    { label: "XP", value: xpEstimate.toLocaleString(), icon: "⚡", color: "#c084fc" },
    { label: "Accuracy", value: `${avgAccuracy}%`, color: "#3b82f6", ring: true, ringVal: avgAccuracy },
    { label: "Mastered", value: `${topicsMastered}/${topicsStarted}`, color: "#22c55e", ring: true, ringVal: topicsStarted > 0 ? (topicsMastered / topicsStarted) * 100 : 0 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
      {items.map((s, i) => (
        <div key={i} className="glass-card" style={{ padding: "12px 8px", textAlign: "center" }}>
          {s.ring ? (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <div style={{ position: "relative", width: 40, height: 40 }}>
                <RingChart value={s.ringVal || 0} size={40} strokeWidth={3} color={s.color} />
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            </>
          )}
          <div style={{ fontSize: 9, fontWeight: 600, color: tc.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
