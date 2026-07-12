// src/components/fullmock/fullMockBlueprint.ts
//
// FULL MOCK SOURCING + PAPER ASSEMBLY (locked spec §2/§3 + dispatch §3.1–3.2).
//
// A Full Mock is a WHOLE-SUBJECT board paper (Sections A–E, ~38 Q / 80 marks)
// drawn fresh from the DUAL-SOURCE UNION pool — resolves [FU-FM-RESOURCE-PREDICTED]:
//   • canonicalQuestionBank (every authored / extracted / PYQ question), PLUS
//   • the live predicted (HPQ) bank for the subject
//     (Maths: predictedQuestions · Science: sciencePredictedQuestions —
//      predictedScienceQuestions.ts is planner-only and EXCLUDED, owner decision 5).
// NEVER predicted-only, never pyqOnly: every eligible question can reach a mock.
//
// Chapter weightage comes from the trends data (`weightagePercent` — the engine's
// encoding of the real CBSE distribution) via the KEPT `allocateByPercent` from
// utils/mockBlueprint.ts; the PYQ/fresh mix inside each (section × chapter) cell
// comes from the shared `drawBalancedSet` (utils/balancedMockDraw.ts).
//
// SYLLABUS GUARD: the chapter registry is trends ∩ the canonical `topics.ts`
// registry (validated through `desktopTopicBySlug` after `resolveCanonicalSlug`),
// so a banned / deleted / unknown chapter key can never leak into the weightage
// legend or the draw — the legend is a topic list and lists only canonical topics.
//
// HONESTY: a chapter thin in a band redistributes its shortfall to the rest of
// the section's real pool (second pass); a section thin overall simply draws
// fewer (`actualCount < targetCount`, shown as such) — nothing is padded or
// fabricated. Section A eligibility requires the answer KEY to RESOLVE against
// the question's own options (a mis-keyed MCQ would deterministically mis-score a
// correct pick, so it is excluded rather than guessed at — the #352 bar).
//
// The drawn paper is a PersistedWorksheet-shaped object held IN MEMORY ONLY
// (never saved to the worksheet store — the CT D2 precedent) so the SHARED
// renderers + grader run byte-unchanged. Its code/name carry the FULL-MOCK
// identity (FM-…), never WS-/CT-.

import type { CanonicalQuestion } from "../../data/predictionTypes";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { predictedQuestions, type PredictedQuestion } from "../../data/predictedQuestions";
import {
  sciencePredictedQuestions,
  type SciencePredictedQuestion,
} from "../../data/predictedQuestionsScience";
import { class10MathTopicTrends } from "../../data/class10MathTopicTrends";
import { class10ScienceTopicTrends } from "../../data/class10ScienceTopicTrends";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { resolveTopicDisplayName } from "../../utils/topicResolver";
import { allocateByPercent } from "../../utils/mockBlueprint";
import { drawBalancedSet } from "../../utils/balancedMockDraw";
import { isPYQQuestion } from "../../data/practiceSetGenerator";
import type {
  PersistedWorksheet,
  PersistedWorksheetQuestion,
} from "../../services/worksheetSessionStore";

export type FMSubject = "Maths" | "Science";
export type FMSection = "A" | "B" | "C" | "D" | "E";

export interface FMSectionSpec {
  section: FMSection;
  label: string;
  /** Board-blueprint question count (A 20×1 · B 5×2 · C 6×3 · D 4×5 · E 3×4 = 80). */
  targetCount: number;
  marksEach: number;
  /** Section A objective auto-grades 0-or-full on submit; B–E upload. */
  autoGraded: boolean;
}

// The CBSE 80-mark board blueprint (matches mockPaperEngine's
// DEFAULT_SECTION_BLUEPRINT and the locked mockup): 38 questions / 80 marks.
export const FM_BLUEPRINT: readonly FMSectionSpec[] = [
  { section: "A", label: "Objective (MCQ / AR)", targetCount: 20, marksEach: 1, autoGraded: true },
  { section: "B", label: "Very short answer", targetCount: 5, marksEach: 2, autoGraded: false },
  { section: "C", label: "Short answer", targetCount: 6, marksEach: 3, autoGraded: false },
  { section: "D", label: "Long answer", targetCount: 4, marksEach: 5, autoGraded: false },
  { section: "E", label: "Case-based", targetCount: 3, marksEach: 4, autoGraded: false },
] as const;

