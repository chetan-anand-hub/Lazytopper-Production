import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The PUBLIC (signed-out) page, which is exactly what `user: null` renders.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
// PRICE-FIXED-1: the month pass shows ONLY for an account the server says has a PAID month order. The month-pass suites run as a
// month BUYER (default true here); the "hidden from everyone else" suite flips it to false.
const mockMonth = vi.hoisted(() => ({ buyer: true }));
vi.mock("../components/pricing/useMonthPassAvailable", () => ({
  useMonthPassAvailable: () => mockMonth.buyer,
  fetchMonthPassAvailable: async () => mockMonth.buyer,
  resetMonthPassAvailableForTests: () => undefined,
}));

import PricingPage, { PremiumPriceHead, TillBoardsOffer, PRICING_MANUAL_PAYMENTS_OFF } from "./PricingPage";
import { PRICE_FREE_DISPLAY, PRICE_MONTHLY_LIST_DISPLAY } from "../config/pricing";
import { stripAuthChrome, countResidualAuthNodes } from "../../scripts/seo/captureStaticBodies";

/**
 * PricingPage — published price + packaging pins, rewritten for PRICING-B-1 ("Option B v3", 3 Nov 2026).
 *
 * This page publishes PRICES to the public, so the numbers are pinned harder than the copy:
 *  - the Board Pass figure is clock-derived (founding ₹1,917 till 30 Nov, ₹2,499 from 1 Dec), written only after mount, inside the
 *    ONE node the prerender capture strips;
 *  - the month pass is shown ONLY to an account that already bought one (PRICE-FIXED-1);
 *  - one product name ("Board Pass"), no refund wording, no unbacked "limited".
 */

