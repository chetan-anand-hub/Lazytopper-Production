/**
 * PHONE-PASTE-1 — what a typed / pasted / autofilled mobile-number field keeps.
 *
 * The phone fields show a fixed "+91" prefix and keep at most 10 digits. They used to keep the
 * FIRST ten digits of whatever arrived, so a pasted "+91 97145 68948" became "9197145689" (a
 * different, possibly real, number) and "09714568948" became "0971456894" (invalid), which
 * Firebase answered with auth/invalid-phone-number.
 *
 * Rule (same prefixes `normaliseIndianMobile` in services/guestPay.ts accepts, whose contract is
 * unchanged): a leading "+91" is the country code; otherwise 12 digits starting "91" drop the
 * "91" and 11 digits starting "0" drop the "0"; then at most 10 digits are kept. Pure; partial
 * input while typing passes through as digits.
 */
export function normaliseTypedIndianMobile(raw: string | null | undefined): string {
  const text = typeof raw === "string" ? raw.trim() : "";
  let digits = text.replace(/\D/g, "");
  if (/^\+\s*9\s*1/.test(text)) digits = digits.slice(2);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Max characters a phone field accepts, so a pasted "+91 97145 68948" is not cut by the browser first. */
export const TYPED_MOBILE_MAX_LENGTH = 16;
