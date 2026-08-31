// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
} from "../data/canonicalQuestionBank";
import type { CanonicalQuestion } from "../data/predictionTypes";
import {
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  dependsOnSuppliedFigure,
  escapeHtml,
  isFullyStepAnnotated,
  mathToText,
  renderPage,
  selectQuestions,
  stepMarkValue,
  stepMarksSumToMarks,
  yearAttribution,
  type NoteSpec,
} from "../../scripts/seo/questionPageModel";
import { ORIGIN, PAGES, RX } from "../../scripts/seo/generateQuestionPages";

/**
 * GUARD — ENGINE-0's static question pages.
 *
 * ★ WHY THIS FILE LIVES IN `src/config/` AND NOT NEXT TO THE GENERATOR.
 * There is no vitest project over `scripts/` — a suite written there would be
 * collected by nothing and would run in no gate, which is this repo's most
 * repeated defect shape. `lazytopper/vitest.config.ts` collects
 * `src/**\/*.test.{ts,tsx}` and CI runs the full lazytopper vitest suite, so a
 * test here actually executes. It reaches UP into `../../scripts/seo/` for the
 * pure model rather than re-implementing it: a second copy of the selection
 * rules would drift from the one the build runs and would then be green about
 * the wrong thing.
 *
 * ★★ WHAT IT ASSERTS ON. Two subjects, deliberately:
 *   - THE PURE FUNCTIONS, driven with fixtures, so each rule can be shown to
 *     REJECT and not merely to accept.
 *   - THE COMMITTED HTML ON DISK, which is what actually ships. A model that
 *     agrees with itself proves nothing about the bytes a crawler fetches.
 */

const LAZYTOPPER_ROOT = resolve(process.cwd());
const REPO_ROOT = resolve(LAZYTOPPER_ROOT, "..");
const PUBLIC_ROOT = resolve(LAZYTOPPER_ROOT, "public");
const VERCEL_JSON = resolve(REPO_ROOT, "vercel.json");
const SITEMAP = resolve(PUBLIC_ROOT, "sitemap.xml");

const PAGE = PAGES[0];
const PAGE_FILE = resolve(PUBLIC_ROOT, `.${PAGE.urlPath}index.html`);

function pageHtml(): string {
  expect(
    existsSync(PAGE_FILE),
    `the generated page is missing at ${PAGE_FILE}. Run ` +
      `\`pnpm --filter lazytopper run seo:questions\` and commit the output — the ` +
      `page is a COMMITTED artefact, not a build-time side effect.`,
  ).toBe(true);
  return readFileSync(PAGE_FILE, "utf8");
}

/** The ids the emitted page actually renders, read from the HTML, not the model. */
function emittedQuestionIds(html: string): string[] {
  return [...html.matchAll(/data-qid="([^"]+)"/g)].map((m) => m[1]);
}

function questionById(id: string): CanonicalQuestion {
  const q = canonicalQuestionBank.find((x) => x.id === id);
  expect(q, `emitted question id ${id} is not in the canonical bank`).toBeDefined();
  return q as CanonicalQuestion;
}

/** A minimal note spec, for driving `renderPage` on fixtures. */
const FIXTURE_NOTE: NoteSpec = {
  meta: {
    topic_key: "fixture-topic",
    subject: "physics",
    chapter_no: 9,
    title: "Fixture Topic",
    weightage: "high",
    source_edition: "NCERT Reprint 2026-27",
  },
  board_asks: "fixture board asks",
  big_idea: { tagline: null, body: null },
  definitions: [],
  formula_strip: [],
  pitfalls: [],
  source_ledger: [],
};

function fixtureQuestion(over: Partial<CanonicalQuestion> = {}): CanonicalQuestion {
  return {
    id: "FIXTURE-1",
    subject: "Science",
    topicKey: "fixture-topic",
    subtopic: "Fixture Subtopic",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText: "State the fixture law.",
    solutionSteps: ["[1 mark] First step.", "[1 mark] Second step."],
    finalAnswer: "The fixture law.",
    ...over,
  };
}

// ---------------------------------------------------------------------------

