/**
 * ExtendPremiumControl — ADMIN-EXTEND-1. A small "Extend Premium" control on one student's
 * admin detail panel, for the "5-minute feedback call -> 7 days extra Premium" reward.
 *
 * Two steps, on purpose: the admin enters days (1-30, default 7) and a reason, then sees
 * ONE honest confirmation line naming the student, the days and the new end date before
 * anything is sent. The request id is minted when that line appears and reused until it
 * is answered, so a double-click or a retry is the same request and the server applies it
 * once. Everything that matters — admin check, the end, price 0, the audit entry — is
 * decided by the server; this control holds no entitlement of its own.
 */
import { useRef, useState } from "react";
import type { Plan } from "./studentsAdminModel";
import {
  EXTEND_DEFAULT_DAYS,
  EXTEND_DEFAULT_REASON,
  EXTEND_MAX_DAYS,
  EXTEND_MAX_REASON,
  EXTEND_MIN_DAYS,
  confirmationLine,
  doneLine,
  extendBlockedReason,
  newRequestId,
  parseExtendDays,
  postExtension,
  previewNewEndMs,
} from "./adminExtendModel";

type Step =
  | { kind: "edit" }
  | { kind: "confirm"; days: number; reason: string; requestId: string; previewEndMs: number }
  | { kind: "sending"; days: number; reason: string; requestId: string; previewEndMs: number }
  | { kind: "done"; line: string }
  | { kind: "error"; message: string; retry: { days: number; reason: string; requestId: string; previewEndMs: number } | null };

export default function ExtendPremiumControl({
  uid,
  studentLabel,
  plan,
  getToken,
  onExtended,
}: {
  uid: string;
  /** How the student is named on screen (masked unless the admin revealed it), plus uid. */
  studentLabel: string;
  plan: Plan;
  getToken: () => Promise<string | null>;
  onExtended: () => void;
}) {
  const [daysText, setDaysText] = useState(String(EXTEND_DEFAULT_DAYS));
  const [reason, setReason] = useState(EXTEND_DEFAULT_REASON);
  const [step, setStep] = useState<Step>({ kind: "edit" });
  const inFlight = useRef(false);

  const blocked = extendBlockedReason(plan);
  const days = parseExtendDays(daysText);
  const cleanReason = reason.replace(/\s+/g, " ").trim() || EXTEND_DEFAULT_REASON;

  function review() {
    if (days === null || blocked) return;
    const previewEndMs = previewNewEndMs(plan, days, Date.now());
    if (previewEndMs === null) return;
    setStep({ kind: "confirm", days, reason: cleanReason, requestId: newRequestId(), previewEndMs });
  }

  async function send(req: { days: number; reason: string; requestId: string; previewEndMs: number }) {
    // A second click before React re-renders the disabled button must not send again.
    // (The server would replay it anyway — same request id — but one click, one request.)
    if (inFlight.current) return;
    inFlight.current = true;
    setStep({ kind: "sending", ...req });
    const out = await postExtension({ uid, days: req.days, reason: req.reason, requestId: req.requestId }, getToken);
    inFlight.current = false;
    if (out.ok) {
      setStep({ kind: "done", line: doneLine(studentLabel, out.extension, out.replayed) });
      onExtended();
    } else {
      // A network failure may have applied it: retrying with the SAME id is safe.
      setStep({ kind: "error", message: out.error, retry: out.status === null || out.status >= 500 ? req : null });
    }
  }

  return (
    <section className="sa-extend" aria-label="Extend Premium" data-testid="sa-extend">
      <h3 className="sa-extend-title">Extend Premium (free)</h3>
      {blocked ? (
        <p className="sa-muted">{blocked}</p>
      ) : step.kind === "edit" ? (
        <div className="sa-extend-row">
          <label className="sa-extend-field">
            Days
            <input
              className="sa-extend-input sa-extend-days"
              type="number"
              inputMode="numeric"
              min={EXTEND_MIN_DAYS}
              max={EXTEND_MAX_DAYS}
              value={daysText}
              onChange={(e) => setDaysText(e.target.value)}
            />
          </label>
          <label className="sa-extend-field sa-extend-grow">
            Reason
            <input
              className="sa-extend-input"
              type="text"
              maxLength={EXTEND_MAX_REASON}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button type="button" className="sa-btn" disabled={days === null} onClick={review}>
            Review
          </button>
          {days === null && (
            <p className="sa-error sa-extend-full">Days must be a whole number from {EXTEND_MIN_DAYS} to {EXTEND_MAX_DAYS}.</p>
          )}
        </div>
      ) : step.kind === "confirm" || step.kind === "sending" ? (
        <div className="sa-extend-row">
          <p className="sa-extend-confirm sa-extend-full" data-testid="sa-extend-confirm">
            {confirmationLine(studentLabel, step.days, step.previewEndMs, step.reason)}
          </p>
          <button type="button" className="sa-btn" disabled={step.kind === "sending"} onClick={() => void send(step)}>
            {step.kind === "sending" ? "Extending…" : "Confirm"}
          </button>
          <button type="button" className="sa-btn sa-btn-plain" disabled={step.kind === "sending"} onClick={() => setStep({ kind: "edit" })}>
            Cancel
          </button>
        </div>
      ) : step.kind === "done" ? (
        <div className="sa-extend-row">
          <p className="sa-extend-done sa-extend-full" role="status" data-testid="sa-extend-done">
            {step.line}
          </p>
          <button type="button" className="sa-btn sa-btn-plain" onClick={() => setStep({ kind: "edit" })}>
            Extend again
          </button>
        </div>
      ) : (
        <div className="sa-extend-row">
          <p className="sa-error sa-extend-full" role="alert">
            {step.message}
          </p>
          {step.retry && (
            <button type="button" className="sa-btn" onClick={() => step.retry && void send(step.retry)}>
              Retry (same request)
            </button>
          )}
          <button type="button" className="sa-btn sa-btn-plain" onClick={() => setStep({ kind: "edit" })}>
            Back
          </button>
        </div>
      )}
    </section>
  );
}
