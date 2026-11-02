// SALE-MOMENT-1 - only a real Section E (case-based) question marks a paper for the Board CBQ Pack offer.
import { describe, expect, it } from "vitest";

import { paperHasCaseBased, withSaleCbq, type ScorecardVariant } from "./scorecardVariants";

const v = { surface: "worksheet", title: "T", subtitle: "S", score: { kind: "marks", awarded: 1, total: 2 }, actions: [] } as unknown as ScorecardVariant;

describe("paperHasCaseBased / withSaleCbq", () => {
  it.each([
    [[{ section: "A" }, { section: "E" }], true],
    [[{ section: "e" }], true],
    [[{ section: " E " }], true],
    [[{ section: "A" }, { section: "D" }], false],
    [[{ section: undefined }, {}], false],
    [[{ section: 5 }], false],
    [[], false],
    [null, false],
    [undefined, false],
  ])("%j -> %s", (qs, expected) => {
    expect(paperHasCaseBased(qs as never)).toBe(expected);
    expect(withSaleCbq(v, qs as never).saleCbq === true).toBe(expected);
  });
  it("leaves a paper without one untouched (same object)", () => {
    expect(withSaleCbq(v, [{ section: "B" }])).toBe(v);
  });
});

describe("hosts that know a paper's sections pass them", () => {
  it.each(["components/worksheet/WorksheetGradePanel.tsx", "pages/ChapterTestPage.tsx", "pages/FullMockPage.tsx"])("%s wraps its live scorecard variant", async (rel) => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    expect(readFileSync(resolve(__dirname, "../..", rel), "utf8")).toMatch(/withSaleCbq\(/);
  });
});
