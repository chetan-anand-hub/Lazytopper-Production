import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import NcertBooksPage, { ncertSubjectFrom } from "../pages/NcertBooksPage";
import {
  NCERT_CLASS10_CHAPTERS,
  ncertCode,
  ncertOfficialUrl,
  ncertPracticePath,
} from "./ncertBooks";
import { SELF_CANONICAL_EXACT, canonicalPathFor } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { solutionsPaths } from "./solutionsPublishSafe";
import { solutionsHrefForRow } from "../pages/NcertBooksPage";
import { allDesktopTopics } from "../lib/desktop/topics";
import { ncertPickerChapters, ncertReadPath, NCERT_SCIENCE_BRANCHES } from "../components/ncert/NcertChapterPicker";
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

function renderedPage(entry = "/ncert-class-10"): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
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

/** SOLUTIONS-1 — drop only the row links to a PUBLISHED solutions page; every other "solution" stays. */
function withoutPublishedSolutionsLinks(html: string): string {
  const published = new Set(solutionsPaths());
  return html.replace(/<a\b([^>]*)>Solutions<\/a>/g, (whole, attrs: string) => {
    const href = /\bhref="([^"]+)"/.exec(attrs)?.[1];
    const isRowLink = /\bdata-testid="nb-solutions-[a-z0-9]+"/.test(attrs);
    return isRowLink && href && published.has(href) ? "" : whole;
  });
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
    // SOLUTIONS-1 narrows the "solutions" rule to ONE allowed shape: a row's `nb-solutions-*` link
    // to a PUBLISHED solutions page. Anything else saying "solution" stays a failure.
    const text = withoutPublishedSolutionsLinks(html).replace(/<[^>]+>/g, " ");
    expect(copyProblems(text)).toEqual([]);
    expect(loadProblems(html)).toEqual([]);
  });

  it("SOLUTIONS-1/2 — exactly the rows with a published solutions page link it", () => {
    const linked = [...html.matchAll(/data-testid="nb-solutions-([a-z0-9]+)"/g)].map((m) => m[1]);
    const published = rows.filter((r) => solutionsHrefForRow(r) !== null).map(ncertCode);
    expect(linked).toEqual(published);
    expect(published).toContain("jemh106");
    expect(published.every((c) => c.startsWith("jemh"))).toBe(true); // Maths only
    const link = /<a\b[^>]*data-testid="nb-solutions-jemh106"[^>]*>Solutions<\/a>/.exec(html)?.[0] ?? "";
    expect(link).toContain('href="/ncert-solutions/triangles"');
  });

  it("the committed prerender (once captured) carries all 27 rows too", () => {
    const pre = resolve(ROOT, "prerendered", "ncert-class-10.html");
    if (!existsSync(pre)) return; // captured in the same PR; asserted below when present
    const body = readFileSync(pre, "utf8");
    for (const r of rows) expect(body, ncertCode(r)).toContain(`data-testid="nb-row-${ncertCode(r)}"`);
    expect(loadProblems(body)).toEqual([]);
  });
});

describe("NCERT-BOOKS-1 (d) / 1b — every row's copy is stored, so every row opens the on-site reader", () => {
  const html = renderedPage();
  it("all 27 read actions are buttons (Maths Ch 9 joined Storage on 14 Oct); a stored:false row would be the official link", () => {
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
    expect(rows.find((r) => r.book === "Maths" && r.chapter === 9)?.stored).toBe(true);
    expect(rows.every((r) => r.stored)).toBe(true);
  });
});

/** Which subject tab is selected and which panels are hidden, read off the rendered HTML. */
function tabState(html: string): { selected: string[]; hidden: string[]; panels: string[] } {
  const selected = [...html.matchAll(/<button[^>]*aria-selected="true"[^>]*data-testid="nb-tab-(\w+)"/g)].map((m) => m[1]);
  const panels = [...html.matchAll(/<section[^>]*data-testid="nb-panel-(\w+)"[^>]*>/g)];
  return {
    selected,
    panels: panels.map((m) => m[1]),
    hidden: panels.filter((m) => /\shidden(?:=""|\s|>)/.test(m[0])).map((m) => m[1]),
  };
}

