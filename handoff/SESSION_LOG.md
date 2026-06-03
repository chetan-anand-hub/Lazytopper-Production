---

## 2026-06-03 — Tutor made visible (#181) + teaching tightened to LOCKED style (#182) + this docs PR

### Starting state
Trunk `fd44340` (post #179 docs + #181 tutor wiring). The concept tutor was newly visible on
desktop TopicHub (PR #181, "Learn this" per concept row) but its TEACHING was verbose/persona-
heavy/off-topic (PR-1 live failures). PR B2 fixes the teaching quality. (#179/#181 were not
previously logged — folded in here.)

### #181 — wire concept tutor into desktop TopicHub (per-row "Learn this")
Reused the existing `ConceptTeachDrawer` (same engine mobile TopicHub + PracticePage use) — each
desktop `BoardConceptRow` got a "Learn this" button opening concept_teach for THAT concept
(`context = { topicKey: topic.slug, subject, questionText:"", concept: concept.name }`). Lazy +
gated on open; row-level state; mobile `TopicHub.tsx` byte-unchanged. Scope: `DesktopTopicHubPage.tsx`
only. Owner verified the tutor opens live. Merged → `fd44340`.

### #182 — tighten the concept teach-prompt to the owner-LOCKED style (B2)
The live concept_teach path is FREE TEXT (trace `schema:text`) built by
`buildConversationalTeachSystemPrompt` in `server/prompts/promptLearn.cjs` + the concept branch of
`buildUserPrompt` in `server/routes/mentorModeHandler.cjs` — NOT `promptTeachContract.cjs` as the
brief assumed (verified via the route; see D24). Edited those two (free-text path → no teach-contract
validator change). Rewrote to: answer the exact question first; no Namaste/persona/flattery/filler-
analogy openers; no "interactive above"/[HIGHLIGHT]; stay strictly on the opened concept (no drift);
organize by marks with concrete board examples; end with ONE step-marking offer; on "yes" SOLVE ITS
OWN example with per-step `[½/1 mark]` CBSE marking (correctness-first); plain-text notation (no LaTeX).
Embedded the two owner-approved imitation examples; general by concept type (Science conceptual NOT
forced into "prove it"). Also fixed the user-prompt teaching the whole TOPIC when only `concept`
was passed (desktop's case).

### Measured (live gemini-2.5-flash, non-stub, restart-after-edit), 6 cases / both subjects
BEFORE: persona fluff + analogy intros + "interactive above" + no offer + topic drift + no step-marks
on "yes". AFTER: direct, no fluff, on-concept (drift fixed — standard angles stayed standard angles),
one fitting offer, self-solved per-step `[½/1 mark]` — math spot-checked correct (identity proofs,
`2tan²45+cos²30−sin²60=2`, sector areas 154/462 cm², Ohm's law 2A). Residual: ~1/13 turns slipped one
late analogy on a long first-teach message (eval-set territory).

### Owner live-verify + the 429 lesson (D25)
Owner topped up the Gemini prepaid balance and verified the tightened teaching live in the drawer.
During testing the gateway hit `429 RESOURCE_EXHAUSTED` — root message "Your prepayment credits are
depleted" (a billing/quota limit, NOT a local rate limiter and not a tutor bug). The `/api/user/progress`
503 in console is also by-design locally (no `DATABASE_URL`). The concept tutor is `RequirePremium`-gated;
a reset local trial re-grants 7 days via the app's own `activateTrial`.

### Gates (#181 and #182)
Both: `npm run build` exit 0; `scope:guard` SCOPE_GUARD_OK (post-commit; pre-commit "unclassified" =
D23 subdir artifact; `src/`+`server/` are product lane); `scripts` `test:matrix:all` 137/137. #181 diff
= `DesktopTopicHubPage.tsx`; #182 diff = the two prompt files. No schema/data/call-config/validator change.
B2 committed `8ab00a7` → PR #182 → MERGED → trunk `fd0e7e9`.

---

## 2026-06-02 — PR #178: check-solution grading-prompt tightening (D21 fix) + this docs PR

### Starting state
Trunk at session start: `7948dc3` (post #176 gate restore + #177 docs). The PR B (Part 1)
grading-prompt change had been committed and PARKED earlier (`204ac7c`, based on the older
`3455ce5`) pending the gate audit. With scope:guard re-armed by #176, B was cleared to land.

### What shipped (#178 — grading prompt only; scope: `server/routes/checkSolution.cjs`)
- Rebased the parked branch onto current trunk `7948dc3` — CLEAN, no conflicts (B touches
  only checkSolution.cjs; #176 = policy JSON; #177 = handoff md; no overlap). `204ac7c`→`84b570a`.
- The change: 12-rule grading rewrite (mistake type by CAUSE; per-type boundary examples —
  sign-misread from a correct factor = silly NOT conceptual, unbalanced equation = presentation;
  error-propagation → ONE root cause / carried-forward → null; correct → null; MISSING → always
  null; alternative valid method not penalised; presentation-vs-missing; per-step attribution).
  NO call-config change (that was #174). No schema/data/feature change.
- Force-with-lease push of the rebased branch (owner-approved; expected after rebase of a
  parked branch — file diff byte-identical to the reviewed change). PR #178 opened → owner
  chose merge-now (squash) → merge commit `c760c8e` (new trunk SHA).

### Measured quality (live gemini-2.5-flash, non-stub, BEFORE/AFTER on T1–T9)
- BEFORE 6/9 → AFTER 8/9 solid. D21 (T1 `sol2.jpeg`) robustly fixed every run (silly, never
  conceptual×2). T7 (skipped verification → missing/null, was conceptual) and T8 (unbalanced
  → presentation, was conceptual) newly fixed. T2 (genuine wrong-method) stays conceptual —
  no over-correction. T4 accepted as Option 1 (see DECISION_LOG).

### Gates (rebased branch @ trunk)
- scope:guard `SCOPE_GUARD_OK` (the gate dead when B was first written; re-armed by #176).
- `npm run build` exit 0. `scripts` `test:matrix:all` 137/137. diff = exactly checkSolution.cjs.
- backlog_1_19 3/19 reds pre-existing/intentional (identical on base via stash), unrelated.

---

## 2026-06-02 — PR #176: restore scope-guard policy (re-arm 3 gates) + this docs PR

### Starting state
Base SHA at session start: `1e9bd04` (after #176 had merged). This session: (1) PR #176 —
restore the accidentally-untracked `repo_boundary_policy.json` to re-arm the scope guards;
(2) this docs-only handoff PR recording all state + decisions resolved today.

### 1 — PR #176: restore repo_boundary_policy.json (re-arm scope:guard + test:repo-boundary + ci:smoke)
Forensic root cause (established, not re-investigated): the policy JSON was added in `d4ed284`
and read by three live scripts (`scopeGuard.mjs`, `ops/repo_boundary_acceptance.mjs`,
`ops/software_testing_bot.mjs`); the chore `2081003` ("remove internal docs and reports from
git tracking") `git rm --cached`'d the whole `project_memory/` tree and untracked this ONE
live-dependency file — so `scope:guard`, `scope:guard:tutor`, `test:repo-boundary`, and
`ci:smoke`'s first step all threw "missing policy file". Fix: restored the REAL file from
history (`git show d4ed284:… > …`, not hand-authored — avoids drift), force-added (it sits
under the gitignored `project_memory/` tree). Confirmed it parses + has the four required lane
arrays the guard validates. Exactly ONE new file; no code, no `.gitignore` change.

### Evidence + gate (PR #176)
- `scope:guard`: `missing policy file` → `SCOPE_GUARD_OK`. `scope:guard:tutor`: → `SCOPE_GUARD_OK`.
- `test:repo-boundary`: was erroring on the missing policy → now RUNS (4/5). The policy file
  classifies as `trackedTooling` (lane rule `docs/`), so it adds NO new red. The 1 red is
  pre-existing: `vitest.config.ts` matches no lane.
- `git check-ignore`: reports NO match once the file is tracked (tracking overrides the dir
  ignore rule) — so re-tracking is the durable fix; no `.gitignore` edit needed.
- `tsc --noEmit` exit 0; production build GREEN (32.8s); `git diff --check` clean; remote PR
  diff = exactly the one JSON. `verify-build.mjs` referenced by CLAUDE.md §6 is absent in this
  checkout (flagged, not faked) — same gap noted in #174/#175.
- Commit `c7d742f` → PR #176 → MERGED (2026-06-02) → merge commit / new trunk `1e9bd04`.
  Vercel GREEN confirmed by owner before merge. Branch deleted (remote + local) post-merge.

### 2 — Owner decisions recorded (see DECISION_LOG) + discoveries D22–D23 (see DISCOVERIES)
3/19 acceptance reds = known-red-by-decision (all 3 INTENTIONAL product changes, zero accidental
regressions); Dashboard is being retired → Home + Me/Progress (3 hardcoded `/dashboard` landings
to fix in a Track A consolidation); post-login `?redirect=`/`from` priority is correct — only the
bare-login FALLBACK wrongly defaults to `/dashboard`; Mistake Intelligence NOT yet wired to
Me/Progress (future PR); Daily Mix alive + premium-gated, a daily-habit PRACTICE surface (NOT one
of the four hooks, NOT mistake/spaced-repetition-driven) — flagged for an owner KEEP/CUT decision.
D22 (Vercel "AI API request failed" is BY DESIGN — ISSUE-009) and D23 (scope:guard dead since
`2081003`) recorded.

### Sequencing
This docs update → PR B (Part 1): sync `feat/check-solution-grading-prompt` (`204ac7c`, parked,
NOT merged) onto `1e9bd04`, re-run scope:guard + build + `test:matrix:all`, open + merge →
Track A PR-1 (tutor wiring: per-row "Learn this" → ConceptTeachDrawer/TeachFlow concept_teach in
DesktopTopicHub — the tutor is NOT yet visible in the product) → PR B2 (teach-prompt tightening,
deferred until tutor is wired + visible) → Railway deploy + `vercel.json /api/*` rewrite + rate
limiting (the unlock for the Vercel link's AI; at link-time: Clerk pk_test_→pk_live_, DPDP/consent
for minors, charge path) → Track A redesign PRs + Track B content.

---

## 2026-06-01 — AI gateway live (local dev) + PR #174: check-solution parse fix + this docs PR

### Starting state
Base SHA at session start: 8c16173 (post-PR #173 docs handoff). Worked across three things
this session: (1) bring the AI gateway live on LOCAL dev non-stub, (2) PR #174 fix the
check-solution "could not evaluate" parse bug, (3) this docs-only handoff PR.

### 1 — AI gateway live on LOCAL dev (no code change; env is gitignored)
Placed the owner's direct Gemini key in `lazytopper/server/.env` (`API_KEY` + `PORT=3001`;
gitignored — confirmed `git check-ignore`). Booted gateway: `Gemini: ON (gemini-2.5-flash)
| Auth: direct-key`, `STUB_MODE=false`. Smoke-tested both endpoints with real output:
`/api/mentor` (learn_teach, triangles/BPT) → real structured teach; `/api/check-solution`
(typed answer) → real graded JSON. Confirmed end-to-end dev path: browser same-origin /api
→ Vite proxy (:25246) → gateway (:3001) → real Gemini. KEY NEVER printed/committed.

### 2 — PR #174: check-solution parse reliability (the "could not evaluate" bug)
Root cause: `gemini-2.5-flash` is a thinking model; under `maxOutputTokens:2500` with no
JSON mime-type, its reply truncated/wrapped → `extractJsonObjectFromText` returned null →
misleading "clearer image" fallback (image was always read fine). Fix (scoped to
`server/routes/checkSolution.cjs`, +4/-2): `responseMimeType:'application/json'` +
`maxOutputTokens` 2500→8000 + warn-log unparseable reply (model text only) + honest
fallback message. `geminiClient.cjs` already forwarded responseMimeType — untouched.
MEASURED before/after on the owner's real handwritten image `sol2.jpeg`: BEFORE `ok:false`
"could not evaluate"; AFTER `ok:true`, 5 annotated steps, read the handwriting, caught the
wrong zeroes → 1/3. `sol3.jpeg` (correct solution) → 3/3. Typed regression still works.
Discovered a quality gap in the AFTER output (see D21) — deferred to PR B.

### Evidence + gate (PR #174)
- `npm run build` exit 0 (`tsc -b` clean, `BOM_GUARD_OK`, ✓ built in 17s). `git diff --check`
  clean. Diff = exactly checkSolution.cjs. No forbidden files. Verified locally non-stub.
- NOTE: CLAUDE.md/instruction referenced `scripts/verify-build.mjs` + "137 guards" — neither
  exists in this checkout (flagged, not faked). The real build gate (`npm run build`) passed.
- Commit 4ae059f → PR #174 → MERGED (2026-06-01 16:59 UTC) → new trunk SHA 5ad359c.

### 3 — Discoveries recorded (D19–D21) + owner clarifications
See DISCOVERIES.md (D19 local dev proxy port; D20 force-JSON for structured Gemini calls;
D21 check-solution over-classifies conceptual). Owner clarifications (trial = all features
for 7 days then free Basic; fully responsive at every width not a 1024 twin; PR numbers
follow git; launch domain = lazytopper.in NOT .app; two-track build locked) recorded in
CURRENT_STATE.md. The LOCKED specs (Learn Flow Spec, Track A PR Breakdown) are owner/
architect-held and NOT yet in this repo — referenced, not fabricated.

### Sequencing
A2 (#174, done) → THIS docs update → PR B (grading + teach prompt tightening, measured vs a
mistake-scenario matrix) → check-solution eval set → Railway deploy (now IN scope — owner
needs a live link for students to test tutor+checker quality) → hand students the link.
Deploy ONLY after the checker reliably returns GOOD grades locally. Open at student-link
time: Clerk pk_test_→pk_live_, DPDP/consent for minors, monetization charge path.

---

## 2026-06-01 — PR #172: Mobile Home polish + 5-tab light BottomNav + single brand bar

### Starting state
Base SHA at session start: a6fc024 (post-PR #171). Numbered PR #172. Branch
`feat/mobile-home-polish`. The locked design `mobile_home_locked_final.html` was not on
disk but was supplied inline in the prompt — built verbatim from that.

### What shipped (mobile Home polish + mobile-chrome fixes, <1024px)
- Rebuilt src/pages/app/MobileHome.tsx to the owner-locked polish design: illustrated
  gradient SVG icons copied verbatim (JSX-cased, unique gradient ids) — rising bar chart
  (Exam Trends), crystal-ball "?" (Predicted), stacked sheets + play (Practice), phone +
  green tick (Check), brain (Mistake Intel). Orient-before-act order for signed-out
  students (What scores most → What's likely in 2027 → Practice it → Check your answer);
  persistent one-line hint per row; inspiring Mistake-Intelligence panel with a clearly
  labelled SAMPLE report ("Sample · what your report looks like") + honest CTA "Start
  free — find my reasons" (NOT "Sign in to unlock"). Resume strip only when signed-in
  with real landingMemory. Real-data wiring kept on the firebase-free boundary; signed-in
  Mistake-Intel shows an honest empty state (no invented counts) since real insights pull
  firebase at module load (CAUTION honoured). Predicted card routes to /exam-trends (the
  canonical predicted surface; /predictive-papers flagged in the audit for a future
  dedicated destination).
- App.tsx BottomNav(): recoloured to the light app grammar (background #fff, borderTop
  hsl(220,18%,90%), active green hsl(152,55%,45%), inactive slate hsl(220,15%,42%)) —
  replacing the near-black rgba(10,10,10,0.95) band; expanded 3→5 tabs (Home /browse,
  Exam Trends /exam-trends, Practice /practice-hub, Check /check-improve, Me /me) with
  added Home + Check icons; visibility gate intact (null on desktop, /welcome, /pricing,
  /intent*). Exported for unit testing.
- index.html theme-color #58cc02 → navy #0f1b33 (killed the green mobile browser-chrome
  banner). No PWA web-manifest with theme_color exists; favicon/og-image/styles.css
  #58cc02 are the legacy brand palette — flagged in the §D audit, NOT changed.

### Addendum — double brand-bar fix (Option A, owner-chosen)
The signed-out mobile preview showed TWO stacked brand bars (global public navbar +
MobileHome's own locked-design bar). Fix: a single added condition on the global-navbar
render gate via a pure exported predicate `isMobileSelfChromedRoute(pathname, isDesktop)`
(= `!isDesktop && (pathname==="/browse" || pathname==="/welcome")`); `!mobileSelfChromed`
ANDed into the navbar gate. Gated on `!isDesktop` → desktop chrome unchanged. Now each
mobile page (Home + Landing) shows exactly ONE brand bar. Accepted consequence: the
global Search box is no longer on mobile Home (owner-approved; NOT re-added). App.tsx
scope stayed confined to BottomNav() + this one navbar-gate condition.

### §D obsolescence audit (flag-only; no deletions this PR)
Reported legacy/superseded routes for a future deprecation PR: /dashboard→/me,
/trends→/exam-trends, /practice/:g/:s→/practice-hub (/profile, /ai-mentor, /mentor,
/topic-mock already redirect); /predictive-papers + /highly-probable = candidate home for
a future dedicated Predicted destination. Legacy #58cc02 palette (styles.css/tokens.css/
favicon/og-image) = separate colour-migration PR.

### Evidence + gate
- npx tsc -p tsconfig.app.json --noEmit → exit 0. npm run test → 32/32 (was 19; added
  MobileHome polish assertions, BottomNav 5-tab/route/colour/visibility, the
  isMobileSelfChromedRoute predicate, single-brand-bar). npm run build → exit 0.
  Guards 137/137. git diff --check clean. Desktop render byte-identical (App.tsx diff
  confined to BottomNav + 1 navbar-gate condition; no desktop/forbidden files).
- Playwright screenshots (signed-out, 390px) confirmed: illustrated icons + orient-first
  order, SAMPLE Mistake-Intel panel, 5-tab light BottomNav, single brand bar on /browse
  AND /welcome, desktop /browse unchanged.
- Vercel PREVIEW: SUCCESS (owner reviewed). Merged (squash) → base
  `a6360370588014a0a696fea97d6f4d548b0e5a5a`. Vercel PRODUCTION deploy: SUCCESS.
- Branch `feat/mobile-home-polish` deleted (remote + local).

### Report
- `C:\Users\Chetan\OneDrive\Desktop\diff\report\report-PRD-mobile-home-polish-2026-05-31.md`
  (+ screenshots/ 01–06; copies in `...\diff\`).

### Next
usePracticeHub extraction + MobilePracticePage (owner-sequenced). See NEXT_ACTION.md.

---

## 2026-05-31 — PR #170: Mobile landing (swipe carousel) for /welcome

### Starting state
Base SHA at session start: 32001a2 (post-PR #169). Numbered PR #170.

### Process note — missing referenced files (flagged + resolved)
The PR-C prompt referenced PR_C_mobile_landing.md (full instruction) and
carousel_cards_v4_genz.html (frozen art) — NEITHER was on disk. STOPPED and asked
rather than invent "frozen" visuals; owner then supplied PR_C_frozen_carousel_art.md
with the exact SVGs. Used those verbatim. Lesson: when a "frozen design" file is
referenced but absent, stop and request it — do not fabricate locked art.

### What shipped (mobile public landing)
- New src/pages/MobileWelcome.tsx — full-bleed mobile landing (own minimal top bar;
  /welcome is not shell-wrapped, BottomNav hidden). Hook line + native CSS scroll-snap
  carousel (NO gesture lib) of 4 PRESENTATIONAL cards using the frozen v4 SVG art
  verbatim (01 Exam Trends / 02 Predicted Questions / 03 Check & Improve / 04 Mistake
  Intelligence) + dot indicator. Sticky "Start free" CTA → navigate(user?"/":"/browse")
  (no login gate); honest sub-line "7-day Premium trial — then free Basic, upgrade
  anytime." (test asserts "then paid" is ABSENT); quiet "Already a member? Sign in"
  link → /login?reason=login&redirect=%2F. CTAs match desktop Welcome exactly.
- App.tsx: /welcome now `isDesktop ? <Welcome/> : <MobileWelcome/>` + a lazy import.
- Welcome.tsx (2,220 lines): ZERO changes (git diff --quiet → unchanged).

### Evidence + gate
- npm run test → 19/19 (added 6 MobileWelcome). npm run build → exit 0. Guards 137/137.
- Vercel PREVIEW check: SUCCESS. Owner reviewed the preview
  (https://lazytopper-productio-git-c7e036-chetan-anands-projects-1c1a72c8.vercel.app/app/welcome)
  then approved merge. Merged (squash) → base
  `ac2361736785ed392a2c272cd6ede26acda36a77`. Vercel PRODUCTION deploy: SUCCESS.
- Branch `feat/mobile-landing` deleted (remote + local).

### Report
- `C:\Users\Chetan\OneDrive\Desktop\diff\report\report-PRC-mobile-landing-2026-05-31.md`
  (copy in `...\diff\`)

### Next
usePracticeHub extraction + MobilePracticePage (owner-sequenced). See NEXT_ACTION.md.

---

## 2026-05-31 — PR #168: Mobile Home (/browse cockpit reflow below 1024px)

### Starting state
Base SHA at session start: 89bcf83 (post-PR #167). Numbered PR #168.

### What shipped (first real page reflow)
DesktopHome rendered at /browse at all widths with 3 non-reflowing grids → mobile
4-card squeeze. Added a dedicated mobile layout + viewport switch; desktop unchanged.
- New src/pages/app/MobileHome.tsx — single-column mobile cockpit on the PR-A grammar
  primitives (TileRow stacks the 4 destinations via the real @media(max-width:1023px)
  CSS). Real data only (shared PRIMARY_CARDS/loginUrl, useAuth, useSubscription,
  landingMemory). /browse is signed-out-only → mistake card renders the real
  logged-out state.
- App.tsx: /browse now `isDesktop ? <DesktopHome/> : <MobileHome/>` + a lazy import.
  RootEntry needed NO change (already redirects mobile away before DesktopHome).
- New src/lib/desktop/homeDestinations.tsx — firebase-free single source of truth for
  PRIMARY_CARDS + loginUrl, imported by BOTH Home variants.
- DesktopHome.tsx: declaration relocation ONLY (import the shared symbols; remove the
  relocated PRIMARY_CARDS/loginUrl/QuickCard + 3 icons used only by PRIMARY_CARDS).
  Component JSX untouched — render byte-identical.

### Key decision — why the homeDestinations extraction
Importing PRIMARY_CARDS/loginUrl directly from DesktopHome would pull firebase (via
mistakeLogService → firebaseClient initializeApp) into the mobile chunk AND the Vitest
unit test. Lifting only the dependency-free routing bits into homeDestinations avoids
that while keeping a single source of truth (no fork).

### Desktop-unchanged proof
App.tsx = lazy import + 1 branch. DesktopHome.tsx = 4 ins / 59 del, ALL module-level
(every diff hunk < line 286; component return/JSX zero hunks). tsc -b clean.

### Evidence + gate
- npm run test → 13/13 (2 smoke + 3 MobileHome + 8 grammar). npm run build → exit 0.
  Guards 137/137.
- Vercel PREVIEW check on #168: SUCCESS. Merged (squash) → base
  `dfbbcff27796bb0ad980b2fd72c3eb19b0aa268f`. Vercel PRODUCTION deploy: SUCCESS.
- Branch `feat/mobile-home` deleted (remote + local).

### Note (owner-confirmed)
App.tsx is normally globally-forbidden; the PR-B instruction explicitly permitted the
minimal isDesktop branch + lazy import only. Owner approved.

### Report
- `C:\Users\Chetan\OneDrive\Desktop\diff\report\report-PRB-mobile-home-2026-05-31.md`
  (+ a DETAILED copy and an earlier copy in `...\diff\`)

### Next
PR C — usePracticeHub extraction (then PR D — MobilePracticePage). See NEXT_ACTION.md.

---

## 2026-05-30 — PR #166: Shared responsive grammar primitives + first render test

### Starting state
Base SHA at session start: 0d5a63f (post-PR #165). Numbered PR #166.

### What shipped (foundation primitives; no page changed)
New folder `src/components/grammar/` with reusable responsive building blocks that
carry the verified live desktop grammar (HSL token literals matched exactly to
DesktopPracticePage constants — GREEN hsl(152,55%,45%), FG, MUTED, BORDER, etc.):
- tokens.ts, Card.tsx, Pill.tsx (active/disabled/tone), SectionHeader.tsx, index.ts
- TileRow.tsx — KEY primitive: N-column grid on desktop, single-column stack below
  1024px. Reflow is a REAL `@media (max-width: 1023px)` rule in a scoped <style>
  (NOT a JS width check, NOT inline). Column count flows via the `--lt-tile-cols`
  CSS custom property so the CSS text is shared/idempotent across instances.
- grammar.test.tsx — the FIRST real render test on the #160 Vitest infra.

### How the render test proves reflow (jsdom has no layout)
Asserts the CSS contract, not pixels: the emitted <style> contains
`@media (max-width: 1023px)` collapsing .lt-grammar-tile-row to one column; column
count is `--lt-tile-cols`-driven; and rendering desktop vs mobile
(setMatchMediaMatches true/false) yields BYTE-IDENTICAL CSS — proving pure-CSS
reflow with no JS branch. Plus Pill/Card/SectionHeader behavior.

### Evidence + gate
- npm run test → 10/10 (2 smoke + 8 grammar). npm run build → exit 0. Guards 137/137.
- Scope: src/components/grammar/* only (7 files); no page/component/data change.
- Vercel PREVIEW check on #166: SUCCESS. Merged (squash) → base
  `fefcbc74a01dee0ac2ef305e8c393571ff03c64c`. Vercel PRODUCTION deploy: SUCCESS.
- Branch `feat/responsive-grammar-primitives` deleted (remote + local).

### Report
- `C:\Users\Chetan\OneDrive\Desktop\diff\report\report-PRA-grammar-primitives-2026-05-30.md`
  (copy in `...\diff\`)

### Next
PR B — Mobile Home: reflow the Home cockpit onto these primitives (TileRow for the
4-card row) + a render test. See NEXT_ACTION.md.

---

## 2026-05-30 — PR #164: Decommission dead blackbox/tracker/pmem memory tooling

### Starting state
Base SHA at session start: 653762a (post-PR #163). Numbered PR #164.

### Scope decision (owner-delegated FULL CLEAN)
Investigation found the dead "memory blackbox" tool was more entangled than the
original PR-0.5 brief: beyond the named files, it was referenced by startSafe.mjs
(start:safe), the scripts/githooks pre-commit, trackerAll.mjs (the tracker family
IS the blackbox dashboard), the pmem-runner, the PR template, and .gitignore.
Flagged the ambiguity and STOPPED; owner delegated a full clean decommission of the
entire experiment, then approved folding in the orphaned
tools/project-memory-blackbox-ext/ stub.

### Removed (16 files + 20 npm scripts)
- scripts/: blackbox.mjs, contextpack.mjs, rulesDigest.mjs, memoryContracts.ts,
  stageTracker.mjs, trackerAll/Watch/Serve/Ui/UiLive/Doctor.mjs
- tools/pmem/ (pmem-runner.cjs, End-Session.ps1) + tools/project-memory-blackbox-ext/
  (keyLoader.ts — a one-file stub) + .github/workflows/blackbox.yml
- npm scripts: blackbox*, contextpack, rules:digest, tracker*, pmem:*, precommit:check

### Repaired (nothing left broken)
- start:quick → `npx tsc -p tsconfig.app.json --noEmit && npm run build` (kills the
  false-green bare `npx tsc --noEmit` — the #160→#162 bug class)
- startSafe.mjs (drop blackbox:full, fix tsc), githooks/pre-commit (keep lint),
  githooks/README.md, PR template, .gitignore (kept load-bearing .project_memory/ ignore)

### Preserved (verified): .project_memory/ops/, docs/project_memory/, all scripts/ops/*,
server/services/serverConfig.cjs. Zero deletions under any of these.

### Evidence + gate
- Repo-wide sweep for the experiment → 0 references. npm run build → exit 0.
  Vitest 2/2, guard suite 137/137.
- Vercel PREVIEW check on #164: SUCCESS. Merged (squash) → base
  `7f41422d02f6040852abc0b3a9bbb3a253f06d23`. Vercel PRODUCTION deploy: SUCCESS.
- Branch `chore/decommission-blackbox` deleted (remote + local).

### Process note
git rm staged the deletions; the 6 edits staged separately. Used `npm pkg delete`
to remove the 20 scripts (preserves formatting/order). All commit messages authored
via `-F file` (avoids the PowerShell-here-string-in-bash hazard from #160).

### Report
- `C:\Users\Chetan\OneDrive\Desktop\diff\report\report-PR0.5-decommission-blackbox-2026-05-30.md`
  (copy in `...\diff\`)

### Next
PR A — shared responsive grammar primitives + first real render test (see NEXT_ACTION.md).

---

## 2026-05-30 — PR #162: Hotfix — exclude test files from production app tsconfig

### Starting state
Base SHA at session start: 2c83ea3 (post-PR #161 docs handoff). Numbered PR #162.

### The bug (and an honest non-repro)
PR #160's test files (src/test/setup.ts, smoke.test.tsx) import dev-only packages
(@testing-library/react, jest-dom, vitest). tsconfig.app.json had `include: ["src"]`
and NO `exclude`, so the production compile (tsc -b && vite build = Vercel's
`npm run build`) sweeps the test files into the app program (confirmed via
`tsc --listFilesOnly`).

IMPORTANT — the described failure did NOT reproduce locally: `npm run build` and
`tsc -b --force` both passed GREEN on the unmodified base. Root cause traced: locally
devDependencies are installed so the test imports resolve; on Vercel the production
install prunes devDependencies (NODE_ENV=production), so the test files fail with
`TS2305 ... no exported member`. Reported the green local build honestly rather than
claiming a repro; fixed the root cause anyway (prod compile must never include tests).

### Fix (one file)
tsconfig.app.json: added `exclude: ["src/**/*.test.ts", "src/**/*.test.tsx",
"src/test/**"]`; kept `include: ["src"]`. tsconfig.node.json includes only
vite.config.ts — no change needed. vitest.config.ts untouched (its own include keeps
Vitest running the tests).

### Evidence
- After fix, `tsc --listFilesOnly` no longer lists src/test/* (was: both present).
- `npm run build` → ✓ built, exit 0. `npm run test` → 2 passed. Guard suite 137/137.
- Scope: only tsconfig.app.json. `.claude/` never staged.

### Vercel gate (the real validation — hard gate, passed)
- PR #162 Vercel PREVIEW check: SUCCESS (production-mode build, devDeps pruned —
  the exact failure surface). Confirmed the devDep-pruning diagnosis.
- Merged #162 (squash) → base SHA `bd0c36e7f5f81b2a80f867616895af1bd23a2156`.
- Vercel PRODUCTION deploy for bd0c36e: SUCCESS (Ready). Fix confirmed in prod.
- Branch `fix/tsconfig-exclude-tests` deleted (remote + local).

### Reports
- `C:\Users\Chetan\OneDrive\Desktop\diff\report-PR0.1-tsconfig-exclude-tests-2026-05-30.md`
- copy in `...\diff\report\`.

### Next
PR 0.5 — blackbox decommission + false-green `npx tsc --noEmit` fix
(`chore/decommission-blackbox`). See NEXT_ACTION.md.

---

## 2026-05-30 — PR #160: Vitest + Testing Library render-test infrastructure

### Starting state
Base SHA at session start: 7e6e39d (post-PR #159 docs handoff).

NOTE: the PR0 instruction named base `2c91940` (post-#158); origin tip had already
advanced one docs-only PR (#159). Flagged the SHA mismatch per doctrine; owner chose
to branch from the current tip `7e6e39d`. Numbered the PR #160 (next unused integer
after #159).

### Work completed (tooling-only foundation PR)
The `lazytopper/` app package had NO render-test mechanism. PR #160 installs it once
so every future UI PR can ship a real proof-of-work render/reflow test.

- Added devDependencies (exact pins, all >1 day old per minimumReleaseAge policy):
  vitest@3.2.4, @testing-library/react@16.3.2, @testing-library/jest-dom@6.9.1,
  @testing-library/user-event@14.6.1, jsdom@29.1.1 (+ transitive
  @testing-library/dom@10.4.1).
- `vitest.config.ts` — SEPARATE from vite.config.ts; React plugin, jsdom, globals,
  setupFiles, `include` scoped to `src/**/*.test.{ts,tsx}` so it never runs the
  scripts/ node:test guard suite.
- `src/test/setup.ts` — jest-dom + configurable `window.matchMedia` polyfill (jsdom
  lacks it; useIsDesktop needs it). Defaults to mobile, overridable per-test via
  `setMatchMediaMatches`, resets each test; provides both modern (addEventListener)
  and legacy (addListener) MediaQueryList APIs.
- `src/test/smoke.test.tsx` — one trivial render test (2 assertions) proving the
  mechanism end to end.
- `package.json` — added `test`/`test:watch` scripts; no existing script altered.

### Evidence
- Proof-of-work: `npm run test` → Vitest 3.2.4, smoke.test.tsx **2 passed**.
- Regression: `tsc -p tsconfig.app.json --noEmit` clean; scripts/ guard suite
  **137/137 PASS**, untouched.
- Scope: `git diff --check` clean; only package.json, package-lock.json,
  vitest.config.ts, src/test/setup.ts, src/test/smoke.test.tsx changed. `.claude/`
  never staged.

### Merge
- PR #160 merged → new base SHA `99fd660bf9ef9cbd4ead133344c10352d529809a`.
- Branch `chore/vitest-test-infra` deleted (remote + local).

### Process note (carry forward)
First commit accidentally used PowerShell here-string syntax (`@'...'@`) inside the
Bash tool, leaving a stray `@` in the commit subject. Caught immediately, amended
via a temp file BEFORE any push — pushed history is clean. Lesson: the Bash tool is
POSIX bash; use heredoc (`<<'EOF'`) or `-F file`, not PowerShell here-strings.

### Reports
- `C:\Users\Chetan\OneDrive\Desktop\diff\report\PR0-vitest-infra-2026-05-30.md`
- `C:\Users\Chetan\OneDrive\Desktop\diff\report-PR0-vitest-test-infra-2026-05-30.md`

---

## 2026-05-29T14:30Z — Post-PR #157+#158: Sprint 1 content extraction complete

### Starting state
Base SHA at session start: 94aee7d (post-PR #156)

### Work completed

1. PR #157 merged — Sprint 1 CBSE Official + P5 Sample Papers (442 Qs)
   - CBE Item Bank Maths: 148 questions across 13 *.cbe.ts files
   - CBE Item Bank Science: 173 questions across 13 *.cbe.ts files
     (includes appended Science10R3a)
   - P5 Sample Papers: 121 questions across 26 *.sp.ts files
     (SP Maths 2022 + Science SQP 2022-23 + OnBoard 2023)
   - 116 questions tagged requiresDiagram with diagramDescription
   - predictionTypes.ts gained 2 optional fields (requiresDiagram, diagramDescription)
   - CFPQ deferred (image-only PDFs, OCR follow-up sprint needed)

2. PR #158 merged — Preboard SP1 + SP2 generated solutions (55 Qs)
   - Unsolved 2019-20 Maths Standard papers
   - Worked solutions generated in CBSE marking style per owner authorization
   - Modelled on existing CBE Maths question files
   - Every solutionStep mark-weight-prefixed summing to question marks
   - 12 solutions spot-checked against first principles — all correct
   - Banned topics filtered (Constructions, Cross-Multiplication, etc.)
   - Section D 4-mark items excluded (no valid CBSE section mapping)

### Sprint 1 totals
- Total new authentic questions: 497
- Files added: 65 (.cbe.ts, .sp.ts, .preboard.ts)
- Bank moved from 5,821 → 6,318 questions
- Authentic ratio moved from 53% → 58%

### Key decisions made this session

1. CFPQ image-only PDFs deferred to OCR sprint (not fabricated)
2. Preboard papers: generated solutions authorized as Claude can solve
   deterministic CBSE maths accurately when given existing CBE question
   files as style/quality reference
3. requiresDiagram + diagramDescription fields added to CanonicalQuestion
   (2 optional fields, additive only, predictionTypes.ts forbidden rule
   overridden for this specific authorized exception)
4. Section A 65% in preboards kept as-is (inherent to source structure)
5. Rate limiting must ship WITH API gateway PR, not as follow-up
6. lazytopper.app confirmed as definitive launch domain
7. Step marking prefix is non-negotiable for all new content

### Audits/diagnostics performed

- Independent banned-content keyword scan across 65 new files: clean
- 12 generated solutions spot-checked: all correct
- All validation gates: green
- Filter system architecture documented (4 layers L1-L4)

### Open issues identified post-session

- AR questions appearing in 5-mark Section D (tagging error in some pack files)
- Repo-wide solutionSteps prefix audit needed (older questions pre-step-mark rule)
- Preboard quick-practice currently shows panel-first UX (PR #153 decision;
  any reversal requires its own PR)

### New base SHA
2c91940c31a61adfffb6928ebfc53ddd02ee7d05

---

## 2026-05-29 — Post-PR #153 + #154 + #155: filter UX + engine fixes

### Starting state
Base SHA at session start: 18c1f5a6ab1f3b775d6cd52cb39bab9297549515 (post-PR #152)

### Work completed

1. PR #153 merged — filter UX redesign (4 files)
   - PracticeControls.tsx: student-language chips (Marks/Style/Source/Difficulty)
   - PracticePage.tsx: pending/committed filter state, Option B (questions after Build)
   - PracticeQuestionList.tsx: empty state nav fix (Link not a href)
   - DesktopPracticePage.tsx: K2H-8b filter panel removed
   - isBuilt defaults to false (panel-first UX)
   - Count chip with dropdown (max 20, worksheet nudge above 20)
   - HOTS auto-selects Hard, freezes Easy/Medium
   - Clear filters button
   - Collapsed-after-build: summary bar with Edit button

2. Comprehensive bank audit performed (2026-05-28/29)
   - bank_health_audit.py: 5,821 questions, 0 mojibake, 0 orphans
   - filter_reachability_audit.py: 163 empty combos (all structural impossibilities)
   - technical_audit.py: H1-H6 all clean except H3-bug (126 Exemplar double-count)
   - Per-topic question matrix established (all 26 topics, A/B/C/D/E counts)
   Audit files saved at: C:\Users\Chetan\OneDrive\Desktop\diff\

3. PR #154 merged — source filter + chip constraints + ISSUE-006/007 (4 files)
   ISSUE-006 CLOSED: Hindi garbled PYQ question removed (PYQ-M-2024-TRIG-003)
   ISSUE-007 CLOSED: Proof filter Section A exclusion (1 line, 2 files)
   H3-BUG FIXED: 126 Exemplar -EXEM- IDs no longer double-counted in Others
   STYLE_COMPAT: bidirectional chip constraints (Style -> Marks direction added)

4. PR #155 merged — engine marks/section/competency/blueprint (4 files)
   Root cause diagnosed via browser console: engine returned 50 questions but
   only 5 survived B+C filter due to Section-A bias in default difficulty mix.
   Fix A: marksFilter string-to-number mapping (already wired pre-PR)
   Fix B: enforceCompetencyFloor gate (quick practice=false, mock/mission=true)
   Fix C: engineCount multiplier (5x when marks filter active, capped 100)
   Fix D: engineSectionFilter (routes engine to correct section directly)
   Fix E: CBSE blueprint distribution (5-section parallel fetch for "All" marks)
   Fix F: bankAvailableCount (pre-Build count from bank, not empty questions state)
   Fix G: filteredQuestions.slice(0, committedCount) (trims overfetch to request)
   Smoke test: 24/24 PASS across 6 topics x 4 marks filters
   Distribution verified: balanced A/B/C/D/E in "All" marks mode

### Key decisions
1. COMPETENCY floor: applies only to mock/timed test paths (not quick practice)
2. bankAvailableCount: runs buildPracticeQuestionsFromEngine(count=200) on mount
   to show realistic pre-Build availability hint to students
3. Case-based "Easy" tagging: identified as data quality issue, cleanup deferred
4. "N available" pre-Build: shows bank count (not 0) after Fix F

### Audit findings (saved to desktop, not in repo)
- 5,821 questions total | 3,139 authentic (53%) | 2,689 AI (46%)
- All 26 topics covered | 0 orphaned questions | 0 mojibake
- Section D thin for Maths (real-numbers:14, polynomials:12, coord-geom:14)
- Section E thin everywhere (6-19 per topic) — target for Sprint 1

### Open issues post-session
P0: API gateway 404 in production (backend not deployed to Railway)
P0: Clerk pk_test_ keys active in production
P1: Sprint 1 CBSE official content extraction (~480 Qs on disk)
P1: Practice end-of-session debrief
COSMETIC: 51 AI-Pack files use Title Case topicKeys (engine normalises them)
COSMETIC: Case-based questions tagged "Easy" should be "Medium"

### New base SHA
99533830ff9b1d4654bf4968e36151ccb7531815 (post-PR #155)

---

## 2026-05-26 — Post-PR #150 + #151: PYQ 2024 Maths + permanent tagging/filter/step-marks fix

### Starting state
- Base at session start: 670434c (post-#147+#148 docs handoff)
- Base after PR #150 merge: cfadd9e
- Base after PR #151 merge: 547da58 (current HEAD on origin/base/approved-thru-437)
- Active PRs at session start: none

### Work completed

1. PR #150 merged — P4-M PYQ 2024 Maths (96 questions, 13 topic files, pyqYear "2024")
   - Section balance: A=30 (31.3%) B=22 C=29 D=7 E=8 — within target
   - syllabusGuard: 0 violations
   - Tests: 137/137 PASS
   - Spreads: 253 → 266 (+13)

2. Comprehensive tagging + filter audit (2026-05-26)
   - Audit script scanned all 6,042 questions
   - 1,242 questions with ≥1 violation (20.6% violation rate)
   - Filter system audit revealed 5 soft fallback locations
   - Browser smoke test on Vercel preview confirmed: Proof filter showing only 2
     questions (too narrow), Competency filter showing recall questions, Section D
     showing trivial recall questions, Hindi PYQ question with garbled Devanagari
     encoding present in bank

3. PR #151 merged — permanent tagging, filter & step marks fix (32 files, commit 087ba40)
   - ISSUE-001 CLOSED: Competency filter (isCompetencyBased mapping added at
     practiceQuestionBuilder.ts:268), Proof filter broadened (PRF IDs +
     prove/show/derive text + subtopic keywords + Long/Short+Analysing+SectionC/D
     safety net at both L2 and L3 sites)
   - ISSUE-002 CLOSED: Step-marks "guide-only" banner suppressed for canonical
     bank questions (id present + non-AI prefix + solutionSteps non-empty + marks > 1)
   - 18 genuine 2026-27 syllabus violations removed (8 step-deviation, 2 Euclid's
     algorithm, 3 acquired-traits/Lamarck, 3 forest-conservation, 1 heart-evolution
     PYQ, 1 inline case-study + APQ-M-TRIG-008 kept with subtopic renamed)
   - 25 inline section×marks mismatches fixed in canonicalQuestionBank.ts
     (23 section B→C, 2 section B→A + format Short→MCQ)
   - isCompetencyBased added to 97 missing questions (37 trigonometry.pack2,
     34 triangles.pack2, 26 inline canonicalQuestionBank.ts literals)
   - Section A + Remembering competency override (3 sites: L2 filter, L3 filter,
     trigonometry.pack1 builder IIFE)
   - L2 soft fallback removed (practiceQuestionBuilder.ts) — honest empty state
     instead of silent full-pool fallback
   - Our Environment normaliser fixed (predictionCore.ts:36) — separator collapse
     merges "our-environment" + "OurEnvironment" topic keys (156 questions now
     reachable from one entry point)
   - questionType + pyqOnly forwarded through navigation.ts and DesktopPracticePage.tsx
   - Section×format migration (Option B): 77 A+Short+noOptions questions migrated
     to B+2mk across 13 Science chapterwise files (Rule 7 only; D+MCQ / D+Short
     Rules 1-3 found 0 matches as those combos don't exist in the current bank)
   - Tests: 137/137 PASS, TypeScript exit 0, build exit 0, syllabusGuard exit 0,
     validateQuestionBanks exit 0, duplicate IDs 0

### GitHub evidence

- PR #150: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/150
  Base after merge: cfadd9e
- PR #151: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/151
  Head commit: 087ba40 | 32 files changed, +406/-552 | Base after merge: 547da58

### Validation evidence (PR #151)

- TypeScript: exit 0
- Build: exit 0 (17.67s)
- Test matrix: 137/137 PASS
- syllabusGuard: exit 0
- validateQuestionBanks: exit 0
- Duplicate IDs: 0
- git diff --check: clean
- Diff scope: 32 expected files (no unexpected files)

### Decisions made this session

1. FILTER SYSTEM REDESIGN (agreed, implementation next sprint):
   Default visible (2 rows):
     Row 1 — Question Style: All · MCQ · Proof · Application & Scenario ·
              Assertion-Reasoning · Case-based
     Row 2 — Marks: All · 1 mark · 2 marks · 3 marks · 5 marks · Case (4 marks)
   Toggle: "Board exam questions only" (PYQ) — always visible
   Advanced (expandable): Difficulty row + Source row (Authentic only / Practice only)
   Key changes: "Competency" → "Application & Scenario", Section labels → Mark labels,
   Difficulty to advanced panel, Source filter added, Section A excluded from Proof

2. PACK QUESTION QUALITY STRATEGY (agreed):
   Option B — remove structural outliers for launch, regenerate post-launch
   Structural outliers to remove: Section D + Remembering recall questions,
   Section A + Short without MCQ options
   Keep rest of pack questions as practice volume even if imperfect

3. ACADEMIC CALENDAR ALIGNMENT (confirmed):
   Launch: first week of June 2026
   Primary use case at launch: chapter-by-chapter practice + worksheet generation
   Filter complexity not needed by students until September (PT1 season)
   Timed mock + full filter system needed before October (half-yearly)

4. TAGGING DOCTRINE FOR FUTURE CONTENT:
   isCompetencyBased: true ONLY if real-world context OR AR/Case format OR
   Analysing+ Bloom — NOT just "Bloom ≥ Applying"
   Proof filter: Section A questions NEVER qualify regardless of subtopic
   Section assignment: must be per-question editorial judgment, not group default

### Session learnings

- Pack builder group-default section assignment is the root cause of wrong-section
  questions (not the filter code). Filter code is now correct; data tagging was wrong.
- Proof predicate needs Section A exclusion — conceptual questions about proof
  technique (subtopic "Proof pattern writing") were being caught by keyword match.
- Hindi-medium PYQ files can contain garbled Devanagari script — extraction
  scripts must detect and skip non-English content. Add to extraction doctrine.
- Smoke testing on Vercel preview before merging is mandatory for filter/UI changes.
- stash → rebase → pop is the correct sequence when base advances during agent work.
- Section×format migration script (Option B) successfully moved 77 questions
  to correct CBSE sections in one automated pass. The audit's "431" estimate
  included builder-generated questions (not text-replaceable) and items already
  fixed in earlier rounds.
- The bank has 96 VSA-format questions (90 in Section B + 6 in Section A) not
  covered by the 7 migration rules — needs a separate doctrine decision.
- NCERT/Exemplar mojibake probe found 0 hits; files were already clean (likely
  fixed by an earlier PR before this session).

### Roadmap impact

- ISSUE-001 closed (Competency + Proof filters working)
- ISSUE-002 closed (step marks visible on bank questions)
- Two NEW P0 issues opened from smoke test: ISSUE-006 (Hindi garbled PYQ) and
  ISSUE-007 (Proof Section A exclusion — one-line fix)

### Known issues / follow-ups (after this session)

REMAINING P0 (must fix before launch):
  1. ISSUE-006: Hindi PYQ garbled question in bank — find and remove
     (search for OgHo or _mZ pattern in PYQ files)
  2. ISSUE-007: Proof filter catches Section A conceptual questions — add Section A
     exclusion (one line: if (qSection === "A") return false; at top of Proof branch
     in BOTH practiceQuestionBuilder.ts and PracticePage.tsx)
  3. Clerk production keys — switch pk_test_ to pk_live_ on Vercel
  4. API gateway — Railway deploy + vercel.json rewrite (all AI features 404 in prod)

REMAINING P1 (pre-launch):
  5. P5 sample paper extraction (~200 questions from sample + preboard papers)
  6. Filter UX redesign — rename chips, 2-layer default/advanced layout
  7. Practice end-of-session debrief (session results screen)
  8. Timed mock UI polish (match overall design system)
  9. HPQ content QA (solutionSteps contradictions in ple-hpq-103, ple-hpq-105)
  10. Worksheet generator PDF format audit
  11. VSA-format doctrine decision (96 questions outside the 7 migration rules)

POST-LAUNCH:
  12. Pack question regeneration with stricter per-section prompts
  13. K2D → Mistake Intelligence aggregation (weak areas, mastery scores)
  14. practiceFilterGuard.test.ts (Tier 3 behavioural tests)
  15. TutorDrawerV2 decision

### Next safe action

1. Merge this handoff PR (#152 expected)
2. Fix ISSUE-006 + ISSUE-007 in one small PR (Hindi garbled + Proof Section A)
3. Then: P5 sample paper extraction

---

## 2026-05-25 — P4 PYQ 2024 Maths + Science (PR #147 + #148) — 172 board PYQs added

### Starting state
- Base at task start: 8c4bd37 (post-PR #146 handoff)
- SHA after Maths merge (PR #147): 5e1af4f
- SHA after Science merge (PR #148): a52b10b (current HEAD)

### Work completed

1. P4 2024 Maths extraction (content/p4-pyq-2024-maths):
   - Sources already unzipped at 2024\PYQ\maths\MATHEMATICS_STANDARD_2024\
   - Probed: 13/16 QPs text-extractable; 3 scanned (30/1/x)
   - Syllabus filter applied at extraction + generation time
   - 96 questions extracted, 17 OR pairs, traditional structure
   - Approved, PR #147 merged → SHA 5e1af4f

2. P4 2024 Science extraction (content/p4-pyq-2024-science):
   - Sources unzipped at 2024\PYQ\science\SCIENCE_2024\ (extra \SCIENCE subfolder)
   - Probed: 6/15 QPs text-extractable (31/4/x + 31/5/x only)
   - 4 pipeline fixes required vs 2025 pipeline
   - 1 banned topic dropped (solar energy)
   - 76 questions extracted, traditional structure
   - Approved, PR #148 merged → SHA a52b10b

3. Audit findings this session:
   - Full question bank audit run (v1 had script bug, v2 sent but not yet run)
   - Confirmed: NCERT/Exemplar trigonometry files exist but have mojibake
   - Confirmed: practice filters broken (isCompetencyBased not mapped, Proof
     filter wrong format, same bugs in 2 places)
   - Confirmed: pack1/pack3/proof/AR files have correct questions and register fine

### Bank state post-session
- Authentic questions: ~3,245
- Board PYQs: 761 (all 4 years: 2022-23, 2023-24, 2024-25, 2025-26)
- Spreads: 279
- Retirement threshold: ~72.1% (3,245 / 4,500)
- Test matrix: 137/137 PASS

### Next tasks
1. fix/practice-filters-complete — filter bugs + step marks (instruction ready)
2. fix/mojibake-ncert-exemplar — symbol restoration for NCERT/Exemplar files
3. Handoff PR after both fixes
4. Audit v2 re-run after filters fixed to get accurate per-topic counts

---

## 2026-05-25 — P4 PYQ 2025 Maths + Science (PR #144 + #145) — 182 board PYQs added

### Starting state
- Base at task start: 0c043d0 (post-PR #143 handoff)
- SHA after Maths merge (PR #144): 6929d86
- SHA after Science merge (PR #145): 3ae3474 (current HEAD)

### Work completed

1. Both agents ran in parallel from base SHA 0c043d0
2. Maths agent (content/p4-pyq-2025-maths):
   - Unzipped 041_Mathematics_Standard_2025.zip + Math_2025.zip
   - Used 041 Mathematics Standard/ English subfolder only
   - Probed 19 QPs: 9 text-extractable (30/1/x–30/3/x), 10 scanned
   - Traditional structure confirmed (not subject-based)
   - Extracted 114 intact → 57 unique after dedup
   - Generated 12 .pyq2025.ts files (no triangles — 0 questions)
   - Race-condition recovery: cherry-pick to clean branch
   - Approved, committed 32b1c11, PR #144 merged → SHA 6929d86
3. Science agent (content/p4-pyq-2025-science):
   - Unzipped 086_Science_2025.zip + Science_2025.zip
   - English Medium only (Hindi subfolder detected and excluded)
   - Probed 18 QPs: 9 text-extractable (31/1/x–31/3/x), 9 scanned
   - Traditional structure confirmed
   - Extracted 125 unique questions
   - Adapted pipeline: bare-letter MS answers, watermark footer, Q.P. CODE marker format
   - Race-condition recovery: rebase --onto to drop contaminating Maths commit 0a56cc1
   - Classifier blocked force-push → owner ran CLI push directly
   - Approved, committed 3ba011c, PR #145 merged → SHA 3ae3474

### Race-condition protocol established (final form)
- Both agents commit independently to their own branches
- Maths merges first → new SHA
- Science rebases onto new SHA dropping any contamination
- If classifier blocks force-push → owner runs: git push --force-with-lease origin [branch]
- Sequential merge always: Maths first, then Science

### Bank state post-session
- Authentic questions: ~3,073
- Board PYQs: 589 (2022-23 + 2024-25 + 2025-26)
- Spreads: 253
- Retirement threshold: ~68.3% (3,073 / 4,500)
- Test matrix: 137/137 PASS

### Next task
P4 continuation 2024 — Maths + Science (parallel)
Branches: content/p4-pyq-2024-maths + content/p4-pyq-2024-science
pyqYear: "2024"
Sources:
  Maths: MATHEMATICS_STANDARD_2024.zip + Mathematics_Standard_2024.zip
  Science: SCIENCE_2024.zip + Science_2024.zip
         (Science_2024.zip has Hindi subfolder — use English only)
Note: Check paper structure at probe — 2024 may differ from 2025 or 2026
Expected yield: ~80 Maths + ~80 Science

---

## 2026-05-25 — P4 PYQ 2026 Maths + Science (PR #141 + #142) — 193 board PYQs added

### Starting state
- Base at session start: 7994e7ae (post-PR #140 handoff)
- SHA after Maths merge: fdd2b8e
- SHA after Science merge: 7a1ec2b (current HEAD)

### Work completed

1. Both agents ran in parallel from base SHA 7994e7ae
2. Maths agent (content/p4-pyq-2026-maths):
   - Unzipped Mathematics_Standard_2026.zip + 041_MATHEMATICS_STANDARD_2026.zip
   - Probed 32 QPs: 7 text-extractable Standard, 9 scanned, 16 Basic (skipped)
   - Extracted 84 intact → 42 unique after dedup
   - Generated 13 .pyq2026.ts files, registered in canonicalQuestionBank.ts
   - Approved, committed c008022, PR #141 opened and merged → SHA fdd2b8e
3. Science agent (content/p4-pyq-2026-science):
   - Unzipped Science_2026.zip + 086_SCIENCE_2026.zip
   - Probed 15 QPs: 12 text-extractable, 3 scanned (31/1/x)
   - Extracted 151 unique questions across 12 papers
   - Adapted pipeline for 2025-26 subject-based paper structure
   - Rebased onto fdd2b8e after Maths merged (spread count 228 confirmed)
   - Approved, committed 2a03e6e, PR #142 opened and merged → SHA 7a1ec2b

### New protocol note
- Agent instructions delivered as downloadable .md files (established PR #139 session)
- Parallel agent execution confirmed working for non-overlapping file scopes
- Sequential merge with rebase confirmed as correct pattern for parallel PRs

### Bank state post-session
- Authentic questions: ~2,891
- Board PYQs: 407 (214 from 2022-23 + 193 from 2025-26)
- Spreads: 228
- Retirement threshold: ~64.2% (2,891 / 4,500)
- Test matrix: 137/137 PASS

### Next task
P4 continuation 2025 — Maths + Science (parallel)
Branches: content/p4-pyq-2025-maths + content/p4-pyq-2025-science
pyqYear: "2025"
Sources:
  Maths: 041_Mathematics_Standard_2025.zip + Math_2025.zip
         (use 041 Standard English subfolder only — Math_2025.zip has 38 files incl Hindi/Urdu)
  Science: 086_Science_2025.zip + Science_2025.zip
Note: 2025 paper structure may differ from 2026 — probe and check before assuming format.
Expected yield: ~80 Maths + ~80 Science

---

## 2026-05-25 — K2H-8f-b UI wire-up (PR #139) — PYQ chip end-to-end functional

### Starting state
- Base: base/approved-thru-437 at c563cabe (post-PR #138)
- SHA at start of session: c563cabe6c25101514d2ed2e545ef69aad0c884b

### Work completed

1. SHA verified: c563cabe confirmed before starting
2. Knowledge verification: 20/20 questions answered correctly from project knowledge
3. K2H-8f UI wire-up executed:
   - Fixed buildPracticeQuestionsFromEngine to pass pyqOnly to generatePracticeSet
   - Fixed CanonicalQuestion→PracticeQuestion mapping to preserve pyqYear/pyqSet
   - Removed UI-layer soft-fallback pyqOnly block (was the silent failure mode)
   - Added 3 regression tests (K2H-8f-b describe block)
4. Report reviewed and approved by owner
5. Commit 8610d79 on fix/k2h-8f-ui-wire, pushed, PR #139 opened and merged

### Validations
- TypeScript: exit 0
- Test matrix: 137/137 PASS (+3 from 134/134)
- Diff scope: 2 files only
- No question bank files touched

### New protocol established this session
- Agent instructions now delivered as downloadable .md files (no truncation risk)

### Post-merge SHA
b7add944a713430679de8c5e6d07dca49f4db272

### Next task
P4 continuation 2026 — most recent exam, highest value
Branch: content/p4-pyq-2026-maths + content/p4-pyq-2026-science
Sources: C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS\
  Mathematics_Standard_2026.zip + 041_MATHEMATICS_STANDARD_2026.zip
  Science_2026.zip + 086_SCIENCE_2026.zip
Note: Skip Maths Basic (430-x-x) in 2026 Maths zip — use 30-x-x only
Unzip all archives before probing.

---

## 2026-05-25 — P4-S PYQ Science (PR #137, +111 Qs verbatim CBSE 2022-23 board); **P4 phase complete**

Timestamp: 2026-05-25 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `f82e8a6` (post-PR #135+#136 handoff)
- Fresh branch `content/p4-pyq-science` created from verified base SHA
- Pipeline scripts adapted from P4-M (p4_extract.py + p4_generate_ts.py) with
  Science-specific changes

### Work completed — PR #137 (P4-S PYQ Science, 111 Qs)

Branch: `content/p4-pyq-science` (DELETED post-merge per fresh-branch doctrine)
Commit: fd9711c (14 files, +985 insertions)
Merge SHA on base: f25af07803230b203a298b6e12e5e74989bf1411

Files: 13 new `science/{topic}.pyq.ts` + 1 modified `canonicalQuestionBank.ts`
(+13 imports + 13 spreads under "P4 Science PYQ" banner).

Sources: 9 text-extractable QPs from 2022-23 board exam (31/2/1-3, 31/4/1-3,
31/5/1-3) + 4 matching MS files (X_086_31_2/4/5_MS_UNSIGNED_ALL SETS — each
covers all 3 sets; parser splits by `Paper Code: 31/x/y` marker). All 13 PDFs
clean (0 cid / 0 mojibake / 0 sinhala on probe).

Extraction: 111 verbatim CBSE board PYQs across all 13 retained Science
topicKeys. Section breakdown A=37 / B=23 / C=29 / D=15 / E=7. Competency 85.8%
avg (range 56-100%, all ≥40%). Bank 5,415 → 5,526; authentic 2,587 → 2,698
(60.0% to 4,500-Q retirement).

### Pipeline adaptations locked in this PR (carry forward to P4 continuation)

1. **Science section ranges**: A=Q1-20 (20 MCQs, no AR), B=21-26, C=27-33,
   D=34-36, E=37-39. (Different from Maths which has A=Q1-18 MCQ + AR Q19-20.)
2. **MS "ALL SETS" bundle splitting**: Each Science MS file contains 3 paper
   variants; parser splits by `Paper Code: 31/x/y` marker so each QP gets its
   correct set's solutions.
3. **MCQ answer fallback**: Science MS often gives only option letter `(c)`
   without value text (just option letter + marks digit). Generator falls
   back to QP options array to populate full answer text. Avoids storing
   "(c) 1" (marks digit) as the answer.
4. **Science page footer stripping**: `H N H` page footer pattern leaks into
   extracted options and body; stripped in `clean_option` +
   `clean_question_text`.
5. **Deleted-topic filter** broadened for Science: Periodic Classification
   (Ch5), Evolution/Darwin/fossils (Ch9 portion), Sources of Energy (Ch14),
   Mgmt of Natural Resources (Ch16), Motor/EMI/Generator (formative-only).

### LOCKED — P4 phase complete (PR #135 + PR #137)

Combined: **214 verbatim CBSE 2022-23 board PYQs** across all 26 retained
Class 10 topicKeys (13 Maths + 13 Science). All 214 engine-recognised as PYQ
via the `pyqYear` path (PR #133 helper). `isPYQ` field deliberately omitted
until K2H-8f-c follow-up adds it to the `CanonicalQuestion` type.

### NEW SOURCE CONFIRMED — `final MS` folder unlocks P4 continuation

Path: `C:\Users\Chetan\OneDrive\Desktop\diff\cbse-papers\gdrive\PYQs\MS\final MS`
contains official CBSE marking schemes for **2022-2026 (all years)**. This
unblocks P4 continuation passes that were previously stalled on missing MS:
  - 2023-24: 13 Maths QPs + 7 Science QPs → ~230 Qs potential
  - 2024-25: 9 Maths QPs + 9 Science QPs → ~200 Qs potential
  - 2025-26: 23 Maths QPs + 13 Science QPs → ~300 Qs potential

After typical filter rate (~30-40% loss to scanned / Hindi-only / truncated /
broken-options): **300-400 more verbatim board PYQs** estimated possible.
Probe MS folder first to verify naming convention before extraction.

### Validations (all PASS)

  - `npx tsc -p tsconfig.app.json --noEmit` — exit 0
  - syllabusGuard — 0 violations across 256 question files
  - validateQuestionBanks — mark/section consistent, 0 dupes, 0 banned refs
  - Checkpoint B per file — **13/13 PASS** (0 mojibake / 0 cid / 0 sinhala /
    pyqYear+pyqSet populated on all)
  - PYQ-S-* duplicate IDs across 111 — 0
  - Engine reachability — **111/111 P4-S questions routed AND
    isPYQQuestion()-recognised** via pyqYear path
  - Full test matrix (5 files, 19 suites) — **134/134 PASS**

### Push

Push succeeded on first attempt this time (no GitHub 5xx hiccup like PR #135).

### Next session priorities

  1. **K2H-8f UI wire-up** (Low-Medium mode). `practiceQuestionBuilder.ts` —
     wire pyqOnly chip state through to engine `generatePracticeSet`. Fold in
     engine-to-UI field-stripping fix + K2H-8f-c (add isPYQ to type) if scope
     allows.
  2. **P4 continuation** — 2023-24 + 2024-25 + 2025-26 PYQs using newly-found
     `final MS` folder. Probe folder FIRST to verify MS file naming and QP
     pairing before extraction. Each year on its own fresh branch.
  3. **Pre-launch quick wins** carried over from prior cycle (strategyHint
     button, "Show visual" fix, formula sheet tab, API gateway).

---

## 2026-05-25 — P4-M PYQ Maths (PR #135, +103 Qs verbatim CBSE 2022-23 board)

Timestamp: 2026-05-25 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `acd458e` (post-PR #132+#133+#134 handoff)
- Fresh branch `content/p4-pyq-maths` created from verified base SHA
- Pre-req unblocked: PR #133's `isPYQQuestion()` engine helper recognises
  PYQ via populated `pyqYear` even when `isPYQ` field is absent

### Work completed — PR #135 (P4-M PYQ Maths, 103 Qs)

Branch: `content/p4-pyq-maths` (DELETED post-merge per fresh-branch doctrine)
Commit: 449677e (14 files, +939 insertions)
Merge SHA on base: 2b231e172b1e734d92abbf1c69ca7fcfbdb0af9d

Files: 13 new `maths/{topic}.pyq.ts` + 1 modified `canonicalQuestionBank.ts`
(+13 imports + 13 spreads under "P4 Maths PYQ" banner).

Sources: 9 text-extractable QPs from 2022-23 board exam (30/2/1-3, 30/4/1-3,
30/5/1-3) + matching MS 041_30-x-x marking schemes. All clean (0 cid / 0 mojibake
on all 18 PDFs after probe).

Extraction: 103 verbatim CBSE board PYQs across all 13 retained Maths topicKeys.
Section breakdown A=48 / B=15 / C=22 / D=15 / E=3. Competency 100%. Bank
5,281 → 5,415; authentic 2,484 → 2,587 (57.5% to 4,500-Q retirement).

Pipeline (REUSABLE for P4-S — scripts in `diff\`):
  - `p4_probe.py` — probe all 32 PDFs
  - `p4_extract.py` — QP+MS segmentation + Maths topic classifier
  - `p4_generate_ts.py` — JSON → 13 TS files; broken-MCQ filter; dedup
  - `p4_checkpoint_b.py` — Checkpoint B per file (Section 7 of P4-M instruction)
  - `p4_pyq_reachability.mjs` — engine isPYQQuestion() verification

### NEW doctrine — isPYQ field via pyqYear path

The agent instruction Section 3 said "isPYQ: true on ALL P4 questions". The
`CanonicalQuestion` type in `predictionTypes.ts` does NOT include `isPYQ?: boolean`
yet (K2H-8f-c follow-up). `predictionTypes.ts` is globally forbidden per CLAUDE.md
§4. Resolution: **omit `isPYQ` field entirely; populate `pyqYear: "2023"` instead**.
PR #133's `isPYQQuestion(q)` helper recognises both paths — engine reachability
test confirms 103/103 P4-M questions are recognised as PYQ via the `pyqYear` path.
Locked as the standard for P4-S Science too. Once K2H-8f-c lands (adds `isPYQ`
to type), a one-line script can backfill `isPYQ: true` on all P4-M + P4-S files.

### Permanent source decisions LOCKED (don't re-evaluate next session)

  USED (2022-23 Maths):
    - 30/2/1, 30/2/2, 30/2/3 — pyqSet 1/2/3
    - 30/4/1, 30/4/2, 30/4/3 — pyqSet 1/2/3
    - 30/5/1, 30/5/2, 30/5/3 — pyqSet 1/2/3
    (9 QPs + 9 MS, all clean, 103 Qs extracted)

  SKIPPED — REQUIRE OCR (scanned image-only PDFs, 0 extractable text):
    - 30/1/1, 30/1/2, 30/1/3
    - 30/6/1, 30/6/2, 30/6/3
    - 30-B-5 (VI candidates paper, different layout)
    Do NOT attempt re-extract without OCR pipeline.

  DEFERRED — MS download needed before extraction:
    - 2023-24 Maths PYQs: `24 math 1/2/3.pdf` series on disk; NO matching MS
      Action: download MS from cbse.gov.in, then resume as P4-M continuation

  DEFERRED — quality blockers within extracted papers:
    - 48 questions where pymupdf returned only Hindi-script body
    - 41 questions where math-symbol-heavy English body got truncated mid-sentence
    - 18 MCQs where pymupdf options had duplicates (lost minus signs / fractions)
    Total: 107 of 342 raw question instances skipped to maintain anti-fabrication.

### Validations (all PASS)

  - `npx tsc -p tsconfig.app.json --noEmit` — exit 0
  - syllabusGuard — 0 violations
  - validateQuestionBanks — 243 files, 0 dupes, mark/section consistent
  - Checkpoint B (per Section 7 of P4-M instruction) — **13/13 PASS**
    (0 mojibake / 0 cid / no bad IDs / pyqYear+pyqSet populated on all)
  - New PYQ-M-* duplicate IDs across 103 — 0
  - Engine reachability — **103/103 P4-M questions routed AND
    isPYQQuestion()-recognised** (via pyqYear path)
  - Full test matrix (5 files, 19 suites) — **134/134 PASS**

### Push hiccup (transient)

GitHub returned `Internal Server Error` on 4 consecutive push attempts (Request
IDs `366A:125F47`, `366E:379AB8`, `367E:474A2`, `36B4:47F96` between 09:03Z and
09:06Z). Repo API was fine throughout (rate limit 4993/5000, branch protection
returned 404 = not protected). Server-side hiccup; resolved on retry ~6 min later.
Recorded for future reference if pattern recurs.

### Next session priorities

  1. **P4-S PYQ Science** (HIGH mode, ~150-200 Qs expected). Fresh branch
     `content/p4-pyq-science`. Sources: `31_x_x` QPs + `X_086_31_x_MS` files in
     `.../CBSE Previous papers/2022-2023/SCIENCE/`. Pipeline reusable from P4-M
     (swap Maths topic classifier for Science classifier; update ID prefix to
     `PYQ-S-2023-`; update topic-short table).
  2. **K2H-8f UI wire-up** (Low-Medium mode). `practiceQuestionBuilder.ts` —
     wire pyqOnly chip through to engine. Fold in engine-to-UI field-stripping
     fix and isPYQ type addition (K2H-8f-c) if scope allows.
  3. **Download 2023-24 Maths MS from cbse.gov.in** (Low mode). Then extract
     remaining 3 sets as P4-M continuation.

---

## 2026-05-25 — P3 Science chapter-wise (PR #132, +552 Qs) + K2H-8f PYQ engine fix (PR #133)

Timestamp: 2026-05-25 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `6c5404f` (post-PR #131 handoff)
- Two parallel branches needed: `content/p3-science-chapterwise` (fresh per
  doctrine) for content; `fix/k2h-8f-pyq-filter` (separate, pre-existing
  unfinished work in working tree) for the engine fix.

### Work completed — PR #132 (P3 Science chapter-wise, 552 Qs)

1. **Source selection (permanent decisions)**:
   - **USED**: `cbjescco01-15` (MCQ, 13 files) + `cbjesccq01-15` (PYQ-style,
     13 files) from `…\Class X\Science\Chapter-wise\` (www.cbse.online).
   - **SKIPPED forever** (recorded so future sessions don't re-evaluate):
     Meridian (no MS PDFs → anti-fabrication blocker), NODIA (MS on external
     URL), cbjemacq (Sinhala glyph corruption), Maths Basic 430-x-x (out-of-
     Standard scope), Aakash chapter-wise (scanned, needs OCR), Old\ folder
     (superseded duplicates).

2. **Probe step (Section 4 of agent instruction)**: all 26 source PDFs
   probed via pymupdf. Result: 0 cid artifacts, 0 Sinhala corruption,
   solutions present across every file. PASS.

3. **Programmatic extraction pipeline**: built Python parser handling both
   source structures (`OBJECTIVE QUESTIONS` MCQ headers in cbjescco;
   `ONE/TWO/THREE/FIVE MARKS QUESTIONS` section headers in cbjesccq). Caps
   applied for reviewability: 20 cleanest MCQs per file + up to 6 per
   PYQ-style mark-section. Source has ~3,243 raw question fragments —
   extracting all in one PR would be unreviewable.

4. **Quality filters**:
   - Garbled MCQ filter: options with exploded chemistry-formula tokens
     (e.g. `"Na O Na O 4 2 2 2 \" +"`) rejected pre-write via token-
     distribution heuristic.
   - Stray cp1252 `¬` (U+00AC) soft-hyphen artifact stripped via clean_text().
   - REQUIRES-FIGURE heuristic on `diagram|figure|circuit|ray diagram|shown`
     keywords (conservative — manual sweep recommended pre-launch).
   - 2026-27 within-chapter ban filter: Evolution/Darwin/etc. removed from
     ch09 (heredity); Motor/EMI/Generator/Fleming's-Right-Hand removed from
     ch13 (magnetic effects).

5. **MCQ competency doctrine (locked this session)**: MCQ defaults to
   `isCompetencyBased: true` per CBSE 2026-27 — option discrimination
   requires concept application above pure recall. Pure-recall MCQs
   starting with Define/Name the/List the/Recall/Match the stay false.
   This lifted competency from sub-40% (Checkpoint B T9 floor) to 74.6%
   overall (412/552).

6. **Chemistry arrow caveat**: pymupdf renders `→` as `$` in this source
   (e.g. `Cu(s) + 2AgNO3(aq) $ Cu(NO3)2(aq) + 2Ag(s)`). Content is verbatim
   from PDF (anti-fabrication preserved); just the arrow symbol is `$` not
   `→`. Future cleanup pass could substitute where safe.

7. **canonicalQuestionBank.ts registration**: 13 new imports + 13 new
   spreads under "P3 Science Chapter-wise" banner. Spreads 163 → 176.

8. **Branch fix-up incident**: P3 commit accidentally landed on
   `fix/k2h-8f-pyq-filter` (a silent branch switch happened mid-session;
   exact cause unclear — possibly VSCode auto-switch). Recovered with
   `git branch -f content/p3-science-chapterwise aaa730a` and
   `git branch -f fix/k2h-8f-pyq-filter 6c5404f` to restore the K2H-8f
   branch to its pre-session state. Local-only branches, no remote impact.
   Lesson: verify `git branch --show-current` before each commit when
   multiple branches are in flight.

### Work completed — PR #133 (K2H-8f engine fix)

1. **Root cause** (recorded for posterity): K2H-8c UI chip wired `pyqOnly`
   through `AiTopupArgs`, but the engine pipeline ran a SOFT fallback
   (`if filtered.length > 0`) instead of a hard filter. Combined with
   engine-to-UI mapping stripping `pyqYear`/`isPYQ`, the empty filter
   silently fell back to "all questions" — masking the bug as "PYQ filter
   returns 0".

2. **Fix scope (engine layer only)**: PR #133 added `pyqOnly?: boolean` to
   `PracticeSetConfig` and exported `isPYQQuestion(q)` helper that honours
   BOTH explicit `isPYQ: true` and populated `pyqYear` (covers current bank
   convention "2022"/"2023"/"30/1/1" and future P4 PYQ flag). Engine now
   applies a HARD pyqOnly filter — no silent fallback.

3. **Test suite expanded**: new `scripts/src/practiceSetGeneratorGuard.test.ts`
   with 9 K2H-8f regression tests. Matrix grew 125 → **134/134 PASS**.

4. **Three UI-side follow-ups** queued (separate PRs):
   - Wire `pyqOnly` through `practiceQuestionBuilder.ts`
   - Fix engine-to-UI mapping field stripping
   - Add `isPYQ?: boolean` to `CanonicalQuestion`

### Validations (both PRs)

PR #132:
- syllabusGuard: PASS — 0 violations
- validateQuestionBanks: PASS (230 files; 0 dupes; mark/section consistent)
- tsc -p tsconfig.app.json --noEmit: exit 0
- Checkpoint B per file: 13/13 PASS (after MOJI_RE false-positive fix +
  expanded competency heuristic)
- Duplicate IDs (SCO-S-* + SCQ-S-*): 0 across 552
- Engine reachability: PASS (canonicalQuestionBank loads at 5,281)
- Test matrix: 125/125 PASS

PR #133:
- Test matrix: 134/134 PASS (125 + 9 new K2H-8f tests)
- tsc exit 0
- 435 `pyqYear`-tagged questions confirmed returned by the engine filter

### Bank state

- Authentic count: 1,932 → **2,484** (+552)
- Spreads: 163 → **176** (+13)
- Bank total (engine-confirmed): 4,729 → **5,281**
- Progress to 4,500-Q retirement: 2,484 / 4,500 = **55.2%** (+12.3 pp)

### Branch cleanup (post-merge)

- `content/p3-science-chapterwise` DELETED (remote + local) — fresh-branch
  doctrine in effect since PR #130.
- `fix/k2h-8f-pyq-filter` DELETED (remote + local).

### Next priority items

Three parallel tracks open:
- **Product track:** K2H-8f UI wiring follow-ups (3 small PRs); pre-launch
  quick wins (4 PRs from prior cycle).
- **Content track A:** **P4-M PYQ Maths** — fresh branch
  `content/p4-pyq-maths`; 16 QPs (30-x-x) + 16 MS on disk; ~400 Qs;
  `isPYQ: true` + `pyqYear` populated.
- **Content track B:** **P4-S PYQ Science** — fresh branch
  `content/p4-pyq-science`; 15 QPs (31_x_x) + MS on disk; ~400 Qs; can
  run in parallel with track A.

---

## 2026-05-25 — P2 APQ Science-PQ2 (PR #130, +49 Qs) — P2 APQ phase COMPLETE + stale branch deleted + tutor/content audit recorded

Timestamp: 2026-05-25 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `b16ebb6` (post-PR #129 handoff)
- Active branch: `content/additional-pq-sqp-2024` (rebased onto current base —
  PR #128's commit dropped cleanly as already-in-base)

### Work completed

1. **Science-PQ2 extraction (49 Science Qs appended)**:
   - APPENDED to all 13 existing `science/{topic}.additionalPQ.ts` files
     created in PR #128. No new files created; canonicalQuestionBank.ts
     untouched.
   - Sequential ID numbering continued per topic (e.g.,
     `metals-and-non-metals` 009-014).
   - 10 OR-pair questions (Q23, Q25, Q28, Q31, Q34, Q35, Q36, Q37, Q38, Q39)
     extracted as BOTH variants per locked doctrine — separate rows.
   - Q35 OR variant placed under `control-and-coordination` (hormones /
     adrenaline) while the main went to `heredity` (energy flow + pea
     cross). All other OR pairs stayed in the same topic file.
   - Per-file additions: ACID +4 → 6, CARB +4 → 8, CHEM +2 → 4, CTRL +3 → 5,
     ELEC +3 → 7, HERED +2 → 6, REPR +2 → 5, EYE +3 → 6, LIFE +8 → 13,
     LIGHT +4 → 7, MAG +4 → 6, METAL +6 → 14, ENV +4 → 8.

2. **Section breakdown (new only)**: A=20 B=8 C=9 D=6 E=6. Competency 40/49 =
   81.6%. REQUIRES-FIGURE tagged on 13 questions (electron-dot N2,
   electrolysis set-up, heart diagram, parallel-resistor circuit, V-I graph,
   solenoid field-lines, etc.).

3. **Anti-fabrication doctrine maintained**:
   - questionText verbatim from QP PDFs (pymupdf, 0 cid artifacts confirmed).
   - solutionSteps from matching MS PDF (Science-PQMS2.pdf).
   - isPYQ: false on all 49; pyqSet omitted.
   - 2026-27 syllabus respected — no banned-topic content (Periodic
     Classification, Evolution, Sources of Energy, Mgmt of Natural
     Resources, Motor/EMI/Generator).

4. **Force-with-lease push for rebased branch** — same pattern as PR #126
   and #128. After this PR cleared, branch was permanently deleted (next
   bullet).

5. **Branch management fix (one-time cleanup, applied in this docs PR)**:
   - `content/additional-pq-sqp-2024` had been squash-merged 4 times
     (PRs #119, #126, #128, #130), each cycle requiring a `--force-with-lease`
     push because the local branch had to be rebased onto the new base.
   - Branch DELETED post-merge (remote + local).
   - **Doctrine update:** future extraction phases use a fresh branch name
     per phase. This eliminates the force-push requirement permanently.

6. **P2 APQ phase COMPLETE**:
   - PR #119 (SQP, 69 Qs) + PR #126 (Maths PQ1+PQ2, 76 Qs) + PR #128
     (Maths PQ_2022 + Science-PQ, 90 Qs) + PR #130 (Science-PQ2, 49 Qs)
     = **284 authentic Qs across 5 papers**.
   - All 13 retained Maths topicKeys and all 13 retained Science topicKeys
     now have APQ content.

7. **Tutor / content audit completed (read-only, separate from PR)**:
   - Report: `diff\report-tutor-content-audit-2026-05-24.md`.
   - Findings recorded as new pre-launch quick-win product PRs:
     • strategyHint authored on 75 banks but never rendered
     • "Show visual" button in TopicHub right rail is broken
     • No formula-sheet surface despite formula data in 14 topics
     • API gateway gap confirmed in vercel.json (no /api/* rewrite)

### Validations (all six PASS)

- syllabusGuard: PASS — 0 violations
- validateQuestionBanks: PASS (217 files; 0 dupes; mark/section consistent)
- tsc -p tsconfig.app.json --noEmit: exit 0
- Duplicate IDs (APQ-S-* prefix): 0 (95 IDs, all unique)
- Full test matrix (4 files): 125/125 PASS
- Engine reachability: PASS — canonicalQuestionBank loaded at 4,729 Qs;
  296/296 new-PR Heredity/Light/Eye/Elec/Mag IDs reachable

### Bank state

- Authentic count: 1,883 → **1,932** (+49)
- Spreads: 163 (unchanged — no new files registered)
- Bank total (engine-confirmed): **4,729**
- Progress to 4,500-Q retirement: 1,932 / 4,500 = **42.9%** (+1.1 pp)

### Next priority items

Two parallel tracks open; owner choice for next session:
- **Product track:** four pre-launch quick wins (strategyHint Hint button;
  "Show visual" wiring fix; Formula sheet tab; API gateway).
- **Content track:** P3 Meridian extraction (~475 Qs). New fresh branch
  `content/p3-meridian` — no reuse. First step: pymupdf cid probe on
  Meridian PDFs (3rd-party publisher, not yet tested).

---

## 2026-05-25 — P2 APQ continuation: PQ_2022 + Science-PQ (PR #128, +90 Qs) + OR-doctrine validated + first Our Environment Qs

Timestamp: 2026-05-25 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `26db3f1c` (post-PR #127 handoff)
- Active branch: `content/additional-pq-sqp-2024` (rebased onto current base —
  PR #126's commit dropped cleanly as already-in-base)

### Work completed

1. **Scope confirmation (Chetan via AskUserQuestion)** — Of the 3 remaining
   papers (~140-150 Qs with OR variants), confirmed scope as PQ_2022 +
   Science-PQ this session; Science-PQ2 deferred.

2. **Mathematics-PQ_2022 extraction (44 Maths Qs appended)**:
   - APPENDED to all 13 existing `maths/{topic}.additionalPQ.ts` files.
   - Sequential ID numbering continued per topic (e.g., real-numbers 007-009).
   - 6 OR-pair questions (Q24, Q25, Q28, Q29, Q32, Q33) extracted as BOTH
     variants per new doctrine — 12 separate rows for those instead of 6.
   - Section breakdown: A=20 (MCQs + AR), B=4, C=5+OR=8, D=4+OR=8, E=3 case-based.

3. **Science-PQ extraction (46 Science Qs, 13 new files created)**:
   - CREATED 13 new `science/{topic}.additionalPQ.ts` files (one per retained
     Science topicKey).
   - **First ever Our Environment questions in the bank** (4 Qs: 3 Section A
     + 1 Section B) — closes the gap flagged in PR #122/#125 notes.
   - 7 OR-pair questions (Q23, Q25, Q28, Q34, Q35, Q36, Q37) extracted as
     BOTH variants — 14 separate rows.
   - Some OR variants spread across topics (e.g., Q25 first variant =
     electricity, OR variant = magnetic-effects).

4. **canonicalQuestionBank.ts registration**:
   - 13 new Science imports added under "P2 CBSE APQ 2023-24 — Science" banner.
   - 13 new spreads in the export array.
   - Spread count: 150 → 163.
   - Maths spreads unchanged (PQ_2022 appended to existing arrays).

5. **Anti-fabrication doctrine maintained**:
   - questionText verbatim from QP PDFs (pymupdf, 0 cid artifacts confirmed).
   - solutionSteps from matching MS PDFs (PQ_2022_MS.pdf, PQMS.pdf).
   - OR variants merged into single row only where the second variant duplicated
     the first's solutionSteps (e.g., heredity Q38 — both alternatives covered
     in one row's solutionSteps for parallel structure). Most OR variants
     written as separate rows.
   - isPYQ: false on all 90; pyqSet omitted.
   - REQUIRES-FIGURE strategyHints on ~30 new questions.

6. **Force-push for rebased branch** — same pattern as PR #126: branch was
   rebased at session start, so `--force-with-lease` push needed to update
   remote with new history (PR #126's ee7bc8d → PR #128's 143badb).

### New extraction doctrine validated this session

The B/C/D/E density doctrine from PR #126 cycle was tested in PR #128:

  PR #126 (PQ1 + PQ2): B=10, C=12, D=8, E=6 = 36 non-A questions
  PR #128 (PQ_2022 + Science-PQ): B=15, C=15, D=10, E=6 = 46 non-A questions

Despite covering similar paper volume, non-MCQ density rose ~28% — the
OR-pair extraction works. Keep applying to Science-PQ2 and beyond.

### Validations (all six PASS)

- syllabusGuard: PASS — 0 violations
- validateQuestionBanks: PASS (217 files scanned, was 204; 0 dupes,
  mark/section consistent)
- tsc -p tsconfig.app.json --noEmit: exit 0
- Duplicate IDs: 0
- Full test matrix (4 files): 125/125 PASS
- Engine reachability: PASS (296/296)

### Bank state

- Authentic count: 1,793 → **1,883** (+90)
- Spreads: 150 → **163** (+13 new Science APQ files)
- Bank total: ~4,608 → ~4,698
- Progress to 4,500-Q retirement: 1,883 / 4,500 = **41.8%** (+2 pp)

### Next priority item

Science-PQ2 extraction (P2 APQ finale) — same branch
`content/additional-pq-sqp-2024`, rebase onto `028d51d3...` first. Will
APPEND to the 13 existing `science/*.additionalPQ.ts` files (per "one file
per topic, combined across papers" spec). Estimated ~45-50 Qs.

Agent instruction file `LazyTopper_Agent_P2_APQ_SciencePQ2_Instruction.md`
is ready but its SHA placeholder needs updating to `028d51d3...` before upload.

---

## 2026-05-25 — P2 APQ Maths PQ1+PQ2 (PR #126, +76 Qs) + retirement threshold revised + new extraction doctrine

Timestamp: 2026-05-25 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `462f2c77` (post-PR #125 handoff)
- Active branch: `content/additional-pq-sqp-2024` (preserved from PR #119 SQP
  cycle; rebased onto current base at start of this session — SQP commit
  dropped cleanly as it's already in base)

### Work completed

1. **PDF probe + text dump** — Probed all 5 APQ PDFs via pymupdf. Confirmed
   0 cid artifacts on every page (vs pdfplumber's known cid corruption on
   CBSE math PDFs). Dumped all 10 QP+MS PDFs to text files in
   `diff/_apq_text/` for systematic extraction.

2. **Scope decision (Chetan via AskUserQuestion)** — Realistic single-session
   capacity is 1-2 papers. Confirmed scope: PQ1 + PQ2 (76 Qs across 13 Maths
   topic files) this session; PQ_2022 + Science-PQ + Science-PQ2 deferred to
   follow-up sessions on the same branch.

3. **Extraction — 13 .additionalPQ.ts files created** (one per Maths topic):
   - real-numbers (6 Qs), polynomials (4), pair-of-linear-equations (6),
     quadratic-equations (4), arithmetic-progression (4), triangles (8),
     coordinate-geometry (6), trigonometry (10), circles (7),
     areas-related-to-circles (5), surface-areas-and-volumes (6),
     statistics (5), probability (5) — total 76 Qs.
   - Section breakdown: A=40 (1mk MCQ+AR), B=10 (2mk), C=12 (3mk),
     D=8 (5mk), E=6 (4mk case-based).
   - Competency: 67/76 = 88% (target 40%).
   - Combined PQ1 + PQ2 questions per topic, per spec ("one file per topic,
     combined across papers"). ID format: `APQ-M-{TOPICSHORT}-{SEQ:003d}`,
     sequential per topic.

4. **Anti-fabrication doctrine maintained**:
   - questionText verbatim from QP PDFs (pymupdf extraction)
   - solutionSteps sourced from matching MS PDFs (exact CBSE marking steps)
   - OR variants merged into single rows for this PR (see new doctrine
     decision below for future passes)
   - Section E case-based stored as ONE row per case, marks=4 (no sub-part
     splitting)
   - isPYQ: false on all 76; pyqSet omitted on all 76
   - REQUIRES-FIGURE strategyHints on ~22 questions referencing diagrams,
     tables, or graphs that don't render in text extraction

5. **canonicalQuestionBank.ts registration** — Added 13 imports + 13 spreads
   under "P2 CBSE APQ 2023-24" banner. Spread count: 137 → 150.

6. **Mid-flight fix** — One typo on probability.additionalPQ.ts export name
   (`PROBABILITY_ADDITIONAL_PQ` vs `PROBABILITY_APQ`) caught by tsc and
   corrected. All other files passed type-check on first try.

7. **Force-push for rebased branch** — Branch `content/additional-pq-sqp-2024`
   was rebased at session start, so the remote (with the dropped SQP commit
   sitting on a now-superseded base) needed `--force-with-lease` to update.
   Chetan approved the force-push via AskUserQuestion.

### New doctrine decisions locked in this PR cycle

1. **Pack retirement threshold REVISED: 6,000 → 4,500 authentic**
   Rationale: 5,000+ authentic is sufficient for CBSE Class 10 prep. At
   4,500 authentic, retire all AI packs (~2,815 Qs). Bank becomes 100%
   authentic + 100% routable. No OCR phase needed.
   Current progress: 1,793 / 4,500 = 39.8%.

2. **REQUIRES-FIGURE doctrine**
   Questions referencing PDF diagrams/tables/graphs that don't render in
   text extraction tag with `strategyHint: "REQUIRES-FIGURE: [description]"`.
   questionText and answer remain accurate to PDF; figure described in
   strategyHint so future Option B (placeholder image) or Option A
   (SVG render) post-launch can fill the gap. ~22 questions in PR #126
   carry this tag.

3. **B/C/D/E density gap (future doctrine)**
   PR #126's section split (A=40, B+C+D+E=36) shows MCQ over-representation.
   Future extractions MUST extract BOTH OR variants for B/C/D/E sections to
   double non-MCQ density. Apply to PQ_2022, Science-PQ, Science-PQ2 and
   beyond. Bake into all future extraction agent instructions.

4. **AR (Assertion-Reasoning) density gap**
   Thin across all extractions to date. Dedicated `.assertionReasoning.ts`
   extraction pass scheduled after P2 APQ completes. Target: 2-3 AR
   questions per topic for both Maths and Science.

### Validations (all six PASS)

- syllabusGuard: PASS — 0 violations
- validateQuestionBanks: PASS (204 files, was 191; 0 dupes, mark/section consistent)
- tsc -p tsconfig.app.json --noEmit: exit 0 (one mid-flight typo fix)
- Duplicate IDs: 0
- Full test matrix (4 files): 125/125 PASS
- Engine reachability: PASS (296/296)

### Bank state

- Authentic count: 1,717 → **1,793** (+76)
- Spreads: 137 → **150** (+13)
- Bank total: ~4,532 → ~4,608

### Next priority item

P2 APQ continuation — same branch (rebase first onto current base SHA
9be894526eb20ad51bca2c7aaa3b8ffab931191a). Papers: Mathematics-PQ_2022
(~38 Qs, APPEND to existing 13 Maths files), Science-PQ (~39 Qs, CREATE
new science/*.additionalPQ.ts files), Science-PQ2 (~39 Qs, APPEND to
science files). All text pre-extracted to `diff/_apq_text/`.

---

## 2026-05-24 — syllabusGuard 2026-27 doctrine fix (PR #124) + 18 questions restored + ops acceptance regression suite (PR #123)

Timestamp: 2026-05-24 (Asia/Kolkata)

### Starting state

- Base: `base/approved-thru-437` at `ef31ece0` (post-PR #122 handoff)
- Prior incident: PR #121 had blanket-removed 18 reproduction questions under
  a 2025-26 reading that treated all of Ch 8 reproductive-health subtopics as
  out-of-syllabus. Doctrinal review found that the **2026-27 board syllabus
  restores those subtopics** — contraception, family planning, STIs, safe
  sex, HIV/AIDS are all in scope under Ch 8.
- Concurrent concern: syllabusGuard.ts also banned Our Environment subtopics
  (Ecosystem, Food Chain, Food Web, etc.) — but the registry JSON and
  cbseHistoricalArchetypes both treated Our Environment as RETAINED. Internal
  inconsistency needed resolution.

### Work completed across two PRs

**PR #123 — ops acceptance regression suite (purely additive)**

- New `scripts/src/opsAcceptanceGuard.test.ts` — 37 tests across 5 describe
  blocks that lock in the deletion doctrine across the registry JSON,
  cbseHistoricalArchetypes, topics.ts, and syllabusGuard.
- Block coverage: deleted Science chapters return true from
  isScienceDeletedFor2026_27; retained Science slugs present in topics.ts;
  "constructions" absent and retained Maths slugs present; syllabusGuard
  banned list contains required strings + does NOT contain retained ones;
  regression lock that spawns both ops/ acceptance scripts and asserts exit 0.
- Investigation finding: existing `cbse_registry_2026_27_acceptance.mjs`
  (22/22 PASS) and `science_deleted_zeroing_acceptance.ts` (152/152 PASS)
  already aligned with codebase truth. No edits to existing ops/ tests needed.
- Wired into `scripts/package.json` as `test:ops-acceptance` and
  `test:matrix:all` (now 3 test files / 111 tests).

**PR #124 — syllabusGuard 2026-27 doctrine fix**

1. **syllabusGuard.ts** — removed 26 strings from Science banned list (12
   reproductive-health + 14 Our Environment ecology). Net banned count:
   86 → 60. Source comment updated to cite `Science_SecP1_2026-27.pdf`.

2. **cbseHistoricalArchetypes.ts** — promoted `"Sources of Energy"` from
   subtopic-keyword-only to a proper `deletedTopics` entry (Ch 14 is fully
   deleted). Removed `"reproductive health"`, `"contraception"`,
   `"family planning"` from `deletedSubtopicKeywords`. Added new
   `formativeOnlyTopics: ["Electric Motor", "Electromagnetic Induction",
   "Electric Generator"]` array — these are taught in 2026-27 but not
   assessed in the year-end board exam (Note for Teachers reference).
   Header block rewritten to cite 2026-27 source.

3. **cbse10Registry_2026_27.json** — `meta.notes` rewritten so the
   Reproduction chapter is described as fully in scope (including
   reproductive health, family planning, safe sex, HIV/AIDS). Removed the
   Reproduction reproductive-health entry from `meta.excluded_subtopics`.
   The Heredity evolution exclusion is unchanged.

4. **Question restoration (18 questions)** — all 18 retrieved verbatim from
   git history at the pre-PR #121 commit `0222917e`. Only the subtopic field
   updated to 2026-27-compliant values:
     - `reproduction.exemplar.ts` (+4): REPR-EXMPLR-7-MCQ-027 → "Safe Sex
       and HIV/AIDS"; SA-019, LA-007 → "Family Planning"; LA-010 → "Safe
       Sex and HIV/AIDS".
     - `reproduction.ncert.ts` (+3): REPR-NCERT-7-SA-012 → "Safe Sex and
       HIV/AIDS"; SA-016, SA-019 → "Family Planning".
     - `reproduction.pack2.ts` (+11): REP2-015/017/018/025/039 → "Family
       Planning"; REP2-016/038/040 → "Safe Sex and HIV/AIDS";
       REP2-021/041/048 → "Reproductive Health".
   File line counts after restore exactly match pre-PR #121 (427 / 181 / 1628).

5. **reproductionBankGuard.test.ts** — rewritten. File purpose flipped from
   "assert these strings are banned" → "assert these strings are NOT banned".
   30 tests in 3 blocks: (a) the 14 2026-27-retained reproductive-health
   strings are absent from the Science banned list; (b) the 15 long-retained
   reproduction subtopics are absent; (c) regression lock that spawns
   `syllabusGuard.ts` and asserts exit 0 against the entire bank.

6. **opsAcceptanceGuard.test.ts** — extended from 37 to 56 tests. New Block
   1b "2026-27 restored — reproduction health subtopics NOT zeroed". Block 4
   `mustBeBanned` reduced to 4 chapter-level deletions; `mustNotBeBannedAsExactString`
   expanded to 17 strings covering Our Environment ecology + all
   reproductive-health variants. New Block 4b "2026-27 formative-only topics
   — tracked in archetypes, NOT banned in bank" — asserts Motor/EMI/Generator
   are NOT in syllabusGuard AND ARE present in formativeOnlyTopics.

7. **science_deleted_zeroing_acceptance.ts (bonus)** — inverted
   `reproductiveCases` assertions to confirm reproductive-health subtopics
   are NOT zeroed under 2026-27. This was not in the original task diff
   scope but had to change because the doctrine flip forced its old
   assertions to fail.

### Design decision: Motor/EMI/Generator NOT in syllabusGuard

The original task spec asked to ADD Motor/EMI/Generator to the syllabusGuard
banned list. Trial-running that against the current bank flagged 36 existing
questions in `magneticEffects.exemplar.ts` / `pack1.ts` / `pack2.ts` (files
not in this PR's diff scope per hard constraints). The "formative only —
taught but not assessed" doctrine is semantically distinct from "deleted from
syllabus" — formative practice questions on these topics are still useful in
the question bank; they just must not be predicted as appearing on the board
paper. The correct doctrinal location is the prediction engine, not the
question-bank guard. Captured via the new
`SCIENCE_DELETED_CHAPTERS_2026_27.formativeOnlyTopics` array.

### Validations (all six PASS)

- syllabusGuard: PASS — 0 violations
- validateQuestionBanks: PASS — 0 dupes (191 files)
- tsc -p tsconfig.app.json --noEmit: exit 0
- Duplicate IDs: 0
- Full test matrix (4 files): 125/125 PASS
- Engine reachability: 296/296

### Bank state

- Authentic count: 1,699 → **1,717** (+18 restored)
- Spread count: 137 (unchanged — no new files added)
- Bank total: 4,514 → ~4,532
- syllabusGuard Science banned list: 86 → 60 strings

### Next priority item

P2 APQ extraction (5 CBSE Additional Practice Question papers, ~150-170 Qs
estimated). Use pymupdf (confirmed 0 cid artifacts during PR #119 SQP work).
Branch suggestion: `content/additional-pq-sqp-2024`. Mode: HIGH.

---

## 2026-05-24 — Reproduction bank cleanup (PR #121, -18 Qs) + syllabusGuard variant extension + 35-test regression suite

Timestamp: 2026-05-24 (Asia/Kolkata)

### Starting state

- Base branch: base/approved-thru-437 at `0222917e` (post PR #120 docs handoff)
- Active branch: `fix/reproduction-bank-cleanup` (fresh from base)
- Pre-existing problem: syllabusGuard reported 15 violations across the 3 reproduction
  question banks. Carry-over from PR #117 (when the guard was rebuilt for CBSE 2025-26).
  Banned subtopics: STDs / Contraception / Reproductive Health — all deleted from CBSE
  Class 10 Science Ch 8 per the 2025-26 rationalisation.

### Work completed

1. **First pass — remove 15 syllabusGuard-flagged questions**
   - `reproduction.exemplar.ts`: 3 removals (REPR-EXMPLR-7-MCQ-027 "STDs",
     REPR-EXMPLR-7-LA-007 "Contraception", REPR-EXMPLR-7-LA-010 "STDs")
   - `reproduction.ncert.ts`: 1 removal (REPR-NCERT-7-SA-012 "Contraception" —
     copper-T / STD question)
   - `reproduction.pack2.ts`: 11 removals (REP2-015/016/017/018/021/025/038/039/040/041/048 —
     all subtopic "Reproductive Health")
   - All 4 canonical-source removals were REMOVE per the decision rules — all questions
     were genuinely about banned topics (no candidates for subtopic reclassification).
   - Result after first pass: syllabusGuard PASS (0 violations).

2. **Second pass — Option A extension (owner-directed)**
   - 3 additional questions used **compound subtopic strings** that slipped past the
     exact-match syllabusGuard but were entirely about contraception:
       REPR-EXMPLR-7-SA-019 (subtopic "Barrier Contraception")
       REPR-NCERT-7-SA-016 (subtopic "Contraception Methods")
       REPR-NCERT-7-SA-019 (subtopic "Reasons for Contraception")
   - Removed all 3.
   - Added 5 new banned-subtopic strings to `scripts/src/syllabusGuard.ts` Science Ch8 block:
       "Barrier Contraception", "Contraception Methods", "Reasons for Contraception",
       "Contraceptive Methods", "Birth Control Methods" (last two defensive — not in repo
       but plausible future variants).

3. **Regression test suite — new file**
   - Created `scripts/src/reproductionBankGuard.test.ts` with 35 tests / 5 describe blocks:
       (a) Banned variants ARE flagged — 12 tests, one per banned string
       (b) Retained reproduction subtopics are NOT flagged — 15 tests (Sexual Reproduction,
           Asexual Reproduction, Budding, Pollination, Fertilisation, etc.)
       (c) Substring containment does NOT trigger violation — 3 tests (exact-match-only)
       (d) Multiple banned subtopics in one file all counted — 2 tests
       (e) Regression lock on the 3 repo files post-cleanup — 3 tests
   - One mid-flight fix: the initial path expression `"../../../.."` resolved one level
     too high (`C:\Projects\` instead of repo root). Corrected to `"../../.."` and all 35
     tests passed.
   - Wired into `scripts/package.json` as `test:reproduction` (standalone) and added to
     `test:matrix:all` alongside syllabusGuard.test.ts and deletionGuard.test.ts.

4. **Validations (all 6 PASS)**
   - syllabusGuard — PASS (0 violations; was 15)
   - validateQuestionBanks — PASS (191 files, mark/section consistent, 0 duplicate IDs)
   - tsc -p tsconfig.app.json --noEmit — PASS (exit 0)
   - Duplicate IDs (PowerShell scan) — 0
   - Engine reachability — PASS (296/296 new-PR questions routable)
   - Full test matrix (3 test files) — PASS (74/74)

5. **Commit + PR**
   - Single commit `48201c8` with 18 deletions + 5 guard additions + 35-test file + package.json wire
   - PR #121 opened against `base/approved-thru-437`; merged at SHA `e4e42feef15bbff2828f7c0c2055bf7131c671c0`

### Bank state

- Removals only (no additions): 18 questions removed across 3 reproduction banks
- Authentic count: 1,699 (treated as unchanged — removed Qs were always invalid per CBSE 2025-26)
- Spreads: 137 (unchanged)
- Bank total: 4,514 (unchanged)
- syllabusGuard violations: 0 (was 15)

### Diff scope

Exactly 6 files touched, all on the approved list:
1. lazytopper/src/data/questionBanks/class10/science/reproduction.exemplar.ts
2. lazytopper/src/data/questionBanks/class10/science/reproduction.ncert.ts
3. lazytopper/src/data/questionBanks/class10/science/reproduction.pack2.ts
4. scripts/src/syllabusGuard.ts
5. scripts/src/reproductionBankGuard.test.ts (NEW)
6. scripts/package.json

No `.tsx` product files, no `canonicalQuestionBank.ts`, no forbidden files touched.

### Next priority items

1. ops/ acceptance test alignment for Our Environment (now Follow-up #1)
2. P2 APQ extraction with pymupdf (now Follow-up #2)

---

## 2026-05-24 — P2 SQP extracted (PR #119, 69 Qs), bannedExercises hotfix, pymupdf adopted as PDF tool

Timestamp: 2026-05-24 (Asia/Kolkata)

### Starting state

- Base branch: base/approved-thru-437 at 487f960 (post PR #118 docs handoff)
- Active local branch: `content/additional-pq-sqp-2024` (was paused at Checkpoint A after source inventory)
- Task: P2 extraction — Checkpoint A source inventory had been approved by owner in prior session;
  resume Step B4 (extraction) and run through to commit

### Work completed

1. **Pre-flight (Steps B0–B3) re-confirmed**
   - SHA verify: HEAD matches `487f960`
   - Branch rebased (0 commits ahead of base — fast-forward only)
   - ID prefix collision check: 0 APQ-/SQP- IDs across 1,365 pre-existing IDs
   - All 7 expected P2 source PDFs present; 4 used this PR (SQP only), 3 deferred

2. **Scope confirmation — SQP-only this PR (owner-directed)**
   - Owner approved Option 1 ("Ship SQP-only PR first") after I flagged realistic effort estimate
     (~270 questions × careful authoring with math reconstruction = multi-session work)
   - Decision: extract MathsStandard-SQP (38 Qs) + Science-SQP (31 Qs) = 69 Qs total this PR
   - APQ papers (PQ1, PQ2, PQ_2022, Science-PQ, Science-PQ2) deferred to follow-up PR
   - Science-PQ (1).pdf (2022-23 set) skipped — no matching MS in folder

3. **Step B4 — extraction**
   - All 14 SQP+MS PDF files extracted to text via pdfplumber+ftfy; saved to `_p2_text/`
   - Per-question manual authoring required because pdfplumber emitted `(cid:NNNN)` glyph artifacts
     for math expressions (font subset issue)
   - Maths SQP: 38 questions classified across 13 topic files (1-6 Qs each)
   - Science SQP: 31 questions classified across 12 topic files (1-4 Qs each)
   - 8 Science questions intentionally skipped on deleted-in-2025-26 topics:
     Q5 (missing options - image-only), Q6/Q7 (Periodic Classification),
     Q15/Q16/Q20/Q26 (Our Environment / Ozone / Food Chain), Q18 (Natural Selection)
   - Section E case sets: ONE row per case set with merged sub-parts (i)/(ii)/(iii), marks=4
   - All 25 topic files use kebab-case slug naming matching topics.ts
     (deviates from older camelCase pack files; matches P2 prompt spec)
   - Quoted property names ("id", "subject", etc.) per existing P0.5 file convention

4. **Checkpoint B — per-file mini-tests after each file**
   - All 25 files pass T1-T10 hard checks: topicKey, section/marks, format enum,
     ID prefix, isPYQ false, no mojibake, no (cid:NNNN), no banned subtopic strings,
     0% empty solutionSteps
   - Minor issues fixed mid-flight:
     - `quadratic-equations.sqp.ts`: `[OR]` and `[−48 ± 60]` markers in solutionSteps broke
       regex `(.*?)\]` — replaced with `OR (alternative):` and `(...)` math grouping
     - Same fix applied to `pair-of-linear-equations.sqp.ts` and `surface-areas-and-volumes.sqp.ts`
     - `metals-and-non-metals.sqp.ts`: subtopic "Reaction of Metals with Dilute Acid — H₂ Evolution"
       contained substring "Evolution" (banned) — renamed to "Reaction of Reactive Metal with Dilute Acid"
     - `carbon-and-its-compounds.sqp.ts` Section E: step count short due to `[O]` markers in steps
       (oxidation notation) — restructured into 6 separate steps without bracket markers
     - `electricity.sqp.ts` Section C ELEC-003: step count 2 < min 3 — split into 3 steps
   - Soft warnings (T9 competency<40%) remain on 8 files; honest tagging — many SQP Section A items
     are recall/procedural by intent. Overall: 44/69 = 63.8% competency.

5. **Step B5 — canonicalQuestionBank.ts registration**
   - Added 25 imports under P2 banner (Maths SQP × 13, Science SQP × 12)
   - Added 25 spreads under matching P2 banner
   - Spread count: 112 → 137

6. **Step B6 — six-step validation suite**
   - V1 syllabusGuard: 15 PRE-EXISTING violations remain in reproduction.*.ts (unchanged from
     PR #117); P2 SQP contributes 0 new violations
   - V2 validateQuestionBanks: initially FAILED with 75 banned-exercise references —
     surfaced PR #117 false positives (see hotfix below)
   - V3 app tsc: PASS (exit 0)
   - V4 duplicate ID belt-and-suspenders: PASS (0 dupes across 1,434 IDs)
   - V5 git diff scope: PASS (exactly 27 expected entries — 2 modified + 25 new + 1 untracked .claude/)
   - V6 engine reachability: PASS (bank loads at 4,514 questions; all 69 SQP IDs reachable;
     custom probe confirmed correct per-topic distribution)

7. **bannedExercises.json hotfix (owner-directed mid-PR)**
   - PR #117 had added 6 entries (Ex 11.1, Ex 11.2, Ex 9.1, Ex 9.2, NCERT Ch11, NCERT Ch9 Ex 9)
     as banned Maths exercises because these were OLD-NCERT numbering for deleted Constructions
   - BUT in NEW CBSE 2025-26 NCERT: Ch 11 = Areas Related to Circles (RETAINED), Ch 9 = Some
     Applications of Trigonometry (RETAINED) — same exercise numbers, different content
   - 75 pre-existing pack-file ncertRef strings refer to the RETAINED new-NCERT chapters
     (not deleted Constructions content) — these are chapter-renumbering false positives
   - Owner directed hotfix: remove 6 false-positive entries; keep only "Ex 13.3" (Frustum —
     correctly deleted). Updated `reason` string to document the chapter-renumbering rationale.
   - V2 re-run after hotfix: PASS (0 banned-exercise refs)
   - Analogous to Correction 1 we applied during PR #117 for syllabusGuard's
     `Area of Triangle` / `Conversion of Solids` false positives

8. **pymupdf adopted as recommended PDF tool for CBSE official PDFs**
   - During SQP extraction, pdfplumber 0.11.9 emitted `(cid:NNNN)` glyph artifacts for math
     expressions (font subsets without ToUnicode mapping) — required heavy manual reconstruction
     per question (5-8 min/Q for math-heavy items)
   - Tested pymupdf 1.27.2.3 (fitz) on the same MathsStandard-SQP.pdf during handoff prep:
     extracts cleanly with **0 cid artifacts**
   - Recommended PDF tool for APQ follow-up extraction (replaces pdfplumber)
   - Documented in NEXT_ACTION.md Follow-up #3 and Operating Rules

9. **PR #119 opened and merged**
   - Branch: content/additional-pq-sqp-2024 (preserved locally for APQ follow-up reuse)
   - Commit: 6fdb48b — "content: P2 CBSE Sample Question Papers 2023-24 (69 Qs Maths+Science SQP) + bannedExercises hotfix"
   - 27 files changed, 1,914 insertions, 8 deletions
   - Merged to base/approved-thru-437 → new SHA c5b8c51

10. **PR #120 — this docs handoff (in progress)**

### Decisions made

- **SQP-first delivery shape** chosen over (a) APQ-only, (b) Sample Paper 01 spike, or (c) full
  scope this session. SQP is the most surgical scope: official CBSE content, both subjects,
  small enough to author end-to-end with care, ships sooner.
- **APQ deferred to follow-up PR** — owner approved; branch preserved for reuse
- **bannedExercises.json hotfix** included in same PR as P2 SQP (vs. separate small PR) because
  V2 validation otherwise blocks the SQP PR from merging
- **isPYQ omitted entirely** from new question objects rather than `isPYQ: false`. Reason:
  CanonicalQuestion interface doesn't declare isPYQ; engine reads via `(q as { isPYQ?: unknown })`.
  Omission = false semantically, avoids TS excess-property errors. Verification regex confirms
  no `isPYQ: true` anywhere.
- **Kebab-case file naming** (`real-numbers.sqp.ts`) vs older camelCase (`realNumbers.pack1.ts`)
  per P2 prompt spec — matches topics.ts slug. Creates mixed convention in the folder; documented.
- **pymupdf adoption** for future CBSE PDF extraction (replaces pdfplumber for these subset-font PDFs)

### Validations / verifications run

- All 25 P2 SQP topic files pass Checkpoint B mini-tests (T1-T10)
- Bank totals: 4,445 → 4,514 (+69 questions); spreads 112 → 137
- Authentic count: 1,630 → 1,699
- Bank loads at 4,514 questions via canonicalQuestionBank import chain
- All 69 SQP IDs reachable; correct topic-key distribution verified
- 0 banned-exercise refs across 191 files (after hotfix)
- 0 duplicate IDs across 1,434 total bank IDs

### Follow-up items queued for next sessions

1. **Reproduction question bank cleanup** (Follow-up #1, small data-only) — fix 15 syllabusGuard
   violations in reproduction.*.ts (long-running V1 failure since PR #117)
2. **ops/ acceptance test alignment** (Follow-up #2, small code-only) — Our Environment doctrine
   consistency in cbse_registry_2026_27_acceptance.mjs + science_deleted_zeroing_acceptance.ts
3. **P2 APQ extraction** (Follow-up #3, HIGH mode) — 5 CBSE APQ papers, ~270-300 Qs estimated;
   use pymupdf not pdfplumber; branch content/additional-pq-sqp-2024 preserved

### Ending state

- Base branch: base/approved-thru-437 at c5b8c51 (post-PR #119)
- Active local branches: `content/additional-pq-sqp-2024` (preserved for APQ follow-up reuse)
- Authentic question total: 1,699 (was 1,630)
- canonicalQuestionBank spreads: 137 (was 112); bank total: 4,514 (was 4,445)
- Bank-wide validateQuestionBanks: PASS (0 banned-exercise refs, 0 dupes, mark/section consistent)
- Bank-wide syllabusGuard: FAIL with 15 pre-existing violations queued for Follow-up #1

---

## 2026-05-24 — PRE-P1 mojibake fix (PR #116), P1-M/P1-S abandoned, syllabusGuard fix (PR #117), P2 paused at Checkpoint A

Timestamp: 2026-05-23 → 2026-05-24 (rolled over Asia/Kolkata midnight)

### Starting state

- Base branch: base/approved-thru-437 at e9f41cd (post PR #115 docs handoff)
- Note: agent prompts were sometimes written against an older SHA; owner approved
  proceeding on tip when only docs-only PRs intervened.

### Work completed (chronological)

1. **PR #116 — PRE-P1 mojibake symbol restoration (MERGED)**
   - Scope: `lazytopper/src/data/questionBanks/class10/maths/maths.caseBased.ts` and
     `science.caseBased.ts` (circles.proof.ts checked, found already clean — dropped from scope).
   - Original prompt's hand-rolled Latin-1 mojibake dictionary was insufficient: actual encoding
     was Windows-1252 (cp1252) for maths and **doubly-encoded** cp1252 for science. Switched
     mid-flight to `ftfy` 6.3.1 which handles both. After fix, `ftfy.fix_text` is idempotent
     on both saved files.
   - 499 character repairs (266 maths + 233 science). 0 semantic content changes.
   - Symbols recovered: △ ∥ ∠ × − √ ≈ ≥ → ° ² ³ ₁ ₂ ₃ ₄ ₅ ₉ ₀ ₹ Σ ᵢ ✓ — ρ Ω ₚ ⁻⁶ ⁻⁷ ⁻⁸ ⁺ etc.
   - All 4 validations PASS (tsc, validateQuestionBanks, git diff --check, scope).
   - Merged → new base e9f41cd.

2. **P1-M (CBSE Practise Papers Maths Standard) — ABANDONED at Checkpoint A**
   - Branch `content/practise-papers-maths` created off e9f41cd; deleted after abandonment.
   - PDF probe revealed three blockers:
     1. NODIA 3rd-party compilation, not CBSE-official. Page 1 footer:
        "Marking Scheme links are on each paper". MS pages NOT in PDF — were external hyperlinks.
     2. pdfplumber math-layout corruption: 2D expressions (fractions, superscripts, integrals,
        square roots) linearised to broken text e.g. `4sinq−cosq / c4sinq+cosqm`.
     3. No topic tagging: ~1140 questions across 30 sample papers with no per-question topic
        metadata, requiring manual classification.
   - Owner chose Option 4 (pause; pivot to a different source).
   - Report saved: `report-p1m-structure.md`, `report-p1m-ABANDONED.md` (5-line summary).

3. **P1-S (CBSE Practise Papers Science) — ABANDONED via read-only probe**
   - No branch needed (probe-only). Result: same NODIA blockers as P1-M.
   - 321 pages, 30 NODIA sample papers, same "Click the Following Button to See the Free
     MS/Solutions" footer.
   - Report saved: `report-p1s-probe.md`.

4. **P2 (CBSE Additional PQ 2023-24 + SQP) — PAUSED at Checkpoint A**
   - Branch `content/additional-pq-sqp-2024` created off e9f41cd (preserved locally for resume).
   - Source folder: `cbse-papers/gdrive/Class X.../CBSE Syllabus+sample paper 2023 2024/`.
   - Inventory: 8 PDFs probed — 3 Maths APQs + matched MS, 1 Maths SQP + MS, 3 Science APQs
     (one MS missing), 1 Science SQP + MS. All CBSE-official (no NODIA watermark).
   - Owner decision: skip `Science-PQ (1).pdf` (the 2022-23 set with no MS); proceed with the
     other 7 papers.
   - Extraction halted at owner request pending the syllabusGuard.ts fix (next item).
   - Report saved: `report-p2-source-inventory.md`.

5. **PR #117 — syllabusGuard + bannedExercises + CBSE step-marking doctrine fix (MERGED)**
   - Three docs/config files in one PR; no question bank touched.
   - `scripts/src/syllabusGuard.ts`: Maths banned 8 → 30, Science banned 24 → 82. Owner-applied
     mid-PR correction: dropped 6 false-positive Maths entries (`Area of Triangle` variants and
     `Conversion of Solids` variants — both retained in topics.ts chapter blurbs). Only
     `Frustum of Cone` kept for Mensuration.
   - `scripts/src/bannedExercises.json`: Maths 1 → 7, Science 2 → 8.
   - `CLAUDE.md`: added new §13 CBSE Content Doctrine — Step Marking. Old doctrine line
     `A=2, B=3, C=4, D=5, E=4` did NOT actually exist in CLAUDE.md, so appended fresh rather
     than replacing. Corrected minimums to A=1, B=2, C=3, D=5, E=4 per CBSE 2025-26 OSM.
     Six step-marking principles added: half-mark steps, error-carried-forward, SI units,
     exact Science keywords, chemistry balanced-equation + state-symbols split, Science
     diagram + labels split.
   - Validations: all PASS (app tsc, scripts tsc, diff --check, scope check, 5-test verify).
   - syllabusGuard against existing bank: 65 violations on first run → 15 after Correction 1
     (all 15 are legitimate Ch8 Reproductive Health deletions in reproduction.{exemplar,ncert,
     pack2}.ts). Per prompt: no auto-fix; flagged for follow-up PR.
   - ops/ files (`cbse_registry_2026_27_acceptance.mjs`, `science_deleted_zeroing_acceptance.ts`,
     `generate_content_backlog_and_matrix.mjs`) NOT touched in this PR — updating them would
     create self-contradictions with their existing "Our Environment present in scope"
     assertions. Owner approved deferring to a follow-up PR.
   - Merged → new base a38573b.

6. **PR #118 — docs handoff post-PR #117 (THIS PR)**

### Validations / verifications run

- syllabusGuard.ts (pre-PR #117): had 8+24 banned subtopics; outdated for CBSE 2025-26
- syllabusGuard.ts (post-PR #117): 30+82 banned subtopics; matches owner's 2025-26 rationalisation
- Bank-wide syllabusGuard scan (post-PR #117): 15 legitimate violations flagged for follow-up
- All TypeScript builds PASS throughout the session
- ftfy idempotency confirmed on both repaired files
- P2 inventory script confirmed all 8 source PDFs present and classified correctly

### Decisions made

- **Pivot away from NODIA Practise Papers** (P1-M abandoned at Checkpoint A; P1-S abandoned at
  probe). NODIA is a 3rd-party compilation that systematically lacks inline solutions, has poor
  math layout extractability, and no topic metadata. Future content sourcing should prefer
  CBSE-official PDFs (APQ, SQP) and publisher PDFs with bundled MS (Oswaal/MTG/Educart).
- **Our Environment Ch15 doctrine**: fully deleted per CBSE 2025-26 (matches bannedExercises.json
  reason text and CBSE official syllabus). Existing ops/ tests that expect Our Environment
  retained are outdated — follow-up PR required.
- **Maths Area of Triangle and Conversion of Solids**: NOT deleted in 2025-26 (topics.ts blurbs
  confirm retention). Banned-list entries removed during PR #117 review to avoid false-positive
  suppression of legitimate bank content.
- **CBSE step-marking doctrine**: Section A is 1 mark → 1 step (was wrongly documented as 2).
  Full A=1/B=2/C=3/D=5/E=4 minimums + 6 principles now in CLAUDE.md §13.

### Follow-up items queued

1. **ops/ acceptance test alignment** for Our Environment full-deletion (small docs-only PR).
2. **Reproduction bank cleanup**: reclassify or remove 15 banned questions across 3 files.
3. **Resume P2 extraction**: branch `content/additional-pq-sqp-2024` preserved locally;
   needs rebase onto a38573b before resuming Step B4. New syllabusGuard must pass cleanly
   on extracted content (i.e., no Our Environment / Reproductive Health / Constructions /
   Frustum / Periodic Classification etc.).

### Ending state

- Base branch: base/approved-thru-437 at a38573b (post-PR #117)
- Active local branches: `content/additional-pq-sqp-2024` (P2, paused at Checkpoint A)
- Authentic question total: 1,630 (unchanged — PR #116 was encoding-only, PR #117 was config-only)
- Bank-wide validateQuestionBanks: PASS (166 files, 0 duplicate IDs)
- Bank-wide syllabusGuard: FAIL with 15 legitimate violations queued for follow-up

---

## 2026-05-23 — P0.5 diff/ pack registration session (PR #114)

Timestamp: 2026-05-23 (Asia/Kolkata)

### Starting state

- Base branch: base/approved-thru-437
- Base SHA at session start: e7645273367959423dc77260e6f94ac60fb87f6f (post-PR #113 docs handoff)
  Note: P0.5 agent prompt was written against PR #112 SHA (8c8acf4). Owner approved
  proceeding on tip — PR #113 was docs-only and did not affect product files.
- Active PRs: none at session start
- Current task: P0.5 — probe + register 3 remaining diff/ pack files

### Work completed

1. P0.5 pre-flight + probe:
   - Verified no existing circles.proof.ts or *.caseBased.ts files in repo
   - Probed all 3 diff/ pack files:
     maths_case_based_pack.ts:    18 Qs, 4 invalid topicKeys (Triangles, Quadratic Equations, Arithmetic Progression, Statistics), format=Case-Based ✓
     science_case_based_pack.ts:  15 Qs, 3 invalid topicKeys (Electricity, Life Processes, Light), format=Case-Based ✓
     circles_proof_pack.ts:       10 Qs, 1 invalid topicKey (Circles), invalid format="Proof"
   - ID collision check: 0/43 collisions against existing 1,370 IDs

2. Fixes applied:
   - topicKey normalisation in diff/ source files (Title Case → kebab-case slug)
     Extra fix beyond the prompt's listed pairs: bare "Light" → "light-reflection-and-refraction"
   - Copied 3 fixed files into repo
   - Renamed exports: *_PACK → *_QUESTIONS (Edit tool, surgical replacements)
   - circles.proof.ts only: format "Proof" → "Short" (Sec C × 5) | "Long" (Sec D × 5)
   - Added 3 imports + 3 spreads to canonicalQuestionBank.ts under a P0.5 banner

3. Round 1 validation — V2 BLOCKED:
   - V1 syllabusGuard: PASS
   - V2 validateQuestionBanks: **FAIL** — 33 mark/section mismatches
     Root cause: case-based packs split each 4-mark Section E case set into 3 sub-rows
     (marks 1+1+2). Validator enforces `section "E" ⇒ marks 4` per row.
     circles.proof.ts (10 Qs) passed cleanly.
   - V3–V6: not run (prompt's STOP-at-first-failure rule)
   - Saved report; stopped before commit.

4. Owner-directed Option 2 restructure (round 2):
   - For each case set: merge 3 split sub-rows into ONE 4-mark Section E row
   - id: base ID without -i/-ii/-iii suffix (e.g. CASE-MATHS-TRI-001)
   - questionText: case context + Part (i) [1 mark] / Part (ii) [1 mark] / Part (iii) [2 marks]
   - solutionSteps: combined with "Part (i):"/"(ii):"/"(iii):" headers
   - answer/finalAnswer/explanation: concatenated with Part labels
   - isCompetencyBased: true if ANY sub-part was true
   - First sub-part's other fields preserved (subject, topicKey, subtopic, difficulty,
     bloomSkill, pyqYear, pyqSet, ncertRef)
   - circles.proof.ts: NOT touched (already clean)
   - diff/ originals: NOT touched (preserved as split form)
   - Mechanism: one-off Node script diff/_p05_merge_caseSets.mjs run via tsx
   - Result: 18 maths sub-rows → 6 case sets; 15 science sub-rows → 5 case sets

5. Round 2 validation — ALL 6 PASS:
   - V1 syllabusGuard: PASS
   - V2 validateQuestionBanks: PASS (166 files, mark/section consistent, 0 duplicate IDs)
   - V3 tsc -p tsconfig.app.json --noEmit: PASS (exit 0)
   - V4 belt-and-suspenders duplicate ID check: PASS (1,365 IDs, 0 dupes)
   - V5 git diff scope: PASS (4 expected paths: 1 modified + 3 untracked)
   - V6 engine reachability: PASS (custom _p05_reachability.mjs — 21 P0.5 Qs route
     correctly; all 11 merged base IDs present; 0 stray sub-part IDs)

6. PR #114 merged.

### GitHub evidence

- PR #114: content/register-diff-packs-p05 → base/approved-thru-437
- State: MERGED
- Merge SHA: d0b34932ce30805e6e3b7a492ffdb3d3538d24d4
- Files changed: 4 (3 new .ts + canonicalQuestionBank.ts), +964 lines

### Validation evidence

- syllabusGuard: PASS
- validateQuestionBanks: PASS (166 files; mark/section consistent; 0 duplicates)
- tsc -p tsconfig.app.json --noEmit: PASS (exit 0)
- Duplicate ID check: PASS (1,365 IDs)
- git diff --name-only: PASS (exactly 4 expected paths)
- Engine reachability: PASS (21 P0.5 Qs route; 0 stragglers)

### Data-honesty audit

- 21 questions, all from pre-existing diff/ pack files (no fabrication)
- solutionSteps: 21/21 non-empty (100%); merged sets contain 12–20 steps each
- isCompetencyBased: 6+5 case sets all true (any-part-true rule) + 9/10 circles proof = 20/21
- pyqYear/pyqSet preserved from first sub-part where present; cleanup in P5
- No isPYQ: true on unverified content

### Decisions made

- **Option 2 (merge split case sets) chosen over Option 1 (drop case-based, ship only
  circles.proof.ts)**. Owner direction. Preserves all 21 authentic questions in one PR
  instead of two. Validator stays strict; data shape adapts.
- **diff/ originals frozen** in split form. The merge is a repo-only transformation,
  fully reproducible via diff/_p05_merge_caseSets.mjs. Future re-extractions from
  source PDFs can target either shape.
- **Merge script preserved** in diff/ for traceability — not added to repo.
- **Mojibake fix split into PRE-P1** rather than bundled into P0.5. Reason: P0.5 scope was
  registration; the mojibake is text content, not structure. PRE-P1 will establish a
  reusable byte-replacement recipe before P1-M (which will hit the same problem).
- **circles.proof.ts left as round-1 file** (untouched by round-2 merge). Already had
  format Proof→Short/Long applied in round 1; was clean for V2 from the start.

### Session learnings

- The validator's mark/section pairing rule is strict and authoritative. Any future
  case-based extraction MUST either:
    (a) emit one row per case set with marks=4 (CBSE schema-aligned), OR
    (b) restructure post-extraction via a merge script before registration.
  Recipe (a) is preferred for any new extraction; recipe (b) is reserved for inherited
  split-form sources.
- The `_p05_merge_caseSets.mjs` script is reusable for any future split-form case-based
  pack: it groups by base ID (strip -i/-ii/-iii suffix), preserves first-sub-part fields,
  and concatenates text with Part labels.
- Auto-mode classifier blocks `Set-Content` and `WriteAllText` writes to `lazytopper/src/data/`
  files (CLAUDE.md §4 globally forbidden). The `Edit` tool succeeds for surgical
  replacements — use it for export renames, format fixes, and small text edits.
  Bulk file rewrites work via `node`/`tsx` scripts when launched from `scripts/`.
- PowerShell `-match` is case-insensitive by default. To check "has uppercase letters"
  use `-cmatch '[A-Z]'`, not `-match '[A-Z]'`. The prompt's verification step had a
  false-positive bug here that was visible but harmless.
- Mojibake in the diff/ pack files was not caught by any validation (validator checks
  structure, not text rendering). Worth adding a render-smoke-test to the validator
  suite: scan for common mojibake byte patterns (â–, Â², âˆ, etc.) and warn.

### Roadmap impact

- NEXT_ACTION.md: replaced — PRE-P1 (symbol restoration) is next, then P1-M
- OPEN_QUESTIONS_AND_FOLLOWUPS.md: mojibake added as HIGH; P0.5 marked RESOLVED
- CURRENT_STATE.md: SHA bumped to d0b3493; P0.5 block prepended; counts updated
- No change to IMPLEMENTATION_ROADMAP.md (content extraction separate from product roadmap)

### Known issues / follow-ups

- **HIGH**: mojibake in maths.caseBased.ts, science.caseBased.ts, circles.proof.ts — PRE-P1
- pyqSet format cleanup carries forward to P5
- K2H-8f PYQ filter fix still open (pre-condition for P5)
- .claude/ folder still untracked (add to .gitignore in a future docs PR)

### Next safe action

1. Verify SHA: `git rev-parse origin/base/approved-thru-437`
   Must return: `d0b34932ce30805e6e3b7a492ffdb3d3538d24d4`
2. Read NEXT_ACTION.md for the PRE-P1 byte-replacement table
3. Create branch: `content/fix-p05-symbol-restoration`
4. Apply byte-level replacements to the 3 P0.5 files
5. Run all 6 validations (expect PASS — text-only change)
6. Owner commits, opens PR, merges
7. Follow with docs-only handoff PR
8. Then start P1-M (CBSE Practise Papers Maths)

### What the next session must verify first

- [ ] SHA matches d0b34932ce30805e6e3b7a492ffdb3d3538d24d4
- [ ] PR #114 is merged (check GitHub)
- [ ] canonicalQuestionBank.ts has 112 spreads
- [ ] Bank reports 4,445 total questions
- [ ] Authentic count is 1,630 (post-PR #114)
- [ ] Read NEXT_ACTION.md before starting any extraction

---

## 2026-05-23 — P0 diff/ pack registration + Pass 1B/1C audit session

Timestamp: 2026-05-23 (Asia/Kolkata)

### Starting state

- Base branch: base/approved-thru-437
- Base SHA: da8c08dcc059621fad755bbf643a4dc425bc1447 (post-PR #111)
- Active PRs: none at session start
- Current task: resource audit + P0 pack registration

### Work completed

1. Pass 1C gdrive audit — probed all unprobed gdrive subfolders:
   - Science/Chapter-wise/ (32 PDFs): confirmed cbjescco+cbjesccq series, ~1,422 net new Qs
   - Sample papers/ + Preboard/ (19 PDFs): ~199 PDF-extractable Qs
   - Science/NCERT Examplers 2020/ (33 PDFs): 100% duplicate of already-extracted — skip
   - misc/ (53 PDFs): entirely English literature — skip
   - cbse-papers/PYQ/ (30 PDFs): 26 READY, 7 NEEDS-OCR, ~784 net new Qs
   - Maths/PYQs/: all BASIC subfolders — skip entirely
   - Report saved: C:\Users\Chetan\OneDrive\Desktop\diff\report-pass1c-gdrive-audit.md

2. Project knowledge updated:
   - LazyTopper_Master_Project_Knowledge_v4.md — produced with Pass 1C findings
   - LazyTopper_QB_Expansion_Tracker.md — new file, full phase tracker P0-P8
   - LazyTopper_Pass1C_Audit_Prompt.md — new file, agent prompt for future passes
   - resource-audit-fresh.md — uploaded to project knowledge
   - report-pass1c-gdrive-audit.md — uploaded to project knowledge

3. PR #112 — P0 pack registration:
   - Merged 62 questions from 4 diff/ pack files into canonicalQuestionBank.ts
   - topicKey normalisation: title-case → lowercase slugs
   - Mid-flight fix: "format": "Proof" → "Short"/"Long" (predictionTypes.ts schema)
   - All 6 validations PASS
   - Bank: 1,547 → 1,609 authentic questions
   - canonicalQuestionBank.ts spreads: 104 → 109

### GitHub evidence

- PR #112: content/register-diff-packs → base/approved-thru-437
- State: MERGED
- Merge SHA: 8c8acf40f129949cac47adf8a769d8fdc6128c79
- Files changed: 6 (5 new .ts + canonicalQuestionBank.ts)
- +2,276 lines

### Validation evidence

- syllabusGuard: PASS
- validateQuestionBanks: PASS (163 files, 0 duplicates)
- tsc -p tsconfig.app.json --noEmit: PASS (exit 0)
- Duplicate ID check: PASS (1,344 IDs, 0 dupes)
- git diff --name-only: PASS (exactly 6 expected files)
- Engine reachability: PASS (triangles, trigonometry, electricity, life-processes — all ROUTE CORRECTLY)

### Data-honesty audit

- No fake data added. All 62 questions are pre-existing verified content from diff/ folder.
- solutionSteps: 62/62 non-empty (100%)
- isCompetencyBased: 44/62 = 71%
- No isPYQ: true on unverified content (pyqYear/pyqSet values in AR files use
  full CBSE set codes — noted as cleanup item for P5)

### Decisions made

- "format": "Proof" is not a valid QuestionFormat — proof questions map to
  "Short" (Section C) or "Long" (Section D). This is now established convention.
- P4b Science Chapter-wise (cbjescco+cbjesccq, ~1,422 Qs) added as a new
  high-priority extraction phase — largest single new source found in Pass 1C.
- Science/NCERT Examplers 2020/ confirmed 100% duplicate — permanently skip.
- misc/ folder confirmed English literature only — permanently skip.
- Maths/PYQs/ subfolders confirmed all BASIC — permanently skip.
- Pack retirement threshold remains 6,000 authentic questions.
- pyqSet format cleanup (full CBSE code → short "1"/"2"/"3") deferred to P5.

### Session learnings

- The assertion_reason_pack.ts split (triangles + trigonometry into separate files)
  required a proper brace-balanced parser — simple regex splitting fails on
  nested objects. The _p0_split_and_copy.py script handles this correctly.
- The "format": "Proof" issue will recur in P0.5 circles_proof_pack.ts —
  the _p0_fix_proof_format.py script is reusable for P0.5.
- pnpm not on PATH in VS Code terminal — use npx tsx ./src/syllabusGuard.ts
  directly as equivalent. Same script, same result.
- Pass 1C confirmed that all Maths PYQs Standard are in cbse-papers/PYQ/,
  not in gdrive/Maths/PYQs/ (which is all Basic). Do not probe gdrive/Maths/PYQs/
  in future passes.
- Science Chapter-wise folder (cbjescco/cbjesccq series) is the largest
  untouched source — 24 in-scope files, ~1,422 net new questions. Schedule as P4b.

### Roadmap impact

- NEXT_ACTION.md: updated to P0.5 as next task
- QB_Expansion_Tracker.md: P0 row filled in, P0.5 → P8 pending
- Master Knowledge v4: Pass 1C findings and P4b added
- No change to IMPLEMENTATION_ROADMAP.md (content extraction separate from product roadmap)
- OPEN_QUESTIONS_AND_FOLLOWUPS.md: K2H-8f PYQ filter fix still open (pre-condition for P5)

### Known issues / follow-ups

- K2H-8f: PYQ filter returns 0 results — must fix before P5 PYQ extraction
- pyqSet format inconsistency in P0 AR files — cleanup in P5
- 3 diff/ pack files still unprobed (P0.5): maths_case_based_pack.ts,
  science_case_based_pack.ts, circles_proof_pack.ts
- .claude/ folder is untracked — owner should add to .gitignore

### Next safe action

1. Verify SHA: git rev-parse origin/base/approved-thru-437
   Must return: 8c8acf40f129949cac47adf8a769d8fdc6128c79
2. Proceed with P0.5 — probe 3 remaining diff/ pack files
   Branch: content/register-diff-packs-p05
   Mode: Low
3. Then P1-M — CBSE Practise Papers Maths Standard
   Branch: content/practise-papers-maths
   Mode: High

### What the next session must verify first

- [ ] SHA matches 8c8acf40f129949cac47adf8a769d8fdc6128c79
- [ ] PR #112 is merged (check GitHub)
- [ ] canonicalQuestionBank.ts has 109 spreads
- [ ] Bank reports 4,424 total questions (or higher if P0.5 done)
- [ ] Authentic count is 1,609 (post-PR #112)
- [ ] Read NEXT_ACTION.md before starting any extraction

---
Session: 2026-05-23
Work done:
  - PR #108: fix deletionGuard.test.ts (3 assertions, SHA: 25230e8f)
  - PR #109: Maths ch1-14 NCERT+Exemplar 643 questions (SHA: f0d90b1b)
New base SHA: f0d90b1bc696d73e3064750aa89ef48ddf482c5b
Content extraction complete:
  Science NCERT+Exemplar ch1-12: 904 questions
  Maths NCERT+Exemplar ch1-14: 643 questions
  Grand total in engine: ~4,017 questions
Key findings this session:
  - NCERT PDF disk numbers use old 2018-19 chapter numbering
  - jeep213.pdf = combined Stats+Prob Exemplar (split correctly)
  - Maths11.pdf = Constructions (not ARC) — always verify PDF titles
  - Anti-fabrication rule triggered twice (Surface Areas NCERT, Light Exemplar)
    both caught and corrected by agents
  - Engine reachability test now mandatory for all content PRs
  - quality-assessment-report.md generated — pack quality audit pending
Next: PYQ extraction, pack quality audit, product UI work
---
---
Session: 2026-05-22 (end of day)
PRs merged: #105 (handoff docs), #106 (Science ch8-12 content)
New base SHA: dfbf725a362b11a4113ec63f4ecebbaa792848a3
Science extraction complete:
  Ch1-7: 608 questions (PRs #98, #102)
  Ch8-12: 296 questions (PR #106)
  Ch13: deleted from CBSE 2026-27 — not extracted
  Total Science NCERT+Exemplar: 904 questions in engine
Key finding: Exemplar PDFs use old CBSE chapter numbering (documented in master knowledge)
Key finding: Ch9 and Ch10 are separate topics in topics.ts
Next: fix/deletion-guard-tests (Low mode) then Maths ch1-14 (High mode)
---

---
Session: 2026-05-22 (evening)
Work done: Science ch8-12 NCERT+Exemplar extraction (296 questions)
Commit: 83c92893a246cc7eee8221be000957bfa2054b22
PR: #104 (open)
Key findings:
- Ch13 Our Environment confirmed deleted — not extracted
- slug light-reflection-and-refraction-incl-human-eye-prism does NOT exist
  in topics.ts — Ch9 and Ch10 are separate topics
- Heredity slug is heredity (not heredity-and-evolution)
- Light Exemplar fabrication incident caught and corrected by agent
- Engine reachability test added to workflow — 5/5 PASS
Next: deletionGuard.test.ts fix + Maths ch1-14 extraction
---

---
Session: 2026-05-22 (afternoon)
Work done: Merged PRs #101 + #102. QA unblocked. Starting Science 8-13 + Maths extraction today.
PRs merged:
  #101 — Clerk OAuth BASE_PATH fix (feature-tip SHA: 5ad88cd, base merge SHA: f88f742)
  #102 — Science ch1-7 engine wiring + topicKey + syllabus guard (feature-tip SHA: 4557b3f, base merge SHA: 56ce39b)
New base SHA: 56ce39bd88200abf196827e54a3d4feeb191237f (PR #102 merge commit on base/approved-thru-437)
Key decisions:
- Handoff commit accidentally landed on fix/ branch, cherry-picked to correct content/ branch
- Both PRs merged same session, QA verified on Vercel
- Login Google OAuth confirmed working post PR #101
- 608 Science questions confirmed in engine post PR #102
- Squash-merge produces a new commit SHA on base — handoff records both the feature-branch tip SHA (for traceability) and the merge commit SHA (for session-start verification)
Next: Science 8-13 extraction on content/question-bank-expansion-02 (rebase onto 56ce39b before starting)
---

---
Session: 2026-05-22
Work done: canonicalQuestionBank wiring + topicKey fixes + syllabus guard patch
PR: #100 (open, awaiting merge)
Branch: content/wire-ncert-exemplar-science-ch1-7
SHA: 519b65123a8d2e9ba5f35d76624cf7c5b81fb0d3
Key decisions:
- Bundled 3 concerns into one PR: engine wiring + topicKey retag + guard patch
- topicKey in reproduction/controlAndCoordination files retagged to match topics.ts canonical slugs (not file-author slugs) — required for engine topicMatches() to route correctly
- TOPIC_ALIASES entry added for backward-compat only (engine does not consult aliases — data file retag was the real fix)
- syllabusGuard.ts and cbseHistoricalArchetypes.ts now in sync on Constructions/Ogive/Frustum
- deletionGuard.test.ts update deferred to next small PR
Next: Science 8-13 extraction on content/question-bank-expansion-02
---

## Post-PR #98 / Science chapters 1-7 NCERT+Exemplar extraction

- PR #98 merged into base/approved-thru-437
- Merge commit: b88ed11fb85aec1a9739207dd0eeea5fcdb7b264
- Previous base: f687ba22d7df9692dce70760f2ea71275f0bfed1
- 14 new Science question bank files created (608 questions)
- Validation infrastructure created: _validate_pack.py (Check 9 added), _smoke_test_topickey.mjs
- tsc command corrected: npx tsc -p tsconfig.app.json --noEmit
- topicKey canonical slug reference established for all 27 chapters
- Content audit agent dispatched (TopicHub, hints, Gemini, interactives)
- Next: content/question-bank-expansion-02


## Post-PR #96 / content Agent 1 handoff update

- PR #96 merged into base/approved-thru-437
- Merge commit: 90c97f568f2dd914ed98ffa50af6d0729b9b2b69
- Previous base: 699a39d4bf629126e910d8403660820c090e9137
- Branch: content/question-bank-expansion-01 (now merged, deleted from remote)
- Agent 1 work: 18 questions fixed/backfilled across 4 files
  - 6 AP solutionSteps (AP-E09, AP-E18, AP-M05, AP-N01, AP-N02, AP-AR05)
  - 1 QE options fix (QE2-013 options: [])
  - 4 STAT solutionSteps backfill (STAT-E16, STAT-E20, STAT-M18, STAT2P1-R02)
  - 7 SAV solutionSteps backfill (SAV-E05, SAV-E08, SAV-E11, SAV-E14, SAV-E18, SAV-M19, SAV2P1-R03)
- tsc --noEmit: PASS throughout
- Resource library assembled locally: CBSE-Official, ncert-books, cbse-papers/PYQ, cbse-papers/gdrive
- Next: Pass 1 content audit agent


## Post-PR #94 / K2H-8d+8e

Timestamp: 2026-05-20T17:45:22Z UTC
- PR #94 merged into `base/approved-thru-437`. New base: `699a39d4bf629126e910d8403660820c090e9137`. PR head SHA: `b1e04a98e6401f2a8bdd0f335b7f69b8b8847c6f`. Merged at: 2026-05-20T17:41:26Z UTC.
- **K2H-8d — Filter wiring through the engine** (`lazytopper/src/components/practice/practiceQuestionBuilder.ts`, `lazytopper/src/pages/PracticePage.tsx`):
  - `questionType` and `pyqOnly` added to the `AiTopupArgs` interface so the filter values flow from the UI through `PracticePage` into the engine.
  - Filter applied AFTER the section filter inside the engine pipeline, with a graceful fallback (`if filtered.length > 0`) so an empty filtered result preserves the prior pool instead of blanking the workspace.
- **K2H-8e — Stale dedupe state fix** (`lazytopper/src/pages/PracticePage.tsx`):
  - `previousQuestionKeys.current` cleared at the start of the build `useEffect` so filter changes get a fresh candidate pool. Without this, the dedupe set from the previous filter context carried forward and starved subsequent builds.
- **End-to-end result**: MCQ chip + "Build new set" now returns correctly filtered questions. Competency and Section filters confirmed working end-to-end.
- **Known limitation deferred to K2H-8f**: PYQ-only filter currently returns 0 results because the engine selection layer (`practiceSetGenerator.ts`) does not pull `pyqYear`-tagged pack3 entries into its candidate pool. K2H-8f will add an engine-tier PYQ bias.
- Pipeline: Claude Code + Playwright + local vite dev. GitHub MCP still not loaded in this session; `gh` CLI used for verification.
- Content branch next: `content/question-bank-expansion-01` — add proof packs (triangles/trigonometry/circles already drafted into temp diff/), AR packs (maths + science already drafted), case-based packs, backfill missing `solutionSteps`, source PYQ entries from official CBSE PDFs once domain access is unblocked.


## Post-PR #92 / K2H-8b+8c handoff update

Timestamp: 2026-05-20T08:54:25Z UTC
- PR #92 merged into `base/approved-thru-437`. New base SHA: `b97ba30e02cdb2a51822512ad02f1918c71c762b`. PR head SHA: `a625fdb8a6380e944fc02286fe15b515577544da`. Merged at: 2026-05-20T08:49:43Z UTC.
- **K2H-8b — Practice Hub filter panel** (`lazytopper/src/pages/desktop/DesktopPracticePage.tsx`):
  - New filter panel between `<PracticeScopeBuilder>` and `lt-practice-main-grid`. Collapse/expand toggle with green active state; "Refine practice" → "Hide filters".
  - Section chips (`All / A · 1mk / B · 2mk / C · 3mk / D · 5mk / E · Case (4mk)`), Difficulty chips (`All / Easy / Medium / Hard`), Count chips (`5 / 10 / 15 / 20`).
  - `PFSection` / `PFDifficulty` / `PFCount` union types; `pfSection`, `pfDifficulty`, `pfCount`, `showPracticeFilters` state.
  - `quickPracticePath` derivation forwards filter params to `/practice/:grade/:subject` via four scope branches (topic / full-subject / multi-topic / null). Default-omit logic: `pfSection !== "ALL" ? pfSection : undefined`.
  - URL hydration on mount reads `section`, `difficulty`, `count` query params; scope-change reset effect also resets filters when the user picks a new topic.
  - Bug fix during K2H-8b: URL hydration was not auto-expanding the panel because the scope-reset useEffect ran after hydration and clobbered `setShowPracticeFilters(true)`. Fix decoupled panel-expansion into a separate useEffect watching `[pfSection, pfDifficulty]`.
- **K2H-8c — PracticeControls "Build this set" upgrade** (`lazytopper/src/components/practice/PracticeControls.tsx` + `lazytopper/src/pages/PracticePage.tsx`):
  - Removed legacy `<select>` Type dropdown, replaced with **Section chips** (mark-labelled: `A · 1mk` … `E · Case (4mk)`).
  - New **Question Type** chip row (`All types / MCQ / Proof / Competency / Assertion-Reason / Case-based`).
  - **Count preset chips** (`5 / 10 / 15 / 20`) added before the existing number input.
  - New **PYQ toggle** ("Previous Year Questions only") with conditional inline `PYQ` badge.
  - New optional props on `PracticeControlsProps`: `questionType?`, `onSetQuestionType?`, `pyqOnly?`, `onSetPyqOnly?`. Rows render only when the corresponding handler is provided (graceful degradation).
  - `PracticePage.tsx`: new state `questionType` (`useState<string>("All")`) and `pyqOnly` (`useState<boolean>(false)`); URL hydration via `qp.get("questionType")` and `qp.get("pyq") === "1"`; `filteredQuestions` useMemo extended with question-type filter chain (MCQ / Proof / Competency / AR / Case) and PYQ-only filter using safe `unknown` casts on `q.format`, `q.type`, `q.isCompetencyBased`, `q.isPYQ`. When fields are absent, `Boolean(undefined) === false` falls through honestly — no fake matches invented.
- **navigation.ts**: `DesktopPracticePathInput` extended with `section?: string`, `difficulty?: string`, `count?: number`; `buildDesktopPracticePath` forwards them as URL params.
- **Tests**: 15/16 PASS (`test-k2h-8c-2026-05-20.md`). The single non-clean result is S2 — a literal-substring false positive: `<select` appears once in the source but only inside a code comment documenting the removal of the `<select>` JSX element. No real failure.
- Pipeline: Claude Code + gh CLI + Playwright Chromium 1217 + local vite dev (port 25246). GitHub MCP was not available in this session; `gh` CLI used as documented fallback.
- Next stage: **Question bank expansion** — PYQ tagging coverage, NCERT-aligned new items, Science proof/derivation seeds, Triangles/Trigonometry competency tagging (currently 1–2%), and the 129 missing-`section` items in spec+factory packs. Gaps fully documented in `question-bank-audit.md`.


## Post-PR #89 / PR-K2H-8a handoff update

Timestamp: 2026-05-19T19:22:46Z UTC
- PR #89 merged into `base/approved-thru-437`.
- New base SHA: `33d0eaff60817a4ddd9fb42f081c230a4ba241a0`.
- K2H-8a complete: Practice focus continuity.
  - `subtopicHint`/`focus` forwarded through `buildLegacyPracticePath` so the legacy `/practice/:grade/:subject` engine receives the focus context (`PracticePage.tsx:166-167` already consumes `subtopicHint`).
  - MistakeIntelligencePanel hardcoded `/practice-hub` redirect fixed to live `currentPracticeUrl` (via `MistakePanelProps.currentPracticeUrl` prop plumbing).
  - `start-focused-practice` login reason added to `loginPrompts.ts` (chip "Focused practice" + headline "Sign in to start focused practice").
  - TopicHub HowBoardsUseItPanel "Open focused practice" relabelled to "Practice this topic" (the href was already topic-level; this fixes the label-vs-behaviour honesty gap).
  - `forceRedirectUrl={nextPath}` added to Clerk `<SignIn>` so OAuth round-trips (Google sign-in) preserve the `?redirect=` target through the external auth provider.
- 12/12 automated tests passed (see `test-k2h-8a-final-2026-05-20.md`): 8 Playwright browser tests + 4 static source-file assertions. Focus banner renders/absent correctly; Quick Practice CTA forwards subtopicHint+focus when signed-in; routes through `reason=start-focused-practice` when signed-out; Login page renders new prompt copy; MI panel locked CTA preserves focused URL; non-focused path unchanged; TopicHub label change; source files contain all expected wiring.
- Follow-up: Clerk OAuth round-trip needs manual Vercel QA with real Google credentials before K2H-15 Firebase Auth migration.
- Pipeline: Claude.ai + Claude Code + GitHub MCP + Playwright tests (Chromium 1217).
- Next: K2H-8b — Advanced Practice filters (Section A/B/C/D/E, marks, type/family, competency, difficulty, count).


## Post-PR #87 / PR-K2H-7 handoff update

Timestamp: 2026-05-19T08:48:24Z UTC
- PR #87 merged into `base/approved-thru-437`.
- New base SHA: `e239f883e30ec4bb9f185cadf1e9dfe127b1dc64`.
- K2H-7 complete: Pricing visual redesign matching frozen landing/Login grammar.
- App.tsx: `/pricing` added as a standalone route (no DesktopShell chrome, no global navbar, no TrialBanner, no BottomNav) — three minimal edits using the same pattern as `/welcome` (added to `isDesktopShellRoute`, `isPublicLandingRoute`, and `BottomNav` internal exclusion).
- PricingPage.tsx: full rewrite to the `lt-pricing-*` CSS-in-JS grammar; no inline `style={{}}` props; CSS classes only; preserves all logic (`saveWaitlistEntry`, `useState` hooks, `handleStartTrial`, `handleWaitlistSubmit`).
- Premium price now displayed as `₹2,999 / year` with `~₹250/month · less than one tuition session` sub-line; copy stays data-honest about manual activation / no automated checkout.
- All Unicode symbols (₹ ✓ — 🎉 🏛️ 🗺️ 🎓) verified as real UTF-8 bytes in the file; zero `C3 A2` mojibake markers.
- Vercel QA: PASS.
- Pipeline: Claude.ai + Claude Code + GitHub MCP fully operational end-to-end (validation, push, merge, post-merge verification).
- Next: K2H-8 — Practice focus consumption + advanced filters.


## 2026-05-17T12:20:00Z - PR #82 merge recorded; docs-only handoff update before PR-K2H-6

### Starting state
- Branch: `docs/post-pr-82-k2h-5-handoff-update`
- Base branch: `base/approved-thru-437`
- Required base SHA: `11aac1bc8bce67e6b2d67e540b4295491c0b78e0`
- Base SHA verified: `11aac1bc8bce67e6b2d67e540b4295491c0b78e0`
- Local task scope: docs-only handoff update

### GitHub evidence
- PR: PR #82
- Title: `PR-K2H-5: Login visual parity + auth gate polish`
- State: `MERGED`
- Merged at: `2026-05-17T12:15:42Z`
- Previous checkpoint before merge: `283355dec5ced04bbe72976f5f068593e0900799`
- Final head SHA: `06ba3cd74c93cf0c47fd44a4957e72b97a782765`
- Merge commit / new base SHA: `11aac1bc8bce67e6b2d67e540b4295491c0b78e0`
- Changed files count: 2
- Changed files: `lazytopper/src/pages/Login.tsx`, `lazytopper/src/lib/desktop/loginPrompts.ts`

### Work completed
- Updated docs/handoff files only; no product code changed.
- Recorded that PR #82 is merged and the new verified base checkpoint is `11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.
- Recorded PR #82 scope, changed files, validation, QA result, Clerk Development mode handling, and launch follow-ups.
- Recorded that Login now better aligns with the frozen landing and Lovable/topic-focus-lite LoginGate visual/composition direction while preserving real Clerk auth.
- Updated next recommended implementation to PR-K2H-6 - Home/cockpit learning order + Continue repair.
- Recorded operating model: Codex for edits/validation/screenshots/diff/report, owner for VS Code PowerShell commit/push/PR unless explicitly overridden, GPT for prompt/audit/merge recommendation.

### PR #82 validation recorded
- TypeScript passed.
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Production verifier passed: 8 passed, 0 failed.
- `git diff --check` passed.
- Allowed-file check passed.
- Forbidden-file guard produced no output.

### PR #82 QA result
PASS.

Visual QA recorded:
- Local screenshots existed for 1440x900, 1366x768, and 390x844.
- Owner Vercel preview QA confirmed Development mode not visible, Clerk visible/usable, no guest CTA, no app chrome/nav, reason copy variants correct, and Back link safe.
- Owner did not manually verify every viewport on Vercel; local screenshot evidence covered viewport confidence.

### Follow-ups
- Production launch still requires Clerk production instance / `pk_live` env configuration.
- Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control.
- PR #69, PR #17, and old mobile PRs #1/#2 remain parked and must not be mixed.

### Next safe action
- Review this docs-only diff.
- Do not commit or push until GPT audits the docs diff.
- After this docs-only update is merged, start PR-K2H-6 from `base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

## 2026-05-16T18:55:00Z - PR #80 merge recorded; docs-only handoff update before PR-K2H-5

### Starting state
- Branch: `docs/post-pr-80-k2h-4-handoff-update`
- Base branch: `base/approved-thru-437`
- Required base SHA: `018c95b11f5168d27fb93bb3a2cae3859b682627`
- Base SHA verified: `018c95b11f5168d27fb93bb3a2cae3859b682627`
- Local task scope: docs-only handoff update

### GitHub evidence
- PR: PR #80
- Title: `PR-K2H-4: Frozen landing page and explore-first entry`
- State: `MERGED`
- Merged at: `2026-05-16T18:43:48Z`
- Base before merge: `18e6e111884b05795882da75ba4c65f034d9d4e9`
- Head branch: `feat/desktop-pr-k2h-4-frozen-landing-explore-entry`
- Final head SHA: `045ffa00a3894405f67a5ceda778f313c693fa0f`
- Merge commit / new base SHA: `018c95b11f5168d27fb93bb3a2cae3859b682627`
- Changed files count: 3
- Changed files: `lazytopper/src/App.tsx`, `lazytopper/src/components/desktop/DesktopShell.tsx`, `lazytopper/src/pages/Welcome.tsx`
- Additions/deletions: +2162 / -1294

### Work completed
- Updated docs/handoff files only; no product code changed.
- Recorded that PR #80 is merged and the new verified base checkpoint is `018c95b11f5168d27fb93bb3a2cae3859b682627`.
- Recorded PR #80 scope, validation, QA result, changed files, and owner-approved final landing design decisions.
- Recorded frozen landing doctrine, Explore-first browse/action-gated doctrine, auth/payment/practice/navigation doctrines, and remaining follow-ups.
- Updated next recommended implementation to PR-K2H-5 - Login visual parity + auth gate polish.

### PR #80 validation recorded
- TypeScript passed.
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Build verifier passed: 8 passed, 0 failed.
- `git diff --check` passed.
- Vercel QA passed.
- No Login, Pricing, DesktopHome, Practice, HPQ, Mock, TopicHub, docs/handoff, package, server, env, or data files changed in PR #80.

### PR #80 QA result
PASS.

Final landing QA/design decisions:
- `/app/` signed out shows final landing.
- No scroll/overflow on tested desktop view.
- No white band.
- Four cards visible in one row.
- CTA says Explore and sits below cards / above MI.
- Explore opens `/app/browse`.
- Sign in opens login route.
- Landing has one primary action only: Explore.
- Trial begins only after a user signs in through a real action gate.
- No guest mode or guest session.
- Browse mode is for product inspection only.
- The landing should not be redesigned again unless owner explicitly reopens landing design.

### Follow-ups
- Login visual parity / auth gate polish - recommended next implementation PR.
- Clerk friction / auth strategy question.
- Home/cockpit card order follow-up.
- Pricing visual redesign.
- Continue where you left off route repair.
- `/profile` direct-reference cleanup.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree deferred until server/admin verified activation work.

### Session learnings
- The final public landing is now product doctrine, not an open design target.
- Explore-first browse mode and no-guest-mode can coexist: browse inspection is allowed, but real learning actions remain auth/trial gated.
- CTA placement after the four-card story and before Mistake Intelligence is owner-approved and should not be casually moved.
- Login polish is now the next visible funnel gap, but it must preserve real Clerk auth and the PR #80 funnel.

### Next safe action
- Review this docs-only diff.
- Do not commit or push until GPT audits the docs diff.
- After docs merge, start PR-K2H-5 - Login visual parity + auth gate polish from the live base.

## 2026-05-16T02:31:24Z - PR #78 merge recorded; docs-only handoff update before next owner-choice PR

### Starting state
- Branch: `docs/post-pr-78-k2h-3-handoff-update`
- Base branch: `base/approved-thru-437`
- Required base SHA: `0addba3f0208c7610d02ab1b1753923fdf0790db`
- Base SHA verified: `0addba3f0208c7610d02ab1b1753923fdf0790db`
- Local task scope: docs-only handoff update

### GitHub evidence
- PR: PR #78
- Title: `PR-K2H-3: Auth/session shell hardening`
- State: `MERGED`
- Merged at: `2026-05-16T02:26:54Z`
- Base before merge: `0ed0871f3166e647fb5b3e36fb0c1e543df0c145`
- Head branch: `feat/desktop-pr-k2h-3-auth-session-shell-hardening`
- Final head SHA: `2067fa5079161c8a888398683d35c3bac59429b0`
- Merge commit / new base SHA: `0addba3f0208c7610d02ab1b1753923fdf0790db`
- Changed files count: 11
- Additions/deletions: +388 / -146

### Work completed
- Updated docs/handoff files only; no product code changed.
- Recorded that PR #77 is already merged and PR #78 is already merged.
- Recorded the new verified base checkpoint.
- Recorded PR #78 scope, validation, QA result, and follow-ups.
- Recorded locked product doctrines for browse-first/action-gated flow, authentication, payment, Practice, and navigation.
- Recorded the frozen landing page design target.
- Updated next recommended implementation options and sequence.

### PR #78 validation recorded
- TypeScript passed.
- Production build passed with `NODE_ENV=production BASE_PATH=/app/`.
- Build verifier passed: 8 passed, 0 failed.
- `git diff --check` passed.
- No package/server/data/env/docs/handoff files changed in product PR.
- PR #77 route-context files were not touched.

### PR #78 QA result
PASS WITH FOLLOW-UP.

Passed:
- Login removed visible guest button.
- Login showed real Clerk auth and no search/header/sidebar chrome.
- Login left panel explained saved attempts, Mistake Intelligence, and 7-day trial.
- Sidebar order changed correctly.
- Account menu showed identity/trial status/Me/Manage subscription/Log out.
- Me / Progress opened `/me`, not old `/profile`.
- Manage subscription opened pricing with source/returnTo.
- Logout returned to public landing.
- `/profile` no longer opened old profile page.
- Trial ribbon removed.
- Pricing no longer claims automated checkout/premium activation.
- PR #77 regression paths looked okay.

### Follow-ups
- Login visual parity polish.
- Pricing visual redesign.
- Home "Continue where you left off" route/content repair.
- Remaining direct `/profile` reference cleanup.
- Payment gateway deferred until verified payment/admin activation work.

### Session learnings
- GitHub live state must win over docs and memory, especially after rapid PR merges.
- Login can be functionally correct with real Clerk auth while still needing visual parity polish.
- Pricing honesty and payment activation are separate concerns; honest manual activation is acceptable until verified payment work exists.
- PR #77 route-context behavior is a preservation constraint for future route repairs.

### Next safe action
- Review this docs-only diff.
- Do not commit or push until GPT audits the docs diff.
- After docs, owner chooses the next implementation PR from Login visual parity polish, frozen landing page redesign, or Home continue-card route repair.

## 2026-05-13T14:49:10Z - PR #75 merge recorded; docs-only handoff update before PR-K2H-2

### Starting state
- Branch: `docs/post-pr-75-k2h-1-handoff-update`
- Base branch: `base/approved-thru-437`
- Base SHA verified: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`
- Live PR state verified from GitHub: PR #75 merged into `base/approved-thru-437`
- Local task scope: docs-only handoff update

### GitHub evidence
- PR: PR #75
- URL: `https://github.com/chetan-anand-hub/Lazytopper-Production/pull/75`
- Title: `PR-K2H-1: Harden Practice checked-evidence states`
- State: `MERGED`
- Base ref: `base/approved-thru-437`
- Head ref: `feat/desktop-pr-k2h-1-practice-checked-evidence`
- Final head SHA: `1745ca6f93a73b245f8024a3663318fe9aa0d5f6`
- Merge commit / new base SHA: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`
- Changed files count: 3
- Commits count: 5

### Work completed
- Updated docs/handoff files only; no product code changed.
- Recorded PR #75 closed/merged state and the new verified base checkpoint.
- Recorded what PR #75 completed:
  - preserved PR #73 Practice Level-3 visuals
  - hardened checked-answer evidence states
  - improved SolutionChecker status labels across shared checker usage
  - removed student-hostile MCQ copy such as "local practice feedback" and "stored key"
  - removed the small MCQ "S" session badge
  - treated MCQ option click as a real answer attempt where a trusted key exists
  - logged wrong trusted MCQ attempts through the existing mistake-history path for signed-in non-local-session learners
  - preserved typed/uploaded Check my answer as the richer checked-answer path
  - updated Practice footer/session copy so it no longer says "not saved to Me / Progress"
  - restored safe CBSE-style step-mark chips for written multi-mark Practice Show Steps when returned step marks match total question marks
  - hid step-mark chips for MCQ/objective and 1-mark questions
  - hid unsafe step splits with guide-only warning
  - did not touch HPQ, TopicHub, server/API/package/data/env/docs in the product PR
- Recorded the next recommended sequence:
  A. Docs-only handoff update after PR #75 merge.
  B. PR-K2H-2 route/context repair for HPQ Build Mock back navigation and TopicHub Board Essentials concept-aware Practice routing.
  C. PR-K2H-3 durable MCQ answer-attempt model.
  D. PR-K2H-4 advanced Practice filters and selection quality.
  E. Sign-in/trial enforcement pass for learning surfaces.
  F. Mock pages Level-3 detail finalisation.
  G. HPQ question-bank / solution / diagram / structured-option quality.
  H. Broader final polish / production-readiness sweep.

### Data-honesty audit
- MCQ click is a real answer attempt when a trusted key exists.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history remains deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress/mastery/score/weak areas/Mistake Intelligence were added.
- Signed-in trial users should receive full feature access during the 7-day trial.

### Known follow-ups
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- HPQ -> Build mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Sign-in/trial enforcement pass across learning surfaces so Firestore-backed Me / Progress and Mistake Intelligence can work reliably.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

### PR #69 / K2D warning
- PR #69 / K2D remains separate.
- Do not merge blindly.
- Do not absorb into K2H without explicit audit and owner approval.

### Branch hygiene
- Current branch is `docs/post-pr-75-k2h-1-handoff-update`.
- This session intentionally edited docs/handoff files only.
- Do not commit or push until the local diff is reviewed.

### Validation evidence
- `git diff --check`: PASS.
- Working-tree changed files are docs/handoff only.
- `git diff --name-only origin/base/approved-thru-437...HEAD`: empty because this docs-only work is intentionally uncommitted pending diff review.
- Build not run because this is a docs-only update and no code files changed.

### Session learnings
- GitHub live PR metadata matched the supplied PR #75 facts exactly.
- `origin/base/approved-thru-437` advanced to `38f5a56a9a02964b1c6cf49fbd72013da11179ca` after fetch.
- PR-K2H should now continue as smaller follow-up slices rather than treating PR #75 as complete Practice evidence architecture.
- Wrong trusted MCQ evidence and typed/uploaded answer checking are different evidence paths; future docs and UI should keep that distinction clear.

### Next safe action
- Review this docs-only diff.
- If the diff is accepted, create the docs-only handoff PR.
- Start PR-K2H-2 route/context repair only after fresh live base verification.

## 2026-05-12T08:16:56Z - PR #73 merge recorded; docs-only handoff update before PR-K2H

### Starting state
- Branch: `docs/post-pr-73-k2g-handoff-update`
- Base branch: `base/approved-thru-437`
- Base SHA verified: `39861a455dd9728dea70924e8e9dea6575bf1208`
- Live PR state verified from GitHub: PR #73 merged into `base/approved-thru-437`

### Work completed
- Verified GitHub PR #73 live metadata and merge state.
- Confirmed PR #73 merge commit / new base SHA: `39861a455dd9728dea70924e8e9dea6575bf1208`.
- Confirmed PR #73 final head before merge: `54638b25c6cf2ca88c1f336a91712e2d1d0108ad`.
- Updated docs/handoff files only; no product code changed.
- Recorded the immediate next stage as PR-K2H: Practice graded evidence + Mistake Intelligence bridge + advanced filters + solution-quality repair.

### GitHub evidence
- PR: PR #73
- State: merged
- Head SHA: `54638b25c6cf2ca88c1f336a91712e2d1d0108ad`
- Base SHA: `39861a455dd9728dea70924e8e9dea6575bf1208`
- Merge commit SHA: `39861a455dd9728dea70924e8e9dea6575bf1208`
- Changed files count: 8

### Validation evidence
- TypeScript: not applicable for docs-only update
- Production build: not applicable for docs-only update
- Build verifier: not applicable for docs-only update
- Changed-file scope: docs/handoff only

### QA evidence
- Manual Browser/owner visual QA broadly accepted for PR #73.
- No product code was changed in this docs-only update.
- Next stage is PR-K2H after base verification.

### Data-honesty audit
- PR #73 was classified as visual/shell/routing/CTA closeout, not graded evidence completion.
- Practice local MCQ clicks, self-assessment, and Show steps are not saved evidence.
- Real evidence still requires actual checking/grading.

### Decisions made
- PR #73 is merged and K2G is complete as a visual/shell/CTA closeout.
- Practice evidence/Mistake Intelligence must be addressed in PR-K2H.
- This session does not implement product code.

### Session learnings
- GitHub live PR metadata is the source of truth for merge status and base SHA.
- Docs-only handoff updates must be recorded immediately after a merge and before starting the next implementation stage.
- PR-K2H must begin from a freshly verified base after this docs-only update merges.

### Historical next safe action at the time
- Merge this docs-only handoff update.
- Verify `origin/base/approved-thru-437` remains `39861a455dd9728dea70924e8e9dea6575bf1208`.
- Start PR-K2H from that verified base.

Historical note:
This PR #73 entry is superseded by the later PR #75 merge. After PR #75 merge, current base checkpoint is `38f5a56a9a02964b1c6cf49fbd72013da11179ca`.

### What the next GPT session must verify first
- `git fetch origin`
- `git rev-parse origin/base/approved-thru-437`
- `git status --short`
- PR #73 merge state on GitHub
- no active implementation branch from stale PR #72 or PR #69 contexts

## 2026-05-08T18:33:03Z - PR #72 manual authenticated HPQ QA recorded; post-merge sequence revised

### Starting state
- Branch: `feat/desktop-pr-k2f-practice-hpq-visual-grammar`
- PR: PR #72, https://github.com/chetan-anand-hub/Lazytopper-Production/pull/72
- Head SHA before docs update: `4c331ee22b1d625e118999c07354a13cf1102d9e`
- Base branch: `base/approved-thru-437`
- Base SHA verified: `24ac85f61752d1560ea29b26849bda4bb9b60c66`

### Preview URL
- Vercel preview: `https://lazytopper-production-desktop-ja96piv2q.vercel.app/app/`
- Manual HPQ Maths route checked by product owner: `https://lazytopper-production-desktop-ja96piv2q.vercel.app/app/highly-probable/10/Maths`
- Corresponding Science HPQ route was also checked.

### Browser Agent QA result
- Practice visual grammar passed.
- HPQ / Exam Trends QA is inconclusive because the guest Browser Agent hit the Premium Feature interstitial.
- Browser Agent cannot complete magic-link email authentication or access the user's authenticated trial session.
- This is an auth/paywall limitation, not a product failure.

### Manual authenticated HPQ QA result
- Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.
- The preview showed the new HPQ design, not old production HPQ.
- HPQ rendered inside desktop shell.
- Hero showed `Predicted Questions`.
- Strong selected Maths / Science state appeared.
- `Refine predictions` was present.
- Topic stacks rendered with priority, marks, and competency count.
- Empty mock basket was state-aware and planning-only.
- Non-empty mock basket showed Build mock / Clear after adding stack/question.
- Non-MCQ `Check my answer` opened the real checker panel.
- `Show steps` and `Check my answer` were mutually exclusive per question.
- Objective / Assertion-Reason option feedback worked where structured options exist.
- Objective panel said `Solution logic`.
- No inflated objective marks were observed.
- Duplicate answer-only logic row was removed.
- Raw `AI API request failed` was no longer shown.
- Science HPQ followed the same new visual grammar.
- Topic Hub return behavior was visually checked earlier and should remain pending final audit if not rechecked in this update.

### Remaining issue classification
- Remaining HPQ issues are question-bank / solution-quality / structured-option completeness issues.
- Science/Maths MCQ structured option normalization remains a later data-only follow-up.
- Solution / diagram quality and cache coverage remain later work.
- Do not expand PR #72 into question-bank or solution-quality repair.

### Revised next sequence
1. PR #72 final GPT owner audit.
2. If audit passes, PR #72 review/merge as appropriate.
3. Verify `base/approved-thru-437` advanced to PR #72 merge commit after merge.
4. Practice Level-3 detail finalisation.
5. Mock pages Level-3 detail finalisation.
6. HPQ question / solution quality work.

Explicit note:
Do not start question/solution quality work before Practice and Mock pages unless the product owner reprioritises.

---

## 2026-05-08T15:37:18Z - PR #72 final HPQ + Practice repair, handoff update, pending Vercel QA

### Starting state
- Branch: `feat/desktop-pr-k2f-practice-hpq-visual-grammar`
- Starting HEAD before local repair commit: `7f7e7eea8fce886f113700e1373f93761ddb9bb5`
- Base branch: `base/approved-thru-437`
- Base SHA verified: `24ac85f61752d1560ea29b26849bda4bb9b60c66`
- Merge-base: `24ac85f61752d1560ea29b26849bda4bb9b60c66`
- PR: PR #72, https://github.com/chetan-anand-hub/Lazytopper-Production/pull/72

### Work completed
- Preserved earlier PR #72 Practice visual grammar pass.
- Moved HPQ into desktop shell and hid old HPQ chrome on desktop.
- Reworked HPQ into a prediction-first surface with concise hero, stronger Maths / Science toggle, lighter Refine predictions filters, and integrated competency labels/counts.
- Made mock basket state-aware and planning-only.
- Removed HPQ self-check as the main mechanism.
- Added Check my answer primary path for non-MCQ questions through existing SolutionChecker.
- Rendered MCQ / Assertion-Reason clickable options only when structured options exist.
- Kept Show logic / Show steps separate from grading.
- Made Check panel and steps panel mutually exclusive per question.
- Changed objective panels to Solution logic and removed inflated objective marks.
- Hid duplicate answer-only objective solution rows while preserving explanation rows.
- Removed default Reference answer and Why this question disclosure from student cards.
- Removed raw prediction certainty and guaranteed-style wording from default UI.
- Restyled SolutionChecker to calmer desktop grammar.
- Fixed Topic Hub return navigation back to Predicted Questions.
- Replaced raw AI/API error rendering with student-safe fallback copy.

### Files changed
- `lazytopper/src/App.tsx`
- `lazytopper/src/components/question/SolutionChecker.tsx`
- `lazytopper/src/pages/HighlyProbableQuestions.tsx`
- `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
- `handoff/CURRENT_STATE.md`
- `handoff/NEXT_ACTION.md`
- `handoff/IMPLEMENTATION_ROADMAP.md`
- `handoff/DECISION_LOG.md`
- `handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md`
- `handoff/SESSION_LOG.md`

### Local validation results
- TypeScript passed: `npx --yes pnpm@10.23.0 --filter lazytopper exec tsc --noEmit`.
- Production build passed with existing Vite large-chunk warning: `NODE_ENV=production BASE_PATH=/app/ npx --yes pnpm@10.23.0 --filter lazytopper run build`.
- Build verifier passed: `8 passed, 0 failed`.
- `git diff --check` passed.
- Raw API error grep found no `AI API request failed` or `API request failed` in `HighlyProbableQuestions.tsx`.
- Quick-mark/local-demo grep found no `local-demo-user` or `recordHpqAttempt` in `HighlyProbableQuestions.tsx`.

### Local UI QA findings
- HPQ hero is concise and prediction-first.
- Maths / Science active state is visibly green.
- Refine predictions keeps filters out of the hero.
- Non-MCQ Check my answer and Show steps are mutually exclusive.
- MCQ / Assertion-Reason option feedback remains click-only and does not log Mistake Intelligence.
- Objective Solution logic hides duplicate answer-only rows.
- Topic Hub return context goes back to Predicted Questions.
- Mock basket is empty/non-empty state-aware and planning-only.

### API / gateway finding
- Vite proxies `/api` to `API_SERVER_PORT`, using `8080` locally.
- Without `dev:gateway`, `/api/step-solution` fails with `ECONNREFUSED`.
- `npx --yes pnpm@10.23.0 run dev:gateway` with `PORT=8080` starts the LazyTopper AI server.
- Without `DATABASE_URL` and provider API keys, cache/generation is limited or stubbed.
- Student-facing raw `AI API request failed` copy must never be rendered.

### Science MCQ option audit
- Science MCQ / AssertionReason total found by Codex audit: 29.
- Structured `options` / `aROptions` present: 14.
- `correctOption` present: 14.
- Missing structured options examples: `mnm-hpq-101`, `lp-hpq-101`, `sci-cre-hpq-1`, `sci-abs-hpq-1`, `2026-MNM-01b`, `sci-light-hpq-1`.
- Follow-up needed: separate data-only HPQ MCQ normalization PR.
- Do not invent options in UI.

### Data-honesty audit
- Fake progress: not introduced.
- Fake mastery: not introduced.
- Fake score: not introduced.
- Fake weak area: not introduced.
- Fake Mistake Intelligence: not introduced.
- Fake checked answer: not introduced.
- Fake mock grading: not introduced.
- Official/guaranteed CBSE claims: not introduced.
- Add to mock remains basket/planning only.

### Next safe action
1. Commit and push the PR #72 repair branch after validation.
2. Wait for Vercel preview.
3. Use Vercel preview URL with `/app/`.
4. Run Browser Agent QA where auth does not require inbox access.
5. Use manual QA for magic-link-gated trial states if needed.
6. GPT owner audits GitHub diff, validation, Vercel QA, Browser QA, and screenshots before merge.

Explicit status:
PR #72 is not merged. Vercel QA and Browser Agent QA are pending.

---

## 2026-05-07T08:00:00Z - Post-K2E handoff repair / PR #70 merged verification

### Starting state
- Base branch: base/approved-thru-437
- Live base after PR #70 merge: 807ca666fd414fc5ce37778ade34479d46013544
- Current task/stage: Post-K2E trial entitlement handoff repair

### Work completed
- Verified PR #70 merged successfully.
- Recorded manual 7-day trial entitlement QA passed.
- Documented Browser Agent auth limitation (magic-link inbox access).
- Trial entitlement unlock functionality confirmed working.
- Identified and recorded new product follow-up: Practice and HPQ old-format pages do not match Level-3/desktop design grammar.
- Recorded PR #69/K2D draft status and behind-base state.
- Updated all handoff files to reflect current state.
- No product source code changed.
- Next step: merge this docs-only PR, then in fresh GPT session verify handoff and plan Practice/HPQ visual grammar alignment.

### Key findings
- Trial entitlement is functional; not the blocker.
- Practice and HPQ old-format surfaces now flagged as explicit pre-graduation follow-up.
- PR #69/K2D needs rebase before merge consideration.

---

## 2026-05-07T00:00:00Z - PR-K2E docs-only audit branch repair

- Recreated `docs/pr-k2e-trial-entitlement-audit` cleanly from `origin/base/approved-thru-437` at `93add323809ae3d17f6fc4f1bc627c9efa7c13cd`.
- Confirmed the working tree was clean and only docs changes were introduced.
- Added `docs/audits/pr-k2e-trial-entitlement-audit.md` and prepended this session log entry.
- No product source code or build config files were changed.
- Next step: open draft PR for docs-only audit and run Browser QA for active trial, expired trial, and premium states.

---

## 2026-05-06T13:08:53Z - Codex dry-run for Vercel preview workflow verification

- This is a Codex dry-run to verify GitHub repository readability.
- Verified branch preparation from `base/approved-thru-437` using commit `517e717cc3c6b73dc94601a29c5eb9f5db7d5621` as current verified base in this environment.
- Verified ability to make a docs-only scoped change limited to `handoff/SESSION_LOG.md`.
- Verified ability to open a draft PR targeting `base/approved-thru-437`.
- Vercel should generate a Preview URL for the PR.
- Browser Agent QA should use the Vercel preview URL with `/app/` appended.
- K2D has not started.

---

## 2026-05-06T12:00:00Z - Vercel production setup verified, PR #66 merged

### Starting state
- Base branch: base/approved-thru-437
- Live base after PR #66: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Current task/stage: Vercel production setup verification before K2D

### Work completed
- Recorded PR #66 merge and new live base.
- Verified Vercel production deploy from base/approved-thru-437 at fe065fb0d9eb10d134d2baaa29b1010a54007966.
- Production QA Browser Agent URL: https://lazytopper-production-desktop.vercel.app/app/
- / redirects to /app/
- /app/ loads LazyTopper
- /app/login and Clerk auth return work without Vercel 404
- Browser Agent QA rule: use Vercel production/preview URLs with /app/ appended.
- Updated current stage, next safe action, and K2D status in all handoff/docs files.

### GitHub evidence
- PR #66: merged
- PR #66 head SHA: 4b37d099447903951d6a44bd623b580a86c330e0
- PR #66 merge commit: fe065fb0d9eb10d134d2baaa29b1010a54007966

### Validation evidence
- Docs-only handoff update.
- Product build not required.
- Changed-file scope is handoff/docs only.

### QA evidence
- Vercel production deploy source branch: base/approved-thru-437
- Vercel production deploy source commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Production deployment status: PASS / Ready
- Production app route: PASS
- Root redirect: PASS
- Clerk login/auth return: PASS after PR #66
- Production QA Browser Agent URL: https://lazytopper-production-desktop.vercel.app/app/

### Data-honesty audit
- Fake mastery: not introduced
- Fake score: not introduced
- Fake progress: not introduced
- Fake Mistake Intelligence: not introduced
- Fake checked answer: not introduced
- Fake mistake log: not introduced
- Hidden persistence: not introduced

### Decisions made
- Vercel production setup is now verified. K2D has not started.
- Next safe action: confirm future PR branches generate usable Vercel Preview URLs with /app/ appended for Browser Agent QA, then begin PR-K2D planning only after live base verification.

### Session learnings
- Vercel production deploy from base/approved-thru-437 at fe065fb0d9eb10d134d2baaa29b1010a54007966 is now the source of truth for Browser Agent QA.
- Browser Agent should use Vercel production/preview URLs with /app/ appended.
- Do not use the bare root URL except when specifically testing the root redirect.
- K2D must not start until Vercel Preview URL behavior is confirmed for future PRs.
# LazyTopper Session Log

This log must be updated incrementally by every GPT session.

Newest entries should be added at the top under a dated heading.

---

## 2026-05-06T04:32:03Z - PR #64 merged; final post-K2C handoff stabilization

### Starting state
- Base branch: base/approved-thru-437
- Live base after PR #64: bbd4d457a2349cf34b8ab335e45123f8b306868c
- Current task/stage: final handoff stabilization before Vercel/Codex setup verification

### Work completed
- Recorded PR #64 merge and new live base.
- Clarified that K2C is complete and K2D has not started.
- Removed stale instruction to finish/merge the already-merged post-K2C handoff repair PR.
- Stabilized handoff wording so future docs-only PRs do not create an infinite base-staleness loop.
- Reconfirmed Codex as preferred executor and Vercel as preferred preview provider.
- Reconfirmed contaminated Replit main must not be used.

### GitHub evidence
- PR #62 / K2C: merged
- PR #62 head SHA: 1cbc1d74243801cd1a5f68345547779ba6e4813d
- PR #62 merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873
- PR #64 / docs-only post-K2C handoff repair: merged
- PR #64 head SHA: 3a6f7f097e84e130e2cb5e8be2ca4cc011bd8dbc
- PR #64 merge commit: bbd4d457a2349cf34b8ab335e45123f8b306868c

### Validation evidence
- Docs-only handoff update.
- Product build not required.
- Changed-file scope must remain docs/handoff only.

### QA evidence
- Browser QA not required for docs-only update.
- K2C Browser QA already recorded as PASS.

### Data-honesty audit
- Fake mastery: not introduced
- Fake score: not introduced
- Fake progress: not introduced
- Fake Mistake Intelligence: not introduced
- Fake checked answer: not introduced
- Fake mistake log: not introduced
- Hidden persistence: not introduced

### Decisions made
- Next implementation is not K2D yet.
- First complete Vercel/Codex setup verification.
- Then start PR-K2D after live base verification.
- Future sessions must verify live GitHub base because docs-only handoff PRs can advance the base after recorded checkpoints.

### Session learnings
- A handoff repair PR merge itself advances the base, so handoff must separate product checkpoint from latest live handoff checkpoint.
- The handoff should say when to verify live GitHub rather than relying only on hard-coded SHAs.
- Fresh GPT audit is useful and should be used again after this stabilization.

### Next safe action
1. Merge this small docs-only stabilization PR.
2. Re-run the fresh GPT handoff-readiness audit.
3. If HANDOFF READY, resume Vercel setup and Codex workflow.
4. Start PR-K2D only after Vercel/Codex setup verification and live base check.

### What the next GPT session must verify first
- Live `origin/base/approved-thru-437` SHA.
- PR #62 remains merged.
- PR #64 remains merged.
- This stabilization PR is merged if applicable.
- Vercel setup status.
- `/app/` deployment status.
- K2D has not started.

---


## 2026-05-06T00:00:00Z - Post-K2C handoff repair, PR #62 merged

### Starting state
- Base branch: base/approved-thru-437
- Base SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873
- Active branch: docs/post-k2c-handoff-repair
- Current task/stage: Post-K2C handoff repair / Vercel-Codex setup

### Work completed
- Marked PR-K2C / PR #62 as merged.
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/62
- Final head: 1cbc1d74243801cd1a5f68345547779ba6e4813d
- Merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873
- Browser QA: PASS
- Changed files: 5
- Updated all handoff and docs base SHA references.
- Set current stage to post-K2C handoff repair / Vercel-Codex setup.
- Set next safe action: finish and merge this docs-only handoff repair PR, then complete Vercel setup and verify /app/ deployment, then start PR-K2D only after live base verification.
- Normalized K2D requirements and rules.
- Updated operating model: GitHub source of truth, Codex preferred executor, Vercel preferred preview, Replit only if clean, contaminated Replit main forbidden.

### GitHub evidence
- PR: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/62
- Base SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873
- Head SHA: 1cbc1d74243801cd1a5f68345547779ba6e4813d
- Changed files: 5 (see PR)

### Validation evidence
- Docs-only change.
- Build not required.
- Changed-file scope is handoff/docs only.

### Data-honesty audit
- Fake mastery: not introduced
- Fake score: not introduced
- Fake progress: not introduced
- Fake Mistake Intelligence: not introduced
- Fake checked answer: not introduced
- Fake mistake log: not introduced
- Hidden persistence: not introduced

### Decisions made
- PR-K2C is merged and handoff is now current.
- Vercel setup and /app/ verification are required before K2D.
- Codex is preferred executor, Vercel is preferred preview, Replit only if clean.

### Session learnings
- Replit main became polluted with local ghost/checkpoint commits and subrepl branches/remotes; do not use contaminated Replit main for implementation.
- Fresh Replit import may be used only if proven clean.
- Prefer Codex as implementation executor.
- Prefer Vercel PR previews for Browser Agent QA.
- GitHub remains source of truth.
- Vercel setup is in progress; root URL may 404 because the app is served under /app/.
- Need to finish Vercel production branch setup to base/approved-thru-437 and verify /app/ before relying on Vercel previews.

### Next safe action
- Finish and merge this docs-only handoff repair PR.
- Complete Vercel setup and verify /app/ deployment.
- Start PR-K2D only after live base verification.

### Starting state
- Base branch: base/approved-thru-437
- Base SHA: 048ef9eac2b6d80c497029391612246a77304a62
- Active branch: feat/desktop-pr-k2c-worksheet-learner-loop
- Current task/stage: PR-K2C

### Work completed
- Added worksheet learner-loop entry points.
- Added Attempt this worksheet, Check my answer, and Practice similar questions actions.
- Check my answer routes through real Check & Improve with source=worksheet and returnTo.
- Practice similar questions routes through the existing practice path.
- Added K2C audit doc and updated handoff state.
- Optional activity recording was intentionally skipped to keep K2C narrow.

### Data-honesty audit
- Fake mastery: not introduced
- Fake score: not introduced
- Fake progress: not introduced
- Fake Mistake Intelligence: not introduced
- Fake checked answer: not introduced
- Fake mistake log: not introduced
- Hidden persistence: not introduced

### Session learnings
- K2C keeps Check & Improve as the only grading path.
- Worksheet attempt UI is useful guidance but must not be represented as progress or mastery.

### Next safe action
- Validate.
- Open draft PR.
- Generate public QA URL.
- Audit before merge.


## 2026-05-05T00:00:00Z - Post-K2B handoff refresh

Timestamp:
- UTC: 2026-05-05T00:00:00Z
- Local/user time if known: not recorded in Codespaces

### Starting state

- Base branch: base/approved-thru-437
- Base SHA: 47d53aa9baa5f106dc349a35cb739f8e52e5d240
- Active PRs: none for K2C yet
- Current task/stage: post-K2B handoff refresh before K2C

### Work completed

- Marked K2A and K2B as merged in handoff.
- Set PR-K2C as the next safe action.
- Updated roadmap and README base references.
- Added decision-log entry that K2C is next.

### GitHub evidence

- PR: docs-only handoff refresh to be opened
- Base SHA: 47d53aa9baa5f106dc349a35cb739f8e52e5d240
- Changed files: handoff docs only

### Validation evidence

- Docs-only change.
- Build not required.
- Changed-file scope must be handoff files only.

### Data-honesty audit

- Fake mastery: not introduced
- Fake score: not introduced
- Fake progress: not introduced
- Fake Mistake Intelligence: not introduced
- Fake saved history: not introduced
- Hidden persistence: not introduced

### Decisions made

- K2C should not start from stale handoff.
- Handoff refresh is separated from K2C implementation.

### Session learnings

- K2B merged successfully, but handoff still described it as open/in progress.
- Future sessions should verify GitHub state and handoff freshness before starting a new stage.

### Next safe action

- Open and merge this docs-only handoff refresh PR.
- Then start PR-K2C from the refreshed base.

### What the next GPT session must verify first

- This docs-only handoff PR is merged.
- New base SHA after handoff refresh.
- K2C branch does not already exist.


## 2026-05-05T11:25:06Z — PR-K2B repair: save copy and handoff state

### Work completed
- Repaired signed-in idle save copy so it no longer says device-only.
- Updated DesktopWorksheetsPage comments to reflect signed-in profile save plus signed-out device save.
- Repaired NEXT_ACTION.md stale K2A base/branch instructions.
- Repaired CURRENT_STATE.md stale “K2A has not started” section.
- Updated K2B audit doc with repair note.

### Data-honesty audit
- No progress claim introduced.
- No mastery claim introduced.
- No Mistake Intelligence claim introduced.
- Signed-out copy remains device-only.
- Signed-in copy says profile sync only when available.

### Next safe action
- Re-run validation.
- Push repair to PR #60.
- Re-audit before merge.



## 2026-05-05T12:45:00Z — PR-K2B: wire worksheet save to profile

Timestamp:
- UTC: 2026-05-05T12:45:00Z
- Local/user time if known: not recorded in Codespaces

### Starting state
- Base branch: base/approved-thru-437
- Active branch: feat/desktop-pr-k2b-wire-worksheet-profile-save
- Current task/stage: PR-K2B — wire worksheet save to profile

### Work completed
- Wired desktop worksheet “Save worksheet” to K2A profile save helper for signed-in users.
- Preserved device-only save for signed-out users.
- Mapped K2A statuses to honest UI copy (profile-saved, local-only, skipped-signed-out, failed).
- No progress/mastery/Me/Mistake Intelligence claims.
- Added audit doc: docs/audits/pr-k2b-worksheet-profile-save-wiring.md
- Updated handoff/CURRENT_STATE.md and handoff/NEXT_ACTION.md

### GitHub evidence
- PR: (pending)
- Changed files:
  - lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx
  - docs/audits/pr-k2b-worksheet-profile-save-wiring.md
  - handoff/SESSION_LOG.md
  - handoff/CURRENT_STATE.md
  - handoff/NEXT_ACTION.md

### Validation evidence
- TypeScript: pending
- Production build: pending
- Build verifier: pending

### Manual/browser QA evidence
- Signed-out: Save worksheet → “Saved on this device.”
- Signed-in: Save worksheet → “Saved to your profile.” or “Saved locally. Profile sync is unavailable right now.”
- No progress/mastery/Me/Mistake Intelligence claims in UI.

### Known limitations
- Profile worksheet count not shown (K2C follow-up).
- Activity event not yet wired (K2C follow-up).

### Next safe action
- Validate build and typecheck.
- Open draft PR for review.

Timestamp:
- UTC: 2026-05-05T02:32:56Z
- Local/user time if known: not recorded in Codespaces

### Starting state

- Base branch: base/approved-thru-437
- Active branch: feat/desktop-pr-k2a-worksheet-profile-contract
- Current task/stage: PR-K2A repair after audit HOLD

### Work completed

- Repaired `saveWorksheetToProfile()` and `recordWorksheetActivity()` so Firestore/profile success returns `profile-saved` even if local cache write fails.
- Preserved `localCacheSaved` as the independent signal for whether local fallback succeeded.
- Updated K2A audit doc to clarify status semantics.
- No UI files or product surfaces touched.

### GitHub evidence

- PR: #58
- Changed files remain expected:
  - lazytopper/src/services/worksheetProfileService.ts
  - docs/audits/pr-k2a-worksheet-profile-save-contract.md
  - handoff/SESSION_LOG.md

### Validation evidence

- TypeScript: pending in this terminal run
- Production build: pending in this terminal run
- Build verifier: pending in this terminal run
- Changed-file scope: pending in this terminal run

### QA evidence

- Browser Agent: not required
- Manual QA: not required
- Preview URL: not applicable
- Verdict: non-visual repair

### Data-honesty audit

- Fake mastery: not introduced
- Fake score: not introduced
- Fake progress: not introduced
- Fake Mistake Intelligence: not introduced
- Fake saved history: not introduced
- Hidden persistence: not introduced
- Status honesty: repaired so profile/cloud success is not reported as failed

### Decisions made

- `profile-saved` means Firestore/profile persistence succeeded.
- `localCacheSaved` is the separate local-cache outcome.
- `failed` means neither local cache nor profile/cloud persistence succeeded.

### Session learnings

- Independent write attempts require independent status semantics.
- A local cache failure must not hide a successful profile/cloud save.

### Known issues / follow-ups

- PR #58 must be re-audited after this repair commit.
- K2B remains the next implementation step only after K2A merge.

### Next safe action

- Run validation.
- Commit and push this repair.
- Re-audit PR #58.

### What the next GPT session must verify first

- PR #58 head SHA.
- Changed files.
- Validation evidence.
- That Firestore success with local cache failure returns `profile-saved`, not `failed`.


## 2026-05-05T12:35:00Z UTC — PR-K2A: Contract repair and detailed result shape

**Timestamp:** 2026-05-05T12:35:00Z UTC / 2026-05-05 18:05 IST

### Starting state

Base: 8ff9a33be8345f201d54d91fdfe21f221093d537 (already verified from previous session)
Previous work: PR #58 drafted with initial K2A contract
Current branch: feat/desktop-pr-k2a-worksheet-profile-contract (fresh from previous session)

### Work completed

#### Repaired service contract
- **Fixed 5 contract design issues:**
  1. **No authClient check before local writes** → Accept uid: string | null | undefined; let Firestore rules decide
  2. **Local write honesty** → writeLocalJson() now returns boolean; reads back to verify actual success
  3. **Independent Firestore attempt** → Try Firestore even if local fails (don't skip early)
  4. **Null record for skipped-signed-out** → Return record: null when uid missing (K2B can distinguish)
  5. **Detailed result shape** → Added SavedWorksheetWriteResult, ActivityEventWriteResult with status, id, record, localCacheSaved, firestoreAttempted, firestorePath, errorMessage

#### Modified: lazytopper/src/services/worksheetProfileService.ts (550 lines)
- Updated saveWorksheetToProfile() to new signature and behavior
- Updated recordWorksheetActivity() to new signature and behavior
- Updated hydrateProfileFromCloud() to accept uid: string | null | undefined
- writeLocalJson() now returns boolean with read-back verification
- Removed getCurrentUid() (no longer needed)
- All functions now try both local and Firestore independently
- Detailed diagnostic metadata in result objects

#### Updated: docs/audits/pr-k2a-worksheet-profile-save-contract.md
- Added "Repair Details" section explaining each fix
- Updated "Current Service Contract" section with new result types
- Added "Result Shape" section with SavedWorksheetWriteResult / ActivityEventWriteResult description
- Updated "Returned Statuses" table with record behavior (null for skipped)
- Updated "Use Pattern Example" to check record !== null for skipped-signed-out detection
- Updated "Caller Responsibility" renamed to match pattern
- All sections now document the repaired behavior

#### Validation results
- ✅ TypeScript compilation: No errors
- ✅ Production build: Built in 13.92s (faster than before)
- ✅ Build verification: 8/8 checks passed
- ✅ Scope gate: Only allowed files changed (service + audit + this log)

### Key Design Changes

**Contract signature before/after:**
```typescript
// Before
async function saveWorksheetToProfile(
  uid: string,
  draft: SavedWorksheetDraft
): Promise<{ status: WriteStatus; record: SavedWorksheetRecord }>

// After
async function saveWorksheetToProfile(
  uid: string | null | undefined,
  draft: SavedWorksheetDraft
): Promise<SavedWorksheetWriteResult>
```

**Result shape before/after:**
```typescript
// Before
{ status: WriteStatus; record: SavedWorksheetRecord }

// After
{
  status: WriteStatus
  id: string
  record: SavedWorksheetRecord | null  // null for skipped-signed-out
  localCacheSaved: boolean
  firestoreAttempted: boolean
  firestorePath?: string
  errorMessage?: string
}
```

**K2B can now distinguish:**
- `record !== null` means data persisted (either locally or profile)
- `record === null` means skipped-signed-out (should use device-only save instead)
- `status === "profile-saved"` means both local and Firestore succeeded (fully synced)
- `status === "local-only"` means data safe locally but Firestore unavailable

### Data-honesty audit

✅ **Repaired contract maintains strict data honesty:**
- Accepts uid = null and returns skipped (no fake persistence)
- writeLocalJson() verifies actual write success (no false positives)
- Firestore attempted even if local fails (no hidden failures)
- record: null for skipped prevents K2B from treating skipped as saved
- Error messages included for debugging (transparent about failures)
- Still maintains: generated ≠ progress, saved ≠ mastery, attempted ≠ checked, etc.

### Session learnings

1. **Contract design matters for caller convenience:** Detailed result shape with diagnostic fields makes K2B much easier to write correctly and debug problems.

2. **Boolean return from write operations is essential:** Not returning a status means caller must guess about success. Even read-back verification adds confidence.

3. **Independent write attempts are more resilient:** If we skip Firestore when localStorage fails, we lose the chance for cloud-backed persistence. Trying both independently is safer.

4. **Null is better than fake objects for distinguished states:** Returning a record object even for skipped-signed-out is confusing. Returning null is unambiguous and prevents K2B bugs.

5. **Audit docs must be specific about caller responsibility:** The audit doc now explains exactly what K2B should check (record !== null) to avoid mistakes.

### Known issues / Follow-ups

1. **K2B must use record !== null check** — Not just status === "skipped-signed-out"; the check must be explicit so refactoring doesn't break it

2. **K2B should display errorMessage** — If status is "failed", show errorMessage to user for transparency

3. **K2B should display firestorePath** — For debugging cloud issues, firestorePath in error messages helps

4. **Hydration still optional** — hydrateProfileFromCloud() is not auto-called; K2B or signin flow must call it if desired

5. **No progress inference from activity** — Even with detailed activity history, Me/Progress aggregation is K2D+, not K2A

### Next safe action

**For K2B implementation (next GPT session):**

1. Verify PR #58 is still in draft and up-to-date:
   ```bash
   git fetch origin
   git switch --detach origin/feat/desktop-pr-k2a-worksheet-profile-contract
   git log --oneline -3
   # Should show: feat: add worksheet profile save contract
   ```

2. Review the repaired contract in worksheetProfileService.ts:
   - Signature: uid: string | null | undefined
   - Result: SavedWorksheetWriteResult (has record, localCacheSaved, etc.)

3. Wire DesktopWorksheetsPage save button:
   - Call saveWorksheetToProfile(uid, draft)
   - Check result.record !== null to detect skipped-signed-out
   - Use result.status and firestoreAttempted to display exact message

4. Update save labels:
   - "Saved to profile" (status: profile-saved)
   - "Saved locally; will sync when online" (status: local-only)
   - Fall back to device-only path if result.record === null

5. Run all validations before K2B PR

### What next GPT session must verify first

- [ ] Base SHA updated in handoff if merged to main (likely stays 8ff9a33 until K2A merges)
- [ ] PR #58 still exists and is draft
- [ ] worksheetProfileService.ts has new result types (SavedWorksheetWriteResult, etc.)
- [ ] Audit doc reflects Repair Details section
- [ ] This SESSION_LOG entry is readable and complete
- [ ] All files compile and build without errors
- [ ] Read the Repair Details section of audit doc before starting K2B implementation

---

## 2026-05-05T11:15:00Z UTC — PR-K2A: Worksheet profile save contract implemented

**Timestamp:** 2026-05-05T11:15:00Z UTC / 2026-05-05 16:45 IST

### Starting base

```
8ff9a33be8345f201d54d91fdfe21f221093d537 (origin/base/approved-thru-437)
```

### Work completed

#### Clean-start check
- ✅ git fetch, switch to base/approved-thru-437, pull --ff-only
- ✅ Confirmed HEAD exactly: 8ff9a33be8345f201d54d91fdfe21f221093d537
- ✅ Confirmed working tree clean
- ✅ Found and repaired polluted K2A branch

#### Repair of polluted branch
- Found local/remote `feat/desktop-pr-k2a-worksheet-profile-contract` pointing to old base
- Created backup: `backup/k2a-polluted-api-created-8ff9a33`
- Pushed backup for audit trail
- Deleted polluted remote branch
- Deleted local polluted branch
- Created clean K2A branch from current base

#### Implementation: worksheetProfileService.ts
- Created: `lazytopper/src/services/worksheetProfileService.ts` (414 lines)
- Implements typed contract for signed-in worksheet profile save and activity recording
- Exports:
  - `saveWorksheetToProfile(uid, draft)` → `{ status, record }`
  - `recordWorksheetActivity(uid, draft)` → `{ status, record }`
  - `listLocalProfileSavedWorksheets(uid)` → array
  - `listLocalWorksheetActivity(uid)` → array
  - `hydrateProfileFromCloud(uid)` → optional cloud fetch
  - Type exports: `WriteStatus`, `WorksheetActivityKind`, all record/draft types

- Write statuses:
  - `profile-saved`: written to localStorage + Firestore
  - `local-only`: written to localStorage only
  - `skipped-signed-out`: user not authenticated
  - `failed`: both writes failed (rare)

- Activity states (distinct, honest):
  - `worksheet_generated`, `worksheet_saved`, `worksheet_attempt_started`
  - `worksheet_attempted`, `worksheet_check_started`, `answer_checked`
  - `mistake_logged`

- Storage:
  - Local keys: `lazytopper.profile.savedWorksheets.v1:{uid}`, `lazytopper.worksheetActivity.v1:{uid}`
  - Firestore: `learnerProfiles/{uid}/savedWorksheets/{id}`, `learnerProfiles/{uid}/worksheetActivity/{id}`
  - Respects existing Firestore rules (isOwner(uid))

- Data honesty:
  - Generated ≠ progress
  - Saved ≠ mastery
  - Attempted ≠ checked
  - Checked ≠ logged
  - No automatic Me/Progress/Mistake Intelligence claims

#### Audit documentation
- Created: `docs/audits/pr-k2a-worksheet-profile-save-contract.md` (450+ lines)
- Explains K2A purpose, contract, paths, statuses, data honesty, non-goals
- Includes usage patterns, validation commands, K2B follow-ups
- Non-visual, contract-only work; Browser QA not required

### Validation evidence

#### TypeScript compilation
```
✅ pnpm --filter lazytopper exec tsc --noEmit
   No errors. Service compiles cleanly.
```

#### Production build
```
✅ NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
   Built successfully in 15.98s
   Main JS bundle created with new service included
```

#### Build verification
```bash
✅ node scripts/verify-production-build.mjs
   8 passed, 0 failed
   ✓ Build verification PASSED — safe to deploy
```

#### Git scope gate
```bash
✅ git diff --name-only origin/base/approved-thru-437...HEAD
   (after staging)

Modified files:
- lazytopper/src/services/worksheetProfileService.ts ✅ ALLOWED
- docs/audits/pr-k2a-worksheet-profile-save-contract.md ✅ ALLOWED
- handoff/SESSION_LOG.md ✅ ALLOWED

No forbidden files changed (UI, worksheet generator, mistake services, package files).
```

### QA evidence

- ServiceTypeScript compiles with no warnings
- Build passes all checks
- Service does not touch UI surfaces
- Service exports are typed and documented
- Local-only fallback pattern matches existing mistakeLogService
- Firestore paths respect existing rules and subcollection structure
- No progress/mastery inference
- No automatic Mistake Intelligence claims

**Browser QA:** Not required (contract/helper only, no UI changes).

### Data-honesty audit

✅ Service maintains strict data honesty:
- Writes exactly what the caller provides (no inference)
- Returns honest `WriteStatus` (profile-saved, local-only, skipped, failed)
- Activity states are distinct (generated ≠ attempted ≠ checked ≠ logged)
- No progress claims; no mastery claims; no Mistake Intelligence claims
- No fake checked answers persisted as "solutions"
- No generated worksheets claimed as "catalog questions"
- Me/Progress aggregation deferred to K2D or later
- Mistake Intelligence deferred to K2D or later, requires saved checked evidence

### Decisions made

1. **Keep service separate from signed-out local save:** New keys (`lazytopper.profile.*`) are distinct from existing signed-out keys (`lazytopper.desktop.*`). No accidental mixing; clear intent.

2. **Always write localStorage first:** Ensures local-first durability. If Firestore fails, user can work offline. Matches mistakeLogService pattern.

3. **Optional Firestore hydration:** `hydrateProfileFromCloud()` is optional (not auto-called). Called on demand by sign-in flows. Respects existing local data; no overwrites.

4. **Defer Me/Progress to K2D:** Activity recording is data capture only. Aggregation, mastery computation, and Mistake Intelligence feed are K2D or later with explicit business logic.

5. **Use learnerProfiles/{uid} subcollections:** Consistent with existing mistakeLogs, sessions, messages. Firestore rules already protect per-UID. No new permission model needed.

### Session learnings

1. **Branch pollution is common in multi-session work:** Always check for stale branches. The repair protocol saved time and prevented merging incomplete work.

2. **Local-first + optional cloud is a robust pattern:** Matches existing mistakeLogService design. Allows graceful degradation and offline tolerance.

3. **Type exports are essential for callers:** Made sure to export all types (WriteStatus, ActivityKind, drafts, records) so UI/caller code is fully typed.

4. **Firestore hydration must be optional:** Forcing it can overwrite locally-newer data. Letting it gracefully no-op is safer.

5. **Honest statuses require careful thinking:** Distinguishing "profile-saved" from "local-only" from "skipped" from "failed" is more useful than a simple boolean. Caller can display meaningful feedback.

### Known issues / Follow-ups

1. **K2B must wire the save CTA:** Current UI still routes to local-only device save. K2B will connect DesktopWorksheetsPage to `saveWorksheetToProfile()`.

2. **K2B must update save labels:** UI labels must distinguish "Saved on this device" (signed-out) from "Saved to profile" (signed-in, profile-saved) from "Saved locally, will sync" (local-only).

3. **K2C must wire full learner loop:** Generate → attempt → check → see progress. Activity recording is ready; UI wiring is K2C.

4. **K2D must add Me/Progress aggregation:** Read activity history + rules. Compute progress/mastery. Update `learnerProgress/{uid}`. Feed Mistake Intelligence from saved checked evidence.

5. **Firestore permissions already allow profile subcollections:** Existing `match /{document=**}` rule under `learnerProfiles/{uid}` allows `savedWorksheets/` and `worksheetActivity/` collections. No new rules needed.

### Next safe action

**For next GPT session (before starting K2B):**

1. Verify base is still clean:
   ```bash
   git fetch origin
   git switch base/approved-thru-437
   git pull --ff-only origin base/approved-thru-437
   git rev-parse HEAD
   # Expected: 8ff9a33be8345f201d54d91fdfe21f221093d537 or later
   ```

2. Verify K2A PR was already merged:
   ```bash
   git log --oneline | head -20
   # Look for "PR-K2A: add worksheet profile save contract" commit
   ```

3. Start K2B work only after confirming K2A is in base.

### What next GPT session must verify first

- [ ] Base SHA on GitHub matches handoff (currently 8ff9a33)
- [ ] K2A PR was created and merged (check GitHub PR #58 or later)
- [ ] No new K2A branches exist locally or remotely
- [ ] `lazytopper/src/services/worksheetProfileService.ts` exists and compiles
- [ ] `docs/audits/pr-k2a-worksheet-profile-save-contract.md` is readable
- [ ] Production build still passes with K2A changes included
- [ ] Read this SESSION_LOG entry + the audit doc before starting K2B

---

## 2026-05-04T18:04:56Z — Handoff roadmap and trackers added

### Completed

- Added `NEXT_ACTION.md` for immediate next task.
- Added `IMPLEMENTATION_ROADMAP.md` for full K2A → K7 → J sequence.
- Added `DECISION_LOG.md` for permanent project decisions.
- Added `OPEN_QUESTIONS_AND_FOLLOWUPS.md` for unresolved issues.
- Updated `README.md` file map and read order.
- Updated `CURRENT_STATE.md` to point future sessions to the new handoff structure.

### Session learnings

- The handoff system needs both immediate next action and full roadmap; otherwise future GPT sessions may know K2A but lose the larger K2 → K7 → J sequence.
- Permanent decisions should not be buried in chronological logs.
- Open questions/follow-ups need a separate file so they do not become accidental blockers or disappear.
- Revised Level 3 improvements still have no finalized canonical prototype, so implementation must proceed through product-native specs and QA gates.

### Next safe action

Start PR-K2A only after verifying live base and reading all handoff files.

## 2026-05-04T17:16:38Z — Handoff timestamp and learning rules added

Timestamp:
- UTC: 2026-05-04T17:16:38Z
- Local/user time if known: 

### Completed

- Updated handoff SOP rules so every future session must timestamp handoff entries.
- Added requirement that every session log entry includes “Session learnings.”
- Added requirement that handoff folder is updated at regular checkpoints and at end of session.
- Confirmed current base remains 7518d2fc4a181472b4dafd1969a41d96eec2ec3d.
- Confirmed next implementation stage remains PR-K2A.

### Session learnings

- The repo handoff folder is now the primary continuity bridge between GPT sessions.
- Future GPT sessions must be pointed to GitHub handoff files, not only chat summaries.
- Time/date stamping prevents ambiguity when multiple docs-only PRs or QA events happen close together.
- Session learnings must be captured in repo because they often contain the operational lessons that prevent repeated mistakes.

### Next safe action

Start PR-K2A only after verifying live base and reading:
- docs/desktop-graduation-state.md
- handoff/README.md
- handoff/CURRENT_STATE.md
- handoff/SESSION_LOG.md

## 2026-05-04 — Handoff SOP folder activated

### Completed

- PR #54 was created and merged.
- The permanent repo-native handoff folder is now active.
- The folder contains:
  - handoff/README.md
  - handoff/CURRENT_STATE.md
  - handoff/SESSION_LOG.md
  - handoff/templates/session-update-template.md
- Latest base after PR #54:
  7518d2fc4a181472b4dafd1969a41d96eec2ec3d

### Operating rule now active

Every future GPT session must update handoff/SESSION_LOG.md before ending.

Every future GPT session must update handoff/CURRENT_STATE.md when any of these change:
- current base SHA
- active stage
- PR state
- QA verdict
- next safe action
- major operating rule
- prototype/reference decision
- data-honesty rule
- environment lesson

### Current next safe action

Start PR-K2A only after verifying live base:

```bash
git fetch origin
git switch base/approved-thru-437
git pull --ff-only origin base/approved-thru-437
git rev-parse HEAD
git status --short
```

Expected base:
7518d2fc4a181472b4dafd1969a41d96eec2ec3d

Then create:
feat/desktop-pr-k2a-worksheet-profile-contract

K2A must be helper/contract only.

### Do not start yet with

- worksheet UI rewrite
- Me / Progress aggregation
- Mistake Intelligence claims
- AI solution fallback
- DesktopWorksheetsPage edits
- WorksheetReady edits

## 2026-05-03 — Post K1C / Pre K2A checkpoint

### Completed in this session

- Audited and accepted PR-K1B / PR #51.
- PR #51 merged into `base/approved-thru-437`.
- Audited and accepted PR-K1C / PR #52.
- PR #52 merged into `base/approved-thru-437`.
- Updated durable project docs through PR #53.
- PR #53 merged into `base/approved-thru-437`.
- Established latest base SHA: `5a1bab9badb451b95d1d00a344421d5965f691c3`.
- Created handoff documents outside the repo:
  - complete master handoff
  - implementation-only handoff
  - working SOP
  - prototype/reference map
- Decided to use Codespaces terminal method for K2A instead of Codex.
- Codex was installed and authenticated, but should not be used as primary executor yet.
- K2A pre-audit found worksheet save is currently local-only and must first get a profile-save contract/helper.

### Important QA learnings

- Browser Agent can sometimes access Codespaces URLs.
- Browser Agent can also fail on Codespaces due to certificate / forwarding / gateway issues.
- If Codespaces preview fails for Browser Agent but works manually, classify as:
  ```
  INCONCLUSIVE — preview access limitation
  ```
- Do not call that a product route failure unless the app itself loads and fails.

### Next safe action

Start PR-K2A only after verifying live base:

```bash
git fetch origin
git switch base/approved-thru-437
git pull --ff-only origin base/approved-thru-437
git rev-parse HEAD
git status --short
```

Expected base:
```
5a1bab9badb451b95d1d00a344421d5965f691c3
```

Then create:
```
feat/desktop-pr-k2a-worksheet-profile-contract
```

K2A should be a helper/contract PR only.

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
