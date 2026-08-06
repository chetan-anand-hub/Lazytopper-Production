import { Link } from "react-router-dom";
import {
  FOUNDING_COHORT_COPY,
  FOUNDING_LABEL,
  FOUNDING_LOCK_COPY,
  FOUNDING_OFFER_OPEN,
  PERIOD_ANNUAL_LABEL,
  PERIOD_MONTHLY_LABEL,
  PRICE_ANNUAL_LIST_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
} from "../../config/pricing";

/**
 * OfferStrip — what the student is actually joining, stated on the auth surface.
 *
 * WHY THIS EXISTS
 * `SignUpPage.tsx` contains ZERO matches for price, trial, founding, free or ₹:
 * the only strings in it are error messages. Every student who signs up today
 * converts blind — asked for a name, an email and a password with no statement
 * of what they are joining — while the strongest lever the product has (founding
 * member, a lower rate, first N students) sits two navigations away on /pricing.
 *
 * ★★ NEVER A COUNT.
 * This renders "First 200 students" and must never render "43 places left". The
 * first is a true claim about the OFFER; the second is a claim about DEMAND that
 * the product cannot make honestly. A live counter that does not move for a
 * month reads as "nobody is buying" — worse than silence — and a hand-tuned one
 * is fabrication, which CLAUDE.md §5 forbids in code. There is deliberately no
 * field here that could become one.
 *
 * ★ EVERY FIGURE COMES FROM `src/config/pricing.ts`.
 * Not one rupee amount is typed in this file. `pricing.guard.test.ts` walks all
 * of `src/` and fails on any rupee-form or structured-form price literal outside
 * the pricing module; `OfferStrip.test.tsx` additionally re-runs that scan
 * against this one file so the assertion names its subject.
 *
 * ★ THE PERMANENCE CLAIM IS SCOPED TO AN ACTIVE SUBSCRIPTION.
 * `FOUNDING_LOCK_COPY` is rendered verbatim rather than reworded. The broad
 * "we never raise anyone's price" is a claim about PUBLISHED prices, which this
 * product cannot support (the board year moved between #539 and #548). Reusing
 * the approved string is what keeps the two apart.
 *
 * The offer state is a single build-time boolean (`FOUNDING_OFFER_OPEN`). A
 * Firestore-backed toggle is a later change; a constant the owner edits cannot
 * fail at runtime, which is the right trade for a line on the sign-in page.
 */

/**
 * The after-trial line — the most load-bearing sentence on this surface.
 *
 * "Free trial" reads to a parent as "a card will be charged in seven days".
 * Naming what happens next removes the single most common reason a sign-up is
 * abandoned. Monetisation copy is frozen product-wide on this point: never
 * "then paid", always "then free Basic, upgrade anytime".
 *
 * Exported as data because the auth surface renders it TWICE — once in the dark
 * brand panel (>=1024px) and once inside the gate card (<1024px, where the brand
 * panel is `display: none`). One constant, two mounts, so the two copies cannot
 * drift apart.
 */
export const AFTER_TRIAL_LEAD = "After 7 days you keep free Basic";
export const AFTER_TRIAL_REST =
  " — practice, exam trends and topic insights — for as long as you like. Upgrade only if you want to.";

