// @vitest-environment jsdom
// SPEED-CLS-2 - the landing offer holds its space while its lazy chunk (or auth) loads, and only when the card WILL render.
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const flags = vi.hoisted(() => ({ packs: true }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../../lib/packs/packEntryLazy", () => ({ isPacksEntryEnabled: () => flags.packs }));
// The card itself is covered by LandingOfferCard.test.tsx (its `visible` rule is what the held slot mirrors); a stand-in keeps this file off the clock.
vi.mock("./LandingOfferCard", () => ({ default: () => <section data-testid="landing-offer" /> }));

import LandingOffer from "./LandingOfferLazy";
import { BROWSE_SIGNED_IN_HINT_KEY } from "../browse/signedInHint";

const ui = (variant: "practice-cbq" | "check") => render(<MemoryRouter><LandingOffer variant={variant} /></MemoryRouter>);
const slot = () => screen.queryByTestId("landing-offer-slot");

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  flags.packs = true;
  window.localStorage.clear();
  window.history.replaceState(null, "", "/practice-hub?cbq=1");
});
afterEach(cleanup);

describe("LandingOffer space hold", () => {
  // Runs first on purpose: React.lazy caches the chunk once it has resolved, so only the first mount in a file sees the Suspense fallback.
  it("signed out on ?cbq=1: the slot is there on the first paint, then the card replaces it", async () => {
    ui("practice-cbq");
    expect(slot()).not.toBeNull();
    expect(slot()!.className).toContain("lt-lo-slot--cbq");
    expect(await screen.findByTestId("landing-offer")).toBeTruthy();
    expect(slot()).toBeNull();
  });
  it("check variant: auth loading holds the check-sized slot", () => {
    auth.loading = true;
    ui("check");
    expect(slot()!.className).toContain("lt-lo-slot--check");
  });
  it("auth still loading, no sign-in hint: the slot is held (and the card is not shown yet)", () => {
    auth.loading = true;
    ui("practice-cbq");
    expect(slot()).not.toBeNull();
    expect(screen.queryByTestId("landing-offer")).toBeNull();
  });
  it("auth still loading on a device that was signed in: nothing is held", () => {
    auth.loading = true;
    window.localStorage.setItem(BROWSE_SIGNED_IN_HINT_KEY, "1");
    ui("practice-cbq");
    expect(slot()).toBeNull();
  });
  it("settled auth writes the device hint both ways", () => {
    auth.user = { uid: "u1" };
    ui("check");
    expect(window.localStorage.getItem(BROWSE_SIGNED_IN_HINT_KEY)).toBe("1");
    cleanup();
    auth.user = null;
    ui("check");
    expect(window.localStorage.getItem(BROWSE_SIGNED_IN_HINT_KEY)).toBeNull();
  });
  it("never holds a gap the card will not fill: signed in, packs off, or not a ?cbq=1 arrival", () => {
    auth.user = { uid: "u1" };
    ui("practice-cbq");
    expect(slot()).toBeNull();
    cleanup();
    auth.user = null;
    flags.packs = false;
    ui("practice-cbq");
    expect(slot()).toBeNull();
    cleanup();
    flags.packs = true;
    window.history.replaceState(null, "", "/practice-hub");
    ui("practice-cbq");
    expect(slot()).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    ui("check");
    expect(slot()).toBeNull();
  });
});
