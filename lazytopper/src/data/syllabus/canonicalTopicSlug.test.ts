// @vitest-environment node
//
// P0 [FU-TOPICKEY-UNIVERSAL] — the ONE canonical resolver.
// Proves: the 5 short worksheet keys resolve to the bank's long slugs; every
// spelling of a chapter buckets identically (same-bucket guarantee); circles /
// areas-related-to-circles stay DISJOINT; light / human-eye stay SPLIT; the
// resolver targets topics.ts slugs (never the doctrine-banned `heredity-and-evolution`).
import { describe, expect, it } from "vitest";
import {
  resolveCanonicalSlug,
  canonicalSlugMatches,
  resolveCanonicalSlugSet,
} from "./canonicalTopicSlug";

// The 26 canonical topics.ts slugs (the ONLY legal canonical vocabulary).
const TOPICS_TS_SLUGS = new Set([
  "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations",
  "arithmetic-progression", "triangles", "coordinate-geometry", "trigonometry",
  "circles", "areas-related-to-circles", "surface-areas-and-volumes", "statistics",
  "probability", "chemical-reactions-and-equations", "acids-bases-and-salts",
  "metals-and-non-metals", "carbon-and-its-compounds", "light-reflection-and-refraction",
  "human-eye-and-colourful-world", "electricity", "magnetic-effects-of-electric-current",
  "life-processes", "control-and-coordination", "how-do-organisms-reproduce", "heredity",
  "our-environment",
]);

describe("resolveCanonicalSlug — the P0 topic-key authority", () => {
  it("resolves the 5 short worksheet keys to the bank's long topics.ts slugs (fixes the ZEROs)", () => {
    expect(resolveCanonicalSlug("chemical-reactions-equations")).toBe("chemical-reactions-and-equations");
    expect(resolveCanonicalSlug("acids-bases-salts")).toBe("acids-bases-and-salts");
    expect(resolveCanonicalSlug("metals-non-metals")).toBe("metals-and-non-metals");
    expect(resolveCanonicalSlug("reproduction")).toBe("how-do-organisms-reproduce");
    expect(resolveCanonicalSlug("light")).toBe("light-reflection-and-refraction");
  });

  it("buckets EVERY spelling of a chapter identically (same-bucket guarantee)", () => {
    // Chemical Reactions: long slug, short slug, Title-Case label all → one bucket.
    const chem = resolveCanonicalSlug("chemical-reactions-and-equations");
    expect(resolveCanonicalSlug("chemical-reactions-equations")).toBe(chem);
    expect(resolveCanonicalSlug("Chemical Reactions and Equations")).toBe(chem);
    // camelCase is NOT a blind spot — OurEnvironment ≡ our-environment.
    expect(resolveCanonicalSlug("OurEnvironment")).toBe(resolveCanonicalSlug("our-environment"));
    // en-dash label ≡ slug.
    expect(resolveCanonicalSlug("Light – Reflection and Refraction")).toBe("light-reflection-and-refraction");
  });

  it("keeps circles and areas-related-to-circles DISJOINT (not the substring-merged pool)", () => {
    expect(resolveCanonicalSlug("circles")).toBe("circles");
    expect(resolveCanonicalSlug("Circles")).toBe("circles");
    expect(resolveCanonicalSlug("areas-related-to-circles")).toBe("areas-related-to-circles");
    expect(resolveCanonicalSlug("Areas Related to Circles")).toBe("areas-related-to-circles");
    expect(resolveCanonicalSlug("circles")).not.toBe(resolveCanonicalSlug("areas-related-to-circles"));
    expect(canonicalSlugMatches("circles", "areas-related-to-circles")).toBe(false);
  });

  it("keeps Light and Human-Eye as SEPARATE chapters (topics.ts splits them)", () => {
    expect(resolveCanonicalSlug("human-eye-and-colourful-world")).toBe("human-eye-and-colourful-world");
    expect(resolveCanonicalSlug("Human Eye and Colourful World")).toBe("human-eye-and-colourful-world");
    expect(resolveCanonicalSlug("light-reflection-and-refraction"))
      .not.toBe(resolveCanonicalSlug("human-eye-and-colourful-world"));
  });

  it("resolves Heredity to `heredity` — NEVER the doctrine-banned `heredity-and-evolution`", () => {
    expect(resolveCanonicalSlug("heredity")).toBe("heredity");
    expect(resolveCanonicalSlug("Heredity")).toBe("heredity");
    expect(resolveCanonicalSlug("HeredityEvolution")).toBe("heredity");
    expect(resolveCanonicalSlug("heredity")).not.toBe("heredity-and-evolution");
  });

  it("every known spelling resolves to a topics.ts slug (no rival vocabulary leaks out)", () => {
    for (const spelling of [
      "reproduction", "how-do-organisms-reproduce", "How do Organisms Reproduce?",
      "arithmetic-progression", "Arithmetic Progression", "pair-of-linear-equations",
      "Pair of Linear Equations", "control-and-coordination", "Control and Coordination",
    ]) {
      expect(TOPICS_TS_SLUGS.has(resolveCanonicalSlug(spelling)), `${spelling} → ${resolveCanonicalSlug(spelling)}`).toBe(true);
    }
  });

  it("canonicalSlugMatches resolves both sides", () => {
    expect(canonicalSlugMatches("Chemical Reactions and Equations", "chemical-reactions-equations")).toBe(true);
    expect(canonicalSlugMatches("OurEnvironment", "our-environment")).toBe(true);
    expect(canonicalSlugMatches("light", "human-eye-and-colourful-world")).toBe(false);
  });

  it("falls back cleanly for unknown / empty input", () => {
    expect(resolveCanonicalSlug("")).toBe("");
    expect(resolveCanonicalSlug(null)).toBe("");
    expect(resolveCanonicalSlug(undefined)).toBe("");
    // Unknown but non-empty → normalised slug (stable, comparable; Guard A rejects
    // any such key in bank DATA).
    expect(resolveCanonicalSlug("totally-made-up-xyz")).toBe("totally-made-up-xyz");
  });

  it("resolveCanonicalSlugSet dedupes variant spellings into one canonical slug", () => {
    const set = resolveCanonicalSlugSet([
      "chemical-reactions-equations", "Chemical Reactions and Equations", "chemical-reactions-and-equations",
    ]);
    expect(set.size).toBe(1);
    expect(set.has("chemical-reactions-and-equations")).toBe(true);
  });
});
