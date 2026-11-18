import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import PublicLegalFooter from "../ux/PublicLegalFooter";
import SeoFaq from "../seo/SeoFaq";
import type { FaqItem } from "../seo/faqContent";
import { SEO_PAGE_SPECS, SEO_PAGES_PATHS } from "./seoPages";
import "./seoLanding.css";

/**
 * SeoLandingShell (SEO-PAGES-1) — the frame the three public search-landing pages share: breadcrumb, one H1, a sub-line and one
 * call to action in the hero, the page body, the FAQ (the SAME items the FAQPage JSON-LD serialises), the links to the other two
 * pages, the independence line and the public footer. Responsive by CSS alone; no auth hook, nothing fetched, fixed ids only,
 * so the signed-out render the prerender freezes is the render every reader gets.
 */
export interface SeoLandingShellProps {
  path: string;
  testId: string;
  eyebrow: string;
  sub: string;
  cta: { to: string; label: string; testId: string };
  /** PACKS-LPX-2: a primary Buy in the hero; the free `cta` then renders as the secondary button. */
  heroBuy?: ReactNode;
  faq: readonly FaqItem[];
  children: ReactNode;
}

export default function SeoLandingShell({ path, testId, eyebrow, sub, cta, heroBuy, faq, children }: SeoLandingShellProps) {
  const spec = SEO_PAGE_SPECS[path];
  const others = SEO_PAGES_PATHS.filter((p) => p !== path);
  return (
    <main className="lt-seol" data-testid={testId}>
      <header className="lt-seol__hero">
        <div className="lt-seol__w">
          <nav aria-label="Breadcrumb" className="lt-seol__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <span aria-current="page">{spec.crumb}</span>
          </nav>
          <p className="lt-seol__eyebrow">{eyebrow}</p>
          <h1>{spec.h1}</h1>
          <p className="lt-seol__sub">{sub}</p>
          {heroBuy}
          <Link to={cta.to} className={heroBuy ? "lt-seol__cta lt-seol__cta--secondary" : "lt-seol__cta"} data-testid={cta.testId}>
            {cta.label}
          </Link>
        </div>
      </header>

      <div className="lt-seol__w lt-seol__body">
        {children}

        <SeoFaq headingId="seol-faq" heading="Common questions" items={faq} />

        <nav className="lt-seol__more" aria-label="More for Class 10" data-testid="seol-more">
          <h2 id="seol-more">More for Class 10</h2>
          <ul>
            {others.map((p) => (
              <li key={p}>
                <Link to={p}>{SEO_PAGE_SPECS[p].linkLabel}</Link>
              </li>
            ))}
            <li>
              <Link to="/practice-hub">Practice hub</Link>
            </li>
            <li>
              <Link to="/exam-trends">Exam trends by chapter</Link>
            </li>
          </ul>
        </nav>

        <p className="lt-seol__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
