import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { AuthUser } from "../../context/AuthContext";
import { PendingPapersList } from "./PendingPapersList";
import { PENDING_CSS, papersWaitingLabel } from "./pendingPapersUi";
import { trackPendingShown, usePendingPapers } from "./usePendingPapers";

/**
 * PendingBell — HOME-PENDING-1 (owner ruling 17 Oct 2026): the header bell (desktop shell header
 * and mobile Home's brand bar) carries a badge with the number of papers waiting for answers and
 * opens a small popover listing them (the same list as the Home strip, through the same
 * `usePendingPapers` read — no extra network read).
 *
 *   • Signed out / local session: the bell renders as before — inert, no badge, no popover.
 *   • Signed in, nothing waiting: no badge; the popover says so honestly.
 *   • Accessible: a real button with aria-expanded / aria-controls; Escape, an outside click or
 *     focus leaving the bell + popover closes it, and Escape returns focus to the bell.
 */
export default function PendingBell({ user }: { user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined }) {
  const { uid, papers } = usePendingPapers(user);
  const [openState, setOpen] = useState(false);
  // Derived, not synced by an effect: signed out (no uid) the popover is simply never open.
  const open = openState && !!uid;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popId = useId();
  const count = papers.length;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && count > 0) trackPendingShown("bell", count);
  }, [open, count]);

  const label = uid && count > 0 ? `Notifications: ${papersWaitingLabel(count)}` : "Notifications";

  return (
    <div
      className="lt-pbell"
      ref={wrapRef}
      // Focus leaving the bell + popover (Tab past the last link, or into the page) closes it.
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (open && next && wrapRef.current && !wrapRef.current.contains(next)) close(false);
      }}
    >
      <style>{PENDING_CSS}</style>
      <button
        ref={btnRef}
        type="button"
        className="lt-pbell-btn"
        title="Notifications"
        aria-label={label}
        data-testid="pending-bell"
        {...(uid ? { "aria-expanded": open, "aria-controls": popId, "aria-haspopup": "dialog" as const } : {})}
        onClick={() => {
          if (uid) setOpen((v) => !v);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {uid && count > 0 ? (
          <span className="lt-pbell-badge" data-testid="pending-bell-badge" aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="lt-pbell-pop" id={popId} role="dialog" aria-label="Papers waiting for your answers" data-testid="pending-bell-popover">
          <p className="lt-pbell-h">{count > 0 ? papersWaitingLabel(count) : "Notifications"}</p>
          {count > 0 ? (
            <PendingPapersList papers={papers} placement="bell" onNavigate={() => close(false)} />
          ) : (
            <p className="lt-pbell-empty" data-testid="pending-bell-empty">
              No papers are waiting for your answers.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
