// FRESH-SET-QP — the SERVED history and the freshness order of a practice draw.
//
// OWNER REQUIREMENT: "Every time a student comes to a Quick Practice set, he is given a unique
// set" (and a new set after finishing one). Before this module the draw only knew which questions
// had been ANSWERED (the practiceInsights attempts stream). A question that was SHOWN and skipped
// was never recorded, so re-entering without answering handed back the identical set.
//
// This module is surface-neutral on purpose: Quick Practice is its first caller, and Chapter Test,
// Full Mock and Worksheet (lane FRESH-SET-TESTS) can reuse it as is. It knows nothing about pages.
//
// ── STORAGE ───────────────────────────────────────────────────────────────────────────────────
// Per user, per chapter, a BOUNDED list of the most recently served bank ids with the time each was
// last served (`SERVED_HISTORY_CAP`, most recent kept). It lives on the device (localStorage, keyed
// by uid or "anonymous") and, for a real signed-in account, is mirrored to the student's OWN
// practiceInsights tree (`practiceInsights/{uid}/servedHistory/{chapter}`) — the existing
// collection and the existing device + Firestore mirror pattern; no new collection, no rule change.
// Signed-out students keep the device copy only. The cloud copy is read back and merged into the
// device copy, so a phone and a laptop share one history. Every read and write degrades honestly:
// a failure only makes the history shorter (a less-fresh draw), never a wrong or invented question.
// Nothing here is premium or trial state.
//
// ── THE FRESHNESS ORDER (the rule every draw follows) ─────────────────────────────────────────
//   tier 0  never served and never answered        — always first
//   tier 1  served but not answered, least recent first
//   tier 2  answered, least recent first
// A repeat (tier 1 or 2) is used only when the scoped pool has no tier-0 question left.
// `refreshSectionDraw` keeps a preset's SHAPE while it does this: a slot holding a repeat is given
// the freshest question of the SAME SECTION, preferring the same difficulty, then the adjacent
// difficulty, then any difficulty — BEFORE it would keep an answered question.
// Deterministic: no Math.random (CLAUDE.md §7). Order ties fall back to the pool's own order.

import { isFirestoreEnabled, withFirestore } from "../../services/firestoreSdk";

export interface ServedEntry {
  /** The bank question id. */
  id: string;
  /** When it was last served (ms since epoch). */
  at: number;
}

/** How many served ids are kept per user per chapter (most recent kept). A Board-mix set is 8, so
 *  this is ~37 sets of history; the largest chapters hold ~600 questions. */
export const SERVED_HISTORY_CAP = 300;

const DEVICE_KEY_PREFIX = "lt:qpServed:v1";
/** The practiceInsights sub-collection the cloud mirror lives in. */
export const SERVED_HISTORY_COLLECTION = "servedHistory";

function chapterKey(chapter: string): string {
  return String(chapter || "").trim().toLowerCase();
}

function deviceKey(uid: string | null | undefined, chapter: string): string {
  return `${DEVICE_KEY_PREFIX}:${uid && uid.trim() ? uid : "anonymous"}:${chapterKey(chapter)}`;
}

function sanitize(raw: unknown): ServedEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ServedEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const id = String((e as { id?: unknown }).id ?? "").trim();
    const at = Number((e as { at?: unknown }).at);
    if (id && Number.isFinite(at)) out.push({ id, at });
  }
  return out;
}

/** Union of served lists: each id once at its LATEST time, oldest first, capped to the most recent. */
export function mergeServedEntries(...lists: ReadonlyArray<readonly ServedEntry[]>): ServedEntry[] {
  const latest = new Map<string, number>();
  for (const list of lists) {
    for (const e of list) {
      const prev = latest.get(e.id);
      if (prev === undefined || e.at > prev) latest.set(e.id, e.at);
    }
  }
  const all = [...latest.entries()].map(([id, at]) => ({ id, at }));
  all.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return all.length > SERVED_HISTORY_CAP ? all.slice(all.length - SERVED_HISTORY_CAP) : all;
}

/** The device copy for one chapter ([] when absent, unreadable or outside a browser). */
export function readServedDevice(uid: string | null | undefined, chapter: string): ServedEntry[] {
  if (typeof window === "undefined" || !chapterKey(chapter)) return [];
  try {
    const raw = window.localStorage.getItem(deviceKey(uid, chapter));
    return raw ? mergeServedEntries(sanitize(JSON.parse(raw))) : [];
  } catch {
    return [];
  }
}

function writeServedDevice(uid: string | null | undefined, chapter: string, entries: ServedEntry[]): void {
  if (typeof window === "undefined" || !chapterKey(chapter)) return;
  try {
    window.localStorage.setItem(deviceKey(uid, chapter), JSON.stringify(entries));
  } catch {
    /* honest degrade: a full or blocked store only shortens the history */
  }
}

