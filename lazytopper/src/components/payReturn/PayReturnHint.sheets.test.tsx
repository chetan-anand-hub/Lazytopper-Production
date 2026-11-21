/** PAY-RETURN-1 - the one-line pre-pay hint sits above the pay button on every signed-out sheet, in-app only, and the kill switch removes it. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ trackNamedEvent: vi.fn(), trackPurchase: vi.fn(), newCheckoutAttemptId: vi.fn(() => "lt_attempt"), trackOnboardingEvent: vi.fn() }));
vi.mock("../../analytics/analytics", () => analytics);
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackPurchase: vi.fn() }));

import GuestPaySheet from "../guestPay/GuestPaySheet";
import CheckoutSheet, { type CheckoutSheetItem } from "../checkoutWho/CheckoutSheet";
import type { GuestItem } from "../../services/guestPay";
import { PAY_RETURN_HINT } from "../../services/payReturn";

const INSTAGRAM = "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0";
const CHROME = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const PACK: GuestItem = { kind: "pack", sku: "pack_mock", target: "maths", label: "Mock Pack · Maths", description: "d" };
const ITEM: CheckoutSheetItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "x", priceDisplay: "₹199" };
const ua = (v: string) => vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(v);
const sheetProps = { selfMasked: null, onPaySelf: vi.fn(), onSignIn: vi.fn(), onSignInWithNumber: vi.fn(), onSignInWithEmail: vi.fn(), onClose: vi.fn() };

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PAY-RETURN-1 pre-pay hint on the sheets", () => {
  it("GuestPaySheet (pay by phone): in-app shows it above Continue; a normal browser does not", () => {
    ua(INSTAGRAM);
    render(<GuestPaySheet item={PACK} userAgent={INSTAGRAM} onSignInFirst={vi.fn()} onSignInWithNumber={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("guest-pay-phone"));
    const hint = screen.getByTestId("pay-return-hint");
    expect(hint.textContent).toBe(PAY_RETURN_HINT);
    const cont = screen.getByTestId("guest-pay-continue");
    expect(hint.compareDocumentPosition(cont) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    ua(CHROME);
    render(<GuestPaySheet item={PACK} userAgent={CHROME} onSignInFirst={vi.fn()} onSignInWithNumber={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("guest-pay-phone"));
    expect(screen.queryByTestId("pay-return-hint")).toBeNull();
  });
  it("CheckoutSheet 'Buy for yourself' (signed out) and the recipient box (signed out): shown in-app; the SIGNED-IN box has none", () => {
    ua(INSTAGRAM);
    render(<CheckoutSheet item={ITEM} signedIn={false} selfFirst {...sheetProps} />);
    const hint = screen.getByTestId("pay-return-hint");
    expect(hint.compareDocumentPosition(screen.getByTestId("who-pay-self-out")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    render(<CheckoutSheet item={ITEM} signedIn={false} selfFirst={false} startAt="other" {...sheetProps} />);
    expect(screen.getByTestId("pay-return-hint")).toBeTruthy();
    cleanup();
    render(<CheckoutSheet item={ITEM} signedIn selfFirst={false} startAt="other" {...sheetProps} />);
    expect(screen.queryByTestId("pay-return-hint")).toBeNull();
  });
  it("kill switch VITE_PAY_RETURN_DISABLED=1 removes it everywhere", () => {
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    ua(INSTAGRAM);
    render(<CheckoutSheet item={ITEM} signedIn={false} selfFirst {...sheetProps} />);
    expect(screen.queryByTestId("pay-return-hint")).toBeNull();
  });
});
