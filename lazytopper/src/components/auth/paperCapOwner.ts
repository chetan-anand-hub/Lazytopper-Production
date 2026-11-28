/**
 * TS-DAILY-CAP-1 (launch blocker, 19 Nov 2026) — a Test Series Pack owner is never capped by the daily paper-open limit.
 *
 * The daily limit (MockViewGate: signed-in free 3/day) is fair use for FREE accounts. A student who bought the ₹999 Test Series
 * Pack is a paying customer and must never meet "Your Free Trial Has Ended — you've used your 3 papers for today". This module
 * answers ONE question for the gate, and only at the moment it matters (the allowance is already spent): does this signed-in
 * student own the Test Series Pack?
 *
 * SERVER TRUTH ONLY — the same source as components/testSeries/testSeriesOwnership.ts: GET /api/packs/mine, `ownsTestSeries`
 * (only the server's literal `true` counts; see services/packs `fetchMyPacks`). Read-only; nothing here grants anything server-side.
 *
 * ★ FIRST PAINT. MockViewGate is eager (on the first-paint path); `services/packs` is imported DYNAMICALLY here, so the packs
 *   client is fetched only when a signed-in student is already at the limit. A fresh context never reaches this module's network.
 * ★ FAIL CLOSED. A failed / unauthenticated read is "not an owner" — the existing wall, exactly as before. Never "owner".
 * ★ Held in memory for the page's life (never localStorage). Only a POSITIVE verdict is remembered: a student who buys the pack
 *   mid-session and comes back is asked again rather than walled by a stale "no".
 */

const owners = new Set<string>();
const inflight = new Map<string, Promise<boolean>>();

/** Synchronous: true only when this page has already read a positive ownership verdict for `uid`. */
export function isKnownTestSeriesOwner(uid: string | null | undefined): boolean {
  return Boolean(uid) && owners.has(uid as string);
}

/** Resolves true when the server says `uid` owns the Test Series Pack; false when not, or when the read failed. Never rejects. */
export function readTestSeriesOwner(uid: string): Promise<boolean> {
  if (owners.has(uid)) return Promise.resolve(true);
  const pending = inflight.get(uid);
  if (pending) return pending;
  const p = (async () => {
    try {
      const { fetchMyPacks } = await import("../../services/packs");
      const mine = await fetchMyPacks();
      const owns = mine.ownsTestSeries === true;
      if (owns) owners.add(uid);
      return owns;
    } catch {
      return false;
    } finally {
      inflight.delete(uid);
    }
  })();
  inflight.set(uid, p);
  return p;
}

/**
 * FREE-TS-WEEKLY: the same read, THREE-state. A wall that refuses an ordinary paper must never fire on a failed read (an owner on a
 * network blip): "unknown" fails OPEN. Shares the cache and the in-flight request of `readTestSeriesOwner`.
 */
export type TestSeriesOwnerState = "owner" | "not-owner" | "unknown";
const unknownReads = new Map<string, Promise<TestSeriesOwnerState>>();
export function readTestSeriesOwnerState(uid: string): Promise<TestSeriesOwnerState> {
  if (owners.has(uid)) return Promise.resolve("owner");
  const pending = unknownReads.get(uid);
  if (pending) return pending;
  const p = (async (): Promise<TestSeriesOwnerState> => {
    try {
      const { fetchMyPacks } = await import("../../services/packs");
      const mine = await fetchMyPacks();
      if (mine.ownsTestSeries === true) {
        owners.add(uid);
        return "owner";
      }
      return "not-owner";
    } catch {
      return "unknown";
    } finally {
      unknownReads.delete(uid);
    }
  })();
  unknownReads.set(uid, p);
  return p;
}

export function resetPaperCapOwnerForTests(): void {
  owners.clear();
  unknownReads.clear();
  inflight.clear();
}
