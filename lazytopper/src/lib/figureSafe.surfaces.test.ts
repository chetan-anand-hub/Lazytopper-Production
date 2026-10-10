// @vitest-environment node
//
// FIGURES-ALL-SURFACES-1 PR-1 (decision 40a.3, issue #973) — a question whose stem
// needs a supplied figure, with no figure bound to its id, is never served in a
// Worksheet, a Chapter Test or a Full Mock.
//
// The rule-5 set is COMPUTED at runtime from the live bank through the one predicate
// (`needsMissingFigure`, built on publishability.ts Rule 5) — never a literal count
// or id list — so the test cannot drift into pinning today's bank.
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import { needsMissingFigure } from "./figureSafe";
import {
  defaultHasBoundFigure,
  demandsSuppliedFigure,
} from "../../scripts/seo/publishability";
import { getBankRowsForSubject } from "../data/bankChapters/loader";
import { predictedQuestions } from "../data/predictedQuestions";
import { sciencePredictedQuestions } from "../data/predictedQuestionsScience";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import type { CanonicalQuestion } from "../data/predictionTypes";
import {
  chapterTestSectionFor,
  drawChapterTest,
  isEligibleForChapterTest,
} from "../components/chaptertest/chapterTestBlueprint";
import {
  FM_BLUEPRINT,
  buildUnionPool,
  drawFullMock,
  fullMockChapterWeights,
  sectionPool,
} from "../components/fullmock/fullMockBlueprint";
import { getTopics, planWorksheet } from "../components/worksheet/worksheetModel";

const SUBJECTS = ["Maths", "Science"] as const;
const seeds = (n: number) => Array.from({ length: n }, (_, i) => ((i + 1) * 2654435761) >>> 0);
/** Chapter Test draws are cheap; a Full Mock draw is ~1 s, so it gets fewer seeds. */
const CT_SEEDS = seeds(30);
const FM_SEEDS = seeds(6);

const bankBySubject = Object.fromEntries(
  SUBJECTS.map((s) => [s, getBankRowsForSubject(s)]),
) as Record<(typeof SUBJECTS)[number], CanonicalQuestion[]>;

/** Canonical rows that demand a figure and have none bound — computed, never listed. */
const RULE5 = Object.fromEntries(
  SUBJECTS.map((s) => [s, bankBySubject[s].filter((q) => needsMissingFigure(q))]),
) as Record<(typeof SUBJECTS)[number], CanonicalQuestion[]>;
const RULE5_IDS = new Set(SUBJECTS.flatMap((s) => RULE5[s].map((q) => q.id)));

/** The Full Mock also draws the predicted banks; their rule-5 rows count too. */
const PREDICTED_RULE5_IDS = new Set(
  [...predictedQuestions, ...sciencePredictedQuestions]
    .filter((q) => needsMissingFigure({ ...q, id: q.id }))
    .map((q) => q.id),
);
const FM_RULE5_IDS = new Set([...RULE5_IDS, ...PREDICTED_RULE5_IDS]);

/** Control rows: they DEMAND a figure in text but the binder holds one, so they stay. */
const BOUND_CONTROLS = SUBJECTS.flatMap((s) =>
  bankBySubject[s].filter(
    (q) =>
      demandsSuppliedFigure(`${q.questionText}\n${q.answer ?? ""}`) &&
      defaultHasBoundFigure(q.id) &&
      chapterTestSectionFor(q) !== null,
  ),
);

const hits = (ids: Iterable<string>, banned: Set<string>) => [...ids].filter((id) => banned.has(id));

describe("needsMissingFigure — the computed rule-5 set", () => {
  it("is non-empty at this base (otherwise every case below is vacuous)", () => {
    expect(RULE5_IDS.size).toBeGreaterThan(0);
    // Reported for the lane: the per-subject count at this base.
    console.info(
      `[figureSafe] rule-5 canonical rows: Maths=${RULE5.Maths.length} Science=${RULE5.Science.length}` +
        ` predicted=${PREDICTED_RULE5_IDS.size} bound-controls=${BOUND_CONTROLS.length}`,
    );
  });

  it("a demanded figure that IS bound passes; an unbound one fails (unit)", () => {
    const q = { id: "X", questionText: "In the figure shown, find x." };
    expect(needsMissingFigure(q, () => true)).toBe(false);
    expect(needsMissingFigure(q, () => false)).toBe(true);
    expect(needsMissingFigure({ id: "Y", questionText: "Draw a ray diagram." }, () => false)).toBe(false);
    expect(needsMissingFigure({ id: "Z", questionText: "Find x.", requiresDiagram: true }, () => false)).toBe(true);
  });

  it("the control set is non-empty", () => {
    expect(BOUND_CONTROLS.length).toBeGreaterThan(0);
  });
});

