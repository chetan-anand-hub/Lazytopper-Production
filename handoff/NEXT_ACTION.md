# LazyTopper Next Action

Timestamp:
Use current UTC timestamp from:
`date -u +"%Y-%m-%dT%H:%M:%SZ"`

## Current base

Active branch:
base/approved-thru-437

Latest confirmed base:
82995d6c7d4ab4bd516076b95ce8aa61cca298a0

## Next safe action

PR-K2A — Worksheet profile-save contract/helper.

## What K2A must do

K2A should add a small service/contract for signed-in worksheet profile saving and worksheet activity events.

It should create the foundation for trial users to have worksheet activity associated with profile before later PRs connect Me / Progress and Mistake Intelligence.

## What K2A must not do

Do not start with UI changes.

Do not claim:
- saved progress
- mastery
- Mistake Intelligence
- Me / Progress update
- checked answer
- mistake logged
- AI grading
- AI-generated solution availability

## Likely allowed files for K2A

- lazytopper/src/services/worksheetProfileService.ts
- docs/audits/pr-k2a-worksheet-profile-save-contract.md

## Forbidden files for K2A unless explicitly re-approved

- lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx
- lazytopper/src/pages/app/WorksheetReady.tsx
- lazytopper/src/pages/desktop/DesktopMePage.tsx
- lazytopper/src/pages/desktop/DesktopPracticePage.tsx
- question banks
- worksheet generator
- mistake services
- package files
- UI surfaces

## Required K2A state separation

- worksheet_generated
- worksheet_saved
- worksheet_attempt_started
- worksheet_attempted
- worksheet_check_started
- answer_checked
- mistake_logged

## K2A data-honesty doctrine

- generated is not progress
- saved is not mastery
- attempted is not checked
- checked is not mistake logged unless real mistake log exists
- Mistake Intelligence only from saved checked evidence
- Me / Progress aggregation is later, not K2A

## Required first commands for next implementation session

git fetch origin
git switch base/approved-thru-437
git pull --ff-only origin base/approved-thru-437
git rev-parse HEAD
git status --short

Expected base:
82995d6c7d4ab4bd516076b95ce8aa61cca298a0

Then create:
feat/desktop-pr-k2a-worksheet-profile-contract
