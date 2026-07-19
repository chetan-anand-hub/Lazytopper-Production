// src/pages/tutor/TutorQuickPracticeOverlay.tsx
//
// Tutor ⇄ Quick-Practice overlay host — the twin of TutorCheckImproveOverlay (#476).
// Mounts the REAL PracticePage inside a responsive panel over the tutor, so the student
// practises a scoped set WITHOUT leaving the /tutor thread — closing the panel IS the
// return, and the tutor reads back the graded work (the shipped composePracticeRecordReturnOpener
// chain — QP is the reference impl the C&I overlay copied; this host does NOT rebuild it).
//
// Why a nested MemoryRouter (owner-ruled), NOT a prop-threaded entry context:
//   · PracticePage is driven by ~36 route reads (useParams / useSearchParams). Threading an
//     entry object through all of them would be a large, byte-identity-fragile edit. Instead
//     we SEED a MemoryRouter with the exact URL `buildQuickPracticeRoundTripHref(...)` already
//     produces (source=tutor + topic + microconcept + count + backLabel) — every one of those
//     reads resolves BYTE-IDENTICALLY to a real tutor→QP visit. PracticePage's param code is
//     UNCHANGED; its only page-change is the thin optional `overlay` prop (close-chrome).
//   · The MemoryRouter ISOLATES the history stack, so PracticePage's `built=1` back-nav logic
//     (already `if (arrivedTargeted) return`-dormant on a source=tutor entry) can never leak a
//     history entry into the parent app's back-stack.
//
// The nav-guard (below) is the robust catch-all for the handful of in-page navigations that
// PracticePage's children can still fire (the "build a worksheet" CTA, empty-state links, etc.):
// any change of the panel's PATHNAME closes the overlay and returns to the tutor, rather than
// blanking the panel on a route the isolated MemoryRouter has no match for. Query-only changes
// (PracticePage's own setSearchParams) do NOT change the pathname, so they never trip it.
//
// Responsive: reuses the SHARED tutorOverlay.css frame — a right-slide panel on desktop/tablet,
// a full-screen 100dvh sheet on mobile — pixel-identical to the C&I overlay.

import { useEffect, useRef } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PracticePage from "../PracticePage";
import "./tutorOverlay.css";

export interface TutorQuickPracticeOverlayProps {
  open: boolean;
  /** The tutor's close handler: closes the panel and reads back the graded QP record via the
   *  EXISTING pending-marker round-trip (storage; no new plumbing). Called by the pinned ✕,
   *  Esc, and the nav-guard on any in-panel navigation away from the practice route. */
  onClose: () => void;
  /** The seed URL for the isolated MemoryRouter — `buildQuickPracticeRoundTripHref(...)`, the
   *  SAME string the navigate leg used, so the hosted PracticePage sees a real tutor→QP visit. */
  seedUrl: string;
}

/**
 * Closes the overlay the moment the panel's pathname changes away from the seeded practice
 * route. The MemoryRouter is isolated and only knows the one `/practice/:grade/:subject`
 * route, so an in-page navigation elsewhere would otherwise render a blank panel; instead we
 * return the student to the tutor. Fires at most once (a ref latch) — after onLeave the host
 * unmounts. Query-only changes keep the same pathname, so a rebuild/filter never trips it.
 */
function OverlayNavGuard({ onLeave }: { onLeave: () => void }) {
  const location = useLocation();
  const homePathRef = useRef(location.pathname);
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    if (location.pathname !== homePathRef.current) {
      firedRef.current = true;
      onLeave();
    }
  }, [location.pathname, onLeave]);
  return null;
}

export default function TutorQuickPracticeOverlay({
  open,
  onClose,
  seedUrl,
}: TutorQuickPracticeOverlayProps) {
  // Esc returns to the tutor. Body scroll-lock while open. Backdrop click deliberately does
  // NOT close (mirrors the C&I host): a set in progress is too easy to lose on a stray tap.
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
        className="lt-tutor-overlay__panel lt-tutor-overlay__panel--qp"
        role="dialog"
        aria-modal="true"
        aria-label="Quick Practice"
      >
        {/* The REAL PracticePage, overlay-mode, inside an isolated router seeded with the
            tutor round-trip URL. `overlay` is the ONLY behavioural difference from a direct
            /practice visit; absent it is byte-identical. */}
        <MemoryRouter initialEntries={[seedUrl]}>
          <OverlayNavGuard onLeave={onClose} />
          <Routes>
            <Route
              path="/practice/:grade/:subject"
              element={<PracticePage overlay={{ onClose }} />}
            />
          </Routes>
        </MemoryRouter>
      </div>
    </div>
  );
}