/** 3 hours — the board duration. Always on, no toggle (spec §2). */
export const FM_DURATION_MS = 3 * 60 * 60 * 1000;

/** Below this many drawable questions the setup shows an honest empty state —
 *  a 5-question "board mock" would be a fake paper, not a thin one. */
const MIN_MOCK_QUESTIONS = 15;

export interface FMBlueprintRow extends FMSectionSpec {
  /** Honest — may be < target when the union pool is thin; never padded. */
  actualCount: number;
  actualMarks: number;
}

/** One chapter of the setup weightage bar/legend — canonical slugs only. */
export interface FMChapterWeight {
  slug: string;
  label: string;
  percent: number;
}

export interface DrawnFullMock {
  /** In-memory PersistedWorksheet (FM- identity) — drives the shared renderers +
   *  grader byte-unchanged. NEVER persisted to the worksheet store. */
  paper: PersistedWorksheet;
  blueprint: FMBlueprintRow[];
  chapterWeights: FMChapterWeight[];
  objectiveCount: number;
  subjectiveCount: number;
  totalMarks: number;
  /** The REAL mix of the draw (shown to the student — never the target implied). */
  pyqCount: number;
  freshCount: number;
  enoughQuestions: boolean;
}

// ── The union pool ───────────────────────────────────────────────────────────

/** A pool item — the union VIEW over CanonicalQuestion and PredictedQuestion.
 *  Every field is copied from the source question (honest renames only, e.g. the
 *  shared-string `kind`→format distinction never matters here); nothing is
 *  fabricated. `pyqYear`/`isPYQ` pass through so `isPYQQuestion` classifies. */
export interface FMPoolQuestion {
  id: string;
  topicSlug: string;
  subtopic?: string;
  marks: number;
  questionText: string;
  options?: string[];
  answer?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  pyqYear?: string;
  isPYQ?: boolean;
  source: "canonical" | "predicted";
}

const norm = (s: string): string => String(s || "").trim().toLowerCase();
const normText = (s: string): string => norm(s).replace(/\s+/g, " ");

function fromCanonical(q: CanonicalQuestion): FMPoolQuestion {
  return {
    id: q.id,
    topicSlug: resolveCanonicalSlug(q.topicKey),
    subtopic: q.subtopic,
    marks: Number(q.marks) || 0,
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    pyqYear: q.pyqYear,
    source: "canonical",
  };
}

function fromPredicted(q: PredictedQuestion | SciencePredictedQuestion): FMPoolQuestion {
  return {
    id: q.id,
    topicSlug: resolveCanonicalSlug(String(q.topicKey)),
    subtopic: q.subtopic,
    marks: Number(q.marks) || 0,
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    // No pyqYear on the predicted shape: predicted questions are the FRESH class
    // under the shipped isPYQQuestion matcher (authored, not past-year-tagged).
    source: "predicted",
  };
}

/**
 * The subject's chapter registry with board weightage: every trends entry that
 * resolves to a canonical `topics.ts` chapter OF THIS SUBJECT. The double gate
 * (resolveCanonicalSlug + desktopTopicBySlug + subject match) means a banned,
 * deleted, or unknown chapter key can never appear in the legend or the draw.
 */
export function fullMockChapterWeights(subject: FMSubject): FMChapterWeight[] {
  const entries: Array<{ spellings: string[]; percent: number }> =
    subject === "Science"
      ? Object.values(class10ScienceTopicTrends.topics).map((t) => ({
          spellings: [t.topicName, String(t.topicKey)],
          percent: Number(t.weightagePercent) || 0,
        }))
      : Object.entries(
          class10MathTopicTrends.topics as Record<string, { weightagePercent: number }>,
        ).map(([name, meta]) => ({
          spellings: [name],
          percent: Number(meta.weightagePercent) || 0,
        }));

  const out: FMChapterWeight[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    let slug = "";
    for (const spelling of e.spellings) {
      const candidate = resolveCanonicalSlug(spelling);
      const meta = candidate ? desktopTopicBySlug(candidate) : undefined;
      if (meta && norm(meta.subject) === norm(subject)) {
        slug = meta.slug;
        break;
      }
    }
    if (!slug || seen.has(slug) || e.percent <= 0) continue;
    seen.add(slug);
    out.push({ slug, label: resolveTopicDisplayName(subject, slug), percent: e.percent });
  }
  return out;
}

