// src/components/results/scorecardBankLenses.ts
//
// BANK-LEAN-1 (C3) — the scorecard pieces that READ THE QUESTION BANK, moved verbatim
// out of scorecardVariants.ts. Two lookups join a graded question to its bank row —
// `subtopicForQuestionId` (the chapter-test BY-CONCEPT lens) and `topicKeyForQuestionId`
// (the stored full-mock BY-CHAPTER lens) — and these are the functions that need them:
//
//   deriveChapterTestConceptLens · chapterTestScorecardVariant ·
//   storedChapterTestScorecardVariant · deriveStoredFullMockChapterLens ·
//   storedFullMockScorecardVariant
//
// WHY A SEPARATE MODULE. scorecardVariants is imported by surfaces that serve no bank
// question (Check & Improve — the main landing page — plus worksheet and quick-practice
// scorecards). Its one `import { canonicalQuestionBank }` put the ~8.6 MB bank chunk on
// all of them. The Chapter Test and Full Mock pages, which DO serve bank questions,
// import these from here; nothing else needs them. Behaviour is byte-for-byte the same.
//
// ⚠ scorecardVariants must NOT re-export anything from this file (that would restore the
// static edge). `bankReach.guard.test.ts` (src/config) goes red, naming the chain, if a
// protected page reaches canonicalQuestionBank.ts again.

import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { buildGradedAnswersFromWorksheetResponse } from "../../services/gradedAnswerAssembly";
import type { SessionRecord } from "../../services/sessionRecords";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import {
  aggregateFourType,
  deriveChapterTestSectionLens,
  deriveFullMockChapterLens,
  deriveFullMockSectionLens,
  fullMockChapterLensNote,
  fullMockFocusLine,
  type ChapterTestVariantInput,
  type ConceptLensQuestion,
  type FullMockLensQuestion,
  type ScorecardAction,
  type ScorecardConceptLensRow,
  type ScorecardVariant,
  type StoredChapterTestVariantInput,
  type StoredFullMockVariantInput,
} from "./scorecardVariants";

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

  const ctGradedAnswers = buildGradedAnswersFromWorksheetResponse(response, input.questions);

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
    // GRADED-STEP-BLOCK - the per-answer sheet, with the student's own per-step working.
    // Before this lane the chapter test emitted NO gradedAnswers at all, so the shell's
    // GradedSheetBlock could never mount here however the shell was written, and the
    // "Read my graded answer sheet" action had nothing to lead to. Built through the
    // SHARED assembly, the same one Quick Practice uses - one shape, one clamp, one set
    // of honest-ungraded rules.
    gradedAnswers: ctGradedAnswers.length > 0 ? ctGradedAnswers : null,
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
