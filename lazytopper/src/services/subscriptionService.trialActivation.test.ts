// P0-TRIAL — THE TRIAL DOWNGRADED DURING ITS OWN ACTIVATION.
//
// The production fingerprint (a real record, 2026-07-31):
//
//   plan: "trial_7day"   tier: "free"   premiumSince: null
//   trialStartDate: 2026-07-31T11:10:22Z   updatedAt: 2026-07-31T11:10:23.593Z
//
// The start is present because the SERVER eventually wrote it; the tier is free
// because the CLIENT had already downgraded one second earlier.
//
// THE CHAIN
//   1. `activateTrial` -> `saveCloud(..., {pinTrialStart:true})` sends
//      `trialStartDate: serverTimestamp()`, a SENTINEL. The real instant exists only
//      once the server acknowledges the write.
//   2. The same mount's `hydrateSubscriptionFromCloud` reads the document back BEFORE
//      that acknowledgement. Firestore overlays the still-pending local mutation onto
//      the snapshot, and `snap.data()` — whose default is `serverTimestamps: "none"` —
//      materialises an unresolved server timestamp as **null**.
//   3. `trialStartMs` -> null, `applyExpiry` -> tier "free" (fails closed, as designed),
//      and hydration then PERSISTS that downgrade back to Firestore. That write is the
//      `updatedAt` one second after the start.
//
// ★ The fail-closed rule is CORRECT and is not touched here. The defect is that the
//   client evaluated it against a snapshot in which the proof could not yet exist.
//
// ★ SECOND PATH, same failure: `trialStartMs` also rejected any start AHEAD of
//   `Date.now()`. A server-pinned start is routinely a few hundred ms — or, on a phone
//   with a drifting clock, minutes — ahead of the device. Those students were downgraded
//   too, and only some of them, which is why it never reproduced on a desktop.
//
// ★ MUTATIONS — each run and shown RED before this file was committed:
//   M1  revert the fix (`snap.data()` with no options)         -> test 1 red   [ACCEPTANCE]
//   M2  make `applyExpiry` lenient about a missing start       -> test 5 red   [SECURITY]
//   M3  drop the skew tolerance (`ms > Date.now()` -> null)    -> test 2 red
//   M4  repair from a client-shaped (string) start too         -> test 4c red

import { beforeEach, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));

const getDocMock = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined));
const setDocMock = vi.fn((..._args: unknown[]): Promise<void> => Promise.resolve());
const SERVER_TIMESTAMP = { __serverTimestampSentinel: true };

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => SERVER_TIMESTAMP,
}));

import {
  TRIAL_DAYS,
  activateTrial,
  hydrateSubscriptionFromCloud,
  isPremiumAccess,
} from "./subscriptionService";

const UID = "student-bob";
const KEY = `lazytopper.subscription.v1:${UID}`;
const DAY = 24 * 60 * 60 * 1000;

/** What Firestore actually hands back for a Timestamp field. */
const stamp = (ms: number) => ({ toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) });

type SnapOptions = { serverTimestamps?: "none" | "estimate" | "previous" } | undefined;

/**
 * A snapshot carrying an UNACKNOWLEDGED `serverTimestamp()` — the exact state the
 * activating mount reads. This models the SDK contract precisely: the pending field is
 * `null` under the default options and a locally ESTIMATED Timestamp under
 * `{serverTimestamps:"estimate"}`. It is that distinction — pending is DISTINGUISHABLE
 * from absent — that the fix rests on.
 */
const pending = (estimateMs: number, rest: Record<string, unknown>) => ({
  exists: () => true,
  metadata: { hasPendingWrites: true, fromCache: true },
  data: (opts?: SnapOptions) => ({
    ...rest,
    trialStartDate: opts?.serverTimestamps === "estimate" ? stamp(estimateMs) : null,
  }),
});

/** A settled document: options change nothing. */
const found = (data: Record<string, unknown>) => ({
  exists: () => true,
  metadata: { hasPendingWrites: false, fromCache: false },
  data: (_opts?: SnapOptions) => data,
});

const readCache = (): Record<string, unknown> | null => {
  const v = localStorage.getItem(KEY);
  return v ? JSON.parse(v) : null;
};
const cloudWrites = () => setDocMock.mock.calls.map((c) => c[1] as Record<string, unknown>);

beforeEach(() => {
  localStorage.clear();
  getDocMock.mockReset();
  setDocMock.mockReset();
  setDocMock.mockResolvedValue(undefined);
});

