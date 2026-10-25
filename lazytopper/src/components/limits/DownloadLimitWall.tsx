/**
 * DownloadLimitWall — LIMITS-1: the sheet a student meets at the weekly download limit (and
 * the sign-up / offline variants of it). Bottom sheet on a phone, centred card on desktop
 * (the same shape as UpgradeSheet). Actions: Pay / Share QR / Forward link (PaywallActions,
 * which renders "See plans" while payments are dark), and "Keep using Basic".
 *
 * Honest by construction: the date comes from the server, the price from config/pricing.ts,
 * no countdown, no seat count. The student's work is never at risk here: the paper is on screen.
 */
import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { notifyPaywallDismissed } from "../feedback/feedbackPromptHost";
import PaywallActions from "../pricing/PaywallActions";
import { blockedWallCopy, OFFLINE_WALL, SIGNED_OUT_WALL, wallOfferLines } from "./limitsCopy";
import "./limits.css";

export type DownloadWallVariant = "blocked" | "signed_out" | "offline";

export interface DownloadLimitWallProps {
  variant: DownloadWallVariant;
  resetAt?: string | null;
  /** The server's tier for this refusal: a trial student reads trial wording. */
  tier?: string | null;
  onClose: () => void;
}

export default function DownloadLimitWall({ variant, resetAt = null, tier = null, onClose }: DownloadLimitWallProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const copy = variant === "blocked" ? blockedWallCopy(resetAt, Date.now(), tier) : variant === "signed_out" ? SIGNED_OUT_WALL : OFFLINE_WALL;
  const offer = variant === "blocked" ? wallOfferLines(new Date()) : null;
  const here = `${location.pathname}${location.search}`;

  const dismiss = useCallback(() => {
    onClose();
    if (variant === "blocked") notifyPaywallDismissed();
  }, [onClose, variant]);

  // aria-modal means focus must stay inside: Tab / Shift+Tab cycle within the sheet, Escape closes,
  // and focus returns to whatever opened the wall.
  useEffect(() => {
    const opener = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!ref.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [dismiss]);

  const goPlans = () => navigate(`/pricing?source=download-limit&returnTo=${encodeURIComponent(here)}`);

  return (
    <div className="lt-limit-scrim" onClick={dismiss} data-testid="download-wall-scrim">
      <div
        className="lt-limit-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        data-testid="download-wall"
        data-variant={variant}
      >
        <div className="lt-limit-grip" aria-hidden="true" />
        <h2 className="lt-limit-title">{copy.title}</h2>
        <p className="lt-limit-body">{copy.body}</p>
        {offer && (
          <div className="lt-limit-offer" data-testid="wall-offer">
            {offer.boardPass && <p className="lt-limit-offer__lead">{offer.boardPass}</p>}
            <p className="lt-limit-offer__line">{offer.monthly}</p>
            {offer.founding && <p className="lt-limit-founding">{offer.founding}</p>}
          </div>
        )}
        <div className="lt-limit-acts">
          {variant === "blocked" && (
            <PaywallActions
              surface="download_limit"
              onPay={goPlans}
              fallback={
                <button type="button" className="lt-limit-btn lt-limit-btn--primary" onClick={goPlans}>
                  See plans
                </button>
              }
            />
          )}
          {variant === "signed_out" && (
            <Link className="lt-limit-btn lt-limit-btn--primary" to={`/login?redirect=${encodeURIComponent(here)}`}>
              Sign up free
            </Link>
          )}
          <button type="button" className="lt-limit-btn lt-limit-btn--ghost" onClick={dismiss}>
            {copy.keep}
          </button>
        </div>
      </div>
    </div>
  );
}
