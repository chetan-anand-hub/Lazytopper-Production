# Objective Answer-Key Repair — Review Queue

**Task:** [FU-BANK-CORRUPT-KEYS] — repair corrupt objective (MCQ / Assertion-Reason) answer keys so
they score **deterministically** under PR #348's objective-scoring guarantee (objective = 0-or-FULL,
never model-deferred).
**Date:** 2026-07-09 · **Branch:** `fix/bank-corrupt-objective-keys`

## What "corrupt" means here
The bank stores the answer key as **`q.answer`** = the OPTION TEXT (must match one of `q.options`;
`correctOption` does not exist). The grader normalises (lowercase; `()[]{}.,:;!?"'` → space; whitespace
squeezed) then resolves the key to an option by letter, exact text, or ≥3-char substring. A key that
resolves to **no** option → the grader can't score it deterministically → it silently falls back to the
model. That fallback is the live hole this task closes.

## Summary (re-derived from the live bank, not the #348 estimate)

| Class | Found | Fixed | Manifest (unfixable) |
|---|---:|---:|---:|
| Corrupt MCQ key (has options, key matches none) | 74 | 61 | 13 |
| Assertion-Reason with no `options[]` | 15 | 15 | 0 |
| **In-scope total** | **89** | **76** | **13** |

Verification (script, `scan`/`verify` over the whole bank):
- After repair, **0** in-scope rows resolve incorrectly; the only unresolved objective rows are the 13 below.
- **61** of the 76 fixes were independently **corroborated** by the row's original `finalAnswer` option-letter
  (e.g. `"(c) …"`) — resolved option index == the letter, **0 mismatches**. The other 15 (2024/25 science, whose
  `finalAnswer` held marking-scheme prose with no clean letter) were solved conceptually and spot-checked.
- TypeScript parse diagnostics across all bank files: **clean (0)**.

## How the fixes were made (anti-fabrication)
For each corrupt MCQ the correct answer was **solved from the question** (+ any `finalAnswer`/`solutionSteps`),
then `q.answer` was set to the **exact text of the existing correct option** — never a new value. Where an option
is itself symbol-stripped (e.g. `"10 2 units"` for 10√2) the answer was set to that option so it resolves, and the
row noted `optionGarbled` (option-text quality is a separate content pass, see below). For the 15 Assertion-Reason
rows, the 4 standard CBSE option strings were added and `q.answer` set to the verdict the row states + verified
against the A/R logic. **No answer was invented.** Anything not confidently determinable is in the queue below.

---

## MANIFEST — 13 unfixable rows (need the real question paper to resolve)

These were **left as-is** (their keys still don't resolve → the grader honestly defers to the model). They need an
owner / real-paper lookup. Grouped by cause.

### A. Corrupted / duplicated OPTIONS (the options themselves are broken — can't pick a correct one)
| id | file | issue |
|---|---|---|
| PYQ-M-ARC-002 | maths/areas-related-to-circles.pyq.ts | options `["4","2","35","70"]` are garbled fragments; correct value 35/2° (17.5°) is absent |
| PYQ-M-ARC-003 | maths/areas-related-to-circles.pyq.ts | all four options identical (`"2 1 πd"`) |
| PYQ-M-PROB-002 | maths/probability.pyq.ts | all four options identical (`"8"`) |
| PYQ-M-PROB-003 | maths/probability.pyq.ts | all four options identical (`"9"`) |
| PYQ-M-PROB-005 | maths/probability.pyq.ts | options `["1","2","1","1"]` — three identical; 1/6 not representable |
| PYQ-M-PROB-006 | maths/probability.pyq.ts | option (d) contaminated with the next section's rubric text (`"…DIRECTIONS : In the question number 19 and 20…"`) |
| PYQ-M-PROB-008 | maths/probability.pyq.ts | options `["4","2","4","1"]` — no recognizable 3/4 |
| PYQ-M-PROB-010 | maths/probability.pyq.ts | options `["13","52","13","26"]` — two identical "13" + bare "52"; not confidently resolvable |
| PYQ-M-TRI-001 | maths/triangles.pyq.ts | options `["2","3","5","2"]` — 9/2 absent, two identical "2" |
| PYQ-S-2024-LIGHT-001 | science/lightReflection.pyq2024.ts | garbled numeric options + garbled refractive-index values; no confident single match |

### B. Figure-dependent (correct option cannot be chosen from the text alone — needs the diagram)
| id | file | issue |
|---|---|---|
| CTRL-EXMPLR-6-MCQ-025 | science/controlAndCoordination.exemplar.ts | options are only "Option (a/b/c/d) as in figure"; needs Fig 7.1 |
| PYQ-S-2024-ELEC-001 | science/electricity.pyq2024.ts | force direction depends on current directions shown in the figure |
| PYQ-S-2024-MAG-002 | science/magneticEffects.pyq2024.ts | two mirror-image "opposite-forces" options; needs the diagram to disambiguate |

---

## Observations for a possible follow-up (NOT in this task's scope — untouched)

1. **`optionGarbled` fixes (~20 rows).** Several fixed MCQs had their correct option itself symbol-stripped
   (e.g. `"x2 4x + 1 ="` for x²−4x+1=0, `"3 16 cm"` for 16/3 cm, `"314 2 cm2"` for 314√2 cm²). The KEY now resolves
   correctly (student picks that option → graded right), but the **option display text** is still garbled. A separate
   content-cleanup pass (like the PYQ symbol-integrity track) should restore the symbols in these option strings.
2. **`solutionSteps` / `finalAnswer` still garbled.** Only `q.answer` (and AR `options`) were repaired. Many rows still
   carry marking-scheme prose or symbol-stripped solutions in those fields — out of scope here, flagged for a content pass.
3. **99 non-MCQ Section-A rows are graded objective by `section === "A"`.** These are `VSA/Short/Long/Case-Based`
   written-answer questions with no `options[]`; PR #348's `isObjectiveType` classifies them objective purely on section.
   They are **not** MCQ/AR and were **not** touched (adding options would be wrong). Whether a written-answer Section-A
   question should be scored 0-or-full is a **#348 grader-scope question**, not a data defect — flagged for owner review.
