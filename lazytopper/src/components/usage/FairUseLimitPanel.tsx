/**
 * FairUseLimitPanel — FAIR-USE-UI-1 UI1 / UI3. The calm panel a student sees in place of
 * a generic error when a fair-use limit is reached (or, for a paper, before it starts).
 *
 * Renders ONLY what `limitCopy` returns: no error code, no rupee figure, nothing red.
 * `<time>` carries the server's own resetAt; when the server sent none, the reset
 * sentence is left out rather than guessed. "See plans" is an internal route link —
 * no hardcoded /app/ prefix (CLAUDE.md §7).
 *
 * DECISION 32e (FAIR-USE-WARN-1) — a TRIAL student refused for TODAY'S answer checks
 * sees this panel as a DIALOG (role="dialog", aria-modal, focus kept inside, Esc or
 * Close dismisses) carrying one more sentence: when to come back, and what still works.
 * It is a fixed overlay rendered where the page already renders the panel, so the page
 * beneath stays mounted and its saved answers are untouched. Every other refusal
 * (premium, a trial paper allowance) keeps the inline panel exactly as before.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { formatResetIst, limitCopy, trialComeBackLine, type LimitState } from "./fairUseGate";
// PAYWALL-PAY-1 — with payments on, "See plans" becomes Pay / Pay by QR code / Forward link
// to parents ("Pay" goes to the same plans page). Payments dark: "See plans", unchanged.
import PaywallActions from "../pricing/PaywallActions";
// PAPER-WALLS-1 - the Board Pass line (price from config/pricing.ts) leads; a matching pack is the smaller second line.
import { boardPassOffer } from "../pricing/boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import type { PaperPackLine } from "../limits/limitsCopy";
import OffersBlock from "../packs/OffersBlock";
import { useOptionalUid } from "../packs/PackPromoCard";
import type { OfferKind } from "../packs/offersModel";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { PACK_LINE_HREF, PACK_LINE_TEXT, showPackLine } from "../limits/packLine";
// GUIDE-PAGES-1 M7 — Byte explains the limit from this panel's own data (display only; words
// render with the panel, only his drawing is lazy; nothing with "Hide mascots"). The actions are unchanged.
import { LimitByte } from "../guide/pages/pageGuides";
import "./usage.css";

export const PLANS_PATH = "/pricing";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 32e: only a trial student at today's answer-check limit, with a reset time to name. */
function isTrialDailyChecks(limit: LimitState, when: string): boolean {
  // PAPER-WALLS-1: a 7-day (week) refusal is not "today's" - it keeps the inline panel, whose copy says "this week".
  return limit.tier === "trial" && limit.scope === "checks" && when !== "" && limit.window !== "week";
}

/** The Board Pass price line of a trial refusal. Price and detail come from pricing.ts, never typed here. */
function boardPassLine(): string {
  const offer = boardPassOffer(new Date(), predictCbseExamDate("10"));
  return `${offer.title}${offer.priceDisplay ? ` ${offer.priceDisplay}` : ""} — ${offer.detail}`;
}

/**
 * OFFERS-V2: the paper's pack rows (Bundle, CBQ, Mock / Chapter Pack ...) from the highest price down, under the panel's own Board Pass offer. Shown to a
 * non-paid student only (the refusal's own tier is the server's word), never on a paid-Premium refusal; the Board Pass card itself is the panel's own line
 * and Pay action above, so only the rows are drawn here.
 */
function PaperOffers({ tier, offers }: { tier: "trial" | "premium"; offers: PaperOffers }) {
  const uid = useOptionalUid();
  if (!showPackLine({ tier })) return null;
  return (
    <OffersBlock
      surface={`wall-${offers.kind}`}
      ctx={{ kind: offers.kind, subject: offers.subject ?? null, chapterSlug: offers.chapterSlug ?? null, chapterName: offers.chapterName ?? null }}
      uid={uid}
      showCard={false}
      showPacks={Boolean(uid)}
      benefit=""
    />
  );
}

export interface PaperOffers {
  kind: OfferKind;
  subject?: "maths" | "science" | null;
  chapterSlug?: string | null;
  chapterName?: string | null;
}

function PackLine({ tier }: { tier: "trial" | "premium" }) {
  // PACK-BASIC-ONLY-1 - the refusal's own tier is the server's word: a trial refusal shows the line (a trial
  // student is not paid); a paid-Premium refusal never does.
  if (!showPackLine({ tier })) return null;
  return (
    <p className="lt-usage__body" data-testid="fair-use-pack-line">
      <Link to={PACK_LINE_HREF}>{PACK_LINE_TEXT}</Link>
    </p>
  );
}

