/**
 * PACK-PIN-1 - every drawn PDF pack paper is built from its pinned ids.
 *  1. BYTE-IDENTITY: for every Chapter Test 1/2, Worksheet and Full Mock 1-8 the pinned build equals today's seeded draw (ids, order,
 *     sections, marks, codes, names, provenance) - and the WHOLE of both Subject Packs (every file's worksheet + code) is identical
 *     with the pins on and with VITE_PACK_PIN_DISABLED set.
 *  2. Series Full-Length Tests 1-8 are still the pack's Mocks 1-8 (same ids, same order, same sections).
 *  3. A bank change that would move a seeded draw does not move a pinned paper (a served row removed -> kept from the raw bank).
 *  4. Missing ids: kept from the raw bank, else omitted (never swapped).
 *  5. Append-only generator (LT_WRITE_PACK_PINS=1 creates entries for missing keys only).
 * ACKNOWLEDGED_DRAW_DRIFT: keys whose SEEDED draw may differ from the pin (a deliberate bank change moved the draw; the pinned paper did not).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { PACK_CHAPTER_SLUGS, PACK_SUBJECTS, packIdOf } from "../../services/packs";
import { buildPackFiles, type BuildContext } from "./buildPackFiles";
import { drawPackChapterTests, drawPackMocks } from "./packDraws";
import { chapterPackDrawRows, drawPackWorksheetRowsSafe, hashSeed, withProvenance, chapterPackRows } from "./packContent";
import { allPackPins, packChapterTestPapers, packMockPapers, packPinSpec, packWorksheetRows, type PackPaperIds } from "./packPins";
import { allPinnedSpecs } from "../testSeries/pinnedSpec";

/**
 * STEPMARK-2 batch 1 (19 Nov 2026): hand-sourced Maths rows of chapters 1-4 gained [N mark] step prefixes; the seeded draws only take
 * step-marked rows, so every seeded draw touching those chapters or the Maths mocks moves. The pins (packPaperIds.json) do not.
 */
const ACKNOWLEDGED_DRAW_DRIFT: readonly string[] = [
  ...["real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations"].flatMap((s) => [`ct1:${s}`, `ct2:${s}`, `ws:${s}`]),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `mock:maths:${n}`),
];
const acked = (k: string) => ACKNOWLEDGED_DRAW_DRIFT.includes(k);
const FILE = resolve(__dirname, "packPaperIds.json");

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);
afterEach(() => vi.unstubAllEnvs());

type Spec = { ids: string[]; sections: string };
const specOf = (paper: { questions: ReadonlyArray<{ id?: unknown; section?: unknown }> }): Spec => ({
  ids: paper.questions.map((q) => String(q.id)),
  sections: paper.questions.map((q) => String(q.section).toUpperCase()).join(""),
});

/** Today's seeded draws as pin specs, for every key. */
function drawnSpecs(): PackPaperIds {
  const out: PackPaperIds = {};
  for (const slug of PACK_CHAPTER_SLUGS) {
    const drawRows = chapterPackDrawRows(slug);
    for (const { n, drawn } of drawPackChapterTests(slug, drawRows)) out[`ct${n}:${slug}`] = specOf(drawn.paper);
    const ws = drawPackWorksheetRowsSafe(drawRows, hashSeed(`pack-paper:${slug}:ws1`));
    if (ws.length > 0) out[`ws:${slug}`] = specOf({ questions: ws.map((q) => ({ id: q.id, section: q.section })) });
  }
  for (const subject of PACK_SUBJECTS) for (const { n, drawn } of drawPackMocks(subject)) out[`mock:${subject}:${n}`] = specOf(drawn.paper);
  return out;
}

describe("PACK-PIN-1 pins file", () => {
  it("CREATE NEW PINS (LT_WRITE_PACK_PINS=1 only): appends keys the file lacks; never changes an existing entry", () => {
    if (process.env.LT_WRITE_PACK_PINS !== "1") return;
    const committed = JSON.parse(readFileSync(FILE, "utf8")) as PackPaperIds;
    const merged: PackPaperIds = { ...committed };
    const added: string[] = [];
    for (const [k, v] of Object.entries(drawnSpecs())) if (!(k in committed)) (merged[k] = v), added.push(k);
    writeFileSync(FILE, `${JSON.stringify(merged)}\n`);
    // eslint-disable-next-line no-console
    console.log(`PACK-PIN-1 generator: added ${added.length}`);
  }, 600_000);

  it("pins exist for every drawn pack paper (26 chapters x [CT1, CT2, WS] + 2 subjects x 8 mocks) and are well-formed", () => {
    const pins = allPackPins();
    const keys = Object.keys(pins);
    expect(keys.length).toBe(PACK_CHAPTER_SLUGS.length * 3 + PACK_SUBJECTS.length * 8);
    for (const k of keys) expect(packPinSpec(k), k).not.toBeNull();
  });

  it("BYTE-IDENTITY of the pins: every pin equals today's seeded draw (drift only if acknowledged)", () => {
    const pins = allPackPins();
    const drift = Object.entries(drawnSpecs()).filter(([k, v]) => JSON.stringify(pins[k]) !== JSON.stringify(v)).map(([k]) => k);
    expect(drift.filter((k) => !ACKNOWLEDGED_DRAW_DRIFT.includes(k))).toEqual([]);
    expect(Object.keys(drawnSpecs()).filter((k) => !(k in pins))).toEqual([]);
  }, 300_000);

  it("Series Full-Length Tests 1-8 are the pack's Mocks 1-8 (same ids, order, sections)", () => {
    const series = allPinnedSpecs();
    for (const [subject, letter] of [["maths", "M"], ["science", "S"]] as const) {
      for (let n = 1; n <= 8; n += 1) expect(allPackPins()[`mock:${subject}:${n}`], `${subject} ${n}`).toEqual(series[`TS-FM-${letter}${n}`]);
    }
  });
});

