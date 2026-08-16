// @vitest-environment node
//
// Worksheet-path no-working honesty guard (MI integrity) — the port of #301 into
// the SEPARATE worksheet grader (gradeStructuredSet -> normaliseStructuredResult),
// which never received rule 7 / the guard / the adjusted reconcile.
//
// These tests drive the REAL worksheet route (handleGradeWorksheet) with a MOCKED
// callGemini returning a canned whole-worksheet grade, and assert on the normalised
// per-question result. No live LLM, no Firebase, no network.
//
// STEP-0 ground truth baked into case (b): a wrong MCQ has studentWork = the chosen
// option letter "(d)" (NON-EMPTY), so the empty-working guard cannot fire on it —
// MCQ honesty rides on prompt rule 5 (the worksheet's rule 7 analog), not the guard.
import { describe, expect, it } from "vitest";
import { createCheckSolutionRoute } from "../../server/routes/checkSolution.cjs";
import { extractJsonObjectFromText } from "../../server/services/httpUtils.cjs";

// A minimal VALID base64 body so the (stubbed) image check passes shape-wise.
const PDF_B64 = Buffer.from("%PDF-1.4\nminimal\n%%EOF").toString("base64");

function buildRoute(cannedWorksheetGrade: unknown) {
  let captured: { status: number; body: any } | null = null;
  let currentPayload: unknown = null;
  const deps = {
    sendJson: (_res: unknown, status: number, body: any) => {
      captured = { status, body };
    },
    readJson: async () => currentPayload,
    callGemini: async () => ({ text: JSON.stringify(cannedWorksheetGrade), raw: {} }),
    GEMINI_MODEL: "test-model",
    ACTIVE_PROVIDER: "test",
    isStubMode: () => false,
    extractJsonObjectFromText,
    buildGeminiImagePart: () => ({}),
    validateMentorImagePayload: () => ({ ok: true }),
  };
  const { handleGradeWorksheet } = createCheckSolutionRoute(deps as never);
  return {
    run: async (payload: unknown) => {
      currentPayload = payload;
      await handleGradeWorksheet({} as never, {} as never);
      if (!captured) throw new Error("route did not send a response");
      return captured as { status: number; body: any };
    },
  };
}

const basePayload = (questions: unknown[]) => ({
  worksheetId: "t",
  imageBase64: PDF_B64,
  imageMimeType: "application/pdf",
  questions,
});

// One-question worksheet helper.
const oneQ = (marks: number) => [
  { qNumber: 1, marks, topic: "t", topicLabel: "T", questionText: "Q1?" },
];
const oneResult = (annotatedSteps: unknown[], mistakeSummary: unknown) => ({
  results: [
    { qNumber: 1, couldNotRead: false, marksAwarded: 0, annotatedSteps, mistakeSummary, teacherNote: "x" },
  ],
  summary: "s",
});

