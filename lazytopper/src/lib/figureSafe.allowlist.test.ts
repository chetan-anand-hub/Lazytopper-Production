// @vitest-environment node
//
// D47c (cofounder, 10 Oct): Rule 5 over-removal, tightened NARROWLY. A reviewed ALLOW-LIST of specific rows whose "needs a
// figure" flag is a false positive (the student draws it / the data is printed in the stem / "figure" is only in the marking
// answer). The matching itself is NOT loosened; every other row, and any new row, with the same wording stays held back.
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import { RULE5_REVIEWED_NOT_NEEDED, needsMissingFigure } from "./figureSafe";
import { defaultHasBoundFigure, demandsSuppliedFigure } from "../../scripts/seo/publishability";
import { getBankRowsForSubject } from "../data/bankChapters/loader";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS } from "../data/canonicalQuestionBank";
import type { CanonicalQuestion } from "../data/predictionTypes";

const BANK: CanonicalQuestion[] = [...getBankRowsForSubject("Maths"), ...getBankRowsForSubject("Science")];
const BY_ID = new Map(BANK.map((q) => [q.id, q]));
const RAW_BY_ID = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
const flagsByText = (q: CanonicalQuestion) =>
  Boolean((q as { requiresDiagram?: boolean }).requiresDiagram || demandsSuppliedFigure(`${q.questionText}\n${q.answer ?? ""}`));

/** Reviewed and KEPT blocked: the question really depends on a figure (or its text is damaged) — a blind re-solve could not
 *  answer it from the printed text, or the printed text is not complete. They stay out of Worksheets, Chapter Tests, Full Mocks. */
const STILL_BLOCKED = [ // RULE5-BIND-1: all ten (twelve before BANK-FIX-7 PR-2) are WITHHELD from the live bank, so the rule is read from the RAW bank
  "LP-M11", // answerable, but the stem says "Study the diagram of the human heart" with no diagram on the page (verifier, 10 Oct)
  "SCQ-S-MAG-040", // answerable, but the stem has a typo ("field fines") and the stored answer is cut off mid-word, no finalAnswer (verifier, 10 Oct)
  "METAL-NCERT-3-VSA-006", // NCERT metal/salt-solution table not printed
  "SCO-S-LIFE-009", // parts Q and R only in the missing diagram
  "SCQ-S-REPR-041", // part (b) labels A-D only in the diagram
  "SCQ-S-EYE-036", // diagram missing and the questions themselves are not printed
  "SCQ-S-ELEC-032", // V-I graph slopes only in the figure
  "SCQ-S-MAG-029", // field and particle directions only in the figure
  "SCQ-S-CTRL-042", // answerable, but stray page text inside the sentence (not complete as printed)
  "SCO-S-ELEC-012", // garbled wiring description; ideal cells have to be assumed
  // 11 Oct BANK-FIX-7 PR-2 (D80b): PYQ-M-TRI-005 and PYQ-S-2026-METAL-005 were restored from their official papers and are served
  // again; with the OCR damage gone Rule 5 no longer flags them, so they leave this list (twelve -> ten).
];

describe("D47c — Rule 5 reviewed allow-list", () => {
  const ids = Object.keys(RULE5_REVIEWED_NOT_NEEDED);

  // BANK-RESIDUE-1 (2026-10-23): 10 -> 9, PYQ-M-CIRC-012 left the list (its "Correct figure 1 Mark" note was deleted from the row).
  it("has the 9 reviewed rows, each with a dated, attributed reason", () => {
    expect(ids).toHaveLength(9);
    for (const id of ids) expect(RULE5_REVIEWED_NOT_NEEDED[id], id).toMatch(/^\d{4}-\d{2}-\d{2} B\/D47c: .{20,}/);
  });

  it.each(ids)("%s is a served row that Rule 5 WOULD flag and that has no bound figure (a stale entry fails)", (id) => {
    const q = BY_ID.get(id);
    expect(q, `${id} must be a served bank row`).toBeDefined();
    expect(flagsByText(q!), `${id}: Rule 5 must still flag it, else the entry is dead weight`).toBe(true);
    expect(defaultHasBoundFigure(id), `${id}: once a figure is bound the entry is redundant`).toBe(false);
  });

  it.each(ids)("%s is released on the paper surfaces", (id) => {
    expect(needsMissingFigure(BY_ID.get(id)!)).toBe(false);
  });

  it("CONTROL — the matching is not loosened: the same row under any other id is still held back", () => {
    for (const id of ids) {
      const q = BY_ID.get(id)!;
      expect(needsMissingFigure({ ...q, id: `${id}-NOT-LISTED` }), id).toBe(true);
    }
  });

  it("the ten reviewed-and-kept rows stay blocked (and are not on the list)", () => {
    for (const id of STILL_BLOCKED) {
      expect(ids.includes(id), id).toBe(false);
      expect(needsMissingFigure(RAW_BY_ID.get(id)!), id).toBe(true);
      expect(WITHHELD_QUESTION_IDS.has(id), `${id} is withheld from the live bank (RULE5-BIND-1)`).toBe(true);
    }
  });
});
