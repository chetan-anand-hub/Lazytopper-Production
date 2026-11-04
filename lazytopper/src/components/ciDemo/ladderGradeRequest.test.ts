/**
 * ONE-MINUTE-1 R2 step 2 — the bank-seeded confirm must send the grader the SAME request a detect-confirmed run sends.
 * For each CI-SOFT-1 sample the test builds (a) the request after "Read the question" (the /detect-question answer
 * simulated with the row's own marks, subject and chapter, through buildConfirmedDetection and a detect `questions`
 * entry) and (b) the request after the ladder's seed, and asserts every field the grader reads is equal, with no extra field.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildConfirmedDetection } from "../../utils/checkImproveDetection";
import { CI_DEMO_SAMPLES } from "./ciDemoSamples";
import { buildSingleGradeRequest, detectedKeyFields, seedConfirmedFromBank } from "./ladderGradeRequest";

const TYPED = "Step 1: use the formula. Step 2: substitute. Step 3: the answer is 5 cm.";

describe("ladder grade request equals the detect-confirmed one", () => {
  for (const smp of Object.values(CI_DEMO_SAMPLES)) {
    it(`${smp.key} (${smp.bankId})`, () => {
      const text = `${smp.questionText} [${smp.marks}]`;
      // (a) detect-then-confirm, as handleReadQuestion builds it.
      const detectResponse = { detectedMarks: smp.marks, detectedSubject: smp.subject, detectedTopic: smp.topicKey, marksSource: "stated" as const };
      const confirmedByDetect = buildConfirmedDetection(detectResponse, text);
      const detectedQuestions = [{ questionNumber: 1, questionText: smp.questionText, marks: smp.marks }];
      const viaDetect = buildSingleGradeRequest({
        question: text,
        confirmed: confirmedByDetect,
        firstDetected: detectedQuestions[0] as { objective?: boolean; answer?: string | null },
        freeCall: false,
        answerPart: { textAnswer: TYPED },
      });
      // (b) the ladder's bank seed: no detect call, no detected questions.
      const viaSeed = buildSingleGradeRequest({
        question: text,
        confirmed: seedConfirmedFromBank({ marks: smp.marks, subject: smp.subject, topicKey: smp.topicKey, questionText: smp.questionText }),
        firstDetected: null,
        freeCall: false,
        answerPart: { textAnswer: TYPED },
      });
      expect(viaSeed).toEqual(viaDetect);
      expect(Object.keys(viaSeed).sort()).toEqual(["marks", "question", "subject", "textAnswer", "topic"]);
      expect(viaSeed.marks).toBe(2);
      expect(viaSeed.subject).toBe(smp.subject);
      expect(viaSeed.topic).not.toBe(""); // a real chapter name, not a full-subject filing
    });
  }

  it("the signed-out free check sends the same shape (the key is a paid-call field only)", () => {
    const smp = CI_DEMO_SAMPLES.circ;
    const confirmed = seedConfirmedFromBank({ marks: smp.marks, subject: smp.subject, topicKey: smp.topicKey, questionText: smp.questionText });
    const free = buildSingleGradeRequest({ question: "q", confirmed, firstDetected: null, freeCall: true, answerPart: { textAnswer: TYPED } });
    const paid = buildSingleGradeRequest({ question: "q", confirmed, firstDetected: null, freeCall: false, answerPart: { textAnswer: TYPED } });
    expect(free).toEqual(paid);
  });

  it("an objective detect adds its flag and key, now WITH the key's source (MCQ-KEY-TRUST-1)", () => {
    const confirmed = { subject: "Science" as const, topicName: "Electricity", marks: 1 };
    // An unlabelled detect key (a read from before MCQ-KEY-TRUST-1) is sent as "derived".
    const d = { objective: true, answer: "(b)" };
    expect(buildSingleGradeRequest({ question: "q", confirmed, firstDetected: d, freeCall: false, answerPart: { textAnswer: "b" } })).toEqual({
      question: "q", subject: "Science", topic: "Electricity", marks: 1, objective: true, answer: "(b)", answerSource: "derived", textAnswer: "b",
    });
    expect(buildSingleGradeRequest({ question: "q", confirmed, firstDetected: { ...d, answerSource: "printed" as const }, freeCall: false, answerPart: { textAnswer: "b" } })).toEqual({
      question: "q", subject: "Science", topic: "Electricity", marks: 1, objective: true, answer: "(b)", answerSource: "printed", textAnswer: "b",
    });
    expect(buildSingleGradeRequest({ question: "q", confirmed, firstDetected: { ...d, answerSource: "derived" as const }, freeCall: false, answerPart: { textAnswer: "b" } })).toEqual({
      question: "q", subject: "Science", topic: "Electricity", marks: 1, objective: true, answer: "(b)", answerSource: "derived", textAnswer: "b",
    });
    expect(buildSingleGradeRequest({ question: "q", confirmed, firstDetected: d, freeCall: true, answerPart: { textAnswer: "b" } })).toEqual({
      question: "q", subject: "Science", topic: "Electricity", marks: 1, objective: true, textAnswer: "b",
    });
  });

  it("the page builds BOTH grade paths' single request through this one function (no second copy)", () => {
    const page = readFileSync(resolve(__dirname, "../../pages/desktop/DesktopCheckImprovePage.tsx"), "utf8");
    expect(page).toContain("buildSingleGradeRequest({");
    expect(page).toContain("seedConfirmedFromBank(");
  });

  it("MCQ-KEY-TRUST-1: the multi-question path sends detect keys through the SAME helper (no second copy)", () => {
    const page = readFileSync(resolve(__dirname, "../../pages/desktop/DesktopCheckImprovePage.tsx"), "utf8");
    expect(page).toContain("...detectedKeyFields(q, Boolean(freeCallOpts)),");
    expect(page).not.toContain("? { answer: q.answer } : {}");
  });

  it("MCQ-KEY-TRUST-1: detectedKeyFields sends no key on a free call, a non-objective, or a keyless read", () => {
    expect(detectedKeyFields({ objective: true, answer: "c", answerSource: "derived" }, true)).toEqual({});
    expect(detectedKeyFields({ objective: false, answer: "c" }, false)).toEqual({});
    expect(detectedKeyFields({ objective: true, answer: null }, false)).toEqual({});
    expect(detectedKeyFields(undefined, false)).toEqual({});
    expect(detectedKeyFields({ objective: true, answer: "c", answerSource: "printed" }, false)).toEqual({ answer: "c", answerSource: "printed" });
    expect(detectedKeyFields({ objective: true, answer: "c" }, false)).toEqual({ answer: "c", answerSource: "derived" });
  });
});