/** Section A must auto-grade deterministically 0-or-full, so an objective
 *  question is eligible ONLY when its answer key RESOLVES against its own
 *  options (the #352 bar) — a mis-keyed MCQ would score a correct pick 0. */
function isAutoGradeableObjective(q: FMPoolQuestion): boolean {
  if (!Array.isArray(q.options) || q.options.length < 2) return false;
  const key = norm(q.answer || "");
  if (!key) return false;
  return q.options.some((o) => norm(o) === key);
}

function isMcqShaped(q: FMPoolQuestion): boolean {
  return Array.isArray(q.options) && q.options.length >= 2;
}

/** The per-section eligibility bands — EXACT numeric marks (§7: never the coarse
 *  fused buckets). B–E are written sections, so MCQ-shaped items stay out. */
function sectionPool(pool: FMPoolQuestion[], section: FMSection): FMPoolQuestion[] {
  switch (section) {
    case "A":
      return pool.filter((q) => q.marks === 1 && isAutoGradeableObjective(q));
    case "B":
      return pool.filter((q) => q.marks === 2 && !isMcqShaped(q));
    case "C":
      return pool.filter((q) => q.marks === 3 && !isMcqShaped(q));
    case "D":
      return pool.filter((q) => q.marks === 5 && !isMcqShaped(q));
    case "E":
      return pool.filter((q) => q.marks === 4 && !isMcqShaped(q));
  }
}

/**
 * Build the union pool for a subject: canonical + the live predicted bank,
 * restricted to the subject's canonical chapters, deduped by id and by
 * normalised question text (canonical wins — it carries the richer metadata).
 */
export function buildUnionPool(subject: FMSubject, chapterSlugs: Set<string>): FMPoolQuestion[] {
  const canonical = canonicalQuestionBank
    .filter((q) => q.subject === subject)
    .map(fromCanonical);
  const predicted = (
    subject === "Science" ? sciencePredictedQuestions : predictedQuestions
  ).map(fromPredicted);

  const out: FMPoolQuestion[] = [];
  const seenIds = new Set<string>();
  const seenText = new Set<string>();
  for (const q of [...canonical, ...predicted]) {
    if (!chapterSlugs.has(q.topicSlug)) continue;
    const idKey = q.id || q.questionText;
    const textKey = normText(q.questionText);
    if (seenIds.has(idKey) || (textKey && seenText.has(textKey))) continue;
    seenIds.add(idKey);
    if (textKey) seenText.add(textKey);
    out.push(q);
  }
  return out;
}

/** djb2 — a tiny stable string hash to derive a distinct sub-seed per
 *  (section × chapter) cell from the paper's seed. */
