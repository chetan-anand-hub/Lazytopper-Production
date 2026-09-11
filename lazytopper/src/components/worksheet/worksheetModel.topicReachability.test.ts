// @vitest-environment node
//
// WS-1 (2026-09-11) — "Worksheets can offer every board-assessed Science chapter".
// Owner ruling: every bank question must be reachable from Worksheets. Before this
// lane the Science list carried two DEAD keys (`heredity-and-evolution`,
// `magnetic-effects`) that DELETED_TOPIC_KEYS stripped, and omitted
// `human-eye-and-colourful-world` entirely, so 3 of the bank's 13 Science
// chapters were unreachable from /practice/worksheets.
//
// The expected sets here are DERIVED (topics.ts registry, the live bank, the
// trends data) — never a literal list — so the test cannot drift into asserting
// the defect. Mutation-proven: re-adding "heredity" to DELETED_TOPIC_KEYS turns
// the set-equality case red.
import { describe, expect, it } from "vitest";
import { DELETED_TOPIC_KEYS, getTopics, weightFor, type WorksheetTopic } from "./worksheetModel";
import { allDesktopTopics } from "../../lib/desktop/topics";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { class10ScienceTopicTrends } from "../../data/class10ScienceTopicTrends";

const keysOf = (topics: WorksheetTopic[]): Set<string> => new Set(topics.map((t) => t.key));
const sorted = (s: Iterable<string>): string[] => [...s].sort();

/** The 13 canonical Science slugs, read from the registry at runtime. */
const REGISTRY_SCIENCE_SLUGS = new Set(
  allDesktopTopics()
    .filter((t) => t.subject === "Science")
    .map((t) => t.slug),
);

/** Distinct Science `topicKey` values the served bank actually carries, with counts. */
const BANK_SCIENCE_COUNTS: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const q of canonicalQuestionBank) {
    if (q.subject !== "Science") continue;
    m.set(q.topicKey, (m.get(q.topicKey) ?? 0) + 1);
  }
  return m;
})();

const RESTORED = ["heredity", "magnetic-effects-of-electric-current", "human-eye-and-colourful-world"] as const;
const DEAD = ["heredity-and-evolution", "magnetic-effects"] as const;

describe("WS-1 — getTopics('Science') is exactly the registry's Science subset", () => {
  it("registry sanity: topics.ts carries 13 Science slugs (the control has teeth)", () => {
    expect(REGISTRY_SCIENCE_SLUGS.size).toBe(13);
  });

  it("(a) set EQUALITY with the topics.ts Science subset — no chapter missing, none extra", () => {
    const offered = keysOf(getTopics("Science"));
    expect(sorted(offered)).toEqual(sorted(REGISTRY_SCIENCE_SLUGS));
    expect(getTopics("Science").length).toBe(13); // no duplicate keys
  });

  it("the restored chapters are offered and the dead keys are gone", () => {
    const offered = keysOf(getTopics("Science"));
    for (const k of RESTORED) expect(offered.has(k), `missing ${k}`).toBe(true);
    for (const k of DEAD) expect(offered.has(k), `dead key ${k} offered`).toBe(false);
    expect(DELETED_TOPIC_KEYS.size).toBe(0);
  });

  it("the Maths list is untouched (13 chapters, all registry slugs)", () => {
    const maths = keysOf(getTopics("Maths"));
    const registryMaths = new Set(
      allDesktopTopics().filter((t) => t.subject === "Maths").map((t) => t.slug),
    );
    expect(sorted(maths)).toEqual(sorted(registryMaths));
  });
});

