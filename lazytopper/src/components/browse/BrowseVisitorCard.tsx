import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { trackBrowseVisitorCardShown, trackBrowseVisitorCardTap, type BrowseVisitorCardAction } from "../../analytics/analytics";
import {
  BROWSE_CARD_ABOUT_PATH,
  BROWSE_CARD_IITIAN_LINE,
  BROWSE_CARD_PRICING_PATH,
  BROWSE_CARD_SIGNUP_PATH,
  browseVisitorCardCopy,
  isBrowseCardDismissed,
  markBrowseCardDismissed,
  takeBrowseCardShownOnce,
} from "./browseVisitorCardModel";
import "./browseVisitorCard.css";

/**
 * BROWSE-VISITOR-CARD-1 (owner decision, 5 Nov 2026) - one compact card at the top of /browse for a SIGNED-OUT visitor.
 * The wrapper (BrowseVisitorCardLazy) decides who sees it; this component only draws it. Dismissible for the session.
 */
export default function BrowseVisitorCard() {
  const [dismissed, setDismissed] = useState<boolean>(() => isBrowseCardDismissed());
  const copy = browseVisitorCardCopy(new Date());

  useEffect(() => {
    if (dismissed) return;
    if (takeBrowseCardShownOnce()) trackBrowseVisitorCardShown();
  }, [dismissed]);

  if (dismissed) return null;

  const tap = (action: BrowseVisitorCardAction) => () => trackBrowseVisitorCardTap(action);

  return (
    <aside className="lt-bvc" data-testid="browse-visitor-card" aria-label="About LazyTopper">
      <div className="lt-bvc__top">
        <p className="lt-bvc__kicker">{BROWSE_CARD_IITIAN_LINE}</p>
        <button
          type="button"
          className="lt-bvc__close"
          aria-label="Dismiss"
          data-testid="browse-visitor-card-dismiss"
          onClick={() => {
            trackBrowseVisitorCardTap("dismiss");
            markBrowseCardDismissed();
            setDismissed(true);
          }}
        >
          {"✕"}
        </button>
      </div>
      <div className="lt-bvc__body">
        <div className="lt-bvc__text">
          <p className="lt-bvc__benefit" data-testid="browse-visitor-card-benefit">{copy.benefit}</p>
          <p className="lt-bvc__price" data-testid="browse-visitor-card-price">
            <strong>{copy.priceHead}</strong> {"·"} {copy.priceDetail}
          </p>
          {copy.deadline ? (
            <p className="lt-bvc__deadline" data-testid="browse-visitor-card-deadline">{copy.deadline}</p>
          ) : null}
        </div>
        <div className="lt-bvc__actions">
          <Link
            to={BROWSE_CARD_SIGNUP_PATH}
            className="lt-bvc__btn lt-bvc__btn--primary"
            data-testid="browse-visitor-card-signup"
            onClick={tap("signup")}
          >
            Sign up free
          </Link>
          <Link
            to={BROWSE_CARD_PRICING_PATH}
            className="lt-bvc__btn lt-bvc__btn--secondary"
            data-testid="browse-visitor-card-pricing"
            onClick={tap("pricing")}
          >
            See pricing
          </Link>
        </div>
      </div>
      <Link to={BROWSE_CARD_ABOUT_PATH} className="lt-bvc__about" data-testid="browse-visitor-card-about" onClick={tap("about")}>
        What is LazyTopper?
      </Link>
    </aside>
  );
}