function hashCell(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Draw one fresh Full Mock for a subject. Each section's count is distributed
 * across chapters by board weightage, each cell drawn through `drawBalancedSet`
 * for the PYQ/fresh mix, shortfalls redistributed within the section (honest —
 * the paper never shrinks a chapter silently; it only shrinks when the WHOLE
 * section pool is thin, and says so). Deterministic for a given seed.
 */
export function drawFullMock(args: {
  subject: FMSubject;
  grade?: string;
  worksheetId: string;
  code: string;
  name: string;
  seed: number;
  pyqTargetFraction?: number;
  createdAt?: string;
}): DrawnFullMock {
  const { subject, worksheetId, code, name, seed } = args;
  const chapterWeights = fullMockChapterWeights(subject);
  const slugSet = new Set(chapterWeights.map((c) => c.slug));
  const pool = buildUnionPool(subject, slugSet);
  const labelBySlug = new Map(chapterWeights.map((c) => [c.slug, c.label]));

  const used = new Set<string>();
  const notUsed = (q: FMPoolQuestion) => !used.has(q.id || q.questionText);
  const markUsed = (qs: FMPoolQuestion[]) => qs.forEach((q) => used.add(q.id || q.questionText));

  const bySection = new Map<FMSection, FMPoolQuestion[]>();
  for (const spec of FM_BLUEPRINT) {
    const secPool = sectionPool(pool, spec.section);
    const counts = allocateByPercent(
      spec.targetCount,
      chapterWeights.map((c) => ({ key: c.slug, percent: c.percent })),
    );

    // Pass 1 — per-chapter cells, board-weighted, PYQ/fresh balanced.
    const chosen: FMPoolQuestion[] = [];
    for (const c of chapterWeights) {
      const want = counts[c.slug] ?? 0;
      if (want <= 0) continue;
      const cell = secPool.filter((q) => q.topicSlug === c.slug && notUsed(q));
      const r = drawBalancedSet({
        pool: cell,
        count: want,
        pyqTargetFraction: args.pyqTargetFraction,
        seed: seed ^ hashCell(`${spec.section}:${c.slug}`),
      });
      markUsed(r.drawn);
      chosen.push(...r.drawn);
    }

    // Pass 2 — redistribute any shortfall to the section's remaining real pool
    // (other chapters' spare questions), still balanced. Honest: if the whole
    // section is thin, actualCount stays < target — never padded.
    const shortfall = spec.targetCount - chosen.length;
    if (shortfall > 0) {
      const leftover = secPool.filter(notUsed);
      const r = drawBalancedSet({
        pool: leftover,
        count: shortfall,
        pyqTargetFraction: args.pyqTargetFraction,
        seed: seed ^ hashCell(`${spec.section}:redistribute`),
      });
      markUsed(r.drawn);
      chosen.push(...r.drawn);
    }
    bySection.set(spec.section, chosen);
  }

  // Assemble in board order A→E, numbered 1..N.
  const questions: PersistedWorksheetQuestion[] = [];
  let qNumber = 1;
  for (const spec of FM_BLUEPRINT) {
    for (const q of bySection.get(spec.section) ?? []) {
      questions.push({
        qNumber: qNumber++,
        id: q.id,
        subject,
        topicKey: q.topicSlug,
        topicLabel: labelBySlug.get(q.topicSlug) ?? resolveTopicDisplayName(subject, q.topicSlug),
        section: spec.section,
        marks: q.marks,
        questionText: q.questionText,
        options: q.options,
        solutionSteps: q.solutionSteps,
        finalAnswer: q.finalAnswer,
        answer: q.answer,
      });
    }
  }

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const blueprint: FMBlueprintRow[] = FM_BLUEPRINT.map((spec) => {
    const rows = questions.filter((q) => q.section === spec.section);
    return {
      ...spec,
      actualCount: rows.length,
      actualMarks: rows.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    };
  });
  const objectiveCount = questions.filter((q) => q.section === "A").length;

  // Classify the REAL mix off the final selection — one source of truth.
  const drawnPool = new Map<string, FMPoolQuestion>();
  for (const q of pool) drawnPool.set(q.id || q.questionText, q);
  let pyqCount = 0;
  for (const q of questions) {
    const src = drawnPool.get(q.id || q.questionText);
    if (src && isPYQQuestion(src)) pyqCount += 1;
  }

  const paper: PersistedWorksheet = {
    worksheetId,
    createdAt: args.createdAt ?? new Date().toISOString(),
    title: name,
    subject,
    grade: args.grade ?? "10",
    sectionFilter: "A-E",
    totalMarks,
    questions,
    code,
    name,
  };

  return {
    paper,
    blueprint,
    chapterWeights,
    objectiveCount,
    subjectiveCount: questions.length - objectiveCount,
    totalMarks,
    pyqCount,
    freshCount: questions.length - pyqCount,
    enoughQuestions: questions.length >= MIN_MOCK_QUESTIONS,
  };
}

/** The subjective (Sections B–E) questions — written on paper and uploaded. */
export function fullMockSubjectiveQuestions(paper: PersistedWorksheet): PersistedWorksheetQuestion[] {
  return paper.questions.filter((q) => String(q.section).toUpperCase() !== "A");
}

/** The objective (Section A) questions — auto-graded 0-or-full on submit. */
export function fullMockObjectiveQuestions(paper: PersistedWorksheet): PersistedWorksheetQuestion[] {
  return paper.questions.filter((q) => String(q.section).toUpperCase() === "A");
}
