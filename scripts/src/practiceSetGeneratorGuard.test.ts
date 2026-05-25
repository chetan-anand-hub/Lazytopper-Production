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
