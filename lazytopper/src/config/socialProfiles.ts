/**
 * ORG-SAMEAS-1 — LazyTopper's own social profiles: the ONE list.
 *
 * Two places state them and must never drift:
 *   - the Organization node's `sameAs` in `index.html` (the shell JSON-LD, read as TEXT by
 *     `socialProfiles.guard.test.ts`, which deep-equals it to `SAME_AS` below), and
 *   - the public footer's social row (`PublicLegalFooter.tsx`, built from `FOOTER_SOCIAL`).
 *
 * `index.html` cannot import this module, so the guard is what ties them together. To change
 * a profile, edit it here AND in `index.html`; the guard goes red until both agree.
 *
 * ⚠ These are the only profile URLs the site declares. No UTM tags, no `nofollow`: a `sameAs`
 * or `rel="me"` link is an identity claim, not an ad click.
 */

export const YOUTUBE_URL = "https://www.youtube.com/@Lazytopper_CBSE";
export const INSTAGRAM_URL = "https://www.instagram.com/lazy_topper_/";
export const FACEBOOK_URL = "https://www.facebook.com/lazytoppercbse";
export const X_URL = "https://x.com/lazy_topper_";
export const LINKEDIN_URL = "https://www.linkedin.com/company/146258133";
export const WHATSAPP_URL = "https://wa.me/919714568948";

/** The Organization's `sameAs`, in this order. */
export const SAME_AS: readonly string[] = [YOUTUBE_URL, INSTAGRAM_URL, FACEBOOK_URL, X_URL, LINKEDIN_URL];

/** The footer's social row, in this order. X and LinkedIn are `sameAs` only. */
export const FOOTER_SOCIAL: ReadonlyArray<{ label: string; href: string }> = [
  { label: "YouTube", href: YOUTUBE_URL },
  { label: "Instagram", href: INSTAGRAM_URL },
  { label: "Facebook", href: FACEBOOK_URL },
  { label: "WhatsApp: ask a doubt", href: WHATSAPP_URL },
];
