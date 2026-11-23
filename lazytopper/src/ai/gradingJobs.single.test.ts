// @vitest-environment node
/**
 * GRADE-SINGLE-JOB-1 — a ONE-question Answer Checker check (POST /api/check-solution) through the job
 * contract, pinned at the fetch boundary THROUGH the real `aiClient.checkSolutionImage` (only the identity
 * headers are stubbed; the server's answers are scripted per request).
 *
 *   · without `singleJob` nothing changes (no Prefer, no poll);
 *   · with it, a 200 (server switch GRADING_SINGLE_JOBS off) is today's answer — same request bytes;
 *   · a 202 polls to `done` and returns `final` as the check's body; stages: Grading… → (30 s) Taking a little
 *     longer than usual → Done; a 404 falls back to a synchronous check with a NEW key; an interrupted job is an
 *     honest ok:false; a poll that gave up is RESUMED (never re-submitted) when the same answer is checked again;
 *   · the free check never asks for a job; typed refusals still throw.
 *
 * Scoped run: pnpm exec vitest run src/ai/gradingJobs.single.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  REAUTH_MESSAGE: "Please sign in again to continue.",
  SignInAgainError: class SignInAgainError extends Error {
    constructor(m: string) {
      super(m);
      this.name = "SignInAgainError";
    }
  },
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "stu-1", Authorization: "Bearer t" }),
}));

vi.mock("../services/freeCheckClient", () => ({
  freeCheckJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Free-Check": "1" }),
}));

import { checkSolutionImage, type CheckSolutionResponse } from "./aiClient";
import { __setGradingSleepForTests, GRADING_SLOW_STAGE_MS, IDEMPOTENCY_HEADER, type GradingStage } from "./gradingTransport";
import {
  __setGradingJobTimersForTests,
  memoryJobStore,
  PREFER_ASYNC_VALUE,
  PREFER_HEADER,
  SINGLE_JOB_INTERRUPTED_MESSAGE,
} from "./gradingJobs";

const JOB_ID = "b".repeat(40);
const POLL = `/api/grade-worksheet/jobs/${JOB_ID}`;
const REQ = { question: "Solve 2x + 3 = 17.", marks: 3, subject: "Maths", topic: "Linear Equations", textAnswer: "x = 7" };
const BODY: CheckSolutionResponse = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 3,
  percentage: 100,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "Clear.",
  couldNotRead: false,
};
const ACCEPTED = { ok: true, jobId: JOB_ID, state: "running", total: 1, pollAfterMs: 2500, pollPath: POLL };
const RUNNING = { ok: true, jobId: JOB_ID, state: "running", total: 1, done: 0, pollAfterMs: 2500, results: [] };
const DONE = { ok: true, jobId: JOB_ID, state: "done", total: 1, done: 1, model: "m", results: [{ index: 0, final: true, qNumber: 1 }], final: BODY };

type Req = { url: string; method: string; headers: Record<string, string>; body: string | null };
type Reply = { status: number; body: unknown } | "network";
let requests: Req[] = [];
let script: Array<(r: Req) => Reply> = [];

beforeEach(() => {
  requests = [];
  script = [];
  __setGradingSleepForTests(async () => {});
  __setGradingJobTimersForTests({ sleep: async () => {}, now: () => 1_000_000 });
  vi.stubGlobal("fetch", async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string }) => {
    const req: Req = { url, method: init.method ?? "GET", headers: { ...(init.headers ?? {}) }, body: init.body ?? null };
    requests.push(req);
    const next = script.shift();
    if (!next) throw new Error(`unscripted request ${req.method} ${url}`);
    const reply = next(req);
    if (reply === "network") throw new TypeError("Failed to fetch");
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => JSON.stringify(reply.body) };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  __setGradingSleepForTests(null);
  __setGradingJobTimersForTests({ sleep: null, now: null });
  memoryJobStore("check-solution").clear();
});

const posts = () => requests.filter((r) => r.method === "POST");
const polls = () => requests.filter((r) => r.method === "GET");
const CALL = { surface: "check-improve" as const, singleJob: true };

describe("GRADE-SINGLE-JOB-1 · today's answer when there is no job", () => {
  it("without singleJob nothing changes: no Prefer header, no poll", async () => {
    script = [() => ({ status: 200, body: BODY })];
    const out = await checkSolutionImage(REQ, { surface: "check-improve" });
    expect(out).toEqual(BODY);
    expect(posts()).toHaveLength(1);
    expect(posts()[0].url).toBe("/api/check-solution");
    expect(posts()[0].headers[PREFER_HEADER]).toBeUndefined();
    expect(polls()).toHaveLength(0);
  });

  it("with singleJob, a 200 (switch off) is today's answer: the same body bytes, Prefer added, nothing polled; Done once", async () => {
    script = [() => ({ status: 200, body: BODY })];
    await checkSolutionImage(REQ, { surface: "check-improve" });
    const plain = posts()[0];
    requests = [];
    script = [() => ({ status: 200, body: BODY })];
    const stages: GradingStage[] = [];
    const out = await checkSolutionImage(REQ, { ...CALL, onStage: (s) => stages.push(s) });
    expect(out).toEqual(BODY);
    expect(posts()).toHaveLength(1);
    expect(posts()[0].body).toBe(plain.body);
    expect(posts()[0].headers[PREFER_HEADER]).toBe(PREFER_ASYNC_VALUE);
    expect(posts()[0].headers["X-Lazytopper-Surface"]).toBe("check-improve");
    expect(polls()).toHaveLength(0);
    expect(stages.filter((s) => s.kind === "done")).toHaveLength(1);
  });

  it("today's typed refusals still throw (409 trial_limit, 402)", async () => {
    script = [() => ({ status: 409, body: { ok: false, error: "trial_limit", remaining: 0 } })];
    await expect(checkSolutionImage(REQ, CALL)).rejects.toMatchObject({ name: "FairUseLimitError" });
    script = [() => ({ status: 402, body: { error: "premium_required", feature: "check-solution" } })];
    await expect(checkSolutionImage(REQ, CALL)).rejects.toBeTruthy();
    expect(polls()).toHaveLength(0);
  });

  it("the signed-out free check never asks for a job (free headers, no Prefer)", async () => {
    script = [() => ({ status: 200, body: BODY })];
    await checkSolutionImage(REQ, { ...CALL, freeCheck: true });
    expect(posts()[0].headers[PREFER_HEADER]).toBeUndefined();
    expect(posts()[0].headers["X-Lazytopper-Free-Check"]).toBe("1");
    expect(polls()).toHaveLength(0);
  });
});

describe("GRADE-SINGLE-JOB-1 · a 202 polls to done", () => {
  it("pending → running → done returns `final` as the check body; stages Grading… then Done (never a premature Done)", async () => {
    const stages: GradingStage[] = [];
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => ({ status: 200, body: RUNNING }),
      () => ({ status: 200, body: RUNNING }),
      () => ({ status: 200, body: DONE }),
    ];
    const out = await checkSolutionImage(REQ, { ...CALL, onStage: (s) => stages.push(s) });
    expect(out).toEqual(BODY);
    expect(posts()).toHaveLength(1);
    expect(posts()[0].headers[IDEMPOTENCY_HEADER]).toMatch(/^[A-Za-z0-9-]{16,64}$/);
    expect(polls().map((p) => p.url)).toEqual([POLL, POLL, POLL]);
    expect(polls()[0].headers.Authorization).toBe("Bearer t");
    expect(stages.map((s) => s.kind)).toEqual(["grading", "done"]);
    expect(memoryJobStore("check-solution").read()).toBeNull();
  });

  it("a slow job shows 'Taking a little longer than usual' after GRADING_SLOW_STAGE_MS, then Done", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    __setGradingJobTimersForTests({ sleep: async (ms) => { vi.advanceTimersByTime(ms); }, now: () => 1_000_000 });
    const stages: GradingStage[] = [];
    const runningPolls = Math.ceil(GRADING_SLOW_STAGE_MS / 2500) + 2;
    script = [() => ({ status: 202, body: ACCEPTED }), ...Array.from({ length: runningPolls }, () => () => ({ status: 200, body: RUNNING })), () => ({ status: 200, body: DONE })];
    const out = await checkSolutionImage(REQ, { ...CALL, onStage: (s) => stages.push(s) });
    expect(out).toEqual(BODY);
    expect(stages).toEqual([{ kind: "grading" }, { kind: "retrying", attempt: 0, reason: "slow" }, { kind: "done" }]);
  });

  it("a failed job's final (ok:false) is returned as the body the sync path would carry", async () => {
    const failed = { ok: false, error: "Failed to evaluate solution. Please try again." };
    script = [() => ({ status: 202, body: ACCEPTED }), () => ({ status: 200, body: { ...DONE, final: failed } })];
    const out = await checkSolutionImage(REQ, CALL);
    expect(out).toEqual(failed);
  });

  it("a 404 mid-poll falls back to a synchronous check with a NEW key and no Prefer", async () => {
    script = [() => ({ status: 202, body: ACCEPTED }), () => ({ status: 404, body: { ok: false, error: "job_not_found" } }), () => ({ status: 200, body: BODY })];
    const out = await checkSolutionImage(REQ, CALL);
    expect(out).toEqual(BODY);
    expect(posts()).toHaveLength(2);
    expect(posts()[1].headers[PREFER_HEADER]).toBeUndefined();
    expect(posts()[1].headers[IDEMPOTENCY_HEADER]).not.toBe(posts()[0].headers[IDEMPOTENCY_HEADER]);
    expect(posts()[1].body).toBe(posts()[0].body);
  });

  it("an interrupted job (redeploy) is an honest ok:false that says the student was not charged", async () => {
    const interrupted = { ok: true, jobId: JOB_ID, state: "interrupted", total: 1, done: 1, results: [{ index: 0, final: true, qNumber: 1, couldNotRead: true, notGraded: "interrupted" }] };
    script = [() => ({ status: 202, body: ACCEPTED }), () => ({ status: 200, body: interrupted })];
    const out = await checkSolutionImage(REQ, CALL);
    expect(out).toEqual({ ok: false, error: SINGLE_JOB_INTERRUPTED_MESSAGE });
  });

  it("a poll that gives up is RESUMED (no second submit, no second charge) when the SAME answer is checked again; a new answer is a new check", async () => {
    script = [() => ({ status: 202, body: ACCEPTED }), ...Array.from({ length: 6 }, () => () => "network" as const)];
    await expect(checkSolutionImage(REQ, CALL)).rejects.toMatchObject({ name: "GradingNetworkError" });
    expect(memoryJobStore("check-solution").read()?.jobId).toBe(JOB_ID);
    requests = [];
    script = [() => ({ status: 200, body: DONE })];
    const out = await checkSolutionImage(REQ, CALL);
    expect(out).toEqual(BODY);
    expect(posts()).toHaveLength(0);
    expect(polls()).toHaveLength(1);
    // a different answer is a new check (the kept job is dropped)
    script = [() => ({ status: 202, body: ACCEPTED }), ...Array.from({ length: 6 }, () => () => "network" as const)];
    await expect(checkSolutionImage(REQ, CALL)).rejects.toMatchObject({ name: "GradingNetworkError" });
    requests = [];
    script = [() => ({ status: 200, body: BODY })];
    await checkSolutionImage({ ...REQ, textAnswer: "x = 8" }, CALL);
    expect(posts()).toHaveLength(1);
  });
});
