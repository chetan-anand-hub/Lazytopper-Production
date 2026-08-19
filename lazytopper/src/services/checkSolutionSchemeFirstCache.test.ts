// @vitest-environment node
//
// C&I PR-3 — the GRADER's scheme-first cache hooks (handleCheckSolution +
// gradeStructuredSet via handleGradeWorksheet). Drives the REAL routes with a
// MOCKED callGemini and a STUB (or REAL, for the PII test) solutionCache dep.
//
// The byte-review contract under test: the hook ONLY populates the EXISTING
// marking-scheme slot for keyless SUBJECTIVE questions when a solutionCache dep
// is injected; bank-sourced calls, the autoDetect path, objective questions and
// every caller WITHOUT the dep are byte-identical to before. Plus dispatch
// required-test (e): no student answer/PII ever enters the cache.
import { describe, expect, it } from "vitest";
import { createCheckSolutionRoute } from "../../server/routes/checkSolution.cjs";
import {
  getOrCreateModelSolution,
  computeQuestionHash,
  __setPoolForTests,
} from "../../server/routes/stepSolution.cjs";

const PDF_B64 = Buffer.from("%PDF-1.4\nminimal\n%%EOF").toString("base64");

const CANNED_GRADE = {
  totalMarks: 3,
  marksAwarded: 2,
  annotatedSteps: [
    {
      stepNumber: 1,
      description: "Working",
      studentWork: "student wrote this",
      status: "partial",
      marksAwarded: 2,
      marksDeducted: 1,
      teacherAnnotation: "half right",
      mistakeType: "calculation",
      correctedWorking: "corrected",
    },
  ],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "note",
};

const CANNED_WORKSHEET_GRADE = {
  results: [1, 2, 3].map((n) => ({
    qNumber: n,
    couldNotRead: false,
    marksAwarded: 1,
    annotatedSteps: [
      {
        stepNumber: 1,
        description: "Working",
        studentWork: "w",
        status: "partial",
        marksAwarded: 1,
        marksDeducted: 1,
        teacherAnnotation: "t",
        mistakeType: null,
        correctedWorking: null,
      },
    ],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "n",
  })),
  summary: "s",
};

const SCHEME = ["Writing the formula: x = (-b +/- sqrt(D)) / 2a [1 mark]", "Final answer: x = 1 [2 marks]"];

function buildRoutes(opts: {
  solutionCache?: unknown;
  gradeReply?: unknown;
}) {
  const geminiPrompts: string[] = [];
  let captured: { status: number; body: any } | null = null;
  let currentPayload: unknown = null;
  const deps: Record<string, unknown> = {
    sendJson: (_res: unknown, status: number, body: any) => {
      captured = { status, body };
    },
    readJson: async (req: unknown) => (currentPayload !== null ? currentPayload : req),
    callGemini: async (_m: unknown, contents: any) => {
      const prompt = String(contents?.[0]?.parts?.[0]?.text || "");
      geminiPrompts.push(prompt);
      return { text: JSON.stringify(opts.gradeReply ?? CANNED_GRADE), raw: {} };
    },
    GEMINI_MODEL: "test-model",
    ACTIVE_PROVIDER: "test",
    isStubMode: () => false,
    extractJsonObjectFromText: (t: string) => JSON.parse(t),
    buildGeminiImagePart: () => ({}),
    validateMentorImagePayload: () => ({ ok: true }),
  };
  if (opts.solutionCache !== undefined) deps.solutionCache = opts.solutionCache;
  const routes = createCheckSolutionRoute(deps as never);
  return {
    geminiPrompts,
    runCheck: async (payload: unknown) => {
      currentPayload = null;
      captured = null;
      await routes.handleCheckSolution(payload as never, {} as never);
      if (!captured) throw new Error("route did not send a response");
      return captured as { status: number; body: any };
    },
    runWorksheet: async (payload: unknown) => {
      currentPayload = payload;
      captured = null;
      await routes.handleGradeWorksheet({} as never, {} as never);
      currentPayload = null;
      if (!captured) throw new Error("route did not send a response");
      return captured as { status: number; body: any };
    },
  };
}

function buildCacheStub() {
  const calls: any[] = [];
  return {
    calls,
    stub: {
      getOrCreateModelSolution: async (fields: any) => {
        calls.push(fields);
        return { schemeSteps: SCHEME, fromCache: true, hash: "h" };
      },
    },
  };
}

const KEYLESS_SUBJECTIVE = {
  question: "Solve 2x^2 - 5x + 3 = 0",
  marks: 3,
  subject: "Maths",
  topic: "Quadratic Equations",
  textAnswer: "my answer: x equals one",
};

