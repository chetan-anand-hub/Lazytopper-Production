import { describe, it, expect, beforeEach, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));

import { GUIDE_PREVIEW_KEY } from "../guideVariant";
import { MI_VOICE_SHOWN_PREFIX, __resetMiVoiceShownForTests, miVoicePreviewActive, noteMiVoiceShown } from "./miVoiceShown";

/** MI-VOICE-1 — `mi_voice_shown { state }` once per tab per state. */
beforeEach(() => {
  track.mockClear();
  __resetMiVoiceShownForTests();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("MI-VOICE-1 · noteMiVoiceShown", () => {
  it("★ once per tab per state: a repeat (same load, or a reload in the same tab) sends nothing", () => {
    noteMiVoiceShown("careless");
    noteMiVoiceShown("careless");
    noteMiVoiceShown("thin");
    expect(track.mock.calls).toEqual([
      ["mi_voice_shown", { state: "careless" }],
      ["mi_voice_shown", { state: "thin" }],
    ]);
    expect(window.sessionStorage.getItem(MI_VOICE_SHOWN_PREFIX + "careless")).toBe("1");
    // a reload: the in-memory set is gone, the tab's marker holds
    __resetMiVoiceShownForTests();
    noteMiVoiceShown("careless");
    expect(track).toHaveBeenCalledTimes(2);
  });

  it("a new tab (fresh sessionStorage) reports the state again", () => {
    noteMiVoiceShown("untyped");
    __resetMiVoiceShownForTests();
    window.sessionStorage.clear();
    noteMiVoiceShown("untyped");
    expect(track).toHaveBeenCalledTimes(2);
  });

  it("★ PREVIEW-1 — under a valid admin preview NOTHING is sent (and no tab marker); without one it IS sent", () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    expect(miVoicePreviewActive()).toBe(true);
    noteMiVoiceShown("careless");
    expect(track).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(MI_VOICE_SHOWN_PREFIX + "careless")).toBeNull();

    window.localStorage.removeItem(GUIDE_PREVIEW_KEY);
    expect(miVoicePreviewActive()).toBe(false);
    noteMiVoiceShown("careless");
    expect(track.mock.calls).toEqual([["mi_voice_shown", { state: "careless" }]]);
  });

  it("an EXPIRED preview is no preview: the event is sent", () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() - 1 }));
    noteMiVoiceShown("thin");
    expect(track.mock.calls).toEqual([["mi_voice_shown", { state: "thin" }]]);
  });

  it("★ trackOnboardingEvent's own PREVIEW-1 guard does NOT cover mi_voice_shown (only start_here_*): this module's check is the one that applies", async () => {
    const real = await vi.importActual<typeof import("../../../analytics/analytics")>("../../../analytics/analytics");
    const src = real.trackOnboardingEvent.toString();
    expect(src).toMatch(/start_here_/);
    expect(src).not.toMatch(/mi_voice/);
  });
});
