/**
 * CHECKOUT-WHO-2 - the "add an email" step: Google or an email link; nothing is linked until the link is opened (the finish
 * step, on return); the masked echo only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const svc = vi.hoisted(() => ({
  linkGoogleToCurrentAccount: vi.fn(async () => undefined),
  sendEmailLinkForLinking: vi.fn(async () => undefined),
  completeEmailLink: vi.fn(async () => undefined),
  clearEmailLinkFromUrl: vi.fn(),
  isEmailLinkReturn: vi.fn(() => false),
  describeEmailLinkError: vi.fn(() => "That email already signs in to a different account, so it can't be added here."),
}));
vi.mock("../../services/linkSignInEmail", () => svc);

import LinkEmailPanel from "./LinkEmailPanel";

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("LinkEmailPanel", () => {
  it("Google: one tap links (Google verifies) and says so", async () => {
    render(<LinkEmailPanel alsoMasked="an••••@gmail.com" />);
    expect(screen.getByTestId("link-also-signin").textContent).toContain("an••••@gmail.com");
    fireEvent.click(screen.getByTestId("link-email-google"));
    expect(await screen.findByTestId("link-email-done")).toBeTruthy();
    expect(svc.linkGoogleToCurrentAccount).toHaveBeenCalledTimes(1);
  });

  it("email link: sending links NOTHING; the return step links with the typed address and clears the URL", async () => {
    render(<LinkEmailPanel alsoMasked="an••••@gmail.com" />);
    fireEvent.click(screen.getByTestId("link-email-by-link"));
    fireEvent.change(screen.getByTestId("link-email-input"), { target: { value: "anaya.k@gmail.com" } });
    fireEvent.click(screen.getByTestId("link-email-submit"));
    expect(await screen.findByTestId("link-email-sent")).toBeTruthy();
    expect(svc.sendEmailLinkForLinking).toHaveBeenCalledWith("anaya.k@gmail.com");
    expect(svc.completeEmailLink).not.toHaveBeenCalled();
    cleanup();
    render(<LinkEmailPanel returning />);
    fireEvent.change(screen.getByTestId("link-email-input"), { target: { value: "anaya.k@gmail.com" } });
    fireEvent.click(screen.getByTestId("link-email-submit"));
    expect(await screen.findByTestId("link-email-done")).toBeTruthy();
    expect(svc.completeEmailLink).toHaveBeenCalledWith("anaya.k@gmail.com");
    expect(svc.clearEmailLinkFromUrl).toHaveBeenCalledTimes(1);
  });

  it("a refusal is shown, never a success", async () => {
    svc.linkGoogleToCurrentAccount.mockRejectedValueOnce({ code: "auth/credential-already-in-use" });
    render(<LinkEmailPanel alsoMasked="an••••@gmail.com" />);
    fireEvent.click(screen.getByTestId("link-email-google"));
    expect((await screen.findByTestId("link-email-error")).textContent).toMatch(/different account/);
    expect(screen.queryByTestId("link-email-done")).toBeNull();
  });
});
