# LazyTopper — Next Action

Last updated: 2026-05-24 (post-PR #119)
Live base SHA: c5b8c51e22a2fffc0afb9109d0c230511160ab8d

## Immediate next actions — three follow-ups queued

P2 SQP merged successfully (PR #119, +69 authentic Qs, 1,630 → 1,699). Three follow-up
PRs are queued, in suggested order. Items #1 and #2 are small docs/data cleanups that
unblock bank-wide validation; item #3 is the next content extraction.

### Follow-up #1 — Reproduction question bank cleanup (small, data-only)

Branch (suggested): `content/reproduction-banned-cleanup`
Mode: Low.

15 existing questions are flagged by syllabusGuard as out-of-syllabus Ch 8 Reproductive
Health content (deleted in CBSE 2025-26). This is the long-running V1 validation failure
across PRs #117 and #119 — cleanup unblocks it.

Files to touch:
- `lazytopper/src/data/questionBanks/class10/science/reproduction.exemplar.ts` — STDs ×2, Contraception ×1
- `lazytopper/src/data/questionBanks/class10/science/reproduction.ncert.ts` — Contraception ×1
- `lazytopper/src/data/questionBanks/class10/science/reproduction.pack2.ts` — Reproductive Health ×11

For each flagged question, decide:
- **Remove** if entirely about deleted Reproductive Health / Contraception / STDs sub-topics
- **Reclassify** the `subtopic` to a retained sub-topic in the same chapter (e.g. "Human
  Reproductive System — Anatomy", "Vegetative Propagation", "Sexual Reproduction in Plants")
  AND verify the question text itself doesn't depend on the deleted concept

After cleanup, `syllabusGuard` against existing bank must return **0 violations**.

### Follow-up #2 — ops/ acceptance test alignment for Our Environment (small, code-only)

Branch (suggested): `fix/ops-our-environment-alignment`
Mode: Low.

`syllabusGuard.ts` now bans the entire "Our Environment" chapter (Ch 15 — deleted per CBSE
2025-26). Existing ops/ acceptance tests still expect the chapter to be present. Reconcile:

- `lazytopper/scripts/ops/cbse_registry_2026_27_acceptance.mjs` — line 26-30 add
  "Our Environment" to `EXCLUDED_CHAPTER_TITLES`; line 208-218 invert or remove the
  `our_environment_chapter_present_in_scope` assertion.
- `lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts` — line 226-249 update or
  remove the "food chains under Our Environment NOT zeroed" assertion.
- `lazytopper/scripts/ops/generate_content_backlog_and_matrix.mjs` — line 210-215 align
  "our environment" handling with the deleted-chapter doctrine.
- Possibly also `lazytopper/src/prediction/cbseHistoricalArchetypes.ts` — verify Our
  Environment is in `SCIENCE_DELETED_CHAPTERS_2026_27.deletedTopics`; add if missing.

After fix, all ops/ acceptance tests should pass.

### Follow-up #3 — P2 APQ extraction (CBSE Additional Practice Questions 2023-24)

Branch: `content/additional-pq-sqp-2024` (already exists locally; preserve and re-use, OR
re-create after deleting). Mode: HIGH.

Five papers to extract (~270–300 questions estimated), all CBSE-official, all with matching MS:

| QP | Pages | MS | MS Pages |
|---|---:|---|---:|
| Mathematics-PQ1.pdf | 28 | Mathematics-PQ1_MS.pdf | 22 |
| Mathematics-PQ2.pdf | 7 | Mathematics-PQ2MS2.pdf | 7 |
| Mathematics-PQ_2022.pdf | 20 | Mathematics-PQ_2022_MS.pdf | 13 |
| Science-PQ.pdf | 14 | Science-PQMS.pdf | 12 |
| Science-PQ2.pdf | 10 | Science-PQMS2.pdf | 7 |

Skipped: `Science-PQ (1).pdf` (2022-23 set, no matching MS — owner decision).

**Use `pymupdf` (fitz) — NOT `pdfplumber`.** During PR #119 SQP extraction, `pdfplumber 0.11.9`
emitted `(cid:NNNN)` glyph artifacts on CBSE PDF math expressions (font subsets without
ToUnicode mapping), requiring heavy manual reconstruction. `pymupdf 1.27.2.3` extracts the
same files cleanly with 0 cid artifacts. Sample probe on MathsStandard-SQP.pdf confirmed.

```python
import fitz
doc = fitz.open(pdf_path)
text = "".join(p.get_text() for p in doc)
doc.close()
```

Per-topic file naming follows P2 SQP convention: `maths/{slug}.additionalPQ.ts` and
`science/{slug}.additionalPQ.ts` with kebab-case slug matching topics.ts.

ID prefixes (confirmed collision-free):
- `APQ-M-{TOPIC_SHORT}-{SEQ:003d}` — Maths Additional PQ
- `APQ-S-{TOPIC_SHORT}-{SEQ:003d}` — Science Additional PQ

Doctrine reminders (per CLAUDE.md §13 + PR #117 + PR #119):
- `solutionSteps` minimums: A=1, B=2, C=3, D=5, E=4
- `isPYQ`: false on all (practice papers, not board PYQs)
- `subtopic`: must not contain syllabusGuard banned strings (30 Maths + 82 Science)
- Section E: ONE row per case set, marks=4
- Anti-fabrication: question text from QP PDF only; solutionSteps from MS PDF only
- Skip deleted-topic questions entirely (don't just rename subtopic to pass guard)
- Avoid `]` and `[...]` markers inside solutionSteps text — they break mini-test regex
  (use `(...)` for math grouping; use `OR (alternative):` instead of `[OR]`)

The P2 SQP prompt's Step B4 source-to-file mapping and per-file mini-test recipe still apply;
all 25 SQP topic files passed their mini-tests cleanly.

---

## Full extraction queue (reference)

| Phase | Status | Notes |
|---|---|---|
| P0    | ✅ COMPLETE | PR #112 (62 Qs, AR+proof packs) |
| P0.5  | ✅ COMPLETE | PR #114 (21 Qs, case-based Sec E merged + circles proof) |
| PRE-P1| ✅ COMPLETE | PR #116 (mojibake symbol restoration; ftfy-based, 499 char repairs) |
| **P1-M** | ❌ **ABANDONED** | NODIA 3rd-party PDF — no inline solutions, pdfplumber math corruption, no topic tagging. See `report-p1m-ABANDONED.md`. |
| **P1-S** | ❌ **ABANDONED** | Same NODIA blockers as P1-M. See `report-p1s-probe.md`. |
| Guard fix | ✅ COMPLETE | PR #117 (syllabusGuard + bannedExercises + CLAUDE.md §13) |
| **P2 SQP** | ✅ **COMPLETE** | **PR #119** (69 Qs SQP only + bannedExercises hotfix); APQ deferred |
| **P2 APQ** | ⏳ **NEXT** (Follow-up #3) | 5 CBSE APQ papers, ~270–300 Qs estimated; use pymupdf not pdfplumber |
| Reproduction cleanup | ⏳ NEXT (Follow-up #1) | 15 syllabusGuard violations in reproduction.*.ts |
| ops/ alignment | ⏳ NEXT (Follow-up #2) | Our Environment doctrine consistency |
| P3    | ⏳ PENDING  | Meridian worksheets + Maths QB READY (~475 Qs) |
| P4-M  | ⏳ PENDING  | cbjemaco + cbjemacq Maths (~750–1,050 Qs) |
| P4b-S | ⏳ PENDING  | Science Chapter-wise cbjescco+cbjesccq (~1,422 Qs) |
| P5-M  | ⏳ PENDING  | PYQ papers Maths 2022-2025 (~400 Qs) [requires K2H-8f fix] |
| P5-S  | ⏳ PENDING  | PYQ papers Science 2022-2025 (~400 Qs) |
| P6    | ⏳ PENDING  | Sample papers + Preboard PDFs (~200 Qs) |
| P7    | ⏳ PENDING  | Pack retirement (trigger: authentic count ≥ 6,000) |
| P8    | 🔒 DEFERRED | OCR-gated sources (~1,100 Qs, needs OCR tool) |

Pack retirement threshold: 6,000 authentic questions
Current authentic total: **1,699** (post-PR #119; +69 from previous 1,630)

## Engine fix required before P5

K2H-8f: `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged questions.
PYQ filter returns 0 results when `pyqOnly===true`.
Branch: `fix/pyq-engine-bias`
Mode: Medium.
Do alongside or before P5-M PYQ extraction.

## Operating rules for all content sessions

- SHA verification mandatory before every agent prompt
- All 6 validations before every content commit (syllabusGuard + bannedExercises are strict now)
- Owner reviews extraction report before any commit (Checkpoint B per-file + final verify)
- Every content PR followed immediately by a docs-only handoff PR
- Anti-fabrication: every question from source PDF only — never paraphrase
- topicKey must match `topics.ts` exactly — verify before every extraction
- Pack files must NOT be deleted until authentic count ≥ 6,000
- isPYQ stays `false` for practice/sample papers (only set true for actual board exam PYQs)
- `solutionSteps` minimums per CLAUDE.md §13: A=1, B=2, C=3, D=5, E=4 (CBSE 2025-26 OSM)
- For Science: avoid all 82 banned subtopics in syllabusGuard.ts
- For Maths: avoid all 30 banned subtopics
- PDF extraction tool: **pymupdf (fitz)** for CBSE official PDFs — pdfplumber introduces
  cid-artifact corruption on font-subset math expressions
- Avoid `[...]` brackets inside solutionSteps array entries — mini-test regex breaks on `]`;
  use `(...)` for math grouping and `OR (alternative):` instead of `[OR]`
