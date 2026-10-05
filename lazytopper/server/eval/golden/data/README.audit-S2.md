# GRADER-AUDIT-1 · S2 · THE GOLDEN SET

Wave A-14 · scout S2 · 2026-10-05 · REPORT-ONLY. Built by the scout acting as the examiner - **zero model calls**.

**43 items (24 Maths, 19 Science) · 51 student answer-cases · 10 handwritten-photo cases (all SYNTHETIC, labelled) + their app-compressed variants.**

Provenance: trunk `53fe4d22c9359b09f32842a91acff8e1316b777d` (re-derived with `git ls-remote origin base/approved-thru-437` - unchanged); detached worktree `C:/Projects/LT-worktrees/ga1-s2` used read-only (taxonomy, syllabus guard, question bank, compression code). Spec `GRADER-AUDIT-1.md` sha256 `95acac6c371feff06ff58408f9e77b868c0efd498f51cd9a0d8bf5d77c69c2c1` verified before work.

## 1. Files

| file | what |
|---|---|
| `items.json` | the golden set: per item - source citation, true chapter (app key), syllabus check, bank match, question, official scheme with per-value-point citations, and cases with expected per-step marks |
| `expected_flat.json` | one row per case: caseId, itemId, maxMarks, expectedTotal, expectedWrongStep, expectedType, expectedStudentLabel, chapterKey, objective flag, studentOption, unattemptedParts, illegible, departure, bankId/bankTopicKey, probes |
| `SYLLABUS_CHECK.md` | EXACT banned strings copied from `scripts/src/syllabusGuard.ts` @53fe4d22 + per-item check |
| `images/<caseId>.jpg` | synthetic phone photo, 3000x4000 JPEG q90 |
| `images/<caseId>.compressed.jpg` | the same photo after a faithful replica of the app's client compression (see section 7) |
| `images/manifest.json` | per-image sizes, compression rung used, RNG seed |
| `sources/` | every CBSE PDF/zip downloaded (marking schemes, question papers, SQPs) + `txt/` extractions + `png/` page renders used for visual reading |
| `tools/` | `build.py` (items + flat + arithmetic self-check), `items_maths.py`, `items_science.py`, `gs_common.py`, `render_images.py`, `citation_check.py`, `syllabus_check.py`, `write_readme.py`, `sources_sha256.txt`, `selfcheck.txt`, `citation_check.txt` |
| `fonts/` | Google Fonts used for synthetic handwriting (Caveat, Patrick Hand, Kalam; plus Indie Flower, Gochi Hand, Shadows Into Light downloaded, unused) |

Re-run everything: `python tools/build.py && python tools/render_images.py && python tools/citation_check.py && python tools/syllabus_check.py && python tools/write_readme.py` (renders are seeded, deterministic).

## 2. Sources

Primary: CBSE board-exam marking schemes (BOARD-MS) from https://www.cbse.gov.in/cbsenew/marking-scheme.html; question text for Science from the matching board question papers (https://www.cbse.gov.in/cbsenew/question-paper.html) because Science marking schemes do not reprint the questions (Maths schemes embed the question as an image - read visually). Supplement: CBSE Academic SQP 2026-27 marking scheme (SQP-MS). Every scheme page cited was rendered to PNG and read; text-layer anchors re-checked by `tools/citation_check.py` (section 9).

