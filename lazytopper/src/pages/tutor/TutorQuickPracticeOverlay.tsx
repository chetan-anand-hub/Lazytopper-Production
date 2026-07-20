// src/pages/tutor/TutorQuickPracticeOverlay.tsx
//
// Tutor ⇄ Quick-Practice overlay host (v2) — the twin of TutorCheckImproveOverlay (#476).
// Mounts the REAL PracticePage in a panel over the tutor, so the student practises a scoped set
// WITHOUT leaving the /tutor thread; closing the panel IS the return, and the tutor reads the
// graded work back over the shipped composePracticeRecordReturnOpener round-trip.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// ★ WHY THERE IS NO <MemoryRouter> HERE (v1 / #490 shipped this bug and was reverted, #491):
// the app is ALWAYS inside <BrowserRouter> (main.tsx). React Router forbids a Router inside a
// Router and throws "You cannot render a <Router> inside another <Router>", so the nested
// router that seeded the URL in v1 made this panel an error page in production. v1's test
// rendered the overlay in ISOLATION, so the nested router was the only router and the test
// went green on a build that could never work. Never seed by nesting a Router.
//
// WHAT THIS DOES INSTEAD — seed the location using the EXISTING router (spike-verified against
// react-router 7.14.0):
//   1. `<Routes location={seedUrl}>` renders routes at a GIVEN location without a new Router.
//      `useRoutes(routes, locationArg)` wraps its output in a LocationContext.Provider, so
//      `useLocation` — and therefore `useSearchParams`, which derives from it — resolve to the
//      SEED. Route matching runs against the seed too, so `useParams` resolves to it as well.
//      That is what lets PracticePage's ~36 route reads see a real tutor→QP visit unchanged.
//   2. `<Routes location>` ALONE still throws here: it asserts the seed pathname begins with the
//      parent-matched pathname, and this host renders under the tutor's own matched route
//      (/tutor/...), so "/practice/..." fails that invariant. Resetting RouteContext to zero
//      matches first makes the parent base "/" and the invariant passes.
//
// ★ THE CONSEQUENCE — no Router means NO history isolation (v1 got isolation for free from the
// MemoryRouter). `useNavigate`/`<Link>` inside the panel would hit the REAL router and navigate
// the app OUT of the tutor, destroying the thread this overlay exists to protect. So we also
// override the NavigationContext with a CONTAINED navigator whose push/replace/go return to the
// tutor via onClose instead of navigating. That contains every navigation in the subtree —
// including ones not enumerated here (PracticeControls' worksheet CTA, PracticeQuestionList's
// empty-state links, MentorSolveDrawer) — WITHOUT editing any of those shared components, so
// their non-overlay behaviour is byte-identical by construction. createHref/encodeLocation are
// passed through, so hrefs still render; only the act of navigating is contained.

import { useContext, useEffect, useMemo } from "react";
import {
  Route,
  Routes,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
} from "react-router-dom";
import PracticePage from "../PracticePage";
import "./tutorOverlay.css";

export interface TutorQuickPracticeOverlayProps {
  open: boolean;
  /** Close the panel and return to the tutor. Called by the pinned ✕, by Esc, and by the
   *  contained navigator when anything inside the panel tries to navigate. */
  onClose: () => void;
  /** The seed location — `buildQuickPracticeRoundTripHref(...)`, the SAME string the retired
   *  navigate leg used, so the hosted page sees a real tutor→QP visit. */
  seedUrl: string;
}

/**
 * The seeded, contained subtree. Split out from the host so the context work is readable:
 *   · NavigationContext → a contained navigator (no real navigation escapes the panel);
 *   · RouteContext      → reset to zero matches, so `<Routes location>`'s parent-base
 *                         invariant passes under the tutor's own matched route;
 *   · Routes location   → matches + supplies the seed to useParams / useLocation / useSearchParams.
 */
function SeededPracticeRoute({ seedUrl, onClose }: { seedUrl: string; onClose: () => void }) {
  const parentNavigation = useContext(UNSAFE_NavigationContext);

  // Contained navigator: keep href generation (so links still render normally) but turn any
  // ACT of navigation into "return to the tutor". A student who taps something that would leave
  // Practice lands back in their thread — never on a foreign page with the tutor gone, and never
  // (as in v1) on a blank panel. Note PracticePage's own setSearchParams paths are dormant on a
  // tutor entry (`arrivedTargeted`), so this does not fight the page's normal operation.
  const containedNavigation = useMemo(
    () => ({
      ...parentNavigation,
      navigator: {
        createHref: parentNavigation.navigator.createHref,
        encodeLocation: parentNavigation.navigator.encodeLocation,
        go: () => onClose(),
        push: () => onClose(),
        replace: () => onClose(),
      },
    }),
    [parentNavigation, onClose],
  );

  return (
    <UNSAFE_NavigationContext.Provider value={containedNavigation}>
      <UNSAFE_RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
        {/* The REAL PracticePage, overlay-mode, rendered at the seed location. `overlay` is the
            ONLY behavioural difference from a direct /practice visit; absent it is byte-identical. */}
        <Routes location={seedUrl}>
          <Route
            path="/practice/:grade/:subject"
            element={<PracticePage overlay={{ onClose }} />}
          />
        </Routes>
      </UNSAFE_RouteContext.Provider>
    </UNSAFE_NavigationContext.Provider>
  );
}

export default function TutorQuickPracticeOverlay({
  open,
  onClose,
  seedUrl,
}: TutorQuickPracticeOverlayProps) {
  // Esc returns to the tutor. Body scroll-lock while open. Backdrop click deliberately does NOT
  // close (mirrors the C&I host): a set in progress is too easy to lose on a stray tap.
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
        <SeededPracticeRoute seedUrl={seedUrl} onClose={onClose} />
      </div>
    </div>
  );
}
