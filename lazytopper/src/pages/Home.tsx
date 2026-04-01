import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { useAuth } from "../context/AuthContext";

type MetaAttr = "name" | "property";

const SEO_TITLE = "LazyTopper | Human-Grade CBSE Tutor, Trends, HPQ and Predictive Papers";
const SEO_DESCRIPTION =
  "LazyTopper helps CBSE Class 10 students master Maths and Science with a human-like AI tutor, clear trends, HPQ predicted questions, and exam-ready practice.";

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

const VALUE_PROPS = [
  {
    icon: "📊",
    title: "See what CBSE will ask",
    body: "Topic-wise trend signals show you exactly where to focus — stop guessing, start scoring.",
  },
  {
    icon: "🧠",
    title: "Learn with an AI tutor",
    body: "Human-style explanations with hints, checkpoints, and board-answer framing. Like a tutor who never gets tired.",
  },
  {
    icon: "⚡",
    title: "Practice smarter",
    body: "HPQ and predictive papers target exam-relevant patterns. Every question you solve actually matters.",
  },
  {
    icon: "📈",
    title: "Track your progress",
    body: "See weak spots, daily streaks, and weekly recaps. Know exactly where you stand before the exam.",
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

  const goToTrends = () => {
    navigate("/trends/10/Maths");
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
            Know what's <span className="lt-home__gradient-text">most likely</span> to come in your exam.
          </h1>
          <p className="lt-home__lead">
            LazyTopper analyses 10 years of CBSE patterns to show you exactly which topics matter most — then helps you master them with an AI tutor.
          </p>
          <button
            type="button"
            className="lt-home__ctaPrimary"
            onClick={goToTrends}
          >
            See What's Most Likely to Come →
          </button>
        </section>

        <section className="lt-home__values" aria-label="How it works">
          <h2 className="lt-home__sectionTitle">Everything you need to score big</h2>
          <div className="lt-home__valueGrid">
            {VALUE_PROPS.map((item) => (
              <article key={item.title} className="lt-home__valueCard">
                <span className="lt-home__valueIcon">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lt-home__social-proof" aria-label="Social proof">
          <p className="lt-home__proofText">
            Built for students who'd rather study smart than study long.
          </p>
          <div className="lt-home__proofStats">
            <div className="lt-home__stat">
              <span className="lt-home__statNum">10yr</span>
              <span className="lt-home__statLabel">of CBSE data analysed</span>
            </div>
            <div className="lt-home__stat">
              <span className="lt-home__statNum">2</span>
              <span className="lt-home__statLabel">subjects covered</span>
            </div>
            <div className="lt-home__stat">
              <span className="lt-home__statNum">100%</span>
              <span className="lt-home__statLabel">free to use</span>
            </div>
          </div>
        </section>

        <section className="lt-home__finalCta" aria-label="Final call to action">
          <h2>Stop guessing. Start with trends.</h2>
          <p>See which topics CBSE loves — and start your prep from there.</p>
        </section>
      </div>
    </div>
  );
};

export default Home;