/** True for an account whose data may be mirrored to the cloud (a real signed-in Firebase user). */
function canMirror(uid: string | null | undefined, isLocalSession?: boolean): uid is string {
  return !!uid && uid !== "anonymous" && !isLocalSession && isFirestoreEnabled();
}

/**
 * Record that `ids` were SERVED (shown in a built set) at `at`. Device first; then, only for a real
 * signed-in student (the auth check), the merged list is mirrored to their own practiceInsights tree.
 */
export function recordServed(args: {
  uid: string | null | undefined;
  isLocalSession?: boolean;
  chapter: string;
  ids: readonly string[];
  at: number;
}): ServedEntry[] {
  const ids = args.ids.map((id) => String(id || "").trim()).filter(Boolean);
  if (ids.length === 0 || !chapterKey(args.chapter)) return [];
  const merged = mergeServedEntries(
    readServedDevice(args.uid, args.chapter),
    ids.map((id) => ({ id, at: args.at })),
  );
  writeServedDevice(args.uid, args.chapter, merged);
  if (canMirror(args.uid, args.isLocalSession)) {
    const uid = args.uid;
    void withFirestore(({ fs, db }) =>
      fs.setDoc(
        fs.doc(db, "practiceInsights", uid, SERVED_HISTORY_COLLECTION, chapterKey(args.chapter)),
        { entries: merged, updatedAt: new Date(args.at).toISOString() },
      ),
    ).catch(() => {
      /* honest degrade: the device copy still holds it */
    });
  }
  return merged;
}

/**
 * The cloud copy for one chapter, merged INTO the device copy (so the next device write carries both
 * devices' history). Returns the merged list. A signed-out / local session, a disabled cloud or a
 * failed read returns the device copy unchanged.
 */
export async function syncServedFromCloud(args: {
  uid: string | null | undefined;
  isLocalSession?: boolean;
  chapter: string;
}): Promise<ServedEntry[]> {
  const device = readServedDevice(args.uid, args.chapter);
  if (!canMirror(args.uid, args.isLocalSession)) return device;
  const uid = args.uid;
  try {
    const snap = await withFirestore(({ fs, db }) =>
      fs.getDoc(fs.doc(db, "practiceInsights", uid, SERVED_HISTORY_COLLECTION, chapterKey(args.chapter))),
    );
    const data = snap.exists() ? (snap.data() as { entries?: unknown }) : undefined;
    const cloud = sanitize(data?.entries);
    if (cloud.length === 0) return device;
    const merged = mergeServedEntries(readServedDevice(args.uid, args.chapter), cloud);
    writeServedDevice(args.uid, args.chapter, merged);
    return merged;
  } catch {
    return device;
  }
}

// ── The freshness index ───────────────────────────────────────────────────────────────────────

export interface FreshnessIndex {
  /** id → when it was last SERVED. */
  served: ReadonlyMap<string, number>;
  /** id → when it was last ANSWERED. */
  answered: ReadonlyMap<string, number>;
}

export const EMPTY_FRESHNESS: FreshnessIndex = { served: new Map(), answered: new Map() };

export type FreshTier = 0 | 1 | 2;

/** 0 = never served or answered; 1 = served, not answered; 2 = answered. */
export function freshTier(ix: FreshnessIndex, id: string): FreshTier {
  if (ix.answered.has(id)) return 2;
  if (ix.served.has(id)) return 1;
  return 0;
}

/** When the student last met `id` (served or answered); 0 when never. */
export function lastMetAt(ix: FreshnessIndex, id: string): number {
  return Math.max(ix.served.get(id) ?? 0, ix.answered.get(id) ?? 0);
}

/** A single sortable number for a REPEAT: tier first, then least recent first. Tier 0 → 0. */
export function freshnessRank(ix: FreshnessIndex, id: string): number {
  const tier = freshTier(ix, id);
  if (tier === 0) return 0;
  // Timestamps are ms since epoch (< 1e13); the tier dominates.
  return tier * 1e13 + lastMetAt(ix, id);
}

/** Every id the student has met (served or answered). */
export function metIds(ix: FreshnessIndex): Set<string> {
  const out = new Set<string>(ix.served.keys());
  for (const id of ix.answered.keys()) out.add(id);
  return out;
}

function mergeMaps(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): Map<string, number> {
  const out = new Map(a);
  for (const [id, at] of b) {
    const prev = out.get(id);
    if (prev === undefined || at > prev) out.set(id, at);
  }
  return out;
}

/** Union of two indexes (latest time per id). */
export function mergeFreshness(a: FreshnessIndex, b: FreshnessIndex): FreshnessIndex {
  return { served: mergeMaps(a.served, b.served), answered: mergeMaps(a.answered, b.answered) };
}

/** Build an index from served entries and an answered map, keeping only what happened BEFORE
 *  `before` (when given) — a visit excludes its own records so the set on screen never reorders
 *  under the student; the visit folds its own sets in explicitly when it builds the next one. */
