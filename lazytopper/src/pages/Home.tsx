import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { useAuth } from "../context/AuthContext";

type MetaAttr = "name" | "property";

const SEO_TITLE = "LazyTopper | CBSE Class 10 Exam Prep — Trends, AI Tutor & Predicted Questions";
const SEO_DESCRIPTION =
  "LazyTopper helps CBSE Class 10 students focus on what's most likely to appear in Maths and Science board exams. 10 years of pattern analysis, AI tutoring, and predicted questions — free.";

const FAQ = [
  {
    q: "Is LazyTopper only for Class 10 CBSE?",
    a: "Currently yes — LazyTopper is built specifically for CBSE Class 10 Maths and Science board exams.",
  },
  {
    q: "Are these guaranteed exam questions?",
    a: "No. LazyTopper analyses 10 years of CBSE patterns to identify likely topics and question types. These are data-driven predictions, not guarantees.",
  },
  {
    q: "How should I start?",
    a: "Pick your subject, check the Trends page to see which topics matter most, then open TopicHub to learn and practice chapter by chapter.",
  },
];

const STEPS = [
  {
    num: "1",
    title: "See the trends",
    body: "Which topics keep appearing? Which ones carry the most marks? We've crunched 10 years of papers so you can see it instantly.",
  },
  {
    num: "2",
    title: "Learn chapter by chapter",
    body: "Open any topic, get taught by an AI tutor that explains like a real teacher — with hints, checkpoints, and board-style framing.",
  },
  {
    num: "3",
    title: "Practice what matters",
    body: "Solve predicted questions, take mock papers, and track your weak spots. Every question is aligned to real exam patterns.",
  },
];

const FEATURES = [
  {
    icon: "📊",
    title: "Topic-wise exam trends",
    body: "See exactly which chapters and question types appear most often — backed by 10 years of CBSE data.",
  },
  {
    icon: "🎓",
    title: "AI tutor that teaches like a person",
    body: "Step-by-step explanations, hints when you're stuck, and answers framed the way examiners expect.",
  },
  {
    icon: "🎯",
    title: "Predicted questions (HPQ)",
    body: "Questions most likely to appear based on historical patterns. Great for focused last-month revision.",
  },
  {
    icon: "📝",
    title: "Mock paper builder",
    body: "Build your own practice papers from predicted questions. Simulate the real exam experience.",
  },
];

function upsertMeta(attr: MetaAttr, key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let node = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

function upsertCanonical(href: string) {
  let node = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!node) {
    node = document.createElement("link");
    node.rel = "canonical";
    document.head.appendChild(node);
  }
  node.href = href;
}

