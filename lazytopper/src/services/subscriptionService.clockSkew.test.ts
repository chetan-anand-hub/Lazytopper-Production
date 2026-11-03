// TRIAL-CLOCK-1 — a day-1 trial on a phone whose clock runs SLOW.
//
// The live record (3 Nov 2026): a student signed up at 17:34 IST; the server and admin said
// "Trial · 7 days left"; the client showed "Your free week is over" and treated them as Basic.
// Their phone clock was behind real time, so the SERVER-PINNED start (request.time) looked like
// it was in the future. `trialStartMs` refused anything more than 5 min ahead -> null ->
// `applyExpiry` -> free, and hydration then WROTE tier "free" back over the server's record.
//
// Every case pins the device clock with vi.setSystemTime, so nothing here depends on the day
// the suite runs.
//
// MUTATIONS (each shown RED before commit):
//   M1  drop `{ serverPinned: pinned }` from applyExpiry in hydration     -> A, B, C red
//   M2  drop the deviceClockOnly write guard                              -> G, G2 red
//   M3  give every start the pinned limit (loosen the client rule)       -> F1, F2 red

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));

const getDocMock = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined));
const setDocMock = vi.fn((..._args: unknown[]): Promise<void> => Promise.resolve());

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => ({ __serverTimestampSentinel: true }),
}));

import {
  TRIAL_DAYS,
  getDaysLeftInTrial,
  hydrateSubscriptionFromCloud,
  isPremiumAccess,
  loadSubscription,
  trialHasRunItsCourse,
} from "./subscriptionService";

const UID = "student-skew";
const KEY = `lazytopper.subscription.v1:${UID}`;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Real (server) time of the sign-up: 3 Nov 2026, 17:34 IST. */
const SERVER_NOW = Date.UTC(2026, 10, 3, 12, 4);

/** What Firestore hands back for a server-written Timestamp field. */
const stamp = (ms: number) => ({ toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) });
const found = (data: Record<string, unknown>) => ({
  exists: () => true,
  metadata: { hasPendingWrites: false, fromCache: false },
  data: () => data,
});
const cloudWrites = () => setDocMock.mock.calls.map((c) => c[1] as Record<string, unknown>);
const readCache = (): Record<string, unknown> | null => {
  const v = localStorage.getItem(KEY);
  return v ? JSON.parse(v) : null;
};
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  localStorage.clear();
  getDocMock.mockReset();
  setDocMock.mockReset();
  setDocMock.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("TRIAL-CLOCK-1 · a server-pinned start ahead of a SLOW device clock", () => {
  it.each([
    ["A  a day behind", DAY],
    ["B  18 hours behind", 18 * HOUR],
  ])("%s: stays TRIAL, 7 days left, and nothing is written to the cloud", async (_n, behind) => {
    vi.setSystemTime(SERVER_NOW - behind);
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(SERVER_NOW) }));

    const resolved = await hydrateSubscriptionFromCloud(UID);
    await flush();

    expect(resolved.tier).toBe("trial");
    expect(isPremiumAccess(resolved)).toBe(true);
    expect(getDaysLeftInTrial(resolved)).toBe(TRIAL_DAYS);
    expect(trialHasRunItsCourse(resolved.trialStartDate)).toBe(false);
    expect(cloudWrites()).toEqual([]); // ★ no downgrade written over the server's record

    // The start is held as this device's NOW (clamped, never trusted forward)...
    expect(Date.parse(resolved.trialStartDate ?? "")).toBe(Date.now());
    // ...so the next mount's cache read agrees, and writes nothing either.
    expect(readCache()?.tier).toBe("trial");
    expect(loadSubscription(UID).tier).toBe("trial");
    await flush();
    expect(cloudWrites()).toEqual([]);
  });

  it("C  a record an older client already downgraded is REPAIRED to trial", async () => {
    vi.setSystemTime(SERVER_NOW - DAY);
    getDocMock.mockResolvedValue(
      found({ tier: "free", plan: "trial_7day", premiumSince: null, trialStartDate: stamp(SERVER_NOW) }),
    );
    const resolved = await hydrateSubscriptionFromCloud(UID);
    await flush();
    expect(resolved.tier).toBe("trial");
    expect(cloudWrites().map((w) => w.tier)).toEqual(["trial"]);
    expect(cloudWrites().every((w) => !("trialStartDate" in w))).toBe(true); // the pinned start is never re-sent
  });

  it("G  a pinned start beyond the 2-day limit fails closed LOCALLY, but no downgrade is written", async () => {
    vi.setSystemTime(SERVER_NOW - 3 * DAY);
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(SERVER_NOW) }));
    const resolved = await hydrateSubscriptionFromCloud(UID);
    await flush();
    expect(resolved.tier).toBe("free");
    expect(isPremiumAccess(resolved)).toBe(false);
    expect(cloudWrites()).toEqual([]);
    // ...and the trial-ended screen's evidence check says the week has NOT run.
    expect(trialHasRunItsCourse(resolved.trialStartDate)).toBe(false);
  });

  it("G2 a far-future pinned start (90 days) is still refused, and still not written", async () => {
    vi.setSystemTime(SERVER_NOW);
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(SERVER_NOW + 90 * DAY) }));
    expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
    await flush();
    expect(cloudWrites()).toEqual([]);
  });
});

