# LazyTopper Next Action

Timestamp:
2026-05-17T12:20:00Z UTC / 2026-05-17 17:50 IST

## Current State

This is a docs-only handoff update after PR #82 merge.
- PR #82 / PR-K2H-5 is merged into `base/approved-thru-437`.
- Live base: `11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.
- Previous checkpoint before PR #82: `283355dec5ced04bbe72976f5f068593e0900799`.
- Final PR #82 head: `06ba3cd74c93cf0c47fd44a4957e72b97a782765`.
- PR #82 QA result: PASS.
- Login visual parity + auth gate polish is complete.
- Frozen landing page implementation remains frozen and should not be redesigned casually.
- Explore-first product inspection remains implemented through `/browse`.
- No product implementation PR is active in this handoff update.
- No open implementation PR should be assumed unless live GitHub says so.

## Next Immediate Action

1. Verify PR #82 merge commit is the live base: `11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.
2. Complete this docs-only handoff update.
3. Audit the local docs diff before any commit/push.
4. After docs merge, start PR-K2H-6 - Home/cockpit learning order + Continue repair.
5. Do not start implementation from stale local branches.

## Recommended Next Implementation PR

PR-K2H-6 - Home/cockpit learning order + Continue repair.

PR-K2H-6 goals:
- Make Home/browse cockpit order match the learning loop: Exam Trends -> Practice -> Worksheets -> Check & Improve.
- Repair "Continue where you left off" so it never routes to TopicHub "Topic not found."
- If the saved topic is not curated, hide the continue card or route safely to Practice Hub / Exam Trends with honest state.
- Do not touch landing, Login, pricing, Practice internals, HPQ, or TopicHub content unless a future K2H-6 prompt explicitly scopes it.
- Do not start PR-K2H-6 until this docs-only handoff update is merged.
- Future product prompts must use `base/approved-thru-437 @ 11aac1bc8bce67e6b2d67e540b4295491c0b78e0`.

## Data-Honesty Guardrails

- LazyTopper is browse-first and action-gated.
- Public landing is frozen from PR #80.
- Landing has one primary CTA only: Explore.
- No Start free trial on landing.
- No Explore as Guest on landing.
- No real-app guest mode.
- No fake local session or fake user.
- Browse mode is for product inspection only and must not create learner data.
- Every real learner should authenticate before real learning actions.
- Signing in is required to save attempts, progress, mistakes, checked answers, and Mistake Intelligence.
- No fake progress, mastery, score, weak areas, premium, payment, or Mistake Intelligence.
- Practice Level-3 visual design from PR #73 remains approved/frozen.
- Preserve PR #77 route-context behavior and source/returnTo navigation.

## Active Follow-ups

- Production launch still requires Clerk production instance / `pk_live` env configuration.
- Do not treat `unsafe_disableDevelopmentModeWarnings` as a substitute for production Clerk configuration.
- Before public launch, capture Vercel/production Login screenshot with production Clerk config.
- External Google/Clerk continuation screens remain outside app UI control.
- Home card order: owner noted learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve.
- Continue where you left off route repair remains pending.
- Pricing visual redesign remains pending.
- `/profile` direct-reference cleanup remains pending.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified.

## Operating Model

- Codex should be used for code edits, local validation, screenshots, source diff/report only.
- Owner will use VS Code PowerShell for commit, push, and PR creation/update unless explicitly overridden.
- GPT remains prompt writer, source/PR auditor, and merge recommender.

## PR #69 / K2D Separation Rule

PR #69 / K2D remains separate from this handoff sequence.
- Do not merge PR #69 blindly or automatically.
- Do not absorb K2D into K2H without explicit audit and product owner approval.
- Each PR must be audited and validated independently before merge.
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
