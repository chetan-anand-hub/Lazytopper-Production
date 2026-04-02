import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { useAuth } from "../context/AuthContext";
import { canonicalChapters } from "../data/syllabus/cbse10Canonical";
import { useSmartLearning } from "../engine/smartLearningStore";

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

type MasteryLevel = "locked" | "started" | "progressing" | "mastered";

const MASTERY_COLORS: Record<MasteryLevel, string> = {
  locked: "#e5e5e5",
  started: "#1cb0f6",
  progressing: "#58cc02",
  mastered: "#ffc800",
};

function readStreakData(): { count: number; lastDate: string } {
  try {
    const raw = localStorage.getItem("lazytopper.streak");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { count: Number(parsed?.count || 0), lastDate: parsed?.lastDate || "" };
    }
  } catch {}
  return { count: 0, lastDate: "" };
}

function readDailyGoalProgress(): { done: number; goal: number } {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem("lazytopper.dailyGoal");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === today) return { done: Number(parsed.done || 0), goal: Number(parsed.goal || 5) };
    }
  } catch {}
  return { done: 0, goal: 5 };
}

const MATHS_CHAPTERS = canonicalChapters.filter(c => c.subjectId === "maths").slice(0, 6);
const SCIENCE_CHAPTERS = canonicalChapters.filter(c => c.subjectId === "science").slice(0, 6);

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const smartLearning = useSmartLearning();
  const [topicSubject, setTopicSubject] = useState<"maths" | "science">("maths");
  const [streak, setStreak] = useState(() => readStreakData());
  const [dailyGoal, setDailyGoal] = useState(() => readDailyGoalProgress());
  const chapters = topicSubject === "maths" ? MATHS_CHAPTERS : SCIENCE_CHAPTERS;

  const refreshGamification = useCallback(() => {
    setStreak(readStreakData());
    setDailyGoal(readDailyGoalProgress());
  }, []);

  useEffect(() => {
    window.addEventListener("storage", refreshGamification);
    const interval = setInterval(refreshGamification, 3000);
    return () => { window.removeEventListener("storage", refreshGamification); clearInterval(interval); };
  }, [refreshGamification]);

  const getChapterMastery = useCallback((chapterId: string): { level: MasteryLevel; pct: number } => {
    const ch = smartLearning.getStatsForChapter(chapterId);
    if (!ch) return { level: "locked", pct: 0 };
    const attempted = ch.totalQuestionsAttempted ?? 0;
    const mastery = ch.lastComputedMastery ?? 0;
    const pct = Math.min(100, Math.round(mastery * 100));
    if (mastery >= 0.8 && attempted >= 3) return { level: "mastered", pct };
    if (mastery >= 0.4 || attempted >= 3) return { level: "progressing", pct };
    if (attempted > 0) return { level: "started", pct };
    return { level: "locked", pct: 0 };
  }, [smartLearning]);

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

        {/* Streak + Daily Goal widget */}
        {user && (
          <section className="lt-home__streakGoal" aria-label="Your streak and daily goal" style={{
            display: "flex", gap: 16, marginBottom: 24, marginTop: 8, flexWrap: "wrap",
          }}>
            <div style={{
              flex: "1 1 140px", background: "#fff7e6", border: "2px solid #ff9600",
              borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: "2rem" }}>🔥</span>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#ff9600" }}>{streak.count}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#777", textTransform: "uppercase" }}>Day streak</div>
              </div>
            </div>
            <div style={{
              flex: "1 1 200px", background: "#e6f9e0", border: "2px solid #58cc02",
              borderRadius: 16, padding: "14px 18px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#3c3c3c" }}>Daily Goal</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 900, color: "#58cc02" }}>{dailyGoal.done}/{dailyGoal.goal}</span>
              </div>
              <div style={{ background: "#d4edcc", borderRadius: 8, height: 10, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, (dailyGoal.done / dailyGoal.goal) * 100)}%`,
                  height: "100%", background: "#58cc02", borderRadius: 8,
                  transition: "width 0.4s ease-out",
                }} />
              </div>
              <div style={{ fontSize: "0.7rem", color: "#777", marginTop: 4 }}>
                {dailyGoal.done >= dailyGoal.goal ? "Goal reached! Keep going!" : `${dailyGoal.goal - dailyGoal.done} more to go`}
              </div>
            </div>
          </section>
        )}

        {/* Topic mastery tree - real chapter-based skill path */}
        <section className="lt-home__skillTree" aria-label="Your learning path">
          <h2 className="lt-home__sectionTitle">Your learning path</h2>
          <p className="lt-home__sectionSub">
            Master each topic from basics to board-ready — one chapter at a time.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            {(["maths", "science"] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setTopicSubject(s)}
                style={{
                  padding: "6px 18px", borderRadius: 12, border: "none",
                  fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", textTransform: "capitalize",
                  background: topicSubject === s ? "#58cc02" : "#f0f0f0",
                  color: topicSubject === s ? "#fff" : "#777",
                }}
              >
                {s === "maths" ? "📐 Maths" : "🔬 Science"}
              </button>
            ))}
          </div>

          <div className="lt-home__topicTree">
            {chapters.map((ch, i) => {
              const m = getChapterMastery(ch.chapterId);
              const nodeColor = m.level === "locked" ? "#e5e5e5" : MASTERY_COLORS[m.level];
              const subjectTitle = ch.subjectId === "maths" ? "Maths" : "Science";
              return (
                <div key={ch.chapterId} className="lt-home__topicNode">
                  {i > 0 && <div className="lt-home__topicConnector" />}
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <svg viewBox="0 0 60 60" style={{ width: 56, height: 56, transform: "rotate(-90deg)" }}>
                      <circle cx="30" cy="30" r="26" fill="none" stroke="#e5e5e5" strokeWidth="4" />
                      <circle cx="30" cy="30" r="26" fill="none" stroke={nodeColor} strokeWidth="4"
                        className="lt-progress-ring"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - m.pct / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <button
                      type="button"
                      className="lt-home__topicCircle"
                      style={{
                        position: "absolute", inset: 6, borderRadius: "50%",
                        background: m.level === "locked" ? "#f7f7f7" : nodeColor,
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, color: m.level === "locked" ? "#afafaf" : "#fff",
                        fontWeight: 900,
                      }}
                      onClick={() => navigate(`/topic-hub/10/${subjectTitle}?topic=${ch.canonicalSlug}`)}
                    >
                      {m.level === "mastered" ? "⭐" : m.level === "locked" ? "🔒" : (i + 1)}
                    </button>
                  </div>
                  <div className="lt-home__topicInfo">
                    <span className="lt-home__topicTitle">{ch.title}</span>
                    <span className="lt-home__topicMastery" style={{ color: nodeColor, fontSize: 11, fontWeight: 800 }}>
                      {m.level === "mastered" ? "Mastered" : m.level === "progressing" ? `${m.pct}% complete` : m.level === "started" ? "Started" : "Not started"}
                    </span>
                  </div>
                </div>
              );
            })}
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
