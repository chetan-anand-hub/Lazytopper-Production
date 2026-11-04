/**
 * BoardPassLockCard - LOCK-SELL-1. The visual centre of the full-page Premium lock: the Board Pass details (lazy, see
 * BoardPassLockDetails) above the lock's own actions (`children`: Pay / trial / QR / Ask a parent - unchanged components, rendered
 * immediately). While the details chunk loads the slot holds its place; if it cannot load, the card shows the actions alone.
 */
import { lazy, Suspense, type ReactNode } from "react";

import { importWithRetry } from "../../lib/lazyWithRetry";
import { LOCK_CARD_TITLE } from "./lockCopy";

type DetailsProps = { part?: "details" | "credential" };
const Nothing = (): null => null;
const BoardPassLockDetails = lazy(() =>
  importWithRetry<{ default: (props: DetailsProps) => ReactNode }>(() => import("./BoardPassLockDetails")).catch(() => ({ default: Nothing })),
);

/** The credential line under the card, from the same lazy chunk. */
export function LockCredential() {
  return (
    <Suspense fallback={null}>
      <BoardPassLockDetails part="credential" />
    </Suspense>
  );
}

export default function BoardPassLockCard({ children }: { children?: ReactNode }) {
  return (
    <section className="lt-lock__card" data-testid="lock-board-pass-card" aria-label={LOCK_CARD_TITLE}>
      <Suspense fallback={<div className="lt-lock__details-slot" />}>
        <BoardPassLockDetails />
      </Suspense>
      <div className="lt-lock__actions">{children}</div>
    </section>
  );
}
