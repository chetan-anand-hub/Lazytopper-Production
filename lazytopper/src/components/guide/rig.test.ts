import { describe, it, expect, afterEach, vi } from "vitest";
import { setMatchMediaMatches } from "../../test/setup";
import { EMO, Rig, __rigLoopStateForTests, makeSeq } from "./rig";

/** GUIDE-1 §3A — the rig: still pose under reduced motion, one shared loop, paused when hidden. */

const rigs: Rig[] = [];
const host = () => {
  const d = document.createElement("div");
  document.body.appendChild(d);
  return d;
};
afterEach(() => {
  while (rigs.length) rigs.pop()!.destroy();
  setMatchMediaMatches(false);
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  vi.restoreAllMocks();
});

describe("GUIDE-1 · rig", () => {
  it("draws an SVG body with eyes, mouth and arms for each pose, every character", () => {
    for (const kind of ["byte", "ziggy", "mummy"] as const) {
      const r = new Rig(host(), kind, "hello", { still: true });
      rigs.push(r);
      for (const pose of Object.keys(EMO) as Array<keyof typeof EMO>) {
        r.set(pose);
        expect(r.svg.getAttribute("data-pose")).toBe(pose);
        const body = r.svg.querySelector("path");
        expect(body).not.toBeNull();
        expect(r.svg.getAttribute("aria-hidden")).toBe("true");
      }
    }
  });

  it("★ prefers-reduced-motion → a still pose that never joins the loop", () => {
    setMatchMediaMatches(true);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const r = new Rig(host(), "ziggy", "sad");
    rigs.push(r);
    expect(r.still).toBe(true);
    expect(__rigLoopStateForTests()).toEqual({ rigs: 0, running: false });
    expect(raf).not.toHaveBeenCalled();
    // The melt is drawn settled (flattened body), not animated.
    expect(r.svg.innerHTML).toContain("ellipse");
  });

  it("★ ONE loop for all characters; no frame is requested while the tab is hidden", () => {
    setMatchMediaMatches(false);
    const a = new Rig(host(), "byte", "hello");
    const b = new Rig(host(), "ziggy", "excited");
    rigs.push(a, b);
    expect(__rigLoopStateForTests().rigs).toBe(2);
    expect(__rigLoopStateForTests().running).toBe(true);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(__rigLoopStateForTests().running).toBe(false);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(__rigLoopStateForTests().running).toBe(true);
    a.destroy();
    b.destroy();
    rigs.length = 0;
    expect(__rigLoopStateForTests()).toEqual({ rigs: 0, running: false });
  });

  it("★ off-screen (IntersectionObserver) → the loop stops; back on screen → it resumes", () => {
    let cb: IntersectionObserverCallback | null = null;
    class FakeIO {
      constructor(c: IntersectionObserverCallback) {
        cb = c;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeIO);
    const r = new Rig(host(), "byte", "point");
    rigs.push(r);
    expect(__rigLoopStateForTests().running).toBe(true);
    cb!([{ target: r.svg, isIntersecting: false } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(__rigLoopStateForTests().running).toBe(false);
    cb!([{ target: r.svg, isIntersecting: true } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(__rigLoopStateForTests().running).toBe(true);
    r.destroy();
    rigs.length = 0;
    vi.unstubAllGlobals();
  });

  it("the blink / droplet sequence is deterministic (no Math.random)", () => {
    const spy = vi.spyOn(Math, "random");
    const s1 = makeSeq(42);
    const s2 = makeSeq(42);
    const a = [s1(), s1(), s1()];
    expect([s2(), s2(), s2()]).toEqual(a);
    for (const x of a) expect(x >= 0 && x < 1).toBe(true);
    const r = new Rig(host(), "ziggy", "sad");
    rigs.push(r);
    r.frame(1000);
    r.frame(1500);
    expect(spy).not.toHaveBeenCalled();
  });
});
