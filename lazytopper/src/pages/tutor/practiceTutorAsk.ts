// src/pages/tutor/practiceTutorAsk.ts
// TUTOR-Q-1 — Quick Practice's "Ask the tutor about this concept" opens the tutor ON THAT QUESTION.
//
// The tutor URL carries the bank question id as `q` (ids only, never free text). The rest of what the
// tutor needs to open honestly — the question's number in the set, the option the student picked and
// whether that pick was right — waits in a THIS-TAB sessionStorage one-shot, written by the practice
// page on the student's tap and read back ONCE by the tutor for the same `q`.
//
// What it holds: a bank question id, its 1-based position, the picked option's TEXT and a right/wrong
// flag. Never the uid, never the student's typed working. Nothing here grades, scores, records or calls
// the network; the right/wrong flag is the one the question card already computed for the pick.
//
// A sibling of signedOutScorecardAsk.ts (same shape, different key and different copy): the signed-out
// module is untouched, so its behaviour and tests stay byte-identical.

/** The one-shot's sessionStorage key (registered in services/studentDataMap.ts). */
export const PRACTICE_ASK_KEY = "lazytopper.tutorPracticeAsk.v1";
/** A one-shot older than this is stale (an abandoned hop) and is dropped unread. */
export const PRACTICE_ASK_TTL_MS = 60 * 60 * 1000;

export interface PracticeTutorAsk {
  /** The bank question id (the same value as the tutor URL's `q`). */
  q: string;
  /** The question's 1-based position in the set on screen ("Question 3"); null when unknown. */
  qNumber: number | null;
  /** The option TEXT the student picked; null when they did not pick one (or it could not be read). */
  pick: string | null;
  /** Whether that pick was the right option; null whenever `pick` is null. */
  correct: boolean | null;
  /** `practiceOwnerTag` of the account that tapped (never the uid). */
  owner: string;
  /** When it was stored (ms). */
  at: number;
}

function clear(): void {
  try {
    sessionStorage.removeItem(PRACTICE_ASK_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

/** Store the one-shot. Called ONLY on the student's tap. Best effort: without it the tutor still opens
 *  on the question's chapter and concept, exactly as before. */
export function stashPracticeTutorAsk(
  ask: { q: string; owner: string; qNumber?: number | null; pick?: string | null; correct?: boolean | null },
  now: number = Date.now(),
): void {
  const pick = typeof ask.pick === "string" && ask.pick.trim() ? ask.pick.trim().slice(0, 500) : null;
  // A pick without a known verdict is never stored: the tutor must not guess right or wrong.
  const correct = pick !== null && typeof ask.correct === "boolean" ? ask.correct : null;
  const value: PracticeTutorAsk = {
    q: String(ask.q).slice(0, 200),
    qNumber: Number.isInteger(ask.qNumber) && (ask.qNumber as number) > 0 ? (ask.qNumber as number) : null,
    pick: correct === null ? null : pick,
    correct,
    owner: String(ask.owner).slice(0, 40),
    at: now,
  };
  try {
    sessionStorage.setItem(PRACTICE_ASK_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: the tutor simply opens normally */
  }
}

/** Read the one-shot for `questionId` and delete it (consumed once). A one-shot for another question is
 *  left for its own hop; a stale or malformed one is dropped. */
export function takePracticeTutorAsk(questionId: string, owner: string, now: number = Date.now()): PracticeTutorAsk | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PRACTICE_ASK_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: Partial<PracticeTutorAsk> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<PracticeTutorAsk>;
  } catch {
    parsed = null;
  }
  if (
    !parsed ||
    typeof parsed.q !== "string" ||
    typeof parsed.at !== "number" ||
    now - parsed.at > PRACTICE_ASK_TTL_MS ||
    parsed.at - now > 60_000
  ) {
    clear();
    return null;
  }
  if (parsed.q !== questionId) return null;
  clear();
  // Another account's tap on this tab: dropped (above), never shown to this account.
  if (parsed.owner !== owner) return null;
  const pick = typeof parsed.pick === "string" && typeof parsed.correct === "boolean" ? parsed.pick : null;
  return {
    q: parsed.q,
    qNumber: typeof parsed.qNumber === "number" ? parsed.qNumber : null,
    pick,
    correct: pick === null ? null : (parsed.correct as boolean),
    owner,
    at: parsed.at,
  };
}

/** Delete the one-shot if it is for `questionId` (another path handled that hop, so it must not wait to
 *  be read later). A one-shot for another question is left alone. */
export function discardPracticeTutorAsk(questionId: string): void {
  try {
    const raw = sessionStorage.getItem(PRACTICE_ASK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { q?: unknown };
    if (parsed && parsed.q === questionId) clear();
  } catch {
    clear();
  }
}

function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** The tutor's opener for a Quick Practice ask. Names the question (the bank's own text when it could be
 *  read) and, when the student answered an MCQ, their pick and the verdict the card showed. It never
 *  says "wrong" for a right pick or the reverse, and invents nothing when a piece is missing. */
export function composePracticeAskOpener(
  ask: PracticeTutorAsk,
  topicLabel: string,
  questionText: string,
): { text: string; follow: { label: string; send: string } } {
  const which = ask.qNumber ? `Question ${ask.qNumber}` : "a question";
  const quoted = questionText && questionText.trim() ? `: "${shorten(questionText, 180)}".` : ".";
  const lead = `You were on ${which} from your ${topicLabel} practice${quoted}`;
  const goThrough = ask.qNumber ? `Question ${ask.qNumber}` : "this question";
  if (ask.pick && ask.correct === true) {
    const pick = shorten(ask.pick, 120);
    return {
      text: `${lead} You picked "${pick}" — that's right. What would you like to go through?`,
      follow: {
        label: "Why is it right?",
        send: `Let's go through ${goThrough}: why is "${pick}" right, and what's the trap in the other options?`,
      },
    };
  }
  if (ask.pick && ask.correct === false) {
    const pick = shorten(ask.pick, 120);
    return {
      text: `${lead} You picked "${pick}", which isn't the right option. Want to go through why, and where the trap is?`,
      follow: {
        label: "Why was I wrong?",
        send: `Let's go through ${goThrough}: I chose "${pick}". Why was that wrong?`,
      },
    };
  }
  return {
    text: `${lead} What would you like to go through?`,
    follow: { label: "Explain this question", send: `Let's go through ${goThrough} step by step.` },
  };
}
