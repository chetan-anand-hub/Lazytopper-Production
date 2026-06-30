// @vitest-environment node
//
// Gateway thinkingConfig forwarding + detect-question thinkingBudget:0.
//
// The gateway (`geminiClient.cjs`) is the single chokepoint for every AI call, so
// the additive invariant is the whole point: when a caller passes NO thinkingConfig,
// the outgoing request body must be byte-identical to before. These tests stub the
// global `fetch`, drive the REAL body builders in BOTH `callGemini` and
// `callGeminiStream`, and assert the captured request body. A third test drives the
// REAL `handleDetectQuestion` route to prove the detect call site now sends
// thinkingBudget:0. No live LLM, no network.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeminiClient } from "../../server/services/geminiClient.cjs";
import { createCheckSolutionRoute } from "../../server/routes/checkSolution.cjs";

// Direct-key config so the gateway uses the direct Google endpoint (no proxy branch).
const GEMINI_CFG = {
  GEMINI_API_KEY: "test-key",
  HAS_REPLIT_PROXY: false,
  REPLIT_GEMINI_BASE_URL: "",
  REPLIT_GEMINI_API_KEY: "",
  DIRECT_GEMINI_API_KEY: "test-key",
  GEMINI_TUTOR_MODEL: "test-model",
  GEMINI_TIMEOUT_MS: 10000,
};

const CONTENTS = [{ role: "user", parts: [{ text: "hi" }] }];

afterEach(() => {
  vi.unstubAllGlobals();
});

// Capture the request body that the gateway hands to fetch. Returns the array the
// fetch mock pushes each call's parsed+raw body into.
function stubFetchCapture(kind: "json" | "stream") {
  const calls: Array<{ rawBody: string; body: any }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, opts: any) => {
      calls.push({ rawBody: String(opts.body), body: JSON.parse(opts.body) });
      if (kind === "json") {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          headers: { get: () => null },
          text: async () =>
            JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }),
        } as unknown as Response;
      }
      // stream: a minimal one-chunk SSE body the drainer can consume cleanly.
      const sse =
        "data: " +
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "hi" }] } }] }) +
        "\n\n";
      const stream = new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(sse));
          c.close();
        },
      });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        body: stream,
        text: async () => "",
      } as unknown as Response;
    }),
  );
  return calls;
}

