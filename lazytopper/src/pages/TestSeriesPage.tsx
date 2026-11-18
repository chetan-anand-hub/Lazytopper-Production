import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { getSessionRecordsFromCloud } from "../services/sessionRecords";
import { predictCbseExamDate } from "../services/cbseExamDate";
import { boardPassPriceDisplay, FOUNDING_OFFER_LAST_DAY_LABEL, foundingOfferOpen } from "../config/pricing";
import { packPriceLabel, TEST_SERIES_CHECKS_PER_PAPER } from "../services/packs";
import { isPaidPremium } from "../services/subscriptionService";
import { useTestSeriesOwnership } from "../components/testSeries/testSeriesOwnership";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  TEST_SERIES_BUY_PATH,
  TEST_SERIES_NAME,
  TEST_SERIES_PATH,
  currentScheduleRow,
  seriesChapterTests,
  seriesFullMocks,
  seriesMockRounds,
  seriesProgress,
  seriesSchedule,
  seriesTotals,
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
 * TEST-SERIES-1 / TS-PAGE-2 (owner, 18 Nov 2026) — /test-series: the Pre-Boards Test Series as a sales page and a cockpit.
 * Every count comes from lib/testSeries (the syllabus keys and SERIES_MOCKS_PER_SUBJECT); progress only from the student's REAL
 * session records (signed in), never invented. Nothing here gates or grants anything: taking a test follows the Chapter Test /
 * Full Mock pages' own rules (`?series=1`, `?paper=n`, canCheckSeriesPapers, the one-test rule).
 *
 * TS-PAGE-2 layout: hero → calendar ribbon → the tests (two tabs; one accordion per subject; full-length tests grouped by the
 * calendar's rounds) → the offers (collapsed behind "Upgrade / other plans" for an owner) → how tests are marked.
 *
 * ★ PRERENDER + CLS 0 (the "flash", STUDENT_REVIEW §2). The capture strip (captureStaticBodies.ts rule 2) deletes the whole
 * enclosing <section> of any /login link — it used to delete this page's hero, so the static page had no H1 and the hero was
 * inserted on mount. So: NO /login link sits inside a <section> (the sign-in prompt is a <p> + <a> pair in the hero's reserved
 * `lt-ts-me` box, a <header>; the strip removes that pair and the box keeps its height). Clock-derived bits (the founding line,
 * the calendar's "Now") carry `data-lt-clock` and are written only after mount, so no build clock is baked into the file.
 * Everything that arrives after mount (prices, progress, owner CTA) changes text inside fixed-size boxes.
 */

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];
/** Owner ruling 18 Nov 2026, 19:31 IST — said plainly on the page. */
export const TEST_SERIES_ACCESS_LINE = "MCQs marked free · written answers checked with the Test Series or the Board Pass";
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(TEST_SERIES_PATH)}`;
const TESTS_ANCHOR = "ts-tests";

function istToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

type Load = { state: "signed-out" } | { state: "loading" } | { state: "ready"; progress: SeriesProgress };
type Tab = "chapter" | "full";

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

/** A small bar of REAL progress (done of total); signed out it shows the count only, in the same box. */
function MiniProgress({ done, total, show, testId }: { done: number; total: number; show: boolean; testId: string }) {
  return (
    <span className="lt-ts-mini" data-testid={testId}>
      {show ? (
        <>
          <progress className="lt-ts-mini__bar" max={total} value={done} aria-label={`${done} of ${total} done`} />
          <span className="lt-ts-mini__lbl">
            {done}/{total} done
          </span>
        </>
      ) : (
        <span className="lt-ts-mini__lbl">{total} tests</span>
      )}
    </span>
  );
}

function CalendarRibbon({ rows, current }: { rows: SeriesScheduleRow[]; current: SeriesScheduleRow["id"] | null }) {
  return (
    <ol className="lt-ts-cal" data-testid="ts-schedule">
      {rows.map((r, i) => (
        // The "Now" highlight is CSS on the row (:has the clock node), never a class: the capture strips the clock node, so the
        // static file never marks a row from the build machine's clock.
        <li key={r.id} className="lt-ts-cal__row" data-testid={`ts-cal-${r.id}`}>
          <span className="lt-ts-cal__dot" aria-hidden="true">
            {i + 1}
          </span>
          <span className="lt-ts-cal__when">
            {r.when}
            <span className="lt-ts-cal__now">{current === r.id ? <span data-lt-clock="" data-testid="ts-cal-now">Now</span> : null}</span>
          </span>
          <strong className="lt-ts-cal__title">{r.title}</strong>
          <span className="lt-ts-cal__body">{r.body}</span>
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

/** One keyboard-operable disclosure: a real <button aria-expanded> that controls a region (hidden when closed, still in the DOM). */
function Accordion({
  id,
  open,
  onToggle,
  title,
  meta,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  title: string;
  meta: ReactNode;
  children: ReactNode;
}) {
  const panelId = `${id}-panel`;
  return (
    <div className={`lt-ts-acc${open ? " is-open" : ""}`} data-testid={id}>
      <h3 className="lt-ts-acc__h">
        <button
          type="button"
          className="lt-ts-acc__btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          data-testid={`${id}-toggle`}
        >
          <span className="lt-ts-acc__title">{title}</span>
          {meta}
          <span className="lt-ts-acc__chev" aria-hidden="true" />
        </button>
      </h3>
      <div id={panelId} className="lt-ts-acc__panel" hidden={!open}>
        {children}
      </div>
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
  const rounds = useMemo(() => seriesMockRounds(), []);
  const schedule = useMemo(() => seriesSchedule(predictCbseExamDate("10")), []);

  // After mount only: today's schedule row, the founding line and the prices (the capture strips every price and clock node).
  const [current, setCurrent] = useState<SeriesScheduleRow["id"] | null>(null);
  const [prices, setPrices] = useState<{ ts: string; bp: string; founding: string | null } | null>(null);
  useEffect(() => {
    const now = new Date();
    if (schedule) setCurrent(currentScheduleRow(schedule, istToday(now)));
    // TS-PACK-1: the Test Series price is the `test_series` SKU's ("₹999 + GST"); the Board Pass price is date-driven (founding
    // price till 30 Nov, list price from 1 Dec). The founding line shows only while that offer is really open.
    setPrices({
      ts: `${packPriceLabel("test_series", now)} till your boards`,
      bp: `${boardPassPriceDisplay(now)} till your boards`,
      founding: foundingOfferOpen(now) ? `Founding season: the Board Pass is ${boardPassPriceDisplay(now)} till ${FOUNDING_OFFER_LAST_DAY_LABEL}` : null,
    });
  }, [schedule]);

  const [load, setLoad] = useState<Load>({ state: "signed-out" });
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chapter");
  const [open, setOpen] = useState<Record<string, boolean>>({ "ct-Maths": true, "ct-Science": false, "fm-Maths": true, "fm-Science": false });
  const [plansOpen, setPlansOpen] = useState(false);
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

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
  // Who owns what (server truth only): a Board Pass holder (paid premium), or a Test Series Pack owner (GET /api/packs/mine).
  const holdsPremium = signedIn && subscription.hydrated && isPaidPremium(subscription.status);
  const ownership = useTestSeriesOwnership(signedIn && subscription.hydrated && !holdsPremium ? user?.uid : null);
  const ownsSeries = signedIn && !holdsPremium && ownership.owns;
  const isOwner = holdsPremium || ownsSeries;
  // Not yet known (signed in, waiting for the subscription or the packs read): neither buy nor owner prompts, so an owner is
  // never told to buy what they own. A failed read stays unknown (the neutral CTA), never "owned".
  // MYPACKS-TS-1 (#1765) adds `phase` to the ownership hook; until it lands, the packs read is taken as answered once this page's
  // own records read has (same request moment). Only "ready" is known: "error" stays neutral, never a buy prompt.
  const phase = (ownership as { phase?: string }).phase;
  const ownershipKnown = phase !== undefined ? phase === "ready" : load.state === "ready";
  const ownerUnknown = signedIn && (!subscription.hydrated || (!holdsPremium && !ownershipKnown));

  const allTests = useMemo(() => [...chapters, ...mocks], [chapters, mocks]);
  const nextTest = progress ? allTests.find((t) => (progress.byCode[t.code]?.status ?? "not-started") === "not-started") ?? null : null;
  const doneIn = (codes: string[]) => (progress ? codes.filter((c) => (progress.byCode[c]?.status ?? "not-started") !== "not-started").length : 0);

  const row = (t: { code: string; href: string; name: string; num: string }) => (
    <li key={t.code}>
      <Link className="lt-ts-item" to={t.href} data-testid={`ts-test-${t.code}`}>
        <span className="lt-ts-item__num" aria-hidden="true">
          {t.num}
        </span>
        <span className="lt-ts-item__name">
          {t.name}
          <span className="lt-ts-item__code">{t.code}</span>
        </span>
        <StatusChip p={progress?.byCode[t.code]} signedIn={Boolean(progress)} />
      </Link>
    </li>
  );

  const mockCard = (m: { code: string; href: string; n: number }) => (
    <li key={m.code}>
      <Link className="lt-ts-card" to={m.href} data-testid={`ts-test-${m.code}`} aria-label={`Full-Length Test ${m.n} (${m.code})`}>
        <span className="lt-ts-card__n">Test {m.n}</span>
        <span className="lt-ts-card__code">{m.code}</span>
        <StatusChip p={progress?.byCode[m.code]} signedIn={Boolean(progress)} />
      </Link>
    </li>
  );

  // The hero's one CTA box (fixed height): buy / continue / neutral.
  let heroCta: ReactNode;
  if (isOwner) {
    heroCta = nextTest ? (
      <Link className="lt-ts-btn lt-ts-btn--primary" to={nextTest.href} data-testid="ts-continue">
        Continue: {nextTest.code} →
      </Link>
    ) : (
      <a className="lt-ts-btn lt-ts-btn--primary" href={`#${TESTS_ANCHOR}`} data-testid="ts-continue">
        Continue your tests →
      </a>
    );
  } else if (ownerUnknown) {
    heroCta = (
      <a className="lt-ts-btn lt-ts-btn--primary" href={`#${TESTS_ANCHOR}`} data-testid="ts-cta-tests">
        See all {totals.total} tests ↓
      </a>
    );
  } else {
    heroCta = (
      <Link className="lt-ts-btn lt-ts-btn--primary" to={TEST_SERIES_BUY_PATH} data-testid="ts-cta-hero">
        Get the Test Series →
      </Link>
    );
  }

  const offers = (
    <div className="lt-ts-offers" data-testid="ts-offers">
      <div className="lt-ts-offer lt-ts-offer--ts" data-testid="ts-offer-ts">
        <p className="lt-ts-offer__tag">Pre-boards</p>
        <p className="lt-ts-offer__name">Test Series</p>
        <p className="lt-ts-offer__price">{prices && <span data-testid="till-boards-figures">{prices.ts}</span>}</p>
        <ul className="lt-ts-offer__list">
          <li>All {totals.total} tests: {totals.chapterTests} chapter tests + {totals.fullMocks} full-length board papers</li>
          <li>
            Written answers checked step by step, <strong>{TEST_SERIES_CHECKS_PER_PAPER} checks per paper</strong>
          </li>
          <li>Full scorecard and your graded answer sheet on screen</li>
          <li>Download and print every paper</li>
        </ul>
        {ownsSeries ? (
          <p className="lt-ts-offer__owner" data-testid="ts-cta-owner">
            You own the Test Series.
          </p>
        ) : holdsPremium ? (
          <p className="lt-ts-offer__owner" data-testid="ts-cta-owner">
            Your Board Pass already includes every test.
          </p>
        ) : (
          <Link className="lt-ts-btn lt-ts-btn--primary lt-ts-offer__btn" to={TEST_SERIES_BUY_PATH} data-testid="ts-cta-buy">
            Get the Test Series →
          </Link>
        )}
      </div>
      <div className="lt-ts-offer lt-ts-offer--bp" data-testid="ts-offer-bp">
        <p className="lt-ts-offer__tag lt-ts-offer__tag--bp">Most complete</p>
        <p className="lt-ts-offer__name">Board Pass</p>
        <p className="lt-ts-offer__price">{prices && <span data-testid="till-boards-figures">{prices.bp}</span>}</p>
        <ul className="lt-ts-offer__list">
          <li>Everything in the Test Series, plus:</li>
          <li>Every answer checked everywhere (Answer Checker, worksheets)</li>
          <li>Your personal tutor on every lost mark</li>
          <li>Mistake Intelligence across all your practice</li>
        </ul>
        <Link className="lt-ts-btn lt-ts-btn--ghost lt-ts-offer__btn" to="/board-pass" data-testid="ts-bp-link">
          {holdsPremium ? "Your Board Pass →" : "See the Board Pass →"}
        </Link>
      </div>
      <div className="lt-ts-offer lt-ts-offer--packs">
        <p className="lt-ts-offer__tag lt-ts-offer__tag--packs">Print at home</p>
        <p className="lt-ts-offer__name">PDF Packs</p>
        <p className="lt-ts-offer__price lt-ts-offer__price--note">Chapter, mock and subject papers</p>
        <ul className="lt-ts-offer__list">
          <li>Printable papers with answer explanations</li>
          <li>Keep a printed set for offline revision</li>
          <li>Pair them with the Test Series to get them checked</li>
        </ul>
        <Link className="lt-ts-btn lt-ts-btn--ghost lt-ts-offer__btn" to="/packs" data-testid="ts-packs">
          PDF Packs / Bundle →
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <main className="lt-sp lt-ts" aria-label={`LazyTopper ${TEST_SERIES_NAME}`}>
        <header className="lt-ts-hero" aria-labelledby="ts-h1">
          <div className="lt-sp__w lt-ts-hero__in">
            <p className="lt-sp-eyebrow lt-ts-hero__eyebrow">{TEST_SERIES_NAME.toUpperCase()} · 2026-27</p>
            <h1 id="ts-h1" className="lt-ts-hero__h1">
              {/* Two fixed lines from 768 px: Fraunces swapping in for its fallback re-wrapped one line into two (a desktop shift). */}
              <span className="lt-ts-hero__h1-l">CBSE Class 10 Test Series:</span>{" "}
              <span className="lt-ts-hero__h1-l">Maths &amp; Science</span>
            </h1>
            <p className="lt-ts-hero__lede" data-testid="ts-contents">
              <strong>
                {totals.chapterTests} chapter tests + {totals.fullMocks} full-length board papers
              </strong>{" "}
              · written answers checked step by step
            </p>
            <p className="lt-ts-hero__rule" data-testid="ts-rule">
              {TEST_SERIES_ACCESS_LINE}
            </p>
            <ul className="lt-ts-stats" aria-label="What is in the series">
              <li>
                <strong>{totals.chapterTests}</strong>
                <span>Chapter Tests</span>
              </li>
              <li>
                <strong>{totals.fullMocks}</strong>
                <span>Full-Length Tests</span>
              </li>
              <li>
                <strong>{totals.total}</strong>
                <span>tests in all</span>
              </li>
            </ul>
            <p className="lt-ts-hero__urgency" data-testid="ts-urgency">
              {prices?.founding ? <span data-lt-clock="">{prices.founding}</span> : null}
            </p>
            <div className="lt-ts-hero__cta">{heroCta}</div>
            {/* Signed-in-only box with a reserved height. Not a <section>: the capture strip removes the sign-in pair only. */}
            <div className="lt-ts-me" data-testid="ts-progress">
              {load.state === "signed-out" ? (
                <>
                  <p className="lt-ts-me__txt">Track your progress through all {totals.total} tests.</p>
                  <a className="lt-ts-me__signin" href={LOGIN_HREF} data-testid="ts-signin">
                    Sign in
                  </a>
                </>
              ) : progress ? (
                <>
                  <p className="lt-ts-me__txt" data-testid="ts-done">
                    <strong>
                      {progress.done} of {progress.total}
                    </strong>{" "}
                    tests done.
                  </p>
                  <progress className="lt-ts-me__bar" max={progress.total} value={progress.done} aria-label="Tests done" />
                  <a href="#mistake-notebook" className="lt-ts-me__nb" data-testid="ts-notebook-link" onClick={() => setNotebookOpen(true)}>
                    Open my mistake notebook
                  </a>
                </>
              ) : (
                <p className="lt-ts-me__txt">Loading your progress…</p>
              )}
            </div>
          </div>
        </header>

        {schedule && (
          <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-cal-h">
            <h2 id="ts-cal-h" className="lt-sp-h2">
              Your pre-boards calendar
            </h2>
            <p className="lt-sp-lede">A recommended plan, not a lock: take any test whenever you are ready.</p>
            <CalendarRibbon rows={schedule} current={current} />
          </section>
        )}

        <section className="lt-sp__w lt-ts-sec" id={TESTS_ANCHOR} aria-labelledby="ts-tests-h">
          <h2 id="ts-tests-h" className="lt-sp-h2">
            All {totals.total} tests
          </h2>
          <div className="lt-ts-tabs" role="tablist" aria-label="Test type">
            <button
              type="button"
              role="tab"
              id="ts-tab-chapter"
              aria-selected={tab === "chapter"}
              aria-controls="ts-sec-chapter"
              className="lt-ts-tab"
              onClick={() => setTab("chapter")}
              data-testid="ts-tab-chapter"
            >
              Chapter Tests <span className="lt-ts-tab__n">{totals.chapterTests}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="ts-tab-full"
              aria-selected={tab === "full"}
              aria-controls="ts-sec-full"
              className="lt-ts-tab"
              onClick={() => setTab("full")}
              data-testid="ts-tab-full"
            >
              Full-Length Tests <span className="lt-ts-tab__n">{totals.fullMocks}</span>
            </button>
          </div>

          <div id="ts-sec-chapter" role="tabpanel" aria-labelledby="ts-tab-chapter" className="lt-ts-panel" hidden={tab !== "chapter"} data-testid="ts-sec-chapter">
            <p className="lt-sp-lede">One board-pattern test per chapter of the 2026-27 syllabus, Sections A to D.</p>
            {SUBJECTS.map((s) => {
              const list = chapters.filter((c) => c.subject === s);
              return (
                <Accordion
                  key={s}
                  id={`ts-acc-ct-${s}`}
                  open={Boolean(open[`ct-${s}`])}
                  onToggle={() => toggle(`ct-${s}`)}
                  title={s}
                  meta={<MiniProgress done={doneIn(list.map((c) => c.code))} total={list.length} show={Boolean(progress)} testId={`ts-prog-ct-${s}`} />}
                >
                  <ul className="lt-ts-list" data-testid={`ts-chapters-${s}`}>
                    {list.map((c) => row({ code: c.code, href: c.href, name: c.label, num: String(c.index).padStart(2, "0") }))}
                  </ul>
                </Accordion>
              );
            })}
          </div>

          <div id="ts-sec-full" role="tabpanel" aria-labelledby="ts-tab-full" className="lt-ts-panel" hidden={tab !== "full"} data-testid="ts-sec-full">
            <p className="lt-sp-lede">
              Full board-pattern papers (80 marks, 3 hours), {totals.mocksPerSubject} per subject.
            </p>
            {SUBJECTS.map((s) => {
              const list = mocks.filter((m) => m.subject === s);
              return (
                <Accordion
                  key={s}
                  id={`ts-acc-fm-${s}`}
                  open={Boolean(open[`fm-${s}`])}
                  onToggle={() => toggle(`fm-${s}`)}
                  title={s}
                  meta={<MiniProgress done={doneIn(list.map((m) => m.code))} total={list.length} show={Boolean(progress)} testId={`ts-prog-fm-${s}`} />}
                >
                  <div data-testid={`ts-mocks-${s}`}>
                    {rounds.map((r) => {
                      const cal = schedule?.find((row) => row.id === r.id);
                      return (
                        <div key={r.id} className="lt-ts-round">
                          <p className="lt-ts-round__h">
                            <strong>{cal?.title ?? (r.id === "round1" ? "Pre-board round 1" : "Pre-board round 2")}</strong>
                            {cal && <span> · {cal.when}</span>}
                          </p>
                          <ul className="lt-ts-cards">{list.filter((m) => m.n >= r.from && m.n <= r.to).map(mockCard)}</ul>
                        </div>
                      );
                    })}
                  </div>
                </Accordion>
              );
            })}
            <MockTrend load={load} />
          </div>
        </section>

        <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-offers-h">
          {isOwner ? (
            <div className="lt-ts-plans" data-testid="ts-plans">
              <h2 id="ts-offers-h" className="lt-ts-plans__h">
                <button
                  type="button"
                  className="lt-ts-acc__btn lt-ts-plans__btn"
                  aria-expanded={plansOpen}
                  aria-controls="ts-plans-panel"
                  onClick={() => setPlansOpen((v) => !v)}
                  data-testid="ts-plans-toggle"
                >
                  <span className="lt-ts-acc__title">Upgrade / other plans</span>
                  <span className="lt-ts-acc__chev" aria-hidden="true" />
                </button>
              </h2>
              <div id="ts-plans-panel" hidden={!plansOpen}>
                {offers}
              </div>
            </div>
          ) : (
            <>
              <h2 id="ts-offers-h" className="lt-sp-h2">
                Take all {totals.total} tests
              </h2>
              <p className="lt-sp-lede">Free and trial accounts can take one test, with its MCQs marked. Pick the plan that fits you.</p>
              {offers}
            </>
          )}
        </section>

        <section className="lt-sp__w lt-ts-sec" aria-labelledby="ts-how-h">
          <div className="lt-ts-how" data-testid="ts-how">
            <h2 id="ts-how-h" className="lt-sp-h2">
              How your tests are marked
            </h2>
            <ul className="lt-ts-how__list">
              <li>Section A (the MCQs) is marked the moment you submit, free on every account.</li>
              <li>
                Sections B to D (and E in full-length tests): write on paper and upload a photo. <strong>The Test Series checks every
                written answer step by step</strong>, {TEST_SERIES_CHECKS_PER_PAPER} checks per paper, like a CBSE examiner, and shows
                where each mark was lost.
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
