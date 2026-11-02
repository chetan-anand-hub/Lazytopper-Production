/**
 * UpgradeSheet — what a student sees when they meet a Premium boundary.
 *
 * ★★ THE PRINCIPLE: a student should learn the boundary, not bounce off it.
 * A paywall is the single most fragile moment in the product. This component
 * exists because the one that came before it got three things wrong, all three
 * found by the owner using the deployed product rather than by any gate:
 *
 *  1. IT SOLD SURFACES THAT DO NOT EXIST. `UpgradeModal` renders
 *     `getPremiumFeatureList()`, which listed every premium gate entry — including
 *     Smart Study Planner, Daily Focus Mix, Full Analytics Dashboard, Parent
 *     Dashboard and Predicted Questions, none of which the product ships. That is
 *     fabrication with a price attached. Fixed at the SOURCE (`featureGates.ts`),
 *     so the old modal is fixed too; this component simply reads the corrected
 *     list and never keeps a copy of its own.
 *     [FU-UPGRADE-MODAL-SELLS-RETIRED-FEATURES]
 *
 *  2. IT HAD ONE EXIT. "Choose Plan", and nothing else. ★ A paywall with one exit
 *     teaches a student the product is over. Two exits teach them what they still
 *     have — so "Keep using Basic" is a real, equally-weighted button, not a
 *     subdued dismissal link. [FU-UPGRADE-MODAL-NO-BASIC-EXIT]
 *
 *  3. IT READ AS AN ERROR. The old modal puts "Your free trial has ended" in red
 *     on pink, and GATE-1's (correct, kind) server copy landed in SolutionChecker's
 *     error-red box. ★ A LOCKED FEATURE IS NOT A MISTAKE THE STUDENT MADE. Nothing
 *     on this path is error-red; the treatment is the offer strip's green.
 *     [FU-GATE-COPY-STILL-READS-AS-ERROR]
 *
 * ★ PRICE. PRICE-FIXED-1: the sheet shows ONLY the Board Pass, whose fixed price comes from `premiumOffer()`
 * (config/pricing.ts), never a literal. The month price is hidden throughout the product.
 *
 * ★ NO `style={{}}`. Styling is a `<style>` block plus class names, following
 * `OfferStrip.tsx` — the in-repo precedent for a self-contained styled component.
 * That keeps the component to ONE new file and honours the standing "CSS classes,
 * not inline style objects in new components" rule at the same time.
 *
 * ⚠ MOUNT ONLY WHEN OPEN. This component calls `useNavigate`/`useLocation`, so it
 * must not be mounted by a parent that renders outside a router. Callers render it
 * conditionally (`{open && <UpgradeSheet .../>}`) rather than passing `open={false}`
 * — see the "not mounted when closed" test.
 */

import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { notifyPaywallDismissed } from "../feedback/feedbackPromptHost";
import { PREMIUM_PLUS } from "../../config/pricingCompare";
import { useSubscription } from "../../hooks/useSubscription";
import { paperPackLineParts, type PaperPackLine } from "../limits/limitsCopy";
import { PACK_LINE_HREF, PACK_LINE_TEXT, showPackLine } from "../limits/packLine";
import PaywallActions from "../pricing/PaywallActions";
import { premiumOffer } from "../pricing/boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import TrialStartButton from "../pricing/TrialStartButton";
import { isTrialEligible, lowerFirst, useOptionalUid } from "../pricing/trialCta";
import { trackPaywallAction } from "../../analytics/analytics";
import OffersBlock from "../packs/OffersBlock";
import { paperWallCopy } from "../packs/offersCopy";
import type { OfferKind } from "../packs/offersModel";

export interface UpgradeSheetProps {
  /** What the student was trying to do, in their words. Names the blocked feature. */
  featureLabel: string;
  /**
   * ISO date the trial ended, when the server told us. ★ Rendered ONLY when known —
   * a guessed date on a payment surface is worse than no date at all.
   */
  trialEndedAt?: string | null;
  /**
   * PAPER-WALLS-1 (optional): the matching PDF pack, shown as a quiet SECOND line under the Board Pass actions.
   * Hidden for paid Premium. Absent -> the sheet is exactly as before.
   */
  pack?: PaperPackLine | null;
  /**
   * OFFERS-V2: a PAPER WALL (a full mock, chapter test or worksheet the student could not have graded). The sheet then shows the one buying block:
   * "<Your paper> is saved", the free-week button where it can still be started, the Board Pass card (one tap to payment, with "Ask a parent to pay"
   * and the QR link as small links), the pack rows for that paper from the highest price down, and a small grey way out at the very bottom
   * ("Not now" on a trial limit, "Continue with Basic (free)" for Basic). Replaces `pack`. Absent -> the sheet is exactly as before.
   */
  offers?: { kind: OfferKind; subject?: "maths" | "science" | null; chapterSlug?: string | null; chapterName?: string | null } | null;
  /** "Keep using Basic", the backdrop, Escape, and the close control all land here. */
  onClose: () => void;
}

