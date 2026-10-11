/**
 * RULE5-BIND-1 (11 Oct, cofounder D68b/c) — the machine-readable reason category of every row this lane withheld.
 *
 * No served row may need a figure it lacks. Three official crops were bound (APQ-M-CIRC-012, SQP-S-HER-003, APQ-S-ELEC-006);
 * these 16 rows have no allowed figure source (booklet-only, owner rule) or damaged text, so they are withheld on every surface.
 * The reason text sits on each id's line in `WITHHELD_QUESTION_IDS` (canonicalQuestionBank.ts); this map carries only the
 * CATEGORY, in the vocabulary the GEN-THIN-1 template guard already reads (`figure` | `garbled` | `wrong-key`), so a withheld
 * row that a generated row was shaped from is judged by the same rule as the BANK-FIX-1 PR-2 and BANK-FIX-5 withholds.
 */
export const RULE5_BIND_1_WITHHOLD_CATEGORY: ReadonlyMap<string, "figure" | "garbled" | "wrong-key"> = new Map([
  // needs-figure-no-source: the figure exists only in a booklet (not an allowed source) or in no source on disk
  ["SCO-S-LIGHT-005", "figure"],
  ["SCO-S-ELEC-013", "figure"],
  ["SCQ-S-ELEC-041", "figure"],
  ["SCO-S-LIFE-009", "figure"],
  ["SCQ-S-REPR-041", "figure"],
  ["SCQ-S-EYE-036", "figure"],
  ["SCQ-S-ELEC-032", "figure"],
  ["SCQ-S-MAG-029", "figure"],
  ["ELEC-NCERT-11-LA-002", "figure"], // "Redraw the circuit of Question 1": the circuit is another question's words
  ["LP-M11", "figure"], // "Study the diagram of the human heart" with no diagram on the page
  // the official NCERT in-text grid is blank and the stored key answers a different question
  ["METAL-NCERT-3-VSA-006", "wrong-key"],
  // answerable but the printed text is damaged: a bank repair lane re-keys or restores them from the source
  ["SCQ-S-MAG-040", "garbled"],
  ["SCQ-S-CTRL-042", "garbled"],
  ["SCO-S-ELEC-012", "garbled"],
  ["PYQ-M-TRI-005", "garbled"],
  ["PYQ-S-2026-METAL-005", "garbled"],
]);
