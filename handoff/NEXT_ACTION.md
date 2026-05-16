# LazyTopper Next Action

Timestamp:
2026-05-16T18:55:00Z UTC / 2026-05-17 00:25 IST

## Current State

This is a docs-only handoff update after PR #80 merge.
- PR #80 / PR-K2H-4 is merged into `base/approved-thru-437`.
- Live base: `018c95b11f5168d27fb93bb3a2cae3859b682627`.
- Final PR #80 head: `045ffa00a3894405f67a5ceda778f313c693fa0f`.
- PR #80 QA result: PASS.
- Frozen landing page implementation is complete and should not be redesigned casually.
- Explore-first product inspection is implemented through `/browse`.
- No product implementation PR is active in this handoff update.
- No open implementation PR should be assumed unless live GitHub says so.

## Next Immediate Action

1. Verify PR #80 merge commit is the live base: `018c95b11f5168d27fb93bb3a2cae3859b682627`.
2. Complete this docs-only handoff update.
3. Audit the local docs diff before any commit/push.
4. After docs merge, start PR-K2H-5 - Login visual parity + auth gate polish.
5. Do not start implementation from stale local branches.

## Recommended Next Implementation PR

PR-K2H-5 - Login visual parity + auth gate polish.

Allowed likely scope:
- `lazytopper/src/pages/Login.tsx`
- `lazytopper/src/lib/desktop/loginPrompts.ts`
- Optional only if proven necessary: small Login-only style/helper file if already existing and safe.

Forbidden unless owner explicitly changes scope:
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

- Clerk friction / auth strategy remains an open product question.
- Home card order: owner noted learning order should be Exam Trends -> Practice -> Worksheets -> Check & Improve.
- Pricing visual redesign remains pending.
- Continue where you left off route repair remains pending.
- `/profile` direct-reference cleanup remains pending.
- Payment gateway / GPay / UPI QR / Razorpay/Cashfree is deferred and must be server/admin verified.

## PR #69 / K2D Separation Rule

PR #69 / K2D remains separate from this handoff sequence.
- Do not merge PR #69 blindly or automatically.
- Do not absorb K2D into K2H without explicit audit and product owner approval.
- Each PR must be audited and validated independently before merge.
