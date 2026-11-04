import { useLayoutEffect, useSyncExternalStore } from "react";

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

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

/** True while some mounted header owns the row. */
export function useShellOwnsNav(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => shellSlots > 0,
    () => false,
  );
}