describe("ENGINE-0 · the rules are alive — each one can be shown to REJECT", () => {
  it("★ CONTROL — step-mark parsing accepts BOTH conventions and rejects an unannotated step", () => {
    // Leading form.
    expect(stepMarkValue("[1 mark] do the thing")).toBe(1);
    expect(stepMarkValue("  [0.5 marks] half a mark")).toBe(0.5);
    // Trailing form.
    expect(stepMarkValue("do the thing [2]")).toBe(2);
    // ★ AND IT SAYS NO. Without this the parser could return 0 for everything and
    // every sum check below would pass on garbage.
    expect(stepMarkValue("do the thing")).toBeNull();
    expect(stepMarkValue("[marks] no number")).toBeNull();
    expect(stepMarkValue("[3] not at the end, see")).toBeNull();

    // ⚠ NULL, NOT ZERO. A silent 0 would let an unannotated step ride inside a
    // sum that still matched — the sum check passing for the wrong reason.
    expect(stepMarkValue("unannotated")).not.toBe(0);

    // Both conventions survive the whole-question predicate.
    expect(isFullyStepAnnotated(fixtureQuestion())).toBe(true);
    expect(
      isFullyStepAnnotated(
        fixtureQuestion({ solutionSteps: ["first [1]", "second [1]"] }),
      ),
    ).toBe(true);
    // One bad step is enough to reject the question.
    expect(
      isFullyStepAnnotated(
        fixtureQuestion({ solutionSteps: ["[1 mark] fine", "not annotated"] }),
      ),
    ).toBe(false);
    // No steps at all is not "vacuously annotated".
    expect(isFullyStepAnnotated(fixtureQuestion({ solutionSteps: [] }))).toBe(false);
    expect(isFullyStepAnnotated(fixtureQuestion({ solutionSteps: undefined }))).toBe(false);
  });

  it("★ CONTROL — the sum check really rejects a mismatch, and tolerates half marks", () => {
    expect(stepMarksSumToMarks(fixtureQuestion())).toBe(true);
    expect(
      stepMarksSumToMarks(
        fixtureQuestion({
          marks: 3,
          solutionSteps: ["[0.5 marks] a", "[0.5 marks] b", "[2 marks] c"],
        }),
      ),
    ).toBe(true);
    // The rejecting half.
    expect(
      stepMarksSumToMarks(fixtureQuestion({ marks: 5 })),
      "steps summing to 2 must not satisfy a 5-mark question",
    ).toBe(false);
  });

  it("★★ CONTROL — the supplied-figure filter drops a referenced figure but KEEPS \"draw a ray diagram\"", () => {
    // A question that points at a figure the page does not have.
    expect(
      dependsOnSuppliedFigure(
        fixtureQuestion({ questionText: "Fig. 1 shows a convex lens. Find v." }),
      ),
    ).toBe(true);
    expect(dependsOnSuppliedFigure(fixtureQuestion({ requiresDiagram: true }))).toBe(true);
    expect(
      dependsOnSuppliedFigure(
        fixtureQuestion({ questionText: "In the diagram shown, find the image." }),
      ),
    ).toBe(true);

    // ★ THE HALF THAT MATTERS. "Draw a ray diagram" is an instruction to the
    // STUDENT, not a reference to a supplied figure — and it is how CBSE words
    // the 5-mark Light questions whose provenance line this lane exists to
    // render. A filter that banned the bare word "diagram" would silently delete
    // every genuine board question from this page.
    expect(
      dependsOnSuppliedFigure(
        fixtureQuestion({
          questionText:
            "Draw a ray diagram to show the formation of the image by a convex lens.",
        }),
      ),
      "a 'draw a ray diagram' question needs no supplied figure and must be kept",
    ).toBe(false);
  });
});

