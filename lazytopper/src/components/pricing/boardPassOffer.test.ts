import { describe, expect, it } from "vitest";
import { boardPassCtaLabel, boardPassOffer, boardPassShortLine, premiumOffer, premiumShortLine } from "./boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("boardPassOffer", () => {
  it("is the Board Pass alone at its fixed price, with no monthly line and no saving claim (PRICE-FIXED-1)", () => {
    const o = boardPassOffer(new Date("2026-10-26T06:00:00Z"), "2027-02-17");
    expect(o.title).toBe("Board Pass");
    expect(o.priceDisplay).toBe("₹1,917");
    expect(o.detail).toBe("Pay once till your boards (Feb 2027)");
    expect(Object.keys(o).sort()).toEqual(["detail", "priceDisplay", "title"]);
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

describe("PRICE-FIXED-1 - the Board Pass is the only offer (owner, 31 Oct 2026)", () => {
  const NOW_OPEN = new Date("2026-10-31T06:00:00Z");
  const NOW_CLOSED = new Date("2026-12-02T06:00:00Z");
  const BOARD = predictCbseExamDate("10");

  it("the lead is the Board Pass price of the date: 1,917 before the founding deadline, 2,499 from it", () => {
    for (const [now, price] of [[NOW_OPEN, "₹1,917"], [NOW_CLOSED, "₹2,499"]] as const) {
      const o = premiumOffer(now, BOARD);
      expect(o.title).toBe("Board Pass");
      expect(o.priceDisplay).toBe(price);
      expect(o.detail).toBe("one payment till your boards");
      expect(o.boardPass).toEqual(boardPassOffer(now, BOARD));
    }
  });

  it("no offer line carries a month price, a founding line or a saving claim", () => {
    for (const now of [NOW_OPEN, NOW_CLOSED]) {
      const o = premiumOffer(now, BOARD);
      const all = [o.title, o.priceDisplay, o.detail, o.second, premiumShortLine(o), boardPassCtaLabel("₹1,917")].join(" | ");
      expect(all).not.toMatch(/599|999|for a month|per month|monthly|founding|save|% /i);
    }
  });

  it("no till-boards quote: the lines still name the Board Pass (fixed price from config)", () => {
    expect(premiumOffer(NOW_OPEN, "not-a-date").second).toBe("Everything unlocked till your boards. No renewals.");
    expect(boardPassOffer(NOW_OPEN, "not-a-date").priceDisplay).toBeNull();
  });

  it("the short line and the CTA lead with the Board Pass", () => {
    expect(premiumShortLine(premiumOffer(NOW_OPEN, BOARD))).toBe("Board Pass ₹1,917 till boards");
    expect(boardPassCtaLabel("₹1,917")).toBe("Board Pass ₹1,917 →");
  });
});
