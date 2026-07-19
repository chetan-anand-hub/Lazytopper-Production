// src/pages/tutor/tutorRoundTrip.ts
// Stage-2 round-trip helpers (Flow v2 §3-A). Deep-links the tutor OUT to C&I /
// Practice (with returnTo so the student comes back to the SAME /tutor thread),
// matches a returning graded sessionRecord against the pending marker, and composes
// the reframed return-opener (D-TUT-6) from that record.
//
// The tutor NEVER grades (D-TUT-8): the return-opener's numbers come straight from
// the durable sessionRecord written by C&I/Practice; this module only READS + phrases.

import type { SessionRecord, SessionPerQuestionPayload } from "../../services/sessionRecords";
import type { CheckSolutionAnnotatedStep, WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import type { PracticeAttempt } from "../../services/practiceInsights";
import type { TutorPendingMarker } from "../../services/tutorSessionStore";
import type { TutorReturnedWork } from "../../ai/tutorClient";

/** Encode a query object into a `?a=b` suffix (URLSearchParams — safe-encodes). */
function query(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Deep-link to Check & Improve for the upload-a-question flow (GAP-1 MVP = deep-link,
 * the student uploads as today; C&I does not accept a pre-loaded question). `topic`
 * is a cosmetic breadcrumb hint; `returnTo` brings the student back to the tutor thread.
 */
export function buildCheckImproveRoundTripHref(args: { returnTo: string; topicSlug?: string }): string {
  return `/check-improve${query({ topic: args.topicSlug, source: "tutor", returnTo: args.returnTo })}`;
}

/**
 * Deep-link to QUICK PRACTICE, concept-filtered, for the "Practise this" round-trip
 * (Fix 1 — the worksheet BUILDER killed the loop; Quick Practice keeps it). Mirrors the
 * EXACT route + param shape the Topic Hub's concept-row uses (buildDesktopConceptPracticePath
 * → `/practice/:grade/:subject` with `topic`/`focus`/`subtopicHint`), so PracticePage
 * auto-builds a ready, concept-scoped set on arrival. Quick Practice writes per-question
 * `practiceInsights/{uid}/attempts` (the return-detection stream — NOT a sessionRecord).
 *
 * Carries the concept `focus` ONLY — NOT a mark-band (D-TUT-7 wants the CONCEPT the student
 * misses, not a mark filter). `source`/`returnTo` are plain string params PracticePage reads
 * (kept a raw string here, decoupled from the desktop DesktopActionSource enum).
 *
 * [FU-TUTOR-BACKLABEL-COUNT] (owed from Stage 2): also carries `backLabel` (so Practice's back
 * button reads "Back to your tutor" instead of a generic default) and a short `count` (the
 * tutor offers "a couple on this" — a small, honest set the student can extend in Practice).
 * Both are params PracticePage already reads (backLabel + count).
 */
export function buildQuickPracticeRoundTripHref(args: {
  returnTo: string;
  subject: "maths" | "science" | "";
  topicKey: string;
  concept?: string;
  grade?: string;
  backLabel?: string;
  count?: number;
}): string {
  const grade = args.grade || "10";
  const subject = args.subject === "science" ? "Science" : "Maths";
  return `/practice/${grade}/${subject}${query({
    topic: args.topicKey,
    focus: args.concept,
    subtopicHint: args.concept,
    source: "tutor",
    returnTo: args.returnTo,
    backLabel: args.backLabel,
    count: typeof args.count === "number" && args.count > 0 ? String(args.count) : undefined,
  })}`;
}

/**
 * Find the graded record the tutor is waiting on: the NEWEST record whose surface
 * matches the marker, graded strictly after departure, and overlapping the marker's
 * topic (or questionId, or an empty/mixed topic set). Returns null if none yet (the
 * student hasn't completed) — the caller keeps the pending marker and offers a resume.
 */
export function matchReturningRecord(
  records: SessionRecord[],
  pending: TutorPendingMarker,
): SessionRecord | null {
  const candidates = records
    .filter((r) => r.surface === pending.surface && typeof r.gradedAt === "number" && r.gradedAt > pending.departureTs)
    .filter((r) => {
      const topicOverlap =
        (r.topicKeys || []).includes(pending.topicKey) || (r.topicKeys || []).length === 0;
      const qOverlap = !!pending.questionId && (r.questionIds || []).includes(pending.questionId);
      return topicOverlap || qOverlap;
    })
    .sort((a, b) => b.gradedAt - a.gradedAt);
  return candidates[0] ?? null;
}

/**
 * The PRACTICE leg's returning attempts (Fix 1): Quick Practice writes per-question
 * `practiceInsights` attempts, NOT a graded sessionRecord. Select the ones logged after
 * departure whose canonical topicKey matches the marker's. `canonicalSlugMatches` is the
 * caller's guard (it lives in canonicalTopicSlug.ts); this module stays pure/testable by
 * taking the already-filtered set — the hook does the timestamp query + slug match.
 */
export function matchReturningAttempts(
  attempts: PracticeAttempt[],
  pending: TutorPendingMarker,
  slugMatches: (a: string, b: string) => boolean,
): PracticeAttempt[] {
  return attempts.filter(
    (a) =>
      typeof a.timestamp === "number" &&
      a.timestamp > pending.departureTs &&
      slugMatches(a.topicKey, pending.topicKey),
  );
}

/**
 * The SessionRecord surface a "practice" marker's session is written under.
 *
 * These are TWO DIFFERENT VOCABULARIES and the gap between them is deliberate, not a
 * typo to tidy up:
 *   · `TutorPendingMarker.surface` = "practice"       — the tutor's own route-out vocabulary;
 *   · `SessionRecord.surface`      = "quick-practice" — the SessionSurface contract's.
 * The marker is LIVE, PERSISTED state (tutorSessions/{uid}/topics/{topicKey}) in real
 * student threads, so renaming its value would strand every in-flight round-trip mid-flight.
 * The map goes here instead. `matchReturningRecord`'s bare `r.surface === pending.surface`
 * can therefore NEVER match a QP record — hence this separate matcher.
 */
const PRACTICE_RECORD_SURFACE = "quick-practice";

/**
 * The PRACTICE leg's returning graded RECORD (the richer of the two practice sources —
 * see `composePracticeRecordReturnOpener`). Mirrors `matchReturningRecord` with two
 * deliberate differences:
 *
 *  1. the surface MAP above (marker "practice" → record "quick-practice");
 *  2. topic overlap compares through the caller's `slugMatches`, NOT raw `includes` —
 *     QP stores `resolveCanonicalSlug(topicSlug)` while the marker carries the tutor's
 *     own topicKey, and comparing raw strings silently matches nothing
 *     ([FU-PROG-TOPIC-KEY-MISMATCH]). Same guard the attempts leg already takes.
 *
 * An EMPTY `topicKeys` is NOT treated as a wildcard here (it is in `matchReturningRecord`,
 * where a multi-topic C&I paper legitimately resolves to none). A QP record's topic comes
 * from the route the tutor itself chose, so empty means slug resolution failed — matching
 * on it would be a guess. It falls through to the attempts leg instead, which is honest.
 * Pure — the caller supplies the records + the matcher.
 */
export function matchReturningPracticeRecord(
  records: SessionRecord[],
  pending: TutorPendingMarker,
  slugMatches: (a: string, b: string) => boolean,
): SessionRecord | null {
  if (pending.surface !== "practice") return null;
  const candidates = records
    .filter((r) => r.surface === PRACTICE_RECORD_SURFACE)
    .filter((r) => typeof r.gradedAt === "number" && r.gradedAt > pending.departureTs)
    .filter((r) => {
      const topicOverlap = (r.topicKeys || []).some((k) => slugMatches(k, pending.topicKey));
      const qOverlap = !!pending.questionId && (r.questionIds || []).includes(pending.questionId);
      return topicOverlap || qOverlap;
    })
    .sort((a, b) => b.gradedAt - a.gradedAt);
  return candidates[0] ?? null;
}

/** The reframed return-opener (D-TUT-6): name the marks, collapse to one root cause,
 *  separate method from presentation, hand back the choice. All facts from the record. */
export interface ReturnOpener {
  text: string;
  follow?: { label: string; send: string };
}

/** Trim a grader annotation to one sentence's worth of opener copy — the tutor quotes
 *  the marker, it does not paste a paragraph. Never rewords: truncation only, so the
 *  words in the opener stay the grader's own. */
function shortAnnotation(raw: string): string {
  const clean = String(raw || "").replace(/\s+/g, " ").trim();
  if (clean.length <= 140) return clean;
  const cut = clean.slice(0, 140);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (lastStop > 60 ? cut.slice(0, lastStop) : cut.trimEnd()) + "…";
}

/** How a faulty step reads in the opener. `missing` is a step never written, which is a
 *  different fact from one written wrongly — the copy must not conflate them. */
function stepFaultPhrase(status: CheckSolutionAnnotatedStep["status"]): string {
  if (status === "missing") return "never got written";
  if (status === "partial") return "only half landed";
  return "is where it turned";
}

/** The first step the grader did NOT mark correct, in question then step order, that
 *  carries a real annotation to quote — read straight off a `WorksheetGradeResponse.results`
 *  array. null → no quotable fault. The C&I overlay leg has the response in-hand (Option 2b),
 *  so it reads it directly; `firstFaultyStep` wraps this for the QP payload leg. */
function firstFaultyStepInResults(
  results: WorksheetQuestionGrade[] | undefined | null,
): { qNumber: number; step: CheckSolutionAnnotatedStep } | null {
  const sorted = [...(results || [])].sort((a, b) => a.qNumber - b.qNumber);
  for (const r of sorted) {
    if (r.couldNotRead || !r.annotatedSteps?.length) continue;
    const steps = [...r.annotatedSteps].sort((a, b) => a.stepNumber - b.stepNumber);
    for (const step of steps) {
      if (step.status === "correct") continue;
      if (!String(step.teacherAnnotation || "").trim()) continue;
      return { qNumber: r.qNumber, step };
    }
  }
  return null;
}

/** The first quotable faulty step for the QP RECORD leg, off the persisted payload.
 *  Unchanged behaviour — delegates to `firstFaultyStepInResults`. */
function firstFaultyStep(
  payload: SessionPerQuestionPayload,
): { qNumber: number; step: CheckSolutionAnnotatedStep } | null {
  return firstFaultyStepInResults(payload.response?.results);
}

/**
 * The PRACTICE return-opener, RECORD leg (this FU — closing the gap between the two
 * round-trip legs). Quick Practice now writes its own durable, NON-COUNTING session
 * record (#436) whose `perQuestionRef` payload carries the SAME grader's per-step
 * detail C&I's opener already reads — `status`, `teacherAnnotation`, `mistakeType`,
 * `correctedWorking` — because QP's written-working path runs the SAME grader. So the
 * tutor can finally name WHERE it went wrong on the practice leg, not just how many.
 *
 * Returns null — deliberately, rather than a thinner opener — whenever the record
 * cannot beat the marks-only line. The caller then falls back to
 * `composePracticeReturnOpener` (the attempts leg), which stays the honest floor:
 *
 *   · MCQ-only session → a bare click shows NO reasoning, so there are no
 *     `annotatedSteps` and no `mistakeSummary` to read (D-PROG-2's shipped invariant).
 *     There is nothing richer to say and we do not manufacture it.
 *   · no quotable faulty step → same rule.
 *   · a record with no marks → same rule.
 *
 * NEVER quotes a step's MARKS. On an `objective` question the grader zeroes every
 * per-step mark BY DESIGN (the whole mark lives at answer level, PR-348/#445) — so a
 * step's "0 marks" is a clamp artifact, not a student who scored nothing. The
 * annotations stay real and quotable either way, which is exactly what the C&I and
 * worksheet views already do (suppress the mark chip, keep the annotation).
 *
 * Read-only (D-TUT-8): every number and every quoted word comes from the record /
 * payload Practice itself wrote. The tutor never grades and never paraphrases a grade.
 */
export function composePracticeRecordReturnOpener(
  record: SessionRecord,
  payload: SessionPerQuestionPayload | null,
  topicLabel: string,
): ReturnOpener | null {
  const awarded = typeof record.marksAwarded === "number" ? record.marksAwarded : null;
  const total = typeof record.marksTotal === "number" ? record.marksTotal : null;
  if (awarded == null || total == null || total <= 0) return null;

  const lost = Math.max(0, total - awarded);

  // A clean set, with real working behind it — worth saying, because "the method held
  // up" is a fact here (every step was marked correct), not a compliment we invented.
  if (lost === 0) {
    const hasWorking = (payload?.response?.results || []).some(
      (r) => !r.couldNotRead && !!r.annotatedSteps?.length,
    );
    if (!hasWorking) return null; // MCQ-only clean set — the attempts line already says this.
    return {
      text: `${awarded} out of ${total} on ${topicLabel} — clean, every one, and the working held up step for step. That's landing now. Want a harder one to stretch on, or leave it here?`,
      follow: { label: "A harder one", send: "Give me a harder one to try." },
    };
  }

  if (!payload) return null;
  const fault = firstFaultyStep(payload);
  if (!fault) return null; // No visible reasoning to point at → the marks-only line is the honest one.

  const { qNumber, step } = fault;
  const ft = record.fourType || { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const method = (ft.conceptual || 0) + (ft.calculation || 0);
  const presLed = (ft.presentation || 0) + (ft.silly || 0);
  const marks = `${lost} mark${lost === 1 ? "" : "s"}`;

  // One root cause, from the record's own four-type totals — the same method-vs-
  // presentation doctrine the C&I opener uses, now on the same grader's data.
  let rootCause: string;
  let fix: string;
  if (presLed > method && presLed > 0) {
    // Careless/presentation is NOT a weakness (MI doctrine) — say so plainly.
    rootCause = `and the ${marks} came off the presentation, not your maths`;
    fix = `You know this; it's the finish costing you. Want to tighten just the write-up, or something else?`;
  } else if (method > 0) {
    const calcLed = (ft.calculation || 0) >= (ft.conceptual || 0);
    rootCause = calcLed
      ? `and the ${marks} slipped in the working — the approach was right, the arithmetic wasn't`
      : `and the ${marks} came off the method itself — the setup needs a tweak`;
    fix = `Want to fix just that, or something else?`;
  } else {
    rootCause = `and ${marks} slipped`;
    fix = `Want to go through it, or something else?`;
  }

  const where = `On Q${qNumber}, step ${step.stepNumber} — "${step.description}" — ${stepFaultPhrase(step.status)}: ${shortAnnotation(step.teacherAnnotation)}`;

  return {
    text: `You scored ${awarded} out of ${total} on that ${topicLabel} set, ${rootCause}. ${where} ${fix}`,
    follow: {
      label: "Go through that step",
      send: `Let's go through Q${qNumber}, step ${step.stepNumber}: ${step.description}`,
    },
  };
}

/**
 * The CHECK & IMPROVE overlay's RICH return-opener (build lane — the tutor sees the graded
 * work). `composePracticeRecordReturnOpener` re-flavoured for the C&I surface: QP and C&I run
 * the SAME grader, so the `WorksheetGradeResponse.results` shape is identical and the same
 * `firstFaultyStep` + four-type doctrine apply. Two differences only: the lead copy ("the board
 * marked … sheet" vs "you scored … set") and the clean-set line.
 *
 * Takes the graded `WorksheetGradeResponse` IN-HAND (Option 2b — it is already in the C&I page's
 * `wsResult` state at overlay close and rides the same `onClose` channel as the question), so
 * there is NO cloud re-read and it survives an honest-failure persist skip (report §1). The
 * marks/four-type come from the freshly-built `SessionRecord`; every quoted word comes from the
 * grader's own annotation (`shortAnnotation` truncates, never rewords) — the tutor NEVER grades
 * (D-TUT-8).
 *
 * Returns null — deliberately, so the caller falls back to the UNCHANGED thin `composeReturnOpener`
 * (the honest floor) — whenever the response cannot beat the marks-only line: no marks / total ≤ 0
 * (couldn't-read sheet), a clean set with no legible working (MCQ-only), or no quotable faulty step
 * (MCQ-only / blank annotations). NEVER quotes a step's marks (an objective step's 0 is a clamp
 * artifact, PR-348/#445 — the annotation is quotable, the mark is not).
 */
export function composeCheckImproveRichReturnOpener(
  record: SessionRecord,
  response: WorksheetGradeResponse | null | undefined,
  topicLabel: string,
): ReturnOpener | null {
  const awarded = typeof record.marksAwarded === "number" ? record.marksAwarded : null;
  const total = typeof record.marksTotal === "number" ? record.marksTotal : null;
  if (awarded == null || total == null || total <= 0) return null;

  const lost = Math.max(0, total - awarded);

  // A clean sheet with real working behind it — worth saying, because "the working held up"
  // is a fact here (every step marked correct), not a compliment we invented.
  if (lost === 0) {
    const hasWorking = (response?.results || []).some(
      (r) => !r.couldNotRead && !!r.annotatedSteps?.length,
    );
    if (!hasWorking) return null; // MCQ-only clean sheet — the thin opener already says this.
    return {
      text: `${awarded} out of ${total} on that ${topicLabel} sheet — clean, and the working held up step for step. That's landing now. Want a harder one to stretch on, or leave it here?`,
      follow: { label: "A harder one", send: "Give me a harder one to try." },
    };
  }

  const fault = firstFaultyStepInResults(response?.results);
  if (!fault) return null; // No visible reasoning to point at → the marks-only line is the honest one.

  const { qNumber, step } = fault;
  const ft = record.fourType || { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const method = (ft.conceptual || 0) + (ft.calculation || 0);
  const presLed = (ft.presentation || 0) + (ft.silly || 0);
  const marks = `${lost} mark${lost === 1 ? "" : "s"}`;

  // One root cause, from the record's own four-type totals — the SAME method-vs-presentation
  // doctrine the thin C&I opener uses, now naming the exact step the grader flagged.
  let rootCause: string;
  let fix: string;
  if (presLed > method && presLed > 0) {
    // Careless/presentation is NOT a weakness (MI doctrine) — say so plainly.
    rootCause = `and the ${marks} came off the presentation, not your maths`;
    fix = `You know this; it's the finish costing you. Want to tighten just the write-up, or something else?`;
  } else if (method > 0) {
    const calcLed = (ft.calculation || 0) >= (ft.conceptual || 0);
    rootCause = calcLed
      ? `and the ${marks} slipped in the working — the approach was right, the arithmetic wasn't`
      : `and the ${marks} came off the method itself — the setup needs a tweak`;
    fix = `Want to fix just that, or something else?`;
  } else {
    rootCause = `and ${marks} slipped`;
    fix = `Want to go through it, or something else?`;
  }

  const where = `On Q${qNumber}, step ${step.stepNumber} — "${step.description}" — ${stepFaultPhrase(step.status)}: ${shortAnnotation(step.teacherAnnotation)}`;

  return {
    text: `The board marked that ${topicLabel} sheet ${awarded} out of ${total}, ${rootCause}. ${where} ${fix}`,
    follow: {
      label: "Go through that step",
      send: `Let's go through Q${qNumber}, step ${step.stepNumber}: ${step.description}`,
    },
  };
}

/**
 * ★ THE §6.3 PER-STEP DIGEST GATE (eval-gated — build spec §2 Seam 3).
 *
 * The digest lets the tutor say what was RIGHT ("your ratio and substitution held up"), not only
 * the ONE faulty step the opener names — but more correct-step structure is more surface for the
 * model to OVER-READ. Per the spec it ships ONLY once a LIVE rubric-2 eval shows the model stays
 * grounded WITH it; if it tempts invention, the build falls back to question-only.
 *
 * ON as of the live rubric-2 eval (REPORT_tutor_graded_context_halfB_eval_2026-07-18.md): run against
 * the real Gemini 2.5 Flash tutor, 12/12 digest-ON runs stayed grounded — zero invented steps, zero
 * grade contradictions, including the clean-sheet invent-a-mistake trap and the described-image rail.
 * The eval also showed the digest REMOVES a risk the question-only path leaves open: without it the
 * model re-derives and ASSUMES which steps were right; with it, it states what held up from the
 * `status` list. So the flag ships ON. [FU-TUTOR-RETURNED-WORK-DIGEST] resolved.
 *
 * Kept as a single flag so the fallback stays one line: set it back to `false` to revert to
 * question-only (the honest floor is unchanged either way — the opener still names the faulty step).
 */
export const RETURNED_WORK_DIGEST_ENABLED = true;

/**
 * Build the one-shot `returnedWork` model-context object handed to `callTutor` on the return turn
 * (Piece 1 + the §6.3 digest). Pulls the verbatim question (quotable CONTEXT, never a student turn)
 * and — when the digest flag is on — a compact per-step status digest (`{q,n,description,status}`
 * only: NO marks, NO free text) from the graded response. An image-only question carries no text
 * (there is no image channel to the tutor model — text-only MVP); it is flagged so the prompt
 * DESCRIBES it and never transcribes it. Returns null when there is nothing usable to send (a
 * bare pre-grade escape), so the ref clears itself.
 */
export interface TutorReturnedWorkInput {
  question?: { text: string; imageBase64: string | null };
  response?: WorksheetGradeResponse | null;
  includeDigest?: boolean;
}
export function buildReturnedWork({
  question,
  response,
  includeDigest,
}: TutorReturnedWorkInput): TutorReturnedWork | null {
  const text = (question?.text || "").trim();
  const hasImageQuestion = !text && !!question?.imageBase64;

  const steps: TutorReturnedWork["steps"] = [];
  if (includeDigest) {
    const results = [...(response?.results || [])].sort((a, b) => a.qNumber - b.qNumber);
    for (const r of results) {
      if (r.couldNotRead || !r.annotatedSteps?.length) continue;
      for (const s of [...r.annotatedSteps].sort((a, b) => a.stepNumber - b.stepNumber)) {
        const description = String(s.description || "").trim();
        if (!description) continue;
        steps.push({ q: r.qNumber, n: s.stepNumber, description, status: s.status });
      }
    }
  }

  if (!text && !hasImageQuestion && steps.length === 0) return null;
  const out: TutorReturnedWork = {};
  if (text) out.question = text;
  if (hasImageQuestion) out.hasImageQuestion = true;
  if (steps.length) out.steps = steps;
  return out;
}

/**
 * The PRACTICE return-opener (Fix 1 / D-TUT-6). Composed from `practiceInsights` attempts
 * — which carry per-question correctness + marks but NO fourType breakdown — so it names
 * how the set went honestly and hands back the choice, WITHOUT inventing a method-vs-
 * presentation split it cannot know (that split is C&I's, from the grader). Read-only:
 * the tutor never computes a grade (D-TUT-8); these numbers come from Practice's own writes.
 */
export function composePracticeReturnOpener(
  attempts: PracticeAttempt[],
  topicLabel: string,
): ReturnOpener {
  const n = attempts.length;
  if (n === 0) {
    return {
      text: `You're back from practising ${topicLabel}. How did it go — want to work through any that tripped you?`,
      follow: { label: "Go through one", send: "Yes, let's go through one I got stuck on." },
    };
  }
  const correct = attempts.filter((a) => a.correct).length;
  if (correct >= n) {
    return {
      text: `${correct} out of ${n} — clean, every one. That's landing now. Want a harder one to stretch on, or leave it here?`,
      follow: { label: "A harder one", send: "Give me a harder one to try." },
    };
  }
  const missed = n - correct;
  return {
    text: `You got ${correct} of ${n} on that set — ${missed} slipped. Want to go through the ${missed === 1 ? "one" : "ones"} that got away, together?`,
    follow: { label: "Go through them", send: "Yes, let's go through the ones I missed." },
  };
}

export function composeReturnOpener(
  record: SessionRecord,
  topicLabel: string,
  surface: "check-improve" | "worksheet" = "check-improve",
): ReturnOpener {
  const awarded = typeof record.marksAwarded === "number" ? record.marksAwarded : null;
  const total = typeof record.marksTotal === "number" ? record.marksTotal : null;
  const source = surface === "worksheet" ? "practice set" : "sheet";
  const lead = surface === "worksheet" ? "You scored" : "Okay — the board marked it";

  // Honest fallback when the record carries no marks (e.g. a couldn't-read sheet).
  if (awarded == null || total == null || total <= 0) {
    return {
      text: `You're back with your graded ${topicLabel} ${source}. Want to go through where it slipped, together?`,
      follow: { label: "Go through it", send: "Yes, let's go through where it slipped." },
    };
  }

  const lost = Math.max(0, total - awarded);
  if (lost === 0) {
    return {
      text: `${awarded} out of ${total} — clean${surface === "worksheet" ? ", every one" : ""}. The method and the presentation both held up. Want a harder one to stretch on, or leave it here?`,
      follow: { label: "A harder one", send: "Give me a harder one to try." },
    };
  }

  const ft = record.fourType || { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const method = (ft.conceptual || 0) + (ft.calculation || 0);
  const presLed = (ft.presentation || 0) + (ft.silly || 0);

  let rootCause: string;
  let fix: string;
  if (presLed > method && presLed > 0) {
    // Not the maths — presentation / careless. Careless is NOT a weakness (MI doctrine).
    rootCause = `and here's the thing: the ${lost} mark${lost === 1 ? "" : "s"} came off the presentation, not your maths — the method held up.`;
    fix = `You know this; it's the finish costing you. Want to nail just the write-up, or something else?`;
  } else if (method > 0) {
    const calcLed = (ft.calculation || 0) >= (ft.conceptual || 0);
    rootCause = calcLed
      ? `the ${lost} mark${lost === 1 ? "" : "s"} slipped in the working — the approach was right, the arithmetic wasn't.`
      : `the ${lost} mark${lost === 1 ? "" : "s"} came off the method itself — the setup needs a tweak.`;
    fix = `Want to fix just that, or something else?`;
  } else {
    rootCause = `you dropped ${lost} of ${total}.`;
    fix = `Want to go through where, or something else?`;
  }

  return {
    text: `${lead} ${awarded} out of ${total}, ${rootCause} ${fix}`,
    follow: { label: "Fix just that", send: "Yes — help me fix just that." },
  };
}
