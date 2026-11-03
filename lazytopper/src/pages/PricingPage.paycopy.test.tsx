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
// SEO-PAGES-1: the user is a hoisted holder (null by default, reset after each test), so
// the free-check block at the end can render a signed-in control.
const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
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
import { BASIC_FREE_LABELS, FREE_FEATURES } from "../components/pricing/BasicFreeList";
import { ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT } from "../config/mockViewLimits";

// ── OFF (PRICING-B-1: one product name, "Board Pass"; the page has no subtitle any more) ─────────────
const MANUAL_OFF = "Manual activation during beta. Payment checkout coming soon. The Board Pass is not activated automatically.";
const P2_OFF = "Not yet. Payment checkout is not connected in this build, so Board Pass activation stays manual.";
const P3_OFF = "No credit card required. The Board Pass is not activated automatically.";

// ── ON: owner rulings K2, K3 (K2 with the one product name) and the PRICING-B-1 pay line ──────────────
const K2 =
  "Yes. Tap Pay, finish in Razorpay's secure checkout (UPI, card or netbanking), and the Board Pass turns on straight away.";
const K3 = "No credit card needed for the trial. Passes are one-time payments and never renew automatically.";
const PAY_LINE = "One payment, not a subscription · UPI, card or netbanking";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  auth.user = null;
  auth.loading = false;
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

describe("PAYCOPY-1 · K4 — payments OFF (VITE_PAYMENTS_ENABLED unset)", () => {
  it("the manual notice, the pay answer and the fine print; no pay line", () => {
    const inner = pricingDom("");
    expect(textOf(inner, '[data-testid="pricing-manual"]')).toBe(MANUAL_OFF);
    expect(faqAnswer(inner, "Can I pay here?")).toBe(P2_OFF);
    expect(textOf(inner, ".lt-pricing-fine-print")).toBe(P3_OFF);
    expect(inner.querySelector('[data-testid="pricing-payline"]')).toBeNull();
  });

  it("none of the ON wording leaks into the dark page", () => {
    const html = staticPricing("");
    expect(html).not.toContain(K3);
    expect(html).not.toContain("Tap Pay, finish in Razorpay");
    expect(html).not.toContain(PAY_LINE);
    expect(html).not.toContain("never renew automatically");
  });

  it("explicit non-on values stay dark too", () => {
    for (const v of ["0", "false", "off", "no", "enabled"]) {
      const inner = pricingDom(v);
      expect(faqAnswer(inner, "Can I pay here?"), v).toBe(P2_OFF);
      expect(textOf(inner, ".lt-pricing-fine-print"), v).toBe(P3_OFF);
    }
  });
});

describe("PAYCOPY-1 · K4 — payments ON: the owner's wording, word for word", () => {
  for (const flag of ["1", "true", "on", "yes", "TRUE"]) {
    it(`VITE_PAYMENTS_ENABLED=${flag}: K2 pay answer, K3 fine print, the pay line`, () => {
      const inner = pricingDom(flag);
      expect(faqAnswer(inner, "Can I pay here?")).toBe(K2);
      expect(textOf(inner, ".lt-pricing-fine-print")).toBe(K3);
      expect(textOf(inner, '[data-testid="pricing-payline"]')).toBe(PAY_LINE);
    });
  }

  it("the stale 'not automated / not connected' sentences are gone", () => {
    const html = staticPricing("1");
    expect(html).not.toContain("Payment checkout is not automated yet.");
    expect(html).not.toContain("Payment checkout is not connected in this build");
    expect(html).not.toContain("Manual activation during beta");
    expect(html).not.toContain(P3_OFF);
  });

  /**
   * PRICING-LIGHT-1 · L6 — the prerender capture builds with VITE_PAYMENTS_ENABLED=1, as production does, so the committed page
   * carries the ON markup (and none of the OFF sentences).
   */
  it("the committed prerendered/pricing.html is the PRICING-B-1 page with the ON markup", () => {
    for (const rel of ["prerendered/pricing.html", "prerendered/__desktop/pricing.html"]) {
      const baked = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(baked, rel).toContain("Plans and packs for the 2027 boards");
      expect(baked, rel).toContain(K3);
      expect(baked, rel).toContain(PAY_LINE);
      expect(baked, rel).toContain(K2);
      expect(baked, rel).toContain("once till your boards");
      expect(baked, rel).not.toContain("till-boards-figures");
      for (const off of [MANUAL_OFF, P2_OFF, P3_OFF, "Payment checkout is not automated yet"]) expect(baked, rel).not.toContain(off);
    }
  });

  it("only the pay answer changes — every FAQ question, their order, and the other answers are untouched", () => {
    const off = pricingDom("");
    const on = pricingDom("1");
    expect(faqQuestions(on).filter(q => q !== "Can I pay for my child?")).toEqual(faqQuestions(off));
    for (const q of faqQuestions(off).filter(q => q !== "Can I pay here?")) {
      expect(faqAnswer(on, q), q).toBe(faqAnswer(off, q));
    }
  });

  it("K2 keeps the ASCII apostrophe", () => {
    expect(faqAnswer(pricingDom("1"), "Can I pay here?")).toContain("Razorpay's");
  });
});