describe("TRIAL-CLOCK-1 · behaviour that must NOT change", () => {
  it("D  device clock 8 days AHEAD: by this device the week has run -> free, written, and the screen applies", async () => {
    // As designed: a start 8 days behind the device clock is indistinguishable, on the client,
    // from a genuinely ended trial. The client shows Basic and the trial-ended screen; the
    // server's deriveEffectiveTier still decides server-metered features and repairs the record.
    vi.setSystemTime(SERVER_NOW + 8 * DAY);
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(SERVER_NOW) }));
    const resolved = await hydrateSubscriptionFromCloud(UID);
    await flush();
    expect(resolved.tier).toBe("free");
    expect(trialHasRunItsCourse(resolved.trialStartDate)).toBe(true);
    expect(cloudWrites().map((w) => w.tier)).toEqual(["free"]);
  });

  it("E  a genuinely ended trial (start 8 days ago, true clock) is free and the screen applies", async () => {
    vi.setSystemTime(SERVER_NOW);
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(SERVER_NOW - 8 * DAY) }));
    const resolved = await hydrateSubscriptionFromCloud(UID);
    await flush();
    expect(resolved.tier).toBe("free");
    expect(trialHasRunItsCourse(resolved.trialStartDate)).toBe(true);
    expect(cloudWrites().map((w) => w.tier)).toEqual(["free"]);
  });

  it("F1 a client-SHAPED (ISO string) start a day ahead in the cloud is still rejected", async () => {
    vi.setSystemTime(SERVER_NOW);
    getDocMock.mockResolvedValue(
      found({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(SERVER_NOW + DAY).toISOString() }),
    );
    expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
  });

  it("F2 a cached (never server-pinned) start a day ahead is still rejected, with no cloud write", async () => {
    vi.setSystemTime(SERVER_NOW);
    localStorage.setItem(
      KEY,
      JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(SERVER_NOW + DAY).toISOString(), trialEndDate: null, premiumSince: null }),
    );
    const resolved = loadSubscription(UID);
    await flush();
    expect(resolved.tier).toBe("free");
    expect(getDaysLeftInTrial(resolved)).toBe(0);
    expect(cloudWrites()).toEqual([]);
  });

  it("F3 a cached start within the old 5-minute tolerance is unchanged", () => {
    vi.setSystemTime(SERVER_NOW);
    localStorage.setItem(
      KEY,
      JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(SERVER_NOW + 2 * 60 * 1000).toISOString(), trialEndDate: null, premiumSince: null }),
    );
    expect(loadSubscription(UID).tier).toBe("trial");
  });
});
