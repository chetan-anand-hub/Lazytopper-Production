import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * ★★ THE STATE THIS SUITE SEEDS IS THE POINT OF THE SUITE.
 *
 * `/browse` error-paged with React #310 ("Rendered more hooks than during the
 * previous render") for students who ALREADY HAD LOCAL STATE, and only for
 * them: clearing site data made it go away, and every existing test in this
 * repo starts from clean state, which is exactly why 1082 green tests shipped
 * it.
 *
 * The piece of "local state" that matters is **Firebase auth persistence**.
 * Firebase restores a persisted session from IndexedDB ASYNCHRONOUSLY, so a
 * returning student's first paint of `/browse` has `user === null` and a later
 * render of the SAME MOUNTED INSTANCE has a user. A student with cleared site
 * data never makes that transition on `/browse`: they are signed out (user
 * stays null), and after signing in they NAVIGATE to `/browse`, which mounts
 * the component with the user already present.
 *
 * `MobileAccountMenu` called `useState` for the link-phone modal AFTER
 * `if (!user) return null`, so the signed-out render used one fewer hook than
 * the signed-in one and the transition threw.
 *
 * Every case below is therefore driven through the REAL `AuthProvider` with a
 * deferred `onAuthStateChanged`, not through a mocked `useAuth` — the whole
 * defect lives in the transition, so a harness that hands the component its
 * final auth state cannot see it.
 */

type FbUser = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  providerData: { providerId: string }[];
};

const fb = vi.hoisted(() => ({
  cb: null as null | ((u: unknown) => void),
}));

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
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {},
  signInWithPhoneNumber: vi.fn(),
  linkWithPhoneNumber: vi.fn(),
}));

vi.mock("../../services/firebaseClient", () => ({
  authClient: {},
  firebaseConfigured: true,
}));
vi.mock("../../services/studentProgressStore", () => ({
  hydrateLocalProgressFromCloud: vi.fn(async () => {}),
  ensureLearnerProgressBaseline: vi.fn(async () => {}),
  setActiveProgressUser: vi.fn(),
}));
vi.mock("../../services/studentCloudStore", () => ({
  ensureLearnerCloudBaseline: vi.fn(async () => {}),
}));
vi.mock("../../services/mistakeLogService", () => ({
  hydrateMistakeLogsFromCloud: vi.fn(async () => {}),
}));
vi.mock("../../services/dbSyncService", () => ({
  restoreFromDB: vi.fn(async () => {}),
}));
vi.mock("../../services/learnerAccountService", () => ({
  ensureLearnerAccountMetadata: vi.fn(async () => {}),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
  }),
}));

import { AuthProvider } from "../../context/AuthContext";
import { MobileAccountMenu } from "./MobileAccountMenu";

const EMAIL_USER: FbUser = {
  uid: "returning-email-uid",
  email: "asha@example.com",
  phoneNumber: null,
  displayName: "Asha Rao",
  providerData: [{ providerId: "password" }],
};

const PHONE_USER: FbUser = {
  uid: "returning-phone-uid",
  email: null,
  phoneNumber: "+919876543210",
  displayName: null,
  providerData: [{ providerId: "phone" }],
};

/**
 * The four things "clear site data" removes, put BACK — this is the returning
 * student, not a fresh one. The nudge counter and the subscription cache are
 * seeded in their PRE-SEC-2 shape (`trialEndDate`, no `trialStartDate`) so the
 * suite also covers the one cache shape that changed under this surface.
 */
function seedOldShapeLocalState(): void {
  window.localStorage.setItem("lazytopper.homeVisits.v1", "6");
  window.localStorage.setItem(
    "lazytopper.subscription.returning-email-uid",
    JSON.stringify({ tier: "trial", trialEndDate: "2026-01-01T00:00:00.000Z" }),
  );
  window.localStorage.setItem(
    "lazytopper.subscription.returning-phone-uid",
    JSON.stringify({ tier: "trial", trialEndDate: "2026-01-01T00:00:00.000Z" }),
  );
}

function mount() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/browse"]}>
        <MobileAccountMenu />
      </MemoryRouter>
    </AuthProvider>,
  );
}

/** Firebase's persisted-session restore: null first paint, then the user. */
function restorePersistedSession(user: FbUser | null): void {
  act(() => {
    fb.cb?.(user);
  });
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  fb.cb = null;
  // React logs the render error before rethrowing; silence it so a deliberate
  // crash does not look like a broken run.
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  errorSpy.mockRestore();
});

describe("MobileAccountMenu — a returning student with existing local state", () => {
  it("★ ACCEPTANCE: an email session restored from persistence renders, no React #310", () => {
    seedOldShapeLocalState();
    mount();
    // First paint: persistence has not resolved yet. This is the render every
    // clean-state test skips.
    expect(screen.queryByLabelText("Open account menu")).toBeNull();

    expect(() => restorePersistedSession(EMAIL_USER)).not.toThrow();
    expect(screen.getByLabelText("Open account menu")).toBeInTheDocument();
  });

  it("CONTROL: clean state, no persisted session — still renders nothing and does not throw", () => {
    mount();
    expect(() => restorePersistedSession(null)).not.toThrow();
    expect(screen.queryByLabelText("Open account menu")).toBeNull();
  });

  it("CONTROL: a session already present at the FIRST render renders — this path never broke", () => {
    // Signing in and then navigating to /browse mounts the component with the
    // user already there, so it never crosses the boundary. Modelled with the
    // synchronous local-session read, the only auth source available on render 1.
    // ★ This case is GREEN BOTH BEFORE AND AFTER the fix, which is what makes the
    // acceptance case above meaningful: it proves the suite is not simply green
    // because everything renders.
    window.localStorage.setItem(
      "lazytopper.auth.local.v1",
      JSON.stringify({
        uid: EMAIL_USER.uid,
        email: EMAIL_USER.email,
        phoneNumber: null,
        displayName: EMAIL_USER.displayName,
        providerIds: ["password"],
      }),
    );
    expect(() => mount()).not.toThrow();
    expect(screen.getByLabelText("Open account menu")).toBeInTheDocument();
  });

  it("a PHONE session restored from persistence renders too, seeded and clean", () => {
    seedOldShapeLocalState();
    mount();
    expect(() => restorePersistedSession(PHONE_USER)).not.toThrow();
    expect(screen.getByLabelText("Open account menu")).toBeInTheDocument();

    cleanup();
    window.localStorage.clear();
    mount();
    expect(() => restorePersistedSession(PHONE_USER)).not.toThrow();
    expect(screen.getByLabelText("Open account menu")).toBeInTheDocument();
  });

  it("survives sign-out after restore — the reverse transition drops no hook either", () => {
    seedOldShapeLocalState();
    mount();
    restorePersistedSession(EMAIL_USER);
    expect(() => restorePersistedSession(null)).not.toThrow();
    expect(screen.queryByLabelText("Open account menu")).toBeNull();
  });

  it("M2: an UNRECOGNISED persisted local-session shape fails safe, it does not crash", () => {
    // A third shape neither the current code nor the pre-SEC-2 code writes.
    window.localStorage.setItem(
      "lazytopper.auth.local.v1",
      JSON.stringify({ userId: "no-uid-field", trialEndDate: 42 }),
    );
    seedOldShapeLocalState();
    expect(() => mount()).not.toThrow();
    expect(() => restorePersistedSession(EMAIL_USER)).not.toThrow();
    expect(screen.getByLabelText("Open account menu")).toBeInTheDocument();
  });
});
