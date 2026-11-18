/**
 * PaidCrossSellLazy - PAID-XSELL-1. The pop-up's own lazy door to PaidCrossSell: its chunk (and the owned-pack read) loads only
 * once the "Payment received" pop-up is open. A chunk that fails to load draws nothing - the confirmation never depends on it.
 */
import { Component, lazy, Suspense, type ReactNode } from "react";
import type { PaidCrossSellProps } from "./PaidCrossSell";

const PaidCrossSell = lazy(() => import("./PaidCrossSell"));

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Kill switch: VITE_PAID_XSELL_DISABLED=1 -> no suggestions, and the chunk is never imported (read like VITE_PAID_SHEET_DISABLED). */
export function paidCrossSellEnabled(): boolean {
  try {
    return !/^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_PAID_XSELL_DISABLED ?? "").trim());
  } catch {
    return true;
  }
}

export default function PaidCrossSellLazy(props: PaidCrossSellProps) {
  if (!paidCrossSellEnabled() || !props.bought) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <PaidCrossSell {...props} />
      </Suspense>
    </Quiet>
  );
}
