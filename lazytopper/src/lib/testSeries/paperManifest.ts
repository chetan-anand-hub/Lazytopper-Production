/**
 * TEST-SERIES-1 — the Test Series PAPER MANIFEST (owner, 18 Nov 2026, 19:38 IST): every numbered paper's exact question ids, so the
 * server can accept Test Series checks ONLY for these papers and these questions.
 *
 * Committed at lazytopper/server/data/testSeriesPapers.json. Generated from the SAME draws the pages use:
 *   chapter  drawChapterTest({ fixedSeed: chapterTestSeriesSeed(topicKey) })   (ChapterTestPage with ?series=1)
 *   mock     drawPackMocks(subject, SERIES_MOCKS_PER_SUBJECT)[n]               (FullMockPage with ?paper=n via drawSeriesFullMock)
 * paperManifest.guard.test.ts regenerates it and fails when the committed file is stale (a bank edit that moves a paper).
 * Regenerate: `pnpm --filter lazytopper run gen:test-series-manifest`.
 *
 * How a grading request names its paper: the request's `worksheetId` (and the paper pass's `paperKey`, which is the same value)
 * STARTS WITH the entry's `worksheetIdPrefix` (`ct-ts1-<topicKey>--…` / `fm-ts1-<m|s><n>--…`).
 */
import { drawChapterTest, subjectiveQuestions } from "../../components/chaptertest/chapterTestBlueprint";
import { fullMockSubjectiveQuestions } from "../../components/fullmock/fullMockBlueprint";
import { drawPackMocks } from "../packs/buildPackFiles";
import { loadChapter, loadSubjectBank } from "../packs/packContent";
import {
  SERIES_MOCKS_PER_SUBJECT,
  chapterTestSeriesSeed,
  seriesChapterTests,
  seriesChapterWorksheetId,
  seriesFullMocks,
  seriesMockWorksheetId,
} from "./testSeries";

export interface SeriesPaperManifestEntry {
  /** "TS-CT-M01" … / "TS-FM-S8". */
  key: string;
  subject: "Maths" | "Science";
  kind: "chapter" | "mock";
  /** Chapter: 1..13 within the subject (syllabus order). Mock: n (= PDF Mock n). */
  number: number;
  /** The series code the page shows ("CT-M01", "FM-M3"). The paper's own record code is the student's (e.g. "FM-M-#04"). */
  paperCode: string;
  /** Chapter tests only: the board chapter key. */
  topicKey: string | null;
  /** A grading request's `worksheetId` / `paperKey` for this paper starts with this. */
  worksheetIdPrefix: string;
  /** Every question id on the paper, in paper order (qNumber 1..N). */
  questionIds: string[];
  /** The written questions (Sections B–E), the ones a check grades, in paper order. */
  sectionBEQuestionIds: string[];
}

const STAMP = "2026-01-01T00:00:00.000Z";

/** The worksheet-id prefix of a series paper: the minted-id rewrite applied to an empty tail. */
function prefixOf(rewritten: string): string {
  return rewritten.slice(0, rewritten.indexOf("--") + 2);
}

/** The client's copy: per subject, the question ids of mock papers 1..N (index n-1), so the page draws paper n ALONE (the earlier
 *  papers' ids are all `drawPackMockAfter` needs). Committed as seriesMockIds.generated.json; the same guard keeps it fresh. */
export type SeriesMockIds = Record<"maths" | "science", Array<string[] | null>>;

export async function buildSeriesPaperManifest(): Promise<{ entries: SeriesPaperManifestEntry[]; mockIds: SeriesMockIds }> {
  const out: SeriesPaperManifestEntry[] = [];
  const mockIds: SeriesMockIds = { maths: [], science: [] };
  for (const t of seriesChapterTests()) {
    await loadChapter(t.topicKey);
    const drawn = drawChapterTest({
      subject: t.subject,
      topicKey: t.topicKey,
      topicLabel: t.label,
      worksheetId: `manifest-${t.code}`,
      createdAt: STAMP,
      fixedSeed: chapterTestSeriesSeed(t.topicKey),
    });
    out.push({
      key: `TS-${t.code}`,
      subject: t.subject,
      kind: "chapter",
      number: t.index,
      paperCode: t.code,
      topicKey: t.topicKey,
      worksheetIdPrefix: prefixOf(seriesChapterWorksheetId("ct-x", t.topicKey)),
      questionIds: drawn.paper.questions.map((q) => String(q.id)),
      sectionBEQuestionIds: subjectiveQuestions(drawn.paper).map((q) => String(q.id)),
    });
  }
  for (const subject of ["Maths", "Science"] as const) {
    const pack = subject === "Maths" ? "maths" : "science";
    await loadSubjectBank(pack);
    const papers = new Map(drawPackMocks(pack, SERIES_MOCKS_PER_SUBJECT).map((p) => [p.n, p.drawn] as const));
    for (let n = 1; n <= SERIES_MOCKS_PER_SUBJECT; n += 1) {
      const d = papers.get(n);
      mockIds[pack].push(d ? d.paper.questions.map((q) => String(q.id)) : null);
    }
    for (const m of seriesFullMocks().filter((x) => x.subject === subject)) {
      const drawn = papers.get(m.n);
      if (!drawn) throw new Error(`paperManifest: ${subject} Mock ${m.n} could not be drawn`);
      out.push({
        key: `TS-${m.code}`,
        subject,
        kind: "mock",
        number: m.n,
        paperCode: m.code,
        topicKey: null,
        worksheetIdPrefix: prefixOf(seriesMockWorksheetId("fm-x", subject, m.n)),
        questionIds: drawn.paper.questions.map((q) => String(q.id)),
        sectionBEQuestionIds: fullMockSubjectiveQuestions(drawn.paper).map((q) => String(q.id)),
      });
    }
  }
  return { entries: out, mockIds };
}

export function serializeSeriesMockIds(ids: SeriesMockIds): string {
  return `${JSON.stringify(ids)}\n`;
}

/** The committed file's text: a top-level JSON array (the format the server work asked for), one entry per paper, trailing newline. */
export function serializeSeriesPaperManifest(entries: readonly SeriesPaperManifestEntry[]): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}
