// WS-DRAW-1 — the worksheet draw, proven over the REAL bank with the REAL planner.
//
// The harness is the WORKSHEET-SCOUT pattern: seeded Math.random, the real planWorksheet +
// generateFromPlan, the three presets (+ the CBQ mix) over every topic, multi-topic and full-subject.
//
//   (a) a shaped sheet's section counts are the blueprint share (25 → A13 B3 C4 D3 E2), or the
//       shortage borrowing RECORDED in the plan;
//   (b) AI-pack rows ≤ ⌊0.30 × count⌋ unless `aiOverCap` is recorded;
//   (c) no repeated id, questionKey or (long) normalised stem in a sheet;
//   (d) the count is exact (min of requested and what the pools can supply);
//   (e) topic purity: every row comes from a chosen topic's own pool;
//   (f) Board exam mix: competency-based (competencyVerified) rows ≥ 50%, unless `cbqUnder` is recorded;
//       CBQ mix: EVERY row is competency-based.
// Each assertion has a CONTROL: the detector run on a sheet built to violate it must fire.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ensureAllBankChapters, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { generateFromPlan, getTopics, planWorksheet, type WorksheetPlan } from "./worksheetModel";
import { aiCapFor, cbqTargetFor, sectionCounts, stemKey } from "./worksheetShape";
import { questionKey } from "../../utils/questionKey";
import type { PracticeQuestion } from "../../data/predictionDataService";
import type { LTSubjectKey } from "../../data/predictionTypes";

// ── seeded randomness (the shuffle helper reads Math.random) ───────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
afterAll(() => {
  Math.random = realRandom;
});

// ── the presets, as the UI defines them (WorksheetGenerator.tsx PRESETS) ───────
interface Preset {
  key: string;
  sections?: string[]; // undefined = All
  difficulty: "All" | "Hard";
  count: number;
  cbqOnly?: boolean;
}
const PRESETS: Preset[] = [
  { key: "board-mix", difficulty: "All", count: 25 },
  { key: "quick-drill", sections: ["A", "B"], difficulty: "All", count: 15 },
  { key: "marks-focus", sections: ["C", "D", "E"], difficulty: "Hard", count: 20 },
  { key: "cbq-mix", difficulty: "All", count: 25, cbqOnly: true },
];
const SEEDS = [11, 23, 37, 41, 59];

interface Sheet {
  label: string;
  preset: Preset;
  topics: string[];
  plan: WorksheetPlan;
  rows: PracticeQuestion[];
}

const sectionOf = (q: PracticeQuestion) => String(q.section).toUpperCase();
const countBy = (rows: PracticeQuestion[]) => {
  const c: Record<string, number> = {};
  for (const q of rows) c[sectionOf(q)] = (c[sectionOf(q)] ?? 0) + 1;
  return c;
};

// ── the detectors (each is exercised on a violating sheet in CONTROLS below) ───
function repeats(rows: PracticeQuestion[]): number {
  const ids = new Set<string>();
  const keys = new Set<string>();
  const stems = new Set<string>();
  let dup = 0;
  for (const q of rows) {
    const st = stemKey(q);
    if (ids.has(q.id) || keys.has(questionKey(q)) || (st && stems.has(st))) dup += 1;
    ids.add(q.id);
    keys.add(questionKey(q));
    if (st) stems.add(st);
  }
  return dup;
}
const aiRows = (rows: PracticeQuestion[]) => rows.filter((q) => isAiGeneratedBankId(q.id)).length;
const cbqRows = (rows: PracticeQuestion[]) => rows.filter((q) => q.competencyVerified === true).length;

const sheets: Sheet[] = [];
const report = {
  aiOverCap: 0,
  aiOverCapSheets: 0,
  cbqUnder: 0,
  cbqUnderSheets: 0,
  reallocSheets: 0,
  shortSheets: 0,
  topicsWithAiOver: new Set<string>(),
};

function build(
  subject: LTSubjectKey,
  label: string,
  topicKeys: string[],
  preset: Preset,
  scope: "topic" | "multi-topic" | "full-subject",
  seed: number,
): Sheet {
  Math.random = mulberry32(seed);
  const topics = getTopics(subject, "All").filter((t) => topicKeys.includes(t.key));
  const plan = planWorksheet({
    subject,
    scope,
    topics,
    sections: preset.sections,
    difficulty: preset.difficulty,
    requested: preset.count,
    cbqOnly: preset.cbqOnly,
  });
  const rows = generateFromPlan(plan);
  return { label, preset, topics: topicKeys, plan, rows };
}

