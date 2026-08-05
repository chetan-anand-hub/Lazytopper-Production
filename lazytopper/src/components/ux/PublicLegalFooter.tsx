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
      {LEGAL_LINKS.map(({ label, slug }) => (
        <Link key={slug} to={`/legal/${slug}`}>
          {label}
        </Link>
      ))}
    </footer>
  );
}
