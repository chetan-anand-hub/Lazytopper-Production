/**
 * G4 · SCORECARD-MI-1 — ONE display module.
 *
 * `lib/mistakeDisplay.ts` is the ONLY place a stored mistake type (conceptual | calculation |
 * silly | presentation) is mapped to a group, a label, a heading, a colour key or a sort order.
 * This guard scans every shipped source file under src/ (tests and the module itself excluded,
 * comments stripped) and FAILS on any other hard-coded grouping or legacy label:
 *
 *   G-SET   a set / array literal naming two or three of the four types (a grouping);
 *   G-SUM   an expression adding two or three of the four type fields (a grouped count);
 *   G-EQ    an equality chain over two or three of the type names (a grouping predicate);
 *   G-MAP   a type key mapped to a Capitalised display label (a second name per type);
 *   LEGACY  a retired label or heading ("Careless mark-loss", "calculation slips", …).
 *
 * Summing ALL FOUR (a total) is not a grouping and is allowed.
 *
 * THE ONLY EXCEPTIONS (controller ruling A4): lines a CI gate pins byte-identical until the
 * owner rules — each tagged HELD-OWNER-GATE-RULING and named with the gate that holds it. An
 * exception whose line no longer exists FAILS this guard, so the list cannot outlive its cause.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = ["conceptual", "calculation", "silly", "presentation"] as const;
const TYPE_ALT = TYPES.join("|");

export interface Violation {
  file: string;
  rule: string;
  line: string;
}

/** Strip block comments, JSX comments and `//` line comments (not `//` inside a string URL). */
export function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ""))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

