# PR-K2B Audit: Wire Worksheet Save to Profile

**Timestamp:** 2026-05-05T00:00:00Z UTC

## Purpose
Wire the desktop worksheet “Save worksheet” action to the K2A profile save helper for signed-in users, while preserving device-only save for signed-out users. Ensure honest status/copy and no progress/mastery claims.

## Files Changed
- lazytopper/src/pages/desktop/DesktopWorksheetsPage.tsx
- docs/audits/pr-k2b-worksheet-profile-save-wiring.md (this doc)
- handoff/SESSION_LOG.md
- handoff/CURRENT_STATE.md
- handoff/NEXT_ACTION.md

## K2A Dependency
Depends on K2A’s worksheetProfileService.ts, specifically:
- saveWorksheetToProfile(uid, draft)
- recordWorksheetActivity(uid, draft) (optional, see below)

## Signed-in Behavior
- If user is signed in (user.uid present), worksheet save uses saveWorksheetToProfile.
- Draft includes all required fields: worksheetId, savedAt, label, subject, stream, scope, topicKey(s), sectionFilter, difficulty, questionCount, mistakeFocusTopicKey if available.
- UI copy reflects K2A status:
  - profile-saved: “Saved to your profile.”
  - local-only: “Saved locally. Profile sync is unavailable right now.”
  - skipped-signed-out: fallback to device-only save/copy.
  - failed: honest error message.
- No progress/mastery/Me/Mistake Intelligence claims.

## Signed-out Fallback Behavior
- If user is signed out (no uid), fallback to existing saveWorksheet (device-only).
- UI copy: “Saved on this device.”
- No cloud/profile implication.

## Status-to-Copy Mapping
- profile-saved: “Saved to your profile.”
- local-only: “Saved locally. Profile sync is unavailable right now.”
- skipped-signed-out: “Saved on this device.”
- failed: “Couldn’t save — local or profile save failed.”

## Data-Honesty Gates
- No progress/mastery/Me/Mistake Intelligence claims.
- No profile count unless reading actual profile/local profile cache.
- Honest copy for all statuses.

## Non-goals
- No changes to worksheet generator, Me/Progress, Mistake Intelligence, question banks, or package files.
- No broad UI rewrites.

## Validation Commands
- pnpm --filter lazytopper exec tsc --noEmit
- NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
- node scripts/verify-production-build.mjs
- git diff --name-only origin/base/approved-thru-437...HEAD

## Manual/Browser QA Checklist
- [ ] Signed-out: Save worksheet → “Saved on this device.”
- [ ] Signed-in: Save worksheet → “Saved to your profile.” or “Saved locally. Profile sync is unavailable right now.”
- [ ] Signed-in: Save worksheet, simulate Firestore failure → “Saved locally. Profile sync is unavailable right now.”
- [ ] Signed-in: Save worksheet, simulate both failures → “Couldn’t save — local or profile save failed.”
- [ ] No progress/mastery/Me/Mistake Intelligence claims in UI.

## K2C Follow-up
- Profile-saved worksheet count in UI (only after honest cache/profile read is implemented).
- Activity event (recordWorksheetActivity) if not implemented here.
- Broader worksheet library/profile sync.
