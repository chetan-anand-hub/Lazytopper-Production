/**
 * PACK-PIN-1 - the pack's SEEDED DRAWS (the pre-pinning behaviour), moved here unchanged from buildPackFiles so the pinned builders
 * (packPins.ts) can be proved byte-identical to them and so VITE_PACK_PIN_DISABLED can fall back to them. Since PACK-PIN-1 a sold pack
 * paper is built FROM ITS PINNED IDS (packPaperIds.json); these draws run only to CREATE new pins, in the proof tests, and under the
 * kill switch. Nothing here reads the clock or Math.random.
 */
import { drawChapterTest, type DrawnChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { buildUnionPool, drawFullMock, fullMockChapterWeights } from "../../components/fullmock/fullMockBlueprint";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import type { PackSubject } from "../../services/packs";
import { bankSubjectName, bankSubjectOf, chapterName, drawAvoidingExcluded, hashSeed, packServedAt } from "./packContent";
import { packPaperCode } from "./packPaperCode";
import { MOCKS_PER_SUBJECT } from "./packLabels";

/** Papers are drawn with this placeholder stamp; the real "Generated <date>" is set when a file is built. */
export const DRAW_STAMP = "2026-01-01T00:00:00.000Z";

/** The chapter's Chapter Test 1 and 2, as the seeded draw makes them (CT2 steers clear of CT1). A chapter too thin for a test yields none. */
export function drawPackChapterTests(slug: string, drawRows: readonly CanonicalQuestion[]): Array<{ n: 1 | 2; drawn: DrawnChapterTest }> {
  const name = chapterName(slug);
  const subject = bankSubjectOf(slug);
  const out: Array<{ n: 1 | 2; drawn: DrawnChapterTest }> = [];
  const ctUsed: Array<Set<string>> = [];
  for (const n of [1, 2] as const) {
    const seed = hashSeed(`pack-paper:${slug}:ct${n}`);
    const drawn = drawAvoidingExcluded(
      (servedAt) =>
        drawChapterTest({
          subject,
          topicKey: slug,
          topicLabel: name,
          worksheetId: `pack-${slug}-ct${n}`,
          name: `${name} · Chapter Test ${n}`,
          createdAt: DRAW_STAMP,
          seed,
          servedAt,
        }),
      packServedAt(drawRows, ctUsed),
    );
    if (!drawn.enoughQuestions) continue;
    ctUsed.push(new Set(drawn.paper.questions.map((q) => q.id)));
    out.push({ n, drawn });
  }
  return out;
}

/** The mock papers 1..upTo of a subject as the seeded draw makes them (paper n steers clear of papers 1..n-1). */
export function drawPackMocks(
  subject: PackSubject,
  /** TEST-SERIES-1 - stop after paper `upTo`; it may go PAST MOCKS_PER_SUBJECT (the Test Series' papers 9+ continue the same seed scheme). */
  upTo: number = MOCKS_PER_SUBJECT,
): Array<{ n: number; drawn: ReturnType<typeof drawFullMock>; name: string }> {
  const unionPool = packMockUnionPool(subject);
  const used: Array<Set<string>> = [];
  const out: Array<{ n: number; drawn: ReturnType<typeof drawFullMock>; name: string }> = [];
  const last = Math.max(0, Math.floor(upTo));
  for (let n = 1; n <= last; n += 1) {
    const { drawn, name } = drawPackMockAfter(subject, n, used, unionPool);
    if (!drawn.enoughQuestions) continue;
    used.push(new Set(drawn.paper.questions.map((q) => q.id)));
    out.push({ n, drawn, name });
  }
  return out;
}

function packMockUnionPool(subject: PackSubject) {
  const bankSubject = bankSubjectName(subject);
  return buildUnionPool(bankSubject, new Set(fullMockChapterWeights(bankSubject).map((c) => c.slug)));
}

/**
 * Mock paper `n` of a subject, given the question ids of the papers drawn before it (`usedBefore`, in paper order - exactly the
 * list `drawPackMocks` builds). THE one draw `drawPackMocks` runs per paper (TEST-SERIES-1).
 */
export function drawPackMockAfter(
  subject: PackSubject,
  n: number,
  usedBefore: ReadonlyArray<ReadonlySet<string>>,
  unionPool: ReturnType<typeof buildUnionPool> = packMockUnionPool(subject),
): { drawn: ReturnType<typeof drawFullMock>; name: string } {
  const bankSubject = bankSubjectName(subject);
  const name = `${bankSubject} Full Mock ${n}`;
  const drawn = drawAvoidingExcluded(
    (servedAt) =>
      drawFullMock({
        subject: bankSubject,
        worksheetId: `pack-mock-${subject}-${n}`,
        code: packPaperCode({ kind: "mock", subject, n }),
        name,
        createdAt: DRAW_STAMP,
        seed: hashSeed(`pack-paper:mock:${subject}:${n}`),
        servedAt,
      }),
    packServedAt(unionPool, usedBefore),
  );
  return { drawn, name };
}
