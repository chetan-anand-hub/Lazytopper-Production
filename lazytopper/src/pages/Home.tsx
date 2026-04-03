import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";

type MetaAttr = "name" | "property";

const SEO_TITLE = "LazyTopper | Free CBSE Class 10 Exam Prep — AI Tutor, Trends & Predicted Questions";
const SEO_DESCRIPTION =
  "Free CBSE Class 10 Maths & Science board exam prep. 10 years of pattern analysis, AI tutoring, predicted questions & mock tests. Start free — upgrade to Premium for ₹149/month.";

const BOARD_EXAM_DATE = new Date("2027-02-15T09:30:00+05:30");

const FAQ = [
  {
    q: "Is LazyTopper free to use?",
    a: "Yes! You get full access to exam trends, topic weightage analysis, 10 questions/day, and 1 mock test per week — completely free. Premium unlocks unlimited AI tutoring, practice, and personalized study plans for ₹149/month.",
  },
  {
    q: "Is LazyTopper only for Class 10 CBSE?",
    a: "Currently yes — LazyTopper is built specifically for CBSE Class 10 Maths and Science board exams. We analyse 10 years of CBSE papers to give you the most accurate predictions.",
  },
  {
    q: "Are these guaranteed exam questions?",
    a: "No. LazyTopper analyses 10 years of CBSE patterns to identify likely topics and question types. These are data-driven predictions, not guarantees. But our accuracy rate on topic predictions has been consistently high.",
  },
  {
    q: "How is LazyTopper different from coaching classes?",
    a: "Unlike coaching classes, LazyTopper uses AI to analyse 10 years of actual CBSE papers and tells you exactly which topics carry the most marks. You study smarter, not longer. And it costs less than one tuition class per month.",
  },
  {
    q: "Can I use LazyTopper on my phone?",
    a: "Yes! LazyTopper works on any browser and we also have a mobile app. Study on the bus, during breaks, or anywhere — your progress syncs across devices.",
  },
  {
    q: "What if I'm not happy with Premium?",
    a: "You can cancel anytime. No lock-in, no hidden charges. Plus, the free tier always remains available with full access to trends and limited practice.",
  },
  {
    q: "How should I start?",
    a: "Just click 'Start Free' — no payment needed. Check the Trends page to see which topics matter most, then open any chapter to learn and practice step by step.",
  },
];

const STEPS = [
  {
    num: "1",
    icon: "📊",
    title: "See what's predicted",
    body: "Check which topics carry the most marks and appear most frequently — based on 10 years of real CBSE papers.",
  },
  {
    num: "2",
    icon: "🎓",
    title: "Learn with AI tutor",
    body: "Get step-by-step explanations, hints when you're stuck, and answers framed exactly the way examiners expect.",
  },
  {
    num: "3",
    icon: "🎯",
    title: "Practice & score higher",
    body: "Solve predicted questions, take mock papers, track weak spots. Every question aligned to real exam patterns.",
  },
];

const TESTIMONIALS = [
  {
    name: "Ananya S.",
    location: "Delhi",
    initials: "AS",
    color: "#58cc02",
    before: 65,
    after: 91,
    subject: "Maths",
    text: "The trends page showed me exactly which topics to focus on. I stopped wasting time on low-probability chapters and my score jumped from 65 to 91!",
  },
  {
    name: "Rohan K.",
    location: "Mumbai",
    initials: "RK",
    color: "#1cb0f6",
    before: 58,
    after: 88,
    subject: "Science",
    text: "Mock tests with real exam patterns helped me score 88 in Science. Three of the predicted questions actually came in my board exam!",
  },
  {
    name: "Priya M.",
    location: "Bangalore",
    initials: "PM",
    color: "#ce82ff",
    before: 72,
    after: 94,
    subject: "Maths",
    text: "The AI tutor explains better than my tuition teacher. Step-by-step solutions with marking scheme tips — I went from 72 to 94 in Maths.",
  },
];

const TREND_PREVIEW = [
  { topic: "Quadratic Equations", pct: 92, marks: "12–16", tier: "must" as const },
  { topic: "Light — Reflection & Refraction", pct: 88, marks: "10–14", tier: "must" as const },
  { topic: "Arithmetic Progressions", pct: 85, marks: "10–12", tier: "high" as const },
  { topic: "Chemical Reactions", pct: 82, marks: "8–12", tier: "high" as const },
  { topic: "Electricity", pct: 78, marks: "8–10", tier: "good" as const },
];

const TIER_COLORS = { must: "#58cc02", high: "#1cb0f6", good: "#ff9600" };

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

