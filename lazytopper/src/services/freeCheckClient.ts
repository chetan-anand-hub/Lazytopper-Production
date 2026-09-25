/**
 * freeCheckClient — FREE-CHECK-1b: the client half of "one free marked upload for a
 * signed-out visitor". The server half is `server/services/freeCheck.cjs` (1a, #821).
 *
 * ★ DARK BY DEFAULT. Nothing here changes what a student sees unless the client flag
 * `VITE_FREE_CHECK_ENABLED` is on (R11). The server flag `FREE_CHECK_ENABLED` is the
 * authoritative switch; this one only decides whether the page OFFERS a free check.
 *
 * WIRE CONTRACT (1a, unchanged):
 *   request — `X-Lazytopper-Free-Check: 1` + `X-Firebase-AppCheck: <limited-use token>`,
 *             and NO `Authorization` / `X-Lazytopper-Uid` (the P2 anonymous shape).
 *   refusal — HTTP 403 `{ error: "free_check_refused", reason, message, resetAt? }`,
 *             reason ∈ FREE_CHECK_REFUSAL_REASONS.
 *
 * ★ A FRESH LIMITED-USE TOKEN ON EVERY CALL (owner ruling OR-13). The server verifies
 * with `{ consume: true }`, so a token it has seen before is refused as
 * `app_check_invalid`. `freeCheckJsonHeaders()` therefore calls `getLimitedUseToken()`
 * every time it runs — once per request, the per-question detects included — and never
 * the cached `getToken()`, which would hand the SAME token to every call.
 *
 * ★ OPT-IN, NEVER AMBIENT. These headers are attached only when a C&I call site passes
 * `{ freeCheck: true }` to aiClient. `paidCallHeaders()` is untouched: a signed-out
 * caller still gets `{}` on every other call (N13).
 *
 * ★ NODE-SAFE MODULE SCOPE. `aiClient` imports this module, and `aiClient` is reachable
 * from guards the root matrix runs under plain Node, where `import.meta.env` is
 * undefined (see paidCallHeaders.ts). So nothing here reads `import.meta.env` or
 * touches Firebase at module scope: the env is read inside functions, and
 * `firebaseClient` + `firebase/app-check` are imported LAZILY, inside the call.
 */
import type {
  CheckSolutionResponse,
  WorksheetGradeResponse,
} from "../ai/aiClient";
import type { DetectionOverrideLog } from "./practiceInsights";

/* ─────────────────────────── flag + env ─────────────────────────── */

type FreeCheckEnvName =
  | "VITE_FREE_CHECK_ENABLED"
  | "VITE_APPCHECK_DEBUG_TOKEN"
  | "VITE_APPCHECK_RECAPTCHA_SITE_KEY";

/**
 * ⚠ Each key is read as a LITERAL `import.meta.env.VITE_…` expression, on purpose: Vite
 * (build) and Vitest (stubEnv) both rewrite that exact text. An aliased or casted access
 * such as `(import.meta as X).env` is NOT rewritten, and would read `undefined` in the
 * production bundle — a flag that could never switch on. Under plain Node (the root
 * guard matrix) `import.meta.env` is undefined; the try/catch makes that read "".
 */
