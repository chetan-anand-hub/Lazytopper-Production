// src/components/practice/multiTopicPractice.ts
//
// Quick Practice MULTI-TOPIC composition (Piece 2, shape "3c" — per-topic fan-out +
// merge + pool-and-shuffle). PURE: no React, no engine fetch, no I/O — every function
// here takes already-fetched questions (or plain counts) and returns a composed set, so
// it is unit-testable in isolation and the engine service is never touched.
//
// The FETCH itself (buildPracticeQuestionsWithAiTopup, per topic) stays in PracticePage —
// this module only decides HOW MANY questions each topic contributes and in WHAT ORDER
// they merge, exactly mirroring how takeBlueprintShare composes the single-topic board
// blueprint. The single-topic path never calls anything here; multi-topic is a new branch
// gated behind `>= 2 topics` (the additive guarantee).
//
// ── OWNER PRODUCT RULINGS (LOCKED, build spec §1) ──────────────────────────────
//   1. ORDERING = POOLED-AND-SHUFFLED — one reshuffled pool across all chosen topics
//      (a real mixed board paper), NOT interleaved-by-topic, NOT grouped.
//   2. The ~50% COMPETENCY FLOOR is INVIOLABLE and wins every conflict. If honouring the
//      per-topic split would drop competency below its blueprint share, competency wins
//      and the topic split BENDS. Competency is HARD; the topic split is SOFT.
//   3. Topic split = PROPORTIONAL-TO-AVAILABILITY with a >=2 floor (v1). Richer banks
//      contribute more; every chosen topic gets >=2 where its bank allows; a thin topic
//      contributes what it honestly has and the shortfall REDISTRIBUTES to richer topics —
//      never fabricated. The proportional driver is the single swappable `topicShare()`.
//
// ── ANTI-FABRICATION ───────────────────────────────────────────────────────────
// Every count is capped at what the real pool holds (`canonicalQuestionBank`
// runtime-authoritative, per topic). A thin topic contributes fewer; a topic with no
// competency contributes none. Nothing is padded, mis-tagged, or invented.

import type { PracticeQuestion } from "../../data/predictionDataService";

/** CBSE 2026-27 mandate: ~50% competency-based. The board-preset floor. */
export const COMPETENCY_FLOOR = 0.5;
/** Every chosen topic gets at least this many, where its bank allows (§1.3). */
export const MULTI_TOPIC_MIN_PER_TOPIC = 2;
/** A QP set is "multi-topic" only at 2+ topics; 0/1 takes the single-topic path. */
export const MULTI_TOPIC_MIN_TOPICS = 2;

/** Parse the `topics=a,b,c` query convention (the SAME the hub already emits for HPQ)
 *  into a trimmed, de-duplicated, order-preserving slug list. Empty/absent → []. */
