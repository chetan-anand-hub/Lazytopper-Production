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
import { sectionFromTotalMarks } from "../worksheet/worksheetMiSelector";

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

/** One row of the chapter-test BY-SECTION lens (spec §5) — awarded/total per CBSE
 *  board section. DERIVED at render (decision D3), never persisted. */
export interface ScorecardSectionLensRow {
  section: string;
  label: string;
  awarded: number;
  total: number;
}

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
  /** Chapter-test BY-SECTION lens (A–D), rendered by the shell above the four-type
   *  block. Derived at render (D3); other surfaces leave it null. */
  sectionLens?: ScorecardSectionLensRow[] | null;
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

export interface ChapterTestVariantInput {
  /** The CT name — `{Topic} · Test #N`. */
  name: string;
  /** The durable `CT-{S}-{TOPIC}-{NN}` code. */
  code: string;
  /** The UNIFIED response (objective + subjective). In "partial" the subjective rows
   *  are pending; in "full" they carry grades. */
  response: WorksheetGradeResponse;
  phase: "partial" | "full";
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
    pending: null,
    allPending: null,
    actions,
  };
}
