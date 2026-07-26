import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import {
  ANNUAL_AT_MONTHLY_RATE_DISPLAY,
  ANNUAL_SAVING_DISPLAY,
  ANNUAL_SAVING_SUBLINE,
  MONTHS_PER_BOARD_YEAR,
  PERIOD_ANNUAL_LABEL,
  PERIOD_FREE_LABEL,
  PRICE_ANNUAL_DISPLAY,
  PRICE_FREE_DISPLAY,
  PRICE_MONTHLY_DISPLAY,
  TUITION_ANCHOR,
} from "../config/pricing";

const WAITLIST_KEY = "lazytopper.waitlist.v1";

interface WaitlistEntry {
  contact: string;
  board: string;
  ts: string;
}

function saveWaitlistEntry(entry: WaitlistEntry): void {
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    const list: WaitlistEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
  } catch {}
}

const FREE_FEATURES = [
  { label: "Browse Home, Exam Trends, and topic surfaces", included: true },
  { label: "Practice picker and limited practice", included: true },
  { label: "Limited worksheet generation", included: true },
  { label: "Basic topic insights", included: true },
  { label: "Solution Checker / Check & Improve", included: false },
  { label: "Deep Mistake Intelligence", included: false },
  { label: "Full mocks and predicted-question execution", included: false },
  { label: "Richer Me / Progress recommendations", included: false },
];

// Ordering is deliberate and owner-ruled.
//   - "Everything in Basic" stays FIRST and unchanged: it is load-bearing
//     reassurance that the free tier is not being taken away, which matters more
//     to the paying parent than it does to the student.
//   - The five below are the differentiators, in moat-first order: lead with the
//     tutor that knows this student, prove it with the grader, then the
//     board-shaped execution surfaces.
//   - Quota / fair-use wording belongs in the FAQ, never here — a plan that
//     advertises limits reads as rationed.
const PREMIUM_FEATURES = [
  { label: "Everything in Basic", included: true },
  { label: "Your AI tutor that actually knows you — your chapters, your mistakes, your pace", included: true },
  { label: "Mistake Intelligence — why you lose marks, not just where", included: true },
  { label: "Check & Improve — photograph your handwritten solution, graded like a board examiner", included: true },
  { label: "Full mocks and predicted-question papers — real board blueprint", included: true },
  { label: "Progress that tells you what to fix next", included: true },
];

const BOARDS_COMING = [
  { name: "ICSE Board", icon: "🏛️" },
  { name: "State Boards", icon: "🗺️" },
  { name: "Class 12 CBSE", icon: "🎓" },
];

