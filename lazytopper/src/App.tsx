import type React from "react";
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUpPage";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";

import { StudyPlannerView } from "./components/planner/StudyPlannerView";


// Import the new Vibe toggle and command palette components.

import { CommandPalette } from './ui/components/CommandPalette';
import { useState, useEffect, lazy, Suspense } from "react";
import { useVibeMode } from './context/vibeModeContext';
import { parseCommandIntent } from "./services/commandIntent";
import { normalizeTopicKey } from "./utils/topicResolver";
import { RequireAuth, RequirePremium } from "./components/auth/RequireAuth";
import { PracticeLimitGate } from "./components/auth/PracticeLimitGate";
import { MockViewGate } from "./components/auth/MockViewGate";
import { TrialBanner } from "./components/ux/TrialBanner";
import { BreakReminder } from "./components/ux/BreakReminder";
import { useAuth } from "./context/AuthContext";
import { useSubscription } from "./hooks/useSubscription";
import { ErrorBoundary, SectionErrorBoundary } from "./components/ErrorBoundary";
import { initPaceProfileFromExamDate } from "./services/paceProfileService";
import { startTracking, stopTracking, isFocusTrackingEnabled } from "./services/focusTracker";
import { useTheme } from "./context/ThemeContext";
import { useIsDesktop } from "./hooks/useIsDesktop";
import { DesktopShell } from "./components/desktop/DesktopShell";

