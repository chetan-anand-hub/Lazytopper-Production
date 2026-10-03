/**
 * FRICTION-FIX-1 · F2 (FU-BASIC-LIST-DARK-THEME) — the Basic list card takes the theme
 * tokens, and is readable (WCAG AA, >= 4.5:1 for its body text) in BOTH themes.
 *
 * The ratios are COMPUTED from the token values in src/styles.css (`:root` = dark,
 * `[data-theme="light"]` = light), not restated, so a token change that breaks contrast
 * turns this red. `--bg-card` is translucent in the dark theme; it is composited over the
 * page `--bg`, which is what the student actually sees behind the card.
 *
 * Mutation this file turns RED: put the fixed light palette back (hsl(...) colours).
 */
import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup } from "@testing-library/react";
import { BasicFreeList } from "./BasicFreeList";

const STYLES = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function block(selector: string): string {
  const at = STYLES.indexOf(`${selector} {`);
  expect(at, `${selector} block found in styles.css`).toBeGreaterThan(-1);
  return STYLES.slice(at, STYLES.indexOf("}", at));
}
function token(css: string, name: string): string {
  const m = new RegExp(`${name}:\s*([^;]+);`).exec(css);
  expect(m, `${name} declared`).not.toBeNull();
  return m![1].trim();
}

type RGBA = [number, number, number, number];
function parse(c: string): RGBA {
  const hex = /^#([0-9a-f]{6})$/i.exec(c);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (rgba) {
    const [r, g, b, a = "1"] = rgba[1].split(",").map((s) => s.trim());
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  throw new Error(`unparsed colour ${c}`);
}
function over(top: RGBA, under: RGBA): RGBA {
  const a = top[3];
  return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1) as RGBA;
}
function lum([r, g, b]: RGBA): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg: RGBA, bg: RGBA): number {
  const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const DARK = block(":root");
const LIGHT = block('[data-theme="light"]');

function ratios(theme: string) {
  const page = parse(token(theme, "--bg"));
  const card = over(parse(token(theme, "--bg-card")), page);
  return {
    text: contrast(parse(token(theme, "--text")), card),
    tick: contrast(parse(token(theme, "--color-light-green")), card),
  };
}

afterEach(() => cleanup());

describe("F2 — the Basic list card uses the theme tokens", () => {
  it("its stylesheet reads --bg-card / --bg-card-border / --text / --color-light-green, no fixed hsl palette", () => {
    const { container } = render(<BasicFreeList />);
    const css = container.querySelector("style")!.textContent || "";
    const card = css.slice(css.indexOf(".lt-basic-free {"), css.indexOf("}", css.indexOf(".lt-basic-free {")));
    expect(card).toMatch(/background:\s*var\(--bg-card\)/);
    expect(card).toMatch(/border:\s*1px solid var\(--bg-card-border\)/);
    expect(card).toMatch(/color:\s*var\(--text\)/);
    expect(css).toMatch(/\.lt-basic-free__tick\s*\{[^}]*color:\s*var\(--color-light-green\)/);
    expect(css).not.toMatch(/hsl\(/);
  });

  it("★ AA in the DARK theme (:root): body text >= 4.5:1, tick >= 3:1", () => {
    const r = ratios(DARK);
    console.info(`AA dark: text ${r.text.toFixed(2)}:1, tick ${r.tick.toFixed(2)}:1`);
    expect(r.text).toBeGreaterThanOrEqual(4.5);
    expect(r.tick).toBeGreaterThanOrEqual(3);
  });

  it("★ AA in the LIGHT theme ([data-theme=light]): body text >= 4.5:1, tick >= 3:1", () => {
    const r = ratios(LIGHT);
    console.info(`AA light: text ${r.text.toFixed(2)}:1, tick ${r.tick.toFixed(2)}:1`);
    expect(r.text).toBeGreaterThanOrEqual(4.5);
    expect(r.tick).toBeGreaterThanOrEqual(3);
  });

  it("CONTROL — the OLD fixed card (#1a1d29-ish text on a pale card) fails AA on the dark page it sat in", () => {
    // The old card text hsl(220,25%,12%) ≈ rgb(23,28,38); the dark theme's body text is #fff.
    // A dark-theme page around the old pale card painted white text next to it, and the old
    // card's own near-black text could never follow the theme. Prove the ratio function can
    // fail: near-black text on the dark page is far below AA.
    expect(contrast([23, 28, 38, 1], parse(token(DARK, "--bg")))).toBeLessThan(4.5);
  });
});
