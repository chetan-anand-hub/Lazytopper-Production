/**
 * practiceSetGeneratorGuard.test.ts
 *
 * Regression tests for K2H-8f — engine-layer PYQ filter in
 * lazytopper/src/data/practiceSetGenerator.ts.
 *
 * Background:
 *   Before K2H-8f the only `pyqOnly` filter lived in the UI/builder layer
 *   (lazytopper/src/components/practice/practiceQuestionBuilder.ts:488).
 *   That filter ran on `PracticeQuestion[]` produced by the engine-to-UI
 *   mapping at practiceQuestionBuilder.ts:239-262, which stripped `pyqYear`
 *   and `isPYQ` from each question before any downstream filter could read
 *   them. The filter therefore matched zero questions and the soft fallback
 *   `if (filtered.length > 0)` silently disabled it. Net effect: "PYQ only"
 *   never actually filtered.
 *
 *   K2H-8f introduces `pyqOnly?: boolean` on PracticeSetConfig and an
 *   exported `isPYQQuestion()` helper. The filter is applied at the engine
 *   layer where CanonicalQuestion objects still carry `pyqYear`. It is a
 *   hard filter (no soft fallback) — honest empty state if no PYQs exist.
 *
 * Coverage:
 *   1. isPYQQuestion() returns true for questions tagged with isPYQ:true.
 *   2. isPYQQuestion() returns true for questions with a populated pyqYear
 *      (string form, including legacy "30/1/1" format).
 *   3. isPYQQuestion() returns false for questions without PYQ tags.
 *   4. generatePracticeSet({ pyqOnly: true }) against the real canonical bank
 *      returns only PYQ-tagged questions for a topic known to contain PYQs.
 *   5. generatePracticeSet({ pyqOnly: false }) returns the unfiltered pool.
 *   6. generatePracticeSet({ pyqOnly: true }) on a PYQ-empty pool returns
 *      an empty set (no soft fallback).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  isPYQQuestion,
  generatePracticeSet,
} from "../../lazytopper/src/data/practiceSetGenerator.js";
import { PredictionCore } from "../../lazytopper/src/data/predictionCore.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// ── Unit tests on the pure isPYQQuestion helper ───────────────────────────

describe("K2H-8f isPYQQuestion helper", () => {
  test("returns true when isPYQ flag is explicitly true", () => {
    assert.strictEqual(isPYQQuestion({ isPYQ: true }), true);
  });

  test("returns true when pyqYear is a non-empty string", () => {
    assert.strictEqual(isPYQQuestion({ pyqYear: "2022" }), true);
    assert.strictEqual(isPYQQuestion({ pyqYear: "2023" }), true);
  });

  test("returns true for legacy CBSE set-format pyqYear like '30/1/1'", () => {
    // Cause A in K2H-8f: legacy pyqSet format must not exclude these.
    assert.strictEqual(isPYQQuestion({ pyqYear: "30/1/1" }), true);
  });

  test("returns true for numeric pyqYear", () => {
    assert.strictEqual(isPYQQuestion({ pyqYear: 2024 }), true);
  });

  test("returns false when neither isPYQ nor pyqYear is set", () => {
    assert.strictEqual(isPYQQuestion({}), false);
    assert.strictEqual(isPYQQuestion({ isPYQ: false }), false);
    assert.strictEqual(isPYQQuestion({ pyqYear: undefined }), false);
    assert.strictEqual(isPYQQuestion({ pyqYear: "" }), false);
    assert.strictEqual(isPYQQuestion({ pyqYear: "   " }), false);
  });

  test("returns false for null / undefined / non-objects", () => {
    assert.strictEqual(isPYQQuestion(null), false);
    assert.strictEqual(isPYQQuestion(undefined), false);
    assert.strictEqual(isPYQQuestion("2022"), false);
    assert.strictEqual(isPYQQuestion(42), false);
  });
});

// ── Integration: PYQ filter against the real canonical bank ───────────────
//
// Real Numbers pack2 contains many questions with pyqYear populated
// (verified at base SHA 6c5404f). We use it as the realism anchor so the
// test breaks if the PYQ filter regresses end-to-end (engine + bank).

describe("K2H-8f generatePracticeSet pyqOnly filter", () => {
  test("pyqOnly:true returns only PYQ-tagged questions for Real Numbers", () => {
    const set = generatePracticeSet({
      subject: "Maths",
      topicKey: "Real Numbers",
      totalQuestions: 10,
      pyqOnly: true,
      shuffle: false,
    });

    assert.ok(
      set.questions.length > 0,
      `expected at least one PYQ-tagged Real Numbers question; got ${set.questions.length}. ` +
        `If this fails, the canonical bank may have lost its pyqYear tagging — ` +
        `inspect lazytopper/src/data/questionBanks/class10/maths/realNumbers.pack2.ts.`
    );

    for (const q of set.questions) {
      assert.ok(
        isPYQQuestion(q),
        `non-PYQ question leaked through pyqOnly filter: id=${(q as { id?: string }).id}`
      );
    }
  });

  test("pyqOnly:false returns the unfiltered pool (PYQ + non-PYQ mixed)", () => {
    const filtered = generatePracticeSet({
      subject: "Maths",
      topicKey: "Real Numbers",
      totalQuestions: 10,
      pyqOnly: true,
      shuffle: false,
    });
    const unfiltered = generatePracticeSet({
      subject: "Maths",
      topicKey: "Real Numbers",
      totalQuestions: 10,
      pyqOnly: false,
      shuffle: false,
    });

    // Unfiltered pool must be a superset of (or equal to) the PYQ pool.
    assert.ok(
      unfiltered.questions.length >= filtered.questions.length,
      `unfiltered pool (${unfiltered.questions.length}) must be >= PYQ pool (${filtered.questions.length})`
    );
    // And it should include at least one non-PYQ question to prove pyqOnly was
    // actually narrowing the set (not a no-op).
    const hasNonPYQ = unfiltered.questions.some((q) => !isPYQQuestion(q));
    assert.ok(
      hasNonPYQ,
      "unfiltered Real Numbers pool unexpectedly contains only PYQ questions — " +
        "the pyqOnly:true vs pyqOnly:false distinction cannot be observed"
    );
  });

  test("pyqOnly:true returns empty set when topic has no PYQ-tagged questions", () => {
    // Use a deliberately-unmatched topicKey so the candidate pool is empty
    // before the PYQ filter runs. This proves the filter does not invent
    // questions and that there is no silent soft-fallback to non-PYQ content.
    const set = generatePracticeSet({
      subject: "Maths",
      topicKey: "__nonexistent_topic_k2h8f_test__",
      totalQuestions: 10,
      pyqOnly: true,
      shuffle: false,
    });
    assert.strictEqual(set.questions.length, 0);
  });
});

// ── UI bridge: buildPracticeQuestionsFromEngine passes pyqOnly to engine ──
//
// K2H-8f-b: verifies the UI wire-up fix in practiceQuestionBuilder.ts.
// The engine fix was K2H-8f (PR #133). This confirms the bridge:
//   1. Passes pyqOnly through to generatePracticeSet (Change 2)
//   2. Preserves pyqYear/pyqSet on the mapped PracticeQuestion (Change 3)
//   3. No longer relies on a soft-fallback UI-layer pyqOnly filter (Change 4)
// Before this fix the PYQ toggle was a no-op: the mapping stripped pyqYear,
// the UI-layer filter saw `undefined` on every question, and the soft fallback
// silently returned the full pool.

describe("K2H-8f-b buildPracticeQuestionsFromEngine pyqOnly wire-up", () => {
  test("pyqOnly:true via UI bridge returns only PYQ questions", async () => {
    const { buildPracticeQuestionsFromEngine } = await import(
      "../../lazytopper/src/components/practice/practiceQuestionBuilder.js"
    );

    const questions = buildPracticeQuestionsFromEngine({
      subjectKey: "Maths",
      topicKey: "Real Numbers",
      count: 10,
      difficulty: "All",
      pyqOnly: true,
    });

    assert.ok(
      questions.length > 0,
      `UI bridge with pyqOnly:true returned 0 questions for Real Numbers. ` +
        `Engine fix may not be wired through. Check Change 2 in practiceQuestionBuilder.ts.`
    );

    for (const q of questions) {
      assert.ok(
        isPYQQuestion(q),
        `non-PYQ question leaked through UI bridge pyqOnly filter: id=${(q as { id?: string }).id}`
      );
    }
  });

  test("UI bridge mapping preserves pyqYear on mapped PracticeQuestion (Change 3)", async () => {
    const { buildPracticeQuestionsFromEngine } = await import(
      "../../lazytopper/src/components/practice/practiceQuestionBuilder.js"
    );

    const questions = buildPracticeQuestionsFromEngine({
      subjectKey: "Maths",
      topicKey: "Real Numbers",
      count: 10,
      difficulty: "All",
      pyqOnly: true,
    });

    // At least one question must have pyqYear populated — proves the engine→UI
    // mapping carries it forward instead of stripping it (the bug before #133).
    const withPyqYear = questions.filter((q) =>
      Boolean((q as { pyqYear?: unknown }).pyqYear)
    );
    assert.ok(
      withPyqYear.length > 0,
      `0 of ${questions.length} mapped questions carry pyqYear forward. ` +
        `Check Change 3 in practiceQuestionBuilder.ts mapping block.`
    );
  });

  test("pyqOnly:true is a subset of pyqOnly:false via UI bridge", async () => {
    const { buildPracticeQuestionsFromEngine } = await import(
      "../../lazytopper/src/components/practice/practiceQuestionBuilder.js"
    );

    const pyqOnly = buildPracticeQuestionsFromEngine({
      subjectKey: "Maths",
      topicKey: "Real Numbers",
      count: 20,
      difficulty: "All",
      pyqOnly: true,
    });

    const all = buildPracticeQuestionsFromEngine({
      subjectKey: "Maths",
      topicKey: "Real Numbers",
      count: 20,
      difficulty: "All",
      pyqOnly: false,
    });

    assert.ok(
      all.length >= pyqOnly.length,
      `pyqOnly:false (${all.length}) must return >= pyqOnly:true (${pyqOnly.length}) — UI bridge filter behaviour regressed`
    );
    // And the unfiltered pool must contain at least one non-PYQ question to
    // prove pyqOnly was actually narrowing the result rather than no-op.
    const hasNonPYQ = all.some((q) => !isPYQQuestion(q));
    assert.ok(
      hasNonPYQ,
      "unfiltered UI-bridge pool contains only PYQ questions — pyqOnly:true vs pyqOnly:false distinction is not observable; UI wire-up may not be exercising real bank"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UNIQUE SETS (2026-07-15) — the fetch-layer seen-set.
//
// Background: `takeFromBucket` head-takes from a predictionScore-SORTED bucket, so with
// no seen-set the SAME top-N came back every session and the rest of the topic was
// unreachable — trigonometry served 10 distinct questions of 419, forever, on the
// default path. `seenQuestionIds` makes the take prefer UNSEEN, so the window WALKS DOWN
// the sorted list across sessions.
//
// These run against the REAL canonical bank in the ROOT MATRIX (node:test) — a required
// CI gate — so the reachability claim is machine-guarded rather than argued.
// ─────────────────────────────────────────────────────────────────────────────

const idsOf = (qs: Array<{ id?: string }>): string[] => qs.map((q) => String(q.id));

/**
 * The TRUE reachable pool for a topic = every candidate the engine considers.
 *
 * Do NOT measure this with one big generatePracticeSet({totalQuestions: 1000}) call: its
 * per-call `takenTexts` dedup drops questions sharing a 120-char text prefix, so a single
 * call under-reports (trigonometry: 429 vs a real 434). That dedup is per-CALL by design —
 * it stops two near-identical questions landing in the SAME set — so across sessions those
 * questions are still legitimately reachable, and the union correctly exceeds any single
 * call. Measuring against the engine's own candidate list is the honest denominator.
 */