// Desktop Phase 1 — locked desktop baseline Home (rendered inside DesktopShell)
const DesktopHome = lazy(() => import("./pages/desktop/DesktopHome"));
// Desktop Phase 2 — locked desktop baseline Practice page (rendered inside
// DesktopShell at /practice-hub when viewport is >=1024px). Mobile width
// keeps rendering the existing PracticeHome (mobile chrome) unchanged.
const DesktopPracticePage = lazy(() => import("./pages/desktop/DesktopPracticePage"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TrendsPage = lazy(() => import("./pages/TrendsPage"));
const MockPaper = lazy(() => import("./pages/MockPaper"));
const HighlyProbableQuestions = lazy(() => import("./pages/HighlyProbableQuestions"));
const PredictivePapersPage = lazy(() => import("./pages/PredictivePapers"));
const TopicHub = lazy(() => import("./pages/TopicHub"));
const MockBuilder = lazy(() => import("./pages/MockBuilder"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const DailyMixPage = lazy(() => import("./pages/DailyMixPage"));
const DailyMissionPage = lazy(() => import("./pages/DailyMissionPage"));
const WeeklyWrappedPage = lazy(() => import("./pages/WeeklyWrappedPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WeakAreaPracticePage = lazy(() => import("./pages/WeakAreaPracticePage"));
const ParentDashboardPage = lazy(() => import("./pages/ParentDashboardPage"));
const ChapterTestPage = lazy(() => import("./pages/ChapterTestPage"));
const ExamSimulationPage = lazy(() => import("./pages/ExamSimulationPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage"));
const TeacherDashboardPage = lazy(() => import("./pages/TeacherDashboardPage"));
import { captureIncomingReferral } from "./services/referralService";
const PricingPage = lazy(() => import("./pages/PricingPage"));
const FunnelPage = lazy(() => import("./pages/FunnelPage"));
const NightBeforePage = lazy(() => import("./pages/NightBeforePage"));
const RevisionCalendarPage = lazy(() => import("./pages/RevisionCalendarPage"));
const MiniMockPage = lazy(() => import("./pages/MiniMockPage"));
const ParentAccessPage = lazy(() => import("./pages/ParentAccessPage"));
const WeeklyDigestPage = lazy(() => import("./pages/WeeklyDigestPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DiagramComparePage = lazy(() => import("./pages/DiagramComparePage"));
const DiagramQualityPage = lazy(() => import("./pages/DiagramQualityPage"));
const VisualAuditPage = lazy(() => import("./pages/VisualAuditPage"));
const CacheStatsPage = lazy(() => import("./pages/CacheStatsPage"));
const DifficultyBreakdownPage = lazy(() => import("./pages/DifficultyBreakdownPage"));
const QuestionReportsPage = lazy(() => import("./pages/QuestionReportsPage"));

// Mobile baseline pages (#437 — real implementations)
const Intent            = lazy(() => import("./pages/app/Intent"));
const PracticeHome      = lazy(() => import("./pages/app/PracticeHome"));
const Worksheets        = lazy(() => import("./pages/app/Worksheets"));
const WorksheetReady    = lazy(() => import("./pages/app/WorksheetReady"));
const CheckImprove      = lazy(() => import("./pages/app/CheckImprove"));

// Mobile baseline pages (#438 — broken destination repair)
const MobileExamTrends  = lazy(() => import("./pages/app/ExamTrends"));
const MobileTopicHub    = lazy(() => import("./pages/app/TopicHub"));
const MobileMe          = lazy(() => import("./pages/app/Me"));

function RouteFallback() {
  return (
    <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "var(--bg-card)", backdropFilter: "blur(16px)",
        border: "1px solid var(--bg-card-border)", borderRadius: 16, padding: 24,
      }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)" }}>Loading...</h3>
      </div>
    </div>
  );
}

function withRouteSuspense(node: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

function MentorRedirect() {
  const { grade, subject } = useParams<{ grade: string; subject: string }>();
  return <Navigate to={`/topic-hub/${grade || "10"}/${subject || "Maths"}`} replace />;
}

function TopicMockRedirect() {
  const { grade, subject, topicKey } = useParams<{ grade: string; subject: string; topicKey: string }>();
  const location = useLocation();
  const search = location.search || "";
  return <Navigate to={`/chapter-test/${grade || "10"}/${subject || "Maths"}/${topicKey || ""}${search}`} replace />;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.href = "/";
  }, [user, loading]);
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return null;
}

/**
 * BottomNav — baseline mobile tabs: Practice / Exam Trends / Me.
 *
 * Visibility rules (per guardrail #1):
 *   Hidden on /welcome and any /app/intent* path.
 *   Shown on all other routes.
 *
 * Active state covers both new /app/* paths and existing legacy paths
 * so the nav stays coherent when users visit old deep-links.
 */
function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const current = location.pathname;

  // ── Visibility gate ────────────────────────────────────────────────
  if (current === "/welcome" || current.startsWith("/intent")) {
    return null;
  }

  // Desktop Phase 1 — when we render the locked DesktopShell at desktop
  // width on the shell-eligible routes, hide the mobile BottomNav so the
  // shell's sidebar nav is the only nav surface. Mobile width unchanged.
  if (isDesktop && isDesktopShellRoute(current)) {
    return null;
  }

  const go = (path: string) => navigate(path);
  const activeColor = "#22c55e";
  const inactiveColor = "var(--text-muted)";

  // ── Active-state detection ─────────────────────────────────────────
  const isPracticeActive =
    current.startsWith("/practice-hub") ||
    current.startsWith("/practice") ||
    current.startsWith("/exam-simulation") ||
    current.startsWith("/highly-probable") ||
    current.startsWith("/weak-area") ||
    current.startsWith("/topic-mock") ||
    current.startsWith("/chapter-test") ||
    current.startsWith("/mock-paper") ||
    current.startsWith("/mock-builder") ||
    current.startsWith("/predictive-papers") ||
    current.startsWith("/daily-mix") ||
    current.startsWith("/daily-mission") ||
    current.startsWith("/study-plan") ||
    current.startsWith("/planner");

  const isExamTrendsActive =
    current.startsWith("/exam-trends") ||
    current.startsWith("/trends") ||
    current.startsWith("/topic-hub");

  const isMeActive =
    current === "/me" ||
    current === "/profile" ||
    current === "/dashboard" ||
    current === "/" ||
    current === "/weekly-wrapped" ||
    current === "/parent-dashboard";

  const navItems = [
    {
      label: "Practice",
      // Compass icon
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      ),
      active: isPracticeActive,
      onClick: () => go("/practice-hub"),
    },
    {
      label: "Exam Trends",
      // LineChart icon
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M7 16l4-4 4 4 4-4"/>
        </svg>
      ),
      active: isExamTrendsActive,
      onClick: () => go("/exam-trends"),
    },
    {
      label: "Me",
      // User icon
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      active: isMeActive,
      onClick: () => go("/me"),
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        padding: "6px 8px 10px",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid var(--bg-card-border)",
        zIndex: 20,
      }}
    >
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            color: item.active ? activeColor : inactiveColor,
            fontWeight: item.active ? 800 : 700,
            fontSize: "0.6rem",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            padding: "4px 6px",
            borderRadius: 8,
            transition: "color 0.15s ease",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Alias redirect components for /app/exam-trends and /app/topic-hub.
 * They resolve grade/subject from localStorage via useSubjectContext
 * and redirect to the existing param-based routes.
 * Deep-link compatibility: existing /trends/:g/:s and /topic-hub/:g/:s
 * routes are never touched.
 */
/**
 * App component defines the top-level routes for the LazyTopper application.
 * It wires all pages together and exposes the AI mentor via /mentor and /ai-mentor.
 * A vibe toggle and command palette overlay have been added without altering
 * existing route definitions.  The command palette can be opened via Cmd/Ctrl+K.
 */
/**
 * Desktop Phase 1 — STRICT shell + Home only.
 *
 * The locked desktop baseline ships only Home for Phase 1. Later destinations
 * (Practice / Exam Trends / Topic Hub / Check & Improve / Me) are NOT yet
 * implemented as desktop pages, so wrapping them in DesktopShell would render
 * a desktop frame around the existing MobileShell page — a hybrid that the
 * audit explicitly rejected.
 *
 * Phase 1 therefore mounts DesktopShell ONLY at the exact "/" route and only
 * at desktop width (>=1024px). All other routes — including /practice-hub,
 * /exam-trends, /topic-hub (and any /topic-hub/* deep paths), /check-improve,
 * /me — render through the legacy mobile baseline at every viewport width,
 * exactly as they did before this PR. Auth / admin / deep-param routes are
 * also unchanged.
 *
 * Mobile width (<1024px) is unchanged for every route, including "/".
 */
function isDesktopShellRoute(pathname: string): boolean {
  // Desktop Phase 1 — exact "/" only.
  if (pathname === "/") return true;
  // Desktop Phase 2 — exact "/practice-hub" only. No nested practice paths,
  // no other future destinations (/exam-trends, /check-improve, /me,
  // /topic-hub, /topic-hub/*) are added in this phase.
  if (pathname === "/practice-hub") return true;
  return false;
}

export default function App() {
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [headerStreak, setHeaderStreak] = useState(0);
  const navigate = useNavigate();
  const { mode, setMode } = useVibeMode();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isTrialActive, isTrialExpired, daysLeftInTrial, isPremium } = useSubscription();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    captureIncomingReferral();
    if (isFocusTrackingEnabled()) startTracking();
    return () => stopTracking();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lazytopper.streak");
      if (raw) {
        const parsed = JSON.parse(raw);
        setHeaderStreak(Number(parsed?.count || 0));
      }
    } catch {}
    const handler = () => {
      try {
        const raw = localStorage.getItem("lazytopper.streak");
        if (raw) setHeaderStreak(Number(JSON.parse(raw)?.count || 0));
      } catch {}
    };
    window.addEventListener("storage", handler);
    const interval = setInterval(handler, 5000);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const DAILY_CHECK_KEY = "lazytopper.paceProfile.dailyCheck";
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(DAILY_CHECK_KEY) === today) return;
    } catch {}
    let studentClass: "10" | "12" = "10";
    try {
      const profileRaw = localStorage.getItem("lazytopper.profile");
      if (profileRaw) {
        const parsed = JSON.parse(profileRaw);
        if (parsed?.studentClass === "12") studentClass = "12";
      }
    } catch {}
    void initPaceProfileFromExamDate(studentClass).then(() => {
      try { localStorage.setItem(DAILY_CHECK_KEY, today); } catch {}
    }).catch(() => {});
  }, []);

  const getSubjectContext = (): { grade: string; subject: string } => {
    const loc = window.location.pathname;
    const match = loc.match(/\/(\d+)\/(Maths|Science)/i);
    if (match) return { grade: match[1], subject: match[2] };
    try {
      const raw = localStorage.getItem("lazytopper.lastSubjectContext");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.grade && parsed?.subject) return parsed;
      }
    } catch {}
    return { grade: "10", subject: "Maths" };
  };

  const handleCommandSelect = (action: { id: string; handler: string }, query: string) => {
    const parsed = parseCommandIntent(query);
    const resolvedHandler = parsed.recognized ? parsed.handler : action.handler;
    const normalizedTopic = normalizeTopicKey(parsed.topic || "");
    const topicParam = normalizedTopic ? `?topic=${encodeURIComponent(normalizedTopic)}` : "";
    const ctx = getSubjectContext();
    const g = ctx.grade;
    const s = ctx.subject;

    switch (resolvedHandler) {
      case 'navigateToDashboard':
        navigate('/dashboard');
        break;
      case 'navigateToPractice':
        navigate(`/practice/${g}/${s}${topicParam}`);
        break;
      case 'navigateToHPQ':
        navigate(`/highly-probable/${g}/${s}`);
        break;
      case 'navigateToMockTest':
        navigate('/exam-simulation');
        break;
      case 'navigateToMockBuilder':
        navigate(`/mock-builder/${g}/${s}`);
        break;
      case 'navigateToTopicHub':
        if (normalizedTopic) {
          navigate(`/topic-hub/${g}/${s}/${encodeURIComponent(normalizedTopic)}`);
        } else {
          navigate(`/topic-hub/${g}/${s}`);
        }
        break;
      case 'navigateToMentor':
        navigate(`/mentor/${g}/${s}`);
        break;
      case 'navigateToStats':
        navigate('/profile');
        break;
      case 'navigateToProfile':
        navigate('/profile');
        break;
      case 'navigateToWeeklyWrap':
        navigate('/weekly-wrapped');
        break;
      case 'navigateToDailyMix':
        navigate(`/daily-mix/${g}/${s}${topicParam}`);
        break;
      case 'navigateToWeakAreas':
        navigate('/weak-area-practice');
        break;
      case 'navigateToParentDashboard':
        navigate('/parent-dashboard');
        break;
      case "setVibeLow":
        setMode("zombie");
        break;
      case "setVibeHigh":
        setMode("beast");
        break;
      case 'toggleVibeMode':
        setMode(mode === 'beast' ? 'zombie' : 'beast');
        break;
      default:
        break;
    }
    setPaletteOpen(false);
  };

  const location = useLocation();
  useEffect(() => {
    const match = location.pathname.match(/\/(\d+)\/(Maths|Science)/i);
    if (match) {
      try {
        localStorage.setItem("lazytopper.lastSubjectContext", JSON.stringify({ grade: match[1], subject: match[2] }));
      } catch {}
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* Top navigation bar — dark premium header
          Desktop Phase 1: hidden on shell-eligible routes at desktop width
          (≥1024px). DesktopShell provides its own top utility/search bar. */}
      {!(isDesktop && isDesktopShellRoute(location.pathname)) && (
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #22c55e, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text)", fontWeight: 900, fontSize: 14,
          }}>LT</div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif" }}>LazyTopper</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && isTrialActive && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 12, padding: "4px 10px",
                fontWeight: 800, fontSize: "0.78rem", color: "#60a5fa",
              }}
              title={`${daysLeftInTrial} days left in trial`}
            >
              <span>⏳</span>
              <span>{daysLeftInTrial}d trial</span>
            </div>
          )}
          {user && isTrialExpired && !isPremium && (
            <button
              type="button"
              onClick={() => navigate("/profile")}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 12, padding: "4px 10px",
                fontWeight: 800, fontSize: "0.78rem", color: "#f87171",
                cursor: "pointer",
              }}
            >
              Upgrade
            </button>
          )}
          {user && headerStreak > 0 && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)",
                borderRadius: 20, padding: "4px 10px",
                fontWeight: 900, fontSize: "0.85rem", color: "#fb923c",
              }}
              title={`${headerStreak} day streak`}
            >
              <span>🔥</span>
              <span>{headerStreak}</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: theme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
              border: theme === "dark" ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(0,0,0,0.18)",
              borderRadius: 20, padding: "5px 11px",
              cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
              color: theme === "dark" ? "#e2e8f0" : "#334155",
              letterSpacing: 0.2, transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            title="Search (Ctrl+K)"
            style={{
              background: "var(--bg-card)", border: "1px solid var(--bg-card-border)", borderRadius: 12,
              padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700,
              color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => navigate("/profile")}
              title="Your Profile"
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #22c55e, #3b82f6)", border: "none",
                color: "var(--text)", fontWeight: 900, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {(user.displayName || user.email || "S").charAt(0).toUpperCase()}
            </button>
          ) : !location.pathname.startsWith("/login") ? (
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                border: "1px solid var(--bg-card-border)",
                borderRadius: 12,
                background: "var(--bg-card)",
                color: "var(--text-muted)",
                fontWeight: 800,
                fontSize: "0.78rem",
                padding: "6px 14px",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              Log in
            </button>
          ) : null}
        </div>
      </div>
      )}
      {/* Command palette overlay */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleCommandSelect}
      />
      <TrialBanner />
      <BreakReminder />
      <ErrorBoundary level="global">
      {(() => {
        const useDesktopShell = isDesktop && isDesktopShellRoute(location.pathname);
        const routesEl = (
        <Routes>
          {/* Core Routes */}
          {/* Desktop Phase 1 — at desktop width, "/" renders the locked
              DesktopHome inside DesktopShell. At mobile width, the existing
              HomeRedirect behavior is preserved (auth → /dashboard, else /welcome). */}
          <Route path="/" element={isDesktop ? withRouteSuspense(<DesktopHome />) : <HomeRedirect />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/*" element={<Login />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/legal/:slug" element={withRouteSuspense(<LegalPage />)} />
          <Route path="/pricing" element={withRouteSuspense(<PricingPage />)} />
          <Route path="/admin/funnel" element={<RequireAuth>{withRouteSuspense(<FunnelPage />)}</RequireAuth>} />
          <Route path="/admin/diagram-compare" element={withRouteSuspense(<DiagramComparePage />)} />
          <Route path="/admin/diagram-quality" element={withRouteSuspense(<DiagramQualityPage />)} />
          <Route path="/admin/visual-audit" element={withRouteSuspense(<VisualAuditPage />)} />
          <Route path="/admin/cache-stats" element={<RequireAuth>{withRouteSuspense(<CacheStatsPage />)}</RequireAuth>} />
          <Route path="/admin/difficulty-breakdown" element={<RequireAuth>{withRouteSuspense(<DifficultyBreakdownPage />)}</RequireAuth>} />
          <Route path="/admin/question-reports" element={<RequireAuth>{withRouteSuspense(<QuestionReportsPage />)}</RequireAuth>} />
          <Route path="/methodology" element={withRouteSuspense(<MethodologyPage />)} />
          <Route path="/teacher" element={<RequireAuth><SectionErrorBoundary>{withRouteSuspense(<TeacherDashboardPage />)}</SectionErrorBoundary></RequireAuth>} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><SectionErrorBoundary>{withRouteSuspense(<Dashboard />)}</SectionErrorBoundary></RequireAuth>} />


          {/* New Smart Study Planner (grade + subject aware) */}
          <Route path="/planner/:grade/:subject" element={<RequirePremium featureLabel="Smart Study Planner"><StudyPlannerView /></RequirePremium>} />
          {/* Legacy planner route (no params) */}
          <Route path="/planner" element={<RequirePremium featureLabel="Smart Study Planner"><StudyPlannerView /></RequirePremium>} />


          {/* Topic Hub entry with grade & subject in path */}
          <Route path="/topic-hub/:grade/:subject" element={<RequirePremium featureLabel="Chapter Hub (AI Tutor)"><SectionErrorBoundary>{withRouteSuspense(<TopicHub />)}</SectionErrorBoundary></RequirePremium>} />
          <Route path="/topic-hub/:grade/:subject/:topicKey" element={<RequirePremium featureLabel="Chapter Hub (AI Tutor)"><SectionErrorBoundary>{withRouteSuspense(<TopicHub />)}</SectionErrorBoundary></RequirePremium>} />

          {/* TopicHub launcher page (desktop fallback — mobile route at line ~724 takes
               precedence for /app/topic-hub because it is defined first in the same
               Routes tree. This desktop launcher remains for any non-mobile direct
               desktop navigation that bypasses the /app/ basename.) */}
          <Route path="/topic-hub" element={<MobileTopicHub />} />

      

          {/* Dynamic Trends Page (Maths + Science with toggle) */}
          <Route path="/trends/:grade/:subject" element={withRouteSuspense(<TrendsPage />)} />

          {/* Auto-mock paper view (legacy + predictive) — free users get 1/day */}
          <Route path="/mock-paper/:slug" element={<MockViewGate><SectionErrorBoundary>{withRouteSuspense(<MockPaper />)}</SectionErrorBoundary></MockViewGate>} />

          {/* Topic Mock → redirect to Chapter Test */}
          <Route path="/topic-mock/:grade/:subject/:topicKey" element={<TopicMockRedirect />} />
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<MockViewGate><SectionErrorBoundary>{withRouteSuspense(<ChapterTestPage />)}</SectionErrorBoundary></MockViewGate>} />

          {/* New Mock Builder v1 with mandatory grade & subject */}
          <Route path="/mock-builder/:grade/:subject" element={<RequirePremium featureLabel="Mock Builder">{withRouteSuspense(<MockBuilder />)}</RequirePremium>} />
          {/* Legacy Mock Builder route (no params) */}
          <Route path="/mock-builder" element={<RequirePremium featureLabel="Mock Builder">{withRouteSuspense(<MockBuilder />)}</RequirePremium>} />

          {/* Predicted Questions with mandatory grade & subject */}
          <Route
            path="/highly-probable/:grade/:subject"
            element={<RequirePremium featureLabel="Predicted Questions">{withRouteSuspense(<HighlyProbableQuestions />)}</RequirePremium>}
          />
          {/* Legacy route */}
          <Route
            path="/highly-probable"
            element={<RequirePremium featureLabel="Predicted Questions">{withRouteSuspense(<HighlyProbableQuestions />)}</RequirePremium>}
          />

          {/* Predictive papers hub — requires auth */}
          <Route
            path="/predictive-papers"
            element={<RequireAuth><SectionErrorBoundary>{withRouteSuspense(<PredictivePapersPage />)}</SectionErrorBoundary></RequireAuth>}
          />

          {/* Exam Simulation — unlimited full-length mock */}
          <Route
            path="/exam-simulation"
            element={<RequirePremium featureLabel="Exam Simulation"><SectionErrorBoundary>{withRouteSuspense(<ExamSimulationPage />)}</SectionErrorBoundary></RequirePremium>}
          />

          <Route path="/night-before" element={<RequireAuth>{withRouteSuspense(<NightBeforePage />)}</RequireAuth>} />
          <Route path="/revision-calendar" element={<RequireAuth>{withRouteSuspense(<RevisionCalendarPage />)}</RequireAuth>} />
          <Route path="/mini-mock" element={<RequireAuth>{withRouteSuspense(<MiniMockPage />)}</RequireAuth>} />
          <Route path="/parent" element={withRouteSuspense(<ParentAccessPage />)} />
          <Route path="/weekly-digest" element={withRouteSuspense(<WeeklyDigestPage />)} />

          <Route path="/practice/:grade/:subject" element={<PracticeLimitGate><SectionErrorBoundary>{withRouteSuspense(<PracticePage />)}</SectionErrorBoundary></PracticeLimitGate>} />

          {/* Study Plan with mandatory grade & subject */}
          <Route path="/study-plan/:grade/:subject" element={<RequirePremium featureLabel="Smart Study Planner">{withRouteSuspense(<StudyPlanPage />)}</RequirePremium>} />
          {/* Legacy Study Plan route */}
          <Route path="/study-plan" element={<RequirePremium featureLabel="Smart Study Planner">{withRouteSuspense(<StudyPlanPage />)}</RequirePremium>} />

          {/* AI Mentor routes redirect to TopicHub preserving context */}
          <Route path="/ai-mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/ai-mentor" element={<Navigate to="/topic-hub" replace />} />
          <Route path="/mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/mentor" element={<Navigate to="/topic-hub" replace />} />

          {/* Daily Mission — structured 30-min study session */}
          <Route
            path="/daily-mission/:grade/:subject"
            element={<RequirePremium featureLabel="Daily Mission">{withRouteSuspense(<DailyMissionPage />)}</RequirePremium>}
          />

          {/* Daily Mix route for personalised study mixes */}
          <Route
            path="/daily-mix/:grade/:subject"
            element={<RequirePremium featureLabel="Daily Focus Mix">{withRouteSuspense(<DailyMixPage />)}</RequirePremium>}
          />

          {/* Weekly Wrapped recap route */}
          <Route
            path="/weekly-wrapped"
            element={<RequireAuth>{withRouteSuspense(<WeeklyWrappedPage />)}</RequireAuth>}
          />

          {/* Weak Area Practice & Learning Paths */}
          <Route
            path="/weak-area-practice"
            element={<RequirePremium featureLabel="Weak Area Practice">{withRouteSuspense(<WeakAreaPracticePage />)}</RequirePremium>}
          />

          {/* Parent/Teacher Progress Report Dashboard */}
          <Route
            path="/parent-dashboard"
            element={<RequirePremium featureLabel="Parent Dashboard">{withRouteSuspense(<ParentDashboardPage />)}</RequirePremium>}
          />

          {/* Student Profile & Growth Journey */}
          <Route
            path="/profile"
            element={<RequireAuth>{withRouteSuspense(<ProfilePage />)}</RequireAuth>}
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={<RequireAuth>{withRouteSuspense(<SettingsPage />)}</RequireAuth>}
          />

          {/* ── Mobile baseline routes (#437)
               BrowserRouter basename="/app" is ALWAYS active (vite base="/app/" in
               both dev and prod).  Route paths are relative to that basename —
               no /app/ prefix needed here.  Browser URLs are consistently
               /app/exam-trends, /app/topic-hub, /app/me etc. ─── */}

          {/* Intent screen — BottomNav hidden by visibility gate when path starts with /intent */}
          <Route path="/intent" element={withRouteSuspense(<Intent />)} />

          {/* Practice hub — named /practice-hub to avoid ambiguity with /practice/:grade/:subject.
              Desktop Phase 2: at desktop width (>=1024px) this renders the locked
              DesktopPracticePage inside DesktopShell (the conditional shell wrap is
              applied below). At mobile width, the existing mobile PracticeHome
              renders unchanged. */}
          <Route
            path="/practice-hub"
            element={
              isDesktop
                ? withRouteSuspense(<DesktopPracticePage />)
                : withRouteSuspense(<PracticeHome />)
            }
          />

          {/* Worksheets flow — ready must be before the parent to avoid partial match */}
          <Route path="/practice/worksheets/ready" element={withRouteSuspense(<WorksheetReady />)} />
          <Route path="/practice/worksheets" element={withRouteSuspense(<Worksheets />)} />

          {/* Check & Improve — upload → real AI grading */}
          <Route path="/check-improve" element={withRouteSuspense(<CheckImprove />)} />

          {/* ── #438 — Mobile destination repairs ────────────────────────
               These replace the previous broken redirects/missing routes.
               Desktop routes (/trends, /topic-hub/:grade/:subject, /profile)
               are untouched — they remain separate from these mobile screens. */}

          {/* Mobile Exam Trends — replaces ExamTrendsAlias redirect to desktop TrendsPage */}
          <Route path="/exam-trends" element={withRouteSuspense(<MobileExamTrends />)} />

          {/* Mobile Topic Hub — entry picker (no topicName) or topic detail (:topicName) */}
          <Route path="/topic-hub" element={withRouteSuspense(<MobileTopicHub />)} />
          <Route path="/topic-hub/:topicName" element={withRouteSuspense(<MobileTopicHub />)} />

          {/* Mobile Me — replaces BottomNav's previous bounce to desktop ProfilePage */}
          <Route path="/me" element={withRouteSuspense(<MobileMe />)} />

          {/* Catch-all: redirect unknown routes to a sensible default */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        );

        // Desktop Phase 1 — wrap shell-eligible routes in the locked
        // DesktopShell at desktop width. Other routes (auth, admin, deep
        // params) and all mobile widths fall through to the legacy
        // paddingBottom:60px container so nothing already shipped regresses.
        if (useDesktopShell) {
          return (
            <DesktopShell onOpenSearch={() => setPaletteOpen(true)}>
              {routesEl}
            </DesktopShell>
          );
        }
        return <div style={{ paddingBottom: '60px' }}>{routesEl}</div>;
      })()}
      </ErrorBoundary>
      <BottomNav />
    </>
  );
}
