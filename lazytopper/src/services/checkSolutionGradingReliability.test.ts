// @vitest-environment node
//
// Grading-reliability PR — temperature + couldNotRead-exception + word-problem
// closure rule, applied to BOTH grading paths (handleCheckSolution and
// gradeStructuredSet via handleGradeWorksheet).
//
// These tests CAPTURE the (model, contents, genConfig) actually passed to
// callGemini and assert on the genConfig.temperature and on the prompt text. They
// drive the REAL routes with a MOCKED callGemini — no live LLM, no Firebase, no
// network. A separate (e) block re-asserts the pre-existing honesty invariants are
// untouched (these changes are additive: prompt + config only, no logic change).
import { describe, expect, it } from "vitest";
import { createCheckSolutionRoute } from "../../server/routes/checkSolution.cjs";
import { extractJsonObjectFromText } from "../../server/services/httpUtils.cjs";

// A minimal VALID base64 body so the (stubbed) image check passes shape-wise.
const PDF_B64 = Buffer.from("%PDF-1.4\nminimal\n%%EOF").toString("base64");

// ── handleCheckSolution harness (text path) ───────────────────────────────────
// Captures the genConfig + the prompt text passed to callGemini on each call.
function buildCheckRoute(cannedGrade: unknown) {
  const calls: Array<{ genConfig: any; prompt: string }> = [];
  let captured: { status: number; body: any } | null = null;
  const deps = {
    sendJson: (_res: unknown, status: number, body: any) => {
      captured = { status, body };
    },
    readJson: async (req: unknown) => req, // payload passed AS the request
    callGemini: async (_model: unknown, contents: any, genConfig: any) => {
      calls.push({ genConfig, prompt: String(contents?.[0]?.parts?.[0]?.text || "") });
      return { text: JSON.stringify(cannedGrade), raw: {} };
    },
    GEMINI_MODEL: "test-model",
    ACTIVE_PROVIDER: "test",
    isStubMode: () => false,
    extractJsonObjectFromText: (t: string) => JSON.parse(t),
    buildGeminiImagePart: () => ({}),
    validateMentorImagePayload: () => ({ ok: true }),
  };
  const { handleCheckSolution } = createCheckSolutionRoute(deps as never);
  return {
    calls,
    run: async (payload: unknown) => {
      await handleCheckSolution(payload as never, {} as never);
      if (!captured) throw new Error("route did not send a response");
      return captured as { status: number; body: any };
    },
  };
}

// ── handleGradeWorksheet harness (PDF path → gradeStructuredSet) ───────────────
function buildWorksheetRoute(cannedWorksheetGrade: unknown) {
  const calls: Array<{ genConfig: any; prompt: string }> = [];
  let captured: { status: number; body: any } | null = null;
  let currentPayload: unknown = null;
  const deps = {
    sendJson: (_res: unknown, status: number, body: any) => {
      captured = { status, body };
    },
    readJson: async () => currentPayload,
    callGemini: async (_model: unknown, contents: any, genConfig: any) => {
      calls.push({ genConfig, prompt: String(contents?.[0]?.parts?.[0]?.text || "") });
      return { text: JSON.stringify(cannedWorksheetGrade), raw: {} };
    },
    GEMINI_MODEL: "test-model",
    ACTIVE_PROVIDER: "test",
    isStubMode: () => false,
    extractJsonObjectFromText,
    buildGeminiImagePart: () => ({}),
    validateMentorImagePayload: () => ({ ok: true }),
  };
  const { handleGradeWorksheet } = createCheckSolutionRoute(deps as never);
  return {
    calls,
    run: async (payload: unknown) => {
      currentPayload = payload;
      await handleGradeWorksheet({} as never, {} as never);
      if (!captured) throw new Error("route did not send a response");
      return captured as { status: number; body: any };
    },
  };
}

