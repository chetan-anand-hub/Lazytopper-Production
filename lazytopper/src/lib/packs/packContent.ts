/**
 * packContent — what a pack contains, read from the question bank (PACKS-CLIENT-1, contract §4).
 *
 * LAZY-ONLY. This module reaches the bank, so it must never be statically imported from the entry chunk or
 * from the pack page's first paint: PacksPage and buildPackFiles reach it through `import()`.
 *
 * Chapter pack = every served bank row of the chapter, minus the rows that need a supplied figure the print
 * path cannot supply, in board order (section A..E, then id). The exclusion is the app's ONE figure rule,
 * `needsMissingFigure` (publishability Rule 5, with its reviewed false-positive allowlist), so a pack never
 * disagrees with the Worksheet / Chapter Test / Full Mock about what is printable.
 */
import { ensureBankChapters, ensureBankSubject, getBankRowsForSubject } from "../../data/bankChapters/loader";
import { selectBankQuestions } from "../../data/bankQuery";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { needsMissingFigure } from "../figureSafe";
import { isCbq } from "../cbq/cbqClassification";
import { packChapterLabel } from "./packLabels";
import type { ServedAt } from "../freshSet/servedHistory";
import { mulberry32, seededShuffle } from "../../utils/balancedMockDraw";
import type { PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";
import { subjectLabel, subjectOfChapter, type PackSubject } from "../../services/packs";

export const PACK_SECTIONS = ["A", "B", "C", "D", "E"] as const;
export type PackSection = (typeof PACK_SECTIONS)[number];

/** A document with more questions than this is split into "Part k of n". */
export const MAX_QUESTIONS_PER_DOC = 60;

/** djb2 — a stable string hash; the seed of a pack's draws is `hashSeed(packId + ":" + index)`. */
export function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}

export function chapterName(slug: string): string {
  return packChapterLabel(slug);
}

export function bankSubjectOf(slug: string): "Maths" | "Science" {
  return subjectOfChapter(slug) === "science" ? "Science" : "Maths";
}

export function bankSubjectName(subject: PackSubject): "Maths" | "Science" {
  return subjectLabel(subject) as "Maths" | "Science";
}

/** Load a chapter's rows into the per-chapter cache (the bank is split by chapter). */
export async function loadChapter(slug: string): Promise<void> {
  await ensureBankChapters([slug]);
}

export async function loadSubjectBank(subject: PackSubject): Promise<void> {
  await ensureBankSubject(bankSubjectName(subject));
}

/**
 * Rows no pack ever prints because they touch CBSE 2026-27 deleted content (PACK-SYLLABUS-1, 5 Nov 2026), id -> why.
 *
 * The rows STAY served elsewhere in the app (they are not withheld from the bank: a shared withhold cascades into many pinned
 * guards, the same reasoning as CBQ_PACK_EXCLUDED_IDS). The pack simply never sells them. Judged by SUB-TOPIC against
 * scripts/src/syllabusGuard.ts and src/config/syllabus2026-27.ts, never by a bare word: an in-syllabus question that merely
 * mentions "solar" or "biogas" (Our Environment's energy flow, a Mensuration word problem) is NOT here. Only rows that either
 * test a deleted item, or carry a deleted item's name as student-visible text (an answer option, the key), are.
 * packSyllabus.guard.test.ts runs EVERY pack file through the guard, so a new hit fails CI instead of reaching a buyer.
 */
