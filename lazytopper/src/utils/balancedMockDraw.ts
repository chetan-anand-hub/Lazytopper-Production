// src/utils/balancedMockDraw.ts
//
// THE shared balanced-draw helper for mock-family surfaces (Full Mock now; the
// Chapter Test PYQ-mix follow-up reuses this verbatim — keep it standalone).
//
// `drawBalancedSet` draws `count` questions from a pool while aiming for a target
// PYQ share (~50% by default, tunable): the pool is split into PYQ (the shipped
// `isPYQQuestion` matcher — explicit `isPYQ` flag or a populated `pyqYear`) vs
// FRESH (authored / extracted / predicted — everything else), and each class is
// drawn up to its share. It RE-WEIGHTS the mix, it never filters a class out:
//
//   HONEST FALLBACK — too few PYQ  → take ALL the PYQ there are + fill fresh;
//                     zero PYQ     → an all-fresh draw is still a valid paper;
//                     too few fresh→ the remainder comes from the spare PYQ.
//   Nothing is padded, invented, or silently hidden; the result reports the real
//   pyq/fresh counts so a caller can SHOW the mix rather than imply one.
//
// PURE + SEEDED: all shuffling runs on a mulberry32 PRNG from the caller's `seed`,
// so the same (pool, count, fraction, seed) always draws the same set — unit-
// testable determinism. The caller mints a fresh random seed per paper to get the
// spec-required fresh draw. Read-only: the pool array and its items are never
// mutated.

import { isPYQQuestion } from "../data/practiceSetGenerator";

export interface BalancedDrawArgs<T> {
  pool: readonly T[];
  /** How many questions to draw. Clamped to the pool size (honest — never padded). */
  count: number;
  /** Target PYQ share of the draw (0..1). Default ~0.5. */
  pyqTargetFraction?: number;
  /** PRNG seed — same seed, same draw. */
  seed: number;
}

export interface BalancedDrawResult<T> {
  /** The drawn questions, shuffled (PYQ and fresh interleaved). */
  drawn: T[];
  /** Real PYQ count in the draw (honest — display this, never the target). */
  pyqDrawn: number;
  /** Real fresh (non-PYQ) count in the draw. */
  freshDrawn: number;
  /** The fraction that was aimed for (echoed for display copy). */
  pyqTargetFraction: number;
}

/** mulberry32 — tiny deterministic PRNG; good enough for a shuffle, and seeded so
 *  the draw is reproducible in tests. Not crypto — none is needed here. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates over a COPY (the input is never mutated). */
export function seededShuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw `count` items from `pool`, aiming for ~`pyqTargetFraction` PYQ, with the
 * honest fallbacks documented above. Pure, seeded, read-only.
 */
export function drawBalancedSet<T>(args: BalancedDrawArgs<T>): BalancedDrawResult<T> {
  const fraction = clampFraction(args.pyqTargetFraction ?? 0.5);
  const count = Math.max(0, Math.floor(args.count));
  const rand = mulberry32(args.seed);

  const pyq: T[] = [];
  const fresh: T[] = [];
  for (const q of args.pool) (isPYQQuestion(q) ? pyq : fresh).push(q);

  const pyqShuffled = seededShuffle(pyq, rand);
  const freshShuffled = seededShuffle(fresh, rand);

  // Aim for the target share; every shortfall in one class is honestly filled from
  // the other. The total is clamped to what the pool really holds — never padded.
  const want = Math.min(count, pyqShuffled.length + freshShuffled.length);
  // STOCHASTIC rounding of the fractional part (seeded, still deterministic):
  // callers draw many tiny cells (often want=1), where Math.round(0.5)=1 would
  // bias EVERY cell to PYQ and the aggregate mix would drift far off the target.
  // Rounding up with probability equal to the fractional part keeps the
  // aggregate at ~fraction across cells.
  const ideal = want * fraction;
  let pyqTarget = Math.floor(ideal);
  if (rand() < ideal - pyqTarget) pyqTarget += 1;
  const pyqTake = Math.min(pyqTarget, pyqShuffled.length);
  const freshTake = Math.min(want - pyqTake, freshShuffled.length);
  const pyqTopUp = Math.min(want - pyqTake - freshTake, pyqShuffled.length - pyqTake);

  const drawn = seededShuffle(
    [...pyqShuffled.slice(0, pyqTake + pyqTopUp), ...freshShuffled.slice(0, freshTake)],
    rand,
  );

  return {
    drawn,
    pyqDrawn: pyqTake + pyqTopUp,
    freshDrawn: freshTake,
    pyqTargetFraction: fraction,
  };
}

function clampFraction(f: number): number {
  if (!Number.isFinite(f)) return 0.5;
  return Math.min(1, Math.max(0, f));
}
