/**
 * BUY-PATH-1 - the login offer strip names the purchase a sign-in interrupted ("Sign in to finish buying <product> · ₹<price>"),
 * from the price constants / the pack catalogue; otherwise the trial line, without the word "full" (the trial is metered).
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import OfferStrip, { TRIAL_LEAD, buyIntentLine, readBuyIntent } from "./OfferStrip";
import { BOARD_PASS_NAME, boardPassPriceDisplay } from "../../config/pricing";
import { packDescription, packPriceLabel } from "../../services/packs";
import { packChapterLabel } from "../../lib/packs/packLabels";

afterEach(cleanup);

const loginWith = (redirect: string | null, variant: "panel" | "mobile" = "panel") =>
  render(
    <MemoryRouter initialEntries={[redirect === null ? "/login" : `/login?redirect=${encodeURIComponent(redirect)}`]}>
      <OfferStrip variant={variant} />
    </MemoryRouter>,
  );

describe("readBuyIntent", () => {
  it("reads the Board Pass one-tap link and the pack resume links", () => {
    expect(readBuyIntent("/pricing?buy=board_pass")).toEqual({ kind: "pass" });
    expect(readBuyIntent("/packs?buy=pack_cbq&t=science")).toEqual({ kind: "pack", sku: "pack_cbq", target: "science" });
    expect(readBuyIntent("/pricing?buy=pack_bundle&from=ads")).toEqual({ kind: "pack", sku: "pack_bundle", target: undefined });
  });
  it("CONTROL: anything else is no intent (other page, unknown sku, repeated param, unsafe redirect, none)", () => {
    expect(readBuyIntent("/dashboard?buy=board_pass")).toBeNull();
    expect(readBuyIntent("/packs?buy=board_pass")).toBeNull();
    expect(readBuyIntent("/pricing?buy=pack_free")).toBeNull();
    expect(readBuyIntent("/pricing?buy=board_pass&buy=board_pass")).toBeNull();
    expect(readBuyIntent("https://evil.example/pricing?buy=board_pass")).toBeNull();
    expect(readBuyIntent("//evil.example/pricing?buy=board_pass")).toBeNull();
    expect(readBuyIntent("/pricing")).toBeNull();
    expect(readBuyIntent(null)).toBeNull();
  });
});

describe("OfferStrip lead line", () => {
  it("no buy intent: the trial line, without the word 'full', in both variants", () => {
    loginWith(null);
    expect(screen.getByTestId("lt-offer-lead").textContent).toBe(TRIAL_LEAD);
    expect(TRIAL_LEAD).toBe("7-day trial, then free Basic");
    cleanup();
    loginWith("/dashboard", "mobile");
    expect(screen.getByTestId("lt-offer-lead").textContent).toBe(TRIAL_LEAD);
    expect(document.body.textContent).not.toMatch(/full trial/i);
  });

  it("Board Pass intent: 'Sign in to finish buying Board Pass · <price from pricing.ts>', not the trial line", () => {
    loginWith("/pricing?buy=board_pass");
    const lead = screen.getByTestId("lt-offer-lead");
    expect(lead.textContent).toBe(buyIntentLine(BOARD_PASS_NAME, boardPassPriceDisplay()));
    expect(lead.textContent).toBe(`Sign in to finish buying Board Pass · ${boardPassPriceDisplay()}`);
    expect(lead).toHaveAttribute("data-buying", "true");
  });

  it("pack intent: the pack's catalogue name and price (CBQ, chapter, bundle)", async () => {
    loginWith("/packs?buy=pack_cbq&t=science", "mobile");
    expect(await screen.findByText(buyIntentLine(packDescription("pack_cbq", "science"), packPriceLabel("pack_cbq")))).toBeTruthy();
    cleanup();
    loginWith("/packs?buy=pack_chapter&t=real-numbers");
    expect(
      await screen.findByText(buyIntentLine(packDescription("pack_chapter", "real-numbers", packChapterLabel("real-numbers")), packPriceLabel("pack_chapter"))),
    ).toBeTruthy();
    cleanup();
    loginWith("/pricing?buy=pack_bundle");
    expect(await screen.findByText(buyIntentLine(packDescription("pack_bundle", undefined), packPriceLabel("pack_bundle")))).toBeTruthy();
  });

  it("CONTROL: a pack intent with an invalid target falls back to the trial line", async () => {
    loginWith("/packs?buy=pack_cbq&t=history");
    expect(await screen.findByText(TRIAL_LEAD)).toBeTruthy();
  });
});
