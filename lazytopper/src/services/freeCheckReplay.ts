/**
 * freeCheckReplay — FREE-CHECK-1b, R8: "sign up to save it" is literal.
 *
 * A signed-out visitor's free result waits on the device (freeCheckClient, text only).
 * When they next open /check-improve SIGNED IN, this writes it through the SAME front
 * doors a signed-in check uses — `recordMistake` + `recordAttempt`, plus the session
 * record via `persistCheckImproveSession` — so it counts toward Mistake Intelligence
 * exactly like any other check.
 *
 * ★ WHY THIS IS ITS OWN MODULE (N10). The CI ops gates pin the page to exactly two call
 * sites each of `recordMistake(`, `recordAttempt(` and `persistCheckImproveSession({`.
 * A third site on the page would fail them; a new module is the precedent the
 * `*GradeService.ts` modules already set (MI contract T1 polices writers of the log
 * store, not callers of the front door).
 *
 * THE THREE HAZARDS IT EXISTS TO HANDLE (N14):
 *  1. TIMING. The attempt store is scoped by the ACTIVE PROGRESS uid, which AuthContext
 *     sets in an effect — and a child's effects run before its parent provider's. So
 *     the replay refuses to run (`not-ready`) until that uid equals the signed-in uid.
 *  2. GRADE TIME. `recordAttempt` keeps the grade time via its `timestamp`, and
 *     `recordMistake` via its `gradedAt` (SCORECARD-MI-1, GA-41) — both carry the
 *     ORIGINAL grade time, so the attempt and the MI entry fall in the same Me window.
 *  3. THE SESSION CODE IS RE-MINTED. A signed-out mint reads no records, so it is
 *     always sequence 1, and record id = code. Replaying that code for a RETURNING
 *     student who already has paper #01 in the same subject/topic would OVERWRITE it and
 *     collide on the `ci:{code}:q{n}` MI ids. The code is minted again here, signed in,
 *     from their real record count.
 *
 * EXACTLY ONCE. The pending result is CLAIMED (read and removed) synchronously before
 * the first await, so a concurrent second call finds nothing. A replay that throws puts
 * it back on the device (it still expires two hours after it was graded).
 *
 * ★ OR-18 — ONLY WITH SIGN-IN INTENT. A waiting result is saved ONLY if this tab holds
 * the sign-in marker written when a free-check sign-in link was clicked, AND the marker
 * equals the waiting result's `gradedAt`. A sign-in without it — another person on a
 * shared device, another tab, the navbar's "Log in" — saves nothing and shows no trial
 * offer; the result is left to expire (2h, freeCheckClient). The marker is cleared after
 * the replay, whether it saved or failed.
 */
import type { AuthUser } from "../context/AuthContext";
import type { CheckSolutionResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import { recordMistake } from "./mistakeIntelligence";
import { recordAttempt } from "./practiceInsights";
import { ensureCheckImproveSessionCode } from "./sessionRecords";
import {
  deriveTopicSource,
  persistCheckImproveSession,
  singleCheckToWorksheetResponse,
  toSessionSubject,
} from "./checkImproveGradeService";
import { getActiveProgressUser } from "./studentProgressStore";
import {
  claimPendingFreeCheck,
  clearFreeCheckSigninIntent,
  hasFreeCheckSigninIntentFor,
  peekPendingFreeCheck,
  restorePendingFreeCheck,
  type PendingFreeCheck,
} from "./freeCheckClient";
import { trackNamedEvent } from "../analytics/analytics";
import {
  ciQuestionIds,
  isMixedPaper,
  perQuestionFiling,
} from "../utils/checkImproveDetection";
import { isGradedQuestion, v2GradeFields, withEffectiveCounts } from "../lib/mistakeDisplay";
import type { DesktopSubject } from "../lib/desktop/navigation";

export type FreeCheckReplayOutcome =
  | { kind: "none" }
  | { kind: "not-ready" }
  | { kind: "saved"; code: string }
  /**
   * FREECHECK-2 · F2 — `offline`: the browser had no network when it failed, so the
   * caller waits for `online` rather than offering a button. `gradedAt` names the result
   * THIS tab tried to save, so a resume (below) retries exactly that one.
   */
  | { kind: "failed"; offline: boolean; gradedAt: number };

/** F2 — did this failure happen for lack of network? */
export function isOfflineFailure(error: unknown): boolean {
  try {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  } catch {
    /* ignore */
  }
  const e = error as { name?: unknown; message?: unknown; code?: unknown } | null;
  if (e && e.code === "unavailable") return true; // Firestore: the backend could not be reached
  return Boolean(
    e && e.name === "TypeError" && /failed to fetch|network/i.test(String(e.message ?? "")),
  );
}

/** A real, persisting account whose progress scope is already active. */
export function isReplayReady(user: AuthUser | null | undefined): boolean {
  if (!user?.uid || user.isLocalSession) return false;
  return getActiveProgressUser() === user.uid;
}

/** The page's `multiQuestionToCsr`, mirrored: one legible per-question grade → the MI shape.
 *  ME-ENGINE-1 PR-1 (G12) — mirrored IN FULL: the page's adapter carries the v2 grade fields
 *  (`v2GradeFields`: marks per type, could-not-read / answer-mismatch / not-graded state) and
 *  this copy did not, so a replayed paper wrote the OLD count-only shape and lost the very
 *  state `isGradedQuestion` reads. Whatever the parked grade carries now travels. */
function toCsr(g: WorksheetQuestionGrade): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: Number(g.totalMarks) || 0,
    marksAwarded: Number(g.marksAwarded) || 0,
    percentage: Number(g.percentage) || 0,
    annotatedSteps: g.annotatedSteps ?? [],
    mistakeSummary: g.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: g.teacherNote ?? "",
    ...v2GradeFields(g),
  };
}

