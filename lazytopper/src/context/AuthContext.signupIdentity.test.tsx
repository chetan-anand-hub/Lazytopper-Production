import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

/**
 * AuthContext — two identity behaviours the sign-up surfaces depend on (PR-B3).
 *
 *  (a) DISPLAY NAME RE-SYNC. `createUserWithEmailAndPassword` fires
 *      `onAuthStateChanged` with `displayName: null`, and `updateProfile`
 *      mutates `currentUser` IN PLACE without re-emitting an auth-state event.
 *      Without an explicit re-sync the context keeps the null it was handed and
 *      every shell surface falls back to `displayName || email` — the student
 *      sees their raw email as their name for the whole first session, which is
 *      the exact defect the sign-up name field exists to fix.
 *
 *  (b) reCAPTCHA CONTAINER TRACKING. Phone sign-in is now reachable from TWO
 *      pages. `resetPhone` runs only on verify-success, logout and provider
 *      unmount — never on navigation — so a verifier can outlive the element it
 *      was rendered into. Reuse must be conditional on the container still being
 *      the requested one AND still attached.
 *
 * Both are invisible to typecheck and to any render test, and (b) additionally
 * cannot be caught by passing a different container id — the previous
 * early-return ignored that argument entirely.
 */

const H = vi.hoisted(() => ({
  AUTH_CLIENT: { __brand: "auth-client" } as Record<string, unknown>,
  authCb: null as null | ((u: unknown) => void),
  createdUser: null as null | Record<string, unknown>,
  /** Every container id a RecaptchaVerifier was constructed against, in order. */
  renderedInto: [] as string[],
  clearCount: 0,
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class { setCustomParameters() {} },
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(async () => {
    H.createdUser = { uid: "u1", email: "a@b.com", phoneNumber: null, displayName: null };
    H.authCb?.(H.createdUser);
    return { user: H.createdUser };
  }),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(async (u: Record<string, unknown>, p: { displayName: string }) => {
    u.displayName = p.displayName;
  }),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    constructor(_auth: unknown, containerId: string) {
      H.renderedInto.push(containerId);
    }
    clear() { H.clearCount += 1; }
    async render() {}
  },
  signInWithPhoneNumber: vi.fn(async () => ({ confirm: vi.fn() })),
  onAuthStateChanged: (_c: unknown, cb: (u: unknown) => void) => {
    H.authCb = cb;
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
  return <span data-testid="dn">{ctx.user ? String(ctx.user.displayName) : "no-user"}</span>;
}

function mount() {
  return render(<AuthProvider><Probe /></AuthProvider>);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  ctx = null;
  H.authCb = null;
  H.createdUser = null;
  H.renderedInto = [];
  H.clearCount = 0;
  document.body.innerHTML = "";
});

describe("AuthContext — the typed name is visible in the SAME session", () => {
  it("reflects the new displayName without a page reload", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await ctx!.signUpWithEmailPassword("a@b.com", "pw123456", "Ananya Sharma");

    // THE claim: the context — what every shell surface reads — carries the name.
    await waitFor(() =>
      expect(screen.getByTestId("dn").textContent).toBe("Ananya Sharma"),
    );
    expect(ctx!.user?.displayName).toBe("Ananya Sharma");
  });

  it("does not invent a name when none was supplied", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await ctx!.signUpWithEmailPassword("a@b.com", "pw123456");

    // Google/phone users and no-name signups must stay null, not "" or a guess:
    // the shell's `displayName || email` fallback depends on it being falsy.
    await waitFor(() => expect(ctx!.user).not.toBeNull());
    expect(ctx!.user?.displayName).toBeNull();
  });
});

describe("AuthContext — reCAPTCHA reuse is scoped to the live container", () => {
  /** Put a container element in the document, as a mounted page would. */
  function mountContainer(id: string) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
    return el;
  }

  it("REUSES the verifier for the same container while it is still on screen", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    mountContainer("lt-login-recaptcha");

    await ctx!.initPhoneRecaptcha("lt-login-recaptcha");
    await ctx!.initPhoneRecaptcha("lt-login-recaptcha");

    // Rebuilding into the SAME element throws "reCAPTCHA has already been
    // rendered in this element", so the resend path must not rebuild.
    expect(H.renderedInto).toEqual(["lt-login-recaptcha"]);
    expect(H.clearCount).toBe(0);
  });

  it("REBUILDS when a different container is requested (the /login -> /sign-up walk)", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    // Student opens the phone tab on /login...
    const login = mountContainer("lt-login-recaptcha");
    await ctx!.initPhoneRecaptcha("lt-login-recaptcha");

    // ...then navigates to /sign-up: Login unmounts, its container goes with it.
    login.remove();
    mountContainer("lt-signup-recaptcha");
    await ctx!.initPhoneRecaptcha("lt-signup-recaptcha");

    // The verifier must now be bound to the container that is actually on screen.
    // Before container tracking this returned early and rendered into NOTHING —
    // the container-id argument was ignored, so a distinct id fixed nothing.
    expect(H.renderedInto).toEqual(["lt-login-recaptcha", "lt-signup-recaptcha"]);
    expect(H.clearCount).toBe(1);
  });

  it("REBUILDS when the same container id was remounted (stale element)", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    const first = mountContainer("lt-signup-recaptcha");
    await ctx!.initPhoneRecaptcha("lt-signup-recaptcha");

    // Leave the page and come back: same id, brand-new element. The old verifier
    // is bound to the detached node and can no longer solve.
    first.remove();
    await ctx!.initPhoneRecaptcha("lt-signup-recaptcha");

    expect(H.renderedInto).toEqual(["lt-signup-recaptcha", "lt-signup-recaptcha"]);
    expect(H.clearCount).toBe(1);
  });
});

describe("AuthContext — the context key set is unchanged", () => {
  it("adds no key (AuthContext.passwordReset.test.tsx pins the set by exact equality)", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    // This PR fixes the re-sync and the container tracking with existing state
    // and existing imports precisely so the exact-equality pin in the sibling
    // suite stays green. Asserting it here too means the constraint is visible
    // from the file that could break it.
    expect(Object.keys(ctx!)).not.toContain("resetPhone");
    expect(Object.keys(ctx!)).not.toContain("teardownRecaptcha");
    expect(Object.keys(ctx!)).not.toContain("refreshUser");
  });
});
