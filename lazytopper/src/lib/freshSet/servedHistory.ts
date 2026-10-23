// src/lib/freshSet/servedHistory.ts
//
// FRESH-SET-TESTS — "every Chapter Test, Full Mock and Worksheet a student takes is a
// unique set, not a repeat of what they've had" (owner requirement, 2026-10-23).
//
// WHAT IS "SERVED". A question is served once it has been put in front of the student on
// one of these surfaces. The record of that comes from TWO places, both of which already
// existed before this lane except the small device log:
//
//   1. The durable SESSION RECORDS (`sessionRecords/{uid}/records`, mirrored to the device
//      by `getSessionRecordsFromCloud` / `loadLocalSessionRecords`). Every Chapter Test,
//      Full Mock and Worksheet record already carries `questionIds` ("powers the uniqueness
//      seen-set", sessionRecords §1c) and `gradedAt`. This is the cross-device source; this
//      lane adds NO Firestore collection and NO Firestore write.
//   2. A DEVICE-ONLY served log (localStorage, this file). A paper is logged when it is
//      started, downloaded or generated, so a paper the student abandoned before submitting
//      still counts, and a signed-out student (no records at all) still gets fresh sets.
//
// HOW A DRAW USES IT. `preferUnserved` narrows one blueprint cell's pool to the questions
// never served before. When that cell's unserved pool is too small, the shortfall is filled
// with the LEAST-RECENTLY-served questions first, so the cell keeps its exact count and the
// blueprint is never bent to avoid a repeat. `countRepeats` then reports how many rows of
// the final paper were served before, so the page copy can say so honestly.
//
// SEEDED, NEVER Math.random (CLAUDE.md §7): `mintDrawSeed` hashes the owner, surface, scope,
// an attempt counter and the clock into the 32-bit seed every blueprint already takes, so a
// draw is reproducible in tests (pass the seed) and different per attempt in the product.
//
// Pure apart from the localStorage helpers, which are best-effort and never throw.

/** The surfaces whose sets must not repeat. Quick Practice is a separate lane (FRESH-SET-QP). */
export type ServedSurface = "chapter-test" | "full-mock" | "worksheet";

/** question id -> the last time (ms epoch) it was served on the surface. */
export type ServedAt = ReadonlyMap<string, number>;

export const EMPTY_SERVED: ServedAt = new Map<string, number>();

/** One logged paper on this device. */
export interface ServedEntry {
  surface: ServedSurface;
  /** Chapter slug (Chapter Test / single-topic Worksheet), subject (Full Mock, multi-topic Worksheet). */
  scope: string;
  ids: string[];
  /** ms epoch the paper was served. */
  at: number;
}

/** The fields of a session record this module reads (SessionRecord satisfies it). */
export interface ServedRecordLike {
  surface: string;
  questionIds?: readonly string[] | null;
  gradedAt?: number | null;
}

const STORE_PREFIX = "lt.servedHistory.v1";
/** Ring size per device owner — far more papers than a student takes in a year. */
const MAX_ENTRIES = 400;

/** The device log is kept per signed-in uid; a signed-out student shares one device bucket. */
export function servedOwner(uid?: string | null): string {
  return uid ? `uid:${uid}` : "device";
}

function storageKey(owner: string): string {
  return `${STORE_PREFIX}:${owner}`;
}

function isEntry(x: unknown): x is ServedEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Partial<ServedEntry>;
  return (
    typeof e.surface === "string" &&
    typeof e.scope === "string" &&
    Array.isArray(e.ids) &&
    typeof e.at === "number" &&
    Number.isFinite(e.at)
  );
}

/** This device's served log for an owner (newest last). Never throws; [] on any failure. */
export function loadServedLog(owner: string): ServedEntry[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = window.localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/**
 * Log one served paper on this device. Idempotent per (surface, scope, id set): logging the
 * same paper again (start after download, a re-render) refreshes its time, never duplicates.
 * Best-effort: a full or blocked storage never breaks the paper.
 */
export function recordServed(
  owner: string,
  entry: { surface: ServedSurface; scope: string; ids: readonly string[]; at?: number },
): void {
  const ids = [...new Set(entry.ids.filter((id) => typeof id === "string" && id.length > 0))];
  if (ids.length === 0) return;
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const sig = [...ids].sort().join("|");
    const log = loadServedLog(owner).filter(
      (e) => !(e.surface === entry.surface && e.scope === entry.scope && [...e.ids].sort().join("|") === sig),
    );
    log.push({ surface: entry.surface, scope: entry.scope, ids, at: entry.at ?? Date.now() });
    window.localStorage.setItem(storageKey(owner), JSON.stringify(log.slice(-MAX_ENTRIES)));
  } catch {
    /* best-effort */
  }
}

