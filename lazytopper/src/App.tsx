import type React from "react";
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
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
import { useAuth } from "./context/AuthContext";
import { useProfile } from "./context/ProfileContext";
import { useSubscription } from "./hooks/useSubscription";

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
const WeeklyWrappedPage = lazy(() => import("./pages/WeeklyWrappedPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WeakAreaPracticePage = lazy(() => import("./pages/WeakAreaPracticePage"));
const ParentDashboardPage = lazy(() => import("./pages/ParentDashboardPage"));
const TopicMockPage = lazy(() => import("./pages/TopicMockPage"));
const ExamSimulationPage = lazy(() => import("./pages/ExamSimulationPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

function RouteFallback() {
  return (
    <div className="lt-page">
      <div className="card">
        <h3>Loading...</h3>
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

function HomeRedirect() {
  const { user } = useAuth();
  const { profile } = useProfile();
  if (user && profile?.studentClass) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/trends/10/Maths" replace />;
}

/**
 * BottomNav component renders a simple bottom navigation bar for the mobile view.
 * It highlights the active page based on the current location and provides
 * navigation shortcuts to Home, Trends, Predict (predictive papers), and Dashboard.
 */
function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const current = location.pathname;
  const go = (path: string) => navigate(path);

  const isHome = current === "/";
  const isTrends =
    current.startsWith("/trends") ||
    current.startsWith("/topic-hub");
  const isDashboard = current === "/dashboard";
  const isPredictive =
    current.startsWith("/predictive-papers") ||
    current.startsWith("/mock-paper") ||
    current.startsWith("/mock-builder");
  const isProfile = current === "/profile";

  const activeColor = "#58cc02";
  const inactiveColor = "#afafaf";

  const navItems = [
    {
      label: "Home",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      active: isHome || current === "/dashboard",
      onClick: () => go("/"),
    },
    {
      label: "Trends",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
      active: isTrends,
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
      label: "Mock Tests",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      ),
      active: isPredictive,
      onClick: () => go("/predictive-papers"),
    },
    {
      label: "Progress",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      active: isDashboard,
      onClick: () => go("/dashboard"),
    },
    {
      label: "Profile",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      active: isProfile,
      onClick: () => go("/profile"),
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
        background: "#ffffff",
        borderTop: "2px solid #e5e5e5",
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
        navigate('/predictive-papers');
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
      {/* Top navigation bar — Duolingo-style clean header */}
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "#58cc02", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 14,
          }}>LT</div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#3c3c3c" }}>LazyTopper</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && isTrialActive && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "#eff6ff", border: "2px solid #1cb0f6",
                borderRadius: 12, padding: "4px 10px",
                fontWeight: 800, fontSize: "0.78rem", color: "#1cb0f6",
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
                background: "#fef2f2", border: "2px solid #fca5a5",
                borderRadius: 12, padding: "4px 10px",
                fontWeight: 800, fontSize: "0.78rem", color: "#dc2626",
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
                background: "#fff7e6", border: "2px solid #ff9600",
                borderRadius: 12, padding: "4px 10px",
                fontWeight: 900, fontSize: "0.85rem", color: "#ff9600",
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
              background: "#f7f7f7", border: "2px solid #e5e5e5", borderRadius: 12,
              padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700,
              color: "#afafaf", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
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
                background: "#58cc02", border: "3px solid #46a302",
                color: "#fff", fontWeight: 900, fontSize: 14,
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
                border: "2px solid #e5e5e5",
                borderBottom: "3px solid #e5e5e5",
                borderRadius: 12,
                background: "#fff",
                color: "#3c3c3c",
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
      <div style={{ paddingBottom: '60px' }}>
        <Routes>
          {/* Core Routes */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal/:slug" element={withRouteSuspense(<LegalPage />)} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth>{withRouteSuspense(<Dashboard />)}</RequireAuth>} />


          {/* New Smart Study Planner (grade + subject aware) */}
          <Route path="/planner/:grade/:subject" element={<RequirePremium featureLabel="Smart Study Planner"><StudyPlannerView /></RequirePremium>} />
          {/* Legacy planner route (no params) */}
          <Route path="/planner" element={<RequirePremium featureLabel="Smart Study Planner"><StudyPlannerView /></RequirePremium>} />


          {/* Topic Hub entry with grade & subject in path */}
          <Route path="/topic-hub/:grade/:subject" element={<RequirePremium featureLabel="Chapter Hub (AI Tutor)">{withRouteSuspense(<TopicHub />)}</RequirePremium>} />
          <Route path="/topic-hub/:grade/:subject/:topicKey" element={<RequirePremium featureLabel="Chapter Hub (AI Tutor)">{withRouteSuspense(<TopicHub />)}</RequirePremium>} />

          {/* TopicHub launcher page */}
          <Route path="/topic-hub" element={<TopicHubHome />} />

      

          {/* Dynamic Trends Page (Maths + Science with toggle) */}
          <Route path="/trends/:grade/:subject" element={withRouteSuspense(<TrendsPage />)} />

          {/* Auto-mock paper view (legacy + predictive) — free users get 1/day */}
          <Route path="/mock-paper/:slug" element={<MockViewGate>{withRouteSuspense(<MockPaper />)}</MockViewGate>} />

          {/* Topic Mock Paper — auth + mock view limit */}
          <Route path="/topic-mock/:grade/:subject/:topicKey" element={<MockViewGate>{withRouteSuspense(<TopicMockPage />)}</MockViewGate>} />

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
            element={<RequireAuth>{withRouteSuspense(<PredictivePapersPage />)}</RequireAuth>}
          />

          {/* Exam Simulation — unlimited full-length mock */}
          <Route
            path="/exam-simulation"
            element={<RequirePremium featureLabel="Exam Simulation">{withRouteSuspense(<ExamSimulationPage />)}</RequirePremium>}
          />

          <Route path="/practice/:grade/:subject" element={<PracticeLimitGate>{withRouteSuspense(<PracticePage />)}</PracticeLimitGate>} />

          {/* Study Plan with mandatory grade & subject */}
          <Route path="/study-plan/:grade/:subject" element={<RequirePremium featureLabel="Smart Study Planner">{withRouteSuspense(<StudyPlanPage />)}</RequirePremium>} />
          {/* Legacy Study Plan route */}
          <Route path="/study-plan" element={<RequirePremium featureLabel="Smart Study Planner">{withRouteSuspense(<StudyPlanPage />)}</RequirePremium>} />

          {/* AI Mentor routes redirect to TopicHub preserving context */}
          <Route path="/ai-mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/ai-mentor" element={<Navigate to="/topic-hub" replace />} />
          <Route path="/mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/mentor" element={<Navigate to="/topic-hub" replace />} />

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
      <BottomNav />
    </>
  );
}
