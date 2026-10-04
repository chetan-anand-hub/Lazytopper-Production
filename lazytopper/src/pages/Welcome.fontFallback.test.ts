import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * PERF-CLS-1 (C5) — the landing's text must not jump when its web fonts arrive.
 *
 * Two causes, two pins:
 *  1. The landing's CSS string re-requested Google Fonts through an `@import`. When
 *     Welcome's <style> mounted, the browser registered a SECOND set of Fraunces / Inter
 *     faces and swapped again seconds after first paint. index.html's <link> is the one
 *     font request; the landing CSS must carry no Google Fonts `@import`.
 *  2. Until the fonts arrive, text paints in a fallback. The fallbacks are metric-matched
 *     local faces ("Fraunces Fallback" on Georgia, "Inter Fallback" on Arial) declared in
 *     styles.css, and they only help if they sit in the stacks, right after the web font.
 *
 * Reads SOURCE text: the landing's CSS is a module-private template string, and the
 * @font-face rules are plain CSS that jsdom does not lay out. Every lookup below is
 * asserted to FIND its subject first, so a renamed declaration fails loudly instead of
 * passing on an empty match.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const WELCOME = readFileSync(resolve(HERE, "Welcome.tsx"), "utf8");
const STYLES = readFileSync(resolve(HERE, "../styles.css"), "utf8");

/** The landing's CSS template string: `const CSS = \`...\`;` */
function landingCss(): string {
  const m = WELCOME.match(/const CSS = `([\s\S]*?)`;/);
  expect(m, "Welcome.tsx must still define the landing CSS as `const CSS = `...``").not.toBeNull();
  return m![1];
}

/** Value of a custom property declared as `--name:VALUE;` (first occurrence). */
function customProp(css: string, name: string): string {
  const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  expect(m, `${name} must be declared`).not.toBeNull();
  return m![1].trim();
}

/** Families of a font stack, unquoted, in order. */
function families(stack: string): string[] {
  return stack.split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
}

/** The body of the @font-face rule for `family`, or null. */
function fontFace(css: string, family: string): string | null {
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    if (new RegExp(`font-family:\\s*["']${family}["']`).test(m[1])) return m[1];
  }
  return null;
}

describe("PERF-CLS-1 — landing fonts: one request, metric-matched fallbacks", () => {
  it("the landing CSS carries no Google Fonts @import (index.html is the single font request)", () => {
    const css = landingCss();
    expect(css.length).toBeGreaterThan(1000); // precondition: we are looking at the real CSS
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/fonts\.googleapis\.com/);
  });

  it("control: the @import detector fires on a CSS string that has one", () => {
    const withImport =
      "@import url('https://fonts.googleapis.com/css2?family=Fraunces&display=swap');\n.x{}";
    expect(withImport).toMatch(/@import/);
    expect(withImport).toMatch(/fonts\.googleapis\.com/);
  });

  // LOW-END-1 (L1): headings are Fraunces 700, so the fallback is Georgia BOLD (no
  // synthetic emboldening during the swap); the metrics were re-derived for 700.
  it("styles.css declares Fraunces Fallback on local(Georgia Bold) with all four metric overrides", () => {
    const face = fontFace(STYLES, "Fraunces Fallback");
    expect(face, '@font-face for "Fraunces Fallback" must exist in styles.css').not.toBeNull();
    expect(face).toMatch(/src:\s*local\(["']Georgia Bold["']\)/);
    for (const d of ["size-adjust", "ascent-override", "descent-override", "line-gap-override"]) {
      expect(face, `Fraunces Fallback must set ${d}`).toMatch(new RegExp(`${d}:\\s*[\\d.]+%`));
    }
  });

  // LOW-END-1 (L1): Inter is no longer loaded, so a metric-matched "Inter Fallback" (Arial
  // scaled to Inter's box) would no longer be a stand-in for a font that arrives — it would
  // BE the landing's body font, an enlarged Arial instead of the system font the owner
  // ruled. The landing's --sans stack (unchanged) then falls through to system-ui.
  it("styles.css no longer declares an Inter Fallback face (Inter is not loaded)", () => {
    expect(fontFace(STYLES, "Fraunces Fallback"), "precondition: the finder finds a face that exists").not.toBeNull();
    expect(fontFace(STYLES, "Inter Fallback")).toBeNull();
  });

  it("the landing's --serif stack is Fraunces, \"Fraunces Fallback\", Georgia, serif", () => {
    expect(families(customProp(landingCss(), "--serif"))).toEqual([
      "Fraunces",
      "Fraunces Fallback",
      "Georgia",
      "serif",
    ]);
  });

  it("the landing's --sans stack is Inter, \"Inter Fallback\", system-ui, sans-serif", () => {
    expect(families(customProp(landingCss(), "--sans"))).toEqual([
      "Inter",
      "Inter Fallback",
      "system-ui",
      "sans-serif",
    ]);
  });

  it("the hero sub-line's max-width is font-independent (em, not ch)", () => {
    // `ch` is the width of "0" in whichever font is PAINTING, so a ch box resizes when the
    // fallback swaps to Inter and the line re-wraps (23px shift @375). 19.56em is Inter's
    // 31ch (0 advance 1292/2048 × 31 = 19.557em): same box once Inter has loaded, and the
    // same box before it has.
    const m = landingCss().match(/\.lt-landing-sub\{([^}]*)\}/);
    expect(m, ".lt-landing-sub rule must exist").not.toBeNull();
    expect(m![1]).toMatch(/max-width:19\.56em/);
    expect(m![1]).not.toMatch(/max-width:[\d.]+ch/);
  });

  it("the app-wide --font-display stack carries \"Fraunces Fallback\" right after Fraunces", () => {
    expect(families(customProp(STYLES, "--font-display"))).toEqual([
      "Fraunces",
      "Fraunces Fallback",
      "Georgia",
      "serif",
    ]);
  });
});
