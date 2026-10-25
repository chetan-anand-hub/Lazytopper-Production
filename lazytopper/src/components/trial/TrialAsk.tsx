import { lazy, Suspense, type ComponentType } from "react";
import { importWithRetry } from "../../lib/lazyWithRetry";

/**
 * TrialAsk - ASK-FIX-1. The ONE mount for the trial-ended screen and the day-4 countdown bar
 * (ux/TrialBanner on phones, DesktopShell on desktop). PERF-3: the screen, the bar and the Board
 * Pass quote are a LAZY chunk; this file is all the entry carries. A failed chunk load renders
 * nothing (the asks are additive - the page never breaks for them).
 */
const TrialAskInner = lazy(() =>
  importWithRetry<{ default: ComponentType }>(() => import("./TrialAskInner")).catch(() => ({ default: () => null })),
);

export default function TrialAsk() {
  return (
    <Suspense fallback={null}>
      <TrialAskInner />
    </Suspense>
  );
}
