/**
 * MI-VOICE-1 — `mi_voice_shown { state }`, ONCE per tab per state, and the ONE seam for the
 * admin preview's suppression.
 *
 * THIS TAB's sessionStorage `lazytopper.miVoiceShown.<state>` = "1" once that moment was
 * reported (a device-local marker: a fixed slug, never an id, a number or the uid). Blocked
 * storage → the in-memory set holds this page load.
 */
import { trackOnboardingEvent, type MiVoiceState } from "../../../analytics/analytics";

/**
 * PREVIEW-1 — while an admin is previewing the guide on this browser, NO guide analytics may
 * fire (the preview must never pollute the A/B). PREVIEW-1's `guidePreviewActive()` (in
 * ../guideVariant.ts) is NOT merged at this lane's base, so this returns false for now; when
 * PREVIEW-1 merges, this body becomes `return guidePreviewActive();` and nothing else changes.
 */
export function miVoicePreviewActive(): boolean {
  return false;
}

export const MI_VOICE_SHOWN_PREFIX = "lazytopper.miVoiceShown.";
const sentThisLoad = new Set<string>();

export function noteMiVoiceShown(state: MiVoiceState): void {
  try {
    if (miVoicePreviewActive()) return;
    const key = MI_VOICE_SHOWN_PREFIX + state;
    if (sentThisLoad.has(key)) return;
    sentThisLoad.add(key);
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* blocked storage: the in-memory set still holds this page load */
    }
    trackOnboardingEvent("mi_voice_shown", { state });
  } catch {
    /* analytics must never break the page */
  }
}

export function __resetMiVoiceShownForTests(): void {
  sentThisLoad.clear();
}
