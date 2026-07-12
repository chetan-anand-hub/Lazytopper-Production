import type React from "react";
import { Routes, Route, useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import SignUpPage from "./pages/SignUpPage";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";

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
import { useIsDesktop } from "./hooks/useIsDesktop";
import { DesktopShell } from "./components/desktop/DesktopShell";

// Desktop Phase 1 — locked desktop baseline Home (rendered inside DesktopShell)
const DesktopHome = lazy(() => import("./pages/desktop/DesktopHome"));
// Desktop Phase 2 — locked Practice hub surface. PR #73 repair keeps this
// same scope-builder experience available at mobile width too.
const DesktopPracticePage = lazy(() => import("./pages/desktop/DesktopPracticePage"));

// SEVER PR (fix/sever-obsolete-surfaces, 2026-06-08): the lazy imports for the
// retired/deferred surfaces (Dashboard, TrendsPage, PredictivePapers, StudyPlan,
// DailyMix, DailyMission, WeeklyWrapped, ParentDashboard, Methodology, NightBefore,
// RevisionCalendar, MiniMock, ParentAccess, WeeklyDigest, Settings) were removed
// alongside their <Route> entries below — the route was the only inbound edge.
// The page files remain on disk (marked LEGACY-RETIRED / DEFERRED-REVIVE) for the
// Phase-2 clean-branch pass. MockPaper is KEPT routed but is now unreachable (its
// only entry was the deferred PredictivePapers) — flagged in the sever report.
const MockPaper = lazy(() => import("./pages/MockPaper"));
const HighlyProbableQuestions = lazy(() => import("./pages/HighlyProbableQuestions"));
// Learn-Flow rebuild PR-B: the legacy mobile Topic Hub components
// (pages/TopicHub.tsx premium lesson flow + pages/app/TopicHub.tsx bare entry) are
// no longer routed — DesktopTopicHubPage (the responsive concept-spine) renders at
// every width. The files remain for now; they are deleted in PR-F per the rebuild
// sequence. (Imports removed here so tsc noUnusedLocals stays green.)
// PR-E1 item 4 / PR-G-deletion-pending: MockBuilder is UN-ROUTED from the live
// product (MI now serves its purpose; the page is a display-only stub). The file
// is KEPT on disk — PR-G deletes the legacy set. Its lazy import is removed so the
// bundle no longer pulls it and tsc noUnusedLocals stays green. The /mock-builder
// routes below now redirect to the Practice hub.
const PracticePage = lazy(() => import("./pages/PracticePage"));
const WeakAreaPracticePage = lazy(() => import("./pages/WeakAreaPracticePage"));
const ChapterTestPage = lazy(() => import("./pages/ChapterTestPage"));
const ExamSimulationPage = lazy(() => import("./pages/ExamSimulationPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const TeacherDashboardPage = lazy(() => import("./pages/TeacherDashboardPage"));
import { captureIncomingReferral } from "./services/referralService";
const PricingPage = lazy(() => import("./pages/PricingPage"));
const FunnelPage = lazy(() => import("./pages/FunnelPage"));
const DiagramComparePage = lazy(() => import("./pages/DiagramComparePage"));
const DiagramQualityPage = lazy(() => import("./pages/DiagramQualityPage"));
const VisualAuditPage = lazy(() => import("./pages/VisualAuditPage"));
const CacheStatsPage = lazy(() => import("./pages/CacheStatsPage"));
const DifficultyBreakdownPage = lazy(() => import("./pages/DifficultyBreakdownPage"));
const QuestionReportsPage = lazy(() => import("./pages/QuestionReportsPage"));

// Mobile baseline pages (#437 — real implementations)
const Intent            = lazy(() => import("./pages/app/Intent"));
const WorksheetReady    = lazy(() => import("./pages/app/WorksheetReady"));
const CheckImprove      = lazy(() => import("./pages/app/CheckImprove"));
const MobileHome        = lazy(() => import("./pages/app/MobileHome"));
const MobileWelcome     = lazy(() => import("./pages/MobileWelcome"));

// Mobile baseline pages (#438 — broken destination repair)

// Exam Trends — ONE responsive ranked-list component (Option-B convergence).
// Replaces BOTH retired twins (the old desktop card grid + the old mobile tier
// list). It mounts inside DesktopShell at desktop width (isDesktopShellRoute)
// and reflows fluidly to mobile — no breakpoint file swap for this route.
const ExamTrendsRanked = lazy(() => import("./pages/ExamTrendsRanked"));
const DesktopTopicHubPage = lazy(() => import("./pages/desktop/DesktopTopicHubPage"));
const DesktopCheckImprovePage = lazy(() => import("./pages/desktop/DesktopCheckImprovePage"));
// PR-E2a — ONE responsive worksheet generator (replaces the desktop + mobile
// twins DesktopWorksheetsPage + app/Worksheets). Renders at every width; App
// wraps it in DesktopShell at desktop width (isDesktopShellRoute) and the global
// mobile BottomNav handles mobile nav — same convention as ExamTrendsRanked.
// The retired twins remain on disk for PR-G deletion (imports removed so tsc
// noUnusedLocals stays green).
const WorksheetGenerator = lazy(() => import("./components/worksheet/WorksheetGenerator"));
// Desktop Phase 6 — locked desktop Me / Progress page (>=1024px only).
// Mobile width keeps rendering MobileMe unchanged.
const DesktopMePage = lazy(() => import("./pages/desktop/DesktopMePage"));
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
  if (loading) return null;
  // SEVER PR: catch-all "*" no longer drops signed-in students onto the retired
  // old Dashboard. Send them to "/" — RootEntry then branches by viewport to the
  // live home (desktop DesktopHome / mobile MobileHome via /browse).
  if (user) return <Navigate to="/" replace />;
  return <Navigate to="/welcome" replace />;
}

function RootEntry() {
  const { user, loading } = useAuth();
  const isDesktop = useIsDesktop();

  if (loading) return null;

  if (!isDesktop) {
    // SEVER PR: mobile "/" for a signed-in student is the live MobileHome at
    // /browse — NOT the retired old Dashboard. (Was the two-contradictory-homes
    // bug: this landed on /dashboard while the BottomNav Home tab went to /browse.)
    if (user) return <Navigate to="/browse" replace />;
    return <Navigate to="/welcome" replace />;
  }

  // Desktop: signed-in users see the DesktopHome cockpit,
  // signed-out users see the Welcome landing page.
  if (user) {
    return withRouteSuspense(<DesktopHome />);
  } else {
    return withRouteSuspense(<Welcome />);
  }
}

/**
 * isMobileSelfChromedRoute — true on routes whose mobile page renders its OWN
 * locked-design brand bar (MobileHome `/browse`, MobileWelcome `/welcome`), so
 * the global public navbar must NOT also render at mobile width (otherwise two
 * brand bars stack — the double-bar issue). Gated on `!isDesktop`, so desktop
 * chrome on these routes is unchanged.
 *
 * `/welcome` is already suppressed via `isPublicLandingRoute`; including it here
 * is defensive and documents intent — the new effect is suppressing the global
 * navbar on mobile `/browse`. Exported as a pure predicate for unit testing.
 */
export function isMobileSelfChromedRoute(pathname: string, isDesktop: boolean): boolean {
  return !isDesktop && (pathname === "/browse" || pathname === "/welcome");
}

/**
 * isBareFullScreenRoute — routes that render as a BARE, distraction-free full-screen
 * surface at BOTH desktop and mobile width: NO global chrome at all — no legacy dark
 * header, no DesktopShell, no mobile BottomNav. The Chapter Test owns its whole viewport
 * (its own back button + minimal test bar), so a student sits the test with no app chrome
 * around it. Width-agnostic on purpose — the surface reflows itself.
 *
 * A prefix list so Full Mock (`/full-mock`) can join later with one entry. Exported as a
 * pure predicate for unit testing.
 */
const BARE_FULLSCREEN_PREFIXES = ["/chapter-test"] as const;
export function isBareFullScreenRoute(pathname: string): boolean {
  return BARE_FULLSCREEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * BottomNav — mobile tab bar: Home / Exam Trends / Practice / Check / Me.
 *
 * Recoloured to the app's light grammar (PR D): white surface, soft border,
 * green active / muted-slate inactive — replacing the old near-black band and
 * 3-tab set so the mobile chrome matches the desktop sidebar and the locked
 * mobile-Home design. Five tabs mirror the desktop sidebar destinations.
 *
 * DURABLE RULE (SEVER PR 2026-06-08): the mobile nav targets DERIVE FROM / MUST
 * MATCH the desktop nav set (components/desktop/DesktopShell.tsx NAV_ITEMS:
 * Home / Exam Trends / Practice / Check & Improve / Me). They must NOT diverge
 * again — divergence is what created the two-contradictory-homes bug (mobile "/"
 * landed on the old Dashboard while the Home tab went to /browse). Home is the
 * only intentional split: desktop "/" (DesktopHome) vs mobile "/browse"
 * (MobileHome). If you add/rename a desktop nav destination, update BOTH.
 *
 * Visibility rules:
 *   Hidden on desktop (>=1024px), on /welcome, /pricing, and any /intent* path.
 *   Shown on all other mobile routes.
 *
 * Active state covers the canonical routes plus their legacy aliases so the nav
 * stays coherent when users visit old deep-links.
 *
 * Exported for unit testing (the 5-tab/route/colour contract); App still renders
 * it internally — the export adds no runtime behaviour.
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const current = location.pathname;

  // ── Visibility gate ────────────────────────────────────────────────
  // BottomNav is a mobile-only tab bar. At desktop width (>=1024px) the
  // app exposes navigation via the top navbar (public routes such as
  // "/" and "/welcome") or via the DesktopShell sidebar (shell-eligible
  // cockpit routes). The mobile BottomNav must never render on desktop,
  // regardless of route or auth state — including the public Welcome
  // landing rendered by RootEntry at "/" for signed-out desktop users.
  if (isDesktop) {
    return null;
  }

  if (
    current === "/welcome" ||
    current === "/pricing" ||
    current.startsWith("/intent") ||
    isBareFullScreenRoute(current) // Chapter Test is bare full-screen — no bottom nav either.
  ) {
    return null;
  }

  const go = (path: string) => navigate(path);
  // Light app grammar — same tokens as the grammar primitives / locked design.
  const activeColor = "hsl(152, 55%, 45%)";
  const inactiveColor = "hsl(220, 15%, 42%)";

  // ── Active-state detection ─────────────────────────────────────────
  const isHomeActive = current === "/browse" || current === "/";

  const isExamTrendsActive =
    current.startsWith("/exam-trends") ||
    current.startsWith("/topic-hub");

  const isPracticeActive =
    current.startsWith("/practice-hub") ||
    current.startsWith("/practice") ||
    current.startsWith("/exam-simulation") ||
    current.startsWith("/highly-probable") ||
    current.startsWith("/weak-area") ||
    current.startsWith("/topic-mock") ||
    current.startsWith("/chapter-test") ||
    current.startsWith("/mock-paper") ||
    current.startsWith("/mock-builder");

  const isCheckActive = current.startsWith("/check-improve");

  const isMeActive =
    current === "/me" ||
    current === "/profile";

  const navItems = [
    {
      label: "Home",
      // House icon
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8"/>
          <path d="M5 10v10h14V10"/>
        </svg>
      ),
      active: isHomeActive,
      onClick: () => go("/browse"),
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
      label: "Check",
      // Phone icon (photo your handwritten answer)
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="3" width="12" height="18" rx="2"/>
          <circle cx="12" cy="16" r="1"/>
        </svg>
      ),
      active: isCheckActive,
      onClick: () => go("/check-improve"),
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
        background: "#fff",
        borderTop: "1px solid hsl(220, 18%, 90%)",
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
            fontWeight: item.active ? 800 : 600,
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
function isDesktopShellRoute(pathname: string, hasSession: boolean = true): boolean {
  // "/" shell-wraps only when signed in (hasSession), so signed-out Welcome landing
  // remains public (not wrapped in DesktopShell).
  if (pathname === "/" && hasSession) return true;
  // "/browse" is the public Explore-first cockpit entry. It intentionally
  // shell-wraps at desktop width without creating a guest user or fake auth.
  if (pathname === "/browse") return true;
  // "/welcome" is always a public landing page, never shell-wrapped.
  if (pathname === "/welcome") return false;
  // "/pricing" is a standalone public page — never shell-wrapped.
  if (pathname === "/pricing") return false;
  // Desktop Phase 2 — exact "/practice-hub" only. No nested practice paths,
  // no other future destinations (/check-improve, /me, /topic-hub,
  // /topic-hub/*) are added in this phase.
  if (pathname === "/practice-hub") return true;
  // Desktop Phase 3 — exact "/exam-trends" only. Topic Hub
  // (/topic-hub, /topic-hub/*), /check-improve, and /me are explicitly
  // NOT shell-wrapped in this phase.
  if (pathname === "/exam-trends") return true;
  // PR-K2F repair — HPQ uses the desktop shell at desktop width while mobile
  // continues through the existing legacy route surface.
  if (pathname === "/highly-probable" || pathname.startsWith("/highly-probable/")) return true;
  // Full Practice route family — render /practice/:grade/:subject inside the
  // upgraded desktop shell at desktop width while preserving worksheets.
  if (/^\/practice\/(?!worksheets\/)[^\/]+\/[^\/]+$/.test(pathname)) return true;
  // Desktop Phase 4 — Topic Hub route family.
  // Matches the bare launcher "/topic-hub" and any deep variant such as
  // "/topic-hub/:topicName", "/topic-hub/:grade/:subject", and
  // "/topic-hub/:grade/:subject/:topicKey".
  if (pathname === "/topic-hub" || pathname.startsWith("/topic-hub/")) return true;
  // Desktop Phase 5 — exact "/check-improve" only.
  if (pathname === "/check-improve") return true;
  // Desktop Phase 6 — exact "/me" only. Mobile width continues to render
  // the legacy MobileMe page unchanged.
  if (pathname === "/me") return true;
  // Desktop Phase 7 (PR-D) — exact "/practice/worksheets" only. The shared
  // "/practice/worksheets/ready" route remains intentionally NOT shell-wrapped
  // (it still renders the existing WorksheetReady mobile screen at every
  // viewport width). Mobile width continues to render the existing Worksheets
  // generator unchanged.
  if (pathname === "/practice/worksheets") return true;
  return false;
}

export default function App() {
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [headerStreak, setHeaderStreak] = useState(0);
  const navigate = useNavigate();
  const { mode, setMode } = useVibeMode();
  const { user } = useAuth();
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
      // SEVER PR: command-palette navigations to retired/deferred surfaces
      // (navigateToDashboard, navigateToWeeklyWrap, navigateToDailyMix,
      // navigateToWeakAreas, navigateToParentDashboard) were removed — the palette
      // now reaches only live targets. Their catalog entries are also gone from
      // commandPaletteConfig.ts / commandIntent.ts so they no longer surface.
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
        // PR-E1 item 4 / PR-G-deletion-pending: Mock Builder is un-routed; send the
        // command-palette entry to the live Practice hub instead of the dead route.
        navigate('/practice-hub');
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
        navigate('/me');
        break;
      case 'navigateToProfile':
        navigate('/me');
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
  const isAuthRoute =
    location.pathname === "/login" || location.pathname.startsWith("/login/");
  const isPublicLandingRoute =
    location.pathname === "/welcome" ||
    location.pathname === "/pricing" ||
    (location.pathname === "/" && !user);
  const shouldUseDesktopShell = isDesktop && isDesktopShellRoute(location.pathname, !!user);
  const mobileSelfChromed = isMobileSelfChromedRoute(location.pathname, isDesktop);
  const isBareFullScreen = isBareFullScreenRoute(location.pathname);
  const pricingUrl = (source: string) => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return `/pricing?source=${encodeURIComponent(source)}&returnTo=${encodeURIComponent(returnTo)}`;
  };
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
      {!isAuthRoute && !shouldUseDesktopShell && !isPublicLandingRoute && !mobileSelfChromed && !isBareFullScreen && (
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
              onClick={() => navigate(pricingUrl("global-header"))}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 12, padding: "4px 10px",
                fontWeight: 800, fontSize: "0.78rem", color: "#f87171",
                cursor: "pointer",
              }}
            >
              Choose plan
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
              onClick={() => navigate("/me")}
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
      {!isAuthRoute && !isPublicLandingRoute && (
        <>
          <CommandPalette
            isOpen={isPaletteOpen}
            onClose={() => setPaletteOpen(false)}
            onSelect={handleCommandSelect}
          />
          {!isDesktop && <TrialBanner />}
          <BreakReminder />
        </>
      )}
      <ErrorBoundary level="global">
      {(() => {
        const routesEl = (
        <Routes>
          {/* Core Routes */}
          {/* "/" is delegated to RootEntry, which branches on auth +
              viewport: signed-out desktop → public Welcome landing,
              signed-in/local-session desktop → DesktopHome cockpit
              (shell-wrapped above), mobile → HomeRedirect. */}
          <Route path="/" element={<RootEntry />} />
          <Route
            path="/welcome"
            element={isDesktop ? <Welcome /> : withRouteSuspense(<MobileWelcome />)}
          />
          {/* SEVER PR: at mobile width /browse ALWAYS renders the live MobileHome
              (signed-in or out) — this is the signed-in mobile home landing that
              "/" (RootEntry) redirects to. Desktop is unchanged: signed-in users
              bounce to "/" (DesktopHome), signed-out see DesktopHome here. Making
              mobile /browse terminal (no signed-in bounce) avoids a "/" ⇄ "/browse"
              redirect loop now that mobile "/" routes signed-in users to /browse. */}
          <Route
            path="/browse"
            element={
              isDesktop
                ? (user
                    ? <Navigate to="/" replace />
                    : withRouteSuspense(<DesktopHome />))
                : withRouteSuspense(<MobileHome />)
            }
          />
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
          {/* SEVER PR: /methodology RETIRED (prediction method changed; content now
              wrong). Only inbound was the retired old /trends. Page file marked
              LEGACY-RETIRED. */}
          <Route path="/teacher" element={<RequireAuth><SectionErrorBoundary>{withRouteSuspense(<TeacherDashboardPage />)}</SectionErrorBoundary></RequireAuth>} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          {/* SEVER PR: /dashboard (old Dashboard) RETIRED — it was the mobile "/"
              + catch-all + command-palette landing (now all re-pointed to the live
              MobileHome / "/"). Its components/dashboard/* cluster (imported only by
              Dashboard) is marked LEGACY-RETIRED. */}

          {/* SEVER PR: /planner (StudyPlannerView, "planner-mode mentor") RETIRED —
              premium-gated, not in nav, no live inbound. Marked LEGACY-RETIRED. */}


          {/* Topic Hub entry with grade & subject in path */}
          {/* Topic Hub — Learn-Flow rebuild PR-B: DesktopTopicHubPage (the
              responsive concept-spine) renders at EVERY width. Access model
              unchanged — these two routes stay premium-gated. */}
          <Route
            path="/topic-hub/:grade/:subject"
            element={
              <RequirePremium featureLabel="Chapter Hub (AI Tutor)">
                <SectionErrorBoundary>
                  {/* Learn-Flow rebuild PR-B: the responsive concept-spine
                      (DesktopTopicHubPage) is the Topic Hub main view at EVERY
                      width — single component, single BoardConcept data source. */}
                  {withRouteSuspense(<DesktopTopicHubPage />)}
                </SectionErrorBoundary>
              </RequirePremium>
            }
          />
          <Route
            path="/topic-hub/:grade/:subject/:topicKey"
            element={
              <RequirePremium featureLabel="Chapter Hub (AI Tutor)">
                <SectionErrorBoundary>
                  {/* Learn-Flow rebuild PR-B: the responsive concept-spine
                      (DesktopTopicHubPage) is the Topic Hub main view at EVERY
                      width — single component, single BoardConcept data source. */}
                  {withRouteSuspense(<DesktopTopicHubPage />)}
                </SectionErrorBoundary>
              </RequirePremium>
            }
          />

          {/* Bare /topic-hub launcher. Learn-Flow rebuild PR-B: renders the
               concept-spine at every width; with no topic named it redirects to
               Exam Trends (the topic picker in the new flow). */}
          <Route
            path="/topic-hub"
            element={withRouteSuspense(<DesktopTopicHubPage />)}
          />

      

          {/* SEVER PR: old /trends (TrendsPage) RETIRED — superseded by /exam-trends
              (ExamTrendsRanked). Leaked inbound (JourneyStrip in HPQ) removed; the
              JourneyStrip-only references in live PracticeQuestionList / mobile
              TopicHub re-pointed to /exam-trends. Marked LEGACY-RETIRED. */}

          {/* Auto-mock paper view (legacy + predictive) — free users get 1/day */}
          <Route path="/mock-paper/:slug" element={<MockViewGate><SectionErrorBoundary>{withRouteSuspense(<MockPaper />)}</SectionErrorBoundary></MockViewGate>} />

          {/* Topic Mock → redirect to Chapter Test */}
          <Route path="/topic-mock/:grade/:subject/:topicKey" element={<TopicMockRedirect />} />
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<MockViewGate><SectionErrorBoundary>{withRouteSuspense(<ChapterTestPage />)}</SectionErrorBoundary></MockViewGate>} />

          {/* PR-E1 item 4 / PR-G-deletion-pending: Mock Builder is UN-ROUTED from the
              live product — students can no longer reach it (MI now serves its
              purpose; the page is a display-only stub). The MockBuilder file is KEPT
              on disk for PR-G to delete; here the routes redirect to the Practice hub
              so any remaining inbound links land somewhere live instead of a 404. */}
          <Route path="/mock-builder/:grade/:subject" element={<Navigate to="/practice-hub" replace />} />
          <Route path="/mock-builder" element={<Navigate to="/practice-hub" replace />} />

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

          {/* SEVER PR: /predictive-papers DISCONNECTED + marked DEFERRED-REVIVE
              (pending redesign into the chapter/full-test family). It had no live
              inbound nav (only back-targets). NOTE: it was the only entry to
              /mock-paper/:slug, so MockPaper is now unreachable — kept routed and
              flagged in the sever report (part of the same pending-redesign family).
              Live ExamSimulation/MockPaper back-defaults re-pointed off it. */}

          {/* Exam Simulation — unlimited full-length mock */}
          <Route
            path="/exam-simulation"
            element={<RequirePremium featureLabel="Exam Simulation"><SectionErrorBoundary>{withRouteSuspense(<ExamSimulationPage />)}</SectionErrorBoundary></RequirePremium>}
          />

          {/* SEVER PR: exam-week tools /night-before, /revision-calendar, /mini-mock
              RETIRED (reached only via the dead dashboard cluster / Settings). And
              /weekly-digest RETIRED (verified NOT part of mistake-intel; its only
              referrers were the retired Settings/Dashboard/ParentDashboard share
              flow). All marked LEGACY-RETIRED. /parent (ParentAccessPage) is
              DISCONNECTED + marked DEFERRED-REVIVE (future B2B / parent-visibility). */}

          <Route path="/practice/:grade/:subject" element={<PracticeLimitGate><SectionErrorBoundary>{withRouteSuspense(<PracticePage />)}</SectionErrorBoundary></PracticeLimitGate>} />

          {/* SEVER PR: /study-plan (StudyPlanPage) RETIRED — reached only from the
              dead MentorPanel + MockBuilder back-nav. The live MockBuilder back path
              that defaulted here was re-pointed to /exam-trends. Marked LEGACY-RETIRED. */}

          {/* AI Mentor routes redirect to TopicHub preserving context */}
          <Route path="/ai-mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/ai-mentor" element={<Navigate to="/topic-hub" replace />} />
          <Route path="/mentor/:grade/:subject" element={<MentorRedirect />} />
          <Route path="/mentor" element={<Navigate to="/topic-hub" replace />} />

          {/* SEVER PR: /daily-mission, /daily-mix (DailyMissionPage / DailyMixPage)
              and /weekly-wrapped (WeeklyWrappedPage) RETIRED — reached only via the
              dead dashboard cluster + command palette (both severed). All marked
              LEGACY-RETIRED. */}

          {/* Weak Area Practice & Learning Paths — KEPT (live via ExamSimulation /
              MockPaper). SEVER PR severed only the dead-Dashboard doorway + the
              command-palette entry; its back-default was re-pointed off /dashboard. */}
          <Route
            path="/weak-area-practice"
            element={<RequirePremium featureLabel="Weak Area Practice">{withRouteSuspense(<WeakAreaPracticePage />)}</RequirePremium>}
          />

          {/* SEVER PR: /parent-dashboard (ParentDashboardPage) DISCONNECTED + marked
              DEFERRED-REVIVE (future B2B / parent-visibility). Reached only from the
              retired Settings + WeeklyDigest + command palette. */}

          {/* Student Profile & Growth Journey — /profile alias kept (→ /me, live). */}
          <Route path="/profile" element={<Navigate to="/me" replace />} />

          {/* SEVER PR: /settings (SettingsPage) RETIRED — Me/Progress is the account
              surface. Reached only from the orphaned ProfilePage; it linked onward to
              the retired night-before/weekly-digest/parent-dashboard. Marked
              LEGACY-RETIRED. */}

          {/* ── Mobile baseline routes (#437)
               BrowserRouter basename="/app" is ALWAYS active (vite base="/app/" in
               both dev and prod).  Route paths are relative to that basename —
               no /app/ prefix needed here.  Browser URLs are consistently
               /app/exam-trends, /app/topic-hub, /app/me etc. ─── */}

          {/* Intent screen — BottomNav hidden by visibility gate when path starts with /intent */}
          <Route path="/intent" element={withRouteSuspense(<Intent />)} />

          {/* Practice hub — named /practice-hub to avoid ambiguity with /practice/:grade/:subject.
              PR #73 repair: render the PR-K2G scope-builder hub at every width
              so mobile does not fall back to the old PracticeHome surface. */}
          <Route
            path="/practice-hub"
            element={withRouteSuspense(<DesktopPracticePage />)}
          />

          {/* Worksheets flow — ready must be before the parent to avoid partial match.
              PR-E2a: /practice/worksheets renders the ONE responsive
              WorksheetGenerator at EVERY width (build → generated states in-place).
              At desktop width it mounts inside DesktopShell (isDesktopShellRoute
              keeps "/practice/worksheets" shell-wrapped); at mobile width it reflows
              fluidly and the global BottomNav provides nav. The legacy
              /practice/worksheets/ready route is retained for the old mobile flow
              and any deep-links (the new in-place flow does not navigate to it). */}
          <Route path="/practice/worksheets/ready" element={withRouteSuspense(<WorksheetReady />)} />
          <Route
            path="/practice/worksheets"
            element={withRouteSuspense(<WorksheetGenerator />)}
          />

          {/* Check & Improve — Desktop Phase 5: at desktop width (>=1024px)
              this renders the locked DesktopCheckImprovePage inside DesktopShell
              (the conditional shell wrap is applied above by isDesktopShellRoute).
              At mobile width, the existing CheckImprove (mobile uploader → real
              AI grading) renders unchanged. */}
          <Route
            path="/check-improve"
            element={
              isDesktop
                ? withRouteSuspense(<DesktopCheckImprovePage />)
                : withRouteSuspense(<CheckImprove />)
            }
          />

          {/* ── #438 — Mobile destination repairs ────────────────────────
               These replace the previous broken redirects/missing routes.
               Desktop routes (/trends, /topic-hub/:grade/:subject, /me)
               are untouched — they remain separate from these mobile screens. */}

          {/* Exam Trends — Option-B convergence: ONE responsive ranked-list
              component renders at every width. At desktop width it mounts
              inside DesktopShell (isDesktopShellRoute keeps "/exam-trends"
              shell-wrapped); at mobile width it reflows fluidly. No desktop /
              mobile twin split for this route. */}
          <Route
            path="/exam-trends"
            element={withRouteSuspense(<ExamTrendsRanked />)}
          />

          {/* Topic Hub inside the /app/ basename — bare entry (no topicName) or
              topic detail (:topicName). Learn-Flow rebuild PR-B: the responsive
              concept-spine (DesktopTopicHubPage) renders at every width; bare
              entry redirects to Exam Trends. */}
          <Route
            path="/topic-hub"
            element={
              withRouteSuspense(<DesktopTopicHubPage />)
            }
          />
          <Route
            path="/topic-hub/:topicName"
            element={
              withRouteSuspense(<DesktopTopicHubPage />)
            }
          />

          {/* Me — desktop renders the locked DesktopMePage inside DesktopShell
              at >=1024px (Phase 6); mobile width keeps the legacy MobileMe
              page unchanged. */}
          <Route
            path="/me"
            element={
              <RequireAuth>
                {isDesktop
                  ? withRouteSuspense(<DesktopMePage />)
                  : withRouteSuspense(<MobileMe />)}
              </RequireAuth>
            }
          />

          {/* Catch-all: redirect unknown routes to a sensible default */}
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        );

        // Desktop Phase 1 — wrap shell-eligible routes in the locked
        // DesktopShell at desktop width. Other routes (auth, admin, deep
        // params) and all mobile widths fall through to the legacy
        // paddingBottom:60px container so nothing already shipped regresses.
        if (shouldUseDesktopShell) {
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
