/**
 * ENGAGE10-1 — `engaged_10min`: ONE "stayed 10 minutes" signal per browser per IST day.
 *
 * WHY: owner ruling 25 Oct 2026 — time on the product is the honest sign of a student who may
 * buy (admin board, last 30 days: under 2 min -> pricing opened 4%; 15-30 min -> 53%; 30+ ->
 * 100%). 10 minutes is chosen so Google and Meta get enough such events a month to learn from.
 *
 * WHAT COUNTS: only VISIBLE time (no credit while the tab is hidden) AND only while the visitor
 * is not idle. IDLE RULE (one chosen, see below): time stops being credited once ENGAGED10_IDLE_MS
 * (5 min) has passed with no pointer, key, touch or scroll; the next interaction resumes it. A tab
 * left open and visible for hours therefore earns at most 5 idle minutes, never unlimited credit.
 * (The alternative, a per-minute credit cap needing an interaction each minute, would punish a
 * student reading a note in silence; a 5-minute grace does not.)
 *
 * ACROSS ROUTES / RELOADS / TABS: the running total is kept per IST day in localStorage
 * (`ENGAGED10_KEY`), so a reload or a second tab of the same day carries on from it. Each tick
 * ADDS its own visible slice to the stored total (read-modify-write; written back every 15 s and
 * whenever the tab is hidden or the event fires), so two simultaneously visible tabs both credit:
 * that is real attention on LazyTopper, and the event is still capped at once per day.
 * The LAST-ACTIVITY time is stored in the same record and a reload does not refresh it, so
 * reloading an untouched page cannot buy another 5 idle minutes. The page load counts as
 * activity only for the first record of an IST day.
 * Time is credited only where the fire gate allows it (not in an automated context, not on an
 * /admin path): admin browsing can never count toward the conversion. After the event has been
 * sent the watch keeps running, so a tab left open past IST midnight can fire for the new day. Storage unavailable (private window, blocked, throwing): the total is held in
 * memory for this document only, and the once-per-day flag likewise.
 *
 * Signed-in AND signed-out visitors: Google Ads optimises on the visitor, so nothing here asks who.
 *
 * This module holds no vendor: it sends through analytics.ts (`trackNamedEvent`) and applies the
 * existing gates (automated context, /admin) before counting and before sending; a refused fire
 * does not use up the day. It is loaded by dynamic import from analytics.ts (~2 s after the first
 * page view) so it stays out of the eager entry chunk. The calendar is read only when a tick
 * credits time (never at start-up), so a page view alone is not a clock reader.
 *
 * Its own visibility listener, not engagedVisit's: that watcher deletes its listeners the moment
 * it fires (10 s in), long before 10 minutes. Never throws.
 */
import { ADMIN_PATH, analyticsEnabled, routerPathOf, trackNamedEvent } from "./analytics";

export const ENGAGED10_MS = 10 * 60_000;
export const ENGAGED10_TICK_MS = 5_000;
export const ENGAGED10_IDLE_MS = 5 * 60_000;
export const ENGAGED10_WRITE_MS = 15_000;
export const ENGAGED10_KEY = "lazytopper.engaged10";

type Stored = { day: string; ms: number; sent: boolean; act: number };

const LISTEN: AddEventListenerOptions = { capture: true, passive: true };
const IST_OFFSET_MS = 330 * 60_000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
const EMPTY: Stored = { day: "", ms: 0, sent: false, act: 0 };

let started = false;
let interval: ReturnType<typeof setInterval> | null = null;
let lastTick: number | null = null;
let memAct = 0; // wall-clock ms of the last interaction seen by THIS document (0 = none yet)
let mem: Stored = { ...EMPTY };
let pending = 0; // credited ms not yet written to storage

function isVisible(): boolean {
  try {
    return document.visibilityState === "visible";
  } catch {
    return false;
  }
}

/** Monotonic, tab-local (engagedVisit.ts precedent): measures slices, never the calendar. */
function monoNow(): number {
  try {
    return performance.now();
  } catch {
    return 0;
  }
}

function istDay(wall: number): string {
  return new Date(wall + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(ENGAGED10_KEY);
    if (!raw) return { ...EMPTY };
    const v = JSON.parse(raw) as Partial<Stored> | null;
    if (!v || typeof v.day !== "string" || typeof v.ms !== "number" || !(v.ms >= 0)) return { ...EMPTY };
    return { day: v.day, ms: v.ms, sent: v.sent === true, act: typeof v.act === "number" && v.act > 0 ? v.act : 0 };
  } catch {
    return null; // storage unavailable
  }
}

function writeStored(rec: Stored): void {
  try {
    window.localStorage.setItem(ENGAGED10_KEY, JSON.stringify(rec));
  } catch {
    /* storage unavailable: the in-memory copy carries this document */
  }
}

