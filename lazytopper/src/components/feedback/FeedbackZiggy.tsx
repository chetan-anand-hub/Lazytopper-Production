/**
 * FEEDBACK-2 — Ziggy himself, as a lazy chunk so the rig stays out of the scorecard's own chunk
 * (the same pattern as guide/saveNudge/saveNudgeChunk.tsx). Decorative: the SVG is aria-hidden; the
 * words he "says" are real text in the card's bubble. Default export so React.lazy can load it.
 */
import BlobCharacter from "../guide/BlobCharacter";
import { prefersReducedMotion } from "../guide/rig";
import "../guide/guide.css";

export default function FeedbackZiggy() {
  return <BlobCharacter kind="ziggy" pose="happy" className="lt-fbg__z" still={prefersReducedMotion() || undefined} />;
}
