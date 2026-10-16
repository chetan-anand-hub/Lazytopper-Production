// src/components/practice/weakAreasCard.ts
//
// MI-HOME-SYNC (B) — the Quick Practice "My weak areas" card's pure state + copy. Kept in a .ts
// module (not QuickPracticePresets.tsx) so the component file exports components only
// (react-refresh/only-export-components).

import {
  conceptSetPath,
  type ConceptSetContext,
  type ConceptSetRef,
} from "../../lib/desktop/conceptSetPath";
import type { DesktopSubject } from "../../lib/desktop/navigation";

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
  | {
      kind: "live";
      /** The render-time href (the honest whole-paper fallback when `open` is set). */
      href: string;
      concepts: Array<{ label: string; lost: number }>;
      /** WEAK-AREA-DIRECT: what the click resolves to the concept's EXACT set (conceptSetClick). */
      open?: { paper: DesktopSubject; concept: ConceptSetRef; ctx: ConceptSetContext };
    };

/** WEAK-AREA-DIRECT — where the card is: its paper and the practice page to come Back to. */
export interface WeakAreasCardHere {
  paper: DesktopSubject;
  returnTo: string;
}

/** The card state from the auth state and Me's concept rows (worst first) for this subject.
 *  With `here`, the href is Me's concept builder (`conceptSetPath`, the one Me's rows use) with
 *  Back returning to this practice page; without it, the row's own Me href. */
export function weakAreasCardFrom(
  signedIn: boolean,
  rows: ReadonlyArray<{ label: string; lost: number; chapter?: string; practisePath: string }>,
  here?: WeakAreasCardHere,
): WeakAreasCard {
  if (!signedIn) return { kind: "hidden" };
  const top = rows[0];
  if (!top) return { kind: "locked" };
  const concepts = rows.slice(0, 3).map((r) => ({ label: r.label, lost: r.lost }));
  if (!here) return { kind: "live", href: top.practisePath, concepts };
  const ctx: ConceptSetContext = { returnTo: here.returnTo };
  const concept: ConceptSetRef = { label: top.label, chapter: top.chapter };
  return {
    kind: "live",
    href: conceptSetPath(here.paper, concept, ctx),
    concepts,
    open: { paper: here.paper, concept, ctx },
  };
}