describe("handleCheckSolution — scheme-first hook", () => {
  it("keyless subjective: the cached scheme feeds the EXISTING marking-scheme slot", async () => {
    const { calls, stub } = buildCacheStub();
    const { geminiPrompts, runCheck } = buildRoutes({ solutionCache: stub });
    const out = await runCheck(KEYLESS_SUBJECTIVE);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(calls.length).toBe(1);
    // The hook passes ONLY question metadata to the cache — never the student's answer.
    expect(calls[0].question).toBe(KEYLESS_SUBJECTIVE.question);
    expect(JSON.stringify(calls[0])).not.toContain("my answer");
    // The grading prompt carries the injected scheme through the EXISTING block.
    const gradingPrompt = geminiPrompts[0];
    expect(gradingPrompt).toContain("STORED MARKING SCHEME — CORROBORATION, NEVER AUTHORITY ON METHOD:");
    expect(gradingPrompt).toContain(SCHEME[0]);
    expect(gradingPrompt).toContain(SCHEME[1]);
  });

  it("bank-sourced call (solutionSteps present): the cache is NOT consulted", async () => {
    const { calls, stub } = buildCacheStub();
    const { geminiPrompts, runCheck } = buildRoutes({ solutionCache: stub });
    await runCheck({ ...KEYLESS_SUBJECTIVE, solutionSteps: ["Bank step 1", "Bank step 2"] });
    expect(calls.length).toBe(0);
    expect(geminiPrompts[0]).toContain("Bank step 1"); // caller's scheme, untouched
  });

  it("autoDetect path (no trusted marks): the cache is NOT consulted", async () => {
    const { calls, stub } = buildCacheStub();
    const { runCheck } = buildRoutes({ solutionCache: stub });
    await runCheck({ ...KEYLESS_SUBJECTIVE, detectMarks: true });
    expect(calls.length).toBe(0);
  });

  it("objective question (bank signals or detect flag): the cache is NOT consulted", async () => {
    const { calls, stub } = buildCacheStub();
    const { runCheck } = buildRoutes({ solutionCache: stub });
    await runCheck({ ...KEYLESS_SUBJECTIVE, marks: 1, objective: true });
    await runCheck({ ...KEYLESS_SUBJECTIVE, marks: 1, section: "A", format: "mcq", answer: "x = 1", options: ["x = 1", "x = 2"] });
    expect(calls.length).toBe(0);
  });

  it("no solutionCache dep (every legacy construction): byte-identical — no scheme block", async () => {
    const { geminiPrompts, runCheck } = buildRoutes({});
    const out = await runCheck(KEYLESS_SUBJECTIVE);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(geminiPrompts[0]).not.toContain("OFFICIAL CBSE MARKING SCHEME");
  });

  it("a throwing cache degrades to the empty scheme slot — grading never blocks", async () => {
    const { geminiPrompts, runCheck } = buildRoutes({
      solutionCache: {
        getOrCreateModelSolution: async () => {
          throw new Error("cache down");
        },
      },
    });
    const out = await runCheck(KEYLESS_SUBJECTIVE);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(geminiPrompts[0]).not.toContain("OFFICIAL CBSE MARKING SCHEME");
  });
});

describe("gradeStructuredSet (via handleGradeWorksheet) — scheme-first hook", () => {
  const WORKSHEET_PAYLOAD = {
    worksheetId: "ci:test",
    subject: "Science",
    imageBase64: PDF_B64,
    imageMimeType: "application/pdf",
    questions: [
      { qNumber: 1, marks: 3, questionText: "Explain reflex arc" }, // keyless subjective → hook
      { qNumber: 2, marks: 1, questionText: "Which is acidic?", objective: true }, // objective → skip
      { qNumber: 3, marks: 2, questionText: "Define refraction", solutionSteps: ["Bank scheme step"] }, // bank → skip
    ],
  };

  it("injects cached schemes ONLY for keyless subjective questions, steered by payload.subject", async () => {
    const { calls, stub } = buildCacheStub();
    const { geminiPrompts, runWorksheet } = buildRoutes({ solutionCache: stub, gradeReply: CANNED_WORKSHEET_GRADE });
    const out = await runWorksheet(WORKSHEET_PAYLOAD);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(calls.length).toBe(1); // Q1 only
    expect(calls[0].question).toBe("Explain reflex arc");
    expect(calls[0].subject).toBe("Science"); // payload.subject steers generation
    const prompt = geminiPrompts[0];
    expect(prompt).toContain(SCHEME[0]); // injected for Q1
    expect(prompt).toContain("Bank scheme step"); // Q3's own scheme untouched
  });

  it("no solutionCache dep: byte-identical structured grading (no injected schemes)", async () => {
    const { geminiPrompts, runWorksheet } = buildRoutes({ gradeReply: CANNED_WORKSHEET_GRADE });
    const out = await runWorksheet(WORKSHEET_PAYLOAD);
    expect(out.status).toBe(200);
    expect(out.body.ok).toBe(true);
    expect(geminiPrompts[0]).not.toContain(SCHEME[0]);
  });
});