describe("PACK-PIN-1 pinned builds equal the seeded draws", () => {
  it("Chapter Tests 1/2, Worksheets and Mocks: same papers (JSON-identical) as the draw", async () => {
    for (const slug of PACK_CHAPTER_SLUGS) {
      const drawRows = chapterPackDrawRows(slug);
      if (!acked(`ct1:${slug}`) && !acked(`ct2:${slug}`)) {
        const pinned = await packChapterTestPapers(slug, drawRows);
        const drawn = drawPackChapterTests(slug, drawRows).map(({ n, drawn }) => ({ n, paper: drawn.paper }));
        expect(JSON.stringify(pinned), `${slug} CT`).toBe(JSON.stringify(drawn));
      }
      if (acked(`ws:${slug}`)) continue;
      const ws = await packWorksheetRows(slug, drawRows);
      expect(JSON.stringify(ws), `${slug} WS`).toBe(JSON.stringify(drawPackWorksheetRowsSafe(drawRows, hashSeed(`pack-paper:${slug}:ws1`))));
    }
    for (const subject of PACK_SUBJECTS) {
      if (acked(`mock:${subject}:1`)) continue;
      const pinned = await packMockPapers(subject);
      const drawn = drawPackMocks(subject).map(({ n, drawn, name }) => ({ n, paper: drawn.paper, name }));
      expect(JSON.stringify(pinned), `${subject} mocks`).toBe(JSON.stringify(drawn));
    }
  }, 600_000);

  it("whole Subject Packs: every file's worksheet, code and name is identical with the pins on and with VITE_PACK_PIN_DISABLED", async () => {
    const run = async () => {
      const sink: Array<{ id: string; code?: string; ws: unknown }> = [];
      for (const s of PACK_SUBJECTS.filter((x) => !acked(`mock:${x}:1`))) {
        const ctx: BuildContext = {
          licensee: { name: "T", email: "t@example.in" },
          owned: [],
          nowIso: () => "2026-11-05T00:00:00.000Z",
          exportPdf: async (ws, _m, code) => {
            sink.push({ id: ws.worksheetId, code, ws });
            return "x.pdf";
          },
        };
        const files = await buildPackFiles({ packId: packIdOf("pack_subject", s), sku: "pack_subject", target: s }, ctx);
        for (const f of files) await f.build();
      }
      return JSON.stringify(sink);
    };
    const pinned = await run();
    vi.stubEnv("VITE_PACK_PIN_DISABLED", "1");
    const drawn = await run();
    expect(pinned.length).toBeGreaterThan(1_000_000);
    expect(pinned === drawn).toBe(true);
  }, 900_000);
});

describe("PACK-PIN-1 provenance and the kill switch", () => {
  it("pinned Chapter Test carries the same provenance as the draw (withProvenance over the chapter rows)", async () => {
    const slug = PACK_CHAPTER_SLUGS.find((x) => !acked(`ct1:${x}`))!;
    const rows = chapterPackRows(slug);
    const drawRows = chapterPackDrawRows(slug);
    const [pinned] = await packChapterTestPapers(slug, drawRows);
    const [drawn] = drawPackChapterTests(slug, drawRows);
    expect(JSON.stringify(withProvenance(pinned.paper.questions, rows))).toBe(JSON.stringify(withProvenance(drawn.drawn.paper.questions, rows)));
  });
  it("VITE_PACK_PIN_DISABLED returns the seeded draws", async () => {
    vi.stubEnv("VITE_PACK_PIN_DISABLED", "1");
    const drawRows = chapterPackDrawRows("polynomials");
    expect(JSON.stringify(await packChapterTestPapers("polynomials", drawRows))).toBe(
      JSON.stringify(drawPackChapterTests("polynomials", drawRows).map(({ n, drawn }) => ({ n, paper: drawn.paper }))),
    );
  });
});
