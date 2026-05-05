# PR-K2A Audit: Worksheet Profile Save Contract (REPAIRED)

**Timestamp:** 2026-05-05T12:30:00Z UTC

**Branch:** `feat/desktop-pr-k2a-worksheet-profile-contract`

**Base:** `8ff9a33be8345f201d54d91fdfe21f221093d537` (origin/base/approved-thru-437)

---

## Repair Summary

**Repaired:** 2026-05-05T12:30:00Z UTC

Original PR-K2A contract was improved to fix:
1. **Do not require authClient.currentUser before local writes** — Accept any uid; let Firestore rules decide
2. **Make local write success honest** — writeLocalJson returns boolean with read-back verification
3. **Independent write attempts** — Try both local and Firestore; don't skip Firestore if local fails
4. **Null record for skipped** — Return record: null for skipped-signed-out so K2B can distinguish
5. **Detailed result shape** — Include localCacheSaved, firestoreAttempted, firestorePath, errorMessage for debugging

---

## Purpose

PR-K2A introduces a typed contract and helper service for signed-in worksheet profile saving and activity event recording. This foundation allows trial users to persist worksheet data to their profile in the cloud while maintaining local-only fallback for signed-out users.

The service is **non-visual**, **contract-only**, and focuses on:
- Honest data persistence (no inference or claims)
- Local-first durability (always write to localStorage)
- Graceful cloud fallback (attempt Firestore, report honest status)
- State separation (activities remain distinct, no automatic progress/mastery)

---

## Files Changed

- **lazytopper/src/services/worksheetProfileService.ts** — new service
- **docs/audits/pr-k2a-worksheet-profile-save-contract.md** — this document
- **handoff/SESSION_LOG.md** — timestamped session entry

---

## Current Context: Local-Only Worksheet Save

### What exists before K2A

The existing `lazytopper/src/lib/desktop/savedWorksheets.ts` handles signed-out device-only saves:

```
localStorage key: lazytopper.desktop.savedWorksheets.v1
UI label: "Saved on this device"
Scope: local persistence only, no cloud sync
Lifespan: survives device reload, lost on browser data clear
Auth requirement: none
```

This is **intentionally** device-only and honestly labelled. Users understand their saves are not portable.

### Why K2A adds a new service

The new signed-in profile path:
- Must be clearly separate (different storage keys, different Firestore collections)
- Must use the same `learnerProfiles/{uid}` pattern as other user data (mistakeLogs, etc.)
- Must not interfere with signed-out local-only saves
- Must return honest write statuses (profile-saved vs local-only vs failed)
- Must not claim progress/mastery until later PRs wire up aggregation

K2B (wire worksheet save to profile) will later connect the UI to K2A.
K2C (learner loop) will wire the full journey and add progress tracking later.

---

## Repair Details (2026-05-05)

### Additional repair — Firestore success with local cache failure

The service now treats Firestore/profile success as a successful `profile-saved` outcome even when the local cache write fails.

This means:
- `profile-saved` means the profile/cloud write succeeded.
- `localCacheSaved` independently tells whether local cache also succeeded.
- `local-only` means local cache succeeded but Firestore was unavailable or failed.
- `failed` means neither local cache nor Firestore/profile persistence succeeded.


### What Was Fixed

**1. Do not require authClient.currentUser check before local writes**
- **Before:** Service checked authClient.currentUser and rejected if not authenticated
- **After:** Service accepts `uid: string | null | undefined` and only checks if uid is truthy
- **Why:** Firestore rules will enforce auth; local cache write is safe to attempt regardless
- **Impact:** Caller has more control; can pass null uid and get skipped-signed-out transparently

**2. Make local write success honest**
- **Before:** writeLocalJson() silently ignored errors; no feedback on success
- **After:** writeLocalJson() returns boolean; reads back written data to verify
- **Why:** Caller must know if local cache actually succeeded; cannot assume true
- **Impact:** localCacheSaved field is now trustworthy; K2B can offer exact feedback

**3. Do not skip Firestore only because localStorage failed**
- **Before:** If local write failed, Firestore attempt was skipped entirely
- **After:** Attempts both local and Firestore independently; tries Firestore even if local fails
- **Why:** Firestore write might still succeed; don't lose the chance by early exit
- **Impact:** Resilience improved; if localStorage fails but Firestore succeeds, result is "profile-saved" not "failed"

**4. Return null record for skipped-signed-out**
- **Before:** Returned a record object even when skipped
- **After:** Returns record: null when uid is missing/empty
- **Why:** K2B must distinguish "skipped because no uid" from "successfully saved"; null is unambiguous
- **Impact:** K2B can safely check `if (result.record !== null)` to know if data persisted

