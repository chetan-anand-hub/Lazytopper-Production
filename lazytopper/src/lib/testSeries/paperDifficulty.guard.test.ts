/**
 * TS-DIFF-1 - paperDifficulty.json is DERIVED, never hand-typed: this test rebuilds all 180 pinned papers through the real pinned
 * builders, reads each question's difficulty tag from the bank, recomputes the labels and fails when the committed JSON differs.
 * Regenerate: `LT_WRITE_TS_DIFFICULTY=1 pnpm exec vitest run src/lib/testSeries/paperDifficulty.guard.test.ts` (from lazytopper/).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureAllBankChapters } from "../../data/bankChapters/loader";
import { RAW_CANONICAL_QUESTION_BANK, canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { predictedQuestions } from "../../data/predictedQuestions";
import { sciencePredictedQuestions } from "../../data/predictedQuestionsScience";
import { buildPinnedChapterTest, unservedChapterIds } from "./pinnedChapterTest";
import { buildPinnedFullMock, unservedMockIds } from "./pinnedFullMock";
import { pinnedSpecOf } from "./pinnedSpec";
import { embeddedRetiredRows, loadRawBankRowsById } from "./rawBankRows";
import { seriesChapterTests, seriesFullMocks, seriesTotals } from "./testSeries";
import {
  CHAPTER_MIN_GAP,
  computePaperDifficulty,
  hardPctOf,
  loadPaperDifficulty,
  showsChip,
  tsDifficultyDisabled,
  type DifficultyPaperInput,
  type DifficultyQuestion,
  type PaperDifficultyMap,
} from "./paperDifficulty";

const FILE = resolve(__dirname, "paperDifficulty.json");
const STAMP = "2026-01-01T00:00:00.000Z";
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

type Tag = DifficultyQuestion["difficulty"];
const isTag = (d: unknown): d is Tag => d === "Easy" || d === "Medium" || d === "Hard";

let tags: Map<string, Tag>;
beforeAll(async () => {
  await ensureAllBankChapters();
  tags = new Map();
  const add = (id: unknown, d: unknown) => {
    if (typeof id === "string" && isTag(d) && !tags.has(id)) tags.set(id, d);
  };
  for (const q of RAW_CANONICAL_QUESTION_BANK) add(q.id, q.difficulty);
  for (const q of canonicalQuestionBank) add(q.id, q.difficulty);
  for (const q of Object.values(embeddedRetiredRows())) add(q.id, q.difficulty);
  for (const q of [...predictedQuestions, ...sciencePredictedQuestions]) add((q as { id: string }).id, (q as { difficulty?: string }).difficulty);
}, 120_000);
afterEach(() => vi.unstubAllEnvs());

function toQuestions(rows: ReadonlyArray<{ id: unknown; marks: unknown }>, key: string): DifficultyQuestion[] {
  return rows.map((q) => {
    const difficulty = tags.get(String(q.id));
    expect(difficulty, `${key}: ${String(q.id)} has no difficulty tag`).toBeDefined();
    return { marks: Number(q.marks) || 0, difficulty: difficulty as Tag };
  });
}

/** Every one of the 180 papers, built by the REAL pinned builders (as the pages build them). */
async function buildInputs(): Promise<DifficultyPaperInput[]> {
  const out: DifficultyPaperInput[] = [];
  for (const t of seriesChapterTests()) {
    await tick();
    const key = `TS-${t.code}`;
    const spec = pinnedSpecOf(key)!;
    const unserved = unservedChapterIds(spec, t.subject, t.topicKey);
    const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map();
    const built = buildPinnedChapterTest({ subject: t.subject, topicKey: t.topicKey, topicLabel: t.label, worksheetId: "w", createdAt: STAMP }, spec, raw);
    expect(built.missingIds, key).toEqual([]);
    out.push({ key, kind: "chapter", subject: t.subject, topicKey: t.topicKey, number: t.paper, questions: toQuestions(built.drawn.paper.questions, key) });
  }
  for (const m of seriesFullMocks()) {
    await tick();
    const key = `TS-${m.code}`;
    const spec = pinnedSpecOf(key)!;
    const unserved = unservedMockIds(spec, m.subject);
    const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map();
    const built = buildPinnedFullMock(m.subject, spec, { worksheetId: "w", code: "c", name: "n", createdAt: STAMP }, raw);
    expect(built.missingIds, key).toEqual([]);
    out.push({ key, kind: "mock", subject: m.subject, topicKey: null, number: m.n, questions: toQuestions(built.drawn.paper.questions, key) });
  }
  return out;
}

const stringify = (m: PaperDifficultyMap) => `${JSON.stringify(Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]])), null, 1)}\n`;

