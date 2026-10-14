import { useEffect, useSyncExternalStore } from "react";
import "./SaveStatusToast.css";
import { dismissSaveStatus, getSaveStatus, subscribeSaveStatus } from "../../services/sessionRecordsOutbox";

/**
 * SAVE-SYNC-1 (D190) — the ONE status line for "is my graded result in my account?".
 *
 * Every graded result on all six surfaces (Check & Improve single and multi, Worksheet, Chapter
 * Test, Full Mock, Quick Practice) goes through the single writer in `sessionRecords.ts`, so the
 * line is mounted ONCE (by `AuthProvider`) rather than on six result screens. It reads the outbox
 * status store and says one of three things, in the owner's wording rules (explain, never force,
 * never alarm, never the word "lost", no error red):
 *   saving      "Saving your result to your account…" + what closing now means
 *   saved       "Saved to your account ✓"   (fades by itself)
 *   device-only "Saved on this device. We'll add it to your account automatically next time
 *               you're online."
 * Renders nothing while idle, so a signed-out, local or anonymous visit never sees it.
 */

export const SAVE_STATUS_COPY = {
  saving: "Saving your result to your account…",
  savingHint:
    "Saving takes a few seconds. If you close now, your marks stay on this device but won't appear on your other devices or in your progress until you open LazyTopper here again.",
  saved: "Saved to your account ✓",
  deviceOnly: "Saved on this device. We'll add it to your account automatically next time you're online.",
  /** the outbox could not store this result (storage full): the add only happens while the tab stays open */
  keepOpen: "Please keep LazyTopper open a little longer while we add this result to your account.",
  /** the add could not be queued AND the in-session attempts ended: nothing will retry by itself */
  deviceOnlyManual: "We couldn't add this result to your account automatically. Please open LazyTopper again when you're online and check your history.",
} as const;

const SAVED_VISIBLE_MS = 4000;


export default function SaveStatusToast() {
  const { phase } = useSyncExternalStore(subscribeSaveStatus, getSaveStatus, getSaveStatus);

  useEffect(() => {
    if (phase !== "saved") return undefined;
    const t = window.setTimeout(dismissSaveStatus, SAVED_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "idle") return null;
  return (
    <div className={`lt-savestatus lt-savestatus--${phase}`} role="status" aria-live="polite" data-testid="save-status">
      <div className="lt-savestatus__row">
        <span className="lt-savestatus__text">
          {phase === "saving"
            ? SAVE_STATUS_COPY.saving
            : phase === "saved"
              ? SAVE_STATUS_COPY.saved
              : phase === "keep-open"
                ? SAVE_STATUS_COPY.keepOpen
                : phase === "device-only-manual"
                  ? SAVE_STATUS_COPY.deviceOnlyManual
                  : SAVE_STATUS_COPY.deviceOnly}
        </span>
        {(phase === "device-only" || phase === "keep-open" || phase === "device-only-manual") && (
          <button type="button" className="lt-savestatus__ok" onClick={dismissSaveStatus}>
            OK
          </button>
        )}
      </div>
      {phase === "saving" && <p className="lt-savestatus__hint">{SAVE_STATUS_COPY.savingHint}</p>}
    </div>
  );
}