export const PACK_SYLLABUS_EXCLUDED: ReadonlyMap<string, string> = new Map([
  [
    "CFPQ-M-POLY-013",
    "Polynomials: a cubic f(x), (x + 1) is a factor, find the other zeroes by dividing it out. The reference lists \"Division algorithm for polynomials (long division, finding remaining zeros by division)\" and the cubic as OUT for 2026-27.",
  ],
  [
    "CFPQ-M-POLY-014",
    "Polynomials: a cubic f(x) = x^3 - 3x^2 + 4 with one zero given (2); the other zeroes are found by dividing out (x - 2) / comparing coefficients. Same reason as CFPQ-M-POLY-013: 'finding remaining zeros by division' and the cubic are OUT for 2026-27.",
  ],
  [
    "ME2-004",
    "Magnetic Effects: options 'Direction of induced current' / 'Magnitude of induced EMF'. Electromagnetic induction is OUT / FORMATIVE in src/config/syllabus2026-27.ts; the deleted item is printed to the student as an option (same rule as the frustum options).",
  ],
  [
    "ME2-030",
    "Magnetic Effects: options 'Direction of induced current' / 'Direction of force on a current-carrying conductor'. Electromagnetic induction is OUT / FORMATIVE in src/config/syllabus2026-27.ts; the deleted item is printed to the student as an option.",
  ],
  ["SAV-N-EXEM2-12-MCQ-003", "Surface areas and volumes: 'frustum of a cone' (deleted: Frustum of Cone) is printed as an answer option."],
  ["SAV-N-EXMPLR-12-MCQ-001", "Surface areas and volumes: 'frustum of a cone and a cylinder' (deleted: Frustum of Cone) is printed as an answer option."],
  ["SAV-N-EXMPLR-12-MCQ-003", "Surface areas and volumes: 'frustum of a cone and a cylinder' (deleted: Frustum of Cone) is printed as an answer option."],
  ["BX-PLE-D-038", "Pair of linear equations: the printed answer cites 'the division algorithm' (deleted: Euclid's Division Lemma / Algorithm) as its justification."],
]);

/** True when the row is left out of every pack for syllabus reasons (see PACK_SYLLABUS_EXCLUDED). */
export function isSyllabusExcludedFromPacks(q: { id: string }): boolean {
  return PACK_SYLLABUS_EXCLUDED.has(q.id);
}

/** True when the row is left out of packs: it needs a supplied figure and none is bound to it, or it is a syllabus exclusion. */
export function isExcludedFromPacks(q: CanonicalQuestion): boolean {
  return needsMissingFigure(q) || isSyllabusExcludedFromPacks(q);
}

const sectionRank = (s: string): number => {
  const i = PACK_SECTIONS.indexOf(String(s).toUpperCase() as PackSection);
  return i < 0 ? 99 : i;
};

/* ── step-marked ranking (PACKS-UX-1, owner ruling 7) ──────────────────────────────────────────────────────── */

const MARK_NUM = String.raw`(\d+(?:\.\d+)?\s*\u00bd?|\u00bd|\d+\s*/\s*2)`;
const LEADING_MARK = new RegExp(String.raw`^\s*\[\s*${MARK_NUM}\s*marks?\s*\]`, "i");
const TRAILING_MARK = new RegExp(String.raw`\s\[\s*${MARK_NUM}\s*(?:marks?)?\s*\]\s*$`, "i");

