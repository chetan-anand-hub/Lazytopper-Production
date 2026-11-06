import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import SolutionsPage from "../pages/SolutionsPage";
import {
  SOLUTIONS_CHAPTERS,
  booksOf,
  hasBook,
  parseScienceRef,
  publishedRows,
  scienceGroups,
  scienceRefLabel,
  solutionsPath,
  solutionsPaths,
  solutionsTitle,
} from "./solutionsPublishSafe";
import { SOLUTIONS_SCI_LEDGER } from "./solutionsSciLedger";
import { NCERT_CLASS10_CHAPTERS } from "./ncertBooks";
import { ensureBankSubject, getBankRows } from "../data/bankChapters/loader";
import { WITHHELD_QUESTION_IDS } from "../data/canonicalQuestionBank";
import { correctOptionIndex } from "../lib/solutions/compareAnswer";
import { rowHash, verdictEligibility, MIN_ROWS_PER_PAGE, type Row } from "../../scripts/solutions/selectSolutions";
import {
  SCIENCE_SOLUTIONS_SLUGS,
  SCI_BLOCK_BEGIN,
  SCI_BLOCK_END,
  classifyScienceRow,
  committedScienceBlocks,
  emitScienceBlock,
  emitSciencePagesBlock,
  scienceSolutionsChapters,
  scienceSyllabusGuard,
  selectAllScience,
  selectScienceChapter,
  stepMarkingReason,
  type ScienceChapterSelection,
  type ScienceChapterSpec,
} from "../../scripts/solutions/selectScienceSolutions";

