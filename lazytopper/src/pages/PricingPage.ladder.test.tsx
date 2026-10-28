/**
 * PRICING-LADDER-1 - the ladder layout: daily anchor maths, Basic folded (not removed), the Premium card's mobile order, and the
 * packs ladder (links, the PACK_CREDIT_LIVE line in both states, hidden for paid Premium).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
const paid = vi.hoisted(() => ({ value: false }));
vi.mock("../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.value }));

import PricingPage, { boardPassPerDay } from "./PricingPage";
import PacksStrip, { PACK_CREDIT_LIVE, PACK_CREDIT_LINE } from "../components/pricing/PacksStrip";
import StickyPassBar from "../components/pricing/StickyPassBar";

beforeEach(() => {
  paid.value = false;
  vi.useFakeTimers({ now: new Date("2026-10-25T06:30:00.000Z"), toFake: ["Date"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const flat = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("boardPassPerDay", () => {
  const now = new Date("2026-10-25T06:30:00.000Z"); // 25 Oct IST
  it("is ceil(price / days to the board date), IST calendar days", () => {
    // 25 Oct 2026 -> 17 Feb 2027 = 115 days; 2396 / 115 = 20.8 -> 21
    expect(boardPassPerDay(now, "2027-02-17", 2396)).toBe(21);
    expect(boardPassPerDay(now, "2027-02-17", 115)).toBe(1);
    expect(boardPassPerDay(now, "2027-02-17", 116)).toBe(2);
  });
  it("uses the IST date, not the UTC one (18:40 UTC is already the next day in IST)", () => {
    const late = new Date("2026-10-25T19:00:00.000Z"); // 26 Oct 00:30 IST -> 114 days
    expect(boardPassPerDay(late, "2027-02-17", 114)).toBe(1);
    expect(boardPassPerDay(late, "2027-02-17", 115)).toBe(2);
  });
  it("is null (line hidden) for a bad date, a past or same-day board date, or a non-finite price", () => {
    expect(boardPassPerDay(now, "not-a-date", 2396)).toBeNull();
    expect(boardPassPerDay(now, "2026-10-25", 2396)).toBeNull();
    expect(boardPassPerDay(now, "2026-01-01", 2396)).toBeNull();
    expect(boardPassPerDay(now, "2027-02-17", Number.NaN)).toBeNull();
    expect(boardPassPerDay(new Date(Number.NaN), "2027-02-17", 2396)).toBeNull();
  });
});

describe("PricingPage - ladder layout", () => {
  const renderPage = () => render(<MemoryRouter><PricingPage /></MemoryRouter>);

  it("renders the daily anchor after mount, inside the figures node, and not on the first static render", () => {
    const { container } = renderPage();
    const line = container.querySelector('[data-testid="till-boards-per-day"]');
    expect(line).not.toBeNull();
    expect(flat(line)).toMatch(/^≈ ₹\d+ a day till your boards$/);
    expect(line!.closest('[data-testid="till-boards-figures"]')).not.toBeNull();
  });

  it("Basic is folded, not removed: a closed <details> holding every include and limit", () => {
    const { container } = renderPage();
    const details = container.querySelector('details[data-testid="pricing-basic-details"]') as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(flat(details.querySelector("summary"))).toBe("See what's free, and what's not");
    expect(details.querySelectorAll('ul[aria-label="Basic plan features"] li').length).toBeGreaterThanOrEqual(5);
    expect(details.querySelectorAll('ul[aria-label="What Basic does not include"] li')).toHaveLength(6);
    const basic = container.querySelector(".lt-pricing-card--basic")!;
    expect(flat(basic.querySelector(".lt-pricing-basic-head"))).toBe("Just browsing? Basic is free forever");
    expect(flat(basic.querySelector("button.lt-pricing-cta"))).toBe("Start free");
  });

  it("the Premium card reads passes -> trial -> founding note -> features -> examiner link", () => {
    const { container } = renderPage();
    const premium = container.querySelector(".lt-pricing-card--premium")!;
    const order = [
      '[data-testid="pricing-passes"]',
      ".lt-pricing-trial-slot",
      '[data-testid="pricing-founding-until"]',
      'ul[aria-label="Premium plan features"]',
      ".lt-pricing-mark-guide",
    ].map(sel => premium.querySelector(sel)!);
    order.forEach(el => expect(el).not.toBeNull());
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

describe("PacksStrip - the ladder", () => {
  const renderStrip = (props: { creditLive?: boolean } = {}) => render(<MemoryRouter><PacksStrip {...props} /></MemoryRouter>);

  it("ships with the credit line OFF (PACK_CREDIT_LIVE is false)", () => {
    expect(PACK_CREDIT_LIVE).toBe(false);
    renderStrip();
    expect(screen.queryByTestId("pricing-pack-credit")).toBeNull();
    expect(screen.queryByText(PACK_CREDIT_LINE)).toBeNull();
  });

  it("credit line ON: the line renders word for word", () => {
    renderStrip({ creditLive: true });
    expect(flat(screen.getByTestId("pricing-pack-credit"))).toBe("Take the Board Pass within 7 days and the pack price comes off.");
  });

  it("heading, sub, four tiles linking to /packs?pack=..., and See all PDF packs", () => {
    const { container } = renderStrip();
    expect(flat(container.querySelector("h2"))).toBe("Not ready for Premium yet? Start with a PDF pack");
    expect(flat(container.querySelector(".lt-packoffer__sub"))).toMatch(/^Printed practice from ₹49 · one-time · never renews$/);
    const hrefs = Array.from(container.querySelectorAll("a.lt-packoffer__item")).map(a => a.getAttribute("href"));
    expect(hrefs).toEqual(["/packs?pack=chapter", "/packs?pack=mock", "/packs?pack=subject", "/packs?pack=bundle"]);
    expect(screen.getByRole("link", { name: "See all PDF packs" }).getAttribute("href")).toBe("/packs");
    expect(container.textContent).not.toMatch(/most popular|students? (have|bought)/i);
  });

  it("renders nothing for a student who has BOUGHT Premium", () => {
    paid.value = true;
    const { container } = renderStrip({ creditLive: true });
    expect(container.firstChild).toBeNull();
  });
});

describe("StickyPassBar", () => {
  it("renders nothing on the first render and for a paid student", () => {
    const { container } = render(<StickyPassBar watchTestId="x" targetId="y" foundingRate hidden />);
    expect(container.firstChild).toBeNull();
  });
  it("stays hidden until the watched element has scrolled out upward, then shows the Board Pass price and hides again", async () => {
    const callbacks: Array<(e: unknown[]) => void> = [];
    class FakeIO {
      constructor(cb: (e: unknown[]) => void) { callbacks.push(cb); }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeIO);
    const watched = document.createElement("div");
    watched.setAttribute("data-testid", "pricing-passes");
    document.body.appendChild(watched);
    const { act } = await import("@testing-library/react");
    const { container } = render(<StickyPassBar watchTestId="pricing-passes" targetId="y" foundingRate />);
    expect(container.querySelector('[data-testid="pricing-sticky-bar"]')).toBeNull();
    act(() => callbacks[0]([{ isIntersecting: false, boundingClientRect: { bottom: -40 } }]));
    const bar = container.querySelector('[data-testid="pricing-sticky-bar"]');
    expect(bar).not.toBeNull();
    expect(flat(bar)).toMatch(/^Board Pass ₹[\d,]+ Get it$/);
    act(() => callbacks[0]([{ isIntersecting: false, boundingClientRect: { bottom: 900 } }])); // below the fold: still hidden
    expect(container.querySelector('[data-testid="pricing-sticky-bar"]')).toBeNull();
    act(() => callbacks[0]([{ isIntersecting: true, boundingClientRect: { bottom: 300 } }]));
    expect(container.querySelector('[data-testid="pricing-sticky-bar"]')).toBeNull();
    watched.remove();
    vi.unstubAllGlobals();
  });
});
