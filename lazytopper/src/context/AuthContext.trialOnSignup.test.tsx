/**
 * TRIAL-ON-SIGNUP-1 · T1 / T3 / T5 / D6 — a NEW account's 7-day trial starts AT SIGN-UP,
 * ONCE, on every new-account door; logins, reloads, auth re-emits and phone LINKING never
 * start one; `activateTrial`'s own guards stay the final word; `trial_start` fires only
 * when a trial actually started.
 *
 * What runs for real: AuthProvider (every door), newAccountTrial, the REAL
 * subscriptionService (activateTrial / loadSubscription / hydrateSubscriptionFromCloud —
 * activateTrial is wrapped in a spy that calls through) and the REAL useSubscription.
 *
 * What is faked: `firebase/auth` (the doors) and `firebase/firestore`, as an in-memory
 * store with two properties the D6 proof depends on —
 *   • setDoc applies to the store SYNCHRONOUSLY at call time (the SDK queues the write on
 *     its client before the call returns), resolving serverTimestamp() to a Timestamp;
 *   • getDoc answers with the store AS IT WAS WHEN THE READ WAS ISSUED, one macrotask
 *     later — deliberately pessimistic: a read issued before the trial write would come
 *     back "absent" and would clobber the cache. So a green D6 test here proves ORDER
 *     (the write is queued before the first read of the new uid), not a lenient fake.
 *
 * Mutations this file turns RED (spec T5, applied one at a time — see the lane report):
 *   M1 drop the isNewUser gate in newAccountTrial.startTrialIfNewAccount (start on every login)
 *   M2 call activateTrial twice in newAccountTrial.startTrialForNewAccount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";

type FakeUser = { uid: string; email: string | null; phoneNumber: string | null; displayName: string | null };
type FakeCred = { user: FakeUser; _info: { isNewUser: boolean } | null };

const H = vi.hoisted(() => ({
  AUTH_CLIENT: { currentUser: null as unknown },
  authCb: null as null | ((u: unknown) => void),
  initialUser: null as unknown,
  nextCred: null as unknown,
  /** Cloud documents by path. */
  store: new Map<string, Record<string, unknown>>(),
  /** Ordered log of cloud calls: "set:<path>" / "get:<path>". */
  log: [] as string[],
  setDocFails: false,
  getDocFails: false,
  track: vi.fn(),
}));

vi.mock("firebase/firestore", () => {
  const SENTINEL = { __sentinel: "serverTimestamp" };
  const timestamp = (ms: number) => ({ seconds: Math.floor(ms / 1000), toDate: () => new Date(ms) });
  return {
    doc: (_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }),
    serverTimestamp: () => SENTINEL,
    // ★ No await before the store write: applied synchronously, like the SDK's local queue.
    setDoc: vi.fn(async (ref: { path: string }, payload: Record<string, unknown>, opts?: { merge?: boolean }) => {
      H.log.push(`set:${ref.path}`);
      if (H.setDocFails) throw new Error("unavailable");
      const next: Record<string, unknown> = opts?.merge ? { ...(H.store.get(ref.path) ?? {}) } : {};
      for (const [k, v] of Object.entries(payload)) next[k] = v === SENTINEL ? timestamp(Date.now()) : v;
      H.store.set(ref.path, next);
    }),
    // ★ Snapshot taken when the read is ISSUED; answered a macrotask later.
    getDoc: vi.fn(async (ref: { path: string }) => {
      H.log.push(`get:${ref.path}`);
      const seen = H.store.has(ref.path) ? { ...H.store.get(ref.path) } : undefined;
      const fails = H.getDocFails;
      await new Promise((r) => setTimeout(r, 0));
      if (fails) throw new Error("offline");
      return { exists: () => seen !== undefined, data: () => seen };
    }),
  };
});

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  getAdditionalUserInfo: (cred: { _info?: unknown } | null) => cred?._info ?? null,
  // Every door notifies the auth listener BEFORE it resolves — as the SDK does.
  signInWithPopup: vi.fn(async () => {
    const cred = H.nextCred as FakeCred;
    H.AUTH_CLIENT.currentUser = cred.user;
    H.authCb?.(cred.user);
    return cred;
  }),
  signInWithEmailAndPassword: vi.fn(async () => {
    const cred = H.nextCred as FakeCred;
    H.AUTH_CLIENT.currentUser = cred.user;
    H.authCb?.(cred.user);
    return cred;
  }),
  createUserWithEmailAndPassword: vi.fn(async () => {
    const cred = H.nextCred as FakeCred;
    H.AUTH_CLIENT.currentUser = cred.user;
    H.authCb?.(cred.user);
    return cred;
  }),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(async (u: FakeUser, p: { displayName: string }) => {
    u.displayName = p.displayName;
  }),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    async render() {}
  },
  signInWithPhoneNumber: vi.fn(async () => ({
    confirm: vi.fn(async () => {
      const cred = H.nextCred as FakeCred;
      H.AUTH_CLIENT.currentUser = cred.user;
      H.authCb?.(cred.user);
      return cred;
    }),
  })),
  // LINKING: adversarial on purpose — the link confirmation even claims isNewUser. The
  // link path must never reach the trial hook at all.
  linkWithPhoneNumber: vi.fn(async (current: FakeUser) => ({
    confirm: vi.fn(async () => ({ user: current, _info: { isNewUser: true } })),
  })),
  onAuthStateChanged: (_c: unknown, cb: (u: unknown) => void) => {
    H.authCb = cb;
    cb(H.initialUser);
    return () => {};
  },
}));

