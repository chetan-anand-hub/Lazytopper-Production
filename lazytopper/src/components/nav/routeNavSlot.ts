import { useLayoutEffect, useState } from "react";

/**
 * NAV-1 - ONE Back/Home row per page. App.tsx mounts the row above the route content; a page that draws the shared
 * mobile header (MobileShell) mounts its own row BELOW that header instead, and while it is mounted the App-level row
 * steps aside. A tiny module store, read in the layout phase, so the swap happens before paint.
 */
let shellSlots = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Registers a header-owned row while `active` and the caller is mounted. */
export function useShellNavSlot(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return undefined;
    shellSlots += 1;
    emit();
    return () => {
      shellSlots -= 1;
      emit();
    };
  }, [active]);
}

/**
 * True while some mounted header owns the row.
 *
 * SPEED-SITE-1c — the listener is registered in the LAYOUT phase. It was `useSyncExternalStore`, which subscribes in
 * a passive effect: when App's row and a MobileShell mounted in the SAME commit (every first load of a mobile
 * self-chromed page: notes, topic hub, HPQ, exam trends…), the shell's layout-phase emit reached no listener, the
 * row noticed only after paint, and a 56-px empty row showed above the page for a frame and then vanished (CLS 0.068
 * in Lighthouse). App's row is an EARLIER sibling, so its layout effect runs before the shell's: subscribing there
 * means the shell's emit lands in the layout phase, and React re-renders before the browser paints.
 */
export function useShellOwnsNav(): boolean {
  const [owns, setOwns] = useState(() => shellSlots > 0);
  useLayoutEffect(() => {
    const listener = () => setOwns(shellSlots > 0);
    listeners.add(listener);
    listener(); // catch any change between render and this subscription
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return owns;
}

/** Tests only: how many rows are currently listening. */
export function __shellListenerCountForTests(): number {
  return listeners.size;
}
