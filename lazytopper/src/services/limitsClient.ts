/**
 * limitsClient — LIMITS-1 PR-1: the client half of the weekly download limit.
 * The server half is server/services/limits.cjs, which DECIDES; this file only asks.
 *
 * ★ DARK BY DEFAULT. With `VITE_LIMITS_ENABLED` unset nothing here touches the network and
 * every download behaves exactly as before. The server has its own switch (LIMITS_ENFORCE).
 *
 * ★ SOFT LIMIT, SAID HONESTLY. The PDF is built in the browser, so a determined student can
 * bypass a client check. The server mint makes the count cross-device and not resettable by
 * clearing storage, which is what a real student would otherwise do. Same honesty as
 * MockViewGate: this is a nudge toward Premium, not a vault.
 *
 * ★ FAILS OPEN on a server error (a student is never blocked by a blip). The one exception is
 * being offline: no mint is possible, so no PDF is built, and the wall says so calmly.
 */
import type { DownloadKind } from "../analytics/analytics";
import { paidJsonHeaders } from "../ai/paidCallHeaders";

export const LIMITS_ENDPOINT = "/api/usage/limits";
export const LIMITS_DOWNLOAD_ENDPOINT = "/api/usage/limits/download";

/** Read as a LITERAL `import.meta.env.VITE_…` so Vite and Vitest both rewrite it. */
function readFlag(): string {
  try {
    const raw: unknown = import.meta.env.VITE_LIMITS_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

export function isLimitsClientEnabled(): boolean {
  return /^(1|true|on|yes)$/i.test(readFlag());
}

export interface DownloadCounters {
  metered: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  firstFreeAvailable: boolean;
  resetAt: string | null;
}

export interface LimitsSummary {
  tier: string | null;
  enforced: boolean;
  download: DownloadCounters | null;
}

export type MintResult =
  | { status: "off" }
  | { status: "signed_out" }
  | { status: "offline" }
  | { status: "open" }
  | { status: "ok"; counted: boolean; free: boolean; remaining: number | null; limit: number | null; resetAt: string | null }
  | { status: "blocked"; resetAt: string | null; limit: number | null };

function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

/**
 * Ask the server for ONE counted download. `signedIn` comes from the caller's auth context so
 * a signed-out visitor makes no request. Never throws.
 */
export async function mintDownload(kind: DownloadKind, paperKey: string, signedIn: boolean): Promise<MintResult> {
  if (!isLimitsClientEnabled()) return { status: "off" };
  if (!signedIn) return { status: "signed_out" };
  let headers: Record<string, string>;
  try {
    headers = await paidJsonHeaders();
  } catch {
    return { status: "open" };
  }
  if (!headers["X-Lazytopper-Uid"]) return { status: "signed_out" };
  let res: Response;
  try {
    res = await fetch(LIMITS_DOWNLOAD_ENDPOINT, { method: "POST", headers, body: JSON.stringify({ kind, paperKey }) });
  } catch {
    return isOffline() ? { status: "offline" } : { status: "open" };
  }
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await res.text());
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    /* an unreadable body is a fail-open below */
  }
  if (res.status === 409 && body.error === "download_limit") {
    return { status: "blocked", resetAt: str(body.resetAt), limit: num(body.limit) };
  }
  if (!res.ok) return { status: "open" };
  void refreshLimitsSummary();
  return {
    status: "ok",
    counted: body.counted === true,
    free: body.free === true,
    remaining: num(body.remaining),
    limit: num(body.limit),
    resetAt: str(body.resetAt),
  };
}

/* ── The counters the chip reads: one shared copy, refreshed after each mint ── */

let cached: LimitsSummary | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function getLimitsSummary(): LimitsSummary | null {
  return cached;
}

export function subscribeLimitsSummary(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Test seam. */
export function resetLimitsSummaryForTests(): void {
  cached = null;
  inflight = null;
  listeners.clear();
}

function parseDownload(v: unknown): DownloadCounters | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  return {
    metered: d.metered === true,
    limit: num(d.limit),
    used: num(d.used) ?? 0,
    remaining: num(d.remaining),
    firstFreeAvailable: d.firstFreeAvailable === true,
    resetAt: str(d.resetAt),
  };
}

export function refreshLimitsSummary(): Promise<void> {
  if (!isLimitsClientEnabled()) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const headers = await paidJsonHeaders();
      if (!headers["X-Lazytopper-Uid"]) return;
      const res = await fetch(LIMITS_ENDPOINT, { method: "GET", headers });
      if (!res.ok) return;
      const body = JSON.parse(await res.text()) as Record<string, unknown>;
      cached = {
        tier: str(body.tier),
        enforced: body.enforced === true,
        download: parseDownload(body.download),
      };
      listeners.forEach((fn) => fn());
    } catch {
      /* the chip simply stays hidden */
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** A stable, short paperKey for a practice set (no paper id exists): the same questions give the same key. */
export function practiceSetPaperKey(ids: ReadonlyArray<string | number>): string {
  const joined = ids.map((i) => String(i)).sort().join(",");
  let h = 2166136261;
  for (let i = 0; i < joined.length; i += 1) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `qp-${ids.length}-${(h >>> 0).toString(36)}`;
}
