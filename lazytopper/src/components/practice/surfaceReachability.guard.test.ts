/**
 * surfaceReachability.guard.test.ts — EVERY SERVED QUESTION CAN BE DRAWN ON A TEST.
 *
 * ★ WHY THIS FILE EXISTS (SURFACE-1, 2026-09-11).
 * Owner instruction: ALL questions must be available to Practice, Chapter Test,
 * Full-length test and Worksheets. The scout measured 146 human rows (1-mark
 * written VSA / fill-in items from the CBSE Item Bank 2021, pre-boards and NCERT
 * in-text) that reached Practice and Worksheets but NO section of either test —
 * Chapter Test B took exactly 2 marks, Full Mock B takes exactly 2, and A on both
 * is objective-only. Plus 15 mis-keyed MCQs Chapter Test DID admit into Section A
 * and then scored a correct pick 0 (`norm(selected) === norm(key)` can never hit).
 * Nothing was red: no gate asked the per-surface question.
 *
 * ★ WHERE THE 146 NOW GO — CHAPTER TEST, NOT FULL MOCK (owner ruling 2026-09-11).
 * Full Mock stays BOARD-PURE: the 2026-27 board paper has no written 1-mark item,
 * so FM Section B admits exactly 2 marks and `fullMockBlueprint.ts` is unchanged
 * in logic. Chapter Test Section B admits 1–2 marks ("Very short answer"), which is
 * where every 1-mark written row is now drawable. The union assertion below is
 * therefore satisfied for the 146 via CT alone; the FM-only residual (the 146 +
 * the 15 mis-keys ≈ 161) is DESIGN, reported in a comment, never asserted.
 *
 * ★ THE PREDICATES ARE IMPORTED, NEVER MIRRORED — where the source exports them.
 *   Chapter Test: `chapterTestSectionFor` / `isEligibleForChapterTest` — the SAME
 *     functions `drawChapterTest` builds its pools from.
 *   Full Mock: `sectionPool` (exported for this guard, zero logic change) applied
 *     to a one-row pool, plus `fullMockChapterWeights` for the chapter set. The
 *     canonical→pool row mapping (`fromCanonical`, fullMockBlueprint.ts:137-151)
 *     and the chapter restriction (`buildUnionPool`, :257) are module-private, so
 *     they are RESTATED here field-for-field, citing the lines. Text-dedup between
 *     canonical and predicted rows (:258-262) is ignored: per-row eligibility.
 *   Practice: NO exported predicate. Practice draws `PredictionCore
 *     .getLikelyQuestionsForConcept(topicKey)` filtered by subject and, when a
 *     section/marks deep link is active, by board section (`src/data/
 *     predictionDataService.ts:53-70`, `src/data/practiceSetGenerator.ts:293-302`)
 *     or by the real numeric marks / bucket (`src/pages/PracticePage.tsx:107-129`).
 *     Restated: section A–E and integer marks 1..5.
 *   Worksheets: the topic picker is `getTopics` (exported, `worksheetModel.ts:
 *     119-128`) — a row reaches Worksheets iff its resolved slug is offered there.
 *
 * ★ EVERY ASSERTION RUNS AGAINST THE ASSEMBLED BANK, human rows only (the AI
 * population is retired, never repaired — owner ruling — so it carries no
 * reachability promise). Synthetic rows appear ONLY as positive controls proving
 * each predicate can fail, so a green here is never vacuous.
 *
 * ★ PIN PHILOSOPHY — FLOOR, CEILING, IDENTITY (the publishability.guard idiom):
 *   FLOOR    human rows ≥ 5,710 (an empty bank cannot pass this file vacuously).
 *   CEILING  the residual ineligible set is SHRINK-ONLY, pinned BY ID with its
 *            cause. 15 at the pin: the mis-keyed MCQs whose key resolves to no
 *            option (marking-scheme " 1" appended to the key, letter-prefixed keys,
 *            glyph-damaged options). They are DATA defects the CLEAN-1 lane repairs
 *            in src/data/**; as each is repaired it leaves the residual and this
 *            file stays green — CLEAN-1 empties the pin. A NEW id in the residual is
 *            the red this file is for.
 *   IDENTITY residual rows fail for the mis-keyed reason and NO other; and
 *            gapBefore − gapAfter = the rows the widened CT band made drawable,
 *            computed on BOTH sides from the OLD predicate restated inline.
 */

import { describe, it, expect } from "vitest";

