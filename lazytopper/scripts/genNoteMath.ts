/**
 * genNoteMath — emits the precomputed formula maps for the note specs (PERF-1 F1) and the
 * note figures' pixel sizes (PERF-1 F3).
 *
 * Reads notes/specs/<slug>.json (26 specs), finds every `$…$` formula in any string field,
 * renders each ONCE with katex.renderToString and the options notes have always used
 * (NOTE_KATEX_OPTIONS), and writes src/components/notes/noteMath/<slug>.json as { latex: html }
 * with sorted keys, so a re-run is byte-stable. The spec JSON is never edited.
 *
 * It also reads the width/height of every notes/assets/**\/*.webp (from the WebP header, no image
 * library) into src/components/notes/noteFigureSizes.generated.json, so a note figure's <img>
 * can carry width/height and reserve its space before the file arrives.
 *
 * REGENERATE WITH (from `lazytopper/`), after any change to a spec's formulas:
 *
 *     pnpm run gen:note-math            (writes)
 *     pnpm run gen:note-math -- --check (exit 1 if any file would change)
 *
 * Tooling only: not imported by the app, never ships.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";

import { NOTE_KATEX_OPTIONS, noteLatexOf } from "../src/components/notes/noteMathCore";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SPECS_DIR = resolve(HERE, "../../notes/specs");
export const MATH_DIR = resolve(HERE, "../src/components/notes/noteMath");

/** Every string value anywhere in a parsed spec. */
function strings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
}

/** The { latex: html } map for one spec's parsed JSON, keys sorted. */
export function mathMapOf(spec: unknown): Record<string, string> {
  const texts: string[] = [];
  strings(spec, texts);
  const keys = new Set<string>();
  for (const text of texts) for (const key of noteLatexOf(text)) keys.add(key);
  const map: Record<string, string> = {};
  for (const key of [...keys].sort()) {
    map[key] = katex.renderToString(key, { ...NOTE_KATEX_OPTIONS });
  }
  return map;
}

export const ASSETS_DIR = resolve(HERE, "../../notes/assets");
export const FIGURE_SIZES_FILE = resolve(HERE, "../src/components/notes/noteFigureSizes.generated.json");

/** [width, height] of a WebP file, read from its RIFF header (VP8, VP8L or VP8X). */
export function webpSize(buf: Buffer): [number, number] {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("not a WebP file");
  }
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  if (kind === "VP8X") return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  throw new Error(`unknown WebP chunk ${kind}`);
}

/** { "<topic>/<fig>.webp": [w, h] } for every webp under notes/assets, sorted. */
export function renderFigureSizes(): string {
  const sizes: Record<string, [number, number]> = {};
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else if (entry.name.endsWith(".webp")) {
        sizes[`${prefix}${entry.name}`] = webpSize(readFileSync(join(dir, entry.name)));
      }
    }
  };
  walk(ASSETS_DIR, "");
  const sorted = Object.fromEntries(Object.entries(sizes).sort(([a], [b]) => (a < b ? -1 : 1)));
  return `${JSON.stringify(sorted)}
`;
}

export function specSlugs(): string[] {
  return readdirSync(SPECS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function renderMathFile(slug: string): string {
  const spec: unknown = JSON.parse(readFileSync(join(SPECS_DIR, `${slug}.json`), "utf8"));
  return `${JSON.stringify(mathMapOf(spec))}\n`;
}

function main(): void {
  const check = process.argv.includes("--check");
  if (!existsSync(MATH_DIR)) mkdirSync(MATH_DIR, { recursive: true });
  const stale: string[] = [];
  for (const slug of specSlugs()) {
    const file = join(MATH_DIR, `${slug}.json`);
    const next = renderMathFile(slug);
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (current === next) continue;
    stale.push(slug);
    if (!check) writeFileSync(file, next);
  }
  const sizesNext = renderFigureSizes();
  const sizesNow = existsSync(FIGURE_SIZES_FILE) ? readFileSync(FIGURE_SIZES_FILE, "utf8") : null;
  if (sizesNow !== sizesNext) {
    stale.push("noteFigureSizes");
    if (!check) writeFileSync(FIGURE_SIZES_FILE, sizesNext);
  }
  if (check && stale.length > 0) {
    console.error(`note math maps out of date: ${stale.join(", ")} — run pnpm run gen:note-math`);
    process.exit(1);
  }
  console.log(check ? "note math maps up to date" : `wrote ${stale.length} note math maps`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
