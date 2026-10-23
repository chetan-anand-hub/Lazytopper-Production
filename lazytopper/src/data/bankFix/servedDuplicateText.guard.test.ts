// @vitest-environment node
/**
 * PYQ-RESTORE-B PR-2 (controller ruling, 2026-10-23) - BANK-WIDE SERVED-DUPLICATE GUARD.
 *
 * No two SERVED rows may share the same normalised question text (NFKC, lower-case, dashes folded, whitespace and
 * punctuation dropped). Review of #1303 found two served-twice pairs (PYQ-M-2024-TRIG-010b = 2024-TRIG-011b, a genuine
 * CBSE set repeat; APQ-M-TRI-004 = PYQ-M-2025-TRI-009); one copy of each is now withheld
 * (bankFix/pyqRestoreBLedger.ts PYQ_RESTORE_B_DEDUPE_WITHHELD).
 *
 * KNOWN_SERVED_TEXT_DUPLICATES is the set this guard found on the day it was written. They are REPORTED, not fixed
 * (some are true duplicates, some are generic stems such as "Which of the following statements is incorrect ?" whose
 * options differ) - a later lane decides each. The guard is a RATCHET: a NEW group is a red, and a group that stops
 * being a duplicate must be removed from the list (the list cannot go stale).
 */
import { describe, expect, it } from "vitest";
import { canonicalQuestionBank } from "../canonicalQuestionBank";

const normaliseQuestionText = (t: unknown): string =>
  String(t ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-―−]/g, "-")
    .replace(/[\s.,;:?!'"‘’“”()[\]{}-]/g, "");

/** Measured 2026-10-23 on the PYQ-RESTORE-B PR-2 tree: 55 groups, 119 served rows. */
const KNOWN_SERVED_TEXT_DUPLICATES: readonly (readonly string[])[] = [
  ["2026-TRIG-P1-A-013", "TRIG2-E04"],
  ["2026-TRIG-P1-A-015", "TG3-025"],
  ["PYQ-M-2024-TRIG-018", "TRIG2-M03"],
  ["TG3-040", "TRIG2-M04"],
  ["TRIG-PRF-C-002", "TRIG2-H05"],
  ["TRIG-PRF-C-006", "TRIG2-H12"],
  ["TG3-027", "TRIG2-E13"],
  ["TG3-004", "TRIG2-E14"],
  ["RN-E02", "RN-N-NCERT-1-MCQ-001"],
  ["RN-E05", "RN2-008"],
  ["RN-E19", "RN-N-NCERT-1-MCQ-002"],
  ["RN-N02", "RN2-012"],
  ["RN-N-NCERT-1-LA-002", "RN2-010"],
  ["RN-N-NCERT-1-LA-003", "RN2-011"],
  ["RN-N-NCERT-1-LA-001", "RN2-034", "RN2-050"],
  ["QE-E01", "QE-N-EXMPLR-4-MCQ-001", "QE-N-NCERT-4-MCQ-001", "QE2-001", "QE2-051"],
  ["QE-E02", "QE2-046"],
  ["QE-E04", "QE-N02"],
  ["QE2-045", "QE2-047"],
  ["AP-N-NCERT-5-MCQ-005", "AP2-004"],
  ["ARC-E08", "ARC2-051"],
  ["PR2-028", "PROB-E01"],
  ["PB-M-1-PROB-A-001", "PR2-046"],
  ["CR2-001", "CR2-050"],
  ["ABS2-005", "ABS2-053"],
  ["CC-E01", "CNC2-026"],
  ["REP-E03", "REP2-029"],
  ["REP2-001", "REP2-049"],
  ["LT-E04", "LT2-049"],
  ["LT-E10", "LT2-008", "LT2-061"],
  ["LT-E15", "LT2-014"],
  ["HEC2-003", "SCQ-S-EYE-023"],
  ["EL-E05", "EL2-056"],
  ["EL2-031", "EL2-052"],
  ["ME2-004", "ME2-030"],
  ["BX-HER-EX-A-004", "PYQ-M-2025-TRI-005"],
  ["BX-POLY-EX-A-006", "LIGHT-EXMPLR-9-MCQ-008", "TRIG-N-NCERT-8-MCQ-001"],
  ["ACID-EXMPLR-2-MCQ-019", "SCO-S-ACID-017"],
  ["METAL-EXMPLR-3-MCQ-013", "SCO-S-METAL-006"],
  ["CARB-EXMPLR-4-MCQ-015", "SCO-S-CARB-019"],
  ["CARB-EXMPLR-4-MCQ-025", "SP-S-2023-CARB-A-001"],
  ["LIFE-NCERT-5-SA-006", "SCQ-S-LIFE-028"],
  ["MAG-EXMPLR-12-MCQ-004", "PYQ-S-MAG-005"],
  ["PLE-N-NCERT-3-LA-002", "SQP-M-PLE-002"],
  ["CBE-M-QE-A-003", "QE-N-EXMPLR-4-MCQ-006"],
  ["CG-N-NCERT-7-EX-009", "PYQ-M-2025-CG-005"],
  ["SQP-M-TRIG-002", "TRIG-N-NCERT-8-MCQ-004"],
  ["CIR-PRF-D-003", "CIRC-N-NCERT-10-SA-004"],
  ["APQ-M-CIRC-006", "CIR-PRF-D-004", "CIRC-N-NCERT-10-SA-005"],
  ["CIR-PRF-C-005", "CIRC-N-NCERT-10-LA-002"],
  ["CBE-M-PROB-A-005", "PROB-N-EXEM-14-MCQ-002", "PROB-N-NCERT-14-MCQ-001"],
  ["BX-TRI-EX-A-003", "LTG-M-TRI-003"],
  ["PYQ-M-2025-CIRC-004", "PYQ-M-CIRC-012"], // BANK-RESIDUE-1 (23 Oct): PYQ-M-2024-CIRC-008b (garbled) withheld from this group
  ["FND-L-SPM-023", "FND-L-WSF-08"],
  ["FND-L-SPM-027", "FND-L-WSF-07"],
];

const key = (ids: readonly string[]) => [...ids].sort().join(" ");

describe("served-duplicate guard (bank-wide)", () => {
  const groups = new Map<string, string[]>();
  for (const q of canonicalQuestionBank) {
    const k = normaliseQuestionText(q.questionText);
    if (!k) continue;
    const g = groups.get(k);
    if (g) g.push(q.id);
    else groups.set(k, [q.id]);
  }
  const found = [...groups.values()].filter((ids) => ids.length > 1).map(key).sort();
  const known = KNOWN_SERVED_TEXT_DUPLICATES.map(key).sort();

  it("no NEW group of served rows shares a normalised question text", () => {
    expect(found.filter((k) => !known.includes(k))).toEqual([]);
  });

  it("the known list is not stale: every listed group is still served-twice exactly as listed", () => {
    expect(known.filter((k) => !found.includes(k))).toEqual([]);
  });

  it("CONTROL: the dedupe ruling's pairs are not served together, and the normaliser folds dash / space / punctuation", () => {
    const served = new Set(canonicalQuestionBank.map((q) => q.id));
    expect(served.has("PYQ-M-2024-TRIG-010b") && served.has("PYQ-M-2024-TRIG-011b")).toBe(false);
    expect(served.has("APQ-M-TRI-004") && served.has("PYQ-M-2025-TRI-009")).toBe(false);
    expect(normaliseQuestionText("If sin (A − B) = 1/2 ;")).toBe(normaliseQuestionText("if sin (A – B) = 1/2"));
    expect(normaliseQuestionText("5√3")).not.toBe(normaliseQuestionText("53"));
  });
});
