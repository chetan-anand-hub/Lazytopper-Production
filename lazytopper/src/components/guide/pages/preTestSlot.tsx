/**
 * GUIDE-PAGES-1 — the RESERVED mount point for an optional pre-test "breathe" moment, beside the
 * Chapter Test and Full Mock start buttons. COMPANION-1 owns what goes here; this lane does NOT build it.
 *
 * Today it renders NOTHING (no node, no space, no chunk), so the start row is byte-for-byte unchanged.
 * COMPANION-1 fills it by passing its component to `registerPreTestMoment` from its own module (or by
 * replacing the body of `PreTestSlot`), without touching ChapterTestPage / FullMockPage again.
 *
 * Contract for the filler: display only — never start, block, delay or change a test, a timer, a
 * grade or a fair-use decision; respect "Hide mascots", reduced motion and the guide arm, like every
 * moment in ../moments.
 */
import type { ComponentType } from "react";

export type PreTestSurface = "chapter_test" | "full_mock";

export interface PreTestMomentProps {
  surface: PreTestSurface;
}

let registered: ComponentType<PreTestMomentProps> | null = null;

/** COMPANION-1's hook-in. `null` empties the slot again. */
export function registerPreTestMoment(c: ComponentType<PreTestMomentProps> | null): void {
  registered = c;
}

export function PreTestSlot({ surface }: PreTestMomentProps) {
  const Moment = registered;
  return Moment ? <Moment surface={surface} /> : null;
}
