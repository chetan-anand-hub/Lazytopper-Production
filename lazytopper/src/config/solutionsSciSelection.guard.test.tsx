import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import SolutionsPage from "../pages/SolutionsPage";
import {
  SOLUTIONS_CHAPTERS,
  booksOf,
  boardPatternRows,
  hasBook,
  hintRevealsAnswer,
  isObjectiveRow,
  bookChapterNo,
  parseScienceExemplarRef,
  parseScienceRef,
  scienceExemplarGroups,
  scienceExemplarRefLabel,
  publishedRows,
  scienceGroups,
  scienceRefLabel,
  solutionsChapter,
  solutionsHeadDescription,
  solutionsHeadTitle,
  solutionsPath,
  solutionsPaths,
  solutionsTitle,
  stripStepMark,
} from "./solutionsPublishSafe";
import { SOLUTIONS_SCI_LEDGER } from "./solutionsSciLedger";
import { NCERT_CLASS10_CHAPTERS } from "./ncertBooks";
import { ensureBankSubject, getBankRows } from "../data/bankChapters/loader";
import { WITHHELD_QUESTION_IDS } from "../data/canonicalQuestionBank";
import { compareAnswer, correctOptionIndex, parseQuantity } from "../lib/solutions/compareAnswer";
import { getSolutionFigures } from "../diagrams/registry";
import { rowHash, MIN_ROWS_PER_PAGE, type Row } from "../../scripts/solutions/selectSolutions";
import {
  EXEMPLAR_SCIENCE_CHAPTER,
  SCIENCE_SOLUTIONS_SLUGS,
  SIGN_CONVENTION_SLUGS,
  offBookTerms,
  scienceVerdictEligibility,
  signConventionVerdict,
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
 * SOLUTIONS-SCI-1/2 (owner approval, 6 Nov 2026) — free, attempt-first NCERT Class 10 SCIENCE
 * solutions pages: SCI-1 piloted Ch 1, 5 and 11; SCI-2 covers all 13 chapters of the 2026-27 book
 * (Heredity has no page: only 3 rows clear the bar, below the 5-row floor). NCERT textbook only;
 * Exemplar Science is SOLUTIONS-SCI-3.
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
  await ensureBankSubject("Maths"); // the Maths-parity check renders the Triangles page
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

describe("(b) scope: the 13 Science chapters, NCERT textbook and (SCI-3) NCERT Exemplar", () => {
  it("all 13 chapters selected, under their /notes and /ncert-class-10 slugs and 2026-27 chapter numbers", () => {
    const sci = NCERT_CLASS10_CHAPTERS.filter((r) => r.book === "Science");
    expect(sci).toHaveLength(13);
    expect([...SCIENCE_SOLUTIONS_SLUGS]).toEqual(sci.map((r) => r.slug));
    for (const spec of scienceSolutionsChapters()) {
      const row = sci.find((r) => r.slug === spec.slug)!;
      expect([spec.chapter, spec.title]).toEqual([row.chapter, row.title]);
    }
    // Every chapter has a page in at least one book. Heredity: Exemplar only (no NCERT row clears the bar); Magnetic Effects and Our Environment: NCERT only.
    expect(SCI.map((c) => [c.slug, c.chapter])).toEqual(sci.map((r) => [r.slug, r.chapter]));
    expect(Object.fromEntries(SCI.map((c) => [c.slug, booksOf(c).join("+")]))).toEqual({
      "chemical-reactions-and-equations": "ncert+exemplar", "acids-bases-and-salts": "ncert+exemplar",
      "metals-and-non-metals": "ncert+exemplar", "carbon-and-its-compounds": "ncert+exemplar",
      "life-processes": "ncert+exemplar", "control-and-coordination": "ncert+exemplar",
      "how-do-organisms-reproduce": "ncert+exemplar", heredity: "exemplar",
      "light-reflection-and-refraction": "ncert+exemplar", "human-eye-and-colourful-world": "ncert+exemplar",
      electricity: "ncert+exemplar", "magnetic-effects-of-electric-current": "ncert", "our-environment": "ncert",
    });
    // Heredity: none of its NCERT rows clears the bar (off-book terms, holds), so no NCERT page.
    expect(selections.find((x) => x.spec.slug === "heredity")?.ncert).toEqual([]);
  });
  it("every published Science book page has at least the minimum rows; each book's rows carry its own ids", () => {
    for (const ch of SCI) {
      for (const book of ["ncert", "exemplar"] as const) {
        if (hasBook(ch, book)) expect(ch[book].length, `${ch.slug} ${book}`).toBeGreaterThanOrEqual(MIN_ROWS_PER_PAGE);
        else expect(solutionsPaths(), `${ch.slug} ${book}`).not.toContain(solutionsPath(book, ch.slug));
      }
      for (const r of ch.ncert) expect(r.id).toMatch(/-NCERT-\d+-/);
      for (const r of ch.exemplar) expect(r.id).toMatch(/-EXMPLR-\d+-/);
      expect(ch.boardPattern, ch.slug).toBeUndefined();
    }
  });
  it("SCI-3: each Exemplar page uses the Exemplar book's OWN chapter number (old numbering), mapped by content", () => {
    expect(Object.fromEntries(Object.entries(EXEMPLAR_SCIENCE_CHAPTER).map(([k, v]) => [k, v.file]))).toEqual({
      "chemical-reactions-and-equations": "jeep101", "acids-bases-and-salts": "jeep102", "metals-and-non-metals": "jeep103",
      "carbon-and-its-compounds": "jeep104", "life-processes": "jeep106", "control-and-coordination": "jeep107",
      "how-do-organisms-reproduce": "jeep108", heredity: "jeep109", "light-reflection-and-refraction": "jeep110",
      "human-eye-and-colourful-world": "jeep111", electricity: "jeep112", "magnetic-effects-of-electric-current": "jeep113",
      "our-environment": "jeep115",
    });
    // jeep105 (Periodic Classification), jeep114 (Sources of Energy), jeep116 (Natural Resources): deleted chapters, no page.
    const files = Object.values(EXEMPLAR_SCIENCE_CHAPTER).map((v) => v.file);
    for (const f of ["jeep105", "jeep114", "jeep116", "jeep117", "jeep118"]) expect(files).not.toContain(f);
    for (const ch of SCI) {
      if (!hasBook(ch, "exemplar")) continue;
      expect(bookChapterNo(ch, "exemplar"), ch.slug).toBe(EXEMPLAR_SCIENCE_CHAPTER[ch.slug].chapter);
      expect(solutionsHeadTitle("exemplar", ch), ch.slug).toContain("Class 10 Science");
    }
    expect(solutionsTitle("exemplar", solutionsChapter("life-processes")!)).toBe("NCERT Exemplar Solutions Class 10 Science Chapter 6 Life Processes");
  });
});

describe("(c) every published Science row is served, verified, and passes every rule", () => {
  it("served, never withheld, unique, ledger publish with its live hash, book check MATCH + blind solve agrees", () => {
    const guard = scienceSyllabusGuard();
    const seen = new Set<string>();
    let mcq = 0;
    let verdicts = 0;
    for (const ch of SCI) {
      const served = getBankRows([ch.slug]);
      const spec: ScienceChapterSpec = { slug: ch.slug, chapter: ch.chapter, title: ch.title, exemplarChapter: EXEMPLAR_SCIENCE_CHAPTER[ch.slug].chapter };
      for (const book of ["ncert", "exemplar"] as const) {
      const rows = publishedRows(served, ch, book);
      expect(rows.map(({ q }) => q.id)).toEqual(ch[book].map((r) => r.id));
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
        if (book === "ncert") expect(parseScienceRef(q.ncertRef), q.id).not.toBeNull();
        else expect(parseScienceExemplarRef(q.ncertRef, q.format), q.id).not.toBeNull();
        if (Array.isArray(q.options) && q.options.length > 0) {
          mcq += 1;
          expect(correctOptionIndex(String(q.answer), q.options), q.id).not.toBeNull();
        }
        // A typed ✓/✗ only where code says the key is ONE SI quantity (#1604; never mark a correct student wrong).
        if (safe.verdict === "value") {
          expect(scienceVerdictEligibility(q as Row).verdict, q.id).toBe(true);
          expect(SIGN_CONVENTION_SLUGS.has(ch.slug), q.id).toBe(false);
          const key = String(q.finalAnswer);
          const k = parseQuantity(key, "science")!;
          const rhs = key.slice(key.lastIndexOf("=") + 1).replace(/\.\s*$/, "").trim(); // "300 C"
          const unit = rhs.replace(/^[-−\d./\s]+/, "").trim(); // "C"
          for (const form of [key, rhs, `${k.value}${unit}`, ` ${rhs} `]) {
            expect(compareAnswer(form, key, "science").verdict, `${q.id}: "${form}"`).toBe("right");
          }
          // #1604 final: a bare number is never ticked; a wrong value with the unit is wrong.
          expect(compareAnswer(String(k.value), key, "science").verdict, `${q.id}: bare`).toBe("none");
          expect(compareAnswer(`${k.value * 2} ${unit}`, key, "science").verdict, `${q.id}: wrong value`).toBe("wrong");
          verdicts += 1;
        }
      }
      }
    }
    expect(seen.size).toBe(150 + 175); // NCERT + Exemplar
    expect(mcq).toBeGreaterThan(0);
    expect(verdicts).toBe(6); // Electricity SA-004 / 008 / 015 / 016 / 024 / 026
  });
  it("#1605 review, item 1: NO published row uses a word outside the 2026-27 NCERT textbook (mechanical, every row)", () => {
    let checked = 0;
    for (const ch of SCI) {
      for (const book of ["ncert", "exemplar"] as const) {
        for (const { q } of publishedRows(getBankRows([ch.slug]), ch, book)) {
          expect(offBookTerms(q as Row), q.id).toEqual([]);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(150 + 175); // NCERT + Exemplar: the rule runs over both books
    // The reviewer's named rows are out, by the rule (or, for METAL-3-SA-007, by the ledger).
    const published = new Set(SCI.flatMap((c) => [...c.ncert, ...c.exemplar].map((r) => r.id)));
    for (const id of [
      "ACID-NCERT-2-VSA-006", "ACID-NCERT-2-VSA-003", "ACID-NCERT-2-VSA-019", "METAL-NCERT-3-VSA-005", "METAL-NCERT-3-SA-007",
      "CARB-NCERT-4-VSA-002", "CARB-NCERT-4-SA-003", "CARB-NCERT-4-VSA-005", "CARB-NCERT-4-VSA-012", "CARB-NCERT-4-VSA-017",
      "REPR-NCERT-7-SA-006", "CTRL-NCERT-6-SA-009", "CTRL-NCERT-6-SA-003",
    ]) expect(published.has(id), id).toBe(false);
    // "thermite": NCERT Ch 3 spells it "thermit" (the thermit reaction), so it is on the reviewed list.
    expect(published.has("CHEM-NCERT-1-MCQ-002")).toBe(true);
  });
  it("#1605 review, item 3: one rule for a summary final step (final value with unit = content; restatement = hold)", () => {
    const published = new Set(SCI.flatMap((c) => c.ncert.map((r) => r.id)));
    const outcome: Record<string, boolean> = {
      "LIGHT-NCERT-9-LA-001": true, "LIGHT-NCERT-9-LA-006": true, "LIGHT-NCERT-9-LA-012": true, "LIGHT-NCERT-9-LA-005": true,
      "ELEC-NCERT-11-LA-014": true,
      "LIGHT-NCERT-9-LA-009": false, "ACID-NCERT-2-SA-003": false, "LIGHT-NCERT-9-SA-006": false,
    };
    for (const [id, pub] of Object.entries(outcome)) expect(published.has(id), id).toBe(pub);
  });
  it("no ledger hold / ref-mismatch id is published, and each hold says why", () => {
    const published = new Set(SCI.flatMap((c) => [...c.ncert, ...c.exemplar].map((r) => r.id)));
    for (const [id, l] of Object.entries(SOLUTIONS_SCI_LEDGER)) {
      if (l.status === "hold" || l.status === "ref-mismatch") {
        expect(published.has(id), id).toBe(false);
        expect(l.note.length, id).toBeGreaterThan(20);
      }
    }
    // The 2026-27 reprint's Exercise Q17 reads 44 Ω / 5 A; the bank row still has the older data.
    expect(SOLUTIONS_SCI_LEDGER["ELEC-NCERT-11-SA-034"].status).toBe("hold");
    // Review of #1602 (6 Nov): the named defects are held, never published.
    for (const id of [
      "CHEM-NCERT-1-SA-009", "CHEM-NCERT-1-LONG-001", "ELEC-NCERT-11-LA-002", "CHEM-NCERT-1-SA-001", "CHEM-NCERT-1-LONG-002",
      "LIFE-NCERT-5-SA-002", "LIFE-NCERT-5-SA-009", "LIFE-NCERT-5-SA-004", "LIFE-NCERT-5-LONG-001", "LIFE-NCERT-5-MCQ-004",
    ]) {
      expect(SOLUTIONS_SCI_LEDGER[id]?.status, id).toBe("hold");
      expect(published.has(id), id).toBe(false);
    }
  });
  it("the per-chapter selection is the recorded one (published / held / excluded by rule)", () => {
    const counts = selections.map((s) => {
      const by: Record<string, number> = {};
      for (const e of s.excluded) by[String(e.reason)] = (by[String(e.reason)] ?? 0) + 1;
      return [s.spec.slug, s.ncert.length, s.exemplar.length, by];
    });
    expect(counts).toEqual([
      ["chemical-reactions-and-equations", 10, 10, { held: 12, "off-book-term": 33, "source-others": 3, syllabus: 1 }],
      ["acids-bases-and-salts", 15, 16, { "off-book-term": 37, held: 6, "source-others": 4, "needs-figure": 2 }],
      ["metals-and-non-metals", 5, 31, { "off-book-term": 37, "ref-mismatch": 3, held: 12, "source-others": 2, "needs-figure": 1 }],
      ["carbon-and-its-compounds", 6, 18, { "off-book-term": 51, held: 2, "needs-figure": 3 }],
      ["life-processes", 7, 9, { "off-book-term": 80, held: 4, "ref-mismatch": 14, "source-others": 1 }],
      ["control-and-coordination", 5, 22, { "off-book-term": 42, "source-others": 3, held: 2 }],
      ["how-do-organisms-reproduce", 5, 17, { "off-book-term": 48, held: 8, "source-others": 3 }],
      ["heredity", 0, 9, { "off-book-term": 24, "ref-not-a-book-question": 2, held: 1 }],
      ["light-reflection-and-refraction", 28, 16, { held: 9, "source-others": 4, "needs-figure": 2, "off-book-term": 11, "step-marking": 1 }],
      ["human-eye-and-colourful-world", 14, 13, { held: 4, "off-book-term": 10, "source-others": 1 }],
      ["electricity", 38, 14, { held: 14, "needs-figure": 3, "off-book-term": 13, "source-others": 6, syllabus: 1 }],
      ["magnetic-effects-of-electric-current", 11, 0, { "off-book-term": 20, "source-others": 4, held: 7, "needs-figure": 1 }],
      ["our-environment", 6, 0, { "ref-stale-numbering": 7, "off-book-term": 2 }],
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
  for (const ch of SCI.filter((c) => hasBook(c, "ncert"))) {
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
      // Links: notes, formulae, the NCERT reader for this chapter, practice, Check my answer; the Exemplar
      // sibling exactly when that page exists (SCI-3).
      expect(html).toContain(`href="/notes/${ch.slug}"`);
      expect(html).toContain(`href="/notes/${ch.slug}#formulae"`);
      expect(html).toContain(`Read NCERT Chapter ${ch.chapter} (jesc1${String(ch.chapter).padStart(2, "0")})`);
      expect(html).toContain(`/practice/10/Science?topic=${ch.slug}`);
      expect(html).toContain('href="/check-improve"');
      expect(html.includes(`href="${solutionsPath("exemplar", ch.slug)}"`)).toBe(hasBook(ch, "exemplar"));
      expect(html).not.toContain('data-testid="ncs-board"');
      expect(html).toContain("NCERT Class 10 Science textbook");
      expect(html).not.toMatch(/Mathematics|Exemplar Problems/);
    });
  }
  it("review of #1602: every Science head title says 'Class 10 Science'; Ch 1 uses its short title", () => {
    for (const ch of SCI) expect(solutionsHeadTitle("ncert", ch), ch.slug).toContain("Class 10 Science");
    expect(solutionsHeadTitle("ncert", solutionsChapter("chemical-reactions-and-equations")!)).toBe(
      "NCERT Solutions Class 10 Science Ch 1 Chemical Reactions",
    );
  });
  it("review of #1602: objective rows show no [N mark]; no hint gives the answer away (Science pages)", () => {
    for (const ch of SCI) {
      const html = render(solutionsPath("ncert", ch.slug));
      for (const { q } of publishedRows(getBankRows([ch.slug]), ch, "ncert")) {
        const a = q.id.toLowerCase();
        const card = html.slice(html.indexOf(`data-testid="ncs-q-${a}"`));
        const cardEnd = card.indexOf("</article>");
        const body = card.slice(0, cardEnd);
        if (isObjectiveRow(q)) expect(body, q.id).not.toMatch(/\[\s*\d+(?:\.\d+)?\s*marks?\s*\]/i);
        expect(body.includes(`data-testid="ncs-hint-${a}"`), q.id).toBe(!hintRevealsAnswer(q));
      }
    }
    // #1605 second review, item 2: no hint on a definition / nature question, on a solution of 3 steps or
    // fewer, or when step 1 already names a word of the final answer.
    for (const [slug, id] of [
      ["human-eye-and-colourful-world", "EYE-NCERT-10-SA-006"], ["light-reflection-and-refraction", "LIGHT-NCERT-9-SA-010"],
      ["electricity", "ELEC-NCERT-11-SA-007"],
    ] as const) expect(hintRevealsAnswer(getBankRows([slug]).find((r) => r.id === id)!), id).toBe(true);
    // Review of #1605 (b): a step 1 that states the conclusion is not a hint.
    expect(hintRevealsAnswer(getBankRows(["electricity"]).find((r) => r.id === "ELEC-NCERT-11-SA-018")!)).toBe(true);
    for (const id of ["CHEM-NCERT-1-VSA-002", "CHEM-NCERT-1-SA-012", "LIFE-NCERT-5-VSA-011", "LIFE-NCERT-5-VSA-013", "LIFE-NCERT-5-SA-005", "LIFE-NCERT-5-LONG-002"]) {
      expect(SOLUTIONS_SCI_LEDGER[id]?.status, id).toBe("hold");
    }
    // The named MCQs: no hint (step 1 names the answer), no step marks.
    for (const id of ["LIFE-NCERT-5-MCQ-001", "LIFE-NCERT-5-MCQ-002", "CHEM-NCERT-1-MCQ-003"]) {
      const q = getBankRows([id.startsWith("LIFE") ? "life-processes" : "chemical-reactions-and-equations"]).find((r) => r.id === id)!;
      expect(hintRevealsAnswer(q), id).toBe(true);
    }
  });
  it("Maths pages are untouched by the Science-only page rules (hint offered from step 1 as before)", () => {
    const tri = solutionsChapter("triangles")!;
    const html = render(solutionsPath("ncert", "triangles"));
    const hints = [...html.matchAll(/data-testid="ncs-hint-/g)].length;
    const rows = publishedRows(getBankRows(["triangles"]), tri, "ncert").filter(({ q }) => (q.solutionSteps ?? []).length > 0);
    expect(hints).toBe(rows.length + boardPatternRows(getBankRows(["triangles"]), tri, "ncert").length);
  });
  for (const ch of SCI.filter((c) => hasBook(c, "exemplar"))) {
    const p = solutionsPath("exemplar", ch.slug);
    it(`${p} (SCI-3)`, () => {
      const html = render(p);
      expect(html).toContain(`<h1>${solutionsTitle("exemplar", ch)}</h1>`);
      const rows = publishedRows(getBankRows([ch.slug]), ch, "exemplar");
      const cards = [...html.matchAll(/data-testid="ncs-q-([a-z0-9-]+)"/g)].map((m) => m[1]);
      expect(cards).toEqual(scienceExemplarGroups(rows).flatMap((g) => g.rows.map(({ q }) => q.id.toLowerCase())));
      const headings = [...html.matchAll(/<section[^>]*class="lt-ncs__group"[^>]*><h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
      expect(headings).toEqual(scienceExemplarGroups(rows).map((g) => g.title));
      for (const l of [...html.matchAll(/<span class="lt-ncs__ref">([^<]*)<\/span>/g)].map((m) => m[1])) expect(l).toMatch(/^Exemplar Q\d+(?:\([a-z](?:[–-][a-z])?\))?$/);
      for (const { q } of rows) expect(html).toMatch(new RegExp(`data-testid="ncs-sol-${q.id.toLowerCase()}"[^>]*hidden|hidden=""[^>]*data-testid="ncs-sol-${q.id.toLowerCase()}"`));
      expect(html.includes(`href="${solutionsPath("ncert", ch.slug)}"`)).toBe(hasBook(ch, "ncert"));
      expect(html).toContain("Exemplar Problems");
      expect(html).not.toContain("lt-solfig");
    });
  }
  it("a Science book page with no rows is not a page", () => {
    expect(render("/ncert-exemplar/our-environment")).not.toContain("ncert-solutions-page");
    expect(render("/ncert-exemplar/magnetic-effects-of-electric-current")).not.toContain("ncert-solutions-page");
    expect(render("/ncert-solutions/heredity")).not.toContain("ncert-solutions-page");
  });
});

describe("CONTROLS — every Science rule fires on synthetic violating input", () => {
  const guard = scienceSyllabusGuard();
  const spec: ScienceChapterSpec = { slug: "electricity", chapter: 11, title: "Electricity", exemplarChapter: 12 };
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
    // SCI-3: Exemplar rows use the Exemplar book's references and its OLD chapter number (Electricity = 12).
    expect(reason({ id: "ELEC-EXMPLR-11-SA-901", ncertRef: "Exemplar SA Q19" })).toBeNull();
    expect(reason({ id: "ELEC-EXMPLR-11-SA-901", ncertRef: "Exemplar Ex 12.2 Q19 (SA)" })).toBeNull();
    expect(reason({ id: "ELEC-EXMPLR-11-SA-901", ncertRef: "Exemplar Ex 11.2 Q19 (SA)" })).toBe("ref-stale-numbering");
    expect(reason({ id: "ELEC-EXMPLR-11-SA-901", ncertRef: "Exercise Q5" })).toBe("ref-not-a-book-question");
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
    const lp: ScienceChapterSpec = { slug: "heredity", chapter: 8, title: "Heredity", exemplarChapter: 9 };
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
    // SCI-2: unprefixed steps are fine when they meet the CBSE minimum count (the Maths bar).
    expect(reason({ solutionSteps: ["V = IR.", "R = 12/2.", "R = 6 Ω."] })).toBeNull();
    expect(reason({ solutionSteps: ["V = IR, so R = 12/2.", "R = 6 Ω."] })).toBe("step-marking");
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
  it("#1605 review: the off-book detector and the definition-question hint rule (controls)", () => {
    const row = (steps: string[], questionText = "Why should equations be balanced?") => ({ questionText, solutionSteps: steps, finalAnswer: "x" });
    expect(offBookTerms(row(["Atoms are equal on both sides, therefore the equation is balanced."]))).toEqual([]);
    expect(offBookTerms(row(["Balance by stoichiometry using moles."]))).toEqual(["moles", "stoichiometry"]);
    expect(offBookTerms(row(["The lattice holds ions."]))).toEqual(["lattice"]);
    expect(offBookTerms(row(["The lattice holds ions."], "Describe the ionic lattice."))).toEqual([]); // the question's own word
    expect(offBookTerms(row(["The thermite reaction joins railway tracks."]))).toEqual([]); // NCERT's "thermit"
    const def = (questionText: string) =>
      hintRevealsAnswer({ questionText, solutionSteps: ["Given: n = 2.42.", "a", "b", "c"], finalAnswer: "Light is slower in diamond." });
    expect(def("The refractive index of diamond is 2.42. What is the meaning of this statement?")).toBe(true);
    expect(def("What is meant by power of 2 D?")).toBe(true);
    expect(def("Define 1 volt.")).toBe(true);
    expect(def("What does 2.42 mean here?")).toBe(true);
    expect(def("What is the nature and power of the lens for a far point of 80 cm?")).toBe(true);
    expect(def("Find the speed of light in a medium of index 2.42.")).toBe(false);
    expect(hintRevealsAnswer({ questionText: "Find R for 12 V and 2 A.", solutionSteps: ["Given: V = 12 V, I = 2 A.", "R = V/I"], finalAnswer: "6 Ω" })).toBe(true);
  });
  it("#1605 review, item 4: a title ending in '?' ends its own sentence (no '?.')", () => {
    const ch = solutionsChapter("how-do-organisms-reproduce")!;
    expect(solutionsHeadDescription("ncert", ch)).not.toContain("?.");
    expect(read("public/llms.txt")).not.toMatch(/\?\./);
  });
  it("page-rule helpers: strip only a leading step mark; hint reveal detector", () => {
    expect(stripStepMark("[0.5 mark] Kidneys remove wastes.")).toBe("Kidneys remove wastes.");
    expect(stripStepMark("[1 mark] x [1 mark]")).toBe("x [1 mark]");
    expect(stripStepMark("No mark here.")).toBe("No mark here.");
    expect(isObjectiveRow({ options: ["a", "b"], marks: 1 })).toBe(true);
    expect(isObjectiveRow({ marks: 1 })).toBe(true);
    expect(isObjectiveRow({ marks: 3 })).toBe(false);
    const opts = ["nutrition", "respiration", "excretion", "transportation"];
    expect(hintRevealsAnswer({ options: opts, answer: "excretion", solutionSteps: ["Kidneys belong to the excretion system."] })).toBe(true);
    // A theory nudge is still not a SETUP step: Science theory rows get no hint at all.
    expect(hintRevealsAnswer({ options: opts, answer: "excretion", solutionSteps: ["Think about what the kidneys remove from blood."] })).toBe(true);
    expect(hintRevealsAnswer({ options: ["1/25", "1/5", "5", "25"], answer: "25", questionText: "Wire R is cut into 5 equal parts joined in parallel; R/R' is", solutionSteps: ["Each part has resistance r = R/5.", "b", "c", "d"] })).toBe(false);
    expect(hintRevealsAnswer({ finalAnswer: "300 C", questionText: "0.5 A for 10 minutes. Find the charge.", solutionSteps: ["Given: I = 0.5 A, t = 600 s.", "b", "c", "d"] })).toBe(false);
    expect(hintRevealsAnswer({ finalAnswer: "300 C", questionText: "0.5 A for 10 minutes.", solutionSteps: ["Q = It = 300 C."] })).toBe(true);
    expect(hintRevealsAnswer({ finalAnswer: "(a) 4 Ω (b) 1 Ω", questionText: "Get 4 Ω and 1 Ω from 3 Ω and 6 Ω.", solutionSteps: ["(a) R' = 3×6/9 = 2 Ω"] })).toBe(true);
    expect(hintRevealsAnswer({ options: opts, answer: "excretion", solutionSteps: ["… Answer: (C)"] })).toBe(true);
    expect(hintRevealsAnswer({ finalAnswer: "6 Ω", questionText: "12 V drives 2 A. Find R.", solutionSteps: ["Use V = IR.", "b", "c", "d"] })).toBe(false);
    expect(hintRevealsAnswer({ finalAnswer: "A continuous closed conducting path for current.", solutionSteps: ["An electric circuit is a continuous closed conducting path for current."] })).toBe(true);
    expect(hintRevealsAnswer({ finalAnswer: "x", solutionSteps: [] })).toBe(true);
  });
  it("SCI-2: figure rows are exactly the rows whose answer is a bound solution figure; no typed verdict in optics", () => {
    const figureRows = SCI.flatMap((c) => c.ncert.filter((r) => r.figure).map((r) => r.id));
    expect(figureRows).toEqual(["LIGHT-NCERT-9-LA-007", "LIGHT-NCERT-9-LA-010", "LIGHT-NCERT-9-LA-011"]);
    for (const ch of SCI) {
      for (const r of [...ch.ncert, ...ch.exemplar]) expect(Boolean(r.figure), r.id).toBe(getSolutionFigures(r.id).length > 0);
      if (SIGN_CONVENTION_SLUGS.has(ch.slug)) expect([...ch.ncert, ...ch.exemplar].filter((r) => r.verdict), ch.slug).toEqual([]);
    }
  });
  it("SCI-2: the figure mounts only after an attempt, so the prerendered page is deterministic", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/ncert-solutions/light-reflection-and-refraction"]}>
        <SolutionsPage />
      </MemoryRouter>,
    );
    expect(html).toContain('data-testid="ncs-q-light-ncert-9-la-010"');
    expect(html).not.toContain("lt-solfig");
  });
  it("SCI-2: a bound SOLUTION figure makes a drawing question publishable; a QUESTION figure never does", () => {
    const light: ScienceChapterSpec = { slug: "light-reflection-and-refraction", chapter: 9, title: "Light", exemplarChapter: 10 };
    const ray = { ...base, id: "LIGHT-NCERT-9-LA-010", topicKey: light.slug, ncertRef: "Exercise Q10", questionText: "Draw the ray diagram and find the image." };
    expect(classifyScienceRow(ray, light, guard)?.reason).toBeNull();
    expect(classifyScienceRow({ ...ray, id: "LIGHT-NCERT-9-LA-901" }, light, guard)?.reason).toBe("needs-figure");
    expect(classifyScienceRow({ ...ray, id: "LIGHT-NCERT-9-SA-009" }, light, guard)?.reason).toBe("needs-figure");
  });
  it("SCI-2: Science verdict opt-in (#1604 units), never in sign-convention chapters", () => {
    const yes = { verdict: true, why: "f = 10 cm" };
    expect(signConventionVerdict("light-reflection-and-refraction", yes).verdict).toBe(false);
    expect(signConventionVerdict("human-eye-and-colourful-world", yes).verdict).toBe(false);
    expect(signConventionVerdict("electricity", yes).verdict).toBe(true);
    const sv = (finalAnswer: string, questionText = "Find the current.") => scienceVerdictEligibility({ ...base, finalAnswer, questionText }).verdict;
    expect(sv("I = 0.5 A")).toBe(true);
    expect(sv("R = 15 Ω")).toBe(true);
    expect(sv("R ≈ 3.4 Ω")).toBe(false);
    expect(sv("4.8 × 10⁶ J")).toBe(false);
    expect(sv("0.5 A and 2 A")).toBe(false);
    expect(sv("I = 0.5 A", "(i) Find I. (ii) Find V.")).toBe(false);
  });
  it("SCI-3: the Exemplar Science reference parser, label and grouping", () => {
    expect(parseScienceExemplarRef("Exemplar Ex 6.1 Q1 (MCQ)")).toEqual({ chapter: 6, section: "mcq", n: 1, part: null });
    expect(parseScienceExemplarRef("Exemplar SA Q19")).toEqual({ chapter: null, section: "sa", n: 19, part: null });
    expect(parseScienceExemplarRef("Exemplar Q13", "Short")).toEqual({ chapter: null, section: "sa", n: 13, part: null });
    expect(parseScienceExemplarRef("Exemplar Q25 (LA)")).toEqual({ chapter: null, section: "la", n: 25, part: null });
    expect(parseScienceExemplarRef("Exemplar Ex 4.1 Q1", "MCQ")?.section).toBe("mcq");
    expect(parseScienceExemplarRef("Exemplar Ex 1.2 Q20a (SA)")?.part).toBe("a");
    expect(parseScienceExemplarRef("Exemplar Q13")).toBeNull(); // no section anywhere: not shown
    expect(parseScienceExemplarRef("Exemplar-style question")).toBeNull();
    expect(scienceExemplarRefLabel("Exemplar Ex 1.2 Q20b–d (SA)")).toBe("Exemplar Q20(b–d)");
    const g = scienceExemplarGroups(
      ["Exemplar LA Q30", "Exemplar MCQ Q3", "Exemplar SA Q20", "Exemplar MCQ Q1"].map((ncertRef) => ({ q: { ncertRef } })),
    );
    expect(g.map((x) => [x.title, x.rows.map((r) => r.q.ncertRef)])).toEqual([
      ["Multiple choice questions", ["Exemplar MCQ Q1", "Exemplar MCQ Q3"]],
      ["Short answer questions", ["Exemplar SA Q20"]],
      ["Long answer questions", ["Exemplar LA Q30"]],
    ]);
  });
});
