import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

/**
 * PREVIEW-1 — the preview is DEVICE state: the owner sets it as admin, signs out, signs in as a
 * test student, and it must still be there. Driven through the REAL AuthProvider and its REAL
 * `logout` (Firebase mocked at the SDK edge, the MobileAccountMenu.persistedSession pattern).
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
vi.mock("../../services/firebaseClient", () => ({ authClient: {}, firebaseConfigured: true }));
vi.mock("../../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../../services/studentCloudStore", () => ({ ensureLearnerCloudBaseline: vi.fn(async () => {}) }));
vi.mock("../../services/mistakeLogService", () => ({ hydrateMistakeLogsFromCloud: vi.fn(async () => {}) }));
vi.mock("../../services/dbSyncService", () => ({ restoreFromDB: vi.fn(async () => {}) }));
vi.mock("../../services/learnerAccountService", () => ({ ensureLearnerAccountMetadata: vi.fn(async () => {}) }));

import { AuthProvider, useAuth } from "../../context/AuthContext";
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests, resolveGuideVariant } from "./guideVariant";

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
  auth = null;
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
});

describe("PREVIEW-1 · the preview survives sign-out", () => {
  it("★★ set as admin → logout() → sign in as another account: the key is intact and that account gets the previewed arm", async () => {
    __setGuideAbForTests(true);
    render(
      <AuthProvider>
        <Grab />
      </AuthProvider>,
    );
    await act(async () => fb.cb?.(user("admin-uid")));
    expect(auth!.user?.uid).toBe("admin-uid");

    const value = JSON.stringify({ arm: "guide", until: 4_102_444_800_000 }); // far future, fixed
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, value);
    window.localStorage.setItem("lazytopper.auth.local.v1", JSON.stringify({ uid: "admin-uid" }));

    await act(async () => {
      await auth!.logout();
    });
    expect(auth!.user).toBeNull();
    // The sign-out really cleared what it clears...
    expect(window.localStorage.getItem("lazytopper.auth.local.v1")).toBeNull();
    // ...and NOT the preview.
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBe(value);

    await act(async () => fb.cb?.(user("test-student-uid")));
    expect(auth!.user?.uid).toBe("test-student-uid");
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBe(value);
    expect(resolveGuideVariant("test-student-uid")).toBe("guide");
  });
});
