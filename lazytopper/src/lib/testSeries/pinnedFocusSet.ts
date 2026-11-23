/**
 * TS-THEMES-1 - a FOCUS SET built from its PINNED question ids (focusSetIds.json), exactly as a series Full-Length Test is built
 * (buildPinnedFullMock: same resolver - the Full Mock union pool, then the served canonical rows, then the raw bank for a withheld
 * row; an id found nowhere is LEFT OUT and reported, never swapped). LAZY-ONLY: FullMockPage dynamic-imports this module only when
 * the URL carries `?focus=<code>`, so neither the entry chunk nor an ordinary mock loads the pins.
 *
 * There is no seeded fallback: a focus set exists ONLY as its pinned paper (like the TS-MORE-1 papers), so VITE_TS_PIN_DISABLED
 * does not apply. No spec / nothing resolvable -> null (the page then opens the ordinary fresh mock, never a blank page).
 */
import type { DrawnFullMock } from "../../components/fullmock/fullMockBlueprint";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import focusIds from "./focusSetIds.json";
import { isUsableSpec, type PinnedResult } from "./pinnedSpec";
import { buildPinnedFullMock, unservedMockIds, type PinnedMockIdentity } from "./pinnedFullMock";
import { loadRawBankRowsById } from "./rawBankRows";
import { focusSetKey, focusSetMinutes, type FocusSet } from "./focusSets";
import type { SeriesPinnedSpec } from "./paperManifest";

export interface FocusSetSpec extends SeriesPinnedSpec {
  /** Total marks of the set (the sum of its rows' marks; the guard pins it). */
  marks: number;
  /** The sitting's time limit in minutes (focusSetMinutes(marks); the guard pins it). */
  minutes: number;
}
export type FocusSetIds = Record<string, FocusSetSpec>;

const ALL = focusIds as unknown as FocusSetIds;

export function allFocusSetSpecs(): FocusSetIds {
  return ALL;
}

export function focusSetSpecOf(code: string): FocusSetSpec | null {
  const spec = ALL[focusSetKey(code)];
  return isUsableSpec(spec) && Number.isFinite(spec.marks) && spec.marks > 0 ? spec : null;
}

/** A focus set's sitting: the drawn paper, its time limit, and any pinned id that could not be found (left out). */
export interface BuiltFocusSet extends PinnedResult<DrawnFullMock> {
  durationMs: number;
}

/** Build from a spec (tests + the page's entry). `rawRows` = the raw-bank rows of ids the served bank no longer serves. */
export function buildFocusSetFromSpec(
  set: Pick<FocusSet, "subject">,
  spec: FocusSetSpec,
  identity: PinnedMockIdentity,
  rawRows: ReadonlyMap<string, CanonicalQuestion> = new Map(),
): BuiltFocusSet {
  const built = buildPinnedFullMock(set.subject, spec, identity, rawRows);
  const n = built.drawn.paper.questions.length;
  return {
    drawn: {
      ...built.drawn,
      paper: { ...built.drawn.paper, sectionFilter: "B-E" },
      // A focus set is short by design: "enough" means every pinned question resolved (one left out still sits, as the series papers do).
      enoughQuestions: n > 0,
      // The full paper's unit / CBQ targets do not apply to a one-type set (the page does not show them).
      unitMarksExact: false,
    },
    missingIds: built.missingIds,
    // The time follows the marks the student actually gets (a left-out question takes its minutes with it).
    durationMs: focusSetMinutes(built.drawn.totalMarks) * 60 * 1000,
  };
}

/** The page's entry: the subject's bank must already be loaded (useBankSubject). Null when the set cannot be built. */
export async function buildFocusSet(set: FocusSet, identity: PinnedMockIdentity): Promise<BuiltFocusSet | null> {
  const spec = focusSetSpecOf(set.code);
  if (!spec) return null;
  const unserved = unservedMockIds(spec, set.subject);
  const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map<string, CanonicalQuestion>();
  const built = buildFocusSetFromSpec(set, spec, identity, raw);
  return built.drawn.paper.questions.length > 0 ? built : null;
}