const PRICING_CSS = `
  .lt-pricing-page,
  .lt-pricing-page * {
    box-sizing: border-box;
  }

  html:has(.lt-pricing-page),
  body:has(.lt-pricing-page),
  #root:has(.lt-pricing-page),
  #root > div:has(.lt-pricing-page) {
    background: #051733;
  }

  #root > div:has(.lt-pricing-page) {
    padding-bottom: 0 !important;
  }

  #root:has(.lt-pricing-page) > div[style*="position: fixed"][style*="bottom: 0px"] {
    display: none !important;
  }

  .lt-pricing-page {
    --lt-navy: #071a3d;
    --lt-green: #16b96a;
    --lt-green-dark: #0b8f50;
    --lt-card: rgba(255, 255, 255, 0.06);
    --lt-line: rgba(255, 255, 255, 0.10);
    --lt-muted: #adc1d5;
    --lt-ink: #f8fafc;

    min-height: 100svh;
    width: 100%;
    color: var(--lt-ink);
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.10) 0, rgba(22, 185, 106, 0) 24%),
      radial-gradient(circle at 18% 26%, rgba(125, 220, 255, 0.10) 0, rgba(125, 220, 255, 0) 23%),
      linear-gradient(180deg, #071a2d 0%, #051733 100%);
    padding: 48px 24px 100px;
  }

  .lt-pricing-inner {
    max-width: 960px;
    margin: 0 auto;
  }

  .lt-pricing-header {
    text-align: center;
    margin-top: 32px;
    margin-bottom: 48px;
  }

  .lt-pricing-title {
    margin: 0 0 16px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 3.2rem;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #ffffff;
  }

  .lt-pricing-subtitle {
    margin: 0 auto;
    max-width: 640px;
    color: var(--lt-muted);
    font-size: 1.02rem;
    line-height: 1.55;
    font-weight: 500;
  }

  .lt-pricing-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
    margin-bottom: 48px;
  }

  .lt-pricing-card {
    position: relative;
    padding: 32px 28px;
    border-radius: 20px;
    background: var(--lt-card);
    border: 1px solid var(--lt-line);
    display: flex;
    flex-direction: column;
  }

  .lt-pricing-card--premium {
    background: rgba(22, 185, 106, 0.06);
    border-color: rgba(22, 185, 106, 0.30);
  }

  .lt-pricing-badge {
    position: absolute;
    top: -14px;
    right: 24px;
    padding: 4px 14px;
    border-radius: 999px;
    background: var(--lt-green);
    color: var(--lt-green-dark);
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow: 0 8px 18px rgba(22, 185, 106, 0.28);
  }

  .lt-pricing-plan-label {
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--lt-muted);
    margin-bottom: 12px;
  }

  .lt-pricing-plan-label--premium {
    color: var(--lt-green);
  }

  .lt-pricing-price {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 6px;
  }

  .lt-pricing-amount {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2.8rem;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .lt-pricing-period {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--lt-muted);
  }

  .lt-pricing-price-alt {
    margin: 0 0 4px;
    color: var(--lt-muted);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .lt-pricing-price-sub {
    margin: 0 0 14px;
    color: var(--lt-green);
    font-size: 0.82rem;
    font-weight: 700;
  }

  .lt-pricing-plan-desc {
    margin: 0 0 20px;
    color: var(--lt-muted);
    font-size: 0.88rem;
    line-height: 1.55;
  }

  .lt-pricing-features {
    list-style: none;
    margin: 0 0 24px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }

  .lt-pricing-feature {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
    font-size: 0.88rem;
    line-height: 1.55;
  }

  .lt-pricing-feature--on {
    color: var(--lt-ink);
  }

  .lt-pricing-feature--off {
    color: var(--lt-muted);
    opacity: 0.72;
  }

  .lt-pricing-feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: rgba(22, 185, 106, 0.12);
    border: 1px solid rgba(22, 185, 106, 0.24);
    color: var(--lt-green);
    font-size: 0.78rem;
    font-weight: 900;
    margin-top: 1px;
  }

  .lt-pricing-feature--off .lt-pricing-feature-icon {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.10);
    color: var(--lt-muted);
  }

  .lt-pricing-cta {
    appearance: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 48px;
    padding: 12px 18px;
    border: 0;
    border-radius: 13px;
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0;
    transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .lt-pricing-cta--primary {
    color: #ffffff;
    background: var(--lt-navy);
    box-shadow: 0 16px 28px rgba(7, 26, 61, 0.20), inset 0 0 0 1px rgba(255, 255, 255, 0.10);
  }

  .lt-pricing-cta--primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 32px rgba(7, 26, 61, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  }

  .lt-pricing-cta--secondary {
    color: var(--lt-ink);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .lt-pricing-cta--secondary:hover {
    background: rgba(255, 255, 255, 0.10);
    border-color: rgba(255, 255, 255, 0.22);
  }

  .lt-pricing-fine-print {
    margin: 12px 0 0;
    text-align: center;
    color: var(--lt-muted);
    font-size: 0.76rem;
    line-height: 1.45;
    font-weight: 500;
  }

  .lt-pricing-faq {
    padding: 36px 32px;
    border-radius: 20px;
    background: var(--lt-card);
    border: 1px solid var(--lt-line);
    margin-bottom: 32px;
  }

  .lt-pricing-faq-title {
    margin: 0 0 24px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.6rem;
    line-height: 1.2;
    font-weight: 800;
    color: #ffffff;
    text-align: center;
  }

  .lt-pricing-faq-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 720px;
    margin: 0 auto;
  }

  .lt-pricing-faq-item {
    padding: 16px 18px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .lt-pricing-faq-q {
    margin: 0 0 6px;
    color: var(--lt-ink);
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.35;
  }

  .lt-pricing-faq-a {
    margin: 0;
    color: var(--lt-muted);
    font-size: 0.88rem;
    line-height: 1.55;
  }

  .lt-pricing-coming {
    padding: 36px 32px;
    border-radius: 20px;
    background: var(--lt-card);
    border: 1px solid var(--lt-line);
    text-align: center;
    margin-bottom: 24px;
  }

  .lt-pricing-coming-title {
    margin: 0 0 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.6rem;
    line-height: 1.2;
    font-weight: 800;
    color: #ffffff;
  }

  .lt-pricing-coming-lede {
    margin: 0 auto 24px;
    max-width: 540px;
    color: var(--lt-muted);
    font-size: 0.88rem;
    line-height: 1.55;
  }

  .lt-pricing-coming-chips {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .lt-pricing-coming-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(22, 185, 106, 0.12);
    border: 1px solid rgba(22, 185, 106, 0.24);
    color: var(--lt-ink);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .lt-pricing-coming-chip-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .lt-pricing-waitlist {
    padding: 36px 32px;
    border-radius: 20px;
    background: var(--lt-card);
    border: 1px solid var(--lt-line);
  }

  .lt-pricing-waitlist-title {
    margin: 0 0 8px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.6rem;
    line-height: 1.2;
    font-weight: 800;
    color: #ffffff;
    text-align: center;
  }

  .lt-pricing-waitlist-lede {
    margin: 0 auto 22px;
    max-width: 540px;
    color: var(--lt-muted);
    font-size: 0.88rem;
    line-height: 1.55;
    text-align: center;
  }

  .lt-pricing-waitlist-form {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 560px;
    margin: 0 auto;
  }

  .lt-pricing-waitlist-input,
  .lt-pricing-waitlist-select {
    font-family: inherit;
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: var(--lt-ink);
    font-size: 0.88rem;
    outline: none;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }

  .lt-pricing-waitlist-input {
    flex: 1 1 220px;
    min-width: 0;
  }

  .lt-pricing-waitlist-select {
    flex: 0 1 160px;
    cursor: pointer;
  }

  .lt-pricing-waitlist-select option {
    background: #071a3d;
    color: #ffffff;
  }

  .lt-pricing-waitlist-input::placeholder {
    color: var(--lt-muted);
  }

  .lt-pricing-waitlist-input:focus,
  .lt-pricing-waitlist-select:focus {
    border-color: rgba(22, 185, 106, 0.50);
    box-shadow: 0 0 0 3px rgba(22, 185, 106, 0.15);
  }

  .lt-pricing-waitlist-cta {
    flex: 0 0 auto;
    appearance: none;
    cursor: pointer;
    padding: 12px 22px;
    border: 0;
    border-radius: 13px;
    background: var(--lt-navy);
    color: #ffffff;
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 800;
    box-shadow: 0 16px 28px rgba(7, 26, 61, 0.20), inset 0 0 0 1px rgba(255, 255, 255, 0.10);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  .lt-pricing-waitlist-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 20px 32px rgba(7, 26, 61, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  }

  .lt-pricing-waitlist-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 20px;
    max-width: 560px;
    margin: 0 auto;
    border-radius: 16px;
    background: rgba(22, 185, 106, 0.10);
    border: 1px solid rgba(22, 185, 106, 0.28);
    text-align: center;
  }

  .lt-pricing-waitlist-success-emoji {
    font-size: 1.6rem;
    line-height: 1;
  }

  .lt-pricing-waitlist-success-title {
    margin: 0;
    color: var(--lt-green);
    font-size: 1rem;
    font-weight: 800;
  }

  .lt-pricing-waitlist-success-sub {
    margin: 0;
    color: var(--lt-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  /* Large desktop */
  @media (min-width: 1440px) {
    .lt-pricing-page {
      padding: 64px 48px 100px;
    }
  }

  /* Narrow laptop — compress card padding, reduce hero heading */
  @media (min-width: 1024px) and (max-width: 1180px) {
    .lt-pricing-title {
      font-size: 2.6rem;
    }
    .lt-pricing-card {
      padding: 28px 22px;
    }
    .lt-pricing-amount {
      font-size: 2.5rem;
    }
  }

  /* Short laptop screen — reduce vertical gaps by ~25% */
  @media (min-width: 1024px) and (max-height: 820px) {
    .lt-pricing-page {
      padding: 36px 24px 80px;
    }
    .lt-pricing-header {
      margin-top: 24px;
      margin-bottom: 36px;
    }
    .lt-pricing-cards {
      gap: 18px;
      margin-bottom: 36px;
    }
    .lt-pricing-faq,
    .lt-pricing-coming,
    .lt-pricing-waitlist {
      padding: 28px 26px;
      margin-bottom: 24px;
    }
  }

  /* Tablet / mobile — single column, stack plan cards */
  @media (max-width: 1023px) {
    .lt-pricing-page {
      padding: 32px 24px 80px;
    }
    .lt-pricing-header {
      margin-top: 16px;
      margin-bottom: 32px;
    }
    .lt-pricing-title {
      font-size: 2rem;
    }
    .lt-pricing-subtitle {
      font-size: 0.94rem;
    }
    .lt-pricing-cards {
      grid-template-columns: 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }
    .lt-pricing-faq-title,
    .lt-pricing-coming-title,
    .lt-pricing-waitlist-title {
      font-size: 1.3rem;
    }
    .lt-pricing-amount {
      font-size: 2.4rem;
    }
    .lt-pricing-faq,
    .lt-pricing-coming,
    .lt-pricing-waitlist {
      padding: 28px 24px;
    }
  }

  /* Small mobile — tighten horizontal padding, stack waitlist form */
  @media (max-width: 520px) {
    .lt-pricing-page {
      padding: 24px 16px 80px;
    }
    .lt-pricing-title {
      font-size: 1.75rem;
    }
    .lt-pricing-card {
      padding: 24px 20px;
    }
    .lt-pricing-faq,
    .lt-pricing-coming,
    .lt-pricing-waitlist {
      padding: 24px 20px;
    }
    .lt-pricing-waitlist-form {
      flex-direction: column;
    }
    .lt-pricing-waitlist-input,
    .lt-pricing-waitlist-select,
    .lt-pricing-waitlist-cta {
      flex: 1 1 auto;
      width: 100%;
    }
  }
`;

