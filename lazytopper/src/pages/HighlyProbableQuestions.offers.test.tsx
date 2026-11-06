// IQ-PACKS-1 - the Important Questions page carries the same buying block the results show (Board Pass card, then the pack rows).
// PRICING-DEDUPE-1 (owner, 6 Nov 2026) - once, at the end, collapsed to a summary row whose Pay is the card's own Pay link.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const H = vi.hoisted(() => ({
  user: { uid: "u1" } as { uid: string } | null,
  tier: "trial",
  owned: [] as Array<{ packId: string }>,
  listeners: [] as Array<(uid: string, cloud: unknown) => void>,
  track: vi.fn(),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: H.user, loading: false }) }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: H.tier, plan: "none", trialStartDate: H.tier === "free" ? null : "2026-10-30T00:00:00.000Z", trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: (cb: (uid: string, cloud: unknown) => void) => {
      H.listeners.push(cb);
      return () => {
        H.listeners = H.listeners.filter((l) => l !== cb);
      };
    },
  };
});
vi.mock("../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/packs")>();
  return { ...actual, fetchMyPacks: () => Promise.resolve({ packs: H.owned, licensee: { name: "", email: "" }, boardPassCredit: null }) };
});
vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return {
    ...actual,
    trackSaleMoment: (...a: unknown[]) => H.track(...a),
  };
});

import HighlyProbableQuestions from "./HighlyProbableQuestions";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";
import { packIdOf } from "../services/packs";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPayLabel } from "../services/packs";
import { boardPassPriceNow } from "../components/pricing/boardPassOffer";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/highly-probable/:grade/:subject" element={<HighlyProbableQuestions />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  window.sessionStorage.clear();
  H.user = { uid: "u1" };
  H.tier = "trial";
  H.owned = [];
  H.listeners = [];
  H.track.mockClear();
  resetOwnedPacksCache();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const rowIds = (block: HTMLElement) => Array.from(block.querySelectorAll("[data-testid^='offers-row-']")).map((n) => n.getAttribute("data-testid"));

