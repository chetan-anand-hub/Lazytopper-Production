/**
 * SettingsModalSlot (SETTINGS-1) — mounts the lazily loaded SettingsModal for BOTH avatar menus.
 *
 * The window is lazy so its weight (data controls, mascots, CSS) stays out of the entry chunk
 * (PERF-3). That makes its chunk fetch a failure point: a rejected import must NOT bubble to the
 * global ErrorBoundary ("Something went wrong" over the whole page). This slot:
 *   - loads through `lazyWithRetry` (CHUNK-RESILIENCE-1: retries a transient miss);
 *   - wraps the mount in a small boundary with a null fallback that calls `onFailed`, so the menu
 *     closes `settingsOpen` and stays usable;
 *   - REBUILDS the lazy component on failure, because React.lazy caches a rejection for good —
 *     without this a second tap would replay the first failure instead of trying again.
 * Type-only import below: the modal itself is never statically imported.
 */
import { Component, Suspense, type ReactNode } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import type { SettingsModalProps } from "./SettingsModal";

const load = () => lazyWithRetry(() => import("./SettingsModal"));
let LazySettingsModal = load();

class SettingsLoadBoundary extends Component<
  { onFailed: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    LazySettingsModal = load();
    this.props.onFailed();
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SettingsModalSlot(props: SettingsModalProps) {
  return (
    <SettingsLoadBoundary onFailed={props.onClose}>
      <Suspense fallback={null}>
        <LazySettingsModal {...props} />
      </Suspense>
    </SettingsLoadBoundary>
  );
}
