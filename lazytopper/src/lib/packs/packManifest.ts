/**
 * packManifest - what a pack contains, as plain data for the "What you get" slide of the pack pop-up (PACKS-UX-1).
 *
 * PURE and bank-free: it reads only the chapter list and the labels, so it can run on first paint without fetching the
 * question bank. It lists the KINDS of files (and how many papers there are), never a question count: exact counts need the
 * bank and come from `countChapterQuestions` in packContent (lazy). Mirrors what `buildPackFiles` builds:
 *   chapter  Section A-E question sheets + answer keys, Chapter Test 1 and 2, Worksheet (each paper with a key)
 *   mock     MOCKS_PER_SUBJECT full papers per subject (each with a key)
 *   subject  its chapters (grouped by chapter) + that subject's mock papers
 *   bundle   both subjects
 */
import {
  PACK_CHAPTER_SLUGS,
  PACK_PRICE_INR,
  PACK_SUBJECTS,
  chaptersOfSubject,
  subjectLabel,
  type PackSku,
  type PackSubject,
} from "../../services/packs";
import {
  ALL_NCERT_CHAPTERS,
  BUNDLE_NAME,
  MATHS_MOCK_PATTERN,
  MATHS_NCERT_CHAPTERS,
  MOCKS_PER_SUBJECT,
  SCIENCE_NCERT_CHAPTERS,
  packChapterLabel,
} from "./packLabels";

export interface PackManifestItem {
  /** Display name, e.g. "Chapter Test 1". */
  label: string;
  /** One short line under the name. */
  detail: string;
  /** True when the item ships with its own answer key file. */
  withKey: boolean;
}

export interface PackManifestGroup {
  /** "Real Numbers", "Maths mock papers" ... */
  heading: string;
  /** Present for chapter groups: the chapter slug. */
  chapter?: string;
  items: PackManifestItem[];
}

export interface PackManifest {
  title: string;
  groups: PackManifestGroup[];
  /** Chapter packs in the pack (a chapter pack is 1; Trigonometry is one pack covering Ch 8 + 9). */
  chapterPacks: number;
  /** Full mock papers in the pack. */
  mockPapers: number;
  /** Paper-shaped files you can print and solve: chapter tests, worksheets and mocks (each with a key). */
  papers: number;
}

const CHAPTER_ITEMS: readonly PackManifestItem[] = [
  { label: "Question sheets, Sections A to E", detail: "Every question of the chapter in board order, each section with its answer key", withKey: true },
  { label: "Chapter Test 1", detail: "A full test drawn from the chapter, with a worked-solution key", withKey: true },
  { label: "Chapter Test 2", detail: "A second test with different questions, with a worked-solution key", withKey: true },
  { label: "Worksheet", detail: "Mixed practice from all sections, with a worked-solution key", withKey: true },
];
/** Of the chapter's items, those that are papers (tests + worksheet). */
const CHAPTER_PAPERS = 3;

function chapterGroup(slug: string): PackManifestGroup {
  return { heading: packChapterLabel(slug), chapter: slug, items: CHAPTER_ITEMS.map((i) => ({ ...i })) };
}

const CBQ_CHAPTER_ITEMS: readonly PackManifestItem[] = [
  { label: "Competency-based questions", detail: "Every mark value, MCQ to long answer, in board order, with marks shown on each question", withKey: true },
];

function cbqChapterGroup(slug: string): PackManifestGroup {
  return { heading: packChapterLabel(slug), chapter: slug, items: CBQ_CHAPTER_ITEMS.map((i) => ({ ...i })) };
}

function mockGroup(subject: PackSubject): PackManifestGroup {
  const name = subjectLabel(subject);
  const pattern = subject === "maths" ? ` at ${MATHS_MOCK_PATTERN} level` : "";
  return {
    heading: `${name} mock papers`,
    items: Array.from({ length: MOCKS_PER_SUBJECT }, (_, i) => ({
      label: `Mock paper ${i + 1}`,
      detail: `${name} full board pattern${pattern}, 80 marks, with a worked-solution key`,
      withKey: true,
    })),
  };
}

