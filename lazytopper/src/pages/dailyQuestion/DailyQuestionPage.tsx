import { displaySteps } from "../../lib/marks/objectiveSteps";
import { Link, Navigate, useParams } from "react-router-dom";
import { MathText } from "../../components/question/MathText";
import "../../components/question/katexEager";
import { cbqFormatLabel } from "../../components/cbq/cbqSeo";
import {
  DAILY_HUB_PATH,
  dailyChapterName,
  dailyNeighbours,
  dailyQuestionBySlug,
  dailyQuestionH1,
  dailyQuestionPath,
  marksLabel,
} from "../../components/dailyQuestion/dailyQuestions";
import { useDailyQuestion } from "../../components/dailyQuestion/useDailyQuestion";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import { PacksEntry } from "../../lib/packs/packEntryLazy";
import { isPackChapterSlug } from "../../lib/packs/packEntry";
import ExamPracticeStrip from "../../components/seoPages/ExamPracticeStrip";
import "./dailyQuestion.css";

/** The hero call to action: the Answer Checker, with the 3-day free trial. */
export const DAILY_CTA_LABEL = "Check your own answer — Answer Checker (3-day free trial)";
export const DAILY_CTA_TO = "/check-improve";

/**
 * SEO-DAILY-1 - `/important-question-of-the-day/:slug`: one real question from the bank with its stored step-marking answer (each step keeps
 * its `[N mark]` prefix) inside a native <details>, so the answer is in the page's HTML for a crawler and needs no script to open.
 * Public, signed-out readable, no invented data; an unknown slug goes back to the hub. Not in any product nav.
 */
export default function DailyQuestionPage() {
  const { slug = "" } = useParams();
  const entry = dailyQuestionBySlug(slug);
  const state = useDailyQuestion(entry);
  if (!entry) return <Navigate to={DAILY_HUB_PATH} replace />;
  const chapter = dailyChapterName(entry);
  const { prev, next } = dailyNeighbours(entry.slug);
  const row = state.status === "ready" ? state.row : null;
  const steps = displaySteps(row, (row?.solutionSteps ?? []).filter(Boolean));
  return (
    <main className="lt-dq" data-testid="daily-question-page">
      <header className="lt-dq__hero">
        <div className="lt-dq__w">
          <nav aria-label="Breadcrumb" className="lt-dq__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <Link to={DAILY_HUB_PATH}>Important Question of the Day</Link>{" "}
            <span aria-hidden>›</span> <span aria-current="page">#{entry.n}</span>
          </nav>
          <p className="lt-dq__eyebrow">CBSE Class 10 · {entry.subject} · 2026-27</p>
          <h1>{dailyQuestionH1(entry)}</h1>
          <p className="lt-dq__sub">Try it on paper first, then open the step-marking answer to see how the marks are earned.</p>
          <Link className="lt-dq__cta" to={DAILY_CTA_TO} data-testid="daily-cta">
            {DAILY_CTA_LABEL}
          </Link>
        </div>
      </header>

      <div className="lt-dq__w lt-dq__body">
        <section aria-labelledby="dq-question" className="lt-dq__card">
          <h2 id="dq-question">The question</h2>
          {state.status === "loading" && <p className="lt-dq__note" data-testid="daily-loading">Loading the question…</p>}
          {state.status === "empty" && (
            <p className="lt-dq__note" data-testid="daily-empty">
              This question could not be loaded right now. You can still read the chapter notes below.
            </p>
          )}
          {row && (
            <>
              <div className="lt-dq__qhead">
                <span className="lt-dq__chip">{cbqFormatLabel(row.format)}</span>
                <span className="lt-dq__chip lt-dq__chip--marks">{marksLabel(Number(row.marks) || entry.marks)}</span>
              </div>
              <MathText className="lt-dq__stem" text={row.questionText} />
              {Array.isArray(row.options) && row.options.length > 0 && (
                <ul className="lt-dq__opts">
                  {row.options.map((option, i) => (
                    <li key={`${row.id}-o${i}`}>
                      <MathText text={option} />
                    </li>
                  ))}
                </ul>
              )}
              <details className="lt-dq__sol">
                <summary>Show the step-marking answer</summary>
                <ol className="lt-dq__steps">
                  {steps.map((step, i) => (
                    <li key={`${row.id}-s${i}`}>
                      <MathText text={step} />
                    </li>
                  ))}
                </ol>
                {row.finalAnswer ? (
                  <p className="lt-dq__final">
                    <strong>Answer:</strong> <MathText text={row.finalAnswer} />
                  </p>
                ) : null}
              </details>
            </>
          )}
        </section>

        <section aria-labelledby="dq-study">
          <h2 id="dq-study">Study {chapter}</h2>
          <ul className="lt-dq__links">
            <li>
              <Link to={`/notes/${entry.chapterSlug}`} data-testid="daily-notes-link">{chapter} notes</Link>
            </li>
            <li>
              <Link to={`/cbq-class-10/${entry.chapterSlug}`} data-testid="daily-cbq-link">{chapter} CBQs</Link>
            </li>
            <li>
              <Link to={DAILY_HUB_PATH} data-testid="daily-hub-link">All Important Questions of the Day</Link>
            </li>
          </ul>
        </section>

        {/* SEO-SELL-2 - the chapter's pack when the question names a pack chapter, else the subject CBQ Pack line (lazy; flag off: nothing). */}
        {isPackChapterSlug(entry.chapterSlug) ? (
          <PacksEntry kind="note-card" topicKey={entry.chapterSlug} title={chapter} subject={entry.subject} surface="iqotd" position="end" />
        ) : (
          <PacksEntry kind="cbq-card" subject={entry.subject} surface="iqotd" />
        )}

        <ExamPracticeStrip />

        {(prev || next) && (
          <nav aria-label="More questions" className="lt-dq__pn" data-testid="daily-prevnext">
            {prev ? (
              <Link to={dailyQuestionPath(prev.slug)} rel="prev">
                ‹ #{prev.n}: {dailyChapterName(prev)}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={dailyQuestionPath(next.slug)} rel="next">
                #{next.n}: {dailyChapterName(next)} ›
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="lt-dq__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
