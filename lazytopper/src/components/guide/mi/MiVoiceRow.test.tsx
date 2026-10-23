// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));

import { MiVoiceRow } from "./MiVoiceRow";
import { __setGuideAbForTests } from "../guideVariant";
import { __resetMiVoiceShownForTests } from "./miVoiceShown";
import type { MiVoiceInput } from "./miVoiceModel";

/**
 * MI-VOICE-1 review F10 — `mi_voice_shown` only when the row is ACTUALLY visible: laid out
 * (offsetParent, non-zero box) AND intersecting. jsdom has no layout and no observer, so both
 * are driven by hand here.
 */
let ioCallbacks: Array<(e: Array<{ isIntersecting: boolean }>) => void> = [];
class ManualIO {
  constructor(cb: (e: Array<{ isIntersecting: boolean }>) => void) {
    ioCallbacks.push(cb);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}
const fire = (isIntersecting: boolean) => act(() => ioCallbacks.forEach((cb) => cb([{ isIntersecting }])));
let laidOut = true;
const realOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
const NO_DATA: MiVoiceInput = { kind: "no-data" };

beforeEach(() => {
  ioCallbacks = [];
  laidOut = true;
  track.mockClear();
  __resetMiVoiceShownForTests();
  window.sessionStorage.clear();
  __setGuideAbForTests(true, "guide");
  vi.stubGlobal("IntersectionObserver", ManualIO);
  Object.defineProperty(HTMLElement.prototype, "offsetParent", { configurable: true, get() { return laidOut ? this.parentElement : null; } });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ width: laidOut ? 194 : 0, height: laidOut ? 56 : 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (realOffsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", realOffsetParent);
  __setGuideAbForTests(null);
});

describe("MI-VOICE-1 · F10 — the event needs a visible row", () => {
  it("★ laid out but off-screen: nothing; once it intersects: the event, once", () => {
    render(<MiVoiceRow uid="u1" input={NO_DATA} hydrated />);
    expect(screen.getByTestId("mi-voice")).toBeTruthy();
    fire(false);
    expect(track).not.toHaveBeenCalled();
    fire(true);
    fire(true);
    expect(track.mock.calls).toEqual([["mi_voice_shown", { state: "no_data" }]]);
  });

  it("★ a hidden sidebar (display:none at a narrow width — no offsetParent, zero box): no event even if the observer says intersecting", () => {
    laidOut = false;
    render(<MiVoiceRow uid="u1" input={NO_DATA} hydrated />);
    fire(true);
    expect(track).not.toHaveBeenCalled();
  });

  it("no IntersectionObserver → nothing can prove it was seen → no event", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<MiVoiceRow uid="u1" input={NO_DATA} hydrated />);
    expect(screen.getByTestId("mi-voice")).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });

  it("F2 — not hydrated: no row, no observer, no event", () => {
    render(<MiVoiceRow uid="u1" input={NO_DATA} hydrated={false} />);
    expect(screen.queryByTestId("mi-voice")).toBeNull();
    expect(ioCallbacks).toHaveLength(0);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("GUIDE-SCORE-1 · one character on screen: the sidebar steps aside for a scorecard's character", () => {
  it("★★ while a scorecard (or M11) holds the stage, the sidebar draws no character; the line stays", async () => {
    const { holdStage, __resetStageForTests } = await import("../scoreGuideStage");
    __resetStageForTests();
    render(<MiVoiceRow uid="u1" input={NO_DATA} hydrated />);
    expect(await screen.findByTestId(/^blob-/, undefined, { timeout: 3000 })).toBeTruthy();
    let release = () => {};
    act(() => {
      release = holdStage("scorecard");
    });
    expect(screen.queryByTestId(/^blob-/)).toBeNull();
    expect(screen.getByTestId("mi-voice-line").textContent).not.toBe("");
    act(() => release());
    expect(await screen.findByTestId(/^blob-/)).toBeTruthy();
    act(() => {
      release = holdStage("m11");
    });
    expect(screen.queryByTestId(/^blob-/)).toBeNull();
    act(() => release());
    __resetStageForTests();
  }, 10_000);
});
