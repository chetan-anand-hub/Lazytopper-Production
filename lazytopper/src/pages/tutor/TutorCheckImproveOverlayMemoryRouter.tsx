// src/pages/tutor/TutorCheckImproveOverlayMemoryRouter.tsx
//
// ⚠️ INVESTIGATION PROTOTYPE — Option B (the MemoryRouter wrapper). Its purpose is to make
// the fork's decision CONCRETE, not to ship. It demonstrates precisely WHERE Option B's
// "zero changes to DesktopCheckImprovePage" promise collapses. Read the report §2 for the
// verdict this file evidences.
//
// The pitch (v1.1's residue): mount the REAL route inside a nested MemoryRouter so the page
// stays a pure, prop-less route, and intercept "navigate home" inside the memory router so
// closing the panel replaces the return. The seed rides on the initial URL.
//
// WHERE IT BREAKS — three seams, each verified against the code at trunk e19b80f:
//
//   1. THE SEED HAS NOWHERE TO LAND (fatal). The page reads NO url param for the question:
//      `question` is `useState<string>("")` (DesktopCheckImprovePage.tsx:740) and there is
//      no `searchParams.get("question")` anywhere in the file. `useReturnTicket` reads
//      searchParams — but only `returnTo`/`backLabel`, never the question. So an initial
//      URL like `/check-improve?question=...` is INERT: the page never reads it. To seed
//      via a param, you must EDIT the page to read one — which is (a) exactly the page
//      change Option B claims to avoid, and (b) WORSE than Option A's, because that new
//      read runs on DIRECT visits too, threatening the byte-identical guarantee (§5.1).
//
//   2. EVERY OUTBOUND navigate() DIES INSIDE THE MEMORY ROUTER. The page has 8 outbound
//      deep-links (practice, worksheet, topic-hub, exam-trends, me, login — see report §2
//      audit). Inside a MemoryRouter with only "/check-improve" registered, tapping any of
//      them navigates to a route that does not exist → a blank panel. To fix, Option B must
//      either replicate the app's whole route table inside the nested router (absurd) or
//      intercept every navigation — which is MORE plumbing than Option A's two-path fork.
//
//   3. THE RETURN IS AN INTERCEPT, NOT A CLOSE. "navigate(returnTicket.path)" inside the
//      memory router goes to a memory entry; turning that into "close the panel" needs a
//      custom history listener. Doable, but it is net-new machinery vs. Option A's onClose.
//
// Net: Option B is NOT zero-touch (seam 1 forces a page edit anyway), and it ADDS a nested
// router + navigation interception on top. Option A wins. This file is the evidence.

import { MemoryRouter } from "react-router-dom";
import DesktopCheckImprovePage from "../desktop/DesktopCheckImprovePage";
import "./tutorCheckImproveOverlay.css";

export interface TutorCheckImproveOverlayBProps {
  open: boolean;
  seedQuestion?: string; // ⚠️ INERT — see seam 1. The page never reads it off the URL.
  seedTopicSlug?: string;
  onClose: () => void;
}

export function TutorCheckImproveOverlayMemoryRouter({
  open,
  seedQuestion,
  seedTopicSlug,
  onClose,
}: TutorCheckImproveOverlayBProps) {
  if (!open) return null;

  // The seed URL. `topic`/`returnTo` ARE read (via useReturnTicket / the deep-link contract);
  // `question` is NOT — it is here only to show that the page ignores it (seam 1).
  const params = new URLSearchParams();
  if (seedTopicSlug) params.set("topic", seedTopicSlug);
  if (seedQuestion) params.set("question", seedQuestion); // ⚠️ read by nobody
  const initialUrl = `/check-improve?${params.toString()}`;

  return (
    <div className="lt-ci-overlay__backdrop" onClick={onClose} role="presentation">
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
          onClick={onClose}
        >
          Back to your tutor ×
        </button>
        {/* A nested router. Note: seam 2 — any outbound navigate() inside here lands on an
            unregistered route (blank). seam 3 — the return navigate is not intercepted. */}
        <MemoryRouter initialEntries={[initialUrl]}>
          <DesktopCheckImprovePage />
        </MemoryRouter>
      </div>
    </div>
  );
}

export default TutorCheckImproveOverlayMemoryRouter;