import type { CanonicalQuestion } from "../../data/predictionTypes";
import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
} from "../../data/canonicalQuestionBank";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { getTopics } from "../worksheet/worksheetModel";
import {
  chapterTestSectionFor,
  isEligibleForChapterTest,
  isMcq,
} from "../chaptertest/chapterTestBlueprint";
import {
  fullMockChapterWeights,
  sectionPool,
  type FMPoolQuestion,
  type FMSection,
} from "../fullmock/fullMockBlueprint";
import { isAutoGradeableObjective, isMcqShaped } from "./autoGradeableObjective";

/** The unified bank builds on first use (PERF-1 made it lazy) — explicit budget on
 *  EVERY test, controls included (a control that times out reads as a red). */
const T = { timeout: 60_000 };

// ---------------------------------------------------------------------------
// The population and the four surface predicates
// ---------------------------------------------------------------------------

const AI = AI_GENERATED_QUESTION_IDS;
const HUMAN: CanonicalQuestion[] = canonicalQuestionBank.filter((q) => !AI.has(q.id));

/** PRACTICE (restated — no exported predicate; see the header for the lines).
 *  Practice applies subject + topic only; a `?section=` deep link maps to board
 *  section, a concept band filters by real numeric marks. A row reaches EVERY
 *  Practice path when it has a board section A–E and integer marks 1..5. */
const practiceEligible = (q: CanonicalQuestion): boolean =>
  Number.isInteger(q.marks) &&
  q.marks >= 1 &&
  q.marks <= 5 &&
  ["A", "B", "C", "D", "E"].includes(String(q.section));

/** WORKSHEETS (imported `getTopics`, worksheetModel.ts:119-128): the row's topic
 *  must be one the worksheet topic picker offers for its subject. */
const WS_KEYS: Record<string, Set<string>> = {
  Maths: new Set(getTopics("Maths").map((t) => t.key)),
  Science: new Set(getTopics("Science").map((t) => t.key)),
};
const worksheetsEligible = (q: CanonicalQuestion): boolean =>
  WS_KEYS[q.subject]?.has(resolveCanonicalSlug(q.topicKey)) === true;

/** FULL MOCK — the trunk rule, BOARD-PURE (owner ruling 2026-09-11).
 *  `fromCanonical` (fullMockBlueprint.ts:137-151) restated field-for-field for the
 *  fields `sectionPool` reads: marks (`Number(q.marks) || 0`), options, answer, and
 *  the resolved topic slug that `buildUnionPool` (:257) checks against the subject's
 *  weightage registry. Then the REAL exported `sectionPool` decides the section. */
const FM_SLUGS: Record<string, Set<string>> = {
  Maths: new Set(fullMockChapterWeights("Maths").map((c) => c.slug)),
  Science: new Set(fullMockChapterWeights("Science").map((c) => c.slug)),
};
const FM_SECTIONS: readonly FMSection[] = ["A", "B", "C", "D", "E"];
const toFMPoolRow = (q: CanonicalQuestion): FMPoolQuestion => ({
  id: q.id,
  topicSlug: resolveCanonicalSlug(q.topicKey),
  subtopic: q.subtopic,
  marks: Number(q.marks) || 0,
  questionText: q.questionText,
  options: q.options,
  answer: q.answer,
  solutionSteps: q.solutionSteps,
  finalAnswer: q.finalAnswer,
  pyqYear: q.pyqYear,
  source: "canonical",
});
const fullMockSectionFor = (q: CanonicalQuestion): FMSection | null => {
  const row = toFMPoolRow(q);
  return FM_SECTIONS.find((s) => sectionPool([row], s).length === 1) ?? null;
};
const fullMockEligible = (q: CanonicalQuestion): boolean =>
  FM_SLUGS[q.subject]?.has(resolveCanonicalSlug(q.topicKey)) === true &&
  fullMockSectionFor(q) !== null;

/** CHAPTER TEST — imported, the real sourcing predicate. */
const chapterTestEligible = (q: CanonicalQuestion): boolean => isEligibleForChapterTest(q);

/** A mis-keyed MCQ: MCQ-shaped with a non-empty key that resolves to no option. */
const isMiskeyedMcq = (q: CanonicalQuestion): boolean =>
  isMcqShaped(q) && String(q.answer || "").trim().length > 0 && !isAutoGradeableObjective(q);

