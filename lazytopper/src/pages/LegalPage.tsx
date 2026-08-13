import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

/**
 * LegalPage (`/legal/:slug`) — Privacy, Terms and Refund policies.
 *
 * Standalone public surface (never DesktopShell-wrapped — see isDesktopShellRoute
 * in App.tsx). It owns its whole chrome: a sticky brand header, the policy content
 * in a white product card, and a slim cross-linking footer — the same card language
 * as Practice/Home. Fonts come from the global --font-display (Fraunces) /
 * --font-body (Inter) tokens; the light surface palette is self-contained so the
 * page reads identically regardless of the ambient app theme.
 *
 * Inbound links land here from the Login footer (signed-out) and the account-menu
 * legal row (signed-in). "<- Back" returns to the origin surface via router history
 * (never a hard reload); each navigation lands at the top of the page.
 */
const SUPPORT_EMAIL = "support@lazytopper.com";

const MailLink = () => (
  <a className="lt-legal-mail" href={`mailto:${SUPPORT_EMAIL}`}>
    {SUPPORT_EMAIL}
  </a>
);

const LEGAL_CSS = `
  .lt-legal-page {
    --lt-legal-green: hsl(152, 55%, 45%);
    --lt-legal-green-d: hsl(152, 55%, 35%);
    --lt-legal-green-t: hsl(152, 55%, 95%);
    --lt-legal-green-l: hsl(152, 50%, 80%);
    --lt-legal-navy: hsl(222, 47%, 24%);
    --lt-legal-navy-d: hsl(217, 60%, 11%);
    --lt-legal-ink: hsl(220, 25%, 13%);
    --lt-legal-body: hsl(220, 18%, 27%);
    --lt-legal-muted: hsl(220, 14%, 45%);
    --lt-legal-line: hsl(220, 18%, 89%);
    --lt-legal-page-bg: hsl(220, 25%, 97%);

    min-height: 100vh;
    background: var(--lt-legal-page-bg);
    color: var(--lt-legal-ink);
    font-family: var(--font-body);
  }
  .lt-legal-page * {
    box-sizing: border-box;
  }

  .lt-legal-top {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 20px;
    background: #fff;
    border-bottom: 1px solid var(--lt-legal-line);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .lt-legal-back {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--lt-legal-green-d);
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 6px 11px;
    border-radius: 8px;
  }
  .lt-legal-back:hover {
    background: var(--lt-legal-green-t);
  }

  .lt-legal-wrap {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 20px 60px;
  }

  .lt-legal-tabs {
    display: flex;
    gap: 7px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .lt-legal-tab {
    font: inherit;
    font-size: 12.5px;
    padding: 7px 14px;
    border-radius: 20px;
    border: 1px solid var(--lt-legal-line);
    background: #fff;
    color: var(--lt-legal-muted);
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
  }
  .lt-legal-tab:hover {
    color: var(--lt-legal-navy);
  }
  .lt-legal-tab.is-active {
    background: var(--lt-legal-navy);
    color: #fff;
    border-color: var(--lt-legal-navy);
    font-weight: 500;
  }

  .lt-legal-card {
    background: #fff;
    border: 1px solid var(--lt-legal-line);
    border-radius: 16px;
    padding: 28px 30px;
    box-shadow: 0 2px 10px rgba(20, 40, 80, 0.045);
  }
  .lt-legal-eyebrow {
    font-size: 10.5px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--lt-legal-green-d);
    font-weight: 700;
  }
  .lt-legal-card h1 {
    font-family: var(--font-display);
    font-size: 29px;
    font-weight: 600;
    color: var(--lt-legal-navy-d);
    margin: 6px 0 5px;
    letter-spacing: -0.012em;
  }
  .lt-legal-updated {
    font-size: 12px;
    color: var(--lt-legal-muted);
    padding-bottom: 18px;
    border-bottom: 1px solid var(--lt-legal-line);
    margin-bottom: 20px;
  }
  .lt-legal-card h2 {
    font-family: var(--font-display);
    font-size: 16.5px;
    font-weight: 600;
    color: var(--lt-legal-navy-d);
    margin: 24px 0 7px;
  }
  .lt-legal-card h2:first-of-type {
    margin-top: 0;
  }
  .lt-legal-card p,
  .lt-legal-card li {
    font-size: 14.5px;
    color: var(--lt-legal-body);
    line-height: 1.72;
  }
  .lt-legal-card ul {
    margin: 8px 0 8px 20px;
  }
  .lt-legal-card li {
    margin: 5px 0;
  }

  .lt-legal-mail {
    color: var(--lt-legal-green-d);
    font-weight: 600;
    text-decoration: none;
    border-bottom: 1px solid var(--lt-legal-green-l);
  }
  .lt-legal-mail:hover {
    border-bottom-color: var(--lt-legal-green-d);
  }

  .lt-legal-contact {
    margin-top: 26px;
    background: var(--lt-legal-green-t);
    border: 1px solid var(--lt-legal-green-l);
    border-radius: 12px;
    padding: 15px 17px;
  }
  .lt-legal-contact-title {
    font-family: var(--font-display);
    font-size: 14.5px;
    font-weight: 600;
    color: var(--lt-legal-green-d);
    margin-bottom: 3px;
  }
  .lt-legal-contact p {
    font-size: 13.5px;
    color: hsl(152, 30%, 26%);
    line-height: 1.6;
  }

  .lt-legal-foot {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 20px 40px;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--lt-legal-muted);
  }
  .lt-legal-foot a {
    color: var(--lt-legal-muted);
    cursor: pointer;
    text-decoration: none;
  }
  .lt-legal-foot a:hover {
    color: var(--lt-legal-navy);
    text-decoration: underline;
  }

  .lt-legal-card.is-notfound {
    text-align: center;
  }

  .lt-legal-gohome {
    margin-top: 16px;
    border: none;
    border-radius: 10px;
    padding: 12px 22px;
    background: var(--lt-legal-green);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    font-family: inherit;
    cursor: pointer;
  }
  .lt-legal-gohome:hover {
    background: var(--lt-legal-green-d);
  }

  @media (max-width: 640px) {
    .lt-legal-wrap {
      padding: 16px 14px 40px;
    }
    .lt-legal-card {
      padding: 20px 17px;
      border-radius: 14px;
    }
    .lt-legal-card h1 {
      font-size: 23px;
    }
    .lt-legal-card p,
    .lt-legal-card li {
      font-size: 13.5px;
    }
  }
`;

