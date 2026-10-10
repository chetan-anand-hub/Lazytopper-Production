// src/utils/checkImproveDetection.ts
//
// Claim 2 (auto-detect marks/subject/topic in Check & Improve): shared resolution
// of the grader's auto-detected subject/topic into a CANONICAL topics.ts context
// for storage. Both Check & Improve surfaces (desktop + app) use this so they can
// never diverge, and so the detected topic is canonicalised through the SAME
// resolver the Me weak-area row uses (Fix A, #242) — keeping MI attribution on a
// real `topics.ts` key instead of a free-text label.

import { desktopTopicForWeakAreaKey } from "../lib/desktop/topics";
import { guardTopic } from "../lib/grading/topicGuard";
import type { DesktopSubject } from "../lib/desktop/navigation";
import {
  detectQuestion,
  type CheckSolutionResponse,
  type CheckSolutionTopicVocab,
  type DetectQuestionResponse,
  type PaidCallOptions,
} from "../ai/aiClient";

/**
 * Governs ONLY the detection *meta-display* — the marks-source label
 * ("read from the question" / "estimated"), confidence, and any text exposing the
 * machinery (that detection is logged). Default ON for the owner testing phase;
 * flip to `false` for launch (a logged pre-launch task).
 *
 * It must NOT hide the detected VALUES themselves or the ability to correct them —
 * those stay visible + correctable even at launch (calm "we read this from your
 * question", never anxious "AI low-confidence").
 */
export const SHOW_DETECTION_META = true;

export interface DetectedGradeTopic {
  subject: DesktopSubject;
  /** Canonical topic display name, or "" when no topic resolved. */
  topicName: string;
  /** Canonical topics.ts slug, or "" when no topic resolved (→ full-subject). */
  topicSlug: string;
}

/** Mark-scale provenance. Server sources are stated/inferred/fallback; `user` is
 *  added client-side when the student corrects the detected value (detect-then-confirm). */
export type DetectionMarksSource =
  | "stated"
  | "inferred"
  | "fallback"
  | "user";

/** The confirmed (possibly student-corrected) question metadata that grading runs
 *  against in the detect-then-confirm flow. */
export interface ConfirmedDetection {
  marks: number;
  subject: DesktopSubject;
  /** Canonical topics.ts slug, or "" (full-subject). */
  topicSlug: string;
  topicName: string;
  marksSource: DetectionMarksSource | null;
}

/** Clamp a detected/edited mark to the CBSE single-question range [1,6]; a
 *  non-usable value falls back to 3 (never fabricated beyond the valid range). */
export function clampDetectedMarks(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : 3;
}

/** Build the confirmed-detection state from a `/detect-question` response:
 *  canonicalise the topic (via the shared resolver) and clamp the marks. */
export function buildConfirmedDetection(
  d: Pick<
    DetectQuestionResponse,
    "detectedMarks" | "detectedSubject" | "detectedTopic" | "marksSource"
  >,
  /** TOPIC-FIX-1: the question text, so the deterministic guard can fill a MISSING chapter. */
  questionText?: string | null,
): ConfirmedDetection {
  const { subject, topicName, topicSlug } = resolveDetectedGradeTopic(
    guardedDetection(d.detectedTopic ?? null, d.detectedSubject ?? null, questionText),
  );
  return {
    marks: clampDetectedMarks(d.detectedMarks),
    subject,
    topicName,
    topicSlug,
    marksSource: d.marksSource ?? null,
  };
}

/**
 * TOPIC-FIX-1: the student flips the subject on "Looks right? Change". The chapter becomes EMPTY ("(no
 * specific topic)": filed subject-only) until they pick one - it used to be seeded with the subject's FIRST
 * chapter, a guess the student never made that then filed as their weak area.
 */
export function withSubjectCorrected(c: ConfirmedDetection, next: DesktopSubject): ConfirmedDetection {
  return { ...c, subject: next, topicSlug: "", topicName: "" };
}

/**
 * TOPIC-FIX-1 (c): run the model's answer through the deterministic guard (lib/grading/topicGuard).
 * It fills a MISSING chapter and replaces one from the OTHER subject; every other answer is untouched.
 */
export function guardedDetection(
  detectedTopic: string | null,
  detectedSubject: string | null,
  questionText?: string | null,
): { detectedTopic: string | null; detectedSubject: "Maths" | "Science" | null } {
  const named = detectedSubject === "Science" || detectedSubject === "Maths" ? detectedSubject : null;
  const modelSubject = detectedTopic
    ? ((desktopTopicForWeakAreaKey(detectedTopic)?.subject as DesktopSubject | undefined) ?? null)
    : null;
  const g = guardTopic({ detectedTopic, detectedSubject: named, questionText, subjectOfDetectedTopic: modelSubject });
  return {
    detectedTopic: g.detectedTopic,
    detectedSubject: g.detectedSubject === "Science" || g.detectedSubject === "Maths" ? g.detectedSubject : null,
  };
}

