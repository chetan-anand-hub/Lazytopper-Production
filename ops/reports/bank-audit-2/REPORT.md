# BANK-AUDIT-2 — re-audit of the served bank (report only, do not merge)

Base: `base/approved-thru-437` @ `b50577836337f36466c95e1a93571558dd4769ef` (re-derived with `git ls-remote`; the tip did not move).
Compared against BANK-AUDIT-1 ([chetan-anand-hub/Lazytopper-Production#960](https://github.com/chetan-anand-hub/Lazytopper-Production/pull/960)), audited at SHA `613d8996f54137728d8e8c9f95042ffddc63baab`.

## §0c.0 Premise gate

```
$ node scripts/premise_ledger_check.mjs ops/.specs/BANK-AUDIT-2.md --worktree=. --strict-anchor
PASS  ops/.specs/BANK-AUDIT-2.md  (9 premises)
  ✓ ledger complete, evidence well-formed
  coverage: 7/7 claim rows had their anchor RESOLVED · 0 UNCHECKED · 2 UNVERIFIED (open by design)

premise-ledger: 1/1 specs passed (evidence resolved against .)
EXIT=0
```

## P8 — runtime counts (tsx import, not a text scan)

Command (script kept in the session scratchpad, not committed): `scripts/node_modules/.bin/tsx dump.mts <root> <out.json>`. It imports
`data/canonicalQuestionBank.ts` (`canonicalQuestionBank`, `RAW_CANONICAL_QUESTION_BANK`, `WITHHELD_QUESTION_IDS`),
`data/predictedQuestions.ts` + `data/predictedQuestionsScience.ts`, `data/highlyProbableQuestions.ts` (`highlyProbableQuestions`, the merged export),
`data/visualConceptRegistry.ts` (`getFiguresForQuestion`), `lib/desktop/topics.ts` and `data/bankFix/bankFix1Ledger.ts`.

```
tip  b5057783: {"raw":11491,"withheld":899,"served":10592,"servedNoSteps":0,"predicted":209,"predictedOnly":209,"predictedOnlyNoSteps":0,"hpqBuckets":26,"hpq":127,"hpqNoSteps":19}
old  613d8996: {"raw":8748,"withheld":696,"served":8052,"servedNoSteps":0,"predicted":209,"predictedOnly":209,"predictedOnlyNoSteps":0,"hpqBuckets":26,"hpq":128,"hpqNoSteps":44}
```

- **Served bank: 10,592** (11,491 raw − 899 withheld), all with `solutionSteps`. **Matches the P8 claim.**
- **Predicted: 209**, all predicted-only (no id also in the bank), 0 without steps.
- **HPQ: 127 questions in 26 buckets, 19 without steps.** **The P8 claim of "176 HPQ questions" does not reproduce**: the served export `highlyProbableQuestions` (`highlyProbableQuestions.ts:2705`) holds 127 unique ids (seed 49 + `hpqCompetencyAdditions` 43 + the inline `hpqAdditions`). The "19 without steps" part does reproduce.
- The old-SHA dump reproduces BANK-AUDIT-1's own figures (8,052 / 209 / 128), so the method matches BANK-AUDIT-1 §1.

## P9 — rows added after `613d8996`

`git fetch origin 613d8996…`, a detached worktree at that SHA, the same dump, then served ids (bank + predicted + HPQ) present now and absent then:
**2,725 new bank/predicted ids, 0 new HPQ ids.** (This includes rows that were withheld at `613d8996` and are served again now, e.g. BANK-FIX-3 restores.) Per chapter:

| chapter | new | chapter | new | chapter | new |
|---|---|---|---|---|---|
| acids-bases-and-salts | 86 | heredity | 99 | pair-of-linear-equations | 103 |
| areas-related-to-circles | 102 | how-do-organisms-reproduce | 106 | polynomials | 104 |
| arithmetic-progression | 112 | human-eye-and-colourful-world | 100 | probability | 113 |
| carbon-and-its-compounds | 85 | life-processes | 95 | quadratic-equations | 106 |
| chemical-reactions-and-equations | 109 | light-reflection-and-refraction | 102 | real-numbers | 113 |
| circles | 116 | magnetic-effects-of-electric-current | 128 | statistics | 109 |
| control-and-coordination | 105 | metals-and-non-metals | 95 | surface-areas-and-volumes | 104 |
| coordinate-geometry | 105 | our-environment | 114 | triangles | 116 |
| electricity | 95 | | | trigonometry | 103 |

These ids are excluded from Phase C. Phase A still checks them (it is cheap); their flags carry `added_after_audit1=yes`.

## Phase A — scripted checks on every served row

Universe: **10,928 rows** (10,592 bank + 209 predicted + 127 HPQ). `structure.csv` = 2,046 flag rows; `duplicates.csv` = 64 pairs (counts are CSV data rows, header excluded).

| check | surface | severity | rows |
|---|---|---|---|
| 1-mark row not a 4-option MCQ / A-R | hpq | high | 23 (HPQ `MCQ` rows stored with **no options at all**, e.g. `ple-hpq-101`) |
| MCQ/A-R key not one of its options | all | — | **0** |
| two options with the same value (case-sensitive; genotypes like `TT`/`tt` are distinct) | all | — | **0** |
| empty option | all | — | **0** |
| `[N mark]` prefixes not summing to `marks` | bank | medium | 20 |
| written row with no `[N mark]` prefixes at all | bank | low | 1,472 |
| no `finalAnswer` | bank / hpq | medium / low | 269 / 24 (246 of the bank rows are `SCQ-*`) |
| stem says figure/diagram (or `requiresDiagram`) but no figure bound by `getFiguresForQuestion` | bank / hpq | high (regex hit) / medium | 26 / 1 |
| page headers / source text in stem or options | bank | medium | 2 (`CI2-020` "PTO", `LTG-M-TRI-280` "Set 1" — both need eyes) |
| `topicKey` not a `topics.ts` slug | predicted | low | 209 (the predicted layer uses display names by design; matched at runtime by `topicMatches`, `predictionCore.ts:285`) |
| `topicKey` not a slug | bank | — | **0** |
| duplicates: exact same-chapter / exact cross-chapter / near (Jaccard ≥ 0.85 cross-chapter, ≥ 0.95 same-chapter) | all | — | 53 / 2 / 9 |

The 2 "cross-chapter exact" pairs are a generic stem ("Which of the following statements is true?") with different options: not real duplicates.

**Syllabus guard re-run (read live from `scripts/src/syllabusGuard.ts`; `pnpm run syllabusGuard`, exit 0):**
```
Checking the SERVED set against lazytopper/src/config/syllabus2026-27.ts (bank 21184 · hpq 280 · predicted 418 · promptD 318 · notes 5415 · hub 788 · catalogue 160 · legacyHub 1451)...
  ✓ No OUT / FORMATIVE item is served on any surface.
Checking every SERVED row's text, options and solutions (GUARD-3: 10928 rows, 29 finding(s); baseline 0, reviewed 29)...
  ✓ No finding outside the baseline / reviewed lists, and no stale entry.
Syllabus guard passed — all banks and surfaces are clean.
```
A second pass matched the guard's banned sub-topic list (copied from its live output) against every stem as whole words, skipping single generic words (Fossil, Darwin, Evolution, Biogas, Solar Energy, Constructions, Division Algorithm): **0 hits.**

## Phase B — the 55 open findings of BANK-AUDIT-1 (`audit1-followup.csv`, 55 data rows)

Status at the tip (runtime import): **all 55 are still served; none is withheld; none is in the BANK-FIX-1 ledger** (`BANK_FIX_1_PR1` + `BANK_FIX_1_PR2`); **42 of 55 now have a figure bound** by `getFiguresForQuestion`.
Two Opus solver sub-agents (medium effort) re-solved each row as stored now:

| verdict | rows |
|---|---|
| now-fine (old finding no longer applies; row correct) | **50** |
| new-problem (old finding fixed, something else wrong) | **4** — `SQP-S-2023-CTRL-B-001` (½-marks unevenly split across brain parts), `PYQ-S-2026-ELEC-011` and `PYQ-S-2026-ELEC-012` (OR alternatives' step marks do not each total 5), `FND-L-QB-098` (low confidence: the step's justification may not match the bound figure) |
| still-broken | **1** — `SCO-S-CTRL-011`: stem says "given diagram … labelled", no figure bound, unanswerable text-only; steps garbled → **withhold or bind the figure** |

Most of the "fixed" rows were fixed by the DIAGRAMS / step-mark lanes after BANK-AUDIT-1 (figures bound, `[N mark]` sums corrected); the CSV records each one.

## Phase C — solve-check (complete)

- **C1:** all 336 predicted + HPQ rows (10 batches). **C2:** 500 written bank rows (17 batches), stratified round-robin over 104 chapter × marks (2/3/4/5) cells, `random.seed(20261010)`, from a pool of 4,400 rows: served, marks ≥ 2, not MCQ/A-R, **not added after `613d8996` (P9)**, not one of the 55 Phase B ids, and not an id in BANK-AUDIT-1's `wrong-answers.csv` / `broken-rows.csv`. Marks mix: 127 × 2, 126 × 3, 121 × 4, 126 × 5.
- **BANK-AUDIT-1's 390 sampled ids could not be excluded exactly:** BANK-AUDIT-1 published its seed and method (`random.seed(20261006)` round-robin) but not the id list or the script, and its CSVs only hold the rows it flagged. The ids it flagged are excluded; a sampled row that passed in BANK-AUDIT-1 may have been re-solved here. Stated as a fact not established (§7).
- Solved: **836 rows** (C1 336 + C2 500); verdicts `pass` 677 / `flag` 159 (C1 266/70, C2 411/89). Coverage check: 500 of 500 C2 ids returned, 0 duplicate ids.
- `wrong-answers.csv` = **36 rows** with `wrong-key` (24 high, 12 medium confidence). `broken-rows.csv` = **123 rows** flagged otherwise. Flag totals over both files: wrong-steps 125, wrong-key 36, ambiguous-stem 20, off-syllabus 4, needs-figure 3.
- **Running total of rows solved: 55 (B) + 836 (C) = 891 of the 1,100 cap.**

## Phase D — independent verifier (`verifier.csv`, 44 rows)

One separate Opus sub-agent (medium effort) that solved nothing in Phase B/C re-solved, blind and shuffled, **every high-confidence `wrong-key` flag (24)** plus **20 random C passes** (`random.seed(20261010)`).

- **Flags: 22 / 24 confirmed outright.** 1 more is upheld by script after the verifier got it wrong: `2026-AP-SA-02` — the verifier said "n = 10", but S₉ = 153 and S₁₀ = 185, so no n gives 155 (D = 3,769 is not a perfect square). The solver was right, so the count is **23 / 24 confirmed**. 1 is partial: `SAV-M06`, where 868.9 kg holds only with π = 22/7, which the stem does not state. It is downgraded to a step/π-consistency problem and left out of the fix-key list.
- **Passes: 20 / 20 agreed** (0 missed errors in the pass sample).
- **No false wrong-key flag** was found among the high-confidence flags. The 12 medium-confidence wrong-key flags were **not** verified (outside the D sample).

## Phase table

| phase | rows checked | flags by type | rows solved (running / cap 1,100) |
|---|---|---|---|
| A — scripted | 10,928 (all served) | 2,046 structure rows (details above) + 64 duplicate pairs; syllabus guard exit 0 | 0 / 1,100 |
| B — #960 open findings | 55 | now-fine 50 · new-problem 4 · still-broken 1 | 55 / 1,100 |
| C1 — predicted + HPQ | 336 | pass 266 · flag 70 (wrong-key 13) | 391 / 1,100 |
| C2 — written bank sample | 500 | pass 411 · flag 89 (wrong-key 23) | 891 / 1,100 |
| D — verifier (re-solve) | 44 | 23/24 flags upheld (22 by the verifier, 1 by script); 20/20 passes agreed | 891 solved + 44 re-solved = 935 solve calls |

Combined C flag types (`wrong-answers.csv` + `broken-rows.csv`): wrong-steps 125 · wrong-key 36 · ambiguous-stem 20 · off-syllabus 4 · needs-figure 3.

## Top 25 problems by student impact

Ordering: bank and predicted rows first (Practice, Chapter Test, Full Mock and Worksheets read the merged bank + predicted pool, `predictionCore.ts:224`; the worksheet answer key prints the stored steps + `finalAnswer`, `WorksheetPrintDoc.tsx:211-212`), then HPQ. Within each group, a wrong key that teaches a wrong result ranks above a garbled or truncated key. "✔D" = confirmed in Phase D.

| # | id | file:line | problem |
|---|---|---|---|
| 1 | `2026-PLE-SA-03` ✔D | `predictedQuestions.ts:166` | Key x = 3, y = 2 fails 3x − y = 8. Correct: x = 23/7, y = 13/7 |
| 2 | `2026-PLE-CASE-06` ✔D | `predictedQuestions.ts:794` | Key x = 60, y = 60 gives ₹900, not ₹1020. Correct x = 100, y = 20 (the steps reach it) |
| 3 | `2026-AP-SA-02` (script) | `predictedQuestions.ts:348` | No n gives Sₙ = 155 for 5, 8, 11, … (S₁₀ = 185). Key "10 terms" is wrong; the stem needs re-authoring |
| 4 | `CBE-M-ARC-B-001` ✔D | `maths/areas-related-to-circles.cbe.ts:113` | 352 m × ₹50 = ₹17,600; key ₹8,800 |
| 5 | `2026-SAV-CASE-09` ✔D | `predictedQuestions.ts:2586` | ₹13,020 matches no value of π (₹12,999.6 at 3.14; ₹13,011 at 22/7); π not stated |
| 6 | `2026-QE-CASE-12` ✔D | `predictedQuestions.ts:1767` | (35 − √749)/2 = 3.816 → 3.82 m, key 3.81 m |
| 7 | `CBE-M-SAV-B-002` ✔D | `maths/surface-areas-and-volumes.cbe.ts:111` | 416.67 cm = 4.17 m, key truncates to 4.16 m |
| 8 | `2026-CCN-CS-02` ✔D | `predictedQuestionsScience.ts:2249` | finalAnswer/steps answer another question (phototropism, goitre) |
| 9 | `2026-MG-CS-01` ✔D | `predictedQuestionsScience.ts:1831` | finalAnswer/steps describe an electric bell, not the crane/safety question |
| 10 | `2026-AB-CS-02` ✔D | `predictedQuestionsScience.ts:2077` | finalAnswer reads "Question text is missing"; POP part omitted |
| 11 | `2026-MN-CS-02` ✔D | `predictedQuestionsScience.ts:2134` | finalAnswer "Question text is missing"; steps list painting, which the stem excludes |
| 12 | `SCQ-S-CTRL-037` ✔D | `science/control-and-coordination.chapterwise.ts:275` | Key + steps belong to a different (diabetes) question |
| 13 | `SCQ-S-HERED-022` ✔D | `science/heredity.chapterwise.ts:183` | Key explains dihybrid assortment, not why dwarf reappears in F2 |
| 14 | `SCQ-S-CTRL-029` ✔D | `science/control-and-coordination.chapterwise.ts:226` | Key and step are only the table header "Plants Animals" |
| 15 | `SCQ-S-LIFE-041` ✔D | `science/life-processes.chapterwise.ts:316` | Key is a scraped header "[All India 2008] Chap 6 …" |
| 16 | `SCQ-S-CARB-038` ✔D | `science/carbon-and-its-compounds.chapterwise.ts:278` | Key garbled "… Check Anser"; the 5 isomers are missing |
| 17 | `PYQ-S-2025-CTRL-003` ✔D | `science/controlCoordination.pyq2025.ts:27` | Key is a fragment "…tropic movement (any other)"; steps a garbled table |
| 18 | `PYQ-S-2025-REPR-008` ✔D | `science/howOrganismsReproduce.pyq2025.ts:65` | Key is marking-scheme debris "(Award marks if …) 2 ½ ½ 1+1" |
| 19 | `PYQ-S-2025-MAG-006` ✔D | `science/magneticEffects.pyq2025.ts:51` | Key has heart-circulation debris; three diagrams needed, none bound |
| 20 | `PYQ-S-2026-CHEMRXN-019` ✔D | `science/chemicalReactions.pyq2026.ts:146` | A life-processes question filed under Chemical Reactions; key covers only (B)(c) |
| 21 | `PYQ-S-2026-ENV-009` ✔D | `science/ourEnvironment.pyq2026.ts:75` | Key starts mid-answer; parts (i) and (ii) missing |
| 22 | `SCQ-S-MAG-044` ✔D | `science/magnetic-effects-of-electric-current.chapterwise.ts:318` | Key truncated "Given Power . P 1 5" |
| 23 | `CNC2-020` (medium) | `science/controlAndCoordination.pack2.ts:547` | Key says gibberellins "promote cell division" (that is cytokinin) |
| 24 | `lp-hpq-105` ✔D | `highlyProbableQuestions.ts:1015` | HPQ: key "chlorophyll and light are necessary"; the black-paper test tests light only |
| 25 | `ple-hpq-101` + 22 more | `highlyProbableQuestions.ts:17` | Phase A: 23 HPQ rows typed `MCQ` are stored with **no options** (`structure.csv`, check `1mark-not-4option`) |

Also worth a fix lane (not individually ranked): **269 bank rows with no `finalAnswer`** (246 are `SCQ-*`), which the worksheet answer key reads (P4); **10 predicted 1-mark A-R rows** (e.g. `2026-POLY-AR-03`, `predictedQuestions.ts:744`) whose step marks ½+½+1 total 2 for a 1-mark item; **20 bank rows** whose `[N mark]` sums ≠ marks (e.g. `PYQ-S-CTRL-008`: 7 for 5); **4 off-syllabus flags** (`REP2-021` menopause/HRT; `SAV-N-EXEM2-12-LA-010` conversion of solids; `CFPQ-M-POLY-014` cubic division; `LP2-053` Cori cycle).

## Phase B — BANK-AUDIT-1's findings at the tip

- **`wrong-answers.csv` (220 ids):** per the cofounder's runtime check, all are withheld (7) or in the BANK-FIX-1 ledger (184 + 29 non-bank). Not re-solved here.
- **The 55 still-served `broken-rows.csv` ids:** **50 fixed** (now correct; mostly figures bound and step-mark sums corrected since BANK-AUDIT-1), **0 withheld**, **5 still wrong**: 1 still-broken (`SCO-S-CTRL-011`) and 4 with a new problem (`SQP-S-2023-CTRL-B-001`, `PYQ-S-2026-ELEC-011`, `PYQ-S-2026-ELEC-012`, and `FND-L-QB-098` at low confidence).

## Proposed fix list for BANK-FIX-5 (`bankfix5-proposal.csv`, 37 rows)

Rule: LazyTopper-authored rows are **fixed** with the correct key. Official or published rows are **re-keyed** from the source marking scheme (or from their own stored steps, where the steps are correct) **without touching the stem**. They are **withheld** only when the source cannot recover them: the figure is missing, or the key and steps belong to another question.

- **fix-key — 16 LT-authored rows:** 11 predicted (`2026-PLE-SA-03` → x = 23/7, y = 13/7; `2026-PLE-CASE-06` → x = 100, y = 20; `2026-QE-CASE-12` → 3.82 m; `2026-SAV-CASE-09` → state π and the matching cost; `2026-AP-SA-02` → re-author the stem, since no n exists; and the 6 Science CS/SA rows whose finalAnswer or steps answer another question), 2 HPQ (`qe-hpq-104` → accept ±; `lp-hpq-105` → "light is necessary"), 3 bank packs (`CNC2-020`, `CNC2-047`, `CNC2-048`).
- **re-key (keep the official stem) — 15 rows:** e.g. `CBE-M-ARC-B-001` → ₹17,600; `CBE-M-SAV-B-002` → 4.17 m; `SCQ-S-CARB-038`, `SCQ-S-LIFE-041`, `SCQ-S-MAG-044`, `SCQ-S-HERED-022`, `SCQ-S-HERED-039`, `SCQ-S-CTRL-040`, `PYQ-S-2025-CTRL-003`, `PYQ-S-2025-REPR-008`, `PYQ-S-2026-ENV-009`, `PYQ-S-2026-CHEMRXN-008/-011/-014`, `PYQ-S-2026-CTRL-009`.
- **withhold — 6 rows:** `PYQ-S-2026-CHEMRXN-019`, `PYQ-S-2025-MAG-006`, `SCQ-S-CTRL-029`, `SCQ-S-CTRL-037` (unless the source PDF recovers them), plus `SCO-S-CTRL-011` and `APQ-S-EYE-002` (no figure bound; withhold or bind the official figure).
- The 12 medium-confidence wrong-key rows were not verified; the fix lane should re-check each before changing it.

## §7 Facts not established · models · tokens

- **BANK-AUDIT-1's 390 sampled ids** are not published (seed only). C2 therefore excludes only the ids BANK-AUDIT-1 *flagged*, so some of C2's 500 rows may overlap BANK-AUDIT-1's sample.
- **P8's "176 HPQ questions"** does not reproduce: the served `highlyProbableQuestions` export has **127**.
- **Figures:** solvers cannot see bound images. For figure-bound rows they relied on the stem and `diagramDescription`, which students do not see. Phase B "now-fine" verdicts on figure rows (42) assume the bound figure matches its description.
- The 12 medium-confidence wrong-key flags and all non-key flags (wrong-steps, ambiguous-stem, etc.) were **not** independently verified.
- Phase A's figure check is a regex ("figure", "shown below", …), so its 27 hits are candidates, not confirmed. The near-duplicate check is MinHash with Jaccard ≥ 0.85, so a pair below that is not reported.

| task | model / effort | rows | approx tokens |
|---|---|---|---|
| Coordination, runtime dump, Phase A scripts, CSV compile, report | this session (Opus, medium) | 10,928 scripted | not metered here |
| Phase B solvers (2 calls) | Opus, medium | 55 | ~160 k |
| Phase C1 solvers (10 calls) | Opus, medium | 336 | ~766 k |
| Phase C2 solvers (17 calls) | Opus, medium | 500 | ~1,295 k |
| Phase D verifier (1 call, a separate agent) | Opus, medium | 44 | ~84 k |
| **Sub-agent total** | | **891 solved + 44 verified** | **~2.31 M** |

No Sonnet or Haiku helper was used: the scripts and CSVs were written directly. No AI call was made from the app's code, and no production call was made.

## Files (all under `ops/reports/bank-audit-2/`)
`REPORT.md` · `structure.csv` (2,046) · `duplicates.csv` (64) · `audit1-followup.csv` (55) · `wrong-answers.csv` (36) · `broken-rows.csv` (123) · `verifier.csv` (44) · `bankfix5-proposal.csv` (37). Row counts exclude the header.
