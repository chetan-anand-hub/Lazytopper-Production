// src/components/results/scorecardVariants.ts
//
// Progress-Journey ARC · PR-2 — the four-surface variant SYSTEM for the Universal
// <ResultsScorecard>. ONE typed per-surface config covering all four surfaces' four
// flex-points (§2 of the locked scorecard spec):
//
//   1. score model   — worksheet: marks awarded/total · quick practice: "X of N attempted"
//   2. framing line   — the one honest sentence under the hero
//   3. actions        — worksheet: Read + Download graded sheet · QP: personalized what-next
//   4. graded-sheet?  — worksheet: yes · quick practice: no
//
// LIVE (fully populated here): all FIVE surfaces — worksheet + quick-practice (PR-2),
// chapter-test + full-mock (their surfaces shipped: CT #374/#380, FM #387), and
// check-improve (C&I PR-1 — the 5th surface; builders at the end of this file). The original
// chapter-test / full-mock `deferred: true` STUBS are retained below as the PR-2
// config seams + the render-guard's fixtures — still never handed to a live host.
//
// HONESTY (verbatim from the shipped worksheet scorecard — no fabricated numbers):
// pending is sacred (never a deflated 0); the four-type block renders ONLY when typed
// mistakes exist; a 0-attempted quick-practice session shows an honest empty state, never
// an invented insight. This module is PURE (no React, no I/O) so the flex-points are unit-
// testable; <ResultsScorecard> is the shell that renders a variant.

import type { WorksheetGradeResponse } from "../../ai/aiClient";
import type {
  SessionFourType,
  SessionRecord,
  SessionTopicSource,
} from "../../services/sessionRecords";
import { sectionFromTotalMarks } from "../worksheet/worksheetMiSelector";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { resolveTopicDisplayName } from "../../utils/topicResolver";

export type ScorecardSurface =
  | "worksheet"
  | "quick-practice"
  | "chapter-test"
  | "full-mock"
  | "check-improve";

/**
 * Flex-point 1 — the score hero model. `marks` renders the big awarded/total hero
 * (worksheet / tests); `attempts` renders "X of N attempted" (quick practice — NOT a
 * marks/total, D-PROG-2). The shell derives the hero + descriptor line from this.
 */
export type ScorecardScore =
  | {
      kind: "marks";
      awarded: number;
      total: number;
      /** The "across G of T questions graded" descriptor. Both present on the LIVE
       *  worksheet variant; OMITTED on a stored re-open when the graded count can't be
       *  honestly reconstructed (a partial/older record) — the shell then shows the
       *  score without a fabricated count. */
      gradedCount?: number;
      totalQuestions?: number;
    }
  | {
      kind: "attempts";
      attempted: number;
      ofN: number;
      /** Pure-MCQ accuracy line (0 when no MCQs were checked). */
      mcqAnswered: number;
      mcqCorrect: number;
    };

/** Flex-point 3 — one footer / what-next action. */
export interface ScorecardAction {
  label: string;
  tone: "primary" | "secondary" | "ghost";
  onClick: () => void;
  disabled?: boolean;
  /** When true the shell shows `busyLabel` and disables the button (e.g. a PDF export). */
  busy?: boolean;
  busyLabel?: string;
  /** A tiny leading tag for the stacked what-next menu (e.g. "New", "Test"). */
  tag?: string;
}

/** Worksheet pending strip — honest, never folded into a 0. */
export interface ScorecardPending {
  count: number;
  worksheetTotalMarks: number;
}

/** All-pending honest message (worksheet, gradedCount === 0). */
export interface ScorecardAllPending {
  title: string;
  detail: string;
}

/** The MI four-type breakdown, from per-question mistakeSummary. Rendered ONLY when
 *  present and non-null (worksheet always when graded; quick practice only if
 *  checked-answers produced typed mistakes — today QP produces none, so it is null). */
export type ScorecardFourType = SessionFourType;

/** One row of the chapter-test BY-SECTION lens (spec §5) — awarded/total per CBSE
 *  board section. DERIVED at render (decision D3), never persisted. */
export interface ScorecardSectionLensRow {
  section: string;
  label: string;
  awarded: number;
  total: number;
}

/** One row of the chapter-test BY-CONCEPT lens ([FU-CT-CONCEPT-LENS]) — the
 *  single-chapter analog of Full Mock's chapter lens: awarded/total per SUBTOPIC
 *  (the concept level), so a student sees which concept within this chapter cost
 *  marks. DERIVED at render (never persisted; sectionBreakdown stays null), from
 *  the graded per-question marks joined to the canonical bank's `subtopic`. */
export interface ScorecardConceptLensRow {
  /** The subtopic string — the concept, and the row's stable React key. */
  key: string;
  label: string;
  awarded: number;
  total: number;
  /** Marks lost on this concept (total − awarded, clamped ≥ 0) — drives the sort. */
  lost: number;
}

/* ── BATCH-2 · THE QUICK PRACTICE GRADED ANSWER SHEET ────────────────────────────
 *
 * Quick Practice is moving to BATCH grading: nothing grades per question, ONE call at
 * Finish, and the student then sees a scorecard across the SET plus per-answer
 * board-style depth — the same depth Check & Improve gives today.
 *
 * ★ THESE SHAPES ARE DATA ONLY AND EVERY FIELD ON `ScorecardVariant` IS OPTIONAL, so a
 * variant that omits them renders byte-identically to today. Nothing here is wired: the
 * trigger flip, the batched call and the MI feed are WIRE-2's, and until WIRE-2 lands
 * NOTHING IN THE PRODUCT BUILDS ONE OF THESE. This is a dormant surface on purpose.
 *
 * ★★ HONEST-OR-SILENT IS STRUCTURAL HERE, NOT A CONVENTION. `awarded` / `available` are
 * INDEPENDENTLY nullable and the shell renders the fraction ONLY when both are real
 * numbers. There is no placeholder, no "—" standing in for a figure the grader did not
 * return, and no way to express "we got nothing back" as a 0 (CLAUDE.md §5).
 */

/** The four Mistake-Intelligence kinds.
 *
 *  ★★ `silly` and `presentation` are CARELESS MARK-LOSS ONLY — a slip on the final line,
 *  a missing unit, a step used but never stated. They may absolutely appear against an
 *  answer; they must NEVER be presented as "you are weak at this topic". That distinction
 *  is the product's moat, and it is why this is a typed field rather than free text: the
 *  shell decides its framing from the KIND, not from the label a grader happened to emit. */
export type ScorecardMistakeKind = "conceptual" | "calculation" | "silly" | "presentation";

/** True for the two kinds that are carelessness rather than a knowledge gap. */
export function isCarelessMistakeKind(kind: ScorecardMistakeKind | null | undefined): boolean {
  return kind === "silly" || kind === "presentation";
}

/** One line of the set scorecard's MCQ/written split. `tone` is presentational only —
 *  the shell picks a colour from it and invents no number of its own. */
export interface ScorecardSplitRow {
  /** Stable React key + the small leading chip ("Q5"). */
  tag: string;
  /** The whole line, pre-composed by the caller ("Chose (b) · answer is (d) · 0 / 1").
   *  Composed upstream so this module never has to guess at a mark it was not given. */
  detail: string;
  tone: "good" | "miss" | "pending" | "diagnose";
}

/** The MCQ/written split. ★ The two headings are the prototype's, verbatim: MCQs are
 *  scored locally and cost nothing, written working is what the batch call reads. */
export interface ScorecardSplit {
  /** Scored locally, free — never sent to the grader. */
  markedNow: ScorecardSplitRow[];
  /** Written working that went into the batch call. */
  readyToGrade: ScorecardSplitRow[];
  /** Honest note for questions with nothing saved. Null when every question was
   *  answered — never a fabricated "0 unanswered" line. */
  nothingSavedNote?: string | null;
}

/** One answer on the graded sheet — marks awarded over available, what the working
 *  shows, where the mark went, and the mistake type. */
export interface ScorecardGradedAnswer {
  /** "Question 5" — also the row's stable key. */
  label: string;
  /** "MCQ · 1 mark" / "3 marks". Omitted → the head line is the label alone. */
  descriptor?: string | null;
  /** ★ BOTH must be numbers for the shell to render a fraction. Either one absent ⇒ no
   *  mark is shown AT ALL. This is the only honest representation of "not graded". */
  awarded?: number | null;
  available?: number | null;
  /** ★★ TRUE FOR AN OBJECTIVE QUESTION (MCQ / Assertion-Reason / Section A). CBSE does
   *  not step-mark a 1-marker: the mark is WHOLE OR NOTHING whatever the working shows,
   *  and the upload serves DIAGNOSIS ONLY. The builder enforces this — an objective
   *  answer whose awarded mark is neither 0 nor the full available mark is a fractional
   *  mark on a question that cannot have one, and it is rejected rather than rendered. */
  objective?: boolean;
  /** The one-line ruling under the head ("Whole mark or nothing — MCQs are never
   *  step-marked."). Honest-or-silent: omitted when the grader said nothing. */
  verdict?: string | null;
  /** "What your working shows:" / "Where the mark went:" — the lead-in, then the detail. */
  lostLabel?: string | null;
  lostDetail?: string | null;
  /** The chip ("Silly slip", "Calculation"). Rendered only when supplied. */
  mistakeType?: string | null;
  /** ★ The KIND behind the chip — drives the careless-vs-knowledge-gap framing. */
  mistakeKind?: ScorecardMistakeKind | null;
  /** ★ THE HONEST UNGRADED STATE. A question the batch could not grade says so, in the
   *  student's words, and carries NO mark. Today's live reason is `typed-no-channel`:
   *  `WorksheetGradeQuestionInput` has no `textAnswer` field, so a typed answer has no
   *  channel to the batch grader at all ([FU-BATCH-TYPED-ANSWER-NO-CHANNEL]). `reason`
   *  is a free string on purpose — a closed set here would forbid the next reason. */
  ungraded?: { reason: string; title: string; detail: string } | null;
}

/**
 * The per-surface config the shell renders. Populated by the builders below. A
 * `deferred` variant is a legacy config-seam stub only — chapter-test / full-mock
 * have LIVE builders in this file — and is never handed to a live host.
 */
