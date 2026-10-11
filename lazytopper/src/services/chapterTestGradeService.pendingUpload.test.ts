// PENDING-UPLOAD-1 PR-1 — a LATER grade of a pending Chapter Test attaches to the EXISTING
// record: same id (= the code), same worksheetId (the paper's fair-use / MI identity). No
// new record, no new sequence number.

import { describe, it, expect, vi } from "vitest";

const writes = vi.hoisted(() => ({ records: [] as Array<{ id: string; worksheetId: string; status: string }>, gradeCalls: [] as unknown[] }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    gradeWorksheet: vi.fn(async (req: { worksheetId: string }, opts: unknown) => {
      writes.gradeCalls.push({ req, opts });
      return {
        ok: true,
        worksheetId: req.worksheetId,
        results: [{ qNumber: 2, ok: true, totalMarks: 3, marksAwarded: 3, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" }],
        totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 3, gradedMarksTotal: 3, worksheetTotalMarks: 3,
      };
    }),
  };
});
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: (_u: unknown, r: { id: string; worksheetId: string; status: string }) => { writes.records.push(r); },
    writeSessionPerQuestion: () => {},
  };
});
vi.mock("./mistakeIntelligence", () => ({ recordMistake: async () => ({ outcome: "skipped", bridged: false }) }));
vi.mock("./practiceInsights", () => ({ recordAttempt: () => {} }));

import { gradeChapterTestUpload } from "./chapterTestGradeService";
import { loadChapterTestPaper, saveChapterTestPaper } from "./chapterTestPaperStore";

describe("PENDING-UPLOAD-1 · later grade attaches to the existing record", () => {
  it("★ the restored paper grades under the SAME code and worksheetId; the record id is the code", async () => {
    const user = { uid: "u1", isLocalSession: false } as never;
    const paper = {
      worksheetId: "ct-abc", createdAt: "x", title: "T", subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 4, code: "CT-M-REALNUMBERS-03", name: "RN #3",
      questions: [
        { qNumber: 1, id: "a", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "q", options: ["1", "2"], answer: "1" },
        { qNumber: 2, id: "b", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "q2" },
      ],
    };
    const objective = { results: [{ qNumber: 1, id: "a", selected: "1", correct: true, awarded: 1, total: 1 }], awarded: 1, total: 1, answeredCount: 1, totalQuestions: 1 };
    saveChapterTestPaper(user, { code: "CT-M-REALNUMBERS-03", name: "RN #3", subject: "Maths", topicKey: "real-numbers", paper, objective });
    const snap = await loadChapterTestPaper(user, "CT-M-REALNUMBERS-03");
    expect(snap).not.toBeNull();
    const out = await gradeChapterTestUpload({
      user, paper: snap!.paper, code: snap!.code, subject: "maths", topicKey: "real-numbers", objective: snap!.objective,
      subjectiveQuestions: snap!.paper.questions.filter((q) => q.section !== "A"),
      upload: { imageBase64: "x", imageMimeType: "application/pdf" },
    });
    expect(out.ok).toBe(true);
    expect(writes.records).toHaveLength(1);
    expect(writes.records[0].id).toBe("CT-M-REALNUMBERS-03");
    expect(writes.records[0].worksheetId).toBe("ct-abc");
    expect(writes.records[0].status).toBe("graded");
    expect((writes.gradeCalls[0] as { opts: { paperKey: string } }).opts.paperKey).toBe("ct-abc");
  });
});