// Minimal canned grades so each route parses and proceeds to send a response.
const oneStepGrade = {
  totalMarks: 3,
  marksAwarded: 3,
  annotatedSteps: [
    {
      stepNumber: 1,
      description: "Solves",
      studentWork: "worked it",
      status: "correct",
      marksAwarded: 3,
      marksDeducted: 0,
      teacherAnnotation: "ok",
      mistakeType: null,
      correctedWorking: null,
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "good",
};
const worksheetGrade = {
  results: [
    {
      qNumber: 1,
      couldNotRead: false,
      marksAwarded: 3,
      annotatedSteps: [
        {
          stepNumber: 1,
          description: "Solves",
          studentWork: "worked it",
          status: "correct",
          marksAwarded: 3,
          marksDeducted: 0,
          teacherAnnotation: "ok",
          mistakeType: null,
          correctedWorking: null,
        },
      ],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "good",
    },
  ],
  summary: "s",
};

const checkPayload = {
  question: "A number's square less twice the number is 8. Find the number.",
  marks: 3,
  subject: "Maths",
  textAnswer: "see my work",
};
const worksheetPayload = {
  worksheetId: "t",
  imageBase64: PDF_B64,
  imageMimeType: "application/pdf",
  questions: [{ qNumber: 1, marks: 3, topic: "t", topicLabel: "T", questionText: "Q1?" }],
};

describe("grading reliability — config + prompt changes on BOTH paths", () => {
  it("(a) handleCheckSolution grading genConfig has temperature 0.05", async () => {
    const route = buildCheckRoute(oneStepGrade);
    await route.run(checkPayload);
    expect(route.calls.length).toBeGreaterThan(0);
    expect(route.calls[0].genConfig.temperature).toBe(0.05);
    // The other genConfig fields are untouched (additive change).
    expect(route.calls[0].genConfig.maxOutputTokens).toBe(16000);
    expect(route.calls[0].genConfig.responseMimeType).toBe("application/json");
  });

  it("(b) gradeStructuredSet grading genConfig has temperature 0.05", async () => {
    const route = buildWorksheetRoute(worksheetGrade);
    await route.run(worksheetPayload);
    expect(route.calls.length).toBeGreaterThan(0);
    expect(route.calls[0].genConfig.temperature).toBe(0.05);
    expect(route.calls[0].genConfig.maxOutputTokens).toBe(32000);
    expect(route.calls[0].genConfig.responseMimeType).toBe("application/json");
  });

  it("(c) the 'Don't know' non-attempt exception is present in BOTH prompts", async () => {
    const check = buildCheckRoute(oneStepGrade);
    await check.run(checkPayload);
    const checkPrompt = check.calls[0].prompt;
    // handleCheckSolution uses the adapted note (it has no couldNotRead field).
    expect(checkPrompt).toContain("NOTE ON NON-ATTEMPTS");
    expect(checkPrompt).toContain("Don't know");
    expect(checkPrompt).toContain("Never treat a legible non-attempt phrase");

    const ws = buildWorksheetRoute(worksheetGrade);
    await ws.run(worksheetPayload);
    const wsPrompt = ws.calls[0].prompt;
    // gradeStructuredSet keeps the verbatim couldNotRead exception.
    expect(wsPrompt).toContain("IMPORTANT EXCEPTION");
    expect(wsPrompt).toContain("Don't know");
    expect(wsPrompt).toContain("it is NOT couldNotRead");
    expect(wsPrompt).toContain("Never set couldNotRead for a clearly-written non-attempt phrase");
  });

  it("(d) the word-problem closure rule is present in BOTH prompts", async () => {
    const check = buildCheckRoute(oneStepGrade);
    await check.run(checkPayload);
    expect(check.calls[0].prompt).toContain("WORD-PROBLEM FINAL ANSWER");
    expect(check.calls[0].prompt).toContain("deduct ½ mark as a presentation step");

    const ws = buildWorksheetRoute(worksheetGrade);
    await ws.run(worksheetPayload);
    expect(ws.calls[0].prompt).toContain("WORD-PROBLEM FINAL ANSWER");
    expect(ws.calls[0].prompt).toContain("deduct ½ mark as a presentation step");
  });
});

describe("(e) existing grading behavior is unchanged (additive PR — no logic change)", () => {
  it("a worked wrong step still keeps its mistakeType (handleCheckSolution)", async () => {
    const grade = {
      totalMarks: 3,
      marksAwarded: 1,
      annotatedSteps: [
        {
          stepNumber: 1,
          description: "Arithmetic",
          studentWork: "12 × 1.73 = 20.16", // working shown -> diagnosable
          status: "incorrect",
          marksAwarded: 0,
          marksDeducted: 2,
          teacherAnnotation: "wrong",
          mistakeType: "calculation",
          correctedWorking: "12 × 1.73 = 20.76",
        },
      ],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "check arithmetic",
    };
    const { body } = await buildCheckRoute(grade).run(checkPayload);
    expect(body.annotatedSteps[0].mistakeType).toBe("calculation");
    expect(body.mistakeSummary.calculation).toBe(1);
  });

  it("a no-working wrong step still gets mistakeType null (handleCheckSolution)", async () => {
    const grade = {
      totalMarks: 3,
      marksAwarded: 0,
      annotatedSteps: [
        {
          stepNumber: 1,
          description: "Final answer (no working)",
          studentWork: "",
          status: "incorrect",
          marksAwarded: 0,
          marksDeducted: 3,
          teacherAnnotation: "wrong",
          mistakeType: "conceptual", // fabricated
          correctedWorking: null,
        },
      ],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "show working",
    };
    const { body } = await buildCheckRoute(grade).run(checkPayload);
    expect(body.annotatedSteps[0].mistakeType).toBeNull();
    expect(body.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
  });

  it("an objective (MCQ/Section A) wrong pick still hits the isObjectiveType guard (worksheet)", async () => {
    // A wrong MCQ writes its chosen option into studentWork (non-empty), so only the
    // objective guard — not the empty-working check — can null it. section "A".
    const grade = {
      results: [
        {
          qNumber: 1,
          couldNotRead: false,
          marksAwarded: 0,
          annotatedSteps: [
            {
              stepNumber: 1,
              description: "Chosen option",
              studentWork: "(d)", // NON-empty
              status: "incorrect",
              marksAwarded: 0,
              marksDeducted: 1,
              teacherAnnotation: "wrong",
              mistakeType: "conceptual", // fabricated
              correctedWorking: null,
            },
          ],
          mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
          teacherNote: "x",
        },
      ],
      summary: "s",
    };
    const payload = {
      worksheetId: "t",
      imageBase64: PDF_B64,
      imageMimeType: "application/pdf",
      questions: [
        { qNumber: 1, marks: 1, section: "A", topic: "t", topicLabel: "T", questionText: "MCQ?" },
      ],
    };
    const { body } = await buildWorksheetRoute(grade).run(payload);
    const r = body.results[0];
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
    // Attempt still records fully.
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.totalMarks).toBe(1);
  });
});
