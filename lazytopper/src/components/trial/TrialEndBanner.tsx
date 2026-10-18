import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { getSessionRecordsFromCloud } from "../../services/sessionRecords";
import { trackTrialBannerClick, trackTrialBannerShown } from "../../analytics/analytics";
import {
  TRIAL_BANNER_AFTER_COPY,
  countTrialActivity,
  istDayKeyOf,
  trialActivityLine,
  trialBannerHeadline,
  trialBannerTiming,
  type TrialActivityCounts,
  type TrialBannerTiming,
} from "./trialEndBannerModel";

/**
 * TrialEndBanner — TRIAL-END-1 (owner ruling 18 Oct 2026). The calm, dismissible Home strip
 * a signed-in student on an ACTIVE trial sees on trial days 5, 6 and 7 (and the final morning):
 * when the trial really ends, what they actually did during it, and "See plans".
 *
 * Split like StartHere (`useStartHere` + `StartHereView`): the PAGE calls the hook, so it can
 * tell whether the strip is up and keep Home to two stacked strips (HOME-PENDING-1), and passes
 * the model to the view. Every rule that decides WHAT it says lives in ./trialEndBannerModel.ts.
 *
 * ★ Shown only off the RECONCILED subscription (`hydrated`): a stale or hand-edited cache can
 * never raise it. Premium, expired, free, signed-out and local sessions see nothing. Nothing
 * here starts, extends or writes a trial.
 *
 * ★ The localStorage key below is DISMISSAL state only ("hidden on IST day X") — never trial or
 * premium state (CLAUDE.md §7). Dismissing hides the strip until the next IST day.
 */

/** localStorage: the IST day key on which this uid last hid the banner. */
export const TRIAL_BANNER_HIDDEN_KEY_PREFIX = "lazytopper.trialEndBannerHidden.";

export function readHiddenDay(uid: string): string | null {
  try {
    return window.localStorage.getItem(TRIAL_BANNER_HIDDEN_KEY_PREFIX + uid);
  } catch {
    return null;
  }
}

export function writeHiddenDay(uid: string, dayKey: string): void {
  try {
    window.localStorage.setItem(TRIAL_BANNER_HIDDEN_KEY_PREFIX + uid, dayKey);
  } catch {
    /* storage unavailable: hidden for this visit only */
  }
}

export interface TrialEndBannerModel {
  timing: TrialBannerTiming;
  counts: TrialActivityCounts;
  dayKey: string;
  dismiss: () => void;
}

/**
 * The banner's model, or null when it must say nothing. Reads the clock once per render; the
 * activity counts come from the same session records Me and the history pages read
 * (cross-device, degrading to this device's copy on a cloud error).
 */
export function useTrialEndBanner(): TrialEndBannerModel | null {
  const { user } = useAuth();
  const sub = useSubscription();
  const uid = user && !user.isLocalSession ? user.uid : null;
  const eligible = Boolean(uid) && sub.hydrated && sub.isTrialActive && sub.status.tier === "trial";
  // The clock is read only for an active trial: every other Home render stays clock-free.
  const nowMs = eligible ? Date.now() : 0;
  const timing = eligible ? trialBannerTiming(sub.status.trialStartDate, nowMs) : null;
  const dayKey = timing ? istDayKeyOf(nowMs) : "";
  const startMs = timing ? timing.startMs : null;

  const [hiddenDay, setHiddenDay] = useState<string | null>(() => (uid ? readHiddenDay(uid) : null));
  const [counts, setCounts] = useState<{ uid: string; counts: TrialActivityCounts } | null>(null);

  useEffect(() => {
    setHiddenDay(uid ? readHiddenDay(uid) : null);
  }, [uid]);

  useEffect(() => {
    if (!uid || startMs === null) return;
    let cancelled = false;
    getSessionRecordsFromCloud(uid)
      .then((records) => {
        if (!cancelled) setCounts({ uid, counts: countTrialActivity(records, startMs) });
      })
      .catch(() => {
        // Never throws by contract; if it ever did, say nothing rather than invent a zero.
      });
    return () => {
      cancelled = true;
    };
  }, [uid, startMs]);

  if (!uid || !timing || hiddenDay === dayKey) return null;
  if (!counts || counts.uid !== uid) return null;

  return {
    timing,
    counts: counts.counts,
    dayKey,
    dismiss: () => {
      writeHiddenDay(uid, dayKey);
      setHiddenDay(dayKey);
    },
  };
}

const BANNER_CSS = `
.lt-trial-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 8px 12px 14px;
  border-radius: 14px;
  background: hsl(214, 60%, 19%);
  color: #eaf2fb;
  min-width: 0;
}
.lt-trial-banner--spaced { margin-bottom: 13px; }
.lt-trial-banner__body { flex: 1 1 auto; min-width: 0; }
.lt-trial-banner__headline {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  color: #ffffff;
}
.lt-trial-banner__line {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: #cfe0f2;
}
.lt-trial-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.lt-trial-banner__cta {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}
.lt-trial-banner__cta--primary { background: hsl(152, 55%, 42%); color: #ffffff; }
.lt-trial-banner__cta--secondary { background: hsla(0, 0%, 100%, 0.1); color: #ffffff; }
.lt-trial-banner__cta:focus-visible,
.lt-trial-banner__close:focus-visible {
  outline: 2px solid hsl(152, 55%, 55%);
  outline-offset: 2px;
}
.lt-trial-banner__close {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #b9d0e8;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.lt-trial-banner__close:hover { background: hsla(0, 0%, 100%, 0.08); color: #ffffff; }
`;

export function TrialEndBannerView({ model, spaced = false }: { model: TrialEndBannerModel | null; spaced?: boolean }) {
  const dayKey = model?.dayKey ?? "";
  useEffect(() => {
    if (dayKey) trackTrialBannerShown(dayKey);
  }, [dayKey]);

  if (!model) return null;
  const activity = trialActivityLine(model.counts);

  return (
    <section
      className={`lt-trial-banner${spaced ? " lt-trial-banner--spaced" : ""}`}
      aria-label="Your trial"
      data-testid="trial-end-banner"
    >
      <style>{BANNER_CSS}</style>
      <div className="lt-trial-banner__body">
        <p className="lt-trial-banner__headline" data-testid="trial-end-banner-headline">
          {trialBannerHeadline(model.timing)}
        </p>
        <p className="lt-trial-banner__line" data-testid="trial-end-banner-activity">
          {activity.text}
        </p>
        <p className="lt-trial-banner__line">{TRIAL_BANNER_AFTER_COPY}</p>
        <div className="lt-trial-banner__actions">
          {activity.zero ? (
            <Link
              to="/check-improve"
              className="lt-trial-banner__cta lt-trial-banner__cta--primary"
              onClick={() => trackTrialBannerClick("check")}
            >
              Check an answer
            </Link>
          ) : null}
          <Link
            to="/pricing"
            className={`lt-trial-banner__cta ${activity.zero ? "lt-trial-banner__cta--secondary" : "lt-trial-banner__cta--primary"}`}
            onClick={() => trackTrialBannerClick("plans")}
          >
            See plans
          </Link>
        </div>
      </div>
      <button
        type="button"
        className="lt-trial-banner__close"
        aria-label="Hide until tomorrow"
        onClick={model.dismiss}
      >
        Not today
      </button>
    </section>
  );
}
