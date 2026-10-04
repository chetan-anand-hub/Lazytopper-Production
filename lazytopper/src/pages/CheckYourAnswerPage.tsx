import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import "./checkYourAnswer.css";

/**
 * CheckYourAnswerPage — "How CBSE examiners mark Class 10 answers", the public
 * answer-writing guide at `/check-your-answer` (SEO-5 PR-3, ANSWER-GUIDE-1).
 *
 * ★ WHY THIS PAGE EXISTS. `/check-improve` is the free answer check and stays
 * `noindex` (a thin upload page and the ad landing). This page is the content-rich,
 * prerendered, INDEXED page for "CBSE answer checker / marking scheme / answer
 * writing" searches, with one clear way into the free check.
 *
 * ★ EVERY FACTUAL SENTENCE HAS A SOURCE (spec P11). The marking principles come from
 * the general instructions printed with the CBSE Marking Scheme 2024, Science (086),
 * paper 31/5/3, from CLAUDE.md §13, and from owner-approved wording. The three worked
 * examples are bank PYQ rows (cited by id in `WORKED_EXAMPLES` below) whose marks were
 * checked against CBSE's published marking-scheme PDFs; the page test reads each row
 * from the bank and fails if its question text drifts. No 2026 question appears until
 * CBSE publishes that year's scheme. A sentence with no source is deleted, never softened.
 * No "official" marking-scheme wording, no invented figures, no affiliation claim.
 *
 * ★ ONE COMPONENT AT EVERY WIDTH, RESPONSIVE BY CSS ALONE (the Cbse2027Page
 * precedent): no width hook, no auth hook, nothing fetched. The page renders the
 * same for a signed-out reader and a crawler, which is what the prerender freezes.
 */

/** One step of a worked example, with the marks the scheme gives it (if it shows any). */
interface ExampleStep {
  readonly text: ReactNode;
  readonly marks?: string;
}

/** A worked example. `bankId` + `bankFile` name the bank row it is taken from. */
export interface WorkedExample {
  readonly bankId: string;
  readonly bankFile: string;
  readonly tag: string;
  readonly question: string;
  readonly stepsHeading: string;
  readonly steps: readonly ExampleStep[];
  readonly schemeNote?: string;
  /** The published scheme the marks were checked against (owner ruling: cite it on the page). */
  readonly source?: string;
  readonly takeaway: string;
}

/** CBSE's own marking-scheme page, where each cited scheme is published. */
export const CBSE_MARKING_SCHEME_URL = "https://www.cbse.gov.in/cbsenew/marking-scheme.html";

export const WORKED_EXAMPLES: readonly WorkedExample[] = [
  {
    bankId: "PYQ-M-2024-CIRC-008a",
    bankFile: "maths/circles.pyq2024.ts",
    tag: "Maths · 2 marks · CBSE 2024, paper 30/5/1, Q21(a)",
    question:
      "If two tangents inclined at an angle of 60° are drawn to a circle of radius 3 cm, then find the length of each tangent.",
    stepsHeading: "The marking scheme",
    source: "Source: CBSE Marking Scheme 2024, Mathematics (041), paper 30/5/1, Q21(a)",
    steps: [
      { text: "Correct figure", marks: "½" },
      { text: "∠APO = 30°", marks: "½" },
      { text: "tan 30° = 1/√3 = 3/AP", marks: "½" },
      { text: "AP = 3√3 cm", marks: "½" },
    ],
    takeaway:
      "This scheme gives each line its own half mark. The figure and the angle are worth as much as the trigonometry, and the unit sits in the last line.",
  },
  {
    bankId: "PYQ-S-2024-LIGHT-007",
    bankFile: "science/lightReflection.pyq2024.ts",
    tag: "Science · 2 marks · CBSE 2024, paper 31/5/3, Q25",
    question:
      "The linear magnification produced by a spherical mirror is + 3. Based on this statement answer the following questions : (a) What is the type of mirror ? (b) Where is the object located ? (c) List two properties of the image formed (other than the size/magnification).",
    stepsHeading: "The marking scheme",
    steps: [
      { text: "(a) Concave mirror / Converging mirror", marks: "½" },
      { text: "(b) Between pole and focus", marks: "½" },
      { text: "(c) Any two: virtual, erect, behind the mirror", marks: "½ + ½" },
    ],
    source: "Source: CBSE Marking Scheme 2024, Science (086), paper 31/5/3, Q25",
    takeaway:
      "Every part has its own mark, and part (c) is split again, one mark figure per property. A short answer to each part is all this question asks for.",
  },
  {
    bankId: "PYQ-S-2025-CHEMRXN-006",
    bankFile: "science/chemicalReactions.pyq2025.ts",
    tag: "Science · 2 marks · CBSE 2025, paper 31/1/3, Q26",
    question:
      "Translate the following statements into chemical equations and then balance them : (a) Nitric acid reacts with calcium hydroxide to form calcium nitrate and water. (b) Sodium chloride reacts with silver nitrate to form silver chloride and sodium nitrate.",
    stepsHeading: "The marking scheme",
    steps: [
      {
        text: "(a) 2HNO₃ + Ca(OH)₂ → Ca(NO₃)₂ + 2H₂O",
        marks: "1",
      },
      {
        text: "(b) NaCl + AgNO₃ → AgCl + NaNO₃",
        marks: "1",
      },
    ],
    schemeNote: "Deduct half mark if equation is not balanced",
    source: "Source: CBSE Marking Scheme 2025, Science (086), paper 31/1/3, Q26",
    takeaway:
      "One mark per equation, with a condition attached: right chemicals but unbalanced, and part of that mark goes.",
  },
];