function readEnv(name: FreeCheckEnvName): string {
  try {
    let raw: unknown;
    if (name === "VITE_FREE_CHECK_ENABLED") raw = import.meta.env.VITE_FREE_CHECK_ENABLED;
    else if (name === "VITE_APPCHECK_DEBUG_TOKEN") raw = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    else raw = import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

/** R11 — the CLIENT flag. Same truthy grammar as the server's `FREE_CHECK_ENABLED`. */
export function isFreeCheckClientEnabled(): boolean {
  return /^(1|true|on|yes)$/i.test(readEnv("VITE_FREE_CHECK_ENABLED"));
}

/* ─────────────────────────── wire names ─────────────────────────── */

/** The marker header the server's free-check admission reads (1a). */
export const FREE_CHECK_MARKER_HEADER = "X-Lazytopper-Free-Check";
export const FREE_CHECK_MARKER_VALUE = "1";
/** The App Check header name the Firebase Web SDK convention uses (1a). */
export const APP_CHECK_HEADER = "X-Firebase-AppCheck";

/**
 * R4 — the reCAPTCHA Enterprise SITE key. PUBLIC by design (it ships in every page that
 * uses it); committed as a config constant, per the ruling. An env override exists for a
 * preview project only. The App Check DEBUG token is a different thing and is NEVER
 * committed: it is read from `VITE_APPCHECK_DEBUG_TOKEN` at init, for previews/local.
 */
export const FREE_CHECK_RECAPTCHA_SITE_KEY = "6LduD84tAAAAALrC9M8KlfaSX8VlGZEP3PTZDBcs";

function recaptchaSiteKey(): string {
  return readEnv("VITE_APPCHECK_RECAPTCHA_SITE_KEY") || FREE_CHECK_RECAPTCHA_SITE_KEY;
}

/**
 * OR-8 — EVERY free-check sign-in prompt points here: the save prompt, the "used" line
 * and all three refusal lines. `/login` is the one door that serves new AND returning
 * students (its new/returning toggle), so nobody who used the free check is stranded on
 * a create-only form. The redirect value `/check-improve` is internal, carries no
 * letter-led `x:` token (Login.tsx's guard) and no `/app/` (the router basename adds it).
 */
export const FREE_CHECK_SIGNIN_PATH = "/login?redirect=%2Fcheck-improve";

/* ─────────────────────────── refusals ─────────────────────────── */

export const FREE_CHECK_REFUSAL_REASONS = [
  "ceiling_reached",
  "budget",
  "app_check_missing",
  "app_check_invalid",
  "unavailable",
] as const;
export type FreeCheckRefusalReason = (typeof FREE_CHECK_REFUSAL_REASONS)[number];

/** Narrow a wire value to a known reason. Anything unrecognised is `unavailable`. */
export function toRefusalReason(raw: unknown): FreeCheckRefusalReason {
  const s = String(raw ?? "");
  return (FREE_CHECK_REFUSAL_REASONS as readonly string[]).includes(s)
    ? (s as FreeCheckRefusalReason)
    : "unavailable";
}

/**
 * The server refused a free check (403 `free_check_refused`), or this browser could not
 * produce an App Check token to ask with. Distinct from DailyLimitError (429) and
 * PremiumRequiredError (402) so a caller can map it to its own copy — and so aiClient
 * never `console.error`s an expected refusal.
 */
export class FreeCheckRefusedError extends Error {
  readonly reason: FreeCheckRefusalReason;
  readonly resetAt: string | null;

  constructor(reason: FreeCheckRefusalReason, resetAt: string | null = null) {
    super(refusalCopy(reason));
    this.name = "FreeCheckRefusedError";
    this.reason = reason;
    this.resetAt = resetAt;
  }
}

export function isFreeCheckRefusedError(err: unknown): err is FreeCheckRefusedError {
  return err instanceof FreeCheckRefusedError;
}

/* ─────────────────────────── student copy (spec §2, as amended) ─────────────────────────── */

export const FREE_CHECK_COPY = {
  /** After a free result. */
  afterResult: "Sign up free to save this and build your mistake pattern.",
  /** R1 — the browser has already used its free check. */
  used: "You've used your free check. Sign up free to save it and start your 7-day free trial — no card needed.",
  /** R3 / R5 — `ceiling_reached` and `budget`. */
  quota:
    "Today's free checks are all used up. Come back tomorrow — or sign up free now and start your 7-day trial to check today.",
  /**
   * `app_check_missing` / `app_check_invalid` — and `unavailable`, which the spec gives
   * no line of its own (reported in the 1b report).
   */
  browser: "We couldn't start a free check in this browser. Sign up free and your 7-day trial covers it.",
  /** R9 — the trial offer after a saved free result. */
  offerTitle: "Your answer is saved.",
  offerBody: (endsOn: string) =>
    `Start your 7-day free trial to check more answers and see your mistake pattern. No card needed. Ends ${endsOn}.`,
  /** OR-7 — replaces the "<3 − n> more checks…" line. Promises no threshold. */
  offerPattern: "Every answer you check helps build your mistake pattern.",
  offerStart: "Start my free trial",
  offerLater: "Maybe later",
  /** The one sign-in link label every free-check prompt uses. */
  signUpCta: "Sign up free",
} as const;

export function refusalCopy(reason: FreeCheckRefusalReason): string {
  return reason === "ceiling_reached" || reason === "budget" ? FREE_CHECK_COPY.quota : FREE_CHECK_COPY.browser;
}

/* ─────────────────────────── App Check (R4) ─────────────────────────── */

type AppCheckInstance = import("firebase/app-check").AppCheck;

let appCheckInit: Promise<AppCheckInstance | null> | null = null;

async function initAppCheck(): Promise<AppCheckInstance | null> {
  const { app } = await import("./firebaseClient");
  // Firebase is unconfigured (no VITE_FIREBASE_* env): there is no app to attest.
  if (!app) return null;
  const mod = await import("firebase/app-check");
  const debugToken = readEnv("VITE_APPCHECK_DEBUG_TOKEN");
  if (debugToken) {
    // Previews / local only. Read from env at init time, never committed; the SDK reads
    // this global inside initializeAppCheck().
    (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  return mod.initializeAppCheck(app, {
    provider: new mod.ReCaptchaEnterpriseProvider(recaptchaSiteKey()),
    // Only limited-use tokens are ever sent, so there is nothing to keep refreshed.
    isTokenAutoRefreshEnabled: false,
  });
}

/**
 * The App Check MODULE SINGLETON. A second `initializeAppCheck()` on the same app with
 * different options throws `appCheck/already-initialized` (U2, measured), so it is
 * initialised exactly once and every caller shares the promise. A failed or impossible
 * init is not cached, so a later call can try again.
 *
 * Called lazily — by the free-check page for a signed-out visitor, never from main.tsx.
 */
export function ensureFreeCheckAppCheck(): Promise<AppCheckInstance | null> {
  if (!appCheckInit) {
    appCheckInit = initAppCheck().then(
      (instance) => {
        if (!instance) appCheckInit = null;
        return instance;
      },
      () => {
        appCheckInit = null;
        return null;
      },
    );
  }
  return appCheckInit;
}

/**
 * A FRESH limited-use App Check token — one per request (OR-13 item 4). Never the
 * cached `getToken()`: the server consumes every token it verifies.
 */
export async function freshLimitedUseToken(): Promise<string> {
  const appCheck = await ensureFreeCheckAppCheck();
  if (!appCheck) throw new FreeCheckRefusedError("app_check_missing");
  const { getLimitedUseToken } = await import("firebase/app-check");
  let token = "";
  try {
    token = (await getLimitedUseToken(appCheck)).token;
  } catch {
    token = "";
  }
  if (!token) throw new FreeCheckRefusedError("app_check_missing");
  return token;
}

/**
 * The headers of ONE free-check request. JSON content type, the marker, and a token
 * minted for this request alone. Deliberately no identity headers of any kind.
 */
export async function freeCheckJsonHeaders(): Promise<Record<string, string>> {
  const token = await freshLimitedUseToken();
  return {
    "Content-Type": "application/json",
    [FREE_CHECK_MARKER_HEADER]: FREE_CHECK_MARKER_VALUE,
    [APP_CHECK_HEADER]: token,
  };
}

/** Test seam: forget the singleton so each test starts from an uninitialised module. */
export function __resetFreeCheckAppCheckForTests(): void {
  appCheckInit = null;
}

/* ─────────────────────────── R1 — one free check per browser, ever ─────────────────────────── */

/**
 * ★ THE KEY MUST NOT START WITH `lazytopper.` (N14). The DPDP erasure sweep removes every
 * key with that prefix (accountDataService.ts), so a prefixed mark would be RE-ARMED by
 * erasing an account — a free check per erasure. This key survives it by construction.
 */
export const FREE_CHECK_USED_KEY = "ltFreeCheck.used.v1";

export function hasUsedFreeCheck(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(FREE_CHECK_USED_KEY) !== null;
  } catch {
    return false;
  }
}

function markFreeCheckUsed(): void {
  try {
    window.localStorage.setItem(FREE_CHECK_USED_KEY, "1");
  } catch {
    /* storage refused: the server's ceiling + App Check still bound it */
  }
}

/* ─────────────────────────── R8 — the result waits on the device ─────────────────────────── */

/** Where the free result waits for sign-in. Text only (no image ever stored). */
export const FREE_CHECK_PENDING_KEY = "ltFreeCheck.pending.v1";

interface PendingBase {
  v: 1;
  /** Grade time (ms). recordAttempt keeps it as the attempt's timestamp (N14). */
  gradedAt: number;
  /** DesktopSubject ("Maths" | "Science"). */
  subject: string;
  topicName: string;
  topicSlug: string;
  /** Whether the student touched the topic correction (drives topicSource). */
  topicTouched: boolean;
}

export interface PendingSingleFreeCheck extends PendingBase {
  kind: "single";
  question: string;
  marksSource: "stated" | "inferred" | "fallback" | "user" | null;
  detectionOverride: DetectionOverrideLog | null;
  graded: CheckSolutionResponse;
}

export interface PendingMultiFreeCheck extends PendingBase {
  kind: "multi";
  questions: Array<{ questionNumber: number; questionText: string }>;
  response: WorksheetGradeResponse;
}

export type PendingFreeCheck = PendingSingleFreeCheck | PendingMultiFreeCheck;

/** Drop any key that could carry an image, at any depth. The shapes carry none today. */
function textOnly<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, v) => (/^image(Base64|MimeType)$/.test(key) ? undefined : v)),
  ) as T;
}