export interface ScorecardVariant {
  surface: ScorecardSurface;
  deferred?: boolean;
  /** Head title (worksheet: the worksheet name; QP: "Session scorecard"). */
  title: string;
  /** Head subtitle under the title (worksheet: "WS-… · graded just now"). */
  subtitle: string;
  score: ScorecardScore;
  /** Flex-point 2 — the one honest framing/empty line under the hero. */
  message?: string | null;
  /** A secondary honest note (QP: the MCQ nudge). */
  note?: string | null;
  fourType?: ScorecardFourType | null;
  /** Chapter-test BY-SECTION lens (A–D), rendered by the shell above the four-type
   *  block. Derived at render (D3); other surfaces leave it null. */
  sectionLens?: ScorecardSectionLensRow[] | null;
  /** Chapter-test BY-CONCEPT lens ([FU-CT-CONCEPT-LENS]), rendered by the shell
   *  BETWEEN the section lens and the four-type (the Full-Mock arrangement:
   *  section → concept → four-type). Derived at render; other surfaces leave it null. */
  conceptLens?: ScorecardConceptLensRow[] | null;
  /** Full-mock BY-CHAPTER lens (spec §5 — "the point of a mock"): per-chapter
   *  score bars, rendered by the shell between the section lens and the
   *  four-type. DERIVED at render (sectionBreakdown stays null — owner decision
   *  2026-07-12); other surfaces leave it null. Reuses the concept-row shape. */
  chapterLens?: ScorecardConceptLensRow[] | null;
  /** The one sentence under the chapter lens — "«X» cost you N marks — the
   *  biggest loss on this paper." Honest-or-silent: null when nothing was lost. */
  chapterLensNote?: string | null;
  pending?: ScorecardPending | null;
  allPending?: ScorecardAllPending | null;
  /** BATCH-2 · the set scorecard's MCQ/written split. Absent everywhere else. */
  split?: ScorecardSplit | null;
  /** BATCH-2 · the graded answer sheet — per-answer board-style depth, rendered
   *  under the summary. Absent everywhere else. */
  gradedAnswers?: ScorecardGradedAnswer[] | null;
  /** Optional footer heading for the stacked what-next menu (QP: "What next?"). */
  actionsHeading?: string;
  /** Render actions as a stacked what-next menu (QP) rather than the worksheet 2-up row. */
  stackActions?: boolean;
  /** A closing note under the actions (QP: what is / isn't saved). */
  footnote?: string;
  actions: ScorecardAction[];
}

// ── Shared: four-type aggregation (identical to the shipped worksheet math) ───────

/** Aggregate the four-type breakdown over LEGIBLE questions (couldNotRead skipped,
 *  never fabricated into a mistake). Same reduction as buildWorksheetSessionRecord. */
export function aggregateFourType(response: WorksheetGradeResponse): ScorecardFourType {
  const acc: ScorecardFourType = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const r of response.results) {
    if (r.couldNotRead || !r.mistakeSummary) continue;
    acc.conceptual += Number(r.mistakeSummary.conceptual) || 0;
    acc.calculation += Number(r.mistakeSummary.calculation) || 0;
    acc.silly += Number(r.mistakeSummary.silly) || 0;
    acc.presentation += Number(r.mistakeSummary.presentation) || 0;
  }
  return acc;
}

// ── LIVE variant: WORKSHEET (behaviour-identical to the shipped WorksheetScorecard) ──

export interface WorksheetVariantInput {
  /** The worksheet nomenclature name (§A7). */
  name: string;
  /** The durable WS-{S}-{TOPIC}-{NN} code. */
  code: string;
  response: WorksheetGradeResponse;
  downloading: boolean;
  /** Read the graded sheet in-page (closes the scorecard). */
  onRead: () => void;
  /** Download the graded-sheet PDF. */
  onDownload: () => void;
}

/**
 * Build the worksheet variant — the NON-REGRESSION gate: same four-type, pending strip,
 * WS- code, "Read your graded worksheet" + "Download graded sheet" actions, all-pending
 * handling. The strings are copied VERBATIM from the shipped WorksheetScorecard so the
 * rendered card is behaviour- and pixel-identical.
 */
export function worksheetScorecardVariant(input: WorksheetVariantInput): ScorecardVariant {
  const { name, code, response, downloading, onRead, onDownload } = input;
  const allPending = response.gradedCount === 0;
  return {
    surface: "worksheet",
    title: name,
    subtitle: `${code} · graded just now`,
    score: {
      kind: "marks",
      awarded: response.gradedMarksAwarded,
      total: response.gradedMarksTotal,
      gradedCount: response.gradedCount,
      totalQuestions: response.totalQuestions,
    },
    // The four-type block always shows when graded (even all-zero → a clean sheet);
    // hidden only in the all-pending case, exactly as the shipped card does.
    fourType: allPending ? null : aggregateFourType(response),
    pending:
      !allPending && response.pendingCount > 0
        ? { count: response.pendingCount, worksheetTotalMarks: response.worksheetTotalMarks }
        : null,
    allPending: allPending
      ? {
          title: "We couldn’t read any answers",
          detail:
            "None of the pages could be read clearly — re-upload clearer photos and we’ll grade them. Nothing has been scored 0.",
        }
      : null,
    actions: [
      { label: "Read your graded worksheet", tone: "ghost", onClick: onRead, disabled: allPending },
      {
        label: "Download graded sheet",
        tone: "primary",
        onClick: onDownload,
        disabled: allPending || downloading,
        busy: downloading,
        busyLabel: "Preparing PDF…",
      },
    ],
  };
}

// ── LIVE variant: QUICK PRACTICE (§2.1) ───────────────────────────────────────────

export interface QuickPracticeVariantInput {
  attempted: number;
  totalInSet: number;
  /** MCQs whose answer was checked in-session (0 for a set with no MCQ interactions). */
  mcqAnswered: number;
  mcqCorrect: number;
  /** Every question in the set attempted (the auto-offer, vs an explicit Finish tap). */
  allDone: boolean;
  /** Optional four-type — passed ONLY if checked-answers produced typed mistakes
   *  (D-PROG-2). Today Quick Practice's "check" flow is the tutor drawer and produces
   *  none, so hosts pass undefined and no MI block renders (honest). */
  fourType?: ScorecardFourType | null;
  /** What-next action closures the host wires (navigation / regenerate). */
  onKeepPracticing?: () => void;
  onFreshSet: () => void;
  onChapterTest: () => void;
  onPredicted: () => void;
  onStudy: () => void;
  /** Tutor⇄QP overlay host: when true, the three app-navigation what-next items (Chapter Test
   *  / Predicted / Study) are omitted — inside the tutor panel they would leave the thread.
   *  Only the in-panel-safe items (Keep practicing / Fresh set) remain. Default false ⇒ the
   *  full menu, byte-identical for every existing (hub / direct) caller. */
  overlayMode?: boolean;
  /** The way home, rendered as the menu's "Back"-tagged secondary row — the SAME machinery the
   *  C&I variant uses (`returnTicketAction`). Present ONLY when Quick Practice is hosted in the
   *  tutor overlay, where it reads "Back to your tutor" and closes the panel, so the student
   *  never has to infer that the bare ✕ is the return. Omitted (a direct / hub visit) ⇒ the
   *  what-next menu is byte-identical to today. */
  returnTicket?: { label: string; onReturn: () => void };
}

type MenuId = "keep" | "fresh" | "chapter" | "predicted" | "study";

/**
 * Build the quick-practice variant: "X of N attempted" (never marks/total), an honest
 * MCQ-accuracy line, a 0-attempted empty state, NO graded-sheet download, and a what-next
 * menu. The menu is the FLOOR (Keep practicing / Fresh set / Chapter Test / Predicted /
 * Study); ONE item is elevated to the personalized primary, derived from the REAL session
 * signal (MCQ accuracy + attempted), never a generic upsell. No-signal (0 attempted) →
 * the fixed fallback menu with the floor default primary.
 */
