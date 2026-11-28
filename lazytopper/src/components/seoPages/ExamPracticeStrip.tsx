import { Link } from "react-router-dom";
import "./examPracticeStrip.css";

/**
 * ExamPracticeStrip — SEO-SELL-1: one short row of plain internal links from the free notes / NCERT pages to the pages that sell
 * exam practice. The anchor texts are buyer keywords and are pinned by a test; no image, no script, no price.
 * CBQ links go to /cbq-packs, never the free /cbq-class-10 page (owner ruling 14 Nov 2026).
 */
export const EXAM_PRACTICE_LINKS: ReadonlyArray<{ to: string; label: string }> = [
  { to: "/question-bank-class-10", label: "Class 10 question bank" },
  { to: "/mock-test-class-10", label: "Class 10 mock test papers" },
  { to: "/cbq-packs", label: "Class 10 CBQs 2027" },
  { to: "/test-series", label: "Pre-boards test series" },
];

export default function ExamPracticeStrip({ testId = "exam-practice-strip" }: { testId?: string }) {
  return (
    <nav className="lt-eps" aria-label="Exam practice" data-testid={testId}>
      <span className="lt-eps__lead">Exam practice:</span>
      {EXAM_PRACTICE_LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="lt-eps__link">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
