/**
 * PRICING-HUB-1 (owner, 11 Nov 2026) - the kill switch for the three-card /pricing hub.
 *
 *   VITE_PRICING_HUB_DISABLED=1  -> /pricing renders the LEGACY page (PricingPage.tsx PricingPlansPage, unchanged);
 *   unset / any other value      -> /pricing renders the hub.
 *
 * A BUILD-TIME flag like every VITE_* switch (set it in Vercel and redeploy). PricingPage.tsx writes the same comparison inline so the
 * build drops the page it does not render; PricingHub.test.tsx pins the two together. The vitest config sets the variable to "1" for
 * the whole suite, so every test that renders <PricingPage /> keeps meeting the legacy page; the hub's own tests stub it to "".
 */
export const PRICING_HUB_KILL_VALUE = "1";

export function isPricingHubEnabled(): boolean {
  return import.meta.env.VITE_PRICING_HUB_DISABLED !== PRICING_HUB_KILL_VALUE;
}
