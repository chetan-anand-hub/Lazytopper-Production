// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep, extname } from "node:path";

/**
 * GUARD — the never-owned domain `lazytopper.app` may not appear anywhere in the
 * shipped product tree.
 *
 * WHY THIS EXISTS
 * The product domain is `lazytopper.com`. `lazytopper.app` was NEVER OWNED and
 * does not resolve. It nonetheless sat in the single highest-leverage line in the
 * repo — `<link rel="canonical" href="https://lazytopper.app/">` — plus the
 * sitemap, robots.txt, llms.txt, both share-image URLs, and the share image's own
 * rendered text. Three independent instructions telling a search engine that the
 * authoritative copy of this site lives somewhere that does not exist.
 *
 * ★ THE PATTERN WAS ALREADY KNOWN AND ONLY HALF-FIXED. `LegalPage.repair.test.tsx`
 * has asserted "zero occurrences of the never-owned lazytopper.app domain" since
 * Lane C — but it reads ONE file, `src/pages/LegalPage.tsx`. One page was fixed
 * and pinned while the rest of the tree was never swept. A one-file assertion is
 * why the sweep decayed; this one walks the whole shipped tree so the next
 * occurrence cannot hide in a file nobody remembered to list.
 *
 * ★ THIS GUARD NAMES ITS SUBJECT, NOT JUST ITS VERDICT. A zero-hit scan of zero
 * files is indistinguishable from a clean tree, and that shape is the failure this
 * project keeps finding. The second test below asserts the corpus size and proves
 * the walk actually reaches each of the six files that carried the dead domain.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const INDEX_HTML = resolve(ROOT, "index.html");
const PUBLIC_ROOT = resolve(ROOT, "public");
const SRC_ROOT = resolve(ROOT, "src");

/**
 * Text extensions only. `public/` carries ~hundreds of .webp/.png binaries whose
 * bytes are not searchable text, and reading them would inflate the "files
 * scanned" number with files this guard cannot actually inspect — a subject count
 * that overstates its own coverage is worse than none.
 *
 * ⚠ The share IMAGE is the known blind spot: `public/og-image.svg` renders the
 * domain as literal text and IS scanned, but the exported `public/og-image.png`
 * is a bitmap. If the PNG was exported before the SVG was corrected it still has
 * the dead domain printed on it, and no text scan can see that. That is an owner
 * re-export, not something this guard can assert.
 */
const TEXT_EXT = new Set([
  ".html", ".htm", ".txt", ".xml", ".svg", ".json", ".md", ".webmanifest",
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css",
]);

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".vite"]);

/**
 * Exemptions, each with a reason. Every entry is a hole in the guard, so the list
 * is deliberately one line long.
 *
 *  - test files: a test that pins the ABSENCE of the domain must name the domain
 *    to do so. That is the assertion, not a regression. This exempts both this
 *    file and `src/pages/LegalPage.repair.test.tsx`.
 *
 * Deliberately NOT exempt: `src/data/**`. Question banks have no business quoting
 * a product domain at all, so there is no legitimate-content argument here of the
 * kind that justifies the pricing guard's exemption for rupee amounts in word
 * problems.
 */