type PageDef = {
  title: string;
  updated: string;
  body: ReactNode;
  contact: ReactNode;
};

const PAGES: Record<string, PageDef> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: April 2026",
    body: (
      <>
        <h2>Information We Collect</h2>
        <p>LazyTopper collects the following information when you create an account:</p>
        <ul>
          <li>Email address or phone number (for authentication)</li>
          <li>Display name (optional)</li>
          <li>Learning progress data (questions attempted, scores, mastery levels)</li>
        </ul>
        <h2>How We Use Your Data</h2>
        <ul>
          <li>To provide personalized learning recommendations</li>
          <li>To track your study progress and streak</li>
          <li>To generate performance analytics</li>
          <li>To improve our prediction algorithms</li>
        </ul>
        <h2>Data Storage</h2>
        <p>Your data is stored securely using Firebase (Google Cloud Platform). Learning progress is stored locally on your device and optionally synced to the cloud for cross-device access.</p>
        <h2>Third-Party Services</h2>
        <p>We use Firebase Authentication (Google) for secure sign-in. We do not sell your data to any third party.</p>
        <h2>Your Rights</h2>
        <p>You can request deletion of your account and all associated data by contacting us. A parent or guardian may also write to us to review, export or delete their child's data.</p>
      </>
    ),
    contact: (
      <p>
        For privacy questions or to request account deletion, email <MailLink />
      </p>
    ),
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: April 2026",
    body: (
      <>
        <h2>Acceptance of Terms</h2>
        <p>By using LazyTopper, you agree to these terms. LazyTopper is an educational tool for CBSE Class 10 exam preparation.</p>
        <h2>Service Description</h2>
        <p>LazyTopper provides AI-powered exam preparation including trend analysis, predicted questions, mock tests, and AI tutoring based on 10 years of CBSE board exam data.</p>
        <h2>Disclaimer</h2>
        <p>LazyTopper provides data-driven predictions based on historical CBSE patterns. These are not guaranteed exam questions. We do not guarantee any specific exam results or scores.</p>
        <h2>User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account. You must be at least 13 years old to use LazyTopper. If you are under 18, you must have your parent or guardian's permission to use LazyTopper. By creating an account, you confirm that you have it.</p>
        <h2>Subscription &amp; Payment</h2>
        <p>Free tier features are available without payment. Premium features require a subscription at the listed prices. You can cancel your subscription at any time.</p>
        <h2>Intellectual Property</h2>
        <p>All content, including prediction algorithms, question banks, and AI-generated explanations, is the property of LazyTopper.</p>
      </>
    ),
    contact: (
      <p>
        For questions about these terms, email <MailLink />
      </p>
    ),
  },
  refund: {
    title: "Refund Policy",
    updated: "Last updated: April 2026",
    body: (
      <>
        <h2>Free Trial</h2>
        <p>LazyTopper offers a 7-day free trial of Premium features. No payment is required during the trial period.</p>
        <h2>Refund Eligibility</h2>
        <p>If you are not satisfied with your Premium subscription, you may request a full refund within 7 days of your first payment. Refund requests after 7 days will be processed on a pro-rata basis for the unused portion of your subscription.</p>
        <h2>How to Request a Refund</h2>
        <p>Email us with your registered email or phone number and the reason for the refund. We will process your request within 5-7 business days.</p>
        <h2>Non-Refundable Items</h2>
        <p>Board Season Packs and Annual plans that have been used for more than 30 days are non-refundable, but you can cancel to prevent future charges.</p>
      </>
    ),
    contact: (
      <p>
        For refund requests or questions, email <MailLink />
      </p>
    ),
  },
};

