import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import {
  PRICE_ANNUAL_FOUNDING_INR,
  PRICE_ANNUAL_LIST_INR,
  PRICE_MONTHLY_FOUNDING_INR,
  PRICE_MONTHLY_LIST_INR,
  formatInr,
} from "../config/pricing";

/**
 * Home — the VISIBLE pricing block and the JSON-LD `Offer` schema must agree.
 *
 * Google flags structured data that contradicts the rendered page, and the two
 * live in different halves of the same file ~250 lines apart, so they are easy
 * to update one at a time. This test exists to fail on DIVERGENCE specifically:
 * it parses both RENDERED surfaces and asserts they agree with each other AND
 * with the constant. Asserting each side against a literal independently would
 * not catch the shape this is really guarding — one side edited, the other
 * forgotten.
 */

vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));

/**
 * jsdom does not implement IntersectionObserver, and Home uses it for its
 * scroll-reveal animation. Stubbed locally rather than in the shared
 * src/test/setup.ts so this lane does not change global test behaviour for
 * every other suite. The stub never fires, which is fine: the pricing markup
 * renders regardless of whether the reveal animation runs.
 */
class NoopIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);

import Home from "./Home";

afterEach(() => {
  cleanup();
  document.getElementById("lazytopper-home-schema")?.remove();
});

function renderHome() {
  const utils = render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

  const script = document.getElementById("lazytopper-home-schema");
  expect(script, "Home must inject its JSON-LD schema").not.toBeNull();

  const graph = JSON.parse(script!.textContent ?? "{}")["@graph"] as Array<
    Record<string, unknown>
  >;
  const app = graph.find(n => n["@type"] === "SoftwareApplication");
  expect(app, "schema must contain a SoftwareApplication node").toBeDefined();

  const offers = app!.offers as Array<Record<string, unknown>>;
  const offerPrice = (name: string): string => {
    const offer = offers.find(o => o.name === name);
    expect(offer, `schema is missing the "${name}" offer`).toBeDefined();
    return String(offer!.price);
  };

  // The visible block: the premium plan's rendered amount (the FOUNDING rate).
  const visibleMonthly = utils.container
    .querySelector(".lt-pricing__plan--premium .lt-pricing__amount")
    ?.textContent?.trim();
  // The board-year pack card.
  const visibleAnnualPack = utils.container
    .querySelector(".lt-pricing__pack-price")
    ?.textContent?.replace(/\s+/g, " ")
    .trim();
  // The struck LIST figures rendered beside each founding price.
  const visibleMonthlyList = utils.container
    .querySelector(".lt-pricing__list-line s")
    ?.textContent?.trim();
  const visibleAnnualList = utils.container
    .querySelector(".lt-pricing__pack-list s")
    ?.textContent?.trim();

  return {
    offers,
    offerPrice,
    visibleMonthly,
    visibleAnnualPack,
    visibleMonthlyList,
    visibleAnnualList,
  };
}

/** Pull the numeric rupee value out of rendered copy like "₹4,999 / board year". */
function renderedRupees(text: string | undefined): number {
  const m = (text ?? "").match(/₹([\d,]+)/);
  expect(m, `expected a ₹ amount in rendered copy: ${JSON.stringify(text)}`).not.toBeNull();
  return Number(m![1].replace(/,/g, ""));
}

