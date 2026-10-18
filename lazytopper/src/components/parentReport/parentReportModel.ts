import {
  boardChapterKey,
  buildMistakeView,
  modelNamesWeakness,
  subjectRungOf,
  type ReadSubject,
  type StudyReadModel,
} from "../../services/progressReadModel";
import { splitPaperMarks } from "../../services/meSplit";
import { mistakeLossByType, type TypeMarks } from "../../services/meHomeSummary";
import {
  MISTAKE_GROUPS,
  MISTAKE_TYPE_LABEL,
  NOT_ATTEMPTED,
  STORED_MISTAKE_TYPES,
  UNTYPED_MARKS_LABEL,
  coachingLine,
  zeroMarksLost,
  type MistakeGroupKey,
  type StoredMistakeType,
} from "../../lib/mistakeDisplay";
import { desktopTopicForWeakAreaKey } from "../../lib/desktop/topics";
import { istCalendarDate } from "../../services/progressStore";

/**
 * PARENT-REPORT-1 — the ONE place a parent report card's numbers are decided, and the privacy
 * boundary between a student's data and the PNG they post to WhatsApp.
 *
 * Every figure comes from ONE shared read (`readStudyModel`, window `istWeek` = the last seven
 * IST calendar days, today included) through the rules Me/Progress and the Mistake Intelligence
 * widget already use — nothing here is a new marks rule:
 *   - answers marked  = `progress.totals.answers` (the ungated window total: honest at any n);
 *   - tests taken     = `activity.tests.total` (graded worksheets, chapter tests, full mocks);
 *   - marks lost by type = Me's hero split (`splitPaperMarks`) per paper, the four stored types
 *     by `mistakeLossByType` (whose group sums ARE that split), plus Me's own not-attempted and
 *     "reason not recorded" remainder — so the rows always sum to the marks lost;
 *   - chapters        = the window's live mistakes per board chapter (`mistakes.byChapter`'s
 *     rule, per paper), by the marks each entry recorded;
 *   - won back        = `mistakes.wonBack` (ONLY a later correct attempt — owner ruling 2026-10-06);
 *   - next steps      = `coachingLine`, the product's own coaching sentences, one per group.
 *
 * HONESTY GATES (never lowered):
 *   - fewer than MIN_ANSWERS_FOR_REPORT answers marked → the "empty" card (no figure at all);
 *   - a mistake TYPE, a chapter or a next step is a named weakness: shown ONLY when Me would name
 *     one (`modelNamesWeakness` — every paper with answers passes Me's gate), the mistake history
 *     read completed, and Me's split is known for every such paper. Otherwise the card is the
 *     "activity" card: what the student did, and nothing about why marks were lost.
 *
 * PRIVACY: the model carries an optional FIRST NAME (only when the student ticks the box) and
 * aggregate numbers. No email, uid, answer, question, working or code can reach the image or the
 * share text, because none is copied here. Pure: no I/O, no clock (the read model supplies the range).
 */

/** Below this many answers marked in the week, the card shows the honest empty state. */
export const MIN_ANSWERS_FOR_REPORT = 3;
/** At most this many chapters and next steps on the card. */
export const MAX_CHAPTERS = 3;
export const MAX_NEXT_STEPS = 3;

/**
 * Where the card's link goes: a page a parent can open WITHOUT signing in, that carries none of
 * the child's data. The pricing page until Builder F's "pay for my child" link exists — replace
 * THIS constant then. `utm_source=parent_share` is the tag the admin Students list already reads
 * as "Parent share" (StudentsAdminPage), so sign-ups and payments attribute to it.
 */
export const PARENT_REPORT_LINK =
  "https://www.lazytopper.com/pricing?utm_source=parent_share&utm_medium=whatsapp&utm_campaign=parent_report";
/** The link as printed on the image (the tappable link rides in the share text). */
export const PARENT_REPORT_LINK_LABEL = "lazytopper.com/pricing";

