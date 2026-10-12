// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { sitemapPaths } from "./sitemapUrls";
import { ncertFileCode } from "../../scripts/seo/writeStaticHeads";

/**
 * GUARD — SEO-LLM-1: what AI tools, link previews and NCERT-code searchers read about
 * LazyTopper matches the product (owner ruling 12 Oct 2026: "Important Questions";
 * DECISION 116 on #973).
 *
 *   1. `public/llms.txt` and the shell's three description tags in `index.html`
 *      (`description`, `og:description`, `twitter:description`) never say "predicted",
 *      "high-probability" or "highly probable". (The URL path `/highly-probable/` is an
 *      address, not copy: it has a hyphen and is not matched.)
 *   2. every notes page whose NCERT file code resolves carries, in its PRERENDERED HTML
 *      (what a crawler receives, both variants), a link to
 *      `https://ncert.nic.in/textbook/pdf/<code>.pdf` whose code EQUALS the code in the
 *      page's own <title> and in its meta description. Never another host.
 *
 * ⚠ Part 2 reads `prerendered/**`, which is REGENERATED FROM THE CI prerender-capture
 * artifact, never by hand — so it is RED on a branch until that artifact lands. That is
 * by design: it measures the shipped HTML, not the source (same as
 * `notesInbound.prerendered.test.ts`).
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const OLD_WORDING = /predicted|high[- ]probability|highly probable/i;

const llms = readFileSync(resolve(ROOT, "public", "llms.txt"), "utf8");
const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf8");

/** The `content` of every shell description tag (name=description, og:, twitter:). */
function shellDescriptions(html: string): Array<{ tag: string; content: string }> {
  const out: Array<{ tag: string; content: string }> = [];
  const re = /<meta\s+(?:name|property)="((?:og:|twitter:)?description)"\s+content="([^"]*)"/gi;
  for (const m of html.matchAll(re)) out.push({ tag: m[1], content: m[2] });
  return out;
}

describe("SEO-LLM-1 — llms.txt and the shell descriptions use the Important Questions wording", () => {
  it("names its subject on every run, green included", () => {
    const tags = shellDescriptions(indexHtml).map((d) => d.tag);
    // eslint-disable-next-line no-console
    console.log(`LLM_SURFACES_SCOPE: llmsLines=${llms.split("\n").length} shellTags=${tags.join(",")}`);
    expect(tags.sort()).toEqual(["description", "og:description", "twitter:description"]);
  });

  it("llms.txt has no predicted / high-probability / highly probable wording", () => {
    const hits = llms.split("\n").filter((l) => OLD_WORDING.test(l));
    expect(hits, `old wording in llms.txt: ${hits.join(" | ")}`).toEqual([]);
  });

  it("llms.txt says Important Questions, and still makes no claim about the 2027 paper", () => {
    expect(llms).toContain("Important Questions");
    expect(llms).toContain("does not claim to know the questions of any upcoming exam");
  });

  it("every shell description (description, og:, twitter:) is free of the old wording", () => {
    for (const { tag, content } of shellDescriptions(indexHtml)) {
      expect(content, `index.html ${tag}: ${content}`).not.toMatch(OLD_WORDING);
    }
  });

  it("CONTROL — the matcher does catch each old phrase", () => {
    for (const bad of ["predicted questions", "High-probability questions", "highly probable"]) {
      expect(OLD_WORDING.test(bad), bad).toBe(true);
    }
    expect(OLD_WORDING.test("https://www.lazytopper.com/highly-probable/10/Maths")).toBe(false);
  });
});

const CODE_IN_TITLE = /<title>[^<]*\((j(?:emh|esc)1\d{2})\)/;
const CODE_IN_DESC = /<meta\s+name="description"\s+content="[^"]*\((j(?:emh|esc)1\d{2})\)/;
const NCERT_HREFS = /href="(https:\/\/ncert\.nic\.in\/textbook\/pdf\/(j(?:emh|esc)1\d{2})\.pdf)"/g;

/** Problems with one prerendered notes page; empty when it is right. */
function ncertLinkProblems(html: string, expectedCode: string): string[] {
  const problems: string[] = [];
  const titleCode = CODE_IN_TITLE.exec(html)?.[1];
  const descCode = CODE_IN_DESC.exec(html)?.[1];
  const hrefs = [...html.matchAll(NCERT_HREFS)].map((m) => m[2]);
  if (titleCode !== expectedCode) problems.push(`title code ${titleCode} != ${expectedCode}`);
  if (descCode !== expectedCode) problems.push(`description code ${descCode} != ${expectedCode}`);
  if (hrefs.length !== 1) problems.push(`${hrefs.length} ncert.nic.in PDF links (want exactly 1)`);
  else if (hrefs[0] !== expectedCode) problems.push(`link code ${hrefs[0]} != ${expectedCode}`);
  const linkTag = new RegExp(`<a [^>]*href="https://ncert\.nic\.in/textbook/pdf/${expectedCode}\.pdf"[^>]*>`).exec(html)?.[0] ?? "";
  if (!/target="_blank"/.test(linkTag) || !/rel="noopener"/.test(linkTag)) problems.push("link lacks target=_blank rel=noopener");
  if (!html.includes(`Official NCERT chapter PDF (${expectedCode}) — ncert.nic.in`)) problems.push("link text missing");
  return problems;
}

const notes = sitemapPaths().filter((p) => p.startsWith("/notes/"));

describe("SEO-LLM-1 — every notes page offers the official NCERT chapter PDF, in the prerendered HTML", () => {
  it("names its subject on every run, green included", () => {
    // eslint-disable-next-line no-console
    console.log(`NCERT_LINK_SCOPE: notes=${notes.length} variants=mobile,__desktop`);
    expect(notes.length).toBe(26);
  });

  for (const variant of ["", "__desktop"] as const) {
    it.each(notes.map((p) => [p]))(`${variant || "mobile"} %s: link code = title code = description code`, (path) => {
      const slug = path.slice("/notes/".length);
      const file = join(ROOT, "prerendered", variant, "notes", `${slug}.html`);
      expect(existsSync(file), `${file} is missing`).toBe(true);
      const code = ncertFileCode(slug); // the resolver; a chapter with no code would throw here
      expect(ncertLinkProblems(readFileSync(file, "utf8"), code), file).toEqual([]);
    });
  }

  it("CONTROL — a link pointing at another chapter's code is caught", () => {
    const good = [
      "<title>NCERT Ch. 11 (jemh111) · Areas — x</title>",
      '<meta name="description" content="NCERT Ch. 11 (jemh111) · Areas — x" />',
      '<a href="https://ncert.nic.in/textbook/pdf/jemh111.pdf" target="_blank" rel="noopener">Official NCERT chapter PDF (jemh111) — ncert.nic.in</a>',
    ].join("\n");
    expect(ncertLinkProblems(good, "jemh111")).toEqual([]);
    const wrong = good.replace('pdf/jemh111.pdf"', 'pdf/jemh110.pdf"').replace("(jemh111)</a>", "(jemh110)</a>");
    expect(ncertLinkProblems(wrong, "jemh111").length).toBeGreaterThan(0);
    expect(ncertLinkProblems(good.replace("ncert.nic.in/textbook", "example.com/textbook"), "jemh111").length).toBeGreaterThan(0);
  });
});
