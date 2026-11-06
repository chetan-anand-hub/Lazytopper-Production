// @vitest-environment jsdom
// AD-LANDING-OFFER-1 - the compact signed-out offer on the two YouTube ad landings.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const flags = vi.hoisted(() => ({ packs: true, intent: "default" }));
const track = vi.hoisted(() => vi.fn());
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../../lib/packs/packEntryLazy", () => ({ isPacksEntryEnabled: () => flags.packs }));
vi.mock("../guide/guideInputs", () => ({ guidePlanFor: () => ({ intent: flags.intent, line: "", options: [] }) }));
vi.mock("../../analytics/analytics", () => ({ trackSaleMoment: track, sendAnalyticsHit: vi.fn() }));
vi.mock("../pricing/boardPassOffer", () => ({ boardPassPriceNow: () => "₹1,917" }));

import LandingOfferCard, { __resetLandingOfferShownForTests, isCbqArrival } from "./LandingOfferCard";
import { CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
import { buyHrefFor } from "./offersModel";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import {
  CBQ_LANDING_SUB,
  CBQ_LANDING_TITLE,
  LANDING_BANNED_WORDS,
  cbqBoardPassLine,
  cbqButtonLabel,
  checkBoardPassLine,
  checkPacksLine,
  cheapestPackLabel,
} from "./landingOfferModel";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPriceLabel } from "../../services/packs";

function setSearch(search: string) {
  window.history.replaceState(null, "", `/practice-hub${search}`);
}

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  flags.packs = true;
  flags.intent = "default";
  track.mockClear();
  __resetLandingOfferShownForTests();
  setSearch("?cbq=1");
});
afterEach(cleanup);

const ui = (variant: "practice-cbq" | "check") => render(<MemoryRouter><LandingOfferCard variant={variant} /></MemoryRouter>);

describe("copy (Google Ads policy, constants only)", () => {
  it("uses the CBQ floor constant and the pack price", () => {
    expect(CBQ_LANDING_TITLE).toContain(CBQ_SUBJECT_CLAIM);
    expect(cbqButtonLabel("maths")).toBe(`Maths CBQ Pack ${packPriceLabel("pack_cbq")}`);
    expect(cbqButtonLabel("science")).toBe(`Science CBQ Pack ${packPriceLabel("pack_cbq")}`);
    expect(cheapestPackLabel({ pack_chapter: 49, pack_cbq: 199 })).toBe(packPriceLabel("pack_chapter"));
  });
  it("no banned word in any new heading or CTA", () => {
    for (const s of [CBQ_LANDING_TITLE, CBQ_LANDING_SUB, cbqBoardPassLine("₹1,917"), checkBoardPassLine("₹1,917"), checkPacksLine("₹49"), cbqButtonLabel("maths")]) {
      expect(s).not.toMatch(LANDING_BANNED_WORDS);
    }
  });
  it("no figure when the Board Pass cannot be quoted", () => {
    expect(checkBoardPassLine(null)).not.toMatch(/₹/);
    expect(cbqBoardPassLine(null)).not.toMatch(/₹/);
  });
});