describe("ENGINE-0 · §3.1 no emitted question comes from an AI-generated pack", () => {
  it("★★ THE FABRICATION LINE — not one emitted id is in AI_GENERATED_PACK_SOURCES", () => {
    const ids = emittedQuestionIds(pageHtml());

    // Non-vacuous: zero ids would pass every membership test below.
    expect(ids.length, "no data-qid found in the page — this check would be vacuous")
      .toBeGreaterThanOrEqual(MIN_QUESTIONS);
    expect(ids.length).toBeLessThanOrEqual(MAX_QUESTIONS);

    // And the set we are checking against is itself non-empty, or "not a member"
    // would be true of everything.
    expect(
      AI_GENERATED_QUESTION_IDS.size,
      "AI_GENERATED_QUESTION_IDS is empty — the provenance check would be vacuous",
    ).toBeGreaterThan(0);

    const offenders = ids.filter((id) => AI_GENERATED_QUESTION_IDS.has(id));
    expect(
      offenders,
      `${offenders.length} emitted question(s) are AI-generated pack items. This ` +
        `page is indexed and screenshot-able; publishing a machine-written ` +
        `question as board material is fabrication:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);

    // eslint-disable-next-line no-console
    console.log(
      `ENGINE0_EMITTED_SCOPE: page=${PAGE.urlPath} questions=${ids.length} ` +
        `ai_pack_ids_known=${AI_GENERATED_QUESTION_IDS.size} offenders=${offenders.length}`,
    );
  });

  /**
   * ★★★ READ THIS BEFORE TRUSTING THE TEST ABOVE. It was mutation-tested by
   * disabling the provenance filter in `selectQuestions` and regenerating the
   * page — and IT STAYED GREEN, because the AI-pack questions in this topic sort
   * behind the authentic ones in every mark band, so the same twelve came out
   * and the emitted file was byte-identical (sha256 unchanged).
   *
   * That assertion is therefore NOT VACUOUS — it would catch a genuinely emitted
   * pack question — but on today's data it is not what holds the line. THE TEST
   * BELOW IS. It runs the real selector twice and compares the two pools, so it
   * moves when the filter stops working. Prefer a delta over a tick: if you ever
   * simplify this file, delete the tick, not the delta.
   */
  it("★ CONTROL — the selector DOES exclude AI-pack ids, proven by removing them from the set", () => {
    // ★ A DELTA, NOT A TICK. Run the real selector twice over the real bank: once
    // with the real AI-pack set, once with an EMPTY one. If the provenance filter
    // were dead, both runs would report the same `skippedAiPack`.
    const withFilter = selectQuestions(
      canonicalQuestionBank,
      PAGE.topicKey,
      AI_GENERATED_QUESTION_IDS,
    );
    const withoutFilter = selectQuestions(
      canonicalQuestionBank,
      PAGE.topicKey,
      new Set<string>(),
    );

    expect(
      withFilter.counts.skippedAiPack,
      "the provenance filter skipped nothing — it is not doing any work on this topic",
    ).toBeGreaterThan(0);
    expect(withoutFilter.counts.skippedAiPack).toBe(0);
    expect(
      withoutFilter.counts.eligible,
      "removing the AI-pack set must widen the eligible pool, or the filter is dead",
    ).toBeGreaterThan(withFilter.counts.eligible);

    // eslint-disable-next-line no-console
    console.log(
      `ENGINE0_PROVENANCE_DELTA: eligible_with_filter=${withFilter.counts.eligible} ` +
        `eligible_without_filter=${withoutFilter.counts.eligible} ` +
        `skipped_ai_pack=${withFilter.counts.skippedAiPack}`,
    );
  });
});

describe("ENGINE-0 · §3.2 every emitted question is fully step-annotated and sums to its marks", () => {
  it("★★ each emitted question, looked up in the bank, satisfies both rules", () => {
    const ids = emittedQuestionIds(pageHtml());
    expect(ids.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);

    const bad: string[] = [];
    for (const id of ids) {
      const q = questionById(id);
      if (!isFullyStepAnnotated(q)) bad.push(`${id}: a step carries no mark annotation`);
      else if (!stepMarksSumToMarks(q)) {
        const total = q.solutionSteps!.reduce((a, s) => a + (stepMarkValue(s) ?? 0), 0);
        bad.push(`${id}: steps sum to ${total} but the question is ${q.marks} marks`);
      }
    }
    expect(bad, `step-marking violations:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  it("★ step-marking is a FILTER, not a GATE — questions were skipped and the run still produced a page", () => {
    const { counts, selected } = selectQuestions(
      canonicalQuestionBank,
      PAGE.topicKey,
      AI_GENERATED_QUESTION_IDS,
    );
    // If nothing were ever skipped, "it does not fail the build" would be an
    // untested claim about a code path nothing exercises.
    expect(
      counts.skippedStepMarking,
      "no question was skipped for step-marking — the filter path is never exercised " +
        "on this topic, so 'it skips rather than throws' is unproven",
    ).toBeGreaterThan(0);
    expect(selected.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);

    // eslint-disable-next-line no-console
    console.log(
      `ENGINE0_FILTER_COUNTS: topic_total=${counts.topicTotal} ` +
        `skipped_ai_pack=${counts.skippedAiPack} skipped_figure=${counts.skippedFigure} ` +
        `skipped_step_marking=${counts.skippedStepMarking} skipped_sum=${counts.skippedSum} ` +
        `eligible=${counts.eligible} selected=${counts.selected} floor=${MIN_QUESTIONS}`,
    );
  });

  it("★★ THE FLOOR — it is EIGHT, and a 7-survivor topic emits NOTHING", () => {
    // ★★★ THE LITERAL 8 IS THE WHOLE ASSERTION, AND IT WAS LEARNED BY MUTATION.
    // This test first read `MIN_QUESTIONS - 1` / `MIN_QUESTIONS` throughout, which
    // made it SELF-REFERENTIAL: changing the constant to 4 moved the expectations
    // with it and the suite stayed GREEN — a silent no-op asserting only that
    // arithmetic works. The floor is an owner ruling with a number in it, so the
    // number is pinned here and the fixtures are sized with literals.
    expect(
      MIN_QUESTIONS,
      "the floor is an owner ruling: fewer than 8 survivors means NO page",
    ).toBe(8);
    expect(MAX_QUESTIONS, "§2.5 asks for 8–12 questions").toBe(12);

    // Drive the real selector over a tiny fixture bank. A thin page is worse than
    // no page, and this is the only way to show the floor is real without
    // deleting questions from the bank.
    const thin = Array.from({ length: 7 }, (_, i) => fixtureQuestion({ id: `THIN-${i}` }));
    const thinResult = selectQuestions(thin, "fixture-topic", new Set<string>());
    expect(thinResult.selected.length).toBe(7);
    expect(
      thinResult.selected.length < MIN_QUESTIONS,
      "a 7-question topic must fall below the floor",
    ).toBe(true);

    // And the control: one more question crosses it.
    const fat = Array.from({ length: 8 }, (_, i) => fixtureQuestion({ id: `FAT-${i}` }));
    const fatResult = selectQuestions(fat, "fixture-topic", new Set<string>());
    expect(fatResult.selected.length).toBe(8);
    expect(fatResult.selected.length >= MIN_QUESTIONS).toBe(true);

    // And the ceiling really caps: 20 eligible questions must yield 12, not 20.
    const many = Array.from({ length: 20 }, (_, i) =>
      fixtureQuestion({ id: `MANY-${String(i).padStart(2, "0")}` }),
    );
    expect(selectQuestions(many, "fixture-topic", new Set<string>()).selected.length).toBe(12);
  });
});

describe("ENGINE-0 · §3.3 no pyqYear is rendered for an AI-pack question", () => {
  it("★★★ THE DOCTRINE — yearAttribution suppresses an AI-pack question's year", () => {
    const authentic = fixtureQuestion({ id: "AUTHENTIC-1", pyqYear: "2023" });
    const aiPack = fixtureQuestion({ id: "AI-PACK-1", pyqYear: "2023" });
    const aiIds = new Set<string>(["AI-PACK-1"]);

    // The rendering half.
    expect(yearAttribution(authentic, aiIds)).toBe("From the 2023 CBSE board paper");
    // ★ THE SUPPRESSING HALF — the whole reason the function exists.
    expect(
      yearAttribution(aiPack, aiIds),
      "an AI-generated pack question carrying a pyqYear must NOT be attributed to a " +
        "CBSE board paper — that is a fabricated citation on an indexed page",
    ).toBeNull();
    // No year at all is also null, and a malformed year is not passed through.
    expect(yearAttribution(fixtureQuestion({ id: "NO-YEAR" }), aiIds)).toBeNull();
    expect(
      yearAttribution(fixtureQuestion({ id: "BAD-YEAR", pyqYear: "n/a" }), aiIds),
    ).toBeNull();
  });

  it("★★ AND IT HOLDS THROUGH THE RENDERER — an AI-pack year never reaches the HTML", () => {
    const aiIds = new Set<string>(["AI-PACK-1"]);
    const html = renderPage({
      note: FIXTURE_NOTE,
      questions: [
        fixtureQuestion({ id: "AUTHENTIC-1", pyqYear: "2019" }),
        fixtureQuestion({ id: "AI-PACK-1", pyqYear: "2021" }),
      ],
      aiGeneratedIds: aiIds,
      urlPath: "/questions/fixture/",
      origin: ORIGIN,
    });
    expect(html, "the authentic question's year must render").toContain(
      "From the 2019 CBSE board paper",
    );
    expect(
      html,
      "the AI-pack question's year reached the rendered HTML — this is the fabrication",
    ).not.toContain("2021 CBSE board paper");
  });

  it("★★ AND ON THE REAL PAGE — every rendered attribution belongs to a non-AI question with that year", () => {
    const html = pageHtml();
    const attributions = [...html.matchAll(/class="pyq">From the (\d{4}) CBSE board paper/g)].map(
      (m) => m[1],
    );
    const ids = emittedQuestionIds(html);
    const attributable = ids
      .map(questionById)
      .filter((q) => yearAttribution(q, AI_GENERATED_QUESTION_IDS) !== null);

    // ★ NON-VACUOUS. If the page rendered zero attributions, "none of them is
    // fabricated" would be true and meaningless. This lane deliberately orders
    // provenance-bearing questions first so this check has a subject.
    expect(
      attributions.length,
      "the page renders no board-paper attribution at all — §3.3 would be vacuous",
    ).toBeGreaterThan(0);
    expect(attributions.length).toBe(attributable.length);

    for (const q of attributable) {
      expect(AI_GENERATED_QUESTION_IDS.has(q.id)).toBe(false);
      expect(attributions).toContain((q.pyqYear ?? "").trim());
    }

    // ❌ AND THE CLAIM THAT IS NOT DERIVABLE. There is no paper inventory in this
    // repo — only a year per question — so "appeared in N of the last 10 papers"
    // has no denominator and would be an invented statistic.
    expect(
      /of the last \d+ papers/i.test(html),
      "the page asserts a paper-frequency statistic. This repo records a YEAR PER " +
        "QUESTION and has no inventory of papers to divide by — the number cannot " +
        "be derived and must not be published.",
    ).toBe(false);
    expect(/appeared in \d+ of/i.test(html)).toBe(false);

    // eslint-disable-next-line no-console
    console.log(
      `ENGINE0_ATTRIBUTION: rendered=${attributions.length} ` +
        `attributable_emitted=${attributable.length} years=${JSON.stringify(attributions)}`,
    );
  });
});

describe("ENGINE-0 · §3.4 the emitted HTML references no figure asset", () => {
  it("★★ figures stay behind the login — no notes/assets reference, and no orphan figure reference", () => {
    const html = pageHtml();
    expect(html, "the page links a figure asset; figures are out of scope this release")
      .not.toContain("notes/assets");
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toMatch(/<svg\b/i);
    expect(html).not.toMatch(/<picture\b/i);

    // ★ AND THE HARDER HALF: not just "no image tag", but no question that TALKS
    // about a figure the page does not show. An unanswerable question is the
    // dishonest-content failure one layer past a missing <img>.
    const orphans = emittedQuestionIds(html)
      .map(questionById)
      .filter(dependsOnSuppliedFigure)
      .map((q) => q.id);
    expect(
      orphans,
      `${orphans.length} emitted question(s) refer to a figure this page does not ` +
        `show, making them unanswerable:\n  ${orphans.join("\n  ")}`,
    ).toEqual([]);
  });

  it("★ CONTROL — the figure filter is load-bearing, proven by the delta it makes", () => {
    const { counts } = selectQuestions(
      canonicalQuestionBank,
      PAGE.topicKey,
      AI_GENERATED_QUESTION_IDS,
    );
    expect(
      counts.skippedFigure,
      "the supplied-figure filter skipped nothing — either the bank changed or the " +
        "filter is dead; a dead filter here ships unanswerable questions",
    ).toBeGreaterThan(0);
  });
});

describe("ENGINE-0 · §3.5 the JSON-LD parses and describes this page", () => {
  it("★★ both blocks parse, and their contents are DERIVED, not restated", () => {
    const html = pageHtml();
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => m[1]);

    expect(blocks.length, "no JSON-LD block found — this check would be vacuous").toBe(2);

    const parsed = blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
    const quiz = parsed.find((p) => p["@type"] === "Quiz") as
      | { numberOfQuestions: number; hasPart: Array<{ name: string }>; url: string }
      | undefined;
    expect(quiz, "no Quiz block in the JSON-LD").toBeDefined();

    const ids = emittedQuestionIds(html);
    // §2.4 — any number the page asserts must have a single source a test can
    // check. `numberOfQuestions` is checked against the rendered questions, not
    // against a copy of itself.
    expect(quiz!.numberOfQuestions).toBe(ids.length);
    expect(quiz!.hasPart.length).toBe(ids.length);
    expect(quiz!.url).toBe(`${ORIGIN}${PAGE.urlPath}`);

    const learning = parsed.find((p) => Array.isArray(p["@type"])) as
      | { url: string; dateModified: string }
      | undefined;
    expect(learning, "no LearningResource/Course block").toBeDefined();
    expect(learning!.url).toBe(`${ORIGIN}${PAGE.urlPath}`);
    expect(learning!.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      Date.parse(learning!.dateModified) <= Date.now(),
      "dateModified is in the future — a fabricated freshness signal",
    ).toBe(true);

    // Each Question's name is the real question text, not a placeholder.
    for (const q of ids.map(questionById)) {
      expect(quiz!.hasPart.map((p) => p.name)).toContain(q.questionText);
    }
  });

  it("★ CONTROL — the JSON-LD escape really would survive a `</script>` in the data", () => {
    // A question containing `</script>` would close the block early and the JSON
    // would stop parsing. Prove the escape handles it rather than assuming the
    // bank never contains one.
    const html = renderPage({
      note: FIXTURE_NOTE,
      questions: [
        fixtureQuestion({ questionText: "What does </script> do in HTML?" }),
      ],
      aiGeneratedIds: new Set<string>(),
      urlPath: "/questions/fixture/",
      origin: ORIGIN,
    });
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => m[1]);
    expect(blocks.length).toBe(2);
    for (const b of blocks) expect(() => JSON.parse(b)).not.toThrow();
  });

  it("★★ NO RAW LaTeX SURVIVES ONTO THE PAGE — this page has no KaTeX and must stay script-free", () => {
    // ★ THIS ASSERTION EXISTS BECAUSE THE FIRST VERSION SHIPPED BROKEN. The note
    // specs store maths as LaTeX for the app's KaTeX renderer; a JS-free page
    // that echoes the source shows the reader `$\dfrac{\sin i}{\sin r}$`. Worse,
    // the first `mathToText` ran its fraction pass BEFORE flattening `\text{…}`,
    // so `\dfrac{\text{real depth}}{\text{apparent depth}}` — braces inside the
    // fraction's arguments — left four bare `dfrac` tokens on the rendered page.
    // Only the <main> body is checked: the CSS in <head> legitimately uses braces.
    const html = pageHtml();
    const body = html.slice(html.indexOf("<main>"), html.indexOf("</main>"));

    expect(body, "a raw LaTeX $…$ delimiter reached the page").not.toContain("$");
    expect(body, "a raw LaTeX backslash command reached the page").not.toContain("\\");
    expect(body, "an unexpanded \\dfrac reached the page").not.toContain("dfrac");
    expect(body, "raw LaTeX braces reached the page").not.toMatch(/[{}]/);
  });

  it("★ CONTROL — mathToText flattens the constructs these specs use, and degrades safely", () => {
    // Real strings from notes/specs/light-reflection-and-refraction.json.
    expect(mathToText("$\\dfrac{1}{v} + \\dfrac{1}{u} = \\dfrac{1}{f}$")).toBe(
      "1 / v + 1 / u = 1 / f",
    );
    // ★ THE NESTED CASE THAT BROKE IT — braces inside the fraction's arguments.
    expect(
      mathToText("$n = \\dfrac{\\text{real depth}}{\\text{apparent depth}}$"),
    ).toBe("n = real depth / apparent depth");
    expect(mathToText("$P = \\dfrac{1}{f\\,(\\text{m})}$ &nbsp;(dioptre, D)")).toBe(
      "P = 1 / f (m) (dioptre, D)",
    );
    expect(mathToText("$\\angle i = \\angle r$")).toBe("∠ i = ∠ r");

    // ★ AND IT DEGRADES SAFELY. An unknown command loses its backslash and
    // becomes readable text — never markup, and never a leftover delimiter.
    const odd = mathToText("$\\someUnknownCmd{x} \\times 2$");
    expect(odd).not.toContain("\\");
    expect(odd).not.toContain("$");
    expect(odd).not.toMatch(/[{}]/);
    expect(odd).toContain("×");

    // Plain prose with no maths is passed through unchanged.
    expect(mathToText("ray diagrams for mirrors &amp; lenses")).toBe(
      "ray diagrams for mirrors &amp; lenses",
    );
  });

  it("★ CONTROL — escapeHtml escapes a stray & but leaves an authored entity alone", () => {
    // The note specs are authored WITH entities ("mirrors &amp; lenses").
    // Unconditional escaping would ship `&amp;amp;` to a reader.
    expect(escapeHtml("mirrors &amp; lenses")).toBe("mirrors &amp; lenses");
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml("a < b")).toBe("a &lt; b");
    expect(escapeHtml('say "hi"')).toBe("say &quot;hi&quot;");
  });
});

