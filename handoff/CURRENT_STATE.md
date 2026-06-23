# LazyTopper — Current State
Last updated: 2026-06-24 (post-PR #291 — **Worksheet PR-E2b — one-PDF AI grade loop + Mistake-Intelligence wiring MERGED** (squash `60c5bf9`): the SECOND half of the worksheet (E2a foundation already merged) — a real upload → grade → display → MI round-trip. The student uploads ONE PDF of all answers (labelled Q1, Q2 …); it is graded in a SINGLE structured Gemini call against the worksheet's KNOWN scheme keyed Q1…QN (matched BY NUMBER via the printed label instruction, never blind-segmented). **Server (additive, live backend — auto-redeploys on merge):** `server/routes/checkSolution.cjs` gained a surface-AGNOSTIC `gradeStructuredSet` core + `handleGradeWorksheet` HTTP handler + a deterministic stub + a per-question normaliser; **`handleCheckSolution`/`handleDetectQuestion` are BYTE-UNCHANGED** (the only diff "deletion" is the return-object line, extended with `handleGradeWorksheet`) → **zero regression to the live Check & Improve grader** (the PR's single biggest risk, honored). **Honest-failure (anti-fabrication):** a per-question `couldNotRead` flag — an illegible/absent answer is NEVER fabricated into a mark and NEVER folded into a 0; an omitted question is treated as pending, not zeroed. **Trusted marks:** per-question `totalMarks` is always the scheme value (`q.marks`); the model only awards within it; additive-floor `mistakeSummary` reconcile mirrors the wired path. `readJson` body cap raised to 8 MB on THIS route only (a 5 MB PDF base64-inflates past the default 5 MB). `questions.cjs` + `index.cjs` register `POST /api/grade-worksheet` (+OPTIONS/CORS). **Client (additive):** `ai/aiClient.ts` `gradeWorksheet()` + types; `services/worksheetSessionStore.ts` `save/getWorksheetGrade` (revisit); NEW `services/worksheetGradeService.ts` (the testable seam — map-by-number, persist, fan each LEGIBLE result through the SINGLE MI front door `recordMistake` + score-twin `recordAttempt` with a STABLE `ws:<id>:q<N>` id so a re-upload with the same result is deduped — idempotency via the front door's existing dedup, NO parallel layer; the grade core takes its question set as a PARAMETER so Chapter Test / Full Mock reuse it); NEW `components/worksheet/WorksheetGradePanel.tsx` (upload UI, sync progress ~30–60s, per-question results, **honest "graded X/Y + N pending" totals** kept SEPARATE from the worksheet total, MI evidence line) wired into `WorksheetGenerator.tsx`; NEW `worksheetGradeService.test.ts` (Codespaces/doc-only). **Reconciliation:** the task doc said `recordAttempt` did not exist yet — on trunk it DOES (used by `SolutionChecker`) and `WORKSHEET_TRACK_HANDOFF.md` §4 says wire it too, so both are wired; no `[FU-SCORECARD]` needed. Built in an **isolated worktree** (`feat/worksheet-grade-loop`), **rebased onto trunk `2cab012` post-Z3 with ZERO conflicts** (file-disjoint from the Z3 `src/data` merge), 9 files +1201/−10. Gates ALL GREEN both pre- and post-rebase: tsc, mojibake 0, scope:guard product, lazytopper ops matrix, root matrix **181/181**, `node --check` ×3 `.cjs`, `git diff --check` clean; **CI `quality-gate` GREEN** (1m16s, incl. linux `vite build`); no forbidden files (`predictionTypes.ts`/`Welcome`/`DesktopShell`/`main`/`vite.config`/`firebase.json`/`firestore.rules`/`src/data/**` untouched; MI routing internals only CALLED, never modified). Cofounder review = clean (additive-only; grader byte-unchanged; surface-agnostic core; single front door; honest-failure all confirmed). **No self-merge; owner merged (#291 → `60c5bf9`).** **⚠ OWNER LIVE-VERIFY = PENDING** on the Firebase-authorized trunk URL (backend auto-redeploys on merge; the AI round-trip is unverifiable by static gates) — START SMALL (5-Q): right-question mapping + sensible marks; an illegible page → honest "couldn't read Qn" + total shows graded X/Y + N pending (NOT a deflated mark); result feeds Me/Progress + unlocks the MI-enrich toggle; careless (silly/presentation) → careless insight NOT a weakness; knowledge-gap (conceptual/calculation) → weak-area for the right topic; **Check & Improve still grades + feeds MI (shared-grader non-regression)**; re-upload does NOT double-count; phone end-to-end. Report: `report-pr-e2b-worksheet-grade-loop-2026-06-23.md`. **NEXT: owner live-verify of #291; then the worksheet (E2a+E2b) is COMPLETE** → remaining Topic Hub queue PR-F (Notes + Examiner's-tips content) → PR-G (deletions); separately PR-D.1, [FU-CONTEXTUAL-TUTOR-REBUILD], [FU-CHAPTERTEST-PAGE-REDESIGN]. Worksheet follow-ups carried: [FU-ASYNC-GRADING] (large-worksheet grade times — sync now, async deferred), [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE]. ) Previously (post-PR #292 — **Z3 Competency extraction MERGED** (squash `b1d3e46`): the EXTRACTION PILOT proving the extract→classify→syllabus-filter→schema→bank→verify pipeline on the cleanest content slice (the `Z3. Competency Based Questions` Maths module of the Foundation Study Package v3). **102 net-new AUTHENTIC competency/case-based Maths questions** in NEW `questionBanks/class10/maths/competency.z3.ts` (`Z3_COMPETENCY_QUESTIONS`), wired into `canonicalQuestionBank.ts` by exactly **ONE import + ONE spread** among the authentic Maths sources (nothing else mutated). **AUTHENTIC tier** — the `.z3` suffix is NOT a `.pack*`, and the array is deliberately ABSENT from `AI_GENERATED_PACK_SOURCES`, so `predictionCore` stamps it `authentic`; **no `pyqYear`** → the non-PYQ **"others"** bucket. **THE DECOUPLE:** QUESTION text transcribed verbatim from the Z3 DOCX (python-docx + ftfy); figure-borne DATA — Statistics frequency tables, Coordinate/Probability diagrams, carton/target dimensions — was READ from the embedded PNGs and inlined (`requiresDiagram:true` on 28 rows); SOLUTIONS are AI-authored, step-marked (`[N mark]` summing to marks), cross-checked vs the Z4 source answer key — **PENDING owner/teacher verification** (EVERY marks value is INFERRED — the source carried no mark tags). **Count reconciliation:** source = **117** numbered Qs (not the doc's "~124"); **15 dropped → 102 kept**. Syllabus drops (question-level, re-read vs `scripts/src/syllabusGuard.ts`): all 10 Polynomials (remainder/factor theorem + cubic/quartic functions — beyond Class 10), 1 complementary-angle trig (Intro-Trig Q2), 3 conversion-of-solids mensuration (well-embankment / canal→field / rainfall→vessel); Real-Numbers HCF solutions REWRITTEN to **prime factorization** (Euclid's algorithm banned); coordinate triangle-area sub-parts dropped within kept questions. Distribution: section **E/Case-Based 57 + C/Short 36 + D/Long 9**; difficulty Easy 4 / Medium 89 / Hard 9. Added **`competencyZ3.floor.test.ts`** — the silent-zero spread guard (every Z3 id reaches the served bank; Z3 contributes exactly 102; every Z3 id stays ABSENT from `AI_GENERATED_QUESTION_IDS`; bank floor) — vitest, Codespaces path. **Fix pass (2nd commit `0e8b1f4`, pre-merge):** normalized the **5 half-mark Case-Based rows** (ARC-002/003, SAV-005, PR-005/007 — the ONLY fraction-tag rows) to clean INTEGER `[N mark]` schemes summing to 4, so an integer ruler agrees; moved every `Z4 / source-key / prints / inconsistent` audit aside OUT of the student-facing `finalAnswer`/`solutionSteps` into `// PROVENANCE` / `// PENDING OWNER VERIFICATION` / `// AUTHORED` line-comments; settled overrides shipped clean (TR-009 → 16 m, PR-004 → 98.7%); 4 disputed rows (QE-003, ARC-004, TG-104, SAV-005) + 3 blank-authored rows (PLE-009, CG-007, SAV-006) stay SERVED but flagged (deliberately NOT added to `WITHHELD_QUESTION_IDS` — the floor test asserts all 102 served). Gates GREEN: tsc, root matrix **181/181** (incl. the syllabus guard over the new file), lazytopper ops matrix, mojibake, scope:guard `--mode product`, `git diff --check`; CI `quality-gate` GREEN (linux build, 1m18s). **Owner-approved + squash-merged (#292, `b1d3e46`); no self-merge** (gated `src/data`). Reports + per-question provenance tables + 119 staged WebP figures live OUTSIDE the repo at `Desktop\Content\extraction\report-z3-competency-extraction-2026-06-23.md` (+ `agent-out\*.report.md` + `z3-figures\`). **PILOT PROVEN → the pattern now scales to the worksheet folders** as a new parallel content track. New follow-ups: **[FU-Z3-TEACHER-VERIFY]** (the 7 flagged rows + every inferred mark + every AI-authored solution need a teacher pass before treated as exam-certain), **[FU-Z3-FIGURE-BIND]** (bind the 28 `requiresDiagram` figures — staged WebP + `diagramDescription` seam, no new asset field yet — to a renderer), **[FU-Z3-SOLUTION-IDS]** (OPTIONAL: register Z3's AI solutions in `AI_GENERATED_SOLUTION_IDS` if an "AI solution" badge is wanted, mirroring the `*.exemplar2` DECOUPLE — left out by task scope). ) Previously (post-PR #289 — **Note-spec validator gate MERGED** (squash `c525b2a`): the notes track's gated-build-order **step 1** — `notes/validate_spec.py`, the anti-fabrication gate that makes the ~35-note parallel fan-out safe (designed to run as a `SubagentStop` hook). **9 rules; reads two LIVE dependencies and never hardcodes them** — `SURFACE_BANNED_PHRASES` from `scripts/src/syllabusGuard.ts` (the trap-safe PROSE list, NOT the question-bank `bannedSubtopics` generics; `//` comments stripped before extraction so quoted words inside a comment aren't mistaken for phrases; word-boundary + case-insensitive, so the syllabus traps hold by construction — *homologous series* IN vs *homologous organs* OUT, *sum/product of roots* IN) and the `slug` set from `lazytopper/src/lib/desktop/topics.ts`. Rules: source-required (definitions both tiers / examples / ncert figures; `formula_strip` source OPTIONAL per v1.1) · `topic_key` ∈ topics.ts · banned-phrase · `third_tab` kind+shape · example kind per subject · mojibake/cid/U+FFFD · `source_ledger` count == sourced fields · figure manifest · structural + figure_ref resolution. CLI `<spec>` / `--all` / `--json`; **NO bypass/force flag** (never force-green). This PR also committed the **schema v1.1 contract** (`notes/NoteSpec_Schema.md`) + the **validated reference spec** (`notes/specs/light-reflection-and-refraction.json`) + 5 negative fixtures + a self-test (`notes/specs/_test/`). Acceptance: Light → VALID (all 9 rules); each negative fixture FAILS on EXACTLY its rule (`run_negative_tests.py` → SELF-TEST OK). **9 files, ALL under `notes/`; content-only; stdlib only.** Gates GREEN + CI `quality-gate` GREEN; owner-merged, **no self-merge**. **→ PR-F is now UNBLOCKED** — `<Note>` builds against the Light spec; Step-2 spec authoring is validator-gated. **NEXT (notes track — gated step 2): a content PR under `notes/`** evolving the kit to `render_note(spec)` + finishing Light's figure (base64→WebP) + mindmap (JS→spec) lift; THEN in parallel **PR-F** (the `<Note>` component + Topic Hub wiring) AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated. Report: `report-validate-spec-2026-06-21.md`. )
Previously (post-PR #282 — **Notes-generation track Step-1 MERGED** (squash `de2a616`): a **PARALLEL CONTENT track** (like the worksheet + PYQ-symbol tracks), separate from the Topic Hub product queue. #282 generated — **NOT yet wired into the app** — the locked note infrastructure under `notes/`: **`lazytopper_notes_kit.py`** (the locked renderer + `ncert_figure`/`clean_watermark`/`refill_rect` figure toolkit; verified running — regenerates ELEC+CHEM with the Download-PDF button), **5 v2 prototypes** (Light, Electricity, Chemical Reactions, Life Processes [carries 3 real NCERT figures], Quadratic Equations), and the **Light enriched exemplar** = the finished reference STANDARD (6 verbatim NCERT definition cards + 8-term key-terms cluster + 4 **real NCERT** worked examples + 3 **real NCERT** figures incl. **Fig 9.9 New Cartesian Sign Convention** + AUTHORED-vs-NCERT legend + full source ledger; cites reconciled directly against **NCERT Reprint 2026-27, Class 10 Science, Ch 9** `jesc109.pdf` — principal focus p.136, refractive-index in-text Q p.150 corrected on direct check). **14 files, ALL under `notes/`** — zero `lazytopper/src/`, zero `handoff/`, zero product code (verified on remote). **Content-generation ONLY.** #282 merged 2026-06-21 13:42Z — chronologically the FIRST of the recent cluster (BEFORE the worksheet #283/#284 and the PYQ-symbol #286), on a parallel track that the worksheet docs #285 + symbol docs #287 did not cover; documented here now. Gates GREEN (mojibake, root matrix **181/181**, lazytopper ops matrix, scope:guard `--mode product`, `git diff --check`); CI `quality-gate` **GREEN**; owner-merged, **no self-merge**. Full track handoff: **`handoff/NOTES_TRACK_HANDOFF.md`** (detailed working set at `notes/HANDOFF_notes_track_2026-06-21.md` + canonical index `notes/LazyTopper_NoteProtos_INDEX_2026-06-21.md`). **DECISION (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** fed by a structured note-spec (`notes/specs/<topic_key>.json`) as the single source of truth — NOT standalone HTML; the tutor + PR-F both consume the spec as data, and **Step 2 authors specs (JSON), not HTML**. **NEXT (notes track — gated order, do NOT reorder): (1)** `notes/validate_spec.py` — a source-required validator to note-spec schema v1.1 (this gate makes the ~35-note fan-out safe to parallelize); **(2)** a content PR under `notes/` (validated Light reference spec `light-reflection-and-refraction.json` + the schema-v1.1 doc + the validator; evolve the kit to `render_note(spec)`; finish Light's figure + mindmap lift); **(3)** then in parallel **PR-F** (the `<Note>` component + Topic Hub wiring, reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments — Electricity/Chemical Reactions/Life Processes [keep its 3 figures]/Quadratic Equations — → ~35 notes), validator-gated. **Do NOT start Step-2 generation or PR-F before the validator + content PR land.** `magnetic-effects` = generate-TRIMMED (field / field-lines / field-due-to-conductor·solenoid / right-hand-rule / force-on-a-conductor; EXCLUDE Motor / EMI / Generator — re-read `syllabusGuard.ts` first); `topic_key` must match `topics.ts` (two trig keys → one `trigonometry`). New follow-up: **[FU-NOTES-MATHS-MAP]** (the Maths NCERT folder is not yet content-mapped). )
Previously (post-PR #286 — **PYQ symbol-integrity pass MERGED** (trunk `b600e2b`): the parallel symbol-fix track that RESOLVES the SOURCE-DATA gap #284 flagged. Audited ALL 103 PYQ packs / 759 questions (Maths + Science) in an isolated worktree (`fix/pyq-symbol-integrity`); **3 commits squash-merged**. **(1) Batch 1 — 12 √/operator recoveries** in `real-numbers`/`quadratic-equations`/`polynomials` `questionText` (RN-003/005/008, REALNUM-2024-003, REALNUM-2025-001 (twin recovery), REALNUM-2026-002/003/004/005, QE-003/004, POLY-2024-005b), EACH verified against the question's own marking-scheme answer or a clean twin — recover-never-fabricate. Correctly EXCLUDED ~35 false-positives where √ lives only in the *answer* (question correct as-is). **(2) Withhold 38 unservable questions** — 17 Science (bilingual/CID column bleed) + 21 Maths (blank / garbled-expression / questionText-contradicts-its-own-answer / subset-font Hindi-as-Latin mojibake) — via a SINGLE source-level filter: `canonicalQuestionBank = RAW_CANONICAL_QUESTION_BANK.filter(q => !WITHHELD_QUESTION_IDS.has(q.id))` (honest omission > broken question; corrupt source objects kept INTACT in their packs for re-extraction; lifecycle = remove an id as its real text is supplied). Fragile-file evidence: the 349 `...PACK` spreads BYTE-IDENTICAL to trunk; **RAW 6579 → LIVE 6541, delta == 38** (0 leaked / 0 collateral / 0 dup-ids; every withheld id present in raw). **(3) §7 — normalize ° / π / √** in 5 `areas-related-to-circles` `questionText` (ARC-004/005/006, 2025-ARC-001/002), answer-verified. SCOPE: `questionText` + `WITHHELD_QUESTION_IDS` only — `predictionTypes.ts` + all id/marks/year/set/answer/options/solutionSteps untouched. Gates ALL GREEN: tsc, mojibake, scope:guard, root matrix 181/181, lazytopper ops matrix, withhold runtime check, CI quality-gate (linux build). Owner squash-merged #286; no self-merge. ⚠️ **Withheld Qs stop being served on MERGE + REDEPLOY** (not on push). Reports in `Desktop/diff/` (`report-pyq-withhold-and-followups-2026-06-21.md`, `PYQ_batch_for_owner_lookup_2026-06-21.md`, `PYQ_REEXTRACTION_followup_2026-06-21.md`). **PYQ √-data audit follow-up from #284 RESOLVED** (recoverable set fixed; unrecoverables withheld + queued for owner real-paper lookup). New follow-ups: **[FU-PYQ-OWNER-LOOKUP]** (14 unrecoverable Maths expressions — owner supplies from real papers, batched by paper code), **[FU-PYQ-REEXTRACT-SCIENCE]** (re-extract the 2025/26 bilingual Science papers = the 17), **[FU-PYQ-ANSWER-FIELD-SYMBOLS]** (answer/solution fields STILL carry dropped √ — this pass fixed questionText only), **[FU-PYQ-CORRUPTION-DETECTOR]** (mojibake-by-subset-font across BOTH subjects + an answer-consistency check; note `mismatch_scan.py`'s `√\s*\w` regex captures only ONE char → under-reads multi-digit surds, so "only REALNUM-2024-004 is a true text-answer mismatch" is a screen not a guarantee), **[FU-PYQ-ANGLE-NORMALIZE]** (`Ð`→`∠` + remaining °/π/superscript normalization, bank-wide). )
Previously (post-PR #280/#283/#284 — **Worksheet rebuild E2a → E2a.3 MERGED** (trunk `cfff277`): the worksheet FOUNDATION — ONE responsive `WorksheetGenerator` (build→generated in-place; replaced the desktop+mobile twins) + distribution fix (multi-topic EVEN / full-subject BOARD-WEIGHTAGE / MI ×1.5 re-weight; largest-remainder capped at availability → honest counts) + deleted-topics filter (heredity-and-evolution, magnetic-effects) + real-math downloadable PDFs (the E2a jsPDF-ASCII path stripped √→"sqrt" → replaced with MathText/KaTeX → detached offscreen host → html2canvas → jsPDF FILE download "Option B", paginated, count-identity locked) + persist-by-`worksheetId` (`worksheetSessionStore`, the PR-E2b grade contract) + view-aware Back + MI-enrich as the page's single NAVY anchor in the right preview with three honest states (signed-out→login-return CTA / in-scope hotspot→toggle / signed-in-no-hotspot→how-to-unlock). The "MI box hanging in air" was the global `input{width:100%;appearance:none}` ballooning a bare checkbox (hard-scoped). **Missing-symbol issue = SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated): `real-numbers.pyq*.ts` shipped 11 irrationality questions with √/expressions stripped from `questionText` (clean camelCase `realNumbers.*.ts` fine) → parallel symbol-fix agent; list in `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`. #281 closed (superseded by #283). Isolated worktrees; owner Vercel-verified each before merge; no self-merge. Full architecture + PR-E2b plan + gotchas: **`handoff/WORKSHEET_TRACK_HANDOFF.md`** + the WORKSHEET section below. **NEXT: PR-E2b** (the AI grade loop). New follow-ups: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE], PYQ √-data audit (all subjects). )
Previously (post-PR #278 — **CLAUDE.md governance refresh MERGED** (trunk `f7170ef`): a surgical root-file edit — CLAUDE.md ONLY, +37/−9; product PR (root file), owner-merged, no self-merge; built in an isolated worktree (`chore/claude-md-refresh` off `b4163ef`, commit `ea837d4`, squash `f7170ef`). Changes: **(1) ADDED §2a Worktree Isolation** — the project's #1 lesson made an invariant rule (three prior collisions came from agents sharing the one checkout `C:\Projects\Lazytopper-Production`; one swept product code into a docs merge → every task now runs in its own `git worktree`, verify `git branch --show-current` before every commit). **(2) DE-HARDCODED the root matrix count** in §6 + §6a (was "175/175"; the count GROWS — 181 as of 2026-06-20 — so the file now says "verify what the suite reports now, do NOT hardcode"). **(3) Replit→"CI linux runner / GitHub Codespaces"** in §6 (Replit retired; the linux-x64 build-pin fact + "Windows can't build locally, CI-gated" kept). **(4) ADDED the verification doctrine** to §6 — static gates (tsc/matrix/build) are necessary but NOT sufficient; any change touching a live round-trip (auth, grading, persistence, routing/filtering, the tutor) needs ONE real owner live-execution before "done", flagged as needing live-verify. **(5) §13 CBSE 2025-26 → 2026-27** throughout + a new competency-split line (verified pattern: ~50% competency-based / 20% MCQ / 30% short-and-long; mock/worksheet generation should represent the competency proportion, not just section/marks counts; the step-marking minimums A=1/B=2/C=3/D=5/E=4 are unchanged). **(6) ADDED the marks-bucket gotcha** to §7 (the PR-E1 lesson: the `"1"/"23"/"5"/"4"` buckets FUSE 2-and-3-mark and can't isolate a single mark value → for exact mark-range filtering use numeric `q.marks`, never the coarse buckets). **(7) ADDED to §5** the MockBuilder-retired + MI-is-sidebar-chrome-only + re-read-`scripts/src/syllabusGuard.ts`-before-generating-content rules. §3/§8/§9/§10/§11/§12 and ALL gate COMMANDS untouched; no restructuring. The pre-existing line-1 UTF-8 BOM was LEFT as-is (owner decision — cosmetic, not gate-flagged, pre-dates this PR; the mojibake check doesn't scan root files). NEXT unchanged: **PR-E2 (Worksheet)**, branched fresh from `f7170ef`. )
Previously (post-PR #276 — **Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter, Chapter-test wired, MockBuilder un-routed — MERGED** (trunk `1de6f3e`): the PR-E wiring stage. Built in an **isolated git worktree** (`feat/practise-filter-chaptertest`, branched off `acc419b`), landed as **3 commits squashed to `1de6f3e`** across one implementation + two owner-found behavioral round-trips. **Scope delivered:** **(1) concept-row "Practise" now routes DIRECTLY to Quick Practice** (`/practice/:grade/:subject`) instead of the generic `/practice-hub` (the old 2-click bug); a new `buildDesktopConceptPracticePath` carries the concept context, while the hub path (`buildDesktopPracticePath`) is unchanged for other entry points. **(2) Exact mark-band filtering (Option A, owner-decided after live-verify):** the FIRST cut translated the band → the page's coarse `marksFilter` buckets, but the bucket model FUSES 2- and 3-mark questions into one `"23"` bucket (`PracticePage.tsx:53`), so "3–5 marks" leaked 2-mark questions and "2–3" couldn't isolate 3-mark — owner caught this at live-verify. Fix: the concept-row route now emits an EXACT numeric range `marksMin`/`marksMax` (parsed from the concept's band by `parseMarkBandRange` in `navigation.ts`) and `PracticePage` filters by `Number(q.marks)` within `[min,max]` (`parseMarksRangeParams`); "3–5" yields ONLY 3/4/5, "2–3" yields real 2 AND 3. The lossy `markBandToBuckets`/`marksBucketsToParam` helpers became dead and were REMOVED (caller-checked). **(3) Single-pool count fix (third round-trip):** the "N available" hint and the displayed set were drawn from two independent `generatePracticeSet` samples (different random draws), so the hint promised e.g. 10 while the display held 5–6 even on a healthy bank — a two-pool divergence (note: the hint's `count:200` is clamped to 100 by `MAX_QUESTION_COUNT`, so depth was never the cause). Fix: extracted a pure module-scope `questionMatchesFilters` + `selectInRangeFromPool(pool,…,committedCount)→{available,displayed}` so BOTH the hint and the display derive from the SAME realized pool → `available >= displayed.length` always; honest thin-bank case preserved (real smaller number shown, no padding). **(4) PATH-CONDITIONAL contract held throughout:** the exact-range filter fires ONLY when `marksMin`/`marksMax` are present (concept-row entry); the Practice-HUB entry emits none → stays "All"/student-controlled, bucket UI untouched. The pre-applied band is a CHANGEABLE starting filter (student can widen/clear). **(5) Back-nav:** concept-row Quick Practice now passes `backLabel:"Back to {Topic}"` + the specific Topic Hub `returnTo` (was landing on a generic "Exam Trends" default). **(6) Applied-filter indicator:** a light "Practising {Concept} · {min}–{max} marks · edit filters to change" band renders on the concept-row entry ONLY (gated on the URL range), so the student sees the band + that it's editable. **(7) Chapter-test action button WIRED** — the PR-D inert "Soon" button now navigates to the existing Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) via `buildDesktopChapterTestPath`; the page itself was already built (real gen→score→persist) and is NOT redesigned here (its old-design redesign is backlogged → [FU-CHAPTERTEST-PAGE-REDESIGN]). **(8) MockBuilder UN-ROUTED** — both `/mock-builder` routes now redirect to `/practice-hub` (chosen over bare deletion so the remaining inbound links — DesktopHome/HPQ/StudyPlan/Practice-Paper card — don't 404), lazy import + command-palette dispatch repointed, tagged `PR-G-deletion-pending`; the MockBuilder file is KEPT (PR-G deletes the legacy set). This is the ONLY `App.tsx` touch and was owner-flagged. **`Worksheet` button stays inert "Soon" → PR-E2.** **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.** Files: `lib/desktop/navigation.ts` (+test), `pages/PracticePage.tsx` (+`PracticePage.marksFilter.test.ts`), `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx` (+test), `components/practice/PracticeControls.tsx`, `App.tsx` (MockBuilder un-route only). FORBIDDEN files untouched (`predictionTypes.ts`, `Welcome`/`DesktopShell`/`main`, `vite.config`, `firebase.json`, `firestore.rules`, `src/data/**`). Local gates GREEN across all three rounds: tsc, root matrix **181/181**, lazytopper ops matrix, mojibake, scope:guard `--mode product`, `git diff --check`; vitest + linux `vite build` gated by **CI `quality-gate` GREEN**. **Owner LIVE-VERIFIED** the final state (concept-row "3–5" shows zero 2-mark + the count/display agree; hub entry still "All"; Back returns to the specific topic; MockBuilder unreachable) and merged #276. Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`. **NEXT (Topic Hub queue, owner-authorized separately, branched fresh from `1de6f3e`): PR-E2** (Worksheet — its own locked spec) → **PR-F** (Notes + Examiner's-tips content) → **PR-G** (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]**, **[FU-CHAPTERTEST-PAGE-REDESIGN]**. )
Previously (post-PR #274 — **Topic Hub PR-D final-IA LAYOUT MERGED** (trunk `b57fa79`): the structural/visual rebuild of `ConceptSpine` to MATCH the binding mockup `docs/design/topichub_ia_mockup_FINAL_2026-06-19.html`. **Learn-first** (concept rows are the hero under a "Learn the N concepts" header; the topic-level action band recedes into a quiet dashed zone BELOW them); **Notes consolidation** (one unified "Notes" toggle replaces the Formula-sheet/Proofs/Practice-all tab bar — honest "coming soon"); **Examiner's tips** clickable/expandable container seeding the one real `examinerWarning`, NO fabricated tips (full set = PR-F); **action band** = "Practise this topic" (primary, routes to the existing whole-topic practice) + inert "Chapter test"/"Worksheet" ("Soon", wired in PR-E); **concept "Practise" carries concept + mark band** (`buildDesktopPracticePath` gains an optional `markBand`; `DesktopTopicHubPage` passes `concept.marks`); **per-row "Visual" badge** only where `findVisualForConcept` is non-null (honest); **MI stays sidebar chrome — none on the page body** (#270/#271 guard held). Single responsive component, pure-CSS `@media (max-width:1023px)` reflow, class-driven (no inline styles); `ConceptSpine.test.tsx` rewritten for the new contract. 4 files (`ConceptSpine.tsx` + test, `navigation.ts`, `DesktopTopicHubPage.tsx`) +515/−175; built in an **isolated git worktree**. Local gates GREEN: tsc, mojibake, scope:guard `--mode mixed`, root matrix 181/181, lazytopper ops matrix, diff-check, forbidden-file (none touched); vitest + linux `vite build` gated by **CI `quality-gate` GREEN**. **Item 7 (mobile full-screen tutor toggle) SPLIT to its own PR-D.1** — owner-approved (a `TeachFlow` change, not ConceptSpine layout; unverifiable on Windows; not part of the mockup gate). **Owner LIVE-VERIFIED the layout = GOOD** then squash-merged (#274, `b57fa79`); branch + worktree cleaned up. **New follow-up [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-row "Practise" lands on `/practice-hub` (`navigation.ts:75`) not Quick Practice, and its `markBand="1–2"` STRING is never consumed — `PracticePage` filters via a numeric `marksFilter` bucketed to `"1"/"23"/"5"/"4"` (`PracticePage.tsx:182`,`326-329`) and never reads `markBand` → param carried, not applied. Fix is **path-conditional** (pre-apply the band only on the concept-row entry; leave the hub path student-controlled). **Two decisions recorded this handoff (see DECISION_LOG):** **MockBuilder RETIRED** (un-routed from the live product + tagged for PR-G deletion, code kept — Mistake Intelligence now auto-captures the "hard questions to revisit" need it served manually) and **[FU-BOOKMARK-SAVE-QUESTION]** (future lightweight "save this question even if answered correctly" → surface on Me/Progress; not a launch blocker). Report: `report-topichub-prd-layout-2026-06-20.md`. **Item 7 (PR-D.1) corrected blast-radius:** `TeachFlow` now backs ONLY the one live Topic Hub tutor — `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx` are dead (PR-G deletes them); everywhere else the AI does solution-CHECKING, not tutoring. Previously (post-PR #265 + #264 — **Bank Expansion Phase 1, Batch 2 (45 net-new Exemplar Maths Qs) + vitest-infra fix MERGED** (trunk `381e9df`): two PRs landed — #264 vitest-infra (`2ef0b2c`) then #265 Batch 2 (`381e9df`). **#265 Batch 2 (THE DECOUPLE):** 45 net-new authentic Exemplar QUESTIONS + AI-GENERATED step-marked SOLUTIONS, owner-verified before merge — **Coordinate-Geometry 22 + Areas-Related-to-Circles 23** in new `coordinateGeometry.exemplar2.ts` / `areasRelatedToCircles.exemplar2.ts` (registered in `canonicalQuestionBank.ts`; `AI_GENERATED_SOLUTION_IDS` extended; **`predictionTypes.ts` NOT touched**). By section: A=9, B=16, C=17, D=3. **Syllabus exclusions at question level:** CG **Area-of-Triangle-in-Coordinate-Geometry BANNED** → 7 area items dropped (Ex7.1 Q7,18; 7.3 Q9,16,17; 7.4 Q2,4); 13 figure-locked "shaded region" items dropped (CG Ex7.1 Q15, 7.4 Q5; ARC Ex11.3 Q2,6-9,11-13,15; Ex11.4 Q6,17); 1 unrecoverable-options MCQ dropped (CG Ex7.1 Q16 — not guessed); **3 reconstructed-math items flagged `// ⚠ RECON`** (CG MCQ-003, SA-006, SA-008). Every `solutionStep` `[N mark]`-prefixed summing to marks; every `finalAnswer` cross-checked vs the official key (jeep2an.pdf). Borderline list surfaced (collinearity-via-area CG Ex7.2 Q5,Q10 / 7.3 Q19 excluded; ARC Ex11.2 Q3 + Ex11.4 Q3 included-and-flagged). Gates GREEN: tsc, per-question validator 45/45, mojibake, root matrix 181/181 (incl. syllabus guard), ops matrix, scope:guard, diff-check; CI `quality-gate` GREEN. **Codespaces vitest = NO REGRESSION** vs base `5ce504e` (18/18 executable pass; the 7 infra suite-load failures pre-existed — fixed by #264). **FULL-CORPUS FIGURE-LOCKED CENSUS (owner-requested):** 67 figure-locked exercise Qs in-scope (A=15, B=10, C=25, D=17), **42 high-mark (C+D)** = launch-critical diagram-recovery target; by chapter Triangles 18 · ARC 17 · Circles 15 · SAV 9 · PLE 3 · CG 2 · Trig 2 · Stats 1. Reports: `report-bank-expansion-batch2-2026-06-18.md` + review docs (`.md`/`.html`). **#264 [FU-VITEST-INFRA] RESOLVED** (`2ef0b2c`): added `@testing-library/dom` direct devDep (the unsatisfied `@testing-library/react` peer that pnpm-strict hid → 5 suites) + guarded `src/test/setup.ts`'s `window.matchMedia` polyfill for `// @vitest-environment node` suites (→ 2 suites); pnpm-lock.yaml regenerated in Codespaces (pnpm 10.32.1, NOT Windows). **Codespaces vitest now 11/11 suites, 63/63 tests GREEN.** `predictionTypes.ts` untouched. Owner merged both (#264 by agent on owner instruction, #265 by owner). NEXT (owner; queued, each branched fresh from `381e9df`): **Batch 3 (Triangles + Circles)** — note this batch holds the bulk of the 42 high-mark figure-locked items → the diagram-recovery question comes to a head here → Batch 4 (Trig + Pair-of-Linear-Eq) → Batch 5 (Real-Numbers + Polynomials). Carried follow-ups: [FU-EXEMPLAR-STAT-13.4], [FU-EXEMPLAR-DEFERRED-NETNEW] (CG Ex7.3 Q12,14,15 + ARC Ex11.4 Q7,9,10,11,13,19), [FU-DIAGRAM-RECOVERY] (the 42 high-mark figure-locked Qs). Previously (post-PR #262 — **Bank Expansion Phase 1, Batch 1: 60 net-new NCERT-Exemplar Maths questions + AI step-marked solutions MERGED** (trunk `444238b`): THE DECOUPLE — authentic verbatim Exemplar QUESTIONS paired with AI-GENERATED, step-marked SOLUTIONS that the owner (examiner-of-record) verified before merge. **Net-new: Arithmetic Progressions 24, Statistics 16, Surface-Areas-&-Volumes 20** in NEW `*.exemplar2.ts` files (`AP_EXEMPLAR2` / `STAT_EXEMPLAR2` / `SAV_EXEMPLAR2`), registered in `canonicalQuestionBank.ts` (import + spread; engine-visible +60 verified). **Provenance via NEW `AI_GENERATED_SOLUTION_IDS` id-set** (mirrors PR2a `_source`; the forbidden `predictionTypes.ts` is NOT touched — the gated-field STOP was deliberately avoided by tracking solution-provenance as an id-set, owner-locked decision). **solutionSource split this batch: 60 ai-generated / 0 authentic-solution.** Every `solutionStep` carries a `[N mark]` prefix summing to marks; every `finalAnswer` cross-checked vs the official Exemplar answer key (jeep2an.pdf) — but the WORKED STEPS are AI (owner-verified). **Syllabus exclusions applied at the question level:** SAV frustum (11) + conversion-of-solids (11) + Stats ogive (1) dropped as BANNED; probability out-of-scope (separate topicKey); 6 figure-locked + 1 unreconstructable (SAV Ex12.2 Q3 — flattened formula, DROPPED not guessed) excluded; **3 reconstructed-math items flagged `// ⚠ RECON`** for fidelity spot-check (all in AP). Dedup vs the full repo corpus (2,889 maths Qs) by `ncertRef` + content; borderline list surfaced for owner. **Owner verified questions + solutions ("good to go") — no self-merge; owner merged.** Local gates ALL GREEN: tsc, per-question validator 60/60 (`[N mark]` sums, section↔marks, topicKey, no dup ids, no banned subtopic), mojibake, root matrix 181/181 (incl. syllabus guard over the new files), lazytopper ops matrix, scope:guard, git diff --check. CI `quality-gate` GREEN (linux `vite build`). **Codespaces vitest: NO REGRESSION** — the PR branch and untouched base `444238b` produce IDENTICAL results (18/18 executable tests pass incl. `predictionCore.source`/`.pastboardyear`; the 7 suite-load failures are a PRE-EXISTING repo test-infra gap — missing `@testing-library/dom` + jsdom env not active — failing identically on base → NOT caused by this PR). Authority: Pass-2 net-new audit + `AGENT_bank_expansion_p1_exemplar_maths_2026-06-18.md`. Reports: `report-bank-expansion-p1-exemplar-maths-BATCH1-2026-06-18.md` + `report-bank-expansion-p1-exemplar-maths-2026-06-18.md` (Phase-A) + review docs (`review-bank-expansion-batch1-2026-06-18.md`/`.html`). 4 files; owner squash-merged `444238b`. NEXT (owner; queued, each branched fresh from `444238b`): **Batch 2 (Areas-Related-to-Circles + Coordinate-Geometry)** → Batch 3 (Triangles + Circles) → Batch 4 (Trigonometry + Pair-of-Linear-Eq) → Batch 5 (Real-Numbers + Polynomials). New follow-ups: **[FU-VITEST-INFRA]** (add `@testing-library/dom` + jsdom env so vitest suites load cleanly), **[FU-EXEMPLAR-STAT-13.4]** (Stats LA Ex 13.4 question text not extractable from jeep213.pdf — needs a clean source), **[FU-EXEMPLAR-DEFERRED-NETNEW]** (AP Ex 5.3 extras + more reasoning parts available for a later top-up); Fix B [FU-TOPICKEY-CONSOLIDATION] migration scope now includes these new rows.)
Previously (post-PR #259 — **AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock MERGED** (trunk `775ee75`): the ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` (authentic 1.0 / predicted 0.6 / ai 0.3) only applied inside `getLikelyQuestionsForConcept` (Quick Practice / topic practice); the mock engines route through `getAllQuestions()` + their OWN selection and still drew AI at full parity. **Extended the SAME soft demotion (reused PR2a's ONE multiplier — exported `getSourceMultiplier`, no fork) to both mock surfaces.** **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` now does `predWeight *= getSourceMultiplier(q)` per section/marks slot; new `sourceWeightedPick` makes the guaranteed-archetype prefill authentic-first (was uniform-random); `weightedSelect` exported for the test. **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)` per slot. **⚠️ Boundary correction (load-bearing):** the instruction assumed **HPQ** also uses `getAllQuestions()` + serves AI at parity — **WRONG.** HPQ (`highlyProbableQuestions.ts`) is a hand-authored curated bank (`ple-hpq-*`, `sci-he-hpq-*`, `rn-comp-*`); it never calls `getAllQuestions()` and contains ZERO AI-pack content (`hpqCompetencyAdditions` curated too) — nothing to demote (×1.0 everywhere). Left **untouched** (no cosmetic no-op), mirroring PR2b's boundary-correction precedent. **All AI-bearing surfaces now covered: Quick Practice/topic practice (PR2a) + Full Mock + Topic Mock (this PR); HPQ was already AI-free.** **Structure-preserving + count integrity:** demotion operates WITHIN each already-constrained section/marks pool, never globally; soft (`0.3/0.6`, never 0; additive base/topic/rng terms keep every candidate selectable) → an authentic-thin slot still fills with AI, no slot left empty; blueprint loop / section counts / pools unchanged — only WHICH question fills each slot changed; zero question added/removed; repair passes (`repairArchetypes`/`repairStreamBalance`) left as-is (rare hard-constraint satisfiers). **New follow-up — [FU-AITIER-RANK-DIFFICULTY-HELPERS]:** `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity but were out of named scope + the authorized file list → flagged for a future owner-authorized PR (NOT touched). Added `mockEngineSource.test.ts` — **Codespaces vitest 7/7 PASS** on `ba2f619` (per-slot authentic preference + soft AI fallback for both engines; CI quality-gate does NOT run vitest). Authority: PR2a (`686f737`) + `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_rank_mocks_hpq_2026-06-18.md`. Report: `report-ai-tier-rank-mocks-hpq-2026-06-18.md`. 4 files +209/−11; squash `775ee75`. CI `quality-gate` GREEN (1m17s incl. linux `vite build`; root matrix 181/181). Local gates green; no forbidden files (`predictionTypes.ts` untouched). **No self-merge; owner squash-merged; branch deleted (local + remote).** NEXT (owner; queued): **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items; **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (difficulty-helper surfaces).)
Previously (post-PR #257 — **AI-tier PR2b strip fabricated `pastBoardYear` MERGED** (trunk `d6e0e14`): anti-fabrication — predicted/HPQ questions carried a self-asserted `pastBoardYear` with no traceable PYQ reference (authentic PYQs use the traceable `pyqYear`, 759 values; the authentic `questionBanks/**` tree has ZERO `pastBoardYear`). **⚠️ Boundary was wrong — the instruction assumed 75 values / 2 files; exhaustive repo-wide enumeration (owner-mandated before stripping) found 96 values / 5 files** (an undercount of 21): `predictedQuestions.ts` 55, `predictedQuestionsScience.ts` 20 (incl. **8 non-numeric `"Model"`**), `class10SciencePredictiveEngine.ts` 12, `highlyProbableQuestions.ts` 8 (student-facing HPQ), `scripts/ops/hpq_phase2_acceptance.entry.ts` 1 (test fixture). Owner authorized **Option A** = strip all 96 + clean every consumer. **Consumer cleanup — all 8 `.pastBoardYear` reads removed (0 remain repo-wide):** `predictionCore` dedup tiebreaker → **score-only** (the `pastBoardYear` clause was always-false post-strip); `predictionCore`+`mockPaperEngineScience` `sourceYearHint` → `targetYear-1`; `predictionCore` converters + `predictionScoring` + `paperEngine` + `hpqConfidence` → dropped the dead `pastBoardYear` 5-signal-input field. **KEY FINDING — HPQ confidence does NOT shift (dead plumbing):** the 5-signal scorer (`cbse5SignalScoring`) and Bayesian recurrence scorer (`probabilisticScoring`) compute recency from the historical dataset's `sourceYear` and NEVER read `input.pastBoardYear`/`sourceYearHint` — so stripping it changes ONLY the dedup tiebreaker; HPQ/mock confidence numbers are unchanged (proven by unit test #4). **`predictionTypes.ts` (forbidden) NOT touched** — optional field stays declared, all values removed; nothing invented to replace stripped data. **Count integrity:** field-removal only — served bank **total 6,715 UNCHANGED** (tiers {authentic 3,710 · ai 2,764 · predicted 241}; `pastBoardYear_remaining=0` at the serving layer); per-file question counts unchanged. Added `predictionCore.pastboardyear.test.ts` — **Codespaces vitest 9/9 PASS** (5 PR2b + 4 PR2a regression): score-only dedup, 5-signal independence from `pastBoardYear`, served-bank zero-`pastBoardYear` guard. Authority: `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_pr2b_pastboardyear_strip_2026-06-18.md`. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`. 11 files +113/−106; squash `d6e0e14`. CI `quality-gate` GREEN (1m9s incl. linux `vite build`; root matrix 181/181). Note: `hpq_phase2_acceptance` (ops, NOT a CI gate) can't run in Codespaces — pre-existing `Cannot find package 'esbuild'` in its bundling harness (fails identically on trunk; my change there is one clean fixture-line removal). **No self-merge; owner squash-merged.** NEXT (owner; queued): **[FU-AITIER-RANK-MOCKS-HPQ]** (apply the `sourceMultiplier` demotion to Full Mock / Topic Mock / HPQ, which use `getAllQuestions()` + own selection); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items.)
Previously (post-PR #255 — **AI-tier PR2a source-provenance stamp + soft AI-lower ranking MERGED** (trunk `686f737`): the ARCHITECTURAL fix the audit flagged — AI-lower ranking was never enforced (`getAdjustedScore` had no source term; the file/suffix tier marker was destroyed at the bank concatenation, leaving ~41% AI at full parity). **Change 1 (additive, `canonicalQuestionBank.ts`):** capture AI-pack ids at ingest where the source file is still known — `AI_GENERATED_QUESTION_IDS` from the **54 `.pack[1-3]` source arrays**; the bank array is untouched (zero reorder/adds/deletes). **Change 2 (`predictionCore.ts`):** `QuestionSource = "authentic"|"ai-generated"|"predicted"` on the LOCAL `CanonicalQuestionWithScore` intersection (the forbidden `predictionTypes.ts` is NOT touched — same pattern as `_adjustedScore`); stamp at the merge (predicted converters → `"predicted"`; canonical classified by the AI-pack id set; `dedupeById` made generic so `_source` survives); `getAdjustedScore` gains `* getSourceMultiplier`. **Multipliers (owner-locked): authentic `1.0` / predicted `0.6` / ai-generated `0.3` — SOFT, never zero** (AI still surfaces when authentic is thin; tunable in one `SOURCE_MULTIPLIER` const). **Surfaces COVERED** (route through `getAdjustedScore` via `getLikelyQuestionsForConcept`): Quick Practice / topic practice (`practiceSetGenerator.generatePracticeSet`, `predictionDataService`). **Surfaces NOT yet covered → [FU-AITIER-RANK-MOCKS-HPQ]:** Full Mock (`unlimitedPaperEngine`), Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`) use `getAllQuestions()` + their own selection — same `sourceMultiplier` needed there in a later PR. **Count integrity:** additive only — exact live split (Codespaces): **total 6,715 = authentic 3,710 (55.3%) + ai-generated 2,764 (41.2%) + predicted 241 (3.6%), 0 unstamped** (authentic is **790 short** of the 4,500 retirement threshold). Added `predictionCore.source.test.ts` — **vitest 4/4 PASS in Codespaces** (equal-base authentic > ai; soft so strong ai still surfaces; tier order; live-pool drift guard). **✅ Owner-requested live-verify = PASS** (functional, real `getLikelyQuestionsForConcept` on trunk `686f737`): on ~50%-AI topics the first AI question lands at index ~100–186, so a 10-question Quick Practice serves ALL authentic — Real Numbers (49% AI) first-AI @#97, Triangles (52%) @#127, Trigonometry (53%) @#186; Light/Electricity (30%) @#239/#217. Before PR2a, AI interleaved at parity. **Decisions locked:** multipliers `1.0/0.6/0.3`; **curated-26 inline items stay authentic → [FU-CURATED-26-PROVENANCE]** (owner-logged). Authority: `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_pr2a_provenance_ranking_2026-06-18.md`. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`. 3 files +265/−9; squash `686f737`. CI `quality-gate` GREEN (1m11s incl. linux `vite build`; root matrix 181/181). vitest runs in Codespaces, NOT the quality-gate — verified there separately. **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR2b** (`pastBoardYear` strip — now unblocked: this stamp distinguishes verifiable PYQ years from fabricated predicted-layer ones); then **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7.)
Previously (post-PR #253 — **AI-tier PR1b pack-file 5-mark retags MERGED** (trunk `f83915b`): the relabel-only follow-up to #251 that drains the `PACK_5MK_SHORT_BACKLOG`. **Group A — 12 genuine 5-mark long-answers** relabelled `format:"Short"→"Long"` (label-only; each confirmed by reading its `questionText`): `ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046, HEC2-039, LT2-016/024, ME2-025, REP2-048`. **⚠️ Safeguard fired — `PR2-018` reclassified:** the instruction's 13th Group-A id ("3 red, 4 green, 5 blue → P(not blue)") is a single-step `7/12` one-liner, NOT a long-answer → **moved to Group B (quarantine), not relabelled** (relabelling would worsen it). So Group A = **12** (not 13). **Group B — 7 QUARANTINED** (content↔marks mismatch; short questions wrongly tagged 5-mark; NOT relabelled — fixing them is a marks/content pass, not a label flip): `TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018` → logged **[FU-AITIER-MARKS-MISMATCH]**, kept pinned in `PACK_5MK_SHORT_BACKLOG` (now annotated) so the guard tracks them with no regression. **Backlog 19 → 7.** Count UNCHANGED (pure label edits; symmetric per-file diffs). **[FU-AITIER-PACK-5MK-SHORT] RESOLVED** (relabel half done; the residual 7 carry forward as the marks-mismatch follow-up). Authority: report-aitier-pr1-mechanical-2026-06-17.md + cofounder Group-A/B classification → AGENT_aitier_pr1b_pack_retags_2026-06-17.md. Report: report-aitier-pr1b-pack-retags-2026-06-18.md. 9 files +34/−19; squash `f83915b`. CI `quality-gate` GREEN (1m9s incl. linux `vite build`; root matrix 181/181 with backlog now 7). **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip) → carried doctrine below; plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7.)
Previously (post-PR #251 — **AI-tier PR1 mechanical content-integrity MERGED** (trunk `f4a41b6`): the first remediation from the read-only AI-tier audit. (1) Added `"Long"` to `QuestionKind` in `predictedQuestions.ts` + `predictedQuestionsScience.ts` (NOT the forbidden `predictionTypes.ts`; no exhaustive-switch break) and mapped `kind:"long"→format:"Long"` in `predictionCore.toCanonicalFormat` so the retag actually propagates to the unified bank. (2) Retagged **24** five-mark Section-D predicted items `kind:"Short"→"Long"` (12 maths + 12 science). (3) **Split fused Q10** (`2026-RN-LA-03`, the alarm-clock-LCM + prove-√5 weld with the 5-mark/Section-D/Short tags) into `2026-RN-SA-08` (LCM, Section C/3mk) + `2026-RN-SA-09` (√5 proof, Section C/3mk) — **net +1**, the only intended count change; `pastBoardYear` omitted on the new items (no fabricated provenance). (4) Added `scripts/src/aiTierContentIntegrityGuard.test.ts` to the root `test:matrix:all` (**175→181**) — fails on fused (`also prove`), section↔marks mismatch, and 5-mark "Short". **[FU-MALFORMED-QUESTION] RESOLVED** (Q10 de-fused + guard locks the class). **⚠️ Flagged discovery — the audit undercounted:** the SAME defect exists in **19 more** `.pack2/.pack3` questions (they use `format:"Short"`); `.pack` files are gated + out of this PR's scope, so they are pinned as a shrink-only backlog (`PACK_5MK_SHORT_BACKLOG`) → **[FU-AITIER-PACK-5MK-SHORT]** for **PR1b** (owner-authorized, separate; retag ONLY genuine LA, QUARANTINE content↔marks mismatches like TG3-056/REP2-039 for a content pass). Authority: report-ai-tier-audit-2026-06-17.md → AGENT_aitier_pr1_mechanical_2026-06-17.md. Report: report-aitier-pr1-mechanical-2026-06-17.md. 5 files +237/−41; squash `f4a41b6`. CI `quality-gate` GREEN (1m12s incl. linux `vite build`). **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR1b** (the 19-pack retag/quarantine) → **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip) → carried doctrine below.)
Previously (post-PR #249 — **"Finish session" scorecard trigger MERGED** (trunk `704dcff`): replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** button (always-available at the set foot, both desktop + mobile widths) → fires `practice_finish_session_click` + sets `sessionFinished` → surfaces the scorecard. `allDone` retained as a convenience auto-offer (`showScorecard = (sessionFinished || allDone) && questions.length > 0`). Reuses the EXISTING `sessionStats` — no new counters, no persistence, no session-lifecycle state machine. **Partial-session honesty** (the load-bearing requirement): attempted-only denominators + explicit "the M you didn't reach aren't counted" line + an honest zero-attempt state; unattempted questions are NEVER counted against the student. "Keep practicing this set" escape hatch on a manual partial finish. 2 files (`pages/PracticePage.tsx` +62/−2, `services/uxTelemetry.ts` +1); commit `b740a3f`. CI `quality-gate` GREEN (1m8s — incl. the linux `vite build`). **✅ Owner live-verify = PASS — partial-session honesty PROVEN:** a 3-of-10 finish reads "3 of 10 attempted · 0/3 MCQs correct · 0% accuracy · Here's how those 3 went, the 7 you didn't reach aren't counted"; the zero-attempt case reads honestly too. **Supersedes #240 sub-task 5's `allDone`-only trigger.** NEW follow-up logged for the next (read-only) audit: **[FU-MALFORMED-QUESTION]** — a live-observed malformed question (Real Numbers Quick Practice Q10 fused two questions: alarm-clock LCM + prove √5, with inconsistent 5-mark / Section-D / Short tags), suspected AI-generated pack origin. NEXT (owner; queued, NOT yet authorized): a **read-only AI-generated-question-tier audit** (its own instruction, branched fresh against `704dcff`) → then (iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]; then (2) MI eval ([MI-EVAL]) → (3) Stage 3 ([FU-DRILL-ENRICHMENT]) → Fix B [FU-TOPICKEY-CONSOLIDATION] when authorized. PRE-LAUNCH gate: [FU-DETECTION-META-LAUNCH-FLIP].)
Previously (post-PR #246 — **Check & Improve detect-then-confirm MERGED** (trunk `c9404e1`): builds on Claim 2 (#244). Detection is now VISIBLE + CORRECTABLE before grading. New flow on both surfaces: question input by type/paste/**photo of the question** (distinct slot from the answer photo) → **"Read the question →"** fires a detection-ONLY call (`POST /api/detect-question`, the cheaper call) on the question alone → a **confirmation chip** shows detected subject·topic·marks (+ source) with a quiet **[Change]** affordance → constrained correction (topic→canonical key via Fix A's resolver, marks 1–6, subject toggle; corrected mark flagged `marksSource:"user"`) → grade runs on the CONFIRMED values via the unchanged trusted-marks path (the grader `handleCheckSolution` is byte-identical). Override logged on the attempt record (`marksSource`+`detectionOverride`; reuses recordAttempt persistence — no new collection / no firestore.rules change). **`SHOW_DETECTION_META` flag (shared helper) default=ON for owner testing; ⚠️ MUST flip to OFF before student launch — see [FU-DETECTION-META-LAUNCH-FLIP], the tester-vs-student line.** Bank-grounding deferred behind Fix B. CI GREEN. **Owner live-verify of #246 = PASS 5/6** (printed marks read correctly; inference genuine + graduated — AP=2 vs proof=3 diverge; topics bucket clean; selectors gone both widths). The 6th: **[FU-DETECTION-MARKS-CEILING]** — inference under-calls true 5-mark questions (multi-part numerical + proofs) as 3; caught-and-correctable via [Change], NOT a blocker. NEXT (owner; queued, NOT yet authorized): **(ii) "Finish session" scorecard-trigger PR** → **(iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]**; then **(2) MI eval** ([MI-EVAL]) → **(3) Stage 3** ([FU-DRILL-ENRICHMENT]) → **Fix B [FU-TOPICKEY-CONSOLIDATION]** when authorized. PRE-LAUNCH gate: **[FU-DETECTION-META-LAUNCH-FLIP]**. Carried: [FU-SPELLING-GATED-REMAINDER] + [FU-TOPICKEY-CONSOLIDATION] + [FU-DETECTION-META-LAUNCH-FLIP] + [FU-DETECTION-MARKS-CEILING] + [FU-IMPROVEMENT-CARD] + [FU-WEAKAREA-ALIAS-DISPLAY] + [FU-ATTEMPT-MARKS-ACCURACY] + [FU-ATTEMPT-SR] + [FU-ME-REFRESH] + [FU-GRADE-MARKSCALE]/[FU-GRADE-CONSISTENCY]/[MI-EVAL]; owner+cofounder close [TRACK-B-GATE]; RESP-DIV-2)
Previously (post-PR #244 — **Check & Improve auto-detect MERGED** (trunk `43ffa09`): the grader determines marks/subject/topic from the question itself (Claim 2, option (a)); the student-picked selectors are GONE on both surfaces. Isolated behind a `detectMarks` flag so Quick Practice is byte-identical. Printed marks preferred → inferred → flagged `fallback`; topic constrained to the canonical vocab + re-canonicalised via Fix A's resolver. CI GREEN. Owner live-verify of #244 PENDING.)
Previously (post-PR #242 — **topicKey Fix A MERGED** (trunk `77f2ed2`): the Me weak-area row now resolves stored topic labels through the strong serving-side resolver (`desktopTopicForWeakAreaKey`) + 13 `topics.ts` aliases; the 13 in-bank spellings that fell to `/exam-trends` now route to Quick Practice. Read-time only. CI GREEN. **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED.** Preceded by the read-only topicKey-duplication audit. **Fix B [FU-TOPICKEY-CONSOLIDATION] HELD / authorized-later.** Owner live-verify of #242 PENDING.)

## Live base
Branch: base/approved-thru-437
SHA: 60c5bf9  (trunk tip — #291 Worksheet PR-E2b grade loop; latest PRODUCT commit)
Last merged PRs: **#291 (Worksheet PR-E2b — one-PDF AI grade loop + MI wiring: additive `gradeStructuredSet` core + `handleGradeWorksheet` in `checkSolution.cjs` (existing grader byte-unchanged), `POST /api/grade-worksheet`, `gradeWorksheet()` client, `worksheetGradeService` + `WorksheetGradePanel`, honest "graded X/Y + N pending" totals, single `recordMistake`+`recordAttempt` front door, stable `ws:<id>:q<N>` idempotency; 9 files +1201/−10; ⚠ owner live-verify PENDING; → `60c5bf9`)** · **#292 (Z3 Competency extraction — 102 authentic Maths case-based Qs into `competency.z3.ts`, ONE import + ONE spread, authentic tier, floor test; → `b1d3e46`)** · **#289 (Note-spec validator gate — `validate_spec.py` + schema v1.1 + Light reference spec + 5 negative fixtures, ALL under `notes/`; → `c525b2a`)** · **#282 (Notes-generation track Step-1 — content only, PARALLEL track, ALL under `notes/`; → `de2a616`)** · **#286 (PYQ symbol-integrity — 12 √ recoveries + withhold 38 unservable Qs + §7 °/π/√ normalize; → `b600e2b`)** · **#280 (Worksheet PR-E2a — responsive generator + distribution + 2 PDFs + persist-by-id; → `d065922`)**, **#283 (Worksheet PR-E2a.1+.2 — real-math + Option-B file download + count identity; → `9a080a0`)**, **#284 (Worksheet PR-E2a.3 — view-aware back + MI navy preview + honest locked states + source-data flag; → `cfff277`)** · #279 (docs(handoff) post-#278; → `883e904`). Earlier: **#274 (Topic Hub PR-D final-IA LAYOUT; → `b57fa79`)**, **#275 (docs(handoff) post-PR-D; → `acc419b`)**, **#276 (Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter + Chapter-test wired + MockBuilder un-route; → `1de6f3e`)**, **#277 (docs(handoff) post-PR-E1; → `b4163ef`)**, **#278 (CLAUDE.md governance refresh — worktree rule, matrix de-hardcode, Replit→CI, CBSE 2026-27, verification doctrine + marks-bucket/MockBuilder/MI/syllabusGuard rules; → `f7170ef`)**

## ⏳ WORKSHEET PR-E2b: ONE-PDF AI GRADE LOOP + MI WIRING (#291, trunk `60c5bf9`) — MERGED + CI GREEN · ⚠ OWNER LIVE-VERIFY PENDING
The SECOND half of the worksheet (E2a foundation merged). Built in an **isolated worktree** (`feat/worksheet-grade-loop`), rebased onto trunk `2cab012` (post-Z3) with ZERO conflicts. **Full architecture + the mandatory live-verify checklist live in `handoff/WORKSHEET_TRACK_HANDOFF.md`** — this is the summary. Report: `report-pr-e2b-worksheet-grade-loop-2026-06-23.md`. 9 files +1201/−10.
- **One PDF, ONE structured call** — student uploads ONE PDF of all answers (labelled Q1, Q2 …); graded against the worksheet's KNOWN scheme keyed Q1…QN, matched BY NUMBER (the questions PDF already prints the label instruction), never blind-segmented.
- **Server additive (live backend):** `server/routes/checkSolution.cjs` gained a surface-AGNOSTIC `gradeStructuredSet` core + `handleGradeWorksheet` + stub + per-question normaliser. **`handleCheckSolution`/`handleDetectQuestion` BYTE-UNCHANGED** (only the return-object line extended) → zero regression to the live Check & Improve grader (the PR's biggest risk). `questions.cjs` + `index.cjs` register `POST /api/grade-worksheet` (+OPTIONS/CORS). `readJson` 8 MB cap on THIS route only.
- **Honest-failure (anti-fabrication):** per-question `couldNotRead` — illegible/absent answers are NEVER given a fabricated mark and NEVER folded into a 0; an omitted question is pending, not zeroed. **Trusted marks** — per-question `totalMarks` = scheme `q.marks`; model awards within it; additive-floor `mistakeSummary` reconcile mirrors the wired path.
- **Client additive:** `aiClient.gradeWorksheet()` + types; `worksheetSessionStore` `save/getWorksheetGrade`; NEW `worksheetGradeService.ts` (testable seam — map-by-number, persist, fan each LEGIBLE result through the SINGLE MI front door `recordMistake` + score-twin `recordAttempt` with a STABLE `ws:<id>:q<N>` id → re-upload dedups via the front door's existing layer, NO parallel idempotency; grade core takes its question set as a PARAMETER → Chapter Test / Full Mock reuse). NEW `WorksheetGradePanel.tsx` (upload UI, sync progress, per-question results, **honest "graded X/Y + N pending" totals SEPARATE from the worksheet total**, MI evidence line) wired into `WorksheetGenerator.tsx`. NEW `worksheetGradeService.test.ts` (Codespaces/doc-only).
- **`recordAttempt` reconciliation:** the task doc said it didn't exist yet; on trunk it DOES + the worksheet handoff §4 calls for it → both `recordMistake` and `recordAttempt` wired (mirrors `SolutionChecker`); no `[FU-SCORECARD]`.
- **Forward-compat (shaping only — Chapter Test / Full Mock NOT built):** grade core is surface-agnostic; `RecordMistakeContext` left unchanged (the future optional `source` field is a later deliberate MI-engine change).
- **Gates:** tsc · mojibake 0 · scope:guard product · lazytopper ops matrix · root matrix **181/181** · `node --check` ×3 `.cjs` · diff-check clean — ALL GREEN pre- and post-rebase. **CI `quality-gate` GREEN (1m16s, incl. linux build).** No forbidden files; MI routing internals only CALLED. Cofounder review clean. **No self-merge; owner merged.**
- **⚠ OWNER LIVE-VERIFY = PENDING** (AI round-trip — static gates can't prove it). On the Firebase-authorized trunk URL, START SMALL (5-Q): right-question mapping + sensible marks; illegible page → honest "couldn't read Qn" + graded X/Y + N pending (not deflated); feeds Me/Progress + unlocks MI-enrich toggle; careless vs knowledge-gap route correctly; **Check & Improve still grades + feeds MI**; re-upload no double-count; phone end-to-end.
- **NEXT:** owner live-verify of #291 → worksheet (E2a+E2b) COMPLETE → PR-F (Notes + Examiner's-tips content) → PR-G (deletions). Carried worksheet follow-ups: [FU-ASYNC-GRADING], [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].

## ✅ WORKSHEET REBUILD — PR-E2a → E2a.3 (#280 `d065922`, #283 `9a080a0`, #284 `cfff277`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
The worksheet **foundation** (Topic Hub PR-E2). **Full detail, architecture, PR-E2b plan and gotchas live in `handoff/WORKSHEET_TRACK_HANDOFF.md`** — this is the summary.
- **#280 PR-E2a** — ONE responsive `WorksheetGenerator` (`components/worksheet/`, build→generated in-place) replacing the desktop (`DesktopWorksheetsPage`) + mobile (`app/Worksheets`) twins (UN-ROUTED, kept for PR-G). Distribution fix (`worksheetModel.ts`): multi-topic EVEN / full-subject BOARD-WEIGHTAGE / MI-enrich ×1.5 re-weight, largest-remainder **capped at real availability → honest counts** (shown == generated). Deleted-topics filter (`heredity-and-evolution`, `magnetic-effects`). Two PDFs. Persist-by-`worksheetId` (`services/worksheetSessionStore.ts`).
- **#283 PR-E2a.1+.2** — math made REAL via existing `MathText`/KaTeX (E2a jsPDF-ASCII had stripped √→"sqrt"); `window.print()` (printed whole page + clipped) REPLACED with a real client-side PDF FILE download (Option B — `WorksheetPrintDoc` → detached offscreen host → html2canvas → jsPDF, paginated, clean isolation). Count identity locked. No new deps.
- **#284 PR-E2a.3** — view-aware Back (generated→builder; build→`returnTo`); MI-enrich relocated into the RIGHT preview AFTER the snapshot as the page's single **NAVY anchor** (`hsl(220,25%,12%)`) with three honest states (signed-out→`/login?...&redirect=<here>` CTA / in-scope hotspot→toggle / signed-in-no-hotspot→how-to-unlock note); "hanging box" root cause = the global `input{width:100%;appearance:none}` (styles.css:265) ballooning a bare checkbox (hard-scoped). **Missing-symbol = SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated): `real-numbers.pyq*.ts` shipped 11 irrationality Qs with √/expressions stripped from `questionText`; list + paper refs in `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md` → parallel symbol-fix agent (all subjects; recover from twin/source, never invent).
- **Gates** (each PR): tsc · root matrix 181/181 · ops matrix · mojibake · scope:guard product · diff-check · **CI quality-gate GREEN incl. linux build**. vitest is Codespaces-only (not a CI gate). **Owner Vercel-verified each + merged; no self-merge.**
- **NEXT: PR-E2b** — the AI grade loop (extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1…QN via `getWorksheetSession`; wire `recordMistake` through the MI front door → worksheets feed Me/Progress + unlock the MI toggle; **mandatory 5-Q live-verify**). New follow-ups: **[FU-PITFALL-DATA]**, **[FU-WORKSHEET-PDF-SERVERSIDE]**, **PYQ √-data audit** (all subjects). Then PR-F (Notes/Examiner's-tips content), PR-G (delete dead twins + retired set).

## ✅ TOPIC HUB PR-E1: PRACTISE-FILTER + CHAPTER-TEST WIRING + MOCKBUILDER UN-ROUTE (#276, trunk `1de6f3e`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
BEHAVIORAL wiring — the PR-E stage. Built in an **isolated git worktree** (`feat/practise-filter-chaptertest`, off `acc419b`). Landed as **3 commits squashed to `1de6f3e`** (one implementation + two owner-found live-verify round-trips). Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`.
- **Concept-row "Practise" → Quick Practice DIRECT** — `buildDesktopConceptPracticePath` routes to `/practice/:grade/:subject` (was the generic `/practice-hub`, the 2-click bug). The hub builder `buildDesktopPracticePath` is untouched (other entry points rely on it).
- **Exact mark-band filtering (Option A)** — the first cut used the page's `marksFilter` buckets, but the bucket model FUSES 2- and 3-mark into one `"23"` bucket (`PracticePage.tsx:53`) → "3–5" leaked 2-mark, "2–3" couldn't isolate 3-mark (owner-caught). Final: the concept route emits EXACT `marksMin`/`marksMax` (`parseMarkBandRange`); `PracticePage` filters by `Number(q.marks) ∈ [min,max]` (`parseMarksRangeParams`). "3–5" → only 3/4/5; "2–3" → real 2 and 3. Dead `markBandToBuckets`/`marksBucketsToParam` REMOVED (caller-checked).
- **Single-pool count fix** — the "N available" hint and the displayed set came from two independent `generatePracticeSet` draws → hint promised 10, display held 5–6 on a healthy bank (the hint's `count:200` is clamped to 100 by `MAX_QUESTION_COUNT`, so depth was never the cause). Unified behind `questionMatchesFilters` + `selectInRangeFromPool(pool,…,committedCount)→{available,displayed}`; both read the SAME realized pool → `available >= displayed.length` always; honest thin-bank case preserved (real smaller number, no padding).
- **PATH-CONDITIONAL** — exact-range filter fires ONLY when `marksMin`/`marksMax` are present (concept-row entry); the Practice-HUB entry emits none → stays "All"/student-controlled, bucket UI unchanged. The band is a CHANGEABLE starting filter (widen/clear).
- **Back-nav** — concept-row Quick Practice passes `backLabel:"Back to {Topic}"` + the specific Topic Hub `returnTo` (was a generic "Exam Trends" default).
- **Applied-filter indicator** — light "Practising {Concept} · {min}–{max} marks · edit filters to change" band, concept-row entry ONLY (URL-range-gated; never on the hub path).
- **Chapter-test button WIRED** — PR-D's inert "Soon" button now navigates to the existing Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) via `buildDesktopChapterTestPath`. Page already built (real gen→score→persist); NOT redesigned here → **[FU-CHAPTERTEST-PAGE-REDESIGN]** (old-design page, wiring works).
- **MockBuilder UN-ROUTED** — both `/mock-builder` routes redirect to `/practice-hub` (over bare deletion, so inbound links — DesktopHome/HPQ/StudyPlan/Practice-Paper card — don't 404), lazy import + palette dispatch repointed, tagged `PR-G-deletion-pending`; file KEPT (PR-G deletes the legacy set). ONLY `App.tsx` touch (owner-flagged). **DECISION_LOG MockBuilder-retired now executed.**
- **Worksheet** stays inert "Soon" → **PR-E2** (its own locked spec).
- **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.**
- **Files:** `lib/desktop/navigation.ts` (+test), `pages/PracticePage.tsx` (+`PracticePage.marksFilter.test.ts`), `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx` (+test), `components/practice/PracticeControls.tsx`, `App.tsx` (MockBuilder un-route only). FORBIDDEN files untouched.
- **Gates:** tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · scope:guard `--mode product` PASS · `git diff --check` clean · forbidden-file PASS. vitest + linux `vite build` → **CI `quality-gate` GREEN**. **No self-merge; owner LIVE-VERIFIED + squash-merged.**
- **✅ Owner LIVE-VERIFY = PASS:** concept-row "3–5" shows zero 2-mark and the count/display agree; "2–3" shows real 3-mark; hub entry still "All"; Back returns to the specific topic; Chapter-test opens; MockBuilder unreachable.
- **NEXT:** PR-E2 (Worksheet) → PR-F (Notes + Examiner's-tips content) → PR-G (deletions). Separately: PR-D.1, [FU-CONTEXTUAL-TUTOR-REBUILD], [FU-CHAPTERTEST-PAGE-REDESIGN].

## ✅ TOPIC HUB PR-D: FINAL-IA LAYOUT (#274, trunk `b57fa79`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
STRUCTURAL/VISUAL — rebuilt `ConceptSpine` to MATCH the binding mockup (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html`). Built in an **isolated git worktree** ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-prd-layout-2026-06-20.md`. 4 files +515/−175; squash `b57fa79`.
- **Learn-first** — concept rows are the HERO under a **"Learn the N concepts"** header ("teach yourself first, then practise each"). The topic-level action band moves BELOW them and recedes into a quiet **dashed** zone ("When you're ready — practise or test the whole topic").
- **Notes consolidation** — one unified **Notes** toggle replaces the old `Formula sheet · Proofs · Practice all` tab bar (formulae + proofs + mind-map are sections of one Notes view). Honest "coming soon"; the "Practice all" function is absorbed by the band's "Practise this topic". Content = PR-F.
- **Examiner's tips** — clickable/expandable `★ Examiner's tips` CONTAINER (`aria-expanded`). Seeds the one real `examinerWarning` as a preview tip on seeded topics; honest "coming soon" for the rest. **NO fabrication** — the mockup's 4 sample tips were mockup-only, NOT copied; sample-preview placeholders are never shown as real tips. Per-topic tip content = PR-F.
- **Action band (3 buttons, correct hierarchy)** — `Practise this topic` (primary, solid green, routes to the existing whole-topic practice = old "Practice all") + `Chapter test` / `Worksheet` (secondary, present-but-inert `aria-disabled` with an honest "Soon" tag) pending their PR-E wiring.
- **Concept "Practise" → concept + mark band** — `buildDesktopPracticePath` gained an optional `markBand` param; `DesktopTopicHubPage` now passes `focus: concept.name` + `subtopicHint` + `markBand: concept.marks`. The route CARRIES both; consumption is [FU-PRACTISE-CONCEPT-FILTER] (PR-E).
- **Two-Practise differentiation** — topic-level = full "Practise this topic", solid primary, in the band; concept-level = short "Practise", green-tint secondary, in each card. Visually + structurally distinct.
- **Per-row visual badge (honest)** — `✦ Visual` shown ONLY where `findVisualForConcept(subject, slug, [concept.name])` is non-null (the same resolver the tutor uses; PR-C hardened it to return null not a wrong `concepts[0]`).
- **MI guard** — NO Mistake Intel on the page body; MI stays navy-sidebar chrome (#270/#271 rule held).
- **Responsive + grammar** — one responsive component, pure-CSS `@media (max-width:1023px)` reflow, 360px-safe, class-driven (no inline styles). `ConceptSpine.test.tsx` rewritten for the new contract (Notes single-toggle; Examiner's-tips expandable; 3-button band; concept+markBand filter; per-row badge dynamic; byte-identical desktop/mobile CSS).
- **Gates:** tsc PASS · mojibake PASS · scope:guard `--mode mixed` PASS · root matrix **181/181** · ops matrix PASS · diff-check clean · forbidden-file PASS (none touched). vitest + linux `vite build` are linux-only → **CI `quality-gate` GREEN**. **No self-merge; owner LIVE-VERIFIED the layout = GOOD; owner squash-merged; branch + worktree cleaned up.**
- **⚠️ Item 7 SPLIT to PR-D.1 (owner-approved):** mobile full-screen toggle for the tutor interactive is a `TeachFlow` render change (not ConceptSpine layout), unverifiable on Windows (vite/vitest linux-pinned), and not part of the mockup gate. **Corrected blast radius:** `TeachFlow` now backs ONLY the one live Topic Hub tutor — the old multi-tutor surfaces (`TutorDrawerV2`, `MentorPanel`, `pages/TopicHub.tsx`) are dead code (PR-G deletes them). PR-D.1 spec: desktop side-by-side ↔ mobile full-screen TOGGLE, same component + same data, the toggle being the 360px-forced variation.
- **NEW [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-row "Practise" lands on `/practice-hub` (`navigation.ts:75`) not Quick Practice, and its `markBand="1–2"` STRING is never consumed (`PracticePage` filters on a numeric `marksFilter` bucketed `"1"/"23"/"5"/"4"` — `PracticePage.tsx:182`,`326-329`; `markBand` never read). Owner-verified on Trigonometry + Light. PR-E fix: route to quick-practice directly + translate the band string → bucket-set (`1–2`→{1,23}, `3–5`→{23,5}, …), **path-conditional** (band pre-applied only on the concept-row entry; the Practice-hub entry stays student-controlled).
- **NEXT:** PR-E (chapter-test + worksheet wiring + [FU-PRACTISE-CONCEPT-FILTER]) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: PR-D.1 (mobile tutor toggle), [FU-CONTEXTUAL-TUTOR-REBUILD].

## ✅ TOPIC HUB PR-C: CONCEPT TUTOR "TEACH ME" FLOW (#272, trunk `d9ba545`) — MERGED + CI GREEN + OWNER LIVE-VERIFIED
BEHAVIORAL — the cohesive concept-tutor FLOW wired on BOTH platforms; built in an isolated git worktree ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-prc-tutor-2026-06-19.md`. 4 files +160/−28; squash `d9ba545`.
- **"Teach me" LIVE on the spine** (`components/topichub/ConceptSpine.tsx`): inert "Learn this" → **"Teach me"** opening the EXISTING `ConceptTeachDrawer` → `TeachFlow` → `/api/mentor` `concept_teach`. Spine owns drawer open/close state + passes the clicked concept's `{topicKey:slug, subject, concept:name, questionText:""}`, mounted fresh per concept. **One responsive mount = both platforms** (spine renders at all widths via `DesktopTopicHubPage.tsx:218`). Dead `TutorDrawerV2`/`MentorPanel` untouched.
- **`findVisualForConcept` wrong-visual fix** (`data/visualConceptRegistry.ts`, GATED `src/data`, owner-authorized for THIS fix only): empty terms + below-confidence (`score<=3`) → **`null`** not `concepts[0]`. Threshold mirrors the sibling resolver; correct-match path unchanged. Anti-fabrication: no visual beats the wrong visual. Shared resolver also corrects `TeachFlow`/`TutorMessageRenderer`/`DiagramBlock`.
- **Earned-reveal client support** (`components/tutor/TeachFlow.tsx`, scoped to `concept_teach`): no eager auto-open on mount (teach-first); `sendMessage` honours a server-pushed visual on follow-up turns (mirrors `startLearning`). `learn_teach` unchanged. Side-by-side(desktop)/stacked(mobile) split already existed.
- **Tests** (`ConceptSpine.test.tsx`): "Teach me" opens the drawer (vi.mock'd); findVisual null-not-wrong cases. **Gates:** tsc · mojibake · root matrix **181/181** · ops matrix · scope:guard `--mode mixed` · diff-check — all PASS. **CI `quality-gate` GREEN** (linux `vite build`); vitest in Codespaces (not the quality-gate). No forbidden files beyond the authorized `visualConceptRegistry.ts`. **No self-merge; owner live-verified + squash-merged; branch deleted (local+remote); worktree removed.**
- **✅ Owner LIVE-VERIFY = PASS:** "Teach me" opens the tutor on both platforms; findVisual returns null not a wrong visual; earned-reveal client support in.
- **⚠️ NEW [FU-CONTEXTUAL-TUTOR-REBUILD] (NOT a PR-C defect):** the tutor's CONTENT behaviour (scripted "Ravi Sir / Step N of 5"; doesn't respond contextually to student input) is a **pre-existing `/api/mentor` `concept_teach` engine** issue PR-C correctly wired into but was never scoped to rebuild → separate upcoming workstream (contextual-tutor rebuild).
- **Deferred to PR-D (flagged):** mobile shows the visual **stacked**, not a full-screen **toggle**; per-row visual badge rendering.
- **NEXT:** PR-D (Topic Hub layout / action-band / Examiner's tips / Notes-consolidation), fresh worktree, vs the FINAL IA (#268).

## ✅ DOCS(DESIGN): FINAL TOPIC HUB IA COMMITTED (#268, trunk `a280685`) — MERGED + CI GREEN
DOCS-ONLY. Records the owner-approved **FINAL Topic Hub information architecture** as the in-repo binding reference for the
Learn-Flow rebuild (PR-C onward). **Supersedes the previously committed locked spec (#261).** Built in an **isolated git
worktree** ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-final-ia-docs-2026-06-19.md`. 3 files +407/−1.
- **Files (all `docs/design/`):** NEW `topichub_ia_mockup_FINAL_2026-06-19.html` (owner-approved visual — the chat attachment
  was mojibake-corrupted in transit, so the clean on-disk UTF-8 original was copied **byte-identical**, `cmp` IDENTICAL, 19,515 B);
  `LazyTopper_Learn_Flow_Spec_LOCKED.md` (top FINAL IA SUPERSESSION block + a "read this first" note on the original section);
  `TOPICHUB_BUILD_REFERENCE.md` (final-IA note, HTML as binding source #3, planned PR sequence).
- **Final IA (supersedes #261):** learn-first hierarchy (concept rows = HERO; topic action band recedes into a quiet/dashed zone) ·
  **Notes = ONE unified view** (formulae + proofs + mind-map sections — replaces split Formula-sheet/Proofs tabs) ·
  **Examiner's tips = clickable panel** of 3–4 per-topic tips (replaces the single buried line; authored content, anti-fabrication) ·
  concept action **"Teach me"** (was "Learn this") · concept **"Practise"** auto-filtered to concept + mark band ·
  topic band = **Practise this topic / Chapter test / Worksheet** ("Worksheet" was "Generate worksheet") · two-Practise
  differentiation · navy product sidebar is a **constant** (its **Mistake Intel panel is global chrome on every page — NOT on the
  Topic Hub page body**; the "no MI on the Topic Hub page" rule is UNCHANGED by the final IA) · Category (B) split-with-parity stands.
- **Planned PR sequence:** PR-C (tutor flow) → PR-D (layout/action-band/tips/notes-consolidation) → PR-E (chapter-test + worksheet
  wiring) → PR-F (content fill) → PR-G (delete dead old-mobile). On the Topic Hub the final mockup wins over the older
  `01_full_flow…` prototype. (PR-B concept-spine already landed via the mislabeled `c418f59`/#266.)
- **Gates:** docs-only scope (0 src/config/CI/auth) · forbidden-file check PASS · mojibake 0 hits (project regex over the 3 files) ·
  `git diff --check` clean · internal links resolve · **CI `quality-gate` GREEN (1m12s)** + Vercel PASS. **Not self-merged**
  (adds an `.html`, outside the `.md`-only auto-merge policy) → owner-merged, mirroring #261. Worktree removed post-merge.

## ✅ AI-TIER FU-RANK-MOCKS-HPQ — SOFT AI-DEMOTION ON FULL MOCK + TOPIC MOCK (#259, trunk `775ee75`) — MERGED + CI GREEN
ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` only reached the practice paths
(`getLikelyQuestionsForConcept`); the mock engines use `getAllQuestions()` + their own selection and still drew AI at full parity.
GATED `src/` edits (`predictionCore` + the two mock engines), owner-authorized for this ranking-extension scope only. Authority:
PR2a (`686f737`) + `report-ai-tier-audit-2026-06-17.md` → `AGENT_aitier_rank_mocks_hpq_2026-06-18.md`. Report:
`report-ai-tier-rank-mocks-hpq-2026-06-18.md`. 4 files +209/−11; squash `775ee75`.
- **Reused PR2a's ONE multiplier** — exported `getSourceMultiplier` from `predictionCore.ts` (no values changed: authentic 1.0 /
  predicted 0.6 / ai 0.3; `predictionTypes.ts` untouched). No second provenance mechanism — the `_source` stamp PR2a attaches at
  ingest rides on the objects `getAllQuestions()` returns.
- **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` → `predWeight *= getSourceMultiplier(q)` per section/marks slot; new
  `sourceWeightedPick` makes the guaranteed-archetype **prefill** authentic-first (was uniform-random); `weightedSelect` exported
  for the test.
- **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)` per slot; exported for the test.
- **⚠️ Boundary correction (load-bearing):** the instruction assumed HPQ also uses `getAllQuestions()` + serves AI at parity —
  **WRONG.** HPQ (`highlyProbableQuestions.ts`) is a hand-authored curated bank; never calls `getAllQuestions()`; ZERO AI-pack
  content (none in `AI_GENERATED_QUESTION_IDS`; `hpqCompetencyAdditions` curated too) → nothing to demote (×1.0). Left
  **untouched** (no cosmetic no-op). **All AI-bearing surfaces now covered: Quick Practice/topic practice (PR2a) + Full Mock +
  Topic Mock (this PR); HPQ was already AI-free.**
- **Structure-preserving + count integrity:** demotion is WITHIN each constrained section/marks pool, never global; soft
  (`0.3/0.6`, never 0; additive base/topic/rng terms keep every candidate selectable) → an authentic-thin slot still fills with AI,
  no slot left empty; blueprint loop / section counts / pools unchanged — only WHICH question fills each slot changed; zero
  question added/removed. Repair passes left as-is (rare hard-constraint satisfiers).
- **New follow-up — [FU-AITIER-RANK-DIFFICULTY-HELPERS]:** `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` also call
  `getAllQuestions()` and serve AI at parity, but were out of this PR's named scope + authorized file list → future owner-authorized
  PR (NOT touched).
- **Tests / gates.** `mockEngineSource.test.ts` — **Codespaces vitest 7/7 PASS** on `ba2f619` (tier order soft; per-slot authentic
  preference; all-AI / authentic-thin slot still fills — for both engines). CI quality-gate does NOT run vitest — verified in
  Codespaces (`ubiquitous-robot`). Local: tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · scope:guard
  `--mode mixed` PASS · diff --check clean. No forbidden files. **No self-merge; owner squash-merged; branch deleted.**
- **NEXT (owner; queued):** **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items ·
  **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (difficulty-helper surfaces).

## ✅ AI-TIER PR2b — STRIP FABRICATED pastBoardYear (#257, trunk `d6e0e14`) — MERGED + CI GREEN
Anti-fabrication strip on the predicted/HPQ layers + serving-logic cleanup. GATED `src/data/` + `src/engine` + `src/prediction`
+ `src/utils` + `scripts/ops` edits, owner-authorized **Option A** (full strip). Authority: `report-ai-tier-audit-2026-06-17.md` →
`AGENT_aitier_pr2b_pastboardyear_strip_2026-06-18.md`. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`.
11 files +113/−106; squash `d6e0e14`.
- **WHY:** predicted/HPQ questions carried a self-asserted `pastBoardYear` with no traceable PYQ reference — anti-fabrication
  violation. Authentic PYQs use the traceable `pyqYear` (759 values); the authentic `questionBanks/**` tree has ZERO `pastBoardYear`.
- **⚠️ Boundary correction (the load-bearing finding):** the instruction assumed **75 values / 2 files**. Exhaustive repo-wide
  enumeration (owner-mandated before any strip — "prove there's no 5th file") found **96 values / 5 files** (undercount of 21):
  `predictedQuestions.ts` 55 · `predictedQuestionsScience.ts` 20 (incl. **8 non-numeric `"Model"`**) ·
  `class10SciencePredictiveEngine.ts` 12 · `highlyProbableQuestions.ts` 8 (student-facing HPQ) ·
  `scripts/ops/hpq_phase2_acceptance.entry.ts` 1 (test fixture). Cross-checked tracked non-`.ts` files (json/js/mjs) = none;
  the only surviving `pastBoardYear: "…"` literals are intentional inputs in the new test.
- **Strip:** all 96 value lines removed (field-removal only; nothing invented). **`predictionTypes.ts` (forbidden) NOT touched** —
  the optional field stays declared, all values gone.
- **Consumer cleanup — all 8 `.pastBoardYear` reads removed (0 remain repo-wide):** `predictionCore` dedup tiebreaker →
  **score-only** (the `!!q.pastBoardYear && !existing.pastBoardYear` clause was always-false post-strip); `predictionCore`
  + `mockPaperEngineScience` `sourceYearHint` → `targetYear-1`; `predictionCore` math+science converters + `predictionScoring`
  + `paperEngine` + `hpqConfidence` → dropped the dead `pastBoardYear` 5-signal-input field.
- **KEY FINDING — HPQ confidence does NOT shift (dead plumbing).** The 5-signal scorer (`cbse5SignalScoring`, line 208) and the
  Bayesian recurrence scorer (`probabilisticScoring`) compute recency from the historical dataset's `sourceYear` and NEVER read
  `input.pastBoardYear` / `sourceYearHint` (those appear only at type decls). So stripping the field changes ONLY the dedup
  tiebreaker; HPQ + mock confidence numbers are unchanged. Proven by unit test #4 (identical `compute5SignalScore` with vs without
  `pastBoardYear`).
- **Count integrity:** served bank **total 6,715 UNCHANGED** (tiers {authentic 3,710 · ai-generated 2,764 · predicted 241};
  `pastBoardYear_remaining=0` at the serving layer); per-file question counts unchanged (predictedQuestions 143, HPQ 91, …).
- **Tests / gates.** `predictionCore.pastboardyear.test.ts` — **Codespaces vitest 9/9** (5 PR2b + 4 PR2a regression). Local: tsc
  PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · `scope:guard --mode mixed` PASS (`lanes=product+trackedTooling`)
  · diff --check clean. No forbidden files. **No self-merge; owner squash-merged.** Note: `hpq_phase2_acceptance` (ops, NOT a CI
  gate) can't run in Codespaces — pre-existing `Cannot find package 'esbuild'` in its bundling harness (fails identically on trunk;
  my change there is one clean fixture-line removal).
- **NEXT (owner; queued):** **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking) · **[FU-AITIER-MARKS-MISMATCH]** content pass for
  the 7. The predicted `0.6` tier is now "earned" — no fabricated provenance behind it.

## ✅ AI-TIER PR2a — SOURCE-PROVENANCE STAMP + SOFT AI-LOWER RANKING (#255, trunk `686f737`) — MERGED + CI GREEN + LIVE-VERIFIED
ARCHITECTURAL — changes live serving/ranking on practice surfaces. The audit found AI-lower ranking was **never enforced**:
`getAdjustedScore` had no source term and the file/suffix tier marker was destroyed at the bank concatenation (~41% AI at full
parity). GATED `src/data/` edits, owner-authorized for this scope. Authority: `report-ai-tier-audit-2026-06-17.md` →
`AGENT_aitier_pr2a_provenance_ranking_2026-06-18.md`. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`.
3 files +265/−9; squash `686f737`.
- **Change 1 — provenance stamp at ingest (`canonicalQuestionBank.ts`, additive).** `AI_GENERATED_QUESTION_IDS: ReadonlySet<string>`
  built from the **54 `.pack[1-3]` source arrays** (the documented file/suffix rule; id-pattern derivation was REJECTED because the
  `2026-…` prefix collides between the predicted layer and the curated inline items). The `canonicalQuestionBank` array itself is
  **untouched** — no reorder, no adds/deletes — so total + per-topic counts are unchanged by construction.
- **Change 2 — soft ranking (`predictionCore.ts`).** New local `QuestionSource = "authentic"|"ai-generated"|"predicted"` on the
  `CanonicalQuestionWithScore` intersection (the forbidden `predictionTypes.ts` is NOT edited — same pattern already used for
  `_adjustedScore`). Stamped at the merge: predicted converters set `"predicted"`; canonical items classified by
  `AI_GENERATED_QUESTION_IDS.has(id)`; `dedupeById` made generic so `_source` survives. `getAdjustedScore` multiplies by
  `getSourceMultiplier` — **`SOURCE_MULTIPLIER = { authentic: 1.0, predicted: 0.6, "ai-generated": 0.3 }`** (owner-locked; SOFT,
  never zero; one tunable place; unstamped defaults to authentic — never demote on missing data).
- **Surfaces COVERED** (route through `getAdjustedScore` via `getLikelyQuestionsForConcept`): **Quick Practice / topic practice**
  (`practiceSetGenerator.generatePracticeSet` :248, `predictionDataService` :53). **NOT yet covered → [FU-AITIER-RANK-MOCKS-HPQ]:**
  **Full Mock** (`unlimitedPaperEngine` :353), **Topic Mock** (`topicMockEngine` :147), **HPQ** (`highlyProbableQuestions`, own pool)
  all use `getAllQuestions()` + their own selection — they need the same `sourceMultiplier` in a later PR (flagged, not silently
  missed).
- **Exact live tier split (Codespaces, authoritative):** **total 6,715 = authentic 3,710 (55.3%) · ai-generated 2,764 (41.2%) ·
  predicted 241 (3.6%) · 0 unstamped.** Authentic > AI; AI share < 60%. Authentic is **790 short** of the 4,500 retirement
  threshold. (Note: live AI 2,764 > the static grep estimate 2,594 — `.pack1` builds ids via a builder, so the literal-id grep
  undercounted; the runtime id-set captures all of them.)
- **Tests / gates.** `predictionCore.source.test.ts` added — **vitest 4/4 PASS in Codespaces** (equal-base authentic > ai; soft so
  a strong ai still outranks a weak authentic; tier order authentic > predicted > ai, none zeroed; live-pool drift guard). NOTE:
  the CI `quality-gate` does **not** run vitest (root matrix · mojibake · linux build · ops matrix) — the suite was verified in
  Codespaces. Local gates: tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · `scope:guard --mode mixed` PASS ·
  diff --check clean. No forbidden files touched. **No self-merge; owner squash-merged.**
- **✅ Owner-requested live-verify = PASS** (functional, real serving path `getLikelyQuestionsForConcept`, Codespaces on `686f737`):
  on ~50%-AI topics the first AI question lands deep in the list, so a 10-question Quick Practice serves **all authentic** —
  Real Numbers (n=193, 49% AI) first-AI @#97 · Triangles (n=292, 52%) @#127 · Trigonometry (n=428, 53%) @#186 · Light (n=343, 30%)
  @#239 (one `predicted` at #7 — correct tier order) · Electricity (n=321, 30%) @#217. Before PR2a, AI interleaved at parity.
- **Decisions locked:** multipliers `1.0/0.6/0.3`; **curated-26 inline items stay authentic → [FU-CURATED-26-PROVENANCE]**
  (owner-logged). **OUT OF SCOPE (untouched):** `pastBoardYear` strip (PR2b — now unblocked by this stamp), the 7
  `[FU-AITIER-MARKS-MISMATCH]` items, AI-pack retirement.

## ✅ AI-TIER PR1b — PACK-FILE 5-MARK RETAGS (#253, trunk `f83915b`) — MERGED + CI GREEN
Relabel-only follow-up to #251 that drains the `PACK_5MK_SHORT_BACKLOG`. GATED `.pack` edits, owner-authorized for this scope
only. Authority: `report-aitier-pr1-mechanical-2026-06-17.md` + cofounder Group-A/B classification →
`AGENT_aitier_pr1b_pack_retags_2026-06-17.md`. Report: `report-aitier-pr1b-pack-retags-2026-06-18.md`. 9 files +34/−19; squash `f83915b`.
- **Group A — 12 relabelled `format:"Short"→"Long"`** (label-only; each confirmed a genuine 5-mark long-answer by reading its
  `questionText`): `ARC2-016, ARC2-017, ABS2-048, CC2-048, CR2-044, CR2-045, CR2-046, HEC2-039, LT2-016, LT2-024, ME2-025, REP2-048`.
  Packs use `format` directly, so the value carries straight to the canonical question (no `toCanonicalFormat` mapping needed).
- **⚠️ `PR2-018` reclassified on inspection** (the instruction's safeguard): "3 red, 4 green, 5 blue → P(not blue)" is a single-step
  `7/12` one-liner, NOT a 5-mark long-answer → **moved to Group B, not relabelled**. Group A = **12** (not 13).
- **Group B — 7 QUARANTINED** (content↔marks mismatch; short questions wrongly tagged 5-mark; NOT relabelled — relabelling would
  worsen them): `TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018`. Kept pinned in `PACK_5MK_SHORT_BACKLOG`
  (now annotated) so the guard tracks them with no regression → **[FU-AITIER-MARKS-MISMATCH]** (later marks/content pass).
- **Backlog 19 → 7.** Count UNCHANGED (symmetric per-file diffs; 0 adds/deletes/marks/rewrites). **[FU-AITIER-PACK-5MK-SHORT]
  RESOLVED** (relabel half). Gates: tsc PASS · root matrix **181/181** (backlog now 7) · ops matrix PASS · mojibake PASS ·
  scope:guard `--mode mixed` PASS · diff --check clean. No forbidden files touched. **No self-merge; owner squash-merged.**

## ✅ AI-TIER PR1 — MECHANICAL CONTENT-INTEGRITY (#251, trunk `f4a41b6`) — MERGED + CI GREEN
First remediation from the read-only AI-tier audit (`report-ai-tier-audit-2026-06-17.md`). Mechanical/safe only — NOT
ranking/provenance (that is PR2). Authority: `AGENT_aitier_pr1_mechanical_2026-06-17.md`. Report:
`report-aitier-pr1-mechanical-2026-06-17.md`. 5 files +237/−41; squash `f4a41b6`.
- **`QuestionKind` += `"Long"`** in `predictedQuestions.ts` + `predictedQuestionsScience.ts` (confirmed NOT in forbidden
  `predictionTypes.ts`; only `switch(node.kind)` is on Markdown nodes — unrelated). `predictionCore.toCanonicalFormat` maps
  `kind:"long"→format:"Long"` — required so the retag reaches the unified bank rather than staying cosmetic.
- **24 retags** `kind:"Short"→"Long"` on five-mark Section-D predicted items (12 maths + 12 science). The 25th audit item is Q10,
  which is **split** rather than retagged.
- **Q10 split:** `2026-RN-LA-03` (fused alarm-clock LCM + prove-√5, mis-tagged 5mk/Section-D/Short) → `2026-RN-SA-08` (LCM,
  Section C/3mk) + `2026-RN-SA-09` (√5 proof, Section C/3mk). **Net +1** (the only count change). Nothing fabricated;
  `pastBoardYear` omitted on the new items. **[FU-MALFORMED-QUESTION] RESOLVED.**
- **CI guard:** `scripts/src/aiTierContentIntegrityGuard.test.ts` in root `test:matrix:all` (**175→181**) — fails on fused
  (`/\balso\s+prove\b/i`), section↔marks mismatch (A1/B2/C3/D5/E4), and 5-mark "Short" (hard on predicted; baseline-pinned on packs).
- **⚠️ Audit undercounted → [FU-AITIER-PACK-5MK-SHORT]:** 19 more `format:"Short"` Section-D/5mk defects live in gated
  `.pack2/.pack3` files (out of PR1 scope). Pinned as a shrink-only backlog. **PR1b** (owner-authorized): retag ONLY genuine
  long-answers; **QUARANTINE** content↔marks mismatches (e.g. `TG3-056` "cosec 60°", `REP2-039` "name two contraceptives" tagged
  5mk) — flag those for a separate content-judgment pass, do NOT relabel.
- Gates: tsc PASS · root matrix **181/181** · ops matrix PASS · mojibake PASS · scope:guard `--mode mixed` PASS · diff --check clean.
  No forbidden files touched. **No self-merge; owner squash-merged.**

## ✅ "FINISH SESSION" SCORECARD TRIGGER (#249, trunk `704dcff`) — MERGED + CI GREEN — owner live-verify PASS
Replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** so the
scorecard actually surfaces (students stop when done, not when they've exhausted the set). Authority:
`AGENT_finish_session_scorecard_2026-06-16.md`. Report: `report-finish-session-scorecard-2026-06-17.md`. 2 files +63/−2;
commit `b740a3f`. **Supersedes #240 sub-task 5.**
- **Finish session button (the load-bearing trigger):** always-available at the foot of a built set, full-width green accent
  (renders on desktop AND mobile widths — `PracticePage` is the shared responsive component for `/practice/:grade/:subject`).
  On tap → fires `practice_finish_session_click` (topic·subject·attempted·total) + sets `sessionFinished=true` → surfaces the
  scorecard. Gated `isBuilt && filteredQuestions.length > 0 && !showScorecard`.
- **`allDone` kept as a convenience auto-offer:** `showScorecard = (sessionFinished || allDone) && questions.length > 0`. When a
  student happens to attempt every question, the scorecard still auto-appears (#240 behaviour) — Finish is the always-present
  primary path. No auto-popup on navigation; the scorecard is deliberate (Finish tap or allDone), never an interruption.
- **Reuses the EXISTING `sessionStats`** (`attemptedInSet`, `localMcqAnswered`, `localMcqCorrect`) — no new counters, no new
  persistence, no session-lifecycle state machine (STOP-IF-IT-BALLOONS guard honoured). The only trigger changed.
- **Partial-session honesty (the critical requirement):** the header uses **attempted-only denominators** ("{attempted} of
  {total} attempted · {correct}/{answered} MCQs correct · {accuracy}%" — accuracy over MCQs *answered*, never the full set) +
  an explicit "the {M} you didn't reach aren't counted" line on a partial finish + an honest zero-attempt state. Unattempted
  questions are NEVER implied wrong or counted against the student.
- **"Keep practicing this set" escape hatch** on a *manual partial* finish (`!allDone`) returns the student to the same set
  (`setSessionFinished(false)`) so Finish never traps them; not offered on the allDone auto-offer (nothing left to attempt).
- **Reset discipline:** `setSessionFinished(false)` added to the existing fetch-success reset block, so any fresh
  build/regenerate/filter-change clears it alongside mcqSelections/selfAssessments — no stale scorecard, no double-count.
- `uxTelemetry.ts` — added `practice_finish_session_click` to the typed `UxEventName` union (additive).
- **Gates:** tsc 0 · mojibake clean · scope:guard product OK · root matrix **175/175** · lazytopper ops matrix green ·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #249 (1m8s — incl. the linux `vite build`). No forbidden/gated files.
- **✅ Owner live-verify = PASS — partial-session honesty PROVEN:** a **3-of-10 finish** reads *"3 of 10 attempted · 0/3 MCQs
  correct · 0% accuracy · Here's how those 3 went, the 7 you didn't reach aren't counted"*; the **zero-attempt** case reads
  honestly too. [FU-SESSION-SCORECARD-TRIGGER] CLOSED.
- **🐞 NEW follow-up for the next audit — [FU-MALFORMED-QUESTION]:** a live-observed malformed question — **Real Numbers Quick
  Practice Q10 fused two questions** (alarm-clock LCM + prove √5) with inconsistent tags (5-mark / Section-D / Short). Suspected
  AI-generated pack origin. To be characterised by the upcoming read-only AI-generated-question-tier audit. See OPEN_QUESTIONS.

## ✅ CHECK & IMPROVE DETECT-THEN-CONFIRM (#246, trunk `c9404e1`) — MERGED + CI GREEN — owner live-verify PASS 5/6
The UX layer on Claim 2 (#244): detection is now VISIBLE + CORRECTABLE before grading, plus question photo upload. Authority:
`AGENT_detect_then_confirm_2026-06-16.md`. Report: `report-detect-then-confirm-2026-06-16.md`. 9 files +935/−78; commit `3e00ac4`.
- **Core principle:** detect-then-CONFIRM, never declare-from-scratch. The default stays pure auto-detection; the old
  subject/topic/marks fill-in form was NOT rebuilt. The student touches a value only if it's wrong (constrained correction).
- **Flow (both desktop + app):** question by type/paste/**photo of the question** (distinct slot vs the answer photo) →
  **"Read the question →"** → detection-ONLY `POST /api/detect-question` on the question alone (one deliberate, cheaper call;
  a photo is passed so the AI reads the PRINTED marks) → **confirmation chip** (subject·topic·marks + source) with quiet
  **[Change]** → constrained correction (topic→canonical key via Fix A's resolver; marks 1–6; subject toggle; corrected mark
  → `marksSource:"user"`) → grade on the CONFIRMED values via the unchanged trusted-marks path.
- **Server:** new `handleDetectQuestion` (`checkSolution.cjs`) + `/api/detect-question` (`questions.cjs` + `index.cjs`). The
  grader `handleCheckSolution` is **untouched** (no grading-semantics change).
- **Override logging:** when the student corrects the detection, the attempt record carries `marksSource` + `detectionOverride
  {detected, confirmed}` — reuses `recordAttempt` → localStorage + Firestore-mirror (no new collection, no `firestore.rules`).
  Internal telemetry for classifier-accuracy; never shown to the student.
- **⚠️ `SHOW_DETECTION_META` flag (shared helper `checkImproveDetection.ts`) — default ON for the owner testing phase.** It
  gates ONLY the meta-display (the "read from the question" / "estimated" source label) — NOT the detected values or the
  Change control (those stay visible + correctable even at launch). **MUST be flipped to `false` before shipping to students
  — shipping with the machinery still showing would be a real miss (the tester-vs-student line). Logged as
  [FU-DETECTION-META-LAUNCH-FLIP], a hard PRE-LAUNCH gate — see OPEN_QUESTIONS.**
- **Out of scope (respected):** bank-grounding/retrieval for detection (deferred behind Fix B); no `src/data` reach.
- **Gates:** tsc 0 · 3× `node --check` · root matrix **175/175** · lazytopper ops matrix green (incl. llm-path 5/5) · mojibake
  clean · scope:guard product OK · `git diff --check` clean · `clampDetectedMarks` 9/9 + `buildConfirmedDetection` proofs.
  **CI `quality-gate` GREEN** on #246 (1m7s — incl. the linux `vite build` + vitest). No forbidden/gated files touched.
- **✅ Owner live-verify of #246 = PASS 5/6:** (1) printed marks read correctly, no marks picker; (2) inference GENUINE +
  graduated — a short AP question infers **2**, a proof infers **3** (they diverge → real inference, not a blind constant);
  (3) **photo** of a printed-marks question reads the printed value, two distinct upload slots; (4) **Change** corrects a wrong
  detection → grades the corrected value, topics bucket to a clean canonical key on Me; (5) selectors gone desktop AND mobile.
- **🐞 [FU-DETECTION-MARKS-CEILING] (the 6th — known issue, NOT a blocker):** inference **under-calls true 5-mark questions**
  (multi-part numerical + proofs) as **3** — the inferred scale tops out below 5 for the heavy items. **Caught-and-correctable
  via [Change]** (the student bumps it to 5), so it does not corrupt grading — the detect-then-confirm design absorbs it. Fix
  candidates (later): tune the detection prompt's mark heuristic toward 5 for multi-part/derivation/proof items; OR
  bank-grounding (deferred behind Fix B). See OPEN_QUESTIONS.

## ✅ CHECK & IMPROVE AUTO-DETECT (#244, trunk `43ffa09`) — MERGED + CI GREEN — owner live-verify PENDING
Claim 2 (owner-ruled option (a): infer from the provided question). The grader now determines marks/subject/topic from the
question it already receives, instead of the student picking them (bad UX + eval contamination). Authority:
`AGENT_claim2_autodetect_marks_2026-06-16.md`. Report: `report-claim2-autodetect-marks-2026-06-16.md`. 6 files +330/−238;
commit `d93cd23` (server + client + 2 UI + shared helper + test).
- **Isolation — a `detectMarks` flag.** `/api/check-solution` is shared by Quick Practice (`SolutionChecker`, marks from the
  canonical bank — authoritative) and Check & Improve (student-guessed). The detection path is opt-in: when `detectMarks` is
  absent the handler is **byte-identical** to before (`effectiveMarks = marks`, same cap/`totalMarks`/percentage). Only Check
  & Improve sets it → blast radius stays on Check & Improve.
- **Server (`checkSolution.cjs`):** when `detectMarks`, the prompt asks the AI to determine `detectedMarks` (printed value
  preferred → `marksSource:"stated"`; else inferred from type/depth → `"inferred"`; validated to `[1,6]`, else a flagged
  `"fallback"` — never a silent static 3), `detectedSubject`, and `detectedTopic` (constrained to the canonical `topics.ts`
  vocabulary the client passes — exact key or null, never invented). `effectiveMarks` drives the cap + percentage. Per-step
  grading rules / error-propagation / additive-floor reconcile UNCHANGED — only the SOURCE of marks/subject/topic changed.
- **Client (`aiClient.ts`):** `checkSolutionImage` gains optional `marks` + `detectMarks` + `topicVocabulary`; response gains
  `detectedSubject`/`detectedTopic`/`marksSource`.
- **UI (`DesktopCheckImprovePage` + app `CheckImprove`):** the manual marks/subject/topic selectors are REMOVED; both send
  `detectMarks` + the canonical vocab and build the graded context from the detected response. The detected topic is
  canonicalised via the shared `resolveDetectedGradeTopic()` helper (`src/utils/checkImproveDetection.ts`), which reuses
  Fix A's `desktopTopicForWeakAreaKey` — **no new normaliser** — so MI attribution lands on a real `topics.ts` key (the app
  variant's old free-text dropdown stored non-canonical labels like `"Light"`). Honest fallbacks: unresolved/absent topic →
  full-subject; subject → resolved topic's subject, else AI's detectedSubject, else Maths.
- **Anti-fabrication:** never invents marks (printed → inferred → flagged fallback) or a topic (canonical list or null). No
  grading-semantics drift beyond the marks source.
- **Gates:** tsc 0 · server `node --check` OK · root matrix **175/175** · lazytopper ops matrix green · mojibake clean ·
  scope:guard product OK · `git diff --check` clean · helper Node-replication proof **6/6**. **CI `quality-gate` GREEN** on
  #244 (1m21s — incl. the linux `vite build` + the new vitest). No forbidden/gated files touched (gated resolver imported only).
- **⏳ Owner live-verify PENDING (decisive):** (1) question stating "[3]" → graded /3 without entering marks; (2) question with
  no printed mark → sensible inferred scale, not a blind 3; (3) detected topic buckets correctly on Me ▸ weak-areas (real key,
  routes to practice via Fix A); (4) selectors gone at desktop (≥1024px) AND mobile width.

## ✅ topicKey FIX A (#242, trunk `77f2ed2`) — MERGED + CI GREEN — owner live-verify PENDING
The repair half of the topicKey-duplication problem the read-only audit (`report-topickey-duplication-audit-2026-06-16.md`)
mapped. **Ungated, read-time only** — repairs existing users WITHOUT a data migration. Authority:
`AGENT_topickey_fixA_me_resolver_2026-06-16.md`. Report: `report-topickey-fixA-me-resolver-2026-06-16.md`.
3 files (+114/−2; `topics.ts`, `DesktopMePage.tsx`, new `topics.weakarea.test.ts`); one commit `4eb2320`.
- **The bug:** the Me "Topics dragging your score" row resolved each stored (raw, un-canonicalised) topic label through
  `desktopTopicBySlug` — the weakest of the three topicKey normalisers, which does NOT camelCase-split. The audit proved
  **exactly 13** in-bank spellings fail it (11 PascalCase Science abbreviations: `Light`, `LifeProcesses`, `AcidsBasesSalts`,
  `HumanEyeAndColourfulWorld`, `CarbonCompounds`, `ControlAndCoordination`, `MetalsNonMetals`, `ChemicalReactions`,
  `MagneticEffects`, `HeredityEvolution`, `OurEnvironment`; + 2 `science_*`: `science_light_reflection_refraction`,
  `science_reproduction`). Those rows silently routed to `/exam-trends`. **Named repro: the Light row.**
- **Change 1** — new `desktopTopicForWeakAreaKey()` wraps `desktopTopicBySlug` with the SAME strong resolver the serving
  surfaces already use (`getRuntimeTopicCandidates` — camelCase split + canonical alias map): try the raw key, then each
  runtime candidate. **Reuses** the existing resolver; **no fourth normaliser.** Unknown topics still return `undefined`, so
  the honest `/exam-trends` fallback is preserved. `DesktopMePage.resolveTopicMeta` now calls it.
- **Change 2** — 13 `TOPIC_ALIASES` entries mapping each failing normalized spelling to its canonical `topics.ts` slug
  (belt-and-braces for cases the strong map routes to a non-`topics.ts` canonical, e.g. `HeredityEvolution`).
- **NOT this PR (HELD):** the bank-key data consolidation + CI guard = **Fix B / [FU-TOPICKEY-CONSOLIDATION]** — owner-
  authorized-later. Fix A does NOT rewrite `src/data` or stored learner records; it fixes RESOLUTION at read time, which is
  exactly why it repairs existing users with no migration.
- **Proof:** `topics.weakarea.test.ts` asserts all 13 resolve to the correct slug+subject, an arbitrary non-aliased variant
  (`carbon-compounds`) resolves via the candidate bridge, and unknown/empty keys still fall back. Faithful Node replication of
  the live chain = **20/20 PASS** pre-merge (local vitest + `vite build` are linux-pinned → run in CI).
- **Gates:** tsc 0 · root matrix **175/175** · lazytopper ops matrix green · mojibake clean · scope:guard product OK ·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #242 (incl. the linux `vite build` + the new vitest).
- **⏳ Owner live-verify PENDING:** (1) Light row → Quick Practice not Exam Trends; (2) a second previously-failing Science
  topic (Magnetic Effects / Human Eye) → practice; (3) Real Numbers (already working) → no regression; (4) an unknown topic
  → still falls back gracefully.
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED** by this PR (pending the live-verify above).

## ⏭️ NEXT (owner-re-sequenced post-#242): (ii) "Finish session" PR → (iii) gated-spelling — then (2) MI eval → (3) Stage 3 → Fix B
The topicKey audit (i) + Fix A (#242) are done. The items below are QUEUED but **NOT yet authorized** — the owner sends each
as its own instruction, branched fresh against `77f2ed2`. Do not start until instructed.
1. **(i) Read-only topicKey audit — ✅ DONE** (`report-topickey-duplication-audit-2026-06-16.md`); Fix A (#242) shipped the
   repair half; **Fix B (data consolidation + CI guard) = [FU-TOPICKEY-CONSOLIDATION] is HELD / authorized-later.**
2. **(ii) "Finish session" scorecard-trigger PR — small.** Replace the scorecard's `allDone`-only trigger with an explicit
   student-declared "Finish session" action; honest on PARTIAL sessions (don't imply completion). Finishes sub-task 5's
   intent (the redesign that makes the scorecard confirmable).
3. **(iii) Gated-spelling follow-up — [FU-SPELLING-GATED-REMAINDER].** Owner-authorized separate PR for the ~60
   `src/data/**` + `src/lib/desktop/loginPrompts.ts` rendered "Practise" strings #240 could not touch (gated dirs).
4. **(2) MI eval — [MI-EVAL]** check-solution eval set (launch gate; unblocks eval-gated items).
5. **(3) MI Loop Stage 3 — concept-level targeting (eval-gated, [FU-DRILL-ENRICHMENT]).** Not before the eval.

## ✅ MI POLISH BATCH (#240, trunk `9eff0b0`) — MERGED + CI GREEN — owner live-verify 4/5 PASS
One PR, five surface/ranking sub-tasks on the finished MI loop (NOT eval-gated; no new data plumbing). Authority:
`AGENT_mi_polish_batch_2026-06-14.md`. Report: `report-mi-polish-batch-2026-06-15.md`. 7 files +122/−79; one commit per
sub-task (`af881a8` ranking · `72d0e1b` CTAs · `4cd837a` MCQ nudge · `11494d4` spelling · `7a6cadd` scorecard).
- **Sub-task 1 [FU-WEAKAREA-ACCURACY-RANK] — VERIFIED.** `computeWeakAreas` ranks by **blended severity**
  (`marksLost + lowAccuracyDrag`); a topic weak only via wrong MCQs (0 marks lost, ≥3 attempts, <40% accuracy) now
  surfaces. Graded topics with accuracy ≥40 keep prior ordering (drag = 0). Deterministic.
- **Sub-task 2 [FU-WEAKAREA-CTAS] — VERIFIED (with one bug, see below).** Every weak-area row routes to an auto-served
  topic-scoped practice set via the existing Stage-1 `gotoPracticeForTopic`; honest fallback to topic-hub/trends when a
  topic has no hub slug; gated `buildDesktopPracticePath` untouched. Dropped the redundant row[0] "Practise" button.
- **Sub-task 3 [FU-MCQ-UPLOAD-NUDGE] — VERIFIED.** A wrong MCQ shows "Want to know why? Show your working below." →
  reveals the EXISTING inline Check-my-answer box; correct MCQ shows nothing. No new data path.
- **Sub-task 4 [FU-SPELLING-PRACTICE] — VERIFIED (partial scope).** "Practise"→"Practice" in DesktopMePage/mobile Me/
  DesktopTopicHubPage UI copy. **Gated remainder carried as [FU-SPELLING-GATED-REMAINDER]** (~60 `src/data/**` +
  `loginPrompts.ts` strings — forbidden dirs, owner-authorized separate follow-up).
- **Sub-task 5 [FU-SESSION-SCORECARD] — NOT yet confirmable.** End-of-session scorecard (attempted · MCQs correct ·
  accuracy + honest MI nudge + honest saved-state line) replaced the footer + the mislabeled "MCQ answers: 0/5". Its
  `allDone`-only trigger made it hard to surface in live-verify → **being redesigned into an explicit "Finish session"
  trigger** (queued PR ii). Code shipped; behaviour re-confirmed after the redesign.
- **🐞 Live bug found ([FU-WEAKAREA-EXAMTRENDS-FALLBACK]):** the **Light – Reflection and Refraction** weak-area row
  routes to **Exam Trends instead of practice** — its non-canonical topicKey (en-dash variant + "(in…)" suffix) fails to
  resolve to a practice slug and hits sub-task 2's honest fallback. **Confirmed symptom of the topicKey duplication
  problem**; to be traced in the upcoming read-only topicKey audit (item i). NOT a regression of the fallback itself.
- **Gates:** tsc 0 · mojibake clean · root matrix **175/175** · ops **22/22** · scope:guard product OK ·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #240 (incl. the linux `vite build` + ops matrix).

## ✅ MI LOOP STAGE 2 — Measure-leg PR 3 (#237, trunk `b75f065`) — MERGED — MEASURE LEG COMPLETE
The last Measure-leg PR: MCQ honest capture. Per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 3 of 3).
Report: `report-mi-loop-stage2-pr3-mcq-2026-06-15.md`.
- **Route MCQ clicks through `recordAttempt`:** `PracticeQuestionCard` MCQ option click → `recordAttempt` (correct = 1/1,
  wrong = 0/1, `mode: "mcq"`, `topic = topicLabel`, `question`, `questionId`, `subject`) — the SAME keying graded answers
  use, so MCQ feeds Saved attempts / Accuracy and a **CORRECT MCQ shrinks a weakness via the PR-2 loop-closer**. Recorded
  for both correct + wrong, only when the answer key is trusted (`correctIdx >= 0`); the front door self-guards policy.
- **Removed the hardcoded `conceptual:1` bypass:** the whole direct-`logMistakes` block (+ its now-unused import). A bare
  MCQ click has no working to classify, so a wrong MCQ no longer fabricates a "conceptual" mistake.
- **Wrong-MCQ treatment — OWNER-RULED (a) attempt-only:** a wrong MCQ records the 0/1 attempt and NOTHING else (no
  mistake-log entry, no synthesized grade object, no typed category). Option (b) — an untyped/objective `recordMistake` —
  was declined. Marks-lost / mistake-mix / weak-areas stay sourced from real graded classifications.
- **One front door, no fabrication:** all MCQ signal flows through `recordAttempt` only — no direct `logMistakes`, no
  fabricated types, no synthesized grade objects.
- **Gates:** tsc 0 · mojibake clean · root matrix 175/175 · ops 22/22 · scope:guard OK · `git diff --check` clean. CI
  `quality-gate` GREEN on #237. (`vite build` CI-gated on linux.)
- **⏳ Owner live-verify PENDING** (post-merge): wrong MCQ → attempt + Accuracy, NOT conceptual-inflated; correct MCQ →
  accuracy + can shrink a weak area; Me "concept gaps" = real graded classifications only.
- **NEXT:** **MI Loop Stage 3 — concept-level targeting (eval-gated)** = `generatePracticeSet.conceptKey` from the weak
  concept (needs MI sub-concept capture + the eval set) = **[FU-DRILL-ENRICHMENT]**. (Measure leg done; no more Stage-2 PRs.)

## ✅ MI LOOP STAGE 2 — Measure-leg PR 2 (#235, trunk `59f9d18`) — MERGED + owner live-verified — THE LOOP CLOSES
The return leg. A graded mistake grows the wrong-answer count (Stream 3) via the `recordMistake` bridge; PR 2 makes a
clean correct drill SHRINK it — the engine is now bidirectional. Per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 2
of 3). Report: `report-mi-loop-stage2-pr2-loopclose-2026-06-14.md`.
- **Loop-closer (data layer):** in `recordAttempt`, a FULLY-correct attempt (`scored >= available`) decrements one
  active gap for the topic via `clearWrongAnswer` — live correct-attempt path (NOT the dormant `recordSelfAssessment`);
  only on a newly-recorded attempt (after dedup → no double-decrement); wrong/partial never shrink; clamped at 0.
- **Key-matching (the G9 alias-fragility class):** the decrement resolves the canonical key with the IDENTICAL
  expression `normalizeTopicKey(ctx.topicKey ?? ctx.topic)` the bridge used to increment (same ctx passed to both doors
  in PR 1) → tautologically equal key; then decrements the stored entry by its OWN keys (exact map-key match). Caught
  the trap that `getWrongConceptsForTopic` keeps `-` but turns spaces→`_` (raw "Real Numbers"→"real_numbers" would miss
  "real-numbers") — fixed by normalizing first on both data + display paths.
- **"Active gaps remaining" on Me (owner Option 1):** both Me surfaces show the recoverable wrong-answer count
  (`· N active gaps to clear`) ALONGSIDE the historical `· M marks lost` — the **scar** (never shrinks) vs the
  **healing** (shrinks to 0). Did NOT repoint Me to `getWeakAreas` (deferred durable-Me convergence).
- **Pre-merge logic confidence — GitHub Codespaces (Linux; mocked/local stores, no Firebase creds):** vitest
  `practiceInsights.loopclose.test.ts` **2/2 PASS** (2-topic decrement + clamp-at-0 + wrong-no-shrink + canonical-slug
  topicKey); `vite build` ✓ 9.04s; `verify-production-build.mjs` ✓ exit 0. CI `quality-gate` GREEN on #235.
- **Live verification (owner, PASS):** active gaps shrank to **0 on Real Numbers AND Polynomials** after clean correct
  drills; marks-lost held as the historical scar; wrong answers didn't shrink; clamp held at 0; **mobile parity** confirmed.
- **Residuals logged (see OPEN_QUESTIONS):** **[FU-IMPROVEMENT-CARD]** (clearWrongAnswer DELETES the entry at zero,
  erasing the improvement record — before an improvement/journey card on Me, the loop-closer must first record a durable
  "gap cleared" event (cumulative + per-topic + timestamp) in the practiceInsights mirror); **[FU-WEAKAREA-ALIAS-DISPLAY]**
  (active-gaps count under-shows for topics whose label ≠ canonical slug until the alias map covers them; data-layer
  decrement unaffected).
- **NEXT in the loop:** **PR 3 = MCQ honest capture** (last Measure-leg PR) — `PracticeQuestionCard` MCQ click →
  `recordAttempt` (1/1 or 0/1); stop the hardcoded `conceptual:1` bypass. **Owner-greenlight-gated** — do NOT start until
  greenlit.

## ✅ MI LOOP STAGE 2 — Measure-leg PR 1 (#233, trunk `57fb7aa`) — MERGED + owner live-verified
The MI loop is Capture → Identify → Act → **Measure**. The loop did NOT close: `recordAttempt` had **0 call sites** (empty
scorecard, dead accuracy path). PR 1 makes the engine **measurable** — graded scores persist and feed the Me cards. Per
`AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 1 of 3). Report: `report-mi-loop-stage2-pr1-recordattempt-2026-06-14.md`.
- **Front door:** the dead `practiceInsights.recordAttempt` is now the real, single `recordAttempt(user, ctx)` — the **score-twin
  of `recordMistake`** (policy: skip no-user/local; dedup; localStorage + the **existing** Firestore mirror — **no `firestore.rules`
  edit**). Exactly one `recordAttempt` (confirmed-and-replaced the dead one).
- **Marks is the universal unit:** an attempt carries `marksScored`/`marksAvailable`/`mode`; `correct` is **derived** (full marks)
  so the existing %-correct readers are unchanged. `marksScored` clamped to `[0, marksAvailable]` (can't invent marks).
- **Routed all three graded surfaces** (Quick Practice `SolutionChecker` — fresh + cache-restore; desktop `DesktopCheckImprovePage`;
  mobile `CheckImprove`) — each calls `recordAttempt` alongside `recordMistake`. Records EVERY graded attempt incl. full marks
  (accuracy needs the correct ones). Dedup keyed on `(uid, questionId|hash(question), score, mode)` so a cache-restore never
  double-counts. `topicKey` = human label → attempts **merge** with mistake-log rows (no duplicate weak-area rows).
- **Live-verified PASS (owner):** Saved attempts populate; Accuracy / Accuracy-by-subject / Recent all flow from real graded
  attempts; attempts merged into the **Polynomials** weak-area row (attempts + accuracy alongside marks-lost); X/Y banner confirmed
  as the v1 session scorecard (no new UI).
- **2 follow-ups logged:** **[FU-ATTEMPT-MARKS-ACCURACY]** (Me accuracy still binary — marks-weighted is the fuller decision-1
  expression, needs label changes; fast-follow) and **[FU-ATTEMPT-SR]** (the old dead `recordAttempt` fed spaced-repetition; that
  side-effect was intentionally dropped — reviving it is its own decision). See OPEN_QUESTIONS.
- **NEXT in the loop:** **PR 2 = close the loop** — a correct `recordAttempt` decrements the topic/concept weakness via
  `clearWrongAnswer` (wire to the live attempt path, not the dormant session subsystem). Decisive test: a logged weak area
  (e.g. Real Numbers −7) **visibly shrinks** on Me after a clean drill. Then **PR 3** = MCQ honest capture through the doors.

## ✅ MI LOOP STAGE 1 — Act-leg (#231, trunk `6d80a57`) — MERGED + owner live-verified
The MI loop is Capture → Identify → **Act** → Measure. Stage 1 wires the **Act** hand-off so "practise where you lose marks"
finally serves targeted practice (per `LazyTopper_MI_Loop_Culmination_Spec_2026-06-12.md`).
- **Gap A:** desktop + mobile Me weak-area CTAs target the #1 weak topic (highest marks lost); honest generic fallback when no
  weak-area data (no fabricated target).
- **Gap B:** a TARGETED arrival (explicit `?topic=` non-generic, or `targeted=1`) at `PracticePage` now **auto-serves** the
  already-fetched set (flips `isBuilt`); bare subject-level entry keeps the builder; "Edit filters" preserved.
- **Option B (one-click direct):** `gotoPracticeForTopic` → `/practice/10/<subject>?topic=<slug>` directly, bypassing the
  `/practice-hub` chooser so desktop matches mobile. Gated `buildDesktopPracticePath` (→ `/practice-hub`) **untouched**.
- **Intent-first guardrail:** generic entries stay open/unscoped — never auto-scoped to weak areas.
- **Live-verified PASS:** one-click ready set (desktop + mobile); guardrail holds; served set non-empty (Real Numbers,
  Polynomials); "Edit filters" works. Report: `report-mi-loop-stage1-targeting-2026-06-12.md`.
- **NEXT in the loop:** **Stage 2 = Measure leg** (`recordAttempt` + attempt/score stream → "Saved attempts"/"Accuracy"/weak-area
  shrinking; = the Scorecard spec, reframed as the loop's return leg). **Stage 3** = concept-level targeting (eval-gated).
  5 Stage-1 follow-ups recorded in OPEN_QUESTIONS ([FU-DRILL-ROUTING], [FU-WEAKAREA-LABEL], [FU-WEAKAREA-CTAS],
  [FU-WEAKAREA-HUB-LIMIT], [FU-DRILL-ENRICHMENT]).

## ✅ GRADE-PARSE RESILIENCE (#229, trunk `59e11f6`) — MERGED + owner live-verified
The intermittent **"We couldn't read the grading this time"** was **Gemini JSON truncation**: the grading call capped at
`maxOutputTokens: 8000`, long multi-step grades overran it and came back **cut mid-JSON**, and `extractJsonObjectFromText`
(recovers only complete JSON) returned null → failure path. (Same image graded on retry because output length varies; the
client's internal retry only fires on 429.)
- **Fix (`server/routes/checkSolution.cjs`, parse-resilience ONLY):** single bounded retry on a parse-gate miss (no loop);
  `maxOutputTokens` 8000→16000 (a cap, not a target); failure-path diagnostics logging `finishReason` + length + tail. **Grading
  semantics untouched** (prompt/rules/mark-scheme/`marksAwarded`/MI reconcile/response shape all unchanged).
- **Live verification (owner, PASS):** `sol_5.jpeg` grades reliably on **both** Quick Practice and Check & Improve, no error;
  grade quality unchanged. (Me reflects after a manual refresh — separate known **[FU-ME-REFRESH]**, not a regression.)
- **[FU-GRADE-PARSE] CLOSED.** Two new eval-gated follow-ups recorded: **[FU-GRADE-MARKSCALE]** (Check & Improve marks are
  student-entered, not question-derived → grader should judge the CBSE mark value) and **[FU-GRADE-CONSISTENCY]** (mistake-type
  varies across surfaces; mostly downstream of mark-scale). Report: `report-grade-parse-resilience-2026-06-12.md`.

## ✅ MI CONSOLIDATION P1+P2 (#227, trunk `c618cd5`) — MERGED + owner live-verified
The MI Architecture Map (`LazyTopper_MI_Architecture_Map_2026-06-11.md`) exposed MI as 3 capture streams feeding 2 disconnected
analysis layers. P1+P2 builds the **one ingestion front door** and bridges the first gap.
- **`recordMistake(user, gradeResult, context)`** (`src/services/mistakeIntelligence.ts`) is THE entry point: one policy
  (`uid && !isLocalSession` AND `marksAwarded < totalMarks` OR any step `mistakeType`), one builder (replaces desktop
  `buildLogEntry` + mobile `buildMobileLogEntry`, both deleted), dedup (covers the cache-restore path). Routed `SolutionChecker`
  (**deleted the `mistakeCount>0` guard** — the Quick-Practice bug), mobile `CheckImprove`, desktop `DesktopCheckImprovePage`.
- **Bridge (Map gap #3, knowledge-gap types):** conceptual+calculation graded mistakes write ONE Stream-3 `WrongAnswerEntry` via
  `recordWrongAnswer` → feeds the existing capped `Math.min(wrongData.count*5, 30)` weak-area term. **`confidenceScore`
  untouched.** Silly+presentation do NOT bridge — surfaced as a distinct **"Careless mark-loss"** card on both Me pages.
- **Server:** `checkSolution.cjs` additive-floor reconcile `max(llm, stepDerived)` (client mirrors it).
- **Behavior change (approved):** full-marks answers no longer log a zero-mistake row; mistake answers still log.
- **Live verification (owner, PASS):** regression ✅, Quick-Practice logging ✅, bridge ✅ (Polynomials + Real Numbers surfaced),
  server reconcile ✅, no double-log ✅. **2 follow-ups:** [FU-GRADE-PARSE] intermittent grade-parse; [FU-ME-REFRESH] Me needs
  manual refresh. Both pre-existing / separate from this PR (see OPEN_QUESTIONS). Classification is eval-pending.
- **OUT OF SCOPE (deferred):** MCQ migration onto the front door (still `conceptual:1`), chapter-tests/mocks, layer-merge, durable
  Me convergence. Report: `report-mi-consolidation-p1p2-2026-06-11.md`.

## ✅ INFRA-4 / PR1 — backend DEPLOYED + LIVE (the go-live unlock)
The backend (`artifacts/api-server`, which self-spawns the `lazytopper/server` AI gateway as a child) is **deployed on Railway and
live** — owner-confirmed `/api/health` shows `stub:false` with Gemini **direct-key** auth. **Grading (`/api/check-solution`) is no
longer dark in production.** Wiring: Vercel static app → `vercel.json` rewrite (`/api/*` + `/shared-api/*`) →
`https://lazytopper-production-production.up.railway.app` → api-server (8080) → gateway (3001) → Gemini.
- **Deploy shape (load-bearing):** the image carries the **whole workspace** and keeps `typescript` installed — the gateway
  transpiles `lazytopper/src/**/*.ts` at runtime and resolves files relative to cwd (Dockerfile + `.dockerignore` encode this).
- **Deferred:** claudeClient Replit-proxy rewire (INFRA-4b) — grading is Gemini-only; Claude is visuals-only and degrades
  gracefully. **Flagged for PR2:** `tsx` (absent from manifests; warmup is `DATABASE_URL`-gated, inert until PR2 adds Postgres).
- **PR2 (harden, queued):** provision Postgres + `DATABASE_URL` + add `tsx` + `ADMIN_FIREBASE_UIDS` + `SESSION_SECRET` +
  rate-limit + warm-pool decision (`WARM_POOL_TOP_UP_INTERVAL_MS` currently `0`).
Reports: `report-api-server-deploy-investigation-2026-06-10.md`, `report-api-gateway-railway-2026-06-10.md` (incl. owner runbook).

## ⛔ TRACK B (#222) verification gate — now LIVE-TESTABLE; owner+cofounder run it to close
With the backend live, the grade→persist→mobile-Me→desktop-Me round-trip can finally be PROVEN. **Status: live-testable, NOT yet
closed.** The owner + cofounder run the real round-trip on the live app (sign in → grade a real answer → confirm "Saved to your
progress" → mobile Me shows the real mistake mix → desktop Me matches on the same uid; plus the failed-grade → error path). **Only
that pass closes [TRACK-B-GATE] / ISSUE-009.** Step-by-step in `report-api-gateway-railway-2026-06-10.md` §7. See OPEN_QUESTIONS [TRACK-B-GATE].

## PHASE-2 RESPONSIVE DIVERGENCE — Track A DONE (#220); audit ordered the rest
The Phase-2 work (reconcile stale mobile twins to the desktop source-of-truth; no invented numbers) is underway.
- **Full divergence audit (read-only):** `report-responsive-divergence-audit-2026-06-08.md` mapped every `useIsDesktop()`
  split. 7 split surfaces → 2 MATCH-by-design (Home, Welcome), 2 MATCH by construction (Exam Trends, Practice Hub),
  **5 DIVERGENT** (Me, chrome/avatar, Check & Improve, Topic Hub, Worksheets). Severities normalized (mobile-shows-less =
  functional, not trust-critical).
- **Track A DONE (#220, `8c478ce`):** mobile Me (`app/Me.tsx`) no longer shows fabricated personal data — the hardcoded
  `COMMON_MISTAKES` bars (−12/−8/−5) + invented weak-topics count are removed, replaced with honest empty-states (desktop
  Me's verbatim copy) + an honesty footer. The urgent trust-critical stopgap. Streak/XP kept (real localStorage). 1 file,
  +48/−56; grep-proven zero fabricated data; gates green; build CI-gated.
- **Punch-list order (OPEN_QUESTIONS):** Track A ✓ → **Track B (mobile Check trust + persistence — the data source mobile
  Me needs)** → RESP-DIV-2 (mobile has NO logout path) → Topic Hub reconcile → Worksheets parity → Home real-insights →
  RESP-DIV-3 (trial banner). Durable cure = converge mobile Me into desktop Me (one responsive component, one pipeline).

## SEVER PR (#218) — obsolete surfaces disconnected; product reaches ONLY live surfaces
PR #218 (`fix/sever-obsolete-surfaces`; squash-merged **`bcb7c2a`**, 57 files +170/−171) severed every inbound edge
(route, nav, catch-all, command-palette, leaked link) to obsolete/deferred pages so the running product reaches
ONLY live surfaces. **Markers-now doctrine** — no files moved/deleted; 46 disconnected files carry a top-of-file
`LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) marker for a future Phase-2 clean-branch (grep the markers to
delete/keep). Authority: `AGENT_sever_obsolete_surfaces_2026-06-08.md` + the two read-only audits
(`report-responsive-surface-audit-2026-06-08.md`, `report-banned-term-prose-audit-2026-06-08.md`).
- **Routing (App.tsx — owner-authorized, routing-scoped):** mobile `/` (RootEntry) + catch-all `*` (HomeRedirect)
  re-pointed off the retired old `/dashboard` to the live MobileHome (`/browse`) / `/`; `/browse` made terminal at
  mobile width (no `/`⇄`/browse` loop). **Fixes the two-contradictory-homes bug** (mobile `/` + catch-all landed on
  the old Dashboard while the BottomNav Home tab went to `/browse`). Durable nav-mirror rule encoded; BottomNav
  active-state residue trimmed to the live set. `main.tsx` was NOT needed (less forbidden-file surface).
- **18 dead `<Route>` entries removed** (RETIRE: dashboard, trends, daily-mix, daily-mission, planner, study-plan,
  night-before, revision-calendar, mini-mock, weekly-wrapped, weekly-digest, methodology, settings; DEFERRED:
  parent-dashboard, parent, predictive-papers). `weak-area-practice` KEPT (partial-sever: dead-Dashboard doorway +
  palette entry severed; live ExamSim/MockPaper inbound preserved).
- **11 leaks closed:** JourneyStrip removed from HPQ; command palette severed at switch + catalog
  (`commandPaletteConfig`) + intent (`commandIntent`); live back-defaults/links in PracticeQuestionList, TopicHub,
  WeakAreaPractice, ExamSimulation, MockBuilder, the Login post-login fallback, and Onboarding re-pointed off
  severed routes. (5 of these were BEYOND the named JourneyStrip+palette — surfaced by a manual dead-path grep
  that the connectivity graph cannot see.)
- **Merge gate = before/after connectivity graph** (a new reusable tool `connectivity-graph.mjs` in the diff
  folder): 18/18 intended cuts unreachable AFTER, **28/28 live routes preserved (zero loss)**, 0 unexpected losses;
  `/mock-paper` flagged collateral (kept routed, unreachable — its only entry was the deferred predictive-papers).
- **Gates:** tsc, mojibake, scope:guard product, root matrix 175/175, ops 6/6, git diff --check all PASS; **CI
  `quality-gate` GREEN** (the linux vite build + verify-production-build). Vercel preview verified by owner
  (MobileHome landing 360/768, desktop sidebar nav, gated-CTA→login→return, routing fix → MobileHome not old
  Dashboard). Report: `report-sever-obsolete-surfaces-2026-06-08.md` + `connectivity-{before,after,diff}.*`.
- **Auth untouched** — zero auth / `main.tsx` / Firebase files in the 57; this build is byte-identical to #214 on
  auth. New responsive-divergence findings from the preview logged in OPEN_QUESTIONS (Phase-2, soft-launch).

## SYLLABUS PROSE COPY-FIX (#216) — 3 Tier-1A banned terms removed from the live cockpit
PR #216 (`fix/banned-term-prose-copy`; squash-merged **`b35f764`**) fixed 3 out-of-syllabus strings the
175/175 guard cannot catch (its surface scan omits bare generics to avoid prose false-positives). 2 files,
copy-only (+2/−3): `lib/desktop/topics.ts:35` Polynomials blurb dropped "the division algorithm" → quadratic
zeroes-coefficient wording; `:45` Linear Equations blurb dropped "cross-multiplication"; `topicHubContent.ts:249`
removed the "Complementary angles" Board-Essentials row. Authority: `report-banned-term-prose-audit-2026-06-08.md`.

### Two READ-ONLY audits now drive the next workstreams (reports in `diff/`)
- **`report-responsive-surface-audit-2026-06-08.md`** — mapped the live cockpit vs the abandoned graveyard
  (old `/dashboard` subgraph + `components/dashboard/*`, orphans Home/ProfilePage/PracticeHome/MentorPanel,
  old `/trends`, `/planner`). **Headline risk:** mobile `/` + catch-all + command palette still route live
  students into dead surfaces (old Dashboard is the mobile landing today). Owner-ruling queue (Bucket B + C)
  → produces the kill-list. **The SEVER PR is the next instruction.**
- **`report-banned-term-prose-audit-2026-06-08.md`** — 3 Tier-1A fixed here (#216). Tier-1B + Tier-2 deferred
  (see OPEN_QUESTIONS).

## AUTH MIGRATION ARC — 4/4 COMPLETE (#214): auth is Firebase-only, end to end
The arc is closed: **PR-1 #206** (api-server edge `verifyIdToken`) → **PR-2 #208** (frontend rebuilt on Firebase
Auth + native login) → **PR-3 #210** (Clerk teardown — Firebase-only, repo Clerk-free) → **governance scrub #212**
(CLAUDE.md/§5 doctrine + setup docs) → **PR-4 #214** (phone / SMS-OTP). Auth providers live: **Google (popup) +
Email/Password + Phone (SMS OTP)**. Firestore keyed on Firebase uid; admin via `ADMIN_FIREBASE_UIDS`.
**Verified in production-preview:** a real-number phone login — real SMS, real OTP, signed in, **trial correctly
tied to the phone account**. (Deliverability caveat logged — see OPEN_QUESTIONS [SMS-DELIVERABILITY].)

## AUTH MIGRATION ARC — PR-3 of 4 DONE (#210): Clerk teardown — auth is now Firebase-only
PR-3 (`fix/remove-clerk-bridge` from `5fc4141`; squash-merged **`6bf6e58`**) removed **all remaining Clerk**:
the gateway custom-token bridge, the api-server Clerk dual-accept fallback, `@clerk/express` + the Clerk
middlewares, and the now-dead JWT libs. Auth is **Firebase-only end to end**. 14 files (2 deletions + 12 edits,
+30/−224) + lockfile (−162). Report: `report-pr3-remove-clerk-bridge-2026-06-08.md`.

### What landed
- **Deleted** `lazytopper/server/routes/firebaseAuth.cjs` (the `/api/auth/firebase-token` bridge) +
  `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`.
- `server/index.cjs` — removed the bridge require/factory/route-handler/CORS entry. `lazytopper/package.json` —
  dropped `jsonwebtoken` + `jwks-rsa` (remain transitive under `firebase-admin`, which is correct).
- `requireFirebaseAuth.ts` — removed the Clerk `getAuth` fallback → **Firebase-only** (`verifyIdToken` or 401;
  503 if Firebase Admin unconfigured — fail-closed, since there is no fallback now).
- `app.ts` — removed `clerkMiddleware()` + the proxy mount. `artifacts/api-server/package.json` — dropped
  `@clerk/express` + the orphaned `http-proxy-middleware`.
- Scrubbed stale "Clerk" comments + the `authProvider` default (`"clerk"` → `"firebase"`).

### Zero-Clerk (owner gate)
`grep -rinE "clerk"` over `**/src`, `**/server`, `**/package.json` → **ZERO**. The lockfile `@clerk` count = 0
(whole `@clerk/*` tree removed). Remaining `clerk` matches are **non-code only**: gitignored `.env.local`,
auto-gen `.project_memory` snapshots, `handoff/*` migration history, and `CLAUDE.md`/`FIREBASE_SETUP.md`/
`docs/desktop-graduation-state.md` — the latter are the **governance/docs scrub** queued next (owner-ready
instruction; `CLAUDE.md §5` "Clerk stays for now — K2H-15" is now obsolete).

### PR-3 gate evidence (all green, Codespace + CI)
- **CI `quality-gate`**: PASS (run `27115594685`, 1m33s) — frozen install + root 175/175 + mojibake + build + ops.
- **Codespace (pre-push):** api-server tsc/build exit 0; lazytopper tsc/build exit 0; verify-production-build PASS;
  **gateway boots without the bridge** ("LazyTopper AI server running on port 3011"); root 175/175; ops 6/6;
  lockfile `@clerk` count = 0.

### ⚠️ Now load-bearing (the Clerk safety net is gone)
- **Admin bootstrap (BLOCKING):** `ADMIN_FIREBASE_UIDS` = your Firebase uid is the ONLY way admin routes
  authorize now. Until set: admin routes 503 in prod / dev-skip locally.
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) — `requireFirebaseAuth` returns 503 without it (no fallback).
- Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + the local `.env.local`.

### Remaining auth work
- **(DONE — #212) CLAUDE.md governance scrub** — surgical §1 stack + §5 doctrine edits, +
  `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md`. Owner-reviewed merge (governance files excluded from
  docs auto-merge). Trunk after #212: `c755adb`.
- **(NEXT, hold for owner go) PR-4 — phone / SMS-OTP** (`feat/auth-phone-otp`): fill the `initPhoneRecaptcha`/
  `sendPhoneOtp`/`verifyPhoneOtp` façade with `signInWithPhoneNumber` + reCAPTCHA v2 invisible; wire the Phone
  tab (+91 → 6-digit OTP). Project `lazzyy-topper` on Blaze; enable Phone provider + Authorized domains (owner).
- Google **One-Tap** (GIS) follow-up once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-2 (#208): frontend on Firebase Auth (Clerk removed from the client)
PR-2 (`feat/auth-firebase-frontend` from `7f993cb`; squash-merged **`597880d`**) rebuilt the frontend auth on
**direct Firebase Auth** and removed Clerk from the client. The api-server edge (PR-1) is now hit with **Firebase
ID tokens** (its preferred `verifyIdToken` path); the Clerk fallback there goes idle (removed in PR-3). Design basis:
`LazyTopper_Login_Design_Spec_v2.md` + `lazytopper_login_prototype_v2.html`. Reports:
`report-pr2-auth-firebase-frontend-2026-06-08.md` + `report-pr2-evidence-2026-06-08.md`.

### What landed (6 files + lockfile)
- **`src/context/AuthContext.tsx`** — internals → direct Firebase Auth (`onAuthStateChanged`,
  `signInWithPopup(GoogleAuthProvider)`, email/password). **Added** `signInWithEmailPassword` /
  `signUpWithEmailPassword` (additive — `AuthContextType` shape preserved, ~38 consumers untouched).
  `getToken()` → `currentUser.getIdToken()`. Clerk→`/api/auth/firebase-token` bridge deleted from the client.
  **Local-dev/E2E anonymous-session path preserved verbatim.** Phone façade stays no-ops (PR-4).
- **`src/pages/Login.tsx`** — native v2 widget: official Google button + One-Tap sub-line, Email/Phone segmented
  toggle, **one-step** email+password, **disabled** Phone tab with honest "arrives shortly" note (handler = PR-4).
  `lt-login-clerk-frame` → `lt-login-frame`; **"Welcome back" header removed**; left brand panel untouched.
- **`src/pages/SignUpPage.tsx`** — native Google + email/password create-account.
- **`src/main.tsx`** — `ClerkProvider` removed (authorized for PR-2). **`package.json`** — `@clerk/react` dropped.
- **`artifacts/api-server/src/routes/admin.ts`** — admin allowlist migrated **`ADMIN_CLERK_UIDS` →
  `ADMIN_FIREBASE_UIDS`** (the forward-corrected functional step; `req.userId` is now a Firebase uid).

### Owner decisions (PR-2)
- **Google = popup** (`signInWithPopup`) — no new env/script. True GIS One-Tap is a fast-follow once a Web OAuth
  client ID is supplied. **Email = one-step**, password-based (no magic link). Phone toggle present, inert until PR-4.

### PR-2 gate evidence (all green)
- **CI `quality-gate`**: PASS (run `27102702574`) — frozen install + root matrix 175/175 + mojibake + lazytopper
  build + ops matrix.
- **Codespaces (pre-push, files copied in — no commit):** lazytopper `tsc -p tsconfig.app.json` **exit 0** (the
  ~770-line rewrite's first compile); api-server typecheck exit 0; **vite build exit 0**; verify-production-build
  PASS; root 175/175; ops matrix 6/6; lockfile regenerated (`@clerk/react` removed, −17 lines).
- **Vercel-preview screenshots** (360/768/desktop × login + signup) captured + assessed faithful to the v2
  prototype — `pr2-{login,signup}-{360,768,desktop}.png` in the diff folder.
- **Runtime auth verification (headless, real `lazzyy-topper`):** email/password sign-up+sign-in + `getIdToken()`
  → decoded JWT `iss = https://securetoken.google.com/lazzyy-topper`, `aud = lazzyy-topper`,
  `sign_in_provider = password` — a genuine **Firebase** token (NOT Clerk). Throwaway account deleted.
- Zero `@clerk`/`VITE_CLERK` refs remain in `lazytopper/src`. `scope:guard` classifies the 5 FE files as
  `product`; the 1 BE file (`admin.ts`) is the known `[unclassified]` gap (D47).

### ⚠️ PR-3 IS NEXT (owner to give go) — the Clerk teardown
PR-3 (`fix/remove-clerk-bridge`): delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs` + its
`server/index.cjs` wiring; drop `jsonwebtoken`/`jwks-rsa`); remove the api-server **Clerk fallback** branch from
`requireFirebaseAuth` (Firebase-only); drop **`@clerk/express`**; unmount `clerkMiddleware()`; remove
`clerkProxyMiddleware`; remove Clerk env (`CLERK_SECRET_KEY`, `CLERK_JWKS_URI`, `CLERK_ISSUER`, `VITE_CLERK_*`).

### Owner / deploy actions still pending
- **Admin bootstrap:** sign in once via Firebase → capture your uid → set `ADMIN_FIREBASE_UIDS` (else admin routes
  503 in prod / dev-skip locally).
- **Firebase Authorized domains:** add the prod Vercel domain to `lazzyy-topper` so `signInWithPopup` works in prod
  (localhost already allowed; the Google popup couldn't be auto-tested headlessly — owner verifies with a real click).
- **Railway env (from PR-1):** `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or ADC) on api-server.
- **One-Tap (GIS) follow-up:** small PR once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-1 (#206) — Firebase edge verify + Clerk dual-accept (Option B)
Owner decided to **remove Clerk and use Firebase Authentication directly** (Google + Email/Password + a NEW
phone/SMS-OTP option). Rationale (verified): all student data already lives in Firestore (per-uid, secured by
`firestore.rules` `isOwner(uid)`); Clerk sits "midway" (login UI + session → a backend bridge mints a Firebase
custom token); Firebase has native auth, so Clerk is the removable layer. Cheapest to migrate now (no live
student accounts, Clerk production not yet set up). Authority: the read-only audit
`report-auth-migration-clerk-to-firebase-2026-06-07.md` (owner-reviewed) + the 4-PR build plan.

**The migration is 4 sequenced, owner-approved PRs (same executor, STOP-for-approval between each):**
- **PR-1 (#206, DONE)** — backend edge guard ("Surface B" = `artifacts/api-server`): verify Firebase ID tokens.
- PR-2 (NEXT) — frontend `AuthContext` internals + Login/SignUp rebuilt natively on Firebase Auth (Google One
  Tap + Email/Password); client switches to send Firebase ID tokens; drop `@clerk/react`; `main.tsx` authorized.
- PR-3 — delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs`); remove the Clerk fallback
  **and** `@clerk/express` together; unmount `clerkMiddleware`; remove `clerkProxyMiddleware` + Clerk env.
- PR-4 — phone / SMS-OTP provider (reCAPTCHA v2 invisible; project `lazzyy-topper` on Blaze).

### PR-1 (#206) — what landed (5 files, all under `artifacts/api-server/`)
Branch `feat/auth-firebase-edge` from `45f733e`; squash-merged **`a3def5f`**. `.claude/` never staged.
- **NEW `src/lib/firebaseAdmin.ts`** — Firebase Admin init for the edge (mirrors the gateway: `VITE_FIREBASE_PROJECT_ID`
  + optional `FIREBASE_SERVICE_ACCOUNT_KEY`, else ADC). Exports `firebaseAdminApp` (or `null` if unconfigured).
- **NEW `src/middlewares/requireFirebaseAuth.ts`** — the dual-accept guard: (1) `verifyIdToken(bearer)` →
  `req.userId = decoded.uid`; (2) on failure, fall back to the **still-mounted** `@clerk/express` `getAuth(req)`;
  else `401 {ok:false,error:"Unauthenticated"}`. Augments `Express.Request` with `userId?: string`.
- `src/routes/admin.ts` / `src/routes/questions.ts` — `requireAuth()` → `requireFirebaseAuth`; read `req.userId`;
  dropped the `@clerk/express` imports from the route files. `x-user-id` forwarding to the gateway unchanged.
- `package.json` — added `firebase-admin@^13.7.0` (the one new dep; already in the lockfile via lazytopper).

### Option B (owner-confirmed) — the dual-accept lifecycle
PR-1 keeps `@clerk/express` mounted (the fallback's `getAuth` needs `clerkMiddleware`; the still-Clerk frontend
needs `clerkProxyMiddleware`). NO hand-rolled Clerk crypto; NO `jsonwebtoken`/`jwks-rsa`. The Clerk fallback +
`@clerk/express` are removed **together in PR-3**. Lifecycle: PR-1 adds Firebase verify + Clerk fallback (both
live) → PR-2 switches the client to Firebase tokens **and** migrates the admin allowlist → PR-3 removes the
Clerk fallback + `@clerk/express`. `/shared-api/questions/report` never breaks. Rejected Option A (hand-rolled
JWKS Clerk verification) as unjustified security-critical/throwaway code. The build doc's "drop `@clerk/express`
in PR-1" line is corrected → moved to PR-3. See DECISION_LOG (Option B).

### ⚠️ PR-2 FORWARD CORRECTION (admin allowlist) — do NOT lose
`admin.ts` `requireAdminRole` checks `req.userId` against **`ADMIN_CLERK_UIDS`** (Clerk ids). PR-1 deliberately
left this as-is. When **PR-2** switches the client to Firebase tokens, `req.userId` becomes a **Firebase uid**,
so every admin route would **403** until the allowlist is migrated. Therefore the **rename + revalue
`ADMIN_CLERK_UIDS` → `ADMIN_FIREBASE_UIDS` moves to PR-2 (not PR-3)**, with a bootstrap step: owner signs in
once via Firebase → capture the uid → set it in `ADMIN_FIREBASE_UIDS`. (A code comment in `admin.ts` notes the
deferral; that comment still says "PR-3" — PR-2 must update it.)

### Deploy-stage note (Railway) — NEW requirement from #206
`artifacts/api-server` now requires **`VITE_FIREBASE_PROJECT_ID`** + **`FIREBASE_SERVICE_ACCOUNT_KEY`** (or ADC)
in its Railway deploy environment to verify Firebase ID tokens. Without them `firebaseAdminApp` is `null` and the
edge relies on the Clerk fallback only (fine during the PR-1→PR-2 window; required real once PR-3 is Firebase-only).
Fold into the INFRA-4 backend-deploy env checklist.

### PR-1 gate evidence (all green)
- **CI `quality-gate.yml`**: PASS (1m29s, run `27100425116`) — frozen-lockfile install + root matrix 175/175 +
  mojibake + lazytopper build + ops matrix all green.
- **Codespaces (linux, pnpm 10.32.1)** — the gates that can't run on the Windows box: lockfile regenerated (only
  `pnpm-lock.yaml` changed, +8/−65, adds `firebase-admin` to api-server, committed in the PR); **api-server
  `typecheck` exit 0** (first real compile of the 2 new files; required building the `@workspace/api-zod`/`db`
  composite refs first); **api-server `build` (esbuild) exit 0** (`firebase-admin` externalized); root matrix
  **175/175**; lazytopper ops matrix **all 6 green** (the transient `llm-path 4/5` was a Codespace-only missing-
  ripgrep artifact — identical on trunk, unrelated to PR-1; CI installs ripgrep → 5/5).
- `scope:guard` is structurally **N/A** for an `artifacts/api-server`-only PR (its policy lanes are
  lazytopper-anchored — no `artifacts/api-server` lane); forbidden-files clean; diff confined to 5 files.

## ✅ INFRA ARC CLOSED THIS SESSION (4 items) — repo is healthy; NEXT SESSION PIVOTS TO PRODUCT
The whole arc this session was diagnosing + closing the infra tangle. As of trunk `5441060` all four are DONE:
1. **Lockfile fixed (#201)** — `pnpm-lock.yaml` regenerated to match `lazytopper/package.json`; frozen installs work on linux.
2. **CLAUDE.md corrected (#198)** — stale commands fixed (`verify-production-build.mjs`; `npx tsc -p tsconfig.app.json --noEmit`; the real gate bar; the two distinct `test:matrix:all`).
3. **CI LIVE (#198)** — `.github/workflows/quality-gate.yml` at the repo ROOT gates every PR into trunk + push to trunk: pnpm **10.32.1** frozen install → root matrix **175/175** → mojibake → **linux `vite build`** → ops matrix. Proven to RUN and to GATE (probe PR #202 went red on a planted mojibake). ripgrep installed in CI; `scope:guard` stays a LOCAL gate (working-tree-diff based → false-PASS on a clean CI checkout). No product-PR auto-merge (human gate retained).
4. **De-Replit COMPLETE (#199 PR-A + #204 PR-B)** — all Replit scaffold, the `@replit/vite-plugin-*` packages, `@replit/connectors-sdk`, and the 3 non-product stubs (`lazytopper-video`, `mockup-sandbox`, `lazytopper-mobile`) removed. The repo is now **fully `@replit`-free in manifests + source + lockfile** (verified `grep` = 0). Workspace **12 → 9 projects**; lockfile shrank **~7,300 lines** (21,345 → 14,051). PR-B (#204) was the **first real PR through the new CI gate** — it went green.

**KEPT (real, NOT removed):**
- `artifacts/api-server/` — the real Express/Clerk/Postgres backend that proxies to the AI gateway.
- `artifacts/lazytopper-app/` — the vite build **OUTPUT TARGET**: `lazytopper/src` builds into its `dist/public/app` (served at `/app/`). Now a shell (its stub `src` went in PR-A); kept only as the output path.
- `lazytopper/` — the product (the ONE responsive website).

**Backend architecture (mapped this session):** layered — frontend `/api/*` → `api-server` (Express edge: Clerk auth, Postgres/Drizzle, questions/admin) → spawns + proxies AI to → `lazytopper/server/*.cjs` (the Gemini/Claude/tutor/check-solution gateway on port 3001). So "deploy the backend" = deploy `api-server` (which runs the gateway as a child) + provision Postgres.

## CI ACTIVATED (#198) — the safety net is LIVE; CLAUDE.md corrected
GitHub Actions CI now runs on every PR into `base/approved-thru-437` and on push to it. This is the FIRST
time CI has ever executed (the predecessor `lazytopper/.github/workflows/mojibake-guardrail.yml` was in a
SUBDIRECTORY — GitHub only registers workflows at the repo ROOT — so it never ran). **D39 RESOLVED.**
- **Workflow:** `.github/workflows/quality-gate.yml` (repo root; old mislocated file deleted). On an
  ubuntu-latest runner it gates the full bar: pnpm `--frozen-lockfile` install → root `scripts`
  `test:matrix:all` (**175/175**) → lazytopper `check:mojibake` → **`build` (linux `vite build`)** →
  lazytopper `test:matrix:all`. A red run blocks merge. Triggers scoped to trunk (PR-into + push-to);
  `concurrency` cancels superseded runs.
- **Squash-merged `9d772cb`** (3 legible commits: CLAUDE.md fix / CI workflow / cross-platform ops fixes).
  Final green run `27088156112`; **proven to gate** — throwaway PR #202 with a planted mojibake glyph went
  RED at the mojibake step, then was torn down.
- **Prereq cleared:** the stale-lockfile blocker that parked #198 last session was fixed on trunk by **#201**
  (regenerated `pnpm-lock.yaml` to match `lazytopper/package.json`). #198 rebased clean onto that.
- **Three Windows-only fragilities** that only surface under live linux CI were found + fixed inside #198:
  (1) pinned CI to **pnpm 10.32.1** — the lockfile's regen version; pnpm 11 leaves `npm_config_user_agent`
  empty on linux so the root `preinstall` guard (`case ...pnpm/*`) trips; (2) added a **ripgrep** install
  step — the ops audits shell out to `rg` with no fallback and ubuntu-latest lacks it; (3) fixed **hardcoded
  Windows path separators** in `bsre_spike_acceptance.mjs:50` (blocking) + `trig_legacy_retire_acceptance.mjs:29`
  (latent) to a cross-platform `[\\/]` regex. (BSRE is live product code — powers the TopicHub tutor
  `/api/mentor` path — so the check stays; only the separator was wrong.) Left alone: `styles_change_impact:25`
  `hasBackslash()` is an intentional non-portable-path DETECTOR; `feature_file_matrix.mjs` absolute Desktop
  paths are an owner-local tool, not in CI.
- **CLAUDE.md corrected:** verifier `verify-build.mjs`→`verify-production-build.mjs`; TS check
  bare `tsc --noEmit`→`npx tsc -p tsconfig.app.json --noEmit`; dropped dead `NODE_ENV/BASE_PATH`; documented
  the pnpm-workspace reality + the real gate bar + the two distinct `test:matrix:all`; added §6a (CI active;
  `scope:guard` stays a LOCAL gate — it inspects the working-tree diff, so a clean CI checkout is a false-PASS).
- **NOT in scope (deferred):** product-PR auto-merge — the human merge gate is retained until CI is proven
  over a series of real PRs. Authority: `report-unpark-198-ci-green-2026-06-07.md`
  (+ `report-ci-activation-blocked-2026-06-05.md` for the prior parked diagnosis).

## de-Replit PR-A DONE (#199) — safe scaffold + dead lazytopper-app stub (zero build/lockfile risk)
First, lockfile-INDEPENDENT slice of retiring Replit. Authority: `report-replit-removal-audit-2026-06-06.md`
+ `report-de-replit-pr-a-2026-06-06.md`. Build-safety verified: the product build (`lazytopper/vite.config.ts`)
imports ZERO `@replit` plugins and CI builds `lazytopper` only — these deletes cannot break the shipped app.
Branch `chore/de-replit-pr-a` from `2857871`; **70 files (69 deletes + 1 root `package.json` build-fix);
squash-merged `fec2f92`**. `.claude/` never staged.
- **Deleted:** `.replit`, `.replitignore`, `.tmp-lazytopper-artifact.toml` (root scaffold); `scripts/backup-to-drive.mjs`
  (Replit-only Drive backup, wired to no script); `artifacts/lazytopper-app/src/**` (64 — vestigial wouter/radix
  stub, NOT in the shipped bundle) + its `.replit-artifact/artifact.toml`. The lazytopper-app `package.json` +
  the `dist/` output target the real build writes to are **KEPT**.
- **Root build hygiene:** dropped dead-stub filters (`@workspace/lazytopper-app`, `@workspace/lazytopper-video`)
  from the root `package.json` `build`; **kept** `@workspace/api-server` + `lazytopper` (`scripts`-field edit → lockfile-safe).
- **Gates:** tsc 0; mojibake 0; root `scripts` `test:matrix:all` **175/175**; lazytopper ops matrix green;
  `git diff --check` clean; remote forbidden-file check clean. Two NON-blocking, NOT-this-PR FAILs:
  `scope:guard` = coverage gap (no policy lane models root-scaffold/`artifacts/**` deletes; manually verified
  clean; governance JSON untouched), and `pnpm install --frozen-lockfile` = PRE-EXISTING #198 staleness
  (`lazytopper/package.json` test-dep drift; this PR changes ZERO lockfile inputs — confirmed live). `vite build`
  / `verify-production-build.mjs` not runnable on Windows (linux-pinned binaries); root CI workflow parked in #198.
- **DEFERRED to PR-B (lockfile-coupled — behind the #198 lockfile regen):** delete whole packages
  `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (all workspace
  importers; lazytopper-mobile = owner-confirmed non-product Expo native path); remove `@replit/vite-plugin-*`
  + the 3 stub `vite.config.ts` + the 3 `catalog:` entries; `pnpm-workspace.yaml` allowlist cleanup
  (`stripe-replit-sync`, `@replit/*` exclude); orphaned root dep `@replit/connectors-sdk`; reconcile the root
  `typecheck` glob (`./artifacts/**` still hits the src-less lazytopper-app).
- **KEEP (owner-confirmed):** `artifacts/api-server/` — real backend (Express/Postgres/Clerk → AI gateway);
  retained in the root build; map the backend separately before touching it.

## de-Replit PR-B DONE (#204) — @replit packages + 3 non-product stubs removed (atomic, lockfile-coupled)
The lockfile-coupled remainder that PR-A deferred. Authority: `report-de-replit-pr-b-2026-06-07.md`.
Branch `chore/de-replit-pr-b` from `a0c7018`; **144 files (140 stub-dir deletes + 4 edits) + the lockfile
regen; squash-merged `5441060`**. The atomic set (all in one PR, or the build breaks):
- **A — deleted 3 non-product stub packages:** `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`,
  `artifacts/lazytopper-mobile/` (the Expo NATIVE-app path — NOT the product, which is ONE responsive website).
  All 3 were workspace/lockfile importers.
- **B — stripped the surviving `@replit` config:** `artifacts/lazytopper-app/vite.config.ts` →
  `plugins: [react(), tailwindcss()]` (removed `runtimeErrorOverlay` + the `REPL_ID`-gated cartographer/dev-banner).
- **C — removed `@replit` deps:** root `@replit/connectors-sdk` (orphaned once PR-A deleted its only consumer)
  + the 3 `@replit/vite-plugin-*` devDeps in `lazytopper-app/package.json`.
- **D — cleaned `pnpm-workspace.yaml`:** dropped the 3 `@replit` `catalog:` entries + the
  `minimumReleaseAgeExclude` block (`@replit/*`, `stripe-replit-sync`) + stale Replit comments. The `packages:`
  glob (`artifacts/*`) needed no edit; the linux-x64 `overrides` block is KEPT (build-platform pinning).
- **E — reconciled the root `typecheck`:** `--filter "./artifacts/**"` → `--filter @workspace/api-server`
  (the glob had started hitting the src-less `lazytopper-app`, which errored TS18003 after PR-A).
- **F — lockfile regen (Codespaces, pnpm 10.32.1):** the Windows box can't (the `minimumReleaseAge` registry
  check needs `time` metadata it couldn't fetch); regenerated on linux per the #201 path. Lockfile shrank
  ~7,300 lines. **The new #198 CI gated the PR green** — its first real-PR proof.
- Windows-side gates before handoff: `@replit` purged from all source; `git diff --check` clean; no
  `lazytopper/src`/handoff touched; `scope:guard` FAIL = the known `artifacts/**` coverage gap (D41), not a breach.

## 3 pre-existing test reds RESOLVED (#196) — mixed PR (product src/data + trackedTooling lanes)
The three acceptance suites that had been RED on trunk (tracked as D38) are now GREEN. Authority:
owner-approved diagnosis `report-preexisting-failures-diagnosis-2026-06-05.md` + independent re-verification
(`report-preexisting-failures-fix-2026-06-05.md`). Branch `fix/preexisting-failures` from `df88d29`; merged
`19b3029`. **3 lane-pure commits**, 7 files (+173/−393); `predictionTypes.ts` frozen; `.claude/` never staged.
- **Commit 1 (product/data) — mojibake re-encode.** `circles.proof.ts` (462 corrupted glyphs, 12 types) +
  `maths.caseBased.ts` (6 glyphs, 2 types) → correct Unicode via a 1:1 reversible map built from the EXACT
  in-file bytes. Only corrupted sequences changed; already-correct Unicode + the pre-existing BOM left
  byte-for-byte. Single-level UTF-8→cp1252 corruption (not double-encoded). **`test:mojibake` 1/3 → 3/3.**
  CORRECTION to the diagnosis: caseBased was a SECOND corrupted file it missed (signature single-level
  `â–³`→`△` ×5 + a subscript-n stored as `â`+ASCII-apostrophe+`™`, a smart-quote artifact) — NOT the
  predicted double-encoded `Ã¢âÂ³`.
- **Commit 2 (tooling + product orphan deletes) — stale-test cleanup.** bank-health was a stale test
  asserting never-built wiring (`bankHealthSummaryForSubject` exists nowhere; HPQ never imported the engine);
  the engine (`src/prediction/bankHealth.ts` + `buildTopicKeySources.ts`) was orphaned dead compute (nothing
  in `src/` imported it). Deleted both orphans + rewrote the test as a **retirement guard** (same idiom as
  `trig:retire`/`bsre:retire`): asserts the dead compute is gone + HPQ surfaces no computed health (no-fake-
  data doctrine). Script name KEPT — 4 harnesses invoke it (`test_matrix.json`, `software_testing_bot.mjs`,
  `agent2_test_guard.mjs`, `matrix_execution_acceptance.mjs`) — so no package.json change. **2/4 → 4/4.**
  canonical-generator was stale after the "Split giant files" refactor (`be5e2de`) relocated
  `generateUnifiedPracticeQuestions`/`canonicalFallback` from `PracticePage.tsx` into
  `practiceQuestionBuilder.ts`; re-pointed the two page-side checks to the live chain. Generator unchanged.
  **2/4 → 4/4.**
- **Commit 3 (tooling) — un-blind the mojibake checker.** `check-mojibake.cjs` broke its scan at 50 hits;
  the cap bounded the SCAN (not just output), so a heavily-corrupted file that filled it stopped the loop
  before later-sorting files were read. `circles.proof.ts` (96 corrupted lines) sorts before
  `maths.caseBased.ts`, so the checker never saw the second corrupted file — and corruption shipped past
  both the local gate AND the CI workflow (both run this checker). Now scans every file/line; a
  `DISPLAY_LIMIT` bounds only printed output. Proof: against base-corrupted inputs the old cap flags only
  circles; uncapped flags both.
- **CI finding (corrected twice; tracked D39).** A mojibake guardrail workflow FILE exists but at
  `lazytopper/.github/workflows/mojibake-guardrail.yml` — a SUBDIRECTORY. GitHub Actions only runs workflows
  at the repo-root `.github/workflows/`, so it has **never executed** (`gh workflow list --all` and
  `gh run list` both empty — zero workflows registered, zero runs ever). It is dormant. So corruption shipped
  for TWO independent reasons: CI mislocated (never runs) + the checker it/the local gate would run was
  capped/blind (now fixed). Full test matrix + scope-guard remain un-CI-gated.
- **Gates:** tsc 0; prod build 0; `verify-production-build` PASS; `scope:guard --mode mixed` SCOPE_GUARD_OK
  (product+trackedTooling); `git diff --check` clean; the 3 previously-red now GREEN (mojibake 3/3,
  bank-health 4/4, canonical 4/4); lazytopper `test:matrix:all` green; root `scripts` `test:matrix:all`
  **175/175**; exhaustive uncapped repo-wide rescan **0 corruption** in any content file. Trunk after #196:
  `19b3029`.

## HPQ Phase 1 — consistency + honesty DONE (#194) — gated src/data + page lanes
Highly-Probable-Questions now tells the SAME story as Exam Trends. **Logic/copy/plumbing only — no
content authoring (that is Phase 2); all questions kept (re-badge + de-emphasize, never delete).**
Authority: `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` + `report-hpq-refinement-audit-2026-06-05.md`.
Diff = exactly **3 files** (`src/data/highlyProbableQuestions.ts`, `src/pages/HighlyProbableQuestions.tsx`,
`src/utils/mergeBucketsByTopic.ts`; +140/−36). `predictionTypes.ts` frozen.
- **P0 — tier badge single source of truth.** `defaultTier` was hand-authored per bucket (74% must-crack;
  11/27 cards contradicted the locked tiers). NEW `LOCKED_TIER_SOURCE` table (verbatim from the locked doc)
  is flattened to a canonical-key→tier lookup; `getHighlyProbableQuestions()` overrides each bucket's
  `defaultTier` AND each question's `tier` from it — one chokepoint every consumer reads through, so it
  can't drift again. Executed-runtime: **0 contradictions (was 11/27); must-crack badge share 74%→42%**
  (per-question 74%→44%). Corrections: Polynomials/Heredity → must-crack; Real Numbers, Quadratic,
  Probability, Statistics, Coordinate Geom, Metals, Carbon, Control → high-ROI; Pair-of-Linear, AP, Human
  Eye → good-to-do.
- **P2 — dead confidence compute retired.** `deriveHPQConfidence()` ran on every load but the page renders
  no confidence UI → dead compute on a non-tier-aligned 5-signal basis. Call + import removed.
  `prediction/hpqConfidence.ts` KEPT on disk (untouched) for a future reconciled model; optional
  `confidenceScore?/Band?/Rationale?` type fields kept (still its return type). No other `src/` referent.
- **P3 — honest reframe (owner-approved copy).** H1 "Predicted Questions" → **"High-Probability Question
  Patterns"**; sub-head names the three locked evidence sources (4 years of papers + official blueprint +
  examiner-pattern analysis); disclaimer "high-probability patterns to prioritise — not predictions of the
  exact 2027 paper." Nav labels + stack blurbs aligned. NO confidence badge introduced.
- **P5 — plumbing.** `canonicalTopicKey()` (normalize + alias table, exported from mergeBucketsByTopic)
  keys the merge → duplicate "Pair of Linear Equations" and "Metals & Non-metals" cards collapse to one
  each (26 deduped cards). Science topic-allow filter matches on canonical key → the 3 silently-dropped
  Human-Eye seed questions survive (**Human Eye 1→4**); any future drop is DEV-logged (`console.warn`,
  stripped from prod), never silent.
- **Gates:** tsc 0; prod build 0; `scope:guard --mode product` SCOPE_GUARD_OK; `git diff --check` clean;
  matrix weightage/trig/llm/bsre green; `hpq:drift` green (changed=0). Pre-existing/unrelated reds
  (bank-health 2/4, canonical-gen 2/4, mojibake 1/3 `circles.proof.ts`) verified absent-on-base / not in
  diff. In-syllabus unchanged (3 recovered Human-Eye Q all IN). Report:
  `report-hpq-phase1-consistency-2026-06-05.md`. **Phase 2 = content authoring (see NEXT_ACTION).**
  Trunk after #194: `6d5b6ed`.

## scopeGuard monorepo path-prefix bug FIXED (#192) — tracked-tooling
`scope:guard` had false-FAILed on **every** product edit (3rd PR hit; see the #190 section's "known
monorepo path-prefix artifact" note — that artifact is now resolved). Root cause: `.git` is at the repo
root and the guard runs from `lazytopper/`, so `git diff` emits **git-root-relative** paths
(`lazytopper/src/...`) while the policy lane rules are **lazytopper-relative** (`src/`) → every product
file classified `unclassified` → `SCOPE_GUARD_FAIL`. **Fix (Option A, owner-approved):** normalize the
path *frame* in `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/−6; policy JSON untouched) —
`detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd; `toPolicyFrame()`
strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the anchor keep their
full git-root path and are STILL classified (real lane, or `unknown` → visible FAIL); a no-blind-spot
invariant fails loudly if classified-count ≠ changed-count; coupled `git show HEAD:./package.json`
(cwd-relative) fix keeps the scripts-only package.json check reading the guard's own file. **The handoff's
`--relative` suggestion was REJECTED** (it emits only files under cwd → silently drops tracked changes
outside `lazytopper/` = false-PASS blind spot). Proven FAIL→OK on a product edit; tracked out-of-tree file
still seen+flagged; unclassified file → visible FAIL. Gates: tsc 0; `test:matrix:all` **175/175**; prod
build 0; verifier PASS; `git diff --check` clean. Follow-ups logged in OPEN_QUESTIONS (D32–D35). Trunk
after #192: `318c6b6`.

## Exam Trends BAND redesign DONE (#190) — step 6 complete; Option-B convergence #2
The flat ranked list (`src/pages/ExamTrendsRanked.tsx`, shipped #184) is now THREE collapsible priority
BANDS — **Must-crack** (open by default) → **High-ROI** (collapsed) → **Good-to-do** (collapsed). The band
IS the synthesized verdict, so the weight-vs-trend **Sort toggle was removed**; Subject + Science-stream
filters stay. Layout-only Option-B evolution of the ONE responsive component (no twin; verified 360/768/
desktop reflow grammar). The existing `TopicRow` is reused verbatim inside each band (name + trend chip +
marks-weight bar + ~N marks + HPQ + Open→Topic Hub + "⋯" Practice/Worksheet/Predicted/Add-to-selection);
within-band order = marks-weight desc. NEW: an **"Expect:" recurring-sub-pattern line** rendered ONLY on the
11 must-crack topics the locked doc supplies (High-ROI rows show none — no invented shapes); a **volatility
flag** ("Prepare deep · weight varies") on Trigonometry + Electricity in the existing amber caution tone
(no new color). Tiers/sub-patterns/volatility were transcribed **VERBATIM** from the owner-signed-off
authority `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` and co-located in the component as data —
NOT computed from `weight`/`trendTier`, and no `src/data/` or `src/lib/desktop/` edit needed (so the diff
is exactly **1 product file**, `src/pages/ExamTrendsRanked.tsx`, +406/−84). Design grammar preserved
byte-faithfully; honest empty states; in-syllabus only (corrected guard #188). The owner-locked tiers
(2026-06-05, model + 2 teacher overrides: Triangles→must-crack/Statistics→high-ROI; Heredity→must-crack)
**satisfy the D27 "re-derive priorities FRESH" prerequisite (step 5)** — tiering is now scientifically
derived + owner-locked, so the band-threshold open question is closed (bands are signed-off data, not a
computed threshold). Gates: `tsc --noEmit` 0; prod build 0; verifier PASS; `test:matrix:all` **175/175**;
`git diff --check` clean; forbidden patterns none. `scope:guard --mode product` reported FAIL listing the
file `[unclassified]` — the **known monorepo path-prefix artifact** (git root is `Lazytopper-Production`,
so diff emits `lazytopper/src/...` while the policy `product` rule is `src/`), manually verified as NOT a
real breach (the file matches `src/` relative to `lazytopper/`); not hacked around. Trunk after #190: `cfb3106`.

## Syllabus-correctness arc CLOSED (#186 RULER + #188 SWEEP) — gating guard GREEN
The full arc is now complete: verified → guard corrected (#186) → **content swept (#188)** → gating
`syllabusGuard` exits 0, `test:matrix:all` = **175/175 (incl. #19, previously red by design)**.
**#188 deleted the 93-item worklist** the corrected guard flagged: question banks Conversion of Solids
×46 (exemplar 42→19, ncert 24→14, pack2 50→37; canonical bank 6520→6474, exactly −46, spreads intact);
board-prep surfaces EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/competency/config/
trends/topics/topicHubContent + the tutor teach-contracts. Owner decision was DELETE (not retag);
blurbs/contracts were REWRITTEN to stay syllabus-accurate. `keyIdeas` is a fixed 4-tuple, so removed
tutor teach-steps were replaced with marked in-syllabus steps (`[content-sweep 2026-06-04]`) —
structurally required, caught by the prod build (`tsc -b`), not by `tsc --noEmit`. `syllabusGuard.ts`
and `predictionTypes.ts` were NOT touched (content conforms to the guard; schema frozen). Diff = exactly
11 files, all `lazytopper/src/**`. **Deferred follow-up (D31):** the `polynomials` tutor contract still
teaches the polynomial *division algorithm* (out of 2026-27 quadratic-only scope) — the surface scan
deliberately omits bare "Division Algorithm", so it is NOT flagged; left out of scope, tracked for a
future guard-phrase + sweep PR. Trunk after #188: `e0395fc`.

## Syllabus guard CORRECTED to official 2026-27 + EXTENDED (#186) — RULER done (history)
The syllabus RULER is now correct and trustworthy (verified against the live official CBSE 2026-27
Class X syllabus — Maths 041/241, Science 086, cbseacademic.nic.in; owner-signed-off
`report-syllabus-verification-2026-06-04.md`). #186 fixed 3 correctness bugs and extended scope:
- **Step Deviation un-banned** (it is IN the official Statistics scope — the prior ban wrongly
  stripped an examined method); **3 confirmed-OUT Maths items added** (Area of Triangle in Coord
  Geometry; Conversion of Solids; cubic zeroes–coefficient); **Evolution-section sub-topics banned
  while Heredity/Mendel/Sex-Determination are PRESERVED** (board-assessed; two-way test-asserted);
  Maths citation fixed 2025-26→2026-27.
- **Reproduction registry bug fixed (HIGH):** reproductive health / family planning / safe sex vs
  HIV-AIDS is IN-syllabus → moved into `cbse_scope_bullets` (was wrongly excluded). Formative-only
  (Periodic Classification, Evolution section, Motor/EMI/Generator) vs truly-deleted (Sources of
  Energy, Mgmt of Natural Resources) relabelled with explicit `category` tags.
- **Guard EXTENDED to 24 board-prep surfaces** (HPQ, mocks, worksheets, practice/daily-mix,
  exam-trends/topic metadata, filters/config, **tutor teach-contracts**) via a curated word-boundary
  phrase scan (`SURFACE_BANNED_PHRASES`) — bare generics (Evolution, Generator, Motor, …) deliberately
  excluded to avoid false positives on prose ("gas evolution") + code identifiers (`dailyMixGenerator`).
  Strictly-board-prep doctrine: formative-only + deleted topics excluded from EVERY surface INCLUDING
  the tutor. Tests 10→45 (per-surface-category, two-way preserved-term, precision). Two stale
  doctrine-locks corrected (registry-acceptance reproductive-health check inverted; opsAcceptanceGuard
  Block 4b made precise).
- At #186 the gating guard was **intentionally RED** on a **93-item sweep worklist** (banks: Conversion
  of Solids ×46; surfaces: EMI/Motor/Generator across predicted/HPQ/config/trends/topics/topicHubContent
  + the tutor teaching Euclid's lemma & evolution evidence) — matrix 174/175 (only #19 red by design).
  **That worklist was the spec for the CONTENT SWEEP, now DONE in #188** (see the arc-closed section at
  the top): all 93 deleted/rewritten, gating guard GREEN, matrix 175/175. D26 is fully closed.

## Responsive redesign (Option B) — FIRST convergence DONE (#184)
Exam Trends is the first surface converged under the LOCKED Option-B decision: ONE responsive
component (`src/pages/ExamTrendsRanked.tsx`) renders at every width (~360px → desktop) and replaces
BOTH twins (the old desktop card grid `DesktopExamTrendsPage.tsx` + the old mobile tier list
`app/ExamTrends.tsx`, both deleted). `App.tsx` `/exam-trends` no longer does the `isDesktop ?
<Desktop/> : <Mobile/>` split — it renders the one component at all widths (still `DesktopShell`-
wrapped ≥1024px via `isDesktopShellRoute`, reflows fluidly below). Locked ranked priority-list:
trend-colored marks-weight bars, "Open" → Topic Hub, "⋯" reveals Practice/Worksheet/Predicted/
Add-to-selection, Subject + Science-stream + Sort (Marks weight | Trend), multi-select tray. Design
grammar reused exactly; real data only (28 topics, both subjects, stream filter, honest trend tiers +
HPQ counts, no fabricated %); proof tag omitted (no real `proof` field). Gates green (tsc, build,
scope:guard --mode product, matrix 137/137). This sets the PATTERN for the remaining Option-B
surfaces (TopicHub, Check & Improve, Me/Progress, Worksheet). NOTE: the Exam Trends tiering/trend/
marks data is stale (D27) and must be re-derived fresh before the planned band redesign.

## Tutor teaching quality (RESOLVED on desktop — B2/#182, live-verified)
The concept_teach tutor now teaches in the owner-LOCKED style: answers the exact question
first (no Namaste/persona/flattery/filler-analogy openers, no "interactive above" narration);
stays strictly on the opened concept (no topic drift); organizes by marks with concrete board
examples; ends with exactly ONE step-marking follow-up offer. On "yes" it SOLVES ITS OWN
example with per-step `[½/1 mark]` CBSE step-marking — math spot-checked correct across both
subjects; plain-text notation (no LaTeX leak). General across subjects (Science conceptual is
not forced into a "prove it" offer). LIVE path = `server/prompts/promptLearn.cjs`
(`buildConversationalTeachSystemPrompt`) + the concept branch of `buildUserPrompt` in
`server/routes/mentorModeHandler.cjs` — NOT `promptTeachContract.cjs` (see DISCOVERIES D24).
Residual: occasional late analogy on a long first-teach message (~1/13 turns) — eval-set territory.

## Governance / gates
- scope:guard: **LIVE + monorepo-correct (#192)** — classifies `lazytopper/`-prefixed diffs correctly
  under `--mode product`; no longer false-FAILs every product edit (the path-frame bug that hit 3 PRs is
  fixed; `--relative` blind-spot fix rejected). NOTE: `git ls-files --others` is cwd-scoped, so **untracked**
  files *outside* `lazytopper/` are invisible to the guard (pre-existing; deliberately NOT widened — would
  false-FAIL on the untracked root `.claude/`; see OPEN_QUESTIONS D33). Was DEAD since `2081003`
  (a docs-cleanup chore) accidentally untracked `lazytopper/docs/project_memory/governance/
  repo_boundary_policy.json`, which two live scripts read; #176 restored it from history.
- `test:repo-boundary`: now RUNS again (4/5 checks pass). 1 pre-existing red:
  `vitest.config.ts` is tracked but matches no policy lane (`all_tracked_files_classified`)
  — backlog, deferred (see OPEN_QUESTIONS).
- LESSON (D23): a file-removal can silently break a live gate; `ci:smoke` runs only locally,
  NOT in CI, so the broken gate failed silently. Wiring `ci:smoke` into CI is the deeper
  fix (backlog).

## AI gateway status
- LIVE on LOCAL dev (non-stub): direct Gemini key in gitignored `lazytopper/server/.env`
  (`API_KEY` + `PORT=3001`); serverConfig auto-sets `AI_PROVIDER=gemini` + `STUB_MODE=false`.
  Boot proof: `Gemini: ON (gemini-2.5-flash) | Auth: direct-key`. Tutor (`/api/mentor`)
  and grader (`/api/check-solution`) both return real Gemini output locally.
- DARK in production until the Railway deploy (P0 ISSUE-009) + Clerk pk_live_ (P0 ISSUE-010).
- CONFIRMED 2026-06-02 (D22): testing the checker on the Vercel link returns "AI API request
  failed" — this is EXPECTED, NOT a bug. Vercel has no `/api/*` route to deploy to yet
  (ISSUE-009); AI features work ONLY on localhost (gateway up + `API_SERVER_PORT=3001`, per
  D19) until the Railway deploy.
- LOCAL DEV RUN: gateway = `npm run dev:gateway` (node server/index.cjs :3001); app =
  `API_SERVER_PORT=3001 npx vite` (:25246 → /app/). Both started SEPARATELY. See D19.

## Bank state
Total questions: ~6,318 (flat) / ~6,617 (incl. builders)
Authentic: 3,636 (58%) | AI-generated: 2,682 (42%)
Spreads: 332 (up from 266 pre-Sprint 1)
Tests: 137/137 PASS
PYQs: 760 total — all 4 main years complete
CBE Item Bank: 321 Qs (Maths 148 + Science 173)
CBSE Sample Papers (P5): 121 Qs (SP Maths 2022 + Science SQP 22-23 + OnBoard 2023)
CBSE Preboard SP1+SP2: 55 Qs (generated solutions, CBSE marking style)
Mojibake: 0 files affected
TopicKey orphans: 0
Filter system: ALL chips working
CBSE blueprint distribution: working (5-section parallel fetch)
COMPETENCY floor: gated by enforceCompetencyFloor flag
Render-test infra: Vitest 3.2.4 + Testing Library + jsdom (PR #160) — `npm test` in
  lazytopper/ runs src/**/*.test.tsx; 2 test files / 10 tests green (smoke + grammar);
  matchMedia polyfilled in src/test/setup.ts. Guard suite (137) unaffected.
Grammar primitives: PR #166 added src/components/grammar/ (Card, TileRow, Pill,
  SectionHeader, tokens, index) + the first real render test. TileRow reflows
  desktop↔mobile via a real @media(max-width:1023px) CSS rule (--lt-tile-cols var).
Mobile Home: PR #168 added src/pages/app/MobileHome.tsx (first page reflow) — the
  /browse cockpit now renders MobileHome below 1024px (isDesktop switch in App.tsx),
  stacking the 4 destinations via TileRow. Desktop DesktopHome render byte-identical.
  Shared firebase-free src/lib/desktop/homeDestinations.tsx (PRIMARY_CARDS + loginUrl)
  is the single source of truth for both Home variants. Vercel production deploy GREEN.
Mobile landing: PR #170 added src/pages/MobileWelcome.tsx — /welcome renders a
  swipe carousel (native CSS scroll-snap, 4 frozen v4 SVG cards) below 1024px
  (isDesktop switch in App.tsx). Desktop Welcome.tsx UNTOUCHED (zero diff). Sticky
  "Start free" → /browse (no gate); honest sub-line "7-day Premium trial — then free
  Basic, upgrade anytime." (never "then paid"). Vercel production deploy GREEN.
Mobile Home polish: PR #172 rebuilt src/pages/app/MobileHome.tsx to the owner-locked
  polish design (mobile_home_locked_final.html): illustrated gradient SVG icons per
  destination, orient-before-act order for new students, persistent per-row hints, and
  an inspiring Mistake-Intelligence panel with a clearly-labelled SAMPLE report + honest
  "Start free — find my reasons" CTA (real-data wiring on the firebase-free boundary;
  signed-in shows an honest empty state, never invented counts). BottomNav (App.tsx)
  recoloured to the light app grammar (white surface, soft border, green active /
  muted-slate inactive) and expanded 3→5 tabs (Home / Exam Trends / Practice / Check /
  Me) on canonical routes; visibility gate intact. theme-color #58cc02→navy #0f1b33
  (index.html) kills the green browser-chrome banner. Global public navbar suppressed on
  mobile /browse + /welcome (isMobileSelfChromedRoute, gated on !isDesktop) so each
  mobile page shows ONE locked-design brand bar — Search no longer on mobile Home
  (owner-approved; not re-added). Desktop byte-identical. Tests 19→32. Vercel production
  deploy GREEN.
Production build: GREEN. PR #162 added `exclude` to tsconfig.app.json so `tsc -b`
  (Vercel's `npm run build`) no longer compiles the dev-only test files. Vercel
  production deploy for the merge commit confirmed Ready/SUCCESS.
Dev tooling: PR #164 decommissioned the dead blackbox/tracker/pmem memory
  experiment (16 files: scripts + tools/pmem + tools/project-memory-blackbox-ext +
  blackbox.yml + 20 npm scripts). Repaired start:quick/start:safe to use the REAL
  `tsc -p tsconfig.app.json --noEmit` (killed the false-green bare `npx tsc --noEmit`).
  PRESERVED: .project_memory/ops/, docs/project_memory/, all scripts/ops/*,
  serverConfig.cjs. Vercel production deploy GREEN. Repo-wide refs to experiment: 0.

## Recent PRs (post-handoff backfill)
#152 — Handoff post-#150+#151
#153 — fix: filter UX redesign (student-language chips, pending/committed)
#154 — fix: source filter + chip constraints + ISSUE-006/007
#155 — fix: practice engine marks/section/competency/blueprint
#156 — docs: handoff post-#153+#154+#155
#157 — content: Sprint 1 CBSE CBE Item Bank + P5 Sample Papers (442 Qs)
#158 — content: CBSE Preboard SP1+SP2 generated solutions (55 Qs)
#159 — docs: handoff update post-#157+#158
#160 — chore: Vitest + Testing Library render-test infrastructure (tooling-only)
#161 — docs: handoff update post-#160
#162 — fix: exclude test files from production app tsconfig (Vercel green confirmed)
#163 — docs: handoff update post-#162
#164 — chore: decommission dead blackbox/tracker/pmem tooling + false-green tsc fix (Vercel green)
#165 — docs: handoff update post-#164
#166 — feat: shared responsive grammar primitives + first render test (Vercel green)
#167 — docs: handoff update post-#166
#168 — feat: mobile Home layout for /browse (reflow cockpit below 1024px) (Vercel green)
#169 — docs: handoff update post-#168
#170 — feat: mobile landing swipe carousel for /welcome (Vercel green)
#171 — docs: handoff update post-#170
#172 — feat: mobile Home polish + 5-tab light BottomNav + single brand bar <1024px (Vercel green)
#173 — docs: handoff update post-PR #172 (mobile Home polish; Vercel green)
#174 — fix: check-solution parse reliability (force JSON output + raise token cap; local-dev verified)
#175 — docs: handoff update post-PR #174 (check-solution parse fix; AI gateway live local; D19–D21)
#176 — fix: restore repo_boundary_policy.json (re-arm scope:guard + test:repo-boundary + ci:smoke)
#177 — docs: handoff update post-PR #176 (scope:guard re-armed; product decisions; D22–D23)
#178 — feat: tighten check-solution grading prompt (fix D21 over-classification; scenario-matrix measured; Vercel N/A — server-side)
#179 — docs: handoff update post-PR #178 (grading-prompt tightening; D21 resolved)
#181 — feat: wire concept tutor into desktop TopicHub (per-row "Learn this"; reuse ConceptTeachDrawer)
#182 — feat: tighten concept teach-prompt to LOCKED style (direct/no-fluff/on-concept; self-solved CBSE step-marking; live-verified)
#183 — docs: handoff update post-PR #182 (tutor visible + teaching LOCKED; pivot to responsive redesign)
#184 — feat: Exam Trends ranked-list responsive redesign (FIRST Option-B convergence; one component retires both twins; Vercel green)

## Parked / not-yet-merged branches
- **PR B (Part 1) — grading-prompt tightening — PARKED.** Committed on branch
  `feat/check-solution-grading-prompt` (`204ac7c`), NOT merged. Merges next, after this docs
  PR, once synced onto `1e9bd04`. (T4 accepted as Option 1 — documented boundary case; 3/19
  acceptance reds noted pre-existing/deferred.)

## Source breakdown

| Source | Authentic | Files | Auth status |
|---|---|---|---|
| NCERT | 636 | 26 *.ncert.ts | YES |
| Exemplar | 910 | 26 *.exemplar.ts | YES |
| PYQ (board) | 760 | 100 *.pyq*.ts | YES |
| SQP | 69 | various | YES |
| APQ | 215 | various | YES |
| Chapterwise | 549 | various | YES |
| CBE Item Bank | 321 | 26 *.cbe.ts | YES |
| P5 Sample Papers | 121 | 26 *.sp.ts | YES |
| Preboard SP1/SP2 | 55 | 13 *.preboard.ts | YES (generated) |
| AI-Pack (pack1/2/3) | — | various *.pack*.ts | NO |
| Synthetic (AR/Proof) | — | various | NO |

## Open P0 issues (must fix before launch)

| Issue | Fix | Effort |
|---|---|---|
| ISSUE-009: API gateway 404 in production | Railway deploy + vercel.json /api/* rewrite + VITE_API_BASE | HIGH |
| ISSUE-010: Clerk pk_test_ keys in production | Vercel env var change to pk_live_ | XS |

## Open P1 issues (before wide launch)

| Issue | Description | Effort |
|---|---|---|
| Practice session debrief | End-of-session results screen | M |
| PYQ 2019-20 extraction | After download from cbse.gov.in | M |
| GitHub Actions CI | Run 6 validations on every PR | S |
| practiceFilterGuard.test.ts | Tier 3 test for competency floor | S |
| Case-Based "Easy" re-tag | Find-replace fix | XS |
| TopicKey cleanup | 51 AI-Pack Title Case keys | XS |
| check-solution eval set | 40-60 graded answers as launch gate | M |
| ~~D21: check-solution OVER-classifies as conceptual~~ RESOLVED (#178) | Grading prompt tightened + measured 6/9→8/9 on T1–T9; sign-misread now SILLY, propagated errors single-root-cause, missing→null, unbalanced→presentation. T4 = accepted boundary case (see DECISION_LOG). | DONE |
| Rate limiting on API gateway | Bundle with gateway PR | XS |
| Repo-wide solutionSteps step-mark audit | Older questions missing [N mark] prefix | M |
| AR/Section/Marks tagging audit | Some AR questions tagged as Section D 5mk | S |

## Open P2 issues (post-launch)

CFPQ OCR extraction (300 image-only Qs) | K2D Mistake Intelligence aggregation |
Pack regeneration with Claude | TutorDrawerV2 | isPYQ backfill |
Diagram SVG generation (116 tagged questions) | PYQ 2021-22 Term II adaptation |
PYQ 2018-19 (heavy banned topic overlap) | Sentry/error monitoring backend

## Next safe actions (in order)

1. **CONTENT SWEEP (HIGH, NEXT)** — clean the 93-item worklist surfaced by the corrected guard
   (banks: Conversion of Solids ×46; surfaces: EMI/Motor/Generator + tutor teaching Euclid's lemma &
   evolution evidence). Turns the gating syllabusGuard + matrix #19 GREEN. Completes D26.
2. Re-derive Exam Trends priorities FRESH (tier+trend+marks) [D27]; recheck HPQ counts → then the
   Exam Trends band redesign (Must-crack / High-ROI / Good-to-do).
3. Then the other Option-B surfaces (TopicHub + Formula/Notes, Check & Improve, Me/Progress, Worksheet).
4. API gateway Railway deploy with rate limiting bundled (P0); Clerk pk_live_ switch (P0).
5. check-solution eval set (launch gate, P1); GitHub Actions CI + practiceFilterGuard.test.ts (P1).
6. Case-Based "Easy" re-tag (XS); repo-wide solutionSteps step-mark audit (M); AR/Section tagging audit (S).
7. Practice session debrief (P1); PYQ 2019-20 extraction (after download).

## Confirmed launch domain
lazytopper.in (owner-confirmed 2026-06-01 — NOT .app; earlier ".app" was wrong).
Verify DNS in Vercel before P0 gateway work starts.

## Owner clarifications (2026-06-01) — LOCKED
- Trial = ALL features for 7 days (full tutor + checker + everything), then reverts to
  free Basic. Gate is trial-not-paywall during those 7 days. No client-side premium/trial
  activation (doctrine unchanged): trial state comes from server/admin only.
- Fully responsive across ALL screen sizes — one fluid layout adapts at every width, NOT
  a 1024px desktop/mobile twin switch. This is more work than porting a mobile twin and is
  the target for the redesign (Track A).
- PR numbering follows git (next sequential, #175+). "PR-1..8" in the Track A breakdown are
  logical labels — map them to real git numbers.
- Two-track build, LOCKED: Track A (design/UI — fluid responsive redesign) + Track B
  (content: interactives via Claude, proofs, formula sheets, pre-generated PDFs) with
  robust content QA. Source specs are owner/architect-held (LazyTopper_Learn_Flow_Spec_
  LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md) — NOT yet committed to this repo.

## Operating model unchanged
Chetan = owner/merger | Claude chat = architect/planner | Claude Code = executor
Co-Authored-By: Claude Opus 4.8 (1M context)
