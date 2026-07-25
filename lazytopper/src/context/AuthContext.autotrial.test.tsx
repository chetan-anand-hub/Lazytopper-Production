import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

// [FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT] — the SECOND write site. AuthContext's post-login
// hydration used to call activateTrial(uid) UNCONDITIONALLY inside
// hydrateSubscriptionFromCloud(uid).then(...), starting every student's 7-day trial on
// login. This test drives a signed-in (non-local) firebase user so the real post-login
// hydration effect fires, then asserts activateTrial is never called — the READ stays,
// the WRITE is gone. Restoring the .then(activateTrial) turns this red (mutation-verified),
// independently of the useSubscription hook test.

const FB_USER = { uid: "u1", email: "a@b.com", phoneNumber: null, displayName: "A" };

// Emit a firebase user immediately so `firebaseUser` is set and the hydration effect runs.
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    render() {}
  },
  signInWithPhoneNumber: vi.fn(),
  onAuthStateChanged: (_client: unknown, cb: (u: unknown) => void) => {
    cb(FB_USER);
    return () => {};
  },
}));
vi.mock("../services/firebaseClient", () => ({ authClient: {}, firebaseConfigured: true }));

// All post-login cloud hydration stubbed to resolve — no real firestore / IndexedDB.
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/learnerAccountService", () => ({ ensureLearnerAccountMetadata: vi.fn(async () => {}) }));
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

import { AuthProvider } from "./AuthContext";
import * as svc from "../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activate = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  hydrate.mockClear();
  activate.mockClear();
});
afterEach(() => cleanup());

describe("AuthContext — post-login hydration does not auto-activate a trial", () => {
  it("hydrates subscription on login but NEVER calls activateTrial", async () => {
    render(
      <AuthProvider>
        <div>ok</div>
      </AuthProvider>,
    );
    // The hydration read is load-bearing and must still fire.
    await waitFor(() => expect(hydrate).toHaveBeenCalledWith("u1"));
    // Give any (removed) .then(activateTrial) microtask/macrotask a real chance to run,
    // so the mutation is genuinely caught rather than raced past.
    await new Promise((r) => setTimeout(r, 30));
    expect(activate).not.toHaveBeenCalled();
  });
});
