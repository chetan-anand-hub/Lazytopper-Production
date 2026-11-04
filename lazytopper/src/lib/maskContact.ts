/**
 * maskContact — CODE-WHERE-1 (owner 4 Nov 2026): the ONE client-side place that masks a student's email or phone for
 * display. Import-free apart from the (also import-free) email helper, so any screen — including ones in the entry
 * chunk — can say where a code went without pulling the checkout / guest-pay services.
 *
 *   email  `ra••••@gmail.com`   first 2 of the local part (1 when it is that short) + "••••" + "@domain"
 *   phone  `+91 98•••••210`     country code + first 2 + bullets + last 3       (Indian mobiles; moved here from
 *                                                                               services/guestPay, which re-exports it)
 *          `+44•••••••456`      any other number given with a leading "+": first 2 digits + bullets + last 3
 *          `+••••••456`         ...with fewer than 10 digits: the last 3 only
 *
 * A masked value is for the student's OWN screen only. Never put the raw OR the masked value in a URL, storage, an
 * analytics event or a log.
 */
import { normaliseEmail } from "../services/checkoutWhoFlag";

/**
 * `ra••••@gmail.com`; never the whole local part when it is longer than one character: at most min(2, max(1, len-1))
 * characters, then "••••" ("ab@x.co" -> "a••••@x.co"). Not an email -> "".
 * (Stricter than checkoutWhoFlag's maskEmail, which checkout copy and the server's mirror still use unchanged.)
 */
export function maskEmail(raw: string | null | undefined): string {
  const e = normaliseEmail(raw);
  if (!e) return "";
  const at = e.indexOf("@");
  const keep = Math.min(2, Math.max(1, at - 1));
  return `${e.slice(0, keep)}••••${e.slice(at)}`;
}

/** Mirror of server/services/guestPay.cjs normaliseIndianMobile: an Indian mobile as `+91XXXXXXXXXX`, or null. */
export function normaliseIndianMobile(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 20 || /[^0-9+\s-]/.test(trimmed)) return null;
  let digits = trimmed.replace(/[\s-]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+91")) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return /^[6-9][0-9]{9}$/.test(digits) ? `+91${digits}` : null;
}

/** `+91 98•••••948`. Anything that is not an Indian mobile -> "". */
export function maskIndianMobile(raw: string | null | undefined): string {
  const n = normaliseIndianMobile(raw);
  if (!n) return "";
  const d = n.slice(3);
  return `+91 ${d.slice(0, 2)}•••••${d.slice(7)}`;
}

/**
 * Any phone number for display: an Indian mobile as `+91 98•••••210`; another international number written with a
 * leading "+" (8–15 digits) as `+44•••••••456` (under 10 digits: `+••••••456`, the last 3 only); anything else -> "".
 */
export function maskPhone(raw: string | null | undefined): string {
  const indian = maskIndianMobile(raw);
  if (indian) return indian;
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t.startsWith("+") || /[^0-9+\s-]/.test(t)) return "";
  const d = t.slice(1).replace(/[\s-]/g, "");
  if (!/^[0-9]{8,15}$/.test(d)) return "";
  if (d.length < 10) return `+${"•".repeat(d.length - 3)}${d.slice(-3)}`;
  return `+${d.slice(0, 2)}${"•".repeat(d.length - 5)}${d.slice(-3)}`;
}
