/**
 * MI-VOICE-1 — `mi_voice_shown { state }`, ONCE per tab per state, and the ONE seam for the
 * admin preview's suppression.
 *
 * THIS TAB's sessionStorage `lazytopper.miVoiceShown.<state>` = "1" once that moment was
 * reported (a device-local marker: a fixed slug, never an id, a number or the uid). Blocked
 * storage → the in-memory set holds this page load.
 */
import { trackOnboardingEvent, type MiVoiceState } from "../../../analytics/analytics";
import { guidePreviewActive } from "../guideVariant";

/**
 * PREVIEW-1 (#1279) — while an admin previews the guide on this browser, NO guide analytics may
 * fire (a preview must never pollute the A/B). `trackOnboardingEvent`'s own preview guard only
 * drops `start_here_*`, and `trackGuideEvent` covers only GUIDE-1's five events, so this check
 * is the one that drops `mi_voice_shown`. Checked BEFORE the tab marker is written, so a preview
 * never marks a state as already sent.
 */
export function miVoicePreviewActive(): boolean {
  return guidePreviewActive();
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
