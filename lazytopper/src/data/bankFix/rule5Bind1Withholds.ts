/**
 * RULE5-BIND-1 (11 Oct, cofounder D68b/c) — the machine-readable reason category of every row this lane withheld.
 *
 * No served row may need a figure it lacks. Three official crops were bound (APQ-M-CIRC-012, SQP-S-HER-003, APQ-S-ELEC-006);
 * these rows have no allowed figure source (booklet-only, owner rule) or damaged text, so they are withheld on every surface.
 * The reason text sits on each id's line in `WITHHELD_QUESTION_IDS` (canonicalQuestionBank.ts); this map carries only the
 * CATEGORY, in the vocabulary the GEN-THIN-1 template guard already reads (`figure` | `garbled` | `wrong-key`), so a withheld
 * row that a generated row was shaped from is judged by the same rule as the BANK-FIX-1 PR-2 and BANK-FIX-5 withholds.
 *
 * BANK-FIX-7 PR-2 (11 Oct, cofounder D80b): 16 -> 13. ELEC-NCERT-11-LA-002, PYQ-M-TRI-005 and PYQ-S-2026-METAL-005 were repaired
 * from their official sources and are served again. SCQ-S-MAG-040 and SCQ-S-CTRL-042 had their text repaired, but their answers
 * cite the booklet's own figure, so they stay withheld and move from `garbled` to `figure`.
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
  ["LP-M11", "figure"], // "Study the diagram of the human heart" with no diagram on the page
  ["SCQ-S-MAG-040", "figure"], // text repaired (BANK-FIX-7 PR-2); the answer cites the booklet's own figure
  ["SCQ-S-CTRL-042", "figure"], // text repaired (BANK-FIX-7 PR-2); the answer cites the booklet's own diagram
  // the official NCERT in-text grid is blank and the stored key answers a different question; a duplicate of METAL-NCERT-3-SA-004
  ["METAL-NCERT-3-VSA-006", "wrong-key"],
  // the printed text is damaged and no allowed source can restore it
  ["SCO-S-ELEC-012", "garbled"],
]);
