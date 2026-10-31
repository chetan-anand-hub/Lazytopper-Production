import { describe, expect, it } from "vitest";
import { boardPassOffer, boardPassShortLine, monthlyCtaLabel, premiumOffer, premiumShortLine } from "./boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("boardPassOffer", () => {
  it("leads with the Board Pass, priced from config, monthly second", () => {
    const o = boardPassOffer(new Date("2026-10-26T06:00:00Z"), "2027-02-17");
    expect(o.title).toBe("Board Pass");
    expect(o.priceDisplay).toMatch(/^₹/);
    expect(o.detail).toMatch(/^Pay once till your boards \(Feb 2027\)/);
    expect(o.monthlyLine).toMatch(/^₹\d+ for a month$/);
    expect(boardPassShortLine(o)).toBe(`Board Pass ${o.priceDisplay} till boards`);
  });
});

describe("ASK-FIX-1 analytics names", () => {
  const names = ["trial_end_screen_shown", "trial_end_screen_pay", "trial_end_screen_parent", "trial_end_screen_basic", "scorecard_upgrade_shown", "scorecard_upgrade_click"];
  it("are on the client allow-list and mirrored on the server's", () => {
    const server = readFileSync(resolve(__dirname, "../../../server/routes/studentActivity.cjs"), "utf8");
    for (const n of names) {
      expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
      expect(server).toContain(`'${n}'`);
    }
  });
});

describe("CHECKOUT-1 - the month-first offer (owner, 31 Oct 2026)", () => {
  const NOW_OPEN = new Date("2026-10-31T06:00:00Z");
  const NOW_CLOSED = new Date("2026-12-02T06:00:00Z");
  const BOARD = predictCbseExamDate("10");

  it("the lead is the month price at the founding rate while the offer is open, the list rate after", () => {
    expect(premiumOffer(NOW_OPEN, BOARD).priceDisplay).toBe("₹599");
    expect(premiumOffer(NOW_CLOSED, BOARD).priceDisplay).toBe("₹999");
    expect(premiumOffer(NOW_OPEN, BOARD).detail).toBe("for a month");
  });

  it("the Board Pass is the second line and its price is unchanged", () => {
    const o = premiumOffer(NOW_OPEN, BOARD);
    const board = boardPassOffer(NOW_OPEN, BOARD);
    expect(board.priceDisplay).not.toBeNull();
    expect(o.second).toContain(`Board Pass ${board.priceDisplay}`);
    expect(o.second.startsWith("Or ")).toBe(true);
    expect(o.boardPass).toEqual(board);
  });

  it("no till-boards quote: the second line still names the Board Pass, with no figure", () => {
    expect(premiumOffer(NOW_OPEN, "not-a-date").second).toBe("Or Board Pass - pay once, till your boards");
  });

  it("the short line and the CTA lead with the month price", () => {
    expect(premiumShortLine(premiumOffer(NOW_OPEN, BOARD))).toBe("Premium ₹599 for a month");
    expect(monthlyCtaLabel("₹599")).toBe("Premium ₹599 for a month →");
  });
});