describe("practice-cbq variant", () => {
  it("signed out on ?cbq=1: two one-tap CBQ buys, a sample, the Board Pass link", () => {
    ui("practice-cbq");
    expect(screen.getByTestId("landing-offer-buy-maths").getAttribute("href")).toBe(buyHrefFor("pack_cbq", "maths"));
    expect(screen.getByTestId("landing-offer-buy-science").getAttribute("href")).toBe(buyHrefFor("pack_cbq", "science"));
    expect(screen.getByTestId("landing-offer-board-pass").getAttribute("href")).toBe(BOARD_PASS_BUY_PATH);
    expect(screen.getByTestId("landing-offer-board-pass").textContent).toContain("₹1,917");
    expect(screen.getByTestId("pack-sample-choice-pack_cbq")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("sale_moment_shown", { surface: "landing-practice-cbq", offer: "pack_cbq" });
    fireEvent.click(screen.getByTestId("landing-offer-buy-science"));
    expect(track).toHaveBeenCalledWith("sale_moment_tap", { surface: "landing-practice-cbq", offer: "pack_cbq", rank: 2 });
  });
  it("a CBQ landing intent without ?cbq=1 also shows it", () => {
    setSearch("");
    flags.intent = "cbq";
    ui("practice-cbq");
    expect(screen.getByTestId("landing-offer")).toBeTruthy();
  });
  it("not a CBQ arrival: nothing", () => {
    setSearch("");
    ui("practice-cbq");
    expect(screen.queryByTestId("landing-offer")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
  it("signed in, or auth still loading: nothing", () => {
    auth.user = { uid: "u1" };
    const a = ui("practice-cbq");
    expect(screen.queryByTestId("landing-offer")).toBeNull();
    a.unmount();
    auth.user = null;
    auth.loading = true;
    ui("practice-cbq");
    expect(screen.queryByTestId("landing-offer")).toBeNull();
  });
  it("packs switched off: nothing", () => {
    flags.packs = false;
    ui("practice-cbq");
    expect(screen.queryByTestId("landing-offer")).toBeNull();
  });
  it("isCbqArrival reads ?cbq=1", () => {
    expect(isCbqArrival("?cbq=1")).toBe(true);
    expect(isCbqArrival("?cbq=0")).toBe(false);
  });
});

describe("check variant", () => {
  it("signed out: Board Pass first, then PDF packs -> /pricing#packs", () => {
    setSearch("");
    ui("check");
    const links = screen.getByTestId("landing-offer").querySelectorAll("a");
    expect(links[0].getAttribute("href")).toBe(BOARD_PASS_BUY_PATH);
    expect(links[1].getAttribute("href")).toBe("/pricing#packs");
    expect(links[1].textContent).toContain("from ₹49");
    expect(track).toHaveBeenCalledWith("sale_moment_shown", { surface: "landing-check", offer: "board_pass" });
  });
  it("packs off keeps the Board Pass line only", () => {
    flags.packs = false;
    ui("check");
    expect(screen.getByTestId("landing-offer-board-pass")).toBeTruthy();
    expect(screen.queryByTestId("landing-offer-packs")).toBeNull();
  });
  it("signed in: nothing", () => {
    auth.user = { uid: "u1" };
    ui("check");
    expect(screen.queryByTestId("landing-offer")).toBeNull();
  });
});

describe("review fixes (fix round 1)", () => {
  it("rendered DOM text and aria labels carry no banned word (both variants)", () => {
    for (const v of ["practice-cbq", "check"] as const) {
      const r = ui(v);
      const el = screen.getByTestId("landing-offer");
      const aria = [el, ...el.querySelectorAll("*")].map((n) => n.getAttribute("aria-label") ?? "").join(" ");
      expect(el.textContent ?? "").not.toMatch(LANDING_BANNED_WORDS);
      expect(aria).not.toMatch(LANDING_BANNED_WORDS);
      r.unmount();
    }
  });
  it("sale_moment_shown fires ONCE per page view across two mounts (the /check-improve remount)", () => {
    setSearch("");
    const a = ui("check");
    a.unmount();
    ui("check");
    expect(track.mock.calls.filter((c) => c[0] === "sale_moment_shown")).toHaveLength(1);
  });
  it("a new page view (new history entry) may send it again", () => {
    setSearch("");
    const a = ui("check");
    a.unmount();
    window.history.pushState({ key: "next" }, "", "/check-improve");
    ui("check");
    expect(track.mock.calls.filter((c) => c[0] === "sale_moment_shown")).toHaveLength(2);
  });
  it("the full button and Board Pass words stay in the markup (phones only hide parts with CSS)", () => {
    ui("practice-cbq");
    expect(screen.getByTestId("landing-offer-buy-maths").textContent).toBe(`Maths CBQ Pack ${packPriceLabel("pack_cbq")}`);
    expect(screen.getByTestId("landing-offer-board-pass").textContent).toBe(cbqBoardPassLine("₹1,917"));
  });
});
