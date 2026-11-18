/**
 * TEST-SERIES-1 — series Full Mock #n, the SAME paper as PDF Mock #n. LAZY-ONLY: FullMockPage dynamic-imports this module only
 * when the URL carries `?paper=<n>`, so the ordinary fresh mock never loads the pack code.
 *
 * It reuses the pack's own draw (`drawPackMocks`, seed `pack-paper:mock:<subject>:<n>`, each paper steering clear of the papers
 * before it), so the question ids are exactly the PDF's (pinned by seriesFullMock.test.ts). Only the sitting's identity (worksheet
 * id, code, name, created-at) is replaced; no question, mark or section is touched. The subject bank must already be loaded.
 */
import { drawPackMocks } from "../packs/buildPackFiles";
import type { DrawnFullMock } from "../../components/fullmock/fullMockBlueprint";
import type { SeriesSubject } from "./testSeries";

export function drawSeriesFullMock(
  subject: SeriesSubject,
  n: number,
  identity: { worksheetId: string; code: string; name: string; createdAt?: string },
): DrawnFullMock | null {
  const packSubject = subject === "Maths" ? "maths" : "science";
  const hit = drawPackMocks(packSubject, n).find((p) => p.n === n);
  if (!hit || !hit.drawn.enoughQuestions) return null;
  const drawn = hit.drawn;
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
