/**
 * cbse2027Sources — the committed data behind `/cbse-2027` (CBSE-PAGE-1, Lane A).
 *
 * ★ EVERY URL IN THIS FILE WAS HEADed LIVE ON 18 SEPTEMBER 2026 and returned 200
 * with a PDF or ZIP content-type. That is the lane's shipping rule: a link that
 * does not resolve does not ship. CBSE links four `*VIC*` sample-paper variants
 * from its own 2025-26 Class X index that are dead today (404, 624-byte HTML
 * body) — they are deliberately absent, and the page's guard test pins the fact
 * so a future edit cannot quietly reintroduce them.
 *
 * ★ WHY THE DATA LIVES IN ITS OWN MODULE. Lane B replaces the circular feed with
 * a generated file. Keeping the rows here, behind a named type, makes that swap a
 * DATA change — replace `CBSE_CIRCULARS`, touch nothing else. If the rows were
 * inline in the page's JSX, Lane B would be a rewrite of a 400-line component.
 *
 * ⚠ THERE IS NO AUTOMATION BEHIND THIS FILE YET, AND THE PAGE MUST NOT SAY THERE
 * IS. The prototype carried "updated daily" and "rebuilt from CBSE's own
 * circulars pages every day". Both describe Lane B, which does not exist — no
 * watcher, no credential, no generated file. Owner ruling, 2026-09-18: cut the
 * automation claim entirely and state only the date the list was last checked.
 * Lane B earns that copy back when it ships.
 */

/** What a source link actually serves, so the page can label it honestly. */
export type CbseSourceKind = "pdf" | "zip";

export type CbsePaper = {
  /** Row heading — what the document is, in the student's words. */
  readonly title: string;
  /** One line on why it is worth opening. */
  readonly blurb: string;
  readonly href: string;
  readonly kind: CbseSourceKind;
};

export type CbseSubjectKey = "science" | "maths";

export type CbseSubject = {
  readonly key: CbseSubjectKey;
  readonly label: string;
  readonly papers: readonly CbsePaper[];
  /**
   * Unit-wise marks, VERIFIED against the official CBSE 2026-27 syllabus PDFs
   * (`.../CurriculumMain27/SecPart1/...`), not from memory and not from the
   * prototype — CLAUDE.md §5. Both files' course-structure tables were extracted
   * and read on 2026-09-18. CBSE publishes marks by UNIT and nothing below that.
   */
  readonly units: readonly CbseUnitMark[];
};

export type CbseUnitMark = {
  readonly unit: string;
  readonly marks: number;
  /** Bar colour token suffix — the page maps this to a CSS class, never an inline colour. */
  readonly tone: "c1" | "c2" | "c3" | "c4" | "am" | "mute";
};

/**
 * The two subjects, their papers and their unit marks.
 *
 * Every `papers` href below is a real CBSE URL. The Firebase mirror (Lane B)
 * will put a Storage URL in front of these with the CBSE URL as the fallback;
 * until it exists, these ARE the links, and they open on CBSE's own site.
 */
