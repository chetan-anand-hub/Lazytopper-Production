import { describe, it, expect, beforeEach, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));

import { MI_VOICE_SHOWN_PREFIX, __resetMiVoiceShownForTests, miVoicePreviewActive, noteMiVoiceShown } from "./miVoiceShown";

/** MI-VOICE-1 — `mi_voice_shown { state }` once per tab per state. */
beforeEach(() => {
  track.mockClear();
  __resetMiVoiceShownForTests();
  window.sessionStorage.clear();
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

  it("PREVIEW-1 seam: off at this base (PREVIEW-1 not merged), so nothing is suppressed yet", () => {
    expect(miVoicePreviewActive()).toBe(false);
  });
});