const FAQ_ITEMS = [
  {
    q: "Is Basic really free?",
    a: "Yes. Basic keeps browse-first access and limited practice tools available without paid activation.",
  },
  {
    q: "Should I pay monthly or for the board year?",
    a: `${MONTHS_PER_BOARD_YEAR} months at ${PRICE_MONTHLY_DISPLAY} comes to ${ANNUAL_AT_MONTHLY_RATE_DISPLAY}. The board year is ${PRICE_ANNUAL_DISPLAY}, so you save ${ANNUAL_SAVING_DISPLAY} and stay covered right through your board exams. Monthly is there if you would rather start small.`,
  },
  {
    q: "Are there any usage limits?",
    a: "Basic includes limited practice and worksheet generation. Premium includes stronger practice and worksheet quotas, subject to fair use.",
  },
  {
    q: "What happens after the trial ends?",
    a: "You keep using the free plan. Nothing is charged automatically; you choose when to upgrade.",
  },
  {
    q: "Can I pay here?",
    a: "Not yet. Payment checkout is not connected in this build, so Premium activation stays manual.",
  },
  {
    q: "Is this only for CBSE Class 10?",
    a: "Currently yes. We're expanding to ICSE, State Boards, and Class 12 soon!",
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [waitlistContact, setWaitlistContact] = useState("");
  const [waitlistBoard, setWaitlistBoard] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const handleStartTrial = () => {
    navigate(`/login?reason=start-trial&redirect=${encodeURIComponent("/pricing")}`);
  };

  const handleWaitlistSubmit = () => {
    if (!waitlistContact.trim()) return;
    saveWaitlistEntry({
      contact: waitlistContact.trim(),
      board: waitlistBoard || "not specified",
      ts: new Date().toISOString(),
    });
    setWaitlistSubmitted(true);
    setWaitlistContact("");
    setWaitlistBoard("");
  };

  return (
    <main className="lt-pricing-page" aria-label="LazyTopper pricing">
      <style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />
      <div className="lt-pricing-inner">
        <ReturnContextBar backTo="/" backLabel="Back to home" />

        <section className="lt-pricing-header">
          <h1 className="lt-pricing-title">Simple, Student-Friendly Plans</h1>
          <p className="lt-pricing-subtitle">
            Browse first. Sign in for a 7-day trial. Choose Premium when you
            need checked answers, Mistake Intelligence, and full mock workflows.
            Payment checkout is not automated yet.
          </p>
        </section>

        <div className="lt-pricing-cards">
          <div className="lt-pricing-card">
            <div className="lt-pricing-plan-label">Basic</div>
            <div className="lt-pricing-price">
              <span className="lt-pricing-amount">{PRICE_FREE_DISPLAY}</span>
              <span className="lt-pricing-period">{PERIOD_FREE_LABEL}</span>
            </div>
            <p className="lt-pricing-plan-desc">
              Browse the product and use limited learning tools without paid access.
            </p>
            <ul className="lt-pricing-features" aria-label="Basic plan features">
              {FREE_FEATURES.map(f => (
                <li
                  key={f.label}
                  className={
                    f.included
                      ? "lt-pricing-feature lt-pricing-feature--on"
                      : "lt-pricing-feature lt-pricing-feature--off"
                  }
                >
                  <span className="lt-pricing-feature-icon" aria-hidden="true">
                    {f.included ? "✓" : "—"}
                  </span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="lt-pricing-cta lt-pricing-cta--secondary"
              onClick={() => navigate("/login")}
            >
              Start free
            </button>
          </div>

          <div className="lt-pricing-card lt-pricing-card--premium">
            <span className="lt-pricing-badge">Most Popular</span>
            <div className="lt-pricing-plan-label lt-pricing-plan-label--premium">
              Premium
            </div>
            <div className="lt-pricing-price">
              <span className="lt-pricing-amount">{PRICE_ANNUAL_DISPLAY}</span>
              <span className="lt-pricing-period">{PERIOD_ANNUAL_LABEL}</span>
            </div>
            <p className="lt-pricing-price-alt">
              {`or ${PRICE_MONTHLY_DISPLAY} / month · ${TUITION_ANCHOR}`}
            </p>
            <p className="lt-pricing-price-sub">{ANNUAL_SAVING_SUBLINE}</p>
            <p className="lt-pricing-plan-desc">
              Manual activation during beta. Payment checkout coming soon.
              Premium is not activated automatically.
            </p>
            <ul className="lt-pricing-features" aria-label="Premium plan features">
              {PREMIUM_FEATURES.map(f => (
                <li
                  key={f.label}
                  className="lt-pricing-feature lt-pricing-feature--on"
                >
                  <span className="lt-pricing-feature-icon" aria-hidden="true">✓</span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="lt-pricing-cta lt-pricing-cta--primary"
              onClick={handleStartTrial}
            >
              Start 7-day trial
            </button>
            <p className="lt-pricing-fine-print">
              No credit card required. Premium is not activated automatically.
            </p>
          </div>
        </div>

        <section className="lt-pricing-faq" aria-label="Pricing frequently asked questions">
          <h2 className="lt-pricing-faq-title">Frequently Asked Questions</h2>
          <div className="lt-pricing-faq-list">
            {FAQ_ITEMS.map(item => (
              <div key={item.q} className="lt-pricing-faq-item">
                <div className="lt-pricing-faq-q">{item.q}</div>
                <div className="lt-pricing-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="lt-pricing-coming" aria-label="Boards and classes coming soon">
          <h2 className="lt-pricing-coming-title">Coming Soon</h2>
          <p className="lt-pricing-coming-lede">
            We're expanding to more boards and classes. Join the waitlist to get early access.
          </p>
          <div className="lt-pricing-coming-chips">
            {BOARDS_COMING.map(b => (
              <span key={b.name} className="lt-pricing-coming-chip">
                <span className="lt-pricing-coming-chip-icon" aria-hidden="true">{b.icon}</span>
                <span>{b.name}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="lt-pricing-waitlist" aria-label="Early access waitlist">
          {waitlistSubmitted ? (
            <div className="lt-pricing-waitlist-success" role="status" aria-live="polite">
              <span className="lt-pricing-waitlist-success-emoji" aria-hidden="true">🎉</span>
              <p className="lt-pricing-waitlist-success-title">You're on the waitlist!</p>
              <p className="lt-pricing-waitlist-success-sub">We'll notify you when we launch.</p>
            </div>
          ) : (
            <>
              <h2 className="lt-pricing-waitlist-title">Join the waitlist</h2>
              <p className="lt-pricing-waitlist-lede">
                Tell us where to reach you and which board you're hoping for.
                We'll let you know as soon as we open access.
              </p>
              <div className="lt-pricing-waitlist-form">
                <input
                  type="text"
                  className="lt-pricing-waitlist-input"
                  value={waitlistContact}
                  onChange={e => setWaitlistContact(e.target.value)}
                  placeholder="Email or phone number"
                  aria-label="Email or phone number"
                />
                <select
                  className="lt-pricing-waitlist-select"
                  value={waitlistBoard}
                  onChange={e => setWaitlistBoard(e.target.value)}
                  aria-label="Board"
                >
                  <option value="">Board...</option>
                  <option value="icse">ICSE</option>
                  <option value="state">State Board</option>
                  <option value="cbse12">CBSE Class 12</option>
                </select>
                <button
                  type="button"
                  className="lt-pricing-waitlist-cta"
                  onClick={handleWaitlistSubmit}
                >
                  Join Waitlist
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
