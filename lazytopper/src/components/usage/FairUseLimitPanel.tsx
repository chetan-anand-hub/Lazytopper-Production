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
// PAYWALL-PAY-1 — with payments on, "See plans" becomes Pay / Share QR code / Forward link
// to parents ("Pay" goes to the same plans page). Payments dark: "See plans", unchanged.
import PaywallActions from "../pricing/PaywallActions";
// GUIDE-PAGES-1 M7 — Byte explains the limit from this panel's own data (display only; words
// render with the panel, only his drawing is lazy; nothing with "Hide mascots"). The actions are unchanged.
import { LimitByte } from "../guide/pages/pageGuides";
import "./usage.css";

export const PLANS_PATH = "/pricing";

/**
 * GUIDE-PAGES-1 (controller ruling, 23 Oct) — the panel's OWN plain line next to the pay buttons.
 * It used to be Byte's; a mascot saying it read as selling. Trial only, and only where the panel
 * already carries a Premium follow-on (not the Tutor / new-practice-questions copy, whose owner
 * sentence is the whole message). No price, no urgency.
 */
export const TRIAL_PREMIUM_NOTE = "Premium removes the trial's daily and weekly limits. A fair-use limit still applies.";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 32e: only a trial student at today's answer-check limit, with a reset time to name. */
function isTrialDailyChecks(limit: LimitState, when: string): boolean {
  return limit.tier === "trial" && limit.scope === "checks" && when !== "";
}

export default function FairUseLimitPanel({
  limit,
  onDismiss,
  dismissLabel = "OK",
}: {
  limit: LimitState;
  onDismiss?: () => void;
  dismissLabel?: string;
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

  const premiumNote =
    limit.tier === "trial" && copy.showPlans && copy.tail ? (
      <p className="lt-usage__body lt-usage__premium-note" data-testid="fair-use-premium-note">
        {TRIAL_PREMIUM_NOTE}
      </p>
    ) : null;

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
        {premiumNote}
        {copy.showPlans || onDismiss ? (
          <div className="lt-usage__actions">
            {copy.showPlans ? (
              <PaywallActions
                surface="usage_limit"
                payTo={PLANS_PATH}
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
        {premiumNote}
        <div className="lt-usage__actions">
          <PaywallActions
            surface="usage_limit"
            payTo={PLANS_PATH}
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
        {/* GUIDE-PAGES-1 M7 — AFTER the actions, so Pay / Share QR code / Forward link / Close stay
            exactly where they were; no "still works" here (the line above already says it). */}
        <LimitByte limit={limit} when={when} variant="dialog" />
      </section>
    </div>
  );
}
