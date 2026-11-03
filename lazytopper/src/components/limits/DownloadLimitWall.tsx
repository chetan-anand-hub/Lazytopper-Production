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
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { PacksEntry, isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import { chapterFromLocation, firePackEntryClick, mockSubjectFromLocation } from "../../lib/packs/packEntry";
import { packChapterLabel } from "../../lib/packs/packLabels";
import { buyHrefFor } from "../packs/offersModel";
import { PACK_CHAPTER_SLUGS, packPriceLabel, subjectLabel, subjectOfChapter, type PackSku, type PackSubject } from "../../services/packs";
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

/**
 * PACKS-CONVERT-1 (owner, 3 Nov 2026: 31 students met this wall in 30 days, a ready buying moment) - the pack that MATCHES the
 * refused paper, as a one-tap buy (`/packs?buy=<sku>&t=<target>`: signed in -> Razorpay opens straight away), shown under the
 * Board Pass actions (the Board Pass stays first). PURE. What the wall knows: the guard's cover (one chapter, a subject, or
 * several chapters) and, for a practice set (no cover), the page address.
 *   CBQ practice set (style=cbq / preset=comp / questionType=Competency) with a known subject -> that subject's CBQ Pack ₹199
 *   one chapter                                     -> that chapter's Chapter Pack ₹49
 *   a subject and no chapter (a Full Mock)          -> that subject's Mock Pack ₹99
 *   several chapters of ONE subject, or only a subject known from the address -> FALLBACK: that subject's Subject Pack ₹199
 *   nothing known (or chapters of both subjects)    -> null: the wall keeps the old "PDF packs from ₹49" link
 * Owning a pack still makes its chapters' downloads not count: that is the server's mint (packOwned), untouched here.
 */
export interface WallPackBuy {
  sku: PackSku;
  target: string;
  label: string;
  href: string;
  /** true when the paper's exact pack was not knowable and the subject's pack is offered instead. */
  fallback: boolean;
}

const CBQ_ADDRESS = /(?:^|[?&])(?:style=cbq|preset=comp|questionType=Competency)(?:&|$)/i;

export function wallPackBuy(ctx: { cover?: DownloadCover | null; chapter?: string | null; pathname?: string; search?: string }): WallPackBuy | null {
  const fromAddress = !ctx.cover;
  const chapters = (ctx.cover ? ctx.cover.chapters ?? [] : [ctx.chapter ?? chapterFromLocation(ctx.pathname ?? "", ctx.search ?? "")]).filter(
    (c): c is string => typeof c === "string" && PACK_CHAPTER_SLUGS.includes(c),
  );
  const subjects = new Set(chapters.map((c) => subjectOfChapter(c)).filter((x): x is PackSubject => x !== null));
  let addrSubject: PackSubject | null = null;
  if (fromAddress) {
    try {
      const v = new URLSearchParams(ctx.search ?? "").get("subject")?.toLowerCase();
      if (v === "maths" || v === "science") addrSubject = v;
    } catch {
      /* no subject */
    }
  }
  const subject: PackSubject | null = ctx.cover?.subject ?? (subjects.size === 1 ? [...subjects][0] : null) ?? addrSubject;
  const offer = (sku: PackSku, target: string, name: string, fallback = false): WallPackBuy => ({
    sku,
    target,
    label: `Or get the ${name} \u00b7 ${packPriceLabel(sku)}`,
    href: buyHrefFor(sku, target),
    fallback,
  });
  if (fromAddress && subject && CBQ_ADDRESS.test(ctx.search ?? "")) return offer("pack_cbq", subject, `${subjectLabel(subject)} CBQ Pack`);
  if (chapters.length === 1) return offer("pack_chapter", chapters[0], `${packChapterLabel(chapters[0])} Chapter Pack`);
  const mock = ctx.cover ? (chapters.length === 0 ? ctx.cover.subject ?? null : null) : chapters.length === 0 ? mockSubjectFromLocation(ctx.pathname ?? "", ctx.search ?? "") : null;
  if (mock) return offer("pack_mock", mock, `${subjectLabel(mock)} Mock Pack`);
  if (subject && subjects.size <= 1) return offer("pack_subject", subject, `${subjectLabel(subject)} Subject Pack`, true);
  return null;
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
  const packBuy = showPackLink && isPacksEntryEnabled() ? wallPackBuy({ cover, chapter, pathname: location.pathname, search: location.search }) : null;

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

  // BUY-PATH-1: "Pay" (payments on) opens the Board Pass checkout in one tap; "See plans" (payments dark) still browses /pricing.
  // The same `source` / `returnTo` as "See plans" ride along (PassCheckout strips only `buy`).
  const planParams = `source=${flavor === "practice" ? "grade-limit" : "download-limit"}&returnTo=${encodeURIComponent(here)}`;
  const goPay = () => navigate(`${BOARD_PASS_BUY_PATH}&${planParams}`);
  const goPlans = () => navigate(`/pricing?${planParams}`);

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
              onPay={goPay}
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
        {packBuy ? (
          <div className={tier === "trial" ? "lt-limit-pack lt-limit-pack--light" : "lt-limit-pack"} data-testid="wall-pack-buy" data-sku={packBuy.sku} data-fallback={packBuy.fallback ? "subject" : undefined}>
            <Link className="lt-limit-btn lt-limit-btn--pack" to={packBuy.href} onClick={() => firePackEntryClick("download_wall")}>
              {packBuy.label}
            </Link>
          </div>
        ) : showPackLink && (
          <WallCoverContext.Provider value={cover ?? null}>
            <PacksEntry kind="wall" chapter={chapter} light={tier === "trial"} />
          </WallCoverContext.Provider>
        )}
      </div>
    </div>
  );
}
