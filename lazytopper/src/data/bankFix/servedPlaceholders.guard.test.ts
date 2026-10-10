// @vitest-environment node
/**
 * Served rows must not show placeholder text: "REQUIRES-FIGURE…" (a note from extraction that a figure was missing)
 * or "Per MS…" (a pointer to the marking scheme instead of working). Either one in a field a student can open is a
 * non-solution (COFOUNDER DECISION 29a, 2026-10-10).
 *
 * Fields checked: questionText, options, answer, explanation, finalAnswer, solutionSteps, strategyHint. strategyHint
 * has no renderer today (no consumer outside src/data at 793976f3; predictionCore.ts only copies it through), but it is
 * checked anyway so a future renderer cannot surface a placeholder.
 *
 * 1. The 5 rows DIAGRAMS-1 PR-1b (#1045) served again are clean, and APQ-M-TRI-003 has real working.
 * 2. Every other served row with a placeholder is in KNOWN_PLACEHOLDER_ROWS: the backlog handed to BANK-FIX-6 group H
 *    (DECISION 28c). The list is a ratchet in both directions: a NEW placeholder goes red, and a row a bank lane cleans
 *    must be deleted from the list (a stale entry also goes red), so the list only shrinks.
 */
import { describe, expect, it } from "vitest";
import { canonicalQuestionBank } from "../canonicalQuestionBank";

const PLACEHOLDER = /REQUIRES-FIGURE|Per MS\b/i;
const FIELDS = ["questionText", "options", "answer", "explanation", "finalAnswer", "solutionSteps", "strategyHint"] as const;
type Row = (typeof canonicalQuestionBank)[number];
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
const placeholderFields = (q: Row): string[] => {
  const fields = q as unknown as Record<string, unknown>;
  return FIELDS.filter((f) => fields[f] != null && PLACEHOLDER.test(JSON.stringify(fields[f])));
};

// DIAGRAMS-1 PR-1b rows whose stale "REQUIRES-FIGURE" hint was cleared (their official figure is bound).
const PR1B_CLEANED = ["APQ-M-CIRC-010", "APQ-S-LIFE-002", "APQ-S-LIFE-012", "APQ-M-TRI-009", "APQ-M-TRI-003"];