/** One question's resolved topic in a multi-question upload (C&I PR-2, item A). */
export interface PerQuestionTopic {
  qNumber: number;
  /** Canonical topics.ts slug, or "" when the model found no confident fit. */
  topicSlug: string;
  /** Canonical display name, or "" when unresolved. */
  topicName: string;
  /** SCORECARD-MI-1 (B2) — the subject of the RESOLVED topic. When the topic did not resolve,
   *  the subject this question's own detect named explicitly (W4); "" when it named none. */
  subject: DesktopSubject | "";
}

/**
 * Resolve a per-QUESTION topic for each question of a (multi-question) C&I upload —
 * item A, route A2 (owner-ratified 2026-07-13): re-run the EXISTING `/detect-question`
 * read once per question against the SAME topics.ts vocabulary the session-level
 * detect already uses, then canonicalise through the shared resolver. NO grader edit
 * (the detect endpoint lives in the sacred checkSolution.cjs — untouched); this only
 * re-calls the existing client capability.
 *
 * HONESTY (spec §3 / §4.4): a question whose topic the model can't confidently place
 * returns an EMPTY slug — never guessed. Externally uploaded questions carry no bank
 * questionId, so only the TOPIC is knowable here; the concept (subtopic) stays
 * unknowable and is never fabricated. A failed detect call degrades that one question
 * to empty (best-effort), never the whole set.
 *
 * The calls run concurrently; each is the same focused, cheap read the confirm step
 * already makes. Pure w.r.t. state — returns the resolved topics for the caller to
 * attach to the grade response (it does not mutate anything).
 *
 * FREE-CHECK-1b: `callOpts` is forwarded to EVERY per-question detect, so a signed-out
 * visitor's free check sends the marker + its own fresh limited-use App Check token on
 * each of the N calls (OR-13 item 4). Omitted, each call is byte-identical to before.
 */
export async function resolvePerQuestionGradeTopics(
  questions: Array<{ questionNumber: number; questionText: string }>,
  topicVocabulary: CheckSolutionTopicVocab[],
  callOpts?: PaidCallOptions,
): Promise<PerQuestionTopic[]> {
  const settled = await Promise.all(
    questions.map(async (q): Promise<PerQuestionTopic> => {
      const text = String(q.questionText || "").trim();
      if (!text) return { qNumber: q.questionNumber, topicSlug: "", topicName: "", subject: "" };
      try {
        const d = callOpts
          ? await detectQuestion({ question: text, topicVocabulary }, callOpts)
          : await detectQuestion({ question: text, topicVocabulary });
        const guarded = guardedDetection(d.detectedTopic ?? null, d.detectedSubject ?? null, text);
        const { topicSlug, topicName, subject } = resolveDetectedGradeTopic(guarded);
        // The subject is KNOWN when the topic resolved (it comes from topics.ts). When it did
        // not, only a subject this question's own detect NAMED is kept (W4) — never the
        // resolver's "Maths" fallback — so an unresolved question stays honestly unknown
        // unless the detector said which subject it is.
        const named: DesktopSubject | "" =
          guarded.detectedSubject === "Science" || guarded.detectedSubject === "Maths" ? guarded.detectedSubject : "";
        return { qNumber: q.questionNumber, topicSlug, topicName, subject: topicSlug ? subject : named };
      } catch (error) {
        console.warn("[checkImproveDetection] per-question topic detect failed", error);
        return { qNumber: q.questionNumber, topicSlug: "", topicName: "", subject: "" };
      }
    }),
  );
  return settled;
}

/** Count the DISTINCT resolved topics across a per-question set (empty slugs — the
 *  honest unresolved — never count). Powers the "N topics" counted chip + the
 *  by-topic lens gate. */
export function countDistinctTopics(perQuestion: Array<{ topicSlug?: string | null }>): number {
  const seen = new Set<string>();
  for (const q of perQuestion) {
    const slug = String(q.topicSlug || "").trim();
    if (slug) seen.add(slug);
  }
  return seen.size;
}

/**
 * Resolve `{ detectedTopic, detectedSubject }` from the grader into a canonical
 * context. Honest fallbacks (never invents a topic):
 *   - topic: the AI's detectedTopic canonicalised via `desktopTopicForWeakAreaKey`;
 *     an absent/unresolvable topic → empty slug (the caller stores it as
 *     full-subject, not a fabricated key).
 *   - subject: the resolved topic's subject (most reliable), else the AI's
 *     detectedSubject, else "Maths".
 */
