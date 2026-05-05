/**
 * Worksheet Profile Save Service (K2A contract/helper)
 *
 * This service provides a typed contract for signed-in worksheet profile saving
 * and worksheet activity event recording. It bridges local-only worksheet saves
 * (existing behaviour) with signed-in cloud-backed profile persistence.
 *
 * Design principles:
 * - Data honesty: persists exactly what happened, no claims of progress/mastery
 * - Local-first: write to localStorage first, then attempt Firestore
 * - Graceful degradation: returns honest status if cloud fails
 * - State separation: activity states are kept distinct and honest
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
 *   profile-saved:     Successfully persisted to both local + Firestore
 *   local-only:        Successfully persisted locally only (Firestore unavailable)
 *   skipped-signed-out: User is not authenticated; skipped entirely
 *   failed:            Both local and Firestore writes failed
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
import { type Auth } from "firebase/auth";

const LOCAL_SAVED_WORKSHEETS_PREFIX = "lazytopper.profile.savedWorksheets.v1";
const LOCAL_ACTIVITY_PREFIX = "lazytopper.worksheetActivity.v1";
const MAX_LOCAL_ENTRIES = 500;

// ============================================================================
// Types: Write Status
// ============================================================================

/**
 * Honest status of a save or activity record operation.
 *
 * - profile-saved: Written to both local cache and Firestore successfully
 * - local-only: Written to local cache; Firestore write skipped or failed
 * - skipped-signed-out: User is not authenticated; operation skipped
 * - failed: Both local write and Firestore write failed (rare)
 */
export type WriteStatus =
  | "profile-saved"
  | "local-only"
  | "skipped-signed-out"
  | "failed";

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

function writeLocalJson<T>(key: string, entries: T[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES)));
  } catch {
    // localStorage quota exceeded or SSR — silently ignore
  }
}

// ============================================================================
// Current User Check
// ============================================================================

function getCurrentUid(auth: Auth | null): string | null {
  if (!auth) return null;
  return auth.currentUser?.uid || null;
}

// ============================================================================
// Saved Worksheet Contract
// ============================================================================

/**
 * Save a generated worksheet to the signed-in user's profile.
 * Returns honest status about where it was persisted.
 *
 * Behaviour:
 * 1. If user is not signed in: returns "skipped-signed-out"
 * 2. Always write to localStorage first (local cache)
 * 3. If Firestore is configured and accessible: write there too
 * 4. Return status reflecting what actually succeeded
 */
export async function saveWorksheetToProfile(
  uid: string,
  draft: SavedWorksheetDraft
): Promise<{ status: WriteStatus; record: SavedWorksheetRecord }> {
  // Check if user is actually authenticated
  const currentUid = getCurrentUid(authClient);
  if (!currentUid || currentUid !== uid) {
    return {
      status: "skipped-signed-out",
      record: {
        id: draft.worksheetId,
        persistedAt: new Date().toISOString(),
        ...draft,
      },
    };
  }

  const record: SavedWorksheetRecord = {
    id: draft.worksheetId,
    persistedAt: new Date().toISOString(),
    ...draft,
  };

  // Always write to local cache first
  let localSuccess = false;
  try {
    const existing = listLocalProfileSavedWorksheets(uid);
    const updated = [record, ...existing];
    writeLocalJson(localSavedWorksheetsKey(uid), updated);
    localSuccess = true;
  } catch {
    // Local write failed — will return "failed" if Firestore also fails
  }

  // Attempt Firestore write (fire-and-forget)
  let firestoreSuccess = false;
  if (firestoreDb && localSuccess) {
    try {
      await setDoc(
        doc(firestoreDb, "learnerProfiles", uid, "savedWorksheets", record.id),
        record
      );
      firestoreSuccess = true;
    } catch {
      // Firestore write failed — local copy remains the source of truth
    }
  }

  // Return honest status
  if (!localSuccess) {
    return { status: "failed", record };
  }
  if (firestoreSuccess) {
    return { status: "profile-saved", record };
  }
  return { status: "local-only", record };
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
 * Returns honest status about where it was persisted.
 *
 * Behaviour:
 * 1. If user is not signed in: returns "skipped-signed-out"
 * 2. Always write to localStorage first (local cache)
 * 3. If Firestore is configured and accessible: write there too
 * 4. Return status reflecting what actually succeeded
 *
 * Data honesty:
 * - This records exactly what the user did, no inference
 * - Activity is not progress, mastery, or grading
 * - Activity requires separate Me/Progress aggregation (not in K2A)
 */
export async function recordWorksheetActivity(
  uid: string,
  draft: ActivityEventDraft
): Promise<{ status: WriteStatus; record: ActivityEventRecord }> {
  // Check if user is actually authenticated
  const currentUid = getCurrentUid(authClient);
  if (!currentUid || currentUid !== uid) {
    return {
      status: "skipped-signed-out",
      record: {
        id: draft.eventId,
        persistedAt: new Date().toISOString(),
        ...draft,
      },
    };
  }

  const record: ActivityEventRecord = {
    id: draft.eventId,
    persistedAt: new Date().toISOString(),
    ...draft,
  };

  // Always write to local cache first
  let localSuccess = false;
  try {
    const existing = listLocalWorksheetActivity(uid);
    const updated = [record, ...existing];
    writeLocalJson(localActivityKey(uid), updated);
    localSuccess = true;
  } catch {
    // Local write failed — will return "failed" if Firestore also fails
  }

  // Attempt Firestore write (fire-and-forget)
  let firestoreSuccess = false;
  if (firestoreDb && localSuccess) {
    try {
      await setDoc(
        doc(firestoreDb, "learnerProfiles", uid, "worksheetActivity", record.id),
        record
      );
      firestoreSuccess = true;
    } catch {
      // Firestore write failed — local copy remains the source of truth
    }
  }

  // Return honest status
  if (!localSuccess) {
    return { status: "failed", record };
  }
  if (firestoreSuccess) {
    return { status: "profile-saved", record };
  }
  return { status: "local-only", record };
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
export async function hydrateProfileFromCloud(uid: string): Promise<void> {
  if (!firestoreDb) return;
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
