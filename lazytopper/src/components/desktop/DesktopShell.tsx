import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { MistakeIntelCard } from "./MistakeIntelCard";
import { TutorPickerModal } from "../../lib/desktop/homeDestinations";

/**
 * DesktopShell — locked desktop AppShell parity build (Desktop Phase 1).
 *
 * Source of truth (locked desktop baseline):
 *   chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/components/lt/AppShell.tsx
 *
 * Composition (matches baseline):
 *   ┌──────────┬───────────────────────────────────────────┐
 *   │ Sidebar  │ Top utility / search header (h=64) sticky │
 *   │  260 px  ├───────────────────────────────────────────┤
 *   │  · Logo  │                                           │
 *   │  · Nav   │       Page content (only this scrolls)    │
 *   │  · Intel │                                           │
 *   └──────────┴───────────────────────────────────────────┘
 *
 * Scroll/layout contract (baseline parity):
 *   - Outer wrapper is a fixed-height (100vh) flex row with overflow:hidden
 *     so the document/iframe NEVER becomes the scroll container.
 *   - Sidebar is a normal flex child — full height comes from flex stretch.
 *     No sticky needed because the wrapper itself never scrolls.
 *   - Right column is flex-direction:column. Header is flexShrink:0,
 *     <main> is flex:1 with overflow-y:auto — only main scrolls.
 *   - Result: sidebar stays anchored, top bar stays visible, main scrolls.
 *
 * No Tailwind / no lucide-react in production — inline styles + inline SVG.
 */

/**
 * A rail entry is EITHER a routed destination or an action that opens
 * shell-owned UI. They are a discriminated union rather than one shape with an
 * optional `to`, because the nav map below renders a real <NavLink> for the
 * routed kind: handing an action entry a placeholder `to` would ship an anchor
 * a student can middle-click / open-in-new-tab into a dead route.
 */
interface NavLinkItem {
  to: string;
  label: string;
  end?: boolean;
  icon: React.ReactNode;
}

interface NavActionItem {
  /** The shell action this entry runs. No `to` — it opens a modal, it never navigates. */
  action: "tutor";
  label: string;
  icon: React.ReactNode;
}

type NavItem = NavLinkItem | NavActionItem;

/**
 * The rail's ONE visual treatment, shared by the routed entries and the Tutor
 * action entry so the two can never drift apart. Defined once rather than
 * copied so "the new item is indistinguishable from its neighbours" is
 * structural rather than a convention someone has to remember.
 */
function navItemStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
    background: isActive ? "hsl(222, 50%, 20%)" : "transparent",
    textDecoration: "none",
    transition: "background 0.15s, color 0.15s",
  };
}