export type ParentReportState = "empty" | "activity" | "pattern";

export type ParentReportRowKey = StoredMistakeType | typeof NOT_ATTEMPTED.key | "untyped";

export interface ParentReportTypeRow {
  key: ParentReportRowKey;
  /** The repo's own English label (lib/mistakeDisplay). */
  label: string;
  /** The Hindi line under it. */
  hindi: string;
  marks: number;
}

export interface ParentReportChapter {
  key: string;
  label: string;
  marks: number;
}

export interface ParentReport {
  state: ParentReportState;
  /** Only when the student chose to show it; otherwise null. */
  firstName: string | null;
  /** "12 – 18 Oct 2026" — the seven IST calendar days the figures cover. */
  weekLabel: string;
  answersMarked: number;
  testsTaken: number;
  /** "pattern" only: the marks lost on the papers whose split is shown. Null otherwise. */
  marksLost: number | null;
  /** "pattern" only, most marks first; sums to `marksLost`. */
  typeRows: ParentReportTypeRow[];
  /** "pattern" only, most marks first. */
  chapters: ParentReportChapter[];
  /** Mistakes won back by a later correct attempt this week; null when none, or the history read
   *  was incomplete. `marks` is shown on the "pattern" card only. */
  wonBack: { count: number; marks: number | null } | null;
  /** "pattern" only: the product's own coaching sentences (`coachingLine`). */
  nextSteps: string[];
  /** "activity" only: why the pattern is withheld (null on the other states). */
  activityReason: ActivityReason | null;
}

/** few-answers = below Me's gate; not-ready = history incomplete or Me's split unknown. */
export type ActivityReason = "few-answers" | "not-ready";

