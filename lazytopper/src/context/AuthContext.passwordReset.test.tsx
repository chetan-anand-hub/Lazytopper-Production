import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

/**
 * AuthContext — `sendPasswordReset` (Lane H-3).
 *
 * Two jobs:
 *  (a) the new method really delegates to Firebase's `sendPasswordResetEmail`, and
 *  (b) the addition is PURELY ADDITIVE — no existing method's behaviour moved, and no
 *      key disappeared from the context value. `AuthContext` is shared infra: a silent
 *      change here breaks sign-in for every student, and typecheck alone would not
 *      notice a rewired call.
 */

// `vi.mock` factories are hoisted above the module body, so anything they close over
// must be created with `vi.hoisted` or it is still in the TDZ when the factory runs.
const H = vi.hoisted(() => ({
  AUTH_CLIENT: { __brand: "auth-client" } as Record<string, unknown>,
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

const {
  AUTH_CLIENT,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} = H;

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: H.signInWithPopup,
  signInWithEmailAndPassword: H.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: H.createUserWithEmailAndPassword,
  sendPasswordResetEmail: H.sendPasswordResetEmail,
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    async render() {}
  },
  signInWithPhoneNumber: vi.fn(),
  linkWithPhoneNumber: vi.fn(async () => ({ confirm: vi.fn() })),
  onAuthStateChanged: (_client: unknown, cb: (u: unknown) => void) => {
    cb(null);
    return () => {};
  },
}));
vi.mock("../services/firebaseClient", () => ({
  authClient: H.AUTH_CLIENT,
  firebaseConfigured: true,
}));
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/learnerAccountService", () => ({
  ensureLearnerAccountMetadata: vi.fn(async () => {}),
}));
vi.mock("../services/studentCloudStore", () => ({
  ensureLearnerCloudBaseline: vi.fn(async () => {}),
}));
vi.mock("../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../services/mistakeLogService", () => ({
  hydrateMistakeLogsFromCloud: vi.fn(async () => {}),
}));
vi.mock("../services/subscriptionService", () => ({
  hydrateSubscriptionFromCloud: vi.fn(async () => ({})),
  activateTrial: vi.fn(),
}));

import { AuthProvider, useAuth } from "./AuthContext";

type Ctx = ReturnType<typeof useAuth>;

let ctx: Ctx | null = null;

function Probe() {
  ctx = useAuth();
  return null;
}

function mountProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

/**
 * The context surface as it stood BEFORE this lane. Spelled out literally so that a
 * removal or rename is caught, not just a type error.
 */
const PRE_EXISTING_KEYS = [
  "user",
  "loading",
  "firebaseReady",
  "phoneRecaptchaStatus",
  "mistakeLogsHydrated",
  "getToken",
  "signInWithGoogle",
  "signInWithEmailPassword",
  "signUpWithEmailPassword",
  "initPhoneRecaptcha",
  "sendPhoneOtp",
  "verifyPhoneOtp",
  // ★ ADDED BY LANE F (account linking), as a REVIEWED DECISION.
  //
  // This assertion pins the key set by EXACT equality, so it fails on ADDITION
  // as well as removal — that is deliberate, and it is why these two lines
  // exist rather than the keys appearing silently. The choice was between
  // adding them here and avoiding new context keys entirely (as the displayName
  // re-sync did in PR-B3). Adding won because the alternative was a standalone
  // hook owning a SECOND reCAPTCHA verifier lifecycle outside AuthContext's
  // container-aware manager — reintroducing the exact bug class PR-B3 removed.
  // The verifier ref must stay single-owner.
  "sendLinkPhoneOtp",
  "confirmLinkPhoneOtp",
  "continueLocalSession",
  "logout",
] as const;

beforeEach(() => {
  localStorage.clear();
  ctx = null;
  sendPasswordResetEmail.mockReset();
  sendPasswordResetEmail.mockResolvedValue(undefined);
  signInWithEmailAndPassword.mockReset();
  signInWithEmailAndPassword.mockResolvedValue({});
  createUserWithEmailAndPassword.mockReset();
  createUserWithEmailAndPassword.mockResolvedValue({ user: null });
});
afterEach(cleanup);

describe("AuthContext.sendPasswordReset", () => {
  it("delegates to Firebase sendPasswordResetEmail with the auth client and the address", async () => {
    mountProvider();
    await waitFor(() => expect(ctx).not.toBeNull());

    await ctx!.sendPasswordReset("student@example.com");

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(AUTH_CLIENT, "student@example.com");
  });

  it("reports the real Firebase failure to its caller (the anti-enumeration swallow lives at the surface, not here)", async () => {
    mountProvider();
    await waitFor(() => expect(ctx).not.toBeNull());

    sendPasswordResetEmail.mockRejectedValue(
      Object.assign(new Error("no user"), { code: "auth/user-not-found" }),
    );

    await expect(ctx!.sendPasswordReset("nobody@example.com")).rejects.toMatchObject({
      code: "auth/user-not-found",
    });
  });
});

describe("AuthContext — the addition is purely additive (test 4)", () => {
  it("keeps every pre-existing method and adds exactly sendPasswordReset", async () => {
    mountProvider();
    await waitFor(() => expect(ctx).not.toBeNull());

    for (const key of PRE_EXISTING_KEYS) {
      expect(Object.keys(ctx!)).toContain(key);
    }
    expect(Object.keys(ctx!)).toContain("sendPasswordReset");
    expect(Object.keys(ctx!).sort()).toEqual(
      [...PRE_EXISTING_KEYS, "sendPasswordReset"].sort(),
    );
  });

  it("signInWithEmailPassword still calls signInWithEmailAndPassword unchanged", async () => {
    mountProvider();
    await waitFor(() => expect(ctx).not.toBeNull());

    await ctx!.signInWithEmailPassword("a@b.com", "hunter2");

    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(AUTH_CLIENT, "a@b.com", "hunter2");
    // The sign-in path must never have been rerouted through the reset call.
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("signUpWithEmailPassword still calls createUserWithEmailAndPassword unchanged", async () => {
    mountProvider();
    await waitFor(() => expect(ctx).not.toBeNull());

    await ctx!.signUpWithEmailPassword("new@b.com", "hunter2");

    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      AUTH_CLIENT,
      "new@b.com",
      "hunter2",
    );
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
