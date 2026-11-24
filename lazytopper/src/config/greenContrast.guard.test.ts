/**
 * UI-FIX-2 guard: white text must never sit on a light green. The ui-e2e suite only reaches signed-out pages;
 * this scans every stylesheet / style object so signed-in screens (scorecards, sheets, banners) are covered too.
 *
 * Rule: in ONE `{ ... }` block (a CSS rule, a template-literal rule, or an inline style object) that has a
 * `background` / `background-color` containing an opaque green whose contrast against white is below 4.5:1 AND a
 * `color` of white (#fff, #ffffff, white, rgba(255,255,255,>=.85)), fail. Fix: use var(--lt-green-fill, #257e55)
 * (defined in styles.css; GREEN_FILL in components/grammar/tokens.ts). Intentional exceptions go in
 * greenContrast.allowlist.json with a reason.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import allowlist from "./greenContrast.allowlist.json";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const COLOUR =
  /hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*,\s*([\d.]+))?\s*\)|#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g;

type Rgb = [number, number, number];

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function parse(m: RegExpExecArray): { rgb: Rgb; alpha: number } {
  if (m[1] !== undefined) return { rgb: hslToRgb(Number(m[1]), Number(m[2]), Number(m[3])), alpha: m[4] ? Number(m[4]) : 1 };
  if (m[5]) {
    const h = m[5].length === 3 ? [...m[5]].map((c) => c + c).join("") : m[5];
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb, alpha: 1 };
  }
  return { rgb: [Number(m[6]), Number(m[7]), Number(m[8])], alpha: m[9] ? Number(m[9]) : 1 };
}

function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const contrastOnWhite = (rgb: Rgb): number => 1.05 / (luminance(rgb) + 0.05);

function isGreen([r, g, b]: Rgb): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return false;
  const d = (max - min) / 255;
  const l = (max + min) / 510;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === g) h = 60 * (2 + (b - r) / (max - min));
  else if (max === r) h = 60 * (((g - b) / (max - min) + 6) % 6);
  else h = 60 * (4 + (r - g) / (max - min));
  return h >= 130 && h <= 175 && s >= 0.3;
}

function isWhite(v: string): boolean {
  const t = v.trim().replace(/^["']|["']$/g, "").toLowerCase();
  if (t === "#fff" || t === "#ffffff" || t === "white") return true;
  const m = /^rgba\(255,\s*255,\s*255,\s*([\d.]+)\)$/.exec(t);
  return !!m && Number(m[1]) >= 0.85;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(css|ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

/** Every `file:line  literal (ratio)` where white text sits on a light green. Exported shape: plain strings. */
export function findViolations(): string[] {
  const allowed = new Set(allowlist.exceptions.map((e) => `${e.file}|${e.value}`));
  const found: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).split("\\").join("/");
    const src = readFileSync(file, "utf8");
    for (const block of src.matchAll(/\{[^{}]*\}/g)) {
      const text = block[0];
      if (!text.includes("background")) continue;
      let white = false;
      for (const c of text.matchAll(/(?<![-\w])color\s*:\s*([^;,}\n]+)/g)) if (isWhite(c[1])) white = true;
      if (!white) continue;
      for (const bg of text.matchAll(/background(?:-color)?\s*:\s*([^;}\n]*)/g)) {
        for (const m of bg[1].matchAll(COLOUR)) {
          const { rgb, alpha } = parse(m as RegExpExecArray);
          const ratio = contrastOnWhite(rgb);
          if (alpha < 0.9 || !isGreen(rgb) || ratio >= 4.5) continue;
          if (allowed.has(`${rel}|${m[0]}`)) continue;
          const line = src.slice(0, (block.index ?? 0) + (bg.index ?? 0)).split("\n").length;
          found.push(`${rel}:${line}  ${m[0]} (${ratio.toFixed(2)}:1 against white)`);
        }
      }
    }
  }
  return found;
}

describe("white text on light green (UI-FIX-2)", () => {
  it("no rule or style object puts white text on a green below 4.5:1", () => {
    expect(findViolations(), "use var(--lt-green-fill, #257e55) or add a reasoned entry to greenContrast.allowlist.json").toEqual([]);
  });

  it("every allowlist entry has a reason and still matches a real file", () => {
    for (const e of allowlist.exceptions) {
      expect(e.reason.length, e.file).toBeGreaterThan(20);
      expect(readFileSync(join(SRC, e.file), "utf8"), `${e.file} no longer contains ${e.value}`).toContain(e.value);
    }
  });

  it("the shared values reach the contrast they claim", () => {
    expect(contrastOnWhite([0x25, 0x7e, 0x55])).toBeGreaterThanOrEqual(5);
    expect(contrastOnWhite([0x22, 0x77, 0x4f])).toBeGreaterThanOrEqual(5.4);
  });
});
