import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { trackTrialBannerClick, trackTrialBannerShown } from "../../analytics/analytics";
import { premiumOffer, premiumShortLine } from "../pricing/boardPassOffer";
// BUY-PATH-1: the bar names the Board Pass and its price, so with payments on a tap opens that checkout (one tap), not plain /pricing.
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { isPaymentsClientEnabled } from "../../services/checkout";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { notePaidLanding, trialAskRouteAllowed } from "./trialAskRoutes";
import { LEGACY_TRIAL_DAYS } from "../../services/subscriptionService";
import { istDayKeyOf, trialBannerFirstDay, trialBannerTiming } from "./trialEndBannerModel";

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
    daysLeft <= 0 ? "Last day of your free trial" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left of your free trial`;
  return `${head} · ${planLine}`;
}

/**
 * Routes where the bar stays quiet: from the banner's first day (5 on a 7-day trial, 3 on a 3-day one) Home shows the richer strip instead (the day before has no Home strip, so the bar shows there), and /pricing is the offer itself.
 */
export function trialCountdownRouteAllowed(pathname: string, dayOfTrial: number, trialDays: number = LEGACY_TRIAL_DAYS): boolean {
  if ((pathname === "/" || pathname === "/browse") && dayOfTrial >= trialBannerFirstDay(trialDays)) return false;
  return trialAskRouteAllowed(pathname);
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
  const { pathname, search } = useLocation();
  notePaidLanding(search); // SELF-PAY-LAND-1
  const uid = user && !user.isLocalSession ? user.uid : null;
  const eligible = Boolean(uid) && sub.hydrated && sub.isTrialActive && sub.status?.tier === "trial";
  const nowMs = eligible ? Date.now() : 0;
  const timing = eligible ? trialBannerTiming(sub.status?.trialStartDate, nowMs, "bar") : null;
  const dayKey = timing ? istDayKeyOf(nowMs) : "";
  const [hiddenDay, setHiddenDay] = useState<string | null>(() => (uid ? readHidden(uid) : null));

  useEffect(() => {
    setHiddenDay(uid ? readHidden(uid) : null);
  }, [uid]);

  const visible = Boolean(uid && timing && hiddenDay !== dayKey && trialCountdownRouteAllowed(pathname, timing.dayOfTrial, timing.trialDays));
  useEffect(() => {
    if (visible && dayKey) trackTrialBannerShown(dayKey);
  }, [visible, dayKey]);

  if (!visible || !timing || !uid) return null;
  const text = trialCountdownText(timing.daysLeft, premiumShortLine(premiumOffer(new Date(nowMs), predictCbseExamDate("10"))));

  return (
    <div className="lt-tcb" data-testid="trial-countdown-bar" role="region" aria-label="Your free trial">
      <style>{BAR_CSS}</style>
      <Link to={isPaymentsClientEnabled() ? `${BOARD_PASS_BUY_PATH}&source=trial-bar` : "/pricing?source=trial-bar"} className="lt-tcb__link" onClick={() => trackTrialBannerClick("plans")}>
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
