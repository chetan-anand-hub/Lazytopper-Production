/**
 * MI-VOICE-1 — the drawing half of the MI moment, in its OWN lazy chunk (reached only through
 * the dynamic import in ./MiVoiceRow.tsx, so the control arm never downloads the rig).
 *
 * One character (Ziggy, or Byte for an explanation). A tap only squishes him (BlobCharacter's
 * own tap); there is no navigation from the character — the card's existing link is the next
 * step. Reduced motion → a still pose, and the rig loop pauses while the sidebar is hidden or
 * off-screen (both owned by the rig).
 */
import BlobCharacter from "../BlobCharacter";
import type { MiVoiceLine } from "./miVoiceModel";
import "../guide.css";

export type MiVoiceCharacterProps = Pick<MiVoiceLine, "kind" | "pose" | "bagLabel">;

export default function MiVoiceCharacter({ kind, pose, bagLabel }: MiVoiceCharacterProps) {
  return <BlobCharacter kind={kind} pose={pose} bagLabel={bagLabel} className="lt-mi-voice__char" />;
}
