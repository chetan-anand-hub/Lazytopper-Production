# LazyTopper Next Action
Timestamp: 2026-05-23

## IMMEDIATE — next session tasks (in priority order)

1. Resource audit of cbse-papers folder
   Check for existing _audit_pass1b_*.txt files first
   If missing: fresh audit of C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\
   Goal: establish full PYQ extractable question inventory
   Mode: Low

2. Register assertion_reason_pack.ts
   File: C:\Users\Chetan\OneDrive\Desktop\diff\assertion_reason_pack.ts
   Validate schema + register in canonicalQuestionBank.ts
   Branch: content/ar-pack-registration
   Mode: Low

3. Mistake Intelligence audit (read-only)
   Read: mistakeLogService.ts, MistakeIntelCard.tsx,
         MistakeIntelligencePanel.tsx, CheckAndImprovePage, MePage
   Save: C:\Users\Chetan\OneDrive\Desktop\diff\mi-audit.md
   Mode: Low

4. Solution Checker audit (read-only)
   Find SolutionChecker.tsx, read in full
   Save: C:\Users\Chetan\OneDrive\Desktop\diff\solution-checker-audit.md
   Mode: Low

5. Quick wins bundle (one PR)
   - Wire strategyHint as Hint button in PracticeQuestionCard.tsx
   - Fix index.html meta (149/month → 2999/year, theme-color)
   - Fix CLAUDE.md tsc command
   - Fix mobile TopicHub Learn tile routing
   Branch: fix/quick-wins-bundle
   Mode: Low

6. PYQ extraction (after resource audit confirms sources)
   Branch: content/pyq-extraction
   Years: 2023, 2024, 2025 Maths + 2023 Science
   Tag: pyqYear, isPYQ: true
   Mode: High

7. Engine fix K2H-8f (alongside PYQ extraction)
   File: lazytopper/src/data/practiceSetGenerator.ts
   Fix: bias pool toward pyqYear questions when pyqOnly===true
   Branch: fix/pyq-engine-bias
   Mode: Medium

8. Mistake Intelligence wiring (after audit)
   Wire MistakeIntelligencePanel into practice debrief + Me/Progress
   Branch: fix/mi-wiring
   Mode: Medium

9. Solution Checker implementation (after audit)
   Connect to MI, improve CBSE marking scheme alignment
   Branch: fix/solution-checker-mi
   Mode: High

10. Mock Builder + Worksheet design alignment
    Branch: fix/mock-builder-design, fix/worksheet-design
    Mode: Medium each

## PARKED — do not touch

- PR #69 / K2D — solution provenance draft. Do not merge.
- PR #17 — diagnostic categories. Preservation only.
