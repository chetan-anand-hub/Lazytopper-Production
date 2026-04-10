import { useEffect, useState, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import "./celebrations.css";

interface Props {
  value: number;
  suffix?: string;
  duration?: number;
  previousBest?: number | null;
  onDone?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function CountUpReveal({
  value,
  suffix = "%",
  duration = 1200,
  previousBest,
  onDone,
  style,
  className,
}: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const [done, setDone] = useState(reduced);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      setDone(true);
      onDone?.();
      return;
    }

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDone(true);
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, reduced, onDone]);

  const isPersonalBest = previousBest != null && value > previousBest;

  return (
    <div className={className} style={style}>
      <span className={reduced ? "" : "lt-cel-countup"} style={{ display: "inline-block" }}>
        {display}{suffix}
      </span>
      {done && isPersonalBest && (
        <span className="lt-cel-pb-badge">Personal Best!</span>
      )}
    </div>
  );
}
