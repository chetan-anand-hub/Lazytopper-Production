import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import "./celebrations.css";

interface Props {
  visible: boolean;
  streak: number;
  onDone?: () => void;
}

export default function DayComplete({ visible, streak, onDone }: Props) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, reduced ? 500 : 2500);
    return () => clearTimeout(t);
  }, [visible, reduced, onDone]);

  if (!show) return null;

  return (
    <div
      className="lt-cel-milestone-overlay"
      onClick={() => { setShow(false); onDone?.(); }}
      role="dialog"
      aria-label="Day Complete"
    >
      <div className="lt-cel-milestone-card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-cel-day-complete" style={{ fontSize: 48, marginBottom: 8 }}>
          ✅
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
          Day Complete!
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" }}>
          Great work today. Keep the streak alive!
        </p>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#ff9600", marginBottom: 4 }}>
          🔥 <span className="lt-cel-streak-num">{streak}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          day streak
        </div>
        <button
          onClick={() => { setShow(false); onDone?.(); }}
          style={{
            background: "var(--bg-card)",
            color: "var(--text)",
            border: "1px solid var(--text-muted)",
            borderRadius: 12,
            padding: "10px 24px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
