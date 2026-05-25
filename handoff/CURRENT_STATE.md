# LazyTopper Current Handoff State
Last updated: 2026-05-25 (post-PR #132 + #133 — P3 Science chapterwise + K2H-8f PYQ engine fix)
Live base SHA: c0f129dcdbe8722c8b74792df8cab358981d8c3e

## Post-PR #133 — K2H-8f PYQ filter fix (engine-layer hard filter + isPYQQuestion helper) — MERGED

Timestamp: 2026-05-25
Merge SHA on base: c0f129dcdbe8722c8b74792df8cab358981d8c3e

PR #133 | fix: K2H-8f PYQ filter — engine-layer hard filter (no soft fallback)
Branch: fix/k2h-8f-pyq-filter (DELETED after merge)
Commits: 1 (6908ee3)

Files changed: 3 (engine + new test + scripts package)
  - lazytopper/src/data/practiceSetGenerator.ts (MODIFIED)
      Adds `pyqOnly?: boolean` field to PracticeSetConfig.
      Adds exported `isPYQQuestion(q)` helper — honours both explicit
      `isPYQ: true` and populated `pyqYear` (covers current bank tagging
      convention "2022"/"2023"/"30/1/1" and future P4 PYQ flag).
      Restructures applyBoardPatternFilter location (no behaviour change).
      Engine now applies a HARD pyqOnly filter — no silent soft-fallback
      that masked the bug.
  - scripts/src/practiceSetGeneratorGuard.test.ts (NEW)
      9 new K2H-8f regression tests locking the engine-layer contract.
  - scripts/package.json (MODIFIED — test:matrix:all extended to 5 files)

Root cause (recorded for posterity):
  The K2H-8c UI chip wired `pyqOnly===true` through `AiTopupArgs`, but the
  engine pipeline ran a SOFT fallback (`if filtered.length > 0`) instead of
  a hard filter. When the engine-to-UI mapping stripped `pyqYear`/`isPYQ`
  before the filter saw the data, the resulting empty pool silently fell
  back to "all questions" — hiding the bug as "PYQ filter returns 0".
  Two compounding faults: (1) field stripping in the mapping layer; (2)
  soft-fallback behaviour that masked the empty-filter signal.

Fix scope (engine layer ONLY — UI wiring deferred):
  PR #133 fixes (1) the engine-layer contract — pyqOnly is now a hard filter
  honouring both isPYQ and pyqYear. 435 pyqYear-tagged questions are now
  correctly returned. Three follow-ups remain (separate PRs):
    a. Wire pyqOnly through practiceQuestionBuilder.ts (UI-engine bridge)
    b. Fix engine-to-UI mapping field stripping (pyqYear/isPYQ lost)
    c. Add `isPYQ?: boolean` to CanonicalQuestion in predictionTypes.ts

Validations: ALL PASS
  1. syllabusGuard — PASS (no question bank changes)
  2. validateQuestionBanks — PASS
  3. tsc -p tsconfig.app.json --noEmit — exit 0
  4. Full test matrix: **134/134** PASS (125 pre-existing + 9 new K2H-8f tests)
  5. git diff --check — clean
  6. Engine reachability — PASS

Bank state unchanged (engine-only fix):
  Authentic: 2,484 (no question bank touched in this PR)
  Spreads: 176
  Bank total (engine-confirmed): 5,281

Unblocks: P4 PYQ extraction (Maths + Science) can now proceed knowing the
PYQ filter actually works end-to-end at the engine layer. UI wiring needs
follow-up but is independent of content extraction.

## Post-PR #132 — P3 Science chapter-wise (552 Qs across 13 Science topic files) — MERGED

Timestamp: 2026-05-25
Merge SHA on base: (squashed into c0f129d via #132 + #133)

PR #132 | content: P3 Science chapter-wise (552 Qs across 13 Science topic files)
Branch: content/p3-science-chapterwise (DELETED after merge — per branch
  doctrine: fresh branch per phase, no reuse)
Commits: 1 (aaa730a)

Files changed: 14 (+3,990 insertions)
  - 13 NEW science/*.chapterwise.ts files (one per retained Science topicKey)
  - lazytopper/src/data/canonicalQuestionBank.ts — +13 imports + 13 spreads
    under "P3 Science Chapter-wise" banner; spreads 163 → 176

Source PDFs (pymupdf 1.27.2.3, 0 cid + 0 Sinhala corruption confirmed via probe):
  cbjescco01-15.pdf (MCQ series, 13 files) — 252 questions
  cbjesccq01-15.pdf (PYQ-style series, 13 files) — 300 questions
  Source: www.cbse.online / rava.org.in

Chapters covered (13 retained, 3 skipped per 2026-27 doctrine):
  ch01 chemical-reactions-and-equations
  ch02 acids-bases-and-salts
  ch03 metals-and-non-metals
  ch04 carbon-and-its-compounds
  ch06 life-processes
  ch07 control-and-coordination
  ch08 how-do-organisms-reproduce
  ch09 heredity (within-chapter filter: Evolution/Darwin removed)
  ch10 light-reflection-and-refraction
  ch11 human-eye-and-colourful-world
  ch12 electricity
  ch13 magnetic-effects-of-electric-current (within-chapter filter:
       Motor/EMI/Generator/Fleming's-Right-Hand removed)
  ch15 our-environment
  SKIPPED: ch05 Periodic Classification, ch14 Sources of Energy,
           ch16 Mgmt of Natural Resources (all fully deleted 2026-27)

Caps applied for reviewability (source has ~3,243 raw 'Ans :' markers; full
extraction would be unreviewable in one PR): 20 cleanest MCQs per file +
6 per PYQ-style mark-section (1mk/2mk/3mk/5mk).

Section breakdown: A=330, B=78, C=72, D=72, E=0 (chapter-wise series has
no case-based section).
Competency: 412/552 = 74.6% (MCQ defaults to competency=true per CBSE
  2026-27 doctrine — option discrimination is concept application; pure
  recall MCQs Define/Name the/List the/Recall/Match the stay false).
REQUIRES-FIGURE: ~70 questions tagged via figure/diagram/circuit keyword
  heuristic. Heuristic is conservative — manual sweep recommended pre-launch.
isPYQ: false on all 552 (chapter-wise compilations, not board exam papers).

ID format:
  SCO-S-{TOPIC}-{NNN} for MCQ source (cbjescco)
  SCQ-S-{TOPIC}-{NNN} for PYQ-style source (cbjesccq)

Extraction caveat: pymupdf renders chemistry arrow `→` as `$` in this source
(e.g. `Cu(s) + 2AgNO3(aq) $ Cu(NO3)2(aq) + 2Ag(s)`). Content is verbatim from
PDF (anti-fabrication preserved); just the arrow symbol is `$` not `→`. A
future cleanup pass could replace `$` with `→` if not breaking valid `$` uses.

P3 extraction source decisions (permanent — recorded so future sessions
don't waste cycles on rejected sources):
  USED: cbjescco01-15 + cbjesccq01-15 (Science Chapter-wise) — 552 Qs in PR #132
  SKIPPED forever:
    - Meridian — no marking-scheme PDFs to support anti-fabrication doctrine
    - NODIA — solutions hosted externally on URL (not on disk); PYQ blocker
    - cbjemacq — Sinhala glyph corruption confirmed by pymupdf probe
    - Maths Basic 430-x-x — out-of-scope Standard track only
    - Chapterwise SOL Aakash — scanned images, needs OCR (deferred phase)
    - Old\ folder — superseded duplicates

Validations: ALL PASS
  1. syllabusGuard — PASS (0 violations)
  2. validateQuestionBanks — PASS (230 files; 0 dupes; mark/section consistent)
  3. tsc -p tsconfig.app.json --noEmit — exit 0
  4. Checkpoint B per file — 13/13 PASS
  5. Duplicate IDs (SCO-S-* + SCQ-S-*) — 0 across 552
  6. Engine reachability — PASS (canonicalQuestionBank loads at 5,281)

Test matrix at the time of PR #132: 125/125 PASS (post-#133 it's 134/134).

Bank state:
  Authentic questions: 1,932 → **2,484** (+552)
  Spreads: 163 → **176** (+13)
  Bank total (engine-confirmed): 4,729 → **5,281**
  Progress to 4,500-Q retirement: 2,484 / 4,500 = **55.2%** (+12.3 pp from #130)

## Post-PR #130 — P2 APQ Science-PQ2 (49 Qs appended across 13 Science files) — MERGED

Timestamp: 2026-05-25
Merge SHA on base: d739585df2013b7299c3c8e931c5685d388f606d

PR #130 | content: P2 APQ Science-PQ2 — 49 Qs appended across 13 Science topic files
Branch: content/additional-pq-sqp-2024 (NOW DELETED — remote + local removed
  after this PR cleared the merge queue; the branch had been squash-merged 4
  times, PRs #119, #126, #128, #130, and was no longer needed. Future
  extraction phases use fresh branch names per phase to eliminate force-push
  requirement permanently.)
Commits: 1 (5c3e0fc, force-with-lease pushed after rebase onto b16ebb6)

Files changed: 13 (+501 insertions, 0 deletions)
  - 13 modified science/*.additionalPQ.ts files (Science-PQ2 appended to
    existing arrays created in PR #128)
  - canonicalQuestionBank.ts NOT touched (no new files registered; all 13
    Science APQ files already in spread chain since PR #128)

Source PDFs (pymupdf 1.27.2.3, 0 cid artifacts):
  Science-PQ2.pdf (10pp) + Science-PQMS2.pdf (7pp) — 39 base Qs + 10 OR
    variants as separate rows = 49 Science questions appended

Section breakdown (new only): A=20 B=8 C=9 D=6 E=6
Competency (new only): 40/49 = 81.6% (well above 40% floor)
Skipped (deleted topics): 0 — Science-PQ2 contained no questions on banned
  2026-27 topics (Periodic Classification, Evolution, Sources of Energy,
  Mgmt of Natural Resources, Electric Motor/EMI/Generator)
REQUIRES-FIGURE strategyHints: 13 new this session
  (electron-dot N2, electrolysis set-up, heart diagram, parallel-resistor
  circuit with two ammeters, V-I straight-line graph, copper-heating set-up,
  iron-filings test tubes, ray diagrams, solenoid field-line pattern, prism
  recombination diagram, ozone/atmospheric-refraction visuals)

OR variants extracted as separate rows (10 pairs): Q23, Q25, Q28, Q31, Q34,
  Q35, Q36, Q37, Q38, Q39. Q35 OR placed under control-and-coordination
  (hormones / adrenaline) while its main went to heredity (energy flow +
  pea cross). All other OR pairs stayed in the same topic file.

Per-file additions (Science-PQ2 appended):
  acids-bases-and-salts (+4 → 6), carbon-and-its-compounds (+4 → 8),
  chemical-reactions-and-equations (+2 → 4),
  control-and-coordination (+3 → 5), electricity (+3 → 7),
  heredity (+2 → 6), how-do-organisms-reproduce (+2 → 5),
  human-eye-and-colourful-world (+3 → 6), life-processes (+8 → 13),
  light-reflection-and-refraction (+4 → 7),
  magnetic-effects-of-electric-current (+4 → 6),
  metals-and-non-metals (+6 → 14), our-environment (+4 → 8)

P2 APQ — NOW COMPLETE (5 papers, 284 Qs total):
  PR #119: SQP papers (69 Qs — Maths 38 + Science 31)
  PR #126: Mathematics-PQ1 + PQ2 (76 Qs)
  PR #128: Mathematics-PQ_2022 + Science-PQ (90 Qs)
  PR #130: Science-PQ2 (49 Qs)
  TOTAL P2 APQ: 284 authentic Qs sourced from official CBSE practice papers

Validations: ALL PASS
  1. syllabusGuard — PASS (0 violations)
  2. validateQuestionBanks — PASS (217 files; 0 dupes; mark/section consistent)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate IDs (APQ-S-* prefix) — 0 (95 APQ-S-* IDs total, all unique)
  5. Full test matrix (4 files) — PASS (125/125 tests)
  6. Engine reachability — PASS (4,729 questions loaded; 296/296 new-PR
     Heredity/Light/Eye/Elec/Mag IDs reachable)
  git diff --check — exit 0 (no whitespace)
  git diff --name-only HEAD — exactly 13 expected files (science/*.additionalPQ.ts)

Bank state:
  Authentic questions: 1,883 → 1,932 (+49)
  Spreads: 163 (unchanged — no new files registered)
  Bank total (engine-confirmed): 4,729
  Progress to 4,500-Q retirement threshold: 1,932 / 4,500 = 42.9%

Tutor / content audit completed (read-only, separate from this PR):
  Report: diff\report-tutor-content-audit-2026-05-24.md
  Key findings:
    • strategyHint on 75 question banks is authored but never rendered
    • "Show visual" button in TopicHub right rail is broken (wiring gap)
    • No formula-sheet surface exists, despite formula data in 14 topics
    • API gateway gap confirmed in vercel.json (no /api/* rewrite)
  Pre-launch product deliberation in progress on a separate planning track.

## Post-PR #128 — P2 APQ continuation: PQ_2022 + Science-PQ (~90 Qs across 26 topic files) — MERGED

Timestamp: 2026-05-25
Merge SHA on base: 028d51d37d3a168196809676ed4d9e5c3b20fdb3

PR #128 | content: P2 APQ continuation — PQ_2022 + Science-PQ (~90 Qs across 26 topic files)
Branch: content/additional-pq-sqp-2024 (preserved — Science-PQ2 to be appended next session)
Commits: 1 (143badb)

Files changed: 27 (+1029 insertions)
  - lazytopper/src/data/canonicalQuestionBank.ts — +13 Science imports + 13 spreads
    under "P2 CBSE APQ 2023-24 — Science" banner; spread count 150 → 163
  - 13 modified maths/*.additionalPQ.ts files (PQ_2022 appended to existing arrays)
  - 13 new science/*.additionalPQ.ts files (Science-PQ created — covers all 13 retained
    Science topicKeys)

Source PDFs (pymupdf 1.27.2.3, 0 cid artifacts):
  Mathematics-PQ_2022.pdf (20pp) + Mathematics-PQ_2022_MS.pdf (13pp) — 38 base + 6 OR
    variants = 44 Maths questions appended
  Science-PQ.pdf (14pp) + Science-PQMS.pdf (12pp) — 39 base + 7 OR variants = 46
    Science questions in new files

Total: ~90 questions across 26 topic files.

Section breakdown this session:
  A=37 (1mk MCQ + AR), B=15 (2mk Short), C=15 (3mk Short), D=10 (5mk Long), E=6 (4mk Case-Based)
Competency: ~85% (target 40% — well exceeded)
Skipped (deleted topics): 0 — no 2026-27-deleted topics appeared
REQUIRES-FIGURE strategyHints: ~30 new this session (~52 cumulative across PR #126 + #128)

New extraction doctrine compliance (locked in PR #126 cycle, validated this PR):

  1. **BOTH OR variants for B/C/D/E** — 13 OR-pairs extracted as separate rows in
     PR #128 (vs merged-OR in PR #126). Measurable density improvement:
       PR #126 (PQ1+PQ2): B=10, C=12, D=8, E=6 → 36 non-A questions
       PR #128 (PQ_2022 + Science-PQ): B=15, C=15, D=10, E=6 → 46 non-A questions
     The new doctrine is working — non-MCQ density is up despite similar paper count.

  2. **REQUIRES-FIGURE strategyHint** — applied consistently across ~30 new questions
     (geometry diagrams, circuit diagrams, ray diagrams, eye anatomy, ecological pyramids,
     coordinate plots, etc.). questionText and answer remain accurate to PDF.

Per-file additions (Maths PQ_2022 appended):
  real-numbers (+3 → 9), polynomials (+2 → 6), pair-of-linear-equations (+4 → 10),
  quadratic-equations (+3 → 7), arithmetic-progression (+1 → 5), triangles (+3 → 11),
  coordinate-geometry (+3 → 9), trigonometry (+7 → 17), circles (+5 → 12),
  areas-related-to-circles (+5 → 10), surface-areas-and-volumes (+3 → 9),
  statistics (+3 → 8), probability (+2 → 7)

Per-file creations (Science from Science-PQ):
  chemical-reactions-and-equations (2), acids-bases-and-salts (2),
  metals-and-non-metals (8), carbon-and-its-compounds (4), life-processes (5),
  control-and-coordination (2), how-do-organisms-reproduce (3), heredity (4),
  light-reflection-and-refraction (3), human-eye-and-colourful-world (3),
  electricity (4), magnetic-effects-of-electric-current (2),
  **our-environment (4) ← FIRST EVER Our Environment questions in the bank!**

The 4 Our Environment questions (APQ-S-ENV-001 through 004) fill the gap flagged in
PRs #122/#125: Our Environment topicKey was registered in topics.ts (weight 4) but had
0 questions in the bank. Now resolved.

Validations: ALL PASS
  1. syllabusGuard — PASS (0 violations)
  2. validateQuestionBanks — PASS (217 files scanned, was 204; 0 dupes, mark/section consistent)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate IDs — 0
  5. Full test matrix (4 files) — PASS (125/125 tests)
  6. Engine reachability — PASS (296/296)

Bank state:
  Authentic questions: 1,793 → 1,883 (+90)
  Spreads: 150 → 163 (+13 new Science APQ files)
  Bank total: ~4,608 → ~4,698 (+90)
  Progress to 4,500-Q retirement threshold: 1,883 / 4,500 = 41.8%

## Post-PR #126 — P2 APQ Maths PQ1 + PQ2 (76 Qs across 13 topic files) — MERGED

Timestamp: 2026-05-25
Merge SHA on base: 9be894526eb20ad51bca2c7aaa3b8ffab931191a

PR #126 | content: P2 APQ Maths PQ1 + PQ2 (76 Qs across 13 topic files)
Branch: content/additional-pq-sqp-2024 (preserved — PQ_2022 + Science papers
  to be appended in follow-up session, same branch)
Commits: 1 (ee7bc8d)

Files changed: 14 (+839 insertions)
  - lazytopper/src/data/canonicalQuestionBank.ts — +13 imports + 13 spreads
    under "P2 CBSE APQ 2023-24" banner; spread count 137 → 150.
  - 13 new lazytopper/src/data/questionBanks/class10/maths/{topic}.additionalPQ.ts files

Source PDFs (pymupdf 1.27.2.3, 0 cid artifacts confirmed):
  Mathematics-PQ1.pdf (28pp) + Mathematics-PQ1_MS.pdf (22pp) — 38 questions
  Mathematics-PQ2.pdf (7pp)  + Mathematics-PQ2MS2.pdf (7pp)  — 38 questions

Total: 76 questions across all 13 retained Maths topicKeys.

Section breakdown: A=40 (1mk MCQ+AR), B=10 (2mk Short), C=12 (3mk Short),
                   D=8 (5mk Long), E=6 (4mk Case-Based)
Competency: 67/76 = 88% (target was 40% — well exceeded)
Skipped (deleted topics): 0 — no 2026-27-deleted Maths topics appeared in PQ1/PQ2
REQUIRES-FIGURE strategyHints: ~22 questions (geometry diagrams, tables, graphs)

Anti-fabrication doctrine maintained:
  - questionText verbatim from QP PDFs
  - solutionSteps sourced from matching MS PDFs (exact CBSE marking steps)
  - OR variants merged into single rows
  - Section E case-based stored as ONE row per case (marks=4, no sub-part split)
  - isPYQ: false on all 76 (practice papers, not board PYQs)
  - pyqSet: omitted on all 76
  - ID format: APQ-M-{TOPICSHORT}-{SEQ:003d}, sequential per topic across both papers

Per-file question counts:
  real-numbers.additionalPQ.ts             — 6 Qs (A=2, B=1, C=2)
  polynomials.additionalPQ.ts              — 4 Qs (A=2, B=1, C=1)
  pair-of-linear-equations.additionalPQ.ts — 6 Qs (A=3, B=1, C=2)
  quadratic-equations.additionalPQ.ts      — 4 Qs (A=2, D=2)
  arithmetic-progression.additionalPQ.ts   — 4 Qs (A=2, E=2)
  triangles.additionalPQ.ts                — 8 Qs (A=5, B=1, D=2)
  coordinate-geometry.additionalPQ.ts      — 6 Qs (A=4, E=2)
  trigonometry.additionalPQ.ts             — 10 Qs (A=5, B=1, C=2, D=1, E=1)
  circles.additionalPQ.ts                  — 7 Qs (A=3, B=2, C=2)
  areas-related-to-circles.additionalPQ.ts — 5 Qs (A=3, B=1, E=1)
  surface-areas-and-volumes.additionalPQ.ts — 6 Qs (A=3, B=1, C=1, D=1)
  statistics.additionalPQ.ts               — 5 Qs (A=3, D=2)
  probability.additionalPQ.ts              — 5 Qs (A=3, C=2)

New doctrine decisions locked in this PR cycle:

  Pack retirement threshold REVISED: 6,000 → 4,500 authentic questions
    Rationale: 5,000+ authentic is sufficient for CBSE Class 10 prep.
    At 4,500 authentic, retire all AI packs (~2,815 Qs). Bank becomes
    100% authentic + 100% routable. No OCR phase needed.
    Current trajectory: 1,793 authentic; ~2,700 more needed to hit 4,500.

  REQUIRES-FIGURE doctrine:
    Questions referencing PDF diagrams/tables/graphs that don't render in
    text extraction tag with strategyHint: "REQUIRES-FIGURE: [description]".
    questionText and answer remain accurate to PDF; figure is described in
    strategyHint so future Option B (placeholder image) or Option A (SVG
    render post-launch) can fill the gap. ~22 questions in PR #126 carry
    this tag.

  B/C/D/E density gap identified:
    Section A (MCQ/AR) is over-represented in extraction outputs to date.
    Future extractions MUST extract BOTH OR variants for B/C/D/E sections
    to increase non-MCQ density. Bake into all future extraction agent
    instructions. Current Section A:non-A ratio in PR #126 is 40:36 — needs
    to flip toward non-A in subsequent extractions.

  AR (Assertion-Reasoning) density gap identified:
    AR coverage thin across all extractions to date. Dedicated
    .assertionReasoning.ts extraction pass needed after P2 APQ completes.
    Target: 2-3 AR questions per topic for both Maths and Science.

Validations: ALL PASS
  1. syllabusGuard — PASS (0 violations)
  2. validateQuestionBanks — PASS (204 files scanned, was 191; 0 dupes,
     mark/section consistent)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate IDs — 0
  5. Full test matrix (4 files) — PASS (125/125 tests)
  6. Engine reachability — PASS (296/296)

Bank state:
  Authentic questions: 1,717 → 1,793 (+76)
  Spreads: 137 → 150 (+13)
  Bank total: ~4,532 → ~4,608 (+76)

## Post — syllabusGuard 2026-27 doctrine fix (PR #124) — MERGED

Timestamp: 2026-05-24
Merge SHA on base: f09b5fca679e3669bcb0e0b5b26a480d983448cb

PR | fix: syllabusGuard 2026-27 doctrine — restore reproductive health + Our Environment
Branch: fix/syllabus-guard-2026-27-update (deleted after merge)
Commits: 1 (bab8c57)

Files changed: 9 (+672 / -233)

This PR reverses PR #121's blanket removal of reproductive-health content,
which was based on a 2025-26 reading. The 2026-27 board syllabus retains the
Ch 8 reproductive-health subtopics (contraception, family planning, STIs,
safe sex) and the Our Environment chapter (Unit V, ecology). All 18 questions
PR #121 deleted are restored.

syllabusGuard.ts changes:
  - REMOVED 12 reproductive-health strings from Science banned list
      Reproductive Health, Contraception, Family Planning, Sexually
      Transmitted Infections, Sexually Transmitted Diseases, STI, STDs,
      Barrier Contraception, Contraception Methods, Reasons for Contraception,
      Contraceptive Methods, Birth Control Methods
  - REMOVED 14 Our Environment ecology strings from Science banned list
      Our Environment, Ecosystem, Food Chain, Food Web, Biodegradable,
      Non-Biodegradable, Ozone Depletion, Ozone Layer, Biological
      Magnification, Energy Flow, Trophic Levels, Trophic Level, Waste
      Management, Environmental Problems
  - Source comment updated to cite Science_SecP1_2026-27.pdf
  - Net Science banned subtopics: 86 → 60

cbseHistoricalArchetypes.ts changes:
  - Sources of Energy promoted to deletedTopics (was only in subtopic-keyword
    fallback) — Ch 14 is fully deleted from board scope
  - Removed "reproductive health", "contraception", "family planning" from
    deletedSubtopicKeywords — restored in 2026-27
  - NEW formativeOnlyTopics array: ["Electric Motor", "Electromagnetic
    Induction", "Electric Generator"] — taught in 2026-27 but not assessed
    in year-end exam (Science_SecP1_2026-27.pdf Note for Teachers)
  - Header block updated to 2026-27 doctrine source

cbse10Registry_2026_27.json changes:
  - meta.notes updated — Reproduction chapter described as fully in scope
    (asexual + sexual + reproductive health, family planning, safe sex,
    HIV/AIDS)
  - meta.excluded_subtopics — removed the Reproduction reproductive-health
    entry (kept the Heredity evolution exclusion)

Questions restored (18 total, all from PR #121 removals):
  reproduction.exemplar.ts (+4): REPR-EXMPLR-7-MCQ-027, SA-019, LA-007, LA-010
  reproduction.ncert.ts (+3):    REPR-NCERT-7-SA-012, SA-016, SA-019
  reproduction.pack2.ts (+11):   REP2-015, 016, 017, 018, 021, 025, 038, 039,
                                  040, 041, 048
  All content preserved verbatim from git history at pre-PR #121 commit
  0222917e. Only the subtopic field updated to 2026-27-compliant values:
    "Safe Sex and HIV/AIDS" — questions about STDs/HIV/safe sex
    "Family Planning"       — contraception / family-planning content
    "Reproductive Health"   — general reproductive-health content

Test files:
  - reproductionBankGuard.test.ts — rewritten; purpose flipped from "assert
    banned" → "assert retained". 30 tests.
  - opsAcceptanceGuard.test.ts — expanded to 56 tests. New Block 1b confirms
    reproductive-health subtopics NOT zeroed; new Block 4b covers
    formativeOnlyTopics archetype + Motor/EMI/Generator are NOT banned.
  - lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts — bonus fix:
    reproductive-health zeroing assertions inverted (no longer zeroed).

Doctrine decisions locked (CBSE 2026-27):
  Our Environment chapter: RETAINED (Unit V, 5 marks — ecology, food chains,
    trophic levels, pollution, waste management). Do NOT ban its subtopics.
  Reproductive Health subtopics (Ch 8): RETAINED — contraception, family
    planning, STIs, safe sex, HIV/AIDS. Do NOT ban.
  Motor / Electromagnetic Induction / Electric Generator: FORMATIVE ONLY.
    Tracked in cbseHistoricalArchetypes SCIENCE_DELETED_CHAPTERS_2026_27
    .formativeOnlyTopics. NOT banned in question bank — preserves 36
    formative practice questions in magneticEffects.*.ts.
  Sources of Energy (Ch 14): FULLY DELETED. Now in deletedTopics + retains
    subtopic-keyword fallback for legacy questions.
  Management of Natural Resources (Ch 16): FULLY DELETED. Unchanged.

Validations: ALL PASS
  1. syllabusGuard — PASS (0 violations; was 0 before too, but doctrine now correct)
  2. validateQuestionBanks — PASS (191 files, 0 dupes, mark/section consistent)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate IDs — 0
  5. Full test matrix (4 files) — PASS (125/125 tests)
  6. Engine reachability — PASS (296/296 questions routable)

Bank state:
  Authentic questions: 1,717 (was 1,699; +18 restored)
  Spreads: 137 (unchanged — no new files)
  Bank total: ~4,532 (was ~4,514; +18 restored)

## Post-PR #121 — Reproduction bank cleanup + syllabusGuard variant extension + regression test suite — MERGED

Timestamp: 2026-05-24
Merge SHA on base: e4e42feef15bbff2828f7c0c2055bf7131c671c0

PR #121 | fix: reproduction bank cleanup — remove banned Ch8 subtopics + extend syllabusGuard
Branch: fix/reproduction-bank-cleanup (deleted after merge)
Commits: 1 (48201c8)

Files changed: 6 (18 questions removed across 3 banks; guard extended; new regression test)
  - lazytopper/src/data/questionBanks/class10/science/reproduction.exemplar.ts (-4 Qs)
      REPR-EXMPLR-7-MCQ-027 (STDs), REPR-EXMPLR-7-SA-019 (Barrier Contraception),
      REPR-EXMPLR-7-LA-007 (Contraception), REPR-EXMPLR-7-LA-010 (STDs)
  - lazytopper/src/data/questionBanks/class10/science/reproduction.ncert.ts (-3 Qs)
      REPR-NCERT-7-SA-012 (Contraception), REPR-NCERT-7-SA-016 (Contraception Methods),
      REPR-NCERT-7-SA-019 (Reasons for Contraception)
  - lazytopper/src/data/questionBanks/class10/science/reproduction.pack2.ts (-11 Qs)
      REP2-015/016/017/018/021/025/038/039/040/041/048 — all subtopic "Reproductive Health"
  - scripts/src/syllabusGuard.ts — 5 new banned variants added to Science Ch8 block:
      "Barrier Contraception", "Contraception Methods", "Reasons for Contraception",
      "Contraceptive Methods", "Birth Control Methods"
  - scripts/src/reproductionBankGuard.test.ts — NEW (35 tests / 5 describe blocks)
      banned variants flagged (12) + retained subtopics clean (15) + substring safety (3)
      + multi-banned counted (2) + regression lock on 3 repo files (3)
  - scripts/package.json — `test:reproduction` script added; `test:matrix:all` updated to 3 files

Rationale: 15 questions across 3 reproduction banks were flagged by syllabusGuard (existing
ban list) but had never been cleaned. An additional 3 questions used compound subtopic strings
("Barrier Contraception" / "Contraception Methods" / "Reasons for Contraception") that slipped
past exact-match syllabusGuard despite being entirely about deleted Ch8 sub-topics. This PR
removes all 18 questions, extends the ban list with the 5 compound variants (plus 2 defensive
forward-looking variants), and adds a 35-test regression suite so future extractions cannot
reintroduce similar content without tripping the guard.

Validations: ALL PASS
  1. syllabusGuard — PASS (0 violations; was 15 pre-PR)
  2. validateQuestionBanks — PASS (0 dupes, mark/section consistent across 191 files)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate ID belt-and-suspenders — PASS (0 dupes)
  5. Full test matrix (syllabusGuard.test + deletionGuard.test + reproductionBankGuard.test)
     — PASS (74/74)
  6. Engine reachability — PASS (296/296 new-PR questions routable)

Bank state (removals only, no additions):
  Authentic questions: 1,699 (unchanged — removed Qs were always invalid per CBSE 2025-26)
  Spreads: 137 (unchanged)
  Bank total: 4,514 (unchanged)

## Post-PR #119 — P2 CBSE Sample Question Papers 2023-24 (69 Qs Maths+Science SQP) + bannedExercises hotfix — MERGED

Timestamp: 2026-05-24
Merge SHA on base: c5b8c51e22a2fffc0afb9109d0c230511160ab8d

PR #119 | content: P2 CBSE Sample Question Papers 2023-24 (69 Qs Maths+Science SQP) + bannedExercises hotfix
Branch: content/additional-pq-sqp-2024 (preserved locally — APQ follow-up may reuse)
Commits: 1 (6fdb48b)

Files changed: 27 (1 modified bank + 1 modified config + 25 new SQP topic files)
  - lazytopper/src/data/canonicalQuestionBank.ts (MODIFIED — +25 imports, +25 spreads under P2 banner)
  - scripts/src/bannedExercises.json (MODIFIED — bannedExercises hotfix, see below)
  - lazytopper/src/data/questionBanks/class10/maths/*.sqp.ts (NEW — 13 files, 38 Qs)
    real-numbers.sqp.ts (3), polynomials.sqp.ts (2), pair-of-linear-equations.sqp.ts (2),
    quadratic-equations.sqp.ts (2), arithmetic-progression.sqp.ts (3), triangles.sqp.ts (3),
    coordinate-geometry.sqp.ts (3), trigonometry.sqp.ts (6), circles.sqp.ts (4),
    areas-related-to-circles.sqp.ts (3), surface-areas-and-volumes.sqp.ts (2),
    statistics.sqp.ts (3), probability.sqp.ts (2)
  - lazytopper/src/data/questionBanks/class10/science/*.sqp.ts (NEW — 12 files, 31 Qs)
    chemical-reactions-and-equations.sqp.ts (4), acids-bases-and-salts.sqp.ts (1),
    metals-and-non-metals.sqp.ts (3), carbon-and-its-compounds.sqp.ts (2),
    life-processes.sqp.ts (3), control-and-coordination.sqp.ts (2),
    how-do-organisms-reproduce.sqp.ts (3), heredity.sqp.ts (3),
    light-reflection-and-refraction.sqp.ts (4), human-eye-and-colourful-world.sqp.ts (1),
    electricity.sqp.ts (4), magnetic-effects-of-electric-current.sqp.ts (1)

Sources (CBSE-official, both with matching marking-scheme PDFs):
  Maths: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp)
  Science: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp)

Section breakdown: A=33 (1mk), B=10 (2mk), C=13 (3mk), D=7 (5mk), E=6 (4mk case-based)
Section E case-sets: ONE row per case set with merged sub-parts (i)/(ii)/(iii), marks=4

isPYQ: false on all 69 questions (SQP is CBSE-released sample, not a board exam paper)
isCompetencyBased: 44/69 = 63.8% overall
solutionSteps: 0% empty (all 69 questions have full steps from MS PDFs)

8 Science questions intentionally skipped (deleted-in-2025-26 topics):
  Q5 (missing options - image-only), Q6/Q7 (Periodic Classification),
  Q15/Q16/Q20/Q26 (Our Environment / Ozone / Food Chain), Q18 (Natural Selection)

bannedExercises.json hotfix (owner-directed during PR #119 review):
  PR #117 had added 6 chapter-renumbering false positives — Ex 11.1, Ex 11.2, Ex 9.1, Ex 9.2,
  NCERT Ch11, NCERT Ch9 Ex 9 — because these were OLD-NCERT numbering for deleted Constructions.
  In NEW CBSE 2025-26 NCERT: Ch 11 = Areas Related to Circles (RETAINED), Ch 9 = Some Applications
  of Trigonometry (RETAINED) — same exercise numbers, different content. 75 pre-existing pack-file
  ncertRef strings referred to RETAINED chapters. Hotfix removed those 6 entries; kept only
  "Ex 13.3" (Frustum — correctly deleted). reason string updated.

Tooling discovery during this PR:
  pdfplumber 0.11.9 emits (cid:NNNN) glyph artifacts for CBSE PDF math expressions (font subsets
  without ToUnicode mapping) — required heavy manual reconstruction per question.
  pymupdf 1.27.2.3 (fitz) — tested on MathsStandard-SQP.pdf: extracts cleanly with 0 cid artifacts.
  Recommended PDF tool for APQ follow-up extraction (replaces pdfplumber).

Validations: 5 of 6 PASS; 1 pre-existing only (V1 syllabusGuard 15-violations in reproduction.*.ts,
  unchanged from PR #117, queued for separate cleanup PR; P2 SQP contributes 0 new violations)
  1. syllabusGuard — FAIL on 15 PRE-EXISTING (reproduction.exemplar.ts STDs x2 + Contraception x1,
     reproduction.ncert.ts Contraception x1, reproduction.pack2.ts Reproductive Health x11)
  2. validateQuestionBanks — PASS (after hotfix; 0 banned-exercise refs across 191 files,
     mark/section consistent, 0 duplicate IDs)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate ID belt-and-suspenders — PASS (1,434 IDs, 0 dupes)
  5. git diff scope + whitespace — PASS (27 expected files; git diff --check clean)
  6. Engine reachability — PASS (bank loads at 4,514 questions; all 69 SQP IDs reachable)

canonicalQuestionBank.ts:
  Spreads before: 112
  Spreads after: 137
  Bank total: 4,514 questions (was 4,445)

Authentic question total post-PR #119: 1,699
  NCERT+Exemplar Science ch1-12: 904 (PRs #98–#106)
  NCERT+Exemplar Maths ch1-14: 643 (PR #109)
  P0 diff/ pack registration: 62 (PR #112)
  P0.5 diff/ pack registration: 21 (PR #114)
  P2 CBSE SQP 2023-24: 69 (PR #119)
  Total: 1,699 authentic questions in engine

## Post-PR #117 — syllabusGuard + bannedExercises + CBSE step-marking doctrine (2025-26) — MERGED

Timestamp: 2026-05-24
Merge SHA on base: a38573b6e5ca0db4cff6153be273fdb160047ad8

PR #117 | fix: syllabusGuard + bannedExercises + CBSE step-marking doctrine (2025-26)
Branch: fix/syllabus-guard-2025-26 (deleted after merge)
Commits: 1 (7299760)

Files changed: 3 (all docs/config — no question bank touched)
  - scripts/src/syllabusGuard.ts (MODIFIED — RULES array rebuilt for CBSE 2025-26)
  - scripts/src/bannedExercises.json (MODIFIED — Maths exercises 1→7, Science 2→8)
  - CLAUDE.md (MODIFIED — new §13 CBSE Content Doctrine — Step Marking)

syllabusGuard.ts:
  Maths bannedSubtopics: 8 → 30 (added Euclid Lemma, Polynomial Division Algo, Cross-Multiplication,
    Complementary-Angle Trig, Frustum of Cone, Step Deviation, Ogive variants, Construction variants)
  Science bannedSubtopics: 24 → 82 (added Periodic Classification chapter, Reproductive Health,
    Evolution sub-topics, Sources of Energy chapter, Our Environment chapter, Management of Natural
    Resources chapter — all per CBSE 2025-26 rationalisation)
  Owner-applied correction during review: removed "Area of Triangle" + "Conversion of Solids"
    variants (3+3 entries) — topics.ts blurbs explicitly retain these concepts; only Frustum of Cone
    was genuinely deleted. Final Maths count: 30 (not the initial 36).

bannedExercises.json:
  Maths: added Ex 11.1, 11.2 (Constructions Ch11), Ex 9.1, 9.2, NCERT Ch11, NCERT Ch9 Ex 9. Kept Ex 13.3.
  Science: added Ch5/Ch14/Ch16 Exercise+InText pairs (Periodic Classification, Sources of Energy,
    Management of Natural Resources). Kept Ch15 Exercise+InText.

CLAUDE.md §13 (NEW — appended; §1–§12 untouched):
  Corrected solutionSteps minimums per CBSE 2025-26 OSM marking guide:
    Section A (1mk MCQ/AR):  1 step  (was wrongly documented as 2)
    Section B (2mk VSA):     2 steps
    Section C (3mk SA):      3 steps
    Section D (5mk LA):      5 steps
    Section E (4mk case):    4 steps
  Six step-marking principles added: half-mark steps, error-carried-forward, SI units mandatory,
    exact CBSE keywords for Science, chemistry split (balanced equation + state symbols), Science
    diagram split (drawing + labels).

Validations: ALL PASS
  1. App tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  2. Scripts tsc --noEmit — PASS (exit 0)
  3. git diff --check — PASS
  4. git diff --name-only HEAD — PASS (exactly 3 files)
  5. 5-test verification script — ALL PASS
  6. syllabusGuard against existing bank — 15 flagged (down from 65 after Correction 1):
       Maths violations: 0 (Area of Triangle + Conversion of Solids correctly removed from ban list)
       Science violations: 15 — all legitimate Ch8 Reproductive Health deletions in
         reproduction.exemplar.ts (STDs x2, Contraception x1)
         reproduction.ncert.ts (Contraception x1)
         reproduction.pack2.ts (Reproductive Health x11)
       Per prompt: no auto-fix; flagged for follow-up PR.

Bank totals unchanged: 1,630 authentic questions (no question bank file touched by this PR).

Follow-up PRs queued (NOT done yet):
  1. ops/ acceptance test alignment — `lazytopper/scripts/ops/cbse_registry_2026_27_acceptance.mjs`
     line 26-30 EXCLUDED_CHAPTER_TITLES needs Our Environment added; line 208-218
     "our_environment_chapter_present_in_scope" assertion needs inverting.
     `lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts` line 226-249 "food chains under
     Our Environment NOT zeroed" assertion needs updating. Both contradict the new doctrine that
     Our Environment is fully deleted per CBSE 2025-26.
  2. Reproduction question bank cleanup — reclassify/remove the 15 banned questions across
     reproduction.exemplar.ts, reproduction.ncert.ts, reproduction.pack2.ts.

## Post-PR #116 — PRE-P1 mojibake symbol restoration in P0.5 case-based files — MERGED

Timestamp: 2026-05-23 (late)
Merge SHA on base: e9f41cd855ea571c1e39ef761042ca7eac153202

PR #116 | fix: restore mojibake symbols in P0.5 case-based files (maths.caseBased + science.caseBased)
Branch: content/fix-p05-symbol-restoration (deleted after merge)
Commits: 1 (a6fc107)

Files changed: 2 (data-only, scoped to symbol-broken case-based files)
  - lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts (encoding fix — 266 replacements)
  - lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts (encoding fix — 233 replacements)

Tool used: ftfy 6.3.1. The original PRE-P1 prompt's Latin-1 mojibake dictionary was insufficient —
actual encoding was Windows-1252 (cp1252) for maths.caseBased and doubly-encoded cp1252 for
science.caseBased. ftfy.fix_text handled both correctly. After fix, ftfy.fix_text is a no-op on
both saved files (idempotent — fully clean).

Total character replacements: 499 (266 + 233). 0 content changes — encoding-only.

Symbols recovered (sample):
  Maths: △ ᵢ Σ × − ≈ ≥ √ → ∠ ∥ — ✓ ₁ ₂ ₃ ₄ ₅ ₉ ₀ ₹
  Science: Ω ρ ₂ ₆ ₇ ₈ ₚ ⁻⁶ ⁻⁷ ⁻⁸ ⁺ × − → — ≈

circles.proof.ts was scheduled in the original PRE-P1 prompt but found to be already clean
(no mojibake present). Removed from the fix scope mid-flight.

Validations: 4 PASS
  - tsc -p tsconfig.app.json --noEmit — PASS
  - validateQuestionBanks — PASS (0 dupes, mark/section OK across 166 files)
  - git diff --check — PASS
  - git diff --name-only HEAD — exactly 2 expected files

Bank totals: 1,630 authentic questions (unchanged; encoding repair only).

## Post-PR #115 — docs handoff post-PR #114 — MERGED

Timestamp: 2026-05-23
Merge SHA on base: 693d91125a9232f5a2d9f07af3683132d46aa674

PR #115 | docs: handoff update post-PR #114 (P0.5 pack registration, 21 questions)
Branch: docs/handoff-pr114 (deleted after merge)

Docs-only handoff sync after PR #114. No product files changed.

## Post-PR #114 — P0.5 diff/ pack registration (21 questions — case-based + circles proof) — MERGED

Timestamp: 2026-05-23
Merge SHA on base: d0b34932ce30805e6e3b7a492ffdb3d3538d24d4

PR #114 | content: register P0.5 diff/ pack files (21 questions — case-based Sec E merged + circles proof Sec C/D)
Branch: content/register-diff-packs-p05 (deleted after merge)
Commits: 1

Files changed: 4
  - lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts (NEW — 6 Qs)
  - lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts (NEW — 5 Qs)
  - lazytopper/src/data/questionBanks/class10/maths/circles.proof.ts (NEW — 10 Qs)
  - lazytopper/src/data/canonicalQuestionBank.ts (MODIFIED — +3 imports, +3 spreads)

Questions added: 21
  Maths — maths.caseBased.ts: 6 Section E case sets (4 marks each; merged from 18 sub-rows i/ii/iii)
    topicKeys: triangles (2), arithmetic-progression (2), statistics (1), quadratic-equations (1)
  Science — science.caseBased.ts: 5 Section E case sets (4 marks each; merged from 15 sub-rows)
    topicKeys: electricity (2), life-processes (2), light-reflection-and-refraction (1)
  Maths — circles.proof.ts: 10 (Section C=5 Short 3-mark + Section D=5 Long 5-mark; topicKey: circles)

canonicalQuestionBank.ts:
  Spreads before: 109
  Spreads after: 112
  Bank total: 4,445 questions

Source files (diff/ folder):
  maths_case_based_pack.ts → maths.caseBased.ts (split form 18 sub-rows → merged 6 case sets in repo)
  science_case_based_pack.ts → science.caseBased.ts (split 15 → merged 5 in repo)
  circles_proof_pack.ts → circles.proof.ts (10 rows, no restructure needed)
  diff/ originals untouched (kept in split form for reference)

Fixes applied:
  topicKey normalisation (in diff/ sources): Title Case → kebab-case slug (8 distinct keys across 3 files)
  format normalisation (in repo copies only): "Proof" → "Short" (Sec C × 5) | "Long" (Sec D × 5)
  Case-set restructure (in repo copies only, maths + science case-based):
    Each 3-row split case set (marks 1+1+2) merged into one 4-mark Section E row.
    Reason: validateQuestionBanks enforces section "E" ⇒ marks 4 per row.
    Merge done via one-off script diff/_p05_merge_caseSets.mjs (preserved in diff/).
    ID format: base ID without -i/-ii/-iii suffix (e.g. CASE-MATHS-TRI-001).
    questionText/solutionSteps/answer concatenate parts with "Part (i)/(ii)/(iii)" labels.
    First sub-part's subject/topicKey/subtopic/difficulty/bloomSkill/pyqYear/pyqSet/ncertRef preserved.
    isCompetencyBased: true if ANY sub-part was true.

Validations: ALL 6 PASS (round 2, post-restructure)
  1. syllabusGuard — PASS (0 banned subtopics)
  2. validateQuestionBanks — PASS (166 files, mark/section consistent, 0 duplicate IDs)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate ID belt-and-suspenders — PASS (1,365 IDs, 0 dupes)
  5. git diff scope — PASS (4 expected paths)
  6. Engine reachability — PASS (21 P0.5 Qs route correctly; 0 stray sub-part IDs)

V2 mid-flight blocker + resolution:
  Round 1 (split form): 33 mark/section mismatches in case-based files (Section E rows with marks 1 or 2).
  Resolution (owner-directed Option 2): restructure repo copies so each case set is ONE 4-mark Section E row.
  Round 2: V2 PASS.

Engine reachability results (P0.5 contribution only):
  circles                            → P0.5 hits=10, total=48,  sections={D:5,C:5}
  triangles                          → P0.5 hits=2,  total=76,  sections={E:2}
  arithmetic-progression             → P0.5 hits=2,  total=48,  sections={E:2}
  statistics                         → P0.5 hits=1,  total=40,  sections={E:1}
  quadratic-equations                → P0.5 hits=1,  total=60,  sections={E:1}
  electricity                        → P0.5 hits=2,  total=101, sections={E:2}
  life-processes                     → P0.5 hits=2,  total=128, sections={E:2}
  light-reflection-and-refraction    → P0.5 hits=1,  total=74,  sections={E:1}

Authentic question total post-PR #114: 1,630
  NCERT+Exemplar Science ch1-12: 904 (PRs #98–#106)
  NCERT+Exemplar Maths ch1-14: 643 (PR #109)
  P0 diff/ pack registration: 62 (PR #112)
  P0.5 diff/ pack registration: 21 (PR #114)
  Total: 1,630 authentic questions in engine

Known issue (scheduled as PRE-P1):
  Mojibake in maths.caseBased.ts and science.caseBased.ts — UTF-8 multibyte sequences
  (e.g. △, ∥, ², √, ₂, →, ✓, ₹) rendered as â–³, âˆ¥, Â², âˆš, etc. in questionText/solutionSteps.
  Inherited from the diff/ source pack files; not introduced by the merge script.
  circles.proof.ts has the same issue. UI rendering of these questions will be visibly broken.
  Fix scheduled as PRE-P1 (branch: content/fix-p05-symbol-restoration) BEFORE P1-M Practise Papers.

## Post-PR #112 — P0 diff/ pack registration (62 questions) — MERGED

Timestamp: 2026-05-23
Merge SHA on base: 8c8acf40f129949cac47adf8a769d8fdc6128c79

PR #112 | content: register P0 diff/ pack files (62 questions — triangles/trig AR+proof, science AR)
Branch: content/register-diff-packs (deleted after merge)
Commits: 1

Files changed: 6
  - lazytopper/src/data/questionBanks/class10/maths/triangles.assertionReasoning.ts (NEW — 10 Qs)
  - lazytopper/src/data/questionBanks/class10/maths/trigonometry.assertionReasoning.ts (NEW — 10 Qs)
  - lazytopper/src/data/questionBanks/class10/maths/triangles.proof.ts (NEW — 10 Qs)
  - lazytopper/src/data/questionBanks/class10/maths/trigonometry.proof.ts (NEW — 12 Qs)
  - lazytopper/src/data/questionBanks/class10/science/science.assertionReasoning.ts (NEW — 20 Qs)
  - lazytopper/src/data/canonicalQuestionBank.ts (MODIFIED — +5 imports, +5 spreads)

Questions added: 62
  Maths — triangles.assertionReasoning.ts: 10 (Section A AR, topicKey: triangles)
  Maths — trigonometry.assertionReasoning.ts: 10 (Section A AR, topicKey: trigonometry)
  Maths — triangles.proof.ts: 10 (Section C=3, D=7, topicKey: triangles)
  Maths — trigonometry.proof.ts: 12 (Section C=6, D=6, topicKey: trigonometry)
  Science — science.assertionReasoning.ts: 20 (Section A AR, electricity=10, life-processes=10)

canonicalQuestionBank.ts:
  Spreads before: 104
  Spreads after: 109
  Bank total: 4,424 questions

Source files (diff/ folder):
  assertion_reason_pack.ts → split into triangles + trigonometry AR files
  science_assertion_reason_pack.ts → science.assertionReasoning.ts
  triangles_proof_pack.ts → triangles.proof.ts
  trigonometry_proof_pack.ts → trigonometry.proof.ts

Fix applied: topicKey normalisation only
  "Triangles" → "triangles"
  "Trigonometry" → "trigonometry"
  "Electricity" → "electricity"
  "Life Processes" → "life-processes"

Mid-flight schema correction (in repo files only, diff/ originals untouched):
  "format": "Proof" → "Short" (Section C, 3-mark)
  "format": "Proof" → "Long" (Section D, 5-mark)
  Reason: "Proof" is not a valid QuestionFormat union member in predictionTypes.ts

Validations: ALL 6 PASS
  1. syllabusGuard — PASS (0 banned subtopics)
  2. validateQuestionBanks — PASS (163 files, 0 duplicate IDs)
  3. tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
  4. Duplicate ID check — PASS (1,344 IDs, 0 dupes)
  5. git status diff check — PASS (exactly 6 expected files)
  6. Engine reachability — PASS (all 4 topicKeys ROUTE CORRECTLY)

Engine reachability results:
  triangles    → total 74  | new 20 | A=10 C=3 D=7  | comp 14/20 | steps 20/20
  trigonometry → total 318 | new 22 | A=10 C=6 D=6  | comp 14/22 | steps 22/22
  electricity  → total 99  | new 10 | A=10           | comp 8/10  | steps 10/10
  life-processes → total 126 | new 10 | A=10         | comp 8/10  | steps 10/10

Competency impact:
  triangles: was 1.7% (pack3 only) → now meaningfully higher with 14/20 = 70% new Qs
  trigonometry: was 1.7% (pack3 only) → now with 14/22 = 64% new Qs
  electricity: AR coverage added (was 0 Section A AR) → +10 AR Qs at 80% competency
  life-processes: AR coverage added (was 0 Section A AR) → +10 AR Qs at 80% competency

Authentic question total post-PR #112: 1,609
  NCERT+Exemplar Science ch1-12: 904 (PRs #98-#106)
  NCERT+Exemplar Maths ch1-14: 643 (PR #109)
  P0 diff/ pack registration: 62 (PR #112)
  Total: 1,609 authentic questions in engine

Note: pyqSet values in AR files use full CBSE set codes (e.g. "30/1/1")
rather than short form ("1"|"2"|"3"). Non-blocking — field is string | undefined.
Will be normalised during P5 PYQ extraction cleanup pass.

## Current state

Production branch: base/approved-thru-437
Last merged PR: #133 — fix: K2H-8f PYQ filter (engine-layer hard filter)
Last merged content PR: #132 — content: P3 Science chapter-wise (552 Qs across 13 Science topic files)
Live Vercel: https://lazytopper-production-desktop.vercel.app/app/

## Complete PR history (all merged)

| PR | Title | Merge SHA | Key change |
|---|---|---|---|
| #75 | K2H-1: Practice checked-evidence hardening | 38f5a56a | MCQ clicks = real attempts |
| #78 | K2H-3: Auth/session shell hardening | 0addba3f | Removed guest mode |
| #80 | K2H-4: Frozen landing + explore-first | 018c95b1 | Landing frozen, /browse added |
| #82 | K2H-5: Login visual parity | 11aac1bc | Login polished |
| #85 | K2H-6: Home cockpit order | a0e540a8 | Cards order fixed |
| #87 | K2H-7: Pricing visual redesign | e239f883 | 2999/year, honest |
| #89 | K2H-8a: Practice focus continuity | 33d0eaff | subtopicHint forwarded |
| #92 | K2H-8b+8c: Advanced practice filters | b97ba30e | Section/difficulty/type chips |
| #94 | K2H-8d+8e: Filter wiring through engine | 699a39d4 | questionType+pyqOnly wired |
| #96 | Content Agent 1 fixes | 90c97f56 | 18 questions fixed |
| #97 | Docs: post-PR #96 | f687ba2 | Handoff updated |
| #98 | Science ch1-7 NCERT+Exemplar | b88ed11f | 608 questions extracted |
| #99 | Docs: post-PR #98 | 6a70889f | Handoff updated |
| #100 | Wire Science ch1-7 + topicKey + syllabus guard | 443a913 | 608 questions wired into engine |
| #101 | Fix: Clerk OAuth BASE_PATH 404 | f88f742 | Login Google OAuth working on Vercel |
| #102 | Squash: wire Science ch1-7 + handoff | 56ce39b | Base after wiring |
| #103 | Docs: post-PR #101 #102 | 63a01575 | Handoff updated |
| #104 | (not used — numbering gap) | — | — |
| #105 | Docs: post-Science ch8-12 (early) | 6e937d55 | Handoff updated |
| #106 | Science ch8-12 NCERT+Exemplar | dfbf725a | 296 questions wired into engine |
| #107 | Docs: post-PR #106 | 7a120ad9 | Handoff updated |
| #108 | Fix: deletionGuard.test.ts | 25230e8f | 29/29 tests passing |
| #109 | Maths ch1-14 NCERT+Exemplar | f0d90b1b | 643 questions wired into engine |
| #110 | Docs: post-PR #108 #109 | b6be2908 | Handoff updated |
| #111 | Docs: full catchup #99–#110 | da8c08dc | Handoff updated |
| #112 | P0 diff/ pack registration | 8c8acf40 | 62 questions (AR + Proof) wired into engine |
| #113 | Docs: post-PR #112 | e7645273 | Handoff updated |
| #114 | P0.5 diff/ pack registration | d0b34932 | 21 questions (Case-based + circles proof) |
| #115 | Docs: post-PR #114 | 693d9112 | Handoff updated |
| #116 | PRE-P1 mojibake symbol restoration | e9f41cd8 | 499 char repairs (ftfy) in P0.5 case-based files |
| #117 | syllabusGuard + bannedExercises + CBSE step-marking doctrine | a38573b6 | Guard rebuilt for CBSE 2025-26 |
| #118 | Docs: post-PR #117 | 487f9603 | Handoff updated |
| #119 | P2 CBSE SQP 2023-24 + bannedExercises hotfix | c5b8c51e | 69 SQP questions (Maths 38 + Science 31) |
| #120 | Docs: post-PR #119 | 0222917e | Handoff updated |
| #121 | Reproduction bank cleanup + syllabusGuard variant ext + regression tests | e4e42fee | -18 Qs, +5 banned variants, +35 tests |
| #122 | Docs: post-PR #121 | ef31ece0 | Handoff updated |
| #123 | ops acceptance regression suite — 2026-27 deletion doctrine | 734b437b | +37 tests, locks doctrine across registry + archetypes + topics |
| #124 | syllabusGuard 2026-27 doctrine — reproductive health + Our Environment | f09b5fca | -26 banned strings, +18 Qs restored, formativeOnlyTopics added |
| #125 | Docs: post-PR #124 | 462f2c77 | Handoff updated |
| #126 | P2 APQ Maths PQ1 + PQ2 (76 Qs across 13 topic files) | 9be89452 | +76 authentic, +13 spreads, REQUIRES-FIGURE doctrine, 4,500 retirement threshold |
| #127 | Docs: post-PR #126 | 26db3f1c | Handoff updated |
| #128 | P2 APQ continuation — PQ_2022 + Science-PQ (~90 Qs) | 028d51d3 | +90 authentic, +13 spreads (Science), OR-doctrine validated, first Our Environment Qs |
| #129 | Docs: handoff post-PR #128 | b16ebb64 | Handoff updated |
| #130 | P2 APQ Science-PQ2 (49 Qs across 13 Science files) | d739585d | +49 authentic (1,883 → 1,932), spreads unchanged (no new files), P2 APQ COMPLETE (5 papers / 284 Qs total). content/additional-pq-sqp-2024 branch DELETED after merge |
| #131 | Docs: handoff post-PR #130 | 6c5404f9 | Handoff updated |
| #132 | P3 Science chapter-wise (552 Qs across 13 Science files) | (squashed into c0f129d) | +552 authentic (1,932 → 2,484), spreads 163 → 176, bank 4,729 → 5,281. 13 chapters covered; ch05/14/16 skipped per 2026-27. SCO/SCQ ID prefixes. content/p3-science-chapterwise branch DELETED after merge |
| #133 | Fix: K2H-8f PYQ filter (engine-layer hard filter) | c0f129dc | Engine `pyqOnly` field + `isPYQQuestion` helper. 435 pyqYear-tagged Qs now correctly returned. Test matrix 125 → 134 (+9). UI wiring follow-up. fix/k2h-8f-pyq-filter branch DELETED after merge — CURRENT BASE |

## Question bank state

| Content | Questions | Status |
|---|---|---|
| Science NCERT+Exemplar ch1-12 | 904 | Live in engine (7 restored in PR #124 — reproductive health back in scope) |
| Maths NCERT+Exemplar ch1-14 | 643 | Live in engine |
| P0 diff/ packs (PR #112) | 62 | Live in engine |
| P0.5 diff/ packs (PR #114) | 21 | Live in engine |
| P2 SQP 2023-24 (PR #119) | 69 | Live in engine |
| P2 APQ Maths PQ1+PQ2 (PR #126) | 76 | Live in engine |
| P2 APQ continuation PQ_2022+Science (PR #128) | 90 | Live in engine |
| P2 APQ Science-PQ2 (PR #130) | 49 | Live in engine |
| **P3 Science chapter-wise (PR #132)** | **552** | **Live in engine (13 new files; +13 spreads). SCO-S-*/SCQ-S-* IDs** |
| Existing pack1/pack2/pack3 | ~2,470 | Live, AI-generated; retirement threshold 4,500 |
| Total in engine (confirmed) | **5,281** | (engine reachability load: canonicalQuestionBank.length = 5,281) |

canonicalQuestionBank.ts spread count: **176** (was 163 pre-PR #132; +13 chapter-wise files)

Pack retirement threshold: **4,500 authentic questions** (set in PR #126 cycle).
  At 4,500 authentic, retire all AI packs (~2,815 Qs). Bank becomes 100% authentic +
  100% routable. No OCR phase needed.
  Progress: 2,484 / 4,500 = **55.2%** (+12.3 pp from PR #130).

## Known issues

- **PRE-P1 mojibake (RESOLVED in PR #116)** — fully fixed via ftfy
- **syllabusGuard reproduction-bank violations** (RESOLVED in PR #121, doctrine corrected in PR #124)
- **syllabusGuard incorrectly banned Our Environment subtopics** (RESOLVED in PR #124)
- **syllabusGuard incorrectly banned Contraception/STDs** (RESOLVED in PR #124)
- **18 reproduction questions wrongly removed in PR #121** — RESTORED in PR #124
- **Motor/Generator/EMI not tracked in archetypes** (RESOLVED in PR #124 — formativeOnlyTopics added)
- **REQUIRES-FIGURE backlog** — ~135 cumulative questions (PRs #126 + #128 + #130 + #132 ~70 in chapter-wise) tagged REQUIRES-FIGURE in strategyHint; need placeholder image (Option B) or SVG render (Option A) post-launch
- **Chemistry `$` arrow rendering in chapter-wise files** (PR #132) — pymupdf renders `→` as `$` in cbjescco/cbjesccq source. Content verbatim from PDF (anti-fabrication preserved). Future cleanup pass could substitute `$` → `→` where safe.
- **K2H-8f UI wiring follow-up** (post-PR #133) — engine-layer hard filter landed in PR #133, but three UI-side connections remain (separate PRs): (a) wire `pyqOnly` through practiceQuestionBuilder.ts; (b) fix engine-to-UI mapping that strips `pyqYear`/`isPYQ`; (c) add `isPYQ?: boolean` to CanonicalQuestion in predictionTypes.ts. Until these land, the engine filter works but the UI chip can't reach it cleanly.
- **B/C/D/E density doctrine validated through PR #130** — OR-pair extraction continues to produce dense non-MCQ output. Apply to all future extractions.
- **AR (Assertion-Reasoning) density gap** — still thin across both Maths and Science; dedicated .assertionReasoning.ts pass needed (P2 APQ complete, P3 Science chapter-wise complete)
- **Our Environment: 48 Qs in bank** (PR #128 seeded 4 + PR #130 added 4 + PR #132 added 40 chapter-wise). Density now reasonable.
- **TopicHub SEEDED: 14/25 topics** — 11 topicKeys with bank content still on sample-preview
- **"Show visual" button broken in TopicHub right rail** — wiring gap; quick-win product PR planned (≤20 lines)
- **No formula sheet surface** — data exists in archetypes for 14 topics but no UI renders it; medium-effort product PR planned
- **strategyHint never rendered** — 75+ question banks contain authored strategyHints (including all REQUIRES-FIGURE descriptions) but no surface displays them; small product PR planned (Hint button in PracticeQuestionCard)
- **API gateway gap in vercel.json** — no /api/* rewrite; AI features return 404 in production; high-effort fix (Vercel rewrite + Railway deploy)
- **Tutor drawer surfaces underused** — MentorSolveDrawer / ConceptTeachDrawer / TutorDrawerV2 exist but don't receive student attempt data; pre-launch product decision pending
- Clerk dev mode only (pk_test_) — no production instance configured
- pack1/pack2/pack3 questions are AI-generated — retirement at 4,500 authentic threshold
- deletionGuard.test.ts fixed (PR #108) — 29/29 tests passing
- index.html meta stale (149/month, wrong theme-color)
- pyqSet format inconsistency in P0 AR files (full CBSE codes — cleanup in P5)
- .claude/ folder not in .gitignore — minor housekeeping

## Frozen files — do not touch

Welcome.tsx, App.tsx, DesktopShell.tsx, main.tsx, vite.config.ts

## Data honesty rules

- No fake progress, mastery, score, weak areas, or Mistake Intelligence
- solutionSteps = CBSE marking guide only
- isPYQ: true only on verbatim CBSE official text
- MCQ click = real attempt, feeds Mistake Intelligence
- Check My Answer = real checking path, richer MI evidence