/**
 * PRICING-B-1 — the copy that follows a flag. The new "Who will use it?" checkout ships dark (lane CHECKOUT-WHO-1,
 * VITE_CHECKOUT_WHO_ENABLED); paying with a phone number follows VITE_GUEST_PAY_ENABLED (with payments on). Each clause shows only
 * while it is TRUE for the build.
 */
describe("PRICING-B-1 — the pay line and 'Can I pay for my child?' follow the flags", () => {
  it("checkout-who OFF, guest pay OFF: the plain line; the child question only while parent pay is on", () => {
    const inner = pricingDom("1");
    expect(textOf(inner, '[data-testid="pricing-payline"]')).toBe(PAY_LINE);
    expect(faqQuestions(inner)).not.toContain("Can I pay for my child?");
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    const withParent = pricingDom("1");
    expect(faqAnswer(withParent, "Can I pay for my child?")).toBe(
      'Yes. Your child taps "Forward link to parents" on this page and sends you the link. You pay from it, with no sign-in, and the Board Pass goes straight onto their account.',
    );
  });

  it("checkout-who OFF, guest pay ON: '… · pay with just your phone number'", () => {
    vi.stubEnv("VITE_GUEST_PAY_ENABLED", "1");
    const inner = pricingDom("1");
    expect(textOf(inner, '[data-testid="pricing-payline"]')).toBe(`${PAY_LINE} · pay with just your phone number`);
  });

  it("checkout-who ON: '… · pay for yourself or your child, no sign-up', and the new child answer", () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    const inner = pricingDom("1");
    expect(textOf(inner, '[data-testid="pricing-payline"]')).toBe(`${PAY_LINE} · pay for yourself or your child, no sign-up`);
    expect(faqAnswer(inner, "Can I pay for my child?")).toBe(
      "Yes. Tap any Pay or Buy button and enter the mobile number or email your child signs in with. No sign-up needed.",
    );
  });
});

/**
 * SEO-PAGES-1 (D) — the Basic card tells a SIGNED-OUT visitor about the one free answer
 * check on Check & Improve (server `server/services/freeCheck.cjs`; client switch
 * `isFreeCheckClientEnabled()`, VITE_FREE_CHECK_ENABLED, which the prerender capture sets).
 * Each assertion has its CONTROL:
 * - a signed-in student does NOT see it, because they do not get the free check;
 * - a build with the free check off does NOT see it;
 * - FREE_FEATURES / BASIC_FREE_LABELS are unchanged. Those are the "Free on Basic:" locks a
 *   signed-in free student sees, so the free check must never join them. The excluded
 *   "Solution Checker / Answer Checker" row stays;
 * - the payments-OFF copy is unchanged with the line present.
 */
