// @vitest-environment node
/**
 * BANK-FIX-7 PR-1 (#973 DECISION 80b) - three SERVED rows whose solution text contradicted the NCERT figure it cites.
 * Read through the assembled bank (never a source text-scan). Each row stays served; only the named text changed.
 *   - EYE-EXMPLR-10-LA-005 (Exemplar LA Q29): with the prism's base at the bottom (NCERT Fig 10.5) red is at the TOP of the
 *     spectrum and violet, the most deviated, at the BOTTOM. The answer had the order reversed. The question is unchanged.
 *   - SCQ-S-EYE-037: NCERT Fig 10.3 keys N' = near point of a NORMAL eye and N = near point of a hypermetropic eye; the step
 *     called the 25 cm point "N".
 *   - LP-H03 (LazyTopper-written): the question asks for the EXCRETORY SYSTEM diagram; step 1 opened with the nephron.
 * This file never reads the clock.
 */
import { describe, expect, it } from "vitest";
import "../../test/preloadBankChapters";
import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../canonicalQuestionBank";

type Row = { id: string; questionText: string; answer?: string; solutionSteps?: string[] };
const served = new Map((canonicalQuestionBank as unknown as Row[]).map((q) => [q.id, q]));
const raw = new Map((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => [q.id, q]));
const get = (id: string) => {
  const q = served.get(id);
  expect(q, `${id} must stay served`).toBeDefined();
  return q!;
};

describe("BANK-FIX-7 PR-1 - solution text agrees with the NCERT figure it cites", () => {
  it("EYE-EXMPLR-10-LA-005: red at the top, violet (most deviated) at the bottom of the spectrum", () => {
    const q = get("EYE-EXMPLR-10-LA-005");
    expect(q.questionText).toBe("Explain the phenomenon of dispersion of white light through a glass prism, using suitable ray diagram.");
    expect(q.answer).toContain("label R, O, Y, G, B, I, V from top (least deviated) to bottom (most deviated)");
    expect(q.answer).not.toMatch(/V, I, B, G, Y, O, R from top/);
  });

  it("SCQ-S-EYE-037: the 25 cm point is N' (normal eye), not N", () => {
    const steps = get("SCQ-S-EYE-037").solutionSteps ?? [];
    expect(steps.join("\n")).toContain("N′, the near point of a normal eye");
    expect(steps.join("\n")).not.toContain("normal near point N)");
  });

  it("LP-H03: step 1 is the excretory-system diagram with the four asked labels, not the nephron", () => {
    const [first] = get("LP-H03").solutionSteps ?? [];
    expect(first).toMatch(/^Diagram: the human excretory system/);
    for (const label of ["Kidney", "Ureter", "Urinary bladder", "Urethra"]) expect(first).toContain(label);
    expect(first).not.toMatch(/nephron/i);
  });

  it("no row was withheld by this fix (each id is in the raw bank AND served)", () => {
    for (const id of ["EYE-EXMPLR-10-LA-005", "SCQ-S-EYE-037", "LP-H03"]) {
      expect(raw.has(id), id).toBe(true);
      expect(served.has(id), id).toBe(true);
    }
  });
});
