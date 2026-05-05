/**
 * Worksheet Profile Save Service (K2A contract/helper) — REPAIRED
 *
 * This service provides a typed contract for signed-in worksheet profile saving
 * and worksheet activity event recording. It bridges local-only worksheet saves
 * (existing behaviour) with signed-in cloud-backed profile persistence.
 *
 * Design principles:
 * - Data honesty: persists exactly what happened, no claims of progress/mastery
 * - Local-first: write to localStorage first, then attempt Firestore
 * - Graceful degradation: returns honest status + detailed outcome metadata
 * - State separation: activity states are kept distinct and honest
 * - Independent attempts: try Firestore even if local fails (Firestore rules decide auth)
 *
 * Local storage keys:
 *   lazytopper.profile.savedWorksheets.v1:{uid}
 *   lazytopper.worksheetActivity.v1:{uid}
 *
 * Firestore paths (subcollections under learnerProfiles/{uid}):
 *   learnerProfiles/{uid}/savedWorksheets/{worksheetId}
 *   learnerProfiles/{uid}/worksheetActivity/{activityId}
 *
 * Return statuses are always honest:
 *   profile-saved:      Successfully persisted to Firestore/profile; localCacheSaved reports local cache outcome
 *   local-only:         Successfully persisted locally only (Firestore unavailable/failed)
 *   skipped-signed-out:  No uid provided; skipped entirely (record returned as null)
 *   failed:             Both local and Firestore writes failed
 */

