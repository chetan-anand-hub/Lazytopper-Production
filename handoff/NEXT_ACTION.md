# LazyTopper — Next Action

Last updated: 2026-05-25 (post-PR #132 + #133 — P3 Science chapterwise + K2H-8f PYQ fix)
Live base SHA: c0f129dcdbe8722c8b74792df8cab358981d8c3e

## Immediate next action — P4 PYQ extraction (NOW UNBLOCKED by PR #133)

PR #133 fixed the K2H-8f PYQ engine filter — the engine now correctly returns
the 435 `pyqYear`-tagged questions when `pyqOnly===true`. This was the pre-req
for trustworthy P4 PYQ extraction. P4 can now proceed in two parallel content
sessions (Maths + Science).

Three small UI-side follow-ups remain from K2H-8f (separate product PRs;
not blocking P4 content work):
  a. Wire `pyqOnly` through `practiceQuestionBuilder.ts` (UI-engine bridge)
  b. Fix engine-to-UI mapping that strips `pyqYear`/`isPYQ` fields
  c. Add `isPYQ?: boolean` to `CanonicalQuestion` in `predictionTypes.ts`

### ✅ Completed in PR #132 — P3 Science chapter-wise

Done in PR #132 (merge SHA folded into c0f129d via #132+#133):
- 13 new `science/{topic}.chapterwise.ts` files (one per retained Science topic)
- 552 questions from cbjescco (MCQ, 252 Qs) + cbjesccq (PYQ-style, 300 Qs)
- Section breakdown: A=330 B=78 C=72 D=72 E=0 (chapter-wise series has no case-based)
- Competency: 74.6% (412/552); ~70 REQUIRES-FIGURE tagged
- ID prefixes: SCO-S-* and SCQ-S-*
- Authentic: 1,932 → 2,484; spreads 163 → 176; bank 4,729 → 5,281
- Caps applied for reviewability (20 MCQ/file + 6 per PYQ-section)
- Caveat: pymupdf renders chemistry `→` as `$` in this source — verbatim from PDF, future cleanup pass recommended

### ✅ Completed in PR #133 — K2H-8f PYQ filter fix (engine layer)

Done in PR #133 (merge SHA c0f129d):
- `lazytopper/src/data/practiceSetGenerator.ts`: added `pyqOnly?` field +
  exported `isPYQQuestion()` helper. Engine now applies a HARD pyqOnly filter
  (no silent soft-fallback).
- New test file `scripts/src/practiceSetGeneratorGuard.test.ts` (9 tests).
- Test matrix grew from 125/125 to **134/134 PASS** (5 test files).
- 435 `pyqYear`-tagged questions now correctly returned by the engine filter.

### Next active task A — Wire pyqOnly through practiceQuestionBuilder.ts (Mode: Low–Medium)

Branch (fresh): `fix/k2h-8f-pyq-ui-wiring`
File: `lazytopper/src/components/practice/practiceQuestionBuilder.ts`

Connect the K2H-8c UI `pyqOnly` chip state to the engine's new `pyqOnly`
filter (the engine accepts it now; the bridge currently doesn't pass it).
Small, scoped change. Required before the PYQ filter is end-to-end usable
in the practice surface.

May want to fold in the two related follow-ups during this PR (engine-to-UI
field-stripping fix + adding `isPYQ?: boolean` to `CanonicalQuestion`), but
each can ship independently.

### Next active task B — P4-M PYQ Maths extraction (Mode: HIGH, ~400 Qs)

Branch (fresh): `content/p4-pyq-maths` (no reuse — per fresh-branch doctrine)
Sources confirmed on disk:
  - **16 QP PDFs:** `30-x-x.pdf` series (CBSE Maths Standard PYQ)
  - **16 MS files:** matching `041_30-x-x_MS` marking-scheme PDFs
  - Location: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\` (verify
    exact subpath via probe before extraction)
ID prefix: `PYQ-M-{TOPIC}-{NNN}`
Critical:
  - **isPYQ: true** on all P4 questions (these ARE official board PYQs)
  - **pyqYear: "2022"/"2023"/etc** populated from QP year
  - **pyqSet: "30/1/1"** etc populated from QP set code where known
  - Apply OR-pair extraction for B/C/D/E (locked doctrine)
  - Apply REQUIRES-FIGURE strategyHints
  - pymupdf cid probe FIRST on a sample of the 30-x-x PDFs (not yet tested)

### Next active task C — P4-S PYQ Science extraction (Mode: HIGH, ~400 Qs)

Branch (fresh): `content/p4-pyq-science`
Sources confirmed on disk:
  - **15 QP PDFs:** `31_x_x.pdf` series (CBSE Science PYQ)
  - Matching MS files on disk
ID prefix: `PYQ-S-{TOPIC}-{NNN}`
Same isPYQ/pyqYear/pyqSet/OR/REQUIRES-FIGURE doctrine as P4-M.
Can run **in parallel** with P4-M (different topic files, no overlap).

### Pre-launch quick wins (product track — independent, sequence as owner decides)

Still queued from PR #130 cycle:
  1. strategyHint Hint button in PracticeQuestionCard (Small)
  2. Fix "Show visual" wiring in TopicHub right rail (≈20 lines)
  3. Formula sheet tab on TopicHub for 14 seeded topics (Medium)
  4. API gateway fix — vercel.json /api/* rewrite + Railway deploy (High)

### Future task — Maths chapter-wise extraction (LOW priority)

`cbjemaco` series (MCQ-only, clean per earlier probe) is available but would
add mostly Section A density. Defer unless B/C/D/E coverage from PYQs proves
insufficient.

### Future task — AR (Assertion-Reasoning) density pass

Dedicated `.assertionReasoning.ts` extraction; 2-3 AR per topic for Maths +
Science. P2 APQ + P3 Science chapter-wise complete, so unblocked.

### ✅ Follow-up — P2 APQ Maths PQ1 + PQ2 — COMPLETE (PR #126)

Done in PR #126 (merge SHA: 9be894526eb20ad51bca2c7aaa3b8ffab931191a):
- 13 new `.additionalPQ.ts` files created (one per Maths topic)
- 76 questions from Mathematics-PQ1 + PQ2
- Section breakdown: A=40 B=10 C=12 D=8 E=6
- Competency 88%, ~22 REQUIRES-FIGURE tags

### ✅ Follow-up — P2 APQ continuation (PQ_2022 + Science-PQ) — COMPLETE (PR #128)

Done in PR #128 (merge SHA: 028d51d37d3a168196809676ed4d9e5c3b20fdb3):
- 13 Maths files updated (PQ_2022 appended, +44 Qs)
- 13 new Science files created (Science-PQ, +46 Qs)
- All 13 retained Science topicKeys now have APQ content
- **First ever Our Environment questions in the bank** (4 Qs)
- 13 OR-pairs → 26 separate rows (B/C/D/E doctrine validated)
- Section breakdown: A=37 B=15 C=15 D=10 E=6 — non-MCQ density up from 36 (PR #126) to 46
- Authentic: 1,793 → 1,883; spreads: 150 → 163

### ✅ Follow-up — P2 APQ Science-PQ2 (finale) — COMPLETE (PR #130)

Done in PR #130 (merge SHA: d739585df2013b7299c3c8e931c5685d388f606d):
- 13 Science files APPENDED with Science-PQ2 (+49 Qs)
- 10 OR-pairs extracted as separate rows
- 13 REQUIRES-FIGURE tags
- Section breakdown (new only): A=20 B=8 C=9 D=6 E=6
- Competency 81.6%
- Authentic: 1,883 → 1,932; spreads unchanged (163 — no new files)
- canonicalQuestionBank.ts NOT touched
- **P2 APQ phase complete:** 284 authentic Qs across 5 papers (SQP + 3 APQ Maths + Science-PQ + Science-PQ2)
- Branch `content/additional-pq-sqp-2024` DELETED after merge (remote + local). Future extraction phases use fresh branch names per phase to eliminate the force-push requirement permanently.

### P3 phase outcome — Meridian SKIPPED, Chapter-wise CHOSEN

The previous handoff queued "P3 Meridian extraction" as the next content task.
During session prep, source probes rejected Meridian (no marking-scheme PDFs,
violates anti-fabrication doctrine) and several other candidates (NODIA — MS
hosted externally on URL; cbjemacq — Sinhala glyph corruption; Maths Basic
430-x-x — out-of-Standard scope; Aakash chapterwise — scanned, needs OCR).

PR #132 used `cbjescco01-15 + cbjesccq01-15` (Science chapter-wise) instead.
Those 6 alternative source pools are now permanently SKIPPED — recorded in
CURRENT_STATE.md so future sessions don't waste cycles re-evaluating them.

### Future task — Content + product deliberation (planning, not code)

Pre-launch product decisions opened in PR #128 cycle — these are planning
sessions, not content extractions:

  - **Notes per chapter** (beyond exam tips): no current surface; content TBD.
  - **Formula sheets per topic**: data exists in archetypes/predictions but no
    render surface — should there be one?
  - **Proof library**: some proofs exist in P0 (triangles.proof.ts) and P0.5
    (circles.proof.ts) but no dedicated surface; should they be promoted?
  - **Tutor drawer audit**: MentorSolveDrawer, ConceptTeachDrawer, TutorDrawerV2
    exist but are underused — they don't receive student attempt data. Decide
    keep/repurpose/remove before launch.

### Future task — AR (Assertion-Reasoning) density pass

After P2 APQ fully completes (Science-PQ2 done), run a dedicated
`.assertionReasoning.ts` extraction pass to address the AR density gap.
Target: 2-3 AR questions per topic for both Maths and Science.
Source: existing CBSE source PDFs with AR coverage not yet extracted.

### Future task — REQUIRES-FIGURE resolution

Post-launch (Option B first): replace the ~52 cumulative REQUIRES-FIGURE
strategyHints with placeholder images. Post-Option A (after launch): SVG
renders from PDF figure descriptions.

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
| P2 APQ Maths PQ1+PQ2 | ✅ COMPLETE | PR #126 (+76 Qs across 13 topic files; 88% competency) |
| P2 APQ continuation (PQ_2022 + Science-PQ) | ✅ COMPLETE | PR #128 (+90 Qs; first Our Environment Qs; OR-doctrine validated) |
| P2 APQ Science-PQ2 (finale) | ✅ COMPLETE | PR #130 (+49 Qs; P2 APQ phase complete — 284 Qs across 5 papers) |
| **P3 Science chapter-wise** | ✅ **COMPLETE** | PR #132 (+552 Qs across 13 Science files; SCO-S-*/SCQ-S-* IDs; cbjescco + cbjesccq source) |
| **K2H-8f PYQ engine filter** | ✅ **COMPLETE** | PR #133 (engine-layer hard filter + `isPYQQuestion` helper; test matrix 125 → 134) |
| K2H-8f UI wiring follow-up | ⏳ NEXT (product) | Wire `pyqOnly` through `practiceQuestionBuilder.ts`; fix engine-to-UI field stripping; add `isPYQ?: boolean` to `CanonicalQuestion` |
| **P4-M PYQ Maths** | ⏳ **NEXT (content, UNBLOCKED by #133)** | Fresh branch `content/p4-pyq-maths`. 16 QPs (30-x-x) + 16 MS on disk. `isPYQ: true`, `pyqYear` populated. ~400 Qs. |
| **P4-S PYQ Science** | ⏳ **NEXT (content, parallel)** | Fresh branch `content/p4-pyq-science`. 15 QPs (31_x_x) + MS on disk. ~400 Qs. |
| Pre-launch quick wins | ⏳ READY | strategyHint Hint button; "Show visual" fix; Formula sheet tab; API gateway fix |
| Maths chapter-wise (cbjemaco) | ⏳ LOW priority | MCQ-only clean source; defer unless B/C/D/E coverage from PYQs proves insufficient |
| AR density pass | ⏳ UNBLOCKED | Dedicated .assertionReasoning.ts extraction, 2-3 AR per topic |
| Content + product deliberation | ⏳ PLANNING | Notes/formulae/proofs/tutor drawer decisions before launch |
| TopicHub seeded coverage backfill | ⏳ CONTENT | 11/25 topics still on sample-preview |
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

Current authentic total: **2,484** (post-PR #132; +552 from P3 Science chapter-wise).
Progress to retirement: 2,484 / 4,500 = **55.2%** (+12.3 pp from PR #130 state).
Bank total (engine-confirmed): **5,281** questions loaded.

## Engine fix — RESOLVED (PR #133)

K2H-8f engine-layer fix landed in PR #133 (merge SHA c0f129d). Adds `pyqOnly`
field to `PracticeSetConfig` and exported `isPYQQuestion()` helper; engine
now applies a HARD pyqOnly filter (no silent soft-fallback). 435 `pyqYear`-
tagged questions are now correctly returned by the engine.

Three UI-side follow-ups remain (separate PRs — each independent):
  a. Wire `pyqOnly` through `practiceQuestionBuilder.ts` (UI-engine bridge)
  b. Fix engine-to-UI mapping that strips `pyqYear`/`isPYQ` fields
  c. Add `isPYQ?: boolean` to `CanonicalQuestion` in `predictionTypes.ts`

P4-M / P4-S PYQ extraction is unblocked at the engine layer — content work
can proceed without waiting for the UI follow-ups.

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
