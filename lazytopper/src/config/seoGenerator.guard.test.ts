// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
} from "../data/canonicalQuestionBank";
import type { CanonicalQuestion } from "../data/predictionTypes";
import {
  boardSubject,
  DATE_PLACEHOLDER,
  jsonLdBlock,
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
import {
  ORIGIN,
  PAGES,
  RX,
  publishableQuestions,
  resolveDate,
  HUB_SCIENCE,
  HUB_MATHS,
  HUB_ROOT,
} from "../../scripts/seo/generateQuestionPages";
import { isPublishable, stepMarks } from "../../scripts/seo/publishability";

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

/**
 * ★★ ONE DEFINITION OF "AN EXECUTABLE SCRIPT", USED AT EVERY CALL SITE.
 *
 * ⚠ THERE WERE BRIEFLY TWO, AND CODEQL CAUGHT THE WEAKER ONE. ENGINE-0 had this
 * form; ENGINE-1 then wrote a second one over a bare script-tag match, which is CASE
 * SENSITIVE — `<SCRIPT>` never matched, so its loop body never ran and the
 * assertion passed unconditionally. CodeQL flagged it HIGH as
 * "Bad HTML filtering regexp: does not match upper case <SCRIPT> tags".
 *
 * The duplicate is deleted rather than repaired. Repairing a copy leaves two
 * definitions where one will drift — which is the defect this whole PR exists to
 * close, and the same reasoning that made the hub delegate its JSON-LD escaping
 * instead of keeping its own.
 *
 * `/i` is load-bearing: HTML tag names are case-insensitive, so a filter that is
 * not is bypassable by typing `<ScRiPt>`.
 */
const EXECUTABLE_SCRIPT = /<script(?![^>]*type="application\/ld\+json")/i;

const PAGE = PAGES[0];
const PAGE_FILE = resolve(PUBLIC_ROOT, `.${PAGE.urlPath}index.html`);

function pageHtml(): string {
  expect(
    existsSync(PAGE_FILE),
    `the generated page is missing at ${PAGE_FILE}. Run ` +
      `\`pnpm --filter lazytopper run seo:questions\` and commit the output — the ` +
      `page is a COMMITTED artefact, not a build-time side effect.`,
  ).toBe(true);
  // ★★ LINE ENDINGS ARE NORMALISED, AND THIS IS NOT COSMETIC — IT IS THE
  //    DIFFERENCE BETWEEN A GUARD YOU CAN ATTRIBUTE AND ONE YOU CANNOT.
  //
  //    This file was RED on Windows and GREEN in CI at the same commit, and both
  //    were correct. `core.autocrlf=true` with no `.gitattributes` checks the page
  //    out with CRLF (274 pairs, 29,488 bytes) while the committed blob is LF
  //    (274 bare LF, 29,214 bytes). Question text comes from a TypeScript string
  //    literal, so its newline is always a real LF — and therefore
  //    `html.includes(escapeHtml(q.questionText))` cannot match on Windows for any
  //    question whose text spans lines. Exactly the two multi-line questions of the
  //    twelve failed; all ten single-line ones passed. Nothing was wrong with the
  //    product, the page, or CI.
  //
  //    A platform-dependent red is worse than no guard: the next lane to edit this
  //    file cannot tell its own failure from the inherited one. Reading the page as
  //    the repository STORES it removes the ambiguity, and the control at the foot
  //    of this file proves the normalisation cannot mask a real difference.
  return readFileSync(PAGE_FILE, "utf8").replace(/\r\n/g, "\n");
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
    // ⚠ THE MEASURED BLOCK ABOVE RECORDS THE PRE-SLASH-1 CONFIG, and is kept
    // as the diagnosis that identified the SOURCE as the culprit. Both entries now
    // read the `(.*)` form: `/questions/:path(.*)` (#714) and `/app/:path(.*)`
    // (SLASH-1). The 404s recorded above are what the old `:path*` sources did.
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
    // SPA catch-all `/app/:path(.*)` must stay last or it swallows everything.
    const idx = vercel.rewrites.findIndex((r) => r.source === "/questions/:path(.*)");
    // ★ PINNED BY DESTINATION, NOT BY SOURCE SPELLING. `/app/index.html` is the
    // catch-all's IDENTITY (and is the only rewrite that names it); `:path*` vs
    // `:path(.*)` is its incidental FORM. SLASH-1 changed that form and the old
    // `r.source === "/app/:path*"` pin went to -1 and went red without anything
    // being wrong. Anchor by identity, never by incidental form.
    const spa = vercel.rewrites.findIndex((r) => r.destination === "/app/index.html");
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
    expect(html).not.toMatch(EXECUTABLE_SCRIPT);
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

/**
 * ★★★ ENGINE-1 — THE CONTRACT AND THE GENERATOR MUST AGREE, AND THE AGREEMENT IS ASSERTED.
 *
 * `publishability.ts` opens by declaring itself "THE CONTRACT BETWEEN THE BANK TRACK
 * AND THE SEO TRACK", and states the mechanism plainly: "The generator emits a
 * question ONLY if isPublishable() returns ok." IT DID NOT.
 *
 * The generator selected through `questionPageModel.selectQuestions`, whose figure
 * filter is a SECOND implementation of the same idea. Measured at 2339ebf7 the two
 * disagreed on 421 of 5,721 non-AI rows, and the live page shipped a question the
 * contract rejects. Two definitions of one word, one of them shipping pages.
 *
 * ⚠ WHY AN ASSERTION AND NOT JUST THE FIX. This file already documents four
 * constructs in `publishability.ts` that READ AS LIVE AND WERE NOT — Rule 4 behind
 * Rule 1, the old pattern 5, a declared-and-unreferenced `INLINE_CAPABLE`, and a
 * subsumed positional pattern. None changed behaviour; all four survived review. A
 * fix with nothing asserting it is the fifth. The two predicates diverge again the
 * moment someone edits either one, and nothing would say so.
 */
describe("ENGINE-1 · the generator emits ONLY what the contract calls publishable", () => {
  /** Every topic in the bank, not just the ones `PAGES` currently lists. */
  const allTopics = (): string[] =>
    [...new Set(canonicalQuestionBank.map((q) => q.topicKey))].sort();

  /** What the generator would select for one topic, from a given pool. */
  const selectionFor = (pool: readonly CanonicalQuestion[], topic: string) =>
    selectQuestions(pool, topic, AI_GENERATED_QUESTION_IDS).selected;

  /**
   * ★★★ WHAT THIS COMPARES, STATED SO NOBODY HAS TO INFER IT FROM THE DIAGNOSTIC.
   *
   * TWO SETS, BOTH TAKEN AFTER THE FILTER:
   *   A = every question `selectQuestions` returns, for EVERY topic in the bank,
   *       when fed `publishableQuestions()` — i.e. EXACTLY WHAT THE GENERATOR
   *       WOULD EMIT. (303 questions across 26 topics at abfb1e81.)
   *   B = the subset of A that `isPublishable` accepts.
   * The gate is `|A| === |B|`, and it names every offender when it fails.
   *
   * ⚠ THIS IS *NOT* AN ASSERTION THAT THE TWO PREDICATES AGREE. THEY DO NOT, AND
   * THEY ARE NOT MEANT TO. The `ENGINE1_PREDICATE_DELTA` diagnostic below prints a
   * NON-ZERO divergence on a green run — 191 and 19 at abfb1e81 — and a guard that
   * is green beside a non-zero number is exactly the shape that proves less than it
   * claims, so here is precisely what those numbers are:
   *
   *   `model_only_rejects=191` — SAFE DIRECTION. `dependsOnSuppliedFigure` rejects
   *     where the contract's figure rule does not. 166 of the 191 the contract
   *     rejects anyway for another reason (overwhelmingly `unmarked-step`), so only
   *     25 are genuinely publishable rows the generator declines to use. That is
   *     LOST INVENTORY, not a correctness risk: a stricter generator emits fewer
   *     pages, never a wrong one. [FU-SEO-TWO-FIGURE-PREDICATES]
   *
   *   `contract_only_rejects=19` — THE DANGEROUS DIRECTION, and the reason this
   *     file exists. The contract rejects; `selectQuestions` alone would not.
   *     SEVEN of those 19 actually reach a selection on the unfiltered path — they
   *     are the seven that shipped, including CBE-S-LGHT-B-003 on the live page.
   *     THE POST-FILTER IS WHAT TAKES THAT 7 TO 0.
   *
   * Measured, both ways, at abfb1e81:
   *     EMITTED (post-filter): selected=303  not-publishable=0
   *     UNFILTERED:            selected=303  not-publishable=7
   *
   * ⚠ NEITHER 191 NOR 19 IS BOUNDED, and neither is pinned. They drift with the
   * bank — they were 195 and 18 at 2339ebf7 and are 191 and 19 at abfb1e81, moved
   * by a content lane annotating two chapters. Pinning them would turn every
   * content batch red for no defect. WHAT IS PINNED IS THE INVARIANT THAT MATTERS:
   * nothing the generator emits is a row the contract rejects.
   *
   * ★★ WHAT ACTUALLY TURNS THIS ASSERTION RED — and the honest answer is NOT the
   * mutation that proved the post-filter:
   *   M1 (filter deleted; `return [...bank]`) fires the NON-VACUITY check ABOVE
   *      first — "the filter removed nothing" — and execution stops there, so the
   *      equality is NEVER EVALUATED. M1 proves the filter is load-bearing. It does
   *      NOT prove this equality.
   *   M6 (filter kept but pointed at a DIFFERENT predicate — drop AI rows only, so
   *      the pool still shrinks 8673 -> 5721 and non-vacuity passes) IS what fires
   *      THIS assertion: "the generator would emit 7 question(s) the contract
   *      rejects", naming all seven.
   * Both mutations were needed. A guard shown red by only one of them would have
   * been credited with an assertion that had never run.
   */
  it("★★★ COUNT EQUALITY — across EVERY topic, selected === selected-and-publishable", () => {
    const pool = publishableQuestions();

    // ★ NOT VACUOUS. A pool identical to the bank would make the equality below
    //   true by construction and assert nothing. The filter must actually remove
    //   rows, and it must leave enough behind to fill pages.
    expect(
      pool.length,
      "the publishability filter removed nothing — it is a no-op and this suite is vacuous",
    ).toBeLessThan(canonicalQuestionBank.length);
    expect(pool.length).toBeGreaterThan(MIN_QUESTIONS);

    let selectedTotal = 0;
    let publishableTotal = 0;
    const offenders: string[] = [];

    for (const topic of allTopics()) {
      for (const q of selectionFor(pool, topic)) {
        selectedTotal += 1;
        const verdict = isPublishable(q, AI_GENERATED_QUESTION_IDS);
        if (verdict.ok) publishableTotal += 1;
        else offenders.push(`${topic}/${q.id}:${verdict.reason}`);
      }
    }

    // A count equality, so a single divergent row fails the gate loudly.
    expect(
      selectedTotal,
      "no topic produced a selection — the assertion has no subject",
    ).toBeGreaterThan(0);
    expect(
      publishableTotal,
      `the generator would emit ${selectedTotal - publishableTotal} question(s) the ` +
        `contract rejects: ${offenders.join(", ")}`,
    ).toBe(selectedTotal);
  });

  it("★★ CONTROL — the equality REALLY fails when the filter is absent", () => {
    // R4: an assertion that cannot be shown to fail has not been shown to run.
    //
    // ⚠ TWO EARLIER VERSIONS OF THIS CONTROL WERE WRONG, AND BOTH FAILURES ARE
    //    THE SAME MISTAKE — poisoning a row in a way the OTHER predicate also
    //    rejects, which proves nothing about the gap between them.
    //      v1 poisoned a real bank row and asserted the unfiltered selector still
    //         picked it. Widening the pool changes which rows win their mark band,
    //         so it vanished for an unrelated reason. A control whose outcome
    //         depends on bank churn tests the bank, not the rule.
    //      v2 stripped a step-mark annotation. `selectQuestions` ALSO rejects an
    //         unannotated step, so both paths dropped it and the "divergence" was
    //         imaginary.
    //
    // ★ THE ONLY REAL DIVERGENCE IS THE FIGURE RULE, so the control must sit
    //   exactly there. "Study the table and answer" is caught by the CONTRACT's
    //   imperative-to-consult pattern and NOT by `dependsOnSuppliedFigure`, whose
    //   list has no bare `table` and no imperative. That is the same shape as
    //   `CBE-S-LGHT-B-003`, the row that actually shipped.
    const NONE = new Set<string>();
    const OK = (id: string): CanonicalQuestion =>
      fixtureQuestion({ id, questionText: `Fixture question ${id}.` });

    const clean = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06", "F-07", "F-08", "F-09"].map(OK);
    const poisonedId = "F-05";
    const poisonText = "Study the table and answer the question.";
    const poisoned = clean.map((q) =>
      q.id === poisonedId ? ({ ...q, questionText: poisonText } as CanonicalQuestion) : q,
    );

    // PROVE THE MUTATION APPLIED, AND THAT IT LANDS IN THE GAP. A mutation that
    // did not apply produces a green run and announces nothing.
    const victim = poisoned.find((q) => q.id === poisonedId)!;
    expect(victim.questionText).toBe(poisonText);
    expect(isPublishable(clean.find((q) => q.id === poisonedId)!, NONE).ok).toBe(true);
    const verdict = isPublishable(victim, NONE);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false ? verdict.reason : null).toBe("requires-absent-figure");
    // ★ AND THE OTHER PREDICATE DOES NOT AGREE — without this line the control
    //   could be satisfied by a row both paths reject, which is not a divergence.
    expect(
      dependsOnSuppliedFigure(victim),
      "both predicates reject the poisoned row, so it does not sit in the gap and " +
        "this control proves nothing about the post-filter",
    ).toBe(false);

    const topic = "fixture-topic";
    const sel = (bank: readonly CanonicalQuestion[]) =>
      selectQuestions(bank, topic, NONE).selected;

    // WITHOUT the filter, the generator picks the row the contract rejects —
    // precisely the defect that shipped on the live page.
    const unfiltered = sel(poisoned);
    expect(unfiltered.map((q) => q.id)).toContain(poisonedId);
    expect(
      unfiltered.filter((q) => !isPublishable(q, NONE).ok).length,
      "the count equality would have HELD without the filter, so it proves nothing",
    ).toBeGreaterThan(0);

    // WITH the filter, the same bank yields a selection the contract accepts.
    const filtered = sel(publishableQuestions(poisoned));
    expect(filtered.map((q) => q.id)).not.toContain(poisonedId);
    expect(filtered.filter((q) => !isPublishable(q, NONE).ok)).toEqual([]);
    // And it removes ONLY the poisoned row — a scalpel, not a scythe.
    expect(filtered.length).toBe(clean.length - 1);
  });

  it("★★ ON THE REAL BYTES — every question the COMMITTED page renders is publishable", () => {
    // A model that agrees with itself proves nothing about what ships. This reads
    // the ids out of the committed HTML, which is the artefact a crawler fetches.
    const ids = emittedQuestionIds(pageHtml());
    expect(ids.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
    const bad = ids
      .map(questionById)
      .map((q) => [q.id, isPublishable(q, AI_GENERATED_QUESTION_IDS)] as const)
      .filter(([, v]) => !v.ok)
      .map(([id, v]) => `${id}:${v.ok === false ? v.reason : ""}`);
    expect(
      bad,
      `the committed page renders question(s) the contract rejects: ${bad.join(", ")}`,
    ).toEqual([]);

    // ★ THE SPECIFIC ROW THAT SHIPPED, NAMED. A regression is then unmistakable
    //   rather than a count moving by one.
    expect(
      ids,
      "CBE-S-LGHT-B-003 is back on the page; the contract rejects it as requires-absent-figure",
    ).not.toContain("CBE-S-LGHT-B-003");
  });

  it("★ CONTROL — line-ending normalisation cannot mask a real difference", () => {
    // The normalisation in `pageHtml()` exists because this file was red on
    // Windows and green on linux at one commit. It must be a NO-OP on content
    // with no CRLF, or it could hide a genuine mismatch.
    const raw = readFileSync(PAGE_FILE, "utf8");
    const lf = raw.replace(/\r\n/g, "\n");
    expect(lf.replace(/\r\n/g, "\n")).toBe(lf); // idempotent
    expect(lf.includes("\r\n")).toBe(false);
    // It changes ONLY line endings: no other byte moves, and no line is lost.
    expect(lf.split("\n").length).toBe(raw.split("\n").length);
    expect(lf.replace(/\n/g, "")).toBe(raw.replace(/\r?\n/g, ""));
  });

  it("DIAGNOSTIC — how far apart the two figure predicates actually are", () => {
    // Printed, never asserted. A pinned number here would rot the moment a
    // content lane annotates a batch, and a rotting pin is how a guard starts
    // failing for a reason nobody can attribute. [FU-SEO-TWO-FIGURE-PREDICATES]
    const nonAi = canonicalQuestionBank.filter((q) => !AI_GENERATED_QUESTION_IDS.has(q.id));
    let modelOnly = 0;
    let contractOnly = 0;
    for (const q of nonAi) {
      const m = dependsOnSuppliedFigure(q);
      const c = isPublishable(q, AI_GENERATED_QUESTION_IDS);
      const cFigure = c.ok === false && c.reason === "requires-absent-figure";
      if (m && !cFigure) modelOnly += 1;
      if (cFigure && !m) contractOnly += 1;
    }
    // eslint-disable-next-line no-console
    console.log(
      `ENGINE1_PREDICATE_DELTA: non_ai_rows=${nonAi.length} ` +
        `model_only_rejects=${modelOnly} contract_only_rejects=${contractOnly} ` +
        `publishable_pool=${publishableQuestions().length}`,
    );
    expect(nonAi.length).toBeGreaterThan(0);
  });

  it("★★★ IDEMPOTENCE SURVIVES A CRLF CHECKOUT — no fabricated freshness date", () => {
    // ★ THE SECOND INSTANCE OF THE SAME BUG, AND THE REASON THIS TEST EXISTS.
    //   `pageHtml()` above fixed a CRLF artefact in an ASSERTION. This one was in
    //   the PRODUCT PATH: `resolveDate` compared the previous file (CRLF on a fresh
    //   Windows checkout) against freshly rendered HTML (always LF), found them
    //   unequal ON IDENTICAL CONTENT, and stamped today's date.
    //
    //   ⚠ THAT IS A FABRICATED FRESHNESS SIGNAL — `dateModified` in the JSON-LD and
    //   `<lastmod>` in the sitemap would tell a crawler the content changed on a day
    //   it did not, on the one surface a stranger can check. "No fake data" reaches
    //   generated metadata, not just numbers shown to a student.
    const dir = mkdtempSync(join(tmpdir(), "engine1-date-"));
    const file = join(dir, "index.html");
    const OLD = "2026-08-20";
    // What the renderer produces: always LF, date still a placeholder.
    const rendered = `<html>\n<body>\nLine one.\nLast updated ${DATE_PLACEHOLDER}\n</body>\n</html>\n`;
    const onDisk = rendered.split(DATE_PLACEHOLDER).join(OLD);

    // 1 — LF checkout: unchanged content keeps its date. (The behaviour that always worked.)
    writeFileSync(file, onDisk, "utf8");
    expect(resolveDate(file, rendered)).toBe(OLD);

    // 2 — CRLF checkout, BYTE-FOR-BYTE THE SAME CONTENT. This is the regression.
    const crlf = onDisk.replace(/\n/g, "\r\n");
    expect(crlf, "the CRLF fixture did not actually differ — the case is not exercised")
      .not.toBe(onDisk);
    writeFileSync(file, crlf, "utf8");
    expect(
      resolveDate(file, rendered),
      "a CRLF checkout bumped dateModified on unchanged content — that is a freshness " +
        "signal we would be inventing for a crawler",
    ).toBe(OLD);

    // 3 — CONTROL: genuinely changed content MUST still bump, or the fix has simply
    //     disabled the date and the first two assertions pass for the wrong reason.
    writeFileSync(file, onDisk.replace("Line one.", "Line one, edited."), "utf8");
    expect(resolveDate(file, rendered)).not.toBe(OLD);
    expect(resolveDate(file, rendered)).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    rmSync(dir, { recursive: true, force: true });
  });
});

/**
 * ★★★ ENGINE-1 — THE SET, NOT THE SPECIMEN.
 *
 * ⚠ EVERY ASSERTION IN THIS FILE BEFORE THIS BLOCK READS `PAGES[0]`. That was
 * right when `PAGES` had one row. It is now a SAMPLE OF TEN, and a suite that
 * checks the first row is exactly the "one rendered example is not coverage"
 * shape this repo has already paid for: the subject bug below was INVISIBLE to
 * every green run precisely because `PAGES[0]` is a Science topic and the five
 * broken pages were Maths.
 *
 * These assert over EVERY emitted page and BOTH hubs.
 */
describe("ENGINE-1 · every emitted page, not just the first", () => {
  const pageFileFor = (urlPath: string) => resolve(PUBLIC_ROOT, `.${urlPath}index.html`);
  const readPage = (urlPath: string) =>
    readFileSync(pageFileFor(urlPath), "utf8").replace(/\r\n/g, "\n");
  const specFor = (noteSpec: string) =>
    JSON.parse(readFileSync(resolve(REPO_ROOT, noteSpec), "utf8")) as NoteSpec;

  it("★★★ THE SUBJECT IS DERIVED — no Maths page calls itself Science", () => {
    // THE DEFECT THIS REPLACES: the renderer hardcoded "Class 10 Science" in seven
    // places. Five of the ten topics are Maths. `Triangles — Class 10 Science,
    // NCERT Chapter 6` is a wrong fact about the CBSE syllabus published under our
    // name, on the one surface a stranger can check.
    const maths = PAGES.filter((p) => p.urlPath.includes("/maths/"));
    const science = PAGES.filter((p) => p.urlPath.includes("/science/"));
    expect(maths.length, "no Maths page — this assertion has no subject").toBeGreaterThan(0);
    expect(science.length).toBeGreaterThan(0);

    for (const p of maths) {
      const html = readPage(p.urlPath);
      expect(html, `${p.topicKey} calls itself Science`).not.toContain("Class 10 Science,");
      expect(html).toContain("Class 10 Mathematics");
    }
    for (const p of science) {
      expect(readPage(p.urlPath), `${p.topicKey} calls itself Mathematics`).toContain("Class 10 Science");
    }
    // CONTROL — the helper really discriminates, both directions.
    expect(boardSubject("maths")).toBe("Mathematics");
    expect(boardSubject("physics")).toBe("Science");
    expect(boardSubject("chemistry")).toBe("Science");
    expect(boardSubject("biology")).toBe("Science");
  });

  it("★★★ INTERLINKED — every page links to every sibling AND up to its hub", () => {
    // §4. ENGINE-0's page was an ORPHAN: this count was ZERO, and Google returned
    // "Crawled — currently not indexed".
    for (const p of PAGES) {
      const html = readPage(p.urlPath);
      for (const s of PAGES.filter((o) => o.topicKey !== p.topicKey)) {
        expect(html, `${p.topicKey} does not link to ${s.topicKey}`).toContain(`href="${s.urlPath}"`);
      }
      // ...and never to itself.
      expect(
        html.includes(`<li><a href="${p.urlPath}">`),
        `${p.topicKey} links to itself in its own related list`,
      ).toBe(false);
      const hub = p.urlPath.includes("/maths/") ? HUB_MATHS : HUB_SCIENCE;
      expect(html, `${p.topicKey} has no hub link`).toContain(`href="${hub}"`);
    }
  });

  it("★★ THE HUBS EXIST, LIST ONLY EMITTED PAGES, AND CROSS-LINK", () => {
    for (const hub of [HUB_SCIENCE, HUB_MATHS, HUB_ROOT]) {
      expect(existsSync(pageFileFor(hub)), `hub missing at ${hub}`).toBe(true);
    }
    const science = readPage(HUB_SCIENCE);
    const maths = readPage(HUB_MATHS);
    for (const p of PAGES) {
      const isMaths = p.urlPath.includes("/maths/");
      const target = isMaths ? maths : science;
      const other = isMaths ? science : maths;
      expect(target, `${p.topicKey} missing from its hub`).toContain(`href="${p.urlPath}"`);
      // A hub must not advertise the other subject's children as its own.
      expect(other.includes(`<li><a href="${p.urlPath}">`)).toBe(false);
    }
    expect(science).toContain(`href="${HUB_MATHS}"`);
    expect(maths).toContain(`href="${HUB_SCIENCE}"`);
    const root = readPage(HUB_ROOT);
    expect(root).toContain(`href="${HUB_SCIENCE}"`);
    expect(root).toContain(`href="${HUB_MATHS}"`);
  });

  it("★★ SECTION ORDER IS THE SPEC'S ORDER — the formula sheet leads", () => {
    // §3: the formula strip is "the scarcest artefact and the most bookmarked page
    // type in this category", and it leads the note sections. On trunk it rendered
    // THIRD, behind board_asks and definitions.
    for (const p of PAGES) {
      const order = [...readPage(p.urlPath).matchAll(/<h2>([^<]*)<\/h2>/g)].map((m) => m[1]);
      const spec = specFor(p.noteSpec);
      const idx = (needle: string) => order.findIndex((h) => h.includes(needle));
      if ((spec.formula_strip ?? []).length) {
        expect(idx("Formula sheet"), `${p.topicKey}: no formula sheet`).toBe(0);
        expect(idx("Formula sheet")).toBeLessThan(idx("Key definitions"));
      } else {
        // Honest empty state: omitted, never faked.
        expect(idx("Formula sheet")).toBe(-1);
      }
      expect(idx("Key definitions")).toBeLessThan(idx("What the board actually asks"));
      expect(idx("What the board actually asks")).toBeLessThan(idx("Practice questions"));
      expect(idx("Practice questions")).toBeLessThan(idx("Common mistakes"));
      expect(idx("Common mistakes")).toBeLessThan(idx("More Class 10 board-question pages"));
    }
  });

  it("★★ DEFINITIONS CARRY THEIR NCERT CITATION — matched, never synthesised", () => {
    // §3.4. The citation is the specificity a content farm cannot fake.
    let cited = 0;
    let uncited = 0;
    for (const p of PAGES) {
      const html = readPage(p.urlPath);
      const spec = specFor(p.noteSpec);
      const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
      const ledger = new Set((spec.source_ledger ?? []).map((r) => norm(r.item ?? "")));
      for (const d of spec.definitions ?? []) {
        if (ledger.has(norm(d.term))) cited += 1;
        else uncited += 1;
      }
      // Every RENDERED citation must come from the ledger — never invented.
      const sources = new Set((spec.source_ledger ?? []).map((r) => r.source));
      for (const m of html.matchAll(/<span class="cite">([^<]*)<\/span>/g)) {
        expect(
          sources.has(m[1]),
          `${p.topicKey}: rendered a citation absent from source_ledger: ${m[1]}`,
        ).toBe(true);
      }
    }
    expect(cited, "no definition resolved a citation — the feature is dead").toBeGreaterThan(0);
    // ★ THE OMISSION IS REAL, NOT THEORETICAL: at abfb1e81 `triangles` resolves 7
    //   of 10, and those three render with NO citation rather than a made-up page
    //   number. Asserted as "> 0" and never pinned, so annotating the ledger later
    //   cannot turn this red.
    expect(uncited).toBeGreaterThan(0);
  });

  it("★★ EVERY EMITTED PAGE IS IN THE SITEMAP, AND EVERY QUESTION ON IT IS PUBLISHABLE", () => {
    // R2: MOUNT IS NOT LIVE. A page on disk that nothing advertises is invisible to
    // Google, which is the exact failure this lane answers.
    const xml = readFileSync(SITEMAP, "utf8");
    for (const p of PAGES) {
      expect(xml, `${p.urlPath} is not advertised`).toContain(`<loc>${ORIGIN}${p.urlPath}</loc>`);
      const ids = emittedQuestionIds(readPage(p.urlPath));
      expect(ids.length, `${p.topicKey} is below the floor`).toBeGreaterThanOrEqual(MIN_QUESTIONS);
      const bad = ids
        .map(questionById)
        .filter((q) => !isPublishable(q, AI_GENERATED_QUESTION_IDS).ok)
        .map((q) => q.id);
      expect(bad, `${p.topicKey} renders unpublishable question(s)`).toEqual([]);
    }
    for (const hub of [HUB_SCIENCE, HUB_MATHS, HUB_ROOT]) {
      expect(xml, `hub ${hub} is not advertised`).toContain(`<loc>${ORIGIN}${hub}</loc>`);
    }
  });


  it("★★ THE JSON-LD CLOSING-TAG ESCAPE IS REAL — the no-op CodeQL found cannot return", () => {
    // ⚠ NOTHING ASSERTED THIS BEFORE, WHICH IS EXACTLY WHY IT ROTTED. The hub kept a
    //    second copy of this escape written with a single backslash, so it replaced
    //    `</` with itself. 2,004 tests, both matrices and the build all passed over
    //    it; only CodeQL saw it. An assertion is what stops the next copy.
    const BACKSLASH = String.fromCharCode(92);
    const danger = { name: "closes early </script> here" };

    const out = jsonLdBlock(danger);
    // The raw sequence must NOT survive...
    expect(out, "a raw </ survived into a JSON-LD block").not.toContain("</");
    // ...and must appear in its escaped form, which is what makes it inert.
    expect(out).toContain(BACKSLASH + "/script>");
    // It is still valid JSON once parsed (the escape is JSON-legal).
    expect(JSON.parse(out).name).toBe(danger.name);

    // ★ CONTROL — a no-op replacement would leave the raw sequence intact. This is
    //   the exact defect, reconstructed, so the assertion above is shown to
    //   discriminate rather than to pass for want of a subject.
    const noop = JSON.stringify(danger, null, 2).split("</").join("</");
    expect(noop).toContain("</");
    expect(noop).not.toContain(BACKSLASH + "/script>");
  });

  it("★ NO PAGE LEAKS A FIGURE ASSET, RAW LaTeX, OR AN EXECUTABLE SCRIPT", () => {
    // ⚠ THE LaTeX CHECK IS A LITERAL-STRING SEARCH BUILT FROM A CHAR CODE, NOT A
    //    REGEX LITERAL, AND THAT IS THE WHOLE POINT.
    //
    //    This assertion previously read `/\dfrac|\text\{/`. A doubled backslash
    //    collapsed to a single one on the way into the file, so the regex meant
    //    `\d` = ANY DIGIT and `\t` = TAB. Measured: it matched "7frac" and did NOT
    //    match a real `\dfrac`. It was a FALSE GREEN — an assertion that read as
    //    coverage and tested nothing — and unlike its two neighbours NO TOOL EVER
    //    FLAGGED IT. It surfaced only because CodeQL's two alerts prompted a sweep.
    //
    //    A literal-string search built from `String.fromCharCode(92)` cannot be
    //    corrupted that way: there is no escape for a write path to collapse. The
    //    control at the foot of this test proves it fires.
    const BACKSLASH = String.fromCharCode(92);
    for (const p of PAGES) {
      const html = readPage(p.urlPath);
      expect(html, `${p.topicKey} references notes/assets`).not.toContain("notes/assets");
      expect(html, `${p.topicKey} ships raw LaTeX: dfrac`).not.toContain(BACKSLASH + "dfrac");
      expect(html, `${p.topicKey} ships raw LaTeX: text{`).not.toContain(BACKSLASH + "text{");
      // ★ ONE definition of "an executable script" — see EXECUTABLE_SCRIPT. A
      //   crawler that runs NO JavaScript must see everything, so the only script
      //   blocks allowed are JSON-LD data.
      expect(html, `${p.topicKey} has an executable script`).not.toMatch(EXECUTABLE_SCRIPT);
    }

    // ★★ CONTROLS — both directions, so the check cannot pass for want of a subject.
    const planted = `the formula is $${BACKSLASH}dfrac{1}{2}$ here`;
    expect(planted).toContain(BACKSLASH + "dfrac");
    expect("a clean sentence with no maths in it").not.toContain(BACKSLASH + "dfrac");
    // ...and the executable-script pattern really rejects an upper-case tag, which
    // is exactly what the deleted duplicate could not do.
    expect("<SCRIPT>alert(1)</SCRIPT>").toMatch(EXECUTABLE_SCRIPT);
    expect('<script type="application/ld+json">{}</script>').not.toMatch(EXECUTABLE_SCRIPT);
  });
});

/**
 * ★★ SPEC §6's ACCEPTANCE CONTROL, ENFORCED AT BUILD TIME.
 *
 * The live check is: a real page is ~29KB and a bogus path under `/questions/`
 * returns the SPA shell at ~3KB — "distinguish by BODY SIZE, never status, because
 * both return 200".
 *
 * ⚠ THE ROOT HUB FIRST SHIPPED AT 3,285 BYTES, because §4 asks it only to link the
 * two subject hubs. That is INDISTINGUISHABLE IN SIZE FROM A SOFT 404 — it defeats
 * the only control that separates a real page from the shell — and it is a thin
 * page in its own right, which is what this whole lane exists not to ship. It now
 * indexes all ten chapters (7,497 bytes).
 *
 * ★★ TWO THRESHOLDS, BECAUSE THEY ARE TWO DIFFERENT ARTEFACTS, AND A SINGLE
 * ARBITRARY NUMBER WOULD HAVE BEEN TUNED UNTIL IT PASSED. A topic page is an
 * article and is enormous next to the shell. A hub is a DIRECTORY: it is
 * legitimately smaller, so for a hub the honest discriminator is not size at all
 * but CONTENT — the child links it exists to carry. That is R1's own doctrine
 * ("assert page-specific content, not a status code"); size is merely the crude
 * proxy available to a live `curl | wc -c`.
 */
describe("ENGINE-1 · no emitted page can be mistaken for the SPA shell", () => {
  const SHELL_BYTES = 3 * 1024;
  const sizeOf = (urlPath: string) =>
    Buffer.byteLength(
      readFileSync(resolve(PUBLIC_ROOT, `.${urlPath}index.html`), "utf8").replace(/\r\n/g, "\n"),
    );

  it("★★ a topic page is many times the shell — the live size control is unambiguous", () => {
    for (const p of PAGES) {
      const bytes = sizeOf(p.urlPath);
      expect(
        bytes,
        `${p.urlPath} is ${bytes} bytes — too close to the ~${SHELL_BYTES}-byte SPA shell ` +
          `for spec §6's size control to tell them apart`,
      ).toBeGreaterThan(SHELL_BYTES * 4);
    }
  });

  it("★★ a hub proves itself by its CHILD LINKS, not by its size", () => {
    for (const hub of [HUB_SCIENCE, HUB_MATHS, HUB_ROOT]) {
      const html = readFileSync(resolve(PUBLIC_ROOT, `.${hub}index.html`), "utf8");
      const children = [...html.matchAll(/<li><a href="(\/questions\/[^"]+)"/g)].map((m) => m[1]);
      expect(children.length, `${hub} lists no chapters — it is a shell, not a hub`).toBeGreaterThan(0);
      // Every child it advertises must be a page this run actually emitted.
      for (const c of children) {
        expect(
          PAGES.some((p) => p.urlPath === c),
          `${hub} advertises ${c}, which is not an emitted page`,
        ).toBe(true);
      }
      // Still clearly bigger than the shell, just not article-sized.
      expect(sizeOf(hub)).toBeGreaterThan(SHELL_BYTES + 1024);
    }
    // The root hub indexes the whole namespace, not just the two subject hubs.
    const rootChildren = [
      ...readFileSync(resolve(PUBLIC_ROOT, `.${HUB_ROOT}index.html`), "utf8")
        .matchAll(/<li><a href="(\/questions\/[^"]+)"/g),
    ];
    expect(rootChildren.length).toBe(PAGES.length);
  });
});
