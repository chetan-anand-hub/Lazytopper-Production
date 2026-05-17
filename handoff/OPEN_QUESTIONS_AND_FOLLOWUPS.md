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

## 2026-05-07 Ã¢â‚¬â€ Practice and HPQ Level-3 design grammar alignment

Status:
Active follow-up before desktop graduation sign-off.

Observation:
During manual 7-day trial QA, Practice and HPQ old-format pages were confirmed functional but visually outdated. They do not echo the Level-3 / desktop design grammar of the overall LazyTopper site. While functionally correct, this visual/design parity gap is a key item for pre-graduation review.

Action:
Plan a future scoped PR (likely PR-K2F or equivalent) to align Practice and HPQ surfaces with the upgraded Level-3 desktop design grammar. Do not block trial entitlement. Add to implementation roadmap for post-K2E stage.

## 2026-05-07 Ã¢â‚¬â€ Browser Agent cannot complete magic-link auth without inbox access

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

## PR-K2H-6 Continue Repair Decision â€” Option B

Owner-approved decision: use Option B for the K2H-6 â€œContinue where you left offâ€ repair.

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

PR #85 / PR-K2H-6 â€” Home cockpit order + safe Continue repair is merged.

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
