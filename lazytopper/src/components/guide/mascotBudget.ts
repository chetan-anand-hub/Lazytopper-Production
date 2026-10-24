/**
 * MOMENTS-3 - THE DIRECTOR: Byte and Ziggy may make at most THREE unprompted appearances per browser
 * session (owner ruling 23 Oct 2026, personality guide H3). After that the characters wait until the
 * student asks for them (the "?" on a page, a help control, the corner chip's tap).
 *
 * The budget limits the CHARACTER, never the INFORMATION: a refused moment draws no mascot, but a
 * line that carries needed information (m5 waiting, m6 unreadable, m8 connection dropped) still shows
 * as a plain line (moments.tsx PlainMoment), and a page's "?" still opens its help.
 *
 * PURE CORE + A TINY STORE. Eager on purpose (every door asks it first), so it stays small and
 * imports no copy, no rig and no model (PERF-3): the drawing code stays in the lazy chunks.
 *
 * -- WHAT COUNTS --------------------------------------------------------------------------------
 *   UNPROMPTED  a character that appears on its own: a MOMENTS-1 moment, a companion card, the
 *               scorecard guide, a page helper that opens by itself on a first visit, the filter
 *               help's first-visit open, the limit-panel Byte, Start-here's Byte, the corner chip's
 *               wave and a signed-out public peek. Scorecards count like everything else.
 *   PROMPTED    the student tapped "?" or a help control, reopened Byte from the chip, or opened a
 *               panel themselves. Prompted appearances NEVER go through this file.
 *   EXEMPT      never counted, never refused (each is a deliberate owner/cofounder ruling):
 *               - late-night wellbeing (Ziggy's yawn and Byte's moon): safety first, and it is
 *                 already limited to once per night by its own rule (companionModel.lateNightDue);
 *               - MiVoiceRow, the sidebar's persistent MI character: part of the Mistake
 *                 Intelligence card itself, not a moment;
 *               - Mummy on the parent pages: a different audience (parents), not the student;
 *               - SaveNudge in FinishGate: the owner-designed (23 Oct) reaction to the student's
 *                 OWN tap, so it is a prompted appearance in every sense;
 *               - FilterEmptyZiggy (filterHelp.tsx): a reaction to the student's OWN filter tap
 *                 (cofounder ruling, MOMENTS-3 re-review): the student asked for that result.
 *   NOT EXEMPT  the filter help's automatic first-visit open (filterHelp.tsx claimFilterHelpAutoOpen):
 *               refused -> it stays closed (marker unspent) until "?" is tapped.
 *
 * -- ONE APPEARANCE = ONE OCCURRENCE ------------------------------------------------------------
 *   The budget counts per OCCURRENCE (one mount of a door), never per kind: a kind that already
 *   showed does NOT get free re-shows. Only the SAME occurrence is de-duplicated (a re-render, or
 *   React StrictMode's double mount, keep their occurrence id). m5 on a second grading is a new
 *   occurrence and is counted again.
 *
 *   START-HERE is counted ONCE PER PAGE LOAD (one key, `starthere#page`): its inline and focused Byte
 *   are one appearance. Accepted by the cofounder: it is the pinned onboarding card for brand-new
 *   students, so a re-mount within the same page load is deliberately not a new appearance.
 *
 * -- THE API (FEEDBACK-2 and any later lane call exactly this) ----------------------------------
 *   An appearance KEY is `<kind>#<occurrence>` (the part before `#` is the kind, e.g. "moment:m5",
 *   "score:<result id>", "companion:home-welcomeBack"). Hooks make the occurrence for you.
 *   useAppearance(kind | null, priority, occurrence?) -> key | null
 *       The React door. Reserves in a layout effect (before paint), releases on unmount. Returns the
 *       KEY once the reservation is CONFIRMED (draw, and run your "shown" effects, only then) and null
 *       otherwise (refused, evicted, hidden, `kind` null = "not wanted right now"). Pass a shared
 *       `occurrence` only when two views are ONE appearance (Start-here's inline + focused Byte).
 *   <NoteShown kind={key} />   A render-nothing sibling: put it INSIDE the same <Suspense> as the lazy
 *       drawing; its effect runs only once that drawing has committed, and it spends the slot ONLY if
 *       the key holds one (a refused or evicted door can never spend).
 *   requestAppearance(key, priority) -> boolean    non-hook door: reserve. Idempotent per key.
 *   noteShown(key)        spend the slot the key holds (persisted for this tab). No-op without a hold.
 *   releaseAppearance(key)  give a reserved-but-undrawn slot back.
 *   appearanceHeld(key) / wouldGrant(key, priority) / shownThisSession(kind) / unpromptedShownCount().
 *   When all three slots are taken but some are only RESERVED (not yet drawn), a request of HIGHER
 *   priority takes the slot of the lowest-priority reservation; that holder loses it.
 *
 * -- PRIORITY (APPEARANCE_PRIORITY) -------------------------------------------------------------
 *   the scorecard (the result in front of them) > a first-time explainer (moments, page helpers,
 *   Start-here, public peeks, the limit Byte) > a companion card. (lateNight is exempt; the constant
 *   stays for callers that want wellbeing to outrank everything.)
 *
 * -- BYPASSES (each pinned by mascotBudget.test.tsx) --------------------------------------------
 *   Hidden mascots: nothing is granted, nothing is counted.
 *   Admin preview (guidePreviewActive): BYPASSED - every request is granted, nothing is counted.
 *   Vitest: the budget is OFF unless a suite switches it on with `__setMascotBudgetForTests(true)`.
 *
 * -- STORAGE ------------------------------------------------------------------------------------
 *   THIS TAB's sessionStorage `lazytopper.mascotBudget` = JSON { v: 1, shown: [kind, ...] } (at most
 *   three kind names - no uid, nothing about a mark). Registered in services/studentDataMap.ts.
 *   Blocked storage -> an in-memory list for this page load. Reservations and occurrence keys are
 *   memory only.
 *
 * Display only: nothing here reads or changes a grade, a mark, a prompt or a mistake type.
 */
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactElement } from "react";
import { guidePreviewActive } from "./guideVariant";
import { mascotsHidden, useMascotsHidden } from "./mascotsMute";