export function quickPracticeScorecardVariant(input: QuickPracticeVariantInput): ScorecardVariant {
  const {
    attempted,
    totalInSet,
    mcqAnswered,
    mcqCorrect,
    allDone,
    fourType,
    onKeepPracticing,
    onFreshSet,
    onChapterTest,
    onPredicted,
    onStudy,
    overlayMode = false,
    returnTicket,
  } = input;

  const mcqMissed = Math.max(0, mcqAnswered - mcqCorrect);
  const accuracy = mcqAnswered > 0 ? mcqCorrect / mcqAnswered : null;

  // ── flex-point 2: the honest framing / empty line ──
  const message =
    attempted === 0
      ? "You finished without attempting any questions yet — nothing is counted against you. Jump back in whenever you're ready."
      : !allDone
        ? `Here's how those ${attempted} went. The ${totalInSet - attempted} you didn't reach aren't counted — finish whenever you like.`
        : null;

  // One honest, locally-derived MI nudge — no fabricated insight.
  const note =
    mcqMissed > 0
      ? `You missed ${mcqMissed} MCQ${mcqMissed === 1 ? "" : "s"} — open "Check my answer" on those to log your working.`
      : mcqAnswered > 0
        ? `All ${mcqAnswered} MCQ${mcqAnswered === 1 ? "" : "s"} correct this session.`
        : null;

  // ── flex-point 3: the fixed floor menu, with ONE item elevated to primary ──
  const floorLabels: Record<MenuId, string> = {
    keep: "Keep practicing this set",
    fresh: "Build a fresh set",
    chapter: "Chapter Test",
    predicted: "Predicted Questions",
    study: "Study this chapter",
  };
  const floorTags: Record<MenuId, string> = {
    keep: "Back",
    fresh: "New",
    chapter: "Test",
    predicted: "HPQ",
    study: "Hub",
  };
  const handlers: Record<MenuId, (() => void) | undefined> = {
    keep: onKeepPracticing,
    fresh: onFreshSet,
    chapter: onChapterTest,
    predicted: onPredicted,
    study: onStudy,
  };

  // The floor order (Keep only when there is a partial set to return to — matches the
  // shipped menu, which omits it on the allDone auto-offer).
  const floor: MenuId[] = [
    ...(!allDone && onKeepPracticing ? (["keep"] as MenuId[]) : []),
    "fresh",
    // Overlay (tutor panel) omits the app-navigation items — they would leave the tutor thread.
    ...(overlayMode ? [] : (["chapter", "predicted", "study"] as MenuId[])),
  ];

  // Personalized primary, from the REAL signal only:
  //   strong (≥3 MCQs, ≥80%)  → elevate the Chapter Test (ready to be tested)
  //   dipping (≥3 MCQs, <50%) → elevate Study this chapter (revise first)
  //   otherwise / no-signal   → the floor default (keep practicing, else fresh set)
  const floorDefault: MenuId = floor.includes("keep") ? "keep" : "fresh";
  let primaryId: MenuId = floorDefault;
  if (!overlayMode && accuracy !== null && mcqAnswered >= 3) {
    if (accuracy >= 0.8) primaryId = "chapter";
    else if (accuracy < 0.5) primaryId = "study";
  }

  const toAction = (id: MenuId, tone: ScorecardAction["tone"]): ScorecardAction => ({
    label: floorLabels[id],
    tag: floorTags[id],
    tone,
    onClick: handlers[id] ?? (() => {}),
    disabled: !handlers[id],
  });

  const actions: ScorecardAction[] = [
    toAction(primaryId, "primary"),
    ...floor.filter((id) => id !== primaryId).map((id) => toAction(id, "secondary")),
    // The way home last, as the "Back"-tagged secondary row — same placement and tone the C&I
    // variant uses, so the session's own next step keeps the primary slot. Overlay-only.
    ...(returnTicket ? [returnTicketAction(returnTicket)] : []),
  ];

  return {
    surface: "quick-practice",
    title: "Session scorecard",
    subtitle: "Quick practice",
    score: { kind: "attempts", attempted, ofN: totalInSet, mcqAnswered, mcqCorrect },
    message,
    note,
    // MI block only when checked-answers produced typed mistakes (else honest silence).
    fourType: fourType && (fourType.conceptual || fourType.calculation || fourType.silly || fourType.presentation) ? fourType : null,
    pending: null,
    allPending: null,
    actionsHeading: "What next?",
    stackActions: true,
    footnote:
      "MCQ results and answers you check are saved to your progress. Self-marked notes stay in this session.",
    actions,
  };
}

// ── BATCH-2 · the Quick Practice GRADED variant (the batch-grading results surface) ──

export interface QuickPracticeGradedVariantInput {
  /** The durable session subtitle the host formats (e.g. "Quick practice · just now"). */
  subtitle?: string;
  /** Marks earned, and marks available across the questions ACTUALLY graded. Both come
   *  straight from the grade response; neither is derived or defaulted here. */
  marksAwarded: number;
  marksTotal: number;
  /** How many of the set's questions came back graded, and how many there were. */
  gradedCount: number;
  totalQuestions: number;
  /** The CBSE section breakdown — the SAME row shape the chapter-test lens uses, so the
   *  shell's existing "By section" block renders it with no new markup. */
  sectionLens?: ScorecardSectionLensRow[] | null;
  /** The MCQ/written split rows. */
  markedNow?: ScorecardSplitRow[];
  readyToGrade?: ScorecardSplitRow[];
  /** Question labels with nothing saved (e.g. ["Q4", "Q9"]). Empty ⇒ no note at all. */
  nothingSaved?: string[];
  /** The graded answer sheet. */
  answers?: ScorecardGradedAnswer[];
  /** Four-type, ONLY when the batch produced typed mistakes — else honest silence. */
  fourType?: ScorecardFourType | null;
  onKeepPracticing?: () => void;
  onFreshSet?: () => void;
  /** The way home from the tutor overlay — the SAME `returnTicketAction` machinery C&I
   *  and the existing Quick Practice variant use. Omitted on a direct visit. */
  returnTicket?: { label: string; onReturn: () => void };
}

/** Thrown when an OBJECTIVE answer carries a mark that a 1-marker cannot have.
 *  ★ This is deliberately loud rather than silently clamped: a fractional mark on an
 *  MCQ means the caller mapped a step-marked response onto an objective question, and
 *  quietly rounding it would ship exactly the partial credit CBSE does not award. */
export class ObjectiveMarkNotBinaryError extends Error {}

/**
 * Build the Quick Practice GRADED variant — the batch-grading results surface: a marks
 * hero across the whole set, the section breakdown, the MCQ/written split, and the
 * per-answer graded sheet.
 *
 * ★★ THE MCQ RULE IS ENFORCED HERE, NOT HOPED FOR. An answer marked `objective` must
 * score 0 or its full available mark — CBSE never step-marks a 1-marker, and any working
 * the student uploaded for one is read ONLY to classify the mistake type. So an objective
 * answer keeps its mistake type AND its binary mark at the same time; that pairing is the
 * whole point, and a fractional objective mark throws rather than renders.
 *
 * ★ Everything else is honest-or-silent: no section lens ⇒ no "By section" heading, no
 * split rows ⇒ no split, no answers ⇒ no sheet, nothing unanswered ⇒ no note.
 */
export function quickPracticeGradedScorecardVariant(
  input: QuickPracticeGradedVariantInput,
): ScorecardVariant {
  const {
    subtitle = "Quick practice",
    marksAwarded,
    marksTotal,
    gradedCount,
    totalQuestions,
    sectionLens,
    markedNow = [],
    readyToGrade = [],
    nothingSaved = [],
    answers = [],
    fourType,
    onKeepPracticing,
    onFreshSet,
    returnTicket,
  } = input;

  for (const a of answers) {
    if (!a.objective) continue;
    if (typeof a.awarded !== "number" || typeof a.available !== "number") continue;
    if (a.awarded !== 0 && a.awarded !== a.available) {
      throw new ObjectiveMarkNotBinaryError(
        `${a.label}: an objective question scored ${a.awarded}/${a.available} — MCQs are whole mark or nothing.`,
      );
    }
  }

  const actions: ScorecardAction[] = [
    // ★ TAG "Set", NOT "Back". A 390px screenshot showed this row and the return ticket
    // BOTH tagged "Back" — two different destinations under one word, at the exact moment
    // a student in the tutor overlay is looking for the way out. `returnTicketAction`
    // owns "Back" (and #614's contract pins that it renders), so this row moves.
    // ⚠ The SAME collision exists today in `quickPracticeScorecardVariant`'s overlay menu
    // (`floorTags.keep === "Back"` plus the appended ticket). Deliberately NOT fixed here:
    // that variant is live and its menu is guaranteed byte-identical for existing callers.
    // [FU-QP-DOUBLE-BACK-TAG]
    ...(onKeepPracticing
      ? [{ label: "Keep practising this set", tag: "Set", tone: "primary", onClick: onKeepPracticing } as ScorecardAction]
      : []),
    ...(onFreshSet
      ? [
          {
            label: "Build a fresh set",
            tag: "New",
            tone: onKeepPracticing ? "secondary" : "primary",
            onClick: onFreshSet,
          } as ScorecardAction,
        ]
      : []),
    // The way home LAST, as the "Back"-tagged secondary row — the same placement and tone
    // C&I and the existing Quick Practice menu use, so the session's own next step keeps
    // the primary slot. Overlay-only; absent on a direct visit.
    ...(returnTicket ? [returnTicketAction(returnTicket)] : []),
  ];

  const hasSplit = markedNow.length > 0 || readyToGrade.length > 0;

  return {
    surface: "quick-practice",
    title: "Session scorecard",
    subtitle,
    score: {
      kind: "marks",
      awarded: marksAwarded,
      total: marksTotal,
      gradedCount,
      totalQuestions,
    },
    // Honest-or-silent throughout: an absent input renders NOTHING, never a placeholder.
    sectionLens: sectionLens && sectionLens.length > 0 ? sectionLens : null,
    split: hasSplit
      ? {
          markedNow,
          readyToGrade,
          nothingSavedNote:
            nothingSaved.length > 0
              ? `${nothingSaved.join(" and ")} ${nothingSaved.length === 1 ? "has" : "have"} nothing saved — nothing has been scored 0.`
              : null,
        }
      : null,
    gradedAnswers: answers.length > 0 ? answers : null,
    fourType:
      fourType && (fourType.conceptual || fourType.calculation || fourType.silly || fourType.presentation)
        ? fourType
        : null,
    pending: null,
    allPending: null,
    actionsHeading: "What next?",
    stackActions: true,
    actions,
  };
}

// ── STORED re-open variant: a read-only worksheet scorecard from a SessionRecord (PR-3) ──

export interface StoredWorksheetVariantInput {
  /** A pre-formatted date label (the host formats `gradedAt`; keeps this builder pure). */
  gradedDateLabel: string;
  /** Close the read-only re-open. */
  onDone: () => void;
  /** Download the graded-sheet PDF. Present ONLY when the graded sheet is locally
   *  resolvable (the original worksheet + its grade response are still cached) — absent
   *  otherwise, so the affordance never promises a sheet it can't produce (honest, §3a). */
  onDownload?: () => void;
  downloading?: boolean;
}

/**
 * Rebuild a STORED `SessionRecord` into a READ-ONLY worksheet scorecard (PR-3 · §3a) —
 * score + four-type + code, ALL from the stored record (invent nothing). It does NOT
 * reconstruct per-question working (that heavier read-back is out of scope); the only
 * graded-sheet access is the optional download, wired by the host when the local caches
 * resolve. A `pending-upload` record (nothing graded yet) shows an honest "awaiting your
 * answer sheet" state, never a fabricated 0. A `partial` record shows its real graded
 * portion WITHOUT a fabricated graded-count.
 */
