## 2026-07-21 - Tutor/onboarding retirement, PR-1 of 2 (#512, trunk `e19b2d1`)

Decisions ruled by the owner, and the scope this arc discovered after the retirement was first planned as ONE PR.

### Owner decisions
- **Retiring "Teach me" is a PRODUCT REMOVAL, not a cleanup.** The drawer was **live** — an unconditional button on every Topic Hub concept row, sitting beside the new "Stuck? Ask". Owner confirmed the new `/tutor` fully supersedes it and it should go.
- **★★ SPLIT the retirement into two PRs: behaviour first, deletions second** (the #505 MockBuilder pattern). Ruled after re-verification showed the deletion fallout was **16 ops scripts hard-reading a deleted path (~27 referencing), not the 2 the audit claimed**. Rationale: *"bundling a live behavior change with a ~27-script content cleanup is a mixed-concern PR that delays the user-facing fix."* PR-1 is live-verifiable on its own; PR-2 gets its own careful review.
- **★★ REJECTED: hardening `readText` to swallow ENOENT.** It was the cheapest way to absorb the broken scripts, and it was refused on the right grounds — every assertion about the deleted surface would then pass **vacuously**. *"Vacuous green is the false-green class this project's been bitten by twice."* PR-2 must instead **retire the wholly-dead scripts and surgically fix the mixed ones** — an explicit content decision, owner-reviewed before it lands.
- **`App.tsx`: Option B — leave the route inert, keep CI green.** Consistent with #505. Removing the route would need an `App.tsx` diff, which two CI-gated overlay guards freeze zero-diff.
- **Referral relocation is its own concern, done FIRST**, and the identifier switches to the real Firebase `uid`.
- **`ConceptSpine.test.tsx` is assigned to this lane**, out of the Wave-2 agent's "test files" ownership.
- **Mastery is ON HOLD — do not touch `topicHubMastery` or the mastery reads in either PR.** The old tutor's mastery *write* becoming unreachable is accepted; the store stays.

### Scope discovered (⇒ SURFACE_TRACKER §2a; Topic Hub and Tutor Scope both stay Settling)
- **The prior audit was wrong three times, and re-verification at trunk is what caught it.** (a) ops coupling 2 → **16**; (b) `ConceptSpine.test.tsx` asserts "Teach me" in **three** places, not two — the missed one (`:107-110`) would have landed the PR **red**; (c) deleting `pages/TopicHub.tsx` is **forced**, not optional, because it imports `ConceptTeachDrawer`. **An audit is a starting hypothesis, not a spec — re-derive its load-bearing counts before planning around them.**
- **`[FU-OPS-SCRIPTS-PATH-COUPLING]` is much larger than recorded.** ~27 ops scripts hard-read product files by path; none are CI-gated, so the coupling rots invisibly until a deletion exposes it.
- **A second lane has now left residue behind the over-broad `App.tsx` freeze** (`[FU-APP-TSX-FROZEN-RESIDUE]`, joining `[FU-APP-TSX-DEADCASE-+-OVERLAY-FREEZE]`). Two independent lanes blocked by the same guard is the argument for narrowing it from "App.tsx zero-diff" to "the relevant route elements unchanged".

---

## 2026-07-18 - Check & Improve convergence arc (#466 → #470, trunk `2c59dd2`)

Decisions ruled by the owner across the arc, and the scope it discovered after C&I was first planned.

### Owner decisions
- **The convergence is a PREREQUISITE, not a cleanup.** The tutor is to host Quick Practice + Check & Improve as **in-tutor overlays**. C&I could not live in an 820px overlay panel because `useIsDesktop()` measures the **window, not the container** — an 820px panel on a 1440px window would have mounted the 2,734-line desktop twin inside it. So the twin split had to collapse into one container-relative component *before* the overlay work. Sequenced deliberately ahead of it.
- **Northstar = the desktop file; the mobile twin is discarded, then deleted.** #466 converged onto `DesktopCheckImprovePage.tsx` and left the twin unrouted for a one-line rollback; #468 deleted it once live-verified. A pure deletion stays separately revertible.
- **The mobile title: 2 lines at 22px, NOT one line at 16px.** The agent measured (headless Chromium) that one line needs ~16px — which equals MobileShell's own 16px chrome title, turning the page H1 into a label. Owner ruled the two-line 22px treatment (`clamp(22px, 6vw, 30px)`); the 30px desktop max is unchanged.
- **The lede is deleted at both widths** (not shrunk, not mobile-only) — every clause already ships in How-it-works steps 3/4 + the relocated "We never invent a score".
- **The anchored MI moat check is a HARD gate, not advisory** — a moat guard that can be skipped is not one. #469 anchors it to the fixed SHA `e8f75af` so the 52 surviving MI lines must stay byte-identical forever; a legitimate future change must consciously re-anchor.

### Scope discovered (⇒ SURFACE_TRACKER §2a; C&I Scope stays Settling)
- **13 `matchMedia("(max-width:960px)")` layout sites** in the "desktop" twin (an `isNarrow` flag through both grids). The convergence was structurally larger than "delete a twin" — and the file satisfied the old rule ("never `useIsDesktop`") while committing its exact sin via a hand-rolled `matchMedia`. The rule was rewritten from a named hook to a behaviour ("no window-derived value drives layout") so a rename can't evade it.
- **The CI acceptance gate had never run its hardest checks.** `quality-gate.yml` used `actions/checkout@v5` at default depth 1, so the base ref was absent in CI and the MI + FORBIDDEN checks silently skipped on every run — including #466's "fully green". Fixed: `fetch-depth: 0`, a fixed-SHA MI anchor, PR-scoped FORBIDDEN, and **a needed-but-missing ref now HARD-FAILS in CI instead of skipping**. This is the second gate in this repo to silently never run (the predecessor lived in the wrong directory).

### Corrections the arc forced (a spec is a CLAIM, not evidence — every fix came from running a command)
- **The `flex-basis`.** `flex: 1` = `flex-basis: 0%`; a zero-basis title block never demands width, so the `flexWrap` already written in the header could never fire. Found by reading the computed style, not the source.
- **The title floor.** The spec's `~18-19px` estimate assumed 328px content; the real content at 360px is **288px** (MobileShell adds 20px each side the estimate missed), so one line needs ~16px. Measured with Playwright.
- **The D4 "last photo" claim.** The spec asserted the lede was the last student-visible "photo"; `"Photo from your phone"` (the QR-delivery label the dropzone renders) was a second one — classified by eye off grep output, immediately after instructing the agent to read instead of grep. Found by reading the lines.

---

## 2026-07-16 - Grader `objective` flag + attempt-dedup `mode` drop (#445, trunk `ad2a9b2`)

Decisions (owner, at #445's pre-flight STOP) + the corrections the pre-flight forced.

### Owner decisions
- **★ INLINE over EXTRACTION for the five step-mark chips — a SEQUENCING call, not a quality judgement.** The chip is re-implemented inline at five sites with no shared component. The owner ruled: **do the minimal inline patch now; file the extraction as an explicit follow-up.** Reasoning (the agent's, adopted): the `objective` flag is **load-bearing**, and **two lanes (QR PR-2, the §7 paywall gate) were waiting on `SolutionChecker.tsx` specifically** — widening the diff into a cross-surface extraction (C&I ×2, worksheet, print doc) would hold both lanes longer for a change that **alters no behaviour**. **[FU-STEPMARKCHIP-EXTRACTION] filed with the "one fix isn't one fix" framing so it does not get lost.** *Generalising rule: when a narrow fix unblocks other lanes, ship the fix and file the cleanup — never bundle a refactor into a critical-path diff.*
- **§2 + §4b ship as ONE PR; §7 (paywall) as its own.** Ratified the agent's sequencing: §2/§4b share one root (nothing client-side can tell an objective question), so they belong together; §7 is a **real monetisation behaviour change**, deserves its own reviewable diff and revert handle, must land **after** the urgent cloud-auth lane, and — decisively — **both touch `SolutionChecker.tsx`**, so folding §7 in would mean the agent fighting itself in one diff **and** holding the QR seam hostage to a monetisation review.
- **The §7.7 test is authored NOW but lands with §7.** Written while the distinction was fresh, parked at `scratchpad/PR2-paywall-7.7-test-DRAFT.mjs`, explicitly **not** merged into #445.

### ★ Corrections the pre-flight forced (a handoff is a CLAIM, not evidence)
Three of the prior handoff's claims were **right in conclusion, wrong in reasoning** — the owner independently verified all three against source before ruling:
- **The stale baseline.** The handoff said "#442 is OPEN"; it had **merged** (`c07ce79`), and the shared checkout `C:\Projects\Lazytopper-Production` sat **4 commits behind** `origin/base`. **Re-derive the tip, always** — the doc's own "never trust a written SHA" applied to itself.
- **The double-count repro ORDER.** "type → grade → click" is **unreachable**: `PracticeQuestionCard:407`'s own comment (*"Discoverability nudge after a wrong MCQ"*) confirms **click-first** is the true gate. The real trigger is click-wrong → reveal → grade.
- **The "unreachable banner" REASON.** `checkSolution.cjs:401/754` confirm the clamp is gated **only** on `questionIsObjective`, with **no marks condition** — so the "1-mark ⇒ unreachable" justification was false even though *safe to delete* was right.

**Owner's framing, recorded because it is the durable lesson:** *"Right answer, wrong reason — and a future reviewer trusting the wrong reason would draw a wrong lesson from it."* Hence the banner's deletion comment states the **corrected** reason (dead by data invariant + surface gates, **not** by the clamp).

### Discoveries
- **★ Blast radius beyond the named sites.** The owner's own grep found 12 files touching `marksAwarded`; exactly **five** render the misleading chip — but the flag had to thread through the **TYPES** those chips render (`WorksheetQuestionGrade`, `CiGradedQuestion`, four print-props builders), *not* the grader response directly. Saved by the client's **generic passthrough parse** (no grade-service edit). **Rule: trace to the TYPE the renderer consumes.**
- **The test home.** Provable properties belong in the **CI-gated matrix** (node — runs on Windows AND in CI), never Codespaces-only vitest ([FU-CI-GATE-VITEST]). To import the REAL dedup function rather than text-scan it, `attemptDedupKey` was extracted to a **dependency-free** module (`practiceInsights.ts` pulls firebase at module load and cannot be transpiled standalone). **Both negative controls were mandatory** — a test that cannot fail is theatre.

---

## 2026-07-10 - Worksheet context-aware entry + multi-topic MI (#357, trunk `aa7e778`)

Decisions (owner, via AskUserQuestion during #357 STEP 0) + discoveries (owner #357 live-verify):

### Owner decisions
- **MI per-topic CAP engages at 3+ topics only.** FIX-3's ~50% cap would have lowered the shipped/owner-verified 2-topic enrichment from 60% (`MI_BOOST=1.5`, the locked "15:10 of 25" prototype) to 50%. Owner chose: cap = **50% at N≥3**, and **N=2 keeps ~60/40**. Implemented as `miCapFractionFor(n) = n≥3 ? 0.5 : 0.6` in `worksheetModel.ts`; `allocateMiCounts` layers a floor + this cap + an availability gate on the tested `allocateCounts` primitive (untouched).
- **Home "Worksheets" card → `/practice-hub`** (D1) — destination-only. The card is a topic-less entry, so it lands on the hub where the student picks; the hub's worksheet action then opens the builder autofiltered (it already passes the params). No `intent` param. Consequence flagged: the card now shares `/practice-hub` with the Practice card (landing worksheet-focused would be a hub-side follow-up).

### Reasoned deviation from the task spec (FIX-1.2)
- The task said delete BOTH the `topics[0]` entry fallback AND the L176 catalogue-validity reset effect. **Only the ENTRY fallback was deleted.** The reset effect was KEPT because recon proved it is a no-op at entry (the URL-seeded topic is always in the initial catalogue → its guard is false on mount) and it is required for in-app subject/stream switching (deleting it strands a stale topic → permanent blocker). Recorded so a future reader doesn't "finish" the deletion and break in-app subject switching.

### Discovered scope (owner #357 live-verify) — do NOT fix piecemeal
- **[FU-TOPICKEY-UNIVERSAL] (P0).** Surfaces match RAW topic slugs, but the bank stores **51 distinct `topicKey` for ~26 chapters** (25 Title-Case + 26 slug). Four Science chapters (`chemical-reactions-equations`, `acids-bases-salts`, `metals-non-metals`, `reproduction` ≈ **1,180 questions**) return ZERO; `WorksheetGenerator.tsx`'s `q.topicKey === t.key` raw compare also disables enrichment on Title-Case chapters. **Chapter Test and Full Mock carry the SAME defect latently.** A prior audit established the cure: **Phase 1 resolve-everywhere (read AND write) + CI guards; Phase 2 data consolidation** ([FU-BANK-TOPICKEY-NORMALISE], [FU-MI-TOPICKEY-BACKFILL]). Prior piecemeal fixes failed because no guard existed → new variants reappeared. Its own scoped PR.
- **[FU-WS-SCOPE-DERIVE].** Ticking topics in Customise calls `setMultiTopics` but never `setScope`, so scope stays `"topic"`, the URL-sync builds from `validMulti[0]` and discards the other ticks, and `enrichActive` short-circuits. The URL entry path already promotes scope. Fix in the immediate follow-up PR (a tick ⇒ derive scope) alongside [FU-WS-MI-COPY] state 2c.

### Product principle (logged — three instances found in #357 live-verify)
- **A student's selection is intent. If we cannot honour it, we say so. We never silently do something smaller.** Instances: the `topics[0]` guess (fixed); the Customise tick that never derives scope ([FU-WS-SCOPE-DERIVE]); the raw-slug topic match returning zero for Title-Case chapters ([FU-TOPICKEY-UNIVERSAL]).

---

## 2026-06-28 - D-PROG-2 / Build Step 1 CLOSED (grader no-working honesty — subjective deterministic; MCQ residual tracked)

Decision (owner + cofounder, recorded post-PR #301 + #302 + #303):
Build step 1 of the locked critical path (D-PROG-7) is closed for its designed scope. The no-working honesty
fix is deterministic on subjective answers across both grading surfaces. Three residuals are tracked as
separate queued PRs — none are regressions.

### What shipped

**PR #301 (trunk `19b4ef8`) — Check & Improve path (`handleCheckSolution`):**
- Prompt rule 7: no working shown → `mistakeType` null, never auto-"conceptual"; status stays incorrect.
- Deterministic guard: `status === 'incorrect' && !studentWork?.trim()` → null the type, tally `noWorkingNulled`.
- `rawAdjusted` reconcile: `max(0, rawSummary[cat] - noWorkingNulled[cat], stepFloor[cat])` — closes the
  `rawSummary` leak so a model that ignores rule 7 can't fabricate a bucket via its self-reported summary.
- 7/7 vitest (Codespace, Node 22), CI green, owner live-verified C&I.

**PR #302 (trunk `c5e148d`) — Worksheet path (`gradeStructuredSet` / `normaliseStructuredResult`):**
- Mirrors #301 exactly: prompt rule 5 (same wording + MCQ "(d)" example), same guard, same reconcile.
- `handleCheckSolution` left byte-identical (confirmed by byte-review of pushed diff).
- 7/7 vitest driving `handleGradeWorksheet` (not `handleCheckSolution`), CI green.
- Owner dual live-verified: no-working subjective → 0 in four-type breakdown every time; worked wrong →
  typed correctly; scorecard math unchanged; Check & Improve unchanged.

**Key architectural finding (recorded for all future grader work):**
`checkSolution.cjs` contains TWO separate grading functions — `handleCheckSolution` (C&I, single question)
and `gradeStructuredSet` → `normaliseStructuredResult` (Worksheet + future Chapter Test / Full Mock,
multi-question). They carry an in-file "keep in sync" comment (~line 547). A change to one is NOT a change
to both. Any future grader change must patch + test BOTH in one PR.

**`mistakeSummary` leak rule (recorded for all future grader work):**
`mistakeSummary = max(LLM rawSummary, stepFloor)`. Suppressing a per-step `mistakeType` fixes `stepFloor`
but NOT `rawSummary`. Every per-step suppression must also subtract the suppressed count from `rawSummary`
before the max (`noWorkingNulled` pattern), in BOTH functions, or the fabricated bucket leaks to the student.

### Three tracked residuals (not regressions — queued PRs)

**[FU-WORKSHEET-MCQ-OBJECTIVE-GUARD] — Deterministic MCQ honesty (MUST land before PR-B)**
A wrong MCQ writes the chosen option ("(d)") into `studentWork` (non-empty), so the empty-working guard
can't fire. Honesty rides on the prompt rule only (~40% effective on live runs). The fix is deterministic:
forward `section`/`format` from the client payload through the server mapper, then apply the existing
`isObjectiveType(qType, section)` helper in `serverUtils.cjs` — a wrong objective step → `mistakeType`
null regardless of `studentWork`. The Quick Practice surface fixed this as G1 (June 21 session, "MI-Loop
Stage 2 PR 3 — MCQ honest capture"); this PR applies the same principle to the worksheet grader.
Scope: `worksheetGradeService.ts` (client payload) + `checkSolution.cjs` (server mapper + guard extension).
Do NOT use `marks === 1` as a proxy (fragile — 1-mark subjective answers exist). Use `isObjectiveType`.
Must land before PR-B so the durable history is built on honest MCQ data from day one.

**[FU-WORKSHEET-NON-ATTEMPT-TEXT] — "Don't know" / explicit non-attempt text**
A student writing "Don't know" / "Dont know" / "I don't know" produces non-empty `studentWork`, so the
guard can't fire; the model tags it "Concept gap." Semantically identical to no working — the cause is
undiagnosable. Needs a small additional rule: detect explicit non-attempt phrases → `mistakeType` null.
Separate PR, smaller scope than the MCQ guard. Sequence: after the MCQ guard, before PR-B preferred.

**[FU-BANK-ANSWER-POLLUTION] — Bank answer / model-answer junk (~26 files / ~54 strings)**
~26 question bank files in `src/data/questionBanks` carry raw marking-scheme junk in `answer`,
`solutionSteps`, and `finalAnswer`: raw mark-allocation fractions (`1 ½ ½ 1 1 2 3`), stray scheme labels
(`Red Violet`), and source/page anchors (`X_086_31/4/3_Science#Page-`). Student-facing and may skew
grading (the grader reads these polluted model answers). Needs a content-cleaning PR with a mechanical
junk-detector + owner verification. Content lane (`src/data/`), disjoint from the grader PRs.

### Sequencing locked
MCQ objective guard → (non-attempt text, bank cleaning as parallel content lane) → PR-B (step 2).
PR-B must NOT start until the MCQ guard lands — "honest MI before anything persists it" is the invariant.

---

## 2026-06-20 - MockBuilder RETIRED (un-routed + tagged for PR-G deletion; code kept)

Decision (owner, recorded post-PR-D #274):
**MockBuilder is cut from the live product.** Un-route it from the live app and **tag it for deletion** so it joins
the **PR-G legacy set** (alongside dead `TutorDrawerV2`, `MentorPanel`, and old `pages/TopicHub.tsx`). **Keep the code**
for now; PR-G removes it with the rest of the dead set.

Reason:
- **Mistake Intelligence now auto-captures the "hard questions to revisit" need** that MockBuilder was meant to serve
  **manually**. With MI surfacing the questions a student got wrong (and the mistake patterns) automatically, a manual
  mock-building surface is redundant.

Locked choices:
- **Un-route now, delete in PR-G** — no immediate code deletion; the un-route removes it from the live product, and the
  PR-G legacy sweep (which already deletes the dead old-mobile + tutor surfaces) takes the code with it.
- **MI is the replacement path** — the revisit/hard-questions need is served by Mistake Intelligence, not a rebuilt
  MockBuilder. Do NOT reinstate a manual builder unless MI proves insufficient.

## 2026-06-20 - [FU-BOOKMARK-SAVE-QUESTION] logged (future, not a launch blocker)

Decision (owner, recorded post-PR-D #274):
A future **lightweight "bookmark / save this question"** feature — let a student **proactively save a tricky question
even when they answered it correctly** — and **surface saved questions on the Me / Progress page**. **Not a launch
blocker; logged for later.**

Rationale / boundary:
- **Distinct from Mistake Intelligence** — MI captures questions the student got WRONG (auto). This is a **voluntary
  save-for-revisit** for questions worth a second look regardless of correctness. The two are complementary, not a
  substitute for each other.
- **Surface = Me / Progress** — saved questions list lives on Me/Progress (where the student reviews their own state),
  not buried in the practice flow.
- **Scope when picked up:** a save toggle on a question + a saved-questions list on Me; honest empty state; no fake
  pre-seeded saves. Owner-logged; no PR scheduled yet.

## 2026-06-08 - AUTH MIGRATION PR-3 (#210): Clerk teardown — auth is Firebase-only

Decision:
PR-3 removed all remaining Clerk; auth is now Firebase end-to-end. Deleted the gateway custom-token bridge
(`firebaseAuth.cjs` + `/api/auth/firebase-token`) and the Clerk FAPI proxy (`clerkProxyMiddleware.ts`); made
`requireFirebaseAuth` **Firebase-only** (removed the Clerk `getAuth` fallback); removed `clerkMiddleware()`;
dropped `@clerk/express`, `jsonwebtoken`, `jwks-rsa`, and the orphaned `http-proxy-middleware`. Lockfile −162
(whole `@clerk/*` tree gone).

Locked choices:
- **Firebase-only, fail-closed** — with no fallback, `requireFirebaseAuth` returns 503 when Firebase Admin is
  unconfigured (was a silent Clerk-fallback before). So `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  on api-server and `ADMIN_FIREBASE_UIDS` are now **load-bearing** for prod (no Clerk safety net).
- **`jsonwebtoken`/`jwks-rsa` stay as transitive deps** of `firebase-admin` (it uses them internally) — only the
  direct deps were dropped. `http-proxy-middleware` removed (it existed solely for the Clerk proxy).
- **Zero Clerk in CODE/CONFIG** (grep over src/server/package.json = 0), including a scrub of stale "Clerk"
  comments + the `authProvider` default string. The remaining `clerk` matches are **non-code**: gitignored
  `.env.local`, auto-gen `.project_memory` snapshots, `handoff/*` history, and governance/docs
  (`CLAUDE.md`, `FIREBASE_SETUP.md`, `docs/desktop-graduation-state.md`).
- **Governance/docs scrub deferred to its own owner-reviewed PR** — `CLAUDE.md` and instruction/doc files were NOT
  edited inside this code PR (avoids mixing governance into a code change; `CLAUDE.md §5` "Clerk stays for now —
  K2H-15" is now obsolete and is the next task).

## 2026-06-08 - PROCESS (refined): docs-only auto-merge excludes governance files

The docs-only auto-merge permission (handoff/* + pure-doc `.md`) **excludes `CLAUDE.md` and any
governance/instruction file** — being `.md` is not sufficient; if it steers how the agent or repo behaves it
always needs the owner's explicit merge. (Supersedes the 2026-06-08 grant's wording.)

## 2026-06-08 - AUTH MIGRATION PR-2 (#208): frontend Firebase Auth — Google popup + one-step email/password

Decision:
PR-2 rebuilt the frontend on direct Firebase Auth and removed Clerk from the client (`@clerk/react` dropped,
`ClerkProvider` out of `main.tsx`). Two owner-confirmed UX/mechanism choices:
- **Google = `signInWithPopup(GoogleAuthProvider)`** for PR-2 (no new env var / external script). True GIS
  **One-Tap** (the floating auto-prompt) is deferred to a small follow-up because it needs a Web OAuth client ID
  (`VITE_GOOGLE_CLIENT_ID`, not yet provided) + the `gsi/client` script. The "Continue with Google" button +
  popup already deliver the browser-profile experience; the One-Tap sub-line copy is kept.
- **Email = one-step** (email + password fields shown together → `signInWithEmailAndPassword`), password-based,
  **no magic link**. The v2 prototype showed an email-only first view; one-step matches "indistinguishable from
  today's Clerk card" and avoids a two-step flow. (Agent asked both before building — never guess on auth UX.)

Other locked choices:
- **Façade is additive** — added `signInWithEmailPassword` / `signUpWithEmailPassword`; no existing
  `AuthContextType` member changed → the ~38 `useAuth()` consumers are untouched.
- **Phone tab present but disabled** in PR-2 with an honest "arrives shortly" note (handler lands in PR-4) —
  honest-empty-state, no fake/broken action.
- **Admin allowlist rename executed in PR-2** (`ADMIN_CLERK_UIDS` → `ADMIN_FIREBASE_UIDS`) — the functional
  forward-correction from the PR-1 decision: once the client sends Firebase tokens, `req.userId` is a Firebase
  uid, so the allowlist must hold Firebase uids. Value migration = owner bootstrap (sign in once → capture uid →
  set env).
- **Local-dev/E2E anonymous-session path preserved verbatim**; `firebaseReady` now reflects `firebaseConfigured`.

Verification (owner-directed): email/password + `getIdToken()` are domain-independent, so verified headlessly in
the Codespace against the real `lazzyy-topper` project (public web config) — decoded token `iss =
securetoken.google.com/lazzyy-topper`, `aud = lazzyy-topper` (a Firebase token, not Clerk). Throwaway account
deleted; nothing committed. The Google **popup** is owner-verified on an authorized domain (headless can't drive it).

## 2026-06-08 - PROCESS: docs-only PRs may be agent-auto-merged (handoff/* + .md ONLY)

Owner granted standing permission to **self-merge docs-only PRs** (the `docs/handoff-post-pr<N>` updates). Gate
before any auto-merge: run `git diff --name-only` and confirm **zero** code / config / schema / question-bank /
auth / CI files — every path under `handoff/` or a `.md`. If even one non-doc file appears, STOP and wait for the
owner's merge. All other PRs (product/auth/infra) still require the literal "approved" + owner merge.

## 2026-06-07 - AUTH MIGRATION PR-1 (#206): Clerk-fallback = OPTION B (keep @clerk/express through PR-1/PR-2)

Decision:
For the PR-1 dual-accept transition (the api-server edge must accept BOTH a Firebase ID token and, temporarily,
the existing Clerk token until PR-2 switches the client), the Clerk-fallback verification uses **Option B**:
keep `@clerk/express` mounted and reuse its already-verified `getAuth(req)` for the fallback. `requireFirebaseAuth`
tries Firebase `verifyIdToken` first → `req.userId = uid`; on failure it falls back to Clerk `getAuth(req)`.
`@clerk/express` + the Clerk fallback are removed **together in PR-3** (Firebase-only).

Why B (not A):
The Clerk fallback is **throwaway code** alive only for the PR-1→PR-2 window. Option A (hand-roll Clerk JWT
verification with `jwks-rsa` + `jsonwebtoken`, à la `firebaseAuth.cjs`) would add new security-critical code on
the most sensitive surface — code that can't be compile-checked on the Windows box — plus new workspace deps and
more lockfile churn, all for a path deleted two PRs later. **We never write fresh auth-verification code that
lives for two PRs when an already-verified path exists.** B is lower-risk on every axis: no new code on the auth
surface, no new deps (only `firebase-admin` is added in PR-1), cleanest lockfile.

The contradiction this corrects:
The build doc (`AGENT_auth_migration_build_4PRs.md`) listed BOTH "drop `@clerk/express` in PR-1" AND "fall back to
Clerk verification in PR-1" — mutually exclusive (you can't call Clerk's `getAuth` if you've removed the package).
The agent flagged it; owner confirmed B. The **"drop `@clerk/express`" line is corrected → moved to PR-3.**

Decisions locked (2026-06-07):
- OPTION B — `@clerk/express` stays mounted through PR-1/PR-2; `clerkMiddleware()` + `clerkProxyMiddleware` stay
  in `app.ts` (untouched in PR-1). NO `jsonwebtoken`/`jwks-rsa`. Removed together with the fallback in PR-3.
- ADMIN ALLOWLIST RENAME MOVES TO **PR-2** (not PR-3) — `admin.ts` checks `req.userId` against `ADMIN_CLERK_UIDS`
  (Clerk ids). Once PR-2 makes the client send Firebase tokens, `req.userId` is a Firebase uid → admin routes 403
  until migrated. So `ADMIN_CLERK_UIDS → ADMIN_FIREBASE_UIDS` (rename + revalue) lands in PR-2, with a bootstrap:
  owner signs in once via Firebase → capture uid → set `ADMIN_FIREBASE_UIDS`. PR-1 kept the old name (forward
  correction; the in-code comment still says "PR-3" — PR-2 updates it).
- DEPLOY ENV (Railway) — `artifacts/api-server` now needs `VITE_FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_KEY`
  (or ADC) to verify Firebase ID tokens; fold into the INFRA-4 backend-deploy checklist.
- LOCKFILE + LINUX GATES IN CODESPACES — PR-1 added `firebase-admin` to `api-server`; lockfile regenerated on
  pnpm 10.32.1 in a Codespace (Windows can't), committed in the PR. api-server `typecheck`/`build` + both matrices
  were run in the Codespace (CI does NOT typecheck api-server) — all green. See CURRENT_STATE (#206).
- BACKLOG (separate small gated PR, NOT this docs PR): add an `apiServer` lane to `repo_boundary_policy.json` so
  future `artifacts/api-server` PRs get a real `scope:guard` PASS instead of `[unclassified]`. Tracked in
  OPEN_QUESTIONS [D47].

## 2026-06-07 - DE-REPLIT COMPLETE (#199 + #204): repo fully @replit-free; infra arc closed

Decision:
The two-PR de-Replit is merged. PR-A (#199, `fec2f92`) removed the lockfile-safe scaffold + the dead
`lazytopper-app/src` stub; PR-B (#204, `5441060`) removed the `@replit/*` packages, `@replit/connectors-sdk`,
and the 3 non-product stub packages (`lazytopper-video`, `mockup-sandbox`, `lazytopper-mobile`) atomically
with the lockfile regen. Repo is now fully `@replit`-free (manifests + source + lockfile); workspace 12 → 9.

Decisions locked (2026-06-07):
- TWO-PR SPLIT BY LOCKFILE COUPLING — the lockfile-SAFE deletes (scaffold, stub src, root build-script filters)
  went first (PR-A) so they could land + be validated on the Windows box; everything that changes a lockfile
  input (package removal, importer/dir deletes, catalog) was held for PR-B as ONE atomic change. Splitting the
  `@replit` package removal from the `lazytopper-app/vite.config.ts` edit would break the build → same PR.
- LOCKFILE REGEN IN CODESPACES (linux), NOT WINDOWS — the Windows box cannot regen: the `minimumReleaseAge`
  guard needs registry `time` metadata that the local install couldn't fetch (`@clerk/backend
  ERR_PNPM_MISSING_TIME`). Regen on linux/pnpm 10.32.1 (the #201 path), matching what CI pins. Do NOT regen on
  Windows. Do NOT disable `minimumReleaseAge`.
- PR-B PUSHED INCOMPLETE-BY-DESIGN, PR HELD — the A–E source edits were pushed with an intentionally-stale
  lockfile (commit flagged `[LOCKFILE REGEN PENDING]`); the PR was opened only AFTER the Codespace lockfile
  commit landed, so the new CI's first run was on the COMPLETE atomic set (a stale-lockfile PR = false-red).
- KEEP `api-server` + `lazytopper-app` + `lazytopper` — `api-server` is the real backend; `lazytopper-app` is
  the vite build OUTPUT TARGET (kept as a shell after its stub src went in PR-A); `lazytopper` is the product.
  Only the 3 confirmed non-product stubs were removed. The product is ONE responsive website (no native app).
- RUNTIME AI-PROXY REWIRING IS SEPARATE (INFRA-4b) — `claudeClient.cjs`'s Replit-proxy → direct Anthropic API
  is NOT part of de-Replit scaffold cleanup; it lands with the backend deploy + the owner's API key.

## 2026-06-07 - CI ACTIVATED (#198): quality gate live; pnpm pinned 10.32.1; ripgrep in CI; D39 resolved

Decision:
PR #198 is merged (squash, trunk `9d772cba602afcbae025b63f93b439dc9d38ebd0`). GitHub Actions CI is LIVE for
the first time, gating every PR into `base/approved-thru-437` (+ push to it). D39 RESOLVED. The stale-lockfile
blocker that parked #198 last session was cleared on trunk by #201.

Decisions locked (2026-06-07):
- WORKFLOW AT REPO ROOT, FULL BAR — `.github/workflows/quality-gate.yml` gates pnpm `--frozen-lockfile` →
  root `scripts` `test:matrix:all` (175/175) → lazytopper `check:mojibake` → linux `vite build` →
  lazytopper `test:matrix:all`. The old mislocated `lazytopper/.github/workflows/mojibake-guardrail.yml`
  (a subdir → never registered → zero runs ever) was deleted. Triggers scoped to trunk (not bare `on: push`).
- PIN pnpm 10.32.1 IN CI (not 11) — it's the version #201 regenerated + frozen-verified the lockfile with,
  AND pnpm 11 leaves `npm_config_user_agent` empty for the workspace-root lifecycle script on linux, tripping
  the root `preinstall` guard (`case ...pnpm/*` → "Use pnpm instead"). Do NOT bump CI to pnpm 11 without first
  fixing that guard. (Root cause is the absence of a `packageManager` pin — see OPEN_QUESTIONS follow-up.)
- INSTALL ripgrep IN CI, don't degrade the audits — the ops acceptance scripts deliberately use `rg` (no
  fallback); ubuntu-latest lacks it. Fix the environment (install the tool), not the check.
- ops tests made CROSS-PLATFORM (3rd commit, owner-authorized scope-add into #198, NOT a separate PR) —
  `bsre_spike:50` + `trig_legacy_retire:29` path separators → `[\\/]` regex. These dormant-on-Windows bugs
  only matter because #198 turns on linux CI and can't be CI-verified without it → same concern, kept as a
  distinct legible commit. BSRE is LIVE product code (TopicHub tutor `/api/mentor`) — the check stays.
- scope:guard STAYS A LOCAL GATE (not in CI) — it inspects the local working-tree diff (staged/unstaged/
  untracked), so on a clean CI checkout it classifies nothing → trivial false-PASS. Wiring it to a PR diff
  would mean rewriting scopeGuard.mjs (out of #198's lane).
- NO PRODUCT-PR AUTO-MERGE (deferred) — the human merge gate is retained until CI has proven runs-and-gates
  over a series of real PRs; auto-merge, if ever, starts narrow (docs-only). Proven-it-gates this PR via a
  planted-regression probe (PR #202 → red on mojibake → torn down).
- SQUASH MERGE — matches the trunk `title (#N)` convention; the 3 commits remain legible inside the PR.

---

## 2026-06-04 - CONTENT SWEEP merged (#188): 93 banned out-of-syllabus entries DELETED; gating syllabusGuard GREEN

Decision:
PR #188 is merged. The syllabus-correctness arc is CLOSED: verified → guard corrected (#186) → content
swept (#188). The gating `syllabusGuard` now exits 0 and `test:matrix:all` = 175/175 (incl. #19).
Trunk after #188: `e0395fcbfeaf9d366afd4b93fb1514604363771f`.

Decisions locked (2026-06-04):
- DELETE, NOT RETAG (owner, final) — every leaked entry for an out-of-2026-27 topic (deleted or
  formative-only) was DELETED. Predicting/teaching them as board-relevant is wrong; LazyTopper is
  strictly board-prep. No "not-assessed" tag was added.
- REWRITE-TO-STAY-ACCURATE for blurbs/teach-contracts — where deletion would leave a broken fragment
  (topic blurbs, topic-hub sections, tutor teach-steps), the content was rewritten to describe the
  CURRENT in-syllabus topic correctly rather than deleting the word and leaving an incoherent surface.
- AUTHORED TEACH-STEPS WERE STRUCTURALLY REQUIRED — `TopicTeachContract.keyIdeas` is a fixed 4-tuple
  `[string, string, string, string]`. Removing banned teach-steps left 3-item arrays that fail the
  type; the production build (`tsc -b`) caught this (TS2322) even though `tsc --noEmit` did NOT. So the
  in-syllabus replacement steps (marked `[content-sweep 2026-06-04]` in real-numbers, heredity, and
  magnetic-effects) were NOT gold-plating — the type system demanded them. Keep them.
- GUARD IS THE SPEC — `syllabusGuard.ts` was NOT touched; content conforms to the guard, not vice
  versa. `predictionTypes.ts` schema frozen. The guard going GREEN is the proof the sweep is complete.
- SCOPE-GUARD `--mode product` FAIL is a LOCAL path-prefix artifact (combined repo: diff emits
  `lazytopper/src/...`, policy rule is `src/`), NOT a real lane violation. Surfaced; not hacked around.
- POLYNOMIALS DIVISION-ALGORITHM LEAK DEFERRED (D31) — out of the 93-item worklist scope and not
  guard-flagged (the surface scan omits bare "Division Algorithm"); tracked as a follow-up rather than
  expanding this PR.

---

## 2026-06-04 - syllabusGuard + registry CORRECTED to official CBSE 2026-27 and EXTENDED to all board-prep surfaces (#186)

Decision:
PR #186 is merged. The syllabus RULER (guard + registry) is now verified-correct against the LIVE
official CBSE 2026-27 Class X syllabus (Maths 041/241, Science 086, cbseacademic.nic.in) and the
owner-signed-off `report-syllabus-verification-2026-06-04.md`. Trunk after #186:
`918b754fe6fe08eb9ba7ab7a2cfc3b70993544a7`.

Decisions locked (2026-06-04):
- SYLLABUS VERIFIED AGAINST THE LIVE OFFICIAL SOURCE — the owner-signed-off verification report is the
  authority, NOT memory and NOT the old ban list.
- STEP DEVIATION UN-BANNED — it is IN the official Statistics scope ("…direct, assumed mean and step
  deviation method"). The prior ban was a correctness bug.
- REPRODUCTIVE HEALTH RESTORED TO IN-SCOPE — family planning / safe sex vs HIV-AIDS / child bearing is
  board-assessed (official Unit II). The registry's exclusion of it was a HIGH-priority bug (it also
  contradicted the registry's own meta). Moved into `cbse_scope_bullets`.
- HEREDITY / MENDEL / SEX-DETERMINATION PRESERVED (board-assessed) — only the Evolution SECTION is
  out. Sub-topic precision is enforced two-way: banned evolution terms caught, preserved heredity
  terms never flagged (test-asserted).
- 3 CONFIRMED-OUT MATHS ITEMS ADDED — Area of Triangle in Coordinate Geometry; Conversion of Solids;
  cubic zeroes–coefficient relationship (Polynomials restricted to quadratic).
- STRICTLY-BOARD-PREP DOCTRINE (owner, final) — formative-only topics (Periodic Classification, the
  Evolution section, Motor/EMI/Generator) AND truly-deleted topics (Sources of Energy, Management of
  Natural Resources) are EXCLUDED from ALL board-prep surfaces INCLUDING THE TUTOR. Formative-only
  topics remain valid QUESTION-BANK subtopics (formative practice) — so they are surface-excluded
  (`SURFACE_BANNED_PHRASES`) but NOT in the question-bank `bannedSubtopics`.
- GUARD EXTENDED VIA CURATED PHRASE-SCAN — only unambiguous content-specific phrases; bare generics
  (Evolution, Generator, Motor, Fossil, Constructions, …) deliberately excluded to avoid false
  positives on prose ("gas evolution") and code identifiers (`dailyMixGenerator`). This honours the
  HARD RULE "never let a generic term over-match in-syllabus content."
- TWO STALE DOCTRINE-LOCKS CORRECTED (owner-authorized "correct both now") — the registry-acceptance
  reproductive-health check (was asserting exclusion) and opsAcceptanceGuard Block 4b (whole-file
  substring) encoded the pre-correction doctrine and were corrected so the only remaining red is the
  intended sweep worklist.

Implication:
The gating guard is intentionally RED on a 93-item sweep worklist. NEXT product PR = the CONTENT SWEEP
(clean the leaks → gating guard + matrix #19 green), run against THIS corrected guard. Then fresh Exam
Trends tiering (D27) → band redesign → the other Option-B surfaces.

## 2026-06-03 - Exam Trends ranked-list responsive redesign merged (#184); band redesign decided as NEXT iteration

Decision:
PR #184 (Exam Trends ranked-list responsive redesign) is merged — the FIRST Option-B convergence.
Trunk after #184: `93a26749e1e6a74819af6e8388e332df8d8b48d3`.

Details / decisions (locked 2026-06-03):
- EXAM TRENDS = FIRST OPTION-B CONVERGENCE — TEMPLATE FOR THE REST. One responsive component
  `src/pages/ExamTrendsRanked.tsx` renders at every width and retires BOTH twins
  (`DesktopExamTrendsPage.tsx` + `app/ExamTrends.tsx`); `App.tsx` `/exam-trends` route de-split.
  The remaining surfaces (TopicHub, Check & Improve, Me/Progress, Worksheet) follow this exact
  shape: one component per surface, retire both twins, preserve the shared design grammar exactly,
  no fabrication.
- PROOF TAG OMITTED — correct anti-fabrication call. The locked prototype's optional "⟨proofs⟩" tag
  has NO backing field in production topic data (`DesktopTopicSummary` carries no `proof` flag).
  Inventing which topics are "proof topics" would fabricate a UI signal → omitted, surfaced to owner.
  Adding it later requires a real `proof` field in `src/data/` (forbidden lane → explicit scope).
- NEW — EXAM TRENDS "MUST-CRACK / HIGH-ROI / GOOD-TO-DO" BAND REDESIGN IS THE NEXT ITERATION. Reuses
  the existing real `tier` enum concept (already used by strategyEngine / dailyMix) and the merged
  ranked-list rows, grouping them into three expandable priority BANDS. Bands replace the
  weight-vs-trend SORT confusion with ONE synthesized priority verdict per topic. PREREQUISITE: the
  tier/trend/marks data must be RE-DERIVED FRESH against current CBSE syllabus + latest paper pattern
  BEFORE banding (the existing priorities are stale/untraceable — see DISCOVERIES D27). Band
  thresholds to be defined after the fresh tiering (see OPEN_QUESTIONS).
- SEQUENCING (locked): content-correctness sweep (D26 — clean banned syllabus terms from descriptive/
  teaching metadata + extend syllabusGuard to scan those files) → re-derive Exam Trends priorities
  fresh (D27) → Exam Trends band redesign → the other Option-B surfaces.

Implication:
Next product PR = content-correctness sweep (HIGH — tutor actively teaches banned content, D26),
THEN fresh tiering (D27), THEN the band redesign. Do NOT band on the stale tiering.

## 2026-06-03 - Tutor teach-style LOCKED + implemented (#182); responsive Option B; Formula/Notes; pivot to redesign

Decision:
PR #181 (desktop tutor wiring) + PR #182 (teach-prompt LOCKED-style tightening) are merged.
Several product directions were locked this session.

Details:
- Trunk after #182: `fd0e7e9398eb6910855f0e1e08e030b71409253b`. B2 committed `8ab00a7`, squash-merged.
- Live concept_teach prompt path = `server/prompts/promptLearn.cjs` + concept branch of
  `buildUserPrompt` in `server/routes/mentorModeHandler.cjs` (NOT promptTeachContract.cjs) — D24.

Doctrine / decisions (locked 2026-06-03):
- TUTOR TEACH STYLE LOCKED + implemented (B2/#182): direct, no fluff/persona/filler-analogy openers,
  on the opened concept (no drift), organized by marks, ends with ONE step-marking offer. On "yes"
  the tutor SOLVES ITS OWN example with CBSE-style step-marking — fabricated by the model, NOT a
  stored-`solutionSteps` lookup. CORRECTNESS IS PARAMOUNT (correctness first, mark-weighting second);
  the eval set must hard-verify fabricated math at scale.
- RESPONSIVE = OPTION B LOCKED: converge the desktop/mobile twin files into ONE responsive component
  per surface (desktop-leads, mobile-adapts at every width), retire BOTH twins, done incrementally
  per surface (not a 1024px twin switch).
- NEW PRODUCT DIRECTION: per-topic Formula Sheet + NCERT-based summary Notes — static, pre-generated
  content that right-sizes the tutor (offload reference material from the chat). Needs a
  content-correctness pass before shipping.
- PIVOT (post-B2 sequencing): move to the end-to-end responsive redesign — Exam Trends ranked-list →
  TopicHub concept-spine (+ Formula/Notes) → Check & Improve → Me/Progress → Worksheet generator.

Implication:
Next product PR = Exam Trends ranked-list responsive redesign (Option B; source
`02_exam_trends_ranked_list.html`). Separate follow-up PRs: interactive-handoff fix
(`findVisualForConcept` returns the WRONG visual), mobile-tutor wiring (mobile `app/TopicHub.tsx`
"Learn" is a placeholder), Formula/Notes generation, AI cost/rate-limit hardening (launch gate).

## 2026-06-02 - PR #178 merged (check-solution grading-prompt tightening; D21 resolved; T4 boundary case)

Decision:
PR #178 (`feat: tighten check-solution grading prompt`) is merged into `base/approved-thru-437`.
D21 (grader over-classifying mistakes as conceptual) is RESOLVED — measured 6/9→8/9 solid on
the T1–T9 scenario matrix against the live local gateway. Scope: `checkSolution.cjs` prompt
strings only (no call-config/schema/data/feature change).

Details:
- New trunk / merge commit SHA: `c760c8eb5c830e64054d516c48d3b5ac85ff523c`. Merged at
  `2026-06-02T09:33:42Z` (squash). Parked branch was rebased onto `7948dc3` (clean) before merge.

Doctrine / decisions:
- Mistake type is classified by CAUSE (what the error reveals about understanding), not by
  where it appears: sign-misread from a correct factor = SILLY (not conceptual); a correct but
  unbalanced equation = PRESENTATION (not conceptual); a propagated downstream error = ONE root
  cause (carried-forward → mistakeType null), never several conceptuals; a wholly-skipped step =
  MISSING (mistakeType null), not a typed mistake; alternative valid method is not penalised.
- **T4 = accepted boundary case (Option 1).** When a student writes the verification VALUES
  (sum/product) but omits the −b/a comparison, "attempted-but-format-short" (presentation) vs
  "step omitted" (missing) is genuinely ambiguous; gemini-2.5-flash is ~50/50 even at temp 0.15.
  Marks are always 2.5/3 and it is NEVER conceptual — only the deducted-mark label flips between
  two defensible values, both conveying the same fix to the student. Not a blocker. The T1–T9
  matrix becomes the permanent regression set and seeds the 40–60-answer eval set.
- Part 2 (teach prompt) deferred to PR B2 — until the tutor is wired/visible (Track A PR-1) and
  measurable against real lessons.

Implication:
Next product PR = Track A PR-1 (tutor wiring, desktop TopicHub). check-solution eval set + the
P0 deploy chain (Railway gateway, Clerk pk_live_) remain ahead of the public student link.

## 2026-06-02 - PR #176 merged (scope:guard re-armed) + owner product decisions

Decision:
PR #176 (`fix: restore repo_boundary_policy.json`) is merged into `base/approved-thru-437`,
re-arming the scope guards. Several owner product decisions were locked today.

Details:
- PR #176 merged 2026-06-02. Base before merge: `1e9bd04` is the merge commit / new trunk SHA.
  Commit `c7d742f`. Changed file: `lazytopper/docs/project_memory/governance/repo_boundary_
  policy.json` (restored from history `d4ed284`; ONE file, no code). Vercel GREEN before merge.
- The break was the untrack in `2081003`, not the `.gitignore` rule — re-tracking is the
  durable fix (`git check-ignore` reports no-match for a tracked file). No `.gitignore` edit.

Decisions (owner, 2026-06-02):
- **3/19 acceptance regressions — DEFER ALL THREE; mark known-red-by-decision.** Investigation
  (report-3of19-regression-intent) proved all 3 are INTENTIONAL product changes, zero accidental:
  - SES-04 (dashboard session player) — session-player arch deliberately deleted (`b891597`),
    replaced by `/daily-mix`. Check is stale.
  - PRG-03 (dashboard "Performance Matrix") — Dashboard rebuilt (`c1afcd3`); matrix →
    `TopicMasteryGrid` (alive). Check is stale.
  - PRG-02 (TopicHub competency) — dropped in the 8025→700 rewrite (`428e3ac`); TopicHub is the
    locked Track A redesign target.
  - Do NOT update/fix any now. SES-04 + PRG-03 resolve as part of the Dashboard→Home/Me-Progress
    consolidation; PRG-02 resolves in the Track A TopicHub redesign. Not to be re-investigated.
- **Dashboard is being retired → Home + Me/Progress** (owner-stated product direction). The
  product has NO Dashboard. BUT the repo still hardcodes `/dashboard` as the post-login landing
  in 3 places (`Login.tsx` fallback ~L594, `HomeRedirect`, `RootEntry` mobile). Desktop `/`
  correctly lands signed-in users on DesktopHome; login-fallback + mobile still go to
  `/dashboard`. → A **Dashboard→Home/Me-Progress consolidation** (fix the 3 hardcoded landings)
  is a tracked Track A / cleanup task. NOT done today.
- **Post-login redirect:** the `?redirect=` / `location.state.from` priority correctly returns a
  gated-mid-action user to where they were (matches "gate at save, return after"). Only the
  bare-login FALLBACK wrongly defaults to `/dashboard` — fixed by the consolidation above.
- **Mistake Intelligence: NOT yet integrated.** Me/Progress does not yet wire to real
  mistake-intelligence data — a separate future PR. "Me/Progress shows real memory-intelligence
  data" is the INTENDED state, not the current one.
- **Daily Mix:** alive + premium-gated (`/daily-mix/:grade/:subject`, "Daily Focus Mix"). It is a
  daily-habit PRACTICE surface (streak/resume/mastery), NOT one of the four hooks (Exam Trends,
  Predicted, Check & Improve, Mistake Intelligence) and NOT mistake/spaced-repetition-driven. →
  Flagged for an explicit owner KEEP/CUT decision (candidate to retire like the session-player).
  Undecided.

Implication:
Next is this docs PR → PR B (Part 1) grading-prompt tightening (sync `feat/check-solution-
grading-prompt` `204ac7c` onto `1e9bd04`, then merge) → Track A PR-1 tutor wiring → PR B2
teach-prompt tightening → Railway deploy. Future implementation starts from `1e9bd04` or
whatever live GitHub later confirms.

## 2026-06-01T16:59:01Z - PR #174 merged; check-solution parse fix + AI gateway live (local) + two-track doctrine

Decision:
PR #174 (`fix: check-solution parse reliability`) is merged into `base/approved-thru-437`.
The AI gateway is now LIVE on local dev (non-stub, direct Gemini key). Owner locked several
product clarifications and a two-track build plan.

Details:
- PR #174 merged at `2026-06-01T16:59:01Z`. Base before merge: `8c161739f7ba7bc8faed897970665e0d94c1eee1`.
- Merge commit / new base SHA: `5ad359c42127ac89056002c226828297ead7c98b`.
- Changed file: `lazytopper/server/routes/checkSolution.cjs` (force JSON + raise token cap).
- QA: PASS (npm run build exit 0; measured before/after on real handwritten image).

Doctrine / decisions:
- Force JSON mode (`responseMimeType:'application/json'`) on any Gemini call that must
  return structured data; give thinking models token headroom. (See D20.)
- Trial = ALL features for 7 days, then free Basic. Gate is trial-not-paywall during the 7
  days. Trial/premium state still server/admin-sourced only — NEVER client-activated.
- Redesign target is FULLY responsive at every width (one fluid layout), not a 1024px
  desktop/mobile twin switch.
- Launch domain = `lazytopper.in` (NOT `.app`).
- PR numbering follows git (#175+); "PR-1..8" Track A labels map to real git numbers.
- Two-track build LOCKED: Track A (design/UI fluid responsive) + Track B (content:
  interactives via Claude, proofs, formula sheets, pre-gen PDFs) with robust content QA.
  Source specs (Learn Flow Spec, Track A PR Breakdown) are owner/architect-held, not yet
  committed to this repo.

Implication:
Next is PR B — grading + teach prompt tightening, MEASURED against a mistake-scenario test
matrix (fixes D21 over-classification) — then a check-solution eval set, then Railway deploy
(now in scope; owner needs a live link for students to test tutor+checker quality). Deploy
ONLY after the checker reliably returns good grades locally. Future implementation starts
from `5ad359c42127ac89056002c226828297ead7c98b` or whatever live GitHub later confirms.

## 2026-05-16T18:55:00Z - PR #80 merged; frozen landing and Explore-first doctrine locked

Decision:
PR #80 is merged into `base/approved-thru-437` as PR-K2H-4. It implements the frozen public landing page and Explore-first browse entry. The landing is now frozen and should not be redesigned casually.

Details:
- PR #80 title: `PR-K2H-4: Frozen landing page and explore-first entry`
- Merged at: `2026-05-16T18:43:48Z`
- Base before merge: `18e6e111884b05795882da75ba4c65f034d9d4e9`
- Head branch: `feat/desktop-pr-k2h-4-frozen-landing-explore-entry`
- Final PR head: `045ffa00a3894405f67a5ceda778f313c693fa0f`
- Merge commit / new base SHA: `018c95b11f5168d27fb93bb3a2cae3859b682627`
- Changed files: 3
- Changed files: `lazytopper/src/App.tsx`, `lazytopper/src/components/desktop/DesktopShell.tsx`, `lazytopper/src/pages/Welcome.tsx`
- QA result: PASS

Doctrine:
- Public landing is now frozen from PR #80.
- Landing has one primary action only: Explore.
- Explore CTA sits after the four-card story and before Mistake Intelligence.
- No Start free trial CTA on public landing.
- No Explore as Guest on landing.
- Browse mode is for product inspection only and must not create a fake guest learner.
- Real learning actions must still require auth/trial gate where already implemented.
- Future changes to `Welcome.tsx` should be small fixes only unless owner explicitly approves a landing redesign.

Implication:
Next implementation should be PR-K2H-5 - Login visual parity + auth gate polish. It must preserve real Clerk auth, no guest mode, reason/redirect handling, safe redirects, and the PR #80 Explore/sign-in funnel. Future implementation must start from `018c95b11f5168d27fb93bb3a2cae3859b682627` or whatever live GitHub later confirms.

## 2026-05-16T02:31:24Z - PR #78 merged; auth/session doctrine and next owner choice

Decision:
PR #78 is merged into `base/approved-thru-437` as PR-K2H-3. It hardens the auth/session shell and pricing honesty while preserving real Clerk authentication. PR #77 is already merged. No open implementation PR should be assumed unless live GitHub says so.

Details:
- PR #78 title: `PR-K2H-3: Auth/session shell hardening`
- Merged at: `2026-05-16T02:26:54Z`
- Base before merge: `0ed0871f3166e647fb5b3e36fb0c1e543df0c145`
- Final PR head: `2067fa5079161c8a888398683d35c3bac59429b0`
- Merge commit / new base SHA: `0addba3f0208c7610d02ab1b1753923fdf0790db`
- Changed files: 11
- QA result: PASS WITH FOLLOW-UP

Doctrine:
- LazyTopper is browse-first and action-gated.
- No real-app guest mode.
- Every real learner should authenticate before real learning actions.
- Sign-in is needed to save attempts, mistakes, progress, and power Mistake Intelligence.
- Do not store credentials, passwords, OTPs, Google tokens, Clerk tokens, or secrets.
- Payment gateway is deferred.
- No fake premium, fake payment, or normal client-side premium activation.
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Use source and returnTo for parent-aware navigation and preserve PR #77 route-context behavior.

Implication:
Next implementation should be chosen by the owner from Login visual parity polish, frozen landing page redesign, or Home continue-card route repair. Future implementation must start from `0addba3f0208c7610d02ab1b1753923fdf0790db` or whatever live GitHub later confirms.

## 2026-05-13T14:49:10Z - PR #75 merged; PR-K2H-1 checked-evidence doctrine

Decision:
PR #75 is merged into `base/approved-thru-437` as PR-K2H-1. It hardens Practice checked-evidence states while preserving PR #73 Practice Level-3 visuals. PR #75 is closed/merged and must not be reopened.

Details:
- PR #75 title: `PR-K2H-1: Harden Practice checked-evidence states`
- PR #75 URL: `https://github.com/chetan-anand-hub/Lazytopper-Production/pull/75`
- Final PR head: `1745ca6f93a73b245f8024a3663318fe9aa0d5f6`
- Merge commit / new base SHA: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`
- Changed files: 3
- Commits: 5
- Completed: checked-answer evidence state hardening, improved SolutionChecker status labels, safer Practice footer/session copy, removal of student-hostile MCQ copy, removal of the MCQ "S" session badge, trusted MCQ click handling as a real answer attempt, wrong trusted MCQ mistake-history logging for eligible signed-in non-local-session learners, and safe CBSE-style step-mark chips for written multi-mark Practice Show Steps when step marks match total question marks.
- Product PR exclusions: no HPQ files, no TopicHub files, no server/API/package/data/env/docs changes.

Data-honesty doctrine:
- MCQ click is a real answer attempt when a trusted key exists.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history is still deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress, mastery, score, weak areas, or Mistake Intelligence were added.
- Signed-in trial users should receive full feature access during the 7-day trial.

Implication:
- Next sequence is docs-only handoff update, then PR-K2H-2 route/context repair, PR-K2H-3 durable MCQ answer-attempt model, PR-K2H-4 advanced Practice filters and selection quality, sign-in/trial enforcement pass, Mock Level-3 detail finalisation, HPQ quality work, then broader production-readiness polish.
- PR #69 / K2D remains separate. Do not merge blindly and do not absorb into K2H without explicit audit and owner approval.

## 2026-05-12T08:16:56Z - PR #73 merged; K2G closeout and K2H graded evidence separation

Decision:
PR #73 is merged into `base/approved-thru-437` as a Practice visual/shell/routing/CTA closeout only. Practice evidence, Mistake Intelligence, and graded answer bridge work must be handled in a separate PR-K2H stage.

Details:
- PR #73 final head: `54638b25c6cf2ca88c1f336a91712e2d1d0108ad`
- Merge commit / new base SHA: `39861a455dd9728dea70924e8e9dea6575bf1208`
- Completed scope: Practice Hub entry, direct full Practice routing, DesktopShell full Practice rendering, HPQ-like visual grammar, CTA mutual exclusion, local-only session honesty.
- Not completed: graded Practice evidence, Mistake Intelligence bridge, saved answer quality, filters, solution-quality audit.
- Manual Browser/owner visual QA broadly accepted.

Implication:
- PR-K2H must be the next active implementation stage.
- Practice local MCQ clicks, self-assessment, and Show steps remain learning support, not saved evidence.
- Do not treat PR #73 as the full graded evidence completion.

## 2026-05-08T18:33:03Z - Manual authenticated QA may substitute for Browser Agent when HPQ preview is gated

Decision:
Manual authenticated QA may substitute for Browser Agent when the premium/trial gate blocks HPQ preview and Browser Agent cannot complete magic-link email authentication.

Details:
- Browser Agent saw the Premium Feature interstitial for HPQ / Exam Trends in guest state.
- Browser Agent cannot access the user's authenticated trial session or magic-link inbox.
- Product owner manually verified HPQ on the Vercel preview while signed in / trial-unlocked.
- Manual QA must include screenshots or explicit QA evidence and be recorded in handoff.
- This substitution does not remove the need for final GPT GitHub diff audit.

Implication:
Classify HPQ Browser Agent QA as inconclusive due to auth/paywall limitation, not as a product failure, when manual authenticated QA covers the gated HPQ preview.

## 2026-05-08T18:33:03Z - Post-PR #72 sequence is Practice details, Mock pages, then question/solution quality

Decision:
After PR #72 merges, the next product sequence is Practice Level-3 detail finalisation, then Mock pages Level-3 detail finalisation, then HPQ question/solution quality work.

Details:
- PR #72 should not expand into question-bank or solution-quality repair.
- Practice detail pass happens next after merge.
- Mock page detail pass follows Practice.
- HPQ question/solution quality begins only after Practice and Mock Level-3 surfaces are finalised, unless the product owner explicitly reprioritises.
- Science/Maths structured MCQ options normalization remains later data-quality work.

Implication:
Do not start question-bank, diagram, solution-cache, or MCQ data normalization work before Practice and Mock pages unless the product owner changes priority.

## 2026-05-08T15:37:18Z - PR #72 HPQ prediction-first execution doctrine

Decision:
HPQ is prediction-first, not a generic Practice mode page. Competency questions belong inside predicted topic-wise stacks, not in a separate top-level exam-format mode.

Details:
- HPQ should lead with predicted/high-probability topic stacks.
- Competency visibility may appear as stack counts and question labels.
- Do not add a main exam-format switch to HPQ.
- Do not surface internal prediction rationale, raw confidence percentages, or guaranteed-style claims to students.

Implication:
Future HPQ work should reinforce prediction-first revision, not convert HPQ into a generic filtering/practice surface.

## 2026-05-08T15:37:18Z - PR #72 HPQ execution-loop data honesty

Decision:
Add to mock remains planning-only until an actual graded mock flow exists. Check my answer and Show steps / Show logic are mutually exclusive per question. MCQ / Assertion-Reason wrong clicks do not log Mistake Intelligence in PR #72.

Details:
- Check my answer is the real checking path for non-MCQ HPQ questions.
- Show steps and Show logic are learning support only.
- Add to mock means local basket/planning only.
- MCQ clicks are immediate feedback only and are not saved as real mistake evidence.
- Mistake Intelligence remains fed only by real checked/grading evidence.

Implication:
Do not claim progress, mastery, score, mock grading, profile save, or Mistake Intelligence from HPQ solution reveal, MCQ clicks, or basket actions.

## 2026-05-08T15:37:18Z - Student-facing API errors are forbidden

Decision:
Raw API/server errors must not be shown to students. HPQ step-solution UI should render student-safe fallback copy and keep technical details to developer logging only.

Details:
- Do not render strings such as `AI API request failed`, `API request failed`, `server error`, `fetch failed`, endpoint names, or stack traces.
- Local HPQ step-solution QA requires both frontend and backend gateway.
- Vite proxies `/api` to `API_SERVER_PORT`; local QA uses port `8080`.
- If `dev:gateway` is not running, `/api/step-solution` fails with `ECONNREFUSED`.

Implication:
Future QA must start the gateway when testing step-solution paths locally and must audit student-facing error copy.

## 2026-05-07T08:00:00Z - Manual QA substitutes for Browser Agent on magic-link auth; Practice/HPQ design grammar issue identified

Decision:
Manual 7-day trial entitlement QA may substitute for Browser Agent when Browser Agent cannot complete auth due to email magic-link inbox access limitation. Trial entitlement is considered manually verified for this K2E checkpoint. Practice and HPQ old-format surfaces require Level-3 / desktop design grammar alignment before final desktop graduation sign-off. PR #69/K2D remains draft and must not be treated as merged.

Details:
- PR #70 / K2E trial entitlement audit merged at 807ca666fd414fc5ce37778ade34479d46013544
- Manual 7-day trial QA passed after magic-link login
- Browser Agent couldn't automate magic-link login; no inbox access
- Trial unlock itself is functioning correctly and is not a blocker
- New product issue: Practice and HPQ pages render in older format, lack updated Level-3 desktop design grammar
- This is classified as visual/design parity issue, not data-honesty failure
- PR #69/K2D remains open, draft, and behind current base

Implication:
- For future trial entitlement testing: consider passwordless/test account for Browser Agent, or use manual QA.
- Practice/HPQ design grammar alignment is now an explicit pre-graduation follow-up.
- PR #69 must be rebased and re-evaluated before merge decision.

Current base:
807ca666fd414fc5ce37778ade34479d46013544

## 2026-05-06T12:00:00Z - PR #66 merged; Vercel production setup verified

Decision:
PR #66 / Vercel SPA rewrite config is merged. Vercel production setup is now verified. K2D has not started.

Details:
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/66
- Final head: 4b37d099447903951d6a44bd623b580a86c330e0
- Merge commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Vercel production deploy source branch: base/approved-thru-437
- Vercel production deploy source commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Production deployment status: PASS / Ready
- Production app route: PASS
- Root redirect: PASS
- Clerk login/auth return: PASS after PR #66
- Production QA Browser Agent URL: https://lazytopper-production-desktop.vercel.app/app/
- QA rule: Browser Agent should use Vercel production/preview URLs with /app/ appended. Do not use the bare root URL except when specifically testing the root redirect.

Implication:
- K2D has not started. Next safe action: confirm future PR branches generate usable Vercel Preview URLs with /app/ appended for Browser Agent QA, then begin PR-K2D planning only after live base verification.

Current base:
fe065fb0d9eb10d134d2baaa29b1010a54007966
## 2026-05-06T00:00:00Z - PR-K2C / PR #62 merged; post-K2C handoff repair

Decision:
PR-K2C / PR #62 is merged. Handoff is now current through K2C. Next stage is post-K2C handoff repair and Vercel-Codex setup. K2D has not started.

Details:
- PR URL: https://github.com/chetan-anand-hub/Lazytopper-Production/pull/62
- Final head: 1cbc1d74243801cd1a5f68345547779ba6e4813d
- Merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873
- Browser QA: PASS
- Changed files: 5

Implication:
- Do not treat K2C as pending.
- Next safe action: finish and merge this docs-only handoff repair PR, then complete Vercel setup and verify /app/ deployment, then start PR-K2D only after live base verification.
- K2D = Missing solution AI fallback. It must distinguish generated AI solution from stored verified solution. It must not claim official CBSE answer unless verified.

Current base:
d9d0d5df1e9de45df4e555b186903070e7b0e873
# LazyTopper Decision Log

## 2026-05-06T04:32:03Z - PR #64 merged; Vercel/Codex verification is next

Decision:
The docs-only post-K2C handoff repair PR #64 is merged.

Evidence:
- PR #64 head SHA: 3a6f7f097e84e130e2cb5e8be2ca4cc011bd8dbc
- PR #64 merge commit: bbd4d457a2349cf34b8ab335e45123f8b306868c
- PR #62 / K2C merge commit: d9d0d5df1e9de45df4e555b186903070e7b0e873

Implication:
K2C is complete. The next safe action is Vercel/Codex setup verification before PR-K2D. Future sessions must verify live `origin/base/approved-thru-437` before starting implementation because docs-only handoff PRs can advance the base after the last recorded checkpoint.

Supersedes:
Any older instruction saying to finish/merge the post-K2C handoff repair PR.

## 2026-05-05T00:00:00Z - K2A and K2B are merged; K2C is next (historical, superseded)

Decision:
PR-K2A and PR-K2B are complete. The next implementation stage is PR-K2C.

Implication:
Future sessions must not treat K2A or K2B as pending. K2C should build worksheet learner-loop entry points using real Check & Improve for grading, while preserving no-fake-data rules.

Current base:
d9d0d5df1e9de45df4e555b186903070e7b0e873

This file records permanent or semi-permanent project decisions that future GPT sessions must not rediscover from scratch.

Newest decisions should be added at the top with UTC timestamp.

## 2026-05-04 — Repo-native handoff system is mandatory

Decision:
The GitHub repo handoff folder is now the primary continuity bridge between GPT sessions.

Implication:
Future GPT sessions must read the handoff folder first and update it before ending.

Files:
- handoff/README.md
- handoff/CURRENT_STATE.md
- handoff/SESSION_LOG.md
- handoff/NEXT_ACTION.md
- handoff/IMPLEMENTATION_ROADMAP.md
- handoff/DECISION_LOG.md
- handoff/OPEN_QUESTIONS_AND_FOLLOWUPS.md
- handoff/templates/session-update-template.md

## 2026-05-04 — GitHub is source of truth

Decision:
GitHub origin is the source of truth for base SHA, PR state, changed files, merge status, and current handoff.

Do not trust:
- stale Replit state
- stale Codespaces state
- old screenshots
- previous GPT memory
- Browser Agent claims without GitHub diff validation

## 2026-05-04 — Codespaces terminal is default executor

Decision:
Use Codespaces terminal-controlled method for implementation unless explicitly changed.

Codex is installed and signed in, but is not primary executor yet.

Codex can be used only when explicitly approved, preferably for:
- read-only code review
- risk checking
- test suggestions
- diff review

## 2026-05-04 — Browser Agent is QA, not source of truth

Decision:
Browser Agent is useful for visual/click QA but cannot override GitHub source/diff validation.

If Browser Agent cannot access Codespaces preview due to certificate, forwarding, port, login, or safe-browsing restriction, classify as:

INCONCLUSIVE — preview access limitation

Do not treat it as a product failure unless the LazyTopper app itself loads and fails.

## 2026-05-04 — Revised Level 3 improvements do not have a canonical finalized prototype

Decision:
There is no finalized canonical prototype for the revised Level 3 improvements.

Use:
- Level 1/2 locked references for visual grammar and route continuity
- historical Level 3 references for behaviour inspiration only
- product-native implementation specs and QA gates for K2 onward

Do not use discarded prototypes as canonical without explicit re-approval.

## 2026-05-04 — Data honesty is non-negotiable

Decision:
Never claim:
- fake mastery
- fake score
- fake saved progress
- fake weak areas
- fake Mistake Intelligence
- fake generated question content
- fake solution content
- fake AI grading
- fake prediction certainty
- hidden persistence

Worksheet generated/saved is not mastery.
Worksheet attempted is not checked.
Checked answer is not mistake logged unless real Check & Improve path logs it.
Mistake Intelligence and Me / Progress require saved checked evidence only.

## 2026-05-04 — K2A must be contract/helper before UI

Decision:
K2A must first create the worksheet profile-save contract/helper.

It must not begin with DesktopWorksheetsPage UI changes.

Rationale:
The current worksheet save is local-only and honestly labelled. A signed-in profile path must exist before the UI can claim profile save, progress, or Mistake Intelligence.