/**
 * The served map for one surface: every question id this student has been served there,
 * with the LATEST time it was served — from the session records (cross-device) and this
 * device's log. Question ids are chapter- and subject-specific, so a map built over the
 * whole surface excludes exactly the ids a chapter's (or subject's) draw could repeat.
 */
export function servedAtFor(args: {
  surface: ServedSurface;
  records?: readonly ServedRecordLike[] | null;
  log?: readonly ServedEntry[] | null;
}): Map<string, number> {
  const out = new Map<string, number>();
  const note = (id: string, at: number) => {
    if (!id) return;
    const prev = out.get(id);
    if (prev === undefined || at > prev) out.set(id, at);
  };
  for (const r of args.records ?? []) {
    if (r.surface !== args.surface || !Array.isArray(r.questionIds)) continue;
    const at = Number(r.gradedAt) || 0;
    for (const id of r.questionIds) note(String(id), at);
  }
  for (const e of args.log ?? []) {
    if (e.surface !== args.surface) continue;
    for (const id of e.ids) note(id, e.at);
  }
  return out;
}

/** How many earlier papers this device logged for a scope — the attempt counter in the seed. */
export function attemptsLogged(log: readonly ServedEntry[], surface: ServedSurface, scope: string): number {
  return log.filter((e) => e.surface === surface && e.scope === scope).length;
}

/** FNV-1a over a string — a stable 32-bit hash. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The 32-bit draw seed for one paper: owner + surface + scope + attempt counter + clock.
 * Reproducible when `now` is pinned (tests); different per attempt in the product.
 */
export function mintDrawSeed(args: {
  owner: string;
  surface: ServedSurface;
  scope: string;
  attempt: number;
  now?: number;
}): number {
  const now = args.now ?? Date.now();
  return hash32(`${args.owner}|${args.surface}|${args.scope}|${args.attempt}|${now}`);
}

let fallbackDraws = 0;
/**
 * The seed for a caller that passes none (unit tests, older callers): a per-process draw
 * counter, hashed. Different on every call, reproducible run to run, and it reads neither the
 * clock nor Math.random. Every product page passes `mintDrawSeed` instead.
 */
export function fallbackDrawSeed(salt: string): number {
  fallbackDraws += 1;
  return hash32(`${salt}|fallback|${fallbackDraws}`);
}

/** mulberry32 — the same tiny PRNG the blueprints use (balancedMockDraw / cbqPaperBalance). */
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

/** Seeded Fisher–Yates over a copy. */
export function seededShuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Seeded shuffle, then never-served rows first, then served rows least-recently-served first.
 * A caller that takes the first N of this order takes fresh questions while any remain and
 * only then the oldest repeats. With an empty served map it is a plain seeded shuffle.
 */
export function freshnessOrder<T>(
  arr: readonly T[],
  rand: () => number,
  servedAt: ServedAt,
  idOf: (q: T) => string,
): T[] {
  const shuffled = seededShuffle(arr, rand);
  if (servedAt.size === 0) return shuffled;
  const fresh: T[] = [];
  const served: T[] = [];
  for (const q of shuffled) (servedAt.has(idOf(q)) ? served : fresh).push(q);
  // Array.prototype.sort is stable, so equal times keep the shuffled order.
  served.sort((a, b) => (servedAt.get(idOf(a)) ?? 0) - (servedAt.get(idOf(b)) ?? 0));
  return [...fresh, ...served];
}

/**
 * Narrow ONE blueprint cell's pool for a draw of `count`.
 *   - Enough never-served rows (counted by distinct `keyOf`) → only those (no repeat possible).
 *   - Too few → every never-served row PLUS the least-recently-served rows needed to make
 *     the count up, so the cell keeps its exact size and the blueprint holds.
 * `repeatsForced` is how many served rows had to be admitted. With an empty served map the
 * pool is returned unchanged (byte-identical draw for the same seed).
 */
