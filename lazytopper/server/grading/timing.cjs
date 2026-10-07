'use strict';
// server/grading/timing.cjs — THE GRADING TIME BUDGET (GRADER-CORE-1 PR-3, C8).
//
// WHY. Before PR-3 every grading call inherited GEMINI_TIMEOUT_MS (55 s code default; the
// owner's Railway stopgap sets 80 s) PER HTTP ATTEMPT, a timeout was never retried, and the
// parse-miss retry was a second full attempt. A 10-question paper was ONE call that took
// 61–66 s and timed out at 55 s on every run; at 80 s the server's worst case (attempt +
// retry) was ~160 s, past the client's per-attempt budget of 90 s
// (src/ai/gradingTransport.ts `GRADING_TIMEOUT_MS = 90_000`, which the client then RE-SENDS
// on 502/503/504, up to 2 times).
//
// WHAT. Grading is now INDEPENDENT of GEMINI_TIMEOUT_MS (controller decision D15): one
// request deadline, measured from handler entry BEFORE the body is read, and a first-attempt
// cap per chunk. Every grading model call passes an explicit per-call timeout and the
// absolute deadline (services/geminiClient.cjs clamps each HTTP attempt, its 429 back-off and
// its proxy hop to it), and the core races every call against the same deadline, so the
// server answers by the deadline whatever GEMINI_TIMEOUT_MS is (unset, 55000 or 80000).
// GEMINI_TIMEOUT_MS still governs every NON-grading call (detect, the tutor, step solution,
// more-like-this, diagrams, the warm pool) as before — an emergency override we keep.
//
//   GRADING_DEADLINE_MS       request budget, code default 80 000, clamped to [20 000, 80 000]
//                             (controller decision D43): the value that served the owner's
//                             27-question paper live in 61–75 s. 80 s plus the response stays
//                             under the client's 90 s per attempt, and the client re-sends only
//                             at 90 s — after this request has answered and its 2xx is stored
//                             for the idempotent replay. (A CONCURRENT duplicate press waits at
//                             most 75 s for the in-flight one — FU-IDEMPOTENCY-WAIT-75-VS-80.)
//   GRADING_SINGLE_CALL_MAX   (D43, HYBRID) a paper of at most 10 questions is graded in ONE
//                             call, as PR-2 shipped (live: controller papers p50/p95 42.8/52.2 s,
//                             no timeouts) — chunking a small paper re-sends the whole document
//                             and the rulebook per chunk and roughly doubles its cost and
//                             thinking without cutting its latency. A larger paper is chunked
//                             (≤ 3 questions per chunk, in parallel), so a slow part costs only
//                             its own questions ("not graded") instead of the whole paper.
//                             Two questions printed with the SAME number never share a call, so
//                             such a paper splits at the duplicate even when small.
//   GRADING_CHUNK_TIMEOUT_MS  first attempt of a MULTI-question chunk, code default 45 000,
//                             clamped to [10 000, deadline]. A one-question chunk's first
//                             attempt gets the whole remaining budget instead: its retry is
//                             the same size, so cutting it early cannot make it faster.
//   GRADING_CACHE_BUDGET_MS   the scheme-first solution-cache pre-phase, code default 10 000,
//                             clamped to [0, 20 000], from handler entry. A cache generation
//                             still running then is abandoned FOR THIS REQUEST (it finishes in
//                             the background and fills the cache for the next one); the
//                             question is graded without a stored scheme, as with no cache.
// Anything unfinished at the deadline is "not graded" for THAT question (honest pending, never
// charged — C9) inside an HTTP 200, never a 502/503/504 the client would re-send.

