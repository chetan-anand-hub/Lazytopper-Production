# T2 expected key - Check & Improve MULTI, second mixed paper (8 questions printed as Q1-Q7, 19 marks, 8 chapters, none shared with T1)
Files: `T2_questions.pdf` (1 page, text layer) or `T2_questions_photo_p1.jpg` · answer sheet `T2_answers.pdf` (3 pages) or `T2_answers_photo_p1..p3.jpg`. A different student (different handwriting, numbers written "1)", "2)", ...).
Use T2 for the RE-GRADE test (grade it, then re-grade the same upload) and for the after-PR-2 checks. Every question is a real bank row, printed verbatim (checked by build_papers.py). Taxonomy and wording as in T1's key.
Expected paper title: Maths + Science · 8 chapters.

**Printed-number trap:** the paper prints **"Q5." twice** (last question of Section B and first of Section C) and the student writes "5)" twice. They are two different questions and must stay two rows, two identities, two MI entries.

| Q (printed) | Bank id (file:line) | TRUE subject · chapter (topics.ts name / slug) | Max | Planted mistake (in the answer) | Owner group / stored type | Expected marks | Why (CBSE step marking) |
|---|---|---|---|---|---|---|---|
| 1 | CARB-NCERT-4-MCQ-002 (science/carbonCompounds.ncert.ts:96) | Science · Carbon & its Compounds / `carbon-and-its-compounds` | 1 | none - "(c) ketone" + reason (C=O mid-chain) | - (right-option MCQ: no type) | 1 | right option |
| 2 | AP-N-NCERT-5-VSA-004 (maths/arithmeticProgression.ncert.ts:101) | Maths · Arithmetic Progression / `arithmetic-progression` | 2 | copied −81 as **−84**; −84 = 21 + (n − 1)(−3) → n = 36 (right: 35th term) | careless / `silly` | 1.5 | aₙ formula, a and d right, solved consistently; copying slip once (½) |
| 3 | MAG-NCERT-12-SA-010 (science/magneticEffects.ncert.ts:137) | Science · Magnetic Effects of Electric Current / `magnetic-effects-of-electric-current` | 2 | none - permanent magnet; current through a conductor | - | 2 | 1 + 1 |
| 4 | PYQ-S-ENV-001 (science/our-environment.pyq.ts:11) | Science · Our Environment / `our-environment` | 2 | **ANSWER DOES NOT MATCH THE QUESTION**: the student wrote where plants get CO₂, water and sunlight for photosynthesis; nothing on trophic levels | none - `answerMismatch: true` | **no marks shown**; "This answer doesn't seem to match the question - check you uploaded the right page" | owner addendum (PR-2): no marks, no MI entry, no attempt/progress record, no charge shown; never "0/2 Incorrect", never "Not attempted" |
| 5 (1st) | PYQ-M-2024-CG-004a (maths/coordinate-geometry.pyq2024.ts:36) | Maths · Coordinate Geometry / `coordinate-geometry` | 2 | k : 1, −4 = (3k − 6)/(k + 1) → k = 2/7 right, but **never states the ratio** ("∴ ratio 2 : 7" missing) | exam technique / `presentation` | 1.5 | scheme: section formula 1, k = 2/7 ½, "required ratio is 2 : 7" ½ - the conclusion is missing |
| 5 (2nd, same printed number) | EYE-NCERT-10-SA-006 (science/humanEye.ncert.ts:83) | Science · Human Eye & Colourful World / `human-eye-and-colourful-world` | 3 | says myopia is corrected by a **convex** lens; f = +80 cm, P = +1.25 D (right: concave, f = −80 cm, P = −1.25 D) | knowledge gap / `conceptual` | 1 | P = 1/f with f in metres applied correctly (1); nature of the lens (1) and sign/power (1) lost to the concept |
| 6 | METAL-NCERT-3-SA-006 (science/metalsNonMetals.ncert.ts:482) | Science · Metals & Non-metals / `metals-and-non-metals` | 3 | none - dry litmus no change; moist blue litmus turns red (SO₂ + H₂O → H₂SO₃); S + O₂ → SO₂ | - | 3 | (a)(i) 1 + (a)(ii) 1 + (b) 1 |
| 7 | PLE-N-NCERT-3-CB-002 (maths/pairOfLinearEquations.ncert.ts:192) | Maths · Pair of Linear Equations / `pair-of-linear-equations` | 4 (case-based, parts (i)(ii)(iii)) | (i) x + 10y = 105, x + 15y = 155 right; (ii) y = 10, x = 5 right; (iii) x + 25y = 5 + 250 written as **₹265** (right ₹255) | careless / `calculation` (part iii) | 3.5 = (i) 1 + (ii) 2 + (iii) ½ | (iii): method right, arithmetic slip −½ |
| | | | **19 printed / 17 graded** | | | **13.5 / 17** | Q4's 2 marks are outside the score (mismatch) |