**5. Provide detailed result shape with diagnostics**
- **Before:** Returned simple `{ status, record }`
- **After:** Returns `{ status, id, record, localCacheSaved, firestoreAttempted, firestorePath, errorMessage }`
- **Why:** K2B UI needs to explain what happened; callers need error details for debugging
- **Impact:** K2B can show "Saved locally; will sync when online" based on exact fields

---

## Current Service Contract

### Types

#### `WriteStatus`
Honest outcome of a save operation:
```typescript
type WriteStatus = "profile-saved" | "local-only" | "skipped-signed-out" | "failed"
```

- **profile-saved**: Firestore/profile save succeeded; `localCacheSaved` reports whether local cache also succeeded
- **local-only**: Written to localStorage; Firestore write unavailable or failed
- **skipped-signed-out**: User not authenticated; operation skipped entirely
- **failed**: Both localStorage and Firestore writes failed (rare; quota exceeded)

#### Worksheet Activity States
```typescript
type WorksheetActivityKind =
  | "worksheet_generated"       // User requested worksheet generation
  | "worksheet_saved"           // User saved a generated worksheet
  | "worksheet_attempt_started" // User opened worksheet for attempt
  | "worksheet_attempted"       // User submitted attempt answers
  | "worksheet_check_started"   // User started check/review flow
  | "answer_checked"            // User reviewed a specific checked answer
  | "mistake_logged"            // User logged/recorded a mistake
```

Each state is **distinct and honest** — e.g. "attempted" is not "checked", "checked" is not "logged".

#### Saved Worksheet

**Draft** (what caller provides):
```typescript
interface SavedWorksheetDraft {
  worksheetId: string          // Session-unique ID
  savedAt: string              // ISO-8601 timestamp
  label: string                // User-facing label
  subject: "Maths" | "Science"
  stream: "All" | "Physics" | "Chemistry" | "Biology"
  scope: "topic" | "multi-topic" | "full-subject"
  topicKey: string | string[]  // Main scope topic(s)
  sectionFilter: string | string[]
  difficulty: "All" | "Easy" | "Medium" | "Hard"
  questionCount: number
  mistakeFocusTopicKey?: string | null
}
```

**Record** (what service persists):
```typescript
interface SavedWorksheetRecord extends SavedWorksheetDraft {
  id: string                   // System-assigned unique ID
  persistedAt: string          // Cloud storage timestamp
}
```

#### Activity Event

**Draft** (what caller provides):
```typescript
interface ActivityEventDraft {
  eventId: string              // Session-unique ID
  kind: WorksheetActivityKind
  occurredAt: string           // ISO-8601 timestamp
  worksheetId?: string
  questionIndex?: number
  context?: Record<string, unknown>
}
```

**Record** (what service persists):
```typescript
interface ActivityEventRecord extends ActivityEventDraft {
  id: string
  persistedAt: string
}
```

### Public Exports

#### Worksheet Save Contract
- `saveWorksheetToProfile(uid: string | null | undefined, draft: SavedWorksheetDraft)` → `SavedWorksheetWriteResult`
- `listLocalProfileSavedWorksheets(uid: string)` → `SavedWorksheetRecord[]`

#### Activity Event Contract
- `recordWorksheetActivity(uid: string | null | undefined, draft: ActivityEventDraft)` → `ActivityEventWriteResult`
- `listLocalWorksheetActivity(uid: string)` → `ActivityEventRecord[]`

#### Optional Hydration
- `hydrateProfileFromCloud(uid: string | null | undefined)` → `Promise<void>` — optional one-time cloud fetch (called on sign-in)

#### Type Exports (re-exportable for callers)
- `WriteStatus`
- `WorksheetActivityKind`
- `SavedWorksheetDraft`, `SavedWorksheetRecord`
- `ActivityEventDraft`, `ActivityEventRecord`
- `SavedWorksheetWriteResult`, `ActivityEventWriteResult`

---

## Storage Locations

### Local Storage Keys

Signed-in profile paths (K2A):
```
lazytopper.profile.savedWorksheets.v1:{uid}    → SavedWorksheetRecord[]
lazytopper.worksheetActivity.v1:{uid}          → ActivityEventRecord[]
```

Existing signed-out path (preserved by K2A, used by K2B):
```
lazytopper.desktop.savedWorksheets.v1          → SavedWorksheet[]
```

**Important:** K2A does not touch the existing signed-out keys. They remain separate.

### Firestore Collections

Created under the existing `learnerProfiles/{uid}` structure:
```
learnerProfiles/{uid}/savedWorksheets/{worksheetId}     → SavedWorksheetRecord
learnerProfiles/{uid}/worksheetActivity/{activityId}    → ActivityEventRecord
```

**Permissions:** Protected by existing Firestore rules (isOwner(uid) check).

---

## Returned Statuses

