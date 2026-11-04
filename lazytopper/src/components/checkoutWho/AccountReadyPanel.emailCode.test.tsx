/**
 * EMAIL-CODE-1 - the pay-first thank-you screen, EMAIL case, with VITE_EMAIL_CODE_SIGNIN_ENABLED on: "It's for me — get a
 * code" -> a code is sent to THAT address -> six boxes -> signed in -> My packs / Home. Flag off: the link, exactly as before.
 * The phone case is untouched either way.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ sendPhoneOtp: vi.fn(async () => undefined), verifyPhoneOtp: vi.fn(async () => undefined) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
const codes = vi.hoisted(() => ({
  sendEmailCode: vi.fn(async (_e: string) => undefined),
  signInWithEmailCode: vi.fn(async (_e: string, _c: string) => undefined),
  describeEmailCodeError: vi.fn(() => "x"),
}));
vi.mock("../../services/emailCode", () => codes);

import AccountReadyPanel, { GET_A_CODE } from "./AccountReadyPanel";
import { SEND_ME_LINK } from "../../services/checkoutWho";

type Item = Parameters<typeof AccountReadyPanel>[0]["item"];
const PACK = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "x" } as unknown as Item;
const PASS = { kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass" } as unknown as Item;

function mount(over: Partial<Parameters<typeof AccountReadyPanel>[0]> = {}) {
  const props = {
    item: PACK,
    recipient: { email: "kid@gmail.com", first: "email" as const },
    payerSignedIn: false,
    onClose: vi.fn(),
    go: vi.fn(),
    sendEmailLink: vi.fn(async () => undefined),
    ...over,
  };
  render(<AccountReadyPanel {...(props as Parameters<typeof AccountReadyPanel>[0])} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("thank-you screen, email case, email code on", () => {
  it("'It's for me — get a code' -> code sent to that address -> 6 digits -> signed in -> My packs (no link sent)", async () => {
    const p = mount();
    const btn = screen.getByTestId("who-open-me");
    expect(btn.textContent).toBe(GET_A_CODE);
    expect(document.body.textContent).toContain("We email a 6-digit code to that address");
    fireEvent.click(btn);
    await screen.findByTestId("email-code-sent");
    expect(codes.sendEmailCode).toHaveBeenCalledTimes(1);
    expect(codes.sendEmailCode).toHaveBeenCalledWith("kid@gmail.com");
    fireEvent.change(screen.getByTestId("email-code-input"), { target: { value: "654321" } });
    await waitFor(() => expect(codes.signInWithEmailCode).toHaveBeenCalledWith("kid@gmail.com", "654321"));
    await waitFor(() => expect(p.go).toHaveBeenCalledWith("/packs#my-packs"));
    expect(p.sendEmailLink).not.toHaveBeenCalled();
    // "Send it to my child" stays.
    expect(screen.getByTestId("who-send-child")).toBeTruthy();
  });

  it("a Board Pass lands on Home", async () => {
    const p = mount({ item: PASS });
    fireEvent.click(screen.getByTestId("who-open-me"));
    fireEvent.change(await screen.findByTestId("email-code-input"), { target: { value: "111111" } });
    await waitFor(() => expect(p.go).toHaveBeenCalledWith("/"));
  });

  it("the phone case is unchanged (SMS OTP), flag on or off", async () => {
    mount({ recipient: { phone: "+919876543210", first: "phone" } as never });
    expect(screen.getByTestId("who-open-me").textContent).toBe("It's for me — open it now");
    fireEvent.click(screen.getByTestId("who-open-me"));
    await waitFor(() => expect(auth.sendPhoneOtp).toHaveBeenCalled());
    expect(codes.sendEmailCode).not.toHaveBeenCalled();
  });

  it("flag OFF: the email case is the sign-in link exactly as before", async () => {
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "");
    const p = mount();
    expect(screen.getByTestId("who-open-me").textContent).toBe(SEND_ME_LINK);
    expect(document.body.textContent).toContain("For you? We email a one-tap sign-in link to that address.");
    fireEvent.click(screen.getByTestId("who-open-me"));
    await screen.findByTestId("who-link-sent");
    expect(p.sendEmailLink).toHaveBeenCalledWith("kid@gmail.com", "/packs#my-packs");
    expect(codes.sendEmailCode).not.toHaveBeenCalled();
    expect(screen.queryByTestId("email-code")).toBeNull();
  });
});
