/**
 * CHECKOUT-WHO-1 - the ONE reader of the client switch VITE_CHECKOUT_WHO_ENABLED ("Who will use it?" checkout). Import-free on
 * purpose, so pure copy modules (pricingPlansCopy) can follow the flag without pulling checkout code. The server has its own
 * switch (CHECKOUT_WHO_ENABLED + PAYMENTS_ENABLED); BOTH are needed.
 */
export function isCheckoutWhoClientEnabled(): boolean {
  try {
    // A literal `import.meta.env.VITE_…` expression, so Vite and Vitest both rewrite it.
    const raw: unknown = import.meta.env.VITE_CHECKOUT_WHO_ENABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/**
 * After a claim (Home's link-a-number step): "Also sign in with +91 98•••••948? Confirm it once with an SMS code, then either
 * works." Kept here (import-free) so Home does not pull checkout code. `masked` is the server's masked echo.
 */
export function alsoSignInLine(masked: string): string {
  return `Also sign in with ${masked}? Confirm it once with an SMS code, then either works.`;
}

/** Fired on `window` (detail: AlsoSignIn) when a claim attached an order that also named a phone this account lacks. MASKED. */
export const ALSO_SIGNIN_EVENT = "lazytopper:also-signin";
export interface AlsoSignIn {
  kind: "phone";
  masked: string;
}
