import { describe, it, expect } from "vitest";
import type { SessionPerQuestionPayload, SessionRecord } from "../../services/sessionRecords";
import type { WorksheetQuestionGrade } from "../../ai/aiClient";
import {
  buildScorecardReturnedWork,
  composeScorecardQuestionOpener,
  findScorecardQuestion,
  recordBelongsToUid,
} from "./tutorRoundTrip";
import { buildTutorPath } from "./tutorPath";

/**
 * START-HERE-1 §2.5 — the scorecard hop's pure half. Every number and quoted word comes from the
 * stored record/payload; a bare MCQ click (no steps) is not dressed up.
 */
const record = {
  id: "QP-1",
  questionIds: ["q-a", "q-b", "q-c"],
  dedupKey: "u1::QP-1",
  perQuestionRef: "qp:QP-1",
} as unknown as SessionRecord;

const mcqLost = { qNumber: 2, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 0, percentage: 0 } as unknown as WorksheetQuestionGrade;
const mcqFull = { qNumber: 1, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 1, percentage: 100 } as unknown as WorksheetQuestionGrade;
const written = {
  qNumber: 3, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 1, percentage: 33,
  annotatedSteps: [
    { stepNumber: 1, description: "Write the formula", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "", mistakeType: null },
    { stepNumber: 2, description: "Substitute the values", status: "incorrect", marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "You used 5 instead of 50.", mistakeType: "calculation" },
  ],
} as unknown as WorksheetQuestionGrade;
const payload = { ref: "qp:QP-1", response: { results: [mcqFull, mcqLost, written] } } as unknown as SessionPerQuestionPayload;

describe("findScorecardQuestion", () => {
  it("maps a question id to its displayed position and graded result", () => {
    expect(findScorecardQuestion(record, payload, "q-b")).toEqual({ qNumber: 2, result: mcqLost });
    expect(findScorecardQuestion(record, payload, "q-c")?.qNumber).toBe(3);
  });
  it("a question that is not in the record is null (the normal tutor opens)", () => {
    expect(findScorecardQuestion(record, payload, "q-zzz")).toBeNull();
  });
  it("a missing payload still finds the question, with no result", () => {
    expect(findScorecardQuestion(record, null, "q-a")).toEqual({ qNumber: 1, result: null });
  });
});

describe("recordBelongsToUid (the uid scope)", () => {
  it("accepts the student's own record and refuses another account's", () => {
    expect(recordBelongsToUid(record, "u1")).toBe(true);
    expect(recordBelongsToUid(record, "u2")).toBe(false);
  });
  it("a record with no uid in its dedup key is not refused (older shapes)", () => {
    expect(recordBelongsToUid({ ...record, dedupKey: "legacy" } as SessionRecord, "u2")).toBe(true);
  });
});

describe("composeScorecardQuestionOpener", () => {
  it("★ a lost MCQ: names the question and the marks, offers 'why', and invents no step", () => {
    const o = composeScorecardQuestionOpener(2, mcqLost, "Real Numbers");
    expect(o.text).toContain("Q2 on that Real Numbers set cost you 1 mark");
    expect(o.text).toContain("why the right answer is right");
    expect(o.text).not.toMatch(/step \d/i);
    expect(o.follow?.label).toBe("Why was I wrong?");
  });
  it("★ a written question: quotes the grader's own faulty step, the same one the overlay opener quotes", () => {
    const o = composeScorecardQuestionOpener(3, written, "Electricity");
    expect(o.text).toContain("Q3 on that Electricity set cost you 2 marks");
    expect(o.text).toContain('Step 2 — "Substitute the values"');
    expect(o.text).toContain("You used 5 instead of 50.");
    expect(o.follow?.send).toBe("Let's go through Q3, step 2: Substitute the values");
  });
  it("a full-mark question says so; nothing is claimed lost", () => {
    const o = composeScorecardQuestionOpener(1, mcqFull, "Real Numbers");
    expect(o.text).toContain("full 1 mark");
    expect(o.text).not.toContain("cost you");
  });
  it("no result (an honest gap): a neutral opener with no marks", () => {
    const o = composeScorecardQuestionOpener(4, null, "Real Numbers");
    expect(o.text).toBe("You asked about Q4 on that Real Numbers set. What would you like to go through?");
    expect(o.follow).toBeUndefined();
  });
});

describe("buildScorecardReturnedWork", () => {
  it("carries the verbatim bank question and only THIS question's digest", () => {
    const w = buildScorecardReturnedWork("A wire of length 50 cm…", written);
    expect(w?.question).toBe("A wire of length 50 cm…");
    expect(w?.steps?.every((s) => s.q === 3)).toBe(true);
    expect(w?.steps?.map((s) => s.n)).toEqual([1, 2]);
  });
  it("a bare MCQ result has no steps — question only", () => {
    expect(buildScorecardReturnedWork("Which option?", mcqLost)).toEqual({ question: "Which option?" });
  });
  it("nothing usable -> null (the ref clears itself)", () => {
    expect(buildScorecardReturnedWork("", null)).toBeNull();
  });
});

describe("buildTutorPath carries the hop as ids only", () => {
  it("adds from= and q=, and leaves every other caller byte-identical", () => {
    const hop = buildTutorPath({ subject: "Maths", topicKey: "real-numbers", source: "scorecard", returnTo: "/practice/10/maths?x=1", questionId: "q-b", from: "QP-1" });
    const q = new URLSearchParams(hop.split("?")[1]);
    expect(q.get("from")).toBe("QP-1");
    expect(q.get("q")).toBe("q-b");
    expect(q.get("source")).toBe("scorecard");
    expect(buildTutorPath({ subject: "Maths", topicKey: "real-numbers", source: "practice" })).toBe(
      "/tutor/10/Maths/real-numbers?source=practice",
    );
  });
});
