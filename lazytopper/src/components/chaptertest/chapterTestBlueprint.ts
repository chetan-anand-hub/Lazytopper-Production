// src/components/chaptertest/chapterTestBlueprint.ts
//
// Chapter Test SOURCING (locked spec §4/§8/§10 · decision D1 — native path).
//
// A Chapter Test is a SINGLE-TOPIC, board-pattern paper drawn FRESH from the
// canonical bank. The locked spec names mockPaperEngine, but that engine is typed
// to PredictedQuestion and carries CROSS-CHAPTER weightage a single-topic test does
// not need — and PredictedQuestion.kind has no honest CanonicalQuestion source, so
// routing the canonical bank through it would fabricate a field. Per D1's
// zero-fabrication mandate we therefore source NATIVELY via bankQuery
// (selectBankQuestions → real CanonicalQuestion) and assemble the CBSE A–D section
// structure here. No adapter exists, so no field is fabricated.
//
// The drawn paper is a PersistedWorksheet-shaped object held IN MEMORY ONLY (never
// saved to the worksheet store — decision D2, no worksheet #NN pollution) so it can
// drive the SHARED renderers byte-unchanged: WorksheetPrintDoc (test / solution
// key), WorksheetGradedPrintDoc (graded sheet), and the structured grader
// (gradeWorksheet). Its code/name carry the CHAPTER-TEST identity (CT-…), never WS-.

import type { CanonicalQuestion } from "../../data/predictionTypes";
import { selectBankQuestions, resolveCanonicalSlug } from "../../data/bankQuery";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { isAutoGradeableObjective, isMcqShaped } from "../practice/autoGradeableObjective";
import { drawBalancedSet, type BalancedDrawResult } from "../../utils/balancedMockDraw";
import type {
  PersistedWorksheet,
  PersistedWorksheetQuestion,
} from "../../services/worksheetSessionStore";

export type CTSubject = "Maths" | "Science";
export type BoardSection = "A" | "B" | "C" | "D";

/** One board section of the blueprint. */
export interface CTSectionSpec {
  section: BoardSection;
  label: string;
  /** Ideal question count for a full-depth topic. */
  targetCount: number;
  /** Nominal marks per question (display only — the real per-question marks win). */
  marksEach: number;
  /** Section A objective is auto-graded on submit (0-or-full); B–D upload. */
  autoGraded: boolean;
}

// The CBSE board blueprint the mockup shows (topic-scoped chapter test):
//   A objective (MCQ/AR) 6×1 · B VSA 4×(1–2) · C SA 3×3 · D LA/case 2×(≥4).
// `marksEach` is the NOMINAL board figure (display only); B and D admit a band, so
// a section's real marks are the sum of its drawn rows' own marks (`actualMarks`).
export const CT_BLUEPRINT: readonly CTSectionSpec[] = [
  { section: "A", label: "Objective (MCQ / AR)", targetCount: 6, marksEach: 1, autoGraded: true },
  { section: "B", label: "Very short answer", targetCount: 4, marksEach: 2, autoGraded: false },
  { section: "C", label: "Short answer", targetCount: 3, marksEach: 3, autoGraded: false },
  { section: "D", label: "Long / case", targetCount: 2, marksEach: 5, autoGraded: false },
] as const;

/** Minimum drawable questions for an honest test (below this → honest empty state,
 *  ties to [FU-CT-BANK-DEPTH] — true cross-test uniqueness is a bank-depth lever). */
const MIN_TEST_QUESTIONS = 6;

/**
 * THE per-row eligibility predicate — which board section a bank row can be drawn
 * into, or null when no section admits it. `drawChapterTest` builds its pools from
 * THIS function, so the guard (`surfaceReachability.guard.test.ts`) tests the real
 * sourcing rule, never a mirror of it.
 *
 *   A — MCQ-shaped AND the key RESOLVES to one of its options (the #352 bar the
 *       Full Mock already applied; SURFACE-1 brings Chapter Test to the same bar —
 *       a mis-keyed MCQ used to be drawn here and score a correct pick 0).
 *   B — written, 1–2 marks. SURFACE-1 widened this from exactly 2: the bank holds
 *       146 authentic 1-mark VSA / fill-in rows (Item Bank 2021, pre-boards, NCERT
 *       in-text) that no section admitted, so they reached Practice and Worksheets
 *       but never a test. By owner instruction every served question must be
 *       drawable; B is "Very short answer", the row keeps its OWN marks through
 *       totals and the grader, and the section's real marks are shown honestly.
 *   C — written, exactly 3.   D — written, 4–99 (5-mark LA + 4-mark case).
 *   null — an MCQ whose key does not resolve (excluded rather than guessed at),
 *       or a written row outside 1..99 marks.
 */
