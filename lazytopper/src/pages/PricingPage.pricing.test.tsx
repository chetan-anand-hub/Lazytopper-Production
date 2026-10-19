import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// TRIAL-CTA-1: the page reads the session for its state-aware trial button. These pins
// are about the PUBLIC (signed-out) page, which is exactly what `user: null` renders.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

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

/* ── PRICING-LIGHT-1 · the shipped CSS, parsed ─────────────────────────────────
 * Read out of the page source (the template literal has no interpolation, so the
 * source text IS the runtime string — the L1 block proves it against the render).
 */
const SHIPPED_CSS = (() => {
  const src = readFileSync(resolve(process.cwd(), "src/pages/PricingPage.tsx"), "utf8");
  const m = /const PRICING_CSS = `([\s\S]*?)`;/.exec(src);
  if (!m) throw new Error("PRICING_CSS not found in PricingPage.tsx");
  return m[1];
})();
const SHIPPED_CSS_NO_COMMENTS = SHIPPED_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The CSS with every @media block removed: the base (widest) rules only. */
function withoutMedia(css: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const at = css.indexOf("@media", i);
    if (at < 0) return out + css.slice(i);
    out += css.slice(i, at);
    let depth = 0;
    let j = css.indexOf("{", at);
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    i = j + 1;
  }
}

const BASE_RULES: Map<string, Record<string, string>> = (() => {
  const rules = new Map<string, Record<string, string>>();
  for (const m of withoutMedia(SHIPPED_CSS_NO_COMMENTS).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls: Record<string, string> = {};
    for (const d of m[2].split(";")) {
      const k = d.indexOf(":");
      if (k > 0) decls[d.slice(0, k).trim()] = d.slice(k + 1).trim();
    }
    for (const sel of m[1].split(",").map(x => x.trim()).filter(Boolean)) {
      rules.set(sel, { ...(rules.get(sel) ?? {}), ...decls });
    }
  }
  return rules;
})();

/** The base declarations for one exact selector (empty when the selector has no rule). */
function rule(selector: string): Record<string, string> {
  return BASE_RULES.get(selector) ?? {};
}

const TOKENS = rule(".lt-pricing-page");

function resolveVars(value: string): string {
  let v = value;
  for (let n = 0; n < 5 && /var\(/.test(v); n++) {
    v = v.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      const t = TOKENS[name];
      if (t === undefined) throw new Error(`undefined token ${name}`);
      return t;
    });
  }
  return v;
}

/** The colour a selector paints for a property ("color", "background", "border", "border-color"). */
function color(selector: string, prop: string): string {
  const raw = rule(selector)[prop];
  if (raw === undefined) throw new Error(`${selector} has no ${prop}`);
  const m = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i.exec(resolveVars(raw));
  if (!m) throw new Error(`${selector} ${prop} is not a solid colour: ${raw}`);
  return m[0].toLowerCase();
}

