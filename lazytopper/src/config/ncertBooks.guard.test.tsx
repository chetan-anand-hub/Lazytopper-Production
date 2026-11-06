import { beforeAll, describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import NcertBooksPage, {
  hubSolutionsChapter,
  hubTiles,
  hubWeightage,
  ncertHubState,
  ncertSubjectFrom,
} from "../pages/NcertBooksPage";
import {
  NCERT_CLASS10_CHAPTERS,
  ncertCode,
  ncertHubChapterPath,
  ncertHubLinkLabel,
  ncertHubSlug,
  ncertOfficialUrl,
  ncertPracticePath,
  ncertRowForHubSlug,
} from "./ncertBooks";
import { SELF_CANONICAL_EXACT, canonicalPathFor } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { bankSlugOf, publishedRows, solutionsPaths } from "./solutionsPublishSafe";
import { ensureBankChapters, getBankRows } from "../data/bankChapters/loader";
import { allDesktopTopics } from "../lib/desktop/topics";
import { ncertPickerChapters, ncertReadPath, NCERT_SCIENCE_BRANCHES } from "../components/ncert/NcertChapterPicker";
import { ncertFileCodeFromSpec } from "../lib/ncertFileCode";
import { STATIC_PAGE_HEADS, ROUTE_CHUNK_MODULES, pageJsonLd } from "../../scripts/seo/writeStaticHeads";

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
 * NCERT-HUB-1 (owner approval 6 Nov 2026) re-pins (c)–(f) for the hub: the 27 chapters now sit in the
 * "All N chapters" lists (both subjects in the HTML), and a picked chapter opens ONE card whose tiles
 * exist only where their target does. "solutions" copy is now the page's purpose, so the copy rule
 * that banned the word is replaced by one that bans a link to an UNPUBLISHED solutions page.
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

/** NCERT-HUB-1 — every link to a solutions page must be to a PUBLISHED one (never a dead or future page). */
function unpublishedSolutionsHrefs(html: string): string[] {
  const published = new Set(solutionsPaths());
  return [...html.matchAll(/href="(\/ncert-(?:solutions|exemplar)\/[^"]*)"/g)].map((m) => m[1]).filter((h) => !published.has(h));
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
    expect(read("public/llms.txt")).toContain(
      "- [NCERT Hub — Class 10 Books, NCERT & Exemplar Solutions](https://www.lazytopper.com/ncert-class-10):",
    );
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
    expect(head.title).toBe("NCERT Hub Class 10: Books, NCERT & Exemplar Solutions");
    expect(head.description.length, head.description).toBeLessThanOrEqual(155);
    expect(copyProblems(head.title + " " + head.description)).toEqual([]);
  });

  it("NCERT-HUB-1: every hub URL (subject, chapter, reader) canonicalises to /ncert-class-10", () => {
    for (const u of [
      "/ncert-class-10?subject=maths",
      "/ncert-class-10?subject=science",
      "/ncert-class-10?subject=maths&ch=triangles",
      "/ncert-class-10?subject=science&ch=electricity",
      "/ncert-class-10?subject=maths&read=jemh106",
    ]) {
      expect(canonicalPathFor(u), u).toBe("/ncert-class-10");
    }
  });

  it("NCERT-HUB-1: the static head carries a BreadcrumbList Home › NCERT Hub of canonical URLs only", () => {
    const ld = pageJsonLd("/ncert-class-10", "", true) as { "@type": string; itemListElement: Array<{ name: string; item: string }> };
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.map((i) => i.name)).toEqual(["Home", "NCERT Hub"]);
    expect(ld.itemListElement.every((i) => !i.item.includes("?"))).toBe(true);
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

describe("NCERT-HUB-1 (c) — the hub: empty state, all 27 chapters in the HTML, honest links", () => {
  const html = renderedPage();

  it("the H1 is the hub's name", () => {
    expect(html).toContain("<h1>NCERT Hub — Class 10 Books, NCERT &amp; Exemplar Solutions</h1>");
  });

  it("the bare path shows the empty state, no chapter card, and the breadcrumb Home › NCERT Hub", () => {
    expect(html).toContain('data-testid="nb-empty"');
    expect(html).toContain("Pick a chapter to see its book, NCERT &amp; Exemplar solutions, important questions and notes");
    expect(html).not.toContain('data-testid="nb-card"');
    const crumbs = /<nav[^>]*data-testid="nb-crumbs"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? "";
    expect([...crumbs.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(["/", "/ncert-class-10"]);
  });

  it("all 27 chapters are in the HTML (both subjects' lists), each opening its hub card and linking its notes", () => {
    for (const r of rows) {
      const code = ncertCode(r);
      const start = html.indexOf(`data-testid="nb-row-${code}"`);
      expect(start, `row ${code} missing`).toBeGreaterThan(-1);
      const row = html.slice(start, html.indexOf("</li>", start));
      expect(row).toContain(`href="${ncertHubChapterPath(r).replace(/&/g, "&amp;")}"`);
      expect(row).toContain(`href="/notes/${r.slug}"`);
      expect(row).toContain(`Ch ${r.chapter} ${r.title.replace(/&/g, "&amp;")}`);
    }
    // Collapsed by default; the other subject's list is mounted but hidden.
    expect(html).toMatch(/<details[^>]*data-testid="nb-all-maths"[^>]*>/);
    expect(/<details[^>]*data-testid="nb-all-maths"[^>]*>/.exec(html)![0]).not.toMatch(/\sopen/);
    expect(/<details[^>]*data-testid="nb-all-science"[^>]*>/.exec(html)![0]).toMatch(/\shidden/);
    expect(html).toContain("All 14 Maths chapters");
    expect(html).toContain("All 13 Science chapters");
  });

  it("no forbidden copy, no link to an unpublished solutions page, and nothing PDF-shaped loads with the page", () => {
    expect(copyProblems(html.replace(/<[^>]+>/g, " "))).toEqual([]);
    expect(unpublishedSolutionsHrefs(html)).toEqual([]);
    expect(loadProblems(html)).toEqual([]);
  });

  it("the list links exactly the published solutions pages of each chapter (driven by the solutions config)", () => {
    for (const r of rows) {
      const sol = hubSolutionsChapter(r);
      const start = html.indexOf(`data-testid="nb-row-${ncertCode(r)}"`);
      const row = html.slice(start, html.indexOf("</li>", start));
      const want = sol ? (["ncert", "exemplar"] as const).filter((b) => sol[b].length > 0) : [];
      const got = [...row.matchAll(/href="\/ncert-(solutions|exemplar)\//g)].map((m) => (m[1] === "solutions" ? "ncert" : "exemplar"));
      expect(got, ncertCode(r)).toEqual(want);
    }
    // Pinned exactly (SOLUTIONS-2: every Maths chapter has both books; SOLUTIONS-SCI-1/2: every Science
    // chapter but Heredity (Ch 8, below the 5-row floor) has its NCERT page, and none an Exemplar page).
    expect(rows.filter((r) => hubSolutionsChapter(r) !== null).map(ncertCode)).toEqual([
      "jemh101", "jemh102", "jemh103", "jemh104", "jemh105", "jemh106", "jemh107",
      "jemh108", "jemh109", "jemh110", "jemh111", "jemh112", "jemh113", "jemh114",
      "jesc101", "jesc102", "jesc103", "jesc104", "jesc105", "jesc106", "jesc107",
      "jesc109", "jesc110", "jesc111", "jesc112", "jesc113",
    ]);
    const elec = rows.find((r) => r.book === "Science" && r.chapter === 11)!;
    expect(hubTiles(elec, false).map((t) => t.id)).toEqual(["ncert", "read", "important", "notes", "check"]);
  });

  it("the committed prerender (once captured) carries all 27 chapters and the empty state", () => {
    const pre = resolve(ROOT, "prerendered", "ncert-class-10.html");
    if (!existsSync(pre)) return;
    const body = readFileSync(pre, "utf8");
    if (!body.includes('data-testid="nb-empty"')) return; // a capture from before NCERT-HUB-1 (refreshed by CI in the same PR)
    for (const r of rows) expect(body, ncertCode(r)).toContain(`data-testid="nb-row-${ncertCode(r)}"`);
    expect(unpublishedSolutionsHrefs(body)).toEqual([]);
    expect(loadProblems(body)).toEqual([]);
  });
});

describe("NCERT-HUB-1 (d) — a picked chapter: one card, honest tiles", () => {
  const tileIds = (h: string) => [...h.matchAll(/data-testid="nb-tile-([a-z]+)"/g)].map((m) => m[1]);

  it("Maths Ch 6 Triangles: the six tiles in the owner's order, real counts, the unit weightage, a 4-level breadcrumb", () => {
    const h = renderedPage("/ncert-class-10?subject=maths&ch=triangles");
    expect(h).toContain('data-testid="nb-card"');
    expect(h).toContain("Maths · Chapter 6");
    expect(tileIds(h)).toEqual(["ncert", "exemplar", "read", "important", "notes", "check"]);
    const tri = hubSolutionsChapter(rows.find((r) => r.book === "Maths" && r.chapter === 6)!)!;
    expect(h).toContain(`${tri.ncert.length} questions · try first`);
    expect(h).toContain('href="/ncert-solutions/triangles"');
    expect(h).toContain('href="/ncert-exemplar/triangles"');
    expect(h).toContain('href="/highly-probable/10/Maths?topic=triangles"');
    expect(h).toContain('href="/notes/triangles"');
    expect(h).toContain('href="/check-improve"');
    expect(h).toContain('data-testid="nb-weight">Geometry · 15 of 80 marks<');
    const crumbs = /<nav[^>]*data-testid="nb-crumbs"[^>]*>([\s\S]*?)<\/nav>/.exec(h)?.[1] ?? "";
    expect([...crumbs.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))).toEqual([
      "/",
      "/ncert-class-10",
      "/ncert-class-10?subject=maths",
      "/ncert-class-10?subject=maths&ch=triangles",
    ]);
    expect(h).toContain("(jemh106) · official copy");
    expect(unpublishedSolutionsHrefs(h)).toEqual([]);
  });

  it("every chapter: a tile only where its target exists — the solutions tiles exactly per the solutions config", () => {
    for (const r of rows) {
      const h = renderedPage(ncertHubChapterPath(r));
      const sol = hubSolutionsChapter(r);
      const want = [
        ...(sol && sol.ncert.length ? ["ncert"] : []),
        ...(sol && sol.exemplar.length ? ["exemplar"] : []),
        "read",
        "important",
        "notes",
        "check",
      ];
      expect(tileIds(h), ncertCode(r)).toEqual(want);
      expect(unpublishedSolutionsHrefs(h), ncertCode(r)).toEqual([]);
      expect(copyProblems(h.replace(/<[^>]+>/g, " ")), ncertCode(r)).toEqual([]);
      // The weightage chip only where the 2026-27 syllabus gives the unit (never invented).
      expect(h.includes('data-testid="nb-weight"'), ncertCode(r)).toBe(hubWeightage(r) !== null);
    }
  });

  beforeAll(async () => {
    const slugs = [...new Set(rows.map((r) => hubSolutionsChapter(r)).filter((c) => c !== null).map((c) => bankSlugOf(c!)))];
    await ensureBankChapters(slugs);
  }, 120_000);

  it("the NCERT / Exemplar counts are the PUBLISHED rows (allowlist ∩ served), never an estimate", () => {
    for (const r of rows) {
      const sol = hubSolutionsChapter(r);
      if (!sol) continue;
      const served = getBankRows([bankSlugOf(sol)]);
      const tiles = hubTiles(r, false);
      for (const book of ["ncert", "exemplar"] as const) {
        const n = publishedRows(served, sol, book).length;
        const tile = tiles.find((t) => t.id === book);
        if (n === 0) expect(tile, `${ncertCode(r)} ${book}`).toBeUndefined();
        else expect(tile?.sub, `${ncertCode(r)} ${book}`).toMatch(new RegExp(`^${n} question`));
      }
    }
  });

  it("'First check free' only while this browser still has its free check", () => {
    const r = rows[0];
    expect(hubTiles(r, true).find((t) => t.id === "check")?.sub).toBe("First check free");
    expect(hubTiles(r, false).find((t) => t.id === "check")?.sub).toBe("CBSE step marking");
  });

  it("a stored chapter's reader tile is a button (on-site reader); a stored:false one would be the official link", () => {
    for (const r of rows) {
      const code = ncertCode(r);
      const h = renderedPage(ncertHubChapterPath(r));
      const m = new RegExp(`<(a|button)\\b[^>]*data-testid="nb-read-${code}"`).exec(h);
      expect(m, code).not.toBeNull();
      if (r.stored) expect(m![1], code).toBe("button");
      else expect(m![0]).toContain(`href="${ncertOfficialUrl(r)}"`);
      expect(loadProblems(h), code).toEqual([]);
    }
    expect(rows.every((r) => r.stored)).toBe(true);
  });
});

/** Which subject chip is pressed, and which "All chapters" list is hidden, read off the rendered HTML. */
function subjectState(html: string): { pressed: string[]; hidden: string[] } {
  return {
    pressed: [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*data-testid="nb-subject-(\w+)"/g)].map((m) => m[1]),
    hidden: [...html.matchAll(/<details[^>]*data-testid="nb-all-(\w+)"[^>]*>/g)]
      .filter((m) => /\shidden(?:=""|\s|>)/.test(m[0]))
      .map((m) => m[1]),
  };
}

describe("NCERT-BOOKS-1b / NCERT-HUB-1 (e) — the product chrome and the URL state", () => {
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

  it("the desktop rail carries an NCERT Hub item pointing here", () => {
    const shell = read("src/components/desktop/DesktopShell.tsx");
    expect(shell).toMatch(/to: "\/ncert-class-10",\s*\n\s*label: "NCERT Hub"/);
  });

  it("the bare path picks Maths; ?subject=science, the legacy #science and a Science ?ch= pick Science", () => {
    expect(subjectState(renderedPage())).toEqual({ pressed: ["maths"], hidden: ["science"] });
    expect(subjectState(renderedPage("/ncert-class-10?subject=science"))).toEqual({ pressed: ["science"], hidden: ["maths"] });
    expect(subjectState(renderedPage("/ncert-class-10#science")).pressed).toEqual(["science"]);
    expect(subjectState(renderedPage("/ncert-class-10?ch=electricity")).pressed).toEqual(["science"]);
    expect(ncertSubjectFrom("SCIENCE", "")).toBe("science");
    expect(ncertSubjectFrom("physics", "")).toBe("maths");
    expect(ncertSubjectFrom(null, "#maths")).toBe("maths");
  });

  it("ncertHubState: the URL wins, then the stored subject; a ?ch= of the other subject or no chapter is ignored", () => {
    const st = (q: string, stored: "maths" | "science" | null = null, hash = "") =>
      ncertHubState(new URLSearchParams(q), hash, stored);
    expect(st("")).toMatchObject({ subject: "maths", row: null });
    expect(st("", "science")).toMatchObject({ subject: "science", row: null });
    expect(st("subject=maths", "science")).toMatchObject({ subject: "maths" });
    expect(st("ch=triangles", "science").row?.title).toBe("Triangles");
    expect(st("ch=triangles", "science").subject).toBe("maths");
    expect(st("subject=science&ch=triangles").row).toBeNull();
    expect(st("subject=maths&ch=not-a-chapter").row).toBeNull();
    expect(st("read=jesc111")).toMatchObject({ subject: "science", readCode: "jesc111" });
    expect(st("read=jesc111").row?.title).toBe("Electricity");
  });

  it("every chapter has a unique ?ch= slug, equal to its solutions slug wherever a solutions page exists", () => {
    const slugs = rows.map(ncertHubSlug);
    expect(new Set(slugs).size).toBe(rows.length);
    for (const r of rows) expect(ncertRowForHubSlug(ncertHubSlug(r))).toBe(r);
    for (const p of solutionsPaths()) {
      const slug = p.split("/").pop()!;
      expect(ncertRowForHubSlug(slug), p).not.toBeNull();
    }
  });

  it("links INTO the hub say what the card holds (solutions only where published)", () => {
    for (const r of rows) {
      const sol = hubSolutionsChapter(r);
      const label = ncertHubLinkLabel(r);
      if (!sol) expect(label, ncertCode(r)).toBe("This chapter in the NCERT Hub →");
      else if (sol.ncert.length && sol.exemplar.length) expect(label).toBe("NCERT & Exemplar solutions →");
      else expect(label).toMatch(/^(NCERT|Exemplar) solutions →$/);
    }
  });

  it("NAV-FIX-1: no page-level back link (the NAV-1 header row owns Back), with or without a return ticket", () => {
    expect(renderedPage()).not.toMatch(/class="lt-nb__back"/);
    expect(renderedPage("/ncert-class-10?returnTo=%2Fnotes%2Fcircles&backLabel=Circles notes")).not.toMatch(
      /Circles notes|class="lt-nb__back"/,
    );
  });
});

describe("NCERT-BOOKS-1b (f) — the Notes & Formulae tile goes to a note that has its formulae", () => {
  it("every chapter's tile links /notes/<slug>, and every such note has a formula strip", () => {
    for (const r of rows) {
      const tile = hubTiles(r, false).find((t) => t.id === "notes");
      expect(tile?.to, ncertCode(r)).toBe(`/notes/${r.slug}`);
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
    expect(subjectState(renderedPage(ncertReadPath(sc11))).pressed).toEqual(["science"]);
    // NCERT-HUB-1: the ?read= landing opens that chapter's card, its reader tile ready to open.
    expect(renderedPage(ncertReadPath(sc11))).toContain('data-testid="nb-read-jesc111"');
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

describe("CONTROLS — the unpublished-solutions detector", () => {
  it("a link to an unpublished chapter is caught; a published one is not", () => {
    // (Constructions is deleted for 2026-27, so it can never be a published page.)
    expect(unpublishedSolutionsHrefs('<a href="/ncert-solutions/constructions">x</a>')).toEqual(["/ncert-solutions/constructions"]);
    expect(unpublishedSolutionsHrefs('<a href="/ncert-exemplar/triangles">x</a>')).toEqual([]);
  });
});

describe("CONTROLS — every detector fires on synthetic violating input", () => {
  it("copyProblems", () => {
    expect(copyProblems("NCERT solutions, coming soon, ₹599, predicted")).toEqual([
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
  it("subjectState", () => {
    const html =
      '<button aria-pressed="false" data-testid="nb-subject-maths"></button>' +
      '<button aria-pressed="true" data-testid="nb-subject-science"></button>' +
      '<details class="x" hidden="" data-testid="nb-all-maths"></details>' +
      '<details class="x" data-testid="nb-all-science"></details>';
    expect(subjectState(html)).toEqual({ pressed: ["science"], hidden: ["maths"] });
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
