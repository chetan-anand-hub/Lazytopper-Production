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
      // Was src/pages/Home.tsx until Lane D2 deleted that dead landing page.
      // Replaced rather than dropped: this probe's job is to prove the walk
      // RECURSES, and Home.tsx sat directly in src/pages/ alongside
      // PricingPage.tsx, so removing it outright would have left no probe below
      // the first level. DesktopHome.tsx is one directory deeper AND is the live
      // surface that replaced Home.tsx.
      "src/pages/desktop/DesktopHome.tsx",
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

/**
 * THE GAP THIS CLOSES — the guard above walks `src/`, and `index.html` is not in
 * `src/`.
 *
 * That single blind spot is why `<meta name="description">` advertised "upgrade
 * to Premium for ₹149/month" long after ₹149 was retired everywhere else: the
 * four in-app surfaces were fixed and pinned, and the one surface GOOGLE actually
 * quotes was outside the pin. A stale price in a meta description is worse than a
 * stale price in the UI — search engines cache descriptions for weeks, so it is
 * the figure a student sees BEFORE they ever reach the site, and no in-app fix
 * can reach it.
 *
 * ★ The resolution is to remove the price from metadata ENTIRELY rather than
 * correct it. The founding rate is deliberately temporary; a number that lives in
 * a cached description cannot be revised on the timetable the offer needs. The
 * site is the right place to state a price, and /pricing already does.
 */
const INDEX_HTML_REL = "index.html";

/**
 * Shape C — a bare price figure with no rupee sign, e.g. `149/month`. Only counts
 * when the same line also carries pricing language, because `index.html` is full
 * of unrelated integers (font weight axes, og:image dimensions, a CBSE year) that
 * would otherwise make this pattern fire on a correct file.
 */
const BARE_PRICE_FIGURE = /\b(149|599|999|4999|5999|8999)\b/;
const PRICING_LANGUAGE =
  /(₹|\brs\.?\b|\binr\b|\bprice\b|\bpricing\b|\bmonth\b|\bmonthly\b|\byear\b|\bannual\b|\bpremium\b|\bupgrade\b|\bsubscri)/i;

describe("pricing guard — index.html carries no price at all", () => {
  it("has no rupee-form, structured-form or bare price literal in the metadata", () => {
    const lines = readFileSync(resolve(process.cwd(), INDEX_HTML_REL), "utf8").split(/\r?\n/);
    const hits: Array<{ line: number; text: string; shape: string }> = [];

    lines.forEach((line, i) => {
      const push = (shape: string) => hits.push({ line: i + 1, text: line.trim(), shape });
      if (RUPEE_LITERAL.test(line)) push("A/rupee");
      if (STRUCTURED_PRICE_LITERAL.test(line)) push("B/structured");
      if (BARE_PRICE_FIGURE.test(line) && PRICING_LANGUAGE.test(line)) push("C/bare-figure");
    });

    const rendered = hits.map(h => `  [${h.shape}] ${INDEX_HTML_REL}:${h.line}  ${h.text}`).join("\n");
    expect(
      hits,
      `${INDEX_HTML_REL} must quote NO price — search engines cache it for weeks ` +
        `and the founding rate is temporary. State the price on /pricing:\n${rendered}`,
    ).toEqual([]);
  });

  it("the bare-figure pattern is not dead, and ignores index.html's ordinary integers", () => {
    // Shape C is the one that needs proving hardest: it is a CONJUNCTION, so it
    // can be broken by either half and still read as a passing guard.
    const retired = "Start free — upgrade to Premium for 149/month.";
    expect(BARE_PRICE_FIGURE.test(retired) && PRICING_LANGUAGE.test(retired)).toBe(true);
    const founding = 'content="Start free — upgrade to Premium for ₹599/month."';
    expect(BARE_PRICE_FIGURE.test(founding) && PRICING_LANGUAGE.test(founding)).toBe(true);

    // Real lines from index.html that must NOT trip it: the Google Fonts weight
    // axes, the og:image dimensions, and the keywords list's "CBSE 2027".
    const fonts =
      'href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,700&display=swap"';
    expect(BARE_PRICE_FIGURE.test(fonts) && PRICING_LANGUAGE.test(fonts)).toBe(false);
    expect(BARE_PRICE_FIGURE.test('<meta property="og:image:width" content="1200" />')).toBe(false);
    expect(BARE_PRICE_FIGURE.test('content="CBSE Class 10, CBSE 2027, mock tests"')).toBe(false);

    // A figure with no pricing language around it is not a price claim.
    expect(PRICING_LANGUAGE.test('<meta name="x" content="599 questions" />')).toBe(false);
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
