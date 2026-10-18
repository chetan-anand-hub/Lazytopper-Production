import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import SolutionsPage from "../pages/SolutionsPage";
import { solutionsHrefForRow } from "../pages/NcertBooksPage";
import {
  bankSlugOf,
  booksOf,
  hasBook,
  publishedRows,
  SOLUTIONS_CHAPTERS,
  SOLUTIONS_PAGES,
  solutionsBreadcrumbName,
  solutionsChapter,
  solutionsHeadDescription,
  solutionsHeadTitle,
  solutionsLlmsLines,
  solutionsPath,
  solutionsPaths,
  solutionsTitle,
  type SolutionsBook,
  type SolutionsChapter,
} from "./solutionsPublishSafe";
import { SOLUTIONS_2_LEDGER } from "./solutions2Ledger";
import { NCERT_CLASS10_CHAPTERS } from "./ncertBooks";
import { SELF_CANONICAL_EXACT, SITE_ORIGIN } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { ensureBankSubject, getBankRows } from "../data/bankChapters/loader";
import { WITHHELD_QUESTION_IDS } from "../data/canonicalQuestionBank";
import { compareAnswer, correctOptionIndex } from "../lib/solutions/compareAnswer";
import { ROUTE_CHUNK_MODULES, STATIC_PAGE_HEADS, solutionsJsonLd } from "../../scripts/seo/writeStaticHeads";
import { llmsSolutionsLines, rewriteLlms } from "../../scripts/solutions/writeLlmsSolutions";
import {
  classifyRow,
  committedBlock,
  emitBlock,
  emitPagesBlock,
  MIN_ROWS_PER_PAGE,
  PAGES_BEGIN,
  PAGES_END,
  readSyllabusGuard,
  refKey,
  rowHash,
  selectAll,
  selectChapter,
  solutions2Chapters,
  verdictEligibility,
  type ChapterSelection,
  type ChapterSpec,
  type Row,
} from "../../scripts/solutions/selectSolutions";

