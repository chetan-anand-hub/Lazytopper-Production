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
  BASIC_LIMITS_HEAD,
  basicLimits,
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
import { PRICE_FREE_DISPLAY } from "./pricing";
import { LIMITS_CONFIG } from "./limitsConfig";
import { basicDownloadCell, basicQuickPracticeCell } from "./limitsPlanCopy";
import { basicLineRest } from "../components/pricing/pricingPlansCopy";

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
      "Answer Checker — photograph your handwritten answer, marked step by step like a board examiner",
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
  it("titles and headers; the Premium header is the fixed Board Pass price (PRICE-FIXED-1)", () => {
    expect(COMPARE_TITLE).toBe("Compare plans");
    expect(FAIR_USE_TITLE).toBe("Fair use, shown not hidden");
    expect(COMPARE_FEATURE_HEADER).toBe("What you get");
    expect(COMPARE_BASIC_HEADER).toBe(`Basic · ${PRICE_FREE_DISPLAY}`);
    const before = new Date("2026-11-02T10:00:00+05:30");
    expect(comparePremiumHeader(before)).toBe("Premium · ₹1,917 till boards");
    expect(comparePremiumHeader(new Date("2026-12-01T00:00:00+05:30"))).toBe("Premium · ₹2,499 till boards");
    expect(comparePremiumHeader(before)).not.toMatch(/599|999|from/);
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

/* Owner ruling 2 on #1190 — the guard also covers the Basic card's description and EVERY
 * FAQ answer, which live in PricingPage.tsx. They are read from the source (this suite runs
 * in node); PricingPage.pricing.test.tsx pins the same strings as rendered. */
const PAGE_SOURCE = readFileSync(resolve(process.cwd(), "src/pages/PricingPage.tsx"), "utf8");
/** PRICING-B-1: the page's copy (incl. the Basic line) lives in components/pricing/pricingPlansCopy.ts. */
const COPY_SOURCE = readFileSync(resolve(process.cwd(), "src/components/pricing/pricingPlansCopy.ts"), "utf8");

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");

/** The Basic line's description (PRICING-B-1: `BASIC_LINE_REST`), or the old Basic card paragraph in a fixture; whitespace-collapsed. */
function basicDescriptionFrom(src: string): string {
  const line = /export const BASIC_LINE_REST = "([^"]*)"/.exec(src);
  if (line) return line[1].replace(/^,\s*/, "").replace(/\s+/g, " ").trim();
  const m = /lt-pricing-card--basic">[\s\S]*?<p className="lt-pricing-plan-desc">([\s\S]*?)<\/p>/.exec(src);
  if (!m) throw new Error("Basic description not found");
  return m[1].replace(/\s+/g, " ").trim();
}

