// src/services/tutorSessionStore.ts
// Stage-2 DURABLE tutor session (Flow v2 §3-A). The Stage-1 chat kept the thread in
// component state (by design); this makes it durable so the conversation survives a
// close/reopen AND the round-trip to C&I/Practice, and the continuity opener (D-TUT-2)
// has real memory. ONE doc per (student, canonical topic).
//
// Persistence mirrors sessionRecords.ts EXACTLY (the PR-B pattern): a localStorage
// blob (fast, synchronous, same-device) + a durable Firestore doc
// `tutorSessions/{uid}/topics/{topicKey}` (cross-device). The firestore.rules block
// is already deployed (#425). Honest-failure: NEVER persists a signed-out / local /
// anonymous session.
//
// ★ HONESTY GUARD (D-TUT-8), STRUCTURAL: this store holds the THREAD + a doubts/
// coverage memory ONLY. `TutorCoverage` has NO numeric field — it CANNOT hold a
// grade/score/mastery. Grades are single-sourced from the graded sessionRecords
// (C&I / Practice); the tutor never writes one.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestoreDb } from "./firebaseClient";
import type { AuthUser } from "../context/AuthContext";
import type { TutorTurn } from "../ai/tutorClient";

/** Doubts/coverage memory — QUALITATIVE ONLY (no marks, no score, no mastery). */
export interface TutorCoverage {
  /** Concepts/sub-topics the tutor has clarified this session. */
  worked: string[];
  /** Open doubts still to resolve. */
  doubts: string[];
  /** Coarse qualitative status — never a number. */
  lastStatus?: "clarified" | "open";
}

/** The pending round-trip marker (D-TUT-5/11): "I sent the student to surface X for
 *  topic/question Y at departureTs; on return, poll for a graded record newer than that." */
export interface TutorPendingMarker {
  /** "practice" = Quick Practice leg (return-detected via practiceInsights, Fix 1);
   *  "check-improve" = C&I leg (return-detected via sessionRecords). "worksheet" is a
   *  legacy value (pre-Fix-1 markers) still resolved via the sessionRecords path. */
  surface: "check-improve" | "practice" | "worksheet";
  topicKey: string;
  questionId?: string;
  departureTs: number;
  /** A short human note for the away-cue / return copy (never a grade). */
  note?: string;
}

export interface TutorSessionDoc {
  topicKey: string; // canonical (resolveCanonicalSlug)
  topicLabel: string;
  subject: "maths" | "science" | "";
  updatedAt: number; // epoch ms
  messages: TutorTurn[];
  coverage: TutorCoverage;
  pending?: TutorPendingMarker | null;
}

const MAX_STORED_TURNS = 60; // a targeted tutor session is short (Flow v2 §3G)

function readableUid(uid?: string | null): string | null {
  if (!uid || uid === "anonymous") return null;
  return uid;
}

function sessionKey(uid: string, topicKey: string): string {
  return `lt:tutorSession:${uid}:${topicKey}`;
}

/** Firestore-illegal doc-id chars → `_` (mirrors sessionRecords.sanitizeDocId). */
function sanitizeDocId(id: string): string {
  return id.replace(/[/.#$[\]\s]/g, "_");
}

/** Strip `undefined` so nothing rejects a Firestore write (mirrors sessionRecords). */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isTutorSessionDoc(v: unknown): v is TutorSessionDoc {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  // NB: a shape TYPE-guard, not a topic-key match — the key is already canonical (the
  // caller passes resolveCanonicalSlug'd keys). Read into a local so this isn't mistaken
  // for a raw `.topicKey ===` topic compare (topickey Guard B).
  const tk = d.topicKey;
  return typeof tk === "string" && Array.isArray(d.messages) && typeof d.coverage === "object";
}

function trimTurns(messages: TutorTurn[]): TutorTurn[] {
  return messages.length > MAX_STORED_TURNS ? messages.slice(-MAX_STORED_TURNS) : messages;
}

// ── Local (synchronous, same-device) ─────────────────────────────────────────

/** Read the local mirror synchronously — instant on the same-device round-trip return. */
export function loadTutorSessionLocal(uid: string | null | undefined, topicKey: string): TutorSessionDoc | null {
  const id = readableUid(uid);
  if (typeof window === "undefined" || !id || !topicKey) return null;
  try {
    const raw = window.localStorage.getItem(sessionKey(id, topicKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isTutorSessionDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeTutorSessionLocal(uid: string, session: TutorSessionDoc): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    window.localStorage.setItem(sessionKey(uid, session.topicKey), JSON.stringify(session));
  } catch {
    /* quota / SSR — best-effort mirror; Firestore is the durable source */
  }
}

// ── Cloud (cross-device) ─────────────────────────────────────────────────────

/**
 * Read the durable session, cross-device. Local-first (returns the mirror on any
 * miss/error), then reconciles the Firestore doc by `updatedAt` (newer wins) and
 * refreshes the mirror. Never throws — honest-degrade to local.
 */
export async function loadTutorSessionFromCloud(
  uid: string | null | undefined,
  topicKey: string,
): Promise<TutorSessionDoc | null> {
  const id = readableUid(uid);
  if (!id || !topicKey) return null;
  const local = loadTutorSessionLocal(id, topicKey);
  if (!firestoreDb) return local;
  try {
    const snap = await getDoc(doc(firestoreDb, "tutorSessions", id, "topics", sanitizeDocId(topicKey)));
    const cloud = snap.exists() && isTutorSessionDoc(snap.data()) ? (snap.data() as TutorSessionDoc) : null;
    if (!cloud) return local;
    if (local && local.updatedAt >= cloud.updatedAt) return local;
    writeTutorSessionLocal(id, cloud);
    return cloud;
  } catch (error) {
    console.warn("[tutorSession] cloud read failed", { uid: id, topicKey, error });
    return local;
  }
}

/**
 * Persist the session. Idempotent by (uid, topicKey). Honest-failure: skips
 * signed-out / local / anonymous (returns a typed outcome, never throws). Writes the
 * local mirror synchronously (so a route-out immediately followed by navigation keeps
 * the marker) + a fire-and-forget cloud write with a LOGGED catch.
 */
export function saveTutorSession(
  user: AuthUser | null | undefined,
  session: TutorSessionDoc,
): "recorded" | "skipped-no-user" | "skipped-local" {
  if (!user || !user.uid) return "skipped-no-user";
  if (user.isLocalSession) return "skipped-local";
  const uid = user.uid;
  if (uid === "anonymous") return "skipped-local";

  const toStore: TutorSessionDoc = { ...session, messages: trimTurns(session.messages), updatedAt: Date.now() };

  writeTutorSessionLocal(uid, toStore);

  if (firestoreDb) {
    void setDoc(
      doc(firestoreDb, "tutorSessions", uid, "topics", sanitizeDocId(session.topicKey)),
      stripUndefined(toStore),
      { merge: true },
    ).catch((error) => console.warn("[tutorSession] cloud write failed", { topicKey: session.topicKey, error }));
  }
  return "recorded";
}
