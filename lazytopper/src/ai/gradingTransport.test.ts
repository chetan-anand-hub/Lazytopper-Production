/**
 * LOW-END-1 PR-2 — the client half of "uploads that survive bad networks" (R1–R3), at
 * the transport boundary and through the REAL aiClient grading calls.
 *
 *   R1  90 s timeout per attempt; retry on network failure / timeout / 502-504 only, with
 *       exponential backoff + jitter, at most 2 retries; the SAME key on every retry.
 *   R2  stages from XHR upload progress; offline -> wait for `online`; a raw platform
 *       message never reaches a student.
 *   R3  a UUID per check attempt, sent as Idempotency-Key (randomUUID, with a fallback).
 *
 * MUTATIONS this file was verified against (each alone, restore verified by empty diff):
 *   M3  aiClient postGrading / sendGradingRequest: a NEW key per attempt -> "same key on every retry" RED
 *   M4  remove the timeout (fetch abort + xhr.timeout)                    -> both timeout pins RED
 *   M5  retry on any non-2xx (4xx included)                               -> "never retries a business answer" RED
 *
 * Scoped run:
 *   pnpm exec vitest run src/ai/gradingTransport.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "stu-1", Authorization: "Bearer t" }),
}));

import { checkSolutionImage, gradeWorksheet, FairUseLimitError, DailyLimitError } from "./aiClient";
import {
  GRADING_TIMEOUT_MS,
  GRADING_MAX_RETRIES,
  GradingNetworkError,
  IDEMPOTENCY_HEADER,
  RETRYABLE_STATUSES,
  __setGradingSleepForTests,
  backoffDelayMs,
  gradingErrorMessage,
  gradingStageLabel,
  newIdempotencyKey,
  sendGradingRequest,
  type GradingStage,
} from "./gradingTransport";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type Reply = { status: number; body: unknown } | "network-error" | "hang";
type Call = { url: string; headers: Record<string, string>; signal?: AbortSignal };

const OK: Reply = { status: 200, body: { ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67, annotatedSteps: [] } };

/** A fetch that answers from a script, one reply per call, and records each call. */
function scriptedFetch(script: Reply[]) {
  const calls: Call[] = [];
  const fetchMock = vi.fn((url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => {
    calls.push({ url, headers: { ...init.headers }, signal: init.signal });
    const reply = script[Math.min(calls.length - 1, script.length - 1)];
    if (reply === "network-error") return Promise.reject(new TypeError("Failed to fetch"));
    if (reply === "hang") {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
      });
    }
    return Promise.resolve({
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => JSON.stringify(reply.body),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const sleeps: number[] = [];

beforeEach(() => {
  sleeps.length = 0;
  __setGradingSleepForTests(async (ms) => {
    sleeps.push(ms);
  });
});

afterEach(() => {
  __setGradingSleepForTests(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("R3 · the idempotency key", () => {
  it("is a UUID made on the device, a fresh one per call", () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });

  it("falls back to getRandomValues on a browser without crypto.randomUUID", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (arr: Uint8Array) => real.getRandomValues(arr) });
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });

  it("never throws without Web Crypto at all (and is still unique per call)", () => {
    vi.stubGlobal("crypto", undefined);
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });

  it("check-solution and grade-worksheet send it as Idempotency-Key; a NEW call is a NEW key", async () => {
    const calls = scriptedFetch([OK]);
    await checkSolutionImage({ question: "Q", textAnswer: "x" }, { surface: "check-improve" });
    await checkSolutionImage({ question: "Q", textAnswer: "x" }, { surface: "check-improve" });
    await gradeWorksheet({ worksheetId: "w", questions: [] });
    expect(calls).toHaveLength(3);
    for (const c of calls) expect(c.headers[IDEMPOTENCY_HEADER]).toMatch(UUID_V4);
    expect(new Set(calls.map((c) => c.headers[IDEMPOTENCY_HEADER])).size).toBe(3);
    // The identity and surface headers are untouched.
    expect(calls[0].headers["X-Lazytopper-Surface"]).toBe("check-improve");
    expect(calls[0].headers.Authorization).toBe("Bearer t");
  });
});

describe("R1 · retry, with the SAME key", () => {
  it("★ a dropped connection is retried with the SAME key on every retry, and the grade comes back", async () => {
    const calls = scriptedFetch(["network-error", "network-error", OK]);
    const res = await checkSolutionImage({ question: "Q", textAnswer: "x" });
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(1 + GRADING_MAX_RETRIES);
    const keys = calls.map((c) => c.headers[IDEMPOTENCY_HEADER]);
    expect(keys[0]).toMatch(UUID_V4);
    expect(new Set(keys).size, `one attempt must reuse one key: ${keys.join(", ")}`).toBe(1);
  });

  it("at most 2 retries; then a plain-sentence GradingNetworkError, never 'Failed to fetch'", async () => {
    const calls = scriptedFetch(["network-error"]);
    const err = await checkSolutionImage({ question: "Q", textAnswer: "x" }).catch((e: unknown) => e);
    expect(calls).toHaveLength(3);
    expect(err).toBeInstanceOf(GradingNetworkError);
    expect((err as Error).message).not.toMatch(/failed to fetch/i);
    expect((err as Error).message).toMatch(/connection dropped/);
  });

  it("502 / 503 / 504 are retried (same key) and the last answer is returned to the caller", async () => {
    expect([...RETRYABLE_STATUSES].sort()).toEqual([502, 503, 504]);
    const calls = scriptedFetch([{ status: 502, body: {} }, { status: 504, body: {} }, OK]);
    const res = await gradeWorksheet({ worksheetId: "w", questions: [] });
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(new Set(calls.map((c) => c.headers[IDEMPOTENCY_HEADER])).size).toBe(1);
  });

  it("★ never retries a business answer: 409 trial_limit, 429 daily_limit, 400, 402, 500 — ONE send each", async () => {
    let calls = scriptedFetch([{ status: 409, body: { error: "trial_limit", remaining: 0, resetAt: "2026-10-04T18:30:00.000Z" } }]);
    await expect(checkSolutionImage({ question: "Q" })).rejects.toBeInstanceOf(FairUseLimitError);
    expect(calls).toHaveLength(1);
    calls = scriptedFetch([{ status: 429, body: { error: "daily_limit", class: "vision" } }]);
    await expect(checkSolutionImage({ question: "Q" })).rejects.toBeInstanceOf(DailyLimitError);
    expect(calls).toHaveLength(1);
    for (const status of [400, 402, 500]) {
      calls = scriptedFetch([{ status, body: { error: "Missing question text" } }]);
      await checkSolutionImage({ question: "Q" }).catch(() => {});
      expect(calls, `status ${status} was re-sent`).toHaveLength(1);
    }
    expect(sleeps).toEqual([]);
  });

  it("backs off exponentially with jitter: retry 1 in [1 s, 2 s), retry 2 in [2 s, 4 s)", async () => {
    scriptedFetch(["network-error"]);
    await checkSolutionImage({ question: "Q" }).catch(() => {});
    expect(sleeps).toHaveLength(2);
    expect(sleeps[0]).toBeGreaterThanOrEqual(1000);
    expect(sleeps[0]).toBeLessThan(2000);
    expect(sleeps[1]).toBeGreaterThanOrEqual(2000);
    expect(sleeps[1]).toBeLessThan(4000);
    expect(backoffDelayMs(1, 0)).toBe(1000);
    expect(backoffDelayMs(2, 0.5)).toBe(3000);
  });
});

describe("R1 · the 90 s timeout", () => {
  it("★ fetch path: an attempt that hangs is abandoned at 90 s and retried (same key)", async () => {
    vi.useFakeTimers();
    const calls = scriptedFetch(["hang", OK]);
    const pending = checkSolutionImage({ question: "Q" });
    await vi.advanceTimersByTimeAsync(GRADING_TIMEOUT_MS - 1);
    expect(calls, "nothing may give up before 90 s").toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2);
    const res = await pending;
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0].signal?.aborted).toBe(true);
    expect(calls[1].headers[IDEMPOTENCY_HEADER]).toBe(calls[0].headers[IDEMPOTENCY_HEADER]);
    expect(GRADING_TIMEOUT_MS).toBe(90_000);
  });

  it("every attempt timing out ends in a plain 'took too long' sentence", async () => {
    vi.useFakeTimers();
    scriptedFetch(["hang"]);
    const pending = checkSolutionImage({ question: "Q" }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(GRADING_TIMEOUT_MS * 3 + 10);
    const err = await pending;
    expect(err).toBeInstanceOf(GradingNetworkError);
    expect((err as GradingNetworkError).reason).toBe("timeout");
    expect((err as Error).message).toMatch(/took too long/);
  });
});

/* ── XHR (stages) ─────────────────────────────────────────────────────────── */

type XhrScript = { status?: number; body?: string; fail?: "error" | "timeout" };
const xhrs: FakeXHR[] = [];
let xhrScript: XhrScript[] = [];

class FakeXHR {
  static readonly instances = xhrs;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  timeout = 0;
  status = 0;
  responseText = "";
  sentBody: string | null = null;
  upload: { onprogress: ((e: ProgressEvent) => void) | null; onload: (() => void) | null } = { onprogress: null, onload: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  constructor() {
    xhrs.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: string) {
    this.sentBody = body;
    const step = xhrScript[Math.min(xhrs.length - 1, xhrScript.length - 1)];
    queueMicrotask(() => {
      if (step.fail === "error") return this.onerror?.();
      if (step.fail === "timeout") return this.ontimeout?.();
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
      this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 } as ProgressEvent);
      this.upload.onload?.();
    });
  }
  /** The server answers (called by the test). */
  respond() {
    const step = xhrScript[Math.min(xhrs.indexOf(this), xhrScript.length - 1)];
    this.status = step.status ?? 200;
    this.responseText = step.body ?? JSON.stringify((OK as { body: unknown }).body);
    this.onload?.();
  }
}

