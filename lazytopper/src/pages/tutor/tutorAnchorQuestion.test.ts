import { describe, it, expect } from "vitest";
import { buildAnchorQuestion, anchorTargetOf } from "./tutorAnchorQuestion";
import { CHEM_REACTIONS_EXEMPLAR } from "../../data/questionBanks/class10/science/chemicalReactions.exemplar";

/**
 * TUTOR-ANCHOR-KEY-1 (a) - the live defect's question, built from the REAL bank row. Quick Practice Q5 was
 * CHEM-EXMPLR-1-MCQ-002 (NCERT Exemplar Ex 1.1 Q2), keyed "(i) and (iii)" = option C; the tutor never saw the key.
 */
const ROW = CHEM_REACTIONS_EXEMPLAR.find((q) => q.id === "CHEM-EXMPLR-1-MCQ-002")!;

describe("buildAnchorQuestion", () => {
  it("★★ the defect's question carries the FULL stem (not the 180-char opener), 4 lettered options, the key, its letter and the steps", () => {
    const a = buildAnchorQuestion(ROW)!;
    expect(a.id).toBe("CHEM-EXMPLR-1-MCQ-002");
    expect(a.questionText).toBe(ROW.questionText);
    expect(a.questionText.length).toBeGreaterThan(150);
    expect(a.questionText).toContain("(iv) neutralisation reaction"); // the tail a 180-char shortening would cut
    expect(a.options).toEqual(["A. (i) and (iv)", "B. (ii) and (iii)", "C. (i) and (iii)", "D. (iii) and (iv)"]);
    expect(a.answer).toBe("(i) and (iii)");
    expect(a.answerLetter).toBe("C");
    expect(a.solutionSteps).toEqual(ROW.solutionSteps);
    expect(a.finalAnswer).toBe("(i) and (iii) — option (c)");
    expect(a.format).toBe("MCQ");
    expect(a.marks).toBe(1);
  });

  it("carries the student's pick only WITH its verdict", () => {
    expect(buildAnchorQuestion(ROW, { pick: "(iii) and (iv)", correct: false })).toMatchObject({ studentPick: "(iii) and (iv)", verdict: "wrong" });
    expect(buildAnchorQuestion(ROW, { pick: "(i) and (iii)", correct: true })).toMatchObject({ verdict: "right" });
    const noVerdict = buildAnchorQuestion(ROW, { pick: "(iii) and (iv)", correct: null })!;
    expect(noVerdict.studentPick).toBeUndefined();
    expect(noVerdict.verdict).toBeUndefined();
  });

  it("a non-MCQ row keeps its answer and steps and has no options or letter", () => {
    const a = buildAnchorQuestion({ id: "q1", questionText: "Find x.", format: "SA", marks: 3, answer: "x = 4", solutionSteps: ["a", "b", "c"] })!;
    expect(a).toMatchObject({ id: "q1", answer: "x = 4", marks: 3 });
    expect(a.options).toBeUndefined();
    expect(a.answerLetter).toBeUndefined();
  });

  it("no row, or a row with no question text, anchors nothing", () => {
    expect(buildAnchorQuestion(null)).toBeNull();
    expect(buildAnchorQuestion({ id: "q1", questionText: "  " })).toBeNull();
    expect(buildAnchorQuestion({ questionText: "x" })).toBeNull();
  });
});

describe("anchorTargetOf", () => {
  const opener = (meta?: { q: string; pick?: string; correct?: boolean }) => ({ kind: "return-result", meta });
  it("with no opener the URL's q is the question", () => {
    expect(anchorTargetOf([{ kind: "message" }], "q-3")).toEqual({ id: "q-3", pick: null, correct: null });
    expect(anchorTargetOf([], undefined)).toBeNull();
  });
  it("the newest opener decides: its meta (with the tap), or nothing when it names no question", () => {
    expect(anchorTargetOf([opener({ q: "q-3", pick: "x", correct: false })], "q-9")).toEqual({ id: "q-3", pick: "x", correct: false });
    expect(anchorTargetOf([opener({ q: "q-3" }), opener()], "q-3")).toBeNull();
  });
  it("a pick without a verdict is dropped", () => {
    expect(anchorTargetOf([opener({ q: "q-3", pick: "x" })], null)).toEqual({ id: "q-3", pick: null, correct: null });
  });
});
