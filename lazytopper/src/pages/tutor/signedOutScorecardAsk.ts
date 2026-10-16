// src/pages/tutor/signedOutScorecardAsk.ts
// TUTOR-FIX-2 T12 — the SIGNED-OUT scorecard's "Ask the tutor why I lost this mark".
//
// A signed-out visitor's Quick Practice result is never persisted, so there is no record for the
// tutor's `from=` hop to read. Instead, when the visitor chooses Sign up on the prompt:
//   · the post-auth target is the chapter tutor: /tutor/10/<Subject>/<chapter>?source=scorecard&q=<bank id>
//     (ids only — never free text in the URL);
//   · the question id + the option the student picked go in a THIS-TAB sessionStorage one-shot
//     (never the uid: the visitor has none yet), read back ONCE by the tutor for the same `q`.
// Nothing here grades, scores, records or calls the network.

import { buildTutorPath } from "./tutorPath";
import { isSafeInternalPath } from "../../utils/safeInternalPath";

/** The one-shot's sessionStorage key (registered in services/studentDataMap.ts). */
export const SIGNED_OUT_ASK_KEY = "lazytopper.tutorSignupAsk.v1";
/** A one-shot older than this is stale (an abandoned sign-up) and is dropped unread. */
export const SIGNED_OUT_ASK_TTL_MS = 60 * 60 * 1000;
/** The prompt's line (owner ruling, TUTOR-FIX-2 T12). */
export const SIGNUP_TO_ASK_COPY =
  "Sign up free to ask the tutor why you lost this mark - your 7-day trial starts when you sign up.";

export interface SignedOutAsk {
  /** The bank question id (the same value as the tutor URL's `q`). */
  q: string;
  /** The question's 1-based position on the scorecard ("Question 3"); null when unknown. */
  qNumber: number | null;
  /** The option text the student picked; null when none was readable. */
  pick: string | null;
  /** When it was stored (ms). */
  at: number;
}

/** The post-sign-up target: the chapter tutor with `source=scorecard&q=<id>`, nothing else.
 *  Null when the built path would not pass Login's same-origin guard (it is then not offered). */
export function signedOutTutorPath(input: {
  subject: "Maths" | "Science";
  topicKey: string;
  grade?: string;
  questionId: string;
}): string | null {
  if (!input.topicKey || !input.questionId) return null;
  const path = buildTutorPath({
    subject: input.subject,
    topicKey: input.topicKey,
    grade: input.grade,
    source: "scorecard",
    questionId: input.questionId,
  });
  return isSafeInternalPath(path) ? path : null;
}

function clear(): void {
  try {
    sessionStorage.removeItem(SIGNED_OUT_ASK_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Store the one-shot. Called ONLY when the visitor chooses Sign up. Best effort. */
export function stashSignedOutAsk(
  ask: { q: string; qNumber?: number | null; pick?: string | null },
  now: number = Date.now(),
): void {
  const value: SignedOutAsk = {
    q: String(ask.q).slice(0, 200),
    qNumber: Number.isInteger(ask.qNumber) && (ask.qNumber as number) > 0 ? (ask.qNumber as number) : null,
    pick: typeof ask.pick === "string" && ask.pick.trim() ? ask.pick.trim().slice(0, 500) : null,
    at: now,
  };
  try {
    sessionStorage.setItem(SIGNED_OUT_ASK_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: the tutor simply opens normally */
  }
}

/** Read the one-shot for `questionId` and delete it (consumed once). A one-shot for another
 *  question is left for its own hop; a stale or malformed one is dropped. */
export function takeSignedOutAsk(questionId: string, now: number = Date.now()): SignedOutAsk | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(SIGNED_OUT_ASK_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: Partial<SignedOutAsk> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<SignedOutAsk>;
  } catch {
    parsed = null;
  }
  if (
    !parsed ||
    typeof parsed.q !== "string" ||
    typeof parsed.at !== "number" ||
    now - parsed.at > SIGNED_OUT_ASK_TTL_MS ||
    parsed.at - now > 60_000
  ) {
    clear();
    return null;
  }
  if (parsed.q !== questionId) return null;
  clear();
  return {
    q: parsed.q,
    qNumber: typeof parsed.qNumber === "number" ? parsed.qNumber : null,
    pick: typeof parsed.pick === "string" ? parsed.pick : null,
    at: parsed.at,
  };
}

function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** The tutor's opener for a signed-out scorecard ask: names the question (the bank's own text
 *  when available) and the student's pick. No marks are claimed beyond "not the right option",
 *  which is what the scorecard showed; nothing is invented when a piece is missing. */
export function composeSignedOutAskOpener(
  ask: SignedOutAsk,
  topicLabel: string,
  questionText: string,
): { text: string; follow: { label: string; send: string } } {
  const which = ask.qNumber ? `Question ${ask.qNumber}` : "a question";
  const quoted = questionText && questionText.trim() ? `: "${shorten(questionText, 180)}"` : "";
  const chose = ask.pick ? ` You chose "${shorten(ask.pick, 120)}", which was not the right option.` : "";
  const text =
    `You asked about ${which} from your ${topicLabel} practice${quoted || "."}${chose} ` +
    "Want to go through why the right answer is right, and where the trap is?";
  const send = ask.pick
    ? `Let's go through ${ask.qNumber ? `Question ${ask.qNumber}` : "this question"}: I chose "${shorten(ask.pick, 120)}". Why was that wrong?`
    : `Let's go through ${ask.qNumber ? `Question ${ask.qNumber}` : "this question"}: why was my answer wrong?`;
  return { text, follow: { label: "Why was I wrong?", send } };
}
