// SEC-2 — ENTITLEMENT MUST NOT BE FORGEABLE (client half).
//
// Two of the three self-grant routes are closed here; the third (writing tier:"premium"
// straight into Firestore) is closed in firestore.rules by SEC-PAIR PR-1.
//
//   ROUTE B  a hand-written localStorage entitlement. `loadCloud` used to return null
//            for BOTH "no document" and "the read threw", so hydration could not tell
//            "nobody issued this student anything" from "we failed to ask" — and it
//            resolved both by keeping the cache. A forged cache therefore stood.
//
//   ROUTE C  `{tier:"trial", trialEndDate:"3000-01-01"}` — a permanent trial. The
//            defect was never that a trial grants premium (it does, by design, for 7
//            days); it was that the trial's LENGTH was a client-supplied string that
//            `applyExpiry` trusted. The end is now DERIVED from a server-pinned start
//            plus the TRIAL_DAYS constant, and the stored field is not read at all.
//
// ★ MUTATIONS — every one of these was run and shown RED before this file was committed:
//   M1  collapse `absent` and `error` into one branch      -> test 1 or 2 red
//   M2  read `trialEndDate` again in `applyExpiry`         -> test 6 red
//   M4  treat a missing `trialStartDate` as valid          -> test 4 red
//   (M3, moving a pinned trialStartDate, is a RULES mutation — see
//    firestore-rules-tests/subscriptions.rules.test.mjs)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));

// ★ Typed with real rest signatures on purpose. `vi.fn()` with no signature gives
// `mock.calls` an EMPTY-TUPLE type, so `calls[0][2]` is a TS2493 error and spreading
// into the mock is TS2556 — green under tsconfig.app.json (which excludes test files)
// and red under the separate typecheck:test gate.
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
  getDaysLeftInTrial,
  hydrateSubscriptionFromCloud,
  isPremiumAccess,
  loadSubscription,
  saveSubscription,
  type SubscriptionStatus,
} from "./subscriptionService";

const UID = "student-alice";
const KEY = `lazytopper.subscription.v1:${UID}`;
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

/** Write a raw object straight into the cache, exactly as devtools would. */
function forgeCache(raw: Record<string, unknown>): void {
  localStorage.setItem(KEY, JSON.stringify(raw));
}
function readCache(): Record<string, unknown> | null {
  const v = localStorage.getItem(KEY);
  return v ? JSON.parse(v) : null;
}

const found = (data: Record<string, unknown>) => ({ exists: () => true, data: () => data });
const absent = { exists: () => false, data: () => undefined };

beforeEach(() => {
  localStorage.clear();
  getDocMock.mockReset();
  setDocMock.mockReset();
  setDocMock.mockResolvedValue(undefined);
});

// ===========================================================================
// 1 — ★ ROUTE B. The read SUCCEEDED and there is no document. A cache must not
//     grant a tier nobody issued.
// ===========================================================================
it("1  cache says premium, cloud ABSENT -> resolves FREE", async () => {
  forgeCache({ tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: iso(Date.now()) });
  getDocMock.mockResolvedValue(absent);

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("free");
  expect(isPremiumAccess(resolved)).toBe(false);
  // ...and the forgery is evicted, not merely ignored for this one call.
  expect(readCache()?.tier).toBe("free");
});

// ===========================================================================
// 2 — ★ The OTHER half of the same distinction. The read FAILED, so we learned
//     nothing; stripping access here would log out every offline paying student.
// ===========================================================================
it("2  cache says premium, cloud ERROR -> cache RETAINED", async () => {
  forgeCache({ tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: iso(Date.now()) });
  getDocMock.mockRejectedValue(new Error("offline"));

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("premium");
  expect(isPremiumAccess(resolved)).toBe(true);
});

// ===========================================================================
// 3 — The cloud is the record of truth in the other direction too.
// ===========================================================================
it("3  cache says free, cloud says premium -> PREMIUM", async () => {
  forgeCache({ tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null });
  getDocMock.mockResolvedValue(found({ tier: "premium", plan: "premium_monthly", premiumSince: iso(Date.now()) }));

  const resolved = await hydrateSubscriptionFromCloud(UID);

  expect(resolved.tier).toBe("premium");
  expect(readCache()?.tier).toBe("premium");
});

// ===========================================================================
// 4 — ★ FAIL CLOSED. A trial that cannot prove when it began has NOT begun.
//     Reddens against M4 (missing start treated as valid).
// ===========================================================================
describe("4  a trial with no provable start is EXPIRED, not valid", () => {
  it("4a from the cache", () => {
    forgeCache({ tier: "trial", plan: "trial_7day", trialStartDate: null, trialEndDate: null, premiumSince: null });
    const resolved = loadSubscription(UID);
    expect(resolved.tier).toBe("free");
    expect(isPremiumAccess(resolved)).toBe(false);
  });

  it("4b from the cloud", async () => {
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day" }));
    const resolved = await hydrateSubscriptionFromCloud(UID);
    expect(resolved.tier).toBe("free");
  });

  it("4c a start in the FUTURE is not a start either", () => {
    forgeCache({ tier: "trial", plan: "trial_7day", trialStartDate: iso(Date.now() + 90 * DAY), trialEndDate: null, premiumSince: null });
    expect(loadSubscription(UID).tier).toBe("free");
    expect(getDaysLeftInTrial(loadSubscription(UID))).toBe(0);
  });
});

