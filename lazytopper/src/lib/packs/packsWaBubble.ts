/**
 * PACKS-MOBILE-1 - the floating WhatsApp bubble (components/contact/WhatsAppFab) sits fixed at the right edge and, at 320-430 px,
 * covered the "Free sample page" link and the Board Pass row on /packs. The bubble is mounted by App.tsx (not ours to change), so
 * PacksPage runs this while it is mounted: whenever the bubble would sit over a link or button of the page, body gets
 * `lt-pk-wa-clear` and packsTidy.css hides the bubble (visibility, with a short fade) until it is clear again. Phones only
 * (< 768 px; the desktop bubble is in the corner). Nothing changes on any other page: the class is removed on unmount.
 */
export const WA_CLEAR_CLASS = "lt-pk-wa-clear";
export const WA_FAB_SELECTOR = '[data-testid="whatsapp-fab"]';
export const WA_TARGET_SELECTOR = "main a[href], main button, main summary, main select, main input, footer a[href]";

export interface BoxLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Strict overlap with a small margin so a bubble that only touches a neighbour's edge does not count. */
export function boxesOverlap(a: BoxLike, b: BoxLike, margin = 2): boolean {
  return a.left < b.right - margin && a.right > b.left + margin && a.top < b.bottom - margin && a.bottom > b.top + margin;
}

export function bubbleOverlapsAnyTarget(fab: BoxLike, targets: readonly BoxLike[]): boolean {
  return targets.some((t) => boxesOverlap(fab, t));
}

export function isPacksMobileLayoutDisabled(): boolean {
  return String(import.meta.env.VITE_PACKS_MOBILE_PRELOAD_DISABLED ?? "").trim() === "1";
}

/** Start watching; returns the stop function (which also removes the class). */
export function watchWhatsAppBubble(win: Window = window, doc: Document = document): () => void {
  if (isPacksMobileLayoutDisabled()) return () => undefined;
  let frame = 0;
  const check = () => {
    frame = 0;
    const fab = doc.querySelector(WA_FAB_SELECTOR);
    let clear = false;
    if (fab && win.innerWidth < 768) {
      const fr = fab.getBoundingClientRect();
      if (fr.width > 0) {
        const boxes: BoxLike[] = [];
        doc.querySelectorAll(WA_TARGET_SELECTOR).forEach((el) => {
          if (el === fab || el.closest(".lt-stickybar")) return;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && r.bottom > fr.top && r.top < fr.bottom) boxes.push(r);
        });
        clear = bubbleOverlapsAnyTarget(fr, boxes);
      }
    }
    doc.body.classList.toggle(WA_CLEAR_CLASS, clear);
  };
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(check);
  };
  schedule();
  // The bubble mounts and the static buttons are swapped for the app's after load: re-check as the tree settles.
  const timers = [300, 1000, 2500, 5000].map((ms) => win.setTimeout(schedule, ms));
  const mo = typeof MutationObserver === "function" ? new MutationObserver(schedule) : null;
  mo?.observe(doc.body, { childList: true, subtree: true });
  win.addEventListener("scroll", schedule, { passive: true });
  win.addEventListener("resize", schedule);
  return () => {
    if (frame) win.cancelAnimationFrame(frame);
    timers.forEach((t) => win.clearTimeout(t));
    mo?.disconnect();
    win.removeEventListener("scroll", schedule);
    win.removeEventListener("resize", schedule);
    doc.body.classList.remove(WA_CLEAR_CLASS);
  };
}