const DEFAULT_GRADING_DEADLINE_MS = 80000;
const MIN_GRADING_DEADLINE_MS = 20000;
const MAX_GRADING_DEADLINE_MS = 80000;
const DEFAULT_GRADING_CHUNK_TIMEOUT_MS = 45000;
const MIN_GRADING_CHUNK_TIMEOUT_MS = 10000;
const DEFAULT_GRADING_CACHE_BUDGET_MS = 10000;
const MAX_GRADING_CACHE_BUDGET_MS = 20000;
// Kept back from the deadline for post-processing and serialising the response.
const GRADING_MARGIN_MS = 2000;
// A retry with less time left than this cannot usefully finish (single-question p50 ≈ 14 s).
const GRADING_MIN_RETRY_MS = 10000;
// C8: a CHUNKED paper is graded in chunks of at most this many questions, in parallel.
const MAX_CHUNK_QUESTIONS = 3;
// D43 (hybrid): a paper of at most this many questions is graded in ONE call (no chunks).
const SINGLE_CALL_MAX_QUESTIONS = 10;
// The client's per-attempt budget, for the worst-case arithmetic below (read-only mirror of
// src/ai/gradingTransport.ts; the client is Controller B's file).
const CLIENT_PER_ATTEMPT_BUDGET_MS = 90000;

/* ── GRADING-JOBS-1 J1 (owner ruling 7) · THE BACKGROUND-JOB BUDGET ──────────────────────────
   A grading JOB (POST /api/grade-worksheet with `Prefer: respond-async`, behind GRADING_JOBS) holds
   no web request open, so none of the request numbers above apply to it. It has its OWN budget,
   deliberately NOT read from the environment and NOT passed through normaliseTiming (whose deadline
   clamp is 80 000): the synchronous path's timing above is unchanged, number for number.
     JOB_WALL_MS          180 000 — from the moment the job starts RUNNING (queue time excluded). A
                          question unfinished then is "not graded" (timeout) and never charged.
     JOB_PER_CALL_MS      120 000 — every model call's cap (first attempt AND retry, except the J3 abort retry below). Above the
                          highest grading call ever observed: 77.1 s server time for a 4-question
                          single-call paper (OR-LIVE TRUNK-FINAL on e2c5bb46, WAVE_STATE_A15 l.295) and
                          67 s for the slowest 8-question chunk (HOTFIX-2 run b, review §3.4 —
                          agent-reported). No 45 s first-attempt kill: a killed chunk throws its work away.
     JOB_CHUNK_QUESTIONS  8 — a cost choice, not a timeout choice (review §7: ~₹29–33 for a 38-Q paper
                          at 8–10 per chunk vs ~₹51 at 3 — agent-reported); rows still arrive per chunk.
     JOB_HEARTBEAT_MS     10 000 — a live job writes heartbeatAtMs at least this often.
     JOB_STALE_MS         30 000 — a queued/running job whose heartbeat is older is INTERRUPTED (decided
                          on read: a restart or redeploy killed the process that ran it). */
const JOB_WALL_MS = 180000;
const JOB_PER_CALL_MS = 120000;
const JOB_CHUNK_QUESTIONS = 8;
/* J3 round 5 (FU-GRADING-ABORTS; cofounder ruling "retry only what aborted"): a job chunk whose FIRST
   call is aborted at JOB_PER_CALL_MS is retried ONCE, whole, with this larger budget: a per-call cap of
   JOB_ABORT_RETRY_PER_CALL_MS inside a job wall of JOB_ABORT_RETRY_WALL_MS (from the same start). It
   replaces the one-question-per-call retries for that case only; every chunk that did not abort keeps
   the J1 numbers above exactly (same request, same timing). Measured: #1009. */
const JOB_ABORT_RETRY_PER_CALL_MS = 180000;
const JOB_ABORT_RETRY_WALL_MS = 270000;
const JOB_HEARTBEAT_MS = 10000;
const JOB_STALE_MS = 30000;

/** The job budget the grading core takes as `jobTiming` (a fresh object; never env-driven). */
function jobTiming() {
  return { wallMs: JOB_WALL_MS, perCallMs: JOB_PER_CALL_MS, chunkQuestions: JOB_CHUNK_QUESTIONS,
    abortRetry: { perCallMs: JOB_ABORT_RETRY_PER_CALL_MS, wallMs: JOB_ABORT_RETRY_WALL_MS } };
}