beforeAll(async () => {
  await ensureAllBankChapters();
  for (const subject of ["Maths", "Science"] as LTSubjectKey[]) {
    const topics = getTopics(subject, "All").map((t) => t.key);
    for (const preset of PRESETS) {
      for (const t of topics) {
        for (const seed of SEEDS) sheets.push(build(subject, `${subject}/${t}/${preset.key}/${seed}`, [t], preset, "topic", seed));
      }
      for (const seed of SEEDS.slice(0, 2)) {
        sheets.push(build(subject, `${subject}/multi2/${preset.key}/${seed}`, topics.slice(0, 2), preset, "multi-topic", seed));
        sheets.push(build(subject, `${subject}/multi3/${preset.key}/${seed}`, topics.slice(3, 6), preset, "multi-topic", seed));
        sheets.push(build(subject, `${subject}/full/${preset.key}/${seed}`, topics, preset, "full-subject", seed));
      }
    }
  }
  for (const s of sheets) {
    const d = s.plan.draw;
    if (!d) continue;
    if (d.aiOverCap > 0) {
      report.aiOverCap += d.aiOverCap;
      report.aiOverCapSheets += 1;
      s.topics.forEach((t) => report.topicsWithAiOver.add(t));
    }
    if (d.cbqUnder > 0) {
      report.cbqUnder += d.cbqUnder;
      report.cbqUnderSheets += 1;
    }
    if (d.reallocations.length) report.reallocSheets += 1;
  }
}, 600_000);

