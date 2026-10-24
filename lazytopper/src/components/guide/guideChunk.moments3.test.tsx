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
import { __setFestivalForTests } from "./companion/festival";
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

  it("★★ reduced motion + an AHA: Ziggy's aha line is shown (not only Byte's), together with Byte's nod, still", () => {
    setMatchMediaMatches((q) => q === REDUCED);
    const aha = scoreGuidePlan(
      { ...low, score: { kind: "marks", awarded: 15, total: 20, gradedCount: 4, totalQuestions: 4 } },
      { aha: { type: "silly" } },
    )!;
    expect(aha.aha).toBe("silly");
    render(
      <MemoryRouter>
        <ScoreGuideBeats plan={aha} />
      </MemoryRouter>,
    );
    const text = screen.getByTestId("score-guide-line").textContent ?? "";
    expect(text).toContain(aha.ziggy.text);
    expect(text).toContain(aha.byte.text);
    expect(screen.getByTestId("score-guide").getAttribute("data-pose")).toBe("aha");
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

describe("MOMENTS-3 - Diwali props on the scorecard character (5-10 Nov 2026 IST), nothing outside", () => {
  const variant: ScorecardVariant = {
    surface: "worksheet",
    title: "Quadratic Equations - Mixed Worksheet",
    subtitle: "WS-1",
    score: { kind: "marks", awarded: 15, total: 20, gradedCount: 4, totalQuestions: 4 },
    actions: [],
  };
  const ui = () => (
    <MemoryRouter>
      <ScoreGuideBeats plan={scoreGuidePlan(variant)!} />
    </MemoryRouter>
  );
  afterEach(() => {
    __setFestivalForTests(null);
  });

  it("★ inside the window the diya and rangoli are drawn; on the day before and the day after, nothing", () => {
    __setFestivalForTests(true);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 8, 6, 30));
    render(ui());
    expect(document.querySelectorAll(".lt-gr-diya").length).toBe(1);
    expect(document.querySelectorAll(".lt-gr-rangoli").length).toBe(1);
    cleanup();
    for (const t of [Date.UTC(2026, 10, 4, 12, 0), Date.UTC(2026, 10, 10, 20, 0)]) {
      // 4 Nov noon UTC = 4 Nov evening IST (before the window)
      vi.setSystemTime(t);
      render(ui());
      expect(document.querySelectorAll(".lt-gr-diya").length).toBe(0); // 10 Nov 20:00 UTC is already 11 Nov in IST
      cleanup();
    }
  });

  it("the seam is OFF under Vitest by default (no unrelated suite reads the clock for it)", () => {
    const spy = vi.spyOn(Date, "now");
    render(ui());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
