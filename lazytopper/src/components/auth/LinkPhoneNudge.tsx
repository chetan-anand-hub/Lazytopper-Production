import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPhoneLinked } from "../../lib/signInMethods";
import LinkSignInMethodModal from "./LinkSignInMethodModal";

/**
 * LinkPhoneNudge — the one-time, dismissible prompt asking a returning student
 * to add a phone number as a second way to sign in. Opens F1's
 * `LinkSignInMethodModal`.
 *
 * WHY IT EXISTS, AND WHY IT FIRES ON THE SECOND SESSION RATHER THAN THE FIRST
 * Firebase issues a SEPARATE uid per sign-in method, so a student who signs up
 * with Google on a laptop and later taps "Phone" on their handset creates a
 * second, empty account. The split happens at SECOND-DEVICE FIRST-USE, which is
 * why waiting for meaningful progress is too late — and why prompting during
 * sign-up is too early, stacking another ask onto an onboarding that already
 * gained a required name field.
 *
 * ★ THIS IS ABOUT ACCESS, NOT PROGRESS — DELIBERATELY. "So your progress
 * follows you" is false at low activity and a student will feel it. "Sign in
 * either way" is true from the first second. Owner-approved copy; do not revert
 * to progress framing.
 *
 * ★ LINKING IS OPTIONAL. Nothing here gates a feature, blocks a route or
 * interrupts a session, and no copy implies an account is incomplete without a
 * number. "Not now" is a real answer and it is permanent for this browser.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ★★ THE RETURNING-SESSION SIGNAL IS NEW, AND IT IS NEW ON PURPOSE.
 *
 * The product had NO returning-visit signal when this was built. All three
 * candidates were verified dead before adding one:
 *
 *   1. `landingMemory.hasProfile` — reads the BARE keys "lazytopper.profile.v2"
 *      / "lazytopper.profile", which nothing writes; `studentCloudStore` only
 *      ever writes the uid-suffixed "lazytopper.profile.v2:<uid>". It is
 *      permanently false. (Same dead-key defect already cured in `Login.tsx`
 *      and closed as [FU-LOGIN-HASPROFILE-DEAD-KEY]; it survives in
 *      landingMemory → [FU-LANDINGMEMORY-HASPROFILE-DEAD-KEY].)
 *   2. `lazytopper.firstVisitOverlayShown` — a genuine first-visit marker, but
 *      its only writer is `pages/Dashboard.tsx`, and `/dashboard` is severed.
 *      Never written in the live product.
 *   3. `lazytopper.studySessions` — what `ShareProgressPrompt` reads. This is
 *      an ACTIVITY signal, explicitly NOT the condition: it stays silent for a
 *      returning student who has not practised yet, and fires in session one
 *      for a student who has.
 *
 * Firebase's `metadata.lastSignInTime` was rejected too: sessions persist
 * indefinitely, so a student who signs up and never signs out keeps
 * `lastSignInTime === creationTime` forever and the nudge would NEVER fire —
 * a silent never-fires, the exact failure class this codebase keeps naming.
 *
 * So the signal is counted here, per browser:
 *   · `lazytopper.homeVisits.v1`        (localStorage)  — distinct sessions
 *   · `lazytopper.homeVisit.counted.v1` (sessionStorage) — counted-this-session
 *
 * ★ THE sessionStorage FLAG IS LOAD-BEARING, NOT AN OPTIMISATION. Without it
 * the count increments on EVERY Home mount — a first-session student who
 * navigates Home → Practice → Home reaches 2 and is nudged in the session they
 * signed up. sessionStorage is cleared by the browser when the tab session
 * ends, which is precisely the "came back" boundary we want, and it needs no
 * arbitrary time threshold. Mutation-covered by
 * "does not count twice within one browser session".
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Mechanism mirrors `ShareProgressPrompt`'s isDismissed/dismiss localStorage
 * pattern under the `lazytopper.*` convention. The COMPONENT is deliberately
 * not reused — it renders only in an unrouted page and is effectively dead.
 *
 * A MODAL, NOT A ROUTE: App.tsx is frozen to zero-diff by the overlay
 * acceptance gates, so this mounts from the two Home pages instead.
 */

/** Distinct browser sessions in which Home has been opened while signed in. */
export const VISIT_COUNT_KEY = "lazytopper.homeVisits.v1";
/** Per-tab-session flag: this session has already been counted. */
export const VISIT_SESSION_KEY = "lazytopper.homeVisit.counted.v1";
/** Permanent per-browser dismissal. */
export const NUDGE_DISMISSED_KEY = "lazytopper.linkPhoneNudge.dismissed";

/** Sessions required before the nudge may appear. 2 ⇒ "has returned once". */
export const RETURNING_SESSION_THRESHOLD = 2;