export default function FairUseLimitPanel({
  limit,
  onDismiss,
  dismissLabel = "OK",
  pack = null,
  offers = null,
}: {
  limit: LimitState;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** PAPER-WALLS-1 (optional): the matching pack, shown second and to any non-paid student (PACK-BASIC-ONLY-1); never on a paid-Premium refusal. */
  pack?: PaperPackLine | null;
  /** OFFERS-V2: the paper's pack rows replace the one generic pack line (a paper wall). Absent -> the line is exactly as before. */
  offers?: PaperOffers | null;
}) {
  const copy = limitCopy(limit);
  const when = limit.resetAt ? formatResetIst(limit.resetAt) : "";
  const asDialog = isTrialDailyChecks(limit, when);

  // Dialog state. A NEW refusal (a new limit object) opens it again.
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(true), [limit]);
  const dialogRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!asDialog || !open) return;
    const before = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    const first = dialogRef.current?.querySelector<HTMLElement>("[data-dialog-close]");
    first?.focus();
    return () => {
      // Hand focus back to where the student was (the Grade button).
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, [asDialog, open]);

  const lead = (
    <p className="lt-usage__lead">
      {copy.lead}
      {copy.resetPrefix && when ? (
        <>
          {" "}
          {copy.resetPrefix} <time dateTime={limit.resetAt ?? undefined}>{when}</time>.
        </>
      ) : null}
      {copy.tail ? <> {copy.tail}</> : null}
    </p>
  );

  if (!asDialog) {
    return (
      <section className="lt-usage" role="status" aria-live="polite" data-testid="fair-use-limit-panel">
        <div className="lt-usage__eyebrow">Fair use</div>
        {lead}
        <LimitByte limit={limit} when={when} />
        {copy.showPlans ? (
          <p className="lt-usage__body" data-testid="fair-use-board-pass">
            {boardPassLine()}
          </p>
        ) : null}
        {copy.showPlans || onDismiss ? (
          <div className="lt-usage__actions">
            {copy.showPlans ? (
              <PaywallActions
                surface="usage_limit"
                payTo={BOARD_PASS_BUY_PATH}
                fallback={
                  <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="fair-use-see-plans">
                    See plans
                  </Link>
                }
              />
            ) : null}
            {onDismiss ? (
              <button type="button" className="lt-usage__btn lt-usage__btn--ghost" onClick={onDismiss}>
                {dismissLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        {copy.showPlans && offers ? <PaperOffers tier={limit.tier} offers={offers} /> : copy.showPlans && pack ? <PackLine tier={limit.tier} /> : null}
      </section>
    );
  }

  if (!open) return null;

  const close = () => {
    setOpen(false);
    onDismiss?.();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === firstNode || !dialogRef.current?.contains(active))) {
      e.preventDefault();
      lastNode.focus();
    } else if (!e.shiftKey && (active === lastNode || !dialogRef.current?.contains(active))) {
      e.preventDefault();
      firstNode.focus();
    }
  };

  return (
    <div className="lt-usage-dialog" data-testid="fair-use-limit-dialog">
      <section
        ref={dialogRef}
        className="lt-usage lt-usage--dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid="fair-use-limit-panel"
        onKeyDown={onKeyDown}
      >
        <div className="lt-usage__eyebrow" id={headingId}>
          Fair use
        </div>
        <p className="lt-usage__lead" data-testid="fair-use-used-line">
          {copy.lead}
          {copy.tail ? <> {copy.tail}</> : null}
        </p>
        <p className="lt-usage__body" data-testid="fair-use-come-back">
          {trialComeBackLine(limit.resetAt ?? "", when, limit.allowance)}
        </p>
        <p className="lt-usage__body" data-testid="fair-use-board-pass">
          {boardPassLine()}
        </p>
        <div className="lt-usage__actions">
          <PaywallActions
            surface="usage_limit"
            payTo={BOARD_PASS_BUY_PATH}
            fallback={
              <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="fair-use-see-plans">
                See plans
              </Link>
            }
          />
          <button
            type="button"
            className="lt-usage__btn lt-usage__btn--ghost"
            onClick={close}
            data-dialog-close=""
          >
            {onDismiss ? dismissLabel : "Close"}
          </button>
        </div>
        {offers ? <PaperOffers tier={limit.tier} offers={offers} /> : pack ? <PackLine tier={limit.tier} /> : null}
        {/* GUIDE-PAGES-1 M7 — AFTER the actions, so Pay / Pay by QR code / Forward link / Close stay
            exactly where they were; no "still works" here (the line above already says it). */}
        <LimitByte limit={limit} when={when} variant="dialog" />
      </section>
    </div>
  );
}
