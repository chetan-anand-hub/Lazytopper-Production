/**
 * DownloadLimitWall — LIMITS-1: the sheet a student meets at the weekly download limit (and
 * the sign-up / offline variants of it). Bottom sheet on a phone, centred card on desktop
 * (the same shape as UpgradeSheet). Actions: Pay / Pay by QR / Forward link (PaywallActions,
 * which renders "See plans" while payments are dark), and "Keep using Basic".
 *
 * Honest by construction: the date comes from the server, the price from config/pricing.ts,
 * no countdown, no seat count. The student's work is never at risk here: the paper is on screen.
 */
import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { notifyPaywallDismissed } from "../feedback/feedbackPromptHost";
import PaywallActions from "../pricing/PaywallActions";
import { PacksEntry } from "../../lib/packs/packEntryLazy";
import { WallCoverContext } from "../../lib/packs/wallCover";
import type { DownloadCover } from "../../services/limitsClient";
import { blockedPracticeCopy, blockedWallCopy, OFFLINE_WALL, SIGNED_OUT_WALL, wallOfferLines } from "./limitsCopy";
import "./limits.css";

export type DownloadWallVariant = "blocked" | "signed_out" | "offline";

export interface DownloadLimitWallProps {
  variant: DownloadWallVariant;
  /** "practice" = the daily graded Quick Practice limit (LIMITS-1 PR-2). Default: the download limit. */
  flavor?: "download" | "practice";
  resetAt?: string | null;
  /** The server's tier for this refusal: a trial student reads trial wording. */
  tier?: string | null;
  /** PACKS-ENTRY-1: the chapter of the paper, when the caller knows it. Else it is read from the page address, else /packs. */
  chapter?: string | null;
  /** PACK-LINKS-1: the cover the paper's guard() resolved (chapters / subject). When given, the pack link is built from it, not from the page address. */
  cover?: DownloadCover;
  onClose: () => void;
}

export default function DownloadLimitWall({ variant, flavor = "download", resetAt = null, tier = null, chapter = null, cover, onClose }: DownloadLimitWallProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const copy =
    variant === "blocked"
      ? (flavor === "practice" ? blockedPracticeCopy : blockedWallCopy)(resetAt, Date.now(), tier)
      : variant === "signed_out" ? SIGNED_OUT_WALL : OFFLINE_WALL;
  const offer = variant === "blocked" ? wallOfferLines(new Date()) : null;
  const here = `${location.pathname}${location.search}`;
  // PACKS-ENTRY-1 (a): a quiet second line under the Board Pass actions, only for the download wall.
  const showPackLink = variant === "blocked" && flavor === "download";

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

  const goPlans = () => navigate(`/pricing?source=${flavor === "practice" ? "grade-limit" : "download-limit"}&returnTo=${encodeURIComponent(here)}`);

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
        data-flavor={flavor}
      >
        <div className="lt-limit-grip" aria-hidden="true" />
        <h2 className="lt-limit-title">{copy.title}</h2>
        <p className="lt-limit-body">{copy.body}</p>
        {offer && (
          <div className="lt-limit-offer" data-testid="wall-offer">
            {/* PRICE-FIXED-1 (31 Oct 2026): the Board Pass is the only plan named; the month price is hidden. */}
            {offer.boardPass && <p className="lt-limit-offer__lead" data-testid="wall-offer-boards">{offer.foundingLabel ? `${offer.foundingLabel}: ` : ""}{offer.boardPass}</p>}
          </div>
        )}
        <div className="lt-limit-acts">
          {variant === "blocked" && (
            <PaywallActions
              surface={flavor === "practice" ? "grade_limit" : "download_limit"}
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
        {showPackLink && (
          <WallCoverContext.Provider value={cover ?? null}>
            <PacksEntry kind="wall" chapter={chapter} light={tier === "trial"} />
          </WallCoverContext.Provider>
        )}
      </div>
    </div>
  );
}
