import { Link } from "react-router-dom";
import SeoLandingShell from "../components/seoPages/SeoLandingShell";
import SeoBuyCta from "../components/seoPages/SeoBuyCta";
import SeoPriceLine from "../components/seoPages/SeoPriceLine";
import { PAPER_SECTIONS, SAMPLE_PAPER_PATH } from "../components/seoPages/seoPages";
import facts from "../components/seoPages/samplePaperFacts.json";
import { SAMPLE_PAPER_FAQ } from "../components/seo/faqContent";
import { BOARD_PASS_BUY_PATH } from "../components/pricing/boardPassBuy";
import { fullMockSeriesHref, seriesTotals, type SeriesSubject } from "../lib/testSeries/testSeries";
import { BUNDLE_NAME, MATHS_MOCK_PATTERN, MOCKS_PER_SUBJECT, TEST_SERIES_NAME, TEST_SERIES_WRITTEN_SECTIONS } from "../lib/packs/packLabels";

/**
 * SamplePaperClass10Page — `/sample-paper-class-10`, "CBSE Class 10 Sample Paper 2026-27 — Maths & Science (2027 Boards)" (SEO-SELL-3).
 *
 * ★ A SIGNED-OUT, PRERENDERED, INDEXED SEARCH LANDING for "class 10 maths sample paper". No new content: the papers listed are the existing pinned
 * full-length mocks (FM-M1..8, FM-S1..8: the PDF Mock Pack's papers, which the Test Series serves online). Every figure on a paper row (marks,
 * competency-based marks, section counts, the Easier / Standard / Harder label) is read from samplePaperFacts.json, which
 * samplePaperFacts.guard.test.ts rebuilds from the real pinned papers and the bank, so the page cannot state a figure the paper does not have.
 * Pack prices are read from the pack helpers (`SeoPriceLine`), never typed; the Board Pass is linked with no price because its price depends on the date.
 * Copy bans: no "free", "answer key", "solutions", "app"; no "AI"; no comparison, refund promise, testimonial or affiliation claim.
 */
type Fact = (typeof facts)[keyof typeof facts];
const FACTS = facts as Record<string, Fact>;
const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];
const papersOf = (subject: SeriesSubject) =>
  Array.from({ length: MOCKS_PER_SUBJECT }, (_, i) => {
    const n = i + 1;
    const code = `FM-${subject === "Maths" ? "M" : "S"}${n}`;
    return { n, code, fact: FACTS[code], href: fullMockSeriesHref(subject, n) };
  });

