/**
 * GARBLE-1 (D152, 13-14 Oct 2026) - the machine-readable reason category of every row this lane withheld for a damaged STEM
 * (fractions, symbols, structures or words lost at PDF extraction). The reason text sits on each id's line in
 * `WITHHELD_QUESTION_IDS` (canonicalQuestionBank.ts); this map carries only the CATEGORY, in the vocabulary the GEN-THIN-1
 * template guard already reads, so a generated row that was shaped from one of these (its question TYPE, not its damaged text) is
 * judged by the same rule as the BANK-FIX-1 PR-2, RULE5-BIND-1 and BANK-FIX-5 `garbled` withholds. Each id leaves this map in the
 * REPAIR-GARBLE PR that serves it again.
 */
export const GARBLE_1_WITHHOLD_CATEGORY: ReadonlyMap<string, "garbled"> = new Map<string, "garbled">([
  ["PYQ-M-2026-TRI-005", "garbled"],
  ["PYQ-S-2025-ACID-010", "garbled"],
  ["PYQ-S-2026-ACID-019", "garbled"],
  ["PYQ-S-2024-CARB-002", "garbled"],
  ["PYQ-S-2025-CARB-001", "garbled"],
  ["PYQ-S-2026-CHEMRXN-020", "garbled"],
  ["PYQ-S-2025-REPR-007", "garbled"],
  ["PYQ-S-2026-REPR-005", "garbled"],
  ["PYQ-S-LIFE-013", "garbled"],
  ["PYQ-S-2024-LIFEP-008", "garbled"],
  ["PYQ-S-2026-LIFEP-014", "garbled"],
  ["PYQ-S-CHEM-010", "garbled"],
]);
