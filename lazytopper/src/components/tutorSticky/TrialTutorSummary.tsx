import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { trackTutorSticky } from "../../analytics/analytics";
import { getTutorTurnsFromCloud } from "../../services/tutorSessionStore";
import { boardPassDeadlineLine } from "../../config/pricing";
import { boardPassCtaLabel, boardPassPriceNow } from "../pricing/boardPassOffer";
import PaywallActions from "../pricing/PaywallActions";
import { istDayKeyOf } from "../trial/trialEndBannerModel";
import {
  TRIAL_SUMMARY_HIDDEN_PREFIX,
  countTutorHelp,
  trialSummaryTiming,
  tutorHelpLine,
  type TutorTrialCounts,
} from "../../lib/tutorSticky/trialSummary";
import "./tutorSticky.css";

export const TRIAL_SUMMARY_PRICING_HREF = "/pricing?source=tutor-trial-summary";

function readHiddenDay(uid: string): string | null {
  try {
    return window.localStorage.getItem(TRIAL_SUMMARY_HIDDEN_PREFIX + uid);
  } catch {
    return null;
  }
}

function writeHiddenDay(uid: string, dayKey: string): void {
  try {
    window.localStorage.setItem(TRIAL_SUMMARY_HIDDEN_PREFIX + uid, dayKey);
  } catch {
    /* storage unavailable: hidden for this visit only */
  }
}

/**
 * TUTOR-STICKY-1 — the trial-ending tutor summary (Home, and the top of the tutor). For the last two days of
 * a trial and on the day it ends: what the tutor really did for this student, then the Board Pass offer and
 * "Forward link to parents" (the existing flow).
 *
 *  - N questions / M chapters are the student's own synced tutor doubts since the trial began. If there are
 *    none (or the read failed or is partial) the card renders NOTHING.
 *  - Shown only off the reconciled subscription, for an ACTIVE trial: a stale cache, a paid account, a Basic
 *    or expired one, or a signed-out visitor sees nothing. It never starts, extends or writes a trial.
 *  - The price lines come from config/pricing.ts: the Founding member offer and the real 1 December price, no
 *    crossed-out figure, no saving claim, no countdown. "Not today" hides it until the next IST day.
 */
export default function TrialTutorSummary({ surface }: { surface: "home" | "tutor" }) {
  const { user } = useAuth();
  const sub = useSubscription();
  const uid = user && !user.isLocalSession ? user.uid : null;
  const eligible = Boolean(uid) && sub.hydrated && sub.isTrialActive && sub.status.tier === "trial";
  const nowMs = eligible ? Date.now() : 0;
  const timing = eligible ? trialSummaryTiming(sub.status.trialStartDate, nowMs) : null;
  const dayKey = timing ? istDayKeyOf(nowMs) : "";
  const startMs = timing ? timing.startMs : null;

  const [hiddenDay, setHiddenDay] = useState<string | null>(() => (uid ? readHiddenDay(uid) : null));
  const [counts, setCounts] = useState<{ uid: string; value: TutorTrialCounts } | null>(null);

  useEffect(() => {
    setHiddenDay(uid ? readHiddenDay(uid) : null);
  }, [uid]);

  useEffect(() => {
    if (!uid || startMs === null) return;
    let live = true;
    getTutorTurnsFromCloud(uid, startMs)
      .then((r) => {
        // A partial read is never presented as a whole count.
        if (live && r.complete) setCounts({ uid, value: countTutorHelp(r.events) });
      })
      .catch(() => {
        /* say nothing rather than invent a number */
      });
    return () => {
      live = false;
    };
  }, [uid, startMs]);

  const value = counts && counts.uid === uid ? counts.value : null;
  const show = Boolean(uid && timing && value && value.questions > 0 && hiddenDay !== dayKey);
  useEffect(() => {
    if (show) trackTutorSticky("trial_summary_shown", { surface }, dayKey);
  }, [show, surface, dayKey]);

  if (!show || !uid || !value) return null;
  const price = boardPassPriceNow();
  const deadline = boardPassDeadlineLine();

  return (
    <section
      className={`lt-tsum lt-tsum--${surface}`}
      aria-label="What the tutor did for you"
      data-testid={`trial-tutor-summary-${surface}`}
    >
      <div className="lt-tsum__body">
        <p className="lt-tsum__h" data-testid="trial-tutor-summary-line">
          {tutorHelpLine(value)}
        </p>
        <p className="lt-tsum__line">
          Your Premium trial is ending. Keep the tutor with the Board Pass{price ? `: ${price} once, till your boards.` : ": pay once, till your boards."}
          {deadline ? ` ${deadline}` : ""}
        </p>
        <div className="lt-tsum__actions">
          <Link
            to={TRIAL_SUMMARY_PRICING_HREF}
            className="lt-tsum__cta"
            data-testid="trial-tutor-summary-plans"
            onClick={() => trackTutorSticky("trial_summary_tap", { surface, cta: "plans" })}
          >
            {boardPassCtaLabel(price)}
          </Link>
          <PaywallActions surface="tutor" askOnly onAsk={() => trackTutorSticky("trial_summary_tap", { surface, cta: "parent" })} />
        </div>
      </div>
      <button
        type="button"
        className="lt-tsum__close"
        onClick={() => {
          writeHiddenDay(uid, dayKey);
          setHiddenDay(dayKey);
        }}
      >
        Not today
      </button>
    </section>
  );
}
