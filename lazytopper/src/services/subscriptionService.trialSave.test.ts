// TRIAL-SAVE-1 - a new account's sign-up trial is never lost to a failed save.
//
// THE DEFECT (3 Nov, ~5:09 pm IST sign-up shown as Basic with no trial in admin):
//   1. `activateTrial` wrote the local cache, then fired the cloud write unawaited; `saveCloud`
//      swallowed every error.
//   2. The next load's `hydrateSubscriptionFromCloud` read "absent" and overwrote the local
//      trial with `defaultStatus()`. No retry, no trace: Basic forever.
//
// THE FIX: bounded in-session retry; if the browser still cannot land it (or the next load finds
// the document absent for a < 24 h account that holds a local trial for THIS uid) the server
// restores the SAME sign-up trial through POST /api/trial/ensure-signup. firestore.rules forbid
// a client from re-issuing a chosen date, so the server is the only honest route.
//
// MUTATIONS (each shown RED before commit):
//   M1  drop the retry loop in saveTrialWithRetry          -> "T2 a transient failure is retried"
//   M2  drop the 24 h client precheck AND ignore the cache -> "T6 / T7 / T8" (server is the real gate;
//       the client must not even ask)
//   M3  revert hydrate-absent to overwrite unconditionally -> "T4 / T5"
//   M4  call ensure from a successful write                -> "T9 an explicit tap / healthy sign-up asks nobody"

import { afterEach, beforeEach, expect, it, vi } from "vitest";

const authState: { currentUser: null | { uid: string; metadata: { creationTime: string }; getIdToken: () => Promise<string> } } = {
  currentUser: null,
};

vi.mock("./firebaseClient", () => ({
  firestoreDb: { __fakeDb: true },
  get authClient() {
    return authState;
  },
}));

const getDocMock = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined));
const setDocMock = vi.fn((..._args: unknown[]): Promise<void> => Promise.resolve());
const SERVER_TIMESTAMP = { __serverTimestampSentinel: true };

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => SERVER_TIMESTAMP,
}));

import { activateTrial, hydrateSubscriptionFromCloud, whenTrialWriteSettled } from "./subscriptionService";

const HOUR = 60 * 60 * 1000;
const keyFor = (uid: string) => `lazytopper.subscription.v1:${uid}`;
const stamp = (ms: number) => ({ toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) });
const readCache = (uid: string): Record<string, unknown> | null => {
  const v = localStorage.getItem(keyFor(uid));
  return v ? JSON.parse(v) : null;
};

/** The cloud document for each uid, as the Admin SDK / Firestore would hold it. */
let cloudDoc: Record<string, Record<string, unknown> | null> = {};
let fetchMock: ReturnType<typeof vi.fn>;
let serverCreationMs: Record<string, number> = {};
let serverReachable = true;

function signIn(uid: string, ageMs: number) {
  const created = Date.now() - ageMs;
  serverCreationMs[uid] = created;
  authState.currentUser = {
    uid,
    metadata: { creationTime: new Date(created).toUTCString() },
    getIdToken: () => Promise.resolve(`tok-${uid}`),
  };
}

function snapOf(uid: string) {
  const d = cloudDoc[uid];
  return d
    ? { exists: () => true, metadata: { hasPendingWrites: false, fromCache: false }, data: () => d }
    : { exists: () => false, metadata: { hasPendingWrites: false, fromCache: false }, data: () => undefined };
}

