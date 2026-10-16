// @vitest-environment node
import { describe, it, expect } from "vitest";
import { planSlices, MIN_PAGE_FILL, type Span } from "./worksheetPagination";

const tiles = (slices: { y: number; h: number }[], total: number) => {
  let y = 0;
  for (const s of slices) {
    expect(s.y).toBeCloseTo(y, 5);
    expect(s.h).toBeGreaterThan(0);
    y += s.h;
  }
  expect(y).toBeCloseTo(total, 5);
};
const straddles = (slices: { y: number; h: number }[], atoms: Span[]) =>
  slices.slice(0, -1).flatMap((s) => atoms.filter((a) => a.top < s.y + s.h - 0.5 && a.bottom > s.y + s.h + 0.5));

describe("planSlices: where a worksheet PDF may be cut", () => {
  it("no atoms -> the fixed cut, exactly as before (the graded sheets rely on this)", () => {
    const s = planSlices([], 1000, 400);
    expect(s).toEqual([{ y: 0, h: 400 }, { y: 400, h: 400 }, { y: 800, h: 200 }]);
  });

  it("a line straddling the cut moves the cut up to the line's top, and nothing is split", () => {
    const atoms: Span[] = [{ top: 0, bottom: 380 }, { top: 380, bottom: 430 }, { top: 430, bottom: 700 }, { top: 700, bottom: 900 }];
    const s = planSlices(atoms, 900, 400);
    expect(s[0]).toEqual({ y: 0, h: 380 });
    tiles(s, 900);
    expect(straddles(s, atoms)).toEqual([]);
  });

  it("the slices always tile [0, total] exactly (no gap, no overlap)", () => {
    const atoms: Span[] = Array.from({ length: 40 }, (_, i) => ({ top: i * 53, bottom: i * 53 + 47 }));
    for (const sliceH of [200, 333, 400, 517]) tiles(planSlices(atoms, 40 * 53, sliceH), 40 * 53);
  });

  it("CONTROL: an atom taller than a page is cut where it falls (never an endless loop, never an empty page)", () => {
    const atoms: Span[] = [{ top: 10, bottom: 900 }];
    const s = planSlices(atoms, 900, 400);
    expect(s).toEqual([{ y: 0, h: 400 }, { y: 400, h: 400 }, { y: 800, h: 100 }]);
  });

  it("CONTROL: moving the cut up must keep the page at least MIN_PAGE_FILL full, else the original cut stands", () => {
    const atoms: Span[] = [{ top: 100, bottom: 450 }]; // would leave a page 25% full
    expect(100 / 400).toBeLessThan(MIN_PAGE_FILL);
    expect(planSlices(atoms, 900, 400)[0]).toEqual({ y: 0, h: 400 });
  });

  it("nested / overlapping atoms: the cut moves above every straddler", () => {
    const atoms: Span[] = [{ top: 300, bottom: 520 }, { top: 350, bottom: 420 }, { top: 0, bottom: 290 }];
    const s = planSlices(atoms, 900, 400);
    expect(s[0]).toEqual({ y: 0, h: 300 });
    expect(straddles(s, atoms)).toEqual([]);
  });

  it("degenerate inputs never throw", () => {
    expect(planSlices([], 0, 400)).toHaveLength(1);
    expect(planSlices([], 100, 0)).toHaveLength(1);
    expect(planSlices([], 100, 400)).toEqual([{ y: 0, h: 100 }]);
  });
});
