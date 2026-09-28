/**
 * FairUseConfirm — FAIR-USE-UI-1 UI2. Asked before grading N answers when only R < N
 * checks are left today. Confirming sends EXACTLY the first R (the caller slices, in the
 * student's own order); cancelling sends nothing.
 */

import { confirmCopy } from "./fairUseGate";
import "./usage.css";

export default function FairUseConfirm({
  remaining,
  onConfirm,
  onCancel,
}: {
  remaining: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="lt-usage lt-usage--confirm" role="alertdialog" aria-label="Checks left today" data-testid="fair-use-confirm">
      <p className="lt-usage__lead">{confirmCopy(remaining)}</p>
      <div className="lt-usage__actions">
        <button type="button" className="lt-usage__btn" onClick={onConfirm} data-testid="fair-use-confirm-yes">
          Mark the first {remaining}
        </button>
        <button type="button" className="lt-usage__btn lt-usage__btn--ghost" onClick={onCancel}>
          Not now
        </button>
      </div>
    </section>
  );
}