vi.mock("../services/firebaseClient", () => ({
  authClient: H.AUTH_CLIENT,
  firebaseConfigured: true,
  firestoreDb: { __fake: "firestore" },
  // LOW-END-1 (L5): signInWithGoogle hands signInWithPopup the on-demand resolver.
  getPopupRedirectResolver: () => ({ __fake: "popup-resolver" }),
}));
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/studentCloudStore", () => ({ ensureLearnerCloudBaseline: vi.fn(async () => {}) }));
vi.mock("../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../services/mistakeLogService", () => ({ hydrateMistakeLogsFromCloud: vi.fn(async () => {}) }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return { ...actual, activateTrial: vi.fn((uid: string) => actual.activateTrial(uid)) };
});
vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});

import { AuthProvider, useAuth } from "./AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import * as svc from "../services/subscriptionService";

const activate = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;
const DAY = 24 * 60 * 60 * 1000;

let ctx: ReturnType<typeof useAuth> | null = null;
function Probe() {
  ctx = useAuth();
  const sub = useSubscription();
  return (
    <div data-testid="probe">
      {`uid=${ctx.user?.uid ?? "none"}|tier=${sub.tier}|hydrated=${sub.hydrated}|premium=${sub.isPremium}`}
    </div>
  );
}
function mount() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

/** Fresh uid per test: newAccountTrial's once-per-uid set is module state. */
let seq = 0;
function freshUser(): FakeUser {
  seq += 1;
  return { uid: `new-${seq}-${Math.floor(Date.now() / 1000)}`, email: null, phoneNumber: null, displayName: null };
}
const cred = (user: FakeUser, isNewUser: boolean): FakeCred => ({ user, _info: { isNewUser } });

const trialStarts = () => H.track.mock.calls.filter(([n]) => n === "trial_start").length;
const docOf = (uid: string) => H.store.get(`subscriptions/${uid}`);
const cacheOf = (uid: string) => JSON.parse(localStorage.getItem(`lazytopper.subscription.v1:${uid}`) ?? "null");
const probeText = () => screen.getByTestId("probe").textContent ?? "";

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

/** The cloud trial the way the trial write leaves it. */
function expectCloudTrial(uid: string) {
  const d = docOf(uid);
  expect(d).toBeDefined();
  expect(d!.tier).toBe("trial");
  expect(d!.plan).toBe("trial_7day");
  const start = d!.trialStartDate as { toDate?: () => Date };
  expect(typeof start?.toDate).toBe("function"); // a server Timestamp, not a client string
  expect(Math.abs(start.toDate!().getTime() - Date.now())).toBeLessThan(60_000);
  return start.toDate!().getTime();
}

beforeEach(() => {
  localStorage.clear();
  H.store.clear();
  H.log.length = 0;
  H.setDocFails = false;
  H.getDocFails = false;
  H.initialUser = null;
  H.nextCred = null;
  H.AUTH_CLIENT.currentUser = null;
  H.track.mockReset();
  activate.mockClear();
  ctx = null;
});
afterEach(() => cleanup());

