# LazyTopper Current Handoff State
Last updated: 2026-05-24 (post-PR #121)
Live base SHA: e4e42feef15bbff2828f7c0c2055bf7131c671c0

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
Last merged PR: #121 — fix: reproduction bank cleanup + syllabusGuard variant extension + regression test suite
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
| #121 | Reproduction bank cleanup + syllabusGuard variant ext + regression tests | e4e42fee | -18 Qs, +5 banned variants, +35 tests — CURRENT BASE |

## Question bank state

| Content | Questions | Status |
|---|---|---|
| Science NCERT+Exemplar ch1-12 | 904 | Live in engine (7 deleted in PR #121 — banned Ch8 subtopics) |
| Maths NCERT+Exemplar ch1-14 | 643 | Live in engine |
| P0 diff/ packs (PR #112) | 62 | Live in engine |
| P0.5 diff/ packs (PR #114) | 21 | Live in engine |
| P2 SQP 2023-24 (PR #119) | 69 | Live in engine |
| Existing pack1/pack2/pack3 | ~2,459 | Live, AI-generated (11 deleted in PR #121); retirement pending |
| Total in engine | 4,514 | (unchanged — removals only, no additions in PR #121) |

canonicalQuestionBank.ts spread count: 137

## Known issues

- **PRE-P1 mojibake (RESOLVED in PR #116)** — fully fixed via ftfy
- syllabusGuard 15 reproduction-bank violations (RESOLVED in PR #121) — 0 violations now
- ops/ acceptance test: Our Environment chapter assertion still expects retained — pending
- Clerk dev mode only (pk_test_) — no production instance configured
- AI features 404 in production (no /api/* rewrite in vercel.json)
- PYQ filter returns 0 (K2H-8f engine fix pending — pre-req for P5)
- pack1/pack2/pack3 questions are AI-generated — retirement planned (threshold 6,000 authentic)
- deletionGuard.test.ts fixed (PR #108) — 29/29 tests passing
- strategyHint authored but never rendered (quick win pending)
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
