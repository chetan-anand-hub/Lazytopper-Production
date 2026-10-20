import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

/**
 * GUIDE-PUBLIC-1 (review F6) — the signed-out visitor's public-peek arm is DEVICE state: drawn
 * once, it survives a sign-in and a sign-out. Driven through the REAL AuthProvider and its REAL
 * `logout` (Firebase mocked at the SDK edge — PREVIEW-1's guidePreview.signOut.test.tsx pattern).
 */
const fb = vi.hoisted(() => ({ cb: null as null | ((u: unknown) => void) }));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: (_client: unknown, cb: (u: unknown) => void) => {
    fb.cb = cb;
    return () => {
      fb.cb = null;
    };
  },
  signOut: vi.fn(async () => {
    fb.cb?.(null);
  }),
  RecaptchaVerifier: class {},
  signInWithPhoneNumber: vi.fn(),
  linkWithPhoneNumber: vi.fn(),
}));
vi.mock("../../../services/firebaseClient", () => ({ authClient: {}, firebaseConfigured: true }));
vi.mock("../../../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../../../services/studentCloudStore", () => ({ ensureLearnerCloudBaseline: vi.fn(async () => {}) }));
vi.mock("../../../services/mistakeLogService", () => ({ hydrateMistakeLogsFromCloud: vi.fn(async () => {}) }));
vi.mock("../../../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../../../services/learnerAccountService", () => ({ ensureLearnerAccountMetadata: vi.fn(async () => {}) }));

import { AuthProvider, useAuth } from "../../../context/AuthContext";
import { GUIDE_PUBLIC_ARM_KEY, __resetPublicArmForTests, ensurePublicArm, readPublicArm } from "./publicPeekModel";

const user = (uid: string) => ({
  uid,
  email: `${uid}@example.com`,
  phoneNumber: null,
  displayName: null,
  isAnonymous: false,
  emailVerified: true,
  providerData: [{ providerId: "password" }],
});

let auth: ReturnType<typeof useAuth> | null = null;
function Grab() {
  auth = useAuth();
  return null;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetPublicArmForTests();
  auth = null;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GUIDE-PUBLIC-1 · the device arm survives sign-in and the real sign-out", () => {
  it("★★ drawn signed out → sign in → logout(): lazytopper.guidePublicArm is intact and is the same arm", async () => {
    render(
      <AuthProvider>
        <Grab />
      </AuthProvider>,
    );
    await act(async () => fb.cb?.(null)); // a signed-out visitor
    expect(auth!.user).toBeNull();

    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(<T extends ArrayBufferView | null>(a: T): T => {
      (a as unknown as Uint8Array)[0] = 7;
      return a;
    });
    expect(ensurePublicArm()).toEqual({ arm: "guide", fresh: true });

    await act(async () => fb.cb?.(user("student-uid")));
    expect(auth!.user?.uid).toBe("student-uid");
    window.localStorage.setItem("lazytopper.auth.local.v1", JSON.stringify({ uid: "student-uid" }));

    await act(async () => {
      await auth!.logout();
    });
    expect(auth!.user).toBeNull();
    // The sign-out really cleared what it clears...
    expect(window.localStorage.getItem("lazytopper.auth.local.v1")).toBeNull();
    // ...and NOT the device arm: the same visitor stays in the same group.
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("guide");
    __resetPublicArmForTests(); // a new page load
    expect(readPublicArm()).toBe("guide");
    expect(ensurePublicArm()).toEqual({ arm: "guide", fresh: false }); // never redrawn
  });
});