const OFFER_STRIP_CSS = `
  .lt-offer-strip {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 14px;
    color: var(--lt-green-dark, #0b8f50);
    background: rgba(22, 185, 106, 0.1);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.84rem;
    line-height: 1.5;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip {
    color: #b6f2d5;
  }

  .lt-offer-strip-lead {
    margin: 0;
    font-weight: 900;
    font-size: 0.86rem;
  }

  .lt-offer-strip-body {
    margin: 0;
    color: var(--lt-muted, #49627f);
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-body {
    color: #cfe3f3;
  }

  .lt-offer-strip-badge {
    color: var(--lt-green-dark, #0b8f50);
    font-weight: 900;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-badge {
    color: #8ff0c0;
  }

  .lt-offer-strip-price {
    white-space: nowrap;
    font-weight: 900;
  }

  /* The list price is struck because it is not what a founding member pays —
     NOT because it is retired. It is live and charged from student 201 onward.
     <s> carries that meaning natively. It is kept on its own nowrap run so the
     strike cannot break across two lines at 390px, where a half-struck figure
     is unreadable. */
  .lt-offer-strip-was {
    white-space: nowrap;
    opacity: 0.75;
    text-decoration-thickness: 1px;
  }

  .lt-offer-strip-note {
    margin: 0;
    color: var(--lt-muted, #49627f);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-note {
    color: #b8c6d8;
  }

  .lt-offer-strip-link {
    align-self: flex-start;
    margin-top: 2px;
    color: var(--lt-green-dark, #0b8f50);
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-link {
    color: #8ff0c0;
  }

  .lt-login-aftertrial {
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.78rem;
    line-height: 1.5;
    font-weight: 600;
    max-width: 560px;
  }

  .lt-login-aftertrial strong {
    color: #dffff0;
    font-weight: 800;
  }

  /* Mobile mirror. The brand panel is display:none below 1024px, so without
     this the after-trial sentence would be invisible to every phone student —
     the exact audience most likely to read "free trial" as "my parent's card
     gets charged". */
  .lt-login-aftertrial--mobile {
    display: none;
    color: var(--lt-muted, #49627f);
  }

  .lt-login-aftertrial--mobile strong {
    color: var(--lt-ink, #071a3d);
  }

  /* ★★ THE PANEL VARIANT SITS ON A PERMANENTLY DARK BACKDROP, so its colours
     cannot key off the PAGE theme.

     Every rule above pairs a light-theme colour with a
     .lt-login-page[data-login-theme="dark"] override — correct while the strip
     lived in the auth column, which really does follow the page theme. The
     brand panel does not: it is navy in BOTH themes. So in LIGHT theme the
     strip rendered #49627f body text and #0b8f50 links on near-black navy —
     the same class of defect as the 1.04:1 white-on-white AUTH-3 fixed, and
     invisible to every assertion in the suite.

     Caught by a 1440px screenshot after the move, not by a test. These rules
     are scoped to the panel variant only, so the mobile mirror keeps following
     the page theme exactly as before.

     NO BACKTICKS ANYWHERE IN THIS STRING. It is a template literal, so one
     would terminate it and take the build down. */
  .lt-offer-strip--panel {
    color: #b6f2d5;
    background: rgba(53, 242, 160, 0.085);
    border-color: rgba(53, 242, 160, 0.3);
  }

  .lt-offer-strip--panel .lt-offer-strip-lead {
    color: #a7f7d0;
  }

  .lt-offer-strip--panel .lt-offer-strip-body,
  .lt-offer-strip--panel .lt-offer-strip-note {
    color: #cfe0f2;
  }

  .lt-offer-strip--panel .lt-offer-strip-badge {
    color: #8ff0c0;
    background: rgba(53, 242, 160, 0.16);
  }

  .lt-offer-strip--panel .lt-offer-strip-price {
    color: #ffffff;
  }

  .lt-offer-strip--panel .lt-offer-strip-was {
    color: rgba(207, 224, 242, 0.62);
  }

  .lt-offer-strip--panel .lt-offer-strip-link {
    color: #7ff3c0;
  }

  .lt-offer-strip--panel .lt-login-aftertrial {
    color: #cfe0f2;
  }

  .lt-offer-strip--panel .lt-login-aftertrial strong {
    color: #ffffff;
  }

  /* The compact strip mirrors the panel one for phones, so it is the exact
     inverse of the brand panel: hidden while the panel is visible, shown once
     the panel is removed. Same reasoning as the after-trial mirror above, and
     the same breakpoint — 1023px, which is where Login.tsx sets
     .lt-login-brand-panel to display:none. */
  .lt-offer-strip--mobile {
    display: none;
    /* ⚠ 3.76:1 BEFORE THIS LINE — a real WCAG-AA failure for normal text, and
       PRE-EXISTING on trunk rather than introduced here.

       The strip inherits var(--lt-green-dark, #0b8f50) and sits on its own
       rgba(22,185,106,0.1) wash over white, which composites to about #e8f8f0.
       The lead is 0.86rem and the link 0.8rem — nowhere near the 18.66px-bold
       large-text exemption, so 4.5:1 is the bar and it missed.

       Found by this lane's own contrast probe once that probe was fixed to
       composite alpha instead of scoring a 10%-alpha wash as solid green. The
       original measurement reported 1.09:1 for legible text and would never
       have been believed; a correct measurement found a defect nobody had seen.

       Scoped to the mobile variant, which is the only place this colour lands
       on a light backdrop now. The dark-theme rule has higher specificity and
       still wins, so dark theme is untouched. */
    color: #07713f;
  }

  .lt-offer-strip--mobile .lt-offer-strip-link {
    color: #07713f;
  }

  @media (max-width: 1023px) {
    .lt-login-aftertrial--mobile {
      display: block;
    }

    .lt-offer-strip--mobile {
      display: flex;
    }
  }
`;

