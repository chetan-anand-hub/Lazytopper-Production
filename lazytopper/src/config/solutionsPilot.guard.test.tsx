import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import SolutionsPage, { exerciseOf, solutionsH1 } from "../pages/SolutionsPage";
import {
  parseSolutionsPath,
  publishedRows,
  SOLUTIONS_CHAPTERS,
  solutionsChapter,
  solutionsPath,
  solutionsPaths,
  type SolutionsBook,
} from "./solutionsPublishSafe";
import { SELF_CANONICAL_EXACT, canonicalPathFor } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { ensureBankChapters, getBankRows } from "../data/bankChapters/loader";
import { WITHHELD_QUESTION_IDS } from "../data/canonicalQuestionBank";
import { compareAnswer, correctOptionIndex, parseQuantity } from "../lib/solutions/compareAnswer";
import { pageJsonLd, ROUTE_CHUNK_MODULES, STATIC_PAGE_HEADS } from "../../scripts/seo/writeStaticHeads";

/**
 * SOLUTIONS-1 (lane G; #973 D259 / D260 / D261) — the Triangles NCERT + Exemplar solutions pilot.
 *
 *   (a) exactly the D261 ids are allowlisted (13 + 16), none of the 5 HOLD or 12 excluded ids,
 *       and every one is served by the bank exactly when it is not withheld;
 *   (b) the page renders exactly those rows; before an attempt each solution is in the HTML but
 *       `hidden`, and only step 1 sits behind the hint; a withheld row disappears (CONTROL);
 *   (c) verdicts: MCQ / AR rows have exactly one correct option; ONLY the five opted-in typed rows
 *       carry a value verdict, and their bank keys are pinned here; every other row gets none
 *       plus the photo-check CTA;
 *   (d) copy: no price, no "predicted / guaranteed / leaked", no "coming soon", no invented counts
 *       or timers;
 *   (e) registration: self-canonical, sitemap, llms.txt, exact-path rewrites, chunk map, heads,
 *       BreadcrumbList JSON-LD (no Quiz / QAPage), the App.tsx route family (read as TEXT: importing
 *       App.tsx trips the CI clock guard);
 *   (f) the committed prerender, once captured, carries every row and its hidden solution.
 * Every detector runs against SYNTHETIC violating input in the CONTROLS block.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

const D261_NCERT = [
  "TRI-N-NCERT-6-MCQ-001", "TRI-N-NCERT-6-MCQ-002", "TRI-N-NCERT-6-VSA-001", "TRI-N-NCERT-6-SA-001",
  "TRI-N-NCERT-6-SA-002", "TRI-N-NCERT-6-SA-003", "TRI-N-NCERT-6-SA-005", "TRI-N-NCERT-6-LA-001",
  "TRI-N-NCERT-6-LA-003", "TRI-N-NCERT-6-LA-004", "TRI-N-NCERT-6-LA-005", "TRI-N-NCERT-6-AR-001",
  "TRI-N-NCERT-6-CB-001",
];
const D261_EXEMPLAR = [
  "TRI-N-EXMPLR-6-MCQ-003", "TRI-N-EXMPLR-6-MCQ-004", "TRI-N-EXMPLR-6-MCQ-005", "TRI-N-EXMPLR-6-MCQ-006",
  "TRI-N-EXMPLR-6-MCQ-007", "TRI-N-EXMPLR-6-SA-002", "TRI-N-EXMPLR-6-SA-003", "TRI-N-EXMPLR-6-SA-005",
  "TRI-N-EXMPLR-6-SA-006", "TRI-N-EXMPLR-6-SA-008", "TRI-N-EXMPLR-6-SA-010", "TRI-N-EXMPLR-6-SA-011",
  "TRI-N-EXMPLR-6-SA-012", "TRI-N-EXMPLR-6-LA-001", "TRI-N-EXMPLR-6-LA-003", "TRI-N-EXMPLR-6-LA-004",
];
const D261_HOLD = ["TRI-N-NCERT-6-LA-002", "TRI-N-NCERT-6-SA-004", "TRI-N-EXMPLR-6-MCQ-001", "TRI-N-EXMPLR-6-SA-004", "TRI-N-EXMPLR-6-SA-009"];
const D261_EXCLUDED = [
  "TRI-N-NCERT-6-LA-006", "TRI-N-NCERT-6-SA-006", "TRI-N-NCERT-6-SA-007", "TRI-N-NCERT-6-SA-008",
  "TRI-N-EXMPLR-6-MCQ-002", "TRI-N-EXMPLR-6-SA-007", "TRI-N-EXMPLR-6-SA-013", "TRI-N-EXMPLR-6-LA-005",
  "TRI-N-EXMPLR-6-LA-006", "TRI-N-EXMPLR-6-LA-007", "TRI-N-EXMPLR-6-CB-001", "TRI-N-EXMPLR-6-CB-002",
];
/** The five typed rows opted in for a verdict, with the bank's own key (pinned). */
const VALUE_KEYS: Readonly<Record<string, string>> = {
  "TRI-N-NCERT-6-SA-001": "EC = 2 cm.",
  "TRI-N-NCERT-6-SA-005": "Height of the tower = 42 m.",
  "TRI-N-EXMPLR-6-SA-008": "Perimeter of △ABC = 18 cm.",
  "TRI-N-EXMPLR-6-SA-011": "BD = 55/3 cm.",
  "TRI-N-EXMPLR-6-SA-012": "Height of the telephone pole = 10 m.",
};

