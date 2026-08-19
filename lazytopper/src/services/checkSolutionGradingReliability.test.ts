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
  // ⚠ EXPECTATION MOVED 2026-08-16 (Wave MI-INTEGRITY-3), 0.05 -> 0, on both paths.
  // These two pinned the PRE-CLAMP-(a) value. The owner then ruled temperature 0 for
  // GRADING after grading ONE photograph FOUR times on ONE surface and getting 0.5/2
  // once and 1/2 three times: the grader was non-deterministic in the mark a student
  // sees. The code is deliberately `temperature: 0` at both grading call sites; the
  // tests, not the code, were stale. ⚠ `handleDetectQuestion`'s 0.1 is untouched — that
  // call is question DETECTION/OCR, not grading.
  it("(a) handleCheckSolution grading genConfig has temperature 0 (clamp (a) — determinism first)", async () => {
    const route = buildCheckRoute(oneStepGrade);
    await route.run(checkPayload);
    expect(route.calls.length).toBeGreaterThan(0);
    expect(route.calls[0].genConfig.temperature).toBe(0);
    // The other genConfig fields are untouched (additive change).
    expect(route.calls[0].genConfig.maxOutputTokens).toBe(16000);
    expect(route.calls[0].genConfig.responseMimeType).toBe("application/json");
  });

  it("(b) gradeStructuredSet grading genConfig has temperature 0 (clamp (a) — the same doctrine on the batch path)", async () => {
    const route = buildWorksheetRoute(worksheetGrade);
    await route.run(worksheetPayload);
    expect(route.calls.length).toBeGreaterThan(0);
    expect(route.calls[0].genConfig.temperature).toBe(0);
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

  it("(f) the crossed-out NO-ATTEMPT rule is present in the worksheet prompt only (gradeStructuredSet has couldNotRead; handleCheckSolution does not)", async () => {
    const ws = buildWorksheetRoute(worksheetGrade);
    await ws.run(worksheetPayload);
    const wsPrompt = ws.calls[0].prompt;
    expect(wsPrompt).toContain("clearly and completely crossed out with no replacement");
    expect(wsPrompt).toContain("Never set couldNotRead for a clearly crossed-out answer");

    // handleCheckSolution has no couldNotRead field, so it must NOT carry the
    // crossed-out couldNotRead rule (Fix A is gradeStructuredSet-only by design).
    const check = buildCheckRoute(oneStepGrade);
    await check.run(checkPayload);
    expect(check.calls[0].prompt).not.toContain("crossed out");
  });

  it("(g) the PARTIAL CREDIT step-weight rule is present in BOTH prompts", async () => {
    const check = buildCheckRoute(oneStepGrade);
    await check.run(checkPayload);
    expect(check.calls[0].prompt).toContain("PARTIAL CREDIT: award marks strictly by the step weights");
    expect(check.calls[0].prompt).toContain("never redistribute or re-weight marks across steps");

    const ws = buildWorksheetRoute(worksheetGrade);
    await ws.run(worksheetPayload);
    expect(ws.calls[0].prompt).toContain("PARTIAL CREDIT: award marks strictly by the step weights");
    expect(ws.calls[0].prompt).toContain("never redistribute or re-weight marks across steps");
  });

  // ⚠ EXPECTATION MOVED 2026-08-16 (Wave MI-INTEGRITY-3) — TWO stale substrings, not
  // one. Only `classify mistakeType as 'silly'` appeared in the failure output, because
  // `expect` short-circuits at the first miss; `A correctly solved wrong problem earns
  // no credit` was equally gone and would have surfaced on the next run. THE RUNNER'S
  // LIST WAS NOT THE SET — both were confirmed absent by `grep -cF` (0 hits each).
  // WHY they are gone: the miscopy rule was REWRITTEN by ECF_POLICY_V2 from a flat zero
  // into a DEPARTURE. Awarding 0 for the whole question is now exactly what the prompt
  // forbids, and `silly` is exactly the bucket the departure must NOT be filed under,
  // so re-anchoring to the nearest surviving phrase would have re-pinned the retired
  // doctrine. These four replacements are load-bearing: each is a clause the rule would
  // be wrong without, and each is verified present in BOTH prompts (`grep -cF` = 2).
  it("(j) the QUESTION MISCOPY rule — as ECF_POLICY_V2, not a flat zero — is present in BOTH prompts", async () => {
    // The miscopy rule must land on BOTH grading functions (rule 15 in
    // handleCheckSolution, rule 9 in gradeStructuredSet) — never one and not the
    // other. A correctly-solved WRONG problem (the student miscopied the question from
    // the paper) is a DEPARTURE: the first step that is no longer the question is
    // marked, whatever was still the question keeps its marks, and every step below
    // earns zero.
    const expectedClauses = [
      "QUESTION MISCOPY",
      "solves a DIFFERENT equation/expression/problem",
      // The four below are the ECF_POLICY_V2 rewrite, each load-bearing:
      "READ THIS AS ECF_POLICY_V2, NOT AS A FLAT ZERO", // the doctrine's name + its negation
      '"isDeparture": true', // the machine-readable marker findDepartureIndex reads
      "award ZERO for every step below it", // rule 5
      "Do NOT award 0 for the entire question", // the flat zero, explicitly retired
    ];

    const check = buildCheckRoute(oneStepGrade);
    await check.run(checkPayload);
    for (const clause of expectedClauses) {
      expect(check.calls[0].prompt).toContain(clause);
    }
    // CONTROL — the RETIRED flat-zero doctrine must be absent, not merely unasserted.
    expect(check.calls[0].prompt).not.toContain("classify mistakeType as 'silly'");
    expect(check.calls[0].prompt).not.toContain("A correctly solved wrong problem earns no credit");

    const ws = buildWorksheetRoute(worksheetGrade);
    await ws.run(worksheetPayload);
    for (const clause of expectedClauses) {
      expect(ws.calls[0].prompt).toContain(clause);
    }
    expect(ws.calls[0].prompt).not.toContain("classify mistakeType as 'silly'");
    expect(ws.calls[0].prompt).not.toContain("A correctly solved wrong problem earns no credit");
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
    // class 3b — `departure` ADDED; conceptual/calculation/silly/presentation unmoved.
    expect(body.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
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
    // class 3b — `departure` ADDED; conceptual/calculation/silly/presentation unmoved.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
    // Attempt still records fully.
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.totalMarks).toBe(1);
  });
});