import {
  collection,
  setDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { authClient, firestoreDb } from "./firebaseClient";

const LOCAL_SAVED_WORKSHEETS_PREFIX = "lazytopper.profile.savedWorksheets.v1";
const LOCAL_ACTIVITY_PREFIX = "lazytopper.worksheetActivity.v1";
const MAX_LOCAL_ENTRIES = 500;

// ============================================================================
// Types: Write Status
// ============================================================================

/**
 * Honest status of a save or activity record operation.
 *
 * - profile-saved: Written to Firestore/profile successfully; localCacheSaved reports local cache outcome
 * - local-only: Written to local cache; Firestore write skipped or failed
 * - skipped-signed-out: No uid provided; operation skipped entirely (record is null)
 * - failed: Both local write and Firestore write failed
 */
export type WriteStatus =
  | "profile-saved"
  | "local-only"
  | "skipped-signed-out"
  | "failed";

// ============================================================================
// Types: Write Results (Detailed Outcome)
// ============================================================================

/**
 * Detailed result of a saved worksheet write operation.
 * Includes status, record (or null for skipped), and diagnostic metadata.
 */
export interface SavedWorksheetWriteResult {
  /** Honest write status */
  status: WriteStatus;
  /** System-assigned ID for this saved worksheet */
  id: string;
  /** The persisted record (null if skipped-signed-out) */
  record: SavedWorksheetRecord | null;
  /** Whether write to local cache succeeded */
  localCacheSaved: boolean;
  /** Whether Firestore write was attempted */
  firestoreAttempted: boolean;
  /** Firestore path if attempted (e.g. "learnerProfiles/{uid}/savedWorksheets/{id}") */
  firestorePath?: string;
  /** Error message if write failed (for debugging) */
  errorMessage?: string;
}

/**
 * Detailed result of an activity event write operation.
 * Includes status, record (or null for skipped), and diagnostic metadata.
 */
export interface ActivityEventWriteResult {
  /** Honest write status */
  status: WriteStatus;
  /** System-assigned ID for this activity event */
  id: string;
  /** The persisted record (null if skipped-signed-out) */
  record: ActivityEventRecord | null;
  /** Whether write to local cache succeeded */
  localCacheSaved: boolean;
  /** Whether Firestore write was attempted */
  firestoreAttempted: boolean;
  /** Firestore path if attempted (e.g. "learnerProfiles/{uid}/worksheetActivity/{id}") */
  firestorePath?: string;
  /** Error message if write failed (for debugging) */
  errorMessage?: string;
}

// ============================================================================
// Types: Worksheet Activity
// ============================================================================

/**
 * Honest worksheet activity state machine.
 *
 * Each state must be tracked exactly as it occurred:
 * - worksheet_generated: User requested worksheet generation
 * - worksheet_saved: User saved a generated worksheet
 * - worksheet_attempt_started: User opened worksheet for attempt
 * - worksheet_attempted: User submitted attempt answers
 * - worksheet_check_started: User started check/review flow
 * - answer_checked: User reviewed a specific checked answer
 * - mistake_logged: User logged/recorded a mistake
 *
 * Data honesty rules:
 * - Generated is NOT progress or completion
 * - Saved is NOT mastery or achievement
 * - Attempted is NOT checked or graded
 * - Checked is NOT mistake-logged unless user explicitly triggered mistake logging
 * - Mistake Intelligence requires saved checked evidence from real check path
 */
export type WorksheetActivityKind =
  | "worksheet_generated"
  | "worksheet_saved"
  | "worksheet_attempt_started"
  | "worksheet_attempted"
  | "worksheet_check_started"
  | "answer_checked"
  | "mistake_logged";

// ============================================================================
// Types: Saved Worksheet
// ============================================================================

/**
 * Draft for saving a worksheet to profile.
 * Contains only essential metadata + user intent.
 */
export interface SavedWorksheetDraft {
  /** Unique identified for this saved worksheet in the user's session */
  worksheetId: string;
  /** ISO-8601 timestamp */
  savedAt: string;
  /** User-facing label (e.g. "Triangles · 10 questions") */
  label: string;
  /** Subject (Maths, Science) */
  subject: "Maths" | "Science";
  /** Stream (All, Physics, Chemistry, Biology) */
  stream: "All" | "Physics" | "Chemistry" | "Biology";
  /** Scope (topic, multi-topic, full-subject) */
  scope: "topic" | "multi-topic" | "full-subject";
  /** Main scope topic key(s) */
  topicKey: string | string[];
  /** Section filter (All or specific sections) */
  sectionFilter: string | string[];
  /** Difficulty filter */
  difficulty: "All" | "Easy" | "Medium" | "Hard";
  /** Question count */
  questionCount: number;
  /** Optional: mistakeFocusTopicKey if user enabled mistake-focus add-on */
  mistakeFocusTopicKey?: string | null;
}

/**
 * Persisted saved worksheet record in cloud/cache.
 * Extends draft with system metadata.
 */
export interface SavedWorksheetRecord extends SavedWorksheetDraft {
  /** System-assigned unique ID */
  id: string;
  /** Cloud storage timestamp (Firestore server timestamp equivalent) */
  persistedAt: string;
}

// ============================================================================
// Types: Activity Event
// ============================================================================

/**
 * Draft for recording a worksheet activity event.
 * Captures what the user did and when.
 */
export interface ActivityEventDraft {
  /** Unique ID for this activity instance in the user's session */
  eventId: string;
  /** What the user did */
  kind: WorksheetActivityKind;
  /** ISO-8601 timestamp */
  occurredAt: string;
  /** Which worksheet this activity is for (if applicable) */
  worksheetId?: string;
  /** Optional: which question/answer (for answer_checked, mistake_logged) */
  questionIndex?: number;
  /** Optional: additional context (e.g., user's selected answer for answer_checked) */
  context?: Record<string, unknown>;
}

/**
 * Persisted activity record in cloud/cache.
 * Extends draft with system metadata.
 */
export interface ActivityEventRecord extends ActivityEventDraft {
  /** System-assigned unique ID */
  id: string;
  /** Cloud storage timestamp */
  persistedAt: string;
}

// ============================================================================
// Local Storage Helpers
// ============================================================================

function localSavedWorksheetsKey(uid: string): string {
  return `${LOCAL_SAVED_WORKSHEETS_PREFIX}:${uid}`;
}

function localActivityKey(uid: string): string {
  return `${LOCAL_ACTIVITY_PREFIX}:${uid}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalJson<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalJson<T>(key: string, entries: T[]): boolean {
  if (!isBrowser()) return false;
  try {
    const toWrite = entries.slice(0, MAX_LOCAL_ENTRIES);
    localStorage.setItem(key, JSON.stringify(toWrite));

    // Verify write succeeded by reading back
    const readBack = localStorage.getItem(key);
    if (!readBack) return false;

    const parsed = JSON.parse(readBack);
    return Array.isArray(parsed) ? true : false;
  } catch {
    // localStorage quota exceeded, SSR, or parse error — write failed
    return false;
  }
}

// ============================================================================
// Saved Worksheet Contract
// ============================================================================

/**
 * Save a generated worksheet to the signed-in user's profile.
 * Returns detailed outcome including status, record (or null), and diagnostics.
 *
 * Behaviour:
 * 1. If uid is missing/falsy: returns skipped-signed-out (record: null)
 * 2. Always attempt write to localStorage first (local cache)
 * 3. Then attempt write to Firestore if configured and uid exists
 * 4. Return status reflecting what actually succeeded
 *
 * K2B can distinguish saved from skipped by checking record !== null.
 */
export async function saveWorksheetToProfile(
  uid: string | null | undefined,
  draft: SavedWorksheetDraft
): Promise<SavedWorksheetWriteResult> {
  // If no uid, cannot save to profile
  if (!uid || typeof uid !== "string" || uid.trim().length === 0) {
    return {
      status: "skipped-signed-out",
      id: draft.worksheetId,
      record: null,
      localCacheSaved: false,
      firestoreAttempted: false,
      errorMessage: "No uid provided",
    };
  }

  const record: SavedWorksheetRecord = {
    id: draft.worksheetId,
    persistedAt: new Date().toISOString(),
    ...draft,
  };

  // Attempt local write
  let localCacheSaved = false;
  let localError: string | undefined;
  try {
    const existing = listLocalProfileSavedWorksheets(uid);
    const updated = [record, ...existing];
    localCacheSaved = writeLocalJson(localSavedWorksheetsKey(uid), updated);
    if (!localCacheSaved) {
      localError = "localStorage write failed or verify failed";
    }
  } catch (err) {
    localError = String(err);
  }

  // Attempt Firestore write (independent of local success)
  let firestoreAttempted = false;
  let firestorePath = "";
  let firestoreSuccess = false;
  let firestoreError: string | undefined;

  if (firestoreDb && uid) {
    firestoreAttempted = true;
    firestorePath = `learnerProfiles/${uid}/savedWorksheets/${record.id}`;
    try {
      await setDoc(doc(firestoreDb, "learnerProfiles", uid, "savedWorksheets", record.id), record);
      firestoreSuccess = true;
    } catch (err) {
      firestoreError = String(err);
    }
  }

  // Determine overall status.
  // Firestore/profile success is the source of truth for "profile-saved";
  // localCacheSaved separately reports whether the local cache also succeeded.
  if (firestoreSuccess) {
    return {
      status: "profile-saved",
      id: record.id,
      record,
      localCacheSaved,
      firestoreAttempted: true,
      firestorePath,
      errorMessage: localCacheSaved ? undefined : localError,
    };
  }

  if (localCacheSaved && !firestoreAttempted) {
    return {
      status: "local-only",
      id: record.id,
      record,
      localCacheSaved: true,
      firestoreAttempted: false,
      errorMessage: "Firestore not configured",
    };
  }

  if (localCacheSaved && firestoreAttempted && !firestoreSuccess) {
    return {
      status: "local-only",
      id: record.id,
      record,
      localCacheSaved: true,
      firestoreAttempted: true,
      firestorePath,
      errorMessage: firestoreError,
    };
  }

  // Neither local cache nor Firestore/profile persistence succeeded.
  return {
    status: "failed",
    id: record.id,
    record: null,
    localCacheSaved,
    firestoreAttempted,
    firestorePath: firestoreAttempted ? firestorePath : undefined,
    errorMessage: localError || firestoreError || "Unknown error",
  };
}

/**
 * List saved worksheets for a user from local cache.
 * Returns newest-first.
 */
export function listLocalProfileSavedWorksheets(uid: string): SavedWorksheetRecord[] {
  return readLocalJson<SavedWorksheetRecord>(localSavedWorksheetsKey(uid));
}

// ============================================================================
// Activity Event Contract
// ============================================================================

/**
 * Record a worksheet activity event for the signed-in user.
 * Returns detailed outcome including status, record (or null), and diagnostics.
 *
 * Behaviour:
 * 1. If uid is missing/falsy: returns skipped-signed-out (record: null)
 * 2. Always attempt write to localStorage first (local cache)
 * 3. Then attempt write to Firestore if configured and uid exists
 * 4. Return status reflecting what actually succeeded
 *
 * Data honesty:
 * - This records exactly what the user did, no inference
 * - Activity is not progress, mastery, or grading
 * - Activity requires separate Me/Progress aggregation (not in K2A)
 */
export async function recordWorksheetActivity(
  uid: string | null | undefined,
  draft: ActivityEventDraft
): Promise<ActivityEventWriteResult> {
  // If no uid, cannot record to profile
  if (!uid || typeof uid !== "string" || uid.trim().length === 0) {
    return {
      status: "skipped-signed-out",
      id: draft.eventId,
      record: null,
      localCacheSaved: false,
      firestoreAttempted: false,
      errorMessage: "No uid provided",
    };
  }

  const record: ActivityEventRecord = {
    id: draft.eventId,
    persistedAt: new Date().toISOString(),
    ...draft,
  };

  // Attempt local write
  let localCacheSaved = false;
  let localError: string | undefined;
  try {
    const existing = listLocalWorksheetActivity(uid);
    const updated = [record, ...existing];
    localCacheSaved = writeLocalJson(localActivityKey(uid), updated);
    if (!localCacheSaved) {
      localError = "localStorage write failed or verify failed";
    }
  } catch (err) {
    localError = String(err);
  }

  // Attempt Firestore write (independent of local success)
  let firestoreAttempted = false;
  let firestorePath = "";
  let firestoreSuccess = false;
  let firestoreError: string | undefined;

  if (firestoreDb && uid) {
    firestoreAttempted = true;
    firestorePath = `learnerProfiles/${uid}/worksheetActivity/${record.id}`;
    try {
      await setDoc(doc(firestoreDb, "learnerProfiles", uid, "worksheetActivity", record.id), record);
      firestoreSuccess = true;
    } catch (err) {
      firestoreError = String(err);
    }
  }

  // Determine overall status.
  // Firestore/profile success is the source of truth for "profile-saved";
  // localCacheSaved separately reports whether the local cache also succeeded.
  if (firestoreSuccess) {
    return {
      status: "profile-saved",
      id: record.id,
      record,
      localCacheSaved,
      firestoreAttempted: true,
      firestorePath,
      errorMessage: localCacheSaved ? undefined : localError,
    };
  }

  if (localCacheSaved && !firestoreAttempted) {
    return {
      status: "local-only",
      id: record.id,
      record,
      localCacheSaved: true,
      firestoreAttempted: false,
      errorMessage: "Firestore not configured",
    };
  }

  if (localCacheSaved && firestoreAttempted && !firestoreSuccess) {
    return {
      status: "local-only",
      id: record.id,
      record,
      localCacheSaved: true,
      firestoreAttempted: true,
      firestorePath,
      errorMessage: firestoreError,
    };
  }

  // Neither local cache nor Firestore/profile persistence succeeded.
  return {
    status: "failed",
    id: record.id,
    record: null,
    localCacheSaved,
    firestoreAttempted,
    firestorePath: firestoreAttempted ? firestorePath : undefined,
    errorMessage: localError || firestoreError || "Unknown error",
  };
}

/**
 * List worksheet activity events for a user from local cache.
 * Returns newest-first.
 */
export function listLocalWorksheetActivity(uid: string): ActivityEventRecord[] {
  return readLocalJson<ActivityEventRecord>(localActivityKey(uid));
}

// ============================================================================
// Optional Firestore Hydration
// ============================================================================

/**
 * Optionally hydrate local cache from Firestore (one-time on sign-in).
 * If localStorage already has data for this user, skips to avoid overwriting
 * locally-written entries that may predate cloud config or be more recent.
 *
 * Called by sign-in flows to seed local cache with cloud history if needed.
 */
export async function hydrateProfileFromCloud(uid: string | null | undefined): Promise<void> {
  if (!firestoreDb) return;
  if (!uid || typeof uid !== "string" || uid.trim().length === 0) return;
  if (!authClient?.currentUser || authClient.currentUser.uid !== uid) return;

  // If we already have local data, trust it and skip hydration
  const existingWorksheets = listLocalProfileSavedWorksheets(uid);
  const existingActivity = listLocalWorksheetActivity(uid);
  if (existingWorksheets.length > 0 || existingActivity.length > 0) {
    return;
  }

  try {
    // Hydrate saved worksheets
    const wsQ = query(
      collection(firestoreDb, "learnerProfiles", uid, "savedWorksheets"),
      orderBy("persistedAt", "desc"),
      limit(MAX_LOCAL_ENTRIES)
    );
    const wsSnap = await getDocs(wsQ);
    if (!wsSnap.empty) {
      const worksheets = wsSnap.docs
        .map((d) => d.data() as SavedWorksheetRecord)
        .filter(Boolean);
      writeLocalJson(localSavedWorksheetsKey(uid), worksheets);
    }

    // Hydrate activity events
    const actQ = query(
      collection(firestoreDb, "learnerProfiles", uid, "worksheetActivity"),
      orderBy("persistedAt", "desc"),
      limit(MAX_LOCAL_ENTRIES)
    );
    const actSnap = await getDocs(actQ);
    if (!actSnap.empty) {
      const activity = actSnap.docs
        .map((d) => d.data() as ActivityEventRecord)
        .filter(Boolean);
      writeLocalJson(localActivityKey(uid), activity);
    }
  } catch {
    // Firestore read failed — silently no-op; local cache will populate
    // organically as the user generates and saves worksheets
  }
}