/** Hindi lines for the four stored types and the two remainders (display copy only). */
export const HINDI_ROW: Readonly<Record<ParentReportRowKey, string>> = {
  conceptual: "कॉन्सेप्ट समझने में कमी",
  calculation: "गणना में गलती",
  silly: "लापरवाही की गलती",
  presentation: "लिखने का तरीका (स्टेप, यूनिट)",
  [NOT_ATTEMPTED.key]: "सवाल छोड़ दिया",
  untyped: "कारण दर्ज नहीं",
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** The student's first name as typed in their account, letters only, or null. Never the email. */
export function firstNameOf(displayName: string | null | undefined): string | null {
  const first = String(displayName ?? "").trim().split(/\s+/)[0] ?? "";
  // An email, a phone number or a handle is not a first name: show nothing rather than leak it.
  if (/[@\d_.]/.test(first)) return null;
  const clean = first.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 20);
  return /\p{L}/u.test(clean) ? clean : null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 – 18 Oct 2026", "28 Sep – 4 Oct 2026", "29 Dec 2026 – 4 Jan 2027" — IST calendar dates. */
export function istWeekLabel(range: { start: number; end: number }): string {
  const a = istCalendarDate(range.start);
  const b = istCalendarDate(range.end);
  if (a.year !== b.year) return `${a.day} ${MONTHS[a.month]} ${a.year} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
  return `${a.day} – ${b.day} ${MONTHS[b.month]} ${b.year}`;
}

function chapterLabel(key: string): string {
  const meta = desktopTopicForWeakAreaKey(key);
  if (meta?.name) return meta.name;
  return key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

interface PatternParts {
  marksLost: number;
  typeRows: ParentReportTypeRow[];
  chapters: ParentReportChapter[];
  groupMarks: Record<MistakeGroupKey, number>;
  typeMarks: TypeMarks;
  /** The chapter with the most CONCEPT-GAP marks (the knowledge next step names it), or null. */
  conceptChapter: string | null;
}

const PAPERS: readonly ReadSubject[] = ["maths", "science"];

/** Me's split per paper with answers, summed; null when any such paper's split is unknown. */
function patternParts(model: StudyReadModel): PatternParts | null {
  const papers = PAPERS.filter((s) => (Number(model.progress.subjectTotals?.[s]?.answers) || 0) > 0);
  if (papers.length === 0) return null;
  const typeMarks: TypeMarks = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  let notAttempted = 0;
  let untyped = 0;
  const groupMarks: Record<MistakeGroupKey, number> = { knowledge: 0, technique: 0, careless: 0 };
  const chapterMarks = new Map<string, number>();
  const chapterConceptual = new Map<string, number>();
  for (const paper of papers) {
    const view = buildMistakeView(
      model.mistakes.entries,
      { start: model.range.start, end: model.range.end, subject: paper },
      model.mistakes.complete,
    );
    const split = splitPaperMarks(subjectRungOf(model.progress, paper), view.entries);
    if (!split || !split.splitKnown) return null;
    notAttempted += split.notAttempted;
    untyped += split.unclassified;
    groupMarks.knowledge += split.knowledge;
    groupMarks.technique += split.technique;
    groupMarks.careless += split.careless;
    const byType = mistakeLossByType(view.entries);
    for (const t of STORED_MISTAKE_TYPES) typeMarks[t] += byType[t];
    for (const [key, entries] of Object.entries(view.byChapter)) {
      const k = boardChapterKey(key) || key;
      const m = entries.reduce((s, e) => s + Math.max(0, Number(e.marksLost) || 0), 0);
      chapterMarks.set(k, (chapterMarks.get(k) ?? 0) + m);
      chapterConceptual.set(k, (chapterConceptual.get(k) ?? 0) + mistakeLossByType(entries).conceptual);
    }
  }
  const rows: ParentReportTypeRow[] = [];
  for (const t of STORED_MISTAKE_TYPES) {
    const marks = round1(typeMarks[t]);
    typeMarks[t] = marks;
    if (marks > 0) rows.push({ key: t, label: MISTAKE_TYPE_LABEL[t], hindi: HINDI_ROW[t], marks });
  }
  const na = round1(notAttempted);
  if (na > 0) rows.push({ key: NOT_ATTEMPTED.key, label: NOT_ATTEMPTED.label, hindi: HINDI_ROW[NOT_ATTEMPTED.key], marks: na });
  const ut = round1(untyped);
  if (ut > 0) rows.push({ key: "untyped", label: UNTYPED_MARKS_LABEL, hindi: HINDI_ROW.untyped, marks: ut });
  // Most marks first; the fixed order above breaks a tie (Array.prototype.sort is stable).
  rows.sort((a, b) => b.marks - a.marks);

  const chapters = Array.from(chapterMarks.entries())
    .map(([key, m]) => ({ key, label: chapterLabel(key), marks: round1(m) }))
    .filter((c) => c.marks > 0)
    .sort((a, b) => b.marks - a.marks || a.key.localeCompare(b.key))
    .slice(0, MAX_CHAPTERS);

  return {
    // Built from the ROUNDED rows, so the card's total and its rows always add up exactly.
    marksLost: round1(rows.reduce((s, x) => s + x.marks, 0)),
    typeRows: rows,
    chapters,
    groupMarks: {
      knowledge: round1(groupMarks.knowledge),
      technique: round1(groupMarks.technique),
      careless: round1(groupMarks.careless),
    },
    typeMarks,
    conceptChapter: (() => {
      const best = Array.from(chapterConceptual.entries())
        .filter(([, m]) => m > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return best ? chapterLabel(best[0]) : null;
    })(),
  };
}

/**
 * The product's own coaching sentence for each group that lost marks (`coachingLine`, fed ONE
 * group's stored-type marks at a time), most marks first, owner group order breaking a tie.
 */
export function nextStepsOf(
  groupMarks: Record<MistakeGroupKey, number>,
  typeMarks: TypeMarks,
  practiseWhat: string | undefined,
): string[] {
  return MISTAKE_GROUPS.map((g, i) => ({ g, i }))
    .filter(({ g }) => (groupMarks[g.key] ?? 0) > 0)
    .sort((a, b) => groupMarks[b.g.key] - groupMarks[a.g.key] || a.i - b.i)
    .slice(0, MAX_NEXT_STEPS)
    .map(({ g }) => {
      const marks = zeroMarksLost();
      for (const t of g.types) marks[t] = typeMarks[t];
      return coachingLine({ marksAwarded: 0, marksTotal: 0, counts: null, marks, practiseWhat });
    })
    .filter((line) => line.length > 0);
}

/** Build the card from ONE `istWeek` read. Pure. */
export function buildParentReport(model: StudyReadModel, opts: { firstName?: string | null } = {}): ParentReport {
  const firstName = opts.firstName ? firstNameOf(opts.firstName) : null;
  const weekLabel = istWeekLabel(model.range);
  const answersMarked = Math.max(0, Number(model.progress.totals?.answers) || 0);
  const testsTaken = Math.max(0, Number(model.activity?.tests?.total) || 0);
  const base: ParentReport = {
    state: "empty",
    firstName,
    weekLabel,
    answersMarked,
    testsTaken,
    marksLost: null,
    typeRows: [],
    chapters: [],
    wonBack: null,
    nextSteps: [],
    activityReason: null,
  };
  if (answersMarked < MIN_ANSWERS_FOR_REPORT) return base;

  const complete = model.mistakes.complete === true;
  const won = model.mistakes.wonBack;
  const wonCount = complete ? Math.max(0, Number(won?.count) || 0) : 0;

  // WHY a pattern is withheld, so the card says only what is true: "few-answers" ONLY when Me's
  // gate is the reason (too few graded answers per paper); "not-ready" when the history read
  // failed / was cut short, or the log and the graded stream do not reconcile (Me's split unknown).
  let parts: PatternParts | null = null;
  let reason: ActivityReason = "not-ready";
  try {
    if (complete && !modelNamesWeakness(model)) reason = "few-answers";
    else if (complete) parts = patternParts(model);
  } catch {
    parts = null;
    reason = "not-ready";
  }
  if (!parts) {
    return {
      ...base,
      state: "activity",
      activityReason: reason,
      wonBack: wonCount > 0 ? { count: wonCount, marks: null } : null,
    };
  }
  // The knowledge step's practise <chapter> names the chapter whose CONCEPT-GAP marks are highest,
  // never merely the chapter that lost the most marks overall (that may be all careless slips).
  const practiseWhat = parts.conceptChapter ?? undefined;
  return {
    ...base,
    state: "pattern",
    marksLost: parts.marksLost,
    typeRows: parts.typeRows,
    chapters: parts.chapters,
    wonBack: wonCount > 0 ? { count: wonCount, marks: round1(Math.max(0, Number(won?.marks) || 0)) } : null,
    nextSteps: nextStepsOf(parts.groupMarks, parts.typeMarks, practiseWhat),
  };
}

/** The card's heading, English and Hindi. */
export function reportTitle(firstName: string | null): { en: string; hi: string } {
  return firstName
    ? { en: `Where ${firstName} is losing marks`, hi: `${firstName} के अंक कहाँ कट रहे हैं` }
    : { en: "Where I am losing marks", hi: "मेरे अंक कहाँ कट रहे हैं" };
}

/** The message that rides with the image (and is the whole wa.me message on desktop). No figure,
 *  no answer, no id: the first name only when chosen. */
export function parentReportShareText(report: Pick<ParentReport, "firstName" | "weekLabel" | "state">): string {
  const who = report.firstName ? `${report.firstName}'s` : "My";
  // State-specific: the text never claims what the card does not show.
  const what =
    report.state === "pattern"
      ? "where marks are being lost"
      : report.state === "activity"
        ? "answers checked and tests taken"
        : "not enough checked answers yet";
  return `${who} weekly LazyTopper report — ${what} (${report.weekLabel}). ${PARENT_REPORT_LINK}`;
}
