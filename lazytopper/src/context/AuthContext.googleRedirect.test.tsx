import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

/**
 * GOOGLE-REDIRECT-1 — the provider half of the full-page Google redirect.
 *
 *  - signInWithGoogle() with no options is the popup, exactly as before; { flow: "redirect" } calls
 *    signInWithRedirect with the shared resolver and never the popup.
 *  - getRedirectResult is read ONLY when a sign-in intent exists, and only once per page load.
 *  - a result runs the SAME credential steps as the popup (sign_up count, visit source, the
 *    isNewUser-gated trial, the new-account landing mark): a returning login starts no trial.
 *  - "no result" (Back on Google's page) and an error clear the intent and report the outcome.
 */
const H = vi.hoisted(() => ({
  AUTH_CLIENT: { __brand: "auth-client" } as Record<string, unknown>,
  RESOLVER: { __brand: "resolver" },
  redirectResult: null as unknown,
  redirectRejects: null as unknown,
  startTrialIfNewAccount: vi.fn(),
  trackSignUpIfNew: vi.fn(),
  sendVisitSourceIfNewUser: vi.fn(),
  markNewAccountLandingIfNew: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: vi.fn(async () => ({ user: { uid: "p1" } })),
  signInWithRedirect: vi.fn(async () => {}),
  getRedirectResult: vi.fn(async () => {
    if (H.redirectRejects) throw H.redirectRejects;
    return H.redirectResult;
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    async render() {}
  },
  signInWithPhoneNumber: vi.fn(),
  linkWithPhoneNumber: vi.fn(),
  onAuthStateChanged: (_c: unknown, cb: (u: unknown) => void) => {
    cb(null);
    return () => {};
  },
}));
vi.mock("../services/firebaseClient", () => ({
  authClient: H.AUTH_CLIENT,
  firebaseConfigured: true,
  getPopupRedirectResolver: () => H.RESOLVER,
}));
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/studentCloudStore", () => ({ ensureLearnerCloudBaseline: vi.fn(async () => {}) }));
vi.mock("../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../services/mistakeLogService", () => ({ hydrateMistakeLogsFromCloud: vi.fn(async () => {}) }));
vi.mock("../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../services/newAccountTrial", () => ({
  startTrialIfNewAccount: H.startTrialIfNewAccount,
  startTrialForNewAccount: vi.fn(),
}));
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackSignUpIfNew: H.trackSignUpIfNew,
  trackSignUp: vi.fn(),
}));
vi.mock("../analytics/visitSource", () => ({
  sendVisitSourceIfNewUser: H.sendVisitSourceIfNewUser,
  sendVisitSourceOnSignUp: vi.fn(),
}));
vi.mock("../services/newAccountLanding", () => ({
  markNewAccountLandingIfNew: H.markNewAccountLandingIfNew,
  markNewAccountLanding: vi.fn(),
}));
vi.mock("../services/sessionRecordsOutbox", () => ({ startOutboxSync: () => undefined }));
vi.mock("../components/common/SaveStatusToast", () => ({ default: () => null }));

import * as fbAuth from "firebase/auth";
import { AuthProvider, useAuth, __resetRedirectResultReadForTests } from "./AuthContext";
import {
  hasSigninIntent,
  peekRedirectOutcome,
  resetRedirectOutcome,
  saveSigninIntent,
  type RedirectOutcome,
} from "../services/signinIntent";

let ctx: ReturnType<typeof useAuth> | null = null;
function Probe() {
  ctx = useAuth();
  return null;
}
const mount = () => render(<AuthProvider><Probe /></AuthProvider>);

function writeIntent() {
  expect(
    saveSigninIntent({
      target: "/practice-hub",
      explicitTarget: "/practice-hub",
      from: null,
      startTrial: false,
      guestPayClaim: false,
      guestPayExisting: false,
    }),
  ).toBe(true);
}

beforeEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  ctx = null;
  H.redirectResult = null;
  H.redirectRejects = null;
  vi.clearAllMocks();
  __resetRedirectResultReadForTests();
  resetRedirectOutcome();
});

const outcome = () => peekRedirectOutcome() as RedirectOutcome | null;

