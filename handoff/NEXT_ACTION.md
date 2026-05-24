# LazyTopper — Next Action

Last updated: 2026-05-24 (post-PR #117)
Live base SHA: a38573b6e5ca0db4cff6153be273fdb160047ad8

## Immediate next action: P2 — CBSE Additional PQ 2023-24 + SQP extraction (RESUME from Checkpoint A)

Branch: `content/additional-pq-sqp-2024` (already exists locally, off base SHA `e9f41cd`;
will need rebase onto current base `a38573b` before resuming).
Mode: High (~1–2 sessions).

### Status

**Paused at Checkpoint A — source inventory complete, owner-approved, extraction not started.**
See `C:\Users\Chetan\OneDrive\Desktop\diff\report-p2-source-inventory.md` for the full
source manifest and `_p2_inventory.py` for the inventory script.

The prerequisite blocker for P2 (`syllabusGuard.ts` outdated for CBSE 2025-26) was fixed
in PR #117 and is now merged. P2 extraction may now resume.

### Source folder

`C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\Class X-20260521T030909Z-3-001\Class X\CBSE Syllabus+sample paper 2023 2024\`

### Sources — Maths (3 APQ + 1 SQP, all paired)

| QP file | Pages | Paired MS | MS Pages | Header |
|---|---:|---|---:|---|
| Mathematics-PQ1.pdf | 28 | Mathematics-PQ1_MS.pdf | 22 | CBSE ADDITIONAL PRACTICE QUESTIONS — MATHEMATICS STANDARD (041) Class X 2023–24 |
| Mathematics-PQ2.pdf | 7 | Mathematics-PQ2MS2.pdf | 7 | Additional Practice Question Paper Class X Session 2023-24 MATHEMATICS STANDARD (Code No.041) |
| Mathematics-PQ_2022.pdf | 20 | Mathematics-PQ_2022_MS.pdf | 13 | Practice Questions Session 2022-23 Class X Subject- Mathematics (Standard) |
| MathsStandard-SQP.pdf | 10 | MathsStandard-MS.pdf | 9 | SAMPLE QUESTION PAPER Class X Session 2023-24 MATHEMATICS STANDARD (Code No.041) |

### Sources — Science (3 APQ + 1 SQP — one MS missing → owner approved skip)

| QP file | Pages | Paired MS | Notes |
|---|---:|---|---|
| Science-PQ.pdf | 14 | Science-PQMS.pdf | Use |
| Science-PQ2.pdf | 10 | Science-PQMS2.pdf | Use |
| Science-PQ (1).pdf | 14 | **— missing —** | **SKIP** per owner approval (2026-05-24) |
| Science-SQP.pdf | 8 | Science-MS.pdf | Use |

### ID prefixes (collision-free vs current 1,365 IDs)

- `APQ-M-{TOPIC_SHORT}-{SEQ:003d}` — Maths Additional PQ
- `APQ-S-{TOPIC_SHORT}-{SEQ:003d}` — Science Additional PQ
- `SQP-M-{TOPIC_SHORT}-{SEQ:003d}` — Maths SQP
- `SQP-S-{TOPIC_SHORT}-{SEQ:003d}` — Science SQP

### Expected scope

After dropping Science-PQ (1).pdf: ~65 pages of Maths QPs + ~32 pages of Science QPs.
Estimated yield: ~270 questions total (lower than the prompt's 344 estimate because of the
dropped 2022-23 Science set).

### Doctrine applied (post-PR #117)

- `solutionSteps` minimums: A=1, B=2, C=3, D=5, E=4 per new CLAUDE.md §13.
- syllabusGuard now blocks 30 Maths + 82 Science banned subtopics. New extracted questions
  must avoid all of them.
- isPYQ stays `false` for both APQ and SQP (these are practice/sample, not board exam PYQs).
- Section E case sets: ONE row per case, marks=4 (combine sub-parts (i)/(ii)/(iii)).

### Operating order when resuming

1. Switch to base, fast-forward, then either rebase `content/additional-pq-sqp-2024` onto
   `a38573b` or delete and recreate from current base.
2. Re-confirm Step B2 (topics.ts slugs unchanged, ID prefix collision-free).
3. Step B4 extraction (per-topic) with Checkpoint B mini-test after each file.
4. Step B5 register in `canonicalQuestionBank.ts` (only files actually created).
5. Step B6 run all 6 validations (the new syllabusGuard MUST pass — no banned subtopics
   in extracted content).
6. Step B7 final verification report.
7. Step B8 STOP for owner approval.
8. Step B9 commit + push + PR after explicit approval.

Full task script: `LazyTopper_P1S_Probe_P2_Agent_Prompt.md` Part B (saved in agent prompts).

---

## After P2: Follow-up PRs queued from PR #117

### Follow-up #1 — ops/ acceptance test alignment (small, docs-only)

Branch: `fix/ops-our-environment-alignment` (suggested)
Mode: Low.

Reconcile `lazytopper/scripts/ops/` files with the new doctrine that Our Environment Ch15
is fully deleted per CBSE 2025-26:

- `cbse_registry_2026_27_acceptance.mjs` line 26-30: add "Our Environment" to
  `EXCLUDED_CHAPTER_TITLES`. Line 208-218: invert or remove the
  `our_environment_chapter_present_in_scope` assertion.
- `science_deleted_zeroing_acceptance.ts` line 226-249: update or remove the
  "food chains under Our Environment NOT zeroed" assertion (currently expects ecology
  retained).
- `generate_content_backlog_and_matrix.mjs` line 210-215: align "our environment"
  handling with the deleted-chapter doctrine.
- May also need to update `lazytopper/src/prediction/cbseHistoricalArchetypes.ts` to add
  Our Environment to the SCIENCE_DELETED_CHAPTERS_2026_27 constant. Verify in scope first.

### Follow-up #2 — Reproduction question bank cleanup (data-only)

Branch: `content/reproduction-banned-cleanup` (suggested)
Mode: Low.

15 questions flagged by the updated syllabusGuard as out-of-syllabus Ch8 Reproductive
Health content. Decide per question whether to:
- Remove (if entirely about deleted Reproductive Health / Contraception / STDs sub-topics)
- Reclassify subtopic to a retained sub-topic in the same chapter

Files:
- `lazytopper/src/data/questionBanks/class10/science/reproduction.exemplar.ts` —
  STDs ×2, Contraception ×1
- `lazytopper/src/data/questionBanks/class10/science/reproduction.ncert.ts` —
  Contraception ×1
- `lazytopper/src/data/questionBanks/class10/science/reproduction.pack2.ts` —
  Reproductive Health ×11

After cleanup, `syllabusGuard` against existing bank must return 0 violations.

---

## Full extraction queue (reference)

| Phase | Status | Notes |
|---|---|---|
| P0    | ✅ COMPLETE | PR #112 (62 Qs, AR+proof packs) |
| P0.5  | ✅ COMPLETE | PR #114 (21 Qs, case-based Sec E merged + circles proof) |
| PRE-P1| ✅ COMPLETE | PR #116 (mojibake symbol restoration in P0.5 case-based files; ftfy-based, 499 char repairs) |
| **P1-M** | ❌ **ABANDONED** | Source `CBSE Practise Papers/Maths Std.pdf` is a NODIA 3rd-party compilation with no inline solutions (external hyperlinks only), pdfplumber math-layout corruption, no topic tagging. See `report-p1m-ABANDONED.md`. |
| **P1-S** | ❌ **ABANDONED** | Source `CBSE Practise Papers/Science.pdf` probed 2026-05-24 — same NODIA blockers as P1-M. See `report-p1s-probe.md`. |
| **P2**   | ⏸️ **NEXT** — paused at Checkpoint A | Branch `content/additional-pq-sqp-2024` alive; CBSE-official; source inventory approved by owner; extraction not yet started. |
| Guard fix | ✅ COMPLETE | PR #117 (syllabusGuard + bannedExercises + CLAUDE.md §13) — prerequisite for P2 extraction. |
| P3    | ⏳ PENDING  | Meridian worksheets + Maths QB READY (~475 Qs) |
| P4-M  | ⏳ PENDING  | cbjemaco + cbjemacq Maths (~750–1,050 Qs) |
| P4b-S | ⏳ PENDING  | Science Chapter-wise cbjescco+cbjesccq (~1,422 Qs) |
| P5-M  | ⏳ PENDING  | PYQ papers Maths 2022-2025 (~400 Qs) [requires K2H-8f fix] |
| P5-S  | ⏳ PENDING  | PYQ papers Science 2022-2025 (~400 Qs) |
| P6    | ⏳ PENDING  | Sample papers + Preboard PDFs (~200 Qs) |
| P7    | ⏳ PENDING  | Pack retirement (trigger: authentic count ≥ 6,000) |
| P8    | 🔒 DEFERRED | OCR-gated sources (~1,100 Qs, needs OCR tool) |

Pack retirement threshold: 6,000 authentic questions
Current authentic total: 1,630 (unchanged since post-PR #114; PR #116 was encoding-only, PR #117 was docs/config-only)

## Engine fix required before P5

K2H-8f: `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged questions.
PYQ filter returns 0 results when `pyqOnly===true`.
Branch: `fix/pyq-engine-bias`
Mode: Medium.
Do alongside or before P5-M PYQ extraction.

## Operating rules for all content sessions

- SHA verification mandatory before every agent prompt
- All 6 validations before every content commit (new syllabusGuard is stricter now)
- Owner reviews extraction report before any commit (Checkpoint B per-file + Checkpoint A final)
- Every content PR followed immediately by a docs-only handoff PR
- Anti-fabrication: every question from source PDF only — never paraphrase
- topicKey must match `topics.ts` exactly — verify before every extraction
- Pack files must NOT be deleted until authentic count ≥ 6,000
- isPYQ stays `false` for practice/sample papers (only set true for actual board exam PYQs)
- `solutionSteps` minimums per CLAUDE.md §13: A=1, B=2, C=3, D=5, E=4 (CBSE 2025-26 OSM)
- For Science: avoid all 82 banned subtopics in syllabusGuard.ts (incl. Our Environment chapter)
- For Maths: avoid all 30 banned subtopics (incl. Constructions chapter, Frustum of Cone,
  Ogive/Step Deviation, Complementary-Angle Trig Ratios, Cross-Multiplication)
