// @vitest-environment node
//
// Grader no-working honesty guard (MI integrity).
//
// A WRONG final answer shown with NO working is undiagnosable — the grader must
// record the answer (status "incorrect") and its marks, but must NOT guess a
// mistakeType. This test drives the real `handleCheckSolution` route with a
// MOCKED callGemini (no live LLM, no Firebase, no network) and asserts the
// invariant holds end-to-end after the deterministic guard runs.
//
// Why the canned `mistakeSummary` is all zeros: the server's additive-floor
// reconcile takes max(model's self-reported summary, per-step type count). The
// model "frequently leaves the four counters at 0" (that is exactly why the
// floor exists), so the per-step `mistakeType` is the only live signal — and the
// guard's nulling of the no-working step is what keeps it out of every bucket.
import { describe, expect, it } from "vitest";
// CJS route module (.cjs) imported into the ESM test via Vite interop.
import { createCheckSolutionRoute } from "../../server/routes/checkSolution.cjs";

// Minimal deps so the route runs deterministically offline. callGemini returns a
// canned grade; extractJsonObjectFromText just parses it; stub mode is OFF so the
// real grading/normalization path (including the guard) executes.
function buildRoute(cannedGrade: unknown) {
  let captured: { status: number; body: any } | null = null;
  const deps = {
    sendJson: (_res: unknown, status: number, body: any) => {
      captured = { status, body };
    },
    readJson: async (req: unknown) => req, // we pass the payload AS the request
    callGemini: async () => ({ text: JSON.stringify(cannedGrade), raw: {} }),
    GEMINI_MODEL: "test-model",
    ACTIVE_PROVIDER: "test",
    isStubMode: () => false,
    extractJsonObjectFromText: (t: string) => JSON.parse(t),
    buildGeminiImagePart: () => ({}), // unused on the text path
    validateMentorImagePayload: () => ({ ok: true }), // unused on the text path
  };
  const { handleCheckSolution } = createCheckSolutionRoute(deps as never);
  return {
    run: async (payload: unknown) => {
      await handleCheckSolution(payload as never, {} as never);
      if (!captured) throw new Error("route did not send a response");
      return captured as { status: number; body: any };
    },
  };
}

const payload = {
  question: "Find the zeroes of x^2 - 2x - 8.",
  marks: 5,
  subject: "Maths",
  textAnswer: "see my work",
};