export function chapterTestSectionFor(q: CanonicalQuestion): BoardSection | null {
  if (isMcqShaped(q)) return isAutoGradeableObjective(q) ? "A" : null;
  const m = Number(q.marks);
  if (m >= 1 && m <= 2) return "B";
  if (m === 3) return "C";
  if (m >= 4 && m <= 99) return "D";
  return null;
}

/** MCQ-shaped (two or more options) — the shared predicate, exported under the
 *  name this blueprint always used so the guard can restate the PRE-SURFACE-1
 *  Section A rule (`isMcq && non-empty key`) from the real shape test. */
export const isMcq = isMcqShaped;

/**
 * Can this bank row be drawn on SOME Chapter Test? True when a section admits it
 * AND its topic resolves to a desktop topic of its own subject — the page is reached
 * from a Topic Hub route, and `selectBankQuestions` matches rows by resolved slug,
 * so a row whose topic resolves nowhere is unreachable however it is shaped.
 */
export function isEligibleForChapterTest(q: CanonicalQuestion): boolean {
  if (chapterTestSectionFor(q) === null) return false;
  const meta = desktopTopicBySlug(resolveCanonicalSlug(q.topicKey));
  return !!meta && meta.subject.toLowerCase() === String(q.subject).toLowerCase();
}

/** djb2 — a tiny stable string hash to derive a distinct sub-seed per section from
 *  the paper's seed. Mirrors the Full Mock blueprint's module-private `hashCell`
 *  (that file stays byte-untouched, so these five lines are mirrored, not imported). */