function isExempt(relPath: string): boolean {
  const p = relPath.split(sep).join("/");
  return /\.test\.tsx?$/.test(p);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (TEXT_EXT.has(extname(entry).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/** Every shipped text file: index.html, all of public/, all of src/. */
function corpus(): string[] {
  const files: string[] = [];
  if (existsSync(INDEX_HTML)) files.push(INDEX_HTML);
  if (existsSync(PUBLIC_ROOT)) walk(PUBLIC_ROOT, files);
  if (existsSync(SRC_ROOT)) walk(SRC_ROOT, files);
  return files;
}

const rel = (abs: string) => relative(ROOT, abs).split(sep).join("/");

/** The never-owned domain. Case-insensitive: a URL host is not case-sensitive. */
const DEAD_DOMAIN = /lazytopper\.app/i;

function scanForDeadDomain(): Array<{ file: string; line: number; text: string }> {
  const hits: Array<{ file: string; line: number; text: string }> = [];
  for (const abs of corpus()) {
    const r = rel(abs);
    if (isExempt(r)) continue;
    const lines = readFileSync(abs, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (DEAD_DOMAIN.test(line)) {
        hits.push({ file: r, line: i + 1, text: line.trim().slice(0, 160) });
      }
    });
  }
  return hits;
}

describe("domain guard — the never-owned lazytopper.app appears nowhere in the shipped tree", () => {
  it("finds zero occurrences across index.html, public/ and src/", () => {
    const files = corpus();
    const hits = scanForDeadDomain();
    const rendered = hits.map(h => `  ${h.file}:${h.line}  ${h.text}`).join("\n");
    expect(
      hits,
      `the domain is lazytopper.com; lazytopper.app was NEVER OWNED and does not ` +
        `resolve. ${hits.length} occurrence(s) across ${files.length} scanned files:\n${rendered}`,
    ).toEqual([]);
  });

  it("names its subject — the walk really reaches every file that carried the dead domain", () => {
    const scanned = corpus().map(rel);

    // ★ A VERDICT WITHOUT A SUBJECT IS NOT EVIDENCE. "no occurrences found" reads
    // identically whether the scan covered 900 files or none, so the guard states
    // its corpus size on every run — green included.
    // eslint-disable-next-line no-console
    console.log(
      `DOMAIN_GUARD_SCOPE: root=${ROOT.split(sep).join("/")} scanned=${scanned.length} ` +
        `roots=index.html,public/,src/ exempt=*.test.ts(x) pattern=${DEAD_DOMAIN}`,
    );

    // A zero-hit scan of zero files passes vacuously. Pin the corpus size so the
    // guard cannot silently shrink to nothing, and prove the walk RECURSES by
    // naming a file several directories deep.
    expect(scanned.length).toBeGreaterThan(300);

    for (const mustReach of [
      // The six files that actually carried it, all of which the sweep fixed.
      "index.html",
      "public/robots.txt",
      "public/sitemap.xml",
      "public/llms.txt",
      "public/og-image.svg",
      // Proof the src/ walk recurses rather than reading the top level only.
      "src/config/pricing.ts",
      "src/pages/LegalPage.tsx",
    ]) {
      expect(scanned, `walk did not reach ${mustReach}`).toContain(mustReach);
    }
  });

  it("the matcher is not dead — it fires on the dead domain and ignores the real one", () => {
    // Without this, a typo'd pattern would sit green forever on a clean tree and
    // the guard would be indistinguishable from no guard at all.
    expect(DEAD_DOMAIN.test('<link rel="canonical" href="https://lazytopper.app/" />')).toBe(true);
    expect(DEAD_DOMAIN.test("- Home: https://LazyTopper.App/")).toBe(true);
    expect(DEAD_DOMAIN.test("Sitemap: https://lazytopper.app/sitemap.xml")).toBe(true);

    expect(DEAD_DOMAIN.test('<link rel="canonical" href="https://lazytopper.com/" />')).toBe(false);
    expect(DEAD_DOMAIN.test("support@lazytopper.com")).toBe(false);
  });

  it("asserts the canonical POSITIVELY, not merely the absence of the wrong one", () => {
    // Absence alone is satisfiable by deleting the canonical outright, which is a
    // different defect with the same test result. The canonical is the single
    // highest-leverage line in the repo: it tells every search engine which URL is
    // the authoritative copy of this page.
    const html = readFileSync(INDEX_HTML, "utf8");
    expect(html).toMatch(/<link\s+rel="canonical"\s+href="https:\/\/lazytopper\.com\/"\s*\/>/);

    // The share-image URLs must resolve too, or every WhatsApp / X card is blank.
    expect(html).toContain('property="og:image" content="https://lazytopper.com/og-image.png"');
    expect(html).toContain('name="twitter:image" content="https://lazytopper.com/og-image.png"');
  });
});
