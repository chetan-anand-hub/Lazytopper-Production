## 2026-07-13 -- #397: CT balanced PYQ+fresh mix MERGED (trunk `6db7f1d`)

### CLOSED by #397
- **[FU-CT-BALANCED-MIX] — CLOSED.** The Chapter Test now sources each section (A–D) through the SHARED `drawBalancedSet` (`utils/balancedMockDraw.ts`, reused verbatim — helper byte-unchanged, not forked), mirroring the Full Test's pass-1 per-cell pattern, so a CT paper deliberately mixes real PYQs with fresh authored/extracted questions (~50% PYQ target, honest fallback for thin/zero-PYQ topics). SOURCING-ONLY: paper shape/marks/grading/scorecard/numbering byte-identical; the `MIN_TEST_QUESTIONS` honest gate confirmed intact after the draw; seed minted in-blueprint (FT's recipe) so `ChapterTestPage.tsx` stays byte-unchanged (owner-ratified — keeps the diff to one logic file). New `chapterTestBlueprint.test.ts` proves the seeded wire (same-seed/different-seed) + the zero/thin-PYQ honest fallback. Owner byte-reviewed CLEAN. Owner live-verify pending (visible PYQ+fresh mix; thin-PYQ still a full valid paper).

### NEW (open)
- **[FU-BANK-UNRESOLVABLE-MCQ-KEYS]** (surfaced by #397 — bank lane, **before-launch scoring-correctness fix**). A full-bank scan (run in the Codespace while building #397's test) found **34 MCQs bank-wide whose `answer` string-resolves to NO option** under the grader's exact `norm` (trim+lowercase equality, `chapterTestGradeService.ts` / the shared objective scorer). Any of them drawn into CT **or FT** Section A can NEVER be scored correct — the student's selected option text never norm-equals the key. Distinct from the repaired [FU-BANK-CORRUPT-KEYS] population (none are in `docs/objective-answer-key-review-queue.md`). Failure classes: (a) trailing marks-digit / MS-reference swept into the key (PYQ extraction — `"30-40 1"`, `"96° 1"`, `"8.4 cm 1 MS_X_Mathematics_041_30/4/2_2023_24"`); (b) spacing/format mismatch (`"1 : 2"` vs option `"1:2"`, PYQ-M-RN-001); (c) AR letter-code answers vs full-text options (`"A"` / `"D. A is false, R is true."` — **6 are Batch-5 REP2-***, so the [[bank-expansion-lane]] authoring template must enforce `q.answer` = exact option text, per the [FU-BANK-CORRUPT-KEYS] rule); (d) marking-scheme boilerplate as the answer (whole Q malformed — PYQ-S-2024-ELEC-001/MAG-002/LIGHT-001/METAL-002); (e) mangled math glyphs / duplicate junk options (PYQ-M-PROB-002/003/005/006/008/010, PYQ-M-ARC-003, PYQ-M-QE-001, PYQ-M-TRI-001/003). **Full 34-id list:** REP2-014, REP2-018, REP2-019, REP2-040, REP2-042, REP2-043, CTRL-EXMPLR-6-MCQ-025, CBE-M-PROB-A-009, CBE-S-MAGN-A-001, PYQ-M-RN-001, PYQ-M-PLE-003, PYQ-M-QE-001, PYQ-M-TRI-001, PYQ-M-TRI-003, PYQ-M-CG-001, PYQ-M-CIRC-004, PYQ-M-ARC-002, PYQ-M-ARC-003, PYQ-M-STAT-002, PYQ-M-STAT-004, PYQ-M-PROB-002, PYQ-M-PROB-003, PYQ-M-PROB-005, PYQ-M-PROB-006, PYQ-M-PROB-008, PYQ-M-PROB-010, PYQ-M-2024-QE-001, PYQ-M-2024-QE-002, PYQ-M-2024-CIRC-004, PYQ-M-2024-CIRC-005, PYQ-S-2024-METAL-002, PYQ-S-2024-LIGHT-001, PYQ-S-2024-ELEC-001, PYQ-S-2024-MAG-002 (also in `report-ct-balanced-mix-2026-07-13.md`). Note: two sit under `magnetic-effects-of-electric-current` (CBE-S-MAGN-A-001, PYQ-S-2024-MAG-002) — §5 lists that chapter as deleted/banned from banks, yet the syllabus guard passes with them present; flagged for the owner to adjudicate, not acted on here.
- **[FU-FM-BLUEPRINT-TEST-SEED-LUCK]** (surfaced by #397). `fullMockBlueprint.test.ts` still carries the strict "every Section-A key resolves to an option" assertion; it currently passes ONLY because seed 11's draw happens to miss the 34 unresolvable keys above — a latent CI landmine any bank batch (which shifts what a fixed seed draws) can trip. Relax it to the real sourcing contract (options present + non-empty key), the same way #397's CT test does, OR fix the 34 keys ([FU-BANK-UNRESOLVABLE-MCQ-KEYS]) first. Low-effort test-only hygiene; do before it reddens CI on an unrelated bank PR.

## 2026-07-13 -- #396: bank-expansion Batch 6 (heredity +44) MERGED (trunk `ae5e671`)

### Updated
- **[FU-D-BAND-HONEST-CEILING]** — extended: heredity honest-stopped at D→32 AND E→22 (a very narrow, saturated chapter). Evidence now spans life-processes D→53 / our-environment D→16 / reproduce D→67 / heredity D→32 & E→22. The band-scarcity policy is working: extract-max where the reservoir is deep, honest-stop with a distinct-principle/method inventory where it isn't. Not a shortfall; do NOT pad.

### Confirmed clean (no action)
- Batch 6 owner byte-review: read every syllabus-boundary grep hit — "homologous" = homologous CHROMOSOMES (in-syllabus Mendelian cell basis, NOT the banned homologous ORGANS); ABO/linkage/codominance = substring false positives (aBOut, standard complete-dominance crosses, autosomal pedigrees). 162 in-syllabus Mendel refs, correctOption 0, topicKey heredity. The skeptic's codominance-mislabel catch (roan cattle) validated the concept-scoped (not phrase-only) skeptic as load-bearing.
- **Note on a pre-existing bank evolution leak:** a banked heredity item (`SCQ-S-HERED-041`, speciation/geographical isolation) is Class-12/board-deleted evolution content that predates this lane. Batch 6 did NOT use it as license (authored/extracted heredity-only). Candidate for a future data-quality cleanup pass (same spirit as [FU-BANK-EXACTNORM-DUPS]); not blocking.

## 2026-07-13 -- #393: bank-expansion Batch 5 (how-do-organisms-reproduce +148) MERGED (trunk `820d013`)

### NEW (open)
- **[FU-D-BAND-HONEST-CEILING]** — reproduce Section-D honest-stopped at 67 (below the ≥75 floor) because the chapter's 37 banked D-items already span plant + human reproduction; ~8 more would have been number-swaps. This is the third mature-chapter D honest-ceiling (life-processes D→53, our-environment D→16, reproduce D→67) — confirms the band-scarcity policy: a uniform 75 D-floor is pedagogically unnatural for chapters CBSE rarely sets many distinct 5-mark items on. Not a shortfall; do NOT pad. Flagged for ratification alongside the pre-existing [FU-DBAND-PEDAGOGICAL-FLOOR]; not blocking.

### Confirmed clean (no action)
- Batch 5 owner byte-review: both syllabus directions clean (zero evolution/Darwin AND zero reproduce-specific Class-12 leak — no gametogenesis / hormonal-cascade / embryology detail), all 148 solutions present, correctOption 0, topicKey canonical. E honest-stopped at 72 DISTINCT (3 structural twins dropped, not padded to 75).

## 2026-07-13 -- #391: FT finalize MERGED (trunk `25257c0`)

### CLOSED by #391
- **[FU-FM-HUB-ENTRY] — CLOSED.** Practice-hub "Full Test" card (locked copy) + DesktopHome per-subject tiles + the MI-panel link all navigate PLAINLY to `/full-mock/:grade/:subject` — MockViewGate on the route is the ONLY gate. Old-engine entries retired: "Open existing full-mock engine" (→ /exam-simulation), the circular "Practice Paper" card (→ un-routed /mock-builder), and a third DISCOVERED dead link (DesktopHome mistake-strip). Executable RTL nav proof in-repo: `DesktopPracticePage.fullTestNav.test.tsx` (both subjects, both widths, no second gate).
- **[FU-FM-CROSS-DEVICE-UPLOAD] — CLOSED.** `services/fullMockPaperStore.ts` persists the drawn paper (TEXT only — never the uploaded answer image, not even typed answers) at `sessionRecords/{uid}/fullMockPapers/{code}` under the EXISTING recursive owner-only rule (**firestore.rules byte-untouched**); `openPendingUpload` fetches + re-seeds when the local session is gone (cross-device AND the 3-session eviction); best-effort delete after full grade. The verbatim "sat on another device" line remains for true misses — no fabricated paper, ever.
- **[FU-TOPIC-DISPLAY-TITLECASE] — CLOSED.** The fallback keeps connectives lowercase ("Pair of Linear Equations", "Control and Coordination"); registry titles win; keys untouched; `topicResolver.test.ts` proves it.
- **[FU-SCORECARD-STALE-HEADER-COMMENTS] — CLOSED.** Comment-only truth-updates in `scorecardVariants.ts` + `ResultsScorecard.tsx` (all four variants LIVE; the `deferred` stubs are legacy PR-2 seams + the render-guard's fixtures).

### NEW (open)
- **[FU-RETIRE-EXAM-SIMULATION-LINKS]** (owner-directed 2026-07-13) — 6 legacy pages still link the old `/exam-simulation` engine: `pages/app/PracticeHome.tsx`, mobile `pages/Home.tsx`, `ProfilePage.tsx`, `PredictivePapers.tsx`, `DailyMixPage.tsx`, `components/dashboard/ExploreMorePanel.tsx` (+ the App.tsx command palette `navigateToMockTest` — App.tsx is forbidden, owner-authorized-lines-only). #391 removed every hub/Home entry; this is the broader old-surface retirement lane (the route + `ExamSimulationPage` stay live behind `RequirePremium` until then).
- **[FU-VITEST-PREEXISTING-FAILURES]** — 6 vitest failures in 3 files reproduce IDENTICALLY on trunk `17b4c34` (pre-#391): `worksheetPdfExport.test.ts` ×5 ("pdf.addImage is not a function" — jspdf mock/environment rot), `ConceptSpine.test.tsx` ×1, `objectiveScoring.parity.test.ts` (module-level error). **Invisible to CI** — quality-gate runs the matrices, NOT vitest — so they linger silently. Fix in a scoped hygiene PR; consider wiring vitest into CI once green.

## 2026-07-12 -- #387: Full Test (Full Mock) MERGED (trunk `f6522d0`)

### NEW (open) — all intended scope boundaries, NOT defects; close each as its own scoped follow-up PR
- **[FU-FM-HUB-ENTRY]** — the `/full-mock/:grade/:subject` route is LIVE (MockViewGate, bare full-screen) but
  UNLINKED: no Practice-hub / Home entry card yet. Owner verifies via `/full-mock/10/Maths` · `/full-mock/10/Science`.
  A nav/hub entry card is a small follow-up PR (touches the hub, deliberately out of #387's scope).
- **[FU-FM-CROSS-DEVICE-UPLOAD]** — cross-device "upload later": the drawn paper exists only on the device that
  sat the mock (device-local session cache), so a cross-device re-open shows the REAL objective score + an honest
  "sat on another device" line — never a fabricated paper (owner-ratified anti-fabrication call). Closing it
  properly needs a durable paper snapshot; decide alongside the [FU-CI-SOLUTION-CACHE]-family storage questions.
- **[FU-CT-BALANCED-MIX]** — the Chapter Test can now reuse `drawBalancedSet` (`src/utils/balancedMockDraw.ts`,
  shipped standalone by design; signature in SESSION_LOG). Small follow-up PR wires the CT draw to the same
  PYQ/fresh balance + shows the honest mix line on CT setup.

### Deferred/observed during the build (small, cosmetic or pre-existing)
- **[FU-SCORECARD-STALE-HEADER-COMMENTS]** — `scorecardVariants.ts` + `ResultsScorecard.tsx` header comments still
  describe CT/FM as "deferred config seams / never rendered" — stale since #374, doubly so after #387. Cosmetic
  comment-only cleanup; left untouched to keep both diffs scoped.
- **[FU-TOPIC-DISPLAY-TITLECASE]** — `resolveTopicDisplayName`'s fallback title-cases every word ("Pair Of Linear
  Equations", "Control And Coordination") where the canonical chapter title has no entry; visible in the FM
  weightage legend for a few chapters. Cosmetic: either add the missing canonical titles or lowercase the
  connective words in the fallback.
- **[FU-FM-DELTA-SAME-TOTAL-ONLY]** — the honest-or-silent mock-to-mock delta compares only when both mocks share
  the same graded total (a fair /80 comparison); a mock with unreadable pages (partial total) stays silent.
  Intended honesty rule; noted so nobody "fixes" the silence into a misleading cross-total delta.

## 2026-07-12 -- #384 + #385: bank-expansion Batch 2 + 3 MERGED (trunk `ce34b3e`)

### NEW (open)
- **[FU-FIGURE-PENDING-SAFEGUARD] (standing doctrine).** A question un-answerable without a PROVIDED figure
  ("label the parts", "identify structure X") must NOT ship answer-less — ship the real figure (notes toolkit,
  Bucket A extraction preferred; B/C only if skeptic-verified to match) or add its id to `WITHHELD_QUESTION_IDS`
  until the figure lands. A TEXT-answerable question merely enriched by a figure may ship. Maintain a running
  figure-pending list in `handoff/BANK_EXPANSION_LANE_STATE.md`. **Batch 3's 2 flagged items classified
  ENRICHMENT** (LPSD-009 respiratory: describe-in-words; LPSD-018 heart: "draw a labelled diagram" is
  student-produced, not provided-figure-dependent) → both ship as-is, reference figure a later enhancement.
- **[FU-BANK-EXPANSION-SOURCE-SWEEP] — WORKING/confirmed.** Per-source exhaustive sweep + table is now standing
  for every batch (Batch 2 corrected real-numbers; Batch 3 life-processes proved reservoir depth 75 vs 23).
- **[FU-BANK-EXPANSION-RESWEEP-REALNUMBERS] — CLOSED by #384.** Corrective sweep done; real-numbers A/B/C reservoir
  proven ≈23 net-new by exhaustion (chapter saturated). Scarce ceiling ≈24 distinct methods (audit in #384).

### Carried from Batch 1
- **[FU-EXTRACT-CONTENT-F13]** — folded into the standing source-sweep discipline (Content folder 13 now swept per topic).
- **[FU-BANK-EXACTNORM-DUPS]** — ~114 PRE-EXISTING exact-norm dup groups in the bank (batches contribute 0); data-quality cleanup, separate lane.

## 2026-07-12 -- #381: bank-expansion Batch 1 MERGED (trunk `3866a94`)

### NEW (open)
- **[FU-BANK-EXPANSION-SOURCE-SWEEP] (standing discipline for every future batch).** Batch 1 A/B/C was
  UNDER-EXTRACTED -- it pulled net-new from only TWO files (cbjemacq01 + jeep201 -> 10 net-new), which is NOT
  extract-max. For EVERY topic from now on, before concluding a net-new count, EXHAUSTIVELY sweep ALL sources:
  the whole `Content\` folder (all 14 study-package folders -- docx incl. TABLES, pdf, pptx) AND all of
  `diff\cbse-papers\` (CBSE Practise Papers [Maths Std 234pp / Science 321pp], PYQ+MS pairs, NCERT Exemplar,
  chapter-wise online MCQ + Previous-year, "together with"). Fingerprint every candidate vs the current 7,114+
  bank; extract every genuine net-new (differs in more than numbers). MANDATORY per-topic report: the sources
  SWEPT + per-source counts (candidates / DUP / borderline / NET-NEW). A saturated topic may still yield few --
  but PROVE it by exhaustion + the per-source table, never by sampling 2 files.
- **[FU-BANK-EXPANSION-RESWEEP-REALNUMBERS]** -- Batch 1 under-swept real-numbers A/B/C; do a corrective pass
  across ALL sources and open the missed net-new as a small follow-up batch, with the per-source table.
- **[FU-DBAND-DISTINCT-CEILING]** -- before honest-stopping a scarce band below 50, EXHAUST the distinct-scenario
  space and report the distinct-method inventory + WHY it caps (Batch 1 stopped at case ~25 / long ~21; verify
  that IS the ceiling by inventorying every distinct method tried, not a soft stop).
- **[FU-EXTRACT-CONTENT-F13]** -- Content "Question Bank" (folder 13) not swept in Batch 1 (folded into the
  source-sweep discipline above).
- **[FU-BANK-EXACTNORM-DUPS]** -- the assembled bank has ~114 PRE-EXISTING exact-normalized-questionText dup
  groups (not from Batch 1; the +30 contribute 0). Data-quality cleanup candidate, separate lane.

## 2026-07-12 -- #380: CT concept-lens + bare full-screen MERGED (trunk `5bd148c`)

### CLOSED by #380
- **[FU-CT-CONCEPT-LENS] -- CLOSED (`5bd148c`).** The CT full scorecard now derives a by-CONCEPT (subtopic) lens: `deriveChapterTestConceptLens(response, questions)` joins each graded question `qNumber -> paper questionId -> canonical subtopic`, aggregates awarded/total per subtopic, sorts by marks lost. Rendered BETWEEN the by-section lens and the four-type (Full-Mock arrangement: section -> concept -> four-type). DERIVED at render, never persisted (`sectionBreakdown` stays null); honest-unknown (an unresolvable subtopic counts in the hero total but forms NO concept row) -> null when none resolve (shell omits). Shows ALL resolved concepts, sorted by loss (owner decision, over loss-only). Wired live-full (`paper.questions`) + guarded stored-reopen (1:1 `questionIds`<->`results` length check, else omit -- no mis-attribution). Signature note: the grade response carries `qNumber` NOT `questionId`, so the fn takes the id-bearing questions as a 2nd arg.
- **[FU-CT-HEADER-UNIFORMITY] -- CLOSED (`5bd148c`), route-scoped.** Owner chose the chrome-less test surface (not a global restyle): new `isBareFullScreenRoute` in `App.tsx` suppresses the legacy dark header AND (owner-authorized) the mobile BottomNav on `/chapter-test` at BOTH widths, via one helper. `DesktopShell.tsx` byte-unchanged -- the header on the test was the NON-shell legacy navbar, not the shell (CT was already excluded from `isDesktopShellRoute`). The App.tsx change = the owner-authorized bare-route exception only. CT already rendered a full-bleed `min-h-screen` surface -> no structural CT change needed.

### NEW (open, deliberate later)
- **[FU-RETIRE-OLD-GLOBAL-HEADER]** -- the product-wide retirement (or restyle to the new grammar) of the legacy dark "premium header" = the NON-shell navbar in `App.tsx`. #380 stopped CT from rendering it (route-scoped via `isBareFullScreenRoute`); it still renders on the OTHER non-shell routes. Retiring it product-wide is a DELIBERATE, later change -- not blocking. `isBareFullScreenRoute` is prefix-list structured so `/full-mock` (and any future bare surface) joins with one entry.

---

## 2026-07-12 -- Chapter Test BUILT to the locked spec (#374, `e54ab8c`), owner live-verified

### NEW FOLLOW-UPS (fast-follow before the `MockViewGate` flips) -- BOTH CLOSED by #380 (see top)
- **[FU-CT-CONCEPT-LENS]** _(CLOSED by #380 `5bd148c` -- see top)_ -- the chapter-test scorecard lands a by-section (A–D) lens + the four-type MI, but NOT a subtopic-level ("concept") weak-area breakdown. `subtopic` IS a field on `CanonicalQuestion`, so a concept lens is DERIVABLE (Full-Mock parity) at render from the graded per-question results joined to the bank -- the same derive-don't-persist discipline as the A–D lens (D3). Owner wants this before the CT gate flips live.
- **[FU-CT-HEADER-UNIFORMITY]** _(CLOSED by #380 `5bd148c` -- see top; resolved route-scoped, not a global restyle)_ -- the full-screen test-taking view is meant to be chrome-less, but the DesktopShell GLOBAL product header still renders on top. Removing/restyling it is a **forbidden-file** change (`DesktopShell.tsx`). OWNER DECISION needed: a global header restyle (applies everywhere) vs a chrome-less test surface (route/shell exception). Fast-follow before the gate flips.

### DEFERRED (non-blocking, agent-surfaced)
- **[FU-CT-REOPEN-DOWNLOAD]** -- reopening a stored test from the history rail is the PR-3 **light** re-open (score + four-type + derived A–D lens + Done). Graded-sheet / solution-key downloads on a reopen would need reconstructing the in-memory `PersistedWorksheet` from the record's `questionIds` (join to `canonicalQuestionBank`) -- deferred; the live post-grade path has both downloads.
- **[FU-CT-CODE-TOKEN]** -- the CT code reuses `topicAbbr` for cross-surface consistency (`WS-M-RN-03` <-> `CT-M-RN-02`), so the token is `RN`, not the mockup's illustrative `REALNO`. By design; logged in case the owner prefers the longer token later.

---

## 2026-07-12 -- Notes fan-out COMPLETE + NCERT click-through LIVE; ledger-cites PR #376 in review (#364 -> #376)

### RESOLVED
- **[FU-NOTES-NCERT-PDF-HOSTING] -> RESOLVED.** The 26 NCERT chapter PDFs are hosted at Firebase Storage `ncert/{subject}/ch{N}.pdf` (bucket `lazzyy-topper.firebasestorage.app`); the `ncert/` public-read Storage rule is published; bucket CORS is set (origin `*`, GET/HEAD). With the #375 per-chapter offset map (`ncertPdfOffsets.ts`) live, the note's `p.N` cite opens the correct printed page -- owner-verified (Trigonometry p.114, Heredity p.129). Copyright: owner confirmed NCERT is publicly available.
- **[FU-CHEMISTRY-EXEMPLAR-WIRE] -> RESOLVED.** Chemistry chapters gate on the merged Chemical Reactions exemplar (#365); the conformance mapping was wired at #368 (floors 5/3/1/1/2 -> 7/4/3/2/3).
- **[FU-SOLO-OWNER-APPROVAL] -> RESOLVED (by design).** The trunk ruleset sets **required approvals = 0** deliberately: GitHub forbids a PR author from approving their own PR, and the owner is the sole code-owner AND the author, so any >0 requirement would hard-block every merge. Mechanical checks (`quality-gate` + `lane-overlap`, required) + the independent auditor carry the review load. **Do NOT re-enable approvals.**
- **[FU-COORD-LEDGER-IN-HANDOFF] -> RESOLVED.** The machine merge ledger was relocated out of `handoff/` to `ledger/MERGE_LEDGER.md` (machine-only, do NOT hand-edit).

### NEW FOLLOW-UPS
- **[FU-LEDGER-CLICKABLE-CITES]** -- Part A of this task, **PR #376 IN REVIEW** (not self-merged). The Source-Ledger table's `p.N` is now clickable, reusing the body cites' `CiteLine`/`NcertPageModal` path (new `LedgerSource` in `Note.tsx`). Anti-fabrication: links ONLY a real in-this-chapter NCERT page; 470/474 rows clickable, 4 correctly stay plain (3 figure-only refs + 1 non-NCERT PYQ); page ranges (`pp.8-9`) link to the first page; display byte-unchanged. No spec/schema/grader change; `validate_spec.py --all` VALID.
- **[FU-STATE-BOARD-SUMMARY-ONLY]** -- `github-actions[bot]` cannot be added to the ruleset bypass list, so the state-board workflow cannot push to trunk; `ledger/MERGE_LEDGER.md` auto-append is therefore **summary-only**. Harmless -- the human narrative (`CURRENT_STATE.md` / `SESSION_LOG.md`) carries the merge record (SHAs #364 -> #375 logged there). Revisit only if GitHub exposes the Actions actor for the bypass list.

### STILL OPEN (carried)
- **[FU-HANDOFF-DOC-DRIFT]** (from #363) -- still owed. This catch-up PR prepends accurate #364 -> #376 records to `CURRENT_STATE` / `SESSION_LOG` / `OPEN_QUESTIONS` / `SURFACE_TRACKER` and refreshes `NEXT_ACTION`'s pointer, but does NOT rewrite the drifted bodies below (or the pre-existing mojibake in `CURRENT_STATE` line 1). A dedicated docs-hygiene pass is still owed.
- **Content lane depth-floor** -- PENDING Pass-2 of the bank-extraction audit (Content-folder survey + all mark-bands). Case-based is an AUTHORING lane (Z3), not extraction.

---

## 2026-07-11 -- P0 Topic-Key Root Cure REBUILD merged (#363, `6ecf15f`)

### RESOLVED (closed by #363)
- **[FU-TOPICKEY-UNIVERSAL] (P0) -> CLOSED.** One product, one topic key. C2 migrated every non-canonical topicKey to its `topics.ts` slug (2,514 literals / 52 files, both object styles + factory + the 26 inline aggregator questions), proven lossless. C3 made it non-regenerable: a **dual-style Guard A** + an **authoritative import-based runtime proof** are wired into the CI matrix, so a non-canonical key can no longer enter the served bank. The 4 previously-zeroed Science chapters (Chemical Reactions, Acids-Bases-Salts, Metals-Non-Metals, Reproduction) now return questions; circles != areas-related-to-circles and light != human-eye stay disjoint. Owner independently confirmed 7084 / 0 dup / 0 orphan / 26 keys and live-verified. The prior attempt's blind spot -- a `\btopicKey:` regex skipping 124 JSON-style files, plus a hardcoded `length === 5146` -- is fixed and negative-tested.

### NEW FOLLOW-UPS (surfaced by #363; none lost)
- **[FU-AGGREGATOR-INLINE-QUESTIONS]** -- `canonicalQuestionBank.ts` holds **26 inline JSON-style served questions** (9 of the 34 orphan keys, incl. all 3 approved singletons). They had to be migrated in C2 (0-orphans is impossible without them), which exceeded 3A's "questionBanks-only" scope (owner-RATIFIED). Relocate them to a `questionBanks/**` pack so 3A holds literally; then the data commit is purely under questionBanks again.
- **[FU-TOPICHUB-MASTERY-STORAGE-KEY]** -- `services/topicHubMastery.ts` (mastery snapshots to localStorage + Firestore) and the dormant `services/spacedRepetitionEngine.ts` key their records with `normalizeTopicKeyForStorage` / a `${topicKey}::${conceptKey}` composite, NOT `resolveCanonicalSlug`. C1 deliberately preserved this key so already-stored mastery is not orphaned (no backfill). A writer/reader asymmetry exists (TeachFlow writes the raw key; ProfilePage reads the alias-collapsed canonical). Reconcile the storage-key scheme with the canonical vocabulary -- migration-sensitive, needs a stored-data-safe plan. Guard D honestly reports this layer as out-of-scope rather than silently claiming coverage.

### STILL OPEN (carried, related to the P0)
- **[FU-MI-TOPICKEY-BACKFILL]** -- weak-area unification normalises at the boundary (new writes + read-time aggregation) with **no backfill**; already-stored MI records under variant keys are not rewritten. A one-time backfill would need the same migration-safety care as the mastery-storage FU.
- **[FU-MENU-HEREDITY-MAGNETIC]** -- the worksheet menu keeps Heredity + Magnetic Effects OFF (owner decision 2A); the canonical vocabulary uses `heredity` (never the banned `heredity-and-evolution`) and `magnetic-effects-of-electric-current`.
- **[FU-DELETE-SHARED-DATA-DUPE]** -- the `lib/shared-data/` duplicate bank was NOT migrated (out of the served path); propose deletion.
- **[FU-RETIRE-CBSE10CANONICAL-VOCAB]** -- `topicAliasMap.resolveCanonicalTopicKey` is demoted (it emits the banned `heredity-and-evolution` + a rival vocabulary); retire it in favour of the single `topics.ts`-slug authority once all consumers are migrated.
- **[FU-PREINSTALL-GUARD-SH]** (carried from #360) -- root `preinstall` shells out to `sh`; replace with a Node guard. Own tiny chore PR.
- **[FU-HANDOFF-DOC-DRIFT]** -- `CURRENT_STATE.md` / `NEXT_ACTION.md` / `IMPLEMENTATION_ROADMAP.md` are drifted (CURRENT_STATE line 1 also carries pre-existing mojibake + the top entries are out of order). This docs PR prepends an accurate #363 record but does NOT rewrite the drifted body; a dedicated docs-hygiene pass is still owed.

---

## 2026-07-10 — Worksheet: scope DERIVED from the topic selection + MI 2c copy merged (#360, `b096a8a`)

### ✅ RESOLVED (closed by #360)
- **[FU-WS-SCOPE-DERIVE] → CLOSED.** Scope is now **derived** from the selection, not an independent control. `selectedTopics[]` + `allTopics` are the single source of truth; `scope`/`singleTopic`/`multiTopics` are derived views with stable array refs (`EMPTY_TOPICS` when not multi-topic) so every downstream consumer stayed untouched. `scope = allTopics ? full-subject : selectedTopics.length >= 2 ? multi-topic : topic`. The three-way Scope segmented control + topic dropdown + separate multi/full chip lists were replaced by ONE unified topic picker (an "All topics" toggle + per-topic chips) with an honest derived label (`Topics — 2 selected · multi-topic`). **Ticking topics IS the scope** — no ticked topic can be silently discarded (the #357 defect: the in-app tick never called `setScope`, so the build used `validMulti[0]` and dropped the rest). vitest 18/18; 4-lens adversarial review 0 findings. A direct instance of the product principle logged below.
- **[FU-WS-MI-COPY] → CLOSED.** State 2c reworded to the locked copy — *"You haven't lost marks in **{scopeLabel}** yet. Right now your weak area is **{X}** — focus this worksheet there, or add it alongside."* (`&rsquo;` entity used). Wording only; the same state fires and the one-tap remedy button is unchanged. State 2a was already softened in #357; the three MI states stay distinct.
- **[FU-PNPM-PACKAGEMANAGER-PIN] → RESOLVED.** Root `package.json` now pins `"packageManager": "pnpm@10.32.1"` (commit **`581b0dd`**). `pnpm install --frozen-lockfile` succeeds in a fresh worktree. **Gotcha D42 is retired** — it was the symptom, not the disease. `quality-gate.yml`'s `corepack prepare` line is now belt-and-braces; its **line-38 comment asking for this pin can be deleted** (a trivial residual cleanup for a future code PR — NOT done here, docs-only).

### 🟡 STILL OPEN — P0 (dispatched separately to a fresh agent; do NOT start it here)
- **[FU-TOPICKEY-UNIVERSAL] (P0 — the root cure) — FULL DIAGNOSIS (inherit from the repo, not chat).** The bank stores **51 distinct `topicKey` values for ~26 chapters** — **25 Title-Case** (`"Acids, Bases and Salts"`) and **26 slug** (`acids-bases-and-salts`); most chapters exist under BOTH. `getTopics()` emits a **third** vocabulary. The canonical registry is **`src/lib/desktop/topics.ts`** (28 slugs — **`src/data/topics.ts` does not exist**). The resolver already exists: **`topicAliasMap.ts`** (`normalizeTopicSlug`, `resolveCanonicalTopicKey`, `getRuntimeTopicCandidates`). **Only Quick Practice, `questionTypeFirstResolver`, and `scopePolicy` resolve; worksheet, Chapter Test, and Full Mock match RAW** — so **≈1,180 questions across four Science chapters are unreachable** (owner-confirmed live on Chemical Reactions). **The WRITE path drops too** (prior audit G9: a slug mismatch is a silent no-op → MI logging / weak-areas / `sessionRecords.topicKeys` can fail or double-bucket). The normaliser has **real blind spots**: `OurEnvironment` vs `our-environment` → 76 questions unreachable; en-dashes; parenthetical suffixes. **A prior audit already chose the cure — consolidate the data + a CI guard — and it was never executed; every attempt since applied a query-time patch to ONE surface, and the variants regenerated.** `WorksheetGenerator.tsx` carries **two `// TODO(P0-topickey)` raw compares** (`drawnWeakTopics` + the sibling `rankedWeakKeys.has(q.topicKey)`) waiting for this PR. **Fix = the three-commit root cure:** (1) **resolve everywhere, read AND write**, normaliser hardened; (2) **migrate the data**, proven lossless by a **count invariant** (identical totals, identical id sets, identical per-topic × section × mark-band cells — **any mismatch STOPS the PR**); (3) **four CI guards** making a non-canonical key impossible to enter the repo. **Also fix the alias-map errors:** `circles` ⇄ `areas-related-to-circles` currently return an **identical merged 454-question pool**; `Human-Eye` (209 Q) **orphans** from `light`. Related: **[FU-MI-TOPICKEY-BACKFILL]**, **[FU-BANK-TOPICKEY-NORMALISE]**. **Do NOT attempt piecemeal** — the guard is what makes it stick.

### 🆕 NEW FOLLOW-UPS / GOTCHAS (logged from #360 rituals)
- **[FU-PREINSTALL-GUARD-SH]** — the root `preinstall` script shells out to `sh` (`rm -f package-lock.json yarn.lock; case "$npm_config_user_agent" …`), so it **fails on plain PowerShell** (`'sh' is not recognized`). Agents avoid it only because VS Code's terminal has Git's `sh` on PATH. **Fix:** replace with a ~10-line Node guard (`node scripts/guard-pnpm.mjs`) reading `process.env.npm_config_user_agent` and removing stray `package-lock.json` / `yarn.lock`. Portable everywhere Node runs — which is guaranteed, since pnpm needs Node. Own tiny chore PR.
- **GOTCHA (Windows rebase)** — an interrupted rebase can leave a **hollow `.git/rebase-merge`** that `git rebase --abort` cannot clear (`could not read '.git/rebase-merge/head-name'`). **Remove the directory manually**, and prefer `git pull --no-rebase --no-edit` where `node_modules` is present. (Observed: the shared checkout `C:\Projects\Lazytopper-Production` was mid-rebase at the start of #360 — worked around by doing ALL work in an isolated worktree, never touching the shared checkout.)
- **RULE (worktree hygiene) — verify, do not trust the report.** Four stale worktrees (`notes-docs289`, `notes-life-processes`, `notes-light-complete`, `pr-f-entity-render`) survived their PRs' rituals because the Windows lock defeated `git worktree remove` while agents reported "de-registered"; their `.git/worktrees/*` residue later broke unrelated git commands. Three stale REMOTE branches also survived; one (`feat/pr-f-note-entity-render`) still carried the deleted `WorksheetScorecard.tsx` and **would have reverted PR-2 if merged.** **New rule: after deleting a branch, verify `git worktree list` AND `git ls-remote` — do not trust the "success" report.**

### 🧭 PRODUCT PRINCIPLE (reaffirmed by #360)
- **A student's selection is intent. If we cannot honour it, we say so. We never silently do something smaller.** #360 closed the "Customise tick never derives scope" instance; the raw-slug zero-match instance is [FU-TOPICKEY-UNIVERSAL].

---

## 2026-07-10 — Notes v1.3: visible mindmap tree + full-screen note modal merged (#356, `629457e`)

### ✅ RESOLVED (closed by #356 — v1.3 refinements from the #345 live-review, NOT regressions)
- **Notes v1.3 mindmap default-visible → DONE.** The mindmap now reads as a TREE by default (per-branch `--mm-accent` rail + connector elbows + root › branch › leaf weight). ⚠️ The brief's premise ("branches render COLLAPSED / 5 flat closed rows") was **WRONG** — all three specs (life-processes/light/quadratic) are **depth-2** mindmaps already fully expanded at the existing `useState(depth <= 1)` (no branch ever rendered a closed caret). The real defect was **visual legibility**, so the open-state was PRESERVED and only the visuals changed. Kept the v1.2 ≤380px no-overlap responsive win (did not revert to the fixed d3 canvas).
- **Notes v1.3 full-screen note modal → DONE.** `NoteModal` opens a 92vw × 92vh sheet (capped 1280px for readable line length) on desktop, full-screen on mobile; `<Note>` internals + all close affordances (✕/Escape/dim-click), scroll-lock and focus-restore unchanged — sizing only.
- **[FU-MOBILE-VERIFY-GAP] → FIRST REAL PASS CLOSED.** This PR's static 360px layout audit was **confirmed by the owner on a real viewport** (mindmap: no horizontal scroll / no overlap; modal: full-screen with ✕ reachable). The DOCTRINE stands and is now mandatory: **every surface's live-verify includes a 360px check**, and every future mockup ships a mobile frame.

### 🆕 NEW FOLLOW-UP
- **[FU-PNPM-PACKAGEMANAGER-PIN] (supersedes gotcha D42)** — root `package.json` has **no `packageManager` field**, so Corepack falls back to whatever pnpm is on PATH in a fresh worktree (here 9.15.9). `pnpm-workspace.yaml:59` sets `autoInstallPeers: false` and the lockfile records the same, but a different pnpm resolves the settings differently → **`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on `--frozen-lockfile`**. **Fix:** add `"packageManager": "pnpm@10.32.1"` to root `package.json` — `quality-gate.yml:38` already names this as the follow-up and line 40 works around it with `corepack prepare`. **The current `--no-frozen-lockfile` + restore-lockfile workaround is risky:** if an agent forgets to restore, a lockfile written by the wrong pnpm enters the diff. **Own tiny chore PR** (owner-gated; not bundled into a feature PR). Supersedes D42.

---

## 2026-07-10 — Worksheet CONTEXT-AWARE ENTRY + multi-topic MI aggregate + preview/switch/360px merged (#357, `aa7e778`)

### ✅ RESOLVED (closed by #357)
- **[FU-WS-ENTRY-CONTEXT] → CLOSED.** The builder now reads `scope/subject/stream/topic/topics` from the URL (validated against `topics.ts`), seeds state from it, DELETES the `topics[0]` fallback, and redirects ONCE to `/practice-hub` when no valid topic is present. Recon finding: the desktop hub already emitted the params via `buildDesktopWorksheetPath` — the bug was the builder ignoring them, so App.tsx was never touched.
- **[FU-WS-MULTITOPIC-MI-AGGREGATE] → CLOSED.** New `rankedInScopeWeakTopics` + `allocateMiCounts`: proportional marks-lost split across ALL in-scope weak topics with a FLOOR (a chosen topic is never dropped), a CAP (≈50% at N≥3; N=2 keeps the owner-verified 60/40 from `MI_BOOST=1.5`), an AVAILABILITY gate, and per-topic level-2 section skew. `weakestTopic`/`allocateCounts`/`MI_BOOST` retained unchanged.
- **[FU-WS-PREVIEW-BUTTONS] → CLOSED.** Sticky bar + its CSS deleted; hero + drawer-foot Preview kept; the mobile `@media` that hid the hero button is gone so mobile keeps a Preview CTA.
- **[FU-WS-MI-SWITCH] → CLOSED.** Both `<input type="checkbox">` replaced by an accessible `role="switch"` button (aria-checked, keyboard-operable, visible focus ring).

### 🟡 STILL OPEN (only half landed)
- **[FU-WS-MI-COPY] — KEEP OPEN.** State 2a (single-topic weak-section toggle) was softened, but **state 2c still reads "Your weak area is X, not {topic}"** — the blunt out-of-scope wording. Finish in the follow-up PR alongside [FU-WS-SCOPE-DERIVE].

### 🆕 NEW FOLLOW-UPS (owner findings from #357 live-verify)
- **[FU-WS-SCOPE-DERIVE]** — ticking topics in Customise calls `setMultiTopics` but **never `setScope`**, so `scope` stays `"topic"`; the URL-sync then builds from `validMulti[0]` and silently DISCARDS the student's other ticked topics, and `enrichActive` (gated on `scope !== "topic"`) short-circuits so the correct multi-topic MI path is never reached. The URL entry path already promotes scope (`parseEntryContext` infers multi from >1 `topics`). Owner-confirmed: with the Scope control explicitly on multi-topic/full-subject, MI works and honestly names only topics that have mistake data. Fix in the follow-up PR (a tick ⇒ derive scope). A direct instance of the product principle below.
- **[FU-TOPICKEY-UNIVERSAL] (P0)** — surfaces match RAW topic slugs, so four Science chapters (`chemical-reactions-equations`, `acids-bases-salts`, `metals-non-metals`, `reproduction` ≈ **1,180 questions**) return ZERO. The bank stores **51 distinct `topicKey` for ~26 chapters** (25 Title-Case + 26 slug). Chapter Test and Full Mock carry the SAME defect, latent. Also `WorksheetGenerator.tsx` `q.topicKey === t.key` (enrichCount / drawnWeakTopics) is a raw compare that silently disables enrichment on Title-Case chapters. Owner-confirmed live on Chemical Reactions. **Cure (from a prior audit): Phase 1 = resolve-everywhere (read AND write) + CI guards; Phase 2 = data consolidation ([FU-BANK-TOPICKEY-NORMALISE], [FU-MI-TOPICKEY-BACKFILL]).** Prior piecemeal fixes FAILED because no guard existed → new variants reappeared. **Do NOT attempt this in a small PR** — it needs the resolve-everywhere + guard shape.

### 🧭 PRODUCT PRINCIPLE (logged from #357 — three instances found today)
- **A student's selection is intent. If we cannot honour it, we say so. We never silently do something smaller.** Instances found: the `topics[0]` guess (fixed by #357); the Customise tick that never derives scope ([FU-WS-SCOPE-DERIVE]); the raw-slug topic match returning zero for Title-Case chapters ([FU-TOPICKEY-UNIVERSAL]).

### ℹ️ NOTE — [FU-MOBILE-VERIFY-GAP]
- The worksheet builder now ships a **360px reflow** (#357 FIX-6), but the DOCTRINE stands: every future mockup ships a mobile frame + every live-verify includes a 360px check.

---

## 2026-07-09 — Worksheet scope-relative MI + section enrichment + Preview affordance merged (#353, `f8c1536`)

### ✅ RESOLVED (closed by #353 — NOT #349 regressions; refinements surfaced in #349 review)
- **[FU-MI-SCOPE-RELATIVE] → CLOSED.** MI is now computed WITHIN the chosen scope (new pure `worksheetMiSelector.ts`; `scopeHotspot` = weakest in-scope topic vs `globalHotspot`). The single locked box was SPLIT into its true causes — a student WITH MI data now sees the real weak topic NAMED + a one-tap remedy, never the false "grade a worksheet first".
- **[FU-MI-ENRICH-WITHIN-TOPIC] → CLOSED.** Single-topic worksheets now enrich by SECTION — derived from each mistake's `totalMarks` via the CBSE band proxy (honest-unknown for non-band values, never a fabricated section); additive `orderPoolBySectionBoost` in `worksheetModel.ts` reusing `allocateCounts`, capped at real per-section availability, gated on the drawable pool so the toggle is never a no-op. Cross-topic `MI_BOOST` byte-unchanged. No schema change / no new writes.
- **[FU-BUILDER-PREVIEW-AFFORDANCE] → CLOSED.** Desktop `position:sticky` Preview footer + a Preview at the foot of the Customise drawer.

### 🆕 NEW FOLLOW-UPS (owner findings surfaced in #353 live-verify — a dispatched-separately follow-up PR, NOT #353 regressions)
- **[FU-WS-ENTRY-CONTEXT]** — the builder ignores the topic the student ARRIVED with: `WorksheetGenerator()` takes NO props and defaults to `topics[0]`; both entry paths lose the origin context, and there is no topic control on the first (smart-default) screen. The builder should honour the entry topic and expose a topic control up front.
- **[FU-WS-MULTITOPIC-MI-AGGREGATE]** — `weakestTopic()` returns ONE topic, so multi-topic scope names/boosts only the single weakest in-scope topic. Multi-topic MI should aggregate/weight across ALL the selected weak topics, not just the weakest.
- **[FU-WS-PREVIEW-BUTTONS]** — three Preview affordances now render (hero + desktop sticky + drawer-foot). Keep the hero + drawer-foot; DROP the sticky bar (redundant on desktop).
- **[FU-WS-MI-SWITCH]** — the MI enrich control is a raw `<input type="checkbox">`; promote it to an accessible switch (role/aria + keyboard) matching the product's control grammar.
- **[FU-WS-MI-COPY]** — soften the out-of-scope wording in the split MI states (the "your weak area is X, not {scope}" copy reads slightly blunt).
- **[FU-MOBILE-VERIFY-GAP]** — the surfaces are built as ONE responsive component, but mobile (≤360px) has never been mockup-designed or live-verified. **DOCTRINE:** every future mockup ships a mobile frame, and every live-verify includes a 360px check.

### ℹ️ NOTE — carried
- **[FU-CI-SOLUTION-CACHE]** carried: giving C&I uploads a canonical `questionId` enables the exact `questionIds`→`canonicalQuestionBank` section join, superseding the `totalMarks` band proxy #353 uses for MI section derivation.

---

## 2026-07-09 — Objective ANSWER KEYS repaired merged (#352, `b9a7817`)

### ✅ RESOLVED
- **[FU-BANK-CORRUPT-KEYS] → CLOSED** (except the 13 queued rows below). 89 in-scope objective rows re-derived with an AST scanner using the grader's own `normaliseOption`/`resolveOptionIndex`/`isObjectiveType`; 76 fixed (61 corrupt MCQ keys set to the exact correct EXISTING option + 15 AR rows given the standard CBSE `options[]`), 13 honestly manifested. `correctOption` never introduced — the key stays `q.answer`. Grader byte-untouched.

### 🆕 NEW FOLLOW-UPS
- **[FU-BANK-KEY-REVIEW-QUEUE]** — the 13 objective rows that could not be resolved from the source (corrupted/duplicated options, figure-dependent) are listed in `docs/objective-answer-key-review-queue.md`; the grader defers to the model for them. Needs a real-paper lookup / teacher pass. Same class as [FU-MODEL-ANSWER-QUALITY] and [FU-Z3-TEACHER-VERIFY] — fold into the student-QC review pass.
- **[FU-SECTION-A-VSA-HALFMARK]** — the scanner found **99 written-answer rows (VSA/Short/Long/Case) classified objective only by `section === "A"`**. Cofounder check: all **1,950 Section-A rows carry `marks: 1`**, so #348's ≤1-mark rail means they can only ever be clamped to 0-or-1 — **no live correctness hole**. Residual: CBSE sometimes awards ½ on a 1-mark VSA; those rows now get 0 or 1. **Accepted simplification** — revisit only if half-marks matter or a multi-mark row ever lands in Section A.
- **[FU-BANK-GARBLED-DISPLAY-TEXT]** — the scanner's out-of-scope observations: on ~20 fixed rows the correct option's DISPLAY text is itself symbol-stripped (key resolves correctly, but the option renders garbled), and many rows still carry garbled `solutionSteps`/`finalAnswer`. Content-QC / symbol-integrity pass (like the PYQ symbol track); not a scoring defect.

---

## 2026-07-09 — Worksheet BUILDER redesign merged (#349, `b4f2162`)

### 🆕 NEW FOLLOW-UPS (all being fixed in the dispatched-separately follow-up PR)
- **[FU-MI-SCOPE-RELATIVE]** — MI enrichment currently compares one GLOBAL hotspot to the chosen scope (`canEnrich = hotspotInScope`, `WorksheetGenerator.tsx` ~L240), so a student WITH MI data sees a locked box, and the locked copy falsely says "Grade a worksheet or use Check & Improve first". MI must be computed WITHIN the selected scope. Fixed in the follow-up PR.
- **[FU-MI-ENRICH-WITHIN-TOPIC]** — `worksheetModel.ts` (~L232/L245) defines MI re-weight as a boost to the weak TOPIC, i.e. cross-topic only. Single-topic worksheets therefore can't enrich today. Within-topic enrichment (weight toward the sections / question-types / mark-bands where the student loses marks) is the real unlock — conditional on MI storing sub-topic granularity; the follow-up PR investigates and either builds or flags it.
- **[FU-BUILDER-PREVIEW-AFFORDANCE]** — the action bar (`.lt-ws__sticky`, ~L730) is mobile-only, so DESKTOP users must scroll back to the hero to preview after customising. Fixed in the follow-up PR.

### ℹ️ NOTE — closes 2 of the 3 owner-found worksheet bugs from #344
- The 3 owner-found worksheet bugs logged post-#344 are now resolved across two PRs: **#349 fixes PDF filename (FIX D) + history placement (FIX B)**; **#348 fixed grader MCQ all-or-nothing**. The [FU-MI-*] items above are NEW, surfaced during #349 review — refinements to the shipped redesign, not #349 regressions.

---

## 2026-07-09 — Uniform OBJECTIVE (MCQ/AR) scoring merged (#348, `27eaa8f`)

### 🆕 NEW FOLLOW-UPS
- **[FU-OBJECTIVE-COST-SKIP]** — model-skip cost saving DEFERRED. On the PDF/photo upload paths (Worksheet, Check & Improve) the student's MCQ pick is only knowable AFTER the model reads the handwriting, so an objective question CANNOT be excluded from the model batch without losing correctness (the deterministic clamp still discards the model's marks, so the invariant holds regardless). True model-skip pays off only on future CLICK-BASED surfaces where the pick is captured digitally (Chapter Test / Full Mock on-screen MCQs); Quick Practice already grades MCQs client-side (zero API). Wire the skip when those surfaces move server-side. Correctness first, per the task's own escape hatch.
- **[FU-BANK-CORRUPT-KEYS]** — data-quality task for the Fable bank lane. The STEP-0 census found **~86 objective questions (concentrated in `.pyq*` extraction files) whose `answer` is CORRUPT** (mark-scheme fragments like "a) 1 1", "30 1", "96° 1" — matches NO option even after normalisation), plus **~15 maths Assertion-Reason `.pyq` rows with NO `options[]`** (the four choices are in prose; `answer` holds the full AR statement). These currently DEFER to the model (never a false 0), but can never be scored DETERMINISTICALLY until the keys are cleaned / options backfilled. Exact affected files + counts are in the report (`report-objective-scoring-uniform-2026-07-09.md`) + the STEP-0 bank census. Not a regression — pre-existing extraction debt surfaced by this PR.
- **[FU-CI-SCORECARD-VARIANT]** — Check & Improve has **no `<ResultsScorecard>` variant** and is not in `SessionSurface` (`"worksheet" | "chapter-test" | "full-mock"`), so it shows a bespoke graded-paper view (`CheckImproveGradedPrintDoc`, #333) and **writes no session record** — its results don't feed the per-surface histories / progress arc. Not a regression — a GAP. Design pass pending (decide whether C&I becomes a 4th `SessionSurface` with its own scorecard variant + record, or stays intentionally ephemeral). Surfaced while wiring the C&I objective plumbing.
- **[FU-CI-SOLUTION-CACHE]** — carried from `SURFACE_TRACKER.md`: a two-tier solution cache is the STRUCTURAL fix for **[FU-MODEL-ANSWER-QUALITY]** (garbled model answers). Logged here for the follow-up queue.

---

## 2026-07-08 — Notes v1.2 template merged (#345, `17fea57`)

### 🆕 NEW FOLLOW-UPS
- **[FU-NOTES-NCERT-PDF-HOSTING]** — C4's clickable NCERT page refs build a Firebase Storage URL (`ncert/{subject}/ch{N}.pdf#page=N`) and show an HONEST "coming soon" fallback because nothing is hosted yet. The separate infra PR uploads the ~26 Class-10 NCERT chapter PDFs to Storage, **PAGE-ALIGNED** (textbook page == PDF page), **public-read + CORS** (so the fetch-HEAD probe resolves), at `ncert/{subject}/ch{N}.pdf`; then C4 auto-activates with ZERO deploy. **⚠ COPYRIGHT — owner sign-off REQUIRED before hosting:** serving NCERT page images/PDFs commercially is a step beyond citing page numbers. No PDFs are committed to the repo (repo-bloat forbidden).
- **[FU-NOTE-MODAL-FOCUS-TRAP]** — NoteModal + NcertPageModal do focus-in-on-open + restore-on-close but no full Tab focus-trap (matches the existing ConceptTeachDrawer/ResultsScorecard norm). Add a proper Tab-trap to the note modals (and optionally the existing drawers) for complete dialog a11y. Non-blocking.
- **[FU-DROP-D3-HIERARCHY]** — the C1 mindmap rewrite no longer imports `d3-hierarchy`; the dep is still in `lazytopper/package.json`. Prune it (+ lockfile) in a hygiene PR — needs a linux/Codespaces install to regen the frozen lockfile.

### ℹ️ NOTE — notes v1.3 follow-up (owner-found REFINEMENTS, not v1.2 regressions)
- During #345 review the owner surfaced 2 items being addressed in a **separate v1.3 follow-up PR** (dispatched separately), NOT v1.2 regressions: (1) the **mindmap tree should be VISIBLE by default** (surfaced rather than behind the collapsed/tab state); (2) the **note modal should be FULL-SCREEN** for diagram-heavy notes (the current large-centered/desktop-sheet is cramped for figure-dense chapters like Life Processes). Refinements to the shipped v1.2 template — logged so the v1.3 PR isn't mistaken for a v1.2 regression.

---

## 2026-07-08 — Progress-Journey ARC · PR-3 per-surface Worksheet history merged (#344, `a4c3eec`)

### 🆕 NEW FOLLOW-UP
- **[FU-HISTORY-C2-PER-WORKSHEET-DELTA]** — the PR-3 "vs last time" chip uses `getSubjectProgress` (the designated source), which is a **subject-level MONTH trend** (marks% before→now over the window, from the attempts stream) attached to the newest row of each subject and labelled "this month" — NOT a literal per-worksheet session-to-session delta (this worksheet's marks% vs the previous same-topic worksheet's). It is honest-or-silent (absent when thin; never a fake 0). If the owner prefers a literal per-session delta on every row, that is a small fast-follow computable from the stored records themselves (no store change). Non-blocking; owner decides at/after C2 live-verify.

### ℹ️ NOTE — 3 owner-found worksheet bugs are a SEPARATE follow-up PR (not PR-3 regressions)
- During #344 QA the owner surfaced 3 worksheet issues being fixed in their **own follow-up PR** (dispatched separately), NOT caused by PR-3: (1) **grader MCQ all-or-nothing** scoring; (2) **PDF filename**; (3) **history placement**. PR-3 is the read-layer that renders records; these are grader/export/placement concerns on adjacent surfaces. Logged here so the follow-up PR isn't mistaken for a PR-3 regression.

---

## 2026-07-07 — Progress-Journey ARC · PR-2 Universal `<ResultsScorecard>` merged (#341, `8c4c159`)

### 🆕 NEW FOLLOW-UPS
- **[FU-MODEL-ANSWER-QUALITY]** — surfaced during the #341 owner live-verify (NOT a PR-2 bug): the **worksheet grader's generated MODEL ANSWERS can be garbled/incoherent even when the final value is right**. Instance: Real Numbers `WS-M-MIX-22` Q2 (HCF working) — the model-answer prose was incoherent though the final answer/mark was correct. This is a **model-answer GENERATION quality** problem, distinct from the mark grading (which was correct here). Related to **[FU-Z3-TEACHER-VERIFY]** + **[FU-LIGHT-REVIEW-QUEUE]**. Action: sample generated model answers during content QC (spot-check coherence, not just the final value). Non-blocking; content/AI-quality track, not a scorecard defect.

### ℹ️ NOTE — deferred scorecard variants
- **Chapter Test + Full Mock `<ResultsScorecard>` variants remain `deferred:true` config seams** (`scorecardVariants.ts`), by design (#341): their surfaces are still being rebuilt and their board-readiness (CT) / section-breakdown + E2b-upload (FM) dependencies don't exist yet. When those surfaces are rebuilt (arc PRs / their own redesigns), the rebuild FILLS the deferred config (score model / framing / actions), not re-architects — the shell + interface already accommodate them. The shell no-ops a deferred variant (returns null) as a guard, so a premature wiring can't render a half-built card.

---

## 2026-07-06 — Progress-Journey ARC · PR-1 session-record data layer merged (#338, `d704b1c`)

### ✅ CLOSED
- **[FU-SESSIONRECORDS-RULES]** — the new `sessionRecords/{uid}` Firestore collection needed a rules block or its cloud write/read is denied by the catch-all deny. **CLOSED:** owner added + deployed the block via Console and committed it to trunk (**`dc73360`**). (Lesson for future new-collection work: `sessionRecords` is the FIRST genuinely-new top-level collection in the arc — every prior persistence feature reused an existing collection precisely to avoid a `firestore.rules` edit. A new top-level collection ALWAYS needs a companion rules block deployed before its cloud half works.)

### 🆕 NEW FOLLOW-UPS
- **[FU-SESSIONRECORDS-REGRADE-JSDOM-TEST]** — add a jsdom/browser-env test that persists a worksheet via `saveWorksheetSession`, grades it, then re-grades and asserts a SINGLE `sessionRecords` doc under the same id. The current node-env `sessionRecords.test.ts` can't exercise the `getWorksheetSession` freeze-recovery short-circuit (no `window`), so the idempotent-re-grade path is proven by reasoning + the review, not by an executed test. Non-blocking.
- **[FU-SESSIONRECORDS-SEEN-SET]** — the uniqueness seen-set (union of `questionIds` across a student's records for (subject, topic) → the worksheet generator EXCLUDES it, with HONEST EXHAUSTION when the pool depletes) is the deliberate FOLLOW-ON on this same store. The `questionIds` field is LOCKED into the §1 contract now, so no migration is needed later. (§1c.)

### ℹ️ NOTE
- **#180** (`docs/backlog-stale-branch-review`, a month-stale June-2 "triage branches later" docs PR) also edits `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md`. It does NOT touch SESSION_LOG. This #338 handoff merged first (active work), so #180 will need a rebase or a close — flagged to the owner.

---

## 2026-07-06 — Topic Hub boardEssentials seeding merged (#337, `1caa25d`)

### 🆕 NEW FOLLOW-UPS
- **[FU-TOPICHUB-PEDAGOGY-REVIEW]** — the owner's ONE holistic pedagogy review of the 12 seeded topics' **concept selection + mark bands** is **DEFERRED to the student-QC stage**. The concepts shipped **fact-checked** (authored + an adversarial syllabus/accuracy pass, 6 clean / 6 corrected), so this is a final teacher/examiner sign-off, not a correctness blocker — **surface it during QC**. The per-topic table (concept · one-line-use · marks · NCERT source) + the skeptic-pass issue log is in `Desktop/diff/report-topichub-boardessentials-seed-2026-07-06.md`.
- **[FU-TOPICHUB-PREVIEW-LABEL]** — the `isSamplePreview` "Sample preview" label mechanism renders correctly (`ConceptSpine.tsx:462`; asserted by `ConceptSpine.test.tsx` via the synthetic `__sample-preview-fixture__`). **Now moot for live topics** — with 26/26 `topics.ts` topics seeded, no live topic is a preview, so the label is dormant (mechanism still correct + under test for any future/edge topic outside `topics.ts`). No action; logged for completeness.

### ℹ️ NOTE (pre-existing, untouched)
- **`surface-areas-and-volumes` has only 2 `boardEssentials`** — one of the *original 14* seeds, authored that way (2 concepts). NOT touched by #337 (out of scope); flagged for awareness during the pedagogy review in case a 3rd concept is wanted.

### ⚠️ COORDINATION
- **#180 (`docs/backlog-stale-branch-review`)** also edits this file but is **stale** (last updated 2026-06-02, ~100 commits behind trunk) and will need a rebase/reconcile if ever revived. #337's docs handoff was written against current trunk `1caa25d`.

---

## 2026-07-06 — C&I holistic scorecard merged (#333, `c3f6084`)

### 🆕 NEW FOLLOW-UPS
- **[FU-CI-EXPAND-DISCOVERABILITY]** — the multi-Q per-question steps are collapsed by default behind a "Show step-by-step working ▸" affordance (also: tap the question / Enter-Space). Confirm this is discoverable enough for students — **owner to eyeball in QC**. If under-discovered, options: default-expand the first question, or add a persistent "expand all" control.
- **[FU-UNIVERSAL-SCORECARD]** — the three grade renderers (Check & Improve single-Q, Check & Improve multi-Q, and the Worksheet) still each render results their own way. #333 is the **bridge** (a shared `CheckImproveGradedPrintDoc` + the shared `worksheetPdfExport` core); the arc's **2nd PR** unifies them into the Universal `<ResultsScorecard>` (spec `LazyTopper_Universal_Scorecard_Spec_2026-06-25.md`).

---

## 2026-07-06 — Light extraction PILOT merged (#330, `83b1268`)

### 🆕 NEW FOLLOW-UPS
- **[FU-LIGHT-REVIEW-QUEUE]** — ship-tracked owner decision: the **230 AI-authored solutions** (`AI_GENERATED_SOLUTION_IDS`) and **52 authored-SVG-later diagram flags** went live for trusted-student QC. The committed manifest `docs/light-extraction-review-queue.md` is the authoritative verification list (incl. the priority-eyeball sublist: 9 wrong source keys overridden, `CFPQ-S-LGHT-013` official-rubric error 18.6→15.7 mm, 5 handwritten-notebook discrepancies). The post-launch correction pass works this queue; solved items get removed from the manifest + the id-sets.
- **[FU-LIGHT-4MK-CASE-GAP]** — the 4-mark case-based band is the one thin band after the pilot (16 total): case-based material is scarce in every source swept so far. Candidate: a dedicated case-based authoring/extraction pass.
- **[FU-GDRIVE-LIGHT-1MK-PASS]** — deferred gdrive leftovers for Light: `757_A-R...25Q.docx` (25 AR — a format gap), `821_REFLECTION AND REFRACTION.docx` (51 objective), the 2022-23 PYQ residual sets (+official MS), `CBSE Practise Papers\Science.pdf` (unsized). Same pipeline, low priority.
- **[FU-BEYOND-BOARD-BADGE]** — `LGHT_FND_BEYOND_BOARD` + `LGHT_GDR_BEYOND_BOARD` (52 rows) ship unmarked in the pool; a later UI pass can badge/filter them (the arrays keep them addressable).
- **[FU-AI-RETIRE-LIGHT]** — with authentic supply at 664 non-AI rows, the 103 AI Light questions (`light.pack1/2`) are retirement candidates once QC proves the authentic tier — per doctrine, NOT done in the extraction PR.

## 2026-07-05 — Grading-path bugs MERGED (#331, `2484cff`)

### ✅ CLOSED
- **[FU-MULTIQ-CI-GRADE-THROW]** — Bug 2. C&I recording (`recordMistake`/`recordAttempt`, incl. `multiQuestionToCsr`) decoupled into its own inner try/catch → a client-side throw during recording no longer reaches the grade-display error path, so the multi-question grade persists on screen (honest "pending" on unreadable pages). Owner live-verified.
- **[FU-GRADING-RELIABILITY] (partial-credit variance)** — Bug 3. Owner-approved ERROR-CARRIED-FORWARD MARKING clause added to Rule 4 in BOTH grader functions → a step that correctly applied the right method to a carried-forward wrong value earns its method marks; only the final-answer mark is withheld. Owner live-verified: cascading quadratic → **2/3** with a proper "Error Carried Forward" step + ½-mark deduction (previously 0.5 vs 1.5).

### 🔄 SUPERSEDED
- **[FU-XUSERID-PROXY-STRIP] → done at the auth layer.** The Bearer-token auth fix (Bug 1) merged in #331 and is correct: the deployed `artifacts/api-server` strips `x-user-id` but forwards `Authorization`, and `userProgress.cjs` now resolves the uid from the verified Firebase Bearer token. The proxy-strip is no longer the blocker. (`questionReport.cjs` was left byte-identical — report auth is already handled at the api-server gateway.)

### 🆕 NEW FOLLOW-UP
- **[FU-BACKEND-DATABASE-URL-UNSET]** — with auth fixed, progress sync now returns **503 "Database unavailable"**: `DATABASE_URL` is unset on the backend. This is a **legacy backend-Postgres path that the Progress-Journey arc supersedes → do NOT provision a DB for it.** Bug 1's feature is therefore DEFERRED (auth merged, correct, not a regression). Firestore-based persistence (PR-B, live since #322) is the live progress store.

---

## 2026-07-03 — Firestore undefined-field persistence fix MERGED (#322, `706cc12`) — PR-B (#321) now genuinely LIVE end-to-end

### ✅ RESOLVED / DELIVERED
- **Silent Firestore persistence failure ROOT-CAUSED + FIXED (#322 `706cc12`)** — `firebaseClient.ts` initialised Firestore with `getFirestore(app)` (no `ignoreUndefinedProperties`), so the SDK **threw** `"Unsupported field value: undefined"` on any doc with an `undefined` field. Every attempt doc carries `undefined` (`bloomSkill` on the C&I/MCQ paths, `topicName` when absent), so ALL attempt writes threw and were silently swallowed by fire-and-forget `.catch(() => {})`. Fix: `initializeFirestore(app, { ignoreUndefinedProperties: true })` (sole init — verified) + un-muted the two write catches to `console.warn`. 2 files; gates GREEN; CI GREEN (linux build); Codespace vitest 190 pass / 3 pre-existing-unrelated (`worksheetPdfExport.test.ts`, proven on base `c5b4de6`); cofounder byte-reviewed.
- **[FU-PROGRESS-PERSISTENCE] / PR-B (#321) now LIVE-VERIFIED end-to-end** — PR-B was merged but **non-functional** (the blob write never worked; PR-B inherited the same undefined-rejection). **Owner live-verified on production after #322:** a fresh graded attempt now writes `practiceInsights/{uid}/attempts` and it appears in the console; the durable record carries all fields (subject, topicKey, marksScored/Available, `mode:"graded"`, correct, difficulty, questionId, timestamp); a repeat grade shows NO duplicate (PR-B idempotency, now actually exercised); `learnerProfiles/{uid}/mistakeLogs` still writes (regression clean). PR-B is now genuinely live.

### 🆕 NEW FOLLOW-UP
- **[FU-PROGRESS-SURFACE-BREAKDOWN]** — an attempt does not record WHICH surface it came from (Quick Practice vs Worksheet vs Check & Improve vs Chapter Test). Surface is a **different axis** from `AttemptMode` (`graded`/`mcq`/`self-assess`). **DEFER** surface tagging until step 3/4 (the Universal Scorecard / Progress work) proves it actually needs which-surface an attempt originated from — owner ruling required before adding a field to the attempt shape.

### 🔁 STILL OPEN (separate, logged — not addressed by #322)
- **[FU-XUSERID-PROXY-STRIP]** — ~~the Vercel→Railway proxy drops the `X-User-ID` header~~ **SUPERSEDED by #331** (auth fixed via Bearer token) → the live blocker is now **[FU-BACKEND-DATABASE-URL-UNSET]** (503, `DATABASE_URL` unset; Progress-Journey arc supersedes). See the 2026-07-05 section above.
- **[FU-MULTIQ-CI-GRADE-THROW]** — **CLOSED by #331 (Bug 2).** `multiQuestionToCsr` throwing client-side no longer wipes the grade (recording decoupled into its own try/catch). See 2026-07-05 above.
- **[FU-MCQ-ATTEMPTS-NOT-RECORDED]** — un-annotated MCQs have `correctIdx < 0`, so the click never reaches `recordAttempt` → no score recorded. Needs `correctOption` bank annotation (ties to [FU-MCQ-CORRECTOPTION-VERIFY] / [FU-MCQ-ANSWER-OPTION-FIELD]).
- **[FU-GRADING-RELIABILITY]** — **CLOSED by #331 (Bug 3).** The cross-run partial-credit variance (same solution 0.5 vs 1.5) is fixed by the owner-approved ERROR-CARRIED-FORWARD MARKING clause on Rule 4 in both grader functions; owner live-verified (cascading quadratic → consistent 2/3). See 2026-07-05 above.

---

## 2026-06-30 — MCQ `correctOption` — deterministic worksheet MCQ scoring (code side) MERGED (#319, `a71c81e`)

### ✅ RESOLVED / DELIVERED
- **[FU-MCQ-ANSWER-OPTION-FIELD] code side DONE** — the additive pipeline that lets the worksheet grader do a DETERMINISTIC normalised string compare of the student's picked MCQ option against a bank-supplied correct option. 3 product files + 1 test: `aiClient.ts` (`correctOption?: string` on `WorksheetGradeQuestionInput`), `worksheetGradeService.ts` (carry it client→server), `checkSolution.cjs` (server mapper + the deterministic compare in `normaliseStructuredResult`, gated on `isObjectiveType` AND `correctOption` present; full marks on hit, 0 + full deduction on miss; `couldNotRead`/empty-`studentWork` untouched; existing honesty reconcile unchanged after). **Ships LATENT** — no bank entries carry `correctOption` yet, so the absent-field path is byte-unchanged. Test now 13 (h/i/j added). Gates GREEN; CI GREEN; Codespace vitest 13/13; cofounder byte-reviewed; owner-instructed squash-merge.

### 🆕 NEW FOLLOW-UP
- **[FU-MCQ-CORRECTOPTION-VERIFY]** — the DEFERRED live-verify for #319 (no quick live test exists today because the code ships latent — no bank entries carry `correctOption` yet). **GATE:** when the first batch of MCQ bank entries is annotated with `correctOption`, run a worksheet containing those MCQs **3 times** and confirm the score is **IDENTICAL across all three runs** AND that **a correct pick actually scores correct** (full marks) and a wrong pick scores 0 — determinism alone is not enough; the deterministic compare must also be RIGHT. This gates the content-annotation task (annotating MCQ bank entries with their canonical option letter) — do NOT treat the annotation work as "done" until BOTH the 3×-identical check and the correct-pick-scores-correct check pass on real annotated MCQs.

---

## 2026-06-30 — Multi-question Check & Improve detect COMPLETE (#315 `91b5f83` + #316 `fdadd41` + #317 `cd5c8ca`) MERGED & LIVE-VERIFIED

### ✅ RESOLVED / DELIVERED
- **[FU-MULTI-QUESTION-DETECT] CLOSED** — multi-question Check & Improve detect is complete end-to-end across three PRs: **#315** (detect ALL questions via additive `questions[]` from `handleDetectQuestion`; whole-paper grade through the existing `/grade-worksheet`; CI nomenclature `CI-{S}-{TOPIC}-{NN}`; MI parity via `recordMistake`+`recordAttempt`; single-question path byte-identical), **#316** (prompt fix so detect returns ALL questions, not just Q1 — multi-item ellipsis schema + recency + `maxOutputTokens` 4096), **#317** (per-question marks chip). **Owner live-verified on Vercel + mobile** with the Light-Reflection-Refraction PDF ("5 questions detected · Science · Light - Reflection & Refraction" → "Q1 · 1 mark  Q2 · 2 marks  Q3 · 3 marks  Q4 · 5 marks  Q5 · 5 marks" → "Upload your answer sheet below to grade all 5"). NOTE: the original ask named a "frontend selection UI (pick which detected question to grade)" — shipped instead as **grade-the-whole-paper** (one upload grades all detected questions), which proved the better UX.

### 🔁 STILL OPEN
- **[FU-GRADE-ANY-WORKSHEET]** — REMAINS OPEN. Grading **non-system-generated** papers (a student's own / school worksheets) is now UNBLOCKED by the multi-question work (the whole-paper grader already accepts an arbitrary DETECTED question set — no pre-known scheme required), but a dedicated "grade any worksheet" surface/flow is still a future feature, not yet built.

---

## 2026-06-29 — thinkingBudget detect fix (#310 `7276d31`) + grader eval harness (#311 `2bc545c`) MERGED & LIVE-VERIFIED

### ✅ RESOLVED / DELIVERED
- **thinkingBudget detect fix (#310 `7276d31`)** — `geminiClient.cjs` forwards an optional `thinkingConfig` into `generationConfig` in BOTH `callGemini` and `callGeminiStream` (byte-identical body when absent), and `handleDetectQuestion` sets `thinkingConfig: { thinkingBudget: 0 }` (gemini-2.5-flash thinking tokens were eating the 400-token detect cap → truncated JSON → "couldn't read the question"). 3 files; Codespace vitest 5/5; cofounder byte-reviewed; **owner dual live-verified** (Q1.png reads; worksheet grading + tutor regression clean).
- **[FU-GRADE-EVAL-SCRIPT] DELIVERED** — #311 (cofounder PR `2bc545c`) landed a standalone worksheet-grader eval harness (PR-A) so future prompt-only grader PRs verify against FIXED synthetic inputs without the owner generating new worksheets.

### 🆕 NEW FOLLOW-UPS
- **[FU-MISCOPY-CLASSIFICATION]** — the grader misclassifies a **miscopied question** (student copies the question wrong, then solves their wrong version) as a **concept gap**. It should be scored **0 marks + `silly`** (a careless transcription slip), NOT conceptual (no knowledge gap is implied). Fix direction: prompt-only, BOTH grading functions, added as `handleCheckSolution` **rule 15** / `gradeStructuredSet` **rule 9** (keep the two prompts in sync). **This is the immediate-next prompt-only PR** (branch fresh off `2bc545c`), ahead of the MCQ `correctOption` code side and PR-B.
- **[FU-GRADE-ANY-WORKSHEET]** — students need to grade **non-system-generated** papers (their own / school worksheets), not just LazyTopper-generated worksheets with a known scheme. Depends on [FU-MULTI-QUESTION-DETECT] (the grader currently keys off the KNOWN question set; an arbitrary paper has none). Larger effort — backend + UX; sequenced after the multi-question detect work.

---

## 2026-06-29 — Grading-reliability prompt+config hardening MERGED & LIVE-VERIFIED (#307 `195ecf7` + #308 `54c959e`)

### ✅ RESOLVED / DELIVERED
- **Grading-reliability hardening (#307 `195ecf7` + #308 `54c959e` → trunk `54c959e`)** — two additive PROMPT-ONLY PRs to the shared grader `lazytopper/server/routes/checkSolution.cjs`, applied to BOTH grading paths (`handleCheckSolution` + `gradeStructuredSet`), no logic change. #307: temperature 0.15→0.05 on both grading calls; legible-non-attempt exception ("Don't know"/"DK" → incorrect/full-deduction/`mistakeType null`, never `couldNotRead`; verbatim on `gradeStructuredSet` rule 6, adapted note on `handleCheckSolution` rule 6 which has no `couldNotRead` field); word-problem closure rule (≤½ mark if root-in-context omitted). #308: crossed-out = NO-ATTEMPT (`gradeStructuredSet` rule 6 only); PARTIAL-CREDIT-by-step-weight (both prompts). Tests in `checkSolutionGradingReliability.test.ts` (a–i; Codespace vitest 28/28 with existing guards, no regression). Cofounder byte-reviewed; **owner live-verified — "Don't know" → 0 every run (never couldNotRead), crossed-out handled, scores stable** (runs 2&3 identical; run 1 ±0.5 on a genuine borderline partial-credit case).
- **[FU-GRADING-RELIABILITY] CLOSED** — temperature OCR-cascade variance fixed (0.05) and the inconsistent `couldNotRead` on legible "Don't know" responses fixed (the non-attempt exception). Done by #307.
- **[FU-WORKSHEET-NONATTEMPT-TEXT] CLOSED** — a legible non-attempt phrase ("Don't know") and a clearly crossed-out answer are now graded as explicit non-attempts (incorrect / full marks deducted / `mistakeType null`), never silently mis-typed or flagged unreadable. Done by #307 (Don't-know) + #308 (crossed-out).

### 🆕 NEW FOLLOW-UP
- **[FU-GRADE-EVAL-SCRIPT]** — build a Codespace-runnable Node eval script that calls the LIVE grader (`/api/check-solution` and/or `/api/grade-worksheet`) with a FIXED set of synthetic inputs (known answers + expected score bands, incl. the "Don't know" / crossed-out / partial-credit cases) and asserts the outputs, so future prompt-only grader PRs can be **agent-verified without the owner having to generate and hand-grade new worksheets each time**. Motivation: #307/#308 each needed an owner 3-run live-verify; a deterministic eval harness would let the agent self-verify prompt changes pre-merge (the static gates can't exercise the live model). Likely lives under `lazytopper/scripts/ops/` or a `notes/`-style eval dir; reads a key from the Codespace env; NOT wired into CI (it makes live model calls).

---

## 2026-06-29 — Worksheet MCQ DETERMINISTIC honesty MERGED (#305, `93f1594`) — owner live-verified

### ✅ RESOLVED / DELIVERED
- **Worksheet MCQ deterministic honesty (#305, `93f1594`)** — closed the MCQ residual #302 documented. Carried `section` client→server (`worksheetGradeService.ts` mapper + additive `section?` on `WorksheetGradeQuestionInput` in `ai/aiClient.ts`; server `handleGradeWorksheet` keeps `section`/`format`/`qType`) and extended `normaliseStructuredResult`'s no-working pass: an `incorrect` step on an OBJECTIVE question (`isObjectiveType(qType||format, section)` — REUSED from `serverUtils.cjs` via a direct acyclic require, NOT forked) is nulled REGARDLESS of `studentWork` and tallied into `noWorkingNulled` (so `rawAdjusted` zeroes leaked MCQ buckets). Marks/status/totals/attempt untouched; `handleCheckSolution` byte-identical. 4 files +112/−10; Codespace vitest 10/10; **owner live-verified — all-zero mistake buckets EVERY run (the ~40% intermittency is gone)**. **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED.**

### 🆕 NEW FOLLOW-UPS (from live testing; NOT blockers — do NOT gate PR-B)
- **[FU-MCQ-ANSWER-OPTION-FIELD]** — MCQ **scoring** (correct/incorrect) is still non-deterministic because the bank's `finalAnswer` stores the answer **text**, not the option **letter**, so the grader cannot do a deterministic string comparison of the student's picked option against the key. #305 fixed the **honesty** path (a wrong MCQ never fabricates a mistake type); it does NOT make the **score** deterministic. Fix direction: give MCQ questions a canonical option-letter answer field (or derive the letter from `options` + `finalAnswer`) so the grader can compare the picked letter exactly. Touches the bank/data shape → its own scoped PR (likely a `src/data` lane — gated).
- **[FU-GRADING-RELIABILITY]** — grader temperature `0.15` causes OCR-cascade variance on borderline partial-credit answers, and `couldNotRead` fires inconsistently on legible "Don't know" / explicit non-attempt responses (related to [FU-WORKSHEET-NONATTEMPT-TEXT]). Fix direction: lower/zero the temperature for grading, harden the detect/`couldNotRead` path, and consider a `thinkingBudget` so borderline reads are stable run-to-run. **This is the immediate next product PR (the grading-reliability PR), ahead of the detect/thinkingBudget fix and PR-B.**

---

## 2026-06-28 — Worksheet no-working honesty ported → D-PROG-2 / step 1 CLOSED MERGED (#302, `c5e148d`) — owner dual live-verified

### ✅ RESOLVED / DELIVERED
- **Worksheet no-working honesty (#302, `c5e148d`)** — ported #301's fix from `handleCheckSolution` into the SEPARATE worksheet grader `gradeStructuredSet` → `normaliseStructuredResult` (worksheet prompt rule 5 + `noWorkingNulled` guard + `rawAdjusted` reconcile; `handleCheckSolution` byte-identical). Deterministic empty/whitespace/absent no-working → null + 0 buckets + marks preserved; rawSummary leak → 0; worked-wrong keeps type+marks. Codespace vitest 7/7; owner dual live-verified (Maths Mixed Worksheet 16). **Closes step 1 for its designed (subjective no-working) scope.**

### 🔭 NEW FOLLOW-UPS (tracked; none are regressions)
- **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] — the one tracked deterministic gap; MUST land before PR-B.** A wrong MCQ's `studentWork` is the bare option letter "(d)" (NON-EMPTY), so the empty-working guard can't fire; MCQ honesty rides on prompt rule 5 and is **non-deterministic live (~40%: 5 runs = 2 null / 3 conceptual)**. STEP-0 ground truth: the clean objective signal (`section`/`options`, "empty/undefined for subjective") exists on `PredictedQuestion`/`PersistedWorksheetQuestion` but is dropped before the grader — client `worksheetGradeService.ts:90-98` forwards only 7 fields, server `checkSolution.cjs:826-836` keeps only `marks`; `marks===1` correlates (blueprint A=1mk MCQ/AR) but is a fragile heuristic, NOT used. **Fix (decided, option 1):** forward `section`/`format` client→server (frontend + server) then apply the existing `isObjectiveType(qType, section)` helper in `serverUtils.cjs` (no forked classifier) in `normaliseStructuredResult` — "incorrect objective step → mistakeType null, regardless of studentWork." Cofounder-gated; own PR off `c5e148d` with its own STEP 0.
- **[FU-WORKSHEET-NONATTEMPT-TEXT]** — explicit "don't know" / non-attempt prose is non-empty, so the deterministic guard doesn't fire, and the model tags it "Concept gap" though it's semantically identical to no-working (undiagnosable). Separate small fix; scope TBD (detect explicit non-attempt phrases → treat as undiagnosable).
- **[FU-WORKSHEET-BANK-ANSWER-POLLUTION]** — ~26 files / ~54 strings of marking-scheme junk in model answers may skew grading. Separate content lane.

---

## 2026-06-25 — Z3 figure-binding golden slice MERGED (#297, `449d686`) — owner live-verified

### ✅ RESOLVED / DELIVERED
- **Z3 figure-binding (#297, `449d686`)** — bound every Z3 source figure (113 rasters → 93 Qs) to its question and render it in the question body as `<img>`, plus the step-mark pill fix. **[FU-Z3-FIGURE-BIND] CLOSED.** Built the contained raster `<img>` path the brief wrongly assumed already existed (`VisualExplainer` is HTML-only; `public/visuals` had zero rasters): `visualConceptRegistry.ts` (+`questionId`/`MATHS_FIGURE_VISUALS`/`getFiguresForQuestion`, exact id-keyed, kept out of the heuristic pool), `QuestionVisualAid.tsx` (+`questionId` → `<img>`, priority over synthetic SVG), `PracticeQuestionCard.tsx` (passes `questionId` + `parseLeadingMarkTag` step-mark fix), `competency.z3.ts` (93 rows +`visualExplainerId`+`requiresDiagram`; still 102 rows / 6,643 served, no drift), 113 `public/visuals/maths/**` assets. `predictionTypes.ts`/`canonicalQuestionBank` untouched. All 113 eye-confirmed (no mismatches). Gates GREEN + CI quality-gate GREEN (incl. vitest floor test); cofounder byte-level clean; owner live-verified + merged; no self-merge.

### 🆕 NEW FOLLOW-UPS
- **[FU-Z3-EMF-SVG]** — 8 Z3 Real-Numbers questions (`Z3-RN-001/002/005/006/007/008/009/010`) had EMF-only source figures (vector equation objects, unrasterizable) → no WebP to bind; `requiresDiagram` left honest (false). Candidates for AUTHORED SVGs later (never fabricate/substitute a lookalike). The figure-binding pattern + EMF limitation are documented in `handoff/PATTERN_extraction_figure_binding.md`.

### 🔭 NEXT
- Figure binding now scales to the worksheet-folder extractions via the documented pattern. A few bound figures are weak/generic scene-setters (esp. `Z3-PLE-002` "Production Planning" banner, `Z3-PR-003` generic interior) — bound per the owner's "every source figure" policy; worth a glance but not errors.

---

## 2026-06-24 — Worksheet PR-A: grade-results redesign (presentation only) MERGED (#295, `1a85186`) — ⚠ owner live-verify PENDING

### ✅ RESOLVED / DELIVERED
- **Worksheet PR-A (#295, `1a85186`)** — the worksheet grade UI rebuilt to the LOCKED redesign spec, **PRESENTATION ONLY** (grader `checkSolution.cjs` BYTE-UNCHANGED / absent from the diff). Auto scorecard popup (`WorksheetScorecard.tsx`, desktop modal ↔ mobile bottom sheet, four-type breakdown from `mistakeSummary`, all-pending disable) + tap-to-reveal sheet + branded graded PDF (`WorksheetGradedPrintDoc.tsx` + `exportGradedWorksheetPdf` via the shared `renderElementToPdf` refactor — `exportWorksheetPdf` behaviour-identical, no second grade call) + summary-leak fix (`isLeakySummary`, display-only) + `WS-{S}-{TOPIC}-{NN}` nomenclature (device-local count). 6 files +1003/−20; gates GREEN + CI quality-gate GREEN; no forbidden files; cofounder-reviewed clean; owner-merged, no self-merge.

### ⚠ STILL OPEN — mandatory owner live-verify (the worksheet UI redesign isn't "done" until this passes)
- **[PR-A-LIVE-VERIFY]** — the UI/PDF round-trip is unverifiable by static gates. On a real device + the stable URL: scorecard auto-pops after grading (desktop centered modal + mobile bottom sheet); four-type breakdown correct (Knowledge gaps vs Careless); ✕/Read/Download all close it; Read reveals the tap-to-reveal per-section sheet; Download → a branded PDF whose marks + pending match the screen exactly (snapshot, no re-grade); the all-pending case disables both buttons; name + code (`WS-…`) show on the scorecard, the sheet, and the PDF; **Check & Improve still grades (grader non-regression)**. Note: E2b's own `[E2b-LIVE-VERIFY]` is also still open — both worksheet round-trips await one owner pass.

### 🔭 NEXT (worksheet track)
- Owner live-verify of #295 → **PR-B**: the durable per-student worksheet record (Firestore-by-UID — nomenclature made durable + cross-device, the seen-set question-uniqueness that excludes already-served questions, the Me/Progress journey, scorecard persistence, and the parent/teacher storage foundation with §B6 **wellbeing-framing-not-surveillance** + **minor-data consent/transparency** constraints baked in). Then the parent/teacher VIEW (a later, deliberate feature). Carried: [FU-ASYNC-GRADING], [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].
---

## 2026-06-24 — Worksheet PR-E2b: one-PDF AI grade loop + MI wiring MERGED (#291, `60c5bf9`) — ⚠ owner live-verify PENDING

### ✅ RESOLVED / DELIVERED
- **Worksheet PR-E2b (#291, `60c5bf9`)** — the AI grade loop. Additive `gradeStructuredSet` core + `handleGradeWorksheet` in `checkSolution.cjs` (**existing Check & Improve grader byte-unchanged → zero regression**), `POST /api/grade-worksheet`; client `gradeWorksheet()` + `worksheetGradeService` (map-by-number, persist, single `recordMistake` + score-twin `recordAttempt` front door, stable `ws:<id>:q<N>` idempotency) + `WorksheetGradePanel` (honest "graded X/Y + N pending" totals). Honest-failure `couldNotRead` (never fabricate a mark, never zero an unreadable answer); trusted per-question marks; grade core surface-agnostic (Chapter Test / Full Mock reuse). 9 files +1201/−10; rebased post-Z3 ZERO conflicts; gates GREEN + CI quality-gate GREEN; no forbidden files; cofounder review clean; owner merged, no self-merge.

### ⚠ STILL OPEN — mandatory owner live-verify (the worksheet is not "done" until this passes)
- **[E2b-LIVE-VERIFY]** — the AI round-trip is unverifiable by static gates. On the Firebase-authorized trunk URL (NOT an unauthorized preview — auth fails there), START SMALL (5-Q): generate → solve a few by hand → scan to ONE PDF → upload → (1) each answer maps to the RIGHT question + sensible marks + correct solution shown; (2) an illegible page → honest "couldn't read Qn" + total reads "graded X/Y + N pending" (NOT a deflated/fabricated mark); (3) result feeds Me/Progress AND unlocks the MI-enrich toggle for that topic; (4) careless (silly/presentation) → careless insight NOT a weakness, knowledge-gap (conceptual/calculation) → weak-area for the right topic; (5) **Check & Improve still grades + feeds MI (shared-grader non-regression)**; (6) re-upload the same worksheet → MI does NOT double-count; (7) phone end-to-end. Owner-driven; backend auto-redeployed on merge.

### 🆕 NEW FOLLOW-UPS
- **[FU-ASYNC-GRADING]** — the whole worksheet is graded SYNCHRONOUSLY in ONE structured call (design decision (c): sync now, async deferred; premature at 5-Q test-group scale). A large worksheet (e.g. 25 Q) may push grade time up or truncate the single response (`maxOutputTokens` 32000 + one parse-retry). Revisit async/notify infra only if large-worksheet grade times prove painful.

### 🔭 NEXT (worksheet track)
- Owner live-verify of #291 → worksheet (E2a+E2b) COMPLETE → Topic Hub queue resumes at **PR-F** (Notes + Examiner's-tips content) → PR-G (deletions: dead old-mobile + retired MockBuilder/TutorDrawerV2/MentorPanel + un-routed worksheet twins). Carried: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].
---

## 2026-06-23 — Z3 Competency extraction MERGED (#292, `b1d3e46`) — bank-extraction PILOT

### ✅ RESOLVED / DELIVERED
- **Z3 Competency extraction (#292, `b1d3e46`)** — 102 net-new AUTHENTIC competency/case-based Maths questions in NEW `questionBanks/class10/maths/competency.z3.ts`, wired by ONE import + ONE spread. THE DECOUPLE (verbatim questions + AI step-marked solutions, pending verify; all marks inferred). Source 117 → 102 (15 dropped: 10 Polynomials out-of-syllabus, 1 complementary-trig, 3 solid-conversion; HCF rewritten to prime factorization). Authentic tier (`.z3`, absent from `AI_GENERATED_PACK_SOURCES`, "others" bucket). Silent-zero floor test added. Fix pass `0e8b1f4`: integer mark-schemes + audit notes moved to `//` comments + disputed/authored rows flagged-but-served. Gates GREEN + CI GREEN; owner-merged, no self-merge. **The pilot is proven → scales to the worksheet folders.**

### 🆕 NEW FOLLOW-UPS
- **[FU-Z3-TEACHER-VERIFY]** — the 7 explicitly-flagged rows + EVERY inferred mark + EVERY AI-authored solution need a teacher/examiner pass before treated as exam-certain. **4 `// PENDING OWNER VERIFICATION`** (source key wrong/blank): `QE-003` (function↔key cross-contaminated; only (iii)=175 verified), `ARC-004` (2954 by border method vs key's 2912), `TG-104` (200 m text vs 150 m datum implied by the answers), `SAV-005` (bore-volume inconsistency: r=7/L=450 ⇒ 69300 m³ vs key 6900; (iii)/(iv) coated-area parts are correct). **3 `// AUTHORED (Z4 blank)`:** `PLE-009` (alloy), `CG-007` (seating grid from figure), `SAV-006` (Earth sphere). Settled overrides already shipped clean: `TR-009` → 16 m, `PR-004` → 98.7%. All 7 are SERVED (not withheld) so they surface for review; resolve final values in a later tidy pass.
- **[FU-Z3-FIGURE-BIND]** — 28 rows carry `requiresDiagram:true` + a precise `diagramDescription`; 119 figures are staged to WebP (by question id + by source index) with a `figure_question_map.csv` under `Desktop\Content\extraction\z3-figures\`. Binding them to a renderer is a separate later step (no new asset-path field was added to `CanonicalQuestion` — staging + `diagramDescription` is the seam).
- **[FU-Z3-SOLUTION-IDS]** — OPTIONAL: Z3's AI-authored solutions were NOT registered in `AI_GENERATED_SOLUTION_IDS` (task scoped the PR to one import + one spread). If an "AI solution" badge is wanted (mirroring the `*.exemplar2` DECOUPLE), register the ids in a small follow-up.

### 🔭 NEXT (this track)
- **Scale the pipeline to the worksheet folders** — same recipe (extract → syllabus-filter at the question level → schema → bank → gates → STOP for owner verify), folder by folder, each its own gated PR. Owner-authorized separately.

---

## 2026-06-22 — Note-spec validator gate MERGED (#289, `c525b2a`) — notes track, gated step 1

### ✅ RESOLVED / DELIVERED
- **Note-spec validator gate (#289, `c525b2a`)** — `notes/validate_spec.py`, the 9-rule anti-fabrication gate that makes the ~35-note fan-out safe. stdlib only, NO bypass flag; reads `SURFACE_BANNED_PHRASES` from `syllabusGuard.ts` (trap-safe prose list, `//`-comments stripped) + slugs from `topics.ts` live, never hardcoded. Committed alongside the schema v1.1 contract + the validated Light reference spec + 5 negative fixtures + a self-test. Light VALID; negatives each trip exactly one rule. **PR-F is now UNBLOCKED.**

### 🔭 NEXT (notes track — gated step 2)
- **Content PR under `notes/`:** evolve the kit to `render_note(spec)`; finish Light's figure (base64→WebP) + mindmap (JS→spec) lift. THEN in parallel PR-F (`<Note>` component + wiring) AND Step-2 spec authoring (4 prototype enrichments → ~35 notes), validator-gated. Later: wire `validate_spec.py --json` as a `SubagentStop` hook.

---

## 2026-07-03 — Notes track: `<Note>` render (#324) + quadratic spec (#325) MERGED; Light completion DRAFT (#326)

### 🆕 NEW FOLLOW-UPS
- **[FU-NOTE-PDF-EXPORT] — CLOSED (#329).** Download-PDF (`window.print()` + `@media print`) shipped in the React `<Note>`: button by the tabs, all three tab panels rendered for print, note isolated from app chrome via the `visibility` trick (DesktopShell/App are forbidden, so the note isolates itself). Owner live-verify of print output pending — if app chrome shows or content clips, log **[FU-NOTE-PDF-PRINT-CHROME]** (small follow-up).
- **[FU-NOTE-GENERATED-FIG] — CLOSED (#329).** A generator registry keyed by `figure.generator` (`NoteGeneratedFigure.tsx`) now DRAWS `bucket:"generated"` figures: the Quadratic discriminant triptych (`parabola_triptych`, ported from the prototype's `plotStatic`) renders instead of the placeholder. `bucket:"ncert"` placeholder unchanged.
- **[FU-NOTES-LIGHT-COMPLETE] — CLOSED (#326 spec + #329 render).** The Light spec figures (base64 PNG→WebP) + mindmap (D3→spec) were lifted from the approved prototype in #326; #329 completed the in-app render (figures show, visual mindmap, PDF) — Light now renders every tab with no placeholder.

### ✅ DELIVERED
- **#324 (`9c7fa81`)** — PR-F `<Note spec={…}/>` renders note-specs in Topic Hub via `import.meta.glob`; honest empty state for spec-less topics. Owner-merged, no self-merge.
- **#325 (`52dd77b`)** — `notes/specs/quadratic-equations.json` (NCERT-verbatim, VALID 9/9, 6 examples, real mindmap, generated figure). Owner-merged, no self-merge.

---

## 2026-06-22 — Notes-generation track Step-1 MERGED (#282, `de2a616`) — parallel content track

### ✅ RESOLVED / DELIVERED
- **Notes track Step-1 (#282, `de2a616`)** — the locked note kit + 5 v2 prototypes + the **Light enriched exemplar** (the finished reference standard), generated from the official NCERT 2026-27 PDFs in the locked note grammar with verbatim-definition discipline. **14 files, ALL under `notes/`; content-generation ONLY (no app wiring).** Merged 2026-06-21 13:42Z (the FIRST of the recent cluster; a parallel track not covered by the worksheet docs #285 / symbol docs #287). Gates GREEN + CI GREEN; owner-merged, no self-merge. Full track handoff: **`handoff/NOTES_TRACK_HANDOFF.md`**.

### ✅ DECISION — notes integration (settled, owner-approved)
- **[FU-NOTES-INTEGRATION] — RESOLVED.** Notes ship as a shared React **`<Note spec={…}/>`** component fed by a structured **note-spec** (`notes/specs/<topic_key>.json`) as the single source of truth — **NOT standalone HTML**. The tutor and PR-F both consume the spec as data, and **Step 2 authors specs (JSON), not HTML**. The note-spec schema (v1.1) + the `<Note>` contract are the foundation; the gated build order below makes the ~35-note fan-out safe to parallelize. (The Step-1 prototypes are standalone HTML — they become the seed for the Light reference spec.)

### 🆕 NEW FOLLOW-UPS
- **[FU-NOTES-MATHS-MAP]** — the Maths NCERT folder (`…\NCERT Books\Mathematics class 10\`) is not yet content-mapped/unzipped; do that when the track reaches the Maths notes (Quadratic Equations etc.). Map files by CONTENT, never filename.
- **`topics.ts` trig-key collapse** — `topics.ts` collapses intro-trig + applications-of-trig into ONE `trigonometry` topic key (the repo wins over the brief's two trig keys); a note's `topic_key` must match `topics.ts`.
- **`magnetic-effects` = generate-TRIMMED** — when the track reaches it: include magnetic field / field lines / field-due-to-conductor·solenoid / right-hand-rule / force-on-a-conductor; EXCLUDE Motor / EMI / Generator (formative). Re-read `syllabusGuard.ts` for the exact retained sub-topics first.

### 🔭 NEXT (notes track — gated order, owner-authorized separately, do NOT reorder)
1. **`notes/validate_spec.py`** — source-required validator to note-spec schema v1.1 (rejects unsourced verbatim/example/figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, third_tab/example `kind` shape, source_ledger count).
2. **Content PR (under `notes/`)** — validated Light reference spec `light-reflection-and-refraction.json` + the schema-v1.1 doc + the validator; evolve the kit to `render_note(spec)`; finish Light's figure (base64→WebP) + mindmap (JS→spec) lift.
3. **Then in parallel** — **PR-F** (`<Note>` component + Topic Hub wiring; reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated. **Do NOT start Step-2 or PR-F before the validator + content PR land.**

---

## 2026-06-22 — Post-PR #286 (PYQ symbol-integrity pass; trunk `b600e2b`)

### ✅ RESOLVED / DELIVERED
- **PYQ √-data audit (from #284) RESOLVED** — audited all 103 PYQ packs / 759 questions. Recoverable set FIXED (12 √/operator recoveries in real-numbers/quadratics/polynomials `questionText`, each answer-/twin-verified); §7 normalized °/π/√ in 5 areas Qs. Unrecoverables WITHHELD + queued for owner real-paper lookup. Built in an isolated worktree; owner squash-merged #286 (`b600e2b`); no self-merge.
- **38 unservable questions WITHHELD** via a single source-level `WITHHELD_QUESTION_IDS` filter on `canonicalQuestionBank` (17 Science bilingual bleed + 21 Maths blank/garbled/answer-mismatch/mojibake). Honest omission > broken question. RAW 6579 → LIVE 6541 (delta == 38, evidence in the report). ⚠️ Takes effect on MERGE + REDEPLOY.

### 🆕 NEW FOLLOW-UPS
- **[FU-PYQ-OWNER-LOOKUP] (HIGH; owner action)** — 14 unrecoverable Maths expressions (blank / garbled / answer-contradicts-its-own-answer, incl. the most-dangerous `PYQ-M-2024-REALNUM-004` whose body contradicts its `(2−√3)/5` answer). Currently WITHHELD. Owner supplies correct text from the real papers (batched by CBSE paper code in `diff/PYQ_batch_for_owner_lookup_2026-06-21.md`); 2nd-pass patch un-withholds each. RULE: recover, never fabricate.
- **[FU-PYQ-REEXTRACT-SCIENCE] (MED)** — re-extract the 2025/26 bilingual Science papers (the 17 withheld Science Qs); their body is bilingual/CID gibberish, not a symbol drop. A pipeline fix (English-medium PDFs / drop the Hindi column) prevents recurrence. `diff/PYQ_REEXTRACTION_followup_2026-06-21.md`.
- **[FU-PYQ-ANSWER-FIELD-SYMBOLS] (MED)** — this pass fixed `questionText` ONLY; the `answer`/`solutionSteps` fields still carry dropped √ (e.g. RN-003/005/008 answers read "2 + 3", "6 – 7"), so revealed solutions are still corrupted. Separate answer-field symbol-integrity pass.
- **[FU-PYQ-CORRUPTION-DETECTOR] (MED)** — a sturdier corruption detector: mojibake-by-subset-font across BOTH subjects (the Devanagari-codepoint detector is blind to mangled-to-ASCII Hindi; the new `mojibake_scan.py` covers it) + an answer-consistency check. NB `mismatch_scan.py`'s `√\s*\w` regex captures only one char after the radical (`√15`→`√1`), so multi-digit surds are under-read — "only REALNUM-2024-004 is a true text-answer mismatch" is a SCREEN, not a guarantee (no full numeric re-solve done).
- **[FU-PYQ-ANGLE-NORMALIZE] (LOW)** — `Ð`→`∠` mojibake is bank-wide in geometry Qs (readable, so kept/served), plus the remaining °/π/superscript normalization (e.g. ARC-2026-001's garbled Reason formula, `cm²`/`x²`). Bank-wide normalization sub-batches, verify-against-answer discipline.

### 🔭 NEXT
- Worksheet track NEXT unchanged: **PR-E2b** (the AI grade loop). PYQ track is owner-driven from here ([FU-PYQ-OWNER-LOOKUP] → 2nd-pass patch + un-withhold).

---

## 2026-06-21 — Post-PR #280/#283/#284 (Worksheet rebuild E2a → E2a.3; trunk `cfff277`)

### ✅ RESOLVED / DELIVERED
- **Worksheet FOUNDATION (E2a → E2a.3)** — ONE responsive generator + distribution (even/weightage/MI, honest counts) + deleted-topics filter + real-math Option-B PDF file download + persist-by-`worksheetId` + view-aware Back + MI-enrich as a navy preview anchor with honest signed-out/locked states. Full detail: **`handoff/WORKSHEET_TRACK_HANDOFF.md`**. #281 closed (superseded by #283).

### 🆕 NEW FOLLOW-UPS
- **PYQ √-data audit (HIGH; separate symbol-fix agent, all subjects)** — `real-numbers.pyq*.ts` (and ~31 lines across maths `*pyq*.ts`) shipped questions with `√`/expressions stripped from `questionText` (clean camelCase `realNumbers.*.ts` are fine). SOURCE-DATA gap — flagged, NOT fixed (`src/data` gated). Full id/year/CBSE-paper-ref list + recoverable-vs-unrecoverable split: `diff/worksheet-bank-symbol-data-gaps-2026-06-21.md`. RULE: recover from twin/source, never invent, flag unrecoverables.
- **[FU-PITFALL-DATA]** — answer-key "⚠ where students lose marks" annotations omitted (no real per-question pitfall data). Add when real data exists.
- **[FU-WORKSHEET-PDF-SERVERSIDE]** — the PDF math is a raster image (not selectable text); acceptable for print. A server-side text PDF is a future upgrade if client quality proves insufficient.

### 🔭 NEXT (worksheet track)
- **PR-E2b (NEXT)** — the AI grade loop: extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1…QN (via `getWorksheetSession`); wire `recordMistake` through the MI front door so graded worksheets feed Me/Progress + unlock the MI-enrich toggle; **mandatory 5-Q live-verify** (AI round-trip). Then PR-F (content), PR-G (delete dead twins + retired set).

---

## 2026-06-20 — Post-PR #276 (Topic Hub PR-E1 practise-filter + chapter-test wiring + MockBuilder un-route; trunk `1de6f3e`)

### ✅ RESOLVED / DELIVERED
- **PR-E1 (#276, `1de6f3e`)** — the PR-E wiring stage, built in an isolated worktree, landed as 3 commits (one impl + two owner-found round-trips). Concept-row "Practise" → Quick Practice DIRECT (`buildDesktopConceptPracticePath`); **EXACT mark-band filter (Option A)** — `marksMin`/`marksMax` + `Number(q.marks) ∈ [min,max]` after the owner found the page's `"23"` bucket fuses 2-and-3-mark (lossy `markBandToBuckets` removed); **single-pool count fix** (`selectInRangeFromPool` — hint + display read the same pool, thin-bank honest); **PATH-CONDITIONAL** (range only on the concept-row entry; hub stays "All"); back-nav to the specific topic; concept-row-only applied-filter indicator; Chapter-test button WIRED; MockBuilder UN-ROUTED. Owner LIVE-VERIFIED PASS; no self-merge.
- **✅ [FU-PRACTISE-CONCEPT-FILTER] CLOSED** — both original breaks fixed (wrong route target + unconsumed band), and the two owner-found follow-on bugs (bucket fusion + count divergence) resolved. The concept-row Practise band now filters exactly and the hub path is unaffected.
- **✅ MockBuilder retirement EXECUTED** — the DECISION_LOG 2026-06-20 decision is now live: both `/mock-builder` routes redirect to `/practice-hub`, tagged `PR-G-deletion-pending` (code kept for PR-G).

### 🆕 NEW FOLLOW-UP
- **[FU-CHAPTERTEST-PAGE-REDESIGN]** — the Chapter Test page (`/chapter-test/:grade/:subject/:topicKey`) is old-design. PR-E1 wired the Topic Hub "Chapter test" button to it (routing works, real gen→score→persist), but the page itself was deliberately NOT redesigned in PR-E1 (out of scope). Backlogged for a later Pages-to-Redesign pass.

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-E2 (NEXT)** — Worksheet (wire the inert "Worksheet" band button; its own locked spec) · **PR-F** — content fill (Examiner's tips + Notes) · **PR-G** — delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set. Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]**, **[FU-CHAPTERTEST-PAGE-REDESIGN]**.

---

## 2026-06-20 — Post-PR #274 (Topic Hub PR-D final-IA LAYOUT; trunk `b57fa79`)

### ✅ RESOLVED / DELIVERED
- **PR-D final-IA layout (#274, `b57fa79`)** — `ConceptSpine` rebuilt to MATCH the binding mockup: learn-first concepts hero; receded dashed action band (3 buttons); unified **Notes** toggle (replaces Formula/Proofs/Practice-all tabs); clickable **Examiner's tips** container (1 real seed tip, no fabrication); concept "Practise" carries concept + `markBand`; per-row `✦ Visual` badge (honest, only where `findVisualForConcept` non-null); MI stays sidebar chrome. One responsive component, pure-CSS reflow, class-driven. Owner LIVE-VERIFIED GOOD; isolated worktree; no self-merge; branch+worktree cleaned up.
- **PR-C deferrals delivered in PR-D:** per-row visual badge ✅. (Mobile full-screen toggle was SPLIT to PR-D.1 — see below.)

### 🆕 NEW FOLLOW-UPS
- **[FU-PRACTISE-CONCEPT-FILTER] — PR-E.** Concept-row "Practise" has two confirmed downstream breaks (owner-verified on Trigonometry + Light): **(1) wrong route target** — `buildDesktopPracticePath` returns `/practice-hub` (`navigation.ts:75`), so it lands on the generic Practice hub needing a second click; should route DIRECTLY into Quick Practice with filters pre-applied. **(2) markBand not consumed (format mismatch)** — PR-D sets `markBand="1–2"` as a STRING (`navigation.ts:64`), but `PracticePage` filters via a NUMERIC `marksFilter` (`PracticePage.tsx:182`) bucketed to `"1"/"23"/"5"/"4"` (1mk / 2-3mk B·C / 5mk D / 4mk E-case — `PracticePage.tsx:326-329`); `markBand` is never referenced → carried but unapplied (student gets all marks 1–5). **PR-E fix:** route to quick-practice directly + translate the band string → `marksFilter` bucket-SET (ranges span buckets: `1–2`→{1,23}, `2–3`→{23}, `3–5`→{23,5}, `1–3`→{1,23}). **CRITICAL — path-conditional:** apply the band ONLY on the Topic-Hub-concept-row entry (a pre-set initial filter the student can still change); the OTHER entry (via the Practice hub, where the student sets their own filters) must NOT be forced to a mark band. Same Quick Practice page, two entry paths; force the band on the concept-row path only. (PR-D ships the route param honestly; routing + consumption land in PR-E.)
- **PR-D.1 — mobile full-screen tutor toggle (split from PR-D, owner-approved).** Item 7 was split out: it's a `TeachFlow` render change (not ConceptSpine layout), its mobile behaviour can't be verified on Windows (vite/vitest linux-pinned), and the binding mockup doesn't depict the tutor interactive. **Spec:** desktop side-by-side ↔ mobile full-screen TOGGLE, same component + same data, the toggle being the 360px-forced variation (one responsive site; mobile follows desktop, varying only where 360px forces it). **Corrected blast radius (owner):** there are no longer three live tutors — `TeachFlow` backs ONLY the one live Topic Hub tutor; `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx` are dead code (PR-G deletes them), and everywhere else the AI does solution-CHECKING, not tutoring. So a `TeachFlow` change touches ONE live surface — lower-risk than the PR-D report framed it. Its own mobile live-verify before merge.
- **[FU-BOOKMARK-SAVE-QUESTION] (logged for later; not a launch blocker).** A future lightweight "bookmark / save this question" feature — let a student proactively save a tricky question even when they answered it correctly — and surface saved questions on the **Me / Progress** page. Distinct from Mistake Intelligence (which captures WRONG answers); this is voluntary save-for-revisit. Owner-logged for later.

### ✅ DECISION — MockBuilder RETIRED
- **MockBuilder is cut from the live product** (un-routed) **+ tagged for deletion** (joins the PR-G legacy set: dead `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx`). **Code kept** for now; PR-G removes it with the rest. **Reason:** Mistake Intelligence now **auto-captures** the "hard questions to revisit" need that MockBuilder was meant to serve manually — the manual builder is redundant. (Decision recorded in DECISION_LOG 2026-06-20.)

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-E (NEXT)** — chapter-test + worksheet wiring + **[FU-PRACTISE-CONCEPT-FILTER]** · **PR-F** — content fill (Examiner's tips + Notes) · **PR-G** — delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set. Separately: **PR-D.1** (mobile tutor toggle), **[FU-CONTEXTUAL-TUTOR-REBUILD]** (scripted non-contextual `concept_teach` engine).

---

## 2026-06-20 — Post-PR #272 (Topic Hub PR-C concept tutor "Teach me" flow; trunk `d9ba545`)

### ✅ RESOLVED / DELIVERED
- **PR-C tutor flow (#272, `d9ba545`)** — concept-row **"Teach me"** wired LIVE into the existing `concept_teach` engine on BOTH platforms (one responsive `ConceptSpine` mount); **`findVisualForConcept` wrong-visual bug FIXED** (below-confidence/empty → `null`, not `concepts[0]`); **earned-reveal client support** (teach-first; follow-up-turn server visual). Owner LIVE-VERIFIED PASS. Built in an isolated worktree; no self-merge; branch + worktree cleaned up.

### 🆕 NEW FOLLOW-UP
- **[FU-CONTEXTUAL-TUTOR-REBUILD]** — at PR-C live-verify the tutor's **content behaviour** surfaced: it serves a scripted **"Ravi Sir / Step N of 5"** lesson and does **not** respond contextually to what the student types. This is a **pre-existing defect in the old `/api/mentor` `concept_teach` engine** (server-side), which PR-C correctly wired into but was **never scoped to rebuild**. **Not a PR-C defect and not a PR-D layout item** — it is a **separate upcoming workstream** (the contextual-tutor rebuild). Owner-flagged, deliberately deferred.

### 🔭 PR-C DEFERRALS (fold into PR-D)
- **Mobile interactive = full-screen toggle:** TeachFlow currently renders the visual **stacked** under the chat on mobile, not a full-screen toggle (spec category B wants a toggle). A TeachFlow render change touching every mobile tutor surface — PR-D-shaped, not bundled into the behavioral PR-C.
- **Per-row visual badge:** with `findVisualForConcept` now honest, the per-row "has interactive" badge can be rendered on the spine — deferred to PR-D's layout work.

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-D (NEXT) — layout / action-band / tips / notes-consolidation** (+ the two PR-C deferrals above). ⚠️ MI stays in the navy sidebar (chrome), NOT on the Topic Hub page body. Starts fresh in its own worktree.
- PR-E — chapter-test + worksheet wiring (+ concept-level Practise auto-filter) · PR-F — content fill · PR-G — delete dead old-mobile.

---

## 2026-06-19 — Post-PR #268 (docs(design): FINAL Topic Hub IA committed; trunk `a280685`)

### ✅ RESOLVED / DELIVERED
- **FINAL Topic Hub IA committed** to `docs/design/` (#268): the owner-approved mockup HTML + the spec supersession (learn-first hierarchy, unified Notes, clickable Examiner's tips, "Teach me", concept-filtered Practise, 3-action band, constant navy sidebar + Mistake Intel). **Supersedes #261.** Now the in-repo binding reference for the rebuild. Built in an isolated worktree ([FU-WORKTREE-ISOLATION] honoured).

### 🔭 NEXT (Topic Hub rebuild — owner-authorized separately, each its own PR vs the final IA)
- **PR-C — tutor flow:** wire the concept-row "Teach me" into the existing `concept_teach` engine (per-concept; engine unchanged; do NOT rebuild the chat / do NOT use `TutorDrawerV2`/`MentorPanel`).
- **PR-D — layout / action-band / tips / notes-consolidation:** flip to learn-first, recede the action band, add the clickable Examiner's tips panel, consolidate Formula-sheet + Proofs into the single unified Notes view.
- **PR-E — chapter-test + worksheet wiring** (+ concept-level Practise auto-filter).
- **PR-F — content fill:** per-topic Examiner's tips (anti-fabrication) + unified Notes content.
- **PR-G — delete dead old-mobile** once the new IA ships at all widths.
- ⚠️ **Mistake Intel placement (PR-D guard, corrected):** Mistake Intel appears in the **navy sidebar** (global product chrome, present on every page) — **NOT on the Topic Hub page body**. The "no MI on the Topic Hub page" rule is **UNCHANGED** by the final IA; the sidebar panel is **chrome, not page content**. There is no supersession of the MI placement rule. PR-D must NOT add MI to the Topic Hub page body.

---

## 2026-06-19 — ⚠️ Process follow-up (commit c418f59 carried PR-B ungated)

- **[FU-WORKTREE-ISOLATION]** (NEW, process) — commit `c418f59` ("docs(handoff)…#266") also carried the PR-B concept-spine product change (App.tsx + DesktopTopicHubPage + ConceptSpine + test), which reached trunk **ungated** due to a parallel-agent **shared-working-directory** collision (docs branch cut while an unpushed local PR-B commit sat on local `base`; squash bundled both). PR-B code is correct, green, and owner-live-verified (desktop + mobile), but the commit is **mislabeled** and PR-B **bypassed its own gated PR**. **Fix:** give each concurrent agent its own **git worktree** so uncommitted/local commits can't ride into another agent's PR. See the SESSION_LOG correction entry of this date. (No code action outstanding — PR-B is accepted-forward; this is the process guardrail.)

---

## 2026-06-19 — Post-PR #265 + #264 (Bank Expansion Batch 2, 45 net-new + vitest-infra; merged, trunk `381e9df`)

### ✅ RESOLVED / DELIVERED
- **Batch 2** — Coordinate-Geometry 22 + Areas-Related-to-Circles 23 = 45 net-new, owner-verified + merged (#265). CG Area-of-Triangle excluded; figure-locked dropped; 3 `⚠ RECON`. Provenance via `AI_GENERATED_SOLUTION_IDS`; `predictionTypes.ts` untouched.
- **[FU-VITEST-INFRA] — RESOLVED** (#264, `2ef0b2c`): `@testing-library/dom` devDep + `setup.ts` window-guard; lockfile regenerated in Codespaces (pnpm 10.32.1). Codespaces vitest now **11/11 suites, 63/63 tests green** (was 7 failed / 4 passed). Future batches verify clean.

### 🔭 NEW / UPDATED FOLLOW-UPS
- **[FU-DIAGRAM-RECOVERY]** (NEW) — full-corpus figure-locked census found **67** diagram-dependent in-scope exercise questions, **42 high-mark (Section C+D)**: Triangles 18 · ARC 17 · Circles 15 · SAV 9 · PLE 3 · CG 2 · Trig 2 · Stats 1. These are currently DROPPED at extraction. Mocks are a launch surface, so recovering the high-mark ones (extract + clean + tag authentic NCERT/Exemplar diagrams, set `requiresDiagram`/`diagramDescription`) is launch-critical. **Decision needed before Batch 3** (Triangles+Circles hold 33 of the 42): drop-and-census as usual, or pair Batch 3 with a diagram-recovery pass.
- **[FU-EXEMPLAR-DEFERRED-NETNEW]** (updated) — deferred net-new available for top-ups: Batch-1 (AP Ex5.3 extras), Batch-2 (CG Ex7.3 Q12,14,15; ARC Ex11.4 Q7,9,10,11,13,19). Also CG collinearity-via-area items (Ex7.2 Q5,Q10; 7.3 Q19) were excluded as area-adjacent — owner may re-include solved via section/slope.
- **[FU-EXEMPLAR-STAT-13.4]** (carried) — Stats LA Ex13.4 question text not extractable from jeep213.pdf.

### ⏭️ NEXT BATCHES (owner-authorized separately, fresh from `381e9df`)
- Batch 3: Triangles + Circles · Batch 4: Trigonometry + Pair-of-Linear-Eq (Trig drops complementary-angle ratios) · Batch 5: Real-Numbers + Polynomials (Euclid + cubic-zeroes-coeff dropped). New rows ∈ Fix B [FU-TOPICKEY-CONSOLIDATION] scope.

---

## 2026-06-19 — Post-PR #262 (Bank Expansion Phase 1, Batch 1: 60 net-new Exemplar Maths Qs + AI step-marked solutions; merged + CI GREEN)

### ✅ RESOLVED / DELIVERED
- **Batch 1 of the Exemplar-Maths bank expansion (THE DECOUPLE)** — 60 net-new authentic questions (AP 24, Statistics 16, SAV 20) +
  AI step-marked solutions, owner-verified + merged (`444238b`). Solution-provenance via `AI_GENERATED_SOLUTION_IDS` id-set;
  `predictionTypes.ts` untouched. Codespaces vitest NO REGRESSION vs base.

### 🔭 NEW FOLLOW-UPS
- **[FU-VITEST-INFRA]** — repo vitest setup has a pre-existing gap: 7 component/page suites fail to LOAD with `Cannot find module
  '@testing-library/dom'` and `window is not defined` (jsdom env not active). Fails identically on untouched base `444238b` (proven),
  so it is NOT a Batch-1 regression — but it makes the Codespaces vitest gate noisy. Fix as its own tiny hygiene PR: add
  `@testing-library/dom` to devDependencies and ensure the jsdom test environment is applied. (CI quality-gate does not run vitest.)
- **[FU-EXEMPLAR-STAT-13.4]** — Statistics LA Exercise 13.4 (answer key shows 51.75 / 48.41 / 31 yrs / 201.96 g / median-salary
  13420 / …) is NOT extractable from `jeep213.pdf` (question text absent in the PDF's text layer). Needs a clean source before those LA items can be added.
- **[FU-EXEMPLAR-DEFERRED-NETNEW]** — additional net-new available for later top-ups: AP Ex 5.3 has ~12 further SA items + more Ex 5.2
  reasoning parts (not all harvested in Batch 1 to keep the batch verifiable). Surfaced so coverage is not silently capped.

### ⏭️ NEXT BATCHES (owner-authorized separately, branched fresh from `444238b`)
- Batch 2: Areas-Related-to-Circles + Coordinate-Geometry (Coord-Geom drops Area-of-Triangle-in-Coordinate-Geometry — banned).
- Batch 3: Triangles + Circles · Batch 4: Trigonometry + Pair-of-Linear-Eq (Trig drops complementary-angle ratios) · Batch 5: Real-Numbers + Polynomials (Euclid + cubic-zeroes-coeff dropped).
- These new rows fall into Fix B [FU-TOPICKEY-CONSOLIDATION] migration scope.

---

## 2026-06-18 — Post-PR #259 (AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock; merged + CI GREEN)

### ✅ RESOLVED — mock surfaces now soft-demote AI per-slot
- **[FU-AITIER-RANK-MOCKS-HPQ] — RESOLVED** (#259, trunk `775ee75`, squash; 4 files +209/−11; commit `ba2f619`). Extended PR2a's
  `SOURCE_MULTIPLIER` (reused — exported `getSourceMultiplier`, no fork) to the mock selection paths: **Full Mock**
  (`unlimitedPaperEngine.weightedSelect` per section/marks slot + `sourceWeightedPick` authentic-first archetype prefill) and
  **Topic Mock** (`topicMockEngine.weightedShuffleByScore`). Soft + structure-preserving (per-pool, `0.3/0.6` never 0 → an
  authentic-thin slot still fills with AI; blueprint/section-counts/pools unchanged; zero question added/removed). Codespaces vitest
  7/7. Report: `report-ai-tier-rank-mocks-hpq-2026-06-18.md`.
- **HPQ "serves AI at parity" assumption — RESOLVED as a NON-issue (boundary correction).** The instruction assumed HPQ uses
  `getAllQuestions()` + serves AI at parity. **Wrong.** `highlyProbableQuestions.ts` is a hand-authored curated bank
  (`ple-hpq-*`, `sci-he-hpq-*`, `rn-comp-*`); never calls `getAllQuestions()`; ZERO AI-pack content (none in
  `AI_GENERATED_QUESTION_IDS`; `hpqCompetencyAdditions` curated). Nothing to demote (×1.0) → left untouched (no cosmetic no-op).
  **All AI-bearing surfaces now covered: practice (PR2a) + Full Mock + Topic Mock (#259); HPQ already AI-free.**

### 🐞 NEW follow-up
- **[FU-AITIER-RANK-DIFFICULTY-HELPERS] (NEW, owner-authorized-later).** `difficultyAwarePractice.ts` +
  `difficultyAutoSuggest.ts` also call `getAllQuestions()` and serve AI at parity, but were out of #259's named scope (Full Mock /
  Topic Mock / HPQ) and its authorized gated-file list → NOT touched. Apply the same `getSourceMultiplier` demotion to their
  selection so every AI-bearing surface honours the AI-lower doctrine. Separate PR, its own instruction branched fresh from `775ee75`.
- **Owner live-verify of #259 — PENDING** (the real gate for a live ranking change): (1) generate a Full Mock on a ~50%-AI topic
  mix → each section authentic-first, AI only where authentic is thin; (2) the mock still has all sections filled (structure
  intact); (3) per-topic counts unchanged; (4) Topic Mock likewise authentic-first per slot. (HPQ item N/A — curated, no AI.)

## 2026-06-18 — Post-PR #257 (AI-tier PR2b strip fabricated pastBoardYear; merged + CI GREEN)

### ✅ RESOLVED — fabricated pastBoardYear stripped (anti-fabrication)
- **pastBoardYear-fabrication — RESOLVED** (#257, trunk `d6e0e14`, squash; 11 files +113/−106; commit `b4280ad`). Predicted/HPQ
  questions claimed a board year with no traceable PYQ reference. **96 values across 5 files** stripped (instruction assumed
  75/2 — undercount of 21; exhaustive enumeration done before stripping per owner). All 8 `.pastBoardYear` reads cleaned:
  dedup → score-only, `sourceYearHint` → `targetYear-1`, dead 5-signal-input fields removed. `predictionTypes.ts` untouched
  (optional field stays declared). Count-integrity: served bank 6,715 unchanged, `pastBoardYear_remaining=0`. Codespaces vitest
  9/9. Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`.
- **HPQ-confidence-shift concern — RESOLVED as a NON-issue.** The instruction expected HPQ confidence to shift; verified it does
  NOT — the 5-signal + Bayesian scorers read the historical dataset's `sourceYear`, never `input.pastBoardYear`/`sourceYearHint`
  (dead plumbing). Only the dedup tiebreaker changed (now score-only). Proven by unit test.

### 🐞 NEW / carried follow-ups
- **[FU-AITIER-RANK-MOCKS-HPQ] (carried, owner-authorized-later).** Still open after PR2b. Full Mock (`unlimitedPaperEngine`),
  Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`) route through `getAllQuestions()` + own selection and do
  NOT get PR2a's `sourceMultiplier` AI-demotion. Apply the same demotion there so all four surfaces honour the AI-lower doctrine.
- **[FU-HPQ-PHASE2-ESBUILD] (NEW, low priority — infra).** `scripts/ops/hpq_phase2_acceptance.mjs` cannot run in Codespaces:
  `Cannot find package 'esbuild'` (the ops bundling harness imports `esbuild` from `lazytopper/scripts/ops/`, where pnpm doesn't
  hoist it). Fails identically on trunk; not a CI gate. Pre-existing — surfaced (not caused) by PR2b's fixture edit.
- **[FU-PASTBOARDYEAR-TYPE-DECLS] (NEW, optional cleanup).** 9 `pastBoardYear?: string` optional type decls remain (incl. the
  forbidden `predictionTypes.ts:72`). All harmless/unused now; could be removed in a future type-hygiene pass (would need
  `predictionTypes.ts` authorization). Also `class10SciencePredictiveEngine.ts:469` has a stale prose doc-comment listing
  `pastBoardYear` as a field — cosmetic.

## 2026-06-18 — Post-PR #255 (AI-tier PR2a source-provenance stamp + soft AI-lower ranking; merged + CI GREEN + live-verified)

### ✅ RESOLVED — AI-lower ranking now enforced (the provenance + ranking half of the audit's PR2)
- **AI-lower-ranking-not-enforced — RESOLVED** (#255, trunk `686f737`, squash; 3 files +265/−9; commit `b4236ac`). The audit found
  `getAdjustedScore` had no source term and the file/suffix tier marker was destroyed at the bank concatenation (~41% AI at full
  parity). PR2a stamps `AI_GENERATED_QUESTION_IDS` at ingest from the 54 `.pack[1-3]` arrays (additive; bank untouched), stamps a
  `_source` tier (`authentic`/`ai-generated`/`predicted`) on the local `CanonicalQuestionWithScore` intersection (forbidden
  `predictionTypes.ts` NOT touched), and multiplies `getAdjustedScore` by `SOURCE_MULTIPLIER = {1.0, 0.6, 0.3}`. **Owner live-verify
  PASS:** on ~50%-AI topics a 10-question Quick Practice serves all authentic (first AI at index ~100–186). Exact live split: 6,715
  total = 3,710 authentic + 2,764 ai + 241 predicted, 0 unstamped. Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`.

### 🐞 NEW follow-ups
- **[FU-AITIER-RANK-MOCKS-HPQ] (owner-authorized-later; ranking parity for the remaining surfaces).** PR2a's `sourceMultiplier`
  only applies inside `getLikelyQuestionsForConcept` (Quick Practice / topic practice). **Full Mock** (`unlimitedPaperEngine` :353),
  **Topic Mock** (`topicMockEngine` :147), and **HPQ** (`highlyProbableQuestions`, own pool) route through `getAllQuestions()` +
  their own selection/weighting and therefore still draw AI at parity. Apply the same tier demotion in those selection paths so all
  four surfaces honour the AI-lower doctrine. Separate PR; needs care (mock/HPQ ordering carries higher regression risk).
- **[FU-CURATED-26-PROVENANCE] (owner-logged; decision recorded).** The 26 curated inline items in `canonicalQuestionBank.ts`
  (ids `2026-…`, e.g. `2026-TRIG-APP-01`) are not from a `.pack` file nor a verified-source file. **Decision: they stay
  classified `authentic`** (the documented "not-AI-pack ⇒ authentic" rule; ≤26 items, low impact). Re-open only if these should be
  treated as a curated/predicted tier.

### ↪️ CARRIED (unchanged by #255)
- **[FU-AITIER-MARKS-MISMATCH]** — the 7 quarantined pack items still need the marks/content pass (out of PR2a scope).
- **PR2b `pastBoardYear` strip** — now **unblocked** by this stamp (it distinguishes verifiable PYQ years from fabricated
  predicted-layer ones). Owner's immediate next.

## 2026-06-18 — Post-PR #253 (AI-tier PR1b pack-file 5-mark retags; merged + CI GREEN)

### ✅ RESOLVED — pack-layer backlog drained of genuine long-answers
- **[FU-AITIER-PACK-5MK-SHORT] — RESOLVED** (#253, trunk `f83915b`, squash; 9 files +34/−19; commit `86394e4`). The 19 pinned
  pack-layer `format:"Short"` Section-D/5-mark items were split by content: **12 genuine 5-mark long-answers relabelled
  `Short→Long`** (label-only; each confirmed by reading its `questionText`) — `ARC2-016/017, ABS2-048, CC2-048, CR2-044/045/046,
  HEC2-039, LT2-016/024, ME2-025, REP2-048`. **`PR2-018` reclassified** on inspection (single-step `7/12` one-liner, not a
  long-answer) → moved to quarantine. Backlog **19 → 7**; count unchanged. Report: `report-aitier-pr1b-pack-retags-2026-06-18.md`.

### 🐞 NEW follow-up
- **[FU-AITIER-MARKS-MISMATCH] (owner-authorized-later; content/marks pass).** The **7** quarantined pack items —
  `TG3-056` ("cosec 60°"), `TG3-059` ("evaluate 4 sin30° tan60° − 2 cot60° cos30°"), `ABS2-047` ("salt vs base"), `CR2-043`
  ("balance Al + O₂ → Al₂O₃"), `MNM2-037` ("name the reducing agent"), `REP2-039` ("name two contraceptives"), `PR2-018`
  ("P(not blue)") — are SHORT questions wrongly tagged **5-mark**. This is a content↔marks problem, NOT a label problem: PR1b
  deliberately did NOT relabel them (relabelling to "Long" worsens them). Fix the **marks** (or rewrite to genuinely fit 5 marks),
  then remove each from `PACK_5MK_SHORT_BACKLOG` in `aiTierContentIntegrityGuard.test.ts`. They stay pinned + annotated so the
  guard tracks them with no regression. Gated `.pack` edits + content judgment — owner-authorized, separate.

## 2026-06-18 — Post-PR #251 (AI-tier PR1 mechanical content-integrity; merged + CI GREEN)

### ✅ RESOLVED — Q10 de-fused + tagging defect fixed + guard added
- **[FU-MALFORMED-QUESTION] — RESOLVED** (#251, trunk `f4a41b6`, squash; 5 files +237/−41; commit `8524e8e`). The read-only
  audit (`report-ai-tier-audit-2026-06-17.md`) found Q10 (`2026-RN-LA-03`) was a **one-off** cross-concept fusion, and the
  "5mk/Section-D/Short" symptom was a **systematic** tag defect (the `QuestionKind` type had no `"Long"` member). PR1: added
  `"Long"` to `QuestionKind` (both predicted files) + `toCanonicalFormat` propagation; retagged **24** five-mark Section-D
  predicted items `Short→Long`; **split Q10** into `2026-RN-SA-08` (LCM, C/3mk) + `2026-RN-SA-09` (√5 proof, C/3mk) [net +1];
  added `aiTierContentIntegrityGuard` to the root matrix (175→181) locking the class. Report:
  `report-aitier-pr1-mechanical-2026-06-17.md`.

### 🐞 NEW follow-ups
- **[FU-AITIER-PACK-5MK-SHORT] (owner-authorized, queued — PR1b).** The audit undercounted: the SAME 5-mark-"Short" defect
  exists in **19** gated `.pack2/.pack3` questions (`format:"Short"`, which the predicted-layer `kind` tally missed) —
  `ARC2-016/017, PR2-018, TG3-056/059, ABS2-047/048, CC2-048, CR2-043…046, HEC2-039, LT2-016/024, ME2-025, MNM2-037,
  REP2-039/048`. Pinned as a shrink-only baseline in `PACK_5MK_SHORT_BACKLOG`. **PR1b:** retag ONLY the genuine long-answers
  `format:"Short"→"Long"` and shrink the backlog; **QUARANTINE** the content↔marks mismatches (e.g. `TG3-056` "cosec 60°",
  `REP2-039` "name two contraceptives" tagged 5mk) — flag for a separate content-judgment pass, do NOT relabel. Needs explicit
  `src/data/**` pack-file scope. Wait for the owner's PR1b instruction.
- **[FU-AITIER-PROVENANCE-RANKING] (PR2 — architectural, queued).** From audit §4–§6: there is **no source/provenance field** and
  **no AI-lower ranking** — AI and authentic interleave at parity across all four surfaces (Quick Practice, HPQ, Chapter Test,
  Full Mock), and mocks draw from the mixed unified bank. PR2: add a `source`/provenance stamp at the module boundary, enforce
  AI demotion in `predictionCore.getAdjustedScore`, and strip the unverified `pastBoardYear`. Owner-authorized, separate.

## 2026-06-17 — Post-PR #249 ("Finish session" scorecard trigger; merged + CI GREEN; owner live-verify PASS)

### ✅ DONE — Finish-session trigger merged + live-verified
- **[FU-SESSION-SCORECARD-TRIGGER] — CLOSED** (#249, trunk `704dcff`, squash; 2 files +63/−2; commit `b740a3f`). Replaced #240
  sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** button (always-available
  at the set foot, both desktop + mobile widths) → fires `practice_finish_session_click` + sets `sessionFinished` → surfaces the
  scorecard; `allDone` retained as a convenience auto-offer. Reuses the EXISTING `sessionStats` — no new counters/persistence/
  state machine. **Owner live-verify = PASS — partial-session honesty PROVEN:** a 3-of-10 finish reads "3 of 10 attempted · 0/3
  MCQs correct · 0% accuracy · the 7 you didn't reach aren't counted"; the zero-attempt case reads honestly too.
  **Supersedes #240 sub-task 5.** Report: `report-finish-session-scorecard-2026-06-17.md`.

### 🐞 NEW follow-up — for the upcoming read-only AI-generated-question-tier audit
- **[FU-MALFORMED-QUESTION] (owner-observed live during the #249 verify)** — a **malformed question in a live pack**: **Real
  Numbers Quick Practice Q10 fused TWO distinct questions into one** — an alarm-clock LCM word-problem AND "prove √5 is
  irrational" — and carried **inconsistent metadata** (tagged **5-mark / Section-D** yet also labelled **Short**; the two fused
  parts don't add up to a single coherent mark/section/format). **Suspected AI-generated pack origin** (the generator likely
  concatenated two seeds and mis-tagged the result). This is a CONTENT-INTEGRITY signal, not a #249 regression (the scorecard
  surfaced correctly; the question itself is the defect). **To be characterised by the next task — a read-only
  AI-generated-question-tier audit** (its own owner instruction, branched fresh from `704dcff`): scope the prevalence of fused /
  mis-tagged / mark-section-inconsistent items across the AI-generated tiers; map (do not fix) the problem. Repro: Real Numbers
  → Quick Practice → Q10.

## 2026-06-17 — Post-PR #246 (Check & Improve detect-then-confirm + question photo upload; merged + CI GREEN; owner live-verify pending)

### ✅ DONE — detect-then-confirm merged
- **[DETECT-THEN-CONFIRM]** (#246, trunk `c9404e1`, squash; 9 files +935/−78; commit `3e00ac4`). The UX layer on Claim 2:
  detection is now VISIBLE + CORRECTABLE before grading, plus question photo upload. "Read the question →" → detection-only
  `POST /api/detect-question` on the question alone → confirmation chip (subject·topic·marks + source) + quiet [Change]
  (constrained correction; corrected mark → `marksSource:"user"`) → grade on the CONFIRMED values via the unchanged
  trusted-marks path (the grader is untouched). Override logged on the attempt record (`marksSource` + `detectionOverride`;
  reuses recordAttempt persistence — no new collection / no `firestore.rules` change). Report: `report-detect-then-confirm-2026-06-16.md`.

### ⚠️ PRE-LAUNCH GATE — must not be forgotten
- **[FU-DETECTION-META-LAUNCH-FLIP] (hard pre-launch gate, owner-flagged)** — `SHOW_DETECTION_META` in
  `lazytopper/src/utils/checkImproveDetection.ts` is **ON now for the owner testing phase**; it MUST be flipped to **`false`
  before Check & Improve ships to students**. It gates ONLY the detection meta-display (the "read from the question" /
  "estimated" source label) — it does NOT hide the detected values or the [Change] control (those stay visible + correctable
  at launch — calm "we read this from your question", never anxious "AI low-confidence"). **This is the tester-vs-student
  line: shipping with the machinery still showing is a real miss.** A one-line change (`export const SHOW_DETECTION_META =
  false;`), but easy to forget — wired into NEXT_ACTION (item 0) + ROADMAP so it surfaces every session until done. After
  flipping, verify the chip on BOTH desktop + app shows the values + Change but no source label.

### ✅ Decisive verification — DONE (owner): [DETECT-CONFIRM-LIVE-VERIFY] = PASS 5/6
- (1) Printed marks read correctly; (2) inference GENUINE + graduated — a short AP question infers **2**, a proof infers **3**
  (they diverge → real inference, not a blind constant); (3) **photo** of a printed-marks question reads the printed value with
  two distinct upload slots; (4) **[Change]** corrects a wrong detection → grades the corrected value, corrected topic buckets
  to a clean canonical key on Me; (5) selectors gone on desktop AND mobile width. The detect-then-confirm UX is validated live.

### 🐞 New follow-up from the live-verify (the 6th — known issue, NOT a blocker)
- **[FU-DETECTION-MARKS-CEILING] (owner-observed in the #246 live-verify)** — the inferred mark scale **under-calls true
  5-mark questions** (multi-part numerical + proofs) as **3**; inference tops out below 5 for the heavy items. It is
  **caught-and-correctable via [Change]** (the student bumps it to 5), so it does NOT corrupt grading — exactly the failure
  mode detect-then-confirm was built to absorb (the AI proposes, the student corrects). Hence PASS-with-known-issue, not a
  blocker. Fix candidates (later, owner-authorized): (a) tune the `/api/detect-question` prompt's mark heuristic to reach 5 for
  multi-part / derivation / proof / long-answer items (cheap, prompt-only); (b) bank-grounding / retrieval to calibrate the
  scale against real CBSE mark allocations — DEFERRED behind Fix B. The override telemetry (`detectionOverride`, logged on the
  attempt when the student bumps 3→5) is the signal that will measure how often this fires. Not urgent; the UX absorbs it.

### Touchpoints
- The two Check & Improve surfaces continue to share `checkImproveDetection.ts` (now also `buildConfirmedDetection` +
  `clampDetectedMarks` + the `SHOW_DETECTION_META` flag) — they can't diverge.
- **Bank-grounding / retrieval for detection** is DEFERRED behind **Fix B [FU-TOPICKEY-CONSOLIDATION]** (calibrating detection
  against the question bank needs the topicKey/tagging cleanup first). Detection stays prompt-based for now.

## 2026-06-16 — Post-PR #244 (Check & Improve auto-detect marks/subject/topic — Claim 2; merged + CI GREEN; owner live-verify pending)

### ✅ DONE — Claim 2 merged
- **[CLAIM2-AUTODETECT]** (#244, trunk `43ffa09`, squash; 6 files +330/−238; commit `d93cd23`). The Check & Improve grader now
  determines marks/subject/topic from the question (owner-ruled option (a)); the student selectors are gone on both surfaces
  (desktop + app). Opt-in `detectMarks` flag → Quick Practice (`SolutionChecker`, canonical-bank marks) is byte-identical.
  Printed marks preferred → inferred → flagged `fallback` (never a silent static 3); topic constrained to the canonical
  `topics.ts` vocab + re-canonicalised via the shared `resolveDetectedGradeTopic` helper (reuses Fix A's
  `desktopTopicForWeakAreaKey` — no new normaliser → clean MI attribution). Report: `report-claim2-autodetect-marks-2026-06-16.md`.

### Decisive verification owed (do NOT mark fully done until then)
- **[CLAIM2-LIVE-VERIFY] (owner, decisive)** — static gates can't judge the AI's marks-inference quality. On real uploads:
  (1) question stating "[3]" → graded /3 without entering marks; (2) question with no printed mark → sensible inferred scale,
  not a blind 3; (3) detected topic buckets correctly on Me ▸ weak-areas (real key, routes to practice via Fix A); (4) the
  manual marks/subject/topic selectors are gone at desktop (≥1024px) AND mobile width.

### Touchpoints / related follow-ups
- **[FU-GRADE-MARKSCALE]** — partially addressed: the grader now judges the CBSE mark value from the question (prefers printed,
  else infers) rather than consuming a student-entered scale. The eval ([MI-EVAL]) should now also score the auto-detected
  mark scale + topic-detection accuracy. **[FU-GRADE-CONSISTENCY]** and **[MI-EVAL]** remain open / eval-gated.
- The two Check & Improve surfaces now share `resolveDetectedGradeTopic` (`src/utils/checkImproveDetection.ts`) — they can no
  longer diverge on topic canonicalisation (a recurring desktop-vs-mobile drift class).

## 2026-06-16 — Post-PR #242 (topicKey Fix A — Me weak-area resolver + 13 aliases; merged + CI GREEN; owner live-verify pending)

### ✅ DONE — read-only audit + Fix A merged
- **[TOPICKEY-AUDIT] (read-only, DONE)** — `report-topickey-duplication-audit-2026-06-16.md`. 84 distinct `topicKey` strings,
  4,907 occurrences, **32% under non-canonical spellings**. Proved serving merges all variants (no content shortage) but the
  attribution side fragments: `recordAttempt`/`recordMistake` store the raw label, and the Me row resolved it through the
  weakest normaliser. The report IS the Fix B migration spec (key→key map, affected files, guard design in §5).
- **[TOPICKEY-FIXA]** (#242, trunk `77f2ed2`, squash; 3 files +114/−2; commit `4eb2320`). New `desktopTopicForWeakAreaKey`
  routes the Me weak-area row through the strong serving-side resolver (`getRuntimeTopicCandidates`) + 13 `topics.ts` aliases;
  the 13 in-bank spellings that fell to `/exam-trends` now resolve to Quick Practice. **Read-time only** — no `src/data`
  rewrite, no stored-record migration. Report: `report-topickey-fixA-me-resolver-2026-06-16.md`. CI GREEN.

### Resolved this PR
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] — ✅ RESOLVED by #242** (pending owner live-verify). The Light row (and the 12 sibling
  spellings) no longer hit the honest fallback — the Me hub resolution now camelCase-splits + alias-resolves via the strong
  resolver, and 13 explicit `topics.ts` aliases cover the failing normalized blobs. The earlier note that this was an en-dash
  "(in…)"-suffix problem was superseded by the audit: the en-dash variant actually resolved; the failing spellings were the
  PascalCase Science abbreviations (`Light`, `MagneticEffects`, …) + 2 `science_*` keys. Honest fallback PRESERVED for
  genuinely-unknown topics.

### New follow-up logged this PR (recorded — do NOT start until authorized)
- **[FU-TOPICKEY-CONSOLIDATION] (Fix B — owner-authorized-later, gated) — HELD.** Migrate every question's `topicKey` to the
  single canonical kebab slug from `topics.ts`, retire the ~58 variant spellings, and add a **CI guard** (in the root `scripts`
  matrix, NOT `scope:guard`) that fails if a non-canonical topicKey reappears. Touches gated `src/data/**` across ~60 files;
  stage Maths/Science as separate PRs. Permanent cure for the source fragmentation; Fix A already covers the live read-time
  symptom, so Fix B is not urgent. Exact key→key map + affected-file list + 3-part guard design = audit report §5.
- Related: **[FU-WEAKAREA-ALIAS-DISPLAY]** (same duplication class, display side) is partially mitigated by Fix A's resolver
  but its active-gaps COUNT path (`getWrongConceptsForTopic` keying) is separate — still open.

## 2026-06-16 — Post-PR #240 (MI polish batch — surface/ranking; merged + CI GREEN; owner live-verify 4/5)

### ✅ DONE — MI polish batch merged (4/5 live-verified)
- **[MI-POLISH-BATCH]** (#240, trunk `9eff0b0`, squash; 7 files +122/−79; one commit per sub-task). Five surface/ranking
  sub-tasks on the finished MI loop (NOT eval-gated): weak-area blended-severity ranking, per-row targeted practice CTAs,
  wrong-MCQ nudge, Practise→Practice UI copy, end-of-session scorecard + footer removal. CI GREEN. Report:
  `report-mi-polish-batch-2026-06-15.md`. Live-verify: sub-tasks 1–4 PASS; sub-task 5 not yet confirmable (trigger redesign).

### New follow-ups logged this PR (recorded — do NOT fix ad hoc)
- **[FU-WEAKAREA-EXAMTRENDS-FALLBACK] (confirmed live bug; topicKey-duplication symptom)** — the **Light – Reflection and
  Refraction** weak-area row on desktop Me routes to **Exam Trends instead of practice**. Root cause: its topicKey is a
  **non-canonical variant** (en-dash separator + a "(in…)" suffix) that does NOT resolve to a practice hub slug, so
  sub-task 2's targeted-practice routing correctly falls through to its **honest topic-hub/trends fallback**. The fallback is
  working as designed — the defect is upstream: the **topicKey is duplicated / non-canonical**. **To be traced in the
  upcoming read-only topicKey audit (queued item i)** — do NOT patch the alias/route ad hoc; the audit produces the
  systematic kill-list. Related to [FU-WEAKAREA-ALIAS-DISPLAY] (same duplication class, display side).
- **[FU-SPELLING-GATED-REMAINDER] (owner-authorized separate follow-up)** — ~60 rendered "Practise" strings remain under
  `lazytopper/src/data/**` (topicHubV2Full, topicHubContent, class10ContentConfig, class10ScienceTopicTrends,
  predictedQuestionsScience) + 1 in `lazytopper/src/lib/desktop/loginPrompts.ts`. #240 (sub-task 4) could NOT touch these —
  both are FORBIDDEN/GATED dirs. Finishing the global Practise→Practice replace needs an **owner-gated PR** scoped to those
  files. Until then "Practise" still appears in topic-hub study tips + the login prompt.

### Scorecard trigger — redesign queued (not a defect, a confirmability gap)
- **[FU-SESSION-SCORECARD-TRIGGER]** — the #240 scorecard renders on `allDone` (set fully attempted), which is hard to reach
  in live-verify and silent on partial sessions. Queued PR (ii) replaces it with an **explicit student-declared "Finish
  session"** action, honest on partial sessions (no implied completion). Makes sub-task 5 confirmable.

## 2026-06-15 — Post-PR #237 (MI Loop Stage 2 / Measure-leg PR 3 — MCQ honest capture; MEASURE LEG COMPLETE)

### ✅ DONE — MI Loop Stage 2 PR 3 merged (⏳ owner live-verify pending)
- **[MI-LOOP-S2-PR3] MCQ honest capture** (#237, trunk `b75f065`, squash of `9edf6fb`; 1 file +22/−36). `PracticeQuestionCard`
  MCQ clicks now route through `recordAttempt` (1/1 correct, 0/1 wrong, `mode:"mcq"`, same topic/questionId keying as graded
  answers) → MCQ feeds Saved attempts / Accuracy + a correct MCQ shrinks a weakness via the PR-2 loop-closer. Removed the
  hardcoded `conceptual:1` direct-`logMistakes` bypass (a bare MCQ click has no working to classify). **Owner-ruled wrong-MCQ
  treatment (a) attempt-only** — record the 0/1 attempt and nothing else (no mistake-log entry, no synthesized grade object, no
  typed category); option (b) untyped/objective `recordMistake` declined. One front door, no fabrication. CI GREEN. Report:
  `report-mi-loop-stage2-pr3-mcq-2026-06-15.md`. **The MI loop Measure leg is now complete** (graded + MCQ capture).

### Decision recorded — wrong-MCQ treatment
- **[DECISION-MCQ-WRONG] = (a) attempt-only** (owner-ruled). A wrong MCQ is an accuracy signal, not a typed-mistake signal;
  `recordMistake` expects a graded `CheckSolutionResponse` an MCQ lacks (synthesizing one = fabrication). "Marks lost" /
  mistake-mix / weak-areas stay sourced from real graded classifications. Closed.

## 2026-06-15 — Post-PR #235 (MI Loop Stage 2 / Measure-leg PR 2 — THE LOOP CLOSES)

### ✅ DONE — MI Loop Stage 2 PR 2 merged + owner live-verified (the loop is now bidirectional)
- **[MI-LOOP-S2-PR2] close the loop** (#235, trunk `59f9d18`, squash of `4c8936b`; 4 files +135/−2). A FULLY-correct
  `recordAttempt` decrements one active gap for the topic via `clearWrongAnswer` (live correct-attempt path; clamped at 0;
  wrong/partial never shrink), key-matched to the bridge's increment (identical `normalizeTopicKey(ctx.topicKey ?? ctx.topic)`;
  caught the G9 spaces→`_` vs `-` trap). Both Me surfaces show "active gaps remaining" (recoverable healing) alongside
  historical "marks lost" (the scar) — owner Option 1; did NOT repoint Me to `getWeakAreas`. Codespaces vitest **2/2 PASS** +
  `vite build` ✓ + verifier ✓ (Linux, mocked stores, no creds); CI GREEN. **Live-verified PASS:** active gaps → 0 on Real
  Numbers AND Polynomials; marks-lost held; wrong didn't shrink; clamp held; mobile parity. Report:
  `report-mi-loop-stage2-pr2-loopclose-2026-06-14.md`.

### New follow-ups logged this PR (recorded — do NOT fix ad hoc)
- **[FU-IMPROVEMENT-CARD] (blocks the improvement/journey card)** — the loop-closer's `clearWrongAnswer` **DELETES** the
  wrong-answer entry when its count hits zero, which **erases the improvement record** (you can no longer tell a topic was
  ever weak-then-cleared). Before building any improvement / journey / "you fixed N gaps" card on Me, the loop-closer must
  FIRST record a **durable "gap cleared" event** — cumulative + per-topic + timestamp — in the `practiceInsights` mirror
  (the existing localStorage + Firestore pattern; no `firestore.rules` edit). Accuracy/mistake **trends** are already
  derivable from existing attempt/log timestamps; this adds only the cleared-gap signal. Sequence: durable event FIRST,
  then the card.
- **[FU-WEAKAREA-ALIAS-DISPLAY] (display under-count, not wrong data)** — the active-gaps COUNT shown on Me under-shows for
  topics whose display label ≠ canonical slug (e.g. "Linear Equations" → `pair-of-linear-equations`) because the display
  lookup `normalizeTopicKey(label)` only resolves cleanly when the label slug-normalizes to the canonical (or the alias map
  covers it). Honest 0, never wrong data. The **data-layer decrement is unaffected** (it uses the bridge-identical key).
  Fix = extend the alias map coverage (gated `src/data/`) or resolve the row's canonical key from its hub slug.

## 2026-06-14 — Post-PR #233 (MI Loop Stage 2 / Measure-leg PR 1)

### ✅ DONE — MI Loop Stage 2 PR 1 merged + owner live-verified
- **[MI-LOOP-S2-PR1] `recordAttempt` front door** (#233, trunk `57fb7aa`, squash of `d8ee55c`; 4 files +199/−15). The dead
  `recordAttempt` (0 call sites) is now the real single attempt front door — score-twin of `recordMistake` (skip no-user/local;
  dedup; localStorage + existing Firestore mirror; **no `firestore.rules` edit**). Marks is the universal unit; `correct` derived.
  All 3 graded surfaces routed; attempts merge with mistake-log rows. **Live-verified PASS:** Saved attempts / Accuracy /
  Accuracy-by-subject / Recent populate from real graded attempts; merged into the **Polynomials** weak-area row; X/Y banner
  confirmed as the v1 session scorecard (no new UI). Report: `report-mi-loop-stage2-pr1-recordattempt-2026-06-14.md`.

### New follow-ups logged this PR (recorded — do NOT fix ad hoc)
- **[FU-ATTEMPT-MARKS-ACCURACY]** — the Me "Accuracy" / "Accuracy by subject" cards are still **binary** (full-marks = correct), so
  a graded 4/5 reads as one not-fully-correct attempt. Marks-weighted accuracy (∑marksScored / ∑marksAvailable) is the fuller
  expression of decision 1, but the card labels ("X correct of Y attempts") must change to a marks framing first. Fast-follow
  (decision 3 puts trend/analytics as fast-follow). The marks data is already persisted, so this is display-only.
- **[FU-ATTEMPT-SR]** — the OLD dead `recordAttempt` body fed `spacedRepetitionEngine` (`addWrongAnswerToSR`/`addConceptToSR`/
  `reviewConcept`); that side-effect was **intentionally dropped** when the front door was rebuilt (it was never live; activating a
  dormant subsystem is out of PR-1 scope). If live attempts should feed SR, that is its own decision.

### Next — MI Loop Stage 2 PR 2 (the loop-closer; do NOT start until this docs ritual is done)
A **correct** `recordAttempt` should decrement the topic/concept weakness via `clearWrongAnswer` (wire to the live attempt path,
NOT `recordSelfAssessment`'s dormant session subsystem; already clamped ≥0). Decisive live test: a logged weak area (Real Numbers
−7) **visibly shrinks** on Me after a clean correct drill.

## 2026-06-14 — Post-PR #231 (MI Loop Stage 1 / Act-leg)

### ✅ DONE — MI Loop Stage 1 merged + owner live-verified
- **[MI-LOOP-S1] Act-leg targeting** (#231, trunk `6d80a57`, squash of `09fa7f8`+`deaad2e`; 3 files +92/−15). Gap A (weak-topic
  targeting + honest generic fallback) + Gap B (auto-serve on targeted arrival) + Option B (one-click direct via
  `gotoPracticeForTopic`, gated `buildDesktopPracticePath` untouched, intent-first guardrail preserved). **Live-verified PASS:**
  one-click ready set (desktop + mobile); generic Practice stays open/unscoped; served set non-empty (Real Numbers, Polynomials);
  "Edit filters" works. Report: `report-mi-loop-stage1-targeting-2026-06-12.md`.

### New follow-ups surfaced during Stage-1 live testing (recorded — do NOT fix ad hoc; sequence per the MI-Loop spec)
- **[FU-DRILL-ROUTING]** — TopicHub "Run targeted drill" routes to the **worksheet generator** (`mistakeAwareHref` →
  `buildDesktopWorksheetPath`, `DesktopTopicHubPage` ~L2135) instead of a practice drill. **Label contradicts destination** —
  repoint to the auto-serving practice set (same one-click pattern as #231) or relabel.
- **[FU-WEAKAREA-LABEL]** — `PracticePage` shows **no weak-area framing** on a targeted arrival, so a scoped set still *looks*
  generic. Add an honest "Targeting your weak area: <topic>" banner on `?topic=`/`targeted=1` arrivals.
- **[FU-WEAKAREA-CTAS]** — only `weakAreas[0]` gets a "Practise" CTA (`DesktopMePage` ~L1431 gate); **secondary weak areas**
  (e.g. Polynomials) have none. Extend the targeted CTA to the top-N weak areas.
- **[FU-WEAKAREA-HUB-LIMIT]** — the practice-hub surfaces only the **top** weak area (`rows[0]`) vs Me's full list. Align the hub
  to show Me's weak-area set.
- **[FU-DRILL-ENRICHMENT]** — the targeted drill is **topic-level only**: the mistake-*category* never reaches
  `generatePracticeSet`, and concept-priority is gated on `adaptiveMix` (`difficulty === "All"`). This is **MI Loop Stage 3**
  (concept-level targeting), **eval-gated** — do after Stages 1–2 prove the loop + the eval set validates classification.

## 2026-06-14 — Post-PR #229 (grade-parse resilience)

### ✅ CLOSED
- **[FU-GRADE-PARSE] grade-parse resilience — CLOSED by #229** (trunk `59e11f6`, squash of `14ea860`; 1 file
  `server/routes/checkSolution.cjs`, +44/−5). Root cause: **Gemini JSON truncation** (`maxOutputTokens: 8000` cap → long
  multi-step grades cut mid-JSON → `extractJsonObjectFromText` returns null → "couldn't read the grading"). Fix (parse-resilience
  only, zero grading-semantics change): single bounded retry on parse-gate miss + `maxOutputTokens` 8000→16000 + failure-path
  diagnostics (`finishReason`/length/tail). **Owner live-verified PASS** — `sol_5.jpeg` grades reliably on both Quick Practice and
  Check & Improve. Report: `report-grade-parse-resilience-2026-06-12.md`.

### New follow-ups surfaced by the #229 live check (both eval-gated; downstream of grading QUALITY, not the parse path)
- **[FU-GRADE-MARKSCALE] (eval-gated)** — in **Check & Improve the marks are student-entered, not question-derived**, so the grader
  currently grades against a total the student typed. It should instead **judge the CBSE mark value** the answer is worth. Needs
  the eval set to validate any prompt/scoring change — do not hand-tune blind.
- **[FU-GRADE-CONSISTENCY] (eval-tuned)** — the **mistake-type classification varies across surfaces** for the same answer. Mostly
  **downstream of [FU-GRADE-MARKSCALE]** (different mark context → different typing) and tied to **[MI-EVAL]**; fold into the eval
  pass rather than patching ad hoc.

### Still active (unchanged)
- **[FU-ME-REFRESH]** — Me does not reflect a freshly-logged mistake / reconciled summary until a manual refresh (reconfirmed
  during the #229 live check). Add a refetch-on-focus / post-grade trigger. **[MI-EVAL]** classification quality — eval-pending.

## 2026-06-12 — Post-PR #227 (MI Consolidation P1+P2)

### ✅ DONE — MI P1+P2 merged + owner live-verified
- **[MI-P1P2] `recordMistake` front door + weak-area bridge + careless insight + server reconcile** (#227, trunk `c618cd5`,
  squash of `e3e3f18`; 8 files +531/−159). Quick-Practice "mistake not logged" bug FIXED. Owner live-verification: regression ✅,
  Quick-Practice logging ✅, bridge ✅ (Polynomials + Real Numbers in Weak Areas), server reconcile ✅, no double-log ✅.
  Report: `report-mi-consolidation-p1p2-2026-06-11.md`.

### New follow-ups surfaced by the MI live verification (both pre-existing / separate from MI logging)
- **[FU-GRADE-PARSE] grade-parse resilience → CLOSED by #229** (see the 2026-06-14 section above). Was an intermittent
  grade-parse failure on the Quick-Practice "check my answer" flow; root cause = Gemini JSON truncation; fixed with retry +
  raised token cap + diagnostics. Owner live-verified PASS.
- **[FU-ME-REFRESH] Me page auto-refresh lag** — after a graded mistake, the Me page does **not** reflect the new mistake / the
  reconciled `mistakeSummary` until a **manual refresh**. Add a refetch trigger (on focus, or after a grade completes) so Me
  updates without a reload. Surfaced specifically against verification point 4 (server reconcile is correct; Me display lags it).

### Eval-pending (named for the next workstream)
- **[MI-EVAL] classification quality** — the weak-area bridge routes by **Gemini's mistake-typing** (conceptual/calculation vs
  silly/presentation). The eval set validates this next; be ready to tune routing if it's noisy.

### Still open / deferred (named in the MI Architecture Map, NOT in #227)
- **[MI-MCQ] MCQ onto the front door** — `PracticeQuestionCard` still writes `logMistakes` directly with hardcoded `conceptual:1`
  (Map gap #5 / Phase 2). **[MI-TESTS-MOCKS]** chapter-tests + mocks onto `recordMistake` (Phase 3). **[MI-LAYER-MERGE]**
  reconcile the two analysis layers + durable Me convergence (Phase 4).
- **Topic-key resolution risk (watch):** the bridge depends on `normalizeTopicKey(display label)` resolving to the canonical slug
  the aggregator iterates. Verified live for Polynomials + Real Numbers; if a future topic's weak-area bump silently no-ops, it's
  an alias-map/`topicResolver` gap → fast-follow patch, not a revert.

## 2026-06-11 — Post-PR #224 + #225 (INFRA-4/PR1: Railway backend LIVE)

### ✅ DONE — backend deployed + live
- **[INFRA-4/PR1] Railway deploy + `vercel.json /api/*` rewrite** (#224 + #225, trunk `7c106b6`). `artifacts/api-server`
  (self-spawns the AI gateway) is **live on Railway**; owner-confirmed `stub:false`, Gemini direct-key. `/api/*` + `/shared-api/*`
  rewrites point at `https://lazytopper-production-production.up.railway.app`. Grading no longer dark in prod.

### ⛔ [TRACK-B-GATE] — now LIVE-TESTABLE; owner+cofounder run the round-trip to CLOSE
- The backend is live, so the grade→persist→mobile-Me→desktop-Me round-trip can finally be PROVEN. **Owner + cofounder run it on
  the live app** (sign in → grade a real answer → "Saved to your progress" → mobile Me real mix → desktop Me matches same uid;
  plus failed-grade → error). **Only that pass closes [TRACK-B-GATE] / ISSUE-009.** Runbook: `report-api-gateway-railway-2026-06-10.md` §7.

### Follow-ups surfaced by INFRA-4/PR1 (for PR2 "harden")
- **[INFRA-4-tsx] add `tsx`** — absent from all manifests; the solution-cache warmup spawns `node --import tsx/esm`. Inert in PR1
  (warmup is `DATABASE_URL`-gated and PR1 sets none); **PR2 must add `tsx` when it provisions Postgres** or warmup fails to spawn.
- **[INFRA-4-PR2] harden** — provision Postgres + `DATABASE_URL`; `ADMIN_FIREBASE_UIDS` (admin 503 without it); `SESSION_SECRET`
  (share feature 503 without it); rate-limiting; warm-pool decision (`WARM_POOL_TOP_UP_INTERVAL_MS` is `0` now). Confirm
  `CORS_ORIGIN` = the real app origin (default is a localhost dev value).
- **[INFRA-4b] claudeClient rewire** — Replit-proxy → direct Anthropic key; visuals-only, deferred to a later visuals PR.
- **[D42] root `packageManager` pin** — root `package.json` has none; the Dockerfile pins corepack `pnpm@10.32.1` as a workaround.
  Still worth a standalone hygiene PR so non-Docker tooling resolves pnpm 10 too.

## 2026-06-09 — Post-PR #222 (Track B: mobile Check & Improve — trust + persistence)

### MERGED in #222 (trunk `6c88ccf`) — superseded by the 2026-06-11 gate update above
- **[TRACK B] Mobile Check & Improve trust + persistence** (`fix/mobile-check-persistence`; 2 files
  `app/CheckImprove.tsx` + `app/Me.tsx`, +236/−32). Three coupled fixes, all mirroring desktop (not reinvented):
  1. **Trust guard fixed** — `!result.ok && result.error` → `!result || result.ok === false` (mirrors
     `DesktopCheckImprovePage.tsx:727`). A failed / empty-error grade now renders an ERROR, never a fake score.
  2. **Persistence wired** — `useAuth` + `buildMobileLogEntry` (1:1 copy of desktop `buildLogEntry`) → `logMistakes(uid, entry)`
     → SAME localStorage key + Firestore `learnerProfiles/{uid}/mistakeLogs`. Honest save indicator; only persists when signed in.
  3. **Mobile Me read** — `getMistakeLogs(uid, 30)` + desktop's `mistakeCounts` aggregation → real category mix
     (`{count} of {total} ({pct}%)`) when data exists; honest empty-state otherwise. Minimal read to close the loop (NOT convergence).
  Static gates green; build CI-gated. Report: `report-mobile-check-persistence-2026-06-08.md`.
  Step-5 (failed-grade → error) is preview-testable; steps 2–4 (successful grade → persist → Me) are NOT (gateway dark in prod).

### ⛔ VERIFICATION GATE — do NOT close Track B until the backend round-trip passes
- **[TRACK-B-GATE, blocks "done"] Track B persistence is code-complete + static-green but UNPROVEN end-to-end.** Grading
  (`/api/check-solution`) is dark in production until the Railway/api-server deploy (ISSUE-009 / INFRA-4), so a *successful*
  grade cannot be produced on the Vercel preview — meaning the grade→persist→mobile-Me→desktop-Me round-trip can't be proven
  yet. **As part of INFRA-4 go-live testing, run the real round-trip** (sign in → grade a real answer → confirm it appears as
  real data in mobile Me AND desktop Me on the same uid). Until that passes, Track B is "merged, not fully verified" — do not
  mark it fully done. (Alternatively verify locally against a running gateway: `npm run dev:gateway` + `API_SERVER_PORT=3001`.)

### RESP-DIV-1 — now honest AND wired (end-to-end pending backend)
- **[RESP-DIV-1] status:** mobile Me no longer fabricates (Track A #220) AND now *reads* real mistake data from the shared
  pipeline (Track B #222). The data only actually *flows* once grading is live (backend deploy). So: **honest + wired; real
  data appears end-to-end only post-Railway-deploy.** Closed on honesty; gated on backend for the live loop. Durable Me
  convergence (one responsive component, one pipeline) remains the last RESP-DIV-1-family item.

## 2026-06-09 — Post-PR #220 (Track A: mobile Me honesty) + full responsive-divergence audit

### RESOLVED (stopgap) in #220 — RESP-DIV-1 honesty-patched
- **[RESP-DIV-1] Mobile Me fabricated data → HONESTY-PATCHED (`fix/mobile-me-honesty`, trunk `8c478ce`).** Deleted the
  hardcoded `COMMON_MISTAKES` bars (−12/−8/−5 marks, rendered unconditionally) + the invented weak-topics count
  (`Science?"3":"2"` → honest `"—"`); replaced with branch-on-`user` honest empty-states using desktop Me's verbatim copy
  + an honesty footer. Grep proof: zero fabricated data remains. Gates green; build CI-gated. 1 file (`app/Me.tsx`), +48/−56.
  Report: `report-mobile-me-honesty-2026-06-08.md`. **CORRECTION to the original preview note:** the "Premium" badge is the
  REAL `useSubscription()` label (not fabricated); the actual fabrications were the mistake bars + weak-topics count, now gone.
  **STILL OPEN (coupled):** Track B (mobile Check persistence so real data flows) + the durable convergence — see below.

### The full responsive-divergence audit landed (READ-ONLY) — `report-responsive-divergence-audit-2026-06-08.md`
Mapped every `useIsDesktop()` split (trunk `ac2eedf`). Of 7 split surfaces: 2 MATCH-by-design (Home, Welcome), 2 MATCH by
construction (Exam Trends, Practice Hub), **5 DIVERGENT** (Me, chrome/avatar, Check & Improve, Topic Hub, Worksheets).
Severities normalized to the rubric (mobile-shows-less = functional, not trust-critical). **Phase-2 punch-list in fix order
(trust-critical first):**
1. ~~Mobile Me honesty (RESP-DIV-1)~~ **DONE (#220, stopgap).**
2. **[TRACK B, next] Mobile Check & Improve — trust + persistence.** (a) Fix the permissive failed-grade guard in
   `app/CheckImprove.tsx` (`!result.ok && result.error`) so a failed grade can never render as a valid score
   (trust-critical-potential — confirm whether the grader can return `ok:false` with empty `error`). (b) Wire `useAuth()` +
   `persistMistakeLog(user.uid, …)` so mobile grading actually SAVES — this is the data source mobile Me needs; until it
   lands, mobile Me's honest empty-state is the correct render. **Coupled with RESP-DIV-1 — this makes real data flow.**
3. **[RESP-DIV-2, functional-HIGH] Mobile has NO logout path** (escalated from "no dropdown"). The mobile avatar only
   navigates to `/me`; the mobile Me page has no logout; the only logout button lived in the now-retired `SettingsPage`
   (pre-existing gap, not a #218 regression). Add Log out + Manage subscription to the mobile chrome or Me page (mirror the
   desktop `DesktopShell` dropdown). A signed-in mobile student currently cannot sign out.
4. **[TOPIC-HUB, functional/content] Mobile Topic Hub reconcile.** `app/TopicHub.tsx` "Learn" routes to `/check-improve`
   (concept tutor still unwired); `pages/TopicHub.tsx` builds UNLABELLED synthetic fallback questions
   (`buildFallbackStepQuestion`/`buildFallbackCheckpoint`) recorded to a localStorage "Chapter Mastered" signal. Reconcile to
   the desktop reference+tutor model: wire mobile "Learn" to the tutor; label or drop generated questions; replace the local
   "mastery" claim with an honest progress indicator.
5. **[WORKSHEETS, functional] Mobile Worksheets parity.** Desktop has mistake-intelligence + multi-topic/full-subject +
   save/upload + the Science `stream` filter; `app/Worksheets.tsx` is single-topic-only and its `SCIENCE_TOPICS` is missing
   the `stream` field. Bring the desktop capabilities to mobile. (No fabrication — capability gap only.)
6. **[HOME, functional] Mobile Home real-insights gap.** Signed-in MobileHome never surfaces real mistake insights (honest
   empty-state by the firebase-free boundary). Surface real insights on mobile — requires resolving that boundary (explicit
   architecture decision). The signed-out "Sample" panel is correctly labelled (honest); no change there.
7. **[RESP-DIV-3, cosmetic] Mobile trial ribbon.** Static mobile pill + separate `TrialBanner` vs the desktop interactive
   color-coded pill. Reconcile last.

### DURABLE (post-stopgap) — converge mobile Me into desktop Me
The real cure for RESP-DIV-1 is convergence: fold `app/Me.tsx` into `DesktopMePage` as ONE responsive component sharing ONE
data pipeline (eliminating the parallel mobile page). Larger Phase-2 re-architecture; do AFTER Track B wires the data source.
Minor copy debt to fold in: the mobile worksheet CTA subtitle "targets your weak areas" overclaims the single-topic generator.

## 2026-06-09 — Post-PR #218 (SEVER: disconnect obsolete surfaces)

### NEW — Phase-2 RESPONSIVE DIVERGENCE punch-list (soft-launch blockers; pre-existing, NOT caused by the sever)
Found while verifying #218 on the Vercel preview. Governing principle for all three: **desktop is source-of-truth,
reconcile mobile to it, no invented numbers.** These are the seed of the Phase-2 responsive divergence punch-list
(the next workstream after the sever) — soft-launch blockers, but they did NOT block #218.
- **[RESP-DIV-1, TRUST-CRITICAL] Mobile Me fabricated data — ✅ HONESTY-PATCHED in #220** (see the Post-PR #220 section
  above; the data is now honest empty-states). The mobile `useIsDesktop()` variant had shown fabricated data to a real
  signed-in user (−12 / −8 / −5 marks + invented weak-topics; note the "Premium" badge was actually the REAL subscription
  label). Durable convergence + Track B (real data pipeline) remain open.
- **[RESP-DIV-2, soft-launch] Mobile avatar has no dropdown.** Desktop avatar opens a menu (Me/Progress + Manage
  subscription + Log out); the mobile avatar-initial only navigates to Me — so there is **no mobile path to Log out
  or Manage subscription.** Add the dropdown (or an equivalent mobile affordance). (Subset of RESP-DIV-3.)
- **[RESP-DIV-3, soft-launch] Mobile top-ribbon + avatar diverge from desktop.** Desktop top-bar (source-of-truth)
  has the "Trial active – N days left" pill + the avatar dropdown; mobile shows a different trial-banner treatment
  and a navigate-only avatar (no dropdown, no Log out / Manage subscription path). Reconcile the mobile top-bar to
  desktop. (Supersets RESP-DIV-2.)

### NEW — §7 SEVER RESIDUE (cleanup follow-ups; flagged in the sever report, not stranded silently)
- **[SEVER-RESIDUE-1] MockPaper newly unreachable, kept routed.** `/mock-paper/:slug`'s only entry was the deferred
  `/predictive-papers`; the page is kept routed (harmless — unreachable from live nav) and flagged. Recommend folding
  MockPaper into the `/predictive-papers` DEFERRED-REVIVE family in the "pending redesign into the chapter/full-test
  family" work. Not in the 17 rulings, so not unilaterally retired.
- **[SEVER-RESIDUE-2] Admin-lane `/dashboard` back-links.** `CacheStatsPage`, `FunnelPage`, `QuestionReportsPage`,
  `VisualAuditPage`, `TeacherDashboardPage` (+ a `/trends` quick-link in TeacherDashboard) still point at the removed
  `/dashboard`/`/trends`. Admin is a SEPARATE lane (explicitly out of sever scope); these degrade gracefully to `/`
  via the catch-all. Trivial back-target fixes for a future admin-lane cleanup.
- **[SEVER-RESIDUE-3] `pages/TopicHubHome.tsx`** — a pre-existing orphan (imported by nobody) that links to the
  retired `/trends`. Not in the 17 rulings; left unmarked. Clean-branch candidate.
- **[SEVER-RESIDUE-4] Dead utility exports** `buildTrendsUrl` / `buildStudyPlanUrl` in `utils/buildUrl.ts` now have
  ZERO callers (the last `buildStudyPlanUrl` caller was the removed MockBuilder branch). Harmless; clean-branch removal.
- **[CLEAN-BRANCH, Phase-2] Marker pass.** 46 disconnected files carry `LEGACY-RETIRED` (43) / `DEFERRED-REVIVE` (3)
  markers. A later clean-branch greps these to delete (retired) / keep (deferred). MockBuilder lines 191/197 also
  carry dead `navState.back.includes("/study-plan")` GUARD checks (not navigations) — harmless, left in place.

### Tooling note
The before/after connectivity-graph merge gate is a reusable tool (`connectivity-graph.mjs` + `connectivity-diff.mjs`
+ `apply-markers.mjs`, in the diff folder). Static React tracing is approximate; two tool bugs were found and fixed
during #218 (route-path declarations miscounted as nav edges; zero-static wildcard matches). Reuse for the next sever
or the Phase-2 clean-branch verification.

## 2026-06-09 — Post-PR #216 (banned-term prose copy-fix) + audit follow-ups

### RESOLVED in #216
- **[BANNED-PROSE-1A]** 3 Tier-1A out-of-syllabus strings removed from the live cockpit (`topics.ts:35` division
  algorithm, `:45` cross-multiplication, `topicHubContent.ts:249` complementary-angles row). Guard can't catch
  these (surface scan omits bare generics). Authority: `report-banned-term-prose-audit-2026-06-08.md` §1A.

### DEFERRED — banned-prose Tier-1B (MOOTED by the upcoming SEVER PR — do not fix standalone)
- **[BANNED-PROSE-1B]** `pages/NightBeforePage.tsx:7` ("Euclid's Division Lemma: a = bq + r" formula) and
  `data/class10ContentConfig.ts:479` (complementary-angles clause, surfaced via `/revision-calendar` +
  orphaned `TopicHubHome`). Both routes are Bucket-B/C in the surface audit — the **sever PR disconnects them**,
  which moots these. **Re-grep after the sever lands; fix only if `/night-before` or `/revision-calendar` is kept.**

### CONTENT-SPRINT punch-list — "clean banned prose during the content sprint" (Tier-2)
Not live today; clean as the content/TopicHub work builds. From `report-banned-term-prose-audit-2026-06-08.md` §2:
- **Periodic Classification practice pack** — `data/promptDPracticePacks.ts:341–~430` (`"periodic_classification"`,
  Mendeleev/Newlands/Döbereiner). **Unreachable now** (no Periodic Classification topic in the live `topics.ts`
  catalog), so the live practice flow never requests it — but it must be cleaned/retired when the Science pack
  set is finalized.
- **Teach contracts** — `tutor/topicTeachContracts.ts:89,93` ("division algorithm" taught). **Imported by nobody**
  (unwired); fix when wiring the TopicHub teach-flow.
- **TopicHub V2 enrichment** — `data/topicHubV2Enrichment.ts:1410,1417` (complementary angles),
  `data/topicHubV2Full.ts:1217` (conversion of solids). Unbuilt TopicHub V2 content.
- **Prediction archetypes** — `prediction/cbseHistoricalArchetypes.ts` (Sources of Energy / natural selection /
  speciation / homologous organ / frustum), `prediction/cbse5SignalScoring.ts:84`, `tutor/diagram/diagramTemplates.ts:536`,
  `data/visualConceptRegistry.ts:158`. **⚠️ HANDLE WITH CARE — these label REAL past papers** (historical truth
  used by the prediction engine); revise the labels without corrupting the past-paper record.
- **Dead-subgraph content** — `data/topicHubContent.ts:29` (cross-multiplication) feeds only the dead `/daily-mix`;
  moot if daily-mix is severed.

### NEXT WORKSTREAM
- **SEVER PR (next, owner sends instruction)** — turn the surface-audit owner-ruling queue (Bucket B confirmed-dead
  + Bucket C rulings) into the kill-list; disconnect mobile `/`/catch-all/command-palette dead-links; touches
  `App.tsx` (forbidden — owner authorizes). Then go-live / Phase 1.

## 2026-06-08 — Post-PR #214 (auth migration PR-4: phone/SMS-OTP — ARC 4/4 COMPLETE)

### RESOLVED in PR-4
- **[AUTH-PR4]** Phone / SMS-OTP shipped: `signInWithPhoneNumber` + invisible reCAPTCHA, 2-step in-pane Phone tab.
  Verified in production-preview with a real-number login (real SMS/OTP, signed in, trial tied to the phone
  account). Root-caused + fixed the reCAPTCHA re-render bug (teardown+rebuild in the same container threw
  "already rendered"; fix = one verifier, render once, **reuse** for send+resend, `.clear()` only on
  logout/unmount/verify-success). **The auth migration arc (PR-1 #206 → PR-2 #208 → PR-3 #210 → scrub #212 →
  PR-4 #214) is CLOSED — Firebase-only end to end.**

### NEW follow-ups (not launch blockers)
- **[SMS-DELIVERABILITY, pre-launch, MEDIUM]** Firebase's default SMS sender lands in **Android spam/junk**, so
  phone-OTP students may never see the code (hit in the #214 real-number test — first OTP was in junk). Durable
  fix needs a **DLT-registered sender header (TRAI/India regulatory regime)**, which likely means routing OTP
  through a **custom SMS provider on the Identity Platform tier** — **verify the exact Firebase mechanism when
  tackling, do not assume**; DLT registration has **operator lead-time, so start early** if phone-OTP becomes
  important. **Priority MEDIUM — not a launch blocker** (Google sign-in is the primary path; phone is the fallback).
- **[OTP-SPAM-HINT, small PR, LOW]** Add a **"check your spam/junk folder"** line on the OTP-sent screen as a
  cheap interim mitigation for the above. Separate small PR (`Login.tsx` only), not now.
- **[D42]** `packageManager` pin — **already tracked below** (HIGH-VALUE, separate hygiene PR); still open.

### Owner / deploy actions pending (carried — next workstream is go-live / Phase 1)
- **[AUTH-ADMIN, BLOCKING]** Bootstrap `ADMIN_FIREBASE_UIDS` (sign in once via Firebase → capture uid → set env)
  — the ONLY way admin routes authorize now (no Clerk fallback).
- **[AUTH-DEPLOY]** `artifacts/api-server` needs `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) in Railway; add the prod domain to Firebase Authorized domains. (Vercel frontend `VITE_FIREBASE_*` now set
  all-scopes — confirmed in #214.)

## 2026-06-08 — Post-PR #210 (auth migration PR-3: Clerk teardown — Firebase-only)

### RESOLVED in PR-3
- **[AUTH-PR3]** Clerk teardown complete: gateway bridge + `clerkProxyMiddleware` deleted; `requireFirebaseAuth`
  Firebase-only; `clerkMiddleware()` unmounted; `@clerk/express` + `http-proxy-middleware` + `jsonwebtoken`/`jwks-rsa`
  dropped (last two transitive under firebase-admin). Zero Clerk in tracked code/config; lockfile `@clerk` = 0.

### NEXT — IN ORDER, both HOLD for owner go, neither auto-merges
- **[CLAUDE-SCRUB, NEXT]** CLAUDE.md governance scrub — §1 stack + §5 doctrine ("Clerk stays for now — K2H-15" is
  now obsolete) + `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md` Clerk notes. Owner has the exact surgical
  instruction. Governance file → owner-reviewed PR, NOT docs-only auto-merge.
- **[AUTH-PR4]** Phone / SMS-OTP (`feat/auth-phone-otp`): fill the phone façade with `signInWithPhoneNumber` +
  reCAPTCHA v2 invisible; wire the Phone tab; live OTP smoke test.

### NOW LOAD-BEARING (no Clerk fallback after PR-3)
- **[AUTH-ADMIN, BLOCKING]** Set `ADMIN_FIREBASE_UIDS` = your Firebase uid — the ONLY way admin routes authorize
  now (else 503 in prod / dev-skip locally).
- **[AUTH-DEPLOY]** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) in Railway — `requireFirebaseAuth` returns 503 without it.
- **[AUTH-DOMAINS]** Add the prod Vercel domain to `lazzyy-topper` Authorized domains (`signInWithPopup`); do a real
  Google-popup sign-in check. Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + local `.env.local`.
- **[ONE-TAP]** Google GIS One-Tap once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided (PR-2 = popup-only).

## 2026-06-08 — Post-PR #208 (auth migration PR-2: frontend on Firebase Auth)

### RESOLVED in PR-2
- **[AUTH-PR2-ADMIN]** Admin allowlist **renamed in code** `ADMIN_CLERK_UIDS → ADMIN_FIREBASE_UIDS` + comment
  updated. *Owner action still pending:* the **value bootstrap** (sign in once via Firebase → capture uid → set
  `ADMIN_FIREBASE_UIDS`); until set, admin routes 503 in prod / dev-skip locally.

### MUST-CARRY into PR-3 (the Clerk teardown) — do NOT lose
- **[AUTH-PR3]** PR-3 (`fix/remove-clerk-bridge`, **HOLD for owner go**): remove the api-server Clerk **fallback**
  branch from `requireFirebaseAuth` (Firebase-only) **and** `@clerk/express` together; unmount `clerkMiddleware()`;
  remove `clerkProxyMiddleware`; delete the gateway bridge (`/api/auth/firebase-token` route + `firebaseAuth.cjs` +
  its `server/index.cjs` wiring); drop `jsonwebtoken`/`jwks-rsa` (gateway); remove Clerk env (`CLERK_SECRET_KEY`,
  `CLERK_JWKS_URI`, `CLERK_ISSUER`, `VITE_CLERK_*`). Two package.json changes → lockfile regen in Codespaces.

### Owner / deploy actions pending (not code)
- **[AUTH-DOMAINS]** Add the prod Vercel domain to the `lazzyy-topper` Firebase **Authorized domains** so
  `signInWithPopup` works in prod (localhost already allowed). Also do a real Google-popup sign-in check (couldn't
  be headless-automated; email/password + getToken were runtime-verified Firebase in the Codespace).
- **[AUTH-DEPLOY, INFRA-4]** `artifacts/api-server` requires `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) in Railway.
- **[ONE-TAP follow-up]** Add Google GIS **One-Tap** (floating auto-prompt) once a Web OAuth client ID
  (`VITE_GOOGLE_CLIENT_ID`) is provided — small PR; PR-2 shipped popup-only.

### NEW backlog — own small gated PR (NOT a docs change)
- **[D47, NEW]** Add an `apiServer` lane to `lazytopper/docs/project_memory/governance/repo_boundary_policy.json`
  (e.g. `artifacts/api-server/`) so `artifacts/api-server`-only PRs get a real `scope:guard` PASS instead of
  `[unclassified]`. This is a policy/config change — keep it OUT of docs-only auto-merge PRs; ship as its own
  small gated PR. (Same coverage-gap family as the `artifacts/**` deletes noted under D41 for de-Replit.)

## 2026-06-07 — Post-PR #204 (de-Replit COMPLETE; infra arc closed)

### RESOLVED — D40 (de-Replit PR-B) + D26-arc Replit removal
PR-B merged as **#204** (`5441060`): `@replit/*` packages + `@replit/connectors-sdk` + the 3 non-product
stubs removed atomically with the lockfile regen. Repo is fully `@replit`-free. De-Replit is COMPLETE
(PR-A #199 + PR-B #204). The only Replit-adjacent work left is INFRA-4b (runtime AI-proxy rewiring), tracked
under NEXT_ACTION / the backend deploy — NOT scaffold cleanup.

### STILL OPEN — carry these forward (do NOT lose)
- **[D42, HIGH-VALUE]** add `"packageManager": "pnpm@10.32.1"` to root `package.json` so Corepack enforces ONE
  pnpm everywhere (root cause of the version churn). Small separate PR. Coupled with D43.
- **[D43]** root `preinstall` guard trips on pnpm 11's empty `npm_config_user_agent` on linux — fix before any
  pnpm 11 move.
- **[D44]** ops audits assume `rg` (ripgrep) with no fallback (CI installs it; off-runner they're fragile).
- **[D45]** `feature_file_matrix.mjs` hardcodes owner-local Windows Desktop paths (not CI-portable).
- **[D46, NEW]** `actions/setup-node@v4` uses Node 20 (deprecation track) — bump when convenient.
- **[D31]** `syllabusGuard` generic-phrase blind-spot (polynomials division-algorithm leak) — content debt.
- **Domain** `lazytopper.in` (owner-confirmed) vs the earlier `.app` references — reconcile remaining `.app`
  mentions before the deploy; verify DNS in Vercel before INFRA-4.

## 2026-06-07 — Post-PR #198 (CI activated)

### RESOLVED — D39 (CI relocation + expansion)
CI is now LIVE: `.github/workflows/quality-gate.yml` at the repo root gates the full bar (pnpm frozen
install → root matrix 175/175 → mojibake → linux build → ops matrix) on every PR into trunk + push to it.
Old mislocated `lazytopper/.github/workflows/mojibake-guardrail.yml` deleted. Proven to run AND gate
(probe PR #202 → red on a planted mojibake). Closed by #198 (`9d772cb`).

### UPDATE — D40 (de-Replit PR-B) now UNBLOCKED
PR-B was blocked behind "the #198 lockfile regen". That regen landed as **#201**, and #198's CI proves a
clean `pnpm install --frozen-lockfile` on linux. PR-B is now doable — regen the lockfile in the same linux/
Codespace path #201 used, on **pnpm 10.32.1** (match what CI pins, NOT pnpm 11), and let CI verify. Scope
unchanged (see the #199 section below).

### OPEN — add a `packageManager` pin to root package.json (HIGH-VALUE) [D42]
Root `package.json` declares no `packageManager` field, so different environments resolve different pnpm
versions — the root cause of the #198 pnpm-version churn (Codespace regen used 10.32.1; corepack default
was 11.0.8; pnpm 9/11 mis-handle the lockfile/preinstall guard). Adding `"packageManager": "pnpm@10.32.1"`
makes Corepack enforce ONE version everywhere (CI, Codespace, local). Touches `package.json` (product lane)
→ separate PR. Until then, CI explicitly pins `corepack prepare pnpm@10.32.1`.

### OPEN — root `preinstall` guard is incompatible with pnpm 11 on linux [D43]
The guard `case "$npm_config_user_agent" in pnpm/*)` exits 1 under pnpm 11 on the linux runner because pnpm
11 leaves `npm_config_user_agent` EMPTY for the workspace-root lifecycle script (verified: pnpm 10.32.1 sets
it correctly; pnpm 11 does on Windows-standalone but not linux-workspace-root). Fix the guard (e.g. also
accept an empty agent, or detect pnpm another way) BEFORE any move to pnpm 11. Coupled with D42.

### OPEN — ops acceptance scripts depend on `rg` with no fallback [D44]
`bsre_spike` / `trig_legacy_retire` / `llm_path_audit` / `prediction_bank_health` shell out to `rg` (ripgrep)
and treat "binary missing" identically to "no match" (`(res.status ?? 1) === 1 → []`), silently passing or
failing depending on the check's polarity. CI now installs ripgrep so this is masked, but a node/git-grep
fallback (or an explicit "rg required" assertion) would make them robust off the runner. Low priority.

### OPEN — `feature_file_matrix.mjs` hardcodes absolute Windows Desktop paths [D45]
Lines 11-13 reference `c:\Users\Chetan\OneDrive\Desktop\…\*.docx` — an owner-local `.docx` analysis tool
(`test:feature:file-matrix`) that can only run on the owner's machine; NOT in the CI matrix. If it should
ever be portable/CI-able, make it skip-if-missing or relocate the inputs into the repo. Not blocking.

### OPEN — bump `actions/setup-node@v4` (Node-20 deprecation annotation) [D46]
The CI workflow emits a non-fatal annotation: Node-20 actions are deprecated (forced to Node 24 on
2026-06-16). Bump the action when convenient; not urgent (still runs).

## 2026-06-06 — Post-PR #199 (de-Replit PR-A)

### OPEN — de-Replit PR-B (lockfile-coupled removals) — BLOCKED behind the #198 lockfile regen [D40]
PR-A (#199) removed the lockfile-SAFE Replit scaffold + the dead `lazytopper-app/src` stub. The remainder is
lockfile-coupled and cannot land until the `pnpm-lock.yaml` regen (the #198 blocker) happens in the
linux/Replit env on pnpm 11.x — every item below changes a lockfile input and breaks `pnpm install
--frozen-lockfile` (already red on trunk vs `lazytopper/package.json`; confirmed live during PR-A). PR-B scope:
1. Delete whole workspace packages (all lockfile importers): `artifacts/lazytopper-video/`,
   `artifacts/mockup-sandbox/`, `artifacts/lazytopper-mobile/` (owner-confirmed non-product Expo native path).
2. Remove `@replit/vite-plugin-*` packages + edit the 3 stub `vite.config.ts` (drop `runtimeErrorOverlay()`
   import/call + the gated cartographer/dev-banner dynamic imports) + drop the 3 `catalog:` entries.
3. `pnpm-workspace.yaml` allowlist cleanup: `stripe-replit-sync` line + `@replit/*` in `minimumReleaseAgeExclude`.
4. Remove the now-orphaned root dep `@replit/connectors-sdk` (its only consumer, `backup-to-drive.mjs`, was
   deleted in PR-A).
5. Reconcile the root `typecheck` (`--filter "./artifacts/**"` still globs the src-less lazytopper-app).
KEEP `artifacts/api-server/` (owner-confirmed real backend). The server Replit AI proxy (Gemini fallback +
the entire Claude path) is a SEPARATE migration (API keys + backend deploy), NOT part of PR-B. Sequencing:
do the #198 lockfile regen first, then PR-B atomic (configs + manifests + lockfile in one).

### OPEN — scope:guard has no lane for infra / `artifacts/**` deletes (coverage gap) [D41]
PR-A's deletes (root scaffold, `artifacts/lazytopper-app/src/**`) all classified `[unclassified]` →
`SCOPE_GUARD_FAIL`, because the boundary policy lanes (`repo_boundary_policy.json`) are anchored to the
`lazytopper/` frame and model no root-level or `artifacts/**` paths. Not a breach (manually verified), but it
means infra/scaffold PRs can't be guard-validated. Follow-up: add an `infra`/`artifacts` lane (or an explicit
`infra` mode) so de-Replit PR-B (and similar) get real classification rather than a blanket FAIL. Governance
JSON deliberately left untouched in PR-A (separate decision).

## 2026-06-06 — Post-PR #196 (3 pre-existing test reds resolved)

### OPEN — CI relocation + EXPANSION (mojibake guardrail mislocated → never runs; activate + gate everything) [D39]
**Finding (corrected twice).** A mojibake guardrail workflow FILE exists at
`lazytopper/.github/workflows/mojibake-guardrail.yml`, but GitHub Actions only runs workflows at the
**repo-root** `.github/workflows/` — this one is in a SUBDIRECTORY, so it has **never executed**
(`gh workflow list --all` and `gh run list` are BOTH empty: zero workflows registered, zero runs ever). It
is dormant. AND even if relocated it ran `npm run check:mojibake` — the 50-capped checker the local gate
also used (now un-capped in #196). So the corruption shipped for TWO independent reasons: CI mislocated
(never runs) + checker blind (cap). The full **test matrix + scope-guard are also not CI-gated** at all.
**This is the right outcome corrected:** the earlier "no CI exists" note was effectively right in OUTCOME,
just because the file is mislocated rather than absent.
**Tracked as its own PR (do NOT slip into a product PR) — relocating activates whole-repo CI gating for the
first time ever, a deliberate infra change with side effects.** That PR should:
1. **First verify the uncapped checker passes clean across ALL of trunk** (it now scans everything for the
   first time — might surface latent corruption anywhere in the repo, not just the two fixed files).
2. **Decide the trigger scope** — the current `on: push: {}` + `pull_request: {}` has no branch filter;
   choose PRs-to-trunk vs all pushes deliberately.
3. **EXPAND, don't just relocate** — since CI is being turned on anyway, gate the full **`test:matrix:all`
   + `scope:guard`** (not only mojibake). Gate everything that matters in one workflow.
Owner-directed scope (2026-06-06).

### RESOLVED — pre-existing test reds fixed (#196) [D38]
The three suites tracked below as D38 are FIXED and GREEN: `test:mojibake` 1/3→3/3 (re-encoded
`circles.proof.ts` + the second corrupted file `maths.caseBased.ts` the diagnosis missed; checker cap
removed so neither stays hidden), `test:prediction:bank-health` 2/4→4/4 (stale → retirement guard + orphan
dead-compute deleted), `test:canonical:generator` 2/4→4/4 (re-pointed to the relocated
`practiceQuestionBuilder.ts`). See CURRENT_STATE / SESSION_LOG (#196) and the residual CI gap in **D39**.

## 2026-06-05 — Post-PR #194 (HPQ Phase 1 — consistency + honesty)

### OPEN — HPQ PHASE 2: content authoring (HIGH; gated `src/data/`, PYQ-sourced, owner-validated) [D36]
Phase 1 (#194) RE-BADGED only — it did NOT add/rebalance content. Phase 2 is the tracked next HPQ task.
Author from real PYQ sources, owner-validated; gated `src/data/` lane (`scope:guard --mode product` + owner
auth). Worklist (from `report-hpq-refinement-audit-2026-06-05.md` §1b/§4/§6 P1+P4):
1. **Missing every-year 5-mk Section-D Long-Answer marquee shapes** — the deepest "same story" gap (Maths
   has effectively ZERO valid 5-mk LA HPQs): Trig Heights & Distances 5-mk LA; Surface Areas
   combination-of-solids 5-mk LA; Statistics grouped-median 5-mk LA; Triangles similarity/BPT proof
   (Section D); Acids/Bases 5-mk LA; Chemical Reactions 3-mk displacement SA.
2. **Distribution re-weight toward must-crack** — lift Circles (2) + Heredity (4) to adequate; trim/re-tier
   the over-stacked sets (Pair of Linear 8, AP 6, Metals 12) so volume over-indexes must-crack and tapers.
3. **`rn-hpq-4` Section-D/4-mark mislabel** — Section D = 5-mk LA in CBSE; the only Maths "Section D" item
   is tagged 4 marks (why Maths reads as zero valid 5-mk LA). Fix label/marks/steps.
4. **Backfill 49 competency `solutionSteps`** — the `*-comp-*` entries carry answer+explanation but no
   step-marked working; bring to §13 CBSE step-marking minimums per section.

### OPEN — HPQ confidence model reconciliation (DEFERRED until a confidence UI is designed) [D37]
P2 (#194) RETIRED the dead `deriveHPQConfidence` call (page shows no confidence UI) but KEPT
`prediction/hpqConfidence.ts` + the optional `confidenceScore?/Band?/Rationale?` type fields. The model is
a format/recency-driven 5-signal score with NO blueprint-weight / tier input, so its bands can contradict
the locked tiers (audit §2: Quadratic/Real-Numbers high-roi out-score must-crack Circles/Polynomials at
0% high). BEFORE any confidence badge ships, re-base `compute5SignalScore` on the Exam-Trends axes
(blueprint-weight + 4-year frequency + §4 sub-pattern recurrence) so a band can never contradict a tier.
Do NOT surface any confidence UI until reconciled. No code wired today, so this is latent, not live.

### NOTE — pre-existing test reds surfaced while validating #194 (unrelated; not introduced) [D38] → RESOLVED in #196
While running the HPQ gates, three acceptance suites were already RED on base (verified absent-on-base /
not in the #194 diff), tracked so they aren't mistaken for HPQ regressions: `test:prediction:bank-health`
2/4 (`HighlyProbableQuestions.tsx` never imported `../prediction/bankHealth` / `buildTopicKeySources` — the
test expects a bank-health summary the page doesn't compute); `test:canonical:generator` 2/4 (PracticePage
unified-generator import/fallback checks); `test:mojibake` 1/3 (mojibake in
`src/data/questionBanks/class10/maths/circles.proof.ts`). **RESOLVED in #196** — see the dated
"Post-PR #196" RESOLVED [D38] entry at the top of this file (mojibake was actually TWO files; the residual
CI-gating gap is now tracked as [D39]).

### RESOLVED — scopeGuard monorepo path-prefix bug FIXED (#192) [D32]
The monorepo path-frame bug (see the #190 block below, "scopeGuard broken by the monorepo move") is FIXED.
Root cause: `.git` at repo root + guard run from `lazytopper/` → `git diff` emits `lazytopper/src/...`
while policy rules are lazytopper-relative (`src/`) → every product edit `[unclassified]` → FAIL.
**Fix (Option A, owner-approved):** `lazytopper/scripts/scopeGuard.mjs` (1 file, +52/−6; policy JSON
untouched) — `detectAnchorPrefix()` derives `lazytopper/` from `git rev-parse --show-toplevel` vs cwd;
`toPolicyFrame()` strips it for in-anchor files (so they match `src/`-style rules) while files OUTSIDE the
anchor keep their full git-root path and are STILL classified (real lane, or `unknown` → visible FAIL);
no-blind-spot invariant (fails if classified-count ≠ changed-count); coupled `git show HEAD:./package.json`
(cwd-relative) fix for the scripts-only package.json check.
**⚠️ The `--relative` suggestion was REJECTED:** `git diff --relative` emits only files under cwd → silently
drops tracked changes OUTSIDE `lazytopper/` = a false-PASS blind spot (worse than a false-FAIL). The correct
fix normalizes the classification *frame*, never narrows what the guard sees. Proven FAIL→OK on a product
edit; tracked out-of-tree file still seen+flagged; unclassified → visible FAIL. Gates: tsc 0;
`test:matrix:all` 175/175; build 0; verifier PASS. Trunk `318c6b6`. Follow-ups: D33–D35 below.

### OPEN — scopeGuard: untracked files OUTSIDE `lazytopper/` are invisible (LOW; pre-existing) [D33]
`git diff` (tracked changes) spans the whole repo, so the #192 fix DOES see tracked out-of-tree changes
(exactly the thing `--relative` would have hidden — confirmed in the PR's no-blind-spot proof). BUT
`git ls-files --others --exclude-standard` is **cwd-scoped** by git's design, so **untracked** files
outside `lazytopper/` (e.g. a new file dropped at the repo root) are NOT listed and so not classified.
**Deliberately NOT widened to git-root scope in #192**, because the repo carries an untracked root-level
`.claude/` directory with no policy lane → widening (`git -C <root> ls-files …`) would classify it
`unknown` → a NEW false-FAIL on every run. Trading one false-FAIL for another is not a fix. Revisit only if
root-level untracked lanes are formalized (e.g. add `.claude/` to `localOnly`, THEN widen the ls-files scope).

### OPEN — add scopeGuard unit coverage to the test matrix (LOW; tooling) [D34]
`scopeGuard.mjs` has no automated test in `cd scripts && npm run test:matrix:all` (175/175). It runs
`main()` on import, so a unit test needs an export refactor (guard `main()` behind an `if (import.meta.url
=== ...)` entry check, then export `detectAnchorPrefix`/`toPolicyFrame`/`classifyFile` for testing). #192
relied on live FAIL→OK evidence instead. Add coverage in a future tracked-tooling PR to regression-proof
the path-frame logic.

### OPEN — CLAUDE.md §6 references a stale verifier name (LOW; docs) [D35]
CLAUDE.md §6 validation steps list `node scripts/verify-build.mjs`, which does not exist. The real verifier
is `lazytopper/scripts/verify-production-build.mjs` (used and PASS in #192). Correct CLAUDE.md §6 (and any
agent instructions) to the actual filename so future sessions don't chase a missing gate. (Same gap noted
in the #174/#175/#176 backlog — consolidate.)

## 2026-06-05 — Post-PR #190 (Exam Trends band redesign — 3 collapsible priority bands)

### RESOLVED (by #192 — see Post-PR #192 block above, D32) — scopeGuard broken by the monorepo move
The repo is now a pnpm monorepo (`workspace`) with `.git` at the repo root and `lazytopper/` nested.
`lazytopper/scripts/scopeGuard.mjs` runs `git diff --name-only` (no `--relative`), so git emits
`lazytopper/src/...` while the `product` lane rule in `repo_boundary_policy.json` is `src/`. Result:
EVERY `lazytopper/src/**` product edit is classified `[unclassified]` and the guard FAILs — it currently
green-lights nothing and reds everything in `lazytopper/src`, so it is not a real gate. Observed on #188
and again on #190; both manually verified as non-breaches. ~~Fix (tracked-tooling PR): either pass
`--relative` to the git invocations in `scopeGuard.mjs`, or prefix the policy `product`/`trackedTooling`
lane rules with `lazytopper/`.~~ **FIXED in #192 via path-frame normalization (Option A); the `--relative`
half of this suggestion was REJECTED as a false-PASS blind spot.**

### RESOLVED — re-derive Exam Trends priorities FRESH (was D27) → owner-locked tiers
~~Topic-level priority data stale/untraceable; re-derive tier/trend/marks before the band redesign.~~
DONE: the owner-signed-off `LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md` (composite model +
2 teacher overrides) is the fresh, traceable basis. Consumed by #190. D27 CLOSED.

### RESOLVED — Exam Trends band-threshold definition → not a computed threshold
~~The band redesign needs explicit numeric/qualitative thresholds mapping tier/trend/marks to a band.~~
RESOLVED by design: bands are owner-signed-off DATA (the locked doc), transcribed verbatim and keyed by
slug — there is NO computed threshold, and nothing is banded on stale data. Closed by #190.

### CARRIED — HPQ-count recheck (MEDIUM)
#190 kept the existing honest HPQ matching (`getHighlyProbableQuestions`, canonical-name match) unchanged;
the locked tiers doc did not alter HPQ data. Counts were not separately re-validated against the new
tiering — still open as a small data-quality recheck. Bundle with any future Exam Trends data pass.

### CARRIED — Exam Trends band screenshots (LOW; PR evidence)
The 360/768/desktop × Maths/Science band-state screenshots specified by the task were deferred (owner
declined for now). Capture on request to complete the #190 evidence packet.

### OPEN — Exam Trends proof tag (LOW; product decision) — carried
The locked prototype's optional "⟨proofs⟩" tag is still omitted (no real `proof` field; inventing it =
fabrication). To add it: add a real `proof` flag to topic data (gated `src/lib/desktop/` lane → explicit
scope) or drop it from the spec.

## 2026-06-04 — Post-PR #188 (content sweep merged; gating syllabusGuard GREEN)

### OPEN — syllabusGuard generic-phrase blind-spot + polynomials teach-contract leak (MEDIUM; follow-up) [D31]
The board-prep surface scan omits bare generics (e.g. "Division Algorithm") to stay false-positive-free,
so out-of-scope content named only by a generic term is not flagged. Concrete leak left untouched by the
#188 sweep (out of the 93-item worklist): the `polynomials` tutor contract in
`src/tutor/topicTeachContracts.ts` (~:79/:87/:91) still teaches the polynomial **division algorithm**
(out of the QUADRATIC-only Polynomials scope for 2026-27). Follow-up: (a) add a precise phrase like
"division algorithm for polynomials"/"polynomial long division" to `SURFACE_BANNED_PHRASES` (carefully,
no over-match), then (b) sweep the polynomials contract. See DISCOVERIES D31.

### RESOLVED — CONTENT SWEEP: the 93-item worklist (DONE #188) [D26/D28 → CLOSED]
~~The CONTENT cleanup remains — the gating guard is RED on a 93-item worklist.~~ **DONE in #188.**
Deleted/rewrote all 93 items: banks Conversion of Solids ×46 (canonical 6520→6474, spreads intact);
surfaces EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/competency/config/trends/topics/
topicHubContent + the tutor contracts. DELETE-not-retag; blurbs/contracts rewritten syllabus-accurate;
marked in-syllabus teach-steps where the `keyIdeas` 4-tuple required them. Gating `syllabusGuard` exits
0, `test:matrix:all` 175/175 (incl. #19). `syllabusGuard.ts`/`predictionTypes.ts` untouched. Trunk
`e0395fc`. D26 (verify → correct guard → sweep) is fully CLOSED. Residual generic-phrase gap → D31 above.

### OPEN — PYQ `solutionSteps` data-quality cleanup (MEDIUM) [D30]
Some PYQ questions carry truncated/garbled `solutionSteps`. Independent of the syllabus sweep — a
later data-quality pass; do NOT bundle into the content sweep. See DISCOVERIES D30.

### OPEN — Notes/Formula template sign-off (product) — carried
The TopicHub concept-spine + Formula Sheet / NCERT Notes rollout needs owner sign-off on the template
BEFORE generation: (a) notes structure; (b) granularity (per-[Concept] vs per-topic); (c) 1 vs 3
worked examples per concept. Define before the Formula/Notes content-generation PR.

### OPEN — stale-branch cleanup (housekeeping) — carried
Delete merged/abandoned remote branches: `feat/syllabus-guard-correct-and-extend` (merged via #186),
`feat/438-mobile-parity`, `feat/desktop-phase-3`, `feat/desktop-pr-e`, + the ~7 stragglers from #180.
(CLAUDE.md forbids auto branch deletion — owner-side cleanup.)

### OPEN — clean banned syllabus content from unguarded files + extend syllabusGuard (SUPERSEDED by #186) [D26]
~~`syllabusGuard` scans the question bank only; banned terms survive in `topicTeachContracts.ts`,
`topics.ts`, `class10ContentConfig.ts`, `practiceFilters.ts`.~~ The EXTEND-guard half is DONE (#186) —
the guard now scans these surfaces. The CONTENT cleanup is the sweep above. See DISCOVERIES D26/D28.

### OPEN — re-derive Exam Trends priorities FRESH (tier + trend + marks) [D27]
Topic-level priority data is stale/untraceable (old 10-yr data + pre-revision syllabus). Re-derive
must-crack/high-roi/good-to-do tier + trend + ~marks against the CURRENT CBSE syllabus + recent paper
pattern (scientific basis) BEFORE the band redesign. See DISCOVERIES D27.

### OPEN — HPQ-count recheck (MEDIUM)
The Exam Trends HPQ counts (from `getHighlyProbableQuestions`, matched by canonical topic name) are
rendered honestly but were not re-validated against the fresh tiering. Re-check counts when the
priority data is re-derived (bundle with D27).

### OPEN — Exam Trends band-threshold definition (after fresh tiering)
The planned Must-crack / High-ROI / Good-to-do BAND redesign needs explicit numeric/qualitative
thresholds that map a topic's (re-derived) tier/trend/marks to exactly one band. Define AFTER the
fresh tiering (D27) lands — do not band on the stale data. See DECISION_LOG (2026-06-03 #184).

### OPEN — Exam Trends proof tag (LOW; product decision)
The locked prototype's optional "⟨proofs⟩" tag was omitted in #184 (no real `proof` field in topic
data; inventing it = fabrication). To add it: either add a real `proof` flag to the topic data
(forbidden `src/data/`/`src/lib/desktop/` lane → explicit scope) or drop it from the spec.

### RESOLVED (by #192, D32) — scopeGuard ergonomics for product PRs (LOW; tooling)
`npm run scope:guard` defaults to `--mode tooling`; product PRs need `--mode product`. ~~Latent path
quirk: `git diff` is repo-root-relative (`lazytopper/...`) while `git ls-files` is cwd-relative
(`src/...`) and the policy lanes are unprefixed (`src/`), so product PRs only classify cleanly with a
cwd-relative diff.~~ The path quirk is FIXED in #192 (`toPolicyFrame` normalizes BOTH `git diff` and
`git ls-files` output into the policy frame). `--mode product` now classifies `lazytopper/src/**` cleanly
without any `diff.relative` workaround. The stale-verifier note (`verify-build.mjs` → real name is
`verify-production-build.mjs`) is now tracked as its own follow-up [D35] above.

### CARRIED FORWARD (unchanged from below)
interactive-handoff wrong-visual fix; mobile concept-tutor wiring; Formula Sheet + NCERT Notes
generation + correctness pass; AI cost/rate-limit hardening (D25); Daily Mix keep/cut; Dashboard→
Home/Me consolidation; 3/19 backlog_1_19 known-red-by-decision; stale-branch triage (PR #180 parked);
check-solution T4 boundary case; #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts`
lane). See sections below.

---

## 2026-06-03 — Post-PR #182 (tutor visible + teaching LOCKED)

### RESOLVED — tutor teaching quality (#181 wiring + #182 LOCKED style)
Teaching is now direct/no-fluff/on-concept with a step-marking offer; on "yes" it self-solves with
per-step `[½/1 mark]` CBSE marking (math verified). Owner live-verified. See DECISION_LOG / D24.

### OPEN — interactive-handoff returns the WRONG visual (MEDIUM; separate PR)
`findVisualForConcept` returned a Height-&-Distance visual when "standard angles" was opened. Must
return the visual for the OPENED concept or NOTHING. B2 already stopped the teach prompt from
narrating "the interactive" — but the visual-selection bug itself is unfixed. Its own PR.

### OPEN — mobile concept-tutor not wired (MEDIUM; separate PR)
Mobile `src/pages/app/TopicHub.tsx` "Learn" is a placeholder routing to Check & Improve — it is NOT
wired to the concept_teach drawer (only desktop is, via #181). The teach PROMPT (#182) already covers
mobile once wired (shared backend). Wire mobile "Learn" → ConceptTeachDrawer in a follow-up.

### OPEN — Formula Sheet + NCERT Notes generation + correctness pass (NEW direction)
Per-topic static Formula Sheet + NCERT-based summary Notes (pre-generated) to right-size the tutor.
Needs a content-correctness pass before shipping. Sequenced into the TopicHub redesign.

### OPEN — AI cost / rate-limit hardening (launch gate) [D25]
Gemini 429 "prepayment credits depleted" hit during testing. Before the student link: add rate
limiting on the gateway, leaner call patterns, and a cost ceiling. Bundle with the Railway deploy.

### CARRIED FORWARD (unchanged)
Daily Mix keep/cut; Dashboard→Home/Me consolidation (3 hardcoded `/dashboard` landings); 3/19
backlog_1_19 known-red-by-decision; stale-branch triage (PR #180, still parked); check-solution T4
boundary case (eval-set note); #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts`
lane). See sections below.

---

## 2026-06-02 — Post-PR #178 (grading-prompt tightening)

### RESOLVED — check-solution over-classifies as "conceptual" (#178) [D21]
Grading prompt tightened + measured 6/9→8/9 on the T1–T9 matrix; D21/T1 robustly fixed
(silly, never conceptual×2), T7 (missing→null) + T8 (unbalanced→presentation) also fixed,
T2 stays conceptual. See DECISION_LOG (2026-06-02 #178) and DISCOVERIES.md D21.

### OPEN — check-solution T4 boundary case (LOW; eval-set note)
When a student writes the verification VALUES but omits the −b/a comparison, the grader is
~50/50 between `presentation` (attempted-but-format-short) and `missing` (step omitted), even
at temp 0.15 — both defensible; marks always 2.5/3; NEVER conceptual. Accepted as Option 1
(documented). Track in the 40–60-answer eval set; revisit only if it causes student confusion.

### CARRIED FORWARD (unchanged) from post-#176
Daily Mix keep/cut; Dashboard→Home/Me consolidation (SES-04/PRG-03); Mistake Intelligence
wiring; #176 gate-hygiene backlog (wire `ci:smoke` into CI; `vitest.config.ts` lane); the
3/19 backlog_1_19 reds (known-red-by-decision). See entries below.

---

## 2026-06-02 — Post-PR #176 (scope:guard re-armed)

### OPEN — Daily Mix keep/cut (owner decision pending)
Daily Mix is alive + premium-gated (`/daily-mix/:grade/:subject`), a daily-habit PRACTICE
surface (streak/resume/mastery) — NOT one of the four hooks and NOT mistake/spaced-repetition-
driven. Candidate to retire like the session-player was. Owner KEEP/CUT decision needed.

### OPEN — Dashboard→Home/Me-Progress consolidation (Track A) — 3 hardcoded /dashboard landings
The product has NO Dashboard (retired → Home + Me/Progress), but the repo still hardcodes
`/dashboard` as the post-login landing in 3 places (`Login.tsx` fallback ~L594, `HomeRedirect`,
`RootEntry` mobile). Desktop `/` is correct; login-fallback + mobile still go to `/dashboard`.
Fix all three in the consolidation. (The `?redirect=`/`from` priority is already correct — only
the bare-login FALLBACK is wrong.) SES-04 + PRG-03 resolve here.

### OPEN — Mistake Intelligence not yet wired to Me/Progress (future PR)
"Me/Progress shows real memory-intelligence data" is the INTENDED state, not current. Separate
future PR; do not present it as done.

### OPEN — Backlog from #176 (gate hygiene)
- `test:repo-boundary` 1/5: `vitest.config.ts` is tracked but matches no policy lane
  (`all_tracked_files_classified`). Add it to the `product`/`trackedTooling` lane (or fix the
  rule) — deferred.
- `verify-build.mjs` missing from this checkout (CLAUDE.md §6 references it; stale — same gap
  flagged in #174/#175).
- `ci:smoke` downstream steps (build / tutor:eval / lint:ci) unevaluated in #176 (out of scope).
- **Wire `ci:smoke` into CI** so a broken gate fails loudly — the deeper fix (D23); today it runs
  only locally, which is exactly why `2081003` broke a live gate silently.

### CLOSED — 3/19 acceptance reds = known-red-by-decision (do NOT re-investigate)
All 3 are intentional product changes: SES-04 (session-player deleted `b891597` → `/daily-mix`),
PRG-03 (Dashboard rebuilt `c1afcd3` → `TopicMasteryGrid`), PRG-02 (dropped in 8025→700 rewrite
`428e3ac`; TopicHub is the Track A target). SES-04 + PRG-03 resolve in the Dashboard→Home/
Me-Progress consolidation; PRG-02 in the Track A TopicHub redesign. See DECISION_LOG 2026-06-02.

### NOTE — Locked specs are owner/architect-held, NOT in repo
`LazyTopper_Learn_Flow_Spec_LOCKED.md`, `LazyTopper_TrackA_PR_Breakdown.md`,
`LazyTopper_Mistake_Scenario_Map.md` are referenced but not committed here — referenced, not
fabricated. Commit under `handoff/` if the next session needs them as source of truth.

---

## 2026-06-01 — AI gateway live (local) + PR #174 (check-solution parse fix)

### OPEN — check-solution OVER-classifies mistakes as "conceptual" (MEDIUM → PR B) [D21]
Real repro `sol2.jpeg`: a sign-misread from a correctly-factored expression (`(x−4)(x+2)`,
root read as −4 not +4) was tagged CONCEPTUAL — should be SILLY (method understood). The
propagated downstream error (wrong sum-verification) was double-counted as a SECOND
conceptual mistake instead of attributed to the single root-cause slip. Fix = PR B
grading-prompt tightening, MEASURED vs a mistake-scenario matrix. Do NOT hand students a
live link until classification is trustworthy. See DISCOVERIES.md D21.

### RESOLVED — check-solution "could not evaluate" parse bug (PR #174) [D20]
gemini-2.5-flash truncated/wrapped its JSON under maxOutputTokens:2500 with no JSON mime →
unparseable → misleading "clearer image" fallback. Fixed: responseMimeType:'application/json'
+ token cap 2500→8000 + warn-log + honest message. Measured before/after on real images.

### RESOLVED — local dev AI features looked broken (proxy port) [D19]
Vite proxies /api to API_SERVER_PORT||8080, not the gateway's :3001. Start Vite as
`API_SERVER_PORT=3001 npx vite`. Gateway + Vite run separately; nothing auto-spawns the
gateway. See DISCOVERIES.md D19.

### OPEN — verify-build.mjs / "137 guards" referenced but absent in this checkout (LOW)
CLAUDE.md §6 and the A2 instruction reference `node scripts/verify-build.mjs` and a "137
guards" verifier; neither exists at those paths in this checkout. The real build gate is
`npm run build` (Vercel command), which passes. Reconcile CLAUDE.md with the actual repo, or
restore the verifier, so future sessions don't chase a missing gate.

### OPEN — LOCKED specs referenced but not committed to the repo (LOW)
LazyTopper_Learn_Flow_Spec_LOCKED.md + LazyTopper_TrackA_PR_Breakdown.md (and any
New-Session-Brief / Master-Knowledge index) are owner/architect-held and NOT in this repo.
This handoff references them but cannot link to in-repo copies. Commit them under handoff/ if
the next session needs them as the source of truth for Track A/B.

### OPEN — Clerk pk_test_→pk_live_, DPDP/consent for minors, charge path (at student-link time)
Surfaced by the owner clarifications. Resolve before the public student link, alongside the
Railway deploy. Not blockers for PR B (local).

---

## 2026-06-01 — Post-PR #172 (mobile Home polish)

### RESOLVED — mobile /browse was the plain PR-#168 layout, not the locked polish (PR #172)
Rebuilt MobileHome to the owner-locked design (illustrated gradient SVG icons, orient-
before-act order, persistent hints, inspiring SAMPLE Mistake-Intel panel, honest CTA).
Real data only; signed-in Mistake-Intel uses an honest empty state (no invented counts).

### RESOLVED — green browser-chrome banner + near-black 3-tab BottomNav (PR #172)
theme-color #58cc02→navy #0f1b33; BottomNav recoloured to light grammar + 3→5 tabs.

### RESOLVED — double brand bar on signed-out mobile (PR #172 addendum, Option A)
Global public navbar now suppressed on mobile /browse + /welcome via
isMobileSelfChromedRoute (!isDesktop-gated). Each mobile page shows ONE brand bar.

### ACCEPTED CONSEQUENCE — Search dropped from mobile Home (owner-approved)
The global navbar carried Search + Log in; suppressing it on mobile /browse removes the
Search box from mobile Home. Owner approved; NOT re-added. Search remains inside the
product. Revisit only if mobile users need top-level search on Home.

### OPEN — legacy/superseded routes flagged for a deprecation PR (MEDIUM)
From the #172 §D audit (flag-only, nothing deleted): /dashboard→/me, /trends→/exam-trends,
/practice/:g/:s→/practice-hub still resolve to real legacy pages and remain live signed-in
entry points (RootEntry/HomeRedirect send signed-in users to /dashboard). /profile,
/ai-mentor, /mentor, /topic-mock already redirect. /predictive-papers + /highly-probable
= candidate canonical home for a future dedicated Predicted destination (currently routed
via /exam-trends). Separate future PR after owner review.

### OPEN — legacy #58cc02 brand palette (LOW, separate colour-migration PR)
styles.css (~50 hits), styles/tokens.css (--lt-brand-*), favicon.svg, og-image.svg still
use the Duolingo-green #58cc02; the new grammar green is hsl(152,55%,45%). Large blast
radius — deprecate as a dedicated colour-migration PR, not mid-polish.

### OPEN — Predicted card shares the /exam-trends route with "What scores most" (LOW)
Per the canonical-routes constraint, both the trends card and the Predicted card route to
/exam-trends (where the predicted breakdown lives). A future dedicated Predicted page
(/predictive-papers) would split them. Honest today (no fake data); noted for awareness.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-31 — Post-PR #170 (mobile landing)

### RESOLVED — /welcome landing had no mobile layout (PR #170)
Added MobileWelcome (swipe carousel, frozen v4 art) + a viewport switch at /welcome.
Welcome.tsx untouched. Honest trial copy enforced (test asserts "then paid" absent).

### PROCESS — "frozen design" file referenced but absent (carry-forward lesson)
The PR-C prompt pointed at PR_C_mobile_landing.md + carousel_cards_v4_genz.html, which
were not on disk. Correct handling = STOP and request the file; do NOT invent locked
art. Owner supplied PR_C_frozen_carousel_art.md; used verbatim. Apply to future
"frozen design" PRs.

### OPEN — MobileWelcome dot indicator relies on scroll (LOW)
Active-dot tracking uses an onScroll handler (jsdom has no layout, so the test asserts
the scroll-snap CSS contract + 4 dots, not pixel position). Fine on real devices;
noted for awareness.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-31 — Post-PR #168 (mobile Home)

### RESOLVED — /browse cockpit squeezed on mobile (PR #168)
DesktopHome rendered at /browse at all widths with non-reflowing grids. PR #168 added
MobileHome (single-column, on the PR-A primitives) and a viewport switch at /browse.
Desktop render byte-identical. First grammar-primitive consumer (resolves the
"primitives not yet wired into any page" item from #166).

### OPEN — Other DesktopHome grids still desktop-only on mobile-reachable routes? (LOW)
MobileHome covers the /browse Home cockpit. If any OTHER signed-in mobile route ends
up rendering DesktopHome (it currently doesn't — RootEntry redirects mobile), it would
need the same treatment. No action now; flagged for awareness.

### OPEN — Quick-generate fallback derivation duplicated in MobileHome (LOW)
MobileHome re-derives fallbackGrade/fallbackSubject with the same logic as DesktopHome
(a few lines; uses the same real landingMemory). If it grows, lift into a shared hook
(candidate for the PR C usePracticeHub-style extraction pattern). Not fake data.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #166 (grammar primitives)

### RESOLVED — No shared responsive primitives for the mobile work (PR #166)
Pages hand-rolled inline-styled grids with no mobile reflow. PR #166 added
`src/components/grammar/` (Card, TileRow, Pill, SectionHeader) so page reflows (PR B+)
reuse one consistent contract. TileRow reflow is pure CSS (@media max-width:1023px).
Wired into no page yet.

### OPEN — Grammar primitives not yet wired into any page (expected; PR B+)
The primitives exist and are tested but unused. PR B (Mobile Home) is the first
consumer. Until pages adopt them, the live mobile squeeze (e.g. DesktopHome 4-card
row) persists. Tracked in the staged UI roadmap.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #164 (blackbox decommission)

### RESOLVED — Dead blackbox/tracker/pmem tooling removed (PR #164)
The entire dead "memory blackbox" experiment (blackbox + contextpack + tracker
family + pmem-runner + the project-memory-blackbox-ext stub + blackbox.yml + 20 npm
scripts) was removed. No live import existed in src/server/ops. Repo-wide refs now 0.

### RESOLVED — False-green `npx tsc --noEmit` in start:quick / precommit:check (PR #164)
start:quick now runs `npx tsc -p tsconfig.app.json --noEmit && npm run build`;
precommit:check removed; startSafe.mjs fixed to the same real typecheck. The bare
`npx tsc --noEmit` (always exit 0 because root tsconfig has `files: []`) is gone from
the convenience scripts.

### OPEN — Two hook dirs coexist (LOW, cosmetic)
Repo has both root `.githooks/pre-commit` (Windows-metadata cleaner) and
`scripts/githooks/pre-commit` (now lint-only after #164). `hooks:enable` points to
`scripts/githooks`. Consider consolidating to one hook dir in a future cleanup.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #162 (production-build hotfix)

### RESOLVED — Test files swept into the production app compile (PR #162)
PR #160's render-test files (src/test/*) import dev-only packages. tsconfig.app.json
had no `exclude`, so `tsc -b` (Vercel's build) compiled them. Green locally (devDeps
present) but breaks on Vercel where devDeps are pruned (TS2305). Fixed by adding an
`exclude` array to tsconfig.app.json. Vercel preview + production deploy both GREEN.
Lesson locked: gate UI/build PRs on the REAL `npm run build`, not bare
`tsc -p ... --noEmit`; and Vercel preview check is a valid pre-merge prod-build gate.

### OPEN — False-green `npx tsc --noEmit` in start:quick / precommit:check (MEDIUM → scheduled)
Still present. NOW SCHEDULED as part of PR 0.5 (blackbox decommission): rewrite
`start:quick` to `npx tsc -p tsconfig.app.json --noEmit && npm run build`, and drop
the dead blackbox/contextpack chain from both scripts. See NEXT_ACTION.md.

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it.

---

## 2026-05-30 — Post-PR #160 (render-test infrastructure)

### RESOLVED — No render-test mechanism in lazytopper/ (PR #160)
The app package had no Vitest/Jest, no Testing Library, no jsdom, no `*.test.tsx`,
no `test` script. PR #160 installed it (Vitest 3.2.4 + Testing Library + jsdom),
scoped `vitest.config.ts` `include` to `src/` so the scripts/ guard suite is never
touched, polyfilled `window.matchMedia` in `src/test/setup.ts`, and proved it with
one green smoke test. Future UI PRs can now ship real proof-of-work render tests.

### OPEN — False-green `npx tsc --noEmit` in start:quick / precommit:check (MEDIUM)
`start:quick` and `precommit:check` call bare `npx tsc --noEmit`, which always
exits 0 (false pass) in this repo. Real app typecheck is
`npx tsc -p tsconfig.app.json --noEmit`. Deliberately left as-is in #160 (out of
scope); slated for the blackbox-decommission PR.

### OPEN — Test-tooling adds dev-dependency tree (LOW, informational)
`npm install` for #160 added 717 packages; `npm audit` reports pre-existing
vulnerabilities in the wider dev tree (none introduced by #160 are actionable in
scope — dev-only test tooling, not shipped to the app bundle).

### OPEN — .claude/ folder still not in .gitignore (LOW, unchanged)
Untracked `.claude/` continues to show in every `git status`. Never stage it. Add
to `.gitignore` in a future docs-only PR.

---

## 2026-05-26 — Post-PR #150 + #151 (PYQ 2024 Maths re-run + permanent tagging/filter/step-marks fix)

### CLOSED — ISSUE-001 Practice type filters broken (PR #151)
Symptoms (pre-fix):
  - Competency chip returned 0 questions
  - Proof chip returned only 2 questions out of 70+ proof items in bank
Root causes:
  - `isCompetencyBased` not forwarded in CanonicalQuestion → PracticeQuestion mapping
  - Proof predicate matched `fmt.includes("proof")` but format strings are
    "Long"/"Short" since PR #112 (field value "Proof" was retired)
Fix (PR #151):
  - Added `isCompetencyBased: (q as { isCompetencyBased?: boolean }).isCompetencyBased`
    to the mapping in practiceQuestionBuilder.ts:268
  - Broadened Proof predicate at L2 and L3: PRF IDs + `prove that` / `show that` /
    `derive ` anchored text + subtopic regex (proof|identit|tangent.propert|
    geometric.proof) + Long/Short + Analysing + Section C/D safety net
  - Added Section A + Remembering override (3 sites) so recall questions
    never qualify as Competency
  - L2 soft fallback removed — honest empty state when no questions match

### CLOSED — ISSUE-002 Step marks hidden for canonical bank questions (PR #151)
Symptom: "Step marks are hidden because this solution is a guide" banner
showed for all multi-step bank questions, hiding per-step CBSE marks.
Root cause: hasUnsafeWrittenStepMarks fired whenever step marks didn't sum
to the question total, including for valid bank questions.
Fix (PR #151): Added `isCanonicalBankQuestion` boolean
(id present + not "ai-" prefix + solutionSteps non-empty + marks > 1) and
short-circuited hasUnsafeWrittenStepMarks to false for canonical questions.
AI question safety net preserved (still fires for AI questions with mismatched step marks).

### RESOLVED — ISSUE-003 Mojibake in NCERT/Exemplar files
Probe scan (PR #151 session) of all *.ncert.ts + *.exemplar.ts files in
maths/ and science/ returned **0 mojibake hits**. Files were already clean
(likely fixed by a prior PR before this session). No action needed.

### NEW OPEN — ISSUE-006 Hindi PYQ garbled question in bank (P0 — must fix before launch)
Symptom (from PR #151 smoke test on Vercel preview): one PYQ question
renders garbled Devanagari script transliterated to ASCII patterns
(`OgHo$`, `_mZ`, `H$m`, `bE 2 sin`).
Root cause: Hindi-medium PYQ paper extracted without language detection;
Devanagari mojibake'd to ASCII.
Priority: P0 — renders broken text to students
Fix (next small PR — combine with ISSUE-007):
  - Branch: fix/remove-hindi-garbled-pyq
  - Search command:
    Select-String -Recurse -Path "lazytopper\src\data\questionBanks\class10" `
      -Include "*.ts" -Pattern "OgHo|_mZ|H\$m|bE 2 sin"
  - Identify question ID, remove from source pack file

### NEW OPEN — ISSUE-007 Proof filter catches Section A conceptual questions (P0)
Symptom (from PR #151 smoke test): "In a proof, from which side do you start?"
(a Section A recall MCQ about proof technique) appears in Proof filter results.
Root cause: PR #151's broadened Proof predicate matches subtopic keywords
("proof"/"identit"/"tangent.propert") even when the question itself is a
Section A recall MCQ ABOUT proofs, not a proof exercise.
Priority: P0 — pollutes Proof filter with recall questions
Fix (one line each in two files — combine with ISSUE-006 in same small PR):
  Add at TOP of Proof branch in practiceQuestionBuilder.ts (~line 485) and
  PracticePage.tsx (~line 290):
    const qSection = String((q as { section?: unknown }).section ?? "");
    if (qSection === "A") return false;
Branch: fix/remove-hindi-garbled-pyq (combined PR)

### NEW OPEN — ISSUE-008 VSA-format doctrine decision (P1)
96 questions in the bank use `format: "VSA"`:
  - 90 in Section B + 2 marks
  - 6 in Section A + 1 mark
These aren't covered by the 7 section×format migration rules in PR #151.
"VSA" (Very Short Answer) is a legitimate CBSE format but doesn't map cleanly
to the current filter chips. Decisions needed:
  - Should VSA questions appear under "Short" in filter chips, or as a separate chip?
  - Should A+VSA+1mk be retagged to A+MCQ+1mk + force options? (only if options exist)
Defer until post-launch UX review.

### Session learnings (carry forward)

- **Smoke test on Vercel preview is mandatory** for filter/UI changes before merge.
  Several violations only surfaced in real usage that audits missed.
- **Section A excluded from Proof predicate**: conceptual questions about a
  technique should never match the technique's own filter.
- **Pack builder group-default section assignment** is the root cause of
  wrong-section questions, not filter code.
- **Hindi-medium PYQ files** can contain garbled Devanagari script —
  extraction scripts must detect and skip non-English content.
- **stash → rebase → pop** is the correct sequence when base advances during agent work.
- **Section×format migration** (Option B Rule 7) is repeatable for future audits;
  script at C:\Users\Chetan\OneDrive\Desktop\diff\fix_section_format_migration.mjs

### Decisions recorded this session

1. **Filter system redesign (next sprint)**: 2-layer default/advanced
   ("Competency" → "Application & Scenario", Section labels → Mark labels,
   Difficulty moves to advanced panel, Source filter added,
   Section A excluded from Proof)

2. **Pack quality strategy (launch)**: Option B — remove structural outliers
   for launch (Section D + Remembering recall questions, Section A + Short
   without MCQ options), regenerate from stricter prompts post-launch

3. **Academic calendar alignment (confirmed)**: Launch first week of June 2026.
   Primary use case at launch: chapter-by-chapter practice + worksheet generation.
   Filter complexity not needed until September (PT1 season). Full timed mock +
   advanced filter system needed before October (half-yearly).

4. **Tagging doctrine for future content**:
   `isCompetencyBased: true` ONLY if real-world context OR AR/Case format OR
   Analysing+ Bloom — NOT just "Bloom ≥ Applying".
   Proof filter: Section A questions NEVER qualify regardless of subtopic.
   Section assignment: must be per-question editorial judgment, not group default.

---

## 2026-05-25 — Post-PR #137 (P4-S PYQ Science 111 Qs; **P4 phase complete: 214 board PYQs**)

### RESOLVED — P4-S PYQ Science extraction (PR #137)
13 new `science/{topic}.pyq.ts` files + canonicalQuestionBank.ts registration.
111 verbatim CBSE 2022-23 board questions across 9 text-extractable QPs
(31/2/x, 31/4/x, 31/5/x) + 4 matching MS files (X_086_31_x_MS_UNSIGNED_ALL SETS,
each covering all 3 sets — split by Paper Code: 31/x/y marker). Section A=37 /
B=23 / C=29 / D=15 / E=7; competency 85.8% avg (range 56-100%); engine
isPYQQuestion() recognises 111/111 via `pyqYear: "2023"` path. Authentic
2,587 → 2,698; spreads 189 → 202; bank 5,415 → 5,526.

### RESOLVED — P4 PYQ phase complete (PR #135 + PR #137)
**214 verbatim CBSE 2022-23 board PYQs across all 26 retained Class 10
topicKeys** (13 Maths + 13 Science). All 214 engine-recognised as PYQ via
populated `pyqYear` path. Authentic progress: 2,484 → 2,698 = **60.0% of
4,500-Q retirement threshold**.

### LOCKED — Pipeline scripts reusable for P4 continuation
P4-M (`p4_*.py`) and P4-S (`p4s_*.py`) pipeline scripts kept in `diff\`.
Reusable for P4 continuation years (2023-24, 2024-25, 2025-26). Key adaptations
locked in P4-S that carry forward:
  - MS "ALL SETS" bundle splitting by Paper Code marker
  - MCQ answer fallback (look up option value from QP when MS gives only letter)
  - Science page footer (`H N H`) stripping
  - Deleted-topic filter coverage (Periodic Classification, Evolution, Sources
    of Energy, Mgmt Natural Resources, Motor/EMI/Generator)

### LOCKED — Permanent PYQ Science source decisions (do not re-evaluate)
P4-S session probed and PERMANENTLY documented:
  - **2022-23 Science USED**: 9 QPs extracted (31/2/x, 31/4/x, 31/5/x)
  - **2022-23 Science skipped — require OCR**: 31/1/1, 31/1/2, 31/1/3, 31/6/1,
    31/6/2, 31/6/3 (scanned image-only PDFs, 0 chars).
  - **Within-paper losses (unavoidable without OCR)**: ~60 questions with
    Hindi-only body, ~50 truncated bodies, 3 broken-option MCQs.

### NEW — `final MS` folder unlocks P4 continuation (HIGH priority, multiple years)
Path: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS`
Contains: official CBSE marking schemes for 2022-2026 (all years).
Unlocks P4 continuation passes for years previously stalled on missing MS.

  - **2023-24 Maths** (13 QPs) + **Science** (7 QPs) — ~230 Qs potential
    Fresh branches: `content/p4-pyq-maths-2024`, `content/p4-pyq-science-2024`
    pyqYear: "2024"
  - **2024-25 Maths** (9 QPs) + **Science** (9 QPs) — ~200 Qs potential
    Fresh branches: `content/p4-pyq-maths-2025`, `content/p4-pyq-science-2025`
    pyqYear: "2025"
  - **2025-26 Maths** (23 QPs) + **Science** (13 QPs) — ~300 Qs potential
    Fresh branches: `content/p4-pyq-maths-2026`, `content/p4-pyq-science-2026`
    pyqYear: "2026"

After typical filter rate (~30-40%): **300-400 more verbatim PYQs estimated**.
Pre-req: probe `final MS` folder first to verify file naming convention and
QP→MS pairing (may differ from 2022-23 series).

### OPEN — K2H-8f-c add `isPYQ?: boolean` to CanonicalQuestion type (LOW, **next active**)
Adds `isPYQ?: boolean` to `predictionTypes.ts`. Small PR (one line in the type
+ one-line backfill script setting `isPYQ: true` on all 214 P4-M + P4-S
questions). Once landed, engine isPYQQuestion() recognises PYQs via BOTH the
field AND the pyqYear path (redundant but explicit). Not blocking content
extraction (engine already recognises 214/214 via pyqYear).

### OPEN — K2H-8f UI wire-up (LOW-MEDIUM, **next active**)
Branch `fix/k2h-8f-ui-wire`. File: `practiceQuestionBuilder.ts`. Add
`pyqOnly?: boolean` to builder argument type, pass through to engine's
`generatePracticeSet({ ..., pyqOnly })`. Engine accepts since PR #133; bridge
currently doesn't pass it. Required before PYQ filter chip is end-to-end
usable in practice surface.

## 2026-05-25 — Post-PR #135 (P4-M PYQ Maths 103 Qs)

### RESOLVED — P4-M PYQ Maths extraction (PR #135)
13 new `maths/{topic}.pyq.ts` files + canonicalQuestionBank.ts registration.
103 verbatim CBSE 2022-23 board questions across 9 text-extractable QPs
(30/2/x, 30/4/x, 30/5/x) + matching MS 041_30-x-x marking schemes.
Section A=48 / B=15 / C=22 / D=15 / E=3; competency 100%; engine isPYQQuestion()
recognises 103/103 via `pyqYear: "2023"` path. Authentic 2,484 → 2,587;
spreads 176 → 189; bank 5,281 → 5,415.

### LOCKED — `isPYQ` field omission via pyqYear path (P4-M doctrine, also for P4-S)
P4-M instruction Section 3 said "isPYQ: true on ALL". The `CanonicalQuestion`
type in `predictionTypes.ts` does NOT include `isPYQ?: boolean` yet, and that
file is globally forbidden per CLAUDE.md §4. Resolution locked: **omit `isPYQ`
field entirely; populate `pyqYear: "2023"` (or appropriate year) instead**.
PR #133's `isPYQQuestion(q)` helper recognises both paths — 103/103 verified.
**Apply this approach to P4-S Science extraction too.** Once K2H-8f-c follow-up
adds `isPYQ: true` to the type, a one-line script can backfill it across all
P4-M + P4-S files. Don't fight the type system.

### LOCKED — Permanent PYQ Maths source decisions (do not re-evaluate)
P4-M session probed and PERMANENTLY documented these source-availability facts:
  - **2022-23 Maths used**: 9/16 QPs extracted (30/2/x, 30/4/x, 30/5/x).
  - **2022-23 Maths skipped — require OCR**: 30/1/x, 30/6/x, 30-B-5 (scanned
    image-only PDFs; pymupdf returns 0 chars).
  - **2023-24 Maths deferred — MS download needed**: `24 math 1/2/3.pdf` series
    exists locally but no matching MS on disk. Download MS from cbse.gov.in,
    then resume as P4-M continuation.
  - **Within-paper losses (unavoidable without OCR)**: 48 questions where pymupdf
    returned only Hindi-script body; 41 questions with math-symbol-heavy truncated
    bodies; 18 MCQs with broken option sets (duplicates from lost minus signs).
    Total 107 of 342 raw question instances skipped to preserve anti-fabrication.

### OPEN — P4-S PYQ Science extraction (HIGH, **next active task**)
Fresh branch `content/p4-pyq-science`. Sources: `31_x_x.pdf` Science QPs +
`X_086_31_x_MS` marking schemes (confirmed on disk in
`...\CBSE Previous papers\2022-2023\SCIENCE\`). ~150-200 Qs expected after
similar quality filters. ID prefix `PYQ-S-2023-{TOPIC}-{NNN}`. File naming
`science/{topic-slug}.pyq.ts`. Pipeline scripts in `diff\` are reusable:
swap Maths topic classifier for Science; update ID prefix and topic-short
table in `p4_generate_ts.py`; probe FIRST to identify scanned-PDF skips.
Same doctrine as P4-M (pyqYear via isPYQQuestion; pyqSet "1"/"2"/"3";
Section E one-row case-based; anti-fabrication; broken-MCQ filter; skip
deleted topics — Periodic Classification, Evolution, Sources of Energy,
Management of Natural Resources, Motor/EMI/Generator).

### OPEN — 2023-24 Maths MS download then P4-M continuation (LOW)
Manual step: download missing 2023-24 Maths marking schemes from cbse.gov.in.
Once on disk, extract another ~50-100 Qs from the `24 math 1/2/3.pdf` series
as P4-M continuation (separate fresh branch).

### OPEN — K2H-8f-c add `isPYQ?: boolean` to CanonicalQuestion type
Adds `isPYQ?: boolean` to `predictionTypes.ts`. Small PR (one line). Unblocks
setting `isPYQ: true` on P4-M + P4-S files via one-line backfill script. Not
blocking content extraction (engine already recognises via pyqYear).

## 2026-05-25 — Post-PR #132 + #133 (P3 Science chapter-wise; K2H-8f PYQ engine fix)

### RESOLVED — P3 Science chapter-wise extraction (PR #132)
13 new `science/{topic}.chapterwise.ts` files + canonicalQuestionBank.ts
registration. 552 questions (252 MCQ from cbjescco + 300 PYQ-style from
cbjesccq). Sources: www.cbse.online / rava.org.in. All 13 retained Class 10
Science topics covered; ch05/14/16 skipped per 2026-27 doctrine. ID prefixes
SCO-S-*/SCQ-S-*. Authentic 1,932 → 2,484; spreads 163 → 176; bank 4,729 → 5,281.

### RESOLVED — K2H-8f PYQ engine filter (PR #133)
Engine-layer hard pyqOnly filter landed; `isPYQQuestion(q)` helper honours
both explicit `isPYQ: true` and populated `pyqYear`. 435 pyqYear-tagged
questions now correctly returned. Test matrix 125 → **134/134 PASS**.
**P4 PYQ extraction unblocked at engine layer.**

### LOCKED — MCQ competency doctrine (CBSE 2026-27)
PR #132 locks this: MCQ defaults to `isCompetencyBased: true` because option
discrimination requires concept application above pure recall (CBSE 2026-27
doctrine). Pure-recall MCQs starting with Define/Name the/List the/Recall/
Match the stay false. Use for all future MCQ extractions.

### LOCKED — Permanent source decisions (recorded in CURRENT_STATE.md)
P3 session probed and PERMANENTLY SKIPPED these sources (anti-fabrication
or quality blockers). Future sessions should NOT re-evaluate:
  - Meridian (no marking-scheme PDFs)
  - NODIA (MS hosted externally on URL)
  - cbjemacq (Sinhala glyph corruption confirmed by probe)
  - Maths Basic 430-x-x (out-of-Standard scope)
  - Chapterwise SOL Aakash (scanned, needs OCR — deferred phase)
  - Old\ folder (superseded duplicates)

### OPEN — K2H-8f UI wiring follow-ups (MEDIUM, 3 small PRs)
PR #133 fixed the engine layer; three UI-side connections remain. Each
independent — can ship separately or bundled.
  a. Wire `pyqOnly` through `practiceQuestionBuilder.ts` (UI-engine bridge)
  b. Fix engine-to-UI mapping that strips `pyqYear`/`isPYQ` fields
  c. Add `isPYQ?: boolean` to `CanonicalQuestion` in `predictionTypes.ts`
Until these land, the engine filter works but the UI chip can't reach it
cleanly. Not blocking P4 content extraction.

### RESOLVED — P4-M PYQ Maths extraction (now PR #135 — see above)
Was OPEN; closed by PR #135 (2026-05-25). 103 verbatim Qs extracted from
9 text-extractable QPs. See top of this file for details and P4-M source
decisions locked.

### OPEN — P4-S PYQ Science extraction — see top of this file
Now the next active task. Same doctrine as P4-M (pyqYear via isPYQQuestion).

### OPEN — Pre-launch quick wins (carry-over from PR #130 cycle)
Still queued, unchanged:
  1. strategyHint Hint button in PracticeQuestionCard (Small)
  2. "Show visual" wiring fix in TopicHub right rail (~20 lines)
  3. Formula sheet tab on TopicHub for 14 seeded topics (Medium)
  4. API gateway fix — vercel.json /api/* rewrite + Railway deploy (High)

### OPEN — Maths chapter-wise (LOW priority, future phase)
`cbjemaco` series (MCQ-only, clean per earlier probe) available but would
add mostly Section A density. Defer unless B/C/D/E coverage from P4 PYQs
proves insufficient.

### OPEN — Chemistry `$` arrow rendering in chapter-wise files (LOW, cleanup)
PR #132 caveat: pymupdf renders `→` as `$` in cbjescco/cbjesccq source
(e.g. `Cu(s) + 2AgNO3(aq) $ Cu(NO3)2(aq) + 2Ag(s)`). Content verbatim from
PDF — anti-fabrication preserved. Optional future cleanup pass could
substitute `$` → `→` where safe, but risks corrupting valid `$` uses.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~135 cumulative questions tagged (PRs #126 + #128 + #130 + #132). Plan
unchanged: Option B (placeholder images) at launch; Option A (SVG renders)
post-launch. PR #132 added ~70 to the backlog from chapter-wise heuristic.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, UNBLOCKED)
P2 APQ + P3 Science chapter-wise complete; AR density pass unblocked.
Target: 2-3 AR per topic for Maths + Science. Source: existing CBSE PDFs
with AR coverage not yet extracted.

### OPEN — Our Environment density (LOW, healthy now)
48 Qs in bank: PR #128 seeded 4 + PR #130 added 4 + PR #132 added 40
chapter-wise. Density now reasonable; no urgent extraction needed.

### OPEN — TopicHub seeded coverage backfill (MEDIUM, content)
11/25 TopicHub topics still on sample-preview. Pre-launch content work.

### OPEN — Branch fix-up incident lesson (LOW, process)
PR #132 session had a silent mid-session branch switch (P3 commit landed
on wrong branch initially, recovered with `git branch -f`). Cause unclear
(possibly VSCode auto-switch). Lesson: verify `git branch --show-current`
before each commit when multiple branches are in flight.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1"). P4 PYQ
extraction should use the same convention; cleanup pass deferred to P5.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked `.claude/` shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

---

## 2026-05-25 — Post-PR #130 (P2 APQ Science-PQ2; P2 APQ COMPLETE) open items

### RESOLVED — P2 APQ Science-PQ2 extraction (PR #130)
13 Science topic files APPENDED with Science-PQ2 (+49 Qs). 10 OR-pairs as
separate rows; 13 REQUIRES-FIGURE tags. Section breakdown A=20 B=8 C=9 D=6 E=6;
competency 81.6%. No new files; canonicalQuestionBank.ts untouched. Authentic
count 1,883 → 1,932. Bank total (engine-confirmed) 4,729.

### RESOLVED — P2 APQ phase COMPLETE
PRs #119 + #126 + #128 + #130 together extract **284 authentic Qs across 5
official CBSE practice papers** (SQP, PQ1, PQ2, PQ_2022, Science-PQ, Science-PQ2).
All 13 retained Maths topicKeys and all 13 retained Science topicKeys now have
APQ content.

### RESOLVED — content/additional-pq-sqp-2024 branch DELETED (remote + local)
Branch had been squash-merged 4 times (PRs #119, #126, #128, #130), each cycle
requiring a `--force-with-lease` push after rebase onto the new base. Branch
deleted permanently. **Doctrine update applied:** future extraction phases use a
fresh branch name per phase (e.g. `content/p3-meridian`, `content/p4-cbjemaco`).
This eliminates the force-push requirement permanently.

### RECORDED — Tutor / content audit findings (read-only report)
Report: `diff\report-tutor-content-audit-2026-05-24.md`. Key findings now
recorded as new product-PR follow-ups (below).

### OPEN — strategyHint never rendered on any surface (LOW, quick win — promoted)
75 question banks contain authored `strategyHint` content (including all 65
REQUIRES-FIGURE descriptions). No UI surface displays them. Add a "Hint" toggle
in `PracticeQuestionCard` (or equivalent) that reveals `q.strategyHint` when
present. Small product PR.

### OPEN — "Show visual" button broken in TopicHub right rail (LOW, quick win)
Button currently a no-op or routes incorrectly. Wire to the existing visualiser
surface for the active topic. ≈20 lines product PR.

### OPEN — No formula sheet surface (MEDIUM, quick win)
14 topics have seeded formula data in archetypes/predictions but no UI renders
it. Add a "Formulas" tab beside Notes/Practice on TopicHub for those 14 topics.
Medium product PR.

### OPEN — API gateway gap in vercel.json (HIGH, production blocker)
No `/api/*` rewrite in `vercel.json`. AI features return 404 in production. Fix
requires Vercel rewrite + Railway deploy of the backend. High-effort product PR.

### OPEN — P3 Meridian extraction (HIGH, next content task)
~475 Qs across Meridian worksheets + Maths QB (both on disk in gdrive copy).
**New fresh branch:** `content/p3-meridian` (no reuse — per branch-management
doctrine update above). First step: pymupdf cid probe on Meridian PDFs
(3rd-party publisher; cid behaviour not yet tested). Split across 2 agents
(Maths topics / Science topics). ID prefixes: `MRD-*`, `MQB-*`. Same OR-pair +
REQUIRES-FIGURE doctrine as P2 APQ.

### OPEN — TopicHub seeded coverage backfill (MEDIUM, content)
11/25 TopicHub topics still on sample-preview (1 additional topic seeded since
PR #128 noted 12). Pre-launch content work.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~65 cumulative APQ questions (PR #126 + #128 + #130) tagged REQUIRES-FIGURE.
Plan: Option B (placeholder images) at launch; Option A (SVG renders)
post-launch.

### OPEN — Our Environment density (LOW, future extraction)
8 Qs in bank (PR #128 seeded 4 + PR #130 added 4 more). Approaching reasonable
density; future extractions should add more.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, now UNBLOCKED)
P2 APQ phase complete, so the dedicated `.assertionReasoning.ts` extraction
pass is unblocked. Target: 2-3 AR per topic for both Maths and Science.

### OPEN — Content + product deliberation (MEDIUM, pre-launch planning)
Continued from PR #128 cycle: Notes per chapter, Formula sheets (now partially
addressed by quick-win above), Proof library, Tutor drawer audit
(MentorSolveDrawer / ConceptTeachDrawer / TutorDrawerV2). Pre-launch decisions
required.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1"). Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked `.claude/` shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

---

## 2026-05-25 — Post-PR #128 (P2 APQ continuation) open items

### RESOLVED — P2 APQ continuation (Maths PQ_2022 + Science-PQ) (PR #128)
13 Maths topic files updated with PQ_2022 (+44 Qs). 13 new Science topic files
created from Science-PQ (+46 Qs). All 13 retained Science topicKeys now
have APQ content. Authentic count 1,793 → 1,883.

### RESOLVED — Our Environment had 0 questions in question bank (PR #128)
Carry-over since PR #122 noted Our Environment was registered in topics.ts
but had no bank content. PR #128 added 4 Our Environment questions (3 Section
A + 1 Section B) from Science-PQ. Topic is now seeded; future passes can add
more density.

### CONFIRMED — B/C/D/E density doctrine works (PR #128)
PR #126 (PQ1+PQ2) had B=10, C=12, D=8, E=6 = 36 non-A questions. PR #128
applied the BOTH-OR-variants rule and got B=15, C=15, D=10, E=6 = 46 non-A
questions for similar paper volume. ~28% improvement. Doctrine working —
apply to all future extractions.

### OPEN — Science-PQ2 deferred (HIGH, next session)
P2 APQ finale paper. ~39 Qs + OR variants ≈ 45-50 Qs. Will APPEND to the 13
existing Science topic files (per "one file per topic, combined across papers"
spec). Same branch `content/additional-pq-sqp-2024`, rebase first onto
028d51d3... Text pre-extracted to `diff/_apq_text/`. Agent instruction file
`LazyTopper_Agent_P2_APQ_SciencePQ2_Instruction.md` ready; SHA placeholder
needs updating to current base before upload.

### OPEN — Content + product deliberation (MEDIUM, pre-launch planning)
New deliberation opened in PR #128 cycle — these are pre-launch product
decisions, not content extractions:
  - Notes per chapter (beyond exam tips) — no current surface
  - Formula sheets per topic — data exists in archetypes, no render surface
  - Proof library — proofs exist in P0/P0.5 packs, no dedicated surface
  - Tutor drawer audit — MentorSolveDrawer / ConceptTeachDrawer /
    TutorDrawerV2 don't receive student attempt data; decide keep / repurpose
    / remove before launch
Schedule planning session before next product PR.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~52 cumulative APQ questions (PR #126 + #128) tagged REQUIRES-FIGURE in
strategyHint. Plan: Option B (placeholder images) at launch; Option A (SVG
renders) post-launch.

### OPEN — Our Environment density (LOW, future extraction)
4 Qs is a starting density. Future extractions should add more. Sources
available: NCERT Ch 13 (renamed from Ch 15), Exemplar, future PYQs.

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
Unchanged. AR coverage still thin across both Maths and Science. Dedicated
`.assertionReasoning.ts` extraction pass scheduled after P2 APQ completes
(Science-PQ2). Target: 2-3 AR per topic.

### OPEN — TopicHub SEEDED 13/25 only (MEDIUM, content authoring)
Unchanged. 12 topicKeys with bank content do not yet have curated TopicHub
pages. Pre-launch decision required.

### OPEN — strategyHint not rendered on any surface (LOW, quick win)
Unchanged. Many questions have valuable strategyHints (especially REQUIRES-
FIGURE descriptions and CBSE step-marking guidance) but no UI surface renders
them. Quick UI win pre-launch.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix
before P5 PYQ extraction.

### OPEN — pyqSet format inconsistency (LOW, P5 cleanup)
Unchanged. Some AR files use full CBSE set codes (e.g., "30/1/1") rather
than short form. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production.

---

## 2026-05-25 — Post-PR #126 (P2 APQ Maths PQ1+PQ2) open items

### RESOLVED — P2 APQ Maths PQ1+PQ2 extraction (PR #126)
13 new `.additionalPQ.ts` files (one per Maths topic) created with 76 questions
combined from Mathematics-PQ1.pdf + Mathematics-PQ2.pdf. All 13 retained Maths
topicKeys covered. Anti-fabrication maintained; isPYQ false on all 76; pyqSet
omitted; Section E case-based as one row marks=4. Authentic count 1,717 → 1,793.

### LOCKED — Pack retirement threshold REVISED (4,500 from 6,000)
New decision in PR #126 cycle. Rationale: 5,000+ authentic is sufficient for
CBSE Class 10 prep. At 4,500 authentic, retire all AI packs (~2,815 Qs). Bank
becomes 100% authentic + 100% routable. No OCR phase needed.
Current progress: 1,793 / 4,500 = 39.8%.

### LOCKED — REQUIRES-FIGURE doctrine (PR #126)
Questions referencing PDF diagrams/tables/graphs that don't render in text
tag with `strategyHint: "REQUIRES-FIGURE: [description]"`. ~22 questions in
PR #126 carry this tag. Resolution path: Option B (placeholder image) at
launch, Option A (SVG render) post-launch.

### OPEN — REQUIRES-FIGURE backlog (LOW, post-launch resolution)
~22 Maths APQ questions in PR #126 + likely many more in upcoming Science APQ
extraction. Plan: enumerate post-launch, batch-resolve via either placeholder
images (faster) or SVG renders (higher quality). Track in a dedicated
follow-up issue when count grows.

### OPEN — B/C/D/E density gap (MEDIUM, doctrine-blocking)
Section A (MCQ/AR) over-represented across all extractions to date. PR #126
showed 40:36 A:non-A split. Future extractions MUST extract BOTH OR variants
for B/C/D/E sections to double non-MCQ density. Bake into all future
extraction agent instructions starting with P2 APQ continuation
(PQ_2022 + Science).

### OPEN — AR (Assertion-Reasoning) density gap (MEDIUM, post-P2-APQ)
AR coverage thin across all extractions. Dedicated `.assertionReasoning.ts`
extraction pass scheduled after P2 APQ completes. Target: 2-3 AR questions
per topic for both Maths and Science. Source: NCERT/Exemplar/APQ/SQP PDFs
with AR coverage we haven't extracted yet.

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Unchanged since PR #124. Our Environment chapter is in scope (Unit V, 5 marks);
topicKey `our-environment` is registered in topics.ts; but question bank has
0 questions tagged to this topicKey. Needs future content extraction covering
food chains, trophic levels, ecosystem interactions, pollution, waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post syllabusGuard 2026-27 doctrine fix (PR #124) open items

### RESOLVED — syllabusGuard incorrectly banned Our Environment subtopics (PR #124)
14 Our Environment ecology strings (Our Environment, Ecosystem, Food Chain,
Food Web, Biodegradable, Non-Biodegradable, Ozone Depletion, Ozone Layer,
Biological Magnification, Energy Flow, Trophic Levels, Trophic Level, Waste
Management, Environmental Problems) removed from Science banned list. Our
Environment is RETAINED in 2026-27 (Unit V, 5 marks, ecology scope).

### RESOLVED — syllabusGuard incorrectly banned Contraception/STDs (PR #124)
12 reproductive-health strings (Reproductive Health, Contraception, Family
Planning, STI, STDs, Sexually Transmitted Infections/Diseases, Barrier
Contraception, Contraception Methods, Reasons for Contraception,
Contraceptive Methods, Birth Control Methods) removed from Science banned
list. Reproductive health is RETAINED in 2026-27 (Ch 8 board scope).

### RESOLVED — 18 reproduction questions wrongly removed in PR #121 (PR #124)
All 18 questions restored from git history at pre-PR #121 commit `0222917e`.
Subtopics retagged to 2026-27-compliant values:
  - "Safe Sex and HIV/AIDS" for STD/HIV/safe-sex content
  - "Family Planning" for contraception/family-planning content
  - "Reproductive Health" for general reproductive-health content

### RESOLVED — Motor/Generator/EMI not tracked in archetypes (PR #124)
New `SCIENCE_DELETED_CHAPTERS_2026_27.formativeOnlyTopics` array added with
["Electric Motor", "Electromagnetic Induction", "Electric Generator"]. These
topics are taught in 2026-27 but not assessed in the year-end board exam
(Science_SecP1_2026-27.pdf Note for Teachers). Tracked in the prediction
engine; NOT banned in question bank (preserves the 36 formative practice
questions in magneticEffects.exemplar/pack1/pack2).

### RESOLVED — Sources of Energy doctrine cleanup (PR #124)
Sources of Energy was previously matched only as a subtopic-keyword fallback
under Our Environment. PR #124 promoted it to a proper `deletedTopics` entry
in cbseHistoricalArchetypes (Ch 14 is fully deleted from board scope). The
subtopic-keyword fallback was retained as a belt-and-suspenders measure for
any legacy questions still tagged with topic="Our Environment".

### OPEN — Our Environment has 0 questions in the question bank (LOW, needs extraction)
Our Environment chapter is in scope (Unit V, 5 marks), the topicKey
`our-environment` is registered in topics.ts with weight 4, but the question
bank currently has 0 questions tagged to this topicKey. Needs future content
extraction (NCERT Ch 13 of the new numbering, or Ch 15 of legacy numbering)
covering food chains, trophic levels, ecosystem interactions, pollution, and
waste management.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged
questions; PYQ filter returns 0 results when `pyqOnly===true`. Must fix before
P5 PYQ extraction. Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3"). Non-blocking — field is string |
undefined. Normalise during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore
in a future docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
Unchanged. No production Clerk instance configured. Pre-requisite for public
launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
Unchanged. AI features return 404 in production because vercel.json has no
/api/* rewrite.

---

## 2026-05-24 — Post-PR #121 open items

### RESOLVED — Reproduction bank syllabusGuard violations (PR #121)
The long-running V1 validation failure carried across PRs #117, #119, #120 is now fixed.
Removed 18 questions across the 3 reproduction banks (4 exemplar + 3 ncert + 11 pack2)
covering deleted Ch8 sub-topics (Reproductive Health, Contraception, STDs).

### RESOLVED — syllabusGuard compound-variant gap (PR #121)
3 questions used compound subtopics ("Barrier Contraception", "Contraception Methods",
"Reasons for Contraception") that slipped past the exact-match guard despite being
entirely about banned topics. Guard extended with these 5 strings (3 actual + 2 defensive
forward-looking variants: "Contraceptive Methods", "Birth Control Methods").

### RESOLVED — Reproduction bank regression coverage (PR #121)
35-test regression suite added at `scripts/src/reproductionBankGuard.test.ts`
(banned variants flagged + retained subtopics clean + substring safety +
multi-banned counted + repo-file regression lock). Wired into both `test:reproduction`
standalone and `test:matrix:all` (now 3 test files, 74 tests total).

### OPEN — ops/ acceptance test: Our Environment chapter assertion (MEDIUM, carry forward)
Unchanged since PR #117. `lazytopper/scripts/ops/cbse_registry_2026_27_acceptance.mjs`
(lines 26-30 EXCLUDED_CHAPTER_TITLES; lines 208-218 our_environment_chapter_present_in_scope
assertion) and `lazytopper/scripts/ops/science_deleted_zeroing_acceptance.ts` (lines 226-249
"food chains under Our Environment NOT zeroed") still contradict the doctrine that
Our Environment is fully deleted per CBSE 2025-26. Now the highest-priority follow-up.

### OPEN — K2H-8f PYQ engine filter (MEDIUM, pre-condition for P5)
Unchanged. `practiceSetGenerator.ts` does not bias pool toward `pyqYear`-tagged questions;
PYQ filter returns 0 results when `pyqOnly===true`. Must fix before P5 PYQ extraction.
Branch: `fix/pyq-engine-bias` | Mode: Medium.

### OPEN — pyqSet format inconsistency (LOW, carry forward)
Unchanged. Some AR files use full CBSE set codes (e.g. "30/1/1") in pyqSet rather than
the short form ("1"|"2"|"3"). Non-blocking — field is string | undefined. Normalise
during P5 cleanup pass.

### OPEN — .claude/ folder not in .gitignore (LOW)
Unchanged. Untracked .claude/ shows in every `git status`. Add to .gitignore in a future
docs-only PR. Do NOT stage it for any commit.

### OPEN — Clerk pk_live production key (unknown status)
No production Clerk instance configured. Pre-requisite for public launch.

### OPEN — API gateway / vercel rewrite for /api/* (no branch in progress)
AI features return 404 in production because vercel.json has no /api/* rewrite.

---

## 2026-05-23 — Post-PR #114 open items

### OPEN — Mojibake in P0.5 case-based + circles proof files (HIGH priority, UI render broken)
Files affected:
  lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts
  lazytopper/src/data/questionBanks/class10/science/science.caseBased.ts
  lazytopper/src/data/questionBanks/class10/maths/circles.proof.ts
Symptom: UTF-8 multibyte sequences rendered as Latin-1 garbage in questionText,
solutionSteps, answer, finalAnswer, explanation, strategyHint. Examples:
`â–³` (should be `△`), `âˆ¥` (`∥`), `âˆš` (`√`), `Â²` (`²`), `Î©` (`Ω`),
`â‚‚` (`₂`), `â†’` (`→`), `Â°` (`°`), `âˆ ` (`∠`), `â‚¹` (`₹`).
Origin: inherited from diff/ source pack files; not introduced by P0.5 merge script.
Action: PRE-P1 byte-level replacement pass. Branch `content/fix-p05-symbol-restoration`,
Low mode, data-only, ~30 min. Must merge BEFORE P1-M (Practise Papers extraction will
produce the same class of garbage if the recipe isn't established first).
Reference: NEXT_ACTION.md has the full replacement table.

### OPEN — pyqSet format inconsistency (LOW priority, carries forward from PR #112)
Still applies. The P0.5 case-based + circles proof files also use full CBSE set codes
(e.g. "30/1/1") in pyqSet rather than the short form ("1"|"2"|"3") that will be used
in P5 PYQ extraction. Non-blocking — field is string | undefined. Normalise during P5
cleanup pass across:
  triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts (P0)
  triangles.proof.ts, trigonometry.proof.ts (P0)
  science.assertionReasoning.ts (P0)
  maths.caseBased.ts, science.caseBased.ts, circles.proof.ts (P0.5)

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
Unchanged from post-PR #112. practiceSetGenerator.ts does not bias pool toward
pyqYear-tagged questions; PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction. Branch: fix/pyq-engine-bias | Mode: Medium.

### OPEN — .claude/ folder not in .gitignore (LOW priority)
Unchanged. Add to .gitignore in a future docs-only PR. Do NOT stage it for any commit.

### RESOLVED — P0.5 pack registration (PR #114)
21 questions registered from 3 diff/ pack files:
  maths.caseBased.ts: 6 Section E case sets (4 marks each; merged from 18 split sub-rows)
  science.caseBased.ts: 5 Section E case sets (4 marks each; merged from 15 split sub-rows)
  circles.proof.ts: 10 (5 Section C Short 3-mark + 5 Section D Long 5-mark)
topicKey normalisation complete (8 keys across 3 files).
"format": "Proof" → "Short"/"Long" applied to circles.proof.ts only (case-based files
use format="Case-Based" which is valid).
Mid-flight V2 blocker (33 mark/section mismatches) resolved via Option 2 restructure:
each split 3-row case set merged into one 4-mark Section E row. Owner-directed.
All 6 validations PASS. Merged as PR #114.
Authentic total: 1,609 → 1,630.

---

## 2026-05-23 — Post-PR #112 open items

### OPEN — P0.5 probe pending (LOW priority, quick win)
Three diff/ pack files not yet probed or registered:
  maths_case_based_pack.ts (~23.8 KB)
  science_case_based_pack.ts (~24.8 KB)
  circles_proof_pack.ts (~18.5 KB)
Expected pattern: same topicKey title-case issue as P0. Same fix.
Expected yield: ~30-80 questions (Section E case-based + circles proofs).
Action: Low mode agent, branch content/register-diff-packs-p05.

### OPEN — K2H-8f PYQ engine filter (MEDIUM priority, pre-condition for P5)
practiceSetGenerator.ts does not bias pool toward pyqYear-tagged questions.
PYQ filter returns 0 results when pyqOnly===true.
Must fix before P5 PYQ extraction — otherwise PYQ questions won't surface
via the PYQ filter even after extraction.
Branch: fix/pyq-engine-bias | Mode: Medium

### OPEN — pyqSet format inconsistency (LOW priority, cleanup)
AR files registered in PR #112 use full CBSE set codes ("30/1/1") in pyqSet
rather than the short form ("1"|"2"|"3") that will be used in P5 PYQ extraction.
Non-blocking — field is string | undefined. Normalise during P5 cleanup pass.
Files: triangles.assertionReasoning.ts, trigonometry.assertionReasoning.ts

### OPEN — .claude/ folder not in .gitignore (LOW priority)
The .claude/ IDE state folder is untracked (shows in git status).
Add to .gitignore in a future docs-only PR.
Do NOT stage it for any content commit.

### RESOLVED — Pass 1C gdrive unprobed folders
All 6 unprobed gdrive subfolders assessed. Key findings:
  Science/Chapter-wise/: ~1,422 net new Qs — added as P4b to extraction queue
  cbse-papers/PYQ/: 26 READY papers, ~784 net new Qs
  Science/NCERT Examplers 2020/: 100% duplicate — permanently skip
  misc/: English literature only — permanently skip
  Maths/PYQs/: all Basic — permanently skip
  Sample+Preboard: ~199 PDF-extractable Qs — added as P6

### RESOLVED — P0 pack registration (PR #112)
62 questions registered from 4 diff/ pack files.
topicKey normalisation complete.
"format": "Proof" schema issue found and fixed (→ "Short"/"Long").
All 6 validations PASS. Merged as PR #112.

## 2026-05-23 — Post-PR #109 open items

### OPEN — Pack quality audit required (HIGH)
~2,470 existing pack1/pack2/pack3 questions are AI-generated without
source PDF verification. quality-assessment-report.md (in diff folder)
has full details. Decision needed: keep/fix/replace strategy.

### OPEN — PYQ extraction pending
87 text-extractable CBSE papers available (2023/2024/2025).
extraction-report.md documents 220 Triangles+Trig questions already
extracted with symbol stripping issues.
Separate sessions needed: Maths PYQ + Science PYQ.

### OPEN — assertion_reason_pack.ts not yet registered
File exists at C:\Users\Chetan\OneDrive\Desktop\diff\assertion_reason_pack.ts
Needs schema validation and canonicalQuestionBank.ts registration.

### OPEN — K2H-8f PYQ filter engine fix
practiceSetGenerator.ts does not bias pool toward pyqYear questions.
PYQ filter returns 0 results. Fix after PYQ extraction completes.

### RESOLVED — Maths ch1-14 NCERT+Exemplar extraction
643 questions across 26 files. All wired into engine. PR #109 merged.

### RESOLVED — PR #108 deletionGuard test fix
3 broken assertions fixed. All 29 tests passing.

---

## 2026-05-22 — PR #106 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — re-extracted from correct PDF, but extra eyeball wise)
Priority: **Medium**

### OPEN — PR numbering correction

Handoff previously recorded Science ch8-12 as PR #104.
Actual GitHub PR numbers: **#106** (content) and **#105** (handoff docs).
Priority: **Low** (documentation only)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted, wired, and engine-reachability verified.
PRs #105 (docs) and #106 (content) merged. Base SHA: `dfbf725a362b11a4113ec63f4ecebbaa792848a3`.

---

## 2026-05-22 — PR #104 follow-ups

### OPEN — Spot-check Science ch8-12 question accuracy

Owner should verify 10-15 random questions especially:
- Electricity numericals (`electricity.ncert.ts`, `electricity.exemplar.ts`) — solutionSteps accuracy, units, sign convention
- Heredity Punnett squares (`heredity.ncert.ts`, `heredity.exemplar.ts`) — genotype/phenotype ratios
- `light.exemplar.ts` against `jeep110.pdf` (fabrication incident — original agent generated 27 questions from training data before mislabelled source was caught; file deleted and re-extracted from correct PDF, but extra eyeball is wise)
Priority: **Medium** (pre-merge)

### RESOLVED — Science ch8-12 engine extraction

296 questions extracted across 10 files and wired into `canonicalQuestionBank`. All 5 topicMatches() routing simulations pass against actual topics.ts slugs. Engine reachability live-import test: 296/296 PASS.

### RESOLVED — Ch 13 "Our Environment" inclusion question

Confirmed deleted from CBSE 2026-27. Not extracted. Existing legacy `ourEnvironment.pack1.ts` / `.pack2.ts` retained but not added to.

### RESOLVED — Slug mapping in original Ch8-13 prompt

Original prompt proposed `heredity-and-evolution` and a shared `light-reflection-and-refraction-incl-human-eye-prism` slug for Ch9+Ch10. Neither exists in `topics.ts`. Per Rule 2 (use topics.ts verbatim), all new files use the actual canonical slugs: `heredity`, `light-reflection-and-refraction`, `human-eye-and-colourful-world`, `electricity`, `magnetic-effects-of-electric-current`. Engine routes correctly.

---

## 2026-05-22 — PR #101 + #102 follow-ups

### OPEN — `deletionGuard.test.ts` needs updating

3 assertions in `scripts/src/deletionGuard.test.ts` (lines 110-130) now fail after PR #102 populated `MATHS_DELETED_CHAPTERS_2026_27`. Fix in next small PR before any `pnpm test` run.
Priority: **High** (blocks clean CI)

### OPEN — CI not using pnpm (syllabusGuard never runs in CI)

Both GH Actions workflows use npm; root `preinstall` rejects npm. `syllabusGuard` only runs on manual `pnpm build` locally.
Fix: update workflow yml to use pnpm setup + `pnpm build`.
Priority: **Medium** (post-launch)

### RESOLVED — Clerk OAuth 404 on Vercel preview deployments

Fixed by PR #101. `forceRedirectUrl` now uses full absolute URL with BASE_PATH prefix. Verified working on Vercel after merge.

### RESOLVED — 608 Science ch1-7 questions invisible to engine

Fixed by PR #102. All 608 questions now wired into the canonical bank.

### RESOLVED — topicKey mismatch for Control & Coordination and Reproduction

Fixed by PR #102. Both files retagged to canonical `topics.ts` slugs.

### RESOLVED — Maths syllabus guard missing Constructions chapter

Fixed by PR #102. `syllabusGuard.ts` and `cbseHistoricalArchetypes.ts` both updated and now in sync.

---

## 2026-05-22 — PR #100 follow-ups (post engine wiring + topicKey fixes + syllabus guard patch)

### OPEN — Maths question bank empty (no NCERT/Exemplar extraction yet)

All 13 Maths topics have only pack1/pack2/pack3 questions. NCERT + Exemplar extraction pending (`content/question-bank-expansion-03`).
Priority: **High** (pre-launch content depth)

---

## 2026-05-17 - PR #82 Login polish follow-ups and PR-K2H-6 next stage

Status:
Active follow-ups after PR-K2H-5 / PR #82 merge.

Observation:
PR #82 passed validation and owner Vercel preview QA for the production Login gate. Login now better aligns with the frozen landing and Lovable/topic-focus-lite LoginGate visual/composition direction while preserving real Clerk SignIn, reason-aware prompts, redirect priority, safe redirects, no guest CTA, and no app shell/sidebar/bottom nav.

Action:
- Production launch still requires Clerk production instance / `pk_live` env configuration. Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture a Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control and should not be described as fixed by app UI polish.
- PR-K2H-6 is the recommended next implementation stage: Home/cockpit learning order + Continue repair.
- K2H-6 should make Home/browse cockpit order match Exam Trends -> Practice -> Worksheets -> Check & Improve.
- K2H-6 should repair "Continue where you left off" so it never routes to TopicHub "Topic not found"; if the topic is not curated, hide the continue card or route safely to Practice Hub / Exam Trends with honest state.
- Do not touch landing, Login, pricing, Practice internals, HPQ, or TopicHub content unless a future K2H-6 prompt explicitly scopes it.
- Do not start PR-K2H-6 until this docs-only handoff update is merged.
- Future product prompts must use `base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

Parked PRs:
- PR #69 solution provenance / student notices remains open draft and must not be mixed.
- PR #17 diagnostic categories remains open draft preservation-only and must not be mixed.
- Old mobile PRs #1/#2 remain outside the desktop K2H lane unless separately audited.

Operating model:
- Codex should be used for code edits, local validation, screenshots, source diff/report only.
- Owner will use VS Code PowerShell for commit, push, and PR creation/update unless explicitly overridden.
- GPT remains prompt writer, source/PR auditor, and merge recommender.

## 2026-05-16 - PR #80 follow-ups after frozen landing merge

Status:
Active follow-ups after PR-K2H-4 / PR #80 merge.

Observation:
PR #80 passed QA and implemented the frozen landing page plus Explore-first `/browse` entry. Landing should not be redesigned casually. The next highest-priority visible gap is Login visual parity / auth gate polish.

Action:
- Login visual parity / auth gate polish is the recommended next implementation PR. It must keep real Clerk auth, no guest mode, reason/redirect handling, safe redirects, Explore/sign-in funnel behavior, and improve visual match to the calm split login prototype. Do not alter payment/pricing/practice/HPQ in the same PR.
- Clerk friction / auth strategy remains an open product question. Observed flow can include LazyTopper login -> Google account chooser -> Clerk consent/continuation screen -> product. Short-term: polish Login around Clerk. Long-term: evaluate whether Clerk should remain or whether direct Firebase/Google/phone OTP is better for launch. Do not remove Clerk without a dedicated auth architecture PR.
- Home/cockpit card order follow-up remains. Owner noted logical learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve. Sidebar already better reflects the learning order. Home cards may still need reordering in DesktopHome in a future PR. Do not mix with Login PR unless explicitly approved.
- Pricing visual redesign remains pending. Pricing is functionally safer after PR #78 but visually not aligned with final product grammar.
- Continue where you left off route repair remains pending. It can still route to TopicHub "Topic not found." Future small PR may hide the card when saved topic is not curated, route to Practice Hub/Exam Trends, or map to safe topic slug.
- `/profile` direct-reference cleanup remains pending. PR #78 protects `/profile` via redirect/login handling, but future route-hardening can replace direct `/profile` references with `/me` where appropriate.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified. Normal client UI must never mark premium directly.

Landing doctrine after PR #80:
- Public landing is frozen.
- One primary CTA only: Explore.
- No Start free trial on landing.
- No Explore as Guest on landing.
- Explore opens browse mode for product inspection only; it must not create a fake guest learner.
- Real actions remain action-gated through auth/trial gate where already implemented.

## 2026-05-16 - PR #78 QA follow-ups and frozen landing target

Status:
Active follow-ups after PR-K2H-3 / PR #78 merge.

Observation:
PR #78 passed QA with follow-up. Login/auth/session behavior is safer and functionally correct, but visual and route/content polish remains.

Action:
- Login visual parity remains a follow-up. The right-side Clerk/auth panel should be polished while preserving real Clerk auth, reason/redirect behavior, split layout, and no guest CTA.
- Pricing visual redesign remains a follow-up. Pricing is honest but not yet aligned with final LazyTopper product/landing design grammar.
- Home "Continue where you left off" can route to TopicHub "Topic not found"; hide the card when the saved topic is not curated, route to Practice Hub/Exam Trends, or map to a safe topic slug.
- Remaining direct `/profile` references can be cleaned later; PR #78 protects them through `/profile` -> `/me` redirect.
- Payment gateway is parked. Future payment activation must be server/admin verified; client UI must never mark premium directly.

Historical frozen landing page target before PR #80:
- Superseded by PR #80 implementation. Current doctrine is one primary CTA text `Explore`, CTA below the four cards and above Mistake Intelligence, no Start free trial, no Explore as Guest, and no casual redesign unless owner explicitly reopens landing design.
- No left sidebar on landing.
- One primary CTA only: Explore LazyTopper. Historical note: PR #80 final CTA text is `Explore`.
- Top-right secondary CTA: Sign in.
- Hero headline: Study smarter for CBSE Class 10.
- Visual storyboard over wall of text.
- Product loop shown visually: Exam Trends -> Practice -> Check & Improve -> Mistake Intelligence -> Me / Progress.
- Mistake Intelligence is the emotional/product centerpiece.
- Me / Progress is shown as the connected dashboard.
- Final composition uses layout/style/color/CTA/sign-in treatment from final option and card content/story richness from option 7.
- Landing must stay in sync with overall LazyTopper design grammar: deep navy, soft white, green accent, elegant cards, calm premium CBSE Class 10 study cockpit.

## 2026-05-13 - PR #75 merged; post-K2H-1 follow-ups

Status:
Active follow-ups after PR-K2H-1 / PR #75 merge.

Observation:
PR #75 hardened Practice checked-evidence states and allowed trusted wrong MCQ attempts to feed existing mistake-history evidence for eligible signed-in non-local-session learners. It did not add a broad durable attempt-log model, advanced Practice filters, route/context repairs, sign-in/trial enforcement audit, Mock detail finalisation, or HPQ quality repair.

Action:
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- HPQ -> Build mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Sign-in/trial enforcement pass across learning surfaces so Firestore-backed Me / Progress and Mistake Intelligence can work reliably.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

Data-honesty rules:
- MCQ click is a real answer attempt.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history remains deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence should be introduced.

PR #69 / K2D warning:
PR #69 / K2D remains separate. Do not merge blindly. Do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12 - PR #73 K2H follow-up seed; superseded by PR #75

Status:
Historical follow-up seed. Current active implementation after PR #75 / PR-K2H-1 is PR-K2H-2 route/context repair.

Observation:
PR #75 / PR-K2H-1 is merged. Next active implementation is PR-K2H-2 route/context repair. PR #75 completed the first checked-evidence hardening slice, but durable Practice evidence, routing, filtering, sign-in/trial, step-solution, Mock, and HPQ quality follow-ups remain.

Action:
- PR-K2H-2 route/context repair:
  - HPQ Build Mock back navigation should return to HPQ, not old Exam Trends.
  - TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Durable MCQ answer-attempt model for correct and wrong attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- Sign-in/trial enforcement pass across learning surfaces.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

## 2026-05-08 - PR #72 final GPT audit pending

Status:
Active before PR #72 review/merge.

Observation:
PR #72 has Vercel preview evidence and manual authenticated HPQ QA recorded, but final GPT owner audit of the GitHub diff and scope is still pending.

Action:
Owner should audit PR #72 diff, validation, QA evidence, and changed-file scope before marking ready for review or merge.

## 2026-05-08 - PR #72 HPQ Browser QA auth/paywall blocked; manual QA substituted

Status:
Recorded QA limitation.

Observation:
Browser Agent verified Practice visual grammar, but HPQ / Exam Trends Browser QA was blocked by the Premium Feature interstitial in guest state. Browser Agent cannot complete magic-link authenticated QA. Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.

Action:
Treat HPQ Browser QA as inconclusive due to auth/paywall limitation, not as product failure. Preserve manual QA evidence in handoff and proceed to final GPT audit.

## 2026-05-08 - Practice Level-3 detail finalisation after PR #72

Status:
Next implementation stage after PR #72 merge.

Observation:
PR #72 handles broad Practice + HPQ visual grammar alignment. Practice still needs a detail pass focused on execution/detail states, CTA hierarchy, question interaction, option interactivity if needed, source/return behavior, responsive polish, and honest unavailable states.

Action:
Start Practice detail finalisation after PR #72 is merged and base advancement is verified.

## 2026-05-08 - Mock pages Level-3 detail finalisation after Practice details

Status:
Post-Practice follow-up.

Observation:
Mock builder / mock attempt / mock review pages need Level-3 desktop grammar and clear lifecycle wording.

Action:
Run Mock page detail finalisation after Practice detail stage. Do not claim mock performance feeds Mistake Intelligence until real graded mock evidence exists.

## 2026-05-08 - HPQ question / solution quality later

Status:
Deferred until after Practice and Mock detail stages unless the product owner reprioritises.

Observation:
Manual authenticated QA found remaining HPQ question, solution, diagram, and completeness issues. These are content/data/quality issues, not PR #72 visual grammar issues.

Action:
Sequence this as audit report first, then data-only structured options normalization, then solution/diagram/cache quality repair.

## 2026-05-08 - PR #72 Vercel / Browser QA state

Status:
Active follow-up before PR #72 merge.

Observation:
PR #72 has a Vercel preview at `https://lazytopper-production-desktop-ja96piv2q.vercel.app/app/`. Browser Agent verified Practice visual grammar but could not complete HPQ / Exam Trends QA because guest state hit the Premium Feature interstitial. Product owner manually verified authenticated HPQ on preview.

Action:
Proceed to final GPT owner audit. Do not claim PR #72 is merge-ready until that audit passes.

## 2026-05-08 - Science / Maths HPQ MCQ structured options normalization

Status:
Future data-only PR.

Observation:
Codex read-only Science audit found 29 Science MCQ / AssertionReason items. Structured `options` / `aROptions` exist for 14, and `correctOption` exists for 14. Missing structured option examples include `mnm-hpq-101`, `lp-hpq-101`, `sci-cre-hpq-1`, `sci-abs-hpq-1`, `2026-MNM-01b`, and `sci-light-hpq-1`.

Action:
Create a separate data-only normalization PR for Science and Maths MCQ / Assertion-Reason structured options. Do not invent options in UI and do not modify grading/checking APIs.

## 2026-05-08 - Local gateway and env requirements for HPQ step-solution QA

Status:
Document for future QA.

Observation:
Frontend Vite proxies `/api` to `API_SERVER_PORT`, using `8080` locally. If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`. Running `npx --yes pnpm@10.23.0 run dev:gateway` with `PORT=8080` starts the LazyTopper AI server. Without `DATABASE_URL` and provider API keys, cache/generation may be limited or stubbed.

Action:
Future local QA for HPQ solution logic must start both frontend and backend gateway and must not treat missing local env as production proof.

## 2026-05-08 - Mock grading to Mistake Intelligence and Me / Progress

Status:
Future product work.

Observation:
PR #72 keeps Add to mock as basket/planning-only. Actual written-and-graded mocks should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Action:
Plan a later evidence-path PR for mock grading output to Mistake Intelligence and Me / Progress. Do not claim this in PR #72.

## 2026-05-08 - PR #69 / K2D remains separate

Status:
Still draft/open/not merged unless live GitHub verification later says otherwise.

Observation:
PR #69 / K2D remains separate from PR #72 and must not be merged blindly. PR #72 must not cherry-pick or absorb K2D code unless explicitly approved.

Action:
Verify live GitHub state before acting on PR #69. Rebase/update and audit separately if it is revived.

## 2026-05-06T00:00:00Z - K2D normalization after K2C

Status:
K2D is the next stage after post-K2C handoff repair and Vercel-Codex setup.

Observation:
K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Action:
Do not start K2D until Vercel setup is complete and /app/ deployment is verified on base d9d0d5df1e9de45df4e555b186903070e7b0e873.
# LazyTopper Open Questions and Follow-ups

This file tracks unresolved items so they do not get buried in session logs.

Newest items should be added at the top with UTC timestamp.

## 2026-05-07 Ã¢— Practice and HPQ Level-3 design grammar alignment

Status:
Active follow-up before desktop graduation sign-off.

Observation:
During manual 7-day trial QA, Practice and HPQ old-format pages were confirmed functional but visually outdated. They do not echo the Level-3 / desktop design grammar of the overall LazyTopper site. While functionally correct, this visual/design parity gap is a key item for pre-graduation review.

Action:
Plan a future scoped PR (likely PR-K2F or equivalent) to align Practice and HPQ surfaces with the upgraded Level-3 desktop design grammar. Do not block trial entitlement. Add to implementation roadmap for post-K2E stage.

## 2026-05-07 Ã¢— Browser Agent cannot complete magic-link auth without inbox access

Status:
Permanent QA caution for trial entitlement testing.

Observation:
Browser Agent could not automate the magic-link email login flow because it lacks access to the email inbox. This blocked Browser Agent from completing full trial entitlement QA for trial/expired/premium states. Manual human QA substituted successfully after signing in with a real magic link.

Action:
For future Browser Agent trial entitlement testing, either: (1) set up a passwordless or test-account-based QA flow for Browser Agent, or (2) document that manual QA is required for magic-link-gated trial testing.

## Active follow-ups after K1B / K1C / handoff setup

### K1B Practice query polish

Status:
Follow-up only.

Observation:
Browser QA reported that one K1B query route may sometimes require one click on the Trigonometry chip before the context bar reflects Trigonometry.

Action:
Re-check later during route/context hardening. Do not block K2A.

### /app/me shell consistency

Status:
Follow-up only.

Observation:
K1C QA noted /app/me sometimes rendered without DesktopShell when directly loaded, while still honest and usable.

Action:
Track for later shell-route consistency pass. Do not block K2A.

### Codespaces Browser Agent access

Status:
Permanent QA caution.

Observation:
Browser Agent can sometimes access Codespaces previews, but can also fail due to certificate, forwarding, port, login, or safe-browsing issues.

Action:
Prefer deployed public preview for Browser Agent. Use manual human QA for Codespaces-only URLs when needed.

### Revised Level 3 improvement prototype

Status:
No canonical finalized prototype.

Observation:
The revised Level 3 improvement prototype could not be finalized. Some experimental prototypes were discarded or considered non-canonical.

Action:
For K2 onward, use product-native specs and QA gates. Use Level 1/2 references for visual grammar and historical Level 3 for behaviour inspiration only.

### AI fallback solution

Status:
Future PR-K2D.

Observation:
A student should not feel a solution availability gap. If stored solution is missing, product should generate a board-style solution through AI, matching the stored solution format.

Action:
Do not implement in K2A. Plan as a separate later PR.

### Tutor and examiner quality polish

Status:
Future K6.

Observation:
Product should be useful from student, tutor, and CBSE board examiner lenses.

Action:
Add tutor/examiner wording and quality checks later, after real worksheet/check/progress paths are grounded.
---

## PR-K2H-6 Continue Repair Decision — Option B

Owner-approved decision: use Option B for the K2H-6 “Continue where you left off” repair.

Saved worksheet memory:
- CTA label: `Continue worksheet plan`
- Route: `/practice/worksheets`
- Preserve `source=home` and `returnTo=/`

Grade + subject memory only:
- CTA label: `Resume with Exam Trends`
- Route: `/exam-trends?subject=<subject>`
- Preserve `source=home` and `returnTo=/`

Profile-only memory:
- Do not show a Continue CTA.

No broad grade/subject-only memory should route to TopicHub.
TopicHub should only be used for resume in a future PR if there is a verified curated topic key or safe topic mapping.

Home primary cards should be ordered:
`Exam Trends -> Practice -> Worksheets -> Check & Improve`

Likely K2H-6 product scope:
- `lazytopper/src/pages/desktop/DesktopHome.tsx`
- `lazytopper/src/lib/desktop/landingMemory.ts`

Read-only inspect:
- `lazytopper/src/App.tsx`
- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
- `lazytopper/src/lib/desktop/topics.ts`

K2H-6 non-goals:
- Do not touch landing, Login, pricing, Practice internals, HPQ, Mock, TopicHub content, docs/handoff, package/server/env/data in the product PR unless explicitly rescoped.
- Do not redesign Home.
- Do not create fake memory, fake topic history, fake attempts, or fake personalization.
- Do not change `/browse` behavior unless source audit proves it is necessary.
- Do not route to old `/trends/:grade/:subject`.
- Do not hard-code `/app` routes in source.

---

## Post-PR #85 / PR-K2H-6 handoff update

PR #85 / PR-K2H-6 — Home cockpit order + safe Continue repair is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #85: `c5515abf5cf616137391dc02f5e673ecc098baac`
- PR #85 head SHA: `f490a59bb97857e6be484fa288872eb625d69fd6`
- PR #85 merge commit / new base: `a0e540a837cebe21ffdb8537b9da241537f42fd9`

What PR #85 changed:
- Reordered Home cockpit primary cards to: `Exam Trends -> Practice -> Worksheets -> Check & Improve`
- Implemented K2H-6 Option B for Continue/resume behavior:
  - saved worksheet memory -> `Continue worksheet plan` -> `/practice/worksheets`
  - grade + subject memory -> `Resume with Exam Trends` -> `/exam-trends?subject=<subject>`
  - profile-only memory -> no Continue CTA
- Removed broad grade/subject memory routing to TopicHub to avoid TopicHub "Topic not found" risk.
- Preserved `/browse` behavior, no guest mode, no fake memory, and no fake personalization.

Files changed by PR #85:
- `lazytopper/src/lib/desktop/landingMemory.ts`
- `lazytopper/src/pages/desktop/DesktopHome.tsx`

Validation and QA:
- TypeScript passed.
- Production build passed with `NODE_ENV=production` and `BASE_PATH=/app/`.
- Production verifier passed: `8 passed, 0 failed`.
- `git diff --check` passed.
- Local `/app/browse` visual QA passed.
- Vercel `/app/browse` visual QA passed.
- Confirmed card order: `Exam Trends -> Practice -> Worksheets -> Check & Improve`.
- Local `/api/cbse-exam-date?class=10` proxy error remains a non-blocking local backend issue unrelated to PR #85.

Next recommended product stage:
- Pricing visual redesign, no payment gateway yet.

Pricing next-stage doctrine:
- Redesign Pricing so it visually matches the frozen landing, Login, and desktop cockpit grammar.
- Keep pricing honest: manual activation/payment not automated yet.
- Do not add fake checkout.
- Do not add fake premium unlock.
- Do not mark premium from normal client UI.
- Do not implement payment gateway in the visual redesign PR.
- Payment gateway / UPI / manual activation remains a later launch-readiness stage requiring server/admin verification.

Future implementation prompts must start from:
`base/approved-thru-437 @ a0e540a837cebe21ffdb8537b9da241537f42fd9`