/**
 * Bottom sheet under 1024px, small centred modal at or above it. Never a full-page
 * redirect — ★ the sheet must never leave the page the student was on, because the
 * work they were doing is the thing they are afraid of losing.
 */
const UPGRADE_SHEET_CSS = `
  .lt-upsheet__scrim {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(9, 22, 40, 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .lt-upsheet {
    width: 100%;
    max-width: 460px;
    background: var(--lt-surface, #ffffff);
    border-radius: 20px 20px 0 0;
    padding: 20px 20px 24px;
    box-shadow: 0 -8px 32px rgba(9, 22, 40, 0.18);
    max-height: 88vh;
    overflow-y: auto;
  }
  .lt-upsheet__grip {
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: rgba(73, 98, 127, 0.28);
    margin: 0 auto 14px;
  }
  .lt-upsheet__title {
    margin: 0 0 4px;
    font-size: 1.08rem;
    font-weight: 800;
    color: var(--lt-ink, #0f2743);
    line-height: 1.35;
  }
  /* ★ The trial line. NEUTRAL — deliberately not red, not pink, not a warning
     triangle. It states a fact about a date; it does not report a fault. */
  .lt-upsheet__trial {
    margin: 0 0 16px;
    font-size: 0.86rem;
    color: var(--lt-muted, #49627f);
  }
  /* ★ The offer block. Green-bordered, matching OfferStrip — the treatment the
     product already uses to say "here is something good", never "something broke". */
  .lt-upsheet__offer {
    border-radius: 14px;
    padding: 14px;
    color: var(--lt-green-dark, #0b8f50);
    background: rgba(22, 185, 106, 0.1);
    border: 1px solid rgba(22, 185, 106, 0.24);
    margin-bottom: 14px;
  }
  .lt-upsheet__price {
    font-size: 1.02rem;
    font-weight: 800;
    margin: 0 0 8px;
  }
  .lt-upsheet__list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .lt-upsheet__list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 3px 0;
    font-size: 0.86rem;
  }
  .lt-upsheet__tick { font-weight: 800; }
  .lt-upsheet__cta,
  .lt-upsheet__basic {
    width: 100%;
    border-radius: 14px;
    padding: 13px 16px;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    display: block;
  }
  .lt-upsheet__cta {
    background: var(--lt-green, #16b96a);
    border: 1px solid var(--lt-green-dark, #0b8f50);
    color: #ffffff;
    margin-bottom: 14px;
  }
  /* ★ "Keep using Basic" is a REAL CHOICE, not a dismissal. Full width, real
     button, same weight and padding as the paid CTA — only the fill differs, so
     it reads as the second of two options rather than as "no thanks". */
  .lt-upsheet__basic {
    background: var(--lt-surface, #ffffff);
    border: 1.5px solid rgba(73, 98, 127, 0.35);
    color: var(--lt-ink, #0f2743);
  }
  .lt-upsheet__pack {
    margin: -4px 0 12px;
    font-size: 0.8rem;
    color: var(--lt-muted, #49627f);
    text-align: center;
  }
  .lt-upsheet__pack a { color: var(--lt-ink, #0f2743); font-weight: 700; }
  .lt-upsheet__keep {
    border-radius: 14px;
    padding: 12px 14px;
    background: rgba(73, 98, 127, 0.07);
    border: 1px solid rgba(73, 98, 127, 0.16);
    font-size: 0.84rem;
    color: var(--lt-muted, #49627f);
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .lt-upsheet__keep strong { color: var(--lt-ink, #0f2743); }
  /* OFFERS-V2 paper wall: the buying block inside the sheet, and the small grey way out at the very bottom. */
  .lt-upsheet--offers { color: var(--lt-ink, #0f2743); }
  .lt-upsheet--offers .lt-upsheet__trial { margin: 0 0 4px; }
  .lt-upsheet__dismiss {
    display: block; width: 100%; margin: 14px 0 0; padding: 10px 8px; min-height: 44px; border: 0; background: none; cursor: pointer;
    font: inherit; font-size: 0.84rem; color: var(--lt-muted, #6b7f99); text-align: center;
  }
  .lt-upsheet__dismiss:focus-visible { outline: 2px solid rgba(22, 185, 106, 0.8); outline-offset: 2px; border-radius: 8px; }

  /* Desktop: a small centred modal. useIsDesktop is a 1024px breakpoint, so the
     sheet uses the same boundary rather than inventing a second one. */
  @media (min-width: 1024px) {
    .lt-upsheet__scrim { align-items: center; }
    .lt-upsheet { border-radius: 20px; max-width: 420px; }
    .lt-upsheet__grip { display: none; }
  }
`;

