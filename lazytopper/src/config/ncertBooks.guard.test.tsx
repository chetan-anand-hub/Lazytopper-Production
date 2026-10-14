import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import NcertBooksPage from "../pages/NcertBooksPage";
import {
  NCERT_CLASS10_CHAPTERS,
  ncertCode,
  ncertOfficialUrl,
  ncertPracticePath,
} from "./ncertBooks";
import { SELF_CANONICAL_EXACT } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { allDesktopTopics } from "../lib/desktop/topics";
import { ncertFileCodeFromSpec } from "../lib/ncertFileCode";
import { STATIC_PAGE_HEADS, ROUTE_CHUNK_MODULES } from "../../scripts/seo/writeStaticHeads";

/**
 * NCERT-BOOKS-1 (lane G; D210 / D211 / D213) — `/ncert-class-10`.
 *
 *   (a) registered everywhere a public page must be: self-canonical, sitemap, llms.txt, the
 *       Vercel rewrite, the route-module preload map, a static head within the limits;
 *   (b) the data is the 2026-27 NCERT list: Maths 14 + Science 13 = 27 rows, numbered 1..N,
 *       every official link `https://ncert.nic.in/textbook/pdf/<code>.pdf`, every notes slug a
 *       real note whose own NCERT code agrees with the row (Maths Ch 9 shares Ch 8's note), no
 *       deleted chapter;
 *   (c) the rendered page (and the committed prerender, once captured) carries all 27 rows, each
 *       with the reader action, Notes, Practice, Check my answer and the credit line; no
 *       "solutions" text, no "coming soon"/placeholder, no PDF or iframe on load, no forbidden copy;
 *   (d) a row whose copy is not stored offers the official file directly.
 *
 * Every detector takes its input as an argument and is run against SYNTHETIC violating input in
 * the CONTROL tests, so a typo'd regex cannot sit green on a correct tree.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

function renderedPage(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/ncert-class-10"]}>
      <NcertBooksPage />
    </MemoryRouter>,
  );
}

const FORBIDDEN: ReadonlyArray<[string, RegExp]> = [
  ["solutions", /solution/i],
  ["coming soon", /coming soon/i],
  ["placeholder", /placeholder|lorem|TODO/i],
  ["predicted", /predicted/i],
  ["guaranteed", /guarantee/i],
  ["leaked", /leak/i],
  ["a price (rupee sign)", /₹/],
  ["a price (Rs / INR)", /\b(?:Rs\.?|INR)\s?\d/i],
];
function copyProblems(text: string): string[] {
  return FORBIDDEN.filter(([, re]) => re.test(text)).map(([name]) => name);
}

function loadProblems(html: string): string[] {
  const out: string[] = [];
  if (/<iframe/i.test(html)) out.push("an iframe");
  if (/firebasestorage\.googleapis\.com/i.test(html)) out.push("a Storage URL in the HTML");
  if (/<(?:embed|object)\b/i.test(html)) out.push("an embed/object");
  return out;
}

/** Chapters NCERT removed from the Class 10 books for 2026-27 (never listed). */
const DELETED_CHAPTERS = [/sources of energy/i, /management of natural resources/i, /periodic classification/i];
function deletedChapterProblems(titles: readonly string[]): string[] {
  return titles.filter((t) => DELETED_CHAPTERS.some((re) => re.test(t)));
}

const rows = NCERT_CLASS10_CHAPTERS;

describe("NCERT-BOOKS-1 (a) — /ncert-class-10 is registered everywhere a public page must be", () => {
  it("is self-canonical and advertised in the sitemap set", () => {
    expect(SELF_CANONICAL_EXACT).toContain("/ncert-class-10");
    expect(sitemapPaths()).toContain("/ncert-class-10");
  });

  it("is in llms.txt and in the Vercel rewrites (an unlisted sibling path stays a real 404)", () => {
    expect(read("public/llms.txt")).toContain("- [NCERT Class 10 books](https://www.lazytopper.com/ncert-class-10):");
    const sources = JSON.parse(readFileSync(resolve(ROOT, "..", "vercel.json"), "utf8")).rewrites.map(
      (r: { source: string }) => r.source,
    );
    expect(sources).toContain("/:path(ncert-class-10/?)");
    expect(sources.some((s: string) => s.includes("ncert-class-10/[^/]+"))).toBe(false);
  });

  it("has a route-module preload entry and a static head within the limits", () => {
    expect(
      ROUTE_CHUNK_MODULES.some((e) => e.prefix === "/ncert-class-10" && e.exact && e.modules.includes("NcertBooksPage")),
    ).toBe(true);
    const head = STATIC_PAGE_HEADS["/ncert-class-10"];
    expect(head, "no static head for /ncert-class-10").toBeDefined();
    expect(head.title.length, head.title).toBeLessThanOrEqual(60);
    expect(head.title).toMatch(/NCERT Class 10/);
    expect(head.description.length, head.description).toBeLessThanOrEqual(155);
    expect(copyProblems(head.title + " " + head.description)).toEqual([]);
  });
});