export function storedWorksheetScorecardVariant(
  record: SessionRecord,
  input: StoredWorksheetVariantInput,
): ScorecardVariant {
  const { gradedDateLabel, onDone, onDownload, downloading = false } = input;
  const totalQuestions = record.questionIds?.length ?? 0;
  const pendingUpload = record.status === "pending-upload";
  const partial = record.status === "partial";

  const doneAction: ScorecardAction = { label: "Done", tone: "ghost", onClick: onDone };

  if (pendingUpload) {
    // Nothing was readable → there is NO graded sheet: honest "couldn't read" copy
    // (mirrors the LIVE all-pending state) and NO download action, only Done. A
    // pending-upload record exists only AFTER a scan that graded zero questions.
    return {
      surface: "worksheet",
      title: record.title,
      subtitle: `${record.id} · ${gradedDateLabel}`,
      score: { kind: "marks", awarded: 0, total: 0 }, // not rendered — allPending below
      fourType: null,
      pending: null,
      allPending: {
        title: "We couldn’t read any answers",
        detail:
          "None of the pages could be read clearly — re-upload clearer photos and we’ll grade them. Nothing has been scored 0.",
      },
      actions: [doneAction],
    };
  }

  // Graded / partial: a real graded sheet may exist → offer Download when the host
  // resolves one (onDownload present), always with Done.
  const actions: ScorecardAction[] = [];
  if (onDownload) {
    actions.push({
      label: "Download graded sheet",
      tone: "primary",
      onClick: onDownload,
      disabled: downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    });
  }
  actions.push(doneAction);

  return {
    surface: "worksheet",
    title: record.title,
    subtitle: `${record.id} · graded ${gradedDateLabel}`,
    score: {
      kind: "marks",
      awarded: record.marksAwarded,
      total: record.marksTotal,
      // Claim a graded-count ONLY when the whole session was read (a full "graded" record) —
      // a partial/older record omits it rather than fabricate one.
      ...(!partial && totalQuestions > 0
        ? { gradedCount: totalQuestions, totalQuestions }
        : {}),
    },
    message: partial ? "Graded portion shown — some pages were pending on this session." : null,
    fourType: record.fourType,
    pending: null,
    allPending: null,
    actions,
  };
}

// ── LEGACY deferred stubs: CHAPTER TEST + FULL MOCK (kept, still never rendered) ────
//
// HISTORICAL (PR-2): these stubs predate the rebuilt surfaces. Both are LIVE now —
// chapter test (#374/#380) and full mock (#387) build real variants via the §5
// builders below — so the stubs' remaining jobs are (a) the render-guard's test
// fixtures and (b) covering the defined-but-unrenderable state in the type. A
// deferred variant must never be handed to a live host; <ResultsScorecard>
// treats a rendered deferred variant as a no-op (returns null) as a guard.

export interface DeferredVariantInput {
  title: string;
  subtitle?: string;
}

/** LEGACY deferred stub — the LIVE chapter-test variant is built below (§5). Do not render. */
export function chapterTestScorecardVariantStub(input: DeferredVariantInput): ScorecardVariant {
  return {
    surface: "chapter-test",
    deferred: true,
    title: input.title,
    subtitle: input.subtitle ?? "Chapter test",
    score: { kind: "marks", awarded: 0, total: 0, gradedCount: 0, totalQuestions: 0 },
    fourType: null,
    pending: null,
    allPending: null,
    actions: [],
  };
}

/** LEGACY deferred stub — the LIVE full-mock variant is built below (§5). Do not render. */
export function fullMockScorecardVariantStub(input: DeferredVariantInput): ScorecardVariant {
  return {
    surface: "full-mock",
    deferred: true,
    title: input.title,
    subtitle: input.subtitle ?? "Full mock",
    score: { kind: "marks", awarded: 0, total: 0, gradedCount: 0, totalQuestions: 0 },
    fourType: null,
    pending: null,
    allPending: null,
    actions: [],
  };
}

// ── LIVE variant: CHAPTER TEST (fills PR-2's deferred seam — spec §5) ──────────────
//
// Two-phase on the SAME Universal shell: PARTIAL (objective only, NO four-type / MI —
// an MCQ is right/wrong, not a WHY) → FULL (total + BY-SECTION A–D lens + four-type
// from the written work) after the answer sheet is uploaded. It is CONFIG on the
// existing shell, not a re-architecture: the only new shell capability is the
// `sectionLens` block.

const CT_SECTION_LABEL: Record<string, string> = {
  A: "A · Objective",
  B: "B · VSA",
  C: "C · SA",
  D: "D · LA / Case",
};

/**
 * Derive the A–D by-section lens from a chapter-test response's per-question marks —
 * decision D3: NOT persisted (a chapter-test SessionRecord's sectionBreakdown stays
 * null), DERIVED at render via the SHIPPED #353 CBSE mark-band proxy
 * (`sectionFromTotalMarks`: 1→A · 2→B · 3→C · 5→D · 4→E case). The CT board shape is
 * A–D, so the case band (E) folds into D. Only GRADED (legible) questions contribute;
 * a mark value that maps to no canonical band is an HONEST UNKNOWN — it still counts
 * in the total score but sits in NO section bucket (never a fabricated section).
 * Returns null when nothing is attributable (e.g. an all-pending partial).
 */
export function deriveChapterTestSectionLens(
  response: WorksheetGradeResponse,
): ScorecardSectionLensRow[] | null {
  const buckets = new Map<string, { awarded: number; total: number }>();
  for (const r of response.results) {
    if (r.couldNotRead) continue;
    const band = sectionFromTotalMarks(r.totalMarks);
    if (!band) continue; // honest unknown — never a fabricated section
    const sec = band === "E" ? "D" : band; // CT groups the case band under D
    const b = buckets.get(sec) ?? { awarded: 0, total: 0 };
    b.awarded += Number(r.marksAwarded) || 0;
    b.total += Number(r.totalMarks) || 0;
    buckets.set(sec, b);
  }
  const rows = ["A", "B", "C", "D"]
    .filter((s) => buckets.has(s))
    .map((s) => ({
      section: s,
      label: CT_SECTION_LABEL[s] ?? s,
      awarded: buckets.get(s)!.awarded,
      total: buckets.get(s)!.total,
    }));
  return rows.length > 0 ? rows : null;
}

// ── BY-CONCEPT lens ([FU-CT-CONCEPT-LENS]) ─────────────────────────────────────
//
// The single-chapter analog of Full Mock's chapter lens: "which concept WITHIN this
// chapter cost you marks." The grade response is keyed by qNumber and carries no
// subtopic, so we recover the concept by joining each graded question's canonical
// `id` (carried on the drawn paper question) → the canonical bank's `subtopic`
// (CanonicalQuestion carries it; subtopic IS the concept level). DERIVED at render —
// nothing persisted, `sectionBreakdown` stays null.

/** A graded question's identity for the concept join: its qNumber (to match a grade
 *  result) + its canonical questionId (to look up the subtopic). Satisfied structurally
 *  by a PersistedWorksheetQuestion (paper.questions) or a `{qNumber, id}` from a stored
 *  record's qNumber-ordered questionIds. */
export interface ConceptLensQuestion {
  qNumber: number;
  id: string;
}

/** Lazily-built canonical questionId → subtopic index (built once on first use; the
 *  bank is a static in-memory array, so this stays pure/synchronous). */
let _subtopicByQuestionId: Map<string, string> | null = null;
function subtopicForQuestionId(id: string): string | null {
  if (!_subtopicByQuestionId) {
    const map = new Map<string, string>();
    for (const q of canonicalQuestionBank) {
      if (q.id && typeof q.subtopic === "string" && q.subtopic.trim()) {
        map.set(q.id, q.subtopic.trim());
      }
    }
    _subtopicByQuestionId = map;
  }
  return _subtopicByQuestionId.get(id) ?? null;
}

/**
 * Derive the BY-CONCEPT (subtopic) lens from a chapter-test response + the test's
 * questions. Only GRADED (legible) questions contribute; each is joined qNumber →
 * questionId → canonical `subtopic`, and awarded/total are aggregated per subtopic.
 *
 * ANTI-FABRICATION: a question whose subtopic can't be resolved (no matching id / a
 * blank bank subtopic) is an HONEST UNKNOWN — it still counts in the total score (the
 * hero) but sits in NO concept row, never a fabricated concept. When NO question
 * resolves to any subtopic the lens is null (honest absence) and the shell omits it.
 *
 * Rows cover ALL resolved concepts (owner decision — mirror the by-section lens),
 * sorted by marks LOST descending so the concept that cost the most reads first.
 */
export function deriveChapterTestConceptLens(
  response: WorksheetGradeResponse,
  questions: ConceptLensQuestion[],
): ScorecardConceptLensRow[] | null {
  const idByQNumber = new Map<number, string>();
  for (const q of questions) idByQNumber.set(q.qNumber, q.id);

  const buckets = new Map<string, { awarded: number; total: number }>();
  for (const r of response.results) {
    if (r.couldNotRead) continue;
    const id = idByQNumber.get(r.qNumber);
    if (!id) continue; // no matching paper question — skip (still in the hero total)
    const subtopic = subtopicForQuestionId(id);
    if (!subtopic) continue; // honest unknown — never a fabricated concept
    const b = buckets.get(subtopic) ?? { awarded: 0, total: 0 };
    b.awarded += Number(r.marksAwarded) || 0;
    b.total += Number(r.totalMarks) || 0;
    buckets.set(subtopic, b);
  }
  if (buckets.size === 0) return null; // no concept resolved — honest absence

  const rows: ScorecardConceptLensRow[] = [...buckets.entries()].map(([subtopic, b]) => ({
    key: subtopic,
    label: subtopic,
    awarded: b.awarded,
    total: b.total,
    lost: Math.max(0, b.total - b.awarded),
  }));
  // Marks lost, worst first; ties → larger section first, then A→Z for a stable order.
  rows.sort((a, b) => b.lost - a.lost || b.total - a.total || a.key.localeCompare(b.key));
  return rows;
}

export interface ChapterTestVariantInput {
  /** The CT name — `{Topic} · Test #N`. */
  name: string;
  /** The durable `CT-{S}-{TOPIC}-{NN}` code. */
  code: string;
  /** The UNIFIED response (objective + subjective). In "partial" the subjective rows
   *  are pending; in "full" they carry grades. */
  response: WorksheetGradeResponse;
  phase: "partial" | "full";
  /** The test's questions (qNumber + canonical id) for the FULL-phase by-concept
   *  lens join. Omit in partial (objective-only — no concept lens). */
  questions?: ConceptLensQuestion[];
  downloading?: boolean;
  // Partial-phase handlers:
  onUpload?: () => void;
  onUploadLater?: () => void;
  // Full-phase handlers:
  onReadSheet?: () => void;
  onPractise?: () => void;
  onDownloadGraded?: () => void;
  onDownloadSolution?: () => void;
  onRevisit?: () => void;
}

