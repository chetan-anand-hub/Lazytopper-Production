import { describe, it, expect } from "vitest";
import { renameLegacyToolName } from "./tutorLegacyName";
import { buildAnchorQuestion } from "./tutorAnchorQuestion";
import { composeScorecardQuestionOpener, scorecardPickOf, findScorecardQuestion } from "./tutorRoundTrip";
import { returnMetaOf } from "./tutorReturnMeta";
import { buildChapterTestResponse, scoreObjectiveSection } from "../../services/chapterTestGradeService";

/** TUTOR-FIX-1 - (1) the tutor shows the student "Answer Checker", never the old name; (2) a paper MCQ that lost
 *  marks reaches the tutor with its stem, options, key AND the option the student chose. Tutor context only:
 *  no mark moves. */
describe("TUTOR-FIX-1 (1): the old tool name is never shown", () => {
  it("rewrites every spelling of the old name in a displayed tutor turn", () => {
    for (const o of ["Check & Improve", "Check and Improve", "check &amp; improve", "C&I", "CHECK & IMPROVE"]) {
      expect(renameLegacyToolName(`Use ${o} to get it marked.`)).toBe("Use Answer Checker to get it marked.");
    }
  });
  it("leaves the new name, the URL and the offer tag alone", () => {
    expect(renameLegacyToolName("Answer Checker at /check-improve [[offer:check-improve]]")).toBe(
      "Answer Checker at /check-improve [[offer:check-improve]]",
    );
  });
});

const row = {
  id: "CBE-M-RN-A-004",
  questionText: "She has 336 guavas and 54 oranges. How many maximum guests can she invite?",
  format: "MCQ",
  marks: 1,
  options: ["A. 6", "B. 9", "C. 56", "D. 3024"],
  answer: "A. 6",
  finalAnswer: "A. 6",
  solutionSteps: ["[1 mark] HCF(336, 54) = 6. Answer: A."],
};

describe("TUTOR-FIX-1 (2): an MCQ reaches the tutor whole", () => {
  it("anchor: stem, lettered options (no doubled letters), key letter, pick + verdict", () => {
    const a = buildAnchorQuestion(row, { pick: "D. 3024", correct: false })!;
    expect(a.questionText).toContain("336 guavas");
    expect(a.options).toEqual(["A. 6", "B. 9", "C. 56", "D. 3024"]);
    expect(a.answerLetter).toBe("A");
    expect(a.studentPick).toBe("D. 3024");
    expect(a.verdict).toBe("wrong");
  });

  it("anchor: unprefixed options still get their letters", () => {
    const a = buildAnchorQuestion({ ...row, options: ["6", "9", "56", "3024"], answer: "6" })!;
    expect(a.options).toEqual(["A. 6", "B. 9", "C. 56", "D. 3024"]);
    expect(a.answerLetter).toBe("A");
  });

  it("a Chapter Test MCQ row stores the wrong pick, marks unchanged; the scorecard hop turns it into the opener + meta the tutor anchors on", () => {
    const paperQ = (n: number, id: string) => ({
      qNumber: n, id, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1,
      questionText: row.questionText, options: row.options, answer: row.answer,
    });
    const questions = [paperQ(1, "CBE-M-RN-A-004"), paperQ(2, "CBE-M-RN-A-005")];
    const objective = scoreObjectiveSection(questions as never, { 1: "D. 3024", 2: "A. 6" });
    const res = buildChapterTestResponse({
      paper: { worksheetId: "ws1", totalMarks: 2, questions } as never,
      objective,
      subjectiveQuestions: [],
      subjectiveResponse: null,
    });
    const r1 = res.results.find((r) => r.qNumber === 1)!;
    const r2 = res.results.find((r) => r.qNumber === 2)!;
    expect(r1.marksAwarded).toBe(0); // marks exactly as scored: context only
    expect((r1 as { pickedOption?: string }).pickedOption).toBe("D. 3024");
    expect(r2.marksAwarded).toBe(1);
    expect((r2 as { pickedOption?: string }).pickedOption).toBeUndefined(); // right answers carry no pick
    const record = { surface: "chapter-test", questionIds: ["CBE-M-RN-A-004", "CBE-M-RN-A-005"] };
    const hit = findScorecardQuestion(record as never, { response: res } as never, "CBE-M-RN-A-004")!;
    const opener = composeScorecardQuestionOpener(hit.qNumber, hit.result, "Real Numbers");
    expect(opener.text).toContain('You chose "D. 3024"');
    const pick = scorecardPickOf(hit.result)!;
    expect(pick).toEqual({ pick: "D. 3024", correct: false });
    // the meta the opener stores -> the anchor carries the student's pick with its verdict
    const meta = returnMetaOf("CBE-M-RN-A-004", pick.pick, pick.correct)!;
    const anchor = buildAnchorQuestion(row, { pick: meta.pick, correct: meta.correct })!;
    expect(anchor.studentPick).toBe("D. 3024");
    expect(anchor.options).toHaveLength(4);
    expect(anchor.answerLetter).toBe("A");
  });

  it("an unanswered MCQ carries no pick (not attempted is not a wrong tap)", () => {
    const questions = [{ qNumber: 1, id: "x", subject: "Maths", topicKey: "t", topicLabel: "T", section: "A", marks: 1, questionText: "q", options: ["A. 1", "B. 2"], answer: "A. 1" }];
    const res = buildChapterTestResponse({
      paper: { worksheetId: "w", totalMarks: 1, questions } as never,
      objective: scoreObjectiveSection(questions as never, {}),
      subjectiveQuestions: [],
      subjectiveResponse: null,
    });
    expect((res.results[0] as { pickedOption?: string }).pickedOption).toBeUndefined();
  });
});
