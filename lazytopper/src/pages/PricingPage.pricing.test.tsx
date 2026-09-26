import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import PricingPage, { PremiumPriceHead, TillBoardsOffer } from "./PricingPage";
import {
  PRICE_FREE_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
  TILL_BOARDS_LINE,
} from "../config/pricing";
import { stripAuthChrome, countResidualAuthNodes } from "../../scripts/seo/captureStaticBodies";

/**
 * PricingPage — published price + packaging pins (Lane H-2, rewritten by PRICING-TB-1).
 *
 * This page publishes a PRICE to the public, so the numbers are pinned harder
 * than the copy. PRICING-TB-1 (owner ruling 2026-09-26) retired the fixed
 * board-year plan:
 *
 *  R1  the headline is the MONTHLY price — founding ₹599 for a month with the list
 *      ₹999 struck beside it while the offer is open; ₹999 alone once it closes.
 *  R3  "till boards" — one payment until the first board paper, 20% under
 *      monthly × months-left. Its figures depend on TODAY, so they are written
 *      only after mount.
 *  R4  and therefore never baked into the prerendered page: the capture strips
 *      the one node that holds them, leaving the number-free line.
 *  R6  the FAQ copy.
 *
 * The till-boards arithmetic itself is pinned in src/config/pricing.tillBoards.test.ts.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Collapse JSX line-wrapping so copy assertions are whitespace-insensitive. */
function flat(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseRupees(text: string): number {
  const m = text.match(/₹([\d,]+)/);
  expect(m, `expected a ₹ amount in: ${JSON.stringify(text)}`).not.toBeNull();
  return Number(m![1].replace(/,/g, ""));
}

/** Pin the clock (Date only — React's scheduler keeps real timers). */
function pinToday(isoInstant: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(isoInstant));
}

const SEPT_26_IST = "2026-09-26T12:00:00+05:30";

function renderPricing() {
  const utils = render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>,
  );
  // `.lt-pricing-inner` deliberately EXCLUDES the sibling <style> block, whose
  // textContent is the whole PRICING_CSS string and would pollute copy matches.
  const inner = utils.container.querySelector(".lt-pricing-inner");
  expect(inner).not.toBeNull();
  const premium = utils.container.querySelector(".lt-pricing-card--premium");
  expect(premium).not.toBeNull();
  return { ...utils, inner: inner as Element, premium: premium as Element };
}

/** Every rupee amount in a text, as displayed ("₹2,396"). */
function rupeeAmounts(text: string): string[] {
  return text.match(/₹[\d,]+/g) ?? [];
}

/** The only figures the STATIC page may carry: free and the two monthly rates. */
const STATIC_FIGURES = new Set([
  PRICE_FREE_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
]);

describe("PricingPage — R1 the monthly headline", () => {
  it("founding OPEN (as shipped): ₹599 for a month, with ₹999 struck beside it", () => {
    const { premium } = renderPricing();
    const head = premium.querySelector('[data-testid="pricing-monthly-price"]');

    expect(flat(head?.querySelector(".lt-pricing-amount"))).toBe("₹599");
    expect(flat(head?.querySelector(".lt-pricing-period"))).toBe("for a month");
    // The LIST figure, and only the list figure, is struck — `<s>` specifically,
    // so an edit that drops the strike leaves two live prices side by side.
    expect(flat(head?.querySelector("s"))).toBe("₹999");
    expect(flat(head?.querySelector(".lt-pricing-amount s"))).toBe("");
  });

  it("founding CLOSED: ₹999 for a month and nothing struck", () => {
    const closed = render(<PremiumPriceHead offerOpen={false} />);
    expect(flat(closed.container.querySelector(".lt-pricing-amount"))).toBe("₹999");
    expect(flat(closed.container.querySelector(".lt-pricing-period"))).toBe("for a month");
    expect(closed.container.querySelector("s")).toBeNull();
    // CONTROL — the same query finds the strike when the offer is open.
    cleanup();
    const open = render(<PremiumPriceHead offerOpen />);
    expect(open.container.querySelector("s")).not.toBeNull();
  });

  it("keeps the tuition anchor beside the monthly price", () => {
    const { premium } = renderPricing();
    expect(flat(premium.querySelector(".lt-pricing-price-alt"))).toBe(
      "less than one tuition session",
    );
  });

  it("every founding figure undercuts its list counterpart on the rendered page", () => {
    const { premium } = renderPricing();
    const head = premium.querySelector('[data-testid="pricing-monthly-price"]');
    const founding = parseRupees(flat(head?.querySelector(".lt-pricing-amount")));
    const list = parseRupees(flat(head?.querySelector("s")));
    expect(founding).toBeLessThan(list);
  });
});

