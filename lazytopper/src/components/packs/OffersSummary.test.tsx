import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hits: Array<{ name: string; data?: unknown }> = [];
const taps: unknown[] = [];
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return {
    ...actual,
    trackSaleMoment: (...a: unknown[]) => taps.push(a),
    sendAnalyticsHit: (_k: string, payload: { name: string; data?: unknown }) => hits.push(payload),
  };
});

import OffersSummary, { OFFERS_SUMMARY_CSS } from "./OffersSummary";
import { boardPassPriceNow } from "../pricing/boardPassOffer";

/**
 * PRICING-DEDUPE-1 — the Important Questions summary row: collapsed by default, Pay outside <summary> (never toggles), the same Pay
 * link as the card, one PII-free open event, rules rendered with the row (no route-chunk CSS -> no CLS), no inline style objects.
 */
const mount = (showCard = true) =>
  render(
    <MemoryRouter>
      <OffersSummary surface="important-qs-end" showCard={showCard}>
        <div data-testid="inner">card + packs</div>
      </OffersSummary>
    </MemoryRouter>,
  );

beforeEach(() => {
  hits.length = 0;
  taps.length = 0;
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
});

describe("OffersSummary", () => {
  it("collapsed by default; the row names the Board Pass, the benefit and the card's own price tag", () => {
    mount();
    const details = screen.getByTestId("offers-summary").querySelector("details")!;
    expect(details.open).toBe(false);
    expect(details.contains(screen.getByTestId("inner"))).toBe(true);
    expect(screen.getByTestId("offers-summary-row").textContent).toContain("Board Pass · get every answer marked like a CBSE examiner");
    expect(screen.getByTestId("offers-summary-price").textContent).toBe(boardPassPriceNow());
  });

  it("the Pay link is outside <summary>, does not toggle, and counts the card's sale_moment_tap", () => {
    mount();
    const pay = screen.getByTestId("offers-summary-pay");
    expect(screen.getByTestId("offers-summary-row").contains(pay)).toBe(false);
    expect(pay.tagName).toBe("A"); // keyboard: a real link with its own tab stop
    fireEvent.click(pay);
    expect(screen.getByTestId("offers-summary").querySelector("details")!.open).toBe(false);
    expect(taps).toEqual([["sale_moment_tap", { surface: "important-qs-end", offer: "board_pass", rank: 1 }]]);
  });

  it("opening sends offers_summary_open { surface } once per mount (no id, no text)", async () => {
    mount();
    const details = screen.getByTestId("offers-summary").querySelector("details")!;
    for (const open of [true, false, true]) {
      details.open = open;
      await act(async () => {
        details.dispatchEvent(new Event("toggle"));
      });
    }
    expect(hits.filter((h) => h.name === "offers_summary_open")).toEqual([{ name: "offers_summary_open", data: { surface: "important-qs-end" } }]);
  });

  it("packs-only (no Board Pass): no Pay on the row", () => {
    mount(false);
    expect(screen.queryByTestId("offers-summary-pay")).toBeNull();
    expect(screen.getByTestId("offers-summary-row").textContent).toContain("Prefer practising on paper?");
  });

  it("no inline style objects; its rules render with it and fix the row height (no CLS)", () => {
    const { container } = mount();
    expect(container.querySelector("[style]")).toBeNull();
    expect(container.querySelector("style")?.textContent).toBe(OFFERS_SUMMARY_CSS);
    expect(OFFERS_SUMMARY_CSS).toMatch(/\.lt-offsum__row \{[^}]*height: 132px/);
    expect(OFFERS_SUMMARY_CSS).toMatch(/\.lt-offsum__row \{ height: 64px/);
  });
});
