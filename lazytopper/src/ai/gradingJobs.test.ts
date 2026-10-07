// @vitest-environment node
/**
 * GRADING-JOBS-1 J2 — the shared background-grading client (contract v1.0 §1–§9, §11), pinned
 * at the fetch boundary THROUGH the real `aiClient.gradeWorksheet`, with only the identity
 * headers stubbed and the server's answers scripted per request.
 *
 * MUTATIONS this file turns RED (each applied alone, seen red, restored — see the J2 report):
 *   M1  drop the 200 fallback (treat every submit as a job)     -> "a 200 is today's answer…"
 *   M2  render final:false as marks                              -> GradingJobRows.test.tsx
 *   M3  do not persist the job before polling                    -> "a reload mid-poll resumes…"
 *   M4  send the opt-in from the free check                      -> "the free check never…"
 *   M5  treat a 404 as an empty result                           -> "a 404 mid-poll falls back…"
 *
 * Scoped run:
 *   pnpm exec vitest run src/ai/gradingJobs.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const H = vi.hoisted(() => ({ forced: 0 }));

vi.mock("./paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  REAUTH_MESSAGE: "Please sign in again to continue.",
  SignInAgainError: class SignInAgainError extends Error {
    constructor(m: string) {
      super(m);
      this.name = "SignInAgainError";
    }
  },
  paidJsonHeaders: async (opts?: { forceRefresh?: boolean }) => {
    if (opts?.forceRefresh) H.forced += 1;
    return {
      "Content-Type": "application/json",
      "X-Lazytopper-Uid": "stu-1",
      Authorization: opts?.forceRefresh ? "Bearer fresh" : "Bearer t",
    };
  },
}));

vi.mock("../services/freeCheckClient", () => ({
  freeCheckJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Free-Check": "1" }),
}));

import { checkSolutionImage, gradeWorksheet, type WorksheetGradeResponse } from "./aiClient";
import { __setGradingSleepForTests, GradingNetworkError, IDEMPOTENCY_HEADER } from "./gradingTransport";
import {
  __setGradingJobTimersForTests,
  GradingJobGoneError,
  GradingJobInterruptedError,
  JOB_TTL_MS,
  MAX_CONSECUTIVE_POLL_FAILURES,
  PREFER_ASYNC_VALUE,
  PREFER_HEADER,
  safePollPath,
  type GradingJobProgress,
  type GradingJobStore,
  type StoredGradingJob,
} from "./gradingJobs";

/* ── fixtures ─────────────────────────────────────────────────────────────── */

const JOB_ID = "a".repeat(40);
const POLL = `/api/grade-worksheet/jobs/${JOB_ID}`;
const REQ = {
  worksheetId: "ws-1",
  subject: "Maths",
  questions: [1, 2, 3].map((n) => ({ qNumber: n, marks: 2, questionText: `Question ${n}` })),
  imageBase64: "QUFB",
  imageMimeType: "application/pdf",
};

const graded = (qNumber: number, marksAwarded: number) => ({
  qNumber,
  totalMarks: 2,
  marksAwarded,
  percentage: marksAwarded * 50,
  couldNotRead: false,
  annotatedSteps: [],
  notGraded: null,
});
const FINAL: WorksheetGradeResponse = {
  ok: true,
  worksheetId: "ws-1",
  results: [graded(1, 2), graded(2, 1), graded(3, 0)] as WorksheetGradeResponse["results"],
  totalQuestions: 3,
  gradedCount: 3,
  pendingCount: 0,
  gradedMarksAwarded: 3,
  gradedMarksTotal: 6,
  worksheetTotalMarks: 6,
  summary: "Server summary",
};
const ACCEPTED = { ok: true, jobId: JOB_ID, state: "running", total: 3, pollAfterMs: 2500, pollPath: POLL };
const row = (index: number, final: boolean, extra: Record<string, unknown> = {}) => ({
  index,
  final,
  ...graded(index + 1, index === 0 ? 2 : 1),
  ...extra,
});
const interruptedRow = (index: number) => ({
  index,
  final: true,
  qNumber: index + 1,
  couldNotRead: true,
  totalMarks: 2,
  marksAwarded: 0,
  note: "Not graded — the check was interrupted before this question was marked. You have not been charged for it; grade it again.",
  notGraded: "interrupted",
});

/* ── the scripted server ──────────────────────────────────────────────────── */

type Req = { url: string; method: string; headers: Record<string, string>; body: string | null };
type Reply = { status: number; body: unknown; headers?: Record<string, string> } | "network";
let requests: Req[] = [];
let script: Array<(r: Req) => Reply> = [];

