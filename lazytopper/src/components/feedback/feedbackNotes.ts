/**
 * feedbackNotes — FEEDBACK-2's optional "Tell us more" note, saved PRIVATELY to the student's own
 * account (owner ruling 24 Oct 2026): `practiceInsights/{uid}/feedbackNotes/{autoId}`.
 *
 * ★ FREE TEXT STAYS HERE. This is the ONLY place the note's words go. They are never passed to
 *   analytics.ts (GA4 / Vercel / Meta), never to the first-party activity log (names only, ruling of
 *   1 Oct 2026), never to the console. The activity log hears only the NAME
 *   `feedback_<moment>_next_note_saved` once the save succeeded (components/feedback host).
 * ★ OWNER-ONLY. firestore.rules:201-208 lets a signed-in student read and write only their own
 *   `practiceInsights/{uid}/**`; this lane does not touch the rules. The signed-in uid is checked
 *   here as well, so a note can never be written under another account.
 * ★ DPDP. The subcollection is registered in services/studentDataMap.ts (`practiceInsights.feedbackNotes`),
 *   which the server's export and erasure walk, so Download-my-data includes it and Delete-my-account
 *   removes it.
 */
import { isFirestoreEnabled, withFirestore } from "../../services/firestoreSdk";
import { FEEDBACK_NOTE_MAX, cleanNoteText } from "./gradedFeedbackFlow";

export type FeedbackNoteKind = "marks" | "other";

export interface FeedbackNoteInput {
  uid: string;
  text: string;
  kind: FeedbackNoteKind;
  /** The scorecard's surface (quick-practice, worksheet, chapter-test, full-mock, check-improve). */
  surface: string;
  /** The result's chapter topicKey, when it has one. */
  topicKey: string | null;
  /** Which "Was this useful?" ask it came from. */
  moment: string;
}

/** What a saved note holds — and nothing else. */
export interface FeedbackNoteDoc {
  text: string;
  kind: FeedbackNoteKind;
  surface: string;
  topicKey: string | null;
  moment: string;
  appVersion: string;
  createdAt: string;
}

/** The build's commit, when the host exposes it; "unknown" otherwise (there is no other runtime version). */
export function feedbackAppVersion(): string {
  try {
    const v = (import.meta.env as Record<string, unknown>).VITE_VERCEL_GIT_COMMIT_SHA;
    return typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : "unknown";
  } catch {
    return "unknown";
  }
}

/** The document that would be written (pure — pinned by a test: no field outside this list). */
export function buildFeedbackNoteDoc(input: FeedbackNoteInput, now: Date = new Date()): FeedbackNoteDoc | null {
  const text = cleanNoteText(input.text);
  if (!text || text.length > FEEDBACK_NOTE_MAX) return null;
  return {
    text,
    kind: input.kind === "marks" ? "marks" : "other",
    surface: String(input.surface || "unknown").slice(0, 40),
    topicKey: input.topicKey ? String(input.topicKey).slice(0, 120) : null,
    moment: String(input.moment || "unknown").slice(0, 40),
    appVersion: feedbackAppVersion(),
    createdAt: now.toISOString(),
  };
}

async function signedInUid(): Promise<string | null> {
  try {
    const { authClient } = await import("../../services/firebaseClient");
    const u = authClient?.currentUser ?? null;
    return u && !u.isAnonymous && typeof u.uid === "string" && u.uid ? u.uid : null;
  } catch {
    return null;
  }
}

/** Save one note. Resolves true only when Firestore accepted it; false on any failure (never throws). */
export async function saveFeedbackNote(input: FeedbackNoteInput): Promise<boolean> {
  try {
    const doc = buildFeedbackNoteDoc(input);
    if (!doc || !input.uid || !isFirestoreEnabled()) return false;
    if ((await signedInUid()) !== input.uid) return false; // an auth check before any write
    await withFirestore(({ fs, db }) => fs.addDoc(fs.collection(db, "practiceInsights", input.uid, "feedbackNotes"), doc));
    return true;
  } catch {
    return false;
  }
}
