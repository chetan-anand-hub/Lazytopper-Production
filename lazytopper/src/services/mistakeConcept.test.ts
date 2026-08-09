import { describe, it, expect } from "vitest";

// MI-CONCEPT-1 — the id→concept resolver behind the mistake log's `concept` field.
//
// This suite runs against the REAL canonical question bank, not a fixture, because
// the property under test is a property OF THE BANK ROUND-TRIP: that the value the
// mistake log persists is the bank's own `subtopic`, byte for byte. A fixture bank
// could not catch a normalisation applied to real data.

import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { isChapterEchoSubtopic } from "./progressBankIndex";
import { conceptForBankQuestionId } from "./mistakeConcept";

/**
 * The bank row a caller of `conceptForBankQuestionId(id)` must be answered with.
 * The index is a Map built by iterating the bank in order, so for a duplicated id
 * the LAST row wins. Computed here independently of the index so the comparison
 * below is a real assertion and not a restatement of the implementation.
 */
const lastRowById = new Map<string, { id: string; subtopic: string }>();
for (const q of canonicalQuestionBank) {
  if (!q || typeof q.id !== "string" || !q.id) continue;
  lastRowById.set(q.id, { id: q.id, subtopic: String(q.subtopic ?? "") });
}

/** A real bank question whose subtopic IS a usable concept (not a chapter echo). */
const REAL = [...lastRowById.values()].find(
  (r) => r.subtopic && !isChapterEchoSubtopic(r.subtopic),
);

describe("conceptForBankQuestionId — resolution", () => {
  // ⚠ NOT a data guard. This asserts the fixtures below are real rather than
  // letting an empty bank silently turn every test into a no-op pass.
  it("the real bank is loaded and offers a resolvable concept question", () => {
    expect(canonicalQuestionBank.length).toBeGreaterThan(1000);
    expect(lastRowById.size).toBeGreaterThan(1000);
    expect(REAL).toBeDefined();
    expect(REAL!.subtopic.length).toBeGreaterThan(0);
  });

  it("resolves a real bank question id to its concept", () => {
    expect(conceptForBankQuestionId(REAL!.id)).toBe(REAL!.subtopic);
  });

  // ★ TEST 4 — THE BYTE-IDENTITY GUARD. Every resolvable id in the WHOLE bank must
  // come back as the bank's own bytes. Any trim / case fold / slugify / canonical
  // re-resolution introduced anywhere on this path fails here. This is the guard
  // against concept becoming a SECOND VOCABULARY ([FU-PROG-TOPIC-KEY-MISMATCH]).
  it("★ returns the bank's subtopic BYTE-IDENTICALLY for every resolvable id in the bank", () => {
    const mismatches: Array<{ id: string; expected: string; got: string | undefined }> = [];
    let compared = 0;
    for (const row of lastRowById.values()) {
      if (!row.subtopic || isChapterEchoSubtopic(row.subtopic)) continue;
      const got = conceptForBankQuestionId(row.id);
      compared += 1;
      if (got !== row.subtopic) mismatches.push({ id: row.id, expected: row.subtopic, got });
    }
    // Prove the loop actually compared a meaningful number of rows — an empty
    // comparison set would report zero mismatches while asserting nothing.
    expect(compared).toBeGreaterThan(1000);
    expect(mismatches).toEqual([]);
  });

  // ★ TEST 3 (resolver half) — an id with no bank row yields NO concept. Never a
  // guess, never a topic-level fallback.
  it("★ CONTROL — an id that is not in the bank resolves to undefined, never a fallback", () => {
    expect(conceptForBankQuestionId("definitely-not-a-bank-id-9f3c")).toBeUndefined();
    expect(lastRowById.has("definitely-not-a-bank-id-9f3c")).toBe(false);
  });

  it("★ CONTROL — surface-scoped SYNTHETIC attempt ids never resolve", () => {
    // These are the ids worksheet / full-mock / chapter-test / Check & Improve pass
    // as `questionId`. They are attempt ids, not bank ids, and must not resolve.
    expect(conceptForBankQuestionId("ws:ws-abc:q2")).toBeUndefined();
    expect(conceptForBankQuestionId("fm:fm-abc:q2")).toBeUndefined();
    expect(conceptForBankQuestionId("ct:ct-abc:q2")).toBeUndefined();
    expect(conceptForBankQuestionId("ci:CI-1:q2")).toBeUndefined();
  });

  it("empty / null / undefined ids resolve to undefined", () => {
    expect(conceptForBankQuestionId("")).toBeUndefined();
    expect(conceptForBankQuestionId(null)).toBeUndefined();
    expect(conceptForBankQuestionId(undefined)).toBeUndefined();
  });

  it("a chapter-echo subtopic is suppressed rather than presented as a concept", () => {
    const echo = [...lastRowById.values()].find((r) => isChapterEchoSubtopic(r.subtopic));
    // Only assert the behaviour if the bank actually contains such a row; assert
    // the predicate itself unconditionally so this can never become a silent skip.
    expect(isChapterEchoSubtopic("General")).toBe(true);
    expect(isChapterEchoSubtopic("Chapter Practice — Life Processes")).toBe(true);
    expect(isChapterEchoSubtopic(REAL!.subtopic)).toBe(false);
    if (echo) expect(conceptForBankQuestionId(echo.id)).toBeUndefined();
  });
});
