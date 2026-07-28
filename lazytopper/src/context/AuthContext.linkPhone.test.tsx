import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

/**
 * AuthContext — linking a phone credential to the CURRENT account (Lane F).
 *
 * Firebase issues a SEPARATE UID per sign-in method, so a student who signs up
 * with Google and later uses phone OTP gets a brand-new account: zero progress,
 * empty Mistake Intelligence, no attempt history. Linking prevents that split.
 *
 * ★ THE LOAD-BEARING TEST IS "the uid does not change". That single property is
 * the entire difference between LINKING a credential and silently SWITCHING the
 * student to a different account — and the failure mode of getting it wrong is
 * indistinguishable, from the student's side, from the bug we are preventing.
 */

const H = vi.hoisted(() => ({
  AUTH_CLIENT: null as unknown as Record<string, unknown>,
  authCb: null as null | ((u: unknown) => void),
  currentUser: null as null | Record<string, unknown>,
  linkCalls: [] as Array<{ uid: string; phone: string }>,
  signInPhoneCalls: [] as string[],
  confirmResult: null as null | { confirm: (c: string) => Promise<unknown> },
  linkError: null as null | { code: string },
  renderedInto: [] as string[],
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class { setCustomParameters() {} },
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
  RecaptchaVerifier: class {
    constructor(_a: unknown, containerId: string) { H.renderedInto.push(containerId); }
    clear() {}
    async render() {}
  },
  // The SIGN-IN api. If the implementation ever calls this instead of
  // linkWithPhoneNumber, the uid assertion below catches it.
  signInWithPhoneNumber: vi.fn(async (_a: unknown, phone: string) => {
    H.signInPhoneCalls.push(phone);
    return {
      confirm: async () => {
        // A real sign-in REPLACES the current user — a different uid.
        H.currentUser = {
          uid: "OTHER-UID",
          email: null,
          phoneNumber: phone,
          displayName: null,
          providerData: [{ providerId: "phone" }],
        };
        H.authCb?.(H.currentUser);
        return { user: H.currentUser };
      },
    };
  }),
  linkWithPhoneNumber: vi.fn(async (user: Record<string, unknown>, phone: string) => {
    if (H.linkError) throw H.linkError;
    H.linkCalls.push({ uid: String(user.uid), phone });
    return {
      confirm: async () => {
        // A real link MUTATES the SAME user in place: same uid, one more provider.
        (user.providerData as Array<{ providerId: string }>).push({ providerId: "phone" });
        user.phoneNumber = phone;
        return { user };
      },
    };
  }),
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
import { hasPhoneLinked } from "../lib/signInMethods";

type Ctx = ReturnType<typeof useAuth>;
let ctx: Ctx | null = null;

function Probe() {
  ctx = useAuth();
  return null;
}

function mount() {
  return render(<AuthProvider><Probe /></AuthProvider>);
}

/** A signed-in Google student — the case the split actually happens to. */
function signedInWithGoogle() {
  H.currentUser = {
    uid: "GOOGLE-UID",
    email: "a@b.com",
    phoneNumber: null,
    displayName: "Ananya",
    providerData: [{ providerId: "google.com" }],
  };
  H.AUTH_CLIENT = { get currentUser() { return H.currentUser; } };
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  ctx = null;
  H.authCb = null;
  H.currentUser = null;
  H.linkCalls = [];
  H.signInPhoneCalls = [];
  H.linkError = null;
  H.renderedInto = [];
  document.body.innerHTML = "";
  signedInWithGoogle();
});

describe("linking preserves the account (the load-bearing property)", () => {
  it("keeps the SAME uid and adds the phone provider", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    const before = ctx!.user?.uid;
    expect(before).toBe("GOOGLE-UID");

    await ctx!.sendLinkPhoneOtp("+919876543210", "lt-link-recaptcha");
    await ctx!.confirmLinkPhoneOtp("123456");

    await waitFor(() => expect(hasPhoneLinked(ctx!.user)).toBe(true));

    // ★ THE assertion. A changed uid here means the student was switched to a
    // different account, which is the bug this lane exists to prevent.
    expect(ctx!.user?.uid, "linking must never change the uid").toBe(before);
    expect(ctx!.user?.providerIds).toEqual(["google.com", "phone"]);
    // ...and it must have gone through the LINK api, not the sign-in one.
    expect(H.linkCalls).toEqual([{ uid: "GOOGLE-UID", phone: "+919876543210" }]);
    expect(H.signInPhoneCalls, "sign-in API must not be used for linking").toEqual([]);
  });

  it("reflects the link WITHOUT a page reload", async () => {
    // `confirm()` mutates currentUser in place and does NOT re-emit an
    // auth-state event — the same trap as updateProfile in PR-B2/B3. Without an
    // explicit re-sync the modal keeps offering a link that already succeeded.
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    expect(hasPhoneLinked(ctx!.user)).toBe(false);

    await ctx!.sendLinkPhoneOtp("+919876543210", "lt-link-recaptcha");
    await ctx!.confirmLinkPhoneOtp("123456");

    await waitFor(() => expect(hasPhoneLinked(ctx!.user)).toBe(true));
  });

  it("renders the verifier into the container the caller asked for", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    const el = document.createElement("div");
    el.id = "lt-link-recaptcha";
    document.body.appendChild(el);

    await ctx!.sendLinkPhoneOtp("+919876543210", "lt-link-recaptcha");

    expect(H.renderedInto).toEqual(["lt-link-recaptcha"]);
  });
});

