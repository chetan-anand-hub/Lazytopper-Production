// PracticePage — MLT-MUTE-2 · every filtered set is drawn from the WHOLE chapter, in EVERY chapter.
//
// Owner ruling 2026-10-22 (19:34 IST): the fix must hold for every bank chapter of BOTH subjects.
// The page's draw is a count-sized SAMPLE (the board blueprint), and every narrowing the draw does
// not fully apply ran over that sample: Real Numbers + Proof + count 30 drew 30 and kept 6 while
// the chapter serves 44 proofs, and #1295's end-of-bank note then said the bank had run out.
//
// Over the REAL bank (every BANK_CHAPTER_SLUGS chapter, Maths and Science), with the page's own
// pure functions (no render, so the sweep stays fast):
//   fullCount = matches of questionMatchesFilters over the chapter's whole served pool
//   NEW  = selectInRangeFromPool over mergeWithServedPool(draw, served) — the page's pool
//   OLD  = selectInRangeFromPool over the draw alone (the trunk page), recorded to size the bug
// and it asserts NEW displays min(fullCount, requested), shouldShowBankEnd is true exactly when
// 0 < fullCount < requested, and the pre-build "N available" hint equals fullCount, for:
//   1. style [proof ar hots case] x source [all pyq ncert others] x diff [all Easy Medium Hard], at 30;
//   2. a Topic Hub concept row's exact marks range (marksMin/marksMax, marks UI "all"), at 10 and 30;
//   3. a Weak Area difficulty PRESET (`difficulty=X`, no chip), Easy / Medium / Hard at 12 and 30;
//   4. multi-topic and Full subject (every chapter of a subject), narrow filters at 30.
// The draw is the page's board path for marks "all" (five per-section engine calls through
// buildPracticeQuestionsWithAiTopup + takeBlueprintShare), mirrored here call-for-call.
//
// RED on trunk: mergeWithServedPool / shouldShowBankEnd / preBuildAvailable / servedRowsForDraw do
// not exist; and the OLD selection under-delivers (pinned below, so the sweep can see the bug).
// CLOCK: PredictionCore reads the year; Date is pinned (as cbqChapterFloor.test.ts).

import { describe, it, expect, vi, beforeAll } from "vitest";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T06:00:00.000Z"));
});

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));

import {
  questionMatchesFilters,
  selectInRangeFromPool,
  mergeWithServedPool,
  servedRowsForDraw,
  shouldShowBankEnd,
  preBuildAvailable,
  needsFullPool,
} from "./PracticePage";
import {
  buildPracticeQuestionsWithAiTopup,
  buildChapterServedPool,
  resolvePracticePackKey,
  type DifficultyChoice,
  type SubjectKey,
} from "../components/practice/practiceQuestionBuilder";
import { takeBlueprintShare } from "../components/practice/blueprintTake";
import { mergeMultiTopicDeep } from "../components/practice/multiTopicPractice";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import {
  BANK_CHAPTER_SLUGS,
  BANK_CHAPTER_SUBJECT,
  ensureAllBankChapters,
  type BankChapterSlug,
} from "../data/bankChapters/loader";
import type { PracticeQuestion } from "../data/predictionDataService";

type Range = { min: number; max: number } | null;
const STYLES = ["proof", "ar", "hots", "case"] as const;
const SOURCES = ["all", "pyq", "ncert", "others"] as const;
const DIFFS = ["all", "Easy", "Medium", "Hard"] as const;
const RANGES: Array<{ min: number; max: number }> = [
  { min: 1, max: 1 }, { min: 2, max: 2 }, { min: 3, max: 3 }, { min: 4, max: 4 }, { min: 5, max: 5 },
  { min: 2, max: 3 }, { min: 3, max: 5 },
];
const BLUEPRINT: Array<{ section: "A" | "B" | "C" | "D" | "E"; share: number }> = [
  { section: "A", share: 0.30 },
  { section: "B", share: 0.20 },
  { section: "C", share: 0.20 },
  { section: "D", share: 0.20 },
  { section: "E", share: 0.10 },
];

/** The page's single-topic board draw (marks "all"), call-for-call. The draw depends only on the
 *  count, whether the source is PYQ (pyqOnly) and the ENGINE difficulty — never on the style. */