export const CBSE_SUBJECTS: readonly CbseSubject[] = [
  {
    key: "science",
    label: "Science",
    papers: [
      {
        title: "Sample paper",
        blurb: "The closest thing to your real February paper",
        href: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-SQP.pdf",
        kind: "pdf",
      },
      {
        title: "Marking scheme",
        blurb: "Mark by mark — where each one is awarded",
        href: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-MS.pdf",
        kind: "pdf",
      },
      {
        title: "Competency questions, with answers",
        blurb: "Case-based practice for half your paper",
        href: "https://cbseacademic.nic.in/web_material/Manuals/CFPQ_Science10.pdf",
        kind: "pdf",
      },
      {
        title: "Competency test items",
        blurb: "Questions without answers — use as a mock",
        href: "https://cbseacademic.nic.in/cbe/documents/SAS_Science-Class-10.pdf",
        kind: "pdf",
      },
      {
        title: "Question bank",
        blurb: "CBSE's standing bank for Class 10 Science",
        href: "https://cbseacademic.nic.in/web_material/QuestionBank/ClassX/ScienceX.pdf",
        kind: "pdf",
      },
      {
        title: "Toppers' answer sheets, 2025",
        blurb: "Real evaluated scripts with examiner ticks",
        href: "https://www.cbse.gov.in/cbsenew/model-answer/2025/X/Science.zip",
        kind: "zip",
      },
      {
        title: "Syllabus 2026-27",
        blurb: "What your paper is set from",
        href: "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf",
        kind: "pdf",
      },
    ],
    // Official 2026-27: I 25, II 25, III 12, IV 13, V 05 → 80.
    units: [
      { unit: "Chemical Substances", marks: 25, tone: "c1" },
      { unit: "World of Living", marks: 25, tone: "c2" },
      { unit: "Effects of Current", marks: 13, tone: "c3" },
      { unit: "Natural Phenomena", marks: 12, tone: "c4" },
      { unit: "Natural Resources", marks: 5, tone: "mute" },
    ],
  },
  {
    key: "maths",
    label: "Maths",
    papers: [
      {
        title: "Sample paper — Standard",
        blurb: "The closest thing to your real February paper",
        href: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsStandard-SQP.pdf",
        kind: "pdf",
      },
      {
        title: "Sample paper — Basic",
        blurb: "If you're taking Maths Basic",
        href: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsBasic-SQP.pdf",
        kind: "pdf",
      },
      {
        title: "Marking scheme",
        blurb: "Mark by mark — where each one is awarded",
        href: "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/MathsStandard-MS.pdf",
        kind: "pdf",
      },
      {
        title: "Competency test items",
        blurb: "Application questions, exam-style",
        href: "https://cbseacademic.nic.in/cbe/documents/SAS_Maths-Class-10.pdf",
        kind: "pdf",
      },
      {
        title: "Item bank",
        blurb: "With mark schemes for every question",
        href: "https://cbseacademic.nic.in/cbe/documents/Item-Bank--Maths---Class-10.pdf",
        kind: "pdf",
      },
      {
        title: "Question bank",
        blurb: "CBSE's standing bank for Class 10 Maths",
        href: "https://cbseacademic.nic.in/web_material/QuestionBank/ClassX/MathsX.pdf",
        kind: "pdf",
      },
      {
        title: "Toppers' answer sheets, 2025",
        blurb: "See what full marks actually looks like",
        href: "https://www.cbse.gov.in/cbsenew/model-answer/2025/X/Math_Stand.zip",
        kind: "zip",
      },
      {
        title: "Syllabus 2026-27",
        blurb: "Unit-wise marks are on page 1",
        href: "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf",
        kind: "pdf",
      },
    ],
    // Official 2026-27: I 06, II 20, III 06, IV 15, V 12, VI 10, VII 11 → 80.
    units: [
      { unit: "Algebra", marks: 20, tone: "c3" },
      { unit: "Geometry", marks: 15, tone: "c1" },
      { unit: "Trigonometry", marks: 12, tone: "c2" },
      { unit: "Statistics & Probability", marks: 11, tone: "c4" },
      { unit: "Mensuration", marks: 10, tone: "am" },
      { unit: "Number Systems", marks: 6, tone: "mute" },
      { unit: "Coordinate Geometry", marks: 6, tone: "mute" },
    ],
  },
];

/** The marks every subject's units must add up to, before the 20 internal marks. */
export const CBSE_THEORY_MARKS = 80;

export type CbseTimelineStop = {
  readonly when: string;
  readonly title: string;
  readonly chip?: { readonly label: string; readonly tone: "must" | "optional" };
  readonly body: string;
  /** A dated exam sitting rather than a result — drawn as a filled node. */
  readonly isExam: boolean;
};

