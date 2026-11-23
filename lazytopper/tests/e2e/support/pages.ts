/**
 * UI-E2E-1 — the signed-out pages the suite covers, and each page's PRIMARY CTA.
 *
 * The CTA is the one thing a visitor arriving on that page (often from an ad) must be able
 * to see and tap without scrolling. Selectors prefer a `data-testid` the page already ships;
 * where none exists, an accessible role + name (what a student actually sees).
 */
import type { Locator, Page } from "@playwright/test";

export type Viewport = "mobile" | "desktop";

export interface CoveredPage {
  /** Route, as a student types it. */
  path: string;
  /** Stable name used for snapshots and baseline keys. */
  slug: string;
  /** Human description of the CTA, for failure messages. */
  ctaLabel: (viewport: Viewport) => string;
  cta: (page: Page, viewport: Viewport) => Locator;
}

export const COVERED_PAGES: readonly CoveredPage[] = [
  {
    path: "/",
    slug: "landing",
    ctaLabel: () => 'hero "Check my answer"',
    // exact: the mobile sticky bar's "Check my answer — free" is a different, always-fixed link.
    cta: (page) => page.locator("main").getByRole("link", { name: "Check my answer", exact: true }).first(),
  },
  {
    path: "/test-series",
    slug: "test-series",
    ctaLabel: () => 'Buy button "Get the Test Series"',
    cta: (page) => page.getByTestId("ts-hero-buy").filter({ hasText: "Get the Test Series" }),
  },
  {
    path: "/pricing",
    slug: "pricing",
    // Phone: the Board Pass Pay bar (pricing-sticky-bar) IS the page's buy CTA on a phone.
    // Desktop has no sticky bar; its first buy button is the Board Pass card's "Pay ₹… once".
    ctaLabel: (v) => (v === "mobile" ? 'sticky "Pay ₹…" (Board Pass)' : 'Board Pass card "Pay ₹… once"'),
    cta: (page, v) =>
      v === "mobile"
        ? page.getByTestId("pricing-sticky-bar-go")
        : page.locator("main").getByRole("button", { name: /^Pay ₹[\d,]+ once/ }).first(),
  },
  {
    path: "/packs",
    slug: "packs",
    ctaLabel: () => 'Bundle "Buy · ₹…"',
    cta: (page) => page.getByTestId("tile-buy-pack_bundle"),
  },
  {
    path: "/check-improve",
    slug: "answer-checker",
    // Signed out, the Answer Checker opens on the one-tap board question; its first option is
    // the first thing a new visitor can do.
    ctaLabel: () => "one-tap board question (option A)",
    cta: (page) => page.getByTestId("one-min-opt-0"),
  },
  {
    path: "/practice-hub",
    slug: "practice-hub",
    ctaLabel: () => '"Competency-based questions (CBQs)" card',
    cta: (page) => page.locator("main").getByRole("button", { name: /Competency-based questions/ }).first(),
  },
];

/** The mobile tab bar (App.tsx BottomNav). Absent on pages where it is hidden, and on desktop. */
export const bottomNav = (page: Page): Locator => page.locator("[data-lt-bottomnav]");

/**
 * Wait until the page has settled, deterministically (no fixed sleeps): the load event, the
 * network idle (every request is local or stubbed, so idle is reached quickly and reliably),
 * web fonts ready, and the CTA's box unchanged across two animation frames.
 */
export async function settle(page: Page, cta: Locator): Promise<void> {
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle");
  await cta.waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(
    (el) =>
      new Promise<boolean>((resolve) => {
        const a = (el as Element).getBoundingClientRect();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const b = (el as Element).getBoundingClientRect();
            resolve(a.top === b.top && a.left === b.left && a.height === b.height && a.width === b.width);
          }),
        );
      }),
    await cta.elementHandle(),
  );
}

/**
 * Regions whose pixels legitimately change from day to day: masked in the visual snapshot.
 * (The snapshot also runs at a frozen clock — see pages.spec.ts — so these are belt and braces.)
 */
export function dynamicRegions(page: Page): Locator[] {
  return [
    page.getByTestId("boards-countdown-slot"), // "85 DAYS TO BOARDS" — changes daily
    page.getByTestId("shell-greeting"), // "Good morning/evening" — the device clock
    page.getByText(/₹\s?[\d,]+/), // every price: founding prices end 30 Nov / 1 Dec
    page.getByText(/\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/), // dated lines
  ];
}