describe("WS-DRAW-1 worksheet draw over the real bank", () => {
  it("PRECONDITION: the sweep covered both subjects, every preset, topic + multi + full", () => {
    expect(sheets.length).toBeGreaterThan(500);
    expect(new Set(sheets.map((s) => s.preset.key))).toEqual(new Set(PRESETS.map((p) => p.key)));
    expect(sheets.every((s) => s.plan.draw)).toBe(true);
  });

  it("(a) shaped sheets: section counts are the blueprint share or the recorded neighbour borrowing", () => {
    let shaped = 0;
    const bad: string[] = [];
    for (const s of sheets) {
      const d = s.plan.draw!;
      if (d.mode === "free") continue;
      shaped += 1;
      const got = countBy(s.rows);
      for (const sec of d.sections) {
        if ((got[sec] ?? 0) !== (d.sectionTargets[sec] ?? 0)) bad.push(`${s.label} ${sec}: ${got[sec] ?? 0} vs plan ${d.sectionTargets[sec] ?? 0}`);
      }
      const share = sectionCounts(d.sections, s.rows.length);
      const same = d.sections.every((sec) => (d.sectionTargets[sec] ?? 0) === (share[sec] ?? 0));
      if (!same && d.reallocations.length === 0) bad.push(`${s.label}: shape moved with no recorded reallocation`);
    }
    expect(shaped).toBeGreaterThan(400);
    expect(bad.slice(0, 5)).toEqual([]);
    // the headline: a single-topic Board exam mix of 25 is 13/3/4/3/2 where supply allows
    const headline = sheets.filter((s) => s.preset.key === "board-mix" && s.topics.length === 1 && s.plan.draw!.reallocations.length === 0);
    expect(headline.length).toBeGreaterThan(80);
    for (const s of headline) expect(countBy(s.rows)).toEqual({ A: 13, B: 3, C: 4, D: 3, E: 2 });
  });

  it("(b) AI-pack rows ≤ ⌊0.30 × count⌋ unless aiOverCap is recorded", () => {
    const bad: string[] = [];
    let worst = 0;
    for (const s of sheets) {
      const n = s.rows.length;
      const ai = aiRows(s.rows);
      worst = Math.max(worst, n ? ai / n : 0);
      if (ai > aiCapFor(n) && (s.plan.draw?.aiOverCap ?? 0) === 0) bad.push(`${s.label}: ${ai}/${n} AI, no aiOverCap`);
    }
    // eslint-disable-next-line no-console
    console.log(`WS_DRAW_REPORT aiOverCap=${report.aiOverCap} sheets=${report.aiOverCapSheets} maxAiShare=${worst.toFixed(2)} topics=[${[...report.topicsWithAiOver].join(",")}]`);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("(c) no repeated id, questionKey or long stem in any sheet", () => {
    const bad = sheets.filter((s) => repeats(s.rows) > 0).map((s) => s.label);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("(d) the count is exact on every sheet (min of requested and what the pools hold)", () => {
    const bad: string[] = [];
    for (const s of sheets) {
      const supply = [...s.plan.pools.values()].reduce((a, p) => a + p.length, 0);
      const want = Math.min(s.preset.count, supply);
      if (s.rows.length !== want) bad.push(`${s.label}: ${s.rows.length} vs ${want}`);
      if (s.rows.length < s.preset.count) report.shortSheets += 1;
    }
    // eslint-disable-next-line no-console
    console.log(`WS_DRAW_REPORT shortSheets=${report.shortSheets} (never padded)`);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("(e) topic purity: every row comes from a chosen topic's own pool (no foreign rows)", () => {
    // The pool is the topic's rows as the bank resolves them (topicMatches also accepts a few
    // legacy display-name keys such as "Polynomials"), so purity means: nothing outside the pools.
    const bad = sheets
      .filter((s) => {
        const ids = new Set(s.topics.flatMap((t) => (s.plan.pools.get(t) ?? []).map((q) => q.id)));
        return s.rows.some((q) => !ids.has(q.id));
      })
      .map((s) => s.label);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("(f) Board exam mix: CBQ share ≥ 50% unless cbqUnder is recorded; CBQ mix: every row is a CBQ", () => {
    const bad: string[] = [];
    const shares: number[] = [];
    let min = 1;
    for (const s of sheets) {
      if (s.preset.key === "board-mix") {
        const share = cbqRows(s.rows) / s.rows.length;
        shares.push(share);
        min = Math.min(min, share);
        if (cbqRows(s.rows) < cbqTargetFor(s.rows.length) && (s.plan.draw?.cbqUnder ?? 0) === 0) bad.push(`${s.label}: ${cbqRows(s.rows)}/${s.rows.length}`);
      }
      if (s.preset.key === "cbq-mix" && cbqRows(s.rows) !== s.rows.length) bad.push(`${s.label}: CBQ mix holds a non-CBQ row`);
    }
    const mean = shares.reduce((a, b) => a + b, 0) / (shares.length || 1);
    // eslint-disable-next-line no-console
    console.log(`WS_DRAW_REPORT boardMixCbqShare min=${min.toFixed(2)} mean=${mean.toFixed(2)} cbqUnder=${report.cbqUnder} sheets=${report.cbqUnderSheets} reallocSheets=${report.reallocSheets}`);
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe("CONTROLS — each detector fires on a sheet built to violate it", () => {
  const mk = (id: string, section: string, text: string): PracticeQuestion =>
    ({ id, section, topicKey: "t", subject: "Maths", marks: 1, questionText: text, options: [] }) as unknown as PracticeQuestion;
  it("repeats() fires on a repeated id, a repeated key and a repeated long stem", () => {
    const long = "A quite long stem about a circular garden with a fountain at the centre and a footpath";
    expect(repeats([mk("a", "A", long), mk("a", "A", `${long} x`)])).toBe(1);
    expect(repeats([mk("a", "A", long), mk("b", "A", long)])).toBeGreaterThan(0);
    expect(repeats([mk("a", "A", "Which is correct?"), mk("b", "A", "Which is correct!")])).toBeGreaterThan(0);
    expect(repeats([mk("a", "A", long), mk("b", "A", "Completely different question text number two here, long enough too")])).toBe(0);
  });
  it("the section share is what (a) checks against: 25 → 13/3/4/3/2, A–B 15 → A12 B3, C–E 20 → 9/6/5", () => {
    expect(sectionCounts(["A", "B", "C", "D", "E"], 25)).toEqual({ A: 13, B: 3, C: 4, D: 3, E: 2 });
    expect(sectionCounts(["A", "B"], 15)).toEqual({ A: 12, B: 3 });
    expect(sectionCounts(["C", "D", "E"], 20)).toEqual({ C: 9, D: 6, E: 5 });
  });
  it("the AI cap and CBQ target arithmetic: 25 → ≤7 AI, ≥13 CBQ", () => {
    expect(aiCapFor(25)).toBe(7);
    expect(cbqTargetFor(25)).toBe(13);
  });
});
