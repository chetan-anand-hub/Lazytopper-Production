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
 * the general instructions CBSE prints with its Class 10 marking schemes (carried
 * verbatim in bank row PYQ-S-ELEC-007), from CLAUDE.md §13, and from the marking
 * notes in bank rows. The three worked examples are bank PYQ rows, cited by id in
 * `WORKED_EXAMPLES` below; the page test reads each row from the bank and fails if
 * its question text drifts. A sentence with no source is deleted, never softened.
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
  /** Shown when a step's mark is not stated in the bank row: the question total, never an inferred figure. */
  readonly total?: string;
  readonly takeaway: string;
}

export const WORKED_EXAMPLES: readonly WorkedExample[] = [
  {
    bankId: "PYQ-M-2024-CIRC-008a",
    bankFile: "maths/circles.pyq2024.ts",
    tag: "Maths · 2 marks · CBSE 2024, paper 30/5/1, Q21(a)",
    question:
      "If two tangents inclined at an angle of 60° are drawn to a circle of radius 3 cm, then find the length of each tangent.",
    stepsHeading: "The marking scheme",
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
      { text: "(c) Any two: virtual, erect, behind the mirror", marks: "(remaining marks)" },
    ],
    total: "Total: 2 marks",
    takeaway:
      "Parts (a) and (b) each carry their own mark in this scheme. Answer each part separately and briefly; that is all this question asks for.",
  },
  {
    bankId: "PYQ-S-2026-CHEMRXN-014",
    bankFile: "science/chemicalReactions.pyq2026.ts",
    tag: "Science · 3 marks · CBSE 2026, paper 31/3/1, Q26",
    question:
      "2 g of green coloured crystals of ferrous sulphate are heated in a dry boiling tube. Name the type of chemical reaction taking place. Write the balanced chemical equation for the reaction. Is this an exothermic or an endothermic reaction ?",
    stepsHeading: "The marking scheme",
    steps: [
      { text: "Thermal decomposition reaction", marks: "1" },
      {
        text: (
          <>
            2FeSO<sub>4</sub>(s) → (heat) Fe<sub>2</sub>O<sub>3</sub>(s) + SO<sub>2</sub>(g) + SO
            <sub>3</sub>(g)
          </>
        ),
        marks: "1",
      },
      { text: "Endothermic reaction", marks: "1" },
    ],
    schemeNote: "deduct ½ mark if no / incorrect balancing",
    takeaway:
      "Three answers, one mark each. The equation's mark has a condition attached: leave it unbalanced and this scheme takes part of that mark away.",
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
    body: "The drawing and its labels are marked separately, so a diagram with missing labels or missing arrows can lose marks.",
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
            breaks it into value points, and each value point carries part of the marks. Writing the correct formula
            usually earns a step mark, even if a later step goes wrong.
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
              {example.total ? <p className="lt-cya__total">{example.total}</p> : null}
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
          Quotations in “Marks are given for steps” are from the general instructions printed with CBSE’s 2023 Class
          10 Science marking scheme.
          LazyTopper is an independent platform and is not affiliated with CBSE.
        </p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
