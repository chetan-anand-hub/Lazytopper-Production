# LazyTopper — Next Action
# Updated: 2026-05-25 (post-PR #139)
# Base SHA: b7add944a713430679de8c5e6d07dca49f4db272

## CURRENT BASE

Branch: base/approved-thru-437
SHA: b7add944a713430679de8c5e6d07dca49f4db272
Last PR: #139 — K2H-8f-b UI wire-up (PYQ chip end-to-end functional)

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — P4 Continuation 2026 Maths (HIGH — most recent exam)
Branch: content/p4-pyq-2026-maths (fresh)
Sources (unzip first):
  QP: Mathematics_Standard_2026.zip
  MS: 041_MATHEMATICS_STANDARD_2026.zip
  Path: C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\
pyqYear: "2026"
ID prefix: PYQ-M-2026-{TOPICSHORT}-{SEQ}
CRITICAL: Skip all 430-x-x series files (Maths Basic) — use 30-x-x only
Pipeline: p4s_probe.py → p4s_extract.py → p4s_generate_ts.py (adapt paths + year)
Expected yield: ~100 Qs

### Task 2 — P4 Continuation 2026 Science (HIGH — most recent exam)
Branch: content/p4-pyq-2026-science (fresh)
Sources (unzip first):
  QP: Science_2026.zip
  MS: 086_SCIENCE_2026.zip
  Path: same as above
pyqYear: "2026"
ID prefix: PYQ-S-2026-{TOPICSHORT}-{SEQ}
Pipeline: same as Task 1 (adapt subject + section ranges for Science)
Expected yield: ~100 Qs
Can run parallel to Task 1 (different files, non-overlapping scope)

### Task 3 — P4 Continuation 2025 Maths + Science
After Task 1+2 merge.
Sources: 041_Mathematics_Standard_2025.zip + Math_2025.zip
         086_Science_2025.zip + Science_2025.zip
Note: Math_2025.zip has 38 files — use 041 Standard English subfolder only
pyqYear: "2025"
Expected yield: ~80 Maths + ~80 Science

### Task 4 — P4 Continuation 2024 Maths + Science
After Task 3 merges.
Sources: MATHEMATICS_STANDARD_2024.zip + Mathematics_Standard_2024.zip
         SCIENCE_2024.zip + Science_2024.zip
Note: Science_2024.zip has Hindi subfolder — use English only
pyqYear: "2024"
Expected yield: ~80 Maths + ~80 Science

## BANK STATE (post-PR #139)

Authentic questions: ~2,698
Bank total: ~5,526
Spreads: 202
Board PYQs: 214 (2022-23 only — 2024/2025/2026 pending)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (60.0% reached)
Expected post-2026+2025+2024: ~3,218 authentic (~71% of threshold)

## PYQ SOURCE PATH

C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\

All sources are zip archives — UNZIP BEFORE PROBING.
Run p4s_probe.py (adapted) on each year before extraction.
Expect ~10-15 Qs per text-extractable QP. ~6/16 QPs per zip are scanned (0 chars).

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
