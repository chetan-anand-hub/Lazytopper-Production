// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

import * as pricing from "./pricing";
import {
  MONTHLY_INLINE,
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
  it("keeps every founding price strictly below its list counterpart", () => {
    // The entire founding proposition is "you pay less for taking a risk". If a
    // founding price ever met or exceeded its list price the offer would be
    // meaningless, and the struck-through list figure beside it would be
    // actively misleading rather than merely redundant.
    expect(PRICE_MONTHLY_FOUNDING_INR).toBeLessThan(PRICE_MONTHLY_LIST_INR);
  });

  it("quotes the FOUNDING rate at the moment of upgrade intent", () => {
    // MONTHLY_INLINE is what the practice-limit and mock-view gates render, and
    // those two files import nothing else from this module. While the cohort is
    // open the only honest number there is the one actually charged today. This
    // pins the binding so that a tier rename cannot silently repoint the gates
    // at the list price without a test going red.
    expect(MONTHLY_INLINE).toBe(`${formatInr(PRICE_MONTHLY_FOUNDING_INR)} for a month`);
    expect(MONTHLY_INLINE).not.toContain(String(PRICE_MONTHLY_LIST_INR));
  });

  it("formats with Indian digit grouping and no ICU dependency", () => {
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(599)).toBe("₹599");
    expect(formatInr(4999)).toBe("₹4,999");
    expect(formatInr(100000)).toBe("₹1,00,000");
  });
});

/**
 * PRICING-TB-1 — THE BOARD-YEAR PLAN IS RETIRED, EVERYWHERE A STUDENT CAN READ IT.
 *
 * Owner ruling (2026-09-26): the fixed board-year plan is replaced by "till
 * boards". No ₹5,999, ₹8,999 or ₹1,189 may remain anywhere a student can read it —
 * the app source, index.html, public/ and the committed prerendered pages, which
 * are what crawlers and a no-JS reader actually receive. The price-literal guard
 * above cannot see this: it exempts the pricing module (where these numbers used
 * to live legitimately) and never reads public/ or prerendered/.
 */
