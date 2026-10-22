/**
 * MOMENTS-1 PART 0 — "Hide mascots": ONE device-wide switch that takes Byte and Ziggy off every
 * surface on this device (the Byte card / chip / sheet, Ziggy on the first scorecard, the MI voice
 * row, the public peeks and every MOMENTS-1 moment). Tiny and eager on purpose: the surfaces read
 * it on render; the drawing code stays in the lazy chunks.
 *
 *   localStorage `lazytopper.mascotsHidden` = "1" while hidden; the key is REMOVED when shown.
 *
 * It is a DEVICE PREFERENCE, never premium or trial state, and never sent anywhere (listed under the
 * device entry in services/studentDataMap.ts). Blocked storage → an in-memory value for this load.
 *
 * ★ Hidden changes WHAT IS DRAWN, never WHO IS IN WHICH ARM: `resolveGuideVariant` and the arm's
 *   analytics (guide_shown, guide_variant_assigned, guide_public_shown…) are untouched, so the
 *   50/50 test stays clean. A hidden surface falls back to its plain (control) content.
 * ★ The two events (`mascots_hidden` / `mascots_shown`) go through the guide's own sender
 *   (`trackGuideEvent`: GA4 / Vercel only, dropped under the admin preview) — never the server
 *   activity allowlist.
 *
 * Not to be confused with guideChunk's "Hide Byte for now" chip close: that one is THIS TAB only
 * (sessionStorage) and only the corner chip.
 */
import { useSyncExternalStore } from "react";
import { trackGuideEvent } from "./guideVariant";

export const MASCOTS_HIDDEN_KEY = "lazytopper.mascotsHidden";

/** Blocked storage: the value for this page load only (null = read storage). */
let memory: boolean | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

/** True while the student has hidden the mascots on this device. */
export function mascotsHidden(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(MASCOTS_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function write(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    else window.localStorage.removeItem(MASCOTS_HIDDEN_KEY);
    memory = null;
  } catch {
    memory = hidden; // blocked storage: this page load only
  }
}

/** "Hide mascots": hidden everywhere on this device, at once. */
export function hideMascots(): void {
  if (mascotsHidden()) return;
  write(true);
  trackGuideEvent("mascots_hidden", {});
  notify();
}

/** Undo / the setting: the mascots come back. */
export function showMascots(): void {
  if (!mascotsHidden()) return;
  write(false);
  trackGuideEvent("mascots_shown", {});
  notify();
}

export function subscribeMascots(l: () => void): () => void {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === MASCOTS_HIDDEN_KEY || e.key === null) l();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/** Re-renders the caller when the switch flips (this tab, or another tab on the device). */
export function useMascotsHidden(): boolean {
  return useSyncExternalStore(subscribeMascots, mascotsHidden, () => false);
}

export function __resetMascotsForTests(): void {
  memory = null;
  try {
    window.localStorage.removeItem(MASCOTS_HIDDEN_KEY);
  } catch {
    /* nothing stored */
  }
  notify();
}
