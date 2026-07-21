import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  hasMeaningfulMemory,
  readLandingMemory,
  resolveResumeRoute,
  type LandingMemory,
} from "../../lib/desktop/landingMemory";
import { loginUrl } from "../../lib/desktop/homeDestinations";
import {
  BORDER,
  CARD_BG,
  FG,
  FONT_DISPLAY,
  GREEN,
  GREEN_DARK,
  GREEN_SOFT,
  MUTED,
  PILL_BG,
  PILL_FG,
  SECTION_BG,
} from "../../components/grammar/tokens";

/**
 * MobileHome — the mobile (<1024px) layout for the Home/cockpit screen that
 * renders at `/browse`. It is the per-platform counterpart to `DesktopHome`
 * (the route branches `isDesktop ? <DesktopHome/> : <MobileHome/>`); the desktop
 * component and its render path are untouched.
 *
 * PR D — frozen Home-polish design (`mobile_home_locked_final.html`): illustrated
 * gradient SVG icons per destination, an orient-before-act order for new students
 * (What scores most → What's likely in 2027 → Practice it → Check your answer),
 * a persistent one-line hint under each row (mobile has no hover), and a Mistake
 * Intelligence panel that *inspires* (pain-framed header + a clearly-labelled
 * SAMPLE report) rather than gates. Content starts below the in-flow brand bar,
 * so nothing overlaps the top.
 *
 * Data honesty: routes are the canonical Home destinations (`/exam-trends`,
 * `/practice-hub`, `/check-improve`) plus the reason-aware login URLs from the
 * shared firebase-free `homeDestinations`. Resume state comes from real
 * `landingMemory`; auth/trial state from `useAuth`/`useSubscription`. No invented
 * progress, accuracy, or counts. `/browse` is a signed-out entry (signed-in users
 * are redirected to `/` before reaching it), so the visible path is the
 * signed-out experience; the signed-in branches stay honest for completeness.
 *
 * Mistake-Intel data boundary (per PR-D caution): real signed-in insights live in
 * `mistakeInsightsService`/`mistakeLogService`, which pull `firebaseClient`
 * (boots firebase at module load). Importing them here would drag firebase into
 * the mobile chunk and the unit test, so MobileHome stays on the firebase-free
 * boundary: signed-out shows the labelled SAMPLE panel; signed-in shows an honest
 * "no mistakes logged yet" empty state that links to Check & Improve — never
 * invented stats.
 */

const HOME_QS = "source=home&returnTo=%2F";
// Canonical Home destinations (homeDestinations.tsx is the source of truth).
const TRENDS_TO = `/exam-trends?${HOME_QS}`;
const PRACTICE_TO = `/practice-hub?${HOME_QS}`;
const CHECK_TO = `/check-improve?${HOME_QS}`;

/* ── Illustrated destination icons — copied VERBATIM from the locked design
   (`mobile_home_locked_final.html`), SVG attrs converted to JSX casing. Each is
   a 50×50 gradient infographic, not a plain colored box. Gradient ids are unique
   across the page. ───────────────────────────────────────────────────────── */