const truePoolIds = (topicKey: string): Set<string> =>
  new Set(PredictionCore.getLikelyQuestionsForConcept(topicKey).map((q) => String((q as { id?: string }).id)));

describe("unique sets — fetch-layer seenQuestionIds", () => {
  test("ABSENT seen-set → byte-identical to the legacy draw (the no-regression gate)", () => {
    // This is what protects the SHARED callers of generatePracticeSet that never pass a
    // seen-set: Daily Mission (x4) and Topic Hub (x2). None has a test pinning its set
    // size or mix, so the default-off param IS their guard.
    const base = { subject: "Maths" as const, topicKey: "Trigonometry", totalQuestions: 10, shuffle: false };
    const legacy = generatePracticeSet(base);
    const explicitUndefined = generatePracticeSet({ ...base, seenQuestionIds: undefined });
    const emptySet = generatePracticeSet({ ...base, seenQuestionIds: new Set<string>() });
    assert.deepEqual(idsOf(explicitUndefined.questions), idsOf(legacy.questions));
    assert.deepEqual(idsOf(emptySet.questions), idsOf(legacy.questions));
  });

  test("UNSEEN-FIRST — a seen question is not served while unseen stock remains", () => {
    const base = { subject: "Maths" as const, topicKey: "Trigonometry", totalQuestions: 10, shuffle: false };
    const first = generatePracticeSet(base);
    const seen = new Set(idsOf(first.questions));
    const second = generatePracticeSet({ ...base, seenQuestionIds: seen });
    assert.ok(second.questions.length > 0, "second session must not be empty");
    for (const q of second.questions) {
      assert.ok(
        !seen.has(String(q.id)),
        `already-attempted question re-served while unseen stock remained: id=${q.id}`
      );
    }
  });

  test("THE WALK — consecutive sessions are disjoint (the frozen top-N is gone)", () => {
    const base = { subject: "Science" as const, topicKey: "Electricity", totalQuestions: 10, shuffle: false };
    const s1 = idsOf(generatePracticeSet(base).questions);
    const s2 = idsOf(generatePracticeSet({ ...base, seenQuestionIds: new Set(s1) }).questions);
    const overlap = s2.filter((id) => s1.includes(id));
    assert.equal(overlap.length, 0, `sessions overlapped on: ${overlap.join(", ")}`);
    // And the sets are genuinely different content, not a reorder.
    assert.notDeepEqual([...s2].sort(), [...s1].sort());
  });

  test("★ CONVERGENCE — repeated sessions reach the WHOLE topic (this test IS the claim)", () => {
    // The property the whole lane exists for: a student can reach every question in a
    // topic across repeated sessions. Before the fix this loop converged at 10 and
    // stalled forever. `MAX_QUESTION_COUNT` is per-FETCH, not a cumulative cap, so the
    // horizon is the bank itself.
    for (const [subject, topicKey] of [["Maths", "Trigonometry"], ["Science", "Electricity"]] as const) {
      const bankSize = truePoolIds(topicKey).size;
      assert.ok(bankSize > 100, `${topicKey}: expected a deep bank, got ${bankSize}`);

      const seen = new Set<string>();
      let stalledRounds = 0;
      // Generous ceiling: bankSize/10 sessions should suffice; stop early on a stall.
      for (let round = 0; round < bankSize && stalledRounds < 2; round += 1) {
        const before = seen.size;
        const set = generatePracticeSet({
          subject, topicKey, totalQuestions: 10, shuffle: false, seenQuestionIds: seen,
        });
        if (set.questions.length === 0) break;
        for (const q of set.questions) seen.add(String(q.id));
        stalledRounds = seen.size === before ? stalledRounds + 1 : 0;
      }
      assert.equal(
        seen.size,
        bankSize,
        `${topicKey}: reached ${seen.size} of ${bankSize} distinct questions — the window stopped walking`
      );
    }
  });

  test("NEVER SHORT — an all-seen topic still fills the set (pass-2 fallback)", () => {
    // Once unseen is exhausted the set must still be full; recombination is the endgame,
    // an empty or short set never is.
    const base = { subject: "Maths" as const, topicKey: "Trigonometry", totalQuestions: 10, shuffle: false };
    const allSeen = truePoolIds("Trigonometry");
    const exhausted = generatePracticeSet({ ...base, seenQuestionIds: allSeen });
    assert.equal(exhausted.questions.length, 10, "an exhausted topic must still return a full set");
    assert.equal(new Set(idsOf(exhausted.questions)).size, 10, "no duplicates in the recombined set");
  });

  test("NEVER FABRICATES — every served question is a real bank question", () => {
    const base = { subject: "Maths" as const, topicKey: "Trigonometry", totalQuestions: 10, shuffle: false };
    const realIds = truePoolIds("Trigonometry");
    const seen = new Set(idsOf(generatePracticeSet(base).questions));
    for (const q of generatePracticeSet({ ...base, seenQuestionIds: seen }).questions) {
      assert.ok(realIds.has(String(q.id)), `served a question not in the bank: id=${q.id}`);
    }
  });

  test("a thin/absent topic stays an honest empty state (no fabrication under the seen-set)", () => {
    const set = generatePracticeSet({
      subject: "Maths",
      topicKey: "__no_such_topic__",
      totalQuestions: 10,
      shuffle: false,
      seenQuestionIds: new Set(["anything"]),
    });
    assert.equal(set.questions.length, 0);
  });
});