describe("refuse, don't merge", () => {
  it("propagates credential-already-in-use and leaves the signed-in user untouched", async () => {
    H.linkError = { code: "auth/credential-already-in-use" };
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await expect(
      ctx!.sendLinkPhoneOtp("+919876543210", "lt-link-recaptcha"),
    ).rejects.toMatchObject({ code: "auth/credential-already-in-use" });

    // The student stays exactly where they were — no silent switch, no partial state.
    expect(ctx!.user?.uid).toBe("GOOGLE-UID");
    expect(hasPhoneLinked(ctx!.user)).toBe(false);
  });
});

describe("the link flow is isolated from the sign-in flow", () => {
  it("refuses to confirm a link that was never requested", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    // A shared confirmation ref would let a stale SIGN-IN confirmation be
    // confirmed here — switching accounts instead of linking.
    await expect(ctx!.confirmLinkPhoneOtp("123456")).rejects.toThrow(
      /Request a code before confirming/,
    );
  });

  it("refuses to link when nobody is signed in", async () => {
    H.currentUser = null;
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    await expect(
      ctx!.sendLinkPhoneOtp("+919876543210", "lt-link-recaptcha"),
    ).rejects.toThrow(/Sign in before linking/);
  });

  it("drops a pending link on logout, so it cannot attach to the next student", async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    await ctx!.sendLinkPhoneOtp("+919876543210", "lt-link-recaptcha");

    await ctx!.logout();

    // Same browser, different student — the pending confirmation must be gone.
    await expect(ctx!.confirmLinkPhoneOtp("123456")).rejects.toThrow(
      /Request a code before confirming/,
    );
  });
});

describe("providerIds is derived, not inferred", () => {
  it("reads the linked CREDENTIALS, not the profile fields", async () => {
    // A Google account can carry an email and a null phoneNumber while a phone
    // credential is linked, and vice versa. Inferring from email/phoneNumber
    // gets both directions wrong, which is why the spec says read providerData.
    H.currentUser = {
      uid: "U1",
      email: "a@b.com",
      phoneNumber: "+919876543210", // profile field present...
      displayName: null,
      providerData: [{ providerId: "google.com" }], // ...but NO phone credential
    };
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());

    expect(ctx!.user?.phoneNumber).toBe("+919876543210");
    expect(hasPhoneLinked(ctx!.user), "a profile phoneNumber is not a linked credential").toBe(
      false,
    );
  });
});
