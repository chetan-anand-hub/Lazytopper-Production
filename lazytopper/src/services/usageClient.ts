/**
 * usageClient — FAIR-USE-UI-1. The ONE reader of `GET /api/usage/me` and the ONE
 * place a fair-use refusal is recognised on the client.
 *
 * ★★ DARK BY CONSTRUCTION. Everything the student could see about fair limits hangs
 * off `UsageSnapshot`, and a snapshot exists ONLY when the server said
 * `enforced: true` (FAIR-USE-2 F5 — true only while `FAIR_USE_ENFORCE=1`). Every other
 * answer — `enforced: false`, the field missing, a 401/404/5xx, a network failure, a
 * slow server (timeout), a malformed body, a signed-out visitor — is `null`, and
 * `null` renders nothing anywhere. Fail CLOSED to "not enforced".
 *
 * ★ NEVER IN FRONT OF GRADING. Callers read `peekUsage()` (synchronous, whatever is
 * already cached) at the moment a student presses Grade; nothing here is awaited on the
 * way to a grading call. The fetch happens once per page mount, behind a short cache
 * (FU-FAIR-USE-USAGE-ME-RATE: the endpoint is unmetered and costs ~8 reads).
 *
 * ★ NO BROWSER STORAGE. The cache is module memory, keyed by the signed-in uid, so a
 * second account in the same tab never sees the first one's numbers — and nothing
 * about a limit ever touches localStorage (CLAUDE.md §7).
 *
 * Every number shown comes from the server's own response. Nothing is computed here
 * beyond validating the shape: never an invented count, never rupees.
 */

import { paidCallHeaders, UID_HEADER } from "../ai/paidCallHeaders";
// FAIR-USE-2 (#860) — the merged F4 contract. TYPE-ONLY on purpose: erased at build, so
// no runtime edge to aiClient (several suites mock it with a partial factory).
import type { FairUseLimitKind, FairUseLimitWindow } from "../ai/aiClient";

export const USAGE_ME_ENDPOINT = "/api/usage/me";

/** How long a slow endpoint may take before the page gives up and stays dark. */
export const USAGE_FETCH_TIMEOUT_MS = 4000;
/** An ENFORCED snapshot is short-lived: its counts move with every grade. */
export const USAGE_CACHE_MS_ENFORCED = 60_000;
/** A DARK answer is kept longer: the switch flips rarely and the read is not free. */
export const USAGE_CACHE_MS_DARK = 10 * 60_000;

/** = aiClient's `FairUseLimitWindow` (FAIR-USE-2 F4), the same three windows /api/usage/me uses. */
export type PremiumWindow = FairUseLimitWindow;

/**
 * FAIR-USE-3 R3 — the trial limits in force, from the server's env. Each is a whole
 * number, or null when the server did not send it (an older server, or a malformed
 * field): the copy then OMITS the number rather than guess one.
 */
export interface TrialLimits {
  checksPerDay: number | null;
  chapterTestsPerDay: number | null;
  mocksPerWeek: number | null;
  worksheetsPerWeek: number | null;
}

export interface TrialUsage {
  checksLeftToday: number;
  chapterTestsLeftToday: number;
  mocksLeft: number;
  worksheetsLeft: number;
  resets: {
    checks: string | null;
    chapterTests: string | null;
    mocks: string | null;
    worksheets: string | null;
  };
  limits: TrialLimits;
}

export interface PremiumUsage {
  fiveHourPct: number;
  dayPct: number;
  weekPct: number;
  /**
   * CAP-30DAY — the rolling 30-IST-day window, in the same shape as the others. Null when
   * the server did not send it (an older server, or a malformed field): no bar is shown,
   * never a guessed one.
   */
  thirtyDayPct: number | null;
  resets: { fiveHour: string | null; day: string | null; week: string | null; thirtyDay: string | null };
}

/** Exists ONLY for an enforced response. `trial`/`premium` are null when the server
 *  sent nothing usable for that tier — the card then shows an honest empty state. */
