/**
 * FairUseLimitPanel — FAIR-USE-UI-1 UI1 / UI3. The calm panel a student sees in place of
 * a generic error when a fair-use limit is reached (or, for a paper, before it starts).
 *
 * Renders ONLY what `limitCopy` returns: no error code, no rupee figure, nothing red.
 * `<time>` carries the server's own resetAt; when the server sent none, the reset
 * sentence is left out rather than guessed. "See plans" is an internal route link —
 * no hardcoded /app/ prefix (CLAUDE.md §7).
 */

import { Link } from "react-router-dom";
import { formatResetIst, limitCopy, type LimitState } from "./fairUseGate";
import "./usage.css";

export const PLANS_PATH = "/pricing";

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
  return (
    <section className="lt-usage" role="status" aria-live="polite" data-testid="fair-use-limit-panel">
      <div className="lt-usage__eyebrow">Fair use</div>
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
