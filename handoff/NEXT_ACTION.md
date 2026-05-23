# LazyTopper — Next Action

Last updated: 2026-05-23 (post-PR #112)
Live base SHA: 8c8acf40f129949cac47adf8a769d8fdc6128c79

## Immediate next action: P0.5 — Probe 3 remaining diff/ pack files

Priority order for this session or next session:

### 1. P0.5 — Probe + register remaining diff/ pack files (Low mode, ~1 hour)

Files to probe:
  C:\Users\Chetan\OneDrive\Desktop\diff\maths_case_based_pack.ts  (~23.8 KB)
  C:\Users\Chetan\OneDrive\Desktop\diff\science_case_based_pack.ts  (~24.8 KB)
  C:\Users\Chetan\OneDrive\Desktop\diff\circles_proof_pack.ts  (~18.5 KB)

For each file:
  1. Count questions (count "id": occurrences)
  2. Read topicKey values — expect title-case (same pattern as P0)
  3. Check schema completeness (solutionSteps, isCompetencyBased, section, marks)
  4. Check format field (expect "Proof" → needs "Short"/"Long" fix same as P0)
  5. If clean after topicKey + format fix: register in canonicalQuestionBank.ts
  6. Run all 6 validations
  7. Save report to diff/report-p05-pack-registration.md

Branch: content/register-diff-packs-p05
Expected yield: ~30-80 questions

### 2. P1-M — CBSE Practise Papers Maths Standard (High mode, ~1 session)

Source: C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\CBSE Practise Papers\Maths Std.pdf
Pages: 234 | Extractable: YES (pdfplumber) | MS: bundled inline
Expected yield: ~400-550 questions across all 13 Maths topics, all 5 sections
Branch: content/practise-papers-maths
ID prefix: PP-M-{TOPIC_SHORT}-{SEQ}
File naming: maths/{topicSlug}.practise.ts (one file per topic)

Symbol restoration required before extraction:
  θ missing where sin/cos/tan present → restore
  ° missing where angle of elevation/depression present → restore
  √ missing where square root mentioned → restore

### 3. P1-S — CBSE Practise Papers Science (High mode, ~1 session)

Source: C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X\CBSE Practise Papers\Science.pdf
Pages: 321 | Extractable: YES | MS: bundled inline
Expected yield: ~400-550 questions across all 12 Science topics, all 5 sections
Branch: content/practise-papers-science
ID prefix: PP-S-{TOPIC_SHORT}-{SEQ}
File naming: science/{topicSlug}.practise.ts (one file per topic)

## Full extraction queue (reference)

P0   ✅ COMPLETE — PR #112 (62 Qs, AR+proof packs)
P0.5 ⏳ PENDING  — 3 remaining diff/ packs (~30-80 Qs)
P1-M ⏳ PENDING  — Practise Papers Maths (~400-550 Qs)
P1-S ⏳ PENDING  — Practise Papers Science (~400-550 Qs)
P2   ⏳ PENDING  — Additional PQ 2023-24 + SQP (~344 Qs)
P3   ⏳ PENDING  — Meridian worksheets + Maths QB READY (~475 Qs)
P4-M ⏳ PENDING  — cbjemaco + cbjemacq Maths (~750-1,050 Qs)
P4b-S ⏳ PENDING — Science Chapter-wise cbjescco+cbjesccq (~1,422 Qs)
P5-M ⏳ PENDING  — PYQ papers Maths 2022-2025 (~400 Qs) [requires K2H-8f fix]
P5-S ⏳ PENDING  — PYQ papers Science 2022-2025 (~400 Qs)
P6   ⏳ PENDING  — Sample papers + Preboard PDFs (~200 Qs)
P7   ⏳ PENDING  — Pack retirement (trigger: authentic count ≥ 6,000)
P8   🔒 DEFERRED — OCR-gated sources (~1,100 Qs, needs OCR tool)

Pack retirement threshold: 6,000 authentic questions
Current authentic total: 1,609 (post-PR #112)
Target authentic total (P0-P6, no OCR): ~5,920 net after 15% dedup

## Engine fix required before P5

K2H-8f: practiceSetGenerator.ts does not bias pool toward pyqYear-tagged questions.
PYQ filter returns 0 results when pyqOnly===true.
Branch: fix/pyq-engine-bias
Mode: Medium
Do alongside or before P5-M PYQ extraction.

## Operating rules for all content sessions

- SHA verification mandatory before every agent prompt
- All 6 validations before every content commit
- Owner reviews extraction report before any commit
- Every content PR followed immediately by a docs-only handoff PR
- Anti-fabrication: every question from source PDF only
- topicKey must match topics.ts exactly — verify before every extraction
- No Maths Basic papers (only Standard syllabus)
- Pack files must NOT be deleted until authentic count ≥ 6,000
