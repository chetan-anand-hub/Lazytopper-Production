# LazyTopper — Next Action
# Updated: 2026-07-08 (post-PR #344 — **Progress-Journey ARC · PR-3 per-surface Worksheet HISTORY MERGED, trunk `a4c3eec`.** NEW `components/results/SurfaceHistory.tsx` renders the durable session records (PR-1 store) as a "Your worksheets" section on the WorksheetGenerator BUILD view — **CONSUMES the store read-only** (§3a): C1 rows (code/title/date/score-chip-or-awaiting-pill/four-type dot-strip + honest empty) · C2 `getSubjectProgress` vs-last-time chip (honest-or-silent; subject-level month trend) · C3 tap-row → READ-ONLY `<ResultsScorecard>` re-open (no `perQuestionRef` reconstruction; Download only when local caches resolve). PR-2 files additive (no live-scorecard regression); CT/FM history = deferred seams. 3 self-caught defects fixed (pending-upload no-Download + honest copy). Owner-QA'd. **BUILD LANE IMMEDIATE NEXT: arc PR-4, Me/Progress redesign** (§3b / §4-step-4 — ONE responsive component reads the recent strip + rolled-up before→now; retires the legacy dashboard widgets). SEPARATELY: 3 owner-found worksheet bugs (grader MCQ all-or-nothing + PDF filename + history placement) fix in their own follow-up PR — NOT PR-3 regressions. New FU: [FU-HISTORY-C2-PER-WORKSHEET-DELTA]. _Prior: post-PR #341 — arc PR-2 the Universal `<ResultsScorecard>` MERGED (`8c4c159`), worksheet+QP variants LIVE, CT/FM deferred, presentational §1a._ _Prior: post-PR #338 — arc PR-1 the session-record DATA LAYER MERGED (`d704b1c`): the `sessionRecords/{uid}/records/{code}` store + `progressStore` reader + durable `#NN` + `perQuestionRef`; new Firestore collection → rule `dc73360`._ **CONTENT LANE:** Light is ship-tracked — the trusted-student QC verifies the 230 authored solutions + 52 flagged diagrams from `docs/light-extraction-review-queue.md`; deferred gdrive leftovers (757 AR 25Q, 821 objective 51Q, 2022-23 PYQ residual, CBSE Practise Papers) are a later 1-mark pass; **Electricity extraction starts ONLY on explicit owner go**, reusing the pipeline in `Desktop\Content\extraction\light\`.)
# Base SHA: a4c3eec

## ⏭️ CURRENT POINTER (as of 2026-07-12 — trunk `8fb1ad6`, #375)

