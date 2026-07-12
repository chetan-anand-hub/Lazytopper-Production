# LazyTopper â€” Current State

## [CURRENT] #384 + #385 merged -- bank-expansion Batch 2 + 3 -- trunk `ce34b3e`

**Post-merge code trunk: `ce34b3e` (squash of #385), on top of #384 `63c6b04`.** Re-derive the tip after this docs PR merges.

**Bank-expansion lane — 3 batches shipped. Assembled bank 7,084 -> 7,262.**
- **#384 (`63c6b04`) — Batch 2, real-numbers CORRECTIVE +12** (225 -> 237). Fixed Batch 1's A/B/C under-extraction: an EXHAUSTIVE per-source re-sweep (11 kept; 2 wrong-answer source items dropped) + a D/E distinct-scenario EXHAUSTION AUDIT that inventoried 27 methods and proved the real-numbers scarce ceiling is ~24 distinct method-classes (only perfect-cube FTA was missing → authored). real-numbers scarce bands genuinely cap below 50 by syllabus (no Euclid/decimal/CRT) — honest ceiling, not a shortfall.
- **#385 (`ce34b3e`) — Batch 3, life-processes +136** (354 -> 490; first SCIENCE batch). **Confirms the exhaustive-sweep fix works:** extract-max yielded 75 net-new A/B/C vs saturated real-numbers' ~23 (real reservoir depth). Scarce bands CLEAR the ≥50 distinct floor without padding: Section-D 31→53 (22 authored), case-based 15→54 (39 authored). 3 adversarial skeptics re-solved all 139 → 137 pass, 3 dropped.
- **STANDING DISCIPLINE [FU-BANK-EXPANSION-SOURCE-SWEEP]:** every batch EXHAUSTIVELY sweeps ALL sources (whole Content folder + all `diff\cbse-papers`) with a per-source candidate/DUP/borderline/NET-NEW table before concluding a count. Band-scarcity floor: A/B/C extract-max (no floor); scarce E/D/proofs ≥50 GENUINELY DISTINCT + honest-stop.
- **Manifest for trusted-student QA:** `docs/bank-expansion-review-queue.md` (all 178 ids across the 3 batches). **Surfaces stay GATED until student QA.** Provenance: authored → `AI_GENERATED_PACK_SOURCES`; extracted (reconstructed solutions) → `AI_GENERATED_SOLUTION_IDS`.
- **FIGURE-PENDING SAFEGUARD (new doctrine):** a question un-answerable without a PROVIDED figure ("identify structure X") must NOT ship answer-less → ship the real figure or add to `WITHHELD_QUESTION_IDS`. Text-answerable + figure-enriched may ship. Running figure-pending list in `handoff/BANK_EXPANSION_LANE_STATE.md`. Batch 3's 2 flagged items (LPSD-009 respiratory, LPSD-018 heart) classified ENRICHMENT (text-answerable; "draw a labelled diagram" is student-produced, not provided-figure-dependent) — ship as-is, reference figure later.
- **Lane state:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **NEXT:** another Science topic (our-environment / how-do-organisms-reproduce — large reservoirs) with the same exhaustive per-source-table discipline.

## #381 merged -- bank-expansion Batch 1 (real-numbers +30) -- trunk `3866a94`

**Post-merge code trunk: `3866a94` (squash of #381), on top of #380 `5bd148c`.** Re-derive the tip after this docs PR merges.

**Bank-expansion lane OPENED + Batch 1 shipped.** Assembled bank **7,084 -> 7,114** (real-numbers 195 -> 225).
- **Band-scarcity floor is ACTIVE** (owner-set, replaced the original flat >=50): Sections A/B/C = EXTRACT-MAX (no floor); scarce categories (Section E case-based, Section D long, PROOF-type) = floor >=50 GENUINELY DISTINCT with HONEST STOP + hard anti-redundancy (distinct differs in more than numbers). Flat floor forces redundancy on saturated chapters (proven in Batch 1: 15 authored real-numbers items were outright bank-dups).
- **Batch 1 = real-numbers +30:** 10 extract A/B/C (authentic questions, solutions decoupled -> pending QA) + 8 scarce-D (6 long + 2 proofs) + 12 scarce-E case-based. Skeptic re-solved all 33, dropped 3; my gate + assembled runtime proof (7114/0-dup/0-orphan/26-of-26) + root matrix 181/181 + ops matrix + mojibake + scope:guard all green; CI (quality-gate + lane-overlap) green. Honest-stop: case ~25, long ~21 (chapter saturated).
- **Manifest for trusted-student QA:** `docs/bank-expansion-review-queue.md` (30 ids). **Surfaces stay GATED until student QA.** Provenance: authored -> `AI_GENERATED_PACK_SOURCES`; extract solutions -> `AI_GENERATED_SOLUTION_IDS`.
- **Lane state:** `handoff/BANK_EXPANSION_LANE_STATE.md`. **CORRECTION carried forward:** Batch 1 A/B/C was UNDER-EXTRACTED (only 2 source files). Every future batch MUST exhaustively sweep ALL sources (whole Content folder + all of diff\cbse-papers) with a per-source candidate/DUP/borderline/NET-NEW table before concluding a net-new count. `[FU-BANK-EXPANSION-SOURCE-SWEEP]`. A corrective real-numbers A/B/C re-sweep is queued as a small follow-up batch.

## #380 merged -- CT is full-screen distraction-free + the scorecard derives a by-CONCEPT lens -- trunk `5bd148c`

**Post-merge code trunk: `5bd148c` (squash of #380), on top of #374 `e54ab8c`.** Two owner-dispatched Chapter-Test fast-follows shipped (byte-review clean, owner-merged, no self-merge). Re-derive the tip after this docs PR merges.

- **Part A -- by-CONCEPT (subtopic) scorecard lens ([FU-CT-CONCEPT-LENS] CLOSED).** The CT full scorecard now shows **By section -> By concept -> Where your marks went**. New pure `deriveChapterTestConceptLens(response, questions)` in `scorecardVariants.ts` joins each graded question `qNumber -> paper questionId -> canonical subtopic`, aggregates awarded/total per subtopic, sorts by marks lost (ALL resolved concepts -- owner decision, over loss-only). **DERIVED at render, never persisted; `sectionBreakdown` stays null** (the #374 D3 discipline). Anti-fabrication: an unresolvable subtopic counts in the hero total but forms NO concept row; null when none resolve (shell omits). The grade response is keyed by `qNumber` (NOT `questionId`), so the fn takes the id-bearing questions as a 2nd arg (verified against `aiClient.ts`). `canonicalQuestionBank` is imported READ-ONLY (no `src/data` change). Wired live-full (`paper.questions`) + a guarded stored-reopen (1:1 `questionIds`<->`results` length check).
- **Part B/C -- CT is chrome-less full-screen at both widths ([FU-CT-HEADER-UNIFORMITY] CLOSED, route-scoped).** New `isBareFullScreenRoute` in `App.tsx` suppresses the legacy dark header AND (owner-authorized) the mobile BottomNav on `/chapter-test`, both widths, through one helper. **Recon correction:** the chrome on the test was the **NON-shell legacy navbar**, not `DesktopShell` -- so `DesktopShell.tsx` is byte-unchanged and the fix is the owner-authorized bare-route exception in `App.tsx` only. CT already rendered a full-bleed `min-h-screen` surface, so no structural CT change was needed.
- **App.tsx narrow change (authorized).** Exactly: the `isBareFullScreenRoute` helper + `&& !isBareFullScreen` on the legacy-header render + `isBareFullScreenRoute(current)` in the BottomNav gate (the owner-approved 2nd branch) + one compute line. No route table, no other branch. Byte-unchanged sacred files: grader (`checkSolution.cjs`), worksheet gen/grade, `sessionRecords`, `chapterTestBlueprint`, `worksheetSessionStore`, `DesktopShell.tsx`, `firestore.rules`, `src/data/**` (imported read-only).
- **Gates -- ALL GREEN.** Local: tsc (`tsconfig.app.json`), mojibake, scope:guard `--mode product`, root scripts `test:matrix:all` **181/181**, lazytopper `test:matrix:all` (incl. topickey runtime 7084/0-dup/0-orphan), `git diff --check`. CI: **quality-gate PASS (1m38s)** + **lane-overlap PASS** (disjoint from the notes/`src/data` lanes) + Vercel preview. 6 files (+324/-9); fresh worktree off the re-derived trunk `ebc95d7`. New vitest added (`scorecardVariants` concept-lens + `isBareFullScreenRoute` predicate/behaviour) -- runs in Codespaces/CI, not the Windows-local gate.
- **The Chapter Test scorecard is now section + concept + four-type, and the test surface is chrome-less full-screen. CT can be flipped live at `MockViewGate` whenever the owner is satisfied** -- the two fast-follows the #374 handoff named as pre-flip work are done. New open item **[FU-RETIRE-OLD-GLOBAL-HEADER]** (product-wide legacy-header retirement -- deliberate, later; `isBareFullScreenRoute` is prefix-structured so `/full-mock` joins with one entry). Report: `Desktop\diff\report-ct-concept-lens-fullscreen-2026-07-12.md`.

## [PREVIOUS] Chapter Test BUILT to the locked spec -- trunk `e54ab8c` (#374), owner live-verified

**Post-merge code trunk: `e54ab8c` (squash of #374).** The Chapter Test surface is BUILT and owner live-verified (two-phase grading; numbered `CT-{S}-{TOPIC}-{NN}`; navigator / timer / topic-scoped history all working) -- **behind `MockViewGate`** (owner flips it live at launch). This docs PR advances trunk by one commit once merged; re-derive the tip after.

- **CHAPTER TEST = BUILT (#374, `e54ab8c`).** The LEGACY practice-set `ChapterTestPage` (`generatePracticeSet` + `Math.random` draw + self-marking + `masteryLevelService` -- all ABANDONED concepts, D-PROG-10 + a past fabrication finding) is **fully REPLACED**. `App.tsx` route/entry untouched.
  - **Sourcing (D1, native -- no fabricated field):** the mockPaperEngine adapter would have had to invent `PredictedQuestion.kind` (no canonical source), so sourcing is NATIVE via `bankQuery.selectBankQuestions` + a CBSE A--D blueprint drawer (`components/chaptertest/chapterTestBlueprint.ts`); exact numeric mark bands (not the fused buckets), fresh shuffle per test (§8). No adapter exists -> nothing laundered.
  - **Grading (two-phase, §5):** Section A objective auto-graded **0-or-FULL** on submit (PR-348 invariant, never fractional); Sections B--D subjective via answer-sheet **upload** through the SHARED worksheet grader (`gradeWorksheet`/`checkSolution.cjs` **byte-unchanged**). New `services/chapterTestGradeService.ts` (D4); `worksheetGradeService.ts` byte-unchanged.
  - **Scorecard:** the Universal `<ResultsScorecard>` chapter-test variant **flipped live** from `deferred:true` -- partial (objective only, **NO** four-type/MI) -> full (total + BY-SECTION A--D lens + four-type from written). The A--D lens is **DERIVED** at render (D3) via the shipped #353 `sectionFromTotalMarks` proxy; `sectionBreakdown` **stays null** for chapter-test (never denormalised).
  - **Records:** `sessionRecords` surface `"chapter-test"` + perQuestion payload; durable `CT-{S}-{TOPIC}-{NN}` / `#NN` (additive to `sessionRecords.ts`, reuses the existing `sessionRecords/{uid}` collection + rule -> **no `firestore.rules` change**). Topic-scoped history rail (read-only reopen), pre-submit confirm gating the score reveal, navigator (4 states), per-question flag mirrored live, autosave, downloads (test / graded / step-marked solution key with **variable authored** per-step marks). In-memory `PersistedWorksheet` (D2) drives the shared print docs carrying the CT- code; never saved to the worksheet store. ONE responsive component, class-driven CSS (no inline style, §7), no `useIsDesktop` twin.
  - **Gate on the surface:** behind `MockViewGate` -- owner flips it live at launch. The scorecard is section + four-type today; **CONCEPT (subtopic) lens + header-uniformity are the pending fast-follow** before the gate flips ([FU-CT-CONCEPT-LENS], [FU-CT-HEADER-UNIFORMITY]).
  - Cofounder byte-reviewed (adapter fabricates nothing -- there is none; `sectionBreakdown` null; mastery/self-mark gone from the CT flow; `worksheetGradeService`/`checkSolution.cjs`/`App.tsx`/`firestore.rules` byte-identical) + owner live-verified + squash-merged; **no self-merge**. One correctness bug caught+fixed pre-push (timer auto-submit closed over stale answers -> live ref). Report `Desktop\diff\report-chaptertest-build-2026-07-12.md`.
- **Merge spine (authoritative):** ... #375 `8fb1ad6` · #376 `57b76df`->merged · **#374 `e54ab8c`** (the CT build; owner-squash-merged, no self-merge).
- **NEW FUs:** [FU-CT-CONCEPT-LENS] (subtopic-level weak-area breakdown, FM-parity -- `subtopic` IS on `CanonicalQuestion`, derivable), [FU-CT-HEADER-UNIFORMITY] (the DesktopShell GLOBAL header on the full-screen test -- forbidden-file; owner decides global-restyle vs chrome-less test), [FU-CT-REOPEN-DOWNLOAD] (graded/solution downloads on a history reopen need paper reconstruction from `questionIds`), [FU-CT-CODE-TOKEN] (CT code reuses `topicAbbr` = `CT-M-RN-02` for cross-surface consistency; the mockup's illustrative `REALNO` is not matched by design).

## [MERGED] Notes fan-out COMPLETE + NCERT click-through LIVE -- trunk `8fb1ad6` (#375); Part-A ledger PR #376 in review

**Post-merge code trunk: `8fb1ad6` (#375).** The docs were stale since #363; this section back-fills #364 -> #375 + the post-#375 hosting infra. Full blow-by-blow in `SESSION_LOG.md` (2026-07-12 catch-up entry); merge SHAs listed below per [FU-STATE-BOARD-SUMMARY-ONLY] (the machine `ledger/MERGE_LEDGER.md` is summary-only).

- **NOTES SURFACE = COMPLETE.** All **26 canonical topics** are specced + independently audited (batches #365 / #368 / #370 / #371 / #372; docs #369 / #373), and the clickable NCERT-page cites are **LIVE and owner-verified**. `Chemical Reactions` (#365) is the LOCKED chemistry exemplar; the chemistry conformance mapping gates on it (floors tightened 5/3/1/1/2 -> 7/4/3/2/3 at #368). Syllabus trims held throughout (Heredity evolution-trimmed; Magnetic Effects motor/generator-trimmed; Triangles no Pythagoras/Areas-of-Similar; no cross-multiplication; no area-by-coordinates).
- **NCERT click-through LIVE.** #375 (`ncertPdfOffsets.ts` + `NcertPageModal` `#page` translation) makes the note's `p.N` cite resolve to the correct page WITHIN each per-chapter PDF (`pdf_page = ncert_page - k`, clamp >=1; empirical per-chapter `k` verified against every cite). **POST-#375 infra (owner, no PR):** 26 chapter PDFs uploaded to `ncert/{subject}/ch{N}.pdf` (bucket `lazzyy-topper.firebasestorage.app`) + `ncert/` public-read rule published + bucket CORS (origin `*`, GET/HEAD). Owner-verified: Trigonometry p.114 and Heredity p.129 open the exact printed page.
- **Part A of the current task -- [FU-LEDGER-CLICKABLE-CITES] PR #376 IN REVIEW (product; NOT self-merged).** `feat/notes-ledger-clickable-cites` (`57b76df`): the Source-Ledger `p.N` numbers are now clickable, reusing the SAME `CiteLine`/`NcertPageModal` path (new `LedgerSource` parses `p.N` + `Ch N`, links only a real in-this-chapter NCERT page). 470/474 rows clickable, 4 correctly plain; page ranges link to the first page; display byte-unchanged. 1 file (`Note.tsx`); no spec/schema/grader change; `validate_spec.py --all` VALID; CI green (quality-gate + lane-overlap). Awaiting owner merge.
- **COORDINATION AUTOMATION LIVE (#366, `b920440`).** lane-overlap guard (REQUIRED check -- overlapping PRs go red, must sequence) + state-board ledger (-> `ledger/MERGE_LEDGER.md`) + CODEOWNERS. GitHub ruleset "trunk-protection" ACTIVE: required checks `quality-gate` + `lane-overlap`, require-branches-up-to-date, block force-push, **required approvals = 0 BY DESIGN** (GitHub forbids PR-author self-approval; owner is sole code-owner AND author; mechanical checks + the independent auditor carry review -- do NOT re-enable), repo-admin on the bypass list.
- **Merge spine (authoritative record):** #364 `64ba82d` · #365 `fd70a4f` · #366 `b920440` · #368 `308be87` · #369 `791ef7a` · #370 `cbc561c` · #371 `0a2f677` · #372 `8c529ff` · #373 `64b0698` · #375 `8fb1ad6` (all owner-squash-merged, no self-merge). Interleaved owner direct-push-to-trunk docs(skill) commits: `801371f`, `f2934e6`, `6f858b2` (skill/coordination refinements, within the owner-only direct-push scope).
- **RESOLVED FUs:** [FU-NOTES-NCERT-PDF-HOSTING], [FU-CHEMISTRY-EXEMPLAR-WIRE], [FU-SOLO-OWNER-APPROVAL], [FU-COORD-LEDGER-IN-HANDOFF]. **NEW FUs:** [FU-LEDGER-CLICKABLE-CITES] (#376), [FU-STATE-BOARD-SUMMARY-ONLY] (`github-actions[bot]` not selectable in the ruleset bypass -> state-board push to trunk blocked -> ledger auto-append is summary-only; the human narrative carries the record).
- **IN PROGRESS (not merged):** **Chapter Test build** -- PR open, rebuilds the legacy `ChapterTestPage` (deleted `generatePracticeSet`/`Math.random`/self-mark/`masteryLevelService`) to the locked spec (mockPaperEngine+canonicalBank adapter D1, two-phase AI grading, chapter-test `<ResultsScorecard>` variant D3, `sessionRecords` `"chapter-test"` + `CT-{subj}-{TOPIC}-{NN}`, new `chapterTestGradeService.ts` D4); awaiting cofounder byte-review + owner live-verify; file-disjoint from notes. **Bank extraction** -- Pass-1 = **2,070 net-new** vs the 7,084 bank (2,005 non-case w/ official solutions + 65 case-based); **case-based is an AUTHORING lane (Z3), max ~8/topic, NOT extraction**; Maths near-exhausted (356), Science rich (1,649); Pass-2 Content-folder audit RUNNING; depth-floor decision pending Pass-2.

## [MERGED] P0 Topic-Key Root Cure -- REBUILD (#363, trunk `6ecf15f`) -- OWNER LIVE-VERIFIED

**Post-merge code trunk: `6ecf15f` (squash of #363), on top of #362 `caaf205`.** Irreducible one-commit lag: this docs PR advances trunk by one commit once it merges, so the SHA that shipped the cure is `6ecf15f` (re-derive the new tip after this docs PR lands). Owner independently confirmed the migrated bank (7084 served / 0 dup / 0 orphan / 26 canonical keys), the topicKey-only diff (every changed line a topicKey), and the dual-style guard now wired into the matrix.

- **[FU-TOPICKEY-UNIVERSAL] (P0) -- CLOSED.** One product, one topic key. C1 (resolve everywhere, read+write) was already on trunk; this PR shipped **C2 (data migration)** + **C3 (guards + authoritative runtime proof)**. Every served question now carries exactly one canonical `topics.ts` slug.
- **What shipped.** C2 rewrote **2,514 topicKey literals across 52 files** (both object styles `topicKey:` and `"topicKey":`, the triangles factory literal, AND 26 inline questions in `canonicalQuestionBank.ts`) -- values only, proven lossless (before==after 7084/7084, id set identical, 0 objects changed in any field except topicKey, 0 wrong targets). C3 added a **dual-style Guard A** (the blind spot that broke the prior attempt -- a `\btopicKey:` regex silently skipped 124 JSON-style files / 1,912 Q -- is now a standing CI gate), an **authoritative import-based runtime proof** (transpiles + imports the assembled bank; asserts 0 orphan / 0 dup / a collapse floor, never a hardcoded count), a dual-style before/after harness, resolver aliases for the 3 owner-approved singletons, and a Codespaces vitest proof.
- **The 4 previously-zeroed Science chapters now return questions** -- Chemical Reactions, Acids-Bases-Salts, Metals-Non-Metals, Reproduction (each returned 0 pre-cure) -- owner live-verified. Circles != Areas Related to Circles; Light != Human-Eye stay disjoint pools.
- **Gates.** Local (tsc, mojibake, scope, root 181/181, lazytopper ops matrix incl. the new guard + runtime proof, diff-check) + **CI quality-gate GREEN** (linux build + ops matrix) + Codespaces vitest green. Rebased onto the post-#362 base (`caaf205`) with a byte-identical substantive diff before merge.
- **Two owner-RATIFIED scope items.** (1) Migrating the 26 inline aggregator questions exceeded 3A's "questionBanks-only" -- unavoidable for 0-orphans, since `canonicalQuestionBank.ts` holds live served data (not predicted*/shared-data) and section 6 authorises the data commit to write src/data -> tracked by [FU-AGGREGATOR-INLINE-QUESTIONS]. (2) The single C3 amend (a guard-honesty fix from adversarial review) kept the three-commit shape.
- Report: `Desktop\diff\report-topickey-REBUILD-2026-07-11.md`; authoritative depth census (per-topic x section x mark-band over 7084): `Desktop\diff\topickey-depth-census-2026-07-11.md`.

Last updated: 2026-07-10 (post-PR #360 — **Worksheet: scope DERIVED from the topic selection + MI 2c copy MERGED** (squash `b096a8a`): the small dispatched follow-up to #357's live-verify. Scope is no longer an independent control — `selectedTopics[]` + `allTopics` are the single source of truth, and `scope`/`singleTopic`/`multiTopics` are **derived views** with stable array refs [module-level `EMPTY_TOPICS` when not multi-topic] so every downstream consumer stayed untouched — only the setters + picker UI changed. `scope = allTopics ? full-subject : selectedTopics.length >= 2 ? multi-topic : topic`. The three-way Scope segmented control + the topic dropdown + the separate multi/full chip lists were replaced by ONE unified topic picker with an "All topics" toggle and an honest derived label [`Topics — 2 selected · multi-topic`]: **ticking topics IS the scope**, so no ticked topic can be silently discarded — the #357 live-verify defect [the in-app tick never called `setScope`, so `parseEntryContext` built from `validMulti[0]` and dropped the rest]. New handlers `toggleTopic`/`addTopic`/`focusSingleTopic`/`toggleAllTopics`; catalogue-validity effect rewritten onto `selectedTopics` [no-op on mount; rescues an in-app subject/stream switch; never guesses at entry]; URL sync unchanged and round-trips. **MI state 2c reworded** to the locked copy [FU-WS-MI-COPY] — wording only, same state fires, remedy button unchanged. Two `// TODO(P0-topickey)` markers left on the raw `q.topicKey === t.key` compares for the P0 root cure — NOT fixed here. `worksheetMiSelector.ts` + `worksheetModel.ts` are **byte-identical to trunk** [the #357 ranking/floor/cap/availability logic left alone]. **2 files** [`WorksheetGenerator.tsx` + its unit test]; gates GREEN (tsc; mojibake; scope product; root **181/181**; lazytopper ops 6/6; diff-check) + **vitest 18/18** [ran on Windows]; `vite build` linux-CI-gated. **4-lens adversarial review** [React-state/referential-stability · MI honest-state machine · scope-discipline · edge-cases] with per-finding verification → **0 findings**. Branch cut from `6202d90` — pre the pnpm pin `581b0dd` + the #356/#359 merges — verified a safe stale base [its two files untouched by those; frozen install failed → `--no-frozen-lockfile` + restore lockfile], GitHub merged with no conflict. Owner live-verified + squash-merged **#360 → `b096a8a`; no self-merge**. **The worksheet builder is now COMPLETE** — context-aware entry, derived scope, scope-relative MI with within-topic section skew, history overlay, pending banner, code-bearing PDF filenames, 360px verified. **Closes [FU-WS-SCOPE-DERIVE] + [FU-WS-MI-COPY]**; the P0 **[FU-TOPICKEY-UNIVERSAL]** root cure is dispatched separately to a fresh agent [full diagnosis carried in `OPEN_QUESTIONS_AND_FOLLOWUPS.md` so it is inherited from the repo, not chat]. Report: `Desktop\diff\report-worksheet-scope-derive-2026-07-10.md`.) Previously (post-PR #356 — **Notes v1.3: visible mindmap TREE by default + full-screen note modal MERGED** (squash `629457e`): the dispatched v1.3 follow-up to #345 (notes v1.2), owner live-verified (mindmap reads as a tree; note opens near-full-screen; **360px passed on a real device**). **⚠️ Ground-truth correction — the brief's premise was WRONG:** it claimed the branches "render COLLAPSED (5 flat closed rows)", but all three specs (life-processes/light/quadratic) are **depth-2** mindmaps already FULLY EXPANDED at the existing `useState(depth <= 1)` — no branch ever rendered a closed caret (leaves carry no caret). The real defect was **visual legibility** (~24 near-identical full-width cards at 16px indent don't read as a branching tree), so the correct open-state was PRESERVED and the fix is a VISUAL overhaul — the JS default is unchanged in the diff. **FIX 1:** each depth-1 branch seeds ONE `--mm-accent` CSS var that drives its node edge + child rail + connector elbows, with a clear root › branch › leaf weight; kept the v1.2 responsive win (indentation capped ≤380px, `mm-scroll` `overflow-x:hidden`, labels wrap → no horizontal scroll/overlap; NOT a revert to the old fixed d3 canvas). **FIX 2:** `NoteModal` opens a 92vw × 92vh sheet (capped 1280px for readable line length) on desktop, full-screen on mobile; `<Note>` internals + all close affordances (✕/Escape/dim-click), body-scroll-lock and focus-restore unchanged — sizing only. **3 files** — `NoteMindmapTree.tsx` + `NoteModal.tsx` + the `.lt-note__mm-*` block inside `Note.tsx`'s scoped `NOTE_CSS` (**CSS-only**; no `<Note>` render logic / specs / grader / `src/data` / forbidden). Gates GREEN (tsc; mojibake; scope product; `validate_spec.py --all` VALID×3; root **181/181**; lazytopper ops 6/6; diff-check); `vite build` linux-CI-gated (Windows-unrunnable). Owner live-verified + squash-merged **#356 → `629457e`; no self-merge**. **Notes template COMPLETE → the ~30-chapter notes scaling is now UNBLOCKED (template locked), PARKED pending owner GO to the Fable notes content lane.** Resolves the v1.3 items (mindmap default-visible + full-screen modal); **[FU-MOBILE-VERIFY-GAP] first real pass CLOSED** — the static 360px audit was confirmed by the owner on a real viewport (doctrine stands: every surface's live-verify includes a 360px check). New **[FU-PNPM-PACKAGEMANAGER-PIN]** (supersedes gotcha D42): a fresh worktree's `--frozen-lockfile` install fails `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` (overrides drift; Corepack falls back to whatever pnpm is on PATH) → used `--no-frozen-lockfile` + `git checkout -- pnpm-lock.yaml`; tsc via `./node_modules/.bin/tsc`. Report: `Desktop\diff\report-notes-v13-2026-07-10.md`.) Previously (post-PR #357 — **Worksheet CONTEXT-AWARE ENTRY + multi-topic MI aggregate + preview/switch/360px MERGED** (squash `aa7e778`): the dispatched follow-up PR for the six owner-found FUs from #353 live-verify. **FIX-1 (the invariant):** the builder NEVER invents a topic — it reads `scope/subject/stream/topic/topics` from the URL (single source of truth; extends the existing `buildDesktopWorksheetPath` idiom), validates every key against `topics.ts`, seeds state from it, **DELETES the `topics[0]` entry fallback**, and **redirects ONCE to `/practice-hub`** when no valid subject+topic is present; a `replace`-only URL-sync keeps reload/share honest. **Recon flip: the desktop hub ALREADY passed the params via `buildDesktopWorksheetPath`/`addScope` — the bug was the builder ignoring them, so App.tsx was NEVER needed** (route renders `<WorksheetGenerator/>` with no props). **FIX-3 (multi-topic MI aggregate):** new `rankedInScopeWeakTopics` (selector) + `allocateMiCounts` (model) — a scope-relative ranked weak set with marks-lost weights → proportional between-topic split with a **FLOOR** (a chosen topic is never dropped; a zero-MI topic keeps its share), a **CAP** (owner decision: **50% at N≥3, ~60% at 2** so the owner-verified 60/40 from `MI_BOOST=1.5` is preserved), an **AVAILABILITY gate**, and **per-topic level-2 section skew** stacked on top (new `topicSectionBoosts` on the plan). `allocateCounts`/`MI_BOOST` **byte-untouched**; single-topic path identical. Honest counts: enrichment count AND named topics are **drawn-gated** from the real candidate set. **FIX-4/5/6:** sticky bar + its CSS removed (and the mobile @media that HID the hero Preview un-hidden → mobile keeps a CTA); accessible `role="switch"` toggle replaces both checkboxes; 360px reflow (full-width stacked hero/drawer/preview actions, chip abbreviation). **D1:** Home Worksheets card → `/practice-hub` (destination-only). **8 files** — 7 in `components/worksheet/` + `lib/desktop/homeDestinations.tsx`; App.tsx + all forbidden untouched. Local gates GREEN (tsc; mojibake; scope product; root **181/181**; lazytopper ops 6/6; diff-check) + **CI quality-gate GREEN** (linux build 1m18s); **vitest NOT runnable on Windows (`@rollup/rollup-win32-x64-msvc` stripped) → Codespaces**. **6-dim adversarial review** (allocation math / entry-routing / honesty / a11y-css / tests / regressions): 5 dims 0-findings fully traced + **1 confirmed honesty finding FIXED** (the multi-topic "N of M target X&Y" callout named the full weak set even when a topic drew 0 questions → now `drawnWeakTopics`-gated, mirroring `drawnWeakSecs`). **Reasoned deviation from FIX-1.2:** KEPT the catalogue-validity reset effect (re-seeds topic on an IN-APP subject/stream switch; recon-proven a no-op at entry) — deleting it (the doc's literal instruction) breaks in-app subject switching. Owner live-verified + squash-merged **#357 → `aa7e778`; no self-merge**. **Closes [FU-WS-ENTRY-CONTEXT], [FU-WS-MULTITOPIC-MI-AGGREGATE], [FU-WS-PREVIEW-BUTTONS], [FU-WS-MI-SWITCH]; [FU-WS-MI-COPY] HALF-landed** (state 2a softened; state 2c "Your weak area is X, not {topic}" still pending → follow-up PR). New follow-ups from live-verify: **[FU-WS-SCOPE-DERIVE]** (ticking topics in Customise never calls `setScope` → scope stays `"topic"`, silently builds from `validMulti[0]` and discards the other ticked topics + short-circuits `enrichActive`; the URL path already promotes scope — owner-confirmed MI works correctly when the Scope control is set to multi/full), **[FU-TOPICKEY-UNIVERSAL] (P0)** (surfaces match RAW topic slugs → 4 Science chapters [chemical-reactions-equations, acids-bases-salts, metals-non-metals, reproduction ≈1,180 Qs] return ZERO; bank stores 51 distinct `topicKey` for ~26 chapters [25 Title-Case + 26 slug]; Chapter Test + Full Mock carry the same latent defect; `WorksheetGenerator.tsx` `q.topicKey === t.key` raw compare silently disables enrichment on Title-Case chapters; cure = Phase-1 resolve-everywhere read+write + CI guards, Phase-2 data consolidation [FU-BANK-TOPICKEY-NORMALISE]+[FU-MI-TOPICKEY-BACKFILL]; prior fixes failed for lack of a guard — do NOT attempt piecemeal). Product principle re-affirmed: **a student's selection is intent — if we cannot honour it, we say so; we never silently do something smaller** (three instances found in #357 live-verify). Report: the PR #357 description.) Previously (post-PR #353 — **Worksheet scope-relative MI + within-topic section enrichment + Preview affordance MERGED** (squash `f8c1536`): the dispatched follow-up to #349. The worksheet builder's Mistake-Intelligence is now **SCOPE-RELATIVE** — weakness resolved WITHIN the chosen scope via the new pure `worksheetMiSelector.ts` (`scopeHotspot` = weakest in-scope topic vs `globalHotspot` = weakest across the subject, used only to NAME the true weak area when the scope has none) — never one global hotspot compared to the scope. The single locked box is **SPLIT into its true causes**: a student WITH MI data now sees the real weak topic NAMED + a one-tap "Focus on / Add {topic}" remedy, never the false "grade a worksheet first" (no data / weak-area-elsewhere / this-topic-IS-the-weak-area / signed-out). **Within-topic section enrichment is LIVE** for single-topic scope — section derived from each mistake's `totalMarks` via the CBSE band proxy (1→A,2→B,3→C,4→E,5→D; a non-band value is an HONEST UNKNOWN → counts toward marks-lost but NO section, never fabricated); additive `orderPoolBySectionBoost` in `worksheetModel.ts` reuses the tested `allocateCounts`, capped at real per-section availability, gated on the real DRAWABLE pool (section present + spans >1 + draw doesn't exhaust the pool) so the toggle is **never a no-op**; the cross-topic `MI_BOOST` path is **byte-unchanged**; **NO schema change, no migration, no new writes** (`MistakeLogEntry` has no `questionId` → band proxy is this store's derivation; exact `questionIds`→`canonicalQuestionBank` join is the separate `SessionRecord` path → [FU-CI-SOLUTION-CACHE]). **FIX B** — desktop `position:sticky` Preview footer (in-column, no navy-sidebar overlap, below the history overlay z-900) + a Preview at the foot of the Customise drawer. **6 files, all `components/worksheet/`, zero forbidden/gated.** Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix 6/6; diff-check) + **CI quality-gate GREEN** (linux build 1m20s) + Vercel PASS; **vitest 41/41** (Codespaces/CI). **11-agent adversarial review** → 5 low findings, all fixed + independently re-verified SHIP (the real one: section-skew gated on the section FILTER not the drawable POOL → pool-aware gate + `drawnWeakSecs` callout + `skewHasHeadroom`). **⚠️ 8th stale-base catch** — local `base/approved-thru-437` was stale/pre-#349; re-derived `origin` `67a89d6` + isolated worktree. Owner live-verified + squash-merged **#353 → `f8c1536`; no self-merge**. Closes **[FU-MI-SCOPE-RELATIVE]** + **[FU-MI-ENRICH-WITHIN-TOPIC]** + **[FU-BUILDER-PREVIEW-AFFORDANCE]**. New follow-ups (owner findings surfaced in #353 live-verify — a dispatched-separately follow-up PR, NOT #353 regressions): **[FU-WS-ENTRY-CONTEXT]** (builder ignores the entry topic; `WorksheetGenerator()` takes no props, defaults to `topics[0]`), **[FU-WS-MULTITOPIC-MI-AGGREGATE]** (`weakestTopic()` names only ONE topic → multi-topic should aggregate across selected weak topics), **[FU-WS-PREVIEW-BUTTONS]** (3 Preview affordances render → keep hero+drawer-foot, DROP the sticky), **[FU-WS-MI-SWITCH]** (checkbox → accessible switch), **[FU-WS-MI-COPY]** (soften out-of-scope wording), **[FU-MOBILE-VERIFY-GAP]** (mobile ≤360px never mockup-designed or live-verified — DOCTRINE: every future mockup ships a mobile frame + every live-verify includes a 360px check). Report: `report-worksheet-mi-scope-relative-2026-07-09.md`.) Previously (post-PR #352 — **Objective ANSWER KEYS repaired MERGED** (squash `b9a7817`): the #348 deterministic objective-scoring guarantee now holds **across the bank, except 13 manifest rows**. Objective rows whose `q.answer` (the option TEXT) did not resolve against `q.options` were silently falling back to the model; **89 in-scope defects re-derived via an AST scanner using the grader's OWN `normaliseOption`/`resolveOptionIndex`/`isObjectiveType`** (not the estimated ~101) — **74 corrupt MCQ keys + 15 Assertion-Reason rows with no `options[]`**. **76 fixed** (61 corrupt MCQ keys — each question SOLVED, `q.answer` set to the EXACT text of the correct EXISTING option, never a new value; + 15 AR rows given the 4 standard CBSE `options[]`); **`correctOption` never introduced — the key stays `q.answer`**. **13 honestly manifested** in `docs/objective-answer-key-review-queue.md` (corrupted/duplicated options + figure-dependent — grader defers to the model there; real-paper lookup queue). Anti-fabrication held: nothing guessed; **two subagent "fixes" overridden back to the manifest** rather than accept plausible-but-unverified keys. Verified: 0 mis-resolutions; **61/76 corroborated by the row's original `finalAnswer` option-letter, 0 mismatches**; TS parse-diagnostics clean. **43 bank files + 1 manifest; only `q.answer` changed + AR `options[]` inserted; grader `server/routes/*` byte-untouched; no COMPLETION cell moved.** Built by 3 file-disjoint subagents; orchestrator applied 4 manual corrections + verified. **[FU-BANK-CORRUPT-KEYS] CLOSED** except the 13; new FUs **[FU-BANK-KEY-REVIEW-QUEUE]**, **[FU-SECTION-A-VSA-HALFMARK]** (99 Section-A written-answer rows are all `marks:1` → clamp 0/1, no live hole; accepted simplification), **[FU-BANK-GARBLED-DISPLAY-TEXT]**. Owner live-verified + squash-merged; no self-merge. Report `Desktop\diff\report-bank-corrupt-keys-2026-07-09.md`.) Previously (post-PR #349 — **Worksheet BUILDER redesign MERGED** (squash `b4f2162`): the worksheet BUILD view is now on the locked "A · Smart default" design — a smart-default HERO (`{mode} · {topic}` + a REAL exact chip line: count · sections · difficulty · marks, NOT "≈") → primary **Preview worksheet →**; ALL prior controls (subject/stream/scope/topic/build-mode/advanced sections+difficulty+count) preserved behind **Customise** (progressive disclosure, nothing removed); MI personalisation as ONE honest toggle (default ON where it can apply; signed-out → Sign-in CTA; can't-enrich → OFF+disabled with an honest hint); a NEW **Preview step** with a real section bar + per-section counts/marks, a COMPUTED enrichment callout, 3 real samples, and an honest bank-shortfall — **ONE `candidate` set feeds hero → preview → generate, so the count shown IS the count generated**. **History moved OFF the page body**: the bottom `<SurfaceHistory>` mount removed → a header control (`Your worksheets · N · M awaiting ⌄`) opens a `WorksheetHistoryPanel` OVERLAY (dim+blur, scrollable, Esc/dim/✕; reuses SurfaceHistory rows + read-only `<ResultsScorecard>` re-open unchanged — `embedded`/`pendingOnly` props only). **Pending uploads surface via a `WorksheetPendingBanner`**: 1 pending → `Upload now →` re-hydrates into the UNCHANGED grade panel and attaches to the EXISTING record (frozen-code idempotency, #338 — no duplicate); ≥2 → `See all N →` opens the panel filtered to pending. **PDF filenames now carry the unique `code`** on all 3 paths (safe fallback). The generated "worksheet is ready" view, `WorksheetGradePanel`, Practice hub and Topic Hub were **NOT touched**; 7 files (5 M + 2 A), zero forbidden/gated — disjoint from #348. Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check) + **CI quality-gate GREEN**; vitest Codespaces-only. **⚠️ Rebased off a STALE base (pre-#348) before merge — the 7th stale-base catch; zero-conflict (disjoint files), NO revert, `checkSolution.cjs` byte-identical to trunk post-rebase.** Owner live-verified + squash-merged **#349 → `b4f2162`; no self-merge**. Closes 2 of the 3 owner-found worksheet bugs post-#344 (PDF filename + history placement; the grader MCQ one was #348). New follow-ups (all in the dispatched-separately follow-up PR): **[FU-MI-SCOPE-RELATIVE]** (MI enrichment must be computed WITHIN the selected scope — today a student with MI data can see a locked box whose copy wrongly says "grade a worksheet first"), **[FU-MI-ENRICH-WITHIN-TOPIC]** (single-topic worksheets can't enrich today — cross-topic re-weight only; within-topic section/mark-band enrichment is the real unlock, conditional on MI sub-topic granularity), **[FU-BUILDER-PREVIEW-AFFORDANCE]** (the Preview action bar is mobile-only → desktop users must scroll back to the hero after customising). Report: `report-worksheet-builder-redesign-2026-07-09.md`.) Previously (post-PR #348 — **Uniform OBJECTIVE (MCQ/AR) scoring MERGED** (squash `27eaa8f`): the grader now enforces ONE rule on every surface — an OBJECTIVE question (MCQ / Assertion-Reason / Section A) scores **0 or FULL, never fractional, never step-distributed**; working is analysed ONLY to classify the mistake type, never to award marks. **Root cause of the reported 0.5 partial-marks bug:** `worksheetGradeService.ts` mapped the grader answer key via `(q as unknown as {correctOption?}).correctOption` — a cast for a field the banks NEVER carry (`correctOption` = **0/353**; the real key is `q.answer` = the option TEXT) → always `undefined` → the server's objective guard was DEAD CODE → every MCQ was model-graded and step-distributed. **Fix:** NEW shared `server/routes/objectiveScoring.cjs` (+ parity-pinned client twin `src/lib/objectiveScoring.ts`) is called by BOTH grader functions (`handleCheckSolution` + `normaliseStructuredResult`) → **byte-aligned by construction** (one impl, two callers). Deterministic clamp: objective ⇒ 0-or-full, per-step marks STRIPPED; the real `q.answer` + `q.options` are forwarded (compare bridges a letter pick ↔ the option text; corrupt `.pyq` keys / no-`options` AR rows defer to the model, never a false 0). A wrong MCQ **with real written working KEEPS its `mistakeType`** (MI learns); a bare pick nulls it; **subjective step-marking untouched**. **Check & Improve forwards optional ADDITIVE objective signals** — bank-sourced (`section/format/options/answer`) ⇒ DETERMINISTIC key compare; keyless uploads ⇒ a detect-step `objective` flag + the model's BINARY verdict clamped, with a **≤1-mark safety rail** — and is **byte-unchanged when the signals are absent** (the two paths do NOT carry the same guarantee: bank-sourced is deterministic; keyless is model-classified-then-clamped). `ECF=2` preserved. Gates GREEN (tsc; mojibake 3/3; scope product; root **181/181**; ops matrix incl. llm-path 5/5; diff-check; no forbidden/gated files) + **CI quality-gate GREEN** + Vercel PASS; vitest is Codespaces-only → logic self-verified in node (module 41/41; graders 21/21; worksheet-scenario replay 48/48; twin↔cjs parity 741/0). 12 files (8 M + 4 A). Owner **live-verified BOTH paths** (worksheet deterministic + C&I model-verdict; no partial marks on MCQs) + squash-merged **#348 → `27eaa8f`; no self-merge**. This closes the "grader MCQ all-or-nothing" owner-found worksheet bug flagged post-#344. **Objective scoring is now UNIFORM across surfaces; `objectiveScoring.cjs` is the single source of truth for the invariant — Chapter Test / Full Mock will consume it when their MCQs move server-side.** New follow-ups: **[FU-OBJECTIVE-COST-SKIP]** (model-skip only pays off on future click-based surfaces), **[FU-BANK-CORRUPT-KEYS]** (~86 corrupt `.pyq` keys + ~15 no-`options` AR → data-quality lane), **[FU-CI-SCORECARD-VARIANT]**, **[FU-CI-SOLUTION-CACHE]**. Report: `report-objective-scoring-uniform-2026-07-09.md`.) Previously (post-PR #345 — **Notes v1.2 template MERGED** (squash `17fea57`): the notes-track schema/UX pass that locks the TRUE template and unblocks the ~30-chapter scaling. **C1** `NoteMindmapTree` → responsive **collapsible** vertical tree (reflows ≤380px, no overlap; CSS-hide collapse force-shown in print). **C2 = the SCHEMA change** → `schema_version 1.2`: added `examples[].marks_total` + numeric per-step `solution_steps[].mark` (0.5 half-marks valid), validator now **10 rules** (Rule 10 = per-step marks sum to `marks_total`), rendered as a per-example total badge + per-step mark chips, **all 3 specs backfilled** (life-processes/light/quadratic, 14 examples, sums verified). **C3** new `NoteModal` — `<Note>` opens as a POPUP over the Topic Hub (mounting-only; `<Note>` internals unchanged). **C4** new `NcertPageModal` + `CiteLine` — clickable `p.N` refs → Firebase Storage PDF embed with an HONEST "coming soon" fallback (NO PDFs committed). Gates GREEN (tsc; validator VALID×3 + 6-fixture self-test incl. a Rule-10 negative; mojibake; scope mixed; root **181/181**; ops matrix; diff-check) + CI quality-gate GREEN; grader untouched, no `src/data`/forbidden changes. 10-agent adversarial review clean on marks + doctrine; 5 minor findings fixed. **A v1.3 follow-up is IN FLIGHT NEXT** (owner-found REFINEMENTS, not v1.2 regressions): the mindmap tree should be VISIBLE by default, and the note modal should be FULL-SCREEN for diagram-heavy notes. The Fable notes content lane stays PARKED until owner gives the scaling go. Report: `Desktop\diff\report-notes-v12-template-2026-07-08.md`.)

Previously (post-PR #344 — **Progress-Journey ARC · PR-3 — per-surface Worksheet HISTORY MERGED (squash `a4c3eec`)**: NEW `components/results/SurfaceHistory.tsx` renders the durable session records the store already writes (PR-1/#338) as a "Your worksheets" section on the WorksheetGenerator BUILD view — the store is **CONSUMED, never modified or recomputed** (§3a). ONE responsive component (CSS reflow; navy `#15233a` heads, Fraunces + Inter, green). **C1** rows = `code` + `title` + `date` + a tone-coloured score chip (`marksAwarded/marksTotal`) OR an honest "awaiting your answer sheet" pill (`status==="pending-upload"`) + a compact four-type dot-strip ("✓ clean" when none); honest empty state; a `partial` record shows its real graded portion + a "partial" tag. **C2** vs-last-time = `getSubjectProgress` (the designated source) → a "↑/↓ N% this month" chip on the newest row per subject, **honest-or-silent** (absent when thin; never a fake 0) — NOTE: a subject-level MONTH trend, not a literal per-worksheet session-to-session delta (a small fast-follow if the owner wants the latter). **C3** tap-row → a READ-ONLY `<ResultsScorecard>` rebuilt from the STORED record (score + four-type + code — invents nothing); a "Download graded sheet" affordance appears ONLY when the local worksheet + grade caches resolve (reuses `exportGradedWorksheetPdf`), absent otherwise; **no per-question `perQuestionRef` reconstruction** (out of scope). PR-2 files edited ADDITIVELY (`scorecardVariants.ts` +`storedWorksheetScorecardVariant` + made marks `gradedCount`/`totalQuestions` OPTIONAL so a stored re-open never fabricates a count; `ResultsScorecard.tsx` ScoreHero renders the "across G of T" desc only when both counts present → LIVE worksheet/QP unchanged, no regression). CT/FM = deferred `SURFACE_COPY` seams (not mounted). **3 self-caught defects fixed pre-ship** (3-dim adversarial review, all CONFIRMED): a `pending-upload` re-open must NOT offer "Download graded sheet" (an all-unreadable scan still caches an `ok` grade) → now Done-only + a `status` gate on the handler; and its copy is the honest "we couldn't read any answers", not "you haven't uploaded". **Frontend only** — no store mutation, no `src/data`/`notes`/grader/`worksheetPdfExport.ts`/forbidden changes. 5 files. Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check) + **CI Quality Gate GREEN** (linux build) + Vercel PASS. Owner-QA'd + squash-merged **#344 → `a4c3eec`; no self-merge**. Report: `report-progress-pr3-surface-histories-2026-07-08.md`. **NEXT (Progress-Journey ARC) = arc PR-4, Me/Progress redesign** (§3b / §4-step-4). SEPARATELY: 3 owner-found worksheet bugs (grader MCQ all-or-nothing + PDF filename + history placement) fix in their own follow-up PR — NOT PR-3 regressions. ) Previously (post-PR #341 — **Progress-Journey ARC · PR-2 — the Universal `<ResultsScorecard>` MERGED (squash `8c4c159`)**: ONE responsive `<ResultsScorecard>` extracted from the shipped `WorksheetScorecard` — the shared SHELL (navy `#15233a` body + white footer; centered ~540px modal desktop → grab-handle bottom sheet mobile at 1024px via CSS reflow; Fraunces hero + Inter; ✕/primary/secondary/dim/Escape all CLOSE — a summary, not a gate; honesty verbatim: pending sacred, all-pending → honest message + disabled actions, four-type "not a weakness") + a PURE typed 4-surface variant interface (`components/results/scorecardVariants.ts`, covering the four flex-points: score model / framing line / four-type / actions). TWO LIVE variants: **worksheet** (behaviour-identical = the NON-REGRESSION gate — verified byte-identical `SC_CSS` via `comm -23`=0 lines dropped, QP-only classes purely additive) + **quick-practice** (§2.1: "X of N attempted" not marks/total, honest 0-attempted empty, NO graded-sheet download, MI four-type ONLY when typed mistakes exist, personalized what-next primary from the real signal + fixed floor menu). Chapter Test + Full Mock = `deferred:true` config seams (never rendered — no board-readiness/upload invented; the shell no-ops a deferred variant). **PRESENTATIONAL — the scorecard WRITES NOTHING:** Quick Practice writes NO session record (LOCKED §1a); the worksheet write stays upstream in `gradeWorksheetAndRecord`. `WorksheetGradePanel` + `PracticePage` repointed (reused the #249 finish-session trigger + added a `scorecardDismissed` flag so the auto-modal dismisses without fighting the derived trigger); old **`WorksheetScorecard.tsx` DELETED** (fully absorbed); a builders unit test added (Codespaces vitest). **Frontend only** — no `src/data` / grader / `worksheetPdfExport.ts` changes. 6 files (+885/−347). Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check; no forbidden files) + **CI Quality Gate GREEN** (linux build) + Vercel preview PASS. 4-dim adversarial review = **0 confirmed findings**. Owner **live-verified** (worksheet non-regression held; Quick Practice honest attempts + fallback menu; NO durable record for QP) + squash-merged **#341 → `8c4c159`; no self-merge**. Report: `report-scorecard-pr2-2026-07-07.md`. **NEXT (Progress-Journey ARC) = arc PR-3, per-surface histories** (Worksheet/CT/FM pages read `sessionRecords` via `progressStore`; design pkg §3a / §4-step-3). ) Previously (post-PR #338 â€” **Progress-Journey ARC Â· PR-1 â€” the session-record DATA LAYER MERGED (squash `d704b1c`)**: the connectivity spine the Universal Scorecard â†’ per-surface histories â†’ Me/Progress â†’ Home-nudge arc reads, built exactly to the LOCKED design package (`LazyTopper_Progress_Journey_Design_Package_LOCKED_2026-07-03`) Â§1â€“Â§2. NEW `services/sessionRecords.ts` â€” the `sessionRecords/{uid}/records/{code}` store (ONE durable record per COMPLETED graded session; Quick Practice writes none â€” Â§1a): fields per Â§1 + a documented additive `worksheetId` idempotency anchor; **idempotent** (doc id = the durable code â†’ a re-grade overwrites, never dups); localStorage mirror + fire-and-forget Firestore `setDoc(merge)` with a LOGGED catch; D32-safe (`ignoreUndefinedProperties` + `stripUndefined`); honest-failure gates (no record for signed-out / local / anonymous); `perQuestionRef` persists the per-question grade payload for "review my answers" (Â§1b); **durable cross-device `#NN`** via `ensureWorksheetSessionCode` reusing the PURE `worksheetNomenclature` over the records count (replaces the device-local count â€” Â§1c), frozen once so the downloadable sheet, graded sheet, and record id agree. NEW `services/progressStore.ts` â€” the ONE aggregation reader (Â§2): per-surface history, recent-activity strip, pending nudge (`status â‰  graded`), honest-or-silent beforeâ†’now marks trend (subject + topic altitudes); every write has a reader. The write fires in `gradeWorksheetAndRecord` (best-effort â€” never breaks grading); the durable code now **prints on the downloadable `WorksheetPrintDoc`** (threaded through `exportWorksheetPdf` + the Generator download + the GradePanel; `WorksheetGradedPrintDoc` already printed it). `PersistedWorksheet` +optional `code/name/sequence`. **Grader `server/routes/checkSolution.cjs` byte-unchanged; NO scorecard/history/Me/Home UI** (later arc PRs). `sessionRecords` is the FIRST genuinely-new top-level Firestore collection â†’ required a `firestore.rules` companion (globally-forbidden file, NOT in this PR; owner deployed via Console + committed to trunk **`dc73360`** â€” breaks the prior "reuse an existing collection" pattern). 11 files (+1182/âˆ’10). Gates GREEN (tsc; mojibake; scope product; root **181/181**; ops matrix; diff-check; no forbidden files) + **CI Quality Gate GREEN** (linux build); vitest (`sessionRecords`/`progressStore`/grade-service wiring) is Codespaces-only (Windows strips the linux rollup binary). Built in an isolated worktree; **adversarially reviewed** (doctrine clean; idempotency verified correct + hardened with the `worksheetId` anchor + a regression test). Owner **live-verified + squash-merged #338 â†’ `d704b1c`; no self-merge**. **[FU-SESSIONRECORDS-RULES] CLOSED** (`dc73360`); new **[FU-SESSIONRECORDS-REGRADE-JSDOM-TEST]** (a jsdom re-grade idempotency test â€” the node-env test can't exercise the `getWorksheetSession` short-circuit); the seen-set uniqueness feature is the deliberate follow-on on the same store (`questionIds` locked into the contract now â€” no migration). **NEXT (Progress-Journey ARC) = the Universal `<ResultsScorecard>` (arc PR-2)** â€” refactor from `WorksheetScorecard` (worksheet variant behaviour-identical = the non-regression gate), per-surface variants, the 3 refinements (honest "vs last time", "review my answers", WRITES the session record via this store). Report: `report-progress-session-record-layer-2026-07-06.md`. ) Previously (post-PR #337 â€” **Topic Hub boardEssentials seeding MERGED (squash `1caa25d`)**: authored real CBSE-2026-27 `boardEssentials` (full `ActionableSeed`) for all **12 unseeded** Topic Hub topics in `lazytopper/src/lib/desktop/topicHubContent.ts` â†’ **26/26 `topics.ts` topics now resolve `isSamplePreview=false`**; no live topic renders the generic `buildSampleActionable` "core ideas" fallback (retained as the safety net). 12 topics â€” Maths 8: real-numbers, polynomials, pair-of-linear-equations, arithmetic-progression, circles, areas-related-to-circles, statistics, probability; Science 4: metals-and-non-metals, human-eye-and-colourful-world, how-do-organisms-reproduce, our-environment â€” 3â€“6 real concepts each, authored + **adversarially syllabus/fact-checked** (6 clean / 6 corrected; fixed scrambled NCERT Â§-numbers, a circles proof mis-attribution, a presbyopia slip, stray-quote artifacts). Banned subtopics from `syllabusGuard.ts` excluded; Science in-scope (our-environment = Ch15 only, no deleted Ch16; reproduce = no evolution creep). Owner **Option A**: `ConceptSpine.test.tsx` sample-preview assertions re-pointed from the now-seeded `real-numbers` to a synthetic `__sample-preview-fixture__` (coverage preserved) â†’ **2-file diff**. Gates GREEN (tsc; mojibake; scope product; root matrix **181/181** incl. syllabus surface scan; ops matrix; diff-check; tsx verify 26/26 seeded). The ConceptSpine **vitest** render suite + `vite build` are Windows-unrunnable (linux platform-pin: `@rollup/rollup-win32-x64-msvc` stripped) â†’ CI/Codespaces; the data-layer basis of the re-pointed assertions verified via tsx. Owner-merged, **no self-merge**. **Topic Hub concept spine now FULLY SEEDED (26/26).** Pedagogy sign-off (concept selection + mark bands) DEFERRED to student-QC â†’ **[FU-TOPICHUB-PEDAGOGY-REVIEW]**; **[FU-TOPICHUB-PREVIEW-LABEL]** moot (label dormant for live topics, mechanism correct + tested). Report: `report-topichub-boardessentials-seed-2026-07-06.md`. ) Previously (post-PR #329 â€” **Notes render completion MERGED (squash `97a4949`)**: the PR-F code lane closed the last three `<Note>` render gaps, each lifted from the LOCKED prototypes â€” (1) VISUAL MINDMAP via `d3-hierarchy` layout + React JSX (labels still routed through `<NoteRichText>`, preserving #328), replacing the text outline; (2) GENERATED-FIGURE registry keyed by `figure.generator` â€” the Quadratic discriminant triptych (`parabola_triptych`, ported from the prototype's `plotStatic`) now DRAWS instead of the "pending extraction" placeholder (`ncert` placeholder unchanged); (3) DOWNLOAD-PDF (`window.print()` + all-tabs-rendered + `@media print` note isolation via the visibility trick). New files `NoteMindmapTree.tsx` + `NoteGeneratedFigure.tsx`; deps `+ d3-hierarchy ^3.1.2` / `@types/d3-hierarchy`. Rebased onto trunk before merge (byte-reviewed clean: 5 notes files only; #331 bug-fixes + handoff byte-identical, `checkSolution.cjs` ECF=2 intact). Gates: tsc, mojibake, lazytopper ops matrix, root matrix 181/181, diff --check â€” all GREEN; build linux-CI-gated. Owner-merged, no self-merge. **NOTES NOW RENDER FULLY** (Light + Quadratic: NCERT figures + visual mindmap + generated figures + Download-PDF, every tab, no placeholders) â€” the render pipeline is proven; ~30 chapters remain (spec authoring, parallel Fable content lane). Closes [FU-NOTE-GENERATED-FIG], [FU-NOTE-PDF-EXPORT], [FU-NOTES-LIGHT-COMPLETE]. OWNER LIVE-VERIFY pending (visual/print â€” non-blocking): mindmap tree desktop+mobile â‰¤380px no overflow, discriminant draws, PDF clean on both, entities show "&"; if PDF shows chrome/clips â†’ [FU-NOTE-PDF-PRINT-CHROME]. ) Previously (post-PR #333 â€” **Check & Improve holistic scorecard MERGED (squash `c3f6084`) & owner-live-verified**: multi-Q C&I now shows per-step annotation matching single-Q â€” each legible question card is EXPANDABLE (collapsed by default; tap the question) and reveals its `annotatedSteps` incl. the **corrected working**, via the existing `AnnotatedStepRow` (desktop) / inline step cards (mobile); `couldNotRead` stays honest pending (never 0). Both single-Q AND multi-Q gain **"Download graded solution" (PDF) + "Read on screen"**, via a NEW branded `CheckImproveGradedPrintDoc` (scoped CSS) carrying the CI code header, rasterised through the **shared** `worksheetPdfExport` core (`renderElementToPdf`) â€” a bridge toward the Universal `<ResultsScorecard>`. STEP-0: `annotatedSteps` was already in the frontend response (pass-through + server normaliser) â†’ PART A display-only. Frontend-only; grader/backend untouched; 4 files (1 new + 3 modified). Gates GREEN (tsc; mojibake; scope product; root **181/181**; lazytopper ops **6/6**; diff-check; no console.log; new component CSS-classes; `vite build`+vitest on CI). Adversarially reviewed (4 lanes; Bug-2 non-regression CLEAN) + fixes applied (coaching counts-not-marks doctrine; mobile meta-line grader-total; `aria-expanded`; index-keyed expand). Owner byte-review + squash-merged; no self-merge. New follow-ups: **[FU-CI-EXPAND-DISCOVERABILITY]**, **[FU-UNIVERSAL-SCORECARD]**. Full write-up in PR #333.) Previously (post-PR #330 â€” **Light extraction PILOT MERGED (squash `83b1268`): the Light question bank grew 326 â†’ 767** â€” 4 commits (v1 Foundation-pack 231 rows; v2 owner-directed beyond-board tier 51 rows + CBSE-official CFPQ/SQP-2025-26 19 rows; v3 gdrive high-marks 138 rows (2-5 mark only); v4 rebase onto `b5a62be` + review-queue manifest). 3 new bank files (`light-reflection-and-refraction.{fnd,cfpq-sqp25,gdr}.ts`) spread into `canonicalQuestionBank.ts`; NEW `SCIENCE_FIGURE_VISUALS` in `visualConceptRegistry.ts` binds **35 eye-confirmed raster source figures** (WebP, luminance-cleaned) by questionId â€” the first bound science figures. 3-mark 67â†’176, 5-mark 51â†’80, diagram-flagged 10â†’97; AI rows untouched (share 31.6%â†’13.4%). All 10 extraction checkpoint tests PASS; de-dupe ledger 91 exclusions; ~9 wrong source answer keys + 1 official CFPQ rubric error shipped physics-correct and flagged. **Owner decision: SHIP-TRACKED** â€” the 230 AI-authored solutions (`AI_GENERATED_SOLUTION_IDS`) + 52 authored-SVG-later diagram flags do NOT block launch; the committed manifest `docs/light-extraction-review-queue.md` is the trusted-student-QC / post-launch correction queue. Content lane next: Electricity extraction ONLY on explicit owner go. Report: `report-light-extraction-pilot-2026-07-03.md`.)
Previously (post-PR #282 â€” **Notes-generation track Step-1 MERGED** (squash `de2a616`): a **PARALLEL CONTENT track** (like the worksheet + PYQ-symbol tracks), separate from the Topic Hub product queue. #282 generated â€” **NOT yet wired into the app** â€” the locked note infrastructure under `notes/`: **`lazytopper_notes_kit.py`** (the locked renderer + `ncert_figure`/`clean_watermark`/`refill_rect` figure toolkit; verified running â€” regenerates ELEC+CHEM with the Download-PDF button), **5 v2 prototypes** (Light, Electricity, Chemical Reactions, Life Processes [carries 3 real NCERT figures], Quadratic Equations), and the **Light enriched exemplar** = the finished reference STANDARD (6 verbatim NCERT definition cards + 8-term key-terms cluster + 4 **real NCERT** worked examples + 3 **real NCERT** figures incl. **Fig 9.9 New Cartesian Sign Convention** + AUTHORED-vs-NCERT legend + full source ledger; cites reconciled directly against **NCERT Reprint 2026-27, Class 10 Science, Ch 9** `jesc109.pdf` â€” principal focus p.136, refractive-index in-text Q p.150 corrected on direct check). **14 files, ALL under `notes/`** â€” zero `lazytopper/src/`, zero `handoff/`, zero product code (verified on remote). **Content-generation ONLY.** #282 merged 2026-06-21 13:42Z â€” chronologically the FIRST of the recent cluster (BEFORE the worksheet #283/#284 and the PYQ-symbol #286), on a parallel track that the worksheet docs #285 + symbol docs #287 did not cover; documented here now. Gates GREEN (mojibake, root matrix **181/181**, lazytopper ops matrix, scope:guard `--mode product`, `git diff --check`); CI `quality-gate` **GREEN**; owner-merged, **no self-merge**. Full track handoff: **`handoff/NOTES_TRACK_HANDOFF.md`** (detailed working set at `notes/HANDOFF_notes_track_2026-06-21.md` + canonical index `notes/LazyTopper_NoteProtos_INDEX_2026-06-21.md`). **DECISION (settled, owner-approved):** notes ship as a shared React **`<Note spec={â€¦}/>`** fed by a structured note-spec (`notes/specs/<topic_key>.json`) as the single source of truth â€” NOT standalone HTML; the tutor + PR-F both consume the spec as data, and **Step 2 authors specs (JSON), not HTML**. **NEXT (notes track â€” gated order, do NOT reorder): (1)** `notes/validate_spec.py` â€” a source-required validator to note-spec schema v1.1 (this gate makes the ~35-note fan-out safe to parallelize); **(2)** a content PR under `notes/` (validated Light reference spec `light-reflection-and-refraction.json` + the schema-v1.1 doc + the validator; evolve the kit to `render_note(spec)`; finish Light's figure + mindmap lift); **(3)** then in parallel **PR-F** (the `<Note>` component + Topic Hub wiring, reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments â€” Electricity/Chemical Reactions/Life Processes [keep its 3 figures]/Quadratic Equations â€” â†’ ~35 notes), validator-gated. **Do NOT start Step-2 generation or PR-F before the validator + content PR land.** `magnetic-effects` = generate-TRIMMED (field / field-lines / field-due-to-conductorÂ·solenoid / right-hand-rule / force-on-a-conductor; EXCLUDE Motor / EMI / Generator â€” re-read `syllabusGuard.ts` first); `topic_key` must match `topics.ts` (two trig keys â†’ one `trigonometry`). New follow-up: **[FU-NOTES-MATHS-MAP]** (the Maths NCERT folder is not yet content-mapped). )
Previously (post-PR #286 â€” **PYQ symbol-integrity pass MERGED** (trunk `b600e2b`): the parallel symbol-fix track that RESOLVES the SOURCE-DATA gap #284 flagged. Audited ALL 103 PYQ packs / 759 questions (Maths + Science) in an isolated worktree (`fix/pyq-symbol-integrity`); **3 commits squash-merged**. **(1) Batch 1 â€” 12 âˆš/operator recoveries** in `real-numbers`/`quadratic-equations`/`polynomials` `questionText` (RN-003/005/008, REALNUM-2024-003, REALNUM-2025-001 (twin recovery), REALNUM-2026-002/003/004/005, QE-003/004, POLY-2024-005b), EACH verified against the question's own marking-scheme answer or a clean twin â€” recover-never-fabricate. Correctly EXCLUDED ~35 false-positives where âˆš lives only in the *answer* (question correct as-is). **(2) Withhold 38 unservable questions** â€” 17 Science (bilingual/CID column bleed) + 21 Maths (blank / garbled-expression / questionText-contradicts-its-own-answer / subset-font Hindi-as-Latin mojibake) â€” via a SINGLE source-level filter: `canonicalQuestionBank = RAW_CANONICAL_QUESTION_BANK.filter(q => !WITHHELD_QUESTION_IDS.has(q.id))` (honest omission > broken question; corrupt source objects kept INTACT in their packs for re-extraction; lifecycle = remove an id as its real text is supplied). Fragile-file evidence: the 349 `...PACK` spreads BYTE-IDENTICAL to trunk; **RAW 6579 â†’ LIVE 6541, delta == 38** (0 leaked / 0 collateral / 0 dup-ids; every withheld id present in raw). **(3) Â§7 â€” normalize Â° / Ï€ / âˆš** in 5 `areas-related-to-circles` `questionText` (ARC-004/005/006, 2025-ARC-001/002), answer-verified. SCOPE: `questionText` + `WITHHELD_QUESTION_IDS` only â€” `predictionTypes.ts` + all id/marks/year/set/answer/options/solutionSteps untouched. Gates ALL GREEN: tsc, mojibake, scope:guard, root matrix 181/181, lazytopper ops matrix, withhold runtime check, CI quality-gate (linux build). Owner squash-merged #286; no self-merge. âš ï¸ **Withheld Qs stop being served on MERGE + REDEPLOY** (not on push). Reports in `Desktop/diff/` (`report-pyq-withhold-and-followups-2026-06-21.md`, `PYQ_batch_for_owner_lookup_2026-06-21.md`, `PYQ_REEXTRACTION_followup_2026-06-21.md`). **PYQ âˆš-data audit follow-up from #284 RESOLVED** (recoverable set fixed; unrecoverables withheld + queued for owner real-paper lookup). New follow-ups: **[FU-PYQ-OWNER-LOOKUP]** (14 unrecoverable Maths expressions â€” owner supplies from real papers, batched by paper code), **[FU-PYQ-REEXTRACT-SCIENCE]** (re-extract the 2025/26 bilingual Science papers = the 17), **[FU-PYQ-ANSWER-FIELD-SYMBOLS]** (answer/solution fields STILL carry dropped âˆš â€” this pass fixed questionText only), **[FU-PYQ-CORRUPTION-DETECTOR]** (mojibake-by-subset-font across BOTH subjects + an answer-consistency check; note `mismatch_scan.py`'s `âˆš\s*\w` regex captures only ONE char â†’ under-reads multi-digit surds, so "only REALNUM-2024-004 is a true text-answer mismatch" is a screen not a guarantee), **[FU-PYQ-ANGLE-NORMALIZE]** (`Ã`â†’`âˆ ` + remaining Â°/Ï€/superscript normalization, bank-wide). )
Previously (post-PR #280/#283/#284 â€” **Worksheet rebuild E2a â†’ E2a.3 MERGED** (trunk `cfff277`): the worksheet FOUNDATION â€” ONE responsive `WorksheetGenerator` (buildâ†’generated in-place; replaced the desktop+mobile twins) + distribution fix (multi-topic EVEN / full-subject BOARD-WEIGHTAGE / MI Ã—1.5 re-weight; largest-remainder capped at availability â†’ honest counts) + deleted-topics filter (heredity-and-evolution, magnetic-effects) + real-math downloadable PDFs (the E2a jsPDF-ASCII path stripped âˆšâ†’"sqrt" â†’ replaced with MathText/KaTeX â†’ detached offscreen host â†’ html2canvas â†’ jsPDF FILE download "Option B", paginated, count-identity locked) + persist-by-`worksheetId` (`worksheetSessionStore`, the PR-E2b grade contract) + view-aware Back + MI-enrich as the page's single NAVY anchor in the right preview with three honest states (signed-outâ†’login-return CTA / in-scope hotspotâ†’toggle / signed-in-no-hotspotâ†’how-to-unlock). The "MI box hanging in air" was the global `input{width:100%;appearance:none}` ballooning a bare checkbox (hard-scoped). **Missing-symbol issue = SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated): `real-numbers.pyq*.ts` shipped 11 irrationality questions with âˆš/expressions stripped from `questionText` (clean camelCase `realNumbers.*.ts` fine) â†’ parallel symbol-fix agent; list in `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`. #281 closed (superseded by #283). Isolated worktrees; owner Vercel-verified each before merge; no self-merge. Full architecture + PR-E2b plan + gotchas: **`handoff/WORKSHEET_TRACK_HANDOFF.md`** + the WORKSHEET section below. **NEXT: PR-E2b** (the AI grade loop). New follow-ups: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE], PYQ âˆš-data audit (all subjects). )
Previously (post-PR #278 â€” **CLAUDE.md governance refresh MERGED** (trunk `f7170ef`): a surgical root-file edit â€” CLAUDE.md ONLY, +37/âˆ’9; product PR (root file), owner-merged, no self-merge; built in an isolated worktree (`chore/claude-md-refresh` off `b4163ef`, commit `ea837d4`, squash `f7170ef`). Changes: **(1) ADDED Â§2a Worktree Isolation** â€” the project's #1 lesson made an invariant rule (three prior collisions came from agents sharing the one checkout `C:\Projects\Lazytopper-Production`; one swept product code into a docs merge â†’ every task now runs in its own `git worktree`, verify `git branch --show-current` before every commit). **(2) DE-HARDCODED the root matrix count** in Â§6 + Â§6a (was "175/175"; the count GROWS â€” 181 as of 2026-06-20 â€” so the file now says "verify what the suite reports now, do NOT hardcode"). **(3) Replitâ†’"CI linux runner / GitHub Codespaces"** in Â§6 (Replit retired; the linux-x64 build-pin fact + "Windows can't build locally, CI-gated" kept). **(4) ADDED the verification doctrine** to Â§6 â€” static gates (tsc/matrix/build) are necessary but NOT sufficient; any change touching a live round-trip (auth, grading, persistence, routing/filtering, the tutor) needs ONE real owner live-execution before "done", flagged as needing live-verify. **(5) Â§13 CBSE 2025-26 â†’ 2026-27** throughout + a new competency-split line (verified pattern: ~50% competency-based / 20% MCQ / 30% short-and-long; mock/worksheet generation should represent the competency proportion, not just section/marks counts; the step-marking minimums A=1/B=2/C=3/D=5/E=4 are unchanged). **(6) ADDED the marks-bucket gotcha** to Â§7 (the PR-E1 lesson: the `"1"/"23"/"5"/"4"` buckets FUSE 2-and-3-mark and can't isolate a single mark value â†’ for exact mark-range filtering use numeric `q.marks`, never the coarse buckets). **(7) ADDED to Â§5** the MockBuilder-retired + MI-is-sidebar-chrome-only + re-read-`scripts/src/syllabusGuard.ts`-before-generating-content rules. Â§3/Â§8/Â§9/Â§10/Â§11/Â§12 and ALL gate COMMANDS untouched; no restructuring. The pre-existing line-1 UTF-8 BOM was LEFT as-is (owner decision â€” cosmetic, not gate-flagged, pre-dates this PR; the mojibake check doesn't scan root files). NEXT unchanged: **PR-E2 (Worksheet)**, branched fresh from `f7170ef`. )
Previously (post-PR #276 â€” **Topic Hub PR-E1 â€” concept-row Practise â†’ Quick Practice + exact mark-band filter, Chapter-test wired, MockBuilder un-routed â€” MERGED** (trunk `1de6f3e`): the PR-E wiring stage. Built in an **isolated git worktree** (`feat/practise-filter-chaptertest`, branched off `acc419b`), landed as **3 commits squashed to `1de6f3e`** across one implementation + two owner-found behavioral round-trips. **Scope delivered:** **(1) concept-row "Practise" now routes DIRECTLY to Quick Practice** (`/practice/:grade/:subject`) instead of the generic `/practice-hub` (the old 2-click bug); a new `buildDesktopConceptPracticePath` carries the concept context, while the hub path (`buildDesktopPracticePath`) is unchanged for other entry points. **(2) Exact mark-band filtering (Option A, owner-decided after live-verify):** the FIRST cut translated the band â†’ the page's coarse `marksFilter` buckets, but the bucket model FUSES 2- and 3-mark questions into one `"23"` bucket (`PracticePage.tsx:53`), so "3â€“5 marks" leaked 2-mark questions and "2â€“3" couldn't isolate 3-mark â€” owner caught this at live-verify. Fix: the concept-row route now emits an EXACT numeric range `marksMin`/`marksMax` (parsed from the concept's band by `parseMarkBandRange` in `navigation.ts`) and `PracticePage` filters by `Number(q.marks)` within `[min,max]` (`parseMarksRangeParams`); "3â€“5" yields ONLY 3/4/5, "2â€“3" yields real 2 AND 3. The lossy `markBandToBuckets`/`marksBucketsToParam` helpers became dead and were REMOVED (caller-checked). **(3) Single-pool count fix (third round-trip):** the "N available" hint and the displayed set were drawn from two independent `generatePracticeSet` samples (different random draws), so the hint promised e.g. 10 while the display held 5â€“6 even on a healthy bank â€” a two-pool divergence (note: the hint's `count:200` is clamped to 100 by `MAX_QUESTION_COUNT`, so depth was never the cause). Fix: extracted a pure module-scope `questionMatchesFilters` + `selectInRangeFromPool(pool,â€¦,committedCount)â†’{available,displayed}` so BOTH the hint and the display derive from the SAME realized pool â†’ `available >= displayed.length` always; honest thin-bank case preserved (real smaller number shown, no padding). **(4) PATH-CONDITIONAL contract held throughout:** the exact-range filter fires ONLY when `marksMin`/`marksMax` are present (concept-row entry); the Practice-HUB entry emits none â†’ stays "All"/student-controlled, bucket UI untouched. The pre-applied band is a CHANGEABLE starting filter (student can widen/clear). **(5) Back-nav:** concept-row Quick Practice now passes `backLabel:"Back to {Topic}"` + the specific Topic Hub `returnTo` (was landing on a generic "Exam Trends" default). **(6) Applied-filter indicator:** a light "Practising {Concept} Â· {min}â€“{max} marks Â· edit filters to change" band renders on the concept-row entry ONLY (gated on the URL range), so the student sees the band + that it's editable. **(7) Chapter-test action button WIRED** â€” the PR-D inert "Soon" button now navigates to the existing Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) via `buildDesktopChapterTestPath`; the page itself was already built (real genâ†’scoreâ†’persist) and is NOT redesigned here (its old-design redesign is backlogged â†’ [FU-CHAPTERTEST-PAGE-REDESIGN]). **(8) MockBuilder UN-ROUTED** â€” both `/mock-builder` routes now redirect to `/practice-hub` (chosen over bare deletion so the remaining inbound links â€” DesktopHome/HPQ/StudyPlan/Practice-Paper card â€” don't 404), lazy import + command-palette dispatch repointed, tagged `PR-G-deletion-pending`; the MockBuilder file is KEPT (PR-G deletes the legacy set). This is the ONLY `App.tsx` touch and was owner-flagged. **`Worksheet` button stays inert "Soon" â†’ PR-E2.** **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.** Files: `lib/desktop/navigation.ts` (+test), `pages/PracticePage.tsx` (+`PracticePage.marksFilter.test.ts`), `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx` (+test), `components/practice/PracticeControls.tsx`, `App.tsx` (MockBuilder un-route only). FORBIDDEN files untouched (`predictionTypes.ts`, `Welcome`/`DesktopShell`/`main`, `vite.config`, `firebase.json`, `firestore.rules`, `src/data/**`). Local gates GREEN across all three rounds: tsc, root matrix **181/181**, lazytopper ops matrix, mojibake, scope:guard `--mode product`, `git diff --check`; vitest + linux `vite build` gated by **CI `quality-gate` GREEN**. **Owner LIVE-VERIFIED** the final state (concept-row "3â€“5" shows zero 2-mark + the count/display agree; hub entry still "All"; Back returns to the specific topic; MockBuilder unreachable) and merged #276. Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`. **NEXT (Topic Hub queue, owner-authorized separately, branched fresh from `1de6f3e`): PR-E2** (Worksheet â€” its own locked spec) â†’ **PR-F** (Notes + Examiner's-tips content) â†’ **PR-G** (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]**, **[FU-CHAPTERTEST-PAGE-REDESIGN]**. )
Previously (post-PR #274 â€” **Topic Hub PR-D final-IA LAYOUT MERGED** (trunk `b57fa79`): the structural/visual rebuild of `ConceptSpine` to MATCH the binding mockup `docs/design/topichub_ia_mockup_FINAL_2026-06-19.html`. **Learn-first** (concept rows are the hero under a "Learn the N concepts" header; the topic-level action band recedes into a quiet dashed zone BELOW them); **Notes consolidation** (one unified "Notes" toggle replaces the Formula-sheet/Proofs/Practice-all tab bar â€” honest "coming soon"); **Examiner's tips** clickable/expandable container seeding the one real `examinerWarning`, NO fabricated tips (full set = PR-F); **action band** = "Practise this topic" (primary, routes to the existing whole-topic practice) + inert "Chapter test"/"Worksheet" ("Soon", wired in PR-E); **concept "Practise" carries concept + mark band** (`buildDesktopPracticePath` gains an optional `markBand`; `DesktopTopicHubPage` passes `concept.marks`); **per-row "Visual" badge** only where `findVisualForConcept` is non-null (honest); **MI stays sidebar chrome â€” none on the page body** (#270/#271 guard held). Single responsive component, pure-CSS `@media (max-width:1023px)` reflow, class-driven (no inline styles); `ConceptSpine.test.tsx` rewritten for the new contract. 4 files (`ConceptSpine.tsx` + test, `navigation.ts`, `DesktopTopicHubPage.tsx`) +515/âˆ’175; built in an **isolated git worktree**. Local gates GREEN: tsc, mojibake, scope:guard `--mode mixed`, root matrix 181/181, lazytopper ops matrix, diff-check, forbidden-file (none touched); vitest + linux `vite build` gated by **CI `quality-gate` GREEN**. **Item 7 (mobile full-screen tutor toggle) SPLIT to its own PR-D.1** â€” owner-approved (a `TeachFlow` change, not ConceptSpine layout; unverifiable on Windows; not part of the mockup gate). **Owner LIVE-VERIFIED the layout = GOOD** then squash-merged (#274, `b57fa79`); branch + worktree cleaned up. **New follow-up [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-row "Practise" lands on `/practice-hub` (`navigation.ts:75`) not Quick Practice, and its `markBand="1â€“2"` STRING is never consumed â€” `PracticePage` filters via a numeric `marksFilter` bucketed to `"1"/"23"/"5"/"4"` (`PracticePage.tsx:182`,`326-329`) and never reads `markBand` â†’ param carried, not applied. Fix is **path-conditional** (pre-apply the band only on the concept-row entry; leave the hub path student-controlled). **Two decisions recorded this handoff (see DECISION_LOG):** **MockBuilder RETIRED** (un-routed from the live product + tagged for PR-G deletion, code kept â€” Mistake Intelligence now auto-captures the "hard questions to revisit" need it served manually) and **[FU-BOOKMARK-SAVE-QUESTION]** (future lightweight "save this question even if answered correctly" â†’ surface on Me/Progress; not a launch blocker). Report: `report-topichub-prd-layout-2026-06-20.md`. **Item 7 (PR-D.1) corrected blast-radius:** `TeachFlow` now backs ONLY the one live Topic Hub tutor â€” `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx` are dead (PR-G deletes them); everywhere else the AI does solution-CHECKING, not tutoring. Previously (post-PR #265 + #264 â€” **Bank Expansion Phase 1, Batch 2 (45 net-new Exemplar Maths Qs) + vitest-infra fix MERGED** (trunk `381e9df`): two PRs landed â€” #264 vitest-infra (`2ef0b2c`) then #265 Batch 2 (`381e9df`). **#265 Batch 2 (THE DECOUPLE):** 45 net-new authentic Exemplar QUESTIONS + AI-GENERATED step-marked SOLUTIONS, owner-verified before merge â€” **Coordinate-Geometry 22 + Areas-Related-to-Circles 23** in new `coordinateGeometry.exemplar2.ts` / `areasRelatedToCircles.exemplar2.ts` (registered in `canonicalQuestionBank.ts`; `AI_GENERATED_SOLUTION_IDS` extended; **`predictionTypes.ts` NOT touched**). By section: A=9, B=16, C=17, D=3. **Syllabus exclusions at question level:** CG **Area-of-Triangle-in-Coordinate-Geometry BANNED** â†’ 7 area items dropped (Ex7.1 Q7,18; 7.3 Q9,16,17; 7.4 Q2,4); 13 figure-locked "shaded region" items dropped (CG Ex7.1 Q15, 7.4 Q5; ARC Ex11.3 Q2,6-9,11-13,15; Ex11.4 Q6,17); 1 unrecoverable-options MCQ dropped (CG Ex7.1 Q16 â€” not guessed); **3 reconstructed-math items flagged `// âš  RECON`** (CG MCQ-003, SA-006, SA-008). Every `solutionStep` `[N mark]`-prefixed summing to marks; every `finalAnswer` cross-checked vs the official key (jeep2an.pdf). Borderline list surfaced (collinearity-via-area CG Ex7.2 Q5,Q10 / 7.3 Q19 excluded; ARC Ex11.2 Q3 + Ex11.4 Q3 included-and-flagged). Gates GREEN: tsc, per-question validator 45/45, mojibake, root matrix 181/181 (incl. syllabus guard), ops matrix, scope:guard, diff-check; CI `quality-gate` GREEN. **Codespaces vitest = NO REGRESSION** vs base `5ce504e` (18/18 executable pass; the 7 infra suite-load failures pre-existed â€” fixed by #264). **FULL-CORPUS FIGURE-LOCKED CENSUS (owner-requested):** 67 figure-locked exercise Qs in-scope (A=15, B=10, C=25, D=17), **42 high-mark (C+D)** = launch-critical diagram-recovery target; by chapter Triangles 18 Â· ARC 17 Â· Circles 15 Â· SAV 9 Â· PLE 3 Â· CG 2 Â· Trig 2 Â· Stats 1. Reports: `report-bank-expansion-batch2-2026-06-18.md` + review docs (`.md`/`.html`). **#264 [FU-VITEST-INFRA] RESOLVED** (`2ef0b2c`): added `@testing-library/dom` direct devDep (the unsatisfied `@testing-library/react` peer that pnpm-strict hid â†’ 5 suites) + guarded `src/test/setup.ts`'s `window.matchMedia` polyfill for `// @vitest-environment node` suites (â†’ 2 suites); pnpm-lock.yaml regenerated in Codespaces (pnpm 10.32.1, NOT Windows). **Codespaces vitest now 11/11 suites, 63/63 tests GREEN.** `predictionTypes.ts` untouched. Owner merged both (#264 by agent on owner instruction, #265 by owner). NEXT (owner; queued, each branched fresh from `381e9df`): **Batch 3 (Triangles + Circles)** â€” note this batch holds the bulk of the 42 high-mark figure-locked items â†’ the diagram-recovery question comes to a head here â†’ Batch 4 (Trig + Pair-of-Linear-Eq) â†’ Batch 5 (Real-Numbers + Polynomials). Carried follow-ups: [FU-EXEMPLAR-STAT-13.4], [FU-EXEMPLAR-DEFERRED-NETNEW] (CG Ex7.3 Q12,14,15 + ARC Ex11.4 Q7,9,10,11,13,19), [FU-DIAGRAM-RECOVERY] (the 42 high-mark figure-locked Qs). Previously (post-PR #262 â€” **Bank Expansion Phase 1, Batch 1: 60 net-new NCERT-Exemplar Maths questions + AI step-marked solutions MERGED** (trunk `444238b`): THE DECOUPLE â€” authentic verbatim Exemplar QUESTIONS paired with AI-GENERATED, step-marked SOLUTIONS that the owner (examiner-of-record) verified before merge. **Net-new: Arithmetic Progressions 24, Statistics 16, Surface-Areas-&-Volumes 20** in NEW `*.exemplar2.ts` files (`AP_EXEMPLAR2` / `STAT_EXEMPLAR2` / `SAV_EXEMPLAR2`), registered in `canonicalQuestionBank.ts` (import + spread; engine-visible +60 verified). **Provenance via NEW `AI_GENERATED_SOLUTION_IDS` id-set** (mirrors PR2a `_source`; the forbidden `predictionTypes.ts` is NOT touched â€” the gated-field STOP was deliberately avoided by tracking solution-provenance as an id-set, owner-locked decision). **solutionSource split this batch: 60 ai-generated / 0 authentic-solution.** Every `solutionStep` carries a `[N mark]` prefix summing to marks; every `finalAnswer` cross-checked vs the official Exemplar answer key (jeep2an.pdf) â€” but the WORKED STEPS are AI (owner-verified). **Syllabus exclusions applied at the question level:** SAV frustum (11) + conversion-of-solids (11) + Stats ogive (1) dropped as BANNED; probability out-of-scope (separate topicKey); 6 figure-locked + 1 unreconstructable (SAV Ex12.2 Q3 â€” flattened formula, DROPPED not guessed) excluded; **3 reconstructed-math items flagged `// âš  RECON`** for fidelity spot-check (all in AP). Dedup vs the full repo corpus (2,889 maths Qs) by `ncertRef` + content; borderline list surfaced for owner. **Owner verified questions + solutions ("good to go") â€” no self-merge; owner merged.** Local gates ALL GREEN: tsc, per-question validator 60/60 (`[N mark]` sums, sectionâ†”marks, topicKey, no dup ids, no banned subtopic), mojibake, root matrix 181/181 (incl. syllabus guard over the new files), lazytopper ops matrix, scope:guard, git diff --check. CI `quality-gate` GREEN (linux `vite build`). **Codespaces vitest: NO REGRESSION** â€” the PR branch and untouched base `444238b` produce IDENTICAL results (18/18 executable tests pass incl. `predictionCore.source`/`.pastboardyear`; the 7 suite-load failures are a PRE-EXISTING repo test-infra gap â€” missing `@testing-library/dom` + jsdom env not active â€” failing identically on base â†’ NOT caused by this PR). Authority: Pass-2 net-new audit + `AGENT_bank_expansion_p1_exemplar_maths_2026-06-18.md`. Reports: `report-bank-expansion-p1-exemplar-maths-BATCH1-2026-06-18.md` + `report-bank-expansion-p1-exemplar-maths-2026-06-18.md` (Phase-A) + review docs (`review-bank-expansion-batch1-2026-06-18.md`/`.html`). 4 files; owner squash-merged `444238b`. NEXT (owner; queued, each branched fresh from `444238b`): **Batch 2 (Areas-Related-to-Circles + Coordinate-Geometry)** â†’ Batch 3 (Triangles + Circles) â†’ Batch 4 (Trigonometry + Pair-of-Linear-Eq) â†’ Batch 5 (Real-Numbers + Polynomials). New follow-ups: **[FU-VITEST-INFRA]** (add `@testing-library/dom` + jsdom env so vitest suites load cleanly), **[FU-EXEMPLAR-STAT-13.4]** (Stats LA Ex 13.4 question text not extractable from jeep213.pdf â€” needs a clean source), **[FU-EXEMPLAR-DEFERRED-NETNEW]** (AP Ex 5.3 extras + more reasoning parts available for a later top-up); Fix B [FU-TOPICKEY-CONSOLIDATION] migration scope now includes these new rows.)
Previously (post-PR #259 â€” **AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock MERGED** (trunk `775ee75`): the ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` (authentic 1.0 / predicted 0.6 / ai 0.3) only applied inside `getLikelyQuestionsForConcept` (Quick Practice / topic practice); the mock engines route through `getAllQuestions()` + their OWN selection and still drew AI at full parity. **Extended the SAME soft demotion (reused PR2a's ONE multiplier â€” exported `getSourceMultiplier`, no fork) to both mock surfaces.** **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` now does `predWeight *= getSourceMultiplier(q)` per section/marks slot; new `sourceWeightedPick` makes the guaranteed-archetype prefill authentic-first (was uniform-random); `weightedSelect` exported for the test. **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)` per slot. **âš ï¸ Boundary correction (load-bearing):** the instruction assumed **HPQ** also uses `getAllQuestions()` + serves AI at parity â€” **WRONG.** HPQ (`highlyProbableQuestions.ts`) is a hand-authored curated bank (`ple-hpq-*`, `sci-he-hpq-*`, `rn-comp-*`); it never calls `getAllQuestions()` and contains ZERO AI-pack content (`hpqCompetencyAdditions` curated too) â€” nothing to demote (Ã—1.0 everywhere). Left **untouched** (no cosmetic no-op), mirroring PR2b's boundary-correction precedent. **All AI-bearing surfaces now covered: Quick Practice/topic practice (PR2a) + Full Mock + Topic Mock (this PR); HPQ was already AI-free.** **Structure-preserving + count integrity:** demotion operates WITHIN each already-constrained section/marks pool, never globally; soft (`0.3/0.6`, never 0; additive base/topic/rng terms keep every candidate selectable) â†’ an authentic-thin slot still fills with AI, no slot left empty; blueprint loop / section counts / pools unchanged â€” only WHICH question fills each slot changed; zero question added/removed; repair passes (`repairArchetypes`/`repairStreamBalance`) left as-is (rare hard-constraint satisfiers). **New follow-up â€” [FU-AITIER-RANK-DIFFICULTY-HELPERS]:** `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity but were out of named scope + the authorized file list â†’ flagged for a future owner-authorized PR (NOT touched). Added `mockEngineSource.test.ts` â€” **Codespaces vitest 7/7 PASS** on `ba2f619` (per-slot authentic preference + soft AI fallback for both engines; CI quality-gate does NOT run vitest). Authority: PR2a (`686f737`) + `report-ai-tier-audit-2026-06-17.md` â†’ `AGENT_aitier_rank_mocks_hpq_2026-06-18.md`. Report: `report-ai-tier-rank-mocks-hpq-2026-06-18.md`. 4 files +209/âˆ’11; squash `775ee75`. CI `quality-gate` GREEN (1m17s incl. linux `vite build`; root matrix 181/181). Local gates green; no forbidden files (`predictionTypes.ts` untouched). **No self-merge; owner squash-merged; branch deleted (local + remote).** NEXT (owner; queued): **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items; **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (difficulty-helper surfaces).)
Previously (post-PR #257 â€” **AI-tier PR2b strip fabricated `pastBoardYear` MERGED** (trunk `d6e0e14`): anti-fabrication â€” predicted/HPQ questions carried a self-asserted `pastBoardYear` with no traceable PYQ reference (authentic PYQs use the traceable `pyqYear`, 759 values; the authentic `questionBanks/**` tree has ZERO `pastBoardYear`). **âš ï¸ Boundary was wrong â€” the instruction assumed 75 values / 2 files; exhaustive repo-wide enumeration (owner-mandated before stripping) found 96 values / 5 files** (an undercount of 21): `predictedQuestions.ts` 55, `predictedQuestionsScience.ts` 20 (incl. **8 non-numeric `"Model"`**), `class10SciencePredictiveEngine.ts` 12, `highlyProbableQuestions.ts` 8 (student-facing HPQ), `scripts/ops/hpq_phase2_acceptance.entry.ts` 1 (test fixture). Owner authorized **Option A** = strip all 96 + clean every consumer. **Consumer cleanup â€” all 8 `.pastBoardYear` reads removed (0 remain repo-wide):** `predictionCore` dedup tiebreaker â†’ **score-only** (the `pastBoardYear` clause was always-false post-strip); `predictionCore`+`mockPaperEngineScience` `sourceYearHint` â†’ `targetYear-1`; `predictionCore` converters + `predictionScoring` + `paperEngine` + `hpqConfidence` â†’ dropped the dead `pastBoardYear` 5-signal-input field. **KEY FINDING â€” HPQ confidence does NOT shift (dead plumbing):** the 5-signal scorer (`cbse5SignalScoring`) and Bayesian recurrence scorer (`probabilisticScoring`) compute recency from the historical dataset's `sourceYear` and NEVER read `input.pastBoardYear`/`sourceYearHint` â€” so stripping it changes ONLY the dedup tiebreaker; HPQ/mock confidence numbers are unchanged (proven by unit test #4). **`predictionTypes.ts` (forbidden) NOT touched** â€” optional field stays declared, all values removed; nothing invented to replace stripped data. **Count integrity:** field-removal only â€” served bank **total 6,715 UNCHANGED** (tiers {authentic 3,710 Â· ai 2,764 Â· predicted 241}; `pastBoardYear_remaining=0` at the serving layer); per-file question counts unchanged. Added `predictionCore.pastboardyear.test.ts` â€” **Codespaces vitest 9/9 PASS** (5 PR2b + 4 PR2a regression): score-only dedup, 5-signal independence from `pastBoardYear`, served-bank zero-`pastBoardYear` guard. Authority: `report-ai-tier-audit-2026-06-17.md` â†’ `AGENT_aitier_pr2b_pastboardyear_strip_2026-06-18.md`. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`. 11 files +113/âˆ’106; squash `d6e0e14`. CI `quality-gate` GREEN (1m9s incl. linux `vite build`; root matrix 181/181). Note: `hpq_phase2_acceptance` (ops, NOT a CI gate) can't run in Codespaces â€” pre-existing `Cannot find package 'esbuild'` in its bundling harness (fails identically on trunk; my change there is one clean fixture-line removal). **No self-merge; owner squash-merged.** NEXT (owner; queued): **[FU-AITIER-RANK-MOCKS-HPQ]** (apply the `sourceMultiplier` demotion to Full Mock / Topic Mock / HPQ, which use `getAllQuestions()` + own selection); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items.)
Previously (post-PR #255 â€” **AI-tier PR2a source-provenance stamp + soft AI-lower ranking MERGED** (trunk `686f737`): the ARCHITECTURAL fix the audit flagged â€” AI-lower ranking was never enforced (`getAdjustedScore` had no source term; the file/suffix tier marker was destroyed at the bank concatenation, leaving ~41% AI at full parity). **Change 1 (additive, `canonicalQuestionBank.ts`):** capture AI-pack ids at ingest where the source file is still known â€” `AI_GENERATED_QUESTION_IDS` from the **54 `.pack[1-3]` source arrays**; the bank array is untouched (zero reorder/adds/deletes). **Change 2 (`predictionCore.ts`):** `QuestionSource = "authentic"|"ai-generated"|"predicted"` on the LOCAL `CanonicalQuestionWithScore` intersection (the forbidden `predictionTypes.ts` is NOT touched â€” same pattern as `_adjustedScore`); stamp at the merge (predicted converters â†’ `"predicted"`; canonical classified by the AI-pack id set; `dedupeById` made generic so `_source` survives); `getAdjustedScore` gains `* getSourceMultiplier`. **Multipliers (owner-locked): authentic `1.0` / predicted `0.6` / ai-generated `0.3` â€” SOFT, never zero** (AI still surfaces when authentic is thin; tunable in one `SOURCE_MULTIPLIER` const). **Surfaces COVERED** (route through `getAdjustedScore` via `getLikelyQuestionsForConcept`): Quick Practice / topic practice (`practiceSetGenerator.generatePracticeSet`, `predictionDataService`). **Surfaces NOT yet covered â†’ [FU-AITIER-RANK-MOCKS-HPQ]:** Full Mock (`unlimitedPaperEngine`), Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`) use `getAllQuestions()` + their own selection â€” same `sourceMultiplier` needed there in a later PR. **Count integrity:** additive only â€” exact live split (Codespaces): **total 6,715 = authentic 3,710 (55.3%) + ai-generated 2,764 (41.2%) + predicted 241 (3.6%), 0 unstamped** (authentic is **790 short** of the 4,500 retirement threshold). Added `predictionCore.source.test.ts` â€” **vitest 4/4 PASS in Codespaces** (equal-base authentic > ai; soft so strong ai still surfaces; tier order; live-pool drift guard). **âœ… Owner-requested live-verify = PASS** (functional, real `getLikelyQuestionsForConcept` on trunk `686f737`): on ~50%-AI topics the first AI question lands at index ~100â€“186, so a 10-question Quick Practice serves ALL authentic â€” Real Numbers (49% AI) first-AI @#97, Triangles (52%) @#127, Trigonometry (53%) @#186; Light/Electricity (30%) @#239/#217. Before PR2a, AI interleaved at parity. **Decisions locked:** multipliers `1.0/0.6/0.3`; **curated-26 inline items stay authentic â†’ [FU-CURATED-26-PROVENANCE]** (owner-logged). Authority: `report-ai-tier-audit-2026-06-17.md` â†’ `AGENT_aitier_pr2a_provenance_ranking_2026-06-18.md`. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`. 3 files +265/âˆ’9; squash `686f737`. CI `quality-gate` GREEN (1m11s incl. linux `vite build`; root matrix 181/181). vitest runs in Codespaces, NOT the quality-gate â€” verified there separately. **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR2b** (`pastBoardYear` strip â€” now unblocked: this stamp distinguishes verifiable PYQ years from fabricated predicted-layer ones); then **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking); plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7.)
Previously (post-PR #253 â€” **AI-tier PR1b pack-file 5-mark retags MERGED** (trunk `f83915b`): the relabel-only follow-up to #251 that drains the `PACK_5MK_SHORT_BACKLOG`. **Group A â€” 12 genuine 5-mark long-answers** relabelled `format:"Short"â†’"Long"` (label-only; each confirmed by reading its `questionText`): `ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046, HEC2-039, LT2-016/024, ME2-025, REP2-048`. **âš ï¸ Safeguard fired â€” `PR2-018` reclassified:** the instruction's 13th Group-A id ("3 red, 4 green, 5 blue â†’ P(not blue)") is a single-step `7/12` one-liner, NOT a long-answer â†’ **moved to Group B (quarantine), not relabelled** (relabelling would worsen it). So Group A = **12** (not 13). **Group B â€” 7 QUARANTINED** (contentâ†”marks mismatch; short questions wrongly tagged 5-mark; NOT relabelled â€” fixing them is a marks/content pass, not a label flip): `TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018` â†’ logged **[FU-AITIER-MARKS-MISMATCH]**, kept pinned in `PACK_5MK_SHORT_BACKLOG` (now annotated) so the guard tracks them with no regression. **Backlog 19 â†’ 7.** Count UNCHANGED (pure label edits; symmetric per-file diffs). **[FU-AITIER-PACK-5MK-SHORT] RESOLVED** (relabel half done; the residual 7 carry forward as the marks-mismatch follow-up). Authority: report-aitier-pr1-mechanical-2026-06-17.md + cofounder Group-A/B classification â†’ AGENT_aitier_pr1b_pack_retags_2026-06-17.md. Report: report-aitier-pr1b-pack-retags-2026-06-18.md. 9 files +34/âˆ’19; squash `f83915b`. CI `quality-gate` GREEN (1m9s incl. linux `vite build`; root matrix 181/181 with backlog now 7). **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip) â†’ carried doctrine below; plus the deferred **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7.)
Previously (post-PR #251 â€” **AI-tier PR1 mechanical content-integrity MERGED** (trunk `f4a41b6`): the first remediation from the read-only AI-tier audit. (1) Added `"Long"` to `QuestionKind` in `predictedQuestions.ts` + `predictedQuestionsScience.ts` (NOT the forbidden `predictionTypes.ts`; no exhaustive-switch break) and mapped `kind:"long"â†’format:"Long"` in `predictionCore.toCanonicalFormat` so the retag actually propagates to the unified bank. (2) Retagged **24** five-mark Section-D predicted items `kind:"Short"â†’"Long"` (12 maths + 12 science). (3) **Split fused Q10** (`2026-RN-LA-03`, the alarm-clock-LCM + prove-âˆš5 weld with the 5-mark/Section-D/Short tags) into `2026-RN-SA-08` (LCM, Section C/3mk) + `2026-RN-SA-09` (âˆš5 proof, Section C/3mk) â€” **net +1**, the only intended count change; `pastBoardYear` omitted on the new items (no fabricated provenance). (4) Added `scripts/src/aiTierContentIntegrityGuard.test.ts` to the root `test:matrix:all` (**175â†’181**) â€” fails on fused (`also prove`), sectionâ†”marks mismatch, and 5-mark "Short". **[FU-MALFORMED-QUESTION] RESOLVED** (Q10 de-fused + guard locks the class). **âš ï¸ Flagged discovery â€” the audit undercounted:** the SAME defect exists in **19 more** `.pack2/.pack3` questions (they use `format:"Short"`); `.pack` files are gated + out of this PR's scope, so they are pinned as a shrink-only backlog (`PACK_5MK_SHORT_BACKLOG`) â†’ **[FU-AITIER-PACK-5MK-SHORT]** for **PR1b** (owner-authorized, separate; retag ONLY genuine LA, QUARANTINE contentâ†”marks mismatches like TG3-056/REP2-039 for a content pass). Authority: report-ai-tier-audit-2026-06-17.md â†’ AGENT_aitier_pr1_mechanical_2026-06-17.md. Report: report-aitier-pr1-mechanical-2026-06-17.md. 5 files +237/âˆ’41; squash `f4a41b6`. CI `quality-gate` GREEN (1m12s incl. linux `vite build`). **No self-merge; owner squash-merged.** NEXT (owner; queued): **PR1b** (the 19-pack retag/quarantine) â†’ **PR2** (source-provenance stamp + AI-lower-ranking enforcement + `pastBoardYear` strip) â†’ carried doctrine below.)
Previously (post-PR #249 â€” **"Finish session" scorecard trigger MERGED** (trunk `704dcff`): replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** button (always-available at the set foot, both desktop + mobile widths) â†’ fires `practice_finish_session_click` + sets `sessionFinished` â†’ surfaces the scorecard. `allDone` retained as a convenience auto-offer (`showScorecard = (sessionFinished || allDone) && questions.length > 0`). Reuses the EXISTING `sessionStats` â€” no new counters, no persistence, no session-lifecycle state machine. **Partial-session honesty** (the load-bearing requirement): attempted-only denominators + explicit "the M you didn't reach aren't counted" line + an honest zero-attempt state; unattempted questions are NEVER counted against the student. "Keep practicing this set" escape hatch on a manual partial finish. 2 files (`pages/PracticePage.tsx` +62/âˆ’2, `services/uxTelemetry.ts` +1); commit `b740a3f`. CI `quality-gate` GREEN (1m8s â€” incl. the linux `vite build`). **âœ… Owner live-verify = PASS â€” partial-session honesty PROVEN:** a 3-of-10 finish reads "3 of 10 attempted Â· 0/3 MCQs correct Â· 0% accuracy Â· Here's how those 3 went, the 7 you didn't reach aren't counted"; the zero-attempt case reads honestly too. **Supersedes #240 sub-task 5's `allDone`-only trigger.** NEW follow-up logged for the next (read-only) audit: **[FU-MALFORMED-QUESTION]** â€” a live-observed malformed question (Real Numbers Quick Practice Q10 fused two questions: alarm-clock LCM + prove âˆš5, with inconsistent 5-mark / Section-D / Short tags), suspected AI-generated pack origin. NEXT (owner; queued, NOT yet authorized): a **read-only AI-generated-question-tier audit** (its own instruction, branched fresh against `704dcff`) â†’ then (iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]; then (2) MI eval ([MI-EVAL]) â†’ (3) Stage 3 ([FU-DRILL-ENRICHMENT]) â†’ Fix B [FU-TOPICKEY-CONSOLIDATION] when authorized. PRE-LAUNCH gate: [FU-DETECTION-META-LAUNCH-FLIP].)
Previously (post-PR #246 â€” **Check & Improve detect-then-confirm MERGED** (trunk `c9404e1`): builds on Claim 2 (#244). Detection is now VISIBLE + CORRECTABLE before grading. New flow on both surfaces: question input by type/paste/**photo of the question** (distinct slot from the answer photo) â†’ **"Read the question â†’"** fires a detection-ONLY call (`POST /api/detect-question`, the cheaper call) on the question alone â†’ a **confirmation chip** shows detected subjectÂ·topicÂ·marks (+ source) with a quiet **[Change]** affordance â†’ constrained correction (topicâ†’canonical key via Fix A's resolver, marks 1â€“6, subject toggle; corrected mark flagged `marksSource:"user"`) â†’ grade runs on the CONFIRMED values via the unchanged trusted-marks path (the grader `handleCheckSolution` is byte-identical). Override logged on the attempt record (`marksSource`+`detectionOverride`; reuses recordAttempt persistence â€” no new collection / no firestore.rules change). **`SHOW_DETECTION_META` flag (shared helper) default=ON for owner testing; âš ï¸ MUST flip to OFF before student launch â€” see [FU-DETECTION-META-LAUNCH-FLIP], the tester-vs-student line.** Bank-grounding deferred behind Fix B. CI GREEN. **Owner live-verify of #246 = PASS 5/6** (printed marks read correctly; inference genuine + graduated â€” AP=2 vs proof=3 diverge; topics bucket clean; selectors gone both widths). The 6th: **[FU-DETECTION-MARKS-CEILING]** â€” inference under-calls true 5-mark questions (multi-part numerical + proofs) as 3; caught-and-correctable via [Change], NOT a blocker. NEXT (owner; queued, NOT yet authorized): **(ii) "Finish session" scorecard-trigger PR** â†’ **(iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]**; then **(2) MI eval** ([MI-EVAL]) â†’ **(3) Stage 3** ([FU-DRILL-ENRICHMENT]) â†’ **Fix B [FU-TOPICKEY-CONSOLIDATION]** when authorized. PRE-LAUNCH gate: **[FU-DETECTION-META-LAUNCH-FLIP]**. Carried: [FU-SPELLING-GATED-REMAINDER] + [FU-TOPICKEY-CONSOLIDATION] + [FU-DETECTION-META-LAUNCH-FLIP] + [FU-DETECTION-MARKS-CEILING] + [FU-IMPROVEMENT-CARD] + [FU-WEAKAREA-ALIAS-DISPLAY] + [FU-ATTEMPT-MARKS-ACCURACY] + [FU-ATTEMPT-SR] + [FU-ME-REFRESH] + [FU-GRADE-MARKSCALE]/[FU-GRADE-CONSISTENCY]/[MI-EVAL]; owner+cofounder close [TRACK-B-GATE]; RESP-DIV-2)
Previously (post-PR #244 â€” **Check & Improve auto-detect MERGED** (trunk `43ffa09`): the grader determines marks/subject/topic from the question itself (Claim 2, option (a)); the student-picked selectors are GONE on both surfaces. Isolated behind a `detectMarks` flag so Quick Practice is byte-identical. Printed marks preferred â†’ inferred â†’ flagged `fallback`; topic constrained to the canonical vocab + re-canonicalised via Fix A's resolver. CI GREEN. Owner live-verify of #244 PENDING.)
Previously (post-PR #242 â€” **topicKey Fix A MERGED** (trunk `77f2ed2`): the Me weak-area row now resolves stored topic labels through the strong serving-side resolver (`desktopTopicForWeakAreaKey`) + 13 `topics.ts` aliases; the 13 in-bank spellings that fell to `/exam-trends` now route to Quick Practice. Read-time only. CI GREEN. **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED.** Preceded by the read-only topicKey-duplication audit. **Fix B [FU-TOPICKEY-CONSOLIDATION] HELD / authorized-later.** Owner live-verify of #242 PENDING.)


## â³ WORKSHEET PR-A: GRADE-RESULTS REDESIGN (#295, trunk `1a85186`) â€” MERGED + CI GREEN Â· âš  OWNER LIVE-VERIFY PENDING
PRESENTATION ONLY â€” the worksheet grade UI rebuilt to the LOCKED redesign spec (`LazyTopper_Worksheet_Grade_Redesign_Spec_LOCKED_2026-06-24.md`), on top of the E2b grade loop. Built in an **isolated worktree** (`feat/worksheet-grade-redesign-pra`), opened as a draft, cofounder-reviewed clean, owner-merged. Report: `report-pr-a-worksheet-grade-redesign-2026-06-24.md`. 6 files +1003/âˆ’20.
- **THE HARD INVARIANT HELD** â€” `server/routes/checkSolution.cjs` / the grader is **BYTE-UNCHANGED (absent from the PR diff)**. PR-A reorganises how the EXISTING grade output is presented; it never re-grades.
- **Auto scorecard popup** (NEW `WorksheetScorecard.tsx`) â€” appears the moment `response.ok` resolves (the Quick-Practice session-scorecard auto-appear pattern, as the LOCKED navy overlay). Responsive at 1024px: **desktop centered modal â†” mobile bottom sheet** (grab handle), pure-CSS reflow. Name + code header; big Fraunces `gradedMarksAwarded/gradedMarksTotal`; amber pending strip; **four-type breakdown** from `results.filter(!couldNotRead)[].mistakeSummary` â†’ Knowledge gaps (conceptual+calculation) / Careless (silly+presentation, "not weak topics"); Read (ghost) + Download (primary) footer (âœ•/Read/Download all close); **all-pending â†’ both buttons DISABLED**.
- **Tap-to-reveal sheet** (`WorksheetGradePanel.tsx`) â€” the always-open dump â†’ collapsible per-section expanders (first open); Download (PDF) + Practise action row; View-scorecard re-open.
- **Branded graded PDF** (NEW `WorksheetGradedPrintDoc.tsx` + `exportGradedWorksheetPdf`) â€” reuses the EXISTING `worksheetPdfExport.ts` `html2canvas â†’ jsPDF` + KaTeX path; the renderâ†’paginateâ†’save core was factored into a shared `renderElementToPdf` so `exportWorksheetPdf` is behaviour-identical (cofounder-verified non-regressive). Renders the SAME response (no second grade call); pending stays "couldn't read â€” not graded, not scored 0"; coaching footer; "Marks shown match your on-screen result."
- **Summary-leak fix** (display-only) â€” `isLeakySummary` suppresses model meta/refusal prose, esp. all-`couldNotRead`. Grader + response shape untouched.
- **Nomenclature** â€” `worksheetNomenclature` (`worksheetModel.ts`) builds `WS-{S}-{TOPIC}-{NN}` + `{Topic} Â· Worksheet {N}` (MIX/FULL); `#NN` = device-local count via `listStoredWorksheetsLite` (`worksheetSessionStore.ts`). On scorecard + sheet + PDF. (PR-B makes it durable.)
- **Gates:** tsc Â· mojibake 0 Â· scope:guard product Â· ops matrix Â· root matrix **181/181** Â· diff-check clean â€” ALL GREEN. **CI `quality-gate` GREEN (1m17s, incl. linux build).** `checkSolution.cjs` diff EMPTY; no forbidden files. **No self-merge; owner marked ready + squash-merged.**
- **âš  OWNER LIVE-VERIFY = PENDING** (UI/PDF round-trip â€” static gates can't prove it): scorecard auto-pops (desktop modal + mobile bottom sheet); four-type correct; âœ•/Read/Download close; Read reveals the tap-to-reveal sheet; Download â†’ branded PDF whose marks/pending match the screen; all-pending disables both; name/code everywhere; Check & Improve still grades.
- **NEXT:** owner live-verify of #295 â†’ **PR-B** (durable per-student worksheet record: Firestore-by-UID nomenclature + seen-set question-uniqueness + Me/Progress journey + scorecard persistence + parent/teacher storage foundation with Â§B6 wellbeing-framing + minor-consent constraints).

## â³ WORKSHEET PR-E2b: ONE-PDF AI GRADE LOOP + MI WIRING (#291, trunk `60c5bf9`) â€” MERGED + CI GREEN Â· âš  OWNER LIVE-VERIFY PENDING
The SECOND half of the worksheet (E2a foundation merged). Built in an **isolated worktree** (`feat/worksheet-grade-loop`), rebased onto trunk `2cab012` (post-Z3) with ZERO conflicts. **Full architecture + the mandatory live-verify checklist live in `handoff/WORKSHEET_TRACK_HANDOFF.md`** â€” this is the summary. Report: `report-pr-e2b-worksheet-grade-loop-2026-06-23.md`. 9 files +1201/âˆ’10.
- **One PDF, ONE structured call** â€” student uploads ONE PDF of all answers (labelled Q1, Q2 â€¦); graded against the worksheet's KNOWN scheme keyed Q1â€¦QN, matched BY NUMBER (the questions PDF already prints the label instruction), never blind-segmented.
- **Server additive (live backend):** `server/routes/checkSolution.cjs` gained a surface-AGNOSTIC `gradeStructuredSet` core + `handleGradeWorksheet` + stub + per-question normaliser. **`handleCheckSolution`/`handleDetectQuestion` BYTE-UNCHANGED** (only the return-object line extended) â†’ zero regression to the live Check & Improve grader (the PR's biggest risk). `questions.cjs` + `index.cjs` register `POST /api/grade-worksheet` (+OPTIONS/CORS). `readJson` 8 MB cap on THIS route only.
- **Honest-failure (anti-fabrication):** per-question `couldNotRead` â€” illegible/absent answers are NEVER given a fabricated mark and NEVER folded into a 0; an omitted question is pending, not zeroed. **Trusted marks** â€” per-question `totalMarks` = scheme `q.marks`; model awards within it; additive-floor `mistakeSummary` reconcile mirrors the wired path.
- **Client additive:** `aiClient.gradeWorksheet()` + types; `worksheetSessionStore` `save/getWorksheetGrade`; NEW `worksheetGradeService.ts` (testable seam â€” map-by-number, persist, fan each LEGIBLE result through the SINGLE MI front door `recordMistake` + score-twin `recordAttempt` with a STABLE `ws:<id>:q<N>` id â†’ re-upload dedups via the front door's existing layer, NO parallel idempotency; grade core takes its question set as a PARAMETER â†’ Chapter Test / Full Mock reuse). NEW `WorksheetGradePanel.tsx` (upload UI, sync progress, per-question results, **honest "graded X/Y + N pending" totals SEPARATE from the worksheet total**, MI evidence line) wired into `WorksheetGenerator.tsx`. NEW `worksheetGradeService.test.ts` (Codespaces/doc-only).
- **`recordAttempt` reconciliation:** the task doc said it didn't exist yet; on trunk it DOES + the worksheet handoff Â§4 calls for it â†’ both `recordMistake` and `recordAttempt` wired (mirrors `SolutionChecker`); no `[FU-SCORECARD]`.
- **Forward-compat (shaping only â€” Chapter Test / Full Mock NOT built):** grade core is surface-agnostic; `RecordMistakeContext` left unchanged (the future optional `source` field is a later deliberate MI-engine change).
- **Gates:** tsc Â· mojibake 0 Â· scope:guard product Â· lazytopper ops matrix Â· root matrix **181/181** Â· `node --check` Ã—3 `.cjs` Â· diff-check clean â€” ALL GREEN pre- and post-rebase. **CI `quality-gate` GREEN (1m16s, incl. linux build).** No forbidden files; MI routing internals only CALLED. Cofounder review clean. **No self-merge; owner merged.**
- **âš  OWNER LIVE-VERIFY = PENDING** (AI round-trip â€” static gates can't prove it). On the Firebase-authorized trunk URL, START SMALL (5-Q): right-question mapping + sensible marks; illegible page â†’ honest "couldn't read Qn" + graded X/Y + N pending (not deflated); feeds Me/Progress + unlocks MI-enrich toggle; careless vs knowledge-gap route correctly; **Check & Improve still grades + feeds MI**; re-upload no double-count; phone end-to-end.
- **NEXT:** owner live-verify of #291 â†’ worksheet (E2a+E2b) COMPLETE â†’ PR-F (Notes + Examiner's-tips content) â†’ PR-G (deletions). Carried worksheet follow-ups: [FU-ASYNC-GRADING], [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].

## âœ… WORKSHEET REBUILD â€” PR-E2a â†’ E2a.3 (#280 `d065922`, #283 `9a080a0`, #284 `cfff277`) â€” MERGED + CI GREEN + OWNER LIVE-VERIFIED
The worksheet **foundation** (Topic Hub PR-E2). **Full detail, architecture, PR-E2b plan and gotchas live in `handoff/WORKSHEET_TRACK_HANDOFF.md`** â€” this is the summary.
- **#280 PR-E2a** â€” ONE responsive `WorksheetGenerator` (`components/worksheet/`, buildâ†’generated in-place) replacing the desktop (`DesktopWorksheetsPage`) + mobile (`app/Worksheets`) twins (UN-ROUTED, kept for PR-G). Distribution fix (`worksheetModel.ts`): multi-topic EVEN / full-subject BOARD-WEIGHTAGE / MI-enrich Ã—1.5 re-weight, largest-remainder **capped at real availability â†’ honest counts** (shown == generated). Deleted-topics filter (`heredity-and-evolution`, `magnetic-effects`). Two PDFs. Persist-by-`worksheetId` (`services/worksheetSessionStore.ts`).
- **#283 PR-E2a.1+.2** â€” math made REAL via existing `MathText`/KaTeX (E2a jsPDF-ASCII had stripped âˆšâ†’"sqrt"); `window.print()` (printed whole page + clipped) REPLACED with a real client-side PDF FILE download (Option B â€” `WorksheetPrintDoc` â†’ detached offscreen host â†’ html2canvas â†’ jsPDF, paginated, clean isolation). Count identity locked. No new deps.
- **#284 PR-E2a.3** â€” view-aware Back (generatedâ†’builder; buildâ†’`returnTo`); MI-enrich relocated into the RIGHT preview AFTER the snapshot as the page's single **NAVY anchor** (`hsl(220,25%,12%)`) with three honest states (signed-outâ†’`/login?...&redirect=<here>` CTA / in-scope hotspotâ†’toggle / signed-in-no-hotspotâ†’how-to-unlock note); "hanging box" root cause = the global `input{width:100%;appearance:none}` (styles.css:265) ballooning a bare checkbox (hard-scoped). **Missing-symbol = SOURCE-DATA gap, FLAGGED not fixed** (`src/data` gated): `real-numbers.pyq*.ts` shipped 11 irrationality Qs with âˆš/expressions stripped from `questionText`; list + paper refs in `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md` â†’ parallel symbol-fix agent (all subjects; recover from twin/source, never invent).
- **Gates** (each PR): tsc Â· root matrix 181/181 Â· ops matrix Â· mojibake Â· scope:guard product Â· diff-check Â· **CI quality-gate GREEN incl. linux build**. vitest is Codespaces-only (not a CI gate). **Owner Vercel-verified each + merged; no self-merge.**
- **NEXT: PR-E2b** â€” the AI grade loop (extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1â€¦QN via `getWorksheetSession`; wire `recordMistake` through the MI front door â†’ worksheets feed Me/Progress + unlock the MI toggle; **mandatory 5-Q live-verify**). New follow-ups: **[FU-PITFALL-DATA]**, **[FU-WORKSHEET-PDF-SERVERSIDE]**, **PYQ âˆš-data audit** (all subjects). Then PR-F (Notes/Examiner's-tips content), PR-G (delete dead twins + retired set).

## âœ… TOPIC HUB PR-E1: PRACTISE-FILTER + CHAPTER-TEST WIRING + MOCKBUILDER UN-ROUTE (#276, trunk `1de6f3e`) â€” MERGED + CI GREEN + OWNER LIVE-VERIFIED
BEHAVIORAL wiring â€” the PR-E stage. Built in an **isolated git worktree** (`feat/practise-filter-chaptertest`, off `acc419b`). Landed as **3 commits squashed to `1de6f3e`** (one implementation + two owner-found live-verify round-trips). Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`.
- **Concept-row "Practise" â†’ Quick Practice DIRECT** â€” `buildDesktopConceptPracticePath` routes to `/practice/:grade/:subject` (was the generic `/practice-hub`, the 2-click bug). The hub builder `buildDesktopPracticePath` is untouched (other entry points rely on it).
- **Exact mark-band filtering (Option A)** â€” the first cut used the page's `marksFilter` buckets, but the bucket model FUSES 2- and 3-mark into one `"23"` bucket (`PracticePage.tsx:53`) â†’ "3â€“5" leaked 2-mark, "2â€“3" couldn't isolate 3-mark (owner-caught). Final: the concept route emits EXACT `marksMin`/`marksMax` (`parseMarkBandRange`); `PracticePage` filters by `Number(q.marks) âˆˆ [min,max]` (`parseMarksRangeParams`). "3â€“5" â†’ only 3/4/5; "2â€“3" â†’ real 2 and 3. Dead `markBandToBuckets`/`marksBucketsToParam` REMOVED (caller-checked).
- **Single-pool count fix** â€” the "N available" hint and the displayed set came from two independent `generatePracticeSet` draws â†’ hint promised 10, display held 5â€“6 on a healthy bank (the hint's `count:200` is clamped to 100 by `MAX_QUESTION_COUNT`, so depth was never the cause). Unified behind `questionMatchesFilters` + `selectInRangeFromPool(pool,â€¦,committedCount)â†’{available,displayed}`; both read the SAME realized pool â†’ `available >= displayed.length` always; honest thin-bank case preserved (real smaller number, no padding).
- **PATH-CONDITIONAL** â€” exact-range filter fires ONLY when `marksMin`/`marksMax` are present (concept-row entry); the Practice-HUB entry emits none â†’ stays "All"/student-controlled, bucket UI unchanged. The band is a CHANGEABLE starting filter (widen/clear).
- **Back-nav** â€” concept-row Quick Practice passes `backLabel:"Back to {Topic}"` + the specific Topic Hub `returnTo` (was a generic "Exam Trends" default).
- **Applied-filter indicator** â€” light "Practising {Concept} Â· {min}â€“{max} marks Â· edit filters to change" band, concept-row entry ONLY (URL-range-gated; never on the hub path).
- **Chapter-test button WIRED** â€” PR-D's inert "Soon" button now navigates to the existing Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) via `buildDesktopChapterTestPath`. Page already built (real genâ†’scoreâ†’persist); NOT redesigned here â†’ **[FU-CHAPTERTEST-PAGE-REDESIGN]** (old-design page, wiring works).
- **MockBuilder UN-ROUTED** â€” both `/mock-builder` routes redirect to `/practice-hub` (over bare deletion, so inbound links â€” DesktopHome/HPQ/StudyPlan/Practice-Paper card â€” don't 404), lazy import + palette dispatch repointed, tagged `PR-G-deletion-pending`; file KEPT (PR-G deletes the legacy set). ONLY `App.tsx` touch (owner-flagged). **DECISION_LOG MockBuilder-retired now executed.**
- **Worksheet** stays inert "Soon" â†’ **PR-E2** (its own locked spec).
- **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.**
- **Files:** `lib/desktop/navigation.ts` (+test), `pages/PracticePage.tsx` (+`PracticePage.marksFilter.test.ts`), `pages/desktop/DesktopTopicHubPage.tsx`, `components/topichub/ConceptSpine.tsx` (+test), `components/practice/PracticeControls.tsx`, `App.tsx` (MockBuilder un-route only). FORBIDDEN files untouched.
- **Gates:** tsc PASS Â· root matrix **181/181** Â· ops matrix PASS Â· mojibake PASS Â· scope:guard `--mode product` PASS Â· `git diff --check` clean Â· forbidden-file PASS. vitest + linux `vite build` â†’ **CI `quality-gate` GREEN**. **No self-merge; owner LIVE-VERIFIED + squash-merged.**
- **âœ… Owner LIVE-VERIFY = PASS:** concept-row "3â€“5" shows zero 2-mark and the count/display agree; "2â€“3" shows real 3-mark; hub entry still "All"; Back returns to the specific topic; Chapter-test opens; MockBuilder unreachable.
- **NEXT:** PR-E2 (Worksheet) â†’ PR-F (Notes + Examiner's-tips content) â†’ PR-G (deletions). Separately: PR-D.1, [FU-CONTEXTUAL-TUTOR-REBUILD], [FU-CHAPTERTEST-PAGE-REDESIGN].

## âœ… TOPIC HUB PR-D: FINAL-IA LAYOUT (#274, trunk `b57fa79`) â€” MERGED + CI GREEN + OWNER LIVE-VERIFIED
STRUCTURAL/VISUAL â€” rebuilt `ConceptSpine` to MATCH the binding mockup (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html`). Built in an **isolated git worktree** ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-prd-layout-2026-06-20.md`. 4 files +515/âˆ’175; squash `b57fa79`.
- **Learn-first** â€” concept rows are the HERO under a **"Learn the N concepts"** header ("teach yourself first, then practise each"). The topic-level action band moves BELOW them and recedes into a quiet **dashed** zone ("When you're ready â€” practise or test the whole topic").
- **Notes consolidation** â€” one unified **Notes** toggle replaces the old `Formula sheet Â· Proofs Â· Practice all` tab bar (formulae + proofs + mind-map are sections of one Notes view). Honest "coming soon"; the "Practice all" function is absorbed by the band's "Practise this topic". Content = PR-F.
- **Examiner's tips** â€” clickable/expandable `â˜… Examiner's tips` CONTAINER (`aria-expanded`). Seeds the one real `examinerWarning` as a preview tip on seeded topics; honest "coming soon" for the rest. **NO fabrication** â€” the mockup's 4 sample tips were mockup-only, NOT copied; sample-preview placeholders are never shown as real tips. Per-topic tip content = PR-F.
- **Action band (3 buttons, correct hierarchy)** â€” `Practise this topic` (primary, solid green, routes to the existing whole-topic practice = old "Practice all") + `Chapter test` / `Worksheet` (secondary, present-but-inert `aria-disabled` with an honest "Soon" tag) pending their PR-E wiring.
- **Concept "Practise" â†’ concept + mark band** â€” `buildDesktopPracticePath` gained an optional `markBand` param; `DesktopTopicHubPage` now passes `focus: concept.name` + `subtopicHint` + `markBand: concept.marks`. The route CARRIES both; consumption is [FU-PRACTISE-CONCEPT-FILTER] (PR-E).
- **Two-Practise differentiation** â€” topic-level = full "Practise this topic", solid primary, in the band; concept-level = short "Practise", green-tint secondary, in each card. Visually + structurally distinct.
- **Per-row visual badge (honest)** â€” `âœ¦ Visual` shown ONLY where `findVisualForConcept(subject, slug, [concept.name])` is non-null (the same resolver the tutor uses; PR-C hardened it to return null not a wrong `concepts[0]`).
- **MI guard** â€” NO Mistake Intel on the page body; MI stays navy-sidebar chrome (#270/#271 rule held).
- **Responsive + grammar** â€” one responsive component, pure-CSS `@media (max-width:1023px)` reflow, 360px-safe, class-driven (no inline styles). `ConceptSpine.test.tsx` rewritten for the new contract (Notes single-toggle; Examiner's-tips expandable; 3-button band; concept+markBand filter; per-row badge dynamic; byte-identical desktop/mobile CSS).
- **Gates:** tsc PASS Â· mojibake PASS Â· scope:guard `--mode mixed` PASS Â· root matrix **181/181** Â· ops matrix PASS Â· diff-check clean Â· forbidden-file PASS (none touched). vitest + linux `vite build` are linux-only â†’ **CI `quality-gate` GREEN**. **No self-merge; owner LIVE-VERIFIED the layout = GOOD; owner squash-merged; branch + worktree cleaned up.**
- **âš ï¸ Item 7 SPLIT to PR-D.1 (owner-approved):** mobile full-screen toggle for the tutor interactive is a `TeachFlow` render change (not ConceptSpine layout), unverifiable on Windows (vite/vitest linux-pinned), and not part of the mockup gate. **Corrected blast radius:** `TeachFlow` now backs ONLY the one live Topic Hub tutor â€” the old multi-tutor surfaces (`TutorDrawerV2`, `MentorPanel`, `pages/TopicHub.tsx`) are dead code (PR-G deletes them). PR-D.1 spec: desktop side-by-side â†” mobile full-screen TOGGLE, same component + same data, the toggle being the 360px-forced variation.
- **NEW [FU-PRACTISE-CONCEPT-FILTER] (PR-E):** concept-row "Practise" lands on `/practice-hub` (`navigation.ts:75`) not Quick Practice, and its `markBand="1â€“2"` STRING is never consumed (`PracticePage` filters on a numeric `marksFilter` bucketed `"1"/"23"/"5"/"4"` â€” `PracticePage.tsx:182`,`326-329`; `markBand` never read). Owner-verified on Trigonometry + Light. PR-E fix: route to quick-practice directly + translate the band string â†’ bucket-set (`1â€“2`â†’{1,23}, `3â€“5`â†’{23,5}, â€¦), **path-conditional** (band pre-applied only on the concept-row entry; the Practice-hub entry stays student-controlled).
- **NEXT:** PR-E (chapter-test + worksheet wiring + [FU-PRACTISE-CONCEPT-FILTER]) â†’ PR-F (Notes + Examiner's-tips content) â†’ PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set). Separately: PR-D.1 (mobile tutor toggle), [FU-CONTEXTUAL-TUTOR-REBUILD].

## âœ… TOPIC HUB PR-C: CONCEPT TUTOR "TEACH ME" FLOW (#272, trunk `d9ba545`) â€” MERGED + CI GREEN + OWNER LIVE-VERIFIED
BEHAVIORAL â€” the cohesive concept-tutor FLOW wired on BOTH platforms; built in an isolated git worktree ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-prc-tutor-2026-06-19.md`. 4 files +160/âˆ’28; squash `d9ba545`.
- **"Teach me" LIVE on the spine** (`components/topichub/ConceptSpine.tsx`): inert "Learn this" â†’ **"Teach me"** opening the EXISTING `ConceptTeachDrawer` â†’ `TeachFlow` â†’ `/api/mentor` `concept_teach`. Spine owns drawer open/close state + passes the clicked concept's `{topicKey:slug, subject, concept:name, questionText:""}`, mounted fresh per concept. **One responsive mount = both platforms** (spine renders at all widths via `DesktopTopicHubPage.tsx:218`). Dead `TutorDrawerV2`/`MentorPanel` untouched.
- **`findVisualForConcept` wrong-visual fix** (`data/visualConceptRegistry.ts`, GATED `src/data`, owner-authorized for THIS fix only): empty terms + below-confidence (`score<=3`) â†’ **`null`** not `concepts[0]`. Threshold mirrors the sibling resolver; correct-match path unchanged. Anti-fabrication: no visual beats the wrong visual. Shared resolver also corrects `TeachFlow`/`TutorMessageRenderer`/`DiagramBlock`.
- **Earned-reveal client support** (`components/tutor/TeachFlow.tsx`, scoped to `concept_teach`): no eager auto-open on mount (teach-first); `sendMessage` honours a server-pushed visual on follow-up turns (mirrors `startLearning`). `learn_teach` unchanged. Side-by-side(desktop)/stacked(mobile) split already existed.
- **Tests** (`ConceptSpine.test.tsx`): "Teach me" opens the drawer (vi.mock'd); findVisual null-not-wrong cases. **Gates:** tsc Â· mojibake Â· root matrix **181/181** Â· ops matrix Â· scope:guard `--mode mixed` Â· diff-check â€” all PASS. **CI `quality-gate` GREEN** (linux `vite build`); vitest in Codespaces (not the quality-gate). No forbidden files beyond the authorized `visualConceptRegistry.ts`. **No self-merge; owner live-verified + squash-merged; branch deleted (local+remote); worktree removed.**
- **âœ… Owner LIVE-VERIFY = PASS:** "Teach me" opens the tutor on both platforms; findVisual returns null not a wrong visual; earned-reveal client support in.
- **âš ï¸ NEW [FU-CONTEXTUAL-TUTOR-REBUILD] (NOT a PR-C defect):** the tutor's CONTENT behaviour (scripted "Ravi Sir / Step N of 5"; doesn't respond contextually to student input) is a **pre-existing `/api/mentor` `concept_teach` engine** issue PR-C correctly wired into but was never scoped to rebuild â†’ separate upcoming workstream (contextual-tutor rebuild).
- **Deferred to PR-D (flagged):** mobile shows the visual **stacked**, not a full-screen **toggle**; per-row visual badge rendering.
- **NEXT:** PR-D (Topic Hub layout / action-band / Examiner's tips / Notes-consolidation), fresh worktree, vs the FINAL IA (#268).

## âœ… DOCS(DESIGN): FINAL TOPIC HUB IA COMMITTED (#268, trunk `a280685`) â€” MERGED + CI GREEN
DOCS-ONLY. Records the owner-approved **FINAL Topic Hub information architecture** as the in-repo binding reference for the
Learn-Flow rebuild (PR-C onward). **Supersedes the previously committed locked spec (#261).** Built in an **isolated git
worktree** ([FU-WORKTREE-ISOLATION] honoured). Report: `report-topichub-final-ia-docs-2026-06-19.md`. 3 files +407/âˆ’1.
- **Files (all `docs/design/`):** NEW `topichub_ia_mockup_FINAL_2026-06-19.html` (owner-approved visual â€” the chat attachment
  was mojibake-corrupted in transit, so the clean on-disk UTF-8 original was copied **byte-identical**, `cmp` IDENTICAL, 19,515 B);
  `LazyTopper_Learn_Flow_Spec_LOCKED.md` (top FINAL IA SUPERSESSION block + a "read this first" note on the original section);
  `TOPICHUB_BUILD_REFERENCE.md` (final-IA note, HTML as binding source #3, planned PR sequence).
- **Final IA (supersedes #261):** learn-first hierarchy (concept rows = HERO; topic action band recedes into a quiet/dashed zone) Â·
  **Notes = ONE unified view** (formulae + proofs + mind-map sections â€” replaces split Formula-sheet/Proofs tabs) Â·
  **Examiner's tips = clickable panel** of 3â€“4 per-topic tips (replaces the single buried line; authored content, anti-fabrication) Â·
  concept action **"Teach me"** (was "Learn this") Â· concept **"Practise"** auto-filtered to concept + mark band Â·
  topic band = **Practise this topic / Chapter test / Worksheet** ("Worksheet" was "Generate worksheet") Â· two-Practise
  differentiation Â· navy product sidebar is a **constant** (its **Mistake Intel panel is global chrome on every page â€” NOT on the
  Topic Hub page body**; the "no MI on the Topic Hub page" rule is UNCHANGED by the final IA) Â· Category (B) split-with-parity stands.
- **Planned PR sequence:** PR-C (tutor flow) â†’ PR-D (layout/action-band/tips/notes-consolidation) â†’ PR-E (chapter-test + worksheet
  wiring) â†’ PR-F (content fill) â†’ PR-G (delete dead old-mobile). On the Topic Hub the final mockup wins over the older
  `01_full_flowâ€¦` prototype. (PR-B concept-spine already landed via the mislabeled `c418f59`/#266.)
- **Gates:** docs-only scope (0 src/config/CI/auth) Â· forbidden-file check PASS Â· mojibake 0 hits (project regex over the 3 files) Â·
  `git diff --check` clean Â· internal links resolve Â· **CI `quality-gate` GREEN (1m12s)** + Vercel PASS. **Not self-merged**
  (adds an `.html`, outside the `.md`-only auto-merge policy) â†’ owner-merged, mirroring #261. Worktree removed post-merge.

## âœ… AI-TIER FU-RANK-MOCKS-HPQ â€” SOFT AI-DEMOTION ON FULL MOCK + TOPIC MOCK (#259, trunk `775ee75`) â€” MERGED + CI GREEN
ARCHITECTURAL ranking-parity follow-up to PR2a. PR2a's `SOURCE_MULTIPLIER` only reached the practice paths
(`getLikelyQuestionsForConcept`); the mock engines use `getAllQuestions()` + their own selection and still drew AI at full parity.
GATED `src/` edits (`predictionCore` + the two mock engines), owner-authorized for this ranking-extension scope only. Authority:
PR2a (`686f737`) + `report-ai-tier-audit-2026-06-17.md` â†’ `AGENT_aitier_rank_mocks_hpq_2026-06-18.md`. Report:
`report-ai-tier-rank-mocks-hpq-2026-06-18.md`. 4 files +209/âˆ’11; squash `775ee75`.
- **Reused PR2a's ONE multiplier** â€” exported `getSourceMultiplier` from `predictionCore.ts` (no values changed: authentic 1.0 /
  predicted 0.6 / ai 0.3; `predictionTypes.ts` untouched). No second provenance mechanism â€” the `_source` stamp PR2a attaches at
  ingest rides on the objects `getAllQuestions()` returns.
- **Full Mock (`unlimitedPaperEngine`):** `weightedSelect` â†’ `predWeight *= getSourceMultiplier(q)` per section/marks slot; new
  `sourceWeightedPick` makes the guaranteed-archetype **prefill** authentic-first (was uniform-random); `weightedSelect` exported
  for the test.
- **Topic Mock (`topicMockEngine`):** `weightedShuffleByScore` weight `*= getSourceMultiplier(q)` per slot; exported for the test.
- **âš ï¸ Boundary correction (load-bearing):** the instruction assumed HPQ also uses `getAllQuestions()` + serves AI at parity â€”
  **WRONG.** HPQ (`highlyProbableQuestions.ts`) is a hand-authored curated bank; never calls `getAllQuestions()`; ZERO AI-pack
  content (none in `AI_GENERATED_QUESTION_IDS`; `hpqCompetencyAdditions` curated too) â†’ nothing to demote (Ã—1.0). Left
  **untouched** (no cosmetic no-op). **All AI-bearing surfaces now covered: Quick Practice/topic practice (PR2a) + Full Mock +
  Topic Mock (this PR); HPQ was already AI-free.**
- **Structure-preserving + count integrity:** demotion is WITHIN each constrained section/marks pool, never global; soft
  (`0.3/0.6`, never 0; additive base/topic/rng terms keep every candidate selectable) â†’ an authentic-thin slot still fills with AI,
  no slot left empty; blueprint loop / section counts / pools unchanged â€” only WHICH question fills each slot changed; zero
  question added/removed. Repair passes left as-is (rare hard-constraint satisfiers).
- **New follow-up â€” [FU-AITIER-RANK-DIFFICULTY-HELPERS]:** `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` also call
  `getAllQuestions()` and serve AI at parity, but were out of this PR's named scope + authorized file list â†’ future owner-authorized
  PR (NOT touched).
- **Tests / gates.** `mockEngineSource.test.ts` â€” **Codespaces vitest 7/7 PASS** on `ba2f619` (tier order soft; per-slot authentic
  preference; all-AI / authentic-thin slot still fills â€” for both engines). CI quality-gate does NOT run vitest â€” verified in
  Codespaces (`ubiquitous-robot`). Local: tsc PASS Â· root matrix **181/181** Â· ops matrix PASS Â· mojibake PASS Â· scope:guard
  `--mode mixed` PASS Â· diff --check clean. No forbidden files. **No self-merge; owner squash-merged; branch deleted.**
- **NEXT (owner; queued):** **[FU-AITIER-MARKS-MISMATCH]** content pass for the 7 quarantined pack items Â·
  **[FU-AITIER-RANK-DIFFICULTY-HELPERS]** (difficulty-helper surfaces).

## âœ… AI-TIER PR2b â€” STRIP FABRICATED pastBoardYear (#257, trunk `d6e0e14`) â€” MERGED + CI GREEN
Anti-fabrication strip on the predicted/HPQ layers + serving-logic cleanup. GATED `src/data/` + `src/engine` + `src/prediction`
+ `src/utils` + `scripts/ops` edits, owner-authorized **Option A** (full strip). Authority: `report-ai-tier-audit-2026-06-17.md` â†’
`AGENT_aitier_pr2b_pastboardyear_strip_2026-06-18.md`. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`.
11 files +113/âˆ’106; squash `d6e0e14`.
- **WHY:** predicted/HPQ questions carried a self-asserted `pastBoardYear` with no traceable PYQ reference â€” anti-fabrication
  violation. Authentic PYQs use the traceable `pyqYear` (759 values); the authentic `questionBanks/**` tree has ZERO `pastBoardYear`.
- **âš ï¸ Boundary correction (the load-bearing finding):** the instruction assumed **75 values / 2 files**. Exhaustive repo-wide
  enumeration (owner-mandated before any strip â€” "prove there's no 5th file") found **96 values / 5 files** (undercount of 21):
  `predictedQuestions.ts` 55 Â· `predictedQuestionsScience.ts` 20 (incl. **8 non-numeric `"Model"`**) Â·
  `class10SciencePredictiveEngine.ts` 12 Â· `highlyProbableQuestions.ts` 8 (student-facing HPQ) Â·
  `scripts/ops/hpq_phase2_acceptance.entry.ts` 1 (test fixture). Cross-checked tracked non-`.ts` files (json/js/mjs) = none;
  the only surviving `pastBoardYear: "â€¦"` literals are intentional inputs in the new test.
- **Strip:** all 96 value lines removed (field-removal only; nothing invented). **`predictionTypes.ts` (forbidden) NOT touched** â€”
  the optional field stays declared, all values gone.
- **Consumer cleanup â€” all 8 `.pastBoardYear` reads removed (0 remain repo-wide):** `predictionCore` dedup tiebreaker â†’
  **score-only** (the `!!q.pastBoardYear && !existing.pastBoardYear` clause was always-false post-strip); `predictionCore`
  + `mockPaperEngineScience` `sourceYearHint` â†’ `targetYear-1`; `predictionCore` math+science converters + `predictionScoring`
  + `paperEngine` + `hpqConfidence` â†’ dropped the dead `pastBoardYear` 5-signal-input field.
- **KEY FINDING â€” HPQ confidence does NOT shift (dead plumbing).** The 5-signal scorer (`cbse5SignalScoring`, line 208) and the
  Bayesian recurrence scorer (`probabilisticScoring`) compute recency from the historical dataset's `sourceYear` and NEVER read
  `input.pastBoardYear` / `sourceYearHint` (those appear only at type decls). So stripping the field changes ONLY the dedup
  tiebreaker; HPQ + mock confidence numbers are unchanged. Proven by unit test #4 (identical `compute5SignalScore` with vs without
  `pastBoardYear`).
- **Count integrity:** served bank **total 6,715 UNCHANGED** (tiers {authentic 3,710 Â· ai-generated 2,764 Â· predicted 241};
  `pastBoardYear_remaining=0` at the serving layer); per-file question counts unchanged (predictedQuestions 143, HPQ 91, â€¦).
- **Tests / gates.** `predictionCore.pastboardyear.test.ts` â€” **Codespaces vitest 9/9** (5 PR2b + 4 PR2a regression). Local: tsc
  PASS Â· root matrix **181/181** Â· ops matrix PASS Â· mojibake PASS Â· `scope:guard --mode mixed` PASS (`lanes=product+trackedTooling`)
  Â· diff --check clean. No forbidden files. **No self-merge; owner squash-merged.** Note: `hpq_phase2_acceptance` (ops, NOT a CI
  gate) can't run in Codespaces â€” pre-existing `Cannot find package 'esbuild'` in its bundling harness (fails identically on trunk;
  my change there is one clean fixture-line removal).
- **NEXT (owner; queued):** **[FU-AITIER-RANK-MOCKS-HPQ]** (mocks/HPQ ranking) Â· **[FU-AITIER-MARKS-MISMATCH]** content pass for
  the 7. The predicted `0.6` tier is now "earned" â€” no fabricated provenance behind it.

## âœ… AI-TIER PR2a â€” SOURCE-PROVENANCE STAMP + SOFT AI-LOWER RANKING (#255, trunk `686f737`) â€” MERGED + CI GREEN + LIVE-VERIFIED
ARCHITECTURAL â€” changes live serving/ranking on practice surfaces. The audit found AI-lower ranking was **never enforced**:
`getAdjustedScore` had no source term and the file/suffix tier marker was destroyed at the bank concatenation (~41% AI at full
parity). GATED `src/data/` edits, owner-authorized for this scope. Authority: `report-ai-tier-audit-2026-06-17.md` â†’
`AGENT_aitier_pr2a_provenance_ranking_2026-06-18.md`. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`.
3 files +265/âˆ’9; squash `686f737`.
- **Change 1 â€” provenance stamp at ingest (`canonicalQuestionBank.ts`, additive).** `AI_GENERATED_QUESTION_IDS: ReadonlySet<string>`
  built from the **54 `.pack[1-3]` source arrays** (the documented file/suffix rule; id-pattern derivation was REJECTED because the
  `2026-â€¦` prefix collides between the predicted layer and the curated inline items). The `canonicalQuestionBank` array itself is
  **untouched** â€” no reorder, no adds/deletes â€” so total + per-topic counts are unchanged by construction.
- **Change 2 â€” soft ranking (`predictionCore.ts`).** New local `QuestionSource = "authentic"|"ai-generated"|"predicted"` on the
  `CanonicalQuestionWithScore` intersection (the forbidden `predictionTypes.ts` is NOT edited â€” same pattern already used for
  `_adjustedScore`). Stamped at the merge: predicted converters set `"predicted"`; canonical items classified by
  `AI_GENERATED_QUESTION_IDS.has(id)`; `dedupeById` made generic so `_source` survives. `getAdjustedScore` multiplies by
  `getSourceMultiplier` â€” **`SOURCE_MULTIPLIER = { authentic: 1.0, predicted: 0.6, "ai-generated": 0.3 }`** (owner-locked; SOFT,
  never zero; one tunable place; unstamped defaults to authentic â€” never demote on missing data).
- **Surfaces COVERED** (route through `getAdjustedScore` via `getLikelyQuestionsForConcept`): **Quick Practice / topic practice**
  (`practiceSetGenerator.generatePracticeSet` :248, `predictionDataService` :53). **NOT yet covered â†’ [FU-AITIER-RANK-MOCKS-HPQ]:**
  **Full Mock** (`unlimitedPaperEngine` :353), **Topic Mock** (`topicMockEngine` :147), **HPQ** (`highlyProbableQuestions`, own pool)
  all use `getAllQuestions()` + their own selection â€” they need the same `sourceMultiplier` in a later PR (flagged, not silently
  missed).
- **Exact live tier split (Codespaces, authoritative):** **total 6,715 = authentic 3,710 (55.3%) Â· ai-generated 2,764 (41.2%) Â·
  predicted 241 (3.6%) Â· 0 unstamped.** Authentic > AI; AI share < 60%. Authentic is **790 short** of the 4,500 retirement
  threshold. (Note: live AI 2,764 > the static grep estimate 2,594 â€” `.pack1` builds ids via a builder, so the literal-id grep
  undercounted; the runtime id-set captures all of them.)
- **Tests / gates.** `predictionCore.source.test.ts` added â€” **vitest 4/4 PASS in Codespaces** (equal-base authentic > ai; soft so
  a strong ai still outranks a weak authentic; tier order authentic > predicted > ai, none zeroed; live-pool drift guard). NOTE:
  the CI `quality-gate` does **not** run vitest (root matrix Â· mojibake Â· linux build Â· ops matrix) â€” the suite was verified in
  Codespaces. Local gates: tsc PASS Â· root matrix **181/181** Â· ops matrix PASS Â· mojibake PASS Â· `scope:guard --mode mixed` PASS Â·
  diff --check clean. No forbidden files touched. **No self-merge; owner squash-merged.**
- **âœ… Owner-requested live-verify = PASS** (functional, real serving path `getLikelyQuestionsForConcept`, Codespaces on `686f737`):
  on ~50%-AI topics the first AI question lands deep in the list, so a 10-question Quick Practice serves **all authentic** â€”
  Real Numbers (n=193, 49% AI) first-AI @#97 Â· Triangles (n=292, 52%) @#127 Â· Trigonometry (n=428, 53%) @#186 Â· Light (n=343, 30%)
  @#239 (one `predicted` at #7 â€” correct tier order) Â· Electricity (n=321, 30%) @#217. Before PR2a, AI interleaved at parity.
- **Decisions locked:** multipliers `1.0/0.6/0.3`; **curated-26 inline items stay authentic â†’ [FU-CURATED-26-PROVENANCE]**
  (owner-logged). **OUT OF SCOPE (untouched):** `pastBoardYear` strip (PR2b â€” now unblocked by this stamp), the 7
  `[FU-AITIER-MARKS-MISMATCH]` items, AI-pack retirement.

## âœ… AI-TIER PR1b â€” PACK-FILE 5-MARK RETAGS (#253, trunk `f83915b`) â€” MERGED + CI GREEN
Relabel-only follow-up to #251 that drains the `PACK_5MK_SHORT_BACKLOG`. GATED `.pack` edits, owner-authorized for this scope
only. Authority: `report-aitier-pr1-mechanical-2026-06-17.md` + cofounder Group-A/B classification â†’
`AGENT_aitier_pr1b_pack_retags_2026-06-17.md`. Report: `report-aitier-pr1b-pack-retags-2026-06-18.md`. 9 files +34/âˆ’19; squash `f83915b`.
- **Group A â€” 12 relabelled `format:"Short"â†’"Long"`** (label-only; each confirmed a genuine 5-mark long-answer by reading its
  `questionText`): `ARC2-016, ARC2-017, ABS2-048, CC2-048, CR2-044, CR2-045, CR2-046, HEC2-039, LT2-016, LT2-024, ME2-025, REP2-048`.
  Packs use `format` directly, so the value carries straight to the canonical question (no `toCanonicalFormat` mapping needed).
- **âš ï¸ `PR2-018` reclassified on inspection** (the instruction's safeguard): "3 red, 4 green, 5 blue â†’ P(not blue)" is a single-step
  `7/12` one-liner, NOT a 5-mark long-answer â†’ **moved to Group B, not relabelled**. Group A = **12** (not 13).
- **Group B â€” 7 QUARANTINED** (contentâ†”marks mismatch; short questions wrongly tagged 5-mark; NOT relabelled â€” relabelling would
  worsen them): `TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018`. Kept pinned in `PACK_5MK_SHORT_BACKLOG`
  (now annotated) so the guard tracks them with no regression â†’ **[FU-AITIER-MARKS-MISMATCH]** (later marks/content pass).
- **Backlog 19 â†’ 7.** Count UNCHANGED (symmetric per-file diffs; 0 adds/deletes/marks/rewrites). **[FU-AITIER-PACK-5MK-SHORT]
  RESOLVED** (relabel half). Gates: tsc PASS Â· root matrix **181/181** (backlog now 7) Â· ops matrix PASS Â· mojibake PASS Â·
  scope:guard `--mode mixed` PASS Â· diff --check clean. No forbidden files touched. **No self-merge; owner squash-merged.**

## âœ… AI-TIER PR1 â€” MECHANICAL CONTENT-INTEGRITY (#251, trunk `f4a41b6`) â€” MERGED + CI GREEN
First remediation from the read-only AI-tier audit (`report-ai-tier-audit-2026-06-17.md`). Mechanical/safe only â€” NOT
ranking/provenance (that is PR2). Authority: `AGENT_aitier_pr1_mechanical_2026-06-17.md`. Report:
`report-aitier-pr1-mechanical-2026-06-17.md`. 5 files +237/âˆ’41; squash `f4a41b6`.
- **`QuestionKind` += `"Long"`** in `predictedQuestions.ts` + `predictedQuestionsScience.ts` (confirmed NOT in forbidden
  `predictionTypes.ts`; only `switch(node.kind)` is on Markdown nodes â€” unrelated). `predictionCore.toCanonicalFormat` maps
  `kind:"long"â†’format:"Long"` â€” required so the retag reaches the unified bank rather than staying cosmetic.
- **24 retags** `kind:"Short"â†’"Long"` on five-mark Section-D predicted items (12 maths + 12 science). The 25th audit item is Q10,
  which is **split** rather than retagged.
- **Q10 split:** `2026-RN-LA-03` (fused alarm-clock LCM + prove-âˆš5, mis-tagged 5mk/Section-D/Short) â†’ `2026-RN-SA-08` (LCM,
  Section C/3mk) + `2026-RN-SA-09` (âˆš5 proof, Section C/3mk). **Net +1** (the only count change). Nothing fabricated;
  `pastBoardYear` omitted on the new items. **[FU-MALFORMED-QUESTION] RESOLVED.**
- **CI guard:** `scripts/src/aiTierContentIntegrityGuard.test.ts` in root `test:matrix:all` (**175â†’181**) â€” fails on fused
  (`/\balso\s+prove\b/i`), sectionâ†”marks mismatch (A1/B2/C3/D5/E4), and 5-mark "Short" (hard on predicted; baseline-pinned on packs).
- **âš ï¸ Audit undercounted â†’ [FU-AITIER-PACK-5MK-SHORT]:** 19 more `format:"Short"` Section-D/5mk defects live in gated
  `.pack2/.pack3` files (out of PR1 scope). Pinned as a shrink-only backlog. **PR1b** (owner-authorized): retag ONLY genuine
  long-answers; **QUARANTINE** contentâ†”marks mismatches (e.g. `TG3-056` "cosec 60Â°", `REP2-039` "name two contraceptives" tagged
  5mk) â€” flag those for a separate content-judgment pass, do NOT relabel.
- Gates: tsc PASS Â· root matrix **181/181** Â· ops matrix PASS Â· mojibake PASS Â· scope:guard `--mode mixed` PASS Â· diff --check clean.
  No forbidden files touched. **No self-merge; owner squash-merged.**

## âœ… "FINISH SESSION" SCORECARD TRIGGER (#249, trunk `704dcff`) â€” MERGED + CI GREEN â€” owner live-verify PASS
Replaces #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** so the
scorecard actually surfaces (students stop when done, not when they've exhausted the set). Authority:
`AGENT_finish_session_scorecard_2026-06-16.md`. Report: `report-finish-session-scorecard-2026-06-17.md`. 2 files +63/âˆ’2;
commit `b740a3f`. **Supersedes #240 sub-task 5.**
- **Finish session button (the load-bearing trigger):** always-available at the foot of a built set, full-width green accent
  (renders on desktop AND mobile widths â€” `PracticePage` is the shared responsive component for `/practice/:grade/:subject`).
  On tap â†’ fires `practice_finish_session_click` (topicÂ·subjectÂ·attemptedÂ·total) + sets `sessionFinished=true` â†’ surfaces the
  scorecard. Gated `isBuilt && filteredQuestions.length > 0 && !showScorecard`.
- **`allDone` kept as a convenience auto-offer:** `showScorecard = (sessionFinished || allDone) && questions.length > 0`. When a
  student happens to attempt every question, the scorecard still auto-appears (#240 behaviour) â€” Finish is the always-present
  primary path. No auto-popup on navigation; the scorecard is deliberate (Finish tap or allDone), never an interruption.
- **Reuses the EXISTING `sessionStats`** (`attemptedInSet`, `localMcqAnswered`, `localMcqCorrect`) â€” no new counters, no new
  persistence, no session-lifecycle state machine (STOP-IF-IT-BALLOONS guard honoured). The only trigger changed.
- **Partial-session honesty (the critical requirement):** the header uses **attempted-only denominators** ("{attempted} of
  {total} attempted Â· {correct}/{answered} MCQs correct Â· {accuracy}%" â€” accuracy over MCQs *answered*, never the full set) +
  an explicit "the {M} you didn't reach aren't counted" line on a partial finish + an honest zero-attempt state. Unattempted
  questions are NEVER implied wrong or counted against the student.
- **"Keep practicing this set" escape hatch** on a *manual partial* finish (`!allDone`) returns the student to the same set
  (`setSessionFinished(false)`) so Finish never traps them; not offered on the allDone auto-offer (nothing left to attempt).
- **Reset discipline:** `setSessionFinished(false)` added to the existing fetch-success reset block, so any fresh
  build/regenerate/filter-change clears it alongside mcqSelections/selfAssessments â€” no stale scorecard, no double-count.
- `uxTelemetry.ts` â€” added `practice_finish_session_click` to the typed `UxEventName` union (additive).
- **Gates:** tsc 0 Â· mojibake clean Â· scope:guard product OK Â· root matrix **175/175** Â· lazytopper ops matrix green Â·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #249 (1m8s â€” incl. the linux `vite build`). No forbidden/gated files.
- **âœ… Owner live-verify = PASS â€” partial-session honesty PROVEN:** a **3-of-10 finish** reads *"3 of 10 attempted Â· 0/3 MCQs
  correct Â· 0% accuracy Â· Here's how those 3 went, the 7 you didn't reach aren't counted"*; the **zero-attempt** case reads
  honestly too. [FU-SESSION-SCORECARD-TRIGGER] CLOSED.
- **ðŸž NEW follow-up for the next audit â€” [FU-MALFORMED-QUESTION]:** a live-observed malformed question â€” **Real Numbers Quick
  Practice Q10 fused two questions** (alarm-clock LCM + prove âˆš5) with inconsistent tags (5-mark / Section-D / Short). Suspected
  AI-generated pack origin. To be characterised by the upcoming read-only AI-generated-question-tier audit. See OPEN_QUESTIONS.

## âœ… CHECK & IMPROVE DETECT-THEN-CONFIRM (#246, trunk `c9404e1`) â€” MERGED + CI GREEN â€” owner live-verify PASS 5/6
The UX layer on Claim 2 (#244): detection is now VISIBLE + CORRECTABLE before grading, plus question photo upload. Authority:
`AGENT_detect_then_confirm_2026-06-16.md`. Report: `report-detect-then-confirm-2026-06-16.md`. 9 files +935/âˆ’78; commit `3e00ac4`.
- **Core principle:** detect-then-CONFIRM, never declare-from-scratch. The default stays pure auto-detection; the old
  subject/topic/marks fill-in form was NOT rebuilt. The student touches a value only if it's wrong (constrained correction).
- **Flow (both desktop + app):** question by type/paste/**photo of the question** (distinct slot vs the answer photo) â†’
  **"Read the question â†’"** â†’ detection-ONLY `POST /api/detect-question` on the question alone (one deliberate, cheaper call;
  a photo is passed so the AI reads the PRINTED marks) â†’ **confirmation chip** (subjectÂ·topicÂ·marks + source) with quiet
  **[Change]** â†’ constrained correction (topicâ†’canonical key via Fix A's resolver; marks 1â€“6; subject toggle; corrected mark
  â†’ `marksSource:"user"`) â†’ grade on the CONFIRMED values via the unchanged trusted-marks path.
- **Server:** new `handleDetectQuestion` (`checkSolution.cjs`) + `/api/detect-question` (`questions.cjs` + `index.cjs`). The
  grader `handleCheckSolution` is **untouched** (no grading-semantics change).
- **Override logging:** when the student corrects the detection, the attempt record carries `marksSource` + `detectionOverride
  {detected, confirmed}` â€” reuses `recordAttempt` â†’ localStorage + Firestore-mirror (no new collection, no `firestore.rules`).
  Internal telemetry for classifier-accuracy; never shown to the student.
- **âš ï¸ `SHOW_DETECTION_META` flag (shared helper `checkImproveDetection.ts`) â€” default ON for the owner testing phase.** It
  gates ONLY the meta-display (the "read from the question" / "estimated" source label) â€” NOT the detected values or the
  Change control (those stay visible + correctable even at launch). **MUST be flipped to `false` before shipping to students
  â€” shipping with the machinery still showing would be a real miss (the tester-vs-student line). Logged as
  [FU-DETECTION-META-LAUNCH-FLIP], a hard PRE-LAUNCH gate â€” see OPEN_QUESTIONS.**
- **Out of scope (respected):** bank-grounding/retrieval for detection (deferred behind Fix B); no `src/data` reach.
- **Gates:** tsc 0 Â· 3Ã— `node --check` Â· root matrix **175/175** Â· lazytopper ops matrix green (incl. llm-path 5/5) Â· mojibake
  clean Â· scope:guard product OK Â· `git diff --check` clean Â· `clampDetectedMarks` 9/9 + `buildConfirmedDetection` proofs.
  **CI `quality-gate` GREEN** on #246 (1m7s â€” incl. the linux `vite build` + vitest). No forbidden/gated files touched.
- **âœ… Owner live-verify of #246 = PASS 5/6:** (1) printed marks read correctly, no marks picker; (2) inference GENUINE +
  graduated â€” a short AP question infers **2**, a proof infers **3** (they diverge â†’ real inference, not a blind constant);
  (3) **photo** of a printed-marks question reads the printed value, two distinct upload slots; (4) **Change** corrects a wrong
  detection â†’ grades the corrected value, topics bucket to a clean canonical key on Me; (5) selectors gone desktop AND mobile.
- **ðŸž [FU-DETECTION-MARKS-CEILING] (the 6th â€” known issue, NOT a blocker):** inference **under-calls true 5-mark questions**
  (multi-part numerical + proofs) as **3** â€” the inferred scale tops out below 5 for the heavy items. **Caught-and-correctable
  via [Change]** (the student bumps it to 5), so it does not corrupt grading â€” the detect-then-confirm design absorbs it. Fix
  candidates (later): tune the detection prompt's mark heuristic toward 5 for multi-part/derivation/proof items; OR
  bank-grounding (deferred behind Fix B). See OPEN_QUESTIONS.

## âœ… CHECK & IMPROVE AUTO-DETECT (#244, trunk `43ffa09`) â€” MERGED + CI GREEN â€” owner live-verify PENDING
Claim 2 (owner-ruled option (a): infer from the provided question). The grader now determines marks/subject/topic from the
question it already receives, instead of the student picking them (bad UX + eval contamination). Authority:
`AGENT_claim2_autodetect_marks_2026-06-16.md`. Report: `report-claim2-autodetect-marks-2026-06-16.md`. 6 files +330/âˆ’238;
commit `d93cd23` (server + client + 2 UI + shared helper + test).
- **Isolation â€” a `detectMarks` flag.** `/api/check-solution` is shared by Quick Practice (`SolutionChecker`, marks from the
  canonical bank â€” authoritative) and Check & Improve (student-guessed). The detection path is opt-in: when `detectMarks` is
  absent the handler is **byte-identical** to before (`effectiveMarks = marks`, same cap/`totalMarks`/percentage). Only Check
  & Improve sets it â†’ blast radius stays on Check & Improve.
- **Server (`checkSolution.cjs`):** when `detectMarks`, the prompt asks the AI to determine `detectedMarks` (printed value
  preferred â†’ `marksSource:"stated"`; else inferred from type/depth â†’ `"inferred"`; validated to `[1,6]`, else a flagged
  `"fallback"` â€” never a silent static 3), `detectedSubject`, and `detectedTopic` (constrained to the canonical `topics.ts`
  vocabulary the client passes â€” exact key or null, never invented). `effectiveMarks` drives the cap + percentage. Per-step
  grading rules / error-propagation / additive-floor reconcile UNCHANGED â€” only the SOURCE of marks/subject/topic changed.
- **Client (`aiClient.ts`):** `checkSolutionImage` gains optional `marks` + `detectMarks` + `topicVocabulary`; response gains
  `detectedSubject`/`detectedTopic`/`marksSource`.
- **UI (`DesktopCheckImprovePage` + app `CheckImprove`):** the manual marks/subject/topic selectors are REMOVED; both send
  `detectMarks` + the canonical vocab and build the graded context from the detected response. The detected topic is
  canonicalised via the shared `resolveDetectedGradeTopic()` helper (`src/utils/checkImproveDetection.ts`), which reuses
  Fix A's `desktopTopicForWeakAreaKey` â€” **no new normaliser** â€” so MI attribution lands on a real `topics.ts` key (the app
  variant's old free-text dropdown stored non-canonical labels like `"Light"`). Honest fallbacks: unresolved/absent topic â†’
  full-subject; subject â†’ resolved topic's subject, else AI's detectedSubject, else Maths.
- **Anti-fabrication:** never invents marks (printed â†’ inferred â†’ flagged fallback) or a topic (canonical list or null). No
  grading-semantics drift beyond the marks source.
- **Gates:** tsc 0 Â· server `node --check` OK Â· root matrix **175/175** Â· lazytopper ops matrix green Â· mojibake clean Â·
  scope:guard product OK Â· `git diff --check` clean Â· helper Node-replication proof **6/6**. **CI `quality-gate` GREEN** on
  #244 (1m21s â€” incl. the linux `vite build` + the new vitest). No forbidden/gated files touched (gated resolver imported only).
- **â³ Owner live-verify PENDING (decisive):** (1) question stating "[3]" â†’ graded /3 without entering marks; (2) question with
  no printed mark â†’ sensible inferred scale, not a blind 3; (3) detected topic buckets correctly on Me â–¸ weak-areas (real key,
  routes to practice via Fix A); (4) selectors gone at desktop (â‰¥1024px) AND mobile width.

## âœ… topicKey FIX A (#242, trunk `77f2ed2`) â€” MERGED + CI GREEN â€” owner live-verify PENDING
The repair half of the topicKey-duplication problem the read-only audit (`report-topickey-duplication-audit-2026-06-16.md`)
mapped. **Ungated, read-time only** â€” repairs existing users WITHOUT a data migration. Authority:
`AGENT_topickey_fixA_me_resolver_2026-06-16.md`. Report: `report-topickey-fixA-me-resolver-2026-06-16.md`.
3 files (+114/âˆ’2; `topics.ts`, `DesktopMePage.tsx`, new `topics.weakarea.test.ts`); one commit `4eb2320`.
- **The bug:** the Me "Topics dragging your score" row resolved each stored (raw, un-canonicalised) topic label through
  `desktopTopicBySlug` â€” the weakest of the three topicKey normalisers, which does NOT camelCase-split. The audit proved
  **exactly 13** in-bank spellings fail it (11 PascalCase Science abbreviations: `Light`, `LifeProcesses`, `AcidsBasesSalts`,
  `HumanEyeAndColourfulWorld`, `CarbonCompounds`, `ControlAndCoordination`, `MetalsNonMetals`, `ChemicalReactions`,
  `MagneticEffects`, `HeredityEvolution`, `OurEnvironment`; + 2 `science_*`: `science_light_reflection_refraction`,
  `science_reproduction`). Those rows silently routed to `/exam-trends`. **Named repro: the Light row.**
- **Change 1** â€” new `desktopTopicForWeakAreaKey()` wraps `desktopTopicBySlug` with the SAME strong resolver the serving
  surfaces already use (`getRuntimeTopicCandidates` â€” camelCase split + canonical alias map): try the raw key, then each
  runtime candidate. **Reuses** the existing resolver; **no fourth normaliser.** Unknown topics still return `undefined`, so
  the honest `/exam-trends` fallback is preserved. `DesktopMePage.resolveTopicMeta` now calls it.
- **Change 2** â€” 13 `TOPIC_ALIASES` entries mapping each failing normalized spelling to its canonical `topics.ts` slug
  (belt-and-braces for cases the strong map routes to a non-`topics.ts` canonical, e.g. `HeredityEvolution`).
- **NOT this PR (HELD):** the bank-key data consolidation + CI guard = **Fix B / [FU-TOPICKEY-CONSOLIDATION]** â€” owner-
  authorized-later. Fix A does NOT rewrite `src/data` or stored learner records; it fixes RESOLUTION at read time, which is
  exactly why it repairs existing users with no migration.
- **Proof:** `topics.weakarea.test.ts` asserts all 13 resolve to the correct slug+subject, an arbitrary non-aliased variant
  (`carbon-compounds`) resolves via the candidate bridge, and unknown/empty keys still fall back. Faithful Node replication of
  the live chain = **20/20 PASS** pre-merge (local vitest + `vite build` are linux-pinned â†’ run in CI).
- **Gates:** tsc 0 Â· root matrix **175/175** Â· lazytopper ops matrix green Â· mojibake clean Â· scope:guard product OK Â·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #242 (incl. the linux `vite build` + the new vitest).
- **â³ Owner live-verify PENDING:** (1) Light row â†’ Quick Practice not Exam Trends; (2) a second previously-failing Science
  topic (Magnetic Effects / Human Eye) â†’ practice; (3) Real Numbers (already working) â†’ no regression; (4) an unknown topic
  â†’ still falls back gracefully.
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] RESOLVED** by this PR (pending the live-verify above).

## â­ï¸ NEXT (owner-re-sequenced post-#242): (ii) "Finish session" PR â†’ (iii) gated-spelling â€” then (2) MI eval â†’ (3) Stage 3 â†’ Fix B
The topicKey audit (i) + Fix A (#242) are done. The items below are QUEUED but **NOT yet authorized** â€” the owner sends each
as its own instruction, branched fresh against `77f2ed2`. Do not start until instructed.
1. **(i) Read-only topicKey audit â€” âœ… DONE** (`report-topickey-duplication-audit-2026-06-16.md`); Fix A (#242) shipped the
   repair half; **Fix B (data consolidation + CI guard) = [FU-TOPICKEY-CONSOLIDATION] is HELD / authorized-later.**
2. **(ii) "Finish session" scorecard-trigger PR â€” small.** Replace the scorecard's `allDone`-only trigger with an explicit
   student-declared "Finish session" action; honest on PARTIAL sessions (don't imply completion). Finishes sub-task 5's
   intent (the redesign that makes the scorecard confirmable).
3. **(iii) Gated-spelling follow-up â€” [FU-SPELLING-GATED-REMAINDER].** Owner-authorized separate PR for the ~60
   `src/data/**` + `src/lib/desktop/loginPrompts.ts` rendered "Practise" strings #240 could not touch (gated dirs).
4. **(2) MI eval â€” [MI-EVAL]** check-solution eval set (launch gate; unblocks eval-gated items).
5. **(3) MI Loop Stage 3 â€” concept-level targeting (eval-gated, [FU-DRILL-ENRICHMENT]).** Not before the eval.

## âœ… MI POLISH BATCH (#240, trunk `9eff0b0`) â€” MERGED + CI GREEN â€” owner live-verify 4/5 PASS
One PR, five surface/ranking sub-tasks on the finished MI loop (NOT eval-gated; no new data plumbing). Authority:
`AGENT_mi_polish_batch_2026-06-14.md`. Report: `report-mi-polish-batch-2026-06-15.md`. 7 files +122/âˆ’79; one commit per
sub-task (`af881a8` ranking Â· `72d0e1b` CTAs Â· `4cd837a` MCQ nudge Â· `11494d4` spelling Â· `7a6cadd` scorecard).
- **Sub-task 1 [FU-WEAKAREA-ACCURACY-RANK] â€” VERIFIED.** `computeWeakAreas` ranks by **blended severity**
  (`marksLost + lowAccuracyDrag`); a topic weak only via wrong MCQs (0 marks lost, â‰¥3 attempts, <40% accuracy) now
  surfaces. Graded topics with accuracy â‰¥40 keep prior ordering (drag = 0). Deterministic.
- **Sub-task 2 [FU-WEAKAREA-CTAS] â€” VERIFIED (with one bug, see below).** Every weak-area row routes to an auto-served
  topic-scoped practice set via the existing Stage-1 `gotoPracticeForTopic`; honest fallback to topic-hub/trends when a
  topic has no hub slug; gated `buildDesktopPracticePath` untouched. Dropped the redundant row[0] "Practise" button.
- **Sub-task 3 [FU-MCQ-UPLOAD-NUDGE] â€” VERIFIED.** A wrong MCQ shows "Want to know why? Show your working below." â†’
  reveals the EXISTING inline Check-my-answer box; correct MCQ shows nothing. No new data path.
- **Sub-task 4 [FU-SPELLING-PRACTICE] â€” VERIFIED (partial scope).** "Practise"â†’"Practice" in DesktopMePage/mobile Me/
  DesktopTopicHubPage UI copy. **Gated remainder carried as [FU-SPELLING-GATED-REMAINDER]** (~60 `src/data/**` +
  `loginPrompts.ts` strings â€” forbidden dirs, owner-authorized separate follow-up).
- **Sub-task 5 [FU-SESSION-SCORECARD] â€” NOT yet confirmable.** End-of-session scorecard (attempted Â· MCQs correct Â·
  accuracy + honest MI nudge + honest saved-state line) replaced the footer + the mislabeled "MCQ answers: 0/5". Its
  `allDone`-only trigger made it hard to surface in live-verify â†’ **being redesigned into an explicit "Finish session"
  trigger** (queued PR ii). Code shipped; behaviour re-confirmed after the redesign.
- **ðŸž Live bug found ([FU-WEAKAREA-EXAMTRENDS-FALLBACK]):** the **Light â€“ Reflection and Refraction** weak-area row
  routes to **Exam Trends instead of practice** â€” its non-canonical topicKey (en-dash variant + "(inâ€¦)" suffix) fails to
  resolve to a practice slug and hits sub-task 2's honest fallback. **Confirmed symptom of the topicKey duplication
  problem**; to be traced in the upcoming read-only topicKey audit (item i). NOT a regression of the fallback itself.
- **Gates:** tsc 0 Â· mojibake clean Â· root matrix **175/175** Â· ops **22/22** Â· scope:guard product OK Â·
  `git diff --check` clean. **CI `quality-gate` GREEN** on #240 (incl. the linux `vite build` + ops matrix).

## âœ… MI LOOP STAGE 2 â€” Measure-leg PR 3 (#237, trunk `b75f065`) â€” MERGED â€” MEASURE LEG COMPLETE
The last Measure-leg PR: MCQ honest capture. Per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 3 of 3).
Report: `report-mi-loop-stage2-pr3-mcq-2026-06-15.md`.
- **Route MCQ clicks through `recordAttempt`:** `PracticeQuestionCard` MCQ option click â†’ `recordAttempt` (correct = 1/1,
  wrong = 0/1, `mode: "mcq"`, `topic = topicLabel`, `question`, `questionId`, `subject`) â€” the SAME keying graded answers
  use, so MCQ feeds Saved attempts / Accuracy and a **CORRECT MCQ shrinks a weakness via the PR-2 loop-closer**. Recorded
  for both correct + wrong, only when the answer key is trusted (`correctIdx >= 0`); the front door self-guards policy.
- **Removed the hardcoded `conceptual:1` bypass:** the whole direct-`logMistakes` block (+ its now-unused import). A bare
  MCQ click has no working to classify, so a wrong MCQ no longer fabricates a "conceptual" mistake.
- **Wrong-MCQ treatment â€” OWNER-RULED (a) attempt-only:** a wrong MCQ records the 0/1 attempt and NOTHING else (no
  mistake-log entry, no synthesized grade object, no typed category). Option (b) â€” an untyped/objective `recordMistake` â€”
  was declined. Marks-lost / mistake-mix / weak-areas stay sourced from real graded classifications.
- **One front door, no fabrication:** all MCQ signal flows through `recordAttempt` only â€” no direct `logMistakes`, no
  fabricated types, no synthesized grade objects.
- **Gates:** tsc 0 Â· mojibake clean Â· root matrix 175/175 Â· ops 22/22 Â· scope:guard OK Â· `git diff --check` clean. CI
  `quality-gate` GREEN on #237. (`vite build` CI-gated on linux.)
- **â³ Owner live-verify PENDING** (post-merge): wrong MCQ â†’ attempt + Accuracy, NOT conceptual-inflated; correct MCQ â†’
  accuracy + can shrink a weak area; Me "concept gaps" = real graded classifications only.
- **NEXT:** **MI Loop Stage 3 â€” concept-level targeting (eval-gated)** = `generatePracticeSet.conceptKey` from the weak
  concept (needs MI sub-concept capture + the eval set) = **[FU-DRILL-ENRICHMENT]**. (Measure leg done; no more Stage-2 PRs.)

## âœ… MI LOOP STAGE 2 â€” Measure-leg PR 2 (#235, trunk `59f9d18`) â€” MERGED + owner live-verified â€” THE LOOP CLOSES
The return leg. A graded mistake grows the wrong-answer count (Stream 3) via the `recordMistake` bridge; PR 2 makes a
clean correct drill SHRINK it â€” the engine is now bidirectional. Per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 2
of 3). Report: `report-mi-loop-stage2-pr2-loopclose-2026-06-14.md`.
- **Loop-closer (data layer):** in `recordAttempt`, a FULLY-correct attempt (`scored >= available`) decrements one
  active gap for the topic via `clearWrongAnswer` â€” live correct-attempt path (NOT the dormant `recordSelfAssessment`);
  only on a newly-recorded attempt (after dedup â†’ no double-decrement); wrong/partial never shrink; clamped at 0.
- **Key-matching (the G9 alias-fragility class):** the decrement resolves the canonical key with the IDENTICAL
  expression `normalizeTopicKey(ctx.topicKey ?? ctx.topic)` the bridge used to increment (same ctx passed to both doors
  in PR 1) â†’ tautologically equal key; then decrements the stored entry by its OWN keys (exact map-key match). Caught
  the trap that `getWrongConceptsForTopic` keeps `-` but turns spacesâ†’`_` (raw "Real Numbers"â†’"real_numbers" would miss
  "real-numbers") â€” fixed by normalizing first on both data + display paths.
- **"Active gaps remaining" on Me (owner Option 1):** both Me surfaces show the recoverable wrong-answer count
  (`Â· N active gaps to clear`) ALONGSIDE the historical `Â· M marks lost` â€” the **scar** (never shrinks) vs the
  **healing** (shrinks to 0). Did NOT repoint Me to `getWeakAreas` (deferred durable-Me convergence).
- **Pre-merge logic confidence â€” GitHub Codespaces (Linux; mocked/local stores, no Firebase creds):** vitest
  `practiceInsights.loopclose.test.ts` **2/2 PASS** (2-topic decrement + clamp-at-0 + wrong-no-shrink + canonical-slug
  topicKey); `vite build` âœ“ 9.04s; `verify-production-build.mjs` âœ“ exit 0. CI `quality-gate` GREEN on #235.
- **Live verification (owner, PASS):** active gaps shrank to **0 on Real Numbers AND Polynomials** after clean correct
  drills; marks-lost held as the historical scar; wrong answers didn't shrink; clamp held at 0; **mobile parity** confirmed.
- **Residuals logged (see OPEN_QUESTIONS):** **[FU-IMPROVEMENT-CARD]** (clearWrongAnswer DELETES the entry at zero,
  erasing the improvement record â€” before an improvement/journey card on Me, the loop-closer must first record a durable
  "gap cleared" event (cumulative + per-topic + timestamp) in the practiceInsights mirror); **[FU-WEAKAREA-ALIAS-DISPLAY]**
  (active-gaps count under-shows for topics whose label â‰  canonical slug until the alias map covers them; data-layer
  decrement unaffected).
- **NEXT in the loop:** **PR 3 = MCQ honest capture** (last Measure-leg PR) â€” `PracticeQuestionCard` MCQ click â†’
  `recordAttempt` (1/1 or 0/1); stop the hardcoded `conceptual:1` bypass. **Owner-greenlight-gated** â€” do NOT start until
  greenlit.

## âœ… MI LOOP STAGE 2 â€” Measure-leg PR 1 (#233, trunk `57fb7aa`) â€” MERGED + owner live-verified
The MI loop is Capture â†’ Identify â†’ Act â†’ **Measure**. The loop did NOT close: `recordAttempt` had **0 call sites** (empty
scorecard, dead accuracy path). PR 1 makes the engine **measurable** â€” graded scores persist and feed the Me cards. Per
`AGENT_t3_mi_measure_loopclose_2026-06-12.md` (PR 1 of 3). Report: `report-mi-loop-stage2-pr1-recordattempt-2026-06-14.md`.
- **Front door:** the dead `practiceInsights.recordAttempt` is now the real, single `recordAttempt(user, ctx)` â€” the **score-twin
  of `recordMistake`** (policy: skip no-user/local; dedup; localStorage + the **existing** Firestore mirror â€” **no `firestore.rules`
  edit**). Exactly one `recordAttempt` (confirmed-and-replaced the dead one).
- **Marks is the universal unit:** an attempt carries `marksScored`/`marksAvailable`/`mode`; `correct` is **derived** (full marks)
  so the existing %-correct readers are unchanged. `marksScored` clamped to `[0, marksAvailable]` (can't invent marks).
- **Routed all three graded surfaces** (Quick Practice `SolutionChecker` â€” fresh + cache-restore; desktop `DesktopCheckImprovePage`;
  mobile `CheckImprove`) â€” each calls `recordAttempt` alongside `recordMistake`. Records EVERY graded attempt incl. full marks
  (accuracy needs the correct ones). Dedup keyed on `(uid, questionId|hash(question), score, mode)` so a cache-restore never
  double-counts. `topicKey` = human label â†’ attempts **merge** with mistake-log rows (no duplicate weak-area rows).
- **Live-verified PASS (owner):** Saved attempts populate; Accuracy / Accuracy-by-subject / Recent all flow from real graded
  attempts; attempts merged into the **Polynomials** weak-area row (attempts + accuracy alongside marks-lost); X/Y banner confirmed
  as the v1 session scorecard (no new UI).
- **2 follow-ups logged:** **[FU-ATTEMPT-MARKS-ACCURACY]** (Me accuracy still binary â€” marks-weighted is the fuller decision-1
  expression, needs label changes; fast-follow) and **[FU-ATTEMPT-SR]** (the old dead `recordAttempt` fed spaced-repetition; that
  side-effect was intentionally dropped â€” reviving it is its own decision). See OPEN_QUESTIONS.
- **NEXT in the loop:** **PR 2 = close the loop** â€” a correct `recordAttempt` decrements the topic/concept weakness via
  `clearWrongAnswer` (wire to the live attempt path, not the dormant session subsystem). Decisive test: a logged weak area
  (e.g. Real Numbers âˆ’7) **visibly shrinks** on Me after a clean drill. Then **PR 3** = MCQ honest capture through the doors.

## âœ… MI LOOP STAGE 1 â€” Act-leg (#231, trunk `6d80a57`) â€” MERGED + owner live-verified
The MI loop is Capture â†’ Identify â†’ **Act** â†’ Measure. Stage 1 wires the **Act** hand-off so "practise where you lose marks"
finally serves targeted practice (per `LazyTopper_MI_Loop_Culmination_Spec_2026-06-12.md`).
- **Gap A:** desktop + mobile Me weak-area CTAs target the #1 weak topic (highest marks lost); honest generic fallback when no
  weak-area data (no fabricated target).
- **Gap B:** a TARGETED arrival (explicit `?topic=` non-generic, or `targeted=1`) at `PracticePage` now **auto-serves** the
  already-fetched set (flips `isBuilt`); bare subject-level entry keeps the builder; "Edit filters" preserved.
- **Option B (one-click direct):** `gotoPracticeForTopic` â†’ `/practice/10/<subject>?topic=<slug>` directly, bypassing the
  `/practice-hub` chooser so desktop matches mobile. Gated `buildDesktopPracticePath` (â†’ `/practice-hub`) **untouched**.
- **Intent-first guardrail:** generic entries stay open/unscoped â€” never auto-scoped to weak areas.
- **Live-verified PASS:** one-click ready set (desktop + mobile); guardrail holds; served set non-empty (Real Numbers,
  Polynomials); "Edit filters" works. Report: `report-mi-loop-stage1-targeting-2026-06-12.md`.
- **NEXT in the loop:** **Stage 2 = Measure leg** (`recordAttempt` + attempt/score stream â†’ "Saved attempts"/"Accuracy"/weak-area
  shrinking; = the Scorecard spec, reframed as the loop's return leg). **Stage 3** = concept-level targeting (eval-gated).
  5 Stage-1 follow-ups recorded in OPEN_QUESTIONS ([FU-DRILL-ROUTING], [FU-WEAKAREA-LABEL], [FU-WEAKAREA-CTAS],
  [FU-WEAKAREA-HUB-LIMIT], [FU-DRILL-ENRICHMENT]).

## âœ… GRADE-PARSE RESILIENCE (#229, trunk `59e11f6`) â€” MERGED + owner live-verified
The intermittent **"We couldn't read the grading this time"** was **Gemini JSON truncation**: the grading call capped at
`maxOutputTokens: 8000`, long multi-step grades overran it and came back **cut mid-JSON**, and `extractJsonObjectFromText`
(recovers only complete JSON) returned null â†’ failure path. (Same image graded on retry because output length varies; the
client's internal retry only fires on 429.)
- **Fix (`server/routes/checkSolution.cjs`, parse-resilience ONLY):** single bounded retry on a parse-gate miss (no loop);
  `maxOutputTokens` 8000â†’16000 (a cap, not a target); failure-path diagnostics logging `finishReason` + length + tail. **Grading
  semantics untouched** (prompt/rules/mark-scheme/`marksAwarded`/MI reconcile/response shape all unchanged).
- **Live verification (owner, PASS):** `sol_5.jpeg` grades reliably on **both** Quick Practice and Check & Improve, no error;
  grade quality unchanged. (Me reflects after a manual refresh â€” separate known **[FU-ME-REFRESH]**, not a regression.)
- **[FU-GRADE-PARSE] CLOSED.** Two new eval-gated follow-ups recorded: **[FU-GRADE-MARKSCALE]** (Check & Improve marks are
  student-entered, not question-derived â†’ grader should judge the CBSE mark value) and **[FU-GRADE-CONSISTENCY]** (mistake-type
  varies across surfaces; mostly downstream of mark-scale). Report: `report-grade-parse-resilience-2026-06-12.md`.

## âœ… MI CONSOLIDATION P1+P2 (#227, trunk `c618cd5`) â€” MERGED + owner live-verified
The MI Architecture Map (`LazyTopper_MI_Architecture_Map_2026-06-11.md`) exposed MI as 3 capture streams feeding 2 disconnected
analysis layers. P1+P2 builds the **one ingestion front door** and bridges the first gap.
- **`recordMistake(user, gradeResult, context)`** (`src/services/mistakeIntelligence.ts`) is THE entry point: one policy
  (`uid && !isLocalSession` AND `marksAwarded < totalMarks` OR any step `mistakeType`), one builder (replaces desktop
  `buildLogEntry` + mobile `buildMobileLogEntry`, both deleted), dedup (covers the cache-restore path). Routed `SolutionChecker`
  (**deleted the `mistakeCount>0` guard** â€” the Quick-Practice bug), mobile `CheckImprove`, desktop `DesktopCheckImprovePage`.
- **Bridge (Map gap #3, knowledge-gap types):** conceptual+calculation graded mistakes write ONE Stream-3 `WrongAnswerEntry` via
  `recordWrongAnswer` â†’ feeds the existing capped `Math.min(wrongData.count*5, 30)` weak-area term. **`confidenceScore`
  untouched.** Silly+presentation do NOT bridge â€” surfaced as a distinct **"Careless mark-loss"** card on both Me pages.
- **Server:** `checkSolution.cjs` additive-floor reconcile `max(llm, stepDerived)` (client mirrors it).
- **Behavior change (approved):** full-marks answers no longer log a zero-mistake row; mistake answers still log.
- **Live verification (owner, PASS):** regression âœ…, Quick-Practice logging âœ…, bridge âœ… (Polynomials + Real Numbers surfaced),
  server reconcile âœ…, no double-log âœ…. **2 follow-ups:** [FU-GRADE-PARSE] intermittent grade-parse; [FU-ME-REFRESH] Me needs
  manual refresh. Both pre-existing / separate from this PR (see OPEN_QUESTIONS). Classification is eval-pending.
- **OUT OF SCOPE (deferred):** MCQ migration onto the front door (still `conceptual:1`), chapter-tests/mocks, layer-merge, durable
  Me convergence. Report: `report-mi-consolidation-p1p2-2026-06-11.md`.

## âœ… INFRA-4 / PR1 â€” backend DEPLOYED + LIVE (the go-live unlock)
The backend (`artifacts/api-server`, which self-spawns the `lazytopper/server` AI gateway as a child) is **deployed on Railway and
live** â€” owner-confirmed `/api/health` shows `stub:false` with Gemini **direct-key** auth. **Grading (`/api/check-solution`) is no
longer dark in production.** Wiring: Vercel static app â†’ `vercel.json` rewrite (`/api/*` + `/shared-api/*`) â†’
`https://lazytopper-production-production.up.railway.app` â†’ api-server (8080) â†’ gateway (3001) â†’ Gemini.
- **Deploy shape (load-bearing):** the image carries the **whole workspace** and keeps `typescript` installed â€” the gateway
  transpiles `lazytopper/src/**/*.ts` at runtime and resolves files relative to cwd (Dockerfile + `.dockerignore` encode this).
- **Deferred:** claudeClient Replit-proxy rewire (INFRA-4b) â€” grading is Gemini-only; Claude is visuals-only and degrades
  gracefully. **Flagged for PR2:** `tsx` (absent from manifests; warmup is `DATABASE_URL`-gated, inert until PR2 adds Postgres).
- **PR2 (harden, queued):** provision Postgres + `DATABASE_URL` + add `tsx` + `ADMIN_FIREBASE_UIDS` + `SESSION_SECRET` +
  rate-limit + warm-pool decision (`WARM_POOL_TOP_UP_INTERVAL_MS` currently `0`).
Reports: `report-api-server-deploy-investigation-2026-06-10.md`, `report-api-gateway-railway-2026-06-10.md` (incl. owner runbook).

## â›” TRACK B (#222) verification gate â€” now LIVE-TESTABLE; owner+cofounder run it to close
With the backend live, the gradeâ†’persistâ†’mobile-Meâ†’desktop-Me round-trip can finally be PROVEN. **Status: live-testable, NOT yet
closed.** The owner + cofounder run the real round-trip on the live app (sign in â†’ grade a real answer â†’ confirm "Saved to your
progress" â†’ mobile Me shows the real mistake mix â†’ desktop Me matches on the same uid; plus the failed-grade â†’ error path). **Only
that pass closes [TRACK-B-GATE] / ISSUE-009.** Step-by-step in `report-api-gateway-railway-2026-06-10.md` Â§7. See OPEN_QUESTIONS [TRACK-B-GATE].

## PHASE-2 RESPONSIVE DIVERGENCE â€” Track A DONE (#220); audit ordered the rest
The Phase-2 work (reconcile stale mobile twins to the desktop source-of-truth; no invented numbers) is underway.
- **Full divergence audit (read-only):** `report-responsive-divergence-audit-2026-06-08.md` mapped every `useIsDesktop()`
  split. 7 split surfaces â†’ 2 MATCH-by-design (Home, Welcome), 2 MATCH by construction (Exam Trends, Practice Hub),
  **5 DIVERGENT** (Me, chrome/avatar, Check & Improve, Topic Hub, Worksheets). Severities normalized (mobile-shows-less =
  functional, not trust-critical).
- **Track A DONE (#220, `8c478ce`):** mobile Me (`app/Me.tsx`) no longer shows fabricated personal data â€” the hardcoded
  `COMMON_MISTAKES` bars (âˆ’12/âˆ’8/âˆ’5) + invented weak-topics count are removed, replaced with honest empty-states (desktop
  Me's verbatim copy) + an honesty footer. The urgent trust-critical stopgap. Streak/XP kept (real localStorage). 1 file,
  +48/âˆ’56; grep-proven zero fabricated data; gates green; build CI-gated.
- **Punch-list order (OPEN_QUESTIONS):** Track A âœ“ â†’ **Track B (mobile Check trust + persistence â€” the data source mobile
  Me needs)** â†’ RESP-DIV-2 (mobile has NO logout path) â†’ Topic Hub reconcile â†’ Worksheets parity â†’ Home real-insights â†’
  RESP-DIV-3 (trial banner). Durable cure = converge mobile Me into desktop Me (one responsive component, one pipeline).

## SEVER PR (#218) â€” obsolete surfaces disconnected; product reaches ONLY live surfaces
PR #218 (`fix/sever-obsolete-surfaces`; squash-merged **`bcb7c2a`**, 57 files +170/âˆ’171) severed every inbound edge
(route, nav, catch-all, command-palette, leaked link) to obsolete/deferred pages so the running product reaches
ONLY live surfaces. **Markers-now doctrine** â€” no files moved/deleted; 46 disconnected files carry a top-of-file
`LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3) marker for a future Phase-2 clean-branch (grep the markers to
delete/keep). Authority: `AGENT_sever_obsolete_surfaces_2026-06-08.md` + the two read-only audits
(`report-responsive-surface-audit-2026-06-08.md`, `report-banned-term-prose-audit-2026-06-08.md`).
- **Routing (App.tsx â€” owner-authorized, routing-scoped):** mobile `/` (RootEntry) + catch-all `*` (HomeRedirect)
  re-pointed off the retired old `/dashboard` to the live MobileHome (`/browse`) / `/`; `/browse` made terminal at
  mobile width (no `/`â‡„`/browse` loop). **Fixes the two-contradictory-homes bug** (mobile `/` + catch-all landed on
  the old Dashboard while the BottomNav Home tab went to `/browse`). Durable nav-mirror rule encoded; BottomNav
  active-state residue trimmed to the live set. `main.tsx` was NOT needed (less forbidden-file surface).
- **18 dead `<Route>` entries removed** (RETIRE: dashboard, trends, daily-mix, daily-mission, planner, study-plan,
  night-before, revision-calendar, mini-mock, weekly-wrapped, weekly-digest, methodology, settings; DEFERRED:
  parent-dashboard, parent, predictive-papers). `weak-area-practice` KEPT (partial-sever: dead-Dashboard doorway +
  palette entry severed; live ExamSim/MockPaper inbound preserved).
- **11 leaks closed:** JourneyStrip removed from HPQ; command palette severed at switch + catalog
  (`commandPaletteConfig`) + intent (`commandIntent`); live back-defaults/links in PracticeQuestionList, TopicHub,
  WeakAreaPractice, ExamSimulation, MockBuilder, the Login post-login fallback, and Onboarding re-pointed off
  severed routes. (5 of these were BEYOND the named JourneyStrip+palette â€” surfaced by a manual dead-path grep
  that the connectivity graph cannot see.)
- **Merge gate = before/after connectivity graph** (a new reusable tool `connectivity-graph.mjs` in the diff
  folder): 18/18 intended cuts unreachable AFTER, **28/28 live routes preserved (zero loss)**, 0 unexpected losses;
  `/mock-paper` flagged collateral (kept routed, unreachable â€” its only entry was the deferred predictive-papers).
- **Gates:** tsc, mojibake, scope:guard product, root matrix 175/175, ops 6/6, git diff --check all PASS; **CI
  `quality-gate` GREEN** (the linux vite build + verify-production-build). Vercel preview verified by owner
  (MobileHome landing 360/768, desktop sidebar nav, gated-CTAâ†’loginâ†’return, routing fix â†’ MobileHome not old
  Dashboard). Report: `report-sever-obsolete-surfaces-2026-06-08.md` + `connectivity-{before,after,diff}.*`.
- **Auth untouched** â€” zero auth / `main.tsx` / Firebase files in the 57; this build is byte-identical to #214 on
  auth. New responsive-divergence findings from the preview logged in OPEN_QUESTIONS (Phase-2, soft-launch).

## SYLLABUS PROSE COPY-FIX (#216) â€” 3 Tier-1A banned terms removed from the live cockpit
PR #216 (`fix/banned-term-prose-copy`; squash-merged **`b35f764`**) fixed 3 out-of-syllabus strings the
175/175 guard cannot catch (its surface scan omits bare generics to avoid prose false-positives). 2 files,
copy-only (+2/âˆ’3): `lib/desktop/topics.ts:35` Polynomials blurb dropped "the division algorithm" â†’ quadratic
zeroes-coefficient wording; `:45` Linear Equations blurb dropped "cross-multiplication"; `topicHubContent.ts:249`
removed the "Complementary angles" Board-Essentials row. Authority: `report-banned-term-prose-audit-2026-06-08.md`.

### Two READ-ONLY audits now drive the next workstreams (reports in `diff/`)
- **`report-responsive-surface-audit-2026-06-08.md`** â€” mapped the live cockpit vs the abandoned graveyard
  (old `/dashboard` subgraph + `components/dashboard/*`, orphans Home/ProfilePage/PracticeHome/MentorPanel,
  old `/trends`, `/planner`). **Headline risk:** mobile `/` + catch-all + command palette still route live
  students into dead surfaces (old Dashboard is the mobile landing today). Owner-ruling queue (Bucket B + C)
  â†’ produces the kill-list. **The SEVER PR is the next instruction.**
- **`report-banned-term-prose-audit-2026-06-08.md`** â€” 3 Tier-1A fixed here (#216). Tier-1B + Tier-2 deferred
  (see OPEN_QUESTIONS).

## AUTH MIGRATION ARC â€” 4/4 COMPLETE (#214): auth is Firebase-only, end to end
The arc is closed: **PR-1 #206** (api-server edge `verifyIdToken`) â†’ **PR-2 #208** (frontend rebuilt on Firebase
Auth + native login) â†’ **PR-3 #210** (Clerk teardown â€” Firebase-only, repo Clerk-free) â†’ **governance scrub #212**
(CLAUDE.md/Â§5 doctrine + setup docs) â†’ **PR-4 #214** (phone / SMS-OTP). Auth providers live: **Google (popup) +
Email/Password + Phone (SMS OTP)**. Firestore keyed on Firebase uid; admin via `ADMIN_FIREBASE_UIDS`.
**Verified in production-preview:** a real-number phone login â€” real SMS, real OTP, signed in, **trial correctly
tied to the phone account**. (Deliverability caveat logged â€” see OPEN_QUESTIONS [SMS-DELIVERABILITY].)

## AUTH MIGRATION ARC â€” PR-3 of 4 DONE (#210): Clerk teardown â€” auth is now Firebase-only
PR-3 (`fix/remove-clerk-bridge` from `5fc4141`; squash-merged **`6bf6e58`**) removed **all remaining Clerk**:
the gateway custom-token bridge, the api-server Clerk dual-accept fallback, `@clerk/express` + the Clerk
middlewares, and the now-dead JWT libs. Auth is **Firebase-only end to end**. 14 files (2 deletions + 12 edits,
+30/âˆ’224) + lockfile (âˆ’162). Report: `report-pr3-remove-clerk-bridge-2026-06-08.md`.

### What landed
- **Deleted** `lazytopper/server/routes/firebaseAuth.cjs` (the `/api/auth/firebase-token` bridge) +
  `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`.
- `server/index.cjs` â€” removed the bridge require/factory/route-handler/CORS entry. `lazytopper/package.json` â€”
  dropped `jsonwebtoken` + `jwks-rsa` (remain transitive under `firebase-admin`, which is correct).
- `requireFirebaseAuth.ts` â€” removed the Clerk `getAuth` fallback â†’ **Firebase-only** (`verifyIdToken` or 401;
  503 if Firebase Admin unconfigured â€” fail-closed, since there is no fallback now).
- `app.ts` â€” removed `clerkMiddleware()` + the proxy mount. `artifacts/api-server/package.json` â€” dropped
  `@clerk/express` + the orphaned `http-proxy-middleware`.
- Scrubbed stale "Clerk" comments + the `authProvider` default (`"clerk"` â†’ `"firebase"`).

### Zero-Clerk (owner gate)
`grep -rinE "clerk"` over `**/src`, `**/server`, `**/package.json` â†’ **ZERO**. The lockfile `@clerk` count = 0
(whole `@clerk/*` tree removed). Remaining `clerk` matches are **non-code only**: gitignored `.env.local`,
auto-gen `.project_memory` snapshots, `handoff/*` migration history, and `CLAUDE.md`/`FIREBASE_SETUP.md`/
`docs/desktop-graduation-state.md` â€” the latter are the **governance/docs scrub** queued next (owner-ready
instruction; `CLAUDE.md Â§5` "Clerk stays for now â€” K2H-15" is now obsolete).

### PR-3 gate evidence (all green, Codespace + CI)
- **CI `quality-gate`**: PASS (run `27115594685`, 1m33s) â€” frozen install + root 175/175 + mojibake + build + ops.
- **Codespace (pre-push):** api-server tsc/build exit 0; lazytopper tsc/build exit 0; verify-production-build PASS;
  **gateway boots without the bridge** ("LazyTopper AI server running on port 3011"); root 175/175; ops 6/6;
  lockfile `@clerk` count = 0.

### âš ï¸ Now load-bearing (the Clerk safety net is gone)
- **Admin bootstrap (BLOCKING):** `ADMIN_FIREBASE_UIDS` = your Firebase uid is the ONLY way admin routes
  authorize now. Until set: admin routes 503 in prod / dev-skip locally.
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) â€” `requireFirebaseAuth` returns 503 without it (no fallback).
- Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + the local `.env.local`.

### Remaining auth work
- **(DONE â€” #212) CLAUDE.md governance scrub** â€” surgical Â§1 stack + Â§5 doctrine edits, +
  `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md`. Owner-reviewed merge (governance files excluded from
  docs auto-merge). Trunk after #212: `c755adb`.
- **(NEXT, hold for owner go) PR-4 â€” phone / SMS-OTP** (`feat/auth-phone-otp`): fill the `initPhoneRecaptcha`/
  `sendPhoneOtp`/`verifyPhoneOtp` faÃ§ade with `signInWithPhoneNumber` + reCAPTCHA v2 invisible; wire the Phone
  tab (+91 â†’ 6-digit OTP). Project `lazzyy-topper` on Blaze; enable Phone provider + Authorized domains (owner).
- Google **One-Tap** (GIS) follow-up once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-2 (#208): frontend on Firebase Auth (Clerk removed from the client)
PR-2 (`feat/auth-firebase-frontend` from `7f993cb`; squash-merged **`597880d`**) rebuilt the frontend auth on
**direct Firebase Auth** and removed Clerk from the client. The api-server edge (PR-1) is now hit with **Firebase
ID tokens** (its preferred `verifyIdToken` path); the Clerk fallback there goes idle (removed in PR-3). Design basis:
`LazyTopper_Login_Design_Spec_v2.md` + `lazytopper_login_prototype_v2.html`. Reports:
`report-pr2-auth-firebase-frontend-2026-06-08.md` + `report-pr2-evidence-2026-06-08.md`.

### What landed (6 files + lockfile)
- **`src/context/AuthContext.tsx`** â€” internals â†’ direct Firebase Auth (`onAuthStateChanged`,
  `signInWithPopup(GoogleAuthProvider)`, email/password). **Added** `signInWithEmailPassword` /
  `signUpWithEmailPassword` (additive â€” `AuthContextType` shape preserved, ~38 consumers untouched).
  `getToken()` â†’ `currentUser.getIdToken()`. Clerkâ†’`/api/auth/firebase-token` bridge deleted from the client.
  **Local-dev/E2E anonymous-session path preserved verbatim.** Phone faÃ§ade stays no-ops (PR-4).
- **`src/pages/Login.tsx`** â€” native v2 widget: official Google button + One-Tap sub-line, Email/Phone segmented
  toggle, **one-step** email+password, **disabled** Phone tab with honest "arrives shortly" note (handler = PR-4).
  `lt-login-clerk-frame` â†’ `lt-login-frame`; **"Welcome back" header removed**; left brand panel untouched.
- **`src/pages/SignUpPage.tsx`** â€” native Google + email/password create-account.
- **`src/main.tsx`** â€” `ClerkProvider` removed (authorized for PR-2). **`package.json`** â€” `@clerk/react` dropped.
- **`artifacts/api-server/src/routes/admin.ts`** â€” admin allowlist migrated **`ADMIN_CLERK_UIDS` â†’
  `ADMIN_FIREBASE_UIDS`** (the forward-corrected functional step; `req.userId` is now a Firebase uid).

### Owner decisions (PR-2)
- **Google = popup** (`signInWithPopup`) â€” no new env/script. True GIS One-Tap is a fast-follow once a Web OAuth
  client ID is supplied. **Email = one-step**, password-based (no magic link). Phone toggle present, inert until PR-4.

### PR-2 gate evidence (all green)
- **CI `quality-gate`**: PASS (run `27102702574`) â€” frozen install + root matrix 175/175 + mojibake + lazytopper
  build + ops matrix.
- **Codespaces (pre-push, files copied in â€” no commit):** lazytopper `tsc -p tsconfig.app.json` **exit 0** (the
  ~770-line rewrite's first compile); api-server typecheck exit 0; **vite build exit 0**; verify-production-build
  PASS; root 175/175; ops matrix 6/6; lockfile regenerated (`@clerk/react` removed, âˆ’17 lines).
- **Vercel-preview screenshots** (360/768/desktop Ã— login + signup) captured + assessed faithful to the v2
  prototype â€” `pr2-{login,signup}-{360,768,desktop}.png` in the diff folder.
- **Runtime auth verification (headless, real `lazzyy-topper`):** email/password sign-up+sign-in + `getIdToken()`
  â†’ decoded JWT `iss = https://securetoken.google.com/lazzyy-topper`, `aud = lazzyy-topper`,
  `sign_in_provider = password` â€” a genuine **Firebase** token (NOT Clerk). Throwaway account deleted.
- Zero `@clerk`/`VITE_CLERK` refs remain in `lazytopper/src`. `scope:guard` classifies the 5 FE files as
  `product`; the 1 BE file (`admin.ts`) is the known `[unclassified]` gap (D47).

### âš ï¸ PR-3 IS NEXT (owner to give go) â€” the Clerk teardown
PR-3 (`fix/remove-clerk-bridge`): delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs` + its
`server/index.cjs` wiring; drop `jsonwebtoken`/`jwks-rsa`); remove the api-server **Clerk fallback** branch from
`requireFirebaseAuth` (Firebase-only); drop **`@clerk/express`**; unmount `clerkMiddleware()`; remove
`clerkProxyMiddleware`; remove Clerk env (`CLERK_SECRET_KEY`, `CLERK_JWKS_URI`, `CLERK_ISSUER`, `VITE_CLERK_*`).

### Owner / deploy actions still pending
- **Admin bootstrap:** sign in once via Firebase â†’ capture your uid â†’ set `ADMIN_FIREBASE_UIDS` (else admin routes
  503 in prod / dev-skip locally).
- **Firebase Authorized domains:** add the prod Vercel domain to `lazzyy-topper` so `signInWithPopup` works in prod
  (localhost already allowed; the Google popup couldn't be auto-tested headlessly â€” owner verifies with a real click).
- **Railway env (from PR-1):** `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or ADC) on api-server.
- **One-Tap (GIS) follow-up:** small PR once a Web OAuth client ID is provided.

---

## AUTH MIGRATION PR-1 (#206) â€” Firebase edge verify + Clerk dual-accept (Option B)
Owner decided to **remove Clerk and use Firebase Authentication directly** (Google + Email/Password + a NEW
phone/SMS-OTP option). Rationale (verified): all student data already lives in Firestore (per-uid, secured by
`firestore.rules` `isOwner(uid)`); Clerk sits "midway" (login UI + session â†’ a backend bridge mints a Firebase
custom token); Firebase has native auth, so Clerk is the removable layer. Cheapest to migrate now (no live
student accounts, Clerk production not yet set up). Authority: the read-only audit
`report-auth-migration-clerk-to-firebase-2026-06-07.md` (owner-reviewed) + the 4-PR build plan.

**The migration is 4 sequenced, owner-approved PRs (same executor, STOP-for-approval between each):**
- **PR-1 (#206, DONE)** â€” backend edge guard ("Surface B" = `artifacts/api-server`): verify Firebase ID tokens.
- PR-2 (NEXT) â€” frontend `AuthContext` internals + Login/SignUp rebuilt natively on Firebase Auth (Google One
  Tap + Email/Password); client switches to send Firebase ID tokens; drop `@clerk/react`; `main.tsx` authorized.
- PR-3 â€” delete the gateway bridge (`/api/auth/firebase-token` + `firebaseAuth.cjs`); remove the Clerk fallback
  **and** `@clerk/express` together; unmount `clerkMiddleware`; remove `clerkProxyMiddleware` + Clerk env.
- PR-4 â€” phone / SMS-OTP provider (reCAPTCHA v2 invisible; project `lazzyy-topper` on Blaze).

### PR-1 (#206) â€” what landed (5 files, all under `artifacts/api-server/`)
Branch `feat/auth-firebase-edge` from `45f733e`; squash-merged **`a3def5f`**. `.claude/` never staged.
- **NEW `src/lib/firebaseAdmin.ts`** â€” Firebase Admin init for the edge (mirrors the gateway: `VITE_FIREBASE_PROJECT_ID`
  + optional `FIREBASE_SERVICE_ACCOUNT_KEY`, else ADC). Exports `firebaseAdminApp` (or `null` if unconfigured).
- **NEW `src/middlewares/requireFirebaseAuth.ts`** â€” the dual-accept guard: (1) `verifyIdToken(bearer)` â†’
  `req.userId = decoded.uid`; (2) on failure, fall back to the **still-mounted** `@clerk/express` `getAuth(req)`;
  else `401 {ok:false,error:"Unauthenticated"}`. Augments `Express.Request` with `userId?: string`.
- `src/routes/admin.ts` / `src/routes/questions.ts` â€” `requireAuth()` â†’ `requireFirebaseAuth`; read `req.userId`;
  dropped the `@clerk/express` imports from the route files. `x-user-id` forwarding to the gateway unchanged.
- `package.json` â€” added `firebase-admin@^13.7.0` (the one new dep; already in the lockfile via lazytopper).

### Option B (owner-confirmed) â€” the dual-accept lifecycle
PR-1 keeps `@clerk/express` mounted (the fallback's `getAuth` needs `clerkMiddleware`; the still-Clerk frontend
needs `clerkProxyMiddleware`). NO hand-rolled Clerk crypto; NO `jsonwebtoken`/`jwks-rsa`. The Clerk fallback +
`@clerk/express` are removed **together in PR-3**. Lifecycle: PR-1 adds Firebase verify + Clerk fallback (both
live) â†’ PR-2 switches the client to Firebase tokens **and** migrates the admin allowlist â†’ PR-3 removes the
Clerk fallback + `@clerk/express`. `/shared-api/questions/report` never breaks. Rejected Option A (hand-rolled
JWKS Clerk verification) as unjustified security-critical/throwaway code. The build doc's "drop `@clerk/express`
in PR-1" line is corrected â†’ moved to PR-3. See DECISION_LOG (Option B).

### âš ï¸ PR-2 FORWARD CORRECTION (admin allowlist) â€” do NOT lose
`admin.ts` `requireAdminRole` checks `req.userId` against **`ADMIN_CLERK_UIDS`** (Clerk ids). PR-1 deliberately
left this as-is. When **PR-2** switches the client to Firebase tokens, `req.userId` becomes a **Firebase uid**,
so every admin route would **403** until the allowlist is migrated. Therefore the **rename + revalue
`ADMIN_CLERK_UIDS` â†’ `ADMIN_FIREBASE_UIDS` moves to PR-2 (not PR-3)**, with a bootstrap step: owner signs in
once via Firebase â†’ capture the uid â†’ set it in `ADMIN_FIREBASE_UIDS`. (A code comment in `admin.ts` notes the
deferral; that comment still says "PR-3" â€” PR-2 must update it.)

### Deploy-stage note (Railway) â€” NEW requirement from #206
`artifacts/api-server` now requires **`VITE_FIREBASE_PROJECT_ID`** + **`FIREBASE_SERVICE_ACCOUNT_KEY`** (or ADC)
in its Railway deploy environment to verify Firebase ID tokens. Without them `firebaseAdminApp` is `null` and the
edge relies on the Clerk fallback only (fine during the PR-1â†’PR-2 window; required real once PR-3 is Firebase-only).
Fold into the INFRA-4 backend-deploy env checklist.

### PR-1 gate evidence (all green)
- **CI `quality-gate.yml`**: PASS (1m29s, run `27100425116`) â€” frozen-lockfile install + root matrix 175/175 +
  mojibake + lazytopper build + ops matrix all green.
- **Codespaces (linux, pnpm 10.32.1)** â€” the gates that can't run on the Windows box: lockfile regenerated (only
  `pnpm-lock.yaml` changed, +8/âˆ’65, adds `firebase-admin` to api-server, committed in the PR); **api-server
  `typecheck` exit 0** (first real compile of the 2 new files; required building the `@workspace/api-zod`/`db`
  composite refs first); **api-server `build` (esbuild) exit 0** (`firebase-admin` externalized); root matrix
  **175/175**; lazytopper ops matrix **all 6 green** (the transient `llm-path 4/5` was a Codespace-only missing-
  ripgrep artifact â€” identical on trunk, unrelated to PR-1; CI installs ripgrep â†’ 5/5).
- `scope:guard` is structurally **N/A** for an `artifacts/api-server`-only PR (its policy lanes are
  lazytopper-anchored â€” no `artifacts/api-server` lane); forbidden-files clean; diff confined to 5 files.

## âœ… INFRA ARC CLOSED THIS SESSION (4 items) â€” repo is healthy; NEXT SESSION PIVOTS TO PRODUCT
The whole arc this session was diagnosing + closing the infra tangle. As of trunk `5441060` all four are DONE:
1. **Lockfile fixed (#201)** â€” `pnpm-lock.yaml` regenerated to match `lazytopper/package.json`; frozen installs work on linux.
2. **CLAUDE.md corrected (#198)** â€” stale commands fixed (`verify-production-build.mjs`; `npx tsc -p tsconfig.app.json --noEmit`; the real gate bar; the two distinct `test:matrix:all`).
3. **CI LIVE (#198)** â€” `.github/workflows/quality-gate.yml` at the repo ROOT gates every PR into trunk + push to trunk: pnpm **10.32.1** frozen install â†’ root matrix **175/175** â†’ mojibake â†’ **linux `vite build`** â†’ ops matrix. Proven to RUN and to GATE (probe PR #202 went red on a planted mojibake). ripgrep installed in CI; `scope:guard` stays a LOCAL gate (working-tree-diff based â†’ false-PASS on a clean CI checkout). No product-PR auto-merge (human gate retained).
4. **De-Replit COMPLETE (#199 PR-A + #204 PR-B)** â€” all Replit scaffold, the `@replit/vite-plugin-*` packages, `@replit/connectors-sdk`, and the 3 non-product stubs (`lazytopper-video`, `mockup-sandbox`, `lazytopper-mobile`) removed. The repo is now **fully `@replit`-free in manifests + source + lockfile** (verified `grep` = 0). Workspace **12 â†’ 9 projects**; lockfile shrank **~7,300 lines** (21,345 â†’ 14,051). PR-B (#204) was the **first real PR through the new CI gate** â€” it went green.

**KEPT (real, NOT removed):**
- `artifacts/api-server/` â€” the real Express/Clerk/Postgres backend that proxies to the AI gateway.
- `artifacts/lazytopper-app/` â€” the vite build **OUTPUT TARGET**: `lazytopper/src` builds into its `dist/public/app` (served at `/app/`). Now a shell (its stub `src` went in PR-A); kept only as the output path.
- `lazytopper/` â€” the product (the ONE responsive website).

**Backend architecture (mapped this session):** layered â€” frontend `/api/*` â†’ `api-server` (Express edge: Clerk auth, Postgres/Drizzle, questions/admin) â†’ spawns + proxies AI to â†’ `lazytopper/server/*.cjs` (the Gemini/Claude/tutor/check-solution gateway on port 3001). So "deploy the backend" = deploy `api-server` (which runs the gateway as a child) + provision Postgres.

## CI ACTIVATED (#198) â€” the safety net is LIVE; CLAUDE.md corrected
GitHub Actions CI now runs on every PR into `base/approved-thru-437` and on push to it. This is the FIRST
time CI has ever executed (the predecessor `lazytopper/.github/workflows/mojibake-guardrail.yml` was in a
SUBDIRECTORY â€” GitHub only registers workflows at the repo ROOT â€” so it never ran). **D39 RESOLVED.**
- **Workflow:** `.github/workflows/quality-gate.yml` (repo root; old mislocated file deleted). On an
  ubuntu-latest runner it gates the full bar: pnpm `--frozen-lockfile` install â†’ root `scripts`
  `test:matrix:all` (**175/175**) â†’ lazytopper `check:mojibake` â†’ **`build` (linux `vite build`)** â†’
  lazytopper `test:matrix:all`. A red run blocks merge. Triggers scoped to trunk (PR-into + push-to);
  `concurrency` cancels superseded runs.
- **Squash-merged `9d772cb`** (3 legible commits: CLAUDE.md fix / CI workflow / cross-platform ops fixes).
  Final green run `27088156112`; **proven to gate** â€” throwaway PR #202 with a planted mojibake glyph went
  RED at the mojibake step, then was torn down.
- **Prereq cleared:** the stale-lockfile blocker that parked #198 last session was fixed on trunk by **#201**
  (regenerated `pnpm-lock.yaml` to match `lazytopper/package.json`). #198 rebased clean onto that.
- **Three Windows-only fragilities** that only surface under live linux CI were found + fixed inside #198:
  (1) pinned CI to **pnpm 10.32.1** â€” the lockfile's regen version; pnpm 11 leaves `npm_config_user_agent`
  empty on linux so the root `preinstall` guard (`case ...pnpm/*`) trips; (2) added a **ripgrep** install
  step â€” the ops audits shell out to `rg` with no fallback and ubuntu-latest lacks it; (3) fixed **hardcoded
  Windows path separators** in `bsre_spike_acceptance.mjs:50` (blocking) + `trig_legacy_retire_acceptance.mjs:29`
  (latent) to a cross-platform `[\\/]` regex. (BSRE is live product code â€” powers the TopicHub tutor
  `/api/mentor` path â€” so the check stays; only the separator was wrong.) Left alone: `styles_change_impact:25`
  `hasBackslash()` is an intentional non-portable-path DETECTOR; `feature_file_matrix.mjs` absolute Desktop
  paths are an owner-local tool, not in CI.
- **CLAUDE.md corrected:** verifier `verify-build.mjs`â†’`verify-production-build.mjs`; TS check
  bare `tsc --noEmit`â†’`npx tsc -p tsconfig.app.json --noEmit`; dropped dead `NODE_ENV/BASE_PATH`; documented
  the pnpm-workspace reality + the real gate bar + the two distinct `test:matrix:all`; added Â§6a (CI active;
  `scope:guard` stays a LOCAL gate â€” it inspects the working-tree diff, so a clean CI checkout is a false-PASS).
- **NOT in scope (deferred):** product-PR auto-merge â€” the human merge gate is retained until CI is proven
  over a series of real PRs. Authority: `report-unpark-198-ci-green-2026-06-07.md`
  (+ `report-ci-activation-blocked-2026-06-05.md` for the prior parked diagnosis).

## de-Replit PR-A DONE (#199) â€” safe scaffold + dead lazytopper-app stub (zero build/lockfile risk)
First, lockfile-INDEPENDENT slice of retiring Replit. Authority: `report-replit-removal-audit-2026-06-06.md`
+ `report-de-replit-pr-a-2026-06-06.md`. Build-safety verified: the product build (`lazytopper/vite.config.ts`)
imports ZERO `@replit` plugins and CI builds `lazytopper` only â€” these deletes cannot break the shipped app.
Branch `chore/de-replit-pr-a` from `2857871`; **70 files (69 deletes + 1 root `package.json` build-fix);
squash-merged `fec2f92`**. `.claude/` never staged.
- **Deleted:** `.replit`, `.replitignore`, `.tmp-lazytopper-artifact.toml` (root scaffold); `scripts/backup-to-drive.mjs`
  (Replit-only Drive backup, wired to no script); `artifacts/lazytopper-app/src/**` (64 â€” vestigial wouter/radix
  stub, NOT in the shipped bundle) + its `.replit-artifact/artifact.toml`. The lazytopper-app `package.json` +
  the `dist/` output target the real build writes to are **KEPT**.
- **Root build hygiene:** dropped dead-stub filters (`@workspace/lazytopper-app`, `@workspace/lazytopper-video`)
  from the root `package.json` `build`; **kept** `@workspace/api-server` + `lazytopper` (`scripts`-field edit â†’ lockfile-safe).
- **Gates:** tsc 0; mojibake 0; root `scripts` `test:matrix:all` **175/175**; lazytopper ops matrix green;
  `git diff --check` clean; remote forbidden-file check clean. Two NON-blocking, NOT-this-PR FAILs:
  `scope:guard` = coverage gap (no policy lane models root-scaffold/`artifacts/**` deletes; manually verified
  clean; governance JSON untouched), and `pnpm install --frozen-lockfile` = PRE-EXISTING #198 staleness
  (`lazytopper/package.json` test-dep drift; this PR changes ZERO lockfile inputs â€” confirmed live). `vite build`
  / `verify-production-build.mjs` not runnable on Windows (linux-pinned binaries); root CI workflow parked in #198.
- **DEFERRED to PR-B (lockfile-coupled â€” behind the #198 lockfile regen):** delete whole packages
  `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (all workspace
  importers; lazytopper-mobile = owner-confirmed non-product Expo native path); remove `@replit/vite-plugin-*`
  + the 3 stub `vite.config.ts` + the 3 `catalog:` entries; `pnpm-workspace.yaml` allowlist cleanup
  (`stripe-replit-sync`, `@replit/*` exclude); orphaned root dep `@replit/connectors-sdk`; reconcile the root
  `typecheck` glob (`./artifacts/**` still hits the src-less lazytopper-app).
- **KEEP (owner-confirmed):** `artifacts/api-server/` â€” real backend (Express/Postgres/Clerk â†’ AI gateway);
  retained in the root build; map the backend separately before touching it.

## de-Replit PR-B DONE (#204) â€” @replit packages + 3 non-product stubs removed (atomic, lockfile-coupled)
The lockfile-coupled remainder that PR-A deferred. Authority: `report-de-replit-pr-b-2026-06-07.md`.
Branch `chore/de-replit-pr-b` from `a0c7018`; **144 files (140 stub-dir deletes + 4 edits) + the lockfile
regen; squash-merged `5441060`**. The atomic set (all in one PR, or the build breaks):
- **A â€” deleted 3 non-product stub packages:** `artifacts/lazytopper-video/`, `artifacts/mockup-sandbox/`,
  `artifacts/lazytopper-mobile/` (the Expo NATIVE-app path â€” NOT the product, which is ONE responsive website).
  All 3 were workspace/lockfile importers.
- **B â€” stripped the surviving `@replit` config:** `artifacts/lazytopper-app/vite.config.ts` â†’
  `plugins: [react(), tailwindcss()]` (removed `runtimeErrorOverlay` + the `REPL_ID`-gated cartographer/dev-banner).
- **C â€” removed `@replit` deps:** root `@replit/connectors-sdk` (orphaned once PR-A deleted its only consumer)
  + the 3 `@replit/vite-plugin-*` devDeps in `lazytopper-app/package.json`.
- **D â€” cleaned `pnpm-workspace.yaml`:** dropped the 3 `@replit` `catalog:` entries + the
  `minimumReleaseAgeExclude` block (`@replit/*`, `stripe-replit-sync`) + stale Replit comments. The `packages:`
  glob (`artifacts/*`) needed no edit; the linux-x64 `overrides` block is KEPT (build-platform pinning).
- **E â€” reconciled the root `typecheck`:** `--filter "./artifacts/**"` â†’ `--filter @workspace/api-server`
  (the glob had started hitting the src-less `lazytopper-app`, which errored TS18003 after PR-A).
- **F â€” lockfile regen (Codespaces, pnpm 10.32.1):** the Windows box can't (the `minimumReleaseAge` registry
  check needs `time` metadata it couldn't fetch); regenerated on linux per the #201 path. Lockfile shrank
  ~7,300 lines. **The new #198 CI gated the PR green** â€” its first real-PR proof.
- Windows-side gates before handoff: `@replit` purged from all source; `git diff --check` clean; no
  `lazytopper/src`/handoff touched; `scope:guard` FAIL = the known `artifacts/**` coverage gap (D41), not a breach.

## 3 pre-existing test reds RESOLVED (#196) â€” mixed PR (product src/data + trackedTooling lanes)
The three acceptance suites that had been RED on trunk (tracked as D38) are now GREEN. Authority:
owner-approved diagnosis `report-preexisting-failures-diagnosis-2026-06-05.md` + independent re-verification
(`report-preexisting-failures-fix-2026-06-05.md`). Branch `fix/preexisting-failures` from `df88d29`; merged
`19b3029`. **3 lane-pure commits**, 7 files (+173/âˆ’393); `predictionTypes.ts` frozen; `.claude/` never staged.
- **Commit 1 (product/data) â€” mojibake re-encode.** `circles.proof.ts` (462 corrupted glyphs, 12 types) +
  `maths.caseBased.ts` (6 glyphs, 2 types) â†’ correct Unicode via a 1:1 reversible map built from the EXACT
  in-file bytes. Only corrupted sequences changed; already-correct Unicode + the pre-existing BOM left
  byte-for-byte. Single-level UTF-8â†’cp1252 corruption (not double-encoded). **`test:mojibake` 1/3 â†’ 3/3.**
  CORRECTION to the diagnosis: caseBased was a SECOND corrupted file it missed (signature single-level
  `Ã¢â€“Â³`â†’`â–³` Ã—5 + a subscript-n stored as `Ã¢`+ASCII-apostrophe+`â„¢`, a smart-quote artifact) â€” NOT the
  predicted double-encoded `ÃƒÂ¢Ã¢Ã‚Â³`.
- **Commit 2 (tooling + product orphan deletes) â€” stale-test cleanup.** bank-health was a stale test
  asserting never-built wiring (`bankHealthSummaryForSubject` exists nowhere; HPQ never imported the engine);
  the engine (`src/prediction/bankHealth.ts` + `buildTopicKeySources.ts`) was orphaned dead compute (nothing
  in `src/` imported it). Deleted both orphans + rewrote the test as a **retirement guard** (same idiom as
  `trig:retire`/`bsre:retire`): asserts the dead compute is gone + HPQ surfaces no computed health (no-fake-
  data doctrine). Script name KEPT â€” 4 harnesses invoke it (`test_matrix.json`, `software_testing_bot.mjs`,
  `agent2_test_guard.mjs`, `matrix_execution_acceptance.mjs`) â€” so no package.json change. **2/4 â†’ 4/4.**
  canonical-generator was stale after the "Split giant files" refactor (`be5e2de`) relocated
  `generateUnifiedPracticeQuestions`/`canonicalFallback` from `PracticePage.tsx` into
  `practiceQuestionBuilder.ts`; re-pointed the two page-side checks to the live chain. Generator unchanged.
  **2/4 â†’ 4/4.**
- **Commit 3 (tooling) â€” un-blind the mojibake checker.** `check-mojibake.cjs` broke its scan at 50 hits;
  the cap bounded the SCAN (not just output), so a heavily-corrupted file that filled it stopped the loop
  before later-sorting files were read. `circles.proof.ts` (96 corrupted lines) sorts before
  `maths.caseBased.ts`, so the checker never saw the second corrupted file â€” and corruption shipped past
  both the local gate AND the CI workflow (both run this checker). Now scans every file/line; a
  `DISPLAY_LIMIT` bounds only printed output. Proof: against base-corrupted inputs the old cap flags only
  circles; uncapped flags both.
- **CI finding (corrected twice; tracked D39).** A mojibake guardrail workflow FILE exists but at
  `lazytopper/.github/workflows/mojibake-guardrail.yml` â€” a SUBDIRECTORY. GitHub Actions only runs workflows
  at the repo-root `.github/workflows/`, so it has **never executed** (`gh workflow list --all` and
  `gh run list` both empty â€” zero workflows registered, zero runs ever). It is dormant. So corruption shipped
  for TWO independent reasons: CI mislocated (never runs) + the checker it/the local gate would run was
  capped/blind (now fixed). Full test matrix + scope-guard remain un-CI-gated.
- **Gates:** tsc 0; prod build 0; `verify-production-build` PASS; `scope:guard --mode mixed` SCOPE_GUARD_OK
  (product+trackedTooling); `git diff --check` clean; the 3 previously-red now GREEN (mojibake 3/3,
  bank-health 4/4, canonical 4/4); lazytopper `test:matrix:all` green; root `scripts` `test:matrix:all`
  **175/175**; exhaustive uncapped repo-wide rescan **0 corruption** in any content file. Trunk after #196:
  `19b3029`.

## HPQ Phase 1 â€” consistency + honesty DONE (#194) â€” gated src/data + page lanes
Highly-Probable-Questions now tells the SAME story as Exam Trends. **Logic/copy/plumbing only â€” no
content authoring (that is Phase 2); all questions kept (re-badge + de-emphasize, never delete).**
Authority: `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` + `report-hpq-refinement-audit-2026-06-05.md`.
Diff = exactly **3 files** (`src/data/highlyProbableQuestions.ts`, `src/pages/HighlyProbableQuestions.tsx`,
`src/utils/mergeBucketsByTopic.ts`; +140/âˆ’36). `predictionTypes.ts` frozen.
- **P0 â€” tier badge single source of truth.** `defaultTier` was hand-authored per bucket (74% must-crack;
  11/27 cards contradicted the locked tiers). NEW `LOCKED_TIER_SOURCE` table (verbatim from the locked doc)
  is flattened to a canonical-keyâ†’tier lookup; `getHighlyProbableQuestions()` overrides each bucket's
  `defaultTier` AND each question's `tier` from it â€” one chokepoint every consumer reads through, so it
  can't drift again. Executed-runtime: **0 contradictions (was 11/27); must-crack badge share 74%â†’42%**
  (per-question 74%â†’44%). Corrections: Polynomials/Heredity â†’ must-crack; Real Numbers, Quadratic,
  Probability, Statistics, Coordinate Geom, Metals, Carbon, Control â†’ high-ROI; Pair-of-Linear, AP, Human
  Eye â†’ good-to-do.
- **P2 â€” dead confidence compute retired.** `deriveHPQConfidence()` ran on every load but the page renders
  no confidence UI â†’ dead compute on a non-tier-aligned 5-signal basis. Call + import removed.
  `prediction/hpqConfidence.ts` KEPT on disk (untouched) for a future reconciled model; optional
  `confidenceScore?/Band?/Rationale?` type fields kept (still its return type). No other `src/` referent.
- **P3 â€” honest reframe (owner-approved copy).** H1 "Predicted Questions" â†’ **"High-Probability Question
  Patterns"**; sub-head names the three locked evidence sources (4 years of papers + official blueprint +
  examiner-pattern analysis); disclaimer "high-probability patterns to prioritise â€” not predictions of the
  exact 2027 paper." Nav labels + stack blurbs aligned. NO confidence badge introduced.
- **P5 â€” plumbing.** `canonicalTopicKey()` (normalize + alias table, exported from mergeBucketsByTopic)
  keys the merge â†’ duplicate "Pair of Linear Equations" and "Metals & Non-metals" cards collapse to one
  each (26 deduped cards). Science topic-allow filter matches on canonical key â†’ the 3 silently-dropped
  Human-Eye seed questions survive (**Human Eye 1â†’4**); any future drop is DEV-logged (`console.warn`,
  stripped from prod), never silent.
- **Gates:** tsc 0; prod build 0; `scope:guard --mode product` SCOPE_GUARD_OK; `git diff --check` clean;
  matrix weightage/trig/llm/bsre green; `hpq:drift` green (changed=0). Pre-existing/unrelated reds
  (bank-health 2/4, canonical-gen 2/4, mojibake 1/3 `circles.proof.ts`) verified absent-on-base / not in
  diff. In-syllabus unchanged (3 recovered Human-Eye Q all IN). Report:
  `report-hpq-phase1-consistency-2026-06-05.md`. **Phase 2 = content authoring (see NEXT_ACTION).**
  Trunk after #194: `6d5b6ed`.

## scopeGuard monorepo path-prefix bug FIXED (#192) â€” tracked-tooling
`scope:guard` had false-FAILed on **every** product edit (3rd PR hit; see the #190 section's "known
monorepo path-prefix artifact" note â€” that artifact is now resolved). Root cause: `.git` is at the repo
root and the guard runs from `lazytopper/`, so `git diff` emits **git-root-relative** paths
(`lazytopper/src/...`) while the policy lane rules are **lazytopper-relative** (`src/`) â†’ every product
file classified `unclassified` â†’ `SCOPE_GUARD_FAIL`. **Fix (Option A, owner-approved):** normalize the
path *frame* in `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/âˆ’6; policy JSON untouched) â€”
`detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd; `toPolicyFrame()`
strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the anchor keep their
full git-root path and are STILL classified (real lane, or `unknown` â†’ visible FAIL); a no-blind-spot
invariant fails loudly if classified-count â‰  changed-count; coupled `git show HEAD:./package.json`
(cwd-relative) fix keeps the scripts-only package.json check reading the guard's own file. **The handoff's
`--relative` suggestion was REJECTED** (it emits only files under cwd â†’ silently drops tracked changes
outside `lazytopper/` = false-PASS blind spot). Proven FAILâ†’OK on a product edit; tracked out-of-tree file
still seen+flagged; unclassified file â†’ visible FAIL. Gates: tsc 0; `test:matrix:all` **175/175**; prod
build 0; verifier PASS; `git diff --check` clean. Follow-ups logged in OPEN_QUESTIONS (D32â€“D35). Trunk
after #192: `318c6b6`.

## Exam Trends BAND redesign DONE (#190) â€” step 6 complete; Option-B convergence #2
The flat ranked list (`src/pages/ExamTrendsRanked.tsx`, shipped #184) is now THREE collapsible priority
BANDS â€” **Must-crack** (open by default) â†’ **High-ROI** (collapsed) â†’ **Good-to-do** (collapsed). The band
IS the synthesized verdict, so the weight-vs-trend **Sort toggle was removed**; Subject + Science-stream
filters stay. Layout-only Option-B evolution of the ONE responsive component (no twin; verified 360/768/
desktop reflow grammar). The existing `TopicRow` is reused verbatim inside each band (name + trend chip +
marks-weight bar + ~N marks + HPQ + Openâ†’Topic Hub + "â‹¯" Practice/Worksheet/Predicted/Add-to-selection);
within-band order = marks-weight desc. NEW: an **"Expect:" recurring-sub-pattern line** rendered ONLY on the
11 must-crack topics the locked doc supplies (High-ROI rows show none â€” no invented shapes); a **volatility
flag** ("Prepare deep Â· weight varies") on Trigonometry + Electricity in the existing amber caution tone
(no new color). Tiers/sub-patterns/volatility were transcribed **VERBATIM** from the owner-signed-off
authority `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` and co-located in the component as data â€”
NOT computed from `weight`/`trendTier`, and no `src/data/` or `src/lib/desktop/` edit needed (so the diff
is exactly **1 product file**, `src/pages/ExamTrendsRanked.tsx`, +406/âˆ’84). Design grammar preserved
byte-faithfully; honest empty states; in-syllabus only (corrected guard #188). The owner-locked tiers
(2026-06-05, model + 2 teacher overrides: Trianglesâ†’must-crack/Statisticsâ†’high-ROI; Heredityâ†’must-crack)
**satisfy the D27 "re-derive priorities FRESH" prerequisite (step 5)** â€” tiering is now scientifically
derived + owner-locked, so the band-threshold open question is closed (bands are signed-off data, not a
computed threshold). Gates: `tsc --noEmit` 0; prod build 0; verifier PASS; `test:matrix:all` **175/175**;
`git diff --check` clean; forbidden patterns none. `scope:guard --mode product` reported FAIL listing the
file `[unclassified]` â€” the **known monorepo path-prefix artifact** (git root is `Lazytopper-Production`,
so diff emits `lazytopper/src/...` while the policy `product` rule is `src/`), manually verified as NOT a
real breach (the file matches `src/` relative to `lazytopper/`); not hacked around. Trunk after #190: `cfb3106`.

## Syllabus-correctness arc CLOSED (#186 RULER + #188 SWEEP) â€” gating guard GREEN
The full arc is now complete: verified â†’ guard corrected (#186) â†’ **content swept (#188)** â†’ gating
`syllabusGuard` exits 0, `test:matrix:all` = **175/175 (incl. #19, previously red by design)**.
**#188 deleted the 93-item worklist** the corrected guard flagged: question banks Conversion of Solids
Ã—46 (exemplar 42â†’19, ncert 24â†’14, pack2 50â†’37; canonical bank 6520â†’6474, exactly âˆ’46, spreads intact);
board-prep surfaces EMI/Motor/Generator + Euclid/Frustum Ã—47 across predicted/HPQ/competency/config/
trends/topics/topicHubContent + the tutor teach-contracts. Owner decision was DELETE (not retag);
blurbs/contracts were REWRITTEN to stay syllabus-accurate. `keyIdeas` is a fixed 4-tuple, so removed
tutor teach-steps were replaced with marked in-syllabus steps (`[content-sweep 2026-06-04]`) â€”
structurally required, caught by the prod build (`tsc -b`), not by `tsc --noEmit`. `syllabusGuard.ts`
and `predictionTypes.ts` were NOT touched (content conforms to the guard; schema frozen). Diff = exactly
11 files, all `lazytopper/src/**`. **Deferred follow-up (D31):** the `polynomials` tutor contract still
teaches the polynomial *division algorithm* (out of 2026-27 quadratic-only scope) â€” the surface scan
deliberately omits bare "Division Algorithm", so it is NOT flagged; left out of scope, tracked for a
future guard-phrase + sweep PR. Trunk after #188: `e0395fc`.

## Syllabus guard CORRECTED to official 2026-27 + EXTENDED (#186) â€” RULER done (history)
The syllabus RULER is now correct and trustworthy (verified against the live official CBSE 2026-27
Class X syllabus â€” Maths 041/241, Science 086, cbseacademic.nic.in; owner-signed-off
`report-syllabus-verification-2026-06-04.md`). #186 fixed 3 correctness bugs and extended scope:
- **Step Deviation un-banned** (it is IN the official Statistics scope â€” the prior ban wrongly
  stripped an examined method); **3 confirmed-OUT Maths items added** (Area of Triangle in Coord
  Geometry; Conversion of Solids; cubic zeroesâ€“coefficient); **Evolution-section sub-topics banned
  while Heredity/Mendel/Sex-Determination are PRESERVED** (board-assessed; two-way test-asserted);
  Maths citation fixed 2025-26â†’2026-27.
- **Reproduction registry bug fixed (HIGH):** reproductive health / family planning / safe sex vs
  HIV-AIDS is IN-syllabus â†’ moved into `cbse_scope_bullets` (was wrongly excluded). Formative-only
  (Periodic Classification, Evolution section, Motor/EMI/Generator) vs truly-deleted (Sources of
  Energy, Mgmt of Natural Resources) relabelled with explicit `category` tags.
- **Guard EXTENDED to 24 board-prep surfaces** (HPQ, mocks, worksheets, practice/daily-mix,
  exam-trends/topic metadata, filters/config, **tutor teach-contracts**) via a curated word-boundary
  phrase scan (`SURFACE_BANNED_PHRASES`) â€” bare generics (Evolution, Generator, Motor, â€¦) deliberately
  excluded to avoid false positives on prose ("gas evolution") + code identifiers (`dailyMixGenerator`).
  Strictly-board-prep doctrine: formative-only + deleted topics excluded from EVERY surface INCLUDING
  the tutor. Tests 10â†’45 (per-surface-category, two-way preserved-term, precision). Two stale
  doctrine-locks corrected (registry-acceptance reproductive-health check inverted; opsAcceptanceGuard
  Block 4b made precise).
- At #186 the gating guard was **intentionally RED** on a **93-item sweep worklist** (banks: Conversion
  of Solids Ã—46; surfaces: EMI/Motor/Generator across predicted/HPQ/config/trends/topics/topicHubContent
  + the tutor teaching Euclid's lemma & evolution evidence) â€” matrix 174/175 (only #19 red by design).
  **That worklist was the spec for the CONTENT SWEEP, now DONE in #188** (see the arc-closed section at
  the top): all 93 deleted/rewritten, gating guard GREEN, matrix 175/175. D26 is fully closed.

## Responsive redesign (Option B) â€” FIRST convergence DONE (#184)
Exam Trends is the first surface converged under the LOCKED Option-B decision: ONE responsive
component (`src/pages/ExamTrendsRanked.tsx`) renders at every width (~360px â†’ desktop) and replaces
BOTH twins (the old desktop card grid `DesktopExamTrendsPage.tsx` + the old mobile tier list
`app/ExamTrends.tsx`, both deleted). `App.tsx` `/exam-trends` no longer does the `isDesktop ?
<Desktop/> : <Mobile/>` split â€” it renders the one component at all widths (still `DesktopShell`-
wrapped â‰¥1024px via `isDesktopShellRoute`, reflows fluidly below). Locked ranked priority-list:
trend-colored marks-weight bars, "Open" â†’ Topic Hub, "â‹¯" reveals Practice/Worksheet/Predicted/
Add-to-selection, Subject + Science-stream + Sort (Marks weight | Trend), multi-select tray. Design
grammar reused exactly; real data only (28 topics, both subjects, stream filter, honest trend tiers +
HPQ counts, no fabricated %); proof tag omitted (no real `proof` field). Gates green (tsc, build,
scope:guard --mode product, matrix 137/137). This sets the PATTERN for the remaining Option-B
surfaces (TopicHub, Check & Improve, Me/Progress, Worksheet). NOTE: the Exam Trends tiering/trend/
marks data is stale (D27) and must be re-derived fresh before the planned band redesign.

## Tutor teaching quality (RESOLVED on desktop â€” B2/#182, live-verified)
The concept_teach tutor now teaches in the owner-LOCKED style: answers the exact question
first (no Namaste/persona/flattery/filler-analogy openers, no "interactive above" narration);
stays strictly on the opened concept (no topic drift); organizes by marks with concrete board
examples; ends with exactly ONE step-marking follow-up offer. On "yes" it SOLVES ITS OWN
example with per-step `[Â½/1 mark]` CBSE step-marking â€” math spot-checked correct across both
subjects; plain-text notation (no LaTeX leak). General across subjects (Science conceptual is
not forced into a "prove it" offer). LIVE path = `server/prompts/promptLearn.cjs`
(`buildConversationalTeachSystemPrompt`) + the concept branch of `buildUserPrompt` in
`server/routes/mentorModeHandler.cjs` â€” NOT `promptTeachContract.cjs` (see DISCOVERIES D24).
Residual: occasional late analogy on a long first-teach message (~1/13 turns) â€” eval-set territory.

## Governance / gates
- scope:guard: **LIVE + monorepo-correct (#192)** â€” classifies `lazytopper/`-prefixed diffs correctly
  under `--mode product`; no longer false-FAILs every product edit (the path-frame bug that hit 3 PRs is
  fixed; `--relative` blind-spot fix rejected). NOTE: `git ls-files --others` is cwd-scoped, so **untracked**
  files *outside* `lazytopper/` are invisible to the guard (pre-existing; deliberately NOT widened â€” would
  false-FAIL on the untracked root `.claude/`; see OPEN_QUESTIONS D33). Was DEAD since `2081003`
  (a docs-cleanup chore) accidentally untracked `lazytopper/docs/project_memory/governance/
  repo_boundary_policy.json`, which two live scripts read; #176 restored it from history.
- `test:repo-boundary`: now RUNS again (4/5 checks pass). 1 pre-existing red:
  `vitest.config.ts` is tracked but matches no policy lane (`all_tracked_files_classified`)
  â€” backlog, deferred (see OPEN_QUESTIONS).
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
  failed" â€” this is EXPECTED, NOT a bug. Vercel has no `/api/*` route to deploy to yet
  (ISSUE-009); AI features work ONLY on localhost (gateway up + `API_SERVER_PORT=3001`, per
  D19) until the Railway deploy.
- LOCAL DEV RUN: gateway = `npm run dev:gateway` (node server/index.cjs :3001); app =
  `API_SERVER_PORT=3001 npx vite` (:25246 â†’ /app/). Both started SEPARATELY. See D19.

## Bank state
Total questions: ~6,318 (flat) / ~6,617 (incl. builders)
Authentic: 3,636 (58%) | AI-generated: 2,682 (42%)
Spreads: 332 (up from 266 pre-Sprint 1)
Tests: 137/137 PASS
PYQs: 760 total â€” all 4 main years complete
CBE Item Bank: 321 Qs (Maths 148 + Science 173)
CBSE Sample Papers (P5): 121 Qs (SP Maths 2022 + Science SQP 22-23 + OnBoard 2023)
CBSE Preboard SP1+SP2: 55 Qs (generated solutions, CBSE marking style)
Mojibake: 0 files affected
TopicKey orphans: 0
Filter system: ALL chips working
CBSE blueprint distribution: working (5-section parallel fetch)
COMPETENCY floor: gated by enforceCompetencyFloor flag
Render-test infra: Vitest 3.2.4 + Testing Library + jsdom (PR #160) â€” `npm test` in
  lazytopper/ runs src/**/*.test.tsx; 2 test files / 10 tests green (smoke + grammar);
  matchMedia polyfilled in src/test/setup.ts. Guard suite (137) unaffected.
Grammar primitives: PR #166 added src/components/grammar/ (Card, TileRow, Pill,
  SectionHeader, tokens, index) + the first real render test. TileRow reflows
  desktopâ†”mobile via a real @media(max-width:1023px) CSS rule (--lt-tile-cols var).
Mobile Home: PR #168 added src/pages/app/MobileHome.tsx (first page reflow) â€” the
  /browse cockpit now renders MobileHome below 1024px (isDesktop switch in App.tsx),
  stacking the 4 destinations via TileRow. Desktop DesktopHome render byte-identical.
  Shared firebase-free src/lib/desktop/homeDestinations.tsx (PRIMARY_CARDS + loginUrl)
  is the single source of truth for both Home variants. Vercel production deploy GREEN.
Mobile landing: PR #170 added src/pages/MobileWelcome.tsx â€” /welcome renders a
  swipe carousel (native CSS scroll-snap, 4 frozen v4 SVG cards) below 1024px
  (isDesktop switch in App.tsx). Desktop Welcome.tsx UNTOUCHED (zero diff). Sticky
  "Start free" â†’ /browse (no gate); honest sub-line "7-day Premium trial â€” then free
  Basic, upgrade anytime." (never "then paid"). Vercel production deploy GREEN.
Mobile Home polish: PR #172 rebuilt src/pages/app/MobileHome.tsx to the owner-locked
  polish design (mobile_home_locked_final.html): illustrated gradient SVG icons per
  destination, orient-before-act order for new students, persistent per-row hints, and
  an inspiring Mistake-Intelligence panel with a clearly-labelled SAMPLE report + honest
  "Start free â€” find my reasons" CTA (real-data wiring on the firebase-free boundary;
  signed-in shows an honest empty state, never invented counts). BottomNav (App.tsx)
  recoloured to the light app grammar (white surface, soft border, green active /
  muted-slate inactive) and expanded 3â†’5 tabs (Home / Exam Trends / Practice / Check /
  Me) on canonical routes; visibility gate intact. theme-color #58cc02â†’navy #0f1b33
  (index.html) kills the green browser-chrome banner. Global public navbar suppressed on
  mobile /browse + /welcome (isMobileSelfChromedRoute, gated on !isDesktop) so each
  mobile page shows ONE locked-design brand bar â€” Search no longer on mobile Home
  (owner-approved; not re-added). Desktop byte-identical. Tests 19â†’32. Vercel production
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
#152 â€” Handoff post-#150+#151
#153 â€” fix: filter UX redesign (student-language chips, pending/committed)
#154 â€” fix: source filter + chip constraints + ISSUE-006/007
#155 â€” fix: practice engine marks/section/competency/blueprint
#156 â€” docs: handoff post-#153+#154+#155
#157 â€” content: Sprint 1 CBSE CBE Item Bank + P5 Sample Papers (442 Qs)
#158 â€” content: CBSE Preboard SP1+SP2 generated solutions (55 Qs)
#159 â€” docs: handoff update post-#157+#158
#160 â€” chore: Vitest + Testing Library render-test infrastructure (tooling-only)
#161 â€” docs: handoff update post-#160
#162 â€” fix: exclude test files from production app tsconfig (Vercel green confirmed)
#163 â€” docs: handoff update post-#162
#164 â€” chore: decommission dead blackbox/tracker/pmem tooling + false-green tsc fix (Vercel green)
#165 â€” docs: handoff update post-#164
#166 â€” feat: shared responsive grammar primitives + first render test (Vercel green)
#167 â€” docs: handoff update post-#166
#168 â€” feat: mobile Home layout for /browse (reflow cockpit below 1024px) (Vercel green)
#169 â€” docs: handoff update post-#168
#170 â€” feat: mobile landing swipe carousel for /welcome (Vercel green)
#171 â€” docs: handoff update post-#170
#172 â€” feat: mobile Home polish + 5-tab light BottomNav + single brand bar <1024px (Vercel green)
#173 â€” docs: handoff update post-PR #172 (mobile Home polish; Vercel green)
#174 â€” fix: check-solution parse reliability (force JSON output + raise token cap; local-dev verified)
#175 â€” docs: handoff update post-PR #174 (check-solution parse fix; AI gateway live local; D19â€“D21)
#176 â€” fix: restore repo_boundary_policy.json (re-arm scope:guard + test:repo-boundary + ci:smoke)
#177 â€” docs: handoff update post-PR #176 (scope:guard re-armed; product decisions; D22â€“D23)
#178 â€” feat: tighten check-solution grading prompt (fix D21 over-classification; scenario-matrix measured; Vercel N/A â€” server-side)
#179 â€” docs: handoff update post-PR #178 (grading-prompt tightening; D21 resolved)
#181 â€” feat: wire concept tutor into desktop TopicHub (per-row "Learn this"; reuse ConceptTeachDrawer)
#182 â€” feat: tighten concept teach-prompt to LOCKED style (direct/no-fluff/on-concept; self-solved CBSE step-marking; live-verified)
#183 â€” docs: handoff update post-PR #182 (tutor visible + teaching LOCKED; pivot to responsive redesign)
#184 â€” feat: Exam Trends ranked-list responsive redesign (FIRST Option-B convergence; one component retires both twins; Vercel green)

## Parked / not-yet-merged branches
- **PR B (Part 1) â€” grading-prompt tightening â€” PARKED.** Committed on branch
  `feat/check-solution-grading-prompt` (`204ac7c`), NOT merged. Merges next, after this docs
  PR, once synced onto `1e9bd04`. (T4 accepted as Option 1 â€” documented boundary case; 3/19
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
| AI-Pack (pack1/2/3) | â€” | various *.pack*.ts | NO |
| Synthetic (AR/Proof) | â€” | various | NO |

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
| ~~D21: check-solution OVER-classifies as conceptual~~ RESOLVED (#178) | Grading prompt tightened + measured 6/9â†’8/9 on T1â€“T9; sign-misread now SILLY, propagated errors single-root-cause, missingâ†’null, unbalancedâ†’presentation. T4 = accepted boundary case (see DECISION_LOG). | DONE |
| Rate limiting on API gateway | Bundle with gateway PR | XS |
| Repo-wide solutionSteps step-mark audit | Older questions missing [N mark] prefix | M |
| AR/Section/Marks tagging audit | Some AR questions tagged as Section D 5mk | S |

## Open P2 issues (post-launch)

CFPQ OCR extraction (300 image-only Qs) | K2D Mistake Intelligence aggregation |
Pack regeneration with Claude | TutorDrawerV2 | isPYQ backfill |
Diagram SVG generation (116 tagged questions) | PYQ 2021-22 Term II adaptation |
PYQ 2018-19 (heavy banned topic overlap) | Sentry/error monitoring backend

## Next safe actions (in order)

1. **CONTENT SWEEP (HIGH, NEXT)** â€” clean the 93-item worklist surfaced by the corrected guard
   (banks: Conversion of Solids Ã—46; surfaces: EMI/Motor/Generator + tutor teaching Euclid's lemma &
   evolution evidence). Turns the gating syllabusGuard + matrix #19 GREEN. Completes D26.
2. Re-derive Exam Trends priorities FRESH (tier+trend+marks) [D27]; recheck HPQ counts â†’ then the
   Exam Trends band redesign (Must-crack / High-ROI / Good-to-do).
3. Then the other Option-B surfaces (TopicHub + Formula/Notes, Check & Improve, Me/Progress, Worksheet).
4. API gateway Railway deploy with rate limiting bundled (P0); Clerk pk_live_ switch (P0).
5. check-solution eval set (launch gate, P1); GitHub Actions CI + practiceFilterGuard.test.ts (P1).
6. Case-Based "Easy" re-tag (XS); repo-wide solutionSteps step-mark audit (M); AR/Section tagging audit (S).
7. Practice session debrief (P1); PYQ 2019-20 extraction (after download).

## Confirmed launch domain
lazytopper.in (owner-confirmed 2026-06-01 â€” NOT .app; earlier ".app" was wrong).
Verify DNS in Vercel before P0 gateway work starts.

## Owner clarifications (2026-06-01) â€” LOCKED
- Trial = ALL features for 7 days (full tutor + checker + everything), then reverts to
  free Basic. Gate is trial-not-paywall during those 7 days. No client-side premium/trial
  activation (doctrine unchanged): trial state comes from server/admin only.
- Fully responsive across ALL screen sizes â€” one fluid layout adapts at every width, NOT
  a 1024px desktop/mobile twin switch. This is more work than porting a mobile twin and is
  the target for the redesign (Track A).
- PR numbering follows git (next sequential, #175+). "PR-1..8" in the Track A breakdown are
  logical labels â€” map them to real git numbers.
- Two-track build, LOCKED: Track A (design/UI â€” fluid responsive redesign) + Track B
  (content: interactives via Claude, proofs, formula sheets, pre-generated PDFs) with
  robust content QA. Source specs are owner/architect-held (LazyTopper_Learn_Flow_Spec_
  LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md) â€” NOT yet committed to this repo.

## Operating model unchanged
Chetan = owner/merger | Claude chat = architect/planner | Claude Code = executor
Co-Authored-By: Claude Opus 4.8 (1M context)
