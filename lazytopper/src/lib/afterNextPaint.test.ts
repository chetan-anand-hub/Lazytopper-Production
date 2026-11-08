// SPEED-HUB-3 — afterNextPaint runs the action exactly once, never synchronously, after the
// frame (rAF, then a task) when frames run, via the timeout fallback when they do not, and
// never once cancelled.
import { describe, it, expect, vi, afterEach } from "vitest";
import { afterNextPaint } from "./afterNextPaint";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const macrotask = () => new Promise<void>((r) => setTimeout(r, 0));

describe("afterNextPaint", () => {
  it("never runs the action inside the caller's task", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const fn = vi.fn();
    afterNextPaint(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs in a task after the animation frame, exactly once even when the fallback also fires", async () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frame = cb;
      return 1;
    });
    const fn = vi.fn();
    afterNextPaint(fn);
    await macrotask(); // no frame yet
    expect(fn).not.toHaveBeenCalled();
    frame!(0); // the frame paints
    expect(fn).not.toHaveBeenCalled(); // not inside the rAF callback itself
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 150)); // the 100 ms fallback would be due by now
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

  it("a cancelled action never runs — neither from the frame nor from the fallback", async () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frame = cb;
      return 1;
    });
    const fn = vi.fn();
    const cancel = afterNextPaint(fn);
    cancel();
    frame!(0);
    await new Promise((r) => setTimeout(r, 150));
    expect(fn).not.toHaveBeenCalled();
    cancel(); // idempotent
  });
});
