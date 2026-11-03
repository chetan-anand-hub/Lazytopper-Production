import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

/**
 * CHECKOUT-WHO-1 - after a claim of a purchase that also named a phone this account lacks, Home opens the EXISTING link step
 * (LinkSignInMethodModal, SMS code) with "Also sign in with <masked>?" - even for a first-session student. Flag off: nothing.
 * The control: the same event with the flag on DOES open it.
 */
const H = vi.hoisted(() => ({ user: null as null | Record<string, unknown>, who: true }));
vi.mock("../../context/AuthContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../context/AuthContext")>()),
  useAuth: () => ({ user: H.user, sendLinkPhoneOtp: vi.fn(), confirmLinkPhoneOtp: vi.fn() }),
}));
const linkSvc = vi.hoisted(() => ({ isEmailLinkReturn: vi.fn(() => true) }));
vi.mock("../../services/linkSignInEmail", () => ({
  ...linkSvc,
  linkGoogleToCurrentAccount: vi.fn(),
  sendEmailLinkForLinking: vi.fn(),
  completeEmailLink: vi.fn(),
  clearEmailLinkFromUrl: vi.fn(),
  describeEmailLinkError: vi.fn(() => ""),
}));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => H.who,
}));

import LinkPhoneNudge from "./LinkPhoneNudge";
import { ALSO_SIGNIN_EVENT } from "../../services/checkoutWhoFlag";

const EMAIL_ONLY = { uid: "KID", email: "anaya.k@gmail.com", phoneNumber: null, displayName: "Anaya", providerIds: ["google.com"] };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  H.user = EMAIL_ONLY;
  H.who = true;
});
afterEach(() => cleanup());

const fire = () => act(() => {
  window.dispatchEvent(new CustomEvent(ALSO_SIGNIN_EVENT, { detail: { kind: "phone", masked: "+91 98•••••948" } }));
});

describe("CHECKOUT-WHO-1 · Also sign in with <masked>?", () => {
  it("flag on: the event opens the link step with the masked number (first session, no nudge card needed)", async () => {
    render(<LinkPhoneNudge />);
    await act(async () => {});
    expect(screen.queryByTestId("link-phone-nudge")).toBeNull();
    fire();
    expect((await screen.findByTestId("link-also-signin")).textContent).toBe(
      "Also sign in with +91 98•••••948? Confirm it once with an SMS code, then either works.",
    );
    // The number is NOT prefilled in full anywhere (only the masked echo exists); linking still needs the SMS code.
    expect(document.body.innerHTML).not.toContain("9876543948");
  });

  it("flag off: the same event does nothing", async () => {
    H.who = false;
    render(<LinkPhoneNudge />);
    await act(async () => {});
    fire();
    expect(screen.queryByTestId("link-also-signin")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("an account that already has a phone linked is not asked", async () => {
    H.user = { ...EMAIL_ONLY, providerIds: ["google.com", "phone"] };
    render(<LinkPhoneNudge />);
    await act(async () => {});
    fire();
    expect(screen.queryByTestId("link-also-signin")).toBeNull();
  });
});

describe("CHECKOUT-WHO-2 · an email to add", () => {
  it("an email 'also sign in' opens the email step (Google or a link), even for an account WITH a phone linked", async () => {
    H.user = { uid: "PH", email: null, phoneNumber: "+919876543948", displayName: "A", providerIds: ["phone"] };
    render(<LinkPhoneNudge />);
    await act(async () => {});
    act(() => {
      window.dispatchEvent(new CustomEvent(ALSO_SIGNIN_EVENT, { detail: { kind: "email", masked: "an••••@gmail.com" } }));
    });
    expect(await screen.findByTestId("link-email-panel")).toBeTruthy();
    expect(screen.getByTestId("link-also-signin").textContent).toBe(
      "Also sign in with an••••@gmail.com? Confirm it once from that inbox (or with Google), then either works.",
    );
    expect(screen.getByTestId("link-email-google")).toBeTruthy();
  });

  it("back from the email link (one-time code in the URL): the finish step opens; flag off: nothing", async () => {
    window.history.replaceState(null, "", "/?apiKey=k&oobCode=abc&mode=signIn");
    render(<LinkPhoneNudge />);
    expect(await screen.findByText("Confirm the email you opened the link from")).toBeTruthy();
    cleanup();
    H.who = false;
    render(<LinkPhoneNudge />);
    await act(async () => {});
    expect(screen.queryByTestId("link-email-panel")).toBeNull();
    window.history.replaceState(null, "", "/");
  });
});
