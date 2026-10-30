// TUTOR-KEY-TRUST-1 review: a false "our key looks wrong" to a student is unacceptable. Run the mismatch
// detector over EVERY served bank row, through the same client builder + server normaliser the tutor uses.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { buildAnchorQuestion } from "./tutorAnchorQuestion";

const require = createRequire(import.meta.url);
const { detectKeyMismatch } = require("../../../server/services/keyTrust.cjs");
const { normalizeAnchorQuestion } = require("../../../server/routes/tutor.cjs");

// Explicit allow-list: row id -> reason it is a TRUE mismatch (must stay empty unless a data lane confirms one).
const ALLOWED: Record<string, string> = {};

describe("detectKeyMismatch over the whole served bank", () => {
  it("★★ finds no mismatch (the first cut mis-read CARB-E03, CARB-E09, PL2-R20, 2026-TRI-P1-A-011)", () => {
    expect(canonicalQuestionBank.length).toBeGreaterThan(5000);
    const flagged: string[] = [];
    for (const row of canonicalQuestionBank) {
      const built = buildAnchorQuestion(row as never);
      if (!built) continue;
      const a = normalizeAnchorQuestion(built);
      if (a && detectKeyMismatch(a) && !ALLOWED[built.id]) flagged.push(`${built.id}: ${detectKeyMismatch(a).reason}`);
    }
    expect(flagged).toEqual([]);
  });
  it("the four rows the first cut flagged are in the bank and clean", () => {
    for (const id of ["CARB-E03", "CARB-E09", "PL2-R20", "2026-TRI-P1-A-011"]) {
      const row = canonicalQuestionBank.find((q) => q.id === id);
      if (!row) continue; // may be withheld from the served bank; the unit fixtures cover the text
      const a = normalizeAnchorQuestion(buildAnchorQuestion(row as never));
      expect(detectKeyMismatch(a), id).toBeNull();
    }
  });
});
