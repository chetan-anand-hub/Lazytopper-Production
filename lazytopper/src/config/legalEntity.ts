/**
 * LEGAL-ENTITY-1 (owner ruling, 2026-10-14) — the company that operates LazyTopper.
 *
 * Razorpay activates the merchant under this exact name (KYC as a Private Limited
 * company, spelled as on the Certificate of Incorporation: all caps, with the
 * underscore). Its website review checks that the site names the same legal entity.
 *
 * ONE SOURCE (L1): every rendering of the name reads this constant — the legal
 * pages' contact block, the Terms' first paragraph, and both copyright lines. The
 * string appears nowhere else in `src/` outside tests; `legalEntity.guard.test.tsx`
 * enforces that.
 */
export const LEGAL_ENTITY_NAME = "P&CGOLDDUST_TECH PRIVATE LIMITED";
