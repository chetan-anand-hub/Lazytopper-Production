/**
 * PaidSheetLazy - PAID-SHEET-1. The only thing a host imports: the kill switch and ONE lazy wrapper, so the sheet and its CSS
 * live in their own chunk and load only after a confirmed paid outcome. Never on first paint.
 */
import { Component, lazy, Suspense, type ReactNode } from "react";
import type { PaidSheetProps } from "./PaidSheet";

/** "Receipt sent to <masked email>" - hosts pass it only when the account has an email (phone-only accounts show no line). Lives here so hosts never import the sheet itself. */
export const paidSheetReceiptLine = (maskedEmail: string): string => `Receipt sent to ${maskedEmail}`;

const loadSheet = () => import("./PaidSheet");
const PaidSheet = lazy(loadSheet);

/** Warm the chunk at the Pay tap (a user action, never first paint). A failure here is silent; the lazy render below handles it. */
export function preloadPaidSheet(): void {
  void loadSheet().catch(() => undefined);
}

/** A chunk that fails to load (a stale tab after a deploy) must not swallow the confirmation: tell the host, which falls back to the inline status + card. */
class SheetBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** VITE_PAID_SHEET_DISABLED=1 -> today's inline paid behaviour, exactly. */
export function paidSheetEnabled(): boolean {
  try {
    return !/^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_PAID_SHEET_DISABLED ?? "").trim());
  } catch {
    return true;
  }
}

export default function PaidSheetLazy({ onFail, ...props }: PaidSheetProps & { onFail: () => void }) {
  return (
    <SheetBoundary onFail={onFail}>
      <Suspense fallback={null}>
        <PaidSheet {...props} />
      </Suspense>
    </SheetBoundary>
  );
}
