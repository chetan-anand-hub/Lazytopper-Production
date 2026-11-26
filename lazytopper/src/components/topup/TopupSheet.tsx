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
import "./topup.css";

export interface TopupSheetProps {
  onClose: () => void;
  /** Called once the server has confirmed the credit (the host re-reads its numbers / clears its limit message). */
  onToppedUp?: () => void;
  /** Test seam: the purchase deps. */
  buyDeps?: TopupBuyDeps;
  /** Test seam: the clock the price is computed at. */
  nowMs?: number;
}

type Phase = { kind: "idle" } | { kind: "busy"; key: TopupKey } | { kind: "paid" } | { kind: "pending" } | { kind: "failed" };

export default function TopupSheet({ onClose, onToppedUp, buyDeps, nowMs }: TopupSheetProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const headingId = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const busy = phase.kind === "busy";

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
    };
  }, []);

  const pay = async (key: TopupKey) => {
    if (busy) return;
    setPhase({ kind: "busy", key });
    const outcome: TopupOutcome = await buyTopup(key, buyDeps);
    if (outcome.status === "paid") {
      setPhase({ kind: "paid" });
      onToppedUp?.();
    } else if (outcome.status === "pending") {
      setPhase({ kind: "pending" });
    } else if (outcome.status === "failed") {
      setPhase({ kind: "failed" });
    } else {
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