describe("unique sets — the pre-build \"N available\" hint must stay seen-set-BLIND", () => {
  // A CALL-SITE convention, so it is guarded the way the ops matrix guards its call-site
  // conventions: by reading the source. A unit test on the builder cannot catch someone
  // ADDING the param at the hint's call site later — and that addition is exactly the
  // regression this protects against.
  //
  // WHY IT MATTERS: "N available" is a faithful count of the POOL, not of what is left
  // FOR YOU. Pass the seen-set here and the number FALLS as the student practises
  // ("42 available" -> "31 available" for the same unchanged bank), which reads as the
  // bank shrinking. The seen-set belongs on the two SET-BUILDING fetches only.
  test("preBuildAvailableCount does NOT pass seenQuestionIds", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "../../lazytopper/src/pages/PracticePage.tsx"),
      "utf8"
    );
    const start = src.indexOf("const preBuildAvailableCount");
    assert.ok(start > 0, "preBuildAvailableCount not found — this guard has gone stale");
    const end = src.indexOf("const bankAvailableCount", start);
    assert.ok(end > start, "could not bound the preBuildAvailableCount memo");
    // Strip comments before scanning — mirroring the ops matrix's Guard B. Without
    // this, the in-code comment EXPLAINING why the seen-set is absent here would itself
    // trip the guard (it did, first run).
    const block = src
      .slice(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    assert.ok(
      block.includes("buildPracticeQuestionsFromEngine"),
      "the hint no longer calls the engine builder — re-point this guard"
    );
    assert.ok(
      !block.includes("seenQuestionIds"),
      "the pre-build \"N available\" hint is passing seenQuestionIds — the number would " +
        "FALL as the student practises. The hint counts the POOL, not the unseen remainder."
    );
  });

  test("the two SET-BUILDING fetches DO pass seenQuestionIds (the guard above is not vacuous)", () => {
    // Without this, the guard above would still pass if the seen-set were never wired at
    // all — a green check that means nothing.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "../../lazytopper/src/pages/PracticePage.tsx"),
      "utf8"
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const wired = code.split("seenQuestionIds,").length - 1;
    assert.ok(
      wired >= 2,
      `expected the seen-set on BOTH fetch paths (blueprint fan-out + single call); found ${wired}`
    );
  });
});
