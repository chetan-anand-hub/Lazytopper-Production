// CBQ-1 PR-2 — the 50 / 20 / 30 balancer on SYNTHETIC pools (no bank is read, so the >= 50%
// path is proven deterministically even while the real bank is thin). Every expectation is
// recomputed here from the rows' own `competencyVerified` / `marks` — never read back from
// the balancer's report alone.

import { describe, it, expect } from "vitest";
import { balanceCbqShare, cbqTargetsFor, type CbqSlot } from "./cbqPaperBalance";

interface Row {
  id: string;
  marks: number;
  competencyVerified?: true;
  pyq: boolean;
  chapter: string;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GroupSpec {
  group: string;
  objective: boolean;
  /** Slots on the paper. */
  slots: number;
  /** Marks a row of this group can carry (one value per row, cycled). */
  marks: number[];
  cbq: number;
  plain: number;
}

const FM_SHAPE = (cbq: number, plain: number): GroupSpec[] => [
  { group: "A", objective: true, slots: 20, marks: [1], cbq, plain },
  { group: "B", objective: false, slots: 5, marks: [2], cbq, plain },
  { group: "C", objective: false, slots: 6, marks: [3], cbq, plain },
  { group: "D", objective: false, slots: 4, marks: [5], cbq, plain },
  { group: "E", objective: false, slots: 3, marks: [4], cbq, plain },
];
// Chapter Test shape: B admits 1-2 marks and D 4-5, so a swap can move the total.
const CT_SHAPE = (cbq: number, plain: number): GroupSpec[] => [
  { group: "A", objective: true, slots: 6, marks: [1], cbq, plain },
  { group: "B", objective: false, slots: 4, marks: [1, 2], cbq, plain },
  { group: "C", objective: false, slots: 3, marks: [3], cbq, plain },
  { group: "D", objective: false, slots: 2, marks: [4, 5], cbq, plain },
];

function buildPools(shape: GroupSpec[]): Map<string, Row[]> {
  const pools = new Map<string, Row[]>();
  for (const g of shape) {
    const rows: Row[] = [];
    for (let i = 0; i < g.cbq + g.plain; i += 1) {
      rows.push({
        id: `${g.group}-${i < g.cbq ? "cbq" : "plain"}-${i}`,
        marks: g.marks[i % g.marks.length],
        ...(i < g.cbq ? { competencyVerified: true as const } : {}),
        pyq: i % 3 === 0,
        chapter: `ch${i % 2}`,
      });
    }
    pools.set(g.group, rows);
  }
  return pools;
}

/** A seeded INITIAL draw, blind to CBQ (what the blueprints' balanced draw hands over). */
function initialSlots(shape: GroupSpec[], pools: Map<string, Row[]>, seed: number): CbqSlot<Row>[] {
  const rand = mulberry(seed);
  const out: CbqSlot<Row>[] = [];
  for (const g of shape) {
    const pool = [...pools.get(g.group)!];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const item of pool.slice(0, g.slots)) out.push({ group: g.group, objective: g.objective, item });
  }
  return out;
}

const run = (shape: GroupSpec[], seed: number) => {
  const pools = buildPools(shape);
  const before = initialSlots(shape, pools, seed);
  const r = balanceCbqShare({
    slots: before,
    groupPools: pools,
    keyOf: (q) => q.id,
    isPyq: (q) => q.pyq,
    affinityOf: (q) => q.chapter,
    seed,
  });
  return { pools, before, ...r };
};

/** Independent recount of a paper. */
function recount(slots: CbqSlot<Row>[]) {
  let total = 0;
  let cbq = 0;
  let cbqA = 0;
  let objective = 0;
  let plainMcq = 0;
  for (const s of slots) {
    total += s.item.marks;
    if (s.objective) objective += s.item.marks;
    if (s.item.competencyVerified === true) {
      cbq += s.item.marks;
      if (s.objective) cbqA += s.item.marks;
    } else if (s.objective) plainMcq += s.item.marks;
  }
  const target = Math.ceil(total / 2);
  return { total, cbq, cbqA, objective, plainMcq, constructed: total - cbq - plainMcq, target };
}

