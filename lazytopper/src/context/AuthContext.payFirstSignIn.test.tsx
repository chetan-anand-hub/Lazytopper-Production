/**
 * PAY-ACCOUNT-1 (review MED 3) — an account made at payment has no Firebase "new user" moment (isNewUser is false at its
 * first sign-in), so the server's once-only `firstSignIn` drives the SAME sign-up signals a normal sign-up fires: sign_up,
 * the visit source, the new-account landing. Once; never for an existing account.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

const FB_USER = {
  uid: "pay-0123456789abcdef01234567",
  email: null,
  phoneNumber: "+919876543210",
  displayName: null,
  providerData: [{ providerId: "phone" }],
  getIdToken: async () => "tok",
};

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    render() {}
  },
  signInWithPhoneNumber: vi.fn(),
  linkWithPhoneNumber: vi.fn(async () => ({ confirm: vi.fn() })),
  onAuthStateChanged: (_client: unknown, cb: (u: unknown) => void) => {
    cb(FB_USER);
    return () => {};
  },
}));

// Firestore spied at the SDK boundary: any `users` access from anything still in the
// post-login graph is observable here.
//
// ★ `vi.hoisted` (the reason the deleted learnerAccountService.noUsersWrite.test.ts gave):
// `vi.mock` hoists above plain `const`, so once anything in the graph really imports
// `firebase/firestore` the factory would read these bindings in their temporal dead zone.
const { doc, setDoc, getDoc } = vi.hoisted(() => ({
  doc: vi.fn(() => ({ __ref: true })),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => false })),
}));
vi.mock("firebase/firestore", () => ({
  doc,
  setDoc,
  getDoc,
  collection: vi.fn(() => ({ __col: true })),
}));

vi.mock("../services/firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "tok" } },
  firebaseConfigured: true,
  firestoreDb: { __db: true },
}));

// Post-login cloud hydration stubbed to resolve — no real firestore / IndexedDB.
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/studentCloudStore", () => ({ ensureLearnerCloudBaseline: vi.fn(async () => {}) }));
vi.mock("../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../services/mistakeLogService", () => ({ hydrateMistakeLogsFromCloud: vi.fn(async () => {}) }));
vi.mock("../services/subscriptionService", () => ({
  hydrateSubscriptionFromCloud: vi.fn(async () => ({
    tier: "free",
    plan: "none",
    trialStartDate: null,
    trialEndDate: null,
    premiumSince: null,
  })),
  activateTrial: vi.fn(),
}));


// PAY-ACCOUNT-1: the guest-pay client (the claim) and the sign-up signals, observed.
const gp = vi.hoisted(() => ({
  first: null as { trialStarted: boolean } | null,
  isGuestPayClientEnabled: () => true,
  claimOncePerSession: vi.fn(async () => []),
  takeFirstSignIn: vi.fn((_uid: string) => null as { trialStarted: boolean } | null),
}));
vi.mock("../services/guestPay", () => gp);
const sig = vi.hoisted(() => ({ trackSignUp: vi.fn(), sendVisitSourceOnSignUp: vi.fn(), markNewAccountLanding: vi.fn() }));
vi.mock("../analytics/analytics", async (orig) => ({ ...(await orig<typeof import("../analytics/analytics")>()), trackSignUp: sig.trackSignUp, trackSignUpIfNew: vi.fn() }));
vi.mock("../analytics/visitSource", () => ({ sendVisitSourceOnSignUp: sig.sendVisitSourceOnSignUp, sendVisitSourceIfNewUser: vi.fn() }));
vi.mock("../services/newAccountLanding", () => ({ markNewAccountLanding: sig.markNewAccountLanding, markNewAccountLandingIfNew: vi.fn() }));

import { AuthProvider } from "./AuthContext";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PAY-ACCOUNT-1 · the first sign-in of an account made at payment counts as its sign-up", () => {
  it("firstSignIn (taken once) -> sign_up, the visit source and the new-account landing, ONCE", async () => {
    let first: { trialStarted: boolean } | null = { trialStarted: true };
    gp.takeFirstSignIn.mockImplementation(() => {
      const t = first;
      first = null;
      return t;
    });
    const view = render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(gp.claimOncePerSession).toHaveBeenCalledWith(FB_USER.uid));
    await waitFor(() => expect(sig.trackSignUp).toHaveBeenCalledTimes(1));
    expect(gp.takeFirstSignIn).toHaveBeenCalledWith(FB_USER.uid);
    expect(sig.sendVisitSourceOnSignUp).toHaveBeenCalledTimes(1);
    expect(sig.markNewAccountLanding).toHaveBeenCalledTimes(1);
    // A remount (a reload in the same tab): nothing left to take -> nothing counted again.
    view.unmount();
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(gp.claimOncePerSession).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(sig.trackSignUp).toHaveBeenCalledTimes(1);
  });

  it("no firstSignIn (an existing account, or firstSignIn false): no sign-up is counted", async () => {
    gp.takeFirstSignIn.mockImplementation(() => null);
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(gp.takeFirstSignIn).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(sig.trackSignUp).not.toHaveBeenCalled();
    expect(sig.markNewAccountLanding).not.toHaveBeenCalled();
    expect(sig.sendVisitSourceOnSignUp).not.toHaveBeenCalled();
  });
});