function markValue(raw: string): number {
  const t = raw.replace(/\s+/g, "");
  if (t === "\u00bd" || t === "1/2") return 0.5;
  if (t.endsWith("\u00bd")) return Number(t.slice(0, -1)) + 0.5;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * True when the question has FULL step marks: every solution step carries its own `[N mark]` mark and they sum to
 * `marks`. A 1-mark objective question (MCQ / Assertion-Reason, i.e. Section A) counts as step-marked: CBSE scores it
 * 0 or 1 on the answer alone, and the key shows one "1 mark" chip for the whole solution.
 */
export function isStepMarked(q: { marks: number | string; options?: readonly string[]; solutionSteps?: readonly string[] }): boolean {
  const marks = Number(q.marks) || 0;
  if (marks === 1 && Array.isArray(q.options) && q.options.length >= 2) return true;
  const steps = Array.isArray(q.solutionSteps) ? q.solutionSteps.filter(Boolean) : [];
  if (steps.length === 0 || marks <= 0) return false;
  let sum = 0;
  for (const st of steps) {
    const m = LEADING_MARK.exec(st) ?? TRAILING_MARK.exec(st);
    if (!m) return false;
    const v = markValue(m[1]);
    if (!Number.isFinite(v)) return false;
    sum += v;
  }
  return Math.abs(sum - marks) < 1e-9;
}

/** Stable partition: step-marked rows first, the rest after, each keeping its relative order. */
export function stepMarkedFirst<T extends { marks: number | string; options?: readonly string[]; solutionSteps?: readonly string[] }>(rows: readonly T[]): T[] {
  return [...rows.filter((q) => isStepMarked(q)), ...rows.filter((q) => !isStepMarked(q))];
}

/** servedAt value of a row that is NOT step-marked: the oldest rank, so it is drawn only when a slot cannot be filled. */
export const NOT_STEP_MARKED_AT = 1;
/** servedAt base for a question already used in an earlier paper of the same pack (later paper, larger value). */
export const USED_IN_PAPER_AT = 1_000_000;

/**
 * The `servedAt` map the app's own tests/mocks draws take (FRESH-SET-TESTS): rows that are not step-marked rank behind
 * the step-marked ones, and rows used in earlier papers of the pack (`usedIds`, in paper order) rank behind both. The
 * blueprints draw never-served rows first and take served ones only where a slot cannot otherwise be filled.
 */
export function packServedAt(
  rows: ReadonlyArray<{ id: string; marks: number | string; options?: readonly string[]; solutionSteps?: readonly string[] }>,
  usedIds: ReadonlyArray<ReadonlySet<string>> = [],
): ServedAt {
  const m = new Map<string, number>();
  for (const q of rows) if (!isStepMarked(q)) m.set(q.id, NOT_STEP_MARKED_AT);
  usedIds.forEach((ids, i) => ids.forEach((id) => m.set(id, USED_IN_PAPER_AT + i)));
  return m;
}

/** servedAt value of a syllabus-excluded row in a RE-draw: ranked behind everything, so a paper takes it only if a slot cannot otherwise be filled. */
export const SYLLABUS_EXCLUDED_AT = 2_000_000;

/**
 * Run a seeded paper draw; if it printed a syllabus-excluded row, draw once more with those rows ranked last.
 * A draw that never touches an excluded row is returned untouched, so existing papers stay byte-identical. Best effort by design
 * (a paper must not fail to download): packSyllabus.guard.test.ts is what proves no shipped paper holds an excluded row.
 */
export function drawAvoidingExcluded<T extends { paper: { questions: ReadonlyArray<{ id: string }> } }>(
  draw: (servedAt: ServedAt) => T,
  servedAt: ServedAt,
): T {
  const first = draw(servedAt);
  const hit = first.paper.questions.filter((q) => PACK_SYLLABUS_EXCLUDED.has(q.id)).map((q) => q.id);
  if (hit.length === 0) return first;
  const next = new Map(servedAt);
  for (const id of PACK_SYLLABUS_EXCLUDED.keys()) next.set(id, SYLLABUS_EXCLUDED_AT);
  return draw(next);
}

/**
 * The chapter's pack rows, board order: sections A..E, and WITHIN a section the step-marked questions first, then the
 * rest (each tier by id). The chapter must be loaded (`loadChapter`).
 */
export function chapterPackRows(slug: string): CanonicalQuestion[] {
  return orderChapterRows(
    selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] }).filter(
      (q) => !isExcludedFromPacks(q) && sectionRank(q.section) < 99,
    ),
  );
}

/**
 * The chapter's rows as the pack's SEEDED DRAWS (Chapter Tests, Worksheet) saw them before PACK-SYLLABUS-1: the figure rule only,
 * the syllabus exclusions not applied. A seeded draw over a shorter list is a different draw, so a paper a buyer already
 * downloaded would change under them; drawing from this list keeps every paper that never touched an excluded row byte-identical,
 * and `drawAvoidingExcluded` redraws the (today none) paper that would have printed one. The question SHEETS use chapterPackRows.
 * The chapter must be loaded (`loadChapter`).
 */
export function chapterPackDrawRows(slug: string): CanonicalQuestion[] {
  return orderChapterRows(
    selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] }).filter(
      (q) => !needsMissingFigure(q) && sectionRank(q.section) < 99,
    ),
  );
}

