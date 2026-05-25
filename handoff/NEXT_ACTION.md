# LazyTopper — Next Action
# Updated: 2026-05-25 (post-PR #144 + #145)
# Base SHA: 3ae34749d9745bfbbf283dfa3dbcf3f89007bc3f

## CURRENT BASE

Branch: base/approved-thru-437
SHA: 3ae34749d9745bfbbf283dfa3dbcf3f89007bc3f
Last PRs: #144 (P4-M 2025, 57 Qs) + #145 (P4-S 2025, 125 Qs)

## BANK STATE

Authentic questions: ~3,073
Bank total: ~5,901
Spreads: 253
Board PYQs: 589
  214 from 2022-23 (PR #135 + #137)
  193 from 2025-26 (PR #141 + #142)
  182 from 2024-25 (PR #144 + #145)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (~68.3% reached)

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — P4 Continuation 2024 Maths (HIGH)
Branch: content/p4-pyq-2024-maths (fresh)
Sources (unzip first):
  QP: MATHEMATICS_STANDARD_2024.zip
  MS: Mathematics_Standard_2024.zip
  Path: C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\
pyqYear: "2024"
ID prefix: PYQ-M-2024-{TOPICSHORT}-{SEQ}
Skip any 430-x-x Maths Basic files if present
NOTE: Check paper structure at probe — may be traditional or subject-based
Expected yield: ~80 Qs
Can run PARALLEL with Task 2

### Task 2 — P4 Continuation 2024 Science (HIGH)
Branch: content/p4-pyq-2024-science (fresh)
Sources (unzip first):
  QP: SCIENCE_2024.zip
  MS: Science_2024.zip
  ⚠️ Science_2024.zip has Hindi subfolder — use English only subfolder
  Path: same as above
pyqYear: "2024"
ID prefix: PYQ-S-2024-{TOPICSHORT}-{SEQ}
NOTE: Check paper structure at probe
Can run PARALLEL with Task 1

## PYQ EXTRACTION STATUS

| Year | Maths | Science | Status |
|---|---|---|---|
| 2025-26 (pyqYear 2026) | 42 Qs ✓ | 151 Qs ✓ | Done — PR #141 + #142 |
| 2024-25 (pyqYear 2025) | 57 Qs ✓ | 125 Qs ✓ | Done — PR #144 + #145 |
| 2023-24 (pyqYear 2024) | 0 | 0 | NEXT |
| 2022-23 (pyqYear 2023) | 103 Qs ✓ | 111 Qs ✓ | Done — PR #135 + #137 |
| 2021-22 (pyqYear 2022) | 0 | 0 | Low priority — Term II format |

## PARALLEL AGENT PROTOCOL (established 2026-05-25)

1. Both agents run extraction in parallel (different file scopes — non-overlapping)
2. Maths agent commits + pushes to its branch first
3. Science agent rebases onto post-Maths SHA (dropping any working-tree contamination)
4. Science agent force-pushes (if classifier blocks: owner runs CLI push directly)
5. Sequential merge: Maths PR first → new SHA → Science rebases → Science PR merges
6. Handoff PR after both merge

## PYQ SOURCE PATH

C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\

All sources are zip archives — UNZIP BEFORE PROBING.
Expect ~10-15 Qs per text-extractable QP.
Always probe before extraction — check both char count AND paper structure.

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