const RETIRED_FIGURE_IN_SOURCE = /\b(5,?999|8,?999|1,?189)\b/;
const RETIRED_FIGURE_IN_STATIC =
  /(₹|&#8377;|&#x20b9;|\brs\.?)\s*(5,?999|8,?999|1,?189)\b|\/\s*board year/i;
const STATIC_TEXT_FILE = /\.(html|json|txt|xml|svg)$/;

function walkAll(dir: string, keep: (entry: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkAll(full, keep, out);
    else if (keep(entry)) out.push(full);
  }
  return out;
}

describe("PRICING-TB-1 — no retired board-year figure remains anywhere a student can read it", () => {
  it("no ₹5,999 / ₹8,999 / ₹1,189 in shipped src (the pricing module INCLUDED), comments too", () => {
    const hits: string[] = [];
    for (const abs of walk(SRC_ROOT)) {
      const rel = relative(process.cwd(), abs).split(sep).join("/");
      if (/\.test\.tsx?$/.test(rel) || rel.startsWith("src/data/")) continue;
      readFileSync(abs, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (RETIRED_FIGURE_IN_SOURCE.test(line)) hits.push(`  ${rel}:${i + 1}  ${line.trim()}`);
        });
    }
    expect(hits, `retired board-year figures still in src:\n${hits.join("\n")}`).toEqual([]);
  });

  it("no retired figure or '/ board year' label in index.html, public/ or prerendered/", () => {
    const files = [
      resolve(process.cwd(), "index.html"),
      ...walkAll(resolve(process.cwd(), "public"), (e) => STATIC_TEXT_FILE.test(e)),
      ...walkAll(resolve(process.cwd(), "prerendered"), (e) => STATIC_TEXT_FILE.test(e)),
    ];
    // The walk is real: prerendered/ carries every advertised page, /pricing among them.
    const rels = files.map((f) => relative(process.cwd(), f).split(sep).join("/"));
    expect(rels).toContain("prerendered/pricing.html");
    expect(rels.length).toBeGreaterThan(50);

    const hits: string[] = [];
    for (const abs of files) {
      const rel = relative(process.cwd(), abs).split(sep).join("/");
      const text = readFileSync(abs, "utf8");
      const m = RETIRED_FIGURE_IN_STATIC.exec(text);
      if (m) hits.push(`  ${rel}: "${text.slice(Math.max(0, m.index - 40), m.index + 40)}"`);
    }
    expect(hits, `retired board-year figures in static files:\n${hits.join("\n")}`).toEqual([]);
  });

  it("CONTROL — both patterns DO match the retired figures in every form they shipped in", () => {
    for (const line of [
      "export const PRICE_ANNUAL_FOUNDING_INR = 5999;",
      "export const PRICE_ANNUAL_LIST_INR = 8999;",
      "save ₹1,189",
    ]) {
      expect(RETIRED_FIGURE_IN_SOURCE.test(line), line).toBe(true);
    }
    for (const html of [
      '<span class="lt-pricing-amount">₹5,999</span>',
      "Regular price <s>&#8377;8,999</s>",
      "so you save ₹1,189 and stay covered",
      '<span class="lt-pricing-period">/ board year</span>',
    ]) {
      expect(RETIRED_FIGURE_IN_STATIC.test(html), html).toBe(true);
    }
    // ...and NOT the live monthly prices, or the guard would fail a correct page.
    expect(RETIRED_FIGURE_IN_STATIC.test("₹599 / month ₹999 ₹0")).toBe(false);
    expect(RETIRED_FIGURE_IN_SOURCE.test("PRICE_MONTHLY_FOUNDING_INR = 599")).toBe(false);
  });

  it("the board-year exports are DELETED from the module, not left unused (OR-P2)", () => {
    const exported = Object.keys(pricing);
    for (const retired of [
      "PRICE_ANNUAL_LIST_INR",
      "PRICE_ANNUAL_FOUNDING_INR",
      "PRICE_ANNUAL_LIST_DISPLAY",
      "PRICE_ANNUAL_FOUNDING_DISPLAY",
      "PERIOD_ANNUAL_LABEL",
      "ANNUAL_SAVING_SUBLINE",
      "MONTHS_PER_BOARD_YEAR",
      "PRICE_ANNUAL_LIST_JSONLD",
      "PRICE_ANNUAL_FOUNDING_JSONLD",
      "BILLING_INCREMENT_ANNUAL",
    ]) {
      expect(exported, `${retired} must be deleted`).not.toContain(retired);
    }
    expect(exported.filter((name) => /ANNUAL|BOARD_YEAR/.test(name))).toEqual([]);

    // OR-P2 LEAVES THESE UNTOUCHED — the control that the namespace read is live.
    for (const kept of [
      "PRICE_MONTHLY_LIST_JSONLD",
      "PRICE_MONTHLY_FOUNDING_JSONLD",
      "AVAILABILITY_LIMITED",
      "AVAILABILITY_IN_STOCK",
      "BILLING_UNIT_MONTH",
    ]) {
      expect(exported, `${kept} must stay`).toContain(kept);
    }
  });

  it("every JSON-LD price string is a MONTHLY (or free) price — none is clock-derived (R5)", () => {
    const jsonld = Object.entries(pricing).filter(([name]) => name.endsWith("_JSONLD"));
    expect(jsonld.length).toBeGreaterThan(0);
    const allowed = new Set([
      String(pricing.PRICE_FREE_INR),
      String(PRICE_MONTHLY_FOUNDING_INR),
      String(PRICE_MONTHLY_LIST_INR),
    ]);
    for (const [name, value] of jsonld) {
      expect(allowed.has(String(value)), `${name} = ${String(value)}`).toBe(true);
    }
  });
});

/**
 * PRICING-TB-1 · OR-P6 (owner, 2026-09-26) — BILLING IS ONE-TIME PASSES ONLY.
 *
 * There is no auto-renew, and a "/month" slash reads as a recurring charge, so every
 * student-facing period reads "for a month" ("₹599 for a month", ₹999 struck). This
 * pins it three ways, because the slash never appears where a naive grep looks:
 * the gates and the offer strip COMPOSE it from constants in this module.
 *
 *   1. SOURCE — every string literal, template literal and JSX text node in the
 *      allowlisted surfaces (comments stripped FIRST, so a comment can neither trip
 *      nor satisfy it).
 *   2. VALUES — every string this module exports, evaluated, so a composed constant
 *      is read as the sentence it becomes.
 *   3. STATIC — the committed prerendered pricing and refund pages.
 */
const SLASH_MONTH = /\/\s*mo(?:nth)?\b/i;
const OR_P6_SURFACES = [
  "src/config/pricing.ts",
  "src/pages/PricingPage.tsx",
  "src/pages/LegalPage.tsx",
  "src/components/auth/OfferStrip.tsx",
  "src/components/auth/MockViewGate.tsx",
  "src/components/auth/PracticeLimitGate.tsx",
];

