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

/** HOME-LINKS-1: the four links above plus the PDF packs page, for the homepage, the public footer and /practice-hub. */
export const EXAM_PRACTICE_LINKS_WITH_PACKS: ReadonlyArray<{ to: string; label: string }> = [
  ...EXAM_PRACTICE_LINKS,
  { to: "/packs", label: "PDF packs" },
];

export default function ExamPracticeStrip({
  testId = "exam-practice-strip",
  includePacks = false,
  onLinkClick,
}: {
  testId?: string;
  /** Adds the "PDF packs" link (/packs). Default false: the notes / NCERT / MCQ pages render the original four. */
  includePacks?: boolean;
  /** Optional click hook (analytics); the links stay plain anchors. */
  onLinkClick?: () => void;
}) {
  const links = includePacks ? EXAM_PRACTICE_LINKS_WITH_PACKS : EXAM_PRACTICE_LINKS;
  return (
    <nav className="lt-eps" aria-label="Exam practice" data-testid={testId}>
      <span className="lt-eps__lead">Exam practice:</span>
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="lt-eps__link" onClick={onLinkClick}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
