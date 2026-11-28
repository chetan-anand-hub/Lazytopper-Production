// TUTOR-IMAGE-1 - the student's photo in a Tutor message: kill switch, wire shape, and what is stored.
//
// The photo bytes live in memory on the turn that carried them and go to the server on the LATEST student turn
// only. Earlier turns go as { hasImage: true } (the server turns that into a text placeholder); nothing is
// ever written to the stored thread except the `hasImage` flag.
import type { TutorTurn } from "./tutorClient";

/** What an image-only message is sent as. */
export const TUTOR_IMAGE_ONLY_TEXT = "Please explain this question.";

/** VITE_TUTOR_IMAGE_DISABLED=1 hides the attach button (build-time env). */
export function isTutorImageDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_TUTOR_IMAGE_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** Turns as sent to the server: only the last student turn keeps its photo bytes. */
export function toWireTurns(turns: TutorTurn[]): TutorTurn[] {
  let lastUser = -1;
  turns.forEach((t, i) => {
    if (t.role === "user") lastUser = i;
  });
  return turns.map((t, i) => {
    if (!t.image) return t;
    if (i === lastUser && i === turns.length - 1) return t;
    const { image: _drop, ...rest } = t;
    void _drop;
    return { ...rest, hasImage: true as const };
  });
}

/** Turns as stored (Firestore + local mirror): photo bytes never persist; the flag does. */
export function toStoredTurns(turns: TutorTurn[]): TutorTurn[] {
  return turns.map((t) => {
    if (!t.image) return t;
    const { image: _drop, ...rest } = t;
    void _drop;
    return { ...rest, hasImage: true as const };
  });
}
