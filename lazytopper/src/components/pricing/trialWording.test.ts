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
import { monthlyInline } from "../../config/pricing";

describe("TRIAL_WORDING — owner addendum, word for word, price from MONTHLY_INLINE", () => {
  it("CONTROL: MONTHLY_INLINE is a real 'for a month' price (never '/month', OR-P6)", () => {
    expect(monthlyInline()).toMatch(/^₹[\d,]+ for a month$/);
  });

  it("the general line, the after line, the short fragment and the link label", () => {
    expect(TRIAL_WORDING.tryLine).toBe("Try Premium free for 7 days — no card needed.");
    expect(TRIAL_WORDING.afterLine).toBe(
      `After that, keep free Basic or upgrade to Premium at ${monthlyInline()}.`,
    );
    expect(TRIAL_WORDING.generalLine).toBe(
      `Try Premium free for 7 days — no card needed. After that, keep free Basic or upgrade to Premium at ${monthlyInline()}.`,
    );
    expect(TRIAL_WORDING.shortFragment).toBe(`then free Basic, or Premium at ${monthlyInline()}.`);
    expect(TRIAL_WORDING.seePlans).toBe("See plans →");
  });

  it("every surface builds its line from the shared constant (the imported price reaches each one)", () => {
    // freeCheckClient — usedTrial (R1), the offer line (R9), the T2 confirmation.
    expect(FREE_CHECK_COPY.usedTrial).toBe(TRIAL_WORDING.generalLine);
    expect(FREE_CHECK_COPY.offerBody("8 October 2026")).toBe(
      `Try Premium free for 7 days — no card needed. Ends 8 October 2026. After that, keep free Basic or upgrade to Premium at ${monthlyInline()}.`,
    );
    expect(`${FREE_CHECK_COPY.confirmTitle} ${FREE_CHECK_COPY.confirmBody("8 October 2026")}`).toBe(
      `Your 7-day trial is on ✅ Ends 8 October 2026. No card, nothing to cancel. After that, keep free Basic or upgrade to Premium at ${monthlyInline()}.`,
    );
    // OfferStrip — the sign-in after-trial line.
    expect(`${AFTER_TRIAL_LEAD}${afterTrialRest()}`).toBe(TRIAL_WORDING.generalLine);
    // Home tutor card (homeDestinations) — the short fragment.
    expect(tutorGateNote(true)).toBe(
      `Premium · part of the 7-day trial — then free Basic, or Premium at ${monthlyInline()}.`,
    );
  });

  it("the shared constant's source types no price, no slash-month, and never says 'pass' or 'upgrade anytime'", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/pricing/BasicFreeList.tsx"), "utf8");
    const start = src.indexOf("const TRIAL_TRY_LINE");
    const end = src.indexOf("} as const;", start);
    expect(start, "the shared constant's first line was found").toBeGreaterThan(-1);
    expect(end, "the shared constant's last line was found").toBeGreaterThan(start);
    const block = src.slice(start, end);
    // Both price-bearing lines (the after line and the short fragment) interpolate it.
    expect(block.match(/\$\{monthlyInline\(\)\}/g)).toHaveLength(2);
    expect(block).not.toMatch(/₹|\d{2,}/); // no figure typed: the only digit is the "7" of 7 days
    expect(block).not.toMatch(/\/\s*month/i);
    expect(block).not.toMatch(/\bpass(es)?\b/i);
    expect(block).not.toMatch(/upgrade anytime/i);
  });
});

describe("PRICING-1 — the trial wording follows the founding offer's date, read at ACCESS time", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("open (25 Oct 2026): the after-trial price is the founding rate", () => {
    vi.useFakeTimers({ now: new Date("2026-10-25T06:30:00Z"), toFake: ["Date"] });
    expect(TRIAL_WORDING.afterLine).toBe("After that, keep free Basic or upgrade to Premium at \u20B9599 for a month.");
    expect(TRIAL_WORDING.shortFragment).toBe("then free Basic, or Premium at \u20B9599 for a month.");
  });

  it("closed (00:00 IST 1 Dec 2026): the same module, already loaded, now quotes the list rate", () => {
    vi.useFakeTimers({ now: new Date("2026-12-01T00:00:00+05:30"), toFake: ["Date"] });
    expect(TRIAL_WORDING.afterLine).toBe("After that, keep free Basic or upgrade to Premium at \u20B9999 for a month.");
    expect(TRIAL_WORDING.generalLine).toContain("\u20B9999 for a month.");
    expect(TRIAL_WORDING.shortFragment).toBe("then free Basic, or Premium at \u20B9999 for a month.");
  });
});
