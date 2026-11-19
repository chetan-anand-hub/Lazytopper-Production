import { Link } from "react-router-dom";
import { TEST_SERIES_NAV_PATH } from "../../lib/testSeries/seriesNav";

/** TS-NAV-1 - the visible "Test Series" crumb in a series paper's page bar: a real link to /test-series. Rendered only for a series paper. */
export default function SeriesCrumb() {
  return (
    <Link className="lt-ct__crumb" to={TEST_SERIES_NAV_PATH} data-testid="ts-crumb">
      Test Series
    </Link>
  );
}