// ===========================================================================
// 5 — The window itself, derived from start + TRIAL_DAYS.
// ===========================================================================
describe("5  the derived trial window", () => {
  it("5a within the window -> active", async () => {
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: iso(Date.now() - 2 * DAY) }));
    const resolved = await hydrateSubscriptionFromCloud(UID);
    expect(resolved.tier).toBe("trial");
    expect(isPremiumAccess(resolved)).toBe(true);
    expect(getDaysLeftInTrial(resolved)).toBe(TRIAL_DAYS - 2);
  });

  it("5b past the window -> free", async () => {
    getDocMock.mockResolvedValue(found({ tier: "trial", plan: "trial_7day", trialStartDate: iso(Date.now() - (TRIAL_DAYS + 1) * DAY) }));
    const resolved = await hydrateSubscriptionFromCloud(UID);
    expect(resolved.tier).toBe("free");
    expect(getDaysLeftInTrial(resolved)).toBe(0);
  });

  it("5c a Firestore Timestamp start is normalised, not dropped", async () => {
    const startMs = Date.now() - 1 * DAY;
    getDocMock.mockResolvedValue(
      found({ tier: "trial", plan: "trial_7day", trialStartDate: { toDate: () => new Date(startMs) } }),
    );
    const resolved = await hydrateSubscriptionFromCloud(UID);
    expect(resolved.tier).toBe("trial");
    expect(resolved.trialStartDate).toBe(iso(startMs));
  });
});

// ===========================================================================
// 6 — ★ ROUTE C. The forged field grants NOTHING because it is never read.
//     Reddens against M2 (trialEndDate read again).
// ===========================================================================
describe("6  a forged far-future trialEndDate grants nothing", () => {
  it("6a in the cache, over an expired start", () => {
    forgeCache({
      tier: "trial",
      plan: "trial_7day",
      trialStartDate: iso(Date.now() - 30 * DAY),
      trialEndDate: "3000-01-01T00:00:00.000Z",
      premiumSince: null,
    });
    const resolved = loadSubscription(UID);
    expect(resolved.tier).toBe("free");
    expect(getDaysLeftInTrial(resolved)).toBe(0);
  });

  it("6b in the cache, with NO start at all", () => {
    forgeCache({
      tier: "trial",
      plan: "trial_7day",
      trialStartDate: null,
      trialEndDate: "3000-01-01T00:00:00.000Z",
      premiumSince: null,
    });
    expect(loadSubscription(UID).tier).toBe("free");
  });

  it("6c in the cloud document", async () => {
    getDocMock.mockResolvedValue(
      found({ tier: "trial", plan: "trial_7day", trialStartDate: iso(Date.now() - 30 * DAY), trialEndDate: "3000-01-01T00:00:00.000Z" }),
    );
    const resolved = await hydrateSubscriptionFromCloud(UID);
    expect(resolved.tier).toBe("free");
    expect(resolved.trialEndDate).toBeNull();
  });
});

// ===========================================================================
// 7 — ★ §2c ORDERING, stated rather than assumed.
//     `loadSubscription` is SYNCHRONOUS and cache-first, so between mount and
//     hydration a forged cache IS briefly reflected in the UI. That is a decision,
//     not an accident: the alternative (start everyone at free) blanks real
//     subscribers on every mount and breaks the offline case in test 2. What this
//     test pins is that the window is BOUNDED — it terminates in free.
// ===========================================================================
it("7  a forged cache is visible pre-hydration and gone after it", async () => {
  forgeCache({ tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: iso(Date.now()) });
  getDocMock.mockResolvedValue(absent);

  // What the first synchronous render sees:
  expect(loadSubscription(UID).tier).toBe("premium");
  // What the same mount's hydration resolves to:
  expect((await hydrateSubscriptionFromCloud(UID)).tier).toBe("free");
  // And the flash cannot recur on the next mount.
  expect(loadSubscription(UID).tier).toBe("free");
});

// ===========================================================================
// 8 — The cloud PAYLOAD contract. These are the properties firestore.rules
//     depends on; a spread of the whole status would break every write silently
//     (the rules refuse a client-chosen trialStartDate and an introduced
//     trialEndDate, and saveCloud swallows the rejection).
// ===========================================================================
describe("8  what the client actually sends to Firestore", () => {
  const payload = () => setDocMock.mock.calls.at(-1)?.[1] as Record<string, unknown>;

  it("8a activateTrial pins the start with serverTimestamp() and sends no trialEndDate", () => {
    activateTrial(UID);
    expect(setDocMock).toHaveBeenCalled();
    expect(payload().trialStartDate).toBe(SERVER_TIMESTAMP);
    expect("trialEndDate" in payload()).toBe(false);
    expect(payload().tier).toBe("trial");
  });

  it("8b every OTHER write omits trialStartDate, so the merge preserves the pinned value", () => {
    const status: SubscriptionStatus = {
      tier: "free",
      plan: "trial_7day",
      trialStartDate: iso(Date.now() - 30 * DAY),
      trialEndDate: null,
      premiumSince: null,
    };
    saveSubscription(UID, status);
    expect("trialStartDate" in payload()).toBe(false);
    expect("trialEndDate" in payload()).toBe(false);
  });

  it("8c the merge flag is set, without which an omitted field would ERASE the start", () => {
    saveSubscription(UID, { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null });
    expect(setDocMock.mock.calls.at(-1)?.[2]).toEqual({ merge: true });
  });

  it("8d activateTrial is refused a second time once a start exists", () => {
    activateTrial(UID);
    const callsAfterFirst = setDocMock.mock.calls.length;
    const again = activateTrial(UID);
    expect(setDocMock.mock.calls.length).toBe(callsAfterFirst);
    expect(again.tier).toBe("trial");
  });
});