/**
 * Build the LIVE chapter-test variant. PARTIAL: objective marks only, an honest
 * "upload to complete" prompt, and NO four-type block (spec §5 — MCQs are not an MI
 * signal). FULL: the whole-test total, the BY-SECTION A–D lens, the four-type "from
 * written answers", and the what-next menu. Pending pages surface honestly; nothing
 * is fabricated.
 */
export function chapterTestScorecardVariant(input: ChapterTestVariantInput): ScorecardVariant {
  const { name, code, response, phase, downloading = false } = input;

  if (phase === "partial") {
    const objectiveMarks = `${response.gradedMarksAwarded}/${response.gradedMarksTotal}`;
    return {
      surface: "chapter-test",
      title: name,
      subtitle: `${code} · submitted & scored`,
      score: { kind: "marks", awarded: response.gradedMarksAwarded, total: response.gradedMarksTotal },
      message:
        `Objective section scored (${objectiveMarks}). Upload your written answers ` +
        `(Sections B–D) to complete your score — with a full mistake breakdown.`,
      // NO four-type in partial: MCQs tell us right/wrong, not why (spec §5).
      fourType: null,
      sectionLens: null,
      conceptLens: null,
      pending: null,
      allPending: null,
      actionsHeading: "For now",
      stackActions: true,
      footnote:
        "No mistake breakdown yet — the “where your marks went” view appears once your written work is graded.",
      actions: [
        {
          label: "Upload written answers for full result",
          tag: "Upload",
          tone: "primary",
          onClick: input.onUpload ?? (() => {}),
          disabled: !input.onUpload,
        },
        {
          label: "Upload later — I’ll see “⏳ Awaiting sheet” in my history",
          tag: "Later",
          tone: "secondary",
          onClick: input.onUploadLater ?? (() => {}),
          disabled: !input.onUploadLater,
        },
      ],
    };
  }

  // FULL
  const menu: ScorecardAction[] = [
    {
      label: "Read my graded answer sheet",
      tag: "Sheet",
      tone: "primary",
      onClick: input.onReadSheet ?? (() => {}),
      disabled: !input.onReadSheet,
    },
    {
      label: "Practise the marks you lost",
      tag: "Practise",
      tone: "secondary",
      onClick: input.onPractise ?? (() => {}),
      disabled: !input.onPractise,
    },
    {
      label: "Download graded answer sheet (PDF)",
      tag: "Graded",
      tone: "secondary",
      onClick: input.onDownloadGraded ?? (() => {}),
      disabled: !input.onDownloadGraded || downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    },
    {
      label: "Download solution key — CBSE step-marked",
      tag: "Key",
      tone: "secondary",
      onClick: input.onDownloadSolution ?? (() => {}),
      disabled: !input.onDownloadSolution,
    },
    {
      label: "Revisit this chapter in the Topic Hub",
      tag: "Study",
      tone: "secondary",
      onClick: input.onRevisit ?? (() => {}),
      disabled: !input.onRevisit,
    },
  ];

  return {
    surface: "chapter-test",
    title: name,
    subtitle: `${code} · fully graded`,
    score: {
      kind: "marks",
      awarded: response.gradedMarksAwarded,
      total: response.gradedMarksTotal,
      gradedCount: response.gradedCount,
      totalQuestions: response.totalQuestions,
    },
    fourType: aggregateFourType(response),
    sectionLens: deriveChapterTestSectionLens(response),
    conceptLens: input.questions ? deriveChapterTestConceptLens(response, input.questions) : null,
    pending:
      response.pendingCount > 0
        ? { count: response.pendingCount, worksheetTotalMarks: response.worksheetTotalMarks }
        : null,
    allPending: null,
    actionsHeading: "What next?",
    stackActions: true,
    actions: menu,
  };
}

// ── STORED re-open variant: read-only chapter-test scorecard from a SessionRecord ──

export interface StoredChapterTestVariantInput {
  gradedDateLabel: string;
  /** The resolved per-question payload response (objective + subjective), if the host
   *  could load it — enables the A–D lens + graded-sheet download. Absent → a lighter
   *  re-open (score + four-type from the stored record only). */
  response?: WorksheetGradeResponse | null;
  onDone: () => void;
  onDownloadGraded?: () => void;
  onDownloadSolution?: () => void;
  downloading?: boolean;
}

/**
 * Rebuild a STORED chapter-test `SessionRecord` into a READ-ONLY scorecard (spec §2 —
 * the PR-3 light re-open). A pending-upload / not-yet-uploaded partial shows an honest
 * "awaiting your answer sheet" state (never a fabricated 0). A graded record shows the
 * stored total + four-type; the A–D lens is DERIVED from the resolved payload when the
 * host supplies it (else omitted — honest, never guessed).
 */
export function storedChapterTestScorecardVariant(
  record: SessionRecord,
  input: StoredChapterTestVariantInput,
): ScorecardVariant {
  const { gradedDateLabel, response, onDone, onDownloadGraded, onDownloadSolution, downloading = false } = input;
  const doneAction: ScorecardAction = { label: "Done", tone: "ghost", onClick: onDone };
  const pendingUpload = record.status === "pending-upload";
  const awaitingWritten = record.status === "partial" && !response;

  if (pendingUpload || awaitingWritten) {
    return {
      surface: "chapter-test",
      title: record.title,
      subtitle: `${record.id} · ${gradedDateLabel}`,
      score: { kind: "marks", awarded: record.marksAwarded, total: record.marksTotal },
      message:
        "Objective section scored — upload your written answers (Sections B–D) to complete this test.",
      fourType: null,
      sectionLens: null,
      pending: null,
      allPending: null,
      actions: [doneAction],
    };
  }

  const totalQuestions = response?.totalQuestions ?? record.questionIds?.length ?? 0;
  const actions: ScorecardAction[] = [];
  if (onDownloadGraded && response) {
    actions.push({
      label: "Download graded answer sheet",
      tone: "primary",
      onClick: onDownloadGraded,
      disabled: downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    });
  }
  if (onDownloadSolution) {
    actions.push({ label: "Download solution key", tone: "secondary", onClick: onDownloadSolution });
  }
  actions.push(doneAction);

  // By-concept lens on re-open — only when the resolved payload's per-question results
  // align 1:1 with the record's qNumber-ordered `questionIds` (paper order), so the
  // index → qNumber → id map is trustworthy. Otherwise omit rather than risk
  // mis-attributing a concept (anti-fabrication).
  const conceptQuestions: ConceptLensQuestion[] | null =
    response && Array.isArray(record.questionIds) && record.questionIds.length === response.results.length
      ? record.questionIds.map((id, i) => ({ qNumber: i + 1, id }))
      : null;

  return {
    surface: "chapter-test",
    title: record.title,
    subtitle: `${record.id} · graded ${gradedDateLabel}`,
    score: {
      kind: "marks",
      awarded: record.marksAwarded,
      total: record.marksTotal,
      ...(record.status === "graded" && totalQuestions > 0
        ? { gradedCount: totalQuestions, totalQuestions }
        : {}),
    },
    message: record.status === "partial" ? "Graded portion shown — some pages were pending on this test." : null,
    fourType: record.fourType,
    sectionLens: response ? deriveChapterTestSectionLens(response) : null,
    conceptLens: conceptQuestions ? deriveChapterTestConceptLens(response!, conceptQuestions) : null,
    pending: null,
    allPending: null,
    actions,
  };
}

// ── LIVE variant: FULL MOCK (fills PR-2's deferred seam — Full Mock spec §5) ───────
//
// Two-phase on the SAME Universal shell, the CT pattern extended by the lens that
// is the POINT of a mock: PARTIAL (objective only — NO four-type, an MCQ is
// right/wrong, not a WHY) → FULL (total + honest mock-to-mock delta + BY-SECTION
// A–E + BY-CHAPTER marks-lost bars + four-type from written answers). All lenses
// are DERIVED at render (sectionBreakdown stays null — owner decision 2026-07-12).
// NO board-readiness projection, ever (spec §5 — a fabricated "68/80" to a student
// who scores 52 is harm; [FU-BOARD-READINESS-MODEL] tracks any future model).

const FM_SECTION_LABEL: Record<string, string> = {
  A: "A · Objective",
  B: "B · VSA",
  C: "C · SA",
  D: "D · Long",
  E: "E · Case",
};

/** A full-mock question's identity for the render-time lens joins: qNumber (to
 *  match a grade row) + the paper's REAL section + canonical chapter. Satisfied
 *  structurally by the drawn paper's PersistedWorksheetQuestion. */
export interface FullMockLensQuestion {
  qNumber: number;
  section?: string;
  topicKey?: string;
  topicLabel?: string;
}

/**
 * Derive the A–E by-section lens for a full mock. With the paper's questions at
 * hand (live scorecard) the section is EXACT — read off each question. Without
 * them (a stored re-open) it falls back to the #353 CBSE mark-band proxy, which
 * for a full-mock paper is also exact by construction (the FM bands ARE the
 * five canonical bands: 1→A · 2→B · 3→C · 5→D · 4→E). Only graded questions
 * contribute; an unmappable mark is an honest unknown (in the hero total, no
 * section row). Returns null when nothing is attributable.
 */
export function deriveFullMockSectionLens(
  response: WorksheetGradeResponse,
  questions?: FullMockLensQuestion[],
): ScorecardSectionLensRow[] | null {
  const sectionByQNumber = new Map<number, string>();
  if (questions) {
    for (const q of questions) {
      if (q.section) sectionByQNumber.set(q.qNumber, String(q.section).toUpperCase());
    }
  }
  const buckets = new Map<string, { awarded: number; total: number }>();
  for (const r of response.results) {
    if (r.couldNotRead) continue;
    const sec = sectionByQNumber.get(r.qNumber) ?? sectionFromTotalMarks(r.totalMarks);
    if (!sec || !FM_SECTION_LABEL[sec]) continue; // honest unknown — never fabricated
    const b = buckets.get(sec) ?? { awarded: 0, total: 0 };
    b.awarded += Number(r.marksAwarded) || 0;
    b.total += Number(r.totalMarks) || 0;
    buckets.set(sec, b);
  }
  const rows = ["A", "B", "C", "D", "E"]
    .filter((s) => buckets.has(s))
    .map((s) => ({
      section: s,
      label: FM_SECTION_LABEL[s],
      awarded: buckets.get(s)!.awarded,
      total: buckets.get(s)!.total,
    }));
  return rows.length > 0 ? rows : null;
}

