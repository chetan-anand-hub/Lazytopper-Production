/**
 * MOMENTS-3 — THE DIRECTOR: Byte and Ziggy may make at most THREE unprompted appearances per
 * browser session (owner ruling 23 Oct 2026, personality guide H3). After that the characters wait
 * until the student asks for them (the "?" on a page, a help control, the corner chip's tap).
 *
 * PURE CORE + A TINY STORE. Eager on purpose (a few hundred bytes, no drawing): every door that can
 * draw a character asks it first; the drawing code stays in the lazy chunks.
 *
 * ── WHAT COUNTS ────────────────────────────────────────────────────────────────────────────────
 *   UNPROMPTED  a character that appears on its own: a MOMENTS-1 moment, a companion card (any
 *               door), the scorecard guide, a page helper that opens by itself on a first visit,
 *               the limit-panel Byte, Start-here's Byte (inline or focused), the corner chip's wave
 *               and a signed-out public peek. Scorecards count like everything else.
 *   PROMPTED    the student tapped "?" or a help control, reopened Byte from the chip, or opened a
 *               panel themselves. Prompted appearances NEVER go through this file: never counted,
 *               never refused.
 *   An appearance counts only once it was ACTUALLY SHOWN (`noteShown`, called when the drawing is
 *   committed — see `NoteShown`). A request alone only RESERVES a slot.
 *
 * ── THE API (FEEDBACK-2 and any later lane call exactly this) ──────────────────────────────────
 *   requestAppearance(kind, priority) → boolean
 *       Reserve a slot for `kind` (a stable string for ONE appearance, e.g. "moment:m5",
 *       "score:<result id>", "companion:home-welcomeBack"). True → you may draw. False → do not draw
 *       (the page's plain content stands in). Idempotent per kind. A kind already shown this session
 *       is the SAME appearance continuing (a re-render, a remount): true. When all three slots are
 *       taken but some are only RESERVED (not yet drawn), a request of HIGHER priority takes the
 *       slot of the lowest-priority reservation; that holder loses it (`appearanceHeld` turns false).
 *   noteShown(kind)       The drawing is on screen: spend the slot (persisted for this tab).
 *   releaseAppearance(kind)  You reserved but will not draw (unmounted): give the slot back.
 *   appearanceHeld(kind)  Reserved or already shown (always true under the bypass below).
 *   shownThisSession(kind)   Did `kind` already appear this session? (breathe: once per session)
 *   useAppearance(kind | null, priority) → boolean   The React door: reserves on mount (layout
 *       effect), releases on unmount, re-renders when a higher priority takes the slot. `null` =
 *       "not wanted right now" (reserves nothing). The first render already answers correctly
 *       (`wouldGrant`), so a door never flashes.
 *   NoteShown ({ kind })  A render-nothing sibling: put it INSIDE the same <Suspense> as the lazy
 *       drawing; its effect runs only once that drawing has committed.
 *
 * ── PRIORITY (APPEARANCE_PRIORITY) ─────────────────────────────────────────────────────────────
 *   late night (safety / wellbeing) > the scorecard (the result in front of them) > a first-time
 *   explainer (moments, page helpers, Start-here, public peeks, the limit Byte) > a companion card.
 *
 * ── BYPASSES (each documented, each pinned by mascotBudget.test.ts) ────────────────────────────
 *   Hidden mascots ("Hide mascots", ./mascotsMute.ts): nothing is granted, nothing is counted.
 *   Admin preview (PREVIEW-1, ./guideVariant.ts guidePreviewActive): the budget is BYPASSED — every
 *     request is granted and nothing is counted, so the owner can see every moment on demand.
 *   Vitest: the budget is OFF unless a suite switches it on with `__setMascotBudgetForTests(true)`
 *     (the same convention as the guide itself, `__setGuideAbForTests`), so the forty-odd existing
 *     suites that render several moments in one file keep pinning today's behaviour.
 *
 * ── STORAGE ────────────────────────────────────────────────────────────────────────────────────
 *   THIS TAB's sessionStorage `lazytopper.mascotBudget` = JSON { v: 1, shown: [kind, …] } (at most
 *   three kind names — no uid, nothing about a mark). Registered in services/studentDataMap.ts.
 *   Blocked storage → an in-memory list for this page load. Reservations are memory only.
 *
 * Display only: nothing here reads or changes a grade, a mark, a prompt or a mistake type.
 */