function memoryStore(initial: StoredGradingJob | null = null): GradingJobStore & { value: StoredGradingJob | null; writes: number } {
  const s = {
    value: initial,
    writes: 0,
    read: () => s.value,
    write: (rec: StoredGradingJob) => {
      s.value = rec;
      s.writes += 1;
    },
    clear: () => {
      s.value = null;
    },
  };
  return s;
}

let clock = 1_000_000;

beforeEach(() => {
  requests = [];
  script = [];
  H.forced = 0;
  clock = 1_000_000;
  __setGradingSleepForTests(async () => {});
  __setGradingJobTimersForTests({ sleep: async () => {}, now: () => clock });
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
  vi.unstubAllGlobals();
  __setGradingSleepForTests(null);
  __setGradingJobTimersForTests({ sleep: null, now: null });
});

const posts = () => requests.filter((r) => r.method === "POST");
const polls = () => requests.filter((r) => r.method === "GET");

/* ── §1 / §8: a 200 is today's answer ─────────────────────────────────────── */

describe("§1/§8 — a 200 is today's answer, handled exactly as today", () => {
  it("without opts.job nothing changes: no Prefer header, no poll", async () => {
    script = [() => ({ status: 200, body: FINAL })];
    const out = await gradeWorksheet(REQ, { surface: "worksheet" });
    expect(out).toEqual(FINAL);
    expect(posts()).toHaveLength(1);
    expect(posts()[0].headers[PREFER_HEADER]).toBeUndefined();
    expect(polls()).toHaveLength(0);
  });

  it("a 200 is today's answer even with the opt-in: same body bytes, the body returned untouched, nothing stored", async () => {
    script = [() => ({ status: 200, body: FINAL })];
    const plain = await gradeWorksheet(REQ, { surface: "worksheet" });
    const plainBody = posts()[0].body;
    requests = [];
    script = [() => ({ status: 200, body: FINAL })];
    const store = memoryStore();
    const out = await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1" } });
    expect(out).toEqual(plain);
    expect(posts()).toHaveLength(1);
    expect(posts()[0].body).toBe(plainBody); // byte-equal request body (the opt-in is a header)
    expect(posts()[0].headers[PREFER_HEADER]).toBe(PREFER_ASYNC_VALUE);
    expect(polls()).toHaveLength(0);
    expect(store.writes).toBe(0);
  });

  it("today's typed refusals still throw on the opt-in path (409 trial_limit)", async () => {
    script = [() => ({ status: 409, body: { ok: false, error: "trial_limit", remaining: 0 } })];
    await expect(
      gradeWorksheet(REQ, { surface: "worksheet", job: { store: memoryStore(), paperKey: "ws-1" } }),
    ).rejects.toMatchObject({ name: "FairUseLimitError" });
  });
});

/* ── §3/§4: 202 → poll → provisional rows → final ─────────────────────────── */

