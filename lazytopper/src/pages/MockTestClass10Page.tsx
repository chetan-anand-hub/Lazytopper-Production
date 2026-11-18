import { Link } from "react-router-dom";
import SeoLandingShell from "../components/seoPages/SeoLandingShell";
import SeoBuyCta from "../components/seoPages/SeoBuyCta";
import SeoPriceLine from "../components/seoPages/SeoPriceLine";
import { MOCK_TEST_PATH, PAPER_SECTIONS } from "../components/seoPages/seoPages";
import { MOCK_TEST_FAQ } from "../components/seo/faqContent";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../lib/packs/packLabels";

/**
 * MockTestClass10Page — `/mock-test-class-10`, "CBSE Class 10 Mock Test 2027 (Maths & Science)" (SEO-PAGES-1).
 *
 * ★ A SIGNED-OUT, PRERENDERED, INDEXED SEARCH LANDING. Every claim restates something the product or CLAUDE.md §13 already says:
 * the paper pattern (about 50% competency-based, 20% MCQ, 30% short and long answer), the five sections, the free chapter-test /
 * full-mock allowance (Basic: opened or downloaded within a daily limit, written answers not checked), the Mock Pack (eight
 * full 80-mark papers per subject with a marking guide) and the Bundle. Prices are read from the pack helpers, never typed. No
 * "AI", no refund promise, no comparison, no affiliation claim, no testimonial or student count.
 */
