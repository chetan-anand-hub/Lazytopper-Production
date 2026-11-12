/** PAID-SHEET-1: the pop-up itself (dialog semantics, Esc / X / backdrop, focus return, scroll lock) and the Board Pass host. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../signinLink/SigninLinkCard", () => ({
  default: (p: { onMoved?: () => void }) => (
    <div data-testid="signin-link-card-stub">
      <button type="button" data-testid="stub-moved" onClick={() => p.onMoved?.()}>moved</button>
    </div>
  ),
}));
vi.mock("../passOwnerOffers/PassOwnerOfferLazy", () => ({ default: () => <div data-testid="pass-owner-offer-stub" /> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("../../services/firebaseClient", () => ({ authClient: null, firestoreDb: null, app: null }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));

import PaidSheetLazy from "./PaidSheetLazy";
import { PassCheckoutView, tillBoardsButtonLabel } from "../pricing/PassCheckout";

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); });
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PaidSheet", () => {
  it("is a labelled modal dialog; Esc, the X and the backdrop close it; focus returns; the page scroll lock is released", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(<PaidSheetLazy surface="packs" itemKind="pack" itemName="Maths + Science Bundle" primaryLabel="Download files" onPrimary={vi.fn()} onClose={onClose} />);
    const sheet = await screen.findByTestId("paid-sheet");
    const dialog = sheet.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby") || "")?.textContent).toBe("Payment received");
    expect(screen.getByTestId("paid-sheet-item").textContent).toBe("Maths + Science Bundle");
    expect(document.body.classList.contains("lt-paid-lock")).toBe(true);
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(screen.getByTestId("paid-sheet-close"));
    fireEvent.click(sheet);
    expect(onClose).toHaveBeenCalledTimes(3);
    unmount();
    expect(document.body.classList.contains("lt-paid-lock")).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("Tab wraps inside the sheet; a moved purchase hides the primary button", async () => {
    const { rerender } = render(<PaidSheetLazy surface="packs" itemKind="pack" itemName="X" primaryLabel="Download files" onPrimary={vi.fn()} onClose={vi.fn()} />);
    const dialog = (await screen.findByTestId("paid-sheet")).querySelector('[role="dialog"]') as HTMLElement;
    await settle();
    const buttons = Array.from(dialog.querySelectorAll<HTMLElement>("button"));
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
    rerender(<PaidSheetLazy surface="packs" itemKind="pack" itemName="X" primaryLabel="Download files" onPrimary={vi.fn()} onClose={vi.fn()} moved />);
    expect(screen.queryByTestId("paid-sheet-primary")).toBeNull();
  });
});

describe("PassCheckout paid -> PaidSheet", () => {
  const paid = () => vi.fn(async () => ({ status: "paid" as const, passEnd: "2027-02-17T18:29:59.999Z", orderId: "order_B1" }));
  const view = (onBuy = paid()) =>
    render(
      <MemoryRouter>
        <PassCheckoutView signedIn offerOpen showMonth={false} activePassEnd={null} onSignIn={vi.fn()} onBuy={onBuy} />
      </MemoryRouter>,
    );

  it("opens on a confirmed Board Pass payment: item name, who-card, CBQ Packs offer; the inline paid line stays after closing", async () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    await screen.findByTestId("paid-sheet");
    expect(screen.getByTestId("paid-sheet-item").textContent).toBe("the Board Pass");
    expect(screen.getByTestId("paid-sheet-primary").textContent).toBe("Start practising");
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
    expect(await screen.findByTestId("pass-owner-offer-stub")).toBeTruthy();
    // the inline copy of the card / offer is not duplicated behind the sheet
    expect(screen.getAllByTestId("signin-link-card-stub")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("paid-sheet-close"));
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
    expect(screen.getByTestId("pass-checkout-paid")).toBeTruthy();
  });

  it("moving the Board Pass completes inside the pop-up: it stays open and nothing behind it scrolls", async () => {
    const scrollTo = vi.fn();
    const into = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    Element.prototype.scrollIntoView = into as unknown as Element["scrollIntoView"];
    view();
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    fireEvent.click(await screen.findByTestId("stub-moved"));
    await settle();
    expect(screen.getByTestId("paid-sheet")).toBeTruthy();
    expect(screen.queryByTestId("paid-sheet-primary")).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(into).not.toHaveBeenCalled();
  });

  it("kill switch VITE_PAID_SHEET_DISABLED=1: the old inline paid screen, no pop-up", async () => {
    vi.stubEnv("VITE_PAID_SHEET_DISABLED", "1");
    view();
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    await screen.findByTestId("pass-checkout-paid");
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
    expect(await screen.findByTestId("pass-owner-offer-stub")).toBeTruthy();
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
  });
});
