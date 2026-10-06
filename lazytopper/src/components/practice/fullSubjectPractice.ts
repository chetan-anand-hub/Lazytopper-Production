// src/components/practice/fullSubjectPractice.ts
//
// QUICK-FIXES-1 PR-1 (Q1) — FULL-SUBJECT Quick Practice.
//
// THE DEFECT (P4, FU-B16-FULLSUBJECT-QP-ONE-CHAPTER): the Practice hub's "Full subject"
// → "Start quick practice" CTA sent `/practice/:grade/:subject` with NO topic and NO scope
// marker, and PracticePage collapses an absent topic to its default chapter (Real Numbers
// for Maths, Chemical Reactions for Science). PracticePage had no full-subject mode at all,
// so a set labelled "full subject" was a one-chapter set.
//
// THE FIX: the hub now says what it means (`scope=full-subject`, plus `stream=` for a
// Science stream), and PracticePage resolves that to EVERY board chapter of the subject
// (from the 2026-27 syllabus module — never a hand-kept list) and composes the set with
// `composeFullSubjectSet`: proportional to each chapter's served questions, no chapter
// above 30% of the set, seeded and deterministic (no Math.random — CLAUDE.md §7).
//
// PURE: no React, no I/O. Questions arrive already fetched (real bank rows; withheld rows
// are never in the served bank), so nothing here can invent a question.

import { BOARD_CHAPTER_KEYS, chapterUnit } from "../../config/syllabus2026-27";
import type { PracticeQuestion } from "../../data/predictionDataService";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { COMPETENCY_FLOOR, isCompetencyQuestion, type PerTopicPool } from "./multiTopicPractice";

/** The `scope=` value the hub emits for a whole-subject set. */
export const FULL_SUBJECT_SCOPE = "full-subject";
/** No chapter may take more than this share of a full-subject set (Q1). */
export const FULL_SUBJECT_MAX_CHAPTER_SHARE = 0.3;

const SCIENCE_STREAMS = new Set(["Physics", "Chemistry", "Biology"]);

/**
 * Every BOARD-assessed chapter of `subject` (2026-27 syllabus module), optionally narrowed
 * to one Science stream. Order = the syllabus order.
 */
export function fullSubjectChapterKeys(subject: string, stream?: string | null): string[] {
  const want = String(subject || "").trim().toLowerCase();
  const keys = BOARD_CHAPTER_KEYS.filter((k) => chapterUnit(k)?.subject === want);
  if (want !== "science" || !stream || !SCIENCE_STREAMS.has(stream)) return [...keys];
  return keys.filter((k) => desktopTopicBySlug(k)?.stream === stream);
}

/** The query params the hub's full-subject Quick Practice CTA carries. */
export function appendFullSubjectScope(sp: URLSearchParams, subject: string, stream?: string | null): void {
  sp.set("scope", FULL_SUBJECT_SCOPE);
  if (String(subject).toLowerCase() === "science" && stream && SCIENCE_STREAMS.has(stream)) {
    sp.set("stream", stream);
  }
}

/**
 * PracticePage side: the chapter keys a full-subject arrival must draw from, or [] when the
 * URL is not a full-subject request. An explicit `topic=` / `topics=` always wins (those are
 * single- / multi-topic arrivals).
 */
export function resolveFullSubjectChapterKeys(search: URLSearchParams, subject: string): string[] {
  if (search.get("scope") !== FULL_SUBJECT_SCOPE) return [];
  if ((search.get("topic") || "").trim()) return [];
  if ((search.get("topics") || "").trim()) return [];
  return fullSubjectChapterKeys(subject, search.get("stream"));
}

