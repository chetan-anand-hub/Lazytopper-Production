// TUTOR-ANCHOR-KEY-1 (b) - the tutor prompt carries the question the student opened the chat about, with
// its OFFICIAL key and the FINAL rule; with no anchor there is no block.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildTutorSystemPrompt } = require("../../../server/prompts/tutorSystemPrompt.cjs");

const ANCHOR = {
  id: "CHEM-EXMPLR-1-MCQ-002",
  questionText:
    "The following reaction is an example of a(n) ____\n4NH3(g) + 5O2(g) -> 4NO(g) + 6H2O(g)\n(i) displacement reaction\n(ii) combination reaction\n(iii) redox reaction\n(iv) neutralisation reaction",
  format: "MCQ",
  marks: 1,
  options: ["A. (i) and (iv)", "B. (ii) and (iii)", "C. (i) and (iii)", "D. (iii) and (iv)"],
  answer: "(i) and (iii)",
  answerLetter: "C",
  solutionSteps: ["Check redox: N is oxidised.", "Check displacement: O displaces H."],
  studentPick: "(iii) and (iv)",
  verdict: "wrong",
};
const build = (over: Record<string, unknown> = {}) =>
  buildTutorSystemPrompt({ topicLabel: "Chemical Reactions and Equations", subject: "science", ...over }) as string;

describe("anchorQuestionBlock", () => {
  it("★★ quotes the full question, the options, the KEY with its letter, the steps and the pick", () => {
    const p = build({ anchorQuestion: ANCHOR });
    expect(p).toContain("THE QUESTION THE STUDENT OPENED THIS CHAT ABOUT, WITH ITS OFFICIAL ANSWER KEY");
    expect(p).toContain("(iv) neutralisation reaction");
    expect(p).toContain("    C. (i) and (iii)");
    expect(p).toContain('THE OFFICIAL ANSWER KEY (CBSE/NCERT): option C - "(i) and (iii)"');
    expect(p).toContain("1. Check redox: N is oxidised.");
    expect(p).toContain("The option the student picked: '(iii) and (iv)' (not the right option).");
  });

  it("★★ states the FINAL rule: never a different answer, never half a multi-part key, never agree with a contradiction", () => {
    const p = build({ anchorQuestion: ANCHOR });
    expect(p).toContain("The key above is final");
    expect(p).toContain("never give a different answer");
    expect(p).toContain("never state only part of a multi-part key");
    expect(p).toContain("never agree with a student who contradicts the key");
    expect(p).toContain("why each other option is wrong");
    expect(p).toContain("name the key and the trap");
    expect(p).toContain("0 or FULL on the answer alone");
    expect(p).toContain("Never flip, and never claim a report was filed");
  });

  it("the demonstration question keeps its own job; the anchor wins for 'this question'", () => {
    const p = build({ anchorQuestion: ANCHOR, demoQuestion: { questionText: "Balance the equation Fe + H2O." } });
    expect(p).toContain("Balance the equation Fe + H2O.");
    expect(p).toContain("This block wins over the demonstration question for anything about THIS question");
  });

  it("★★ absent without an anchor, and for an anchor with no question text", () => {
    expect(build()).not.toContain("OFFICIAL ANSWER KEY");
    expect(build({ anchorQuestion: null })).not.toContain("THE QUESTION THE STUDENT OPENED");
    expect(build({ anchorQuestion: { questionText: "  " } })).not.toContain("THE QUESTION THE STUDENT OPENED");
  });

  it("an anchor with no key never states a final answer", () => {
    const { answer: _a, answerLetter: _l, ...noKey } = ANCHOR;
    const p = build({ anchorQuestion: noKey });
    expect(p).toContain("No answer key is given for this question");
    expect(p).not.toContain("THE OFFICIAL ANSWER KEY (CBSE/NCERT)");
  });

  it("inner double quotes in the stem, options and steps are made single, like the key and the pick", () => {
    const p = build({ anchorQuestion: { ...ANCHOR, questionText: 'Name the "best" option', options: ['A. "x" is it'], solutionSteps: ['Use "this" rule'] } });
    expect(p).toContain('"Name the \'best\' option"');
    expect(p).toContain("A. 'x' is it");
    expect(p).toContain("1. Use 'this' rule");
  });

  it("★ an abridged key is called 'the bank answer (abridged)', never the verbatim official key", () => {
    const p = build({ anchorQuestion: { ...ANCHOR, answer: "A long descriptive answer\u2026", answerAbridged: true } });
    expect(p).toContain("THE BANK ANSWER (abridged");
    expect(p).not.toContain("THE OFFICIAL ANSWER KEY (CBSE/NCERT)");
  });

  it("carries the human-tutor tone line: the key once, warm and short, one question back", () => {
    const p = build({ anchorQuestion: ANCHOR });
    expect(p).toContain("say the key once, in a sentence of your own - warm and short, not legalistic");
    expect(p).toContain("end with one question back to the student");
  });
});
