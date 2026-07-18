// src/pages/tutor/TutorCheckImproveOverlay.tsx
//
// ⚠️ INVESTIGATION PROTOTYPE (spec: TutorOverlay_Investigation_v1.2). NOT wired into the
// app, NOT a product PR. It exists so the §2 fork can be judged against real code, not
// prose. The build lane that follows the owner's ruling owns the production version.
//
// OPTION A host — the RECOMMENDED fork. It mounts the REAL DesktopCheckImprovePage
// (props-optional refactor) inside a dimmed, container-relative panel over the tutor.
// The student never leaves the /tutor thread: closing the panel IS the return.
//
// Why this host is thin:
//   · C&I is ONE fluid, container-relative component post-#466 (CARD_BASIS/flex-wrap,
//     zero matchMedia layout) → it reflows correctly inside an ~820px panel. The host
//     sets a width and gets out of the way.
//   · The page's TWO return-home navigate() paths are intercepted by the `overlay` prop
//     (see the page's returnTicketInput): in overlay mode they call overlay.onClose()
//     instead of navigate(). The host owns the backdrop + the × close affordance.
//   · GAP-1 (honest MVP): the tutor holds NO clean question text or image at offer time
//     (see the report §3) — only a topicKey. So we seed `seedTopicSlug` as the cosmetic
//     breadcrumb the deep-link already carried, and the student enters the question in
//     the panel exactly as on the real page. We do NOT auto-fire detection (§1).

import { useEffect } from "react";
import DesktopCheckImprovePage from "../desktop/DesktopCheckImprovePage";
import type { CheckImproveOverlayOutcome } from "../desktop/DesktopCheckImprovePage";
import "./tutorCheckImproveOverlay.css";

export interface TutorCheckImproveOverlayProps {
  open: boolean;
  /** Cosmetic breadcrumb only — the tutor's canonical topicKey. C&I derives the real
   *  topic from the question the student enters; this never functions as a topic input. */
  seedTopicSlug?: string;
  /** Close the panel. `outcome.ciCode` (when present) is the code C&I just minted for the
   *  grade — handed straight back so the tutor can resolve the round-trip WITHOUT a cloud
   *  poll (report §6.4's clean path). */
  onClose: (outcome?: CheckImproveOverlayOutcome) => void;
}

export function TutorCheckImproveOverlay({ open, seedTopicSlug, onClose }: TutorCheckImproveOverlayProps) {
  // Esc closes (returns to the tutor). Body scroll-lock while open.
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
    <div
      className="lt-ci-overlay__backdrop"
      onClick={() => onClose()}
      role="presentation"
    >
      <div
        className="lt-ci-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Check & Improve"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="lt-ci-overlay__close"
          aria-label="Close and return to your tutor"
          onClick={() => onClose()}
        >
          Back to your tutor ×
        </button>
        {/* The REAL page, overlay-mode. The optional `overlay` prop is the ONLY behavioural
            difference from a direct /check-improve visit; absent it is byte-identical. */}
        <DesktopCheckImprovePage overlay={{ seedTopicSlug, onClose }} />
      </div>
    </div>
  );
}

export default TutorCheckImproveOverlay;
