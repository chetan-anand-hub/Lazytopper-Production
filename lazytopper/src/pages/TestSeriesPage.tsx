import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { getSessionRecordsFromCloud } from "../services/sessionRecords";
import { predictCbseExamDate } from "../services/cbseExamDate";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  TEST_SERIES_NAME,
  TEST_SERIES_PATH,
  currentScheduleRow,
  seriesChapterTests,
  seriesContentsLine,
  seriesFullMocks,
  seriesProgress,
  seriesSchedule,
  seriesTotals,
  type SeriesProgress,
  type SeriesScheduleRow,
  type SeriesSubject,
  type SeriesTestProgress,
} from "../lib/testSeries/testSeries";
import { testSeriesPriceLine } from "../lib/testSeries/testSeriesPrice";
import "../components/salesPages/salesPages.css";
import "./testSeriesPage.css";

/**
 * TEST-SERIES-1 (owner, 18 Nov 2026) — /test-series: the Board Pass's chapter tests and full mocks as a numbered Pre-Boards Test
 * Series. Public sales page; every count comes from lib/testSeries (the syllabus keys and MOCKS_PER_SUBJECT). Progress is read from
 * the student's REAL session records (signed in only); signed out sees the series and a sign-in prompt, never invented progress.
 * Nothing here gates, prices or grants anything: taking a test follows the Chapter Test / Full Mock pages' own rules.
 *
 * Layout stability (CLS 0): the price, the progress line, the status chips and the trend box all have reserved slots, so what arrives
 * after mount (the clock-derived price, auth, records) changes text inside fixed boxes and moves nothing.
 */

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];
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
        {load.state === "signed-out" ? "Sign in and take a full mock to see your score trend here." : "Loading your scores…"}
      </p>
    );
  } else if (SUBJECTS.every((s) => load.progress.mockTrend[s].length === 0)) {
    body = <p className="lt-ts-trend__empty">Your score trend appears here once a full mock is graded.</p>;
  } else {
    body = (
      <div className="lt-ts-trend__rows">
        {SUBJECTS.map((s) => (
          <div key={s} className="lt-ts-trend__row" data-testid={`ts-trend-${s}`}>
            <span className="lt-ts-trend__subj">{s}</span>
            <span className="lt-ts-trend__bars">
              {load.progress.mockTrend[s].length === 0 ? (
                <span className="lt-ts-trend__none">No graded mock yet</span>
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
      <p className="lt-ts-trend__title">Your full mock score trend</p>
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

  // After mount only: today's schedule row and the date-driven price (the prerender carries neither).
  const [current, setCurrent] = useState<SeriesScheduleRow["id"] | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    if (schedule) setCurrent(currentScheduleRow(schedule, istToday(now)));
    setPrice(testSeriesPriceLine(now));
  }, [schedule]);

  const [load, setLoad] = useState<Load>({ state: "signed-out" });
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
              means something. Every test is open today.
            </p>
            <div className="lt-ts-progress" data-testid="ts-progress">
              {load.state === "signed-out" ? (
                <p>
                  <Link to={LOGIN_HREF} data-testid="ts-signin">
                    Sign in
                  </Link>{" "}
                  to track your progress through all {totals.total} tests.
                </p>
              ) : progress ? (
                <p data-testid="ts-done">
                  <strong>
                    {progress.done} of {progress.total}
                  </strong>{" "}
                  tests done.
                </p>
              ) : (
                <p>Loading your progress…</p>
              )}
            </div>
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

        <section className="lt-sp__w" aria-labelledby="ts-fm-h">
          <h2 id="ts-fm-h" className="lt-sp-h2">
            Full Mocks ({totals.fullMocks})
          </h2>
          <p className="lt-sp-lede">
            Full board-pattern papers, {totals.mocksPerSubject} per subject, 3 hours each. Each one is the same paper as the matching
            mock in the printed Mock Pack.
          </p>
          <div className="lt-ts-grid">
            {SUBJECTS.map((s) => (
              <div key={s} className="lt-ts-col">
                <h3 className="lt-ts-col__h">{s}</h3>
                <ul className="lt-ts-list lt-ts-list--mocks" data-testid={`ts-mocks-${s}`}>
                  {mocks
                    .filter((m) => m.subject === s)
                    .map((m) => (
                      <li key={m.code}>
                        <Link className="lt-ts-item" to={m.href} data-testid={`ts-test-${m.code}`}>
                          <span className="lt-ts-item__code">{m.code}</span>
                          <span className="lt-ts-item__name">Full Mock {m.n}</span>
                          <StatusChip p={progress?.byCode[m.code]} signedIn={Boolean(progress)} />
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <MockTrend load={load} />
        </section>

        <section className="lt-sp__w" aria-labelledby="ts-ct-h">
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
                <ul className="lt-ts-list" data-testid={`ts-chapters-${s}`}>
                  {chapters
                    .filter((c) => c.subject === s)
                    .map((c) => (
                      <li key={c.code}>
                        <Link className="lt-ts-item" to={c.href} data-testid={`ts-test-${c.code}`}>
                          <span className="lt-ts-item__code">{c.code}</span>
                          <span className="lt-ts-item__name">{c.label}</span>
                          <StatusChip p={progress?.byCode[c.code]} signedIn={Boolean(progress)} />
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="lt-sp__w" aria-labelledby="ts-how-h">
          <div className="lt-ts-how" data-testid="ts-how">
            <h2 id="ts-how-h" className="lt-sp-h2">
              How your tests are marked
            </h2>
            <ul className="lt-ts-how__list">
              <li>Section A (objective) is marked the moment you submit, on every account.</li>
              <li>
                Sections B to D (and E in full mocks): write on paper and upload a photo. <strong>Board Pass checks every written answer
                step by step</strong>, like a CBSE examiner, and shows where each mark was lost.
              </li>
              <li>Every new account starts with a 7-day free trial.</li>
            </ul>
            <div className="lt-ts-cta" data-testid="ts-cta">
              {holdsPremium ? (
                <p className="lt-ts-cta__owner" data-testid="ts-cta-owner">
                  Your plan checks every written answer. Pick a test above and start.
                </p>
              ) : (
                <Link className="lt-ts-cta__btn" to="/board-pass" data-testid="ts-cta-bp">
                  <span className="lt-ts-cta__main">Get the Board Pass →</span>
                  <span className="lt-ts-cta__price">{price && <span data-testid="till-boards-figures">{price}</span>}</span>
                </Link>
              )}
            </div>
            <Link className="lt-ts-packs" to="/packs" data-testid="ts-packs">
              Prefer printed papers? Mock Pack / Bundle →
            </Link>
          </div>
        </section>
      </main>
      <PublicLegalFooter />
    </>
  );
}
