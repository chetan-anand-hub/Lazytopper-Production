// @vitest-environment node
/**
 * BANK-FIX-7 PR-2 (#973 DECISION 80b) - the RULE5-BIND-1 withholds that a bank repair could fix. Read through the assembled bank.
 *   SERVED AGAIN (official rows, wording restored from the source, never re-worded; LANE_RULES §8):
 *   - PYQ-M-TRI-005: CBSE 2023 Maths Standard 30/4/1 Q33. OCR damage repaired (CA², AB/PQ = AD/PM); the KEY used △CDA, but the
 *     marking scheme pairs △CBA ~ △CAD (C↔C, B↔A, A↔D).
 *   - PYQ-S-2026-METAL-005: CBSE 2026 Science 31/3/1 Q28. The English parts (b), (c)(i), OR (c)(ii) are restored (the stored text was
 *     the Hindi half of the page), and the row is the official 4 marks (1 + 1 + 2), a Section E case-based item.
 *   - ELEC-NCERT-11-LA-002: NCERT jesc111 p.185 in-text Q2. "Redraw the circuit of Question 1" now carries Q1's own circuit in words.
 *   STILL WITHHELD: SCQ-S-MAG-040 and SCQ-S-CTRL-042 (text repaired; the answers cite the booklet's own figure), SCO-S-ELEC-012
 *   (no allowed source), METAL-NCERT-3-VSA-006 (duplicate of METAL-NCERT-3-SA-004).
 * This file never reads the clock.
 */
import { describe, expect, it } from "vitest";
import "../../test/preloadBankChapters";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { needsMissingFigure } from "../../lib/figureSafe";

type Row = { id: string; questionText: string; answer?: string; solutionSteps?: string[]; marks: number; section: string; format: string };
const served = new Map((canonicalQuestionBank as unknown as Row[]).map((q) => [q.id, q]));
const raw = new Map((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => [q.id, q]));
const steps = (q: Row) => (q.solutionSteps ?? []).join("\n");
const markSum = (q: Row) => (q.solutionSteps ?? []).reduce((t, s) => t + Number(/^\[(\d+) marks?\]/.exec(s)?.[1] ?? 0), 0);

describe("BANK-FIX-7 PR-2 - repaired official rows are served again", () => {
  it.each(["PYQ-M-TRI-005", "PYQ-S-2026-METAL-005", "ELEC-NCERT-11-LA-002"])("%s is served, not withheld, needs no missing figure", (id) => {
    const q = served.get(id);
    expect(q, `${id} must be served`).toBeDefined();
    expect(WITHHELD_QUESTION_IDS.has(id)).toBe(false);
    expect(needsMissingFigure(q!)).toBe(false);
    expect(markSum(q!)).toBe(q!.marks); // every step carries one mark token and the steps sum to the marks
  });

  it("PYQ-M-TRI-005: official wording restored and the key pairs △CBA ~ △CAD (marking scheme)", () => {
    const q = served.get("PYQ-M-TRI-005")!;
    expect(q.questionText).toContain("prove that CA² = CB.CD");
    expect(q.questionText).toContain("prove that AB/PQ = AD/PM.");
    expect(q.questionText).not.toMatch(/CA2 = CB\.CD 5|AB AD PQ PM =/);
    expect(steps(q)).toContain("△CBA ~ △CAD by the AA similarity criterion");
    expect(steps(q)).not.toContain("△CDA");
  });

  it("PYQ-S-2026-METAL-005: the official 4-mark case item with its English parts", () => {
    const q = served.get("PYQ-S-2026-METAL-005")!;
    expect([q.section, q.marks, q.format]).toEqual(["E", 4, "Case-Based"]);
    expect(q.questionText).toContain("(b) In electrolytic refining of copper, name the anode and the cathode.");
    expect(q.questionText).toContain("show the extraction of copper from its ore Cu2S");
    expect(q.questionText).not.toContain("1 () - , 1 ()");
    expect(q.solutionSteps).toHaveLength(4);
  });

  it("ELEC-NCERT-11-LA-002: the stem names the circuit itself (no reference to another question)", () => {
    const q = served.get("ELEC-NCERT-11-LA-002")!;
    expect(q.questionText).toContain("a battery of three cells of 2 V each, a 5 Ω resistor, an 8 Ω resistor, and a 12 Ω resistor, and a plug key, all connected in series");
    expect(q.questionText).not.toContain("Question 1");
  });
});

describe("BANK-FIX-7 PR-2 - repaired text, still withheld", () => {
  it("SCQ-S-MAG-040 / SCQ-S-CTRL-042: typos and truncations repaired; withheld (the answer cites the booklet's own figure)", () => {
    const mag = raw.get("SCQ-S-MAG-040")!;
    const ctrl = raw.get("SCQ-S-CTRL-042")!;
    expect(mag.questionText).toContain("magnetic field lines of a bar magnet");
    expect(mag.answer).toMatch(/align themselves along the magnetic field lines\.$/);
    expect(ctrl.questionText).toBe("Describe an activity to illustrate the phenomenon of phototropism and explain why does this occur.");
    expect(ctrl.answer).toMatch(/for a few days\.$/);
    for (const id of ["SCQ-S-MAG-040", "SCQ-S-CTRL-042", "SCO-S-ELEC-012", "METAL-NCERT-3-VSA-006"]) {
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(served.has(id), id).toBe(false);
    }
  });
});
