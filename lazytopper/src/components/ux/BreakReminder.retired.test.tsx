import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

// Focus tracking ON and 26 minutes of focus accrued: on the pre-retirement component this is exactly the
// state that raised the "Time for a break!" pop-up on its next 30 s check. The interval callbacks are
// captured and fired by hand (no fake timers), so the check does not depend on the clock.
let focusedMs = 0;
vi.mock("../../services/focusTracker", () => ({
  isFocusTrackingEnabled: () => true,
  getAppFocus: () => ({ focusedMs }),
}));

import { BreakReminder } from "./BreakReminder";

describe("BreakReminder is retired (D52)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    focusedMs = 0;
  });

  it("renders nothing and starts no timer after 26 minutes of focus", () => {
    const ticks: Array<() => void> = [];
    const spy = vi.spyOn(globalThis, "setInterval").mockImplementation(((fn: () => void) => {
      ticks.push(fn);
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    const { container } = render(<BreakReminder />);
    act(() => {
      focusedMs = 26 * 60_000;
      for (const tick of ticks) tick();
    });
    expect(container.innerHTML).toBe("");
    expect(document.body.textContent ?? "").not.toMatch(/Time for a break/);
    expect(spy).not.toHaveBeenCalled();
  });
});
