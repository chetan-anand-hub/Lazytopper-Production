/**
 * COMPANION-1 — THE ONE SCENE GUARD (owner ruling 23 Oct 2026, 16:40 IST).
 *
 * Byte and Ziggy may stand on screen TOGETHER only in a short "scene": comfort after a low score,
 * the improvement high five, a big milestone (first Full Mock, exam day), the first-meet intro and
 * the share card. Everywhere else it is one character at a time. A scene may show only when ALL hold:
 *   - no other scene has shown in this app session (per device, per tab: sessionStorage);
 *   - the host says no question or test is in progress (`busy` false) — never during one;
 *   - the screen is at least 360 px wide (below that the SOLO poses stand in: two characters do
 *     not fit beside a bubble on a narrow phone).
 * Every lane that draws a scene asks `canShowScene()` and calls `markSceneShown()` when it is
 * actually drawn — the same rule everywhere (GUIDE-SCORE-1, the intro, the share card, …).
 *
 * Admin preview (PREVIEW-1): the once-per-session rule is relaxed (no marker is read or written),
 * so the owner can see a scene every time; the other two rules still apply.
 */
import { guidePreviewActive } from "./guideVariant";

export type SceneId = "comfort" | "highfive" | "milestone" | "examday" | "intro" | "share";

/** THIS TAB's sessionStorage: the id of the one scene this app session already showed. */
export const SCENE_SESSION_KEY = "lazytopper.guideScene";
/** Narrower than this (CSS px) → solo poses only. */
export const SCENE_MIN_WIDTH_PX = 360;

let usedThisLoad: SceneId | null = null;

/** Two characters fit side by side (matchMedia; no matchMedia → assume they fit). */
export function sceneFits(): boolean {
  try {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return !window.matchMedia(`(max-width: ${SCENE_MIN_WIDTH_PX - 0.02}px)`).matches;
  } catch {
    return true;
  }
}

/** The scene this app session already showed, or null. */
export function sceneShownThisSession(): SceneId | null {
  if (usedThisLoad) return usedThisLoad;
  try {
    const v = window.sessionStorage.getItem(SCENE_SESSION_KEY);
    return v ? (v as SceneId) : null;
  } catch {
    return null;
  }
}

/** May a two-character scene show now? `busy` = a question or a test is in progress on this page. */
export function canShowScene(opts: { busy?: boolean } = {}): boolean {
  if (opts.busy) return false;
  if (!sceneFits()) return false;
  if (guidePreviewActive()) return true;
  return sceneShownThisSession() === null;
}

/** The scene was DRAWN: no other scene this app session. (Not written under an admin preview.) */
export function markSceneShown(id: SceneId): void {
  if (guidePreviewActive()) return;
  usedThisLoad = id;
  try {
    window.sessionStorage.setItem(SCENE_SESSION_KEY, id);
  } catch {
    /* blocked storage: this page load only */
  }
}

export function __resetSceneGuardForTests(): void {
  usedThisLoad = null;
}
