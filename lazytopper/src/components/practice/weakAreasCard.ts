// src/components/practice/weakAreasCard.ts
//
// MI-HOME-SYNC (B) — the Quick Practice "My weak areas" card's pure state + copy. Kept in a .ts
// module (not QuickPracticePresets.tsx) so the component file exports components only
// (react-refresh/only-export-components).

/** The honest locked line ("Soon" is gone: the card is real, just not yet). True for both locked
 *  cases: no graded answers yet, and graded answers still below Me's weakness-naming gate. */
export const WEAK_AREAS_LOCKED_COPY = "Unlocks once a few answers are graded";

/**
 * The "My weak areas" card's state, decided by PracticePage from Me's concept rows for this
 * subject (services/meHomeSummary, Me's window and Me's weakness-naming gate):
 *   - hidden: signed out / local session — no saved graded work to target;
 *   - locked: signed in, no concept row Me would name yet (none with marks lost, or the paper is
 *             below Me's gate) — visible, not clickable;
 *   - live:   tapping opens Me's own concept-row Practise href for the TOP concept (the
 *             practice path's `focus` param carries ONE concept; the card says so).
 * Absent → "locked" (honest default; never "Soon").
 */
export type WeakAreasCard =
  | { kind: "hidden" }
  | { kind: "locked" }
  | { kind: "live"; href: string; concepts: Array<{ label: string; lost: number }> };

/** The card state from the auth state and Me's concept rows (worst first) for this subject. */
export function weakAreasCardFrom(
  signedIn: boolean,
  rows: ReadonlyArray<{ label: string; lost: number; practisePath: string }>,
): WeakAreasCard {
  if (!signedIn) return { kind: "hidden" };
  const top = rows[0];
  if (!top) return { kind: "locked" };
  return {
    kind: "live",
    href: top.practisePath,
    concepts: rows.slice(0, 3).map((r) => ({ label: r.label, lost: r.lost })),
  };
}
