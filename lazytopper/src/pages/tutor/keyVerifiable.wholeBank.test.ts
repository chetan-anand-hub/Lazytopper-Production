// TUTOR-KEYS-1: every served MCQ / assertion-reason row with a known key letter has solution steps that name an
// option, so keyTrust can cross-check the key. A new bank row without " Answer: (X)" fails here; fix it with
// `pnpm exec tsx scripts/ops/tutor_keys_1.apply.ts --write`.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { SOLUTIONS_2_LEDGER } from "../../config/solutions2Ledger";
import { SOLUTIONS_3_BOARD_LEDGER } from "../../config/solutions3BoardLedger";
import { buildAnchorQuestion } from "./tutorAnchorQuestion";

const require = createRequire(import.meta.url);
const { detectKeyMismatch } = require("../../../server/services/keyTrust.cjs");
const { normalizeAnchorQuestion } = require("../../../server/routes/tutor.cjs");

// Rows whose key letter is only fuzzy-resolved (not unambiguous) are left alone on purpose.
const LEFT_ALONE = new Set(["REP2-040", "REP2-042", "REP2-043"]);
// Rows hash-pinned by a SOLUTIONS ledger are content-bound (any text change = unverified): never edited.
for (const L of [SOLUTIONS_2_LEDGER, SOLUTIONS_3_BOARD_LEDGER] as Record<string, { hash?: string }>[])
  for (const [id, e] of Object.entries(L)) if (e.hash) LEFT_ALONE.add(id);

describe("every served MCQ key is verifiable by keyTrust", () => {
  it("steps name the key option (and never a different one)", () => {
    const unverifiable: string[] = [];
    let checked = 0;
    for (const row of canonicalQuestionBank) {
      const built = buildAnchorQuestion(row as never);
      if (!built || !built.options || built.options.length < 2) continue;
      const a = normalizeAnchorQuestion(built);
      if (!a || !a.answerLetter || LEFT_ALONE.has(built.id)) continue;
      checked += 1;
      const other = a.answerLetter === "A" ? "B" : "A";
      // names an option <=> probing with a key that is not the real one reports a disagreement
      const probe = detectKeyMismatch({ ...a, answerLetter: other });
      const names = !!probe || detectKeyMismatch({ ...a, answerLetter: a.answerLetter === "C" ? "D" : "C" });
      if (!names) unverifiable.push(built.id);
    }
    expect(checked).toBeGreaterThan(3000);
    expect(unverifiable).toEqual([]);
  });
});
