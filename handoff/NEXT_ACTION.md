# LazyTopper — Next Action
# Updated: 2026-06-22 (post-PR #286 — **PYQ symbol-integrity pass MERGED** (trunk `b600e2b`): the parallel symbol-fix track closed the SOURCE-DATA gap #284 flagged — audited all 103 PYQ packs / 759 Qs in an isolated worktree, 3 commits squash-merged: (1) 12 √/operator recoveries (answer-/twin-verified, ~35 answer-only-√ false-positives left alone), (2) withhold 38 unservable Qs via a single `WITHHELD_QUESTION_IDS` filter on `canonicalQuestionBank` (17 Science bilingual + 21 Maths blank/garbled/answer-mismatch/mojibake; RAW 6579→LIVE 6541, Δ38; 349 `...PACK` spreads byte-identical to trunk), (3) §7 °/π/√ normalize in 5 areas Qs. `questionText`+`WITHHELD_QUESTION_IDS` only; `predictionTypes.ts`/answers/marks untouched. Gates GREEN; owner squash-merged; no self-merge. ⚠️ withheld Qs stop serving on **MERGE+REDEPLOY**, not push. **IMMEDIATE NEXT is UNCHANGED — the worksheet track's PR-E2b (below).** The PYQ track is now OWNER-DRIVEN: **[FU-PYQ-OWNER-LOOKUP]** (supply 14 unrecoverable Maths expressions from the real papers — batched by paper code in `diff/PYQ_batch_for_owner_lookup_2026-06-21.md` → 2nd-pass patch un-withholds each), then [FU-PYQ-REEXTRACT-SCIENCE] (17 bilingual Science Qs), [FU-PYQ-ANSWER-FIELD-SYMBOLS] (answers still √-stripped), [FU-PYQ-CORRUPTION-DETECTOR] (both-subject mojibake + answer-consistency; `mismatch_scan.py` √-regex reads one char), [FU-PYQ-ANGLE-NORMALIZE] (`Ð`→`∠` + residual °/π/superscript). Previously post-PR #280/#283/#284 — **Worksheet rebuild E2a → E2a.3 MERGED** (trunk `cfff277`): worksheet FOUNDATION done — ONE responsive generator + distribution (even/weightage/MI, honest counts) + deleted-topics filter + real-math downloadable PDFs (MathText/KaTeX → html2canvas → jsPDF FILE download, Option B) + persist-by-`worksheetId` + view-aware Back + MI-enrich as a NAVY anchor in the right preview with honest signed-out/locked states. Missing-symbol = **SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated; `real-numbers.pyq*.ts` √-stripped questionText) → parallel symbol-fix agent (`diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`). #281 closed (superseded by #283). Full handoff: **`handoff/WORKSHEET_TRACK_HANDOFF.md`**. **IMMEDIATE NEXT (worksheet track): PR-E2b** — the AI grade loop (extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1…QN via `getWorksheetSession`; wire `recordMistake` through the MI front door; mandatory 5-Q live-verify). New follow-ups: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE], PYQ √-data audit (all subjects). Previously post-PR #278 — **CLAUDE.md governance refresh MERGED** (trunk `f7170ef`): surgical root-file edit (CLAUDE.md ONLY, +37/−9; product PR, owner-merged, no self-merge; isolated worktree `chore/claude-md-refresh` off `b4163ef`, squash `f7170ef`). ADDED §2a Worktree Isolation (every task in its own `git worktree`; verify `git branch --show-current` before each commit — three prior shared-checkout collisions, one swept product into a docs merge); DE-HARDCODED the root matrix count in §6/§6a (was "175/175" → "count grows, verify, don't hardcode"); Replit→"CI linux runner / GitHub Codespaces" (Replit retired); ADDED the verification doctrine (static gates ≠ live path; live round-trips need ONE real owner live-exec before "done"); §13 CBSE 2025-26→**2026-27** + competency-split line (~50% competency / 20% MCQ / 30% short-and-long; step minimums A=1/B=2/C=3/D=5/E=4 unchanged); ADDED the marks-bucket gotcha to §7 (the PR-E1 lesson — "1/23/5/4" buckets fuse 2-and-3-mark; filter exact ranges by numeric `q.marks`); ADDED to §5 the MockBuilder-retired + MI-sidebar-chrome-only + re-read-`syllabusGuard.ts` rules. §3/§8/§9/§10/§11/§12 + all gate COMMANDS untouched. Pre-existing line-1 UTF-8 BOM left as-is (owner decision; cosmetic). **IMMEDIATE NEXT unchanged: PR-E2 (Worksheet), branched fresh from `f7170ef`.** Previously post-PR #276 — **Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter + Chapter-test wired + MockBuilder un-routed — MERGED** (trunk `1de6f3e`): the PR-E wiring stage, built in an isolated worktree (`feat/practise-filter-chaptertest`, off `acc419b`), landed as 3 commits squashed to `1de6f3e` (one impl + two owner-found behavioral round-trips). **(1)** concept-row "Practise" now routes DIRECTLY to Quick Practice (`buildDesktopConceptPracticePath` → `/practice/:grade/:subject`) not the generic `/practice-hub`. **(2)** EXACT mark-band filtering (Option A) — first cut used the page's coarse `marksFilter` buckets, but they FUSE 2-and-3-mark into one `"23"` bucket (`PracticePage.tsx:53`) so "3–5" leaked 2-mark + "2–3" couldn't isolate 3-mark (owner-caught); fixed to emit numeric `marksMin`/`marksMax` and filter on `Number(q.marks) ∈ [min,max]`; lossy `markBandToBuckets` removed. **(3)** single-pool count fix — the "N available" hint and the displayed set were two independent `generatePracticeSet` draws (hint promised 10, display held 5–6); unified behind `selectInRangeFromPool` so both read the SAME pool (`available >= displayed`), thin-bank honesty preserved. **(4)** PATH-CONDITIONAL held — range only on the concept-row entry; the hub entry stays "All"/student-controlled. **(5)** back-nav passes `backLabel:"Back to {Topic}"` + the specific Topic Hub route (was a generic default). **(6)** applied-filter indicator on the concept-row entry only. **(7)** Chapter-test button WIRED to the existing `/chapter-test/:grade/:subject/:topicKey` page (page not redesigned → [FU-CHAPTERTEST-PAGE-REDESIGN]). **(8)** MockBuilder UN-ROUTED (both `/mock-builder` routes redirect to `/practice-hub`, tagged `PR-G-deletion-pending`, file kept; ONLY `App.tsx` touch). Worksheet stays "Soon" → PR-E2. **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.** Gates GREEN (tsc, root matrix 181/181, ops matrix, mojibake, scope:guard product, diff-check); CI `quality-gate` GREEN (vitest + linux build). Owner LIVE-VERIFIED + squash-merged; branch+worktree cleaned. Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`. **IMMEDIATE NEXT (Topic Hub queue, owner-authorized separately, branched fresh from `1de6f3e`): PR-E2** (Worksheet — its own locked spec) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: PR-D.1 (mobile tutor toggle), [FU-CONTEXTUAL-TUTOR-REBUILD], [FU-CHAPTERTEST-PAGE-REDESIGN]. Previously post-PR #274 — **Topic Hub PR-D final-IA LAYOUT MERGED** (trunk `b57fa79`): `ConceptSpine` rebuilt to MATCH the binding mockup — learn-first concepts hero + "Learn the N concepts"; receded dashed action band with 3 buttons ("Practise this topic" primary routes to existing topic practice; "Chapter test"/"Worksheet" inert "Soon" → PR-E); unified **Notes** toggle replacing the Formula/Proofs/Practice-all tabs (honest coming-soon); clickable expandable **Examiner's tips** seeding the 1 real `examinerWarning` (no fabrication, content → PR-F); per-row `✦ Visual` badge only where `findVisualForConcept` non-null; concept "Practise" carries concept + `markBand`; **MI stays sidebar chrome, none on page body** (#270/#271). One responsive component, pure-CSS reflow, class-driven. 4 files +515/−175; isolated worktree; gates GREEN (tsc, mojibake, scope:guard mixed, root matrix 181/181, ops matrix, diff-check, forbidden-file); CI `quality-gate` GREEN (vitest + linux build). Owner live-verified the layout = GOOD, squash-merged; branch+worktree cleaned. **Item 7 (mobile full-screen tutor toggle) SPLIT to PR-D.1** (owner-approved). **NEW [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-Practise lands on `/practice-hub` not Quick Practice + `markBand` string never consumed (page wants numeric `marksFilter` buckets `1/23/5/4`); path-conditional fix. **Decisions:** MockBuilder RETIRED (un-routed + tagged for PR-G deletion, code kept — MI auto-captures the revisit need); [FU-BOOKMARK-SAVE-QUESTION] logged for later. **IMMEDIATE NEXT (Topic Hub queue, owner-authorized separately, branched fresh from `b57fa79`): PR-E** (chapter-test + worksheet wiring + [FU-PRACTISE-CONCEPT-FILTER]) → PR-F (content) → PR-G (delete dead old-mobile + retired MockBuilder/TutorDrawerV2/MentorPanel). Separately: PR-D.1 (mobile tutor toggle), [FU-CONTEXTUAL-TUTOR-REBUILD]. Previously post-PR #265 + #264 — **Bank Expansion Phase 1, Batch 2 (45 net-new) + vitest-infra MERGED** (trunk `381e9df`): #264 vitest-infra (`2ef0b2c`) then #265 Batch 2 (`381e9df`). **Batch 2 (THE DECOUPLE):** Coordinate-Geometry 22 + Areas-Related-to-Circles 23 net-new authentic Exemplar Qs + AI step-marked solutions (owner-verified). New `*.exemplar2.ts` files; `AI_GENERATED_SOLUTION_IDS` extended; **`predictionTypes.ts` NOT touched**. Section split A=9/B=16/C=17/D=3. Syllabus: CG **Area-of-Triangle-in-Coordinate-Geometry excluded** (7); figure-locked dropped (13); 1 unrecoverable-options MCQ dropped; 3 `// ⚠ RECON` flagged. `[N mark]` sums to marks; finalAnswers cross-checked vs key. Gates GREEN (validator 45/45, root matrix 181/181, CI quality-gate); Codespaces vitest no-regression. **FIGURE-LOCKED CENSUS:** 67 in-scope (42 high-mark C+D) — Triangles 18 · ARC 17 · Circles 15 lead → [FU-DIAGRAM-RECOVERY]. **#264 [FU-VITEST-INFRA] RESOLVED:** `@testing-library/dom` direct devDep + `setup.ts` window-guard; lockfile regenerated in Codespaces (pnpm 10.32.1); **vitest now 11/11 suites, 63/63 GREEN**. **IMMEDIATE NEXT (owner; queued, branched fresh from `381e9df`): Batch 3 — Triangles + Circles** (holds most of the 42 high-mark figure-locked items → the diagram-recovery decision converges here) → Batch 4 (Trigonometry + Pair-of-Linear-Eq; Trig drops complementary-angle ratios) → Batch 5 (Real-Numbers + Polynomials; Euclid + cubic-zeroes-coeff dropped). Carried follow-ups: [FU-EXEMPLAR-STAT-13.4], [FU-EXEMPLAR-DEFERRED-NETNEW] (CG Ex7.3 Q12,14,15 + ARC Ex11.4 Q7,9,10,11,13,19), [FU-DIAGRAM-RECOVERY]. Previously post-PR #262 — **Bank Expansion Phase 1, Batch 1 MERGED** (trunk `444238b`): 60 net-new NCERT-Exemplar Maths questions (authentic, verbatim) + AI step-marked solutions (owner-verified) — THE DECOUPLE. **AP 24 + Statistics 16 + Surface-Areas-&-Volumes 20** in new `*.exemplar2.ts` files; solution-provenance via NEW `AI_GENERATED_SOLUTION_IDS` id-set (`predictionTypes.ts` NOT touched — gated-field STOP avoided by the id-set). Syllabus-filtered at question level (frustum + conversion-of-solids + ogive dropped as banned; probability out-of-scope; 6 figure-locked + 1 unreconstructable dropped, never guessed; 3 `// ⚠ RECON` items flagged). `[N mark]` steps sum to marks; finalAnswers cross-checked vs official key (jeep2an.pdf). Gates GREEN: tsc, per-question validator 60/60, mojibake, root matrix 181/181 (incl. syllabus guard over the new files), ops matrix, scope:guard, git diff --check; CI `quality-gate` GREEN (linux build); **Codespaces vitest NO REGRESSION vs base `444238b`** (18/18 executable pass incl. provenance suites; 7 suite-load failures are a pre-existing infra gap — missing `@testing-library/dom` + jsdom env — identical on untouched base). Owner verified questions + solutions and merged (no self-merge). **IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `444238b`): Batch 2 — Areas-Related-to-Circles + Coordinate-Geometry** → Batch 3 (Triangles + Circles) → Batch 4 (Trigonometry + Pair-of-Linear-Eq) → Batch 5 (Real-Numbers + Polynomials). New follow-ups: **[FU-VITEST-INFRA]** (add `@testing-library/dom` + jsdom env so vitest suites load), **[FU-EXEMPLAR-STAT-13.4]** (Stats LA Ex 13.4 question text not extractable from jeep213.pdf), **[FU-EXEMPLAR-DEFERRED-NETNEW]** (AP Ex 5.3 extras + reasoning parts for a later top-up); Fix B [FU-TOPICKEY-CONSOLIDATION] now covers these new rows. Previously post-PR #259 — **AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock MERGED** (trunk `775ee75`): the ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` (authentic 1.0 / predicted 0.6 / ai 0.3) only reached `getLikelyQuestionsForConcept` (Quick Practice / topic practice); the mock engines use `getAllQuestions()` + own selection and still drew AI at full parity. Extended the SAME soft demotion (reused PR2a's ONE multiplier — exported `getSourceMultiplier`, no fork). **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` `predWeight *= getSourceMultiplier(q)` per section/marks slot + new `sourceWeightedPick` for an authentic-first archetype prefill. **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)`. **⚠️ Boundary correction:** HPQ (`highlyProbableQuestions.ts`) does NOT use `getAllQuestions()` — it's a hand-authored curated bank with ZERO AI-pack content → nothing to demote; left untouched (no cosmetic no-op). **All AI-bearing surfaces now covered: practice (PR2a) + Full Mock + Topic Mock (this PR); HPQ already AI-free.** Structure-preserving (per-pool, soft, never 0 → authentic-thin slot still fills with AI; counts/blueprint unchanged). New follow-up **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (`difficultyAwarePractice`/`difficultyAutoSuggest` also serve AI at parity; out of scope, not touched). `mockEngineSource.test.ts` — **Codespaces vitest 7/7 PASS** (CI does NOT run vitest). CI GREEN (root matrix 181/181; linux build); owner squash-merged; branch deleted. `predictionTypes.ts` untouched. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `775ee75`): **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items → **[FU-AITIER-RANK-DIFFICULTY-HELPERS]**. Previously post-PR #257 — **AI-tier PR2b strip fabricated `pastBoardYear` MERGED** (trunk `d6e0e14`): anti-fabrication — predicted/HPQ questions claimed a board year with no traceable PYQ reference (authentic uses `pyqYear`; authentic tree has ZERO `pastBoardYear`). **⚠️ Boundary corrected: instruction assumed 75 values / 2 files; exhaustive enumeration (owner-mandated first) found 96 / 5** — `predictedQuestions.ts` 55, `predictedQuestionsScience.ts` 20 (incl. 8 `"Model"`), `class10SciencePredictiveEngine.ts` 12, `highlyProbableQuestions.ts` 8 (HPQ), `hpq_phase2_acceptance.entry.ts` 1 (fixture). Stripped all 96 (field-removal only); all 8 `.pastBoardYear` reads cleaned → dedup **score-only**, `sourceYearHint` → `targetYear-1`, dead 5-signal-input fields removed. **`predictionTypes.ts` NOT touched** (optional field stays declared). **HPQ confidence proven UNAFFECTED** — scorers read dataset `sourceYear`, never `pastBoardYear` (dead plumbing); only dedup tiebreaker changed. Count-integrity: served bank 6,715 unchanged, `pastBoardYear_remaining=0`. Codespaces vitest 9/9 (5 PR2b + 4 PR2a regression). CI GREEN (root matrix 181/181; linux build); owner squash-merged; branch deleted. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `d6e0e14`): **[FU-AITIER-RANK-MOCKS-HPQ]** (apply `sourceMultiplier` to Full Mock / Topic Mock / HPQ — they use `getAllQuestions()` + own selection) → deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7. Previously post-PR #255 — **AI-tier PR2a source-provenance stamp + soft AI-lower ranking MERGED** (trunk `686f737`): ARCHITECTURAL — the provenance + ranking half of the audit's PR2. `AI_GENERATED_QUESTION_IDS` stamped at ingest from the 54 `.pack[1-3]` arrays (additive, `canonicalQuestionBank.ts`; bank untouched → counts unchanged); `_source` tier (`authentic`/`ai-generated`/`predicted`) on the LOCAL `CanonicalQuestionWithScore` intersection (forbidden `predictionTypes.ts` NOT touched); `getAdjustedScore *= SOURCE_MULTIPLIER {authentic 1.0 / predicted 0.6 / ai 0.3}` (owner-locked; soft, never zero). **Covers Quick Practice / topic practice** (`getLikelyQuestionsForConcept`); **Full Mock / Topic Mock / HPQ use `getAllQuestions()` + own selection → [FU-AITIER-RANK-MOCKS-HPQ]**. Live split (Codespaces): 6,715 = 3,710 auth (55.3%) + 2,764 ai (41.2%) + 241 predicted, 0 unstamped. vitest 4/4 in Codespaces (CI quality-gate does NOT run vitest). **Owner live-verify PASS** — ~50%-AI topics serve all authentic in the top 10 (first AI @#97 Real Numbers / #127 Triangles / #186 Trigonometry). Decisions locked: multipliers `1.0/0.6/0.3`; **curated-26 stay authentic → [FU-CURATED-26-PROVENANCE]**. CI GREEN (root matrix 181/181; linux build); owner squash-merged; branch deleted. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `686f737`): **PR2b** (`pastBoardYear` strip — unblocked by this stamp) → **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking) → deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7. Previously post-PR #253 — **AI-tier PR1b pack-file 5-mark retags MERGED** (trunk `f83915b`): relabel-only follow-up to #251. **12** genuine 5-mark pack long-answers relabelled `format:"Short"→"Long"` (`ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046, HEC2-039, LT2-016/024, ME2-025, REP2-048` — each confirmed by reading its `questionText`). **`PR2-018` reclassified** on inspection (single-step `7/12` one-liner, not an LA) → moved to quarantine; Group A = 12 not 13. **7 QUARANTINED** (`TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018`) kept pinned + annotated → **[FU-AITIER-MARKS-MISMATCH]** (marks/content pass, NOT a relabel). **Backlog 19→7**; count UNCHANGED. **[FU-AITIER-PACK-5MK-SHORT] RESOLVED** (relabel half). CI GREEN (root matrix 181/181 with backlog 7); owner squash-merged. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `f83915b`): **PR2** (source-provenance stamp + AI-lower-ranking enforcement in `getAdjustedScore` + `pastBoardYear` strip); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7. Previously post-PR #251 — **AI-tier PR1 mechanical content-integrity MERGED** (trunk `f4a41b6`): `QuestionKind` += `"Long"` (both predicted files; + `toCanonicalFormat` propagation), **24** five-mark Section-D predicted items retagged `Short→Long`, fused **Q10** (`2026-RN-LA-03`) split into `2026-RN-SA-08` (LCM, C/3mk) + `2026-RN-SA-09` (√5 proof, C/3mk) [net +1], and `aiTierContentIntegrityGuard` added to the root matrix (175→181). **[FU-MALFORMED-QUESTION] RESOLVED.** Audit undercounted → **[FU-AITIER-PACK-5MK-SHORT]**: 19 more `format:"Short"` defects in gated `.pack` files pinned as a shrink-only backlog for **PR1b**. CI GREEN; owner squash-merged. IMMEDIATE NEXT (owner; queued, each its own instruction branched fresh from `f4a41b6`): **PR1b** (retag the 19 genuine pack LA; QUARANTINE content↔marks mismatches like `TG3-056`/`REP2-039`) → **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip). Previously post-PR #249 — **"Finish session" scorecard trigger MERGED** (trunk `704dcff`): replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared "Finish session" button (always-available at the set foot, both widths) → fires `practice_finish_session_click` + sets `sessionFinished` → surfaces the scorecard. `allDone` kept as a convenience auto-offer. Reuses the EXISTING `sessionStats` — no new counters/persistence/state machine. Partial-session honesty PROVEN in owner live-verify (a 3-of-10 finish reads "3 of 10 attempted · 0/3 MCQs correct · 0% accuracy · the 7 you didn't reach aren't counted"; zero-attempt honest too). CI GREEN. Supersedes #240 sub-task 5. [FU-SESSION-SCORECARD-TRIGGER] CLOSED. NEW: **[FU-MALFORMED-QUESTION]** (Real Numbers Quick Practice Q10 fused alarm-clock LCM + prove √5 with inconsistent 5-mark/Section-D/Short tags; suspected AI-generated pack origin) — for the upcoming read-only AI-generated-question-tier audit. IMMEDIATE NEXT (owner; its own instruction, branched fresh from `704dcff`): **read-only AI-generated-question-tier audit**. Previously post-PR #246 — Check & Improve detect-then-confirm + question photo upload MERGED (trunk `c9404e1`): the UX layer on Claim 2 (#244). Detection is now VISIBLE + CORRECTABLE before grading. "Read the question →" → detection-only `POST /api/detect-question` → confirmation chip (subject·topic·marks + source) + quiet [Change] (constrained correction; corrected mark → marksSource "user") → grade on CONFIRMED values via the unchanged trusted path. Question photo upload added (distinct slot). Override logged on the attempt record (reuses recordAttempt; no new collection). **`SHOW_DETECTION_META` flag default=ON for testing — ⚠️ MUST flip to OFF before student launch ([FU-DETECTION-META-LAUNCH-FLIP], hard pre-launch gate).** Bank-grounding deferred behind Fix B. CI GREEN. **Owner live-verify of #246 = PASS 5/6** (printed marks correct; inference genuine + graduated AP=2 vs proof=3; topics bucket clean; selectors gone both widths). The 6th: **[FU-DETECTION-MARKS-CEILING]** — inference under-calls true 5-mark questions (multi-part numerical + proofs) as 3; caught-and-correctable via [Change], NOT a blocker. QUEUED NEXT (owner; NOT yet authorized — each its own instruction, branched fresh from `c9404e1`): (ii) "Finish session" scorecard-trigger PR → (iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]; then (2) MI eval ([MI-EVAL]) → (3) Stage 3 ([FU-DRILL-ENRICHMENT]) → Fix B [FU-TOPICKEY-CONSOLIDATION] when authorized. PRE-LAUNCH gate: [FU-DETECTION-META-LAUNCH-FLIP]. Carried: [FU-SPELLING-GATED-REMAINDER] + [FU-TOPICKEY-CONSOLIDATION] + [FU-DETECTION-META-LAUNCH-FLIP] + [FU-DETECTION-MARKS-CEILING] + [FU-IMPROVEMENT-CARD] + [FU-WEAKAREA-ALIAS-DISPLAY] + [FU-ATTEMPT-MARKS-ACCURACY] + [FU-ATTEMPT-SR] + [FU-ME-REFRESH] + [FU-GRADE-MARKSCALE]/[FU-GRADE-CONSISTENCY]/[MI-EVAL]; owner+cofounder close [TRACK-B-GATE]; RESP-DIV-2)
# Base SHA: b600e2b

