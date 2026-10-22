/**
 * MOMENTS-1 PART 0 — the snackbar after "Hide mascots": "Mascots hidden. Turn them back on in
 * Settings." with an Undo action. Imperative and portal-free ON PURPOSE: the button that hides the
 * mascots lives inside the very surface that disappears when they are hidden, so the snackbar must
 * outlive it. ONE snackbar on the page at a time (a second hide replaces it).
 *
 * Reached only from the lazy chunks (every "Hide mascots" button is drawn there), so this module and
 * its CSS never join the entry bundle.
 */
import { hideMascots, showMascots } from "../mascotsMute";
import "./mascotsToast.css";

export const MASCOTS_TOAST_COPY = {
  hide: "Hide mascots",
  hidden: "Mascots hidden. Turn them back on in Settings.",
  undo: "Undo",
} as const;

/** How long the snackbar stays when nobody taps it. */
export const MASCOTS_TOAST_MS = 8000;

let current: { el: HTMLElement; timer: ReturnType<typeof setTimeout> } | null = null;

function removeToast(): void {
  if (!current) return;
  clearTimeout(current.timer);
  current.el.remove();
  current = null;
}

function showToast(): void {
  if (typeof document === "undefined" || !document.body) return;
  removeToast();
  const el = document.createElement("div");
  el.className = "lt-mascots-toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("data-testid", "mascots-toast");
  const text = document.createElement("span");
  text.className = "lt-mascots-toast__t";
  text.textContent = MASCOTS_TOAST_COPY.hidden;
  const undo = document.createElement("button");
  undo.type = "button";
  undo.className = "lt-mascots-toast__undo";
  undo.setAttribute("data-testid", "mascots-undo");
  undo.textContent = MASCOTS_TOAST_COPY.undo;
  undo.addEventListener("click", () => {
    removeToast();
    showMascots();
  });
  el.append(text, undo);
  document.body.appendChild(el);
  current = { el, timer: setTimeout(removeToast, MASCOTS_TOAST_MS) };
}

/** The "Hide mascots" tap: hidden on this device everywhere, then the snackbar with Undo. */
export function hideMascotsWithUndo(): void {
  hideMascots();
  showToast();
}

export function __removeMascotsToastForTests(): void {
  removeToast();
}