beforeEach(() => {
  mockMonth.buyer = true;
  vi.useFakeTimers({ now: new Date("2026-10-25T06:30:00.000Z"), toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** Collapse JSX line-wrapping so copy assertions are whitespace-insensitive. */
function flat(el: Element | null | undefined): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
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
  // `.lt-pricing-inner` EXCLUDES the sibling <style> block, whose textContent is the whole CSS string.
  const inner = utils.container.querySelector(".lt-pricing-inner");
  expect(inner).not.toBeNull();
  const pass = utils.container.querySelector('[data-testid="pricing-board-pass"]');
  expect(pass).not.toBeNull();
  return { ...utils, inner: inner as Element, pass: pass as Element };
}

function rupeeAmounts(text: string): string[] {
  return text.match(/₹[\d,]+/g) ?? [];
}

/* ── The shipped CSS (components/pricing/pricingPageCss.ts), parsed ──────────── */
const SHIPPED_CSS = (() => {
  const src = readFileSync(resolve(process.cwd(), "src/components/pricing/pricingPageCss.ts"), "utf8");
  const m = /export const PRICING_CSS = `([\s\S]*?)`;/.exec(src);
  if (!m) throw new Error("PRICING_CSS not found in pricingPageCss.ts");
  return m[1];
})();
const SHIPPED_CSS_NO_COMMENTS = SHIPPED_CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The CSS with every @media block removed: the base (phone-first) rules only. */
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
const BAND_BG = c(".lt-pricing-band", "background");
const MINT_BG = c(".lt-pp-pass", "background");
const AMBER_BG = c(".lt-pp-cbq", "background");
const CARD_BG = c(".lt-pp-card", "background");
const GROUND = c(".lt-pricing-page", "background");
const WHITE = () => "#ffffff";

/** Every text and button pair on the page (WCAG AA). */
const CONTRAST_PAIRS: ContrastPair[] = [
  { name: "H1 on the band", fg: c(".lt-pricing-title", "color"), bg: BAND_BG, min: 4.5 },
  { name: "credential on the band", fg: c(".lt-pp-cred", "color"), bg: BAND_BG, min: 4.5 },
  { name: "back button on the band", fg: c(".lt-pp-topbar .ux-return-bar__back", "color"), bg: BAND_BG, min: 4.5 },
  { name: "Log in on the band", fg: c(".lt-pp-login", "color"), bg: BAND_BG, min: 4.5 },
  { name: "page ink on the ground", fg: c(".lt-pricing-page", "color"), bg: GROUND, min: 4.5 },
  { name: "Board Pass name on mint", fg: c(".lt-pp-pass__name", "color"), bg: MINT_BG, min: 4.5 },
  { name: "START HERE badge", fg: c(".lt-pp-badge", "color"), bg: c(".lt-pp-badge", "background"), min: 4.5 },
  { name: "ticks on mint", fg: c(".lt-pp-tick", "color"), bg: MINT_BG, min: 4.5 },
  { name: "tick lines on mint", fg: c(".lt-pp-ticks", "color"), bg: MINT_BG, min: 4.5 },
  { name: "price on mint", fg: c(".lt-pricing-tillboards-amount", "color"), bg: MINT_BG, min: 4.5 },
  { name: "price meta on mint", fg: c(".lt-pricing-tillboards-meta", "color"), bg: MINT_BG, min: 4.5 },
  { name: "founding line on mint", fg: c(".lt-pricing-tillboards-deadline", "color"), bg: MINT_BG, min: 4.5 },
  { name: "Pay label", fg: c(".lt-pricing-pay", "color"), bg: c(".lt-pricing-pay", "background"), min: 4.5 },
  { name: "Pay button vs mint", fg: c(".lt-pricing-pay", "background"), bg: MINT_BG, min: 3 },
  { name: "pay line on mint", fg: c(".lt-pp-payline", "color"), bg: MINT_BG, min: 4.5 },
  { name: "checkout notice on mint", fg: c(".lt-pricing-checkout-note", "color"), bg: MINT_BG, min: 4.5 },
  { name: "paper line on mint", fg: c(".lt-pp-paper", "color"), bg: MINT_BG, min: 4.5 },
  { name: "trial link on mint", fg: c(".lt-pp-trial", "color"), bg: MINT_BG, min: 4.5 },
  { name: "trial (payments-dark primary) label", fg: c(".lt-pricing-cta--primary", "color"), bg: c(".lt-pricing-cta--primary", "background"), min: 4.5 },
  { name: "CBQ kicker on amber", fg: c(".lt-pp-kicker", "color"), bg: AMBER_BG, min: 4.5 },
  { name: "CBQ title on amber", fg: c(".lt-pp-cbq__title", "color"), bg: AMBER_BG, min: 4.5 },
  { name: "CBQ body on amber", fg: c(".lt-pp-cbq__body", "color"), bg: AMBER_BG, min: 4.5 },
  { name: "per subject on amber", fg: c(".lt-pp-per", "color"), bg: AMBER_BG, min: 4.5 },
  { name: "Buy label", fg: c(".lt-pp-buy", "color"), bg: c(".lt-pp-buy", "background"), min: 4.5 },
  { name: "Buy button vs amber", fg: c(".lt-pp-buy", "background"), bg: AMBER_BG, min: 3 },
  { name: "See inside link on amber", fg: c(".lt-pp-see", "color"), bg: AMBER_BG, min: 4.5 },
  { name: "outline Buy label", fg: c(".lt-pp-buy--outline", "color"), bg: c(".lt-pp-buy--outline", "background"), min: 4.5 },
  { name: "outline Buy boundary vs white card", fg: c(".lt-pp-buy--outline", "border"), bg: CARD_BG, min: 3 },
  { name: "card body on white", fg: c(".lt-pp-card__body", "color"), bg: CARD_BG, min: 4.5 },
  { name: "Bundle pill", fg: c(".lt-pp-pill", "color"), bg: c(".lt-pp-pill", "background"), min: 4.5 },
  { name: "packs sub on the ground", fg: c(".lt-pp-sub", "color"), bg: GROUND, min: 4.5 },
  { name: "switch: chosen subject", fg: c('.lt-pp-switch button[aria-pressed="true"]', "color"), bg: c('.lt-pp-switch button[aria-pressed="true"]', "background"), min: 4.5 },
  { name: "switch: other subject on the track", fg: c(".lt-pp-switch button", "color"), bg: c(".lt-pp-switch", "background"), min: 4.5 },
  { name: "owned pill", fg: c(".lt-pp-owned", "color"), bg: c(".lt-pp-owned", "background"), min: 4.5 },
  { name: "what-you-get header", fg: c(".lt-pp-table thead th", "color"), bg: c(".lt-pp-table thead th", "background"), min: 4.5 },
  { name: "what-you-get tick", fg: c(".lt-pp-table .lt-pp-yes", "color"), bg: WHITE, min: 4.5 },
  { name: "what-you-get dash", fg: c(".lt-pp-table .lt-pp-no", "color"), bg: WHITE, min: 4.5 },
  { name: "Basic summary link", fg: c(".lt-pp-basic > summary", "color"), bg: WHITE, min: 4.5 },
  { name: "compare table header", fg: c(".lt-pricing-compare-table thead th", "color"), bg: c(".lt-pricing-compare-table thead th", "background"), min: 4.5 },
  { name: "compare section row", fg: c(".lt-pricing-compare-section th", "color"), bg: c(".lt-pricing-compare-section th", "background"), min: 4.5 },
  { name: "compare excluded dash", fg: c(".lt-pricing-compare-row td.lt-pricing-cell--no", "color"), bg: WHITE, min: 4.5 },
  { name: "compare Board Pass cell", fg: c(".lt-pricing-compare-row td.lt-pricing-cell--premium", "color"), bg: WHITE, min: 4.5 },
  { name: "FAQ question", fg: c(".lt-pricing-faq-q", "color"), bg: c(".lt-pricing-faq-item", "background"), min: 4.5 },
  { name: "FAQ answer", fg: c(".lt-pricing-faq-a", "color"), bg: c(".lt-pricing-faq-item", "background"), min: 4.5 },
  { name: "Basic line on the ground", fg: c(".lt-pp-basicline", "color"), bg: GROUND, min: 4.5 },
  { name: "Start free on the ground", fg: c(".lt-pp-startfree", "color"), bg: GROUND, min: 4.5 },
  { name: "waitlist input text", fg: c(".lt-pricing-waitlist-input", "color"), bg: c(".lt-pricing-waitlist-input", "background"), min: 4.5 },
  { name: "Join Waitlist label", fg: c(".lt-pricing-waitlist-cta", "color"), bg: c(".lt-pricing-waitlist-cta", "background"), min: 4.5 },
];

/* ── The header ─────────────────────────────────────────────────────────────── */
describe("PRICING-B-1 — header", () => {
  it("H1 and the credential line, word for word", () => {
    const { container } = renderPricing();
    expect(flat(container.querySelector("h1"))).toBe("Plans and packs for the 2027 boards");
    expect(flat(container.querySelector('[data-testid="founder-badge"]'))).toBe("Made by an IITian (IIT Kanpur)");
  });
});

/* ── The Board Pass card ────────────────────────────────────────────────────── */
describe("PRICING-B-1 — the Board Pass card", () => {
  it("START HERE, then four ticks with the Answer Checker first", () => {
    const { pass } = renderPricing();
    expect(flat(pass.querySelector(".lt-pp-badge"))).toBe("START HERE");
    expect(Array.from(pass.querySelectorAll(".lt-pp-ticks li")).map(li => flat(li))).toEqual([
      "✓Answer Checker: handwritten answers marked step by step, like a CBSE examiner",
      "✓Chapter tests, full mocks and worksheets graded",
      "✓Mistake Intelligence and an AI tutor that knows your mistakes",
      "✓Every question and solution, till your boards",
    ]);
  });

  it("after load: ₹1,917 once · till your boards (Feb 2027), no strike, no saving claim", () => {
    pinToday(SEPT_26_IST);
    const { pass } = renderPricing();
    const figures = pass.querySelector('[data-testid="till-boards-figures"]');
    expect(figures, "the figures render after mount").not.toBeNull();
    expect(flat(figures?.querySelector(".lt-pricing-tillboards-amount"))).toBe("₹1,917");
    expect(flat(figures?.querySelector(".lt-pricing-tillboards-meta"))).toBe("once · till your boards (Feb 2027)");
    expect(figures?.querySelector("s")).toBeNull();
    expect(flat(figures)).not.toMatch(/save|%/i);
  });

  it("before the deadline (23:59:59 IST 30 Nov): the one founding line, offer name in bold", () => {
    pinToday("2026-11-30T23:59:59+05:30");
    const { container } = render(<TillBoardsOffer />);
    const figures = container.querySelector('[data-testid="till-boards-figures"]');
    // GST-EXCL-1: 30 Nov is after the 5 Nov GST cut-off - every tag says "+ GST" (the total is at checkout).
    expect(flat(figures?.querySelector(".lt-pricing-tillboards-amount"))).toBe("₹1,917 + GST");
    const line = figures?.querySelector('[data-testid="till-boards-deadline"]');
    expect(flat(line)).toBe("Founding member offer ends 30 November. From 1 December: ₹2,499 + GST.");
    expect(flat(line?.querySelector("strong"))).toBe("Founding member offer");
    expect(flat(figures)).not.toMatch(/save|20%|shrink|off\b/i);
  });

  it("from the deadline (00:00:00 IST 1 Dec): ₹2,499 and the founding line is GONE", () => {
    pinToday("2026-12-01T00:00:00+05:30");
    const { container } = render(<TillBoardsOffer />);
    const figures = container.querySelector('[data-testid="till-boards-figures"]');
    expect(flat(figures?.querySelector(".lt-pricing-tillboards-amount"))).toBe("₹2,499 + GST");
    expect(figures?.querySelector('[data-testid="till-boards-deadline"]')).toBeNull();
    expect(flat(figures)).not.toMatch(/founding|1 December/i);
  });

  it("the FIRST render carries NO clock-derived figure (renderToStaticMarkup runs no effects)", () => {
    pinToday(SEPT_26_IST);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );
    expect(html).not.toContain("till-boards-figures");
    expect(html).not.toContain("till your boards (");
    // CONTROL — the mounted page does carry them.
    const { inner } = renderPricing();
    expect(flat(inner)).toContain("till your boards (Feb 2027)");
  });

  it("the paper line jumps to #packs, and the trial is the owner's small link", () => {
    const { pass } = renderPricing();
    const paper = pass.querySelector('[data-testid="pricing-paper-link"]');
    expect(paper?.getAttribute("href")).toBe("#packs");
    expect(flat(paper)).toBe("Every question is here online. Prefer paper too? CBQ Packs and the Bundle put them in print ↓");
    expect(flat(paper?.querySelector("strong"))).toBe("Prefer paper too?");
    expect(flat(pass.querySelector('[data-testid="pricing-trial"]'))).toBe("Try the Board Pass free for 7 days");
  });
});

describe("PRICING-B-1 — the Board Pass figures never reach the static page (the capture strip)", () => {
  it("after the strip: no clock-derived node, no founding line, no until-label survives", () => {
    pinToday(SEPT_26_IST);
    const { container } = renderPricing();
    expect(countResidualAuthNodes(container)).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="till-boards-deadline"]')).not.toBeNull();
    stripAuthChrome(container);
    expect(countResidualAuthNodes(container)).toBe(0);
    const text = flat(container.querySelector(".lt-pricing-inner"));
    expect(container.querySelector('[data-testid="till-boards-figures"]')).toBeNull();
    for (const label of ["till your boards (", "ends 30 November"]) {
      expect(text, `figure survived the strip: ${label}`).not.toContain(label);
    }
    // CONTROL — the card's static copy survives.
    expect(text).toContain("Every question and solution, till your boards");
    // No login link anywhere (a /login <a> would make the strip drop its whole <section>).
    expect(container.querySelector('a[href*="/login"]')).toBeNull();
  });
});

/* ── Month buyers (PRICE-FIXED-1) ───────────────────────────────────────────── */
describe("PRICE-FIXED-1 — a month BUYER renews here", () => {
  it("founding OPEN: ₹599 for a month with ₹999 struck, the tuition anchor and the lock promise", () => {
    const { pass } = renderPricing();
    const head = pass.querySelector('[data-testid="pricing-monthly-price"]');
    expect(flat(head?.querySelector(".lt-pricing-amount"))).toBe("₹599");
    expect(flat(head?.querySelector("s"))).toBe("₹999");
    expect(flat(pass.querySelector(".lt-pricing-month"))).toContain("less than one tuition session");
    expect(flat(pass.querySelector(".lt-pricing-founding-note"))).toBe("Your founding month price stays locked for every month pass you buy.");
  });

  it("founding CLOSED: ₹999 for a month and nothing struck", () => {
    const closed = render(<PremiumPriceHead offerOpen={false} />);
    expect(flat(closed.container.querySelector(".lt-pricing-amount"))).toBe("₹999");
    expect(closed.container.querySelector("s")).toBeNull();
    cleanup();
    const open = render(<PremiumPriceHead offerOpen />);
    expect(open.container.querySelector("s")).not.toBeNull();
  });
});

describe("PRICE-FIXED-1 — everyone who is NOT a month buyer sees the Board Pass alone", () => {
  beforeEach(() => {
    mockMonth.buyer = false;
  });

  it.each(["2026-10-25T06:30:00.000Z", "2026-11-30T23:59:59+05:30", "2026-12-01T00:00:00+05:30", "2027-02-01T10:00:00+05:30"])(
    "at %s: no 599, no 999, no 'for a month', no month block; the Board Pass price of the day",
    (iso) => {
      pinToday(iso);
      const { container } = renderPricing();
      const page = flat(container.querySelector(".lt-pricing-inner"));
      expect(page).not.toMatch(/599|999|for a month/);
      expect(container.querySelector(".lt-pricing-month")).toBeNull();
      expect(container.querySelector(".lt-pricing-founding-note")).toBeNull();
      expect(page).toContain(new Date(iso).getTime() < Date.parse("2026-12-01T00:00:00+05:30") ? "₹1,917" : "₹2,499");
    },
  );
});

/* ── One name, honest copy ──────────────────────────────────────────────────── */
describe("PRICING-B-1 — one product name, honest copy", () => {
  it("no visible 'Premium' anywhere on the signed-out page (payments dark and on)", () => {
    for (const flag of ["", "1"]) {
      vi.stubEnv("VITE_PAYMENTS_ENABLED", flag);
      mockMonth.buyer = false;
      const { inner } = renderPricing();
      expect(flat(inner), `payments=${flag}`).not.toMatch(/\bPremium\b/);
      cleanup();
    }
  });

  it("no refund wording anywhere", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    const { inner } = renderPricing();
    expect(flat(inner)).not.toMatch(/refund/i);
  });

  it("retired figures never come back", () => {
    pinToday(SEPT_26_IST);
    const { inner } = renderPricing();
    const page = flat(inner);
    for (const retired of ["₹5,999", "₹8,999", "₹1,189", "board year", "save ₹", "₹2,999", "₹250"]) {
      expect(page, retired).not.toContain(retired);
    }
    expect(page).toContain("₹1,917");
  });

  it("makes no absolute claim about PUBLISHED prices", () => {
    const { inner } = renderPricing();
    const page = flat(inner).toLowerCase();
    for (const overreach of ["we never raise", "price will never change", "prices never change", "locked forever", "lifetime price"]) {
      expect(page).not.toContain(overreach);
    }
  });

  it("no pack-credit / 'comes off' promise is rendered (owner: the pack price no longer comes off the Board Pass)", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_PACKS_ENABLED", "1");
    const { inner } = renderPricing();
    expect(flat(inner)).not.toMatch(/comes off|within 7 days|pack price/i);
  });

  it("the Basic line, last, with Start free (a button, never a /login link)", () => {
    const { inner } = renderPricing();
    const line = inner.querySelector('[data-testid="pricing-basic-line"]');
    expect(flat(line)).toBe("Basic: free forever, with notes, NCERT solutions and practice setsStart free");
    expect(line?.querySelector("button")?.textContent).toBe("Start free");
    expect(flat(line)).not.toMatch(/limited/i); // limits off: nothing is capped, so no "limited"
  });

  it("BASIC-LINE-1 — limits on: the line says limited practice with the real Basic caps (the compare table's figures)", () => {
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    const { inner } = renderPricing();
    const line = inner.querySelector('[data-testid="pricing-basic-line"]');
    expect(flat(line)).toBe(
      "Basic: free forever, with notes, NCERT solutions and limited practice (1 graded set a day, 1 download a week)Start free",
    );
  });
});

