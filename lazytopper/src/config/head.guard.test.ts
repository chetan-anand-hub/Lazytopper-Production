// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * GUARD — the four head facts that HEAD-1 corrected, and that nothing else pins.
 *
 * ⚠ READ THIS BEFORE ADDING AN ASSERTION HERE.
 * `src/config/domain.guard.test.ts` is the OTHER guard over `index.html`, and it
 * already covers two things this file deliberately does NOT repeat:
 *
 *   1. THE CANONICAL. It asserts `<link rel="canonical">` exactly, plus its host
 *      (`www.lazytopper.com`) and its path prefix (`/app/`), at :202-213.
 *   2. THE DESCRIPTION LENGTH. It caps `<meta name="description">` at 155
 *      RENDERED characters, DECODING HTML ENTITIES FIRST (:339-357). That decode
 *      is the whole point: `&amp;` is five characters of source and one rendered
 *      character, so a naive `.length` over-counts this description by four. A
 *      second, weaker copy here would be strictly worse than none — it would
 *      drift, and the next editor would not know which one is authoritative.
 *
 * It also PINS `og:image` / `twitter:image` on the APEX host, deliberately, per
 * #612: a redirecting IMAGE costs one hop and the bytes still arrive, which is a
 * different class of problem from a redirecting DIRECTIVE. Moving those is
 * `[FU-OG-IMAGE-WWW-HOST]`, not this file's business.
 *
 * ★ THE DISTINCTION THIS FILE RESTS ON. `og:url` is a DIRECTIVE, like the
 * canonical — not a fetched asset. That is why it is asserted here to be on
 * `www` and byte-identical to the canonical, while `og:image` stays on the apex.
 * That is not an inconsistency between the two guards; it is #612's own rule
 * applied to both kinds of URL.
 *
 * WHAT THIS FILE ASSERTS — only what nothing currently covers:
 *   - exactly one `og:url`, byte-identical to the canonical
 *   - exactly one `ld+json` block, and it parses
 *   - `<html lang="en-IN">`
 *   - NO `<meta name="keywords">`
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const INDEX_HTML = resolve(ROOT, "index.html");

/* ------------------------------------------------------------------------- *
 * EXTRACTORS — pure functions over an HTML string.
 *
 * ★ THEY TAKE THE HTML AS AN ARGUMENT ON PURPOSE. A detector that can only be
 * pointed at the real file can never be shown to fire, so a typo'd regex sits
 * green forever on a correct tree and reports nothing on a broken one. Every
 * extractor below is exercised against SYNTHETIC violating input in the control
 * test at the bottom, which is the only way to tell "passed" from "never ran".
 * ------------------------------------------------------------------------- */

/** Every `og:url` meta tag's content, in document order. */
export function ogUrls(html: string): string[] {
  return [...html.matchAll(/<meta\s+property="og:url"\s+content="([^"]*)"/gi)].map((m) => m[1]);
}

/** The `<link rel="canonical">` href, or null. */
export function canonicalHref(html: string): string | null {
  return html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? null;
}

