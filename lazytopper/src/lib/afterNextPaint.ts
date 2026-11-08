// src/lib/afterNextPaint.ts
//
// SPEED-HUB-3 (8 Nov 2026) — run an action AFTER the browser has painted the frame that
// follows a tap, so the tap's own frame (its feedback) is not held up by the action.
//
// Why: Interaction to Next Paint (INP) is the time from a tap to the next frame the student
// sees. A tap whose handler navigates to a page whose chunk is already loaded (hub -> Quick
// Practice -> back -> Quick Practice again) rendered that whole page synchronously INSIDE the
// tap: 144-248 ms INP in the lab at 4x CPU on /practice-hub. Deferring the navigation past the
// next paint drops the tap's INP to <16-24 ms.
//
// ⚠ HONEST COST: the action is NOT faster — it runs later. The destination page still does the
// same render work, now after an extra frame of the CURRENT page, so it ARRIVES later (reviewer
// lab, 360px 4x CPU, n=5: Quick Practice median 174 -> 218 ms, Important Questions 226 -> 278 ms).
// Use this only when the tap's own frame shows real feedback (e.g. a pressed state), and keep
// the deferred work cancellable (see useNavigateAfterPaint).
//
// API:
//   const cancel = afterNextPaint(action);   // schedule
//   cancel();                                // drop it if it has not run yet (idempotent)
//
// Mechanics: requestAnimationFrame fires just before the next paint; a task posted from it
// (MessageChannel — not setTimeout, whose timers rank below other tasks) runs right after that
// paint. rAF does not fire in a hidden tab and can be late, so a timeout fallback guarantees
// the action still runs; a `done` flag makes it run at most once.

const FALLBACK_MS = 100;

function postTask(fn: () => void): void {
  if (typeof MessageChannel === "function") {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => {
      ch.port1.close();
      fn();
    };
    ch.port2.postMessage(null);
    return;
  }
  setTimeout(fn, 0);
}

export function afterNextPaint(action: () => void): () => void {
  let done = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const once = () => {
    if (done) return;
    done = true;
    if (fallback !== undefined) clearTimeout(fallback);
    action();
  };
  const cancel = () => {
    done = true;
    if (fallback !== undefined) clearTimeout(fallback);
  };
  const raf =
    typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : null;
  const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
  if (!raf || hidden) {
    fallback = setTimeout(once, 0);
    return cancel;
  }
  raf(() => postTask(once));
  fallback = setTimeout(once, FALLBACK_MS);
  return cancel;
}
