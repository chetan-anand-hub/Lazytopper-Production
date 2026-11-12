/**
 * MoveToOtherFlow - SIGNED-IN-MOVE-1 (owner 12 Nov 2026): option 3 of "Who will use this?". The buyer types their child's mobile
 * number (+91) or email, sees "Move <item> to 98•••••210? Your account will keep nothing, and your child signs in with that.",
 * confirms, and the server moves it (once, within 24 hours, only if unused). Masked contacts on screen; the typed value is held in
 * component state only and goes to the server in the request body, never to analytics, storage or a log.
 */
import { useRef, useState } from "react";
import { maskEmail, maskIndianMobile, normaliseIndianMobile } from "../../lib/maskContact";
import { WHATSAPP_URL } from "../../config/socialProfiles";
import { moveToOther } from "./moveToOtherClient";
import {
  MOVE_BACK,
  MOVE_BAD_EMAIL,
  MOVE_BAD_PHONE,
  MOVE_BUSY,
  MOVE_CONFIRM,
  MOVE_CONTINUE,
  MOVE_EMAIL_LABEL,
  MOVE_FALLBACK_ERROR,
  MOVE_INTRO,
  MOVE_PHONE_LABEL,
  MOVE_REFUSALS,
  MOVE_USE_EMAIL,
  MOVE_USE_PHONE,
  confirmMoveLine,
  moveRefusalNeedsSupport,
  movedLine,
  type MoveTarget,
} from "./signinLinkModel";
import { trackSigninMoveConfirmed, trackSigninMoveDone, trackSigninMoveRefused } from "./signinLinkAnalytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Step = "enter" | "confirm" | "busy" | "done" | "refused";

export default function MoveToOtherFlow({ target, onCancel, onMoved }: { target: MoveTarget; onCancel: () => void; onMoved?: () => void }) {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [step, setStep] = useState<Step>("enter");
  const [error, setError] = useState("");
  const [masked, setMasked] = useState("");
  const [refusal, setRefusal] = useState("");
  const inFlight = useRef(false);

  function onContinue() {
    if (mode === "phone") {
      const n = normaliseIndianMobile(value);
      if (!n) return setError(MOVE_BAD_PHONE);
      setMasked(maskIndianMobile(n));
    } else {
      const e = value.trim().toLowerCase();
      if (!EMAIL_RE.test(e)) return setError(MOVE_BAD_EMAIL);
      setMasked(maskEmail(e));
    }
    setError("");
    setStep("confirm");
  }

  async function onConfirm() {
    if (inFlight.current) return; // a double tap sends one request
    inFlight.current = true;
    setStep("busy");
    trackSigninMoveConfirmed("order", mode);
    const contact = mode === "phone" ? { phone: normaliseIndianMobile(value) ?? "" } : { email: value.trim().toLowerCase() };
    const r = await moveToOther(target.orderId, contact);
    if (r.ok) {
      trackSigninMoveDone(r.kind, r.contact);
      setMasked(r.masked || masked);
      setStep("done");
      onMoved?.();
      return; // stays locked: a second move of this order is never offered
    }
    inFlight.current = false;
    trackSigninMoveRefused(r.reason);
    setRefusal(r.reason);
    setStep("refused");
  }

  if (step === "done") {
    return (
      <p className="lt-sil__done" role="status" data-testid="signin-move-done">
        {movedLine(masked)}
      </p>
    );
  }
  if (step === "refused") {
    const text = MOVE_REFUSALS[refusal] ?? MOVE_FALLBACK_ERROR;
    return (
      <div className="lt-sil__form" data-testid="signin-move-refused">
        <p className="lt-sil__err" role="alert">
          {text}
        </p>
        {moveRefusalNeedsSupport(refusal) && (
          <p className="lt-sil__p">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" data-testid="signin-move-whatsapp">
              Message us on WhatsApp
            </a>
          </p>
        )}
        {!moveRefusalNeedsSupport(refusal) && (
          <button type="button" className="lt-sil__btn" onClick={() => setStep("enter")} data-testid="signin-move-retry">
            {MOVE_BACK}
          </button>
        )}
      </div>
    );
  }
  if (step === "confirm" || step === "busy") {
    return (
      <div className="lt-sil__form" data-testid="signin-move-confirm">
        <p className="lt-sil__p">{confirmMoveLine(target.item, masked)}</p>
        <div className="lt-sil__row">
          <button type="button" className="lt-sil__btn lt-sil__btn--primary" disabled={step === "busy"} onClick={onConfirm} data-testid="signin-move-confirm-yes">
            {step === "busy" ? MOVE_BUSY : MOVE_CONFIRM}
          </button>
          <button type="button" className="lt-sil__btn lt-sil__btn--quiet" disabled={step === "busy"} onClick={() => setStep("enter")} data-testid="signin-move-confirm-back">
            {MOVE_BACK}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="lt-sil__form" data-testid="signin-move-enter">
      <p className="lt-sil__p">{MOVE_INTRO}</p>
      <label className="lt-sil__label" htmlFor="lt-sil-move-input">
        {mode === "phone" ? MOVE_PHONE_LABEL : MOVE_EMAIL_LABEL}
      </label>
      <div className="lt-sil__phone">
        {mode === "phone" && <span className="lt-sil__cc">+91</span>}
        <input
          id="lt-sil-move-input"
          className="lt-sil__input"
          type={mode === "phone" ? "tel" : "email"}
          inputMode={mode === "phone" ? "numeric" : "email"}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          data-testid="signin-move-input"
        />
      </div>
      {error && (
        <p className="lt-sil__err" role="alert" data-testid="signin-move-error">
          {error}
        </p>
      )}
      <div className="lt-sil__row">
        <button type="button" className="lt-sil__btn lt-sil__btn--primary" onClick={onContinue} data-testid="signin-move-continue">
          {MOVE_CONTINUE}
        </button>
        <button
          type="button"
          className="lt-sil__btn lt-sil__btn--quiet"
          onClick={() => {
            setMode(mode === "phone" ? "email" : "phone");
            setValue("");
            setError("");
          }}
          data-testid="signin-move-switch"
        >
          {mode === "phone" ? MOVE_USE_EMAIL : MOVE_USE_PHONE}
        </button>
        <button type="button" className="lt-sil__btn lt-sil__btn--quiet" onClick={onCancel} data-testid="signin-move-cancel">
          {MOVE_BACK}
        </button>
      </div>
    </div>
  );
}
