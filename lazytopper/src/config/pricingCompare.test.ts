// @vitest-environment node
//
// PRICING-LIGHT-1 · L4 — the plan copy, word for word (owner ruling, Oct 2026). Typed out
// here on purpose, NOT read back from the module: this is what a student reads, so a
// drift in pricingCompare.ts turns this file red. The rendered table (headers, column
// order, every cell) is pinned in src/pages/PricingPage.pricing.test.tsx.

import { describe, expect, it } from "vitest";

import {
  BASIC_FOOTNOTE,
  BASIC_INCLUDES,
  BASIC_INCLUDES_HEAD,
  COMPARE_BASIC_HEADER,
  COMPARE_FEATURE_HEADER,
  COMPARE_TITLE,
  FAIR_USE_TITLE,
  PREMIUM_FOOTNOTE,
  PREMIUM_PLUS,
  PREMIUM_PLUS_HEAD,
  comparePremiumHeader,
  compareSections,
} from "./pricingCompare";
import { PRICE_FREE_DISPLAY, PRICE_MONTHLY_FOUNDING_DISPLAY, PRICE_MONTHLY_LIST_DISPLAY } from "./pricing";

describe("L4 · the Basic card", () => {
  it("'Basic includes:' then the six rows, in order", () => {
    expect(BASIC_INCLUDES_HEAD).toBe("Basic includes:");
    expect(BASIC_INCLUDES.map((i) => i.label)).toEqual([
      "Exam Trends — chapters ranked from ten years of papers",
      "Notes, formulae, NCERT books and solutions",
      "Limited practice and worksheet generation",
      "Open or download 3 chapter tests or mocks a day (1 when signed out)",
      "Your first answer check free",
      "Basic topic insights",
    ]);
    expect(BASIC_FOOTNOTE).toBe("Written answers on tests and mocks are not checked on Basic.");
  });

  it("ONLY the free-check row is conditional, and it links to Check & Improve", () => {
    expect(BASIC_INCLUDES.filter((i) => i.onlyWithFreeCheck).map((i) => i.id)).toEqual(["free-check"]);
    const row = BASIC_INCLUDES.find((i) => i.id === "free-check");
    expect(row?.link).toEqual({ text: "answer check", to: "/check-improve" });
    expect(row?.label).toContain(row!.link!.text);
  });
});

describe("L4 · the Premium card", () => {
  it("'Everything in Basic, plus:' then the six rows, in order, then the trial note", () => {
    expect(PREMIUM_PLUS_HEAD).toBe("Everything in Basic, plus:");
    expect(PREMIUM_PLUS.map((i) => i.label)).toEqual([
      "Check & Improve — photograph your handwritten answer, marked step by step like a board examiner",
      "Chapter tests, full mocks and worksheets graded, not just downloaded",
      "Your AI tutor that knows your chapters, your mistakes, your pace",
      "Mistake Intelligence — why you lose marks, not just where",
      "Unlimited chapter tests and mocks to open or download",
      "Progress that tells you what to fix next",
    ]);
    expect(PREMIUM_PLUS.some((i) => i.onlyWithFreeCheck)).toBe(false);
    expect(PREMIUM_FOOTNOTE).toBe("Not sure yet? Sign in and Premium is free for 7 days — no card needed.");
  });
});

describe("L4 · the compare table data", () => {
  it("titles and headers; the Premium header follows the founding switch", () => {
    expect(COMPARE_TITLE).toBe("Compare plans");
    expect(FAIR_USE_TITLE).toBe("Fair use, shown not hidden");
    expect(COMPARE_FEATURE_HEADER).toBe("What you get");
    expect(COMPARE_BASIC_HEADER).toBe(`Basic · ${PRICE_FREE_DISPLAY}`);
    expect(comparePremiumHeader(true)).toBe(`Premium · from ${PRICE_MONTHLY_FOUNDING_DISPLAY}`);
    expect(comparePremiumHeader(false)).toBe(`Premium · from ${PRICE_MONTHLY_LIST_DISPLAY}`);
    // CONTROL — the two states really differ.
    expect(comparePremiumHeader(true)).not.toBe(comparePremiumHeader(false));
  });

  it("six sections, in order, with 3/3/2/3/3/1 rows", () => {
    const sections = compareSections({ freeCheck: true });
    expect(sections.map((s) => s.title)).toEqual([
      "Study",
      "Practice",
      "Tests & papers",
      "Answer checking",
      "Coaching",
      "Limits",
    ]);
    expect(sections.map((s) => s.rows.length)).toEqual([3, 3, 2, 3, 3, 1]);
  });

  it("Basic's answer-checking cell is 'First check free' only while the free check is on", () => {
    const cell = (freeCheck: boolean) =>
      compareSections({ freeCheck })
        .flatMap((s) => s.rows)
        .find((r) => r.label === "Photograph your handwritten answer and get it marked")?.basic;
    expect(cell(true)).toEqual({ kind: "text", text: "First check free" });
    expect(cell(false)).toEqual({ kind: "no" });
  });

  it("no cell, label or title carries a rupee figure (prices live only in the headers)", () => {
    const text = JSON.stringify(compareSections({ freeCheck: true }));
    expect(text).not.toMatch(/₹/);
  });
});
