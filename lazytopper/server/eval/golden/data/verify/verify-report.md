# GRADER-AUDIT-1 - S2b - ADVERSARIAL VERIFICATION OF THE GOLDEN SET

Wave A-14 - scout S2b (second, independent CBSE examiner) - 2026-10-05 - REPORT-ONLY - model calls **0 / cap 0**.

## 0. Provenance
- Spec `GRADER-AUDIT-1.md` sha256 `95acac6c371feff06ff58408f9e77b868c0efd498f51cd9a0d8bf5d77c69c2c1` (starts `95acac6c371f`) - OK.
- Trunk re-derived `git ls-remote origin base/approved-thru-437` = `53fe4d22c9359b09f32842a91acff8e1316b777d` (unchanged).
- Worktree `C:/Projects/LT-worktrees/ga1-s2b`, created fresh, DETACHED at 53fe4d22, read-only; `git status --porcelain` empty at the end. The shared checkout was never read.
- Input: S2's `golden/items.json` (43 items / 51 cases, mtime 08:04), `expected_flat.json`, `README.md`, `SYLLABUS_CHECK.md`, `images/` (20 files), `sources/`. S2's files were NOT modified; all output is in `golden/verify/`.
- Reproduce: `python verify/tools/apply_verification.py` (reads S2's items.json, writes the three verified files, runs an independent arithmetic/label/immutability self-check - result `PROBLEMS: NONE`), then `python verify/tools/write_report.py`.

## 1. Method (what was actually re-opened)
- **Every cited scheme page re-rendered by me with PyMuPDF and read visually** (not S2's renders): MS 2025 Maths 30/1/1 pp1-3,5,7-9,11-18; MS 2024 Maths 30/1/1 pp7-8,12-16; MS 2023 Maths 30/1/1 p9; MS 2025 Science 31/1/1 pp3,4,7,9,10,11 and 31/1/3 p29; MS 2025 Science 31/2/1 p5; MS 2024 Science 31/1/2 pp17-18; SQP 2026-27 Science MS pp2,7 (Q33 zoomed); QP 2025 31/1/1 pp9,13,15,17,21-27 (text layer + renders); QP 2025 31/2/1 p15; QP 2024 31/1/2 p13 (scanned, read visually); SQP 2026-27 Science pp1,3,4,11,12.
- For every item: question text vs the official paper; every value point, its mark, half-marks, OR-alternatives, 'any two' rules, page number and set code vs the scheme.
- Independent arithmetic re-check (my own script, not S2's build.py): scheme sum = question marks; part sums; per-step sum = expectedTotal; 0 <= award <= step max; half-mark grid; objective 0/1 invariant; label/heading mapping; flat table = items. Result: no arithmetic error in S2's set.
- Examiner judgement on all 51 cases (ECF, alternative method, units/presentation, MCQ-on-option-alone, departure-never-returns, unattempted fourth state).
- Mistake type + studentLabel against the owner mapping (`handoff/CURRENT_STATE.md:5125-5127` @53fe4d22: conceptual -> "Marks to gain — learn this"; presentation -> "the quickest wins"; calculation + silly -> "you already know this"; labels knowledge gap / exam technique / careless). All 51 labels map correctly.
- Chapter keys checked against `lazytopper/src/lib/desktop/topics.ts` slugs (26) @53fe4d22: all valid and all true chapters agree.
- Syllabus: re-read `scripts/src/syllabusGuard.ts` @53fe4d22 myself (37 Maths + 65 Science banned sub-topic strings; my parse finds every one present in S2's SYLLABUS_CHECK.md). No item tests a banned sub-topic (details per item below).
- Bank: every recorded bankId located at 53fe4d22 and its topicKey read; question text compared; then the banks were SEARCHED for the 25 items S2 recorded as not-in-bank (one missed match found).
- Images: all 10 compressed photos viewed; originals spot-checked at full resolution (GS-M13-a crop, GS-S10-a crop). Ray/mirror diagrams geometrically checked (S05-a refraction angles 45.7 deg in / 29.6 deg in glass / 47.6 deg out; S10-a dashed extensions meet at F and A' lies between P and F).

## 2. Summary

| verdict | cases |
|---|---|
| AGREE | 33 |
| AMEND (expectation/citation/tag changed, value kept or clarified) | 10 |
| CONTESTED (S2 value kept, both views recorded, `contested: true`) | 8 (one of them, GS-M09-b, also amended) |
| EXCLUDE | 0 |

Plus one global normalisation on 25 cases: `studentHeading` "Marks to gain - ..." (ASCII hyphen) -> owner verbatim "Marks to gain — ..." (em dash, U+2014, as in CURRENT_STATE.md:5125-5127).
No question text, answer text or image was changed (immutability asserted by the apply script). No case needed exclusion: every question text matches the official paper, every image matches its transcript, and the illegible/blank pages are genuinely so.
**No expected total mark was changed.** S2's marks, citations and arithmetic are sound; the errors are in tags, comment-truth lists, bank metadata and type boundaries.

### Most serious errors found (ranked by what they would do to the fix lanes)
1. **GS-M09-b is not a departure** (tagged departure-at-2-returns-at-3). Line 2's dropped sign is never worked from - line 3 is the correct (sin^3 - cos^3) - so nothing is adopted; by README convention 3 and by the app's own case law 10 ("Where the student returns and the excursion left nothing behind, do not mark a departure at all", `checkSolution.cjs:610-613`) the expected departure is NONE. As tagged, the regression test would have trained the grader to raise a departure on an ordinary slip. AMENDED (marks unchanged 2/3). **Consequence: the set has ZERO valid "departure that returns" cases - a spec section 2A coverage minimum is unmet** and needs a new answer text (S2b may not author text). CONFIRMED.
2. **GS-S02-a comment-truth list contains a TRUE statement as a must-not-claim.** "the student believes R is false" - but option (C) literally is "A is true, but R is false". A grader stating it would have been scored as fabricating. AMENDED (moved to commentMayMention; type stays null - the cause is still undiagnosable). CONFIRMED.
3. **Missed bank match: GS-M03 is in the bank** as `PYQ-M-2025-SAV-001` (identical A-R text, key (C), stored from set 30/1/2 Q19; bank text drops pi: '3 r2') `maths/surface-areas-and-volumes.pyq2025.ts:11-12`. S2 recorded inBank false. AMENDED. CONFIRMED.
4. **Bank text garbled for GS-M05's bank item** `PYQ-M-2025-CG-003` (`maths/coordinate-geometry.pyq2025.ts:28`): "(2a, a 7). Find the value(s) 9) and has diameter 10 units." - the point (11, -9), the minus sign and the sqrt2 are lost; S2's lossy-bank-text finding listed 3 entries and missed this one. **GS-S11's bank item** `PYQ-S-2025-CHEMRXN-010` merges OR-alternatives 27(a)+(b) and its answer/finalAnswer carry spill-over from Q28 (`science/chemicalReactions.pyq2025.ts:79-81`). Notes AMENDED. CONFIRMED.
5. **GS-M07-a (controller decision applied)**: golden follows CBSE MS instruction 10 "penalized only once" (MS 2025 30/1/1 p2, re-read) -> 1.5/2, `contested: true` with the app view (QUESTION_MISCOPY_PROMPT `checkSolution.cjs:1122` + case law 3 `:591` -> departure -> 0/2). CONFIRMED.
6. **GS-M15-a is the same CBSE-vs-departure conflict, not flagged by S2**: owner departure ruling -> 0.5 (kept); CBSE instruction 10 ECF reading -> 2.0 (step 3's x^2 - 8x + 1280 = 0 is correctly derived from the student's own equation; steps 4-5 stay 0 because the factorisation is fudged). Marked CONTESTED so the merger can put it to the owner alongside M07.
7. **Mistake-type boundaries the set pins but cannot settle** (all CONTESTED, S2 values kept): silly vs calculation where both app taxonomies name the exact pattern as silly (GS-M09-b "a dropped negative" `checkSolution.cjs:1331,1960`; GS-M04-b = the grader's own worked example "factors ... correctly but then writes a root as x = -4 instead of +4 - a SILLY sign-misread" `:1331`); GS-S13-a typed conceptual although (c)(i) of the same answer balances correctly (method understood -> slip); GS-S06-b "clotting cells" for "Name the component" (presentation vs knowledge gap); GS-S12-a vs GS-M22-a internally inconsistent (unattempted "then balance them" = conceptual, unattempted "verify your answer" = no type).
8. **Probe over-claims**: GS-M14-a "alternative-method" - the MS prescribes no solving method ("On solving (i) and (ii)"), so the case is a control (coverage of real alternative methods = 1 case, GS-M04-a); GS-M11-a's departure flag is optional (an invalid METHOD is equally app case law 8, `checkSolution.cjs:603`; 0/3 either way); GS-M24-a blank page - owner checklist says the grader "must say couldn't read", so a decline is acceptable and must not be scored as a total-marks miss; GS-S10-a missing arrows span both diagrams (one overall MS deduction) so wrongStep 1 or 2 is acceptable. All AMENDED as machine-readable fields.

## 3. Per item

| item | cases | citation (paper / Q / pdf p) re-checked | scheme & marks | verdict per case | notes |
|---|---|---|---|---|---|
| GS-M01 | 2 | MS2025 30/1/1 Q1 p3 OK | (D) 4, 1 OK | a AGREE; b AGREE | a: flawed working (k = 4/3 'nearest option 4'), right option -> 1, no type. b: k = 4 worked, wrote (A) -> 0, silly (copied wrongly) - defensible. |
| GS-M02 | 1 | MS2025 30/1/1 Q11 p5 OK | (B) 9 OK | a AGREE | bare correct option control. |
| GS-M03 | 2 | MS2025 30/1/1 Q20 p7 OK | (C) OK | a AMEND; b AMEND | bankMatch corrected (PYQ-M-2025-SAV-001). a: 3 pi r^2 treated as sphere TSA -> conceptual OK. b: correct pick, wrong 2 pi r^2 -> 1, no type OK. |
| GS-M04 | 2 | MS2025 30/1/1 Q22 p8 OK | 4 x 1/2 OK | a AGREE; b CONTESTED(type) | a: quadratic formula full marks OK. b: 1.5 OK; calculation vs silly contested (app's own worked example). |
| GS-M05 | 1 | MS2025 30/1/1 Q23 p8 OK | 4 x 1/2 OK | a AMEND | bank text garbled note added; control 2/2 OK; coordinate-geometry correct. |
| GS-M06 | 1 | MS2025 30/1/1 Q21(b) p8 OK | 1 1/2 + 1/2 OK | a AGREE | Hinglish, full marks. |
| GS-M07 | 1 | MS2025 30/1/1 Q24(a) p8; instr. 10 p2 OK | 4 x 1/2 OK | a CONTESTED(marks) | controller decision: 1.5 (CBSE) kept, app view 0/2 recorded. 54/8 = 6.75, 36/8 = 4.5, sum 11.25 OK (ECF arithmetic right). |
| GS-M08 | 1 | MS2025 30/1/1 Q25 p9 OK | 1/2 + 1 + 1/2 OK | a AGREE | image legible, struck-out line matches transcript. |
| GS-M09 | 2 | MS2025 30/1/1 Q27(a) p11 OK | 1/2,1,1/2,1/2,1/2 OK | a AGREE; b AMEND+CONTESTED(type) | b: departure tag removed (see section 2 #1); 2/3 kept (1 lost on the wrong line; 1/2 for the correct first term is within tolerance). |
| GS-M10 | 1 | MS2024 30/1/1 Q25(A) p8 OK | 4 x 1/2 OK | a AGREE | missing 'Hence ... irrational' -> 1.5, presentation. |
| GS-M11 | 1 | MS2025 30/1/1 Q29 p12 OK | 1/2,1,1,1/2 OK | a AMEND | 0/3 conceptual OK; departureFlagRequired=false (invalid-method = app case law 8 is equally right). |
| GS-M12 | 1 | MS2024 30/1/1 Q31 p12 OK | 1/2,1,1/2,1 OK | a AGREE | 1232/308 = 4 not 8; ECF on step 4 -> 2.5 per instruction 10. A computed wrong value carried is ECF under the app's own rule (b) too. |
| GS-M13 | 1 | MS2025 30/1/1 Q31 p12 OK | 1,1,1 OK | a AGREE | original and compressed both truly illegible (full-res crop checked). |
| GS-M14 | 1 | MS2025 30/1/1 Q32 p13 OK | 1 1/2,1 1/2,1,1 OK | a AMEND | probe 'alternative-method' replaced (MS prescribes no method). Arithmetic: 960+900 = 1860, 1080+800 = 1880 OK. |
| GS-M15 | 1 | MS2025 30/1/1 Q34(b) pp14-15 OK | 1/2,1 1/2,1 1/2,1,1/2 OK | a CONTESTED(marks) | 0.5 kept (owner departure ruling); CBSE-ECF alternative 2.0. Student quadratic x^2 - 8x + 1280 has no real roots; (x - 40)(x + 32) is fudged. |
| GS-M16 | 1 | MS2025 30/1/1 Q35 p15 OK | 1 1/2,1,1/2,1/2,1,1/2 OK | a AGREE | ERRATUM VERIFIED: f = 20 (18(44+f) = 752+20f); class width 2; mode = 19 + 7/22 x 2 = 19.636 ~ 19.64; MS's x 3 gives 19.95. Golden follows the correct mathematics (controller decision). |
| GS-M17 | 1 | MS2025 30/1/1 Q36 p16 OK | 1, 1/2+1/2, 1+1 OK | a AGREE | (ii) blank = unattempted, 3/4. |
| GS-M18 | 1 | MS2025 30/1/1 Q37 p17 OK | 1,1,1,1 OK | a AGREE | (i) 30 deg slip; (ii) 11 mm and (iii) 96.25 mm^2 independent and correct -> 3/4. |
| GS-M19 | 1 | MS2025 30/1/1 Q38 p18 OK | 4 x 1/2, 1, 1/2, 1/2 OK | a AMEND | unattemptedParts label aligned to '(iii)(a)'. h = 20(sqrt3+1) = 54.6, CE = 94.6 OK. |
| GS-M20 | 1 | MS2024 30/1/1 Q33(A) pp13-14 OK | 1,1,2,1/2,1/2 OK | a AGREE | image legible; AP chapter correct. |
| GS-M21 | 1 | MS2024 30/1/1 Q35 pp15-16 OK | 1,1,1/2,1,1/2,1/2,1/2 OK | a AGREE | no figure -> 4/5 presentation (MS 1 mark for 'Correct figure'). |
| GS-M22 | 1 | MS2024 30/1/1 Q21 p7 OK | 1 + 1/2, 1/2 OK | a CONTESTED(type) | 1.5 kept; null-unattempted vs presentation (pairs with GS-S12-a). |
| GS-M23 | 1 | MS2023 30/1/1 Q24 p9 OK | 1,1 OK | a AGREE | HCF(85,72) = 1 on the wrong problem -> 0, conceptual, genuine departure. In syllabus (FTA, not Euclid's lemma). |
| GS-M24 | 1 | MS2023 30/1/1 Q25 p9 OK | 1,1 OK | a AMEND | blank page; decline acceptable (owner checklist). |
| GS-S01 | 1 | MS2025 31/1/1 Q11 p3; QP p9 OK | C, 1 OK | a AGREE | Rryy/'recessive' wrong reasoning, right option -> 1, no type. Heredity retained. |
| GS-S02 | 1 | MS2025 31/1/1 Q19 p3; QP p13 OK | A, 1 OK | a AMEND | commentMustNotClaim error fixed (section 2 #2). |
| GS-S03 | 1 | SQP 2026-27 MS Q31 p7; SQP p11 OK | C 4.0 A, 1 OK | a AGREE | image legible, option ringed. |
| GS-S04 | 1 | MS2025 31/1/1 Q21 p3; QP p13 OK | 1,1 OK | a AGREE | figure description matches (Zn granules in dilute H2SO4, corked conical flask). |
| GS-S05 | 2 | MS2024 31/1/2 Q23 PDF p18 (printed 31/1/2 PAGE 5); QP 2024 31/1/2 p13 OK | 1 1/2, 1/2 OK | a AGREE; b AGREE | a: diagram geometrically correct (minor: hatch marks along the slab's lower face resemble a mirror convention; not unfair). b: prose instead of diagram 0/2 (1/2 within tolerance). |
| GS-S06 | 2 | MS2025 31/1/1 Q23(a) p4; QP p13 OK | 1, 1/2, 1/2 OK | a AGREE; b CONTESTED(type) | a: Hindi image legible, transcript matches. b: 1.5 kept; presentation vs knowledge gap. |
| GS-S07 | 1 | MS2025 31/1/1 Q24 p4; QP p15 OK | 1/2,1/2,1 OK | a AGREE | formula line missing -> 1.5, presentation (question says 'Use lens formula'). |
| GS-S08 | 1 | MS2024 31/1/2 Q22(B) PDF p17 (printed PAGE 4); QP p13 OK | 4 x 1/2 OK | a AGREE | missing 'W' -> 1.5 per owner doctrine CLAUDE.md section 13. Weak probe: the question says 'in watts', so an examiner who does not deduct is defensible (not contested because the owner doctrine is explicit). |
| GS-S09 | 2 | MS2025 31/1/1 Q32 p7; QP p17 OK | 1,1,1 OK | a AGREE; b AGREE | a: 2/100 slip, ECF (b) 0.27 A, (c) 1.6 V -> 2.5 (1/2 for (a) because R1 = 6 ohm is one of the MS's displayed lines; 0 within tolerance). b: self-corrected -> 3/3. |
| GS-S10 | 1 | MS2025 31/1/1 Q31 p7 (arrow note); QP p17 OK | 1 1/2, 1 1/2 OK | a AMEND | 2.5 kept (one overall arrow deduction, instruction 10); wrongStepAcceptable [1,2]. Diagrams verified correct. |
| GS-S11 | 1 | MS2025 31/2/1 Q27(b) p5; QP 31/2/1 p15 OK | 1,1,1 OK | a AMEND | full marks, no presentation tag (MS 'Do not deduct marks if physical state not given' - note applies to both equations). Bank note added. |
| GS-S12 | 2 | MS2024 31/1/2 Q26 PDF p18; QP p13 OK | 4 x 1/2 OK | a CONTESTED(type); b AGREE | a: 1/2 kept. b: 2Al + 3H2O -> Al2O3 + 2H2 miscount -> 1.5 calculation OK. |
| GS-S13 | 1 | MS2025 31/1/1 Q37 p10; rule 31/1/3 Q26 PDF p29; QP p25 OK | 1, 1/2+1/2, 1/2, 1/2, 1 OK | a CONTESTED(type) | 3.5 kept; bank chapter wrong (CHEMRXN-021) CONFIRMED. |
| GS-S14 | 1 | MS2025 31/1/1 Q38 p11; QP pp25,27 OK | 1/2,1/2,1,1,1 OK | a AGREE | image legible ('messy' is mild); bank chapter wrong (CHEMRXN-022) CONFIRMED. |
| GS-S15 | 1 | MS2025 31/1/1 Q39 p11; QP p27 OK | 1/2,1/2,1/2,1/2,1,1 OK | a AGREE | 4.54 A as 'rating' -> 3.5 conceptual; domestic circuits retained; bank entry corrupt/misfiled (LIFEP-008) CONFIRMED. |
| GS-S16 | 1 | MS2025 31/1/1 Q36(a) p9; QP p23 OK | 1/2 x4, 2, 1/2, 1/2 OK | a AGREE | -4 m slip; (ii) independent: v = (-2)(-20) = +40 cm, f = 13.3 cm, so 40 cm is beyond 2F (26.7 cm) - student correct. (MS itself prints 'f = 10/-2.5' - typo, result -0.4 m right.) |
| GS-S17 | 1 | SQP 2026-27 MS Q14 p2; SQP p3 OK | 3 total; 1+1+1 judgement OK | a AGREE | 1000 x 10 = 1,00,000 slip -> 2/3 calculation. |
| GS-S18 | 1 | SQP 2026-27 MS Q15 p2; SQP pp3-4 OK | 1,1,2 OK | a AGREE | 9/16 vs 3/16 -> 3/4 conceptual; heredity retained. |
| GS-S19 | 1 | SQP 2026-27 MS Q33 p7; SQP p12 OK | 1,1 OK | a AGREE | ERRATUM VERIFIED (zoomed render): MS prints n21 = v2/v1; correct v1/v2. Golden follows the physics. |

## 4. Contested cases (S2 value kept; `contested: true` + `contestedViews` in items.verified.json; `contested`/`contestedAlternative` in the flat table)

| case | dimension | golden (kept) | alternative | why it cannot be settled from the scheme |
|---|---|---|---|---|
| GS-M07-a | marks | 1.5, silly (CBSE instr. 10; controller) | 0/2 (app: miscopy = departure, `checkSolution.cjs:1122`, `:591`) | controller decision - report as a finding |
| GS-M15-a | marks | 0.5 (owner departure ruling) | 2.0 (CBSE instr. 10 ECF on step 3; 4-5 fudged = 0) | owner ruling vs CBSE published instruction - same shape as M07 |
| GS-M04-b | type | calculation | silly (grader's own worked example `:1331`) | owner rule does not say whether a wrong root read off correct factors is 'copied' or 'performed' wrongly; bucket identical (careless) |
| GS-M09-b | type | calculation | silly ('a dropped negative' in both taxonomies `:1331`, `:1960`) | same; bucket identical |
| GS-S13-a | type | conceptual (app S4a) | silly / careless | owner: conceptual = method misunderstood, but (c)(i) of the same answer balances correctly |
| GS-S06-b | type | presentation | conceptual / knowledge gap | 'Name the component' - the name IS the answer; no app taxonomy lists a technical term as presentation |
| GS-S12-a | type | conceptual (app S4a) | null / unattempted sub-task | inconsistent with GS-M22-a's treatment of an unattempted instruction |
| GS-M22-a | type | null / unattempted | presentation (app rule 3 'no "verified" line', contradicted by rule 6 `:1335`) | the app contradicts itself; owner ruling speaks of 'parts' |

Recommendation to the merger: score the five type-only contests on the student-facing BUCKET as well as the raw type, and report the raw-type misses on these cases separately as taxonomy-definition conflicts (owner ruling vs app prompt), not as grader errors.

## 5. Coverage after verification (spec section 2A minimums)
- departure that RETURNS: **0** valid cases (was 1; GS-M09-b is an ordinary slip) - **minimum UNMET**; needs a new answer where a wrong value is worked from for >= 2 lines and the student then picks the real question up again.
- departure that never returns: 3 (GS-M15-a, GS-M23-a; GS-M11-a with the flag optional).
- alternative valid method: 1 (GS-M04-a; GS-M14-a re-tagged).
- all other minimums still met (1/2/3/4/5-mark items, MCQ + A-R both directions, corrected slip x2, ECF x3, multi-part independent later parts x4, unattempted x3, presentation (units/formula/conclusion/diagram), balanced vs unbalanced x3, diagram-dependent x4, illegible, blank, trig-vs-polynomials chapter probe x2).

## 6. Findings for the merger that are about the APP, surfaced while verifying (not golden-set changes)
1. **Taxonomy conflict, owner vs both grader prompts** (CONFIRMED read @53fe4d22): both taxonomies define "silly" to include "a dropped negative" and (single grader) "swapped values" plus a worked example of a wrong root read off correct factors (`checkSolution.cjs:1331`, `:1960`); the owner ruling puts "performed wrongly" under calculation. Expect systematic type misses on GS-M04-b / GS-M09-b that are definition conflicts.
2. **App ECF_POLICY_V2 vs CBSE instruction 10** (CONFIRMED): miscopy (case law 3, `:591`) and adopted wrong value/equation (case law 1) zero everything below; CBSE says "penalized only once". GS-M07-a (controller: CBSE wins) and GS-M15-a (contested) are the two golden probes.
3. **App rule 6 NOTE vs owner fourth state** (CONFIRMED, `checkSolution.cjs:1335` 'NOTE ON NON-ATTEMPTS'): a legible "don't know" is graded status "incorrect"; owner: an unattempted part is never a 'wrong answer' (GS-M19-a, S2 already noted).
4. **Me/Progress bucket mapping contradicts the owner ruling** (S2's finding re-CONFIRMED): `lazytopper/src/pages/MeProgressPage.tsx:117` `const CARELESS_TYPES = new Set(["silly", "presentation"]);` and `:119` `const KNOWLEDGE_TYPES = new Set(["conceptual", "calculation"]);` vs CURRENT_STATE.md:5125-5127 (calculation + silly = 'you already know this'; presentation alone = 'the quickest wins').
5. **Bank quality** (CONFIRMED): besides S2's list, `PYQ-M-2025-CG-003` text garbled (`maths/coordinate-geometry.pyq2025.ts:28`), `PYQ-S-2025-CHEMRXN-010` merges OR-alternatives and carries Q28 spill-over (`science/chemicalReactions.pyq2025.ts:79-81`), `PYQ-M-2025-SAV-001` drops pi (`maths/surface-areas-and-volumes.pyq2025.ts:12`). S2's three wrong-chapter bank entries (CHEMRXN-021, CHEMRXN-022, LIFEP-008) re-confirmed by reading.
6. **Incidental (outside grading, CONFIRMED read)**: `lazytopper/src/lib/desktop/topics.ts:86` coordinate-geometry blurb `"Distance formula, section formula, and area of a triangle from coordinates."` advertises a sub-topic deleted for 2026-27 ("Area of a Triangle in Coordinate Geometry"); topics.ts is a guard-scanned board-prep surface but the wording evades the guard's exact phrases.
7. **SQP 2026-27 Science is subject-wise** (S2's claim CONFIRMED on SQP p1: "Section A is Biology, Section B is Chemistry and Section C is Physics"), while every SQP page carries the footnote "*There is no change in the Question Paper Design and Assessment Pattern for Academic Session 2026-27." - S2's "the 2027 board paper will look like this" remains PLAUSIBLE.
8. **Official-source errata re-verified**: MS 2025 30/1/1 Q35 (x 3 -> 19.95; correct width 2 -> 19.64); SQP 2026-27 MS Q33(B) (v2/v1; correct v1/v2). Additionally noticed: MS 2025 31/1/1 Q36(a)(i) prints "f = 10/-2.5 = -0.4 m" (typo; result correct) - not used by any case.

## 7. Facts not established
1. Byte-identity of S2's compressed images with a real browser canvas encoder (S2's own caveat; not re-tested).
2. S2's claim that no oesophagus/'food pipe' question exists in any 2023-2025 Class X Science MS - not re-searched.
3. S2's claim about SQP 2026-27 Science MS Q35 (garbled lens formula) - not re-read (no case uses it).
4. Whether the owner regards a wrong equation in a word problem (GS-M15-a) as a departure or as a penalise-once error - owner/controller decision needed.
5. Whether the owner regards "don't know", an unattempted instruction ('verify', 'balance them') and a missing technical term as fourth-state / presentation / knowledge gap - the five type contests.
6. What an individual CBSE examiner would do on the four tolerance cases S2 already flagged (S05-b 0 vs 1/2, S09-a 1/2 vs 0, S17-a 0 vs 1/2, M09-b step 2 0 vs 1/2) - all within 1/2; left as S2 set them.
7. Whether S3 reads the new optional fields (`contested`, `departureFlagRequired`, `wrongStepAcceptable`, `declineAcceptable`, `acceptableOutcomes`); they are additive and ignorable.

## 8. Outputs
- `golden/verify/items.verified.json` - S2's items with every AMEND applied, contested cases marked, `verify.verdict` per case, `excluded: false` on every case (no exclusions).
- `golden/verify/expected_flat.verified.json` - regenerated flat table (S2's columns + expectedStudentHeading, contested, contestedDimension, contestedAlternative, departureFlagRequired, wrongStepAcceptable, declineAcceptable, excluded, verifyVerdict).
- `golden/verify/changelog.json` - one entry per change (target, field, old, new, reason, citation).
- `golden/verify/tools/apply_verification.py`, `tools/write_report.py` - reproducible; zero model calls.

## 9. Changelog digest
- `bankMatch`: 1
- `bankMatch.note`: 2
- `expected.acceptableOutcomes`: 1
- `expected.commentMayMention`: 1
- `expected.commentMustNotClaim`: 1
- `expected.contested`: 8
- `expected.departure`: 1
- `expected.departureFlagRequired`: 1
- `expected.examinerNote`: 1
- `expected.studentHeading`: 25
- `expected.unattemptedParts`: 1
- `expected.wrongStepAcceptable`: 1
- `probes`: 4

## 10. Deviations
- KEY_LEAK_SCAN not run with a key: the key was never loaded (cap 0, no model call, no harness); an attempt to source the env file solely to run the byte-compare scan was denied by the permission classifier and was not pursued. Nothing in golden/verify/ was produced from any key-bearing process.
- Worktree `C:/Projects/LT-worktrees/ga1-s2b` left in place, clean (`git status --porcelain` empty, HEAD 53fe4d22c9359b09f32842a91acff8e1316b777d).

## 11. Addendum (controller follow-up, same day)
- Supplement GS-SUP-01..03 authored in `golden/supplement/` (README there): two departure-that-returns cases (Maths GS-M17 base, Science GS-S15 base) restore the spec section 2A minimum; one copied-wrongly case (GS-S07 base) contested as GS-M07-a.
- Late finding, not raised in sections 2-6: the app's ECF case law 2 (`lazytopper/server/routes/checkSolution.cjs:588-590` @53fe4d22, anchor `2. A slip the student then CORRECTS`) says "deduct only for the slip itself" for a self-corrected slip. S2's GS-S09-b (3/3) and GS-M08-a (2/2) follow the examiner convention that cancelled/corrected work is not assessed; a grader obeying case law 2 would give 2.5/3 and possibly 1.5-2/2. Not marked contested in items.verified.json (S3 is mid-run on it); the merger should treat a ½ deduction on those two cases as an app-rule conflict, not a grader error.

STATUS: DONE (S2b, 2026-10-05). CALLS USED 0 / cap 0.
