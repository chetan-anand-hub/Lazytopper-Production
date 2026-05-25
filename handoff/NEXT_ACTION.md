# LazyTopper — Next Action
# Updated: 2026-05-25 (post-PR #147 + #148)
# Base SHA: a52b10b4f9af3adc0161e8e2082cf7fc9e17f297

## CURRENT BASE

Branch: base/approved-thru-437
SHA: a52b10b4f9af3adc0161e8e2082cf7fc9e17f297
Last PRs: #147 (P4-M 2024, 96 Qs) + #148 (P4-S 2024, 76 Qs)

## BANK STATE

Authentic questions: ~3,245
Bank total: ~6,073
Spreads: 279
Board PYQs: 761
  214 from 2022-23 (PR #135+#137)
  193 from 2025-26 (PR #141+#142)
  182 from 2024-25 (PR #144+#145)
  172 from 2023-24 (PR #147+#148)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (~72.1% reached)

## PYQ EXTRACTION STATUS — COMPLETE

| Year | Maths | Science | Status |
|---|---|---|---|
| 2025-26 (pyqYear 2026) | 42 Qs ✓ | 151 Qs ✓ | Done PR #141+#142 |
| 2024-25 (pyqYear 2025) | 57 Qs ✓ | 125 Qs ✓ | Done PR #144+#145 |
| 2023-24 (pyqYear 2024) | 96 Qs ✓ | 76 Qs ✓ | Done PR #147+#148 |
| 2022-23 (pyqYear 2023) | 103 Qs ✓ | 111 Qs ✓ | Done PR #135+#137 |
| 2021-22 (pyqYear 2022) | 0 | 0 | LOW PRIORITY — Term II format |

All 4 main exam years extracted. P4 phase COMPLETE.

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — Fix Practice Filters + Step Marks (HIGH — product bug)
Branch: fix/practice-filters-complete (fresh)
Instruction file: agent-fix-practice-filters-complete-instruction.md (already generated)
Files: practiceQuestionBuilder.ts + PracticePage.tsx + PracticeQuestionCard.tsx
Bugs:
  1. isCompetencyBased not mapped in CanonicalQuestion→PracticeQuestion
  2. Proof filter checks "proof"/"prove" but format is "Long"/"Short"
  3. Same bugs in both practiceQuestionBuilder.ts AND PracticePage.tsx
  4. Step marks hidden for all canonical bank questions

### Task 2 — Fix Mojibake in NCERT/Exemplar files (HIGH — renders broken)
Branch: fix/mojibake-ncert-exemplar (fresh)
Problem: trigonometry.ncert.ts + trigonometry.exemplar.ts (and likely other
  NCERT/Exemplar files) have mojibake symbols: Ã‚Â², Ã¢ÂˆÂ , Ã¢â‚¬", Ã‚Â¢, etc.
  Math symbols extracted without ftfy.fix_text() on 2026-05-22.
Fix: byte-level replacement pass using ftfy + manual symbol map
  Ã¢â‚¬" → — (em dash)
  Ã¢ÂˆÂ† → △ (triangle)
  Ã‚Â² → ² (superscript 2)
  Ã‚Â° → ° (degree)
  Ã¢ÂˆÅš → √ (square root)
  Ã¢Âˆ  → ∠ (angle)
  Ãâ€" → × (multiplication)
  Ã¢â‰  → ≠ (not equal)
Scope: all *.ncert.ts + *.exemplar.ts files in maths/ and science/

### Task 3 — Handoff PR after Task 1 + 2 merge

### Task 4 — Audit v2 re-run
After filters fixed, re-run audit_question_bank_v2.py on correct branch
to get accurate per-topic section breakdown.

## PARKED (do not start yet)

Product PRs (strategyHint button, Show visual fix, Formula sheet, API gateway)
— parked until authentic count >= 4,500
— full detail in LazyTopper_Tutor_Content_Audit_Findings.md

K2H-8f-c (isPYQ backfill) — low priority
2022 Term II papers — low priority
P5 Sample papers — pending

## PIPELINE SCRIPTS

C:\Users\Chetan\OneDrive\Desktop\diff\p4s_probe.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_extract.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_generate_ts.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_checkpoint_b.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_pyq_reachability.mjs
