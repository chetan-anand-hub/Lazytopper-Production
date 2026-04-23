import { Link } from "react-router-dom";

/**
 * DesktopHome — locked Intent-style desktop root surface (Phase 1).
 *
 * Source of truth (locked desktop baseline):
 *   chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/pages/Intent.tsx + src/components/lt/PageHeader.tsx
 *
 * Composition:
 *   1. PageHeader (eyebrow + serif display title + supporting paragraph)
 *   2. 3 tall decision cards (Practice / Exam Trends / Check & Improve)
 *      Each card: pastel gradient bg, icon + pill row, eyebrow, title,
 *      description, bullet list with check marks, "Open X →" cta
 *   3. Quick compare strip (4-col grid: When you have… / 15 min / hour / evening)
 *
 * Routes target existing production paths under Vite base "/app/".
 *
 * Tokens are local consts so we don't perturb production global CSS vars.
 * No Tailwind. No lucide-react. Inline styles + inline SVG icons.
 */

// ── LOCKED BASELINE LIGHT TOKENS ────────────────────────────────
const SECTION_BG = "hsl(210, 33%, 98%)";   // --background
const CARD_BG = "hsl(0, 0%, 100%)";        // --card
const CARD_BORDER = "hsl(215, 25%, 90%)";  // --border
const TEXT = "hsl(220, 45%, 14%)";         // --foreground
const TEXT_MUTED = "hsl(220, 15%, 45%)";   // --muted-foreground
const ACCENT = "hsl(152, 55%, 45%)";       // --accent (teal-green)
const SHADOW_SM = "0 1px 2px hsla(222, 40%, 20%, 0.04)";
const SHADOW_MD = "0 12px 28px -12px hsla(222, 40%, 20%, 0.18)";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";

// ── ICONS (inline SVG, no lucide) ────────────────────────────────
function DumbbellIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
      <path d="m21.5 21.5-1.4-1.4" />
      <path d="M3.9 3.9 2.5 2.5" />
      <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
    </svg>
  );
}
function TrendingUpIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function ScanLineIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}
function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function ArrowRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

// ── CHOICE CARD CONFIG ──────────────────────────────────────────
type ChoiceIcon = (props: { size?: number }) => React.ReactElement;
interface Choice {
  to: string;
  icon: ChoiceIcon;
  eyebrow: string;
  title: string;
  desc: string;
  bullets: [string, string, string];
  pill: string;
  // Pastel gradient (top-left → bottom-right) tinted toward an accent
  gradient: string;
}

const CHOICES: Choice[] = [
  {
    to: "/practice-hub",
    icon: DumbbellIcon,
    eyebrow: "Practice",
    title: "I want to practice",
    desc: "Build muscle memory with worksheets, sets, predicted Qs, timed practice and full mocks.",
    bullets: ["Worksheet generator", "Predicted Questions", "Timed practice & mocks"],
    pill: "Most popular",
    // info tint (blue)
    gradient: "linear-gradient(135deg, hsla(212, 90%, 50%, 0.12), hsla(212, 90%, 50%, 0.04))",
  },
  {
    to: "/exam-trends",
    icon: TrendingUpIcon,
    eyebrow: "Exam Trends",
    title: "Show me what's likely",
    desc: "Must-crack, high-ROI, and good-to-do topics from 10 years of CBSE board papers.",
    bullets: ["Priority board view", "Topic Hub for every topic", "Smart predictions"],
    pill: "Best ROI",
    // accent tint (green)
    gradient: "linear-gradient(135deg, hsla(152, 55%, 45%, 0.14), hsla(152, 55%, 45%, 0.04))",
  },
  {
    to: "/check-improve",
    icon: ScanLineIcon,
    eyebrow: "Check & Improve",
    title: "Grade my answer",
    desc: "Upload your written answer. Get examiner-style feedback and a clear next step.",
    bullets: ["Examiner-style grading", "Mistake categorisation", "Improvement insights"],
    pill: "New",
    // warning tint (amber)
    gradient: "linear-gradient(135deg, hsla(38, 92%, 55%, 0.14), hsla(38, 92%, 55%, 0.04))",
  },
];

// ── COMPARE-STRIP DATA ──────────────────────────────────────────
const COMPARE_ROWS: { row: [string, string, string, string] }[] = [
  { row: ["Practice", "10-Q sprint set", "Worksheet + 1 timed set", "Full mock + review"] },
  { row: ["Exam Trends", "Skim must-crack", "1 Topic Hub deep-dive", "3 weak topics in a row"] },
  { row: ["Check & Improve", "Upload 1 answer", "Upload + rewrite", "Re-attempt mistakes set"] },
];