describe("T1 — every NEW-account door starts the trial once, and trial_start fires once", () => {
  it("Google popup, isNewUser → activateTrial once, the cloud doc carries the trial, trial_start ×1", async () => {
    const u = freshUser();
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await waitFor(() => expect(probeText()).toBe(`uid=${u.uid}|tier=trial|hydrated=true|premium=true`));
    expect(activate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith(u.uid);
    expect(trialStarts()).toBe(1);
    expectCloudTrial(u.uid);
    expect(cacheOf(u.uid).tier).toBe("trial");
  });

  it("email/password sign-up (createUser) → the trial once, trial_start ×1", async () => {
    const u = { ...freshUser(), email: "x@example.com" };
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.signUpWithEmailPassword("x@example.com", "secret1", "Asha");
    });
    await waitFor(() => expect(probeText()).toContain("tier=trial|hydrated=true"));
    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
    expectCloudTrial(u.uid);
  });

  it("phone OTP, isNewUser → the trial once, trial_start ×1", async () => {
    const u = { ...freshUser(), phoneNumber: "+919000000001" };
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.sendPhoneOtp("+919000000001", "rc");
    });
    await act(async () => {
      await ctx!.verifyPhoneOtp("123456", "Ravi");
    });
    await waitFor(() => expect(probeText()).toContain("tier=trial|hydrated=true"));
    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
    expectCloudTrial(u.uid);
  });
});

describe("T1 — logins and other non-sign-up paths NEVER start a trial", () => {
  it("Google popup for a RETURNING account (isNewUser false) → nothing written, no trial_start", async () => {
    const u = freshUser();
    mount();
    H.nextCred = cred(u, false);
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await waitFor(() => expect(probeText()).toBe(`uid=${u.uid}|tier=free|hydrated=true|premium=false`));
    await settle();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
    expect(docOf(u.uid)).toBeUndefined();
    expect(H.log.filter((l) => l.startsWith("set:"))).toEqual([]);
  });

  it("email/password SIGN-IN → nothing", async () => {
    const u = freshUser();
    mount();
    H.nextCred = cred(u, false);
    await act(async () => {
      await ctx!.signInWithEmailPassword("x@example.com", "secret1");
    });
    await waitFor(() => expect(probeText()).toContain("hydrated=true"));
    await settle();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
    expect(docOf(u.uid)).toBeUndefined();
  });

  it("phone OTP for a RETURNING account → nothing", async () => {
    const u = freshUser();
    mount();
    H.nextCred = cred(u, false);
    await act(async () => {
      await ctx!.sendPhoneOtp("+919000000002", "rc");
    });
    await act(async () => {
      await ctx!.verifyPhoneOtp("123456");
    });
    await waitFor(() => expect(probeText()).toContain("hydrated=true"));
    await settle();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });

  it("phone LINKING an existing account → nothing (even if the link credential claims isNewUser)", async () => {
    const u = freshUser();
    H.initialUser = u; // already signed in (auth restore)
    H.AUTH_CLIENT.currentUser = u;
    mount();
    await waitFor(() => expect(probeText()).toContain("hydrated=true"));
    await act(async () => {
      await ctx!.sendLinkPhoneOtp("+919000000003", "rc");
    });
    await act(async () => {
      await ctx!.confirmLinkPhoneOtp("123456");
    });
    await settle();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
    expect(docOf(u.uid)).toBeUndefined();
  });

  it("an auth-state RESTORE (reload of an existing, never-trialled account) → nothing", async () => {
    const u = freshUser();
    H.initialUser = u;
    mount();
    await waitFor(() => expect(probeText()).toBe(`uid=${u.uid}|tier=free|hydrated=true|premium=false`));
    await settle();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
    expect(docOf(u.uid)).toBeUndefined();
  });
});

describe("T1 once — reload, remount and a second auth event never start it again", () => {
  it("sign-up, then an auth re-emit, then a full reload (and a reload with the cache cleared)", async () => {
    const u = freshUser();
    const first = mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await waitFor(() => expect(probeText()).toContain("tier=trial|hydrated=true"));
    const startMs = expectCloudTrial(u.uid);

    // A second auth event for the same user (token refresh / re-emit).
    await act(async () => {
      H.authCb?.(u);
    });
    await settle();

    // A reload: fresh provider, the SDK restores the session. No sign-in call runs.
    first.unmount();
    H.initialUser = u;
    mount();
    await waitFor(() => expect(probeText()).toBe(`uid=${u.uid}|tier=trial|hydrated=true|premium=true`));

    // Another device / cleared cache: the cloud alone still says trial.
    cleanup();
    localStorage.clear();
    mount();
    await waitFor(() => expect(probeText()).toBe(`uid=${u.uid}|tier=trial|hydrated=true|premium=true`));

    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
    expect(expectCloudTrial(u.uid)).toBe(startMs); // the start never moved
  });

  it("the same new uid through the door twice in one session → still exactly one start", async () => {
    const u = freshUser();
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await settle();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
  });
});

