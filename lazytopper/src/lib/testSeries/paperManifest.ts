/**
 * TEST-SERIES-1 — the Test Series PAPER MANIFEST (owner, 18 Nov 2026, 19:38 IST): every numbered paper's exact question ids, so the
 * server can accept Test Series checks ONLY for these papers and these questions.
 *
 * Committed at lazytopper/server/data/testSeriesPapers.json. Generated from the SAME draws the pages use:
 *   chapter  drawChapterTest({ fixedSeed: chapterTestSeriesSeed(topicKey) })   (ChapterTestPage with ?series=1)
 *   mock     drawPackMocks(subject, SERIES_MOCKS_PER_SUBJECT)[n]               (FullMockPage with ?paper=n via drawSeriesFullMock)
 * TS-PIN-1 (19 Nov 2026): the committed JSON is now the SOURCE OF TRUTH - the pages build each paper FROM it (pinnedSeriesPaper.ts),
 * so a bank edit can no longer move a paper. It is append-only: `pnpm --filter lazytopper run gen:test-series-manifest` creates
 * entries for NEW papers only and never alters an existing one (appendNewSeriesPapers). paperManifest.guard.test.ts checks every
 * pinned id exists in the raw bank, blueprint counts hold, and keys/prefixes are unique.
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
  /**
   * TS-PACK-1 — per written question id, sha256 (hex) of its CANONICAL text (`canonicalQuestionText` below). The server
   * (server/services/testSeriesChecks.cjs) checks every submitted question's text against it, so a valid id cannot carry a
   * swapped question. The text hashed is `questionText` — exactly what the Chapter Test / Full Mock grading request sends.
   */
  textHashes: Record<string, string>;
}

/**
 * TS-PACK-1 — THE canonical text: Unicode NFC, every whitespace run as one space, trimmed. The server's
 * `canonicalQuestionText` (testSeriesChecks.cjs) is the same function; paperManifest.guard.test.ts pins the two together.
 */
export function canonicalQuestionText(text: unknown): string {
  return String(text == null ? "" : text).normalize("NFC").replace(/\s+/g, " ").trim();
}

/** How the build hashes a canonical text (sha256 hex). Injected so this module stays free of node-only imports. */
export type CanonicalTextHasher = (canonicalText: string) => string;

function textHashesOf(questions: ReadonlyArray<{ id?: unknown; questionText?: unknown }>, hash: CanonicalTextHasher): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) out[String(q.id)] = hash(canonicalQuestionText(q.questionText));
  return out;
}

const STAMP = "2026-01-01T00:00:00.000Z";

/** The worksheet-id prefix of a series paper: the minted-id rewrite applied to an empty tail. */
function prefixOf(rewritten: string): string {
  return rewritten.slice(0, rewritten.indexOf("--") + 2);
}

/**
 * TS-PIN-1 - the client's copy: per paper key ("TS-CT-M01", "TS-FM-S8"), the paper's question ids in paper order and, parallel to
 * them, each question's SECTION letters ("AAAAAABBBBCCCDD"), so a pinned paper keeps its blueprint slots even if a row's own
 * eligibility later changes. Committed as seriesPaperIds.json (APPEND-ONLY, like the server manifest). The server manifest stays
 * the admission source; paperManifest.guard.test.ts pins the two to the same ids.
 */
export interface SeriesPinnedSpec {
  ids: string[];
  sections: string;
}
export type SeriesPaperIds = Record<string, SeriesPinnedSpec>;

/**
 * Generate every paper's entry from the SEEDED draws (the same draws the pages used before TS-PIN-1). Since TS-PIN-1 the committed
 * files are the SOURCE; this runs only to CREATE new papers (`appendNewSeriesPapers`) and in the byte-identity proof test.
 */
export async function buildSeriesPaperManifest(hashText: CanonicalTextHasher): Promise<{ entries: SeriesPaperManifestEntry[]; paperIds: SeriesPaperIds }> {
  const out: SeriesPaperManifestEntry[] = [];
  const paperIds: SeriesPaperIds = {};
  const pin = (key: string, paper: { questions: ReadonlyArray<{ id?: unknown; section?: unknown }> }) => {
    paperIds[key] = { ids: paper.questions.map((q) => String(q.id)), sections: paper.questions.map((q) => String(q.section)).join("") };
  };
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
      textHashes: textHashesOf(subjectiveQuestions(drawn.paper), hashText),
    });
    pin(`TS-${t.code}`, drawn.paper);
  }
  for (const subject of ["Maths", "Science"] as const) {
    const pack = subject === "Maths" ? "maths" : "science";
    await loadSubjectBank(pack);
    const papers = new Map(drawPackMocks(pack, SERIES_MOCKS_PER_SUBJECT).map((p) => [p.n, p.drawn] as const));
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
        textHashes: textHashesOf(fullMockSubjectiveQuestions(drawn.paper), hashText),
      });
      pin(`TS-${m.code}`, drawn.paper);
    }
  }
  return { entries: out, paperIds };
}

/**
 * TS-PIN-1 - APPEND-ONLY merge. The committed entries are kept exactly as they are (same objects, same order); a fresh entry is
 * added ONLY for a key the committed file does not have. An existing key whose fresh draw differs is NOT changed - it is reported
 * in `drifted` (a bank edit moved the seeded draw; the pinned paper did not). Never throws on drift: that is the point of pinning.
 */
export function appendNewSeriesPapers(
  committed: readonly SeriesPaperManifestEntry[],
  committedIds: SeriesPaperIds,
  fresh: { entries: readonly SeriesPaperManifestEntry[]; paperIds: SeriesPaperIds },
): { entries: SeriesPaperManifestEntry[]; paperIds: SeriesPaperIds; added: string[]; drifted: string[] } {
  const have = new Set(committed.map((e) => e.key));
  const entries = [...committed];
  const paperIds: SeriesPaperIds = { ...committedIds };
  const added: string[] = [];
  const drifted: string[] = [];
  for (const e of fresh.entries) {
    if (have.has(e.key)) {
      const old = committed.find((c) => c.key === e.key);
      if (old && JSON.stringify(old.questionIds) !== JSON.stringify(e.questionIds)) drifted.push(e.key);
      continue;
    }
    entries.push(e);
    paperIds[e.key] = fresh.paperIds[e.key];
    added.push(e.key);
  }
  return { entries, paperIds, added, drifted };
}

export function serializeSeriesPaperIds(ids: SeriesPaperIds): string {
  return `${JSON.stringify(ids)}\n`;
}

export function serializeSeriesPaperManifest(entries: readonly SeriesPaperManifestEntry[]): string {
  return `${JSON.stringify(entries, null, 2)}\n`;
}
