/**
 * GATE-QP-1 — the Board Pass screen a Basic / Test Series-only student meets BEFORE they write or upload practice answers
 * (written answers marked step by step is Board Pass only; the trial keeps it). Calm, no error colour, no countdown. MCQ taps stay
 * instantly scored. The Board Pass price comes from the same helper /pricing uses. When the student arrived from a Test Series
 * paper's analysis (`from=test-series&returnTo=<paper>`), the Board Pass link carries that pair so Back still leads to the paper.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { boardPassPriceDisplay } from "../../config/pricing";
import { seriesBackFromSearch, withSeriesReturn } from "../../lib/testSeries/seriesNav";
import { QP_WALL_BODY, QP_WALL_PATH, QP_WALL_TITLE } from "../../lib/practice/qpWrittenGate";
import "../testSeries/writtenCheckGate.css";

export default function QpBoardPassWall({ testId = "qp-board-pass-wall" }: { testId?: string }) {
  const { search } = useLocation();
  const [price, setPrice] = useState<string | null>(null);
  // The price is clock-derived (founding offer): read after mount so a prerender never freezes a date.
  useEffect(() => setPrice(boardPassPriceDisplay(Date.now())), []);
  const back = seriesBackFromSearch(search);
  const to = back ? withSeriesReturn(QP_WALL_PATH, back.to) : QP_WALL_PATH;
  return (
    <div className="lt-wcg" role="status" data-testid={testId}>
      <p className="lt-wcg__line">{QP_WALL_TITLE}</p>
      <p className="lt-wcg__line">{QP_WALL_BODY}</p>
      <div className="lt-wcg__offers">
        <Link className="lt-wcg__btn" to={to} data-testid={`${testId}-bp`}>
          <span className="lt-wcg__main">Board Pass</span>
          <span className="lt-wcg__price">{price ? `${price} · everything + tutor` : "everything + tutor"}</span>
        </Link>
      </div>
    </div>
  );
}
