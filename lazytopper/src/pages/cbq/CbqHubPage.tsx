import { Link } from "react-router-dom";
import CbqBand from "../../components/pricing/CbqBand";
import { CbqPremiumCta, CBQ_PACK_TO } from "../../components/cbq/CbqCtas";
import { CBQ_HUB_H1, cbqChapterPath, cbqChapterTopics } from "../../components/cbq/cbqSeo";
import { CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
import { subjectLabel, type PackSubject } from "../../services/packs";
import SeoFaq from "../../components/seo/SeoFaq";
import { CBQ_HUB_FAQ } from "../../components/seo/faqContent";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import { CBQ_PRACTICE_TO } from "./CbqChapterPage";
import "./cbqSeo.css";

/**
 * CBQ-SEO-1 — `/cbq-class-10`: what a CBQ is, a link to every chapter's CBQ page, then the two
 * calls to action (Premium first, the CBQ Packs second). Counts come from the pack constants
 * (CBQ_SUBJECT_CLAIM, CBQ_CHAPTER_CLAIM), never typed here. The "about half the paper" line is
 * CBSE's own pattern (Circular Acad-30/2024; CLAUDE.md §13), stated as CBSE's, not ours.
 */
export default function CbqHubPage() {
  const topics = cbqChapterTopics();
  const subjects = ["Maths", "Science"] as const;
  return (
    <main className="lt-cbqs" data-testid="cbq-hub-page">
      <header className="lt-cbqs__hero">
        <div className="lt-cbqs__w">
          <nav aria-label="Breadcrumb" className="lt-cbqs__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <span aria-current="page">Class 10 CBQs</span>
          </nav>
          <p className="lt-cbqs__eyebrow">CBSE Class 10 · Maths and Science · 2026-27</p>
          <h1>{CBQ_HUB_H1}</h1>
          <p className="lt-cbqs__sub">
            Pick a chapter to see real competency-based questions with the step-wise solution and marks for each.
          </p>
        </div>
      </header>

      <div className="lt-cbqs__w lt-cbqs__body">
        <section aria-labelledby="cbqs-what">
          <h2 id="cbqs-what">What is a CBQ?</h2>
          <p>
            A competency-based question (CBQ) asks you to use what you know in a new or real-life situation, not to
            repeat a definition. It can be a 1-mark MCQ or assertion-reason question, a case study, or a short or long
            answer of up to 5 marks.
          </p>
          <p>
            CBSE’s Class 10 paper pattern sets about 50% of the paper as competency-focused questions (CBSE Circular
            Acad-30/2024). That is why CBQs are worth practising in every chapter.
          </p>
          <p>
            LazyTopper’s CBQ bank has {CBQ_SUBJECT_CLAIM} for each subject, {CBQ_CHAPTER_CLAIM}.
          </p>
        </section>

        <section aria-labelledby="cbqs-chapters">
          <h2 id="cbqs-chapters">CBQs by chapter</h2>
          {subjects.map((subject) => (
            <div key={subject} className="lt-cbqs__group">
              <h3>{subject}</h3>
              <ul className="lt-cbqs__chapters" data-testid={`cbq-chapters-${subject.toLowerCase()}`}>
                {topics
                  .filter((topic) => topic.subject === subject)
                  .map((topic) => (
                    <li key={topic.slug}>
                      <Link to={cbqChapterPath(topic.slug)}>{topic.name} CBQs</Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        <CbqPremiumCta />

        <section aria-labelledby="cbqs-packs" data-testid="cbq-cta-pack">
          <h2 id="cbqs-packs" className="lt-cbqs__packhead">Get every CBQ for this subject</h2>
          <CbqBand
            headingId="cbqs-band"
            sampleSurface="cbq_hub"
            action={(subject: PackSubject) => (
              <Link className="lt-cbq__btn" to={CBQ_PACK_TO} data-testid={`cbq-cta-pack-${subject}`}>
                Get the {subjectLabel(subject)} CBQ Pack
              </Link>
            )}
          />
        </section>


        <section className="lt-cbqs__more" aria-labelledby="cbqs-practice">
          <h2 id="cbqs-practice">Practise CBQs free</h2>
          <p>Choose a chapter in the CBQ chooser and start practising.</p>
          <Link className="lt-cbqs__btn lt-cbqs__btn--ghost" to={CBQ_PRACTICE_TO} data-testid="cbq-practice-link">
            Practise CBQs free
          </Link>
        </section>

        <SeoFaq headingId="cbqs-faq" heading="Common questions" items={CBQ_HUB_FAQ} />

        <p className="lt-cbqs__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