export function parseTopicsParam(raw: string | null | undefined): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of s.split(",")) {
    const t = part.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Order-INDEPENDENT key for a topic SET — the rotation seed so a revisit reshuffles
 *  across ALL chosen topics (and {A,B} and {B,A} are the same session). */
export function topicSetKey(slugs: string[]): string {
  return [...slugs]
    .map((s) => String(s ?? "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("+");
}

/** Deterministic rotation — a PERMUTATION, never a filter (identical semantics to
 *  PracticePage.rotateBy; kept local so this module stays standalone/testable). */
function rotate<T>(items: T[], offset: number): T[] {
  if (items.length <= 1) return items;
  const at = ((Math.trunc(offset) % items.length) + items.length) % items.length;
  if (at === 0) return items;
  return items.slice(at).concat(items.slice(0, at));
}

function questionId(q: PracticeQuestion): string {
  return String((q as { id?: unknown }).id ?? "");
}

/** De-duplicate by bank id, first occurrence wins, order preserved. Bank ids are
 *  topic-scoped so cross-topic collisions cannot happen; this only collapses the rare
 *  AI-topup / canonical-fallback repeat. */
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

/** Is this a competency (case-based / application) question? Mirrors the engine's own
 *  `questionType === "Competency"` classifier (practiceQuestionBuilder) so the floor
 *  counts exactly what the bank flags — never a re-derivation from memory. */
export function isCompetencyQuestion(q: PracticeQuestion): boolean {
  const fmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
  const section = String((q as { section?: unknown }).section ?? "");
  const bloom = String((q as { bloomSkill?: unknown }).bloomSkill ?? "");
  if ((q as { isCompetencyBased?: unknown }).isCompetencyBased === true) return true;
  // Section A + Remembering is never competency (the builder's explicit carve-out).
  if (section === "A" && bloom === "Remembering") return false;
  return (
    fmt.includes("competency") ||
    fmt.includes("application") ||
    fmt.includes("case") ||
    section === "E"
  );
}

// ── The proportional driver (§1.3) — the ONE swappable function ─────────────────
export interface TopicShareInput {
  key: string;
  /** Real bank availability for this topic (count of matching bank questions). */
  availability: number;
}

/**
 * How much of the set a topic should claim, as a relative weight. **v1 = bank
 * availability** (richer banks contribute more). This is the SINGLE point the fast-follow
 * swaps: [FU-QP-MULTITOPIC-EXAM-WEIGHT] replaces the body with an exam-trends weight
 * (`getTopicWeight(topic.key)`) — the signature and every caller stay unchanged. Keep it a
 * function, not an inlined expression, so that swap is one edit.
 */
export function topicShare(topic: TopicShareInput): number {
  return Math.max(0, topic.availability);
}

/**
 * Apportion `budget` integer units across items by `weight`, each capped at `cap`, using
 * largest-remainder (Hamilton) so the split is proportional and the leftover lands on the
 * largest fractional remainders (≈ the richest topics). Never exceeds sum(cap) — the
 * honest ceiling. Pure and deterministic.
 */
function apportion(
  budget: number,
  items: Array<{ key: string; weight: number; cap: number }>,
): Map<string, number> {
  const alloc = new Map<string, number>();
  for (const it of items) alloc.set(it.key, 0);
  const totalCap = items.reduce((s, it) => s + Math.max(0, it.cap), 0);
  let remaining = Math.max(0, Math.min(budget, totalCap));
  if (remaining <= 0) return alloc;

  const totalWeight = items.reduce((s, it) => s + Math.max(0, it.weight), 0);

  if (totalWeight <= 0) {
    // No weight signal — fill by cap in the given order (stable, honest).
    for (const it of items) {
      if (remaining <= 0) break;
      const give = Math.min(Math.max(0, it.cap), remaining);
      alloc.set(it.key, give);
      remaining -= give;
    }
    return alloc;
  }

  const ideals = items.map((it) => {
    const ideal = (remaining * Math.max(0, it.weight)) / totalWeight;
    const floor = Math.min(Math.max(0, it.cap), Math.floor(ideal));
    return { key: it.key, cap: Math.max(0, it.cap), ideal, floor, frac: ideal - Math.floor(ideal) };
  });
  for (const it of ideals) alloc.set(it.key, it.floor);
  let left = remaining - ideals.reduce((s, it) => s + it.floor, 0);

  // Distribute the remainder by largest fractional part, skipping capped-out items.
  const order = [...ideals].sort((a, b) => b.frac - a.frac || b.ideal - a.ideal);
  let progressed = true;
  while (left > 0 && progressed) {
    progressed = false;
    for (const it of order) {
      if (left <= 0) break;
      if ((alloc.get(it.key) ?? 0) < it.cap) {
        alloc.set(it.key, (alloc.get(it.key) ?? 0) + 1);
        left -= 1;
        progressed = true;
      }
    }
  }
  return alloc;
}

/**
 * Per-topic count split (§1.3): a >=2 floor where the bank allows, then the remainder
 * distributed proportional to `topicShare` (availability in v1), each capped at real
 * availability, the leftover to the richest. The returned counts sum to
 * min(total, Σ availability) — a genuinely thin overall pool stays HONESTLY short (never
 * padded). Pure.
 */
export function allocateTopicCounts(
  topics: Array<{ key: string; availability: number }>,
  total: number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const t of topics) result.set(t.key, 0);
  if (total <= 0 || topics.length === 0) return result;

  const avail = new Map<string, number>();
  for (const t of topics) avail.set(t.key, Math.max(0, Math.floor(t.availability)));
  const totalAvail = [...avail.values()].reduce((s, n) => s + n, 0);
  let budget = Math.min(total, totalAvail); // honest ceiling
  if (budget <= 0) return result;

  // Phase 1 — the >=2 floor, richest topic first, until the budget is consumed.
  const byAvailDesc = [...topics].sort((a, b) => (avail.get(b.key)! - avail.get(a.key)!));
  for (const t of byAvailDesc) {
    if (budget <= 0) break;
    const give = Math.min(MULTI_TOPIC_MIN_PER_TOPIC, avail.get(t.key)!, budget);
    result.set(t.key, (result.get(t.key) ?? 0) + give);
    budget -= give;
  }

  // Phase 2 — the remainder, proportional to topicShare, capped at leftover availability.
  if (budget > 0) {
    const items = topics.map((t) => ({
      key: t.key,
      weight: topicShare({ key: t.key, availability: avail.get(t.key)! }),
      cap: avail.get(t.key)! - (result.get(t.key) ?? 0),
    }));
    const extra = apportion(budget, items);
    for (const t of topics) {
      result.set(t.key, (result.get(t.key) ?? 0) + (extra.get(t.key) ?? 0));
    }
  }

  return result;
}

export interface PerTopicPool {
  /** Canonical slug — the topic identity for the split and the seen-set. */
  key: string;
  /** Already-fetched questions for this topic (deep / over-fetched, board-shaped for the
   *  board preset). Real bank rows — never fabricated. */
  questions: PracticeQuestion[];
}

/**
 * BOARD / "all" preset — compose the EXACT displayed set (≈ mimics takeBlueprintShare,
 * but across topics and with the competency floor).
 *
 * Returns min(total, availableAcrossPools) questions. Competency floor is HARD (§1.2):
 * ~50% of the set is competency, pooled across ALL topics (competency is competency
 * regardless of chapter), capped honestly at what exists. The remaining slots are the
 * per-topic NON-competency split (§1.3, SOFT — it bends when the competency floor needs
 * the room). Finally pool-and-shuffled (§1.1) by the topic-set rotation offset.
 *
 * Pure & deterministic in `offset`: same pools + same offset → same set (the reshuffle
 * guarantee — a NEW visit is a new offset → a different combination).
 */
export function composeBoardMultiTopicSet(args: {
  pools: PerTopicPool[];
  total: number;
  offset: number;
}): PracticeQuestion[] {
  const { pools, total, offset } = args;
  if (total <= 0 || pools.length === 0) return [];

  // Split each topic's pool into competency / non-competency, each rotated+deduped up
  // front (deterministic reshuffle within topic).
  const rotated = pools.map((p) => {
    const qs = dedupeById(rotate(p.questions, offset));
    return {
      key: p.key,
      comp: qs.filter(isCompetencyQuestion),
      non: qs.filter((q) => !isCompetencyQuestion(q)),
    };
  });
  const availByTopic = rotated.map((t) => ({ key: t.key, availability: t.comp.length + t.non.length }));
  const available = availByTopic.reduce((s, t) => s + t.availability, 0);
  const N = Math.min(total, available);
  if (N <= 0) return [];

  // 1 — TOPIC SPLIT (§1.3): >=2 floor + proportional over each topic's TOTAL availability,
  //     so every chosen topic is represented (this is what a global competency pool alone
  //     would squeeze out — a topic whose competency happens to sort last gets nothing).
  const counts = allocateTopicCounts(availByTopic, N);

  // 2 — PER-TOPIC FILL, competency-PROPORTIONAL (~50% of the topic's own allocation), so
  //     the board's competency share is spread across topics, not piled on the first one.
  //     Honest: a topic short on competency (or on non-competency) backfills from its own
  //     real remainder — never a fabricated filler.
  const base: PracticeQuestion[] = [];
  for (const t of rotated) {
    const c = counts.get(t.key) ?? 0;
    if (c <= 0) continue;
    const wantComp = Math.min(Math.round(c * COMPETENCY_FLOOR), t.comp.length);
    const wantNon = Math.min(c - wantComp, t.non.length);
    const picked = [...t.comp.slice(0, wantComp), ...t.non.slice(0, wantNon)];
    if (picked.length < c) {
      for (const q of [...t.non.slice(wantNon), ...t.comp.slice(wantComp)]) {
        if (picked.length >= c) break;
        picked.push(q);
      }
    }
    base.push(...picked);
  }
  let chosen = dedupeById(base);

  // 3 — GLOBAL COMPETENCY FLOOR (§1.2, HARD — wins). If the per-topic fill fell short of
  //     ~50% (because some chosen topics are competency-thin), top up by swapping surplus
  //     competency IN for non-competency, from the tail (least-priority) — the topic split
  //     BENDS so competency wins. Capped honestly at the competency that actually exists.
  const totalCompAvail = rotated.reduce((s, t) => s + t.comp.length, 0);
  const compTarget = Math.min(Math.round(N * COMPETENCY_FLOOR), totalCompAvail);
  let haveComp = chosen.filter(isCompetencyQuestion).length;
  if (haveComp < compTarget) {
    const chosenIds = new Set(chosen.map(questionId));
    const spareComp = rotated
      .flatMap((t) => t.comp)
      .filter((q) => !chosenIds.has(questionId(q)));
    const result = [...chosen];
    let si = 0;
    for (let i = result.length - 1; i >= 0 && haveComp < compTarget && si < spareComp.length; i -= 1) {
      if (!isCompetencyQuestion(result[i])) {
        result[i] = spareComp[si];
        si += 1;
        haveComp += 1;
      }
    }
    chosen = dedupeById(result);
  }

  // 4 — pool-and-shuffle the whole chosen set (§1.1); honest short if the pool lacked N.
  return rotate(dedupeById(chosen), offset).slice(0, N);
}

/**
 * NARROW presets (Quick drill / Competency / High-marks — a specific mark bucket or
 * style the student explicitly chose): the competency floor does not apply (the student
 * narrowed the tier themselves). Produce a DEEP merged pool, round-robin interleaved so
 * the head spans every topic; PracticePage's `selectInRangeFromPool` then applies the
 * committed filter and slices to committedCount (giving each topic representation via the
 * interleave + its own rotation). Real bank rows only.
 */
export function mergeMultiTopicDeep(args: {
  pools: PerTopicPool[];
  offset: number;
}): PracticeQuestion[] {
  const { pools, offset } = args;
  const rotated = pools.map((p) => dedupeById(rotate(p.questions, offset)));
  const maxLen = rotated.reduce((m, qs) => Math.max(m, qs.length), 0);
  const interleaved: PracticeQuestion[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    for (const qs of rotated) {
      if (i < qs.length) interleaved.push(qs[i]);
    }
  }
  return dedupeById(interleaved);
}

/**
 * The multi-topic SESSION IDENTITY (the new persistence seam). A mixed set has no single
 * topic, so:
 *   · `topicSlug` — an order-independent joined key ("mixed:polynomials+real-numbers"),
 *     stable across visits so `quickPracticeCode` stays idempotent for the same set;
 *   · `title` — an honest "Mixed: Real Numbers, Polynomials · Practice set";
 *   · `topicKeys` — EVERY chosen topic's canonical slug, so the record carries each real
 *     topic (per-question attribution to the tutor still flows through each question's own
 *     `q.topicKey` on the live objects — this is the session-level label only).
 */
export function multiTopicSessionIdentity(
  topics: Array<{ slug: string; label: string }>,
): { topicSlug: string; title: string; topicKeys: string[] } {
  const slugs = topics.map((t) => String(t.slug ?? "").trim()).filter(Boolean);
  const labels = topics.map((t) => String(t.label ?? "").trim()).filter(Boolean);
  const sortedSlugs = [...slugs].sort();
  return {
    topicSlug: `mixed:${sortedSlugs.join("+")}`,
    title: labels.length ? `Mixed: ${labels.join(", ")} · Practice set` : "Mixed practice set",
    topicKeys: Array.from(new Set(slugs)),
  };
}
