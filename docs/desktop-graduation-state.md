# LazyTopper Desktop Graduation State

Last updated: 2026-05-16T18:55:00Z UTC / 2026-05-17 00:25 IST

This document is the durable handoff and operating-rule document for LazyTopper desktop graduation. Read this from GitHub at the start of every GPT session or Replit task, then verify live GitHub state directly before acting.

## Current post-PR #80 checkpoint

Current verified handoff base after PR #80 merge: `018c95b11f5168d27fb93bb3a2cae3859b682627`.

PR #80 is already merged. Current base is the PR #80 merge commit. Frozen landing page implementation is now complete and should not be redesigned casually. Explore-first product behavior is now implemented through `/browse`. Login visual parity remains pending and is the recommended next implementation PR. No open implementation PR should be assumed unless live GitHub says so. Future implementation must start from `018c95b11f5168d27fb93bb3a2cae3859b682627` or whatever live GitHub later confirms. GitHub live state always wins over docs and memory.

PR #80 / PR-K2H-4: Frozen landing page and explore-first entry
Status: MERGED
Merged at: 2026-05-16T18:43:48Z
Base before merge: 18e6e111884b05795882da75ba4c65f034d9d4e9
Head branch: feat/desktop-pr-k2h-4-frozen-landing-explore-entry
Head SHA: 045ffa00a3894405f67a5ceda778f313c693fa0f
Merge commit / new base checkpoint: 018c95b11f5168d27fb93bb3a2cae3859b682627
Changed files: 3
Changed files:
- lazytopper/src/App.tsx
- lazytopper/src/components/desktop/DesktopShell.tsx
- lazytopper/src/pages/Welcome.tsx

Scope:
- Implemented the frozen public landing page in production.
- Replaced the old dark/text-heavy landing page with the final visual storyboard landing.
- Final landing has one primary CTA: Explore.
- CTA is placed centrally below the four product cards and above the Mistake Intelligence section.
- Top-right Sign in remains for existing users.
- Removed Start free trial as the landing CTA.
- No Explore as Guest on landing.
- No landing sidebar/app chrome.
- Four-card story preserved: Exam Trends -> Practice -> Check & Improve -> Me / Progress.
- Step captions removed: See what matters / Practice with intent / Learn from mistakes / Track your progress.
- Attempts and Insights pills removed.
- Card internals simplified so cards read as landing previews, not full dashboards.
- Blue arrows aligned with card bodies.
- Mistake Intelligence title/tagline preserved and visible: Mistake Intelligence / Turns mistakes into mastery.
- Bottom benefit strip preserved and visible: CBSE Class 10 Focused; Smart Practice That Adapts; Mistake Intelligence That Improves; Your Progress, Always Saved; Climb Higher, Every Day.
- Added signed-out Explore-first browse entry through `/browse`.
- Explore opens `/app/browse` and does not open Login.
- `/browse` shows product cockpit/shell without creating a guest user/session.
- Existing real action gates/login behavior remain intact.
- Preserved PR #77 route-context behavior.
- Preserved PR #78 auth/session/account/logout/profile/pricing behavior.
- Login visual polish was intentionally not included.

Validation recorded:
- TypeScript passed.
- Production build passed with NODE_ENV=production BASE_PATH=/app/.
- Build verifier passed: 8 passed, 0 failed.
- git diff --check passed.
- Vercel QA passed.
- No Login, Pricing, DesktopHome, Practice, HPQ, Mock, TopicHub, docs/handoff, package, server, env, or data files changed in PR #80.

PR #80 QA result: PASS.

Owner-approved final landing design decisions:
- Landing is a visual explanation page, not a feature-store banner.
- Landing has one primary action only: Explore.
- Explore CTA sits after the four-card story and before Mistake Intelligence.
- Story order is intentional: Study smarter for CBSE Class 10 -> Exam Trends / Practice / Check & Improve / Me / Progress -> Explore -> Mistake Intelligence -> benefit strip.
- This placement reduced top cramping and made the CTA feel like the natural next step after understanding the product.
- No Start free trial CTA on public landing.
- Trial begins only after a user signs in through a real action gate.
- No guest mode or guest session.
- Browse mode is for product inspection only.
- Real learning actions must still require auth/trial gate where already implemented.
- The landing should not be redesigned again unless owner explicitly reopens landing design.
- Future changes to Welcome.tsx should be small fixes only unless owner explicitly approves a landing redesign.

Final browser/Vercel QA:
- `/app/` signed out shows final landing.
- No scroll/overflow on tested desktop view.
- No white band.
- Four cards visible in one row.
- CTA says Explore and sits below cards / above MI.
- Explore opens `/app/browse`.
- Sign in opens login route.
- Vercel QA passed before merge.

## Updated product doctrine after PR #80

Browse-first / action-gated doctrine:
- LazyTopper is browse-first and action-gated.
- Public landing explains product visually.
- Explore lets a student inspect the product cockpit without sign-in.
- Browsing must not create a fake guest learner.
- Real learning actions must route through auth/trial gate as appropriate.
- Signing in is required to save attempts, progress, mistakes, checked answers, and Mistake Intelligence.

Landing doctrine:
- Public landing is now frozen from PR #80.
- Do not use multiple landing CTAs.
- Do not add Start free trial on landing.
- Do not add Explore as Guest on landing.
- Primary CTA text is Explore.
- Top-right Sign in remains for existing users.
- Landing should stay clean, visual, premium, and not text-heavy.
- Landing tells this visual story: Exam Trends -> Practice -> Check & Improve -> Me / Progress -> Mistake Intelligence.

Auth doctrine:
- No real-app guest mode.
- No fake local session.
- No fake user.
- No storing credentials.
- Clerk auth remains for now.
- Future Login PR must preserve real Clerk auth and safe redirect handling unless owner explicitly approves a larger auth strategy change.

Payment doctrine:
- Payment gateway remains deferred.
- No fake premium.
- No fake payment.
- No client-side premium activation from normal UI.
- Manual activation language remains acceptable for now.

Practice doctrine:
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Do not redesign Practice during unrelated PRs.
- MCQ durable evidence and MI bridge remain future work.
- Show Steps is learning help, not grading.
- Check My Answer is the real checking/evidence path.

Navigation doctrine:
- Use source and returnTo for parent-aware navigation.
- Preserve PR #77 route-context behavior.
- Do not hard-code all back navigation to Exam Trends.
- Do not route to old `/trends/:grade/:subject` unless intentionally preserving a legacy route.

## Remaining follow-ups after PR #80

1. Login visual parity / auth gate polish - recommended next implementation PR. Current login is functional but not visually aligned with final landing / Lovable prototype. Future Login PR must keep real Clerk auth, no guest mode, reason/redirect handling, safe redirects, Explore/sign-in funnel behavior, improve visual match to calm split login, address visible development-mode/public auth polish where possible, and avoid payment/pricing/practice/HPQ changes.
2. Clerk friction / auth strategy remains an open product question. Observed flow can include LazyTopper login -> Google account chooser -> Clerk consent/continuation screen -> product. Short-term: polish Login around Clerk. Long-term: evaluate whether Clerk should remain or whether direct Firebase/Google/phone OTP is better for launch. Do not remove Clerk without a dedicated auth architecture PR.
3. Home/cockpit card order follow-up. Owner noted logical learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve. Sidebar already better reflects the learning order. Home cards may still need reordering in DesktopHome in a future PR. Do not mix with Login PR unless explicitly approved.
4. Pricing visual redesign remains pending. Pricing is functionally safer after PR #78 but visually not aligned with final product grammar. Payment gateway remains parked until later pre-launch stage.
5. Continue where you left off route repair remains pending. It can still route to TopicHub "Topic not found." Future small PR may hide the card when saved topic is not curated, route to Practice Hub/Exam Trends, or map to safe topic slug.
6. `/profile` direct-reference cleanup remains pending. PR #78 protects `/profile` via redirect/login handling, but future route-hardening can replace direct `/profile` references with `/me` where appropriate.
7. Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred. Must be server/admin verified. Normal client UI must never mark premium directly.

## Next action after this docs update

1. Verify PR #80 merge commit is the live base: `018c95b11f5168d27fb93bb3a2cae3859b682627`.
2. Complete this docs-only handoff update.
3. After docs merge, start PR-K2H-5 - Login visual parity + auth gate polish.

Recommended PR-K2H-5 scope:
- `lazytopper/src/pages/Login.tsx`
- `lazytopper/src/lib/desktop/loginPrompts.ts`
- Optional only if proven necessary: small Login-only style/helper file if already existing and safe.

PR-K2H-5 must not touch:
- `lazytopper/src/pages/Welcome.tsx`
- `lazytopper/src/App.tsx`
- `lazytopper/src/components/desktop/DesktopShell.tsx`
- `lazytopper/src/pages/desktop/DesktopHome.tsx`
- `lazytopper/src/pages/PricingPage.tsx`
- Practice
- HPQ
- Mock
- TopicHub
- docs/handoff
- package/server/env/data

PR-K2H-5 goals:
- Visually align Login with final landing and Lovable prototype login gate.
- Maintain real Clerk SignIn.
- Remove/avoid any guest CTA.
- Preserve reason/redirect handling.
- Preserve safe redirect behavior.
- Keep explanation of why login matters: saving attempts, progress, mistakes, and powering Mistake Intelligence.
- Do not change auth provider architecture in this PR.
- Record Clerk friction / development-mode branding as a launch-readiness follow-up if not solvable only in UI.

## Previous post-PR #78 checkpoint

Current verified handoff base after PR #78 merge: `0addba3f0208c7610d02ab1b1753923fdf0790db`.