function TrendsArt() {
  return (
    <svg viewBox="0 0 50 50" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="lt-mh-trends" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(152,58%,52%)" />
          <stop offset="1" stopColor="hsl(152,62%,30%)" />
        </linearGradient>
      </defs>
      <rect width="50" height="50" fill="url(#lt-mh-trends)" />
      <rect x="11" y="30" width="6" height="10" rx="2" fill="#fff" opacity=".92" />
      <rect x="22" y="24" width="6" height="16" rx="2" fill="#fff" opacity=".92" />
      <rect x="33" y="16" width="6" height="24" rx="2" fill="#fff" opacity=".92" />
      <path d="M12 28 L25 22 L36 13" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M31 13 L37 12 L37 18" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PredictedArt() {
  return (
    <svg viewBox="0 0 50 50" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="lt-mh-pred" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(280,62%,64%)" />
          <stop offset="1" stopColor="hsl(264,55%,40%)" />
        </linearGradient>
      </defs>
      <rect width="50" height="50" fill="url(#lt-mh-pred)" />
      <circle cx="25" cy="22" r="13" fill="#fff" opacity=".28" />
      <circle cx="25" cy="22" r="13" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".7" />
      <text x="25" y="28" fontFamily="Georgia,serif" fontSize="15" fontWeight="700" fill="#fff" textAnchor="middle">?</text>
      <ellipse cx="25" cy="40" rx="14" ry="3" fill="#fff" opacity=".3" />
    </svg>
  );
}

function PracticeArt() {
  return (
    <svg viewBox="0 0 50 50" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="lt-mh-prac" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(152,58%,52%)" />
          <stop offset="1" stopColor="hsl(152,62%,30%)" />
        </linearGradient>
      </defs>
      <rect width="50" height="50" fill="url(#lt-mh-prac)" />
      <rect x="13" y="14" width="20" height="24" rx="3" fill="#fff" opacity=".5" />
      <rect x="17" y="11" width="20" height="24" rx="3" fill="#fff" opacity=".95" />
      <path d="M24 18 L31 23 L24 28 Z" fill="hsl(152,60%,34%)" />
    </svg>
  );
}

function CheckArt() {
  return (
    <svg viewBox="0 0 50 50" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="lt-mh-check" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(28,88%,58%)" />
          <stop offset="1" stopColor="hsl(16,78%,44%)" />
        </linearGradient>
      </defs>
      <rect width="50" height="50" fill="url(#lt-mh-check)" />
      <rect x="14" y="11" width="17" height="28" rx="4" fill="#fff" opacity=".95" />
      <line x1="18" y1="17" x2="27" y2="17" stroke="hsl(28,40%,75%)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="18" y1="21" x2="25" y2="21" stroke="hsl(28,40%,75%)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="33" cy="32" r="9" fill="hsl(152,58%,46%)" stroke="#fff" strokeWidth="1.8" />
      <path d="M29 32 l3 3 l5 -6" stroke="#fff" strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrainArt() {
  // Decorative brain outline behind the Mistake-Intel panel.
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ position: "absolute", right: -6, top: -8, width: 96, height: 96, opacity: 0.16 }}
    >
      <path
        d="M34 14 C20 9 9 20 13 33 C4 39 7 56 21 58 C24 70 44 70 46 58 L46 17 C46 10 48 12 40 14Z M46 14 C60 9 71 20 67 33 C76 39 73 56 59 58 C56 70 44 70 46 58"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ width: 17, height: 17, stroke: GREEN, fill: "none", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", flex: "0 0 auto" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function ArrowRight({ stroke = "#fff" }: { stroke?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ width: 14, height: 14, stroke, fill: "none", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" }}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ── Shared element styles ─────────────────────────────────────────────── */

function crumbChipStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    background: PILL_BG,
    color: PILL_FG,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
}

function sectionLabelStyle(): React.CSSProperties {
  return {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: MUTED,
    margin: "18px 0 10px",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };
}

type TagTone = "hot" | "start";
function tagStyle(tone: TagTone): React.CSSProperties {
  const palette =
    tone === "hot"
      ? { background: "hsl(28,90%,92%)", color: "hsl(20,80%,40%)" }
      : { background: GREEN, color: "#fff" };
  return {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderRadius: 999,
    padding: "2px 8px",
    ...palette,
  };
}

interface ActionCardProps {
  to: string;
  art: React.ReactNode;
  title: string;
  hint: string;
  tag?: { label: string; tone: TagTone };
  lead?: boolean;
}

function ActionCard({ to, art, title, hint, tag, lead }: ActionCardProps) {
  return (
    <Link
      to={to}
      data-testid="mobile-home-destination"
      style={{
        display: "block",
        textDecoration: "none",
        color: FG,
        background: lead ? "linear-gradient(135deg,hsl(152,55%,97%),#fff)" : CARD_BG,
        border: `1px solid ${lead ? "hsl(152,45%,78%)" : BORDER}`,
        borderRadius: 16,
        padding: 13,
        marginBottom: 10,
        boxShadow: lead ? "0 6px 18px rgba(20,120,70,.12)" : "0 2px 8px rgba(30,50,90,.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <span
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            flex: "0 0 auto",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,.13)",
            display: "inline-flex",
          }}
        >
          {art}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.1,
              color: FG,
            }}
          >
            {title}
            {tag && <span style={tagStyle(tag.tone)}>{tag.label}</span>}
          </span>
          <span style={{ display: "block", fontSize: 11, color: MUTED, marginTop: 3, lineHeight: 1.4 }}>
            {hint}
          </span>
        </span>
        <Chevron />
      </div>
    </Link>
  );
}

/* ── Mistake-Intelligence panel ────────────────────────────────────────── */

function MistakeBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 6 }}>
      <span style={{ width: 64 }}>{label}</span>
      <span style={{ flex: 1, height: 7, background: "rgba(255,255,255,.18)", borderRadius: 4, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
      </span>
      <span style={{ fontSize: 10, opacity: 0.85, width: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

const MI_PANEL_STYLE: React.CSSProperties = {
  marginTop: 6,
  borderRadius: 20,
  padding: 17,
  color: "#fff",
  background: "linear-gradient(145deg,hsl(214,74%,46%),hsl(222,60%,20%))",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 10px 28px rgba(20,60,130,.3)",
};

const MI_PREVIEW_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,.13)",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 13,
  padding: 12,
  marginTop: 13,
  position: "relative",
};

const MI_CTA_STYLE: React.CSSProperties = {
  background: "#fff",
  color: "hsl(222,60%,24%)",
  border: "none",
  borderRadius: 11,
  padding: "11px 16px",
  fontWeight: 700,
  fontSize: 12.5,
  marginTop: 13,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  textDecoration: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,.18)",
};

/** Signed-out: the inspiring, clearly-labelled SAMPLE Mistake-Intel panel. */
function SampleMistakePanel() {
  return (
    <div style={MI_PANEL_STYLE} data-testid="mobile-home-mistake-panel">
      <BrainArt />
      <span
        aria-hidden="true"
        style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(rgba(120,220,255,.4),transparent 70%)", right: -30, bottom: -40 }}
      />
      <div style={{ position: "relative", fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, lineHeight: 1.15, maxWidth: 230 }}>
        We find the <i>reason</i> — not just the wrong answer.
      </div>
      <div style={{ position: "relative", fontSize: 11, opacity: 0.88, lineHeight: 1.45, marginTop: 6, maxWidth: 240 }}>
        Every checked answer is sorted by why you lost the mark:
      </div>

      <div style={MI_PREVIEW_STYLE}>
        <div
          data-testid="mobile-home-mistake-sample-label"
          style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.75, marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 12, height: 12, stroke: "#fff", fill: "none", strokeWidth: 2 }}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Sample · what your report looks like
        </div>
        <MistakeBar label="Conceptual" pct={45} color="#ff5b6e" />
        <MistakeBar label="Calculation" pct={30} color="#ffb020" />
        <MistakeBar label="Silly" pct={15} color="#7fdbff" />
        <div style={{ fontSize: 11, lineHeight: 1.45, marginTop: 10, opacity: 0.96, borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 9 }}>
          → <b>Most marks lost: Trigonometry, conceptual.</b> We'd build drills to fix exactly that.
        </div>
      </div>

      <Link to={loginUrl("mistake-aware", "/practice-hub")} style={MI_CTA_STYLE}>
        Start free — find my reasons <ArrowRight stroke="hsl(222,60%,24%)" />
      </Link>
    </div>
  );
}

/** Signed-in: honest empty state — no invented counts. Real per-user insights
 *  are not reachable on the firebase-free boundary, so we point to where they
 *  get built rather than fabricate a chart. */
function SignedInMistakePanel() {
  return (
    <div style={MI_PANEL_STYLE} data-testid="mobile-home-mistake-panel">
      <BrainArt />
      <span
        aria-hidden="true"
        style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(rgba(120,220,255,.4),transparent 70%)", right: -30, bottom: -40 }}
      />
      <div style={{ position: "relative", fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, lineHeight: 1.15, maxWidth: 240 }}>
        We find the <i>reason</i> — not just the wrong answer.
      </div>
      <div style={{ position: "relative", fontSize: 11, opacity: 0.9, lineHeight: 1.45, marginTop: 8, maxWidth: 250 }}>
        No mistakes logged yet. Check an answer and we'll start sorting your lost
        marks by reason — conceptual, calculation, or silly — with no invented stats.
      </div>
      <Link to={CHECK_TO} style={MI_CTA_STYLE}>
        Check an answer <ArrowRight stroke="hsl(222,60%,24%)" />
      </Link>
    </div>
  );
}

