import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import "./celebrations.css";

const PARTICLE_COLORS = ["#58cc02", "#89e219", "#1cb0f6", "#ffc800"];

interface Props {
  visible: boolean;
  onDone?: () => void;
  size?: number;
}

export default function CorrectBurst({ visible, onDone, size = 48 }: Props) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, reduced ? 100 : 500);
    return () => clearTimeout(t);
  }, [visible, reduced, onDone]);

  if (!show) return null;

  const particles = reduced
    ? []
    : Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * 360;
        const dist = 20 + Math.random() * 15;
        const dx = Math.cos((angle * Math.PI) / 180) * dist;
        const dy = Math.sin((angle * Math.PI) / 180) * dist;
        return { dx, dy, color: PARTICLE_COLORS[i % PARTICLE_COLORS.length], delay: Math.random() * 0.1 };
      });

  return (
    <span className="lt-cel-correct-wrap" aria-live="polite" aria-label="Correct!">
      <svg
        className="lt-cel-check"
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
      >
        <circle cx="24" cy="24" r="22" fill="#58cc02" />
        <path
          d="M14 24l7 7 13-13"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {particles.map((p, i) => (
        <span
          key={i}
          className="lt-cel-particle"
          style={{
            background: p.color,
            animationDelay: `${p.delay}s`,
            transform: `translate(${p.dx}px, ${p.dy}px) scale(0)`,
          }}
        />
      ))}
    </span>
  );
}
