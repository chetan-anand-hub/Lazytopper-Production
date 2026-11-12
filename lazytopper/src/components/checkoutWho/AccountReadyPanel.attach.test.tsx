/**
 * SELFPAY-ATTACH-1 - AccountReadyPanel in attach mode ("Me" / the 10-minute Start): the code is sent as it mounts to the number already
 * known (code only to type), no "send it to my child", a Resend link, and the landing carries the one-time welcome flag. Default mode untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ sendPhoneOtp: vi.fn(async () => undefined), verifyPhoneOtp: vi.fn(async () => undefined) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
import AccountReadyPanel from "./AccountReadyPanel";

const PASS = { kind: "pass" as const, sku: "till_boards" as const, label: "Board Pass", description: "Board Pass" };
const PACK = { kind: "pack" as const, sku: "pack_cbq" as const, target: "maths", label: "Maths CBQ Pack", description: "x" };
const RECIPIENT = { phone: "+919876543210", first: "phone" as const };

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("attachMe", () => {
  it("sends the code on mount, no child share / account line; the code lands on Home with ?welcome=board_pass", async () => {
    const go = vi.fn();
    render(<AccountReadyPanel item={PASS} recipient={RECIPIENT} payerSignedIn={false} onClose={vi.fn()} go={go} attachMe />);
    await waitFor(() => expect(auth.sendPhoneOtp).toHaveBeenCalledWith("+919876543210", "lt-who-recaptcha"));
    expect(auth.sendPhoneOtp).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("who-send-child")).toBeNull();
    expect(screen.queryByTestId("who-account-ready")).toBeNull();
    fireEvent.click(await screen.findByTestId("who-otp-resend"));
    await waitFor(() => expect(auth.sendPhoneOtp).toHaveBeenCalledTimes(2));
    fireEvent.change(await screen.findByTestId("who-otp"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("/browse?welcome=board_pass"));
  });

  it("a pack lands on My packs with ?welcome=pack", async () => {
    const go = vi.fn();
    render(<AccountReadyPanel item={PACK} recipient={RECIPIENT} payerSignedIn={false} onClose={vi.fn()} go={go} attachMe />);
    fireEvent.change(await screen.findByTestId("who-otp"), { target: { value: "123456" } });
    expect(screen.getByTestId("who-otp-verify").textContent).toBe("Sign in");
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("/packs?from=pay&welcome=pack&pack=pack_cbq%3Amaths#my-packs"));
  });

  it("without attachMe: nothing is sent on mount and the landing has no welcome flag (today's flow)", async () => {
    const go = vi.fn();
    render(<AccountReadyPanel item={PASS} recipient={RECIPIENT} payerSignedIn={false} onClose={vi.fn()} go={go} />);
    expect(auth.sendPhoneOtp).not.toHaveBeenCalled();
    expect(screen.getByTestId("who-send-child")).toBeTruthy();
    fireEvent.click(screen.getByTestId("who-open-me"));
    fireEvent.change(await screen.findByTestId("who-otp"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("/"));
  });
});