| used for | paper | URL (zip#inner path) | local file | sha256 |
|---|---|---|---|---|
| Maths items M01-M09, M11, M13-M19 | MS 2025 Maths Std 041, 30/1/1 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Math.zip#Math/041 Mathematics Standard/X_MS_041_Mathematics Standard_30-1-1_2024-25.pdf | `sources/MS2025_041_30-1-1.pdf` | `88c21cb435a6a817f9c5eb82dbfff48817b9159952031a4288d8b0a2cd7f85b5` |
| M10, M12, M20-M22 | MS 2024 Maths Std 041, 30/1/1 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2024/X/Mathematics_Standard.zip#Mathematics_Standard/MS 041_30-1-1 Mathematics 2023-24.pdf | `sources/MS2024_041_30-1-1.pdf` | `fd2faadbb9083e17e7fe3ae028a1f1392f4d7dbb217233917ffc1338554b9b81` |
| M23, M24 | MS 2023 Maths Std 041, 30/1/1 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2023/X/Maths_Standard.zip#Maths_Standard/MS 041_30-1-1 Mathematics 2022-23.pdf | `sources/MS2023_041_30-1-1.pdf` | `c68f8df1795c92b4faf437b6cb2b33b4d895a34c7573a6e51173aa3827e5986d` |
| S01, S02, S04, S06, S07, S09, S10, S13-S16 (+31/1/3 Q26 rule for S13) | MS 2025 Science 086, 31/1/1-31/1/3 (English) | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Science.zip#Science/086 Science (English Medium)/X_086_31-1-1 to 3 Science_MS.pdf | `sources/MS2025_086_31-1-1to3.pdf` | `6aaf56c0f86194a6e9e1933817c72e8473883a9f0735aa6f8be960abc0f5f47a` |
| S06 (Hindi scheme) | MS 2025 Science 086, 31/1/1-3 (Hindi medium) | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Science.zip#Science/086 Science (Hindi Medium)/X_086_31_1-1 to 3_Science _HINDI_Med.pdf | `sources/MS2025_086_31-1_HINDI.pdf` | `d212c221bf412e4df01b42eb2c47df95bb021e11aba3b8ea29af848af70b226f` |
| S11 | MS 2025 Science 086, 31/2/1-31/2/3 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Science.zip#Science/086 Science (English Medium)/X_086_31-2-1 to 3_Science_MS.pdf | `sources/MS2025_086_31-2-1to3.pdf` | `6dbdb6a2f5f74f5ccffdeaf9866e82004103e1c2bcf302f6caa5dee358a2476d` |
| S05, S08, S12 | MS 2024 Science 086, 31/1/1-31/1/3 (31/1/2 at PDF pp14-26) | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2024/X/Science.zip#Science/Science_English)/science (English) set no. 1.pdf | `sources/MS2024_086_31-1_set1.pdf` | `829ea13f976d3399b7886322b0b59f143f2e61ae7b6c3cd147e373d637069184` |
| S03, S17, S18, S19 | CBSE Academic SQP 2026-27 Science 086 - Marking Scheme | https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-MS.pdf | `sources/SQP2026_27_Science-MS.pdf` | `195e5b399354e5334af15e8e42688923272d430876b18e5f1e609e1c6709ce5e` |
| question text S01-S16 (2025 31/1/1) | QP 2025 Science 31/1/1 (bilingual; English on odd pages) | https://www.cbse.gov.in/cbsenew/question-paper/2025/X/086_Science.zip#086_Science/31-1-1_Science.pdf | `sources/QP2025_086_31-1-1.pdf` | `d753039479520adcf8ca690b7a52208a444fc7160667e12452dc867bec025801` |
| question text S11 | QP 2025 Science 31/2/1 | https://www.cbse.gov.in/cbsenew/question-paper/2025/X/086_Science.zip#086_Science/31-2-1_Science.pdf | `sources/QP2025_086_31-2-1.pdf` | `2a280593f17d900309e1d76d5535d14600e48fd84a62537087e3c082e915084b` |
| question text S05, S08, S12 (scanned; read visually) | QP 2024 Science 31/1/2 | https://www.cbse.gov.in/cbsenew/question-paper/2024/X/SCIENCE.zip#SCIENCE/31_1_2_Science.pdf | `sources/QP2024_086_31-1-2.pdf` | `32f43e40ef005cd8fc114b8dd88c577232eb302bd77a2f39e305c083091dea5b` |
| question text S03, S17-S19 | CBSE Academic SQP 2026-27 Science 086 | https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-SQP.pdf | `sources/SQP2026_27_Science-SQP.pdf` | `09bf85a26357d9b3c44976e722a4532c383a99ccbd97e8fc9a0fb06c8ac64eff` |

Also downloaded and hashed (not cited by an item): the full 2023/2024/2025 Class X Maths-Standard and Science MS zips, other set PDFs, QP zips 2023-2025, SQP 2025-26 Science (SQP + MS), SQP 2026-27 Maths Standard (SQP + MS). All hashes: `tools/sources_sha256.txt`.

**Page numbering.** `pdfPage` is the 1-based PDF page index. `printedPage` is the number printed on the page; they coincide for every 2023-2025 Maths MS, the 2025 Science 31/1/1 and 31/2/1 MS, and the 2024/2025 QPs. Exceptions recorded per item: MS 2024 Science three-set file (PDF 17/18 = printed '31/1/2 PAGE 4/5'), MS 2025 31/1/3 rule (PDF 29 = printed 'Page 5 of 11'), SQP 2026-27 (no printed page numbers -> `printedPage: null`).

**Not obtained / not used:** nothing blocked. The 2026 board-exam marking schemes (first and second board exam) are also published on the same CBSE page (`marking-scheme/2026/X/041_MATHEMATICS_STANDARD.zip`, `086_SCIENCE.zip`) - not used because the brief/spec fix 2023-2025 + SQPs; they are the natural next source for a set refresh.

## 3. How an item and a case are built

- The question is transcribed verbatim from the official paper (figures described in `figureDescription`, `needsFigure: true`). Where an item has internal choice, the alternative actually used is stated; the OR-part is quoted in brackets.
- `scheme[]` = the official value points with the official marks, one row per value point, each with `citation {pdfPage, printedPage}`. Where the official scheme is WRONG (2 errata, section 6) the row keeps the official mark allocation, the value point is corrected, and a `note` quotes what the scheme prints.
- `cases[].expected.perStep[]` mirrors `scheme[]` one-to-one (same step numbers) with `awarded` and a one-line examiner reason. `totalMarks` = sum of `perStep` (checked). `wrongStep` = the scheme step where the (single) mistake is located; `null` when nothing is wrong or the only loss is an unattempted part.
- `mistakeType` uses the grader's own enum (`conceptual | calculation | silly | presentation | null`, `checkSolution.cjs:1328-1332` and the JSON schema `"mistakeType": null | "conceptual" | "calculation" | "silly" | "presentation"`). `studentLabel`/`studentHeading` use the owner's 3 student-facing buckets recorded in `handoff/CURRENT_STATE.md:5125-5127`: conceptual -> knowledge gap ('Marks to gain - learn this'); presentation -> exam technique ('the quickest wins'); calculation + silly -> careless ('you already know this').
- `commentMayMention` = facts actually present in the answer; `commentMustNotClaim` = plausible-but-absent things (the comment-truth test); `modelAnswerKeyFacts` = what a correct model answer/corrected working must contain.
- Image cases: `text` is the exact ground-truth transcript of what is written; `image` / `imageCompressed` are the files; `synthetic: true`.

## 4. Examiner conventions applied (the bar)

1. **Official marks first.** Each value point earns exactly its printed mark; nothing above a step's maximum or below zero; marks on the half-mark grid (checked).
2. **ECF / carried slip** - CBSE MS general instruction 10 (printed in every MS used, e.g. MS 2025 Maths p2): *'No marks to be deducted for the cumulative effect of an error. It should be penalized only once.'* A wrong value that is then used CORRECTLY keeps the later method marks (M12, S09-a, M07).
3. **Departure** (owner ruling): when the student stops solving the question set (wrong method/equation/problem), everything after the departure scores 0 - including a correct-looking final answer - until the work returns to the question (M11, M15, M23 never return; M09-b returns).
4. **Alternative valid method = full marks** - MS general instruction 3 (answers 'assessed for their correctness otherwise and due marks be awarded') and instruction 4 ('value points ... guidelines only'): M04-a (quadratic formula), M14 (add/subtract).
5. **Objective (MCQ / A-R):** 0 or full on the option alone; working never changes the mark (owner ruling). Flawed working with the right option = full mark and NO mistake type; a bare wrong option = 0 with type `null` (undiagnosable).
6. **Unattempted part / 'don't know' / blank** = fourth state (owner ruling): 0 earned for that part, `mistakeType: null`, listed in `unattemptedParts`, never a 'wrong answer' and never an MI mistake.
7. **Presentation (CBSE format only)**: missing unit on a final physics answer (-1/2, owner doctrine CLAUDE.md section 13), missing formula where the MS gives the formula 1/2, missing conclusion line, required figure/diagram absent, missing arrows where the MS says so, CBSE technical term missing.
8. **Chemistry equations**: follow the published notes - 2024 31/1/2 Q26 splits 'Equation 1/2 + Balancing 1/2'; 2025 31/1/3 Q26: 'Deduct half mark if equation is not balanced'; 2025 31/2/1 Q27: 'Do not deduct marks if physical state not given'; 2025 31/1/1 Q34: 'No mark to be deducted if equations are not balanced' (when the question does not ask for balanced equations). Unbalanced when asked, no attempt -> conceptual; genuine attempt with a miscount -> calculation (app prompt rule 3 wording, consistent with owner rulings).
9. **Language**: Hindi / Hinglish / mixed answers are marked on content (CBSE examines in Hindi medium too); language is never a mistake.
10. **Crossed-out work** that is replaced is not assessed; a student's own corrected slip is not penalised (M08, S09-b).
11. **Illegible**: not gradable - expected total `null`; the grader must say it could not read the answer (M13).

## 5. Judgement calls where the scheme is silent or contested (decided; flagged for S2b / owner)

- **GS-M07-a** - Miscopied data (PR = 9 for 6). Scored as a slip penalised once (1/2) with ECF -> 1 1/2/2, type silly (owner: copied wrongly = silly). CONTESTED: the app's `QUESTION_MISCOPY_PROMPT` (`checkSolution.cjs:1122`) treats any miscopy as a DEPARTURE and zeroes every step below it (would score 0/2). Needs an owner ruling: is a miscopy a slip or a departure?
- **GS-M09-b** - One wrong line in a proof followed by correct lines: only the wrong line's mark lost (2/3). A strict examiner might withhold step 3 because it does not follow from step 2; this set follows the owner's 'departure that returns' model.
- **GS-M10-a / GS-M21-a / GS-S05-b / GS-S07-a** - Format elements (conclusion, figure, diagram, formula) absent on otherwise-correct work = presentation. The app prompt contradicts itself (rule 3/9 'presentation' vs rule 6 'missing => null', `checkSolution.cjs:1332` vs `:1335`).
- **GS-M22-a** - Verification asked for and not attempted = unattempted part (null type), not presentation.
- **GS-M19-a** - A legible 'I don't know' = unattempted (fourth state). App rule 6 NOTE grades it status 'incorrect', type null - marks agree, state differs.
- **GS-S05-b** - Prose instead of the required ray diagram = 0/2 (some examiners give 1/2 for the lateral-displacement description; within tolerance).
- **GS-S06-b** - Lay term 'clotting cells' for platelets: the 1/2 for the term is lost; typed presentation (concept shown, CBSE term missing). If the owner prefers conceptual for an unknown technical name, only the type changes. No oesophagus/'food pipe' question exists in any 2023-2025 Class X Science MS (all sets searched) - platelets is the substitute.
- **GS-S08-a** - Missing unit on '8' (asked 'in watts') = -1/2 presentation, per owner doctrine CLAUDE.md section 13; the MS value point is '8 W'.
- **GS-S09-a** - A 1-mark part with half its working right: 1/2 awarded (common examiner practice); 0 is within tolerance.
- **GS-S13-a** - Unbalanced brine equation where the question asks for balanced equations: (a)'s single mark split 1/2 + 1/2 by the same 2025 series' explicit rule (MS p29). Type conceptual per app/owner wording although (c)(i) shows the student can balance (a reviewer could argue silly).
- **GS-S17-a** - SQP MS prints only the question total (3); split 1+1+1 by part. The wrong numeric value in A = 0 (1/2 for the method is within tolerance).
- **Maths units** - No Maths case omits a unit on purpose. Maths MS value points carry units but allocate no separate mark; whether a Maths examiner deducts for a missing unit is left out of the set rather than guessed.

## 6. Errors found in the OFFICIAL sources (the golden set uses the correct mathematics/physics)

- **MS 2025 Maths 30/1/1 Q35 (PDF p15):** mode = 19 + (20-13)/(40-13-5) **x 3** = **19.95**. The class width is **2** (classes 11-13, 13-15, ...), so mode = 19 + 14/22 = **19.64**. GS-M16 expects a student who writes 19.64 to get 5/5. The app's bank copies the error (`PYQ-M-2025-STAT-001`, `lazytopper/src/data/questionBanks/class10/maths/statistics.pyq2025.ts:11-17`: `"[1 mark] Mode = 19 + ((20 - 13)/(2x20 - 13 - 5)) x 3 ..."`, `"Mode = 19.95 (approx.)"`). CONFIRMED (read both).
- **SQP 2026-27 Science MS Q33(B) (PDF p7):** prints n21 = v2/v1; correct is n21 = v1/v2 (speed in medium 1 / speed in medium 2). GS-S19 expects v1/v2 to get full marks. CONFIRMED.
- **SQP 2026-27 Science MS Q35 (PDF p8):** writes the lens formula as '1/f = 1/v + 1/u' and garbled arithmetic '-(3+1)/24 = -2/24' (final f = -12 cm is right). Not used as an item; recorded so no one copies it into a scheme. CONFIRMED.

## 7. Images (10 cases, all SYNTHETIC)

**Real photos searched first:** repo at 53fe4d22 (`git ls-files` images: only notes/figures, UI screenshots, .canvas assets), `C:/Projects/LT-worktrees/eval-set`, `eval-harness`, `eval-parity` (same non-answer images), `Desktop/diff` eval folders (figure crops, UI screenshots) - **no real handwritten answer photo with known content exists**. `Desktop/diff/grader-audit-1/owner-anomalies/` does not exist (no owner anomaly photos). Outside the brief's list, `Downloads/Testing*/` holds owner worksheet test uploads (app-generated worksheet questions, no CBSE scheme, expected marks unknown) - not used.

**Rendering** (`tools/render_images.py`, seeded): ruled exercise-book page (blue rules every 118 px, red margin), Google Fonts handwriting (Caveat, Patrick Hand; **Kalam** for Devanagari, shaped with libraqm), per-word rotation/baseline/size jitter, hand-drawn fraction bars / root signs / arrows, Windows Segoe Print / Segoe UI Symbol only as glyph fallback for symbols the hand fonts lack (theta, pi, arrows); diagrams drawn as wobbly PIL polylines with geometrically correct optics. Photo pass: page placed on a table background, random rotation (+-2.2 deg) and small perspective skew, uneven lighting gradient + vignette, Gaussian noise, Gaussian blur 1.1 px (1.4 for the messy page), JPEG q90 at **3000x4000**.

| case | what the photo is | font/style | original bytes | compressed (WxH, quality, bytes) |
|---|---|---|---|---|
| GS-M08-a | crossed-out-and-rewritten line, otherwise neat | Caveat | 1131149 | 1500x2000, q0.85, 262966 |
| GS-M09-b | neat proof with stacked fractions; one wrong sign line | Patrick Hand | 1129501 | 1500x2000, q0.85, 263928 |
| GS-M20-a | neat working with subscripts, fraction | Caveat | 1162446 | 1500x2000, q0.85, 276678 |
| GS-S03-a | MCQ with working, option ringed | Patrick Hand | 1064730 | 1500x2000, q0.85, 233839 |
| GS-S06-a | HINDI answer (Devanagari) | Kalam | 1165739 | 1500x2000, q0.85, 274463 |
| GS-M13-a | TRULY ILLEGIBLE scrawl - no recoverable characters | synthetic scribble + 4.5 px smear | 1256031 | 1500x2000, q0.85, 314383 |
| GS-M24-a | BLANK ruled page | - | 1051536 | 1500x2000, q0.85, 227234 |
| GS-S05-a | labelled ray diagram drawn as lines (glass slab, lateral displacement) | lines + Caveat labels | 1129324 | 1500x2000, q0.85, 260324 |
| GS-S10-a | two convex-mirror ray diagrams, NO arrowheads on rays | lines + Caveat labels | 1137546 | 1500x2000, q0.85, 264331 |
| GS-S14-a | legible-but-messy: strong jitter, slant, drifting lines, ink blots | Caveat | 939877 | 1500x2000, q0.85, 253760 |

**Compressed variant = exact replica of the app's client step** (`lazytopper/src/services/preparePhoto.ts` @53fe4d22): `PHOTO_MAX_LONG_EDGE = 2000` (:33), `PHOTO_MIN_LONG_EDGE = 1600` (:36), `PHOTO_QUALITY_LADDER = [0.85, 0.75, 0.65, 0.55, 0.45]` (:39), first-fit under `PHOTO_TARGET_BYTES = 2.5 * 1024 * 1024` (`uploadLimits.ts:51`; hard cap `MAX_UPLOAD_IMAGE_BYTES = 3 * 1024 * 1024`, :47), JPEG via `canvas.toDataURL("image/jpeg", quality)` (:524), smoothing `imageSmoothingQuality = "high"` (:513); passthrough only if long edge <= 2000 and under the cap (:622) - not the case for these 4000-px photos. Replica: long edge 4000 -> 2000 (1500x2000), PIL LANCZOS (browser 'high' smoothing is not bit-identical - nearest available equivalent), JPEG quality 85, 4:2:0 chroma; every image fitted on the first rung (0.85). Byte-identity with a real browser is NOT claimed.

## 8. Findings surfaced while building (for S3 / S1 / the merger)

- **Bank chapters are wrong for 3 of the 2025 Science PYQs used** (CONFIRMED, read): `PYQ-S-2025-CHEMRXN-021` (brine/baking soda case; true acids-bases-and-salts) `chemicalReactions.pyq2025.ts:155`; `PYQ-S-2025-CHEMRXN-022` (photosynthesis case; true life-processes) `:162`; `PYQ-S-2025-LIFEP-008` (domestic circuits; true magnetic-effects-of-electric-current) `lifeProcesses.pyq2025.ts:63-69` - its questionText is garbled Hindi remnants joined to the tail of Q38 and its solutionSteps belong to Q39. Also seen in passing: `PYQ-S-2025-METAL-005` (resistivity, filed metals-and-non-metals, `metalsNonMetals.pyq2025.ts:43`) and `PYQ-S-2025-CHEMRXN-016` (butene isomers / carbon compounds, filed chemical-reactions, `chemicalReactions.pyq2025.ts:120`). So 'use the bank's known chapter' is only safe after a bank chapter audit.
- **Bank question text is lossy for PYQs:** `PYQ-M-2025-POLY-001` reads 'Find the zeroes of the polynomial p(x) = x2 + x .' (fractions lost); `PYQ-M-2025-STAT-001` drops 'Find the missing frequency f'; `PYQ-M-2025-ARC-001` drops the pi in '40 pi sq. units' (`maths/areas-related-to-circles.pyq2025.ts:12`: 'an area of 40 sq. units'); POLY-001 at `maths/polynomials.pyq2025.ts:12`. A grader shown bank text grades against a different question.
- **Bank scheme carries the MS 2025 Q35 erratum** (section 6) - a correct student would be marked down and shown a wrong model answer.
- **Official schemes contradict two app rules:** (1) app S4c / rule 3 make 'balanced but no state symbols' a presentation mistake (`checkSolution.cjs:647`, `:1332`); MS 2025 31/2/1 Q27 says 'Do not deduct marks if physical state not given' and MS 2025 31/1/1 Q37(a)'s own model equation has no state symbols (GS-S11). (2) the app treats a miscopy as a departure (`:1122`), CBSE instruction 10 penalises an error once (GS-M07).
- **Owner's 3-bucket label mapping is not what Me/Progress implements:** owner ruling `handoff/CURRENT_STATE.md:5125-5127` puts calculation with silly ('you already know this') and presentation alone ('the quickest wins'); `lazytopper/src/pages/MeProgressPage.tsx:117` `CARELESS_TYPES = new Set(["silly", "presentation"])` and `:119` `KNOWLEDGE_TYPES = new Set(["conceptual", "calculation"])`. Expected labels in this set follow the owner ruling (CONFIRMED read of both; which is current intent is for S4/owner).
- **2026-27 Science SQP is organised by SUBJECT** - 'Section A is Biology, Section B is Chemistry and Section C is Physics' (SQP 2026-27 Science p1), with 1/2/3/4/5-mark questions inside each section; the 2027 board paper will look like this, unlike the 2023-2025 papers (type-based Sections A-E). Any app logic that infers marks/type from a Science section letter will be wrong for 2027 (PLAUSIBLE - not traced in code). Maths 2026-27 SQP keeps Sections A-E.
- **'Evolution' false positive:** the guard's banned sub-topic string 'Evolution' whole-word-matches the correct answer 'gas का evolution' (GS-S04) - fine for the guard's exact-subtopic mode, a trap for any free-text filter.
- **Detected-topic vocabulary** used by C&I is the 26 `topics.ts` slugs (`DesktopCheckImprovePage.tsx:236-239` -> `desktopTopicsBySubject`, slugs at `lib/desktop/topics.ts:19-270`); every `chapterTrue.appTopicKey` here is one of them.

## 9. Self-check

- Items 43, cases 51; Maths/Science = 24/19 items (56% / 44%).
- Per item: scheme marks sum == question marks; parts sum == question marks; app topic key valid. Per case: perStep steps == scheme steps, perStep sum == expectedTotal, every award within [0, step max] and on the half-mark grid; objective cases 0/1 with `objective.expectedMarks == totalMarks`. Result: **all pass** (`tools/selfcheck.txt`, PROBLEMS: NONE).
- Citations: every cited page re-opened by `tools/citation_check.py` - 72 anchors (MS value-point text and QP question text) found on the cited page; anchors inside embedded question images, the scanned 2024 QP and the SQP figure verified visually from renders in `sources/png/`. Result: **NOT FOUND: NONE**.
- Syllabus: `SYLLABUS_CHECK.md` - 0 items on a banned sub-topic (37 Maths + 65 Science banned strings copied verbatim from the guard at 53fe4d22).
- Images: 10 originals + 10 compressed exist; transcripts in `items.json`; the illegible page was viewed and contains no recoverable characters.

### Coverage (probe -> number of cases)

| probe | cases |
|---|---|
| 5-mark | 6 |
| alternative-method | 2 |
| ar | 3 |
| august-defect-9 | 1 |
| balanced-vs-unbalanced | 3 |
| bank-chapter-wrong | 3 |
| bank-match | 21 |
| bank-scheme-error | 1 |
| bio-exact-term | 1 |
| blank | 1 |
| calculation | 8 |
| case-based-4mark | 7 |
| chapter-misfile-risk | 8 |
| conceptual | 8 |
| control-full-marks | 17 |
| corrected-slip | 2 |
| departure-never-returns | 3 |
| departure-returns | 1 |
| diagram-dependent | 4 |
| dont-know | 1 |
| ecf-carried-slip | 3 |
| fudged-final-answer | 1 |
| heredity-retained | 2 |
| hindi | 1 |
| hinglish | 1 |
| illegible | 1 |
| image | 10 |
| image-crossed-out | 1 |
| image-diagram | 2 |
| image-messy | 1 |
| image-neat | 3 |
| maths-notation | 4 |
| mcq-correct-no-working | 1 |
| mcq-correct-pick-flawed-working | 3 |
| mcq-correct-with-working | 1 |
| mcq-objective-invariant | 8 |
| mcq-wrong-no-working | 1 |
| mcq-wrong-pick-conceptual-working | 1 |
| mcq-wrong-pick-good-working | 1 |
| mixed-language | 1 |
| model-answer-correctness | 2 |
| multipart-independent-later-parts | 4 |
| physics-units | 6 |
| presentation | 2 |
| presentation-missing-diagram | 2 |
| presentation-missing-formula | 1 |
| presentation-missing-units | 1 |
| presentation-no-conclusion | 1 |
| presentation-vs-missing-boundary | 1 |
| ray-diagram-description | 1 |
| scheme-erratum | 2 |
| section-E | 6 |
| silly-miscopy | 2 |
| state-symbols | 1 |
| syllabus-deleted-method-used | 1 |
| topic-fix-1 | 2 |
| unattempted-part | 3 |

Marks coverage: Maths 1/2/3/4/5-mark = 3, 9, 4, 3, 5 items; Science = 3, 7, 4, 4, 1 items. Bank matches: 18 items (3 with a WRONG bank chapter).

## 10. How S3 should score against this set

- Total marks: exact vs `expectedTotal`; also report within-1/2. `expectedTotal: null` (GS-M13-a) = the grader must decline ('could not read'); any numeric grade is a fabrication.
- Wrong step: compare the grader's first step with marks lost (or `isDeparture`) to `expectedWrongStep` by CONTENT (the grader's own step numbering will differ from the scheme's). `null` = no wrong step.
- Type: exact vs `expectedType`; `null` cases (unattempted / undiagnosable / full marks) must carry NO type and log NO MI mistake.
- Chapter: vs `chapterKey`; items tagged `chapter-misfile-risk` / `topic-fix-1` are the stress set; `bankTopicKey` shows what a 'use the bank' policy would yield (wrong for S13, S14, S15).
- Comments: any statement matching `commentMustNotClaim` is a false comment; the model answer must contain every `modelAnswerKeyFacts` item and must not reproduce an erratum (M16 19.95, S19 v2/v1).
- Image cases: grade both `image` and `imageCompressed`; a difference between them is a finding.

## 11. Facts not established

1. Whether an experienced CBSE Maths examiner deducts 1/2 for a missing unit when the MS allocates no separate mark - left out of the set (no Maths unit case).
2. The owner's ruling on miscopy = slip vs departure (GS-M07 scored as a slip).
3. Whether a lay biology term should be typed presentation or conceptual (GS-S06-b scored presentation).
4. Byte-identity of the compressed images with a real browser's canvas JPEG encoder (replica uses PIL LANCZOS + libjpeg q85).
5. Whether any app code infers question type/marks from the Science section letter (relevant to the 2026-27 subject-wise sections) - not traced.
6. The 2026 board-exam marking schemes were not reviewed (out of the spec's year range).
