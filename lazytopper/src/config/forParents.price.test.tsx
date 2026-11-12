import { useLayoutEffect } from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import ForParentsPage, { PAY_HELP_HREF, boardsMonthYear, parentCardModel, parentPriceModel } from "../pages/ForParentsPage";
import { tillBoardsQuote } from "./pricing";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const OPEN = new Date("2026-10-28T10:00:00+05:30");
const GST = new Date("2026-11-12T10:00:00+05:30");
const CLOSED = new Date("2026-12-05T10:00:00+05:30");
const BOARDS = "2027-02-17";

describe("PARENTS-V2-1 - the price card's figures come from config (never typed on the page)", () => {
  it("derives the Board Pass and per-day figures from config; the model has NO month price (PRICE-FIXED-1)", () => {
    const m = parentPriceModel(OPEN, BOARDS)!;
    const q = tillBoardsQuote(OPEN, BOARDS)!;
    expect(m.boardPassDisplay).toBe(q.priceDisplay);
    expect(m.boardPassDisplay).toBe("₹1,917");
    expect(m.perDayLine).toBe(`≈ ₹${Math.ceil(q.priceInr / 112)} a day till the boards`);
    expect(Object.keys(m).sort()).toEqual(["boardPassDisplay", "boardPassPayDisplay", "perDayLine", "untilLabel"]);
    expect(m.boardPassPayDisplay).toBe("₹1,917");
  });

  it("the card today: '₹1,917 + GST', Pay ₹2,262, the founding line, 'till the Feb 2027 boards'", () => {
    const c = parentCardModel(GST, BOARDS)!;
    expect(c.tag).toBe("₹1,917 + GST");
    expect(c.pay).toBe("₹2,262");
    expect(c.deadline).toBe("Founding price ends 30 Nov · ₹1,917 + GST, then ₹2,499 + GST");
    expect(c.once).toBe("One payment, till the Feb 2027 boards. No auto-debit.");
    expect(c.until).toBe("till the Feb 2027 boards");
  });

  it("★ the card switches itself on 1 Dec: ₹2,499 + GST, Pay ₹2,949, and the founding line is gone", () => {
    const c = parentCardModel(CLOSED, BOARDS)!;
    expect(c.tag).toBe("₹2,499 + GST");
    expect(c.pay).toBe("₹2,949");
    expect(c.deadline).toBeNull();
    expect(parentCardModel(new Date("2026-11-30T23:59:59+05:30"), BOARDS)!.pay).toBe("₹2,262");
    expect(parentCardModel(new Date("2026-12-01T00:00:00+05:30"), BOARDS)!.pay).toBe("₹2,949");
  });

  it("hides the per-day line when the board date is unusable or past; no card for a bad date", () => {
    expect(parentPriceModel(OPEN, "nonsense")).toBeNull();
    expect(parentCardModel(OPEN, "nonsense")).toBeNull();
    expect(boardsMonthYear("till your boards (Feb 2027)")).toBe("Feb 2027");
  });

  it("a raw string render has no rupee figure (the figures come from the first client commit); it has the Pay buttons and the free-check link", () => {
    const html = renderToStaticMarkup(<MemoryRouter><ForParentsPage /></MemoryRouter>);
    expect(html).toMatch(/data-testid="fp-pay-hero">Pay for my child</);
    expect(html).not.toMatch(/data-testid="fp-price-amt">₹/);
    expect(html).toContain('data-testid="fp-pay-hero"');
    expect(html).not.toMatch(/Premium/);
  });

  it("★ the price card and both Pay buttons carry their figures in the FIRST client commit (no late pop-in)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T10:00:00+05:30"));
    const first: Record<string, string[]> = {};
    function FirstCommitProbe() {
      useLayoutEffect(() => {
        const texts = (sel: string) => Array.from(document.querySelectorAll(sel)).map((n) => n.textContent ?? "");
        first.hero = texts('[data-testid="fp-pay-hero"]');
        first.second = texts('[data-testid="fp-pay-second"]');
        first.amt = texts('[data-testid="fp-price-amt"]');
        first.deadline = texts('[data-testid="fp-price-deadline"]');
      }, []);
      return null;
    }
    render(
      <MemoryRouter>
        <ForParentsPage />
        <FirstCommitProbe />
      </MemoryRouter>,
    );
    expect(first.hero).toEqual(["Pay for my child · ₹2,262"]);
    expect(first.second).toEqual(["Pay for my child · ₹2,262"]);
    expect(first.amt).toEqual(["₹1,917 + GST"]);
    expect(first.deadline[0]).toContain("Founding price ends 30 Nov");
  });

  it("after mount: the Pay is a real button with the total; WhatsApp is only the secondary link", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T10:00:00+05:30"));
    render(<MemoryRouter><ForParentsPage /></MemoryRouter>);
    await act(async () => {});
    const pay = screen.getByTestId("fp-pay-hero");
    expect(pay.tagName).toBe("BUTTON");
    expect(pay.textContent).toBe("Pay for my child · ₹2,262");
    const help = screen.getByTestId("fp-pay-help") as HTMLAnchorElement;
    expect(help.textContent).toBe("WhatsApp us");
    expect(help.href).toBe(PAY_HELP_HREF);
  });
});
