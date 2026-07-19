import { describe, it, expect } from "vitest";
import {
  parseTopicsParam,
  topicSetKey,
  isCompetencyQuestion,
  topicShare,
  allocateTopicCounts,
  composeBoardMultiTopicSet,
  mergeMultiTopicDeep,
  multiTopicSessionIdentity,
  COMPETENCY_FLOOR,
  MULTI_TOPIC_MIN_PER_TOPIC,
  type PerTopicPool,
} from "./multiTopicPractice";
import type { PracticeQuestion } from "../../data/predictionDataService";

/**
 * QP MULTI-TOPIC (Piece 2, shape 3c) — the PURE composition core. The build spec §5
 * demands the blueprint share-math be tested at the edges: thin topic, uneven bank
 * depths, remainder-to-richest, the competency floor winning, the >=2 floor, honest caps
 * (never fabricated), and determinism under a fixed offset. A router-mounted proof of the
 * routing hole lives in DesktopPracticePage.multiTopicNav.test.tsx (the #484 lesson —
 * pure-helper alone is not enough for a ROUTING claim).
 */

// A minimal bank row. `comp` marks it competency (Section E case-based here).
const mkQ = (
  id: string,
  opts: { comp?: boolean; marks?: number; section?: string } = {},
): PracticeQuestion =>
  ({
    id,
    marks: opts.marks ?? (opts.comp ? 4 : 3),
    section: opts.section ?? (opts.comp ? "E" : "C"),
    questionText: `Q ${id}`,
    difficulty: "Medium",
    format: opts.comp ? "case" : "long",
    isCompetencyBased: opts.comp ?? false,
    topicKey: id.split("-")[0],
  } as unknown as PracticeQuestion);

const idsOf = (qs: PracticeQuestion[]) => qs.map((q) => String((q as { id: string }).id));

// A deep, board-shaped pool for one topic: `n` questions, ~half competency.
const topicPool = (prefix: string, n: number, compEvery = 2): PerTopicPool => ({
  key: prefix,
  questions: Array.from({ length: n }, (_, i) => mkQ(`${prefix}-${i}`, { comp: i % compEvery === 0 })),
});

describe("parseTopicsParam — the topics= convention (mirrors HPQ)", () => {
  it("splits, trims, de-dupes, preserves order; empty/absent → []", () => {
    expect(parseTopicsParam("real-numbers,polynomials")).toEqual(["real-numbers", "polynomials"]);
    expect(parseTopicsParam(" a , b , a ,,c ")).toEqual(["a", "b", "c"]);
    expect(parseTopicsParam("")).toEqual([]);
    expect(parseTopicsParam(null)).toEqual([]);
    expect(parseTopicsParam("   ")).toEqual([]);
  });
});

describe("topicSetKey — order-independent rotation seed", () => {
  it("{A,B} === {B,A}, lowercased, '+'-joined", () => {
    expect(topicSetKey(["Polynomials", "real-numbers"])).toBe("polynomials+real-numbers");
    expect(topicSetKey(["real-numbers", "Polynomials"])).toBe(topicSetKey(["Polynomials", "real-numbers"]));
    expect(topicSetKey([" b ", "a", ""])).toBe("a+b");
  });
});

describe("isCompetencyQuestion — mirrors the engine classifier", () => {
  it("flags isCompetencyBased / case / Section E / application; not A+Remembering", () => {
    expect(isCompetencyQuestion(mkQ("x", { comp: true }))).toBe(true);
    expect(isCompetencyQuestion(mkQ("y", { section: "E", comp: false }))).toBe(true);
    expect(isCompetencyQuestion(mkQ("z", { section: "C", comp: false }))).toBe(false);
    const arA = { id: "a", section: "A", bloomSkill: "Remembering", format: "case" } as unknown as PracticeQuestion;
    expect(isCompetencyQuestion(arA)).toBe(false); // A+Remembering carve-out wins over "case"
  });
});

describe("topicShare — v1 = availability (the swappable driver)", () => {
  it("returns availability, clamped at 0", () => {
    expect(topicShare({ key: "a", availability: 42 })).toBe(42);
    expect(topicShare({ key: "b", availability: -5 })).toBe(0);
  });
});

