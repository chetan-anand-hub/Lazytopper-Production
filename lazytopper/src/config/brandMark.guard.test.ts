// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep, extname } from "node:path";
import { BRAND_MARK_FILE } from "./brandMark";

/**
 * GUARD — LOGO-1: the fingerprint is the ONLY brand mark the site shows.
 *
 * WHY THIS EXISTS. Google Ads rejected the fingerprint ad logo for "Business Logo
 * Irrelevance" because lazytopper.com showed a DIFFERENT mark: a green "LT" favicon, a
 * gradient "LT" navbar tile, a graduation-cap tile in the desktop sidebar and mobile Home,
 * an "L" tile on sign-in and "LT" tiles on every worksheet / Check & Improve PDF. The owner
 * ruled (2026-10-19) "fingerprint is our logo" — everywhere.
 *
 * What is pinned:
 *   1. index.html and public/404.html link icons ONLY at the generated fingerprint files,
 *      and each linked file exists with the size its `sizes` attribute claims.
 *   2. No shipped source / public text file draws the old marks (the "LT" text tile, the
 *      graduation-cap paths, the green LT favicon SVG).
 *   3. Every brand-mark surface renders BRAND_MARK_SRC — named by file, so a deleted
 *      import cannot pass by silence.
 *
 * MUTATION (run when this lane landed): restoring
 * `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` in index.html turns
 * test 1 RED.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const PUBLIC_ROOT = resolve(ROOT, "public");
const SRC_ROOT = resolve(ROOT, "src");

/** The generated fingerprint icons (scripts/brand/generate_brand_icons.py) and their pixel size. */
const FINGERPRINT_ICONS: Record<string, number> = {
  "/favicon-16x16.png": 16,
  "/favicon-32x32.png": 32,
  "/favicon-48x48.png": 48,
  "/apple-touch-icon.png": 180,
};

function pngSize(abs: string): [number, number] {
  const b = readFileSync(abs);
  expect(b.subarray(1, 4).toString("ascii"), `${abs} is not a PNG`).toBe("PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

function iconLinks(html: string): Array<{ rel: string; href: string; sizes: string | null }> {
  const out: Array<{ rel: string; href: string; sizes: string | null }> = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /\brel="([^"]+)"/i.exec(tag)?.[1] ?? "";
    if (!/\b(icon|apple-touch-icon|mask-icon)\b/i.test(rel)) continue;
    out.push({
      rel,
      href: /\bhref="([^"]+)"/i.exec(tag)?.[1] ?? "",
      sizes: /\bsizes="([^"]+)"/i.exec(tag)?.[1] ?? null,
    });
  }
  return out;
}

describe("LOGO-1 — icon links point at the fingerprint", () => {
  for (const page of ["index.html", "public/404.html"]) {
    it(`${page}: every icon link is a generated fingerprint file that exists at its declared size`, () => {
      const links = iconLinks(readFileSync(resolve(ROOT, page), "utf8"));
      expect(links.length, `${page} has no icon link at all`).toBeGreaterThanOrEqual(2);
      expect(links.some((l) => /apple-touch-icon/i.test(l.rel)), `${page} has no apple-touch-icon`).toBe(true);
      for (const l of links) {
        expect(Object.keys(FINGERPRINT_ICONS), `${page} links an icon that is not a fingerprint file: ${l.href}`).toContain(l.href);
        const abs = join(PUBLIC_ROOT, l.href);
        expect(existsSync(abs), `${l.href} is linked but missing from public/`).toBe(true);
        const px = FINGERPRINT_ICONS[l.href];
        expect(pngSize(abs)).toEqual([px, px]);
        if (l.sizes) expect(l.sizes).toBe(`${px}x${px}`);
      }
    });
  }

  it("favicon.ico (requested by browsers without a link) exists and is an ICO", () => {
    const b = readFileSync(join(PUBLIC_ROOT, "favicon.ico"));
    expect(b.readUInt16LE(0)).toBe(0);
    expect(b.readUInt16LE(2)).toBe(1); // type 1 = icon
    expect(b.readUInt16LE(4)).toBe(3); // 16 + 32 + 48
  });

  it("the in-app brand tile exists as a square PNG", () => {
    expect(pngSize(join(PUBLIC_ROOT, BRAND_MARK_FILE))).toEqual([128, 128]);
  });
});

/** The old marks, as they were drawn. Each pattern is specific enough to have no innocent hit. */
const OLD_MARKS: Array<[string, RegExp]> = [
  ["the green LT favicon / og tile fill", /fill="#58cc02"[^>]*\/>\s*<text[^>]*>LT<\/text>/],
  ["an \"LT\" text tile", />\s*LT\s*<\/(?:div|span|text)>/],
  ["the desktop sidebar graduation cap", /M22 10v6M2 10l10-5 10 5-10 5z/],
  ["the mobile Home graduation cap", /M3 9l9-5 9 5-9 5-9-5z/],
  ["the sign-in \"L\" tile", /className="lt-login-mark"[^>]*>\s*L\s*</],
];

const TEXT_EXT = new Set([".ts", ".tsx", ".html", ".svg", ".css"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".vite", "data"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT_EXT.has(extname(entry).toLowerCase()) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("LOGO-1 — no shipped file draws the old mark", () => {
  const files = [resolve(ROOT, "index.html"), ...walk(SRC_ROOT), ...walk(PUBLIC_ROOT)];

  it("the scan reaches the files that used to carry the old mark (non-vacuous)", () => {
    const rels = new Set(files.map((f) => relative(ROOT, f).split(sep).join("/")));
    for (const f of [
      "index.html",
      "public/favicon.svg",
      "public/og-image.svg",
      "src/App.tsx",
      "src/components/desktop/DesktopShell.tsx",
      "src/pages/app/MobileHome.tsx",
      "src/pages/Login.tsx",
      "src/components/worksheet/WorksheetPrintDoc.tsx",
    ]) {
      expect(rels.has(f), `scan does not reach ${f}`).toBe(true);
    }
    expect(files.length).toBeGreaterThan(200);
  });

  it("zero hits for every old-mark pattern", () => {
    const hits: string[] = [];
    for (const abs of files) {
      const text = readFileSync(abs, "utf8");
      for (const [name, re] of OLD_MARKS) {
        if (re.test(text)) hits.push(`${relative(ROOT, abs)}: ${name}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("LOGO-1 — every brand-mark surface renders the fingerprint tile", () => {
  const SURFACES = [
    "src/App.tsx",
    "src/components/desktop/DesktopShell.tsx",
    "src/pages/app/MobileHome.tsx",
    "src/pages/Login.tsx",
    "src/components/worksheet/WorksheetPrintDoc.tsx",
    "src/components/worksheet/WorksheetGradedPrintDoc.tsx",
    "src/components/checkimprove/CheckImproveGradedPrintDoc.tsx",
  ];
  for (const f of SURFACES) {
    it(`${f} renders src={BRAND_MARK_SRC}`, () => {
      const text = readFileSync(resolve(ROOT, f), "utf8");
      expect(text).toMatch(/import \{ BRAND_MARK_SRC \} from "[./]+config\/brandMark";/);
      expect(text).toMatch(/src=\{BRAND_MARK_SRC\}/);
    });
  }
});
