// src/lib/afterNextPaint.ts
//
// SPEED-HUB-3 (8 Nov 2026) — run an action AFTER the browser has painted the frame that
// follows a tap.
//
// Why: Interaction to Next Paint (INP) is the time from a tap to the next frame the student
// sees. A tap whose handler navigates to a page whose chunk is already loaded (a student who
// went hub -> Quick Practice -> back -> Quick Practice again) rendered that whole page
// synchronously INSIDE the tap, so the frame after the tap waited for it: 256-608 ms in the
// lab at 4x CPU on /practice-hub. Deferring the navigation by one frame lets the tap paint
// first; the destination then renders in its own task, exactly as before (same route, same
// URL, same state) — the work is not removed, it just no longer blocks the tap's feedback.
//
// requestAnimationFrame fires just before the next paint, and a task queued from it runs
// after that paint. rAF does not fire in a hidden tab (and may be delayed), so a timeout
// fallback guarantees the action still runs; `once` makes sure it runs exactly one time.

const FALLBACK_MS = 100;

export function afterNextPaint(action: () => void): void {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    action();
  };
  const raf =
    typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : null;
  const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
  if (!raf || hidden) {
    setTimeout(once, 0);
    return;
  }
  raf(() => {
    setTimeout(once, 0);
  });
  setTimeout(once, FALLBACK_MS);
}
