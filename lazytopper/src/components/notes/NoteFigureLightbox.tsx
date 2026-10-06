/**
 * NoteFigureLightbox — the full-screen "tap to enlarge" view for a notes figure
 * (QUICK-FIXES-1 owner follow-up: "on phones, figures fit the screen width …
 * tap to enlarge if available").
 *
 * The app had no reusable, accessible image viewer (QuestionVisualAid's zoom is
 * an inline, keyboard-less overlay private to that component), so this is the
 * minimal one, with no new dependency:
 *   - portalled to <body>, so `position: fixed` is never trapped by an animated
 *     (transformed) ancestor, and the print stylesheet (which shows only
 *     `.lt-note`) never prints it;
 *   - role="dialog" + aria-modal + aria-label; focus moves to the close button on
 *     open, Tab is trapped inside the dialog, focus returns to the trigger on close;
 *   - closes on a tap anywhere, the ✕ button, Escape (capture phase, so it closes
 *     only this layer when the note is itself inside NoteModal), and the browser
 *     Back button (one history entry is pushed on open and consumed on close);
 *   - body scroll is locked while open, restoring the previous value (nests
 *     inside NoteModal's own lock).
 * Class-driven via one scoped <style> block, like the other notes overlays.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface NoteFigureLightboxProps {
  src: string;
  alt: string;
  /** Short accessible name for the dialog, e.g. the figure tag. */
  label: string;
  onClose: () => void;
}

const HISTORY_FLAG = "ltNoteFigure";

export function NoteFigureLightbox({ src, alt, label, onClose }: NoteFigureLightboxProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus in on open, back to the trigger on close.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      prevFocus?.focus?.();
    };
  }, []);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Back button closes: push one entry (same URL, same router state) on open;
  // a popstate means Back was pressed. Closing any other way consumes the entry.
  useEffect(() => {
    // Deferred one tick so a StrictMode mount/unmount/mount pushes exactly once.
    let pushed = false;
    let poppedByBack = false;
    const onPop = () => {
      poppedByBack = true;
      onCloseRef.current();
    };
    const timer = window.setTimeout(() => {
      try {
        window.history.pushState({ ...(window.history.state ?? {}), [HISTORY_FLAG]: true }, "");
        pushed = true;
        window.addEventListener("popstate", onPop);
      } catch {
        /* history unavailable — Back simply navigates as before */
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      const state = window.history.state as Record<string, unknown> | null;
      if (pushed && !poppedByBack && state && state[HISTORY_FLAG]) window.history.back();
    };
  }, []);

  // Body scroll lock.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      ref={dialogRef}
      className="lt-nfl"
      role="dialog"
      aria-modal="true"
      aria-label={`Enlarged figure: ${label}`}
      onClick={() => onCloseRef.current()}
    >
      <style>{LIGHTBOX_CSS}</style>
      <button
        ref={closeRef}
        type="button"
        className="lt-nfl__x"
        aria-label="Close enlarged figure"
        onClick={(e) => {
          e.stopPropagation();
          onCloseRef.current();
        }}
      >
        ✕
      </button>
      <img className="lt-nfl__img" src={src} alt={alt} />
      <p className="lt-nfl__hint" aria-hidden="true">Tap anywhere to close</p>
    </div>,
    document.body,
  );
}

const LIGHTBOX_CSS = `
.lt-nfl {
  position: fixed; inset: 0; z-index: 2200;
  background: #0f2444;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 52px 8px 28px; cursor: zoom-out;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  animation: lt-nfl-fade 0.16s ease;
}
@keyframes lt-nfl-fade { from { opacity: 0; } to { opacity: 1; } }
.lt-nfl__img {
  display: block; max-width: 100%; max-height: 100%; width: auto; height: auto;
  min-width: 0; min-height: 0; flex: 0 1 auto; object-fit: contain;
  background: #fff; border-radius: 8px;
}
/* An SVG with only a viewBox has no intrinsic size: let it fill the frame. */
.lt-nfl__img[src$=".svg"], .lt-nfl__img[src^="data:image/svg"] { width: 100%; height: auto; }
.lt-nfl__x {
  position: absolute; top: 10px; right: 10px;
  width: 36px; height: 36px; border-radius: 999px;
  background: #fff; border: 1px solid #e7ebf0; color: #0f2444;
  font-size: 16px; cursor: pointer;
}
.lt-nfl__x:focus-visible { outline: 3px solid hsl(152, 55%, 45%); outline-offset: 2px; }
.lt-nfl__hint { margin: 10px 0 0; font-size: 12px; color: rgba(255, 255, 255, 0.75); flex: none; }
`;
