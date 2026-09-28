import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * PERF-CLS-3 (C4) — the landing's serif headings are width-limited in `em`, never `ch`.
 *
 * `ch` is the advance of "0" in the element's PRIMARY font, and the primary font changes
 * while the page loads: the fallback first, then a Fraunces unicode-range segment (the
 * latin-ext one, fetched for "₹", has no "0", so 1ch collapses to 0.5em), then Fraunces
 * latin. Each change resized the box and re-wrapped the headline on Android — a layout
 * shift on every cold load. `em` depends only on font-size, so the box is the same width
 * in every font. The em values are Fraunces' own "0" advance (wght 900, opsz = font-size)
 * times the old ch count; see report-perf-cls-3.
 *
 * Reads SOURCE text (the landing CSS is a module-private template string). Every rule is
 * asserted to be FOUND first, so a renamed selector fails loudly instead of passing empty.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const WELCOME = readFileSync(resolve(HERE, "Welcome.tsx"), "utf8");

function landingCss(): string {
  const m = WELCOME.match(/const CSS = `([\s\S]*?)`;/);
  expect(m, "Welcome.tsx must still define the landing CSS as `const CSS = `...``").not.toBeNull();
  return m![1];
}

/** Every top-level-or-nested rule `selector{body}` in the CSS (at-rule headers excluded). */
function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    if (!selector.startsWith("@")) out.push({ selector, body: m[2] });
  }
  return out;
}

const headingRule = (sel: string) => /(^|[\s>,])h[1-6](?![\w-])/.test(sel) && sel.includes(".lt-landing");

describe("PERF-CLS-3 — landing headings sized in em, not ch", () => {
  const css = landingCss();
  const all = rules(css);

  it("finds the four width-limited heading rules (precondition)", () => {
    expect(css.length).toBeGreaterThan(1000);
    for (const sel of [".lt-landing h1", ".lt-landing h2", ".lt-landing-payoff h2", ".lt-landing-close h2"]) {
      const r = all.filter((x) => x.selector === sel && /max-width\s*:/.test(x.body));
      expect(r, `${sel} must declare a max-width`).toHaveLength(1);
    }
  });

  it("no .lt-landing heading rule uses ch for max-width", () => {
    const withMax = all.filter((r) => headingRule(r.selector) && /max-width\s*:/.test(r.body));
    expect(withMax.length).toBeGreaterThanOrEqual(4);
    for (const r of withMax) {
      const v = r.body.match(/max-width\s*:\s*([^;]+)/)![1].trim();
      expect(v, `${r.selector} max-width`).not.toMatch(/ch\b/);
    }
  });

  it("the four heading max-widths are em values (the Fraunces-derived widths)", () => {
    const expected: Record<string, string> = {
      ".lt-landing h1": "7.9em",
      ".lt-landing h2": "10.14em",
      ".lt-landing-payoff h2": "10.86em",
      ".lt-landing-close h2": "10.87em",
    };
    for (const [sel, em] of Object.entries(expected)) {
      const r = all.find((x) => x.selector === sel && /max-width\s*:/.test(x.body))!;
      expect(r.body.match(/max-width\s*:\s*([^;]+)/)![1].trim(), sel).toBe(em);
    }
  });
});
