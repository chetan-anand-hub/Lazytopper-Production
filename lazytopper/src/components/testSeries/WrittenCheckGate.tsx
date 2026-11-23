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
 *
 * TS-FREE-CHECK-1 (owner ruling 23 Nov 2026, 19:59 IST): the ONE free test now includes written-answer marking - a free / trial
 * account may upload its answer sheet on the free test's paper (2 checks + the free re-check, like an owner's paper). The SERVER pins
 * the free paper at the first written check and refuses every other paper (server/services/testSeriesChecks.cjs); the page reads that
 * state from GET /api/packs/mine `freeTest` and only decides what to SHOW. Kill switches: VITE_TS_FREE_WRITTEN_CHECK_DISABLED=1 (page)
 * and TS_FREE_WRITTEN_CHECK_DISABLED=1 (server; it also stops sending `freeTest`, which turns the page back by itself).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { tagWhenSeriesPaper } from "../../lib/testSeries/seriesNav";
import { useSubscription } from "../../hooks/useSubscription";
import { isPaidPremium } from "../../services/subscriptionService";
import { boardPassPriceDisplay } from "../../config/pricing";
import {
  canCheckSeriesPapers,
  canDownloadPaper,
  countTestsTaken,
  firstCountedTestWorksheetId,
  freeTestNote,
  freeTestWrittenAllowed,
  freeWrittenCheckDisabled,
} from "../../lib/testSeries/seriesAccess";
import { useOwnedPacks } from "../packs/useOwnedPacks";
import { ownsChapter, ownsMocks, type PackSubject } from "../../services/packs";
import type { TestSeriesFreeTest, TestSeriesStatus } from "../../services/packs";
import { TEST_SERIES_BUY_PATH, seriesPaperKeyOfWorksheetId, seriesTotals } from "../../lib/testSeries/testSeries";
import { SHEET_UNREADABLE_NOT_COUNTED_LINE, packPriceLabel, testSeriesChecksLeftLine, testSeriesPriceLine, testSeriesRecheckNote } from "../../services/packs";
import { useTestSeriesOwnership } from "./testSeriesOwnership";
import "./writtenCheckGate.css";

export const BOARD_PASS_PATH = "/board-pass";
export const WRITTEN_CHECK_UPGRADE_LINE = "Get every written answer checked step by step, the CBSE way";
export const DOWNLOAD_WITH_PLAN = "Download & print with the Test Series or Board Pass";
export const TUTOR_BOARD_PASS_LINE = "Tutor support comes with the Board Pass — it explains exactly why you lost this mark";

export function writtenCheckGateDisabled(): boolean {
  return import.meta.env?.VITE_WRITTEN_CHECK_GATE_DISABLED === "1";
}

/** "Upgrade to the Test Series (price from code) or the Board Pass to take all <total> tests" — the price and the count come from code. */
export function seriesStartWallLine(): string {
  return `Upgrade to the Test Series (${packPriceLabel("test_series")}) or the Board Pass to take all ${seriesTotals().total} tests`;
}

/**
 * True when this account may take every test, upload written answers and download on Chapter Tests / Full Mocks.
 * TS-PACK-1: `uid` (the signed-in student) lets a Test Series Pack owner through — `ownsTestSeries` from GET /api/packs/mine, asked
 * only for a signed-in student who is not a Board Pass holder. Without a uid only the Board Pass counts (as before).
 */
export function useSeriesPaperAccess(uid?: string | null): boolean {
  const { status } = useSubscription();
  const paid = isPaidPremium(status);
  const off = writtenCheckGateDisabled();
  const own = useTestSeriesOwnership(!off && !paid ? uid : null);
  if (off) return true;
  return canCheckSeriesPapers({ paidPremium: paid, ownsTestSeries: own.owns });
}

/** MYPACKS-TS-1: the paper an access decision is about (the pack cover for downloads). */
export type SeriesAccessPaper = { kind: "chapter-test"; chapterSlug: string | null } | { kind: "full-mock"; subject: PackSubject };

