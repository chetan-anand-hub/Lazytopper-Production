/**
 * TEST-SERIES-1 - series Full-Length Test #n. #1-8 are the SAME papers as PDF Mocks #1-8; #9+ continue the same seed scheme.
 * LAZY-ONLY: FullMockPage dynamic-imports this module only when the URL carries `?paper=<n>`, so the ordinary fresh mock never loads
 * the pack code.
 *
 * TS-PIN-1 (19 Nov 2026): `buildSeriesFullMock` is what the page calls. It builds the paper FROM ITS PINNED QUESTION IDS
 * (pinnedFullMock.ts), so a bank edit cannot move it. With VITE_TS_PIN_DISABLED set (or no pinned entry) it falls back to
 * `drawSeriesFullMock`, today's seeded draw, byte-identical.
 *
 * `drawSeriesFullMock` (the seeded draw): paper n of the pack draw depends on the question ids of papers 1..n-1 (each paper steers
 * clear of the ones before it). Those ids are the pinned papers' ids (seriesPaperIds.json), so paper n is drawn ALONE with
 * `drawPackMockAfter` - the very draw `drawPackMocks` runs. Only the sitting's identity is replaced. The subject bank must already be loaded.
 */
import { drawPackMockAfter } from "../packs/buildPackFiles";
import type { DrawnFullMock } from "../../components/fullmock/fullMockBlueprint";
import type { SeriesSubject } from "./testSeries";
import { allPinnedSpecs } from "./pinnedSpec";
import { buildSeriesFullMockPinned } from "./pinnedFullMock";

const mockKey = (subject: SeriesSubject, n: number) => `TS-FM-${subject === "Maths" ? "M" : "S"}${n}`;

export function drawSeriesFullMock(
  subject: SeriesSubject,
  n: number,
  identity: { worksheetId: string; code: string; name: string; createdAt?: string },
): DrawnFullMock | null {
  const packSubject = subject === "Maths" ? "maths" : "science";
  const specs = allPinnedSpecs();
  if (n < 1 || !specs[mockKey(subject, n)]) return null;
  const usedBefore: Array<Set<string>> = [];
  for (let k = 1; k < n; k += 1) {
    const prior = specs[mockKey(subject, k)];
    if (prior) usedBefore.push(new Set(prior.ids));
  }
  const { drawn } = drawPackMockAfter(packSubject, n, usedBefore);
  if (!drawn.enoughQuestions) return null;
  return {
    ...drawn,
    // The pack draw counts its OWN avoidance list (earlier papers) as "served"; this sitting has no student history.
    repeatCount: 0,
    hasServedHistory: false,
    servedShare: 0,
    repeatSections: 0,
    paper: {
      ...drawn.paper,
      worksheetId: identity.worksheetId,
      code: identity.code,
      name: identity.name,
      title: identity.name,
      createdAt: identity.createdAt ?? new Date().toISOString(),
    },
  };
}

/** The page's entry: the pinned paper (+ the ids it had to leave out), else today's seeded draw. Null when neither can be built. */
export async function buildSeriesFullMock(
  subject: SeriesSubject,
  n: number,
  identity: { worksheetId: string; code: string; name: string; createdAt?: string },
): Promise<{ drawn: DrawnFullMock; missingIds: string[] } | null> {
  const pinned = await buildSeriesFullMockPinned(subject, mockKey(subject, n), identity);
  if (pinned) return pinned;
  const seeded = drawSeriesFullMock(subject, n, identity);
  return seeded ? { drawn: seeded, missingIds: [] } : null;
}
