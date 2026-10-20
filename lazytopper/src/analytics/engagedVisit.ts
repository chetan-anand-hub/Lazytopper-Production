/**
 * MEASURE-1 A — `engaged_visit`: ONE honest "this visitor engaged" signal per page load.
 *
 * WHY: Vercel's bounce rate counts every one-page visit as a bounce. /check-improve does its
 * whole job on ONE URL and /for-parents' main button leaves for WhatsApp, so a visitor who did
 * exactly what we want reads as a bounce. This fires once per DOCUMENT (an SPA route change
 * never re-arms it) when EITHER:
 *   - "time":        the tab has been VISIBLE for a cumulative ENGAGED_VISIBLE_MS, or
 *   - "interaction": the first real interaction — pointerdown, keydown, or a scroll of more
 *                    than ENGAGED_SCROLL_PX from where the page started (mousemove never counts).
 *
 * A tab that never becomes visible (a prerender, a background bot) accumulates no time and
 * fires nothing: both triggers require `document.visibilityState === "visible"`.
 *
 * This module only WATCHES. It holds no vendor and sends nothing itself: `fire` is handed in by
 * analytics.ts (`trackEngagedVisit`), which applies the module's existing gates (automated
 * context, /admin) and reports whether it actually sent. A trigger that was refused (an /admin
 * page) does not use up the visit: a later interaction on another page can still count it.
 * Never throws.
 */
export type EngagedVisitTrigger = "time" | "interaction";

export const ENGAGED_VISIBLE_MS = 10_000;
export const ENGAGED_SCROLL_PX = 200;

type Fire = (trigger: EngagedVisitTrigger) => boolean;

let started = false;
let done = false;
let timeSpent = false;
let visibleMs = 0;
let visibleSince: number | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let startScrollY = 0;
let fire: Fire | null = null;

const LISTEN: AddEventListenerOptions = { capture: true, passive: true };

function isVisible(): boolean {
  try {
    return document.visibilityState === "visible";
  } catch {
    return false;
  }
}

function scrollY(): number {
  try {
    return Number(window.scrollY) || 0;
  } catch {
    return 0;
  }
}

/**
 * A monotonic, tab-local stamp (zeroGraded.ts precedent): it only measures visible time, never
 * the calendar, so it does not make every page-view test a clock reader (CI-SPEED-1 clock guard).
 */
function monoNow(): number {
  try {
    return performance.now();
  } catch {
    return 0;
  }
}

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

function attempt(trigger: EngagedVisitTrigger): void {
  if (done || !isVisible() || !fire) return;
  let sent = false;
  try {
    sent = fire(trigger) === true;
  } catch {
    sent = false;
  }
  if (sent) stop();
}

function onTimer(): void {
  timer = null;
  timeSpent = true;
  attempt("time");
}

function arm(): void {
  clearTimer();
  if (done || timeSpent) return;
  const remaining = Math.max(0, ENGAGED_VISIBLE_MS - visibleMs);
  timer = setTimeout(onTimer, remaining);
}

function onVisibility(): void {
  if (done) return;
  if (isVisible()) {
    if (visibleSince === null) {
      visibleSince = monoNow();
      arm();
    }
  } else {
    if (visibleSince !== null) {
      visibleMs += Math.max(0, monoNow() - visibleSince);
      visibleSince = null;
    }
    clearTimer();
  }
}

function onInteraction(): void {
  attempt("interaction");
}

function onScroll(): void {
  if (Math.abs(scrollY() - startScrollY) > ENGAGED_SCROLL_PX) attempt("interaction");
}

function removeListeners(): void {
  try {
    window.removeEventListener("pointerdown", onInteraction, LISTEN);
    window.removeEventListener("keydown", onInteraction, LISTEN);
    window.removeEventListener("scroll", onScroll, LISTEN);
    document.removeEventListener("visibilitychange", onVisibility);
  } catch {
    /* analytics must never break the page */
  }
}

function stop(): void {
  done = true;
  clearTimer();
  removeListeners();
}

/** Start watching, ONCE per document. Later calls (every route change) are no-ops. */
export function startEngagedVisitWatch(fireFn: Fire): void {
  if (started) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  started = true;
  fire = fireFn;
  try {
    startScrollY = scrollY();
    window.addEventListener("pointerdown", onInteraction, LISTEN);
    window.addEventListener("keydown", onInteraction, LISTEN);
    window.addEventListener("scroll", onScroll, LISTEN);
    document.addEventListener("visibilitychange", onVisibility);
    if (isVisible()) {
      visibleSince = monoNow();
      arm();
    }
  } catch {
    /* analytics must never break the page */
  }
}

/** Test seam: forget this document's watch entirely (listeners, timer, accumulated time). */
export function __resetEngagedVisitForTests(): void {
  clearTimer();
  removeListeners();
  started = false;
  done = false;
  timeSpent = false;
  visibleMs = 0;
  visibleSince = null;
  startScrollY = 0;
  fire = null;
}