/**
 * Derive the BY-CHAPTER lens from a full-mock response + the paper's questions —
 * the topic-level rollup a mock exists to show ("Trigonometry cost you 9 marks").
 * The drawn paper carries each question's canonical `topicKey` (BOTH sources —
 * predicted questions resolve too), so the live join is exact, no band proxy.
 * Only graded questions contribute; a question with no chapter is an honest
 * unknown (hero total only). Sorted by marks LOST, worst first.
 */
export function deriveFullMockChapterLens(
  response: WorksheetGradeResponse,
  questions: FullMockLensQuestion[],
): ScorecardConceptLensRow[] | null {
  const byQNumber = new Map<number, FullMockLensQuestion>();
  for (const q of questions) byQNumber.set(q.qNumber, q);

  const buckets = new Map<string, { label: string; awarded: number; total: number }>();
  for (const r of response.results) {
    if (r.couldNotRead) continue;
    const q = byQNumber.get(r.qNumber);
    const slug = q?.topicKey ? resolveCanonicalSlug(q.topicKey) : "";
    if (!slug) continue; // honest unknown — never a fabricated chapter
    const b = buckets.get(slug) ?? {
      label: q?.topicLabel || resolveTopicDisplayName("", slug),
      awarded: 0,
      total: 0,
    };
    b.awarded += Number(r.marksAwarded) || 0;
    b.total += Number(r.totalMarks) || 0;
    buckets.set(slug, b);
  }
  if (buckets.size === 0) return null;

  const rows: ScorecardConceptLensRow[] = [...buckets.entries()].map(([slug, b]) => ({
    key: slug,
    label: b.label,
    awarded: b.awarded,
    total: b.total,
    lost: Math.max(0, b.total - b.awarded),
  }));
  rows.sort((a, b) => b.lost - a.lost || b.total - a.total || a.key.localeCompare(b.key));
  return rows;
}

/** Lazily-built canonical questionId → topicKey index for the STORED re-open
 *  chapter join (the paper is gone; only `questionIds` survive). A
 *  predicted-sourced id has no bank row → honest unknown, skipped. */
let _topicKeyByQuestionId: Map<string, string> | null = null;
function topicKeyForQuestionId(id: string): string | null {
  if (!_topicKeyByQuestionId) {
    const map = new Map<string, string>();
    for (const q of canonicalQuestionBank) {
      if (q.id && q.topicKey) map.set(q.id, q.topicKey);
    }
    _topicKeyByQuestionId = map;
  }
  return _topicKeyByQuestionId.get(id) ?? null;
}

/**
 * STORED-re-open chapter lens: rebuild `{qNumber, topicKey}` from the record's
 * qNumber-ordered `questionIds` via the canonical bank. Only trustworthy when the
 * payload's rows align 1:1 with the stored ids (checked by the caller). A
 * predicted-sourced id doesn't join — it stays in the hero total with no chapter
 * row (honest unknown), exactly the spec §6 rule.
 */
export function deriveStoredFullMockChapterLens(
  response: WorksheetGradeResponse,
  questionIds: string[],
): ScorecardConceptLensRow[] | null {
  const questions: FullMockLensQuestion[] = questionIds.map((id, i) => {
    const topicKey = topicKeyForQuestionId(id) ?? undefined;
    return { qNumber: i + 1, topicKey };
  });
  return deriveFullMockChapterLens(response, questions);
}

/** The one honest sentence under the chapter bars — from the worst row, only
 *  when marks were actually lost (silent on a clean paper, never invented). */
export function fullMockChapterLensNote(rows: ScorecardConceptLensRow[] | null): string | null {
  const worst = rows?.[0];
  if (!worst || worst.lost <= 0) return null;
  return `${worst.label} cost you ${worst.lost} mark${worst.lost === 1 ? "" : "s"} — the single biggest loss on this paper.`;
}

/** Format the §8b focus aggregates into the neutral scorecard line —
 *  "Focus time (on-screen) · 2h 41m of 3h 0m · away 19m across 4 breaks".
 *  Measurement, not judgement; null when nothing was measured. */
