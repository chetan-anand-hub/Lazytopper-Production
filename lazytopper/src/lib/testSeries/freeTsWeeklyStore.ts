/**
 * FREE-TS-WEEKLY (owner ruling 27 Nov 2026, 13:14 IST) - the device's own count of Test Series papers a Basic / trial / signed-out
 * visitor has OPENED in the last 7 days (a rolling window, the product's weekly window). Import-light on purpose: MockViewGate is
 * eager. The route -> series-paper classifier (which needs the heavy series tables) lives in ./freeTsWeekly and is loaded lazily.
 *
 * One open per PAPER per window: opening the same paper again inside the week is the same open (a resume or a re-visit never counts
 * twice). SOFT LIMIT: clearing storage resets it; the server's POST /api/usage/limits/open is the cross-device, signed-in count.
 */
import { paperRouteKey } from "../papers/resumablePaper";
import { FREE_TS_WEEKLY_SIGNED_IN, FREE_TS_WEEKLY_SIGNED_OUT, FREE_TS_WEEK_MS } from "../../config/mockViewLimits";

const KEY = "lazytopper.freeTsWeekly";
const MAX = 60;

interface Open {
  k: string;
  at: number;
}

export function freeTsWeeklyLimitFor(signedIn: boolean): number {
  return signedIn ? FREE_TS_WEEKLY_SIGNED_IN : FREE_TS_WEEKLY_SIGNED_OUT;
}

function scopeOf(uid: string | null): string {
  if (uid) return uid;
  // Signed out: the device. A random per-session id would let a new tab reset the week, so the signed-out scope is one fixed key.
  return "guest";
}

function read(uid: string | null, nowMs: number): Open[] {
  try {
    const raw = localStorage.getItem(`${KEY}:${scopeOf(uid)}`);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e): e is Open => !!e && typeof e.k === "string" && typeof e.at === "number" && Number.isFinite(e.at) && nowMs - e.at < FREE_TS_WEEK_MS && e.at <= nowMs + 5 * 60 * 1000,
    );
  } catch {
    return [];
  }
}

/** Distinct Test Series papers opened inside the rolling week. */
export function freeTsWeeklyOpens(uid: string | null, nowMs = Date.now()): number {
  return new Set(read(uid, nowMs).map((e) => e.k)).size;
}

/** Was this paper already opened inside the week? (Then opening it again is not a new open.) */
export function freeTsWeeklyHas(uid: string | null, paperKey: string, nowMs = Date.now()): boolean {
  return read(uid, nowMs).some((e) => e.k === paperKey);
}

/** May this paper be opened now? True when it is already counted this week, or a slot is free. */
export function freeTsWeeklyMayOpen(uid: string | null, paperKey: string, nowMs = Date.now()): boolean {
  return freeTsWeeklyHas(uid, paperKey, nowMs) || freeTsWeeklyOpens(uid, nowMs) < freeTsWeeklyLimitFor(!!uid);
}

/** Record an open (idempotent per paper inside the week). */
export function freeTsWeeklyRecord(uid: string | null, paperKey: string, nowMs = Date.now()): void {
  const list = read(uid, nowMs);
  if (list.some((e) => e.k === paperKey)) return;
  list.push({ k: paperKey, at: nowMs });
  try {
    localStorage.setItem(`${KEY}:${scopeOf(uid)}`, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* best-effort */
  }
}

export const FREE_TS_WEEKLY_STORAGE_KEY = KEY;

export type PaperSurface = "chapter-test" | "full-mock";

/** Is this a Chapter Test / Full Mock route (the two surfaces the weekly rule covers)? */
export function paperSurfaceOfRoute(pathname: string): PaperSurface | null {
  const base = String(pathname || "").trim().toLowerCase().replace(/\/+$/, "");
  if (/^\/chapter-test\//.test(base)) return "chapter-test";
  if (/^\/full-mock\//.test(base)) return "full-mock";
  return null;
}

/**
 * route key -> the series paper key the gate classified it as (null: an ordinary paper). Filled by MockViewGate when it judges a
 * route, read by `claimNewPaperView` (a page's Start) so a Start counts against the same paper. Absent = not classified.
 */
const classified = new Map<string, string | null>();
/** paperRouteKey alone conflates a chapter series paper 1 with the ordinary test of the same chapter (and ignores ?focus), so the class key adds both. */
function classKey(pathname: string, search: string): string {
  let sp: URLSearchParams;
  try {
    sp = new URLSearchParams(String(search || ""));
  } catch {
    sp = new URLSearchParams();
  }
  return `${paperRouteKey(pathname, search)}|${sp.get("series") === "1" ? "s" : ""}|${sp.get("focus") || ""}`;
}
export function rememberSeriesRoute(pathname: string, search: string, seriesKey: string | null): void {
  if (classified.size > 50) classified.clear();
  classified.set(classKey(pathname, search), seriesKey);
}
export function recalledSeriesRoute(pathname: string, search: string): string | null | undefined {
  return classified.get(classKey(pathname, search));
}
export function resetFreeTsWeeklyForTests(): void {
  classified.clear();
}
