/**
 * PaidSheetLazy - PAID-SHEET-1. The only thing a host imports: the kill switch and ONE lazy wrapper, so the sheet and its CSS
 * live in their own chunk and load only after a confirmed paid outcome. Never on first paint.
 */
import { lazy, Suspense } from "react";
import { Quiet } from "../signinLink/Quiet";
import type { PaidSheetProps } from "./PaidSheet";

const PaidSheet = lazy(() => import("./PaidSheet"));

/** VITE_PAID_SHEET_DISABLED=1 -> today's inline paid behaviour, exactly. */
export function paidSheetEnabled(): boolean {
  try {
    return !/^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_PAID_SHEET_DISABLED ?? "").trim());
  } catch {
    return true;
  }
}

export default function PaidSheetLazy(props: PaidSheetProps) {
  return (
    <Quiet>
      <Suspense fallback={null}>
        <PaidSheet {...props} />
      </Suspense>
    </Quiet>
  );
}
