import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { deriveAccountStatus } from "../../utils/accountStatus";

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
 * MobileAccountMenu — the mobile responsive VIEW of the desktop account dropdown.
 *
 * Mirrors the DesktopShell dropdown exactly in content and behaviour: same
 * `useAuth` + `useSubscription` hooks (READ-ONLY — never activates a trial),
 * same identity/status derivation (via the shared `deriveAccountStatus`), same
 * `/pricing?source=account-menu&returnTo=…` manage-subscription URL, same logout
 * path, same click-/tap-outside-to-close. Rendered with the mobile `--mob-*`
 * theme vars so it belongs in the mobile header.
 *
 * When signed out it renders nothing (mobile auth entry lives elsewhere — this is
 * the account chrome for a signed-in session). The trial-EXPIRED state also
 * surfaces a header "Choose plan" chip so the call-to-action stays as discoverable
 * as the desktop status pill, not buried inside the dropdown.
 */
function MobileAccountMenu() {
  const { user, logout } = useAuth();
  const { tier, isTrialActive, isTrialExpired, daysLeftInTrial } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open]);

  if (!user) return null;

  const initials = (user.displayName || user.email || "S").charAt(0).toUpperCase();
  const identityLabel = user.displayName || user.email || "Student";
  const identitySubLabel = user.email || user.phoneNumber || "Signed in account";
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const manageSubscriptionUrl = `/pricing?source=account-menu&returnTo=${encodeURIComponent(returnTo)}`;
  const status = deriveAccountStatus({ tier, isTrialActive, isTrialExpired, daysLeftInTrial });

  const handleLogout = async () => {
    setOpen(false);
    navigate("/", { replace: true });
    await logout();
  };

  const goManage = () => {
    setOpen(false);
    navigate(manageSubscriptionUrl);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Expired-trial CTA — kept in the header (not buried in the dropdown) so it
          stays as discoverable as the desktop status pill. */}
      {status.isActionable && (
        <button
          type="button"
          onClick={goManage}
          style={{
            border: `1px solid ${status.border}`,
            background: status.bg,
            color: status.color,
            borderRadius: 999,
            padding: "5px 10px",
            fontWeight: 700,
            fontSize: "0.72rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Choose plan
        </button>
      )}

      <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={identityLabel}
          aria-label="Open account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          style={{
            width: 34,
            height: 34,
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
            flexShrink: 0,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {initials}
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Account menu"
            style={{
              position: "absolute",
              right: 0,
              top: 42,
              width: 256,
              maxWidth: "calc(100vw - 32px)",
              background: "var(--mob-card)",
              border: "1px solid var(--mob-card-border)",
              borderRadius: 12,
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              padding: 12,
              zIndex: 50,
            }}
          >
            <div style={{ padding: "4px 4px 10px", borderBottom: "1px solid var(--mob-card-border)" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--mob-fg)", overflowWrap: "anywhere" }}>
                {identityLabel}
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: "var(--mob-fg-muted)", overflowWrap: "anywhere" }}>
                {identitySubLabel}
              </div>
              <button
                type="button"
                onClick={status.isActionable ? goManage : undefined}
                aria-disabled={!status.isActionable}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginTop: 10,
                  border: `1px solid ${status.border}`,
                  background: status.bg,
                  color: status.color,
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: status.isActionable ? "pointer" : "default",
                }}
              >
                <div>{status.label}</div>
                <div style={{ marginTop: 2, fontWeight: 500, color: "var(--mob-fg-muted)" }}>
                  {status.detail}
                </div>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10 }}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate("/me");
                }}
                style={menuItemStyle("var(--mob-fg)", 600)}
              >
                Me / Progress
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={goManage}
                style={menuItemStyle("var(--mob-fg)", 600)}
              >
                Manage subscription
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                style={menuItemStyle("hsl(0, 72%, 55%)", 700)}
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function menuItemStyle(color: string, fontWeight: number): CSSProperties {
  return {
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    padding: "9px 8px",
    color,
    fontWeight,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };
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
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default MobileShell;