describe("PricingPage — R2 the board-year plan is gone", () => {
  it("renders no ₹5,999, ₹8,999, ₹1,189 or '/ board year' anywhere on the page", () => {
    pinToday(SEPT_26_IST);
    const { inner } = renderPricing();
    const page = flat(inner);

    for (const retired of ["₹5,999", "₹8,999", "₹1,189", "board year", "save ₹"]) {
      expect(page, `retired board-year copy still rendered: ${retired}`).not.toContain(retired);
    }
    // CONTROL — the same flattened text DOES carry the live prices.
    expect(page).toContain("₹599");
    expect(page).toContain("₹2,396");
  });

  it("no longer publishes the retired ₹2,999 / ₹250 figures anywhere on the page", () => {
    const { inner } = renderPricing();
    const page = flat(inner);

    expect(page).not.toContain("₹2,999");
    expect(page).not.toContain("₹250");
  });
});

describe("PricingPage — R3 the till-boards card", () => {
  it("after load on 2026-09-26: ₹2,396 one-time, ₹2,995 struck, till your boards (Feb 2027), save 20%", () => {
    pinToday(SEPT_26_IST);
    const { premium } = renderPricing();
    const card = premium.querySelector('[data-testid="till-boards"]');
    const figures = premium.querySelector('[data-testid="till-boards-figures"]');
    expect(card).not.toBeNull();
    expect(figures, "the figures render after mount").not.toBeNull();

    expect(flat(figures?.querySelector(".lt-pricing-tillboards-amount"))).toBe("₹2,396");
    expect(flat(figures?.querySelector("s"))).toBe("₹2,995");
    expect(flat(figures)).toContain("one-time");
    expect(flat(figures)).toContain("till your boards (Feb 2027)");
    expect(flat(figures)).toContain("save 20%");
  });

  it("founding CLOSED on 2026-09-26: ₹3,996 one-time, ₹4,995 struck", () => {
    pinToday(SEPT_26_IST);
    const { container } = render(<TillBoardsOffer offerOpen={false} />);
    const figures = container.querySelector('[data-testid="till-boards-figures"]');
    expect(flat(figures?.querySelector(".lt-pricing-tillboards-amount"))).toBe("₹3,996");
    expect(flat(figures?.querySelector("s"))).toBe("₹4,995");
  });

  it("the FIRST render carries the number-free line and NO figure (nothing clock-derived in markup)", () => {
    pinToday(SEPT_26_IST);
    // renderToStaticMarkup runs no effects: this is exactly the markup before mount.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );
    expect(html).toContain(TILL_BOARDS_LINE);
    expect(html).not.toContain("till-boards-figures");
    expect(html).not.toContain("till your boards (");
    // CONTROL — the mounted page does carry them, so these absences mean something.
    const { inner } = renderPricing();
    expect(flat(inner)).toContain("till your boards (Feb 2027)");
  });
});

