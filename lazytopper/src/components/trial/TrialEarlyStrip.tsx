import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import { trackPaywallAction, type PaywallSurface } from "../../analytics/analytics";
import { isPaymentsClientEnabled } from "../../services/checkout";
import PaywallActions, { PAY_LABEL } from "../pricing/PaywallActions";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { trialAskRouteAllowed } from "./trialAskRoutes";
import { istDayKeyOf } from "./trialEndBannerModel";
import { trialEarlyStripDay, trialEarlyStripDayText, trialEarlyStripOfferText } from "./trialEarlyStripModel";
import "./trialEarlyStrip.css";

/**
 * TrialEarlyStrip - TRIAL-SELL-1. DESKTOP ONLY, trial days 1-3 (IST): one slim line
 * "Trial: day N of 7 · Board Pass ₹… till your boards (founding offer till …)" with "Pay"
 * (straight to the Board Pass checkout) and "Ask a parent to pay" (the existing parent-pay link,
 * minted on tap). Phones keep their own strip (ux/TrialBanner); day 4 on, TrialCountdownBar speaks.
 *
 * Mounted inside the existing trial slot (TrialAskInner, a LAZY chunk - PERF-3), so neither App.tsx
 * nor DesktopShell.tsx changed. Hidden for paid Premium (tier must be "trial"), on the offer / auth /
 * full-screen routes (trialAskRoutes), and for the rest of the IST day once dismissed.
 *
 * The localStorage key is DISMISSAL state only ("hidden on IST day X") - never trial or premium
 * state (CLAUDE.md §7).
 */
export const TRIAL_STRIP_HIDDEN_KEY_PREFIX = "lazytopper.trialEarlyStripHidden.";

/** The analytics surface for this strip's Pay / Ask taps (its own, so they are never counted as another surface). */
export const TRIAL_STRIP_SURFACE: PaywallSurface = "trial_strip";

function readHidden(uid: string): string | null {
  try {
    return window.localStorage.getItem(TRIAL_STRIP_HIDDEN_KEY_PREFIX + uid);
  } catch {
    return null;
  }
}

function writeHidden(uid: string, dayKey: string): void {
  try {
    window.localStorage.setItem(TRIAL_STRIP_HIDDEN_KEY_PREFIX + uid, dayKey);
  } catch {
    /* storage unavailable: hidden for this visit only */
  }
}

export default function TrialEarlyStrip() {
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const sub = useSubscription();
  const { pathname } = useLocation();
  const uid = user && !user.isLocalSession ? user.uid : null;
  const eligible = isDesktop && Boolean(uid) && sub.hydrated && sub.isTrialActive && sub.status?.tier === "trial";
  const nowMs = eligible ? Date.now() : 0;
  const day = eligible ? trialEarlyStripDay(sub.status?.trialStartDate, nowMs) : null;
  const dayKey = day ? istDayKeyOf(nowMs) : "";
  const [hiddenDay, setHiddenDay] = useState<string | null>(() => (uid ? readHidden(uid) : null));

  useEffect(() => {
    setHiddenDay(uid ? readHidden(uid) : null);
  }, [uid]);

  if (!uid || !day || hiddenDay === dayKey || !trialAskRouteAllowed(pathname)) return null;
  const payTo = isPaymentsClientEnabled() ? BOARD_PASS_BUY_PATH : "/pricing";

  return (
    <div className="lt-tes" data-testid="trial-early-strip" role="region" aria-label="Your free trial">
      <p className="lt-tes__text">
        <span>{trialEarlyStripDayText(day)}</span>
        <span className="lt-tes__sep" aria-hidden="true">
          ·
        </span>
        <span>{trialEarlyStripOfferText(nowMs)}</span>
      </p>
      <div className="lt-tes__actions">
        <Link
          to={payTo}
          className="lt-tes__pay"
          data-testid="trial-early-strip-pay"
          onClick={() => trackPaywallAction("pay", TRIAL_STRIP_SURFACE)}
        >
          {PAY_LABEL}
        </Link>
        <div className="lt-tes__ask">
          <PaywallActions surface={TRIAL_STRIP_SURFACE} askOnly />
        </div>
      </div>
      <button
        type="button"
        className="lt-tes__close"
        data-testid="trial-early-strip-close"
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
