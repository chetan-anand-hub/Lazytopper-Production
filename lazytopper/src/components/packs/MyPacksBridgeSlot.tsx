/**
 * MyPacksBridgeSlot - BRIDGE-PANEL-1. The light door PacksShop renders for the "Get your papers marked" panel: the panel itself is
 * its own lazy chunk (warmed by `warmMyPacksBridge` as soon as an account is known), and ANY failure in it - a chunk that cannot
 * load, a read that throws - renders nothing, so My packs and its downloads are never taken down by the panel.
 */
import { Component, Suspense, type ReactNode } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import type { MyPacksBridgeProps } from "./MyPacksBridge";

const load = () => import("./MyPacksBridge");
const MyPacksBridge = lazyWithRetry(load);

/** Start fetching the panel's chunk (no render). Never throws. */
export function warmMyPacksBridge(): void {
  void load().catch(() => undefined);
}

class BridgeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MyPacksBridgeSlot(props: MyPacksBridgeProps) {
  return (
    <BridgeBoundary>
      <Suspense fallback={null}>
        <MyPacksBridge {...props} />
      </Suspense>
    </BridgeBoundary>
  );
}
