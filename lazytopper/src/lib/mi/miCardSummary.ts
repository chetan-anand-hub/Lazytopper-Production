/**
 * MI-CONSISTENCY-1 — THE ONE selector behind every Mistake Intelligence card (Home, phone Home and
 * the desktop sidebar). PURE over the existing read model: it reads `readStudyModel`'s unscoped
 * month read through Me's own functions (`buildMistakeView`, `splitPaperMarks`,
 * `mistakeLossByType`, `meChapterPractisePath`) and changes none of them, so for one scope and one
 * window every card prints the SAME figures, and they are Me's figures.
 *
 * LAZY: this module pulls the read model in, so the cards load it on demand (./useMiCard) and
 * their own chunks never carry it — the same discipline as services/useMeHomeSummary.
 *
 * THE ROWS, and why each label is TRUE for what it counts (per paper, then summed in tenths so the
 * tiles add up EXACTLY to the headline):
 *   - the four stored types (Concept gap / Calculation slip / Silly slip / Presentation): Me's
 *     per-type marks (`mistakeLossByType`). A wrong MCQ WITH working that the grader typed counts
 *     here, under its type (owner rule, 23 Oct) — never as a wrong tap;
 *   - "Wrong MCQ taps": a wrong objective pick recorded with NO working (a Quick Practice tap, a
 *     Chapter Test / Full Mock Section-A pick) — the subject rung's `marksWrongObjective`
 *     (MI-MODE-MARKS-1), counted per pick and only when no TYPED mistake entry holds the same
 *     question id (`progress.wrongObjectiveEvidence`), then CLAMPED to Me's remainder;
 *   - "Left blank": Me's "Not attempted" (never a mistake);
 *   - "No reason recorded": the TRUE remainder — lost marks with no type, no tap and no blank.
 * When Me withholds a paper's split (the log names more than the graded stream lost), that paper's
 * whole loss is the remainder, exactly as Me shows it — never clamped into shape.
 *
 * A paper below Me's naming gate (`splitPaperMarks` → null) is NOT added: the card says it is not
 * counted yet ("We will not name a weakness from one or two questions"), as Me does.
 */
import { buildMistakeView, subjectRungOf, type ReadSubject, type StudyReadModel } from "../../services/progressReadModel";
import { splitPaperMarks } from "../../services/meSplit";
import { meChapterPractisePath, mistakeLossByType } from "../../services/meHomeSummary";
import { loadWrongAnswerLog } from "../../services/adaptivePracticeEngine";
import { desktopTopicForWeakAreaKey } from "../desktop/topics";
import {
  buildDesktopWorksheetPath,
  withQuery,
  type DesktopRouteContext,
  type DesktopSubject,
} from "../desktop/navigation";
import { MISTAKE_TYPE_LABEL, STORED_MISTAKE_TYPES, mistakeGroupOf, type MistakeGroupKey, type StoredMistakeType } from "../mistakeDisplay";
import { MI_SCOPES, marksText, type MiScope } from "./miScope";

export type MiRowKey = StoredMistakeType | "wrongTap" | "blank" | "unrecorded";

export interface MiCardRow {
  key: MiRowKey;
  label: string;
  marks: number;
}

/** The labels of the three rows that are not mistake types. */
export const MI_ROW_LABEL = {
  wrongTap: "Wrong MCQ taps",
  blank: "Left blank",
  unrecorded: "No reason recorded",
} as const;

/** The nudge under "Wrong MCQ taps" (owner wording). */
export const MI_WRONG_TAP_NUDGE = "Add working to one and we'll tell you why";

/** Me's own tip for exam technique (MeProgressPage's legend) — presentation has no drill. */
export const MI_PRESENTATION_TIP = "Formula, units and conclusion — write them every time.";

export type MiAction =
  /** Concept gap → the chapter's targeted practice (Me's Start-here href, `meChapterPractisePath`). */
  | { kind: "practise"; href: string; chapter: string }
  /** Careless → Me's "Take these marks back" sheet: a slip-fixing worksheet or a quick practice. */
  | { kind: "slips"; paper: DesktopSubject; worksheetHref: string; practiceHref: string }
  /** Presentation → Me's tip; no drill is invented. */
  | { kind: "tip"; text: string };

export interface MiChance {
  type: StoredMistakeType;
  group: MistakeGroupKey;
  label: string;
  marks: number;
  /** "12.5 marks" — exactly as the card prints it (Ziggy quotes this string). */
  amount: string;
  action: MiAction;
}

