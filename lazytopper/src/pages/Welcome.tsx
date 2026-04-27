import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  readLandingMemory,
  hasMeaningfulMemory,
  resolveResumeRoute,
  clearLandingMemory,
} from "../lib/desktop/landingMemory";

/**
 * Public landing page (`/welcome`).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/PublicLanding.tsx
 *
 * Section parity (visual translation only — production uses inline
 * styles + inline SVG, NOT shadcn / Tailwind / lucide-react):
 *
 *   1. Header bar          — logo, anchor nav, Log in + Start free trial CTAs.
 *   2. Hero                — chip, headline, sub-copy, primary + secondary CTA,
 *                            fine-print line.
 *   3. Welcome-back panel  — right-rail; renders only when real memory
 *                            exists (no faked attempts). Resume + Start fresh.
 *   4. Today's loop card   — right-rail; explicitly labelled "Sample preview".
 *   5. Why                 — 3 feature cards.
 *   6. Core loop           — 5 numbered steps.
 *   7. Inside the cockpit  — 6-row list + sidebar preview (inline SVG).
 *
 * Memory / resume:
 *   `hasMeaningfulMemory`, `memory`, `clearMemory`, and the resume
 *   target are computed from REAL production storage by
 *   `lib/desktop/landingMemory.ts`. No new persistence is introduced
 *   and no sample data is ever surfaced as the learner's own.
 *
 * Routes:
 *   All login CTAs target the production routes `/login?reason=...&redirect=...`
 *   — NOT the prototype's `/app/login`. Real Clerk auth is preserved.
 *
 * Mobile parity:
 *   `Welcome.tsx` is also rendered when the unauthenticated mobile
 *   `HomeRedirect` lands at `/`. The page uses inline media queries
 *   (`<style>` tag) so sections stack at narrow widths, the header
 *   anchor nav hides, CTAs go full-width, and font sizes shrink — no
 *   regression vs. the previous mobile single-card layout.
 */

