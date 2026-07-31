import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSessionRecordsFromCloud } from "../../services/sessionRecords";

/**
 * FirstSession — the start card a student sees on Home when they have NO graded
 * activity yet, and only then.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NOT A WIZARD ────────────────────────────
 * The product needs no setup: it covers every Class 10 subject and it learns the
 * student from their MISTAKES, not from a form. The real gap is that a
 * brand-new student lands on a Home with nothing personalised — because there is
 * no evidence yet. The honest fix is one clear next action, not a setup flow.
 *
 * ── THE ZERO-ATTEMPT SIGNAL ───────────────────────────────────────────────
 * `getSessionRecordsFromCloud(uid)` — `sessionRecords` is the canonical "ONE
 * durable record per COMPLETED graded session" store (worksheet · chapter-test ·
 * full-mock · check-improve · quick-practice). It is the only store on this
 * surface that means "graded activity" across ALL surfaces and ACROSS DEVICES.
 *
 * Rejected alternatives, recorded so they are not re-tried:
 *   - `getMistakeLogs(uid, 7)` (already read by DesktopHome) is a 7-DAY WINDOW
 *     and mistake-specific: a returning student with a clean week, or one whose
 *     last attempt was 8 days ago, reads as zero-attempt. Wrong signal.
 *   - `readLandingMemory()` (already read by both Home pages) is a
 *     device-local localStorage blob describing the last SUBJECT/GRADE, not
 *     graded work. A returning student on a new device reads as zero-attempt.
 *
 * ★ HYDRATION IS THE HAZARD, AND IT IS HANDLED AS A THIRD STATE.
 * `getSessionRecordsFromCloud` is local-first then cloud-merged, so a returning
 * student on a fresh device has NO local records for the duration of the
 * Firestore read. Deciding "zero attempts" from an empty synchronous read would
 * flash this card at a student who has months of work.
 *
 * So the state is TRI-state, never boolean:
 *     "loading" → render NOTHING (not the card, not a placeholder)
 *     "none"    → render the card
 *     "some"    → render nothing, permanently
 * `"loading"` is the INITIAL value and is re-entered whenever `uid` changes, so
 * the card can only ever appear AFTER a completed read that returned zero rows.
 * Pinned by "does not render during hydration" in FirstSession.test.tsx.
 *
 * ── HONESTY ───────────────────────────────────────────────────────────────
 * Nothing here is invented: no progress, no counts, no streaks. The card states
 * what the student can do and what that action will produce. It renders only for
 * a signed-in uid — a signed-out /browse visitor keeps the existing surface.
 *
 * ── LAYOUT PROVENANCE ─────────────────────────────────────────────────────
 * `LazyTopper_OneDoor_auth_prototype.html`, "First session" stage: navy gradient
 * card (`.startcard`), green uppercase kicker, green CTA. The navy is Home's own
 * `hsl(222,47%,24%) → hsl(222,47%,16%)` (the MI card spine and its CTA) and the
 * green is Home's accent, so this card is new copy in EXISTING Home grammar.
 *
 * Two deliberate deviations from the prototype, both because the live Home is
 * not the mock:
 *   1. The kicker is "First session", not the prototype's "Start here" — the
 *      live Home already owns a "Start here" section label immediately below
 *      this card, and two of them stutter.
 *   2. The prototype's two mini-cards ("Exam Trends" / "Practice") are folded
 *      into ONE sentence with inline links instead of two tiles. The prototype
 *      had no hero row; the live Home renders BOTH of those destinations as
 *      hero cards directly beneath this card. Shipping tiles here would
 *      reproduce the duplicated-destination defect the Home redesign removed.
 *      The sentence keeps what the tiles actually carried — that these two work
 *      on day one, with no history.
 *
 * ── NAME PROMPT: NOT HERE ─────────────────────────────────────────────────
 * The prototype's "What should I call you?" card is deliberately absent. Saving
 * a name means writing `displayName`, and `AuthContextType` exposes NO write
 * path for it: the sole `updateProfile` call in product code lives inside
 * `signUpWithEmailPassword`. Adding one would add a context key — which
 * `AuthContext.passwordReset.test.tsx` pins by EXACT EQUALITY, and which ~20
 * `vi.mock` factories would then omit (a mock factory is a complete
 * replacement; an omitted export throws). See the report for [FU-AUTH-NAME-PROMPT].
 */

/** Source attribution — the same literal both Home pages already append. */
const HOME_QS = "source=home&returnTo=%2F";
const CHECK_TO = `/check-improve?${HOME_QS}`;
const TRENDS_TO = `/exam-trends?${HOME_QS}`;
const PRACTICE_TO = `/practice-hub?${HOME_QS}`;

/**
 * Tri-state. `"loading"` exists so an incomplete read is never mistaken for an
 * empty one — see the hydration note above.
 */
type ActivityState = "loading" | "none" | "some";

