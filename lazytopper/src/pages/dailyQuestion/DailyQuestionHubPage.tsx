import { Link } from "react-router-dom";
import {
  DAILY_HUB_H1,
  dailyChapterName,
  dailyQuestionPath,
  dailyQuestionsNewestFirst,
  marksLabel,
} from "../../components/dailyQuestion/dailyQuestions";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import { DAILY_CTA_LABEL, DAILY_CTA_TO } from "./DailyQuestionPage";
import "./dailyQuestion.css";

/**
 * SEO-DAILY-1 - `/important-question-of-the-day`: every posted question, newest first, with its chapter and marks, each linking to its
 * own page. The list is the registry (a pointer into the bank per question); no text of a question is typed or shown here.
 */
export default function DailyQuestionHubPage() {
  const list = dailyQuestionsNewestFirst();
  return (
    <main className="lt-dq" data-testid="daily-hub-page">
      <header className="lt-dq__hero">
        <div className="lt-dq__w">
          <nav aria-label="Breadcrumb" className="lt-dq__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <span aria-current="page">Important Question of the Day</span>
          </nav>
          <p className="lt-dq__eyebrow">CBSE Class 10 · Maths and Science · 2026-27</p>
          <h1>{DAILY_HUB_H1}</h1>
          <p className="lt-dq__sub">
            One board-pattern question a day, from the LazyTopper question bank. Try it on paper, then open the step-marking answer.
          </p>
          <Link className="lt-dq__cta" to={DAILY_CTA_TO} data-testid="daily-cta">
            {DAILY_CTA_LABEL}
          </Link>
        </div>
      </header>
      <div className="lt-dq__w lt-dq__body">
        <section aria-labelledby="dq-all">
          <h2 id="dq-all">All questions, newest first</h2>
          <ol className="lt-dq__list" data-testid="daily-list">
            {list.map((q) => (
              <li key={q.slug}>
                <Link to={dailyQuestionPath(q.slug)}>
                  <span className="lt-dq__num">#{q.n}</span> {dailyChapterName(q)}
                </Link>{" "}
                <span className="lt-dq__meta">
                  {q.subject} · {marksLabel(q.marks)}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="dq-more">
          <h2 id="dq-more">Study more</h2>
          <ul className="lt-dq__links">
            <li><Link to="/cbq-class-10">Class 10 CBQs by chapter</Link></li>
            <li><Link to="/question-bank-class-10">Class 10 question bank</Link></li>
            {/* SEO-LLM-2: contextual links (anchor = the search words). */}
            <li><Link to="/highly-probable/10/Maths">Class 10 Maths important questions, chapter-wise</Link></li>
            <li><Link to="/highly-probable/10/Science">Class 10 Science important questions, chapter-wise</Link></li>
            <li><Link to="/packs">Class 10 question bank PDF packs</Link></li>
          </ul>
        </section>
        <p className="lt-dq__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
