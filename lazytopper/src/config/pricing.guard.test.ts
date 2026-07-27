// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

import {
  ANNUAL_AT_MONTHLY_RATE_FOUNDING_INR,
  ANNUAL_AT_MONTHLY_RATE_LIST_INR,
  ANNUAL_SAVING_FOUNDING_INR,
  ANNUAL_SAVING_LIST_INR,
  MONTHLY_INLINE,
  MONTHS_PER_BOARD_YEAR,
  PRICE_ANNUAL_FOUNDING_INR,
  PRICE_ANNUAL_LIST_INR,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_INR,
  formatInr,
} from "./pricing";

/**
 * GUARD — no price literal may live outside src/config/pricing.ts.
 *
 * This pins a DECISION, so it gets full discipline. Four surfaces had each
 * hard-coded a retired ₹149/month and drifted from the pricing page; fixing the
 * instances without pinning the cause just resets the clock. The guard walks
 * ALL of src/ rather than a hand-listed set of files, because a hand-listed
 * scan cannot catch the FIFTH surface — and the fifth surface is the entire
 * point of writing a guard instead of a checklist.
 *
 * It catches TWO independent shapes, because the most dangerous one has no
 * rupee sign in it at all:
 *
 *   A. RUPEE FORM     ₹149            — visible copy. Easy to spot in review.
 *   B. STRUCTURED FORM price: "149"   — JSON-LD Offer. Invisible in the UI,
 *                                       indexed and displayed by Google, and
 *                                       completely missed by a /₹\d/ pattern.
 *
 * A guard that only caught shape A would be worse than no guard, because it
 * would license the belief that shape B was covered.
 */

const SRC_ROOT = resolve(process.cwd(), "src");
const PRICING_MODULE = join("src", "config", "pricing.ts");

/**
 * Exemptions, each with a reason. Kept deliberately short — every entry here is
 * a hole in the guard.
 *
 *  - the pricing module itself: it is where the numbers are SUPPOSED to live.
 *  - test files: a test pins a price literal on purpose; that is the assertion.
 *  - src/data/**: question banks. Word problems legitimately contain rupee
 *    amounts ("a shopkeeper sells 12 pens for ₹96"). These are exam content,
 *    not product prices, and the directory is forbidden to edit anyway.
 */
function isExempt(relPath: string): boolean {
  const p = relPath.split(sep).join("/");
  if (p === "src/config/pricing.ts") return true;
  if (/\.test\.tsx?$/.test(p)) return true;
  if (p.startsWith("src/data/")) return true;
  return false;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Shape A — a rupee sign immediately followed by a digit. */
const RUPEE_LITERAL = /₹\s*\d/;

/**
 * Shape B — a `price` key assigned a numeric literal or numeric string, which
 * is how schema.org Offer prices are written. Matches `price: "149"`,
 * `"price": "149"` and `price: 149`; does NOT match `price: PRICE_MONTHLY_JSONLD`.
 */
const STRUCTURED_PRICE_LITERAL = /"?\bprice"?\s*:\s*["']?\d/;

function scanForLiterals(): Array<{ file: string; line: number; text: string; shape: string }> {
  const hits: Array<{ file: string; line: number; text: string; shape: string }> = [];
  for (const abs of walk(SRC_ROOT)) {
    const rel = relative(process.cwd(), abs);
    if (isExempt(rel)) continue;
    const lines = readFileSync(abs, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      // Skip comment lines: prose may legitimately mention a historical price.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (RUPEE_LITERAL.test(line)) {
        hits.push({ file: rel, line: i + 1, text: line.trim(), shape: "A/rupee" });
      }
      if (STRUCTURED_PRICE_LITERAL.test(line)) {
        hits.push({ file: rel, line: i + 1, text: line.trim(), shape: "B/structured" });
      }
    });
  }
  return hits;
}