export const CBSE_TIMELINE: readonly CbseTimelineStop[] = [
  {
    when: "February 2027",
    title: "Main exam",
    chip: { label: "Everyone", tone: "must" },
    body: "Full syllabus. Your 20 internal marks are already locked in by now.",
    isExam: true,
  },
  {
    when: "April 2027",
    title: "First result",
    body: "No certificate yet. Marks go to DigiLocker and Class 11 admissions can use them provisionally.",
    isExam: false,
  },
  {
    when: "May 2027",
    title: "Improvement exam",
    chip: { label: "Optional", tone: "optional" },
    body: "Up to three subjects. Only the higher score is kept, so there is nothing to lose.",
    isExam: true,
  },
  {
    when: "June 2027",
    title: "Final result",
    body: "Both attempts shown, better mark counted, certificates issued.",
    isExam: false,
  },
];

/**
 * A circular row.
 *
 * `source` is the honest distinction ruling 2 asked for: `"document"` rows open a
 * PDF, `"index"` rows open CBSE's circulars listing because that circular has no
 * direct PDF. The page renders the difference so nobody clicks expecting a paper.
 *
 * ★ `important` AND `headline` ARE PROVISIONED SHAPE, DEPLOYED NOWHERE.
 * Owner addendum, 2026-09-18: a later lane adds a dismissible strip on Home that
 * reads the newest `important` row. Declaring the fields now makes that lane a
 * component addition rather than a migration of a generated file — Lane B will be
 * emitting this array by then, and changing its shape afterwards means changing
 * the generator, the file and the consumer together.
 *
 * ⚠ NOTHING IN THIS LANE READS EITHER FIELD. Every row ships `important: false`,
 * the page's copy does not mention them, and the guard test pins both facts —
 * so a provisioned field cannot quietly become a live one without a test going red.
 *
 * `headline` is a student-facing phrasing, deliberately NOT CBSE's official title:
 * "CBSE has released the 2027 date sheet", never "Date Sheet for Secondary School
 * Examination 2027". The strip shows the headline; the row keeps `title` for the
 * link itself.
 */
export type CbseCircular = {
  readonly date: string;
  readonly title: string;
  readonly href: string;
  readonly source: "document" | "index";
  /** Hand-set. A row a student needs to know about today, not eventually. */
  readonly important: boolean;
  /** Short student-facing phrasing, distinct from `title`. */
  readonly headline: string;
};

/**
 * ⚠ COMMITTED DATA, HAND-CHECKED. Not generated, not watched, not refreshed.
 * Lane B replaces this array wholesale. Until then the page states only the date
 * below — never a frequency.
 */
export const CBSE_CIRCULARS_CHECKED_ON = "18 September 2026";

export const CBSE_CIRCULARS: readonly CbseCircular[] = [
  {
    date: "10 Sep",
    title: "List of Candidates for 2026-27 — prior intimation to schools",
    href: "https://www.cbse.gov.in/cbsenew/examination_Circular.html",
    source: "index",
    important: false,
    headline: "Your school is confirming who sits the 2027 boards",
  },
  {
    date: "1 Apr",
    title: "Curriculum released for 2026-27, Classes IX-XII",
    href: "https://www.cbse.gov.in/cbsenew/documents/14_Circular_01042026.pdf",
    source: "document",
    important: false,
    headline: "The 2026-27 syllabus is out — this is what your paper is set from",
  },
  {
    date: "14 Feb",
    title: "Two board exams — who can sit the second one",
    href: "https://www.cbse.gov.in/cbsenew/documents/Notification_Two_Board_Examinations_Class_X_14022026.pdf",
    source: "document",
    important: false,
    headline: "CBSE confirmed two exams a year, and who can take the second",
  },
  {
    date: "6 Jan",
    title: "Free tele-counselling opens for students and parents",
    href: "https://www.cbse.gov.in/cbsenew/documents/Press_Release_Psycho_Social_Counseling_06012026.pdf",
    source: "document",
    important: false,
    headline: "CBSE's free exam counselling helpline is open",
  },
  {
    date: "5 Aug 25",
    title: "Attendance rules to be strictly enforced",
    href: "https://www.cbse.gov.in/cbsenew/documents/Strict_Compliance_attendance_Eligibility_05082025.pdf",
    source: "document",
    important: false,
    headline: "75% attendance is being enforced strictly this year",
  },
];

