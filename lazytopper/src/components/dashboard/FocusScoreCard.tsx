import { useEffect, useState } from "react";
import { getAppFocus, getFocusMessage } from "../../services/focusTracker";
import { RingChart } from "./RingChart";

export function FocusScoreCard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const live = getAppFocus();
  const activeMin = Math.round(live.focusedMs / 60_000);
  const totalMin = Math.round(live.totalMs / 60_000);
  const pct = live.percent;
  const msg = getFocusMessage(pct);
  void tick;

  if (totalMin < 1) return null;

  const ringColor = pct >= 75 ? "#22c55e" : pct >= 50 ? "#3b82f6" : "#f97316";

  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <RingChart value={pct} size={56} strokeWidth={4} color={ringColor} />
        <span style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(0deg)",
          fontSize: 13, fontWeight: 800, color: ringColor,
        }}>{pct}%</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>Focus Score</div>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
          {activeMin} min active / {totalMin} min total
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{msg}</div>
      </div>
    </div>
  );
}
