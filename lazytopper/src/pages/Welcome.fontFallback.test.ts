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

  it.each([
    ["Fraunces Fallback", "Georgia"],
    ["Inter Fallback", "Arial"],
  ])("styles.css declares %s on local(%s) with all four metric overrides", (family, local) => {
    const face = fontFace(STYLES, family);
    expect(face, `@font-face for "${family}" must exist in styles.css`).not.toBeNull();
    expect(face).toMatch(new RegExp(`src:\\s*local\\(["']${local}["']\\)`));
    for (const d of ["size-adjust", "ascent-override", "descent-override", "line-gap-override"]) {
      expect(face, `${family} must set ${d}`).toMatch(new RegExp(`${d}:\\s*[\\d.]+%`));
    }
  });

  it("the landing's --serif stack is Fraunces, \"Fraunces Fallback\", \"Fraunces Fallback Android\", Georgia, serif", () => {
    expect(families(customProp(landingCss(), "--serif"))).toEqual([
      "Fraunces",
      "Fraunces Fallback",
      "Fraunces Fallback Android",
      "Georgia",
      "serif",
    ]);
  });

  it("the landing's --sans stack is Inter, \"Inter Fallback\", \"Inter Fallback Android\", system-ui, sans-serif", () => {
    expect(families(customProp(landingCss(), "--sans"))).toEqual([
      "Inter",
      "Inter Fallback",
      "Inter Fallback Android",
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

  it("the app-wide --font-display stack carries both Fraunces fallbacks right after Fraunces", () => {
    expect(families(customProp(STYLES, "--font-display"))).toEqual([
      "Fraunces",
      "Fraunces Fallback",
      "Fraunces Fallback Android",
      "Georgia",
      "serif",
    ]);
  });
});

/**
 * PERF-CLS-2 — Android (and most Linux) ships neither Georgia nor Arial, so the two faces above
 * never match there. Separate faces on the fonts Android DOES have — Noto Serif and Roboto —
 * carry their own derived overrides (styles.css comment has the derivation), and sit AFTER the
 * Georgia/Arial faces so iOS / Windows / macOS keep matching Georgia/Arial first.
 */
describe("PERF-CLS-2 — fallback faces for devices without Georgia / Arial", () => {
  /** Every local() name in a face's src, unquoted, in order. */
  function localNames(face: string): string[] {
    return [...face.matchAll(/local\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
  }

  /** The numeric percentage of descriptor `d` in a face body. */
  function descriptor(face: string, d: string): number {
    const m = face.match(new RegExp(`${d}:\\s*([\\d.]+)%`));
    expect(m, `${d} must be set`).not.toBeNull();
    return Number(m![1]);
  }

  it.each([
    [
      "Fraunces Fallback Android",
      ["Noto Serif", "Noto Serif Regular", "NotoSerif-Regular"],
      { "size-adjust": 108.6, "ascent-override": 90.06, "descent-override": 23.48, "line-gap-override": 0 },
    ],
    [
      "Inter Fallback Android",
      ["Roboto", "Roboto Regular", "Roboto-Regular"],
      { "size-adjust": 107.64, "ascent-override": 90.0, "descent-override": 22.41, "line-gap-override": 0 },
    ],
  ])("styles.css declares %s on %j with its own derived overrides", (family, locals, overrides) => {
    const face = fontFace(STYLES, family);
    expect(face, `@font-face for "${family}" must exist in styles.css`).not.toBeNull();
    expect(localNames(face!)).toEqual(locals);
    for (const [d, v] of Object.entries(overrides)) {
      expect(descriptor(face!, d), `${family} ${d}`).toBeCloseTo(v, 2);
    }
  });

  it("the Android faces are separate families: the Georgia / Arial faces keep their own src and values", () => {
    const fr = fontFace(STYLES, "Fraunces Fallback");
    const inter = fontFace(STYLES, "Inter Fallback");
    expect(fr).not.toBeNull();
    expect(inter).not.toBeNull();
    expect(localNames(fr!)).toEqual(["Georgia"]);
    expect(localNames(inter!)).toEqual(["Arial"]);
    expect(descriptor(fr!, "size-adjust")).toBeCloseTo(115.15, 2);
    expect(descriptor(inter!, "size-adjust")).toBeCloseTo(107.77, 2);
  });

  it.each([
    ["Welcome --serif", () => families(customProp(landingCss(), "--serif")), "Fraunces Fallback", "Fraunces Fallback Android", "Georgia"],
    ["Welcome --sans", () => families(customProp(landingCss(), "--sans")), "Inter Fallback", "Inter Fallback Android", "system-ui"],
    ["styles.css --font-display", () => families(customProp(STYLES, "--font-display")), "Fraunces Fallback", "Fraunces Fallback Android", "Georgia"],
  ])("%s: the Android face comes AFTER the Georgia/Arial face and BEFORE the system family", (_label, stack, first, android, system) => {
    const fams = stack();
    expect(fams).toContain(first);
    expect(fams).toContain(android);
    expect(fams).toContain(system);
    expect(fams.indexOf(android)).toBe(fams.indexOf(first) + 1);
    expect(fams.indexOf(android)).toBeLessThan(fams.indexOf(system));
  });

  it("control: fontFace() finds nothing for a family that is not declared", () => {
    expect(fontFace(STYLES, "Fraunces Fallback Nowhere")).toBeNull();
    expect(fontFace("@font-face{font-family:\"X\";src:local(\"Y\")}", "X")).not.toBeNull();
  });
});