import { useEffect, useLayoutEffect, useSyncExternalStore, type ReactElement } from "react";
import { guidePreviewActive } from "./guideVariant";
import { mascotsHidden, useMascotsHidden } from "./mascotsMute";

/** Unprompted appearances per browser session (owner ruling 23 Oct 2026, guide H3). */
export const MAX_UNPROMPTED_PER_SESSION = 3;

/** THIS TAB's sessionStorage: the kinds already shown this session. */
export const MASCOT_BUDGET_KEY = "lazytopper.mascotBudget";

/** Higher wins a contested slot. Wellbeing first, then the result in front of the student. */
export const APPEARANCE_PRIORITY = {
  lateNight: 400,
  scorecard: 300,
  explainer: 200,
  companion: 100,
} as const;
export type AppearanceClass = keyof typeof APPEARANCE_PRIORITY;

/* ── state ─────────────────────────────────────────────────────────────────────────────────── */

// PERF-3: this file rides in the ENTRY chunk (every door asks it first), so it is kept small:
// two maps (kind -> priority, kind -> holders), no copies, no per-call allocation.
const holds = new Map<string, number>();
const refs = new Map<string, number>();
let memoryShown: string[] | null = null;
let testOverride: boolean | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version += 1;
  for (const l of listeners) l();
}

/** Test seam: switch the budget on/off (null = the default for the mode: on, except under Vitest). */
export function __setMascotBudgetForTests(on: boolean | null): void {
  testOverride = on;
}

/** The admin preview and a switched-off budget grant everything and count nothing. */
function bypass(): boolean {
  return !(testOverride ?? import.meta.env.MODE !== "test") || guidePreviewActive();
}

function readShown(): string[] {
  if (memoryShown) return memoryShown;
  try {
    const v = JSON.parse(window.sessionStorage.getItem(MASCOT_BUDGET_KEY) || "null");
    if (v?.v === 1 && Array.isArray(v.shown)) return v.shown.filter((k: unknown) => typeof k === "string").slice(0, MAX_UNPROMPTED_PER_SESSION);
  } catch {
    /* blocked or malformed: nothing shown yet */
  }
  return [];
}

function writeShown(shown: string[]): void {
  memoryShown = shown;
  try {
    window.sessionStorage.setItem(MASCOT_BUDGET_KEY, JSON.stringify({ v: 1, shown }));
  } catch {
    /* blocked storage: this page load only (memoryShown holds it) */
  }
}

/* ── the pure decision ─────────────────────────────────────────────────────────────────────── */

/** What a request would get, given the kinds shown so far and the current reservations. PURE. */
export function decideAppearance(
  state: { shown: readonly string[]; holds: ReadonlyMap<string, number>; max?: number },
  kind: string,
  priority: number,
): { grant: boolean; evict: string | null } {
  const max = state.max ?? MAX_UNPROMPTED_PER_SESSION;
  const yes = { grant: true, evict: null };
  if (state.shown.includes(kind) || state.holds.has(kind)) return yes;
  if (state.shown.length >= max) return { grant: false, evict: null };
  if (state.shown.length + state.holds.size < max) return yes;
  // Full, but some slots are only RESERVED: a strictly higher priority takes the lowest one.
  let lowest: string | null = null;
  let lowestP = Infinity;
  for (const [k, p] of state.holds) {
    if (p < lowestP) {
      lowest = k;
      lowestP = p;
    }
  }
  return lowest !== null && priority > lowestP ? { grant: true, evict: lowest } : { grant: false, evict: null };
}

