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
 * LAYOUT (#1302 mobile review, owner ruling 23 Oct 18:31) — the explainer and the greyed-chip line
 * open IN FLOW (they push the chips down, never overlay a chip or the Build button on a 360x640
 * phone), and only after the student's own tap; the chunk is preloaded when the filter panel mounts
 * so the open lands at once. The empty-state Ziggy's row is reserved at its final height on the
 * first render (who sees him is known synchronously), so nothing moves when the chunk arrives.
 */
import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { guidePreviewActive, resolveGuideVariant, trackGuideEvent } from "../guideVariant";
import { APPEARANCE_PRIORITY, NoteShown, newOccurrence, releaseAppearance, requestAppearance } from "../mascotBudget";
import { mascotsHidden, useMascotsHidden } from "../mascotsMute";
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

/** Warm the chunk (the filter panel calls this on mount). A failed load is ignored here. */
export function preloadFilterHelp(): void {
  load().catch(() => {});
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
/** The budget key of this load's automatic first-visit open (null: none was granted). */
let autoKey: string | null = null;

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
  // "Seen" is checked BEFORE anything is reserved: a device that has seen the help never takes a slot.
  try {
    if (window.localStorage.getItem(FILTER_HELP_SEEN_KEY) === "1") {
      seenThisLoad = true;
      return false;
    }
  } catch {
    /* blocked storage: this page load only */
  }
  // Hidden mascots: the budget limits the CHARACTER, not the information - the plain explainer still
  // opens on the first visit, as it always did. Nothing is reserved (a hidden mascot counts nothing).
  if (!mascotsHidden()) {
    // MOMENTS-3: NOT exempt from the session budget. Refused -> it stays closed (the marker unspent,
    // so it is offered again on a later visit) until the student taps "?".
    const key = `filter-help#${newOccurrence()}`;
    if (!requestAppearance(key, APPEARANCE_PRIORITY.explainer)) return false;
    autoKey = key;
  }
  seenThisLoad = true;
  try {
    window.localStorage.setItem(FILTER_HELP_SEEN_KEY, "1");
  } catch {
    /* blocked storage: this page load only */
  }
  return true;
}

export function __resetFilterHelpForTests(): void {
  seenThisLoad = false;
  autoKey = null;
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
 * The explainer / greyed-chip line, in flow (a full line of its host row; see filterHelpEager.css).
 * The host mounts it only while open. A failed chunk load renders nothing.
 */
export function FilterHelpDoor({ uid, ...rest }: FilterHelpDoorProps) {
  const withCharacter = useFilterGuideCharacter(uid);
  // A reservation whose drawing never came (the door closed first) gives its slot back.
  useEffect(() => {
    const k = autoKey;
    return () => {
      if (k) releaseAppearance(k);
    };
  }, []);
  return (
    <div className="lt-fh-anchor">
      <Suspense fallback={null}>
        <LazyPanel {...rest} withCharacter={withCharacter} />
        {withCharacter && autoKey ? <NoteShown kind={autoKey} /> : null}
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
