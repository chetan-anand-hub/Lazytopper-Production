// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";

const state = vi.hoisted(() => ({
  user: null as null | { uid: string; email: string | null; phoneNumber: string | null; providerIds: string[]; isLocalSession?: boolean },
  providerData: [] as Array<{ providerId: string; email?: string | null; phoneNumber?: string | null }>,
  sendLink: vi.fn(),
  confirmLink: vi.fn(),
  linkGoogle: vi.fn(),
  events: [] as Array<[string, unknown]>,
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: state.user, sendLinkPhoneOtp: state.sendLink, confirmLinkPhoneOtp: state.confirmLink }),
}));
vi.mock("../../services/firebaseClient", () => ({
  authClient: {
    get currentUser() {
      return state.user ? { uid: state.user.uid, providerData: state.providerData } : null;
    },
  },
}));
vi.mock("../../services/linkSignInEmail", () => ({ linkGoogleToCurrentAccount: (...a: unknown[]) => state.linkGoogle(...a) }));
vi.mock("../../analytics/analytics", () => ({
  sendAnalyticsHit: (_k: string, payload: { name: string; data?: unknown }) => {
    state.events.push([payload.name, payload.data]);
  },
}));

import SigninLinkCardLazy from "./SigninLinkCardLazy";
import SigninMethodsSectionLazy from "./SigninMethodsSectionLazy";
import { describeLinkError, IN_USE_TEXT, successLine, listLinkedMethods } from "./signinLinkModel";

const googleUser = () => {
  state.user = { uid: "u1", email: "chetan@gmail.com", phoneNumber: null, providerIds: ["google.com"] };
  state.providerData = [{ providerId: "google.com", email: "chetan@gmail.com", phoneNumber: null }];
};
const phoneUser = () => {
  state.user = { uid: "u2", email: null, phoneNumber: "+919876543210", providerIds: ["phone"] };
  state.providerData = [{ providerId: "phone", email: null, phoneNumber: "+919876543210" }];
};
const ui = (el: ReactElement) => render(el);

beforeEach(() => {
  state.events = [];
  state.sendLink.mockReset().mockResolvedValue(undefined);
  state.confirmLink.mockReset();
  state.linkGoogle.mockReset();
  window.localStorage.clear();
  vi.unstubAllEnvs();
});
afterEach(() => cleanup());