describe("SEO-PAGES-1 (D) — the free check (PRICING-B-1: the Basic card is gone; the folded table's cell carries it)", () => {
  /** The compare table's Basic answer-checking cell, visible text only. */
  function tableFreeCheckCell(opts: { freeCheck: string; signedIn: boolean; authLoading?: boolean }): string {
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", opts.freeCheck);
    auth.user = opts.signedIn ? { uid: "u1" } : null;
    auth.loading = opts.authLoading === true;
    const row = Array.from(pricingDom("").querySelectorAll(".lt-pricing-compare-row")).find(
      tr => tr.querySelector("th")?.textContent === "Photograph your handwritten answer and get it marked",
    );
    const cell = row?.querySelectorAll("td")[1]?.cloneNode(true) as Element | undefined;
    cell?.querySelectorAll(".lt-pricing-sr").forEach(n => n.remove());
    return cell?.textContent ?? "(missing)";
  }

  it("signed out, free check on: 'First check free'; signed in, loading, or the free check off: a dash", () => {
    expect(tableFreeCheckCell({ freeCheck: "1", signedIn: false })).toBe("First check free");
    expect(tableFreeCheckCell({ freeCheck: "1", signedIn: false, authLoading: true })).toBe("—");
    expect(tableFreeCheckCell({ freeCheck: "1", signedIn: true })).toBe("—");
    expect(tableFreeCheckCell({ freeCheck: "", signedIn: false })).toBe("—");
  });

  it("CONTROL — FREE_FEATURES and BASIC_FREE_LABELS are unchanged; the free check is not a lock", () => {
    expect(FREE_FEATURES).toEqual([
      { label: "Browse Home, Exam Trends, and topic surfaces", included: true },
      { label: "Practice picker and limited practice", included: true },
      { label: "Limited worksheet generation", included: true },
      { label: "Basic topic insights", included: true },
      { label: "Solution Checker / Answer Checker", included: false },
      { label: "Deep Mistake Intelligence", included: false },
      {
        label: `Open or download ${SIGNED_IN_DAILY_MOCK_LIMIT} chapter tests or mocks a day (${ANON_DAILY_MOCK_LIMIT} when signed out) — written answers not checked`,
        included: true,
      },
      { label: "Richer Me / Progress recommendations", included: false },
    ]);
    expect(BASIC_FREE_LABELS).toEqual(FREE_FEATURES.filter((f) => f.included).map((f) => f.label));
    expect(BASIC_FREE_LABELS.some((l) => /free check|answer check/i.test(l))).toBe(false);
  });
});

// PRIVACY-DPDP-1 (owner item, 24 Oct 2026) — /pricing links the public marking guide.
// Sentence written out here, NOT imported, so drift turns this red. Real <a href> for crawlers; >= 44px tap area.
const MARK_GUIDE_SENTENCE =
  "Wondering how answers are marked? See how CBSE examiners mark Class 10 answers, with worked examples from past board papers.";

describe("PRICING marking-guide link", () => {
  it("PRICING-B-1: kept inside 'More questions' (in the DOM and the prerender), with the owner's sentence and a real link", () => {
    const host = pricingDom("1");
    const p = host.querySelector<HTMLElement>("p.lt-pricing-mark-guide");
    expect(p).not.toBeNull();
    expect(p!.textContent).toBe(MARK_GUIDE_SENTENCE);
    expect(p!.closest('[data-testid="pricing-faq-more"]')).not.toBeNull();
    const a = p!.querySelector("a");
    expect(a?.getAttribute("href")).toBe("/check-your-answer");
    expect(a?.textContent).toBe("See how CBSE examiners mark Class 10 answers");
  });

  it("renders once, and its link keeps 14px of vertical padding (>= 44px tap area)", () => {
    expect(pricingDom("1").querySelectorAll(".lt-pricing-mark-guide")).toHaveLength(1);
    const src = readFileSync(resolve(__dirname, "../components/pricing/pricingPageCss.ts"), "utf8");
    const rule = /\.lt-pricing-mark-guide a \{([^}]*)\}/.exec(src);
    expect(rule, "the link rule").not.toBeNull();
    expect(rule![1]).toMatch(/padding:\s*14px 0/);
    expect(rule![1]).not.toMatch(/display:\s*block/);
  });
});
