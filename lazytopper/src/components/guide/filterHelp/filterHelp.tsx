/**
 * GUIDE-FILTER-1 — Byte explains the Quick Practice filters; Ziggy on a filter combination that
 * matches nothing (owner ruling, 22 Oct 2026). THIS FILE IS THE EAGER HALF: who sees the character,
 * the once-per-device auto-open, and the lazy door. Every line, the drawing and the CSS live in
 * ./filterHelpChunk.tsx (its own `filterHelpChunk-<hash>.js`), fetched only when a panel opens or
 * the empty-state Ziggy is about to show.
 *
 * WHO SEES WHAT
 *   The "?" and its words — EVERY student. The filters must always be explained.
 *   Byte beside those words — every student since GUIDE-ALL-1 ended the A/B (22 Oct 2026:
 *     `resolveGuideVariant` is "guide" unless the admin preview's "Show control" forces the plain
 *     experience), and only while the mascots are not hidden ("Hide mascots", ../mascotsMute.ts).
 *     Otherwise the same words render as plain text, with no guide events.
 *   Ziggy beside the filters-empty state — same rule; the host renders the slot ONLY when a
 *     committed filter combination returned 0.
 *   prefers-reduced-motion → the characters are drawn still.
 *
 * AUTO-OPEN — once per DEVICE, the first time the filter panel is shown:
 *   localStorage `lazytopper.filterHelpSeen` = "1" (a device flag; never the uid, never sent).
 *   Under an admin preview it opens every time and nothing is read or written (PREVIEW-1's rule).
 *   Blocked storage → once per page load.
 *
 * NO LAYOUT SHIFT — the panel is absolutely positioned from a zero-height anchor; the empty-state
 * Ziggy's row is reserved at its final height on the first render (the arm is known synchronously).
 */
import { lazy, Suspense, type ComponentType } from "react";
import { guidePreviewActive, resolveGuideVariant, trackGuideEvent } from "../guideVariant";
import { useMascotsHidden } from "../mascotsMute";
import type { FilterGroup } from "./filterHelpTypes";
import type { FilterHelpPanelProps } from "./filterHelpChunk";
import "./filterHelpEager.css";

export type { FilterGroup };

type Chunk = typeof import("./filterHelpChunk");
const load = (): Promise<Chunk> => import("./filterHelpChunk");

function lazyPart<P extends object>(pick: (m: Chunk) => ComponentType<P>) {
  const Nothing: ComponentType<P> = () => null;
  return lazy(() => load().then((m) => ({ default: pick(m) }), () => ({ default: Nothing })));
}

const LazyPanel = lazyPart((m) => m.FilterHelpPanel);
const LazyEmptyLine = lazyPart((m) => m.FilterEmptyLine);

/* ── who sees the character ──────────────────────────────────────────────────────────────── */

/** Byte / Ziggy are drawn: the account resolves to "guide" (everyone since GUIDE-ALL-1, unless the
 *  admin preview forces the plain experience) and the mascots are not hidden. */
export function useFilterGuideCharacter(uid: string | null | undefined): boolean {
  const hidden = useMascotsHidden();
  return !hidden && resolveGuideVariant(uid) === "guide";
}

/* ── once per device ─────────────────────────────────────────────────────────────────────── */

export const FILTER_HELP_SEEN_KEY = "lazytopper.filterHelpSeen";
let seenThisLoad = false;

/**
 * TEST MODE (the guideVariant.ts precedent): under Vitest the auto-open is OFF unless a test turns it
 * on, so the many existing suites that render the filter panel keep pinning today's screen.
 * Production and preview builds are never in test mode.
 */
let autoOpenForTests: boolean | null = null;
export function __setFilterHelpAutoOpenForTests(on: boolean | null): void {
  autoOpenForTests = on;
}
function autoOpenActive(): boolean {
  if (autoOpenForTests !== null) return autoOpenForTests;
  return import.meta.env.MODE !== "test";
}

/**
 * True exactly once per device (the first filter panel ever shown here): the caller auto-opens the
 * explainer. Under an admin preview: true every time, no marker read or written.
 */
export function claimFilterHelpAutoOpen(): boolean {
  if (!autoOpenActive()) return false;
  if (guidePreviewActive()) return true;
  if (seenThisLoad) return false;
  seenThisLoad = true;
  try {
    if (window.localStorage.getItem(FILTER_HELP_SEEN_KEY) === "1") return false;
    window.localStorage.setItem(FILTER_HELP_SEEN_KEY, "1");
  } catch {
    /* blocked storage: this page load only */
  }
  return true;
}

export function __resetFilterHelpForTests(): void {
  seenThisLoad = false;
}

/** The "?" was tapped (only when the account resolves to "guide", like every guide event; dropped
 *  under the admin preview). */
export function noteFilterHelpClick(uid: string | null | undefined): void {
  if (resolveGuideVariant(uid) === "guide") trackGuideEvent("guide_moment_click", { moment: "filter_help" });
}

/** "Edit filters" tapped on the filters-empty state while Ziggy was showing. */
export function noteFilterEmptyClick(): void {
  trackGuideEvent("guide_moment_click", { moment: "filter_empty" });
}

/* ── the slots a page renders ────────────────────────────────────────────────────────────── */

export type FilterHelpDoorProps = Omit<FilterHelpPanelProps, "withCharacter"> & { uid: string | null | undefined };

/**
 * The explainer / greyed-chip line, from a zero-height anchor (absolutely positioned: no shift).
 * The host mounts it only while open. A failed chunk load renders nothing.
 */
export function FilterHelpDoor({ uid, ...rest }: FilterHelpDoorProps) {
  const withCharacter = useFilterGuideCharacter(uid);
  return (
    <div className="lt-fh-anchor">
      <Suspense fallback={null}>
        <LazyPanel {...rest} withCharacter={withCharacter} />
      </Suspense>
    </div>
  );
}

/**
 * Ziggy beside the filters-empty state. Renders nothing when the plain experience is forced
 * (admin preview "Show control") or the mascots are hidden;
 * otherwise reserves its row at the final height and the chunk draws into it.
 */
export function FilterEmptyZiggy({ uid }: { uid: string | null | undefined }) {
  const show = useFilterGuideCharacter(uid);
  if (!show) return null;
  return (
    <div className="lt-fe-slot" data-testid="filter-empty-ziggy-slot">
      <Suspense fallback={null}>
        <LazyEmptyLine />
      </Suspense>
    </div>
  );
}