describe("pricing guard — no price literals outside the pricing module", () => {
  it("finds no rupee-form or structured-form price literal anywhere under src/", () => {
    const hits = scanForLiterals();
    const rendered = hits
      .map(h => `  [${h.shape}] ${h.file}:${h.line}  ${h.text}`)
      .join("\n");
    expect(
      hits,
      `price literals must live only in ${PRICING_MODULE}:\n${rendered}`,
    ).toEqual([]);
  });

  it("actually scans the whole tree, not a hand-listed set of files", () => {
    const scanned = walk(SRC_ROOT).map(f => relative(process.cwd(), f).split(sep).join("/"));

    // A hand-listed guard would cover only the files someone remembered. Prove
    // the walk reaches every directory that has ever carried a price, plus a
    // deep unrelated one, and that the corpus is large enough to be a real walk.
    expect(scanned.length).toBeGreaterThan(200);
    for (const mustReach of [
      "src/pages/PricingPage.tsx",
      "src/pages/Home.tsx",
      "src/components/auth/PracticeLimitGate.tsx",
      "src/components/auth/MockViewGate.tsx",
      "src/config/pricing.ts",
    ]) {
      expect(scanned, `walk did not reach ${mustReach}`).toContain(mustReach);
    }
  });

  it("detects BOTH shapes when they are present (the patterns are not dead)", () => {
    // Proves the two regexes work, independently of the repo being clean —
    // otherwise a typo'd pattern would sit green forever on a clean tree.
    expect(RUPEE_LITERAL.test('<span>₹149</span>')).toBe(true);
    expect(RUPEE_LITERAL.test('<span>{PRICE_MONTHLY_DISPLAY}</span>')).toBe(false);

    expect(STRUCTURED_PRICE_LITERAL.test('{ name: "Premium", price: "149" }')).toBe(true);
    expect(STRUCTURED_PRICE_LITERAL.test('{ name: "Premium", "price": "149" }')).toBe(true);
    expect(STRUCTURED_PRICE_LITERAL.test('{ name: "Premium", price: 149 }')).toBe(true);
    expect(STRUCTURED_PRICE_LITERAL.test('{ price: PRICE_MONTHLY_JSONLD }')).toBe(false);

    // The shapes are genuinely independent: the structured form has no ₹ at
    // all, which is exactly why a rupee-only guard would miss the JSON-LD.
    expect(RUPEE_LITERAL.test('{ price: "149", priceCurrency: "INR" }')).toBe(false);
  });
});

describe("pricing module — the derivation holds", () => {
  it("derives BOTH savings from their own tier's prices rather than restating them", () => {
    expect(ANNUAL_AT_MONTHLY_RATE_LIST_INR).toBe(
      PRICE_MONTHLY_LIST_INR * MONTHS_PER_BOARD_YEAR,
    );
    expect(ANNUAL_SAVING_LIST_INR).toBe(
      ANNUAL_AT_MONTHLY_RATE_LIST_INR - PRICE_ANNUAL_LIST_INR,
    );

    expect(ANNUAL_AT_MONTHLY_RATE_FOUNDING_INR).toBe(
      PRICE_MONTHLY_FOUNDING_INR * MONTHS_PER_BOARD_YEAR,
    );
    expect(ANNUAL_SAVING_FOUNDING_INR).toBe(
      ANNUAL_AT_MONTHLY_RATE_FOUNDING_INR - PRICE_ANNUAL_FOUNDING_INR,
    );

    // Each board year must actually be cheaper than 12 months at its OWN
    // monthly rate, or that tier's saving line is a lie.
    expect(ANNUAL_SAVING_LIST_INR).toBeGreaterThan(0);
    expect(ANNUAL_SAVING_FOUNDING_INR).toBeGreaterThan(0);
  });

  it("keeps every founding price strictly below its list counterpart", () => {
    // The entire founding proposition is "you pay less for taking a risk". If a
    // founding price ever met or exceeded its list price the offer would be
    // meaningless, and the struck-through list figure beside it would be
    // actively misleading rather than merely redundant.
    expect(PRICE_MONTHLY_FOUNDING_INR).toBeLessThan(PRICE_MONTHLY_LIST_INR);
    expect(PRICE_ANNUAL_FOUNDING_INR).toBeLessThan(PRICE_ANNUAL_LIST_INR);
  });

  it("quotes the FOUNDING rate at the moment of upgrade intent", () => {
    // MONTHLY_INLINE is what the practice-limit and mock-view gates render, and
    // those two files import nothing else from this module. While the cohort is
    // open the only honest number there is the one actually charged today. This
    // pins the binding so that a tier rename cannot silently repoint the gates
    // at the list price without a test going red.
    expect(MONTHLY_INLINE).toBe(`${formatInr(PRICE_MONTHLY_FOUNDING_INR)}/month`);
    expect(MONTHLY_INLINE).not.toContain(String(PRICE_MONTHLY_LIST_INR));
  });

  it("formats with Indian digit grouping and no ICU dependency", () => {
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(599)).toBe("₹599");
    expect(formatInr(4999)).toBe("₹4,999");
    expect(formatInr(100000)).toBe("₹1,00,000");
  });
});
