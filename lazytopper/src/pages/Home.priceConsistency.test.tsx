import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import {
  PRICE_ANNUAL_INR,
  PRICE_MONTHLY_INR,
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

  // The visible block: the premium plan's rendered amount.
  const visibleMonthly = utils.container
    .querySelector(".lt-pricing__plan--premium .lt-pricing__amount")
    ?.textContent?.trim();
  // The board-year pack card.
  const visibleAnnualPack = utils.container
    .querySelector(".lt-pricing__pack-price")
    ?.textContent?.replace(/\s+/g, " ")
    .trim();

  return { offers, offerPrice, visibleMonthly, visibleAnnualPack };
}

/** Pull the numeric rupee value out of rendered copy like "₹4,999 / board year". */
function renderedRupees(text: string | undefined): number {
  const m = (text ?? "").match(/₹([\d,]+)/);
  expect(m, `expected a ₹ amount in rendered copy: ${JSON.stringify(text)}`).not.toBeNull();
  return Number(m![1].replace(/,/g, ""));
}

describe("Home — visible pricing and JSON-LD agree (cross-surface consistency)", () => {
  it("the MONTHLY price is identical in the rendered block and the schema", () => {
    const { offerPrice, visibleMonthly } = renderHome();

    const rendered = renderedRupees(visibleMonthly);
    const schema = Number(offerPrice("Premium Monthly"));

    // The two surfaces agree with EACH OTHER — this is the divergence check.
    expect(rendered, "rendered monthly price disagrees with the JSON-LD Offer").toBe(schema);
    // ...and both agree with the single source of truth.
    expect(rendered).toBe(PRICE_MONTHLY_INR);
  });

  it("the BOARD YEAR price is identical in the rendered block and the schema", () => {
    const { offerPrice, visibleAnnualPack } = renderHome();

    const rendered = renderedRupees(visibleAnnualPack);
    const schema = Number(offerPrice("Premium Board Year"));

    expect(rendered, "rendered board-year price disagrees with the JSON-LD Offer").toBe(schema);
    expect(rendered).toBe(PRICE_ANNUAL_INR);
  });

  it("renders the monthly price with the shared formatter, not an ad-hoc string", () => {
    const { visibleMonthly } = renderHome();
    expect(visibleMonthly).toBe(formatInr(PRICE_MONTHLY_INR));
  });

  it("publishes both premium offers and no retired tier", () => {
    const { offers } = renderHome();
    const names = offers.map(o => String(o.name));

    expect(names).toContain("Premium Monthly");
    expect(names).toContain("Premium Board Year");
    // The 3-month pack is not part of the packaging any more.
    expect(names).not.toContain("Board Season Pack");
    expect(names).not.toContain("Annual");
  });

  it("carries no retired price anywhere in the rendered page or its schema", () => {
    const utils = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const schemaText = document.getElementById("lazytopper-home-schema")?.textContent ?? "";
    const pageText = utils.container.textContent ?? "";

    for (const retired of ["149", "349", "999", "789"]) {
      expect(schemaText, `retired price ${retired} still in JSON-LD`).not.toContain(
        `"price":"${retired}"`,
      );
    }
    for (const retired of ["₹149", "₹349", "₹999", "₹98", "₹789", "₹116"]) {
      expect(pageText, `retired price ${retired} still rendered`).not.toContain(retired);
    }
  });
});
