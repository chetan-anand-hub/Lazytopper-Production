// src/pages/tutor/TutorCheckImproveOverlay.tsx
//
// Tutor ⇄ Check & Improve overlay host (build v1.1, Option A). Mounts the REAL
// DesktopCheckImprovePage inside a responsive panel over the tutor, so the student grades
// their attempt WITHOUT leaving the /tutor thread — closing the panel IS the return.
//
// Why this host is thin:
//   · C&I is ONE fluid, container-relative component post-#466 (CARD_BASIS / flex-wrap,
//     zero matchMedia layout), so it reflows correctly inside the panel at any width.
//   · The ONLY behavioural change to the page is its optional `overlay` prop. Absent, the
//     page is byte-identical to a direct /check-improve visit (the additive guarantee).
//   · The page owns its own close chrome in overlay mode: a pinned ✕ bar and — post-grade —
//     the scorecard's "Back to your tutor →". Both are PAYLOAD-AWARE off the page's own
//     `scorecardOpen`, so the graded record + the in-memory question reach the tutor. This
//     host stays a pure frame: backdrop + panel + scroll-lock + a bare-escape Esc.
//
// Responsive (owner-ruled, ALL sizes): a right-slide panel on desktop/tablet, a full-screen
// 100dvh sheet on mobile (the page suppresses its own MobileShell in overlay mode, so the
// sheet has no app nav to escape the tutor through). See tutorOverlay.css (the SHARED frame,
// now used by both this host and TutorQuickPracticeOverlay — one source of truth).

import { useEffect } from "react";
import DesktopCheckImprovePage, {
  type CheckImproveOverlayProps,
} from "../desktop/DesktopCheckImprovePage";
import "./tutorOverlay.css";

export interface TutorCheckImproveOverlayProps {
  open: boolean;
  /** The tutor's close handler: closes the panel and, with a graded record, injects the
   *  reframed return-opener (poll-free). Same signature the hosted page's `overlay.onClose`
   *  carries — the record + question flow straight through. */
  onClose: CheckImproveOverlayProps["onClose"];
}

export default function TutorCheckImproveOverlay({ open, onClose }: TutorCheckImproveOverlayProps) {
  // Esc returns to the tutor — a bare escape (no payload). The DESIGNED hand-over paths are
  // the panel's ✕ / "Back to your tutor →", which are payload-aware inside the page. Body
  // scroll-lock while the panel is open. Backdrop click deliberately does NOT close: the
  // graded marksheet is too valuable to dismiss on a stray tap (owner: no auto-close).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lt-tutor-overlay__backdrop" role="presentation">
      <div
        className="lt-tutor-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Check & Improve"
      >
        {/* The REAL page, overlay-mode. The optional `overlay` prop is the ONLY behavioural
            difference from a direct /check-improve visit; absent it is byte-identical. */}
        <DesktopCheckImprovePage overlay={{ onClose }} />
      </div>
    </div>
  );
}