export interface MiCardSummary {
  scope: MiScope;
  /** empty: no graded answer in scope · thin: answers, but every paper is below Me's gate · ready. */
  state: "empty" | "thin" | "ready";
  /** The headline: Me's "marks on the table" over the counted papers. */
  lost: number;
  /** Seven rows, fixed order; they add up EXACTLY to `lost`. */
  rows: MiCardRow[];
  /** Marks carried by the four stored types. */
  typed: number;
  /** The type that cost the most marks, with its action; null when no type lost a mark. */
  chance: MiChance | null;
  /** Papers with graded answers in the window that Me does not name yet (below its gate). */
  withheld: DesktopSubject[];
  /** True when Me withholds a counted paper's split (the log names more than the graded stream
   *  lost): that paper's loss is all "no reason recorded", and the card says why, as Me does. */
  splitWithheld: boolean;
  /** Concept gaps still open (the wrong-answer log: all time, concept only — NOT the 30-day window). */
  conceptGaps: number;
}

const PAPER_OF: Record<ReadSubject, DesktopSubject> = { maths: "Maths", science: "Science" };
const papersOf = (scope: MiScope): ReadSubject[] => (scope === "both" ? ["maths", "science"] : [scope]);
const tenths = (n: number): number => Math.round((Number(n) || 0) * 10);

/** The open concept gaps on the wrong-answer log, in scope. Every entry is a concept gap (the MI
 *  front door bridges conceptual mistakes only); a chapter the registry cannot place counts only
 *  under Both — never guessed into a paper. */
export function conceptGapsIn(scope: MiScope, entries = Object.values(loadWrongAnswerLog().entries)): number {
  let n = 0;
  for (const e of entries) {
    const count = Math.max(0, Math.floor(Number(e?.count) || 0));
    if (!count) continue;
    if (scope !== "both") {
      const subject = desktopTopicForWeakAreaKey(String(e.topicKey ?? ""))?.subject;
      if (subject !== PAPER_OF[scope]) continue;
    }
    n += count;
  }
  return n;
}

/** The card for ONE scope, from the unscoped month read. Pure (the gap count reads the device's
 *  synced wrong-answer log unless `gaps` is passed). */
export function selectMiCard(
  model: Pick<StudyReadModel, "progress" | "mistakes" | "range">,
  scope: MiScope,
  ctx: DesktopRouteContext,
  gaps?: number,
): MiCardSummary {
  const typeT: Record<StoredMistakeType, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  let lostT = 0;
  let tapT = 0;
  let blankT = 0;
  let restT = 0;
  const withheld: DesktopSubject[] = [];
  const counted: ReadSubject[] = [];
  let anyAnswers = false;
  let splitWithheld = false;
  const byPaperEntries: Partial<Record<ReadSubject, ReturnType<typeof buildMistakeView>>> = {};
  let typedQidSet: Set<string> | null = null;
  const typedQids = (): Set<string> => (typedQidSet ??= typedQuestionIds(model.mistakes.entries));

  for (const p of papersOf(scope)) {
    const answers = Number(model.progress.subjectTotals?.[p]?.answers) || 0;
    if (answers > 0) anyAnswers = true;
    const rung = subjectRungOf(model.progress, p);
    const view = buildMistakeView(model.mistakes.entries, { start: model.range.start, end: model.range.end, subject: p }, model.mistakes.complete);
    const split = splitPaperMarks(rung, view.entries);
    if (!split) {
      if (answers > 0) withheld.push(PAPER_OF[p]);
      continue;
    }
    counted.push(p);
    byPaperEntries[p] = view;
    const lost = tenths(split.lost);
    lostT += lost;
    if (!split.splitKnown) {
      restT += lost; // Me withholds the why: the whole loss is the remainder, as Me shows it.
      splitWithheld = true;
      continue;
    }
    const byType = mistakeLossByType(view.entries);
    const typed: Record<StoredMistakeType, number> = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    let typedSum = 0;
    for (const t of STORED_MISTAKE_TYPES) {
      typed[t] = tenths(byType[t]);
      typedSum += typed[t];
    }
    const blank = tenths(split.notAttempted);
    const unclassified = tenths(split.unclassified);
    const tap = Math.min(tapTenths(model, p, rung?.marksWrongObjective, typedQids()), unclassified);
    const rest = lost - typedSum - blank - tap;
    if (rest < 0) {
      restT += lost; // per-type rounding would overshoot the paper: refuse to split, never clamp.
      splitWithheld = true;
      continue;
    }
    for (const t of STORED_MISTAKE_TYPES) typeT[t] += typed[t];
    blankT += blank;
    tapT += tap;
    restT += rest;
  }

  const rows: MiCardRow[] = [
    ...STORED_MISTAKE_TYPES.map((t) => ({ key: t as MiRowKey, label: MISTAKE_TYPE_LABEL[t], marks: typeT[t] / 10 })),
    { key: "wrongTap", label: MI_ROW_LABEL.wrongTap, marks: tapT / 10 },
    { key: "blank", label: MI_ROW_LABEL.blank, marks: blankT / 10 },
    { key: "unrecorded", label: MI_ROW_LABEL.unrecorded, marks: restT / 10 },
  ];
  const typedTotal = STORED_MISTAKE_TYPES.reduce((s, t) => s + typeT[t], 0) / 10;

  let chance: MiChance | null = null;
  let best: StoredMistakeType | null = null;
  for (const t of STORED_MISTAKE_TYPES) if (typeT[t] > 0 && (best === null || typeT[t] > typeT[best])) best = t;
  if (best) {
    const marks = typeT[best] / 10;
    chance = {
      type: best,
      group: mistakeGroupOf(best)?.key ?? "knowledge",
      label: MISTAKE_TYPE_LABEL[best],
      marks,
      amount: marksText(marks),
      action: actionFor(best, counted, byPaperEntries, ctx),
    };
  }

  const state: MiCardSummary["state"] = !anyAnswers ? "empty" : counted.length === 0 ? "thin" : "ready";
  return {
    scope,
    state,
    lost: lostT / 10,
    rows,
    typed: typedTotal,
    chance,
    withheld,
    splitWithheld,
    conceptGaps: typeof gaps === "number" ? gaps : conceptGapsIn(scope),
  };
}

