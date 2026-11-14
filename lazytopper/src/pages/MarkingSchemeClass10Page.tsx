import { Link } from "react-router-dom";
import SeoLandingShell from "../components/seoPages/SeoLandingShell";
import { CBSE_MARKING_SCHEME_SOURCE_URL, MARKING_SCHEME_PATH, PAPER_SECTIONS } from "../components/seoPages/seoPages";
import { MARKING_SCHEME_FAQ } from "../components/seo/faqContent";

/**
 * MarkingSchemeClass10Page — `/cbse-marking-scheme-class-10`, "CBSE Class 10 Marking Scheme 2027 — how step marks are given" (SEO-PAGES-1).
 *
 * ★ EVERY FACT HERE IS FROM CLAUDE.md §13 (the CBSE 2026-27 step-marking scheme, as the product states it) and the principles
 * `/check-your-answer` already cites. The page names CBSE's own marking-scheme page as the source and never claims to BE the
 * official scheme: it explains the principles in plain words. No invented marks for any named question; the worked examples
 * live on /check-your-answer, which this page links to. No price, no "AI", no affiliation claim.
 */
export default function MarkingSchemeClass10Page() {
  return (
    <SeoLandingShell
      path={MARKING_SCHEME_PATH}
      testId="marking-scheme-page"
      eyebrow="CBSE Class 10 · Maths and Science · 2026-27"
      sub="Class 10 answers are marked in steps, not only on the last line. Here is what each section carries and where step marks are earned and lost."
      cta={{ to: "/check-improve", label: "Check your answer with the Answer Checker", testId: "marking-cta-hero" }}
      faq={MARKING_SCHEME_FAQ}
    >
      <section aria-labelledby="mscheme-pattern">
        <h2 id="mscheme-pattern">The paper pattern and marks by section</h2>
        <p>
          The CBSE 2026-27 Class 10 paper pattern sets about 50% of the paper as competency-based questions, about 20% as
          MCQs and about 30% as short and long answers. The questions fall into five sections, and each section carries a
          fixed number of marks per question.
        </p>
        <div className="lt-seol__tablewrap">
          <table className="lt-seol__table" data-testid="mscheme-sections-table">
            <caption className="lt-seol__src">Marks per question, by section</caption>
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
      </section>

      <section aria-labelledby="mscheme-steps">
        <h2 id="mscheme-steps">How step marking works</h2>
        <p>
          A Section A question is a 1-mark item: the answer is right or it is not, and an MCQ scores full marks or zero
          on the answer alone, with no step marks. Beyond Section A, the marking scheme breaks an answer into steps, and
          each step carries part of the marks:
        </p>
        <ul>
          <li>
            <b>Section B, 2 marks:</b> the formula or approach, then the substitution or working, then the answer with
            its unit.
          </li>
          <li>
            <b>Section C, 3 marks:</b> the given data and formula, the substitution, the intermediate working and the
            final answer with its unit.
          </li>
          <li>
            <b>Section D, 5 marks:</b> set the problem up, formulate it, simplify, solve and conclude with units.
          </li>
          <li>
            <b>Section E, 4 marks:</b> a case study with parts. The first two parts earn a mark each, and the last part
            earns one mark for the working and one for the final answer.
          </li>
        </ul>
        <p>
          Half-mark steps are real. Writing the correct formula alone can earn half a mark even when the rest of the
          answer goes wrong.
        </p>
      </section>

      <section aria-labelledby="mscheme-ecf">
        <h2 id="mscheme-ecf">Error carried forward</h2>
        <p>
          A mistake is charged once. If a step has a calculation error but the steps after it follow the correct method
          from that wrong value, those later steps still earn their marks. So a slip early in a long answer does not wipe
          out the whole answer, provided your working is on the page for the examiner to follow.
        </p>
      </section>

      <section aria-labelledby="mscheme-units">
        <h2 id="mscheme-units">Units, keywords, equations and diagrams</h2>
        <ul className="lt-seol__cards" data-testid="mscheme-rules">
          <li>
            <b>Units.</b> A final numerical answer without its SI unit loses half a mark.
          </li>
          <li>
            <b>Science keywords.</b> Examiners look for the exact CBSE technical term: oesophagus, not &ldquo;food
            pipe&rdquo;.
          </li>
          <li>
            <b>Chemical equations.</b> A balanced equation earns half a mark, and the state symbols or the catalyst earn
            another half mark.
          </li>
          <li>
            <b>Diagrams.</b> The accuracy of the drawing and its labels are marked separately, so a correct diagram with
            missing labels still loses marks.
          </li>
        </ul>
      </section>

      <section aria-labelledby="mscheme-write">
        <h2 id="mscheme-write">Writing an answer that earns every step</h2>
        <ol>
          <li>Start with the formula or the method, because that step can earn marks on its own.</li>
          <li>Show the substitution and the working line by line, so each step is on the page to be credited.</li>
          <li>Write the final answer with its SI unit.</li>
          <li>In Science, use the exact NCERT term, balance every equation and label every diagram.</li>
          <li>If you spot a slip, carry on with the right method from the value you have; later steps can still earn marks.</li>
        </ol>
        <p>
          Examiners can only credit what is written, so a correct answer given as a bare final line leaves the step marks
          with nothing to attach to.
        </p>
      </section>

      <section aria-labelledby="mscheme-types">
        <h2 id="mscheme-types">Why you lost the marks: four kinds of mistake</h2>
        <p>Knowing how marks are given also tells you what to fix. A lost mark usually has one of four causes:</p>
        <ul>
          <li>a silly slip, such as copying a number wrongly from your own earlier line;</li>
          <li>a calculation error, such as wrong arithmetic or a split that does not add up;</li>
          <li>a concept you have not understood, where the method itself is wrong;</li>
          <li>presentation only, such as a missing unit, label or state symbol.</li>
        </ul>
        <p>
          If your later steps show that you know the method, the mistake is not a concept gap. Sorting your lost marks
          this way tells you whether to revise the chapter or just slow down and write the unit.
        </p>
      </section>

      <section aria-labelledby="mscheme-check">
        <h2 id="mscheme-check">See it on your own answers</h2>
        <p>
          The <Link to="/check-improve">Answer Checker</Link> marks a photographed or uploaded handwritten answer step
          by step, the way a CBSE examiner marks, and shows where marks were lost. For three worked examples taken from
          past CBSE papers and their marking schemes, read{" "}
          <Link to="/check-your-answer">how CBSE examiners mark Class 10 answers</Link>. To practise under paper
          conditions, try a <Link to="/mock-test-class-10">Class 10 mock test</Link>, or work through the{" "}
          <Link to="/question-bank-class-10">chapter-wise question bank</Link>.
        </p>
        <p className="lt-seol__src" data-testid="mscheme-source">
          Source: CBSE publishes its marking schemes on its own website, the{" "}
          <a href={CBSE_MARKING_SCHEME_SOURCE_URL} target="_blank" rel="noopener noreferrer">
            CBSE marking scheme page on cbse.gov.in
          </a>
          . This page explains the marking principles in plain words and is not the official scheme.
        </p>
      </section>
    </SeoLandingShell>
  );
}