const FORBIDDEN: ReadonlyArray<[string, RegExp]> = [
  ["coming soon", /coming soon/i],
  ["placeholder", /placeholder text|lorem|TODO/i],
  ["predicted", /predicted/i],
  ["guaranteed", /guarantee/i],
  ["leaked", /leak/i],
  ["a price (rupee sign)", /₹/],
  ["a price (Rs / INR)", /\b(?:Rs\.?|INR)\s?\d/i],
  ["an invented count", /\b\d[\d,]*\+?\s+(?:students|learners|users|toppers)\b/i],
  ["a timer", /\b(?:hours?|minutes?|seconds?|days?)\s+left\b|countdown|only\s+\d+\s+left/i],
];
function copyProblems(text: string): string[] {
  return FORBIDDEN.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** The block with `data-testid="<id>"`: from its opening tag to the matching close of that tag name. */
function block(html: string, testid: string): string | null {
  const start = html.indexOf(`data-testid="${testid}"`);
  if (start < 0) return null;
  const open = html.lastIndexOf("<", start);
  const tag = /^<([a-z0-9]+)/i.exec(html.slice(open))![1];
  let depth = 0;
  const re = new RegExp(`<\\/?${tag}\\b`, "gi");
  re.lastIndex = open;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(open, html.indexOf(">", m.index) + 1);
  }
  return null;
}
const openTag = (b: string) => b.slice(0, b.indexOf(">") + 1);

/**
 * The page's OWN copy: the HTML minus every question card. Card text is bank content (verified
 * under D261), and real maths says things like "equal angles do not guarantee similarity" —
 * the copy rules are about OUR claims, so they scan everything else.
 */
function pageChrome(html: string): string {
  let out = html;
  for (const m of [...html.matchAll(/data-testid="(ncs-q-[a-z0-9-]+)"/g)]) {
    const card = block(html, m[1]);
    if (card) out = out.replace(card, "");
  }
  return out;
}

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <SolutionsPage />
    </MemoryRouter>,
  );
}

const pages: Record<SolutionsBook, string> = { ncert: "", exemplar: "" };
beforeAll(async () => {
  await ensureBankChapters(["triangles"]);
  pages.ncert = render("/ncert-solutions/triangles");
  pages.exemplar = render("/ncert-exemplar/triangles");
});

const tri = solutionsChapter("triangles")!;
const ids = (book: SolutionsBook) => tri[book].map((r) => r.id);

describe("(a) the allowlist is exactly D261, and the bank serves it", () => {
  it("13 NCERT + 16 Exemplar, in D261's order, unique", () => {
    // SOLUTIONS-2 added the other Maths chapters after it; the pilot entry stays first and unchanged.
    expect(SOLUTIONS_CHAPTERS[0].slug).toBe("triangles");
    expect(SOLUTIONS_CHAPTERS.filter((c) => c.decision === "D261").map((c) => c.slug)).toEqual(["triangles"]);
    expect(ids("ncert")).toEqual(D261_NCERT);
    expect(ids("exemplar")).toEqual(D261_EXEMPLAR);
    expect(new Set([...ids("ncert"), ...ids("exemplar")]).size).toBe(29);
  });
  it("none of the 5 HOLD or the 12 syllabus-excluded rows is allowlisted", () => {
    const all = new Set([...ids("ncert"), ...ids("exemplar")]);
    for (const id of [...D261_HOLD, ...D261_EXCLUDED]) expect(all.has(id), id).toBe(false);
  });
  it("each allowlisted id is served by the chapter loader exactly when it is not withheld", () => {
    const served = new Set(getBankRows(["triangles"]).map((q) => q.id));
    for (const id of [...ids("ncert"), ...ids("exemplar")]) {
      expect(served.has(id), id).toBe(!WITHHELD_QUESTION_IDS.has(id));
    }
  });
});

