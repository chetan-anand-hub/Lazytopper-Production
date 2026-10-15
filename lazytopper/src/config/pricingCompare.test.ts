// @vitest-environment node
//
// PRICING-LIGHT-1 · L4 — the plan copy, word for word (owner ruling, Oct 2026). Typed out
// here on purpose, NOT read back from the module: this is what a student reads, so a
// drift in pricingCompare.ts turns this file red. The rendered table (headers, column
// order, every cell) is pinned in src/pages/PricingPage.pricing.test.tsx.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
      "Practice sets and worksheet generation",
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

/* ── Owner ruling on #1190 (Oct 2026): no unbacked "Limited" on Basic ─────────────
 * P20 found no enforced free limit on practice or worksheet generation, so "Limited"
 * there was a claim the product does not keep. From now on a Basic item or Basic cell
 * may say "limited" ONLY when it also states a number, and that number comes from an
 * interpolated constant (`${SOME_LIMIT}`) in this module's source — never a bare word,
 * never a retyped digit.
 */

const COMPARE_SOURCE = readFileSync(resolve(process.cwd(), "src/config/pricingCompare.ts"), "utf8");

/** Every Basic-side text: the card rows, and the Basic column of the table (both free-check states). */
function basicTexts(): string[] {
  const cells = [true, false].flatMap((freeCheck) =>
    compareSections({ freeCheck }).flatMap((s) => s.rows.map((r) => r.basic)),
  );
  return [
    ...BASIC_INCLUDES.map((i) => i.label),
    ...cells.flatMap((c) => (c.kind === "text" ? [c.text] : c.kind === "yes" && c.note ? [c.note] : [])),
  ];
}

/**
 * Each text that says "limited" without being backed: it must carry a digit, AND the
 * source must hold a template literal for it whose figure is an interpolated CONSTANT.
 */
function unbackedLimited(texts: readonly string[], source: string): string[] {
  const templates = [...source.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
  return texts.filter((t) => {
    if (!/limited/i.test(t)) return false;
    if (!/\d/.test(t)) return true;
    const backed = templates.some((tpl) => {
      if (!/limited/i.test(tpl) || !/\$\{[A-Z][A-Z0-9_]*\}/.test(tpl)) return false;
      // The rendered text must be this template with each ${CONST} replaced by a number.
      const pattern = tpl
        .split(/\$\{[A-Z][A-Z0-9_]*\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\d+");
      return new RegExp(`^${pattern}$`).test(t);
    });
    return !backed;
  });
}

describe("Owner ruling — 'Limited' on Basic only when backed by a constant", () => {
  it("no Basic item or Basic cell says 'limited' without an enforced, interpolated number", () => {
    const texts = basicTexts();
    expect(texts.length).toBeGreaterThanOrEqual(BASIC_INCLUDES.length);
    expect(unbackedLimited(texts, COMPARE_SOURCE)).toEqual([]);
  });

  it("the two rows the ruling changed: practice and worksheets are ticks for both plans", () => {
    const rows = compareSections({ freeCheck: true }).flatMap((s) => s.rows);
    for (const label of ["Practice sets with model answers", "Worksheets built from your chosen topics"]) {
      const row = rows.find((r) => r.label === label);
      expect(row, label).toEqual({ label, basic: { kind: "yes" }, premium: { kind: "yes" } });
    }
    expect(BASIC_INCLUDES.find((i) => i.id === "practice")?.label).toBe("Practice sets and worksheet generation");
  });

  it("CONTROL — an unbacked 'Limited' (bare, or with a retyped digit) is caught", () => {
    expect(unbackedLimited(["Limited"], COMPARE_SOURCE)).toEqual(["Limited"]);
    expect(unbackedLimited(["Limited practice and worksheet generation"], COMPARE_SOURCE)).toHaveLength(1);
    const retyped = "const ROW = `Limited to 10 a day`;";
    expect(unbackedLimited(["Limited to 10 a day"], retyped)).toEqual(["Limited to 10 a day"]);
  });

  it("CONTROL — a 'Limited' whose number is interpolated from a constant passes", () => {
    const backed = "const ROW = `Limited to ${FREE_DAILY_PRACTICE_LIMIT} a day`;";
    expect(unbackedLimited(["Limited to 10 a day"], backed)).toEqual([]);
    // ...but not when the rendered text does not match that template.
    expect(unbackedLimited(["Limited practice, 10 a day"], backed)).toHaveLength(1);
  });
});
