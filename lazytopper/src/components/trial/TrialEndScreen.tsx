import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { getSessionRecordsFromCloud } from "../../services/sessionRecords";
import { trackPaywallAction, trackTrialEndScreen } from "../../analytics/analytics";
import { requestFeedbackPrompt } from "../feedback/feedbackPromptHost";
import PaywallActions from "../pricing/PaywallActions";
import { premiumOffer, type PremiumOffer } from "../pricing/boardPassOffer";
// BUY-PATH-1: "Pay" opens the Board Pass checkout in one tap; the payments-dark "See plans" link still browses /pricing.
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { safeSigninRedirect } from "../../services/freeCheckClient";
import { countTrialActivity, type TrialActivityCounts } from "./trialEndBannerModel";
import {
  markTrialEndScreenShownThisLoad,
  trialEndActivityLine,
  trialEndScreenKey,
  trialEndScreenSeen,
  writeTrialEndScreen,
} from "./trialEndScreenModel";

/**
 * TrialEndScreen — ASK-FIX-1. "Your free week is over": on the first visit after the 7-day trial
 * has ended, a full-screen sheet on a phone / a centred card on desktop, with what the student
 * really did, the month pass as the lead offer (CHECKOUT-1, 31 Oct 2026 - it was the Board Pass), the Board Pass second, Pay + "Send to parent
 * to pay" (PaywallActions) and "Continue with Basic". The why-not-upgrading feedback card follows
 * "Continue with Basic" - it no longer fires on its own first.
 *
 * Everything that decides WHETHER it shows is in ./trialEndScreenModel.ts. Reads trial state,
 * never writes it. Prices come from config/pricing.ts (../pricing/boardPassOffer.ts).
 */

/** How long we wait for the activity counts before showing the screen without that line. */
const COUNTS_WAIT_MS = 1500;

const PRICING_HREF = "/pricing?source=trial-end";

const SCREEN_CSS = `
.lt-tes__scrim {
  position: fixed; inset: 0; z-index: 10000;
  background: hsl(214, 60%, 12%);
  overflow-y: auto;
  display: flex; align-items: flex-start; justify-content: center;
}
.lt-tes {
  width: 100%; min-height: 100%;
  box-sizing: border-box;
  padding: 28px 18px 32px;
  background: #f7faff; color: hsl(214, 60%, 16%);
  font-family: Inter, system-ui, sans-serif;
  outline: none;
}
.lt-tes__title { margin: 0 0 8px; font-family: Fraunces, Georgia, serif; font-size: 1.7rem; line-height: 1.2; font-weight: 700; }
.lt-tes__did { margin: 0 0 18px; font-size: 0.98rem; line-height: 1.45; color: hsl(214, 30%, 32%); }
.lt-tes__lead {
  border-radius: 16px; padding: 16px; margin-bottom: 10px;
  background: hsl(214, 60%, 19%); color: #ffffff;
}
.lt-tes__tag { margin: 0 0 4px; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: hsl(152, 60%, 70%); }
.lt-tes__price { margin: 0; font-family: Fraunces, Georgia, serif; font-size: 1.9rem; font-weight: 700; }
.lt-tes__full { margin-left: 8px; font-size: 1rem; font-weight: 500; text-decoration: line-through; color: #b9d0e8; font-family: Inter, system-ui, sans-serif; }
.lt-tes__detail { margin: 6px 0 0; font-size: 0.9rem; line-height: 1.4; color: #cfe0f2; }
.lt-tes__second {
  margin: 0 0 16px; padding: 12px 16px; border-radius: 14px;
  border: 1.5px solid hsla(214, 30%, 40%, 0.3); background: #ffffff;
  font-size: 0.95rem; font-weight: 600;
}
.lt-tes__actions { margin-bottom: 14px; }
.lt-tes__pay {
  display: flex; align-items: center; justify-content: center;
  min-height: 48px; border-radius: 14px; text-decoration: none;
  background: hsl(152, 55%, 38%); color: #ffffff; font-weight: 700; font-size: 1rem;
}
.lt-tes__keep { margin: 0 0 14px; font-size: 0.88rem; line-height: 1.5; color: hsl(214, 30%, 32%); }
.lt-tes__basic {
  display: block; width: 100%; min-height: 48px; border-radius: 14px; cursor: pointer;
  background: #ffffff; color: hsl(214, 60%, 16%);
  border: 1.5px solid hsla(214, 30%, 40%, 0.4); font: inherit; font-weight: 700; font-size: 1rem;
}
.lt-tes__pay:focus-visible, .lt-tes__basic:focus-visible { outline: 3px solid hsl(152, 55%, 45%); outline-offset: 2px; }
@media (min-width: 1024px) {
  .lt-tes__scrim { align-items: center; background: hsla(214, 60%, 10%, 0.62); }
  .lt-tes { min-height: 0; max-width: 520px; border-radius: 22px; padding: 32px 30px; }
}
`;

export interface TrialEndScreenViewProps {
  offer: PremiumOffer;
  /** One honest sentence about the free week, or null when the counts could not be read. */
  activityLine: string | null;
  onBasic: () => void;
  /** The Pay / parent actions, or the plain "See plans" link while payments are dark. */
  actions: ReactNode;
}

