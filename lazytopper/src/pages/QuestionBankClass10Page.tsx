import { Link } from "react-router-dom";
import DailyQuestionLink from "../components/dailyQuestion/DailyQuestionLink";
import { isFreeMcqPagesKilled } from "../components/freeMcq/FreeMcqLink";
import SeoLandingShell from "../components/seoPages/SeoLandingShell";
import SeoPriceLine from "../components/seoPages/SeoPriceLine";
import { QUESTION_BANK_PATH, chapterLinks } from "../components/seoPages/seoPages";
import { QUESTION_BANK_FAQ } from "../components/seo/faqContent";
import { EVIDENCE_BASE_YEARS_WORD } from "../config/evidenceBase";
import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM, BUNDLE_CHAPTERS, BUNDLE_NAME } from "../lib/packs/packLabels";

/**
 * QuestionBankClass10Page — `/question-bank-class-10`, "CBSE Class 10 Question Bank 2027 — chapter-wise Maths & Science" (SEO-PAGES-1).
 *
 * ★ EVERY CHAPTER LINKS ONLY TO PAGES THAT EXIST. The chapter list is the topic registry (`allDesktopTopics`); each row links
 * to `/notes/<slug>` and `/cbq-class-10/<slug>` (both published for every registry chapter) and to the NCERT / Exemplar
 * solutions pages the solutions list actually publishes (`chapterLinks`, seoPages.ts). The claims ("10,000+ questions", "2,800+
 * CBQs") are the pinned floors in packLabels, which bankClaims.test counts on the real bank. Pack prices are read from the pack
 * helpers, never typed. Marks per chapter are the registry's own, derived from CBSE's unit marks.
 */