describe("Important Questions page buying block", () => {
  it("signed out: ONE block, at the end, collapsed to a summary row (PRICING-DEDUPE-1 reverses IQ-PACKS-1's two)", async () => {
    H.user = null;
    renderAt("/highly-probable/10/Science");
    await screen.findAllByTestId("offers-packs");
    const blocks = screen.getAllByTestId("offers-block");
    expect(blocks.map((b) => b.getAttribute("data-surface"))).toEqual(["important-qs-end"]);
    const summary = screen.getByTestId("offers-summary");
    const details = summary.querySelector("details")!;
    expect(details.open).toBe(false); // collapsed by default
    expect(details.contains(blocks[0])).toBe(true); // the unchanged card + packs are inside
    // the row: name, benefit, the card's own price tag, and a Pay link that is NOT inside <summary>
    const row = screen.getByTestId("offers-summary-row");
    expect(row.textContent).toContain("Board Pass · get every answer marked like a CBSE examiner · ");
    expect(screen.getByTestId("offers-summary-price").textContent).toBe(boardPassPriceNow());
    const rowPay = screen.getByTestId("offers-summary-pay");
    const cardPay = blocks[0].querySelector("[data-testid='offers-pay']")!;
    expect(row.contains(rowPay)).toBe(false);
    expect(rowPay.getAttribute("href")).toBe(cardPay.getAttribute("href"));
    expect(rowPay.textContent).toBe(cardPay.textContent); // same label helper -> flips to the GST amount with the card
    expect(rowPay.textContent).toMatch(/^Pay ₹/);
    for (const b of blocks) {
      expect(b.querySelector("[data-testid='offers-board-pass']")).not.toBeNull();
      expect(b.querySelector("[data-testid='offers-pay']")).toHaveAttribute("href", "/pricing?buy=board_pass");
      expect(rowIds(b)).toEqual(["offers-row-pack_bundle", "offers-row-pack_subject", "offers-row-pack_cbq", "offers-row-pack_mock"]);
      expect(b.querySelector("[data-testid='offers-buy-pack_cbq']")).toHaveAttribute("href", "/packs?buy=pack_cbq&t=science");
      expect(b.querySelector("[data-testid='offers-buy-pack_bundle']")).toHaveTextContent(packPayLabel("pack_bundle"));
    }
    // nothing before the "Question stacks" heading any more: the one block is after it
    const heading = screen.getByText("Question stacks");
    expect(blocks[0].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(H.track).toHaveBeenCalledWith("sale_moment_shown", { surface: "important-qs-end", offer: "board_pass", rank: 1 });
    expect(H.track).not.toHaveBeenCalledWith("sale_moment_shown", expect.objectContaining({ surface: "important-qs" }));
  });

  it("the row's Pay never toggles the block and counts the same tap as the card's Pay", async () => {
    H.user = null;
    renderAt("/highly-probable/10/Science");
    await screen.findAllByTestId("offers-packs");
    const details = screen.getByTestId("offers-summary").querySelector("details")!;
    fireEvent.click(screen.getByTestId("offers-summary-pay"));
    expect(details.open).toBe(false);
    expect(H.track).toHaveBeenCalledWith("sale_moment_tap", { surface: "important-qs-end", offer: "board_pass", rank: 1 });
    // (the open event is pinned in OffersSummary.test.tsx)
  });

  it("a known trial / Basic student sees the card and the rows; Maths uses the Maths packs", async () => {
    renderAt("/highly-probable/10/Maths");
    await screen.findAllByTestId("offers-packs");
    expect(screen.getAllByTestId("offers-board-pass")).toHaveLength(1);
    expect(screen.getAllByTestId("offers-buy-pack_cbq")[0]).toHaveAttribute("href", "/packs?buy=pack_cbq&t=maths");
  });

  it("a chapter filtered by the topic param adds that Chapter Pack row", async () => {
    renderAt("/highly-probable/10/Science?topic=electricity");
    await screen.findAllByTestId("offers-packs");
    expect(screen.getAllByTestId("offers-buy-pack_chapter")[0]).toHaveAttribute("href", "/packs?buy=pack_chapter&t=electricity");
  });

  it("Premium sees the pack rows but no Board Pass card", async () => {
    H.tier = "premium";
    renderAt("/highly-probable/10/Science");
    await screen.findAllByTestId("offers-packs");
    expect(screen.queryByTestId("offers-board-pass")).toBeNull();
    expect(screen.getAllByTestId("offers-row-pack_cbq")).toHaveLength(1);
    // no Board Pass -> no Pay on the row; the row names the packs instead
    expect(screen.queryByTestId("offers-summary-pay")).toBeNull();
    expect(screen.getByTestId("offers-summary-row").textContent).toContain("Prefer practising on paper?");
  });

  it("an owned pack is hidden (the CBQ Pack the student already has)", async () => {
    H.owned = [{ packId: packIdOf("pack_cbq", "science") }];
    renderAt("/highly-probable/10/Science");
    await screen.findAllByTestId("offers-packs");
    expect(screen.queryByTestId("offers-row-pack_cbq")).toBeNull();
    expect(screen.getAllByTestId("offers-row-pack_subject")).toHaveLength(1);
  });

  it("nothing while the student's record is not yet known (a free cache that may hide a paid student)", async () => {
    H.tier = "free";
    renderAt("/highly-probable/10/Science");
    await act(async () => {});
    // free + never trialled + not yet heard from the cloud -> unknown -> no block at all
    expect(screen.queryByTestId("offers-block")).toBeNull();
    await act(async () => {
      H.listeners.forEach((l) => l("u1", { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null }));
    });
    expect(await screen.findAllByTestId("offers-block")).toHaveLength(1);
  });

  it("packs switched off: no block", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    H.user = null;
    renderAt("/highly-probable/10/Science");
    await act(async () => {});
    expect(screen.queryByTestId("offers-block")).toBeNull();
  });
});