/** Is there an unplaced row of the wanted class in a group that holds a slot of the other class? */
function missed(slots: CbqSlot<Row>[], pools: Map<string, Row[]>, wantCbq: boolean, objective: boolean): boolean {
  const onPaper = new Set(slots.map((s) => s.item.id));
  for (const [group, pool] of pools) {
    const groupSlots = slots.filter((s) => s.group === group && s.objective === objective);
    if (!groupSlots.some((s) => (s.item.competencyVerified === true) !== wantCbq)) continue;
    if (pool.some((q) => (q.competencyVerified === true) === wantCbq && !onPaper.has(q.id))) return true;
  }
  return false;
}

/** The invariants a swap must never break. */
function expectStructureKept(before: CbqSlot<Row>[], after: CbqSlot<Row>[], pools: Map<string, Row[]>, exactMarks: boolean) {
  expect(after.length).toBe(before.length);
  after.forEach((s, i) => {
    expect(s.group).toBe(before[i].group);
    expect(s.objective).toBe(before[i].objective);
    expect(pools.get(s.group)!).toContain(s.item); // a REAL row of its own group's pool
    if (exactMarks) expect(s.item.marks).toBe(before[i].item.marks);
  });
  expect(new Set(after.map((s) => s.item.id)).size).toBe(after.length); // no repeat
}

const SEEDS = Array.from({ length: 20 }, (_, i) => (Math.imul(i + 7, 2654435761) ^ 0xcb01) >>> 0);

describe("cbqTargetsFor — CBSE Acad-30/2024: 50 / 20 / 30", () => {
  it("an 80-mark board paper: 40 CBQ marks, 16 plain MCQ marks, so 4 of Section A's 20 are CBQs", () => {
    expect(cbqTargetsFor(80, 20)).toEqual({ cbqTarget: 40, objectiveCbqTarget: 4 });
  });
  it("a ~32-mark chapter test: Section A (6) is all inside the 20% plain-MCQ share", () => {
    expect(cbqTargetsFor(32, 6)).toEqual({ cbqTarget: 16, objectiveCbqTarget: 0 });
    expect(cbqTargetsFor(27, 6)).toEqual({ cbqTarget: 14, objectiveCbqTarget: 1 });
  });
});

describe("balanceCbqShare — a rich pool meets the typology on every seed", () => {
  it("Full Mock shape (80 marks): CBQ 40-41, plain MCQ exactly 16, constructed 23-24, no shortfall", () => {
    for (const seed of SEEDS) {
      const { pools, before, slots, share } = run(FM_SHAPE(30, 30), seed);
      expectStructureKept(before, slots, pools, true);
      const c = recount(slots);
      expect(c.total).toBe(80);
      // Tolerance: questions are indivisible; with no 1-mark written row the written CBQ marks
      // can overshoot their goal by at most 1 (the smallest written question is 2 marks).
      expect(c.cbq, `seed ${seed}`).toBeGreaterThanOrEqual(40);
      expect(c.cbq, `seed ${seed}`).toBeLessThanOrEqual(41);
      expect(c.plainMcq, `seed ${seed}`).toBe(16);
      expect(c.constructed).toBe(80 - c.cbq - 16);
      // The report is the same truth.
      expect(share).toMatchObject({ totalMarks: 80, cbqMarks: c.cbq, cbqTarget: 40, cbqShortfall: 0, plainMcqMarks: 16 });
    }
  });

  it("Chapter Test shape (B 1-2, D 4-5 marks): CBQ >= half, within one question of it, plain MCQ = A - its CBQ share", () => {
    for (const seed of SEEDS) {
      const { pools, before, slots, share } = run(CT_SHAPE(30, 30), seed);
      expectStructureKept(before, slots, pools, false);
      const c = recount(slots);
      expect(c.cbq, `seed ${seed}`).toBeGreaterThanOrEqual(c.target);
      expect(c.cbq - c.target, `seed ${seed}`).toBeLessThanOrEqual(4); // < one 5-mark question
      expect(c.cbqA).toBe(cbqTargetsFor(c.total, c.objective).objectiveCbqTarget);
      expect(share.cbqShortfall).toBe(0);
      expect(share.cbqMarks).toBe(c.cbq);
    }
  });

  it("an ALL-CBQ initial draw is brought DOWN to the typology (CBQs never crowd out the 20 / 30)", () => {
    const pools = buildPools(FM_SHAPE(30, 30));
    const allCbq: CbqSlot<Row>[] = FM_SHAPE(30, 30).flatMap((g) =>
      pools.get(g.group)!.slice(0, g.slots).map((item) => ({ group: g.group, objective: g.objective, item })),
    );
    expect(recount(allCbq).cbq).toBe(80);
    const { slots } = balanceCbqShare({ slots: allCbq, groupPools: pools, keyOf: (q) => q.id, isPyq: (q) => q.pyq, seed: 5 });
    const c = recount(slots);
    expect(c.cbq).toBeGreaterThanOrEqual(40);
    expect(c.cbq).toBeLessThanOrEqual(41);
    expect(c.plainMcq).toBe(16);
  });

  it("is deterministic for a seed and varies across seeds", () => {
    const ids = (seed: number) => run(FM_SHAPE(30, 30), seed).slots.map((s) => s.item.id).join(",");
    expect(ids(11)).toBe(ids(11));
    expect(ids(11)).not.toBe(ids(12));
  });
});

