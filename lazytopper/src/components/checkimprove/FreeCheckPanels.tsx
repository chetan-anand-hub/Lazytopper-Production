import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { trackNamedEvent } from "../../analytics/analytics";
import {
  FREE_CHECK_COPY,
  FREE_CHECK_SIGNIN_PATH,
  markFreeCheckSigninIntent,
  refusalCopy,
  summarizePendingFreeCheck,
  type FreeCheckRefusalReason,
  type FreeCheckResultSummary,
} from "../../services/freeCheckClient";
import {
  getFreeCheckSaveStatus,
  retryFreeCheckSave,
  subscribeFreeCheckSaveStatus,
} from "../../services/freeCheckReplay";
import { TRIAL_WORDING } from "../pricing/BasicFreeList";
import { clearTrialStartedAtSignUp } from "../../services/newAccountTrial";

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
.lt-fc__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
}
.lt-fc__score {
  font-size: 1.05rem;
  font-weight: 800;
  color: hsl(220, 45%, 18%);
}
.lt-fc__tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  background: hsl(220, 30%, 95%);
  color: hsl(220, 35%, 28%);
  border: 1px solid hsl(220, 20%, 88%);
}
.lt-fc.lt-fc--bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: none;
  margin: 0 0 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: hsl(150, 35%, 96%);
  border-color: hsl(150, 40%, 86%);
}
.lt-fc--bar .lt-fc__summary { margin: 0; }
@media (max-width: 480px) {
  .lt-fc.lt-fc--bar { margin: 0 0 16px; }
  .lt-fc--bar .lt-fc__cta { width: 100%; }
}
`;

/**
 * The one sign-in link. Its click writes the OR-18 sign-in marker (this tab, this waiting
 * result) BEFORE the router navigates, so the result is saved only for whoever signs in
 * from here.
 */
function SignInLink({ label = FREE_CHECK_COPY.signUpCta }: { label?: string }) {
  return (
    <Link
      className="lt-fc__cta"
      to={FREE_CHECK_SIGNIN_PATH}
      onClick={markFreeCheckSigninIntent}
      data-testid="free-check-signin"
    >
      {label}
    </Link>
  );
}

/**
 * FRICTION-FIX-1 · F4 (FU-TRIAL-WORDING-SEE-PLANS-FREECHECK) — "See plans →" to /pricing.
 * A router <Link> with a ROUTER-relative `to`: the app's BrowserRouter carries the `/app`
 * basename, so a typed app-prefix here would double it. Same label and target as the
 * T2 confirmation's link (TRIAL_WORDING.seePlans).
 */
function SeePlansLink({ testId }: { testId: string }) {
  return (
    <Link className="lt-fc__btn lt-fc__btn--ghost" to="/pricing" data-testid={testId}>
      {TRIAL_WORDING.seePlans}
    </Link>
  );
}

/**
 * SIGNUP-NUDGE-1 — "<score>/<max> marks" and up to three "<Tag> ×<n>" chips, from the
 * result waiting on this device (never from anywhere else, and never sent anywhere).
 * A part the waiting result cannot honestly fill is left out, never invented.
 */
function FreeCheckSummaryLine({ summary }: { summary: FreeCheckResultSummary }) {
  return (
    <p className="lt-fc__summary" data-testid="free-check-summary">
      {summary.marks && (
        <span className="lt-fc__score">{`${summary.marks.score}/${summary.marks.max} marks`}</span>
      )}
      {summary.tags.map((t) => (
        <span key={t.label} className="lt-fc__tag">{`${t.label} ×${t.count}`}</span>
      ))}
    </p>
  );
}

/**
 * SIGNUP-NUDGE-1 · S2 — the bar at the TOP of a free-mode result: what the student got,
 * and the same one sign-in link (same path, same OR-18 marker on click). It reads the
 * waiting result once, on mount; with nothing waiting there is nothing to keep, so it
 * renders nothing (the bottom save prompt, P3, is unchanged either way).
 */
export function FreeCheckResultBar() {
  const [summary] = useState(summarizePendingFreeCheck);
  if (!summary) return null;
  return (
    <div className="lt-fc lt-fc--bar" data-testid="free-check-result-bar">
      <style>{FC_CSS}</style>
      <FreeCheckSummaryLine summary={summary} />
      <SignInLink label={FREE_CHECK_COPY.keepThis} />
    </div>
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

/**
 * R1 — this browser already used its free check. Counted once per showing (R10).
 * SIGNUP-NUDGE-1 · S1 — it shows what the student got (the waiting result, read once on
 * mount) before asking them to sign up. The "Practice CBQs free" link (S1d) is OMITTED:
 * P9 found a signed-out student cannot get a CBQ answer checked (the preview's
 * "Grade my 1 answer" ends in "Sign in to check your answers").
 */
export function FreeCheckUsedPanel() {
  useEffect(() => {
    trackNamedEvent("free_check_used_block");
  }, []);
  const [summary] = useState(summarizePendingFreeCheck);
  return (
    <div className="lt-fc" data-testid="free-check-used" role="status">
      <style>{FC_CSS}</style>
      <h2 className="lt-fc__title">{FREE_CHECK_COPY.usedTitle}</h2>
      {summary ? (
        <FreeCheckSummaryLine summary={summary} />
      ) : (
        <p className="lt-fc__lead">{FREE_CHECK_COPY.usedChecked}</p>
      )}
      <p className="lt-fc__lead">{FREE_CHECK_COPY.usedBody}</p>
      <p className="lt-fc__note">{FREE_CHECK_COPY.usedTrial}</p>
      <div className="lt-fc__actions">
        <SignInLink />
        <SeePlansLink testId="free-check-used-see-plans" />
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

/**
 * R8 — the waiting result is being written into the new account.
 *
 * FREECHECK-2 · F2 — never an endless "Saving…": offline, it says so and waits for the
 * network (the return hook resumes on `online`); any other failure says so and offers
 * "Try again". The state comes from freeCheckReplay's save status, which the return hook
 * sets — the page renders this panel with no props.
 */
export function FreeCheckSavingPanel() {
  const status = useSyncExternalStore(
    subscribeFreeCheckSaveStatus,
    getFreeCheckSaveStatus,
    getFreeCheckSaveStatus,
  );
  if (status === "offline") {
    return (
      <div className="lt-fc" data-testid="free-check-save-offline" role="status">
        <style>{FC_CSS}</style>
        <p className="lt-fc__lead">{FREE_CHECK_COPY.saveOffline}</p>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="lt-fc" data-testid="free-check-save-failed" role="alert">
        <style>{FC_CSS}</style>
        <p className="lt-fc__lead">{FREE_CHECK_COPY.saveFailed}</p>
        <div className="lt-fc__actions">
          <button type="button" className="lt-fc__btn lt-fc__btn--primary" onClick={retryFreeCheckSave}>
            {FREE_CHECK_COPY.saveRetry}
          </button>
        </div>
      </div>
    );
  }
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
        <SeePlansLink testId="free-check-offer-see-plans" />
      </div>
    </div>
  );
}

/**
 * TRIAL-ON-SIGNUP-1 · T2 — replaces the R9 offer for a NEW account: its trial already
 * started at sign-up. Starts nothing; `endsOn` is the trial's real end date, derived by
 * the caller from the stored start. "Check my next answer" goes back to Check & Improve,
 * fresh.
 */
export function FreeCheckTrialConfirmation({
  endsOn,
  onContinue,
}: {
  endsOn: string;
  onContinue: () => void;
}) {
  return (
    <div className="lt-fc" data-testid="free-check-trial-confirmation" role="status">
      <style>{FC_CSS}</style>
      <h2 className="lt-fc__title">{FREE_CHECK_COPY.confirmTitle}</h2>
      <p className="lt-fc__lead">{FREE_CHECK_COPY.confirmBody(endsOn)}</p>
      <div className="lt-fc__actions">
        <button
          type="button"
          className="lt-fc__btn lt-fc__btn--primary"
          onClick={() => {
            // F5 — the student continues: the sign-up marker (and its reload mirror) goes.
            clearTrialStartedAtSignUp();
            onContinue();
          }}
        >
          {FREE_CHECK_COPY.confirmCta}
        </button>
        {/* TRIAL-ON-SIGNUP-1b — "See plans →" to /pricing, wherever the UI is clickable. */}
        <Link className="lt-fc__btn lt-fc__btn--ghost" to="/pricing" data-testid="free-check-see-plans">
          {TRIAL_WORDING.seePlans}
        </Link>
      </div>
    </div>
  );
}
