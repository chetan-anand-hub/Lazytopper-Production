# LazyTopper — Next Action
# Updated: 2026-06-08 (post-PR #210 — AUTH MIGRATION PR-3 of 4 merged; Clerk-free in code. NEXT: CLAUDE.md scrub, then PR-4 — both HOLD for go)
# Base SHA: 6bf6e582d12e868b49c8a516a3be013021a814a4

## CURRENT BASE

Branch: base/approved-thru-437
SHA: 6bf6e582d12e868b49c8a516a3be013021a814a4
Last PRs: #208 (auth PR-2 — frontend on Firebase Auth) + #209 (docs) + #210 (auth PR-3 — Clerk teardown; Firebase-only)

## ⏭️ IMMEDIATE NEXT — two tasks, IN ORDER, BOTH HOLD FOR OWNER GO (neither auto-merges)
Auth migration: **PR-1 (#206) + PR-2 (#208) + PR-3 (#210) DONE.** Auth is Firebase-only end to end; the repo is
Clerk-free in code (grep over src/server/package.json = 0; lockfile `@clerk` = 0). Only PR-4 (phone) remains.

### 1. CLAUDE.md governance scrub (NEXT — HOLD for owner go; does NOT auto-merge)
The owner has the exact surgical instruction ready: §1 stack + §5 doctrine ("Clerk stays for now — K2H-15" is now
obsolete), plus `FIREBASE_SETUP.md` + `docs/desktop-graduation-state.md` Clerk notes. This was deliberately kept
OUT of PR-3 (governance files don't go in a code PR, and are excluded from docs-only auto-merge). Await the owner's
instruction + go.

### 2. AUTH MIGRATION PR-4 — phone / SMS-OTP (the last auth PR — HOLD for owner go)
Branch `feat/auth-phone-otp`. Fill the `initPhoneRecaptcha`/`sendPhoneOtp`/`verifyPhoneOtp` façade (currently
no-ops) with `signInWithPhoneNumber` + `RecaptchaVerifier` (**reCAPTCHA v2 invisible**); wire the Phone tab in the
login widget (+91 prefix, 10-digit → 6-digit OTP step). Project `lazzyy-topper` on Blaze (done); owner enables the
Phone provider in the console + adds the prod domain to Authorized domains. Gates: as PR-2 (tsc + build + verifier
+ matrices + Vercel screenshots) + a **live OTP smoke test**; CI green; lockfile regen if package.json changes.
STOP for approval.

### Owner / deploy actions still pending (now load-bearing — no Clerk fallback)
- **Admin bootstrap (BLOCKING):** set `ADMIN_FIREBASE_UIDS` to your Firebase uid — the ONLY way admin routes
  authorize now (else 503 in prod).
- **Railway env:** `artifacts/api-server` REQUIRES `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY` (or
  ADC) — `requireFirebaseAuth` returns 503 without it.
- **Firebase Authorized domains:** add the prod Vercel domain (`signInWithPopup`). Do the real Google-popup check.
- Remove `VITE_CLERK_PUBLISHABLE_KEY` from deploy env + local `.env.local`.
- **Google One-Tap (GIS)** follow-up once a Web OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is provided.

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