/* ── The FAQ ────────────────────────────────────────────────────────────────── */
describe("PRICING-B-1 — Questions parents ask", () => {
  it("Why both? and Is it a subscription? open, word for word; the old items folded under More questions", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    const { inner } = renderPricing();
    const faq = inner.querySelector('[data-testid="pricing-faq"]')!;
    const open = Array.from(faq.querySelectorAll(":scope > .lt-pricing-faq-list > .lt-pricing-faq-item")).map(i => [
      flat(i.querySelector(".lt-pricing-faq-q")),
      flat(i.querySelector(".lt-pricing-faq-a")),
    ]);
    expect(open.slice(0, 2)).toEqual([
      ["Why both?", "They do different jobs. The Board Pass marks your child's written answers like a CBSE examiner. Packs are the same questions organised to print, for practice away from the screen."],
      ["Is it a subscription?", "No. You pay once. Nothing renews."],
    ]);
    const more = faq.querySelector('[data-testid="pricing-faq-more"]') as HTMLDetailsElement;
    expect(more.open).toBe(false);
    expect(Array.from(more.querySelectorAll("details.lt-pricing-faq-item > summary")).map(s => flat(s))).toEqual([
      "Is Basic really free?",
      "What is the Board Pass?",
      "What happens when the founding offer ends?",
      "Are there any usage limits?",
      "What happens after the trial ends?",
      "Can I pay here?",
      "Is this only for CBSE Class 10?",
    ]);
  });

  it("the founding-offer answer: from 1 December ₹2,499, and a bought pass is never re-priced; no other figure in the FAQ", () => {
    pinToday(SEPT_26_IST);
    const { inner } = renderPricing();
    const faq = flat(inner.querySelector('[data-testid="pricing-faq"]'));
    expect(faq).toContain("From 1 December the Board Pass is ₹2,499 + GST. A pass you have already bought is never re-priced."); // GST-EXCL-1
    expect(rupeeAmounts(faq)).toEqual(["₹2,499"]);
    expect(faq).not.toMatch(/599|999|for a month|20%|shrink|monthly/i);
    expect(faq).not.toMatch(/\bfirst\s+\d+\s+students\b/i);
  });

  it("payments dark: the honest manual notice, in place of Pay", () => {
    const { inner, pass } = renderPricing();
    expect(flat(pass.querySelector('[data-testid="pricing-manual"]'))).toBe(PRICING_MANUAL_PAYMENTS_OFF);
    expect(pass.querySelector(".lt-pricing-pay")).toBeNull();
    expect(flat(inner)).toContain("Payment checkout is not connected in this build, so Board Pass activation stays manual.");
  });
});

