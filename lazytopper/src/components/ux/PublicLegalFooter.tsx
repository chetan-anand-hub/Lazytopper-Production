import { Link } from "react-router-dom";

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
 * [LINK-1] The public questions namespace had ZERO inbound links from anywhere on the
 * site — `/`, `/app/`, `/app/exam-trends` and `/app/pricing` each returned 0. The
 * sitemap was its only route, and Google returned "Crawled - currently not indexed",
 * which is the standard verdict for an orphan and says nothing about page quality.
 * A sitemap is a suggestion; a link is a vote. This is that vote.
 *
 * ★★ THIS MUST STAY A PLAIN <a href>, NEVER A REACT-ROUTER <Link>.
 * `/questions/*` is served as STATIC HTML by the vercel.json rewrite
 * `/questions/:path(.*)` -> `/app/questions/:path`, entirely OUTSIDE the SPA.
 * App.tsx has no `/questions` route, and its catch-all is
 * `<Route path="*" element={<HomeRedirect />} />` — so a <Link> would be intercepted
 * by the router, match nothing, and BOUNCE THE VISITOR TO THE HOME PAGE without the
 * static page ever being requested. A <Link> renders an <a href> too, so this failure
 * is invisible to an href assertion; the guard test clicks the link and asserts the
 * router did NOT navigate.
 *
 * ⚠ No `rel="nofollow"` and no `target="_blank"` — a nofollow link passes no ranking
 * signal and would defeat the entire purpose of this link.
 *
 * ⚠ THIS FOOTER IS CLIENT-RENDERED, so the link is NOT in the raw HTML. Measured on
 * production: `/` and `/app/pricing` both serve the same 2,978-byte SPA shell, and the
 * legal links already live there return 0 hits for `href="/legal/privacy"` in raw HTML.
 * A `curl | grep` therefore reads 0 for this link too — that is the surface's normal
 * state, NOT a broken link; verify in the browser via View Source after hydration.
 * Googlebot does render JS, but a raw-HTML link would be a stronger signal, so moving
 * or mirroring this onto a server-rendered surface is tracked as
 * [FU-LINK1-CLIENT-RENDERED-LINK-WEAKER-THAN-RAW-HTML].
 *
 * ⚠ Target is the CHAPTER page, not a hub: `/questions/class-10/` currently returns the
 * SPA shell (2,978 bytes, byte-identical to a bogus URL — both 200, so status is not a
 * liveness test here). ENGINE-1's hub has not shipped. Repoint when it does:
 * [FU-LINK1-REPOINT-TO-HUB-WHEN-ENGINE1-LANDS].
 */
const QUESTIONS_HREF = "/questions/class-10/science/light-reflection-and-refraction/";

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
  return (
    <footer
      className={className ? `lt-public-legal ${className}` : "lt-public-legal"}
      aria-label="Legal"
    >
      <style>{FOOTER_CSS}</style>
      <span>&copy; 2026 LazyTopper</span>
      {/* Plain anchor on purpose — see QUESTIONS_HREF above. Do not convert to <Link>. */}
      <a href={QUESTIONS_HREF}>Practice questions</a>
      {LEGAL_LINKS.map(({ label, slug }) => (
        <Link key={slug} to={`/legal/${slug}`}>
          {label}
        </Link>
      ))}
    </footer>
  );
}