beforeEach(() => {
  localStorage.clear();
  cloudDoc = {};
  serverCreationMs = {};
  serverReachable = true;
  authState.currentUser = null;
  getDocMock.mockReset();
  setDocMock.mockReset();
  setDocMock.mockResolvedValue(undefined);
  // getDoc: the uid is the last segment of the ref the service builds.
  getDocMock.mockImplementation((ref: unknown) => {
    const args = (ref as { __ref: unknown[] }).__ref;
    return Promise.resolve(snapOf(String(args[args.length - 1])));
  });
  // A faithful miniature of the server route: create-only, < 24 h, start = creationTime.
  fetchMock = vi.fn((url: string, init: { headers: Record<string, string> }) => {
    if (!serverReachable) return Promise.reject(new Error("network"));
    const uid = String(init.headers.Authorization).replace("Bearer tok-", "");
    expect(url).toBe("/api/trial/ensure-signup");
    const created = serverCreationMs[uid];
    if (Date.now() - created > 24 * HOUR) return Promise.resolve({ ok: false, status: 409 });
    if (!cloudDoc[uid]) {
      cloudDoc[uid] = { tier: "trial", plan: "trial_7day", premiumSince: null, trialStartDate: stamp(created) };
    }
    return Promise.resolve({ ok: true, status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Run activateTrial and let its whole write chain (retries and backoff included) settle. */
async function activateAndSettle(uid: string) {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  const status = activateTrial(uid);
  const settled = whenTrialWriteSettled(uid);
  await vi.advanceTimersByTimeAsync(5000);
  await settled;
  vi.useRealTimers();
  return status;
}

// ===========================================================================
// T1 - THE REPRODUCTION. A lost sign-up write must come back as the SAME trial.
//      RED on trunk: nothing ever asked a server, and the next load wiped the local trial.
// ===========================================================================
it("T1  every browser write fails -> the server restores the sign-up trial, and the next load keeps it", async () => {
  const uid = "t1-lost-write";
  signIn(uid, 2 * 60 * 1000);
  setDocMock.mockRejectedValue(Object.assign(new Error("unavailable"), { code: "unavailable" }));

  const started = await activateAndSettle(uid);
  expect(started.tier).toBe("trial");
  expect(setDocMock).toHaveBeenCalledTimes(3); // bounded: exactly 3 attempts
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(cloudDoc[uid]?.tier).toBe("trial");

  // "Next load": the cloud now has the restored trial, so hydration finds it.
  const next = await hydrateSubscriptionFromCloud(uid);
  expect(next.tier).toBe("trial");
  expect(new Date(next.trialStartDate as string).getTime()).toBe(serverCreationMs[uid]);
  expect(readCache(uid)?.tier).toBe("trial");
});

it("T1b the lost write is restored even when the failure was only discovered on the NEXT load", async () => {
  const uid = "t1b-next-load";
  signIn(uid, 3 * HOUR);
  // The sign-up left a local trial and nothing in the cloud (the pre-fix state).
  localStorage.setItem(
    keyFor(uid),
    JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - 3 * HOUR).toISOString(), trialEndDate: null, premiumSince: null }),
  );

  const resolved = await hydrateSubscriptionFromCloud(uid);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(resolved.tier).toBe("trial");
  expect(new Date(resolved.trialStartDate as string).getTime()).toBe(serverCreationMs[uid]);
  expect(cloudDoc[uid]?.plan).toBe("trial_7day");
  // The browser never wrote a start of its own choosing.
  expect(setDocMock).not.toHaveBeenCalled();
});

// ===========================================================================
// T2 / T3 - the retry is bounded and only for failures that can heal
// ===========================================================================
it("T2  a transient failure is retried in the same session and no server call is needed", async () => {
  const uid = "t2-transient";
  signIn(uid, 60 * 1000);
  setDocMock
    .mockRejectedValueOnce(Object.assign(new Error("unavailable"), { code: "unavailable" }))
    .mockResolvedValue(undefined);

  await activateAndSettle(uid);

  expect(setDocMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).not.toHaveBeenCalled();
  // Both attempts pin the start with the server timestamp, never a client date.
  for (const call of setDocMock.mock.calls) {
    expect((call[1] as Record<string, unknown>).trialStartDate).toBe(SERVER_TIMESTAMP);
  }
});

it("T3  a rules refusal (permission-denied) is not retried; the server settles it", async () => {
  const uid = "t3-denied";
  signIn(uid, 60 * 1000);
  setDocMock.mockRejectedValue(Object.assign(new Error("denied"), { code: "permission-denied" }));

  await activateAndSettle(uid);

  expect(setDocMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

// ===========================================================================
// T4 / T5 - hydrate-absent for a genuinely new account
// ===========================================================================
it("T4  absent + local trial for THIS uid + < 24 h account: the local trial is not wiped", async () => {
  const uid = "t4-keep";
  signIn(uid, HOUR);
  localStorage.setItem(
    keyFor(uid),
    JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - HOUR).toISOString(), trialEndDate: null, premiumSince: null }),
  );
  serverReachable = false; // the restore cannot be reached right now

  const resolved = await hydrateSubscriptionFromCloud(uid);

  expect(resolved.tier).toBe("trial");
  expect(readCache(uid)?.tier).toBe("trial"); // kept, to try again next load
  expect(setDocMock).not.toHaveBeenCalled(); // and nothing uploaded from the cache
});

it("T5  the server restore is capped per page session (3 calls per uid)", async () => {
  const uid = "t5-cap";
  signIn(uid, HOUR);
  localStorage.setItem(
    keyFor(uid),
    JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - HOUR).toISOString(), trialEndDate: null, premiumSince: null }),
  );
  serverReachable = false;
  for (let i = 0; i < 6; i += 1) await hydrateSubscriptionFromCloud(uid);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

// ===========================================================================
// T6 / T7 / T8 - it must be IMPOSSIBLE to get a trial this way when not a new sign-up
// ===========================================================================
it("T6  an account OLDER than 24 h with an absent doc stays Basic: no call, local forgery wiped", async () => {
  const uid = "t6-old";
  signIn(uid, 25 * HOUR);
  localStorage.setItem(
    keyFor(uid),
    JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date().toISOString(), trialEndDate: null, premiumSince: null }),
  );

  const resolved = await hydrateSubscriptionFromCloud(uid);

  expect(fetchMock).not.toHaveBeenCalled();
  expect(resolved.tier).toBe("free");
  expect(readCache(uid)?.tier).toBe("free");
  expect(cloudDoc[uid]).toBeUndefined();
});

