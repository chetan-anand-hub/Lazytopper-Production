/**
 * SettingsModal (SETTINGS-1) — the ONE Settings window, opened from the avatar menu on
 * phone (MobileAccountMenu) and desktop (DesktopShell). Same component, same words.
 *
 * Sections, in order: Your pass · Sign-in methods · Mascots · Your data.
 * Me / Progress now shows only progress; the pass, linking, mascots switch and the DPDP
 * controls (download / delete) all live here. Their behaviour is unchanged: this file
 * only decides WHERE they are mounted. `MascotsSetting` and `AccountDataControls` are
 * reused as-is (the latter portals its own delete-confirmation dialog to document.body,
 * above this modal at z-index 9999, so it keeps working from inside this one).
 *
 * ★ PORTALLED TO document.body, ON PURPOSE. The desktop header uses backdrop-filter, which
 * makes it the containing block for `position: fixed` descendants, and the page <main>
 * carries a transform. A modal rendered in place would lose its viewport geometry and sit
 * under the BottomNav. Same defect and same fix as AccountDataControls / LinkSignInMethodModal.
 *
 * ★ ONE MODAL AT A TIME. "Sign-in methods" hands over to the existing LinkSignInMethodModal
 * (owned by the menu): this window closes first, the linking modal then opens.
 *
 * No inline style objects: one injected stylesheet (CLAUDE.md section 7).
 */
import { useEffect, useId, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { deriveAccountStatus } from "../../utils/accountStatus";
import MascotsSetting from "../guide/MascotsSetting";
import AccountDataControls from "./AccountDataControls";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Hands over to the existing sign-in-methods modal. The caller closes this window. */
  onOpenSignInMethods: () => void;
  /** The avatar button; focus returns here on close. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SettingsModal({
  open,
  onClose,
  onOpenSignInMethods,
  returnFocusRef,
}: SettingsModalProps) {
  const { user } = useAuth();
  const { tier, isTrialActive, isTrialExpired, daysLeftInTrial } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus in on open; focus back to the avatar button (or the prior element) on close.
  useEffect(() => {
    if (!open) return;
    const prior = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(".lt-set__close")?.focus();
    return () => {
      const target = returnFocusRef?.current ?? prior;
      if (target && target.isConnected) target.focus();
    };
  }, [open, returnFocusRef]);

  // Esc closes (unless the delete-confirmation dialog is on top: that one is Esc-less and
  // modal, and closing Settings underneath it would strand it). Tab is trapped here.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (document.querySelector(".lt-acct__scrim")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !user) return null;

  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const manageSubscriptionUrl = `/pricing?source=account-menu&returnTo=${encodeURIComponent(returnTo)}`;
  const status = deriveAccountStatus({ tier, isTrialActive, isTrialExpired, daysLeftInTrial });

  return createPortal(
    <div
      className="lt-set__scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{SETTINGS_CSS}</style>
      {/* Status tone from the shared helper, injected as CSS (no inline style objects). */}
      <style>{`.lt-set__status{border-color:${status.border};background:${status.bg};color:${status.color}}`}</style>
      <div
        className="lt-set__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="settings-modal"
        ref={dialogRef}
      >
        <header className="lt-set__head">
          <h2 className="lt-set__title" id={titleId}>
            Settings
          </h2>
          <button type="button" className="lt-set__close" aria-label="Close settings" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="lt-set__body">
          <section className="lt-set__card" aria-labelledby={`${titleId}-pass`}>
            <h3 className="lt-set__h" id={`${titleId}-pass`}>
              Your pass
            </h3>
            <div
              className="lt-set__status"
              data-testid="settings-pass-status"
            >
              <div className="lt-set__statuslabel">{status.label}</div>
              <div className="lt-set__statusdetail">{status.detail}</div>
            </div>
            <button
              type="button"
              className="lt-set__btn"
              onClick={() => {
                onClose();
                navigate(manageSubscriptionUrl);
              }}
            >
              Manage your pass
            </button>
          </section>

          <section className="lt-set__card" aria-labelledby={`${titleId}-signin`}>
            <h3 className="lt-set__h" id={`${titleId}-signin`}>
              Sign-in methods
            </h3>
            <p className="lt-set__p">
              See how you sign in, and optionally add a phone number as a second way in, so your
              work stays in one account.
            </p>
            <button type="button" className="lt-set__btn" onClick={onOpenSignInMethods}>
              Sign-in methods
            </button>
          </section>

          <MascotsSetting uid={user.uid} />

          <AccountDataControls />
        </div>
      </div>
    </div>,
    document.body,
  );
}

const SETTINGS_CSS = `
.lt-set__scrim {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(14, 23, 41, 0.55);
  box-sizing: border-box;
}
.lt-set__panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  background: #f6f8fc;
  color: #14213d;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(14, 23, 41, 0.35);
  overflow: hidden;
}
.lt-set__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 8px 10px 18px;
  border-bottom: 1px solid #dde2ee;
  background: #fff;
}
.lt-set__title { margin: 0; font-size: 18px; font-weight: 800; }
.lt-set__close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #14213d;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.lt-set__close:focus-visible, .lt-set__btn:focus-visible { outline: 3px solid hsl(152, 55%, 30%); outline-offset: 2px; }
.lt-set__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 16px 18px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.lt-set__card {
  box-sizing: border-box;
  margin: 16px 0;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #dde2ee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lt-set__h { margin: 0; font-size: 15px; font-weight: 800; }
.lt-set__p { margin: 0; font-size: 13.5px; line-height: 1.5; color: #56627e; }
.lt-set__status { border: 1px solid; border-radius: 8px; padding: 8px 10px; font-size: 12.5px; font-weight: 700; }
.lt-set__statusdetail { margin-top: 2px; font-weight: 500; color: #56627e; }
.lt-set__btn {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #c9d0de;
  background: #fff;
  color: #14213d;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-start;
}
@media (max-width: 639px) {
  .lt-set__scrim { padding: 0; align-items: flex-end; }
  .lt-set__panel {
    max-width: none;
    max-height: 92vh;
    max-height: 92dvh;
    border-radius: 16px 16px 0 0;
  }
  .lt-set__btn { align-self: stretch; }
}
`;