describe("activateTrial's guards stay the final word — trial_start only when it STARTED", () => {
  it("a previous trial on this device (expired) → refused, no trial_start, the stored start untouched", async () => {
    const u = freshUser();
    const oldStart = new Date(Date.now() - 20 * DAY).toISOString();
    localStorage.setItem(
      `lazytopper.subscription.v1:${u.uid}`,
      JSON.stringify({ tier: "free", plan: "trial_7day", trialStartDate: oldStart, trialEndDate: null, premiumSince: null }),
    );
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await settle();
    expect(activate).toHaveBeenCalledTimes(1); // called — and its guard refused
    expect(trialStarts()).toBe(0);
    expect(docOf(u.uid)).toBeUndefined(); // nothing written
  });

  it("premium → refused, no trial_start", async () => {
    const u = freshUser();
    localStorage.setItem(
      `lazytopper.subscription.v1:${u.uid}`,
      JSON.stringify({ tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: new Date().toISOString() }),
    );
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await ctx!.signInWithGoogle();
    });
    await settle();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(0);
    expect(docOf(u.uid)).toBeUndefined();
  });
});

describe("a failure never blocks or delays sign-in", () => {
  it("activateTrial throws → the sign-in still resolves and the student is signed in; no trial_start", async () => {
    const u = freshUser();
    activate.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await expect(ctx!.signInWithGoogle()).resolves.toBeUndefined();
    });
    await waitFor(() => expect(probeText()).toContain(`uid=${u.uid}`));
    expect(trialStarts()).toBe(0);
  });

  it("offline (the write and the read both fail) → sign-in resolves; the optimistic trial is kept, never downgraded", async () => {
    const u = freshUser();
    H.setDocFails = true;
    H.getDocFails = true;
    mount();
    H.nextCred = cred(u, true);
    await act(async () => {
      await expect(ctx!.signInWithGoogle()).resolves.toBeUndefined();
    });
    await waitFor(() => expect(probeText()).toBe(`uid=${u.uid}|tier=trial|hydrated=true|premium=true`));
    expect(trialStarts()).toBe(1);
  });
});

describe("D6 — the auto-started trial SURVIVES the first hydration of the new uid", () => {
  it("the trial write is queued BEFORE the first cloud read of the new uid, on every door", async () => {
    for (const door of ["google", "email", "phone"] as const) {
      cleanup();
      H.log.length = 0;
      const u = freshUser();
      mount();
      H.nextCred = cred(u, true);
      await act(async () => {
        if (door === "google") await ctx!.signInWithGoogle();
        if (door === "email") await ctx!.signUpWithEmailPassword("d6@example.com", "secret1", "D");
        if (door === "phone") {
          await ctx!.sendPhoneOtp("+919000000009", "rc");
          await ctx!.verifyPhoneOtp("123456", "D");
        }
      });
      await waitFor(() => expect(probeText()).toContain("tier=trial|hydrated=true"));
      const path = `subscriptions/${u.uid}`;
      const firstSet = H.log.indexOf(`set:${path}`);
      const firstGet = H.log.indexOf(`get:${path}`);
      expect(firstSet, `${door}: trial write`).toBeGreaterThanOrEqual(0);
      expect(firstGet, `${door}: a hydration read ran`).toBeGreaterThanOrEqual(0);
      expect(firstSet, `${door}: write before first read`).toBeLessThan(firstGet);
      // ...so every hydration saw the trial: the cache and the cloud agree, no downgrade.
      expect(cacheOf(u.uid).tier).toBe("trial");
      expectCloudTrial(u.uid);
      // and no hydration wrote a downgrade back (only the one trial write exists).
      expect(H.log.filter((l) => l === `set:${path}`)).toHaveLength(1);
    }
  });

  it("CONTROL — a read issued BEFORE the trial write answers 'absent', which hydration turns into FREE (the fake can fail)", async () => {
    const u = freshUser();
    const got = await svc.hydrateSubscriptionFromCloud(u.uid); // no cloud doc yet
    expect(got.tier).toBe("free");
    expect(got.trialStartDate).toBeNull();
    expect(cacheOf(u.uid).tier).toBe("free");
    expect(docOf(u.uid)).toBeUndefined(); // absent writes nothing
  });
});
