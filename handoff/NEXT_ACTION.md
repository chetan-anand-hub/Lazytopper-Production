# LazyTopper — Next Action
# Updated: 2026-05-25 (post-PR #141 + #142)
# Base SHA: 7a1ec2bd0c9da810a5c64f2d6e2f4463c4dafd7f

## CURRENT BASE

Branch: base/approved-thru-437
SHA: 7a1ec2bd0c9da810a5c64f2d6e2f4463c4dafd7f
Last PRs: #141 (P4-M 2026, 42 Qs) + #142 (P4-S 2026, 151 Qs)

## BANK STATE

Authentic questions: ~2,891
Bank total: ~5,719
Spreads: 228
Board PYQs: 407 (214 from 2022-23 + 193 from 2025-26)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (~64.2% reached)

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — P4 Continuation 2025 Maths (HIGH)
Branch: content/p4-pyq-2025-maths (fresh)
Sources (unzip first):
  QP: 041_Mathematics_Standard_2025.zip
  MS: Math_2025.zip (38 files — use 041 Mathematics Standard/ English subfolder only)
  Path: C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\
pyqYear: "2025"
ID prefix: PYQ-M-2025-{TOPICSHORT}-{SEQ}
Pipeline: p4s_probe.py → p4s_extract.py → p4s_generate_ts.py (adapt paths + year)
NOTE: Check paper structure in probe — 2025 may use traditional A/B/C/D/E sections
      (not subject-based like 2026). Adapt extractor accordingly.
Expected yield: ~80 Qs

### Task 2 — P4 Continuation 2025 Science (HIGH)
Branch: content/p4-pyq-2025-science (fresh)
Sources (unzip first):
  QP: 086_Science_2025.zip
  MS: Science_2025.zip (14 PDFs — combined all-sets per series)
  Path: same as above
pyqYear: "2025"
ID prefix: PYQ-S-2025-{TOPICSHORT}-{SEQ}
NOTE: Same paper structure check as Maths — probe first.
Can run parallel to Task 1 (different files, non-overlapping scope)
Expected yield: ~80 Qs

### Task 3 — P4 Continuation 2024 Maths + Science
After Tasks 1+2 merge.
Sources: MATHEMATICS_STANDARD_2024.zip + Mathematics_Standard_2024.zip
         SCIENCE_2024.zip + Science_2024.zip
Note: Science_2024.zip has Hindi subfolder — use English only
pyqYear: "2024"
Expected yield: ~80 Maths + ~80 Science

## PYQ EXTRACTION STATUS

| Year | Maths | Science | Status |
|---|---|---|---|
| 2025-26 (pyqYear 2026) | 42 Qs ✓ | 151 Qs ✓ | Done — PR #141 + #142 |
| 2024-25 (pyqYear 2025) | 0 | 0 | NEXT |
| 2023-24 (pyqYear 2024) | 0 | 0 | After 2025 |
| 2022-23 (pyqYear 2023) | 103 Qs ✓ | 111 Qs ✓ | Done — PR #135 + #137 |
| 2021-22 (pyqYear 2022) | 0 | 0 | Low priority — Term II format, pipeline adaptation needed |

## PYQ SOURCE PATH

C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\

All sources are zip archives — UNZIP BEFORE PROBING.
Expect ~10-15 Qs per text-extractable QP.
Expect ~6/16 QPs per zip to be scanned (0 chars) — always probe first.

## PIPELINE SCRIPTS

C:\Users\Chetan\OneDrive\Desktop\diff\p4s_probe.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_extract.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_generate_ts.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_checkpoint_b.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_pyq_reachability.mjs

## PARKED (do not start yet)

Product PRs (strategyHint button, Show visual fix, Formula sheet, API gateway)
— parked until authentic count >= 4,500
— full detail in LazyTopper_Tutor_Content_Audit_Findings.md (project knowledge)

K2H-8f-c (isPYQ backfill in predictionTypes.ts) — low priority, not blocking
2022 Term II papers — low priority, pipeline adaptation needed
