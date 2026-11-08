/**
 * SPEED-CI-3 (review of #1641, B1) — the ladder's bring-into-view never scrolls the student's mark line off the screen.
 * Geometry of the real phones the reviewer measured (viewport heights 640-915, BottomNav 60 px + margin).
 */
import { describe, expect, it } from "vitest";
import { clearScrollDelta } from "./useClearBottomNav";

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