/** The after-trial sentence. `variant` picks which breakpoint it belongs to. */
export function AfterTrialLine({ variant }: { variant: "panel" | "mobile" }) {
  return (
    <p
      className={
        variant === "mobile"
          ? "lt-login-aftertrial lt-login-aftertrial--mobile"
          : "lt-login-aftertrial"
      }
      data-testid={`lt-after-trial-${variant}`}
    >
      <strong>{AFTER_TRIAL_LEAD}</strong>
      {AFTER_TRIAL_REST}
    </p>
  );
}

/**
 * ★ TWO VARIANTS, ONE COMPONENT, ONE PRICE CONSTANT — NAME-1 v2.
 *
 * `panel` (default) is the full block. It lives in the login page's dark brand
 * column, which is `display: none` below 1024px, so it needs no breakpoint rule
 * of its own — its parent already disappears.
 *
 * `mobile` is the compact mirror inside the auth column, and it deliberately
 * DROPS THE PRICE. The two lines do different jobs: "then free Basic" reduces
 * the anxiety that makes a student abandon signup, while the founding rate
 * sells. On a phone, where the whole offer competes with the form itself, only
 * the first earns its space — the second goes one tap away behind the link.
 *
 * Both read the same constants, so the two can never drift.
 *
 * ⚠ The default is `panel` on purpose: every standalone render in
 * OfferStrip.test.tsx (the price, badge, strike, never-a-count and no-literal
 * suites) asserts against the FULL block, and a default of `mobile` would have
 * silently emptied all of them.
 */
export default function OfferStrip({
  variant = "panel",
}: { variant?: "panel" | "mobile" } = {}) {
  if (variant === "mobile") {
    return (
      <div
        className="lt-offer-strip lt-offer-strip--mobile"
        data-testid="lt-offer-strip-mobile"
        aria-label="What you are joining"
      >
        <style dangerouslySetInnerHTML={{ __html: OFFER_STRIP_CSS }} />
        <p className="lt-offer-strip-lead">7-day full trial, then free Basic</p>
        <AfterTrialLine variant="mobile" />
        <Link className="lt-offer-strip-link" to="/pricing?source=login">
          {"See plans and founding-member price →"}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="lt-offer-strip lt-offer-strip--panel"
      data-testid="lt-offer-strip"
      aria-label="What you are joining"
    >
      <style dangerouslySetInnerHTML={{ __html: OFFER_STRIP_CSS }} />

      <p className="lt-offer-strip-lead">7-day full trial, then free Basic</p>

      <AfterTrialLine variant="panel" />

      {FOUNDING_OFFER_OPEN ? (
        <>
          <p className="lt-offer-strip-body">
            <span className="lt-offer-strip-badge" data-testid="lt-offer-founding-badge">
              {FOUNDING_LABEL}
            </span>
            {": you keep "}
            <span className="lt-offer-strip-price">
              {`${PRICE_MONTHLY_FOUNDING_DISPLAY} ${PERIOD_MONTHLY_LABEL}`}
            </span>
            {" "}
            <s className="lt-offer-strip-was">
              {`${PRICE_MONTHLY_LIST_DISPLAY} ${PERIOD_MONTHLY_LABEL}`}
            </s>
            {`. ${FOUNDING_COHORT_COPY}`}
          </p>
          <p className="lt-offer-strip-note">{FOUNDING_LOCK_COPY}</p>
        </>
      ) : (
        <p className="lt-offer-strip-body">
          {"Premium is "}
          <span className="lt-offer-strip-price">
            {`${PRICE_MONTHLY_LIST_DISPLAY} ${PERIOD_MONTHLY_LABEL}`}
          </span>
          {" or "}
          <span className="lt-offer-strip-price">
            {`${PRICE_ANNUAL_LIST_DISPLAY} ${PERIOD_ANNUAL_LABEL}`}
          </span>
          {". Upgrade whenever you like."}
        </p>
      )}

      <Link className="lt-offer-strip-link" to="/pricing?source=login">
        {"See plans →"}
      </Link>
    </div>
  );
}
