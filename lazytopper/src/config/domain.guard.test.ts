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
    //
    // ★ META-3: the pinned value moved from `https://lazytopper.com/` to
    // `https://www.lazytopper.com/app/`. BOTH halves were wrong, and both were
    // measured live rather than reasoned about (2026-08-05, curl -L -o /dev/null):
    //
    //     https://lazytopper.com/        -> 200 after 2 redirects, landing on
    //                                       https://www.lazytopper.com/app/
    //     https://www.lazytopper.com/    -> 200 after 1 redirect  (-> /app/)
    //     https://www.lazytopper.com/app/ -> 200, ZERO redirects
    //
    // A canonical is a DIRECTIVE, not a fetch: naming a URL that 308s tells every
    // search engine the authoritative copy lives at an address that then says "no,
    // over there". The `www` half is the apex-to-www redirect the CDN performs; the
    // `/app/` half is where Vite's `base: "/app/"` actually puts the document.
    //
    // ⚠ NOTHING BELOW WAS RELAXED. The `lazytopper.app` sweep above is untouched,
    // and `lazytopper.com/app/` does not contain the literal `lazytopper.app` — the
    // assertion at the top of this file still fails on the never-owned domain.
    const html = readFileSync(INDEX_HTML, "utf8");
    expect(html).toMatch(
      /<link\s+rel="canonical"\s+href="https:\/\/www\.lazytopper\.com\/app\/"\s*\/>/,
    );

    // ★ AND THE TWO FORMS THAT WERE WRONG ARE PINNED OUT BY NAME. An exact-match
    // assertion alone is satisfiable by an edit that also breaks it in a NEW way;
    // these two say specifically "not the redirecting host, not the root path",
    // which is the pair of mistakes this file has now actually seen.
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    expect(canonical, "no <link rel=canonical> in index.html").toBeTruthy();
    expect(
      new URL(canonical as string).hostname,
      "the canonical must name the host the CDN serves. The apex 308s to www, so an " +
        "apex canonical names a URL that redirects.",
    ).toBe("www.lazytopper.com");
    expect(
      new URL(canonical as string).pathname.startsWith("/app/"),
      `the app is served under /app/ (vite base). Canonical path was ` +
        `"${new URL(canonical as string).pathname}", which 30x-es before it resolves.`,
    ).toBe(true);

    // The share-image URLs must resolve too, or every WhatsApp / X card is blank.
    // ★ MOVED TO www BY OG-1, SUPERSEDING #612's apex form. #612's reasoning was
    // sound at the time — a redirecting IMAGE costs a hop and the bytes still arrive,
    // unlike a redirecting DIRECTIVE. What changed: these URLs are about to be
    // distributed at volume, and not every scraper follows a redirect on an image
    // fetch. Removing the hop is cheap insurance, so the pin now expects www and
    // [FU-OG-IMAGE-WWW-HOST] is CLOSED. A future apex form is a regression, not a
    // deliberate choice, and this assertion is what will say so.
    expect(html).toContain('property="og:image" content="https://www.lazytopper.com/app/og-image.png"');
    expect(html).toContain('name="twitter:image" content="https://www.lazytopper.com/app/og-image.png"');
  });
});

/* ------------------------------------------------------------------------- *
 * GUARD — the SERP length caps on <title> and <meta name="description">.
 *
 * WHY THIS EXISTS
 * The caps were written down in prose and nothing checked them, so the copy
 * that shipped alongside them broke both: the title measured 61 against a
 * stated <=60, and the description 175 against a stated <=155. A character
 * count asserted in a sentence is a derived value with no test behind it —
 * which is precisely how a limit and the copy that violates it end up in the
 * same document. These two assertions turn the next over-length edit into a
 * red test instead of a description Google silently cuts mid-sentence.
 *
 * ★ ENTITIES ARE DECODED BEFORE COUNTING. `&amp;` is FIVE characters of HTML
 * source and ONE rendered character. Counting the raw source would overstate
 * this description by 4 and the guard would be measuring the wrong string —
 * a test that lies about its subject is worse than no test.
 *
 * ★ og:* and twitter:* are DELIBERATELY NOT CAPPED HERE. They are not SERP
 * fields, have no Google truncation limit, and do a different job — one is
 * scanned in a results list, the other is a card in a WhatsApp group.
 * ------------------------------------------------------------------------- */

/** Google truncates a title past roughly this width. */
const TITLE_MAX = 60;
/** Google cuts a description past roughly this width, mid-sentence. */
const DESCRIPTION_MAX = 155;

