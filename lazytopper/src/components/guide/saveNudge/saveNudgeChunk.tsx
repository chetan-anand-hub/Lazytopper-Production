/** QP-WORKING-AFTER-1 — the lazy half of the save nudge: Ziggy himself (the rig stays out of the
 *  practice page's own chunk). */
import BlobCharacter from "../BlobCharacter";
import { prefersReducedMotion } from "../rig";
import "../guide.css";

export function SaveNudgeZiggy() {
  return (
    <BlobCharacter kind="ziggy" pose="oops" className="lt-savenudge__char" still={prefersReducedMotion() || undefined} />
  );
}