const FIRST_SESSION_CSS = `
  .lt-first {
    background: linear-gradient(160deg, hsl(222,47%,24%) 0%, hsl(222,47%,16%) 100%);
    color: #fff; border-radius: 15px; padding: 23px 25px;
    min-width: 0; max-width: 100%; box-sizing: border-box;
    box-shadow: 0 6px 18px -10px hsla(222, 47%, 20%, 0.55);
  }
  .lt-first--spaced { margin-top: 13px; }
  .lt-first .lt-first-k {
    font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase;
    color: hsl(152, 55%, 60%); font-weight: 700; margin: 0 0 8px;
  }
  .lt-first .lt-first-h {
    font-family: 'Fraunces', Georgia, serif; font-size: 23px; line-height: 1.2;
    font-weight: 600; margin: 0 0 9px; color: #fff;
  }
  .lt-first .lt-first-p {
    font-size: 13.5px; color: rgba(255,255,255,0.78); margin: 0 0 16px;
    line-height: 1.55; max-width: 46ch;
  }
  .lt-first .lt-first-cta {
    display: inline-flex; align-items: center; gap: 7px;
    background: hsl(152, 55%, 45%); color: #fff; text-decoration: none;
    border-radius: 10px; padding: 11px 19px; font-size: 14px; font-weight: 700;
  }
  .lt-first .lt-first-cta:hover { background: hsl(152, 57%, 40%); }
  .lt-first .lt-first-day1 {
    font-size: 12.5px; line-height: 1.55; margin: 15px 0 0;
    padding-top: 13px; border-top: 1px solid rgba(255,255,255,0.16);
    color: rgba(255,255,255,0.72);
  }
  .lt-first .lt-first-day1 a {
    color: hsl(152, 55%, 68%); font-weight: 700; text-decoration: none;
    border-bottom: 1px solid hsla(152, 55%, 68%, 0.45);
  }
  /* 390px: the CTA must not sit on one line with a 23px display heading in a
     25px gutter. Tighten the box and let the CTA fill the width. */
  @media (max-width: 480px) {
    .lt-first { padding: 19px 17px; border-radius: 14px; }
    .lt-first .lt-first-h { font-size: 19.5px; }
    .lt-first .lt-first-p { font-size: 13px; margin-bottom: 14px; }
    .lt-first .lt-first-cta {
      display: flex; justify-content: center; width: 100%;
      box-sizing: border-box; font-size: 13.5px;
    }
    .lt-first .lt-first-day1 { font-size: 12px; }
  }
`;

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export interface FirstSessionProps {
  /** The signed-in account uid. Falsy → the component renders null. */
  uid?: string | null;
  /** Adds this surface's own top rhythm. A PROP, not a wrapper div: an
   *  always-rendered wrapper would push the page down even when this renders
   *  null, which is the usual case. Mirrors `LinkPhoneNudge`. */
  spaced?: boolean;
}

export default function FirstSession({ uid, spaced = false }: FirstSessionProps) {
  const [activity, setActivity] = useState<ActivityState>("loading");

  useEffect(() => {
    // Re-enter "loading" on every uid change, so a sign-in / account switch can
    // never inherit the previous account's verdict.
    setActivity("loading");
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const records = await getSessionRecordsFromCloud(uid);
        if (cancelled) return;
        setActivity(Array.isArray(records) && records.length > 0 ? "some" : "none");
      } catch {
        // Honest-degrade: an unreadable history is NOT evidence of a first
        // session. Stay silent rather than greet a returning student as new.
        if (!cancelled) setActivity("some");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (!uid) return null;
  if (activity !== "none") return null;

  return (
    /* The <style> is a SIBLING of the card, not a child: as a child its CSS text
       lands in the card's own `textContent`, which makes any copy assertion over
       the card (e.g. "invents no percentages") read the stylesheet's `55%` and
       go falsely red. Caught by that test. */
    <>
      <style>{FIRST_SESSION_CSS}</style>
      <section
        className={spaced ? "lt-first lt-first--spaced" : "lt-first"}
        data-testid="first-session-card"
      >
        <p className="lt-first-k">First session</p>
        <h2 className="lt-first-h">
          Check one answer, and I&apos;ll know where you&apos;re losing marks.
        </h2>
        <p className="lt-first-p">
          Pick a chapter you&apos;re working on, solve one question on paper, and
          photograph it. That single check is what builds everything else on this
          page.
        </p>
        <Link className="lt-first-cta" to={CHECK_TO} data-testid="first-session-cta">
          Check my first answer <ArrowRight />
        </Link>
        <p className="lt-first-day1" data-testid="first-session-day-one">
          Nothing here is locked until then —{" "}
          <Link to={TRENDS_TO} data-testid="first-session-trends">
            Exam Trends
          </Link>{" "}
          and{" "}
          <Link to={PRACTICE_TO} data-testid="first-session-practice">
            Practice
          </Link>{" "}
          both work right now, with no history needed.
        </p>
      </section>
    </>
  );
}
