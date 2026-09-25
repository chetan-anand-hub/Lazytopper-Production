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
 *  2. GRADE TIME. `recordAttempt` keeps the grade time via its `timestamp`.
 *     (`recordMistake` stamps the replay time itself; it takes no timestamp.)
 *  3. THE SESSION CODE IS RE-MINTED. A signed-out mint reads no records, so it is
 *     always sequence 1, and record id = code. Replaying that code for a RETURNING
 *     student who already has paper #01 in the same subject/topic would OVERWRITE it and
 *     collide on the `ci:{code}:q{n}` MI ids. The code is minted again here, signed in,
 *     from their real record count.
 *
 * EXACTLY ONCE. The pending result is CLAIMED (read and removed) synchronously before
 * the first await, so a concurrent second call finds nothing. A replay that throws puts
 * it back, so the next visit can try again.
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
  peekPendingFreeCheck,
  restorePendingFreeCheck,
  type PendingFreeCheck,
} from "./freeCheckClient";
import { trackNamedEvent } from "../analytics/analytics";

export type FreeCheckReplayOutcome =
  | { kind: "none" }
  | { kind: "not-ready" }
  | { kind: "saved"; code: string }
  | { kind: "failed" };

/** A real, persisting account whose progress scope is already active. */
export function isReplayReady(user: AuthUser | null | undefined): boolean {
  if (!user?.uid || user.isLocalSession) return false;
  return getActiveProgressUser() === user.uid;
}

/** The page's `multiQuestionToCsr`, mirrored: one legible per-question grade → the MI shape. */
function toCsr(g: WorksheetQuestionGrade): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: Number(g.totalMarks) || 0,
    marksAwarded: Number(g.marksAwarded) || 0,
    percentage: Number(g.percentage) || 0,
    annotatedSteps: g.annotatedSteps ?? [],
    mistakeSummary: g.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: g.teacherNote ?? "",
  };
}

async function writePending(user: AuthUser, pending: PendingFreeCheck): Promise<string> {
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
    });
    persistCheckImproveSession({
      user,
      code: nomen.code,
      title: nomen.name,
      subject: sessionSubject,
      topicSlug: pending.topicSlug,
      topicSource,
      response: singleCheckToWorksheetResponse(graded),
    });
    return nomen.code;
  }

  const response = pending.response;
  persistCheckImproveSession({
    user,
    code: nomen.code,
    title: nomen.name,
    subject: sessionSubject,
    topicSlug: pending.topicSlug,
    topicSource,
    response,
  });
  for (const g of response.results) {
    if (g.couldNotRead) continue; // pending is never a 0 and never a fabricated entry
    const csr = toCsr(g);
    const questionId = `ci:${nomen.code}:q${g.qNumber}`;
    const qText =
      pending.questions.find((q) => q.questionNumber === g.qNumber)?.questionText ||
      `${nomen.code} · Q${g.qNumber}`;
    // eslint-disable-next-line no-await-in-loop
    await recordMistake(user, csr, {
      subject: pending.subject,
      topic: pending.topicName,
      topicKey: pending.topicSlug,
      question: qText,
      questionId,
    });
    recordAttempt(user, {
      subject: pending.subject,
      topic: pending.topicName,
      topicKey: pending.topicSlug,
      question: qText,
      questionId,
      marksScored: csr.marksAwarded,
      marksAvailable: csr.totalMarks,
      mode: "graded",
      timestamp: pending.gradedAt, // hazard 2
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
): Promise<FreeCheckReplayOutcome> {
  if (!user?.uid || user.isLocalSession) return { kind: "none" };
  if (!peekPendingFreeCheck()) return { kind: "none" };
  if (!isReplayReady(user)) return { kind: "not-ready" }; // hazard 1
  const pending = claimPendingFreeCheck();
  if (!pending) return { kind: "none" };
  try {
    const code = await writePending(user, pending);
    // R10 — a count, no identifier. Fired here, once per replay, not per render.
    trackNamedEvent("free_check_signup");
    return { kind: "saved", code };
  } catch (error) {
    console.warn("[freeCheckReplay] replay failed; the result stays on the device", error);
    restorePendingFreeCheck(pending);
    return { kind: "failed" };
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

export function startFreeCheckReplay(user: AuthUser): Promise<FreeCheckReplayOutcome> {
  const existing = inflight.get(user.uid);
  if (existing) return existing;
  const run = replayPendingFreeCheck(user).finally(() => {
    inflight.delete(user.uid);
  });
  inflight.set(user.uid, run);
  return run;
}