describe("balanceCbqShare — HONEST top-up when the pool is thin", () => {
  it.each([
    ["no CBQ at all", 0],
    ["2 CBQs per group", 2],
    ["1 CBQ per group", 1],
  ])("Full Mock shape, %s: shortfall is EXACTLY target - real CBQ marks, and every CBQ the pool has is placed", (_label, cbq) => {
    const shape = FM_SHAPE(cbq, 30);
    // What the pool can place at most: each group's CBQs, capped by its slots.
    const placeable = shape.reduce((sum, g) => sum + Math.min(g.cbq, g.slots) * g.marks[0], 0);
    expect(placeable).toBeLessThan(40);
    for (const seed of SEEDS) {
      const { pools, before, slots, share } = run(shape, seed);
      expectStructureKept(before, slots, pools, true);
      const c = recount(slots);
      expect(c.cbq, "every CBQ in the pool is on the paper").toBe(placeable);
      expect(share.cbqShortfall).toBe(40 - c.cbq);
      expect(share.cbqMarks).toBe(c.cbq);
      // Short means NO swap could add a CBQ — derived from the pool, not a constant.
      expect(missed(slots, pools, true, true) || missed(slots, pools, true, false)).toBe(false);
      // Never relabelled: a CBQ on the paper is a CBQ row of the pool, a plain row stays plain.
      for (const s of slots) expect(pools.get(s.group)!.find((q) => q.id === s.item.id)).toBe(s.item);
    }
  });

  it("written CBQs run out, Section A has plenty: Section A takes more CBQs to reach half (plain MCQ drops below 20%)", () => {
    // Written CBQs can place 2 each: 4 + 6 + 10 + 8 = 28 marks, so Section A must carry 12.
    const shape = FM_SHAPE(30, 30).map((g) => (g.objective ? g : { ...g, cbq: 2 }));
    for (const seed of SEEDS) {
      const { pools, slots, share } = run(shape, seed);
      const c = recount(slots);
      expect(c.cbq).toBeGreaterThanOrEqual(40);
      expect(share.cbqShortfall).toBe(0);
      expect(c.cbq - c.cbqA).toBe(28);
      expect(c.plainMcq).toBe(20 - (40 - 28));
      expect(missed(slots, pools, true, false), "every written CBQ was placed first").toBe(false);
    }
  });

  it("an empty paper reports zeros, never a fake share", () => {
    const r = balanceCbqShare<Row>({ slots: [], groupPools: new Map(), keyOf: (q) => q.id, isPyq: () => false, seed: 1 });
    expect(r.share).toEqual({ totalMarks: 0, cbqMarks: 0, cbqTarget: 0, cbqShortfall: 0, plainMcqMarks: 0, constructedMarks: 0 });
  });
});