export type CbseTrap = {
  readonly question: string;
  /** Paragraphs of the answer. Rendered inside <details>, so present in the DOM when closed. */
  readonly answer: readonly string[];
  /** An optional emphasised callout below the answer. */
  readonly warning?: string;
};

/**
 * ★ THE SIX MUST RENDER INSIDE `<details>`, NOT A CONDITIONAL.
 * `<details>` keeps its content in the DOM when closed, which is the whole SEO
 * point of this page — a crawler with no JavaScript still reads every answer. A
 * card that unmounts its answer when collapsed would look identical to a user and
 * be invisible to Google. The guard test asserts the closed text is present.
 */
export const CBSE_TRAPS: readonly CbseTrap[] = [
  {
    question: "Can I skip February and just sit May?",
    answer: ["No, and this is the expensive one. February is compulsory for everyone."],
    warning:
      "Miss three or more subjects in February and CBSE marks you Essential Repeat. You lose May entirely and wait until February 2028.",
  },
  {
    question: "If I score lower in May, do I lose my February marks?",
    answer: [
      "No. CBSE keeps the higher of the two in each subject, automatically. You don't apply and you can't go backwards.",
    ],
  },
  {
    question: "When is my internal assessment?",
    answer: [
      "Once, before February — and it is not repeated in May. Those 20 marks per subject come from periodic tests, your portfolio and subject enrichment work through the year.",
      "Coast through them and you've capped your final score before the board exam starts.",
    ],
  },
  {
    question: "I failed a subject. What happens?",
    answer: [
      "You sit May in the compartment category. There's no separate July supplementary any more — May replaced it.",
      "One or two subjects keeps you eligible. Three or more and the Essential Repeat rule above applies instead.",
    ],
  },
  {
    question: "Does 75% attendance really matter?",
    answer: [
      "Yes — it's a hard eligibility rule, and CBSE reminded schools to enforce it in August 2025.",
      "Up to 25% can be relaxed for documented medical grounds, sport or genuine hardship, but that's decided by your school in advance, not fixed in January.",
    ],
  },
  {
    question: "Has CBSE released chapter-wise important questions?",
    answer: [
      "No. CBSE publishes marks by unit, in the syllabus, and nothing below that.",
      "Any “chapter-wise important questions, released by CBSE” you see online is someone's estimate from past papers with CBSE's name attached to it.",
    ],
  },
];

/**
 * The assumed date of the main exam, used only for the countdown.
 *
 * ⚠ THIS IS AN ASSUMPTION AND THE PAGE SAYS SO. CBSE has not published the
 * 2027 date sheet — the "Date sheet not out" pill on this very page is the same
 * fact. Mid-February matches the last sitting. The visible copy carries the
 * hedge, so the number is never presented as a published date.
 *
 * `src/config/cbseDates.ts` is the app's date home but holds the 2026 cycle and
 * is outside this lane's scope, so the assumption stays local to this page.
 */
export const CBSE_2027_ASSUMED_MAIN_EXAM = new Date(2027, 1, 17);

/** Whole days from `from` until the assumed main exam; null once it is in the past. */
export function daysUntilMainExam(from: Date): number | null {
  const ms = CBSE_2027_ASSUMED_MAIN_EXAM.getTime() - from.getTime();
  const days = Math.ceil(ms / 86_400_000);
  return days > 0 ? days : null;
}