describe("TS-DIFF-1 paperDifficulty.json is derived from the pinned papers", () => {
  it("REGENERATE (LT_WRITE_TS_DIFFICULTY=1 only): writes the JSON", async () => {
    if (process.env.LT_WRITE_TS_DIFFICULTY !== "1") return;
    writeFileSync(FILE, stringify(computePaperDifficulty(await buildInputs())));
  }, 600_000);

  it("the committed JSON equals a fresh recompute from the real pinned builders + the bank (fails when stale)", async () => {
    expect(existsSync(FILE), "regenerate with LT_WRITE_TS_DIFFICULTY=1 (see the header)").toBe(true);
    const committed = readFileSync(FILE, "utf8");
    const fresh = stringify(computePaperDifficulty(await buildInputs()));
    expect(committed === fresh, "paperDifficulty.json is stale: regenerate with LT_WRITE_TS_DIFFICULTY=1 pnpm exec vitest run src/lib/testSeries/paperDifficulty.guard.test.ts").toBe(true);
  }, 600_000);

  it("covers every paper exactly once and the label shape holds (full-length tertiles per subject; chapter extremes need a wide gap)", () => {
    const map = JSON.parse(readFileSync(FILE, "utf8")) as PaperDifficultyMap;
    expect(Object.keys(map).length).toBe(seriesTotals().total);
    for (const t of seriesChapterTests()) expect(map[`TS-${t.code}`], t.code).toBeDefined();
    for (const m of seriesFullMocks()) expect(map[`TS-${m.code}`], m.code).toBeDefined();
    for (const subject of ["M", "S"]) {
      const labels = seriesFullMocks().filter((m) => m.code.startsWith(`FM-${subject}`)).map((m) => map[`TS-${m.code}`].label);
      expect(labels.filter((l) => l === "Easier").length, subject).toBe(8);
      expect(labels.filter((l) => l === "Standard").length, subject).toBe(9);
      expect(labels.filter((l) => l === "Harder").length, subject).toBe(8);
    }
    const byChapter = new Map<string, number[]>();
    const labelsBy = new Map<string, string[]>();
    for (const t of seriesChapterTests()) {
      const e = map[`TS-${t.code}`];
      byChapter.set(t.topicKey, [...(byChapter.get(t.topicKey) ?? []), e.hardPct]);
      labelsBy.set(t.topicKey, [...(labelsBy.get(t.topicKey) ?? []), e.label]);
    }
    for (const [k, pcts] of byChapter) {
      const labels = labelsBy.get(k)!;
      const gap = Math.max(...pcts) - Math.min(...pcts);
      if (gap < CHAPTER_MIN_GAP - 0.2) expect(labels.every((l) => l === "Standard"), `${k} gap ${gap}`).toBe(true);
      expect(labels.filter((l) => l === "Easier").length, k).toBeLessThanOrEqual(1);
      expect(labels.filter((l) => l === "Harder").length, k).toBeLessThanOrEqual(1);
    }
  });
});

describe("TS-DIFF-1 rules (pure)", () => {
  const q = (marks: number, difficulty: Tag): DifficultyQuestion => ({ marks, difficulty });
  it("Hard% is the Hard share of MARKS", () => {
    expect(hardPctOf([q(5, "Hard"), q(1, "Easy"), q(2, "Medium"), q(2, "Hard")])).toBeCloseTo(70, 5);
    expect(hardPctOf([])).toBe(0);
  });
  it("chapter: extremes only, only when the gap is >= 15 points and the extreme is unique", () => {
    const mk = (n: number, hard: number): DifficultyPaperInput => ({
      key: `TS-CT-X-${n}`, kind: "chapter", subject: "Maths", topicKey: "x", number: n, questions: [q(hard, "Hard"), q(100 - hard, "Easy")],
    });
    const wide = computePaperDifficulty([mk(1, 10), mk(2, 20), mk(3, 30), mk(4, 40), mk(5, 25)]);
    expect(Object.values(wide).map((e) => e.label)).toEqual(["Easier", "Standard", "Standard", "Harder", "Standard"]);
    const narrow = computePaperDifficulty([mk(1, 20), mk(2, 25), mk(3, 30), mk(4, 34), mk(5, 25)]);
    expect(Object.values(narrow).every((e) => e.label === "Standard")).toBe(true);
    const tied = computePaperDifficulty([mk(1, 10), mk(2, 10), mk(3, 30), mk(4, 40), mk(5, 25)]);
    expect(tied["TS-CT-X-1"].label).toBe("Standard");
    expect(tied["TS-CT-X-4"].label).toBe("Harder");
  });
  it("full-length: tertiles per subject, ties broken by paper number", () => {
    const papers: DifficultyPaperInput[] = Array.from({ length: 25 }, (_, i) => ({
      key: `TS-FM-M${i + 1}`, kind: "mock", subject: "Maths", topicKey: null, number: i + 1, questions: [q(10, "Hard"), q(90, "Easy")],
    }));
    const out = computePaperDifficulty(papers);
    expect(out["TS-FM-M1"].label).toBe("Easier");
    expect(out["TS-FM-M8"].label).toBe("Easier");
    expect(out["TS-FM-M9"].label).toBe("Standard");
    expect(out["TS-FM-M17"].label).toBe("Standard");
    expect(out["TS-FM-M18"].label).toBe("Harder");
    expect(out["TS-FM-M25"].label).toBe("Harder");
  });
  it("chip policy: chapter tests show the extremes only; full-length shows all three", () => {
    expect(showsChip("chapter", "Standard")).toBe(false);
    expect(showsChip("chapter", "Harder")).toBe(true);
    expect(showsChip("mock", "Standard")).toBe(true);
    expect(showsChip("mock", undefined)).toBe(false);
  });
  it("kill switch VITE_TS_DIFFICULTY_DISABLED: loader returns null", async () => {
    expect(tsDifficultyDisabled()).toBe(false);
    vi.stubEnv("VITE_TS_DIFFICULTY_DISABLED", "1");
    expect(tsDifficultyDisabled()).toBe(true);
    expect(await loadPaperDifficulty()).toBeNull();
    vi.stubEnv("VITE_TS_DIFFICULTY_DISABLED", "0");
    expect(tsDifficultyDisabled()).toBe(false);
  });
});
