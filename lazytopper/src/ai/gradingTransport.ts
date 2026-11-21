// src/ai/gradingTransport.ts
//
// LOW-END-1 PR-2 (R1–R3) — the ONE way a grading request leaves the device.
//
// Every grading POST (/api/check-solution, /api/grade-worksheet) goes through
// `sendGradingRequest`, which adds what a budget phone on a bad network needs:
//
//   R1  a 90 s timeout per attempt; an automatic retry on a network failure, a timeout
//       or a 502 / 503 / 504, with exponential backoff + jitter, at most 2 retries; and
//       the SAME idempotency key on every retry, so the server grades and charges once.
//       NEVER retried: any other status — a 4xx is the server's answer (a limit, a
//       refusal, a bad request) and a 500 is a grader fault that re-sending will not fix.
//   R2  visible stages — Uploading NN% -> Sent ✓ -> Grading… -> Done — from XHR upload
//       progress; offline -> "You're offline — we'll send it when you're back", and the
//       request goes out on the browser's `online` event. The caller keeps the photo /
//       pages: this module never clears anything, it only waits.
//   R3  the key is a UUID made on the device per check attempt (crypto.randomUUID, with
//       a getRandomValues fallback for old browsers), sent as `Idempotency-Key`.
//
// ★ WHY THIS IS ITS OWN MODULE. Three suites `vi.mock` aiClient with a partial factory,
//   so a new runtime export there would throw in all of them; and the server suite
//   entitlement.test.cjs (A11) transpiles aiClient.ts and runs it under plain Node with
//   only `./paidCallHeaders` stubbed, so aiClient imports THIS module lazily (a deferred
//   import is never reached by A11). Nothing mocks this file.
//
// ★ XHR ONLY WHEN SOMEONE IS WATCHING. Upload progress exists only on XMLHttpRequest, so
//   a call that passes `onStage` is sent by XHR; a call without one is sent by `fetch`
//   exactly as before (same retry, timeout and key). The response handed back has the
//   three members handleJsonResponse reads — ok, status, text() — on both paths.

export type GradingStage =
  | { kind: "offline" }
  | { kind: "uploading"; percent: number }
  | { kind: "sent" }
  | { kind: "grading" }
  | { kind: "retrying"; attempt: number; reason?: GradingRetryReason }
  | { kind: "done" };

/**
 * GRADE-TIMEOUT-RETRY-1 — why a retry is under way. "slow": the grader ran out of time (a 504, or no
 * answer inside this attempt's time-out) — nothing is wrong on the student's side, the check is just
 * taking longer than usual. "connection": the connection dropped. Absent = "connection" (the old copy).
 */
export type GradingRetryReason = "slow" | "connection";

export type GradingStageListener = (stage: GradingStage) => void;

/** The header the server's idempotency record is keyed on (fairUse.cjs IDEMPOTENCY_HEADER). */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";
/** R1: one attempt may take this long before it is abandoned and retried. */
export const GRADING_TIMEOUT_MS = 90_000;
/**
 * GRADE-SPEED-1 S3 — the per-attempt budget of a call that grades exactly ONE question (check-solution; a
 * grade-worksheet with one question, incl. the free check). The server's deadline for such a request is up to
 * 110 s (server/grading/timing.cjs DEFAULT_SINGLE_QUESTION_DEADLINE_MS, kill switch SINGLE_GRADE_DEADLINE_MS=80000);
 * this must stay above it (clamp 112 s) plus pre-handler time and the response, and below Vercel's 120 s wait for
 * the first byte. Every other call keeps GRADING_TIMEOUT_MS. KILL SWITCH for the client half: set this constant
 * back to GRADING_TIMEOUT_MS (90_000) and ship; the server half is the env above.
 */
