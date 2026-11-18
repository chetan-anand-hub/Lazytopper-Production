import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { getSessionRecordsFromCloud } from "../services/sessionRecords";
import { predictCbseExamDate } from "../services/cbseExamDate";
import { boardPassPriceDisplay } from "../config/pricing";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  PACK_MATCHED_MOCKS,
  TEST_SERIES_BUY_PATH,
  TEST_SERIES_NAME,
  TEST_SERIES_PATH,
  currentScheduleRow,
  seriesChapterTests,
  seriesContentsLine,
  seriesFullMocks,
  seriesProgress,
  seriesSchedule,
  seriesTotals,
  testSeriesPriceDisplay,
  type SeriesProgress,
  type SeriesScheduleRow,
  type SeriesSubject,
  type SeriesTestProgress,
} from "../lib/testSeries/testSeries";
import "../components/salesPages/salesPages.css";
import "./testSeriesPage.css";

// TS-ANALYSIS-1 — the Mistake notebook (signed-in only, its own chunk, opened from the progress line).
const MistakeNotebookSection = lazy(() => import("../components/testAnalysis/MistakeNotebookSection"));

/**
 * TEST-SERIES-1 (owner, 18 Nov 2026; corrected 19:38 IST: the Test Series is its OWN product) — /test-series: the chapter tests
 * and full mocks as a numbered Pre-Boards Test Series. Public sales page; every count comes from lib/testSeries (the syllabus keys and MOCKS_PER_SUBJECT). Progress is read from
 * the student's REAL session records (signed in only); signed out sees the series and a sign-in prompt, never invented progress.
 * Nothing here gates or grants anything: taking a test follows the Chapter Test / Full Mock pages' own rules. The price is the ONE
 * constant in lib/testSeries (TS-PACK-1 replaces it with the real pricing helper and the `test_series` SKU).
 *
 * Layout stability (CLS 0): the price, the progress line, the status chips and the trend box all have reserved slots, so what arrives
 * after mount (the clock-derived price, auth, records) changes text inside fixed boxes and moves nothing.
 */

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];
/** Owner ruling 18 Nov 2026, 19:31 IST — said plainly on the page. */
export const TEST_SERIES_ACCESS_LINE = "MCQs marked free · written answers checked with the Test Series or the Board Pass";
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(TEST_SERIES_PATH)}`;

function istToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

type Load = { state: "signed-out" } | { state: "loading" } | { state: "ready"; progress: SeriesProgress };

function chipText(p: SeriesTestProgress | undefined, signedIn: boolean): string {
  if (!signedIn || !p || p.status === "not-started") return "Start";
  if (p.status === "graded" && p.score) return `${p.score.awarded}/${p.score.total}`;
  return "Attempted";
}

function StatusChip({ p, signedIn }: { p: SeriesTestProgress | undefined; signedIn: boolean }) {
  const status = signedIn && p ? p.status : "not-started";
  return (
    <span className={`lt-ts-chip lt-ts-chip--${status}`} data-testid="ts-chip" data-status={status}>
      {chipText(p, signedIn)}
    </span>
  );
}

function ScheduleList({ rows, current }: { rows: SeriesScheduleRow[]; current: SeriesScheduleRow["id"] | null }) {
  return (
    <ol className="lt-ts-cal" data-testid="ts-schedule">
      {rows.map((r) => (
        <li key={r.id} className={`lt-ts-cal__row${current === r.id ? " is-now" : ""}`} data-testid={`ts-cal-${r.id}`}>
          <span className="lt-ts-cal__when">{r.when}</span>
          <span className="lt-ts-cal__what">
            <strong>{r.title}</strong>
            <span>{r.body}</span>
          </span>
          <span className="lt-ts-cal__now" aria-hidden={current !== r.id}>
            {current === r.id ? "Now" : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function MockTrend({ load }: { load: Load }) {
  let body: ReactNode;
  if (load.state !== "ready") {
    body = (
      <p className="lt-ts-trend__empty">
        {load.state === "signed-out" ? "Sign in and take a full-length test to see your score trend here." : "Loading your scores…"}
      </p>
    );
  } else if (SUBJECTS.every((s) => load.progress.mockTrend[s].length === 0)) {
    body = <p className="lt-ts-trend__empty">Your score trend appears here once a full-length test is graded.</p>;
  } else {
    body = (
      <div className="lt-ts-trend__rows">
        {SUBJECTS.map((s) => (
          <div key={s} className="lt-ts-trend__row" data-testid={`ts-trend-${s}`}>
            <span className="lt-ts-trend__subj">{s}</span>
            <span className="lt-ts-trend__bars">
              {load.progress.mockTrend[s].length === 0 ? (
                <span className="lt-ts-trend__none">No graded test yet</span>
              ) : (
                load.progress.mockTrend[s].map((t) => (
                  <span key={t.code} className="lt-ts-trend__bar" title={`${t.code}: ${t.percent}%`}>
                    <progress max={100} value={t.percent} aria-label={`${t.code} ${t.percent}%`} />
                    <span className="lt-ts-trend__lbl">
                      M{t.n} · {t.percent}%
                    </span>
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="lt-ts-trend" data-testid="ts-trend">
      <p className="lt-ts-trend__title">Your full-length test score trend</p>
      {body}
    </div>
  );
}

export default function TestSeriesPage() {
  const { user, loading: authLoading } = useAuth();
  const subscription = useSubscription();
  const signedIn = Boolean(user?.uid) && !user?.isLocalSession;
  const totals = useMemo(() => seriesTotals(), []);
  const chapters = useMemo(() => seriesChapterTests(), []);
  const mocks = useMemo(() => seriesFullMocks(), []);
  const schedule = useMemo(() => seriesSchedule(predictCbseExamDate("10")), []);

  // After mount only: today's schedule row and the prices (the prerender carries none: every price node is stripped at capture).
  const [current, setCurrent] = useState<SeriesScheduleRow["id"] | null>(null);
  const [prices, setPrices] = useState<{ ts: string; bp: string } | null>(null);
  useEffect(() => {
    const now = new Date();
    if (schedule) setCurrent(currentScheduleRow(schedule, istToday(now)));
    // The Test Series price is ONE constant in lib/testSeries (TS-PACK-1 swaps in the pricing helper); the Board Pass price is
    // date-driven (founding price till 30 Nov, list price from 1 Dec).
    setPrices({ ts: `${testSeriesPriceDisplay()} till your boards`, bp: `${boardPassPriceDisplay(now)} till your boards` });
  }, [schedule]);

  const [load, setLoad] = useState<Load>({ state: "signed-out" });
  const [notebookOpen, setNotebookOpen] = useState(false);
  // The section mounts on the tap, so the anchor jump happens once it exists.
  useEffect(() => {
    if (notebookOpen) document.getElementById("mistake-notebook")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [notebookOpen]);
  useEffect(() => {
    if (authLoading) return undefined;
    if (!signedIn || !user?.uid) {
      setLoad({ state: "signed-out" });
      return undefined;
    }
    let live = true;
    setLoad({ state: "loading" });
    getSessionRecordsFromCloud(user.uid)
      .then((records) => {
        if (live) setLoad({ state: "ready", progress: seriesProgress(records) });
      })
      .catch(() => {
        if (live) setLoad({ state: "ready", progress: seriesProgress([]) });
      });
    return () => {
      live = false;
    };
  }, [authLoading, signedIn, user?.uid]);

  const progress = load.state === "ready" ? load.progress : null;
  const holdsPremium = signedIn && subscription.hydrated && subscription.status.tier === "premium";

  const testList = (list: Array<{ code: string; href: string; name: string }>, testId: string, compact = false) => (
    <ul className={`lt-ts-list${compact ? " lt-ts-list--mocks" : ""}`} data-testid={testId}>
      {list.map((t) => (
        <li key={t.code}>
          <Link className="lt-ts-item" to={t.href} data-testid={`ts-test-${t.code}`}>
            <span className="lt-ts-item__code">{t.code}</span>
            <span className="lt-ts-item__name">{t.name}</span>
            <StatusChip p={progress?.byCode[t.code]} signedIn={Boolean(progress)} />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <main className="lt-sp lt-ts" aria-label={`LazyTopper ${TEST_SERIES_NAME}`}>
        <section className="lt-ts-hero" aria-labelledby="ts-h1">
          <div className="lt-sp__w lt-ts-hero__copy">
            <p className="lt-sp-eyebrow lt-ts-hero__eyebrow">{TEST_SERIES_NAME.toUpperCase()} · 2026-27</p>
            <h1 id="ts-h1" className="lt-ts-hero__h1">
              CBSE Class 10 Test Series: Maths &amp; Science
            </h1>
            <p className="lt-ts-hero__lede" data-testid="ts-contents">
              <strong>{seriesContentsLine(totals)}</strong>, numbered and fixed: every student sits the same paper, so your score
              means something.
            </p>
            <p className="lt-ts-hero__rule" data-testid="ts-rule">
              {TEST_SERIES_ACCESS_LINE}
            </p>
            <div className="lt-ts-progress" data-testid="ts-progress">
              {load.state === "signed-out" ? (
                <p>
                  <Link to={LOGIN_HREF} data-testid="ts-signin">
                    Sign in
                  </Link>{" "}
                  to take a test and track your progress through all {totals.total}.
                </p>
              ) : progress ? (
                <>
                  <p data-testid="ts-done">
                    <strong>
                      {progress.done} of {progress.total}
                    </strong>{" "}
                    tests done.
                  </p>
                  <p>
                    <a href="#mistake-notebook" data-testid="ts-notebook-link" onClick={() => setNotebookOpen(true)}>
                      Open my mistake notebook
                    </a>
                  </p>
                </>
              ) : (
                <p>Loading your progress…</p>
              )}
            </div>
          </div>
        </section>

        <section className="lt-sp__w" aria-labelledby="ts-offers-h">
          <h2 id="ts-offers-h" className="lt-sp-h2">
            Take all {totals.total} tests
          </h2>
          <p className="lt-sp-lede">Free and trial accounts can take one test, with its MCQs marked. Pick the plan that fits you.</p>
          <div className="lt-ts-offers" data-testid="ts-offers">
            <div className="lt-ts-offer lt-ts-offer--ts" data-testid="ts-offer-ts">
              <p className="lt-ts-offer__name">Test Series</p>
              <p className="lt-ts-offer__price">{prices && <span data-testid="till-boards-figures">{prices.ts}</span>}</p>
              <ul className="lt-ts-offer__list">
                <li>All {totals.total} tests: {seriesContentsLine(totals)}</li>
                <li>Every written answer checked step by step, like a CBSE examiner</li>
                <li>Full scorecard and your graded answer sheet, step by step, on screen</li>
                <li>Download and print every paper</li>
              </ul>
              {holdsPremium ? (
                <p className="lt-ts-offer__owner" data-testid="ts-cta-owner">
                  Your Board Pass already includes every test.
                </p>
              ) : (
                <Link className="lt-ts-offer__btn" to={TEST_SERIES_BUY_PATH} data-testid="ts-cta-buy">
                  Get the Test Series →
                </Link>
              )}
            </div>
            <div className="lt-ts-offer lt-ts-offer--bp" data-testid="ts-offer-bp">
              <p className="lt-ts-offer__name">Board Pass</p>
              <p className="lt-ts-offer__price">{prices && <span data-testid="till-boards-figures">{prices.bp}</span>}</p>
              <ul className="lt-ts-offer__list">
                <li>Everything in the Test Series</li>
                <li>Every answer checked everywhere (Answer Checker, worksheets)</li>
                <li>Your personal tutor</li>
                <li>Mistake Intelligence</li>
              </ul>
              <Link className="lt-ts-offer__btn lt-ts-offer__btn--bp" to="/board-pass" data-testid="ts-bp-link">
                {holdsPremium ? "Your Board Pass →" : "See the Board Pass →"}
              </Link>
            </div>
            <Link className="lt-ts-offer lt-ts-offer--packs" to="/packs" data-testid="ts-packs">
              <p className="lt-ts-offer__name">Prefer printed papers?</p>
              <p className="lt-ts-offer__packs">PDF Packs / Bundle: chapter, mock and subject papers to print, with answer explanations →</p>
            </Link>
          </div>
        </section>

        {schedule && (
          <section className="lt-sp__w" aria-labelledby="ts-cal-h">
            <h2 id="ts-cal-h" className="lt-sp-h2">
              Your pre-boards calendar
            </h2>
            <p className="lt-sp-lede">A recommended plan, not a lock: take any test whenever you are ready.</p>
            <ScheduleList rows={schedule} current={current} />
          </section>
        )}

        <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-ct-h" data-testid="ts-sec-chapter">
          <h2 id="ts-ct-h" className="lt-sp-h2">
            Chapter Tests ({totals.chapterTests})
          </h2>
          <p className="lt-sp-lede">One board-pattern test per chapter of the 2026-27 syllabus, Sections A to D.</p>
          <div className="lt-ts-grid">
            {SUBJECTS.map((s) => (
              <div key={s} className="lt-ts-col">
                <h3 className="lt-ts-col__h">
                  {s} ({totals.chapterTestsPerSubject[s]})
                </h3>
                {testList(
                  chapters.filter((c) => c.subject === s).map((c) => ({ code: c.code, href: c.href, name: c.label })),
                  `ts-chapters-${s}`,
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-fm-h" data-testid="ts-sec-full">
          <h2 id="ts-fm-h" className="lt-sp-h2">
            Full-Length Tests ({totals.fullMocks})
          </h2>
          <p className="lt-sp-lede">
            Full board-pattern papers (80 marks, 3 hours), {totals.mocksPerSubject} per subject. Tests 1–{PACK_MATCHED_MOCKS} are the
            same papers as Mocks 1–{PACK_MATCHED_MOCKS} in the printed Mock Pack.
          </p>
          <div className="lt-ts-grid">
            {SUBJECTS.map((s) => (
              <div key={s} className="lt-ts-col">
                <h3 className="lt-ts-col__h">
                  {s} ({totals.mocksPerSubject})
                </h3>
                {testList(
                  mocks.filter((m) => m.subject === s).map((m) => ({ code: m.code, href: m.href, name: `Full-Length Test ${m.n}` })),
                  `ts-mocks-${s}`,
                  true,
                )}
              </div>
            ))}
          </div>
          <MockTrend load={load} />
        </section>

        <section className="lt-sp__w" aria-labelledby="ts-how-h">
          <div className="lt-ts-how" data-testid="ts-how">
            <h2 id="ts-how-h" className="lt-sp-h2">
              How your tests are marked
            </h2>
            <ul className="lt-ts-how__list">
              <li>Section A (the MCQs) is marked the moment you submit, free on every account.</li>
              <li>
                Sections B to D (and E in full-length tests): write on paper and upload a photo. <strong>The Test Series checks every
                written answer step by step</strong>, like a CBSE examiner, and shows where each mark was lost.
              </li>
              <li>Downloading and printing these papers comes with the Test Series and the Board Pass.</li>
            </ul>
          </div>
        </section>
        {/* TS-ANALYSIS-1 — last in the page, so opening it moves nothing above it. */}
        {notebookOpen && progress && user?.uid && (
          <section className="lt-sp__w" id="mistake-notebook" aria-label="Mistake notebook" data-testid="ts-notebook">
            <Suspense fallback={null}>
              <MistakeNotebookSection uid={user.uid} returnTo={TEST_SERIES_PATH} />
            </Suspense>
          </section>
        )}
      </main>
      <PublicLegalFooter />
    </>
  );
}