// ── (e) PII: the REAL cache behind the REAL grader — nothing student-side leaks ─
describe("required test (e) — no student answer/PII ever enters the cache", () => {
  const GOOD_SOLUTION = {
    totalMarks: 3,
    steps: [
      { stepNumber: 1, description: "Writing the formula", working: "x = (-b +/- sqrt(D)) / 2a", marks: 1 },
      { stepNumber: 2, description: "Substituting values", working: "D = 1, x = (5 +/- 1)/4", marks: 1.5 },
      { stepNumber: 3, description: "Final answer", working: "x = 3/2 or x = 1", marks: 0.5 },
    ],
    commonMistakes: ["m"],
    examTip: "t",
  };

  it("generation prompt is question-only and the cached record is student-agnostic", async () => {
    const store = new Map<string, unknown>();
    __setPoolForTests({
      query: async (sql: string, params: string[]) => {
        if (sql.startsWith("SELECT")) {
          const hit = store.get(params[0]);
          return hit !== undefined ? { rows: [{ solution_json: hit }] } : { rows: [] };
        }
        if (sql.startsWith("INSERT")) {
          store.set(params[0], JSON.parse(params[1]));
          return { rowCount: 1 };
        }
        if (sql.startsWith("DELETE")) return { rowCount: store.delete(params[0]) ? 1 : 0 };
        throw new Error("unhandled " + sql);
      },
    } as never);

    const STUDENT_MARKER = "my answer: x equals one";
    // The REAL cache entry point, wired exactly like questions.cjs does it —
    // bound to a deps object that shares this test's mocked callGemini.
    const geminiPrompts2: string[] = [];
    let captured: { status: number; body: any } | null = null;
    const sharedDeps: Record<string, unknown> = {
      sendJson: (_res: unknown, status: number, body: any) => {
        captured = { status, body };
      },
      readJson: async (req: unknown) => req,
      callGemini: async (_m: unknown, contents: any) => {
        const prompt = String(contents?.[0]?.parts?.[0]?.text || "");
        geminiPrompts2.push(prompt);
        if (prompt.includes("Generate the OFFICIAL CBSE board marking scheme")) {
          return { text: JSON.stringify(GOOD_SOLUTION), raw: {} };
        }
        return { text: JSON.stringify(CANNED_GRADE), raw: {} };
      },
      GEMINI_MODEL: "test-model",
      ACTIVE_PROVIDER: "test",
      isStubMode: () => false,
      extractJsonObjectFromText: (t: string) => JSON.parse(t),
      buildGeminiImagePart: () => ({}),
      validateMentorImagePayload: () => ({ ok: true }),
    };
    sharedDeps.solutionCache = {
      getOrCreateModelSolution: (fields: unknown) => getOrCreateModelSolution(fields as never, sharedDeps as never),
    };
    const { handleCheckSolution } = createCheckSolutionRoute(sharedDeps as never);
    await handleCheckSolution({ ...KEYLESS_SUBJECTIVE, textAnswer: STUDENT_MARKER } as never, {} as never);
    expect(captured).not.toBeNull();
    expect((captured as any).body.ok).toBe(true);

    // Two model calls: generation first, grading second.
    expect(geminiPrompts2.length).toBe(2);
    const [generationPrompt, gradingPrompt] = geminiPrompts2;
    expect(generationPrompt).toContain("Generate the OFFICIAL CBSE board marking scheme");
    expect(generationPrompt).toContain(KEYLESS_SUBJECTIVE.question);
    expect(generationPrompt).not.toContain(STUDENT_MARKER); // question-only prompt
    expect(gradingPrompt).toContain(STUDENT_MARKER); // grading still sees the answer (of course)

    // The cached record: keyed by question-hash, carries ONLY the model solution.
    const hash = computeQuestionHash(KEYLESS_SUBJECTIVE.question, KEYLESS_SUBJECTIVE.marks);
    const cached = store.get(hash);
    expect(cached).toBeTruthy();
    const serialized = JSON.stringify(cached);
    expect(serialized).not.toContain(STUDENT_MARKER);
    expect(serialized).not.toContain("studentWork");
    expect(serialized).not.toContain("imageBase64");
    expect(serialized).not.toContain("textAnswer");

    __setPoolForTests(null as never);
  });
});