describe("grader no-working guard: a bare wrong answer is undiagnosable, not conceptual", () => {
  // Two of the three steps are typed "conceptual" by the model and differ ONLY in
  // whether working is shown — the control HAS working, the no-working step does
  // not. The guard must null the no-working one and leave the control untouched.
  const cannedGrade = {
    totalMarks: 5,
    marksAwarded: 1,
    annotatedSteps: [
      {
        stepNumber: 1,
        description: "States the method",
        studentWork: "Factorise x^2 - 2x - 8",
        status: "correct",
        marksAwarded: 1,
        marksDeducted: 0,
        teacherAnnotation: "OK",
        mistakeType: null,
        correctedWorking: null,
      },
      {
        // CONTROL: wrong WITH working, model typed conceptual -> must be KEPT.
        stepNumber: 2,
        description: "Finds the roots (working shown)",
        studentWork: "reads coefficients: roots are 2 and 8",
        status: "incorrect",
        marksAwarded: 0,
        marksDeducted: 2,
        teacherAnnotation: "wrong method",
        mistakeType: "conceptual",
        correctedWorking: "(x-4)(x+2)=0 -> x=4, x=-2",
      },
      {
        // NO-WORKING: wrong with EMPTY studentWork, model fabricated conceptual ->
        // must be NULLED, but the attempt (status + marks) must persist.
        stepNumber: 3,
        description: "Final answer (no working)",
        studentWork: "",
        status: "incorrect",
        marksAwarded: 0,
        marksDeducted: 2,
        teacherAnnotation: "wrong",
        mistakeType: "conceptual",
        correctedWorking: null,
      },
    ],
    // Realistic: the model leaves its own tally at 0 (the additive-floor case).
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "Show your working so each step can be marked.",
  };

  it("(a) no-working wrong step -> mistakeType null and contributes 0 to every bucket", async () => {
    const { body } = await buildRoute(cannedGrade).run(payload);
    const steps = body.annotatedSteps;

    // The no-working step's type is suppressed.
    expect(steps[2].studentWork).toBe("");
    expect(steps[2].mistakeType).toBeNull();

    // It contributes 0 to every bucket: only the CONTROL conceptual survives, so
    // the bucket is 1 (not 2). Had the guard not fired, both would count -> 2.
    expect(body.mistakeSummary).toEqual({
      conceptual: 1,
      calculation: 0,
      silly: 0,
      presentation: 0,
    });
  });

  it("(b) the no-working wrong step still RECORDS fully — status, marks and totals unchanged", async () => {
    const { body } = await buildRoute(cannedGrade).run(payload);
    const steps = body.annotatedSteps;

    // The attempt is never dropped with the type: the mark is determinable.
    expect(steps[2].status).toBe("incorrect");
    expect(steps[2].marksAwarded).toBe(0);
    expect(steps[2].marksDeducted).toBe(2);

    // Totals are exactly as graded — the guard touches only the type.
    expect(body.totalMarks).toBe(5);
    expect(body.marksAwarded).toBe(1); // sum of step marksAwarded (1 + 0 + 0), capped at 5
    expect(body.percentage).toBe(20); // round(1/5*100)
  });

  it("(c) control: a wrong step WITH working keeps its type AND its marks", async () => {
    const { body } = await buildRoute(cannedGrade).run(payload);
    const steps = body.annotatedSteps;

    expect(steps[1].mistakeType).toBe("conceptual");
    expect(steps[1].status).toBe("incorrect");
    expect(steps[1].marksAwarded).toBe(0);
    expect(steps[1].marksDeducted).toBe(2);
  });

  // Guard-breadth: the no-working signal can arrive as an empty string,
  // whitespace-only, OR (the real MCQ defect) a studentWork key that is entirely
  // ABSENT/undefined on the raw step. Each must null the type while preserving the
  // attempt. Parameterised so all three "no working" shapes are proven on an
  // incorrect step.
  const noWorkingShapes: Array<{ name: string; step: Record<string, unknown> }> = [
    { name: "empty string", step: { studentWork: "" } },
    { name: "whitespace-only", step: { studentWork: "   \n\t  " } },
    { name: "absent/undefined (wrong MCQ option, no working)", step: {} },
  ];

  for (const shape of noWorkingShapes) {
    it(`no working (${shape.name}) on an incorrect step -> mistakeType null, 0 buckets, attempt preserved`, async () => {
      const grade = {
        totalMarks: 2,
        marksAwarded: 0,
        annotatedSteps: [
          {
            stepNumber: 1,
            description: "Final answer / chosen option",
            status: "incorrect",
            marksAwarded: 0,
            marksDeducted: 2,
            teacherAnnotation: "wrong",
            mistakeType: "conceptual", // model fabricated a type
            correctedWorking: null,
            ...shape.step, // injects (or omits) studentWork
          },
        ],
        mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        teacherNote: "Show your working.",
      };
      const { body } = await buildRoute(grade).run({ ...payload, marks: 2 });
      const s = body.annotatedSteps[0];

      // Normalised to an empty trimmed string regardless of the raw shape.
      expect(s.studentWork).toBe("");
      // Type suppressed; 0 buckets.
      expect(s.mistakeType).toBeNull();
      expect(body.mistakeSummary).toEqual({
        conceptual: 0,
        calculation: 0,
        silly: 0,
        presentation: 0,
      });
      // Attempt preserved: status + marks + totals unchanged.
      expect(s.status).toBe("incorrect");
      expect(s.marksAwarded).toBe(0);
      expect(s.marksDeducted).toBe(2);
      expect(body.totalMarks).toBe(2);
      expect(body.marksAwarded).toBe(0);
    });
  }
});
