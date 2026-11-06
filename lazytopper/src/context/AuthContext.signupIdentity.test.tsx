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
  elements: [] as Array<HTMLElement | null>,
  clearCount: 0,
  renderGate: null as null | Promise<void>,
  sendError: null as null | unknown,
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
    // LOGIN-FIX-1 — the verifier now renders into a fresh child of the host; record the HOST id.
    constructor(_auth: unknown, container: string | HTMLElement) {
      H.renderedInto.push(typeof container === "string" ? container : (container.parentElement?.id ?? ""));
      H.elements.push(typeof container === "string" ? null : container);
    }
    clear() { H.clearCount += 1; }
    async render() {
      if (H.renderGate) await H.renderGate;
    }
  },
  signInWithPhoneNumber: vi.fn(async () => {
    if (H.sendError) throw H.sendError;
    return { confirm: vi.fn() };
  }),
  linkWithPhoneNumber: vi.fn(async () => ({ confirm: vi.fn() })),
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
  H.elements = [];
  H.clearCount = 0;
  H.renderGate = null;
  H.sendError = null;
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

describe("LOGIN-FIX-1 — reCAPTCHA: one render at a time, a fresh widget after a failed send", () => {
  function mountContainer(id: string) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
    return el;
  }

  it("renders into a fresh CHILD of the host, not the host itself", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    const host = mountContainer("lt-login-recaptcha");
    await ctx!.initPhoneRecaptcha("lt-login-recaptcha");
    expect(H.elements).toHaveLength(1);
    expect(H.elements[0]).not.toBe(host);
    expect(H.elements[0]?.parentElement).toBe(host);
  });

  it("the warm-up and a quick Send OTP share ONE render (no second widget in the same element)", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    mountContainer("lt-login-recaptcha");
    let open: () => void = () => {};
    H.renderGate = new Promise<void>((r) => {
      open = r;
    });
    const warm = ctx!.initPhoneRecaptcha("lt-login-recaptcha");
    const send = ctx!.sendPhoneOtp("+919876543210", "lt-login-recaptcha");
    open();
    await Promise.all([warm, send]);
    expect(H.renderedInto).toEqual(["lt-login-recaptcha"]);
    expect(H.clearCount).toBe(0);
  });

  it("a failed send drops the widget; the retry renders a NEW one into a new child", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    const host = mountContainer("lt-login-recaptcha");
    H.sendError = Object.assign(new Error("x"), { code: "auth/captcha-check-failed" });
    await expect(ctx!.sendPhoneOtp("+919876543210", "lt-login-recaptcha")).rejects.toMatchObject({
      code: "auth/captcha-check-failed",
    });
    expect(H.clearCount).toBe(1);
    expect(H.elements[0]?.isConnected).toBe(false); // the old slot is gone from the host
    H.sendError = null;
    await ctx!.sendPhoneOtp("+919876543210", "lt-login-recaptcha");
    expect(H.renderedInto).toEqual(["lt-login-recaptcha", "lt-login-recaptcha"]);
    expect(H.elements[1]).not.toBe(H.elements[0]);
    expect(H.elements[1]?.parentElement).toBe(host);
    expect(host.children).toHaveLength(1);
  });

  it("a teardown during an in-flight render leaves nothing behind (no late install, slot removed)", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    const host = mountContainer("lt-login-recaptcha");
    let open: () => void = () => {};
    H.renderGate = new Promise<void>((r) => {
      open = r;
    });
    const warm = ctx!.initPhoneRecaptcha("lt-login-recaptcha");
    expect(host.children).toHaveLength(1);
    await ctx!.logout(); // tears down while the render is still in flight
    open();
    await expect(warm).rejects.toMatchObject({ code: "lt/recaptcha-not-ready" });
    expect(host.children).toHaveLength(0);
    expect(H.clearCount).toBe(1);
    // The next request renders a fresh widget instead of reusing the cancelled one.
    H.renderGate = null;
    await ctx!.initPhoneRecaptcha("lt-login-recaptcha");
    expect(H.renderedInto).toEqual(["lt-login-recaptcha", "lt-login-recaptcha"]);
    expect(host.children).toHaveLength(1);
    expect(H.elements[1]?.parentElement).toBe(host);
  });

  it("our own guard errors now carry codes (they were logged as unknown)", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    await expect(ctx!.verifyPhoneOtp("123456")).rejects.toMatchObject({ code: "lt/otp-not-requested" });
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
