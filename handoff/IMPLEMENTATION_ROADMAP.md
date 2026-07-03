# LazyTopper Implementation Roadmap

This roadmap preserves the staged implementation plan after PR #82 merge.

## 2026-07-03 — Firestore undefined-field persistence fix MERGED (#322, `706cc12`) — PR-B (#321) now LIVE end-to-end

Trunk `706cc12`. The durable per-student attempt record (PR-B, #321) was merged but **non-functional**: `firebaseClient.ts` initialised Firestore with `getFirestore(app)` (no `ignoreUndefinedProperties`), so the SDK threw `"Unsupported field value: undefined"` on every attempt doc (they carry `undefined` `bloomSkill`/`topicName`), and fire-and-forget `.catch(() => {})` silently swallowed it. #322 (2 files) switched to `initializeFirestore(app, { ignoreUndefinedProperties: true })` and un-muted the two write catches to `console.warn`. Isolated worktree; cofounder byte-reviewed; owner LIVE-VERIFIED end-to-end on production (`practiceInsights/{uid}/attempts` now writes with all fields; repeat grade = no duplicate; `mistakeLogs` regression clean). See D32/D33.

**Progress-build staging:** step 1 (recordAttempt front door) + step 2 (durable subcollection, PR-B) are now genuinely LIVE. **NEXT = step 3, the Universal `<ResultsScorecard>`** (spec `LazyTopper_Universal_Scorecard_Spec_2026-06-25.md`) — the shared honest results surface across Quick Practice / Worksheet / Check & Improve / Chapter Test.

## 2026-06-24 — Worksheet PR-A: grade-results redesign (presentation only) MERGED (#295, `1a85186`) — ⚠ owner live-verify PENDING

Trunk `1a85186`. The worksheet grade UI rebuilt to the LOCKED redesign spec, on top of the E2b grade loop. **PRESENTATION ONLY — the grader (`checkSolution.cjs`) is BYTE-UNCHANGED (absent from the diff).** Isolated worktree; opened as a draft; cofounder-reviewed clean; owner-merged; no self-merge. Report: `report-pr-a-worksheet-grade-redesign-2026-06-24.md`.

**Worksheet grade UI redesign — what this delivers (the worksheet *UI* redesign closes here):**
- ✅ **Auto scorecard popup** (NEW `WorksheetScorecard.tsx`) — on grade-complete, navy LOCKED design, four-type breakdown from `mistakeSummary` (Knowledge gaps / Careless), responsive **desktop modal ↔ mobile bottom sheet**, all-pending disables both buttons.
- ✅ **Tap-to-reveal sheet** (`WorksheetGradePanel.tsx`) — collapsible per-section expanders + Download/Practise action row.
- ✅ **Branded graded PDF** (NEW `WorksheetGradedPrintDoc.tsx` + `exportGradedWorksheetPdf`) — the EXISTING `html2canvas→jsPDF`+KaTeX path (shared `renderElementToPdf` refactor; `exportWorksheetPdf` behaviour-identical); renders the SAME response (no second grade call); pending stays honest.
- ✅ **Summary-leak fix** (display-only) + **`WS-{S}-{TOPIC}-{NN}` nomenclature** (device-local count) on scorecard + sheet + PDF.
- Gates GREEN + CI quality-gate GREEN; `checkSolution.cjs` diff EMPTY; no forbidden files. 6 files +1003/−20.
- ⏳ **OWNER LIVE-VERIFY PENDING** — the UI/PDF round-trip (scorecard popup both widths; four-type; Read/Download/✕ close; PDF marks match screen; all-pending disable; name/code; Check & Improve non-regression).
- ⏳ **NEXT (after live-verify): PR-B** — the DURABLE per-student worksheet record (Firestore-by-UID: nomenclature durable + seen-set question-uniqueness + Me/Progress journey + scorecard persistence + parent/teacher storage foundation, §B6 wellbeing-framing + minor-consent). Then the parent/teacher VIEW (later, deliberate). The separate Topic Hub queue (PR-F → PR-G) is unaffected.

## 2026-06-24 — Worksheet PR-E2b: one-PDF AI grade loop + MI wiring MERGED (#291, `60c5bf9`) — ⚠ owner live-verify PENDING

Trunk `60c5bf9`. The SECOND half of the worksheet (E2a foundation merged) — the AI grade loop. One uploaded PDF graded in ONE structured call against the KNOWN scheme keyed Q1…QN, per-question results with honest "graded X/Y + N pending" totals, each legible mistake fed to MI via the single front door. Isolated worktree; rebased post-Z3 with ZERO conflicts; cofounder review clean; owner merged; no self-merge. Report: `report-pr-e2b-worksheet-grade-loop-2026-06-23.md`.

**Topic Hub PR-E2 (Worksheet) — now CODE-COMPLETE:**
- ✅ **PR-E2a → E2a.3 (#280/#283/#284)** — the foundation (responsive generator, distribution, real-math PDFs, persist-by-`worksheetId`, view-aware Back, MI-enrich anchor).
- ✅ **PR-E2b (#291)** — the AI grade loop: additive `gradeStructuredSet` core + `handleGradeWorksheet` in `checkSolution.cjs` (**existing Check & Improve grader byte-unchanged → zero regression**), `POST /api/grade-worksheet`; client `gradeWorksheet()` + `worksheetGradeService` (map-by-number, persist, single `recordMistake` + `recordAttempt` front door, stable `ws:<id>:q<N>` idempotency) + `WorksheetGradePanel`. Honest-failure `couldNotRead` (never fabricate a mark, never zero an unreadable answer); trusted per-question marks; grade core surface-agnostic (Chapter Test / Full Mock reuse). Gates GREEN + CI quality-gate GREEN; no forbidden files.
- ⏳ **OWNER LIVE-VERIFY PENDING** — the AI round-trip on the Firebase-authorized trunk URL (5-Q drill; honest pending path; MI feed + careless/knowledge-gap routing; Check & Improve non-regression; no double-count on re-upload; phone). After it passes the worksheet (E2a+E2b) is DONE.
- ⏳ **PR-F (NEXT after live-verify): content fill** (Examiner's tips + Notes). ⏳ **PR-G:** delete dead old-mobile + retired MockBuilder/TutorDrawerV2/MentorPanel + the un-routed worksheet twins.
- New follow-up **[FU-ASYNC-GRADING]** (large worksheets may truncate the one structured call — sync now, async deferred); carried [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE].

## 2026-06-23 — Z3 Competency extraction MERGED (#292, `b1d3e46`) — bank-extraction PILOT (new parallel content track)

Trunk `b1d3e46`. The **EXTRACTION PILOT** — proving the extract→classify→syllabus-filter→schema→bank→verify pipeline on the cleanest content slice (`Z3. Competency Based Questions`, Maths) so it can scale to the worksheet folders with confidence. **102 net-new AUTHENTIC competency/case-based Maths questions** in NEW `questionBanks/class10/maths/competency.z3.ts`, wired by ONE import + ONE spread. Isolated worktree; owner-approved + squash-merged; no self-merge (gated `src/data`). Report: `Desktop\Content\extraction\report-z3-competency-extraction-2026-06-23.md`.

**Bank-extraction track — what this proves:**
- ✅ **Pipeline proven end-to-end** — DOCX (python-docx + ftfy) → topic-classify (topic-headed) → syllabus-filter at the QUESTION level (drop/rewrite vs the live `syllabusGuard.ts`) → `CanonicalQuestion` schema (enums, `[N mark]` sums) → bank wiring (fragile two-place import+spread) → gates + a silent-zero floor test. THE DECOUPLE held: authentic verbatim questions + AI-authored step-marked solutions, PENDING owner/teacher verify; all marks inferred.
- ✅ **Authentic tier** (`.z3` non-`.pack`, absent from `AI_GENERATED_PACK_SOURCES`, no `pyqYear` → "others" bucket). Source 117 → 102 kept (15 dropped: 10 Polynomials, 1 complementary-trig, 3 solid-conversion). 28 `requiresDiagram` rows with data read from the embedded figures + 119 staged WebP.
- ⏭️ **NEXT (this track, when owner authorizes): scale to the worksheet folders** — the same recipe, folder by folder, each its own gated PR + STOP for owner verification; bind the staged Z3 figures ([FU-Z3-FIGURE-BIND]); teacher-verify the flagged rows ([FU-Z3-TEACHER-VERIFY]).

---

## 2026-06-22 — Note-spec validator gate MERGED (#289, `c525b2a`) — notes track, gated step 1

Trunk `c525b2a`. The notes track's gated-build-order **step 1**: `notes/validate_spec.py` (the anti-fabrication gate that makes the ~35-note fan-out safe) + the schema v1.1 contract + the validated Light reference spec + negative fixtures. Isolated worktree; owner squash-merged; no self-merge. Report: `report-validate-spec-2026-06-21.md`. Full track detail: **`handoff/NOTES_TRACK_HANDOFF.md`**.

**Notes track — gated build order:**
- ✅ **Step 1 (#289): `notes/validate_spec.py`** — 9-rule validator (source-required; topic_key ∈ topics.ts; banned-phrase via the trap-safe `SURFACE_BANNED_PHRASES`; third_tab kind+shape; example kind; mojibake; ledger count; figure manifest; figure_ref resolution). stdlib only, no bypass. Reads `syllabusGuard.ts` + `topics.ts` live. Light VALID; 5 negative fixtures each trip exactly one rule. Committed `notes/NoteSpec_Schema.md` (schema v1.1) + `notes/specs/light-reflection-and-refraction.json` (reference spec) — **the contract PR-F builds against**.
- ⏭️ **Step 2 (NEXT): content PR under `notes/`** — evolve the kit to `render_note(spec)` (preview HTML generated from the spec); finish Light's figure (base64→WebP) + mindmap (D3-JS→`spec.mindmap`) lift; un-route the `_TODO`.
- ⏳ **Step 3 (parallel, after step 2): PR-F** (`<Note>` component + Topic Hub wiring; reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated.
- ⏳ Later: wire `validate_spec.py --json` as a `SubagentStop` hook (not yet done).

---

## 2026-06-22 — Notes-generation track Step-1 MERGED (#282, `de2a616`) — parallel content track

Trunk content `de2a616` (#282; merged 2026-06-21 13:42Z, the FIRST of the recent cluster but a separate PARALLEL CONTENT track). Generating Class-10 CBSE chapter notes from the official NCERT 2026-27 PDFs in the locked LazyTopper note grammar, with verbatim-definition discipline (notes are tutor infrastructure). Built in an isolated worktree; owner-merged; no self-merge. Full detail/architecture: **`handoff/NOTES_TRACK_HANDOFF.md`**.

**DECISION (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** fed by a structured note-spec (`notes/specs/<topic_key>.json`) — NOT standalone HTML; the tutor + PR-F consume the spec as data; **Step 2 authors specs (JSON), not HTML**. ([FU-NOTES-INTEGRATION] RESOLVED.)

**Notes track — Step 1 (kit + prototypes + reference exemplar) DONE:**
- ✅ **Locked note kit (`notes/lazytopper_notes_kit.py`)** — renderer + figure toolkit (`ncert_figure`/`clean_watermark`/`refill_rect`); verified running.
- ✅ **5 v2 prototypes** — Light, Electricity, Chemical Reactions, Life Processes (3 real NCERT figures), Quadratic Equations.
- ✅ **Light enriched exemplar = the finished reference STANDARD** — verbatim NCERT definition cards + real NCERT worked examples + 3 real NCERT figures (incl. Fig 9.9 sign convention) + AUTHORED-vs-NCERT legend + source ledger; cites reconciled to NCERT Reprint 2026-27 Ch 9 (`jesc109.pdf`). The template for the standard; becomes the seed for the Light reference spec.

**Next build order (gated — do NOT reorder; owner-authorized separately):**
1. ⏳ **`notes/validate_spec.py`** — source-required validator to note-spec schema v1.1 (rejects unsourced verbatim/example/figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, kind shape, ledger count). Makes the ~35-note fan-out safe to parallelize.
2. ⏳ **Content PR (under `notes/`)** — validated Light reference spec `light-reflection-and-refraction.json` + the schema-v1.1 doc + the validator; evolve the kit to `render_note(spec)`; finish Light's figure (base64→WebP) + mindmap (JS→spec) lift.
3. ⏳ **Then in parallel** — **PR-F** (`<Note>` component + Topic Hub wiring; reads `notes/specs`+`notes/assets`, writes `src/`) AND **Step-2 spec authoring** (the 4 prototype enrichments — Electricity/Chemical Reactions/Life Processes [keep 3 figures]/Quadratic Equations — → ~35 notes), validator-gated. `magnetic-effects` = generate-TRIMMED (exclude Motor/EMI/Generator). **Do NOT start Step-2 or PR-F before the validator + content PR land.**
- Follow-up: **[FU-NOTES-MATHS-MAP]** (Maths NCERT folder not yet content-mapped); `topics.ts` collapses the two trig keys into one `trigonometry`.

---

## 2026-06-22 — Post-PR #286 roadmap update (PYQ symbol-integrity pass MERGED)

Trunk `b600e2b`. The parallel PYQ symbol-fix track (off the Topic Hub stage line) that closes the SOURCE-DATA gap #284 flagged. Isolated worktree; owner squash-merged; no self-merge. Reports in `Desktop/diff/`.

**PYQ bank corruption pass — DONE:**
- ✅ **Batch 1 (12 √/operator recoveries)** — `questionText` only, each verified vs the question's own answer or a clean twin; ~35 answer-only-√ false-positives correctly left alone.
- ✅ **Withhold 38 unservable Qs** — single source-level `WITHHELD_QUESTION_IDS` filter on `canonicalQuestionBank` (17 Science bilingual bleed + 21 Maths blank/garbled/answer-mismatch/mojibake); 349 `...PACK` spreads byte-identical to trunk; RAW 6579 → LIVE 6541 (Δ38). Corrupt source kept for re-extraction; un-withhold per-id as fixed. ⚠️ Live effect on MERGE + REDEPLOY.
- ✅ **§7 °/π/√ normalization** — 5 `areas-related-to-circles` Qs, answer-verified.
- ⏳ **[FU-PYQ-OWNER-LOOKUP]** (owner supplies 14 unrecoverable Maths expressions from real papers → 2nd-pass patch + un-withhold), **[FU-PYQ-REEXTRACT-SCIENCE]** (17 bilingual Science Qs), **[FU-PYQ-ANSWER-FIELD-SYMBOLS]**, **[FU-PYQ-CORRUPTION-DETECTOR]**, **[FU-PYQ-ANGLE-NORMALIZE]**.
- The Topic Hub stage line is unchanged: **PR-E2b (NEXT)** → PR-F → PR-G.

---

## 2026-06-21 — Post-PR #284 roadmap update (Worksheet rebuild E2a → E2a.3 MERGED)

Trunk `cfff277`. Worksheet **foundation** delivered across #280 (`d065922`) + #283 (`9a080a0`) + #284 (`cfff277`); #281 closed (superseded). Each owner Vercel-verified + merged; no self-merge. Full detail/architecture/gotchas: **`handoff/WORKSHEET_TRACK_HANDOFF.md`**.

**Topic Hub rebuild — PR-E2 foundation DONE:**
- ✅ **PR-E2a (#280)** — ONE responsive `WorksheetGenerator` (replaced desktop+mobile twins; un-routed for PR-G) + distribution fix (even/board-weightage/MI ×1.5, largest-remainder capped at availability → honest counts) + deleted-topics filter + two PDFs + persist-by-`worksheetId`.
- ✅ **PR-E2a.1+.2 (#283)** — real math (MathText/KaTeX) + real PDF FILE download (Option B: offscreen render → html2canvas → jsPDF, paginated, clean isolation) + count identity.
- ✅ **PR-E2a.3 (#284)** — view-aware Back; MI-enrich navy anchor in the right preview with honest signed-out/locked states; missing-symbol traced to a SOURCE-DATA gap → FLAGGED for the parallel symbol-fix agent (not fixed; `src/data` gated).
- ⏳ **PR-E2b (NEXT): the AI grade loop** — extend `server/routes/checkSolution.cjs` for structured one-PDF grading keyed to `worksheetId`/Q1…QN (`getWorksheetSession`); wire `recordMistake` (MI front door); mandatory 5-Q live-verify.
- ⏳ PR-F: content fill (Examiner's tips + Notes). ⏳ PR-G: delete dead old-mobile + retired MockBuilder/TutorDrawerV2/MentorPanel + the un-routed worksheet twins.
- Carried follow-ups: [FU-PITFALL-DATA], [FU-WORKSHEET-PDF-SERVERSIDE], PYQ √-data audit (all subjects).

---

## 2026-06-20 — Post-PR #276 roadmap update (Topic Hub PR-E1 practise-filter + chapter-test wiring + MockBuilder un-route MERGED)

Reports: `report-pr-e1-practise-filter-chaptertest-2026-06-20.md` + `report-pr-e1-amendment-exact-marks-backnav-2026-06-20.md` + `report-pr-e1-fix-two-pool-count-divergence-2026-06-20.md`. Trunk `1de6f3e` (#276, squash; owner LIVE-VERIFIED + merged; branch+worktree cleaned up; 3 commits = one impl + two owner-found round-trips).

**Topic Hub rebuild — PR-E1 DONE (the PR-E wiring stage):**
- ✅ **PR-E1: practise-filter + chapter-test wiring + MockBuilder un-route** — concept-row "Practise" routes DIRECTLY to Quick Practice (`buildDesktopConceptPracticePath`, not `/practice-hub`); **EXACT mark-band filter (Option A)** emitting numeric `marksMin`/`marksMax` and filtering on `Number(q.marks) ∈ [min,max]` after the owner found the page's `"23"` bucket fuses 2-and-3-mark (lossy `markBandToBuckets` removed); **single-pool count fix** (`selectInRangeFromPool` — hint + display read the same realized pool, `available >= displayed`, thin-bank honest); **PATH-CONDITIONAL** (range only on the concept-row entry; hub entry stays "All"); back-nav to the specific topic (`backLabel:"Back to {Topic}"`); concept-row-only applied-filter indicator; **Chapter-test button WIRED** to `/chapter-test/:grade/:subject/:topicKey`; **MockBuilder UN-ROUTED** (redirect to `/practice-hub`, tagged `PR-G-deletion-pending`, file kept). **[FU-PRACTISE-CONCEPT-FILTER] CLOSED.** Owner LIVE-VERIFIED PASS.
- ⏳ **PR-E2 (NEXT): Worksheet** — wire the inert "Worksheet" band button to its generation flow (its own locked spec).
- ⏳ PR-F: content fill — per-topic Examiner's tips (anti-fabrication) + unified Notes content.
- ⏳ PR-G: delete dead old-mobile + the **retired MockBuilder** + dead `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx`.

**New follow-up — [FU-CHAPTERTEST-PAGE-REDESIGN]:** the Chapter Test page is old-design (the PR-E1 button wiring works; the page redesign is backlogged, not part of PR-E1).

## 2026-06-20 — Post-PR #274 roadmap update (Topic Hub PR-D final-IA LAYOUT MERGED)

Report: `report-topichub-prd-layout-2026-06-20.md`. Trunk `b57fa79` (#274, squash; owner live-verified GOOD + merged; branch+worktree cleaned up).

**Topic Hub rebuild — PR-D DONE:**
- ✅ **PR-D: final-IA layout** — `ConceptSpine` rebuilt to MATCH the binding mockup. Learn-first (concepts hero + "Learn the N concepts"; receded dashed action band below); unified **Notes** toggle (replaces Formula/Proofs/Practice-all tabs, honest coming-soon); clickable **Examiner's tips** container seeding the 1 real `examinerWarning` (no fabrication); 3-button action band ("Practise this topic" primary routes; "Chapter test"/"Worksheet" inert "Soon"); concept "Practise" carries concept + `markBand`; per-row `✦ Visual` badge only where `findVisualForConcept` non-null; MI stays sidebar chrome. One responsive component, pure-CSS reflow, class-driven. Owner LIVE-VERIFIED GOOD.
- ⏳ **PR-E (NEXT): chapter-test + worksheet wiring + [FU-PRACTISE-CONCEPT-FILTER]** — wire the inert "Chapter test"/"Worksheet" band buttons to their pages; route concept "Practise" to Quick Practice directly + translate the concept `markBand` string → the page's numeric `marksFilter` bucket-set (`PracticePage.tsx:182`,`326-329`), **path-conditional** (band applies only on the concept-row entry, not the Practice-hub entry).
- ⏳ PR-F: content fill — per-topic Examiner's tips (anti-fabrication) + unified Notes content.
- ⏳ PR-G: delete dead old-mobile + the **retired MockBuilder** + dead `TutorDrawerV2`/`MentorPanel`/old `pages/TopicHub.tsx`.

**Split off PR-D (owner-approved): PR-D.1 — mobile full-screen tutor toggle** (a `TeachFlow` render change; desktop side-by-side ↔ mobile full-screen toggle, same component + data; unverifiable on Windows so it gets its own mobile live-verify). Blast radius is small — `TeachFlow` now backs ONLY the one live Topic Hub tutor.

**Decisions recorded (DECISION_LOG):** MockBuilder retired (un-routed from live product + tagged for PR-G deletion; MI now auto-captures the manual "hard questions to revisit" need); **[FU-BOOKMARK-SAVE-QUESTION]** (future "save this question" → Me/Progress; not a launch blocker).

## 2026-06-20 — Post-PR #272 roadmap update (Topic Hub PR-C tutor flow MERGED)

Report: `report-topichub-prc-tutor-2026-06-19.md`. Trunk `d9ba545` (#272, squash; owner live-verified + merged; branch+worktree cleaned up).

**Topic Hub rebuild — PR-C DONE:**
- ✅ **PR-C: tutor flow** — concept-row "Teach me" wired to the existing `concept_teach` engine (`ConceptSpine` → `ConceptTeachDrawer` → `TeachFlow` → `/api/mentor`), both platforms; `findVisualForConcept` wrong-visual fix (null not `concepts[0]`); earned-reveal client support (teach-first; follow-up-turn server visual). Owner LIVE-VERIFIED PASS.
- ⏳ **PR-D (NEXT): layout / action-band / tips / notes-consolidation** — learn-first hierarchy; receded action band; clickable Examiner's tips; unified Notes (formulae + proofs + mind-map). Also absorbs PR-C's flagged deferrals: **mobile full-screen toggle** for the interactive (currently stacked) + **per-row visual badge** rendering. ⚠️ MI stays in the navy sidebar (chrome) — NOT on the Topic Hub page body. Starts fresh in its own worktree.
- ⏳ PR-E: chapter-test + worksheet wiring (+ concept-level Practise auto-filter).
- ⏳ PR-F: content fill — per-topic Examiner's tips (anti-fabrication) + unified Notes content.
- ⏳ PR-G: delete dead old-mobile once the new IA ships at all widths.

**New cross-cutting follow-up (NOT a layout PR): [FU-CONTEXTUAL-TUTOR-REBUILD]** — the `/api/mentor` `concept_teach` engine follows a scripted "Ravi Sir / Step N of 5" lesson and does not respond contextually to student input. Pre-existing; PR-C wired into it but never scoped to rebuild it. Separate upcoming workstream.

## 2026-06-19 — Post-PR #268 roadmap update (docs(design): FINAL Topic Hub IA)

Report: `report-topichub-final-ia-docs-2026-06-19.md`. Trunk `a280685` (DOCS-ONLY; owner-merged).

**The Topic Hub / Learn-Flow rebuild now has its FINAL owner-approved IA committed in-repo** (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html` + the supersession block in `LazyTopper_Learn_Flow_Spec_LOCKED.md` + the updated `TOPICHUB_BUILD_REFERENCE.md`). **Supersedes #261.** Build "done" for each rebuild PR is checked against this committed source.

**Topic Hub rebuild PR sequence (each owner-authorized separately, verified vs the final IA):**
- ✅ PR-C: tutor flow — concept-row "Teach me" → existing `concept_teach` engine. **MERGED (#272, `d9ba545`), owner live-verified.**
- ⏳ PR-D (NEXT): layout / action-band / tips / notes-consolidation (learn-first hierarchy; receded action band; clickable Examiner's tips; unified Notes = formulae + proofs + mind-map). + PR-C deferrals: mobile full-screen toggle + per-row visual badge.
- ⏳ PR-E: chapter-test + worksheet wiring (+ concept-level Practise auto-filter to concept + mark band).
- ⏳ PR-F: content fill — per-topic Examiner's tips (anti-fabrication) + unified Notes content.
- ⏳ PR-G: delete dead old-mobile once the new IA ships at all widths.

(NB: PR-B concept-spine already landed via the mislabeled `c418f59`/#266 — see SESSION_LOG; the final IA above is the reference the remaining PRs build to.)

## 2026-06-19 — Post-PR #265 + #264 roadmap update (Bank Expansion Batch 2 + vitest-infra)

Report: `report-bank-expansion-batch2-2026-06-18.md`.

**Bank Expansion Phase 1 (THE DECOUPLE) — Batch 2 of 5 DONE (#265, trunk `381e9df`).**
- ✅ Batch 1: AP 24 + Statistics 16 + SAV 20 = 60 (#262).
- ✅ Batch 2: Coordinate-Geometry 22 + Areas-Related-to-Circles 23 = **45** (#265). CG Area-of-Triangle-in-Coordinate-Geometry excluded; figure-locked dropped; 3 `⚠ RECON`.
- ⏳ Batch 3: Triangles + Circles · Batch 4: Trigonometry + Pair-of-Linear-Eq · Batch 5: Real-Numbers + Polynomials.
- **Figure-locked census (owner-requested):** 67 in-scope (42 high-mark C+D); Triangles 18 · ARC 17 · Circles 15 lead → **[FU-DIAGRAM-RECOVERY]** (extract+clean+tag authentic NCERT/Exemplar diagrams; converges at Batch 3).

**Test infra — [FU-VITEST-INFRA] RESOLVED (#264, `2ef0b2c`):** `@testing-library/dom` devDep + `setup.ts` window-guard; lockfile regenerated in Codespaces. Codespaces vitest now 11/11 suites / 63 tests green (batches from `381e9df` onward verify clean).

## 2026-06-19 — Post-PR #262 roadmap update (Bank Expansion Phase 1, Batch 1 — Exemplar Maths)

Report: `report-bank-expansion-p1-exemplar-maths-BATCH1-2026-06-18.md`.

**Bank Expansion Phase 1 (Exemplar-Maths net-new + AI step-marked solutions — THE DECOUPLE) — Batch 1 of 5 DONE (#262, trunk `444238b`).**
- ✅ Batch 1: Arithmetic Progressions (24) + Statistics (16) + Surface-Areas-&-Volumes (20) = **60 net-new**, owner-verified + merged.
- ⏳ Batch 2: Areas-Related-to-Circles + Coordinate-Geometry · Batch 3: Triangles + Circles · Batch 4: Trigonometry + Pair-of-Linear-Eq · Batch 5: Real-Numbers + Polynomials.
- Recipe: extract verbatim → syllabus-filter (per `scripts/src/syllabusGuard.ts`) → dedup vs repo → AI `[N mark]` solutions (finalAnswer vs jeep2an.pdf)
  → new `*.exemplar2.ts` + register + `AI_GENERATED_SOLUTION_IDS` (never `predictionTypes.ts`) → gates + Codespaces vitest → STOP for owner verification.
- Follow-ups: [FU-VITEST-INFRA], [FU-EXEMPLAR-STAT-13.4], [FU-EXEMPLAR-DEFERRED-NETNEW]. New rows ∈ Fix B [FU-TOPICKEY-CONSOLIDATION] scope.

## 2026-06-18 — Post-PR #259 roadmap update (AI-tier FU-RANK-MOCKS-HPQ soft AI-demotion on Full Mock + Topic Mock)

Report: `report-ai-tier-rank-mocks-hpq-2026-06-18.md`.

### Completed this session
- [x] **#259 — AI-tier FU-RANK-MOCKS-HPQ** (trunk `775ee75`, squash; 4 files +209/−11; commit `ba2f619`). Extended PR2a's
  `SOURCE_MULTIPLIER` (reused — exported `getSourceMultiplier`, no fork) to the mock selection paths: **Full Mock**
  (`unlimitedPaperEngine.weightedSelect` per section/marks slot + `sourceWeightedPick` authentic-first archetype prefill) and
  **Topic Mock** (`topicMockEngine.weightedShuffleByScore`). Soft + structure-preserving (per-pool, `0.3/0.6` never 0 →
  authentic-thin slot still fills with AI; blueprint/section-counts/pools unchanged; zero question added/removed).
  **⚠️ Boundary correction: HPQ was a no-op** — `highlyProbableQuestions.ts` is a hand-authored curated bank, never uses
  `getAllQuestions()`, ZERO AI-pack content → left untouched. **All AI-bearing surfaces now covered** (practice via PR2a + the two
  mocks; HPQ already AI-free). `predictionTypes.ts` untouched. Codespaces vitest 7/7; CI GREEN (root matrix 181/181).

### Remaining / queued (owner-authorized-later; each its own instruction, branched from `775ee75`)
- [ ] **(NEXT) [FU-AITIER-RANK-DIFFICULTY-HELPERS]** — apply the same `getSourceMultiplier` demotion to
  `difficultyAwarePractice.ts` + `difficultyAutoSuggest.ts` (also call `getAllQuestions()` + serve AI at parity; out of #259 scope).
- [ ] **[FU-AITIER-MARKS-MISMATCH]** — content/marks pass for the 7 quarantined pack items (carried).
- [ ] **[FU-HPQ-PHASE2-ESBUILD]** (infra, low priority) · **[FU-PASTBOARDYEAR-TYPE-DECLS]** (optional type-hygiene) ·
  **[FU-CURATED-26-PROVENANCE]** (decision recorded: curated-26 stay authentic).

## 2026-06-18 — Post-PR #257 roadmap update (AI-tier PR2b strip fabricated pastBoardYear)

Report: `report-ai-tier-pr2b-pastboardyear-strip-2026-06-18.md`.

### Completed this session
- [x] **#257 — AI-tier PR2b strip fabricated pastBoardYear** (trunk `d6e0e14`, squash; 11 files +113/−106; commit `b4280ad`).
  Anti-fabrication. **Boundary corrected: 96 values / 5 files** (instruction assumed 75/2 — undercount of 21; exhaustive
  enumeration done first per owner). Stripped all 96 (field-removal only); cleaned all 8 `.pastBoardYear` reads → dedup
  score-only, `sourceYearHint` → `targetYear-1`, dead 5-signal-input fields removed. **`predictionTypes.ts` untouched.**
  **HPQ confidence proven UNAFFECTED** (scorers read dataset `sourceYear`, never `pastBoardYear` — dead plumbing). Count-integrity:
  served bank 6,715 unchanged, `pastBoardYear_remaining=0`. Codespaces vitest 9/9; CI GREEN (root matrix 181/181).

### Remaining / queued (owner-authorized-later; each its own instruction, branched from `d6e0e14`)
- [ ] **(NEXT) [FU-AITIER-RANK-MOCKS-HPQ]** — apply PR2a's `sourceMultiplier` AI-demotion to Full Mock (`unlimitedPaperEngine`),
  Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`), which route through `getAllQuestions()` + own selection.
- [ ] **[FU-AITIER-MARKS-MISMATCH]** — content/marks pass for the 7 quarantined pack items (carried).
- [ ] **[FU-HPQ-PHASE2-ESBUILD]** (infra, low priority) · **[FU-PASTBOARDYEAR-TYPE-DECLS]** (optional type-hygiene) ·
  **[FU-CURATED-26-PROVENANCE]** (decision recorded: curated-26 stay authentic).

## 2026-06-18 — Post-PR #255 roadmap update (AI-tier PR2a source-provenance stamp + soft AI-lower ranking)

Report: `report-ai-tier-pr2a-provenance-ranking-2026-06-18.md`.

### Completed this session
- [x] **#255 — AI-tier PR2a source-provenance stamp + soft AI-lower ranking** (trunk `686f737`, squash; 3 files +265/−9; commit
  `b4236ac`). ARCHITECTURAL — the provenance + ranking half of the audit's PR2. `AI_GENERATED_QUESTION_IDS` stamped at ingest from
  the 54 `.pack[1-3]` arrays (additive; bank untouched); `_source` tier on the local `CanonicalQuestionWithScore` intersection
  (forbidden `predictionTypes.ts` NOT touched); `getAdjustedScore *= SOURCE_MULTIPLIER {authentic 1.0 / predicted 0.6 / ai 0.3}`.
  Covers Quick Practice / topic practice. CI GREEN (root matrix 181/181; linux build); vitest 4/4 in Codespaces; **owner live-verify
  PASS** (~50%-AI topics serve all authentic in the top 10; first AI at index ~100–186). Live split: 6,715 = 3,710 auth + 2,764 ai
  + 241 predicted. **AI-lower-ranking-not-enforced RESOLVED.**

### Remaining / queued (owner-authorized-later; each its own instruction, branched from `686f737`)
- [ ] **(NEXT) AI-tier PR2b — `pastBoardYear` strip** — now unblocked: the PR2a stamp distinguishes verifiable PYQ years from
  fabricated predicted-layer ones. Strip the unverified `pastBoardYear` from the predicted/AI layers.
- [ ] **(THEN) [FU-AITIER-RANK-MOCKS-HPQ]** — apply the same `sourceMultiplier` demotion to Full Mock (`unlimitedPaperEngine`),
  Topic Mock (`topicMockEngine`), and HPQ (`highlyProbableQuestions`), which route through `getAllQuestions()` + own selection and
  still draw AI at parity.
- [ ] **[FU-CURATED-26-PROVENANCE]** — decision recorded (curated-26 inline items stay `authentic`); re-open only if reclassified.
- [ ] **[FU-AITIER-MARKS-MISMATCH]** — content/marks pass for the 7 quarantined pack items (carried).

## 2026-06-18 — Post-PR #253 roadmap update (AI-tier PR1b pack-file 5-mark retags)

Report: `report-aitier-pr1b-pack-retags-2026-06-18.md`.

### Completed this session
- [x] **#253 — AI-tier PR1b pack-file 5-mark retags** (trunk `f83915b`, squash; 9 files +34/−19; commit `86394e4`). Relabel-only
  follow-up to #251. **12** genuine 5-mark pack long-answers relabelled `format:"Short"→"Long"` (each confirmed by reading its
  `questionText`); **`PR2-018` reclassified** on inspection (single-step `7/12` one-liner) → moved to quarantine; **7 quarantined**
  (`TG3-056, TG3-059, ABS2-047, CR2-043, MNM2-037, REP2-039, PR2-018`) kept pinned + annotated. **Backlog 19→7**; count unchanged.
  CI GREEN (root matrix 181/181 with backlog 7). **[FU-AITIER-PACK-5MK-SHORT] RESOLVED** (relabel half).

### Remaining / queued (owner-authorized-later; each its own instruction, branched from `f83915b`)
- [ ] **(NEXT) AI-tier PR2 — provenance + ranking [FU-AITIER-PROVENANCE-RANKING]** — `source` stamp + AI-lower ranking in
  `getAdjustedScore` + `pastBoardYear` strip.
- [ ] **(THEN) [FU-AITIER-MARKS-MISMATCH]** — content/marks pass for the 7 quarantined pack items (fix marks or rewrite; then
  shrink `PACK_5MK_SHORT_BACKLOG`). NOT a relabel.
- [ ] **(iii) Gated-spelling [FU-SPELLING-GATED-REMAINDER]**, **(2) MI eval [MI-EVAL]**, **(3) Stage 3 [FU-DRILL-ENRICHMENT]**,
  **Fix B [FU-TOPICKEY-CONSOLIDATION]**. PRE-LAUNCH gate carried: **[FU-DETECTION-META-LAUNCH-FLIP]**.

## 2026-06-18 — Post-PR #251 roadmap update (AI-tier PR1 mechanical content-integrity)

Reports: `report-ai-tier-audit-2026-06-17.md` (read-only audit) → `report-aitier-pr1-mechanical-2026-06-17.md` (PR1).

### Completed this session
- [x] **Read-only AI-generated-question-tier audit** (`report-ai-tier-audit-2026-06-17.md`). File-based source classification
  (no per-question `source` field); ~3,684 authentic vs ~3,010 AI in the live pool (~45% AI, ~816 short of the 4,500 threshold);
  Q10 = one-off cross-concept fusion; 5-mark-"Short" tag defect was systematic; NO ranking demotion exists; mocks = mixed pool.
- [x] **#251 — AI-tier PR1 mechanical content-integrity** (trunk `f4a41b6`, squash; 5 files +237/−41; commit `8524e8e`).
  `QuestionKind` += `"Long"` (both predicted files) + `toCanonicalFormat` propagation; **24** five-mark Section-D predicted items
  retagged `Short→Long`; fused **Q10** (`2026-RN-LA-03`) split into `2026-RN-SA-08` + `2026-RN-SA-09` (net +1);
  `aiTierContentIntegrityGuard` added to the root matrix (175→181). CI GREEN. **[FU-MALFORMED-QUESTION] CLOSED.**

### Remaining / queued (owner-authorized-later; each its own instruction, branched from `f4a41b6`)
- [ ] **(NEXT) AI-tier PR1b — 19-pack `format:"Short"` cleanup [FU-AITIER-PACK-5MK-SHORT]** — retag only genuine LA `Short→Long`
  in `.pack2/.pack3` + shrink `PACK_5MK_SHORT_BACKLOG`; QUARANTINE content↔marks mismatches (`TG3-056`, `REP2-039`, …).
- [ ] **(THEN) AI-tier PR2 — provenance + ranking [FU-AITIER-PROVENANCE-RANKING]** — `source` stamp + AI-lower ranking in
  `getAdjustedScore` + `pastBoardYear` strip.
- [ ] **(iii) Gated-spelling [FU-SPELLING-GATED-REMAINDER]**, **(2) MI eval [MI-EVAL]**, **(3) Stage 3 [FU-DRILL-ENRICHMENT]**,
  **Fix B [FU-TOPICKEY-CONSOLIDATION]**. PRE-LAUNCH gate carried: **[FU-DETECTION-META-LAUNCH-FLIP]**.

## 2026-06-17 — Post-PR #249 roadmap update ("Finish session" scorecard trigger)

Report: `report-finish-session-scorecard-2026-06-17.md`.

### Completed this session
- [x] **#249 — "Finish session" scorecard trigger** (trunk `704dcff`, squash; 2 files +63/−2; commit `b740a3f`). Replaces
  #240 sub-task 5's `allDone`-only scorecard trigger with an explicit student-declared **"Finish session"** button
  (always-available at the set foot, both desktop + mobile widths) → fires `practice_finish_session_click` + sets
  `sessionFinished` → surfaces the scorecard. `allDone` retained as a convenience auto-offer. Reuses the EXISTING `sessionStats`
  — no new counters/persistence/state machine. Partial-session honesty (attempted-only denominators + "the M you didn't reach
  aren't counted" + honest zero-attempt state). "Keep practicing this set" escape hatch on a manual partial finish. CI GREEN.
  **✅ owner live-verify = PASS — partial honesty PROVEN** (3-of-10 reads "3 of 10 attempted · 0/3 MCQs correct · 0% accuracy ·
  the 7 you didn't reach aren't counted"; zero-attempt honest too). **Supersedes #240 sub-task 5.** [FU-SESSION-SCORECARD-TRIGGER] CLOSED.

### Remaining / queued (owner-authorized-later; each its own instruction, branched from `704dcff`)
- [ ] **(NEXT) Read-only AI-generated-question-tier audit** — seeded by **[FU-MALFORMED-QUESTION]** (Real Numbers Quick Practice
  Q10 fused alarm-clock LCM + prove √5 with inconsistent 5-mark/Section-D/Short tags; suspected AI-generated origin). Read-only.
- [ ] **(iii) Gated-spelling [FU-SPELLING-GATED-REMAINDER]**, **(2) MI eval [MI-EVAL]**, **(3) Stage 3 [FU-DRILL-ENRICHMENT]**,
  **Fix B [FU-TOPICKEY-CONSOLIDATION]**. PRE-LAUNCH gate carried: **[FU-DETECTION-META-LAUNCH-FLIP]**.

## 2026-06-17 — Post-PR #246 roadmap update (Check & Improve detect-then-confirm)

Report: `report-detect-then-confirm-2026-06-16.md`.

### Completed this session
- [x] **#246 — Check & Improve detect-then-confirm + question photo upload** (trunk `c9404e1`, squash; 9 files +935/−78;
  commit `3e00ac4`). The UX layer on Claim 2: detection is visible + correctable before grading (new `/api/detect-question`
  detection-only call → confirmation chip → constrained correction → grade on confirmed values via the unchanged trusted path).
  Question photo upload added (distinct slot). Override logged on the attempt record. CI GREEN. **✅ owner live-verify = PASS 5/6**
  (printed marks correct; inference genuine + graduated AP=2 vs proof=3; topics bucket clean; selectors gone both widths).

### Remaining / queued
- [ ] **⚠️ [FU-DETECTION-META-LAUNCH-FLIP] — PRE-LAUNCH GATE (hard).** Flip `SHOW_DETECTION_META` → `false` in
  `src/utils/checkImproveDetection.ts` before shipping Check & Improve to students. ON now for owner testing; the tester-vs-
  student line. One-line change, but a real miss if forgotten.
- [ ] **[FU-DETECTION-MARKS-CEILING] (from the #246 live-verify, NOT a blocker).** Inference under-calls true 5-mark questions
  (multi-part numerical + proofs) as 3; caught-and-correctable via [Change] (the UX absorbs it). Fix later: tune the
  `/api/detect-question` mark heuristic toward 5 for multi-part/derivation/proof/long-answer items (prompt-only), or
  bank-grounding (deferred behind Fix B). `detectionOverride` telemetry will measure how often it fires.
- [ ] **(ii) "Finish session" scorecard-trigger PR**, **(iii) gated-spelling [FU-SPELLING-GATED-REMAINDER]**, **(2) MI eval
  [MI-EVAL]** (now also validates the auto-detected mark scale + topic detection), **(3) Stage 3 [FU-DRILL-ENRICHMENT]**,
  **Fix B [FU-TOPICKEY-CONSOLIDATION]** — all owner-authorized-later. Bank-grounding for detection is deferred behind Fix B.

## 2026-06-16 — Post-PR #244 roadmap update (Check & Improve auto-detect — Claim 2)

Report: `report-claim2-autodetect-marks-2026-06-16.md`.

### Completed this session
- [x] **#244 — Check & Improve auto-detect marks/subject/topic** (trunk `43ffa09`, squash; 6 files +330/−238; commit
  `d93cd23`). The grader determines marks/subject/topic from the question (Claim 2, option (a)); student selectors removed on
  both surfaces. Isolated behind a `detectMarks` flag → Quick Practice byte-identical. Printed marks preferred → inferred →
  flagged fallback; topic constrained to the canonical `topics.ts` vocab + re-canonicalised via the shared
  `resolveDetectedGradeTopic` helper (reuses Fix A — no new normaliser). CI GREEN. **⏳ owner live-verify PENDING.**

### Remaining / queued
- [x] **(ii) "Finish session" scorecard-trigger PR** — DONE (#249, trunk `704dcff`; replaced #240's `allDone`-only trigger; honest on partial sessions; owner live-verify PASS).
- [ ] **(iii) Gated-spelling [FU-SPELLING-GATED-REMAINDER]** (~60 `src/data/**` + `loginPrompts.ts` "Practise" strings).
- [ ] **(2) MI eval [MI-EVAL]** — check-solution eval set (launch gate; now also validates the Claim-2 auto-detected mark
  scale + grading quality). Then **(3) Stage 3 [FU-DRILL-ENRICHMENT]**, and **Fix B [FU-TOPICKEY-CONSOLIDATION]** when authorized.

## 2026-06-16 — Post-PR #242 roadmap update (topicKey Fix A — read-time repair half)

The repair half of the topicKey-duplication problem the read-only audit mapped. Reports:
`report-topickey-duplication-audit-2026-06-16.md` (the audit/spec) + `report-topickey-fixA-me-resolver-2026-06-16.md` (Fix A).

### Completed this session
- [x] **Read-only topicKey-duplication audit** — enumerated all 84 distinct `topicKey` strings (4,907 occurrences; 32% under
  non-canonical spellings), mapped the three normalisers, proved serving merges but attribution fragments, and located the
  Light repro root cause at file:line. The report IS the Fix B migration spec.
- [x] **#242 — topicKey Fix A** (trunk `77f2ed2`, squash; 3 files +114/−2; commit `4eb2320`). New `desktopTopicForWeakAreaKey`
  routes the Me weak-area row through the strong serving-side resolver (`getRuntimeTopicCandidates`) + 13 `topics.ts` aliases;
  the 13 in-bank spellings (11 PascalCase Science abbreviations + 2 `science_*`) that fell to `/exam-trends` now resolve to
  Quick Practice. Read-time only — no `src/data` rewrite, no stored-record migration. CI GREEN. **[FU-WEAKAREA-EXAMTRENDS-
  FALLBACK] RESOLVED** (⏳ owner live-verify pending).

### topicKey — remaining
- [ ] **Fix B — bank-key data consolidation + CI guard = [FU-TOPICKEY-CONSOLIDATION] (HELD / authorized-later).** Migrate every
  question to a single canonical kebab `topicKey` matching `topics.ts`, retire variants, add a CI guard that fails if a
  non-canonical topicKey reappears. Gated `src/data/**` across ~60 files; stage Maths/Science. Exact key→key map + affected
  files + guard design in the audit report §5. Do NOT start until owner-authorized.

## 2026-06-16 — Post-PR #240 roadmap update (MI polish batch — surface/ranking, NOT eval-gated)

The MI loop is Measure-complete; #240 is the surface/ranking polish on the finished engine. Report:
`report-mi-polish-batch-2026-06-15.md`.

### Completed this session
- [x] **#240 — MI polish batch** (trunk `9eff0b0`, squash; 7 files +122/−79; one commit per sub-task). Five surface/ranking
  sub-tasks: weak-area **blended-severity ranking** ([FU-WEAKAREA-ACCURACY-RANK]); **per-row targeted practice CTAs**
  ([FU-WEAKAREA-CTAS]); **wrong-MCQ nudge** to the existing checker ([FU-MCQ-UPLOAD-NUDGE]); **Practise→Practice** UI copy
  ([FU-SPELLING-PRACTICE]); **end-of-session scorecard + footer removal** ([FU-SESSION-SCORECARD]). CI GREEN. **Owner
  live-verify 4/5 PASS** — sub-tasks 1–4 verified; sub-task 5 scorecard NOT yet confirmable (trigger being redesigned).

### MI polish — remaining / surfaced
- [ ] **(i) Read-only topicKey audit (next, owner-authorized as its own instruction):** trace the topicKey
  duplication/non-canonical-variant problem ([FU-WEAKAREA-EXAMTRENDS-FALLBACK] — Light row misroutes to Exam Trends).
- [x] **(ii) "Finish session" scorecard-trigger PR — DONE (#249, trunk `704dcff`):** explicit student-declared finish replacing
  the `allDone`-only trigger; honest on partial sessions. Made sub-task 5 confirmable; owner live-verify PASS. [FU-SESSION-SCORECARD-TRIGGER] CLOSED.
- [ ] **(iii) Gated-spelling follow-up [FU-SPELLING-GATED-REMAINDER]:** the ~60 `src/data/**` + `loginPrompts.ts` "Practise"
  strings (gated dirs).

## 2026-06-15 — Post-PR #237 roadmap update (MI Loop Stage 2 / Measure-leg PR 3 — MEASURE LEG COMPLETE)

The last Measure-leg PR: MCQ honest capture. Report: `report-mi-loop-stage2-pr3-mcq-2026-06-15.md`.

### Completed this session
- [x] **#237 — MI Loop Stage 2 / Measure-leg PR 3** (trunk `b75f065`, squash of `9edf6fb`; 1 file +22/−36).
  `PracticeQuestionCard` MCQ clicks now route through `recordAttempt` (1/1 correct, 0/1 wrong, mode "mcq", same
  topic/questionId keying as graded answers) → MCQ feeds accuracy + a correct MCQ shrinks a weakness via the PR-2
  loop-closer. Removed the hardcoded `conceptual:1` direct-`logMistakes` bypass. **Owner-ruled wrong-MCQ treatment (a)
  attempt-only** (no mistake-log entry / no synthesized grade / no typed category). CI GREEN. ⏳ owner live-verify pending.

### ✅ MI loop — Measure leg COMPLETE (#233 + #235 + #237). The loop is bidirectional across graded AND MCQ capture.

### MI loop — remaining
- [ ] **Stage 3 — concept-level targeting (eval-gated, next):** pass the weak concept/mistake-pattern into
  `generatePracticeSet`'s `conceptKey` (needs MI sub-concept capture + the eval set). = **[FU-DRILL-ENRICHMENT]**.
- [ ] Open follow-ups carried: **[FU-IMPROVEMENT-CARD]**, **[FU-WEAKAREA-ALIAS-DISPLAY]**, **[FU-ATTEMPT-MARKS-ACCURACY]**,
  **[FU-ATTEMPT-SR]**, **[FU-ME-REFRESH]** (see OPEN_QUESTIONS).

## 2026-06-15 — Post-PR #235 roadmap update (MI Loop Stage 2 / Measure-leg PR 2 — THE LOOP CLOSES)

The MI loop's **Measure** leg, PR 2 (the loop-closer). The engine is now **bidirectional** (Capture → Identify → Act →
Measure all live). Report: `report-mi-loop-stage2-pr2-loopclose-2026-06-14.md`.

### Completed this session
- [x] **#235 — MI Loop Stage 2 / Measure-leg PR 2** (trunk `59f9d18`, squash of `4c8936b`; 4 frontend files +135/−2).
  A FULLY-correct `recordAttempt` decrements one active gap for the topic via `clearWrongAnswer` (live correct-attempt
  path; clamped at 0; wrong/partial never shrink), key-matched to the bridge's increment (identical
  `normalizeTopicKey(ctx.topicKey ?? ctx.topic)`; caught the spaces→`_` vs `-` G9 trap). Both Me surfaces show "active
  gaps remaining" (recoverable healing) alongside historical "marks lost" (the scar). Codespaces vitest 2/2 + `vite
  build` ✓ + verifier ✓; CI GREEN. **Owner live-verified PASS** — active gaps shrank to 0 on Real Numbers AND
  Polynomials; marks-lost held; wrong didn't shrink; clamp held; mobile parity.

### MI loop — Measure leg, remaining PR
- [ ] **Stage 2 PR 3 — MCQ honest capture (next, owner-greenlight-gated):** `PracticeQuestionCard` MCQ click →
  `recordAttempt` (1/1 or 0/1); stop the direct `logMistakes` hardcoded `conceptual:1` (record a wrong MCQ as
  unclassified/objective — owner-confirm exact treatment). Do NOT start until greenlit.
- [ ] **Stage 3 — concept-level targeting (eval-gated):** pass the weak concept into `generatePracticeSet.conceptKey`.
  = **[FU-DRILL-ENRICHMENT]**.

### Follow-ups logged this PR (see OPEN_QUESTIONS)
- [ ] **[FU-IMPROVEMENT-CARD]** — the loop-closer DELETES the wrong-answer entry at zero, erasing the improvement record;
  before an improvement/journey card on Me, record a durable "gap cleared" event (cumulative + per-topic + timestamp) in
  the `practiceInsights` mirror first. **[FU-WEAKAREA-ALIAS-DISPLAY]** — active-gaps count under-shows for label≠slug
  topics until the alias map covers them (data-layer decrement unaffected).

## 2026-06-14 — Post-PR #233 roadmap update (MI Loop Stage 2 / Measure-leg PR 1)

The MI loop's **Measure** leg per `AGENT_t3_mi_measure_loopclose_2026-06-12.md` (3 PRs). PR 1 makes graded scores measurable.
Report: `report-mi-loop-stage2-pr1-recordattempt-2026-06-14.md`.

### Completed this session
- [x] **#233 — MI Loop Stage 2 / Measure-leg PR 1** (trunk `57fb7aa`, squash of `d8ee55c`; 4 frontend files +199/−15).
  The dead `recordAttempt` (0 call sites) is now the real single front door — score-twin of `recordMistake` (policy + dedup +
  localStorage + existing Firestore mirror; **no `firestore.rules` edit**). Marks is the universal unit; `correct` derived.
  Routed all 3 graded surfaces. Attempts merge with mistake-log rows (no duplicate weak-area rows). CI GREEN. Owner live-verified
  PASS (Saved attempts / Accuracy / Recent populate; merged into Polynomials weak-area row; X/Y banner = v1 scorecard).

### MI loop — Measure leg, remaining PRs
- [ ] **Stage 2 PR 2 — close the loop (next):** a **correct** `recordAttempt` decrements the topic/concept weakness via
  `clearWrongAnswer` (wire to the live attempt path, NOT the dormant session subsystem; already clamped ≥0). Confirm the
  aggregator's `accuracy<60 && attempts>=2` path now receives real attempts. **Decisive test:** a logged weak area
  (Real Numbers −7) **visibly shrinks** on Me after a clean correct drill — the proof the loop closes.
- [ ] **Stage 2 PR 3 — MCQ honest capture:** `PracticeQuestionCard` MCQ click → `recordAttempt` (1/1 or 0/1); stop the direct
  `logMistakes` hardcoded `conceptual:1` (record a wrong MCQ as unclassified/objective — owner-confirm exact treatment).
- [ ] **Stage 3 — concept-level targeting (eval-gated):** pass the weak concept into `generatePracticeSet.conceptKey`.
  = **[FU-DRILL-ENRICHMENT]**.

### Follow-ups logged this PR (see OPEN_QUESTIONS)
- [ ] **[FU-ATTEMPT-MARKS-ACCURACY]** — marks-weighted Me accuracy (currently binary). **[FU-ATTEMPT-SR]** — dropped
  spaced-repetition side-effect; reviving is its own decision.

## 2026-06-14 — Post-PR #231 roadmap update (MI Loop Stage 1 / Act-leg)

The MI loop (Capture → Identify → **Act** → Measure) per `LazyTopper_MI_Loop_Culmination_Spec_2026-06-12.md`. Stage 1 wires the
Act hand-off. Report: `report-mi-loop-stage1-targeting-2026-06-12.md`.

### Completed this session
- [x] **#231 — MI Loop Stage 1 / Act-leg** (trunk `6d80a57`, squash of `09fa7f8`+`deaad2e`; 3 frontend files +92/−15).
  Gap A (weak-topic targeting + honest fallback), Gap B (auto-serve targeted arrivals), Option B (one-click direct;
  gated `buildDesktopPracticePath` untouched; intent-first guardrail preserved). CI GREEN. Owner live-verified PASS.

### MI loop — remaining legs
- [ ] **Stage 2 — Measure leg (next):** `recordAttempt` + Firestore attempt/score stream (Scorecard spec = the loop's return
  leg) → "Saved attempts"/"Accuracy by subject"/weak-area-shrinking. Mirrors `recordMistake`. Makes the loop *visible*.
- [ ] **Stage 3 — concept-level targeting (eval-gated):** pass the weak concept into `generatePracticeSet.conceptKey`
  (needs MI sub-concept capture + eval). = **[FU-DRILL-ENRICHMENT]**.
- [ ] **Stage-1 polish:** [FU-DRILL-ROUTING], [FU-WEAKAREA-LABEL], [FU-WEAKAREA-CTAS], [FU-WEAKAREA-HUB-LIMIT] (see OPEN_QUESTIONS).

## 2026-06-14 — Post-PR #229 roadmap update (grade-parse resilience)

A live-grading-path hardening that closes the MI-surfaced **[FU-GRADE-PARSE]**. Report:
`report-grade-parse-resilience-2026-06-12.md`.

### Completed this session
- [x] **#229 — grade-parse resilience** (trunk `59e11f6`, squash of `14ea860`; 1 file `server/routes/checkSolution.cjs`, +44/−5).
  Root cause = Gemini JSON **truncation** (`maxOutputTokens: 8000` → long grades cut mid-JSON → unparseable). Fix = single bounded
  retry + `maxOutputTokens` 8000→16000 + `finishReason`/tail diagnostics; **zero grading-semantics change**. CI GREEN.
  Owner live-verified PASS (`sol_5.jpeg` grades cleanly on both surfaces).

### Eval-gated follow-ups (named; deferred to the eval pass)
- [ ] **[FU-GRADE-MARKSCALE]** — Check & Improve marks are student-entered, not question-derived → grader should judge the CBSE
  mark value. **[FU-GRADE-CONSISTENCY]** — cross-surface mistake-type variance (downstream of mark-scale; ties into **[MI-EVAL]**).
- [ ] **[FU-ME-REFRESH]** — Me auto-refresh after a grade (still open).

## 2026-06-12 — Post-PR #227 roadmap update (MI Consolidation P1+P2)

The MI Architecture Map (`LazyTopper_MI_Architecture_Map_2026-06-11.md`) phased path. P1+P2 shipped together (owner scope
decision: Option A — bundled, since the bridge is narrow/safe). Authority: `report-mi-consolidation-p1p2-2026-06-11.md` +
`report-quickpractice-mistakelog-diagnostic-2026-06-11.md`.

### Completed this session
- [x] **Phase 1 — single ingestion front door** (`recordMistake`): one policy + builder + dedup; routed `SolutionChecker`
  (deleted the `mistakeCount>0` guard — the Quick-Practice bug; added deduped cache back-fill), mobile `CheckImprove`, desktop
  `DesktopCheckImprovePage`. Local `buildLogEntry` / `buildMobileLogEntry` deleted. Closes Map gaps #1, #4, #6.
- [x] **Phase 2 — weak-area bridge** (conceptual+calculation → Stream-3 `WrongAnswerEntry`, capped term, no `confidenceScore`
  change). Closes Map gap #3 for knowledge-gap types. Owner-verified live: Polynomials + Real Numbers surfaced in Weak Areas.
- [x] **Phase 2 — careless insight** (silly+presentation card on both Me pages; NOT bridged).
- [x] **Server additive-floor `mistakeSummary` reconcile** (`max(llm, stepDerived)`). Closes Map gap #2.
- [x] **#227 merged** (trunk `c618cd5`, squash of `e3e3f18`; 8 files +531/−159). CI `quality-gate` GREEN.

### Deferred (named in the Map; NOT in this PR)
- [ ] **MCQ migration onto `recordMistake`** (Map Phase 2 / gap #5 — still hardcodes `conceptual:1`).
- [ ] **Chapter-tests + mocks onto the front door** (Map Phase 3).
- [ ] **Layer-merge / durable Me convergence** (Map Phase 4).
- [ ] **[FU-GRADE-PARSE]** grade-parse resilience · **[FU-ME-REFRESH]** Me auto-refresh (live follow-ups).

## 2026-06-11 — Post-PR #224 + #225 roadmap update (INFRA-4/PR1: backend LIVE)

The go-live deploy unlock. INFRA-4/PR1 deployed `artifacts/api-server` (self-spawns the AI gateway) to Railway and wired the
Vercel `/api/*` rewrite to it. Grading is no longer dark in production. Authority:
`report-api-server-deploy-investigation-2026-06-10.md` (read-only map) + `report-api-gateway-railway-2026-06-10.md` (PR1 + runbook).

### Completed this session
- [x] **PR #224 — Railway deploy image** (trunk `f318eb9`; 4 files, +94/−0): `Dockerfile` (full-workspace runtime, corepack
  pnpm@10.32.1, no-prune keeps `typescript`, cwd=root), `.dockerignore` (no source excluded), `railway.json` (healthcheck
  `/shared-api/healthz`), `vercel.json` (`/api/*`+`/shared-api/*` rewrites with a valid sentinel). Gates green; CI `quality-gate` GREEN.
- [x] **PR #225 — fill vercel.json with the live Railway URL** (trunk `7c106b6`; 1 file, +2/−2): sentinel →
  `https://lazytopper-production-production.up.railway.app`. **Backend confirmed live** (`stub:false`, Gemini direct-key). CI GREEN.

### INFRA-4 go-live track
  [x] **PR1 — Railway deploy + `vercel.json /api/*` rewrite** (#224 + #225) — backend LIVE
  [ ] **⛔ Track B live round-trip [TRACK-B-GATE]** (owner + cofounder, on the live app) — closes ISSUE-009
  [ ] **PR2 (harden)** — Postgres + `DATABASE_URL` + **`tsx`** + `ADMIN_FIREBASE_UIDS` + `SESSION_SECRET` + rate-limit + warm-pool decision
  [ ] **INFRA-4b** — claudeClient Replit-proxy → direct-key rewire (later visuals PR; grading is Gemini-only so deferred)

## 2026-06-09 — Post-PR #220 roadmap update (Phase-2 responsive divergence: audit + Track A)

The Phase-2 reconcile of stale mobile twins to the desktop source-of-truth. Authority:
`report-responsive-divergence-audit-2026-06-08.md` (read-only map of every `useIsDesktop()` split).

### Completed this session
- [x] **Responsive-divergence audit (read-only)** — 7 split surfaces classified; 5 DIVERGENT (Me, chrome/avatar, Check &
  Improve, Topic Hub, Worksheets); severities normalized; ordered Phase-2 punch-list produced.
- [x] **PR #220 — Track A: mobile Me honesty** (trunk after merge `8c478ce`; 1 file `app/Me.tsx`, +48/−56): removed the
  fabricated `COMMON_MISTAKES` bars (−12/−8/−5) + invented weak-topics count; honest empty-states (desktop verbatim copy) +
  honesty footer. Grep-proven zero fabricated data; gates green; build CI-gated. The urgent trust-critical stopgap.

### Phase-2 responsive divergence track (ordered; trust-critical first)
  [x] Responsive-divergence audit
  [x] **Track A — mobile Me honesty (RESP-DIV-1)** (#220, stopgap)
  [x] **Track B — mobile Check & Improve: trust + persistence** (#222, trunk `6c88ccf`; 2 files, +236/−32): guard fixed
      (`!result || result.ok === false`); persistence wired to the shared `logMistakes`/Firestore pipeline (mirrors desktop
      `buildLogEntry`); mobile Me reads real `getMistakeLogs` mix. Static-green. ⛔ **VERIFICATION-GATED** — backend now LIVE
      (#224/#225), so the round-trip is **live-testable**; owner+cofounder run it to close [TRACK-B-GATE]. See the 2026-06-11 section.
  [ ] **(NEXT) RESP-DIV-2 — mobile logout / Manage-subscription path** (functional, high)
  [ ] Topic Hub reconcile (wire mobile Learn to tutor; label/drop synthetic questions; honest progress signal)
  [ ] Worksheets parity (mistake-intelligence + multi-topic/full-subject + save + Science `stream`)
  [ ] Home real-insights on mobile (firebase-free boundary decision)
  [ ] RESP-DIV-3 — trial banner (cosmetic)
  [ ] Durable: converge mobile Me into desktop Me (one responsive component, one pipeline) — after Track B

## 2026-06-09 — Post-PR #218 roadmap update (SEVER: product reaches only live surfaces)

The structural sever that the two read-only audits (responsive-surface + banned-term-prose) set up. Disconnect-only
(markers-now, no file moves); proven by a before/after connectivity-graph merge gate.

### Completed this session
- [x] **PR #218 — SEVER: disconnect obsolete surfaces** (trunk after merge `bcb7c2a`; 57 files, +170/−171):
  severed every inbound edge (route/nav/catch-all/command-palette/leaked link) to the obsolete/deferred graveyard;
  re-pointed mobile `/` + catch-all off the retired old `/dashboard` to the live MobileHome (fixes the
  two-contradictory-homes bug); removed 18 dead `<Route>` entries (15 RETIRE + 3 DEFERRED); kept `weak-area-practice`
  (partial-sever); closed 11 leaks (incl. 5 beyond the named ones, found via manual dead-path grep); marked 46 files
  `LEGACY-RETIRED`/`DEFERRED-REVIVE` for a Phase-2 clean-branch. Merge gate (connectivity graph): 18/18 cuts severed,
  28/28 live routes preserved, 0 unexpected losses. CI green (incl. linux build); owner-verified on Vercel preview.

### Sever / responsive track
  [x] Read-only responsive-surface audit (`report-responsive-surface-audit-2026-06-08.md`)
  [x] Read-only banned-term-prose audit (`report-banned-term-prose-audit-2026-06-08.md`); Tier-1A fixed in #216
  [x] **SEVER PR (#218)** — disconnect obsolete surfaces; product reaches only live surfaces
  [ ] **(NEXT) Phase-2 responsive divergence punch-list** — reconcile stale mobile twins to the desktop
      source-of-truth (no invented numbers). Seed items (OPEN_QUESTIONS, soft-launch blockers): mobile Me fabricated
      sample data; mobile avatar dropdown (Log out / Manage subscription); mobile top-ribbon/trial-banner divergence.
  [ ] (later) Phase-2 clean-branch — grep the 46 markers to delete (`LEGACY-RETIRED`) / keep (`DEFERRED-REVIVE`).

## 2026-06-07 — Post-PR #206 roadmap update (AUTH MIGRATION arc: Clerk → Firebase Auth + phone)

A Stage-1 launch prerequisite (the backend auth verification changes from Clerk to Firebase). 4 sequenced,
owner-approved PRs (same executor; STOP-for-approval between each). Authority: the read-only audit
`report-auth-migration-clerk-to-firebase-2026-06-07.md` + `AGENT_auth_migration_build_4PRs.md`.

### Completed this session
- [x] **PR #206 — auth migration PR-1: backend edge guard (Surface B = `artifacts/api-server`)** (trunk after
  merge `a3def5f`): new `firebaseAdmin.ts` (edge Firebase Admin init) + `requireFirebaseAuth.ts` (Firebase
  `verifyIdToken` first → `req.userId = uid`; Clerk `getAuth` fallback) wired into `admin.ts`/`questions.ts`;
  added `firebase-admin@^13.7.0`. **Option B** (owner-confirmed): `@clerk/express` stays mounted; fallback +
  package removed together in PR-3. Gates: CI green; Codespace api-server `typecheck`/`build` exit 0; root
  matrix 175/175; lazytopper ops matrix green. See CURRENT_STATE (#206) + DECISION_LOG (Option B).

### Auth migration track
  [x] PR-1 (#206) — edge verifies Firebase ID tokens; Clerk dual-accept fallback (Option B)
  [x] **PR-2 (#208)** — frontend `AuthContext` → direct Firebase Auth (Google **popup** + one-step Email/Password;
      One-Tap deferred to a follow-up); Login/SignUp rebuilt natively (v2 prototype; no "Welcome back"); `getToken()`
      → `currentUser.getIdToken()`; `ClerkProvider` removed from `main.tsx`; `@clerk/react` dropped; admin allowlist
      `ADMIN_CLERK_UIDS → ADMIN_FIREBASE_UIDS`; local-dev/E2E path preserved. Gates: CI green; Codespace lazytopper
      tsc + vite build + verifier + matrices; Vercel screenshots faithful; **runtime token verified Firebase**
      (`iss = securetoken.google.com/lazzyy-topper`). Trunk after merge `597880d`.
  [x] **PR-3 (#210)** — Clerk teardown: deleted the gateway bridge (`firebaseAuth.cjs` + `server/index.cjs` wiring)
      + `clerkProxyMiddleware.ts`; `requireFirebaseAuth` → Firebase-only (Clerk fallback removed); `app.ts` drops
      `clerkMiddleware()`; dropped `@clerk/express` + `http-proxy-middleware` + `jsonwebtoken`/`jwks-rsa` (last two
      remain transitive under firebase-admin). Zero Clerk in code; lockfile `@clerk`=0 (−162). Gates: CI green +
      Codespace tsc/build/verifier + **gateway boots** + matrices. Trunk `6bf6e58`.
  [x] **CLAUDE.md governance scrub (#212)** — §1 stack + §5 doctrine + `FIREBASE_SETUP.md` +
      desktop-graduation Clerk notes. Owner-reviewed merge (governance file; not auto-merged). Trunk `c755adb`.
  [x] **PR-4 (#214) — phone / SMS-OTP** (`feat/auth-phone-otp`): filled the phone façade with
      `signInWithPhoneNumber` + invisible reCAPTCHA; wired the 2-step Phone tab. **Auth arc 4/4 COMPLETE** —
      Firebase-only end to end; verified in production-preview with a real-number login (real SMS/OTP, trial tied
      to the phone account). Root-caused + fixed the reCAPTCHA re-render bug (one verifier, render once, reuse).
      Trunk `7e00430`.
  [ ] (backlog, own PR) D47 — `apiServer` lane in `repo_boundary_policy.json` for `scope:guard`.
  [ ] (follow-up) Google **One-Tap** (GIS) once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided.

## 2026-06-06 — Post-PR #196 roadmap update (3 pre-existing test reds resolved)

### Completed this session
- [x] PR #196 — **resolve the 3 long-red ops-acceptance suites + un-blind the mojibake checker** (mixed PR,
  3 lane-pure commits, trunk after merge `19b3029`): mojibake re-encode of `circles.proof.ts` +
  `maths.caseBased.ts` (1/3→3/3); bank-health stale test → retirement guard + orphan dead-compute deleted
  (2/4→4/4); canonical-generator re-pointed to the relocated `practiceQuestionBuilder.ts` (2/4→4/4);
  removed the 50-hit scan cap in `check-mojibake.cjs` that had blinded both the local gate and the (dormant)
  CI workflow. Root suite 175/175; uncapped repo-wide rescan 0 corruption. Closes D38.

### Test-health / CI track
  [x] 3 pre-existing reds fixed (#196) — mojibake / bank-health / canonical
  [x] mojibake checker un-blinded (50-hit scan cap removed)
  [ ] **(TRACKED, own PR) CI relocation + EXPANSION [D39]** — the mojibake guardrail workflow is mislocated
      under `lazytopper/.github/workflows/` so GitHub never runs it; relocate to repo root AND expand to gate
      the full `test:matrix:all` + `scope:guard` (not just mojibake). First verify the uncapped checker
      passes clean across ALL of trunk; decide the trigger scope (PRs-to-trunk vs all pushes). Deliberate
      infra change — activates whole-repo CI gating for the first time.

## 2026-06-05 — Post-PR #194 roadmap update (HPQ Phase 1 — consistency + honesty)

### Completed this session
- [x] PR #194 — **HPQ Phase 1 (consistency + honesty; logic/copy/plumbing only, no content authoring)**.
  Tier badges re-based on the locked tiers via a single canonical-key→tier lookup in
  `getHighlyProbableQuestions()` (0 contradictions, was 11/27; must-crack share 74%→42%); dead
  `deriveHPQConfidence` compute retired (`hpqConfidence.ts` kept); honest reframe to "High-Probability
  Question Patterns" (representative shape, three locked evidence sources, no specific-question claim, no
  confidence badge); canonical-key merge dedupes the duplicate Pair-of-Linear / Metals cards; Science
  filter fix recovers Human Eye 1→4 + DEV-logs future drops. All questions KEPT. 3 files, +140/−36;
  `predictionTypes.ts` frozen. Gates green; pre-existing reds (bank-health/canonical-gen/mojibake) verified
  unrelated. Trunk after merge `6d5b6ed`.

### HPQ track
  [x] HPQ refinement audit (read-only gap report, `report-hpq-refinement-audit-2026-06-05.md`)
  [x] HPQ Phase 1 — re-badge on locked tiers + retire dead compute + honest reframe + plumbing (#194)
  [ ] **(NEXT HPQ) HPQ Phase 2 — content authoring** (gated `src/data/`, PYQ-sourced, owner-validated):
      the missing 5-mk Section-D LA marquee shapes (Trig H&D, Surface Areas combination, Statistics median,
      Triangles BPT proof, Acids/Bases LA, Chemical Reactions 3-mk displacement); distribution re-weight
      toward must-crack (lift Circles/Heredity, trim/re-tier Pair-of-Linear/AP/Metals); fix `rn-hpq-4`
      Section-D/4-mark mislabel; backfill 49 competency `solutionSteps`; confidence-model reconciliation
      IF a confidence UI is designed.

## 2026-06-05 — Post-PR #190 roadmap update (Exam Trends band redesign — 3 collapsible priority bands)

### Completed this session
- [x] PR #190 — **Exam Trends band redesign**: flat ranked list → 3 collapsible priority bands
  (Must-crack open / High-ROI collapsed / Good-to-do collapsed) on the owner-signed-off locked tiers
  (`LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md`, transcribed VERBATIM). Layout-only Option-B
  evolution of the ONE component; rows reused verbatim; "Expect:" sub-pattern line on the 11 must-crack
  topics only; volatility flag on Trig + Electricity; no fabrication; grammar preserved; 1 product file.
  Gating: tsc 0, build 0, verifier PASS, matrix 175/175. Trunk after merge `cfb3106`.
- [x] **Re-derive Exam Trends priorities FRESH** (D27, step 5) — satisfied by the owner-signed-off
  composite model + 2 teacher overrides (the locked tiers doc); the basis is now traceable + signed-off.

### Responsive-redesign track — Exam Trends FULLY converged
  [x] Exam Trends ranked-list (#184 — sets the pattern)
  [x] Exam Trends fresh tiering (locked doc 2026-06-05 — D27/step 5)
  [x] Exam Trends band redesign (#190 — step 6)
  [ ] **(NEXT) TopicHub concept-spine (+ Formula Sheet / NCERT Notes)** — same Option-B template;
      needs owner sign-off on the Notes/Formula template BEFORE generation
  [ ] Check & Improve → Me/Progress → Worksheet generator (each Option B; same template as #184)

## 2026-06-04 — Post-PR #188 roadmap update (CONTENT SWEEP — gating syllabusGuard GREEN)

### Completed this session
- [x] PR #188 — **content sweep**: deleted/rewrote the 93-item worklist the corrected guard (#186)
  flagged. Banks: Conversion of Solids ×46 (exemplar 42→19, ncert 24→14, pack2 50→37; canonical
  6520→6474, spreads intact). Surfaces: EMI/Motor/Generator + Euclid/Frustum ×47 across predicted/HPQ/
  competency/config/trends/topics/topicHubContent + tutor contracts. DELETE-not-retag; blurbs/contracts
  rewritten syllabus-accurate; marked in-syllabus teach-steps (keyIdeas 4-tuple). Gating
  `syllabusGuard` exits 0, `test:matrix:all` 175/175 (incl. #19). Trunk after merge `e0395fc`.
  **The content-correctness arc (D26) is CLOSED**: verified → guard corrected (#186) → content swept (#188).
- [ ] Deferred follow-up (D31): polynomials-contract division-algorithm leak + syllabusGuard
  generic-phrase blind-spot — a future guard-phrase + small-sweep PR (NOT done here, out of worklist scope).

### Next on the responsive-redesign / content-correctness track
- [ ] **Re-derive Exam Trends priorities FRESH** (tier + trend + marks) from the current CBSE 2026-27
  syllabus + recent paper pattern (D27 — existing priorities stale/untraceable). Prereq for the band redesign.

## 2026-06-04 — Post-PR #186 roadmap update (syllabusGuard corrected to official CBSE 2026-27 + extended to all board-prep surfaces)

### Completed this session
- [x] PR #186 — corrected `syllabusGuard.ts` + `cbse10Registry_2026_27.json` to the owner-signed-off
  official CBSE 2026-27 syllabus (step-deviation un-banned; 3 OUT maths items added; Evolution
  sub-topics banned with Heredity/Mendel PRESERVED; citation fixed; Reproduction registry bug fixed;
  formative-only vs deleted relabelled) AND extended the guard to scan all 24 board-prep surfaces via
  a curated phrase scan (tutor incl.). Corrected 2 stale doctrine-locks. Tests 10→45. Trunk after
  merge `918b754`. The RULER is now correct — guard half of D26 done. Gating guard intentionally RED
  on the 93-item sweep worklist (matrix 174/175, only #19 red by design).

### Responsive redesign / content-correctness track
  [x] Exam Trends ranked-list (#184 — sets the pattern)
  [x] **Correct + extend syllabusGuard (the RULER)** (#186 — DONE)
  [ ] **CONTENT SWEEP (NEXT, HIGH)** — clean the 93-item worklist (D28) so the gating guard + matrix
      #19 go GREEN. Tutor teaching banned content is the urgent part. Run against the corrected guard.

## 2026-06-03 — Post-PR #184 roadmap update (Exam Trends ranked-list responsive redesign; FIRST Option-B convergence)

### Completed this session
- [x] PR #184 — Exam Trends ranked-list responsive redesign. ONE responsive component
  `src/pages/ExamTrendsRanked.tsx` renders at every width and RETIRES both twins
  (`DesktopExamTrendsPage.tsx` + `app/ExamTrends.tsx`, deleted); `App.tsx` `/exam-trends` route
  de-split. Locked ranked priority-list; design grammar reused exactly; real data only; proof tag
  omitted (no real `proof` field). Gates green (tsc, build, scope:guard --mode product, matrix
  137/137). Trunk after merge `93a2674`. FIRST Option-B convergence — the TEMPLATE for the rest.

### Responsive redesign (Option B LOCKED — converge twins, one component per surface)
  [x] Exam Trends ranked-list (#184 — DONE; sets the pattern)
  [ ] **Content-correctness sweep (NEXT, HIGH)** — clean banned syllabus content from
      `topicTeachContracts.ts` (tutor) + `topics.ts` blurbs + config files; EXTEND `syllabusGuard`
      to scan them (D26). Tutor teaching banned content is the urgent part.
  [ ] **Re-derive Exam Trends priorities FRESH** (tier + trend + marks) from current syllabus +
      recent paper pattern (D27); re-check HPQ counts. PREREQUISITE for the band redesign.
  [ ] **Exam Trends band redesign** — Must-crack / High-ROI / Good-to-do expandable bands (reuses the
      merged ranked-list rows; one synthesized priority verdict). ONLY AFTER the fresh tiering.
  [ ] TopicHub concept-spine (+ Formula Sheet / NCERT Notes) · [ ] Check & Improve · [ ] Me/Progress
      · [ ] Worksheet generator (each Option B; same template as #184)
  [ ] Formula/Notes content generation + correctness pass

### AI track status (carried)
  [x] gateway live (local) · [x] checker parse fix (#174) · [x] checker grading (#178)
  [x] tutor wiring (#181) · [x] tutor teaching LOCKED (#182)
  [ ] interactive-handoff fix (`findVisualForConcept` returns wrong visual) — separate PR
  [ ] mobile-tutor wiring (mobile `app/TopicHub.tsx` "Learn" is a placeholder) — separate PR
  [ ] check-solution eval set + tutor fabricated-solution correctness eval (launch gates)

## 2026-06-03 — Post-PR #182 roadmap update (tutor visible + teaching LOCKED; pivot to responsive redesign)

### Completed this session
- [x] PR #181 — wire concept tutor into desktop TopicHub (per-row "Learn this"; reuse ConceptTeachDrawer).
  Tutor is now VISIBLE + usable on desktop. Merged `fd44340`.
- [x] PR #182 (B2) — tighten concept teach-prompt to the owner-LOCKED style. Teaching is now direct/
  no-fluff/on-concept with a step-marking offer; on "yes" the tutor self-solves with per-step `[½/1 mark]`
  CBSE marking (math verified correct). Owner live-verified. Merged `fd0e7e9`. Live path =
  `promptLearn.cjs` + `mentorModeHandler.cjs` (D24).

### AI track status
  [x] gateway live (local) · [x] checker parse fix (#174) · [x] checker grading (#178)
  [x] tutor wiring (#181) · [x] tutor teaching LOCKED (#182)
  [ ] interactive-handoff fix (`findVisualForConcept` returns wrong visual) — separate PR
  [ ] mobile-tutor wiring (mobile `app/TopicHub.tsx` "Learn" is a placeholder) — separate PR
  [ ] check-solution eval set + tutor fabricated-solution correctness eval (launch gates)

### Responsive redesign (Option B LOCKED — converge twins, one component per surface)
  [ ] Exam Trends ranked-list (NEXT; source `02_exam_trends_ranked_list.html`)
  [ ] TopicHub concept-spine (+ Formula Sheet / NCERT Notes)
  [ ] Check & Improve · [ ] Me/Progress · [ ] Worksheet generator
  [ ] Formula/Notes content generation + correctness pass

## 2026-06-02 — Post-PR #178 roadmap update (grading-prompt tightening; D21 resolved)

### Completed this session
- [x] PR #178 (PR B Part 1) — check-solution GRADING prompt tightening. Parked branch rebased
  onto trunk `7948dc3` (clean) → squash-merged `c760c8e`. Scope: `checkSolution.cjs` prompt
  strings only. **D21 RESOLVED** (over-classification as conceptual): measured 6/9→8/9 solid on
  the T1–T9 scenario matrix (live gemini-2.5-flash). T7 (missing→null) + T8 (unbalanced→
  presentation) also fixed; T2 stays conceptual (no over-correction). T4 = accepted boundary
  case (Option 1). Gates: scope:guard OK, build exit 0, test:matrix:all 137/137.

### AI track status
  [x] A — gateway live on local dev (non-stub)
  [x] A2 (#174) — check-solution parse fix
  [x] B Part 1 (#178) — grading-prompt tightening (D21 resolved)
  [ ] Track A PR-1 — tutor wiring (per-row "Learn this" → ConceptTeachDrawer; tutor not yet visible)
  [ ] B2 — teach-prompt tightening (parked until tutor wired/visible)
  [ ] check-solution eval set (40–60 graded answers; T1–T9 matrix is the seed)
  [ ] Railway deploy (P0) + Clerk pk_live_ (P0) → student link

## 2026-06-02 — Post-PR #176 roadmap update (scope:guard re-armed)

### Completed this session
- [x] PR #176 — restored `lazytopper/docs/project_memory/governance/repo_boundary_policy.json`
  from history (`d4ed284`), re-arming `scope:guard`, `scope:guard:tutor`, `test:repo-boundary`,
  and `ci:smoke`'s first step (all had thrown "missing policy file" since `2081003` untracked
  it). ONE file, no code. New trunk SHA `1e9bd04`. Vercel GREEN before merge.

### The sequence (owner-confirmed 2026-06-02)
  [ ] PR B (Part 1) — grading-prompt tightening (sync parked `feat/check-solution-grading-prompt`
      `204ac7c` onto `1e9bd04`; re-run scope:guard + build + `test:matrix:all`; open + merge)
  [ ] Track A PR-1 — tutor wiring (per-row "Learn this" → ConceptTeachDrawer/TeachFlow
      `concept_teach` in DesktopTopicHub; the tutor is NOT yet visible in the product)
  [ ] PR B2 — teach-prompt tightening (deferred until the tutor is wired + visible)
  [ ] Railway deploy + `vercel.json /api/*` rewrite + rate limiting (ISSUE-009 unlock) → student link
  [ ] Track A redesign PRs + Track B content

### Backlog surfaced by #176 (deferred — see OPEN_QUESTIONS)
  [ ] `test:repo-boundary` 1/5 — `vitest.config.ts` matches no policy lane
  [ ] `verify-build.mjs` missing (CLAUDE.md §6 stale)
  [ ] `ci:smoke` downstream steps (build / tutor:eval / lint:ci) unevaluated
  [ ] Wire `ci:smoke` into CI so a broken gate fails loudly (the deeper fix per D23)

### Product decisions locked today (see DECISION_LOG)
  3/19 acceptance reds = known-red-by-decision (SES-04/PRG-03 → Dashboard→Home/Me-Progress
  consolidation; PRG-02 → Track A TopicHub). Dashboard retired → Home + Me/Progress (3 hardcoded
  `/dashboard` landings to fix in Track A). Mistake Intelligence not yet wired to Me/Progress.
  Daily Mix alive + premium-gated — owner KEEP/CUT decision pending.

## 2026-06-01 — Post-PR #174 roadmap update (check-solution parse fix; AI gateway live LOCAL)

### Completed this session
- [x] AI gateway live on LOCAL dev (non-stub, direct Gemini key; no code change — env is
  gitignored). Both endpoints (`/api/mentor`, `/api/check-solution`) return real Gemini
  output locally. Unblocks prompt tightening (PR B) against real output.
- [x] PR #174 (A2) — check-solution parse reliability. `responseMimeType:'application/json'`
  + `maxOutputTokens` 2500→8000 + warn-log + honest fallback (scope: checkSolution.cjs).
  Measured before/after on real handwritten images: the "could not evaluate" bug is fixed.
  New base SHA `5ad359c42127ac89056002c226828297ead7c98b`.

### AI track status (now active)
  [x] A — gateway live on local dev (non-stub)
  [x] A2 (#174) — check-solution parse fix
  [ ] B — tighten grading + teach prompts, MEASURED vs mistake-scenario matrix (fixes D21)
  [ ] check-solution eval set (40–60 graded answers, launch gate)
  [ ] Railway deploy (P0, now in scope) + Clerk pk_live_ (P0) → student link

### Two-track build (owner-locked 2026-06-01; specs owner/architect-held, not in repo)
  [ ] Track A — design/UI: fully responsive at every width (one fluid layout, not a 1024 twin)
  [ ] Track B — content: interactives via Claude, proofs, formula sheets, pre-gen PDFs + QA

### Still parked / unchanged
P0 launch blockers remain (API gateway prod deploy, Clerk pk_live_). Mobile reflow track
(usePracticeHub, MobilePracticePage) continues at lower priority than the AI track.

## 2026-06-01 — Post-PR #172 roadmap update (mobile Home polish; Vercel green)

### Completed this session
- [x] PR D / #172 — mobile Home polish + mobile-chrome fixes (<1024px). Rebuilt
  src/pages/app/MobileHome.tsx to the owner-locked design (illustrated gradient SVG
  icons, orient-before-act order, persistent hints, inspiring SAMPLE Mistake-Intel
  panel, honest CTA; real-data on the firebase-free boundary). BottomNav recoloured to
  the light grammar + expanded 3→5 tabs (Home/Exam Trends/Practice/Check/Me). theme-color
  #58cc02→navy #0f1b33. Addendum: global navbar suppressed on mobile /browse + /welcome
  (isMobileSelfChromedRoute) → single brand bar on both mobile pages (Search dropped from
  mobile Home, owner-approved). Desktop byte-identical. Tests 19→32. New base SHA
  `a6360370588014a0a696fea97d6f4d548b0e5a5a`. Vercel preview + production both GREEN
  (owner reviewed preview before merge).

### Mobile track status
  [x] PR A (#166) grammar primitives
  [x] PR B (#168) mobile Home (/browse)
  [x] PR C (#170) mobile landing (/welcome)
  [x] PR D (#172) mobile Home polish + 5-tab light BottomNav + single brand bar
  [ ] usePracticeHub extraction (reusable Practice Hub data/state hook)
  [ ] MobilePracticePage (consumes the hook; mobile Practice reflow)

### Flagged for a future deprecation PR (from the #172 §D audit)
  [ ] Legacy route consolidation: /dashboard→/me, /trends→/exam-trends,
      /practice/:g/:s→/practice-hub; dedicated Predicted destination via
      /predictive-papers
  [ ] Legacy #58cc02 colour-migration (styles.css/tokens.css/favicon/og-image →
      navy/green grammar)

### Still parked / unchanged
P0 launch blockers remain ahead of the UI track (API gateway 404, Clerk pk_live_).

## 2026-05-31 — Post-PR #170 roadmap update (mobile landing; Vercel green)

### Completed this session
- [x] PR C / #170 — mobile landing (swipe carousel) for /welcome. New
  src/pages/MobileWelcome.tsx (native CSS scroll-snap, 4 frozen v4 SVG cards, sticky
  honest CTA); /welcome branches `isDesktop ? Welcome : MobileWelcome`. Welcome.tsx
  untouched. New base SHA `ac2361736785ed392a2c272cd6ede26acda36a77`. Vercel preview
  + production both GREEN (owner reviewed preview before merge).

### Mobile track status
  [x] PR A (#166) grammar primitives
  [x] PR B (#168) mobile Home (/browse)
  [x] PR C (#170) mobile landing (/welcome)
  [ ] usePracticeHub extraction (reusable Practice Hub data/state hook)
  [ ] MobilePracticePage (consumes the hook; mobile Practice reflow)

### Still parked / unchanged
P0 launch blockers remain ahead of the UI track (API gateway 404, Clerk pk_live_).

## 2026-05-31 — Post-PR #168 roadmap update (mobile Home; Vercel green)

### Completed this session
- [x] PR B / #168 — mobile Home layout for /browse (first real page reflow). New
  src/pages/app/MobileHome.tsx on the PR-A primitives; /browse branches
  `isDesktop ? DesktopHome : MobileHome`; shared firebase-free
  src/lib/desktop/homeDestinations.tsx (PRIMARY_CARDS + loginUrl). Desktop render
  byte-identical. New base SHA `dfbbcff27796bb0ad980b2fd72c3eb19b0aa268f`. Vercel
  preview + production both GREEN.

### Staged UI track — remaining
  [ ] PR C — usePracticeHub extraction (reusable Practice Hub data/state hook)
  [ ] PR D — MobilePracticePage (consumes the PR C hook; mobile Practice reflow)

### Still parked / unchanged
P0 launch blockers remain ahead of the UI track (API gateway 404, Clerk pk_live_).

## 2026-05-30 — Post-PR #166 roadmap update (grammar primitives; Vercel green)

### Completed this session
- [x] PR A / #166 — shared responsive grammar primitives (`src/components/grammar/`:
  Card, TileRow, Pill, SectionHeader, tokens, index) + the FIRST real render test.
  TileRow reflows desktop↔mobile via a real `@media (max-width:1023px)` rule. No page
  changed. New base SHA `fefcbc74a01dee0ac2ef305e8c393571ff03c64c`. Vercel preview +
  production both GREEN.

### Staged UI track — remaining
  [ ] PR B — Mobile Home (reflow the Home cockpit onto the #166 primitives — TileRow
      for the 4-card row that squeezes on mobile — + a render test)
  [ ] PR C — usePracticeHub extraction
  [ ] PR D — MobilePracticePage

### Still parked / unchanged
P0 launch blockers remain ahead of the UI track (API gateway 404, Clerk pk_live_).

## 2026-05-30 — Post-PR #164 roadmap update (blackbox decommission; Vercel green)

### Completed this session
- [x] PR 0.5 / #164 — decommissioned the dead blackbox/tracker/pmem memory
  experiment (16 files + 20 npm scripts) and fixed the false-green `npx tsc --noEmit`
  in start:quick/start:safe. Live infra (.project_memory/ops, scripts/ops,
  serverConfig.cjs) preserved. New base SHA `7f41422d02f6040852abc0b3a9bbb3a253f06d23`.
  Vercel preview + production both GREEN.

### Staged UI track — next up
  [ ] PR A — shared responsive grammar primitives + FIRST real render test (uses the
      #160 Vitest infra; assert desktop vs mobile reflow via setMatchMediaMatches)
  [ ] PR B — Mobile Home
  [ ] PR C — usePracticeHub extraction
  [ ] PR D — MobilePracticePage

### Still parked / unchanged
P0 launch blockers remain ahead of the UI track (API gateway 404, Clerk pk_live_).

## 2026-05-30 — Post-PR #162 roadmap update (production-build hotfix; Vercel green)

### Completed this session
- [x] PR #162 — hotfix: exclude test files from production app tsconfig. New base SHA
  `bd0c36e7f5f81b2a80f867616895af1bd23a2156`. Stopped #160's dev-only test files from
  entering the `tsc -b` production compile (they break on Vercel where devDeps are
  pruned). Vercel preview AND production deploy both confirmed GREEN.

### Planned next (the staged UI track from the planning session)
  [ ] PR 0.5 — Blackbox decommission + false-green `npx tsc --noEmit` fix
      (`chore/decommission-blackbox`). Removes dead tooling; the false-green check is
      the same bug class that caused the #160→#162 episode. Owner approval required.
  [ ] PR A — shared responsive grammar primitives + FIRST real render test
  [ ] PR B — Mobile Home
  [ ] PR C — usePracticeHub extraction
  [ ] PR D — MobilePracticePage

### Still parked / unchanged
P0 launch blockers remain (API gateway 404, Clerk pk_live_) per CURRENT_STATE.md.

## 2026-05-30 — Post-PR #160 roadmap update (render-test infra foundation)

### Completed this session
- [x] PR #160 — Vitest + Testing Library render-test infrastructure (tooling-only).
  New base SHA `99fd660bf9ef9cbd4ead133344c10352d529809a`. Installs the render-test
  mechanism the upcoming UI track depends on: `npm test` in `lazytopper/` runs Vitest
  over `src/**/*.test.tsx` (jsdom + Testing Library + jest-dom + matchMedia polyfill).
  One smoke test green; 137 guard tests untouched. No feature/component/data changes.

### Unblocked next (UI render-test track)
With infra in place, each of these UI PRs must now ship a real render/reflow test:
  [ ] Grammar primitives PR
  [ ] Mobile Home PR
  [ ] Practice-page extraction PR
  [ ] Blackbox-decommission PR (also fixes the false-green `npx tsc --noEmit` in
      `start:quick`/`precommit:check` — out of scope for #160)

### Still parked / unchanged
P0 launch blockers remain ahead of the UI track per CURRENT_STATE.md:
  [ ] ISSUE-009 API gateway 404 in production (Railway deploy + vercel rewrite)
  [ ] ISSUE-010 Clerk pk_live_ keys switch

## 2026-05-25 — Post-PR #147 + #148 roadmap update

### Completed this session
- P4 PYQ 2024 COMPLETE:
  · PR #147 — 96 Maths PYQs (pyqYear: "2024"), 13 files, 17 OR pairs
  · PR #148 — 76 Science PYQs (pyqYear: "2024"), 13 files
  · Combined: 172 board PYQs from 2023-24 exam

- P4 PYQ PHASE FULLY COMPLETE:
  All 4 main exam years extracted:
  · 2022-23: 214 Qs (PR #135+#137)
  · 2023-24: 172 Qs (PR #147+#148)
  · 2024-25: 182 Qs (PR #144+#145)
  · 2025-26: 193 Qs (PR #141+#142)
  Total board PYQs: 761 across 4 exam years

### Active track — Product fixes
  [ ] fix/practice-filters-complete — filter bugs + step marks (instruction ready)
  [ ] fix/mojibake-ncert-exemplar — NCERT/Exemplar symbol corruption
  [ ] Handoff post-fixes

### Expected bank state after fixes
  These are code/quality fixes — no new questions added
  Authentic: ~3,245 (unchanged)
  Retirement threshold: ~72.1% (unchanged)

### Next content track — P5 Sample Papers
  After fixes complete and ~3,245 authentic confirmed:
  Remaining to threshold: ~1,255 questions
  Source: P5 Sample + Preboard papers (~200 Qs)
  Then: pack retirement decision at 4,500

### Parked track — Product PRs
Blocked until authentic >= 4,500.
  [ ] P2 — strategyHint Hint button
  [ ] P3 — Show visual wiring
  [ ] P4 — Formula sheet tab
  [ ] P1 — API gateway (production blocker)

## 2026-05-25 — Post-PR #144 + #145 roadmap update

### Completed this session
- P4 PYQ 2025 COMPLETE:
  · PR #144 — 57 Maths PYQs (pyqYear: "2025"), 12 files
  · PR #145 — 125 Science PYQs (pyqYear: "2025"), 13 files
  · Combined: 182 board PYQs from 2024-25 exam
  · Total board PYQs in bank: 589 across 3 exam years

### Active track — P4 PYQ 2024 (final year)
  [ ] PR — P4 2024 Maths (~80 Qs) — content/p4-pyq-2024-maths
  [ ] PR — P4 2024 Science (~80 Qs) — content/p4-pyq-2024-science
  [ ] PR — Handoff post-2024

### Expected bank state after 2024
  Authentic: ~3,233 (~71.8% of 4,500 threshold)
  Board PYQs: ~749 across 4 exam years (2022-23, 2024, 2025, 2026)
  Spreads: ~279

### After P4 2024 complete — retirement path
  Remaining to threshold: ~1,267 questions
  Sources available:
    · P5 Sample papers (~200 Qs)
    · 2022 Term II papers (pipeline adaptation needed, low priority)
    · P3 Maths chapterwise cbjemaco (MCQ-only, deferred)

### Parked track — Product PRs
Blocked until authentic >= 4,500. See LazyTopper_Tutor_Content_Audit_Findings.md.
  [ ] P2 — strategyHint Hint button (Small — highest value/effort)
  [ ] P3 — Show visual wiring (~20 lines)
  [ ] P4 — Formula sheet tab (Medium)
  [ ] P1 — API gateway (High — production blocker)

### Low priority
  [ ] K2H-8f-c — isPYQ backfill in predictionTypes.ts
  [ ] 2022 Term II papers (pipeline adaptation needed)
  [ ] AR density pass (2-3 AR per topic)

## 2026-05-25 — Post-PR #141 + #142 roadmap update

### Completed this session
- P4 PYQ 2026 COMPLETE:
  · PR #141 — 42 Maths PYQs (pyqYear: "2026"), 13 files
  · PR #142 — 151 Science PYQs (pyqYear: "2026"), 13 files
  · Combined: 193 board PYQs from 2025-26 exam
  · Total board PYQs in bank: 407

### Active track — P4 PYQ 2025
Priority order: 2025 → 2024 (2026 done, 2023 done)

  [ ] PR — P4 2025 Maths (~80 Qs) — content/p4-pyq-2025-maths
  [ ] PR — P4 2025 Science (~80 Qs) — content/p4-pyq-2025-science
  [ ] PR — Handoff post-2025
  [ ] PR — P4 2024 Maths (~80 Qs) — content/p4-pyq-2024-maths
  [ ] PR — P4 2024 Science (~80 Qs) — content/p4-pyq-2024-science
  [ ] PR — Handoff post-2024

### Expected bank state after 2025 + 2024
  Authentic: ~3,051 (~67.8% of 4,500 threshold)
  Board PYQs: ~567 across 4 exam years (2022-23, 2024, 2025, 2026)

### Parked track — Product PRs
Blocked until authentic >= 4,500. See LazyTopper_Tutor_Content_Audit_Findings.md.
  [ ] P2 — strategyHint Hint button (Small)
  [ ] P3 — Show visual wiring (~20 lines)
  [ ] P4 — Formula sheet tab (Medium)
  [ ] P1 — API gateway (High — production blocker)

### Low priority
  [ ] K2H-8f-c — isPYQ backfill in predictionTypes.ts
  [ ] 2022 Term II papers (pipeline adaptation needed)
  [ ] AR density pass (2-3 AR per topic)

---

Latest verified live base:
```
base/approved-thru-437
b7add944a713430679de8c5e6d07dca49f4db272
```

Current stage:
PR #82 / PR-K2H-5 is merged. K2H product work paused since PR #87. Recent activity has been
in the content + tooling track (PRs #112, #114, #116, #117, #119, #121, #123, #124, #126,
#128, #130, #132, #133, #135, #137, #139). **K2H-8f thread is now COMPLETE** (PR #139
wired the UI bridge — PYQ chip end-to-end functional). **P4 PYQ 2022-23 phase complete**:
214 verbatim board PYQs across all 26 retained Class 10 topicKeys, all engine-recognised
via `pyqYear` path. Authentic-question total 2,698 / 4,500 = **60.0%** of retirement
threshold.

**NEW PYQ SOURCE CONFIRMED**: `cbse-papers\gdrive\PYQs\MS\final MS` contains MS files for
2022-2026 (all years). Unblocks P4 continuation for 2024, 2025, 2026 (~300-400 more board
PYQs potentially extractable).

Next parallel tracks open:
  1. **P4 continuation 2026** — High (most recent exam, highest value)
  2. **P4 continuation 2025** — High (after 2026 merges)
  3. **P4 continuation 2024** — High (after 2025 merges)
  4. **K2H-8f-c** — Low (add `isPYQ?: boolean` to `CanonicalQuestion` + backfill on 214)
  5. **Pre-launch product quick wins** — Parked until authentic count ≥ 4,500

Current implementation branch:
```
None. Create the next implementation branch fresh from the live verified base after this docs-only handoff update merges.
```

## 2026-05-25 — Post-PR #139 roadmap update

### Completed this session
- K2H-8f FULLY COMPLETE (3-PR thread):
  · PR #133 — engine hard filter + isPYQQuestion() helper
  · PR #135+#137 — 214 board PYQs added (2022-23)
  · PR #139 — UI bridge wired, soft-fallback removed
  PYQ chip is now end-to-end functional.

### Active track — P4 PYQ continuation
Priority order: 2026 → 2025 → 2024 (most recent exam first)
Expected: ~520 additional PYQs across 3 years
Post-extraction authentic count: ~3,218 (~71% of 4,500 retirement threshold)

  [ ] PR #140 — P4 2026 Maths (~100 Qs) — content/p4-pyq-2026-maths
  [ ] PR #141 — P4 2026 Science (~100 Qs) — content/p4-pyq-2026-science
  [ ] PR — Handoff post-2026
  [ ] PR — P4 2025 Maths (~80 Qs) — content/p4-pyq-2025-maths
  [ ] PR — P4 2025 Science (~80 Qs) — content/p4-pyq-2025-science
  [ ] PR — Handoff post-2025
  [ ] PR — P4 2024 Maths (~80 Qs) — content/p4-pyq-2024-maths
  [ ] PR — P4 2024 Science (~80 Qs) — content/p4-pyq-2024-science
  [ ] PR — Handoff post-2024

### Parked track — Product PRs
Blocked until authentic ≥ 4,500. See LazyTopper_Tutor_Content_Audit_Findings.md.
  [ ] P2 — strategyHint Hint button (Small)
  [ ] P3 — Show visual wiring (~20 lines)
  [ ] P4 — Formula sheet tab (Medium)
  [ ] P1 — API gateway (High — production blocker)

### Low priority
  [ ] K2H-8f-c — isPYQ backfill in predictionTypes.ts
  [ ] 2022 Term II papers (pipeline adaptation needed)
  [ ] AR density pass (2-3 AR per topic)

## Content + Tooling track — recent stages

Latest in the content/tooling track:

- PR #137 (2026-05-25) — **P4-S PYQ Science**: 111 verbatim CBSE 2022-23 board questions
  across 13 science/*.pyq.ts files. ID prefix `PYQ-S-{TOPIC}-{NNN}`. Section A=37 / B=23 /
  C=29 / D=15 / E=7; competency 85.8% avg. Sources: 9 text-extractable QPs (31/2/x,
  31/4/x, 31/5/x) + 4 matching MS files ("ALL SETS" bundles split by Paper Code marker).
  Deferred: 6 scanned QPs (31/1/x, 31/6/x); ~60 Hindi-only bodies; ~50 truncated bodies;
  3 broken-option MCQs. Doctrine continued from P4-M (PR #135): `pyqYear: "2023"`
  populated; `isPYQ` field omitted until K2H-8f-c lands. Spreads 189 → 202; authentic
  2,587 → 2,698; bank 5,415 → 5,526. **P4 PHASE COMPLETE — 214 board PYQs total.**

- PR #135 (2026-05-25) — **P4-M PYQ Maths**: 103 verbatim CBSE 2022-23 board questions
  across 13 maths/*.pyq.ts files. ID prefix `PYQ-M-{TOPIC}-{NNN}`. Section A=48 / B=15 /
  C=22 / D=15 / E=3; competency 100%. Sources: 9 text-extractable QPs (30/2/x, 30/4/x,
  30/5/x) + matching MS 041_30-x-x marking schemes. Deferred: 6 scanned QPs (require OCR);
  48 Hindi-only bodies; 41 truncated bodies; 18 broken-option MCQs. NEW doctrine locked:
  `pyqYear: "2023"` populated; `isPYQ` field OMITTED until K2H-8f-c lands (engine
  isPYQQuestion() helper recognises 103/103 via pyqYear path). Spreads 176 → 189;
  authentic 2,484 → 2,587; bank 5,281 → 5,415.

- PR #119 (2026-05-24) — P2 CBSE SQP 2023-24: 69 questions across 25 topic files (Maths 38 +
  Science 31). Adopted pymupdf as the official PDF extraction tool (replaces pdfplumber).
- PR #121 (2026-05-24) — Reproduction bank cleanup + syllabusGuard variant extension:
  18 questions removed across 3 reproduction banks (later restored in PR #124); 5 new
  banned variants added (later removed in PR #124); 35-test regression suite created.
- PR #123 (2026-05-24) — ops acceptance regression suite: 37 new tests in
  `scripts/src/opsAcceptanceGuard.test.ts` locking the deletion doctrine across registry,
  archetypes, topics, and syllabusGuard. Purely additive.
- PR #124 (2026-05-24) — syllabusGuard 2026-27 doctrine fix: 26 banned strings removed
  (12 reproductive-health + 14 Our Environment ecology); Sources of Energy promoted to
  deletedTopics; new formativeOnlyTopics array for Motor/EMI/Generator; 18 questions
  restored. Authentic count 1,699 → 1,717. Test matrix now 125/125 across 4 files.
- PR #126 (2026-05-25) — P2 APQ Maths PQ1 + PQ2: 76 questions across 13 new
  `.additionalPQ.ts` files (one per Maths topic, PQ1+PQ2 combined). 88% competency,
  ~22 REQUIRES-FIGURE tags. Authentic 1,717 → 1,793; spreads 137 → 150. Pack retirement
  threshold REVISED from 6,000 to 4,500.
- PR #128 (2026-05-25) — P2 APQ continuation (PQ_2022 + Science-PQ): 90 questions across
  26 topic files. PQ_2022 appended to 13 Maths files (+44 Qs); Science-PQ created 13 new
  Science files (+46 Qs) — all 13 retained Science topicKeys now have APQ content.
  **First ever Our Environment questions in the bank** (4 Qs). OR-pair doctrine validated
  (non-MCQ density 36 → 46 between PR #126 and #128). Authentic 1,793 → 1,883; spreads
  150 → 163. Progress to 4,500 retirement: 41.8%.
- PR #130 (2026-05-25) — P2 APQ Science-PQ2 (finale): 49 questions appended across the
  13 existing Science topic files. No new files; canonicalQuestionBank.ts untouched.
  10 OR-pairs as separate rows, 13 REQUIRES-FIGURE tags. Section breakdown A=20 B=8 C=9
  D=6 E=6; competency 81.6%. Authentic 1,883 → 1,932; spreads unchanged at 163. Bank
  total (engine-confirmed) 4,729. Progress to 4,500 retirement: 42.9%. **P2 APQ phase
  COMPLETE** — 284 authentic Qs across 5 papers (PRs #119, #126, #128, #130). Branch
  `content/additional-pq-sqp-2024` DELETED post-merge (remote + local); future extraction
  phases use fresh branch names per phase to eliminate the force-push requirement.
- PR #132 (2026-05-25) — P3 Science chapter-wise: **552 questions** across 13 new
  `science/{topic}.chapterwise.ts` files (one per retained Science topic). Sources:
  cbjescco01-15 (MCQ, 252 Qs) + cbjesccq01-15 (PYQ-style, 300 Qs) from www.cbse.online.
  Section breakdown A=330 B=78 C=72 D=72 E=0; competency 74.6% (MCQ defaults to
  competency=true per locked CBSE 2026-27 doctrine); ~70 REQUIRES-FIGURE tagged.
  ID prefixes SCO-S-* and SCQ-S-*. Authentic 1,932 → 2,484; spreads 163 → 176; bank
  total 4,729 → 5,281. Progress to 4,500 retirement: 55.2% (+12.3 pp). Permanent source
  decisions recorded: Meridian/NODIA/cbjemacq/Maths-Basic-430/Aakash-chapterwise/Old\
  all permanently SKIPPED with rationale. Caveat: pymupdf renders `→` as `$` in this
  source (verbatim from PDF; future cleanup pass could substitute where safe). Branch
  `content/p3-science-chapterwise` DELETED post-merge.
- PR #133 (2026-05-25) — K2H-8f PYQ filter (engine layer): adds `pyqOnly?: boolean`
  field to `PracticeSetConfig` and exported `isPYQQuestion(q)` helper that honours both
  explicit `isPYQ: true` and populated `pyqYear` (covers current bank tagging convention
  "2022"/"2023"/"30/1/1"). Engine now applies a HARD pyqOnly filter — no silent
  soft-fallback. 435 `pyqYear`-tagged questions now correctly returned. New test file
  `scripts/src/practiceSetGeneratorGuard.test.ts` with 9 regression tests; full matrix
  grew from 125 to **134/134 PASS** (5 test files). Three UI-side follow-ups remain
  (separate PRs): wire `pyqOnly` through practiceQuestionBuilder.ts; fix engine-to-UI
  field stripping; add `isPYQ?: boolean` to CanonicalQuestion. P4 PYQ extraction is now
  unblocked at the engine layer. Branch `fix/k2h-8f-pyq-filter` DELETED post-merge.

Doctrine snapshot (2026-27):
- RETAINED in board scope: Our Environment (ecology, Unit V 5 marks), Reproduction
  including reproductive health (Ch 8), Heredity Mendelian section.
- DELETED in board scope: Periodic Classification (Ch 5), Sources of Energy (Ch 14),
  Management of Natural Resources (Ch 16), Evolution section of Heredity.
- FORMATIVE ONLY (taught but not assessed): Motor / Electromagnetic Induction / Generator.

Extraction doctrine additions (PR #126 cycle):
- Pack retirement threshold: **4,500 authentic** (revised from 6,000).
- REQUIRES-FIGURE strategyHint: standard tag for questions referencing PDF figures
  that don't render in text extraction.
- B/C/D/E OR variants: future extractions must extract BOTH alternatives as separate
  questions to increase non-MCQ density.
- AR density: dedicated `.assertionReasoning.ts` pass scheduled post-P2-APQ
  (2-3 AR per topic, both Maths and Science).

See `CURRENT_STATE.md` for the full PR history table and `NEXT_ACTION.md` for the queued
content tasks. Next: **P4-M PYQ Maths** (fresh branch `content/p4-pyq-maths`; 16 QPs
30-x-x + 16 MS on disk; ~400 Qs; `isPYQ: true` + `pyqYear` populated) AND/OR **P4-S PYQ
Science** (fresh branch `content/p4-pyq-science`; 15 QPs 31_x_x + MS on disk; ~400 Qs;
can run in parallel). UI follow-ups for K2H-8f and the pre-launch quick wins continue on
the product track. Owner decides sequence next session.

## PR-K2H-5 / PR #82 - Login visual parity + auth gate polish

Status:
Merged.

PR:
```
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/82
```

Merged at:
`2026-05-17T12:15:42Z`

Previous checkpoint before merge:
`283355dec5ced04bbe72976f5f068593e0900799`

Final head:
`06ba3cd74c93cf0c47fd44a4957e72b97a782765`

Merge commit / new base:
`11aac1bc8bce67e6b2d67e540b4295491c0b78e0`

Changed files:
2

Changed files list:
- `lazytopper/src/pages/Login.tsx`
- `lazytopper/src/lib/desktop/loginPrompts.ts`

Completed:
- Polished the production Login gate into a calmer LazyTopper auth composition aligned with the frozen landing and Lovable/topic-focus-lite LoginGate visual/composition direction.
- Refined the left brand/value panel, right reason-aware gate, Clerk frame, helper copy, desktop rhythm, and mobile/narrow layout.
- Kept Login production-real-auth, not prototype fake auth.
- Preserved real Clerk SignIn and BASE_PATH / Clerk path behavior.
- Preserved reason-aware prompting, unknown reason fallback, signed-in redirect, `location.state.from`, and profile/onboarding fallback.
- Preserved and strengthened safe redirect handling by rejecting empty redirect query values and backslash-containing paths.
- Kept no guest CTA and no app shell/sidebar/bottom nav on Login.
- Removed visible Clerk Development mode warning using supported Clerk appearance option `unsafe_disableDevelopmentModeWarnings`, not a DOM/CSS hack.
- Did not hide required provider, legal, or security UI.

Validation:
- TypeScript passed.
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Production verifier passed: 8 passed, 0 failed.
- `git diff --check` passed.
- Allowed-file check passed.
- Forbidden-file guard produced no output.

QA result:
PASS.

Visual QA:
- Local screenshots existed for 1440x900, 1366x768, and 390x844.
- Owner Vercel preview QA passed key items: Development mode not visible, Clerk visible/usable, no guest CTA, no app chrome/nav, reason copy variants correct, and Back link safe.
- Owner did not manually verify every viewport on Vercel; local screenshot evidence covered viewport confidence.

Follow-ups:
- Production launch still requires Clerk production instance / `pk_live` env configuration.
- Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control.

## PR-K2H-6 - Home/cockpit learning order + Continue repair

Status:
Recommended next implementation PR after this docs-only update.

Goals:
- Make Home/browse cockpit order match the learning loop: Exam Trends -> Practice -> Worksheets -> Check & Improve.
- Repair "Continue where you left off" so it never routes to TopicHub "Topic not found."
- If the saved topic is not curated, hide the continue card or route safely to Practice Hub / Exam Trends with honest state.
- Do not touch landing, Login, pricing, Practice internals, HPQ, or TopicHub content unless a future K2H-6 prompt explicitly scopes it.
- Do not start until this docs-only handoff update is merged.

Required starting point for future product prompts:
`base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

## PR-K2H-4 / PR #80 - Frozen landing page and explore-first entry

Status:
Merged.

PR:
```
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/80
```

Merged at:
`2026-05-16T18:43:48Z`

Base before merge:
`18e6e111884b05795882da75ba4c65f034d9d4e9`

Head branch:
`feat/desktop-pr-k2h-4-frozen-landing-explore-entry`

Final head:
`045ffa00a3894405f67a5ceda778f313c693fa0f`

Merge commit / new base:
`018c95b11f5168d27fb93bb3a2cae3859b682627`

Changed files:
3

Changed files list:
- `lazytopper/src/App.tsx`
- `lazytopper/src/components/desktop/DesktopShell.tsx`
- `lazytopper/src/pages/Welcome.tsx`

Completed:
- Implemented the frozen public landing page in production.
- Replaced the old dark/text-heavy landing page with the final visual storyboard landing.
- Final landing has one primary CTA: Explore.
- CTA is placed centrally below the four product cards and above the Mistake Intelligence section.
- Top-right Sign in remains for existing users.
- Removed Start free trial as the landing CTA.
- No Explore as Guest on landing.
- No landing sidebar/app chrome.
- Four-card story preserved: Exam Trends -> Practice -> Check & Improve -> Me / Progress.
- Step captions, Attempts pill, and Insights pill removed.
- Card internals simplified so cards read as landing previews.
- Blue arrows aligned with card bodies.
- Mistake Intelligence title/tagline and bottom benefit strip preserved and visible.
- Added signed-out Explore-first browse entry through `/browse`.
- Explore opens `/app/browse` and does not open Login.
- `/browse` shows product cockpit/shell without creating a guest user/session.
- Existing real action gates/login behavior remain intact.
- Preserved PR #77 route-context behavior and PR #78 auth/session/account/logout/profile/pricing behavior.
- Login visual polish intentionally not included.

Validation:
- TypeScript passed.
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Build verifier passed: 8 passed, 0 failed.
- `git diff --check` passed.
- Vercel QA passed.
- No Login, Pricing, DesktopHome, Practice, HPQ, Mock, TopicHub, docs/handoff, package, server, env, or data files changed in PR #80.

QA result:
PASS.

Doctrine:
- Public landing is frozen from PR #80.
- Do not redesign `Welcome.tsx` unless owner explicitly reopens landing design.
- Landing has one primary CTA only: Explore.
- Browse mode is for product inspection only and must not create a fake guest learner.

## Historical PR-K2H-5 - Login visual parity + auth gate polish planning note

Status:
Completed by PR #82.

Allowed likely scope:
- `lazytopper/src/pages/Login.tsx`
- `lazytopper/src/lib/desktop/loginPrompts.ts`
- Optional only if proven necessary: small Login-only style/helper file if already existing and safe.

Forbidden unless owner explicitly changes scope:
- `Welcome.tsx`, `App.tsx`, `DesktopShell.tsx`, `DesktopHome.tsx`, `PricingPage.tsx`
- Practice, HPQ, Mock, TopicHub
- docs/handoff
- package/server/env/data

Goals:
- Visually align Login with final landing and Lovable prototype login gate.
- Maintain real Clerk SignIn.
- Remove/avoid any guest CTA.
- Preserve reason/redirect handling and safe redirects.
- Keep explanation of why login matters: saving attempts, progress, mistakes, and powering Mistake Intelligence.
- Do not change auth provider architecture in this PR.
- Record Clerk friction / development-mode branding as a launch-readiness follow-up if not solvable only in UI.

## PR-K2H-3 / PR #78 - Auth/session shell hardening

Status:
Merged.

PR:
```
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/78
```

Merged at:
`2026-05-16T02:26:54Z`

Base before merge:
`0ed0871f3166e647fb5b3e36fb0c1e543df0c145`

Final head:
`2067fa5079161c8a888398683d35c3bac59429b0`

Merge commit / new base:
`0addba3f0208c7610d02ab1b1753923fdf0790db`

Changed files:
11

Completed:
- Removed visible real-app guest mode from Login.
- Preserved real Clerk authentication and prototype-style split Login gate functionally.
- Strengthened Login copy around saved attempts, Mistake Intelligence, progress, and 7-day trial.
- Added DesktopShell account menu with identity, trial/premium state, Me / Progress, Manage subscription, and Log out.
- Logout returns the student to public landing.
- Redirected `/profile` to `/me`.
- Removed desktop full-width trial ribbon in favor of compact shell/account status.
- Routed Upgrade / Manage subscription to `/pricing` with source and returnTo.
- Removed normal client-side fake premium activation from upgrade UI.
- Added safe learner account metadata sync without storing credentials.
- Reordered desktop sidebar to Home -> Exam Trends -> Practice -> Check & Improve -> Me / Progress.
- Payment gateway integration is intentionally deferred.
- Pricing page is honest about manual activation / no automated checkout.
- PR #77 HPQ/Practice/Mock route-context files were not touched.

Validation:
- TypeScript passed.
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Build verifier passed: 8 passed, 0 failed.
- `git diff --check` passed.
- No package/server/data/env/docs/handoff files changed in product PR.
- PR #77 route-context files were not touched.

QA result:
PASS WITH FOLLOW-UP.

Follow-ups:
- Login visual parity polish.
- Pricing visual redesign.
- Home "Continue where you left off" route/content repair.
- Remaining direct `/profile` reference cleanup.
- Payment gateway deferred until verified payment/admin activation work.

## Historical owner-choice implementation options after PR #78

Option A - Login visual parity polish:
- Make Login visually match Lovable prototype more closely.
- Keep real Clerk auth, split layout, reason/redirect, no guest CTA, and K2H-3 auth/session behavior.
- Clean the right Clerk/auth panel so it feels calm and integrated.

Option B - Frozen landing page redesign:
- Historical option completed by PR #80. Final public landing now uses one primary CTA: Explore.
- Keep top-right Sign in for existing students.
- Explain the product visually without a wall of text.
- Preserve browse-first/action-gated doctrine.

Option C - Home continue-card route repair:
- Fix "Continue where you left off" leading to TopicHub Topic not found.
- Use a safe topic slug or fallback to Practice Hub/Exam Trends.
- Do not disturb PR #77 navigation chain.

Preferred sequence:
1. Login visual parity polish.
2. Frozen landing page redesign.
3. Home continue-card route repair as a small PR if it becomes annoying during QA.
4. Pricing visual redesign before paid launch.
5. Payment gateway/manual UPI/payment activation near launch.

## Roadmap rule

Do not treat this roadmap as permission to skip audits.

Before each implementation stage:
- verify GitHub base
- inspect relevant files
- preserve allowed-file scope
- validate
- QA visible work
- audit GitHub diff before merge
- update handoff folder

## PR-K2F / PR #72 - Practice and HPQ Level-3 visual grammar alignment

Status:
Completed and merged.

PR:
```
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/72
```

Purpose:
Align Practice and HPQ with the desktop Level-3 product grammar. HPQ is a prediction-first execution surface, not a generic practice-mode page.

Completed in local repair:
- Practice visual grammar pass from earlier PR #72 commit preserved.
- HPQ moved into desktop shell.
- Old HPQ desktop chrome hidden.
- Prediction-first HPQ hero.
- Stronger Maths / Science toggle.
- Lightweight Refine predictions filters.
- Competency questions integrated into predicted stacks.
- State-aware mock basket with planning-only copy.
- HPQ self-check removed.
- Check my answer primary path for non-MCQ.
- MCQ / Assertion-Reason option click feedback where structured data exists.
- Check panel and steps panel mutually exclusive.
- Objective Solution logic avoids inflated marks.
- Duplicate answer-only objective logic row hidden.
- Student-safe step-solution fallback copy.
- Topic Hub returns to Predicted Questions.
- SolutionChecker restyled to desktop grammar.

Exit gate:
- TypeScript passes.
- Production build passes.
- Build verifier passes.
- GitHub diff scope is clean.
- Vercel preview works at `/app/`.
- Browser Agent QA or documented manual QA covers visible flows.
- GPT owner audits before merge.

QA note:
- Browser Agent verified Practice visual grammar.
- HPQ and Exam Trends Browser QA was inconclusive because the guest Browser Agent hit the Premium Feature interstitial and cannot complete magic-link authenticated QA.
- Product owner manually verified HPQ while signed in / trial-unlocked on the Vercel preview.
- Remaining issues are question-bank / solution-quality / structured-option completeness, not PR #72 visual grammar.

## PR-K2G / PR #73 - Practice visual/shell/routing/CTA closeout

Status:
Merged.

Final head:
`54638b25c6cf2ca88c1f336a91712e2d1d0108ad`

Merge commit / base:
`39861a455dd9728dea70924e8e9dea6575bf1208`

Scope:
- Practice Hub improved as a Level-3 entry surface.
- Start quick practice now routes directly to full Practice.
- Inline generated quick-practice detour removed from normal flow.
- Full Practice now renders in DesktopShell at desktop width.
- Practice visual grammar moved closer to HPQ/upgraded desktop pages.
- Back/returnTo from Practice Hub to full Practice fixed.
- Mobile/narrow Practice Hub no longer falls back to old legacy PracticeHome.
- CTA labels/panels polished:
  - Check my answer
  - Show steps
  - Hide check
  - Hide steps
  - Check and Steps are mutually exclusive.
- Session notes are local-only and explicitly not saved to Me / Progress.
- No fake progress/mastery/score/Mistake Intelligence was added.

Not full graded evidence completion:
- PR-K2G is a visual and UX closeout only.
- It does not implement the Practice graded evidence path.
- It does not connect Practice to Mistake Intelligence or Me / Progress from local Practice interactions.

Exit gate:
- Manual Browser/owner visual QA accepted.
- Documentation and handoff updated.
- No product-code work is included in this docs-only stage.

## PR-K2H-1 / PR #75 - Harden Practice checked-evidence states

Status:
Merged.

PR:
```
https://github.com/chetan-anand-hub/Lazytopper-Production/pull/75
```

Final head:
`1745ca6f93a73b245f8024a3663318fe9aa0d5f6`

Merge commit / base:
`38f5a56a9a02964b1c6cf49fbd72013da11179ca`

Changed files:
3

Commits:
5

Completed:
- Preserved PR #73 Practice Level-3 visuals.
- Hardened checked-answer evidence states.
- Improved SolutionChecker status labels across shared checker usage.
- Removed student-hostile MCQ copy such as "local practice feedback" and "stored key."
- Removed the small MCQ "S" session badge.
- Treated MCQ option click as a real answer attempt where a trusted key exists.
- Logged wrong trusted MCQ attempts through the existing mistake-history path for signed-in non-local-session learners.
- Preserved typed/uploaded Check my answer as the richer checked-answer path.
- Updated Practice footer/session copy so it no longer says "not saved to Me / Progress."
- Restored safe CBSE-style step-mark chips for written multi-mark Practice Show Steps when returned step marks match total question marks.
- Hid step-mark chips for MCQ/objective and 1-mark questions.
- Hid unsafe step splits with guide-only warning.
- Did not touch HPQ files.
- Did not touch TopicHub files.
- Did not touch server/API/package/data/env/docs in the product PR.

Data-honesty doctrine:
- MCQ click is a real answer attempt.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history is still deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress/mastery/score/weak areas/Mistake Intelligence were added.
- Signed-in trial users should receive full feature access during the 7-day trial.

Not completed:
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters and selection quality.
- HPQ Build Mock back navigation repair.
- TopicHub Board Essentials concept-aware Practice routing.
- Sign-in/trial enforcement pass across learning surfaces.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

## PR-K2H-2 - Route/context repair

Purpose:
Repair route/context flows that affect student continuity after PR #75.

Scope:
- HPQ Build Mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.

Forbidden:
- PR #69 / K2D code absorption without explicit audit and owner approval.
- broad HPQ data/question-bank work.
- fake progress, mastery, score, weak areas, or Mistake Intelligence.

## PR-K2H-3 - Durable MCQ answer-attempt model

Purpose:
Create a durable answer-attempt model for correct and wrong MCQ attempts without faking progress or mastery.

Scope:
- Durable attempt history for correct and wrong MCQ attempts.
- Objective-question evidence should remain distinct from typed/uploaded Check my answer evidence.
- Mistake Intelligence may consume trusted wrong-MCQ evidence only through an honest saved-evidence path.

## PR-K2H-4 - Advanced Practice filters and selection quality

Status:
DONE — delivered as PR #92 / K2H-8b+8c. See "Post-PR #92 / PR-K2H-8b+8c handoff update" at the bottom of this roadmap for the actual scope and merged SHA.

Purpose:
Improve Practice selection quality and control.

Scope (delivered):
- Section A/B/C/D/E filters — chips with mark labels (`A · 1mk` … `E · Case (4mk)`) in both Practice Hub and `Build this set`.
- Marks filters — implicit in the Section chips.
- Type/family filters — Question Type chip row (MCQ / Proof / Competency / Assertion-Reason / Case-based).
- Competency filters — via the `Competency` chip + runtime `isCompetencyBased` lookup.
- Difficulty filters — `Question level` chip row (`All levels / Easy / Medium / Hard`) carried over from prior work.
- Count controls — preset chips (`5 / 10 / 15 / 20`) + free-form number input.
- Selection quality and dedupe checks — preserved by the existing `filteredQuestions` chain.

Not in scope of K2H-8b+8c (still pending):
- True dedupe checks across topic/scope boundaries.
- PYQ data completeness for Triangles/Trigonometry spec+factory packs (currently 1–2% competency-tagged; see `question-bank-audit.md`).

## Sign-in/trial enforcement pass for learning surfaces

Purpose:
Make signed-in trial access and Firestore-backed learning surfaces reliable across the app.

Scope:
- Confirm signed-in trial users receive full feature access during the 7-day trial.
- Ensure learning surfaces can write/read real Me / Progress and Mistake Intelligence evidence when the saved-evidence path exists.
- Preserve honest signed-out and local-only states where persistence is unavailable.

## PR-K2I - Mock pages Level-3 detail finalisation

Purpose:
Bring mock builder / mock attempt / mock review into Level-3 desktop grammar and clarify the real mock lifecycle.

Scope:
- mock page UI/UX
- basket-to-mock clarity
- attempt / review flow
- future graded-evidence wording

Forbidden:
- fake mock grading
- fake score
- fake Mistake Intelligence
- fake Me / Progress updates

Rule:
Every mock a student writes and gets graded on LazyTopper must eventually integrate with Mistake Intelligence and Me / Progress only through real graded evidence. Until that path is real, copy must not imply it.

Exit gate:
- Mock pages match desktop grammar.
- Mock lifecycle copy is honest.
- No fake graded evidence is introduced.

## PR-K2J or later - HPQ Question + Solution Quality

Purpose:
Audit and improve HPQ question bank completeness, structured MCQ options, solution steps, diagrams, and cache coverage.

Order:
1. Audit report first.
2. Data-only structured options normalization.
3. Solution / diagram / cache quality repair.

Rule:
Do not begin this before Practice and Mock detail stages unless the product owner explicitly changes priority.

## Post-K2F follow-ups

### MCQ structured options normalization

Purpose:
Normalize Science and Maths HPQ MCQ / Assertion-Reason data so click feedback can be available wherever real options exist.

Rules:
- data-only PR
- do not invent options in UI
- do not change grading/checking APIs
- keep `correctOption` explicit

Known Science audit:
- Science MCQ / AssertionReason total: 29
- Structured options/aROptions present: 14
- `correctOption` present: 14

### PR #72 QA repairs

If Vercel or Browser Agent finds visual or interaction issues, do a narrow follow-up repair on the PR #72 branch before merge.

### PR #69 / K2D

Status:
Still separate and not merged.

Rule:
Do not cherry-pick or absorb PR #69/K2D code into other PRs without explicit audit and product owner approval. Each PR must be validated independently before merge. Do not blindly merge PR #69.

### Mock grading to Mistake Intelligence

Future work:
Every mock that a student actually writes and gets graded on LazyTopper should eventually feed Mistake Intelligence and Me / Progress through real saved grading evidence.

Not part of PR #72:
- no fake mock score
- no fake progress
- no fake Mistake Intelligence

## Later stages

### PR-K3 - Check & Improve source-context integration

Ensure Check & Improve carries source/context from worksheets, practice, topic hub, HPQ, and other routes.

### PR-K4 - Mistake Intelligence from saved checked evidence only

Make Mistake Intelligence depend only on real saved checked answers and real mistake logs.

### PR-K5 - Me / Progress real aggregation

Aggregate real saved evidence into Me / Progress without fake time, score, mastery, or weak-area claims.

### PR-K6 - Tutor / examiner quality polish

Improve copy and guidance from student, tutor, and board-examiner lenses without claiming official CBSE marking schemes unless verified.

### PR-K7 - HPQ / Chapter Test / Mock output loop

Connect HPQ, Chapter Test, and Mock outputs into real evidence pathways.

### PR-J - Final desktop polish / parity sweep

Final visual, route, data-honesty, responsiveness, and preview QA sweep.
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

---

## Post-PR #87 / PR-K2H-7 handoff update

Status: DONE.

PR #87 / PR-K2H-7 — Pricing visual redesign + standalone routing — is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #87: `d7c41bf5cb5a74796bf5645e3064cf47a32e699e`
- PR #87 head SHA: `a40659010af61634675a0662e91b0629acf03d65`
- PR #87 merge commit / new base: `e239f883e30ec4bb9f185cadf1e9dfe127b1dc64`

What PR #87 changed:
- Rewrote `lazytopper/src/pages/PricingPage.tsx` to use the `lt-pricing-*` CSS-in-JS grammar (`<style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />`, no inline `style={{}}` props). Visual tokens match the frozen Welcome landing and Login gate: dark navy gradient bg (`#071a2d → #051733`), green accent `#16b96a`, Space Grotesk headings, Inter body, 960px max content width, 13px CTA radius with the Login navy `#071a3d` + spec'd box-shadow.
- Premium card now shows `₹2,999 / year` with `~₹250/month · less than one tuition session` sub-line. Copy stays data-honest: "Manual activation during beta. Payment checkout coming soon. Premium is not activated automatically." No automated checkout introduced.
- Five media-query breakpoints mirror Login exactly: large desktop ≥1440px, narrow laptop 1024-1180px, short-laptop max-height 820px, tablet/mobile ≤1023px, small mobile ≤520px.
- All preserved logic: `WAITLIST_KEY`, `WaitlistEntry`, `saveWaitlistEntry`, `FREE_FEATURES` (8 items), `PREMIUM_FEATURES` (6 items), `BOARDS_COMING` (3 items), `useState` hooks, `handleStartTrial`, `handleWaitlistSubmit` body unchanged (parameter dropped only because the new wiring is `<button type="button" onClick>` instead of `<form onSubmit>`).
- `lazytopper/src/App.tsx`: added `/pricing` to three exclusion sites using the same pattern as `/welcome`:
  - `isDesktopShellRoute(pathname)` — explicit `return false` for `/pricing`.
  - `isPublicLandingRoute` — `/pricing` added to the OR-chain. This also hides the global top navbar, CommandPalette, and BreakReminder on `/pricing` (natural cascade — same effect `/welcome` already has).
  - `BottomNav` internal exclusion — `current === "/pricing"` added to the early-return guard.
- Result: `/pricing` renders fully standalone — no DesktopShell, no global navbar, no TrialBanner, no BottomNav — verified by Playwright DOM probe (0 `.navbar` nodes, 0 fixed-bottom nodes at both 1440px and 375px viewports).

Files changed by PR #87:
- `lazytopper/src/pages/PricingPage.tsx`
- `lazytopper/src/App.tsx`

Validation and QA:
- TypeScript passed (0 errors).
- Production build passed with `NODE_ENV=production` and `BASE_PATH=/app/` (built in ~15s; new PricingPage chunk 20.09 kB raw / 4.71 kB gzipped).
- Production verifier passed: `8 passed, 0 failed`.
- `git diff --check` passed.
- Local + Vercel preview visual QA passed at 1440px and 375px.
- All Unicode symbols (₹ ✓ — 🎉 🏛️ 🗺️ 🎓) verified as real UTF-8 bytes; zero `C3 A2` mojibake markers.

Next recommended product stage:
- PR-K2H-8 — Practice focus consumption + advanced filters.

K2H-8 doctrine and non-goals will be authored when the K2H-8 prompt is written. Until then, do not start product implementation against this checkpoint; only this docs-only handoff update is active.

Future implementation prompts must start from:
`base/approved-thru-437 @ e239f883e30ec4bb9f185cadf1e9dfe127b1dc64`

---

## Post-PR #89 / PR-K2H-8a handoff update

Status: DONE.

PR #89 / PR-K2H-8a — Practice focus continuity + Clerk OAuth redirect — is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #89: `36f406099568884965d139354cb103b9451688ab`
- PR #89 head SHA: `1673ae006da87a4c3d51f881d48e684b19da2604`
- PR #89 merge commit / new base: `33d0eaff60817a4ddd9fb42f081c230a4ba241a0`

What PR #89 changed:
- **Fix 1 — `subtopicHint`/`focus` forwarded through `buildLegacyPracticePath`.** The function signature now accepts `subtopicHint?: string` and `focus?: string`; the body forwards them as URL params; the `quickPracticePath` derivation passes the page-level `subtopicHintParam` and `focusParam` (already read from the URL since PR-K2G) into it. The legacy `/practice/:grade/:subject` engine already consumed `subtopicHint` at `PracticePage.tsx:166`; this fix wires the desktop hub side of the contract so focus context actually reaches the engine.
- **Fix 2 — MistakeIntelligencePanel locked-state CTA preserves the focused URL.** The previously-hardcoded `loginUrl("mistake-aware", "/practice-hub")` at the old line 1238 now reads `loginUrl("mistake-aware", currentPracticeUrl)`. Required prop plumbing: new optional `currentPracticeUrl: string` prop on `MistakePanelProps`, destructured in `MistakeIntelligencePanel`, forwarded from the render site in the main `DesktopPracticePage` body.
- **Fix 3 — `start-focused-practice` login reason on the Quick Practice CTA.** `loginPrompts.ts` gains a new `start-focused-practice` entry (chip "Focused practice", headline "Sign in to start focused practice", sub-copy referencing Mistake Intelligence) and the key is added to `KNOWN_LOGIN_REASONS`. `DesktopPracticePage.tsx` derives a `quickPracticeTarget` that routes the signed-out + focused-context click through `loginUrl("start-focused-practice", currentPracticeUrl)`; both Quick Practice CTA sites (PrimaryCard + the legacy panel "Continue in full practice engine" Link) use `quickPracticeTarget`. The signed-in and non-focused paths are unchanged — no new auth gate added there.
- **Fix 4 — TopicHub HowBoardsUseItPanel label honesty.** The "Open focused practice" label, which navigated to a topic-level (not concept-level) href, is relabelled to "Practice this topic" so it matches what the href actually does. The Board Essentials concept-row "Practise this" CTA remains the only focus-passing route on this surface — unchanged.
- **Clerk OAuth follow-up.** `forceRedirectUrl={nextPath}` is now passed to Clerk `<SignIn>` on `Login.tsx:763`. This makes Clerk itself responsible for routing the user back to the `?redirect=` target after an OAuth round-trip (Google sign-in), instead of relying solely on the post-effect `navigate(nextPath)` that only fires for email/password instant-sign-in. `nextPath` is already validated by `isSafeInternalPath` (line 588), so the new wiring has no open-redirect risk.

Files changed by PR #89:
- `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` (+31/-6)
- `lazytopper/src/lib/desktop/loginPrompts.ts` (+9/-0)
- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx` (+1/-1)
- `lazytopper/src/pages/Login.tsx` (+1/-0)

Validation and QA:
- 12/12 automated tests passed (see `test-k2h-8a-final-2026-05-20.md`):
  - 8 Playwright browser tests against local `vite dev` (focus banner DOM, CTA URL capture, Login reason copy, MI panel href, non-focused control, TopicHub label).
  - 4 static source-file assertions (`forceRedirectUrl` wiring, loginPrompts entry, `buildLegacyPracticePath` signature, hardcoded `/practice-hub` removal).
- TypeScript: 0 errors.
- Production build passed with `NODE_ENV=production` and `BASE_PATH=/app/`.
- Production verifier passed: 8 passed, 0 failed.
- `git diff --check` clean.

Outstanding follow-up (must clear before K2H-15):
- The Clerk OAuth round-trip behaviour (Google sign-in preserving the `?redirect=` target through the external auth provider) is verified at the static code level only — the prop is wired and TypeScript-validated by the installed `@clerk/react` types. The actual OAuth round-trip must be manually tested against a Vercel preview with a Clerk env that has Google OAuth enabled (`pk_test_*` or `pk_live_*`). The local `vite dev` Clerk environment is in dev mode and does not exercise a real Google OAuth round-trip.
- **This Clerk OAuth runtime verification must be completed before K2H-15 (Firebase Auth migration) begins.** K2H-15 will re-platform the auth layer and the `forceRedirectUrl` semantics may change with it; we should confirm the Clerk implementation works end-to-end first so the regression surface during the auth migration is bounded.

Next recommended product stage:
- PR-K2H-8b — Advanced Practice filters (Section A/B/C/D/E, marks, type/family, competency, difficulty, count). Builds on K2H-8a's `subtopicHint`/`focus` plumbing; should extend the URL contract for `buildLegacyPracticePath` to carry the additional filter params and add a filter panel to the Practice Hub UI.

K2H-8b doctrine and non-goals will be authored when the K2H-8b prompt is written. Until then, do not start product implementation against this checkpoint; only this docs-only handoff update is active.

Future implementation prompts must start from:
`base/approved-thru-437 @ 33d0eaff60817a4ddd9fb42f081c230a4ba241a0`

---

## Post-PR #92 / PR-K2H-8b+8c handoff update

Status: DONE.

PR #92 / PR-K2H-8b+8c — Practice filters hub + PracticeControls upgrade — is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #92: `d4e1c0b46a0a7f7575205ef9b3cb74eeb174e04b`
- PR #92 head SHA: `a625fdb8a6380e944fc02286fe15b515577544da`
- PR #92 merge commit / new base: `b97ba30e02cdb2a51822512ad02f1918c71c762b`
- PR #92 merged at: `2026-05-20T08:49:43Z`

What PR #92 changed:
- **K2H-8b — Practice Hub filter panel** (`lazytopper/src/pages/desktop/DesktopPracticePage.tsx`):
  - New collapsible filter panel between `<PracticeScopeBuilder>` and the main practice grid. Toggle label reads "Refine practice" when collapsed and "Hide filters" when expanded.
  - Section chips (`All / A · 1mk / B · 2mk / C · 3mk / D · 5mk / E · Case (4mk)`), Difficulty chips (`All / Easy / Medium / Hard`), Count chips (`5 / 10 / 15 / 20`).
  - `PFSection` / `PFDifficulty` / `PFCount` union types and state hooks. Default-omit logic forwards non-default values to the destination `/practice/:grade/:subject` engine via `buildLegacyPracticePath`.
  - URL hydration on mount honors `?section=…&difficulty=…&count=…`. Scope-change reset effect also clears filters when the user picks a new topic.
  - Bug fix during implementation: URL hydration was not auto-expanding the panel because the scope-reset useEffect ran after hydration and clobbered `setShowPracticeFilters(true)`. Fix decoupled panel-expansion into a separate useEffect watching `[pfSection, pfDifficulty]`.
- **K2H-8c — PracticeControls "Build this set" upgrade**:
  - Removed legacy `<select>` Type dropdown, replaced with Section chips (mark-labelled).
  - New Question Type chip row (`All types / MCQ / Proof / Competency / Assertion-Reason / Case-based`).
  - Count preset chips (`5 / 10 / 15 / 20`) before the existing number input.
  - PYQ toggle ("Previous Year Questions only") with conditional `PYQ` badge.
  - New optional props on `PracticeControlsProps`: `questionType?`, `onSetQuestionType?`, `pyqOnly?`, `onSetPyqOnly?`. Rows render only when handlers are provided (graceful degradation).
  - `PracticePage.tsx`: new state `questionType`, `pyqOnly`; URL hydration via `qp.get("questionType")` and `qp.get("pyq") === "1"`; `filteredQuestions` useMemo extended with question-type filter chain and PYQ-only filter using safe `unknown` casts. Falls through honestly when `isPYQ` / `isCompetencyBased` are absent on bank items (no fake matches invented).
- **`lazytopper/src/lib/desktop/navigation.ts`**: `DesktopPracticePathInput` extended with `section?: string`, `difficulty?: string`, `count?: number`; `buildDesktopPracticePath` forwards them.

Files changed by PR #92:
- `lazytopper/src/components/practice/PracticeControls.tsx` (+146/−23)
- `lazytopper/src/lib/desktop/navigation.ts` (+6/−0)
- `lazytopper/src/pages/PracticePage.tsx` (+45/−3)
- `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` (+302/−2)

Validation and QA:
- TypeScript passed (0 errors).
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Production verifier passed: 8 passed, 0 failed.
- `git diff --check` clean.
- Static + browser test suite: **15/16 PASS** (see `test-k2h-8c-2026-05-20.md`). The single non-clean result is S2 — a literal-substring false positive where `<select` appears once in the source file but only inside a code comment documenting the removal of the `<select>` JSX element. No real failure.
- 9/9 Playwright browser tests PASS: Section chip activation, Question Type chip activation, Count preset + number-input sync, PYQ toggle + badge, URL hydration (all 5 params at once), Section filter affects visible questions, mobile 375px layout, Build new set unchanged.
- Pipeline: Claude Code + gh CLI + Playwright Chromium 1217 + local vite dev (port 25246). GitHub MCP was not loaded in this session; `gh` CLI used as the canonical fallback.

Next recommended product stage:
- **Question bank expansion** — driven by the gaps surfaced in `question-bank-audit.md`:
  - Tag `isCompetencyBased` on the Triangles pack1 + Trigonometry pack1 items (currently 1–2% — single biggest competency-share lift available).
  - Add `section` / `marks` fields to the 129 un-classified spec+factory questions so the new K2H-8b filter UI can route them.
  - Populate the 13 empty Science pack2 files OR delete the placeholders.
  - Seed Science proof/derivation questions (currently 6 across all of Science).
  - Optional: rewrite generic 4-step Assertion-Reason solution templates in `highlyProbableQuestions.ts`.
- The next product PR is content-only — no UI changes required for the filters to start producing better results once the bank is tagged.

Question bank expansion doctrine and non-goals will be authored when the next prompt is written. Until then, do not start product implementation against this checkpoint; only this docs-only handoff update is active.

Future implementation prompts must start from:
`base/approved-thru-437 @ b97ba30e02cdb2a51822512ad02f1918c71c762b`

---

## Post-PR #94 / PR-K2H-8d+8e handoff update

Status: DONE.

PR #94 / PR-K2H-8d+8e — Wire `questionType` + `pyqOnly` filters through engine — is merged.

Current checkpoint:
- Active integration branch: `base/approved-thru-437`
- Previous base before PR #94: `c11b53851ea7b8a9ee48b41420c16bbbb55661a4`
- PR #94 head SHA: `b1e04a98e6401f2a8bdd0f335b7f69b8b8847c6f`
- PR #94 merge commit / new base: `699a39d4bf629126e910d8403660820c090e9137`
- PR #94 merged at: `2026-05-20T17:41:26Z`

What PR #94 changed:
- **K2H-8d — Filter wiring through `AiTopupArgs`** (`lazytopper/src/components/practice/practiceQuestionBuilder.ts`, `lazytopper/src/pages/PracticePage.tsx`):
  - `questionType` and `pyqOnly` added to the `AiTopupArgs` interface. The K2H-8c UI state from `PracticePage` is now forwarded into the engine call signature.
  - Filter applied AFTER the section filter inside the engine pipeline, with graceful fallback: `if (filtered.length > 0) pool = filtered;` — an empty filtered result preserves the prior pool instead of blanking the workspace.
  - Engine no longer drops `questionType` / `pyqOnly` on the floor; the chip click in the K2H-8c PracticeControls now reaches the candidate selection layer.
- **K2H-8e — Stale dedupe state fix** (`lazytopper/src/pages/PracticePage.tsx`):
  - `previousQuestionKeys.current` cleared at the start of the build `useEffect`. Without this, the dedupe set from the previous filter context starved subsequent builds — clicking "MCQ" after a non-MCQ session returned 0 fresh questions because every candidate was already in the dedupe set.
  - Bug discovered while wiring K2H-8d; chose to ship together as a coupled fix because the symptom (empty pool after filter change) was caused by the same data-flow pathway K2H-8d was modifying.

End-to-end behaviour after PR #94:
- MCQ chip + "Build new set" returns correctly filtered MCQ questions.
- Competency chip + "Build new set" returns competency-tagged questions.
- Section A/B/C/D/E chips continue to work (already verified in PR #92).
- **PYQ-only toggle still returns 0 results.** This is a known limitation — see K2H-8f below.

Files changed by PR #94:
- `lazytopper/src/components/practice/practiceQuestionBuilder.ts` (+~28 lines, AiTopupArgs interface + filter application)
- `lazytopper/src/pages/PracticePage.tsx` (+~15 lines, previousQuestionKeys clear + AiTopupArgs forward)

Validation and QA:
- TypeScript passed.
- Production build passed.
- Production verifier passed.
- `git diff --check` clean.
- Owner manual + automated tests verified MCQ / Competency / Section chips work end-to-end. PYQ filter behavior documented as the known 0-result case feeding into K2H-8f.

Next recommended product stage:
- **Content branch first:** `content/question-bank-expansion-01` — add proof packs (`triangles.proof_pack.ts`, `trigonometry.proof_pack.ts`, `circles.proof_pack.ts` already drafted into the working tree from prior turns), AR packs (`assertion_reason_pack.ts` for Maths, `science_assertion_reason_pack.ts` for Science already drafted), case-based packs, backfill missing `solutionSteps` on existing items, and source PYQ entries from official CBSE PDFs once the WebFetch domain allow-rule or local PDF text extraction is in place (`pyq-sourcing-report.md` documents the unblock paths).
- **Then K2H-8f:** engine-tier PYQ bias (see entry below) — needed to make the PYQ toggle return real results, but only useful once the bank actually has `pyqYear`-tagged content.

Future implementation prompts must start from:
`base/approved-thru-437 @ 699a39d4bf629126e910d8403660820c090e9137`

## PR-K2H-8f - Engine-tier PYQ bias in practiceSetGenerator.ts

Status:
PENDING. Required to unlock the PYQ-only filter end-to-end.

Background:
PR #94 / K2H-8d wired `pyqOnly` through `AiTopupArgs` to the engine
pipeline, but the engine's *upstream* selection layer
(`practiceSetGenerator.ts`) does not bias its candidate pool toward
`pyqYear`-tagged questions. Pack3 PYQ entries currently sit outside
the engine's default selection set; the `pyqOnly` filter therefore
filters an already-PYQ-empty pool and returns 0.

Purpose:
Bias the candidate-pool selection in `practiceSetGenerator.ts` so
that when `pyqOnly === true`, the engine pulls from `pyqYear`-tagged
pack2/pack3 entries first. Preserve the existing competency floor
(`COMPETENCY_MIN_SHARE = 0.5`) and graceful fallback semantics.

Likely scope:
- `lazytopper/src/data/practiceSetGenerator.ts` — selection-bias edit only.
- `lazytopper/src/components/practice/practiceQuestionBuilder.ts` — only if a new selection-mode argument needs to be forwarded.

Forbidden (until owner explicitly rescopes):
- Modifying the UI tier — K2H-8c chips/toggle are already correct.
- Modifying the existing filter chain in `PracticePage.tsx` — K2H-8d already applies the filter correctly downstream.
- Editing question-bank `.ts` files (that work belongs to the content branch above, not to K2H-8f).

Dependency:
K2H-8f is most useful AFTER `content/question-bank-expansion-01`
ships meaningful `pyqYear`-tagged content. Running K2H-8f against
the current bank would still return near-zero results because the
PYQ coverage on pack3 is thin until the content branch lands.

Exit gate:
- Selecting "Previous Year Questions only" with no other filter returns ≥3 questions on at least one Maths topic.
- TypeScript / build / verifier all green.
- `git diff --check` clean.
- No fabricated PYQ tags introduced.

## Post-PR #96 / content Agent 1 handoff update

Status: DONE
Merge commit: 90c97f568f2dd914ed98ffa50af6d0729b9b2b69
PR: #96 — content: Question bank Agent 1 fixes — 18 questions improved

Files changed:
- lazytopper/src/data/questionBanks/class10/maths/arithmeticProgression.pack1.ts
- lazytopper/src/data/questionBanks/class10/maths/quadraticEquations.pack2.ts
- lazytopper/src/data/questionBanks/class10/maths/statistics.pack1.ts
- lazytopper/src/data/questionBanks/class10/maths/surfaceAreasVolumes.pack1.ts

Validation: tsc PASS, git diff --check PASS, forbidden files untouched.

Future implementation prompts must start from:
base/approved-thru-437 @ 90c97f568f2dd914ed98ffa50af6d0729b9b2b69

## PENDING — Pass 1 Content Audit

Status: PENDING
Purpose: Syllabus-filtered inventory of all local PDF sources. Read CBSE 2025-26 syllabus PDFs first to extract in-scope topic list. Then scan all sources and produce master extraction table: rows = topics, columns = source, cells = estimated unique question count. Flag out-of-scope topics, scanned PDFs needing OCR, and duplicate risk between sources.

Sources to scan:
- C:\Users\Chetan\OneDrive\Desktop\diff\CBSE-Official\ (syllabus filter)
- C:\Users\Chetan\OneDrive\Desktop\diff\ncert-books\ (NCERT textbook + exemplar)
- C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\PYQ\ (4 years official papers)
- C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\ (reference books + PYQ collections)

Constraints:
- Only Maths and Science (Class 10) — skip all other subjects
- Only topics in the 2025-26 rationalised syllabus — flag and exclude deleted topics
- Estimate unique questions only — flag duplicate risk where same question appears in multiple sources

Exit gate: Master extraction table complete. Extraction readiness (READY/NEEDS-OCR/SKIP) confirmed per file.


## Post-PR #98 / Science chapters 1-7 NCERT+Exemplar extraction

Status: DONE
Merge commit: b88ed11fb85aec1a9739207dd0eeea5fcdb7b264
PR: #98 — content: Science chapters 1-7 NCERT+Exemplar extraction (608 questions)

Files added (14):
- science/chemicalReactions.ncert.ts (28 Qs)
- science/chemicalReactions.exemplar.ts (45 Qs)
- science/acidsBasesSalts.ncert.ts (33 Qs)
- science/acidsBasesSalts.exemplar.ts (48 Qs)
- science/metalsNonMetals.ncert.ts (29 Qs)
- science/metalsNonMetals.exemplar.ts (65 Qs)
- science/carbonCompounds.ncert.ts (28 Qs)
- science/carbonCompounds.exemplar.ts (56 Qs)
- science/lifeProcesses.ncert.ts (34 Qs)
- science/lifeProcesses.exemplar.ts (82 Qs)
- science/controlAndCoordination.ncert.ts (26 Qs)
- science/controlAndCoordination.exemplar.ts (53 Qs)
- science/reproduction.ncert.ts (23 Qs)
- science/reproduction.exemplar.ts (58 Qs)

Validation: tsc PASS, _validate_pack.py ALL FILES PASS (54.9% competency), smoke test 5/5 PASS
Zero product code touched.
Future implementation prompts must start from:
base/approved-thru-437 @ b88ed11fb85aec1a9739207dd0eeea5fcdb7b264

## PENDING — content/question-bank-expansion-02

Status: PENDING
Purpose: Extract remaining Science chapters (8-13) and all Maths chapters (1-14) from NCERT textbook + Exemplar sources. Target: ~1,800 additional questions.

Science chapters pending:
- Ch 8: Heredity (jesc108 — use pdfplumber fallback, decompression errors known)
- Ch 9: Light — Reflection and Refraction (jesc109 — use gdrive copy)
- Ch 10: Human Eye and Colourful World (jesc110)
- Ch 11: Electricity (jesc111)
- Ch 12: Magnetic Effects of Current (jesc112)
- Ch 13: Our Environment (jesc113)
NOTE: Light + Human Eye share topicKey: "light-reflection-and-refraction-incl-human-eye-prism"

Maths chapters pending (all 14):
real-numbers, polynomials, pair-of-linear-equations-in-two-variables, quadratic-equations, arithmetic-progressions, triangles, coordinate-geometry, trigonometry, areas-related-to-circles, surface-areas-and-volumes, statistics, probability, circles

Exit gate: _validate_pack.py ALL FILES PASS + tsc -p tsconfig.app.json --noEmit PASS + smoke test 5/5 PASS per session
