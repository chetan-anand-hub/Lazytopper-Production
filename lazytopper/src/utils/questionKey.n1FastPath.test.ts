// SPEED-HUB-2 — normaliseN1's ASCII fast path returns exactly what the specified N1 returns.
// Checked on every stem and every option of every bank chapter (the strings questionKey is
// actually given), plus hand-picked edge cases.

import { describe, it, expect } from "vitest";
import "../test/preloadBankChapters";
import { BANK_CHAPTER_SLUGS, getBankRows } from "../data/bankChapters/loader";
import { normaliseN1, normaliseN1Reference, questionKey } from "./questionKey";

describe("normaliseN1 fast path === N1 reference", () => {
  it("every bank stem and option", () => {
    const inputs: unknown[] = [];
    for (const row of getBankRows(BANK_CHAPTER_SLUGS)) {
      inputs.push(row.questionText);
      if (Array.isArray(row.options)) inputs.push(...row.options);
    }
    expect(inputs.length).toBeGreaterThan(10_000);
    let ascii = 0;
    for (const s of inputs) {
      if (/^[\x00-\x7f]*$/.test(String(s ?? ""))) ascii++;
      expect(normaliseN1(s)).toBe(normaliseN1Reference(s));
    }
    // Both branches are exercised for real.
    expect(ascii).toBeGreaterThan(1000);
    expect(inputs.length - ascii).toBeGreaterThan(1000);
  });

  it("edge cases", () => {
    const cases: unknown[] = [
      "",
      undefined,
      null,
      42,
      "ABC xyz 123",
      "\\frac{1}{2} + \\sqrt{3}",
      "\\FRAC{1}{2}",
      "Tab\tNew\nLine | pipe",
      "~!@#$%^&*()_+`-=[]{};':\",./<>?",
      "café 90° √2 × ½ ﬁ",
      "\u007f\u0000",
    ];
    for (const s of cases) expect(normaliseN1(s)).toBe(normaliseN1Reference(s));
    expect(questionKey({ questionText: "Find X", options: ["B", "a"] })).toBe("findx|a|b");
  });
});
