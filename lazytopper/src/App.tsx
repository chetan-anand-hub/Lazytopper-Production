import type React from "react";
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
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
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const DailyMixPage = lazy(() => import("./pages/DailyMixPage"));
const WeeklyWrappedPage = lazy(() => import("./pages/WeeklyWrappedPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

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
  const isTrends =
    current.startsWith("/trends") ||
    current.startsWith("/topic-hub");
  const isDashboard = current === "/dashboard";
  const isPredictive =
    current.startsWith("/predictive-papers") ||
    current.startsWith("/mock-paper") ||
    current.startsWith("/mock-builder");
  const isProfile = current === "/profile";

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
        onClick={() => {
          let ctx = { grade: "10", subject: "Maths" };
          try {
            const raw = localStorage.getItem("lazytopper.lastSubjectContext");
            if (raw) { const p = JSON.parse(raw); if (p?.grade && p?.subject) ctx = p; }
          } catch {}
          go(`/trends/${ctx.grade}/${ctx.subject}`);
        }}
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

      <button
        onClick={() => go("/profile")}
        style={{
          ...baseBtnStyle,
          color: isProfile ? activeColor : inactiveColor,
          fontWeight: isProfile ? 700 : 500,
        }}
      >
        Profile
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
            <>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                title="Your Profile"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(user.displayName || user.email || "S").charAt(0).toUpperCase()}
              </button>
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
            </>
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


          {/* Topic Hub entry with grade & subject in path */}
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

          {/* AI Mentor routes redirect to TopicHub preserving context */}
          <Route path="/ai-mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/ai-mentor" element={<Navigate to="/topic-hub" replace />} />
          <Route path="/mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/mentor" element={<Navigate to="/topic-hub" replace />} />

          {/* Daily Mix route for personalised study mixes */}
          <Route
            path="/daily-mix/:grade/:subject"
            element={<RequireAuth>{withRouteSuspense(<DailyMixPage />)}</RequireAuth>}
          />

          {/* Weekly Wrapped recap route */}
          <Route
            path="/weekly-wrapped"
            element={<RequireAuth>{withRouteSuspense(<WeeklyWrappedPage />)}</RequireAuth>}
          />

          {/* Student Profile & Growth Journey */}
          <Route
            path="/profile"
            element={<RequireAuth>{withRouteSuspense(<ProfilePage />)}</RequireAuth>}
          />

          {/* Catch-all: redirect unknown routes to a sensible default */}
          <Route path="*" element={<Navigate to="/trends/10/Maths" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </>
  );
}