function isPending(v: unknown): v is PendingFreeCheck {
  const p = v as Partial<PendingFreeCheck> | null;
  if (!p || p.v !== 1) return false;
  if (p.kind === "single") return Boolean((p as PendingSingleFreeCheck).graded);
  if (p.kind === "multi") return Boolean((p as PendingMultiFreeCheck).response?.results);
  return false;
}

export function peekPendingFreeCheck(): PendingFreeCheck | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(FREE_CHECK_PENDING_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPending(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasPendingFreeCheck(): boolean {
  return peekPendingFreeCheck() !== null;
}

/**
 * Read AND remove, synchronously — the replay's exactly-once guarantee. A second caller
 * (a StrictMode re-run, a second tab) finds nothing to replay.
 */
export function claimPendingFreeCheck(): PendingFreeCheck | null {
  const pending = peekPendingFreeCheck();
  try {
    window.localStorage.removeItem(FREE_CHECK_PENDING_KEY);
  } catch {
    /* ignore */
  }
  return pending;
}

/** Put a claimed result back (the replay threw before it could be written). */
export function restorePendingFreeCheck(pending: PendingFreeCheck): void {
  try {
    window.localStorage.setItem(FREE_CHECK_PENDING_KEY, JSON.stringify(textOnly(pending)));
  } catch {
    /* ignore */
  }
}

/**
 * ★ THE ONLY PLACE THE R1 MARK IS SET — called from a SUCCESSFUL free grade only, after
 * the grader answered `ok`. The result is written first (R8: it must be on the device
 * before the student can navigate to sign in), then the mark.
 */
export function recordFreeCheckSuccess(pending: PendingFreeCheck): void {
  restorePendingFreeCheck(pending);
  markFreeCheckUsed();
}
