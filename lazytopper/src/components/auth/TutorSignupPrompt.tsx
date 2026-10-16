import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { SIGNUP_TO_ASK_COPY } from "../../pages/tutor/signedOutScorecardAsk";

/**
 * TUTOR-FIX-2 T12 — the sign-up prompt a SIGNED-OUT visitor sees after tapping "Ask the tutor
 * why I lost this mark" on a scorecard. The same card as Quick Practice's "Sign in to check your
 * answers" (PracticePage `lt-qp-signin`): one Link to the existing /login door with `state.from`,
 * and Not now. No new auth flow.
 *
 * Opening it does nothing else — no navigation, no network, nothing stored. Only choosing Sign up
 * runs `onSignUp` (the host stores its one-shot there) and goes to /login. It is portalled above
 * the scorecard sheet (which is itself a fixed, z-index 1000 portal).
 */
export default function TutorSignupPrompt({
  to,
  onSignUp,
  onDismiss,
}: {
  /** The internal path /login returns to after sign-up (validated by the host). */
  to: string;
  onSignUp: () => void;
  onDismiss: () => void;
}) {
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    ctaRef.current?.focus();
    // Capture phase + stop: Escape closes THIS prompt only, not the scorecard underneath
    // (ResultsScorecard closes on a bubbling window Escape).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      dismissRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const veil = (
    <div
      className="lt-tsp"
      data-testid="tutor-signup-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lt-tsp-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <style>{TUTOR_SIGNUP_PROMPT_CSS}</style>
      <div className="lt-tsp__card">
        <h3 id="lt-tsp-title" className="lt-tsp__t">Ask the tutor why you lost this mark</h3>
        <p className="lt-tsp__p">{SIGNUP_TO_ASK_COPY}</p>
        <Link
          ref={ctaRef}
          className="lt-tsp__cta"
          data-testid="tutor-signup-cta"
          to="/login"
          state={{ from: to }}
          onClick={onSignUp}
        >
          Sign up free
        </Link>
        <button type="button" className="lt-tsp__dismiss" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
  return typeof document === "undefined" ? veil : createPortal(veil, document.body);
}

// The QP sign-in card's look (PracticePage QP_SIGNIN_CSS), on a veil above the scorecard sheet.
const TUTOR_SIGNUP_PROMPT_CSS = `
  .lt-tsp {
    position: fixed; inset: 0; z-index: 1100;
    display: flex; align-items: center; justify-content: center;
    padding: 16px; background: rgba(15, 23, 42, 0.55);
  }
  .lt-tsp__card {
    width: 100%; max-width: 380px; padding: 18px 16px; text-align: center;
    border-radius: 14px; border: 1px solid rgba(22, 185, 106, 0.4);
    background: #f3fbf7; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
  }
  .lt-tsp__t { margin: 0 0 6px; font-size: 1rem; font-weight: 800; color: #0f2743; }
  .lt-tsp__p { margin: 0; font-size: 0.82rem; line-height: 1.55; color: #49627f; }
  .lt-tsp__cta {
    display: inline-block; margin-top: 14px; padding: 12px 24px; min-height: 44px; box-sizing: border-box;
    border-radius: 12px; background: hsl(152, 45%, 32%); color: #fff;
    font-size: 0.88rem; font-weight: 700; text-decoration: none;
  }
  .lt-tsp__cta:focus-visible { outline: 2px solid #16b96a; outline-offset: 2px; }
  .lt-tsp__dismiss {
    display: block; margin: 10px auto 0; min-height: 44px; padding: 0 12px; background: none; border: none;
    font: inherit; font-size: 0.78rem; font-weight: 600; color: #49627f;
    text-decoration: underline; cursor: pointer;
  }
`;