function clampInt(raw, lo, hi, dflt) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return dflt;
  const n = Number(raw);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

/** The grading time budget from explicit values (deps / env strings), with the clamps above. */
function normaliseTiming({ deadlineMs, chunkTimeoutMs, cacheBudgetMs } = {}) {
  const deadline = clampInt(deadlineMs, MIN_GRADING_DEADLINE_MS, MAX_GRADING_DEADLINE_MS, DEFAULT_GRADING_DEADLINE_MS);
  const chunk = clampInt(chunkTimeoutMs, MIN_GRADING_CHUNK_TIMEOUT_MS, deadline, Math.min(DEFAULT_GRADING_CHUNK_TIMEOUT_MS, deadline));
  const cache = clampInt(cacheBudgetMs, 0, MAX_GRADING_CACHE_BUDGET_MS, DEFAULT_GRADING_CACHE_BUDGET_MS);
  return { deadlineMs: deadline, chunkTimeoutMs: chunk, cacheBudgetMs: cache, singleCallMaxQuestions: SINGLE_CALL_MAX_QUESTIONS };
}

/** Read the grading time budget from the environment. Never reads GEMINI_TIMEOUT_MS (D15). */
function resolveGradingTiming(env = process.env) {
  return normaliseTiming({
    deadlineMs: env.GRADING_DEADLINE_MS,
    chunkTimeoutMs: env.GRADING_CHUNK_TIMEOUT_MS,
    cacheBudgetMs: env.GRADING_CACHE_BUDGET_MS,
  });
}

/**
 * The server's worst case for one grading request, in ms from handler entry: every model
 * attempt ends by (deadline − margin) and the response follows. It does not depend on
 * GEMINI_TIMEOUT_MS — that is the point (the argument is accepted only so a test can show it).
 */
function serverWorstCaseMs(timing /* , geminiTimeoutMs */) {
  const t = normaliseTiming(timing || {});
  return t.deadlineMs;
}

/** A provider error that is worth ONE retry inside the budget: a timeout, a 5xx ("overloaded"
 *  included), a 429 the client's own back-off could not clear, or a network failure with no
 *  status. Never another 4xx (a bad request stays bad). */
function isRetryableError(err) {
  const status = Number(err && (err.status || err.statusCode));
  if (!Number.isFinite(status) || status === 0) return true;
  return status === 429 || status >= 500;
}

/** A timeout (the per-call abort, the deadline, or the core's own race). */
function isTimeoutError(err) {
  if (!err) return false;
  if (err.gradingDeadline === true || err.timedOut === true) return true;
  const status = Number(err.status || err.statusCode);
  return status === 504 || /timed out/i.test(String(err.message || ''));
}

module.exports = {
  DEFAULT_GRADING_DEADLINE_MS,
  MIN_GRADING_DEADLINE_MS,
  MAX_GRADING_DEADLINE_MS,
  DEFAULT_GRADING_CHUNK_TIMEOUT_MS,
  MIN_GRADING_CHUNK_TIMEOUT_MS,
  DEFAULT_GRADING_CACHE_BUDGET_MS,
  MAX_GRADING_CACHE_BUDGET_MS,
  GRADING_MARGIN_MS,
  GRADING_MIN_RETRY_MS,
  MAX_CHUNK_QUESTIONS,
  SINGLE_CALL_MAX_QUESTIONS,
  CLIENT_PER_ATTEMPT_BUDGET_MS,
  JOB_WALL_MS,
  JOB_PER_CALL_MS,
  JOB_CHUNK_QUESTIONS,
  JOB_ABORT_RETRY_PER_CALL_MS,
  JOB_ABORT_RETRY_WALL_MS,
  JOB_HEARTBEAT_MS,
  JOB_STALE_MS,
  jobTiming,
  normaliseTiming,
  resolveGradingTiming,
  serverWorstCaseMs,
  isRetryableError,
  isTimeoutError,
};
