/**
 * AuthContext — sign-in completes, and the post-login effect writes no `users` doc.
 *
 * ★★ THE REAL RISK OF USERS-1 IS NOT THE DELETION, IT IS THE AUTH SPINE IT SAT ON.
 * `ensureLearnerAccountMetadata(...)` used to be the second element of the post-login
 * `Promise.allSettled([...])`. USERS-1 removed it because it mirrored a child's direct
 * identifiers into a Firestore `users/{uid}` doc that was never once written (undeclared
 * in firestore.rules) and never read. This suite drives a signed-in, non-local firebase
 * user so the REAL hydration effect runs, then asserts:
 *
 *   1. the effect still runs and the other hydration work is untouched  (CONTROL)
 *   2. sign-in completes and the context exposes the signed-in user     (the risk)
 *   3. ensureLearnerAccountMetadata is never invoked                    (the unwiring)
 *   4. nothing in the effect touches a `users` Firestore path           (the invariant)
 *
 * ★ Assertion 1 is load-bearing. Without it, 3 and 4 pass on a tree where the effect
 * never fired at all, which is the classic way this kind of test asserts nothing.
 * Restoring the call site turns assertion 3 RED — mutation-verified.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

const FB_USER = {
  uid: "u1",
  email: "a@b.com",
  phoneNumber: null,
  displayName: "A",
  providerData: [{ providerId: "password" }],
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
// ★ `vi.hoisted` for the same reason as learnerAccountService.noUsersWrite.test.ts:
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
  authClient: {},
  firebaseConfigured: true,
  firestoreDb: { __db: true },
}));

// Post-login cloud hydration stubbed to resolve — no real firestore / IndexedDB.
vi.mock("../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../services/learnerAccountService", () => ({
  ensureLearnerAccountMetadata: vi.fn(async () => {}),
}));
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

import { AuthProvider, useAuth } from "./AuthContext";
import * as accountSvc from "../services/learnerAccountService";
import * as dbSync from "../services/dbSyncService";
import * as cloudStore from "../services/studentCloudStore";

const ensureMeta = accountSvc.ensureLearnerAccountMetadata as unknown as ReturnType<typeof vi.fn>;
const restore = dbSync.restoreFromDB as unknown as ReturnType<typeof vi.fn>;
const baseline = cloudStore.ensureLearnerCloudBaseline as unknown as ReturnType<typeof vi.fn>;

function Probe() {
  const { user } = useAuth();
  return <div data-testid="uid">{user ? user.uid : "anonymous"}</div>;
}

beforeEach(() => {
  localStorage.clear();
  ensureMeta.mockClear();
  restore.mockClear();
  baseline.mockClear();
  doc.mockClear();
  setDoc.mockClear();
  getDoc.mockClear();
});
afterEach(() => cleanup());

describe("AuthContext — post-login hydration writes no `users` document", () => {
  it("★★ signs in, runs the hydration effect, and never syncs account metadata", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    // 1. CONTROL — the post-login effect really fired. Two independent members of the
    //    same Promise.allSettled, so this is not one flaky stub.
    await waitFor(() => expect(restore).toHaveBeenCalledWith("u1"));
    await waitFor(() => expect(baseline).toHaveBeenCalledWith("u1"));

    // 2. THE RISK — sign-in completed and the context exposes the signed-in student.
    await waitFor(() => expect(screen.getByTestId("uid").textContent).toBe("u1"));

    // Give any restored call a real chance to run rather than racing past it.
    await new Promise((r) => setTimeout(r, 30));

    // 3. THE UNWIRING — the retired account-metadata sync is not invoked at all.
    expect(ensureMeta).not.toHaveBeenCalled();

    // 4. THE INVARIANT — no Firestore path named `users` was touched, and nothing was
    //    written, by anything still in the post-login graph.
    const touched = doc.mock.calls.flat().map((a) => String(a));
    expect(touched.filter((a) => a.includes("users"))).toEqual([]);
    expect(setDoc).not.toHaveBeenCalled();
  });
});
