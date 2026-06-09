// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.

import { useThemeColors } from "./dashboardUtils";
import type { StrategyResult } from "../../utils/strategy";

export interface StudyPlanSummaryProps {
  targetPercent: number | string;
  hoursPerDay: number | string;
  daysLeft: number;
  hideCountdown: boolean;
  strategy: StrategyResult | null;
}

export function StudyPlanSummary({ targetPercent, hoursPerDay, daysLeft, hideCountdown, strategy }: StudyPlanSummaryProps) {
  const tc = useThemeColors();
  return (
    <div className="glass-blue" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{"📋"}</span>
        <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Study Plan</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: hideCountdown ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Target", value: `${targetPercent || "\u2014"}%`, color: "#3b82f6" },
          { label: "Hours/day", value: `${hoursPerDay || "\u2014"}h`, color: "#22c55e" },
          ...(!hideCountdown ? [{ label: "Days left", value: `${daysLeft || "\u2014"}`, color: "#fb923c" }] : []),
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: tc.subtleBg }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: tc.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {strategy && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div style={{ fontSize: 11, color: tc.textSecondary, marginBottom: 4 }}>Realistic Score Range</div>
          <div className="font-display" style={{ fontSize: 20, fontWeight: 800 }}>
            <span style={{ color: "#3b82f6" }}>{strategy.realisticMin}%</span>
            <span style={{ color: tc.textFaint, margin: "0 6px" }}>{"\u2014"}</span>
            <span style={{ color: "#22c55e" }}>{strategy.realisticMax}%</span>
          </div>
          <div style={{ fontSize: 10, color: tc.textMuted, marginTop: 2 }}>
            {strategy.effortStatus === "high" ? "Strong effort \u2014 you can exceed your target." : strategy.effortStatus === "ok" ? "Plan is realistic with regular study." : "Increase hours or adjust target."}
          </div>
        </div>
      )}
    </div>
  );
}