/**
 * ★ THE GAP, PINNED BY ID (SHRINK-ONLY) — rows that reach Practice and Worksheets
 * but NEITHER test. 15 at the pin (2026-09-11) — every one a mis-keyed MCQ (class
 * (d) of the SURFACE-1 scout), all under src/data/questionBanks/class10/, repaired
 * by the CLEAN-1 lane, which EMPTIES this set. 11 carry the marking-scheme mark
 * digit " 1" appended to the key, 2 are letter-prefix mismatches ("A" vs "A. …"),
 * 4 have glyph-damaged options. Excluding them from Section A is CORRECT behaviour
 * (a correct pick would score 0); the fix is the DATA, never admission.
 * `PYQ-S-2024-METAL-002` is also mis-shaped (a 3-mark written question whose
 * sub-parts were extracted as options) — it needs re-formatting.
 */
const KNOWN_GAP_IDS: ReadonlySet<string> = new Set<string>([
  "CBE-M-PROB-A-009",
  "CBE-S-MAGN-A-001",
  "PYQ-M-RN-001",
  "PYQ-M-PLE-003",
  "PYQ-M-QE-001",
  "PYQ-M-TRI-003",
  "PYQ-M-CG-001",
  "PYQ-M-CIRC-004",
  "PYQ-M-STAT-002",
  "PYQ-M-STAT-004",
  "PYQ-M-2024-QE-001",
  "PYQ-M-2024-QE-002",
  "PYQ-M-2024-CIRC-004",
  "PYQ-M-2024-CIRC-005",
  "PYQ-S-2024-METAL-002",
]);
const GAP_CEILING = KNOWN_GAP_IDS.size; // 15 at the pin — shrink-only.

const ids = (rows: CanonicalQuestion[]) => rows.map((q) => q.id).sort();
const unexpected = (rows: CanonicalQuestion[]) =>
  ids(rows.filter((q) => !KNOWN_GAP_IDS.has(q.id)));

// ---------------------------------------------------------------------------
// THE BANK — every served human row
// ---------------------------------------------------------------------------