// 2026-10-10 (B-21): 148 served rows, by runtime import at trunk 793976f3 + this PR. 136 only in strategyHint (not
// rendered); 12 also in solutionSteps (rendered): APQ-M-ARC-007 APQ-M-CG-003 APQ-M-STAT-007 APQ-M-TRIG-011 APQ-M-TRIG-016 CTRL-EXMPLR-6-SA-001 CTRL-EXMPLR-6-SA-005 REPR-EXMPLR-7-LA-001 REPR-EXMPLR-7-LA-003 REPR-EXMPLR-7-LA-005 REPR-EXMPLR-7-SA-008 REPR-EXMPLR-7-SA-020 
// Owned by BANK-FIX-6 group H (DECISION 28c): replace with real working, or withhold. Delete an id here when it is fixed.
const KNOWN_PLACEHOLDER_ROWS: readonly string[] = [
  "APQ-M-ARC-005",
  "APQ-M-ARC-007",
  "APQ-M-CG-001",
  "APQ-M-CG-003",
  "APQ-M-CG-007",
  "APQ-M-CG-009",
  "APQ-M-CIRC-003",
  "APQ-M-CIRC-005",
  "APQ-M-CIRC-011",
  "APQ-M-CIRC-012",
  "APQ-M-PLE-001",
  "APQ-M-PLE-009",
  "APQ-M-POLY-004",
  "APQ-M-PROB-007",
  "APQ-M-QE-007",
  "APQ-M-SAV-008",
  "APQ-M-SAV-009",
  "APQ-M-STAT-007",
  "APQ-M-TRI-006",
  "APQ-M-TRI-011",
  "APQ-M-TRIG-002",
  "APQ-M-TRIG-008",
  "APQ-M-TRIG-009",
  "APQ-M-TRIG-011",
  "APQ-M-TRIG-013",
  "APQ-M-TRIG-016",
  "APQ-S-ACID-005",
  "APQ-S-CARB-003",
  "APQ-S-CARB-006",
  "APQ-S-CHEM-003",
  "APQ-S-ELEC-003",
  "APQ-S-ELEC-004",
  "APQ-S-ELEC-005",
  "APQ-S-ELEC-006",
  "APQ-S-ENV-004",
  "APQ-S-EYE-002",
  "APQ-S-EYE-003",
  "APQ-S-EYE-006",
  "APQ-S-LIFE-013",
  "APQ-S-LIGHT-002",
  "APQ-S-LIGHT-007",
  "APQ-S-MAG-002",
  "APQ-S-MAG-006",
  "APQ-S-METAL-006",
  "APQ-S-METAL-010",
  "APQ-S-METAL-012",
  "CTRL-EXMPLR-6-LA-001",
  "CTRL-EXMPLR-6-LA-006",
  "CTRL-EXMPLR-6-SA-001",
  "CTRL-EXMPLR-6-SA-004",
  "CTRL-EXMPLR-6-SA-005",
  "ELEC-EXMPLR-11-LA-001",
  "ELEC-EXMPLR-11-MCQ-001",
  "ELEC-EXMPLR-11-MCQ-002",
  "ELEC-EXMPLR-11-MCQ-005",
  "ELEC-EXMPLR-11-MCQ-008",
  "ELEC-EXMPLR-11-MCQ-011",
  "ELEC-EXMPLR-11-SA-001",
  "ELEC-EXMPLR-11-SA-002",
  "ELEC-NCERT-11-LA-002",
  "ELEC-NCERT-11-LA-003",
  "ELEC-NCERT-11-LA-006",
  "ELEC-NCERT-11-LA-007",
  "ELEC-NCERT-11-LA-012",
  "ELEC-NCERT-11-SA-017",
  "EYE-EXMPLR-10-LA-001",
  "EYE-EXMPLR-10-LA-002",
  "EYE-EXMPLR-10-LA-003",
  "EYE-EXMPLR-10-LA-005",
  "EYE-EXMPLR-10-SA-001",
  "EYE-EXMPLR-10-SA-002",
  "EYE-EXMPLR-10-SA-005",
  "EYE-EXMPLR-10-SA-006",
  "EYE-NCERT-10-SA-007",
  "LIGHT-EXMPLR-9-LA-001",
  "LIGHT-EXMPLR-9-LA-002",
  "LIGHT-EXMPLR-9-LA-003",
  "LIGHT-EXMPLR-9-LA-004",
  "LIGHT-EXMPLR-9-LA-005",
  "LIGHT-EXMPLR-9-LA-009",
  "LIGHT-EXMPLR-9-MCQ-005",
  "LIGHT-EXMPLR-9-MCQ-006",
  "LIGHT-EXMPLR-9-MCQ-007",
  "LIGHT-EXMPLR-9-MCQ-014",
  "LIGHT-EXMPLR-9-MCQ-016",
  "LIGHT-EXMPLR-9-MCQ-017",
  "LIGHT-EXMPLR-9-SA-002",
  "LIGHT-EXMPLR-9-SA-009",
  "LIGHT-EXMPLR-9-SA-010",
  "LIGHT-NCERT-9-LA-007",
  "LIGHT-NCERT-9-LA-010",
  "LIGHT-NCERT-9-LA-011",
  "MAG-EXMPLR-12-LA-002",
  "MAG-EXMPLR-12-LA-003",
  "MAG-EXMPLR-12-LA-004",
  "MAG-EXMPLR-12-LA-007",
  "MAG-EXMPLR-12-MCQ-003",
  "MAG-EXMPLR-12-MCQ-005",
  "MAG-EXMPLR-12-MCQ-009",
  "MAG-EXMPLR-12-SA-001",
  "MAG-EXMPLR-12-SA-002",
  "MAG-EXMPLR-12-SA-003",
  "MAG-NCERT-12-MCQ-004",
  "MAG-NCERT-12-SA-002",
  "MAG-NCERT-12-SA-003",
  "REPR-EXMPLR-7-LA-001",
  "REPR-EXMPLR-7-LA-003",
  "REPR-EXMPLR-7-LA-005",
  "REPR-EXMPLR-7-SA-008",
  "REPR-EXMPLR-7-SA-020",
  "REPR-NCERT-7-LA-001",
  "SCO-S-CARB-011",
  "SCO-S-CTRL-014",
  "SCO-S-ELEC-006",
  "SCO-S-ELEC-012",
  "SCO-S-ELEC-013",
  "SCO-S-EYE-008",
  "SCO-S-LIFE-009",
  "SCO-S-LIGHT-005",
  "SCO-S-REPR-019",
  "SCQ-S-CTRL-039",
  "SCQ-S-CTRL-043",
  "SCQ-S-ELEC-022",
  "SCQ-S-ELEC-023",
  "SCQ-S-ELEC-026",
  "SCQ-S-ELEC-032",
  "SCQ-S-ELEC-041",
  "SCQ-S-EYE-031",
  "SCQ-S-EYE-035",
  "SCQ-S-EYE-036",
  "SCQ-S-EYE-037",
  "SCQ-S-LIFE-044",
  "SCQ-S-LIGHT-031",
  "SCQ-S-LIGHT-033",
  "SCQ-S-LIGHT-038",
  "SCQ-S-LIGHT-039",
  "SCQ-S-LIGHT-040",
  "SCQ-S-LIGHT-041",
  "SCQ-S-LIGHT-042",
  "SCQ-S-LIGHT-043",
  "SCQ-S-LIGHT-044",
  "SCQ-S-MAG-029",
  "SCQ-S-MAG-039",
  "SCQ-S-MAG-040",
  "SCQ-S-MAG-043",
  "SCQ-S-MAG-044",
  "SCQ-S-METAL-040",
  "SCQ-S-REPR-041",];