export function fullMockFocusLine(focus: {
  activeMs: number;
  awayMs: number;
  awayEventCount: number;
}): string | null {
  const total = (Number(focus.activeMs) || 0) + (Number(focus.awayMs) || 0);
  if (total <= 0) return null;
  const fmt = (ms: number): string => {
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  if ((Number(focus.awayMs) || 0) <= 0) {
    return `Focus time (on-screen) · ${fmt(focus.activeMs)} — you never left the exam screen.`;
  }
  const breaks = Number(focus.awayEventCount) || 0;
  return `Focus time (on-screen) · ${fmt(focus.activeMs)} of ${fmt(total)} · away ${fmt(focus.awayMs)} across ${breaks} break${breaks === 1 ? "" : "s"}.`;
}

export interface FullMockVariantInput {
  /** The FM name — `{Subject} · Mock #N`. */
  name: string;
  /** The durable `FM-{M|S}-{NN}` code. */
  code: string;
  /** The UNIFIED response (objective + subjective). */
  response: WorksheetGradeResponse;
  phase: "partial" | "full";
  /** The paper's questions (qNumber + section + topicKey) for the FULL-phase
   *  section + chapter joins. Omit in partial. */
  questions?: FullMockLensQuestion[];
  /** Honest-or-silent mock-to-mock delta line, computed by the host from the
   *  previous COMPLETED mock of the same subject (e.g. "▲ 9 marks vs Mock #3").
   *  null/omitted when there is no fair comparison — the shell then shows nothing. */
  deltaLine?: string | null;
  /** §8b focus line — measured aggregates only, neutral framing; null when
   *  unmeasured (see fullMockFocusLine). */
  focusLine?: string | null;
  downloading?: boolean;
  // Partial-phase handlers:
  onUpload?: () => void;
  onUploadLater?: () => void;
  // Full-phase handlers:
  onReadSheet?: () => void;
  /** Opens the worksheet builder targeted at the biggest-loss chapter. */
  onPractiseChapter?: () => void;
  onDownloadGraded?: () => void;
  onDownloadSolution?: () => void;
}

/**
 * Build the LIVE full-mock variant. PARTIAL: objective marks only, the upload
 * prompt, NO four-type (spec §5). FULL: whole-paper total + honest delta + the
 * three lenses in spec order (section → chapter → four-type "from written
 * answers") + the what-next menu LED by the MI-driven action ("Worksheet on
 * {chapter} — your biggest loss"). Pending pages surface honestly.
 */
export function fullMockScorecardVariant(input: FullMockVariantInput): ScorecardVariant {
  const { name, code, response, phase, downloading = false } = input;

  if (phase === "partial") {
    const objectiveMarks = `${response.gradedMarksAwarded}/${response.gradedMarksTotal}`;
    const notYetGraded = Math.max(
      0,
      (Number(response.worksheetTotalMarks) || 0) - (Number(response.gradedMarksTotal) || 0),
    );
    return {
      surface: "full-mock",
      title: name,
      subtitle: `${code} · submitted & scored`,
      score: { kind: "marks", awarded: response.gradedMarksAwarded, total: response.gradedMarksTotal },
      message:
        `Objective section scored (${objectiveMarks}). Upload your written answers ` +
        `(Sections B–E, ${notYetGraded} marks) to complete your score — with a ` +
        `chapter-wise breakdown and mistake analysis.`,
      note: input.focusLine ?? null,
      fourType: null, // MCQs tell us right/wrong, not why (spec §5)
      sectionLens: null,
      chapterLens: null,
      chapterLensNote: null,
      pending: null,
      allPending: null,
      actionsHeading: "For now",
      stackActions: true,
      footnote:
        "No mistake breakdown yet — MCQs only tell us right or wrong, not why. That view appears once your written work is graded.",
      actions: [
        {
          label: "Upload answer sheet for the full result",
          tag: "Upload",
          tone: "primary",
          onClick: input.onUpload ?? (() => {}),
          disabled: !input.onUpload,
        },
        {
          label: "Upload later — I’ll see “⏳ Awaiting sheet” in my mocks",
          tag: "Later",
          tone: "secondary",
          onClick: input.onUploadLater ?? (() => {}),
          disabled: !input.onUploadLater,
        },
      ],
    };
  }

  // FULL
  const chapterLens = input.questions ? deriveFullMockChapterLens(response, input.questions) : null;
  const chapterLensNote = fullMockChapterLensNote(chapterLens);
  const worstChapter = chapterLens?.[0];
  const practiseLabel =
    worstChapter && worstChapter.lost > 0
      ? `Worksheet on ${worstChapter.label} — your biggest loss`
      : "Build a worksheet on this subject";

  const menu: ScorecardAction[] = [
    {
      label: "Read my graded answer sheet",
      tag: "Sheet",
      tone: "primary",
      onClick: input.onReadSheet ?? (() => {}),
      disabled: !input.onReadSheet,
    },
    {
      label: practiseLabel,
      tag: "Practise",
      tone: "secondary",
      onClick: input.onPractiseChapter ?? (() => {}),
      disabled: !input.onPractiseChapter,
    },
    {
      label: "Download graded answer sheet (PDF)",
      tag: "Graded",
      tone: "secondary",
      onClick: input.onDownloadGraded ?? (() => {}),
      disabled: !input.onDownloadGraded || downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    },
    {
      label: "Download solution key — CBSE step-marked",
      tag: "Key",
      tone: "secondary",
      onClick: input.onDownloadSolution ?? (() => {}),
      disabled: !input.onDownloadSolution,
    },
  ];

  return {
    surface: "full-mock",
    title: name,
    subtitle: `${code} · fully graded · saved to your progress`,
    score: {
      kind: "marks",
      awarded: response.gradedMarksAwarded,
      total: response.gradedMarksTotal,
      gradedCount: response.gradedCount,
      totalQuestions: response.totalQuestions,
    },
    message: input.deltaLine ?? null,
    note: input.focusLine ?? null,
    fourType: aggregateFourType(response),
    sectionLens: deriveFullMockSectionLens(response, input.questions),
    chapterLens,
    chapterLensNote,
    pending:
      response.pendingCount > 0
        ? { count: response.pendingCount, worksheetTotalMarks: response.worksheetTotalMarks }
        : null,
    allPending: null,
    actionsHeading: "What next?",
    stackActions: true,
    actions: menu,
  };
}

// ── STORED re-open variant: read-only full-mock scorecard from a SessionRecord ──

export interface StoredFullMockVariantInput {
  gradedDateLabel: string;
  /** The resolved per-question payload, if the host could load it — enables the
   *  section + chapter lenses and the graded-sheet download. Absent → a lighter
   *  re-open (stored score + four-type only; honest, never guessed). */
  response?: WorksheetGradeResponse | null;
  onDone: () => void;
  onDownloadGraded?: () => void;
  downloading?: boolean;
  /** Override for the awaiting-sheet detail — the host sets the honest
   *  cross-device line when this device has no cached paper to grade against. */
  awaitingDetail?: string;
}

/**
 * Rebuild a STORED full-mock `SessionRecord` into a READ-ONLY scorecard. An
 * awaiting-sheet mock shows its real objective score + an honest upload state
 * (never a fabricated 0). A graded record shows the stored total + four-type +
 * §8b focus line; lenses derive from the resolved payload when present (the
 * chapter join uses the canonical bank — a predicted-sourced id is an honest
 * unknown). Nothing is invented.
 */
export function storedFullMockScorecardVariant(
  record: SessionRecord,
  input: StoredFullMockVariantInput,
): ScorecardVariant {
  const { gradedDateLabel, response, onDone, onDownloadGraded, downloading = false } = input;
  const doneAction: ScorecardAction = { label: "Done", tone: "ghost", onClick: onDone };
  const pendingUpload = record.status === "pending-upload";
  const awaitingWritten = record.status === "partial" && !response;

  const focusLine = record.focus ? fullMockFocusLine(record.focus) : null;

  if (pendingUpload || awaitingWritten) {
    return {
      surface: "full-mock",
      title: record.title,
      subtitle: `${record.id} · ${gradedDateLabel}`,
      score: { kind: "marks", awarded: record.marksAwarded, total: record.marksTotal },
      message:
        input.awaitingDetail ??
        "Objective section scored — upload your written answers (Sections B–E) to complete this mock.",
      note: focusLine,
      fourType: null,
      sectionLens: null,
      chapterLens: null,
      chapterLensNote: null,
      pending: null,
      allPending: null,
      actions: [doneAction],
    };
  }

  const totalQuestions = response?.totalQuestions ?? record.questionIds?.length ?? 0;
  const actions: ScorecardAction[] = [];
  if (onDownloadGraded && response) {
    actions.push({
      label: "Download graded answer sheet",
      tone: "primary",
      onClick: onDownloadGraded,
      disabled: downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    });
  }
  actions.push(doneAction);

  // Chapter lens on re-open — only when the payload's rows align 1:1 with the
  // record's qNumber-ordered questionIds (paper order), so the index → qNumber →
  // id map is trustworthy. Otherwise omit rather than mis-attribute a chapter.
  const chapterLens =
    response && Array.isArray(record.questionIds) && record.questionIds.length === response.results.length
      ? deriveStoredFullMockChapterLens(response, record.questionIds)
      : null;

  return {
    surface: "full-mock",
    title: record.title,
    subtitle: `${record.id} · graded ${gradedDateLabel}`,
    score: {
      kind: "marks",
      awarded: record.marksAwarded,
      total: record.marksTotal,
      ...(record.status === "graded" && totalQuestions > 0
        ? { gradedCount: totalQuestions, totalQuestions }
        : {}),
    },
    message: record.status === "partial" ? "Graded portion shown — some pages were pending on this mock." : null,
    note: focusLine,
    fourType: record.fourType,
    sectionLens: response ? deriveFullMockSectionLens(response) : null,
    chapterLens,
    chapterLensNote: fullMockChapterLensNote(chapterLens),
    pending: null,
    allPending: null,
    actions,
  };
}

// ── LIVE variant: CHECK & IMPROVE (the 5th surface — C&I PR-1, locked spec §5) ──
//
// CONFIG on the existing shell — zero shell changes: title/subtitle/score/message/
// note/fourType/pending/allPending/actions all pre-exist. Lenses: FOUR-TYPE ONLY in
// PR-1 — the spec's by-topic lens is Step-2-gated (per-question topic doesn't exist
// yet: omitted entirely for single-topic papers, unknowable for MIX until PR-3).
// NO board-readiness projection (spec §5, the Full-Mock reasoning applies as-is).
// The quiet provenance line is DISPLAY-ONLY in PR-1 (a post-grade "Change"
// affordance is PR-2's confirm-step scope). The page's bespoke graded views stay
// byte-intact underneath as "the graded sheet" behind the primary action.

/** The quiet provenance line (spec §5) — one provenance language across the
 *  surface, mirroring how marks show stated/inferred. `mixed` returns null: its
 *  honesty statement rides the message line instead. */
export function ciProvenanceLine(topicSource: SessionTopicSource | undefined): string | null {
  switch (topicSource) {
    case "confirmed":
      return "Topic confirmed by you";
    case "inferred":
      return "Topic detected automatically";
    case "bank-matched":
      return "Topic matched from the question bank";
    default:
      // mixed — or a record written before provenance existed (absent ≠ inferred,
      // spec §4.3: never backfilled into a claim).
      return null;
  }
}

/** The MIX honesty statement (spec §4.1) — a mixed paper contributes marks +
 *  mistake types and SAYS so; it never feeds a single topic's progress by guess. */
const CI_MIXED_MESSAGE =
  "This paper spans more than one topic — your marks and mistake types are saved, " +
  "but no single topic's progress is guessed from it.";

/**
 * Derive the Check & Improve BY-TOPIC lens (spec §5, lens 1) from a grade response
 * whose per-question results carry the PR-2 per-question topic (item A, client-resolved
 * via /detect-question). Exactly the Full-Mock chapter-lens shape — per-topic
 * awarded/total bars, sorted by marks lost — but the topic rides on each result, so no
 * external questions array is needed. Only GRADED questions with a RESOLVED topic
 * contribute; an unresolved question stays in the hero total (honest unknown, never a
 * fabricated topic). Returns null for a single-topic (or no-resolved-topic) paper —
 * the spec omits the lens entirely there ("Omit entirely for single-topic papers").
 */
export function deriveCheckImproveTopicLens(
  response: WorksheetGradeResponse,
): ScorecardConceptLensRow[] | null {
  const buckets = new Map<string, { label: string; awarded: number; total: number }>();
  for (const r of response.results) {
    if (r.couldNotRead) continue;
    const raw = String(r.topicSlug || "").trim();
    if (!raw) continue; // honest unknown — never a fabricated topic
    const key = resolveCanonicalSlug(raw) || raw;
    const b = buckets.get(key) ?? {
      label: r.topicLabel || resolveTopicDisplayName("", key),
      awarded: 0,
      total: 0,
    };
    b.awarded += Number(r.marksAwarded) || 0;
    b.total += Number(r.totalMarks) || 0;
    buckets.set(key, b);
  }
  if (buckets.size < 2) return null; // single-topic (or none) → omit the lens (spec §5)

  const rows: ScorecardConceptLensRow[] = [...buckets.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    awarded: b.awarded,
    total: b.total,
    lost: Math.max(0, b.total - b.awarded),
  }));
  rows.sort((a, b) => b.lost - a.lost || b.total - a.total || a.key.localeCompare(b.key));
  return rows;
}

/** Count DISTINCT resolved per-question topics on a graded response (empty slugs — the
 *  honest unresolved — never count). Drives the counted "N topics" head/chip. */
export function countResolvedTopics(response: WorksheetGradeResponse): number {
  const seen = new Set<string>();
  for (const r of response.results) {
    if (r.couldNotRead) continue;
    const raw = String(r.topicSlug || "").trim();
    if (raw) seen.add(resolveCanonicalSlug(raw) || raw);
  }
  return seen.size;
}

export interface CheckImproveVariantInput {
  /** The confirmed topic display name; "" when no single topic resolved (MIX). */
  topicName: string;
  /** The durable CI-{S}-{TOK}-{NN} code. */
  code: string;
  topicSource: SessionTopicSource;
  /** The unified response — the multi path's grade, or the single path adapted via
   *  singleCheckToWorksheetResponse. */
  response: WorksheetGradeResponse;
  /** True when the session record was persisted (signed-in, non-local) — drives the
   *  honest "saved to your progress" subtitle; never claimed otherwise. */
  saved: boolean;
  downloading?: boolean;
  /** Reveal the bespoke graded views underneath (closes the scorecard). */
  onReadSheet: () => void;
  onDownloadGraded?: () => void;
  /** Deep-link the worksheet builder to the confirmed topic. Omitted for MIX —
   *  there is no honest single-topic target to practise. */
  onPractiseTopic?: () => void;
  /** The RETURN TICKET (optional, additive). When the student was sent here from
   *  another surface, a row is PREPENDED to the what-next menu so they don't have to
   *  scroll up hunting for the way home at the exact moment they want to leave.
   *  Omitted (a direct visit) → the menu is byte-identical to before. */
  returnTicket?: { label: string; onReturn: () => void };
}

/** The return-ticket row. `tone: "secondary"` deliberately: the what-next menu's
 *  primary slot belongs to the session's own next step, and two primaries would leave
 *  neither reading as the emphasis. `tag` renders as the menu's small leading chip. */
function returnTicketAction(ticket: { label: string; onReturn: () => void }): ScorecardAction {
  return { label: ticket.label, tag: "Back", tone: "secondary", onClick: ticket.onReturn };
}

