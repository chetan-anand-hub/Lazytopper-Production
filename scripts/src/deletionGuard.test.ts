/**
 * deletionGuard.test.ts
 *
 * Unit tests for isScienceDeletedFor2026_27, isMathsDeletedFor2026_27, and the
 * year-gated isMathsDeletedForYear wrapper.
 *
 * Coverage goals:
 *  #312 — verify both guard functions behave correctly for their own subject
 *  #315 — verify cross-subject isolation (Science topics don't match Maths guard
 *          and vice versa, preventing scoring contamination between subjects)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// The test runner uses Node's native --test with tsx/esm so we can import
// TypeScript source directly.
import {
  isScienceDeletedFor2026_27,
  isMathsDeletedFor2026_27,
  isMathsDeletedForYear,
  MATHS_DELETED_CHAPTERS_2026_27,
  SCIENCE_DELETED_CHAPTERS_2026_27,
} from "../../lazytopper/src/prediction/cbseHistoricalArchetypes.js";

// ─────────────────────────────────────────────────────────────────────────────
// isScienceDeletedFor2026_27
// ─────────────────────────────────────────────────────────────────────────────

describe("isScienceDeletedFor2026_27 — full-chapter deletions", () => {
  test("returns true for 'Periodic Classification of Elements'", () => {
    assert.equal(isScienceDeletedFor2026_27("Periodic Classification of Elements"), true);
  });

  test("returns true for abbreviated form 'Periodic Classification'", () => {
    assert.equal(isScienceDeletedFor2026_27("Periodic Classification"), true);
  });

  test("returns true for 'Management of Natural Resources'", () => {
    assert.equal(isScienceDeletedFor2026_27("Management of Natural Resources"), true);
  });

  test("is case-insensitive for full-chapter match", () => {
    assert.equal(isScienceDeletedFor2026_27("periodic classification of elements"), true);
    assert.equal(isScienceDeletedFor2026_27("MANAGEMENT OF NATURAL RESOURCES"), true);
  });

  test("returns false for retained chapters", () => {
    assert.equal(isScienceDeletedFor2026_27("Chemical Reactions and Equations"), false);
    assert.equal(isScienceDeletedFor2026_27("Electricity"), false);
    assert.equal(isScienceDeletedFor2026_27("Light - Reflection and Refraction"), false);
    assert.equal(isScienceDeletedFor2026_27("Life Processes"), false);
  });
});

describe("isScienceDeletedFor2026_27 — subtopic-keyword deletions", () => {
  test("returns true when subtopic contains 'evolution' keyword", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Evolution and Natural Selection"), true);
  });

  test("returns true when subtopic contains 'fossil' keyword", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Fossil Evidence"), true);
  });

  test("returns true when subtopic contains 'homologous organ' keyword", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Homologous Organs"), true);
  });

  test("returns true when subtopic contains 'speciation' keyword", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Speciation and Isolation"), true);
  });

  test("returns true when subtopic contains 'natural selection' keyword", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Natural Selection by Darwin"), true);
  });

  test("returns true when subtopic contains 'sources of energy' keyword", () => {
    assert.equal(isScienceDeletedFor2026_27("Our Environment", "Sources of Energy - Solar"), true);
  });

  test("returns false for retained subtopics in the same chapter", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Mendel's laws of inheritance"), false);
    assert.equal(isScienceDeletedFor2026_27("Heredity and Evolution", "Genetics and inheritance patterns"), false);
  });

  test("returns false when topic is deleted but no subtopic provided", () => {
    // Full chapter matches should fire even without subtopic
    assert.equal(isScienceDeletedFor2026_27("Periodic Classification of Elements", undefined), true);
  });

  test("subtopic match is case-insensitive", () => {
    assert.equal(isScienceDeletedFor2026_27("Heredity", "EVOLUTION"), true);
    assert.equal(isScienceDeletedFor2026_27("Heredity", "Fossil Record"), true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isMathsDeletedFor2026_27
// ─────────────────────────────────────────────────────────────────────────────

describe("isMathsDeletedFor2026_27 — current 2026-27 state (subtopic-level deletions configured)", () => {
  test("no full Maths chapters are deleted for 2026-27 (deletedTopics is empty)", () => {
    assert.equal(
      MATHS_DELETED_CHAPTERS_2026_27.deletedTopics.length,
      0,
      "deletedTopics array should be empty — no full Maths chapters deleted"
    );
  });

  test("6 Maths subtopic keywords are deleted for 2026-27 (Constructions, Frustum, Ogive)", () => {
    assert.equal(
      MATHS_DELETED_CHAPTERS_2026_27.deletedSubtopicKeywords.length,
      6,
      "deletedSubtopicKeywords array should contain 6 entries: constructions, division of a line segment, construction of tangents, frustum, ogive, graph ogive"
    );
  });

  test("returns false for any Maths topic name alone when no full-chapter deletions are configured", () => {
    assert.equal(isMathsDeletedFor2026_27("Real Numbers"), false);
    assert.equal(isMathsDeletedFor2026_27("Polynomials"), false);
    assert.equal(isMathsDeletedFor2026_27("Quadratic Equations"), false);
    assert.equal(isMathsDeletedFor2026_27("Triangles"), false);
    assert.equal(isMathsDeletedFor2026_27("Statistics"), false);
    assert.equal(isMathsDeletedFor2026_27("Probability"), false);
  });

  test("returns true for banned Maths subtopic keywords (Ogive); false for retained subtopics", () => {
    assert.equal(isMathsDeletedFor2026_27("Statistics", "Ogive"), true);
    assert.equal(isMathsDeletedFor2026_27("Arithmetic Progression", "Sum of n terms"), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isMathsDeletedForYear — year-gated wrapper (#311)
// ─────────────────────────────────────────────────────────────────────────────

describe("isMathsDeletedForYear — year gate", () => {
  test("effectiveFromYear on the MATHS constant is 2026", () => {
    assert.equal(MATHS_DELETED_CHAPTERS_2026_27.effectiveFromYear, 2026);
  });

  test("returns false for targetYear < effectiveFromYear regardless of topic", () => {
    assert.equal(isMathsDeletedForYear("Real Numbers", undefined, 2025), false);
    assert.equal(isMathsDeletedForYear("Statistics", "Ogive", 2024), false);
    assert.equal(isMathsDeletedForYear("Polynomials", "Zeros", 2023), false);
  });

  test("returns false for targetYear === effectiveFromYear when nothing is deleted", () => {
    assert.equal(isMathsDeletedForYear("Real Numbers", undefined, 2026), false);
  });

  test("returns false for targetYear > effectiveFromYear when nothing is deleted", () => {
    assert.equal(isMathsDeletedForYear("Circles", "Tangent Properties", 2027), false);
    assert.equal(isMathsDeletedForYear("Triangles", "BPT", 2028), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-subject isolation (#315)
// Ensure Science-deleted topics do NOT trigger the Maths guard, and retained
// Maths topics do NOT trigger the Science guard.  This prevents the scoring
// engine from accidentally zeroing scores across subject boundaries.
// ─────────────────────────────────────────────────────────────────────────────

describe("Cross-subject isolation — Maths guard does not fire on Science content", () => {
  test("'Periodic Classification of Elements' does NOT match Maths guard", () => {
    assert.equal(isMathsDeletedFor2026_27("Periodic Classification of Elements"), false);
    assert.equal(isMathsDeletedForYear("Periodic Classification of Elements", undefined, 2026), false);
  });

  test("'Management of Natural Resources' does NOT match Maths guard", () => {
    assert.equal(isMathsDeletedFor2026_27("Management of Natural Resources"), false);
    assert.equal(isMathsDeletedForYear("Management of Natural Resources", undefined, 2026), false);
  });

  test("Science evolution subtopic does NOT match Maths guard", () => {
    assert.equal(isMathsDeletedFor2026_27("Heredity and Evolution", "Evolution"), false);
    assert.equal(isMathsDeletedForYear("Heredity and Evolution", "Evolution", 2026), false);
  });

  test("Science fossil subtopic does NOT match Maths guard", () => {
    assert.equal(isMathsDeletedFor2026_27("Heredity and Evolution", "Fossil Evidence"), false);
  });
});

describe("Cross-subject isolation — Science guard does not fire on Maths content", () => {
  test("retained Maths topics do NOT match Science guard", () => {
    assert.equal(isScienceDeletedFor2026_27("Real Numbers"), false);
    assert.equal(isScienceDeletedFor2026_27("Arithmetic Progression"), false);
    assert.equal(isScienceDeletedFor2026_27("Coordinate Geometry"), false);
    assert.equal(isScienceDeletedFor2026_27("Triangles"), false);
    assert.equal(isScienceDeletedFor2026_27("Probability"), false);
  });

  test("Maths subtopics do NOT match Science guard", () => {
    assert.equal(isScienceDeletedFor2026_27("Statistics", "Mean, Median, Mode"), false);
    assert.equal(isScienceDeletedFor2026_27("Circles", "Tangent Properties"), false);
    assert.equal(isScienceDeletedFor2026_27("Real Numbers", "Euclid's Algorithm"), false);
  });

  test("Science guard effectiveFromYear is 2026", () => {
    assert.equal(SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear, 2026);
  });
});
