/**
 * TRIAL-ON-SIGNUP-1b — the after-trial wording (owner addendum, wave B-6): ONE shared
 * constant (`TRIAL_WORDING`, BasicFreeList.tsx), its price IMPORTED as MONTHLY_INLINE from
 * config/pricing.ts.
 *
 * Two halves, because one cannot vouch for the price on its own:
 *   1. VALUES — every surface's string, word for word, against the REAL imported
 *      MONTHLY_INLINE (src/config is never vi.mocked: gradingLimits.guard.test.ts).
 *   2. SOURCE — the shared constant's own text must INTERPOLATE MONTHLY_INLINE and type no
 *      rupee figure. A hard-coded copy of today's exact price would satisfy (1); it cannot
 *      satisfy (2).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { TRIAL_WORDING } from "./BasicFreeList";
import { FREE_CHECK_COPY } from "../../services/freeCheckClient";
import { AFTER_TRIAL_LEAD, afterTrialRest } from "../auth/OfferStrip";
import { tutorGateNote } from "../../lib/desktop/homeDestinations";
import { boardPassPriceDisplay, boardPassPriceLine } from "../../config/pricing";

const AFTER = `After that, keep free Basic or get the Board Pass: ${boardPassPriceLine()}.`;
const SHORT = `then free Basic, or the Board Pass ${boardPassPriceDisplay()} till boards.`;

describe("TRIAL_WORDING - PRICE-FIXED-1: the after-trial wording names the Board Pass at its fixed price", () => {
  it("CONTROL: the Board Pass price is a real figure, and no month price is in the wording", () => {
    expect(boardPassPriceDisplay()).toMatch(/^₹[\d,]+(?: \+ GST)?$/);
    expect(TRIAL_WORDING.generalLine).not.toMatch(/599|999|for a month/);
  });

  it("the general line, the after line, the short fragment and the link label", () => {
    expect(TRIAL_WORDING.tryLine).toBe("Try Premium free for 7 days — no card needed.");
    expect(TRIAL_WORDING.afterLine).toBe(AFTER);
    expect(TRIAL_WORDING.generalLine).toBe(`Try Premium free for 7 days — no card needed. ${AFTER}`);
    expect(TRIAL_WORDING.shortFragment).toBe(SHORT);
    expect(TRIAL_WORDING.seePlans).toBe("See plans →");
  });

  it("every surface builds its line from the shared constant (the imported price reaches each one)", () => {
    expect(FREE_CHECK_COPY.usedTrial).toBe(TRIAL_WORDING.generalLine);
    expect(FREE_CHECK_COPY.offerBody("8 October 2026")).toBe(
      `Try Premium free for 7 days — no card needed. Ends 8 October 2026. ${AFTER}`,
    );
    expect(`${FREE_CHECK_COPY.confirmTitle} ${FREE_CHECK_COPY.confirmBody("8 October 2026")}`).toBe(
      `Your 7-day trial is on ✅ Ends 8 October 2026. No card, nothing to cancel. ${AFTER}`,
    );
    expect(`${AFTER_TRIAL_LEAD}${afterTrialRest()}`).toBe(TRIAL_WORDING.generalLine);
    expect(tutorGateNote(true)).toBe(`Premium · part of the 7-day trial — ${SHORT}`);
  });

  it("the shared constant's source types no price, no slash-month, and never says 'upgrade anytime'", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/pricing/BasicFreeList.tsx"), "utf8");
    const start = src.indexOf("const TRIAL_TRY_LINE");
    const end = src.indexOf("} as const;", start);
    expect(start, "the shared constant's first line was found").toBeGreaterThan(-1);
    expect(end, "the shared constant's last line was found").toBeGreaterThan(start);
    const block = src.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(block).toContain("${boardPassPriceLine()}");
    expect(block).toContain("${boardPassPriceDisplay()}");
    expect(block).not.toMatch(/monthlyInline/);
    expect(block).not.toMatch(/₹|\d{2,}/); // no figure typed: the only digit is the "7" of 7 days
    expect(block).not.toMatch(/\/\s*month/i);
    expect(block).not.toMatch(/upgrade anytime/i);
  });
});

describe("PRICE-FIXED-1 - the trial wording follows the Board Pass price of the date", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([["2026-10-25T06:30:00Z", "₹1,917"], ["2026-11-05T00:00:00+05:30", "₹1,917 + GST"], ["2026-12-01T00:00:00+05:30", "₹2,499 + GST"], ["2027-01-15T10:00:00+05:30", "₹2,499 + GST"]])("at %s the Board Pass price is %s", (iso, price) => {
    vi.useFakeTimers({ now: new Date(iso), toFake: ["Date"] });
    expect(TRIAL_WORDING.afterLine).toBe(`After that, keep free Basic or get the Board Pass: ${price} \u2014 one payment till your boards.`);
    expect(TRIAL_WORDING.shortFragment).toBe(`then free Basic, or the Board Pass ${price} till boards.`);
    expect(TRIAL_WORDING.generalLine).not.toMatch(/599|999|for a month/);
  });
});
