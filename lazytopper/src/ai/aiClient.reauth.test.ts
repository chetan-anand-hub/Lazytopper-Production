// @vitest-environment node
/**
 * AUTHGATE-FIX-1 — the client half: a token the server refuses (401 `reauth_required`)
 * is refreshed and the call re-sent ONCE, silently. Only a second refusal reaches the
 * student, as "Please sign in again to continue.". Asserted at the fetch boundary,
 * through the REAL aiClient / tutorClient / paidCallHeaders, with only Firebase stubbed.
 *
 * Mutations this file turns RED (each applied alone, seen red, restored — see report):
 *   M4  no forced refresh on the re-send          -> "an expired-token student is graded…"
 *   M5  re-send twice / message on the first 401  -> "…exactly ONE re-send…", "…no message…"
 *   M6  a free check is re-sent with paid headers -> "a signed-out free check…"
 *   M8  a new Idempotency-Key on the re-send      -> "…the SAME Idempotency-Key…"
 *
 * Scoped run:
 *   pnpm exec vitest run src/ai/aiClient.reauth.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const H = vi.hoisted(() => ({
  currentUser: null as null | { uid: string; getIdToken: (force?: boolean) => Promise<string> },
  getIdToken: vi.fn(),
  minted: 0,
}));

vi.mock("../services/firebaseClient", () => ({
  get authClient() {
    return { currentUser: H.currentUser };
  },
  get app() {
    return {};
  },
  firebaseConfigured: true,
}));

vi.mock("firebase/app-check", () => ({
  initializeAppCheck: () => ({}),
  getLimitedUseToken: async () => ({ token: `limited-${++H.minted}` }),
  getToken: async () => ({ token: "cached-token" }),
  ReCaptchaEnterpriseProvider: class {},
}));

import { checkSolutionImage, gradeWorksheet, fetchStepSolution } from "./aiClient";
import { callTutor } from "./tutorClient";
import { REAUTH_MESSAGE } from "./paidCallHeaders";
import { IDEMPOTENCY_HEADER } from "./gradingTransport";
import { __resetFreeCheckAppCheckForTests, FREE_CHECK_MARKER_HEADER } from "../services/freeCheckClient";

type Call = { url: string; headers: Record<string, string> };
let calls: Call[] = [];
/** Answer per call: decides from the token the call carried. */
let answer: (call: Call) => { status: number; body: unknown };

const REAUTH = { status: 401, body: { error: "reauth_required", message: "Please sign in again to continue." } };
const GRADED = { status: 200, body: { ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67, annotatedSteps: [] } };

/** The server: refuses the stale token, accepts the fresh one. */
const staleRefusedFreshAccepted = (c: Call) =>
  c.headers.Authorization === "Bearer fresh-token" ? GRADED : REAUTH;

