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

/** True when the row is left out of packs: it needs a supplied figure and none is bound to it. */
export function isExcludedFromPacks(q: CanonicalQuestion): boolean {
  return needsMissingFigure(q);
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

/**
 * The chapter's pack rows, board order: sections A..E, and WITHIN a section the step-marked questions first, then the
 * rest (each tier by id). The chapter must be loaded (`loadChapter`).
 */
export function chapterPackRows(slug: string): CanonicalQuestion[] {
  const rows = selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] }).filter(
    (q) => !isExcludedFromPacks(q) && sectionRank(q.section) < 99,
  );
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
export function drawPackWorksheetRows(rows: readonly CanonicalQuestion[], seed: number): CanonicalQuestion[] {
  const out: CanonicalQuestion[] = [];
  for (const [sec, list] of groupBySection(rows)) {
    // Step-marked questions are taken first; the others only when the section has too few (a stable partition after the seeded shuffle).
    const shuffled = stepMarkedFirst(seededShuffle(list, mulberry32(seed ^ hashSeed(`ws:${sec}`))));
    out.push(...shuffled.slice(0, WORKSHEET_SECTION_TAKE[sec]).sort((a, b) => (a.id < b.id ? -1 : 1)));
  }
  return out;
}

/** The exact number of questions in a chapter pack (page copy). The chapter must be loaded. */
export function countChapterQuestions(slug: string): number {
  return chapterPackRows(slug).length;
}
