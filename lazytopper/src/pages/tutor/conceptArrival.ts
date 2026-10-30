// src/pages/tutor/conceptArrival.ts
// TUTOR-UX-1 (B) — arriving on a RESTORED thread with a `concept` param.
//
// Why this exists: TutorPage reads `concept` from the URL (TutorPage.tsx:211) and
// useTutorSession hydrates `messages` from the saved thread for the chapter
// (useTutorSession.ts:~215). The concept-aware opener (buildOpener, useTutorSession.ts:149) is
// rendered only while `messages.length === 0` (TutorPage.tsx:~437), so on an existing thread
// the student's new concept shows nowhere but the header. These pure helpers decide when to add
// a display-only "Now on: <concept>" divider and what two starter chips to offer. Nothing here
// touches the model, the thread, or storage.
import type { TutorTurn } from "../../ai/tutorClient";

/** The concept label up to the first formula / parenthesis: "Mirror formula (1/v + 1/u = 1/f)"
 *  -> "Mirror formula". Falls back to the whole label when nothing precedes the cut. */
export function shortConcept(label: string): string {
  const t = (label ?? "").trim();
  const cut = t.search(/[(=:—]/);
  const head = (cut > 0 ? t.slice(0, cut) : t).trim();
  return head || t;
}

export interface StarterChip {
  /** What the chip shows AND what it puts in the composer (it never sends). */
  text: string;
}

export function starterChips(label: string): StarterChip[] {
  return [{ text: `Explain ${shortConcept(label)} simply` }, { text: "Where am I losing marks here?" }];
}

export function arrivalDividerText(label: string): string {
  return `Now on: ${(label ?? "").trim()}`;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Index to render the divider AFTER (== the restored thread's length), or null when no divider
 * should show: no concept, no restored thread, the thread is just a returned-work / away note
 * (the student is coming back from a round trip, not switching concept), or the last turn
 * already mentions the concept.
 */
export function arrivalDividerIndex(args: {
  concept: string | undefined;
  messages: ReadonlyArray<TutorTurn>;
  pending: unknown;
}): number | null {
  const concept = args.concept?.trim();
  if (!concept || args.messages.length === 0 || args.pending) return null;
  const last = args.messages[args.messages.length - 1];
  if (last.kind === "return-result" || last.kind === "away-cue") return null;
  const text = norm(last.content ?? "");
  if (text.includes(norm(concept)) || text.includes(norm(shortConcept(concept)))) return null;
  return args.messages.length;
}
