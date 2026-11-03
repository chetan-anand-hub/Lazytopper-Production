/**
 * CHECKOUT-WHO-2 - adding an email to THIS account: both routes are Firebase LINKS on the current user (never a sign-in that
 * switches account), the email route only after the link from that inbox is opened, and the return URL is a fixed path.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fb = vi.hoisted(() => ({
  linkWithPopup: vi.fn(async () => ({})),
  linkWithCredential: vi.fn(async () => ({})),
  sendSignInLinkToEmail: vi.fn(async () => undefined),
  isSignInWithEmailLink: vi.fn(() => true),
  credentialWithLink: vi.fn((email: string, href: string) => ({ email, href })),
}));
const current = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  EmailAuthProvider: { credentialWithLink: fb.credentialWithLink },
  linkWithPopup: fb.linkWithPopup,
  linkWithCredential: fb.linkWithCredential,
  sendSignInLinkToEmail: fb.sendSignInLinkToEmail,
  isSignInWithEmailLink: fb.isSignInWithEmailLink,
}));
vi.mock("./firebaseClient", () => ({
  authClient: {
    get currentUser() {
      return current.user;
    },
  },
  getPopupRedirectResolver: () => "resolver",
}));

import { completeEmailLink, describeEmailLinkError, linkGoogleToCurrentAccount, sendEmailLinkForLinking } from "./linkSignInEmail";

beforeEach(() => {
  vi.clearAllMocks();
  current.user = { uid: "u1" };
});

describe("linkSignInEmail", () => {
  it("Google: linkWithPopup on the CURRENT user (not a sign-in)", async () => {
    await linkGoogleToCurrentAccount();
    expect(fb.linkWithPopup).toHaveBeenCalledTimes(1);
    expect((fb.linkWithPopup.mock.calls[0] as unknown[])[0]).toBe(current.user);
  });

  it("email link: sends to the normalised address with a FIXED return path; links only on completion, to the current user", async () => {
    await sendEmailLinkForLinking("  Anaya.K@Gmail.com ", "https://lazytopper.com");
    expect(fb.sendSignInLinkToEmail).toHaveBeenCalledWith(expect.anything(), "anaya.k@gmail.com", { url: "https://lazytopper.com/", handleCodeInApp: true });
    expect(fb.linkWithCredential).not.toHaveBeenCalled();
    await completeEmailLink("anaya.k@gmail.com", "https://lazytopper.com/?oobCode=abc&mode=signIn");
    expect(fb.credentialWithLink).toHaveBeenCalledWith("anaya.k@gmail.com", "https://lazytopper.com/?oobCode=abc&mode=signIn");
    expect((fb.linkWithCredential.mock.calls[0] as unknown[])[0]).toBe(current.user);
  });

  it("a bad address or no signed-in user is refused before Firebase is called", async () => {
    await expect(sendEmailLinkForLinking("nope", "https://x.in")).rejects.toMatchObject({ code: "auth/invalid-email" });
    current.user = null;
    await expect(linkGoogleToCurrentAccount()).rejects.toMatchObject({ code: "lt/signed-out" });
    expect(fb.sendSignInLinkToEmail).not.toHaveBeenCalled();
    expect(fb.linkWithPopup).not.toHaveBeenCalled();
  });

  it("errors never name another account", () => {
    expect(describeEmailLinkError({ code: "auth/credential-already-in-use" })).toMatch(/different account/);
    expect(describeEmailLinkError({ code: "auth/expired-action-code" })).toMatch(/expired/);
    expect(describeEmailLinkError(new Error("x"))).toBe("Couldn't add that email just now. Please try again.");
  });
});
