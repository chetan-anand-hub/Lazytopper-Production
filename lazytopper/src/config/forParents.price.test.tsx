import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import ForParentsPage, { PAY_HELP_HREF, parentPriceModel } from "../pages/ForParentsPage";
import { FOUNDER_BADGE_TEXT } from "../components/brand/FounderBadge";
import { tillBoardsQuote } from "./pricing";

afterEach(() => cleanup());

const OPEN = new Date("2026-10-28T10:00:00+05:30");
const CLOSED = new Date("2026-12-05T10:00:00+05:30");
const BOARDS = "2027-02-17";

describe("PARENTS-PAY-1 — price and how to pay on /for-parents", () => {
  it("derives the Board Pass, per-day and month figures from config (founding open)", () => {
    const m = parentPriceModel(OPEN, BOARDS)!;
    const q = tillBoardsQuote(OPEN, BOARDS, true)!;
    expect(m.boardPassDisplay).toBe(q.priceDisplay);
    // 28 Oct 2026 -> 17 Feb 2027 = 112 days
    expect(m.perDayLine).toBe(`≈ ₹${Math.ceil(q.priceInr / 112)} a day till the boards`);
    expect(m.monthDisplay).toBe("₹599");
    expect(m.foundingLine).toBe("Founding price until 30 November");
  });

  it("shows the list month price and no founding line once the offer has closed", () => {
    const m = parentPriceModel(CLOSED, BOARDS)!;
    expect(m.monthDisplay).toBe("₹999");
    expect(m.foundingLine).toBeNull();
  });

  it("hides the per-day line when the board date is unusable or past", () => {
    expect(parentPriceModel(OPEN, "nonsense")).toBeNull();
    expect(parentPriceModel(new Date("2027-03-01T10:00:00+05:30"), "2027-02-17")?.perDayLine ?? null).toBeNull();
  });

  it("static markup carries no rupee figure (prerender cannot go stale) but has the steps and the badge", () => {
    const html = renderToStaticMarkup(<MemoryRouter><ForParentsPage /></MemoryRouter>);
    expect(html).not.toMatch(/₹/);
    expect(html).toContain("How to pay for your child");
    expect(html).toContain(FOUNDER_BADGE_TEXT);
    expect(html).toContain(">See the price<");
  });

  it("after mount shows the figures; the button opens WhatsApp and is not a checkout", async () => {
    render(<MemoryRouter><ForParentsPage /></MemoryRouter>);
    await act(async () => {});
    expect(screen.getByTestId("fp-price-figures").textContent).toMatch(/Board Pass\s*₹[\d,]+.*Month pass: ₹[\d,]+/);
    const btn = screen.getByTestId("fp-pay-help") as HTMLAnchorElement;
    expect(btn.textContent).toBe("Pay for my child");
    expect(btn.href).toBe(PAY_HELP_HREF);
    expect(btn.href.startsWith("https://wa.me/")).toBe(true);
    expect(screen.getByTestId("fp-pay-steps").textContent).toMatch(/secure link/);
  });
});
