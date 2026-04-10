import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import "./celebrations.css";

const COLORS = ["#58cc02", "#1cb0f6", "#ff9600", "#ffc800", "#ce82ff", "#ff4b4b"];

interface Props {
  visible: boolean;
  onDone?: () => void;
  badge?: { emoji: string; title: string; subtitle: string };
  shareCard?: { text: string; onShare?: () => void };
  duration?: number;
}

export default function ConfettiCelebration({ visible, onDone, badge, shareCard, duration = 3500 }: Props) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, reduced ? 500 : duration);
    return () => clearTimeout(t);
  }, [visible, reduced, duration, onDone]);

  if (!show) return null;

  const pieces = reduced
    ? []
    : Array.from({ length: 50 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        bg: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.8}s`,
        dur: `${1.8 + Math.random() * 1.5}s`,
        w: `${6 + Math.random() * 8}px`,
        h: `${6 + Math.random() * 8}px`,
        rot: `${Math.random() * 360}deg`,
      }));

  return (
    <>
      <div className="lt-cel-confetti-overlay" aria-hidden="true">
        {pieces.map((p, i) => (
          <div
            key={i}
            className="lt-cel-confetti-piece"
            style={{
              left: p.left,
              background: p.bg,
              animationDelay: p.delay,
              animationDuration: p.dur,
              width: p.w,
              height: p.h,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        ))}
      </div>

      {badge && (
        <div
          className="lt-cel-milestone-overlay"
          onClick={() => { setShow(false); onDone?.(); }}
          role="dialog"
          aria-label={badge.title}
        >
          <div className="lt-cel-milestone-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 12 }} className="lt-cel-badge-pop">
              {badge.emoji}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
              {badge.title}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: "0 0 20px" }}>
              {badge.subtitle}
            </p>
            {shareCard && (
              <button
                onClick={shareCard.onShare}
                style={{
                  background: "#25d366",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 24px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  marginBottom: 8,
                  width: "100%",
                }}
              >
                Share on WhatsApp
              </button>
            )}
            <button
              onClick={() => { setShow(false); onDone?.(); }}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
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
      )}
    </>
  );
}