const NAMED_ENTITIES: Record<string, string> = {
  lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

/**
 * Decode HTML entities to the text a search engine actually renders and counts.
 * ⚠ `&amp;` is decoded LAST and deliberately skipped in the named pass: decoding
 * it first would turn the source `&amp;lt;` into `<` instead of the correct
 * `&lt;`, silently under-counting by 3.
 */
function decodeEntities(raw: string): string {
  const once = raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m: string, name: string) =>
      name === "amp" ? m : (NAMED_ENTITIES[name] ?? m));
  return once.replace(/&amp;/g, "&");
}

/** Rendered length in CODE POINTS — an em-dash is one character, not three bytes. */
function renderedLength(raw: string): number {
  return [...decodeEntities(raw)].length;
}

/**
 * Both extractors span newlines on purpose: `index.html` wraps its `<meta>`
 * elements across several lines, and `[^>]` matches a newline while it cannot
 * cross out of the tag it started in.
 */
function extractTitle(html: string): string | null {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractDescription(html: string): string | null {
  // `name="description"` is exact — it does not match `name="twitter:description"`
  // (different attribute value) nor `property="og:description"` (different attribute).
  const m = html.match(/<meta\s[^>]*name="description"[^>]*content="([^"]*)"/i);
  return m ? m[1].trim() : null;
}

describe("index.html SERP length caps — the counts are pinned, not asserted in prose", () => {
  const html = readFileSync(INDEX_HTML, "utf8");

  it("the decoder is not dead — an entity counts as the ONE character it renders as", () => {
    // Without this, a broken decoder would count `&amp;` as 5, the description
    // would measure long, and someone would "fix" it by cutting real words.
    expect(renderedLength("a&amp;b")).toBe(3);
    expect(decodeEntities("Maths &amp; Science")).toBe("Maths & Science");
    // The order trap: &amp; must be decoded LAST, or this yields "<" (1 char).
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
    // An em-dash is one code point, not one-per-byte.
    expect(renderedLength("a—b")).toBe(3);
    // And the extractors must actually find something, or every cap below
    // would pass vacuously on a reformatted file.
    expect(extractTitle(html), "no <title> found in index.html").not.toBeNull();
    expect(extractDescription(html), "no <meta name=\"description\"> found in index.html").not.toBeNull();
  });

  it(`<title> is at most ${TITLE_MAX} rendered characters`, () => {
    const raw = extractTitle(html);
    expect(raw, "no <title> element in index.html").not.toBeNull();
    const n = renderedLength(raw as string);

    // ★ NAME THE SUBJECT, NOT JUST THE VERDICT. "passed" reads identically
    // whether it measured the real title or an empty capture group.
    // eslint-disable-next-line no-console
    console.log(
      `SERP_LENGTH_GUARD: field=title rendered=${n} cap=${TITLE_MAX} ` +
        `raw=${(raw as string).length} value=${JSON.stringify(raw)}`,
    );

    // A floor as well as a ceiling: an empty or gutted title also satisfies "<=60".
    expect(n, "title is empty or near-empty — a cap alone does not prove a title exists")
      .toBeGreaterThan(20);
    expect(
      n,
      `<title> is ${n} rendered characters, over the ${TITLE_MAX}-character cap — ` +
        `Google truncates it. Value: ${JSON.stringify(raw)}`,
    ).toBeLessThanOrEqual(TITLE_MAX);
  });

  it(`<meta name="description"> is at most ${DESCRIPTION_MAX} rendered characters`, () => {
    const raw = extractDescription(html);
    expect(raw, 'no <meta name="description"> in index.html').not.toBeNull();
    const n = renderedLength(raw as string);

    // eslint-disable-next-line no-console
    console.log(
      `SERP_LENGTH_GUARD: field=description rendered=${n} cap=${DESCRIPTION_MAX} ` +
        `raw=${(raw as string).length} entities_decoded=yes value=${JSON.stringify(decodeEntities(raw as string))}`,
    );

    expect(n, "description is empty or near-empty — a cap alone does not prove one exists")
      .toBeGreaterThan(60);
    expect(
      n,
      `<meta name="description"> is ${n} rendered characters, over the ` +
        `${DESCRIPTION_MAX}-character cap — Google cuts it mid-sentence. ` +
        `Rendered value: ${JSON.stringify(decodeEntities(raw as string))}`,
    ).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});
