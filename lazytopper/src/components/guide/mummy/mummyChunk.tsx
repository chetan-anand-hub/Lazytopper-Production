/**
 * MUMMY-1 — everything Mummy's journey DRAWS, in its own lazily loaded chunk (Vite emits it as
 * `assets/mummyChunk-<hash>.js`; the rig itself is shared with the guide chunk). Nothing reaches
 * it by a static import: ./MummyJourney.tsx loads it after the page is idle, so the /for-parents
 * page chunk never carries the rig.
 */
import "../guide.css"; // the rig host + prop keyframes (GUIDE-1's, imported unchanged)
import BlobCharacter from "../BlobCharacter";
import type { MummyPose } from "./mummyModel";

export interface MummyFigureProps {
  pose: MummyPose;
  onTap: () => void;
}

export function MummyFigure({ pose, onTap }: MummyFigureProps) {
  return <BlobCharacter kind="mummy" pose={pose} className="lt-mj__rig" onTap={onTap} />;
}
