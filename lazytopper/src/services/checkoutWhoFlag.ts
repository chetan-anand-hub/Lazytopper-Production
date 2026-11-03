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
 * After a claim (Home's link step): "Also sign in with <masked>? Confirm it once …, then either works." `kind` names what the
 * step verifies with (an SMS code for a phone; the email link or Google for an email). Kept here (import-free) so Home does
 * not pull checkout code. `masked` is the server's masked echo.
 */
export function alsoSignInLine(masked: string, kind: "phone" | "email" = "phone"): string {
  return kind === "email"
    ? `Also sign in with ${masked}? Confirm it once from that inbox (or with Google), then either works.`
    : `Also sign in with ${masked}? Confirm it once with an SMS code, then either works.`;
}

/**
 * Fired on `window` (detail: AlsoSignIn) when a claim attached (or earlier delivered) an order that also named a phone or an
 * email this account does not sign in with. MASKED only.
 */
export const ALSO_SIGNIN_EVENT = "lazytopper:also-signin";
export interface AlsoSignIn {
  kind: "phone" | "email";
  masked: string;
}

/* ── email helpers (CHECKOUT-WHO-2: here, import-free, so host chunks such as PassCheckout / PacksShop do not pull the
 *    checkout or guest-pay services just to mask the signed-in student's own email) ── */

const EMAIL_SHAPE = /^[^\s@<>()",;:]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** An email as the claim key (trimmed, lower-cased), or null. Mirrors server/services/guestPay.cjs normaliseEmail. */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e && e.length <= 254 && EMAIL_SHAPE.test(e) ? e : null;
}

/** `an••••@gmail.com`; not an email -> "". */
export function maskEmail(raw: string | null | undefined): string {
  const e = normaliseEmail(raw);
  if (!e) return "";
  const at = e.indexOf("@");
  return `${e.slice(0, Math.min(2, at))}••••${e.slice(at)}`;
}
