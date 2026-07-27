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
  it("renders ₹5,999 / board year as the FOUNDING hero price, with ₹599 / month and the saving", () => {
    const { premium } = renderPricing();

    expect(flat(premium.querySelector(".lt-pricing-amount"))).toBe("₹5,999");
    expect(flat(premium.querySelector(".lt-pricing-period"))).toBe("/ board year");
    expect(flat(premium.querySelector(".lt-pricing-price-alt"))).toBe(
      "or ₹599 / month · less than one tuition session",
    );
    expect(flat(premium.querySelector(".lt-pricing-price-sub"))).toBe("save ₹1,189");
  });

  /**
   * BOTH tiers must be visible, and the list figures must be struck.
   *
   * This is the assertion the founding offer actually rests on. A page showing
   * only ₹599 is not a founding offer — it is just a low price, and the claim
   * "regular price ₹999" becomes unfalsifiable copy. Asserting the `<s>` element
   * specifically (not merely that the digits appear somewhere) pins the
   * PRESENTATION: an edit that drops the strike leaves two live prices sitting
   * side by side with nothing saying which one a student pays.
   */
  it("publishes the LIST price for both periods, struck, alongside the founding price", () => {
    const { premium } = renderPricing();

    const annualList = premium.querySelector(".lt-pricing-list-line--annual");
    const monthlyList = premium.querySelector(".lt-pricing-list-line--monthly");

    expect(flat(annualList)).toBe("Regular price ₹8,999 / board year");
    expect(flat(monthlyList)).toBe("Regular price ₹999 / month");

    // The list figure, and only the list figure, is struck through.
    expect(flat(annualList?.querySelector("s"))).toBe("₹8,999");
    expect(flat(monthlyList?.querySelector("s"))).toBe("₹999");
    expect(flat(premium.querySelector(".lt-pricing-amount s"))).toBe("");
  });

  it("states the founding offer's two load-bearing promises: the lock and the cohort", () => {
    const { premium } = renderPricing();
    const card = flat(premium);

    // Without BOTH of these the offer is a discount, not a founding rate — and
    // "nobody's price ever rises" stops being something the page has said.
    expect(card).toContain("Locked for as long as you stay subscribed.");
    expect(card).toContain("First 200 students.");
    expect(card.toLowerCase()).toContain("founding member");
  });

  it("answers what happens after the cohort fills, and locks the SUBSCRIBER's rate", () => {
    const { inner } = renderPricing();
    const faq = flat(inner.querySelector(".lt-pricing-faq"));

    expect(faq).toContain("What happens after the first 200 students?");
    // The close condition...
    expect(faq).toContain("The founding offer closes.");
    // ...and the lock, which is what makes the close honest rather than a bait.
    expect(faq).toContain("Your rate is locked.");
    expect(faq).toContain(
      "you keep that rate for as long as your subscription stays active",
    );
    expect(faq).toContain("We never change the price of an active subscription.");
    // Both tiers named in the FAQ, so a reader can check the claim.
    expect(faq).toContain("₹999");
    expect(faq).toContain("₹8,999");
    expect(faq).toContain("₹599");
    expect(faq).toContain("₹5,999");
  });

  /**
   * The promise must stay scoped to an ACTIVE SUBSCRIPTION.
   *
   * "We do not raise anyone's price" is a claim about PUBLISHED prices, and the
   * product cannot support it — the board year moved ₹4,999 → ₹5,999 between
   * #539 and this PR. A reader who saw the older figure would quote the broad
   * sentence back. This is a copy regression that no type, build or render check
   * can see, so it is pinned as text: if the narrow claim is ever widened, this
   * goes red and names the reason.
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
        `overbroad price promise on the page: "${overreach}" — scope it to an active subscription instead`,
      ).not.toContain(overreach);
    }
  });

  it("keeps the Basic plan at ₹0 / forever", () => {
    const { inner } = renderPricing();
    const basic = inner.querySelectorAll(".lt-pricing-card")[0];

    expect(flat(basic.querySelector(".lt-pricing-amount"))).toBe("₹0");
    expect(flat(basic.querySelector(".lt-pricing-period"))).toBe("/ forever");
  });

  it("the three published FOUNDING figures are arithmetically consistent", () => {
    const { premium } = renderPricing();

    const boardYear = parseRupees(flat(premium.querySelector(".lt-pricing-amount")));
    const monthly = parseRupees(flat(premium.querySelector(".lt-pricing-price-alt")));
    const saving = parseRupees(flat(premium.querySelector(".lt-pricing-price-sub")));

    expect(monthly * 12 - boardYear).toBe(saving);
  });

  it("the LIST tier is internally consistent too — its board year really is cheaper", () => {
    // The list pair is published, so it carries the same promise the founding
    // pair does: paying for the board year beats twelve monthly payments. Read
    // from the DOM rather than the constants so this fails on a rendering bug,
    // not only on a config edit.
    const { premium } = renderPricing();

    const listAnnual = parseRupees(flat(premium.querySelector(".lt-pricing-list-line--annual")));
    const listMonthly = parseRupees(flat(premium.querySelector(".lt-pricing-list-line--monthly")));

    expect(listMonthly * 12).toBeGreaterThan(listAnnual);
  });

  it("every founding figure undercuts its list counterpart on the rendered page", () => {
    const { premium } = renderPricing();

    const foundingAnnual = parseRupees(flat(premium.querySelector(".lt-pricing-amount")));
    const foundingMonthly = parseRupees(flat(premium.querySelector(".lt-pricing-price-alt")));
    const listAnnual = parseRupees(flat(premium.querySelector(".lt-pricing-list-line--annual")));
    const listMonthly = parseRupees(flat(premium.querySelector(".lt-pricing-list-line--monthly")));

    expect(foundingAnnual).toBeLessThan(listAnnual);
    expect(foundingMonthly).toBeLessThan(listMonthly);
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
