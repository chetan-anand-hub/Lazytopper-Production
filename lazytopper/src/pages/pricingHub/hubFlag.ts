/**
 * PRICING-HUB-1 (owner, 11 Nov 2026) - the kill switch for the three-card /pricing hub.
 *
 *   VITE_PRICING_HUB_DISABLED=1 (or true/on/yes) -> /pricing renders the LEGACY page (PricingPage.tsx PricingPlansPage, unchanged);
 *   unset / anything else                        -> /pricing renders the hub.
 *
 * A BUILD-TIME flag like every VITE_* switch (set it in Vercel and redeploy). The vitest config sets it to "1" for the whole suite,
 * so every test that renders <PricingPage /> keeps meeting the legacy page; the hub's own tests stub it to "".
 */
export function isPricingHubEnabled(): boolean {
  let raw: unknown;
  try {
    raw = import.meta.env.VITE_PRICING_HUB_DISABLED;
  } catch {
    raw = undefined;
  }
  const value = raw === undefined || raw === null ? "" : String(raw).trim();
  return !/^(1|true|on|yes)$/i.test(value);
}