/* ── What you get with each + the folded Basic table ────────────────────────── */
function visibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(".lt-pricing-sr").forEach(n => n.remove());
  return flat(clone);
}

describe("PRICING-B-1 — What you get with each", () => {
  it("Board Pass | CBQ Pack | Bundle, rows exactly as the prototype, prices from the config", () => {
    pinToday(SEPT_26_IST);
    const { inner } = renderPricing();
    const table = inner.querySelector('[data-testid="pricing-what-table"]')!;
    expect(Array.from(table.querySelectorAll("thead th")).map(visibleText)).toEqual(["", "Board Pass", "CBQ Pack", "Bundle"]);
    expect(Array.from(table.querySelectorAll("tbody tr")).map(tr => Array.from(tr.children).map(visibleText))).toEqual([
      ["Answers checked like a CBSE examiner", "✓", "—", "—"],
      ["Graded tests, mocks, AI tutor", "✓", "—", "—"],
      ["Practise on paper, offline", "—", "✓", "✓"],
      ["What's inside", "Everything, online", "1,400+ CBQs, one subject", "26 chapters + 16 mocks"],
      ["Price", "₹1,917", "₹199", "₹299"],
    ]);
  });

  it("'What's free on Basic?' is closed by default, and every Board Pass vs Basic row is in the DOM (prerender)", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>,
    );
    for (const row of [
      "Exam Trends — chapters ranked from ten years of papers",
      "Step marks, CBSE keywords and units, the way examiners mark",
      "AI tutor that knows your chapters and mistakes",
      "Fair use",
    ]) {
      expect(html).toContain(row);
    }
    const { inner } = renderPricing();
    const details = inner.querySelector('[data-testid="pricing-basic-details"]') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(flat(details.querySelector("summary"))).toBe("What's free on Basic? ↓");
    const headers = Array.from(details.querySelectorAll('[data-testid="pricing-compare"] thead th')).map(th => flat(th));
    expect(headers).toEqual(["What you get", "Board Pass", `Basic · ${PRICE_FREE_DISPLAY}`]);
  });

  it("answer checking stays EXCLUDED from Basic in the folded table", () => {
    const { inner } = renderPricing();
    const rows = Array.from(inner.querySelectorAll('[data-testid="pricing-compare"] .lt-pricing-compare-row'));
    const byLabel = Object.fromEntries(rows.map(r => [flat(r.querySelector("th")), Array.from(r.querySelectorAll("td")).map(visibleText)]));
    expect(byLabel["Step marks, CBSE keywords and units, the way examiners mark"]).toEqual(["✓", "—"]);
    expect(byLabel["Chapter tests, mocks and worksheets graded"]).toEqual(["✓", "—"]);
  });

  it("the fair-use box keeps its sentence (one name) and no rupee figure; the table scrolls in its own box", () => {
    const { inner } = renderPricing();
    const text = flat(inner.querySelector('[data-testid="pricing-fair-use"] .lt-pricing-fairuse-text'));
    expect(text.startsWith("Board Pass has generous fair-use limits")).toBe(true);
    expect(text).not.toMatch(/₹|rupee|INR|Premium/i);
    expect(rule(".lt-pricing-compare-scroll")["overflow-x"]).toBe("auto");
  });
});

