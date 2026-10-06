// src/lib/cbq/cbqPaperBalance.ts
//
// CBQ-1 PR-2 — the CBSE 50 / 20 / 30 marks typology for a drawn paper (Chapter Test, Full Mock).
//
// CBSE Circular No. Acad-30/2024 (3 April 2024, Classes IX-X; the latest restatement found —
// it names 2024-25, no later circular changes it):
//   https://cbseacademic.nic.in/web_material/Circulars/2024/30_Circular_2024.pdf
//   "Competency Focused Questions in the form of MCQs/Case Based Questions, Source-based
//    Integrated Questions or any other type = 50%"
//   "Select response type questions (MCQ) = 20%"
//   "Constructed response questions (Short Answer Questions/Long Answer Questions) = 30%"
//
// WHAT THIS DOES. A blueprint draws its paper exactly as before (section counts, Full Mock
// unit marks, Section A key bar, no-repeat, PYQ/fresh mix, syllabus-guarded chapters). This
// module then REBALANCES the CBQ share by SWAPS INSIDE ONE GROUP — a group is a set of
// slots whose questions are interchangeable without breaking any invariant (Chapter Test:
// one board section; Full Mock: one section x one CBSE unit, where every question carries
// the section's exact marks, so a swap keeps the unit's marks and the section's count).
// A swap only ever exchanges a drawn row for another REAL row of the same group's eligible
// pool, so every invariant the draw held still holds; nothing is relabelled or padded.
//
// THE TARGET (marks of the paper actually drawn, T):
//   CBQ marks                >= ceil(T / 2)                          (CBSE: 50%)
//   plain MCQ (Section A, not CBQ)  ~ round(T / 5)                   (CBSE: 20%)
//   constructed (B.., not CBQ)      = the rest                       (CBSE: ~30%)
// So Section A keeps round(T/5) plain MCQ marks and the rest of A may be CBQs (Full Mock:
// 20 - 16 = 4 one-mark CBQs); the written sections carry the remaining CBQ marks.
// Questions are indivisible, so the CBQ marks may exceed the target by less than one
// question's marks (the split is pinned to that tolerance).
//
// HONEST TOP-UP. When a group runs out of CBQs it keeps its real non-CBQ rows, the other
// sections are asked first, and whatever is still missing is REPORTED (`cbqShortfall`).
// The legend says so; a non-CBQ is never relabelled.
//
// Pure and seeded (mulberry32 from the caller's seed): same input, same paper.

import { isCbq, type CbqRowLike } from "./cbqClassification";

/** CBSE's competency share of a Class X paper's marks (Acad-30/2024). */
export const CBSE_CBQ_SHARE = 0.5;
/** CBSE's select-response (plain MCQ) share (Acad-30/2024). */
export const CBSE_SELECT_RESPONSE_SHARE = 0.2;
/** CBSE's constructed-response (short / long answer) share (Acad-30/2024). */
export const CBSE_CONSTRUCTED_SHARE = 0.3;

/** One question slot of a drawn paper. */
export interface CbqSlot<T> {
  /** Swap group: slots whose questions are interchangeable without breaking an invariant. */
  group: string;
  /** True for the select-response (objective, Section A) group. */
  objective: boolean;
  item: T;
}

/** The paper's real CBQ share, as drawn. Every number counts real rows. */
export interface CbqShare {
  /** Marks of the paper. */
  totalMarks: number;
  /** Marks carried by CBQs (isCbq). */
  cbqMarks: number;
  /** ceil(50% of totalMarks). */
  cbqTarget: number;
  /** max(0, cbqTarget - cbqMarks) — > 0 only when the pool has no CBQ left to place. */
  cbqShortfall: number;
  /** Section A (select-response) marks that are NOT CBQs. */
  plainMcqMarks: number;
  /** Written-section (constructed-response) marks that are NOT CBQs. */
  constructedMarks: number;
}

export interface BalanceCbqArgs<T extends CbqRowLike> {
  slots: readonly CbqSlot<T>[];
  /** Every ELIGIBLE row per group (drawn ones included). Only these may swap in. */
  groupPools: ReadonlyMap<string, readonly T[]>;
  /** The no-repeat key (questionKey) — a row whose key is already on the paper never swaps in. */
  keyOf: (q: T) => string;
  /** PYQ class — a swap prefers a replacement of the same class (keeps the PYQ/fresh mix). */
  isPyq: (q: T) => boolean;
  /** Optional affinity (Full Mock: the chapter) — a swap prefers the same affinity. */
  affinityOf?: (q: T) => string;
  seed: number;
}

