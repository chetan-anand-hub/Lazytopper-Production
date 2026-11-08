/**
 * SPEED-CI-2 (owner ruling 8 Nov 2026 12:10 IST: "yes" to a fixed first demo question for first-time visitors,
 * random after that) — which ladder question a visit opens with, and the one tap a student made before it could
 * answer. EAGER and tiny: CiDemoCard's first-visit preview and the lazy ladder both read it, and the Answer
 * Checker's static paint (scripts/seo/checkImprovePaint.ts) reads the same localStorage key before the app boots.
 *
 * FIRST VISIT = this browser has never shown a ladder question (no `LADDER_SEEN_KEY`). A first visit opens with the
 * FIXED starter (oneMinuteStarters.ts `fixedStarter`), every later visit with today's per-visit pick. The key is a
 * per-viewer convenience, never premium or trial state; unreadable storage counts as NOT first (today's behaviour).
 * The answer is read ONCE per page load, so writing the key when the question shows does not swap the question
 * under the student in the same tab.
 *
 * The early tap: a tap on an option of the STATIC paint (before the app runs) is held by the paint's inert guard,
 * which records it as `window.__ltStaticTap = { id: "one-min-opt-<i>", bank: "<bankId>" }`; a tap on the preview
 * (route loaded, ladder chunk not yet) is recorded here. The ladder, once it renders that same question, applies
 * the tap exactly as if it had been made on it (the same local 0-or-full verdict). Nothing else reads it.
 */

/** localStorage: "1" once this browser has shown a ladder question. Read by the static paint's decision too. */
export const LADDER_SEEN_KEY = "lazytopper.ciLadder.seen.v1";

let firstVisitThisLoad: boolean | null = null;

/** True on this page load when the browser had never shown a ladder question. Memoised for the load. */
export function isFirstLadderVisit(): boolean {
  if (firstVisitThisLoad === null) {
    try {
      firstVisitThisLoad = window.localStorage.getItem(LADDER_SEEN_KEY) === null;
    } catch {
      firstVisitThisLoad = false;
    }
  }
  return firstVisitThisLoad;
}

/** The ladder showed a question: later visits pick per visit again. This load keeps its answer. */
export function markLadderSeen(): void {
  isFirstLadderVisit();
  try {
    window.localStorage.setItem(LADDER_SEEN_KEY, "1");
  } catch {
    /* blocked storage: isFirstLadderVisit() already says not-first for such a browser */
  }
}

/* ── the early tap ─────────────────────────────────────────────────────────────────────────────── */

const OPTION_ID = /^one-min-opt-([0-3])$/;

let pending: { bank: string; index: number } | null = null;

type StaticTapWindow = Window & { __ltStaticTap?: { id?: unknown; bank?: unknown } | null };

function staticTap(): { bank: string; index: number } | null {
  try {
    const t = (window as StaticTapWindow).__ltStaticTap;
    const m = t && typeof t.id === "string" ? OPTION_ID.exec(t.id) : null;
    return m && typeof t?.bank === "string" ? { bank: t.bank, index: Number(m[1]) } : null;
  } catch {
    return null;
  }
}

/** The preview's own option tap (the route is in, the ladder chunk is not). */
export function holdLadderTap(bank: string, index: number): void {
  if (index >= 0 && index <= 3) pending = { bank, index };
}

/** The held tap for this question, if any (the preview's, else the static paint's), without using it. */
export function peekLadderTap(bank: string): number | null {
  const t = pending ?? staticTap();
  return t && t.bank === bank ? t.index : null;
}

/** The held tap for this question, used up (a later mount never re-applies it). */
export function takeLadderTap(bank: string): number | null {
  const index = peekLadderTap(bank);
  pending = null;
  try {
    (window as StaticTapWindow).__ltStaticTap = null;
  } catch {
    /* nothing held */
  }
  return index;
}

/** Test seam: forget this load's first-visit answer and any held tap. */
export function __resetLadderVisitForTests(): void {
  firstVisitThisLoad = null;
  pending = null;
  try {
    (window as StaticTapWindow).__ltStaticTap = null;
  } catch {
    /* no window */
  }
}