/** The raw body of every `<script type="application/ld+json">` block. */
export function ldJsonBlocks(html: string): string[] {
  return [
    ...html.matchAll(
      /<script[^>]*\stype="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1]);
}

/** The `lang` attribute on `<html>`, or null. */
export function htmlLang(html: string): string | null {
  return html.match(/<html\b[^>]*\slang="([^"]*)"/i)?.[1] ?? null;
}

/**
 * True when a `keywords` meta tag is present in EITHER form.
 *
 * ⚠ Deliberately matched on the attribute alone rather than on a
 * `<meta ... name="keywords" ...>` shape: this file writes multi-line meta tags
 * (`<meta\n  name="keywords"\n  content="..."\n/>`), and a single-line-only
 * pattern would have missed the very tag this lane deleted.
 */
export function hasKeywordsMeta(html: string): boolean {
  return /\bname="keywords"/i.test(html);
}

const html = readFileSync(INDEX_HTML, "utf8");

describe("head guard — the four facts nothing else pins", () => {
  it("names its subject on every run, green included", () => {
    // A guard whose corpus silently became empty passes everything below it.
    // Print the subject so a zero-length read is visible in the log.
    // eslint-disable-next-line no-console
    console.log(
      `HEAD_GUARD_SCOPE: file=index.html bytes=${html.length} ` +
        `og:url=${ogUrls(html).length} ld+json=${ldJsonBlocks(html).length} ` +
        `lang=${JSON.stringify(htmlLang(html))} keywords=${hasKeywordsMeta(html)} ` +
        `sibling_guard=src/config/domain.guard.test.ts`,
    );
    expect(html.length, "index.html read as empty — every assertion below would be vacuous")
      .toBeGreaterThan(500);
    expect(html, "index.html does not look like the document head").toContain("</head>");
  });

  it("has exactly one og:url, and it is byte-identical to the canonical", () => {
    const urls = ogUrls(html);
    expect(
      urls.length,
      `expected exactly one <meta property="og:url">, found ${urls.length}: ` +
        `${JSON.stringify(urls)}. Two og:url tags let a scraper pick either one.`,
    ).toBe(1);

    const canonical = canonicalHref(html);
    expect(canonical, "no <link rel=canonical> in index.html").not.toBeNull();

    // BYTE-identical, not merely equivalent. `og:url` and the canonical are both
    // directives naming the authoritative copy of this page; a trailing-slash or
    // host difference between them is two different answers to one question.
    expect(
      urls[0],
      `og:url is ${JSON.stringify(urls[0])} but the canonical is ` +
        `${JSON.stringify(canonical)}. They must be the same string exactly.`,
    ).toBe(canonical as string);
  });

  it("emits exactly one ld+json block, and it parses", () => {
    const blocks = ldJsonBlocks(html);
    expect(
      blocks.length,
      `expected exactly one <script type="application/ld+json">, found ` +
        `${blocks.length}. Google merges multiple blocks, but a second one is ` +
        `how two disagreeing descriptions of the same entity get shipped.`,
    ).toBe(1);

    // ★ A BLOCK THAT DOES NOT PARSE IS SILENTLY DISCARDED BY EVERY CONSUMER, and
    // nothing in the build ever looks inside a <script> tag. Invalid JSON here is
    // therefore invisible until GSC reports "no enhancements" weeks later.
    expect(
      () => JSON.parse(blocks[0]),
      `the ld+json block is not valid JSON:\n${blocks[0]}`,
    ).not.toThrow();
    const parsed = JSON.parse(blocks[0]) as unknown;
    expect(parsed, "the ld+json block parsed to a non-object").toBeTypeOf("object");
    expect(parsed, "the ld+json block parsed to null").not.toBeNull();
  });

  it('declares <html lang="en-IN">', () => {
    // The audience is Indian CBSE students; `en` alone leaves the regional
    // variant unstated on a document that is entirely India-specific.
    expect(
      htmlLang(html),
      `<html lang> is ${JSON.stringify(htmlLang(html))}, expected "en-IN"`,
    ).toBe("en-IN");
  });

  it('carries no <meta name="keywords">', () => {
    // Ignored by Google since 2009 and read by nothing else this site cares
    // about. It is pure drift surface: a stale term list nobody re-reads.
    expect(
      hasKeywordsMeta(html),
      'index.html carries a <meta name="keywords"> again. It has been ignored by ' +
        "Google since 2009; delete it rather than update it.",
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------------- *
 * ★★ THE CONTROL — every extractor above is proven to FIRE.
 *
 * This is the load-bearing test of the file. Each assertion above reads "the
 * violation is absent". If its extractor were broken, "absent" would be the
 * answer on a BROKEN tree too, and the guard would be a silent no-op. These
 * cases feed each extractor synthetic input that DOES violate, and assert it is
 * detected — which is what separates a passing guard from one that never ran.
 * ------------------------------------------------------------------------- */
describe("head guard — the detectors are not dead", () => {
  it("ogUrls() finds zero, one and two occurrences", () => {
    expect(ogUrls("<head></head>")).toEqual([]);
    expect(ogUrls('<meta property="og:url" content="https://a/" />')).toEqual(["https://a/"]);
    expect(
      ogUrls(
        '<meta property="og:url" content="https://a/" />\n' +
          '<meta property="og:url" content="https://b/" />',
      ),
    ).toEqual(["https://a/", "https://b/"]);
    // And it does not confuse a different og property for og:url.
    expect(ogUrls('<meta property="og:image" content="https://a/x.png" />')).toEqual([]);
  });

  it("canonicalHref() reads the href, and reports its absence", () => {
    expect(canonicalHref('<link rel="canonical" href="https://www.x.com/app/" />')).toBe(
      "https://www.x.com/app/",
    );
    expect(canonicalHref("<head></head>")).toBeNull();
  });

  it("ldJsonBlocks() counts blocks and returns their bodies verbatim", () => {
    expect(ldJsonBlocks("<head></head>")).toEqual([]);
    const one = '<script type="application/ld+json">{"a":1}</' + "script>";
    expect(ldJsonBlocks(one)).toEqual(['{"a":1}']);
    expect(ldJsonBlocks(one + one)).toHaveLength(2);
    // A body spanning newlines is captured whole, not truncated at the first one.
    const multi = '<script type="application/ld+json">\n  {\n "a": 1\n }\n</' + "script>";
    expect(ldJsonBlocks(multi)[0]).toContain('"a": 1');
    // An ordinary module script is not mistaken for structured data.
    expect(ldJsonBlocks('<script type="module" src="/x.js"></' + "script>")).toEqual([]);
    // ★ And the parse step really rejects bad JSON — otherwise the assertion
    // above would pass on any string at all.
    expect(() => JSON.parse(ldJsonBlocks('<script type="application/ld+json">{ not json }</' + "script>")[0])).toThrow();
  });

  it("htmlLang() distinguishes en from en-IN, and reports absence", () => {
    expect(htmlLang('<html lang="en">')).toBe("en");
    expect(htmlLang('<html lang="en-IN">')).toBe("en-IN");
    expect(htmlLang("<html>")).toBeNull();
  });

  it("hasKeywordsMeta() catches BOTH the single-line and multi-line forms", () => {
    // The multi-line form is the one that actually shipped in this file. A
    // single-line-only pattern would return false here and the guard would pass
    // while the tag sat in the document.
    expect(hasKeywordsMeta('<meta\n      name="keywords"\n      content="a, b"\n    />')).toBe(
      true,
    );
    expect(hasKeywordsMeta('<meta name="keywords" content="a, b" />')).toBe(true);
    expect(hasKeywordsMeta('<meta name="description" content="a, b" />')).toBe(false);
    expect(hasKeywordsMeta("<head></head>")).toBe(false);
  });
});