export const GRADING_SINGLE_TIMEOUT_MS = 118_000;
/** GRADE-SPEED-1: a ONE-question grade still unanswered after this long shows "Taking a little longer than usual". */
export const GRADING_SLOW_STAGE_MS = 30_000;
/** R1: retries after the first attempt (so at most 3 sends). */
export const GRADING_MAX_RETRIES = 2;
/** R1: backoff before retry n (1-based) is base * 2^(n-1), plus up to the same again as jitter. */
export const GRADING_BACKOFF_BASE_MS = 1_000;
/** R1: the only HTTP statuses re-sent — a gateway or a busy grader, never a business answer. */
export const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);
/**
 * GRADE-TIMEOUT-RETRY-1 — a free check (the request carries the free-check marker header) is retried
 * AT MOST ONCE, and ONLY after a 504 whose JSON body says `retryable: true` (our grading time-out;
 * never a bare proxy 504). Never after a dropped connection or a client time-out: with no uid the server cannot
 * tell a re-send from a second check, and the first attempt may still be grading. Each re-send mints
 * a FRESH limited-use App Check token (the server consumes every token it verifies, so re-sending
 * the first one is refused as alreadyConsumed). aiClient asks for `maxRetries: 0` on a free check
 * (written before a 504 was retryable); this policy supersedes it for the 504 case only.
 */
export const FREE_CHECK_MAX_RETRIES = 1;
const FREE_CHECK_MARKER = "x-lazytopper-free-check";

/** True when a 504 body is OUR grading time-out: JSON with `retryable === true`. */
function isRetryableTimeoutBody(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { retryable?: unknown } | null;
    return !!parsed && typeof parsed === "object" && parsed.retryable === true;
  } catch {
    return false;
  }
}

function isFreeCheckSend(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase() === FREE_CHECK_MARKER);
}

/** The free-check headers with a token minted for THIS send; null when none can be minted. */
async function freshFreeCheckHeaders(headers: Record<string, string>): Promise<Record<string, string> | null> {
  try {
    const { freeCheckJsonHeaders } = await import("../services/freeCheckClient");
    return { ...headers, ...(await freeCheckJsonHeaders()) };
  } catch {
    return null;
  }
}

/** How long "Sent ✓" shows before "Grading…" (upload finished, the grade has not). */
const SENT_DWELL_MS = 700;

/** What a grading send returns — the members handleJsonResponse reads. */
export interface GradingHttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type GradingFailureReason = "network" | "timeout";

/**
 * The request never got an answer — the connection dropped, or every attempt timed out.
 * `message` is a plain sentence a student can act on, never "Failed to fetch".
 * (No Object.setPrototypeOf — ES2022 target, classes are native; see aiClient.)
 */
export class GradingNetworkError extends Error {
  readonly reason: GradingFailureReason;
  constructor(reason: GradingFailureReason) {
    super(
      reason === "timeout"
        ? "Grading took too long to come back. Your answer is still here — please try again in a moment."
        : "We couldn't send your answer — the connection dropped. Your answer is still here — please try again.",
    );
    this.name = "GradingNetworkError";
    this.reason = reason;
  }
}

/* ── R3 · the idempotency key ─────────────────────────────────────────────── */

function randomBytes(n: number): Uint8Array | null {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c && typeof c.getRandomValues === "function") return c.getRandomValues(new Uint8Array(n));
  } catch {
    /* fall through */
  }
  return null;
}

let fallbackCounter = 0;

/**
 * A fresh UUID (v4 shape) for ONE check attempt. `crypto.randomUUID` where it exists;
 * otherwise built from `crypto.getRandomValues`; otherwise (no Web Crypto at all — not a
 * browser this app supports, but never a crash) from the clock and a counter, which is
 * still unique per device per attempt, and that is all the key has to be.
 */