describe("SigninLinkCard (after a paid outcome)", () => {
  it("renders nothing for a signed-out buyer", () => {
    state.user = null;
    ui(<SigninLinkCardLazy signedIn={false} />);
    expect(screen.queryByTestId("signin-link-card")).toBeNull();
  });

  it("shows the title, the masked current sign-in and both add buttons for a Google-less phone account", async () => {
    phoneUser();
    ui(<SigninLinkCardLazy signedIn />);
    expect(await screen.findByText("Who else will sign in to use this?")).toBeTruthy();
    expect(screen.getByTestId("signin-link-card").textContent).toContain("+91 98•••••210");
    expect(screen.getByTestId("signin-link-card").textContent).not.toContain("9876543210");
    expect(screen.queryByTestId("signin-link-add-phone")).toBeNull();
    expect(screen.getByTestId("signin-link-add-google")).toBeTruthy();
    expect(state.events.map((e) => e[0])).toEqual(["signin_link_shown"]);
  });

  it("hides the Google button when Google is already linked and the phone button stays", async () => {
    googleUser();
    ui(<SigninLinkCardLazy signedIn />);
    await screen.findByTestId("signin-link-card");
    expect(screen.queryByTestId("signin-link-add-google")).toBeNull();
    expect(screen.getByTestId("signin-link-add-phone")).toBeTruthy();
  });

  it("renders nothing when both phone and Google are already linked", async () => {
    state.user = { uid: "u3", email: "a@gmail.com", phoneNumber: "+919876543210", providerIds: ["google.com", "phone"] };
    state.providerData = [
      { providerId: "google.com", email: "a@gmail.com" },
      { providerId: "phone", phoneNumber: "+919876543210" },
    ];
    ui(<SigninLinkCardLazy signedIn />);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("signin-link-card")).toBeNull();
  });

  it("'No, just me' hides it and is remembered per account on this device", async () => {
    googleUser();
    const first = ui(<SigninLinkCardLazy signedIn />);
    fireEvent.click(await screen.findByTestId("signin-link-dismiss"));
    expect(screen.queryByTestId("signin-link-card")).toBeNull();
    first.unmount();
    ui(<SigninLinkCardLazy signedIn />);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("signin-link-card")).toBeNull();
    // another account on the same device still sees it
    cleanup();
    state.user = { ...state.user!, uid: "someone-else" };
    ui(<SigninLinkCardLazy signedIn />);
    expect(await screen.findByTestId("signin-link-card")).toBeTruthy();
  });

  it("the kill switch hides the card", async () => {
    vi.stubEnv("VITE_SIGNIN_LINK_DISABLED", "1");
    googleUser();
    ui(<SigninLinkCardLazy signedIn />);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("signin-link-card")).toBeNull();
  });

  it("phone: sends a code, shows where it went (masked), confirms, and the success line names both credentials", async () => {
    googleUser();
    state.confirmLink.mockImplementation(async () => {
      state.providerData = [...state.providerData, { providerId: "phone", phoneNumber: "+919123456789" }];
    });
    ui(<SigninLinkCardLazy signedIn />);
    fireEvent.click(await screen.findByTestId("signin-link-add-phone"));
    fireEvent.change(screen.getByTestId("signin-link-phone"), { target: { value: "9123456789" } });
    fireEvent.click(screen.getByTestId("signin-link-submit"));
    await waitFor(() => expect(state.sendLink).toHaveBeenCalledWith("+919123456789", expect.any(String)));
    const sent = await screen.findByTestId("signin-link-otp-sent");
    expect(sent.textContent).toContain("If this is your child's phone, ask them for the code.");
    expect(sent.textContent).not.toContain("9123456789");
    fireEvent.change(screen.getByTestId("signin-link-otp"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("signin-link-submit"));
    const done = await screen.findByTestId("signin-link-done");
    expect(done.textContent).toBe("Done. You can now sign in with ch••••@gmail.com or +91 91•••••789 — both open this account.");
    expect(state.events.find((e) => e[0] === "signin_link_added")?.[1]).toEqual({ method: "phone" });
    expect(JSON.stringify(state.events)).not.toMatch(/9123456789|chetan/);
  });

  it("google: links, success line names both", async () => {
    phoneUser();
    state.linkGoogle.mockImplementation(async () => {
      state.providerData = [...state.providerData, { providerId: "google.com", email: "kid@gmail.com" }];
    });
    ui(<SigninLinkCardLazy signedIn />);
    fireEvent.click(await screen.findByTestId("signin-link-add-google"));
    const done = await screen.findByTestId("signin-link-done");
    expect(done.textContent).toBe(successLine("+91 98•••••210", "ki••••@gmail.com"));
    expect(state.events.find((e) => e[0] === "signin_link_added")?.[1]).toEqual({ method: "google" });
  });

  it("already-in-use: the honest line + the WhatsApp link, nothing merged", async () => {
    phoneUser();
    state.linkGoogle.mockRejectedValue({ code: "auth/credential-already-in-use" });
    ui(<SigninLinkCardLazy signedIn />);
    fireEvent.click(await screen.findByTestId("signin-link-add-google"));
    const err = await screen.findByTestId("signin-link-error");
    expect(err.textContent).toContain(IN_USE_TEXT);
    expect(screen.getByTestId("signin-link-whatsapp").getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
    expect(state.events.find((e) => e[0] === "signin_link_failed")?.[1]).toEqual({ code: "auth/credential-already-in-use" });
  });
});

describe("describeLinkError", () => {
  it.each([
    ["auth/credential-already-in-use", /already has its own LazyTopper account/, true],
    ["auth/provider-already-linked", /already has its own LazyTopper account/, true],
    ["auth/invalid-verification-code", /isn't right/, false],
    ["auth/code-expired", /expired/, false],
    ["auth/popup-closed-by-user", /Google window was closed/, false],
    ["auth/too-many-requests", /Too many attempts/, false],
    ["auth/something-new", /Couldn't add that just now/, false],
  ])("%s", (code, re, whatsapp) => {
    const e = describeLinkError({ code });
    expect(e.text).toMatch(re);
    expect(e.whatsapp).toBe(whatsapp);
    expect(e.text).not.toMatch(/\bAI\b|answer key|optional|refund/i);
  });
});

describe("Ways to sign in (Settings)", () => {
  it("lists only the real linked providers, masked, with Add buttons for the missing ones", async () => {
    googleUser();
    ui(<SigninMethodsSectionLazy headingId="h" />);
    const list = await screen.findByTestId("signin-methods-section");
    expect(list.textContent).toContain("Google ch••••@gmail.com");
    expect(list.textContent).not.toContain("chetan@gmail.com");
    expect(screen.queryByTestId("signin-method-phone")).toBeNull();
    expect(screen.queryByTestId("signin-method-email")).toBeNull();
    expect(screen.getByTestId("signin-link-add-phone")).toBeTruthy();
    expect(screen.queryByTestId("signin-link-add-google")).toBeNull();
  });

  it("lists a phone credential masked", async () => {
    phoneUser();
    ui(<SigninMethodsSectionLazy />);
    expect((await screen.findByTestId("signin-method-phone")).textContent).toBe("Phone +91 98•••••210");
  });

  it("the kill switch hides the section", async () => {
    vi.stubEnv("VITE_SIGNIN_LINK_DISABLED", "1");
    phoneUser();
    ui(<SigninMethodsSectionLazy />);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("signin-methods-section")).toBeNull();
  });

  it("listLinkedMethods ignores unknown providers", () => {
    expect(listLinkedMethods([{ providerId: "facebook.com", email: "x@y.com" }])).toEqual([]);
  });
});