describe("WS-1 — (b) stream filters partition the 13 chapters and include the restored keys", () => {
  const physics = keysOf(getTopics("Science", "Physics"));
  const chemistry = keysOf(getTopics("Science", "Chemistry"));
  const biology = keysOf(getTopics("Science", "Biology"));

  it("Physics carries magnetic-effects-of-electric-current and human-eye-and-colourful-world", () => {
    expect(physics.has("magnetic-effects-of-electric-current")).toBe(true);
    expect(physics.has("human-eye-and-colourful-world")).toBe(true);
    expect(physics.has("heredity")).toBe(false);
    expect(sorted(physics)).toEqual([
      "electricity",
      "human-eye-and-colourful-world",
      "light-reflection-and-refraction",
      "magnetic-effects-of-electric-current",
    ]);
  });

  it("Biology carries heredity (and not the physics chapters)", () => {
    expect(biology.has("heredity")).toBe(true);
    expect(biology.has("magnetic-effects-of-electric-current")).toBe(false);
    expect(biology.has("human-eye-and-colourful-world")).toBe(false);
    expect(sorted(biology)).toEqual([
      "control-and-coordination",
      "heredity",
      "how-do-organisms-reproduce",
      "life-processes",
      "our-environment",
    ]);
  });

  it("Chemistry is unchanged (4 chapters) and the three streams partition the 'All' set", () => {
    expect(chemistry.size).toBe(4);
    for (const k of RESTORED) expect(chemistry.has(k)).toBe(false);
    const union = new Set([...physics, ...chemistry, ...biology]);
    expect(sorted(union)).toEqual(sorted(keysOf(getTopics("Science"))));
    expect(physics.size + chemistry.size + biology.size).toBe(union.size); // pairwise disjoint
  });
});

describe("WS-1 — (c) CONTROL against the served bank at runtime", () => {
  it("bank sanity: the served bank carries Science rows under 13 distinct topicKeys", () => {
    expect(BANK_SCIENCE_COUNTS.size).toBe(13);
  });

  it("every offered Science key has bank rows (no key absent from the bank)", () => {
    for (const t of getTopics("Science")) {
      expect(BANK_SCIENCE_COUNTS.get(t.key) ?? 0, `${t.key} has no bank rows`).toBeGreaterThan(0);
    }
  });

  it("every bank Science topicKey is offered (owner ruling: every bank row reachable from Worksheets)", () => {
    const offered = keysOf(getTopics("Science"));
    const unreachable = [...BANK_SCIENCE_COUNTS.keys()].filter((k) => !offered.has(k));
    expect(unreachable, `bank chapters unreachable from Worksheets: ${unreachable.join(", ")}`).toEqual([]);
  });

  it("the three restored chapters each contribute >100 served rows (the rows this lane unlocks)", () => {
    for (const k of RESTORED) {
      expect(BANK_SCIENCE_COUNTS.get(k) ?? 0, `${k} rows`).toBeGreaterThan(100);
    }
  });
});

describe("WS-1 — (d) board-weightage twin: every offered Science chapter has a real weight", () => {
  it("weightFor is non-null and positive for EVERY offered Science key (no silent weight-1 fallback)", () => {
    for (const t of getTopics("Science")) {
      const w = weightFor("Science", t.key);
      expect(w, `${t.key} has no board weightage mapping`).not.toBeNull();
      expect(w ?? 0).toBeGreaterThan(0);
    }
  });

  it("the restored chapters map to their class10ScienceTopicTrends entries", () => {
    const trends = class10ScienceTopicTrends.topics;
    expect(weightFor("Science", "heredity")).toBe(trends.HeredityEvolution.weightagePercent);
    expect(weightFor("Science", "magnetic-effects-of-electric-current")).toBe(
      trends.MagneticEffects.weightagePercent,
    );
    expect(weightFor("Science", "human-eye-and-colourful-world")).toBe(
      trends.HumanEyeAndColourfulWorld.weightagePercent,
    );
  });

  it("control: a dead / unknown key still yields null (the fallback path is real)", () => {
    expect(weightFor("Science", "heredity-and-evolution")).toBeNull();
    expect(weightFor("Science", "magnetic-effects")).toBeNull();
  });
});