/**
 * Build the LIVE Check & Improve variant — the FM/CT shape with C&I's content:
 * marks hero over the honest graded subtotal, the pending strip for unreadable
 * pages (never a 0), four-type from written answers only (a bare wrong MCQ carries
 * no mistakeSummary — #348), the quiet provenance line, and a stacked what-next
 * menu with NO solution key (the questions are the student's own, spec §5).
 */
export function checkImproveScorecardVariant(input: CheckImproveVariantInput): ScorecardVariant {
  const { topicName, code, topicSource, response, saved, downloading = false } = input;
  const mixed = topicSource === "mixed";
  const allPending = response.gradedCount === 0;

  // C&I PR-2 (item A/B) — the by-topic lens + counted head, both from the per-question
  // topics the response now carries. Null lens / <2 count → the honest plain "mixed
  // topics" fallback (never a fabricated number). A single-topic paper omits the lens.
  const topicLens = deriveCheckImproveTopicLens(response);
  const topicCount = countResolvedTopics(response);

  const head = mixed
    ? topicCount >= 2
      ? `Uploaded paper · ${code} · ${topicCount} topics`
      : `Uploaded paper · ${code} · mixed topics`
    : `${topicName || "Checked paper"} · ${code}`;
  const subtitle = `${head} · graded just now${saved ? " · saved to your progress" : ""}`;

  if (allPending) {
    // Nothing was readable — an honest empty state, mirroring the worksheet copy.
    // (No session record is written for this state; the scorecard still says why.)
    return {
      surface: "check-improve",
      title: "Check & Improve paper",
      subtitle: `${head} · graded just now`,
      score: { kind: "marks", awarded: 0, total: 0 }, // not rendered — allPending below
      fourType: null,
      pending: null,
      allPending: {
        title: "We couldn’t read any answers",
        detail:
          "None of the pages could be read clearly — re-upload clearer photos and we’ll grade them. Nothing has been scored 0.",
      },
      // The ticket rides this branch too. It is a SEPARATE action array that doesn't
      // set stackActions (it renders as the 2-up row), so without this line the way
      // home would vanish at exactly the moment grading failed — the moment a stranded
      // student most wants it.
      actions: [
        ...(input.returnTicket ? [returnTicketAction(input.returnTicket)] : []),
        { label: "Back to my paper", tone: "ghost", onClick: input.onReadSheet },
      ],
    };
  }

  const menu: ScorecardAction[] = [
    // PREPENDED so the way home is the FIRST row of the what-next menu — the student
    // shouldn't scroll past everything else to find it at the moment they want to
    // leave. Absent on a direct visit → this menu is byte-identical to before.
    ...(input.returnTicket ? [returnTicketAction(input.returnTicket)] : []),
    {
      label: "Read my graded answer sheet",
      tag: "Sheet",
      tone: "primary",
      onClick: input.onReadSheet,
    },
  ];
  if (!mixed && topicName && input.onPractiseTopic) {
    menu.push({
      label: `Practise ${topicName}`,
      tag: "Practise",
      tone: "secondary",
      onClick: input.onPractiseTopic,
    });
  }
  if (input.onDownloadGraded) {
    menu.push({
      label: "Download graded solution (PDF)",
      tag: "Graded",
      tone: "secondary",
      onClick: input.onDownloadGraded,
      disabled: downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    });
  }

  return {
    surface: "check-improve",
    title: "Check & Improve paper",
    subtitle,
    score: {
      kind: "marks",
      awarded: response.gradedMarksAwarded,
      total: response.gradedMarksTotal,
      gradedCount: response.gradedCount,
      totalQuestions: response.totalQuestions,
    },
    message: mixed ? CI_MIXED_MESSAGE : null,
    note: ciProvenanceLine(topicSource),
    // By-topic lens (spec §5 lens 1) — reuses the shell's chapter-lens slot, exactly
    // like Full Mock. Null (single-topic / unresolved) → the shell omits it.
    chapterLens: topicLens,
    chapterLensNote: fullMockChapterLensNote(topicLens),
    fourType: aggregateFourType(response),
    pending:
      response.pendingCount > 0
        ? { count: response.pendingCount, worksheetTotalMarks: response.worksheetTotalMarks }
        : null,
    allPending: null,
    actionsHeading: "What next?",
    stackActions: true,
    ...(saved
      ? {}
      : {
          footnote:
            "Not saved — sign in to keep your checked papers in your history and progress.",
        }),
    actions: menu,
  };
}

// ── STORED re-open variant: read-only Check & Improve scorecard from a record ──

export interface StoredCheckImproveVariantInput {
  gradedDateLabel: string;
  onDone: () => void;
  /** The resolved per-question payload response, when the host loaded it (item A/B) —
   *  enables the by-topic lens on RE-OPEN. Absent → the lens is omitted (honest); the
   *  counted "N topics" head still shows from the record's stored topicCount. */
  response?: WorksheetGradeResponse | null;
}

/**
 * Rebuild a STORED check-improve `SessionRecord` into a READ-ONLY scorecard:
 * stored score + four-type + the provenance line (absent provenance stays absent —
 * never backfilled into a claim). No graded-count is claimed: a C&I record's
 * `questionIds` is honestly [] (external uploads have no bank identity), so the
 * shell shows the score without a fabricated count. Read-only: Done only.
 */
export function storedCheckImproveScorecardVariant(
  record: SessionRecord,
  input: StoredCheckImproveVariantInput,
): ScorecardVariant {
  const mixed = record.topicSource === "mixed";
  const messages = [
    mixed ? CI_MIXED_MESSAGE : null,
    record.status === "partial"
      ? "Graded portion shown — some pages couldn’t be read on this session."
      : null,
  ].filter(Boolean);

  // C&I PR-2 (item A/B) on RE-OPEN — the counted head from the stored topicCount, and
  // the by-topic lens DERIVED from the resolved payload when the host loaded it (the
  // payload's per-question results carry the stored per-question topics). Absent
  // payload → lens omitted (honest); a pre-PR-2 record with no topicCount → the plain
  // "mixed topics" fallback.
  const topicLens = input.response ? deriveCheckImproveTopicLens(input.response) : null;
  const topicCount = record.topicCount ?? (input.response ? countResolvedTopics(input.response) : 0);
  const mixLabel = mixed ? (topicCount >= 2 ? ` · ${topicCount} topics` : " · mixed topics") : "";

  return {
    surface: "check-improve",
    title: record.title,
    subtitle: `${record.id} · graded ${input.gradedDateLabel}${mixLabel}`,
    score: { kind: "marks", awarded: record.marksAwarded, total: record.marksTotal },
    message: messages.length ? messages.join(" ") : null,
    note: ciProvenanceLine(record.topicSource),
    chapterLens: topicLens,
    chapterLensNote: fullMockChapterLensNote(topicLens),
    fourType: record.fourType,
    pending: null,
    allPending: null,
    actions: [{ label: "Done", tone: "ghost", onClick: input.onDone }],
  };
}

// ── STORED re-open variant: read-only Quick Practice scorecard from a record ──

export interface StoredQuickPracticeVariantInput {
  /** A pre-formatted date label (the host formats `gradedAt`; keeps this builder pure). */
  gradedDateLabel: string;
  /** Close the read-only re-open. */
  onDone: () => void;
  /** Download the graded-sheet PDF. Present ONLY when the host can actually resolve a
   *  sheet for this record — absent otherwise, so the affordance never promises a sheet
   *  it cannot produce. ⚠ A QP record's `worksheetId` is the synthetic `qp:{code}` and
   *  has NO PersistedWorksheet behind it, so the worksheet history's resolver returns
   *  nothing for QP; a QP host must supply its own. */
  onDownload?: () => void;
  downloading?: boolean;
}

/**
 * Rebuild a STORED Quick Practice `SessionRecord` into a READ-ONLY scorecard — the FIFTH
 * stored variant, following the existing four exactly (score + four-type + code, all from
 * the stored record; invent nothing). Like its siblings it does NOT reconstruct
 * per-question working; the only graded-sheet access is the optional download.
 *
 * ★★ IT CANNOT INHERIT `ObjectiveMarkNotBinaryError`, STRUCTURALLY — and that is the point.
 * `quickPracticeGradedScorecardVariant` throws by looping over `answers[]`; a record-based
 * variant HAS no `answers[]`, so there is no loop to inherit. ⚠ This is STRUCTURALLY
 * SATISFIED, NOT FIXED: the live variant's throw is untouched and still correct there.
 * Do not record this as a fix, or the next lane will re-fix a bug that cannot occur here.
 *
 * ★ FRACTIONAL MARKS PASS THROUGH UNROUNDED. Half-marks are real in CBSE step marking
 * (CLAUDE.md §13), and the whole point of a stored variant is replaying history — so
 * `0.5` is carried to the shell as `0.5`, never rounded and never thrown on.
 *
 * ⚠ A QP record's `status` is ALWAYS "graded" (QP has no upload cycle), so there is no
 * pending-upload branch here. Adding one would render a state that cannot occur.
 */
export function storedQuickPracticeScorecardVariant(
  record: SessionRecord,
  input: StoredQuickPracticeVariantInput,
): ScorecardVariant {
  const { gradedDateLabel, onDone, onDownload, downloading = false } = input;
  const totalQuestions = record.questionIds?.length ?? 0;

  const actions: ScorecardAction[] = [];
  if (onDownload) {
    actions.push({
      label: "Download graded answer sheet (PDF)",
      tone: "primary",
      onClick: onDownload,
      disabled: downloading,
      busy: downloading,
      busyLabel: "Preparing PDF…",
    });
  }
  actions.push({ label: "Done", tone: "ghost", onClick: onDone });

  return {
    surface: "quick-practice",
    title: record.title,
    subtitle: `${record.id} · graded ${gradedDateLabel}`,
    score: {
      kind: "marks",
      awarded: record.marksAwarded,
      total: record.marksTotal,
      // Claim a graded-count ONLY when the record actually carries question ids — an
      // empty set omits it rather than fabricate "0 of 0".
      ...(totalQuestions > 0 ? { gradedCount: totalQuestions, totalQuestions } : {}),
    },
    fourType: record.fourType,
    pending: null,
    allPending: null,
    actions,
  };
}
