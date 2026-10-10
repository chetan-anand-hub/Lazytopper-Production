import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

// Focus tracking ON and 26 minutes of focus accrued: on the pre-retirement component
// this is exactly the state that raised the "Time for a break!" pop-up.
let focusedMs = 0;
vi.mock("../../services/focusTracker", () => ({
  isFocusTrackingEnabled: () => true,
  getAppFocus: () => ({ focusedMs }),
}));

import { BreakReminder } from "./BreakReminder";

describe("BreakReminder is retired (D52)", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    focusedMs = 0;
  });

  it("renders nothing after 26 simulated minutes of focus", () => {
    vi.useFakeTimers();
    const { container } = render(<BreakReminder />);
    act(() => {
      focusedMs = 26 * 60_000;
      vi.advanceTimersByTime(26 * 60_000);
    });
    expect(container.innerHTML).toBe("");
    expect(document.body.textContent ?? "").not.toMatch(/Time for a break/);
  });
});
