/**
 * SPEED-CI-3 (review of #1641, B1) — the ladder's bring-into-view never scrolls the student's mark line off the screen.
 * Geometry of the real phones the reviewer measured (viewport heights 640-915, BottomNav 60 px + margin).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, useRef } from "react";
import { render } from "@testing-library/react";
import { clearScrollDelta, useClearBottomNav } from "./useClearBottomNav";

const view = (height: number) => ({ height, bottomClear: 72, topClear: 12 });

describe("clearScrollDelta", () => {
  it("a verdict that fits: no scroll", () => {
    expect(clearScrollDelta({ bottom: 500 }, { top: 100, bottom: 121 }, view(640))).toBe(0);
  });

  it("a verdict below the fold: scrolls just enough for it to clear the nav", () => {
    expect(clearScrollDelta({ bottom: 900 }, { top: 300, bottom: 321 }, view(800))).toBe(900 - (800 - 72));
  });

  for (const height of [640, 740, 800, 823, 915]) {
    it(`a verdict taller than a ${height}-px screen: the mark line stays on screen (at its scroll margin), never above it`, () => {
      const mark = { top: 420, bottom: 441 };
      const dy = clearScrollDelta({ bottom: 420 + 21 + 232 + 1100 }, mark, view(height));
      expect(dy).toBe(420 - 12);
      expect(mark.top - dy).toBeGreaterThanOrEqual(0);
      expect(mark.bottom - dy).toBeLessThanOrEqual(height);
    });
  }

  it("a mark already above the screen is brought back (scroll up)", () => {
    expect(clearScrollDelta({ bottom: 900 }, { top: -246, bottom: -225 }, view(915))).toBe(-246 - 12);
  });

  it("a mark below the screen is brought in even when the box is huge", () => {
    const dy = clearScrollDelta({ bottom: 3000 }, { top: 700, bottom: 721 }, view(640));
    expect(700 - dy).toBe(12);
  });
});

describe("useClearBottomNav with a mark to keep", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it("a smooth scroll cut short is corrected once: a mark still off the screen is put back at once", () => {
    vi.useFakeTimers();
    const by = vi.fn();
    const orig = window.scrollBy;
    window.scrollBy = by as unknown as typeof window.scrollBy;
    let markTop = -120;
    function Probe() {
      const box = useRef<HTMLDivElement>(null);
      const mark = useRef<HTMLParagraphElement>(null);
      useClearBottomNav(box, true, mark);
      return createElement("div", null, createElement("p", { ref: mark }), createElement("div", { ref: box }));
    }
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const tag = this.tagName;
      const r = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
      return tag === "P" ? r(markTop, markTop + 21) : r(markTop + 250, markTop + 1500);
    });
    try {
      render(createElement(Probe));
      expect(by).toHaveBeenCalledTimes(1);
      expect(by.mock.calls[0][0]).toMatchObject({ top: -120 });
      markTop = -38; // the smooth scroll stopped early
      vi.advanceTimersByTime(1000);
      expect(by).toHaveBeenCalledTimes(2);
      expect(by.mock.calls[1][0]).toEqual({ top: -38, behavior: "auto" });
    } finally {
      window.scrollBy = orig;
    }
  });

  for (const type of ["touchstart", "touchmove", "pointerdown", "wheel", "keydown"]) {
    it(`B4: the student's own ${type} inside the 900 ms cancels the correction — their scroll is never yanked back`, () => {
      vi.useFakeTimers();
      const by = vi.fn();
      const orig = window.scrollBy;
      window.scrollBy = by as unknown as typeof window.scrollBy;
      let markTop = -120;
      function Probe() {
        const box = useRef<HTMLDivElement>(null);
        const mark = useRef<HTMLParagraphElement>(null);
        useClearBottomNav(box, true, mark);
        return createElement("div", null, createElement("p", { ref: mark }), createElement("div", { ref: box }));
      }
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        const r = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
        return this.tagName === "P" ? r(markTop, markTop + 21) : r(markTop + 250, markTop + 1500);
      });
      try {
        render(createElement(Probe));
        expect(by).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(200);
        window.dispatchEvent(new Event(type));
        markTop = -600; // the student scrolled on, past the mark
        vi.advanceTimersByTime(1000);
        expect(by).toHaveBeenCalledTimes(1);
      } finally {
        window.scrollBy = orig;
      }
    });
  }
});
