# LazyTopper — Current State
Last updated: 2026-06-05 (post-PR #190 — Exam Trends band redesign: flat ranked list → 3 collapsible priority bands on owner-locked tiers)

## Live base
Branch: base/approved-thru-437
SHA: cfb3106625395f1fca4cce01e6365fd0bb5935ce
Last merged PRs: #188 (feat: content sweep — delete 93 banned out-of-syllabus entries; syllabusGuard now green), #189 (docs handoff post-#188), #190 (feat: Exam Trends band redesign — flat ranked list → 3 collapsible priority bands)

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
- scope:guard: **LIVE again** — `SCOPE_GUARD_OK` on trunk. Was DEAD since `2081003`
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
