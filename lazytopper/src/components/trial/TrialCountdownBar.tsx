import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { trackTrialBannerClick, trackTrialBannerShown } from "../../analytics/analytics";
import { boardPassOffer, boardPassShortLine } from "../pricing/boardPassOffer";
import { TRIAL_BANNER_FIRST_DAY, TRIAL_BAR_FIRST_DAY, istDayKeyOf, trialBannerTiming } from "./trialEndBannerModel";

/**
 * TrialCountdownBar — ASK-FIX-1. ONE line, from trial day 4 to the end, on every main page:
 * "3 days left of your free week · Board Pass ₹… till boards". Tappable to /pricing, dismissible
 * for the rest of the IST day. Only the real days-left count - no ticking timer, no seat count.
 *
 * WHY THE OLD BANNER REACHED 8 STUDENTS. TrialEndBanner (the richer Home strip) is mounted only on
 * Home, starts on day 5, and renders nothing until a cloud read of the student's session records
 * has returned. This bar needs only the reconciled subscription (hydrated), so a slow or failed
 * read can never hide it, and it is mounted in the app-wide trial slot (ux/TrialBanner).
 *
 * The localStorage key is DISMISSAL state only ("hidden on IST day X") - never trial or premium
 * state (CLAUDE.md §7). It is its own key, so hiding this bar does not hide the Home strip.
 */
export const TRIAL_BAR_HIDDEN_KEY_PREFIX = "lazytopper.trialCountdownBarHidden.";

function readHidden(uid: string): string | null {
  try {
    return window.localStorage.getItem(TRIAL_BAR_HIDDEN_KEY_PREFIX + uid);
  } catch {
    return null;
  }
}

function writeHidden(uid: string, dayKey: string): void {
  try {
    window.localStorage.setItem(TRIAL_BAR_HIDDEN_KEY_PREFIX + uid, dayKey);
  } catch {
    /* storage unavailable: hidden for this visit only */
  }
}

/** The bar's words, from the real days left. */
export function trialCountdownText(daysLeft: number, planLine: string): string {
  const head =
    daysLeft <= 0 ? "Last day of your free week" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left of your free week`;
  return `${head} · ${planLine}`;
}

/**
 * Routes where the bar stays quiet: from trial day 5 Home shows the richer strip instead (day 4
 * has no Home strip, so the bar shows there), and /pricing is the offer itself.
 */
export function trialCountdownRouteAllowed(pathname: string, dayOfTrial: number): boolean {
  if ((pathname === "/" || pathname === "/browse") && dayOfTrial >= TRIAL_BANNER_FIRST_DAY) return false;
  return !["/pricing", "/login", "/welcome", "/admin"].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const BAR_CSS = `
.lt-tcb {
  display: flex; align-items: center; gap: 4px; min-width: 0;
  background: hsl(214, 60%, 19%); color: #eaf2fb;
}
.lt-tcb__link {
  flex: 1 1 auto; min-width: 0; min-height: 44px; box-sizing: border-box;
  display: flex; align-items: center; padding: 6px 8px 6px 14px;
  color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; line-height: 1.35;
}
.lt-tcb__go { margin-left: 6px; color: hsl(152, 60%, 62%); white-space: nowrap; }
.lt-tcb__close {
  flex: 0 0 auto; min-width: 44px; min-height: 44px; padding: 0 12px;
  border: none; background: transparent; color: #b9d0e8; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.lt-tcb__link:focus-visible, .lt-tcb__close:focus-visible { outline: 2px solid hsl(152, 55%, 55%); outline-offset: -2px; }
`;

export default function TrialCountdownBar() {
  const { user } = useAuth();
  const sub = useSubscription();
  const { pathname } = useLocation();
  const uid = user && !user.isLocalSession ? user.uid : null;
  const eligible = Boolean(uid) && sub.hydrated && sub.isTrialActive && sub.status?.tier === "trial";
  const nowMs = eligible ? Date.now() : 0;
  const timing = eligible ? trialBannerTiming(sub.status?.trialStartDate, nowMs, TRIAL_BAR_FIRST_DAY) : null;
  const dayKey = timing ? istDayKeyOf(nowMs) : "";
  const [hiddenDay, setHiddenDay] = useState<string | null>(() => (uid ? readHidden(uid) : null));

  useEffect(() => {
    setHiddenDay(uid ? readHidden(uid) : null);
  }, [uid]);

  const visible = Boolean(uid && timing && hiddenDay !== dayKey && trialCountdownRouteAllowed(pathname, timing.dayOfTrial));
  useEffect(() => {
    if (visible && dayKey) trackTrialBannerShown(dayKey);
  }, [visible, dayKey]);

  if (!visible || !timing || !uid) return null;
  const text = trialCountdownText(timing.daysLeft, boardPassShortLine(boardPassOffer(new Date(nowMs))));

  return (
    <div className="lt-tcb" data-testid="trial-countdown-bar" role="region" aria-label="Your free week">
      <style>{BAR_CSS}</style>
      <Link to="/pricing?source=trial-bar" className="lt-tcb__link" onClick={() => trackTrialBannerClick("plans")}>
        <span>{text}</span>
        <span className="lt-tcb__go" aria-hidden="true">→</span>
      </Link>
      <button
        type="button"
        className="lt-tcb__close"
        onClick={() => {
          writeHidden(uid, dayKey);
          setHiddenDay(dayKey);
        }}
      >
        Not today
      </button>
    </div>
  );
}
