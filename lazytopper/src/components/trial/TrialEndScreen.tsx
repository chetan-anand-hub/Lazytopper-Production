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
import { isPaymentsClientEnabled } from "../../services/checkout";
import { LOCK_TICKS } from "../lock/lockTicks";
import { LANDING_PACKS_HREF, checkPacksLine } from "../packs/landingOfferModel";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { safeSigninRedirect } from "../../services/freeCheckClient";
import { countTrialActivity, type TrialActivityCounts } from "./trialEndBannerModel";
import {
  markTrialEndScreenShownThisLoad,
  foundingDaysLeftLine,
  trialEndActivityLine,
  trialEndFoundingLine,
  trialEndScreenKey,
  trialEndScreenSeen,
  writeTrialEndScreen,
} from "./trialEndScreenModel";

/**
 * TrialEndScreen — ASK-FIX-1, reworked by TRIAL-END-OFFER-1. "Your free week is over": on the first visit after the 7-day trial
 * has ended, a full-screen sheet on a phone / a centred card on desktop. In order: what the student really did (only when there is
 * something real to say), the Board Pass with its founding price, the real deadline and whole days left, the Board Pass star
 * features (the LOCK-SELL-1 list), "Get the Board Pass" (one tap to the existing checkout), "Ask a parent to pay", a quiet PDF-pack
 * line, and - smallest - "Continue with Basic". The why-not-upgrading feedback card follows "Continue with Basic".
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
  margin: 0 0 14px; padding: 10px 16px; border-radius: 14px;
  border: 1.5px solid hsla(214, 30%, 40%, 0.3); background: #ffffff;
  font-size: 0.95rem; font-weight: 600;
}
.lt-tes__founding { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid hsla(0, 0%, 100%, 0.18); font-size: 0.95rem; font-weight: 700; line-height: 1.35; color: #ffffff; }
.lt-tes__days { margin: 2px 0 0; font-size: 0.88rem; color: hsl(152, 60%, 74%); font-weight: 600; }
.lt-tes__ticks { margin: 0 0 12px; padding: 0; list-style: none; display: grid; gap: 8px; }
.lt-tes__tick { position: relative; padding-left: 24px; font-size: 0.92rem; line-height: 1.4; }
.lt-tes__tick::before { content: "\\2713"; position: absolute; left: 0; top: 0; font-weight: 800; color: hsl(152, 55%, 34%); }
.lt-tes__actions { margin-bottom: 12px; display: grid; gap: 10px; }
.lt-tes__pay {
  display: flex; align-items: center; justify-content: center; text-align: center;
  min-height: 52px; padding: 8px 14px; border-radius: 14px; text-decoration: none;
  background: hsl(152, 55%, 34%); color: #ffffff; font-weight: 700; font-size: 1.02rem;
}
.lt-tes__packs { display: block; margin: 0 0 14px; text-align: center; font-size: 0.86rem; line-height: 1.4; color: hsl(214, 30%, 32%); text-decoration: underline; text-underline-offset: 2px; }
.lt-tes__keep { margin: 0 0 6px; text-align: center; font-size: 0.82rem; line-height: 1.45; color: hsl(214, 30%, 38%); }
.lt-tes__basic {
  display: block; margin: 0 auto; min-height: 44px; padding: 8px 14px; cursor: pointer;
  background: transparent; color: hsl(214, 30%, 32%); border: 0;
  font: inherit; font-weight: 600; font-size: 0.88rem; text-decoration: underline; text-underline-offset: 3px;
}
.lt-tes__pay:focus-visible, .lt-tes__basic:focus-visible, .lt-tes__packs:focus-visible { outline: 3px solid hsl(152, 55%, 45%); outline-offset: 2px; }
@media (min-width: 1024px) {
  /* margin:auto centres a card that fits and keeps the TOP reachable when it is taller than the viewport (align-items:center clips it). */
  .lt-tes__scrim { background: hsla(214, 60%, 10%, 0.62); }
  .lt-tes { min-height: 0; max-width: 520px; margin: auto; border-radius: 22px; padding: 28px 30px; }
}
`;

/** The star features LOCK-SELL-1 sells (Answer Checker first), minus the "papers" tick: the paid-for four. Shared list, no copy. */
const BOARD_PASS_TICKS = LOCK_TICKS.filter((t) => t.id !== "papers");

export interface TrialEndScreenViewProps {
  offer: PremiumOffer;
  /** One honest sentence about the free week, or null when the counts could not be read. */
  activityLine: string | null;
  /** "Founding price ₹… till 30 Nov — ₹… from 1 Dec", or null once the founding offer has closed. */
  foundingLine?: string | null;
  /** "N days left at this price" (whole days), or null once the founding offer has closed. */
  daysLine?: string | null;
  /** The quiet PDF-pack line ("Prefer practising on paper? PDF packs from ₹49 →"). */
  packsLine?: string | null;
  onBasic: () => void;
  /** The buy / parent actions. */
  actions: ReactNode;
}

export function TrialEndScreenView({ offer, activityLine, foundingLine = null, daysLine = null, packsLine = null, onBasic, actions }: TrialEndScreenViewProps) {
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
          {foundingLine ? <p className="lt-tes__founding" data-testid="trial-end-screen-deadline">{foundingLine}</p> : null}
          {foundingLine && daysLine ? <p className="lt-tes__days" data-testid="trial-end-screen-days">{daysLine}</p> : null}
        </div>
        <ul className="lt-tes__ticks" data-testid="trial-end-screen-ticks">
          {BOARD_PASS_TICKS.map((t) => (
            <li className="lt-tes__tick" key={t.id}>
              {t.strong ? <strong>{t.strong}</strong> : null}
              {t.text}
            </li>
          ))}
        </ul>
        <p className="lt-tes__second" data-testid="trial-end-screen-second">{offer.second}</p>
        <div className="lt-tes__actions">{actions}</div>
        {packsLine ? (
          <Link to={LANDING_PACKS_HREF} className="lt-tes__packs" data-testid="trial-end-screen-packs">{packsLine}</Link>
        ) : null}
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
  // BUY-PATH-1: one-tap checkout, keeping the same source / returnTo (PassCheckout strips only `buy`).
  const buyHref = `${BOARD_PASS_BUY_PATH}&${payHref.slice(payHref.indexOf("?") + 1)}`;

  const offer = premiumOffer(new Date(), predictCbseExamDate("10"));

  const close = () => {
    trackTrialEndScreen("basic");
    setShown(null);
    // The why-not-upgrading card follows the choice; it is once per trial (claimFeedbackMoment).
    void requestFeedbackPrompt("trial_end", { uid, trialKey: key });
  };

  const now = Date.now();
  const payments = isPaymentsClientEnabled();
  const buyLabel = payments ? `Get the Board Pass \u00b7 ${offer.priceDisplay}` : "See plans";

  return (
    <>
      <DialogBehaviour onBack={close} />
      <TrialEndScreenView
        offer={offer}
        activityLine={shown.line}
        foundingLine={trialEndFoundingLine(now)}
        daysLine={foundingDaysLeftLine(now)}
        packsLine={checkPacksLine()}
        onBasic={close}
        actions={
          <>
            <Link
              to={payments ? buyHref : payHref}
              className="lt-tes__pay"
              data-testid="trial-end-screen-buy"
              onClick={() => trackPaywallAction("pay", "trial_end")}
            >
              {buyLabel}
            </Link>
            {/* "Ask a parent to pay" only (no QR button): renders nothing while payments are dark. */}
            <PaywallActions surface="trial_end" noQr />
          </>
        }
      />
    </>
  );
}
