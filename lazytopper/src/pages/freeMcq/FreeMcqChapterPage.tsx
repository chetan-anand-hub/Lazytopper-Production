import { Link, Navigate, useParams } from "react-router-dom";
import { MathText } from "../../components/question/MathText";
import "../../components/question/katexEager";
import {
  FREE_MCQ_DOWNLOAD_PATH,
  FREE_MCQ_HUB_PATH,
  freeMcqBySlug,
  freeMcqH1,
  freeMcqNeighbours,
  freeMcqParentName,
  freeMcqPath,
} from "../../components/freeMcq/freeMcqPages";
import { dollarMathToParen, MCQ_LETTERS, optionLabel, parseMcqBlocks } from "../../components/freeMcq/mcqBlocks";
import { useFreeMcq, type FreeMcqQuestion } from "../../components/freeMcq/useFreeMcq";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import "./freeMcq.css";

/** The secondary call to action: the Answer Checker, with the 7-day free trial. */
export const FREE_MCQ_CHECKER_LABEL = "Check your written answers — Answer Checker (7-day free trial)";
export const FREE_MCQ_CHECKER_TO = "/check-improve";

export function freeMcqDownloadLabel(chapter: string): string {
  return `Download the full ${chapter} MCQ bank (PDF, sign in free)`;
}

function QuestionBody({ text }: { text: string }) {
  return (
    <>
      {parseMcqBlocks(text).map((block, i) =>
        block.kind === "text" ? (
          <MathText key={i} className="lt-mcq__stem" text={dollarMathToParen(block.text)} />
        ) : (
          <div key={i} className="lt-mcq__tw">
            <table>
              <thead>
                <tr>
                  {block.head.map((cell, c) => (
                    <th key={c} scope="col">
                      <MathText text={dollarMathToParen(cell)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>
                        <MathText text={dollarMathToParen(cell)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </>
  );
}

function Question({ q }: { q: FreeMcqQuestion }) {
  const answerText = q.options[q.answer] ?? "";
  const answerLabel = optionLabel(q.answer, answerText);
  return (
    <li className="lt-mcq__q" id={`q${q.n}`} data-testid="free-mcq-question">
      <h3>Q{q.n}</h3>
      <QuestionBody text={q.question} />
      <ul className="lt-mcq__opts">
        {MCQ_LETTERS.map((letter) => {
          const text = q.options[letter] ?? "";
          const label = optionLabel(letter, text);
          return (
            <li key={letter}>
              {label ? <span className="lt-mcq__lab">{label}</span> : null}
              <MathText text={dollarMathToParen(text)} />
            </li>
          );
        })}
      </ul>
      <details className="lt-mcq__sol">
        <summary>Show answer</summary>
        <p className="lt-mcq__ans">
          <strong>Answer:</strong> {answerLabel ? `${answerLabel} ` : ""}
          <MathText text={dollarMathToParen(answerText)} />
        </p>
        {q.explanation ? (
          <p className="lt-mcq__why">
            <MathText text={dollarMathToParen(q.explanation)} />
          </p>
        ) : null}
      </details>
    </li>
  );
}

/**
 * SEO-MCQ-1 - `/free-mcq-class-10/:slug`: one free chapter MCQ bank, the questions numbered as in the free PDF, each answer and explanation in a
 * native <details> (in the page's HTML for a crawler, no script to open). Text is used as written. Public, signed-out readable, no invented
 * data; an unknown slug goes back to the hub. Not in any product nav.
 */
export default function FreeMcqChapterPage() {
  const { slug = "" } = useParams();
  const entry = freeMcqBySlug(slug);
  const state = useFreeMcq(entry?.manifestId);
  if (!entry) return <Navigate to={FREE_MCQ_HUB_PATH} replace />;
  const parent = freeMcqParentName(entry);
  const { prev, next } = freeMcqNeighbours(entry.slug);
  const bank = state.status === "ready" ? state.bank : null;
  return (
    <main className="lt-mcq" data-testid="free-mcq-page">
      <header className="lt-mcq__hero">
        <div className="lt-mcq__w">
          <nav aria-label="Breadcrumb" className="lt-mcq__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <Link to={FREE_MCQ_HUB_PATH}>Free MCQs Class 10</Link> <span aria-hidden>›</span>{" "}
            <span aria-current="page">{entry.chapter}</span>
          </nav>
          <p className="lt-mcq__eyebrow">CBSE Class 10 · {entry.subject} · 2026-27</p>
          <h1>{freeMcqH1(entry)}</h1>
          <p className="lt-mcq__sub">
            {entry.count} multiple-choice questions on {entry.chapter}, numbered as in the free PDF. Try each one first, then open the answer.
          </p>
          <Link className="lt-mcq__cta" to={FREE_MCQ_DOWNLOAD_PATH} data-testid="free-mcq-download">
            {freeMcqDownloadLabel(entry.chapter)}
          </Link>
        </div>
      </header>

      <div className="lt-mcq__w lt-mcq__body">
        <section aria-labelledby="mcq-questions">
          <h2 id="mcq-questions">{entry.chapter} MCQs</h2>
          {state.status === "loading" && <p className="lt-mcq__note" data-testid="free-mcq-loading">Loading the questions…</p>}
          {state.status === "empty" && (
            <p className="lt-mcq__note" data-testid="free-mcq-empty">
              These questions could not be loaded right now. You can still read the chapter notes below.
            </p>
          )}
          {bank && (
            <ol className="lt-mcq__qs" data-testid="free-mcq-list">
              {bank.questions.map((q) => (
                <Question key={q.n} q={q} />
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="mcq-next">
          <h2 id="mcq-next">Keep going</h2>
          <Link className="lt-mcq__cta2" to={FREE_MCQ_CHECKER_TO} data-testid="free-mcq-checker">
            {FREE_MCQ_CHECKER_LABEL}
          </Link>
          <ul className="lt-mcq__links">
            <li>
              <Link to={`/notes/${entry.parentSlug}`} data-testid="free-mcq-notes-link">{parent} notes</Link>
            </li>
            <li>
              <Link to={`/cbq-class-10/${entry.parentSlug}`} data-testid="free-mcq-cbq-link">{parent} CBQs</Link>
            </li>
            <li>
              <Link to={FREE_MCQ_HUB_PATH} data-testid="free-mcq-hub-link">All free MCQ banks</Link>
            </li>
          </ul>
        </section>

        {(prev || next) && (
          <nav aria-label="More chapters" className="lt-mcq__pn" data-testid="free-mcq-prevnext">
            {prev ? (
              <Link to={freeMcqPath(prev.slug)} rel="prev">
                ‹ {prev.chapter}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={freeMcqPath(next.slug)} rel="next">
                {next.chapter} ›
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="lt-mcq__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