/** Returns the minted session code, or null when the parked result held NOTHING gradable to
 *  save (ME-ENGINE-1 PR-1, G12 — a single answer that was not graded). */
async function writePending(user: AuthUser, pending: PendingFreeCheck): Promise<string | null> {
  // G12 — the live page parks the free result BEFORE its graded check
  // (DesktopCheckImprovePage: `recordFreeCheckSuccess` precedes `isGradedQuestion`), so the
  // replay must apply that check itself, exactly where the page does: a single answer that was
  // NOT graded (could not be read, option unread, answer does not match the question) records
  // NOTHING — no MI entry, no attempt, no session record — and no session code is minted for it.
  if (pending.kind === "single" && !isGradedQuestion(pending.graded)) return null;
  const sessionSubject = toSessionSubject(pending.subject);
  // Hazard 3: minted NOW, signed in — never the signed-out code.
  const nomen = await ensureCheckImproveSessionCode(
    sessionSubject,
    pending.topicSlug,
    pending.topicName,
    user,
  );
  const topicSource = deriveTopicSource(pending.topicSlug, pending.topicTouched);

  if (pending.kind === "single") {
    const graded = pending.graded;
    await recordMistake(user, graded, {
      subject: pending.subject,
      topic: pending.topicName,
      topicKey: pending.topicSlug,
      question: pending.question,
      // SCORECARD-MI-1 — the same stable identity a signed-in grade of this session gets.
      surface: "check-improve",
      submissionId: nomen.code,
      gradedAt: pending.gradedAt, // GA-41
    });
    recordAttempt(user, {
      subject: pending.subject,
      topic: pending.topicName,
      topicKey: pending.topicSlug,
      question: pending.question,
      marksScored: graded.marksAwarded,
      marksAvailable: graded.totalMarks,
      mode: "graded",
      marksSource: pending.marksSource ?? undefined,
      detectionOverride: pending.detectionOverride,
      timestamp: pending.gradedAt, // hazard 2
      // H1 — the same submission identity as the MI entry above: a replay replaces, never adds.
      surface: "check-improve",
      submissionId: nomen.code,
      grade: graded,
    });
    persistCheckImproveSession({
      user,
      code: nomen.code,
      title: nomen.name,
      subject: sessionSubject,
      topicSlug: pending.topicSlug,
      topicSource,
      // H4/H9 — the adapter itself now carries the `objective` flag and the v2 fields (one path).
      response: withEffectiveCounts(singleCheckToWorksheetResponse(graded)),
    });
    return nomen.code;
  }

  // SCORECARD-MI-1 — the replay files exactly as a signed-in grade does: ONE set of counts,
  // each question under its OWN subject and chapter, a mixed paper recorded as mixed.
  const response = withEffectiveCounts(pending.response);
  const paperMixed = isMixedPaper(response.results);
  const paperFiling = {
    subject: (pending.subject === "Science" ? "Science" : "Maths") as DesktopSubject,
    topicName: pending.topicName,
    topicSlug: pending.topicSlug,
  };
  persistCheckImproveSession({
    user,
    code: nomen.code,
    title: nomen.name,
    subject: sessionSubject,
    topicSlug: paperMixed ? "" : pending.topicSlug,
    topicSource: paperMixed ? "mixed" : topicSource,
    response,
  });
  const questionIds = ciQuestionIds(nomen.code, response.results);
  for (const [gi, g] of response.results.entries()) {
    // G12 — every NOT-GRADED state (could not be read, option unread, answer does not match,
    // the server's notGraded), not only couldNotRead: such a row is never a 0 and never an entry.
    if (!isGradedQuestion(g)) continue;
    const csr = toCsr(g);
    const questionId = questionIds[gi];
    const qText =
      pending.questions.find((q) => q.questionNumber === g.qNumber)?.questionText ||
      `${nomen.code} · Q${g.qNumber}`;
    const filing = perQuestionFiling(g, paperFiling, paperMixed);
    // eslint-disable-next-line no-await-in-loop
    await recordMistake(user, csr, {
      subject: filing.subject,
      topic: filing.topicName,
      topicKey: filing.topicSlug,
      question: qText,
      questionId,
      surface: "check-improve",
      submissionId: nomen.code,
      gradedAt: pending.gradedAt, // GA-41
    });
    recordAttempt(user, {
      subject: filing.subject,
      topic: filing.topicName,
      topicKey: filing.topicSlug,
      question: qText,
      questionId,
      marksScored: csr.marksAwarded,
      marksAvailable: csr.totalMarks,
      mode: "graded",
      timestamp: pending.gradedAt, // hazard 2
      surface: "check-improve",
      submissionId: nomen.code,
      grade: csr,
    });
  }
  return nomen.code;
}

