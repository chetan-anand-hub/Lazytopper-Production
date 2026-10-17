// QP-GRADED-SHEET-1 — the Quick Practice scorecards' "Download graded answer sheet (PDF)" row:
// the SAME label / tag / busy state as the Chapter Test and Full Mock what-next row, second in the
// menu, present ONLY when the host supplies a handler (it does so only when >= 1 question is
// graded), and the menu byte-identical when it does not. Display only.
import { describe, it, expect, vi } from "vitest";
import {
  QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL,
  quickPracticeGradedScorecardVariant,
  quickPracticeScorecardVariant,
  reopenedQuickPracticeScorecardVariant,
  type ScorecardVariant,
} from "./scorecardVariants";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";
import type { SessionRecord } from "../../services/sessionRecords";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

const noop = () => {};
const labels = (v: ScorecardVariant) => v.actions.map((a) => a.label);

function mcqInput(attempted: number) {
  return {
    attempted,
    totalInSet: 3,
    mcqAnswered: attempted,
    mcqCorrect: 1,
    allDone: attempted === 3,
    mcqMarksAwarded: 1,
    mcqMarksTotal: attempted,
    onReviewSet: noop,
    onKeepPracticing: noop,
    onFreshSet: noop,
    onChapterTest: noop,
    onPredicted: noop,
    onStudy: noop,
  };
}

const record = {
  id: "QP-M-REAL-abc12345",
  surface: "quick-practice",
  title: "Real Numbers · Practice set",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: ["q-1", "q-2"],
  marksAwarded: 1,
  marksTotal: 2,
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  status: "graded",
  gradedAt: 1_760_000_000_000,
  worksheetId: "qp:QP-M-REAL-abc12345",
  perQuestionRef: "ref",
} as unknown as SessionRecord;
const reopenMenu = { onFreshSet: noop, onChapterTest: noop, onPredicted: noop, onStudy: noop };

describe("QP-GRADED-SHEET-1 · the MCQ (attempted) Quick Practice scorecard", () => {
  it("★ shows the download SECOND, with the CT/FM label, tag and busy state, when the host supplies it", () => {
    const onDownloadGraded = vi.fn();
    const v = quickPracticeScorecardVariant({ ...mcqInput(2), onDownloadGraded });
    const row = v.actions[1];
    expect(row.label).toBe("Download graded answer sheet (PDF)");
    expect(row.label).toBe(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
    expect(row.tag).toBe("Graded");
    expect(row.tone).toBe("secondary");
    expect(v.actions[0].tone).toBe("primary"); // the review row keeps the primary slot
    row.onClick();
    expect(onDownloadGraded).toHaveBeenCalledTimes(1);
    const busy = quickPracticeScorecardVariant({ ...mcqInput(2), onDownloadGraded, downloading: true }).actions[1];
    expect(busy).toMatchObject({ busy: true, disabled: true, busyLabel: "Preparing PDF…" });
  });

  it("★ no handler (nothing graded) ⇒ no row, and the menu is byte-identical", () => {
    const without = quickPracticeScorecardVariant(mcqInput(2));
    expect(labels(without)).not.toContain(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
    const withRow = quickPracticeScorecardVariant({ ...mcqInput(2), onDownloadGraded: noop });
    expect(labels(withRow).filter((l) => l !== QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL)).toEqual(labels(without));
  });

  it("the 0-attempted empty state never offers a sheet, even if a handler is passed", () => {
    const v = quickPracticeScorecardVariant({ ...mcqInput(0), onDownloadGraded: noop });
    expect(labels(v)).not.toContain(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
  });

  it("the score and note are unchanged by the row (display only)", () => {
    const a = quickPracticeScorecardVariant(mcqInput(2));
    const b = quickPracticeScorecardVariant({ ...mcqInput(2), onDownloadGraded: noop });
    expect(b.score).toEqual(a.score);
    expect(b.note).toEqual(a.note);
    expect(b.fourType).toEqual(a.fourType);
  });
});

describe("QP-GRADED-SHEET-1 · the batch-graded (written answers checked) Quick Practice scorecard", () => {
  const base = {
    marksAwarded: 2,
    marksTotal: 4,
    gradedCount: 2,
    totalQuestions: 3,
    onKeepPracticing: noop,
    onFreshSet: noop,
  };
  it("★ shows the download second when supplied; absent ⇒ the menu is unchanged", () => {
    const without = quickPracticeGradedScorecardVariant(base);
    const withRow = quickPracticeGradedScorecardVariant({ ...base, onDownloadGraded: noop });
    expect(withRow.actions[1].label).toBe(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
    expect(withRow.actions[1].tag).toBe("Graded");
    expect(labels(without)).not.toContain(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
    expect(labels(withRow).filter((l) => l !== QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL)).toEqual(labels(without));
    expect(withRow.score).toEqual(without.score);
  });
});

describe("QP-GRADED-SHEET-1 · the reopened (history / tutor return) Quick Practice scorecard", () => {
  it("★ shows the download second when supplied; absent ⇒ the menu is unchanged", () => {
    const without = reopenedQuickPracticeScorecardVariant(record, { gradedDateLabel: "9 Oct 2025", menu: reopenMenu });
    const withRow = reopenedQuickPracticeScorecardVariant(record, {
      gradedDateLabel: "9 Oct 2025",
      menu: reopenMenu,
      onDownloadGraded: noop,
    });
    expect(withRow.actions[1].label).toBe(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
    expect(labels(without)).not.toContain(QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL);
    expect(labels(withRow).filter((l) => l !== QUICK_PRACTICE_DOWNLOAD_GRADED_LABEL)).toEqual(labels(without));
  });
});

describe("QP-GRADED-SHEET-1 · uniform with the existing pattern", () => {
  it("the QP row reads exactly as the Chapter Test full scorecard's graded-sheet row", () => {
    const response = {
      ok: true, results: [], totalQuestions: 0, gradedCount: 0, pendingCount: 0,
      gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 0,
    } as unknown as WorksheetGradeResponse;
    const ct = chapterTestScorecardVariant({ name: "T", code: "CT-M-X-01", response, phase: "full", onDownloadGraded: noop });
    const ctRow = ct.actions.find((a) => a.tag === "Graded")!;
    const qpRow = quickPracticeScorecardVariant({ ...mcqInput(2), onDownloadGraded: noop }).actions[1];
    expect({ label: qpRow.label, tag: qpRow.tag, tone: qpRow.tone, busyLabel: qpRow.busyLabel }).toEqual({
      label: ctRow.label, tag: ctRow.tag, tone: ctRow.tone, busyLabel: ctRow.busyLabel,
    });
  });
});