All K2A functions return honest `WriteStatus`:

| Status | Meaning | Record | Next Action |
|--------|---------|--------|-------------|
| **profile-saved** | Firestore/profile save succeeded | Record object | Profile synced; check `localCacheSaved` for local cache outcome |
| **local-only** | Written to localStorage; Firestore skipped/failed | Record object | Cache works; will sync when Firestore available |
| **skipped-signed-out** | No uid provided | NULL | Expected for unsigned-out calls; K2B checks record !== null |
| **failed** | Both localStorage and Firestore writes failed | null or record | Rare; quota exceeded or severe error; log errorMessage |

---

## Result Shape: SavedWorksheetWriteResult / ActivityEventWriteResult

Both functions return a detailed result object:

```typescript
interface SavedWorksheetWriteResult {
  status: WriteStatus                           // One of the 4 statuses
  id: string                                    // System-assigned ID
  record: SavedWorksheetRecord | null           // Record object (null if skipped)
  localCacheSaved: boolean                      // Whether localStorage write succeeded
  firestoreAttempted: boolean                   // Whether Firestore write was tried
  firestorePath?: string                        // Path to Firestore doc (if attempted)
  errorMessage?: string                         // Diagnostic error message
}
```

**Key fields for K2B:**
- `status` — tells UI what happened (profile-saved, local-only, skipped, failed)
- `record` — null if skipped-signed-out (distinguishes from saved)
- `localCacheSaved` — whether data persists locally even if cloud failed
- `errorMessage` — debugging info if write failed

**Example interpretation:**
```
status: "local-only", record: SavedWorksheetRecord, localCacheSaved: true
→ Data saved locally but Firestore unavailable; safe to show "Saved locally; will sync when online"

status: "skipped-signed-out", record: null, localCacheSaved: false
→ No uid provided; K2B should fall back to device-only save instead

status: "failed", record: null, errorMessage: "..."
→ Both local and Firestore failed; show error to user with errorMessage detail
```

---

## Caller Responsibility (K2B)

---

## State Separation and Data Honesty

### Activity States Are Distinct

