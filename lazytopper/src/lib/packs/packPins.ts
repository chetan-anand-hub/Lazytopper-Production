/**
 * PACK-PIN-1 - every DRAWN PDF pack paper is built FROM ITS PINNED QUESTION IDS (packPaperIds.json), never re-drawn from the bank.
 * A sold paper must not change when the bank does (step-marking annotations re-rank the seeded draws; retiring rows removes
 * candidates): its printed code names ONE paper for good.
 *
 * Drawn pack papers (everything else in a pack is a SELECTION - the Section question banks, the CBQ sets - see the PR notes):
 *   ct1:<slug> / ct2:<slug>   Chapter Test 1 / 2 of a chapter          (PK-<M|S>-<TOPIC>-CT1 / -CT2)
 *   ws:<slug>                 the chapter's Worksheet                   (PK-<M|S>-<TOPIC>-WS)
 *   mock:<subject>:<n>        Full Mock n of a subject, n = 1..8        (PK-<M|S>-FULL-M<n>) = Test Series FM-<M|S><n>
 * Each entry is { ids, sections } in paper order (same shape as the Test Series pins). Append-only; `LT_WRITE_PACK_PINS=1` on
 * packPins.test.ts creates entries for keys the file lacks and never alters one.
 *
 * A pinned id is resolved like the Test Series' (pinnedChapterTest.ts): served bank first, then the RAW bank (a withheld / retired
 * row stays on the paper that was sold); an id absent from both is OMITTED (never swapped) - the cover's question / marks counts
 * are always the paper's real ones. Kill switch: VITE_PACK_PIN_DISABLED -> the seeded draws (packDraws.ts), byte-identical.
 */
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { selectBankQuestions } from "../../data/bankQuery";
import type { PackSubject } from "../../services/packs";
import { buildPinnedChapterTest, unservedChapterIds } from "../testSeries/pinnedChapterTest";
import { buildPinnedFullMock, unservedMockIds } from "../testSeries/pinnedFullMock";
import { isUsableSpec } from "../testSeries/pinnedSpec";
import { loadRawBankRowsById } from "../testSeries/rawBankRows";
import type { SeriesPinnedSpec } from "../testSeries/paperManifest";
import { DRAW_STAMP, drawPackChapterTests, drawPackMocks } from "./packDraws";
import { bankSubjectName, bankSubjectOf, chapterName, drawPackWorksheetRowsSafe, hashSeed } from "./packContent";
import { packPaperCode } from "./packPaperCode";
import { MOCKS_PER_SUBJECT } from "./packLabels";
import pins from "./packPaperIds.json";

export type PackPaperIds = Record<string, SeriesPinnedSpec>;
const ALL = pins as unknown as PackPaperIds;

export function packPinDisabled(): boolean {
  const v = import.meta.env?.VITE_PACK_PIN_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

export const allPackPins = (): PackPaperIds => ALL;
export function packPinSpec(key: string): SeriesPinnedSpec | null {
  const s = ALL[key];
  return isUsableSpec(s) ? s : null;
}

/** Chapter Test 1 / 2 papers of a chapter: pinned (a test with no pin is not built); the seeded draw only under the kill switch. */
export async function packChapterTestPapers(slug: string, drawRows: readonly CanonicalQuestion[]): Promise<Array<{ n: 1 | 2; paper: PersistedWorksheet }>> {
  const specs = ([1, 2] as const).map((n) => [n, packPinSpec(`ct${n}:${slug}`)] as const);
  if (packPinDisabled()) return drawPackChapterTests(slug, drawRows).map(({ n, drawn }) => ({ n, paper: drawn.paper }));
  const subject = bankSubjectOf(slug);
  const name = chapterName(slug);
  const out: Array<{ n: 1 | 2; paper: PersistedWorksheet }> = [];
  for (const [n, spec] of specs) {
    if (!spec) continue;
    const unserved = unservedChapterIds(spec, subject, slug);
    const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map<string, CanonicalQuestion>();
    const { drawn } = buildPinnedChapterTest(
      { subject, topicKey: slug, topicLabel: name, worksheetId: `pack-${slug}-ct${n}`, name: `${name} · Chapter Test ${n}`, createdAt: DRAW_STAMP },
      spec,
      raw,
    );
    if (drawn.paper.questions.length > 0) out.push({ n, paper: drawn.paper });
  }
  return out;
}

/** The Worksheet's rows, in printed order: pinned, else the seeded draw. */
export async function packWorksheetRows(slug: string, drawRows: readonly CanonicalQuestion[]): Promise<CanonicalQuestion[]> {
  const spec = packPinSpec(`ws:${slug}`);
  if (packPinDisabled()) return drawPackWorksheetRowsSafe(drawRows, hashSeed(`pack-paper:${slug}:ws1`));
  if (!spec) return []; // a paper with no pin was never sold: nothing is drawn for it (new papers are created by the append-only generator)
  const byId = new Map(drawRows.map((q) => [String(q.id), q] as const));
  for (const q of selectBankQuestions({ subject: bankSubjectOf(slug), topicKeys: [slug] })) if (!byId.has(String(q.id))) byId.set(String(q.id), q);
  const missing = spec.ids.filter((id) => !byId.has(id));
  const raw = missing.length ? await loadRawBankRowsById(missing) : new Map<string, CanonicalQuestion>();
  return spec.ids.flatMap((id) => {
    const q = byId.get(id) ?? raw.get(id);
    return q ? [q] : [];
  });
}

/** Full Mock papers 1..8 of a subject: pinned, else the seeded draw. */
export async function packMockPapers(subject: PackSubject): Promise<Array<{ n: number; paper: PersistedWorksheet; name: string }>> {
  const bankSubject = bankSubjectName(subject);
  const specs = Array.from({ length: MOCKS_PER_SUBJECT }, (_, i) => [i + 1, packPinSpec(`mock:${subject}:${i + 1}`)] as const);
  if (packPinDisabled()) return drawPackMocks(subject).map(({ n, drawn, name }) => ({ n, paper: drawn.paper, name }));
  const out: Array<{ n: number; paper: PersistedWorksheet; name: string }> = [];
  for (const [n, spec] of specs) {
    if (!spec) continue;
    const unserved = unservedMockIds(spec, bankSubject);
    const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map<string, CanonicalQuestion>();
    const name = `${bankSubject} Full Mock ${n}`;
    const { drawn } = buildPinnedFullMock(
      bankSubject,
      spec,
      { worksheetId: `pack-mock-${subject}-${n}`, code: packPaperCode({ kind: "mock", subject, n }), name, createdAt: DRAW_STAMP },
      raw,
    );
    if (drawn.paper.questions.length > 0) out.push({ n, paper: drawn.paper, name });
  }
  return out;
}
