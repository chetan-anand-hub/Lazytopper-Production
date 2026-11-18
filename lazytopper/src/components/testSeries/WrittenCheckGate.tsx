/**
 * TEST-SERIES-1 — owner rulings 18 Nov 2026 (19:31, corrected 19:38 and 19:44 IST). CLIENT-SIDE ONLY, and ONLY on the Chapter Test
 * and Full Mock surfaces:
 *   - free and trial accounts may TAKE ONE test in total (signed out: sign in first); their MCQs (Section A) are marked;
 *   - checking written answers (Sections B–E), downloading / printing the paper and the graded-sheet / solution PDFs are for a
 *     Board Pass holder OR a Test Series owner (`canCheckSeriesPapers`);
 *   - the scorecard's tutor entry stays visible; for anyone without the Board Pass (Test Series owners included) it opens
 *     "Tutor support comes with the Board Pass" instead of the tutor.
 * Every wall offers the Test Series and the Board Pass as EQUAL-weight buttons. The Answer Checker, worksheets, the server grader,
 * the server tutor gate and every entitlement are untouched; the PDF packs (/packs) too.
 * Kill switch: VITE_WRITTEN_CHECK_GATE_DISABLED=1 restores the previous behaviour on both surfaces.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";
import { isPaidPremium } from "../../services/subscriptionService";
import { boardPassPriceDisplay } from "../../config/pricing";
import { canCheckSeriesPapers } from "../../lib/testSeries/seriesAccess";
import { TEST_SERIES_BUY_PATH, seriesTotals, testSeriesPriceDisplay } from "../../lib/testSeries/testSeries";
import "./writtenCheckGate.css";

export const BOARD_PASS_PATH = "/board-pass";
export const WRITTEN_CHECK_UPGRADE_LINE = "Get every written answer checked step by step, the CBSE way";
export const DOWNLOAD_WITH_PLAN = "Download & print with the Test Series or Board Pass";
export const TUTOR_BOARD_PASS_LINE = "Tutor support comes with the Board Pass — it explains exactly why you lost this mark";

export function writtenCheckGateDisabled(): boolean {
  return import.meta.env?.VITE_WRITTEN_CHECK_GATE_DISABLED === "1";
}

/** "Upgrade to the Test Series (₹999 + GST) or the Board Pass to take all 42 tests" — the count from code. */
export function seriesStartWallLine(): string {
  return `Upgrade to the Test Series (${testSeriesPriceDisplay()}) or the Board Pass to take all ${seriesTotals().total} tests`;
}

/** True when this account may take every test, upload written answers and download on Chapter Tests / Full Mocks. */
export function useSeriesPaperAccess(): boolean {
  const { status } = useSubscription();
  if (writtenCheckGateDisabled()) return true;
  return canCheckSeriesPapers({
    paidPremium: isPaidPremium(status),
    // ★ TS-PACK-1 HOOK: wire `ownsTestSeries` from /api/packs/mine (a `test_series` pack) here.
    ownsTestSeries: false,
  });
}

/** True for a Board Pass holder (PAID premium) — the only account the scorecard's tutor entry opens the tutor for. */
export function useBoardPassHolder(): boolean {
  const { status } = useSubscription();
  return writtenCheckGateDisabled() || isPaidPremium(status);
}

/** The two offers, equal weight: the Test Series and the Board Pass (its price is date-driven, so read after mount). */
export function SeriesOfferButtons({ testIdPrefix }: { testIdPrefix: string }) {
  const [bpPrice, setBpPrice] = useState<string | null>(null);
  useEffect(() => setBpPrice(boardPassPriceDisplay(Date.now())), []);
  return (
    <div className="lt-wcg__offers">
      <Link className="lt-wcg__btn" to={TEST_SERIES_BUY_PATH} data-testid={`${testIdPrefix}-ts`}>
        <span className="lt-wcg__main">Test Series</span>
        <span className="lt-wcg__price">{testSeriesPriceDisplay()} · all {seriesTotals().total} tests</span>
      </Link>
      <Link className="lt-wcg__btn" to={BOARD_PASS_PATH} data-testid={`${testIdPrefix}-bp`}>
        <span className="lt-wcg__main">Board Pass</span>
        <span className="lt-wcg__price">{bpPrice ? `${bpPrice} · everything + tutor` : "everything + tutor"}</span>
      </Link>
    </div>
  );
}

/** In place of the upload panel: Section A's real score, then the two ways to get written answers checked. */
export function WrittenCheckUpgradeCard({
  eyebrow,
  name,
  code,
  objective,
  sectionsLabel,
  onDone,
}: {
  eyebrow: string;
  name: string;
  code: string;
  objective: { awarded: number; total: number };
  sectionsLabel: string;
  onDone: () => void;
}) {
  return (
    <div className="lt-ct__upload" data-testid="written-check-upgrade">
      <div className="lt-ct__uploadcard">
        <div className="lt-ct__eyebrow">{eyebrow}</div>
        <div className="lt-ct__title lt-ct__fr">{name}</div>
        <div className="lt-ct__sub" data-testid="written-check-objective">
          {code} · Section A marked: <b>{objective.awarded}/{objective.total}</b>
        </div>
        <div className="lt-wcg">
          <p className="lt-wcg__line">
            {WRITTEN_CHECK_UPGRADE_LINE} ({sectionsLabel}), with either:
          </p>
          <SeriesOfferButtons testIdPrefix="written-check" />
        </div>
        <div className="lt-ct__startrow">
          <button type="button" className="lt-ct__btn lt-ct__btn--ghost lt-ct__btn--sm" onClick={onDone}>
            Done for now
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shown when a free / trial account that has used its one test tries to start another. */
export function SeriesStartWall() {
  return (
    <div className="lt-wcg" role="alert" data-testid="series-start-wall">
      <p className="lt-wcg__line">{seriesStartWallLine()}.</p>
      <SeriesOfferButtons testIdPrefix="series-start-wall" />
    </div>
  );
}

/** In place of the paper's Download button. */
export function DownloadWithPlanLink() {
  return (
    <Link className="lt-wcg__dl" to={TEST_SERIES_BUY_PATH} data-testid="download-with-plan">
      {DOWNLOAD_WITH_PLAN} →
    </Link>
  );
}

/** The scorecard's "Ask the tutor why I lost this mark", for an account without the Board Pass: a card over the scorecard
 *  (Test Series owners included — the tutor is the Board Pass's). Board Pass and Test Series buttons, equal weight. */
export function TutorBoardPassWall({ onClose }: { onClose: () => void }) {
  return (
    <div className="lt-wcg-tutor" role="dialog" aria-modal="true" aria-labelledby="lt-wcg-tutor-h" data-testid="tutor-board-pass-wall">
      <div className="lt-wcg-tutor__card">
        <p id="lt-wcg-tutor-h" className="lt-wcg__line">
          {TUTOR_BOARD_PASS_LINE}.
        </p>
        <SeriesOfferButtons testIdPrefix="tutor-wall" />
        <button type="button" className="lt-wcg-tutor__close" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
