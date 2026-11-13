import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GUEST_CLAIMED_EVENT } from "../../services/guestPay";
import { PURCHASE_LANDED_EVENT, SECOND_LOGIN_SEEN_PREFIX, hasSeenSecondLoginPrompt } from "../../services/secondLoginPrompt";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean; providerIds?: string[]; email?: string | null; phoneNumber?: string | null } }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, sendLinkPhoneOtp: vi.fn(), confirmLinkPhoneOtp: vi.fn() }),
}));
vi.mock("../../services/firebaseClient", () => ({ authClient: null }));

import SecondLoginPromptHost from "./SecondLoginPromptHost";

const fire = (count = 1) => act(async () => { window.dispatchEvent(new CustomEvent(GUEST_CLAIMED_EVENT, { detail: { count, items: [] } })); });

describe("SECOND-LOGIN-PROMPT-1", () => {
  beforeEach(() => {
    window.localStorage.clear();
    auth.user = { uid: "uG", providerIds: ["google.com"], email: "kid@gmail.com", phoneNumber: null };
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("the host listens to the very event guestPay fires", () => {
    expect(PURCHASE_LANDED_EVENT).toBe(GUEST_CLAIMED_EVENT);
  });

  it("after a purchase lands: asks once, says either login opens the same account, offers the missing login; 'Not now' closes; never again for this account", async () => {
    render(<SecondLoginPromptHost />);
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
    await fire();
    const box = await screen.findByTestId("second-login-prompt");
    expect(box.textContent).toContain("Also sign in with your phone?");
    expect(box.textContent).toContain("Either login opens the same account");
    expect(box.textContent).not.toMatch(/\bAI\b|optional|answer key/i);
    expect(window.localStorage.getItem(SECOND_LOGIN_SEEN_PREFIX + "uG")).toBe("1");
    fireEvent.click(screen.getByTestId("second-login-dismiss"));
    await waitFor(() => expect(screen.queryByTestId("second-login-prompt")).toBeNull());
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
    expect(hasSeenSecondLoginPrompt("uG")).toBe(true);
    // a later page load (new host instance): still never again for this account
    cleanup();
    render(<SecondLoginPromptHost />);
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
  });

  it("asks for the email login when the account only has a phone", async () => {
    auth.user = { uid: "uP", providerIds: ["phone"], email: null, phoneNumber: "+919876543948" };
    render(<SecondLoginPromptHost />);
    await fire();
    expect((await screen.findByTestId("second-login-prompt")).textContent).toContain("Also sign in with your Gmail?");
  });

  it("stays silent: an account that already has both logins, a local/signed-out session, a claim that attached nothing, the kill switch", async () => {
    auth.user = { uid: "uB", providerIds: ["google.com", "phone"], email: "a@gmail.com", phoneNumber: "+919876543948" };
    const { unmount } = render(<SecondLoginPromptHost />);
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
    unmount();
    auth.user = null;
    render(<SecondLoginPromptHost />);
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
    cleanup();
    auth.user = { uid: "uZ", providerIds: ["google.com"], email: "z@gmail.com", phoneNumber: null };
    render(<SecondLoginPromptHost />);
    await fire(0);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
    cleanup();
    vi.stubEnv("VITE_SECOND_LOGIN_PROMPT_DISABLED", "1");
    render(<SecondLoginPromptHost />);
    await fire();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("second-login-prompt")).toBeNull();
    expect(window.localStorage.getItem(SECOND_LOGIN_SEEN_PREFIX + "uZ")).toBeNull();
  });
});