describe("Chapter Test never serves a rule-5 row", () => {
  it.each(SUBJECTS.flatMap((s) => RULE5[s].map((q) => [q.id, q] as const)))(
    "%s is not eligible for any Chapter Test section",
    (_id, q) => {
      expect(chapterTestSectionFor(q)).toBeNull();
      expect(isEligibleForChapterTest(q)).toBe(false);
    },
  );

  const chapters = SUBJECTS.flatMap((s) =>
    [...new Set(RULE5[s].map((q) => resolveCanonicalSlug(q.topicKey)))].map((slug) => [s, slug] as const),
  );
  it.each(chapters)("%s/%s — no rule-5 row in a seeded draw (many seeds)", (subject, slug) => {
    for (const seed of CT_SEEDS) {
      const t = drawChapterTest({
        subject,
        topicKey: slug,
        topicLabel: slug,
        worksheetId: "ct-fig",
        seed,
      });
      expect(hits(t.paper.questions.map((q) => q.id), RULE5_IDS), `seed ${seed}`).toEqual([]);
    }
  });

  it("control — a bound-figure row is still eligible", () => {
    for (const q of BOUND_CONTROLS) expect(isEligibleForChapterTest(q), q.id).toBe(true);
  });
});

describe("Full Mock never serves a rule-5 row", () => {
  it.each(SUBJECTS)("%s union pool and every section pool exclude rule-5 rows", (subject) => {
    const slugs = new Set(fullMockChapterWeights(subject).map((c) => c.slug));
    const pool = buildUnionPool(subject, slugs);
    expect(hits(pool.map((q) => q.id), FM_RULE5_IDS)).toEqual([]);
    for (const spec of FM_BLUEPRINT) {
      expect(hits(sectionPool(pool, spec.section).map((q) => q.id), FM_RULE5_IDS)).toEqual([]);
    }
  });

  it.each(SUBJECTS)("%s — no rule-5 row in a seeded draw (many seeds)", (subject) => {
    for (const seed of FM_SEEDS) {
      const m = drawFullMock({ subject, worksheetId: "fm-fig", code: "FM-T", name: "t", seed });
      expect(hits(m.paper.questions.map((q) => q.id), FM_RULE5_IDS), `seed ${seed}`).toEqual([]);
    }
  });

  it.each(SUBJECTS)("%s control — bound-figure rows stay in the union pool", (subject) => {
    const slugs = new Set(fullMockChapterWeights(subject).map((c) => c.slug));
    const ids = new Set(buildUnionPool(subject, slugs).map((q) => q.id));
    const controls = BOUND_CONTROLS.filter(
      (q) => String(q.subject) === subject && slugs.has(resolveCanonicalSlug(q.topicKey)),
    );
    // A control may lose its id to a questionKey duplicate; at least one must remain.
    const kept = controls.filter((q) => ids.has(q.id));
    expect(kept.length).toBeGreaterThan(0);
  });
});

describe("Worksheet never serves a rule-5 row", () => {
  it.each(SUBJECTS)("%s — no rule-5 row in any topic pool", (subject) => {
    for (const t of getTopics(subject)) {
      const plan = planWorksheet({ subject, scope: "single-topic", topics: [t], requested: 10 });
      const ids = (plan.pools.get(t.key) ?? []).map((q) => q.id);
      expect(hits(ids, RULE5_IDS), t.key).toEqual([]);
    }
  });

  it.each(SUBJECTS)("%s control — bound-figure rows stay in their topic pool", (subject) => {
    const topics = getTopics(subject);
    let kept = 0;
    for (const t of topics) {
      const plan = planWorksheet({ subject, scope: "single-topic", topics: [t], requested: 10 });
      const ids = new Set((plan.pools.get(t.key) ?? []).map((q) => q.id));
      kept += BOUND_CONTROLS.filter((q) => ids.has(q.id)).length;
    }
    expect(kept).toBeGreaterThan(0);
  });
});