function orderChapterRows(rows: CanonicalQuestion[]): CanonicalQuestion[] {
  const tier = (q: CanonicalQuestion): number => (isStepMarked(q) ? 0 : 1);
  return [...rows].sort(
    (a, b) => sectionRank(a.section) - sectionRank(b.section) || tier(a) - tier(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function groupBySection(rows: readonly CanonicalQuestion[]): Array<[PackSection, CanonicalQuestion[]]> {
  const out: Array<[PackSection, CanonicalQuestion[]]> = [];
  for (const sec of PACK_SECTIONS) {
    const list = rows.filter((q) => String(q.section).toUpperCase() === sec);
    if (list.length > 0) out.push([sec, list]);
  }
  return out;
}

/** Equal-as-possible parts of at most MAX_QUESTIONS_PER_DOC. A list that fits is one part. */
export function splitIntoParts<T>(list: readonly T[], max: number = MAX_QUESTIONS_PER_DOC): T[][] {
  if (list.length === 0) return [];
  const n = Math.ceil(list.length / max);
  const size = Math.ceil(list.length / n);
  const parts: T[][] = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

/** A pack question row: the worksheet row plus the provenance fields the print doc's source tag reads when present. */
export type PackWorksheetQuestion = PersistedWorksheetQuestion & {
  pyqYear?: string;
  pyqSet?: string;
  sourceOverride?: string;
};

export function toWorksheetQuestion(q: CanonicalQuestion, qNumber: number, topicLabel: string): PackWorksheetQuestion {
  return {
    qNumber,
    id: q.id,
    subject: q.subject,
    topicKey: q.topicKey,
    topicLabel,
    section: String(q.section).toUpperCase(),
    marks: Number(q.marks) || 0,
    questionText: q.questionText,
    options: q.options,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    answer: q.answer,
    ...(q.pyqYear !== undefined ? { pyqYear: q.pyqYear } : {}),
    ...(q.pyqSet !== undefined ? { pyqSet: q.pyqSet } : {}),
    ...(q.sourceOverride !== undefined ? { sourceOverride: String(q.sourceOverride) } : {}),
  };
}

/** Carry pyqYear / pyqSet / sourceOverride from the bank rows (matched by id) onto a drawn paper's questions. */
export function withProvenance<T extends PersistedWorksheetQuestion>(questions: readonly T[], rows: readonly CanonicalQuestion[]): Array<T & PackWorksheetQuestion> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return questions.map((q) => {
    const r = byId.get(q.id);
    if (!r) return q;
    return {
      ...q,
      ...(r.pyqYear !== undefined ? { pyqYear: r.pyqYear } : {}),
      ...(r.pyqSet !== undefined ? { pyqSet: r.pyqSet } : {}),
      ...(r.sourceOverride !== undefined ? { sourceOverride: String(r.sourceOverride) } : {}),
    };
  });
}

/** Every bank row of a subject (for provenance lookups). The subject must be loaded (`loadSubjectBank`). */
export function subjectBankRows(subject: PackSubject): CanonicalQuestion[] {
  return getBankRowsForSubject(bankSubjectName(subject));
}

/** Per-section caps of the pack Worksheet. */
export const WORKSHEET_SECTION_TAKE: Readonly<Record<PackSection, number>> = { A: 5, B: 3, C: 3, D: 2, E: 2 };

/**
 * The pack Worksheet: a seeded sample of the chapter's rows, a few per section, in board order. Same seed,
 * same ids. Uses the app's seeded PRNG, never Math.random.
 */
export function drawPackWorksheetRows(rows: readonly CanonicalQuestion[], seed: number, skip?: (q: CanonicalQuestion) => boolean): CanonicalQuestion[] {
  const out: CanonicalQuestion[] = [];
  for (const [sec, list] of groupBySection(rows)) {
    // Step-marked questions are taken first; the others only when the section has too few (a stable partition after the seeded shuffle).
    const shuffled = stepMarkedFirst(seededShuffle(list, mulberry32(seed ^ hashSeed(`ws:${sec}`))));
    // `skip` drops a row from the ORDER the draw walks, so the row after it takes its place and everything else stays put.
    const pick = skip ? shuffled.filter((q) => !skip(q)) : shuffled;
    out.push(...pick.slice(0, WORKSHEET_SECTION_TAKE[sec]).sort((a, b) => (a.id < b.id ? -1 : 1)));
  }
  return out;
}

/**
 * The pack Worksheet's rows with the syllabus exclusions applied as a SWAP: the same seeded walk over `drawRows` (the list the draw has
 * always used), skipping an excluded row, so the next row of that section takes its slot (same section, same marks bucket) and every
 * other question stays where it was. A worksheet that holds no excluded row is unchanged.
 */
export function drawPackWorksheetRowsSafe(drawRows: readonly CanonicalQuestion[], seed: number): CanonicalQuestion[] {
  return drawPackWorksheetRows(drawRows, seed, isSyllabusExcludedFromPacks);
}

/** The exact number of questions in a chapter pack (page copy). The chapter must be loaded. */
export function countChapterQuestions(slug: string): number {
  return chapterPackRows(slug).length;
}


/* ── Board CBQ Pack (CBQ-PACK-1) ──────────────────────────────────────────────────────────────────────────── */

/** A Case-Based row whose stem is shorter than this is not a real case study (a lone sub-question). */
export const CBQ_MIN_CASE_CHARS = 150;

/**
 * Rows the CBQ pack never prints even if they are served: the single-part case-study FRAGMENTS and multi-part cases whose shared
 * table/figure is not in the row (owner list, 29 Oct 2026). They stay served elsewhere (withholding them from the whole bank
 * cascades into many pinned guards: a separate lane); the CBQ pack simply never sells them.
 */
export const CBQ_PACK_EXCLUDED_IDS: ReadonlySet<string> = new Set([
  "CBE-M-AP-B-003",
  "CBE-M-AP-C-001",
  "CBE-S-ENVI-E-002",
  "SQP-S-2023-MNM-E-001",
  "SQP-S-2023-HEYE-E-001",
  "SQP-S-2025-LGHT-038",
]);

/** Printing order of the formats inside a section: objective first, case study and long answer last. */
const CBQ_FORMAT_RANK: Readonly<Record<string, number>> = {
  MCQ: 0,
  "Assertion-Reasoning": 1,
  VSA: 2,
  Short: 3,
  "Case-Based": 4,
  Long: 5,
};

/** Is this served row sold in the CBQ pack? */
export function isCbqPackRow(q: CanonicalQuestion): boolean {
  if (!isCbq(q)) return false;
  if (CBQ_PACK_EXCLUDED_IDS.has(q.id)) return false;
  if (isExcludedFromPacks(q)) return false;
  if (sectionRank(q.section) >= 99) return false;
  if (!isStepMarked(q)) return false;
  if (q.format === "Case-Based" && String(q.questionText ?? "").length < CBQ_MIN_CASE_CHARS) return false;
  return true;
}

/**
 * The CBQ pack rows of a chapter: every served competency-based row that has a figure-safe stem, full step marks and (for a
 * case study) a real case; sections A..E, within a section by format (MCQ, Assertion-Reasoning, VSA, Short, Case-Based, Long),
 * then marks, then id. The chapter must be loaded (`loadChapter`).
 */
export function cbqPackRows(slug: string): CanonicalQuestion[] {
  const rows = selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] }).filter(isCbqPackRow);
  const fmt = (q: CanonicalQuestion): number => CBQ_FORMAT_RANK[String(q.format)] ?? 9;
  return [...rows].sort(
    (a, b) =>
      sectionRank(a.section) - sectionRank(b.section) ||
      fmt(a) - fmt(b) ||
      (Number(a.marks) || 0) - (Number(b.marks) || 0) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** The exact number of CBQs the pack holds for a chapter (page copy). The chapter must be loaded. */
export function countCbqPackQuestions(slug: string): number {
  return cbqPackRows(slug).length;
}
