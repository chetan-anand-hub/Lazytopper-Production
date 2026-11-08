import { useLayoutEffect } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

// PARENTS-PAY-1: the page mounts the shared pack shop, which reads the auth context (signed out here).
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import ForParentsPage, { PAY_HELP_HREF, PAY_ONE_LINE, parentPriceModel } from "../pages/ForParentsPage";
import { FOUNDER_BADGE_TEXT } from "../components/brand/FounderBadge";
import { tillBoardsQuote } from "./pricing";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const OPEN = new Date("2026-10-28T10:00:00+05:30");
const CLOSED = new Date("2026-12-05T10:00:00+05:30");
const BOARDS = "2027-02-17";

describe("PARENTS-PAY-1 — price and how to pay on /for-parents", () => {
  it("derives the Board Pass and per-day figures from config; the model has NO month price or founding line (PRICE-FIXED-1)", () => {
    const m = parentPriceModel(OPEN, BOARDS)!;
    const q = tillBoardsQuote(OPEN, BOARDS)!;
    expect(m.boardPassDisplay).toBe(q.priceDisplay);
    expect(m.boardPassDisplay).toBe("₹1,917");
    // 28 Oct 2026 -> 17 Feb 2027 = 112 days
    expect(m.perDayLine).toBe(`≈ ₹${Math.ceil(q.priceInr / 112)} a day till the boards`);
    expect(Object.keys(m).sort()).toEqual(["boardPassDisplay", "boardPassPayDisplay", "perDayLine", "untilLabel"]);
    // GST-EXCL-1: before 7 Nov 2026 the Pay figure IS the price (all-in).
    expect(m.boardPassPayDisplay).toBe("₹1,917");
  });

  it("the Board Pass price is ₹1,917 before the founding deadline and ₹2,499 from it", () => {
    expect(parentPriceModel(OPEN, BOARDS)!.boardPassDisplay).toBe("₹1,917");
    // GST-EXCL-1: after the 7 Nov 2026 cut-off the tag says "+ GST", the Pay figure is the total, and the per-day line is gone.
    expect(parentPriceModel(CLOSED, BOARDS)!.boardPassDisplay).toBe("₹2,499 + GST");
    expect(parentPriceModel(CLOSED, BOARDS)!.boardPassPayDisplay).toBe("₹2,949");
    expect(parentPriceModel(CLOSED, BOARDS)!.perDayLine).toBeNull();
  });

  it("hides the per-day line when the board date is unusable or past", () => {
    expect(parentPriceModel(OPEN, "nonsense")).toBeNull();
    expect(parentPriceModel(new Date("2027-03-01T10:00:00+05:30"), "2027-02-17")?.perDayLine ?? null).toBeNull();
  });

  it("static markup carries no rupee figure (prerender cannot go stale) but has the one pay line, the Pay button and the badge", () => {
    const html = renderToStaticMarkup(<MemoryRouter><ForParentsPage /></MemoryRouter>);
    expect(html).not.toMatch(/₹/);
    // The 3-step block and the WhatsApp-as-payment note are gone; one line replaces them.
    expect(html).not.toContain("How to pay for your child");
    expect(html).not.toContain("There is no payment on this page");
    expect(html).not.toContain("Forward link to parents");
    expect(html).toContain(PAY_ONE_LINE);
    expect(html).toContain('data-testid="fp-pay-hero"');
    expect(html).toContain('data-testid="fp-pay-price"');
    expect(html).toContain(FOUNDER_BADGE_TEXT);
    expect(html).toContain(">See the price<");
    // Board Pass only, never "Premium" (also in the meta the prerender writes from writeStaticHeads).
    expect(html).not.toMatch(/Premium/);
  });

  it("after mount shows the figures; Pay is a real button with the price, WhatsApp is only the secondary Questions link", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T10:00:00+05:30")); // before the founding deadline: the Board Pass is 1,917
    render(<MemoryRouter><ForParentsPage /></MemoryRouter>);
    await act(async () => {});
    expect(screen.getByTestId("fp-price-figures").textContent).toMatch(/Board Pass\s*₹1,917/);
    expect(screen.getByTestId("fp-price-figures").textContent).not.toMatch(/Month pass|599|999|for a month|Founding/);
    const pay = screen.getByTestId("fp-pay-hero");
    expect(pay.tagName).toBe("BUTTON");
    expect(pay.textContent).toBe("Pay for my child · ₹1,917");
    expect(screen.getByTestId("fp-pay-price").textContent).toBe("Pay for my child · ₹1,917");
    const help = screen.getByTestId("fp-pay-help") as HTMLAnchorElement;
    expect(help.textContent).toBe("Questions? Ask us on WhatsApp");
    expect(help.href).toBe(PAY_HELP_HREF);
    expect(help.href.startsWith("https://wa.me/")).toBe(true);
    expect(screen.getByTestId("fp-pay-line").textContent).toBe(PAY_ONE_LINE);
  });
  // FU-FORPARENTS-FIRST-PRICE-TEST (#1629 review F1/F4): the prices a parent acts on are in React's FIRST COMMIT, not filled in
  // by an effect a frame later (that late fill is the pop-in SPEED-CLS-2 removed: CLS 0.03-0.06 at 1280). A layout effect in a
  // sibling runs in the first commit, after the DOM mutation and BEFORE any passive effect, so it sees exactly the first paint.
  it("★ the Pay buttons, the packs band chips and the pack prices carry their rupee figure in the FIRST commit", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-02T10:00:00+05:30"));
    const first: Record<string, string[]> = {};
    function FirstCommitProbe() {
      useLayoutEffect(() => {
        const texts = (sel: string) => Array.from(document.querySelectorAll(sel)).map((n) => n.textContent ?? "");
        first.hero = texts('[data-testid="fp-pay-hero"]');
        first.price = texts('[data-testid="fp-pay-price"]');
        first.bandChips = texts('[data-testid="fp-band-price"]');
        first.packPrices = texts('[data-testid="fp-packs-price"]');
        first.slot = texts('[data-testid="fp-price"] .lt-fp__price-slot');
      }, []);
      return null;
    }
    render(
      <MemoryRouter>
        <ForParentsPage />
        <FirstCommitProbe />
      </MemoryRouter>,
    );
    expect(first.hero).toEqual(["Pay for my child · ₹1,917"]);
    expect(first.price).toEqual(["Pay for my child · ₹1,917"]);
    expect(first.bandChips.length).toBeGreaterThan(0);
    for (const t of [...first.bandChips, ...first.packPrices]) expect(t).toMatch(/₹\d/);
    // The price section reserves its slot from the first commit (its figures settle inside it, shifting nothing).
    expect(first.slot).toHaveLength(1);
  });
});
