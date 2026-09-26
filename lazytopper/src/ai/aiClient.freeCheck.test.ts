// @vitest-environment node
/**
 * FREE-CHECK-1b — the free-check WIRE, asserted at the fetch boundary.
 *
 *   OR-13 item 4  every free-check request carries a FRESH limited-use App Check token —
 *                 per-question detects included — and the cached getToken() is never used
 *   N13           the marker + App Check headers are OPT-IN and scoped to the three C&I
 *                 calls; a signed-out caller still sends `{}` identity everywhere else
 *   wire (1a)     no Authorization / X-Lazytopper-Uid on a free-check request; a 403
 *                 `free_check_refused` becomes a typed FreeCheckRefusedError
 *
 * Mutations this file turns RED (each was applied, seen red, and reverted — see report):
 *   B2 `getToken()` in place of `getLimitedUseToken()`   → "a fresh limited-use token…"
 *   B8 the free headers sent on a non-C&I call            → "…never on a non-C&I call"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const H = vi.hoisted(() => ({
  currentUser: null as null | { uid: string; getIdToken: () => Promise<string> },
  app: {} as object | null,
  minted: 0,
  getLimitedUseToken: vi.fn(),
  getToken: vi.fn(),
  initializeAppCheck: vi.fn(),
  providerKeys: [] as string[],
}));

vi.mock("../services/firebaseClient", () => ({
  get authClient() {
    return { currentUser: H.currentUser };
  },
  get app() {
    return H.app;
  },
  firebaseConfigured: true,
}));

vi.mock("firebase/app-check", () => ({
  initializeAppCheck: (...a: unknown[]) => H.initializeAppCheck(...a),
  getLimitedUseToken: (...a: unknown[]) => H.getLimitedUseToken(...a),
  getToken: (...a: unknown[]) => H.getToken(...a),
  ReCaptchaEnterpriseProvider: class {
    constructor(key: string) {
      H.providerKeys.push(key);
    }
  },
}));

import {
  checkSolutionImage,
  detectQuestion,
  gradeWorksheet,
  generateMoreLikeThis,
} from "./aiClient";
import { resolvePerQuestionGradeTopics } from "../utils/checkImproveDetection";
import {
  APP_CHECK_HEADER,
  FREE_CHECK_MARKER_HEADER,
  FREE_CHECK_RECAPTCHA_SITE_KEY,
  FreeCheckRefusedError,
  __resetFreeCheckAppCheckForTests,
} from "../services/freeCheckClient";

type Call = { url: string; headers: Record<string, string> };
let calls: Call[] = [];
let nextResponse: () => { status: number; body: unknown } = () => ({ status: 200, body: { ok: true } });

beforeEach(() => {
  calls = [];
  H.currentUser = null;
  H.app = {};
  H.minted = 0;
  H.providerKeys = [];
  H.getLimitedUseToken.mockReset().mockImplementation(async () => ({ token: `limited-${++H.minted}` }));
  H.getToken.mockReset().mockImplementation(async () => ({ token: "cached-token" }));
  H.initializeAppCheck.mockReset().mockImplementation(() => ({ app: H.app }));
  __resetFreeCheckAppCheckForTests();
  nextResponse = () => ({ status: 200, body: { ok: true, results: [], questions: [] } });
  vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string> }) => {
    calls.push({ url, headers: { ...init.headers } });
    const r = nextResponse();
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => JSON.stringify(r.body),
    };
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const FREE = { freeCheck: true } as const;

function assertFreeShape(h: Record<string, string>) {
  expect(h[FREE_CHECK_MARKER_HEADER]).toBe("1");
  expect(h[APP_CHECK_HEADER]).toMatch(/^limited-\d+$/);
  expect(h["Content-Type"]).toBe("application/json");
  // The P2 anonymous shape — no identity of any kind on a free check.
  expect(Object.keys(h).map((k) => k.toLowerCase())).not.toContain("authorization");
  expect(Object.keys(h).map((k) => k.toLowerCase())).not.toContain("x-lazytopper-uid");
}

describe("free-check requests carry a FRESH limited-use App Check token, every call (OR-13 item 4)", () => {
  it("a fresh limited-use token on each of detect, grade and grade-worksheet — never the cached getToken()", async () => {
    await detectQuestion({ question: "Q" }, FREE);
    await checkSolutionImage({ question: "Q", textAnswer: "an answer" }, FREE);
    await gradeWorksheet({ worksheetId: "ci:x", questions: [] }, FREE);

    expect(calls.map((c) => c.url)).toEqual([
      "/api/detect-question",
      "/api/check-solution",
      "/api/grade-worksheet",
    ]);
    calls.forEach((c) => assertFreeShape(c.headers));
    const tokens = calls.map((c) => c.headers[APP_CHECK_HEADER]);
    expect(new Set(tokens).size).toBe(3); // three calls, three distinct tokens
    expect(H.getLimitedUseToken).toHaveBeenCalledTimes(3);
    expect(H.getToken).not.toHaveBeenCalled();
  });

  it("the N per-question detects after a whole-paper grade each get their OWN token", async () => {
    nextResponse = () => ({ status: 200, body: { ok: true, detectedTopic: null, detectedSubject: null } });
    await resolvePerQuestionGradeTopics(
      [
        { questionNumber: 1, questionText: "one" },
        { questionNumber: 2, questionText: "two" },
        { questionNumber: 3, questionText: "three" },
      ],
      [],
      FREE,
    );
    expect(calls).toHaveLength(3);
    calls.forEach((c) => {
      expect(c.url).toBe("/api/detect-question");
      assertFreeShape(c.headers);
    });
    expect(new Set(calls.map((c) => c.headers[APP_CHECK_HEADER])).size).toBe(3);
    expect(H.getToken).not.toHaveBeenCalled();
  });

  it("App Check is initialised ONCE (a module singleton) with the reCAPTCHA Enterprise site key", async () => {
    await detectQuestion({ question: "Q" }, FREE);
    await detectQuestion({ question: "Q" }, FREE);
    expect(H.initializeAppCheck).toHaveBeenCalledTimes(1);
    expect(H.providerKeys).toEqual([FREE_CHECK_RECAPTCHA_SITE_KEY]);
    expect(H.initializeAppCheck.mock.calls[0][1]).toMatchObject({ isTokenAutoRefreshEnabled: false });
  });

  it("with no Firebase app (app === null) it refuses locally as app_check_missing and sends nothing", async () => {
    H.app = null;
    const err = await detectQuestion({ question: "Q" }, FREE).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FreeCheckRefusedError);
    expect((err as FreeCheckRefusedError).reason).toBe("app_check_missing");
    expect(calls).toHaveLength(0);
    expect(H.initializeAppCheck).not.toHaveBeenCalled();
  });

  it("a token that cannot be minted refuses as app_check_missing and sends nothing", async () => {
    H.getLimitedUseToken.mockImplementation(async () => {
      throw new Error("recaptcha blocked");
    });
    const err = await checkSolutionImage({ question: "Q" }, FREE).catch((e: unknown) => e);
    expect((err as FreeCheckRefusedError).reason).toBe("app_check_missing");
    expect(calls).toHaveLength(0);
  });
});

describe("the free-check headers are OPT-IN and scoped to the C&I calls (N13)", () => {
  it("without the opt-in, a signed-out C&I call is byte-identical to before: JSON only", async () => {
    await detectQuestion({ question: "Q" });
    await checkSolutionImage({ question: "Q" });
    await gradeWorksheet({ worksheetId: "w", questions: [] });
    await resolvePerQuestionGradeTopics([{ questionNumber: 1, questionText: "q" }], []);
    for (const c of calls) {
      expect(c.headers).toEqual({ "Content-Type": "application/json" });
    }
    expect(H.getLimitedUseToken).not.toHaveBeenCalled();
    expect(H.initializeAppCheck).not.toHaveBeenCalled();
  });

  it("…never on a non-C&I call (more-like-this), signed out", async () => {
    nextResponse = () => ({ status: 200, body: { ok: true, variants: [] } });
    await generateMoreLikeThis({ questionId: "q1" } as never);
    expect(calls).toHaveLength(1);
    expect(calls[0].headers).toEqual({ "Content-Type": "application/json" });
    expect(calls[0].headers[FREE_CHECK_MARKER_HEADER]).toBeUndefined();
    expect(calls[0].headers[APP_CHECK_HEADER]).toBeUndefined();
  });

  it("a signed-in C&I call without the opt-in keeps its identity headers and gains no marker", async () => {
    H.currentUser = { uid: "u1", getIdToken: async () => "id-token" };
    await checkSolutionImage({ question: "Q" });
    expect(calls[0].headers).toEqual({
      "Content-Type": "application/json",
      "X-Lazytopper-Uid": "u1",
      Authorization: "Bearer id-token",
    });
  });
});

describe("a 403 free_check_refused is a typed refusal the page can map (1a wire contract)", () => {
  for (const reason of ["ceiling_reached", "budget", "app_check_missing", "app_check_invalid", "unavailable"] as const) {
    it(`reason "${reason}" → FreeCheckRefusedError("${reason}")`, async () => {
      const resetAt = reason === "ceiling_reached" || reason === "budget" ? "2026-09-26T18:30:00.000Z" : undefined;
      nextResponse = () => ({
        status: 403,
        body: { error: "free_check_refused", reason, message: "server copy", ...(resetAt ? { resetAt } : {}) },
      });
      const err = await checkSolutionImage({ question: "Q" }, FREE).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FreeCheckRefusedError);
      expect((err as FreeCheckRefusedError).reason).toBe(reason);
      expect((err as FreeCheckRefusedError).resetAt).toBe(resetAt ?? null);
    });
  }

  it("an unknown reason degrades to `unavailable`, never a raw code", async () => {
    nextResponse = () => ({ status: 403, body: { error: "free_check_refused", reason: "something_new" } });
    const err = await detectQuestion({ question: "Q" }, FREE).catch((e: unknown) => e);
    expect((err as FreeCheckRefusedError).reason).toBe("unavailable");
  });

  it("CONTROL — any other 403 is still the generic error it was before", async () => {
    nextResponse = () => ({ status: 403, body: { error: "forbidden" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const err = await detectQuestion({ question: "Q" }).catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(FreeCheckRefusedError);
    expect((err as Error).message).toBe("forbidden");
  });
});
