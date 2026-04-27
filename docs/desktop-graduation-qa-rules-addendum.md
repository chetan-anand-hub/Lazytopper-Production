# Desktop Graduation QA Rules Addendum

Last updated: 2026-04-27

This addendum records rules that must also be folded into docs/desktop-graduation-state.md.

## Durable docs rule

When desktop graduation rules change, update docs/desktop-graduation-state.md in a docs-only PR or in the same scoped PR if documentation changes are explicitly allowed. Do not rely only on chat memory, Replit reports, or PR comments for durable process rules.

## Existing-product-first rule

Desktop graduation is not a rebuild from scratch. For every page, inspect the locked prototype, then search the production repo for the existing LazyTopper implementation and reuse, adapt, or recompose it before building new logic. New code should be small glue: adapters, route helpers, view models, source/return helpers, or local persistence helpers.

## Locked parity standard

Locked prototype parity means visual parity, journey parity, functional parity, and real-data parity. Static reference data must not be presented as the learner's own data. Honest fallback copy is only a temporary bridge; in final-stage product development, missing functionality should be built when safely practical.

## Live visual/navigation QA rule

A static source review plus a passing build is not enough to classify a visible desktop PR as fully merge-ready. Before PASS — mergeable, a visible desktop graduation PR needs a live preview pass from the PR branch with desktop screenshots, click-through/navigation checks, mobile-width unchanged confirmation where relevant, build, verifier, and typecheck where required. If live preview cannot be run, classify at most PASS WITH FOLLOW-UP unless the user explicitly waives the live-preview gate.

## Landing/login prompting rule

The locked prototype's public landing and reason-aware login prompting are part of the desktop product journey. Production should preserve route conventions while implementing equivalent behavior: /login?reason=...&redirect=... rather than blindly copying prototype /app/* routes. Reasons include start-trial, login, save-worksheet, upload-answers, grade-answer, open-progress, mistake-aware, mistake-aware-worksheet, start-full-mock, and open-check.

## PR-D current state

As of GitHub audit, PR #22 is open, draft, and unmerged at head 7a65c31a559c8c1c89fe4ce62379c23d11400350, based on base/approved-thru-437 at 0aac23af7aa23823eb070925fa462621f0302dfa. The full PR diff has three files: App.tsx, savedWorksheets.ts, and DesktopWorksheetsPage.tsx. PR #17 remains open/draft/unmerged at 14024f4a1ec0234f915b7d56da0d25b7824f8f48.

Task #466 completed static visual/navigation QA and build/typecheck/verifier checks, but did not capture live preview screenshots. PR-D should not be treated as fully merge-ready until live preview QA is completed or the user explicitly waives that gate.