PR #78 / PR-K2H-3: Auth/session shell hardening
Status: MERGED
Merged at: 2026-05-16T02:26:54Z
Base before merge: 0ed0871f3166e647fb5b3e36fb0c1e543df0c145
Head SHA: 2067fa5079161c8a888398683d35c3bac59429b0
Merge commit / new base checkpoint: 0addba3f0208c7610d02ab1b1753923fdf0790db
Changed files: 11
Scope:
- Removed visible real-app guest mode from Login.
- Preserved real Clerk authentication.
- Preserved prototype-style split Login gate functionally.
- Strengthened Login copy around saved attempts, Mistake Intelligence, progress, and 7-day trial.
- Added DesktopShell account menu with identity, trial/premium state, Me / Progress, Manage subscription, and Log out.
- Logout returns the student to public landing.
- Redirected /profile to /me.
- Removed desktop full-width trial ribbon in favor of compact shell/account status.
- Routed Upgrade / Manage subscription to /pricing with source and returnTo.
- Removed normal client-side fake premium activation from upgrade UI.
- Added safe learner account metadata sync without storing credentials.
- Reordered desktop sidebar to: Home -> Exam Trends -> Practice -> Check & Improve -> Me / Progress.
- Payment gateway integration is intentionally deferred.
- Pricing page is honest about manual activation / no automated checkout.
- PR #77 HPQ/Practice/Mock route-context files were not touched.

Validation recorded:
- TypeScript passed.
- Production build passed with NODE_ENV=production BASE_PATH=/app/.
- Build verifier passed: 8 passed, 0 failed.
- git diff --check passed.
- No package/server/data/env/docs/handoff files changed in product PR.
- PR #77 route-context files were not touched.

PR #78 QA result: PASS WITH FOLLOW-UP.

Passed:
- Login removed visible guest button.
- Login showed real Clerk auth.
- Login had no search/header/sidebar chrome.
- Login left panel explained saved attempts, Mistake Intelligence, and 7-day trial.
- Login auto-redirected quickly when Chrome already had active Clerk auth; this is expected and should be tested in incognito/logged-out browser when needed.
- Sidebar order changed correctly.
- Account menu opened and showed identity/trial status/Me/Manage subscription/Log out.
- Me / Progress opened /me, not old /profile.
- Manage subscription opened pricing with source/returnTo.
- Logout returned to public landing.
- /profile route no longer opened old profile page; signed-out access routes through auth gate.
- Trial ribbon removed.
- Pricing no longer claims automated checkout/premium activation.
- PR #77 regression paths were checked and looked okay.

Follow-ups:
1. Login visual parity remains a follow-up. The current login is functionally correct but still does not fully match the cleaner Lovable prototype login page. The right-side Clerk/auth panel still feels visually heavy/old. Future PR should polish Login visual design while preserving real Clerk auth and reason/redirect behavior.
2. Pricing visual redesign remains a follow-up. Pricing is functionally safer and honest, but its design grammar is not yet aligned with the final LazyTopper product/landing design.
3. Home "Continue where you left off" can route to TopicHub "Topic not found." This is a route/content follow-up. Future PR should hide the continue card when the saved topic is not curated, route to Practice Hub/Exam Trends instead, or map to a safe topic slug.
4. Remaining direct /profile references can be cleaned later. PR #78 protects them through /profile -> /me redirect, but a later route-hardening pass should replace direct navigate("/profile") calls with /me where appropriate.
5. Payment gateway is parked. Razorpay/Cashfree/GPay QR/UPI/payment gateway work is deferred until later pre-launch payment work. Future payment activation must be server/admin verified; client UI must never mark premium directly.

## Locked product doctrine after PR #78

LazyTopper is browse-first and action-gated.

Final funnel:
Landing page -> Explore LazyTopper -> browse-mode product cockpit -> student can inspect Home, Exam Trends, Practice picker, and feature surfaces -> student attempts a real action -> login/trial gate appears -> sign in with Gmail/phone OTP if configured -> 7-day trial starts -> exact intended action continues.

Authentication doctrine:
- No real-app guest mode.
- Every real learner should authenticate before real learning actions.
- Sign-in is needed to save attempts, mistakes, progress, and power Mistake Intelligence.
- Do not store credentials.
- Safe account metadata may include uid, email, phone, display name, auth provider, createdAt, lastLoginAt, updatedAt.
- Do not store passwords, OTPs, Google tokens, Clerk tokens, or secrets.

Payment doctrine:
- Payment gateway is deferred.
- Manual activation language is acceptable for now.
- No fake premium.
- No fake payment.
- No client-side premium activation from normal UI.
- Future payment PR must activate premium only after verified payment/admin action.

Practice doctrine:
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Future Practice functionality work must preserve current look and feel unless owner explicitly approves visual changes.
- MCQ clicks are real attempts conceptually, but durable MCQ evidence/Mistake Intelligence bridge is a future careful PR.
- Show Steps is learning help, not grading.
- Check My Answer is the real checking/evidence path.

Navigation doctrine:
- Use source and returnTo for parent-aware navigation.
- Back should return to the actual parent page.
- PR #77 route-context behavior must be preserved.
- Do not hard-code all back navigation to Exam Trends.
- Do not route to old /trends/:grade/:subject unless intentionally preserving a legacy route.

## Historical frozen landing page design target before PR #80

Superseded by PR #80 implementation. Current doctrine is the PR #80 frozen landing: one primary CTA text `Explore`, CTA placed below the four cards and above Mistake Intelligence, no Start free trial, no Explore as Guest, and no casual landing redesign without owner approval.

Historical frozen landing page choices before implementation:
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

Historical landing implementation PR:
PR-K2H-4 or equivalent:
- Implement frozen landing redesign. Completed by PR #80.
- Primary CTA opens browse-mode product cockpit. PR #80 final CTA text is `Explore`.
- Top-right Sign in for existing students.
- Do not create multiple landing CTAs into product actions.
- Action gates appear inside product when student tries to use Practice, Check & Improve, HPQ, worksheet, mock, save/progress.

Next recommended implementation options after this docs update:
1. Login visual parity polish, if owner wants to close visible auth polish first.
2. Frozen landing page redesign, if owner wants to improve public funnel next.
3. Home continue-card route repair can be a small PR if it becomes annoying during QA.
4. Pricing visual redesign later, before paid launch.
5. Payment gateway/manual UPI/payment activation near end before launch.

## Previous post-PR #75 checkpoint

Current verified handoff base after PR #75 merge: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`.

PR #75 / PR-K2H-1 is merged:
- title: `PR-K2H-1: Harden Practice checked-evidence states`
- PR: `https://github.com/chetan-anand-hub/Lazytopper-Production/pull/75`
- final head SHA: `1745ca6f93a73b245f8024a3663318fe9aa0d5f6`
- merge commit SHA: `38f5a56a9a02964b1c6cf49fbd72013da11179ca`
- changed files: 3
- commits: 5
- result: Practice checked-evidence states hardened without broad attempt-history, HPQ, TopicHub, server/API, package, data, env, or docs changes in the product PR

PR #75 is closed/merged and should remain closed.

What PR #75 completed:
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

Data-honesty doctrine after PR #75:
- MCQ click is a real answer attempt.
- Wrong trusted MCQ can feed Mistake Intelligence as objective-question mistake evidence.
- Correct MCQ durable attempt history is still deferred until a broader attempt-log model exists.
- Show Steps is model answer / CBSE-style marking guide, not grading of the student's actual work.
- Check my answer is actual answer checking and richer evidence.
- No fake progress/mastery/score/weak areas/Mistake Intelligence were added.
- Signed-in trial users should receive full feature access during the 7-day trial.

Known follow-ups after PR #75:
- Durable answer-attempt model for correct and wrong MCQ attempts.
- Advanced Practice filters: Section A/B/C/D/E, marks, type/family, competency, difficulty, count.
- HPQ -> Build mock -> Back should return to HPQ, not old Exam Trends.
- TopicHub Board Essentials -> Practise this should open context-aware Practice for that exact concept/focus, not generic topic Practice.
- Sign-in/trial enforcement pass across learning surfaces so Firestore-backed Me / Progress and Mistake Intelligence can work reliably.
- Verify generated step-solution cache / `step_solutions` behavior on deployed environment.
- Mock Level-3 detail finalisation.
- HPQ question-bank / solution / diagram / structured-option quality.

Historical next recommended sequence after PR #75:
A. Docs-only handoff update after PR #75 merge.
B. PR-K2H-2 route/context repair:
   - HPQ Build Mock back navigation.
   - TopicHub Board Essentials concept-aware Practice routing.
C. PR-K2H-3 durable MCQ answer-attempt model.
D. PR-K2H-4 advanced Practice filters and selection quality.
E. Sign-in/trial enforcement pass for learning surfaces.
F. Mock pages Level-3 detail finalisation.
G. HPQ question-bank / solution / diagram / structured-option quality.
H. Broader final polish / production-readiness sweep.

PR #69 / K2D status:
- Remains separate.
- Do not merge blindly.
- Do not absorb into K2H without explicit audit and owner approval.
- Verify live GitHub state before acting on PR #69.

## Current post-K2C checkpoint (historical)

Current verified handoff base after PR #66 merge: `fe065fb0d9eb10d134d2baaa29b1010a54007966`.

Product checkpoint after PR-K2C / PR #62 merge: `d9d0d5df1e9de45df4e555b186903070e7b0e873` (historical)

PR-K2C / PR #62 is merged:
- final head SHA: `1cbc1d74243801cd1a5f68345547779ba6e4813d`
- merge commit SHA: `d9d0d5df1e9de45df4e555b186903070e7b0e873`
- Browser QA: `PASS`

PR #64 is merged:
- final head SHA: `3a6f7f097e84e130e2cb5e8be2ca4cc011bd8dbc`
- merge commit SHA: `bbd4d457a2349cf34b8ab335e45123f8b306868c`
- purpose: docs-only post-K2C handoff repair

Current stage:
Vercel production setup verified. K2D has not started.

Next safe action:
Confirm future PR branches generate usable Vercel Preview URLs with /app/ appended for Browser Agent QA, then begin PR-K2D planning only after live base verification.
## Vercel production setup verification (2026-05-06)

