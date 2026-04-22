import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

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
 *  - sticky top header  (back button · title · subtitle · rightSlot)
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

          {rightSlot && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              {rightSlot}
            </div>
          )}
        </header>
      )}

      <main
        className="animate-float-up"
        style={{
          padding: `20px 20px ${showNav ? "calc(var(--mob-nav-height) + 28px)" : "env(safe-area-inset-bottom, 28px)"}`,
          minHeight: hasHeader ? "calc(100dvh - 52px)" : "100dvh",
        }}
      >
        {children}
      </main>
    </div>
  );
}