beforeEach(() => {
  calls = [];
  H.minted = 0;
  // A signed-in student whose CACHED token has expired: getIdToken() hands back the stale
  // one; only a FORCED refresh (getIdToken(true)) produces a token the server accepts.
  H.getIdToken.mockReset().mockImplementation(async (force?: boolean) => (force ? "fresh-token" : "stale-token"));
  H.currentUser = { uid: "stu-1", getIdToken: (force?: boolean) => H.getIdToken(force) };
  __resetFreeCheckAppCheckForTests();
  answer = staleRefusedFreshAccepted;
  vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string> }) => {
    const call = { url, headers: { ...init.headers } };
    calls.push(call);
    const r = answer(call);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => JSON.stringify(r.body) };
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a refused token is refreshed and the call re-sent once, silently", () => {
  it("★ an expired-token student is graded after the silent refresh, with no message shown", async () => {
    const out = await checkSolutionImage({ question: "Q", textAnswer: "an answer" });
    expect(out.marksAwarded).toBe(2);
    expect(calls.map((c) => c.headers.Authorization)).toEqual(["Bearer stale-token", "Bearer fresh-token"]);
    expect(calls.every((c) => c.headers["X-Lazytopper-Uid"] === "stu-1")).toBe(true);
    expect(H.getIdToken).toHaveBeenCalledWith(true);
  });

  it("★ the re-send carries the SAME Idempotency-Key as the first send — one check, one key", async () => {
    await checkSolutionImage({ question: "Q", textAnswer: "an answer" }, { surface: "check-improve" });
    expect(calls).toHaveLength(2);
    const keys = calls.map((c) => c.headers[IDEMPOTENCY_HEADER]);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    // Extra headers survive the refresh.
    expect(calls[1].headers["X-Lazytopper-Surface"]).toBe("check-improve");
  });

  it("★ the worksheet grade gets the same silent refresh, with the same key", async () => {
    answer = (c) =>
      c.headers.Authorization === "Bearer fresh-token"
        ? { status: 200, body: { ok: true, results: [], totalQuestions: 0, gradedCount: 0, pendingCount: 0 } }
        : REAUTH;
    const out = await gradeWorksheet({ worksheetId: "w", questions: [] }, { surface: "worksheet" });
    expect(out.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[1].headers[IDEMPOTENCY_HEADER]).toBe(calls[0].headers[IDEMPOTENCY_HEADER]);
    expect(calls[1].headers["X-Lazytopper-Surface"]).toBe("worksheet");
  });

  it("★ step-solution and the tutor recover the same way", async () => {
    answer = (c) =>
      c.headers.Authorization === "Bearer fresh-token"
        ? { status: 200, body: c.url.includes("tutor") ? { reply: "hello" } : { totalMarks: 3, steps: [] } }
        : REAUTH;
    const steps = await fetchStepSolution({ subject: "Maths", topic: "t", question: "Q", marks: 3 });
    expect(steps.totalMarks).toBe(3);
    const reply = await callTutor({ uid: "stu-1", topicKey: "k", topicLabel: "K", subject: "Maths", messages: [] } as never);
    expect(reply.reply).toBe("hello");
    expect(calls.map((c) => `${c.url} ${c.headers.Authorization}`)).toEqual([
      "/api/step-solution Bearer stale-token",
      "/api/step-solution Bearer fresh-token",
      "/api/tutor Bearer stale-token",
      "/api/tutor Bearer fresh-token",
    ]);
  });
});

describe("only a SECOND refusal reaches the student", () => {
  it("★ exactly ONE re-send; then the plain message \"Please sign in again to continue.\"", async () => {
    answer = () => REAUTH;
    let caught: unknown = null;
    try {
      await checkSolutionImage({ question: "Q", textAnswer: "an answer" });
    } catch (e) {
      caught = e;
    }
    expect(calls).toHaveLength(2);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).name).toBe("SignInAgainError");
    expect((caught as Error).message).toBe("Please sign in again to continue.");
    expect(REAUTH_MESSAGE).toBe("Please sign in again to continue.");
  });

  it("the tutor: exactly one re-send, then the same plain message", async () => {
    answer = () => REAUTH;
    await expect(
      callTutor({ uid: "stu-1", topicKey: "k", topicLabel: "K", subject: "Maths", messages: [] } as never),
    ).rejects.toMatchObject({ name: "SignInAgainError", message: "Please sign in again to continue." });
    expect(calls).toHaveLength(2);
  });

  it("CONTROL: a 402 premium_required is the server's answer — never re-sent, no token refresh", async () => {
    answer = () => ({ status: 402, body: { error: "premium_required", message: "Premium feature." } });
    await expect(checkSolutionImage({ question: "Q", textAnswer: "a" })).rejects.toMatchObject({ name: "PremiumRequiredError" });
    expect(calls).toHaveLength(1);
    expect(H.getIdToken).not.toHaveBeenCalledWith(true);
  });
});

describe("the signed-out free check is unchanged", () => {
  it("★ a signed-out free check carries no token and is never re-sent, even on a 401", async () => {
    H.currentUser = null;
    answer = () => REAUTH;
    await expect(checkSolutionImage({ question: "Q", textAnswer: "a" }, { freeCheck: true })).rejects.toBeTruthy();
    expect(calls).toHaveLength(1);
    const keys = Object.keys(calls[0].headers).map((k) => k.toLowerCase());
    expect(keys).not.toContain("authorization");
    expect(keys).not.toContain("x-lazytopper-uid");
    expect(calls[0].headers[FREE_CHECK_MARKER_HEADER]).toBe("1");
    expect(H.getIdToken).not.toHaveBeenCalled();
  });
});