K2A tracks exactly what the user did, in order:
- `worksheet_generated` ≠ progress (user requested it; doesn't mean they use it)
- `worksheet_saved` ≠ mastery (user saved; doesn't mean they solved it)
- `worksheet_attempted` ≠ checked (user submitted answers; system hasn't reviewed them)
- `answer_checked` ≠ mistake_logged (system showed answer; user hasn't reported mistake)
- `mistake_logged` requires real mistake log (not inferred from attempted or checked)

### No Progress or Mastery Claims

K2A does not and must not:
- Add to `Me / Progress` aggregation
- Calculate mastery percentages
- Feed Mistake Intelligence directly
- Persist checked answers as "solutions"
- Persist generated questions as "questions in the question bank"

### Me / Progress Aggregation is Later (K2D or beyond)

Later PRs will:
- Read activity history + checked answers
- Combine with Me rules (e.g. "last attempt in last 7 days")
- Compute progress/mastery with explicit business logic
- Update `learnerProgress/{uid}` collections
- Feed Mistake Intelligence from saved checked evidence

### Mistake Intelligence is Later (K2D or beyond)

Mistake Intelligence requires:
- Real checked answers (user submitted → system checked → user saw)
- Not inferred from generated or attempted without check
- Real mistake logs (user explicitly reported)
- Not all disagreements are meaningful mistakes

---

## Non-Goals

K2A explicitly does **not**:
- Add UI changes (no new pages, buttons, or labels)
- Wire the save CTA to cloud (K2B responsibility)
- Compute progress or mastery
- Generate or store mistake logs (worksheet check path does that later)
- Sync checked answers between devices
- Handle conflict resolution or merges
- Provide version history or restore
- Cache or materialize Me / Progress dashboard

---

## Use Pattern Example

```typescript
// When user saves a worksheet (signed-in)
const uid = currentUser.uid || null;  // Might be null if signed-out

const draft: SavedWorksheetDraft = {
  worksheetId: "ws-1234567890",
  savedAt: new Date().toISOString(),
  label: "Triangles · 10 questions",
  subject: "Maths",
  stream: "All",
  scope: "topic",
  topicKey: "triangles",
  sectionFilter: "All",
  difficulty: "All",
  questionCount: 10,
};

const result = await saveWorksheetToProfile(uid, draft);

// Check exact status + record to determine UI behavior
if (result.status === "skipped-signed-out" && result.record === null) {
  // No uid; K2B should use device-only save (existing fallback)
  // Do NOT fall through to cloud save
} else if (result.status === "profile-saved") {
  // Show success: "Saved to profile"
} else if (result.status === "local-only") {
  // Show info: "Saved locally. Will sync when online."
} else if (result.status === "failed") {
  // Show error: use result.errorMessage for details
}

// For debugging, can inspect details
console.log({
  status: result.status,
  recordId: result.record?.id,
  localCacheSaved: result.localCacheSaved,
  firestoreAttempted: result.firestoreAttempted,
  firestorePath: result.firestorePath,
  errorMessage: result.errorMessage,
});

// When user opens worksheet for attempt (still signed-in)
const actDraft: ActivityEventDraft = {
  eventId: "act-1234567890",
  kind: "worksheet_attempt_started",
  occurredAt: new Date().toISOString(),
  worksheetId: "ws-1234567890",
};

const actResult = await recordWorksheetActivity(uid, actDraft);
// Same pattern: check status + record to interpret result
// Never auto-increment progress based on activity kind alone
```

---

## Validation

### TypeScript Compilation
```bash
pnpm --filter lazytopper exec tsc --noEmit
```
Expected: No errors. Service compiles cleanly.

### Production Build
```bash
NODE_ENV=production BASE_PATH=/app/ pnpm --filter lazytopper run build
```
Expected: No errors. App builds with new service included.

### Build Verification
```bash
node scripts/verify-production-build.mjs
```
Expected: No errors. Build assets are valid.

### Git Diff Check
```bash
git diff --name-only origin/base/approved-thru-437...HEAD
```
Expected output:
```
lazytopper/src/services/worksheetProfileService.ts
docs/audits/pr-k2a-worksheet-profile-save-contract.md
handoff/SESSION_LOG.md
```

No other files should be modified. If any forbidden files are changed, repair before pushing.

---

## K2B Follow-Up

PR-K2B ("Wire worksheet save to profile") will:
1. Wire the existing "Save worksheet" CTA to `saveWorksheetToProfile()`
2. Update UI labels to distinguish signed-in vs signed-out save status
3. Preserve local-only fallback for signed-out users
4. Return WriteStatus to UI for transparent feedback
5. No progress/mastery claims in K2B either

---

## Browser QA

**Not required for K2A** because:
- No UI changes
- No visual elements added
- Service is contract/helper only
- Functional testing via unit tests and build validation
- K2B will require Browser QA for UI/save-flow changes

---

## Dependency and Sequencing

| PR | Purpose | Blocked By | Blocks |
|----|---------| ---------- | ------ |
| K2A | Profile save contract | — | K2B |
| K2B | Wire save to profile UI | K2A | K2C |
| K2C | Learner loop (attempt → check → see progress) | K2A, K2B | K2D |
| K2D | Me / Progress aggregation | K2A, K2B, K2C | K2E+ |

---

## Session Decisions and Learnings

### Decision: Wait Until K2D for Me / Progress

Initially considered adding basic progress tracking in K2A. Decided against:
- K2A is contract only; UI wiring is K2B
- Aggregation requires activity history + rules; defer to K2D
- Reduces K2A scope and risk
- Cleaner separation of concerns

### Decision: Keep Storage Keys Distinct

Profile-save keys (`lazytopper.profile.*`) are separate from device-only keys (`lazytopper.desktop.*`):
- No accidental mixing of signed-in and signed-out data
- Clear intent in code
- Easier to debug and audit
- Allows parallel implementation of both paths

### Session Learning: Firestore Hydration is Optional

Added `hydrateProfileFromCloud()` for sign-in flows, but kept it optional:
- Most local data is written fresh by user actions
- Optional hydration prevents overwriting locally-newer entries
- Graceful no-op if Firestore unavailable
- UI can call it on demand (e.g. sign-in completion)

---

## Next Actions

### Immediate (K2B)
1. Wire the save button on DesktopWorksheetsPage to call saveWorksheetToProfile()
2. Update save labels to reflect WriteStatus (profile vs device)
3. Preserve signed-out local-only save path
4. QA the save flow (manual + Browser Agent)

### Pre-K2C
1. Test activity recording with worksheet attempt flow
2. Verify Firestore permissions work for subcollections
3. Validate offline fallback to localStorage

### Pre-K2D
1. Add activity history filtering and aggregation rules
2. Define Me / Progress update logic
3. Add Mistake Intelligence feed from checked evidence

---

## Summary

PR-K2A introduces a typed, data-honest contract for worksheet profile persistence. It:
- Persists to localStorage first, then Firestore (if available)
- Returns honest WriteStatus (profile-saved, local-only, skipped-signed-out, failed)
- Keeps activity states distinct (generated ≠ attempted ≠ checked ≠ logged)
- Makes no progress or mastery claims
- Separates signed-in profile paths from existing signed-out device paths
- Compiles cleanly and passes build validation
- Is ready for K2B wiring and K2C learner loop integration

None of the work is visual or product-surface-external. Frontend QA is not required.
