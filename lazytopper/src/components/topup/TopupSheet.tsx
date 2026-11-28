/**
 * TopupSheet - TOPUP-GO-1. The one small sheet behind "Top up to keep going" (the fair-use limit message) and "Buy extra usage"
 * (Settings > Your limits): the two packs, what each buys in plain words, the price "₹X + GST", and a Pay button that names the TOTAL.
 *
 * Prices and "about N" lines come only from config/topup.ts (a mirror of the server table, parity-tested); nothing is typed here.
 * The sheet is opened only for a student the SERVER called Premium (the host decides), and the server refuses anyone else (403).
 * No "Forward to parent" here: a parent link for a top-up needs the parent-pay server routes, which this lane did not change.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TOPUP_CONFIRMING_COPY,
  TOPUP_ESTIMATE_NOTE,
  TOPUP_FAILED_COPY,
  TOPUP_PACKS,
  TOPUP_PAID_COPY,
  TOPUP_SHEET_LEAD,
  TOPUP_SHEET_TITLE,
  topupLines,
  topupLineText,
  topupPrice,
  type TopupKey,
} from "../../config/topup";
import { buyTopup, type TopupBuyDeps, type TopupOutcome } from "./topupBuy";
import { trackOnboardingEvent } from "../../analytics/analytics";
import "./topup.css";

/** FU-TOPUP-NO-ANALYTICS (ORDER-DEDUP-2): the top-up funnel. Closed-set slugs only - the pack key, where the sheet opened, why it
 *  ended - never an amount, an order id or anything about the student. `pack: "both"` = the sheet itself (it lists both packs). */
export type TopupSurface = "limit" | "menu" | "warn";
declare module "../../analytics/analytics" {
  interface OnboardingEventParams {
    topup_sheet_shown: { pack: "both"; surface: TopupSurface | "other" };
    topup_buy_tap: { pack: TopupKey };
    topup_paid: { pack: TopupKey };
    topup_failed: { pack: TopupKey; reason: "closed" | "error" };
  }
}

export interface TopupSheetProps {
  onClose: () => void;
  /** Called once the server has confirmed the credit (the host re-reads its numbers / clears its limit message). */
  onToppedUp?: () => void;
  /** Test seam: the purchase deps. */
  buyDeps?: TopupBuyDeps;
  /** Test seam: the clock the price is computed at. */
  nowMs?: number;
  /** Where the sheet was opened from (analytics only). */
  surface?: TopupSurface;
}

type Phase = { kind: "idle" } | { kind: "busy"; key: TopupKey } | { kind: "paid" } | { kind: "pending" } | { kind: "failed" };

export default function TopupSheet({ onClose, onToppedUp, buyDeps, nowMs, surface }: TopupSheetProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const headingId = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const busy = phase.kind === "busy";
  const shownSent = useRef(false);
  const payingRef = useRef(false); // ORDER-DEDUP-2: synchronous in-flight flag (the `busy` closure only updates after a re-render)

  useEffect(() => {
    if (shownSent.current) return;
    shownSent.current = true;
    trackOnboardingEvent("topup_sheet_shown", { pack: "both", surface: surface ?? "other" });
  }, [surface]);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, []);

  const pay = async (key: TopupKey) => {
    if (busy || payingRef.current) return;
    payingRef.current = true;
    trackOnboardingEvent("topup_buy_tap", { pack: key });
    setPhase({ kind: "busy", key });
    let outcome: TopupOutcome;
    try {
      outcome = await buyTopup(key, buyDeps);
    } finally {
      payingRef.current = false;
    }
    if (outcome.status === "paid") {
      trackOnboardingEvent("topup_paid", { pack: key });
      setPhase({ kind: "paid" });
      onToppedUp?.();
    } else if (outcome.status === "pending") {
      // Razorpay signed a success the server has not confirmed yet: neither paid nor failed, so no outcome event.
      setPhase({ kind: "pending" });
    } else if (outcome.status === "failed") {
      trackOnboardingEvent("topup_failed", { pack: key, reason: "error" });
      setPhase({ kind: "failed" });
    } else {
      trackOnboardingEvent("topup_failed", { pack: key, reason: "closed" });
      setPhase({ kind: "idle" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && !busy) {
      e.stopPropagation();
      onClose();
    }
  };

  const now = nowMs ?? Date.now();
  const done = phase.kind === "paid";

  return createPortal(
    <div className="lt-topup" data-testid="topup-sheet-overlay">
      <div ref={ref} className="lt-topup__sheet" role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={onKeyDown} data-testid="topup-sheet">
        <h2 className="lt-topup__title" id={headingId}>{TOPUP_SHEET_TITLE}</h2>
        {done ? (
          <p className="lt-topup__done" role="status" data-testid="topup-paid">{TOPUP_PAID_COPY}</p>
        ) : (
          <>
            <p className="lt-topup__lead">{TOPUP_SHEET_LEAD}</p>
            <ul className="lt-topup__packs">
              {TOPUP_PACKS.map((pack) => {
                const price = topupPrice(pack, now);
                return (
                  <li className="lt-topup__pack" key={pack.key} data-testid={`topup-pack-${pack.key}`}>
                    <div className="lt-topup__price" data-testid={`topup-price-${pack.key}`}>{price.priceText}</div>
                    <ul className="lt-topup__lines">
                      {topupLines(pack).map((line) => (
                        <li key={line.label}>{topupLineText(line)}</li>
                      ))}
                    </ul>
                    {price.breakupText ? <div className="lt-topup__gst" data-testid={`topup-gst-${pack.key}`}>{price.breakupText}</div> : null}
                    <button
                      type="button"
                      className="lt-topup__pay"
                      onClick={() => void pay(pack.key)}
                      disabled={busy}
                      aria-disabled={busy}
                      data-testid={`topup-pay-${pack.key}`}
                    >
                      {phase.kind === "busy" && phase.key === pack.key ? "Opening payment..." : `Pay ${price.totalText}`}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="lt-topup__note">{TOPUP_ESTIMATE_NOTE}</p>
            {phase.kind === "failed" ? <p className="lt-topup__msg" role="alert" data-testid="topup-failed">{TOPUP_FAILED_COPY}</p> : null}
            {phase.kind === "pending" ? <p className="lt-topup__msg" role="status" data-testid="topup-pending">{TOPUP_CONFIRMING_COPY}</p> : null}
          </>
        )}
        <button type="button" className="lt-topup__close" onClick={onClose} disabled={busy} data-testid="topup-close">
          {done ? "Done" : "Close"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