describe("PricingPage — R4 the till-boards figures never reach the static page", () => {
  /**
   * ★ THIS DRIVES THE REAL CAPTURE STRIP. The prerender capture renders the page in
   * a browser, waits for it to settle (so the effect HAS run), then calls
   * `stripAuthChrome()` and `countResidualAuthNodes()` from
   * scripts/seo/captureStaticBodies.ts. Doing the same here, on the mounted page,
   * proves the whole pairing — every figure inside the one node, and the rule that
   * removes that node — rather than either half alone.
   */
  it("after the capture strip: the number-free line stays, no till-boards figure survives", () => {
    pinToday(SEPT_26_IST);
    const { container } = renderPricing();

    // CONTROL — before the strip the figures ARE on the settled page.
    expect(countResidualAuthNodes(container)).toBeGreaterThan(0);
    expect(rupeeAmounts(flat(container)).some((a) => !STATIC_FIGURES.has(a))).toBe(true);

    stripAuthChrome(container);

    expect(countResidualAuthNodes(container)).toBe(0);
    const text = flat(container.querySelector(".lt-pricing-inner"));
    expect(text).toContain(TILL_BOARDS_LINE);
    const baked = rupeeAmounts(text).filter((a) => !STATIC_FIGURES.has(a));
    expect(baked, `clock-derived figures survived the capture strip: ${baked.join(", ")}`).toEqual([]);
    for (const label of ["till your boards (", "save 20%", "one-time"]) {
      expect(text, `till-boards label survived the strip: ${label}`).not.toContain(label);
    }
  });

  it("the committed prerendered/pricing.html carries the number-free line and NO till-boards figure", () => {
    const html = readFileSync(resolve(process.cwd(), "prerendered/pricing.html"), "utf8");
    // CONTROL — it IS the pricing page, with the static monthly headline.
    expect(html).toContain("Simple, Student-Friendly Plans");
    expect(html).toContain(PRICE_MONTHLY_FOUNDING_DISPLAY);
    expect(html).toContain(TILL_BOARDS_LINE);

    expect(html).not.toContain("till-boards-figures");
    expect(html).not.toContain("till your boards (");
    expect(html).not.toContain("save 20%");
    const baked = rupeeAmounts(html).filter((a) => !STATIC_FIGURES.has(a));
    expect(baked, `non-static figures in prerendered/pricing.html: ${baked.join(", ")}`).toEqual([]);
  });
});

describe("PricingPage — R6 FAQ copy", () => {
  it("asks monthly vs till boards, and answers with NO figure", () => {
    const { inner } = renderPricing();
    const faq = flat(inner.querySelector(".lt-pricing-faq"));
    expect(faq).toContain("Should I pay monthly or till my boards?");
    expect(faq).toContain(
      "Till boards is one payment that covers every month until your first board paper, at 20% less than paying monthly. The price shrinks each month as the boards get closer.",
    );
  });

  it("answers what happens after the cohort fills, and locks the founding PASS price (OR-P7)", () => {
    const { inner } = renderPricing();
    const faq = flat(inner.querySelector(".lt-pricing-faq"));

    expect(faq).toContain("What happens after the first 200 students?");
    // The close condition...
    expect(faq).toContain("The founding offer closes.");
    // ...the regular price, with till boards named WITHOUT a figure...
    expect(faq).toContain(
      "New members then join at the regular price — ₹999 for a month, or 20% off when you pay once till your boards",
    );
    // ...and the lock, which is what makes the close honest rather than a bait.
    expect(faq).toContain("Your rate is locked.");
    // OR-P7 (owner, 2026-09-26), word for word: passes, never a subscription.
    expect(faq).toContain(
      "Once you buy a pass as a founding member, every pass you buy after that stays at the founding price. We never raise the price of a pass you have already bought.",
    );
    expect(faq).not.toMatch(/subscri/i);
  });

  it("the FAQ carries no rupee figure other than the static monthly prices", () => {
    pinToday(SEPT_26_IST);
    const { inner } = renderPricing();
    const faq = flat(inner.querySelector(".lt-pricing-faq"));
    expect(rupeeAmounts(faq)).toContain("₹999");
    expect(rupeeAmounts(faq).filter((a) => !STATIC_FIGURES.has(a))).toEqual([]);
  });

  it("keeps the founding offer's load-bearing promises: the label, the lock and the cohort", () => {
    const { premium } = renderPricing();
    const card = flat(premium);

    expect(card).toContain("Your founding price stays locked for every pass you buy.");
    expect(card).toContain("First 200 students.");
    expect(card.toLowerCase()).toContain("founding member");
    expect(card).toContain("Start 7-day trial");
    expect(card).toContain("Manual activation during beta.");
  });

  /**
   * The promise must stay scoped to the student's OWN passes (OR-P7; formerly "an active subscription").
   *
   * "We do not raise anyone's price" is a claim about PUBLISHED prices, and the
   * product cannot support it — a fixed board-year price moved between #539 and
   * #548. A reader who saw the older figure would quote the broad sentence back.
   */
  it("makes no absolute claim about PUBLISHED prices anywhere on the page", () => {
    const { inner } = renderPricing();
    const page = flat(inner).toLowerCase();

    for (const overreach of [
      "we do not raise anyone's price",
      "we never raise anyone's price",
      "we will never raise",
      "price will never change",
      "prices never change",
      "price never rises",
      "locked forever",
      "lifetime price",
    ]) {
      expect(
        page,
        `overbroad price promise on the page: "${overreach}" — scope it to the student's own passes instead`,
      ).not.toContain(overreach);
    }
  });

  it("keeps the Basic plan at ₹0 / forever", () => {
    const { inner } = renderPricing();
    const basic = inner.querySelectorAll(".lt-pricing-card")[0];

    expect(flat(basic.querySelector(".lt-pricing-amount"))).toBe("₹0");
    expect(flat(basic.querySelector(".lt-pricing-period"))).toBe("/ forever");
  });
});

