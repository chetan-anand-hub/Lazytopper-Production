/**
 * MI-CONSISTENCY-1 — the ONE Mistake Intelligence card's scope switch (Both / Maths / Science) and
 * its shared words. LIGHT on purpose (no read model, no Firestore): Home, phone Home and the
 * sidebar import it eagerly; the numbers come from the lazily loaded selector (./miCardSummary).
 *
 * The switch is a PER-VIEWER UI CONVENIENCE only: one string ("both" | "maths" | "science") in
 * this device's storage, read and written in try/catch, default "both". It never holds a mark, a
 * premium or trial flag, or anything another viewer, device or Claude must see. Every card on the
 * page listens to the same in-tab store, so Home and the sidebar always show the SAME scope.
 */
import { useSyncExternalStore } from "react";

export type MiScope = "both" | "maths" | "science";

export const MI_SCOPES: readonly MiScope[] = ["both", "maths", "science"];

export const MI_SCOPE_LABEL: Readonly<Record<MiScope, string>> = {
  both: "Both",
  maths: "Maths",
  science: "Science",
};

/** The window every figure on the card is computed over (Me's default window, a rolling 30 days). */
export const MI_WINDOW_PHRASE = "Last 30 days";

/** The device-storage key — the scope string and nothing else. */
export const MI_SCOPE_STORAGE_KEY = "lt.mi.scope.v1";

const isScope = (v: unknown): v is MiScope => v === "both" || v === "maths" || v === "science";

function readStored(): MiScope {
  try {
    const v = typeof window !== "undefined" ? window.localStorage.getItem(MI_SCOPE_STORAGE_KEY) : null;
    return isScope(v) ? v : "both";
  } catch {
    return "both";
  }
}

let current: MiScope | null = null;
const listeners = new Set<() => void>();

export function getMiScope(): MiScope {
  if (current === null) current = readStored();
  return current;
}

export function setMiScope(scope: MiScope): void {
  if (!isScope(scope)) return;
  current = scope;
  try {
    window.localStorage.setItem(MI_SCOPE_STORAGE_KEY, scope);
  } catch {
    /* storage unavailable: the choice lives for this tab only */
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam: forget the in-memory scope (the next read goes back to storage). */
export function resetMiScopeForTests(): void {
  current = null;
}

/** The shared scope and its setter — every card on the page sees the same value. */
export function useMiScope(): [MiScope, (s: MiScope) => void] {
  const scope = useSyncExternalStore(subscribe, getMiScope, () => "both" as MiScope);
  return [scope, setMiScope];
}

/** "12.5 marks" / "1 mark" — the card's ONE number format (whole numbers bare, else one decimal). */
export function marksText(n: number): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${v} ${n === 1 ? "mark" : "marks"}`;
}

/** The bare figure, as printed on a tile. */
export function marksFigure(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