describe("(b) the page renders exactly the published rows, attempt-first", () => {
  for (const book of ["ncert", "exemplar"] as const) {
    it(`${book}: the h1, and one card per published row in allowlist order`, () => {
      const html = pages[book];
      expect(html).toContain(`<h1>${solutionsH1(book, tri)}</h1>`);
      const cards = [...html.matchAll(/data-testid="ncs-q-([a-z0-9-]+)"/g)].map((m) => m[1]);
      const expected = publishedRows(getBankRows(["triangles"]), tri, book).map(({ q }) => q.id.toLowerCase());
      expect(cards.length).toBe(expected.length);
      expect(new Set(cards)).toEqual(new Set(expected));
    });

    it(`${book}: before an attempt, the full solution is in the HTML but hidden; the hint holds step 1 only`, () => {
      const html = pages[book];
      for (const { q } of publishedRows(getBankRows(["triangles"]), tri, book)) {
        const a = q.id.toLowerCase();
        const sol = block(html, `ncs-sol-${a}`);
        expect(sol, `no solution block for ${q.id}`).not.toBeNull();
        expect(openTag(sol!), q.id).toMatch(/\shidden(?:=""|\s|>)/);
        expect((sol!.match(/<li>/g) ?? []).length, `${q.id} steps`).toBe(q.solutionSteps!.length);
        const hint = block(html, `ncs-hint-${a}`);
        expect(hint, `no hint for ${q.id}`).not.toBeNull();
        expect(openTag(hint!), q.id).toMatch(/\shidden(?:=""|\s|>)/);
        expect(hint!).toContain("Step 1");
        expect(hint!).not.toContain("<li>");
      }
    });
  }

  it("CONTROL: a row withheld later disappears (allowlist ∩ served)", () => {
    const served = getBankRows(["triangles"]).filter((q) => q.id !== "TRI-N-NCERT-6-SA-001");
    const out = publishedRows(served, tri, "ncert").map(({ q }) => q.id);
    expect(out).toHaveLength(12);
    expect(out).not.toContain("TRI-N-NCERT-6-SA-001");
  });

  it("an unknown chapter or path is not a solutions page", () => {
    // "circles" was the unknown chapter here until SOLUTIONS-2 published it; Constructions is deleted for 2026-27.
    expect(solutionsChapter("constructions")).toBeNull();
    expect(parseSolutionsPath("/ncert-solutions/triangles")).toEqual({ book: "ncert", slug: "triangles" });
    expect(parseSolutionsPath("/ncert-exemplar/triangles/")).toEqual({ book: "exemplar", slug: "triangles" });
    expect(parseSolutionsPath("/ncert-solutions/triangles/x")).toBeNull();
    expect(render("/ncert-solutions/constructions")).not.toContain("ncert-solutions-page");
  });

  it("groups by the bank's own exercise reference, never an invented one", () => {
    expect(exerciseOf("NCERT Ex 6.2 Q1(i)")).toBe("Exercise 6.2");
    expect(exerciseOf("Exemplar Ex 6.3 Q13")).toBe("Exercise 6.3");
    expect(exerciseOf("NCERT Example 7 (Ch 6)")).toBeNull();
    expect(exerciseOf("NCERT §6.2 (Similar Figures)")).toBeNull();
  });
});