const PRIMARY_GREEN = "#22c55e";
const PRIMARY_GREEN_GLOW = "rgba(34,197,94,0.3)";

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Snapshot real memory once per render. Reading is cheap and the
  // landing page is not interactive enough to warrant subscribing.
  const memory = useMemo(() => readLandingMemory(), []);
  const hasMemory = hasMeaningfulMemory(memory);
  const resumeRoute = useMemo(() => resolveResumeRoute(memory), [memory]);

  const continueLine = (() => {
    if (!memory) return "Continue where you left off";
    if (memory.lastAttempt) {
      return `Continue from ${memory.lastAttempt.topicLabel}`;
    }
    if (memory.subject) {
      return `Continue from ${memory.subject}`;
    }
    return "Continue where you left off";
  })();

  const lastSavedLine = (() => {
    if (memory?.lastAttempt) {
      const when = formatRelativeDate(memory.lastAttempt.savedAt);
      return `Last saved: ${memory.lastAttempt.subject} · ${memory.lastAttempt.topicLabel}${
        when ? ` · ${when}` : ""
      }`;
    }
    if (memory?.subject) {
      const grade = memory.grade ? `Class ${memory.grade}` : "Last focus";
      return `${grade} · ${memory.subject}`;
    }
    return "Continue where you left off";
  })();

  const goLogin = (reason: string, redirect: string) => {
    const qs = `?reason=${encodeURIComponent(reason)}&redirect=${encodeURIComponent(redirect)}`;
    navigate(`/login${qs}`);
  };

  const onStartTrial = () => {
    // Existing onboarding redirect chain is preserved by Login.tsx —
    // it will still route through onboarding / profile gates after auth.
    if (user) {
      navigate("/onboarding");
    } else {
      goLogin("start-trial", "/onboarding");
    }
  };

  const onResume = () => goLogin("login", resumeRoute);

  const onStartFresh = () => {
    clearLandingMemory();
    goLogin("start-trial", "/onboarding");
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="dark-page"
      style={{
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        .lt-landing { box-sizing: border-box; }
        .lt-landing * { box-sizing: border-box; }
        .lt-landing .font-display { font-family: 'Space Grotesk', sans-serif; }

        .lt-landing .anchor-nav { display: none; }
        .lt-landing .hero-grid { display: flex; flex-direction: column; gap: 24px; }
        .lt-landing .hero-headline { font-size: 36px; line-height: 1.1; }
        .lt-landing .hero-sub { font-size: 15px; }
        .lt-landing .why-grid,
        .lt-landing .loop-grid,
        .lt-landing .cockpit-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .lt-landing .header-cta-trial-text { display: none; }

        @media (min-width: 768px) {
          .lt-landing .anchor-nav { display: flex; }
          .lt-landing .hero-headline { font-size: 48px; }
          .lt-landing .hero-sub { font-size: 17px; }
          .lt-landing .why-grid { grid-template-columns: repeat(3, 1fr); }
          .lt-landing .loop-grid { grid-template-columns: repeat(5, 1fr); }
          .lt-landing .cockpit-grid { grid-template-columns: 1.2fr 1fr; align-items: start; }
          .lt-landing .header-cta-trial-text { display: inline; }
        }
        @media (min-width: 1024px) {
          .lt-landing .hero-grid { display: grid; grid-template-columns: 7fr 5fr; gap: 40px; align-items: center; }
          .lt-landing .hero-headline { font-size: 56px; }
        }
      ` ,
        }}
      />

      <div className="lt-landing" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* ── 1. Header ──────────────────────────────────────────────── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            borderBottom: "1px solid var(--bg-card)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <a
              href="/welcome"
              onClick={(e) => {
                e.preventDefault();
                navigate("/welcome");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${PRIMARY_GREEN}, #3b82f6)`,
                  color: "#000",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 14,
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: `0 0 20px ${PRIMARY_GREEN_GLOW}`,
                }}
              >
                L
              </div>
              <span
                className="font-display"
                style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}
              >
                LazyTopper
              </span>
            </a>

            <nav
              className="anchor-nav"
              style={{
                alignItems: "center",
                gap: 24,
                fontSize: 14,
                color: "var(--text-muted)",
              }}
            >
              {[
                ["why", "Why"],
                ["loop", "How it works"],
                ["cockpit", "The cockpit"],
                ["trial", "Trial"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(id);
                  }}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => goLogin("login", "/")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: 10,
                }}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => goLogin("start-trial", "/onboarding")}
                style={{
                  background: PRIMARY_GREEN,
                  color: "#000",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 800,
                  padding: "8px 14px",
                  cursor: "pointer",
                  borderRadius: 10,
                  boxShadow: `0 0 20px ${PRIMARY_GREEN_GLOW}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <span className="header-cta-trial-text">Start free trial</span>
                <span aria-hidden style={{ display: "inline-flex" }}>
                  <ArrowRightIcon size={14} />
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* ── 2. Hero + 3. Welcome-back panel + 4. Today's loop card ── */}
        <section
          style={{
            borderBottom: "1px solid var(--bg-card)",
          }}
        >
          <div
            className="hero-grid"
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "56px 20px 64px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.12)",
                  color: PRIMARY_GREEN,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 18,
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                <SparklesIcon size={14} />
                CBSE Class 10 · Maths &amp; Science
              </div>
              <h1
                className="font-display hero-headline"
                style={{
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  marginBottom: 18,
                }}
              >
                Know what matters. Practise what helps.{" "}
                <span style={{ color: PRIMARY_GREEN }}>
                  Fix what costs marks.
                </span>
              </h1>
              <p
                className="hero-sub"
                style={{
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                  maxWidth: 560,
                  marginBottom: 26,
                }}
              >
                LazyTopper is your action companion for the boards. Pick a
                topic, generate a worksheet, attempt a full 80-mark mock, or
                check your own answers. Every mistake quietly powers your
                next practice — no rigid timetable, ever.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={onStartTrial}
                  style={{
                    height: 48,
                    padding: "0 20px",
                    borderRadius: 12,
                    border: "none",
                    background: PRIMARY_GREEN,
                    color: "#000",
                    fontWeight: 800,
                    fontSize: 16,
                    fontFamily: "'Space Grotesk', sans-serif",
                    cursor: "pointer",
                    boxShadow: `0 0 28px ${PRIMARY_GREEN_GLOW}`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Start free trial <ArrowRightIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/trends/10/Maths")}
                  style={{
                    height: 48,
                    padding: "0 20px",
                    borderRadius: 12,
                    border: "1px solid var(--bg-card)",
                    background: "transparent",
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: 16,
                    fontFamily: "'Space Grotesk', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  Explore the cockpit
                </button>
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Free trial unlocks personalised practice. No card. No
                timetable. Cancel anytime.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* 3. Welcome-back panel — real-data-only */}
              {hasMemory && memory && (
                <div
                  style={{
                    border: `1px solid rgba(34,197,94,0.35)`,
                    background:
                      "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(34,197,94,0.04))",
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: PRIMARY_GREEN,
                        color: "#000",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <RotateLeftIcon size={16} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        Welcome back
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {continueLine}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lastSavedLine}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <button
                          type="button"
                          onClick={onResume}
                          style={{
                            height: 32,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "none",
                            background: PRIMARY_GREEN,
                            color: "#000",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          Resume <ArrowRightIcon size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={onStartFresh}
                          style={{
                            height: 32,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1px solid var(--bg-card)",
                            background: "transparent",
                            color: "var(--text)",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          Start fresh
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Today's loop preview card — sample preview */}
              <div
                style={{
                  border: "1px solid var(--bg-card)",
                  background: "var(--bg-card)",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    marginBottom: 12,
                  }}
                >
                  Today’s loop
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 14,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>
                    Trigonometry · 7/10
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    Main issue: sign error in identity proof.
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  Suggested next, optional:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Chip variant="accent">Targeted drill</Chip>
                  <Chip>Mistake-aware worksheet</Chip>
                  <Chip>Add weak-area to mock</Chip>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    borderTop: "1px solid var(--bg-card)",
                    paddingTop: 10,
                    marginTop: 14,
                  }}
                >
                  Sample preview.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Why ───────────────────────────────────────────────── */}
        <section
          id="why"
          style={{ borderBottom: "1px solid var(--bg-card)" }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "64px 20px",
            }}
          >
            <div style={{ maxWidth: 640 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                }}
              >
                Why LazyTopper
              </div>
              <h2
                className="font-display"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  marginTop: 8,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                }}
              >
                A connected exam cockpit, not a shop of tools.
              </h2>
              <p
                style={{
                  marginTop: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                }}
              >
                Most apps give you locked timetables or unrelated tools.
                LazyTopper gives you one calm cockpit where every action —
                practice, worksheet, mock, predicted questions, answer check
                — feeds into one mistake-aware loop.
              </p>
            </div>
            <div className="why-grid" style={{ marginTop: 32 }}>
              {[
                {
                  icon: <TargetIcon size={20} />,
                  title: "Intent-first",
                  body:
                    "Pick what you want to do now. Subject → topic(s) → action → result. No fixed path.",
                },
                {
                  icon: <BrainIcon size={20} />,
                  title: "Mistake-aware",
                  body:
                    "Every saved attempt updates your weak areas. Drills, worksheets, and mocks adapt accordingly.",
                },
                {
                  icon: <ClipboardIcon size={20} />,
                  title: "Full board prep",
                  body:
                    "Single-topic, multi-topic, or full 80-mark mocks for Maths or Science. Predicted questions included.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    border: "1px solid var(--bg-card)",
                    background: "var(--bg-card)",
                    borderRadius: 16,
                    padding: 22,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(34,197,94,0.12)",
                      color: PRIMARY_GREEN,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    {card.icon}
                  </div>
                  <div
                    className="font-display"
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {card.title}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-muted)",
                      lineHeight: 1.55,
                    }}
                  >
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Core loop ─────────────────────────────────────────── */}
        <section
          id="loop"
          style={{
            borderBottom: "1px solid var(--bg-card)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "64px 20px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
              }}
            >
              The core loop
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginTop: 8,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              Subject → Topic(s) → Action → Result → Mistake insight →
              Optional next.
            </h2>
            <ol
              className="loop-grid"
              style={{
                listStyle: "none",
                padding: 0,
                margin: "32px 0 0",
              }}
            >
              {[
                {
                  n: "1",
                  t: "Pick scope",
                  d: "Single topic, multi-topic combination, or full subject.",
                },
                {
                  n: "2",
                  t: "Choose action",
                  d: "Practice, worksheet, predicted, timed, or full mock.",
                },
                {
                  n: "3",
                  t: "Attempt",
                  d: "On-screen or upload your handwritten answers.",
                },
                {
                  n: "4",
                  t: "Result + mistake",
                  d: "Score plus a clear mistake insight tagged by type.",
                },
                {
                  n: "5",
                  t: "Optional next",
                  d: "Targeted drill, mistake-aware worksheet, or weak-area mock.",
                },
              ].map((s) => (
                <li
                  key={s.n}
                  style={{
                    border: "1px solid var(--bg-card)",
                    background: "var(--bg-card)",
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <div
                    className="font-display"
                    style={{
                      color: PRIMARY_GREEN,
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      marginTop: 4,
                      fontSize: 14,
                    }}
                  >
                    {s.t}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {s.d}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 7. Inside the cockpit ────────────────────────────────── */}
        <section
          id="cockpit"
          style={{ borderBottom: "1px solid var(--bg-card)" }}
        >
          <div
            className="cockpit-grid"
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "64px 20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-muted)",
                }}
              >
                Inside the cockpit
              </div>
              <h2
                className="font-display"
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  marginTop: 8,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                }}
              >
                One quiet workspace for the whole board year.
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "24px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {[
                  [
                    "Home",
                    "Your latest attempt and a soft set of next-action suggestions.",
                  ],
                  [
                    "Practice",
                    "Quick practice, worksheets, predicted questions, and full 80-mark mocks across any scope.",
                  ],
                  [
                    "Worksheet",
                    "Single-topic, multi-topic, or full-subject worksheets with sections A–E.",
                  ],
                  [
                    "Exam Trends",
                    "Tiered topic cards and multi-topic actions.",
                  ],
                  [
                    "Check & Improve",
                    "Paste an answer, get feedback and a mistake tag.",
                  ],
                  [
                    "Me / Progress",
                    "Visual dashboard of saved attempts, mistake mix, and weak areas.",
                  ],
                ].map(([k, v]) => (
                  <li
                    key={k}
                    style={{
                      display: "flex",
                      gap: 12,
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        color: PRIMARY_GREEN,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <BookIcon size={16} />
                    </span>
                    <div>
                      <span style={{ fontWeight: 700 }}>{k}</span>{" "}
                      <span style={{ color: "var(--text-muted)" }}>— {v}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sidebar preview — translated to inline SVG-ish layout. */}
            <div
              style={{
                border: "1px solid var(--bg-card)",
                background: "var(--bg-card)",
                borderRadius: 16,
                padding: 8,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: 18,
                  fontSize: 12,
                  lineHeight: 1.55,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--text-muted)",
                    marginBottom: 10,
                  }}
                >
                  Preview · Sidebar
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {[
                    "Home",
                    "Practice",
                    "Exam Trends",
                    "Check & Improve",
                    "Me / Progress",
                  ].map((label, i) => (
                    <div
                      key={label}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: i === 1 ? PRIMARY_GREEN : "transparent",
                        color: i === 1 ? "#000" : "var(--text-muted)",
                        fontWeight: i === 1 ? 700 : 500,
                        fontSize: 13,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--text-muted)",
                    }}
                  >
                    Current focus
                  </div>
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: 14,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {memory?.subject ?? "Maths"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {memory?.lastAttempt?.topicLabel ?? "Trigonometry"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trial CTA strip ──────────────────────────────────────── */}
        <section id="trial" style={{ borderBottom: "1px solid var(--bg-card)" }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "64px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
                border: "1px solid var(--bg-card)",
              }}
            >
              <GradCapIcon size={14} /> Free trial
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              Try the cockpit, end-to-end.
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                marginTop: 12,
                lineHeight: 1.55,
              }}
            >
              The trial unlocks saved attempts, mistake intelligence,
              mistake-aware worksheets, and full 80-mark mocks for Maths
              and Science.
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={onStartTrial}
                style={{
                  height: 48,
                  padding: "0 20px",
                  borderRadius: 12,
                  border: "none",
                  background: PRIMARY_GREEN,
                  color: "#000",
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: "'Space Grotesk', sans-serif",
                  cursor: "pointer",
                  boxShadow: `0 0 28px ${PRIMARY_GREEN_GLOW}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Start free trial <ArrowRightIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/trends/10/Maths")}
                style={{
                  height: 48,
                  padding: "0 20px",
                  borderRadius: 12,
                  border: "1px solid var(--bg-card)",
                  background: "transparent",
                  color: "var(--text)",
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: "'Space Grotesk', sans-serif",
                  cursor: "pointer",
                }}
              >
                Browse exam trends
              </button>
            </div>
          </div>
        </section>

        <footer
          style={{
            padding: "32px 20px",
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          © {new Date().getFullYear()} LazyTopper
        </footer>
      </div>
    </div>
  );
}

// ── Tiny inline SVG icon set (no lucide-react). ──────────────────────────
function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function SparklesIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2l1.7 4.4L18 8l-4.3 1.6L12 14l-1.7-4.4L6 8l4.3-1.6L12 2z" />
      <path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8L19 14z" />
      <path d="M5 16l.6 1.5L7 18l-1.4.5L5 20l-.6-1.5L3 18l1.4-.5L5 16z" />
    </svg>
  );
}

function RotateLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 7 3 12 8 12" />
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3 9" />
    </svg>
  );
}

function TargetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function BrainIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V4z" />
      <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z" />
    </svg>
  );
}

function ClipboardIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4h6v3H9z" />
      <polyline points="9 13 11 15 15 11" />
    </svg>
  );
}

function BookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z" />
      <path d="M4 17a3 3 0 0 1 3-3h12" />
    </svg>
  );
}

function GradCapIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 9l10-5 10 5-10 5L2 9z" />
      <path d="M6 11v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" />
    </svg>
  );
}

function Chip({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "accent";
}) {
  const isAccent = variant === "accent";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: isAccent ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
        color: isAccent ? PRIMARY_GREEN : "var(--text-muted)",
        border: isAccent
          ? "1px solid rgba(34,197,94,0.25)"
          : "1px solid var(--bg-card)",
      }}
    >
      {children}
    </span>
  );
}

function formatRelativeDate(iso: string): string | null {
  try {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return null;
    const diffMs = Date.now() - then;
    const day = 24 * 60 * 60 * 1000;
    if (diffMs < day) return "today";
    if (diffMs < 2 * day) return "yesterday";
    const days = Math.floor(diffMs / day);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch {
    return null;
  }
}
