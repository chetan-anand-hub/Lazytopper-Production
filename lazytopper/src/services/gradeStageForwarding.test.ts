// GRADE-RESULT-COPY-1 (C) — Chapter Test, Full Mock and the Quick Practice batch forward the grade
// call's stage to their page, so a "slow" retry can say "Taking a little longer than usual — still
// checking…". Additive and optional: with no listener the grade call's options carry no `onStage`.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GradingStage } from "../ai/gradingTransport";
import { gradingStageLabel } from "../ai/gradingTransport";

const calls = vi.hoisted(() => ({ list: [] as Array<{ opts: Record<string, unknown> }> }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    // A refused grade: the service returns right after the call, so only the forwarding is under test.
    gradeWorksheet: vi.fn(async (_req: unknown, opts: { onStage?: (s: GradingStage) => void } & Record<string, unknown>) => {
      calls.list.push({ opts });
      opts?.onStage?.({ kind: "retrying", attempt: 1, reason: "slow" });
      return { ok: false, error: "x", results: [], totalQuestions: 0, gradedCount: 0, pendingCount: 0, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 0 };
    }),
  };
});

import { gradeChapterTestUpload } from "./chapterTestGradeService";
import { gradeFullMockUpload } from "./fullMockGradeService";
import { gradeQuickPracticeBatch } from "./quickPracticeSessionService";

const paper = {
  worksheetId: "p-1", createdAt: "x", title: "T", subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 4, code: "CT-M-RN-01", name: "RN #1",
  questions: [{ qNumber: 2, id: "b", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "q2" }],
} as never;
const objective = { results: [], awarded: 0, total: 1, answeredCount: 0, totalQuestions: 1 } as never;
const user = { uid: "u1", isLocalSession: false } as never;
const upload = { imageBase64: "x", imageMimeType: "application/pdf" };
const subjectiveQuestions = (paper as unknown as { questions: never[] }).questions;

beforeEach(() => {
  calls.list.length = 0;
});

describe("a slow retry reaches the page on every paper surface", () => {
  it("Chapter Test", async () => {
    const seen: GradingStage[] = [];
    await gradeChapterTestUpload({ user, paper, code: "CT-M-RN-01", subject: "maths", topicKey: "real-numbers", objective, subjectiveQuestions, upload, onStage: (s) => seen.push(s) });
    expect(seen).toEqual([{ kind: "retrying", attempt: 1, reason: "slow" }]);
    expect(gradingStageLabel(seen[0])).toBe("Taking a little longer than usual — still checking…");
    expect(calls.list[0].opts.surface).toBe("chapter-test");
  });

  it("Full Mock", async () => {
    const seen: GradingStage[] = [];
    await gradeFullMockUpload({ user, paper, code: "FM-M-01", subject: "maths", objective, subjectiveQuestions, upload, onStage: (s) => seen.push(s) });
    expect(seen).toEqual([{ kind: "retrying", attempt: 1, reason: "slow" }]);
    expect(calls.list[0].opts.surface).toBe("full-mock");
  });

  it("Quick Practice batch", async () => {
    const seen: GradingStage[] = [];
    const grade = (async (_req: unknown, opts?: { onStage?: (s: GradingStage) => void }) => {
      opts?.onStage?.({ kind: "retrying", attempt: 1, reason: "slow" });
      return { ok: false, error: "x", results: [], totalQuestions: 0, gradedCount: 0, pendingCount: 0, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 0 };
    }) as never;
    await gradeQuickPracticeBatch({
      worksheetId: "qp-1", subject: "Maths", user, grade, onStage: (s) => seen.push(s),
      answers: [{ questionId: "bank-1", qNumber: 1, marks: 3, questionText: "q", imageBase64: "IMG", imageMimeType: "image/jpeg" } as never],
    });
    expect(seen).toEqual([{ kind: "retrying", attempt: 1, reason: "slow" }]);
  });

  it("CONTROL: with no listener the options carry no onStage (behaviour unchanged)", async () => {
    await gradeChapterTestUpload({ user, paper, code: "CT-M-RN-01", subject: "maths", topicKey: "real-numbers", objective, subjectiveQuestions, upload });
    await gradeFullMockUpload({ user, paper, code: "FM-M-01", subject: "maths", objective, subjectiveQuestions, upload });
    expect(calls.list).toHaveLength(2);
    for (const c of calls.list) expect("onStage" in c.opts).toBe(false);
  });
});
