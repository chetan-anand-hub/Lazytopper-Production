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

  @media (max-width: 1023px) {
    .lt-login-aftertrial--mobile {
      display: block;
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

export default function OfferStrip() {
  return (
    <div className="lt-offer-strip" data-testid="lt-offer-strip" aria-label="What you are joining">
      <style dangerouslySetInnerHTML={{ __html: OFFER_STRIP_CSS }} />

      <p className="lt-offer-strip-lead">7-day full trial, then free Basic</p>

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