/** Unprompted appearances per browser session (owner ruling 23 Oct 2026, guide H3). */
export const MAX_UNPROMPTED_PER_SESSION = 3;

/** THIS TAB's sessionStorage: the kinds already shown this session. */
export const MASCOT_BUDGET_KEY = "lazytopper.mascotBudget";

/** Higher wins a contested slot. */
export const APPEARANCE_PRIORITY = {
  lateNight: 400,
  scorecard: 300,
  explainer: 200,
  companion: 100,
} as const;
export type AppearanceClass = keyof typeof APPEARANCE_PRIORITY;

/* -- state ----------------------------------------------------------------------------------- */

// PERF-3: two maps (key -> priority, key -> holders), no copies, no per-call allocation.
const holds = new Map<string, number>();
const refs = new Map<string, number>();
const shownKeys = new Set<string>(); // occurrences already drawn on this page load
let memoryShown: string[] | null = null;
let testOverride: boolean | null = null;
let version = 0;
let seq = 0;
const listeners = new Set<() => void>();

const kindOf = (key: string) => key.split("#")[0];

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

/* -- the pure decision ----------------------------------------------------------------------- */

/**
 * What a request would get. `shown` = how many unprompted appearances this session already drew;
 * `holds` = the reservations (key -> priority); `known` = this very occurrence already drew or holds
 * a slot (a re-render / StrictMode double mount). PURE.
 */
