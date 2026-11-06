/**
 * BROWSE-VISITOR-CARD-1 - the signed-out visitor card on /browse.
 *
 * Every "absent" assertion is paired with a control that renders the card, so a renamed testid cannot make a
 * negative pass by accident. The clock is pinned (Date only; real timers for findBy*).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const clock = vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T10:00:00+05:30"));
  return {};
});
void clock;

const auth = vi.hoisted(() => ({ state: { user: null as { uid: string } | null, loading: false } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth.state }));

const track = vi.hoisted(() => ({ shown: vi.fn(), tap: vi.fn() }));
vi.mock("../../analytics/analytics", () => ({
  trackBrowseVisitorCardShown: track.shown,
  trackBrowseVisitorCardTap: track.tap,
}));

import BrowseVisitorCardMount from "./BrowseVisitorCardLazy";
import { BOARD_PASS_TICKS } from "../pricing/pricingPlansCopy";
import { boardPassPriceDisplay, FOUNDING_OFFER_BADGE, GST_EXCLUSIVE_FROM_MS } from "../../config/pricing";
import { resetBrowseCardForTests } from "./browseVisitorCardModel";

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}`}</div>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={["/browse"]}>
      <Routes>
        <Route path="/browse" element={<BrowseVisitorCardMount />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.state = { user: null, loading: false };
  track.shown.mockClear();
  track.tap.mockClear();
  resetBrowseCardForTests();
  vi.setSystemTime(new Date("2026-11-10T10:00:00+05:30"));
});
afterEach(cleanup);

describe("BrowseVisitorCard", () => {
  it("renders for a signed-out visitor: IITian line, price from config, deadline, two buttons, about link", async () => {
    mount();
    const card = await screen.findByTestId("browse-visitor-card");
    expect(card.textContent).toContain("Made by an IITian (IIT Kanpur)");
    const first = BOARD_PASS_TICKS[0]!;
    expect(screen.getByTestId("browse-visitor-card-benefit").textContent).toBe(`${first.strong}${first.text}`);
    // GST-EXCL-1: 10 Nov is after the 00:00 IST 7 Nov GST cut-off - the price TAG reads "+ GST" (the total is at checkout).
    expect(boardPassPriceDisplay()).toBe("₹1,917 + GST");
    expect(screen.getByTestId("browse-visitor-card-price").textContent).toContain("Board Pass ₹1,917 + GST");
    expect(screen.getByTestId("browse-visitor-card-deadline").textContent).toBe(
      `${FOUNDING_OFFER_BADGE} ends 30 November. From 1 December: ₹2,499 + GST.`,
    );
    expect(screen.getByTestId("browse-visitor-card-signup").textContent).toBe("Sign up free");
    expect(screen.getByTestId("browse-visitor-card-pricing").textContent).toBe("See pricing");
    expect(screen.getByTestId("browse-visitor-card-about").textContent).toBe("What is LazyTopper?");
    expect(card.textContent).not.toMatch(/premium|refund/i);
  });

  it("links point at sign-up (back to /browse), /pricing?source=browse-card and the landing page", async () => {
    mount();
    await screen.findByTestId("browse-visitor-card");
    expect(screen.getByTestId("browse-visitor-card-signup").getAttribute("href")).toBe("/login?redirect=%2Fbrowse");
    expect(screen.getByTestId("browse-visitor-card-pricing").getAttribute("href")).toBe("/pricing?source=browse-card");
    expect(screen.getByTestId("browse-visitor-card-about").getAttribute("href")).toBe("/");
  });

  it("is absent for a signed-in user (control: the same mount shows it signed out)", async () => {
    auth.state = { user: { uid: "u1" }, loading: false };
    const { container } = mount();
    expect(container.innerHTML).toBe("");
    cleanup();
    auth.state = { user: null, loading: false };
    mount();
    expect(await screen.findByTestId("browse-visitor-card")).toBeTruthy();
  });

  it("is absent while auth is loading, then appears when it settles signed out", async () => {
    auth.state = { user: null, loading: true };
    const { container, rerender } = mount();
    expect(container.innerHTML).toBe("");
    auth.state = { user: null, loading: false };
    rerender(
      <MemoryRouter initialEntries={["/browse"]}>
        <Routes>
          <Route path="/browse" element={<BrowseVisitorCardMount />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("browse-visitor-card")).toBeTruthy();
  });

  it("dismiss hides it for the session and a re-mount stays hidden", async () => {
    mount();
    fireEvent.click(await screen.findByTestId("browse-visitor-card-dismiss"));
    expect(screen.queryByTestId("browse-visitor-card")).toBeNull();
    expect(track.tap).toHaveBeenCalledWith("dismiss");
    cleanup();
    const { container } = mount();
    expect(container.innerHTML).toBe("");
  });

  it("still works when sessionStorage throws", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      mount();
      fireEvent.click(await screen.findByTestId("browse-visitor-card-dismiss"));
      expect(screen.queryByTestId("browse-visitor-card")).toBeNull();
    } finally {
      spy.mockRestore();
      set.mockRestore();
    }
  });

  it("after the founding deadline it shows the then-current price with no founding wording or deadline line", async () => {
    vi.setSystemTime(new Date("2026-12-02T10:00:00+05:30"));
    mount();
    const card = await screen.findByTestId("browse-visitor-card");
    expect(screen.getByTestId("browse-visitor-card-price").textContent).toContain("Board Pass ₹2,499 + GST"); // GST-EXCL-1
    expect(screen.queryByTestId("browse-visitor-card-deadline")).toBeNull();
    expect(card.textContent).not.toMatch(/founding/i);
    expect(card.textContent).toContain("Made by an IITian (IIT Kanpur)");
  });
});

describe("BrowseVisitorCard analytics", () => {
  it("sends `shown` once per session, not again on a re-mount", async () => {
    mount();
    await screen.findByTestId("browse-visitor-card");
    expect(track.shown).toHaveBeenCalledTimes(1);
    cleanup();
    mount();
    await screen.findByTestId("browse-visitor-card");
    expect(track.shown).toHaveBeenCalledTimes(1);
  });

  it("sends a tap with the action for sign-up, pricing and about", async () => {
    mount();
    await screen.findByTestId("browse-visitor-card");
    fireEvent.click(screen.getByTestId("browse-visitor-card-signup"));
    expect(track.tap).toHaveBeenLastCalledWith("signup");
    cleanup();
    mount();
    fireEvent.click(await screen.findByTestId("browse-visitor-card-pricing"));
    expect(track.tap).toHaveBeenLastCalledWith("pricing");
    cleanup();
    mount();
    fireEvent.click(await screen.findByTestId("browse-visitor-card-about"));
    expect(track.tap).toHaveBeenLastCalledWith("about");
  });
  it("GST-EXCL-1: 1 ms before 00:00 IST 7 Nov the card is exactly today's (no GST); at the cut-off the tags read + GST", async () => {
    expect(GST_EXCLUSIVE_FROM_MS).toBe(Date.parse("2026-11-07T00:00:00+05:30"));
    vi.setSystemTime(new Date(GST_EXCLUSIVE_FROM_MS - 1));
    mount();
    await screen.findByTestId("browse-visitor-card");
    expect(screen.getByTestId("browse-visitor-card-price").textContent).toBe("Board Pass ₹1,917 · one payment till your boards");
    expect(screen.getByTestId("browse-visitor-card-deadline").textContent).toBe(`${FOUNDING_OFFER_BADGE} ends 30 November. From 1 December: ₹2,499.`);
    expect(screen.getByTestId("browse-visitor-card").textContent).not.toMatch(/GST/);
    cleanup();
    resetBrowseCardForTests();
    vi.setSystemTime(new Date(GST_EXCLUSIVE_FROM_MS));
    mount();
    await screen.findByTestId("browse-visitor-card");
    expect(screen.getByTestId("browse-visitor-card-price").textContent).toBe("Board Pass ₹1,917 + GST · one payment till your boards");
    expect(screen.getByTestId("browse-visitor-card-deadline").textContent).toBe(`${FOUNDING_OFFER_BADGE} ends 30 November. From 1 December: ₹2,499 + GST.`);
  });
});