/**
 * SOLUTIONS-SCI-1 (owner approval, 6 Nov 2026) — free, attempt-first NCERT Class 10 SCIENCE
 * solutions pages (pilot: Ch 1 Chemical Reactions and Equations, Ch 5 Life Processes, Ch 11
 * Electricity), NCERT textbook only.
 *
 *   (a) DETERMINISM: re-running the selection on the live bank + ledger reproduces the committed
 *       SOLUTIONS-SCI blocks of solutionsPublishSafe.ts and solutionsPages.ts exactly;
 *   (b) SCOPE: the pages are the covered NCERT Science chapters under their /notes slugs; no Science
 *       Exemplar page exists (no verified Exemplar Science rows);
 *   (c) PUBLISHED ROWS: each is served, not withheld, verified in the ledger with its live hash
 *       (book check MATCH + blind solve agrees), passes every rule, and MCQs have one correct option;
 *   (d) PAGES RENDER: every published row, attempt-first, under its book reference, in the book's
 *       in-text / examples / exercises groups, with the Notes / Formulae / Read NCERT / Practice links;
 *   (e) CONTROLS: every rule fires on synthetic violating input (syllabus guard read, not retyped).
 * Registration (canonical, sitemap, head, JSON-LD, llms.txt) is asserted for EVERY solutions page,
 * Science included, by solutions2Selection.guard.test.tsx (b).
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
const SCI = SOLUTIONS_CHAPTERS.filter((c) => c.subject === "Science");

let selections: ScienceChapterSelection[] = [];
beforeAll(async () => {
  await ensureBankSubject("Science");
  selections = await selectAllScience();
}, 120_000);

describe("(a) the committed Science allowlist is exactly what the script selects", () => {
  it("solutionsPublishSafe.ts + solutionsPages.ts SOLUTIONS-SCI blocks", () => {
    const committed = committedScienceBlocks();
    expect(committed.publishSafe).toBe(emitScienceBlock(selections));
    expect(committed.pages).toBe(emitSciencePagesBlock(selections));
    expect(read("src/config/solutionsPublishSafe.ts").split(SCI_BLOCK_BEGIN)).toHaveLength(2);
    expect(read("src/config/solutionsPublishSafe.ts").split(SCI_BLOCK_END)).toHaveLength(2);
  });
});

describe("(b) scope: the covered NCERT Science chapters, NCERT book only", () => {
  it("the pilot chapters, under their /notes and /ncert-class-10 slugs and 2026-27 chapter numbers", () => {
    expect([...SCIENCE_SOLUTIONS_SLUGS]).toEqual(["chemical-reactions-and-equations", "life-processes", "electricity"]);
    const sci = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === "Science");
    expect(sci).toHaveLength(13);
    for (const spec of scienceSolutionsChapters()) {
      const row = sci.find((r) => r.slug === spec.slug)!;
      expect([spec.chapter, spec.title]).toEqual([row.chapter, row.title]);
    }
    expect(SCI.map((c) => [c.slug, c.chapter])).toEqual([
      ["chemical-reactions-and-equations", 1],
      ["life-processes", 5],
      ["electricity", 11],
    ]);
  });
  it("no Science Exemplar page, and every Science page has at least the minimum rows", () => {
    for (const ch of SCI) {
      expect(ch.exemplar, ch.slug).toEqual([]);
      expect(booksOf(ch), ch.slug).toEqual(["ncert"]);
      expect(ch.ncert.length, ch.slug).toBeGreaterThanOrEqual(MIN_ROWS_PER_PAGE);
      expect(ch.boardPattern, ch.slug).toBeUndefined();
      expect(solutionsPaths()).not.toContain(solutionsPath("exemplar", ch.slug));
    }
    for (const id of Object.keys(SOLUTIONS_SCI_LEDGER)) expect(id, "an Exemplar row in the Science ledger").toMatch(/-NCERT-\d+-/);
  });
});

describe("(c) every published Science row is served, verified, and passes every rule", () => {
  it("served, never withheld, unique, ledger publish with its live hash, book check MATCH + blind solve agrees", () => {
    const guard = scienceSyllabusGuard();
    const seen = new Set<string>();
    let mcq = 0;
    for (const ch of SCI) {
      const served = getBankRows([ch.slug]);
      const spec: ScienceChapterSpec = { slug: ch.slug, chapter: ch.chapter, title: ch.title };
      const rows = publishedRows(served, ch, "ncert");
      expect(rows.map(({ q }) => q.id)).toEqual(ch.ncert.map((r) => r.id));
      for (const { q, safe } of rows) {
        expect(WITHHELD_QUESTION_IDS.has(q.id), q.id).toBe(false);
        expect(seen.has(q.id), `${q.id} twice`).toBe(false);
        seen.add(q.id);
        const l = SOLUTIONS_SCI_LEDGER[q.id];
        expect(l?.status, q.id).toBe("publish");
        expect(l.hash, q.id).toBe(rowHash(q as Row));
        expect(l.note, q.id).toContain("book check MATCH");
        expect(l.note, q.id).toContain("blind solve agrees");
        expect(classifyScienceRow(q as Row, spec, guard)?.reason, q.id).toBeNull();
        expect(stepMarkingReason(q as Row), q.id).toBeNull();
        expect(parseScienceRef(q.ncertRef), q.id).not.toBeNull();
        if (Array.isArray(q.options) && q.options.length > 0) {
          mcq += 1;
          expect(correctOptionIndex(String(q.answer), q.options), q.id).not.toBeNull();
        }
        // A typed ✓/✗ only where code says the key is one comparable value (never mark a correct student wrong).
        if (safe.verdict === "value") expect(verdictEligibility(q as Row).verdict, q.id).toBe(true);
      }
    }
    expect(seen.size).toBe(88);
    expect(mcq).toBeGreaterThan(0);
  });
  it("no ledger hold / ref-mismatch id is published, and each hold says why", () => {
    const published = new Set(SCI.flatMap((c) => c.ncert.map((r) => r.id)));
    for (const [id, l] of Object.entries(SOLUTIONS_SCI_LEDGER)) {
      if (l.status === "hold" || l.status === "ref-mismatch") {
        expect(published.has(id), id).toBe(false);
        expect(l.note.length, id).toBeGreaterThan(20);
      }
    }
    // The 2026-27 reprint's Exercise Q17 reads 44 Ω / 5 A; the bank row still has the older data.
    expect(SOLUTIONS_SCI_LEDGER["ELEC-NCERT-11-SA-034"].status).toBe("hold");
  });
  it("the per-chapter selection is the recorded one (published / held / excluded by rule)", () => {
    const counts = selections.map((s) => {
      const by: Record<string, number> = {};
      for (const e of s.excluded) by[String(e.reason)] = (by[String(e.reason)] ?? 0) + 1;
      return [s.spec.slug, s.ncert.length, by];
    });
    expect(counts).toEqual([
      ["chemical-reactions-and-equations", 21, { "source-others": 1, held: 4, "exemplar-unverified": 43 }],
      ["life-processes", 23, { held: 11, "exemplar-unverified": 81 }],
      ["electricity", 44, { "needs-figure": 4, "source-others": 2, syllabus: 1, held: 3, "exemplar-unverified": 35 }],
    ]);
  });
});

describe("(d) the Science pages render their rows, attempt-first, under their book references", () => {
  const render = (path: string) =>
    renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <SolutionsPage />
      </MemoryRouter>,
    );
  for (const ch of SCI) {
    const p = solutionsPath("ncert", ch.slug);
    it(p, () => {
      const html = render(p);
      expect(html).toContain(`<h1>${solutionsTitle("ncert", ch)}</h1>`);
      expect(solutionsTitle("ncert", ch)).toBe(`NCERT Solutions Class 10 Science Chapter ${ch.chapter} ${ch.title}`);
      const rows = publishedRows(getBankRows([ch.slug]), ch, "ncert");
      const cards = [...html.matchAll(/data-testid="ncs-q-([a-z0-9-]+)"/g)].map((m) => m[1]);
      // Book order: in-text questions, worked examples, chapter-end exercises.
      const want = scienceGroups(rows).flatMap((g) => g.rows.map(({ q }) => q.id.toLowerCase()));
      expect(cards).toEqual(want);
      expect([...cards].sort()).toEqual(rows.map(({ q }) => q.id.toLowerCase()).sort());
      const headings = [...html.matchAll(/<section[^>]*class="lt-ncs__group"[^>]*><h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
      expect(headings).toEqual(scienceGroups(rows).map((g) => g.title));
      const labels = [...html.matchAll(/<span class="lt-ncs__ref">([^<]*)<\/span>/g)].map((m) => m[1]);
      expect(labels).toHaveLength(rows.length);
      for (const l of labels) expect(l).toMatch(/^(?:In-text Q\d+ · (?:Section \d+(?:\.\d+)+|after Example \d+\.\d+)|Example \d+\.\d+|Exercise Q\d+)$/);
      // Attempt first: every solution is in the HTML, hidden until an attempt.
      for (const { q } of rows) expect(html).toMatch(new RegExp(`data-testid="ncs-sol-${q.id.toLowerCase()}"[^>]*hidden|hidden=""[^>]*data-testid="ncs-sol-${q.id.toLowerCase()}"`));
      // Links: notes, formulae, the NCERT reader for this chapter, practice, Check my answer; no Exemplar sibling.
      expect(html).toContain(`href="/notes/${ch.slug}"`);
      expect(html).toContain(`href="/notes/${ch.slug}#formulae"`);
      expect(html).toContain(`Read NCERT Chapter ${ch.chapter} (jesc1${String(ch.chapter).padStart(2, "0")})`);
      expect(html).toContain(`/practice/10/Science?topic=${ch.slug}`);
      expect(html).toContain('href="/check-improve"');
      expect(html).not.toContain(`href="${solutionsPath("exemplar", ch.slug)}"`);
      expect(html).not.toContain('data-testid="ncs-board"');
      expect(html).toContain("NCERT Class 10 Science textbook");
      expect(html).not.toMatch(/Mathematics|Exemplar Problems/);
    });
  }
  it("an unknown Science book page is not a page (no Exemplar Science URL)", () => {
    expect(render("/ncert-exemplar/electricity")).not.toContain("ncert-solutions-page");
  });
});

describe("CONTROLS — every Science rule fires on synthetic violating input", () => {
  const guard = scienceSyllabusGuard();
  const spec: ScienceChapterSpec = { slug: "electricity", chapter: 11, title: "Electricity" };
  const base: Row = {
    id: "ELEC-NCERT-11-SA-901",
    topicKey: "electricity",
    subtopic: "Ohm's Law Application",
    format: "Short",
    marks: 3,
    questionText: "A 12 V battery drives 2 A through a resistor. Find its resistance.",
    solutionSteps: ["[1 mark] V = IR.", "[1 mark] R = V/I = 12/2.", "[1 mark] R = 6 Ω."],
    finalAnswer: "6 Ω",
    ncertRef: "Exercise Q99",
  };
  const reason = (patch: Partial<Row>) => classifyScienceRow({ ...base, ...patch }, spec, guard)?.reason;

  it("the clean synthetic row is a candidate; another chapter's or a non-book row is not considered", () => {
    expect(reason({})).toBeNull();
    expect(classifyScienceRow({ ...base, id: "PYQ-S-2025-ELEC-901" }, spec, guard)).toBeNull();
    expect(classifyScienceRow({ ...base, topicKey: "life-processes" }, spec, guard)).toBeNull();
  });
  it("book rules: Exemplar, chapter, withheld, source, format, reference", () => {
    expect(reason({ id: "ELEC-EXMPLR-11-SA-901" })).toBe("exemplar-unverified");
    expect(reason({ id: "ELEC-NCERT-12-SA-901" })).toBe("other-chapter");
    expect(classifyScienceRow(base, spec, guard, new Set([base.id]))?.reason).toBe("withheld");
    expect(reason({ sourceOverride: "others" })).toBe("source-others");
    expect(reason({ format: "Assertion-Reasoning" })).toBe("adapted-format");
    expect(reason({ id: "ELEC-NCERT-11-CB-901" })).toBe("adapted-format");
    expect(reason({ ncertRef: "Exercise / In-text Q1 §11.2" })).toBe("ref-not-a-book-question");
    expect(reason({ ncertRef: "NCERT-style application" })).toBe("ref-not-a-book-question");
    expect(reason({ ncertRef: "In-text Q1 §11.2 (p. 176)" })).toBe("ref-stale-numbering");
    expect(reason({ ncertRef: "In-text Q1 §12.2" })).toBe("ref-stale-numbering");
    expect(reason({ ncertRef: "Example 12.1" })).toBe("ref-stale-numbering");
    for (const ref of ["In-text Q1 §11.6.1", "In-text Q2 (after §11.2)", "Example 11.3", "Exercise Q7"]) expect(reason({ ncertRef: ref }), ref).toBeNull();
  });
  it("the syllabus guard is READ (Evolution out; Heredity, Mendel, Sex Determination retained)", () => {
    expect(guard.bannedSubtopics).toContain("Natural Selection");
    expect(guard.bannedSubtopics).toContain("Homologous Organs");
    for (const kept of ["Heredity", "Mendel's contribution", "Laws of Inheritance", "Sex Determination"]) {
      expect(guard.bannedSubtopics.map((s) => s.toLowerCase())).not.toContain(kept.toLowerCase());
    }
    expect(reason({ subtopic: "Natural Selection" })).toBe("syllabus");
    expect(reason({ subtopic: "Sources of Energy" })).toBe("syllabus");
    expect(reason({ questionText: "Explain the principle of an Electric Motor." })).toBe("syllabus");
    expect(reason({ solutionSteps: ["[1 mark] Electromagnetic induction gives …", "[1 mark] x", "[1 mark] y"] })).toBe("syllabus");
    const lp: ScienceChapterSpec = { slug: "heredity", chapter: 8, title: "Heredity" };
    const h = { ...base, id: "HERED-NCERT-8-SA-901", topicKey: "heredity", ncertRef: "Exercise Q9", subtopic: "Sex Determination", questionText: "How is the sex of a child determined in human beings?" };
    expect(classifyScienceRow(h, lp, guard)?.reason).toBeNull();
    expect(classifyScienceRow({ ...h, subtopic: "Evolution" }, lp, guard)?.reason).toBe("syllabus");
  });
  it("figure rules: a figure, table-figure or drawing is out; 'draw' as current is not a drawing", () => {
    expect(reason({ questionText: "In the circuit shown in the figure, find R." })).toBe("needs-figure");
    expect(reason({ questionText: "Draw a schematic diagram of a circuit with a 6 V battery." })).toBe("needs-figure");
    expect(reason({ questionText: "Plot a graph between V and I." })).toBe("needs-figure");
    expect(reason({ requiresDiagram: true })).toBe("needs-figure");
    expect(reason({ solutionSteps: ["[1 mark] From the figure, R1 = 2 Ω.", "[1 mark] x", "[1 mark] y"] })).toBe("needs-figure");
    expect(reason({ questionText: "How much current will an electric bulb draw from a 220 V source?" })).toBeNull();
    expect(reason({ questionText: "What current will the heater draw if the potential difference is increased to 120 V?" })).toBeNull();
    expect(reason({ questionText: "The heater draws a current of 4 A at 60 V. Find R." })).toBeNull();
  });
  it("garbled-text rules; a decimal quantity is not a mark bleed", () => {
    expect(reason({ questionText: `Find R ${String.fromCharCode(0xfffd)}.` })).toBe("garbled");
    expect(reason({ questionText: "Find R. 3 (a) Find I." })).toBe("garbled");
    expect(reason({ questionText: "A current of 0.5 A is drawn for 10 minutes. Find the charge." })).toBeNull();
    expect(reason({ solutionSteps: ["[1 mark] R = 6? Actually R = 3.", "[1 mark] x", "[1 mark] y"] })).toBe("garbled");
    expect(reason({ finalAnswer: "", answer: "" })).toBe("garbled");
  });
  it("CBSE step marking (CLAUDE.md §13): minimum steps per mark value, [N mark] prefixes summing to the marks", () => {
    expect(reason({ solutionSteps: ["[1.5 marks] V = IR.", "[1.5 marks] R = 6 Ω."] })).toBe("step-marking");
    expect(reason({ solutionSteps: ["[1 mark] V = IR.", "[1 mark] R = 12/2.", "[0.5 mark] R = 6 Ω."] })).toBe("step-marking");
    expect(reason({ solutionSteps: ["V = IR.", "R = 12/2.", "R = 6 Ω."] })).toBe("step-marking");
    expect(reason({ solutionSteps: ["[1 mark] V = IR.", "R = 12/2.", "[2 marks] R = 6 Ω."] })).toBe("step-marking");
    expect(reason({ marks: 7 })).toBe("step-marking");
    expect(stepMarkingReason({ marks: 1, solutionSteps: ["P ∝ V², so P = 25 W."] })).toBeNull();
    expect(stepMarkingReason({ marks: 5, solutionSteps: ["[1 mark] a", "[1 mark] b", "[1 mark] c", "[1 mark] d"] })).toMatch(/minimum 5/);
    expect(stepMarkingReason({ marks: 5, solutionSteps: ["[1 mark] a", "[1 mark] b", "[1 mark] c", "[1 mark] d", "[0.5 mark] e", "[0.5 mark] f"] })).toBeNull();
  });
  it("MCQ key must be exactly one option", () => {
    expect(reason({ marks: 1, solutionSteps: ["6 Ω."], options: ["6 Ω", "6 Ω", "3 Ω", "2 Ω"], answer: "6 Ω" })).toBe("mcq-key-ambiguous");
    expect(reason({ marks: 1, solutionSteps: ["6 Ω."], options: ["6 Ω", "12 Ω", "3 Ω", "2 Ω"], answer: "6 Ω" })).toBeNull();
  });
  it("ledger: unverified, changed, held and ref-mismatch rows are never published; duplicates and thin pages drop", () => {
    const rows: Row[] = Array.from({ length: 7 }, (_, i) => ({
      ...base,
      id: `ELEC-NCERT-11-SA-9${String(i).padStart(2, "0")}`,
      ncertRef: `Exercise Q${90 + i}`,
      questionText: `${base.questionText} Variant ${i}.`,
    }));
    const ledger = Object.fromEntries(rows.map((r) => [r.id, { status: "publish" as const, hash: rowHash(r), note: "" }]));
    expect(selectScienceChapter(rows, spec, guard, ledger).ncert).toHaveLength(7);
    expect(selectScienceChapter(rows, spec, guard, {}).excluded.every((e) => e.reason === "unverified")).toBe(true);
    const edited = rows.map((r, i) => (i === 0 ? { ...r, finalAnswer: "7 Ω" } : r));
    expect(selectScienceChapter(edited, spec, guard, ledger).excluded.find((e) => e.id === rows[0].id)?.reason).toBe("unverified");
    const held = { ...ledger, [rows[0].id]: { status: "hold" as const, note: "x" }, [rows[1].id]: { status: "ref-mismatch" as const, note: "y" } };
    const sel = selectScienceChapter(rows, spec, guard, held);
    expect(sel.ncert.map((r) => r.id)).toEqual(rows.slice(2).map((r) => r.id));
    expect(sel.excluded.map((e) => e.reason)).toEqual(expect.arrayContaining(["held", "ref-mismatch"]));
    const dup = selectScienceChapter([...rows, { ...rows[2], id: "ELEC-NCERT-11-SA-999" }], spec, guard, ledger);
    expect(dup.excluded.find((e) => e.id === "ELEC-NCERT-11-SA-999")?.reason).toBe("duplicate");
    const thin = selectScienceChapter(rows.slice(0, MIN_ROWS_PER_PAGE - 1), spec, guard, ledger);
    expect(thin.ncert).toEqual([]);
    expect(thin.excluded.every((e) => e.reason === "thin-page")).toBe(true);
  });
  it("the Science reference parser, label and grouping", () => {
    expect(scienceRefLabel("In-text Q1 §11.6.1")).toBe("In-text Q1 · Section 11.6.1");
    expect(scienceRefLabel("In-text Q3 (after §5.2)")).toBe("In-text Q3 · Section 5.2");
    expect(scienceRefLabel("In-text Q1 after Example 9.2")).toBe("In-text Q1 · after Example 9.2");
    expect(scienceRefLabel("Example 11.10")).toBe("Example 11.10");
    expect(scienceRefLabel("Exercise Q12")).toBe("Exercise Q12");
    expect(scienceRefLabel("Exemplar MCQ Q1")).toBeNull();
    const g = scienceGroups(
      ["Exercise Q2", "Example 11.10", "In-text Q1 §11.6.1", "Exercise Q10", "In-text Q2 §11.2", "Example 11.2", "Odd ref"].map((ncertRef) => ({ q: { ncertRef } })),
    );
    expect(g.map((x) => [x.title, x.rows.map((r) => r.q.ncertRef)])).toEqual([
      ["In-text questions", ["In-text Q2 §11.2", "In-text Q1 §11.6.1"]],
      ["Worked examples", ["Example 11.2", "Example 11.10"]],
      ["Chapter-end exercises", ["Exercise Q2", "Exercise Q10"]],
    ]);
  });
  it("hasBook: no Science chapter has an Exemplar book", () => {
    for (const ch of SCI) expect(hasBook(ch, "exemplar")).toBe(false);
  });
});
