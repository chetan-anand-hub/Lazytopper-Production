import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MobileAccountMenu } from "./MobileAccountMenu";

interface MobileShellProps {
  /** Page title shown in sticky header. Omit to hide header entirely. */
  title?: string;
  /** Optional subtitle beneath the title. */
  subtitle?: string;
  /** Whether to show a back-chevron button. */
  showBack?: boolean;
  /** Override default back behaviour (navigate(-1)). */
  onBack?: () => void;
  /** Optional element placed on the right of the header. */
  rightSlot?: ReactNode;
  /**
   * When true (default) the content area adds bottom padding so content
   * clears the BottomNav bar. Set false on screens where BottomNav is hidden.
   */
  showNav?: boolean;
  children: ReactNode;
}

/**
 * MobileShell — the single shared wrapper for all new mobile screens.
 *
 * Provides:
 *  - phone-width constraint (max-width 440 px, centred)
 *  - sticky top header  (back button · title · subtitle · rightSlot · account avatar)
 *  - safe-area padding  (top/bottom via env() where supported)
 *  - scrollable content with bottom-nav offset when showNav=true
 *  - animate-float-up entrance animation on the main content
 *
 * BottomNav visibility is controlled in App.tsx by pathname, not here.
 * `showNav` only governs the content bottom padding so nothing is obscured.
 */
export function MobileShell({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightSlot,
  showNav = true,
  children,
}: MobileShellProps) {
  const navigate = useNavigate();
  // LOW-END-3 PR-2 (e): NO ENTRANCE ANIMATION ON THE PAGE LOAD'S OWN ROUTE. The fade-in is for
  // in-app navigation. On a page load the content is already painted (prerendered HTML), and
  // starting it at opacity 0 kept it out of LCP until a later repaint (measured on Notes and
  // Predicted Questions: LCP 0.3-0.5 s after first paint, while the content was on screen).
  // React Router gives the page load's own location the key "default", so this is pure and is
  // the same in the prerender capture, in hydration and in a client render. It is decided once,
  // at mount: a shell kept across an in-app navigation does not start fading in afterwards. The
  // class stays (tests and the fixed-position notes rely on it); the settled transform is kept,
  // so the containing block for position: fixed descendants is unchanged.
  const locationKey = useLocation().key;
  const [entrance] = useState(locationKey !== "default");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const hasHeader = Boolean(title || showBack || rightSlot);

  return (
    <div
      className="phone-shell"
      style={{
        color: "var(--mob-fg)",
        fontFamily: "var(--font-body)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {hasHeader && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--mob-card)",
            borderBottom: "1px solid var(--mob-card-border)",
            padding: "11px 16px 11px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 52,
          }}
        >
          {showBack && (
            <button
              onClick={handleBack}
              aria-label="Go back"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                marginLeft: -6,
                borderRadius: 8,
                color: "var(--mob-fg)",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <h1
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  color: "var(--mob-fg)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.72rem",
                  color: "var(--mob-fg-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Right cluster: any page-provided rightSlot, then the app-wide account
              avatar-dropdown (parity with the desktop shell). MobileAccountMenu
              renders nothing when signed out, so existing callers are unaffected. */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {rightSlot}
            <MobileAccountMenu />
          </div>
        </header>
      )}

      <main
        className="animate-float-up"
        style={{
          padding: `20px 20px ${showNav ? "calc(var(--mob-nav-height) + 28px)" : "env(safe-area-inset-bottom, 28px)"}`,
          minHeight: hasHeader ? "calc(100dvh - 52px)" : "100dvh",
          ...(entrance ? {} : { animation: "none", transform: "translateY(0)" }),
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default MobileShell;
