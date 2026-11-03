/**
 * PRICING-LADDER-1 / PRICING-B-1 - the daily anchor maths, the /pricing order (Option B v3), the phone sticky bar, and the old
 * PacksStrip component (no longer mounted on /pricing; kept for lane PACK-TERMS-1 and tested here until it is retired).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
const paid = vi.hoisted(() => ({ value: false }));
vi.mock("../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.value }));

import PricingPage, { boardPassPerDay } from "./PricingPage";
import PacksStrip from "../components/pricing/PacksStrip";
import StickyPassBar, { stickyMode } from "../components/pricing/StickyPassBar";

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

describe("PricingPage - PRICING-B-1 layout", () => {
  const renderPage = () => render(<MemoryRouter><PricingPage /></MemoryRouter>);

  it("PRICING-B-1: no daily anchor line any more (the owner-approved card shows the price, its coverage and the founding line)", () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-testid="till-boards-figures"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="till-boards-per-day"]')).toBeNull();
  });

  it("PRICING-ONE-1: from=for_parents (with #packs or #cbq) shows the back-to-parents link near the top AND by the target; not without it", () => {
    for (const hash of ["#packs", "#cbq"]) {
      sessionStorage.clear();
      const { unmount } = render(<MemoryRouter initialEntries={[`/pricing?from=for_parents${hash}`]}><PricingPage /></MemoryRouter>);
      expect(screen.getByTestId("parent-return").getAttribute("href")).toBe("/for-parents");
      expect(screen.getByTestId(hash === "#packs" ? "parent-return-packs" : "parent-return-cbq").getAttribute("href")).toBe("/for-parents");
      unmount();
    }
    sessionStorage.clear();
    render(<MemoryRouter initialEntries={["/pricing#packs"]}><PricingPage /></MemoryRouter>);
    expect(screen.queryByTestId("parent-return")).toBeNull();
  });

  it("top to bottom: Board Pass card, CBQ Packs (#cbq), More printed practice (#packs), What you get with each, the proof (phone), FAQ, the Basic line", () => {
    const { container } = renderPage();
    const order = [
      '[data-testid="pricing-board-pass"]',
      "#cbq",
      "#packs",
      '[data-testid="pricing-what-you-get"]',
      '[data-testid="pricing-proof-phone"]',
      '[data-testid="pricing-faq"]',
      '[data-testid="pricing-basic-line"]',
    ].map(sel => container.querySelector(sel)!);
    order.forEach((el, i) => expect(el, String(i)).not.toBeNull());
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // Removed from /pricing: the dark CBQ band's headline, the old strip grid, the separate Basic card, the credit line.
    expect(container.querySelector(".lt-cbq, .lt-packoffer, .lt-pricing-card--basic")).toBeNull();
    expect(flat(container.querySelector(".lt-pricing-inner"))).not.toMatch(/Half your board paper is competency-based|comes off/);
    // No swipe shelf: nothing scrolls sideways except the folded compare table.
    expect(container.querySelectorAll(".lt-pricing-compare-scroll")).toHaveLength(1);
  });

  it("the Board Pass card reads ticks -> price -> Pay area -> paper line -> trial (DOM order = reading order)", () => {
    const { container } = renderPage();
    const pass = container.querySelector('[data-testid="pricing-board-pass"]')!;
    const order = [".lt-pp-ticks", '[data-testid="till-boards"]', '[data-testid="pricing-passes"]', '[data-testid="pricing-paper-link"]', ".lt-pricing-trial-slot"].map(
      sel => pass.querySelector(sel)!,
    );
    order.forEach(el => expect(el).not.toBeNull());
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});

describe("PacksStrip - the ladder", () => {
  const renderStrip = () => render(<MemoryRouter><PacksStrip /></MemoryRouter>);

  it("PACK-TERMS-1: no Board Pass credit promise anywhere in the strip (packs and the Board Pass are different products)", () => {
    const { container } = renderStrip();
    expect(screen.queryByTestId("pricing-pack-credit")).toBeNull();
    expect(container.textContent).not.toMatch(/pack price comes off|within 7 days|comes off|taken off|credited/i);
  });

  it("heading, sub and four pack tiles that open the shared pop-up (buttons, not links into /packs)", () => {
    const { container } = renderStrip();
    expect(flat(container.querySelector("#lt-packoffer-h"))).toBe("PDF packs: printed practice, one-time");
    expect(flat(container.querySelector(".lt-packoffer__sub"))).toMatch(/^From ₹49 · one-time · never renews · buy any pack right here$/);
    const tiles = Array.from(container.querySelectorAll("button.lt-packoffer__item")).map(a => a.getAttribute("data-pack"));
    expect(tiles).toEqual(["chapter", "mock", "subject", "bundle"]);
    expect(container.querySelectorAll("a.lt-packoffer__item")).toHaveLength(0);
    expect(container.querySelector('a[href^="/packs"]')).toBeNull();
    expect(container.textContent).not.toMatch(/most popular|students? (have|bought)/i);
  });

  it("PRICING-ONE-1: a student who has BOUGHT Premium sees the same strip (the page is uniform)", () => {
    paid.value = true;
    const { container } = renderStrip();
    expect(container.querySelector('[data-testid="pricing-packs-strip"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cbq-band"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pricing-pack-credit"]')).toBeNull();
  });
});

describe("StickyPassBar (PRICING-B-1)", () => {
  it("stickyMode: hidden while Pay is on screen or over the footer; the CBQ bar over #packs; the Board Pass bar elsewhere", () => {
    const base = { payVisible: false, packsVisible: false, footerVisible: false, showPass: true, cbqAvailable: true };
    expect(stickyMode({ ...base, payVisible: true })).toBe("none");
    expect(stickyMode({ ...base, footerVisible: true, packsVisible: true })).toBe("none");
    expect(stickyMode({ ...base, packsVisible: true })).toBe("cbq");
    expect(stickyMode({ ...base, packsVisible: true, cbqAvailable: false })).toBe("pass");
    expect(stickyMode(base)).toBe("pass");
    expect(stickyMode({ ...base, showPass: false })).toBe("none");
    expect(stickyMode({ ...base, showPass: false, packsVisible: true })).toBe("cbq");
  });

  it("renders nothing without IntersectionObserver (never in the prerender) and follows the observers once mounted", async () => {
    const none = render(<StickyPassBar passWatchTestId="x" packsId="y" showPass onPass={() => undefined} cbq={null} />);
    expect(none.container.firstChild).toBeNull();
    none.unmount();

    const observers: Array<{ cb: (e: unknown[]) => void; el: Element | null }> = [];
    class FakeIO {
      cb: (e: unknown[]) => void;
      constructor(cb: (e: unknown[]) => void) { this.cb = cb; }
      observe(el: Element) { observers.push({ cb: this.cb, el }); }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeIO);
    const pay = document.createElement("div");
    pay.setAttribute("data-testid", "pricing-passes");
    const packs = document.createElement("section");
    packs.id = "packs";
    const footer = document.createElement("footer");
    footer.className = "lt-public-legal";
    document.body.append(pay, packs, footer);
    const onPass = vi.fn();
    const onBuy = vi.fn();
    const { act } = await import("@testing-library/react");
    const { container } = render(
      <StickyPassBar passWatchTestId="pricing-passes" packsId="packs" showPass onPass={onPass} cbq={{ subject: "science", onBuy }} />,
    );
    const fire = (el: Element, isIntersecting: boolean) =>
      act(() => observers.filter(o => o.el === el).forEach(o => o.cb([{ isIntersecting }])));
    // Pay counts as visible until the observer reports: no bar on load.
    expect(container.querySelector('[data-testid="pricing-sticky-bar"]')).toBeNull();
    fire(pay, false);
    const bar = () => container.querySelector('[data-testid="pricing-sticky-bar"]');
    expect(flat(bar())).toBe("Board Pass ₹1,917Pay ₹1,917");
    (container.querySelector('[data-testid="sticky-pay-pass"]') as HTMLButtonElement).click();
    expect(onPass).toHaveBeenCalledTimes(1);
    fire(packs, true);
    expect(flat(bar())).toBe("Science CBQ Pack ₹199Buy ₹199");
    (container.querySelector('[data-testid="sticky-buy-cbq"]') as HTMLButtonElement).click();
    expect(onBuy).toHaveBeenCalledTimes(1);
    fire(footer, true);
    expect(bar()).toBeNull();
    fire(footer, false);
    fire(pay, true);
    expect(bar()).toBeNull();
    pay.remove();
    packs.remove();
    footer.remove();
    vi.unstubAllGlobals();
  });
});

describe("CBQ-PACK-1: the CBQ band on /pricing", () => {
  const strip = () => render(<MemoryRouter><PacksStrip /></MemoryRouter>);
  it("sits before the other packs; a Maths and a Science button, each Rs 199, linking into the buy pop-up; no 'both'", () => {
    const { container } = strip();
    const band = screen.getByTestId("cbq-band");
    const others = screen.getByTestId("pricing-packs-strip");
    expect(band.compareDocumentPosition(others) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(flat(band)).toContain("Half your board paper is competency-based.");
    expect(flat(band)).toContain("NEW · CBQ");
    expect(flat(band)).not.toMatch(/for both|both subjects/i);
    expect(screen.getByTestId("pricing-cbq-maths").tagName).toBe("BUTTON");
    expect(screen.getByTestId("pricing-cbq-science").tagName).toBe("BUTTON");
    expect(flat(screen.getByTestId("pricing-cbq-maths"))).toBe("Maths CBQ Pack · ₹199");
    expect(container.querySelectorAll(".lt-packoffer__cell")).toHaveLength(4); // the other four packs are unchanged
  });
  it("PRICING-ONE-1: shown for paid Premium too", () => {
    paid.value = true;
    strip();
    expect(screen.getByTestId("cbq-band")).toBeTruthy();
  });
});