export function UpgradeSheet({ featureLabel, trialEndedAt, pack, offers, onClose }: UpgradeSheetProps) {
  // PRICING-1 — a lapsed founder still pays the founding rate, so the quote follows their record.
  const { status: subscription, hydrated } = useSubscription();
  const uid = useOptionalUid();
  const navigate = useNavigate();
  const location = useLocation();
  const sheetRef = useRef<HTMLDivElement>(null);
  // SALE-MOMENT-2 - the matching pack's words (null = the plain /packs link: keep the generic line).
  const packParts = pack ? paperPackLineParts(pack) : null;

  // FEEDBACK-1 — every way of closing WITHOUT going to plans ("Keep using Basic", the
  // backdrop, Escape) is the paywall moment: close first, then ask the host for the
  // gentle prompt (at most once per student per 7 days; never blocks; see
  // components/feedback). "See plans" is not a dismissal and does not call this.
  const dismiss = useCallback(() => {
    onClose();
    notifyPaywallDismissed();
  }, [onClose]);

  // Escape closes, exactly like "Keep using Basic" — same call, so the two exits
  // cannot drift apart.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  // ASK-COPY-1 - the benefit list is the one /pricing shows for Premium (config/pricingCompare's
  // PREMIUM_PLUS), read here and never copied: the sheet can no longer drift from the pricing page,
  // and the old gate-table labels (Unlimited Mock Tests, Exam Simulation, ...) are gone from it.
  const premiumFeatures = PREMIUM_PLUS;
  // A TRIAL student has the feature today, so the title names what the pass KEEPS after the free
  // week; everyone else keeps the true "<feature> is a Premium feature".
  const onTrial = Boolean(uid) && subscription?.tier === "trial";
  const title = onTrial ? `Keep ${lowerFirst(featureLabel)} after your free week` : `${featureLabel} is a Premium feature`;
  // [FU-TRIAL-CTA-ON-ASK] - a signed-out visitor, or an account that never had a trial. The record
  // must be known (hydrated) for an account; the server still decides.
  const trialEligible = !uid || isTrialEligible(hydrated, subscription);

  const handleSeePlans = () => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const trialLine = formatTrialEnded(trialEndedAt);
  const offer = premiumOffer(new Date(), predictCbseExamDate("10"));

  if (offers) {
    const wall = paperWallCopy(offers.kind, onTrial, trialLine);
    return (
      <div className="lt-upsheet__scrim" onClick={dismiss} data-testid="upgrade-sheet-scrim">
        <style>{UPGRADE_SHEET_CSS}</style>
        <div
          className="lt-upsheet lt-upsheet--offers"
          role="dialog"
          aria-modal="true"
          aria-label={wall.title}
          tabIndex={-1}
          ref={sheetRef}
          onClick={(e) => e.stopPropagation()}
          data-testid="upgrade-sheet"
        >
          <div className="lt-upsheet__grip" />
          <h2 className="lt-upsheet__title">{wall.title}</h2>
          {wall.body ? <p className="lt-upsheet__trial" data-testid="upgrade-sheet-wall-body">{wall.body}</p> : null}
          <OffersBlock
            surface={`wall-${offers.kind}`}
            ctx={{ kind: offers.kind, subject: offers.subject ?? null, chapterSlug: offers.chapterSlug ?? null, chapterName: offers.chapterName ?? null }}
            uid={uid}
            // Basic AND trial students see the packs on a wall (owner, 28 Oct + 2 Nov); never paid Premium, never while the record is unknown.
            showPacks={Boolean(uid) && showPackLine(subscription, hydrated)}
            lead={
              trialEligible ? (
                <TrialStartButton uid={uid} returnTo={`${location.pathname}${location.search}${location.hash}`} className="lt-upsheet__cta" onStarted={onClose} />
              ) : null
            }
            benefit={wall.benefit}
            payVerb="Get it for"
            whatYouGet={false}
            onPayTap={() => trackPaywallAction("pay", "upgrade_sheet")}
            cardExtras={<PaywallActions surface="upgrade_sheet" fallback={null} />}
          />
          <button type="button" className="lt-upsheet__dismiss" data-testid="upgrade-sheet-dismiss" onClick={dismiss}>
            {wall.dismiss}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="lt-upsheet__scrim"
      onClick={dismiss}
      data-testid="upgrade-sheet-scrim"
    >
      <style>{UPGRADE_SHEET_CSS}</style>
      <div
        className="lt-upsheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        data-testid="upgrade-sheet"
      >
        <div className="lt-upsheet__grip" />

        {/* ★ Names the feature the student was actually blocked on — passed in by the
            caller, never one hardcoded string for every surface. */}
        <h2 className="lt-upsheet__title">{title}</h2>

        {/* ASK-COPY-1 - the free week leads where it can still be started; the Board Pass is second. */}
        {trialEligible && (
          <TrialStartButton
            uid={uid}
            returnTo={`${location.pathname}${location.search}${location.hash}`}
            className="lt-upsheet__cta"
            onStarted={onClose}
          />
        )}

        {/* ★ Only when the server told us. No date is better than a guessed one. */}
        {trialLine && <p className="lt-upsheet__trial">{trialLine}</p>}

        <div className="lt-upsheet__offer">
          {/* ★ From pricing.ts. Never a literal. */}
          {/* PRICE-FIXED-1 (31 Oct 2026) - the Board Pass is the ONLY offer; the month price is hidden. */}
          {offer.foundingLabel ? <p className="lt-upsheet__price" data-testid="upgrade-sheet-founding-label">{offer.foundingLabel}</p> : null}
          <p className="lt-upsheet__price" data-testid="upgrade-sheet-board-pass">
            {offer.title} — {offer.priceDisplay} · {offer.detail}
          </p>
          <p className="lt-upsheet__price">{offer.second}</p>
          {offer.deadline ? <p className="lt-upsheet__price" data-testid="upgrade-sheet-deadline">{offer.deadline}</p> : null}
          <ul className="lt-upsheet__list">
            {premiumFeatures.map((f) => (
              <li key={f.id}>
                <span className="lt-upsheet__tick" aria-hidden="true">✓</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        {/* PAYWALL-PAY-1 — Pay, Share QR code, Forward link to parents ("Pay" goes where
            "See plans" went). Payments dark: "See plans", unchanged. */}
        <PaywallActions
          surface="upgrade_sheet"
          onPay={handleSeePlans}
          fallback={
            <button type="button" className="lt-upsheet__cta" onClick={handleSeePlans}>
              See plans
            </button>
          }
        />

        {/* PAPER-WALLS-1 - the pack is the SECOND, smaller line; PACK-BASIC-ONLY-1: Basic students only (never a trial or paid student). */}
        {pack && uid && showPackLine(subscription, hydrated) && (
          <p className="lt-upsheet__pack" data-testid="upgrade-sheet-pack">
            {packParts ? (
              <Link to={pack.href}>
                {packParts.before}
                <strong>{packParts.price}</strong>
                {packParts.after}
              </Link>
            ) : (
              <Link to={PACK_LINE_HREF}>{PACK_LINE_TEXT}</Link>
            )}
          </p>
        )}

        {/* ★ NAME WHAT BASIC KEEPS, not what Premium withholds. And "Nothing you've
            done is locked" stays — a student's real fear at a paywall is losing
            their own work, and it is the sentence that answers it. */}
        <div className="lt-upsheet__keep">
          You keep <strong>Basic free, always</strong> — Exam Trends, the full question
          bank, Practice, and your progress. Nothing you&rsquo;ve done is locked.
        </div>

        <button type="button" className="lt-upsheet__basic" onClick={dismiss}>
          Keep using Basic
        </button>
      </div>
    </div>
  );
}

/**
 * "Your trial ended on 9 August." — or nothing at all.
 *
 * ★ Returns null for absent AND unparseable input. The alternative, rendering
 * "Invalid Date" or falling back to today, puts a wrong date on a payment surface.
 * Silence is the honest failure mode here.
 */
export function formatTrialEnded(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "long" });
  return `Your trial ended on ${day} ${month}.`;
}

/**
 * Turn the server's feature CODE into something a fifteen-year-old reads.
 *
 * ★ The sheet must name the capability that was actually blocked, so the label is
 * DERIVED from the 402 payload rather than hardcoded per surface. Unknown codes fall
 * back to a true, generic phrase instead of leaking `check_solution` at a student —
 * the same defect GATE-1's typed error exists to prevent.
 */
const PREMIUM_FEATURE_LABELS: Record<string, string> = {
  check_solution: "Checking your answer",
  mentor: "The AI tutor",
  step_solution: "Step-by-step solutions",
};

export function labelForFeature(code: string | undefined | null): string {
  if (!code) return "This";
  return PREMIUM_FEATURE_LABELS[code] || "This";
}

export default UpgradeSheet;
