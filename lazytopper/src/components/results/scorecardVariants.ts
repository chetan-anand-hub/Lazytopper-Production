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
// LIVE (fully populated here): worksheet + quick-practice.
// DEFERRED (defined-but-stubbed): chapter-test + full-mock — their surfaces are still
// being rebuilt and their board-readiness / upload-state dependencies do NOT exist yet,
// so they carry `deferred: true` and are NEVER rendered by a live host in this PR. They
// exist so later insertion is FILLING CONFIG, not re-architecting (§2).
//
// HONESTY (verbatim from the shipped worksheet scorecard — no fabricated numbers):
// pending is sacred (never a deflated 0); the four-type block renders ONLY when typed
// mistakes exist; a 0-attempted quick-practice session shows an honest empty state, never
// an invented insight. This module is PURE (no React, no I/O) so the flex-points are unit-
// testable; <ResultsScorecard> is the shell that renders a variant.

import type { WorksheetGradeResponse } from "../../ai/aiClient";
import type { SessionFourType, SessionRecord } from "../../services/sessionRecords";

export type ScorecardSurface = "worksheet" | "quick-practice" | "chapter-test" | "full-mock";

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

/**
 * The per-surface config the shell renders. Populated by the builders below. A
 * `deferred` variant is a config seam only (chapter-test / full-mock) — never handed
 * to a live host in this PR.
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
  pending?: ScorecardPending | null;
  allPending?: ScorecardAllPending | null;
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
    "chapter",
    "predicted",
    "study",
  ];

  // Personalized primary, from the REAL signal only:
  //   strong (≥3 MCQs, ≥80%)  → elevate the Chapter Test (ready to be tested)
  //   dipping (≥3 MCQs, <50%) → elevate Study this chapter (revise first)
  //   otherwise / no-signal   → the floor default (keep practicing, else fresh set)
  const floorDefault: MenuId = floor.includes("keep") ? "keep" : "fresh";
  let primaryId: MenuId = floorDefault;
  if (accuracy !== null && mcqAnswered >= 3) {
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

// ── DEFERRED config seams: CHAPTER TEST + FULL MOCK (defined, never rendered here) ──
//
// These surfaces are still being rebuilt; their board-readiness (chapter test) and
// E2b answer-sheet upload (full mock) dependencies do NOT exist yet. They are DEFINED
// as `deferred` stubs so the type covers all four surfaces and later insertion is
// filling in the real score / framing / actions — NOT re-architecting the shell. A
// deferred variant must never be handed to a live host in this PR; <ResultsScorecard>
// treats a rendered deferred variant as a no-op (returns null) as a guard.

export interface DeferredVariantInput {
  title: string;
  subtitle?: string;
}

/** DEFERRED — chapter test. Board-readiness + upload-grade seams unbuilt. Do not render. */
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

/** DEFERRED — full mock. Section-breakdown + upload-grade seams unbuilt. Do not render. */
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