describe("NCERT-BOOKS-1 (b) — the 2026-27 NCERT chapter list", () => {
  it("is Maths 14 + Science 13 = 27 rows, each book numbered 1..N without gaps", () => {
    expect(rows.length).toBe(27);
    for (const [book, n] of [["Maths", 14], ["Science", 13]] as const) {
      expect(rows.filter((r) => r.book === book).map((r) => r.chapter)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
    expect(new Set(rows.map(ncertCode)).size).toBe(27);
  });

  it("every official link is https://ncert.nic.in/textbook/pdf/<code>.pdf", () => {
    for (const r of rows) {
      expect(ncertOfficialUrl(r)).toBe(`https://ncert.nic.in/textbook/pdf/${ncertCode(r)}.pdf`);
      expect(ncertCode(r)).toMatch(/^je(?:mh|sc)1(?:0[1-9]|1[0-4])$/);
    }
  });

  it("every notes slug is a real note, and the note's own NCERT code agrees with the row", () => {
    const slugs = new Set(allDesktopTopics().map((t) => t.slug));
    for (const r of rows) {
      expect(slugs.has(r.slug), `no topic ${r.slug}`).toBe(true);
      const file = resolve(ROOT, "..", "notes", "specs", `${r.slug}.json`);
      expect(existsSync(file), `no note spec ${r.slug}`).toBe(true);
      const code = ncertFileCodeFromSpec(JSON.parse(readFileSync(file, "utf8")), r.slug);
      const expected = r.book === "Maths" && r.chapter === 9 ? "jemh108" : ncertCode(r);
      expect(code, `${ncertCode(r)} → /notes/${r.slug}`).toBe(expected);
    }
    // Maths Ch 8 and Ch 9 are two rows sharing the one trigonometry note (D213 §2).
    expect(rows.filter((r) => r.slug === "trigonometry").map((r) => r.chapter)).toEqual([8, 9]);
  });

  it("no chapter deleted from the 2026-27 books appears", () => {
    expect(deletedChapterProblems(rows.map((r) => r.title))).toEqual([]);
  });

  it("the practice link is the notes page's practice route, returning here", () => {
    for (const r of rows) {
      expect(ncertPracticePath(r).startsWith(`/practice/10/${r.book}?topic=${r.slug}&returnTo=`)).toBe(true);
    }
  });
});

describe("NCERT-BOOKS-1 (c) — the page carries all 27 rows with honest links", () => {
  const html = renderedPage();

  it("the H1 is the page's words", () => {
    expect(html).toContain("<h1>NCERT Class 10 Maths and Science Books, Chapter-wise</h1>");
  });

  it("all 27 rows render, each with the reader action, Notes, Practice, Check my answer and the credit line", () => {
    for (const r of rows) {
      const code = ncertCode(r);
      const start = html.indexOf(`data-testid="nb-row-${code}"`);
      expect(start, `row ${code} missing`).toBeGreaterThan(-1);
      const end = html.indexOf("</li>", start);
      const row = html.slice(start, end);
      expect(row).toContain(`data-testid="nb-read-${code}"`);
      expect(row).toContain("Read the chapter");
      expect(row).toContain(`href="/notes/${r.slug}"`);
      expect(row).toContain(">Practice<");
      expect(row).toContain('href="/check-improve"');
      expect(row).toContain(`(${code}) · official copy`);
      expect(row).toContain(`href="${ncertOfficialUrl(r)}"`);
    }
  });

  it("no solutions text, no placeholder, no forbidden copy, and nothing PDF-shaped loads with the page", () => {
    const text = html.replace(/<[^>]+>/g, " ");
    expect(copyProblems(text)).toEqual([]);
    expect(loadProblems(html)).toEqual([]);
  });

  it("the committed prerender (once captured) carries all 27 rows too", () => {
    const pre = resolve(ROOT, "prerendered", "ncert-class-10.html");
    if (!existsSync(pre)) return; // captured in the same PR; asserted below when present
    const body = readFileSync(pre, "utf8");
    for (const r of rows) expect(body, ncertCode(r)).toContain(`data-testid="nb-row-${ncertCode(r)}"`);
    expect(loadProblems(body)).toEqual([]);
  });
});

describe("NCERT-BOOKS-1 (d) — a row without a stored current copy opens the official file", () => {
  const html = renderedPage();
  it("Maths Ch 9 (not in Storage) is a plain link to ncert.nic.in; stored rows are buttons", () => {
    for (const r of rows) {
      const code = ncertCode(r);
      const m = new RegExp(`<(a|button)\\b[^>]*data-testid="nb-read-${code}"`).exec(html);
      expect(m, code).not.toBeNull();
      if (r.stored) expect(m![1], code).toBe("button");
      else {
        expect(m![1], code).toBe("a");
        expect(m![0]).toContain(`href="${ncertOfficialUrl(r)}"`);
      }
    }
    expect(rows.find((r) => r.book === "Maths" && r.chapter === 9)?.stored).toBe(false);
  });
});

describe("CONTROLS — every detector fires on synthetic violating input", () => {
  it("copyProblems", () => {
    expect(copyProblems("NCERT solutions, coming soon, ₹599, predicted")).toEqual([
      "solutions",
      "coming soon",
      "predicted",
      "a price (rupee sign)",
    ]);
  });
  it("loadProblems", () => {
    expect(
      loadProblems('<iframe src="https://firebasestorage.googleapis.com/x"></iframe><embed src="a.pdf">'),
    ).toEqual(["an iframe", "a Storage URL in the HTML", "an embed/object"]);
  });
  it("deletedChapterProblems", () => {
    expect(deletedChapterProblems(["Sources of Energy", "Electricity"])).toEqual(["Sources of Energy"]);
  });
});