it("T7  another uid's cache is ignored: signed-in B with a trial cached only under A gets nothing", async () => {
  signIn("t7-b", HOUR); // B is a brand-new account...
  localStorage.setItem(
    keyFor("t7-a"), // ...but the trial in this browser belongs to A
    JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date().toISOString(), trialEndDate: null, premiumSince: null }),
  );

  const resolved = await hydrateSubscriptionFromCloud("t7-b");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(resolved.tier).toBe("free");

  // And hydrating A while B is the signed-in user: the uid must match the Auth user.
  const asA = await hydrateSubscriptionFromCloud("t7-a");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(asA.tier).toBe("free");
});

it("T8  a new account with NO local trial and an absent doc is not given one on load (no trial on login/reload)", async () => {
  const uid = "t8-no-evidence";
  signIn(uid, HOUR);

  const resolved = await hydrateSubscriptionFromCloud(uid);

  expect(fetchMock).not.toHaveBeenCalled();
  expect(resolved.tier).toBe("free");
});

// ===========================================================================
// T9 / T10 - nothing else moves
// ===========================================================================
it("T9  a healthy sign-up / explicit tap: ONE pinned write, no server call", async () => {
  const uid = "t9-healthy";
  signIn(uid, 30 * 1000);

  const status = await activateAndSettle(uid);

  expect(status.tier).toBe("trial");
  expect(setDocMock).toHaveBeenCalledTimes(1);
  expect((setDocMock.mock.calls[0][1] as Record<string, unknown>).trialStartDate).toBe(SERVER_TIMESTAMP);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("T10 an existing trial is never moved: activation refuses, and a found cloud trial triggers no restore", async () => {
  const uid = "t10-existing";
  signIn(uid, 2 * HOUR);
  const start = Date.now() - 2 * HOUR;
  localStorage.setItem(
    keyFor(uid),
    JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(start).toISOString(), trialEndDate: null, premiumSince: null }),
  );
  const again = activateTrial(uid);
  expect(new Date(again.trialStartDate as string).getTime()).toBe(start);
  expect(setDocMock).not.toHaveBeenCalled();

  cloudDoc[uid] = { tier: "trial", plan: "trial_7day", premiumSince: null, trialStartDate: stamp(start) };
  const resolved = await hydrateSubscriptionFromCloud(uid);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(new Date(resolved.trialStartDate as string).getTime()).toBe(start);
});

it("T11 a signed-out / mismatched Auth user can never reach the server restore", async () => {
  const uid = "t11-signed-out";
  setDocMock.mockRejectedValue(Object.assign(new Error("unavailable"), { code: "unavailable" }));
  authState.currentUser = null;

  await activateAndSettle(uid);

  expect(fetchMock).not.toHaveBeenCalled();
});