export default function MockTestClass10Page() {
  return (
    <SeoLandingShell
      path={MOCK_TEST_PATH}
      testId="mock-test-page"
      eyebrow="CBSE Class 10 · Maths and Science · 2026-27"
      sub="Practise a full board-pattern paper in one sitting, then learn exactly where the marks went. Take a full mock free online, or print eight mock papers per subject."
      cta={{ to: "/full-mock/10/Maths", label: "Start a free Maths full mock", testId: "mock-cta-hero" }}
      faq={MOCK_TEST_FAQ}
      heroBuy={
        <SeoBuyCta
          testId="mock-buy-hero"
          primary={{ sku: "pack_mock", target: "maths", label: "Mock Pack", testId: "mock-buy-mock" }}
          others={[
            { sku: "pack_mock", target: "science", prefix: "Science ", label: "Mock Pack", testId: "mock-buy-mock-science" },
            { sku: "pack_bundle", target: "", label: BUNDLE_NAME, testId: "mock-buy-bundle" },
          ]}
        />
      }
    >
      <section aria-labelledby="mock-what">
        <h2 id="mock-what">What a board-pattern mock test is</h2>
        <p>
          A mock test is a full practice paper that follows the board paper: the same sections, the same kinds of
          questions and the same marks for each. You attempt it in one sitting, write every answer in full, and only
          then check your marks. It shows you how the whole paper feels, not just one chapter.
        </p>
        <p>
          The CBSE 2026-27 pattern for Class 10 sets about 50% of the paper as competency-based questions, about 20% as
          MCQs and about 30% as short and long answers. A good mock follows that mix, so you meet case studies and
          application questions as often as you will in the exam.
        </p>
        <div className="lt-seol__tablewrap">
          <table className="lt-seol__table" data-testid="mock-sections-table">
            <caption className="lt-seol__src">The five sections of the paper</caption>
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col">Questions</th>
                <th scope="col">Marks each</th>
              </tr>
            </thead>
            <tbody>
              {PAPER_SECTIONS.map((row) => (
                <tr key={row.section}>
                  <td>{row.section}</td>
                  <td>{row.kind}</td>
                  <td>{row.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Maths and Science are separate papers, each carrying an 80-mark theory paper, so LazyTopper has a full mock for
          each subject. Section A questions are worth one mark each and need a quick, accurate answer, while Section D
          questions are worth five marks each and reward a complete, well-ordered solution, so a mock trains both speed
          and presentation.
        </p>
      </section>

      <section aria-labelledby="mock-free">
        <h2 id="mock-free">Take a Class 10 mock test free online</h2>
        <p>
          Start a full mock for either subject, or a chapter test when you want to check one chapter before the next.
          On the free Basic plan you can open or download chapter tests and full mocks every day within a daily limit,
          and the limit is higher once you sign in.
        </p>
        <div className="lt-seol__actions">
          <Link className="lt-seol__btn" to="/full-mock/10/Maths" data-testid="mock-free-maths">
            Maths full mock
          </Link>
          <Link className="lt-seol__btn" to="/full-mock/10/Science" data-testid="mock-free-science">
            Science full mock
          </Link>
          <Link className="lt-seol__btn lt-seol__btn--ghost" to="/practice-hub" data-testid="mock-free-hub">
            Chapter tests in the Practice hub
          </Link>
        </div>
        <p>
          On Basic your written answers are not checked. To have a full mock graded, use the Board Pass, which grades
          chapter tests, full mocks and worksheets; the current plans are on the <Link to="/pricing">pricing page</Link>.
        </p>
      </section>

      <section aria-labelledby="mock-print">
        <h2 id="mock-print">Printable mock papers with a marking guide</h2>
        <p>
          If you would rather write on paper from the first page, the Mock Pack is a printable PDF of {MOCKS_PER_SUBJECT}{" "}
          full board-pattern papers for one subject, each with a marking guide. The {BUNDLE_NAME} puts all {BUNDLE_CHAPTERS}{" "}
          chapter question banks and {BUNDLE_MOCKS} mocks, for both subjects, in one purchase.
        </p>
        <ul className="lt-seol__cards" data-testid="mock-pack-prices">
          <li>
            <SeoPriceLine sku="pack_mock" name="Mock Pack" testId="mock-price-mock" />
            <br />
            One subject, {MOCKS_PER_SUBJECT} papers, one-time payment.
          </li>
          <li>
            <SeoPriceLine sku="pack_bundle" name={BUNDLE_NAME} testId="mock-price-bundle" />
            <br />
            Both subjects, every chapter and {BUNDLE_MOCKS} mocks, one-time payment.
          </li>
        </ul>
        <p>
          See what is inside each pack, and a free sample page, on the <Link to="/packs">PDF packs page</Link>.
        </p>
      </section>

      <section aria-labelledby="mock-which">
        <h2 id="mock-which">Online mock or printed mock?</h2>
        <p>
          The online full mock is the quickest way to start: pick a subject and begin. The printed Mock Pack suits you if
          you want the exact feel of writing on paper, with a pen, in one sitting, away from the screen. You can
          use both: an online mock to find the weak chapters, and printed papers to build stamina closer to the boards.
        </p>
      </section>

      <section aria-labelledby="mock-how">
        <h2 id="mock-how">How to use a mock test well</h2>
        <ol>
          <li>Sit the whole paper in one go, without notes, and write every step the way you would in the exam.</li>
          <li>Mark it step by step against the marking scheme, not just on the final answers.</li>
          <li>
            Sort each lost mark into a cause: a silly slip when copying, a calculation error, a concept you have not
            understood, or presentation only, such as a missing unit or label.
          </li>
          <li>Fix the concept mistakes first, then retake that chapter&rsquo;s questions before the next mock.</li>
        </ol>
        <p>
          Step 2 is where most marks are found. Board answers earn marks for the formula, the working, the final answer
          and the unit separately; read how it works on the{" "}
          <Link to="/cbse-marking-scheme-class-10">CBSE Class 10 marking scheme</Link> page and in the{" "}
          <Link to="/check-your-answer">guide to how CBSE examiners mark answers</Link>. To have your handwritten answer
          marked step by step, photograph it and use the <Link to="/check-improve">Answer Checker</Link>.
        </p>
      </section>

      <section aria-labelledby="mock-chapters">
        <h2 id="mock-chapters">Practise chapter by chapter first</h2>
        <p>
          A mock is most useful once the chapters behind it are solid. The{" "}
          <Link to="/question-bank-class-10">Class 10 question bank</Link> lists every Maths and Science chapter with its
          notes, competency-based questions and NCERT solutions, and <Link to="/exam-trends">Exam Trends</Link> ranks the
          chapters by how much of the paper they carry.
        </p>
      </section>
    </SeoLandingShell>
  );
}