describe("§3/§4 — a 202 polls; rows land provisional then final; done returns `final`", () => {
  it("polls the status endpoint, reports rows as they land, and returns the v2 body at done", async () => {
    const store = memoryStore();
    const seen: GradingJobProgress[] = [];
    let storedBeforeFirstPoll: StoredGradingJob | null = null;
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => {
        storedBeforeFirstPoll = store.value;
        return { status: 200, body: { ok: true, jobId: JOB_ID, state: "running", total: 3, done: 1, pollAfterMs: 2500, results: [row(0, false)] } };
      },
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "running", total: 3, done: 2, pollAfterMs: 2500, results: [row(0, false), row(1, true)] } }),
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, model: "m", results: [row(0, true), row(1, true), row(2, true)], final: FINAL } }),
    ];
    const out = await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1", onProgress: (p) => seen.push(p) } });
    expect(out).toEqual(FINAL);
    expect(posts()).toHaveLength(1);
    expect(polls().map((r) => r.url)).toEqual([POLL, POLL, POLL]);
    expect(polls()[0].headers.Authorization).toBe("Bearer t");
    expect(polls()[0].body).toBeNull();
    // provisional first, final later
    expect(seen[0].rows[0].final).toBe(false);
    expect(seen[2].rows.every((r) => r.final)).toBe(true);
    // §11: stored BEFORE the first poll, with the key the submit carried; cleared at done
    expect(storedBeforeFirstPoll).toMatchObject({ jobId: JOB_ID, pollPath: POLL, paperKey: "ws-1" });
    expect((storedBeforeFirstPoll as unknown as StoredGradingJob).idempotencyKey).toBe(posts()[0].headers[IDEMPOTENCY_HEADER]);
    expect(store.value).toBeNull();
  });

  it("an `Idempotent-Replayed` 202 is the same job: polled, never re-submitted", async () => {
    script = [
      () => ({ status: 202, body: ACCEPTED, headers: { "Idempotent-Replayed": "true" } }),
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, results: [], final: FINAL } }),
    ];
    const out = await gradeWorksheet(REQ, { surface: "worksheet", job: { store: memoryStore(), paperKey: "ws-1" } });
    expect(out).toEqual(FINAL);
    expect(posts()).toHaveLength(1);
  });

  it("final.ok === false is today's {ok:false} — returned for the caller's existing branch, no scorecard from rows", async () => {
    const failed = { ok: false, error: "We couldn't grade this worksheet — please try a clearer scan, or try again." };
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, results: [], final: failed } }),
    ];
    const store = memoryStore();
    const out = await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1" } });
    expect(out).toEqual(failed);
    expect(store.value).toBeNull();
  });

  it("429 backs off and keeps polling; 503 is transient", async () => {
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => ({ status: 429, body: { ok: false, error: "poll_rate_limited", retryAfterMs: 4000 } }),
      () => ({ status: 503, body: { ok: false, error: "job_store_unavailable" } }),
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, results: [], final: FINAL } }),
    ];
    expect(await gradeWorksheet(REQ, { surface: "worksheet", job: { store: memoryStore(), paperKey: "ws-1" } })).toEqual(FINAL);
  });

  it("a 401 on a poll is refreshed once with a forced token", async () => {
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => ({ status: 401, body: { ok: false, error: "unauthenticated" } }),
      (r) => ({ status: r.headers.Authorization === "Bearer fresh" ? 200 : 401, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, results: [], final: FINAL } }),
    ];
    expect(await gradeWorksheet(REQ, { surface: "worksheet", job: { store: memoryStore(), paperKey: "ws-1" } })).toEqual(FINAL);
    expect(H.forced).toBe(1);
  });

  it("network errors on the poll are bounded, then GradingNetworkError — the job STAYS stored so a retry resumes it", async () => {
    const store = memoryStore();
    script = [() => ({ status: 202, body: ACCEPTED }), ...Array.from({ length: MAX_CONSECUTIVE_POLL_FAILURES }, () => () => "network" as const)];
    await expect(gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1" } })).rejects.toBeInstanceOf(GradingNetworkError);
    expect(polls()).toHaveLength(MAX_CONSECUTIVE_POLL_FAILURES);
    expect(store.value?.jobId).toBe(JOB_ID);
    // …and the retry polls the SAME job, never a second submit (no double charge)
    requests = [];
    script = [() => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, results: [], final: FINAL } })];
    expect(await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1" } })).toEqual(FINAL);
    expect(posts()).toHaveLength(0);
  });
});

/* ── §11 resume ───────────────────────────────────────────────────────────── */

describe("§11 — a reload mid-poll resumes the SAME job", () => {
  const stored = (): StoredGradingJob => ({ v: 1, jobId: JOB_ID, idempotencyKey: "key-1", pollPath: POLL, total: 3, submittedAt: clock, paperKey: "ws-1" });

  it("resumeOnly polls the stored jobId and sends no submit", async () => {
    const store = memoryStore(stored());
    script = [() => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "done", total: 3, done: 3, results: [], final: FINAL } })];
    const out = await gradeWorksheet({ ...REQ, imageBase64: "" }, { surface: "worksheet", job: { store, paperKey: "ws-1", resumeOnly: true } });
    expect(out).toEqual(FINAL);
    expect(posts()).toHaveLength(0);
    expect(polls()[0].url).toBe(POLL);
  });

  it("a stored job for ANOTHER paper is never resumed; nothing stored → GradingJobGoneError, zero requests", async () => {
    const store = memoryStore({ ...stored(), paperKey: "ws-OTHER" });
    await expect(
      gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1", resumeOnly: true } }),
    ).rejects.toBeInstanceOf(GradingJobGoneError);
    expect(requests).toHaveLength(0);
  });

  it("§9: a stored job past 24 h is dropped, not polled", async () => {
    const store = memoryStore({ ...stored(), submittedAt: clock - JOB_TTL_MS });
    await expect(
      gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1", resumeOnly: true } }),
    ).rejects.toBeInstanceOf(GradingJobGoneError);
    expect(requests).toHaveLength(0);
    expect(store.value).toBeNull();
  });

  it("a 404 during a resume is an honest 'gone' — never an empty result, never a submit without the document", async () => {
    const store = memoryStore(stored());
    script = [() => ({ status: 404, body: { ok: false, error: "job_not_found" } })];
    await expect(
      gradeWorksheet({ ...REQ, imageBase64: "" }, { surface: "worksheet", job: { store, paperKey: "ws-1", resumeOnly: true } }),
    ).rejects.toBeInstanceOf(GradingJobGoneError);
    expect(posts()).toHaveLength(0);
    expect(store.value).toBeNull();
  });
});