describe("(c) verdicts — never mark a correct student wrong", () => {
  it("every MCQ / AR row has exactly one option equal to its key", () => {
    for (const book of ["ncert", "exemplar"] as const) {
      for (const { q } of publishedRows(getBankRows(["triangles"]), tri, book)) {
        if (!Array.isArray(q.options)) continue;
        expect(correctOptionIndex(String(q.answer), q.options), q.id).not.toBeNull();
      }
    }
  });

  it("ONLY the five pinned typed rows are opted in, and each bank key still compares to itself", () => {
    // The pilot's own opt-ins (SOLUTIONS-2 rows are pinned in solutions2Selection.guard.test.tsx).
    const optedIn = [...tri.ncert, ...tri.exemplar].filter((r) => r.verdict === "value").map((r) => r.id);
    expect(optedIn.sort()).toEqual(Object.keys(VALUE_KEYS).sort());
    const byId = new Map(getBankRows(["triangles"]).map((q) => [q.id, q] as const));
    for (const [id, key] of Object.entries(VALUE_KEYS)) {
      const q = byId.get(id)!;
      expect(q.options, id).toBeUndefined();
      expect(q.finalAnswer, `${id}: the bank key changed — re-check compareAnswer.test.ts`).toBe(key);
      expect(parseQuantity(key), id).not.toBeNull();
      expect(compareAnswer(key, key).verdict, id).toBe("right");
    }
  });

  it("the page marks verdict rows `value`, MCQ/AR `option`, every other row `none`, and offers the photo check", () => {
    for (const book of ["ncert", "exemplar"] as const) {
      const html = pages[book];
      for (const { q, safe } of publishedRows(getBankRows(["triangles"]), tri, book)) {
        const card = block(html, `ncs-q-${q.id.toLowerCase()}`)!;
        const want = Array.isArray(q.options) ? "option" : safe.verdict === "value" ? "value" : "none";
        expect(openTag(card), q.id).toContain(`data-verdict="${want}"`);
        expect(card, q.id).toContain("photograph your working (first check free)");
      }
    }
  });
});

describe("(d) copy is honest", () => {
  it("no price, no predicted / guaranteed / leaked, no coming soon, no invented counts or timers", () => {
    for (const book of ["ncert", "exemplar"] as const) {
      const chrome = pageChrome(pages[book]);
      expect(chrome.length, "the chrome scan must keep the hero, links and CTA").toBeGreaterThan(1500);
      expect(chrome).toContain("Would your working get full marks?");
      expect(copyProblems(chrome.replace(/<[^>]+>/g, " ")), book).toEqual([]);
    }
  });
  it("the urgency is the sourced facts only", () => {
    expect(pages.ncert).toContain("Boards begin February 2027");
    expect(pages.ncert).toContain("Pre-boards are in December");
    expect(pages.ncert).toContain("Triangles is in Geometry, which carries 15 of the 80 marks");
  });
  it("links: notes, formulae, the NCERT reader for Ch 6, practice, Check my answer, the sibling page", () => {
    const html = pages.ncert;
    expect(html).toContain('href="/notes/triangles"');
    expect(html).toContain('href="/notes/triangles#formulae"');
    expect(html).toMatch(/href="\/ncert-class-10\?[^"]*read=jemh106/);
    expect(html).toContain('href="/check-improve"');
    expect(html).toContain('href="/ncert-exemplar/triangles"');
    expect(pages.exemplar).toContain('href="/ncert-solutions/triangles"');
  });
});