export interface SeriesAccess {
  /** May check written answers (Board Pass or a Test Series owner). */
  canCheck: boolean;
  /** May download / print (canCheck, or a PDF pack covering this paper - restored). */
  canDownload: boolean;
  /** Ownership is still being read: show "Checking your access…", never an upgrade wall. */
  checking: boolean;
  /** The ownership read failed twice: show "Couldn't confirm your purchase - retry", never a paywall. */
  failed: boolean;
  /** A Test Series owner (not a Board Pass holder). */
  ownsSeries: boolean;
  status: ReturnType<typeof useTestSeriesOwnership>["status"];
  /** TS-FREE-CHECK-1: the server's free-test state for a non-owner (null: unknown, an owner, a Board Pass holder, or switched off). */
  freeTest?: TestSeriesFreeTest | null;
  retry: () => void;
}

/** MYPACKS-TS-1: the three-state access for a paper page (checking / failed / decided). `useSeriesPaperAccess` stays the boolean form. */
export function useSeriesAccess(uid: string | null | undefined, paper: SeriesAccessPaper | null): SeriesAccess {
  const { status } = useSubscription();
  const paid = isPaidPremium(status);
  const off = writtenCheckGateDisabled();
  const ask = !off && !paid ? uid : null;
  const own = useTestSeriesOwnership(ask);
  const packs = useOwnedPacks(ask ?? "", Boolean(ask));
  if (off || paid) return { canCheck: true, canDownload: true, checking: false, failed: false, ownsSeries: false, status: null, freeTest: null, retry: own.retry };
  const covers =
    packs.phase === "ready" && paper
      ? paper.kind === "chapter-test"
        ? Boolean(paper.chapterSlug) && ownsChapter(packs.packs, paper.chapterSlug as string)
        : ownsMocks(packs.packs, paper.subject)
      : false;
  const canCheck = canCheckSeriesPapers({ paidPremium: false, ownsTestSeries: own.owns });
  const checking = Boolean(ask) && (own.phase === "loading" || (!canCheck && packs.phase === "loading"));
  return {
    canCheck,
    canDownload: canDownloadPaper({ paidPremium: false, ownsTestSeries: own.owns, ownsCoveringPack: covers }),
    checking,
    failed: Boolean(ask) && own.phase === "error" && !canCheck,
    ownsSeries: own.owns,
    status: own.status,
    freeTest: own.owns || freeWrittenCheckDisabled() ? null : own.freeTest,
    retry: own.retry,
  };
}

/**
 * TS-FREE-CHECK-1 - is THIS paper the account's free test with written-answer checking? `paperKey` is the series paper key
 * ("TS-CT-M01"; `seriesPaperKeyOfWorksheetId` of the sitting); `records` are the account's session records (the one-test rule's
 * own source). False for an owner / Board Pass holder (they need no free test), a non-series paper, or while the server state is
 * unknown. The SERVER still decides every grade.
 */
export function seriesFreeTestWritten(
  access: Pick<SeriesAccess, "canCheck" | "freeTest">,
  paperKey: string | null,
  records: ReadonlyArray<{ surface: string; gradedAt?: number; worksheetId?: string }>,
): boolean {
  if (access.canCheck) return false;
  return freeTestWrittenAllowed({
    disabled: freeWrittenCheckDisabled(),
    paperKey,
    server: access.freeTest ?? null,
    testsTaken: countTestsTaken(records),
    firstTestPaperKey: seriesPaperKeyOfWorksheetId(firstCountedTestWorksheetId(records)),
  });
}

/** The paper a download is for (its pack cover). Same shape as SeriesAccessPaper (kept for PACK-DOWNLOAD-RESTORE, #1763). */
export type DownloadPaper = SeriesAccessPaper;

