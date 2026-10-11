// src/services/guestScoreStash.ts
//
// QP-GUEST-SIGNIN-1 — the signed-out student's Quick Practice score, carried across ONE
// sign-in in the same tab, so the page can say "Your set before you signed in: 3 / 5
// correct." once after the student comes back.
//
// ★ SCORE ONLY, AND NOTHING SAVED. One `sessionStorage` entry (tab-scoped, gone with the
// tab): the page path and three counts. No answers, no question text, no personal data,
// nothing written to Firestore or the server, and the account never receives the guest's
// attempts. It is shown once and deleted; after 30 minutes it is ignored.
//
// Every storage call is wrapped: a private window, blocked site data or a sandbox can make
// any of them throw, and then nothing is shown — the restored card is a nicety, never a
// reason for the page to fail.

export const GUEST_SCORE_KEY = "lt:qp-guest-score";
export const GUEST_SCORE_MAX_AGE_MS = 30 * 60 * 1000;

export interface GuestScore {
  v: 1;
  path: string;
  attempted: number;
  correct: number;
  total: number;
  at: number;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function stashGuestScore(
  s: { path: string; attempted: number; correct: number; total: number },
  now: number = Date.now(),
): void {
  try {
    const entry: GuestScore = {
      v: 1,
      path: s.path,
      attempted: s.attempted,
      correct: s.correct,
      total: s.total,
      at: now,
    };
    storage()?.setItem(GUEST_SCORE_KEY, JSON.stringify(entry));
  } catch {
    /* nothing is shown later; the page is unaffected */
  }
}

function remove(store: Storage): void {
  try {
    store.removeItem(GUEST_SCORE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The stashed score for THIS path, if it is fresh — and then it is gone (shown once).
 * A stale or unreadable entry is removed; an entry for another path is left alone.
 */
export function takeGuestScore(path: string, now: number = Date.now()): GuestScore | null {
  try {
    const store = storage();
    const raw = store?.getItem(GUEST_SCORE_KEY);
    if (!store || !raw) return null;
    let entry: Partial<GuestScore> | null = null;
    try {
      entry = JSON.parse(raw) as Partial<GuestScore>;
    } catch {
      entry = null;
    }
    if (!entry || entry.v !== 1 || typeof entry.at !== "number") {
      remove(store);
      return null;
    }
    const age = now - entry.at;
    if (!(age >= 0 && age < GUEST_SCORE_MAX_AGE_MS)) {
      remove(store);
      return null;
    }
    if (entry.path !== path) return null;
    remove(store);
    return {
      v: 1,
      path: entry.path,
      attempted: Number(entry.attempted) || 0,
      correct: Number(entry.correct) || 0,
      total: Number(entry.total) || 0,
      at: entry.at,
    };
  } catch {
    return null;
  }
}