> The header block + "CURRENT BASE" below are STALE (base `a4c3eec`, pre-#363/notes); a full NEXT_ACTION rewrite is part of the owed [FU-HANDOFF-DOC-DRIFT] hygiene pass. Current reality:
>
> - **NOTES SURFACE COMPLETE** — all 26 canonical topics specced + audited (batches #365/#368/#370/#371/#372); clickable NCERT page-cites LIVE + owner-verified (#375 offset map + owner-hosted PDFs). Fable notes content lane is DONE — no longer "parked".
> - **Part A of the current task, [FU-LEDGER-CLICKABLE-CITES] (PR #376), IN REVIEW** — source-ledger `p.N` made clickable; awaiting owner merge (do NOT self-merge the product PR).
> - **IMMEDIATE NEXT (owner-picked):** (1) **Chapter Test build** — PR open, awaiting cofounder byte-review + owner live-verify (rebuilds legacy `ChapterTestPage` to the locked spec; file-disjoint from notes). (2) **Bank extraction Lanes 1/2** — Pass-1 found 2,070 net-new; Pass-2 Content-folder audit RUNNING; depth-floor decision pending Pass-2; case-based is a Fable AUTHORING lane (Z3), not extraction.
> - Coordination is LIVE (#366): every PR runs `lane-overlap` (REQUIRED) + `quality-gate`; sequence overlapping lanes, keep branches up to date; owner squash-merges (no self-merge on product PRs).

## CURRENT BASE

Branch: base/approved-thru-437
SHA: a4c3eec
Last PRs: **#344 Progress-Journey ARC · PR-3 — per-surface Worksheet HISTORY (`SurfaceHistory.tsx`: "Your worksheets" list + honest-or-silent vs-last-time chip + read-only stored-scorecard re-open; CONSUMES the store read-only; PR-2 files additive; 3 self-caught defects fixed; owner-QA'd; → `a4c3eec`)** + **#342 Notes biology pilot — Life Processes note-spec (`c9f4177`)** + **#341 Progress-Journey ARC · PR-2 — Universal `<ResultsScorecard>` (extracted from `WorksheetScorecard`; shell + typed 4-surface variant interface; worksheet[byte-identical]+quick-practice LIVE, CT/FM deferred seams; presentational — writes nothing §1a; old `WorksheetScorecard.tsx` deleted; owner live-verified; → `8c4c159`)** + **#305 Worksheet MCQ DETERMINISTIC honesty → step 1 now fully deterministic incl. the objective case (carried `section` client→server + reused `isObjectiveType` in `normaliseStructuredResult`: incorrect objective step → `mistakeType` null regardless of `studentWork`; `handleCheckSolution` byte-identical; [FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED; new [FU-MCQ-ANSWER-OPTION-FIELD] + [FU-GRADING-RELIABILITY]; owner live-verified — all-zero buckets every run; → `93f1594`)** + **#302 Worksheet no-working honesty fix → D-PROG-2 / step 1 CLOSED (ported #301 into `gradeStructuredSet`/`normaliseStructuredResult`: worksheet rule 5 + `noWorkingNulled` guard + `rawAdjusted` reconcile; `handleCheckSolution` byte-identical; MCQ residual ~40% → [FU-WORKSHEET-MCQ-OBJECTIVE-GUARD]; owner dual live-verified; → `c5e148d`)** + **#297 Z3 figure-binding golden slice (113 source figures bound → 93 Qs, rendered as `<img>` in the question body + step-mark pill fix; → `449d686`)** + **#295 Worksheet PR-A grade-results redesign (`1a85186`)** + **#291 Worksheet PR-E2b grade loop (`60c5bf9`)** + **#292 Z3 Competency extraction (102 authentic Maths case-based Qs → `competency.z3.ts`; → `b1d3e46`)** + **#289 Note-spec validator gate (`c525b2a`)** + **#282 Notes track Step-1 (`de2a616`)** + **#280 Worksheet PR-E2a (`d065922`) + #283 PR-E2a.1+.2 (`9a080a0`) + #284 PR-E2a.3 (`cfff277`)** + #279 docs(handoff) post-#278 (`883e904`). Earlier: #272 (**Topic Hub PR-C concept tutor "Teach me" flow**; → `d9ba545`) + #273 (docs(handoff) post-PR-C; → `6aa0640`) + #274 (**Topic Hub PR-D final-IA LAYOUT**; → `b57fa79`) + #275 (docs(handoff) post-PR-D; → `acc419b`) + #276 (**Topic Hub PR-E1 — concept-row Practise → Quick Practice + exact mark-band filter + Chapter-test wired + MockBuilder un-route**; → `1de6f3e`) + #277 (docs(handoff) post-PR-E1; → `b4163ef`) + #278 (**CLAUDE.md governance refresh** — worktree rule, matrix de-hardcode, Replit→CI, CBSE 2026-27, verification doctrine + marks-bucket/MockBuilder/MI/syllabusGuard rules; → `f7170ef`)

## ⏭️ IMMEDIATE NEXT — Grading-reliability PR ([FU-GRADING-RELIABILITY]) — cofounder-gated, off `93f1594`
**D-PROG-2 / step 1 is now FULLY deterministic (#305 closed the MCQ residual):** the worksheet grader's subjective AND objective no-working cases are deterministic (empty/whitespace/absent → null + 0 buckets; rawSummary leak → 0; worked-wrong preserved; **wrong objective/MCQ step → null regardless of `studentWork`** via the reused `isObjectiveType` guard in `normaliseStructuredResult`, fed by `section` now carried client→server). Owner live-verified — all-zero mistake buckets every run. **[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] CLOSED.**
- **The next gap is RELIABILITY, not honesty.** Two issues surfaced from #305 live testing (neither blocks PR-B; the honesty guard is solid):
  - **[FU-GRADING-RELIABILITY] (this PR):** grader temperature `0.15` causes OCR-cascade variance on borderline partial-credit answers, and `couldNotRead` fires inconsistently on legible "Don't know" / explicit non-attempt responses (related to [FU-WORKSHEET-NONATTEMPT-TEXT]). Fix direction: lower/zero the grading temperature, harden the detect/`couldNotRead` path, and consider a `thinkingBudget` so borderline reads are stable run-to-run. **Cofounder hands the full instruction** (its own STEP 0 confirming the temperature/genConfig call sites + the detect path before any code). **Do NOT open its worktree until handed that instruction.**
  - **[FU-MCQ-ANSWER-OPTION-FIELD]:** MCQ *scores* (correct/incorrect) are still non-deterministic because the bank's `finalAnswer` stores answer TEXT, not the option LETTER, so the grader can't do a deterministic string compare of the picked option. The honesty path is fixed; the score path is not. Touches the bank/data shape → likely a `src/data` (gated) lane → its own scoped PR.
- **Sequencing:** the grading-reliability PR first → then the **detect/`thinkingBudget` fix** → then **PR-B** (the durable per-student worksheet record). [FU-MCQ-ANSWER-OPTION-FIELD] slots in when owner authorizes the data-lane change.
- Also tracked (separate PRs): **[FU-WORKSHEET-NONATTEMPT-TEXT]** (explicit "don't know"/non-attempt text — non-empty, guard can't see it; folds into [FU-GRADING-RELIABILITY]), **[FU-WORKSHEET-BANK-ANSWER-POLLUTION]** (~26 files / ~54 strings marking-scheme junk in model answers; content lane).

> **Two parallel queues now exist** — pick per owner: **(1) Bank Expansion** Batch 3 (Triangles + Circles), the IMMEDIATE NEXT below; and **(2) Topic Hub rebuild** — PR-B concept-spine (landed via `c418f59`) + **PR-C tutor flow DONE (#272, `d9ba545`, owner live-verified)** + **PR-D final-IA LAYOUT DONE (#274, `b57fa79`, owner live-verified GOOD)** + **PR-E1 DONE (#276, `1de6f3e`, owner live-verified)** — concept-row Practise → Quick Practice direct + exact mark-band filter + single-pool count fix + Chapter-test button wired + MockBuilder un-routed; **[FU-PRACTISE-CONCEPT-FILTER] CLOSED** → **PR-E2 NEXT** (Worksheet — its own locked spec) → PR-F (Notes + Examiner's-tips content) → PR-G (delete dead old-mobile + the retired MockBuilder/TutorDrawerV2/MentorPanel set), all verified against the FINAL IA committed in #268 (`docs/design/topichub_ia_mockup_FINAL_2026-06-19.html` + the supersession block in `LazyTopper_Learn_Flow_Spec_LOCKED.md`). **Each PR starts fresh in its own worktree.** Two Topic-Hub follow-ups stand apart from the layout/wiring queue: **PR-D.1** (mobile full-screen tutor toggle, a `TeachFlow` change split from PR-D, owner-approved — `TeachFlow` now backs ONLY the one live Topic Hub tutor, so low blast radius) and **[FU-CONTEXTUAL-TUTOR-REBUILD]** (the `/api/mentor` `concept_teach` engine serves a scripted "Ravi Sir/Step N of 5" lesson, not contextual to student input; pre-existing, separate workstream). See OPEN_QUESTIONS + IMPLEMENTATION_ROADMAP for the PR-E…PR-G breakdown.

## ⏭️ NOTES TRACK — next action (as of #282 merged, squash `de2a616`)

### Notes track — next action (as of #282 merged, squash de2a616)
**Decision (settled, owner-approved):** notes ship as a shared React **`<Note spec={…}/>`** component fed by a **structured note-spec** (`notes/specs/<topic_key>.json`) as the single source of truth — NOT standalone HTML. The tutor and PR-F both consume the spec as data. **Step 2 authors specs (JSON), not HTML.**

**Next build order (gated — do not reorder):**
1. ✅ **DONE (#289, `c525b2a`)** — `notes/validate_spec.py` (source-required validator to note-spec **schema v1.1**: rejects unsourced verbatim/example/NCERT-figure; checks `topic_key` ↔ `topics.ts`, banned keywords via `syllabusGuard.ts`, mojibake, third_tab/example `kind` shape, source_ledger count) + the schema-v1.1 doc + the validated `light-reflection-and-refraction.json` reference spec + 5 negative fixtures + self-test. Light VALID; negatives each trip exactly one rule. The gate that makes the ~35-note fan-out safe is now live (and `--json` mode is ready to wire as a `SubagentStop` hook — a later step, not yet done).
2. ⏭️ **IMMEDIATE NEXT — Content PR (under `notes/`):** evolve the kit to `render_note(spec)` (so the preview HTML is GENERATED from the spec, not hand-written); finish Light's figure (base64→WebP into `notes/assets/light/`) + mindmap (D3-JS → `spec.mindmap` tree) lift, replacing the `_TODO` in the Light spec. Validate with `python notes/validate_spec.py --all` before/after.
3. Then in parallel: **PR-F** (`<Note>` component + Topic Hub wiring — cofounder/frontend session, reads `notes/specs`+`notes/assets`, writes `src/`) built on the Light spec, AND **Step-2 spec authoring** (the 4 prototype enrichments → ~35 notes), validator-gated.

**Do NOT start Step-2 generation or PR-F before the kit `render_note(spec)` content PR lands.**

---

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
