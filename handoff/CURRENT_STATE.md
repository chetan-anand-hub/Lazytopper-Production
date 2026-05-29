# LazyTopper — Current State
Last updated: 2026-05-29 (post-PR #155)

## Live base
Branch: base/approved-thru-437
SHA: 99533830ff9b1d4654bf4968e36151ccb7531815
Last merged PR: #155 (fix: practice engine marks/section + competency + blueprint)

## Bank state
Total questions: ~5,821 (flat) / ~6,120 (incl. builders)
Authentic: 3,139 (53%) | AI-generated: 2,689 (46%)
Spreads: 266 | Tests: 137/137 PASS
PYQs: 760 total — all 4 main years complete (2023/2024/2025/2026)
Mojibake: 0 files affected (bank is clean)
TopicKey orphans: 0

## Recent PRs (post-handoff backfill)
#134 — Handoff docs post-#132+#133
#135 — P4-M PYQ Maths 103 Qs (2022-23, pyqYear "2023")
#136 — Handoff post-#135
#137 — P4-S PYQ Science 111 Qs (2022-23)
#138 — Handoff post-#137
#139 — K2H-8f-b UI wire-up (pyqOnly end-to-end, 137/137)
#140 — Handoff post-#139
#141 — P4-M PYQ Maths 42 Qs (2025-26, pyqYear "2026")
#142 — P4-S PYQ Science 151 Qs (2025-26)
#143 — Handoff post-#141+#142
#144 — P4-M PYQ Maths 57 Qs (2024-25, pyqYear "2025")
#145 — P4-S PYQ Science 125 Qs (2024-25)
#146 — Handoff post-#144+#145
#147 — P4-M PYQ Maths 96 Qs (2023-24, pyqYear "2024")
#148 — P4-S PYQ Science 76 Qs (2023-24)
#149 — Handoff post-#147+#148
#150 — P4-M PYQ Maths 96 Qs (2024 set, pyqYear "2024")
#151 — fix: permanent tagging/filter/step marks (ISSUE-001+002 CLOSED)
#152 — Handoff post-#150+#151
#153 — fix: filter UX redesign (student-language chips, pending/committed state)
#154 — fix: source filter double-count + chip constraints + ISSUE-006/007
#155 — fix: practice engine marks/section/competency/blueprint <- CURRENT

## Filter system state (post-PR #155)
All filter chips: WORKING
Engine section routing: WORKING (engineSectionFilter maps marks to section)
CBSE blueprint distribution: WORKING (5-section parallel fetch for "All" marks)
COMPETENCY_MIN_SHARE: gated by enforceCompetencyFloor flag
  - Quick practice: false (student filters honoured)
  - ChapterTestPage: true
  - DailyMissionService (x4): true
availableCount: now shows bank count pre-Build (bankAvailableCount from engine)
Step marks: showing correctly (guide-only banner removed in #151)

## Open P0 issues
API gateway 404 in production (Railway + vercel.json rewrite needed)
Clerk pk_test_ keys in production (switch to pk_live_ on Vercel)

## Open P1 issues
Sprint 1 CBSE official content (~480 Qs from files already on disk)
Practice end-of-session debrief
TopicKey cleanup (51 non-canonical keys in AI-Pack files — cosmetic)
Case-based questions tagged "Easy" need re-tag to "Medium"

## Next safe actions (in order)
1. Merge this handoff PR
2. API gateway Railway deploy (P0 for AI features in production)
3. Clerk pk_live_ switch (P0, 2 minutes on Vercel)
4. Sprint 1 CBSE content extraction (480 Qs already on disk)
5. Practice end-of-session debrief (needed before Sep/Oct PT1)
6. PYQ 2019-20 extraction (after download from cbse.gov.in)