export default function DesktopHome() {
  return (
    <div
      style={{
        background: SECTION_BG,
        color: TEXT,
        padding: "40px 32px 48px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* ── PAGE HEADER ─────────────────────────────────────── */}
        <header style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: ACCENT,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 10,
            }}
          >
            What do you want to do today?
          </div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 34,
              fontWeight: 600,
              lineHeight: 1.15,
              color: TEXT,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Three doors. Pick the one that matches your mood.
          </h1>
          <p
            style={{
              color: TEXT_MUTED,
              marginTop: 12,
              maxWidth: 640,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            LazyTopper is choice-first. You're never forced into a study plan — every path here builds your weak-spot intelligence in the background.
          </p>
        </header>

        {/* ── 3 TALL DECISION CARDS ───────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 24,
          }}
        >
          {CHOICES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  padding: 32,
                  borderRadius: 16,
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  boxShadow: SHADOW_SM,
                  textDecoration: "none",
                  color: TEXT,
                  overflow: "hidden",
                  transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = SHADOW_MD;
                  e.currentTarget.style.borderColor = "hsla(152, 55%, 45%, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = SHADOW_SM;
                  e.currentTarget.style.borderColor = CARD_BORDER;
                }}
              >
                {/* pastel gradient backdrop */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: c.gradient,
                    opacity: 0.7,
                    pointerEvents: "none",
                  }}
                />
                {/* card content */}
                <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1 }}>
                  {/* icon + pill row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: CARD_BG,
                        border: `1px solid ${CARD_BORDER}`,
                        display: "grid",
                        placeItems: "center",
                        color: TEXT,
                        boxShadow: SHADOW_SM,
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: CARD_BG,
                        border: `1px solid ${CARD_BORDER}`,
                        color: TEXT,
                      }}
                    >
                      {c.pill}
                    </span>
                  </div>

                  {/* eyebrow */}
                  <div
                    style={{
                      marginTop: 28,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "hsla(220, 45%, 14%, 0.65)",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                    }}
                  >
                    {c.eyebrow}
                  </div>

                  {/* title */}
                  <h3
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 24,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      margin: "8px 0 0",
                      color: TEXT,
                    }}
                  >
                    {c.title}
                  </h3>

                  {/* description */}
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: TEXT_MUTED,
                      margin: "12px 0 0",
                    }}
                  >
                    {c.desc}
                  </p>

                  {/* bullet list */}
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "24px 0 0",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {c.bullets.map((b) => (
                      <li
                        key={b}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 14,
                          color: "hsla(220, 45%, 14%, 0.85)",
                        }}
                      >
                        <span style={{ color: ACCENT, display: "inline-flex" }}>
                          <CheckIcon size={16} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* Open X → */}
                  <div
                    style={{
                      marginTop: 32,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      color: TEXT,
                    }}
                  >
                    Open {c.eyebrow}
                    <ArrowRightIcon size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── QUICK COMPARE STRIP ─────────────────────────────── */}
        <section
          style={{
            marginTop: 40,
            padding: 24,
            borderRadius: 16,
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            boxShadow: SHADOW_SM,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: TEXT_MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 16,
            }}
          >
            Quick compare
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1fr 1fr",
              fontSize: 14,
              rowGap: 0,
              columnGap: 16,
            }}
          >
            {/* header row */}
            <div style={{ color: TEXT_MUTED, paddingBottom: 12 }}>When you have…</div>
            <div style={{ fontWeight: 600, color: TEXT, paddingBottom: 12 }}>15 minutes</div>
            <div style={{ fontWeight: 600, color: TEXT, paddingBottom: 12 }}>An hour</div>
            <div style={{ fontWeight: 600, color: TEXT, paddingBottom: 12 }}>A whole evening</div>

            {/* data rows */}
            {COMPARE_ROWS.map(({ row }) => (
              <CompareRow key={row[0]} row={row} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CompareRow({ row }: { row: [string, string, string, string] }) {
  const cellBase: React.CSSProperties = {
    paddingTop: 12,
    paddingBottom: 12,
    borderTop: `1px solid ${CARD_BORDER}`,
  };
  return (
    <>
      <div style={{ ...cellBase, color: TEXT_MUTED }}>{row[0]}</div>
      <div style={{ ...cellBase, color: TEXT }}>{row[1]}</div>
      <div style={{ ...cellBase, color: TEXT }}>{row[2]}</div>
      <div style={{ ...cellBase, color: TEXT }}>{row[3]}</div>
    </>
  );
}