/**
 * PACK-DOWNLOAD-RESTORE (#1763): the boolean download decision for a page that does not need the three-state `useSeriesAccess`:
 * a Board Pass holder / Test Series owner (`checkAccess`), or an owner of a PDF pack covering the paper. Loading or failed = "no".
 */
export function useSeriesDownloadAccess(uid: string | null | undefined, checkAccess: boolean, paper: DownloadPaper | null): boolean {
  const off = writtenCheckGateDisabled();
  const ask = !off && !checkAccess && uid ? uid : null;
  const packs = useOwnedPacks(ask ?? "", Boolean(ask));
  if (checkAccess || off) return true;
  const covers =
    packs.phase === "ready" && paper
      ? paper.kind === "chapter-test"
        ? Boolean(paper.chapterSlug) && ownsChapter(packs.packs, paper.chapterSlug as string)
        : ownsMocks(packs.packs, paper.subject)
      : false;
  return canDownloadPaper({ paidPremium: false, ownsTestSeries: false, ownsCoveringPack: covers });
}

export const ACCESS_CHECKING_LINE = "Checking your access…";
export const ACCESS_FAILED_LINE = "Couldn't confirm your purchase";
export const NO_CHECKS_LEFT_LINE = "No checks left on this paper";
/** TS-FREE-CHECK-1: the label beside the free test's checks-left line. */
export const FREE_TEST_CHECKS_LABEL = "Your free test";
export const SERIES_ONLY_NOTE = "Your Test Series checks the numbered series papers. The Board Pass checks written answers on any paper.";

/** Neutral state while ownership is read - never an upgrade wall. */
export function AccessChecking() {
  return (
    <p className="lt-wcg__line" role="status" data-testid="series-access-checking">
      {ACCESS_CHECKING_LINE}
    </p>
  );
}

/** The ownership read failed: an honest retry, never a paywall. */
export function AccessFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="lt-wcg" role="alert" data-testid="series-access-failed">
      <p className="lt-wcg__line">{ACCESS_FAILED_LINE}.</p>
      <button type="button" className="lt-wcg__btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/** "CT-M01" from the manifest key "TS-CT-M01". */
function paperCodeOfKey(key: string | null): string | null {
  return key ? key.replace(/^TS-/, "") : null;
}

/** The plain sentence for a series paper whose checks are all used (live-test finding: say it before any upgrade offer). */
export function checksUsedLine(code: string | null, per: number): string {
  return `You've used ${per === 2 ? "both checks" : `all ${per} checks`} on this paper${code ? ` (${code})` : ""}. Your other papers have their own ${per} checks each.`;
}

/** TS-FREE-CHECK-1: the free test's checks are all used. */
export function freeTestChecksUsedLine(code: string | null, per: number): string {
  return `You've used ${per === 2 ? "both checks" : `all ${per} checks`} on your free test${code ? ` (${code})` : ""}. The Test Series and the Board Pass check your written answers on every paper.`;
}

/**
 * Beside the upload when a series paper has 0 checks left: say so (no point uploading) and offer the Board Pass (only).
 * TS-FREE-CHECK-1: on the free test (`freeTest`), both offers - the student has bought neither.
 */
export function NoChecksLeftCard({ code, per = 2, freeTest = false }: { code?: string | null; per?: number; freeTest?: boolean } = {}) {
  return (
    <div className="lt-wcg" role="status" data-testid="series-no-checks-left">
      <p className="lt-wcg__checks" data-testid="series-zero-checks-line">
        0 of {per} checks left on this paper
      </p>
      <p className="lt-wcg__line">
        {freeTest ? freeTestChecksUsedLine(code ?? null, per) : `${checksUsedLine(code ?? null, per)} The Board Pass checks every answer, with no per-paper limit.`}
      </p>
      {freeTest ? <SeriesOfferButtons testIdPrefix="no-checks" /> : <SeriesOfferButtons testIdPrefix="no-checks" only="board-pass" />}
    </div>
  );
}

