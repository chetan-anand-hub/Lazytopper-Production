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
      expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
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
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.annotatedSteps[0].marksDeducted).toBe(2);
  });
});
