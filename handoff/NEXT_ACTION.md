# LazyTopper Next Action

Timestamp:
2026-05-20T17:45:22Z UTC

## Current State

Timestamp: 2026-05-21T17:31:56Z UTC
Live base: `b88ed11fb85aec1a9739207dd0eeea5fcdb7b264`
Last merged: PR #98 / Science chapters 1-7 NCERT+Exemplar extraction (608 questions).
Next: content/question-bank-expansion-02 — Science chapters 8-13 + Maths chapters 1-14 NCERT+Exemplar extraction. Future product prompts must use `base/approved-thru-437 @ b88ed11fb85aec1a9739207dd0eeea5fcdb7b264`.

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