describe("(e) registered everywhere a public page must be", () => {
  const paths = solutionsPaths();
  it("the two pilot paths lead the derived set, self-canonical and in the sitemap set", () => {
    expect(paths.slice(0, 2)).toEqual(["/ncert-solutions/triangles", "/ncert-exemplar/triangles"]);
    for (const p of paths) {
      expect(SELF_CANONICAL_EXACT, p).toContain(p);
      expect(sitemapPaths(), p).toContain(p);
      expect(canonicalPathFor(`${p}?x=1`), p).toBe(p);
    }
  });
  it("llms.txt lists both; the Vercel rewrites are the GENERATED route-family rules (SOFT404-1)", () => {
    const llms = read("public/llms.txt");
    for (const p of paths) expect(llms).toContain(`(https://www.lazytopper.com${p}):`);
    const sources: string[] = JSON.parse(readFileSync(resolve(ROOT, "..", "vercel.json"), "utf8")).rewrites.map(
      (r: { source: string }) => r.source,
    );
    // vercel.json is generated from App.tsx (scripts/seo/writeVercelRewrites.ts; soft404Routes.guard
    // enforces "a request reaches the shell iff the router routes it"). A `:chapter` route therefore
    // reaches the shell for any one segment, exactly as `/notes/:topicSlug` does; the page itself
    // redirects a non-pilot chapter to /ncert-class-10 (see "(b) an unknown chapter").
    expect(sources).toContain("/:path(ncert-solutions/[^/]+/?)");
    expect(sources).toContain("/:path(ncert-exemplar/[^/]+/?)");
    expect(sources.filter((s) => /ncert-(solutions|exemplar)/.test(s))).toHaveLength(2);
  });
  it("chunk map + static heads within the limits; each title is the page's h1", () => {
    for (const book of ["ncert", "exemplar"] as const) {
      const p = solutionsPath(book, "triangles");
      expect(ROUTE_CHUNK_MODULES.some((e) => !e.exact && p.startsWith(e.prefix) && e.modules.includes("SolutionsPage")), p).toBe(true);
      const head = STATIC_PAGE_HEADS[p];
      expect(head, p).toBeDefined();
      expect(head.title).toBe(solutionsH1(book, tri));
      expect(head.title.length, head.title).toBeLessThanOrEqual(60);
      expect(head.description.length, head.description).toBeLessThanOrEqual(155);
      expect(copyProblems(head.title + " " + head.description)).toEqual([]);
    }
  });
  it("JSON-LD is a BreadcrumbList (Home › NCERT Books › page); no Quiz, no QAPage", () => {
    for (const p of paths) {
      const data = pageJsonLd(p, "", true) as { "@type": string; itemListElement: Array<{ name: string; item: string }> };
      expect(data["@type"]).toBe("BreadcrumbList");
      expect(data.itemListElement.map((i) => i.name)[1]).toBe("NCERT Books");
      expect(data.itemListElement[2].item).toBe(`https://www.lazytopper.com${p}`);
      expect(JSON.stringify(data)).not.toMatch(/"Quiz"|"QAPage"/);
    }
  });
  it("App.tsx carries the one route family and both shell matchers (read as text)", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('const SolutionsPage = lazy(() => import("./pages/SolutionsPage"));');
    expect(app).toContain('<Route path="/ncert-solutions/:chapter" element={withRouteSuspense(<SolutionsPage />)} />');
    expect(app).toContain('<Route path="/ncert-exemplar/:chapter" element={withRouteSuspense(<SolutionsPage />)} />');
    expect(app.match(/pathname\.startsWith\("\/ncert-solutions\/"\)/g) ?? []).toHaveLength(2);
    expect(app.match(/pathname\.startsWith\("\/ncert-exemplar\/"\)/g) ?? []).toHaveLength(2);
  });
});

describe("(f) the committed prerender carries every row and its hidden solution (once captured)", () => {
  for (const book of ["ncert", "exemplar"] as const) {
    it(book, () => {
      const file = resolve(ROOT, "prerendered", `${solutionsPath(book, "triangles").slice(1)}.html`);
      if (!existsSync(file)) return; // captured by CI in this PR; asserted once committed
      const body = readFileSync(file, "utf8");
      for (const id of ids(book)) {
        if (WITHHELD_QUESTION_IDS.has(id)) continue;
        const a = id.toLowerCase();
        expect(body, id).toContain(`data-testid="ncs-q-${a}"`);
        expect(body, id).toContain(`data-testid="ncs-sol-${a}"`);
      }
    });
  }
});

describe("CONTROLS — every detector fires on synthetic violating input", () => {
  it("copyProblems", () => {
    expect(copyProblems("Only ₹599, predicted, guaranteed, leaked paper, coming soon")).toEqual([
      "coming soon",
      "predicted",
      "guaranteed",
      "leaked",
      "a price (rupee sign)",
    ]);
    expect(copyProblems("2,341 students checked today")).toEqual(["an invented count"]);
    expect(copyProblems("Only 3 left! 2 hours left")).toEqual(["a timer"]);
  });
  it("pageChrome() drops only question cards: a forbidden word outside a card is still caught", () => {
    const html =
      '<main><p>Guaranteed marks!</p><article data-testid="ncs-q-x"><p>does not guarantee similarity</p></article></main>';
    const chrome = pageChrome(html);
    expect(chrome).not.toContain("does not guarantee");
    expect(copyProblems(chrome.replace(/<[^>]+>/g, " "))).toEqual(["guaranteed"]);
  });
  it("block() finds a nested block and its hidden flag", () => {
    const html = '<div data-testid="x" hidden=""><div>a</div><ol><li>1</li></ol></div><p>after</p>';
    expect(block(html, "x")).toBe('<div data-testid="x" hidden=""><div>a</div><ol><li>1</li></ol></div>');
    expect(openTag(block(html, "x")!)).toMatch(/\shidden(?:=""|\s|>)/);
    expect(block(html, "missing")).toBeNull();
  });
});
