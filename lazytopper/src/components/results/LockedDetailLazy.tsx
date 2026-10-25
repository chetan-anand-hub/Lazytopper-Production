/**
 * LockedDetailLazy — LIMITS-1 PR-2: the lazy door to <LockedDetail>, for host pages that show
 * per-question detail in their own body (outside the scorecard). The card is its own chunk
 * (PERF-3 entry budget); it loads only when a lock actually shows.
 */
import { lazy, Suspense } from "react";

const LockedDetail = lazy(() => import("./LockedDetail"));

export default function LockedDetailLazy({ scoreLine }: { scoreLine: string }) {
  return (
    <Suspense fallback={null}>
      <LockedDetail scoreLine={scoreLine} />
    </Suspense>
  );
}
