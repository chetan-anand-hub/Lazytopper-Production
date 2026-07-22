import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { deriveAccountStatus } from "../../utils/accountStatus";

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
 *
 * ── EXTRACTED in PR-A2 ────────────────────────────────────────────────────
 * This was module-private inside `MobileShell.tsx`. It is now its own component
 * so a SELF-CHROMED route can mount it without adopting MobileShell: mobile
 * `/browse` (MobileHome) owns its own brand bar and must not be wrapped in the
 * shell (it would stack two headers — see `isMobileSelfChromedRoute` in App.tsx).
 *
 * The move is behaviour-preserving: the component body is character-identical to
 * the MobileShell version, and MobileShell now imports it and renders it in the
 * exact same position in its right-hand cluster.
 *
 * The `--mob-*` custom properties it uses are declared on `:root` (styles.css),
 * not scoped to the shell, so it themes correctly on any mobile surface.
 */
export function MobileAccountMenu() {
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
