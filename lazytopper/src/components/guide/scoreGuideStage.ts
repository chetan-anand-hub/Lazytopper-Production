/**
 * GUIDE-SCORE-1 — ONE character on screen at a time (owner rule, 22 Oct 2026: Byte and Ziggy are
 * NEVER on screen together; on a result Ziggy reacts first, then Byte helps).
 *
 * A tiny shared "stage": whoever is drawing a character on a scorecard holds it, and every other
 * place that could draw one at the same moment steps aside while it is held.
 *   "scorecard" — the scorecard's own character slot (../guide/lazyGuide.tsx ScorecardGuide):
 *                 the desktop sidebar's MI voice row (./mi/MiVoiceRow.tsx) hides its character
 *                 while it is held (the scorecard is a modal over the page, the sidebar still shows).
 *   "m11"       — MOMENTS-1 M11, the once-per-account written-answer nudge Byte gives BELOW the
 *                 score on a tap-only Quick Practice scorecard (./moments/moments.tsx). While it
 *                 is held the scorecard's slot yields, so Byte is never drawn twice and Ziggy never
 *                 stands beside him.
 *
 * Pure module state + a hook; no storage, no network. Display only.
 */
import { useLayoutEffect, useSyncExternalStore } from "react";

export type StageOwner = "scorecard" | "m11" | "nudge";

/* "nudge" — QP-WORKING-AFTER-1: Ziggy's "Don't forget to save your answer!" beside an answer box
   (./saveNudge/saveNudge.tsx); the sidebar's MI character steps aside while he shows. */
const held: Record<StageOwner, number> = { scorecard: 0, m11: 0, nudge: 0 };
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version++;
  for (const l of listeners) l();
}

/** Take the stage for `owner`; returns the release (idempotent). Counted, so two holders are fine. */
export function holdStage(owner: StageOwner): () => void {
  held[owner]++;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    held[owner] = Math.max(0, held[owner] - 1);
    emit();
  };
}

export function stageHeld(owner: StageOwner): boolean {
  return held[owner] > 0;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Re-renders when the stage changes; true while ANY of `owners` holds it. */
export function useStageHeld(...owners: StageOwner[]): boolean {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return owners.some((o) => held[o] > 0);
}

/**
 * Hold the stage for `owner` while `active` (released on false or unmount). A LAYOUT effect, so
 * the hold lands in the same commit, before the browser paints: a subscriber that must step aside
 * re-renders synchronously, and two characters never share a painted frame.
 */
export function useHoldStage(owner: StageOwner, active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;
    return holdStage(owner);
  }, [owner, active]);
}

export function __resetStageForTests(): void {
  held.scorecard = 0;
  held.m11 = 0;
  held.nudge = 0;
  emit();
}