export default function QuestionBankClass10Page() {
  const chapters = chapterLinks();
  const freeMcqKilled = isFreeMcqPagesKilled();
  const groups = ["Maths", "Science"] as const;
  return (
    <SeoLandingShell
      path={QUESTION_BANK_PATH}
      testId="question-bank-page"
      eyebrow="CBSE Class 10 · Maths and Science · 2026-27"
      sub="Every chapter of the 2026-27 Class 10 syllabus in one place: notes, competency-based questions, NCERT solutions, free practice and printable packs."
      cta={{ to: "/practice-hub", label: "Practise questions free", testId: "qbank-cta-hero" }}
      faq={QUESTION_BANK_FAQ}
    >
      <section aria-labelledby="qbank-what">
        <h2 id="qbank-what">What is in the Class 10 question bank</h2>
        <p>
          The question bank is organised chapter by chapter, for Maths and for Science, and follows the CBSE 2026-27
          syllabus. Topics removed from that syllabus are not in it. Across the bank there are {BANK_QUESTIONS_CLAIM}{" "}
          questions with solutions, including {BANK_CBQS_CLAIM} competency-based questions (CBQs), the kind CBSE now sets
          for about half the paper.
        </p>
        <p>
          Questions run from 1-mark MCQs and assertion-reason items to 2, 3 and 5-mark answers and 4-mark case studies,
          so you can practise each section of the paper. Many questions come with a step-by-step solution, which is how
          board answers are marked.
        </p>
      </section>

      <section aria-labelledby="qbank-use">
        <h2 id="qbank-use">How to use the question bank</h2>
        <ol>
          <li>Read the chapter notes first, so the formulas and definitions are fresh.</li>
          <li>Solve a handful of questions from each section on paper, writing every step.</li>
          <li>Compare your steps with the worked solution and mark where you lost marks.</li>
          <li>Return to the chapter&rsquo;s CBQs once the basics are steady, since about half the paper is competency-based.</li>
        </ol>
        {/* SEO-DAILY-1: related link (VITE_DAILY_QUESTION_DISABLED=1 hides it). */}
        <DailyQuestionLink />
      </section>

      <section aria-labelledby="qbank-chapters">
        <h2 id="qbank-chapters">Chapter-wise question bank</h2>
        <p className="lt-seol__lede">
          Pick a chapter. Each row opens that chapter&rsquo;s notes, its CBQs and its NCERT solutions where published. The
          marks beside a chapter are approximate, derived from CBSE&rsquo;s unit marks.
        </p>
        {groups.map((subject) => (
          <div key={subject} data-testid={`qbank-chapters-${subject.toLowerCase()}`}>
            <h3>{subject}</h3>
            <ul className="lt-seol__chapters">
              {chapters
                .filter((row) => row.topic.subject === subject)
                .map((row) => (
                  <li key={row.topic.slug}>
                    <p className="lt-seol__chname">
                      {row.topic.name} <span className="lt-seol__chmarks">· {row.topic.marks}</span>
                    </p>
                    <ul className="lt-seol__chlinks">
                      <li>
                        <Link to={row.notes}>{row.topic.name} notes</Link>
                      </li>
                      <li>
                        <Link to={row.cbq}>{row.topic.name} CBQs</Link>
                      </li>
                      {/* SEO-MCQ-1: the chapter's free MCQ page(s) (VITE_FREE_MCQ_PAGES_DISABLED=1 hides them). */}
                      {!freeMcqKilled &&
                        row.mcq.map((link) => (
                          <li key={link.href}>
                            <Link to={link.href}>{link.label}</Link>
                          </li>
                        ))}
                      {row.solutions.map((link) => (
                        <li key={link.href}>
                          <Link to={link.href}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="qbank-free">
        <h2 id="qbank-free">Practise free</h2>
        <p>
          Choose a subject and a chapter in the Practice hub and start. You can also work through the important
          questions for each subject. {EVIDENCE_BASE_YEARS_WORD} years of CBSE paper trends shape the choice, so treat
          them as a guide to what to practise first, not as the actual paper.
        </p>
        <div className="lt-seol__actions">
          <Link className="lt-seol__btn" to="/practice-hub" data-testid="qbank-free-hub">
            Open the Practice hub
          </Link>
          <Link className="lt-seol__btn lt-seol__btn--ghost" to="/highly-probable/10/Maths" data-testid="qbank-free-maths">
            Maths important questions
          </Link>
          <Link className="lt-seol__btn lt-seol__btn--ghost" to="/highly-probable/10/Science" data-testid="qbank-free-science">
            Science important questions
          </Link>
        </div>
        <p>
          Not sure where to start? <Link to="/exam-trends">Exam Trends</Link> ranks every chapter by how much of the paper
          it carries.
        </p>
      </section>

      <section aria-labelledby="qbank-print">
        <h2 id="qbank-print">Printable question bank packs</h2>
        <p>
          If you prefer to solve on paper, the packs put the same question bank in print, with worked solutions, for a
          one-time payment: one chapter, one whole subject, or both subjects together with the mock papers.
        </p>
        <ul className="lt-seol__cards" data-testid="qbank-pack-prices">
          <li>
            <SeoPriceLine sku="pack_chapter" name="Chapter Pack" testId="qbank-price-chapter" />
            <br />
            One chapter of your choice.
          </li>
          <li>
            <SeoPriceLine sku="pack_subject" name="Subject Pack" testId="qbank-price-subject" />
            <br />
            Every chapter of one subject.
          </li>
          <li>
            <SeoPriceLine sku="pack_bundle" name={BUNDLE_NAME} testId="qbank-price-bundle" />
            <br />
            All {BUNDLE_CHAPTERS} chapters of Maths and Science, with the mock papers.
          </li>
        </ul>
        <p>
          Compare the packs and see a free sample page on the <Link to="/packs">PDF packs page</Link>. Printable
          competency-based packs are on the <Link to="/cbq-packs">CBQ Packs page</Link>.
        </p>
      </section>

      <section aria-labelledby="qbank-next">
        <h2 id="qbank-next">After the questions: mocks and marking</h2>
        <p>
          Once a few chapters are done, test yourself on a full paper: see the{" "}
          <Link to="/mock-test-class-10">Class 10 mock tests</Link>. To understand where marks are earned and lost in an
          answer, read the <Link to="/cbse-marking-scheme-class-10">CBSE Class 10 marking scheme</Link> page.
        </p>
      </section>
    </SeoLandingShell>
  );
}
