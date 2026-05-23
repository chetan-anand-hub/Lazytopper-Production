IMMEDIATE:
1. Quality audit of existing pack1/pack2/pack3 questions
   File: quality-assessment-report.md in diff folder (already generated)
   Decision needed: which packs to keep, fix, or replace with NCERT extractions
   Priority: High (trust issue — AI-generated questions without source verification)

2. PYQ extraction
   Branch: content/pyq-extraction
   Sources: cbse-papers/extracted/_text/ (87 text-extractable papers)
   Years available: 2023, 2024, 2025 Maths + 2023 Science
   Tag with: pyqYear, isPYQ: true
   Effort: High mode, 2 sessions (Maths PYQ + Science PYQ separately)

3. Engine fix K2H-8f — PYQ filter returns 0
   Branch: fix/pyq-engine-bias
   File: lazytopper/src/data/practiceSetGenerator.ts
   Fix: bias candidate pool toward pyqYear-tagged questions when pyqOnly===true
   Effort: Medium mode

4. Register assertion_reason_pack.ts
   File exists at: C:\Users\Chetan\OneDrive\Desktop\diff\assertion_reason_pack.ts
   Validate schema, register in canonicalQuestionBank.ts
   Effort: Low mode

5. Handoff update for PR #108 (deletionGuard fix) — may have been missed
   Check: does CURRENT_STATE.md record PR #108?

POST-CONTENT PRODUCT WORK:
6. Mock Builder — design grammar alignment
7. Worksheet Generator — design grammar alignment
8. Wire strategyHint as Hint button in PracticeQuestionCard.tsx
9. Fix index.html meta (149/month, wrong theme-color)
10. Firebase Auth migration (K2H-15) — replace Clerk
