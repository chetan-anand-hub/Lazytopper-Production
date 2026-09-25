import { useEffect } from "react";
import { Link } from "react-router-dom";
import { trackNamedEvent } from "../../analytics/analytics";
import {
  FREE_CHECK_COPY,
  FREE_CHECK_SIGNIN_PATH,
  refusalCopy,
  type FreeCheckRefusalReason,
} from "../../services/freeCheckClient";

/**
 * FREE-CHECK-1b — the student-visible pieces of the signed-out free check. Every one of
 * them renders INSIDE Check & Improve's own chrome (the page's `withChrome`), so a phone
 * gets the MobileShell header and a desktop gets DesktopShell (N11).
 *
 * The copy is the spec's, verbatim (freeCheckClient `FREE_CHECK_COPY`). Every sign-in
 * link is FREE_CHECK_SIGNIN_PATH — `/login?redirect=%2Fcheck-improve` (OR-8) — and
 * nothing here can start a trial by itself: the R9 offer only calls back on a TAP.
 *
 * Styling is class-based (a scoped <style> block, the OfferStrip convention) — no inline
 * style objects in a new component.
 */

const FC_CSS = `
.lt-fc {
  box-sizing: border-box;
  max-width: 640px;
  margin: 24px auto;
  padding: 20px 22px;
  background: #ffffff;
  border: 1px solid hsl(220, 18%, 90%);
  border-radius: 16px;
  color: hsl(220, 25%, 12%);
  font-family: inherit;
}
.lt-fc--inline {
  max-width: none;
  margin: 12px 0 0;
  padding: 14px 16px;
  border-radius: 12px;
  background: hsl(150, 35%, 96%);
  border-color: hsl(150, 40%, 86%);
}
.lt-fc__title {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.3;
}
.lt-fc__lead {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
}
.lt-fc__note {
  margin: 10px 0 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: hsl(220, 15%, 42%);
}
.lt-fc__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.lt-fc__cta,
.lt-fc__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
}
.lt-fc__cta,
.lt-fc__btn--primary {
  background: hsl(152, 55%, 38%);
  color: #ffffff;
}
.lt-fc__cta:hover,
.lt-fc__btn--primary:hover {
  background: hsl(152, 55%, 32%);
}
.lt-fc__btn--ghost {
  background: transparent;
  color: hsl(220, 25%, 12%);
  border-color: hsl(220, 18%, 86%);
}
.lt-fc__cta:focus-visible,
.lt-fc__btn:focus-visible {
  outline: 3px solid hsl(152, 55%, 60%);
  outline-offset: 2px;
}
@media (max-width: 480px) {
  .lt-fc { margin: 16px; padding: 18px 16px; }
  .lt-fc__actions { flex-direction: column; }
  .lt-fc__cta, .lt-fc__btn { width: 100%; }
}
`;

function SignInLink() {
  return (
    <Link className="lt-fc__cta" to={FREE_CHECK_SIGNIN_PATH} data-testid="free-check-signin">
      {FREE_CHECK_COPY.signUpCta}
    </Link>
  );
}

/** After a free result: the save prompt. `inline` sits inside a result card. */
export function FreeCheckSavePrompt({ inline = false }: { inline?: boolean }) {
  return (
    <div className={inline ? "lt-fc lt-fc--inline" : "lt-fc"} data-testid="free-check-save-prompt">
      <style>{FC_CSS}</style>
      <p className="lt-fc__lead">{FREE_CHECK_COPY.afterResult}</p>
      <div className="lt-fc__actions">
        <SignInLink />
      </div>
    </div>
  );
}

/** R1 — this browser already used its free check. Counted once per showing (R10). */
export function FreeCheckUsedPanel() {
  useEffect(() => {
    trackNamedEvent("free_check_used_block");
  }, []);
  return (
    <div className="lt-fc" data-testid="free-check-used" role="status">
      <style>{FC_CSS}</style>
      <p className="lt-fc__lead">{FREE_CHECK_COPY.used}</p>
      <div className="lt-fc__actions">
        <SignInLink />
      </div>
    </div>
  );
}

/** A refusal from the server (or no App Check token), mapped to its copy. */
export function FreeCheckRefusalPanel({ reason }: { reason: FreeCheckRefusalReason }) {
  return (
    <div className="lt-fc" data-testid="free-check-refused" data-reason={reason} role="status">
      <style>{FC_CSS}</style>
      <p className="lt-fc__lead">{refusalCopy(reason)}</p>
      <div className="lt-fc__actions">
        <SignInLink />
      </div>
    </div>
  );
}

/** R8 — the waiting result is being written into the new account. */
export function FreeCheckSavingPanel() {
  return (
    <div className="lt-fc" data-testid="free-check-saving" role="status" aria-busy="true">
      <style>{FC_CSS}</style>
      <p className="lt-fc__lead">Saving your answer…</p>
    </div>
  );
}

/**
 * R9 — the trial offer, shown once after a saved free result, only to a hydrated,
 * non-premium, never-trialled student (the caller decides that). It starts NOTHING on
 * its own: `onStartTrial` runs only on the tap.
 */
export function FreeCheckTrialOffer({
  endsOn,
  onStartTrial,
  onMaybeLater,
}: {
  endsOn: string;
  onStartTrial: () => void;
  onMaybeLater: () => void;
}) {
  return (
    <div className="lt-fc" data-testid="free-check-trial-offer">
      <style>{FC_CSS}</style>
      <h2 className="lt-fc__title">{FREE_CHECK_COPY.offerTitle}</h2>
      <p className="lt-fc__lead">{FREE_CHECK_COPY.offerBody(endsOn)}</p>
      <p className="lt-fc__note">{FREE_CHECK_COPY.offerPattern}</p>
      <div className="lt-fc__actions">
        <button type="button" className="lt-fc__btn lt-fc__btn--primary" onClick={onStartTrial}>
          {FREE_CHECK_COPY.offerStart}
        </button>
        <button type="button" className="lt-fc__btn lt-fc__btn--ghost" onClick={onMaybeLater}>
          {FREE_CHECK_COPY.offerLater}
        </button>
      </div>
    </div>
  );
}