// Quiet legal row appended below "Log out" in the account dropdown — the only
// reachable inbound link to the /legal/:slug policies for a signed-in session.
const LEGAL_LINKS: { label: string; slug: string }[] = [
  { label: "Privacy", slug: "privacy" },
  { label: "Terms", slug: "terms" },
  { label: "Refunds", slug: "refund" },
];

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Home",
    end: true,
    // LayoutDashboard
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    // Rank 2 — an ACTION, not a route: it opens the shared tutor picker, which
    // composes the /tutor URL (and the signed-out login round-trip) itself via
    // composeTutorEntry. The RequirePremium gate on /tutor is therefore reached
    // exactly as it is from Home; nothing here routes around it.
    action: "tutor",
    label: "Tutor",
    // MessageCircleQuestion
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    to: "/exam-trends",
    label: "Exam Trends",
    // TrendingUp
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    to: "/practice-hub",
    label: "Practice",
    // Dumbbell
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.4 14.4 9.6 9.6" />
        <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
        <path d="m21.5 21.5-1.4-1.4" />
        <path d="M3.9 3.9 2.5 2.5" />
        <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
      </svg>
    ),
  },
  {
    to: "/check-improve",
    label: "Check & Improve",
    // ScanLine
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 12h10" />
      </svg>
    ),
  },
  {
    to: "/me",
    label: "Me / Progress",
    // User
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

interface DesktopShellProps {
  children: ReactNode;
  /** Optional handler so the top-bar Search box can open the existing CommandPalette. */
  onOpenSearch?: () => void;
}

export function DesktopShell({ children, onOpenSearch }: DesktopShellProps) {
  const { user, logout } = useAuth();
  const { tier, isTrialActive, isTrialExpired, daysLeftInTrial } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const initials = user
    ? (user.displayName || user.email || "S").charAt(0).toUpperCase()
    : null;
  const identityLabel = user?.displayName || user?.email || "Student";
  const identitySubLabel = user?.email || user?.phoneNumber || "Signed in account";
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const manageSubscriptionUrl = `/pricing?source=account-menu&returnTo=${encodeURIComponent(returnTo)}`;
  const homePath = user ? "/" : "/browse";
  const signedOutLoginUrl = `/login?reason=login&redirect=${encodeURIComponent(returnTo || "/")}`;

  let accountStatusLabel = "Free account";
  let accountStatusDetail = "No active trial is recorded for this account.";
  let accountStatusColor = "hsl(220, 15%, 45%)";
  let accountStatusBg = "hsl(215, 28%, 95%)";
  let accountStatusBorder = "hsl(215, 25%, 90%)";

  if (tier === "premium") {
    accountStatusLabel = "Premium active";
    accountStatusDetail = "Full access is active on this account.";
    accountStatusColor = "hsl(152, 55%, 28%)";
    accountStatusBg = "hsla(152,55%,45%,0.12)";
    accountStatusBorder = "hsla(152,55%,45%,0.25)";
  } else if (isTrialActive) {
    accountStatusLabel = daysLeftInTrial <= 1
      ? "Trial ends today"
      : `Trial active - ${daysLeftInTrial} days left`;
    accountStatusDetail = "Your 7-day trial is tied to this account.";
    accountStatusColor = daysLeftInTrial <= 2 ? "hsl(32, 95%, 38%)" : "hsl(152, 55%, 30%)";
    accountStatusBg = daysLeftInTrial <= 2 ? "hsla(32,95%,50%,0.12)" : "hsla(152,55%,45%,0.12)";
    accountStatusBorder = daysLeftInTrial <= 2 ? "hsla(32,95%,50%,0.28)" : "hsla(152,55%,45%,0.25)";
  } else if (isTrialExpired) {
    accountStatusLabel = "Trial ended - Choose plan";
    accountStatusDetail = "Choose a plan to continue premium tools.";
    accountStatusColor = "hsl(0, 72%, 45%)";
    accountStatusBg = "hsla(0,72%,50%,0.10)";
    accountStatusBorder = "hsla(0,72%,50%,0.22)";
  }

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [accountOpen]);

  const handleLogout = async () => {
    setAccountOpen(false);
    navigate("/", { replace: true });
    await logout();
  };

  // ── LOCKED DESKTOP BASELINE LIGHT THEME ─────────────────────────
  // Source: chetan-anand-hub/lazytopper-desktop-view-e1fc5df7/src/index.css
  // Hard-coded locally (NOT global CSS vars) so the rest of the production
  // app's existing dark theme on non-/ routes is not perturbed.
  const SURFACE_BG = "hsl(210, 33%, 98%)";        // --background
  const SURFACE_TEXT = "hsl(220, 45%, 14%)";      // --foreground
  const SURFACE_TEXT_MUTED = "hsl(220, 15%, 45%)"; // --muted-foreground
  const SURFACE_CARD = "hsl(0, 0%, 100%)";        // --card
  const SURFACE_BORDER = "hsl(215, 25%, 90%)";    // --border
  const SURFACE_MUTED_BG = "hsl(215, 28%, 95%)";  // --muted (search rest state)

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        background: SURFACE_BG,
        color: SURFACE_TEXT,
        overflow: "hidden",
      }}
    >
      {/* ── SIDEBAR (260px, dark navy per locked baseline) ─────── */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          background: "hsl(222, 55%, 13%)",
          color: "rgba(255,255,255,0.85)",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid hsl(222, 45%, 22%)",
        }}
      >
        {/* Brand */}
        <Link
          to={homePath}
          style={{
            padding: "24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, hsl(152,55%,45%), hsl(152,60%,38%))",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 32px hsla(152,55%,45%,0.25)",
            }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 18,
                fontWeight: 600,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              LazyTopper
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
              CBSE · Class 10
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav style={{ padding: "0 12px", marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((n) =>
            "action" in n ? (
              /* The Tutor entry has no route, so it has no NavLink `isActive`.
                 It reads as active ONLY while its picker is open: the rail's
                 active state means "this is where you are", and while the modal
                 is up, that is the tutor. There is no landed-on-/tutor case to
                 cover — /tutor is not a DesktopShell route, so the rail is not
                 rendered there at all. */
              <button
                key={n.action}
                type="button"
                onClick={() => setTutorOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={tutorOpen}
                style={{
                  ...navItemStyle(tutorOpen),
                  // Neutralise the <button> UA defaults so it renders identically
                  // to the <a> its neighbours are. Everything VISUAL still comes
                  // from navItemStyle above — these only cancel browser chrome.
                  width: "100%",
                  border: "none",
                  fontFamily: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {n.icon}
                <span>{n.label}</span>
              </button>
            ) : (
              <NavLink
                key={n.to}
                to={!user && n.to === "/" ? "/browse" : n.to}
                end={n.end}
                style={({ isActive }) => navItemStyle(isActive)}
              >
                {n.icon}
                <span>{n.label}</span>
              </NavLink>
            ),
          )}
        </nav>

        {/* Mistake Intel block — pushed to bottom of sidebar via marginTop:auto */}
        <div style={{ marginTop: "auto", padding: 16 }}>
          <MistakeIntelCard />
        </div>
      </aside>

      {/* ── MAIN COLUMN ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* TOP UTILITY HEADER (h=64) — sticky inside right column */}
        {/* ── HEADER STACKING CONTRACT ([FU-HUB-DROPDOWN-ZINDEX]) ──────────
            `backdrop-filter` CREATES A STACKING CONTEXT. Without a `position`
            and `zIndex` of its own, this header painted in the non-positioned
            layer, so EVERY positioned element inside <main> — even at the
            default `z-index: auto` — painted over it, and the account dropdown
            below (zIndex 50) was trapped inside the header's context where that
            50 could never outrank them. Owner live A/B: the same dropdown works
            at mobile width, whose brand bar has no backdrop-filter and so
            creates no context. The defect was the ANCESTOR, not the menu — so
            the fix is here, and the menu is untouched.

            The value must satisfy TWO bounds, both re-derived from the live
            landscape (the old "<60" note is VOID — it was justified by
            TutorDrawerV2 / MentorSolveDrawer, both deleted in #516):
              FLOOR  > 30 — 30 is the highest z-index used by PAGE CONTENT
                            anywhere in the app (Worksheets.tsx:484); every
                            other content value is <= 20. Clearing them all
                            also clears the `z-index: auto` positioned cards
                            that caused the reported bug, which is the case
                            that actually matters.
              CEIL   < 50 — `.command-palette-backdrop` (styles.css:6505), the
                            palette THIS header's own search box opens, mounted
                            as a sibling of the shell (App.tsx:821). It must keep
                            covering the header. Staying under 50 also keeps the
                            header under `.lt-tutor-ov` (60, the picker mounted
                            below) and the 9998-10000 full-screen overlay band
                            (UpgradeModal, VisualExplainer, BreakReminder, …).
            Nothing live sits in 31..49: the only value there is
            `.examples-modal-backdrop` (styles.css:3657), dead CSS with zero
            consumers in src/. 35 therefore has clearance on both sides. */}
        <header
          style={{
            height: 64,
            flexShrink: 0,
            position: "relative",
            zIndex: 35,
            borderBottom: `1px solid ${SURFACE_BORDER}`,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            gap: 16,
            color: SURFACE_TEXT,
          }}
        >
          {/* Search input — opens CommandPalette on focus/click */}
          <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: SURFACE_TEXT_MUTED,
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Search topics, chapters, questions…"
              readOnly
              onFocus={onOpenSearch}
              onClick={onOpenSearch}
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px 0 36px",
                borderRadius: 8,
                background: SURFACE_MUTED_BG,
                border: "1px solid transparent",
                outline: "none",
                fontSize: 14,
                color: SURFACE_TEXT,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              aria-label="Search (opens command palette)"
            />
          </div>

          {/* Right utility cluster — restrained per baseline */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notifications bell */}
            <button
              type="button"
              title="Notifications"
              style={{
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: SURFACE_TEXT_MUTED,
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>

            {/* Identity / login - kept visually secondary so it doesn't dominate */}
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isTrialExpired && tier !== "premium") {
                      navigate(manageSubscriptionUrl);
                    } else {
                      setAccountOpen(true);
                    }
                  }}
                  title={accountStatusDetail}
                  style={{
                    border: `1px solid ${accountStatusBorder}`,
                    background: accountStatusBg,
                    color: accountStatusColor,
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {accountStatusLabel}
                </button>
                <div ref={accountMenuRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setAccountOpen((open) => !open)}
                    title={identityLabel}
                    aria-label="Open account menu"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, hsl(152,55%,45%), hsl(152,60%,38%))",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {initials}
                  </button>
                  {accountOpen && (
                    <div
                      role="menu"
                      aria-label="Account menu"
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 44,
                        width: 260,
                        background: SURFACE_CARD,
                        border: `1px solid ${SURFACE_BORDER}`,
                        borderRadius: 8,
                        boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
                        padding: 12,
                        zIndex: 50,
                      }}
                    >
                      <div style={{ padding: "4px 4px 10px", borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: SURFACE_TEXT, overflowWrap: "anywhere" }}>
                          {identityLabel}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 12, color: SURFACE_TEXT_MUTED, overflowWrap: "anywhere" }}>
                          {identitySubLabel}
                        </div>
                        <div
                          style={{
                            marginTop: 10,
                            border: `1px solid ${accountStatusBorder}`,
                            background: accountStatusBg,
                            color: accountStatusColor,
                            borderRadius: 8,
                            padding: "8px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <div>{accountStatusLabel}</div>
                          <div style={{ marginTop: 2, fontWeight: 500, color: SURFACE_TEXT_MUTED }}>
                            {accountStatusDetail}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10 }}>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountOpen(false);
                            navigate("/me");
                          }}
                          style={{
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            borderRadius: 6,
                            padding: "9px 8px",
                            color: SURFACE_TEXT,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Me / Progress
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountOpen(false);
                            navigate(manageSubscriptionUrl);
                          }}
                          style={{
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            borderRadius: 6,
                            padding: "9px 8px",
                            color: SURFACE_TEXT,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Manage subscription
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          style={{
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            borderRadius: 6,
                            padding: "9px 8px",
                            color: "hsl(0, 72%, 45%)",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Log out
                        </button>
                        {/* Quiet legal row — a secondary link row subordinate to
                            Log out, not menuitem buttons. */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "2px 12px",
                            marginTop: 4,
                            paddingTop: 8,
                            borderTop: `1px dashed ${SURFACE_BORDER}`,
                          }}
                        >
                          {LEGAL_LINKS.map(({ label, slug }) => (
                            <button
                              key={slug}
                              type="button"
                              onClick={() => {
                                setAccountOpen(false);
                                navigate(`/legal/${slug}`);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration = "underline";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = "none";
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: "2px 0",
                                fontSize: 11.5,
                                fontWeight: 500,
                                color: "hsl(220,12%,58%)",
                                cursor: "pointer",
                                textDecoration: "none",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : !location.pathname.startsWith("/login") ? (
              <button
                type="button"
                onClick={() => navigate(signedOutLoginUrl)}
                style={{
                  background: SURFACE_CARD,
                  border: `1px solid ${SURFACE_BORDER}`,
                  color: SURFACE_TEXT,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Log in
              </button>
            ) : null}
          </div>
        </header>

        {/* MAIN WORKSPACE — only scroll container */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            background: SURFACE_BG,
            color: SURFACE_TEXT,
          }}
        >
          {children}
        </main>
      </div>

      {/* Rail Tutor entry's picker. Mounted at the SHELL ROOT, deliberately not
          inside <header> or <aside>: the header both creates a stacking context
          AND (via backdrop-filter) is a containing block for `position: fixed`
          descendants, so an overlay mounted inside it would lose its
          `inset: 0` full-viewport geometry and have its z-index 60 trapped
          under the header's 35. Here it competes in the root context, exactly
          as it does from Home. `isSignedIn` is passed as a PROP from the
          shell's existing `user` — homeDestinations must stay firebase-free, so
          it never calls useAuth() itself. Renders null while closed. */}
      <TutorPickerModal
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        isSignedIn={!!user}
      />
    </div>
  );
}