async function pageBoardDraw(subjectKey: SubjectKey, slug: string, count: number, pyq: boolean, engineDiff: string): Promise<PracticeQuestion[]> {
  const topicLabel = practiceTopicLabel(subjectKey, slug);
  const packTopicKey = resolvePracticePackKey({ subjectKey, topicParam: slug, explicitTopicKey: null });
  const difficulty: DifficultyChoice = engineDiff === "all" ? "All" : (engineDiff as DifficultyChoice);
  const sectionResults = await Promise.all(
    BLUEPRINT.map(({ section, share }) =>
      buildPracticeQuestionsWithAiTopup({
        grade: "10",
        subjectKey,
        topicLabel,
        packTopicKey,
        count: Math.max(1, Math.round(count * share)),
        difficulty,
        sectionFilter: section,
        pyqOnly: pyq || undefined,
        seenQuestionIds: new Set<string>(),
      }),
    ),
  );
  return takeBlueprintShare(
    BLUEPRINT.map(({ section, share }, i) => ({ section, share, questions: sectionResults[i] ?? [] })),
    count,
    (q) => String(q.questionText || "").trim().toLowerCase().slice(0, 80),
  );
}

type Row = {
  kind: "filter" | "range" | "preset" | "multi";
  slug: string; filter: string; requested: number;
  full: number; oldShown: number; newShown: number; note: boolean; hint: number;
};

const rows: Row[] = [];
const servedBySlug = new Map<string, PracticeQuestion[]>();
const labelOf = (slug: BankChapterSlug) => practiceTopicLabel(BANK_CHAPTER_SUBJECT[slug] as SubjectKey, slug);

function record(
  base: Omit<Row, "oldShown" | "newShown" | "note" | "full">,
  pools: { draw: PracticeQuestion[]; served: PracticeQuestion[]; fullPool: PracticeQuestion[] },
  f: { marks: string; style: string; source: string; diff: string; range: Range },
) {
  const match = (q: PracticeQuestion) => questionMatchesFilters(q, f.marks, f.style, f.source, f.diff, f.range);
  const full = pools.fullPool.filter(match).length;
  const oldSel = selectInRangeFromPool(pools.draw, f.marks, f.style, f.source, f.diff, f.range, base.requested);
  const merged = mergeWithServedPool(pools.draw, pools.served);
  // The page passes the draw's length as the head (its matching rows lead; the tail rotates).
  const newSel = selectInRangeFromPool(merged, f.marks, f.style, f.source, f.diff, f.range, base.requested, undefined, undefined, pools.draw.length);
  rows.push({
    ...base,
    full,
    oldShown: oldSel.displayed.length,
    newShown: newSel.displayed.length,
    note: shouldShowBankEnd(newSel.displayed.length, newSel.available, base.requested),
  });
}

beforeAll(async () => {
  await ensureAllBankChapters();
  for (const slug of BANK_CHAPTER_SLUGS) {
    const subjectKey = BANK_CHAPTER_SUBJECT[slug] as SubjectKey;
    const label = labelOf(slug);
    const served = buildChapterServedPool({ subjectKey, topicKey: label });
    servedBySlug.set(slug, served);

    // 1 — style x source x diff chips, at 30.
    for (const diff of DIFFS) {
      for (const pyq of [false, true]) {
        const draw = await pageBoardDraw(subjectKey, slug, 30, pyq, diff);
        for (const source of SOURCES) {
          if ((source === "pyq") !== pyq) continue;
          for (const style of STYLES) {
            const hint = preBuildAvailable(subjectKey, [label], "all", style, source, diff, null);
            record(
              { kind: "filter", slug, filter: `${style}/${source}/${diff}`, requested: 30, hint },
              { draw, served, fullPool: served },
              { marks: "all", style, source, diff, range: null },
            );
          }
        }
      }
    }

    // 2 — a concept row's exact marks range (marks UI "all"), at 10 and 30.
    for (const requested of [10, 30]) {
      const draw = await pageBoardDraw(subjectKey, slug, requested, false, "all");
      for (const range of RANGES) {
        const hint = preBuildAvailable(subjectKey, [label], "all", "all", "all", "all", range);
        record(
          { kind: "range", slug, filter: `marks ${range.min}-${range.max}`, requested, hint },
          { draw, served, fullPool: served },
          { marks: "all", style: "all", source: "all", diff: "all", range },
        );
      }
    }

    // 3 — a difficulty PRESET (no chip): the builder enforces it on the draw; the served rows that
    // join are held to it by servedRowsForDraw; the selection itself runs with diff "all".
    for (const preset of ["Easy", "Medium", "Hard"] as const) {
      for (const requested of [12, 30]) {
        const draw = await pageBoardDraw(subjectKey, slug, requested, false, preset);
        const hint = preBuildAvailable(subjectKey, [label], "all", "all", "all", preset, null);
        record(
          { kind: "preset", slug, filter: `difficulty=${preset}`, requested, hint },
          { draw, served: servedRowsForDraw(served, preset), fullPool: servedRowsForDraw(served, preset) },
          { marks: "all", style: "all", source: "all", diff: "all", range: null },
        );
      }
    }
  }

  // 4 — multi-topic (two chapters) and Full subject (every chapter of the subject), at 30. The
  // page's multi-topic served pool is the per-chapter served pools interleaved (mergeMultiTopicDeep);
  // it is merged behind the draw, so the draw is taken as empty here (a lower bound on the pool).
  const bySubject = (s: string) => BANK_CHAPTER_SLUGS.filter((x) => BANK_CHAPTER_SUBJECT[x] === s);
  for (const subject of ["Maths", "Science"] as const) {
    const all = bySubject(subject);
    for (const [name, slugs] of [["pair", all.slice(0, 2)], ["full-subject", all]] as const) {
      const served = mergeMultiTopicDeep({
        pools: slugs.map((s) => ({ key: s, questions: servedBySlug.get(s) ?? [] })),
        offset: 0,
      });
      for (const style of STYLES) {
        for (const source of ["all", "pyq"] as const) {
          const hint = preBuildAvailable(subject, slugs.map(labelOf), "all", style, source, "all", null);
          record(
            { kind: "multi", slug: `${subject}:${name}`, filter: `${style}/${source}/all`, requested: 30, hint },
            { draw: [], served, fullPool: served },
            { marks: "all", style, source, diff: "all", range: null },
          );
        }
      }
    }
  }

  if (process.env.MLT_SWEEP_REPORT) {
    const under = rows.filter((r) => r.kind !== "multi" && r.oldShown < Math.min(r.full, r.requested));
    process.stdout.write(`\nMLT_SWEEP_REPORT ${JSON.stringify(under)}\n`);
  }
}, 600000);

