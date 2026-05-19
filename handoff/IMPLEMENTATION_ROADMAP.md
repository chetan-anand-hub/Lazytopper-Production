# LazyTopper Implementation Roadmap

This roadmap preserves the staged implementation plan after PR #82 merge.

Latest verified live base:
```
base/approved-thru-437
11aac1bc8bce67e6b2d67e540b4295491c0b78e0
```

Current stage:
PR #82 / PR-K2H-5 is merged. Login visual parity + auth gate polish is complete. Next active implementation should be PR-K2H-6 - Home/cockpit learning order + Continue repair.

Current implementation branch:
```
None. Create the next implementation branch fresh from the live verified base after this docs-only handoff update merges.
```

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

Purpose:
Improve Practice selection quality and control.

Scope:
- Section A/B/C/D/E filters.
- Marks filters.
- Type/family filters.
- Competency filters.
- Difficulty filters.
- Count controls.
- Selection quality and dedupe checks.

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
