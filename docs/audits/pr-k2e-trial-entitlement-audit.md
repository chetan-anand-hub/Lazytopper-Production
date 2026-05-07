# PR-K2E Trial Entitlement Audit

## Summary

This audit reviews LazyTopper's 7-day trial entitlement model and verifies whether active trial state unlocks the full premium surface in the product rules.

## Findings

- Trial activation is CTA-driven. The `UpgradeModal` and premium gate flows call `startTrial()` only when a free user chooses to unlock access, rather than automatically granting trial entitlement on generic sign-in.
- Active trial is treated as premium access. The mobile subscription logic computes `isPremium` as `tier === "trial" || tier === "premium"`, so active trial users satisfy premium checks in gating components.
- Trial persistence is user-scoped and local. In the mobile subscription context, trial status is stored in AsyncStorage keyed by `uid`, then reloaded for the same signed-in user.
- Expiry behavior is explicit. After `trialEndDate`, `applyExpiry()` resets the tier to `free`, and UI components show an expired trial state.

## Evidence

- `lazytopper/src/components/UpgradeModal.tsx` uses `startTrial()` when the current tier is `free` and the trial is not expired, then reloads the application.
- `artifacts/lazytopper-mobile/context/SubscriptionContext.tsx` stores trial start/end dates and computes `isPremium` from `trial` or `premium` tiers.
- `lazytopper/src/components/auth/RequirePremium.tsx` performs premium gating and opens `UpgradeModal` when `isPremium` is false.
- `lazytopper/src/components/auth/MockViewGate.tsx` allows signed-in trial users through the mock view gate by treating `isPremium` true for trial users, while expired trials are handled as trial-ended state.
- `lazytopper/src/components/ux/TrialBanner.tsx` displays active trial progress and shows an expired trial banner after the trial ends.

## Product-rule assessment

The source indicates that a signed-in active trial should unlock the full premium gating surface for features protected by `RequirePremium` and mock-view gating. Active trial state is intentionally classified as premium access in the subscription rule set.

## Gaps / risks

- The visible source captures the trial logic in the mobile subscription context; the desktop / web gating implementation should be verified separately, especially if the web app uses a different persistence model.
- Real product confidence depends on browser QA with an actual signed-in active-trial user, not just static code inspection.
- Expired trial handling is explicit, but the transition edge cases around `trialEndDate` and refresh/reload behavior should be tested.

## Browser QA plan

1. Sign in as a user with an active trial state and verify the following:
   - full premium features are unlocked where `RequirePremium` is used
   - `UpgradeModal` reflects active trial status and remaining days
   - `TrialBanner` shows active trial progress
2. Sign in as a user with a trial that has just expired and verify the expired trial UI path and gating behavior.
3. Sign in as a premium user and verify premium access remains unchanged.
4. Test HPQ, Practice, mocks, worksheets, TopicHub, Check & Improve, Study Plan, Daily Mission, weak-area practice, and Me / Progress flows under active trial, expired trial, and premium states.

## Recommendation

This is a docs-only audit suitable for Browser QA validation. Focus on signed-in trial states and verify trial-to-premium access across the core feature surfaces.