describe("allocateTopicCounts — >=2 floor, proportional, remainder-to-richest, honest", () => {
  it("proportional-to-availability with the >=2 floor honoured", () => {
    // avail 30/10/5, total 10. Floors 2/2/2 = 6; remaining 4 by share 30:10:5.
    const counts = allocateTopicCounts(
      [{ key: "big", availability: 30 }, { key: "mid", availability: 10 }, { key: "small", availability: 5 }],
      10,
    );
    expect(counts.get("big")! + counts.get("mid")! + counts.get("small")!).toBe(10);
    expect(counts.get("big")!).toBeGreaterThanOrEqual(MULTI_TOPIC_MIN_PER_TOPIC);
    expect(counts.get("mid")!).toBeGreaterThanOrEqual(MULTI_TOPIC_MIN_PER_TOPIC);
    expect(counts.get("small")!).toBeGreaterThanOrEqual(MULTI_TOPIC_MIN_PER_TOPIC);
    // The richest bank takes the largest share.
    expect(counts.get("big")!).toBeGreaterThan(counts.get("small")!);
  });

  it("THIN topic: contributes only what it has; the shortfall redistributes to richer topics", () => {
    // 'thin' has just 1 question — it can never reach the >=2 floor; the deficit goes to 'rich'.
    const counts = allocateTopicCounts(
      [{ key: "rich", availability: 50 }, { key: "thin", availability: 1 }],
      10,
    );
    expect(counts.get("thin")!).toBe(1); // honest: exactly its bank depth, never padded to 2
    expect(counts.get("rich")!).toBe(9); // the shortfall bent to the richer topic
    expect(counts.get("rich")! + counts.get("thin")!).toBe(10);
  });

  it("HONEST overall shortfall: total exceeds Σ availability → sum is the real smaller number", () => {
    const counts = allocateTopicCounts(
      [{ key: "a", availability: 3 }, { key: "b", availability: 2 }],
      20, // asked for 20, only 5 exist
    );
    expect(counts.get("a")!).toBe(3);
    expect(counts.get("b")!).toBe(2);
    expect(counts.get("a")! + counts.get("b")!).toBe(5); // never fabricated up to 20
  });

  it("uneven depths + tiny total: the >=2 floor is filled richest-first when the budget is scarce", () => {
    // total 3 across 2 topics can't give both >=2; richest gets 2, the other 1 (honest).
    const counts = allocateTopicCounts(
      [{ key: "rich", availability: 40 }, { key: "poor", availability: 40 }],
      3,
    );
    expect(counts.get("rich")! + counts.get("poor")!).toBe(3);
    expect(Math.max(counts.get("rich")!, counts.get("poor")!)).toBe(2);
  });

  it("total 0 or no topics → all zero", () => {
    expect([...allocateTopicCounts([{ key: "a", availability: 5 }], 0).values()]).toEqual([0]);
    expect(allocateTopicCounts([], 10).size).toBe(0);
  });
});

