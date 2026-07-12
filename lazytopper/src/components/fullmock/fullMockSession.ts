// src/components/fullmock/fullMockSession.ts
//
// §8a INTERRUPTION-SAFETY — the device-local persistence that makes a 3-hour
// mobile mock survive calls, backgrounding, battery and back-swipes:
//
//   • TIMER = a persisted WALL-CLOCK deadline: `startedAt` + `durationMs` are
//     stored; remaining time is COMPUTED from Date.now() on every load/render.
//     Never a ticking counter that dies with the tab.
//   • ANSWERS autosave per interaction (the whole state re-persists — small).
//   • RESUME: an in-progress mock restores the SAME drawn paper, answers, flags,
//     clock and focus aggregates. A re-draw would be a fake resume — the paper is
//     persisted whole for exactly this reason.
//   • UPLOAD-LATER: after submit the state flips to "awaiting-upload" and KEEPS
//     the paper + frozen objective score, so the pending banner's "Upload now →"
//     can re-grade the ORIGINAL paper against the EXISTING record on this device.
//     (Cross-device / after eviction, the SAME paper is retrieved from the
//     server-side snapshot — services/fullMockPaperStore, closing
//     [FU-FM-CROSS-DEVICE-UPLOAD]; when even that is missing the re-open says
//     so plainly; we never fabricate a paper. Owner-ratified 2026-07-12.)
//
// localStorage only (keyed per uid + FM code), capped to the most recent few
// sessions — this is a device-local safety net, NOT the durable record store
// (sessionRecords is; nothing in THIS module reaches Firestore — the cross-
// device paper snapshot lives in services/fullMockPaperStore). Honest failure:
// any unreadable blob returns null and the caller offers the download path (§8a.4).

import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { SessionFocusAggregates } from "../../services/sessionRecords";
import type { ObjectiveScore } from "../../services/chapterTestGradeService";

export type FullMockSessionPhase = "taking" | "awaiting-upload";

export interface FullMockSessionState {
  /** The durable FM-{S}-{NN} code — the storage key and the record id. */
  code: string;
  name: string;
  subject: "Maths" | "Science";
  grade: string;
  /** The drawn paper, persisted WHOLE — resume restores the same questions. */
  paper: PersistedWorksheet;
  /** Wall-clock anchor: remaining = startedAt + durationMs − now. */
  startedAt: number;
  durationMs: number;
  answers: Record<number, string>;
  flags: number[];
  currentQNumber: number;
  /** §8b aggregates, carried across interruptions. */
  focus: SessionFocusAggregates;
  phase: FullMockSessionPhase;
  /** Frozen at submit (deterministic 0-or-full) so a later upload completes the
   *  score without re-scoring — the pick data is gone once the test closes. */
  objective?: ObjectiveScore | null;
  /** The draw's real mix — display only. */
  pyqCount?: number;
  freshCount?: number;
  updatedAt: number;
}

const KEY_PREFIX = "lazytopper.fm.session.v1";
/** Papers are ~50–100 KB; keep the safety net small and recent. */
const MAX_SESSIONS_PER_UID = 3;

function storageKey(uid: string, code: string): string {
  return `${KEY_PREFIX}.${uid}.${code}`;
}

function uidToken(uid: string | null | undefined): string {
  return uid && uid !== "anonymous" ? uid : "local";
}

function isSessionState(v: unknown): v is FullMockSessionState {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.code === "string" &&
    typeof s.startedAt === "number" &&
    typeof s.durationMs === "number" &&
    !!s.paper &&
    typeof s.paper === "object" &&
    Array.isArray((s.paper as PersistedWorksheet).questions) &&
    (s.phase === "taking" || s.phase === "awaiting-upload")
  );
}

/** Persist (autosave) — best-effort; a quota miss never breaks the test, the
 *  wall-clock deadline still holds from the last good write. */
export function saveFullMockSession(uid: string | null | undefined, state: FullMockSessionState): void {
  if (typeof window === "undefined") return;
  const token = uidToken(uid);
  try {
    window.localStorage.setItem(
      storageKey(token, state.code),
      JSON.stringify({ ...state, updatedAt: Date.now() }),
    );
    evictOldest(token);
  } catch {
    /* quota — best-effort */
  }
}

export function loadFullMockSession(
  uid: string | null | undefined,
  code: string,
): FullMockSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(uidToken(uid), code));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSessionState(parsed) ? parsed : null;
  } catch {
    return null; // honest failure — the caller says so and offers the download path
  }
}

export function clearFullMockSession(uid: string | null | undefined, code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(uidToken(uid), code));
  } catch {
    /* best-effort */
  }
}

/** All of this device's saved mock sessions for a uid (newest first). */
export function listFullMockSessions(uid: string | null | undefined): FullMockSessionState[] {
  if (typeof window === "undefined") return [];
  const prefix = `${KEY_PREFIX}.${uidToken(uid)}.`;
  const out: FullMockSessionState[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (isSessionState(parsed)) out.push(parsed);
      } catch {
        /* skip an unreadable blob */
      }
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** The IN-PROGRESS mock for a uid, if any — powers the resume card/strip. */
export function findInProgressSession(
  uid: string | null | undefined,
): FullMockSessionState | null {
  return listFullMockSessions(uid).find((s) => s.phase === "taking") ?? null;
}

/** Wall-clock remaining time — THE timer. ≤ 0 means the exam is over (the clock
 *  never paused while the tab was gone; that is the exam-hall rule). */
export function remainingMs(state: Pick<FullMockSessionState, "startedAt" | "durationMs">, now = Date.now()): number {
  return state.startedAt + state.durationMs - now;
}

/** mm:ss (or h:mm:ss over an hour) for the clock + the resume chip. */
export function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function evictOldest(token: string): void {
  const all = listFullMockSessions(token);
  for (const s of all.slice(MAX_SESSIONS_PER_UID)) {
    try {
      window.localStorage.removeItem(storageKey(token, s.code));
    } catch {
      /* best-effort */
    }
  }
}