const decide = (kind: string, priority: number) => decideAppearance({ shown: readShown(), holds }, kind, priority);

/* ── the API ───────────────────────────────────────────────────────────────────────────────── */

/** Would a request for `kind` be granted right now? Read only - nothing is reserved. */
export function wouldGrant(kind: string, priority: number): boolean {
  return !mascotsHidden() && (bypass() || decide(kind, priority).grant);
}

/** Reserve a slot for an UNPROMPTED appearance of `kind`. See the file header. */
export function requestAppearance(kind: string, priority: number): boolean {
  if (mascotsHidden()) return false;
  if (bypass()) return true;
  const d = decide(kind, priority);
  if (!d.grant) return false;
  if (d.evict) {
    holds.delete(d.evict);
    refs.delete(d.evict);
  }
  if (!readShown().includes(kind)) {
    holds.set(kind, Math.max(holds.get(kind) ?? 0, priority));
    refs.set(kind, (refs.get(kind) ?? 0) + 1);
  }
  emit();
  return true;
}

/** The drawing for `kind` is on screen: spend the slot. No-op while hidden, bypassed or already spent. */
export function noteShown(kind: string): void {
  if (mascotsHidden() || bypass()) return;
  const shown = readShown();
  if (shown.includes(kind)) return;
  holds.delete(kind);
  refs.delete(kind);
  if (shown.length < MAX_UNPROMPTED_PER_SESSION) writeShown([...shown, kind]);
  emit();
}

/** A reservation that will not be drawn (the door unmounted) gives its slot back. */
export function releaseAppearance(kind: string): void {
  const n = refs.get(kind);
  if (n === undefined) return;
  if (n <= 1) {
    refs.delete(kind);
    holds.delete(kind);
  } else refs.set(kind, n - 1);
  emit();
}

/** Reserved or already shown (always true under a bypass, always false while mascots are hidden). */
export function appearanceHeld(kind: string): boolean {
  return !mascotsHidden() && (bypass() || holds.has(kind) || readShown().includes(kind));
}

/** Did `kind` already appear this session? (Always false under a bypass: a preview replays.) */
export function shownThisSession(kind: string): boolean {
  return !bypass() && readShown().includes(kind);
}

/** How many unprompted appearances this session has already shown. */
export function unpromptedShownCount(): number {
  return readShown().length;
}

export function subscribeBudget(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function budgetVersion(): number {
  return version;
}

/**
 * The React door. `kind` null = "not wanted right now" (reserves nothing). The reservation is made
 * in a layout effect (before paint) and released on unmount; the answer is already right on the
 * FIRST render (`wouldGrant`), so a door never draws-then-removes or removes-then-draws a frame.
 */
export function useAppearance(kind: string | null, priority: number): boolean {
  useSyncExternalStore(subscribeBudget, budgetVersion, () => 0);
  const hidden = useMascotsHidden();
  useLayoutEffect(() => {
    if (kind === null || hidden) return undefined;
    requestAppearance(kind, priority);
    return () => releaseAppearance(kind);
  }, [kind, priority, hidden]);
  if (kind === null || hidden) return false;
  return appearanceHeld(kind) || wouldGrant(kind, priority);
}

/** Render-nothing sentinel: mounts INSIDE the lazy drawing's <Suspense>, so it commits only once
 *  the drawing has — then the slot is spent. */
export function NoteShown({ kind }: { kind: string }): ReactElement | null {
  useEffect(() => {
    noteShown(kind);
  }, [kind]);
  return null;
}

export function __resetMascotBudgetForTests(): void {
  holds.clear();
  refs.clear();
  memoryShown = null;
  testOverride = null;
  try {
    window.sessionStorage.removeItem(MASCOT_BUDGET_KEY);
  } catch {
    /* nothing stored */
  }
  emit();
}