export function newIdempotencyKey(): string {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    /* fall through */
  }
  let bytes = randomBytes(16);
  if (!bytes) {
    bytes = new Uint8Array(16);
    fallbackCounter += 1;
    const seed = `${Date.now()}-${fallbackCounter}-${typeof performance !== "undefined" ? performance.now() : 0}`;
    for (let i = 0; i < seed.length; i += 1) bytes[i % 16] = (bytes[i % 16] * 31 + seed.charCodeAt(i)) & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* ── R1 · backoff ─────────────────────────────────────────────────────────── */

/**
 * A fraction in [0, 1) for jitter. Jitter only spreads retries out in time; it is not
 * user-facing data (CLAUDE.md §7) and not a secret, so Math.random is the right tool —
 * scaling a Web Crypto value here was flagged by CodeQL (js/biased-cryptographic-random)
 * for a property this value does not need.
 */
function jitterFraction(): number {
  return Math.random();
}

/** The wait before retry `n` (1-based): base * 2^(n-1) + jitter in [0, base * 2^(n-1)). */
export function backoffDelayMs(n: number, fraction: number = jitterFraction()): number {
  const step = GRADING_BACKOFF_BASE_MS * 2 ** Math.max(0, n - 1);
  return Math.round(step + step * Math.min(Math.max(fraction, 0), 0.999));
}

let sleepImpl: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Test seam: replace the backoff sleep (null restores the real timer). */
export function __setGradingSleepForTests(fn: ((ms: number) => Promise<void>) | null): void {
  sleepImpl = fn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
}

/* ── R2 · offline ─────────────────────────────────────────────────────────── */

function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

/** Resolve at once when online; otherwise say so and resolve on the next `online` event. */
async function waitUntilOnline(onStage?: GradingStageListener): Promise<void> {
  if (!isOffline() || typeof window === "undefined") return;
  onStage?.({ kind: "offline" });
  await new Promise<void>((resolve) => {
    window.addEventListener("online", () => resolve(), { once: true });
  });
}

/* ── one attempt ──────────────────────────────────────────────────────────── */

class AttemptFailure extends Error {
  readonly reason: GradingFailureReason;
  constructor(reason: GradingFailureReason) {
    super(reason);
    this.reason = reason;
  }
}

function xhrAttempt(
  url: string,
  headers: Record<string, string>,
  body: string,
  onStage: GradingStageListener,
  timeoutMs: number = GRADING_TIMEOUT_MS,
  slowAfterMs: number | null = null,
): Promise<GradingHttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let sentTimer: ReturnType<typeof setTimeout> | null = null;
    let slowTimer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (sentTimer !== null) clearTimeout(sentTimer);
      sentTimer = null;
      if (slowTimer !== null) clearTimeout(slowTimer);
      slowTimer = null;
    };
    xhr.open("POST", url, true);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.timeout = timeoutMs;
    // Listeners go on `upload` BEFORE send(), or the browser never reports progress.
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && e.total > 0) {
        onStage({ kind: "uploading", percent: Math.min(100, Math.floor((e.loaded / e.total) * 100)) });
      }
    };
    xhr.upload.onload = () => {
      onStage({ kind: "sent" });
      // GRADE-SPEED-1: the 30 s "taking longer" clock starts when the UPLOAD is done (a slow upload is not a slow grade).
      if (slowAfterMs !== null && slowTimer === null) slowTimer = setTimeout(() => onStage({ kind: "retrying", attempt: 0, reason: "slow" }), slowAfterMs);
      sentTimer = setTimeout(() => onStage({ kind: "grading" }), SENT_DWELL_MS);
    };
    xhr.onload = () => {
      clear();
      const text = xhr.responseText ?? "";
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, text: async () => text });
    };
    xhr.onerror = () => {
      clear();
      reject(new AttemptFailure("network"));
    };
    xhr.onabort = () => {
      clear();
      reject(new AttemptFailure("network"));
    };
    xhr.ontimeout = () => {
      clear();
      reject(new AttemptFailure("timeout"));
    };
    onStage({ kind: "uploading", percent: 0 });
    xhr.send(body);
    // GRADE-SPEED-1: a one-question grade now may run to ~110 s, so say so honestly 30 s after the upload finished
    // (see upload.onload above) — the same "Taking a little longer than usual — still checking…" the slow retry
    // shows (attempt 0 = the FIRST send is still being answered; nothing has failed). Cleared when the attempt settles.
  });
}