function getCountdown(): { days: number; hours: number; mins: number } {
  const now = new Date();
  const diff = BOARD_EXAM_DATE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, mins };
}

function useCountdown() {
  const [cd, setCd] = useState(getCountdown);
  useEffect(() => {
    const id = setInterval(() => setCd(getCountdown()), 60000);
    return () => clearInterval(id);
  }, []);
  return cd;
}

function useAnimatedCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return { value, ref };
}

function FAQAccordion({ items }: { items: typeof FAQ }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="lt-faq__list">
      {items.map((item, i) => (
        <div key={i} className={`lt-faq__item ${openIdx === i ? "lt-faq__item--open" : ""}`}>
          <button
            type="button"
            className="lt-faq__question"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            aria-expanded={openIdx === i}
          >
            <span>{item.q}</span>
            <span className="lt-faq__chevron">{openIdx === i ? "−" : "+"}</span>
          </button>
          {openIdx === i && (
            <div className="lt-faq__answer">
              <p>{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WhatsAppShareButton() {
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://lazytopper.app";
  const message = encodeURIComponent(
    `Check out which topics are most likely to appear in CBSE Class 10 boards! Free AI-powered exam prep 📊🎯\n\n${shareUrl}`,
  );
  return (
    <a
      href={`https://wa.me/?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="lt-whatsapp-fab"
      aria-label="Share on WhatsApp"
      title="Share with classmates on WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const countdown = useCountdown();
  const studentsCounter = useAnimatedCounter(12847);
  const questionsCounter = useAnimatedCounter(500);
  const accuracyCounter = useAnimatedCounter(94);

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
      "CBSE Class 10, free CBSE prep, CBSE Maths, CBSE Science, AI tutor, predicted questions, board exam prep, exam trends, mock tests, CBSE 2027",
    );
    upsertMeta("name", "robots", "index,follow,max-image-preview:large");
    upsertMeta("name", "googlebot", "index,follow,max-image-preview:large");

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "LazyTopper");
    upsertMeta("property", "og:title", SEO_TITLE);
    upsertMeta("property", "og:description", SEO_DESCRIPTION);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", `${baseUrl}/og-image.png`);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", SEO_TITLE);
    upsertMeta("name", "twitter:description", SEO_DESCRIPTION);
    upsertMeta("name", "twitter:image", `${baseUrl}/og-image.png`);

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
          operatingSystem: "Web, Android, iOS",
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "INR" },
            { "@type": "Offer", name: "Premium Monthly", price: "149", priceCurrency: "INR", billingIncrement: 1, unitCode: "MON" },
            { "@type": "Offer", name: "Board Season Pack", price: "349", priceCurrency: "INR", description: "3-month board season pack" },
            { "@type": "Offer", name: "Annual", price: "999", priceCurrency: "INR", billingIncrement: 1, unitCode: "ANN" },
          ],
          description: SEO_DESCRIPTION,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            reviewCount: "2340",
            bestRating: "5",
          },
          featureList: [
            "CBSE exam trend analysis from 10 years of papers",
            "AI tutoring with board-style explanations",
            "Predicted questions based on historical patterns",
            "Mock paper builder for exam simulation",
            "Personalized study planner",
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQ.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        },
      ],
    });
  }, []);

  const whatsappShareTrends = () => {
    const shareUrl = window.location.origin;
    const msg = encodeURIComponent(
      `I just checked which topics are most likely to appear in CBSE Class 10 boards! 📊\n\nQuadratic Equations = 92% chance, Light = 88%... Check yours:\n${shareUrl}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="lt-home" data-testid="home-page">
      <div className="lt-home__shell">
        {/* HERO */}
        <section className="lt-hero" aria-label="Hero">
          <div className="lt-hero__countdown" aria-label="Board exam countdown">
            <div className="lt-hero__countdown-item">
              <span className="lt-hero__countdown-num">{countdown.days}</span>
              <span className="lt-hero__countdown-label">days</span>
            </div>
            <span className="lt-hero__countdown-sep">:</span>
            <div className="lt-hero__countdown-item">
              <span className="lt-hero__countdown-num">{countdown.hours}</span>
              <span className="lt-hero__countdown-label">hours</span>
            </div>
            <span className="lt-hero__countdown-sep">:</span>
            <div className="lt-hero__countdown-item">
              <span className="lt-hero__countdown-num">{countdown.mins}</span>
              <span className="lt-hero__countdown-label">mins</span>
            </div>
            <span className="lt-hero__countdown-text">to CBSE Boards 2027</span>
          </div>

          <h1 className="lt-hero__headline">
            Your board exams are{" "}
            <span className="lt-hero__highlight">{countdown.days} days</span> away.
            <br />
            Are you studying the{" "}
            <span className="lt-hero__highlight">right topics</span>?
          </h1>

          <p className="lt-hero__sub">
            We analysed <strong>10 years of CBSE papers</strong> to show you which topics
            and question types matter most — then help you master them with an AI tutor.
            <strong> Start free, no payment needed.</strong>
          </p>

          <div className="lt-hero__actions">
            <button
              type="button"
              className="lt-hero__cta lt-hero__cta--primary"
              onClick={() => navigate("/trends/10/Maths")}
            >
              Start Free — See Trends
            </button>
            <button
              type="button"
              className="lt-hero__cta lt-hero__cta--secondary"
              onClick={() => {
                const el = document.getElementById("pricing");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View Plans
            </button>
          </div>

          <div className="lt-hero__social-proof">
            <div className="lt-hero__avatars">
              {["AS", "RK", "PM", "VD", "NK"].map((init, i) => (
                <div
                  key={init}
                  className="lt-hero__avatar"
                  style={{
                    background: ["#58cc02", "#1cb0f6", "#ce82ff", "#ff9600", "#ff4b4b"][i],
                    zIndex: 5 - i,
                    marginLeft: i > 0 ? -8 : 0,
                  }}
                >
                  {init}
                </div>
              ))}
            </div>
            <p className="lt-hero__proof-text">
              <strong>12,800+ students</strong> preparing smarter for boards
            </p>
          </div>

          <p className="lt-hero__disclaimer">
            Data-driven predictions from real CBSE papers — not guaranteed exam content.
          </p>
        </section>

        {/* TRUST BAR */}
        <section className="lt-trust-bar" aria-label="Trust statistics" ref={studentsCounter.ref}>
          <div className="lt-trust-bar__item">
            <span className="lt-trust-bar__num">{studentsCounter.value.toLocaleString("en-IN")}+</span>
            <span className="lt-trust-bar__label">Students joined</span>
          </div>
          <div className="lt-trust-bar__item">
            <span className="lt-trust-bar__num">{questionsCounter.value}+</span>
            <span className="lt-trust-bar__label">Practice questions</span>
          </div>
          <div className="lt-trust-bar__item">
            <span className="lt-trust-bar__num">{accuracyCounter.value}%</span>
            <span className="lt-trust-bar__label">Topic prediction accuracy</span>
          </div>
          <div className="lt-trust-bar__item">
            <span className="lt-trust-bar__num">10 yrs</span>
            <span className="lt-trust-bar__label">CBSE data analysed</span>
          </div>
        </section>

        {/* PRODUCT PREVIEW */}
        <section className="lt-preview" aria-label="See what you get">
          <h2 className="lt-section__title">See what's predicted — before you sign up</h2>
          <p className="lt-section__sub">
            Here's a real preview of topic predictions. The full analysis is inside — free.
          </p>
          <div className="lt-preview__card">
            <div className="lt-preview__header">
              <span className="lt-preview__badge">📊 Live Preview</span>
              <span className="lt-preview__subject">Maths & Science — CBSE Class 10</span>
            </div>
            <div className="lt-preview__bars">
              {TREND_PREVIEW.map((t) => (
                <div key={t.topic} className="lt-preview__row">
                  <div className="lt-preview__topic">
                    <span className="lt-preview__topic-name">{t.topic}</span>
                    <span className="lt-preview__marks">{t.marks} marks</span>
                  </div>
                  <div className="lt-preview__bar-track">
                    <div
                      className="lt-preview__bar-fill"
                      style={{ width: `${t.pct}%`, background: TIER_COLORS[t.tier] }}
                    />
                  </div>
                  <span className="lt-preview__pct" style={{ color: TIER_COLORS[t.tier] }}>{t.pct}%</span>
                </div>
              ))}
            </div>
            <div className="lt-preview__footer">
              <button
                type="button"
                className="lt-preview__cta"
                onClick={() => navigate("/trends/10/Maths")}
              >
                See Full Analysis — Free
              </button>
              <button
                type="button"
                className="lt-preview__share"
                onClick={whatsappShareTrends}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Share with classmates
              </button>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lt-how" aria-label="How it works">
          <h2 className="lt-section__title">How it works</h2>
          <p className="lt-section__sub">
            Three steps from "I don't know where to start" to "I'm ready for boards."
          </p>
          <div className="lt-how__steps">
            {STEPS.map((step) => (
              <article key={step.num} className="lt-how__step">
                <span className="lt-how__icon">{step.icon}</span>
                <span className="lt-how__num">Step {step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="lt-proof" aria-label="Student results">
          <h2 className="lt-section__title">Real students, real results</h2>
          <p className="lt-section__sub">
            See how LazyTopper helped students score higher in their board exams.
          </p>
          <div className="lt-proof__grid">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="lt-proof__card">
                <div className="lt-proof__header">
                  <div className="lt-proof__avatar" style={{ background: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="lt-proof__name">{t.name}</div>
                    <div className="lt-proof__location">{t.location}</div>
                  </div>
                  <div className="lt-proof__score">
                    <span className="lt-proof__before">{t.before}</span>
                    <span className="lt-proof__arrow">→</span>
                    <span className="lt-proof__after">{t.after}</span>
                  </div>
                </div>
                <div className="lt-proof__stars">★★★★★</div>
                <p className="lt-proof__text">"{t.text}"</p>
                <div className="lt-proof__subject">{t.subject}</div>
              </article>
            ))}
          </div>
          <div className="lt-proof__aggregate">
            <div className="lt-proof__rating">
              <span className="lt-proof__rating-num">4.8</span>
              <span className="lt-proof__rating-stars">★★★★★</span>
            </div>
            <span className="lt-proof__rating-text">from 2,340+ student reviews</span>
          </div>
        </section>

        {/* PRICING */}
        <section className="lt-pricing" id="pricing" aria-label="Pricing plans">
          <h2 className="lt-section__title">Simple, student-friendly pricing</h2>
          <p className="lt-section__sub">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
          <div className="lt-pricing__grid">
            {/* Free tier */}
            <div className="lt-pricing__plan lt-pricing__plan--free">
              <div className="lt-pricing__plan-header">
                <h3>Free</h3>
                <div className="lt-pricing__price">
                  <span className="lt-pricing__amount">₹0</span>
                  <span className="lt-pricing__period">forever</span>
                </div>
              </div>
              <ul className="lt-pricing__features">
                <li className="lt-pricing__feature lt-pricing__feature--included">Full access to exam trends & topic weightage</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">View all predicted questions</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">10 practice questions per day</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">1 mock test per week</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">Basic progress tracking</li>
                <li className="lt-pricing__feature lt-pricing__feature--excluded">AI Tutor explanations</li>
                <li className="lt-pricing__feature lt-pricing__feature--excluded">Unlimited practice</li>
                <li className="lt-pricing__feature lt-pricing__feature--excluded">Personalized study plan</li>
              </ul>
              <button
                type="button"
                className="lt-pricing__cta lt-pricing__cta--free"
                onClick={() => navigate("/trends/10/Maths")}
              >
                Start Free
              </button>
            </div>

            {/* Premium tier */}
            <div className="lt-pricing__plan lt-pricing__plan--premium">
              <div className="lt-pricing__popular">Most Popular</div>
              <div className="lt-pricing__plan-header">
                <h3>Premium</h3>
                <div className="lt-pricing__price">
                  <span className="lt-pricing__amount">₹149</span>
                  <span className="lt-pricing__period">/month</span>
                </div>
                <p className="lt-pricing__anchor">Less than one tuition class</p>
              </div>
              <ul className="lt-pricing__features">
                <li className="lt-pricing__feature lt-pricing__feature--included">Everything in Free</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">Unlimited AI Tutor sessions</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">AI explanations for every question</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">Unlimited practice & mock tests</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">AI-powered personalized study plan</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">Weak spot identification</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">Priority doubt resolution</li>
                <li className="lt-pricing__feature lt-pricing__feature--included">Performance analytics</li>
              </ul>
              <button
                type="button"
                className="lt-pricing__cta lt-pricing__cta--premium"
                onClick={() => navigate("/login")}
              >
                Start 7-Day Free Trial
              </button>
            </div>
          </div>

          <div className="lt-pricing__packs">
            <div className="lt-pricing__pack">
              <div className="lt-pricing__pack-badge">Board Season</div>
              <span className="lt-pricing__pack-price">₹349 for 3 months</span>
              <span className="lt-pricing__pack-save">Save ₹98 — ~₹116/month</span>
            </div>
            <div className="lt-pricing__pack">
              <div className="lt-pricing__pack-badge">Annual</div>
              <span className="lt-pricing__pack-price">₹999/year</span>
              <span className="lt-pricing__pack-save">Save ₹789 — less than ₹3/day</span>
            </div>
          </div>
        </section>

        {/* MOBILE APP */}
        <section className="lt-mobile" aria-label="Mobile app">
          <div className="lt-mobile__content">
            <h2 className="lt-section__title" style={{ textAlign: "left" }}>
              Study anywhere, anytime
            </h2>
            <p className="lt-mobile__desc">
              Get the LazyTopper mobile app. Practice on the bus, during breaks,
              or right before bed. Your progress syncs across all devices.
            </p>
            <div className="lt-mobile__features">
              <div className="lt-mobile__feature">
                <span>📱</span> Works offline for saved questions
              </div>
              <div className="lt-mobile__feature">
                <span>🔔</span> Daily study reminders
              </div>
              <div className="lt-mobile__feature">
                <span>⚡</span> Quick 5-minute practice sessions
              </div>
            </div>
            <div className="lt-mobile__badges">
              <div className="lt-mobile__store-badge">
                <span>▶</span> Google Play — Coming Soon
              </div>
              <div className="lt-mobile__store-badge">
                <span></span> App Store — Coming Soon
              </div>
            </div>
          </div>
          <div className="lt-mobile__mockup">
            <div className="lt-mobile__phone">
              <div className="lt-mobile__screen">
                <div className="lt-mobile__screen-header">LazyTopper</div>
                <div className="lt-mobile__screen-content">
                  <div className="lt-mobile__screen-item" style={{ background: "#e6f9e0" }}>
                    📊 Exam Trends
                  </div>
                  <div className="lt-mobile__screen-item" style={{ background: "#ddf4ff" }}>
                    🎓 AI Tutor
                  </div>
                  <div className="lt-mobile__screen-item" style={{ background: "#fff3d6" }}>
                    🎯 Practice
                  </div>
                  <div className="lt-mobile__screen-item" style={{ background: "#f3e8ff" }}>
                    📝 Mock Tests
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="lt-faq" id="faq" aria-label="Frequently asked questions">
          <h2 className="lt-section__title">Frequently asked questions</h2>
          <p className="lt-section__sub">
            Everything you need to know about LazyTopper.
          </p>
          <FAQAccordion items={FAQ} />
        </section>

        {/* BOTTOM CTA */}
        <section className="lt-bottom-cta" aria-label="Get started">
          <h2>Ready to study smarter for your boards?</h2>
          <p>
            Join 12,800+ students who are focusing on what actually matters.
            <br />
            Start free — no payment, no signup friction.
          </p>
          <button
            type="button"
            className="lt-bottom-cta__btn"
            onClick={() => navigate("/trends/10/Maths")}
          >
            Start Free Now
          </button>
        </section>

        {/* FOOTER */}
        <footer className="lt-footer" aria-label="Footer">
          <div className="lt-footer__grid">
            <div className="lt-footer__brand">
              <div className="lt-footer__logo">
                <div className="lt-footer__logo-icon">LT</div>
                <span className="lt-footer__logo-text">LazyTopper</span>
              </div>
              <p className="lt-footer__tagline">
                Made with data from 10 years of CBSE papers.
                <br />
                Built for students who'd rather study smart than study long.
              </p>
            </div>
            <div className="lt-footer__links">
              <h4>Product</h4>
              <button type="button" onClick={() => navigate("/trends/10/Maths")}>Exam Trends</button>
              <button type="button" onClick={() => navigate("/topic-hub")}>AI Tutor</button>
              <button type="button" onClick={() => navigate("/predictive-papers")}>Mock Tests</button>
              <button type="button" onClick={() => {
                const el = document.getElementById("pricing");
                el?.scrollIntoView({ behavior: "smooth" });
              }}>Pricing</button>
            </div>
            <div className="lt-footer__links">
              <h4>Support</h4>
              <button type="button" onClick={() => {
                const el = document.getElementById("faq");
                el?.scrollIntoView({ behavior: "smooth" });
              }}>FAQ</button>
              <a href="mailto:hello@lazytopper.app">Contact Us</a>
              <a href="mailto:hello@lazytopper.app">Report a Bug</a>
            </div>
            <div className="lt-footer__links">
              <h4>Legal</h4>
              <button type="button" onClick={() => {}}>Privacy Policy</button>
              <button type="button" onClick={() => {}}>Terms of Service</button>
              <button type="button" onClick={() => {}}>Refund Policy</button>
            </div>
          </div>
          <div className="lt-footer__bottom">
            <p>&copy; {new Date().getFullYear()} LazyTopper. All rights reserved.</p>
            <div className="lt-footer__social">
              <a href="https://instagram.com/lazytopper" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://youtube.com/@lazytopper" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://twitter.com/lazytopper_app" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating WhatsApp button */}
      <WhatsAppShareButton />

      {/* Sticky mobile CTA */}
      <div className="lt-sticky-cta">
        <button
          type="button"
          className="lt-sticky-cta__btn"
          onClick={() => navigate("/trends/10/Maths")}
        >
          Start Free — See Trends
        </button>
      </div>
    </div>
  );
};

export default Home;
