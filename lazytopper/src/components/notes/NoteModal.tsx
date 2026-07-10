/**
 * NoteModal — mounts <Note> as an overlay POPUP over the Topic Hub.
 *
 * A chapter note is a long, often diagram-heavy document; rendering it inline
 * expanded the Topic Hub page (confusing). ConceptSpine now opens it here
 * instead: the hub dims behind, the note fills a near-full-screen sheet
 * (~92vw × ~92vh) on desktop → a full-screen sheet on mobile, so the figures,
 * mindmap and examples have room. ✕ / Escape / dim-click all close, returning to
 * the hub exactly as it was; body-scroll-lock while open.
 *
 * <Note> itself is UNCHANGED — only its MOUNTING moves from inline to inside this
 * modal. Overlay grammar mirrors the proven ResultsScorecard / ConceptTeachDrawer
 * pattern, class-driven via one scoped <style> block (no inline style objects).
 */
import { useEffect, useRef } from "react";
import type { NoteSpec } from "./noteSpec.types";
import Note from "./Note";

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  spec: NoteSpec;
  /** Topic name for the modal header (the note carries its own title inside). */
  title?: string;
}

export default function NoteModal({ open, onClose, spec, title }: NoteModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Move focus into the dialog on open (WAI-ARIA dialog etiquette) and restore
  // it to the element that opened it (the hub's Notes button) on close. (A full
  // Tab focus-trap is a deferred a11y follow-up — see [FU-NOTE-MODAL-FOCUS-TRAP].)
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      prevFocus?.focus?.();
    };
  }, [open]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body-scroll-lock while open (capture+restore so a nested NcertPageModal
  // that opens/closes on top does not prematurely unlock the hub behind us).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="lt-notemodal__dim"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} — notes` : "Chapter notes"}
      onClick={onClose}
    >
      <style>{NOTEMODAL_CSS}</style>
      <div className="lt-notemodal__card" onClick={(e) => e.stopPropagation()}>
        <div className="lt-notemodal__head">
          <div className="lt-notemodal__htitle">{title ? `${title} — Notes` : "Chapter notes"}</div>
          <button
            ref={closeRef}
            type="button"
            className="lt-notemodal__x"
            onClick={onClose}
            aria-label="Close notes"
          >
            ✕
          </button>
        </div>
        <div className="lt-notemodal__body">
          <Note spec={spec} />
        </div>
      </div>
    </div>
  );
}

const NOTEMODAL_CSS = `
.lt-notemodal__dim {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(15, 36, 68, 0.5);
  display: flex; align-items: center; justify-content: center; padding: 18px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  animation: lt-notemodal-fade 0.18s ease;
}
@keyframes lt-notemodal-fade { from { opacity: 0; } to { opacity: 1; } }
/* Near-full-screen sheet: diagram-heavy notes (7 NCERT figures + mindmap +
   examples) need room. Cap the width so prose lines stay readable on very wide
   monitors; on a laptop 92vw sits below the cap, so it reads as near-full. */
.lt-notemodal__card {
  background: #f6f8fa; border-radius: 20px;
  width: 92vw; max-width: 1280px; height: 92vh; max-height: 92vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 30px 90px rgba(15, 36, 68, 0.5);
}
.lt-notemodal__head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 22px; border-bottom: 1px solid #e7ebf0; background: #fff; flex-shrink: 0;
}
.lt-notemodal__htitle { font-weight: 700; font-size: 15px; color: #0f2444; }
.lt-notemodal__x {
  background: #f6f8fa; border: 1px solid #e7ebf0; border-radius: 999px;
  width: 30px; height: 30px; font-size: 14px; color: #566173; cursor: pointer; flex-shrink: 0;
}
.lt-notemodal__x:hover { background: #eef1f5; }
.lt-notemodal__body { flex: 1; min-height: 0; overflow-y: auto; padding: 18px; }

@media (max-width: 640px) {
  .lt-notemodal__dim { align-items: stretch; padding: 0; }
  .lt-notemodal__card {
    width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0;
  }
  .lt-notemodal__body { padding: 12px; }
}
`;
