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
 * ADDS its own visible slice to the stored total (read-modify-write), so two simultaneously
 * visible tabs both credit: that is real attention on LazyTopper, and the event is still capped
 * at once per day. Storage unavailable (private window, blocked, throwing): the total is held in
 * memory for this document only, and the once-per-day flag likewise.
 *
 * Signed-in AND signed-out visitors: Google Ads optimises on the visitor, so nothing here asks who.
 *
 * This module only WATCHES and holds no vendor. `fire` is handed in by analytics.ts
 * (`trackEngaged10Min`), which applies the existing gates (automated context, /admin) and reports
 * whether it sent; a refused fire does not use up the day. The calendar is read only when a tick
 * credits time (never at start-up), so a page view alone is not a clock reader.
 *
 * Its own visibility listener, not engagedVisit's: that watcher deletes its listeners the moment
 * it fires (10 s in), long before 10 minutes. Never throws.
 */
export const ENGAGED10_MS = 10 * 60_000;
export const ENGAGED10_TICK_MS = 5_000;
export const ENGAGED10_IDLE_MS = 5 * 60_000;
export const ENGAGED10_KEY = "lazytopper.engaged10";

type Fire = () => boolean;
type Stored = { day: string; ms: number; sent: boolean };

const LISTEN: AddEventListenerOptions = { capture: true, passive: true };
const IST_OFFSET_MS = 330 * 60_000;

let started = false;
let done = false;
let fire: Fire | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let lastTick: number | null = null;
let lastActivity = 0;
let mem: Stored = { day: "", ms: 0, sent: false };

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

/** The IST calendar day, `YYYY-MM-DD`. */
function istDay(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(ENGAGED10_KEY);
    if (!raw) return { day: "", ms: 0, sent: false };
    const v = JSON.parse(raw) as Partial<Stored> | null;
    if (!v || typeof v.day !== "string" || typeof v.ms !== "number" || !(v.ms >= 0)) {
      return { day: "", ms: 0, sent: false };
    }
    return { day: v.day, ms: v.ms, sent: v.sent === true };
  } catch {
    return null; // storage unavailable
  }
}

function writeStored(s: Stored): void {
  try {
    window.localStorage.setItem(ENGAGED10_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: the in-memory copy carries this document */
  }
}

function clearTicker(): void {
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}

function credit(slice: number): void {
  const day = istDay();
  const stored = readStored();
  let cur: Stored;
  if (stored === null) {
    cur = mem.day === day ? mem : { day, ms: 0, sent: false };
  } else {
    cur = stored.day === day ? stored : { day, ms: 0, sent: false };
    // A stored record can be older than this document's memory only if storage was cleared mid-day.
    if (mem.day === day && mem.sent) cur.sent = true;
  }
  if (cur.sent) {
    mem = cur;
    stop();
    return;
  }
  cur = { day, ms: cur.ms + slice, sent: false };
  if (cur.ms >= ENGAGED10_MS) {
    let sent = false;
    try {
      sent = !!fire && fire() === true;
    } catch {
      sent = false;
    }
    if (sent) cur.sent = true;
  }
  mem = cur;
  writeStored(cur);
  if (cur.sent) stop();
}

function onTick(): void {
  if (done) return;
  const now = monoNow();
  if (!isVisible()) {
    lastTick = null;
    return;
  }
  const since = lastTick === null ? 0 : now - lastTick;
  lastTick = now;
  // Idle: no credit once the visitor has been inactive past the grace; resumes on interaction.
  if (now - lastActivity > ENGAGED10_IDLE_MS) return;
  // A throttled or frozen timer must not mint time: one slice is at most two ticks.
  const slice = Math.min(Math.max(0, since), ENGAGED10_TICK_MS * 2);
  if (slice > 0) credit(slice);
}

function startTicker(): void {
  if (interval !== null || done) return;
  lastTick = monoNow();
  interval = setInterval(onTick, ENGAGED10_TICK_MS);
}

function onVisibility(): void {
  if (done) return;
  if (isVisible()) {
    startTicker();
  } else {
    // Close the slice that ran up to the moment the tab was hidden, then stop.
    if (lastTick !== null) {
      const now = monoNow();
      if (now - lastActivity <= ENGAGED10_IDLE_MS) {
        const slice = Math.min(Math.max(0, now - lastTick), ENGAGED10_TICK_MS);
        if (slice > 0) credit(slice);
      }
    }
    lastTick = null;
    clearTicker();
  }
}

function onActivity(): void {
  lastActivity = monoNow();
}

function removeListeners(): void {
  try {
    for (const ev of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) {
      window.removeEventListener(ev, onActivity, LISTEN);
    }
    document.removeEventListener("visibilitychange", onVisibility);
  } catch {
    /* analytics must never break the page */
  }
}

function stop(): void {
  done = true;
  clearTicker();
  removeListeners();
}

/** Start watching, ONCE per document. Later calls (every route change) are no-ops. */
export function startEngaged10Watch(fireFn: Fire): void {
  if (started) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  started = true;
  fire = fireFn;
  try {
    lastActivity = monoNow(); // loading the page counts as the first activity
    for (const ev of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) {
      window.addEventListener(ev, onActivity, LISTEN);
    }
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
  done = false;
  fire = null;
  lastTick = null;
  lastActivity = 0;
  mem = { day: "", ms: 0, sent: false };
}