// ── seeded randomness (deterministic; never Math.random) ─────────────────────────
function mulberry32(seed: number): () => number {
  let a = (Math.trunc(seed) >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function questionId(q: PracticeQuestion): string {
  return String((q as { id?: unknown }).id ?? "");
}

function dedupeById(questions: PracticeQuestion[]): PracticeQuestion[] {
  const seen = new Set<string>();
  const out: PracticeQuestion[] = [];
  for (const q of questions) {
    const id = questionId(q);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(q);
  }
  return out;
}

/**
 * Per-chapter counts for a set of `total`: proportional to `weight` (served questions),
 * each chapter capped at min(its pool, floor(total × 30%)) — at least 1 — and the
 * fractional remainder handed out by SEEDED weighted draws, so different seeds spread the
 * remainder over different chapters (a thin chapter still appears across sets). Sums to
 * min(total, Σ caps): an honestly thin subject stays short, never padded. Pure.
 */
export function allocateFullSubjectCounts(
  chapters: Array<{ key: string; weight: number; poolSize: number }>,
  total: number,
  seed: number,
  maxShare: number = FULL_SUBJECT_MAX_CHAPTER_SHARE,
): Map<string, number> {
  const alloc = new Map<string, number>();
  for (const c of chapters) alloc.set(c.key, 0);
  if (total <= 0 || chapters.length === 0) return alloc;

  const maxPer = Math.max(1, Math.floor(total * maxShare));
  const live = chapters
    .map((c) => ({ key: c.key, weight: Math.max(0, c.weight), cap: Math.min(Math.max(0, c.poolSize), maxPer) }))
    .filter((c) => c.cap > 0 && c.weight > 0);
  const totalCap = live.reduce((s, c) => s + c.cap, 0);
  const N = Math.min(total, totalCap);
  if (N <= 0) return alloc;

  const W = live.reduce((s, c) => s + c.weight, 0);
  const ideal = new Map(live.map((c) => [c.key, (N * c.weight) / W]));
  let left = N;
  for (const c of live) {
    const give = Math.min(c.cap, Math.floor(ideal.get(c.key) ?? 0));
    alloc.set(c.key, give);
    left -= give;
  }

  // Remainder: one seeded weighted draw per slot (Efraimidis–Spirakis key u^(1/w)), the
  // weight being what the chapter is still "owed" (a small floor keeps every chapter with
  // capacity eligible once the owed shares are paid).
  const rng = mulberry32(seed);
  while (left > 0) {
    let best: string | null = null;
    let bestKey = -1;
    for (const c of live) {
      const have = alloc.get(c.key) ?? 0;
      if (have >= c.cap) continue;
      const owed = Math.max((ideal.get(c.key) ?? 0) - have, 1e-3 * (c.weight / W));
      const k = Math.pow(rng(), 1 / owed);
      if (k > bestKey) {
        bestKey = k;
        best = c.key;
      }
    }
    if (best === null) break;
    alloc.set(best, (alloc.get(best) ?? 0) + 1);
    left -= 1;
  }
  return alloc;
}

/**
 * BOARD / "all" preset for a FULL-SUBJECT set. `pools` = one already-fetched, board-shaped
 * pool per chapter (the same per-topic fetch the multi-topic path uses); `weights` = each
 * chapter's served-question count (falls back to its pool size when absent).
 *
 * Returns min(total, available) questions: chapter split per `allocateFullSubjectCounts`
 * (≤ 30% each), ~50% competency inside each chapter's share, the competency floor topped
 * up by swapping WITHIN a chapter only (so the 30% cap can never be broken), then one
 * seeded shuffle of the whole set. Same inputs + same seed → same set.
 */
export function composeFullSubjectSet(args: {
  pools: PerTopicPool[];
  weights?: ReadonlyMap<string, number>;
  total: number;
  seed: number;
  maxShare?: number;
}): PracticeQuestion[] {
  const { pools, weights, total, seed } = args;
  if (total <= 0 || pools.length === 0) return [];
  const rng = mulberry32(seed ^ 0x5bd1e995);

  const chapters = pools.map((p) => {
    const qs = seededShuffle(dedupeById(p.questions), rng);
    return {
      key: p.key,
      comp: qs.filter(isCompetencyQuestion),
      non: qs.filter((q) => !isCompetencyQuestion(q)),
      size: qs.length,
    };
  });
  const counts = allocateFullSubjectCounts(
    chapters.map((c) => ({ key: c.key, weight: weights?.get(c.key) ?? c.size, poolSize: c.size })),
    total,
    seed,
    args.maxShare,
  );
  const N = [...counts.values()].reduce((s, n) => s + n, 0);
  if (N <= 0) return [];

  const picked = new Map<string, PracticeQuestion[]>();
  for (const c of chapters) {
    const n = counts.get(c.key) ?? 0;
    if (n <= 0) continue;
    const wantComp = Math.min(Math.round(n * COMPETENCY_FLOOR), c.comp.length);
    const wantNon = Math.min(n - wantComp, c.non.length);
    const set = [...c.comp.slice(0, wantComp), ...c.non.slice(0, wantNon)];
    for (const q of [...c.non.slice(wantNon), ...c.comp.slice(wantComp)]) {
      if (set.length >= n) break;
      set.push(q);
    }
    picked.set(c.key, set);
  }

  // Competency floor (HARD, as in the multi-topic board preset), honoured by swapping a
  // chapter's own non-competency pick for that SAME chapter's spare competency question.
  const compAvail = chapters.reduce((s, c) => s + c.comp.length, 0);
  const compTarget = Math.min(Math.round(N * COMPETENCY_FLOOR), compAvail);
  let haveComp = [...picked.values()].flat().filter(isCompetencyQuestion).length;
  for (const c of chapters) {
    if (haveComp >= compTarget) break;
    const set = picked.get(c.key);
    if (!set) continue;
    const used = new Set(set.map(questionId));
    const spare = c.comp.filter((q) => !used.has(questionId(q)));
    for (let i = set.length - 1; i >= 0 && haveComp < compTarget && spare.length > 0; i -= 1) {
      if (!isCompetencyQuestion(set[i])) {
        set[i] = spare.shift() as PracticeQuestion;
        haveComp += 1;
      }
    }
  }

  return seededShuffle(dedupeById([...picked.values()].flat()), rng).slice(0, N);
}