describe("MLT-MUTE-2 · every chapter, every filtered entry: the set is drawn from the whole chapter", () => {
  it("★ covers every bank chapter of both subjects, for every kind of entry", () => {
    const single = rows.filter((r) => r.kind !== "multi");
    expect(new Set(single.map((r) => r.slug)).size).toBe(BANK_CHAPTER_SLUGS.length);
    expect(new Set(BANK_CHAPTER_SLUGS.map((s) => BANK_CHAPTER_SUBJECT[s]))).toEqual(new Set(["Maths", "Science"]));
    const n = BANK_CHAPTER_SLUGS.length;
    expect(rows.filter((r) => r.kind === "filter")).toHaveLength(n * STYLES.length * SOURCES.length * DIFFS.length);
    expect(rows.filter((r) => r.kind === "range")).toHaveLength(n * RANGES.length * 2);
    expect(rows.filter((r) => r.kind === "preset")).toHaveLength(n * 3 * 2);
    expect(rows.filter((r) => r.kind === "multi")).toHaveLength(2 * 2 * STYLES.length * 2);
  });

  it("★★ the page displays min(full-pool matches, requested) for every chapter x entry", () => {
    expect(rows.filter((r) => r.newShown !== Math.min(r.full, r.requested))).toEqual([]);
  });

  it("★★ the end-of-bank note shows exactly when the pool has 1..requested-1 matches", () => {
    expect(rows.filter((r) => r.note !== (r.full > 0 && r.full < r.requested))).toEqual([]);
  });

  it("★★ the pre-build \"N available\" hint equals the full-pool count", () => {
    expect(rows.filter((r) => r.hint !== r.full)).toEqual([]);
  });

  it("★ every one of these entries takes the full-pool route; the board / default set does not", () => {
    expect(needsFullPool("proof", "all", "all", null, "All")).toBe(true);
    expect(needsFullPool("all", "pyq", "all", null, "All")).toBe(true);
    expect(needsFullPool("all", "all", "Hard", null, "Hard")).toBe(true);
    expect(needsFullPool("all", "all", "all", { min: 3, max: 5 }, "All")).toBe(true);
    expect(needsFullPool("all", "all", "all", null, "Easy")).toBe(true);
    expect(needsFullPool("all", "all", "all", null, "All")).toBe(false);
  });

  it("★ the sweep can see the bug: the OLD sample-then-filter under-delivers in every kind of single-topic entry", () => {
    const under = (k: Row["kind"]) => rows.filter((r) => r.kind === k && r.oldShown < Math.min(r.full, r.requested));
    expect(under("filter").length).toBeGreaterThan(0);
    expect(under("range").length).toBeGreaterThan(0);
    expect(under("preset").length).toBeGreaterThan(0);
    const rnProof = rows.find((r) => r.slug === "real-numbers" && r.filter === "proof/all/all");
    expect(rnProof && rnProof.oldShown < rnProof.newShown).toBe(true);
  });
});