export function freshnessFrom(
  served: readonly ServedEntry[],
  answered: ReadonlyMap<string, number>,
  before?: number,
): FreshnessIndex {
  const s = new Map<string, number>();
  for (const e of served) if (before === undefined || e.at < before) s.set(e.id, Math.max(s.get(e.id) ?? 0, e.at));
  const a = new Map<string, number>();
  for (const [id, at] of answered) if (before === undefined || at < before) a.set(id, at);
  return { served: s, answered: a };
}

/** Stable reorder: tier 0 first (in the incoming order), then repeats least-recent first. */
export function orderByFreshness<T>(items: readonly T[], idOf: (item: T) => string, ix: FreshnessIndex): T[] {
  return items
    .map((item, i) => ({ item, i, r: freshnessRank(ix, idOf(item)) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.item);
}

const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
function diffDistance(a: string, b: string): number {
  const x = DIFF_ORDER[String(a || "medium").toLowerCase()] ?? 1;
  const y = DIFF_ORDER[String(b || "medium").toLowerCase()] ?? 1;
  return Math.abs(x - y);
}

/**
 * Keep a draw's SHAPE, make it as fresh as the pool allows. For each slot whose question is a repeat
 * (tier 1 or 2), take the freshest question of the SAME SECTION from `pool` that is not already in
 * the set — ranked by: tier (fresher first) → a preferred row (e.g. Mistake Intelligence's weak
 * concept) → difficulty distance (same, then adjacent, then any) → least recently met → pool order.
 * A slot keeps its repeat only when its section has nothing fresher left. Slots that are already
 * fresh (tier 0) are never touched, so the draw's own priority order is kept; nor is a row `pool`
 * does not hold.
 */
export function refreshSectionDraw<T>(args: {
  draw: readonly T[];
  pool: readonly T[];
  ix: FreshnessIndex;
  idOf: (item: T) => string;
  sectionOf: (item: T) => string;
  difficultyOf: (item: T) => string;
  /** Duplicate-text key (two rows with the same key are the same question). */
  textKeyOf?: (item: T) => string;
  preferred?: (item: T) => boolean;
}): T[] {
  const { draw, pool, ix, idOf, sectionOf, difficultyOf, textKeyOf, preferred } = args;
  if (draw.length === 0 || pool.length === 0) return [...draw];
  if (!draw.some((q) => freshTier(ix, idOf(q)) > 0)) return [...draw];
  const known = new Set(pool.map(idOf));
  const usedIds = new Set(draw.map(idOf));
  const usedTexts = new Set(textKeyOf ? draw.map(textKeyOf).filter(Boolean) : []);
  const out = [...draw];
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    const curTier = freshTier(ix, idOf(cur));
    if (curTier === 0) continue;
    // A row the pool does not hold (a canonical-fallback row, another chapter's row) is left alone:
    // only a slot of THIS scope's bank is re-placed from it.
    if (!known.has(idOf(cur))) continue;
    const sec = sectionOf(cur);
    let best: { q: T; key: number[] } | null = null;
    for (let p = 0; p < pool.length; p++) {
      const q = pool[p];
      const id = idOf(q);
      if (usedIds.has(id)) continue;
      if (sectionOf(q) !== sec) continue;
      const tier = freshTier(ix, id);
      if (tier >= curTier && !(tier === curTier && lastMetAt(ix, id) < lastMetAt(ix, idOf(cur)))) continue;
      const t = textKeyOf ? textKeyOf(q) : "";
      if (t && usedTexts.has(t)) continue;
      const key = [
        tier,
        preferred && preferred(q) ? 0 : 1,
        diffDistance(difficultyOf(q), difficultyOf(cur)),
        tier === 0 ? 0 : lastMetAt(ix, id),
        p,
      ];
      if (!best || lexLess(key, best.key)) best = { q, key };
    }
    if (!best) continue;
    usedIds.delete(idOf(cur));
    if (textKeyOf) usedTexts.delete(textKeyOf(cur));
    out[i] = best.q;
    usedIds.add(idOf(best.q));
    if (textKeyOf) {
      const t = textKeyOf(best.q);
      if (t) usedTexts.add(t);
    }
  }
  return out;
}

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/**
 * The honest note for a set that contains repeats. `exhausted` is true only when the scoped pool has
 * no never-met question left that could have taken a repeat's place; then the page may say "You've
 * seen every question here". Otherwise it says only what is true: some questions are repeats.
 */
export function repeatsNote(repeatCount: number, exhausted: boolean): string | null {
  if (repeatCount <= 0) return null;
  return exhausted
    ? "You've seen every question here — some repeats are mixed in."
    : repeatCount === 1
      ? "One question in this set is one you've seen before."
      : `${repeatCount} questions in this set are ones you've seen before.`;
}
