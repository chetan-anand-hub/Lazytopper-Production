/**
 * BoardPassLockCard - LOCK-SELL-1. The visual centre of the full-page Premium lock: "Board Pass" (+ the founding badge while the
 * offer model says so), the star-feature ticks (Answer Checker first), the price "once · till your boards (Feb 2027)" and the
 * "₹2,499 from 1 Dec" line, then the lock's own actions (`children`: Pay / trial / QR / Ask a parent, unchanged components).
 *
 * Every figure and date is read at render from config/pricing.ts (premiumOffer / tillBoardsQuote / boardPassFromLine) - none is typed.
 * With no quote (an unreadable board date) the card shows no figure, only "Pay once, till your boards". Class-based CSS only.
 */
import type { ReactNode } from "react";

import { boardPassFromLine, tillBoardsQuote } from "../../config/pricing";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import { premiumOffer } from "../pricing/boardPassOffer";
import { LOCK_CARD_TITLE, LOCK_ONCE, LOCK_TICKS } from "./lockCopy";

export default function BoardPassLockCard({ children }: { children?: ReactNode }) {
  const now = new Date();
  const boardIso = predictCbseExamDate("10");
  const offer = premiumOffer(now, boardIso);
  const quote = tillBoardsQuote(now, boardIso);
  return (
    <section className="lt-lock__card" data-testid="lock-board-pass-card" aria-label={LOCK_CARD_TITLE}>
      <div className="lt-lock__card-head">
        <h3 className="lt-lock__card-title">{LOCK_CARD_TITLE}</h3>
        {offer.foundingLabel ? (
          <span className="lt-lock__badge" data-testid="lock-founding-badge">
            {offer.foundingLabel}
          </span>
        ) : null}
      </div>
      <ul className="lt-lock__ticks" data-testid="lock-ticks">
        {LOCK_TICKS.map((t) => (
          <li key={t.id} className="lt-lock__tick" data-tick={t.id}>
            <span className="lt-lock__tick-mark" aria-hidden="true">
              ✓
            </span>
            <span>
              {t.strong ? <strong>{t.strong}</strong> : null}
              {t.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="lt-lock__price-block" data-testid="lock-price">
        {quote ? (
          <p className="lt-lock__price">
            <span className="lt-lock__amount" data-testid="lock-amount">
              {quote.priceDisplay}
            </span>{" "}
            <span className="lt-lock__meta">
              {LOCK_ONCE} · {quote.untilLabel}
            </span>
          </p>
        ) : (
          <p className="lt-lock__price">
            <span className="lt-lock__meta">{offer.boardPass.detail}</span>
          </p>
        )}
        <p className="lt-lock__from" data-testid="lock-from-line">
          {boardPassFromLine(now)}
        </p>
      </div>
      <div className="lt-lock__actions">{children}</div>
    </section>
  );
}