/** Every FAQ answer the page can render: each `a:` in FAQ_ITEMS, plus the payments-ON pay answer. */
function faqAnswersFrom(src: string): { questions: number; answers: string[] } {
  const start = src.indexOf("const FAQ_ITEMS = [");
  const end = src.indexOf("\n];\n", start);
  if (start < 0 || end < 0) throw new Error("FAQ_ITEMS not found");
  const block = stripComments(src.slice(start, end));
  const answers = [...block.matchAll(/\ba:\s*("(?:[^"\\]|\\.)*"|`[^`]*`)/g)].map((m) => m[1].slice(1, -1));
  const on = /const FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON =\s*(?:"([^"]*)"|`([^`]*)`)/.exec(src);
  if (!on) throw new Error("FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON not found");
  return { questions: (block.match(/\bq:\s*["`]/g) ?? []).length, answers: [...answers, on[1] ?? on[2]] };
}

describe("Owner ruling — 'Limited' on Basic only when backed by a constant", () => {
  it("no Basic item or Basic cell says 'limited' without an enforced, interpolated number", () => {
    const texts = basicTexts();
    expect(texts.length).toBeGreaterThanOrEqual(BASIC_INCLUDES.length);
    expect(unbackedLimited(texts, COMPARE_SOURCE)).toEqual([]);
  });

  it("neither does the Basic card description, nor ANY FAQ answer (owner ruling 2)", () => {
    const desc = basicDescriptionFrom(COPY_SOURCE);
    const { questions, answers } = faqAnswersFrom(PAGE_SOURCE);
    // CONTROL — the extractor really reads the page: the ruled strings, and one answer per question.
    expect(desc).toBe("with notes, NCERT solutions and practice sets");
    expect(questions).toBeGreaterThanOrEqual(7);
    expect(answers).toHaveLength(questions + 1);
    expect(answers).toContain(
      "Yes. Basic is free forever: study, practise and open papers without paying. Checked answers, the AI tutor and Mistake Intelligence come with the ${BOARD_PASS_NAME}.",
    );
    expect(unbackedLimited([desc, ...answers], PAGE_SOURCE + COPY_SOURCE + COMPARE_SOURCE)).toEqual([]);
  });

  it("BASIC-LINE-1 — with the limits on, the last line says 'limited practice' and the guard accepts it only via its constants", () => {
    // The template lives in pricingPlansCopy.ts (COPY_SOURCE, scanned); render it exactly as the page does.
    const m = /export const BASIC_LINE_REST_LIMITED = `([^`]*)`/.exec(COPY_SOURCE);
    expect(m, "BASIC_LINE_REST_LIMITED template not found").not.toBeNull();
    expect(m![1]).toMatch(/\$\{[A-Z][A-Z0-9_]*\}/);
    expect(basicLineRest(true).replace(/^,\s*/, "")).toBe(
      "with notes, NCERT solutions and limited practice (1 graded set a day, 1 download a week)",
    );
    // The figures are the very ones the compare table's Basic cells show.
    expect(basicQuickPracticeCell()).toMatch(/^1 a day/);
    expect(basicDownloadCell()).toMatch(/^1 a week/);
    expect(LIMITS_CONFIG.basic.quickPracticeGradedPerDay).toBe(1); // "1 graded set a day" is singular: a change here needs a copy review
    expect(LIMITS_CONFIG.basic.downloadsPerWeek).toBe(1);
    expect(unbackedLimited([basicLineRest(true)], COPY_SOURCE)).toEqual([]); // the template as rendered, leading comma included
    // CONTROL — the same words with the digits typed (not interpolated) are caught.
    const typed = "const R = `, with notes, NCERT solutions and limited practice (1 graded set a day, 1 download a week)`;";
    expect(unbackedLimited(["with notes, NCERT solutions and limited practice (1 graded set a day, 1 download a week)"], typed)).toHaveLength(1);
    // Limits off: nothing is capped, so no "limited".
    expect(basicLineRest(false)).not.toMatch(/limited/i);
  });

  it("CONTROL — the guard catches the OLD wording of both strings", () => {
    const oldDesc = "Browse the product and use limited learning tools without paid access.";
    const oldFaq = "Yes. Basic keeps browse-first access and limited practice tools available without paid activation.";
    expect(unbackedLimited([oldDesc, oldFaq], PAGE_SOURCE + COMPARE_SOURCE)).toEqual([oldDesc, oldFaq]);
    // ...and through the same extractors, on a fixture page carrying the old wording.
    const oldPage = [
      '<div className="lt-pricing-card lt-pricing-card--basic">',
      `<p className="lt-pricing-plan-desc">\n  ${oldDesc}\n</p>`,
      "const FAQ_ITEMS = [",
      `  { q: "Is Basic really free?", a: "${oldFaq}" },`,
      "];",
      'const FAQ_CAN_I_PAY_ANSWER_PAYMENTS_ON = "Yes.";',
    ].join("\n");
    const found = unbackedLimited([basicDescriptionFrom(oldPage), ...faqAnswersFrom(oldPage).answers], oldPage);
    expect(found).toEqual([oldDesc, oldFaq]);
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

describe("PRICING-1 · what Basic does not include is stated, and it is TRUE today", () => {
  it("every line on the Basic card's restriction list has a 'not included' Basic cell in the compare table", () => {
    const table = compareSections({ freeCheck: false });
    const basicNo = (label: string) => table.flatMap(s => s.rows).find(r => r.label === label)?.basic.kind === "no";
    // restriction id -> the table row that backs it
    const backing: Record<string, string> = {
      graded: "Chapter tests, mocks and worksheets graded",
      check: "Photograph your handwritten answer and get it marked",
      steps: "Step marks, CBSE keywords and units, the way examiners mark",
      tutor: "AI tutor that knows your chapters and mistakes",
      mi: "Mistake Intelligence — why you lose marks",
      similar: "New questions like the one you got wrong",
    };
    const ids = basicLimits({ freeCheck: false }).map(i => i.id);
    expect(ids).toEqual(Object.keys(backing));
    for (const [id, label] of Object.entries(backing)) expect(basicNo(label), `${id} -> ${label}`).toBe(true);
  });

  it("with the first free check on, the answer-checking line says it stops after that one check", () => {
    const on = basicLimits({ freeCheck: true }).find(i => i.id === "check")!.label;
    const off = basicLimits({ freeCheck: false }).find(i => i.id === "check")!.label;
    expect(on).toBe("Answer checking stops after your first free check");
    expect(off).toBe("No handwritten answer checking");
  });

  it("does not advertise limits that are not enforced today", () => {
    const all = basicLimits({ freeCheck: true }).map(i => i.label).join(" | ");
    expect(all).not.toMatch(/\d/); // no invented quota figure
    expect(BASIC_LIMITS_HEAD).toBe("Not on Basic:");
  });
});
