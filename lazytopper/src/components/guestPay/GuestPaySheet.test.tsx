/**
 * PAY-PHONE-1 — the "How do you want to pay?" sheet: phone is the primary option; in-app browsers lead with phone for
 * the sign-in options too; the number is validated; the success screen masks the number and hands the 10 digits to the
 * phone sign-in; events carry names only.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const track = vi.hoisted(() => ({ trackNamedEvent: vi.fn() }));
vi.mock("../../analytics/analytics", () => track);

import GuestPaySheet, { GUEST_PAY_ACCOUNT_EXISTS, GUEST_PAY_BOUGHT_BEFORE, GUEST_PAY_BAD_NUMBER, GUEST_PAY_GOOGLE_FIRST, GUEST_PAY_PHONE_CTA, GUEST_PAY_PHONE_FIRST, guestPaidLine } from "./GuestPaySheet";
import type { GuestBuyOutcome, GuestItem } from "../../services/guestPay";

const PACK: GuestItem = { kind: "pack", sku: "pack_mock", target: "maths", label: "Mock Pack · Maths", description: "d" };
const CHROME = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const INSTAGRAM = "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0";

afterEach(() => {
  cleanup();
  track.trackNamedEvent.mockReset();
});

function sheet(over: { ua?: string; buy?: (i: GuestItem, p: string) => Promise<GuestBuyOutcome>; item?: GuestItem } = {}) {
  const props = {
    onSignInFirst: vi.fn(),
    onSignInWithNumber: vi.fn(),
    onClose: vi.fn(),
    buy: over.buy ?? vi.fn(async (): Promise<GuestBuyOutcome> => ({ status: "paid", confirmed: true, phoneMasked: "+91 98•••••948", phone: "+919876543948", amountInr: 99 })),
  };
  render(<GuestPaySheet item={over.item ?? PACK} userAgent={over.ua ?? CHROME} {...props} />);
  return props;
}

const buttonTexts = () => screen.getAllByRole("button").map((b) => b.textContent);

describe("PAY-PHONE-1 · GuestPaySheet", () => {
  it("shows phone as the primary option, then Google first, then phone first; reports it was shown", () => {
    sheet();
    expect(screen.getByRole("dialog")).toBeTruthy();
    const texts = buttonTexts().filter((t) => t !== "×");
    expect(texts).toEqual([GUEST_PAY_PHONE_CTA, GUEST_PAY_GOOGLE_FIRST, GUEST_PAY_PHONE_FIRST]);
    expect(track.trackNamedEvent).toHaveBeenCalledWith("guest_pay_option_shown");
  });

  it("in an in-app browser the phone options lead (Google sign-in fails there)", () => {
    sheet({ ua: INSTAGRAM });
    const texts = buttonTexts().filter((t) => t !== "×");
    expect(texts).toEqual([GUEST_PAY_PHONE_CTA, GUEST_PAY_PHONE_FIRST, GUEST_PAY_GOOGLE_FIRST]);
  });

  it("the sign-in-first options hand back to the caller's existing flow", () => {
    const p = sheet();
    fireEvent.click(screen.getByText(GUEST_PAY_GOOGLE_FIRST));
    fireEvent.click(screen.getByText(GUEST_PAY_PHONE_FIRST));
    expect(p.onSignInFirst.mock.calls).toEqual([["google"], ["phone"]]);
  });

  it("Continue stays disabled until a valid 10-digit Indian mobile; then pays and shows the masked number", async () => {
    const p = sheet();
    fireEvent.click(screen.getByText(GUEST_PAY_PHONE_CTA));
    expect(screen.getByText("You'll use this same number to sign in and get your purchase.")).toBeTruthy();
    const input = screen.getByTestId("guest-pay-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5876543948" } });
    expect((screen.getByTestId("guest-pay-continue") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: "98765-43948xx" } });
    expect(input.value).toBe("9876543948");
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    await waitFor(() => expect(screen.getByTestId("guest-pay-paid")).toBeTruthy());
    expect(p.buy).toHaveBeenCalledWith(PACK, "9876543948");
    expect(screen.getByTestId("guest-pay-paid").textContent).toBe("Payment received ✓ ₹99 · Mock Pack · Maths");
    expect(screen.getByText("Now sign in with +91 98•••••948 to download it.")).toBeTruthy();
    expect(document.body.textContent).not.toContain("9876543948");
    fireEvent.click(screen.getByTestId("guest-pay-signin"));
    expect(p.onSignInWithNumber).toHaveBeenCalledWith("9876543948");
    expect(track.trackNamedEvent.mock.calls.map((c) => c[0])).toEqual(["guest_pay_option_shown", "guest_pay_start", "guest_pay_paid"]);
    // Events carry the name only.
    for (const c of track.trackNamedEvent.mock.calls) expect(c).toHaveLength(1);
  });

  it("a Board Pass says Premium; a server refusal of the number shows the plain error", async () => {
    expect(guestPaidLine("pass", "+91 98•••••948")).toBe("Now sign in with +91 98•••••948 to switch on Premium.");
    sheet({ buy: vi.fn(async (): Promise<GuestBuyOutcome> => ({ status: "invalid_phone" })) });
    fireEvent.click(screen.getByText(GUEST_PAY_PHONE_CTA));
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543948" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(GUEST_PAY_BAD_NUMBER));
  });

  it("a refused order (e.g. already paid with this number) shows the GENERIC line and a sign-in, no second payment", async () => {
    const p = sheet({ buy: vi.fn(async (): Promise<GuestBuyOutcome> => ({ status: "already_paid", phoneMasked: "+91 98•••••948", phone: "+919876543948" })) });
    fireEvent.click(screen.getByText(GUEST_PAY_PHONE_CTA));
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543948" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    await waitFor(() => expect(screen.getByTestId("guest-pay-already")).toBeTruthy());
    expect(screen.getByTestId("guest-pay-already").textContent).toBe(
      "We couldn't start a payment for this number. If you have paid with it before, sign in with it to get your purchase.",
    );
    fireEvent.click(screen.getByText("Sign in with this number"));
    expect(p.onSignInWithNumber).toHaveBeenCalledWith("9876543948");
  });

  it("OWNER: a number with an account is sent to sign in with it (prefilled); the step offers 'Bought before?'", async () => {
    const p = sheet({ buy: vi.fn(async (): Promise<GuestBuyOutcome> => ({ status: "account_exists", phoneMasked: "+91 98•••••948", phone: "+919876543948" })) });
    fireEvent.click(screen.getByText(GUEST_PAY_PHONE_CTA));
    expect(screen.getByText(GUEST_PAY_BOUGHT_BEFORE)).toBeTruthy();
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543948" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    await waitFor(() => expect(screen.getByTestId("guest-pay-exists").textContent).toBe(GUEST_PAY_ACCOUNT_EXISTS));
    expect(document.body.textContent).not.toMatch(/own|bought|refund/i);
    fireEvent.click(screen.getByTestId("guest-pay-exists-signin"));
    // Back to the SAME purchase after signing in (a Premium account still buys packs), number prefilled.
    expect(p.onSignInFirst).toHaveBeenCalledWith("phone", "9876543948", true);
    expect(p.onSignInWithNumber).not.toHaveBeenCalled();
  });

  it("'Bought from LazyTopper before?' goes to the phone sign-in", () => {
    const p = sheet();
    fireEvent.click(screen.getByText(GUEST_PAY_PHONE_CTA));
    fireEvent.click(screen.getByTestId("guest-pay-bought-before"));
    expect(p.onSignInFirst).toHaveBeenCalledWith("phone", undefined, true);
  });
});
