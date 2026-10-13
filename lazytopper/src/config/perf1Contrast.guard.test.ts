// PERF-1 F4 — the colour tokens Lighthouse flagged as under 4.5:1 now clear it.
//
// Each case reads the token OUT OF THE SOURCE FILE THAT DEFINES IT (so a later edit that lowers it
// goes red) and computes the WCAG ratio against the background it sits on. The old value of each is
// kept beside it as a CONTROL: it must fail the same check, so the check can fail.
// (jsdom has no layout/colour cascade, so this is arithmetic on the real tokens, not axe.)

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(SRC, rel), "utf8");

type RGB = [number, number, number];

function parse(color: string): RGB {
  const c = color.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as RGB;
  m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as RGB;
  const h = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(c);
  if (h) {
    const [hh, ss, ll] = [Number(h[1]), Number(h[2]) / 100, Number(h[3]) / 100];
    const k = (n: number) => (n + hh / 30) % 12;
    const a = ss * Math.min(ll, 1 - ll);
    const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as RGB;
  }
  throw new Error(`cannot parse colour: ${color}`);
}

function lum([r, g, b]: RGB): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function ratio(fg: string, bg: string): number {
  const [a, b] = [lum(parse(fg)), lum(parse(bg))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The value after `name:` (or `name =`) in a source text, first occurrence. */
function tokenIn(text: string, pattern: RegExp): string {
  const m = pattern.exec(text);
  if (!m) throw new Error(`token not found: ${pattern}`);
  return m[1].trim();
}

/** EVERY value captured by the pattern's first group (a first-match guard pins only one occurrence). */
function allIn(text: string, pattern: RegExp): string[] {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const out = [...text.matchAll(new RegExp(pattern.source, flags))].map((m) => m[1].trim());
  if (out.length === 0) throw new Error(`token not found: ${pattern}`);
  return out;
}

interface Case {
  name: string;
  fg: string;
  bg: string;
  old: string;
  /** The previous value already cleared 4.5:1 (nothing to fail), so there is no control for it. */
  alreadyAA?: boolean;
}

const NOTE = read("components/notes/Note.tsx");
const CYA = read("pages/checkYourAnswer.css");
const CBSE = read("pages/Cbse2027Page.tsx");
const TV = read("components/marketing/testimonialVideo.css");
const LOCKED = read("components/practice/StepsLockedNote.css");
const LEGAL = read("components/ux/PublicLegalFooter.tsx");
const STYLES = read("styles.css");
const PRACTICE = read("pages/desktop/DesktopPracticePage.tsx");
const HPQ = read("pages/HighlyProbableQuestions.tsx");

const accent = (key: string, field: string) =>
  tokenIn(PRACTICE, new RegExp(`${key}: [{][^}]*?${field}: "([^"]+)"`));
const tint = (key: string) => accent(key, "tint");

const CASES: Case[] = [
  { name: "note faint text", fg: tokenIn(NOTE, /--lt-note-ink-faint:\s*(#[0-9a-f]{6})/i), bg: "#f6f8fa", old: "#8b94a3" },
  { name: "cya muted text", fg: tokenIn(CYA, /--cya-ink3:\s*(#[0-9a-f]{6})/i), bg: "#f4f7fb", old: "#71879f" },
  { name: "cya green button (white text)", fg: "#ffffff", bg: tokenIn(CYA, /--cya-g:\s*(#[0-9a-f]{6})/i), old: "#0b8f50" },
  { name: "cbse muted text", fg: tokenIn(CBSE, /--ink3:\s*(#[0-9a-f]{6})/i), bg: "#f4f7fb", old: "#71879f" },
  { name: "cbse green (outline / marker colour; also AA as text)", fg: tokenIn(CBSE, /--g:\s*(#[0-9a-f]{6})/i), bg: "#f4f7fb", old: "#0b8f50" },
  { name: "testimonial summary", fg: tokenIn(TV, /--tv-g:\s*(#[0-9a-f]{6})/i), bg: "#f4f7fb", old: "#0b8f50" },
  { name: "locked-steps note", fg: tokenIn(LOCKED, /^\s*color:\s*(hsl\([^)]+\))/m), bg: "hsl(220, 20%, 97%)", old: "#7e8696" /* the rendered colour of 46% lightness at opacity 0.85, as axe measured it */ },
  { name: "public legal footer", fg: tokenIn(LEGAL, /\.lt-public-legal \{[^}]*?color:\s*(hsl\([^)]+\))/), bg: "#f4f7fb", old: "hsl(220, 12%, 52%)" },
  { name: "return-bar chip", fg: tokenIn(STYLES, /\.ux-return-bar__chip \{[^}]*?color:\s*(#[0-9a-f]{6})/i), bg: "#d0d6df", old: "#777777" },
  { name: "return-bar active chip", fg: "#ffffff", bg: tokenIn(STYLES, /\.ux-return-bar__chip\[data-active="true"\] \{[^}]*?background:\s*(#[0-9a-f]{6})/i), old: "#58cc02" },
  { name: "return-bar back button", fg: tokenIn(STYLES, /\.lt-hpq-page \.ux-return-bar__back \{[^}]*?color:\s*(#[0-9a-f]{6})/i), bg: "#ffffff", old: "#fefeff" },
  { name: "practice solid green button", fg: "#ffffff", bg: tokenIn(PRACTICE, /const PRIMARY_GREEN_DARK = "([^"]+)"/), old: "hsl(152, 55%, 45%)" },
  { name: "mode chip: quick", fg: accent("quick", "ink"), bg: tint("quick"), old: "hsl(152, 55%, 45%)" },
  { name: "mode chip: worksheet", fg: accent("worksheet", "ink"), bg: tint("worksheet"), old: "hsl(205, 70%, 52%)" },
  { name: "mode chip: hpq", fg: accent("hpq", "ink"), bg: tint("hpq"), old: "hsl(255, 50%, 58%)" },
  { name: "mode chip: full", fg: accent("full", "ink"), bg: tint("full"), old: "hsl(340, 62%, 56%)" },
  ...allIn(HPQ, /color: "(hsl\(35, 80%, \d+%\))"/).map((fg, i) => ({ name: `hpq competency chip #${i + 1}`, fg, bg: "hsl(43, 90%, 94%)", old: "hsl(35, 80%, 35%)" })),
  ...allIn(HPQ, /: "(hsl\(152, \d+%, \d+%\))",\n\s+color: answerCheckOpen/).map((bg, i) => ({ name: `hpq Check my answer button #${i + 1}`, fg: "#ffffff", bg, old: "hsl(152, 55%, 45%)" })),
  ...(["quick", "worksheet", "hpq", "full"] as const).map((k) => ({ name: `mode CTA / hint ink on white: ${k}`, fg: accent(k, "ink"), bg: "#ffffff", alreadyAA: k === "hpq", old: { quick: "hsl(152, 55%, 45%)", worksheet: "hsl(205, 70%, 52%)", hpq: "hsl(255, 50%, 58%)", full: "hsl(340, 62%, 56%)" }[k] })),
  { name: "Check & Improve link on white", fg: tokenIn(PRACTICE, /const PRIMARY_GREEN_DARK = "([^"]+)"/), bg: "#ffffff", old: "hsl(152, 55%, 45%)" },
  { name: "hpq active subject pill", fg: "#ffffff", bg: tokenIn(HPQ, /background: active \? "(hsl\(152, \d+%, \d+%\))" : "transparent"/), old: "hsl(152, 55%, 42%)" },
];

describe("PERF-1 F4 contrast tokens", () => {
  for (const c of CASES) {
    it(`${c.name}: at least 4.5:1`, () => {
      expect(ratio(c.fg, c.bg), `${c.fg} on ${c.bg}`).toBeGreaterThanOrEqual(4.5);
    });
    it(`CONTROL ${c.name}: the previous value fails the same check`, () => {
      if (c.alreadyAA) {
        // already AA before PERF-1: assert that fact instead of skipping, so the case still runs
        expect(ratio(c.old, c.bg)).toBeGreaterThanOrEqual(4.5);
        return;
      }
      const oldFg = c.fg === "#ffffff" ? "#ffffff" : c.old;
      const oldBg = c.fg === "#ffffff" ? c.old : c.bg;
      expect(ratio(oldFg, oldBg)).toBeLessThan(4.5);
    });
  }

  it("PR-3: no raw accent text is left in the Practice Hub cards, and the link is not the old green", () => {
    expect(PRACTICE).not.toMatch(/color: tone\.accent,\n\s+(background: tone\.tint|cursor)/);
    expect(PRACTICE).not.toContain("style={{ color: PRIMARY_GREEN, fontWeight: 600");
    expect(PRACTICE).toContain("color: tone.ink,");
  });

  it("PR-3: the locked-steps note is not dimmed below its own colour (opacity 1)", () => {
    expect(LOCKED).toMatch(/opacity:\s*1;/);
    expect(LOCKED).not.toMatch(/opacity:\s*0\.8/);
    // CONTROL: the detector sees the old dimming
    expect("opacity: 0.85;").toMatch(/opacity:\s*0\.8/);
  });

  it("the navbar's muted token is darkened inside the navbar only", () => {
    const m = /\[data-theme="light"\] \.navbar \{\s*--text-muted:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(STYLES);
    expect(m, "scoped override missing").not.toBeNull();
    const [r, g, b, a] = [Number(m![1]), Number(m![2]), Number(m![3]), Number(m![4])];
    const onWhite = [r, g, b].map((v) => Math.round(v * a + 255 * (1 - a))) as RGB;
    expect(ratio(`#${onWhite.map((v) => v.toString(16).padStart(2, "0")).join("")}`, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    // the global light-theme token (175 other uses) is untouched
    expect(STYLES).toContain("--text-muted: rgba(30,41,59,0.5);");
  });

  it("CONTROL: the arithmetic itself — black on white is 21:1, grey on itself is 1:1", () => {
    expect(ratio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(ratio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});
