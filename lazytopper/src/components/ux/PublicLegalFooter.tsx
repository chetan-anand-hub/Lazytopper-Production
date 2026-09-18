import { Link, useLocation } from "react-router-dom";

/**
 * PublicLegalFooter — a slim, persistent legal row for the SIGNED-OUT public
 * surfaces that carry no app chrome.
 *
 * [FU-LEGAL-FOOTER-LINK]. The signed-in surfaces already reach the `/legal/:slug`
 * policies: the desktop avatar menu (DesktopShell legal row) and the mobile account
 * menu (MobileAccountMenu legal row). The sign-in door reaches them too, and
 * `/sign-up` inherits that footer because SignUpPage renders Login's `AuthDoor`.
 *
 * The gap was the PUBLIC landing and pricing surfaces. `isPublicLandingRoute` in
 * App.tsx suppresses the global navbar on `/welcome`, `/pricing` and signed-out
 * `/`, and those pages import no shared chrome — so a visitor who never reaches the
 * sign-in door had NO route to the privacy policy at all. LazyTopper collects data
 * from 14-16 year olds; India's DPDP Act treats under-18s as children, and a policy
 * a minor cannot reach is not a policy.
 *
 * Deliberately NOT a new visual language: same labels, same slugs and the same
 * quiet, subordinate weight as the two existing account-menu legal rows.
 *
 * Renders real `<Link>` anchors (not buttons) so the affordance is a keyboard- and
 * screen-reader-addressable link with a real `href` — which is also what the guard
 * tests assert.
 */

/** Mirrors DesktopShell / MobileAccountMenu LEGAL_LINKS exactly — same labels, same slugs. */
const LEGAL_LINKS = [
  { label: "Privacy", slug: "privacy" },
  { label: "Terms", slug: "terms" },
  { label: "Refunds", slug: "refund" },
] as const;

/**
 * [LINK-1] RETIRED (RETIRE-1). This footer carried a plain <a> to the static
 * `/questions/**` namespace — the single inbound link that gave that orphaned space
 * a vote rather than only a sitemap suggestion.
 *
 * ★★ THE LINK WAS REMOVED WITH ITS TARGET, DELIBERATELY, AND THIS IS THE REASON.
 * The static space is gone, and NO TEST HERE EVER ASSERTED THE TARGET EXISTED — they
 * pinned the href string and the anchor’s click behaviour. So leaving the link would
 * have shipped a permanent 404 on every public page that EVERY GATE PASSES OVER in
 * silence. Removing the target and keeping the link is the one combination nothing in
 * this repo can detect.
 *
 * ⚠ WHEN THE LINK COMES BACK it must be a plain <a>, never a react-router <Link>:
 * App.tsx’s catch-all is `<Route path="*" element={<HomeRedirect />} />`, so a <Link>
 * to a non-SPA URL is intercepted, matches nothing, and bounces the visitor home
 * without the page ever being requested — and a <Link> renders an <a href> too, so an
 * href assertion cannot see the difference. The click is the property, not the href.
 * It also must carry no `rel="nofollow"` and no `target="_blank"`.
 */

const FOOTER_CSS = `
  .lt-public-legal {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px 16px;
    padding: 18px 20px 26px;
    font-family: var(--font-body);
    font-size: 12px;
    line-height: 1.5;
    color: hsl(220, 12%, 52%);
    text-align: center;
  }
  .lt-public-legal a {
    color: inherit;
    font-weight: 500;
    text-decoration: none;
    padding: 2px 0;
  }
  .lt-public-legal a:hover,
  .lt-public-legal a:focus-visible {
    color: hsl(222, 47%, 24%);
    text-decoration: underline;
  }
  @media (max-width: 389px) {
    .lt-public-legal {
      gap: 4px 12px;
      padding: 14px 14px 20px;
      font-size: 11.5px;
    }
  }
`;

/**
 * @param className optional extra class so a host page can tune spacing/contrast
 *                  without this component owning per-page layout.
 */
export default function PublicLegalFooter({ className }: { className?: string }) {
  // CBSE-PAGE-1 — the return ticket for the CBSE link below. This footer renders on
  // three different surfaces, so the origin is read, never assumed. No backLabel is
  // passed: a site-wide row cannot honestly name where it was clicked from, and the
  // shared reader falls back to "Back".
  const { pathname } = useLocation();
  return (
    <footer
      className={className ? `lt-public-legal ${className}` : "lt-public-legal"}
      aria-label="Legal"
    >
      <style>{FOOTER_CSS}</style>
      <span>&copy; 2026 LazyTopper</span>
      {/* SEO-NOTES-AND-LINKS-1 — the one crawl path Google has demonstrably followed
          on this site is this footer. Exam Trends lists every chapter, so this single
          link opens all 26 topic hubs to a signed-out crawler. An in-app route, so a
          router <Link> is correct here (unlike the retired static /questions link). */}
      <Link to="/exam-trends">Chapters</Link>
      {/* CBSE-PAGE-1 — beside Chapters for the same reason Chapters is here: this
          footer is the one crawl path Google has actually followed on this site. */}
      <Link to={`/cbse/class-10?returnTo=${encodeURIComponent(pathname)}`}>CBSE 2027</Link>
      {LEGAL_LINKS.map(({ label, slug }) => (
        <Link key={slug} to={`/legal/${slug}`}>
          {label}
        </Link>
      ))}
    </footer>
  );
}
