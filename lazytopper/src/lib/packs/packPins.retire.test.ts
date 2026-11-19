/**
 * PACK-PIN-1 - a bank edit that removes rows from the SERVED bank (a retire / withhold) moves the seeded draws but not a pinned pack
 * paper: the row stays on the paper that was sold, resolved from the RAW bank; an id absent everywhere is omitted, never swapped.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

const hidden = vi.hoisted(() => new Set<string>());
vi.mock("../../data/bankChapters/loader", async (orig) => {
  const m = await orig<typeof import("../../data/bankChapters/loader")>();
  return {
    ...m,
    getBankRows: (slugs: Iterable<string>) => m.getBankRows(slugs).filter((q) => !hidden.has(q.id)),
    getBankRowsForSubject: (s: string) => m.getBankRowsForSubject(s).filter((q) => !hidden.has(q.id)),
  };
});

import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { drawPackChapterTests, drawPackMocks } from "./packDraws";
import { chapterPackDrawRows, drawPackWorksheetRowsSafe, hashSeed } from "./packContent";
import { packChapterTestPapers, packMockPapers, packPinSpec, packWorksheetRows } from "./packPins";
import { buildPinnedChapterTest } from "../testSeries/pinnedChapterTest";

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);

describe("retired / withheld rows do not move sold pack papers", () => {
  it("Chapter Test 1, the Worksheet and Mock 1: the draw moves, the pinned paper keeps every pinned id in order", async () => {
    const slug = "real-numbers";
    const ct = packPinSpec(`ct1:${slug}`)!;
    const ws = packPinSpec(`ws:${slug}`)!;
    const mock = packPinSpec("mock:maths:1")!;
    const ids = [ct.ids[0], ws.ids[0], mock.ids[0]];
    hidden.clear();
    for (const id of ids) hidden.add(id);
    const drawRows = chapterPackDrawRows(slug);
    expect(drawRows.some((q) => ids.includes(q.id))).toBe(false);
    // the seeded draws now differ from the pins (the problem)
    const drawnCt = drawPackChapterTests(slug, drawRows).find((x) => x.n === 1)!;
    expect(drawnCt.drawn.paper.questions.map((q) => q.id)).not.toEqual(ct.ids);
    expect(drawPackWorksheetRowsSafe(drawRows, hashSeed(`pack-paper:${slug}:ws1`)).map((q) => q.id)).not.toEqual(ws.ids);
    expect(drawPackMocks("maths")[0].drawn.paper.questions.map((q) => q.id)).not.toEqual(mock.ids);
    // the pinned builds are unmoved
    const pct = (await packChapterTestPapers(slug, drawRows)).find((x) => x.n === 1)!;
    expect(pct.paper.questions.map((q) => q.id)).toEqual(ct.ids);
    expect(pct.paper.questions.map((q) => String(q.section))).toEqual([...ct.sections]);
    expect((await packWorksheetRows(slug, drawRows)).map((q) => q.id)).toEqual(ws.ids);
    expect((await packMockPapers("maths")).find((x) => x.n === 1)!.paper.questions.map((q) => q.id)).toEqual(mock.ids);
    hidden.clear();
  }, 600_000);

  it("an id absent from the served AND raw bank is omitted (numbering contiguous), never replaced", async () => {
    const spec = packPinSpec("ct1:real-numbers")!;
    const withGhost = { ids: [spec.ids[0], "ZZ-GHOST", ...spec.ids.slice(1)], sections: `${spec.sections[0]}${spec.sections[0]}${spec.sections.slice(1)}` };
    const out = buildPinnedChapterTest({ subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", worksheetId: "w", createdAt: "2026-01-01T00:00:00.000Z" }, withGhost);
    expect(out.missingIds).toEqual(["ZZ-GHOST"]);
    expect(out.drawn.paper.questions.map((q) => q.id)).toEqual(spec.ids);
    expect(out.drawn.paper.questions.map((q) => q.qNumber)).toEqual(spec.ids.map((_, i) => i + 1));
  });
});
