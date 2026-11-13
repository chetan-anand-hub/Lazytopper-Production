/**
 * waOptIn - WHATSAPP-OPTIN-1 (owner 13 Nov 2026): the WhatsApp number + consent tick offered above Buy (pack pop-up, Board Pass
 * checkout) and under a free sample, so an unpaid checkout / a downloaded sample can be followed up on WhatsApp.
 *
 * Import-free on purpose (no guestPay / checkout imports) so the host chunks that read it stay small.
 *
 *   - The LABEL is the exact text the visitor ticks; the server stores its own copy of it (server/services/waOptIn.cjs) and a test
 *     compares the two strings.
 *   - At checkout the field keeps a PENDING opt-in in memory only (never storage, never a URL, never analytics, never a log).
 *     `waOptInOrderFields()` is spread into the order-create request by createPayOrder / createPackOrder / createSelfOrder: nothing
 *     is sent unless the number is a valid Indian mobile AND the tick is on. Buy works whether or not the field is filled.
 *   - On a free sample the visitor presses "Send": POST /api/whatsapp/optin (no account, no sign-in).
 */

export const WA_OPTIN_LABEL = "Send me updates on WhatsApp";
export const WA_OPTIN_VERSION = "wa-optin-v1";
export const WA_OPTIN_ENDPOINT = "/api/whatsapp/optin";
export const WA_NUMBER_LABEL = "WhatsApp number";
export const WA_BAD_NUMBER = "Enter a 10-digit mobile number.";
export const WA_SAMPLE_OPEN = "Get this pack's link on WhatsApp";
export const WA_SAMPLE_SEND = "Send";
export const WA_SAMPLE_DONE = "Done. We will send it on WhatsApp.";
export const WA_SAMPLE_FAILED = "Could not save that. Please try again.";

/** Client kill switch: VITE_WA_OPTIN_DISABLED=1 hides every block (the server has WA_OPTIN_DISABLED). */
export function isWaOptInClientEnabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_WA_OPTIN_DISABLED;
    return !/^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return true;
  }
}

/** The ten digits of an Indian mobile typed in any usual way (+91 / 91 / 0 prefix, spaces, dashes), or null. Mirrors the server's normaliseIndianMobile. */
export function waTenDigits(raw: string): string | null {
  const t = (raw || "").trim();
  if (!t || t.length > 20 || /[^0-9+\s-]/.test(t)) return null;
  let d = t.replace(/[\s-]/g, "");
  if (d.startsWith("+")) {
    if (!d.startsWith("+91")) return null;
    d = d.slice(3);
  } else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9][0-9]{9}$/.test(d) ? d : null;
}

let pending: string | null = null;

/** The checkout block's current valid + ticked number (ten digits), or null to clear. In memory only. */
export function setPendingWaOptIn(tenDigits: string | null): void {
  pending = tenDigits;
}

/** Spread into an order-create body: `{ waOptIn: { phone, consent: true } }` or `{}`. */
export function waOptInOrderFields(): { waOptIn?: { phone: string; consent: true } } {
  return pending ? { waOptIn: { phone: pending, consent: true } } : {};
}

/** Free-sample opt-in. Resolves true only on a 2xx. Never throws; nothing is logged. */
export async function postSampleOptIn(tenDigits: string, packId: string): Promise<boolean> {
  try {
    const res = await fetch(WA_OPTIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: tenDigits, consent: true, packId, consentVersion: WA_OPTIN_VERSION }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
