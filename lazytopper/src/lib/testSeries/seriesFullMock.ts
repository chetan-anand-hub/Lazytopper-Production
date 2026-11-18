/**
 * TEST-SERIES-1 — series Full-Length Test #n. #1–8 are the SAME papers as PDF Mocks #1–8; #9+ continue the same seed scheme.
 * LAZY-ONLY: FullMockPage dynamic-imports this module only when the URL carries `?paper=<n>`, so the ordinary fresh mock never loads
 * the pack code.
 *
 * Paper n of the pack draw depends on the question ids of papers 1..n-1 (each paper steers clear of the ones before it). Those ids
 * are committed in seriesMockIds.generated.json (kept fresh by paperManifest.guard.test.ts), so paper n is drawn ALONE with
 * `drawPackMockAfter` — the very draw `drawPackMocks` runs — instead of drawing every paper before it on the student's phone.
 * Only the sitting's identity (worksheet id, code, name, created-at) is replaced. The subject bank must already be loaded.
 */
import { drawPackMockAfter } from "../packs/buildPackFiles";
import type { DrawnFullMock } from "../../components/fullmock/fullMockBlueprint";
import type { SeriesSubject } from "./testSeries";
import mockIds from "./seriesMockIds.generated.json";

export function drawSeriesFullMock(
  subject: SeriesSubject,
  n: number,
  identity: { worksheetId: string; code: string; name: string; createdAt?: string },
): DrawnFullMock | null {
  const packSubject = subject === "Maths" ? "maths" : "science";
  const known = (mockIds as Record<string, Array<string[] | null>>)[packSubject] ?? [];
  if (n < 1 || n > known.length || !known[n - 1]) return null;
  const usedBefore = known.slice(0, n - 1).flatMap((ids) => (ids ? [new Set(ids)] : []));
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
