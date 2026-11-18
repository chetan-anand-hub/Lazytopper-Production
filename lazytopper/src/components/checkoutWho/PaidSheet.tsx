/**
 * PaidSheet - PAID-SHEET-1 (owner 12 Nov 2026): the signed-in buyer's "payment received" moment is a pop-up, not a block that waits
 * at the bottom of the page. Top to bottom: tick + "Payment received" + what was bought, "Receipt sent to your email.", ONE primary
 * button (packs: Download files; Board Pass: Start practising), then the existing "Who will use this?" card, then (Board Pass only)
 * the CBQ Packs offer. PAID-XSELL-1: "Goes well with what you just bought" (PaidCrossSellLazy) sits just above that offer. Phone: bottom sheet (88vh, scrolls inside). Desktop: centred card, 520px. Esc / backdrop / X close it.
 * Mounted lazily by PaidSheetLazy, only after a confirmed paid outcome - never on first paint. Nothing here grants anything.
 */
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { sendAnalyticsHit } from "../../analytics/analytics";
import type { MoveTarget } from "../signinLink/signinLinkModel";
import SigninLinkCardLazy from "../signinLink/SigninLinkCardLazy";
import PostPayGstLazy from "../gstInvoice/PostPayGstLazy";
import PaidCrossSellLazy from "./PaidCrossSellLazy";
import { classifyBought, type BoughtKind } from "./paidCrossSellModel";
import "./paidSheet.css";

export const PAID_SHEET_TITLE = "Payment received";
export const PAID_SHEET_LOCK_CLASS = "lt-paid-lock";

export interface PaidSheetProps {
  /** Which page opened it (analytics only): packs | cbq_packs | pricing | board_pass | for_parents. */
  surface: string;
  itemKind: "pack" | "pass";
  /** Plain name of what was bought, e.g. "Circles Chapter Pack", "the Board Pass". */
  itemName: string;
  primaryLabel: string;
  /** "Receipt sent to <masked email>" - passed only when the account has an email; phone-only accounts show no receipt line. */
  receiptLine?: string;
  /** The primary button: the host closes the sheet itself as part of this (it moves on to the files / Home). */
  onPrimary: () => void;
  onClose: () => void;
  /** Passed to the who-card only when the host has an order the buyer may move to the child's own phone / email. */
  move?: MoveTarget;
  onMoved?: () => void;
  /** The buyer answered "Who will use this?" (child / me) in the card: the host drops its reopen button. */
  onAnswered?: () => void;
  /** The purchase has moved to the child's account: no primary button (nothing of the buyer's to open). */
  moved?: boolean;
  /** Shown below the who-card (the Board Pass sheet passes the CBQ Packs offer). */
  below?: ReactNode;
  /**
   * PAID-XSELL-1: what was bought, for "Goes well with what you just bought". Optional: when absent it is read from itemKind +
   * itemName (the hosts' fixed names); an unrecognised name suggests nothing.
   */
  bought?: BoughtKind | null;
}

function sendShown(surface: string, itemKind: string): void {
  try {
    sendAnalyticsHit("event", { name: "paid_sheet_shown", data: { surface, item_kind: itemKind } }, { ga4: { surface, item_kind: itemKind } });
  } catch {
    /* analytics must never break the page */
  }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PaidSheet({ surface, itemKind, itemName, primaryLabel, receiptLine, onPrimary, onClose, move, onMoved, onAnswered, moved, below, bought }: PaidSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    sendShown(surface, itemKind);
  }, [surface, itemKind]);

  // Focus moves into the sheet and returns to whatever had it; the page behind does not scroll while it is open.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.classList.add(PAID_SHEET_LOCK_CLASS);
    return () => {
      document.body.classList.remove(PAID_SHEET_LOCK_CLASS);
      try {
        before?.focus?.();
      } catch {
        /* the element may be gone */
      }
    };
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return createPortal(
    <div className="lt-paid" data-testid="paid-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lt-paid__panel" role="dialog" aria-modal="true" aria-labelledby="lt-paid-title" tabIndex={-1} ref={panelRef} onKeyDown={onKeyDown}>
        <div className="lt-paid__head">
          <span className="lt-paid__tick" aria-hidden="true">&#10003;</span>
          <div className="lt-paid__headtext">
            <h2 className="lt-paid__title" id="lt-paid-title">{PAID_SHEET_TITLE}</h2>
            <p className="lt-paid__item" data-testid="paid-sheet-item">{itemName}</p>
          </div>
          <button type="button" className="lt-paid__close" aria-label="Close" onClick={onClose} data-testid="paid-sheet-close">&times;</button>
        </div>
        {receiptLine && <p className="lt-paid__receipt" data-testid="paid-sheet-receipt">{receiptLine}</p>}
        {!moved && (
          <button type="button" className="lt-paid__primary" onClick={onPrimary} data-testid="paid-sheet-primary">
            {primaryLabel}
          </button>
        )}
        <div className="lt-paid__who" data-testid="paid-sheet-who">
          <SigninLinkCardLazy signedIn {...(move ? { move } : {})} {...(onMoved ? { onMoved } : {})} {...(onAnswered ? { onAnswered } : {})} />
        </div>
        {/* GST-AFTER-PAY-1: the signed-in buyer's state + PIN, after paying; only for an order the host knows (move.orderId). */}
        {move?.orderId && <PostPayGstLazy orderId={move.orderId} />}
        {!moved && (
          <PaidCrossSellLazy
            bought={bought === undefined ? classifyBought(itemKind, itemName) : bought}
            surface={surface}
            hostOffersCbq={itemKind === "pass" && Boolean(below)}
            onLeave={onClose}
          />
        )}
        {!moved && below}
      </div>
    </div>,
    document.body,
  );
}
