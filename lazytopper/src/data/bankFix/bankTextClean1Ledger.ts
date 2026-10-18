// lazytopper/src/data/bankFix/bankTextClean1Ledger.ts
//
// BANK-TEXT-CLEAN-1 (2026-10-18) - the MUTATION LEDGER for the bank text-clean lane.
// Owner brief: one PR, low priority; NONE of these edits may change a mark or a correct answer.
// One entry per bank row this lane touched, plus the record #1234 (TRI-AA-ANSWERS) left without one.
//   verdict "text-cleaned"  - wording / labels / a finalAnswer / an explanation changed in the row's own
//                             source file; `fields` = the runtime fields that differ. Marks, options and
//                             the key (`answer`) are unchanged and `key` pins the key the row must still carry.
//   verdict "comment-only"  - only a provenance comment beside the row changed (no runtime field).
//   verdict "ledger-only"   - only another lane's ledger text about the row changed.
//   verdict "re-justified"  - RECORD ONLY for #1234 (2320dc0a): solutions argue by AA similarity instead of
//                             citing Theorem 6.7 (deleted 2026-27 Pythagoras section); keys unchanged.
// Pinned by bankTextClean1.test.ts. Row ids are never changed. Served total is unchanged by this lane.

export interface BankTextClean1Entry {
  id: string;
  verdict: "text-cleaned" | "comment-only" | "ledger-only" | "re-justified";
  /** The follow-up this entry closes. */
  fu: string;
  fields: readonly string[];
  /** The key the row must still carry, unchanged (rows whose key this lane could have touched). */
  key?: string;
  why: string;
}

