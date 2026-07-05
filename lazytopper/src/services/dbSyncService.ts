/**
 * dbSyncService.ts — Fire-and-forget PostgreSQL sync for student progress.
 *
 * All write functions are silent (catch errors, return void) so they never
 * block or crash the app. restoreFromDB is awaited once at login to hydrate
 * localStorage from the server-side store.
 */

import type { DailyFocusRecord } from "./focusTracker";
import { authClient } from "./firebaseClient";

const BASE = "/api/user/progress";

/**
 * Build request headers. Attaches a verified Firebase `Authorization: Bearer <idToken>`
 * when a user is signed in — this survives the Vercel->Railway proxy rewrite, which
 * drops the custom X-User-ID header in production. X-User-ID is kept as a local/dev
 * and defensive fallback. Never throws: on any token failure it degrades to X-User-ID.
 */
async function authHeaders(uid: string): Promise<HeadersInit> {
  const base: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-ID": uid,
  };
  const token = authClient?.currentUser
    ? await authClient.currentUser.getIdToken().catch(() => null)
    : null;
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

/**
 * Called once at login. Reads the stored row and hydrates localStorage so the
 * student sees their saved XP / streak / focus / mastery across devices.
 */
export async function restoreFromDB(uid: string): Promise<void> {
  try {
    const res = await fetch(BASE, { headers: await authHeaders(uid) });
    if (!res.ok) return;
    const json = await res.json() as { ok: boolean; data: Record<string, unknown> | null };
    if (!json.ok || !json.data) return;
    const data = json.data;

    if (typeof data.xp === "number" && data.xp > 0) {
      localStorage.setItem("lazytopper.xp", String(data.xp));
    }

    if (typeof data.streak === "number" && data.streak > 0) {
      const uid2 = uid;
      localStorage.setItem(`lazytopper.streak.count:${uid2}`, String(data.streak));
    }

    if (Array.isArray(data.focus_daily) && data.focus_daily.length > 0) {
      localStorage.setItem("lazytopper.focus.daily", JSON.stringify(data.focus_daily));
    }

    if (data.topic_mastery && typeof data.topic_mastery === "object" && !Array.isArray(data.topic_mastery)) {
      Object.entries(data.topic_mastery as Record<string, unknown>).forEach(([k, v]) => {
        localStorage.setItem(`lazytopper.topicMastery.${k}`, JSON.stringify(v));
      });
    }

    if (data.mission_progress && typeof data.mission_progress === "object" && !Array.isArray(data.mission_progress)) {
      Object.entries(data.mission_progress as Record<string, unknown>).forEach(([k, v]) => {
        localStorage.setItem(k, JSON.stringify(v));
      });
    }
  } catch {
    // Network failure — fall back silently to localStorage
  }
}

/** Sync current XP total to the database (fire-and-forget). */
export function syncXP(uid: string, xp: number): void {
  void (async () => {
    await fetch(`${BASE}/xp`, {
      method: "POST",
      headers: await authHeaders(uid),
      body: JSON.stringify({ xp }),
    });
  })().catch(() => {});
}

/** Sync current streak count to the database (fire-and-forget). */
export function syncStreak(uid: string, streak: number): void {
  void (async () => {
    await fetch(`${BASE}/streak`, {
      method: "POST",
      headers: await authHeaders(uid),
      body: JSON.stringify({ streak }),
    });
  })().catch(() => {});
}

/** Replace the stored focus_daily records with the current client records (fire-and-forget). */
export function syncFocus(uid: string, records: DailyFocusRecord[]): void {
  void (async () => {
    await fetch(`${BASE}/focus`, {
      method: "POST",
      headers: await authHeaders(uid),
      body: JSON.stringify({ records }),
    });
  })().catch(() => {});
}

/** Merge a single topic's mastery data into the database (fire-and-forget). */
export function syncMastery(uid: string, topicKey: string, masteryData: unknown): void {
  void (async () => {
    await fetch(`${BASE}/mastery`, {
      method: "POST",
      headers: await authHeaders(uid),
      body: JSON.stringify({ topicKey, masteryData }),
    });
  })().catch(() => {});
}

/** Merge a single mission key's progress into the database (fire-and-forget). */
export function syncMissionProgress(uid: string, missionKey: string, progress: unknown): void {
  void (async () => {
    await fetch(`${BASE}/mission`, {
      method: "POST",
      headers: await authHeaders(uid),
      body: JSON.stringify({ missionKey, progress }),
    });
  })().catch(() => {});
}