export function preferUnserved<T>(args: {
  pool: readonly T[];
  count: number;
  servedAt: ServedAt;
  idOf: (q: T) => string;
  /** Set-level identity (questionKey) — two ids of one question count once. */
  keyOf?: (q: T) => string;
  rand: () => number;
}): { candidates: T[]; repeatsForced: number } {
  const { pool, servedAt, idOf } = args;
  if (servedAt.size === 0) return { candidates: pool.slice(), repeatsForced: 0 };
  const keyOf = args.keyOf ?? idOf;
  const fresh: T[] = [];
  const served: T[] = [];
  for (const q of pool) (servedAt.has(idOf(q)) ? served : fresh).push(q);
  const freshKeys = new Set(fresh.map(keyOf));
  const need = Math.max(0, Math.floor(args.count)) - freshKeys.size;
  if (need <= 0) return { candidates: fresh, repeatsForced: 0 };
  const fill: T[] = [];
  const fillKeys = new Set<string>();
  for (const q of freshnessOrder(served, args.rand, servedAt, idOf)) {
    if (fillKeys.size >= need) break;
    const k = keyOf(q);
    if (freshKeys.has(k) || fillKeys.has(k)) continue;
    fillKeys.add(k);
    fill.push(q);
  }
  return { candidates: [...fresh, ...fill], repeatsForced: fill.length };
}

/**
 * The freshness rank `balanceCbqShare` takes (`preferOf`): never-served rows rank highest, then
 * served rows least-recently-served first. Ranks are compared, never mixed with marks.
 */
export function freshnessRank<T>(servedAt: ServedAt, idOf: (q: T) => string): (q: T) => number {
  return (q: T) => {
    const at = servedAt.get(idOf(q));
    return at === undefined ? Number.MAX_SAFE_INTEGER : -at;
  };
}

/** The share (0..1) of a scope's pool the student has already been served (distinct ids). */
export function servedShare(poolIds: Iterable<string>, servedAt: ServedAt): number {
  const ids = new Set(poolIds);
  if (ids.size === 0 || servedAt.size === 0) return 0;
  let n = 0;
  for (const id of ids) if (servedAt.has(id)) n += 1;
  return n / ids.size;
}

/** At or above this share served, "you've done most of this chapter" is a true sentence. */
export const MOST_SERVED_SHARE = 0.75;

/** How many of a paper's question ids were served before. */
export function countRepeats(ids: readonly string[], servedAt: ServedAt): number {
  if (servedAt.size === 0) return 0;
  return ids.filter((id) => servedAt.has(id)).length;
}

/**
 * The honest freshness line for a drawn paper. `null` = nothing to claim (no history yet, or
 * nothing drawn — the page then makes no "different from your last" claim either).
 *   - repeats, and >= 75% of the scope already served → "You've done most of this chapter's…".
 *   - repeats otherwise → names the count and the true cause: the unseen questions of the
 *     section(s) those rows came from ran out (the blueprint keeps each section's size).
 *   - no repeats, with history → "Every question is new".
 * Wording is shared by the three surfaces so they never drift apart.
 */
export function freshnessLine(args: {
  repeats: number;
  total: number;
  hasHistory: boolean;
  /** Share of the chapter's / subject's pool already served (0..1) — gates "most of". */
  servedShare: number;
  /** Distinct sections the repeated rows sit in (wording only: "that section" / "those sections"). */
  repeatSections: number;
  /** "chapter" for Chapter Test / Worksheet, "subject" for Full Mock. */
  scopeNoun: "chapter" | "subject";
  /** "test" | "mock" | "worksheet". */
  setNoun: string;
}): { tone: "fresh" | "repeats"; text: string } | null {
  if (args.total <= 0) return null;
  const n = args.repeats;
  if (n > 0) {
    if (args.servedShare >= MOST_SERVED_SHARE) {
      return {
        tone: "repeats",
        text:
          `You've done most of this ${args.scopeNoun}'s questions — ${n} repeat${n === 1 ? "" : "s"} ` +
          `from your earlier ${args.setNoun}s ${n === 1 ? "is" : "are"} mixed in.`,
      };
    }
    return {
      tone: "repeats",
      text:
        `${n} question${n === 1 ? " repeats" : "s repeat"} from your earlier ${args.setNoun}s — the unseen ones ` +
        `in ${args.repeatSections > 1 ? "those sections" : "that section"} ran out.`,
    };
  }
  if (!args.hasHistory) return null;
  return { tone: "fresh", text: `Every question is new — none were in your earlier ${args.setNoun}s.` };
}