/* ── Contrast, parsed from the SHIPPED CSS string ───────────────────────────── */
describe("PRICING-B-1 — contrast (WCAG AA)", () => {
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

  it("CONTROL — the arithmetic matches reference values, and a known-bad pair fails", () => {
    expect(contrast("#ffffff", "#0e7c47")).toBeCloseTo(5.26, 1);
    expect(contrast("#4a5a73", "#ffffff")).toBeCloseTo(7.0, 0);
    expect(contrast("#071a3d", "#051733")).toBeLessThan(3);
  });

  it("every tap target is at least 44 px tall in the base (phone) rules", () => {
    for (const sel of [".lt-pricing-cta", ".lt-pp-buy", ".lt-pp-see", ".lt-pp-trial", ".lt-pp-startfree", ".lt-pp-login", ".lt-pp-switch button", ".lt-pp-one__toggle"]) {
      expect(parseInt(rule(sel)["min-height"] ?? "0", 10), sel).toBeGreaterThanOrEqual(44);
    }
  });

  it("CONTROL — offer CLOSED keeps the page rendering at the list month price for a month buyer", () => {
    pinToday("2026-12-01T00:00:00+05:30");
    const { pass } = renderPricing();
    expect(flat(pass.querySelector(".lt-pricing-amount"))).toBe(PRICE_MONTHLY_LIST_DISPLAY);
    expect(pass.querySelector(".lt-pricing-founding-note")).toBeNull();
  });
});
