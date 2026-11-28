import { Link } from "react-router-dom";
import SeoLandingShell from "../components/seoPages/SeoLandingShell";
import SeoBuyCta from "../components/seoPages/SeoBuyCta";
import { CRASH_COURSE_PATH } from "../components/seoPages/seoPages";
import { CRASH_COURSE_FAQ } from "../components/seo/faqContent";
import { BUNDLE_NAME } from "../lib/packs/packLabels";
import { CC27_COVER, CC27_CREDIT, CC27_INSIDE, CC27_NAME, CC27_SAMPLE_CHAPTER, CC27_SAMPLE_START_HERE } from "../config/crashCourse";
import "../components/crashCourse/crashCourse.css";

/**
 * CrashCourse2027Page - `/class-10-crash-course-2027`, "Class 10 Crash Course 2027 - PYQs & Important Questions" (CC27-SITE-1).
 *
 * A SIGNED-OUT, PRERENDERED, INDEXED SEARCH LANDING (same shell as /mock-test-class-10). The Crash Course is a BONUS included with
 * paid products and is never sold alone, so this page sells nothing of its own: it says what is inside, who gets it, and offers two
 * sample files. Prices are read from the pack helpers inside SeoBuyCta (never typed); the Board Pass has no price on this page.
 * No "AI", no "answer key", no "solutions" in a heading.
 */
export default function CrashCourse2027Page() {
  return (
    <SeoLandingShell
      path={CRASH_COURSE_PATH}
      testId="crash-course-page"
      eyebrow="CBSE Class 10 · Maths and Science · 2026-27"
      sub="A last-stretch revision set for the 2027 boards: one page per chapter, the most-asked board questions with marking schemes, and a 75-day plan. Included free with the Board Pass, the Test Series, the Bundle, Subject, CBQ and Chapter Packs."
      cta={{ to: "#cc27-sample", label: "Try a sample", testId: "cc27-cta-hero" }}
      faq={CRASH_COURSE_FAQ}
      heroBuy={
        <SeoBuyCta
          testId="cc27-buy-hero"
          primary={{ sku: "pack_bundle", target: "", label: BUNDLE_NAME, testId: "cc27-buy-bundle" }}
          others={[
            { sku: "test_series", target: "", label: "Test Series Pack", testId: "cc27-buy-ts" },
            { sku: "pack_subject", target: "maths", prefix: "Maths ", label: "Subject Pack", testId: "cc27-buy-subject-maths" },
            { sku: "pack_subject", target: "science", prefix: "Science ", label: "Subject Pack", testId: "cc27-buy-subject-science" },
          ]}
        />
      }
    >
      <section aria-labelledby="cc27-what">
        <h2 id="cc27-what">What is the Class 10 Crash Course 2027</h2>
        <p>
          The {CC27_NAME} is a revision set for CBSE Class 10 Maths and Science, built for the weeks before the boards. It
          follows the 2026-27 syllabus and is made by an IITian from IIT Kanpur. It is a bonus that comes with LazyTopper
          purchases; it is not sold on its own.
        </p>
        <div className="lt-cc27-block__covers">
          <img className="lt-cc27-block__cover" src={CC27_COVER.maths} width={72} height={102} loading="lazy" alt="Crash Course 2027 Maths cover" />
          <img className="lt-cc27-block__cover" src={CC27_COVER.science} width={72} height={102} loading="lazy" alt="Crash Course 2027 Science cover" />
        </div>
        <p className="lt-seol__fine">{CC27_CREDIT}</p>
      </section>

      <section aria-labelledby="cc27-inside">
        <h2 id="cc27-inside">What is inside</h2>
        <ul>
          {CC27_INSIDE.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          Each subject comes as one book, and every chapter also has its own sheet, so you can revise one chapter in a
          sitting or run through the whole book.
        </p>
      </section>

      <section aria-labelledby="cc27-get">
        <h2 id="cc27-get">How to get the Crash Course</h2>
        <p>
          Buy any of the products below and the Crash Course files appear under My packs, ready to download. The Board
          Pass and the Test Series Pack include both subjects.
        </p>
        <div className="lt-seol__tablewrap">
          <table className="lt-seol__table" data-testid="cc27-ladder-table">
            <caption className="lt-seol__src">Which purchase includes which Crash Course files</caption>
            <thead>
              <tr>
                <th scope="col">Purchase</th>
                <th scope="col">Included free</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Board Pass</td><td>Maths and Science books, every chapter sheet</td></tr>
              <tr><td>Pre-Boards Test Series</td><td>Maths and Science books, every chapter sheet</td></tr>
              <tr><td>{BUNDLE_NAME}</td><td>Maths and Science books, every chapter sheet</td></tr>
              <tr><td>Subject Pack</td><td>That subject&rsquo;s book and its chapter sheets</td></tr>
              <tr><td>CBQ Pack</td><td>That subject&rsquo;s book</td></tr>
              <tr><td>Chapter Pack</td><td>That chapter&rsquo;s sheet(s)</td></tr>
            </tbody>
          </table>
        </div>
        <div className="lt-seol__actions">
          <Link className="lt-seol__btn" to="/board-pass" data-testid="cc27-get-board-pass">
            See the Board Pass
          </Link>
          <Link className="lt-seol__btn" to="/test-series" data-testid="cc27-get-test-series">
            See the Test Series
          </Link>
          <Link className="lt-seol__btn lt-seol__btn--ghost" to="/cbq-packs" data-testid="cc27-get-cbq">
            See the CBQ Packs
          </Link>
          <Link className="lt-seol__btn lt-seol__btn--ghost" to="/packs" data-testid="cc27-get-packs">
            See the PDF packs
          </Link>
        </div>
      </section>

      <section aria-labelledby="cc27-sample-h" id="cc27-sample">
        <h2 id="cc27-sample-h">Try a sample</h2>
        <p>See the style before you decide. Download the Start Here guide and one full chapter sheet (Maths, Triangles).</p>
        <div className="lt-seol__actions">
          <a className="lt-seol__btn" href={CC27_SAMPLE_START_HERE} download data-testid="cc27-sample-start">
            Start Here guide (PDF)
          </a>
          <a className="lt-seol__btn" href={CC27_SAMPLE_CHAPTER} download data-testid="cc27-sample-chapter">
            Triangles chapter sheet (PDF)
          </a>
        </div>
        <p className="lt-seol__fine">{CC27_CREDIT}</p>
      </section>
    </SeoLandingShell>
  );
}
