// src/components/worksheet/worksheetShape.ts
//
// WS-DRAW-1 — how a worksheet is DRAWN, as pure, bank-free, testable functions.
//
// WHY THIS FILE EXISTS (WORKSHEET-SCOUT, D2 / D5 / D9 on #973). Before this, the draw was
//   allocateCounts (by TOPIC only)  →  shuffle each topic's pool  →  slice.
// So a "Board exam mix" had Section A at 34–40% where the paper has ~53%, Section E at about
// twice its share, 27% of rows were AI-pack rows (25 sheets ≥ 50%), and 2.3% of sheets repeated
// a question. This module decides, per worksheet:
//
//   1. SHAPE   — when more than one section is in scope and the sheet has ≥ 10 rows, the rows
//                are split BY SECTION in the proportions of the CBSE 80-mark blueprint
//                (FM_BLUEPRINT: A20 · B5 · C6 · D4 · E3), largest remainder. At 25 rows:
//                A13 · B3 · C4 · D3 · E2. Topic weighting is applied WITHIN each section.
//                A section the chosen topics cannot fill borrows from its neighbour
//                (A↔B, C↔D, E→C then D), and the move is RECORDED.
//   2. AI CAP  — at most ⌊0.30 × count⌋ rows may be AI-pack rows. Verified rows are drawn first;
//                AI rows only fill what verified supply cannot. The cap is exceeded ONLY when
//                that is the only way to keep the sheet's exact count and section shape, and the
//                excess is recorded as `aiOverCap`.
//   3. CBQ     — when ALL five sections are in scope (the Board exam mix), at least half of the
//                rows are competency-based, counted across every section. A shortfall is
//                recorded as `cbqUnder`. A "CBQ mix" sheet holds ONLY competency-based rows.
//   4. NO REPEATS — id + questionKey (the existing rule) plus a normalised-stem check.
//
// PRIORITY WHEN SUPPLY CONFLICTS (spec rule 5): exact count › section shape › CBQ ≥ 50% › AI cap.
//
// "COMPETENCY-BASED" MEANS the CBQ flag read by lib/cbq/cbqClassification (CBQ-1's single flag). The legacy
// `isCompetencyBased` is set on 75% of the served bank and is correct on fewer than half of the
// rows it flags (WS-DRAW-1 P14: 9/20 sampled), so it is NOT read here.
//
// The functions take the AI test and the CBQ test as arguments, so this file imports no data.

import { FM_BLUEPRINT } from "../fullmock/fullMockBlueprint";
import { questionKey, normaliseN1 } from "../../utils/questionKey";
import type { PracticeQuestion } from "../../data/predictionDataService";

export const SECTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

/** A sheet needs at least this many rows before it is shaped by section. */
export const SHAPE_MIN_COUNT = 10;
/** Share of a worksheet that may be AI-pack rows. */
export const AI_CAP_FRACTION = 0.3;
/** Share of a Board exam mix that must be competency-based. */
export const CBQ_TARGET_FRACTION = 0.5;
/** A stem shorter than this (normalised) is too generic to dedupe on its own. */
const MIN_STEM_KEY = 40;

/** The blueprint weight of each section (A20 B5 C6 D4 E3). */
export const SHAPE_WEIGHTS: Readonly<Record<string, number>> = Object.fromEntries(
  FM_BLUEPRINT.map((s) => [s.section, s.targetCount]),
);

/** Neighbour order for borrowing when a section cannot be filled (spec rule 1). */
const NEIGHBOURS: Readonly<Record<string, readonly string[]>> = {
  A: ["B"],
  B: ["A"],
  C: ["D"],
  D: ["C"],
  E: ["C", "D"],
};

export type DrawMode = "shaped" | "free" | "cbq-mix";

export interface DrawCell {
  topic: string;
  /** Section letter, or "*" for an unshaped (free) draw. */
  section: string;
  n: number;
  /** How many of the `n` rows must be competency-based (verified) rows. */
  cbq: number;
}

export interface Reallocation {
  from: string;
  to: string;
  n: number;
}

