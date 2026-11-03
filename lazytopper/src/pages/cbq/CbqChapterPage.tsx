import { Link, Navigate, useParams } from "react-router-dom";
import CbqSampleList from "../../components/cbq/CbqSampleList";
import { CbqPackCta, CbqPremiumCta } from "../../components/cbq/CbqCtas";
import { CBQ_HUB_PATH, cbqChapterH1, cbqTopicBySlug } from "../../components/cbq/cbqSeo";
import { useCbqSamples } from "../../components/cbq/useCbqSamples";
import PublicLegalFooter from "../../components/ux/PublicLegalFooter";
import { pricingPacksHref } from "../../lib/packs/packLinks";
import "./cbqSeo.css";

/** The existing CBQ practice entry: the Practice Hub with its CBQ chapter chooser open (`?cbq=1`, DesktopPracticePage CBQ_HUB_PARAM). */
export const CBQ_PRACTICE_TO = "/practice-hub?cbq=1";

/**
 * CBQ-SEO-1 — `/cbq-class-10/:chapterSlug`: a public, signed-out-readable page of real sample CBQs
 * for one chapter, each with its stored step-wise solution. No login wall, no guest session, no
 * invented data; an unknown slug goes back to the hub.
 */
export default function CbqChapterPage() {
  const { chapterSlug = "" } = useParams();
  const topic = cbqTopicBySlug(chapterSlug);
  const samples = useCbqSamples(topic ? topic.slug : "");
  if (!topic) return <Navigate to={CBQ_HUB_PATH} replace />;
  const subject = topic.subject === "Maths" ? "maths" : "science";
  return (
    <main className="lt-cbqs" data-testid="cbq-chapter-page">
      <header className="lt-cbqs__hero">
        <div className="lt-cbqs__w">
          <nav aria-label="Breadcrumb" className="lt-cbqs__crumbs">
            <Link to="/">Home</Link> <span aria-hidden>›</span> <Link to={CBQ_HUB_PATH}>Class 10 CBQs</Link>{" "}
            <span aria-hidden>›</span> <span aria-current="page">{topic.name}</span>
          </nav>
          <p className="lt-cbqs__eyebrow">CBSE Class 10 · {topic.subject} · 2026-27</p>
          <h1>{cbqChapterH1(topic.name)}</h1>
          <p className="lt-cbqs__sub">
            Real competency-based questions on {topic.name}. Try each one on paper first, then open the explanation to see
            how the marks are earned, step by step.
          </p>
        </div>
      </header>

      <div className="lt-cbqs__w lt-cbqs__body">
        <section aria-labelledby="cbqs-samples">
          <h2 id="cbqs-samples">Sample {topic.name} CBQs</h2>
          <CbqSampleList state={samples} />
        </section>

        <CbqPremiumCta />
        <CbqPackCta subject={subject} />

        <section className="lt-cbqs__more" aria-labelledby="cbqs-more">
          <h2 id="cbqs-more">Practise more {topic.name} CBQs free</h2>
          <p>Pick {topic.name} in the CBQ chooser and practise more competency-based questions.</p>
          <Link className="lt-cbqs__btn" to={CBQ_PRACTICE_TO} data-testid="cbq-practice-link">
            Practise more {topic.name} CBQs free
          </Link>
        </section>

        <section aria-labelledby="cbqs-study">
          <h2 id="cbqs-study">Study {topic.name}</h2>
          <ul className="lt-cbqs__links">
            <li>
              <Link to={`/notes/${topic.slug}`} data-testid="cbq-notes-link">{topic.name} notes</Link>
            </li>
            <li>
              <Link to={`/topic-hub/${topic.slug}`} data-testid="cbq-topichub-link">{topic.name} Topic Hub</Link>
            </li>
            <li>
              <Link to={CBQ_HUB_PATH}>All Class 10 CBQs</Link>
            </li>
          </ul>
        </section>

        <p className="lt-cbqs__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter packsHref={pricingPacksHref({ chapter: topic.slug, subject })} />
    </main>
  );
}
