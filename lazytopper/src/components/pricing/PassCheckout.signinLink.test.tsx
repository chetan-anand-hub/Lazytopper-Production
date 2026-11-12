/** LINK-SIGNIN-1 host test: the "Who will use this?" card appears on PassCheckout's paid screen ONLY after a confirmed paid outcome, for a signed-in buyer. */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SigninLinkCardLazy from "../signinLink/SigninLinkCardLazy";
import { MemoryRouter } from "react-router-dom";

vi.mock("../signinLink/SigninLinkCard", () => ({ default: () => <div data-testid="signin-link-card-stub" /> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("../../services/firebaseClient", () => ({ authClient: null, firestoreDb: null, app: null }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));

import { PassCheckoutView, tillBoardsButtonLabel } from "./PassCheckout";

// Warm the lazy card ONCE (React caches a resolved lazy at module level), so every NEGATIVE assertion below renders the card
// synchronously if the host wrongly shows it. Without this a bare "absent" check can pass while the chunk is still loading.
beforeAll(async () => {
  render(<SigninLinkCardLazy signedIn />);
  await screen.findByTestId("signin-link-card-stub");
  cleanup();
});
afterEach(() => cleanup());

function view(over: Partial<Parameters<typeof PassCheckoutView>[0]>) {
  render(
    <MemoryRouter>
      <PassCheckoutView signedIn offerOpen showMonth={false} activePassEnd={null} onSignIn={vi.fn()} onBuy={vi.fn(async () => ({ status: "dismissed" as const }))} {...over} />
    </MemoryRouter>,
  );
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); }); // inside act, so a lazy chunk that resolves is flushed (a bare timeout would let a wrongly-shown card go unseen)

describe("PassCheckout paid screen · sign-in card", () => {
  it("not before a payment: absent on the buy screen and after a dismissed / failed checkout", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "dismissed" as const })) });
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    await settle();
    expect(screen.queryByTestId("pass-checkout-paid")).toBeNull();
    expect(screen.queryByTestId("signin-link-card-stub")).toBeNull();
  });

  it("after a confirmed paid outcome, a signed-in buyer gets the card (lazy chunk awaited)", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "paid" as const, passEnd: "2027-02-17T18:29:59.999Z" })) });
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    await screen.findByTestId("pass-checkout-paid");
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
  });

  it("a signed-out view never shows it, even at the paid state", async () => {
    view({ signedIn: false, onBuy: vi.fn(async () => ({ status: "paid" as const, passEnd: "2027-02-17T18:29:59.999Z" })) });
    await settle();
    expect(screen.queryByTestId("signin-link-card-stub")).toBeNull();
  });

  it("the card wrapper itself refuses a signed-out buyer (the lazy chunk is warm, so a wrong show would be visible)", async () => {
    render(<SigninLinkCardLazy signedIn={false} />);
    await settle();
    expect(screen.queryByTestId("signin-link-card-stub")).toBeNull();
  });
});