describe("surface reachability — every served human row can be drawn on a test", () => {
  it("the population is real: human rows carry a VACUITY floor of 5,000 (never vacuous)", T, () => {
    // VACUITY floor only. The human floor of record lives in publishability.guard.test.ts (it moves with every withhold, with a reconciliation line); this asserts the population is real, so a content lane never lowers two floors in two files.
    expect(HUMAN.length).toBeGreaterThanOrEqual(5000);
  });

  it("every human row is Practice-eligible AND Worksheets-eligible (section A–E, marks 1..5, topic offered)", T, () => {
    const notPractice = HUMAN.filter((q) => !practiceEligible(q));
    const notWorksheets = HUMAN.filter((q) => !worksheetsEligible(q));
    expect(ids(notPractice), "rows outside section A–E / marks 1..5").toEqual([]);
    expect(ids(notWorksheets), "rows whose topic no worksheet picker offers").toEqual([]);
  });

  it("P ∧ WS ∧ (CT ∨ FM) for every human row — the gap is pinned by id, shrink-only (CLEAN-1 empties it)", T, () => {
    const gap = HUMAN.filter(
      (q) => practiceEligible(q) && worksheetsEligible(q) && !(chapterTestEligible(q) || fullMockEligible(q)),
    );
    // A NEW id here is the red this file exists for. Name it, find its cause, and
    // either fix the row or widen a blueprint band — never add to this list blindly.
    expect(unexpected(gap), "rows on NEITHER test that are not a known mis-keyed MCQ").toEqual([]);
    // CEILING — shrink-only. 15 at the pin (2026-09-11); CLEAN-1 walks it to 0.
    expect(gap.length).toBeLessThanOrEqual(GAP_CEILING);
    // IDENTITY — every gap row fails for the mis-keyed reason and no other: a
    // keyed, well-shaped row that still reaches no test is a blueprint gap.
    for (const q of gap) expect(isMiskeyedMcq(q), `${q.id} in the gap but not mis-keyed`).toBe(true);
  });

  it("PER SURFACE — the rows Chapter Test cannot draw are ONLY the known mis-keyed MCQs (≤ 15)", T, () => {
    // Chapter Test alone must cover every well-formed human row: a revert of its B
    // band to exactly-2 puts 146 one-mark ids here, none of them in the known set
    // (mutation M1). Full Mock is NOT asserted per-surface — by owner ruling
    // 2026-09-11 it is board-pure, so its own residual is the 146 one-mark written
    // rows plus the 15 mis-keys (≈ 161 at the pin; text-dedup ignored). That number
    // is design, not a defect: it is explained row-by-row below, never pinned.
    const notCT = HUMAN.filter((q) => !chapterTestEligible(q));
    expect(unexpected(notCT), "rows no Chapter Test section admits").toEqual([]);
    expect(notCT.length).toBeLessThanOrEqual(GAP_CEILING);
    const notFM = HUMAN.filter((q) => !fullMockEligible(q));
    // Informational only (board-pure FM): every FM-only miss is a 1-mark written row
    // or a known mis-key — i.e. it IS covered by Chapter Test.
    for (const q of notFM) {
      const oneMarkWritten = !isMcqShaped(q) && q.marks === 1;
      expect(oneMarkWritten || KNOWN_GAP_IDS.has(q.id), `${q.id} FM-ineligible for an unexplained reason`).toBe(true);
    }
  });

  it("Chapter Test Section A admits NO MCQ whose key resolves to no option (the #352 bar)", T, () => {
    // Before SURFACE-1 this was 15: drawn into "Section A · 1 mark each" and scored 0
    // for a correct pick. The bar is now the shared `isAutoGradeableObjective`.
    const admittedMiskeyed = HUMAN.filter((q) => chapterTestSectionFor(q) === "A" && isMiskeyedMcq(q));
    expect(ids(admittedMiskeyed)).toEqual([]);
    // The bank's mis-keyed population itself is data, shrink-only (CLEAN-1).
    const miskeyed = HUMAN.filter(isMiskeyedMcq);
    expect(unexpected(miskeyed), "mis-keyed MCQs not in the known set").toEqual([]);
    expect(miskeyed.length).toBeLessThanOrEqual(GAP_CEILING);
  });

  it("IDENTITY — gapBefore − gapAfter = exactly the rows the widened CT band made drawable (146 + 15 → 15)", T, () => {
    // The PRE-SURFACE-1 Chapter Test rule, restated inline as the control (base SHA
    // b5f4936, chapterTestBlueprint.ts:134-150): A = any MCQ with a NON-EMPTY key
    // (no resolve bar), B = written exactly 2, C = 3, D = 4..99. Full Mock is the
    // trunk rule on both sides (unchanged by this lane).
    const oldCT = (q: CanonicalQuestion): boolean =>
      isMcq(q) ? String(q.answer || "").trim().length > 0 : q.marks >= 2 && q.marks <= 99;
    // The A bar alone (new A, OLD B band) — the intermediate the spec's "146 + 15" names.
    const aBarOnlyCT = (q: CanonicalQuestion): boolean =>
      isMcq(q) ? isAutoGradeableObjective(q) : q.marks >= 2 && q.marks <= 99;
    const gapUnder = (ct: (q: CanonicalQuestion) => boolean) =>
      HUMAN.filter((q) => practiceEligible(q) && worksheetsEligible(q) && !(ct(q) || fullMockEligible(q)));
    const gapBefore = gapUnder(oldCT);
    const gapABar = gapUnder(aBarOnlyCT);
    const gapAfter = gapUnder(chapterTestEligible);
    const before = new Set(gapBefore.map((q) => q.id));
    const after = new Set(gapAfter.map((q) => q.id));
    const freed = gapBefore.filter((q) => !after.has(q.id)); // before − after
    const newlyLost = gapAfter.filter((q) => !before.has(q.id)); // after − before (the 15 the A bar excludes)
    // Set identities, computed on both sides — no literal can drift these.
    expect(ids(freed)).toEqual(ids(gapBefore.filter((q) => chapterTestEligible(q))));
    expect(gapBefore.length - freed.length + newlyLost.length).toBe(gapAfter.length);
    expect(ids(gapABar)).toEqual(ids([...gapBefore, ...newlyLost]));
    for (const q of newlyLost) expect(isMiskeyedMcq(q), `${q.id} newly excluded but not mis-keyed`).toBe(true);
    // Every row the band freed is a 1-mark written row — the exact class the owner named.
    for (const q of freed) expect(!isMcq(q) && q.marks === 1, `${q.id} freed but not a 1-mark written row`).toBe(true);
    // Pins at 2026-09-11 (P10): before 146, A-bar-only 161 (= 146 + 15), after 15.
    // FLOOR on the freed rows (a content lane may add 1-mark VSAs; the band must keep
    // taking them), CEILING on the residual (shrink-only, CLEAN-1).
    expect(freed.length).toBeGreaterThanOrEqual(146);
    expect(gapABar.length).toBe(gapBefore.length + newlyLost.length);
    expect(gapAfter.length).toBeLessThanOrEqual(GAP_CEILING);
  });
});

// ---------------------------------------------------------------------------
// POSITIVE CONTROLS — synthetic rows proving each predicate can FAIL
// ---------------------------------------------------------------------------

