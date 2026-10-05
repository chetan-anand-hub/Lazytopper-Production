# GRADER-AUDIT-1 - golden SUPPLEMENT (GS-SUP-01..03)

Wave A-14 - scout S2b - 2026-10-05 - REPORT-ONLY - **zero model calls**. Built at Controller A's request after the S2b verification
found 0 valid "departure that returns" cases (spec section 2A minimum) and only 2 silly (copied-wrongly) cases.
S3 is mid-run, so `golden/items.json`, `golden/verify/items.verified.json` and every `expected_flat*.json` were NOT touched.

## Files
- `items.supplement.json` - 3 items in the items.json schema. Each item is a byte-faithful copy of S2's base item (question, scheme,
  value-point citations, chapter, syllabus, bankMatch) with `cases` replaced by ONE new typed case, plus a `supplement` block.
  **Merge rule:** append each item's `cases` to the item with the same `id` in items.json / items.verified.json.
- `tools/build_supplement.py` - regenerates the file from S2's items.json (read-only; its sha256 is asserted unchanged) and runs the sum checks.
- `tools/selfcheck.txt` - the check output.

## The three cases

| case | base item | source (paper · Q · PDF page) | probe | expected | contested |
|---|---|---|---|---|---|
| GS-SUP-01 | GS-M17 (bank PYQ-M-2025-AP-002) | MS 2025 Maths Std 041 30/1/1 · Q36 · PDF p16 (printed 16) | Maths departure that RETURNS, with marks lost in the departure zone | 2/4: (i) 0, (ii) 0+0, (iii) 1+1; conceptual (knowledge gap); departure at step 1, return at step 4 | no |
| GS-SUP-02 | GS-S15 (bank PYQ-S-2025-LIFEP-008, misfiled) | MS 2025 Science 086 31/1/1 · Q39 · PDF p11 (printed 11); QP 2025 31/1/1 p27 | Science departure that RETURNS with full recovery (cancelled lines) | 4/4; no type; nothing to MI; departure flag optional | yes - app case law 2 'deduct only for the slip itself' would give 3.5 |
| GS-SUP-03 | GS-S07 (bank PYQ-S-2025-LIGHT-009) | MS 2025 Science 086 31/1/1 · Q24 · PDF p4 (printed 4); QP 2025 31/1/1 p15 | copied wrongly (u = 60 cm copied as 90 cm), worked correctly from it | 1.5/2: formula ½, substitution 0 (penalised once), v = −22.5 cm 1 (ECF); silly (careless) | yes - controller decision as GS-M07-a: CBSE 'penalized only once' governs; app QUESTION_MISCOPY_PROMPT view 0.5/2 recorded |

Every scheme row carries S2's value-point citation (re-verified by S2b against my own PyMuPDF renders: MS 2025 30/1/1 p16;
MS 2025 31/1/1 pp4, 11; QP 2025 31/1/1 pp15, 27). The CBSE rule cited for ECF/penalise-once is MS general instruction 10
(MS 2025 Maths 30/1/1 p2, re-read).

## Method
- Base items were chosen from S2's set so the question text, scheme and citations are already verified (S2b verification, AGREE on all three items).
- Each answer is written to exercise exactly one behaviour, with all arithmetic checked:
  - SUP-01: aₙ = a + nd gives 500/550/600 and 700 (key 450/500/550, 650); S₁₀ = 5[600 + 450] = 5250. ECF does not rescue (ii): it re-applies the wrong METHOD, it carries no wrong VALUE.
  - SUP-02: I = P/V = 1000/220 = 4.545… (MS: 4.54 A), rating 5 A. The P = V/I lines are explicitly withdrawn by the student ('Ignore the two lines above').
  - SUP-03: −1/30 − 1/90 = −4/90 = −2/45 ⇒ v = −22.5 cm; the miscopy does not make the question easier (same steps), so app case law 4 does not apply. The question text gives 60 cm in the typed question (not only in a figure), so a grader can detect the miscopy.
- Student labels/headings follow the owner mapping (handoff/CURRENT_STATE.md:5125-5127 @53fe4d22) with the owner's em dash.
- Syllabus 2026-27: all three topics are retained (AP nth term/sum; domestic electric circuits under Magnetic Effects - not motor/EMI/generator; lens formula). No banned sub-topic (syllabusGuard.ts @53fe4d22).

## Sum checks (tools/selfcheck.txt)
```
GS-M17: scheme sum 4 == question marks 4 -> OK
  GS-SUP-01: perStep sum 2 == total 2 -> OK; within step max -> OK; half-grid -> OK; label mapping -> OK; wrongStep loses marks -> OK
GS-S15: scheme sum 4 == question marks 4 -> OK
  GS-SUP-02: perStep sum 4 == total 4 -> OK; within step max -> OK; half-grid -> OK; label mapping -> OK; wrongStep loses marks -> OK
GS-S07: scheme sum 2 == question marks 2 -> OK
  GS-SUP-03: perStep sum 3/2 == total 1.5 -> OK; within step max -> OK; half-grid -> OK; label mapping -> OK; wrongStep loses marks -> OK

PROBLEMS: NONE
```

## Contested points (for the merger)
1. **GS-SUP-03 (marks)**: golden 1.5/2 (CBSE instruction 10, controller decision) vs app-rule 0.5/2 (`checkSolution.cjs:1122` QUESTION_MISCOPY_PROMPT; case law 3 `:591`).
2. **GS-SUP-02 (marks)**: golden 4/4 (cancelled work is not assessed - the same convention S2 used for GS-M08-a and GS-S09-b) vs the app's ECF case law 2 'A slip the student then CORRECTS ... deduct only for the slip itself' (`lazytopper/server/routes/checkSolution.cjs:588-590` @53fe4d22, anchor: `2. A slip the student then CORRECTS`) -> 3.5/4. NOTE: the same app rule would also deduct on the existing GS-S09-b (self-corrected 2/100) - a conflict S2b did not flag in the verification report.
3. **GS-SUP-01**: not contested. The departure flag is REQUIRED here (wrong formula adopted and worked from through two parts, then explicitly abandoned); if a grader instead treats (i)/(ii) as two wrong parts and (iii) as an independent part (app case law 6) the marks are the same 2/4, so score departure-handling on the marks after the return first and the flag second.

## Not established
- No real handwriting/photo for these cases (typed only, as asked).
- Whether the owner wants a cancelled excursion charged at all (contested point 2).
