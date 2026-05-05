# PR-K2C Audit: Worksheet learner loop entry points

## Purpose

Adds the first real worksheet learner-loop entry points:
Generate worksheet -> attempt -> check my answer -> practice similar questions.

The loop uses production routes and real Check & Improve. It does not fake grading, progress, mastery, mistakes, scores, weak areas, or Mistake Intelligence.

## Files changed

- lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx
- docs/audits/pr-k2c-worksheet-learner-loop.md
- handoff/SESSION_LOG.md
- handoff/CURRENT_STATE.md
- handoff/NEXT_ACTION.md

## Behavior

- Attempt this worksheet: local/current-session guidance only.
- Check my answer: routes to real Check & Improve.
- Practice similar questions: routes to existing Practice path.

## Navigation

- Check path preserves source=worksheet.
- Check path preserves returnTo.
- Practice path preserves worksheet source/return context.
- No prototype /app/* React route literals are introduced.

## Data honesty

- Attempt is not checked.
- Check-start is not checked answer.
- Saved/attempted worksheet is not progress.
- Saved/attempted worksheet is not mastery.
- Saved/attempted worksheet is not Mistake Intelligence.
- No fake grading, score, mistake logs, weak areas, or progress.

## Activity recording decision

Optional worksheet activity recording was skipped in this PR to keep scope narrow. A later PR may record worksheet_attempt_started and worksheet_check_started as activity-only events.

## Validation

- pnpm --filter lazytopper exec tsc --noEmit
- NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
- node scripts/verify-production-build.mjs
- git diff --name-only origin/base/approved-thru-437...HEAD

## QA checklist

- Generate worksheet still works.
- Learner loop appears.
- Attempt this worksheet shows honest local attempt copy.
- Check my answer routes to Check & Improve with source=worksheet and returnTo.
- Practice similar questions routes to Practice.
- No fake progress, mastery, score, checked answer, or Mistake Intelligence claim appears.
