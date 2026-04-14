import type React from "react";
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUpPage";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import TopicHubHome from "./pages/TopicHubHome";
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
import { getGuidedJourneyState, getPhaseRoute } from "./services/guidedJourneyService";
import { isMissionCompletedToday, getMissionResumeInfo } from "./services/dailyMissionService";

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
const DiagramComparePage = lazy(() => import("./pages/DiagramComparePage"));

function RouteFallback() {
  return (
    <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "rgba(255,255,255,0.03)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24,
      }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>Loading...</h3>
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
 * BottomNav component renders a simple bottom navigation bar for the mobile view.
 * It highlights the active page based on the current location and provides
 * navigation shortcuts to Home, Trends, Predict (predictive papers), and Dashboard.
 */
function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: navUser } = useAuth();

  const current = location.pathname;
  const go = (path: string) => navigate(path);

  const isHome = current === "/";
  const isTrends =
    current.startsWith("/trends") ||
    current.startsWith("/topic-hub");
  const isPredictive =
    current.startsWith("/predictive-papers") ||
    current.startsWith("/mock-paper") ||
    current.startsWith("/mock-builder");
  const activeColor = "#22c55e";
  const inactiveColor = "rgba(255,255,255,0.3)";

  const isLearn = isTrends || current.startsWith("/topic-hub") || current.startsWith("/daily-mix") || current.startsWith("/daily-mission") || current.startsWith("/study-plan") || current.startsWith("/planner");
  const isPractice = isPredictive || current.startsWith("/practice") || current.startsWith("/exam-simulation") || current.startsWith("/highly-probable") || current.startsWith("/weak-area") || current.startsWith("/topic-mock") || current.startsWith("/chapter-test");
  const isMe = isHome || current === "/dashboard" || current === "/profile" || current === "/weekly-wrapped" || current === "/parent-dashboard";

  const navItems = [
    {
      label: "Learn",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      active: isLearn,
      onClick: () => {
        let ctx = { grade: "10", subject: "Maths" };
        try {
          const raw = localStorage.getItem("lazytopper.lastSubjectContext");
          if (raw) { const p = JSON.parse(raw); if (p?.grade && p?.subject) ctx = p; }
        } catch {}
        go(`/trends/${ctx.grade}/${ctx.subject}`);
      },
    },
    {
      label: "Practice",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      ),
      active: isPractice,
      onClick: () => {
        let ctx = { grade: "10", subject: "Maths" };
        try {
          const raw = localStorage.getItem("lazytopper.lastSubjectContext");
          if (raw) { const p = JSON.parse(raw); if (p?.grade && p?.subject) ctx = p; }
        } catch {}
        if (navUser) {
          const resumeInfo = getMissionResumeInfo("Maths") || getMissionResumeInfo("Science");
          if (resumeInfo) {
            const subj = getMissionResumeInfo("Maths") ? "Maths" : "Science";
            go(`/daily-mission/${ctx.grade}/${subj}`);
            return;
          }
          const missionSubj = ctx.subject || "Maths";
          if (!isMissionCompletedToday(missionSubj as "Maths" | "Science")) {
            go(`/daily-mission/${ctx.grade}/${missionSubj}`);
            return;
          }
          try {
            const journey = getGuidedJourneyState(navUser.uid);
            if (journey.currentChapter && (journey.currentChapter.phase === "practice" || journey.currentChapter.phase === "mock")) {
              go(getPhaseRoute(journey.currentChapter, ctx.grade));
              return;
            }
          } catch {}
        }
        go(`/practice/${ctx.grade}/${ctx.subject}`);
      },
    },
    {
      label: "Me",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      active: isMe,
      onClick: () => {
        if (navUser) {
          go("/dashboard");
        } else {
          window.location.href = "/";
        }
      },
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
        borderTop: "1px solid rgba(255,255,255,0.06)",
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
            fontSize: "0.65rem",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: 8,
            transition: "color 0.15s ease",
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
 * App component defines the top-level routes for the LazyTopper application.
 * It wires all pages together and exposes the AI mentor via /mentor and /ai-mentor.
 * A vibe toggle and command palette overlay have been added without altering
 * existing route definitions.  The command palette can be opened via Cmd/Ctrl+K.
 */
export default function App() {
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [headerStreak, setHeaderStreak] = useState(0);
  const navigate = useNavigate();
  const { mode, setMode } = useVibeMode();
  const { user } = useAuth();
  const { isTrialActive, isTrialExpired, daysLeftInTrial, isPremium } = useSubscription();

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
      {/* Top navigation bar — dark premium header */}
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #22c55e, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#000", fontWeight: 900, fontSize: 14,
          }}>LT</div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>LazyTopper</span>
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
            onClick={() => setPaletteOpen(true)}
            title="Search (Ctrl+K)"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
              padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700,
              color: "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
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
                color: "#000", fontWeight: 900, fontSize: 14,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {(user.displayName || user.email || "S").charAt(0).toUpperCase()}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.6)",
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
          )}
        </div>
      </div>
      {/* Command palette overlay */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleCommandSelect}
      />
      <TrialBanner />
      <BreakReminder />
      <ErrorBoundary level="global">
      <div style={{ paddingBottom: '60px' }}>
        <Routes>
          {/* Core Routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/*" element={<Login />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/legal/:slug" element={withRouteSuspense(<LegalPage />)} />
          <Route path="/pricing" element={withRouteSuspense(<PricingPage />)} />
          <Route path="/admin/funnel" element={<RequireAuth>{withRouteSuspense(<FunnelPage />)}</RequireAuth>} />
          <Route path="/admin/diagram-compare" element={withRouteSuspense(<DiagramComparePage />)} />
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

          {/* TopicHub launcher page */}
          <Route path="/topic-hub" element={<TopicHubHome />} />

      

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

          {/* Catch-all: redirect unknown routes to a sensible default */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </div>
      </ErrorBoundary>
      <BottomNav />
    </>
  );
}
