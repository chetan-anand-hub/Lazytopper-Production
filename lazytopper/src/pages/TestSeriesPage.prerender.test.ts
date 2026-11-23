/**
 * TS-UX-PAGE-1: the committed /test-series snapshot (mobile and desktop) never carries a rupee figure. The Test Series price is
 * clock-derived (₹999 until 1 Dec, ₹1,499 from it); the capture strips every `data-lt-clock` / `till-boards-figures` node, so a figure
 * in the file means a price node was added without one of them - a price frozen into static HTML that goes false at the cut-off.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = ["prerendered/test-series.html", "prerendered/__desktop/test-series.html"];
describe("prerendered /test-series carries no price", () => {
  for (const rel of FILES) {
    it(rel, () => {
      const file = resolve(__dirname, "../..", rel);
      expect(existsSync(file), rel).toBe(true);
      const html = readFileSync(file, "utf8");
      expect(html).toContain("CBSE CLASS 10 TEST SERIES");
      expect(html).toContain("Get every step marked like a CBSE examiner");
      expect(html).not.toContain("₹");
      expect(html).not.toMatch(/founding price/i);
      // TS-FREE-CHECK-1: the capture is taken with default flags (free written check ON) - its free-test lines say so.
      expect(html).toContain("· your first test is free — written answers marked too</p>");
      expect(html).toContain("Your first test is free, written answers included · after that, written answers are checked with the Test Series or the Board Pass");
      expect(html).not.toContain("try one test free");
    });
  }
});