function readVisitCount(): number {
  try {
    const raw = window.localStorage.getItem(VISIT_COUNT_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

/**
 * Count this browser session once, and return the resulting session count.
 *
 * Idempotent WITHIN a session by design — see the sessionStorage note above.
 * Defensive against disabled/full storage: on any throw the caller simply gets
 * 0 and the nudge stays hidden, which is the safe direction (a student is never
 * nudged because storage misbehaved).
 */
export function recordHomeVisit(): number {
  try {
    const already = window.sessionStorage.getItem(VISIT_SESSION_KEY);
    const count = readVisitCount();
    if (already) return count;
    window.sessionStorage.setItem(VISIT_SESSION_KEY, "1");
    const next = count + 1;
    window.localStorage.setItem(VISIT_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function isNudgeDismissed(): boolean {
  try {
    return window.localStorage.getItem(NUDGE_DISMISSED_KEY) !== null;
  } catch {
    return false;
  }
}

export function dismissNudge(): void {
  try {
    window.localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
  } catch {
    // ignore quota / access errors — worst case the nudge reappears
  }
}

const NUDGE_CSS = `
.lt-linknudge {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid hsla(152, 55%, 45%, 0.30);
  background: hsla(152, 55%, 45%, 0.06);
  min-width: 0;
}
.lt-linknudge__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow: 0 3px 9px rgba(20, 120, 70, 0.15);
}
.lt-linknudge__icon svg {
  width: 20px;
  height: 20px;
  stroke: hsl(152, 45%, 30%);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}
/* MobileHome lays its sections out with per-element margins rather than a
   flex gap, so it opts in to its own 13px rhythm. DesktopHome does NOT — its
   column already supplies gap: 24. */
.lt-linknudge--spaced { margin-top: 13px; }
.lt-linknudge__body { flex: 1 1 220px; min-width: 0; }
.lt-linknudge__title {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: hsl(222, 47%, 20%);
  line-height: 1.25;
}
.lt-linknudge__sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: hsl(220, 15%, 40%);
  line-height: 1.4;
}
.lt-linknudge__actions { display: flex; gap: 8px; flex: 0 0 auto; flex-wrap: wrap; }
.lt-linknudge__cta,
.lt-linknudge__later {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.lt-linknudge__cta {
  border: none;
  background: hsl(152, 45%, 32%);
  color: #fff;
}
.lt-linknudge__cta:hover { background: hsl(152, 45%, 27%); }
.lt-linknudge__later {
  border: 1px solid hsla(222, 30%, 40%, 0.25);
  background: transparent;
  color: hsl(220, 15%, 40%);
}
.lt-linknudge__later:hover { background: hsla(222, 30%, 40%, 0.06); }
@media (max-width: 520px) {
  .lt-linknudge__actions { width: 100%; }
  .lt-linknudge__cta, .lt-linknudge__later { flex: 1 1 auto; }
}
`;

export default function LinkPhoneNudge({ spaced = false }: { spaced?: boolean } = {}) {
  const { user } = useAuth();
  // A local dev session is not a real account — it has no Firebase credential
  // to link a number to, so nudging it would offer something that cannot work.
  const eligibleAccount = !!user && !user.isLocalSession;

  const [visits, setVisits] = useState(0);
  const [dismissed, setDismissed] = useState<boolean>(() => isNudgeDismissed());
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!eligibleAccount) return;
    setVisits(recordHomeVisit());
  }, [eligibleAccount]);

  // ★ Keyed off `providerIds` via `hasPhoneLinked`, NEVER `user.phoneNumber`:
  // a Google account can carry a phoneNumber with no phone CREDENTIAL linked,
  // and a phone account can carry an email. This is also what makes a linked
  // student safe on every device — the check is server-truth, not the local
  // dismissal flag.
  const showNudge =
    eligibleAccount &&
    !hasPhoneLinked(user) &&
    !dismissed &&
    visits >= RETURNING_SESSION_THRESHOLD;

  // ★ The modal's lifetime is deliberately NOT tied to `showNudge`. A successful
  // link flips `providerIds`, which makes `showNudge` false — if the modal were
  // nested under that condition it would vanish mid-success and the student
  // would never see the confirmation they just earned.
  if (!showNudge && !modalOpen) return null;

  return (
    <>
      {showNudge && (
        <section
          className={spaced ? "lt-linknudge lt-linknudge--spaced" : "lt-linknudge"}
          data-testid="link-phone-nudge"
        >
          <style>{NUDGE_CSS}</style>
          <span className="lt-linknudge__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
              <path d="M11 18.5h2" />
            </svg>
          </span>
          <div className="lt-linknudge__body">
            <p className="lt-linknudge__title">Studying on your phone too?</p>
            {/* AUTH-2-FU §5 — the card copy the owner ruled: say what linking
                BUYS (one account either way), not merely what it does.
                ★ ONE WORD DEVIATION, DECLARED. The ruling's literal sentence
                ended "— same account, same progress." Lane F left a live guard
                in this file's tests forbidding the word "progress" here at all,
                because "your progress follows you" is a claim this card cannot
                honestly make to a student who has barely any. The substitute
                phrase is not invented: it is the owner's OWN wording from the
                modal sentence in the SAME §5 ruling ("with everything you've
                done"). Reverting to the literal sentence means deleting that
                guard, which is a doctrine change, not a copy change. */}
            <p className="lt-linknudge__sub">
              Add your number and either one signs you in — same account,
              everything you've done.
            </p>
          </div>
          <div className="lt-linknudge__actions">
            <button
              type="button"
              className="lt-linknudge__cta"
              data-testid="link-phone-nudge-cta"
              onClick={() => setModalOpen(true)}
            >
              Add my number
            </button>
            <button
              type="button"
              className="lt-linknudge__later"
              data-testid="link-phone-nudge-dismiss"
              onClick={() => {
                dismissNudge();
                setDismissed(true);
              }}
            >
              Not now
            </button>
          </div>
        </section>
      )}
      <LinkSignInMethodModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
