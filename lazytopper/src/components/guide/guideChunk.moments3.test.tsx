/**
 * MOMENTS-3 - the corner chip's wave is budgeted, and the scorecard's two-beat Ziggy
 * (down -> his pose after ~1 s, then Byte) with reduced motion = the final pose at once.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setMatchMediaMatches } from "../../test/setup";
import { GuideChip, SCORE_GUIDE_BEAT_MS, SCORE_GUIDE_TURN_MS, ScoreGuideBeats } from "./guideChunk";
import { __resetMascotBudgetForTests, __setMascotBudgetForTests, noteShown, requestAppearance } from "./mascotBudget";
import { __resetMascotsForTests } from "./mascotsMute";
import { scoreGuidePlan } from "./scoreGuideModel";
import type { ScorecardVariant } from "../results/scorecardVariants";

const REDUCED = "(prefers-reduced-motion: reduce)";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  setMatchMediaMatches(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
});

describe("MOMENTS-3 - the corner chip's wave", () => {
  it("★★ budget spent -> the chip rests (no 'Need me? Tap!' ping); the chip itself stays as a door", () => {
    __setMascotBudgetForTests(true);
    for (const k of ["x1", "x2", "x3"]) {
      requestAppearance(k, 200);
      noteShown(k);
    }
    render(<GuideChip onOpen={() => {}} onHide={() => {}} />);
    expect(screen.getByTestId("guide-chip-open")).toBeTruthy();
    expect(document.querySelector(".lt-guide-chip__ping")).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem("lazytopper.mascotBudget")!).shown).toEqual(["x1", "x2", "x3"]);
  });

  it("★★ a free slot -> it waves once and the session records 'chip-wave'", () => {
    __setMascotBudgetForTests(true);
    render(<GuideChip onOpen={() => {}} onHide={() => {}} />);
    expect(document.querySelector(".lt-guide-chip__ping")).not.toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem("lazytopper.mascotBudget")!).shown).toEqual(["chip-wave"]);
  });
});

describe("MOMENTS-3 - the scorecard's two-beat Ziggy", () => {
  const low: ScorecardVariant = {
    surface: "worksheet",
    title: "Quadratic Equations - Mixed Worksheet",
    subtitle: "WS-1",
    score: { kind: "marks", awarded: 4, total: 20, gradedCount: 4, totalQuestions: 4 },
    actions: [],
  };
  const plan = scoreGuidePlan(low)!;
  const ui = () => (
    <MemoryRouter>
      <ScoreGuideBeats plan={plan} />
    </MemoryRouter>
  );

  it("★★ low result: Ziggy opens `down`, turns to his own pose after the turn beat, then Byte takes over", () => {
    vi.useFakeTimers();
    expect(plan.ziggy.from).toBe("down");
    render(ui());
    const g = () => screen.getByTestId("score-guide");
    expect(g().getAttribute("data-kind")).toBe("ziggy");
    expect(g().getAttribute("data-pose")).toBe("down");
    act(() => {
      vi.advanceTimersByTime(SCORE_GUIDE_TURN_MS + 10);
    });
    expect(g().getAttribute("data-kind")).toBe("ziggy");
    expect(g().getAttribute("data-pose")).toBe(plan.ziggy.pose);
    act(() => {
      vi.advanceTimersByTime(SCORE_GUIDE_BEAT_MS);
    });
    expect(g().getAttribute("data-kind")).toBe("byte");
    expect(g().getAttribute("data-pose")).toBe(plan.byte.pose);
  });

  it("★★ reduced motion: the final pose at once (Byte's final frame), no `down`, nothing to wait for", () => {
    setMatchMediaMatches((q) => q === REDUCED);
    render(ui());
    const g = screen.getByTestId("score-guide");
    expect(g.getAttribute("data-kind")).toBe("byte");
    expect(g.getAttribute("data-pose")).toBe(plan.byte.pose);
    expect(g.getAttribute("data-pose")).not.toBe("down");
  });
});