export function TrialEndScreenView({ offer, activityLine, onBasic, actions }: TrialEndScreenViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBasic();
        return;
      }
      // Focus trap: Tab and Shift+Tab cycle inside the dialog.
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
      );
      if (items.length === 0) {
        e.preventDefault();
        ref.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBasic]);

  return (
    <div className="lt-tes__scrim" data-testid="trial-end-screen">
      <style>{SCREEN_CSS}</style>
      <div className="lt-tes" role="dialog" aria-modal="true" aria-labelledby="lt-tes-title" tabIndex={-1} ref={ref}>
        <h1 className="lt-tes__title" id="lt-tes-title">Your free week is over</h1>
        {activityLine ? (
          <p className="lt-tes__did" data-testid="trial-end-screen-activity">{activityLine}</p>
        ) : null}
        <div className="lt-tes__lead" data-testid="trial-end-screen-lead">
          {offer.foundingLabel ? <p className="lt-tes__tag" data-testid="trial-end-screen-founding-label">{offer.foundingLabel}</p> : null}
          <p className="lt-tes__tag">{offer.title}</p>
          <p className="lt-tes__price">{offer.priceDisplay}</p>
          <p className="lt-tes__detail">{offer.detail}</p>
        </div>
        <p className="lt-tes__second" data-testid="trial-end-screen-second">{offer.second}</p>
        {offer.deadline ? <p className="lt-tes__second" data-testid="trial-end-screen-deadline">{offer.deadline}</p> : null}
        <div className="lt-tes__actions">{actions}</div>
        <p className="lt-tes__keep">
          You keep <strong>Basic free, always</strong> - Exam Trends, the full question bank, Practice and your progress.
        </p>
        <button type="button" className="lt-tes__basic" onClick={onBasic} data-testid="trial-end-screen-basic">
          Continue with Basic
        </button>
      </div>
    </div>
  );
}

/**
 * While the screen is open: the page behind does not scroll, and the phone's back button closes it
 * (it is "Continue with Basic"), via one history entry of our own that is removed again on a normal close.
 */
function DialogBehaviour({ onBack }: { onBack: () => void }) {
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let pushed = false;
    try {
      window.history.pushState({ ltTrialEndScreen: true }, "");
      pushed = true;
    } catch {
      /* no history access: the buttons still close it */
    }
    const onPop = () => {
      pushed = false; // the browser already removed our entry
      backRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = prevOverflow;
      if (pushed) {
        try {
          const state = window.history.state as { ltTrialEndScreen?: boolean } | null;
          if (state && state.ltTrialEndScreen) window.history.back();
        } catch {
          /* leave it */
        }
      }
    };
  }, []);
  return null;
}

async function countsWithin(uid: string, startMs: number): Promise<TrialActivityCounts | null> {
  try {
    const records = await Promise.race([
      getSessionRecordsFromCloud(uid),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), COUNTS_WAIT_MS)),
    ]);
    return records ? countTrialActivity(records, startMs) : null;
  } catch {
    return null;
  }
}

export default function TrialEndScreen() {
  const { user } = useAuth();
  const sub = useSubscription();
  const { pathname, search } = useLocation();
  const uid = user && !user.isLocalSession ? user.uid : null;
  const key = trialEndScreenKey({
    uid,
    hydrated: sub.hydrated,
    isTrialExpired: sub.isTrialExpired,
    isPremium: sub.isPremium,
    trialStartDate: sub.status?.trialStartDate,
    plan: sub.status?.plan,
    premiumSince: sub.status?.premiumSince,
    passEnd: sub.status?.passEnd,
    pathname,
  });
  const [shown, setShown] = useState<{ key: string; line: string | null } | null>(null);
  const claiming = useRef(false);

  useEffect(() => {
    if (!uid || !key || claiming.current || trialEndScreenSeen(uid, key)) return;
    claiming.current = true;
    let cancelled = false;
    const startMs = Date.parse(key);
    void (async () => {
      const counts = Number.isFinite(startMs) ? await countsWithin(uid, startMs) : null;
      if (cancelled || trialEndScreenSeen(uid, key)) return;
      markTrialEndScreenShownThisLoad();
      writeTrialEndScreen(uid, key);
      trackTrialEndScreen("shown");
      setShown({ key, line: trialEndActivityLine(counts) });
    })();
    return () => {
      cancelled = true;
      claiming.current = false;
    };
  }, [uid, key]);

  if (!uid || !key || !shown || shown.key !== key) return null;

  const returnTo = safeSigninRedirect(`${pathname}${search}`);
  const payHref = returnTo ? `${PRICING_HREF}&returnTo=${encodeURIComponent(returnTo)}` : PRICING_HREF;

  const close = () => {
    trackTrialEndScreen("basic");
    setShown(null);
    // The why-not-upgrading card follows the choice; it is once per trial (claimFeedbackMoment).
    void requestFeedbackPrompt("trial_end", { uid, trialKey: key });
  };

  return (
    <>
      <DialogBehaviour onBack={close} />
      <TrialEndScreenView
      offer={premiumOffer(new Date(), predictCbseExamDate("10"))}
      activityLine={shown.line}
      onBasic={close}
      actions={
        <PaywallActions
          surface="trial_end"
          payTo={BOARD_PASS_BUY_PATH}
          fallback={
            <Link
              to={payHref}
              className="lt-tes__pay"
              onClick={() => trackPaywallAction("pay", "trial_end")}
            >
              See plans
            </Link>
          }
        />
      }
    />
    </>
  );
}
