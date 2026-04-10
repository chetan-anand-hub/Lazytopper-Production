import { useEffect, useState, useMemo } from "react";
import { useReducedMotion } from "./useReducedMotion";
import "./celebrations.css";

const ENCOURAGEMENTS = [
  "Almost there!",
  "Keep going!",
  "You'll get it!",
  "Don't give up!",
  "Try again!",
  "So close!",
  "You're learning!",
  "Next time!",
];

interface Props {
  visible: boolean;
  onDone?: () => void;
  children?: React.ReactNode;
}

export default function WrongShake({ visible, onDone, children }: Props) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);
  const message = useMemo(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
    [visible],
  );

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

  return (
    <div aria-live="polite">
      <div className={reduced ? "" : "lt-cel-shake"}>
        {children || (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" fill="#ff9600" opacity="0.15" />
            <circle cx="24" cy="24" r="22" stroke="#ff9600" strokeWidth="2" />
            <path d="M17 17l14 14M31 17L17 31" stroke="#ff9600" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="lt-cel-encouragement" style={{ color: "#ff9600", marginTop: 4, textAlign: "center" }}>
        {message}
      </div>
    </div>
  );
}