const LEGACY_LABELS: ReadonlyArray<[RegExp, string]> = [
  [/Careless mark-loss/, "Careless mark-loss"],
  [/Knowledge gaps — worth practising/, "Knowledge gaps — worth practising"],
  [/Where your marks went/, "Where your marks went"],
  [/Careless slip\b/, "Careless slip"],
  [/calculation slips/, "calculation slips"],
  [/["'`]silly mistakes["'`]/, "silly mistakes"],
  [/Knowledge gap ×|Careless ×/, "Knowledge gap × / Careless ×"],
  [/One-mark answers are marked/, "One-mark answers are marked…"],
  [/Clean (work|sheet)/, "Clean work / Clean sheet"],
];

/** Scan ONE file's text. Pure, so it can be proven to REJECT on fixtures, not only to accept. */
export function scanSource(file: string, raw: string): Violation[] {
  const out: Violation[] = [];
  const code = stripComments(raw);
  const lines = code.split(/\r?\n/);
  const distinct = (s: string, re: RegExp) => new Set(Array.from(s.matchAll(re), (m) => m[1])).size;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // G-SET — a literal list naming 2 or 3 of the four type names.
    for (const m of t.matchAll(/\[([^[\]]{0,240})\]/g)) {
      const n = distinct(m[1], new RegExp(`["'\`](${TYPE_ALT})["'\`]`, "g"));
      if (n >= 2 && n <= 3) out.push({ file, rule: "G-SET", line: t });
    }
    // G-SUM — two or three type FIELDS added together.
    if (/\+/.test(t)) {
      const n = distinct(t, new RegExp(`\\.(${TYPE_ALT})\\b`, "g"));
      const added = new RegExp(`\\.(?:${TYPE_ALT})\\b[^;\\n]*\\+[^;\\n]*\\.(?:${TYPE_ALT})\\b`).test(t);
      if (added && n >= 2 && n <= 3) out.push({ file, rule: "G-SUM", line: t });
    }
    // G-EQ — an equality chain over 2 or 3 type names.
    {
      const n = distinct(t, new RegExp(`===?\\s*["'\`](${TYPE_ALT})["'\`]`, "g"));
      if (n >= 2 && n <= 3 && /\|\||&&/.test(t)) out.push({ file, rule: "G-EQ", line: t });
    }
    // G-MAP — a type key mapped to a Capitalised display string (a second name per type).
    if (new RegExp(`\\b(${TYPE_ALT})\\s*:\\s*(\\{\\s*label\\s*:\\s*)?["'\`][A-Z][A-Za-z ]+["'\`]`).test(t)) {
      out.push({ file, rule: "G-MAP", line: t });
    }
    for (const [re, name] of LEGACY_LABELS) {
      if (re.test(t)) out.push({ file, rule: `LEGACY:${name}`, line: t });
    }
  }
  // G-MAP, OBJECT FORM (W2) — `{ key: "<type>", …, label: "Display" }`: a stored type given its
  // own display name inside an object literal, keys in either order, even split across lines.
  // Scanned over the whole comment-stripped file, so a line break cannot hide it; reported on
  // the line that holds the display string.
  const keyRe = new RegExp(`\\b(?:key|type|mistakeType)\\s*:\\s*["'\`](${TYPE_ALT})["'\`]`);
  const labelRe = /\b(?:label|name|title)\s*:\s*["'`]([A-Z][^"'`\n]*)["'`]/;
  for (const m of code.matchAll(/\{[^{}]*\}/g)) {
    const body = m[0];
    if (!keyRe.test(body)) continue;
    const lab = labelRe.exec(body);
    if (!lab) continue;
    const at = (m.index ?? 0) + (lab.index ?? 0);
    const lineNo = code.slice(0, at).split(/\r?\n/).length - 1;
    out.push({ file, rule: "G-MAP", line: (lines[lineNo] ?? "").trim() });
  }
  return out;
}

/**
 * HELD-OWNER-GATE-RULING — the ONLY exceptions (controller ruling A4). Exact trimmed lines.
 *
 * EMPTY since SCORECARD-MI-1 PR-2: the owner approved the gate amendments (2026-10-05 —
 * "taxonomy and wording, marks not counts, re-grade replaces"), and every line this list held
 * was rewritten through lib/mistakeDisplay — the DIC old two-bucket grouping (H2), the sidebar
 * MistakeIntelCard labels (H3) and the tutor round-trip method / presentation-led grouping
 * (H6). The test below fails if an exception is ever added back without its own owner ruling.
 */
const HELD: ReadonlyArray<{ file: string; line: string; tag: "HELD-OWNER-GATE-RULING"; gate: string }> = [];

function shippedSources(dir: string, rel = ""): Array<{ file: string; source: string }> {
  const out: Array<{ file: string; source: string }> = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    if (statSync(abs).isDirectory()) {
      if (name === "test" || name === "__fixtures__" || name === "node_modules") continue;
      out.push(...shippedSources(abs, r));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) {
      if (r === "lib/mistakeDisplay.ts") continue;
      out.push({ file: r, source: readFileSync(abs, "utf8") });
    }
  }
  return out;
}

const isHeld = (v: Violation) => HELD.some((h) => h.file === v.file && h.line === v.line);

describe("G4 · one display module — no other hard-coded grouping or legacy label under src/", () => {
  const files = shippedSources(SRC);

  it("scans a real tree (liveness: hundreds of files, including the surfaces it protects)", () => {
    expect(files.length).toBeGreaterThan(300);
    for (const must of ["components/results/ResultsScorecard.tsx", "pages/MeProgressPage.tsx", "pages/desktop/DesktopCheckImprovePage.tsx"]) {
      expect(files.some((f) => f.file === must)).toBe(true);
    }
  });

  it("finds NO grouping or legacy label outside lib/mistakeDisplay.ts (HELD lines excepted, by name)", () => {
    const violations = files.flatMap((f) => scanSource(f.file, f.source)).filter((v) => !isHeld(v));
    expect(violations.map((v) => `${v.file} [${v.rule}] ${v.line}`)).toEqual([]);
  });

  it("NO exception remains (SCORECARD-MI-1 PR-2 — every HELD line was lifted by owner ruling)", () => {
    expect(HELD).toEqual([]);
  });

  it("every HELD exception still points at a real line (a stale exception fails), and only HELD lines are excepted", () => {
    for (const h of HELD) {
      expect(h.tag).toBe("HELD-OWNER-GATE-RULING");
      const f = files.find((x) => x.file === h.file);
      expect(f, `${h.file} is missing — remove its HELD exception`).toBeDefined();
      const hit = scanSource(h.file, f!.source).some((v) => v.line === h.line);
      expect(hit, `HELD line no longer present or no longer a violation — remove it: ${h.file}: ${h.line}`).toBe(true);
    }
  });

  it("the scanner REJECTS, not merely accepts (fixtures)", () => {
    const rejected = (src: string) => scanSource("fixture.ts", src).map((v) => v.rule);
    expect(rejected('const CARELESS = new Set(["silly", "presentation"]);')).toContain("G-SET");
    expect(rejected("const k = ms.conceptual + ms.calculation;")).toContain("G-SUM");
    expect(rejected('if (t === "conceptual" || t === "calculation") bridge();')).toContain("G-EQ");
    expect(rejected('const L = { silly: "Silly", x: 1 };')).toContain("G-MAP");
    // W2 — the OBJECT form, on one line and split across lines (DesktopHome / MobileHome shape).
    expect(rejected('const B = [{ key: "silly", bg: "hsl(0, 75%, 96%)", label: "Silly mistake" }];')).toContain("G-MAP");
    expect(rejected('const B = [{\n  key: "conceptual",\n  fg: "#123",\n  label: "Conceptual",\n}];')).toContain("G-MAP");
    expect(rejected('const B = [{ label: "Calc", key: "calculation" }];')).toContain("G-MAP");
    expect(rejected("<div>Careless mark-loss — not a weakness</div>")).toContain("LEGACY:Careless mark-loss");
    expect(rejected('const t = "Where your marks went";')).toContain("LEGACY:Where your marks went");
    // CONTROLS — a total of all four, a comment, and the module's own vocabulary are allowed.
    expect(rejected("const total = c.conceptual + c.calculation + c.silly + c.presentation;")).toEqual([]);
    expect(rejected("// silly and presentation were careless (pre-ruling)\nconst x = 1;")).toEqual([]);
    expect(rejected("const label = mistakeTypeLabel(type);")).toEqual([]);
    // CONTROLS (W2) — the module's own label, and a non-type key, are allowed.
    expect(rejected('const B = [{ key: "silly", label: MISTAKE_TYPE_LABEL.silly }];')).toEqual([]);
    expect(rejected('const T = [{ key: "maths", label: "Maths" }];')).toEqual([]);
  });
});