export default function SamplePaperClass10Page() {
  const totals = seriesTotals();
  const blueprint = FACTS["FM-M1"].sections;
  return (
    <SeoLandingShell
      path={SAMPLE_PAPER_PATH}
      testId="sample-paper-page"
      eyebrow="CBSE Class 10 · Maths and Science · 2026-27"
      sub={`Sit a full 80-mark board-pattern paper in one go, then see exactly where the marks went. Take a sample paper online, or print ${MOCKS_PER_SUBJECT} per subject.`}
      cta={{ to: "/full-mock/10/Maths", label: "Start a Maths sample paper online", testId: "sample-cta-hero" }}
      faq={SAMPLE_PAPER_FAQ}
      heroBuy={
        <SeoBuyCta
          testId="sample-buy-hero"
          primary={{ sku: "pack_mock", target: "maths", prefix: "", label: "Mock Pack", testId: "sample-buy-mock" }}
          others={[
            { sku: "pack_mock", target: "science", prefix: "Science ", label: "Mock Pack", testId: "sample-buy-mock-science" },
            { sku: "test_series", target: "", label: TEST_SERIES_NAME, testId: "sample-buy-series" },
            { sku: "pack_bundle", target: "", label: BUNDLE_NAME, testId: "sample-buy-bundle" },
          ]}
        />
      }
    >
      <section aria-labelledby="sample-what">
        <h2 id="sample-what">What a Class 10 sample paper is</h2>
        <p>
          A sample paper is a full practice paper that follows the board paper: the same sections, the same kinds of
          questions and the same marks for each. CBSE publishes its own official sample papers and marking schemes on its
          website, and you should look at those too. The papers below are separate practice papers in the same pattern,
          made so you can sit more than one before the exam.
        </p>
        <p>
          The CBSE 2026-27 pattern for Class 10 sets about 50% of the paper as competency-based questions, about 20% as
          MCQs and about 30% as short and long answers. These papers are drawn to that mix, and the table further down
          shows the competency-based marks of each one.
        </p>
      </section>

      <section aria-labelledby="sample-pattern">
        <h2 id="sample-pattern">The pattern of every paper: 80 marks, Sections A to E</h2>
        <p>
          Every paper below is an 80-mark theory paper with the same shape. The Maths papers follow the {MATHS_MOCK_PATTERN}{" "}
          pattern, and the Science papers use the same five sections.
        </p>
        <div className="lt-seol__tablewrap">
          <table className="lt-seol__table" data-testid="sample-pattern-table">
            <caption className="lt-seol__src">Sections of each sample paper</caption>
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col">Questions</th>
                <th scope="col">Number of questions</th>
                <th scope="col">Marks in all</th>
              </tr>
            </thead>
            <tbody>
              {PAPER_SECTIONS.map((row) => (
                <tr key={row.section}>
                  <td>{row.section}</td>
                  <td>
                    {row.kind} ({row.marks} each)
                  </td>
                  <td>{blueprint[row.section as keyof typeof blueprint].count}</td>
                  <td>{blueprint[row.section as keyof typeof blueprint].marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Section A rewards a quick, accurate answer, while Section D rewards a complete, well-ordered answer, so a full
          paper trains both speed and presentation.
        </p>
      </section>

      {SUBJECTS.map((subject) => (
        <section key={subject} aria-labelledby={`sample-${subject.toLowerCase()}`}>
          <h2 id={`sample-${subject.toLowerCase()}`}>Class 10 {subject} sample papers</h2>
          <p>
            {MOCKS_PER_SUBJECT} {subject} papers, one for each sitting. Take any of them online, or print the same papers in the Mock Pack.
          </p>
          <div className="lt-seol__tablewrap">
            <table className="lt-seol__table" data-testid={`sample-papers-${subject.toLowerCase()}`}>
              <caption className="lt-seol__src">{subject} sample papers, Sections A to E</caption>
              <thead>
                <tr>
                  <th scope="col">Paper</th>
                  <th scope="col">Marks</th>
                  <th scope="col">Competency-based marks</th>
                  <th scope="col">Level</th>
                  <th scope="col">Take it</th>
                </tr>
              </thead>
              <tbody>
                {papersOf(subject).map((p) => (
                  <tr key={p.code}>
                    <td>
                      {subject} sample paper {p.n}
                    </td>
                    <td>{p.fact.marks}</td>
                    <td>
                      {p.fact.cbqMarks} of {p.fact.marks}
                    </td>
                    <td>{p.fact.difficulty}</td>
                    <td>
                      <Link to={p.href} data-testid={`sample-take-${p.code}`}>
                        Take online
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="lt-seol__src" data-testid="sample-level-note">
        Level is based on how many marks come from harder questions, compared with the other papers of the same subject.
      </p>

      <section aria-labelledby="sample-online">
        <h2 id="sample-online">How to take a sample paper online</h2>
        <ol>
          <li>Pick a paper above and start it. Sit it in one go, without notes.</li>
          <li>Write your answers on paper, the way you would in the exam, with every step shown.</li>
          <li>
            Section A questions are marked on the answer alone, as in the real exam. For the written sections,{" "}
            {TEST_SERIES_WRITTEN_SECTIONS}, photograph your pages and upload them: your answers are marked step by step
            like a CBSE examiner, and each lost mark is sorted into a silly slip, a calculation error, a concept gap or a
            presentation miss.
          </li>
          <li>Fix the concept gaps first, then retake that chapter&rsquo;s questions before the next paper.</li>
        </ol>
        <p>
          Marking your written answers needs the Board Pass or the {TEST_SERIES_NAME}. On the Basic plan you can open a few
          Test Series papers every week, and the allowance is higher once you sign in; your written answers are not
          checked on Basic. How marks are given is explained on the{" "}
          <Link to="/cbse-marking-scheme-class-10">CBSE Class 10 marking scheme</Link> page.
        </p>
        <div className="lt-seol__actions">
          <Link className="lt-seol__btn" to="/full-mock/10/Maths" data-testid="sample-start-maths">
            Maths sample paper online
          </Link>
          <Link className="lt-seol__btn" to="/full-mock/10/Science" data-testid="sample-start-science">
            Science sample paper online
          </Link>
          <Link className="lt-seol__btn lt-seol__btn--ghost" to={BOARD_PASS_BUY_PATH} data-testid="sample-buy-board-pass">
            Board Pass: marks every paper you write
          </Link>
        </div>
      </section>

      <section aria-labelledby="sample-print">
        <h2 id="sample-print">Printable sample papers and the Test Series</h2>
        <p>
          If you would rather write on paper from the first page, the Mock Pack is a printable PDF of {MOCKS_PER_SUBJECT}{" "}
          full board-pattern papers for one subject, each with a marking guide. The {TEST_SERIES_NAME} is the online route:{" "}
          {totals.fullMocks} full-length tests ({totals.mocksPerSubject} for each subject) and {totals.chapterTests} chapter tests, with
          your written answers checked twice per paper.
        </p>
        <ul className="lt-seol__cards" data-testid="sample-pack-prices">
          <li>
            <SeoPriceLine sku="pack_mock" name="Mock Pack" testId="sample-price-mock" />
            <br />
            One subject, {MOCKS_PER_SUBJECT} printable papers, one-time payment.
          </li>
          <li>
            <SeoPriceLine sku="test_series" name={TEST_SERIES_NAME} testId="sample-price-series" />
            <br />
            Online papers for both subjects with your written answers checked, one-time payment.
          </li>
          <li>
            <SeoPriceLine sku="pack_bundle" name={BUNDLE_NAME} testId="sample-price-bundle" />
            <br />
            Both subjects, every chapter and all {MOCKS_PER_SUBJECT * 2} mock papers, one-time payment.
          </li>
        </ul>
        <p>
          See what is inside each pack, with a sample page, on the <Link to="/packs">PDF packs page</Link>, or read the
          details of the series on the <Link to="/test-series">Test Series page</Link>.
        </p>
      </section>

      <section aria-labelledby="sample-how">
        <h2 id="sample-how">How to use a sample paper well</h2>
        <p>
          A sample paper is most useful once the chapters behind it are solid. The{" "}
          <Link to="/question-bank-class-10">Class 10 question bank</Link> lists every Maths and Science chapter with its
          notes and competency-based questions, and <Link to="/exam-trends">Exam Trends</Link> ranks the chapters by how
          much of the paper they carry. Closer to the boards, use the{" "}
          <Link to="/mock-test-class-10">Class 10 mock tests</Link> page to plan a full run of papers.
        </p>
      </section>
    </SeoLandingShell>
  );
}