- PR #66 / Vercel SPA rewrite config is merged.
  - final head SHA: 4b37d099447903951d6a44bd623b580a86c330e0
  - merge commit SHA: fe065fb0d9eb10d134d2baaa29b1010a54007966
  - changed file: vercel.json only
  - purpose: redirect / to /app/ and rewrite /app/* to /app/index.html for React Router + Clerk auth return
- Vercel production deploy source branch: base/approved-thru-437
- Vercel production deploy source commit: fe065fb0d9eb10d134d2baaa29b1010a54007966
- Production deployment status: PASS / Ready
- Production app route: PASS
- Root redirect: PASS
- Clerk login/auth return: PASS after PR #66
- Production QA Browser Agent URL: https://lazytopper-production-desktop.vercel.app/app/
- QA rule: Browser Agent should use Vercel production/preview URLs with /app/ appended. Do not use the bare root URL except when specifically testing the root redirect.

## Product source of truth

- Product repo: `chetan-anand-hub/Lazytopper-Production`
- Active integration branch: `base/approved-thru-437`
- Current confirmed product base after PR-K2C / PR #62 merge: `d9d0d5df1e9de45df4e555b186903070e7b0e873`
- Previous confirmed product base after PR-K1B / PR #51 merge: `4e083ecf0a7e47f166ac916e91abddb7e3a1fc81`
- Previous confirmed product base after PR-K1A / PR #49 merge: `7104cb132979b0e2b3686c4c7f823cc06fe84907`
- Previous confirmed product base after PR-K0 / PR #48 merge: `408d9eebbba70c423d76b6209e64622ce6c8f4da`
- Previous confirmed product base after PR-I4C / PR #43 merge: `0ca7cd63d43f99bfe9ce31662694a61772bc424d`
- Previous confirmed product base after PR-I4B.1 / PR #42 merge: `2f9fab7b1c5727d7c62975e002f24c859bdfd4d9`
- Previous confirmed product base after PR-I4A / PR #40 merge: `4d3abb2230613f693c18aaa69b57d72b2a538020`
- Previous confirmed product base after PR-I3 / PR #39 merge: `1ddc9a00aa383dd8e9094a76da0841b03ad820be`
- Previous confirmed product base after PR-I2 / PR #38 merge: `a21dc38f9c7ef9aa4b0307ea8d8a19a71fe1a0fa`
- Previous confirmed product base after the post-PR-I1 docs / PR #37 merge: `91883cc09cc5d029adea38471c476cb720cf6e20`
- Previous confirmed product base after PR-I1 / PR #36 merge: `328667b8f58314e0142cc7c4351187cb6b3e796c`
- Previous confirmed product base after PR-I0 / PR #35 merge: `7cf979ee95998fc96f610d0e1cbf1cb5035ebe20`
- Final locked desktop prototype repo: `https://github.com/chetan-anand-hub/topic-focus-lite`
- Historical desktop shell prototype repo: `https://github.com/chetan-anand-hub/lazytopper-desktop-view-e1fc5df7`
- Historical mobile Level 1 prototype: `https://github.com/chetan-anand-hub/lazytopper-navigator`
- Locked Lovable prototype project: `https://lovable.dev/projects/621ea8b2-041a-4c1a-a1c9-fae3cf9b8a59`
- Locked Lovable prototype preview (auth-gated): `https://id-preview--621ea8b2-041a-4c1a-a1c9-fae3cf9b8a59.lovable.app/app/`
- Published Lovable prototype (public, use this for visual parity): `https://light-topic-pilot.lovable.app/app`

GitHub origin is the source of truth. Replit local workspace, local checkpoint commits, preview-only edits, task snapshots, and Replit "Ready for review" state are not product state unless pushed to GitHub and reviewed as a PR. A Replit dev preview URL is valid only when it is provably serving the exact PR branch and head SHA being audited; otherwise treat it as stale.

## Current status summary

<!-- PR-K0-K1A-UPDATE-START -->
This update brings the desktop graduation / K-series state current through PR-K1C / PR #52.

- PR-K0 / PR #48 is merged. It added the Learning Signal contract:
  - `lazytopper/src/lib/desktop/learningSignals.ts`
  - `docs/audits/pr-k0-contract-notes.md`
- PR-K1A / PR #49 is merged. It upgraded the existing in-page Quick Practice panel into a Level-3 execution loop:
  - one-question-at-a-time execution
  - local answer working textarea
  - Mark as attempted
  - Show solution from real `solutionSteps`, `explanation`, `finalAnswer`, or `answer` fields only
  - local-only Learning Signal panel
  - no persistence
  - no fake mastery
  - no fake score
  - no fake weak areas
  - no fake Mistake Intel
  - no fake saved history
  - no fake generated question content
  - no fake solution content
  - full Practice engine fallback preserved
- Browser Agent QA for PR-K0 + PR-K1A: `PASS`.
- Build / verifier gate for PR-K1A: `PASS`. `node scripts/verify-production-build.mjs` reported 8 passed / 0 failed.
- PR-K1B / PR #51 is merged at `4e083ecf0a7e47f166ac916e91abddb7e3a1fc81`.
- PR-K1B changed exactly one product file:
  - `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- PR-K1B repaired / polished Practice context:
  - query preselection for Practice hub context
  - subject / scope / topic context propagation
  - Maths vs Science context correctness
  - signed-out full Practice fallback copy
  - removed student-facing technical “Learning Signal” language from normal Practice UI
  - preserved PR-K1A Quick Practice Level-3 loop
- PR-K1B Browser QA: `PASS WITH FOLLOW-UP`.
- PR-K1B follow-up note:
  - Browser Agent could not reliably test some Codespaces alias / mismatch URLs because Codespaces forwarding produced access / certificate / gateway errors. This was classified as preview-access limitation, not product failure.
  - User manually verified the Practice hub loaded from the Codespaces preview.
- PR-K2C / PR #62 is merged at `d9d0d5df1e9de45df4e555b186903070e7b0e873`.
- PR-K1C changed:
  - `lazytopper/src/App.tsx`
  - `lazytopper/.gitignore`
- PR-K1C restored public landing connectivity:
  - signed-out desktop public entry shows `Welcome` landing instead of `DesktopHome` cockpit
  - `/welcome` renders `Welcome` on desktop and mobile
  - public landing is not wrapped in `DesktopShell`
  - signed-in desktop root can still show `DesktopHome` cockpit
  - real production Login / Clerk auth connectivity is preserved
  - existing desktop app routes remain unchanged
  - PR-K1B Practice context routes are preserved
  - `.env.local` is protected in `.gitignore` so local Clerk publishable-key files are not committed
- PR-K1C Browser QA: `PASS WITH FOLLOW-UP`.
- PR-K1C QA confirmed:
  - `/app/` shows public Welcome landing, no DesktopShell sidebar
  - `/app/welcome` shows public Welcome landing, no DesktopShell sidebar
  - Start free trial routes to real Clerk Login
  - Log in routes to real Clerk Login
  - `/app/practice-hub` still loads desktop Practice
  - `/app/check-improve` still loads
  - `/app/me` loads with honest sign-in / empty-progress state
  - no fake progress, fake mastery, fake learner mistake history, or hidden persistence was observed
- PR-K1C follow-ups:
  - K1B query route may still need a chip-selection polish if direct query preselection intermittently requires one click after local state caching.
  - `/app/me` shell context should be clarified in a later route/shell consistency pass if direct-load behaviour differs from sidebar navigation.
  - Development hot-reload / cache blank screens are preview-environment follow-ups, not product blockers.
- Permanent preview / QA rule added:
  - Visible UI PRs still require live output QA.
  - Preferred preview is a deployed public URL that does not require Codespaces forwarding.
  - Acceptable previews include Lovable / Vercel / Netlify-style public URLs.
  - Codespaces forwarded URLs are acceptable for manual human QA, but Browser Agent may be unreliable because of certificate, port, forwarding, login, or safe-browsing limits.
  - If Browser Agent cannot access a Codespaces URL, classify it as `INCONCLUSIVE — preview access limitation`, not as a product failure.
- Next recommended stage:
  - Docs-only update after PR-K1B / PR-K1C.
  - Then PR-K2A — Worksheet profile-save contract/helper.
  - Do not start K2A from stale Replit/Codespaces state; verify live GitHub base first.
<!-- PR-K0-K1A-UPDATE-END -->

This update brings the desktop graduation state current through PR-I4D / PR #44.

- PR-I4D / PR #44 is merged at `533fba1e82819be3966e2b25824575bba6df03b4`. Start Free Trial login gate now matches the Lovable trial-intent copy: `Free trial`, `Sign in / Start trial`, and `Start your free trial to unlock saved attempts and mistake-aware practice.` The `reason=start-trial` back link now says `Back to landing`. Real Clerk auth, Explore as Guest, redirect handling, `location.state.from`, onboarding/profile chain, PR #42 route fixes, and PR #43 light/cockpit entry behaviour are preserved. No fake trial state was introduced. Final classification: `PASS WITH FOLLOW-UP`.
- PR-I4C / PR #43 is merged at `0ca7cd63d43f99bfe9ce31662694a61772bc424d`. Desktop `/app/` and `/welcome` now align to the Lovable-style cockpit/home entry, visible theme toggles were removed from public/cockpit UI, and stale localStorage dark values can no longer force the product into dark mode. ThemeProvider/useTheme exports remain for compatibility. Final classification: `PASS`.
- PR-I4B.1 / PR #42 is merged at `2f9fab7b1c5727d7c62975e002f24c859bdfd4d9`. Route context is preserved across login redirects in `PracticeLimitGate`, `MockViewGate`, and `DesktopTopicHubPage`; changed files were exactly those three files. Final classification: `PASS WITH FOLLOW-UP` because one PracticeLimitGate browser path was not directly reachable in QA but source and visible flows were correct.
- Docs / operating model update: Replit task-agent is no longer trusted for final clean branch/PR publishing unless it proves exact branch/head/diff and no platform drift. Codespaces/local clean clone is the preferred implementation route for branch creation, commits, pushes, PRs, and public preview URLs. GPT remains product thinker/auditor; Browser Agent remains visual/click QA only.
- Preview lesson: a black Codespaces screen can be caused by missing `VITE_CLERK_PUBLISHABLE_KEY` at build time. The publishable `pk_...` key must be exported before running the production build. Never paste the secret `sk_...` key into chat, docs, or source.


- PR-I4A / PR #40 is merged at `4d3abb2230613f693c18aaa69b57d72b2a538020`. Public desktop `/app/` entry route is fixed: signed-out desktop visitors see the public Welcome landing instead of the cockpit. `RootEntry` now branches route `/` by auth + viewport, `isDesktopShellRoute("/", hasSession)` only shell-wraps when a session exists, and `BottomNav` returns null on desktop. Mobile behaviour is preserved (`HomeRedirect`). Final classification: `PASS WITH FOLLOW-UP`. Follow-up: dark theme / theme toggle differs from the light Lovable prototype; tracked for PR-J visual sweep.
- PR-I3 / PR #39 is merged at `1ddc9a00aa383dd8e9094a76da0841b03ad820be`. The desktop sidebar `MistakeIntelCard` no longer hard-codes the fake "You lose 38% marks to silly errors in Maths." line. It uses `useAuth()` and `getMistakeLogs(uid, 7)` and renders honest states for loading, signed-out, error, signed-in/no-logs, and signed-in/with-logs. No fake percentages or fake weak subjects.
- PR-I2 / PR #38 is merged at `a21dc38f9c7ef9aa4b0307ea8d8a19a71fe1a0fa`. `Login.tsx` is a two-panel desktop layout with the line "A calm cockpit for CBSE Class 10." on the left and real Clerk `<SignIn />` on the right. Reason-aware copy is preserved through `loginPrompts`; Explore as Guest is preserved; unknown reasons fall back to login copy. Known caveat: PR-I2 did not fix the App-level public route or the desktop BottomNav regression — those were addressed in PR-I4A.
- PR-I1 / PR #36 is merged. Desktop Topic Hub is at locked-prototype feature + content parity (`ActionableTopicHubContent` contract, BoardConcept rows, FormulaUseCard, TopicSnapshot, common-mistake / examiner-warning copy, `isSamplePreview` labelling). 14 priority topics hand-seeded; remaining catalogue topics fall back to clearly-labelled sample-preview content. CTAs preserve `source=topicHub` and `returnTo`. PASS WITH FOLLOW-UP.
- PR-I0 / PR #35 is merged. Desktop topic catalogue is at locked-prototype parity: 13 Maths + 13 Science = 26 topics, with aliases for `trigonometry-heights-distances`, `light-reflection-refraction`, and `acids-bases-salts`.
- PR-H / PR #34 is merged. Desktop Me / Progress is on real auth + real `loadInsights` attempts + real `getMistakeLogs`; all fake metrics removed. PASS WITH FOLLOW-UP — time-on-practice, last-5-mock-score, and trend deltas still lack real data paths.
- PR-G / PR #33 is merged. Desktop Check & Improve uses the real `checkSolutionImage` workflow plus real `logMistakes`. The unknown login reason `save-mistake-history` was repaired to `grade-answer`.
- PR-F / PR #32 was a first parity pass for Desktop Topic Hub. A later audit showed it was not fully prototype-complete; PR-I1 / PR #36 completed feature/content parity.
- PR-E / PR #31 is merged. Desktop Exam Trends is at locked-prototype parity, removing fake "96% likely / 10 years of papers" certainty claims and using `desktopTopicsBySubject` plus HPQ matching.
- PR-LANDING / PR #26, PR-B2 / PR #28, PR-C2 / PR #29 form the Landing + Home + Practice foundation.
- PR #17 / Task #362 remains draft / preservation only. Do not merge it or import from it.
- The rendered Lovable prototype side-by-side comparison was deferred to PR-J because the implementing agent could not authenticate into the locked Lovable prototype. The published `https://light-topic-pilot.lovable.app/app` URL is now the canonical visual reference for that comparison.

Recommended next actions:

1. Merge this docs-only update after user approval.
2. PR-K2A — Worksheet profile-save contract/helper.
   - Define the signed-in profile-save path for worksheet activity.
   - Keep local-only worksheet save as signed-out/device fallback only.
   - Make sure worksheet-generated, worksheet-saved, worksheet-attempted, worksheet-check-started, answer-checked, and mistake-logged are separate honest states.
   - Do not claim mastery, saved progress, Mistake Intelligence, or Me / Progress updates unless the real saved/profile path exists.
3. PR-K2B — Worksheet Level-3 learner loop UI:
   - Generate worksheet → ready → attempt → check answer → see result → next practice.
   - Preserve Level-2 Worksheet structure and carry subject/scope/topic/source context downstream.
4. PR-K2C — Missing solution AI fallback:
   - If stored solution is missing, generate a board-style solution through the AI path.
   - Render generated and stored solutions in a uniform student-facing format.
   - Do not claim official CBSE answer or verified database truth unless separately validated.
5. PR-K3 — Check & Improve source-context integration and real mistake-log bridge.
6. PR-K4 — Mistake Intelligence from saved checked evidence only.
7. PR-K5 — Me / Progress real aggregation for the 7-day trial.
8. PR-K6 — Tutor / examiner quality polish.
9. PR-J — Final desktop polish and side-by-side Lovable / production sweep.
10. Replit main sync/reset only after a stable GitHub checkpoint or before publishing.


### PR-I4B.1 / PR #42 — Preserve route context across login redirects

- Status: merged at `2f9fab7b1c5727d7c62975e002f24c859bdfd4d9`
- Previous base: `bee0bf41e7442e791d1f4f6b0f2125a00ac95dcc`
- Branch: `feat/desktop-pr-i4b-route-gating-source-returnto-hardening`
- Final head before merge: `32fffa23f4de293869dd6b642aae09700d7e7759`
- Changed files:
  - `lazytopper/src/components/auth/MockViewGate.tsx`
  - `lazytopper/src/components/auth/PracticeLimitGate.tsx`
  - `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`

Key implementation details:

- Preserved route context across signed-out login redirects.
- `PracticeLimitGate` and `MockViewGate` no longer collapse to bare `/login` when a source/return path exists.
- Desktop Topic Hub sign-in CTAs preserve `reason=login` and redirect back to `/topic-hub/trigonometry` style routes.
- No new login reasons introduced.
- Final classification: `PASS WITH FOLLOW-UP`.

### PR-I4C / PR #43 — Desktop entry journey + visible theme-toggle cleanup

- Status: merged at `0ca7cd63d43f99bfe9ce31662694a61772bc424d`
- Previous base: `2f9fab7b1c5727d7c62975e002f24c859bdfd4d9`
- Branch: `feat/desktop-pr-i4c-entry-journey-theme-toggle-cleanup`
- Final head before merge: `ba347b98cf560923103c6f7ae204ba11f86b5447`
- Changed files:
  - `lazytopper/src/App.tsx`
  - `lazytopper/src/context/ThemeContext.tsx`
  - `lazytopper/src/components/dashboard/DashboardHeader.tsx`

Key implementation details:

- Desktop `/app/` and `/welcome` align to the Lovable-style cockpit/home entry.
- Visible Light/Dark and sun/moon theme toggles removed from public/cockpit surfaces.
- `ThemeContext` now defaults to light and prevents stale localStorage `dark` from forcing a dark UI.
- ThemeProvider/useTheme exports preserved for compatibility.
- Final classification: `PASS`.

### PR-I4D / PR #44 — Start Free Trial login gate parity

- Status: merged at `533fba1e82819be3966e2b25824575bba6df03b4`
- Previous base: `0ca7cd63d43f99bfe9ce31662694a61772bc424d`
- Branch: `feat/desktop-pr-i4d-trial-login-gate-parity`
- Final head before merge: `5ea44e58eadd2241e8ade4edc07d06589f5131fc`
- Changed files:
  - `lazytopper/src/lib/desktop/loginPrompts.ts`
  - `lazytopper/src/pages/Login.tsx`

Key implementation details:

- `start-trial` prompt now uses Lovable-aligned copy:
  - chip: `Free trial`
  - headline: `Sign in / Start trial`
  - subcopy: `Start your free trial to unlock saved attempts and mistake-aware practice.`
  - ctaLabel: `Start free trial`
- `reason=start-trial` back link now says `Back to landing`.
- Real Clerk `<SignIn />`, Explore as Guest, redirect query handling, `location.state.from`, and onboarding/profile chain preserved.
- No fake trial state, fake progress, fake saved attempts, fake mistake intelligence, fake scores, or fake predictions introduced.
- Final classification: `PASS WITH FOLLOW-UP`.
- Follow-ups: decide later whether to add a dedicated Start Free Trial CTA outside Clerk; optionally normalize chip capitalization; investigate recurring Codespaces `/api/user/progress` / 502 preview instability.


## How to use this document

At the start of every LazyTopper desktop task:

1. Read this file from GitHub, not from stale Replit local state.
2. Verify live GitHub state directly:
  - current `base/approved-thru-437` SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873
   - PR states
   - draft status
   - merged status
   - changed files
   - head SHAs
3. Inspect the exact locked prototype file in `topic-focus-lite`. Cross-check rendered behaviour against the published Lovable prototype at `https://light-topic-pilot.lovable.app/app`.
4. Write or review the Replit prompt.
5. Run implementation in Replit background/fresh clone, not Replit main, unless the task is explicitly a main-workspace sync.
6. Audit GitHub diff, not Replit summary alone.
7. Classify the result:
   - `PASS`
   - `PASS WITH FOLLOW-UP`
   - `HOLD`
8. Update this document through a docs-only PR whenever project state or durable rules change.

GPT is the product thinker and auditor. Replit Agent Mode is the executor and can run live browser screenshots/clicks. GitHub is the source of truth. This file is the persistent memory/rulebook.

## Permanent rules

These rules apply to every LazyTopper desktop graduation task. They are durable and supersede ad-hoc task wording when in conflict.

- GitHub origin is the source of truth.
- Replit main is not source of truth.
- Codespaces/local clean clone is preferred for implementation branches, commits, pushes, draft PRs, and public preview generation. Replit task-agent may draft code only when it can prove exact branch/head/diff and no platform checkpoint drift.
- Lovable is the north-star UX/journey reference, but production is not disposable. Production already has real engines, auth, services, routes, data flows, and honest states; implementation should adapt and connect those existing capabilities rather than rebuilding from scratch.
- Every visible task must ask for a public preview URL that the auditor / Agent can open, screenshot, and click.
- GPT audits GitHub source. Agent Mode can do live browser screenshots and clicks but Agent Mode is not source of truth — see the Agent / Browser QA rules section below.
- Do not classify a visible PR as `PASS` unless GitHub diff, validations, data honesty, and live output/click evidence all pass — unless the user explicitly waives the gate.
- The locked prototype is the target, not inspiration.
- Production must preserve real auth, services, data, routes, and honest empty states.
- No fake scores, fake progress, fake prediction certainty, fake mistake intelligence, or fake activity.
- The mobile app is a later phase. Current work is desktop unless explicitly scoped.
- The published Lovable prototype at `https://light-topic-pilot.lovable.app/app` is the canonical rendered visual reference. The auth-gated locked Lovable preview is fallback only.
- PR #17 / Task #362 remains preservation-only. Do not import `aggregateErrorCategories`, `readLocalMistakeLogsSince`, or `ErrorCategory`.

## Durable docs update rule

Update this file whenever any of these happen:

- a desktop graduation PR is merged
- a major rule changes
- a stale-state issue is discovered
- a permanent audit rule is introduced
- a prototype-to-production mapping changes
- an open PR materially changes status
- the recommended next step changes

Use a docs-only branch and PR. Do not edit product code while updating this file.

## Level definitions and intelligent-loop doctrine

LazyTopper is structured as a single intelligent loop, not a flat collection of pages.

LazyTopper loop:

`Insight -> Topic -> Action -> Output -> Mistake Intelligence -> Me / Progress -> Next Action`

The product reads at three levels of granularity. Every PR must be classified at the right level before implementation.

**Level 1 — Shell + main destinations.**
Landing, Login, Home, Practice, Exam Trends, Topic Hub, Worksheets, Check & Improve, Me / Progress, and the desktop shell / sidebar. Level 1 is the route map, the cockpit feel, and the sidebar / nav grammar. Level 1 surfaces should match the locked prototype closely.

**Level 2 — Page-level sections and interaction rhythm.**
Board Essentials and the More menu inside Topic Hub, "Need a quick hand", Practice filters and cards, Worksheet entry, Exam Trends prediction cards, Me cards, Login reason-aware flows. Level 2 surfaces should match the prototype closely in structure and rhythm.

**Level 3 — Execution surfaces (the actual learner work).**
Practice sessions, generated question sets, worksheet builder / result / attempt, Check & Improve grading result, Tutor drawer / workspace, Mini Check, Chapter Test, Mock Test, HPQ attempt / detail, Explain Concept / Show Visual deep flows. Level 3 is where mistakes are produced, captured, and fed back into Mistake Intelligence and Me / Progress. Level 3 may need product-native design when the prototype does not show the full execution flow, but it must inherit the prototype's grammar (typography, spacing, calm tone) and must produce a real output.

Doctrine rules:

- Level 1 / Level 2 should match the locked prototype closely.
- Level 3 may need product-native design but must inherit the prototype grammar.
- No fake intelligence anywhere — no fake percentages, no fake "weak in X" claims, no fake activity.
- Every execution surface needs an output story: what gets saved, what gets logged as a mistake, what is surfaced back to Me / Progress.
- If output is not tracked yet, say so honestly with a labelled empty state.
- Context must survive across the loop via `source=...` and `returnTo=...` URL parameters.

## J0 audit findings

J0 is the cross-surface audit that ran ahead of the I-series and K-series correction PRs. The findings below are durable and inform PR-I4B and PR-K0..PR-K5 planning.

**J0-A — Landing / entry journey.**
A major entry-route mismatch was found in the J0 audit. PR-I4A / PR #40 first repaired the signed-out desktop public entry route. PR-I4C / PR #43 then aligned `/app/` and `/welcome` with the Lovable-style cockpit/home entry, removed visible theme toggles, and made the desktop experience deterministic light/calm. PR-I4D / PR #44 aligned the Start Free Trial login gate copy and back-link with the Lovable prototype. Remaining visual follow-ups are minor and tracked for PR-J.

**J0-B — Practice / Worksheets.**
Production is functionally stronger than the prototype here (real Quick Practice generator, real Worksheet Builder, real saved-worksheet memory). Future work should preserve those engines and focus on:

- gating clarity (free vs. trial vs. premium)
- save / attempt / output loop completeness
- Me / Mistake Intel connectivity from Practice and Worksheet outputs

**J0-C — Topic Hub / Tutor.**
Biggest visible Level-3 gap. The prototype expects the "Need a quick hand" actions (Explain concept / Show visual / Mini check) to open as a side drawer / overlay. Production currently exposes them as static inline reference cards. `TutorDrawerV2` and `TeachFlow` already exist in production but are not exposed from Topic Hub. PR-K3 will integrate / adapt the tutor drawer without inventing fake mastery.

## Agent / Browser QA rules

The Replit Browser Agent is a visual + click auditor. It is not source of truth.

GitHub is source of truth. The Replit dev preview is valid for visual / click QA only when it provably serves the exact PR branch and head SHA. Any other state must be treated as stale and held.

For visible visual tasks, the Browser Agent audit must explicitly check, in this order:

1. **Source freshness.** Does the preview URL serve the PR branch and head SHA? If unprovable, HOLD.
2. **Visual parity.** Does the rendered surface match the published Lovable prototype at the agreed level (Level 1 / Level 2 / Level 3 grammar)?
3. **Functional parity.** Do the visible CTAs do real work, with real data, against real production services?
4. **Resource / content completeness.** Are required sections, copy lines, and right-rail / drawer content present? Are negative copy gates absent?
5. **Data honesty.** No fake numbers, no fake "weak in X", no fake percentages or trends.
6. **Learning-signal continuity** (Level 3 only). Does the execution surface produce an output that flows back into Mistake Intelligence and Me / Progress, or honestly state that it does not yet?

Stale preview means HOLD. If the Agent reports PASS while describing stale or wrong UI, GPT overrides to HOLD.

Codespaces preview rule: when a black screen appears, inspect browser console before blaming the PR. If the console says `Missing VITE_CLERK_PUBLISHABLE_KEY`, export the Clerk publishable `pk_...` key before build, rebuild with `NODE_ENV=production BASE_PATH=/app/`, rerun `node scripts/verify-production-build.mjs`, restart preview, and retest. Never share or commit Clerk secret keys.

PR-I4A audit lesson — for any landing / login QA pass, require explicit positive and negative copy gates:

Positive (must be present):

- "Know what matters. Practise what helps. Fix what costs marks." on `/app/` and `/app/welcome`.
- "A calm cockpit for CBSE Class 10." on `/app/login`.

Negative (must be absent):

- The stale "Score higher in boards. Without the grind." dark landing copy.
- The old centered dark login card.
- The desktop `BottomNav` on any of `/app/`, `/app/welcome`, `/app/login`.

## Source and prototype usage rule

These four sources have specific roles. Do not blur them.

- **Production repo (`chetan-anand-hub/Lazytopper-Production`)** is implementation truth. All real auth, services, data, routes, and honest empty states live here.
- **Published Lovable prototype (`https://light-topic-pilot.lovable.app/app`)** is the visual / journey target — page shape, hierarchy, calm tone, key affordances, navigation grammar.
- **`topic-focus-lite` repo** is the prototype source reference. Use it to read exact prototype component structure and section order when the published Lovable view is ambiguous.
- **Historical desktop shell repo (`lazytopper-desktop-view-e1fc5df7`) and the mobile Level 1 prototype (`lazytopper-navigator`)** are fallback references only — useful for AppShell / LoginGate / sidebar references when the locked prototype does not cover them.

Translation rules:

- Prototype contributes structure / navigation / visual grammar / journey.
- Production contributes real data / auth / services / routes / honest states.
- Do not copy prototype fake or demo data into production as if it were real learner data.
- Do not present static reference content as the learner's own data.

## Route, login and source/returnTo rules

Production route conventions, not prototype `/app/*` literals.

Canonical known login `reason` values (only these — adding a new one without recognising it on the production login page is a regression):

- `start-trial`
- `login`
- `save-worksheet`
- `upload-answers`
- `grade-answer`
- `open-progress`
- `mistake-aware`
- `mistake-aware-worksheet`
- `start-full-mock`
- `open-check`

Route rules:

- No `/app/*` React route literals in source code. The browser URL may show `/app/...` because of `BASE_PATH=/app/`, but React route literals must be production routes (`/login`, `/practice-hub`, `/topic-hub`, `/me`, `/check-improve`, etc.).
- `source=...` and `returnTo=...` must be preserved end-to-end across hub → execution → login → return navigation.
- BackToParent on every hub honours `?returnTo=...` and falls back to a sensible parent route.

## Landing and login prompting parity rule

The locked prototype includes public landing and reason-aware login prompting. This is part of the desktop product journey.

Locked prototype files:

- `topic-focus-lite/src/pages/PublicLanding.tsx`
- `topic-focus-lite/src/pages/LoginGate.tsx`
- `topic-focus-lite/src/context/LazyTopperContext.tsx`

Production must preserve production route conventions rather than blindly copying prototype `/app/*` routes.

Expected production mapping:

| Prototype behavior | Production equivalent |
| --- | --- |
| `/` public landing | production public landing / `Welcome` route (PR-I4A: signed-out desktop `/` renders `<Welcome />` directly) |
| `/app/login?reason=...&redirect=...` | `/login?reason=...&redirect=...` |
| `/app` cockpit | production desktop Home / cockpit route (signed-in or local-guest only on desktop) |
| `/app/practice/worksheet` | `/practice/worksheets` |
| `/app/check` | `/check-improve` |
| `/app/me` | `/me` |

Implementation must preserve real Clerk auth and backward compatibility with existing `location.state.from` behavior unless explicitly changed.

PR-LANDING / PR #26 implemented this foundation. PR-I2 / PR #38 graduated the Login surface to two-panel visual parity. PR-I4A / PR #40 fixed the public landing entry route.

## Prototype route/file mapping

| Prototype route/file | Production route/file | Status |
| --- | --- | --- |
| Public landing: `topic-focus-lite/src/pages/PublicLanding.tsx` | `lazytopper/src/pages/Welcome.tsx` and `lazytopper/src/App.tsx` route entry | PR-LANDING / PR #26 implemented Welcome + reason-aware login prompting. PR-I4A / PR #40 fixed the route entry so signed-out desktop `/app/` renders the public Welcome landing instead of the cockpit. |
| Login: `topic-focus-lite/src/pages/LoginGate.tsx` | `lazytopper/src/pages/Login.tsx` | PR-I2 / PR #38 merged at `a21dc38f9c7ef9aa4b0307ea8d8a19a71fe1a0fa`. Two-panel visual parity with real Clerk `<SignIn />`, reason-aware copy, Explore as Guest preserved. |
| Home: `topic-focus-lite/src/pages/HomePage.tsx` | `lazytopper/src/pages/desktop/DesktopHome.tsx` | PR-B2 / PR #28 merged at `64214acc162b09c2b40c436f955bc5a225e0fd50`. |
| Practice: `topic-focus-lite/src/pages/PracticePage.tsx` | `lazytopper/src/pages/desktop/DesktopPracticePage.tsx` | PR-C2 / PR #29 merged at `9670db2618f376544c93c890abe5f67f7eb8be3a`. |
| Worksheet: `topic-focus-lite/src/pages/WorksheetPage.tsx` | `lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx` | PR-D / PR #22 merged at `415386853661fdb831b5615cdcb64dcd8800172c`. Live preview gate waived by user. |
| Exam Trends: `topic-focus-lite/src/pages/TrendsPage.tsx` | `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx` | PR-E / PR #31 merged. |
| Topic Hub: `topic-focus-lite/src/pages/TopicHubPage.tsx` | `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx` and `lazytopper/src/lib/desktop/topicHubContent.ts` | PR-F / PR #32 first parity pass; PR-I1 / PR #36 completed feature/content parity. PASS WITH FOLLOW-UP — Topic Hub Level-3 quick-hand → Tutor Drawer integration is scheduled for PR-K3. |
| Topic catalogue (data layer) | `lazytopper/src/lib/desktop/topics.ts` | PR-I0 / PR #35 merged. |
| Check & Improve: `topic-focus-lite/src/pages/CheckPage.tsx` | `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx` | PR-G / PR #33 merged. |
| Me / Progress: `topic-focus-lite/src/pages/MePage.tsx` | `lazytopper/src/pages/desktop/DesktopMePage.tsx` | PR-H / PR #34 merged. PASS WITH FOLLOW-UP — full Me aggregation is scheduled for PR-K5. |
| Shell / sidebar Mistake Intel | `lazytopper/src/components/desktop/MistakeIntelCard.tsx` | PR-I3 / PR #39 merged at `1ddc9a00aa383dd8e9094a76da0841b03ad820be`. Real `getMistakeLogs(uid, 7)` only, with honest loading / signed-out / error / no-logs / with-logs states. |
| App-level public route entry + desktop BottomNav scope | `lazytopper/src/App.tsx` | PR-I4A / PR #40 merged at `4d3abb2230613f693c18aaa69b57d72b2a538020`. |
| Cross-route source/returnTo + gating hardening | `PracticeLimitGate.tsx`, `MockViewGate.tsx`, `DesktopTopicHubPage.tsx` | PR-I4B.1 / PR #42 merged at `2f9fab7b1c5727d7c62975e002f24c859bdfd4d9`. |
| Desktop entry journey + visible theme toggle cleanup | `App.tsx`, `ThemeContext.tsx`, `DashboardHeader.tsx` | PR-I4C / PR #43 merged at `0ca7cd63d43f99bfe9ce31662694a61772bc424d`. |
| Start Free Trial login gate parity | `loginPrompts.ts`, `Login.tsx` | PR-I4D / PR #44 merged at `533fba1e82819be3966e2b25824575bba6df03b4`. |
| Final desktop polish + Lovable side-by-side | App-wide | Pending PR-J after PR-K0..PR-K5 intelligence/output-loop work unless a visual blocker appears earlier. |

## Completed work

### Mobile Level 1

Mobile Level 1 has already been implemented. Do not touch mobile unless explicitly scoped.

### Desktop Level 1 / Phases 1-7

Desktop Level 1 / Phases 1-7 have already been implemented. The desktop shell and desktop pages already exist.

Do not revive stale Desktop Phase 1 / Shell + Home tasks.

### PR-A / PR #18 — Desktop Level 2 Foundation

- Status: merged
- Branch: `feat/desktop-pr-a-l2-foundation`
- Merge/squash SHA: `99da42d01385084dbda16b9d95fcae8b10d2663e`
- Scope: additive Level 2 foundation under `lazytopper/src/components/desktop/l2/*` and `lazytopper/src/lib/desktop/*`.

### PR-B / PR #19 — Desktop Home Graduation

- Status: merged, superseded by PR-B2 / PR #28
- Branch: `feat/desktop-pr-b-home-graduation`
- Merge/squash SHA: `fde4ad3ce0dbfd665871454a55dfed9142687efa`

### PR-C / PR #20 — Desktop Practice Hub Graduation

- Status: merged, superseded by PR-C2 / PR #29
- Branch: `feat/desktop-pr-c-practice-hub-graduation`
- Merge/squash SHA: `66fd7d734f0842ccb69eb9eee62f42ce588bde54`

### PR #21 — Desktop graduation state docs handoff

- Status: merged
- Branch: `docs/desktop-graduation-state`
- Merge SHA: `fc6d9ba8e448aa6b4da5548c92ddd74888775b34`
- Changed file: `docs/desktop-graduation-state.md`

### PR #23 — Locked Prototype Parity Rule docs

- Status: merged
- Branch: `docs/locked-prototype-parity-rule`
- Merge SHA: `0aac23af7aa23823eb070925fa462621f0302dfa`
- Changed file: `docs/desktop-graduation-state.md`

### PR #24 — Desktop graduation QA and state rules docs

- Status: merged
- Branch: `docs/desktop-graduation-qa-rules`
- Merge SHA: `9fdc2e83ae4e5847d93183e7233a4974c97a9e65`

### PR-D / PR #22 — Desktop Worksheet Workspace

- Status: merged
- Branch: `feat/desktop-pr-d-worksheet-workspace`
- Merge SHA: `415386853661fdb831b5615cdcb64dcd8800172c`
- Final head before merge: `aa8a67f517fccbe81855ee80cca0aa02774abb96`
- Full PR diff: 3 files
  - `M lazytopper/src/App.tsx`
  - `A lazytopper/src/lib/desktop/savedWorksheets.ts`
  - `A lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx`
- Live preview QA gate explicitly waived by the user before merge.

### PR #25 — Post-PR-D desktop state docs

- Status: merged
- Branch: `docs/post-pr-d-desktop-state-1`
- Merge SHA: `6248823b9e533a3079926365a0a19824eb4d9b9f`
- Changed file: `docs/desktop-graduation-state.md`

### PR-LANDING / PR #26 — Public Landing + Reason-Aware Login Prompting

- Status: merged
- Branch: `feat/desktop-pr-landing-public-landing`
- Merge SHA: `5ee8568a330adb931521e6e770d798ae7d2f8671`
- Final head before merge: `fba814476ecda38593ac4e9e5d95f8275ba31c79`
- Changed files:
  - `M lazytopper/src/pages/Welcome.tsx`
  - `M lazytopper/src/pages/Login.tsx`
  - `A lazytopper/src/lib/desktop/landingMemory.ts`
  - `A lazytopper/src/lib/desktop/loginPrompts.ts`
- Implemented `/login?reason=...&redirect=...` route contract. Real Clerk auth preserved. Login visual parity completed later in PR-I2 / PR #38.

### PR-B2 / PR #28 — Home locked prototype parity

- Status: merged
- Branch: `feat/desktop-pr-b2-home-locked-parity`
- Merge/squash SHA: `64214acc162b09c2b40c436f955bc5a225e0fd50`
- Changed file: `lazytopper/src/pages/desktop/DesktopHome.tsx`
- Real data only: `useAuth()`, `useSubscription()`, `landingMemory.ts`, saved-worksheet memory, `getMistakeLogs(uid, 7)` with local four-bucket aggregation.

### PR-C2 / PR #29 — Practice locked prototype parity + honest end-to-end journey

- Status: merged
- Branch: `feat/desktop-pr-c2-practice-locked-parity`
- Merge/squash SHA: `9670db2618f376544c93c890abe5f67f7eb8be3a`
- Changed file: `lazytopper/src/pages/desktop/DesktopPracticePage.tsx`
- Quick Practice opens an in-page generated panel using real `generatePracticeQuestions` data; HPQ tabs use real `getHighlyProbableQuestions`; Mistake Intelligence uses real `getMistakeLogs(user.uid, 7)`.

### Docs PR #30 — Post-PR-B2/PR-C2 docs update

- Status: merged
- Changed file: `docs/desktop-graduation-state.md`

### PR-E / PR #31 — Desktop Exam Trends locked prototype parity

- Status: merged
- Changed file: `lazytopper/src/pages/desktop/DesktopExamTrendsPage.tsx`
- Removed fake "96% likely / 10 years of papers" certainty claims; uses `desktopTopicsBySubject` and HPQ matching.

### PR-F / PR #32 — Desktop Topic Hub first parity pass

- Status: merged, superseded for feature/content parity by PR-I1 / PR #36

### PR-G / PR #33 — Desktop Check & Improve real grading workflow

- Status: merged
- Changed file: `lazytopper/src/pages/desktop/DesktopCheckImprovePage.tsx`
- Real `checkSolutionImage` workflow + real `logMistakes`. Repaired unknown login reason `save-mistake-history` → `grade-answer`.

### PR-H / PR #34 — Desktop Me / Progress real-data + honest states

- Status: merged
- Changed file: `lazytopper/src/pages/desktop/DesktopMePage.tsx`
- Real auth, `loadInsights`, and `getMistakeLogs`. PASS WITH FOLLOW-UP — time-on-practice, last-5-mock-score, trend deltas pending PR-K5.

### PR-I0 / PR #35 — Desktop topic catalogue parity

- Status: merged at `7cf979ee95998fc96f610d0e1cbf1cb5035ebe20`
- Changed file: `lazytopper/src/lib/desktop/topics.ts`
- 13 Maths + 13 Science = 26 topics; aliases for `trigonometry-heights-distances`, `light-reflection-refraction`, `acids-bases-salts`.

### PR-I1 / PR #36 — Desktop Topic Hub feature/content parity

- Status: merged at `328667b8f58314e0142cc7c4351187cb6b3e796c`
- Changed files:
  - `lazytopper/src/pages/desktop/DesktopTopicHubPage.tsx`
  - `lazytopper/src/lib/desktop/topicHubContent.ts`
- New `ActionableTopicHubContent` contract; 14 priority topics hand-seeded; clearly-labelled sample-preview fallback for the rest. CTAs preserve `source=topicHub` and `returnTo`. PASS WITH FOLLOW-UP.

### PR #37 — Post-PR-I1 docs update

- Status: merged at `91883cc09cc5d029adea38471c476cb720cf6e20`
- Branch: `docs/post-pr-i1-desktop-state-1`
- Changed file: `docs/desktop-graduation-state.md`
- Brought the desktop graduation state doc current through PR-I1.

### PR-I2 / PR #38 — Login visual parity with real Clerk auth

- Status: merged at `a21dc38f9c7ef9aa4b0307ea8d8a19a71fe1a0fa`
- Branch: `feat/desktop-pr-i2-login-visual-parity`
- Final head before merge: `e9eb99f04a8647823a4e471be3512f7eb389a756`
- Changed file: `lazytopper/src/pages/Login.tsx` (+336 / -77)

Key implementation details:

- Two-panel desktop layout. Left panel anchors with the line "A calm cockpit for CBSE Class 10."
- Right panel hosts the real Clerk `<SignIn />` component (Continue with Google, email, Continue, sign-up) — real Clerk auth preserved end-to-end.
- Reason-aware copy is preserved through the `loginPrompts` helper introduced in PR-LANDING. Unknown reasons fall back to login copy.
- "Explore as Guest →" affordance is preserved.
- Existing `location.state.from` fallback is preserved.
- No new login `reason` values introduced.

Known caveat: PR-I2 did not address the App-level public route entry or the desktop `BottomNav` regression. Those were left for PR-I4A.

### PR-I3 / PR #39 — Sidebar honest Mistake Intel

- Status: merged at `1ddc9a00aa383dd8e9094a76da0841b03ad820be`
- Branch: `feat/desktop-pr-i3-sidebar-honest-mistake-intel`
- Final head before merge: `0df1ef2dc63c6ef171f04746181761bcf28f95b8`
- Changed file: `lazytopper/src/components/desktop/MistakeIntelCard.tsx` (+300 / -66)

Key implementation details:

- Removed the hard-coded fake line "You lose 38% marks to silly errors in Maths." and any related fake percentage / fake weak-subject claims.
- Now uses `useAuth()` and `getMistakeLogs(uid, 7)` only.
- Honest states: loading, signed-out, error, signed-in / no logs, signed-in / with logs.
- No fake percentages, no fake "weakest subject" framing, no fake learner trends.

### PR-I4A / PR #40 — Public landing entry route

- Status: merged at `4d3abb2230613f693c18aaa69b57d72b2a538020`
- Previous base: `1ddc9a00aa383dd8e9094a76da0841b03ad820be`
- Branch: `fix/desktop-pr-i4a-public-landing-entry-route`
- Final head before merge: `1053e654a5df6d96363d02187924dd88ca63e24d`
- Changed file: `lazytopper/src/App.tsx` only (+34 / -14)

Key implementation details:

- New `RootEntry` for route `/` branches by viewport + auth.
- Mobile: preserves existing `HomeRedirect` (signed-in → `/dashboard`, else → `/welcome`).
- Desktop signed-out: renders `<Welcome />` directly — not shell-wrapped — so `/app/` shows the public landing instead of `DesktopHome`.
- Desktop signed-in or local-guest: renders `DesktopHome` inside `DesktopShell` (unchanged).
- `isDesktopShellRoute(pathname, hasSession)` is now session-aware: `/` is a shell route only when a session exists.
- `BottomNav` returns `null` whenever `isDesktop` is true. The mobile tab bar never renders at desktop width on any route or auth state.
- `!!user` is threaded through every consumer (`BottomNav`, top navbar, `useDesktopShell` guard).

Browser Agent QA:

- `/app/` and `/app/welcome` show the current public Welcome landing with "Know what matters. Practise what helps. Fix what costs marks."
- `/app/login` shows the PR-I2 two-panel layout with "A calm cockpit for CBSE Class 10."
- The stale "Score higher in boards. Without the grind." dark landing copy is absent.
- The old centered dark login card is absent.
- Desktop `BottomNav` is absent on `/app/`, `/app/welcome`, and `/app/login`.
- "Start free trial" routes to `/app/login?reason=start-trial&redirect=/onboarding`.
- "Explore the cockpit" intentionally enters the cockpit / trends flow as a local-guest session.

Verdict: `PASS WITH FOLLOW-UP`.

Follow-up: dark theme / theme toggle differs from the light Lovable prototype; tracked for PR-J visual sweep, not a PR-I4A blocker.

## Open / do not merge without separate review

### PR #17 / Task #362 — Diagnostic categories preservation

- Status: open, draft, preservation only
- Branch: `chore/task-362-error-categories`
- Head SHA: `14024f4a1ec0234f915b7d56da0d25b7824f8f48`
- Files in preservation branch:
  - `lazytopper/src/ai/aiClient.ts`
  - `lazytopper/src/services/errorCategories.ts`
  - `lazytopper/src/services/mistakeLogService.ts`

Do not import from PR #17. Do not merge PR #17. Do not use Task #362-only symbols such as `aggregateErrorCategories`, `readLocalMistakeLogsSince`, or `ErrorCategory` unless PR #17 is separately reviewed, approved, and merged.

## Obsolete work and stale states

Do not use these as implementation instructions:

- Desktop Phase 1 / Shell + Home tasks
- Starting from old SHA `93e739c`
- Starting PR-D from old SHA `66fd7d734f0842ccb69eb9eee62f42ce588bde54`
- Starting PR-E from pre-PR-B2/PR-C2 base
- Starting PR-I1 from pre-PR-I0 base
- Starting PR-I4A from pre-PR-I3 base
- Recreating `DesktopShell`, DesktopHome Level 1, or `MistakeIntelCard` from a pre-PR-I3 baseline
- Branch `feat/desktop-phase-1-shell-home` as a current implementation base
- Local Replit checkpoint commits
- Preview-only local DesktopHome / Login / App.tsx changes
- Broken PR-B v1 local implementation that imported Task #362-only code
- Replit local main workspace if it does not match GitHub origin
- Replit `main-repl/main` as a base for feature branches
- Any branch state polluted by screenshot artifacts, `.agents/` files, `opengraph.jpg`, or unrelated ancestral files
- The pre-PR-I1 first-pass Topic Hub content layer, which lacked the `ActionableTopicHubContent` contract
- The pre-PR-I2 dark centered Login card
- The pre-PR-I3 `MistakeIntelCard` with the hard-coded "38% silly errors in Maths" line
- The pre-PR-I4A `RootEntry` that rendered `DesktopHome` for signed-out desktop `/app/`

## Current implementation sequence

Completed:

1. PR-A — Desktop Level 2 foundation
2. PR-B — Desktop Home Graduation (superseded by PR-B2)
3. PR-C — Desktop Practice Hub Graduation (superseded by PR-C2)
4. PR #21 — docs handoff
5. PR #23 — locked prototype parity docs
6. PR #24 — QA/state rules docs
7. PR-D / PR #22 — Desktop Worksheet Workspace
8. PR #25 — post-PR-D state docs
9. PR-LANDING / PR #26 — Public Landing + Reason-Aware Login Prompting
10. PR-B2 / PR #28 — Home locked prototype + functional parity correction
11. PR-C2 / PR #29 — Practice locked prototype + PR-C2.1 honest end-to-end correction
12. Docs PR #30 — post-PR-B2/PR-C2 state docs
13. PR-E / PR #31 — Desktop Exam Trends locked prototype parity
14. PR-F / PR #32 — Desktop Topic Hub first parity pass (superseded for feature/content parity by PR-I1)
15. PR-G / PR #33 — Desktop Check & Improve real grading workflow
16. PR-H / PR #34 — Desktop Me / Progress real-data + honest states (PASS WITH FOLLOW-UP)
17. PR-I0 / PR #35 — Desktop topic catalogue parity
18. PR-I1 / PR #36 — Desktop Topic Hub feature/content parity (PASS WITH FOLLOW-UP)
19. Docs PR #37 — post-PR-I1 state docs
20. PR-I2 / PR #38 — Login visual parity with real Clerk auth
21. PR-I3 / PR #39 — Sidebar honest Mistake Intel
22. PR-I4A / PR #40 — Public landing entry route (PASS WITH FOLLOW-UP)

Open:

- PR #17 / Task #362 — draft preservation only; do not merge or import from.

Next recommended actions:

1. Merge this docs-only update.
2. PR-I4B — Route / gating / source / returnTo hardening across the app.
3. PR-K0 — Learning Signal / Me / Mistake Intel data contract.
4. PR-K1 — Practice Level-3 execution and output loop.
5. PR-K2 — Worksheet Level-3 output loop.
6. PR-K3 — Topic Hub quick-hand + Tutor Drawer integration.
7. PR-K4 — HPQ / Chapter Test / Mock execution loop.
8. PR-K5 — Me / Progress aggregation.
9. PR-J — Final desktop polish and side-by-side prototype sweep.
10. Replit main sync/reset only after a stable GitHub checkpoint or before publishing.

Do not start PR-I4B until this docs update is merged and the user explicitly approves starting PR-I4B.

## Shared desktop data/service/route audit checkpoint

Run a short audit-only checkpoint whenever a new desktop graduation arc begins or a major data-source change is suspected. No product code unless a tiny helper gap is explicitly approved.

Audit these sources:

- `lazytopper/src/App.tsx`
- `lazytopper/src/lib/desktop/navigation.ts`
- `lazytopper/src/lib/desktop/topics.ts`
- `lazytopper/src/lib/desktop/topicHubContent.ts`
- `lazytopper/src/data/highlyProbableQuestions.ts`
- prediction/practice generators, including `predictionDataService.ts`
- worksheet generation and saved worksheet helpers
- `mistakeLogService`
- Check & Improve page/service
- Me/Profile/progress sources
- login prompt helpers
- landing memory helpers

Expected output:

| Domain | Source of truth | Used by pages | Gaps |
| --- | --- | --- | --- |
| Topic identity | `lib/desktop/topics.ts` (PR-I0) | Practice, Trends, Topic Hub, Worksheet | none known |
| Topic Hub content | `lib/desktop/topicHubContent.ts` (PR-I1) | Topic Hub | sample-preview topics outside the 14 hand-seeded; rendered Lovable side-by-side deferred to PR-J; quick-hand → Tutor Drawer integration deferred to PR-K3 |
| HPQ / prediction | `data/highlyProbableQuestions.ts`, `predictionDataService.ts` | Practice, Trends, Topic Hub | full HPQ / Chapter Test / Mock execution loop deferred to PR-K4 |
| Mistakes | `services/mistakeLogService` | Home, Practice, Worksheet, Check, Me, Topic Hub, sidebar (PR-I3) | Learning Signal data contract deferred to PR-K0 |
| Saved worksheets | `lib/desktop/savedWorksheets` (local storage) | Home, Worksheet, Me | Worksheet Level-3 output loop deferred to PR-K2 |
| Auth/login | AuthContext + `lib/desktop/loginPrompts` + `lazytopper/src/pages/Login.tsx` (PR-I2) | All gated CTAs | gating / source / returnTo hardening deferred to PR-I4B |
| App route entry + BottomNav scope | `lazytopper/src/App.tsx` (PR-I4A) | All routes | follow-up dark theme vs. Lovable prototype tracked in PR-J |
| Time-on-practice / last-5-mock-score / trend deltas | not yet wired | Me | aggregation deferred to PR-K5 |

## Mandatory Git sync rule

Every implementation task must end in GitHub, not just a Replit checkpoint.

For every implementation task:

1. Start from a fresh isolated clone or clean branch from the latest `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873) unless the task explicitly pins a SHA.
2. Verify the latest base SHA (d9d0d5df1e9de45df4e555b186903070e7b0e873) directly from GitHub before coding.
3. Create a task-specific feature branch.
4. Inspect the exact corresponding file in `topic-focus-lite` and include the Locked Prototype Parity Rule mapping in the implementation prompt and PR report.
5. Search the product repo for existing real functionality before building new logic.
6. Make only the scoped changes.
7. Run the real product build:

   ```bash
   NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
   ```

8. Run the production verifier:

   ```bash
   node scripts/verify-production-build.mjs
   ```

9. Run TypeScript when the prompt requires it or TypeScript changed:

   ```bash
   pnpm --filter lazytopper exec tsc --noEmit
   ```

10. Push to GitHub.
11. Provide a public preview URL for visible PRs and confirm what branch / SHA it serves. If unprovable, treat the preview as stale.
12. Return PR URL, base SHA, head SHA, changed files, build / verifier / typecheck results, screenshot paths, observed-CTA URLs, and PASS / PASS WITH FOLLOW-UP / HOLD classification.

## Replit workflow rule

Use Replit background tasks for implementation work. Background tasks must work from a fresh isolated clone or clean branch and push to GitHub.

Do not click `Apply changes to main version` for PR branch work unless the task is explicitly to sync/reset Replit main.

Before deploying or publishing from Replit, run a dedicated sync/reset task so Replit main exactly matches GitHub `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873). Publishing from stale Replit main is unsafe.

### Replit main / main-repl rebase warning

During PR-C2, a system-triggered rebase onto `main-repl/main` polluted the PR branch with unrelated files because `main-repl/main` was behind `base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873). The branch had to be repaired by rewinding to the clean PR head and reapplying only the intended file.

Durable rule:

- Do not rebase PR branches onto Replit main or `main-repl/main`.
- Replit main is not source of truth.
- PR branches should be based on latest `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873), unless a task explicitly pins a SHA.
- If a Replit system step tries to rebase onto main and pollutes the branch, stop immediately, create a backup branch, restore the clean PR/base lineage, and verify final GitHub diff against `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873).
- Screenshot artifacts must not be committed unless explicitly requested.
- Replit's automatic checkpoint commits may add `.agents/`, `screenshots/`, `opengraph.jpg`, or other non-product files to the local branch. These must not be pushed. Verify the GitHub PR file list still shows only the intended product/docs files before requesting an audit.

### Replit main stale-workspace warning

Replit main is occasionally far behind `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873) (for example, after a sequence of feature merges has happened entirely through GitHub). When Replit main is stale:

- Publishing from Replit will ship stale code and is unsafe.
- A Replit Deployment from a feature-branch container will deploy the current container's working directory, not stale main, but it will still overwrite the live deployment slot. Use this only when the user has explicitly approved overwriting production.
- The safe path is to first run a Replit main sync/reset task so Replit main exactly matches `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873), then publish.

## Replit main sync/reset checkpoint

Use this only when explicitly requested, usually after a stable checkpoint or before publish.

Purpose: make Replit main exactly match GitHub `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873).

Required behavior:

1. Do not implement features.
2. Do not manually edit product code.
3. Do not open a product PR.
4. Show current local branch and HEAD.
5. Show local status and untracked files.
6. Fetch origin.
7. Show `origin/base/approved-thru-437` SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873.
8. List local-only/untracked files before deleting anything.
9. Stop if any local-only file looks like valuable product work.
10. Hard reset only after the user approves or the prompt explicitly authorizes it.
11. Clean stale artifacts only after listing them.
12. Confirm local HEAD equals `origin/base/approved-thru-437` (SHA: d9d0d5df1e9de45df4e555b186903070e7b0e873).
13. Run build, verifier, and typecheck.
14. Return confirmation that Replit main is ready for preview/publish.

## Next PR planning notes

### PR-I4B — Route / gating / source / returnTo hardening

Production target:

- App-wide route helpers, gating wrappers, and CTA wiring across `lazytopper/src/App.tsx`, `lazytopper/src/lib/desktop/navigation.ts`, `lazytopper/src/lib/desktop/loginPrompts.ts`, and consumer pages.

Current audit expectation:

- Audit every desktop CTA that crosses pages (Home, Practice, Worksheet, Trends, Topic Hub, Check, Me, Login).
- Confirm `source=...` and `returnTo=...` are preserved end-to-end and URL-encoded consistently.
- Confirm BackToParent on every hub honours an explicit `?returnTo=...` and falls back to a sensible parent route.
- Confirm gating (free / trial / premium / signed-out / local-guest) is applied consistently and that gated CTAs route through `/login?reason=...&redirect=...` with a recognised `reason`.
- Confirm no React route literal includes `/app/*` (React routes must be production routes; the browser URL gets `/app/` only via `BASE_PATH`).
- Add a small shared helper if the same source/returnTo composition is being repeated across files.
- Do not introduce new login `reason` values without expanding the canonical list above.

### PR-K0 — Learning Signal / Me / Mistake Intel data contract

Define the shared data contract that K1–K5 will write to and read from:

- mistake event shape (existing `mistakeLogService`)
- attempt / output records produced by Practice, Worksheet, Check, HPQ, Chapter Test, Mock
- Me aggregation read-model (subject, topic, time-on-practice, last-5-mock-score, trend deltas)
- learning-signal continuity from execution surfaces back into Mistake Intelligence and Me

Audit-only first; small helpers if explicitly approved.

### PR-K1 — Practice Level-3 execution and output loop

Production target: `DesktopPracticePage` execution surfaces.

- Generated quick practice produces a real attempt record and real mistake events.
- Outputs flow into Mistake Intelligence and Me.

### PR-K2 — Worksheet Level-3 output loop

Production target: `DesktopWorksheetsPage` builder / result / attempt surfaces.

- Worksheet attempts produce real output and real mistake events.
- `savedWorksheets` connects to the Me aggregation read-model defined in PR-K0.

### PR-K3 — Topic Hub quick-hand + Tutor Drawer integration

Production target: `DesktopTopicHubPage` "Need a quick hand" cluster.

- Replace the static reference cards with a real side-drawer / overlay backed by existing `TutorDrawerV2` / `TeachFlow`.
- No fake mastery / fake "you understood X%" claims.
- Mini Check uses real practice generation.

### PR-K4 — HPQ / Chapter Test / Mock execution loop

Production target: HPQ attempt / detail, Chapter Test, Mock Test execution surfaces.

- Real attempt records, real mistake events, real result surfaces.
- Connects to PR-K0 contract.

### PR-K5 — Me / Progress aggregation

Production target: `DesktopMePage` and shell sidebar Mistake Intel.

- Wires the Me read-model defined in PR-K0.
- Resolves the PR-H follow-ups: time-on-practice, last-5-mock-score, trend deltas.

### PR-J — Final desktop polish + Lovable side-by-side

Production target: all desktop graduation pages.

- Run the rendered Lovable side-by-side comparison using the public published prototype at `https://light-topic-pilot.lovable.app/app`.
- Resolve the PR-I4A follow-up (dark theme / theme toggle vs. light Lovable prototype).
- Capture any final visual / copy / spacing gaps and resolve them.
- Confirm PASS-WITH-FOLLOW-UP carry-overs from PR-H, PR-I1, and PR-I4A are either resolved, scoped to a follow-up PR, or explicitly accepted as final empty / labelled states.
- Mandatory Replit main sync/reset before publish.