// ===========================================================================
// 1 — ★★ THE REPRODUCTION. A fresh activation must end as a trial.
//     RED on unmodified trunk: the resolve returned "free".
// ===========================================================================
it("1  a fresh activation resolves to TRIAL, and never writes free back", async () => {
  const optimistic = activateTrial(UID);
  expect(optimistic.tier).toBe("trial");

  // Same mount, moments later: the write has not been acknowledged yet.
  getDocMock.mockResolvedValue(pending(Date.now(), { tier: "trial", plan: "trial_7day", premiumSince: null }));

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("trial");
  expect(resolved.plan).toBe("trial_7day");
  expect(isPremiumAccess(resolved)).toBe(true);
  expect(readCache()?.tier).toBe("trial");
  // ★ The production fingerprint was a `tier:"free"` write one second after the start.
  expect(cloudWrites().some((w) => w.tier === "free")).toBe(false);
});

// ===========================================================================
// 2 — ★ THE SECOND PATH. A server-pinned start slightly AHEAD of the device clock.
//     RED on unmodified trunk (`if (ms > Date.now()) return null`).
// ===========================================================================
it("2  a start ahead of the device clock is skew, not a forgery", async () => {
  getDocMock.mockResolvedValue(
    found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(Date.now() + 45_000) }),
  );

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("trial");
  expect(isPremiumAccess(resolved)).toBe(true);
});

it("2b  but a start far beyond any plausible skew is still refused", async () => {
  getDocMock.mockResolvedValue(
    found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(Date.now() + 90 * DAY) }),
  );
  expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
});

// ===========================================================================
// 3 — ★ THE FAIL-CLOSED RULE SURVIVES: a genuinely elapsed trial still downgrades.
// ===========================================================================
it("3  an elapsed trial still downgrades to free", async () => {
  getDocMock.mockResolvedValue(
    found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(Date.now() - (TRIAL_DAYS + 1) * DAY) }),
  );

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("free");
  expect(isPremiumAccess(resolved)).toBe(false);
});

// ===========================================================================
// 4 — ★★ THE ALREADY-BROKEN ACCOUNTS. These start from the BROKEN SHAPE, not clean:
//     tier "free" over a live, SERVER-SET start. That is the record every student who
//     signed up since SEC-2 is sitting on, and they will never report it.
// ===========================================================================
it("4a  a free tier over a live server-set start is REPAIRED to trial", async () => {
  const startMs = Date.now() - 2 * DAY;
  getDocMock.mockResolvedValue(
    found({ tier: "free", plan: "trial_7day", trialStartDate: stamp(startMs), premiumSince: null }),
  );

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("trial");
  expect(resolved.plan).toBe("trial_7day");
  expect(readCache()?.tier).toBe("trial");
  // The repair is persisted, so the record stops lying about the student's entitlement.
  expect(cloudWrites().some((w) => w.tier === "trial")).toBe(true);
  // ...and it never re-pins the start, which the rules would refuse anyway.
  expect(cloudWrites().every((w) => !("trialStartDate" in w))).toBe(true);
});

it("4b  a free tier over an ELAPSED server-set start stays free", async () => {
  getDocMock.mockResolvedValue(
    found({
      tier: "free",
      plan: "trial_7day",
      trialStartDate: stamp(Date.now() - (TRIAL_DAYS + 3) * DAY),
      premiumSince: null,
    }),
  );
  expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
});

it("4c  ★ the repair refuses a client-SHAPED start — only a server Timestamp counts", async () => {
  // A legacy/forged ISO *string* is exactly what SEC-2 exists to distrust. Firestore's
  // server-pinned value always arrives as a Timestamp object; a string never can be one.
  getDocMock.mockResolvedValue(
    found({
      tier: "free",
      plan: "trial_7day",
      trialStartDate: new Date(Date.now() - 2 * DAY).toISOString(),
      premiumSince: null,
    }),
  );
  expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
});

it("4d  the repair never touches a premium record, and never invents a plan", async () => {
  getDocMock.mockResolvedValue(
    found({ tier: "free", plan: "none", trialStartDate: stamp(Date.now() - 1 * DAY), premiumSince: null }),
  );
  expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
});

// ===========================================================================
// 5 — ★ THE ROUTE C GUARANTEE, unchanged. No start at all is still no trial.
//     Reddens against M2 (a lenient `applyExpiry`).
// ===========================================================================
it("5  a trial with NO start at all still fails closed", async () => {
  getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day" }));

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("free");
  expect(isPremiumAccess(resolved)).toBe(false);
});