export interface DrawSpec {
  mode: DrawMode;
  sections: string[];
  /** The sheet's section targets after shaping and any borrowing (empty for "free"). */
  sectionTargets: Record<string, number>;
  cells: DrawCell[];
  aiCap: number;
  /** AI rows beyond the cap that the plan could not avoid (0 = cap respected). */
  aiOverCap: number;
  cbqTarget: number;
  /** CBQ rows short of the target (0 = target met, or no target for this sheet). */
  cbqUnder: number;
  reallocations: Reallocation[];
}

export interface DrawTools {
  isAi: (q: PracticeQuestion) => boolean;
  isCbq: (q: PracticeQuestion) => boolean;
  shuffle: <T>(arr: T[]) => T[];
  /** FRESH-SET-TESTS — was this row served on an earlier worksheet? Absent → no history, and
   *  the draw is exactly the WS-DRAW-1 draw. Present → a cell takes never-served verified rows,
   *  then never-served AI rows while the sheet is under its AI cap, and only then repeats. */
  isServed?: (q: PracticeQuestion) => boolean;
}

export interface TopicBudget {
  key: string;
  /** Rows this topic was allocated by the topic-level allocation. */
  allocated: number;
}

// ── helpers ─────────────────────────────────────────────────────────────────
const sectionOf = (q: PracticeQuestion): string => String(q.section || "").toUpperCase();

