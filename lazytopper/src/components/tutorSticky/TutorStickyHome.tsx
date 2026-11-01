import { lazy, Suspense } from "react";

/**
 * TUTOR-STICKY-1 — the two Home cards as separate lazy chunks, so Home's own bundle carries neither the
 * Mistake Intelligence read model (the daily-fix picks) nor the tutor store (the trial summary). Each card
 * renders nothing until it has real data, so the Suspense fallback is null too.
 */
const DailyFixCard = lazy(() => import("./DailyFixCard"));
const TrialTutorSummary = lazy(() => import("./TrialTutorSummary"));

export function DailyFixHome({ gen = 0, spaced = false }: { gen?: number; spaced?: boolean }) {
  return (
    <Suspense fallback={null}>
      <DailyFixCard surface="home" gen={gen} spaced={spaced} />
    </Suspense>
  );
}

export function TrialTutorSummaryHome() {
  return (
    <Suspense fallback={null}>
      <TrialTutorSummary surface="home" />
    </Suspense>
  );
}