/** The gate for both counting and sending: not an automated context, not an /admin page. */
export function engaged10Allowed(): boolean {
  try {
    return analyticsEnabled() && !ADMIN_PATH.test(routerPathOf(window.location.pathname));
  } catch {
    return false;
  }
}

/**
 * `engaged_10min`: a bare name to GA4, Vercel, Meta (custom `Engaged10Min`, see META_EVENTS) and
 * the first-party activity log (signed-in students only). Returns whether it was sent: false in
 * an automated context or on an /admin page, so the watch keeps its minutes.
 */
export function trackEngaged10Min(): boolean {
  try {
    if (!engaged10Allowed()) return false;
    trackNamedEvent("engaged_10min");
    return true;
  } catch {
    return false;
  }
}

/** Today's record: storage when readable, else this document's memory; a new IST day starts empty. */
function current(day: string): { rec: Stored; fromMemory: boolean } {
  const stored = readStored();
  const base = stored === null ? mem : stored;
  const rec = base.day === day ? { ...base } : { ...EMPTY, day };
  if (mem.day === day && mem.sent) rec.sent = true;
  if (mem.day === day && mem.act > rec.act) rec.act = mem.act;
  return { rec, fromMemory: stored === null };
}

/**
 * Credit one visible slice, if the gate allows and the visitor is not idle. `flush` forces the
 * write-back (tab hidden). Nothing here throws into the page.
 */
function credit(slice: number, flush: boolean): void {
  if (!engaged10Allowed()) return; // admin / automated: never counted, not even toward a later fire
  const wall = Date.now();
  const day = istDay(wall);
  const { rec, fromMemory } = current(day);
  if (rec.sent) {
    mem = rec;
    pending = 0;
    return;
  }
  let act = Math.max(rec.act, memAct);
  if (act === 0) act = wall; // the first record of an IST day: the page load is the first activity
  if (wall - act > ENGAGED10_IDLE_MS) {
    rec.act = act;
    mem = rec;
    return;
  }
  rec.act = act;
  // Memory already holds the unwritten slices; storage does not.
  rec.ms += slice + (fromMemory ? 0 : pending);
  pending += slice;
  if (rec.ms >= ENGAGED10_MS) {
    let sent = false;
    try {
      sent = trackEngaged10Min();
    } catch {
      sent = false;
    }
    if (sent) rec.sent = true;
    flush = true;
  }
  mem = rec;
  if (flush || pending >= ENGAGED10_WRITE_MS) {
    writeStored(rec);
    pending = 0;
  }
}

function onTick(): void {
  const now = monoNow();
  if (!isVisible()) {
    lastTick = null;
    return;
  }
  const since = lastTick === null ? 0 : now - lastTick;
  lastTick = now;
  // A throttled or frozen timer must not mint time: one slice is at most two ticks.
  const slice = Math.min(Math.max(0, since), ENGAGED10_TICK_MS * 2);
  if (slice > 0) credit(slice, false);
}

function clearTicker(): void {
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}

function startTicker(): void {
  if (interval !== null) return;
  lastTick = monoNow();
  interval = setInterval(onTick, ENGAGED10_TICK_MS);
}

function onVisibility(): void {
  if (isVisible()) {
    startTicker();
    return;
  }
  // Close the slice that ran up to the moment the tab was hidden, write it, and stop.
  if (lastTick !== null) {
    const slice = Math.min(Math.max(0, monoNow() - lastTick), ENGAGED10_TICK_MS);
    if (slice > 0) credit(slice, true);
    else if (pending > 0) {
      writeStored(mem);
      pending = 0;
    }
  }
  lastTick = null;
  clearTicker();
}

function onActivity(): void {
  try {
    memAct = Date.now();
  } catch {
    /* analytics must never break the page */
  }
}

function removeListeners(): void {
  try {
    for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity, LISTEN);
    document.removeEventListener("visibilitychange", onVisibility);
  } catch {
    /* analytics must never break the page */
  }
}

/** Start watching, ONCE per document. Later calls (every route change) are no-ops. */
export function startEngaged10Watch(): void {
  if (started) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  started = true;
  try {
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, LISTEN);
    document.addEventListener("visibilitychange", onVisibility);
    if (isVisible()) startTicker();
  } catch {
    /* analytics must never break the page */
  }
}

/** Test seam: forget this document's watch entirely (listeners, ticker, in-memory total). */
export function __resetEngaged10ForTests(): void {
  clearTicker();
  removeListeners();
  started = false;
  lastTick = null;
  memAct = 0;
  mem = { ...EMPTY };
  pending = 0;
}
