/**
 * PAY-ACCOUNT-1 - the thank-you screen when the account is made at payment (flag VITE_PAY_AUTO_ACCOUNT_ENABLED on): ONE
 * screen for every product, "It's for me — open it now" (phone: the existing OTP sign-in with the number already in, only
 * the code to type; email: a sign-in link) and "Send it to my child" (Web Share, else WhatsApp text-only + Copy). Nothing
 * typed at checkout goes into a URL, a share, storage or analytics.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ trackNamedEvent: vi.fn(), trackPurchase: vi.fn(), newCheckoutAttemptId: vi.fn(() => "lt_attempt") }));
vi.mock("../../analytics/analytics", () => analytics);
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackPurchase: vi.fn() }));
const auth = vi.hoisted(() => ({ sendPhoneOtp: vi.fn(async () => undefined), verifyPhoneOtp: vi.fn(async () => undefined) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));

import CheckoutSheet, { type CheckoutSheetItem } from "./CheckoutSheet";
import AccountReadyPanel from "./AccountReadyPanel";
import { childShareText, whatsappShareUrl, landingPath } from "../../services/checkoutWho";
import type { WhoBuyOutcome } from "../../services/checkoutWho";

const PASS: CheckoutSheetItem = { kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass", priceDisplay: "₹1,917" };
const CBQ: CheckoutSheetItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "x", priceDisplay: "₹199" };
const PHONE_DIGITS = /98765|43210|9876543210/;

function mountSheet(over: Partial<Parameters<typeof CheckoutSheet>[0]> = {}) {
  const props = {
    item: CBQ,
    signedIn: false,
    selfMasked: null,
    onPaySelf: vi.fn(),
    onSignIn: vi.fn(),
    onSignInWithNumber: vi.fn(),
    onSignInWithEmail: vi.fn(),
    onClose: vi.fn(),
    buy: vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "paid", confirmed: true, amountInr: 199, paymentId: "pay_1" })),
    ...over,
  };
  render(<CheckoutSheet {...props} />);
  return props;
}
async function payFor(value: string) {
  fireEvent.change(screen.getByTestId("who-first"), { target: { value } });
  fireEvent.click(screen.getByTestId("who-pay"));
  await screen.findByTestId("who-account-ready");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
  vi.stubEnv("VITE_PAY_AUTO_ACCOUNT_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the thank-you screen (flag on)", () => {
  it("every product: 'Payment received ✓ <product>. Their LazyTopper account is ready.' + the two buttons", async () => {
    for (const item of [CBQ, PASS]) {
      mountSheet({ item });
      await payFor("98765 43210");
      expect(screen.getByTestId("who-paid").textContent).toBe(`Payment received ✓ ${item.label}`);
      expect(screen.getByTestId("who-account-ready").textContent).toBe("Their LazyTopper account is ready.");
      expect(screen.getByTestId("who-open-me").textContent).toBe("It's for me — open it now");
      expect(screen.getByTestId("who-send-child").textContent).toBe("Send it to my child");
      expect(screen.queryByTestId("who-signin")).toBeNull();
      cleanup();
    }
  });

  it("mobile, 'It's for me': the existing phone OTP with the number already in -> only the code -> My packs", async () => {
    const go = vi.fn();
    render(<AccountReadyPanel item={CBQ} recipient={{ phone: "+919876543210", first: "phone" }} payerSignedIn={false} onClose={vi.fn()} go={go} />);
    fireEvent.click(screen.getByTestId("who-open-me"));
    await screen.findByTestId("who-otp");
    expect(auth.sendPhoneOtp).toHaveBeenCalledWith("+919876543210", "lt-who-recaptcha");
    fireEvent.change(screen.getByTestId("who-otp"), { target: { value: "12345" } });
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    expect(await screen.findByText("Enter the 6-digit code from the SMS.")).toBeTruthy();
    fireEvent.change(screen.getByTestId("who-otp"), { target: { value: "123456" } });
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("/packs#my-packs"));
    expect(auth.verifyPhoneOtp).toHaveBeenCalledWith("123456");
  });

  it("Board Pass lands on Home; a wrong code keeps the code step", async () => {
    const go = vi.fn();
    auth.verifyPhoneOtp.mockRejectedValueOnce(new Error("auth/invalid-verification-code"));
    render(<AccountReadyPanel item={PASS} recipient={{ phone: "+919876543210", first: "phone" }} payerSignedIn={false} onClose={vi.fn()} go={go} />);
    fireEvent.click(screen.getByTestId("who-open-me"));
    fireEvent.change(await screen.findByTestId("who-otp"), { target: { value: "000000" } });
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    expect(await screen.findByText("That code didn't work. Check it and try again.")).toBeTruthy();
    expect(go).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("who-otp"), { target: { value: "111111" } });
    fireEvent.click(screen.getByTestId("who-otp-verify"));
    await waitFor(() => expect(go).toHaveBeenCalledWith("/"));
    expect(landingPath("pass")).toBe("/");
  });

  it("email, 'It's for me': 'Send me the sign-in link' -> sent for THAT email with a fixed return path -> 'Check your inbox'", async () => {
    const sendEmailLink = vi.fn(async () => undefined);
    render(<AccountReadyPanel item={CBQ} recipient={{ email: "anaya.k@gmail.com", first: "email" }} payerSignedIn={false} onClose={vi.fn()} sendEmailLink={sendEmailLink} />);
    expect(screen.getByTestId("who-open-me").textContent).toBe("Send me the sign-in link");
    fireEvent.click(screen.getByTestId("who-open-me"));
    expect((await screen.findByTestId("who-link-sent")).textContent).toBe("Check your inbox and tap the link to open LazyTopper.");
    expect(sendEmailLink).toHaveBeenCalledWith("anaya.k@gmail.com", "/packs");
    expect(auth.sendPhoneOtp).not.toHaveBeenCalled();
  });

  it("'Send it to my child': Web Share with text that names WHAT to sign in with, never the number", async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    render(<AccountReadyPanel item={CBQ} recipient={{ phone: "+919876543210", first: "phone" }} payerSignedIn={false} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("who-send-child"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const text = (share.mock.calls[0] as unknown as [ShareData])[0].text || "";
    expect(text).toBe("I've bought you Maths CBQ Pack on LazyTopper. Open https://www.lazytopper.com/login and sign in with your mobile number — it's already in your account.");
    expect(text).not.toMatch(PHONE_DIGITS);
    expect(screen.queryByTestId("who-share-fallback")).toBeNull();
  });

  it("no Web Share: WhatsApp with ONLY the text (no number in the URL) + Copy message", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<AccountReadyPanel item={PASS} recipient={{ phone: "+919876543210", email: "anaya.k@gmail.com", first: "email" }} payerSignedIn={false} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("who-send-child"));
    const wa = (await screen.findByTestId("who-share-whatsapp")) as HTMLAnchorElement;
    expect(wa.getAttribute("href")).toBe(whatsappShareUrl(childShareText("Board Pass", { phone: "+919876543210", email: "anaya.k@gmail.com", first: "email" })));
    expect(wa.getAttribute("href")!.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa.getAttribute("href")!)).not.toMatch(/98765|43210|anaya/);
    expect(decodeURIComponent(wa.getAttribute("href")!)).toContain("sign in with your email");
    fireEvent.click(screen.getByTestId("who-share-copy"));
    await screen.findByText("Message copied");
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Board Pass"));
  });

  it("a signed-in payer buying for someone else: no 'It's for me' (it would sign them out of their own); send + Done", async () => {
    const p = mountSheet({ signedIn: true, selfMasked: "pa••••@x.in" });
    fireEvent.click(screen.getByTestId("who-someone-else"));
    await payFor("9876543210");
    expect(screen.queryByTestId("who-open-me")).toBeNull();
    expect(screen.getByTestId("who-send-child")).toBeTruthy();
    fireEvent.click(screen.getByTestId("who-done"));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("not yet confirmed by our server: the CHECKOUT-WHO screen ('still confirming'), never 'account is ready'", async () => {
    mountSheet({ buy: vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "paid", confirmed: false })) });
    fireEvent.change(screen.getByTestId("who-first"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("who-paid-line");
    expect(screen.queryByTestId("who-account-ready")).toBeNull();
  });

  it("payment cancelled: back to the form, no account screen", async () => {
    mountSheet({ buy: vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "dismissed" })) });
    fireEvent.change(screen.getByTestId("who-first"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByTestId("who-pay"));
    expect(await screen.findByText("Payment window closed. Tap Pay to try again.")).toBeTruthy();
    expect(screen.queryByTestId("who-account-ready")).toBeNull();
  });

  it("privacy: nothing typed reaches analytics or storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mountSheet();
    await payFor("98765 43210");
    fireEvent.click(screen.getByTestId("who-open-me"));
    await screen.findByTestId("who-otp");
    expect(JSON.stringify(analytics.trackNamedEvent.mock.calls)).not.toMatch(PHONE_DIGITS);
    expect(JSON.stringify(setItem.mock.calls)).not.toMatch(PHONE_DIGITS);
    setItem.mockRestore();
  });
});