function hashCell(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Draw one section's questions from its REAL candidate pool through the SHARED
 * `drawBalancedSet` (the Full Mock helper, reused verbatim — never forked): a
 * deliberate ~half-PYQ / half-fresh mix where the pool allows, with the helper's
 * honest fallback (thin/zero PYQ → the shortfall fills from the other class; an
 * all-fresh section is a valid section; never padded, no class ever hidden).
 * Shuffling is the helper's own seeded Fisher–Yates — the spec (§8) mandates a
 * fresh draw per test, which the caller's per-paper seed provides. Exported for
 * the unit tests: the zero-PYQ fallback is only provable on a synthetic pool.
 */
export function drawCTSection<T>(
  pool: readonly T[],
  count: number,
  seed: number,
): BalancedDrawResult<T> {
  return drawBalancedSet({ pool, count, seed });
}

export interface CTBlueprintRow extends CTSectionSpec {
  /** Questions actually drawn for this section (honest — may be < target when the
   *  bank is thin for this topic; never padded with fabricated items). */
  actualCount: number;
  actualMarks: number;
}

export interface DrawnChapterTest {
  /** In-memory PersistedWorksheet — drives the shared renderers + grader. NEVER
   *  persisted to the worksheet store (decision D2). Carries the CT- code/name. */
  paper: PersistedWorksheet;
  blueprint: CTBlueprintRow[];
  objectiveCount: number;
  subjectiveCount: number;
  totalMarks: number;
  /** Honest gate — false → the setup shows an empty state, not a thin/faked test. */
  enoughQuestions: boolean;
}

/**
 * Draw one fresh chapter test for a topic from the canonical bank. Each section is
 * filled from the REAL pool by exact numeric marks (never the coarse fused
 * buckets — §7): A = keyed MCQ objective, B = 1–2-mark, C = 3-mark, D = ≥4-mark
 * (5-mark long answer + 4-mark case-based) — see `chapterTestSectionFor`. Within
 * each section the pick routes through the shared `drawBalancedSet` for a
 * deliberate PYQ + fresh mix (the Full Mock pattern; the helper's honest fallback
 * covers thin/zero-PYQ topics). Questions
 * are numbered in board order A→B→C→D. Deterministic for a given seed; when no
 * seed is supplied one is minted fresh per call — the spec-required fresh draw.
 * The caller supplies the stable ids/code so the same draw survives a re-render.
 */
export function drawChapterTest(args: {
  subject: CTSubject;
  topicKey: string;
  topicLabel: string;
  grade?: string;
  worksheetId: string;
  code?: string;
  name?: string;
  createdAt?: string;
  /** PRNG seed — same seed, same paper (the unit-test seam). Absent → minted
   *  fresh per draw, the Full Mock page's exact recipe, kept in-blueprint so
   *  callers stay unchanged. */
  seed?: number;
}): DrawnChapterTest {
  const { subject, topicKey, topicLabel } = args;
  const seed = args.seed ?? (Math.random() * 0xffffffff) >>> 0;
  const all = selectBankQuestions({ subject, topicKeys: [topicKey] });
  // Every pool comes from the ONE exported predicate above (Section A must be
  // auto-gradeable 0-or-full — key resolves to an option; B/C/D are exact numeric
  // bands, never the coarse fused buckets).
  const bySection = (section: BoardSection) =>
    all.filter((q) => chapterTestSectionFor(q) === section);

  const used = new Set<string>();
  const chosen: Array<{ q: CanonicalQuestion; section: BoardSection }> = [];

  const pools: Record<BoardSection, CanonicalQuestion[]> = {
    A: bySection("A"),
    B: bySection("B"),
    C: bySection("C"),
    D: bySection("D"),
  };
  // Balanced per-section draw (the Full Mock pass-1 pattern): each section pulls
  // from its not-yet-used candidates through the shared helper, seeded per
  // section off the paper seed. The used-set dedupe is retained across sections.
  for (const spec of CT_BLUEPRINT) {
    const cell = pools[spec.section].filter((q) => !used.has(q.id || q.questionText));
    const r = drawCTSection(cell, spec.targetCount, seed ^ hashCell(`CT:${spec.section}`));
    for (const q of r.drawn) {
      used.add(q.id || q.questionText);
      chosen.push({ q, section: spec.section });
    }
  }

  // Board order A→B→C→D, numbered 1..N.
  const order: BoardSection[] = ["A", "B", "C", "D"];
  const questions: PersistedWorksheetQuestion[] = [];
  let qNumber = 1;
  for (const sec of order) {
    for (const { q } of chosen.filter((c) => c.section === sec)) {
      questions.push({
        qNumber: qNumber++,
        id: q.id,
        subject: q.subject,
        topicKey: q.topicKey,
        topicLabel,
        section: sec,
        marks: Number(q.marks) || 0,
        questionText: q.questionText,
        options: q.options,
        solutionSteps: q.solutionSteps,
        finalAnswer: q.finalAnswer,
        answer: q.answer,
      });
    }
  }

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const blueprint: CTBlueprintRow[] = CT_BLUEPRINT.map((spec) => {
    const rows = questions.filter((q) => q.section === spec.section);
    return {
      ...spec,
      actualCount: rows.length,
      actualMarks: rows.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    };
  });
  const objectiveCount = questions.filter((q) => q.section === "A").length;
  const subjectiveCount = questions.length - objectiveCount;

  const paper: PersistedWorksheet = {
    worksheetId: args.worksheetId,
    createdAt: args.createdAt ?? new Date().toISOString(),
    title: args.name ?? `${topicLabel} · Chapter Test`,
    subject,
    grade: args.grade ?? "10",
    sectionFilter: "A-D",
    totalMarks,
    questions,
    code: args.code,
    name: args.name,
  };

  return {
    paper,
    blueprint,
    objectiveCount,
    subjectiveCount,
    totalMarks,
    enoughQuestions: questions.length >= MIN_TEST_QUESTIONS,
  };
}

/** The subjective (Section B–D) questions — the ones the student writes on paper
 *  and uploads. Section A is auto-graded on-screen and never uploaded. */
export function subjectiveQuestions(paper: PersistedWorksheet): PersistedWorksheetQuestion[] {
  return paper.questions.filter((q) => String(q.section).toUpperCase() !== "A");
}

/** The objective (Section A) questions — auto-graded 0-or-full on submit. */
export function objectiveQuestions(paper: PersistedWorksheet): PersistedWorksheetQuestion[] {
  return paper.questions.filter((q) => String(q.section).toUpperCase() === "A");
}