export const BANK_TEXT_CLEAN_1_LEDGER: readonly BankTextClean1Entry[] = [
  // -- [FU-TRI-AA-NITS] -------------------------------------------------------------------------------
  { id: "TRI-N-NCERT-6-LA-006", verdict: "text-cleaned", fu: "FU-TRI-AA-NITS", fields: ["strategyHint"], why: "The hint described the three similar triangles formed by the altitude from the right angle, i.e. it paraphrased Theorem 6.7 (deleted with the 2026-27 Pythagoras section). Rewritten to the AA route the #1234 solution uses: pick two right triangles sharing an acute angle, prove AA, write the ratio." },
  { id: "TRI-N-NCERT-6-LA-006", verdict: "re-justified", fu: "FU-TRI-AA-NITS", fields: ["answer", "solutionSteps", "finalAnswer"], why: "RECORD for #1234 (2320dc0a): parts (i)-(iii) proved by AA similarity (ABC ~ DBA, BCA ~ ACD, ACD ~ BAD); finalAnswer citation 'Theorem 6.7' -> 'AA similarity' (cofounder call); the three results are unchanged." },
  { id: "TRI-N-EXMPLR-6-LA-007", verdict: "re-justified", fu: "FU-TRI-AA-NITS", fields: ["answer", "solutionSteps", "strategyHint", "sourceOverride"], why: "RECORD for #1234 (2320dc0a): solution argued by AA similarity, no Theorem 6.7; key unchanged; sourceOverride 'others' (content-changed Exemplar row)." },
  { id: "TRI-N-EXMPLR-6-MCQ-001", verdict: "re-justified", fu: "FU-TRI-AA-NITS", fields: ["solutionSteps", "strategyHint", "sourceOverride"], why: "RECORD for #1234 (2320dc0a): justification by AA similarity, no Theorem 6.7; option and key unchanged; sourceOverride 'others'." },
  // -- Maths wording ----------------------------------------------------------------------------------
  { id: "TRIG2-AR01", verdict: "text-cleaned", fu: "FU-BANK-TRIG2-AR01-PBH", fields: ["questionText", "explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "The Reason used p, b, h without saying what they are; it now defines perpendicular p (opposite θ), base b (adjacent to θ) and hypotenuse h. The generic 'scientific/mathematical basis' explanation is replaced by the actual derivation. Key unchanged." },
  { id: "TG3-037", verdict: "text-cleaned", fu: "FU-BANK-TG3-037-STEP-WORDING", fields: ["solutionSteps"], key: "sin² θ + cos² θ = 1", why: "Step 1 ran the result and the method together ('... divided by hypotenuse²') and stated the conclusion before the working. Steps now go: Pythagoras on the sides, divide by hypotenuse², read the ratios as sin and cos. Still 3 steps, key unchanged." },
  { id: "ARC2-056", verdict: "text-cleaned", fu: "FU-BANK-ARC2-056-FIG-LABELS", fields: ["solutionSteps"], key: "Subtracting area of triangle from area of sector", why: "The step named sector OAPB and triangle OAB with no figure and no definition of O, A, P, B. The labels are now defined in the step (O centre, AB chord, P on the minor arc). Key unchanged." },
  // -- finalAnswer rows carrying working (D231 / #1144) ------------------------------------------------
  { id: "QE2-048", verdict: "text-cleaned", fu: "FU-MATHS-FINALANSWER-WORKING", fields: ["finalAnswer"], key: "Two equal real roots", why: "finalAnswer held the working 'D = 16−16 = 0 → two equal roots: x = −2.'; now the final answer only: 'Two equal real roots'. The working stays in the step and explanation." },
  { id: "PR2-046", verdict: "text-cleaned", fu: "FU-MATHS-FINALANSWER-WORKING", fields: ["finalAnswer"], key: "1/2", why: "finalAnswer held 'Prime numbers on die: 2, 3, 5. P = 3/6 = 1/2.'; now '1/2'." },
  { id: "ARC2-052", verdict: "text-cleaned", fu: "FU-MATHS-FINALANSWER-WORKING", fields: ["finalAnswer"], key: "308 cm²", why: "finalAnswer held the whole computation; now '308 cm²'." },
  // -- [FU-BANK-GENERIC-BASIS-EXPLANATIONS] -----------------------------------------------------------
  { id: "ARC-E07", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: semicircle = 180° sector, (180/360)πr² = πr²/2." },
  { id: "ARC-M17", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: π(2r)² = 4πr²." },
  { id: "PLE-E17", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: 1/2 = 1/2 ≠ 1/3, parallel lines, no solution." },
  { id: "QE-E11", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: D = −7 < 0, no real roots." },
  { id: "QE-E16", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: (x − 3)² = 0 only at x = 3." },
  { id: "QE-M10", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: expands to x² − 3x + 2 = 0 with a = 1 ≠ 0." },
  { id: "STAT-M10", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: Σfx/Σf is a weighted average of class marks, so it lies between the extreme class marks." },
  { id: "SAV-E13", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: (1/3)πr²h against πr²h." },
  { id: "TRI2-AR02", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "Both A and R are true, and R is the correct explanation of A.", why: "Generic A-R filler replaced: statement of the converse of BPT applied to AD/DB = AE/EC." },
  { id: "CG-E18", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "√[(x₂−x₁)²+(y₂−y₁)²]", why: "'Recall from the key concepts' filler replaced: the two coordinate gaps are the legs of a right triangle (numeric use of a² + b² = c², IN for 2026-27)." },
  { id: "TRI2-E04", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "2:3", why: "'Recall' filler replaced: DE ∥ BC, BPT gives AD/DB = AE/EC = 2/3." },
  { id: "SAV-E15", verdict: "text-cleaned", fu: "FU-BANK-GENERIC-BASIS-EXPLANATIONS", fields: ["explanation"], key: "πr²h", why: "'Recall' filler replaced: volume = base area × height = πr² × h." },
  // -- Science ----------------------------------------------------------------------------------------
  { id: "SCQ-S-ENV-028", verdict: "text-cleaned", fu: "FU-BANK-SCQ-ENV-028-FRAGMENT", fields: ["answer", "solutionSteps", "finalAnswer"], why: "The answer, step 2 and finalAnswer ended with the fragment '(how: UV releases chlorine from CFCs)'. Written as a sentence: UV radiation releases chlorine from the CFCs, and the chlorine breaks down ozone. Same content, same 2 marks." },
  { id: "SCQ-S-LIFE-028", verdict: "text-cleaned", fu: "FU-BANK-SCQ-LIFE-BOARD-TAGS", fields: ["questionText"], why: "Removed the board tag '[Delhi 2017]' from the stem: the row carries no pyqYear and must not read as a past board question." },
  { id: "SCQ-S-LIFE-029", verdict: "text-cleaned", fu: "FU-BANK-SCQ-LIFE-BOARD-TAGS", fields: ["questionText"], why: "Removed the board tag '[Delhi 2017]' from the stem (no pyqYear on the row)." },
  { id: "SCQ-S-LIFE-042", verdict: "text-cleaned", fu: "FU-BANK-SCQ-LIFE-BOARD-TAGS", fields: ["questionText"], why: "Removed the board tag '[All India 2018]' from the stem (no pyqYear on the row)." },
  { id: "SCQ-S-CARB-041", verdict: "text-cleaned", fu: "FU-BANK-CARB-041D-NAME", fields: ["answer", "solutionSteps", "finalAnswer"], why: "Owner-approved 18 Oct: part (d) HCOOH + Na now names the products 'sodium methanoate (sodium formate)' and hydrogen gas, instead of 'a sodium salt'. Equation and marks unchanged." },
  { id: "SCQ-S-CTRL-030", verdict: "text-cleaned", fu: "FU-BANK-CTRL-030-NCERTREF", fields: ["ncertRef"], why: "ncertRef 'cbjesccq07 Q1' -> 'cbjesccq07 Q30': since the SCI-BACKLOG-1 repair the stem and key are booklet Q30 (feedback mechanism), as the row's own repair comment says." },
  { id: "OE-NCERT-13-SA-013", verdict: "text-cleaned", fu: "FU-OE-NCERT-NITS", fields: ["subtopic"], why: "Subtopic 'Ozone Layer Depletion' -> 'Ozone Layer and Its Depletion', the label its sibling OE-NCERT-13-SA-006 (same NCERT section) carries. Both labels map to the same concept, so concept coverage does not move." },
  { id: "SCQ-S-CARB-026", verdict: "comment-only", fu: "FU-BANK-CARB-CITATIONS", fields: [], why: "Provenance comment: structural isomers are NCERT jesc104 section 4.2.2, not 4.2.3." },
  { id: "SCQ-S-CARB-032", verdict: "comment-only", fu: "FU-BANK-CARB-CITATIONS", fields: [], why: "Provenance comment: ethanol + sodium and the dehydration to ethene are NCERT section 4.4.1 (p. 72), not 4.3 / 4.3.1." },
  { id: "SCQ-S-CARB-036", verdict: "comment-only", fu: "FU-BANK-CARB-CITATIONS", fields: [], why: "Provenance comment records the source the #1229 review gave for the C4H8 stem: CBSE 2017 Delhi, set 31/1/1. The row gains no pyqYear." },
  { id: "SCQ-S-LIGHT-044", verdict: "ledger-only", fu: "FU-BANK-SCQ-LIGHT-044-LEDGER", fields: [], why: "bankSteps1Ledger evidence repeated the object-at-F misreading; a correction note is appended (object at F -> image at infinity; between F and 2F -> real, inverted, enlarged). The row itself was already right after #1230." },
];
