import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import PricingPage from "./PricingPage";

/**
 * PricingPage — published price + packaging pins (Lane H-2).
 *
 * This page publishes a PRICE to the public, so the numbers are pinned harder
 * than the copy. Two things matter and are asserted separately:
 *
 *  1. The exact owner-final figures render with their period labels
 *     (₹4,999 / board year as the hero, ₹599 / month as the alternative).
 *  2. The RELATIONSHIP between them holds. `savings` is a DERIVED value, and a
 *     derived value that is pinned as a literal goes quietly stale the moment
 *     one of its inputs moves. So the arithmetic test parses all three figures
 *     back out of the rendered DOM and asserts
 *     `monthly * 12 - boardYear === saving` — change ANY one of the three and
 *     this goes red, which is the property the owner actually cares about.
 *
 * It also pins the packaging that a concurrent lane depends on (Check & Improve
 * stays OUT of the Basic column) and the honest "checkout is not automated"
 * notice, which must survive until a real payment rail exists.
 */

afterEach(cleanup);

/** Collapse JSX line-wrapping so copy assertions are whitespace-insensitive. */
function flat(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseRupees(text: string): number {
  const m = text.match(/₹([\d,]+)/);
  expect(m, `expected a ₹ amount in: ${JSON.stringify(text)}`).not.toBeNull();
  return Number(m![1].replace(/,/g, ""));
}

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

describe("PricingPage — published prices (test 1)", () => {
  it("renders ₹4,999 / board year as the hero price, with ₹599 / month and the saving", () => {
    const { premium } = renderPricing();

    expect(flat(premium.querySelector(".lt-pricing-amount"))).toBe("₹4,999");
    expect(flat(premium.querySelector(".lt-pricing-period"))).toBe("/ board year");
    expect(flat(premium.querySelector(".lt-pricing-price-alt"))).toBe("or ₹599 / month");
    expect(flat(premium.querySelector(".lt-pricing-price-sub"))).toBe("Save ₹2,189");
  });

  it("keeps the Basic plan at ₹0 / forever", () => {
    const { inner } = renderPricing();
    const basic = inner.querySelectorAll(".lt-pricing-card")[0];

    expect(flat(basic.querySelector(".lt-pricing-amount"))).toBe("₹0");
    expect(flat(basic.querySelector(".lt-pricing-period"))).toBe("/ forever");
  });

  it("the three published premium figures are arithmetically consistent", () => {
    const { premium } = renderPricing();

    const boardYear = parseRupees(flat(premium.querySelector(".lt-pricing-amount")));
    const monthly = parseRupees(flat(premium.querySelector(".lt-pricing-price-alt")));
    const saving = parseRupees(flat(premium.querySelector(".lt-pricing-price-sub")));

    expect(monthly * 12 - boardYear).toBe(saving);
  });

  it("the FAQ's twelve-month total matches the monthly price and the saving", () => {
    const { inner, premium } = renderPricing();

    const monthly = parseRupees(flat(premium.querySelector(".lt-pricing-price-alt")));
    const boardYear = parseRupees(flat(premium.querySelector(".lt-pricing-amount")));

    const faq = flat(inner.querySelector(".lt-pricing-faq"));
    const total = faq.match(/comes to ₹([\d,]+)/);
    expect(total, "FAQ must state the twelve-month total").not.toBeNull();
    expect(Number(total![1].replace(/,/g, ""))).toBe(monthly * 12);

    const faqSaving = faq.match(/you save ₹([\d,]+)/);
    expect(faqSaving, "FAQ must state the saving").not.toBeNull();
    expect(Number(faqSaving![1].replace(/,/g, ""))).toBe(monthly * 12 - boardYear);
  });

  it("no longer publishes the retired ₹2,999 / ₹250 figures anywhere on the page", () => {
    const { inner } = renderPricing();
    const page = flat(inner);

    expect(page).not.toContain("₹2,999");
    expect(page).not.toContain("₹250");
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