describe("composeBoardMultiTopicSet — competency floor HARD, topic split SOFT, pool-shuffle", () => {
  it("hits ~50% competency across topics and spans every chosen topic", () => {
    const pools = [topicPool("rn", 20), topicPool("poly", 20), topicPool("circ", 20)];
    const set = composeBoardMultiTopicSet({ pools, total: 8, offset: 0 });
    expect(set.length).toBe(8);
    const comp = set.filter(isCompetencyQuestion).length;
    // The floor is a MINIMUM (~50%): at least 4, not wildly all-competency.
    expect(comp).toBeGreaterThanOrEqual(Math.round(8 * COMPETENCY_FLOOR));
    expect(comp).toBeLessThanOrEqual(6);
    // Every chosen topic is represented — the per-topic split spreads competency so no
    // topic is squeezed out by the floor (the bug a global competency pool would cause).
    const topicsHit = new Set(idsOf(set).map((id) => id.split("-")[0]));
    expect(topicsHit.size).toBe(3);
  });

  it("COMPETENCY WINS: a topic rich in competency lifts the floor even when another has none", () => {
    // 'dry' has ZERO competency; 'wet' is all competency. The floor is still met from 'wet'.
    const dry: PerTopicPool = { key: "dry", questions: Array.from({ length: 12 }, (_, i) => mkQ(`dry-${i}`, { comp: false })) };
    const wet: PerTopicPool = { key: "wet", questions: Array.from({ length: 12 }, (_, i) => mkQ(`wet-${i}`, { comp: true })) };
    const set = composeBoardMultiTopicSet({ pools: [dry, wet], total: 8, offset: 0 });
    expect(set.length).toBe(8);
    expect(set.filter(isCompetencyQuestion).length).toBeGreaterThanOrEqual(4); // floor met from 'wet'
    expect(idsOf(set).some((id) => id.startsWith("dry-"))).toBe(true); // 'dry' still contributes
  });

  it("HONEST competency cap: too few competency questions → floor is what exists, never fabricated", () => {
    // Only 1 competency question in the entire merged pool.
    const pools: PerTopicPool[] = [
      { key: "a", questions: [mkQ("a-0", { comp: true }), ...Array.from({ length: 9 }, (_, i) => mkQ(`a-${i + 1}`, { comp: false }))] },
      { key: "b", questions: Array.from({ length: 10 }, (_, i) => mkQ(`b-${i}`, { comp: false })) },
    ];
    const set = composeBoardMultiTopicSet({ pools, total: 8, offset: 0 });
    expect(set.length).toBe(8);
    expect(set.filter(isCompetencyQuestion).length).toBe(1); // the real 1, not a padded 4
  });

  it("HONEST thin overall pool: fewer than `total` real questions → returns the real smaller set", () => {
    const pools: PerTopicPool[] = [topicPool("a", 2), topicPool("b", 2)]; // 4 total
    const set = composeBoardMultiTopicSet({ pools, total: 10, offset: 0 });
    expect(set.length).toBe(4); // never padded to 10
    expect(new Set(idsOf(set)).size).toBe(4); // no duplicates, no fabrication
  });

  it("DETERMINISTIC + RESHUFFLE: same offset → same set; a new offset → a different combination", () => {
    const pools = [topicPool("rn", 20), topicPool("poly", 20)];
    const a1 = composeBoardMultiTopicSet({ pools, total: 8, offset: 3 });
    const a2 = composeBoardMultiTopicSet({ pools, total: 8, offset: 3 });
    const b = composeBoardMultiTopicSet({ pools, total: 8, offset: 11 });
    expect(idsOf(a1)).toEqual(idsOf(a2)); // deterministic in offset
    expect(idsOf(b)).not.toEqual(idsOf(a1)); // a revisit reshuffles
    // Both still honour the floor and are drawn from real bank ids only.
    expect(b.filter(isCompetencyQuestion).length).toBeGreaterThanOrEqual(Math.round(8 * COMPETENCY_FLOOR));
    expect(new Set(idsOf(b)).size).toBe(8);
  });

  it("no duplicates ever, across offsets and counts", () => {
    const pools = [topicPool("rn", 15), topicPool("poly", 15), topicPool("circ", 15)];
    for (const offset of [0, 1, 7, 100]) {
      for (const total of [3, 8, 20]) {
        const set = composeBoardMultiTopicSet({ pools, total, offset });
        expect(new Set(idsOf(set)).size).toBe(set.length);
      }
    }
  });
});

describe("mergeMultiTopicDeep — narrow presets: deep, interleaved, real-only", () => {
  it("interleaves topics at the head so selectInRangeFromPool's slice spans them", () => {
    const merged = mergeMultiTopicDeep({
      pools: [topicPool("a", 4), topicPool("b", 4)],
      offset: 0,
    });
    // Round-robin: first two come from different topics.
    expect(idsOf(merged)[0].split("-")[0]).not.toBe(idsOf(merged)[1].split("-")[0]);
    expect(merged.length).toBe(8);
    expect(new Set(idsOf(merged)).size).toBe(8); // deduped, no fabrication
  });

  it("uneven depths: the deeper topic's tail still appears (nothing dropped)", () => {
    const merged = mergeMultiTopicDeep({
      pools: [topicPool("big", 6), topicPool("small", 2)],
      offset: 0,
    });
    expect(merged.length).toBe(8);
    expect(idsOf(merged).filter((id) => id.startsWith("big-")).length).toBe(6);
    expect(idsOf(merged).filter((id) => id.startsWith("small-")).length).toBe(2);
  });
});

describe("multiTopicSessionIdentity — the new persistence seam", () => {
  it("order-independent slug, honest mixed title, all topicKeys", () => {
    const id = multiTopicSessionIdentity([
      { slug: "polynomials", label: "Polynomials" },
      { slug: "real-numbers", label: "Real Numbers" },
    ]);
    expect(id.topicSlug).toBe("mixed:polynomials+real-numbers");
    expect(id.title).toBe("Mixed: Polynomials, Real Numbers · Practice set");
    expect(id.topicKeys.sort()).toEqual(["polynomials", "real-numbers"]);
    // Same set in a different order → the SAME idempotent slug.
    const flipped = multiTopicSessionIdentity([
      { slug: "real-numbers", label: "Real Numbers" },
      { slug: "polynomials", label: "Polynomials" },
    ]);
    expect(flipped.topicSlug).toBe(id.topicSlug);
  });
});
