import { useState, useEffect, useRef } from "react";

interface Props {
  onComplete: (skipped: boolean) => void;
}

export function BreathingMoment({ onComplete }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [phase, setPhase] = useState<"inhale" | "exhale">("inhale");
  const completedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onComplete]);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p === "inhale" ? "exhale" : "inhale"));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const scale = phase === "inhale" ? 1.3 : 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,197,94,0.3), rgba(34,197,94,0.05))",
        border: "2px solid rgba(34,197,94,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "transform 2.5s ease-in-out",
        transform: `scale(${scale})`,
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>
          {phase === "inhale" ? "Breathe in" : "Breathe out"}
        </span>
      </div>

      <h2 style={{
        fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 8px",
        fontFamily: "'Space Grotesk', sans-serif",
      }}>
        Take a deep breath
      </h2>
      <p style={{
        fontSize: 16, color: "var(--text-muted)", margin: "0 0 32px",
      }}>
        You've got this.
      </p>

      <div style={{
        fontSize: 32, fontWeight: 900, color: "#22c55e",
        fontFamily: "'Space Grotesk', sans-serif", marginBottom: 24,
      }}>
        {secondsLeft}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete(true);
          }
        }}
        style={{
          padding: "10px 24px", borderRadius: 10,
          border: "1px solid var(--text-muted)",
          background: "transparent", color: "var(--text-muted)",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}
      >
        Skip
      </button>
    </div>
  );
}
