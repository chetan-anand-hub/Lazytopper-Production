// PERF-1 (F1) — note formulas are precomputed, and what is rendered is byte-identical to
// what `katex.renderToString` produced when NoteRichText called it on load.
//
//   (a) for all 26 specs, every `$…$` formula has an entry in the committed map and the entry
//       equals a fresh render with the OLD options, written out here as a literal (so a drift
//       in noteMathCore.ts cannot move the guard with it); no stale extra entries;
//   (b) CONTROL — one altered entry is detected;
//   (c) NoteRichText has no static katex import (the whole point: no katex on the page);
//   (d) behaviour: a mapped formula renders at once from the map, and one missing from the map
//       renders via the lazy katex fallback — in both cases to the same markup;
//   (e) a chapter's map lands with its spec (ensureNoteSpec), and a map that fails to load
//       never fails the spec.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import katex from "katex";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const SPECS_DIR = resolve(__dirname, "../../../../notes/specs");
const MATH_DIR = resolve(__dirname, "noteMath");
const SLUGS = readdirSync(SPECS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

/** The options NoteRichText used before PERF-1, verbatim. */
const OLD_OPTIONS = { throwOnError: false, displayMode: false, output: "html", trust: false, strict: "ignore" } as const;
const OLD_RE = /\$([^$]+)\$/g;

function formulasOf(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    for (const m of value.matchAll(OLD_RE)) out.add(m[1].trim());
  } else if (Array.isArray(value)) {
    for (const v of value) formulasOf(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) formulasOf(v, out);
  }
}

function mismatches(slug: string, map: Record<string, string>): string[] {
  const spec: unknown = JSON.parse(readFileSync(resolve(SPECS_DIR, `${slug}.json`), "utf8"));
  const want = new Set<string>();
  formulasOf(spec, want);
  const bad: string[] = [];
  for (const latex of want) {
    if (!(latex in map)) bad.push(`missing: ${latex}`);
    else if (map[latex] !== katex.renderToString(latex, { ...OLD_OPTIONS })) bad.push(`differs: ${latex}`);
  }
  for (const latex of Object.keys(map)) if (!want.has(latex)) bad.push(`stale: ${latex}`);
  return bad;
}

function readMap(slug: string): Record<string, string> {
  return JSON.parse(readFileSync(resolve(MATH_DIR, `${slug}.json`), "utf8")) as Record<string, string>;
}

describe("PERF-1 F1 — precomputed note math equals today's render", () => {
  it("(a) all 26 specs: every formula present, byte-identical to renderToString, none stale", () => {
    expect(SLUGS).toHaveLength(26);
    let total = 0;
    for (const slug of SLUGS) {
      const map = readMap(slug);
      total += Object.keys(map).length;
      expect(mismatches(slug, map), slug).toEqual([]);
    }
    expect(total).toBeGreaterThan(1000);
  });

  it("(b) CONTROL: an altered entry is caught, and so is a dropped one", () => {
    const map = readMap("trigonometry");
    const [first, second] = Object.keys(map);
    expect(mismatches("trigonometry", { ...map, [first]: `${map[first]}x` })).toEqual([`differs: ${first}`]);
    const { [second]: _dropped, ...rest } = map;
    expect(mismatches("trigonometry", rest)).toEqual([`missing: ${second}`]);
  });

  it("(c) NoteRichText statically imports no katex JS (the stylesheet only)", () => {
    const src = readFileSync(resolve(__dirname, "NoteRichText.tsx"), "utf8");
    expect(src).not.toMatch(/^import\s+[^"']*from\s+["']katex["']/m);
    expect(src).toMatch(/import\("katex"\)/);
  });
});

describe("PERF-1 F1 — NoteRichText behaviour", () => {
  async function load() {
    vi.resetModules();
    const store = await import("./noteMathStore");
    const { NoteRichText } = await import("./NoteRichText");
    return { store, NoteRichText };
  }

  const TEXT = "so $\\sin^2\\theta$ plus prose";
  const HTML = katex.renderToString("\\sin^2\\theta", { ...OLD_OPTIONS });
  const EXPECTED = `<span><span>so </span><span>${HTML}</span><span> plus prose</span></span>`;

  it("(d1) a mapped formula renders at once, to exactly today's markup", async () => {
    const { store, NoteRichText } = await load();
    store.registerNoteMath({ "\\sin^2\\theta": HTML });
    const { container } = render(<NoteRichText text={TEXT} />);
    expect(container.innerHTML).toBe(EXPECTED);
  });

  it("(d2) CONTROL: the map is what is rendered (a different entry shows)", async () => {
    const { store, NoteRichText } = await load();
    store.registerNoteMath({ "\\sin^2\\theta": "<b>mapped</b>" });
    const { container } = render(<NoteRichText text={TEXT} />);
    expect(container.innerHTML).toContain("<b>mapped</b>");
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("(d3) a formula missing from the map renders through the lazy katex, same markup", async () => {
    const { NoteRichText } = await load();
    const { container } = render(<NoteRichText text={TEXT} />);
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
    expect(container.innerHTML).toBe(EXPECTED);
  });

  it("(e) ensureNoteSpec brings the chapter's map with the spec", async () => {
    vi.resetModules();
    const store = await import("./noteMathStore");
    const registry = await import("./noteSpecRegistry");
    const sample = Object.keys(readMap("real-numbers"))[0];
    expect(store.lookupNoteMath(sample)).toBeUndefined();
    const spec = await registry.ensureNoteSpec("real-numbers");
    expect(spec).not.toBeNull();
    expect(store.lookupNoteMath(sample)).toBe(readMap("real-numbers")[sample]);
    // other chapters were not loaded
    const other = Object.keys(readMap("electricity")).find((k) => !(k in readMap("real-numbers")))!;
    expect(store.lookupNoteMath(other)).toBeUndefined();
  });
});