/** The manifest of a pack. `target` is a chapter slug (chapter) or "maths" | "science" (mock, subject); ignored for the bundle. */
export function packManifest(sku: PackSku, target?: string): PackManifest {
  switch (sku) {
    case "pack_chapter": {
      const slug = target && PACK_CHAPTER_SLUGS.includes(target) ? target : "";
      return {
        title: slug ? `Chapter Pack · ${packChapterLabel(slug)}` : "Chapter Pack",
        groups: slug ? [chapterGroup(slug)] : [{ heading: "Your chapter", items: CHAPTER_ITEMS.map((i) => ({ ...i })) }],
        chapterPacks: 1,
        mockPapers: 0,
        papers: CHAPTER_PAPERS,
      };
    }
    case "pack_mock": {
      const subject: PackSubject = target === "science" ? "science" : "maths";
      return { title: `Mock Pack · ${subjectLabel(subject)}`, groups: [mockGroup(subject)], chapterPacks: 0, mockPapers: MOCKS_PER_SUBJECT, papers: MOCKS_PER_SUBJECT };
    }
    case "pack_subject": {
      const subject: PackSubject = target === "science" ? "science" : "maths";
      const chapters = chaptersOfSubject(subject);
      return {
        title: `Subject Pack · ${subjectLabel(subject)}`,
        groups: [...chapters.map(chapterGroup), mockGroup(subject)],
        chapterPacks: chapters.length,
        mockPapers: MOCKS_PER_SUBJECT,
        papers: chapters.length * CHAPTER_PAPERS + MOCKS_PER_SUBJECT,
      };
    }
    case "pack_cbq": {
      const subject: PackSubject = target === "science" ? "science" : "maths";
      const chapters = chaptersOfSubject(subject);
      return {
        title: `${subjectLabel(subject)} CBQ Pack`,
        groups: [
          { heading: "Start here", items: [{ label: "How examiners mark a CBQ", detail: "Step marks, half marks, error carried forward and units: one page", withKey: false }] },
          ...chapters.map(cbqChapterGroup),
        ],
        chapterPacks: chapters.length,
        mockPapers: 0,
        papers: 0,
      };
    }
    case "pack_bundle": {
      const groups: PackManifestGroup[] = [];
      for (const s of PACK_SUBJECTS) groups.push(...chaptersOfSubject(s).map(chapterGroup), mockGroup(s));
      return {
        title: BUNDLE_NAME,
        groups,
        chapterPacks: PACK_CHAPTER_SLUGS.length,
        mockPapers: MOCKS_PER_SUBJECT * PACK_SUBJECTS.length,
        papers: PACK_CHAPTER_SLUGS.length * CHAPTER_PAPERS + MOCKS_PER_SUBJECT * PACK_SUBJECTS.length,
      };
    }
  }
}

/**
 * What a Subject Pack saves against buying its chapter packs and its mock pack singly:
 * (chapter packs in the subject x chapter price + mock price) - subject price. Maths has 13 chapter packs (Trigonometry
 * is one pack covering Ch 8 + 9), so it is 13 x 49 + 99 - 199 = 537, the same as Science.
 */
export function subjectSaving(subject: PackSubject): number {
  return chaptersOfSubject(subject).length * PACK_PRICE_INR.pack_chapter + PACK_PRICE_INR.pack_mock - PACK_PRICE_INR.pack_subject;
}

/** The Bundle against two Subject Packs. */
export function bundleSavingBase(): number {
  return PACK_PRICE_INR.pack_subject * PACK_SUBJECTS.length;
}

export interface PackSummaryRow {
  label: string;
  value: string;
}

const rupees = (n: number): string => `\u20b9${n}`;

/**
 * The short "What you get" rows of the pop-up: a label and a value, in the order the owner approved. `questions` is the exact
 * question count when the bank has been read (lazy), otherwise null and the row shows the sections instead of a made-up number.
 */
export function packSummaryRows(sku: PackSku, target?: string, questions: number | null = null): PackSummaryRow[] {
  const subject: PackSubject = target === "science" ? "science" : "maths";
  const nf = (n: number): string => n.toLocaleString("en-IN");
  switch (sku) {
    case "pack_chapter":
      return [
        { label: "Question sheets, Sections A to E", value: questions !== null ? `${nf(questions)} questions` : "A\u2013E" },
        { label: "Answer keys with worked solutions", value: "A\u2013E" },
        { label: "Chapter tests + keys", value: "2" },
        { label: "Worksheet + key", value: "1" },
      ];
    case "pack_mock":
      return [
        { label: "Full board-pattern papers", value: String(MOCKS_PER_SUBJECT) },
        { label: "Answer keys with worked solutions", value: String(MOCKS_PER_SUBJECT) },
        { label: "Marks per paper", value: "80" },
        ...(subject === "maths" ? [{ label: "Maths level", value: MATHS_MOCK_PATTERN }] : []),
      ];
    case "pack_subject": {
      const ncert = subject === "maths" ? MATHS_NCERT_CHAPTERS : SCIENCE_NCERT_CHAPTERS;
      return [
        { label: `Chapter packs (${ncert} NCERT chapters)`, value: String(chaptersOfSubject(subject).length) },
        ...(questions !== null ? [{ label: "Questions", value: nf(questions) }] : []),
        { label: "Mock papers + keys", value: String(MOCKS_PER_SUBJECT) },
        { label: "You save", value: rupees(subjectSaving(subject)) },
      ];
    }
    case "pack_cbq":
      return [
        { label: "Competency questions", value: questions !== null ? nf(questions) : "Every chapter" },
        { label: "Chapters", value: String(chaptersOfSubject(subject).length) },
        { label: "Formats", value: "MCQ \u00b7 Assertion-Reason \u00b7 Case study \u00b7 Long answer" },
        { label: "Worked step-wise solutions", value: "Every question" },
      ];
    case "pack_bundle":
      return [
        { label: "Chapter packs, both subjects", value: String(PACK_CHAPTER_SLUGS.length) },
        { label: "NCERT chapters covered", value: String(ALL_NCERT_CHAPTERS) },
        ...(questions !== null ? [{ label: "Questions", value: nf(questions) }] : []),
        { label: "Mock papers + keys", value: String(MOCKS_PER_SUBJECT * PACK_SUBJECTS.length) },
        { label: `Instead of 2 \u00d7 ${rupees(PACK_PRICE_INR.pack_subject)}`, value: rupees(bundleSavingBase()) },
      ];
  }
}
