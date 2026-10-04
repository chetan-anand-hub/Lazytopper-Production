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
  | { kind: "retrying"; attempt: number }
  | { kind: "done" };

export type GradingStageListener = (stage: GradingStage) => void;

/** The header the server's idempotency record is keyed on (fairUse.cjs IDEMPOTENCY_HEADER). */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";
/** R1: one attempt may take this long before it is abandoned and retried. */
export const GRADING_TIMEOUT_MS = 90_000;
/** R1: retries after the first attempt (so at most 3 sends). */
export const GRADING_MAX_RETRIES = 2;
/** R1: backoff before retry n (1-based) is base * 2^(n-1), plus up to the same again as jitter. */
export const GRADING_BACKOFF_BASE_MS = 1_000;
/** R1: the only HTTP statuses re-sent — a gateway or a busy grader, never a business answer. */
export const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);
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
): Promise<GradingHttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let sentTimer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (sentTimer !== null) clearTimeout(sentTimer);
      sentTimer = null;
    };
    xhr.open("POST", url, true);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.timeout = GRADING_TIMEOUT_MS;
    // Listeners go on `upload` BEFORE send(), or the browser never reports progress.
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && e.total > 0) {
        onStage({ kind: "uploading", percent: Math.min(100, Math.floor((e.loaded / e.total) * 100)) });
      }
    };
    xhr.upload.onload = () => {
      onStage({ kind: "sent" });
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
  });
}

async function fetchAttempt(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<GradingHttpResponse> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller?.abort();
  }, GRADING_TIMEOUT_MS);
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
  const maxRetries = Math.max(0, Math.min(GRADING_MAX_RETRIES, opts.maxRetries ?? GRADING_MAX_RETRIES));
  const sendHeaders = { ...headers, [IDEMPOTENCY_HEADER]: idempotencyKey };
  const useXhr = !!onStage && typeof XMLHttpRequest !== "undefined";
  let lastFailure: GradingFailureReason = "network";

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      onStage?.({ kind: "retrying", attempt });
      await sleepImpl(backoffDelayMs(attempt));
    }
    await waitUntilOnline(onStage);
    let res: GradingHttpResponse;
    try {
      res = useXhr
        ? await xhrAttempt(url, sendHeaders, body, onStage!)
        : await fetchAttempt(url, sendHeaders, body);
    } catch (err) {
      lastFailure = err instanceof AttemptFailure ? err.reason : "network";
      continue;
    }
    if (RETRYABLE_STATUSES.has(res.status) && attempt < maxRetries) continue;
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
      return "Connection dropped — trying again…";
    case "done":
      return "Done";
  }
}

/** Errors whose `message` is already written for a student (each class sets its `name`). */
const STUDENT_FACING_ERRORS: ReadonlySet<string> = new Set([
  "GradingNetworkError",
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
  /failed to fetch|networkerror|network ?error|load failed|network request failed|typeerror|syntaxerror|unexpected token|json|ai api|abort|timeout|^[a-z]+(_[a-z]+)+$|\b[45]\d\d\b/i;

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
