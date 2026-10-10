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
import "./usage.css";

export const PLANS_PATH = "/pricing";

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
        {copy.showPlans || onDismiss ? (
          <div className="lt-usage__actions">
            {copy.showPlans ? (
              <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="fair-use-see-plans">
                See plans
              </Link>
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
        <div className="lt-usage__actions">
          <Link to={PLANS_PATH} className="lt-usage__btn" data-testid="fair-use-see-plans">
            See plans
          </Link>
          <button
            type="button"
            className="lt-usage__btn lt-usage__btn--ghost"
            onClick={close}
            data-dialog-close=""
          >
            {onDismiss ? dismissLabel : "Close"}
          </button>
        </div>
      </section>
    </div>
  );
}