function upsertJsonLd(id: string, payload: Record<string, unknown>) {
  let node = document.getElementById(id) as HTMLScriptElement | null;
  if (!node) {
    node = document.createElement("script");
    node.id = id;
    node.type = "application/ld+json";
    document.head.appendChild(node);
  }
  node.text = JSON.stringify(payload);
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const localHost = host === "localhost" || host === "127.0.0.1";
    const baseUrl = localHost ? "https://lazytopper.app" : window.location.origin;
    const canonical = `${baseUrl}/`;

    document.title = SEO_TITLE;
    upsertMeta("name", "description", SEO_DESCRIPTION);
    upsertMeta(
      "name",
      "keywords",
      "CBSE Class 10, CBSE Maths, CBSE Science, AI tutor, predicted questions, board exam prep, exam trends",
    );
    upsertMeta("name", "robots", "index,follow,max-image-preview:large");
    upsertMeta("name", "googlebot", "index,follow,max-image-preview:large");

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "LazyTopper");
    upsertMeta("property", "og:title", SEO_TITLE);
    upsertMeta("property", "og:description", SEO_DESCRIPTION);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", `${baseUrl}/vite.svg`);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", SEO_TITLE);
    upsertMeta("name", "twitter:description", SEO_DESCRIPTION);

    upsertCanonical(canonical);

    upsertJsonLd("lazytopper-home-schema", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "LazyTopper",
          url: canonical,
          description: SEO_DESCRIPTION,
          inLanguage: "en-IN",
        },
        {
          "@type": "SoftwareApplication",
          name: "LazyTopper",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          description: SEO_DESCRIPTION,
          featureList: [
            "CBSE exam trend analysis from 10 years of papers",
            "AI tutoring with board-style explanations",
            "Predicted questions based on historical patterns",
            "Mock paper builder for exam simulation",
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.a,
            },
          })),
        },
      ],
    });
  }, []);

  return (
    <div className="lt-home" data-testid="home-page">
      <div className="lt-home__shell">
        <header className="lt-home__header">
          <div className="lt-home__brand">
            <span className="lt-home__logo">LT</span>
            <p className="lt-home__name">LazyTopper</p>
          </div>
          <button
            type="button"
            className="lt-home__loginBtn"
            onClick={() => navigate(user ? "/dashboard" : "/login")}
          >
            {user ? "Dashboard" : "Log in"}
          </button>
        </header>

        <section className="lt-home__hero" aria-label="Hero">
          <p className="lt-home__eyebrow">CBSE Class 10 — Maths & Science</p>
          <h1 className="lt-home__headline">
            Know what's{" "}
            <span className="lt-home__gradient-text">most likely to appear</span>{" "}
            in your board exam.
          </h1>
          <p className="lt-home__lead">
            We analysed 10 years of CBSE papers to show you which topics
            and question types matter most — then help you master them
            with an AI tutor.
          </p>
          <div className="lt-home__subjectPicker">
            <button
              type="button"
              className="lt-home__subjectBtn lt-home__subjectBtn--maths"
              onClick={() => navigate("/trends/10/Maths")}
            >
              <span className="lt-home__subjectIcon">📐</span>
              Maths Trends
            </button>
            <button
              type="button"
              className="lt-home__subjectBtn lt-home__subjectBtn--science"
              onClick={() => navigate("/trends/10/Science")}
            >
              <span className="lt-home__subjectIcon">🔬</span>
              Science Trends
            </button>
          </div>
          <p className="lt-home__disclaimer">
            Predictions based on historical patterns — not guaranteed exam content.
          </p>
        </section>

        {/* Skill tree path - Duolingo-style learning journey */}
        <section className="lt-home__skillTree" aria-label="Your learning path">
          <h2 className="lt-home__sectionTitle">Your learning path</h2>
          <p className="lt-home__sectionSub">
            Follow the path from basics to board-ready — one step at a time.
          </p>
          <div className="lt-home__treePath">
            {[
              { icon: "📊", label: "Trends", desc: "See what appears most", color: "#58cc02", to: "/trends/10/Maths" },
              { icon: "📚", label: "TopicHub", desc: "Learn chapter by chapter", color: "#1cb0f6", to: "/topic-hub/10/Maths" },
              { icon: "🎯", label: "Practice", desc: "Solve predicted questions", color: "#ff9600", to: "/predictive-papers" },
              { icon: "🏆", label: "Master", desc: "Track your progress", color: "#ce82ff", to: "/dashboard" },
            ].map((node, i) => (
              <div key={node.label} className="lt-home__treeNode">
                {i > 0 && <div className="lt-home__treeConnector" />}
                <button
                  type="button"
                  className="lt-home__treeCircle"
                  style={{ background: node.color, borderColor: node.color }}
                  onClick={() => navigate(node.to)}
                >
                  <span className="lt-home__treeIcon">{node.icon}</span>
                </button>
                <span className="lt-home__treeLabel">{node.label}</span>
                <span className="lt-home__treeDesc">{node.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lt-home__journey" aria-label="How it works">
          <h2 className="lt-home__sectionTitle">How it works</h2>
          <p className="lt-home__sectionSub">
            Three steps from "I don't know where to start" to "I'm ready for boards."
          </p>
          <div className="lt-home__steps">
            {STEPS.map((step) => (
              <article key={step.num} className="lt-home__step">
                <span className="lt-home__stepNum">{step.num}</span>
                <div className="lt-home__stepContent">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lt-home__features" aria-label="Features">
          <h2 className="lt-home__sectionTitle">What you get</h2>
          <div className="lt-home__featureGrid">
            {FEATURES.map((item) => (
              <article key={item.title} className="lt-home__featureCard">
                <span className="lt-home__featureIcon">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lt-home__trust" aria-label="Trust signals">
          <p className="lt-home__trustText">
            Built for students who'd rather study smart than study long.
          </p>
          <div className="lt-home__trustStats">
            <div className="lt-home__stat">
              <span className="lt-home__statNum">10 yrs</span>
              <span className="lt-home__statLabel">of CBSE data analysed</span>
            </div>
            <div className="lt-home__stat">
              <span className="lt-home__statNum">Free</span>
              <span className="lt-home__statLabel">no payment needed</span>
            </div>
            <div className="lt-home__stat">
              <span className="lt-home__statNum">Maths + Science</span>
              <span className="lt-home__statLabel">both subjects covered</span>
            </div>
          </div>
        </section>

        <section className="lt-home__bottom" aria-label="Get started">
          <h2>Ready to see what's likely to come?</h2>
          <p>
            Pick your subject and start with the topics that matter most.
          </p>
          <button
            type="button"
            className="lt-home__bottomCta"
            onClick={() => navigate("/trends/10/Maths")}
          >
            Start with Maths Trends
          </button>
        </section>
      </div>
    </div>
  );
};

export default Home;
