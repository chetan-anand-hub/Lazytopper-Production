# LazyTopper — Next Action

Last updated: 2026-05-25 (post-PR #130 — P2 APQ Science-PQ2; P2 APQ COMPLETE)
Live base SHA: d739585df2013b7299c3c8e931c5685d388f606d

## Immediate next action — pre-launch quick wins (product track) OR P3 Meridian (content track)

P2 APQ is now fully complete (5 papers, 284 authentic Qs total — see history
below). Two parallel tracks open; owner choice for next session.

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

### Pre-launch quick wins (product track — sequence as owner decides)

A tutor/content audit completed during this cycle surfaced four small/medium
product fixes. Run each as its own scoped product PR; they are independent.

  1. **strategyHint Hint button in PracticeQuestionCard** (Small) — 75 question
     banks contain authored strategyHints (including all 65 REQUIRES-FIGURE
     descriptions) but no UI displays them. Add a "Hint" toggle that reveals
     `q.strategyHint` when present.

  2. **Fix "Show visual" wiring in TopicHub right rail** (≈20 lines) — button
     currently broken (no-op or wrong handler). Wire to the existing visualiser
     surface for the active topic.

  3. **Formula sheet tab on TopicHub** (Medium) — 14 topics have seeded formula
     data in archetypes/predictions but no render surface. Add a "Formulas" tab
     beside Notes/Practice on TopicHub for those 14 topics.

  4. **API gateway fix — vercel.json rewrite + Railway deploy** (High) — no
     `/api/*` rewrite in `vercel.json`, so AI features 404 in production. Add
     rewrite to forward `/api/*` to the Railway-deployed backend.

### Next active content task — P3 Meridian extraction (Mode: HIGH, ~475 Qs)

Sources confirmed on disk in `C:\Users\Chetan\OneDrive\Desktop\diff\` gdrive
copy: Meridian worksheets + Maths QB. Two-agent split planned (Maths topics /
Science topics).

  - **Branch (fresh):** `content/p3-meridian` (no reuse of any prior branch)
  - **First step:** pymupdf cid probe on Meridian PDFs (not yet tested — Meridian
    is a 3rd-party publisher; may or may not extract cleanly)
  - **ID prefixes:** `MRD-*` (Meridian worksheets), `MQB-*` (Maths QB)
  - **Topic targets:** all 13 retained Maths topicKeys + all 13 retained Science
    topicKeys
  - **Same extraction doctrine** as P2 APQ (OR variants as separate rows,
    REQUIRES-FIGURE tags, isPYQ:false, pyqSet omitted, Section E one-row, etc.)
  - **Agent instruction file** will be authored after Chetan approves the next
    session start (instruction template proven across PRs #126, #128, #130)

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
| **P2 APQ Science-PQ2 (finale)** | ✅ **COMPLETE** | PR #130 (+49 Qs appended to 13 Science files; P2 APQ phase complete — 284 Qs across 5 papers) |
| Pre-launch quick wins | ⏳ READY | strategyHint Hint button; "Show visual" fix; Formula sheet tab; API gateway fix |
| Content + product deliberation | ⏳ PLANNING | Notes/formulae/proofs/tutor drawer decisions before launch |
| AR density pass | ⏳ UNBLOCKED | Dedicated .assertionReasoning.ts extraction, 2-3 AR per topic (P2 APQ now complete) |
| **P3** | ⏳ **NEXT (content track)** | Meridian worksheets + Maths QB on disk (~475 Qs). NEW BRANCH `content/p3-meridian` (fresh — no reuse). First step: pymupdf cid probe on Meridian PDFs. |
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

Current authentic total: **1,932** (post-PR #130; +49 from Science-PQ2).
Progress to retirement: 1,932 / 4,500 = **42.9%** (+1.1 pp from PR #128 state).
Bank total (engine-confirmed): **4,729** questions loaded.

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