export default function MobileHome() {
  const { user } = useAuth();
  const { isTrialActive, isPremium, isTrialExpired } = useSubscription();
  const isSignedIn = !!user;

  const [memory, setMemory] = useState<LandingMemory | null>(null);
  useEffect(() => {
    setMemory(readLandingMemory());
  }, []);

  const meaningfulMemory = hasMeaningfulMemory(memory);
  const lastAttempt = memory?.lastAttempt ?? null;
  const memoryGrade = memory?.grade ?? null;
  const memorySubject = memory?.subject ?? null;
  const resumeRoute = resolveResumeRoute(memory);
  const resumeTopicLabel =
    lastAttempt?.topicLabel ??
    (memorySubject ? `${memorySubject}${memoryGrade ? ` · Class ${memoryGrade}` : ""}` : null);
  // Resume strip is shown ONLY for signed-in returning students with real memory.
  const showResume =
    isSignedIn && meaningfulMemory && resumeRoute !== "/" && !!resumeTopicLabel;
  const resumeTo = `${resumeRoute}${resumeRoute.includes("?") ? "&" : "?"}${HOME_QS}`;

  // Header trial/affordance chip — honest states only (no fake day counts).
  // RETIREMENT PR-1: post-login target re-pointed off the retired /onboarding to "/".
  const trialChip = !isSignedIn ? (
    <Link
      to={loginUrl("start-trial", "/")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        background: "hsl(222,55%,13%)",
        color: "#fff",
        textDecoration: "none",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      Start free
    </Link>
  ) : (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        background: isTrialActive || isPremium ? GREEN_SOFT : PILL_BG,
        color: isTrialActive || isPremium ? GREEN_DARK : PILL_FG,
        whiteSpace: "nowrap",
      }}
    >
      {isTrialActive ? "Trial active" : isPremium ? "Premium" : isTrialExpired ? "Trial expired" : "Signed in"}
    </span>
  );

  return (
    <div
      data-testid="mobile-home"
      style={{
        minHeight: "100vh",
        background: SECTION_BG,
        color: FG,
      }}
    >
      {/* Brand bar — in normal flow, so content below never overlaps it. */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 14px",
          background: CARD_BG,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: FG }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: GREEN, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 15, height: 15 }}>
              <path d="M3 9l9-5 9 5-9 5-9-5z" fill="#fff" />
              <path d="M7 11v5c0 1 2.5 2.5 5 2.5s5-1.5 5-2.5v-5" stroke="#fff" strokeWidth="1.6" fill="none" />
            </svg>
          </span>
          LazyTopper
        </span>
        {trialChip}
      </header>

      <div style={{ padding: "15px 14px 96px" }}>
        {/* Title block */}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, lineHeight: 1.05, color: FG }}>
          {isSignedIn ? "Welcome back" : "What do you want to do?"}
        </h1>
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4, lineHeight: 1.4 }}>
          {isSignedIn
            ? "Pick up where you left off, or start fresh."
            : "Explore everything free. Sign in only when you want to save."}
        </p>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 11 }}>
          <span style={crumbChipStyle()}>Class 10</span>
          <span style={crumbChipStyle()}>{memorySubject ?? (isSignedIn ? "Continue" : "Pick a path")}</span>
        </div>

        {/* Returning / signed-in: resume strip first (real memory only). */}
        {showResume && (
          <Link
            to={resumeTo}
            data-testid="mobile-home-resume"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: FG,
              background: "linear-gradient(135deg,hsl(152,55%,95%),hsl(152,50%,90%))",
              border: "1px solid hsl(152,45%,80%)",
              borderRadius: 16,
              padding: 13,
              marginTop: 13,
            }}
          >
            <span style={{ width: 42, height: 42, borderRadius: 12, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", boxShadow: "0 3px 9px rgba(20,120,70,.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 22, height: 22, stroke: GREEN_DARK, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: GREEN_DARK }}>
                Last time
              </span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: FG, marginTop: 1 }}>
                {resumeTopicLabel}
              </span>
            </span>
            <span style={{ background: GREEN, color: "#fff", borderRadius: 10, padding: "9px 13px", fontSize: 11, fontWeight: 700, flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 4, boxShadow: "0 3px 9px rgba(20,120,70,.25)" }}>
              Resume <ArrowRight />
            </span>
          </Link>
        )}

        {isSignedIn ? (
          <>
            <div style={sectionLabelStyle()}>Keep going</div>
            <ActionCard
              to={PRACTICE_TO}
              art={<PracticeArt />}
              title="Practice"
              hint="Pick up a focused set, or choose a new topic."
              tag={{ label: "Continue", tone: "start" }}
              lead
            />
            <ActionCard
              to={TRENDS_TO}
              art={<TrendsArt />}
              title="What scores most"
              hint="Tier-ranked exam trends — which chapters carry the most marks."
            />

            <div style={sectionLabelStyle()}>Your mistake insights</div>
            <SignedInMistakePanel />
          </>
        ) : (
          <>
            {/* Orient-before-act order for new students. */}
            <div style={sectionLabelStyle()}>
              Start with what matters
              <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "hsl(220,12%,58%)", fontSize: 10 }}>
                · see this first
              </span>
            </div>
            <ActionCard
              to={TRENDS_TO}
              art={<TrendsArt />}
              title="What scores most"
              hint="Which chapters carry the most marks — 5 yrs of board data, ranked."
              tag={{ label: "High yield", tone: "hot" }}
              lead
            />
            <ActionCard
              to={TRENDS_TO}
              art={<PredictedArt />}
              title="What's likely in 2027"
              hint="A predicted board paper, ranked by frequency + syllabus."
            />
            <ActionCard
              to={PRACTICE_TO}
              art={<PracticeArt />}
              title="Practice it"
              hint="A focused set of real questions on what you just saw."
              tag={{ label: "Start", tone: "start" }}
            />
            <ActionCard
              to={CHECK_TO}
              art={<CheckArt />}
              title="Check your answer"
              hint="Photo your handwritten work — graded CBSE-style."
            />

            <div style={sectionLabelStyle()}>Why do you keep losing marks?</div>
            <SampleMistakePanel />
          </>
        )}
      </div>
    </div>
  );
}
