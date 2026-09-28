// @vitest-environment node
/**
 * FAIR-USE-2 — the client half: F3 (paper passes minted once per paper and sent with
 * the grade) and F4 (FairUseLimitError for the 409 trial_limit / 429 usage_limit bodies).
 *
 * Node environment for the same reason as dailyLimit.test.ts: nothing here touches the
 * DOM, and a jsdom environment per file is the suite's largest memory cost.
 *
 * Scoped run:
 *   pnpm exec vitest run src/ai/aiClient.fairUse.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const H = vi.hoisted(() => ({ uid: "stu-1" as string | null }));

vi.mock("./paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  paidJsonHeaders: async () => ({
    "Content-Type": "application/json",
    ...(H.uid ? { "X-Lazytopper-Uid": H.uid, Authorization: `Bearer token-${H.uid}` } : {}),
  }),
}));

import {
  DailyLimitError,
  FairUseLimitError,
  isFairUseLimitError,
  gradeWorksheet,
  checkSolutionImage,
  PAPER_PASS_ENDPOINT,
  PAPER_PASS_HEADER,
  resetPaperPassCacheForTests,
  type PaidCallOptions,
} from "./aiClient";

type Reply = { status: number; body: unknown };
type Call = { url: string; headers: Record<string, string>; body: unknown };

const GRADE_OK: Reply = { status: 200, body: { ok: true, results: [] } };

/** A fetch that answers the mint and the grade separately and records every call. */
function stubFetch(routes: { mint?: Reply | (() => Reply) | "network-error"; grade?: Reply }) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, headers: { ...(init?.headers ?? {}) }, body: init?.body ? JSON.parse(init.body) : undefined });
    let reply: Reply;
    if (url === PAPER_PASS_ENDPOINT) {
      if (routes.mint === "network-error") throw new TypeError("Failed to fetch");
      reply = typeof routes.mint === "function" ? routes.mint() : routes.mint ?? { status: 404, body: {} };
    } else {
      reply = routes.grade ?? GRADE_OK;
    }
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => JSON.stringify(reply.body),
    };
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    calls,
    mints: () => calls.filter((c) => c.url === PAPER_PASS_ENDPOINT),
    grades: () => calls.filter((c) => c.url !== PAPER_PASS_ENDPOINT),
  };
}

const REQ = { worksheetId: "ct-1", subject: "Maths", questions: [] };
const CT: PaidCallOptions = { surface: "chapter-test", paperKey: "ct-1" };

