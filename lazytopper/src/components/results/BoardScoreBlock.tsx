/**
 * BoardScoreBlock - TS-BOARDSCORE-1: the full-length test scorecard's board view (owner ruling 23 Nov 2026, 19:04 IST).
 * (a) "You scored X / 80 on a full CBSE-pattern paper." (b) the last up to 5 full-test scores of this subject as a row of chips,
 * oldest first, with the change since the first full test. (c) the board estimate range with its small print, or the one honest
 * line asking for one more full test.
 *
 * Presentational only: every string and number comes from the BoardScoreView built by lib/fullmock/boardEstimate from the
 * student's own graded papers. It derives nothing and writes nothing. Lazy-loaded by ResultsScorecard (out of the entry chunk).
 */
import "./BoardScoreBlock.css";
import type { BoardScoreView } from "../../lib/fullmock/boardEstimate";
import { formatScoreNumber } from "./scoreNumber";

export default function BoardScoreBlock({ view }: { view: BoardScoreView }) {
  const { scoreLine, trend, estimate, estimateHint } = view;
  return (
    <section className="lt-bsb" aria-label="Full-paper score" data-testid="board-score">
      <p className="lt-bsb__line">{scoreLine}</p>
      {trend && (
        <div className="lt-bsb__trend">
          <div className="lt-bsb__h">Your last {trend.points.length} full tests</div>
          <ol className="lt-bsb__chips" aria-label={`Your last ${trend.points.length} full-test scores out of 80, oldest first`}>
            {trend.points.map((p, i) => (
              <li
                key={i}
                className={i === trend.points.length - 1 ? "lt-bsb__chip lt-bsb__chip--now" : "lt-bsb__chip"}
                aria-current={i === trend.points.length - 1 ? "true" : undefined}
              >
                {formatScoreNumber(p)}
              </li>
            ))}
          </ol>
          <p className="lt-bsb__chg">{trend.changeLine}</p>
        </div>
      )}
      {estimate && (
        <div className="lt-bsb__est">
          <p className="lt-bsb__est-line">{estimate.line}</p>
          <p className="lt-bsb__fine">{estimate.smallPrint}</p>
        </div>
      )}
      {estimateHint && <p className="lt-bsb__hint">{estimateHint}</p>}
    </section>
  );
}