/**
 * A Test Series owner whose upload was refused. On a SERIES paper that is "both checks used" (with the Board Pass, no per-paper limit);
 * on a non-series paper it is the series-only note. Board Pass only - never a Chapter Pack or PDF-pack sheet.
 */
export function SeriesOwnerNotice({ onClose, worksheetId, status }: { onClose: () => void; worksheetId?: string | null; status?: TestSeriesStatus | null }) {
  const key = seriesPaperKeyOfWorksheetId(worksheetId);
  return (
    <div className="lt-wcg" role="alert" data-testid="series-owner-notice">
      <p className="lt-wcg__line">
        {key ? `${checksUsedLine(paperCodeOfKey(key), status?.checksPerPaper ?? 2)} The Board Pass checks every answer, with no per-paper limit.` : SERIES_ONLY_NOTE}
      </p>
      <SeriesOfferButtons testIdPrefix="series-owner" only="board-pass" />
      <button type="button" className="lt-wcg-tutor__close" onClick={onClose}>
        Not now
      </button>
    </div>
  );
}

/**
 * MYPACKS-TS-1: what the result screen shows in place of / as the upload panel. `uploadAllowed` = a Board Pass holder, a Test Series
 * owner, or a paper started before the new rules (grandfathered). Ownership still loading -> "Checking your access…"; a failed read ->
 * a retry - never the upgrade card. A series paper with 0 checks left -> "No checks left on this paper" + the Board Pass.
 */
export function ResultAccessSlot({
  access,
  uploadAllowed,
  worksheetId,
  upgrade,
  upload,
}: {
  access: SeriesAccess;
  uploadAllowed: boolean;
  worksheetId: string | null | undefined;
  upgrade: ReactNode;
  upload: ReactNode;
}) {
  if (uploadAllowed) {
    const key = seriesPaperKeyOfWorksheetId(worksheetId);
    const left = access.ownsSeries && key && access.status ? access.status.checksPerPaper - (access.status.used[key] ?? 0) : null;
    if (left !== null && left <= 0) return <NoChecksLeftCard code={paperCodeOfKey(key)} per={access.status?.checksPerPaper ?? 2} />;
    // TS-FREE-CHECK-1: the free test's paper with both checks used (the SERVER's count).
    const free = !access.ownsSeries && !access.canCheck && key && access.freeTest && access.freeTest.paperKey === key ? access.freeTest : null;
    if (free && free.checksPerPaper - free.used <= 0) return <NoChecksLeftCard code={paperCodeOfKey(key)} per={free.checksPerPaper} freeTest />;
    return <>{upload}</>;
  }
  if (access.checking) return <AccessChecking />;
  if (access.failed) return <AccessFailed onRetry={access.retry} />;
  return <>{upgrade}</>;
}

/**
 * Before Start: a free / trial account that has not used its one test says so. TS-FREE-CHECK-1: `written` (this paper's written
 * answers will be checked as the free test - `seriesFreeTestWritten`) says written answers are marked step by step; otherwise the
 * MCQ-only line (the kill switch, a non-series paper, or a free paper pinned elsewhere).
 */
export function FreeTestNote({ written = false }: { written?: boolean } = {}) {
  return (
    <p className="lt-wcg__line" data-testid="series-free-test-note" data-written={written ? "1" : "0"}>
      {freeTestNote(written)}
    </p>
  );
}

/**
 * TS-PACK-1 — "Checks left on this paper: 1 of 2" for a Test Series Pack owner (not a Board Pass holder) on a series paper's upload
 * and result screens. The SERVER's count (refreshed when `refreshKey` changes, e.g. after a grade); nothing when unknown.
 */
