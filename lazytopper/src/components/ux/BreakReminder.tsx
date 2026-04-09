import { useState, useEffect, useRef } from "react";
import { getAppFocus, isFocusTrackingEnabled } from "../../services/focusTracker";

const BREAK_THRESHOLD_MS = 25 * 60_000;
const SNOOZE_MS = 10 * 60_000;
const CHECK_INTERVAL = 30_000;

export function BreakReminder() {
  const [visible, setVisible] = useState(false);
  const baselineRef = useRef(0);
  const dismissedForSessionRef = useRef(false);
  const snoozeUntilRef = useRef(0);

  useEffect(() => {
    if (!isFocusTrackingEnabled()) return;

    baselineRef.current = getAppFocus().focusedMs;

    const check = () => {
      if (!isFocusTrackingEnabled()) return;
      if (dismissedForSessionRef.current) return;
      if (Date.now() < snoozeUntilRef.current) return;

      const focus = getAppFocus();
      const elapsed = focus.focusedMs - baselineRef.current;
      if (elapsed < BREAK_THRESHOLD_MS) return;
      setVisible(true);
    };

    const id = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => {
    setVisible(false);
    baselineRef.current = getAppFocus().focusedMs;
    dismissedForSessionRef.current = true;
  };

  const snooze = () => {
    setVisible(false);
    baselineRef.current = getAppFocus().focusedMs;
    snoozeUntilRef.current = Date.now() + SNOOZE_MS;
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: 20, maxWidth: 360, width: "100%", padding: "32px 24px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧘</div>
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px",
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          Time for a break!
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 24px" }}>
          You've been studying for 25+ minutes — great effort!
          Take 5 minutes to stretch, drink water, and rest your eyes.
        </p>
        <button
          type="button"
          onClick={dismiss}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
            cursor: "pointer", marginBottom: 10,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Got it, taking a break!
        </button>
        <button
          type="button"
          onClick={snooze}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.6)",
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          Remind me in 10 min
        </button>
      </div>
    </div>
  );
}