export function decideAppearance(
  state: { shown: number; holds: ReadonlyMap<string, number>; max?: number; known?: boolean },
  key: string,
  priority: number,
): { grant: boolean; evict: string | null } {
  const max = state.max ?? MAX_UNPROMPTED_PER_SESSION;
  const yes = { grant: true, evict: null };
  if (state.known || state.holds.has(key)) return yes;
  if (state.shown >= max) return { grant: false, evict: null };
  if (state.shown + state.holds.size < max) return yes;
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

const decide = (key: string, priority: number) =>
  decideAppearance({ shown: readShown().length, holds, known: shownKeys.has(key) }, key, priority);

/* -- the API --------------------------------------------------------------------------------- */

/** Would a request for `key` be granted right now? Read only - nothing is reserved. */
export function wouldGrant(key: string, priority: number): boolean {
  return !mascotsHidden() && (bypass() || decide(key, priority).grant);
}

/** Reserve a slot for an UNPROMPTED appearance. See the file header. */
export function requestAppearance(key: string, priority: number): boolean {
  if (mascotsHidden()) return false;
  if (bypass()) return true;
  const d = decide(key, priority);
  if (!d.grant) return false;
  if (d.evict) {
    holds.delete(d.evict);
    refs.delete(d.evict);
  }
  if (!shownKeys.has(key)) {
    holds.set(key, Math.max(holds.get(key) ?? 0, priority));
    refs.set(key, (refs.get(key) ?? 0) + 1);
  }
  emit();
  return true;
}

/** The drawing for `key` is on screen: spend the slot IT HOLDS. A key without a hold (refused,
 *  evicted, never requested) spends nothing. No-op while hidden or bypassed. */
export function noteShown(key: string): void {
  if (mascotsHidden() || bypass() || shownKeys.has(key) || !holds.has(key)) return;
  holds.delete(key);
  refs.delete(key);
  shownKeys.add(key);
  const shown = readShown();
  if (shown.length < MAX_UNPROMPTED_PER_SESSION) writeShown([...shown, kindOf(key)]);
  emit();
}

/** A reservation that will not be drawn (the door unmounted) gives its slot back. */
export function releaseAppearance(key: string): void {
  const n = refs.get(key);
  if (n === undefined) return;
  if (n <= 1) {
    refs.delete(key);
    holds.delete(key);
  } else refs.set(key, n - 1);
  emit();
}

/** Reserved or already shown (always true under a bypass, always false while mascots are hidden). */
export function appearanceHeld(key: string): boolean {
  return !mascotsHidden() && (bypass() || holds.has(key) || shownKeys.has(key));
}

/** Did a `kind` already appear this session? (Always false under a bypass: a preview replays.) */
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

/** A fresh occurrence id (for non-hook doors such as the page helper's effect). */
export function newOccurrence(): number {
  return ++seq;
}

/**
 * The React door. `kind` null = "not wanted right now" (reserves nothing). Reserves in a layout
 * effect (before paint) and releases on unmount. Returns the KEY only once the reservation is
 * CONFIRMED - the first render of a fresh door answers null, and the layout effect's re-render
 * answers before paint - so a refused or evicted door never draws and never runs a "shown" effect.
 */
export function useAppearance(kind: string | null, priority: number, occurrence?: string): string | null {
  useSyncExternalStore(subscribeBudget, budgetVersion, () => 0);
  const hidden = useMascotsHidden();
  const mine = useRef(0);
  if (!mine.current) mine.current = newOccurrence();
  const key = kind === null || hidden ? null : `${kind}#${occurrence ?? mine.current}`;
  useLayoutEffect(() => {
    if (key === null) return undefined;
    requestAppearance(key, priority);
    return () => releaseAppearance(key);
  }, [key, priority]);
  return key !== null && appearanceHeld(key) ? key : null;
}

/** Render-nothing sentinel: mounts INSIDE the lazy drawing's <Suspense>, so it commits only once
 *  the drawing has - then the slot is spent. Pass the KEY `useAppearance` returned. */
export function NoteShown({ kind }: { kind: string }): ReactElement | null {
  useEffect(() => {
    noteShown(kind);
  }, [kind]);
  return null;
}

export function __resetMascotBudgetForTests(): void {
  holds.clear();
  refs.clear();
  shownKeys.clear();
  memoryShown = null;
  testOverride = null;
  try {
    window.sessionStorage.removeItem(MASCOT_BUDGET_KEY);
  } catch {
    /* nothing stored */
  }
  emit();
}