describe("gateway forwards thinkingConfig additively (callGemini + callGeminiStream)", () => {
  it("(a) callGemini WITH thinkingConfig:{thinkingBudget:0} → body.generationConfig.thinkingConfig.thinkingBudget === 0", async () => {
    const calls = stubFetchCapture("json");
    const { callGemini } = createGeminiClient(GEMINI_CFG as never);
    await callGemini("m", CONTENTS, {
      temperature: 0.1,
      maxOutputTokens: 400,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(calls[0].body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
  });

  it("(a) callGeminiStream WITH thinkingConfig:{thinkingBudget:0} → body.generationConfig.thinkingConfig.thinkingBudget === 0", async () => {
    const calls = stubFetchCapture("stream");
    const { callGeminiStream } = createGeminiClient(GEMINI_CFG as never);
    // Iterate to completion so the fetch (and thus the body build) actually runs.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of callGeminiStream("m", CONTENTS, {
      temperature: 0.7,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
    })) {
      /* drain */
    }
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it("(b) callGemini WITHOUT thinkingConfig → no thinkingConfig key; generationConfig byte-identical to before", async () => {
    const calls = stubFetchCapture("json");
    const { callGemini } = createGeminiClient(GEMINI_CFG as never);
    await callGemini("m", CONTENTS, {
      temperature: 0.1,
      maxOutputTokens: 400,
      responseMimeType: "application/json",
    });
    const gen = calls[0].body.generationConfig;
    expect("thinkingConfig" in gen).toBe(false);
    // Byte-identical guard: exactly the three pre-existing keys, same shape/order.
    expect(JSON.stringify(gen)).toBe(
      JSON.stringify({ temperature: 0.1, maxOutputTokens: 400, responseMimeType: "application/json" }),
    );
  });

  it("(b) callGeminiStream WITHOUT thinkingConfig → no thinkingConfig key; generationConfig byte-identical to before", async () => {
    const calls = stubFetchCapture("stream");
    const { callGeminiStream } = createGeminiClient(GEMINI_CFG as never);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of callGeminiStream("m", CONTENTS, {
      temperature: 0.7,
      maxOutputTokens: 4096,
    })) {
      /* drain */
    }
    const gen = calls[0].body.generationConfig;
    expect("thinkingConfig" in gen).toBe(false);
    expect(JSON.stringify(gen)).toBe(
      JSON.stringify({ temperature: 0.7, maxOutputTokens: 4096 }),
    );
  });
});

describe("detect-question call site sends thinkingBudget:0", () => {
  it("(c) handleDetectQuestion passes thinkingConfig:{thinkingBudget:0} (other config unchanged)", async () => {
    let capturedConfig: any = null;
    let captured: { status: number; body: any } | null = null;
    const deps = {
      sendJson: (_res: unknown, status: number, body: any) => {
        captured = { status, body };
      },
      readJson: async (req: unknown) => req, // payload passed AS request
      callGemini: async (_model: unknown, _contents: unknown, config: any) => {
        capturedConfig = config;
        return {
          text: JSON.stringify({
            detectedMarks: 3,
            detectedSubject: "Maths",
            detectedTopic: null,
            marksSource: "inferred",
          }),
          raw: {},
        };
      },
      GEMINI_MODEL: "test-model",
      ACTIVE_PROVIDER: "test",
      isStubMode: () => false,
      extractJsonObjectFromText: (t: string) => JSON.parse(t),
      buildGeminiImagePart: () => ({}),
      validateMentorImagePayload: () => ({ ok: true }),
    };
    const { handleDetectQuestion } = createCheckSolutionRoute(deps as never);
    await handleDetectQuestion({ question: "Find the value of x." } as never, {} as never);

    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    // The rest of the detect config is untouched, EXCEPT maxOutputTokens which was
    // raised (400 → 4096) so multi-question detect can return every question's full
    // text without truncating — including a full paper whose later questions are
    // long-answers (thinking is off, so the whole budget is the JSON).
    expect(capturedConfig.temperature).toBe(0.1);
    expect(capturedConfig.maxOutputTokens).toBe(4096);
    expect(capturedConfig.responseMimeType).toBe("application/json");
    // Route still responded ok.
    expect(captured?.status).toBe(200);
    expect(captured?.body.ok).toBe(true);
  });
});

describe("detect-question returns a multi-question array (additive)", () => {
  function buildDetectRoute(modelJson: unknown) {
    let capturedPrompt = "";
    let captured: { status: number; body: any } | null = null;
    const deps = {
      sendJson: (_res: unknown, status: number, body: any) => {
        captured = { status, body };
      },
      readJson: async (req: unknown) => req,
      callGemini: async (_model: unknown, contents: any) => {
        capturedPrompt = String(contents?.[0]?.parts?.[0]?.text || "");
        return { text: JSON.stringify(modelJson), raw: {} };
      },
      GEMINI_MODEL: "test-model",
      ACTIVE_PROVIDER: "test",
      isStubMode: () => false,
      extractJsonObjectFromText: (t: string) => JSON.parse(t),
      buildGeminiImagePart: () => ({}),
      validateMentorImagePayload: () => ({ ok: true }),
    };
    const { handleDetectQuestion } = createCheckSolutionRoute(deps as never);
    return {
      run: async (payload: unknown) => {
        await handleDetectQuestion(payload as never, {} as never);
        return { prompt: capturedPrompt, captured };
      },
    };
  }

  it("(d) the detect prompt instructs the multi-question array + the RESPOND schema includes \"questions\"", async () => {
    const route = buildDetectRoute({ detectedMarks: 2, detectedSubject: "Maths", detectedTopic: null, questions: [] });
    const { prompt } = await route.run({ question: "Q1 …" });
    expect(prompt).toContain("MULTIPLE questions");
    expect(prompt).toContain('"questions"');
    expect(prompt).toContain('"questionNumber"');
    expect(prompt).toContain('"questionText"');
  });

  it("(e) a multi-question model reply is normalised + returned (marks clamped, textless dropped); single-question read still works", async () => {
    const route = buildDetectRoute({
      detectedMarks: 3,
      detectedSubject: "Maths",
      detectedTopic: null,
      marksSource: "stated",
      questions: [
        { questionNumber: 1, questionText: "Find the HCF of 6 and 20.", marks: 2, marksSource: "stated" },
        { questionNumber: 2, questionText: "Solve x^2 - 7x + 12 = 0.", marks: 99, marksSource: "inferred" }, // out-of-range → clamps to detectedMarks
        { questionNumber: 3, questionText: "   ", marks: 3, marksSource: "inferred" }, // blank → dropped
      ],
    });
    const { captured } = await route.run({ question: "paper" });
    expect(captured?.status).toBe(200);
    expect(captured?.body.ok).toBe(true);
    const qs = captured?.body.questions;
    expect(Array.isArray(qs)).toBe(true);
    expect(qs).toHaveLength(2); // blank dropped
    expect(qs[0]).toMatchObject({ questionNumber: 1, marks: 2, marksSource: "stated" });
    expect(qs[0].questionText).toBe("Find the HCF of 6 and 20.");
    expect(qs[1].marks).toBe(3); // out-of-range fell back to detectedMarks
    // Backward-compatible single-question fields are still present.
    expect(captured?.body.detectedMarks).toBe(3);
    expect(captured?.body.detectedSubject).toBe("Maths");
  });
});