/** Largest-remainder split of `n` over `keys` in proportion to `weights` (deterministic). */
function largestRemainder(keys: string[], weights: number[], n: number): number[] {
  const w = weights.map((v) => Math.max(0, v));
  const sum = w.reduce((t, v) => t + v, 0);
  const eff = sum > 0 ? w : keys.map(() => 1);
  const total = eff.reduce((t, v) => t + v, 0);
  const ideal = eff.map((v) => (n * v) / total);
  const out = ideal.map((v) => Math.floor(v));
  let left = n - out.reduce((t, v) => t + v, 0);
  const order = ideal
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((x, y) => y.frac - x.frac || x.i - y.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

/** Section targets for `n` rows over `sections`, in blueprint proportions. */
export function sectionCounts(
  sections: readonly string[],
  n: number,
  boosts?: Readonly<Record<string, number>> | null,
): Record<string, number> {
  const keys = [...sections];
  const counts = largestRemainder(
    keys,
    keys.map((s) => (SHAPE_WEIGHTS[s] ?? 1) * (Number(boosts?.[s]) > 1 ? Number(boosts?.[s]) : 1)),
    n,
  );
  return Object.fromEntries(keys.map((s, i) => [s, counts[i]]));
}

/** Is this sheet shaped by section? (more than one section in scope and ≥ SHAPE_MIN_COUNT rows) */
export function isShaped(sections: readonly string[], requested: number): boolean {
  return sections.length >= 2 && requested >= SHAPE_MIN_COUNT;
}

/** WORKSHEET-FIX-2 (b): the line the ready card shows when a sheet has fewer questions than were asked for (null when it is
 *  complete, or when the request is unknown, e.g. a sheet re-opened from history). Mirrors the preview's honest-count line. */
export function readyShortfallText(got: number, asked: number | null): string | null {
  if (asked === null || !(got < asked) || got < 0) return null;
  const noun = got === 1 ? "question was" : "questions were";
  return `Only ${got} unique ${noun} available for this scope (you asked for ${asked}), so this worksheet has ${got} — honest counts, no padding.`;
}

/** The AI cap for a sheet of `n` rows. */
export function aiCapFor(n: number): number {
  return Math.floor(AI_CAP_FRACTION * n);
}

/** The CBQ target for a sheet of `n` rows. */
export function cbqTargetFor(n: number): number {
  return Math.ceil(CBQ_TARGET_FRACTION * n);
}

/** Move rows from sections that cannot be filled to their neighbours (recorded). */
export function borrowShortfalls(
  targets: Record<string, number>,
  supply: Record<string, number>,
  sections: readonly string[],
): { targets: Record<string, number>; reallocations: Reallocation[] } {
  const t = { ...targets };
  const moves: Reallocation[] = [];
  const spare = (s: string) => (supply[s] ?? 0) - (t[s] ?? 0);
  const rank = (s: string) => SECTION_LETTERS.indexOf(s as (typeof SECTION_LETTERS)[number]);
  for (const s of sections) {
    let deficit = (t[s] ?? 0) - (supply[s] ?? 0);
    if (deficit <= 0) continue;
    t[s] -= deficit;
    const order = [
      ...(NEIGHBOURS[s] ?? []).filter((x) => sections.includes(x)),
      // then anything else with room, nearest section first — the sheet is never short
      ...sections
        .filter((x) => x !== s && !(NEIGHBOURS[s] ?? []).includes(x))
        .sort((a, b) => Math.abs(rank(a) - rank(s)) - Math.abs(rank(b) - rank(s)) || rank(a) - rank(b)),
    ];
    for (const x of order) {
      if (deficit <= 0) break;
      const room = Math.min(deficit, Math.max(0, spare(x)));
      if (room <= 0) continue;
      t[x] += room;
      deficit -= room;
      moves.push({ from: s, to: x, n: room });
    }
    // Total supply exhausted: the sheet is honestly short by `deficit` (never padded).
  }
  return { targets: t, reallocations: moves };
}

/** Stem identity for the within-sheet near-duplicate check (null for a generic short stem). */
export function stemKey(q: PracticeQuestion): string | null {
  const k = normaliseN1(q.questionText);
  return k.length >= MIN_STEM_KEY ? k : null;
}

interface Counts {
  /** all rows */
  all: number;
  /** rows that are NOT AI-pack */
  ver: number;
  /** verified (non-AI) competency-based rows */
  cbq: number;
}

// ── planning ────────────────────────────────────────────────────────────────
export interface PlanDrawInput {
  pools: Map<string, PracticeQuestion[]>;
  topics: TopicBudget[];
  /** The sections in scope (letters), already resolved ("All" → all five). */
  sections: readonly string[];
  requested: number;
  cbqOnly: boolean;
  tools: Pick<DrawTools, "isAi" | "isCbq">;
  /** topic key → section letter → draw-weight multiplier (≥ 1) for the student's weak sections. */
  boosts?: Record<string, Record<string, number>> | null;
}

export interface PlannedDraw {
  spec: DrawSpec;
  /** topic key → rows this plan draws from that topic (the real per-topic allocation). */
  allocatedByTopic: Record<string, number>;
}

/**
 * Plan one worksheet's draw. Deterministic: the same pools and budgets always give the same cells;
 * only WHICH rows fill a cell is random (drawFromSpec). The topic-level allocation is the input
 * budget; it is honoured wherever supply allows and adjusted (recorded in `allocatedByTopic`)
 * only where a section cannot otherwise be filled.
 */
export function planDraw(input: PlanDrawInput): PlannedDraw {
  const { pools, topics, sections, requested, cbqOnly, tools } = input;
  const shaped = cbqOnly ? sections.length >= 2 : isShaped(sections, requested);
  const mode: DrawMode = cbqOnly ? "cbq-mix" : shaped ? "shaped" : "free";
  const cbqTargeted = !cbqOnly && shaped && sections.length === SECTION_LETTERS.length;

  // Counts per (topic, section) over the pool the sheet may draw from.
  const secKeys = shaped ? [...sections] : ["*"];
  const cnt = new Map<string, Counts>();
  const cell = (t: string, s: string) => {
    const k = `${t}|${s}`;
    let c = cnt.get(k);
    if (!c) cnt.set(k, (c = { all: 0, ver: 0, cbq: 0 }));
    return c;
  };
  for (const t of topics) {
    for (const q of pools.get(t.key) ?? []) {
      const s = shaped ? sectionOf(q) : "*";
      if (shaped && !sections.includes(s)) continue;
      const ai = tools.isAi(q);
      const c = cell(t.key, s);
      c.all += 1;
      if (!ai) {
        c.ver += 1;
        if (tools.isCbq(q)) c.cbq += 1;
      }
    }
  }
  const get = (t: string, s: string): Counts => cnt.get(`${t}|${s}`) ?? { all: 0, ver: 0, cbq: 0 };

  const supplyBySection: Record<string, number> = {};
  for (const s of secKeys) supplyBySection[s] = topics.reduce((sum, t) => sum + get(t.key, s).all, 0);
  const totalSupply = Object.values(supplyBySection).reduce((a, b) => a + b, 0);
  const requestedBudget = topics.reduce((s, t) => s + t.allocated, 0);
  const N = Math.min(requested, requestedBudget, totalSupply);

  // 1 — section targets (shape), with neighbour borrowing.
  let targets: Record<string, number>;
  let reallocations: Reallocation[] = [];
  if (shaped) {
    // The student's weak-section boost (MI) tilts the blueprint share. WORKSHEET-FIX-2 (f): weighted by each topic's share of
    // the rows this sheet draws (its allocation), so two weak topics that supply a large part of a full-subject sheet move
    // the section counts, instead of being averaged away by the 11 topics with no boost (a plain mean over all topics).
    const tilt: Record<string, number> = {};
    const allocSum = topics.reduce((a, t) => a + Math.max(0, t.allocated), 0);
    for (const s of sections) {
      const per = topics.map((t) => ({ w: allocSum > 0 ? Math.max(0, t.allocated) : 1, b: Number(input.boosts?.[t.key]?.[s]) || 1 }));
      const wSum = per.reduce((a, p) => a + p.w, 0);
      tilt[s] = wSum > 0 ? per.reduce((a, p) => a + p.w * p.b, 0) / wSum : 1;
    }
    const raw = sectionCounts(sections, N, tilt);
    const b = borrowShortfalls(raw, supplyBySection, sections);
    targets = b.targets;
    reallocations = b.reallocations;
  } else {
    targets = { "*": N };
  }

  // 2 — fill the topic × section matrix. Sections with the least supply first.
  const budget = new Map(topics.map((t) => [t.key, t.allocated]));
  const x = new Map<string, number>();
  const xv = (t: string, s: string) => x.get(`${t}|${s}`) ?? 0;
  const order = [...secKeys].sort((a, b) => supplyBySection[a] - supplyBySection[b]);
  for (const s of order) {
    let need = targets[s] ?? 0;
    const give = (t: string, n: number) => {
      if (n <= 0) return;
      x.set(`${t}|${s}`, xv(t, s) + n);
      budget.set(t, (budget.get(t) ?? 0) - n);
      need -= n;
    };
    const weightOf = (t: TopicBudget, extra: number) => {
      const boost = Number(input.boosts?.[t.key]?.[s]);
      return Math.max(0, (budget.get(t.key) ?? 0)) * (boost > 0 ? boost : 1) + extra;
    };
    // pass 1: verified rows only, by remaining topic budget
    const pass = (cap: (t: TopicBudget) => number, w: (t: TopicBudget) => number) => {
      if (need <= 0) return;
      const rows = topics.map((t) => ({ t, cap: Math.max(0, cap(t)), w: w(t) }));
      const capSum = rows.reduce((a, r) => a + r.cap, 0);
      const target = Math.min(need, capSum);
      if (target <= 0) return;
      const alloc = largestRemainderCapped(rows.map((r) => r.w), rows.map((r) => r.cap), target);
      rows.forEach((r, i) => give(r.t.key, alloc[i]));
    };
    pass(
      (t) => Math.min(budget.get(t.key) ?? 0, get(t.key, s).ver - xv(t.key, s)),
      (t) => weightOf(t, 0),
    );
    // pass 2: AI rows too, still within each topic's remaining budget
    pass(
      (t) => Math.min(budget.get(t.key) ?? 0, get(t.key, s).all - xv(t.key, s)),
      (t) => weightOf(t, 0),
    );
    // pass 3: budgets exhausted but the section still needs rows — verified first, then any
    pass((t) => get(t.key, s).ver - xv(t.key, s), (t) => 1 + weightOf(t, 0));
    pass((t) => get(t.key, s).all - xv(t.key, s), (t) => 1 + weightOf(t, 0));
  }

  // 3 — the AI cap: move AI draws to topics that still have verified rows in the same section.
  const aiCap = aiCapFor(N);
  const aiUsed = () => {
    let a = 0;
    for (const t of topics) for (const s of secKeys) a += Math.max(0, xv(t.key, s) - get(t.key, s).ver);
    return a;
  };
  let guard = 0;
  while (aiUsed() > aiCap && guard++ < 10_000) {
    let moved = false;
    for (const s of secKeys) {
      const from = topics.find((t) => xv(t.key, s) > get(t.key, s).ver);
      const to = topics.find((t) => get(t.key, s).ver - xv(t.key, s) > 0);
      if (from && to && from.key !== to.key) {
        x.set(`${from.key}|${s}`, xv(from.key, s) - 1);
        x.set(`${to.key}|${s}`, xv(to.key, s) + 1);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  const aiOverCap = Math.max(0, aiUsed() - aiCap);

  // 4 — CBQ quotas per cell.
  const cells: DrawCell[] = [];
  for (const t of topics) {
    for (const s of secKeys) {
      const n = xv(t.key, s);
      if (n > 0) cells.push({ topic: t.key, section: s, n, cbq: 0 });
    }
  }
  const cbqTarget = cbqTargeted ? cbqTargetFor(N) : 0;
  if (cbqOnly) {
    for (const c of cells) c.cbq = c.n; // every row is competency-based
  } else if (cbqTargeted) {
    const room = (c: DrawCell) => Math.min(get(c.topic, c.section).cbq, Math.min(c.n, get(c.topic, c.section).ver));
    for (const c of cells) c.cbq = Math.min(room(c), Math.ceil(Math.min(c.n, get(c.topic, c.section).ver) / 2));
    let have = cells.reduce((a, c) => a + c.cbq, 0);
    for (const c of [...cells].sort((a, b) => room(b) - b.cbq - (room(a) - a.cbq))) {
      while (have < cbqTarget && c.cbq < room(c)) {
        c.cbq += 1;
        have += 1;
      }
    }
  }
  const cbqHave = cells.reduce((a, c) => a + c.cbq, 0);
  const cbqUnder = cbqTargeted ? Math.max(0, cbqTarget - cbqHave) : 0;

  const allocatedByTopic: Record<string, number> = {};
  for (const t of topics) allocatedByTopic[t.key] = secKeys.reduce((a, s) => a + xv(t.key, s), 0);

  return {
    spec: {
      mode,
      sections: [...sections],
      sectionTargets: shaped ? targets : {},
      cells,
      aiCap,
      aiOverCap,
      cbqTarget,
      cbqUnder,
      reallocations,
    },
    allocatedByTopic,
  };
}

/** Largest-remainder split of `n` by weight, each share capped at `caps[i]`. */
function largestRemainderCapped(weights: number[], caps: number[], n: number): number[] {
  const out = caps.map(() => 0);
  let left = n;
  // iterate: distribute by weight over the still-open entries, cap, repeat
  for (let round = 0; round < caps.length + 2 && left > 0; round += 1) {
    const open = caps.map((_, i) => i).filter((i) => out[i] < caps[i]);
    if (open.length === 0) break;
    const w = open.map((i) => weights[i]);
    const share = largestRemainder(open.map(String), w, left);
    let placed = 0;
    open.forEach((i, k) => {
      const add = Math.min(share[k], caps[i] - out[i]);
      out[i] += add;
      placed += add;
    });
    left -= placed;
    if (placed === 0) break;
  }
  return out;
}

// ── drawing ─────────────────────────────────────────────────────────────────
/**
 * Draw the rows for a planned worksheet. Within each cell: competency-based verified rows first
 * (up to the cell's quota), then the other verified rows, then AI-pack rows. A row that repeats
 * an id, a questionKey or a long normalised stem already in the sheet is skipped; a cell left
 * short is topped up from the same section (any topic), then the neighbouring sections, so the
 * sheet keeps its exact count whenever the pools hold enough distinct rows.
 */
export function drawFromSpec(
  spec: DrawSpec,
  pools: Map<string, PracticeQuestion[]>,
  tools: DrawTools,
): PracticeQuestion[] {
  const seenId = new Set<string>();
  const seenKey = new Set<string>();
  const seenStem = new Set<string>();
  const out: PracticeQuestion[] = [];
  const total = spec.cells.reduce((a, c) => a + c.n, 0);

  const fresh = (q: PracticeQuestion): boolean => {
    if (seenId.has(q.id)) return false;
    if (seenKey.has(questionKey(q))) return false;
    const st = stemKey(q);
    return !(st && seenStem.has(st));
  };
  const take = (q: PracticeQuestion) => {
    seenId.add(q.id);
    seenKey.add(questionKey(q));
    const st = stemKey(q);
    if (st) seenStem.add(st);
    out.push(q);
  };
  const candidates = (topic: string | null, section: string): { cbq: PracticeQuestion[]; ver: PracticeQuestion[]; ai: PracticeQuestion[] } => {
    const cbq: PracticeQuestion[] = [];
    const ver: PracticeQuestion[] = [];
    const ai: PracticeQuestion[] = [];
    const keys = topic ? [topic] : [...pools.keys()];
    for (const k of keys) {
      for (const q of pools.get(k) ?? []) {
        if (section !== "*" && sectionOf(q) !== section) continue;
        if (tools.isAi(q)) ai.push(q);
        else if (tools.isCbq(q)) cbq.push(q);
        else ver.push(q);
      }
    }
    return { cbq: tools.shuffle(cbq), ver: tools.shuffle(ver), ai: tools.shuffle(ai) };
  };

  // FRESH-SET-TESTS: the AI-cap headroom the plan left unused (rows it planned as AI are its own).
  let spareAi = Math.max(
    0,
    spec.aiCap -
      spec.cells.reduce((sum, c) => {
        const { cbq, ver } = candidates(c.topic, c.section);
        return sum + Math.max(0, c.n - (ver.length + cbq.length));
      }, 0),
  );
  for (const c of spec.cells) {
    const { cbq, ver, ai } = candidates(c.topic, c.section);
    let got = 0;
    const pick = (list: PracticeQuestion[], limit: number) => {
      for (const q of list) {
        if (got >= limit) break;
        if (fresh(q)) {
          take(q);
          got += 1;
        }
      }
    };
    pick(cbq, c.cbq);
    // the rest of the cell: other verified rows and the not-yet-used CBQ rows, mixed, then AI
    const rest = tools.shuffle([...ver, ...cbq.filter((q) => !seenId.has(q.id))]);
    const isServed = tools.isServed;
    if (isServed) {
      // FRESH-SET-TESTS: an unseen AI row before a repeated verified row — only up to the AI rows
      // this cell was planned to take plus the sheet's spare AI-cap headroom, so the cap holds.
      pick(rest.filter((q) => !isServed(q)), c.n);
      const plannedAi = Math.max(0, c.n - (ver.length + cbq.length));
      const before = got;
      pick(ai.filter((q) => !isServed(q)), Math.min(c.n, got + plannedAi + spareAi));
      spareAi -= Math.max(0, got - before - plannedAi);
    }
    pick(rest, c.n);
    pick(ai, c.n);
  }

  // Top-up: a dedupe skip (or a pool that shrank) can leave a section short. Fill it from the SAME
  // section first (any topic), then its neighbours (A↔B, C↔D, E→C, D), so the shape moves as little
  // as the neighbour rule allows; the sheet keeps its exact count whenever the pools hold enough.
  if (out.length < total) {
    const drawn: Record<string, number> = {};
    for (const q of out) drawn[spec.mode === "free" ? "*" : sectionOf(q)] = (drawn[spec.mode === "free" ? "*" : sectionOf(q)] ?? 0) + 1;
    const want = spec.mode === "free" ? { "*": total } : spec.sectionTargets;
    const short = Object.keys(want).filter((s) => (drawn[s] ?? 0) < (want[s] ?? 0));
    // `limit` = the rows this call may still add (the section's own gap): a fill for one short section must not also
    // cover another short section's gap (WORKSHEET-FIX-2 d).
    const fillFrom = (s: string, limit = Number.POSITIVE_INFINITY) => {
      const { cbq, ver, ai } = candidates(null, s);
      const lists = spec.mode === "cbq-mix" ? [cbq] : [tools.shuffle([...ver, ...cbq]), ai];
      let added = 0;
      for (const list of lists) {
        for (const q of list) {
          if (out.length >= total || added >= limit) return;
          if (fresh(q)) {
            take(q);
            added += 1;
          }
        }
      }
    };
    for (const s of short) {
      for (const k of [s, ...(NEIGHBOURS[s] ?? [])]) {
        if (out.length < total && (drawn[s] ?? 0) < (want[s] ?? 0)) {
          const before = out.length;
          fillFrom(k, (want[s] ?? 0) - (drawn[s] ?? 0));
          drawn[s] = (drawn[s] ?? 0) + (out.length - before);
        }
      }
    }
    // last resort: anything in scope (never leaves the sheet short while the pools hold rows)
    if (out.length < total) for (const s of spec.mode === "free" ? ["*"] : spec.sections) fillFrom(s);
  }
  return tools.shuffle(out);
}
