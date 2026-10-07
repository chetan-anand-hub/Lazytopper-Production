/**
 * CBQ-1 (C3 PR-T, 2026-10-07): OFFICIAL Maths rows tagged `competencyVerified: true`.
 * Each passed ruling 1 (competency, not recall), carries a full [N mark] scheme summing to its
 * marks (figure bound where needed), and an independent BLIND solver reproduced every part's
 * answer and marks on the row as it stands on trunk after BANK-FIX-1 PR-2 (#1007). Every 1-mark
 * row here is an MCQ (owner ruling). Pinned by officialCbqTags.maths.test.ts (tagged set === this
 * list). Rows whose text, answer or steps changed after the blind solve, rows BANK-FIX filed under
 * Others, ambiguous rows, figure-dependent rows without a figure solve, and every disagreement were
 * left untagged (listed in the PR report). Never edit this list by hand without the same
 * classify → blind-solve → compare evidence.
 */
export const OFFICIAL_CBQ_MATHS_IDS: readonly string[] = [
  "AP-N-EXEM-5-LA-002",
  "APQ-M-STAT-004",
  "APQ-M-TRIG-009",
  "CBE-M-AP-C-001",
  "CBE-M-CG-C-002",
  "CBE-M-CIRC-D-001",
  "CBE-M-PLE-C-003",
  "CBE-M-PLE-C-004",
  "CBE-M-RN-A-005",
  "CBE-M-RN-B-002",
  "CBE-M-RN-B-003",
  "CBE-M-RN-B-004",
  "CBE-M-RN-B-005",
  "CBE-M-RN-C-001",
  "CBE-M-RN-C-002",
  "CBE-M-SAV-A-002",
  "CBE-M-SAV-B-001",
  "CBE-M-SAV-C-001",
  "CBE-M-SAV-C-003",
  "CBE-M-SAV-C-004",
  "CFPQ-M-POLY-004",
  "CFPQ-M-POLY-009",
  "CFPQ-M-REALNUM-001",
  "CFPQ-M-REALNUM-003",
  "CFPQ-M-REALNUM-007",
  "CFPQ-M-REALNUM-008",
  "CFPQ-M-REALNUM-010",
  "PROB-N-EXEM-14-LA-001",
  "PYQ-M-2025-PROB-008",
  "PYQ-M-2025-STAT-006",
  "PYQ-M-2025-TRIG-005",
  "SAV-N-EXEM2-12-LA-002",
  "SAV-N-EXEM2-12-LA-003",
  "SAV-N-EXEM2-12-LA-004",
  "SAV-N-EXEM2-12-LA-006",
  "SAV-N-EXEM2-12-LA-007",
  "SAV-N-EXEM2-12-LA-012",
  "SAV-N-EXEM2-12-LA-013",
  "SP-M-2022-ARC-E-001",
  "SP-M-2022-PLE-C-002",
  "SP-M-2022-RN-A-002",
  "SP-M-2022-SAV-D-001",
  "SP-M-2022-TRIG-E-001",
  "STAT-N-EXEM2-13-SA-005",
  "TRIG-N-EXMPLR-9-LA-004",
];