/**
 * Replay the waiting free result into `user`'s account. `not-ready` leaves it waiting
 * (the progress scope is not this uid yet); `none` means there was nothing to replay.
 */
export async function replayPendingFreeCheck(
  user: AuthUser | null | undefined,
  resumeGradedAt?: number,
): Promise<FreeCheckReplayOutcome> {
  if (!user?.uid || user.isLocalSession) return { kind: "none" };
  const waiting = peekPendingFreeCheck(); // expired → null (and deleted), OR-18
  if (!waiting) return { kind: "none" };
  // ★ OR-18 — no marker (or one for a different result), no save. Left to expire.
  // FREECHECK-2 · F2 — a RESUME is this tab retrying a save it already started (the
  // marker was spent by that first replay). It is honoured only for the exact result
  // that replay failed on, whose `gradedAt` only this tab's memory holds.
  const intended =
    resumeGradedAt !== undefined
      ? waiting.gradedAt === resumeGradedAt
      : hasFreeCheckSigninIntentFor(waiting.gradedAt);
  if (!intended) return { kind: "none" };
  if (!isReplayReady(user)) return { kind: "not-ready" }; // hazard 1
  const pending = claimPendingFreeCheck();
  if (!pending) return { kind: "none" };
  try {
    const code = await writePending(user, pending);
    // R10 — a count, no identifier. Fired here, once per replay, not per render.
    trackNamedEvent("free_check_signup");
    // G12 — nothing gradable was waiting: nothing was saved, and the page must not say it was.
    if (code === null) return { kind: "none" };
    return { kind: "saved", code };
  } catch (error) {
    console.warn("[freeCheckReplay] replay failed; the result stays on the device", error);
    restorePendingFreeCheck(pending);
    return { kind: "failed", offline: isOfflineFailure(error), gradedAt: pending.gradedAt };
  } finally {
    // OR-18 — the intent is spent by the replay, saved or failed.
    clearFreeCheckSigninIntent();
  }
}

/**
 * One in-flight replay per uid, shared. React StrictMode (and any remount) runs the
 * page's effect twice; the second run must join the first replay, not find the claimed
 * key gone and conclude there was nothing to save.
 */
const inflight = new Map<string, Promise<FreeCheckReplayOutcome>>();

export function getInflightFreeCheckReplay(uid: string): Promise<FreeCheckReplayOutcome> | null {
  return inflight.get(uid) ?? null;
}

export function startFreeCheckReplay(
  user: AuthUser,
  resumeGradedAt?: number,
): Promise<FreeCheckReplayOutcome> {
  const existing = inflight.get(user.uid);
  if (existing) return existing;
  const run = replayPendingFreeCheck(user, resumeGradedAt).finally(() => {
    inflight.delete(user.uid);
  });
  inflight.set(user.uid, run);
  return run;
}

/* ─────────── FREECHECK-2 · F2 — what the "saving" panel shows ─────────── */

/**
 * The save panel's state. The page shows its saving panel for as long as the return
 * hook reports `"saving"`; WHAT that panel says comes from here, so an offline or failed
 * save is never an endless "Saving your answer…":
 *   saving   the write is running
 *   offline  no network — it resumes by itself on the browser `online` event
 *   failed   anything else — the panel offers a "Try again" button (`retry`)
 */
export type FreeCheckSaveStatus = "saving" | "offline" | "failed";

let saveStatus: FreeCheckSaveStatus = "saving";
let saveRetry: (() => void) | null = null;
const saveListeners = new Set<() => void>();

export function getFreeCheckSaveStatus(): FreeCheckSaveStatus {
  return saveStatus;
}

export function subscribeFreeCheckSaveStatus(listener: () => void): () => void {
  saveListeners.add(listener);
  return () => {
    saveListeners.delete(listener);
  };
}

/** Set by the return hook. `retry` is kept only for `failed`. */
export function setFreeCheckSaveStatus(next: FreeCheckSaveStatus, retry: (() => void) | null = null): void {
  const nextRetry = next === "failed" ? retry : null;
  if (next === saveStatus && nextRetry === saveRetry) return;
  saveStatus = next;
  saveRetry = nextRetry;
  saveListeners.forEach((l) => l());
}

/** The "Try again" button. A no-op unless the save is `failed`. */
export function retryFreeCheckSave(): void {
  if (saveStatus === "failed" && saveRetry) saveRetry();
}

/** Test seam: back to the initial `saving`, no retry, no listeners. */
export function __resetFreeCheckSaveStatusForTests(): void {
  saveStatus = "saving";
  saveRetry = null;
  saveListeners.clear();
}