const TABS: { slug: string; label: string }[] = [
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms of Service" },
  { slug: "refund", label: "Refund Policy" },
];

// Sticky back-bar only — NO logo/wordmark. The global app navbar (App.tsx) already
// brands every /legal view for both signed-in and signed-out visitors, so a second
// brand header here would double-stack. This bar carries the return affordance the
// global navbar does not provide (origin surface via router history, never a reload).
const BackBar = ({ onBack }: { onBack: () => void }) => (
  <div className="lt-legal-top">
    <button type="button" className="lt-legal-back" onClick={onBack}>
      {"<- Back"}
    </button>
  </div>
);

const LegalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const page = PAGES[slug || ""];

  // Land at the top of whichever policy was opened (never mid-document), and
  // reset when switching tabs.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Return to the origin surface via router history (login -> login, app -> app);
  // fall back to home on a cold deep-link with no history. Never a hard reload.
  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (!page) {
    return (
      <div className="lt-legal-page">
        <style>{LEGAL_CSS}</style>
        <BackBar onBack={goBack} />
        <div className="lt-legal-wrap">
          <div className="lt-legal-card is-notfound">
            <div className="lt-legal-eyebrow">Legal</div>
            <h1>Page not found</h1>
            <p>The policy you are looking for is not available.</p>
            <button type="button" className="lt-legal-gohome" onClick={() => navigate("/")}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lt-legal-page">
      <style>{LEGAL_CSS}</style>
      <BackBar onBack={goBack} />
      <div className="lt-legal-wrap">
        <nav className="lt-legal-tabs" aria-label="Policies">
          {TABS.map((tab) => (
            <Link
              key={tab.slug}
              to={`/legal/${tab.slug}`}
              className={`lt-legal-tab${tab.slug === slug ? " is-active" : ""}`}
              aria-current={tab.slug === slug ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="lt-legal-card">
          <div className="lt-legal-eyebrow">Legal</div>
          <h1>{page.title}</h1>
          <div className="lt-legal-updated">{page.updated}</div>
          {page.body}
          <div className="lt-legal-contact">
            <div className="lt-legal-contact-title">Contact us</div>
            {page.contact}
          </div>
        </div>
      </div>

      <div className="lt-legal-foot">
        <span>&copy; 2026 LazyTopper</span>
        {TABS.filter((tab) => tab.slug !== slug).map((tab) => (
          <Link key={tab.slug} to={`/legal/${tab.slug}`}>
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LegalPage;