/** Question ids that carry a TYPED mistake entry in the window (any of the four types > 0). */
function typedQuestionIds(entries: Parameters<typeof mistakeLossByType>[0]): Set<string> {
  const out = new Set<string>();
  for (const e of entries) {
    const qid = String((e as { questionId?: unknown })?.questionId ?? "").trim();
    if (!qid) continue;
    const t = mistakeLossByType([e]);
    if (STORED_MISTAKE_TYPES.some((k) => t[k] > 0)) out.add(qid);
  }
  return out;
}

/** "Wrong MCQ taps" for one paper, in tenths, BEFORE the clamp: each wrong objective pick counts
 *  only when no typed mistake entry holds the same question (a question re-tapped after a checked
 *  answer keeps its typed entry; its pick is not a tap). Without the per-pick evidence (an older
 *  read), the rung's aggregate is the figure, as before; the caller clamps either way. */
function tapTenths(
  model: Pick<StudyReadModel, "progress">,
  paper: ReadSubject,
  aggregate: number | undefined,
  typed: Set<string>,
): number {
  const picks = model.progress.wrongObjectiveEvidence?.[paper];
  if (!picks) return tenths(aggregate ?? 0);
  let sum = 0;
  for (const pick of picks) if (!(pick.qid && typed.has(pick.qid))) sum += Number(pick.marks) || 0;
  return tenths(sum);
}

/** Every scope at once (the switch flips between them without a re-read). */
export function selectMiCards(
  model: Pick<StudyReadModel, "progress" | "mistakes" | "range">,
  ctx: DesktopRouteContext,
): Record<MiScope, MiCardSummary> {
  const out = {} as Record<MiScope, MiCardSummary>;
  for (const s of MI_SCOPES) out[s] = selectMiCard(model, s, ctx);
  return out;
}

function actionFor(
  type: StoredMistakeType,
  counted: ReadSubject[],
  views: Partial<Record<ReadSubject, ReturnType<typeof buildMistakeView>>>,
  ctx: DesktopRouteContext,
): MiAction {
  if (type === "presentation") return { kind: "tip", text: MI_PRESENTATION_TIP };
  if (type === "conceptual") {
    // The chapter with the most concept-gap marks (chapter key breaks a tie), Me's practise href.
    let bestKey: string | null = null;
    let bestMarks = 0;
    for (const p of counted) {
      const chapters = Object.entries(views[p]?.byChapter ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [key, entries] of chapters) {
        const m = mistakeLossByType(entries).conceptual;
        if (m > bestMarks) {
          bestKey = key;
          bestMarks = m;
        }
      }
    }
    const meta = bestKey ? desktopTopicForWeakAreaKey(bestKey) : undefined;
    if (meta) {
      return { kind: "practise", chapter: meta.name, href: meChapterPractisePath({ slug: meta.slug, subject: meta.subject, label: meta.name }, ctx) };
    }
    const params = new URLSearchParams();
    if (ctx.source) params.set("source", ctx.source);
    if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
    return { kind: "practise", chapter: "", href: withQuery("/me", params) };
  }
  // Careless (calculation / silly): Me's "Take these marks back" sheet, on the counted paper with
  // the most careless marks (Maths breaks a tie, as Me's paper choice does).
  let paper: DesktopSubject = PAPER_OF[counted[0] ?? "maths"];
  let most = -1;
  for (const p of counted) {
    const t = mistakeLossByType(views[p]?.entries ?? []);
    const careless = STORED_MISTAKE_TYPES.filter((k) => mistakeGroupOf(k)?.key === "careless").reduce((s, k) => s + t[k], 0);
    if (careless > most) {
      most = careless;
      paper = PAPER_OF[p];
    }
  }
  const params = new URLSearchParams();
  if (ctx.source) params.set("source", ctx.source);
  if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
  return {
    kind: "slips",
    paper,
    worksheetHref: buildDesktopWorksheetPath({ scope: "full-subject", subject: paper, mistakeAware: true, ...ctx }),
    practiceHref: withQuery(`/practice/10/${paper}`, params),
  };
}