async function fetchAttempt(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number = GRADING_TIMEOUT_MS,
): Promise<GradingHttpResponse> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller?.abort();
  }, timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers,
      body,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch {
    throw new AttemptFailure(timedOut ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
}

/* ── the send ─────────────────────────────────────────────────────────────── */

export interface GradingSendOptions {
  /** R3: the key for THIS check attempt — the same on every retry. */
  idempotencyKey: string;
  /** Retries after the first send (default GRADING_MAX_RETRIES). 0 = timeout + stages only. */
  maxRetries?: number;
  /** R2: stage updates. Present -> sent by XHR (upload progress); absent -> by fetch. */
  onStage?: GradingStageListener;
  /** GRADE-SPEED-1 S3: this call grades exactly ONE question -> the per-attempt budget is GRADING_SINGLE_TIMEOUT_MS
   *  (not GRADING_TIMEOUT_MS) and, when watched, the "taking longer" stage appears at GRADING_SLOW_STAGE_MS. */
  singleQuestion?: boolean;
}

/**
 * POST one grading request with R1's timeout / retry / key and R2's stages. Returns the
 * final HTTP response (any status — handleJsonResponse decides what it means), or throws
 * GradingNetworkError when no attempt got an answer at all.
 */
export async function sendGradingRequest(
  url: string,
  headers: Record<string, string>,
  body: string,
  opts: GradingSendOptions,
): Promise<GradingHttpResponse> {
  const { idempotencyKey, onStage } = opts;
  const attemptTimeoutMs = opts.singleQuestion === true ? GRADING_SINGLE_TIMEOUT_MS : GRADING_TIMEOUT_MS;
  const slowAfterMs = opts.singleQuestion === true ? GRADING_SLOW_STAGE_MS : null;
  const freeCheck = isFreeCheckSend(headers);
  const maxRetries = freeCheck
    ? FREE_CHECK_MAX_RETRIES
    : Math.max(0, Math.min(GRADING_MAX_RETRIES, opts.maxRetries ?? GRADING_MAX_RETRIES));
  let sendHeaders = { ...headers, [IDEMPOTENCY_HEADER]: idempotencyKey };
  const useXhr = !!onStage && typeof XMLHttpRequest !== "undefined";
  let lastFailure: GradingFailureReason = "network";
  let retryReason: GradingRetryReason = "connection";
  let lastResponse: GradingHttpResponse | null = null;
  let timeoutRetries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      if (freeCheck) {
        // A free check re-sends only after a 504 response (below) and always with a fresh token.
        const fresh = await freshFreeCheckHeaders(headers);
        if (!fresh) return lastResponse as GradingHttpResponse; // no token to send: the 504 stands
        sendHeaders = { ...fresh, [IDEMPOTENCY_HEADER]: idempotencyKey };
      }
      onStage?.({ kind: "retrying", attempt, reason: retryReason });
      await sleepImpl(backoffDelayMs(attempt));
    }
    await waitUntilOnline(onStage);
    // GRADE-TIMEOUT-RETRY-1: after a SLOW (time-out) retry starts, the stage stays "Taking a little
    // longer than usual — still checking…": the re-upload's "Uploading 0% -> Sent -> Grading…" would
    // otherwise replace it a second later and look like the check had restarted from nothing.
    const attemptStage: GradingStageListener | undefined =
      onStage && attempt > 0 && retryReason === "slow"
        ? (st) => { if (st.kind === "offline") onStage(st); }
        : onStage;
    let res: GradingHttpResponse;
    try {
      res = useXhr
        ? await xhrAttempt(url, sendHeaders, body, attemptStage ?? onStage!, attemptTimeoutMs, slowAfterMs)
        : await fetchAttempt(url, sendHeaders, body, attemptTimeoutMs);
    } catch (err) {
      lastFailure = err instanceof AttemptFailure ? err.reason : "network";
      // A free check is never re-sent after no answer at all (see FREE_CHECK_MAX_RETRIES).
      if (freeCheck) break;
      retryReason = lastFailure === "timeout" ? "slow" : "connection";
      continue;
    }
    // GRADE-TIMEOUT-RETRY-1: our grading time-out is a 504 whose JSON body says `retryable: true`.
    // It is re-sent AT MOST ONCE, for every caller. A bare 504 (a proxy's, or a non-JSON body) keeps the
    // pre-existing policy: signed-in up to maxRetries, a free check never.
    if (res.status === 504) {
      const text = await res.text().catch(() => "");
      res = { ok: res.ok, status: res.status, text: async () => text }; // a fetch body reads once: hand the caller a copy
      const gradingTimeout = isRetryableTimeoutBody(text);
      if (gradingTimeout && timeoutRetries < 1 && attempt < maxRetries) {
        timeoutRetries += 1;
        lastResponse = res;
        retryReason = "slow";
        continue;
      }
      if (!gradingTimeout && !freeCheck && attempt < maxRetries) {
        retryReason = "slow";
        continue;
      }
    } else if (!freeCheck && RETRYABLE_STATUSES.has(res.status) && attempt < maxRetries) {
      retryReason = "connection";
      continue;
    }
    if (res.ok) onStage?.({ kind: "done" });
    return res;
  }
  throw new GradingNetworkError(lastFailure);
}