describe("worksheet grader: no-working honesty (port of #301)", () => {
  // (a) empty / whitespace / absent studentWork on an incorrect step -> null + 0 buckets
  const noWorkingShapes: Array<{ name: string; step: Record<string, unknown> }> = [
    { name: "empty string", step: { studentWork: "" } },
    { name: "whitespace-only", step: { studentWork: "  \n\t " } },
    { name: "absent/undefined", step: {} },
  ];
  for (const shape of noWorkingShapes) {
    it(`(a) no working (${shape.name}) -> mistakeType null, 0 buckets, attempt preserved`, async () => {
      const grade = oneResult(
        [{
          description: "ans", status: "incorrect", marksAwarded: 0, marksDeducted: 2,
          teacherAnnotation: "x", mistakeType: "conceptual", correctedWorking: null, ...shape.step,
        }],
        { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      );
      const { body } = await buildRoute(grade).run(basePayload(oneQ(2)));
      const r = body.results[0];
      expect(r.annotatedSteps[0].studentWork).toBe("");
      expect(r.annotatedSteps[0].mistakeType).toBeNull();
      // class 3b — `departure` ADDED; the other four counters are unmoved.
      expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
      // Attempt preserved.
      expect(r.annotatedSteps[0].status).toBe("incorrect");
      expect(r.annotatedSteps[0].marksAwarded).toBe(0);
      expect(r.annotatedSteps[0].marksDeducted).toBe(2);
      expect(r.totalMarks).toBe(2);
      expect(r.marksAwarded).toBe(0);
    });
  }

  // (b) THE REAL MCQ CASE (STEP 0). Two halves:
  //  (b1) when the model OBEYS rule 5, a wrong MCQ option "(d)" comes back mistakeType
  //       null and flows through as no-conceptual.
  it("(b1) wrong MCQ '(d)' tagged null by a rule-5-compliant model -> no conceptual", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "(d)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "wrong option",
        mistakeType: null, correctedWorking: "Snell's law",
      }],
      { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(oneQ(1)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    expect(r.mistakeSummary.conceptual).toBe(0);
  });

  //  (b2) RESIDUAL (documented): the deterministic guard does NOT fire on a wrong MCQ
  //       option because studentWork "(d)" is non-empty. So a model that IGNORES rule 5
  //       and tags "(d)" conceptual is NOT corrected by the guard — MCQ honesty rides
  //       on prompt rule 5, not this guard. This asserts the known limit on purpose.
  it("(b2) wrong MCQ '(d)' tagged conceptual by a rule-5-IGNORING model -> guard does NOT null it (rides on rule 5)", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "(d)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "wrong option",
        mistakeType: "conceptual", correctedWorking: "Snell's law",
      }],
      { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(oneQ(1)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBe("conceptual"); // non-empty option -> guard inert
    expect(r.mistakeSummary.conceptual).toBe(1);
  });

  // (c) worked wrong step keeps its type AND its marks.
  it("(c) worked wrong step -> keeps type and marks", async () => {
    const grade = oneResult(
      [{
        description: "method", studentWork: "used F=ma here (wrong)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 2, teacherAnnotation: "wrong method",
        mistakeType: "conceptual", correctedWorking: "...",
      }],
      { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, // model under-reports
    );
    const { body } = await buildRoute(grade).run(basePayload(oneQ(2)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBe("conceptual");
    expect(r.mistakeSummary.conceptual).toBe(1); // floor protects it
    expect(r.annotatedSteps[0].marksAwarded).toBe(0);
    expect(r.annotatedSteps[0].marksDeducted).toBe(2);
  });

  // (d) rawSummary leak: empty no-working step tagged conceptual AND mistakeSummary.conceptual:1
  //     -> final bucket 0 (guard nulls the step; rawAdjusted subtracts the leaked count).
  it("(d) rawSummary leak on a no-working step -> final bucket 0", async () => {
    const grade = oneResult(
      [{
        description: "ans", studentWork: "", status: "incorrect", marksAwarded: 0,
        marksDeducted: 2, teacherAnnotation: "x", mistakeType: "conceptual", correctedWorking: null,
      }],
      { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(oneQ(2)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    // class 3b — `departure` ADDED; the other four counters are unmoved.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.annotatedSteps[0].marksDeducted).toBe(2);
  });
});

// Deterministic OBJECTIVE (MCQ / AR / Section A) honesty — the residual #302's (b2)
// documented now CLOSED. The client carries `section`, so a wrong MCQ "(d)" is nulled
// by the guard REGARDLESS of its non-empty studentWork. Same harness, same canonical
// isObjectiveType classifier the server reuses (no fork).
describe("worksheet grader: objective (MCQ/AR) deterministic honesty", () => {
  // A Section-A objective question (MCQ) — section drives isObjectiveType.
  const objQ = (marks: number) => [
    { qNumber: 1, marks, section: "A", format: "MCQ", topic: "t", topicLabel: "T", questionText: "Q1?" },
  ];
  // A subjective question (no objective signal) — section is a worked band.
  const subjQ = (marks: number) => [
    { qNumber: 1, marks, section: "C", topic: "t", topicLabel: "T", questionText: "Q1?" },
  ];

  // (e) THE FIX: a wrong MCQ option "(d)" (non-empty studentWork) on a Section-A
  //     question -> mistakeType nulled DETERMINISTICALLY, 0 buckets, marks still lost,
  //     attempt still recorded. This is exactly #302's (b2) residual, now closed.
  it("(e) wrong MCQ '(d)' on a Section-A question -> mistakeType null deterministically, marks lost", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "(d)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "wrong option",
        mistakeType: "conceptual", correctedWorking: "Snell's law",
      }],
      { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(objQ(1)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBeNull(); // objective -> deterministically nulled
    // class 3b — `departure` ADDED; the other four counters are unmoved.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
    // Mark still lost at the QUESTION level; attempt still recorded. Per-step marks are
    // now STRIPPED for objective questions (steps carry no marks — the whole-question
    // clamp owns the 0/full verdict), so marksDeducted is 0 at the step.
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.annotatedSteps[0].marksAwarded).toBe(0);
    expect(r.annotatedSteps[0].marksDeducted).toBe(0);
    expect(r.totalMarks).toBe(1);
    expect(r.marksAwarded).toBe(0);
  });

  // (f) leak closed for MCQ too: wrong MCQ "(d)" + model self-reports conceptual:1 in
  //     mistakeSummary -> final bucket 0 (rawAdjusted subtracts the nulled count).
  it("(f) wrong MCQ '(d)' + model self-reports conceptual:1 -> final bucket 0", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "(d)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "wrong option",
        mistakeType: "conceptual", correctedWorking: "Snell's law",
      }],
      { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(objQ(1)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    // class 3b — `departure` ADDED; the other four counters are unmoved.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
  });

  // (g) REGRESSION: a wrong SUBJECTIVE worked answer must STILL keep its real type and
  //     marks — the objective guard must NOT touch non-objective questions.
  it("(g) wrong subjective worked answer -> keeps real type and marks (objective guard inert)", async () => {
    const grade = oneResult(
      [{
        description: "method", studentWork: "used F=ma here (wrong)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 3, teacherAnnotation: "wrong method",
        mistakeType: "conceptual", correctedWorking: "...",
      }],
      { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, // model under-reports
    );
    const { body } = await buildRoute(grade).run(basePayload(subjQ(3)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBe("conceptual"); // subjective -> guard inert
    expect(r.mistakeSummary.conceptual).toBe(1); // floor protects it
    expect(r.annotatedSteps[0].marksAwarded).toBe(0);
    expect(r.annotatedSteps[0].marksDeducted).toBe(3);
  });
});

// Deterministic MCQ scoring via the SHARED objective clamp. When the question carries
// an answer key (the bank `answer` = option text + `options`, OR a legacy `correctOption`
// letter) the server OVERRIDES the model on a normalised compare (so "(a)", "A", "a" all
// match) — trusting the deterministic compare over model judgment. Objective steps carry
// NO marks (stripped); the whole-question verdict is 0/full. With NO key the clamp still
// runs off the model's binary verdict. Same harness, same canonical isObjectiveType.
describe("worksheet grader: deterministic MCQ scoring (correctOption)", () => {
  // A Section-A MCQ carrying the canonical correct option letter.
  const objQWithKey = (marks: number, correctOption: string) => [
    { qNumber: 1, marks, section: "A", format: "MCQ", correctOption,
      topic: "t", topicLabel: "T", questionText: "Q1?" },
  ];
  // Same MCQ with NO key — the deterministic path must stay inert.
  const objQNoKey = (marks: number) => [
    { qNumber: 1, marks, section: "A", format: "MCQ", topic: "t", topicLabel: "T", questionText: "Q1?" },
  ];

  // (h) correctOption present + student wrote the CORRECT letter -> status correct, full
  //     marks, mistakeType null. The model UNDER-awarded (said incorrect, 0 marks); the
  //     deterministic compare overrides it. Mixed-case "A" vs key "(a)" still matches.
  it("(h) correct pick -> overridden to correct + full marks (model under-award ignored)", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "A", status: "incorrect",
        marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "model thought wrong",
        mistakeType: null, correctedWorking: null,
      }],
      { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(objQWithKey(1, "(a)")));
    const r = body.results[0];
    expect(r.annotatedSteps[0].status).toBe("correct");
    // Per-step marks are stripped for objective questions; the whole-question verdict
    // (r.marksAwarded === totalMarks) carries the mark.
    expect(r.annotatedSteps[0].marksAwarded).toBe(0);
    expect(r.annotatedSteps[0].marksDeducted).toBe(0);
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    expect(r.marksAwarded).toBe(1);
    expect(r.totalMarks).toBe(1);
  });

  // (i) correctOption present + student wrote the WRONG letter -> status incorrect, 0
  //     marks, mistakeType null. The model OVER-awarded (said correct, full marks); the
  //     deterministic compare overrides it, then the objective guard nulls the type.
  it("(i) wrong pick -> overridden to incorrect + 0 marks, mistakeType null", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "(b)", status: "correct",
        marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "model thought right",
        mistakeType: null, correctedWorking: null,
      }],
      { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(objQWithKey(1, "(a)")));
    const r = body.results[0];
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.annotatedSteps[0].marksAwarded).toBe(0);
    // Per-step marks stripped for objective questions (whole-question clamp owns the verdict).
    expect(r.annotatedSteps[0].marksDeducted).toBe(0);
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    expect(r.marksAwarded).toBe(0);
  });

  // (j) NO KEY (section A, no answer/correctOption): the deterministic clamp STILL runs
  //     for an objective question — with no key it takes the MODEL's binary verdict
  //     (wrong here), strips per-step marks and aligns status; the guard then nulls the
  //     fabricated type. A wrong MCQ "(d)" the model tagged conceptual ends 0 marks, null.
  it("(j) objective, NO answer key -> model binary verdict clamped 0/full, type nulled", async () => {
    const grade = oneResult(
      [{
        description: "chosen option", studentWork: "(d)", status: "incorrect",
        marksAwarded: 0, marksDeducted: 1, teacherAnnotation: "wrong option",
        mistakeType: "conceptual", correctedWorking: "Snell's law",
      }],
      { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    );
    const { body } = await buildRoute(grade).run(basePayload(objQNoKey(1)));
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBeNull(); // objective guard nulls the bare pick's type
    // class 3b — `departure` ADDED; the other four counters are unmoved.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
    expect(r.annotatedSteps[0].status).toBe("incorrect"); // model's binary verdict was incorrect
    expect(r.annotatedSteps[0].marksAwarded).toBe(0);
    expect(r.annotatedSteps[0].marksDeducted).toBe(0); // per-step marks stripped for objective
  });
});