## CURRENT BASE

Branch: base/approved-thru-437
SHA: cfff277
Last PRs: **#280 Worksheet PR-E2a (`d065922`) + #283 PR-E2a.1+.2 (`9a080a0`) + #284 PR-E2a.3 (`cfff277`)** + #279 docs(handoff) post-#278 (`883e904`). Earlier: #272 (**Topic Hub PR-C concept tutor "Teach me" flow**; → `d9ba545`) + #273 (docs(handoff) post-PR-C; → `6aa0640`) + #274 (**Topic Hub PR-D final-IA LAYOUT**; → `b57fa79`) + #275 (docs(handoff) post-PR-D; → `acc419b`) + #276 (**Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter + Chapter-test wired + MockBuilder un-route**; → `1de6f3e`) + #277 (docs(handoff) post-PR-E1; → `b4163ef`) + #278 (**CLAUDE.md governance refresh** — worktree rule, matrix de-hardcode, Replit→CI, CBSE 2026-27, verification doctrine + marks-bucket/MockBuilder/MI/syllabusGuard rules; → `f7170ef`)

> **Two parallel queues now exist** — pick per owner: **(1) Bank Expansion** Batch 3 (Triangles + Circles), the IMMEDIATE NEXT below; and **(2) Topic Hub rebuild** — PR-B concept-spine (landed via `c418f59`) + **PR-C tutor flow DONE (#272, `d9ba545`, owner live-verified)** + **PR-D final-IA LAYOUT DONE (#274, `b57fa79`, owner live-verified GOOD)** + **PR-E1 DONE (#276, `1de6f3e`, owner live-verified)** — concept-row Practise → Quick Practice direct + exact mark-band filter + single-pool count fix + Chapter-test button wired + MockBuilder un-routed; **[FU-PRACTISE-CONCEPT-FILTER] CLOSED** → **PR-E2 NEXT** (Worksheet — its own locked spec) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set), all verified against the FINAL IA committed in #268 (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html` + the supersession block in `LazyTopper_Learn_Flow_Spec_LOCKED.md`). **Each PR starts fresh in its own worktree.** Two Topic-Hub follow-ups stand apart from the layout/wiring queue: **PR-D.1** (mobile full-screen tutor toggle, a `TeachFlow` change split from PR-D, owner-approved — `TeachFlow` now backs ONLY the one live Topic Hub tutor, so low blast radius) and **[FU-CONTEXTUAL-TUTOR-REBUILD]** (the `/api/mentor` `concept_teach` engine serves a scripted "Ravi Sir/Step N of 5" lesson, not contextual to student input; pre-existing, separate workstream). See OPEN_QUESTIONS + IMPLEMENTATION_ROADMAP for the PR-E…PR-G breakdown.

## ⏭️ IMMEDIATE NEXT — Bank Expansion P1 **Batch 3 (Triangles + Circles)** when owner authorizes
Batches 1 (AP+Stats+SAV, 60) and 2 (CG+ARC, 45) are DONE + merged. **Batch 3 = Triangles + Circles** — ⚠️ this batch holds the bulk of the
**42 high-mark figure-locked questions** (Triangles 18 + Circles 15 of the 67-item census), so the **[FU-DIAGRAM-RECOVERY]** decision (recover
diagram-dependent Qs vs drop them) converges here — confirm with owner whether to drop-and-census as usual or pair with a diagram pass.
Same recipe per batch: extract verbatim from the Exemplar PDF → syllabus-filter (copy banned list from `scripts/src/syllabusGuard.ts`;
no banned subtopic in Triangles/Circles, but Constructions is its own out-of-scope chapter) → dedup vs repo (by `ncertRef` + content; surface
borderline) → AI step-marked solutions (`[N mark]` summing to marks; finalAnswer cross-checked vs jeep2an.pdf) → new `*.exemplar2.ts` +
register in `canonicalQuestionBank.ts` + add ids to `AI_GENERATED_SOLUTION_IDS` (NEVER edit `predictionTypes.ts`) → gates + Codespaces
vitest (now 11/11 green post-#264) → **STOP for owner solution/fidelity verification; no self-merge.** Then Batch 4 (Trig + Pair-of-Linear-Eq)
→ Batch 5 (Real-Numbers + Polynomials). Reusable tooling: `C:\Users\Chetan\OneDrive\Desktop\diff\exemplar-extraction\`.

## ⏭️ ALSO QUEUED (parallel tracks, owner-authorized separately) — [FU-AITIER-MARKS-MISMATCH] content pass → [FU-AITIER-RANK-DIFFICULTY-HELPERS] → (iii) gated-spelling → (2) MI eval → (3) Stage 3 → Fix B
topicKey audit (i) + Fix A (#242) + Check & Improve auto-detect (#244) + detect-then-confirm (#246) + (ii) "Finish session"
scorecard trigger (#249) + **read-only AI-tier audit (DONE)** + **AI-tier PR1 (#251 — DONE, [FU-MALFORMED-QUESTION] RESOLVED)** +
**AI-tier PR1b pack retags (#253 — DONE, [FU-AITIER-PACK-5MK-SHORT] RESOLVED)** +
**AI-tier PR2a provenance + soft ranking (#255 — DONE, trunk `686f737`, multipliers `1.0/0.6/0.3`, Quick Practice/topic
practice covered, owner live-verify PASS)** + **AI-tier PR2b `pastBoardYear` strip (#257 — DONE, trunk `d6e0e14`, 96 values / 5
files stripped, dedup → score-only, HPQ confidence proven unaffected, `predictionTypes.ts` untouched)** are done. The items below
are **QUEUED but NOT yet authorized** — the owner sends each as its own instruction, branched fresh from `d6e0e14`. Do not start
until instructed.

- **[FU-AITIER-RANK-MOCKS-HPQ] — ✅ DONE (#259, trunk `775ee75`).** Extended PR2a's `SOURCE_MULTIPLIER` (reused, exported
  `getSourceMultiplier`) to **Full Mock** (`unlimitedPaperEngine.weightedSelect` + authentic-first archetype prefill) and **Topic
  Mock** (`topicMockEngine.weightedShuffleByScore`) — per-slot soft demotion, structure-preserving. **⚠️ HPQ was a no-op** —
  `highlyProbableQuestions.ts` is a hand-authored curated bank, never uses `getAllQuestions()`, ZERO AI-pack content → left
  untouched (boundary correction). All AI-bearing surfaces now covered. Codespaces vitest 7/7. Owner live-verify (queued below).
- **(NEXT) [FU-AITIER-RANK-DIFFICULTY-HELPERS] — difficulty-helper surfaces.** `difficultyAwarePractice.ts` +
  `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity, but were out of #259's named scope + authorized
  file list (NOT touched). Apply the same `getSourceMultiplier` demotion to their selection. Owner-authorized, separate, its own
  instruction branched fresh from `775ee75`.
- **[FU-CURATED-26-PROVENANCE] — decision recorded** (the 26 curated inline `2026-…` items stay `authentic`; re-open only if they
  should become a curated/predicted tier).
- **(THEN) [FU-AITIER-MARKS-MISMATCH] — content/marks pass for the 7 quarantined pack items.** `TG3-056, TG3-059, ABS2-047,
  CR2-043, MNM2-037, REP2-039, PR2-018` are SHORT questions wrongly tagged 5-mark (NOT a label problem — PR1b deliberately did
  NOT relabel them). Fix the MARKS (or rewrite the question to match 5 marks), then remove each from `PACK_5MK_SHORT_BACKLOG` in
  `aiTierContentIntegrityGuard.test.ts`. Content-judgment + gated `.pack` edits — owner-authorized, separate.
- **Read-only AI-generated-question-tier audit — ✅ DONE** (`report-ai-tier-audit-2026-06-17.md`). Characterised the tier:
  file-based classification (no per-question `source` field), ~3,684 authentic vs ~3,010 AI in the live pool (~45% AI, ~816
  short of the 4,500 threshold), Q10 = a one-off cross-concept fusion, the 5-mark-"Short" tag defect was systematic, no
  ranking demotion exists, mocks draw from the mixed unified bank. Seeded **PR1 (#251)** + PR1b + PR2 above.

0. **⚠️ PRE-LAUNCH GATE — [FU-DETECTION-META-LAUNCH-FLIP].** Before shipping Check & Improve to students, flip
   `SHOW_DETECTION_META` to `false` in `lazytopper/src/utils/checkImproveDetection.ts`. It is ON now so the owner can see the
   detection machinery (source label etc.) during testing; students must NOT see it. This is the tester-vs-student line — a
   one-line change, but a real miss if forgotten. (It hides only the meta/source label, never the detected values or the
   Change control.) Verify on both desktop + app after flipping.

1. **(i) Read-only topicKey audit — ✅ DONE** (`report-topickey-duplication-audit-2026-06-16.md`). Fix A (#242) shipped the
   **read-time repair** half ([FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED). **Fix B = the bank-key DATA consolidation to one
   canonical kebab topicKey per topic + a CI guard that fails if a non-canonical topicKey reappears = [FU-TOPICKEY-CONSOLIDATION],
   HELD / authorized-later** (gated `src/data/**` across ~60 files; staged Maths/Science; migration map + guard design in the
   audit report §5). Do NOT start Fix B until owner-authorized.
2. **(ii) "Finish session" scorecard-trigger PR — ✅ DONE (#249, trunk `704dcff`).** Replaced #240's `allDone`-only scorecard
   trigger with an explicit student-declared "Finish session" action; honest on PARTIAL sessions (attempted-only denominators +
   "the M you didn't reach aren't counted"). Owner live-verify PASS (3-of-10 + zero-attempt both honest).
   **[FU-SESSION-SCORECARD-TRIGGER] CLOSED.** Report: `report-finish-session-scorecard-2026-06-17.md`.
3. **(iii) Gated-spelling follow-up — [FU-SPELLING-GATED-REMAINDER].** Owner-authorized separate PR for the ~60
   `src/data/**` + `src/lib/desktop/loginPrompts.ts` rendered "Practise" strings #240 could not touch (gated dirs).
4. **MI eval — [MI-EVAL] check-solution eval set** (40–60 graded answers + tutor fabricated-solution correctness eval;
   launch gate). Gates how hard we lean on AI-estimated grades; unblocks the eval-gated items.
5. **MI Loop Stage 3 — concept-level targeting (eval-gated).** Pass the weak concept/mistake-pattern into
   `generatePracticeSet`'s `conceptKey` (needs MI sub-concept capture + the eval set). = **[FU-DRILL-ENRICHMENT]**.
   Do not start until the eval (step 4) exists.

### MI-loop follow-ups (logged; slot into the batches above)
- **[FU-IMPROVEMENT-CARD]** (the loop-closer deletes the wrong-answer entry at zero, erasing the improvement record →
  record a durable "gap cleared" event before building any improvement/journey card on Me — sequence: durable event FIRST).
- **[FU-WEAKAREA-ALIAS-DISPLAY]** (active-gaps count under-shows for label≠canonical-slug topics; surface/ranking — batch 1).
- **[FU-ATTEMPT-MARKS-ACCURACY]** (marks-weighted Me accuracy; display-only — but touches how accuracy reads, so eval-aware),
  **[FU-ATTEMPT-SR]** (dropped spaced-repetition side-effect — its own decision).
3. **Stage-1 polish follow-ups** (see OPEN_QUESTIONS): **[FU-DRILL-ROUTING]**, **[FU-WEAKAREA-LABEL]**, **[FU-WEAKAREA-CTAS]**,
   **[FU-WEAKAREA-HUB-LIMIT]**. **[FU-ME-REFRESH]** — Me auto-refresh after a grade (still open). **[FU-GRADE-MARKSCALE]** /
   **[FU-GRADE-CONSISTENCY]** / **[MI-EVAL]** — eval-gated grade-quality items.

## ⏭️ IMMEDIATE NEXT — close the Track B gate (live round-trip), then PR2 (harden), then resume Phase-2
INFRA-4/PR1 is **DONE + the backend is LIVE on Railway** (owner-confirmed `stub:false`, Gemini direct-key); grading is no longer
dark in prod. The critical path is now:
1. **[OWNER+COFOUNDER] Track B live round-trip → CLOSE [TRACK-B-GATE].** On the live app: sign in → grade a real answer → confirm
   "Saved to your progress" → mobile Me shows the real mistake mix → desktop Me matches (same uid); plus failed-grade → error.
   Runbook §7 in `report-api-gateway-railway-2026-06-10.md`. Only this pass closes the gate / ISSUE-009.
2. **INFRA-4 / PR2 (harden) — queued.** Provision Postgres + set `DATABASE_URL`; **add `tsx`** (warmup needs it once Postgres is on);
   set `ADMIN_FIREBASE_UIDS` (admin routes 503 without it) + `SESSION_SECRET` (share feature); add rate-limiting; decide warm-pool
   (`WARM_POOL_TOP_UP_INTERVAL_MS` is `0` for a quiet first deploy). **INFRA-4b** claudeClient Replit-proxy rewire = later visuals PR.
3. **Resume Phase-2 responsive divergence** — RESP-DIV-2 (mobile logout) next, then the rest of the punch-list below.

### 1. Phase-2 RESPONSIVE DIVERGENCE punch-list (desktop is source-of-truth; no invented numbers)
Ordered in OPEN_QUESTIONS. Each is its own scoped PR (desktop-leads, mobile-adapts; Option-B grammar):
- ~~**Track A — mobile Me honesty (RESP-DIV-1)**~~ **DONE (#220).** Fabricated −12/−8/−5 + invented weak-topics removed.
- ~~**Track B — mobile Check trust + persistence**~~ **DONE (#222), but verification-gated.** Guard fixed; persistence wired to
  the shared `logMistakes`/`getMistakeLogs` pipeline; mobile Me reads real data. ⛔ **[TRACK-B-GATE]** the successful
  grade→persist→Me round-trip is UNPROVEN until the backend deploy (grading is dark in prod) — verify at INFRA-4 go-live; do not
  mark fully done until then.
- **RESP-DIV-2 (NEXT, functional-HIGH) — mobile has NO logout path.** Add Log out + Manage subscription to mobile chrome / Me page.
- **Topic Hub reconcile** (wire mobile "Learn" to the tutor; label/drop synthetic fallback questions; honest progress vs the
  localStorage "Chapter Mastered" claim) → **Worksheets parity** (mistake-intelligence + multi-topic/full-subject + save +
  Science `stream` field) → **Home real-insights** (firebase-free boundary decision) → **RESP-DIV-3 (cosmetic) trial banner**.
- **Durable cure:** converge mobile Me into desktop Me (one responsive component, one data pipeline) — after Track B.
Owner supplies order confirmation + any frozen design before each.

### 2. Phase-2 clean-branch (later) — execute the marker deletions
#218 marked 46 files `LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) without deleting them. A later clean-branch greps
the markers to delete (retired) / keep (deferred). Also clear the §7 sever residue (MockPaper into the predictive
family; admin-lane back-links; TopicHubHome orphan; dead buildUrl helpers). See OPEN_QUESTIONS.

### 3. Go-live deploy chain (the launch unlock — AI is dark in prod until this)
INFRA-4 backend deploy: deploy `api-server` (runs the `lazytopper/server` gateway as a child) + provision Postgres →
Railway + `/api/*` rewrite in `vercel.json` + rate limiting; INFRA-4b Claude/Gemini client rewiring (Replit-proxy →
direct Anthropic/Gemini key).

### Owner / deploy actions pending (go-live)
- **Admin bootstrap (BLOCKING):** set `ADMIN_FIREBASE_UIDS` to your Firebase uid — the ONLY way admin routes
  authorize now (else 503 in prod).
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) — `requireFirebaseAuth` returns 503 without it.
- **Firebase Authorized domains:** add the prod Vercel domain (Google `signInWithPopup` needs it; email/password does
  NOT). Phone-OTP is unchanged since #214 (the sever touched zero auth files).
- **Google One-Tap (GIS)** follow-up once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided.
- **[SMS-DELIVERABILITY]** Firebase default SMS sender lands in Android spam (DLT-registered sender / custom provider
  needed; operator lead-time — start early if phone becomes primary). Phone is the fallback; Google/email is primary.

## (the PRODUCT-track sections below remain valid — pick up after the auth migration arc, or in parallel per owner)

## ✅ THE INFRA THAT MATTERED IS DONE — NEXT SESSION PIVOTS TO PRODUCT + THE LAUNCH DEPLOY
Closed this session (see CURRENT_STATE): lockfile fixed (#201), CLAUDE.md corrected (#198), CI LIVE + proven
(#198), de-Replit COMPLETE (#199 + #204 → fully `@replit`-free). CI now gates every PR (pnpm 10.32.1 frozen
install → root matrix 175/175 → mojibake → linux build → ops matrix); human merge gate retained.

### Remaining infra — TRACKED, but NOT blockers to product work
- **INFRA-4 — backend deploy** (THE launch unlock; AI is dark in prod until this): deploy `api-server`
  (runs the `lazytopper/server` gateway as a child) + provision Postgres → Railway + `/api/*` rewrite in
  `vercel.json` + rate-limiting.
- **INFRA-4b — Claude/Gemini client rewiring** (`lazytopper/server/services/claudeClient.cjs` Replit-proxy
  → direct Anthropic API with the owner's key) — lands WITH the backend deploy.
- **INFRA-5** Clerk `pk_live_`; **INFRA-6** Vercel proper build config; **INFRA-7** domain; **INFRA-8**
  check-solution eval set (launch gate).

### Product entry points (pick with the owner)
- **Responsive/mobile-completeness audit** (read-only first) — the product is ONE responsive website, but the
  `src/pages/` desktop/app/mobile split is inconsistent (`mobile/` has only ~5 surfaces). Map every surface ×
  desktop-done/mobile-done BEFORE the redesign roadmap.
- **TopicHub Option-B convergence** — the big surface; locked design specs exist (the next Option-B after
  Exam Trends #184/#190).
- **HPQ Phase 2** (content authoring; supervised brief exists; depends on TopicHub for mastery-loop routing).
- **Notes / formulae / interactives for ~40 topics** (Gemini-generate → owner-validate → TopicHub-render;
  template sign-off gates it).

NOTE: the HPQ Phase 2 / Exam-Trends / Option-B detail sections below are unchanged and still current.

## POST-#196 (housekeeping done; does not change the next HPQ task)
The three long-red ops suites (D38) are GREEN: mojibake 3/3 (re-encoded circles.proof.ts + the second
corrupted file maths.caseBased.ts the diagnosis missed), bank-health 4/4 (stale→retirement guard + orphan
dead-compute deleted), canonical 4/4 (re-pointed to the relocated practiceQuestionBuilder.ts). The
`check-mojibake.cjs` 50-hit scan cap (why the second file stayed hidden, and the local+CI blind spot) is
removed. **NEW tracked follow-up [D39]:** the mojibake guardrail workflow is mislocated under
`lazytopper/.github/workflows/` so GitHub never runs it — relocating + EXPANDING CI (gate the full matrix +
scope-guard, not just mojibake) is a deliberate infra change owed its OWN PR (verify uncapped checker clean
across all trunk first; decide trigger scope). Not blocking the next HPQ task.

## HPQ PHASE 1 — DONE (#194). Consistency + honesty (logic/copy/plumbing only).

HPQ now tells the SAME story as Exam Trends. Tier badges are driven from the locked tiers
(`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`) via a single canonical-key→tier lookup in
`getHighlyProbableQuestions()` — **0 tier contradictions (was 11/27); must-crack badge share 74%→42%**.
Dead `deriveHPQConfidence` compute retired (page shows no confidence UI; `hpqConfidence.ts` kept for a
future model). Copy reframed to honest "High-Probability Question Patterns" (representative shape, not a
specific-question prediction; three locked evidence sources named). Plumbing: canonical-key merge dedupes
the duplicate Pair-of-Linear / Metals cards; Science filter fix recovers Human Eye 1→4 and DEV-logs any
future drop. All questions KEPT (re-badge + de-emphasize, never delete). 3 files, +140/−36;
`predictionTypes.ts` frozen. Gates green; pre-existing reds (bank-health/canonical-gen/mojibake) verified
unrelated. Report `report-hpq-phase1-consistency-2026-06-05.md`. Trunk `6d5b6ed`. See CURRENT_STATE top.

## NEXT HPQ TASK — HPQ PHASE 2 (content authoring; gated `src/data/`, owner-validated, PYQ-sourced).

Phase 1 only RE-BADGED. Phase 2 adds/rebalances CONTENT — author from real PYQ sources, owner-validated:
1. **Missing every-year 5-mk Section-D Long-Answer marquee shapes** (the deepest "same story" gap): Trig
   Heights & Distances 5-mk LA; Surface Areas combination-of-solids 5-mk LA; Statistics grouped-median
   5-mk LA; Triangles similarity/BPT proof (Section D); Acids/Bases 5-mk LA; Chemical Reactions 3-mk
   displacement SA. (Maths currently has effectively ZERO valid 5-mk LA HPQs.)
2. **Distribution re-weight toward must-crack:** lift Circles (2) and Heredity (4) to adequate; trim or
   re-tier the over-stacked sets (Pair of Linear 8, AP 6, Metals 12) so volume over-indexes must-crack and
   tapers to good-to-do. (Phase 1 deliberately left volume alone — re-badging only.)
3. **`rn-hpq-4` Section-D/4-mark mislabel** — Section D = 5-mk LA in CBSE; fix the only Maths "Section D"
   item (currently 4 marks, which is why Maths reads as zero valid 5-mk LA).
4. **Backfill 49 competency `solutionSteps`** (the `*-comp-*` entries carry answer+explanation but no
   step-marked working) to the §13 CBSE step-marking minimums per section.
5. **Confidence-model reconciliation** — DEFERRED until a confidence UI is actually designed; re-base
   `compute5SignalScore` on blueprint-weight + 4-year frequency + §4 sub-pattern (so a band can never
   contradict a tier) before any confidence badge ships. See OPEN_QUESTIONS.

## EXAM TRENDS BAND REDESIGN — DONE (#190). Steps 5 + 6 complete.

The Exam Trends surface is now 3 collapsible priority bands (Must-crack / High-ROI / Good-to-do) on the
owner-signed-off locked tiers (`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`, transcribed VERBATIM).
The locked doc IS the fresh, scientifically-derived tiering D27 asked for (step 5), and #190 is the band
redesign (step 6). Layout-only Option-B evolution of the ONE component; 1 product file; "Expect:" line on
the 11 must-crack topics only; volatility flag on Trig + Electricity; no fabrication; grammar preserved.
Gates green (tsc, build, verifier, matrix 175/175). scope:guard FAIL = known monorepo path-prefix artifact
(verified not a breach). Trunk `cfb3106`. See CURRENT_STATE top section + SESSION_LOG.

## SYLLABUS-CORRECTNESS ARC — CLOSED (#186 + #188). Gating guard GREEN, matrix 175/175.

The content sweep (#188) deleted the 93-item worklist the corrected guard flagged → gating
`syllabusGuard` exits 0, `test:matrix:all` = 175/175 (incl. #19). Banks: Conversion of Solids ×46
deleted (canonical 6520→6474, spreads intact). Surfaces: EMI/Motor/Generator + Euclid/Frustum ×47
deleted/rewritten across predicted/HPQ/competency/config/trends/topics/topicHubContent + tutor
contracts. Owner decision DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate. The tutor no
longer teaches Euclid's lemma or evolution evidence. See DISCOVERIES D26 (CLOSED) + D31 (deferred
polynomials follow-up).

## IMMEDIATE NEXT TASK — step 7: next Option-B surface (TopicHub concept-spine)

Exam Trends (the FIRST Option-B surface, #184) is now fully converged through its band redesign (#190).
The next track item is the next Option-B surface — **TopicHub concept-spine (+ Formula Sheet / NCERT
Notes)** — using the same template (ONE responsive component per surface; design grammar reused; honest
data only). Note the carried OPEN gate: the Notes/Formula template needs owner sign-off (structure,
granularity, #examples) BEFORE generation. Optional pre-step for #190: capture the 360/768/desktop ×
Maths/Science band screenshots as PR evidence (deferred — owner to request).

## THE SEQUENCE (owner-confirmed; reordered post-#186)

1. ~~Track A PR-1 — tutor wiring~~ DONE (#181 — desktop TopicHub "Learn this").
2. ~~PR B2 — teach-prompt tightening~~ DONE (#182 — LOCKED style; owner live-verified).
3. ~~Exam Trends ranked-list responsive redesign~~ DONE (#184 — FIRST Option-B convergence; merged `93a2674`).
4. ~~Correct + EXTEND syllabusGuard (the RULER)~~ DONE (#186 — corrected to official 2026-27; extended
   to 24 board-prep surfaces; 2 stale doctrine-locks fixed; merged `918b754`). The guard half of D26.
4b. ~~CONTENT SWEEP~~ DONE (#188 — deleted the 93-item worklist; gating guard GREEN, matrix 175/175
   incl. #19; banks Conversion of Solids ×46, surfaces EMI/Motor/Generator + Euclid/Frustum ×47;
   DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate; trunk `e0395fc`). Closes D26.
5. ~~Re-derive Exam Trends priorities FRESH~~ DONE (owner-signed-off composite model + 2 teacher
   overrides → `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`; the scientific basis D27 asked for).
6. ~~Exam Trends band redesign~~ DONE (#190 — Must-crack / High-ROI / Good-to-do collapsible bands;
   reuses the merged ranked-list rows; the band replaces the weight-vs-trend Sort toggle; 1 product
   file; "Expect:" line on the 11 must-crack topics; volatility flag on Trig + Electricity; trunk `cfb3106`).
7. **(NEXT) Then the other Option-B surfaces: TopicHub concept-spine (+ Formula Sheet / NCERT Notes) →
   Check & Improve → Me/Progress → Worksheet generator** (each Option B; one responsive component per
   surface; same template as Exam Trends #184).
8. Separate follow-up PRs (not blocking): interactive-handoff fix (`findVisualForConcept` returns the
   WRONG visual — standard-angles showed Height & Distance); mobile-tutor wiring (mobile
   `src/pages/app/TopicHub.tsx` "Learn" is a placeholder → Check & Improve, NOT wired to concept_teach);
   Formula/Notes generation + content-correctness pass; AI cost/rate-limit hardening (launch gate, D25).
5. **Railway deploy** + `vercel.json /api/*` rewrite + rate limiting — the unlock that makes the
   Vercel link's AI features work (ISSUE-009) → hand students the link. At link-time: Clerk
   `pk_test_`→`pk_live_`, DPDP/consent for minors, monetization charge path.
6. **Launch chain (after the redesign + eval set):** check-solution eval set (40–60 graded answers,
   launch gate) + the tutor fabricated-solution correctness eval → Railway deploy + `vercel.json /api/*`
   rewrite + AI rate-limit/cost hardening (D25) → Clerk pk_test_→pk_live_, DPDP/consent for minors,
   charge path → hand students the live link. Deploy ONLY after grading + teaching are reliably GOOD locally.

## SUPERSEDED — old mobile-twin reflow track (replaced by Option B convergence)

The earlier mobile-reflow track (PR A #166 primitives → #168 mobile Home → #170 mobile landing →
#172 Home polish; staged usePracticeHub/MobilePracticePage) built mobile TWINS of desktop pages.
That approach is now SUPERSEDED by the LOCKED responsive Option B (DECISION_LOG 2026-06-03): one
responsive component per surface (desktop-leads, mobile-adapts), retiring both twins. The grammar
primitives (`src/components/grammar/`) and the `isMobileSelfChromedRoute` navbar pattern remain
useful building blocks for the convergence, but new work converges twins rather than forking them.

Remaining staged items (owner picks order & supplies the instruction + any frozen
design before each):
  - usePracticeHub extraction — reusable Practice Hub data/state hook
  - MobilePracticePage — mobile Practice reflow (consumes the hook)
  - (any further per-platform reflows for routes that render a desktop page at mobile
    width — verify render sites; RootEntry-style redirects mean not every site needs it)

Branch fresh from the current tip. Await the instruction (+ frozen art if any) first.

PATTERNS ESTABLISHED (reuse in PR C/D):
- Per-platform split: `isDesktop ? <Desktop/> : <Mobile/>` at the route (App.tsx edit
  permitted ONLY for that minimal branch). RootEntry-style redirects may mean only
  some sites need the switch — verify render sites first.
- Reuse without firebase coupling: lift shared, dependency-free logic into a small
  module (e.g. PR #168's src/lib/desktop/homeDestinations.tsx) imported by both
  variants; do NOT import a heavy page into a light one (pulls firebase into the chunk
  + unit test).
- Grammar primitives: import from `src/components/grammar` (`Card`, `TileRow`, `Pill`,
  `SectionHeader`). TileRow reflow is pure CSS (@media max-width:1023px); `columns` prop.
- Desktop-unchanged proof: keep edits to the desktop component module-level only
  (relocate declarations; never touch the component JSX) and show the diff hunks are
  all pre-component.

NOTE: build gate = `npm run build` (the real Vercel command); the Vercel PREVIEW
check on each PR is a valid pre-merge production-build gate. The false-green
`npx tsc --noEmit` was fixed in #164.

## RENDER-TEST INFRA NOW AVAILABLE (PR #160)

`npm test` in `lazytopper/` runs Vitest over `src/**/*.test.{ts,tsx}` (jsdom,
Testing Library, jest-dom; `window.matchMedia` polyfilled in `src/test/setup.ts`,
overridable per-test via `setMatchMediaMatches`). Every future UI PR (grammar
primitives, Mobile Home, practice-page extraction) MUST ship a real render/reflow
test as proof-of-work. The `scripts/` guard suite (137 tests, node:test runner) is
separate and unaffected — `vitest.config.ts` `include` is scoped to `src/`.

NOTE: the false-green `npx tsc --noEmit` was RESOLVED in #164 — `start:quick` now
runs `npx tsc -p tsconfig.app.json --noEmit && npm run build`, and `precommit:check`
was removed. Use `npx tsc -p tsconfig.app.json --noEmit` (or `npm run build`) for a
real app typecheck.

## BANK STATE

Total questions: ~6,120
  - Authentic: ~3,341
  - AI-Generated: ~2,779
  - Board PYQs: 857 (all 4 main exam years complete)
    214 from 2022-23 (PR #135+#137)
    172 from 2023-24 (PR #147+#148+#150)
    182 from 2024-25 (PR #144+#145)
    193 from 2025-26 (PR #141+#142)
Spreads: 266 (post-PR #150; PR #151 added no new imports)
Test matrix: 137/137 PASS (5 test files)
Retirement threshold: 4,500 (~74.2% reached)

## FILTER + STEP MARKS STATE

All filter chips working (post-PR #151):
  MCQ · Proof (broadened) · Competency · Assertion-Reasoning · Case-based · PYQ toggle
Section A + Remembering competency override active in 3 sites
Our Environment normaliser merged 156 split questions under one topic key
Step-marks guide-only banner removed for canonical bank questions

KNOWN ISSUE (post-#151): Proof filter still catches Section A conceptual
recall questions (subtopic contains "proof" or "identit"). Fix is one line
per file in practiceQuestionBuilder.ts + PracticePage.tsx — see ISSUE-007.

## PYQ EXTRACTION STATUS — COMPLETE

| Year | Maths | Science | Status |
|---|---|---|---|
| 2025-26 (pyqYear 2026) | 42 Qs ✓ | 151 Qs ✓ | Done PR #141+#142 |
| 2024-25 (pyqYear 2025) | 57 Qs ✓ | 125 Qs ✓ | Done PR #144+#145 |
| 2023-24 (pyqYear 2024) | 96 Qs ✓ | 76 Qs ✓ | Done PR #147+#148+#150 |
| 2022-23 (pyqYear 2023) | 103 Qs ✓ | 111 Qs ✓ | Done PR #135+#137 |
| 2021-22 (pyqYear 2022) | 0 | 0 | LOW PRIORITY — Term II format |

All 4 main exam years extracted. P4 phase COMPLETE.

## IMMEDIATE NEXT TASKS (in order)

### Task 1 — Small fix PR: Hindi garbled + Proof Section A exclusion (P0 — before launch)
Branch: fix/remove-hindi-garbled-pyq (fresh, small)
Combines ISSUE-006 + ISSUE-007 in one PR.

ISSUE-006 fix:
  Search all PYQ files for garbled Devanagari patterns and remove offending question(s):
    Select-String -Recurse -Path "lazytopper\src\data\questionBanks\class10" `
      -Include "*.ts" -Pattern "OgHo|_mZ|H\$m|bE 2 sin"

ISSUE-007 fix (one line each in two files):
  Add at TOP of Proof branch in practiceQuestionBuilder.ts (line ~485) and
  PracticePage.tsx (line ~290):
    const qSection = String((q as { section?: unknown }).section ?? "");
    if (qSection === "A") return false;

Validation: 137/137 PASS, TypeScript exit 0

### Task 2 — P5 Sample paper extraction (P1 — pre-launch content boost)
Target: ~200 questions from CBSE sample + preboard papers
Branch: content/p5-sample-papers

### Task 3 — Filter UX redesign (P1 — student vocabulary, 2-layer layout)
Default visible (2 rows):
  Row 1 — Question Style: All · MCQ · Proof · Application & Scenario ·
           Assertion-Reasoning · Case-based
  Row 2 — Marks: All · 1 mark · 2 marks · 3 marks · 5 marks · Case (4 marks)
Toggle: "Board exam questions only" (PYQ)
Advanced (expandable): Difficulty + Source (Authentic / Practice only)
Key renames: "Competency" → "Application & Scenario", Section labels → Mark labels

### Task 4 — API gateway Railway deploy (P0 — AI features 404 in prod)
+ vercel.json rewrite

### Task 5 — Clerk pk_live_ keys switch (P0 — Vercel env var)

## PARKED (do not start yet)

- VSA-format doctrine: 96 questions (90 in B + 6 in A) not covered by the 7 migration rules
- Pack question regeneration with stricter per-section prompts (post-launch)
- K2D → Mistake Intelligence aggregation (post-launch)
- TutorDrawerV2 decision (post-launch)
- 2022 Term II papers (low priority)
- Product PRs (strategyHint button, Show visual fix, Formula sheet) — parked until authentic ≥ 4,500

## PIPELINE SCRIPTS

C:\Users\Chetan\OneDrive\Desktop\diff\fix_section_format_migration.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\add_competency_field.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\fix_canonical_bank.mjs (PR #151)
C:\Users\Chetan\OneDrive\Desktop\diff\probe_section_format.mjs (PR #151 dry-run aid)
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_probe.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_extract.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_generate_ts.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_checkpoint_b.py
C:\Users\Chetan\OneDrive\Desktop\diff\p4s_pyq_reachability.mjs

## LAUNCH TARGET

First week of June 2026 (~12 days from this handoff)
Primary use case at launch: chapter-by-chapter practice + worksheet generation
Filter complexity not needed by students until September (PT1 season)
Full timed mock + advanced filter system needed before October (half-yearly)
