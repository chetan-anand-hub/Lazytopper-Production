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
import { desktopTopicBySlug } from "../desktop/topics";
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
  return desktopTopicBySlug(slug)?.name ?? slug;
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

/** The chapter's pack rows, board order. The chapter must be loaded (`loadChapter`). */
export function chapterPackRows(slug: string): CanonicalQuestion[] {
  const rows = selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] }).filter(
    (q) => !isExcludedFromPacks(q) && sectionRank(q.section) < 99,
  );
  return [...rows].sort((a, b) => sectionRank(a.section) - sectionRank(b.section) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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
    const shuffled = seededShuffle(list, mulberry32(seed ^ hashSeed(`ws:${sec}`)));
    out.push(...shuffled.slice(0, WORKSHEET_SECTION_TAKE[sec]).sort((a, b) => (a.id < b.id ? -1 : 1)));
  }
  return out;
}

/** The exact number of questions in a chapter pack (page copy). The chapter must be loaded. */
export function countChapterQuestions(slug: string): number {
  return chapterPackRows(slug).length;
}
