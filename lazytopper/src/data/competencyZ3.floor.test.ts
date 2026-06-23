// Z3 Competency extraction — bank-floor / silent-zero guard.
//
// canonicalQuestionBank.ts spreads ~290 source arrays into one flat bank. A
// dropped `...SOURCE` spread is a SILENT failure: the array still compiles and
// imports, but contributes ZERO questions and no other test notices. This guard
// locks the Z3 Competency source in:
//   1. The source array is exactly 102 rows (the extracted, verified count).
//   2. Every Z3 id actually reaches the SERVED bank (proves the spread is wired
//      and none were withheld) — this is the direct silent-zero catch.
//   3. The served bank as a whole never silently collapses (conservative floor).
//
// It also logs the exact before/after served length so the owner sees the count
// rose by precisely the Z3 contribution when this runs in CI / a Codespace
// (Windows dev boxes cannot run vitest — linux-pinned binaries; see CLAUDE.md).

import { describe, it, expect } from "vitest";
import { canonicalQuestionBank } from "./canonicalQuestionBank";
import { Z3_COMPETENCY_QUESTIONS } from "./questionBanks/class10/maths/competency.z3";

const Z3_EXPECTED_COUNT = 102;
// Conservative absolute floor: the bank serves several thousand questions, so
// this only fires on a catastrophic collapse. Kept well below the true count so
// it never false-fails as the bank grows.
const BANK_ABSOLUTE_FLOOR = 2000;

describe("Z3 Competency — bank floor / silent-zero spread guard", () => {
  it("the Z3 source array holds exactly the extracted count", () => {
    expect(Z3_COMPETENCY_QUESTIONS.length).toBe(Z3_EXPECTED_COUNT);
  });

  it("every Z3 question reaches the served bank (spread wired, none withheld)", () => {
    const servedIds = new Set(canonicalQuestionBank.map((q) => q.id));
    const missing = Z3_COMPETENCY_QUESTIONS.filter((q) => !servedIds.has(q.id));
    expect(missing.map((q) => q.id)).toEqual([]);
  });

  it("Z3 contributes exactly its count and the bank does not silently collapse", () => {
    const z3Ids = new Set(Z3_COMPETENCY_QUESTIONS.map((q) => q.id));
    const z3Served = canonicalQuestionBank.filter((q) => z3Ids.has(q.id)).length;
    const nonZ3Served = canonicalQuestionBank.length - z3Served;

    // Exact Z3 contribution (silent-zero would make this 0).
    expect(z3Served).toBe(Z3_EXPECTED_COUNT);
    // Whole-bank floor.
    expect(nonZ3Served).toBeGreaterThanOrEqual(BANK_ABSOLUTE_FLOOR);

    // Visibility for the owner's before/after check (printed by CI/Codespaces).
    // eslint-disable-next-line no-console
    console.log(
      `[Z3 floor] served bank = ${canonicalQuestionBank.length} ` +
        `(non-Z3 ${nonZ3Served} + Z3 ${z3Served}); ` +
        `before Z3 = ${nonZ3Served}, after Z3 = ${canonicalQuestionBank.length}.`
    );
  });

  it("every Z3 row is stamped AUTHENTIC (absent from the AI-pack id set)", async () => {
    const { AI_GENERATED_QUESTION_IDS } = await import("./canonicalQuestionBank");
    const aiZ3 = Z3_COMPETENCY_QUESTIONS.filter((q) =>
      AI_GENERATED_QUESTION_IDS.has(q.id)
    );
    expect(aiZ3.map((q) => q.id)).toEqual([]);
  });
});