const PRINCIPLES: ReadonlyArray<{ title: string; body: ReactNode }> = [
  {
    title: "The formula",
    body: "Start with the formula. It often earns a mark on its own.",
  },
  {
    title: "Units",
    body: "Write the unit with your final answer. CBSE marking schemes often mark down answers that leave it out.",
  },
  {
    title: "The final answer",
    body: "The last line is a value point of its own. A wrong final answer costs that point; the steps above it keep the marks they earned.",
  },
  {
    title: "Working not shown",
    body: "Step marks can only go to steps that are on the page. A bare final answer that is wrong leaves nothing to give marks to.",
  },
  {
    title: "Diagrams",
    body: "The drawing and its labels are often marked separately, so a diagram with missing labels or missing arrows can lose marks.",
  },
  {
    title: "Chemical equations",
    body: "An unbalanced equation loses marks, even when the chemicals in it are right.",
  },
  {
    title: "Everyday words",
    body: "Use the scientific term from your NCERT book (oesophagus, not 'food pipe'). Examiners look for the right terms.",
  },
];

export default function CheckYourAnswerPage() {
  return (
    <main className="lt-cya" data-testid="check-your-answer-page">
      <header className="lt-cya__hero">
        <div className="lt-cya__w">
          <p className="lt-cya__eyebrow">CBSE Class 10 · Maths and Science</p>
          <h1>How CBSE examiners mark Class 10 answers</h1>
          <p className="lt-cya__sub">
            Board answers are marked in steps, not only on the final line. Here is what earns marks, where marks are
            lost, and three worked examples from past CBSE papers and their marking schemes.
          </p>
          <Link to="/check-improve" className="lt-cya__cta" data-testid="cya-cta-hero">
            Check one of your answers free
          </Link>
        </div>
      </header>

      <div className="lt-cya__w lt-cya__body">
        <section aria-labelledby="cya-steps">
          <h2 id="cya-steps">Marks are given for steps</h2>
          <p>
            A Class 10 board answer worth 2, 3 or 5 marks is not marked as simply right or wrong. The marking scheme
            breaks it into value points, and each value point carries part of the marks. Marks are attached to specific
            points in your answer, not shared out equally: in one 3-mark answer, one step can carry 1 mark and another
            only ½. Writing the correct formula usually earns a step mark, even if a later step goes wrong.
          </p>
          <p>
            A mistake is charged once. CBSE’s general instructions to examiners say:{" "}
            <q>No marks to be deducted for the cumulative effect of an error. It should be penalized only once.</q> If
            you slip early and then work correctly from the wrong value, the later steps can still earn their marks.
          </p>
          <p>
            Your own method counts. The same instructions say the scheme carries{" "}
            <q>only suggested value points</q> and that{" "}
            <q>
              the students can have their own expression and if the expression is correct, the due marks should be
              awarded accordingly.
            </q>{" "}
            Examiners are also told: <q>Please do not hesitate to award full marks if the answer deserves it.</q>
          </p>
        </section>

        <section aria-labelledby="cya-lost">
          <h2 id="cya-lost">Where marks are lost</h2>
          <ul className="lt-cya__list">
            {PRINCIPLES.map((principle) => (
              <li key={principle.title}>
                <b>{principle.title}.</b> {principle.body}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cya-examples">
          <h2 id="cya-examples">Three worked examples from past papers</h2>
          <p className="lt-cya__lede">
            Each is a real CBSE Class 10 board question with its marking scheme, abbreviated. The marks on the right
            are the scheme’s.
          </p>
          {WORKED_EXAMPLES.map((example) => (
            <article key={example.bankId} className="lt-cya__ex" data-bank-id={example.bankId}>
              <p className="lt-cya__tag">{example.tag}</p>
              <p className="lt-cya__q">{example.question}</p>
              <h3>{example.stepsHeading}</h3>
              <ol className="lt-cya__steps">
                {example.steps.map((step, index) => (
                  <li key={index}>
                    <span className="lt-cya__step">{step.text}</span>
                    {step.marks ? <span className="lt-cya__marks">{step.marks}</span> : null}
                  </li>
                ))}
              </ol>
              {example.source ? (
                <p className="lt-cya__src">
                  <a href={CBSE_MARKING_SCHEME_URL} target="_blank" rel="noopener noreferrer">
                    {example.source}
                  </a>
                </p>
              ) : null}
              {example.schemeNote ? (
                <p className="lt-cya__note">
                  The scheme adds: <q>{example.schemeNote}</q>
                </p>
              ) : null}
              <p className="lt-cya__take">{example.takeaway}</p>
            </article>
          ))}
        </section>

        <section aria-labelledby="cya-check" className="lt-cya__check">
          <h2 id="cya-check">Check your own answer</h2>
          <p>
            LazyTopper checks a written answer step by step: photograph or upload it and see the marks for every step
            and where marks were lost. The first check is free without an account.
          </p>
          <Link to="/check-improve" className="lt-cya__cta" data-testid="cya-cta-check">
            Check an answer free
          </Link>
        </section>

        <p className="lt-cya__fine">
          Quotations in “Marks are given for steps” are from the general instructions printed with the{" "}
          <a href={CBSE_MARKING_SCHEME_URL} target="_blank" rel="noopener noreferrer">
            CBSE Marking Scheme 2024, Science (086), paper 31/5/3
          </a>
          .
          LazyTopper is an independent platform and is not affiliated with CBSE.
        </p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
