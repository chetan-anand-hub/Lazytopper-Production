// @vitest-environment node
//
// PRICE-FIXED-1 (owner ruling 20:25 IST, 31 Oct 2026): "ensure to hide 599 throughout the product."
//
// The month-pass price (founding 599) must appear NOWHERE a student, a parent or a signed-out visitor can see it,
// unless that account already has a PAID month order (and then only inside its own /pricing page and checkout,
// which render it from the pricing constants, behind the server's `monthPassAvailable`).
//
// This guard scans the places a visitor's eyes (or a crawler) can reach WITHOUT being a month buyer:
//   * prerendered/**           the static HTML every signed-out visitor and crawler gets
//   * public/*.txt             llms.txt and friends
//   * the email templates      trial-ending, nudge (incl. the founding email), concierge - source AND built bodies
//   * the built client bundle  (dist/assets/*.js, when a build exists - CI builds before this runs)
// and FAILS on any "599" that is not on the allow-list below. The allow-list is deliberately tiny.
//
// ALLOWED, and why:
//   1. src/config/pricing.ts and server/services/passPricing.cjs  - the price constants themselves.
//   2. In the bundle: the bare numeric literal 599 (the constant PRICE_MONTHLY_FOUNDING_INR, read only by the
//      month-buyer branch of PricingPage / PassCheckout and by the JSON-LD string constants). A RENDERED price is
//      "₹599" / "599 for a month" - those are never allowed, and a literal inside a string is never allowed.
//   3. server/routes/*.cjs price tables and tests are not scanned (they are not visitor-facing).
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const require = createRequire(import.meta.url);

/** A standalone 599: not part of a longer number, id or hash. */
const STANDALONE_599 = /(?<![0-9A-Za-z.])599(?![0-9A-Za-z])/g;

function walk(dir: string, accept: (f: string) => boolean): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, accept));
    else if (accept(p)) out.push(p);
  }
  return out.sort();
}

function hits(file: string, text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(STANDALONE_599)) {
    const i = m.index!;
    out.push(`${relative(ROOT, file)}: "${text.slice(Math.max(0, i - 40), i + 25).replace(/\s+/g, " ")}"`);
  }
  return out;
}

describe("PRICE-FIXED-1 - the month price (599) is hidden from everyone but month buyers", () => {
  it("the scan is not vacuous: it finds files in every place it claims to scan", () => {
    expect(walk(join(ROOT, "prerendered"), (f) => f.endsWith(".html")).length).toBeGreaterThan(10);
    expect(walk(join(ROOT, "public"), (f) => f.endsWith(".txt")).length).toBeGreaterThanOrEqual(2);
    expect(STANDALONE_599.test("Pay ₹599 for a month")).toBe(true);
    STANDALONE_599.lastIndex = 0;
    expect("a1599b 5990 0xe599f".match(STANDALONE_599)).toBeNull();
  });

  it("prerendered/** (the static HTML for signed-out visitors and crawlers) carries no 599", () => {
    const found = walk(join(ROOT, "prerendered"), (f) => f.endsWith(".html")).flatMap((f) => hits(f, readFileSync(f, "utf8")));
    expect(found).toEqual([]);
  });

  it("public/*.txt (llms.txt and the other text files) carry no 599", () => {
    const found = walk(join(ROOT, "public"), (f) => f.endsWith(".txt")).flatMap((f) => hits(f, readFileSync(f, "utf8")));
    expect(found).toEqual([]);
  });

  it("the email templates carry no 599, in source or in what they build", () => {
    const files = ["trialEndingEmail.cjs", "nudgeEmail.cjs", "nudgeConciergeTemplates.cjs"].map((f) => join(ROOT, "server/services", f));
    expect(files.flatMap((f) => hits(f, readFileSync(f, "utf8")))).toEqual([]);

    const { buildTrialEmail } = require("../../server/services/trialEndingEmail.cjs");
    const { buildConciergeEmail } = require("../../server/services/nudgeConciergeTemplates.cjs");
    const { foundingPriceLine } = require("../../server/services/nudgeEmail.cjs");
    const built: string[] = [];
    for (const nowMs of [Date.parse("2026-10-31T10:00:00+05:30"), Date.parse("2026-11-20T10:00:00+05:30"), Date.parse("2026-12-05T10:00:00+05:30")]) {
      const m = buildTrialEmail({ trialEndsAtMs: nowMs + 86_400_000, counts: null, appUrl: "https://www.lazytopper.com", unsubscribeUrl: "https://x/u", nowMs });
      built.push(m.subject, m.text, m.html);
    }
    for (const passType of ["month", "till_boards"]) {
      const m = buildConciergeEmail("checkout_help", { facts: {}, order: { passType, amountPaise: passType === "month" ? 59900 : 191700 }, unsubscribeUrl: "https://x/u" });
      built.push(m.subject, m.text, m.html);
    }
    built.push(foundingPriceLine());
    expect(built.flatMap((t) => hits(resolve("built"), t))).toEqual([]);
    // ...and nothing in them quotes the old month figures or a saving versus monthly.
    expect(built.join("\n")).not.toMatch(/₹999|a month|for a month|20% (off|less)|paying monthly/i);
  });

  it("the built client bundle (when present) renders no 599: only the bare numeric constant may remain", () => {
    const dist = ["dist", "dist-prod", "build"].map((d) => join(ROOT, d, "assets")).find((d) => existsSync(d));
    if (!dist) return; // no build in this run; CI builds before the ops matrix, and the lane runs it locally
    const bad: string[] = [];
    for (const f of walk(dist, (p) => p.endsWith(".js"))) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(STANDALONE_599)) {
        const i = m.index!;
        const before = text.slice(Math.max(0, i - 1), i);
        const after = text.slice(i + 3, i + 4);
        // A bare numeric literal: preceded by = : , ( [ or space-operator, followed by , ; ) ] } or an operator.
        const bare = /[=:,(\[?]/.test(before) && /[,;)\]}?:]/.test(after);
        const insideString = /["'`₹]\s?$/.test(text.slice(Math.max(0, i - 3), i)) || /^\s?(?:for a month|\/|a month)/i.test(text.slice(i + 3, i + 20));
        if (!bare || insideString) bad.push(`${relative(ROOT, f)}: "${text.slice(Math.max(0, i - 50), i + 30).replace(/\s+/g, " ")}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});
