import { useReducedMotion } from "./useReducedMotion";
import "./celebrations.css";

interface Props {
  animate?: boolean;
}

export default function MasteredBadge({ animate = false }: Props) {
  const reduced = useReducedMotion();
  const shouldAnimate = animate && !reduced;

  return (
    <span className={`lt-cel-mastered-badge ${shouldAnimate ? "lt-cel-crown" : ""}`}>
      <span style={{ fontSize: 13 }}>👑</span>
      <span>Mastered</span>
    </span>
  );
}
