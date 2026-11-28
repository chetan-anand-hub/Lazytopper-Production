/**
 * SEO-SELL-3 - samplePaperFacts.json is DERIVED, never hand-typed: this test rebuilds the PDF Mock Pack's papers (full-length papers
 * 1..MOCKS_PER_SUBJECT of each subject, the same pinned papers the Test Series serves online) through the real pinned builders,
 * reads each paper's real marks and competency-based marks, and fails when the committed JSON differs. The /sample-paper-class-10 page
 * reads the JSON, so it can never state a figure the paper does not have.
 * Regenerate: `LT_WRITE_SAMPLE_FACTS=1 pnpm exec vitest run src/lib/testSeries/samplePaperFacts.guard.test.ts` (from lazytopper/).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { buildPinnedFullMock, unservedMockIds } from "./pinnedFullMock";
import { pinnedSpecOf } from "./pinnedSpec";
import { loadRawBankRowsById } from "./rawBankRows";
import { seriesFullMocks } from "./testSeries";
import { MOCKS_PER_SUBJECT } from "../packs/packLabels";
import type { PaperDifficultyMap } from "./paperDifficulty";

const FILE = resolve(__dirname, "../../components/seoPages/samplePaperFacts.json");
const DIFF = resolve(__dirname, "paperDifficulty.json");
const STAMP = "2026-01-01T00:00:00.000Z";
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

interface Fact {
  marks: number;
  questions: number;
  cbqMarks: number;
  sections: Record<string, { count: number; marks: number }>;
  difficulty: string;
}

beforeAll(async () => {
  await ensureAllBankChapters();
}, 120_000);

async function compute(): Promise<Record<string, Fact>> {
  const diff = JSON.parse(readFileSync(DIFF, "utf8")) as PaperDifficultyMap;
  const out: Record<string, Fact> = {};
  for (const m of seriesFullMocks().filter((x) => x.n <= MOCKS_PER_SUBJECT)) {
    await tick();
    const key = `TS-${m.code}`;
    const spec = pinnedSpecOf(key)!;
    const unserved = unservedMockIds(spec, m.subject);
    const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map();
    const built = buildPinnedFullMock(m.subject, spec, { worksheetId: "w", code: "c", name: "n", createdAt: STAMP }, raw);
    expect(built.missingIds, key).toEqual([]);
    const d = built.drawn;
    const sections: Fact["sections"] = {};
    for (const row of d.blueprint) sections[row.section] = { count: row.actualCount, marks: row.actualMarks };
    out[m.code] = { marks: d.totalMarks, questions: d.paper.questions.length, cbqMarks: d.cbqMarks, sections, difficulty: diff[key]?.label ?? "Standard" };
  }
  return out;
}

const stringify = (m: Record<string, Fact>) => `${JSON.stringify(m, null, 1)}\n`;

describe("SEO-SELL-3 samplePaperFacts.json is derived from the pinned papers", () => {
  it("REGENERATE (LT_WRITE_SAMPLE_FACTS=1 only): writes the JSON", async () => {
    if (process.env.LT_WRITE_SAMPLE_FACTS !== "1") return;
    writeFileSync(FILE, stringify(await compute()));
  }, 600_000);

  it("the committed JSON equals a fresh recompute from the real pinned builders + the bank (fails when stale)", async () => {
    expect(existsSync(FILE), "regenerate with LT_WRITE_SAMPLE_FACTS=1 (see the header)").toBe(true);
    expect(readFileSync(FILE, "utf8") === stringify(await compute()), "samplePaperFacts.json is stale: regenerate with LT_WRITE_SAMPLE_FACTS=1").toBe(true);
  }, 600_000);

  it("covers every Mock Pack paper of both subjects, each an 80-mark A-E paper", () => {
    const facts = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Fact>;
    expect(Object.keys(facts)).toHaveLength(MOCKS_PER_SUBJECT * 2);
    for (const [code, f] of Object.entries(facts)) {
      expect(f.marks, code).toBe(80);
      expect(Object.keys(f.sections), code).toEqual(["A", "B", "C", "D", "E"]);
      expect(f.cbqMarks, code).toBeGreaterThan(0);
    }
  });
});
