import type React from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import TopicHubHome from "./pages/TopicHubHome";
import { StudyPlannerView } from "./components/planner/StudyPlannerView";


// Import the new Vibe toggle and command palette components.
import { VibeToggle } from './ui/components/VibeToggle';
import { CommandPalette } from './ui/components/CommandPalette';
import { useState, useEffect, lazy, Suspense } from "react";
import { useVibeMode } from './context/vibeModeContext';
import { parseCommandIntent } from "./services/commandIntent";
import { normalizeTopicKey } from "./utils/topicResolver";
import { RequireAuth } from "./components/auth/RequireAuth";
import { useAuth } from "./context/AuthContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TrendsPage = lazy(() => import("./pages/TrendsPage"));
const MockPaper = lazy(() => import("./pages/MockPaper"));
const HighlyProbableQuestions = lazy(() => import("./pages/HighlyProbableQuestions"));
const PredictivePapersPage = lazy(() => import("./pages/PredictivePapers"));
const TopicHub = lazy(() => import("./pages/TopicHub"));
const MockBuilder = lazy(() => import("./pages/MockBuilder"));
const AiMentorPage = lazy(() => import("./pages/AiMentorPage"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const DailyMixPage = lazy(() => import("./pages/DailyMixPage"));
const WeeklyWrappedPage = lazy(() => import("./pages/WeeklyWrappedPage"));
const SessionPlayPage = lazy(() => import("./pages/SessionPlayPage"));

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

  // Determine which nav item is active.
  const isHome = current === "/";
  // Consider both /trends and /topic-hub as part of the Trends flow
  const isTrends =
    current.startsWith("/trends") ||
    current.startsWith("/topics/") ||
    current.startsWith("/topic-hub");
  const isDashboard = current === "/dashboard";
  const isPredictive =
    current.startsWith("/predictive-papers") ||
    current.startsWith("/mock-paper") ||
    current.startsWith("/mock-builder");

  const baseBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    fontSize: "0.9rem",
    cursor: "pointer",
  };

  const activeColor = "#ffb400";
  const inactiveColor = "#f1f1f1";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        padding: "10px 12px",
        background: "#111",
        borderTop: "1px solid #333",
        zIndex: 20,
      }}
    >
      <button
        onClick={() => go("/")}
        style={{
          ...baseBtnStyle,
          color: isHome ? activeColor : inactiveColor,
          fontWeight: isHome ? 700 : 500,
        }}
      >
        Home
      </button>

      <button
        onClick={() => go("/trends/10/Maths")}
        style={{
          ...baseBtnStyle,
          color: isTrends ? activeColor : inactiveColor,
          fontWeight: isTrends ? 700 : 500,
        }}
      >
        Trends
      </button>

      <button
        onClick={() => go("/predictive-papers")}
        style={{
          ...baseBtnStyle,
          color: isPredictive ? activeColor : inactiveColor,
          fontWeight: isPredictive ? 700 : 500,
        }}
      >
        Predict
      </button>

      <button
        onClick={() => go("/dashboard")}
        style={{
          ...baseBtnStyle,
          color: isDashboard ? activeColor : inactiveColor,
          fontWeight: isDashboard ? 700 : 500,
        }}
      >
        Dashboard
      </button>
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
  const [logoutBusy, setLogoutBusy] = useState(false);
  const navigate = useNavigate();
  const { mode, setMode } = useVibeMode();
  const { user, logout } = useAuth();

  const handleCommandSelect = (action: { id: string; handler: string }, query: string) => {
    const parsed = parseCommandIntent(query);
    const resolvedHandler = parsed.recognized ? parsed.handler : action.handler;
    const normalizedTopic = normalizeTopicKey(parsed.topic || "");
    const topicParam = normalizedTopic ? `?topic=${encodeURIComponent(normalizedTopic)}` : "";

    switch (resolvedHandler) {
      case 'navigateToDashboard':
        navigate('/dashboard');
        break;
      case 'navigateToPractice':
        navigate(`/practice/10/Maths${topicParam}`);
        break;
      case 'navigateToHPQ':
        navigate('/highly-probable/10/Maths');
        break;
      case 'navigateToMockTest':
        navigate('/predictive-papers');
        break;
      case 'navigateToMockBuilder':
        navigate('/mock-builder/10/Maths');
        break;
      case 'navigateToTopicHub':
        if (normalizedTopic) {
          navigate(`/topic-hub/10/Maths/${encodeURIComponent(normalizedTopic)}`);
        } else {
          navigate('/topic-hub');
        }
        break;
      case 'navigateToMentor':
        navigate('/mentor/10/Maths');
        break;
      case 'navigateToStats':
        navigate('/dashboard');
        break;
      case 'navigateToWeeklyWrap':
        navigate('/weekly-wrapped');
        break;
      case 'navigateToDailyMix':
        navigate(`/daily-mix/10/Maths${topicParam}`);
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
        console.log('Executing command:', action.handler);
        break;
    }
    setPaletteOpen(false);
  };

  // Keyboard shortcut to open the command palette (Cmd/Ctrl + K)
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

  const handleLogout = async () => {
    setLogoutBusy(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    } finally {
      setLogoutBusy(false);
    }
  };

  return (
    <>
      {/* Top navigation bar with brand name and vibe toggle */}
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>LazyTopper</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.78rem", opacity: 0.8 }}>Press Ctrl/Cmd + K to search</span>
          <VibeToggle variant="navbar" />
          {user ? (
            <button
              type="button"
              className="pill-btn"
              style={{ padding: "5px 12px", fontSize: "0.8rem" }}
              onClick={handleLogout}
              disabled={logoutBusy}
              title="Log out"
            >
              {logoutBusy ? "Logging out..." : "Log out"}
            </button>
          ) : null}
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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth>{withRouteSuspense(<Dashboard />)}</RequireAuth>} />

          {/* New Smart Study Planner (grade + subject aware) */}
          <Route path="/planner/:grade/:subject" element={<RequireAuth><StudyPlannerView /></RequireAuth>} />
          {/* Legacy planner route (no params) */}
          <Route path="/planner" element={<RequireAuth><StudyPlannerView /></RequireAuth>} />


          {/* Legacy Topic content hub – maths topics via :topicKey param */}
          <Route path="/topics/:topicKey" element={<RequireAuth>{withRouteSuspense(<TopicHub />)}</RequireAuth>} />

          {/* Preferred Topic Hub entry with grade & subject in path */}
          <Route path="/topic-hub/:grade/:subject" element={<RequireAuth>{withRouteSuspense(<TopicHub />)}</RequireAuth>} />
          <Route path="/topic-hub/:grade/:subject/:topicKey" element={<RequireAuth>{withRouteSuspense(<TopicHub />)}</RequireAuth>} />

          {/* TopicHub launcher page */}
          <Route path="/topic-hub" element={<TopicHubHome />} />

      

          {/* Dynamic Trends Page (Maths + Science with toggle) */}
          <Route path="/trends/:grade/:subject" element={withRouteSuspense(<TrendsPage />)} />

          {/* Auto-mock paper view (legacy + predictive) */}
          <Route path="/mock-paper/:slug" element={withRouteSuspense(<MockPaper />)} />

          {/* New Mock Builder v1 with mandatory grade & subject */}
          <Route path="/mock-builder/:grade/:subject" element={withRouteSuspense(<MockBuilder />)} />
          {/* Legacy Mock Builder route (no params) */}
          <Route path="/mock-builder" element={withRouteSuspense(<MockBuilder />)} />

          {/* Highly Probable Questions with mandatory grade & subject */}
          <Route
            path="/highly-probable/:grade/:subject"
            element={withRouteSuspense(<HighlyProbableQuestions />)}
          />
          {/* Legacy HPQ route */}
          <Route
            path="/highly-probable"
            element={withRouteSuspense(<HighlyProbableQuestions />)}
          />

          {/* Predictive papers hub */}
          <Route
            path="/predictive-papers"
            element={withRouteSuspense(<PredictivePapersPage />)}
          />

          <Route path="/practice/:grade/:subject" element={withRouteSuspense(<PracticePage />)} />

          {/* Study Plan with mandatory grade & subject */}
          <Route path="/study-plan/:grade/:subject" element={<RequireAuth>{withRouteSuspense(<StudyPlanPage />)}</RequireAuth>} />
          {/* Legacy Study Plan route */}
          <Route path="/study-plan" element={<RequireAuth>{withRouteSuspense(<StudyPlanPage />)}</RequireAuth>} />

          {/* AI Mentor / Planner routes with mandatory grade & subject */}
          <Route path="/ai-mentor/:grade/:subject" element={withRouteSuspense(<AiMentorPage />)} />
          <Route path="/ai-mentor" element={withRouteSuspense(<AiMentorPage />)} />
          {/* Provide both /mentor and /ai-mentor so links remain backwards compatible */}
          <Route path="/mentor/:grade/:subject" element={withRouteSuspense(<AiMentorPage />)} />
          <Route path="/mentor" element={withRouteSuspense(<AiMentorPage />)} />

          {/* Daily Mix route for personalised study mixes */}
          <Route
            path="/daily-mix/:grade/:subject"
            element={<RequireAuth>{withRouteSuspense(<DailyMixPage />)}</RequireAuth>}
          />

          {/* Unified session player route */}
          <Route
            path="/play/:sessionId"
            element={<RequireAuth>{withRouteSuspense(<SessionPlayPage />)}</RequireAuth>}
          />

          {/* Weekly Wrapped recap route */}
          <Route
            path="/weekly-wrapped"
            element={<RequireAuth>{withRouteSuspense(<WeeklyWrappedPage />)}</RequireAuth>}
          />


          {/* Catch-all: redirect unknown routes to a sensible default */}
          <Route path="*" element={<Navigate to="/trends/10/Maths" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </>
  );
}