describe("PricingPage — premium feature ordering (test 2)", () => {
  /**
   * Owner-ruled order — SIX entries, not five. "Everything in Basic" leads and
   * is load-bearing: it tells a paying parent the free tier is not being taken
   * away. The five differentiators follow it in moat-first order — lead with the
   * tutor that knows this student, prove it with the grader, then the
   * board-shaped execution surfaces.
   */
  const REQUIRED_ORDER = [
    "Everything in Basic",
    "Your AI tutor that actually knows you",
    "Mistake Intelligence",
    "Check & Improve",
    "Full mocks and predicted-question papers",
    "Progress that tells you what to fix next",
  ];

  function premiumLabels(): string[] {
    const { inner } = renderPricing();
    const list = inner.querySelector('ul[aria-label="Premium plan features"]');
    expect(list).not.toBeNull();
    return Array.from(list!.querySelectorAll("li")).map(li => flat(li));
  }

  it("renders exactly the six entries, at exactly the ruled positions", () => {
    const labels = premiumLabels();

    // Exact count: an ADDED bullet is as much a packaging change as a reordered
    // one, and a relative-order check alone would wave it through.
    expect(labels, `rendered bullets: ${JSON.stringify(labels)}`).toHaveLength(
      REQUIRED_ORDER.length,
    );

    const positions = REQUIRED_ORDER.map(needle =>
      labels.findIndex(label => label.includes(needle)),
    );
    REQUIRED_ORDER.forEach((needle, i) => {
      expect(positions[i], `premium feature not rendered: ${needle}`).toBeGreaterThanOrEqual(0);
    });

    // Pin the absolute index, not just an ascending sequence.
    expect(positions, `rendered order was: ${JSON.stringify(labels)}`).toEqual(
      REQUIRED_ORDER.map((_, i) => i),
    );
  });

  it("keeps the reassurance first and leads the differentiators with the moat", () => {
    const labels = premiumLabels();
    expect(labels[0]).toContain("Everything in Basic");
    expect(labels[1]).toContain("Your AI tutor that actually knows you");
  });

  it("does not lead the plan with quota wording — that lives in the FAQ", () => {
    const { inner } = renderPricing();
    const list = inner.querySelector('ul[aria-label="Premium plan features"]');

    expect(flat(list)).not.toMatch(/quota/i);
    expect(flat(inner.querySelector(".lt-pricing-faq"))).toMatch(/quota/i);
  });
});

describe("PricingPage — Basic packaging is unchanged (test 3)", () => {
  it("keeps Solution Checker / Check & Improve EXCLUDED from the Basic column", () => {
    const { inner } = renderPricing();
    const list = inner.querySelector('ul[aria-label="Basic plan features"]');
    expect(list).not.toBeNull();

    const row = Array.from(list!.querySelectorAll("li")).find(li =>
      flat(li).includes("Solution Checker / Check & Improve"),
    );
    expect(row, "Basic column must still list Solution Checker / Check & Improve").toBeDefined();

    expect(row!.className).toContain("lt-pricing-feature--off");
    expect(row!.className).not.toContain("lt-pricing-feature--on");
    expect(flat(row!.querySelector(".lt-pricing-feature-icon"))).toBe("—");
  });
});

describe("PricingPage — honest manual-activation notice (test 4)", () => {
  it("still states that checkout is not automated and activation stays manual", () => {
    const { inner } = renderPricing();
    const page = flat(inner);

    expect(page).toContain("Payment checkout is not automated yet.");
    expect(page).toContain(
      "Payment checkout is not connected in this build, so Premium activation stays manual.",
    );
    expect(page).toContain("Premium is not activated automatically.");
  });
});