describe("served rows show no placeholder text (DECISION 29a)", () => {
  it.each(PR1B_CLEANED)("%s is served with no placeholder in any student-visible field", (id) => {
    const q = served.get(id);
    expect(q, id).toBeDefined();
    expect(placeholderFields(q as Row)).toEqual([]);
    expect((q as Row).strategyHint, id).toBeUndefined();
  });

  it("APQ-M-TRI-003 has real one-mark working that reaches the unchanged key 111/7 cm", () => {
    const q = served.get("APQ-M-TRI-003") as Row;
    expect(q.options).toEqual(["69/7 cm", "53/5 cm", "76/5 cm", "111/7 cm"]);
    expect(q.answer).toBe("111/7 cm");
    expect(q.finalAnswer).toBe("(d) 111/7 cm");
    expect(q.questionText.startsWith("Harsha made a wind chime using a frame and metal rods.")).toBe(true);
    expect(q.solutionSteps).toHaveLength(1); // Section A, 1 mark: one step
    const step = (q.solutionSteps ?? [])[0] ?? "";
    expect(step.startsWith("[1 mark]")).toBe(true);
    for (const working of ["7 × 2 = 14 cm", "4 × 2 = 8 cm", "29 − (29 − 6) × 8/14", "29 − 92/7 = 111/7 cm"]) {
      expect(step, working).toContain(working);
    }
  });

  it("every other served row with a placeholder is exactly the known BANK-FIX-6 backlog (new ones and fixed ones both fail)", () => {
    const found = canonicalQuestionBank.filter((q) => placeholderFields(q).length > 0).map((q) => q.id).sort();
    const known = [...KNOWN_PLACEHOLDER_ROWS].sort();
    expect(found.filter((id) => !known.includes(id)), "NEW placeholder rows: fix them or withhold").toEqual([]);
    expect(known.filter((id) => !found.includes(id)), "FIXED or unserved: delete from KNOWN_PLACEHOLDER_ROWS").toEqual([]);
    expect(new Set(known).size).toBe(known.length);
    expect(known.filter((id) => PR1B_CLEANED.includes(id))).toEqual([]);
  });

  it("control: the pattern catches both placeholder forms in a rendered field and ignores ordinary text", () => {
    expect(PLACEHOLDER.test("REQUIRES-FIGURE: a diagram")).toBe(true);
    expect(PLACEHOLDER.test("Per MS: Rod P = 111/7 cm.")).toBe(true);
    expect(PLACEHOLDER.test("Using the figure, per the marking scheme")).toBe(false);
  });
});