/* ── R2 · what a student reads ────────────────────────────────────────────── */

/** The stage as the student reads it. */
export function gradingStageLabel(stage: GradingStage): string {
  switch (stage.kind) {
    case "offline":
      return "You're offline — we'll send it when you're back";
    case "uploading":
      return `Uploading ${stage.percent}%`;
    case "sent":
      return "Sent ✓";
    case "grading":
      return "Grading…";
    case "retrying":
      return stage.reason === "slow"
        ? "Taking a little longer than usual — still checking…"
        : "Connection dropped — trying again…";
    case "done":
      return "Done";
  }
}

/** Errors whose `message` is already written for a student (each class sets its `name`). */
const STUDENT_FACING_ERRORS: ReadonlySet<string> = new Set([
  "GradingNetworkError",
  "UploadTooLargeError",
  "DailyLimitError",
  "FairUseLimitError",
  "PremiumRequiredError",
  "SignInAgainError",
]);

/**
 * A raw platform / protocol message that must never reach a student: the browser's
 * network errors ("Failed to fetch", "NetworkError when attempting to fetch resource.",
 * "Load failed"), JSON parse failures, the generic "AI API request failed", and
 * machine codes (snake_case, a bare status).
 */
const TECHNICAL_MESSAGE =
  /failed to fetch|networkerror|network ?error|load failed|network request failed|typeerror|syntaxerror|unexpected token|json|ai api|reach the marking service|abort|timeout|^[a-z]+(_[a-z]+)+$|\b[45]\d\d\b/i;

/**
 * The sentence to show a student for a failed grade. A student-facing error keeps its
 * own words; the server's own plain sentence is kept; anything technical becomes
 * `fallback`. Read by `name`, never `instanceof`: several suites mock aiClient whole.
 */
export function gradingErrorMessage(err: unknown, fallback: string): string {
  const e = err as { name?: unknown; message?: unknown } | null;
  const name = e && typeof e.name === "string" ? e.name : "";
  const message = e && typeof e.message === "string" ? e.message.trim() : "";
  if (!message) return fallback;
  if (STUDENT_FACING_ERRORS.has(name)) return message;
  if (TECHNICAL_MESSAGE.test(message)) return fallback;
  return message;
}