/**
 * SOLUTIONS-2 (owner ruling, 18 Oct 2026) — the NCERT + Exemplar solutions pages for the 13 Maths
 * chapters after the Triangles pilot.
 *
 *   (a) DETERMINISM: re-running the selection script on the live bank + ledger reproduces the
 *       committed generated blocks of solutionsPublishSafe.ts and solutionsPages.ts exactly;
 *   (b) REGISTRATION: every chapter × published book has its URL in EVERY registration set
 *       (self-canonical, sitemap / prerender, static head within caps, route chunk, JSON-LD,
 *       llms.txt), a book with no rows is in NONE of them, and the Triangles strings are
 *       byte-identical to SOLUTIONS-1's;
 *   (c) PUBLISHED ROWS: each is served (not withheld), verified in the ledger, MCQs have exactly
 *       one option equal to the key, and every ✓/✗ row (MCQ + typed verdict) was blind-solved;
 *   (d) PAGES RENDER: each new page renders its rows; sibling links only to a published book;
 *   (e) CONTROLS: every rule fires on synthetic violating input.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
const S2 = SOLUTIONS_CHAPTERS.filter((c) => c.decision === "SOLUTIONS-2 (owner 18 Oct)");
const BOOKS = ["ncert", "exemplar"] as const;

let selections: ChapterSelection[] = [];
beforeAll(async () => {
  await ensureBankSubject("Maths");
  selections = await selectAll();
}, 120_000);

describe("(a) the committed allowlist is exactly what the script selects", () => {
  it("solutionsPublishSafe.ts generated block", () => {
    expect(committedBlock()).toBe(emitBlock(selections));
  });
  it("solutionsPages.ts generated block", () => {
    expect(committedBlock(read("src/config/solutionsPages.ts"), PAGES_BEGIN, PAGES_END)).toBe(emitPagesBlock(selections));
  });
  it("SOLUTIONS_PAGES is what SOLUTIONS_CHAPTERS implies (slug order; a book iff it has rows)", () => {
    expect(SOLUTIONS_PAGES.map((p) => ({ slug: p.slug, books: [...p.books] }))).toEqual(
      SOLUTIONS_CHAPTERS.filter((c) => booksOf(c).length > 0).map((c) => ({ slug: c.slug, books: booksOf(c) })),
    );
  });
  it("covers the 13 remaining Maths chapters of the 2026-27 book (Triangles is the pilot)", () => {
    const maths = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === "Maths");
    expect(maths).toHaveLength(14);
    expect(solutions2Chapters().map((c) => c.chapter)).toEqual(maths.filter((r) => r.slug !== "triangles").map((r) => r.chapter));
    // Every chapter with a published book is in the allowlist; Trigonometry is two pages (Ch 8, Ch 9).
    expect(S2.map((c) => c.slug)).toContain("introduction-to-trigonometry");
    expect(S2.map((c) => c.slug)).toContain("some-applications-of-trigonometry");
    expect(S2.every((c) => booksOf(c).every((b) => c[b].length >= MIN_ROWS_PER_PAGE))).toBe(true);
  });
});

describe("(b) every chapter × published book is registered everywhere; nothing else is", () => {
  const llms = read("public/llms.txt");
  const sitemap = sitemapPaths();
  for (const ch of SOLUTIONS_CHAPTERS) {
    for (const book of BOOKS) {
      const p = solutionsPath(book, ch.slug);
      if (hasBook(ch, book)) {
        it(`${p}: canonical, sitemap/prerender, head, chunk, JSON-LD, llms.txt`, () => {
          expect(solutionsPaths()).toContain(p);
          expect(SELF_CANONICAL_EXACT).toContain(p);
          expect(sitemap).toContain(p);
          const head = STATIC_PAGE_HEADS[p];
          expect(head, p).toBeDefined();
          expect(head.title).toBe(solutionsHeadTitle(book, ch));
          expect(head.title.length).toBeLessThanOrEqual(60);
          expect(head.description.length).toBeLessThanOrEqual(155);
          expect(ROUTE_CHUNK_MODULES.some((e) => !e.exact && p.startsWith(e.prefix) && e.modules.includes("SolutionsPage"))).toBe(true);
          const ld = solutionsJsonLd(p, "") as { itemListElement: Array<{ name: string }> } | null;
          expect(ld?.itemListElement[2].name).toBe(solutionsBreadcrumbName(book, ch));
          expect(llms).toContain(`(${SITE_ORIGIN}${p}):`);
        });
      } else {
        it(`${p}: no rows, so registered NOWHERE`, () => {
          expect(solutionsPaths()).not.toContain(p);
          expect(SELF_CANONICAL_EXACT).not.toContain(p);
          expect(sitemap).not.toContain(p);
          expect(STATIC_PAGE_HEADS[p]).toBeUndefined();
          expect(solutionsJsonLd(p, "")).toBeNull();
          expect(llms).not.toContain(`${SITE_ORIGIN}${p})`);
        });
      }
    }
  }
  it("llms.txt's solutions lines are exactly the derived lines, in order", () => {
    expect(llmsSolutionsLines(llms)).toEqual(solutionsLlmsLines(SITE_ORIGIN));
  });
  it("Triangles' head, breadcrumb and llms.txt strings are byte-identical to SOLUTIONS-1", () => {
    const tri = solutionsChapter("triangles")!;
    expect(STATIC_PAGE_HEADS["/ncert-solutions/triangles"]).toEqual({
      title: "NCERT Solutions Class 10 Maths Chapter 6 Triangles",
      description:
        "Step-by-step NCERT solutions for Class 10 Maths Chapter 6 Triangles. Try each question " +
        "first, then see the full solution, free. No account needed.",
    });
    expect(STATIC_PAGE_HEADS["/ncert-exemplar/triangles"]).toEqual({
      title: "NCERT Exemplar Solutions Class 10 Maths Chapter 6 Triangles",
      description:
        "Step-by-step NCERT Exemplar solutions for Class 10 Maths Chapter 6 Triangles. Try each " +
        "question first, then see the full solution, free. No account needed.",
    });
    expect(solutionsBreadcrumbName("ncert", tri)).toBe("NCERT Solutions Chapter 6 Triangles");
    expect(solutionsBreadcrumbName("exemplar", tri)).toBe("NCERT Exemplar Solutions Chapter 6 Triangles");
    expect(solutionsLlmsLines(SITE_ORIGIN).slice(0, 2)).toEqual([
      "- [NCERT Solutions Class 10 Maths Chapter 6 Triangles](https://www.lazytopper.com/ncert-solutions/triangles): the NCERT textbook questions of Chapter 6 with step-by-step solutions; try each question first, then see the full solution",
      "- [NCERT Exemplar Solutions Class 10 Maths Chapter 6 Triangles](https://www.lazytopper.com/ncert-exemplar/triangles): NCERT Exemplar questions of Chapter 6 with step-by-step solutions",
    ]);
  });
  it("the NCERT books page links each Maths row to its solutions page (NCERT first), never to a missing one", () => {
    for (const row of NCERT_CLASS10_CHAPTERS) {
      const href = solutionsHrefForRow(row);
      if (href) expect(solutionsPaths()).toContain(href);
      const ch = SOLUTIONS_CHAPTERS.find((c) => bankSlugOf(c) === row.slug && c.chapter === row.chapter);
      expect(href, `${row.book} ${row.chapter}`).toBe(row.book === "Maths" && ch && booksOf(ch)[0] ? solutionsPath(booksOf(ch)[0], ch.slug) : null);
    }
  });
});

describe("(c) every published SOLUTIONS-2 row is served, verified, and every ✓/✗ row was blind-solved", () => {
  it("served by the bank, never withheld, unique across all pages", () => {
    const seen = new Set<string>();
    for (const ch of S2) {
      const served = new Set(getBankRows([bankSlugOf(ch)]).map((q) => q.id));
      for (const book of BOOKS) {
        for (const r of ch[book]) {
          expect(served.has(r.id), r.id).toBe(true);
          expect(WITHHELD_QUESTION_IDS.has(r.id), r.id).toBe(false);
          expect(seen.has(r.id), `${r.id} twice`).toBe(false);
          seen.add(r.id);
        }
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });
  it("each is in the ledger as publish / no-verdict; MCQs and verdict rows say 'blind solve agrees'", () => {
    for (const ch of S2) {
      const byId = new Map(getBankRows([bankSlugOf(ch)]).map((q) => [q.id, q] as const));
      for (const book of BOOKS) {
        for (const { q, safe } of publishedRows([...byId.values()], ch, book)) {
          const l = SOLUTIONS_2_LEDGER[q.id];
          expect(l, q.id).toBeDefined();
          expect(["publish", "no-verdict"], q.id).toContain(l.status);
          const mcq = Array.isArray(q.options) && q.options.length > 0;
          if (mcq) expect(correctOptionIndex(String(q.answer), q.options!), q.id).not.toBeNull();
          if (mcq || safe.verdict === "value") expect(l.note, q.id).toContain("blind solve agrees");
          if (safe.verdict === "value") {
            expect(l.status, q.id).toBe("publish");
            expect(verdictEligibility(q as Row).verdict, q.id).toBe(true);
            expect(compareAnswer(String(q.finalAnswer), String(q.finalAnswer)).verdict, q.id).toBe("right");
          }
        }
      }
    }
  });
  it("each published row's content still hashes to what the verifiers saw", () => {
    for (const ch of S2) {
      for (const book of BOOKS) {
        for (const { q } of publishedRows(getBankRows([bankSlugOf(ch)]), ch, book)) {
          expect(SOLUTIONS_2_LEDGER[q.id].hash, q.id).toBe(rowHash(q as Row));
        }
      }
    }
  });
  it("the blind sample covers >= 20% (ceil) of each page's no-verdict typed rows", () => {
    for (const ch of S2) {
      for (const book of BOOKS) {
        const plain = publishedRows(getBankRows([bankSlugOf(ch)]), ch, book).filter(
          ({ q, safe }) => !(Array.isArray(q.options) && q.options.length > 0) && safe.verdict !== "value",
        );
        const solved = plain.filter(({ q }) => SOLUTIONS_2_LEDGER[q.id].note.includes("blind solve agrees"));
        expect(solved.length, `${ch.slug} ${book}`).toBeGreaterThanOrEqual(Math.ceil(plain.length * 0.2));
      }
    }
  });
  it("Trigonometry: the two pages split the bank chapter by the id's chapter number (Exemplar Ch 8 holds both)", () => {
    const intro = solutionsChapter("introduction-to-trigonometry")!;
    const apps = solutionsChapter("some-applications-of-trigonometry")!;
    expect([intro.chapter, apps.chapter, bankSlugOf(intro), bankSlugOf(apps)]).toEqual([8, 9, "trigonometry", "trigonometry"]);
    expect([...intro.ncert, ...intro.exemplar].every((r) => /-(?:NCERT|EXMPLR)-8-/.test(r.id))).toBe(true);
    expect([...apps.ncert, ...apps.exemplar].every((r) => /-(?:NCERT|EXMPLR)-9-/.test(r.id))).toBe(true);
    expect(apps.exemplarChapter).toBe(8);
  });
  it("the id allowlist stays out of the entry chunk: only the two lazy pages import solutionsPublishSafe", () => {
    const walk = (dir: string): string[] =>
      readdirSync(resolve(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(ts|tsx)$/.test(e.name) ? [`${dir}/${e.name}`] : [],
      );
    const importers = walk("src")
      .filter((f) => !/\.test\.tsx?$/.test(f) && !f.endsWith("solutionsPublishSafe.ts"))
      .filter((f) => /from\s+["'][^"']*solutionsPublishSafe["']/.test(read(f)));
    expect(importers.sort()).toEqual(["src/pages/NcertBooksPage.tsx", "src/pages/SolutionsPage.tsx"]);
    expect(read("src/config/canonicalUrl.ts")).toMatch(/from "\.\/solutionsPages"/);
    expect(read("src/config/solutionsPages.ts")).not.toMatch(/\b[rv]\("[A-Z]/);
  });
  it("no ledger hold / ref-mismatch id is published", () => {
    const published = new Set(S2.flatMap((c) => [...c.ncert, ...c.exemplar].map((r) => r.id)));
    for (const [id, l] of Object.entries(SOLUTIONS_2_LEDGER)) {
      if (l.status === "hold" || l.status === "ref-mismatch") expect(published.has(id), id).toBe(false);
    }
  });
});

describe("(d) the new pages render their rows, attempt-first, with honest sibling links", () => {
  const render = (path: string) =>
    renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <SolutionsPage />
      </MemoryRouter>,
    );
  for (const ch of S2) {
    for (const book of BOOKS) {
      const p = solutionsPath(book, ch.slug);
      it(`${p}`, () => {
        const html = render(p);
        if (!hasBook(ch, book)) {
          expect(html).not.toContain("ncert-solutions-page");
          return;
        }
        expect(html).toContain(`<h1>${solutionsTitle(book, ch)}</h1>`);
        // The page groups cards by exercise, so compare the SET of cards with the published rows.
        const cards = [...html.matchAll(/data-testid="ncs-q-([a-z0-9-]+)"/g)].map((m) => m[1]).sort();
        const want = publishedRows(getBankRows([bankSlugOf(ch)]), ch, book).map(({ q }) => q.id.toLowerCase()).sort();
        expect(cards).toEqual(want);
        expect(want.length).toBeGreaterThanOrEqual(MIN_ROWS_PER_PAGE);
        expect(html).toContain(`href="/notes/${bankSlugOf(ch)}"`);
        const sibling: SolutionsBook = book === "ncert" ? "exemplar" : "ncert";
        expect(html.includes(`href="${solutionsPath(sibling, ch.slug)}"`)).toBe(hasBook(ch, sibling));
      });
    }
  }
});

describe("CONTROLS — every rule fires on synthetic violating input", () => {
  const guard = readSyllabusGuard();
  const spec: ChapterSpec = { slug: "statistics", bank: "statistics", chapter: 13, title: "Statistics", exemplarChapter: 13 };
  const base: Row = {
    id: "STAT-N-EXEM-13-SA-901",
    topicKey: "statistics",
    subtopic: "Mean of Grouped Data",
    format: "Short",
    questionText: "Find the mean of: Class 0-10 → 3, 10-20 → 5, 20-30 → 2.",
    solutionSteps: ["Class marks 5, 15, 25.", "Σfx = 15 + 75 + 50 = 140, Σf = 10.", "Mean = 14."],
    finalAnswer: "Mean = 14.",
    ncertRef: "Exemplar Ex 13.3 Q99",
  };
  const reason = (patch: Partial<Row>, s: ChapterSpec = spec) => classifyRow({ ...base, ...patch }, s, guard).reason;

  it("the clean synthetic row is a candidate", () => {
    expect(reason({})).toBeNull();
  });
  it("source / format / reference rules", () => {
    expect(reason({ sourceOverride: "others" })).toBe("source-others");
    expect(reason({ format: "Assertion-Reasoning" })).toBe("adapted-format");
    expect(reason({ id: "STAT-N-EXEM-13-CB-901" })).toBe("adapted-format");
    expect(reason({ ncertRef: "Exemplar-style design task" })).toBe("ref-not-a-book-question");
    expect(reason({ ncertRef: "Exemplar Ex 13.3 Q2 (applied)" })).toBe("ref-not-a-book-question");
    expect(reason({ id: "STAT-N-NCERT-13-SA-901", ncertRef: "NCERT Section 14.2" })).toBe("ref-not-a-book-question");
    expect(reason({ id: "STAT-N-NCERT-13-SA-901", ncertRef: "NCERT Ex 14.1 Q1" })).toBe("ref-stale-numbering");
    expect(reason({ id: "STAT-N-NCERT-13-SA-901", ncertRef: "NCERT Example 5 (page 273)" })).toBe("ref-stale-numbering");
    expect(reason({ id: "STAT-N-NCERT-13-SA-901", ncertRef: "NCERT Ex 13.1 Q1" })).toBeNull();
    expect(reason({ ncertRef: "Exemplar Ex 14.1 Q1" })).toBe("ref-stale-numbering");
    expect(reason({ id: "STAT-N-PYQ-13-SA-901" })).toBe("not-a-book-id");
  });
  it("syllabus, figure and garbled-text rules", () => {
    expect(reason({ questionText: "Draw a less than type ogive for the data." })).toBe("syllabus");
    expect(reason({ subtopic: "Ogive" })).toBe("syllabus");
    expect(reason({ questionText: "In the figure, find the mean of the data shown." })).toBe("needs-figure");
    expect(reason({ solutionSteps: ["From the figure, the classes are …"] })).toBe("needs-figure");
    expect(reason({ questionText: `Find the mean ${String.fromCharCode(0xfffd)} of the data.` })).toBe("garbled");
    expect(reason({ questionText: "Find the mean. 3 (a) Use the step deviation method." })).toBe("garbled");
    expect(reason({ questionText: "Show that x = 1 … [Actually prove:] Prove x = 2." })).toBe("garbled");
    expect(reason({ solutionSteps: ["Area = 4s? Actually Area = r·s."] })).toBe("garbled");
    expect(reason({ questionText: "Can we find a₃₀ − a₂₀ without actually finding a₃₀?" })).toBeNull();
    expect(reason({ requiresDiagram: true })).toBe("needs-figure");
    expect(reason({ solutionSteps: ["Ã©tape one", "Mean = 14."] })).toBe("garbled");
    expect(classifyRow(base, spec, guard, new Set([base.id])).reason).toBe("withheld");
    expect(reason({ options: ["14", "14", "15", "16"], answer: "14" })).toBe("mcq-key-ambiguous");
    expect(reason({ options: ["13", "14", "15", "16"], answer: "14" })).toBeNull();
  });
  it("the syllabus guard is read from its file, not retyped", () => {
    expect(guard.bannedSubtopics).toContain("Frustum of Cone");
    expect(guard.bannedSubtopics).toContain("Ogive");
    expect(guard.surfacePhrases).toContain("Cumulative Frequency Graph");
    expect(guard.surfacePhrases).not.toContain("Natural Selection"); // a Science phrase stays out
  });
  it("verdict opt-in is decided by code; when in doubt, no verdict", () => {
    const v = (finalAnswer: string, questionText = "Find BD.") => verdictEligibility({ ...base, finalAnswer, questionText }).verdict;
    expect(v("BD = 55/3 cm.")).toBe(true);
    expect(v("Mean = 14.")).toBe(true);
    expect(v("x − y = 2.", "Find a relation between x and y.")).toBe(false);
    expect(v("3x + y = 5")).toBe(false);
    expect(v("k = 3, 4")).toBe(false);
    expect(v("x = 2 or x = 3")).toBe(false);
    expect(v("Area = 154 cm²")).toBe(false);
    expect(v("60°")).toBe(false);
    expect(v("1 : 2")).toBe(false);
    expect(v("BD = 6 cm", "Prove that BD = 6 cm.")).toBe(false);
    expect(v("2", "Find the zeroes of x² − 4.")).toBe(false);
    expect(v("2", "(i) Find a. (ii) Find b.")).toBe(false);
    expect(verdictEligibility({ ...base, options: ["1", "2"], answer: "1" }).verdict).toBe(false);
    // approximations: a correct equivalent form could be marked wrong, so no verdict
    expect(v("Area = 154", "Find the area of a circle of radius 7 cm. (Use π = 22/7)")).toBe(false);
    expect(v("17.32 m", "Find the height correct to two decimal places.")).toBe(false);
    expect(v("17.32 m", "Find the height of the tower (√3 = 1.732).")).toBe(false);
    expect(v("h ≈ 17.32 m")).toBe(false);
    expect(verdictEligibility({ ...base, finalAnswer: "Median = 149.03 cm", questionText: "Find the median.", solutionSteps: ["Median = 145 + 72.5/18 ≈ 149.03"] }).verdict).toBe(false);
  });
  it("duplicates: one row per book reference; the NCERT typed row beats its MCQ adaptation", () => {
    const ncertSpec: ChapterSpec = spec;
    const mcq: Row = { ...base, id: "STAT-N-NCERT-13-MCQ-901", ncertRef: "NCERT Ex 13.1 Q1", options: ["13", "14"], answer: "14" };
    const typed: Row = { ...base, id: "STAT-N-NCERT-13-SA-902", ncertRef: "NCERT Ex 13.1 Q1", questionText: base.questionText + " " };
    const others = fillers(5, "STAT-N-NCERT-13-SA-7", "NCERT Ex 13.2 Q");
    const ledger = ledgerFor([mcq, typed, ...others]);
    const sel = selectChapter([mcq, typed, ...others], ncertSpec, guard, ledger);
    expect(sel.ncert.map((r) => r.id)).toContain(typed.id); // the winner SURVIVES
    expect(sel.ncert.map((r) => r.id)).not.toContain(mcq.id);
    expect(sel.excluded.find((e) => e.id === mcq.id)?.reason).toBe("duplicate");
    // the same question under a different reference is a duplicate too
    const twin: Row = { ...others[0], id: "STAT-N-NCERT-13-SA-799", ncertRef: "NCERT Ex 13.3 Q1" };
    const sel2 = selectChapter([...others, twin], ncertSpec, guard, ledgerFor([...others, twin]));
    expect(sel2.excluded.find((e) => e.id === twin.id)?.detail).toMatch(/same question/);
    expect(refKey("exemplar", "Exemplar Sample Question 1 (page 50)")).not.toBe(refKey("exemplar", "Exemplar Sample Question 1 (page 54)"));
    expect(refKey("ncert", "NCERT Ex 6.2 Q7 (Theorem 6.1 application)")).toBe(refKey("ncert", "NCERT Ex 6.2 Q7"));
    expect(refKey("ncert", "NCERT Ex 1.1 Q1(i)")).not.toBe(refKey("ncert", "NCERT Ex 1.1 Q1(ii)"));
  });
  it("ledger: unverified, held and ref-mismatch rows are never published; a thin page is dropped", () => {
    const rows = fillers(7);
    const ledger = ledgerFor(rows);
    expect(selectChapter(rows, spec, guard, ledger).exemplar).toHaveLength(7);
    expect(selectChapter(rows, spec, guard, {}).excluded.every((e) => e.reason === "unverified")).toBe(true);
    // content changed after verification → unverified
    const edited = rows.map((r, i) => (i === 0 ? { ...r, finalAnswer: "Mean = 15." } : r));
    expect(selectChapter(edited, spec, guard, ledger).excluded.find((e) => e.id === rows[0].id)?.reason).toBe("unverified");
    // `no-verdict` downgrades a code-eligible typed row
    const nv = { ...ledger, [rows[0].id]: { ...ledger[rows[0].id], status: "no-verdict" as const } };
    const withNv = selectChapter(rows, spec, guard, nv);
    expect(withNv.exemplar.find((r) => r.id === rows[0].id)?.verdict).toBe(false);
    expect(withNv.exemplar.find((r) => r.id === rows[1].id)?.verdict).toBe(true);
    const held = { ...ledger, [rows[0].id]: { status: "hold" as const, note: "x" }, [rows[1].id]: { status: "ref-mismatch" as const, note: "y" } };
    const sel = selectChapter(rows, spec, guard, held);
    expect(sel.exemplar.map((r) => r.id)).toEqual(rows.slice(2).map((r) => r.id));
    expect(sel.excluded.map((e) => e.reason)).toEqual(expect.arrayContaining(["held", "ref-mismatch"]));
    const thin = selectChapter(rows.slice(0, MIN_ROWS_PER_PAGE - 1), spec, guard, ledger);
    expect(thin.exemplar).toEqual([]);
    expect(thin.excluded.every((e) => e.reason === "thin-page")).toBe(true);
  });
  it("head-text ladders fit their caps or throw; the llms rewrite needs one contiguous block", () => {
    const long: SolutionsChapter = {
      slug: "x", subject: "Maths", chapter: 3, title: "Pair of Linear Equations in Two Variables", decision: "t",
      ncert: [{ id: "a" }], exemplar: [{ id: "b" }],
    };
    expect(() => solutionsHeadTitle("ncert", long)).toThrow();
    expect(solutionsHeadTitle("ncert", { ...long, shortTitle: "Pair of Linear Equations" }).length).toBeLessThanOrEqual(60);
    expect(() => solutionsHeadDescription("exemplar", long)).toThrow();
    expect(solutionsHeadDescription("exemplar", { ...long, shortTitle: "Pair of Linear Equations" }).length).toBeLessThanOrEqual(155);
    const text = "a\n- [A](https://www.lazytopper.com/ncert-solutions/x): y\nb\n- [B](https://www.lazytopper.com/ncert-exemplar/x): z";
    expect(() => rewriteLlms(text, ["L"])).toThrow();
    expect(rewriteLlms("a\n- [A](https://www.lazytopper.com/ncert-solutions/x): y\nb", ["L1", "L2"])).toBe("a\nL1\nL2\nb");
  });

  function fillers(n: number, idPrefix = "STAT-N-EXEM-13-SA-8", refPrefix = "Exemplar Ex 13.3 Q"): Row[] {
    return Array.from({ length: n }, (_, i) => ({
      ...base,
      id: `${idPrefix}${String(i).padStart(2, "0")}`,
      ncertRef: `${refPrefix}${80 + i}`,
      questionText: `${base.questionText} Variant ${i}.`,
    }));
  }
  function ledgerFor(rows: readonly Row[]) {
    return Object.fromEntries(rows.map((r) => [r.id, { status: "publish" as const, hash: rowHash(r), note: "" }]));
  }
});
