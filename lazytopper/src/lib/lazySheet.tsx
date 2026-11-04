/**
 * PERF-TRIM-1 — a lazily loaded sheet (modal body) behind a tiny slot, so the sheet and its
 * imports stay out of the entry chunk (PERF-3 budget). Same recipe as SettingsModalSlot:
 *   - the chunk loads through `lazyWithRetry` (CHUNK-RESILIENCE-1: retries a transient miss);
 *   - a small boundary with a null fallback catches a failed load, so it never reaches the
 *     global ErrorBoundary; it calls `onFailed` (the slot passes its `onClose`) so the caller's
 *     "open" state does not stick;
 *   - the lazy component is REBUILT after a failure, because React.lazy caches a rejection for
 *     good — without that a second tap would replay the first failure instead of trying again.
 * Slots render the sheet only while it is open, so nothing is fetched until first open.
 */
import { Component, Suspense, type ComponentType, type ReactNode } from "react";
import { lazyWithRetry } from "./lazyWithRetry";

class LazySheetBoundary extends Component<
  { onFailed: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    this.props.onFailed();
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own signature
export function lazySheet<P extends Record<string, any>>(
  factory: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P & { onFailed: () => void }> {
  let Lazy = lazyWithRetry(factory);
  function LazySheet({ onFailed, ...props }: P & { onFailed: () => void }) {
    const Sheet = Lazy;
    return (
      <LazySheetBoundary
        onFailed={() => {
          Lazy = lazyWithRetry(factory);
          onFailed();
        }}
      >
        <Suspense fallback={null}>
          <Sheet {...(props as unknown as P)} />
        </Suspense>
      </LazySheetBoundary>
    );
  }
  return LazySheet;
}