describe("follow-up fixes — crossed-out NO-ATTEMPT (A) + partial credit by step weight (B)", () => {
  it("(h) a crossed-out answer grades as incorrect with full marks deducted, mistakeType null — couldNotRead never fires (worksheet)", async () => {
    // The prompt (Fix A) instructs the model to grade a clearly crossed-out answer
    // as a NO-ATTEMPT (status incorrect, marks deducted = question marks, type null)
    // and NEVER couldNotRead. Drive the route with that canned model result and a
    // FABRICATED type, and assert: (1) it is graded, never folded into couldNotRead;
    // (2) the no-working honesty guard nulls the fabricated type (empty studentWork);
    // (3) the attempt records fully with full marks deducted.
    const grade = {
      results: [
        {
          qNumber: 1,
          couldNotRead: false, // model must NOT flag couldNotRead for a crossed-out answer
          marksAwarded: 0,
          annotatedSteps: [
            {
              stepNumber: 1,
              description: "Crossed-out answer (no replacement)",
              studentWork: "", // crossed out with nothing legible left -> no working
              status: "incorrect",
              marksAwarded: 0,
              marksDeducted: 3,
              teacherAnnotation: "crossed out, no attempt",
              mistakeType: "conceptual", // fabricated -> guard must null
              correctedWorking: null,
            },
          ],
          mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
          teacherNote: "no attempt",
        },
      ],
      summary: "s",
    };
    const payload = {
      worksheetId: "t",
      imageBase64: PDF_B64,
      imageMimeType: "application/pdf",
      questions: [{ qNumber: 1, marks: 3, topic: "t", topicLabel: "T", questionText: "Solve x^2 - 5x + 6 = 0" }],
    };
    const { body } = await buildWorksheetRoute(grade).run(payload);
    const r = body.results[0];

    // couldNotRead NEVER fires — the crossed-out answer is graded, not pending.
    expect(r.couldNotRead).toBe(false);
    expect(body.pendingCount).toBe(0);
    expect(body.gradedCount).toBe(1);

    // Graded as incorrect, full marks deducted, type nulled (undiagnosable).
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.annotatedSteps[0].marksDeducted).toBe(3);
    expect(r.annotatedSteps[0].mistakeType).toBeNull();
    expect(r.marksAwarded).toBe(0);
    expect(r.totalMarks).toBe(3);
    // class 3b — `departure` ADDED; conceptual/calculation/silly/presentation unmoved.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
  });

  it("(i) partial credit follows step weights — a correct step earns its mark even when a later step is wrong (deterministic total)", async () => {
    // 3-step question, 1 mark each. Step 1 + Step 2 correct (1 + 1), Step 3 a worked
    // calculation error (0). Total must be a deterministic 2/3 — the correct steps
    // keep their marks, the wrong step earns 0, nothing is redistributed.
    const grade = {
      totalMarks: 3,
      marksAwarded: 2,
      annotatedSteps: [
        {
          stepNumber: 1,
          description: "Setup / formula [1 mark]",
          studentWork: "x = (-b ± √(b²-4ac)) / 2a",
          status: "correct",
          marksAwarded: 1,
          marksDeducted: 0,
          teacherAnnotation: "✓",
          mistakeType: null,
          correctedWorking: null,
        },
        {
          stepNumber: 2,
          description: "Substitution [1 mark]",
          studentWork: "= (5 ± √(25-24)) / 2",
          status: "correct",
          marksAwarded: 1,
          marksDeducted: 0,
          teacherAnnotation: "✓",
          mistakeType: null,
          correctedWorking: null,
        },
        {
          stepNumber: 3,
          description: "Final value [1 mark]",
          studentWork: "√1 = 4 so x = 4.5", // worked calculation error
          status: "incorrect",
          marksAwarded: 0,
          marksDeducted: 1,
          teacherAnnotation: "× √1 = 1, not 4",
          mistakeType: "calculation",
          correctedWorking: "√1 = 1 so x = 3 or x = 2",
        },
      ],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: "Two steps right, last calc slipped.",
    };
    // ⚠⚠ FIXTURE REVERTED TO UNANCHORED 2026-08-16 (GRD-FINAL, owner ruling as CBSE
    // authority). Earlier the same day this fixture was given a 3-step `solutionSteps`
    // scheme so that clamp (c) — the flat 50% cap on a question with no stored scheme —
    // would stop binding at 1.5. That was a reasonable call under an instruction that
    // has since been REVERSED, and the reason is bigger than this test: a student may
    // upload ANY question to Check & Improve, so the scheme-ABSENT regime is the REAL
    // PRODUCTION PATH. Supplying a scheme converted this suite's only unanchored mark
    // assertion into an anchored one and hid the production path behind the exception.
    // ★ `checkPayload` carries NO `solutionSteps`, deliberately — this test now guards
    // the C&I path, and it passes because clamp (c) is GONE, not because it was dodged.
    const { body } = await buildCheckRoute(grade).run({ ...checkPayload, marks: 3 });

    // The two correct steps keep their marks; the wrong step earns 0; total is exact.
    expect(body.annotatedSteps[0].marksAwarded).toBe(1);
    expect(body.annotatedSteps[1].marksAwarded).toBe(1);
    expect(body.annotatedSteps[2].marksAwarded).toBe(0);
    expect(body.marksAwarded).toBe(2); // 1 + 1 + 0, no redistribution
    expect(body.totalMarks).toBe(3);
    expect(body.percentage).toBe(67); // round(2/3*100)
    // The worked wrong step keeps its diagnosable type (control on the guard).
    expect(body.annotatedSteps[2].mistakeType).toBe("calculation");
    expect(body.mistakeSummary.calculation).toBe(1);
  });

  it("(k) a miscopied question (correct working for the WRONG equation) scores 0 with mistakeType 'silly' — survives the honesty guard (worksheet)", async () => {
    // Live evidence (WS-M-MIX-22 Q1): the question stated 4x²-4x-3=0 but the student
    // solved 4x²-4x-5=0 — internally-correct working for a DIFFERENT equation. Rule 9
    // (gradeStructuredSet) tells the model to award 0 for the whole question and
    // classify 'silly'. Drive the route with that canned model result and assert the
    // normaliser PRESERVES it: 0 marks, type 'silly'. The honesty guard must NOT fire
    // (working IS visible and the question is NOT objective), so 'silly' is the control
    // that the worked-answer path keeps a diagnosable type.
    const grade = {
      results: [
        {
          qNumber: 1,
          couldNotRead: false,
          marksAwarded: 0,
          annotatedSteps: [
            {
              stepNumber: 1,
              description: "Solved a different equation than the one asked",
              studentWork: "4x²-4x-5=0 → (2x-... ) → x = 5/2, x = -1/2", // correct for the WRONG equation
              status: "incorrect",
              marksAwarded: 0,
              marksDeducted: 2,
              teacherAnnotation: "Miscopied -3 as -5; solved a different equation.",
              mistakeType: "silly",
              correctedWorking: "The equation is 4x²-4x-3=0; solve that.",
            },
          ],
          mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
          teacherNote: "Careful copying the question from the paper.",
        },
      ],
      summary: "s",
    };
    const payload = {
      worksheetId: "t",
      imageBase64: PDF_B64,
      imageMimeType: "application/pdf",
      questions: [
        { qNumber: 1, marks: 2, section: "B", topic: "t", topicLabel: "T", questionText: "Find the roots of 4x² - 4x - 3 = 0" },
      ],
    };
    const { body } = await buildWorksheetRoute(grade).run(payload);
    const r = body.results[0];

    // Graded (never couldNotRead), zero credit for the whole question.
    expect(r.couldNotRead).toBe(false);
    expect(r.annotatedSteps[0].status).toBe("incorrect");
    expect(r.marksAwarded).toBe(0);
    expect(r.totalMarks).toBe(2);
    // 'silly' SURVIVES — visible working + non-objective question means the no-working
    // / objective honesty guard leaves the diagnosable type intact.
    expect(r.annotatedSteps[0].mistakeType).toBe("silly");
    expect(r.mistakeSummary.silly).toBe(1);
    // class 3b — `departure` ADDED; `silly: 1` and the other three are unmoved. ⚠ This
    // miscopy is NOT declared with `isDeparture`, so it stays `silly` and departure is 0.
    expect(r.mistakeSummary).toEqual({ conceptual: 0, calculation: 0, silly: 1, presentation: 0, departure: 0 });
  });
});