export function SeriesChecksLeftLine({
  uid,
  worksheetId,
  refreshKey,
  freeTest = false,
}: {
  uid?: string | null;
  worksheetId: string | null | undefined;
  refreshKey?: unknown;
  /** TS-FREE-CHECK-1: this paper is the account's free test (`seriesFreeTestWritten`): show its checks from the server's free-test count. */
  freeTest?: boolean;
}) {
  const { status } = useSubscription();
  const paid = isPaidPremium(status);
  const paperKey = seriesPaperKeyOfWorksheetId(worksheetId);
  const own = useTestSeriesOwnership(!paid && paperKey ? uid : null, refreshKey);
  if (paid || !paperKey) return null;
  if (!own.owns) {
    const f = freeTest && !freeWrittenCheckDisabled() ? own.freeTest : null;
    if (!f || (f.paperKey !== null && f.paperKey !== paperKey)) return null;
    const used = f.paperKey === paperKey ? f.used : 0;
    return (
      <>
        {f.paperKey === paperKey && f.freeRecheck && (
          <p className="lt-wcg__line" role="status" data-testid="series-recheck-note">
            {SHEET_UNREADABLE_NOT_COUNTED_LINE}
          </p>
        )}
        <p className="lt-wcg__checks" role="status" data-testid="series-checks-left">
          {FREE_TEST_CHECKS_LABEL} · Checks left on this paper: {Math.max(0, f.checksPerPaper - used)} of {f.checksPerPaper}
        </p>
      </>
    );
  }
  const line = testSeriesChecksLeftLine(own.status, paperKey);
  if (!line) return null;
  return (
    <>
      {testSeriesRecheckNote(own.status, paperKey) && (
        <p className="lt-wcg__line" role="status" data-testid="series-recheck-note">
          {SHEET_UNREADABLE_NOT_COUNTED_LINE}
        </p>
      )}
      <p className="lt-wcg__checks" role="status" data-testid="series-checks-left">
        {line}
      </p>
    </>
  );
}

/** True for a Board Pass holder (PAID premium) — the only account the scorecard's tutor entry opens the tutor for. */
export function useBoardPassHolder(): boolean {
  const { status } = useSubscription();
  return writtenCheckGateDisabled() || isPaidPremium(status);
}

/** The two offers, equal weight: the Test Series and the Board Pass (its price is date-driven, so read after mount). */
export function SeriesOfferButtons({ testIdPrefix, only }: { testIdPrefix: string; /** "board-pass": the tutor / no-checks walls offer the Board Pass ONLY (the Test Series has no tutor). */ only?: "board-pass" }) {
  const [bpPrice, setBpPrice] = useState<string | null>(null);
  // TS-NAV-1: on a series paper the buy pages get `from=test-series&returnTo=<paper>` so their Back row leads back to the paper.
  const { pathname, search } = useLocation();
  useEffect(() => setBpPrice(boardPassPriceDisplay(Date.now())), []);
  return (
    <div className="lt-wcg__offers">
      {only !== "board-pass" && (
      <Link className="lt-wcg__btn" to={tagWhenSeriesPaper(TEST_SERIES_BUY_PATH, pathname, search)} data-testid={`${testIdPrefix}-ts`}>
        <span className="lt-wcg__main">Test Series</span>
        <span className="lt-wcg__price">{testSeriesPriceLine()} · all {seriesTotals().total} tests</span>
      </Link>
      )}
      <Link className="lt-wcg__btn" to={tagWhenSeriesPaper(BOARD_PASS_PATH, pathname, search)} data-testid={`${testIdPrefix}-bp`}>
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
          {/* TS-THEMES-1: a focus set has no Section A - only its code (never "0/0"). */}
          {objective.total > 0 ? (
            <>
              {code} · Section A marked: <b>{objective.awarded}/{objective.total}</b>
            </>
          ) : (
            code
          )}
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
  const { pathname, search } = useLocation();
  return (
    <Link className="lt-wcg__dl" to={tagWhenSeriesPaper(TEST_SERIES_BUY_PATH, pathname, search)} data-testid="download-with-plan">
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
        <SeriesOfferButtons testIdPrefix="tutor-wall" only="board-pass" />
        <button type="button" className="lt-wcg-tutor__close" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