/** The 50 / 20 / 30 targets for a paper of `totalMarks` with `objectiveMarks` in Section A. */
export function cbqTargetsFor(totalMarks: number, objectiveMarks: number): {
  cbqTarget: number;
  /** CBQ marks Section A should carry: what is left of A above the plain-MCQ 20%. */
  objectiveCbqTarget: number;
} {
  const cbqTarget = Math.ceil(totalMarks * CBSE_CBQ_SHARE);
  const plainMcq = Math.round(totalMarks * CBSE_SELECT_RESPONSE_SHARE);
  return { cbqTarget, objectiveCbqTarget: Math.max(0, Math.min(cbqTarget, objectiveMarks - plainMcq)) };
}

const marksOf = (q: CbqRowLike): number => {
  const m = Number(q.marks);
  return Number.isFinite(m) && m > 0 ? m : 0;
};

/** The real CBQ share of a set of slots. */
export function cbqShareOf<T extends CbqRowLike>(slots: readonly CbqSlot<T>[]): CbqShare {
  let totalMarks = 0;
  let cbqMarks = 0;
  let plainMcqMarks = 0;
  let constructedMarks = 0;
  for (const s of slots) {
    const m = marksOf(s.item);
    totalMarks += m;
    if (isCbq(s.item)) cbqMarks += m;
    else if (s.objective) plainMcqMarks += m;
    else constructedMarks += m;
  }
  const { cbqTarget } = cbqTargetsFor(totalMarks, 0);
  return {
    totalMarks,
    cbqMarks,
    cbqTarget,
    cbqShortfall: Math.max(0, cbqTarget - cbqMarks),
    plainMcqMarks,
    constructedMarks,
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rebalance a drawn paper toward the CBSE 50 / 20 / 30 typology by swaps inside a group.
 * Returns the slots (same length, same groups, same order — a swapped slot keeps its
 * position) and the real share.
 */
export function balanceCbqShare<T extends CbqRowLike>(
  args: BalanceCbqArgs<T>,
): { slots: CbqSlot<T>[]; share: CbqShare } {
  const slots = args.slots.map((s) => ({ ...s }));
  const rand = mulberry32(args.seed ^ 0xcb0c0de);
  // A seeded rank per row breaks ties, so different papers swap different rows.
  const tieRank = new Map<T, number>();
  const rankOf = (q: T): number => {
    let r = tieRank.get(q);
    if (r === undefined) {
      r = rand();
      tieRank.set(q, r);
    }
    return r;
  };

  const onPaper = new Set<string>(slots.map((s) => args.keyOf(s.item)));

  const state = () => {
    let total = 0;
    let objective = 0;
    let cbqObjective = 0;
    let cbqWritten = 0;
    for (const s of slots) {
      const m = marksOf(s.item);
      total += m;
      if (s.objective) objective += m;
      if (isCbq(s.item)) {
        if (s.objective) cbqObjective += m;
        else cbqWritten += m;
      }
    }
    return { total, objective, cbqObjective, cbqWritten, ...cbqTargetsFor(total, objective) };
  };

  type Swap = { slot: number; incoming: T; score: number[] };
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
  };

  /**
   * The best swap that puts a CBQ in (`up`) or takes one out (`!up`) of a slot whose
   * `objective` flag matches, or null. `want` = marks of change still wanted (a candidate
   * whose CBQ marks fit inside it is preferred, so the target is not overshot).
   * `accept` vetoes a swap (the down direction must never cross a target).
   */
  const bestSwap = (
    objective: boolean,
    up: boolean,
    want: number,
    accept: (outM: number, inM: number) => boolean,
  ): Swap | null => {
    let best: Swap | null = null;
    slots.forEach((s, i) => {
      if (s.objective !== objective || isCbq(s.item) === up) return;
      const outQ = s.item;
      const outM = marksOf(outQ);
      for (const cand of args.groupPools.get(s.group) ?? []) {
        if (isCbq(cand) !== up) continue;
        // No repeat on the paper (the drawn row's own key is on it too, so it never swaps for itself).
        if (onPaper.has(args.keyOf(cand))) continue;
        const inM = marksOf(cand);
        if (!accept(outM, inM)) continue;
        const delta = up ? inM : outM;
        const score = [
          delta <= want ? 1 : 0,
          delta <= want ? delta : -delta,
          inM === outM ? 1 : 0,
          args.affinityOf && args.affinityOf(cand) === args.affinityOf(outQ) ? 1 : 0,
          args.isPyq(cand) === args.isPyq(outQ) ? 1 : 0,
          rankOf(outQ) + rankOf(cand),
        ];
        if (!best || better(score, best.score)) best = { slot: i, incoming: cand, score };
      }
    });
    return best;
  };

  const apply = (sw: Swap) => {
    onPaper.delete(args.keyOf(slots[sw.slot].item));
    onPaper.add(args.keyOf(sw.incoming));
    slots[sw.slot] = { ...slots[sw.slot], item: sw.incoming };
  };

  type State = ReturnType<typeof state>;
  const cbqOf = (st: State) => st.cbqObjective + st.cbqWritten;
  // Every inner loop moves one CBQ count strictly in one direction, so each terminates.
  const guard = slots.length * 4 + 8;
  let swaps = 0;
  const runWhile = (cond: (st: State) => boolean, next: (st: State) => Swap | null) => {
    let st = state();
    for (let n = 0; n < guard && cond(st); n += 1) {
      const sw = next(st);
      if (!sw) return;
      apply(sw);
      swaps += 1;
      st = state();
    }
  };
  /** Would the written sections still take one more CBQ? */
  const writtenCanRise = () => bestSwap(false, true, Infinity, () => true) !== null;

  // ROUNDS TO A FIXED POINT. A Chapter Test swap can move the paper's total marks (B is 1-2,
  // D is 4-5), and the targets are shares of that total, so the steps repeat until a whole
  // round makes no swap. At that point every target is met or its pool is exhausted
  // (chapterTestBlueprint.cbq.test.ts / fullMockBlueprint.cbq.test.ts pin exactly that).
  for (let round = 0; round < 8; round += 1) {
    const before = swaps;

    // 1) Section A toward its share: the CBQ marks above the plain-MCQ 20%.
    runWhile(
      (st) => st.cbqObjective < st.objectiveCbqTarget,
      (st) => bestSwap(true, true, st.objectiveCbqTarget - st.cbqObjective, () => true),
    );
    runWhile(
      (st) => st.cbqObjective > st.objectiveCbqTarget,
      (st) => {
        let canRise: boolean | undefined; // computed once per step, only if needed
        return bestSwap(true, false, st.cbqObjective - st.objectiveCbqTarget, (outM, inM) => {
          const total = st.total - outM + inM;
          const t = cbqTargetsFor(total, st.objective - outM + inM);
          if (st.cbqObjective - outM < t.objectiveCbqTarget) return false;
          // Never open a shortfall the written sections cannot close (step 3 would only
          // put the CBQ back: no ping-pong).
          if (cbqOf(st) - outM >= t.cbqTarget) return true;
          if (canRise === undefined) canRise = writtenCanRise();
          return canRise;
        });
      },
    );

    // 2) Written sections: the paper's CBQ marks toward exactly half.
    runWhile(
      (st) => cbqOf(st) < st.cbqTarget,
      (st) => bestSwap(false, true, st.cbqTarget - cbqOf(st), () => true),
    );
    runWhile(
      (st) => cbqOf(st) > st.cbqTarget,
      (st) =>
        bestSwap(false, false, cbqOf(st) - st.cbqTarget, (outM, inM) =>
          cbqOf(st) - outM >= cbqTargetsFor(st.total - outM + inM, st.objective).cbqTarget,
        ),
    );

    // 3) Still short of half (the written pool ran out): Section A takes more CBQs.
    runWhile(
      (st) => cbqOf(st) < st.cbqTarget,
      (st) => bestSwap(true, true, st.cbqTarget - cbqOf(st), () => true),
    );

    if (swaps === before) break;
  }

  return { slots, share: cbqShareOf(slots) };
}