export function resolveDetectedGradeTopic(
  graded: Pick<CheckSolutionResponse, "detectedTopic" | "detectedSubject">,
): DetectedGradeTopic {
  const resolved = graded.detectedTopic
    ? desktopTopicForWeakAreaKey(graded.detectedTopic)
    : undefined;
  const subject: DesktopSubject =
    (resolved?.subject as DesktopSubject | undefined) ??
    (graded.detectedSubject === "Science" ? "Science" : "Maths");
  return {
    subject,
    topicName: resolved?.name ?? "",
    topicSlug: resolved?.slug ?? "",
  };
}

/* ── SCORECARD-MI-1 (wave B-15) — Check & Improve client wiring ────────────────────── */

/**
 * B1 (D6) — the question text a single-question Check & Improve grade sends. Typed text wins;
 * otherwise the text detect-question read from the photo / PDF / QR upload
 * (`questions[0].questionText`). NEVER the chapter name and never invented text: when
 * neither exists this returns "" and the page asks the student to type the question
 * before grading (the grader cannot mark against a question it is never shown — GA-03).
 */
export function resolveCiQuestionText(
  typed: string | null | undefined,
  detected: ReadonlyArray<{ questionText?: string | null }> | null | undefined,
): string {
  const t = String(typed ?? "").trim();
  if (t) return t;
  return String(detected?.[0]?.questionText ?? "").trim();
}

/** Where one question of a multi-question paper is filed (subject + chapter). */
export interface CiQuestionFiling {
  subject: DesktopSubject;
  topicName: string;
  topicSlug: string;
}

/** True when a graded paper's per-question topics span two or more chapters. */
export function isMixedPaper(results: ReadonlyArray<{ topicSlug?: string | null; couldNotRead?: boolean }>): boolean {
  return countDistinctTopics(results.filter((r) => !r.couldNotRead)) >= 2;
}

/**
 * B2 (D7, GA-16) — file each question of a multi-question paper under ITS OWN subject and
 * chapter: the per-question topic resolved after grading. A question whose topic did not
 * resolve inherits the paper's topic ONLY when the paper is single-topic; on a mixed paper it
 * stays unfiled (topic "", honest unknown) rather than taking the first question's chapter.
 * Its subject there is the one its own detect named (W4), else the paper's (unchanged).
 */
export function perQuestionFiling(
  g: { topicSlug?: string | null; topicLabel?: string | null; topicSubject?: "Maths" | "Science" | null },
  paper: CiQuestionFiling,
  paperIsMixed: boolean,
): CiQuestionFiling {
  const slug = String(g.topicSlug ?? "").trim();
  if (slug) {
    return {
      subject: g.topicSubject === "Science" || g.topicSubject === "Maths" ? g.topicSubject : paper.subject,
      topicName: String(g.topicLabel ?? "").trim(),
      topicSlug: slug,
    };
  }
  if (!paperIsMixed) return paper;
  const named = g.topicSubject === "Science" || g.topicSubject === "Maths" ? g.topicSubject : null;
  return { subject: named ?? paper.subject, topicName: "", topicSlug: "" };
}

/**
 * B5 (D5) — the stable per-question ids of a multi-question paper: `ci:{code}:q{n}`, unique even
 * when the detected numbers repeat (the second "Q10" becomes `ci:{code}:q10#2`). Derived from
 * the session code and the question order only — never from a score or a count.
 */
export function ciQuestionIds(code: string, results: ReadonlyArray<{ qNumber: number }>): string[] {
  const seen = new Map<number, number>();
  return results.map((r) => {
    const n = Number(r.qNumber);
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return k === 1 ? `ci:${code}:q${n}` : `ci:${code}:q${n}#${k}`;
  });
}

/* SCORECARD-MI-1 PR-2 (H4/H9) — `withObjectiveEcho` and `withV2Echo` are RETIRED: the single-question
 * adapter (`singleCheckToWorksheetResponse`, services/checkImproveGradeService.ts) now carries the
 * `objective` flag, the v2 fields and the honest not-graded paper itself — one path, owner ruling
 * 2026-10-05. */

/**
 * OR-LIVE L1 (PR-1 finding) — the detected question text for the result at `index`, matched by
 * OCCURRENCE, never by printed number alone: two questions both printed "Q5" are the 1st and 2nd
 * "5" in the detected list and in the results, so each keeps its own text. Undefined when the
 * occurrence has no detected twin (honest — never another question's text).
 */
export function detectedTextForResult(
  detected: ReadonlyArray<{ questionNumber: number; questionText: string }> | null | undefined,
  results: ReadonlyArray<{ qNumber: number }>,
  index: number,
): string | undefined {
  const r = results[index];
  if (!r) return undefined;
  let occurrence = 0;
  for (let i = 0; i < index; i += 1) if (results[i]?.qNumber === r.qNumber) occurrence += 1;
  const same = (detected ?? []).filter((q) => q.questionNumber === r.qNumber);
  return same[occurrence]?.questionText;
}
