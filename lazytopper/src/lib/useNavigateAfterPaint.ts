// src/lib/useNavigateAfterPaint.ts
//
// SPEED-HUB-3 — `navigate(to)` deferred past the tap's next paint (see afterNextPaint.ts for
// why, and for the honest cost: the destination arrives a little LATER, the tap paints sooner).
//
//   const navigateAfterPaint = useNavigateAfterPaint();
//   <button onClick={() => navigateAfterPaint("/practice/10/Maths?...")} />
//
// Guarantees (each pinned in useNavigateAfterPaint.test.tsx):
//   1. one push per gesture — a second call while one is pending is ignored (double tap);
//   2. never stale — a pending navigation is CANCELLED if the component unmounts, or if the
//      location changes (another navigation, Back) before it fires — judged by the router's
//      location AND the browser's (href + history key), because BrowserRouter commits location
//      changes in a transition that can still be pending when the deferred push fires;
//   3. the returned function is stable for a given `navigate`, so memoised children keep
//      their memo.

import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { afterNextPaint } from "./afterNextPaint";

/** href + history entry key: a push, replace, or Back/Forward to any entry changes it at once. */
function currentBrowserLocation(): string {
  if (typeof window === "undefined") return "";
  const state = window.history?.state as { key?: unknown } | null | undefined;
  return `${window.location.href}#${String(state?.key ?? "")}`;
}

export function useNavigateAfterPaint(): (to: string) => void {
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();
  const pendingRef = useRef<(() => void) | null>(null);

  const cancelPending = () => {
    pendingRef.current?.();
    pendingRef.current = null;
  };

  // Location changed (or the component unmounted) before the deferred push fired: drop it.
  useEffect(() => cancelPending, [locationKey]);

  return useCallback(
    (to: string) => {
      if (pendingRef.current) return;
      // ★ B1 (#1632 delta review): with BrowserRouter, React Router 7 applies a history change
      // inside React.startTransition. The URL changes at once, but useLocation() — and this
      // component's unmount — only update when that transition COMMITS. If another navigation
      // (a bottom-nav tap, Back) is still rendering or loading its route chunk when our deferred
      // push fires, the effect cleanup above has not run yet. So also compare the browser's own
      // location: if it moved since the tap, the push is stale and is dropped.
      const at = currentBrowserLocation();
      let fired = false;
      const cancel = afterNextPaint(() => {
        fired = true;
        pendingRef.current = null;
        if (currentBrowserLocation() !== at) return;
        navigate(to);
      });
      if (!fired) pendingRef.current = cancel;
    },
    [navigate],
  );
}