describe("ENGINE-0 · §3.6 the sitemap entry resolves through the new rewrite", () => {
  it("★★ exactly ONE rewrite was added, and it is the /questions one", () => {
    const vercel = JSON.parse(readFileSync(VERCEL_JSON, "utf8")) as {
      rewrites: Array<{ source: string; destination: string }>;
    };
    const mine = vercel.rewrites.filter((r) => r.source.startsWith("/questions"));
    expect(mine.length, "expected exactly one /questions rewrite").toBe(1);
    // ★★ `:path(.*)`, NOT `:path*` — AND THE DIFFERENCE IS THE WHOLE PAGE.
    // Vercel compiles `source` with path-to-regexp, where `:path*` matches a
    // sequence of SEGMENTS and therefore does NOT match a path that ends in "/".
    // The advertised URL ends in "/". Measured on preview
    // lazytopper-production-desktop-6fmd5d68a.vercel.app (X-Vercel-Id: bom1):
    //
    //   /questions/.../light-reflection-and-refraction/   404 (X-Vercel-Error: NOT_FOUND)
    //   /questions/.../light-reflection-and-refraction    200 (the page)
    //   /app/questions/.../light-reflection-and-refraction/  200  <- the destination
    //                                                              resolves fine on
    //                                                              its own
    //   /app/practice/                                   404  <- and `/app/:path*`
    //                                                             fails the same way,
    //                                                             with a LITERAL
    //                                                             destination, which
    //                                                             is how we know the
    //                                                             SOURCE is what did
    //                                                             not match
    //
    // `"trailingSlash": true` was tried first (Vercel's documented switch) and is
    // NOT the fix: on preview 51vwjetsl it left the advertised URL at 404 and
    // additionally 308'd every SPA deep link into the same dead end
    // (/app/practice -> /app/practice/ -> 404).
    expect(mine[0]).toEqual({
      source: "/questions/:path(.*)",
      destination: "/app/questions/:path",
    });

    // ★ ORDER IS LOAD-BEARING. Vercel takes the FIRST matching rewrite, and the
    // SPA catch-all `/app/:path*` must stay last or it swallows everything.
    const idx = vercel.rewrites.findIndex((r) => r.source === "/questions/:path(.*)");
    const spa = vercel.rewrites.findIndex((r) => r.source === "/app/:path*");
    expect(idx, "/questions rewrite not found").toBeGreaterThan(-1);
    expect(spa, "the SPA catch-all must be the last rewrite").toBe(
      vercel.rewrites.length - 1,
    );
    expect(idx).toBeLessThan(spa);

    // ★ AND IT MUST NOT SHADOW THE BACKEND PROXIES.
    for (const probe of ["/api/health", "/shared-api/x"]) {
      expect(probe.startsWith("/questions")).toBe(false);
    }
  });

  it("★★ the sitemap advertises this page, with a lastmod matching the page's own", () => {
    const xml = readFileSync(SITEMAP, "utf8");
    const loc = `${ORIGIN}${PAGE.urlPath}`;
    expect(xml, `sitemap.xml does not advertise ${loc}`).toContain(`<loc>${loc}</loc>`);

    const entry = xml.match(
      new RegExp(
        `<loc>${RX(loc)}</loc>\\s*<lastmod>(\\d{4}-\\d{2}-\\d{2})</lastmod>`,
      ),
    );
    expect(entry, "the new <loc> has no <lastmod>").not.toBeNull();

    // The sitemap's date and the page's own dateModified are ONE fact; a drift
    // between them is a freshness signal that contradicts the document.
    const pageDate = pageHtml().match(/"dateModified": "(\d{4}-\d{2}-\d{2})"/)?.[1];
    expect(entry![1]).toBe(pageDate);

    // §2.6 — `/` is held out of the sitemap by CRAWL-1.
    expect(
      new RegExp(`<loc>\\s*${RX(ORIGIN)}/\\s*</loc>`).test(xml),
      "the sitemap now advertises the site root, which CRAWL-1 deliberately held back",
    ).toBe(false);
  });

  it("★★★ THE ACCEPTANCE SHAPE — the question text is in the RAW HTML, before any JavaScript", () => {
    // This is `curl | grep` expressed as a test. The page is a static file: what
    // is asserted here is exactly what a crawler that runs no JavaScript sees.
    const html = pageHtml();
    const ids = emittedQuestionIds(html);
    expect(ids.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);

    for (const q of ids.map(questionById)) {
      expect(
        html.includes(escapeHtml(q.questionText)),
        `question ${q.id}'s text is not present in the raw HTML — GPTBot, ClaudeBot ` +
          `and PerplexityBot would see nothing`,
      ).toBe(true);
      // And the worked solution, which is the reason the page is worth indexing.
      for (const step of q.solutionSteps ?? []) {
        expect(html.includes(escapeHtml(step)), `${q.id}: a solution step is missing`).toBe(
          true,
        );
      }
    }

    // ★ NO CLIENT-SIDE RENDERING. A page whose content arrives via JS is exactly
    // the defect this lane exists to fix, and it would still pass every check
    // above if the text were also inlined in a script.
    expect(html).not.toMatch(/<script(?![^>]*type="application\/ld\+json")/i);
    expect(html).not.toContain("<div id=\"root\">");
  });

  it("★ the page states its band and chapter FROM the note spec, not from a typed-in copy", () => {
    // §2.4 — read, never restate.
    const note = JSON.parse(
      readFileSync(resolve(REPO_ROOT, PAGE.noteSpec), "utf8"),
    ) as NoteSpec;
    const html = pageHtml();
    expect(html).toContain(`Board weightage: ${note.meta.weightage}`);
    expect(html).toContain(`NCERT Chapter ${note.meta.chapter_no}`);
    expect(html).toContain(escapeHtml(note.meta.source_edition));
    expect(html).toContain(escapeHtml(note.meta.title));

    // ★ THE HONEST EMPTY STATE. This topic's `big_idea` is {null, null}; §2.3 asks
    // for it and there is nothing there. Assert the page omitted it rather than
    // inventing a sentence — and assert the renderer WOULD render one if it had
    // material, so "omitted" is a decision and not a dead branch.
    expect(note.big_idea?.tagline ?? null).toBeNull();
    expect(note.big_idea?.body ?? null).toBeNull();
    expect(html).not.toContain('class="lede"');
    const withIdea = renderPage({
      note: { ...FIXTURE_NOTE, big_idea: { tagline: "A real tagline.", body: null } },
      questions: [fixtureQuestion()],
      aiGeneratedIds: new Set<string>(),
      urlPath: "/questions/fixture/",
      origin: ORIGIN,
    });
    expect(withIdea).toContain('class="lede"');
    expect(withIdea).toContain("A real tagline.");
  });
});
