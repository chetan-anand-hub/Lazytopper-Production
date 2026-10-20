/**
 * MI-VOICE-1 — "MI moments": Ziggy (the student) or Byte (when it is an explanation) says the
 * Mistake Intel card's OWN fact in a student's voice. PURE, and deliberately tiny: the card
 * imports it eagerly; the drawing lives in the lazy chunk (./MiVoiceCharacter.tsx).
 *
 * ★ THE BINDING RULE (owner prototype, "MI moments"): every line is a FIXED TEMPLATE filled
 * with MI's own numbers, so a character can never claim more than MI knows. With thin data the
 * character says less, exactly like the card does. The input below is a projection of the
 * card's view state (MistakeIntelCard `miVoiceInputFor`) — strings the card already prints —
 * so no number here is computed, rounded or re-read: it is the card's text, re-voiced.
 *
 *   state        character  pose        line
 *   no-data      Ziggy      detective   No clues yet. Check one answer and I'll start looking.
 *   thin         Ziggy      detective   I need a few more clues before I can spot a pattern.
 *   untyped      Ziggy      bag         <N> marks waiting for me.        (N = the card's figure)
 *   careless     Ziggy      oops        Oops! These were slips, not the method. <amount> to win back.
 *   knowledge    Ziggy      confused    <amount> went where I didn't get the idea yet.
 *   technique    Byte       technique   On these, the working was right. <amount> went on what the examiner checks.
 *
 * loading / error / signed-out → no character. A with-data card that names no biggest loss
 * (above the gate, but no group lost anything) → no character either: the card names nothing,
 * so the character says nothing.
 */
import type { MistakeGroupKey } from "../../../lib/mistakeDisplay";
import type { MiVoiceState } from "../../../analytics/analytics";
import type { CharacterKind, Pose } from "../rig";

/** The card's view state, projected to exactly what the card prints. */
export type MiVoiceInput =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "error" }
  | { kind: "no-data" }
  /** `lost` is the card's raw figure; `lostText` is the card's `formatMarks(lost)` string. */
  | { kind: "untyped"; lost: number; lostText: string }
  /** `topLoss.amount` is the card's string exactly ("2 marks" / "3 mistakes"). */
  | { kind: "with-data"; namesWeakness: boolean; topLoss: { group: MistakeGroupKey; amount: string } | null };

/** The moments, as analytics slugs (`mi_voice_shown { state }`; the union lives in analytics.ts). */
export type { MiVoiceState };

export const MI_VOICE_STATES: readonly MiVoiceState[] = ["no_data", "thin", "untyped", "careless", "knowledge", "technique"];

export interface MiVoiceLine {
  state: MiVoiceState;
  kind: Extract<CharacterKind, "ziggy" | "byte">;
  pose: Pose;
  line: string;
  /** The sack's number (`bag` only): present only when the card's figure is a whole number ≥ 1. */
  bagLabel?: number;
}

/** The fixed templates. A function's only inputs are the card's own strings. */
export const MI_VOICE_COPY = {
  noData: "No clues yet. Check one answer and I'll start looking.",
  thin: "I need a few more clues before I can spot a pattern.",
  untyped: (lostText: string, lost: number) => `${lostText} ${lost === 1 ? "mark" : "marks"} waiting for me.`,
  careless: (amount: string) => `Oops! These were slips, not the method. ${amount} to win back.`,
  knowledge: (amount: string) => `${amount} went where I didn't get the idea yet.`,
  technique: (amount: string) => `On these, the working was right. ${amount} went on what the examiner checks.`,
} as const;

export function miVoiceFor(input: MiVoiceInput): MiVoiceLine | null {
  switch (input.kind) {
    case "loading":
    case "signed-out":
    case "error":
      return null;
    case "no-data":
      return { state: "no_data", kind: "ziggy", pose: "detective", line: MI_VOICE_COPY.noData };
    case "untyped": {
      if (!Number.isFinite(input.lost) || input.lost <= 0 || !input.lostText) return null;
      const out: MiVoiceLine = { state: "untyped", kind: "ziggy", pose: "bag", line: MI_VOICE_COPY.untyped(input.lostText, input.lost) };
      // The sack shows a number only when it is EXACTLY the card's figure (a whole number ≥ 1);
      // a fractional figure (2.5) is never rounded onto the sack.
      if (Number.isInteger(input.lost) && input.lost >= 1) out.bagLabel = input.lost;
      return out;
    }
    case "with-data": {
      if (!input.namesWeakness) return { state: "thin", kind: "ziggy", pose: "detective", line: MI_VOICE_COPY.thin };
      const top = input.topLoss;
      if (!top || !top.amount) return null;
      if (top.group === "careless") return { state: "careless", kind: "ziggy", pose: "oops", line: MI_VOICE_COPY.careless(top.amount) };
      if (top.group === "knowledge") return { state: "knowledge", kind: "ziggy", pose: "confused", line: MI_VOICE_COPY.knowledge(top.amount) };
      if (top.group === "technique") return { state: "technique", kind: "byte", pose: "technique", line: MI_VOICE_COPY.technique(top.amount) };
      return null;
    }
    default:
      return null;
  }
}
