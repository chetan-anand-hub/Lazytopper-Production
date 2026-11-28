import { Link } from "react-router-dom";
import { FREE_TS_WEEKLY_SIGNED_IN } from "../../config/mockViewLimits";
import { SeriesOfferButtons } from "../testSeries/WrittenCheckGate";
import "./MockViewGate.css";
import { TEST_SERIES_PATH } from "../../lib/testSeries/testSeries";

/**
 * FREE-TS-WEEKLY (owner ruling 27 Nov 2026, 13:14 IST): a Basic or trial account opens Test Series papers only. An ordinary chapter test
 * or full mock shows this wall - the SAME two offers the other walls carry (SeriesOfferButtons: the Test Series and the Board Pass,
 * each button showing the total charged on the button, "Pay ₹X", the "₹X + GST" price with GST included). No price is typed here.
 */
export default function PaperSeriesOnlyWall() {
  return (
    <div className="lt-page lt-pso">
      <div className="lt-wcg" role="alert" data-testid="paper-series-only-wall">
        <h2 className="lt-pso__h">This paper comes with the Test Series or the Board Pass</h2>
        <p className="lt-wcg__line">
          Free accounts open {FREE_TS_WEEKLY_SIGNED_IN} Test Series papers a week. Pick one of those, or get every paper:
        </p>
        <SeriesOfferButtons testIdPrefix="series-only-wall" showTotal />
        <p className="lt-wcg__line">
          <Link to={TEST_SERIES_PATH} data-testid="series-only-wall-browse">
            See the Test Series papers
          </Link>
        </p>
      </div>
    </div>
  );
}