Brief coverage: case-based 4-mark with (i)(ii)(iii) = Q7 · two questions with the SAME printed number = Q5 (CG) and Q5 (Human Eye), both carrying a mistake so a collision is visible in MI · answer to a DIFFERENT question = Q4 · every type again on chapters not used in T1: silly Q2 (AP), presentation Q5-1st (CG), conceptual Q5-2nd (Human Eye), calculation Q7 (PLE).

## Where your marks went (expected, in MARKS)
| Group (owner wording) | Stored types | Marks lost | From |
|---|---|---|---|
| Knowledge gap - "Marks to gain - learn this" | conceptual | **2** | Q5-2nd (Human Eye) 2 |
| Careless - "Marks to gain - you already know this" | calculation + silly | **1** | Q7(iii) 0.5 (calculation) + Q2 0.5 (silly) |
| Exam technique - "Marks to gain - the quickest wins" | presentation | **0.5** | Q5-1st (CG) 0.5 |
| Not attempted | - | **0** | - |
| **Total lost** | | **3.5** | 2 + 1 + 0.5 = 3.5 = 17 − 13.5 ✓ |

Q4 (mismatch) appears in NONE of these lines. Open point (asked of Controller A, see WAVE_STATE_B15): whether `answerMismatch` is per question or per response. If the surface shows the paper as /19, the 2 marks of Q4 must still not appear as a loss, a mistake or "Not attempted".
Per-question `marksLostByType`: Q2 {silly 0.5} · Q5-1st {presentation 0.5} · Q5-2nd {conceptual 2} · Q7 {calculation 0.5} · Q1, Q3, Q6 zero · Q4 none (mismatch).
Tolerance: ½ off on ONE question = examiner variance (record); ≥ 1 off, wrong group/type, the two "Q5"s merged into one row, or any mark/MI entry for Q4 = FAIL.

## Mistake Intelligence entries
- **After one grade (target, after PR-2): 4 entries**, each under its own chapter: Arithmetic Progression (Q2, silly, 0.5) · Coordinate Geometry (Q5-1st, presentation, 0.5) · Human Eye & Colourful World (Q5-2nd, conceptual, 2) · Pair of Linear Equations (Q7, calculation, 0.5). None for Q1, Q3, Q6 (clean) or Q4 (mismatch).
- Check the two "Q5" entries carry DIFFERENT question text (ratio question vs myopia question) and different ids. Today's code keys C&I questions as `ci:<session>:q<number>` and looks the question text up by number (`DesktopCheckImprovePage.tsx:1672-1674`), so both would share one id and the first Q5's text - the collision this paper is built to expose.
- **After a re-grade of the same upload: exactly the same 4 entries** (no new ids, no duplicates; Me/Progress counts unchanged; spec A2: re-grading the same submission never adds a record).
- Tutor brief / sidebar widget: top loss = knowledge gap (conceptual, 2 marks); mistakes cost 3.5 marks; knowledge-gap weak area = Human Eye & Colourful World.