beforeEach(() => {
  H.uid = "stu-1";
  resetPaperPassCacheForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("F4 · fair-use refusals are a typed FairUseLimitError", () => {
  it("409 trial_limit -> kind trial_limit with remaining + resetAt, window null", async () => {
    stubFetch({ grade: { status: 409, body: { error: "trial_limit", remaining: 2, resetAt: "2026-09-28T18:30:00.000Z" } } });
    const err = await gradeWorksheet(REQ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FairUseLimitError);
    expect(isFairUseLimitError(err)).toBe(true);
    const e = err as FairUseLimitError;
    expect(e.name).toBe("FairUseLimitError");
    expect(e.kind).toBe("trial_limit");
    expect(e.remaining).toBe(2);
    expect(e.resetAt).toBe("2026-09-28T18:30:00.000Z");
    expect(e.window).toBeNull();
    expect(e.message).not.toMatch(/trial_limit/);
  });

  it("429 usage_limit -> kind usage_limit with window + resetAt, remaining null", async () => {
    stubFetch({ grade: { status: 429, body: { error: "usage_limit", window: "week", resetAt: "2026-10-02T18:30:00.000Z" } } });
    const err = (await checkSolutionImage({ question: "q" }).catch((e: unknown) => e)) as FairUseLimitError;
    expect(err).toBeInstanceOf(FairUseLimitError);
    expect(err.kind).toBe("usage_limit");
    expect(err.window).toBe("week");
    expect(err.remaining).toBeNull();
    expect(err.resetAt).toBe("2026-10-02T18:30:00.000Z");
    expect(err.message).not.toMatch(/usage_limit/);
  });

  it("an unknown window / non-numeric remaining is null, never invented", async () => {
    stubFetch({ grade: { status: 429, body: { error: "usage_limit", window: "month" } } });
    const u = (await gradeWorksheet(REQ).catch((e: unknown) => e)) as FairUseLimitError;
    expect(u.window).toBeNull();
    expect(u.resetAt).toBeNull();
    stubFetch({ grade: { status: 409, body: { error: "trial_limit", remaining: "2" } } });
    const t = (await gradeWorksheet(REQ).catch((e: unknown) => e)) as FairUseLimitError;
    expect(t.remaining).toBeNull();
  });

  it("the existing 429 daily_limit branch is unchanged — still a DailyLimitError", async () => {
    stubFetch({ grade: { status: 429, body: { error: "daily_limit", class: "vision", resetAt: "x" } } });
    const err = await gradeWorksheet(REQ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DailyLimitError);
    expect(isFairUseLimitError(err)).toBe(false);
  });
});

describe("F3 · a paper mints ONE server pass and sends it with the grade", () => {
  it("mints once per paper (verified identity, {surface, paperKey}) and sends X-Lazytopper-Paper on every grade of it", async () => {
    const f = stubFetch({ mint: { status: 200, body: { token: "pass-ct-1" } } });
    await gradeWorksheet(REQ, CT);
    await gradeWorksheet(REQ, CT); // a re-upload of the same paper
    expect(f.mints()).toHaveLength(1);
    expect(f.mints()[0].body).toEqual({ surface: "chapter-test", paperKey: "ct-1" });
    expect(f.mints()[0].headers.Authorization).toBe("Bearer token-stu-1");
    for (const g of f.grades()) {
      expect(g.headers[PAPER_PASS_HEADER]).toBe("pass-ct-1");
      expect(g.headers["X-Lazytopper-Surface"]).toBe("chapter-test");
    }
    expect(f.grades()).toHaveLength(2);
  });

  it("a different paper, surface or account mints its own pass", async () => {
    let n = 0;
    const f = stubFetch({ mint: () => ({ status: 200, body: { token: `pass-${++n}` } }) });
    await gradeWorksheet(REQ, CT);
    await gradeWorksheet(REQ, { surface: "chapter-test", paperKey: "ct-2" });
    await gradeWorksheet(REQ, { surface: "full-mock", paperKey: "ct-1" });
    H.uid = "stu-2";
    await gradeWorksheet(REQ, CT);
    expect(f.mints()).toHaveLength(4);
    expect(f.grades().map((g) => g.headers[PAPER_PASS_HEADER])).toEqual(["pass-1", "pass-2", "pass-3", "pass-4"]);
  });

  it("the pass is re-minted after 23 h (the server honours it for 24 h)", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 8, 28, 6, 0, 0), toFake: ["Date"] });
    const f = stubFetch({ mint: { status: 200, body: { token: "p" } } });
    await gradeWorksheet(REQ, CT);
    vi.setSystemTime(Date.UTC(2026, 8, 28, 6, 0, 0) + 23 * 60 * 60 * 1000 - 1);
    await gradeWorksheet(REQ, CT);
    expect(f.mints()).toHaveLength(1);
    vi.setSystemTime(Date.UTC(2026, 8, 28, 6, 0, 0) + 23 * 60 * 60 * 1000);
    await gradeWorksheet(REQ, CT);
    expect(f.mints()).toHaveLength(2);
  });

  it("503 (passes not configured — the dark state): graded WITHOUT a pass, no error, and no retry storm", async () => {
    const f = stubFetch({ mint: { status: 503, body: { error: "paper_pass_unavailable" } } });
    const r1 = await gradeWorksheet(REQ, CT);
    const r2 = await gradeWorksheet(REQ, { surface: "worksheet", paperKey: "ws-9" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(f.grades()).toHaveLength(2);
    for (const g of f.grades()) expect(g.headers[PAPER_PASS_HEADER]).toBeUndefined();
    expect(f.mints()).toHaveLength(1);
  });

  it("a network fault or any other mint failure: graded without a pass, never a student-visible error", async () => {
    for (const mint of ["network-error", { status: 500, body: {} }, { status: 401, body: { error: "sign_in_required" } },
      { status: 200, body: { nope: true } }] as const) {
      resetPaperPassCacheForTests();
      const f = stubFetch({ mint });
      const res = await gradeWorksheet(REQ, CT);
      expect(res.ok).toBe(true);
      expect(f.grades()).toHaveLength(1);
      expect(f.grades()[0].headers[PAPER_PASS_HEADER]).toBeUndefined();
    }
  });

  it("a mint refused by fair use (enforcement on) throws FairUseLimitError and grades nothing", async () => {
    const f = stubFetch({ mint: { status: 409, body: { error: "trial_limit", remaining: 0, resetAt: "2026-09-28T18:30:00.000Z" } } });
    const err = await gradeWorksheet(REQ, CT).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FairUseLimitError);
    expect((err as FairUseLimitError).kind).toBe("trial_limit");
    expect(f.grades()).toHaveLength(0);
  });

  it("no mint for: signed out, a per-question surface, or a paper with no key", async () => {
    const f = stubFetch({ mint: { status: 200, body: { token: "p" } } });
    await gradeWorksheet(REQ, { surface: "quick-practice", paperKey: "qp:1" });
    await gradeWorksheet(REQ, { surface: "check-improve" });
    await gradeWorksheet(REQ, { surface: "chapter-test" });
    await gradeWorksheet(REQ, { surface: "chapter-test", paperKey: "   " });
    await gradeWorksheet(REQ);
    H.uid = null;
    await gradeWorksheet(REQ, CT);
    expect(f.mints()).toHaveLength(0);
    expect(f.grades()).toHaveLength(6);
    for (const g of f.grades()) expect(g.headers[PAPER_PASS_HEADER]).toBeUndefined();
  });
});