function channel(hex: string): [number, number, number] {
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channel(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

interface ContrastPair {
  name: string;
  fg: () => string;
  bg: () => string;
  /** 4.5 for text, 3 for a button's boundary against its surround. */
  min: 4.5 | 3;
}

const c = (sel: string, prop: string) => () => color(sel, prop);
const CARD_BG = c(".lt-pricing-card", "background");
const MINT_BG = c(".lt-pricing-card--premium", "background");
const TILE_BG = c(".lt-pricing-pass-bg", "background");
const BAND_BG = c(".lt-pricing-band", "background");
const TABLE_BG = c(".lt-pricing-compare-scroll", "background");

/** Every L1 text and button pair on the page (PRICING-LIGHT-1 · L8). */
const CONTRAST_PAIRS: ContrastPair[] = [
  // The navy band.
  { name: "H1 on the band", fg: c(".lt-pricing-title", "color"), bg: BAND_BG, min: 4.5 },
  { name: "subtitle on the band", fg: c(".lt-pricing-subtitle", "color"), bg: BAND_BG, min: 4.5 },
  { name: "back button on the band", fg: c(".lt-pricing-band .ux-return-bar__back", "color"), bg: BAND_BG, min: 4.5 },
  // The light ground and the Basic card.
  { name: "page ink on the ground", fg: c(".lt-pricing-page", "color"), bg: c(".lt-pricing-page", "background"), min: 4.5 },
  { name: "list ink on the white card", fg: c(".lt-pricing-feature", "color"), bg: CARD_BG, min: 4.5 },
  { name: "secondary text on the white card", fg: c(".lt-pricing-plan-desc", "color"), bg: CARD_BG, min: 4.5 },
  { name: "Basic label on the white card", fg: c(".lt-pricing-plan-label", "color"), bg: CARD_BG, min: 4.5 },
  { name: "tick on the white card", fg: c(".lt-pricing-feature-icon", "color"), bg: CARD_BG, min: 4.5 },
  { name: "free-check link on the white card", fg: c(".lt-pricing-feature a", "color"), bg: CARD_BG, min: 4.5 },
  { name: "Start free label", fg: c(".lt-pricing-cta--secondary", "color"), bg: c(".lt-pricing-cta--secondary", "background"), min: 4.5 },
  { name: "Start free outline vs the white card", fg: c(".lt-pricing-cta--secondary", "border"), bg: CARD_BG, min: 3 },
  // The mint Premium card.
  { name: "Premium label on mint", fg: c(".lt-pricing-plan-label--premium", "color"), bg: MINT_BG, min: 4.5 },
  { name: "tick on mint", fg: c(".lt-pricing-feature-icon", "color"), bg: MINT_BG, min: 4.5 },
  { name: "list ink on mint", fg: c(".lt-pricing-feature", "color"), bg: MINT_BG, min: 4.5 },
  { name: "footnote on mint", fg: c(".lt-pricing-card-foot", "color"), bg: MINT_BG, min: 4.5 },
  { name: "founding lock line on mint", fg: c(".lt-pricing-founding-note", "color"), bg: MINT_BG, min: 4.5 },
  { name: "checkout notice on mint", fg: c(".lt-pricing-checkout-note", "color"), bg: MINT_BG, min: 4.5 },
  { name: "MOST POPULAR tag", fg: c(".lt-pricing-badge", "color"), bg: c(".lt-pricing-badge", "background"), min: 4.5 },
  { name: "founding pill", fg: c(".lt-pricing-founding-flag", "color"), bg: c(".lt-pricing-founding-flag", "background"), min: 4.5 },
  { name: "trial button label (outline)", fg: c(".lt-pricing-trial-slot .lt-pricing-cta--primary", "color"), bg: c(".lt-pricing-trial-slot .lt-pricing-cta--primary", "background"), min: 4.5 },
  { name: "trial button outline vs mint", fg: c(".lt-pricing-trial-slot .lt-pricing-cta--primary", "border"), bg: MINT_BG, min: 3 },
  // The pass tiles and the two Pay buttons.
  { name: "pass name on the tile", fg: c(".lt-pricing-pass-name", "color"), bg: TILE_BG, min: 4.5 },
  { name: "price on the tile", fg: c(".lt-pricing-amount", "color"), bg: TILE_BG, min: 4.5 },
  { name: "struck list price on the tile", fg: c(".lt-pricing-was", "color"), bg: TILE_BG, min: 4.5 },
  { name: "tile caption on the tile", fg: c(".lt-pricing-price-alt", "color"), bg: TILE_BG, min: 4.5 },
  { name: "till-boards line on the tile", fg: c(".lt-pricing-tillboards-line", "color"), bg: TILE_BG, min: 4.5 },
  { name: "SAVE tag", fg: c(".lt-pricing-save-tag", "color"), bg: c(".lt-pricing-save-tag", "background"), min: 4.5 },
  { name: "Pay (Month pass) label", fg: c(".lt-pricing-pay--month", "color"), bg: c(".lt-pricing-pay--month", "background"), min: 4.5 },
  { name: "Pay (Till boards) label", fg: c(".lt-pricing-pay--boards", "color"), bg: c(".lt-pricing-pay--boards", "background"), min: 4.5 },
  { name: "Pay (Month pass) button vs its tile", fg: c(".lt-pricing-pay--month", "background"), bg: TILE_BG, min: 3 },
  { name: "Pay (Till boards) button vs its tile", fg: c(".lt-pricing-pay--boards", "background"), bg: TILE_BG, min: 3 },
  { name: "Start 7-day trial (payments-dark primary) label", fg: c(".lt-pricing-cta--primary", "color"), bg: c(".lt-pricing-cta--primary", "background"), min: 4.5 },
  // The compare table and the fair-use box.
  { name: "table header", fg: c(".lt-pricing-compare-table thead th", "color"), bg: c(".lt-pricing-compare-table thead th", "background"), min: 4.5 },
  { name: "table Premium header", fg: c(".lt-pricing-compare-table .lt-pricing-compare-col-premium", "color"), bg: c(".lt-pricing-compare-table thead th", "background"), min: 4.5 },
  { name: "table section row", fg: c(".lt-pricing-compare-section th", "color"), bg: c(".lt-pricing-compare-section th", "background"), min: 4.5 },
  { name: "table row label", fg: c(".lt-pricing-compare-row th", "color"), bg: TABLE_BG, min: 4.5 },
  { name: "table Basic cell", fg: c(".lt-pricing-compare-row td", "color"), bg: TABLE_BG, min: 4.5 },
  { name: "table excluded dash", fg: c(".lt-pricing-compare-row td.lt-pricing-cell--no", "color"), bg: TABLE_BG, min: 4.5 },
  { name: "table Premium cell", fg: c(".lt-pricing-compare-row td.lt-pricing-cell--premium", "color"), bg: TABLE_BG, min: 4.5 },
  { name: "fair-use title", fg: c(".lt-pricing-fairuse-title", "color"), bg: c(".lt-pricing-fairuse", "background"), min: 4.5 },
  { name: "fair-use text", fg: c(".lt-pricing-fairuse-text", "color"), bg: c(".lt-pricing-fairuse", "background"), min: 4.5 },
  { name: "fine print on the ground", fg: c(".lt-pricing-fine-print", "color"), bg: c(".lt-pricing-page", "background"), min: 4.5 },
  // FAQ, Coming soon, waitlist.
  { name: "FAQ question", fg: c(".lt-pricing-faq-q", "color"), bg: c(".lt-pricing-faq-item", "background"), min: 4.5 },
  { name: "FAQ answer", fg: c(".lt-pricing-faq-a", "color"), bg: c(".lt-pricing-faq-item", "background"), min: 4.5 },
  { name: "section title", fg: c(".lt-pricing-faq-title", "color"), bg: c(".lt-pricing-faq", "background"), min: 4.5 },
  { name: "section lede", fg: c(".lt-pricing-coming-lede", "color"), bg: c(".lt-pricing-coming", "background"), min: 4.5 },
  { name: "Coming Soon chip", fg: c(".lt-pricing-coming-chip", "color"), bg: c(".lt-pricing-coming-chip", "background"), min: 4.5 },
  { name: "waitlist input text", fg: c(".lt-pricing-waitlist-input", "color"), bg: c(".lt-pricing-waitlist-input", "background"), min: 4.5 },
  { name: "waitlist placeholder", fg: c(".lt-pricing-waitlist-input::placeholder", "color"), bg: c(".lt-pricing-waitlist-input", "background"), min: 4.5 },
  { name: "waitlist input boundary", fg: c(".lt-pricing-waitlist-input", "border"), bg: c(".lt-pricing-waitlist", "background"), min: 3 },
  { name: "Join Waitlist label", fg: c(".lt-pricing-waitlist-cta", "color"), bg: c(".lt-pricing-waitlist-cta", "background"), min: 4.5 },
  { name: "Join Waitlist button vs its card", fg: c(".lt-pricing-waitlist-cta", "background"), bg: c(".lt-pricing-waitlist", "background"), min: 3 },
  { name: "waitlist success title on mint", fg: c(".lt-pricing-waitlist-success-title", "color"), bg: c(".lt-pricing-waitlist-success", "background"), min: 4.5 },
  { name: "waitlist success line on mint", fg: c(".lt-pricing-waitlist-success-sub", "color"), bg: c(".lt-pricing-waitlist-success", "background"), min: 4.5 },
];

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

  /**
   * PRICING-LIGHT-1 · L6 — the live bug. The capture used to build with payments OFF, so
   * the static page (what crawlers read, and what shows before the app loads) said
   * checkout was "not automated yet" while the live page took real money. The capture
   * now builds with VITE_PAYMENTS_ENABLED=1, like production.
   */
  it("L6: both committed pricing captures are the payments-ON page, with no payments-OFF sentence", () => {
    for (const rel of ["prerendered/pricing.html", "prerendered/__desktop/pricing.html"]) {
      const html = readFileSync(resolve(process.cwd(), rel), "utf8");
      for (const stale of [
        "Not yet. Payment checkout",
        "Payment checkout is not automated yet",
        "Manual activation during beta",
        "Payment checkout coming soon",
      ]) {
        expect(html, `${rel} still carries "${stale}"`).not.toContain(stale);
      }
      // CONTROL — the same file IS the payments-ON page: both Pay buttons, the ON copy.
      expect(html, rel).toContain("Pay once till your boards");
      expect(html, rel).toContain(`Pay ${PRICE_MONTHLY_FOUNDING_DISPLAY} for a month`);
      expect(html, rel).toContain("pay securely with UPI, card or netbanking");
      // L3 holds in both: no till-boards figure was baked.
      expect(html, rel).not.toContain("till-boards-figures");
      expect(rupeeAmounts(html).filter((a) => !STATIC_FIGURES.has(a)), rel).toEqual([]);
    }
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

  it("answers what happens when the founding offer ends, and locks the founding PASS price (OR-P7)", () => {
    const { inner } = renderPricing();
    const faq = flat(inner.querySelector(".lt-pricing-faq"));

    // PARENTS-CTA-1 (owner, 2026-10-19): the question carries NO seat count.
    expect(faq).toContain("What happens when the founding offer ends?");
    expect(faq).not.toMatch(/\bfirst\s+\d+\s+students\b/i);
    // The close condition, the regular price, with till boards named WITHOUT a figure...
    expect(faq).toContain(
      "When it ends, new members join at the regular price — ₹999 for a month, or 20% off when you pay once till your boards",
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

  it("keeps the founding offer's load-bearing promises: the badge and the lock — and NO seat count", () => {
    const { premium } = renderPricing();
    const card = flat(premium);

    expect(card).toContain("Your founding price stays locked for every pass you buy.");
    // PARENTS-CTA-1 (owner, 2026-10-19): the badge reads exactly this, word for word.
    expect(flat(premium.querySelector(".lt-pricing-founding-flag"))).toBe("Founding member offer");
    expect(card).not.toMatch(/\bfirst\s+\d+\s+students\b/i);
    expect(card).not.toMatch(/\b200\b/);
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

  // Owner ruling on #1190 (Oct 2026): the two sentences that still said "limited" are
  // reworded, word for word. Pinned as rendered; the guard in pricingCompare.test.ts keeps
  // "limited" out of them for good.
  it("the Basic description and the 'Is Basic really free?' answer, word for word", () => {
    const { inner } = renderPricing();
    const basic = inner.querySelectorAll(".lt-pricing-card")[0];
    expect(flat(basic.querySelector(".lt-pricing-plan-desc"))).toBe(
      "For browsing, revising and practising on your own.",
    );
    const free = Array.from(inner.querySelectorAll(".lt-pricing-faq-item")).find(
      i => flat(i.querySelector(".lt-pricing-faq-q")) === "Is Basic really free?",
    );
    expect(flat(free?.querySelector(".lt-pricing-faq-a"))).toBe(
      "Yes. Basic is free forever: study, practise and open papers without paying. Checked answers, the AI tutor and Mistake Intelligence come with Premium.",
    );
    // CONTROL — no rendered FAQ answer or Basic description says "limited" any more.
    const texts = [
      flat(basic.querySelector(".lt-pricing-plan-desc")),
      ...Array.from(inner.querySelectorAll(".lt-pricing-faq-a")).map(a => flat(a)),
    ];
    expect(texts.length).toBeGreaterThanOrEqual(8);
    expect(texts.filter(t => /limited/i.test(t))).toEqual([]);
  });
});

describe("PricingPage — PRICING-LIGHT-1 · L4 the Premium card (owner ruling, Oct 2026)", () => {
  /**
   * The owner's L4 list, typed out: what a student reads. It SUPERSEDES the old six-row
   * list that led with "Everything in Basic" — that reassurance is now the list's
   * HEADING ("Everything in Basic, plus:"), and the rows say what Premium adds.
   */
  const PREMIUM_PLUS_ROWS = [
    "Check & Improve — photograph your handwritten answer, marked step by step like a board examiner",
    "Chapter tests, full mocks and worksheets graded, not just downloaded",
    "Your AI tutor that knows your chapters, your mistakes, your pace",
    "Mistake Intelligence — why you lose marks, not just where",
    "Unlimited chapter tests and mocks to open or download",
    "Progress that tells you what to fix next",
  ];

  function premiumLabels(): string[] {
    const { inner } = renderPricing();
    const list = inner.querySelector('ul[aria-label="Premium plan features"]');
    expect(list).not.toBeNull();
    return Array.from(list!.querySelectorAll("li")).map(li => flat(li));
  }

  it("renders exactly the six L4 rows, in order, each with a tick", () => {
    expect(premiumLabels()).toEqual(PREMIUM_PLUS_ROWS.map(r => `✓${r}`));
  });

  it("heads the list 'Everything in Basic, plus:' and ends with the trial note", () => {
    const { premium } = renderPricing();
    const heads = Array.from(premium.querySelectorAll(".lt-pricing-list-head")).map(h => flat(h));
    expect(heads).toEqual(["Everything in Basic, plus:"]);
    expect(flat(premium.querySelector(".lt-pricing-card-foot"))).toBe(
      "Not sure yet? Sign in and Premium is free for 7 days — no card needed.",
    );
  });

  it("P5 is superseded: the usage-limits FAQ now states the limits (L5), word for word", () => {
    const { inner } = renderPricing();
    const items = Array.from(inner.querySelectorAll(".lt-pricing-faq-item"));
    const usage = items.find(i => flat(i.querySelector(".lt-pricing-faq-q")) === "Are there any usage limits?");
    expect(flat(usage?.querySelector(".lt-pricing-faq-a"))).toBe(
      "Basic has daily limits on opening tests and mocks. Premium has generous fair use: your usage bars show what is left and when it resets. The 7-day trial has daily and weekly limits, listed above.",
    );
    // The card list itself still carries no quota wording.
    expect(flat(inner.querySelector('ul[aria-label="Premium plan features"]'))).not.toMatch(/quota/i);
  });
});

describe("PricingPage — PRICING-LIGHT-1 · L4 the Basic card", () => {
  it("signed out, free check OFF in this build: the five rows, in order, then the footnote", () => {
    const { inner } = renderPricing();
    const basic = inner.querySelectorAll(".lt-pricing-card")[0];
    expect(flat(basic.querySelector(".lt-pricing-list-head"))).toBe("Basic includes:");
    const rows = Array.from(basic.querySelectorAll('ul[aria-label="Basic plan features"] li')).map(li => flat(li));
    expect(rows).toEqual([
      "✓Exam Trends — chapters ranked from ten years of papers",
      "✓Notes, formulae, NCERT books and solutions",
      "✓Practice sets and worksheet generation",
      "✓Open or download 3 chapter tests or mocks a day (1 when signed out)",
      "✓Basic topic insights",
    ]);
    expect(flat(basic.querySelector(".lt-pricing-card-foot"))).toBe(
      "Written answers on tests and mocks are not checked on Basic.",
    );
  });

  it("answer checking stays EXCLUDED from Basic: the table's Basic column shows a dash for step marks and grading", () => {
    const { inner } = renderPricing();
    const table = tableModel(inner);
    expect(table.rowsByLabel["Step marks, CBSE keywords and units, the way examiners mark"]).toEqual(["—", "✓"]);
    expect(table.rowsByLabel["Chapter tests, mocks and worksheets graded"]).toEqual(["—", "✓"]);
  });
});

/* ── PRICING-LIGHT-1 · L4 the "Compare plans" table, pinned as the student reads it ── */

/** The visible text of a cell: the screen-reader-only words removed. */
function visibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(".lt-pricing-sr").forEach(n => n.remove());
  return flat(clone);
}

function tableModel(root: Element) {
  const table = root.querySelector('[data-testid="pricing-compare"]');
  expect(table).not.toBeNull();
  const headers = Array.from(table!.querySelectorAll("thead th")).map(th => flat(th));
  const sections = Array.from(table!.querySelectorAll("tbody")).map(tb => ({
    title: flat(tb.querySelector(".lt-pricing-compare-section th")),
    rows: Array.from(tb.querySelectorAll(".lt-pricing-compare-row")).map(tr => [
      flat(tr.querySelector("th")),
      ...Array.from(tr.querySelectorAll("td")).map(visibleText),
    ]),
  }));
  const rowsByLabel: Record<string, string[]> = {};
  for (const s of sections) for (const [label, ...cells] of s.rows) rowsByLabel[label] = cells;
  return { headers, sections, rowsByLabel };
}

const L4_TABLE = [
  {
    title: "Study",
    rows: [
      ["Exam Trends — chapters ranked from ten years of papers", "✓", "✓"],
      ["Notes, formulae, NCERT books and solutions", "✓", "✓"],
      ["CBSE 2027 papers and circulars", "✓", "✓"],
    ],
  },
  {
    title: "Practice",
    rows: [
      // Owner ruling on #1190: no unbacked "Limited" — P20 found no enforced free limit.
      ["Practice sets with model answers", "✓", "✓"],
      ["Worksheets built from your chosen topics", "✓", "✓"],
      ["New questions like the one you got wrong", "—", "✓"],
    ],
  },
  {
    title: "Tests & papers",
    rows: [
      ["Open or download chapter tests and full mocks", "3 a day (1 signed out)", "✓ Unlimited"],
      ["Chapter tests, mocks and worksheets graded", "—", "✓"],
    ],
  },
  {
    title: "Answer checking",
    rows: [
      // "First check free" only while the signed-out free check is on; this build has it off.
      ["Photograph your handwritten answer and get it marked", "—", "✓"],
      ["Step marks, CBSE keywords and units, the way examiners mark", "—", "✓"],
      ["Read questions straight from your photo", "—", "✓"],
    ],
  },
  {
    title: "Coaching",
    rows: [
      ["AI tutor that knows your chapters and mistakes", "—", "✓"],
      ["Mistake Intelligence — why you lose marks", "—", "✓"],
      ["Progress and what to fix next", "Basic insights", "✓ Full"],
    ],
  },
  {
    title: "Limits",
    rows: [["Fair use", "—", "Usage bars · reset every 5 hours, day and week"]],
  },
];

describe("PricingPage — PRICING-LIGHT-1 · L4 Compare plans", () => {
  it("headers are What you get | Basic · ₹0 | Premium · from <the founding monthly price>, in that order", () => {
    const { inner } = renderPricing();
    expect(tableModel(inner).headers).toEqual([
      "What you get",
      `Basic · ${PRICE_FREE_DISPLAY}`,
      `Premium · from ${PRICE_MONTHLY_FOUNDING_DISPLAY}`,
    ]);
  });

  it("every section and row, word for word, Basic column then Premium column", () => {
    const { inner } = renderPricing();
    expect(tableModel(inner).sections).toEqual(L4_TABLE);
  });

  it("section titles render upper-case through CSS, so the DOM keeps readable words", () => {
    expect(rule(".lt-pricing-compare-section th")["text-transform"]).toBe("uppercase");
  });

  it("the table sits in its OWN horizontal scroller (the page never scrolls sideways)", () => {
    const { inner } = renderPricing();
    const box = inner.querySelector(".lt-pricing-compare-scroll");
    expect(box?.querySelector('[data-testid="pricing-compare"]')).not.toBeNull();
    expect(rule(".lt-pricing-compare-scroll")["overflow-x"]).toBe("auto");
    expect(rule(".lt-pricing-compare-table")["min-width"]).toBe("620px");
  });

  it("the fair-use box: title, then the sentence built from the trial numbers, and no rupee figure", () => {
    const { inner } = renderPricing();
    const box = inner.querySelector('[data-testid="pricing-fair-use"]');
    expect(flat(box?.querySelector(".lt-pricing-fairuse-title"))).toBe("Fair use, shown not hidden");
    const text = flat(box?.querySelector(".lt-pricing-fairuse-text"));
    expect(text).toBe(
      "Premium has generous fair-use limits so the service stays fast for everyone. Your usage bars show what is left and when each one resets — every 5 hours, every day and every week. The 7-day trial includes, each day: 5 answer checks, 1 chapter test and 15 tutor messages; and each week: 1 full mock and 1 worksheet grading.",
    );
    expect(text).not.toMatch(/₹|rupee|INR/i);
  });
});

/* ── PRICING-LIGHT-1 · L2 order and structure ───────────────────────────────── */

describe("PricingPage — PRICING-LIGHT-1 · L2 Basic left, Premium right", () => {
  it("Basic renders BEFORE Premium in DOM order (left on desktop, first when stacked)", () => {
    const { inner } = renderPricing();
    const cards = Array.from(inner.querySelectorAll(".lt-pricing-cards > .lt-pricing-card"));
    expect(cards.map(c => flat(c.querySelector(".lt-pricing-plan-label")))).toEqual(["Basic", "Premium"]);
    expect(cards[0].compareDocumentPosition(cards[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Nothing reorders them visually: no `order` on a card or the grid, in any rule.
    for (const sel of [".lt-pricing-card", ".lt-pricing-card--premium", ".lt-pricing-card--basic", ".lt-pricing-cards"]) {
      expect(SHIPPED_CSS_NO_COMMENTS).not.toMatch(new RegExp(`\\${sel} \\{[^}]*\\border:`));
    }
  });

  it("the Premium card holds the two pass tiles, Month first, and the trial action BELOW them", () => {
    const { premium } = renderPricing();
    const passes = premium.querySelector('[data-testid="pricing-passes"]');
    expect(passes).not.toBeNull();
    const names = Array.from(passes!.querySelectorAll(".lt-pricing-pass-name")).map(n => flat(n));
    expect(names).toEqual(["Month pass", "Till your boards"]);
    const trial = premium.querySelector(".lt-pricing-trial-slot");
    expect(trial).not.toBeNull();
    expect(passes!.compareDocumentPosition(trial!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("payments dark: the tiles carry the prices and the manual paragraph stands in for the Pay buttons", () => {
    const { premium } = renderPricing();
    const passes = premium.querySelector('[data-testid="pricing-passes"]');
    expect(passes?.querySelector('[data-testid="pricing-monthly-price"]')).not.toBeNull();
    expect(passes?.querySelector('[data-testid="till-boards"]')).not.toBeNull();
    expect(flat(passes?.querySelector(":scope > .lt-pricing-plan-desc"))).toBe(
      "Manual activation during beta. Payment checkout coming soon. Premium is not activated automatically.",
    );
    expect(passes?.querySelector(".lt-pricing-pay")).toBeNull();
  });
});

/* ── PRICING-LIGHT-1 · L1 contrast, parsed from the SHIPPED CSS string ─────────
 * The CSS is read out of PricingPage.tsx and proven byte-identical to the <style> the
 * page renders, then every L1 text pair is held to 4.5:1 and every button boundary to
 * 3:1 (WCAG AA). CONTROL: the pre-lane pair (navy #071a3d Pay button on the #051733
 * page) fails the same check.
 */

describe("PricingPage — PRICING-LIGHT-1 · L1 contrast (WCAG AA)", () => {
  it("the CSS this test reads IS the CSS the page ships", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );
    expect(SHIPPED_CSS.length).toBeGreaterThan(5000);
    expect(html).toContain(`<style>${SHIPPED_CSS}</style>`);
  });

  for (const pair of CONTRAST_PAIRS) {
    it(`${pair.name}: ${pair.min === 3 ? "boundary" : "text"} ≥ ${pair.min}:1`, () => {
      const fg = pair.fg();
      const bg = pair.bg();
      const r = contrast(fg, bg);
      expect(r, `${pair.name}: ${fg} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it("the Pay buttons paint the L1 tokens: Month pass navy #0b1b3a, Till boards deep green #0e7c47", () => {
    expect(color(".lt-pricing-pay--month", "background")).toBe("#0b1b3a");
    expect(color(".lt-pricing-pay--boards", "background")).toBe("#0e7c47");
    expect(color(".lt-pricing-pay--month", "color")).toBe("#ffffff");
    expect(color(".lt-pricing-pay--boards", "color")).toBe("#ffffff");
    // The pre-lane navy token is gone from the page's CSS entirely.
    expect(SHIPPED_CSS.toLowerCase()).not.toContain("#071a3d");
    expect(SHIPPED_CSS).not.toContain("--lt-navy");
  });

  it("CONTROL — the old navy-on-navy pair fails both thresholds", () => {
    expect(contrast("#071a3d", "#051733")).toBeLessThan(3);
    expect(contrast("#071a3d", "#071a2d")).toBeLessThan(3);
  });

  it("CONTROL — the arithmetic matches the spec's reference values", () => {
    expect(contrast("#ffffff", "#0e7c47")).toBeCloseTo(5.26, 1);
    expect(contrast("#4a5a73", "#ffffff")).toBeCloseTo(7.0, 0);
    expect(contrast("#6b778a", "#ffffff")).toBeCloseTo(4.53, 1);
    expect(contrast("#ffffff", "#0b1b3a")).toBeGreaterThan(16.5);
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

// ─── COPY-2 · K5 (owner, 2026-09-27) ───────────────────────────────────────────
// The founding chip and the lock note render ONLY while FOUNDING_OFFER_OPEN is true.
// A partial mock over importActual, so every other figure is the real published one.
describe("PricingPage — COPY-2 · K5 the founding chip and lock note follow the offer", () => {
  afterEach(() => {
    vi.doUnmock("../config/pricing");
    vi.resetModules();
  });

  async function renderWithOffer(open: boolean) {
    vi.resetModules();
    vi.doMock("../config/pricing", async () => {
      const actual = await vi.importActual<typeof import("../config/pricing")>("../config/pricing");
      return { ...actual, FOUNDING_OFFER_OPEN: open };
    });
    const { default: Page } = await import("./PricingPage");
    const { container } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    const premium = container.querySelector(".lt-pricing-card--premium");
    expect(premium).not.toBeNull();
    return premium as Element;
  }

  it("offer CLOSED: no founding chip and no lock note", async () => {
    const premium = await renderWithOffer(false);
    expect(premium.querySelector(".lt-pricing-founding-flag")).toBeNull();
    expect(premium.querySelector(".lt-pricing-founding-note")).toBeNull();
    const card = flat(premium);
    expect(card).not.toContain("Your founding price stays locked for every pass you buy.");
    expect(card).not.toContain("Founding member offer");
    // CONTROL — the card still rendered, at the list price.
    expect(card).toContain("Manual activation during beta.");
    expect(flat(premium.querySelector(".lt-pricing-amount"))).toBe(PRICE_MONTHLY_LIST_DISPLAY);
  });

  it("CONTROL — offer OPEN: the same queries find the chip and the lock note", async () => {
    const premium = await renderWithOffer(true);
    expect(flat(premium.querySelector(".lt-pricing-founding-flag"))).toBe("Founding member offer");
    expect(flat(premium.querySelector(".lt-pricing-founding-note"))).toBe(
      "Your founding price stays locked for every pass you buy.",
    );
  });
});
