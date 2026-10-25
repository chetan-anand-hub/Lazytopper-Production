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
import { FOUNDING_OFFER_OPEN, PRICE_MONTHLY_FOUNDING_DISPLAY } from "../../config/pricing";
import { notifyPaywallDismissed } from "../feedback/feedbackPromptHost";
import PaywallActions from "../pricing/PaywallActions";
import { blockedWallCopy, OFFLINE_WALL, SIGNED_OUT_WALL } from "./limitsCopy";
import "./limits.css";

export type DownloadWallVariant = "blocked" | "signed_out" | "offline";

export interface DownloadLimitWallProps {
  variant: DownloadWallVariant;
  resetAt?: string | null;
  onClose: () => void;
}

export default function DownloadLimitWall({ variant, resetAt = null, onClose }: DownloadLimitWallProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const copy = variant === "blocked" ? blockedWallCopy(resetAt) : variant === "signed_out" ? SIGNED_OUT_WALL : OFFLINE_WALL;
  const here = `${location.pathname}${location.search}`;

  const dismiss = useCallback(() => {
    onClose();
    if (variant === "blocked") notifyPaywallDismissed();
  }, [onClose, variant]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
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
        {variant === "blocked" && FOUNDING_OFFER_OPEN && (
          <p className="lt-limit-founding">Founding price {PRICE_MONTHLY_FOUNDING_DISPLAY} a month.</p>
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
