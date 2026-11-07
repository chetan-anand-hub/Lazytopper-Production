// SPEED-HUB-3 — afterNextPaint runs the action exactly once, never synchronously, after the
// frame (rAF) when frames run, and via the timeout fallback when they do not.
import { describe, it, expect, vi, afterEach } from "vitest";
import { afterNextPaint } from "./afterNextPaint";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("afterNextPaint", () => {
  it("never runs the action inside the caller's task", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    afterNextPaint(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs after the animation frame (rAF, then a task), exactly once even when the fallback also fires", () => {
    vi.useFakeTimers();
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frame = cb;
      return 1;
    });
    const fn = vi.fn();
    afterNextPaint(fn);
    vi.advanceTimersByTime(50); // no frame yet, fallback not due
    expect(fn).not.toHaveBeenCalled();
    frame!(0); // the frame paints
    expect(fn).not.toHaveBeenCalled(); // still not inside the rAF callback itself
    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500); // fallback fires later: no second run
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("still runs when frames never come (hidden / throttled tab)", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const fn = vi.fn();
    afterNextPaint(fn);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
