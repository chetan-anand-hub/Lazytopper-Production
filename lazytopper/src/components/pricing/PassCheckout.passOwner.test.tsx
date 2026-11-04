// @vitest-environment jsdom
/**
 * PASS-OWNER-PACKS-1 - the Board Pass buy area for a Board Pass OWNER, and the payment-success screen's pack offer.
 *  - a running "pass_till_boards" pass: "Your Board Pass is active until …", and NO Pay button / Board Pass price;
 *  - a running month pass (or admin grant): today's view (the upgrade to the Board Pass stays one tap away);
 *  - the success screen mounts the CBQ Pack offer (packs on), and nothing while packs are dark.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockAuth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../services/subscriptionService", () => ({
  hydrateSubscriptionFromCloud: vi.fn(async () => ({})),
  isPaidPremium: (s: { tier?: string } | null) => s?.tier === "premium",
  loadSubscription: () => ({ tier: "free" }),
  onSubscriptionHydrated: () => () => undefined,
}));
vi.mock("../../services/packs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/packs")>()),
  isPacksClientEnabled: () => true,
  fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "a@b.c" }, boardPassCredit: { creditInr: 0, expiresAtMs: null, payInr: null } })),
}));
vi.mock("../../services/firebaseClient", () => ({ authClient: { currentUser: null }, firestoreDb: null, app: null }));

import { PassCheckoutView, boardPassActiveUntilCopy, tillBoardsButtonLabel } from "./PassCheckout";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 5 Nov 2026.
import { packPayLabel } from "../../services/packs";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function view(overrides: Partial<Parameters<typeof PassCheckoutView>[0]> = {}) {
  render(
    <MemoryRouter>
      <PassCheckoutView
        signedIn
        offerOpen
        activePassEnd={null}
        onSignIn={vi.fn()}
        onBuy={vi.fn(async () => ({ status: "dismissed" as const }))}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe("a Board Pass owner on /pricing", () => {
  it('reads "Your Board Pass is active until …" and is shown no Pay button and no Board Pass price', () => {
    view({ activePassEnd: "2027-02-17T00:00:00.000Z", activePlan: "pass_till_boards", packCredit: { creditInr: 49, expiresAtMs: 1, payInr: 1868 } });
    const note = screen.getByTestId("pass-checkout-board-pass-active");
    expect(note.textContent).toBe(boardPassActiveUntilCopy("17 February 2027"));
    expect(note.textContent).toBe("Your Board Pass is active until 17 February 2027.");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(tillBoardsButtonLabel())).toBeNull();
    expect(document.body.textContent).not.toMatch(/₹|Try free|Pay /);
    expect(screen.queryByTestId("pass-checkout-pack-credit")).toBeNull();
  });
  it("a running MONTH pass: 'Your month pass is active until …', the Board Pass upsell, one Board Pass Pay", () => {
    view({ activePassEnd: "2026-11-30T00:00:00.000Z", activePlan: "pass_month" });
    expect(screen.getByTestId("pass-checkout-already-active").textContent).toBe("Your month pass is active until 30 November 2026.");
    expect(screen.getByTestId("pass-checkout-upsell").textContent).toMatch(/^Stay covered till your boards: Board Pass ₹[\d,]+(?: \+ GST)? once$/);
    expect(screen.getByRole("button", { name: tillBoardsButtonLabel() })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/premium/i);
  });
  it("no running pass: the plan alone changes nothing", () => {
    view({ activePlan: "pass_till_boards" });
    expect(screen.getByRole("button", { name: tillBoardsButtonLabel() })).toBeTruthy();
  });
});

describe("the Board Pass payment-success screen", () => {
  it("shows the CBQ Packs offer once (both subjects) under the success line, with packs on", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "1");
    view({ onBuy: vi.fn(async () => ({ status: "paid" as const, passEnd: "2027-02-17T00:00:00.000Z" })) });
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    expect((await screen.findByTestId("pass-checkout-paid")).textContent).toBe("Your Board Pass is active until 17 February 2027.");
    const offer = await screen.findByTestId("pass-offer-pass_success");
    expect(offer.textContent).toContain("Your Board Pass is on. Prefer practising on paper too? The CBQ Packs put the case-based questions in print");
    expect(screen.getByTestId("pass-offer-buy-pack_cbq-maths").textContent).toBe(`Maths ${packPayLabel("pack_cbq")}`);
    expect(screen.getByTestId("pass-offer-buy-pack_cbq-science").textContent).toBe(`Science ${packPayLabel("pack_cbq")}`);
    expect(screen.getAllByTestId(/^pass-offer-pass_/)).toHaveLength(1);
  });
  it("packs dark: the success screen is exactly today's (no offer, nothing loaded)", async () => {
    view({ onBuy: vi.fn(async () => ({ status: "paid" as const, passEnd: "2027-02-17T00:00:00.000Z" })) });
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    await screen.findByTestId("pass-checkout-paid");
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId("pass-offer-pass_success")).toBeNull();
  });
});
