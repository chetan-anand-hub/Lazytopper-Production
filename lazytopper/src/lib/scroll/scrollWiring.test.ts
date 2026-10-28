// SCROLL-TOP-1 — wiring guard: the in-place builds must reach the scroll helper.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("SCROLL-TOP-1 wiring", () => {
  const qp = read("pages/PracticePage.tsx");
  it("Start practising / Build set / Refresh set bump the scroll tick", () => {
    const applyPreset = qp.slice(qp.indexOf("const applyPreset"), qp.indexOf("const applyPreset") + 3500);
    expect(applyPreset).toContain("setBuildScrollTick");
    expect(qp.slice(qp.indexOf("const buildFreshSet"), qp.indexOf("const buildFreshSet") + 200)).toContain("setBuildScrollTick");
    expect(qp.match(/setBuildScrollTick\(\(n\) => n \+ 1\)/g)?.length).toBeGreaterThanOrEqual(3);
  });
  it("the built set header carries the scroll target ref", () => {
    expect(qp).toMatch(/<section\s+ref=\{setStartRef\}/);
    expect(qp).toContain("scrollStartIntoView(setStartRef.current)");
  });
  it("phase pages and the route layer use the shared hooks", () => {
    expect(read("pages/ChapterTestPage.tsx")).toContain("useScrollTopOnChange(phase)");
    expect(read("pages/FullMockPage.tsx")).toContain("useScrollTopOnChange(phase)");
    expect(read("components/worksheet/WorksheetGenerator.tsx")).toContain("useScrollTopOnChange(view)");
    expect(read("components/seo/RouteCanonical.tsx")).toContain("useScrollTopOnRouteChange()");
  });
});
