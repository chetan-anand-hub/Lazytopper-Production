# BANK-AUDIT-2 — re-audit of the served bank (report only, do not merge)

Base: `base/approved-thru-437` @ `b50577836337f36466c95e1a93571558dd4769ef` (re-derived with `git ls-remote`; the tip did not move).
Compared against BANK-AUDIT-1's SHA `613d8996f54137728d8e8c9f95042ffddc63baab`.

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
- The old-SHA dump reproduces BANK-AUDIT-1's own figures (8,052 / 209 / 128), so the method matches #960 §1.

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

Most of the "fixed" rows were fixed by the DIAGRAMS / step-mark lanes after #960 (figures bound, `[N mark]` sums corrected); the CSV records each one.

## Phase C — progress checkpoint (C1 complete; C2 in progress)

C1 (all 209 predicted + 127 HPQ = 336 rows) is solved. `wrong-answers.csv` and `broken-rows.csv` are regenerated as each C2 batch lands; the final Phase C section below replaces this checkpoint.

## Phase C — solve-check (complete)

- **C1:** all 336 predicted + HPQ rows (10 batches). **C2:** 500 written bank rows (17 batches), stratified round-robin over 104 chapter × marks (2/3/4/5) cells, `random.seed(20261010)`, from a pool of 4,400 rows: served, marks ≥ 2, not MCQ/A-R, **not added after `613d8996` (P9)**, not one of the 55 Phase B ids, and not an id in #960's `wrong-answers.csv` / `broken-rows.csv`. Marks mix: 127 × 2, 126 × 3, 121 × 4, 126 × 5.
- **#960's 390 sampled ids could not be excluded exactly:** BANK-AUDIT-1 published its seed and method (`random.seed(20261006)` round-robin) but not the id list or the script, and its CSVs only hold the rows it flagged. The ids it flagged are excluded; a sampled row that passed in #960 may have been re-solved here. Stated as a fact not established (§7).
- Solved: **836 rows** (C1 336 + C2 500); verdicts `pass` 677 / `flag` 159 (C1 266/70, C2 411/89). Coverage check: 500 of 500 C2 ids returned, 0 duplicate ids.
- `wrong-answers.csv` = **36 rows** with `wrong-key` (24 high, 12 medium confidence). `broken-rows.csv` = **123 rows** flagged otherwise. Flag totals over both files: wrong-steps 125, wrong-key 36, ambiguous-stem 20, off-syllabus 4, needs-figure 3.
- **Running total of rows solved: 55 (B) + 836 (C) = 891 of the 1,100 cap.**
