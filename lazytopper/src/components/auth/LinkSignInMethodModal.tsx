import { lazySheet } from "../../lib/lazySheet";
import type { LinkSignInMethodModalProps } from "./LinkSignInMethodModalSheet";

/**
 * LinkSignInMethodModal — the slot (PERF-TRIM-1). Same default export, props and call sites as
 * before; the modal's body (phone / email linking, LinkEmailPanel) lives in
 * LinkSignInMethodModalSheet.tsx and is fetched on first open, so it stays out of the entry
 * chunk (PERF-3 budget). Closed, the sheet rendered nothing and its only effect reset its own
 * form state; unmounting it on close resets that state the same way. Type-only import above:
 * the sheet is never statically imported.
 */
const LinkSignInMethodModalSheet = lazySheet(() => import("./LinkSignInMethodModalSheet"));

export type { LinkSignInMethodModalProps };

export default function LinkSignInMethodModal(props: LinkSignInMethodModalProps) {
  if (!props.open) return null;
  return <LinkSignInMethodModalSheet {...props} onFailed={props.onClose} />;
}