describe("Home — visible pricing and JSON-LD agree (cross-surface consistency)", () => {
  it("the FOUNDING monthly price is identical in the rendered block and the schema", () => {
    const { offerPrice, visibleMonthly } = renderHome();

    const rendered = renderedRupees(visibleMonthly);
    const schema = Number(offerPrice("Founding Member Monthly"));

    // The two surfaces agree with EACH OTHER — this is the divergence check.
    expect(rendered, "rendered monthly price disagrees with the JSON-LD Offer").toBe(schema);
    // ...and both agree with the single source of truth.
    expect(rendered).toBe(PRICE_MONTHLY_FOUNDING_INR);
  });

  it("the FOUNDING board year is identical in the rendered block and the schema", () => {
    const { offerPrice, visibleAnnualPack } = renderHome();

    const rendered = renderedRupees(visibleAnnualPack);
    const schema = Number(offerPrice("Founding Member Board Year"));

    expect(rendered, "rendered board-year price disagrees with the JSON-LD Offer").toBe(schema);
    expect(rendered).toBe(PRICE_ANNUAL_FOUNDING_INR);
  });

  /**
   * The LIST tier gets the SAME divergence check as the founding tier.
   *
   * This is the half that is easy to skip and expensive to get wrong: the list
   * price is rendered only as a small struck figure, so a drift there is nearly
   * invisible on the page while still being published to Google as a real
   * Offer. Both list figures are therefore parsed back out of the DOM and
   * matched against their own schema entries.
   */
  it("the LIST monthly price is identical in the struck figure and the schema", () => {
    const { offerPrice, visibleMonthlyList } = renderHome();

    const rendered = renderedRupees(visibleMonthlyList);
    const schema = Number(offerPrice("Premium Monthly"));

    expect(rendered, "struck list monthly disagrees with the JSON-LD Offer").toBe(schema);
    expect(rendered).toBe(PRICE_MONTHLY_LIST_INR);
  });

  it("the LIST board year is identical in the struck figure and the schema", () => {
    const { offerPrice, visibleAnnualList } = renderHome();

    const rendered = renderedRupees(visibleAnnualList);
    const schema = Number(offerPrice("Premium Board Year"));

    expect(rendered, "struck list board-year disagrees with the JSON-LD Offer").toBe(schema);
    expect(rendered).toBe(PRICE_ANNUAL_LIST_INR);
  });

  it("never lets a founding offer meet or exceed its list counterpart in the schema", () => {
    const { offerPrice } = renderHome();

    expect(Number(offerPrice("Founding Member Monthly"))).toBeLessThan(
      Number(offerPrice("Premium Monthly")),
    );
    expect(Number(offerPrice("Founding Member Board Year"))).toBeLessThan(
      Number(offerPrice("Premium Board Year")),
    );
  });

  it("renders the monthly price with the shared formatter, not an ad-hoc string", () => {
    const { visibleMonthly } = renderHome();
    expect(visibleMonthly).toBe(formatInr(PRICE_MONTHLY_FOUNDING_INR));
  });

  it("publishes all four premium offers and no retired tier", () => {
    const { offers } = renderHome();
    const names = offers.map(o => String(o.name));

    expect(names).toContain("Founding Member Monthly");
    expect(names).toContain("Founding Member Board Year");
    expect(names).toContain("Premium Monthly");
    expect(names).toContain("Premium Board Year");
    // The 3-month pack is not part of the packaging any more.
    expect(names).not.toContain("Board Season Pack");
    expect(names).not.toContain("Annual");
  });

  it("marks the founding offers as limited and the list offers as in stock", () => {
    const { offers } = renderHome();
    const availabilityOf = (name: string) =>
      String(offers.find(o => o.name === name)?.availability ?? "");

    // LimitedAvailability is the whole structured-data signal for the cohort;
    // if it is dropped, the founding pair reads to a crawler as two more
    // permanent prices, which contradicts the page's "first 200 students".
    expect(availabilityOf("Founding Member Monthly")).toBe(
      "https://schema.org/LimitedAvailability",
    );
    expect(availabilityOf("Founding Member Board Year")).toBe(
      "https://schema.org/LimitedAvailability",
    );
    expect(availabilityOf("Premium Monthly")).toBe("https://schema.org/InStock");
    expect(availabilityOf("Premium Board Year")).toBe("https://schema.org/InStock");
  });

  it("expresses neither the cohort size nor the saving as an Offer property", () => {
    const { offers } = renderHome();

    // schema.org has no field for either. An invented Offer property is ignored
    // or flagged rather than indexed, so both belong in visible copy only.
    for (const offer of offers) {
      expect(Object.keys(offer)).not.toContain("eligibleQuantity");
      expect(Object.keys(offer)).not.toContain("savings");
      expect(Object.keys(offer)).not.toContain("discount");
    }
  });

  /**
   * RETIRED prices only.
   *
   * ₹999 was on this list until PR-B1 and has been REMOVED, deliberately: #539
   * retired it, and it is now the published LIST price. That is the hazard in a
   * denylist of old values — a price can come back, and the guard then fails on
   * correct behaviour. The founding/list figures are pinned positively by the
   * divergence tests above; this one only catches genuinely dead numbers.
   */
  it("carries no retired price anywhere in the rendered page or its schema", () => {
    const utils = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const schemaText = document.getElementById("lazytopper-home-schema")?.textContent ?? "";
    const pageText = utils.container.textContent ?? "";

    for (const retired of ["149", "349", "789", "4999"]) {
      expect(schemaText, `retired price ${retired} still in JSON-LD`).not.toContain(
        `"price":"${retired}"`,
      );
    }
    for (const retired of ["₹149", "₹349", "₹98", "₹789", "₹116", "₹4,999"]) {
      expect(pageText, `retired price ${retired} still rendered`).not.toContain(retired);
    }
  });
});
