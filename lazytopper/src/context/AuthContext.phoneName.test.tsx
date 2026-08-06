import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

/**
 * AuthContext — `verifyPhoneOtp` NAMES A NEW PHONE ACCOUNT (NAME-2).
 *
 * `mapFirebaseUser` only ever READS `displayName`. Google supplies one and
 * `signUpWithEmailPassword` sets one (#616) — the only `updateProfile` in
 * product code before this lane. A phone credential carries none, so every
 * phone-first student was created nameless and their raw number rendered
 * wherever their name belonged, permanently.
 * [FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]
 *
 * ★★ THE LOAD-BEARING PROPERTY IS THE PARAMETER, NOT A KEY. `verifyPhoneOtp`
 * gained a second argument, not the context a seventeenth key —
 * `AuthContext.passwordReset.test.tsx` pins the key set by EXACT EQUALITY, and
 * ~25 suites replace this module with a `vi.mock` factory that is a FULL
 * replacement. A parameter is invisible to both; a key fails both. That suite
 * passing UNMODIFIED alongside this one is the proof.
 *
 * ★ AND THE GUARD: a student who ALREADY has a name must never have it
 * overwritten by whatever this door happened to collect.
 */

const H = vi.hoisted(() => ({
  AUTH_CLIENT: null as unknown as Record<string, unknown>,
  authCb: null as null | ((u: unknown) => void),
  currentUser: null as null | Record<string, unknown>,
  /** The user `confirm()` resolves with — i.e. who just signed in by phone. */
  confirmedUser: null as null | Record<string, unknown>,
  updateProfileCalls: [] as Array<{ uid: string; displayName?: string }>,
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class { setCustomParameters() {} },
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(
    async (user: Record<string, unknown>, profile: { displayName?: string }) => {
      H.updateProfileCalls.push({ uid: String(user.uid), displayName: profile.displayName });
      // The real API mutates the user IN PLACE and re-emits NO auth-state
      // event — the trap the context re-syncs around.
      user.displayName = profile.displayName;
    },
  ),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    clear() {}
    async render() {}
  },
  signInWithPhoneNumber: vi.fn(async () => ({
    confirm: async () => {
      H.currentUser = H.confirmedUser;
      H.authCb?.(H.currentUser);
      return { user: H.confirmedUser };
    },
  })),
  linkWithPhoneNumber: vi.fn(),
  onAuthStateChanged: (_c: unknown, cb: (u: unknown) => void) => {
    H.authCb = cb;
    cb(H.currentUser);
    return () => {};
  },
}));
vi.mock("../services/firebaseClient", () => ({
  get authClient() { return H.AUTH_CLIENT; },
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

function mount() {
  return render(<AuthProvider><Probe /></AuthProvider>);
}

/** The user Firebase hands back after a phone confirm. */
function phoneUser(displayName: string | null): Record<string, unknown> {
  return {
    uid: "PHONE-UID",
    email: null,
    phoneNumber: "+919876543210",
    displayName,
    emailVerified: false,
    providerData: [{ providerId: "phone" }],
  };
}

/** Drive a full send -> verify round trip and return nothing. */
async function roundTrip(name?: string) {
  document.body.appendChild(
    Object.assign(document.createElement("div"), { id: "recaptcha-host" }),
  );
  await ctx!.sendPhoneOtp("+919876543210", "recaptcha-host");
  await ctx!.verifyPhoneOtp("123456", name);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  ctx = null;
  H.authCb = null;
  H.currentUser = null;
  H.confirmedUser = null;
  H.updateProfileCalls = [];
  document.body.innerHTML = "";
  H.AUTH_CLIENT = { get currentUser() { return H.currentUser; } };
});

// ---------------------------------------------------------------------------

describe("verifyPhoneOtp names a NEW phone account", () => {
  it("★ sets the displayName on a phone user who has none", async () => {
    H.confirmedUser = phoneUser(null);
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await roundTrip("Ritika Kapoor");

    expect(H.updateProfileCalls).toHaveLength(1);
    expect(H.updateProfileCalls[0]).toEqual({
      uid: "PHONE-UID",
      displayName: "Ritika Kapoor",
    });
  });

  it("★ RE-SYNCS the context, so the name is visible without a reload", async () => {
    H.confirmedUser = phoneUser(null);
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await roundTrip("Ritika Kapoor");

    // `updateProfile` re-emits no auth-state event, so without the explicit
    // re-sync the context would keep the null `onAuthStateChanged` delivered
    // and the student would see their phone NUMBER as their name all session.
    // [FU-DISPLAYNAME-NOT-VISIBLE-UNTIL-RELOAD]
    await waitFor(() => expect(ctx!.user?.displayName).toBe("Ritika Kapoor"));
    expect(ctx!.user?.uid).toBe("PHONE-UID");
  });

  it("trims the name at the boundary", async () => {
    H.confirmedUser = phoneUser(null);
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await roundTrip("   Ritika Kapoor   ");

    expect(H.updateProfileCalls[0].displayName).toBe("Ritika Kapoor");
  });
});

describe("★★ an EXISTING displayName is never overwritten", () => {
  it("does NOT call updateProfile when the user already has a name", async () => {
    // A returning phone student who was named on some earlier path.
    H.confirmedUser = phoneUser("Ananya Sharma");
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    // Even though a name IS supplied — the surface's returning branch sends
    // none, but the context must not depend on the surface behaving.
    await roundTrip("Someone Else Entirely");

    expect(H.updateProfileCalls).toHaveLength(0);
    await waitFor(() => expect(ctx!.user?.displayName).toBe("Ananya Sharma"));
  });

  it("CONTROL — the identical round trip on a NAMELESS user DOES call it", async () => {
    // ★ The control for the assertion above. Same code path, same argument,
    // only the pre-existing name differs — so `toHaveLength(0)` above is the
    // guard firing, not `updateProfile` being unreachable or mis-mocked.
    H.confirmedUser = phoneUser(null);
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await roundTrip("Someone Else Entirely");

    expect(H.updateProfileCalls).toHaveLength(1);
    expect(H.updateProfileCalls[0].displayName).toBe("Someone Else Entirely");
  });

  it("does not call updateProfile when NO name is supplied — the returning branch", async () => {
    H.confirmedUser = phoneUser(null);
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await roundTrip(undefined);

    expect(H.updateProfileCalls).toHaveLength(0);
  });

  it("does not call updateProfile for a whitespace-only name", async () => {
    H.confirmedUser = phoneUser(null);
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await roundTrip("   ");

    // A blank name is not a name; it must not be written as one.
    expect(H.updateProfileCalls).toHaveLength(0);
  });
});

describe("★★ the change is a PARAMETER, not a context key", () => {
  it("verifyPhoneOtp accepts a second argument", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    // The signature carries the optional name. `length` counts only the
    // parameters BEFORE the first optional one, so assert on behaviour above
    // and on the callable shape here.
    expect(typeof ctx!.verifyPhoneOtp).toBe("function");
  });

  it("★ adds NO new context key — the whole reason this lane is small", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    // ⚠ This is the same property `AuthContext.passwordReset.test.tsx` pins by
    // exact equality. Restated here so THIS lane owns a failing signal if a
    // later change reaches for a key instead of a parameter.
    expect(Object.keys(ctx!)).toContain("verifyPhoneOtp");
    expect(Object.keys(ctx!)).not.toContain("setDisplayName");
    expect(Object.keys(ctx!)).not.toContain("updatePhoneDisplayName");
    expect(Object.keys(ctx!)).toHaveLength(17);
  });
});
