import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { useAuth } from "../context/AuthContext";

type MetaAttr = "name" | "property";

const SEO_TITLE = "LazyTopper | Human-Grade CBSE Tutor, Trends, HPQ and Predictive Papers";
const SEO_DESCRIPTION =
  "LazyTopper helps CBSE Class 10 students master Maths and Science with a human-like AI tutor, clear trends, HPQ predicted questions, and exam-ready practice.";

const JOURNEY_STEPS = [
  {
    title: "Diagnose",
    body: "Pick chapter and spot weak concepts quickly.",
  },
  {
    title: "Learn",
    body: "Use Teach mode for human-style explanation and checkpoints.",
  },
  {
    title: "Practice",
    body: "Move to Grind and Practice with auto-filtered question drills.",
  },
  {
    title: "Master",
    body: "Close the loop with HPQ and predictive papers before tests.",
  },
];

const PRODUCT_PILLARS = [
  {
    title: "Topic Trends (Maths + Science)",
    body: "See chapter-wise trend signals so study time goes to high-impact topics first.",
  },
  {
    title: "Predictive Papers + HPQ",
    body: "Practice likely question patterns using competency-aware and case-based preparation.",
  },
  {
    title: "Human-Like Tutor",
    body: "Interactive teaching with hints, checkpoints, board-answer framing, and next-step guidance.",
  },
  {
    title: "Pro-Tips Study Planning",
    body: "Personal planning flow that helps students stay consistent and move to mastery.",
  },
];

const WEEK_ONE_OUTCOMES = [
  "Clear starting chapter and revision priority",
  "Daily Learn -> Grind -> Practice flow without confusion",
  "At least one full predictive paper attempt",
  "Weak-topic list with focused next actions",
];

const FAQ = [
  {
    q: "Is LazyTopper only for Class 10 CBSE?",
    a: "The strongest current journey is Class 10 CBSE Maths and Science with human-tutor style learning.",
  },
  {
    q: "What makes HPQ useful?",
    a: "HPQ gives likely, exam-relevant practice sets so students can spend less time on low-impact questions.",
  },
  {
    q: "How should I start in 30 seconds?",
    a: "Open TopicHub, choose your chapter, start Teach mode, then move to Grind and Practice from the same flow.",
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

  const scrollToQuickTour = () => {
    const target = document.getElementById("quick-tour");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const goToLearningStart = () => {
    if (user) {
      navigate("/topic-hub");
      return;
    }
    navigate("/login", { state: { from: "/topic-hub" } });
  };

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
      "CBSE Class 10, CBSE Maths, CBSE Science, AI tutor, human tutor, HPQ, predictive papers, board exam prep",
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
            "Human-grade AI tutoring",
            "CBSE trend analysis",
            "HPQ predicted questions",
            "Predictive papers with exam-style flow",
            "Pro-tips based study planning",
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
            <div>
              <p className="lt-home__name">LazyTopper</p>
              <p className="lt-home__tag">Human-grade tutor for CBSE Class 10 Maths and Science</p>
            </div>
          </div>
          <div className="lt-home__authActions">
            <button
              type="button"
              className="lt-home__authBtn"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
            >
              {user ? "Open Dashboard" : "Login (Email/Phone)"}
            </button>
            <p className="lt-home__headerNote">Web + Mobile | Low cognitive load learning flow</p>
          </div>
        </header>

        <section className="lt-home__hero" aria-label="Hero">
          <div className="lt-home__heroCopy">
            <p className="lt-home__eyebrow">One clear start path for every student</p>
            <h1>Learn with a human-like AI tutor, then score higher with smarter practice.</h1>
            <p className="lt-home__lead">
              LazyTopper gives Class 10 students a single study loop: learn concepts, practice weak topics, and revise
              likely exam questions with confidence.
            </p>

            <div className="lt-home__ctaRow" data-ux-priority-block="home-primary-actions">
              <button
                type="button"
                className="lt-home__ctaPrimary"
                data-ux-above-fold-cta="home"
                onClick={goToLearningStart}
              >
                Start Learning Now
              </button>
              <button
                type="button"
                className="lt-home__ctaGhost"
                data-ux-above-fold-cta="home"
                onClick={scrollToQuickTour}
              >
                Watch 60s Tour
              </button>
            </div>

            <p className="lt-home__hint">New student? Click "Start Learning Now" and pick your chapter.</p>
          </div>

          <aside className="lt-home__heroPanel" aria-label="Student first actions">
            <h2>First 30 seconds</h2>
            <ol>
              <li>Open TopicHub</li>
              <li>Choose chapter</li>
              <li>Start Teach mode</li>
              <li>Move to Grind and Practice</li>
            </ol>
          </aside>
        </section>

        <section id="quick-tour" className="lt-home__section" aria-label="Quick tour">
          <h2>{"Quick tour: Diagnose -> Learn -> Practice -> Master"}</h2>
          <div className="lt-home__journeyRow">
            {JOURNEY_STEPS.map((step, index) => (
              <article key={step.title} className="lt-home__journeyCard">
                <p className="lt-home__journeyIndex">Step {index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lt-home__section" aria-label="Core product pillars">
          <h2>Core product pillars</h2>
          <div className="lt-home__grid">
            {PRODUCT_PILLARS.map((card) => (
              <article key={card.title} className="lt-home__card">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lt-home__section" aria-label="First week proof">
          <h2>What a student should get in first 7 days</h2>
          <ul className="lt-home__outcomes">
            {WEEK_ONE_OUTCOMES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="lt-home__strip" aria-label="HPQ and predictive USP">
          <p>
            <strong>USP:</strong> HPQ and Predictive Papers focus revision on exam-relevant patterns, while the tutor
            keeps concept clarity and answer-writing quality high.
          </p>
          <button type="button" className="lt-home__ctaInline" onClick={() => navigate("/predictive-papers")}>
            Try Predictive Papers
          </button>
        </section>
      </div>

      <div className="lt-home__mobileSticky" aria-hidden={false}>
        <button type="button" className="lt-home__mobileStickyBtn" onClick={goToLearningStart}>
          Start Learning Now
        </button>
      </div>
    </div>
  );
};

export default Home;