export interface UsageSnapshot {
  enforced: true;
  tier: string;
  trial: TrialUsage | null;
  premium: PremiumUsage | null;
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isPct = (v: unknown): v is number => isCount(v) && v <= 100;
/** A limit is a positive whole number; anything else is unknown (null), never repaired. */
const limitOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
const isoOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" && !Number.isNaN(Date.parse(v)) ? v : null;
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function parseTrial(raw: unknown): TrialUsage | null {
  const t = obj(raw);
  if (!t) return null;
  const { checksLeftToday, chapterTestsLeftToday, mocksLeft, worksheetsLeft } = t;
  if (!isCount(checksLeftToday) || !isCount(chapterTestsLeftToday) || !isCount(mocksLeft) || !isCount(worksheetsLeft)) {
    return null;
  }
  const r = obj(t.resets) ?? {};
  const l = obj(t.limits) ?? {};
  return {
    checksLeftToday,
    chapterTestsLeftToday,
    mocksLeft,
    worksheetsLeft,
    resets: {
      checks: isoOrNull(r.checks),
      chapterTests: isoOrNull(r.chapterTests),
      mocks: isoOrNull(r.mocks),
      worksheets: isoOrNull(r.worksheets),
    },
    limits: {
      checksPerDay: limitOrNull(l.checksPerDay),
      chapterTestsPerDay: limitOrNull(l.chapterTestsPerDay),
      mocksPerWeek: limitOrNull(l.mocksPerWeek),
      worksheetsPerWeek: limitOrNull(l.worksheetsPerWeek),
    },
  };
}

function parsePremium(raw: unknown): PremiumUsage | null {
  const p = obj(raw);
  if (!p) return null;
  const { fiveHourPct, dayPct, weekPct } = p;
  if (!isPct(fiveHourPct) || !isPct(dayPct) || !isPct(weekPct)) return null;
  const r = obj(p.resets) ?? {};
  return {
    fiveHourPct,
    dayPct,
    weekPct,
    // CAP-30DAY: optional, so a server without it still parses exactly as before.
    thirtyDayPct: isPct(p.thirtyDayPct) ? p.thirtyDayPct : null,
    resets: {
      fiveHour: isoOrNull(r.fiveHour),
      day: isoOrNull(r.day),
      week: isoOrNull(r.week),
      thirtyDay: isoOrNull(r.thirtyDay),
    },
  };
}

/**
 * PURE. The server's body -> a snapshot, or null. ★ `enforced` must be the BOOLEAN
 * `true` — a string "true", a 1, or a missing field is dark. This is the single line
 * the whole lane's darkness rests on.
 */
export function parseUsageMe(body: unknown): UsageSnapshot | null {
  const b = obj(body);
  if (!b || b.enforced !== true) return null;
  const tier = typeof b.tier === "string" ? b.tier : "";
  return {
    enforced: true,
    tier,
    trial: tier === "trial" ? parseTrial(b.trial) : null,
    premium: tier === "premium" ? parsePremium(b.premium) : null,
  };
}

/* ── The cache ─────────────────────────────────────────────────────────────── */

interface CacheEntry {
  uid: string;
  snapshot: UsageSnapshot | null;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let inflight: { uid: string; promise: Promise<UsageSnapshot | null> } | null = null;

/** Forget what was read — the next `fetchUsageMe` asks the server again. Called after a
 *  grade was served or refused, because either one moves the counts. */
export function invalidateUsage(): void {
  cache = null;
}

/** Test seam only. */
export function __resetUsageClientForTests(): void {
  cache = null;
  inflight = null;
}

/** SYNCHRONOUS: the cached, still-fresh snapshot, or null. Never fetches — this is what a
 *  Grade tap reads, so the tap is never held up by the usage endpoint. */
export function peekUsage(nowMs: number = Date.now()): UsageSnapshot | null {
  if (!cache || cache.expiresAt <= nowMs) return null;
  return cache.snapshot;
}

async function readOnce(headers: Record<string, string>): Promise<UsageSnapshot | null> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), USAGE_FETCH_TIMEOUT_MS) : null;
  try {
    const res = await fetch(USAGE_ME_ENDPOINT, {
      method: "GET",
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return null;
    return parseUsageMe(await res.json());
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The signed-in student's usage, or null (= dark). Never throws.
 *
 * A signed-out visitor is answered locally — no request at all — because the server
 * could only say 401. A student whose sign-in cannot be confirmed (paidCallHeaders
 * throws SignInAgainError) is also dark here; the grade call itself will say so.
 */
export async function fetchUsageMe(opts: { force?: boolean } = {}): Promise<UsageSnapshot | null> {
  let headers: Record<string, string>;
  try {
    headers = await paidCallHeaders();
  } catch {
    return null;
  }
  const uid = headers[UID_HEADER];
  if (!uid || !headers.Authorization) return null;

  const now = Date.now();
  if (!opts.force && cache && cache.uid === uid && cache.expiresAt > now) return cache.snapshot;
  if (inflight && inflight.uid === uid) return inflight.promise;

  const promise = readOnce(headers).then((snapshot) => {
    cache = {
      uid,
      snapshot,
      expiresAt: Date.now() + (snapshot ? USAGE_CACHE_MS_ENFORCED : USAGE_CACHE_MS_DARK),
    };
    return snapshot;
  });
  inflight = { uid, promise };
  try {
    return await promise;
  } finally {
    if (inflight && inflight.promise === promise) inflight = null;
  }
}

/* ── Recognising a fair-use refusal (FAIR-USE-2 F4) ────────────────────────── */

/**
 * The fields of FAIR-USE-2's merged `FairUseLimitError` (src/ai/aiClient.ts, #860:
 * `kind`, `remaining`, `resetAt`, `window`, `name === "FairUseLimitError"`).
 *
 * ⚠ READ BY `name`, NEVER BY `instanceof` — the convention every grading surface in
 * this app already follows for PremiumRequiredError / SignInAgainError: several suites
 * mock `src/ai/aiClient` with a partial factory, so a VALUE import from it throws in any
 * suite that loads these pages. `name` needs no import.
 */
export interface FairUseLimitInfo {
  kind: FairUseLimitKind | null;
  remaining: number | null;
  resetAt: string | null;
  window: PremiumWindow | null;
}

export const FAIR_USE_LIMIT_ERROR_NAME = "FairUseLimitError";

const WINDOWS: readonly PremiumWindow[] = ["fiveHour", "day", "week", "thirtyDay"];

/** PURE. The refusal's fields, or null when `err` is not a fair-use refusal. Accepts a
 *  thrown error, or a `{ name }`-only record (a service that carried only the name). */
export function readFairUseLimit(err: unknown): FairUseLimitInfo | null {
  const e = obj(err) ?? (err instanceof Error ? (err as unknown as Record<string, unknown>) : null);
  if (!e || e.name !== FAIR_USE_LIMIT_ERROR_NAME) return null;
  const kind = e.kind === "trial_limit" || e.kind === "usage_limit" ? e.kind : null;
  const win = typeof e.window === "string" && (WINDOWS as readonly string[]).includes(e.window)
    ? (e.window as PremiumWindow)
    : null;
  return {
    kind,
    remaining: isCount(e.remaining) ? e.remaining : null,
    resetAt: isoOrNull(e.resetAt),
    window: win,
  };
}
