/**
 * MOMENTS-3 - the Diwali window and the festival props. Its OWN module on purpose (PERF-3): only the
 * lazy drawing chunks (companionChunk, guideChunk) import it, so it never rides in the entry chunk.
 * rigProps.ts is drawing data and is imported TYPE-ONLY.
 */
import type { Prop } from "../rigProps";
import { DAY_MS, istDayIndex } from "./companionModel";

/** The festival props (same two ids as rigProps FESTIVAL_PROPS; a test pins that they match). */
const FESTIVAL_PROP_IDS: readonly Prop[] = ["diya", "rangoli"];

/**
 * Diwali 2026 falls on Sunday 8 November 2026 (Lakshmi Puja day). Sources read 24 Oct 2026:
 * https://haindavam.org/festivals/diwali/2026-11-08 · https://www.bankbazaar.com/indian-holiday/lakshmi-puja-holiday.html
 * The festival window is 5–10 Nov 2026 INCLUSIVE, by the Indian calendar day (IST).
 */
export const DIWALI_WINDOW = { startUtcDay: Date.UTC(2026, 10, 5), endUtcDay: Date.UTC(2026, 10, 10) } as const;

/** True when the IST day containing `now` is 5–10 Nov 2026. Pure: the caller supplies the clock. */
export function inFestivalWindow(now: number): boolean {
  const day = istDayIndex(now);
  return day >= Math.floor(DIWALI_WINDOW.startUtcDay / DAY_MS) && day <= Math.floor(DIWALI_WINDOW.endUtcDay / DAY_MS);
}

/** The props a character wears at `now`: the diya + rangoli in the window, otherwise NOTHING (undefined). */
export function festivalPropsAt(now: number): readonly Prop[] | undefined {
  return inFestivalWindow(now) ? FESTIVAL_PROP_IDS : undefined;
}

/**
 * Test seam (the same convention as the guide itself, the budget and the filter help's auto-open): the
 * clock read below is OFF under Vitest unless a suite switches it on, so the many scorecard suites that
 * render a character do not become clock-sensitive for a feature that only exists 5-10 Nov 2026.
 * Production and preview builds are never in test mode.
 */
let festivalForTests: boolean | null = null;
export function __setFestivalForTests(on: boolean | null): void {
  festivalForTests = on;
}

/** The ONE clock read for festival props in render paths (tests pin it with fake timers + the seam above). */
export function festivalPropsNow(): readonly Prop[] | undefined {
  if (!(festivalForTests ?? import.meta.env.MODE !== "test")) return undefined;
  return festivalPropsAt(Date.now());
}