// Same extractor as the OR-P3 "unlimited" pin (PracticeLimitGate.openAccess.test.tsx),
// written as regex literals: this file is .ts, so `<`, `>` and backticks are unambiguous.
const OR_P6_LINE_COMMENT = /(^|[^:"'`\\])\/\/[^\n]*/g;
const OR_P6_STRING_LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
const OR_P6_JSX_TEXT = new RegExp("[>}]([^<>{}]+)(?=[<{])", "g");

/** Student-facing text: string literals, template literals and JSX text nodes. */
function orP6StudentFacingStrings(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(OR_P6_LINE_COMMENT, "$1");
  const out: string[] = [];
  for (const m of code.matchAll(OR_P6_STRING_LITERAL)) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  for (const m of code.matchAll(OR_P6_JSX_TEXT)) out.push(m[1]);
  return out;
}

describe("OR-P6 — no '/month' anywhere a student reads a price", () => {
  it("SOURCE: no '/ month' or '/month' in a student-facing string on any allowlisted surface", () => {
    const hits: string[] = [];
    for (const rel of OR_P6_SURFACES) {
      for (const text of orP6StudentFacingStrings(readFileSync(resolve(process.cwd(), rel), "utf8"))) {
        if (SLASH_MONTH.test(text)) hits.push(`  ${rel}: ${JSON.stringify(text.trim())}`);
      }
    }
    expect(hits, `"/month" still in student-facing copy:\n${hits.join("\n")}`).toEqual([]);
  });

  it("CONTROL — the scan sees a COMPOSED constant, JSX text and literals, and ignores comments", () => {
    const sample = [
      '/** Compact form: "₹599/month". */',
      "// the retired ₹149/month claim",
      "export const PERIOD_MONTHLY_LABEL = \"/ month\";",
      "export const MONTHLY_INLINE = `${PRICE_MONTHLY_FOUNDING_DISPLAY}/month`;",
      "<span className=\"per\">/mo</span>",
    ].join("\n");
    const found = orP6StudentFacingStrings(sample).filter((s) => SLASH_MONTH.test(s));
    const trimmed = found.map((s) => s.trim());
    // The JSX-text heuristic is a deliberate SUPERSET (it also catches the tail of the
    // template literal), which only makes a ban scan stricter — so assert containment.
    expect(trimmed).toEqual(
      expect.arrayContaining(["/ month", "${PRICE_MONTHLY_FOUNDING_DISPLAY}/month", "/mo"]),
    );
    // The two comments were stripped before scanning: neither contributes a hit.
    expect(trimmed.filter((s) => /Compact form|149/.test(s))).toEqual([]);
    // ...and the new wording does NOT trip it.
    expect(SLASH_MONTH.test("₹599 for a month")).toBe(false);
  });

  it("VALUES: every string this module exports reads 'for a month', never '/month'", () => {
    const strings = Object.entries(pricing).filter(([, v]) => typeof v === "string") as Array<[string, string]>;
    const hits = strings.filter(([, v]) => SLASH_MONTH.test(v)).map(([n, v]) => `${n} = ${JSON.stringify(v)}`);
    expect(hits).toEqual([]);
    // CONTROL — the namespace read is live and reaches the composed constants.
    expect(pricing.PERIOD_MONTHLY_LABEL).toBe("for a month");
    expect(MONTHLY_INLINE).toBe(`${formatInr(PRICE_MONTHLY_FOUNDING_INR)} for a month`);
    expect(strings.map(([n]) => n)).toEqual(expect.arrayContaining(["PERIOD_MONTHLY_LABEL", "MONTHLY_INLINE"]));
  });

  it("the two gates read '… with Premium at ₹599 for a month.' — never 'for ₹599 for a month'", () => {
    // MONTHLY_INLINE now ends "for a month", so "Premium for {MONTHLY_INLINE}" would
    // render "Premium for ₹599 for a month." The one-word grammar fix is "at".
    for (const rel of ["src/components/auth/MockViewGate.tsx", "src/components/auth/PracticeLimitGate.tsx"]) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(src, rel).toContain("with Premium at {MONTHLY_INLINE}.");
      expect(src, rel).not.toContain("Premium for {MONTHLY_INLINE}");
    }
  });

  it("the lock note is the owner's wording, and no longer says 'subscribed'", () => {
    expect(pricing.FOUNDING_LOCK_COPY).toBe("Your founding price stays locked for every pass you buy.");
    expect(pricing.FOUNDING_LOCK_COPY).not.toMatch(/subscri/i);
  });

  it("STATIC: the committed prerendered pricing and refund pages carry no '/month'", () => {
    for (const rel of ["prerendered/pricing.html", "prerendered/legal/refund.html"]) {
      const html = readFileSync(resolve(process.cwd(), rel), "utf8");
      const m = SLASH_MONTH.exec(html);
      expect(m, `${rel}: "${m ? html.slice(Math.max(0, m.index - 40), m.index + 40) : ""}"`).toBeNull();
    }
    // CONTROL — the pricing page was captured with the new period, so the file read is real.
    expect(readFileSync(resolve(process.cwd(), "prerendered/pricing.html"), "utf8")).toContain(
      '<span class="lt-pricing-period">for a month</span>',
    );
  });
});
