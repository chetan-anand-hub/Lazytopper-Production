# LazyTopper — Next Action

Last updated: 2026-05-25 (post-PR #126 — P2 APQ Maths PQ1+PQ2)
Live base SHA: 9be894526eb20ad51bca2c7aaa3b8ffab931191a

## Immediate next action — P2 APQ continuation (PQ_2022 + Science PQ + Science PQ2)

P2 APQ Maths PQ1+PQ2 merged successfully (PR #126, +76 authentic Qs, 1,717 →
1,793). Three more APQ papers remain to be extracted on the same branch
`content/additional-pq-sqp-2024`. Text already pre-extracted to
`diff/_apq_text/` for all three.

### ✅ Follow-up — P2 APQ Maths PQ1 + PQ2 — COMPLETE (PR #126)

Done in PR #126 (merge SHA: 9be894526eb20ad51bca2c7aaa3b8ffab931191a):
- 13 new `.additionalPQ.ts` files created (one per Maths topic)
- canonicalQuestionBank.ts updated (+13 imports + 13 spreads under
  "P2 CBSE APQ 2023-24" banner)
- 76 questions extracted from Mathematics-PQ1.pdf + Mathematics-PQ2.pdf
  (38 each), combined per topic across both papers
- Section breakdown: A=40 B=10 C=12 D=8 E=6
- Competency: 88% (67/76) — well above 40% target
- ~22 REQUIRES-FIGURE strategyHints
- isPYQ: false on all 76
- Authentic: 1,717 → 1,793; spreads: 137 → 150
- Test matrix: 125/125 PASS

### Next active task — P2 APQ continuation (Mode: HIGH)

Branch: `content/additional-pq-sqp-2024` (preserve — REBASE first onto current
base SHA 9be894526eb20ad51bca2c7aaa3b8ffab931191a before continuing).

Papers remaining (text pre-extracted to `diff/_apq_text/`):
  - **Mathematics-PQ_2022.pdf** (~38 Qs, 2022-23 set) + MS
      Will APPEND to the existing 13 `maths/{topic}.additionalPQ.ts` files
      (per "one file per topic, combined across papers" spec)
  - **Science-PQ.pdf** (~39 Qs) + Science-PQMS.pdf
      Will CREATE new `science/{topic}.additionalPQ.ts` files
  - **Science-PQ2.pdf** (~39 Qs) + Science-PQMS2.pdf
      Will APPEND to the same `science/{topic}.additionalPQ.ts` files

Estimated total this PR cycle: ~116 additional Qs. Projected bank state after
P2 APQ fully complete: 1,909 authentic / ~4,724 total / ~163 spreads.

**Critical doctrine for this extraction (new in PR #126 cycle):**

  1. **Extract BOTH OR variants for B/C/D/E sections** — PR #126 stored OR
     variants merged into single rows. Future passes must extract BOTH
     alternatives as separate questions to increase non-MCQ density.
     Section A (MCQ/AR) is currently over-represented.

  2. **REQUIRES-FIGURE strategyHint** — for any question referencing a PDF
     figure (diagram, table, graph) that doesn't render in text, set
     `strategyHint: "REQUIRES-FIGURE: [description]"`. Keep questionText
     and answer accurate to PDF.

  3. **isPYQ: false** on all APQ (practice papers, not board PYQs).
     **pyqSet: omit** entirely.

  4. **Section E case-based: ONE row per case set**, marks=4. Do NOT split
     into sub-rows.

  5. **PDF tool: pymupdf** (fitz). Confirmed 0 cid artifacts on all 5 APQ PDFs.

  6. **ID prefixes** (continue from PR #126's per-topic sequences for Maths;
     start fresh for Science):
     - Maths: `APQ-M-{TOPICSHORT}-{SEQ:003d}` — continue numbering per topic
     - Science: `APQ-S-{TOPICSHORT}-{SEQ:003d}` — start at 001 per topic

### Future task — AR (Assertion-Reasoning) density pass

After P2 APQ fully completes, run a dedicated `.assertionReasoning.ts`
extraction pass to address the AR density gap identified in PR #126 cycle.
Target: 2-3 AR questions per topic for both Maths and Science.
Source: any of the existing CBSE source PDFs (NCERT, Exemplar, APQ, SQP)
that have AR coverage we haven't extracted yet.

### Future task — REQUIRES-FIGURE resolution

Post-launch (Option B first): replace the ~22 REQUIRES-FIGURE strategyHints
with placeholder images. Post-Option A (after launch): SVG renders from PDF
figure descriptions.

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

### P2 APQ extraction — operational details

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
| Reproduction cleanup | ✅ COMPLETE | PR #121 (-18 Qs, +5 banned variants, +35 regression tests) |
| ops acceptance regression suite | ✅ COMPLETE | PR #123 (+37 tests, doctrine lock across 4 source-of-truth files) |
| syllabusGuard 2026-27 doctrine fix | ✅ COMPLETE | PR #124 (-26 banned strings, +18 Qs restored, formativeOnlyTopics added) |
| **P2 APQ Maths PQ1+PQ2** | ✅ **COMPLETE** | PR #126 (+76 Qs across 13 topic files; 88% competency; REQUIRES-FIGURE + 4,500 retirement doctrine) |
| **P2 APQ continuation** | ⏳ **NEXT** | PQ_2022 + Science-PQ + Science-PQ2 (~116 Qs), same branch; rebase first |
| AR density pass | ⏳ AFTER P2 APQ | Dedicated .assertionReasoning.ts extraction, 2-3 AR per topic |
| P3    | ⏳ PENDING  | Meridian worksheets + Maths QB READY (~475 Qs) |
| P4-M  | ⏳ PENDING  | cbjemaco + cbjemacq Maths (~750–1,050 Qs) |
| P4b-S | ⏳ PENDING  | Science Chapter-wise cbjescco+cbjesccq (~1,422 Qs) |
| P5-M  | ⏳ PENDING  | PYQ papers Maths 2022-2025 (~400 Qs) [requires K2H-8f fix] |
| P5-S  | ⏳ PENDING  | PYQ papers Science 2022-2025 (~400 Qs) |
| P6    | ⏳ PENDING  | Sample papers + Preboard PDFs (~200 Qs) |
| P7    | ⏳ PENDING  | Pack retirement (trigger: authentic count ≥ 6,000) |
| P8    | 🔒 DEFERRED | OCR-gated sources (~1,100 Qs, needs OCR tool) |

Pack retirement threshold: **4,500 authentic questions** (REVISED from 6,000 in PR #126 cycle).
Rationale: 5,000+ authentic is sufficient for CBSE Class 10 prep. At 4,500
authentic, retire all AI packs (~2,815 Qs). Bank becomes 100% authentic +
100% routable. No OCR phase needed.

Current authentic total: **1,793** (post-PR #126; +76 from APQ Maths PQ1+PQ2).
Progress to retirement: 1,793 / 4,500 = 39.8%.

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