/* ── §3 404 mid-poll → today's synchronous path ───────────────────────────── */

describe("§3 — a 404 mid-poll falls back to today's synchronous path", () => {
  it("exactly ONE fallback submit, WITHOUT the opt-in, with a NEW key; its 200 is the answer", async () => {
    const store = memoryStore();
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "running", total: 3, done: 0, results: [] } }),
      () => ({ status: 404, body: { ok: false, error: "job_not_found" } }),
      () => ({ status: 200, body: FINAL }),
    ];
    const out = await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1" } });
    expect(out).toEqual(FINAL);
    const [first, fallback] = posts();
    expect(posts()).toHaveLength(2);
    expect(fallback.headers[PREFER_HEADER]).toBeUndefined();
    expect(fallback.headers[IDEMPOTENCY_HEADER]).not.toBe(first.headers[IDEMPOTENCY_HEADER]);
    expect(fallback.body).toBe(first.body);
    expect(store.value).toBeNull();
  });
});

/* ── §6 interrupted → grade the remaining N ───────────────────────────────── */

describe("§6 — interrupted: final rows stay; 'grade the remaining N' re-submits only those", () => {
  it("throws GradingJobInterruptedError with the remaining indices, then merges the re-grade by index", async () => {
    const store = memoryStore();
    script = [
      () => ({ status: 202, body: ACCEPTED }),
      () => ({ status: 200, body: { ok: true, jobId: JOB_ID, state: "interrupted", total: 3, done: 3, results: [row(0, true), interruptedRow(1), interruptedRow(2)] } }),
    ];
    let err: GradingJobInterruptedError | null = null;
    try {
      await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1" } });
    } catch (e) {
      err = e as GradingJobInterruptedError;
    }
    expect(err?.name).toBe("GradingJobInterruptedError");
    expect(err?.remaining).toEqual([1, 2]);
    expect(err?.message).toBe("Grade the remaining 2 questions");
    const firstKey = posts()[0].headers[IDEMPOTENCY_HEADER];

    requests = [];
    script = [
      () => ({ status: 200, body: { ...FINAL, results: [graded(2, 2), graded(3, 1)], summary: "subset" } }),
    ];
    const out = await gradeWorksheet(REQ, { surface: "worksheet", job: { store, paperKey: "ws-1", continueFrom: err! } });
    const sent = JSON.parse(posts()[0].body as string) as { questions: Array<{ qNumber: number }> };
    expect(sent.questions.map((q) => q.qNumber)).toEqual([2, 3]);
    expect(posts()[0].headers[IDEMPOTENCY_HEADER]).not.toBe(firstKey);
    expect(out.results.map((r) => [r.qNumber, r.marksAwarded])).toEqual([[1, 2], [2, 2], [3, 1]]);
    expect(out.gradedMarksAwarded).toBe(5);
    expect(out.gradedMarksTotal).toBe(6);
    expect(out.summary).toBe(""); // never invented for the merged paper
    expect(out.results[0]).not.toHaveProperty("index");
  });
});

/* ── §2/§11 guards ────────────────────────────────────────────────────────── */

describe("§2/§11 — the free check never sends the opt-in", () => {
  it("a free-check grade with opts.job is sent exactly as today: no Prefer, no poll", async () => {
    script = [() => ({ status: 200, body: FINAL })];
    await gradeWorksheet(REQ, { freeCheck: true, job: { store: memoryStore(), paperKey: "ws-1" } });
    expect(posts()).toHaveLength(1);
    expect(posts()[0].headers[PREFER_HEADER]).toBeUndefined();
    expect(polls()).toHaveLength(0);
  });

  it("a single check (/api/check-solution) never sends the opt-in, even if handed a job", async () => {
    script = [() => ({ status: 200, body: { ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67, annotatedSteps: [] } })];
    await checkSolutionImage({ question: "Q", textAnswer: "A" }, { job: { store: memoryStore(), paperKey: "x" } });
    expect(posts()).toHaveLength(1);
    expect(posts()[0].url).toContain("/check-solution");
    expect(posts()[0].headers[PREFER_HEADER]).toBeUndefined();
    expect(polls()).toHaveLength(0);
  });

  it("the Bearer token only ever goes to the same-origin poll path", () => {
    expect(safePollPath("https://evil.example/x", JOB_ID)).toBe(POLL);
    expect(safePollPath(POLL, JOB_ID)).toBe(POLL);
  });
});
