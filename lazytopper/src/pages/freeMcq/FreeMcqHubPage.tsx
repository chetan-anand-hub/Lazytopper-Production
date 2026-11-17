import { Link } from "react-router-dom";
import {
  FREE_MCQ_CHAPTERS,
  FREE_MCQ_DOWNLOAD_PATH,
  FREE_MCQ_HUB_H1,
  freeMcqPath,
  freeMcqTotalQuestions,
} from "../../components/freeMcq/freeMcqPages";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import { FREE_MCQ_CHECKER_LABEL, FREE_MCQ_CHECKER_TO } from "./FreeMcqChapterPage";
import "./freeMcq.css";

export const FREE_MCQ_HUB_DOWNLOAD_LABEL = "Download the free MCQ banks (PDF, sign in free)";

/**
 * SEO-MCQ-1 - `/free-mcq-class-10`: the 27 free chapter MCQ banks grouped by subject, each with its question count and a link to its page.
 * The list is the registry (pinned to the content file by the guard); no question text is shown here.
 */
export default function FreeMcqHubPage() {
  const groups = ["Maths", "Science"] as const;
  return (
    <main className="lt-mcq" data-testid="free-mcq-hub">
      <header className="lt-mcq__hero">
        <div className="lt-mcq__w">
          <nav aria-label="Breadcrumb" className="lt-mcq__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <span aria-current="page">Free MCQs Class 10</span>
          </nav>
          <p className="lt-mcq__eyebrow">CBSE Class 10 · Maths and Science · 2026-27</p>
          <h1>{FREE_MCQ_HUB_H1}</h1>
          <p className="lt-mcq__sub">
            {freeMcqTotalQuestions()} checked multiple-choice questions across {FREE_MCQ_CHAPTERS.length} chapters, each with its answer and a short
            explanation.
          </p>
          <Link className="lt-mcq__cta" to={FREE_MCQ_DOWNLOAD_PATH} data-testid="free-mcq-download">
            {FREE_MCQ_HUB_DOWNLOAD_LABEL}
          </Link>
        </div>
      </header>
      <div className="lt-mcq__w lt-mcq__body">
        {groups.map((subject) => (
          <section key={subject} aria-labelledby={`mcq-${subject.toLowerCase()}`} data-testid={`free-mcq-${subject.toLowerCase()}`}>
            <h2 id={`mcq-${subject.toLowerCase()}`}>{subject} MCQs</h2>
            <ul className="lt-mcq__list">
              {FREE_MCQ_CHAPTERS.filter((c) => c.subject === subject).map((c) => (
                <li key={c.slug}>
                  <Link to={freeMcqPath(c.slug)}>{c.chapter}</Link> <span className="lt-mcq__meta">{c.count} questions</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section aria-labelledby="mcq-more">
          <h2 id="mcq-more">Study more</h2>
          <ul className="lt-mcq__links">
            <li><Link to={FREE_MCQ_CHECKER_TO}>{FREE_MCQ_CHECKER_LABEL}</Link></li>
            <li><Link to="/cbq-class-10">Class 10 CBQs by chapter</Link></li>
            <li><Link to="/question-bank-class-10">Class 10 question bank</Link></li>
          </ul>
        </section>
        <p className="lt-mcq__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