describe("R2 · stages over XHR (only when a stage listener is passed)", () => {
  beforeEach(() => {
    xhrs.length = 0;
    xhrScript = [{}];
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
  });

  it("★ Uploading 0% -> 50% -> 100% -> Sent ✓ -> Grading… -> Done, with the key and a 90 s timeout", async () => {
    vi.useFakeTimers();
    const stages: GradingStage[] = [];
    const pending = checkSolutionImage({ question: "Q", imageBase64: "AAAA" }, { surface: "check-improve", onStage: (s) => stages.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    expect(xhrs).toHaveLength(1);
    expect(xhrs[0].timeout).toBe(GRADING_TIMEOUT_MS);
    expect(xhrs[0].headers[IDEMPOTENCY_HEADER]).toMatch(UUID_V4);
    expect(xhrs[0].headers["X-Lazytopper-Surface"]).toBe("check-improve");
    await vi.advanceTimersByTimeAsync(1000);
    xhrs[0].respond();
    const res = await pending;
    expect(res.ok).toBe(true);
    expect(stages.map(gradingStageLabel)).toEqual([
      "Uploading 0%",
      "Uploading 50%",
      "Uploading 100%",
      "Sent ✓",
      "Grading…",
      "Done",
    ]);
  });

  it("an XHR network error / timeout is retried with the same key", async () => {
    xhrScript = [{ fail: "error" }, { fail: "timeout" }, {}];
    const stages: GradingStage[] = [];
    const pending = sendGradingRequest("/api/check-solution", { "Content-Type": "application/json" }, "{}", {
      idempotencyKey: "k-0000000000000000",
      onStage: (s) => stages.push(s),
    });
    for (let i = 0; i < 20 && xhrs.length < 3; i += 1) await new Promise((r) => setTimeout(r, 0));
    expect(xhrs).toHaveLength(3);
    xhrs[2].respond();
    const res = await pending;
    expect(res.status).toBe(200);
    expect(new Set(xhrs.map((x) => x.headers[IDEMPOTENCY_HEADER]))).toEqual(new Set(["k-0000000000000000"]));
    expect(stages.filter((s) => s.kind === "retrying").map((s) => (s as { attempt: number }).attempt)).toEqual([1, 2]);
  });

  it("without a listener the request goes by fetch (no XHR) — existing callers are unchanged", async () => {
    const calls = scriptedFetch([OK]);
    await checkSolutionImage({ question: "Q" });
    expect(xhrs).toHaveLength(0);
    expect(calls).toHaveLength(1);
  });
});

describe("R2 · offline: wait, then send on `online` — the caller's photo is untouched", () => {
  it("★ says so, sends nothing while offline, and sends the moment the browser is back", async () => {
    let online = false;
    vi.spyOn(window.navigator, "onLine", "get").mockImplementation(() => online);
    const calls = scriptedFetch([OK]);
    const stages: GradingStage[] = [];
    xhrs.length = 0;
    xhrScript = [{}];
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    const pending = checkSolutionImage({ question: "Q", imageBase64: "AAAA" }, { onStage: (s) => stages.push(s) });
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
    expect(stages.map(gradingStageLabel)).toEqual(["You're offline — we'll send it when you're back"]);
    expect(xhrs, "nothing may be sent while offline").toHaveLength(0);
    online = true;
    window.dispatchEvent(new Event("online"));
    for (let i = 0; i < 5 && xhrs.length === 0; i += 1) await new Promise((r) => setTimeout(r, 0));
    expect(xhrs).toHaveLength(1);
    expect(JSON.parse(xhrs[0].sentBody!).imageBase64).toBe("AAAA");
    xhrs[0].respond();
    expect((await pending).ok).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe("R2 · a plain sentence, never a raw platform message", () => {
  const FALLBACK = "We couldn't grade your worksheet just now. Please try again.";
  it.each([
    ["Failed to fetch", new TypeError("Failed to fetch")],
    ["Firefox", new TypeError("NetworkError when attempting to fetch resource.")],
    ["Safari", new TypeError("Load failed")],
    ["generic", new Error("AI API request failed")],
    ["a machine code", new Error("premium_required")],
    ["JSON", new SyntaxError("Unexpected token < in JSON at position 0")],
    ["Invalid JSON", new Error("Invalid JSON")],
  ])("%s -> the fallback sentence", (_label, err) => {
    expect(gradingErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it("student-facing errors and the server's own plain sentences are kept", () => {
    const net = new GradingNetworkError("network");
    expect(gradingErrorMessage(net, FALLBACK)).toBe(net.message);
    expect(gradingErrorMessage(new Error("Failed to evaluate solution. Please try again."), FALLBACK)).toBe(
      "Failed to evaluate solution. Please try again.",
    );
    const signIn = Object.assign(new Error("Please sign in again to check your answer."), { name: "SignInAgainError" });
    expect(gradingErrorMessage(signIn, FALLBACK)).toBe(signIn.message);
    expect(gradingErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });
});
