import { useEffect, useSyncExternalStore } from "react";
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
} as const;

const SAVED_VISIBLE_MS = 4000;

const CSS = `
.lt-savestatus {
  position: fixed; left: 50%; transform: translateX(-50%); z-index: 60;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  width: min(92vw, 420px); box-sizing: border-box;
  padding: 10px 14px; border-radius: 12px;
  background: #0b1f3a; color: #f4f7fb;
  box-shadow: 0 6px 22px rgba(11, 31, 58, 0.28);
  font-size: 13.5px; line-height: 1.4;
}
.lt-savestatus__row { display: flex; align-items: flex-start; gap: 8px; }
.lt-savestatus__text { flex: 1 1 auto; font-weight: 600; }
.lt-savestatus__hint { margin: 6px 0 0; font-weight: 400; font-size: 12.5px; opacity: 0.86; }
.lt-savestatus--saved .lt-savestatus__text { color: #7ee2a8; }
.lt-savestatus__ok {
  flex: 0 0 auto; border: 0; border-radius: 8px; padding: 2px 10px;
  background: rgba(255, 255, 255, 0.14); color: inherit; font: inherit; font-weight: 600; cursor: pointer;
}
@media print { .lt-savestatus { display: none; } }
@media (min-width: 1000px) {
  .lt-savestatus { bottom: 24px; left: auto; right: 24px; transform: none; }
}
`;

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
      <style>{CSS}</style>
      <div className="lt-savestatus__row">
        <span className="lt-savestatus__text">
          {phase === "saving" ? SAVE_STATUS_COPY.saving : phase === "saved" ? SAVE_STATUS_COPY.saved : SAVE_STATUS_COPY.deviceOnly}
        </span>
        {phase === "device-only" && (
          <button type="button" className="lt-savestatus__ok" onClick={dismissSaveStatus}>
            OK
          </button>
        )}
      </div>
      {phase === "saving" && <p className="lt-savestatus__hint">{SAVE_STATUS_COPY.savingHint}</p>}
    </div>
  );
}