const base: CanonicalQuestion = {
  id: "SYN-000",
  subject: "Maths",
  topicKey: "real-numbers",
  subtopic: "Fundamental Theorem of Arithmetic",
  section: "A",
  marks: 1,
  format: "Short",
  difficulty: "Easy",
  bloomSkill: "Remembering",
  questionText: "Express 255 as a product of prime factors.",
  answer: "255 = 3 × 5 × 17",
};

describe("surface reachability — positive controls (synthetic, the predicates can fail)", () => {
  it("a keyed 1-mark MCQ is eligible on ALL FOUR surfaces", T, () => {
    const keyed: CanonicalQuestion = {
      ...base,
      id: "SYN-MCQ-OK",
      format: "MCQ",
      options: ["1 : 2", "2 : 1", "1 : 4", "4 : 1"],
      answer: "1 : 2",
    };
    expect(practiceEligible(keyed)).toBe(true);
    expect(worksheetsEligible(keyed)).toBe(true);
    expect(chapterTestSectionFor(keyed)).toBe("A");
    expect(isEligibleForChapterTest(keyed)).toBe(true);
    expect(fullMockSectionFor(keyed)).toBe("A");
    expect(fullMockEligible(keyed)).toBe(true);
  });

  it("a 1-mark written VSA is drawn into Chapter Test Section B and NOT into Full Mock (board-pure by design)", T, () => {
    const vsa: CanonicalQuestion = { ...base, id: "SYN-VSA-1", options: undefined };
    expect(practiceEligible(vsa)).toBe(true);
    expect(worksheetsEligible(vsa)).toBe(true);
    expect(chapterTestSectionFor(vsa)).toBe("B");
    expect(isEligibleForChapterTest(vsa)).toBe(true);
    // Owner ruling 2026-09-11: the board paper has no written 1-mark item.
    expect(fullMockSectionFor(vsa)).toBeNull();
    expect(fullMockEligible(vsa)).toBe(false);
    // The same row with `options: []` (the bank's other written-row spelling) too.
    expect(chapterTestSectionFor({ ...vsa, options: [] })).toBe("B");
    // Its 2-mark twin reaches BOTH Section Bs.
    expect(chapterTestSectionFor({ ...vsa, marks: 2 })).toBe("B");
    expect(fullMockSectionFor({ ...vsa, marks: 2 })).toBe("B");
  });

  it('an MCQ with key "A" against options "A. …" is ineligible on CT-A and FM-A (the bar fires); its keyed twin is not', T, () => {
    const keyed: CanonicalQuestion = {
      ...base,
      id: "SYN-MCQ-LETTER-OK",
      format: "MCQ",
      options: ["A. 3 × 5 × 17", "B. 5 × 51", "C. 3 × 85", "D. 15 × 17"],
      answer: "A. 3 × 5 × 17",
    };
    const letterKey: CanonicalQuestion = { ...keyed, id: "SYN-MCQ-LETTER-BAD", answer: "A" };
    const digitKey: CanonicalQuestion = { ...keyed, id: "SYN-MCQ-DIGIT-BAD", answer: "A. 3 × 5 × 17 1" };
    expect(chapterTestSectionFor(keyed)).toBe("A");
    expect(fullMockSectionFor(keyed)).toBe("A");
    for (const bad of [letterKey, digitKey]) {
      expect(isMiskeyedMcq(bad)).toBe(true);
      expect(chapterTestSectionFor(bad), bad.id).toBeNull();
      expect(isEligibleForChapterTest(bad), bad.id).toBe(false);
      expect(fullMockSectionFor(bad), bad.id).toBeNull();
      expect(fullMockEligible(bad), bad.id).toBe(false);
    }
  });

  it("a 2-mark MCQ-shaped row is Full-Mock-ineligible (not a CBSE shape — B–E are written)", T, () => {
    const twoMarkMcq: CanonicalQuestion = {
      ...base,
      id: "SYN-MCQ-2M",
      section: "B",
      marks: 2,
      format: "MCQ",
      options: ["p", "q", "r", "s"],
      answer: "p",
    };
    expect(fullMockSectionFor(twoMarkMcq)).toBeNull();
    expect(fullMockEligible(twoMarkMcq)).toBe(false);
  });

  it("a row whose topic resolves to no desktop topic reaches neither test (the topic bar)", T, () => {
    const orphan: CanonicalQuestion = { ...base, id: "SYN-ORPHAN", topicKey: "no-such-topic-key" };
    expect(chapterTestSectionFor(orphan)).toBe("B"); // shape admits it…
    expect(isEligibleForChapterTest(orphan)).toBe(false); // …the topic bar does not.
    expect(fullMockEligible(orphan)).toBe(false);
    expect(worksheetsEligible(orphan)).toBe(false);
  });
});
