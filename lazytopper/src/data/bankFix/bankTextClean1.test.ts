// BANK-TEXT-CLEAN-1 - pins the lane's ledger against the live bank. Owner brief: no edit may change a mark
// or a correct answer; every touched row stays served.
import { describe, it, expect } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../canonicalQuestionBank";
import { BANK_TEXT_CLEAN_1_LEDGER } from "./bankTextClean1Ledger";

type Row = (typeof RAW_CANONICAL_QUESTION_BANK)[number] & Record<string, unknown>;
const byId = new Map<string, Row>(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q as Row]));
const served = new Set(canonicalQuestionBank.map((q) => q.id));
const row = (id: string): Row => {
  const r = byId.get(id);
  if (!r) throw new Error(`${id} not in the bank`);
  return r;
};
const text = (r: Row) =>
  [r.questionText, r.answer, r.finalAnswer, r.explanation, ...(r.solutionSteps ?? [])].join(" \n ");

const GENERIC_AR = "The Reason directly explains the scientific/mathematical basis";
const GENERIC_RECALL = "should be recalled directly from the key concepts";

describe("BANK-TEXT-CLEAN-1 ledger", () => {
  it("every ledger id is a bank row and is SERVED (this lane withholds nothing)", () => {
    for (const e of BANK_TEXT_CLEAN_1_LEDGER) {
      expect(byId.has(e.id), e.id).toBe(true);
      expect(served.has(e.id), `${e.id} served`).toBe(true);
    }
  });

  it("every pinned key is still the row's key (no correct answer changed)", () => {
    const keyed = BANK_TEXT_CLEAN_1_LEDGER.filter((e) => e.key !== undefined);
    expect(keyed.length).toBe(18);
    for (const e of keyed) expect(row(e.id).answer, e.id).toBe(e.key);
  });

  it("the generic explanation filler is gone from every row this lane cleaned", () => {
    const ids = BANK_TEXT_CLEAN_1_LEDGER.filter((e) => e.fields.includes("explanation")).map((e) => e.id);
    expect(ids.length).toBe(13);
    for (const id of ids) {
      expect(row(id).explanation, id).not.toContain(GENERIC_AR);
      expect(row(id).explanation, id).not.toContain(GENERIC_RECALL);
    }
  });

  it("finalAnswer holds the final answer only on the three D231 rows", () => {
    expect(row("QE2-048").finalAnswer).toBe("Two equal real roots");
    expect(row("PR2-046").finalAnswer).toBe("1/2");
    expect(row("ARC2-052").finalAnswer).toBe("308 cm²");
  });

  it("TRIG2-AR01 defines p, b and h in its stem", () => {
    const q = String(row("TRIG2-AR01").questionText);
    for (const w of ["perpendicular p", "base b", "hypotenuse h"]) expect(q).toContain(w);
  });

  it("no board tag is left in the LIFE stems, and ENV-028 has no '(how:' fragment", () => {
    for (const id of ["SCQ-S-LIFE-028", "SCQ-S-LIFE-029", "SCQ-S-LIFE-042"]) {
      expect(String(row(id).questionText), id).not.toMatch(/\[(Delhi|All India|Foreign|CBSE)[^\]]*\]/);
      expect(row(id).pyqYear, id).toBeUndefined();
    }
    expect(text(row("SCQ-S-ENV-028"))).not.toContain("(how:");
  });

  it("CARB-041 (d) names sodium methanoate (sodium formate) and hydrogen in answer, step and finalAnswer", () => {
    const r = row("SCQ-S-CARB-041");
    for (const s of [r.answer, r.finalAnswer, (r.solutionSteps ?? [])[3]]) {
      expect(String(s)).toContain("sodium methanoate (sodium formate)");
      expect(String(s)).toContain("hydrogen gas");
    }
    expect((r.solutionSteps ?? []).length).toBe(5);
    expect(r.marks).toBe(5);
  });

  it("CTRL-030 cites booklet Q30; OE SA-013 shares SA-006's ozone label", () => {
    expect(row("SCQ-S-CTRL-030").ncertRef).toBe("cbjesccq07 Q30");
    expect(row("OE-NCERT-13-SA-013").subtopic).toBe(row("OE-NCERT-13-SA-006").subtopic);
  });

  it("no solution text on the TRI-AA rows cites Theorem 6.7, including the LA-006 hint", () => {
    for (const id of ["TRI-N-NCERT-6-LA-006", "TRI-N-EXMPLR-6-LA-007", "TRI-N-EXMPLR-6-MCQ-001"]) {
      const r = row(id);
      expect(`${text(r)} ${String(r.strategyHint ?? "")}`, id).not.toMatch(/Theorem 6\.7|three similar triangles/i);
    }
  });
});