describe("NCERT-BOOKS-1b (e) — the product chrome: shell, sidebar item, toggle, back link", () => {
  it("/ncert-class-10 is in BOTH shell matchers (desktop sidebar, mobile self-chromed), exact path only", () => {
    // Both matchers live in App.tsx (protected; 1b adds matcher lines only). Importing App pulls in the
    // exam-date clock, so the two function bodies are read as text: an exact-path test, never a prefix.
    const app = read("src/App.tsx");
    const body = (fn: string) => {
      const start = app.indexOf(`function ${fn}(`);
      expect(start, fn).toBeGreaterThan(-1);
      return app.slice(start, app.indexOf("\n}\n", start));
    };
    expect(body("isDesktopShellRoute")).toContain('if (pathname === "/ncert-class-10") return true;');
    expect(body("isMobileSelfChromedRoute")).toContain('pathname === "/ncert-class-10"');
    for (const fn of ["isDesktopShellRoute", "isMobileSelfChromedRoute"]) {
      expect(body(fn)).not.toMatch(/startsWith\("\/ncert-class-10/);
    }
  });

  it("the desktop rail carries an NCERT Books item pointing here", () => {
    const shell = read("src/components/desktop/DesktopShell.tsx");
    expect(shell).toMatch(/to: "\/ncert-class-10",\s*\n\s*label: "NCERT Books"/);
  });

  it("the bare path renders the Maths tab open and the Science panel mounted but hidden (crawler reads both)", () => {
    const st = tabState(renderedPage());
    expect(st.selected).toEqual(["maths"]);
    expect(st.panels).toEqual(["maths", "science"]);
    expect(st.hidden).toEqual(["science"]);
  });

  it("?subject=science (and the legacy #science jump) open the Science tab", () => {
    expect(tabState(renderedPage("/ncert-class-10?subject=science")).selected).toEqual(["science"]);
    expect(tabState(renderedPage("/ncert-class-10?subject=science")).hidden).toEqual(["maths"]);
    expect(tabState(renderedPage("/ncert-class-10#science")).selected).toEqual(["science"]);
    expect(ncertSubjectFrom("SCIENCE", "")).toBe("science");
    expect(ncertSubjectFrom("physics", "")).toBe("maths");
    expect(ncertSubjectFrom(null, "#maths")).toBe("maths");
  });

  it("a back link: Home by default, the return ticket when one is supplied", () => {
    expect(renderedPage()).toMatch(/<a[^>]*class="lt-nb__back"[^>]*href="\/"[^>]*>.*?Home/);
    expect(renderedPage("/ncert-class-10?returnTo=%2Fnotes%2Fcircles&backLabel=Circles notes")).toMatch(
      /<a[^>]*class="lt-nb__back"[^>]*href="\/notes\/circles"[^>]*>.*?Circles notes/,
    );
  });
});

describe("NCERT-BOOKS-1b (f) — the Formulae link goes to a section that exists", () => {
  const html = renderedPage();
  it("every row links /notes/<slug>#formulae, and every such note has a formula strip (the anchor renders)", () => {
    for (const r of rows) {
      const code = ncertCode(r);
      const start = html.indexOf(`data-testid="nb-row-${code}"`);
      const row = html.slice(start, html.indexOf("</li>", start));
      expect(row, code).toContain(`href="/notes/${r.slug}#formulae"`);
      const spec = JSON.parse(readFileSync(resolve(ROOT, "..", "notes", "specs", `${r.slug}.json`), "utf8"));
      expect((spec.formula_strip ?? []).length, `${r.slug} has no formula_strip`).toBeGreaterThan(0);
    }
  });
});

describe("NCERT-BOOKS-1b (h) — the rail picker: subject → (science part) → chapter → the reader", () => {
  it("Maths lists its 14; Chemistry + Biology + Physics partition Science's 13 with no gap or overlap", () => {
    expect(ncertPickerChapters("maths", "chemistry").map((r) => r.chapter)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    const parts = NCERT_SCIENCE_BRANCHES.map((b) => ncertPickerChapters("science", b.key).map((r) => r.chapter));
    expect(parts).toEqual([[1, 2, 3, 4], [5, 6, 7, 8, 13], [9, 10, 11, 12]]);
  });

  it("the landing is /ncert-class-10?subject=…&read=<code>, and that URL opens the right tab with no second canonical", () => {
    const ch9 = rows.find((r) => r.book === "Maths" && r.chapter === 9)!;
    expect(ncertReadPath(ch9)).toBe("/ncert-class-10?subject=maths&read=jemh109");
    const sc11 = rows.find((r) => r.book === "Science" && r.chapter === 11)!;
    expect(ncertReadPath(sc11)).toBe("/ncert-class-10?subject=science&read=jesc111");
    expect(tabState(renderedPage(ncertReadPath(sc11))).selected).toEqual(["science"]);
    // The reader never server-renders (nothing PDF-shaped, even on the ?read= URL).
    expect(loadProblems(renderedPage(ncertReadPath(sc11)))).toEqual([]);
    expect(canonicalPathFor(ncertReadPath(sc11))).toBe("/ncert-class-10");
  });
});

/** The reader must draw pages itself (no iframe / embed / new-tab path) and load pdf.js only on demand. */
function readerProblems(raw: string): string[] {
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""); // code only, not the notes
  const out: string[] = [];
  if (/<iframe/i.test(src)) out.push("an iframe");
  if (/<(?:embed|object)\b/i.test(src)) out.push("an embed/object");
  if (/pdfViewerEnabled\s*(?:===|!==|==)/.test(src)) out.push("a pdfViewerEnabled branch");
  if (/^\s*import\s[^;]*["']pdfjs-dist/m.test(src)) out.push("a static pdf.js import");
  if (!/await import\(\s*["']pdfjs-dist/.test(src)) out.push("no lazy pdf.js import");
  if (!/<canvas\b/.test(src)) out.push("no canvas");
  // pdf.js 6: a document proxy has no destroy(); calling it crashed the page on close.
  if (/\b(?:doc|d)\.destroy\(/.test(src)) out.push("destroy() on the document proxy");
  if (!/task\.destroy\(/.test(src)) out.push("no loading-task destroy");
  return out;
}

describe("NCERT-BOOKS-1b (g) — phones read the chapter in the page (owner reproduced the new tab)", () => {
  it("the reader draws pages on canvas with a lazily loaded pdf.js; no iframe, no pdfViewerEnabled fallback", () => {
    expect(readerProblems(read("src/components/ncert/NcertChapterReader.tsx"))).toEqual([]);
  });
});

describe("CONTROLS — the SOLUTIONS-1 narrowing removes only a published link", () => {
  it("a link to an unpublished chapter, or loose 'solutions' copy, is still caught", () => {
    // (Circles was the unpublished example until SOLUTIONS-2; Constructions is deleted for 2026-27.)
    const unpublished = '<a href="/ncert-solutions/constructions" data-testid="nb-solutions-jemh110">Solutions</a>';
    expect(copyProblems(withoutPublishedSolutionsLinks(unpublished).replace(/<[^>]+>/g, " "))).toEqual(["solutions"]);
    expect(copyProblems(withoutPublishedSolutionsLinks("<p>NCERT solutions coming</p>"))).toContain("solutions");
    const published = '<a href="/ncert-solutions/triangles" data-testid="nb-solutions-jemh106">Solutions</a>';
    expect(withoutPublishedSolutionsLinks(published)).toBe("");
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
  it("tabState", () => {
    const html =
      '<button role="tab" aria-selected="false" data-testid="nb-tab-maths"></button>' +
      '<button role="tab" aria-selected="true" data-testid="nb-tab-science"></button>' +
      '<section role="tabpanel" hidden="" data-testid="nb-panel-maths"></section>' +
      '<section role="tabpanel" data-testid="nb-panel-science"></section>';
    expect(tabState(html)).toEqual({ selected: ["science"], panels: ["maths", "science"], hidden: ["maths"] });
  });
  it("readerProblems", () => {
    expect(
      readerProblems('import x from "pdfjs-dist/legacy/build/pdf.mjs";\nif (navigator.pdfViewerEnabled === false) {}\n<iframe src="a"/><embed/>\nvoid doc.destroy();'),
    ).toEqual([
      "an iframe",
      "an embed/object",
      "a pdfViewerEnabled branch",
      "a static pdf.js import",
      "no lazy pdf.js import",
      "no canvas",
      "destroy() on the document proxy",
      "no loading-task destroy",
    ]);
  });
  it("deletedChapterProblems", () => {
    expect(deletedChapterProblems(["Sources of Energy", "Electricity"])).toEqual(["Sources of Energy"]);
  });
});