describe("signInWithGoogle — popup unchanged, redirect on request", () => {
  it("no options: signInWithPopup with the shared resolver, never signInWithRedirect", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    await ctx!.signInWithGoogle();
    expect(fbAuth.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fbAuth.signInWithPopup).mock.calls[0][2]).toBe(H.RESOLVER);
    expect(fbAuth.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("{ flow: 'redirect' }: signInWithRedirect with the shared resolver, never the popup, no credential steps yet", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    await ctx!.signInWithGoogle({ flow: "redirect" });
    expect(fbAuth.signInWithRedirect).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fbAuth.signInWithRedirect).mock.calls[0][0]).toBe(H.AUTH_CLIENT);
    expect(vi.mocked(fbAuth.signInWithRedirect).mock.calls[0][2]).toBe(H.RESOLVER);
    expect(fbAuth.signInWithPopup).not.toHaveBeenCalled();
    expect(H.startTrialIfNewAccount).not.toHaveBeenCalled();
  });

  it("a throwing signInWithRedirect reaches the caller (who falls back to the popup)", async () => {
    vi.mocked(fbAuth.signInWithRedirect).mockRejectedValueOnce(Object.assign(new Error("x"), { code: "auth/web-storage-unsupported" }));
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    await expect(ctx!.signInWithGoogle({ flow: "redirect" })).rejects.toMatchObject({ code: "auth/web-storage-unsupported" });
  });
});

describe("getRedirectResult — only with an intent, only once", () => {
  it("an ordinary page load (no intent) never reads the redirect result", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    expect(fbAuth.getRedirectResult).not.toHaveBeenCalled();
    expect(outcome()).toBeNull();
  });

  it("returning student: credential steps run with the credential; the trial helper is the isNewUser-gated one", async () => {
    const cred = { user: { uid: "r1" }, _info: { isNewUser: false } };
    H.redirectResult = cred;
    writeIntent();
    mount();
    await waitFor(() => expect(outcome()).toEqual({ kind: "success" }));
    expect(fbAuth.getRedirectResult).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fbAuth.getRedirectResult).mock.calls[0][1]).toBe(H.RESOLVER);
    // Same four steps as the popup, with the same credential — the gate lives inside each helper.
    expect(H.trackSignUpIfNew).toHaveBeenCalledWith(cred);
    expect(H.sendVisitSourceIfNewUser).toHaveBeenCalledWith(cred);
    expect(H.startTrialIfNewAccount).toHaveBeenCalledTimes(1);
    expect(H.startTrialIfNewAccount).toHaveBeenCalledWith(cred);
    expect(H.markNewAccountLandingIfNew).toHaveBeenCalledWith(cred);
    expect(fbAuth.signInWithPopup).not.toHaveBeenCalled();
    // Login clears the intent after using it; the provider leaves it for Login on success.
    expect(hasSigninIntent()).toBe(true);
  });

  it("a remount (StrictMode / provider remount) does not read the result twice", async () => {
    H.redirectResult = { user: { uid: "r1" } };
    writeIntent();
    const view = mount();
    await waitFor(() => expect(outcome()).toEqual({ kind: "success" }));
    view.unmount();
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(fbAuth.getRedirectResult).toHaveBeenCalledTimes(1);
    expect(H.startTrialIfNewAccount).toHaveBeenCalledTimes(1);
  });

  it("no result (Back on Google's page): outcome none, intent cleared, no credential step", async () => {
    H.redirectResult = null;
    writeIntent();
    mount();
    await waitFor(() => expect(outcome()).toEqual({ kind: "none" }));
    expect(hasSigninIntent()).toBe(false);
    expect(H.startTrialIfNewAccount).not.toHaveBeenCalled();
    expect(H.trackSignUpIfNew).not.toHaveBeenCalled();
  });

  it("an error: outcome error carrying the error, intent cleared", async () => {
    const err = Object.assign(new Error("denied"), { code: "auth/network-request-failed" });
    H.redirectRejects = err;
    writeIntent();
    mount();
    await waitFor(() => expect(outcome()?.kind).toBe("error"));
    expect((outcome() as { error: unknown }).error).toBe(err);
    expect(hasSigninIntent()).toBe(false);
    expect(H.startTrialIfNewAccount).not.toHaveBeenCalled();
  });
});
