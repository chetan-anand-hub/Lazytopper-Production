# BANK-AUDIT-1: served question-bank audit (report only, do not merge)

**Session:** BANK-AUDIT-1, cloud session, 2026-10-06, report only. This branch adds only `ops/reports/bank-audit-1/*`. No product, data, `src/**`, `server/**` or `.github/**` file is touched.

## 1. Trunk, pre-flight, and how the served set was built

**Trunk audited:** `613d8996f54137728d8e8c9f95042ffddc63baab`, the tip of `origin/base/approved-thru-437` at session start (*feat(notes): elevation and depression as separate NCERT figures… (#958)*).

The spec's base SHA, `5cd9d97e0aae3420eaf2ea3b6e85b4d4a06c588c`, is that commit's parent. The one commit in between (#958) changes notes figures and `notes/specs/trigonometry.json` only, and no question-bank file. So the findings below apply to the base SHA as well.

### §0c pre-flight (verbatim)
I saved the spec locally as `ops/.specs/BANK-AUDIT-1.md` and did **not** commit it. The saved copy keeps the §0 premise table verbatim and has the §0b, §0c, §2 and §3 headings with shortened bodies.

The first run used a copy that was missing the §0c heading, and failed on exactly that:
```
FAIL  ops/.specs/BANK-AUDIT-1.md  (4 premises)
  ✗ L0: missing a "§0c PRE-FLIGHT" section
```
The second run, with the §0c heading restored, passed:
```
$ node scripts/premise_ledger_check.mjs ops/.specs/BANK-AUDIT-1.md --worktree=. --strict-anchor
PASS  ops/.specs/BANK-AUDIT-1.md  (4 premises)
  ✓ ledger complete, evidence well-formed
  coverage: 3/3 claim rows had their anchor RESOLVED · 0 UNCHECKED · 1 UNVERIFIED (open by design)

premise-ledger: 1/1 specs passed (evidence resolved against .)
EXIT=0
```
P1 (`canonicalQuestionBank.ts:1027`), P2 (`syllabus2026-27.ts:123`) and P3 (`syllabus2026-27.ts:1513`) also resolve at the trunk tip.

### P4: what students are served (now answered)
I traced the served set through the code rather than inferring it from file names.

| Layer | Where it is built | Rows | How students reach it |
|---|---|---|---|
| **Bank** | `RAW_CANONICAL_QUESTION_BANK` (`canonicalQuestionBank.ts:527`, about 290 spread arrays) minus `WITHHELD_QUESTION_IDS` (`:1027`) gives `canonicalQuestionBank` (`:1816`). See the note below the table for how the rows load at runtime. | **8,052** served (8,748 raw − 696 withheld) | `PredictionCore`, which feeds Practice, Chapter Test, Full Mock, Worksheets and the tutor |
| **Predicted** | `predictedQuestions.ts` (Maths, 114) and `predictedQuestionsScience.ts` (Science, 95). `buildUnified` (`predictionCore.ts:200`) merges them into the bank with `dedupeById([...bank, ...predicted])`, then drops Science-deleted rows. | **209** | The same `PredictionCore` surfaces |
| **HPQ** | `highlyProbableQuestions` (`highlyProbableQuestions.ts:2708`): the seed list plus `hpqCompetencyAdditions` | **128**, in 26 buckets | The Highly Probable Questions page and the Exam Trends counts |
| **promptD packs** | `promptDPracticePacks` (`promptDPracticePacks.ts`) | **285**, including 19 synthetic `-D2` "drill variants" (`:2478`) | Practice fallback, **only when the engine returns 0 rows** for a topic (`practiceQuestionBuilder.ts:460-466`) |
| **Generated** | `generateUnifiedPracticeQuestions` (`questionGenerator.ts:396`), a set of template generators | Not countable: built per request | Practice top-up when the bank is short (`practiceQuestionBuilder.ts:563`) |

At runtime the bank rows load per chapter through `bankChapters/*.ts`. `defineChapter` drops withheld ids and resolves each `topicKey` to its chapter slug. `bankChapters.guard.test.ts` asserts these per-chapter rows equal the aggregator's.

**Audited universe: 8,674 rows** (8,052 bank + 209 predicted + 128 HPQ + 285 promptD). No id appears in more than one layer. The template generator is described here but was not audited row by row (see §6).

**Row schemas:**
- Bank and predicted rows use `CanonicalQuestion` (`predictionTypes.ts`): `id, subject, topicKey, subtopic, section, marks, format, difficulty, bloomSkill, questionText, options?, answer?, explanation?, solutionSteps?, finalAnswer?, requiresDiagram?, diagramDescription?, questionProvenance?, …`.
- HPQ rows use `question, assertion, reason, aROptions, correctOption` instead.
- promptD rows carry only `id, text, marks, difficulty, questionType`. **They have no answer of any kind.**

**Figures** come only from the id-keyed binder `getFiguresForQuestion` (`visualConceptRegistry.ts:360`), which binds 321 ids. `diagramDescription` is never shown to students.

**How I dumped the set:** `tsx` imported the real modules listed above, the same way `syllabusGuard.ts:1046 loadServedSources` does. Every id was then traced to its source `file:line`.

### Syllabus guard re-run (§2.4)
`scripts/src/syllabusGuard.ts` at the trunk tip exits 0:
```
Checking the SERVED set against lazytopper/src/config/syllabus2026-27.ts (bank 16104 · hpq 282 · predicted 418 · promptD 341 · notes 5415 · hub 788 · catalogue 160 · legacyHub 1451)...
  ✓ No OUT / FORMATIVE item is served on any surface.
Syllabus guard passed — all banks and surfaces are clean.
```
The guard matches **labels**. The out-of-syllabus and LIMIT rows listed below are out of syllabus in their **question text**, so they pass it.

## 2. Top 25 problems by student impact
Impact means how many students meet the row (core practice and mock surfaces, then HPQ, then fallbacks) times how badly the row misleads them. A wrong key teaches an error; a broken row only wastes time. Every item is backed by an id and file:line in the CSVs.

1. **Wrong numeric keys in Statistics** (24 wrong flags, 17 of them wrong-numeric). The keyed mean, median or mode does not follow from the data. `ST2-006` (lazytopper/src/data/questionBanks/class10/maths/statistics.pack2.ts:149) keys the median as 34, but the data give 36.25, and its own last step says 36.25. `ST2-021` (lazytopper/src/data/questionBanks/class10/maths/statistics.pack2.ts:444)'s data force a negative frequency. `STAT-H08` (lazytopper/src/data/questionBanks/class10/maths/statistics.pack1.ts:210) keys a median income of ₹13,900, but the data give about ₹11,951. Statistics is a guaranteed Section C/D topic.
2. **Pair of Linear Equations stems are inconsistent.** The stated answer does not satisfy the stated equations. In `PLE2-022` (lazytopper/src/data/questionBanks/class10/maths/pairOfLinearEquations.pack2.ts:591), x = 6, y = 2 fails 2x + 3y = 16 (the correct solution is 94/17, 28/17). `PLE2-013` (lazytopper/src/data/questionBanks/class10/maths/pairOfLinearEquations.pack2.ts:302) should be 270 km and 100 km. `2026-PLE-MCQ-01` (lazytopper/src/data/predictedQuestions.ts:115) has no correct option. The chapter has 14 wrong flags.
3. **Official NCERT Exemplar keys are mis-transcribed in Quadratic Equations.** In `QE-N-EXMPLR-4-MCQ-001` (lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.exemplar.ts:10), `QE-N-EXMPLR-4-MCQ-002` (lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.exemplar.ts:19) and `QE-N-EXMPLR-4-MCQ-005` (lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.exemplar.ts:46), the stored key is not the correct option; the CSV names the right one. Two authored rows are also wrong: `QE2-053` (lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.pack2.ts:1359) keys k = 1 instead of 3, and its explanation still contains "Wait:" scratch text; `QE2-023` (lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.pack2.ts:630) keys x = 0, 6 instead of x = 5 or 5/2. The chapter has 18 wrong flags.
4. **The lens formula is keyed as the mirror formula** in `LT2-014` (lazytopper/src/data/questionBanks/class10/science/light.pack2.ts:379) and `LT2-036` (lazytopper/src/data/questionBanks/class10/science/light.pack2.ts:1039). `LT2-001` (lazytopper/src/data/questionBanks/class10/science/light.pack2.ts:5) names the wrong law of reflection. Light is the largest Science chapter (717 rows) and has 16 wrong flags.
5. **Section-formula and mid-point keys are wrong.** `CG2-029` (lazytopper/src/data/questionBanks/class10/maths/coordinateGeometry.pack2.ts:642) inverts the 2:1 formula. `2026-CG-SA-02` (lazytopper/src/data/predictedQuestions.ts:404) gives the 2:1 point for a 1:2 question; the correct point is (4, 1). `CBE-M-CG-B-001` (lazytopper/src/data/questionBanks/class10/maths/coordinate-geometry.cbe.ts:62) keys the mid-point as (2.5, 5.5); it is (2.5, 4.5).
6. **HPQ solutions are spliced from other questions.** In `ple-hpq-103` (lazytopper/src/data/highlyProbableQuestions.ts:66), `stat-hpq-103` (lazytopper/src/data/highlyProbableQuestions.ts:532) and `prob-hpq-103` (lazytopper/src/data/highlyProbableQuestions.ts:677), the `solutionSteps` solve a different assertion–reason item. HPQ is the headline "most likely" surface. Two more HPQ keys are wrong: `math-ap-hpq-3` (lazytopper/src/data/highlyProbableQuestions.ts:2460) (S₃₀ = 1515, but `answer` says 1740) and `poly-comp-02` (lazytopper/src/data/hpqCompetencyAdditions.ts:67) (zeros are 2/3 and −5/2, keyed as 1/2 and −10/3).
7. **274 objective items are tagged 2 or 3 marks** (113 MCQ at 2 marks, 48 MCQ at 3, 49 A-R at 2, 45 A-R at 3). 265 of them are LazyTopper AI-pack rows, for example `TG3-013` (lazytopper/src/data/questionBanks/class10/maths/trigonometry.pack3.ts:349) and `EL2-006` (lazytopper/src/data/questionBanks/class10/science/electricity.pack2.ts:141). Section follows marks, so Full Mock and Worksheets put these 1-mark items in Section B or C and award 2–3 marks, which distorts every paper they land in.
8. **Two options carry the same value, so a correct answer can score 0** (52 multi-correct flags). Examples: 1/6 and 6/36 in `PR2-030` (lazytopper/src/data/questionBanks/class10/maths/probability.pack2.ts:845); 4√2 and √32 in `CG2-051`; equivalent identities in `TG3-058` (lazytopper/src/data/questionBanks/class10/maths/trigonometry.pack3.ts:1529); all four options correct in `CG2-025` (lazytopper/src/data/questionBanks/class10/maths/coordinateGeometry.pack2.ts:531). Objective grading accepts only one index, so the equivalent choice is marked wrong.
9. **Some assertion–reason items have no correct option.** A and R are both false, so none of the four standard options fits: `AR-TRI-006` (lazytopper/src/data/questionBanks/class10/maths/triangles.assertionReasoning.ts:176), `EL2-017` (lazytopper/src/data/questionBanks/class10/science/electricity.pack2.ts:450), `QE2-028` (lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.pack2.ts:781) and `PROB-N-EXEM-14-AR-001`.
10. **Trigonometry heights-and-distances keys are wrong.** `2026-TRIG-LA-05` (lazytopper/src/data/predictedQuestions.ts:507) keys 27.3 m instead of about 47.3 m. `2026-TRIG-APP-SA-07` keys 24.2 m instead of about 33.1 m. `TG3-039` (lazytopper/src/data/questionBanks/class10/maths/trigonometry.pack3.ts:1014) keys 2 instead of 5/2. `CBE-M-TRIG-A-002` (lazytopper/src/data/questionBanks/class10/maths/trigonometry.cbe.ts:42) keys 1/√3, but tan 90° is undefined.
11. **Surface Areas & Volumes numeric keys are wrong.** `SAV-M14` (lazytopper/src/data/questionBanks/class10/maths/surfaceAreasVolumes.pack1.ts:142) keys 283.5 cm² instead of 332.5 cm². `SAV2-044` (lazytopper/src/data/questionBanks/class10/maths/surfaceAreasVolumes.pack2.ts:480) has no correct option. `CBE-M-SAV-C-002` treats two hemispheres as one, and `2026-SAV-CASE-05` uses a full sphere where a hemisphere is needed.
12. **Electricity numeric keys are wrong.** In `EL2-021` (lazytopper/src/data/questionBanks/class10/science/electricity.pack2.ts:572), the parallel case gives 6 A and 36 W, keyed as 5.5 A and 33 W. In `EL2-022` (lazytopper/src/data/questionBanks/class10/science/electricity.pack2.ts:603), the 24-hour energy is 20.88 kWh, keyed as 6.96 kWh.
13. **Some Science keys are factually wrong.** `MNM2-002` (lazytopper/src/data/questionBanks/class10/science/metalsNonMetals.pack2.ts:35): being cut with a knife shows softness, not malleability. `MNM2-038` (lazytopper/src/data/questionBanks/class10/science/metalsNonMetals.pack2.ts:1057): copper is less reactive than carbon, not more. `REP2-043` (lazytopper/src/data/questionBanks/class10/science/reproduction.pack2.ts:1256): the key should be (d). `HEC2-043` (lazytopper/src/data/questionBanks/class10/science/humanEyeAndColourfulWorld.pack2.ts:1228): the Reason is false, so the key should be (c).
14. **45 Trigonometry rows tagged MCQ have no options** (in `trigonometry.pack1.ts`, for example `2026-TRIG-P1-A-001` (lazytopper/src/data/questionBanks/class10/maths/trigonometry.pack1.ts:219)). They are open-recall prompts and cannot be graded as objective items. 21 A-R rows in `triangles.pack1.ts` and `predictedQuestions.ts` also lack an `options` array.
15. **None of the 285 promptD rows has an answer key or marking scheme.** Their schema is only `id, text, marks, difficulty, questionType` (for example `S-MNM-1` (lazytopper/src/data/promptDPracticePacks.ts:263)). When Practice falls back to a pack, the student gets questions that cannot be checked deterministically.
16. **19 fake "drill variants"** (`promptDPracticePacks.ts:2478`). Each Trigonometry pack question is copied with a `-D2` id and " (Drill variant)" appended to an otherwise identical stem. That presents padding as new content and conflicts with the no-fake-data doctrine.
17. **60 rows depend on a figure that is not bound.** The stem says "in the given figure" or the row has `requiresDiagram: true`, but `getFiguresForQuestion` returns nothing. Examples: `PYQ-M-TRI-003`, `PYQ-M-CIRC-007`, `ELEC-NCERT-11-LA-007` and `LIGHT-EXMPLR-9-MCQ-014` (whose options are just A/B/C/D). The solver agents flagged 525 further rows as broken, mostly the same problem; see `broken-rows.csv`.
18. **FORMATIVE-only content is still served.** `CBE-S-MAGN-B-005` (lazytopper/src/data/questionBanks/class10/science/magnetic-effects-of-electric-current.cbe.ts:186) and `CBE-S-MAGN-D-001` (lazytopper/src/data/questionBanks/class10/science/magnetic-effects-of-electric-current.cbe.ts:228) are about the electric motor, which ruling R7 makes formative-only. The solvers raised 7 more syllabus flags in Magnetic Effects and 10 in Human Eye (colour of the Sun at sunrise/sunset, Fraunhofer lines and similar).
19. **LIMIT breaches that the label guard cannot see.** `PB-M-2-TRIG-C-001` (lazytopper/src/data/questionBanks/class10/maths/trigonometry.preboard.ts:81) uses three right triangles from one observation post. `APQ-M-ARC-002` (lazytopper/src/data/questionBanks/class10/maths/areas-related-to-circles.additionalPQ.ts:20) is a circle minus an inscribed pentagon, a combination of plane figures. `TRI-N-NCERT-6-CB-002` is built on NCERT Ex 6.5, the deleted Pythagoras section. In total, 94 rows have syllabus or LIMIT flags, 21 of them LIMIT.
20. **Leftover page headers and source text in stems.** `PYQ-S-ENV-006` (lazytopper/src/data/questionBanks/class10/science/our-environment.pyq.ts:46) ends with "3 SECTION – D (Long Answer Questions)"; `PYQ-M-RN-008`, `PYQ-M-POLY-006`, `PYQ-S-EYE-003` and `PYQ-S-CHEM-014` have the same problem. 35 `BX-REP-E1-*` case stems contain a stray "Answer:". 6 Science stems keep source tags like "[CBSE 2016]". 9 rows contain the Wingdings glyph `\uf09f`, for example `PYQ-S-CTRL-007/008`, `PYQ-S-REPR-006` and `PYQ-S-LIGHT-004`.
21. **The same question is filed under two chapters.** `CBE-S-CHEM-C-003` (lazytopper/src/data/questionBanks/class10/science/chemical-reactions-and-equations.cbe.ts:403) is identical to `CBE-S-CARB-C-003` (ethanoic acid with sodium) and sits in both Chemical Reactions and Carbon. The solvers raised 53 other-chapter flags in all; for example, 6 rows on the path of light through a prism are in Light but belong in Human Eye.
22. **Some chapter keys are not board keys.** 10 promptD rows use `metals_nonmetals` (resolves to `metals-nonmetals`) and 9 use `heredity_evolution` (resolves to `heredity-evolution`). HPQ row `sci-eye-comp-01` (lazytopper/src/data/hpqCompetencyAdditions.ts:525) resolves to `the-human-eye-and-the-colourful-world`. None of these is among the 26 `BOARD_CHAPTER_KEYS`, so any lookup by board slug misses them. Whether students actually lose these rows is uncertain, because promptD packs are looked up by pack key.
23. **1962 of the 8,261 bank and predicted rows carry a label that does not map to the chapter's Exam Trends concepts.** Some labels are generic ("Chapter Practice", "(none)"); others name a concept the list does not have. The lists are too coarse: Human Eye has no dispersion/scattering concept, Magnetic Effects has only one concept, and Triangles has no right-triangle concept.
24. **Case-based (CBQ) coverage is thin.** Magnetic Effects serves only 4 CBQs, below the target of 8. Human Eye has 8, Circles 9, Carbon 12, Control & Coordination 12, Areas Related to Circles 13, and Light only 15 despite having 717 rows.
25. **14 concept × mark × format cells have zero served questions**, and 137 more have fewer than 10. Examples of empty cells: Circles · Number/Type of Tangents at 1-mark A-R, 3-mark short and 5-mark long; Human Eye · Atmospheric Refraction at 1-mark A-R, 2-mark short and 4-mark case. See §4 and `gaps.csv`.

## 3. Counts per category per chapter
Counts are distinct row ids flagged per category. The categories overlap: one row can be both wrong and mis-tagged.

- **wrong:** wrong key, more than one correct option, wrong numeric answer, written error or spliced solution (`wrong-answers.csv`, all confidence levels).
- **broken:** scripted structural checks plus solver flags (`broken-rows.csv`; includes the 285 promptD rows that have no key).
- **tagging:** tagging flags, excluding the label-mapping rows.
- **syllabus:** OUT, FORMATIVE or LIMIT flags.
- **dups:** duplicate pairs whose first row is in that chapter.

| Chapter | wrong | broken | tagging | syllabus | dups |
|---|---:|---:|---:|---:|---:|
| acids-bases-and-salts | 4 | 31 | 31 | 3 | 1 |
| areas-related-to-circles | 4 | 38 | 19 | 4 | 1 |
| arithmetic-progression | 8 | 25 | 29 | 0 | 2 |
| carbon-and-its-compounds | 5 | 31 | 23 | 4 | 5 |
| chemical-reactions-and-equations | 4 | 30 | 14 | 0 | 5 |
| circles | 9 | 43 | 18 | 3 | 16 |
| control-and-coordination | 2 | 33 | 16 | 3 | 3 |
| coordinate-geometry | 9 | 30 | 7 | 1 | 5 |
| electricity | 8 | 44 | 15 | 0 | 0 |
| heredity | 2 | 25 | 14 | 8 | 0 |
| how-do-organisms-reproduce | 3 | 58 | 18 | 0 | 2 |
| human-eye-and-colourful-world | 8 | 27 | 17 | 10 | 0 |
| life-processes | 8 | 41 | 46 | 0 | 0 |
| light-reflection-and-refraction | 16 | 63 | 30 | 2 | 2 |
| magnetic-effects-of-electric-current | 9 | 32 | 3 | 10 | 0 |
| metals-and-non-metals | 9 | 23 | 31 | 1 | 1 |
| our-environment | 4 | 36 | 2 | 7 | 0 |
| pair-of-linear-equations | 14 | 22 | 6 | 1 | 1 |
| polynomials | 12 | 39 | 11 | 6 | 0 |
| probability | 7 | 29 | 18 | 3 | 2 |
| quadratic-equations | 18 | 26 | 23 | 9 | 4 |
| real-numbers | 3 | 21 | 1 | 4 | 14 |
| statistics | 24 | 29 | 6 | 1 | 1 |
| surface-areas-and-volumes | 12 | 27 | 4 | 7 | 2 |
| triangles | 5 | 37 | 13 | 2 | 0 |
| trigonometry | 17 | 118 | 56 | 5 | 51 |
| **Total** | **224** | **958** | **471** | **94** | **118** |

- **Wrong-answer flags by type:** wrong-numeric 70, wrong-answer 54, multi-correct 52, written-error 45, spliced-solution 3.
- **By confidence:** high 118, medium 80, uncertain 26.
- **By origin:** LT-authored 157, official 45, transcribed-third-party 22.

**Duplicates** (`duplicates.csv`): 118 pairs, of which exact 66, near 52. *Exact* means the normalised stem and the options are identical. *Near* means word 3-shingle Jaccard similarity of at least 0.80 within a chapter. 47 pairs are promptD rows, including the 19 synthetic `-D2` copies. Generic stems with different options, such as "Which of the following is true?", were excluded.

**Tagging flags** (`tagging.csv`): tagging 373, format-marks-mismatch 274, syllabus 78, other-chapter 53, limit 21, non-board-chapter 20, format-mismatch 10. The file also has 2172 concept-label mapping rows.

## 4. Gap table summary: the 30 thinnest cells
Cells count the 8,261 served bank and predicted rows by subject, chapter, canonical concept, mark value and format. Canonical concepts are the Exam Trends lists (`class10MathTopicTrends.conceptWeightage` and `class10ScienceTopicTrends.concepts`). Rows are assigned to concepts by the solver agents' label-to-concept mapping, and marks are as served. Formats are MCQ, AR, SHORT, LONG and CASE.

Rows whose label could not be mapped are counted in an `UNMAPPED` row and not flagged. A concept cell is flagged below 10, a chapter's CBQ total below 8, and any concept with no rows at all. The full 680-row table is in `gaps.csv`; it also has a keyword-based coverage check of every 2026-27 IN item.

| # | Chapter | Concept | Marks | Format | Served | Flag |
|---|---|---|---:|---|---:|---|
| 1 | real-numbers | Irrationality Proofs | 4 | CASE | 0 | ZERO |
| 2 | pair-of-linear-equations | Word & Application Problems | 1 | AR | 0 | ZERO |
| 3 | quadratic-equations | Word/Application Problems | 1 | AR | 0 | ZERO |
| 4 | circles | Number/Type of Tangents | 1 | AR | 0 | ZERO |
| 5 | circles | Number/Type of Tangents | 3 | SHORT | 0 | ZERO |
| 6 | circles | Number/Type of Tangents | 5 | LONG | 0 | ZERO |
| 7 | areas-related-to-circles | Composite Figures | 1 | AR | 0 | ZERO |
| 8 | acids-bases-and-salts | Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris) | 1 | AR | 0 | ZERO |
| 9 | carbon-and-its-compounds | Homologous Series & Nomenclature | 4 | CASE | 0 | ZERO |
| 10 | light-reflection-and-refraction | Refraction through Glass Slab / Prism | 1 | AR | 0 | ZERO |
| 11 | human-eye-and-colourful-world | Atmospheric Refraction Phenomena | 1 | AR | 0 | ZERO |
| 12 | human-eye-and-colourful-world | Atmospheric Refraction Phenomena | 2 | SHORT | 0 | ZERO |
| 13 | human-eye-and-colourful-world | Atmospheric Refraction Phenomena | 4 | CASE | 0 | ZERO |
| 14 | magnetic-effects-of-electric-current | Right-hand Rules & Field Lines | 4 | CASE | 0 | ZERO |
| 15 | polynomials | Zeros & Factorisation | 5 | LONG | 1 | <10 |
| 16 | polynomials | Graph & Type of Polynomial | 2 | SHORT | 1 | <10 |
| 17 | quadratic-equations | Word/Application Problems | 1 | MCQ | 1 | <10 |
| 18 | arithmetic-progression | Application Problems | 1 | AR | 1 | <10 |
| 19 | trigonometry | Trig Identities/Proofs | 4 | CASE | 1 | <10 |
| 20 | circles | Tangent Theorems & Proofs | 4 | CASE | 1 | <10 |
| 21 | circles | Number/Type of Tangents | 4 | CASE | 1 | <10 |
| 22 | statistics | Mode of Grouped Data | 4 | CASE | 1 | <10 |
| 23 | heredity | Sex Determination | 1 | AR | 1 | <10 |
| 24 | heredity | Sex Determination | 4 | CASE | 1 | <10 |
| 25 | light-reflection-and-refraction | Refraction through Glass Slab / Prism | 5 | LONG | 1 | <10 |
| 26 | light-reflection-and-refraction | Refraction through Glass Slab / Prism | 4 | CASE | 1 | <10 |
| 27 | human-eye-and-colourful-world | Atmospheric Refraction Phenomena | 1 | MCQ | 1 | <10 |
| 28 | human-eye-and-colourful-world | Atmospheric Refraction Phenomena | 5 | LONG | 1 | <10 |
| 29 | polynomials | Graph & Type of Polynomial | 1 | AR | 2 | <10 |
| 30 | polynomials | Graph & Type of Polynomial | 3 | SHORT | 2 | <10 |

**Totals:** 14 concept cells have zero rows and 137 have fewer than 10. One chapter has fewer than 8 CBQs (Magnetic Effects, with 4).

**IN items** (keyword coverage, heuristic): no 2026-27 IN item has zero rows. These have fewer than 10:

- real-numbers · irrationality √prime (√7, √11): 3
- polynomials · form quadratic from sum/product: 8
- triangles · BPT proof: 4
- triangles · converse of BPT: 2
- circles · number of tangents: 9
- trigonometry · values at 0/90: 9
- areas-related-to-circles · vertex-sectors in triangle/square: 7
- areas-related-to-circles · ring / annulus: 8
- carbon-and-its-compounds · versatile nature (catenation/tetravalency): 4
- life-processes · excretion in plants: 9
- human-eye-and-colourful-world · presbyopia: 5

## 5. Proposed fix plan for BANK-EXPAND-1
The rule applied: **official and transcribed rows are never edited, only withheld; LazyTopper-authored rows are fixed in place.**

A row's origin is set by the file it comes from:
- **LazyTopper-authored:** AI `.pack*` and `scarce*` files, `expand.caseE*`, `expand.longD`, `expand.proof`, `proof`, `caseBased`, `assertionReasoning`, curated inline rows, and the predicted, HPQ and promptD layers.
- **Official:** `ncert`, `exemplar*`, `pyq*`, `sp`, `sqp`, `cbe`, `cfpq*` and `additionalPQ` files.
- **Transcribed third-party** (handled like official): `chapterwise`, `fnd`, `gdr`, `extract*`, `expand.extract`, `z3` and `preboard` files.

### 5a. Rows to fix (LazyTopper-authored): 248 ids
These are the authored rows with a high- or medium-confidence wrong-answer flag, a high-severity broken flag, or a definite syllabus flag. Each is listed in `wrong-answers.csv`, `broken-rows.csv` or `tagging.csv`; wrong answers come with the correct answer.

Also fix:
- **265 authored objective rows tagged 2–3 marks:** set them to `marks: 1, section: "A"`. They are in `tagging.csv` under category `format-marks-mismatch`.
- **45 option-less Trigonometry "MCQ" rows:** add four options, or change the format to VSA.
- **21 option-less A-R rows:** add the four standard options.
- **285 promptD rows:** add `answer` and `solutionSteps`, or retire the promptD fallback.
- **19 `-D2` drill copies** (`promptDPracticePacks.ts:2478`): delete them.
- **Non-board keys:** re-key `metals_nonmetals`, `heredity_evolution` and the HPQ "The Human Eye & the Colourful World" bucket.

### 5b. Rows to withhold (official or transcribed): 456 candidate ids
These are the non-authored rows with a high- or medium-confidence wrong flag, a high-severity broken flag, or a definite syllabus or LIMIT flag. Broken flags here are mostly a missing figure, a lost option set, garbling or a leftover header. **The owner must confirm each id before it is added to `WITHHELD_QUESTION_IDS`.**

Start with the ones that are certain:
- `QE-N-EXMPLR-4-MCQ-001/002/005`, `CBE-M-CG-B-001`, `CBE-M-TRIG-A-002`: wrong keys.
- `CBE-S-MAGN-B-005`, `CBE-S-MAGN-D-001`: formative-only content.
- `PB-M-2-TRIG-C-001`, `APQ-M-ARC-002`, `TRI-N-NCERT-6-CB-002`, `CIRC-N-EXEM-10-CRE-001`: syllabus or LIMIT breaches.
- `PYQ-S-ENV-006`, `PYQ-M-RN-008`, `PYQ-M-POLY-006`, `PYQ-S-EYE-003`, `PYQ-S-CHEM-014`: leftover section headers.
- The 9 rows containing `\uf09f`, and `REPR-EXMPLR-7-MCQ-018` (duplicate option).
- The 47 official or transcribed rows that need a missing figure.

For a question filed in two chapters, withhold the copy in the wrong chapter: keep `CBE-S-CARB-C-003` and withhold `CBE-S-CHEM-C-003`.

### 5c. Concept-label mapping
All 2172 distinct labels have a proposed mapping in `tagging.csv` (category `concept-label-mapping`). Each row gives the label, how many rows use it, and the proposed concept, or one of `UNMAPPABLE: <reason or proposed new concept>`, `OUT:` or `OTHER-CHAPTER:`.

The solver agents proposed these new concepts, because many in-syllabus rows have no concept to map to:
- **acids-bases-and-salts:** "Chemical Properties of Acids & Bases" (96 rows); "Acids & Bases in Water (H⁺/H₃O⁺, OH⁻, conductivity, dilution)" (27 rows); "Acids & Bases: Sources, Types & Everyday Examples" (14 rows)
- **areas-related-to-circles:** "Circumference and Area of a Circle" (31 rows)
- **arithmetic-progression:** "Recognising an AP" (12 rows)
- **carbon-and-its-compounds:** "Covalent Bonding & Versatility of Carbon" (46 rows); "Chemical Properties of Carbon Compounds (combustion, oxidation, addition, substitution)" (42 rows); "Soaps & Detergents (Micelles)" (28 rows); "Saturated & Unsaturated Hydrocarbons" (18 rows)
- **control-and-coordination:** "Hormones in Animals (Endocrine System)" (68 rows)
- **coordinate-geometry:** "Point on a Given Line" (1 rows)
- **electricity:** "Resistance & Resistivity" (41 rows); "Electric Current, Charge & Potential Difference" (15 rows)
- **how-do-organisms-reproduce:** "DNA Copying, Variation & Importance of Reproduction" (29 rows)
- **human-eye-and-colourful-world:** "Prism, Dispersion & Scattering of Light" (65 rows)
- **life-processes:** "Transportation & Excretion in Plants" (22 rows)
- **our-environment:** "Ecosystem & Its Components" (43 rows)
- **quadratic-equations:** "Standard Form & Forming Quadratic Equations" (7 rows)
- **statistics:** "Mean, Median & Mode — Combined Applications" (12 rows); "Empirical Relation (Mean–Median–Mode)" (7 rows); "Mean of Ungrouped Data" (1 rows)
- **surface-areas-and-volumes:** "Volume Transfer & Flow" (9 rows); "Cube/Cuboid Volume & Capacity" (4 rows)
- **triangles:** "Right-Triangle Lengths (a²+b²=c² as a tool)" (61 rows); "Theorem recognition (BPT vs criteria)" (14 rows); "Proof presentation & step marking" (3 rows)

Generic labels such as "Chapter Practice — X", "General" and "(none)" cannot be mapped. Those rows have to be tagged one by one.

### 5d. Generation targets per cell
The target is at least 10 rows in every flagged concept cell and at least 8 CBQs in every chapter. That needs **851 new questions** across 151 concept cells, plus 4 CBQs for Magnetic Effects.

Per chapter: circles 85; human-eye-and-colourful-world 66; quadratic-equations 58; carbon-and-its-compounds 52; polynomials 51; light-reflection-and-refraction 48; statistics 46; control-and-coordination 41; arithmetic-progression 39; heredity 38; pair-of-linear-equations 34; trigonometry 34; metals-and-non-metals 34; chemical-reactions-and-equations 32; areas-related-to-circles 31; surface-areas-and-volumes 23; magnetic-effects-of-electric-current 20; real-numbers 19; probability 19; acids-bases-and-salts 16; electricity 16; triangles 14; coordinate-geometry 13; our-environment 13; how-do-organisms-reproduce 9.

Caveats:
1. Recount after the 5a re-tag. The 274 mis-marked objective rows currently inflate the 2- and 3-mark SHORT cells and deflate the 1-mark MCQ and AR cells.
2. Recount after the 5c mapping. Rows now counted as UNMAPPED may already fill some flagged cells.
3. Use authentic CBSE sources before authoring new rows. Author only on a named template row, with `questionProvenance: "authored"` and `shapedFrom` set.

## 6. Facts not established
- **The template generator was not audited row by row.** `questionGenerator.ts` and `scienceQuestionGenerator.ts` build questions per request, so their output may contain the same kinds of defect.
- **Rendering of rows with no options was not run live.** I did not check whether the practice card shows an input box or breaks for an MCQ or A-R row with no `options`. The impact stated above is inferred from the schema.
- **Whether rows under non-board keys are hidden from students is uncertain** (see Top-25 item 21).
- **Official keys were checked by solving, not against the printed sources**, which this session could not see. Where a solver disagrees with an official key, the CSV says so and gives a confidence. The 26 wrong-answer flags marked "uncertain" need a human to check them.
- **Figure-missing detection is partial.** The script uses a phrase regex plus `requiresDiagram`, which misses implicit figure dependence such as options "A/B/C/D" that refer to a picture. The solvers caught many of those separately. Some of their 525 "broken (solver)" flags are judgement calls; see the `severity_or_confidence` column (medium or uncertain).
- **Concept mapping is per label, not per row.** A row with the wrong label inside its chapter is still counted under the wrong concept. The IN-item coverage counts are keyword heuristics.
- **The Exam Trends page does not show a concept list today.** `ExamTrendsRanked.tsx` shows per-chapter tiers and HPQ counts. The concept lists used here come from the trends data (`class10MathTopicTrends` and `class10ScienceTopicTrends`), which is what the spec most plausibly meant.
- **ARC2-035**, the spec's example defect, is already withheld at trunk (`canonicalQuestionBank.ts:1781`, ruling R3). It is not in the served set and is not re-flagged.

## 7. Effort and how the sample was drawn
- **All 8,674 served rows** went through the scripted checks: structure, tagging, syllabus text, LIMITs, duplicates and gaps.
- **Every MCQ and A-R row with options was solved** (3,082 rows).
- **Every written row with a computable numeric answer was recomputed** (2,356 rows, with Python for the arithmetic).
- **Every HPQ row (128) and every objective row without options (66) was solved.**
- **Who did the solving:** 28 parallel solver sub-agents, one per chapter (Light split in two), plus one for the HPQ and option-less rows. They solved from their own reasoning; no AI-provider call was made from the app's code. I re-checked a sample of the high-confidence flags by hand, for example TG3-039 = 5/2, QE2-053 k = 3 and PLE2-022 17x = 94; all of them reproduced.
- **Written-answer sample:** 15 rows per chapter, 390 in total. The sample is stratified by mark value: a seeded round-robin (`random.seed(20261006)`) over each chapter's 1-, 2-, 3-, 4- and 5-mark written bank rows.
- **Cost:** about 3.6 M sub-agent tokens over about 45 minutes of wall-clock time.

## Files in this PR
All are in `ops/reports/bank-audit-1/`:
- `REPORT.md`: this file.
- `wrong-answers.csv`
- `broken-rows.csv`
- `tagging.csv`: tagging, other-chapter, syllabus and LIMIT flags, plus the concept-label mapping.
- `duplicates.csv`
- `gaps.csv`
