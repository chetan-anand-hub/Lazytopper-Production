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
//      location changes (another navigation, Back) before it fires;
//   3. the returned function is stable for a given `navigate`, so memoised children keep
//      their memo.

import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { afterNextPaint } from "./afterNextPaint";

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
      let fired = false;
      const cancel = afterNextPaint(() => {
        fired = true;
        pendingRef.current = null;
        navigate(to);
      });
      if (!fired) pendingRef.current = cancel;
    },
    [navigate],
  );
}
