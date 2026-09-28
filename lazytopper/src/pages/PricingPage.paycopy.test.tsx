import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * PAYCOPY-1 · K4 — the three pricing strings outside the P7 buy area follow the
 * client payments switch (isPaymentsClientEnabled(), VITE_PAYMENTS_ENABLED).
 *
 *  OFF (unset — the production state): subtitle (P1), the "Can I pay here?" answer (P2)
 *      and the fine print (P3) are byte-identical to the copy shipped before, and the
 *      same markup is what the committed prerendered/pricing.html carries.
 *  ON: the owner's K1 / K2 / K3 wording, word for word.
 *
 * The expected strings are written out here on purpose — NOT imported from the page —
 * so a drift in the page's constants turns this file red.
 */

// With the switch ON the page mounts PassCheckout, which calls these hooks.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null },
    hydrated: true,
  }),
}));
vi.mock("../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../services/firebaseClient", () => ({
  authClient: { currentUser: null },
  firestoreDb: null,
  app: null,
}));

import PricingPage from "./PricingPage";

// ── OFF: today's copy (P1, P2, P3) ────────────────────────────────────────────
const P1_OFF =
  "Browse first. Sign in for a 7-day trial. Choose Premium when you need checked answers, Mistake Intelligence, and full mock workflows. Payment checkout is not automated yet.";
const P2_OFF = "Not yet. Payment checkout is not connected in this build, so Premium activation stays manual.";
const P3_OFF = "No credit card required. Premium is not activated automatically.";

// ── ON: owner rulings K1, K2, K3 (word for word) ──────────────────────────────
const K1 =
  "Browse first. Sign in for a 7-day trial. Choose Premium when you need checked answers, Mistake Intelligence, and full mock workflows — pay securely with UPI, card or netbanking.";
const K2 =
  "Yes. Tap Pay, finish in Razorpay's secure checkout (UPI, card or netbanking), and Premium turns on straight away.";
const K3 = "No credit card needed for the trial. Passes are one-time payments and never renew automatically.";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function staticPricing(flag: string): string {
  vi.stubEnv("VITE_PAYMENTS_ENABLED", flag);
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/pricing"]}>
      <PricingPage />
    </MemoryRouter>,
  );
}

function pricingDom(flag: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = staticPricing(flag);
  const inner = host.querySelector<HTMLElement>(".lt-pricing-inner");
  expect(inner).not.toBeNull();
  return inner!;
}

/** Exact text of the single element matching `selector` (no whitespace folding). */
function textOf(root: HTMLElement, selector: string): string {
  const all = root.querySelectorAll(selector);
  expect(all, selector).toHaveLength(1);
  return all[0].textContent ?? "";
}

function faqAnswer(root: HTMLElement, question: string): string {
  const items = Array.from(root.querySelectorAll(".lt-pricing-faq-item")).filter(
    item => item.querySelector(".lt-pricing-faq-q")?.textContent === question,
  );
  expect(items, `FAQ "${question}"`).toHaveLength(1);
  return items[0].querySelector(".lt-pricing-faq-a")?.textContent ?? "";
}

function faqQuestions(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll(".lt-pricing-faq-q")).map(q => q.textContent ?? "");
}

/** The markup from the first `open` up to and including the next `close`. */
function fragment(html: string, open: string, close: string): string {
  const start = html.indexOf(open);
  expect(start, `${open} not found`).toBeGreaterThanOrEqual(0);
  const end = html.indexOf(close, start);
  return html.slice(start, end + close.length);
}

describe("PAYCOPY-1 · K4 — payments OFF (VITE_PAYMENTS_ENABLED unset): today's copy, byte-identical", () => {
  it("P1 subtitle, P2 pay answer and P3 fine print are exactly today's strings", () => {
    const inner = pricingDom("");
    expect(textOf(inner, ".lt-pricing-subtitle")).toBe(P1_OFF);
    expect(faqAnswer(inner, "Can I pay here?")).toBe(P2_OFF);
    expect(textOf(inner, ".lt-pricing-fine-print")).toBe(P3_OFF);
  });

  it("none of the K1 / K2 / K3 wording leaks into the dark page", () => {
    const html = staticPricing("");
    for (const k of [K1, K3]) expect(html).not.toContain(k);
    expect(html).not.toContain("Tap Pay, finish in Razorpay");
    expect(html).not.toContain("pay securely with UPI");
    expect(html).not.toContain("never renew automatically");
  });

  it("explicit non-on values stay dark too", () => {
    for (const v of ["0", "false", "off", "no", "enabled"]) {
      const inner = pricingDom(v);
      expect(textOf(inner, ".lt-pricing-subtitle"), v).toBe(P1_OFF);
      expect(faqAnswer(inner, "Can I pay here?"), v).toBe(P2_OFF);
      expect(textOf(inner, ".lt-pricing-fine-print"), v).toBe(P3_OFF);
    }
  });

  it("the committed prerendered/pricing.html carries the SAME markup for all three (prerender unchanged)", () => {
    const baked = readFileSync(resolve(process.cwd(), "prerendered/pricing.html"), "utf8");
    const html = staticPricing("");
    const subtitle = fragment(html, '<p class="lt-pricing-subtitle">', "</p>");
    const fine = fragment(html, '<p class="lt-pricing-fine-print">', "</p>");
    const payFaq = fragment(html, '<div class="lt-pricing-faq-q">Can I pay here?</div>', "</div></div>");

    expect(subtitle).toBe(`<p class="lt-pricing-subtitle">${P1_OFF}</p>`);
    expect(fine).toBe(`<p class="lt-pricing-fine-print">${P3_OFF}</p>`);
    expect(payFaq).toBe(
      `<div class="lt-pricing-faq-q">Can I pay here?</div><div class="lt-pricing-faq-a">${P2_OFF}</div></div>`,
    );
    for (const piece of [subtitle, fine, payFaq]) expect(baked).toContain(piece);
  });
});

describe("PAYCOPY-1 · K4 — payments ON: the owner's K1 / K2 / K3, word for word", () => {
  for (const flag of ["1", "true", "on", "yes", "TRUE"]) {
    it(`VITE_PAYMENTS_ENABLED=${flag}: K1 subtitle, K2 pay answer, K3 fine print`, () => {
      const inner = pricingDom(flag);
      expect(textOf(inner, ".lt-pricing-subtitle")).toBe(K1);
      expect(faqAnswer(inner, "Can I pay here?")).toBe(K2);
      expect(textOf(inner, ".lt-pricing-fine-print")).toBe(K3);
    });
  }

  it("the stale 'not automated / not connected' sentences are gone", () => {
    const html = staticPricing("1");
    expect(html).not.toContain("Payment checkout is not automated yet.");
    expect(html).not.toContain("Payment checkout is not connected in this build");
    expect(html).not.toContain(P3_OFF);
  });

  it("only the pay answer changes — every FAQ question, their order, and the other answers are untouched", () => {
    const off = pricingDom("");
    const on = pricingDom("1");
    expect(faqQuestions(on)).toEqual(faqQuestions(off));
    for (const q of faqQuestions(off).filter(q => q !== "Can I pay here?")) {
      expect(faqAnswer(on, q), q).toBe(faqAnswer(off, q));
    }
  });

  it("K1 keeps the em dash (U+2014) and K2 the ASCII apostrophe", () => {
    const inner = pricingDom("1");
    expect(textOf(inner, ".lt-pricing-subtitle")).toContain("workflows — pay");
    expect(faqAnswer(inner, "Can I pay here?")).toContain("Razorpay's");
  });
});
