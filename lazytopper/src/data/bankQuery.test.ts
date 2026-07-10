// @vitest-environment node
//
// P0 [FU-TOPICKEY-UNIVERSAL] — the shared bank-query helper, over the REAL bank.
// Proves: every one of the bank's ~5014 questions resolves to a topics.ts slug
// (0 orphans — the Commit-1 coverage invariant); the four chapters that returned
// ZERO (Chemical Reactions, Acids-Bases-Salts, Metals-Non-Metals, Reproduction)
// now return questions via BOTH the short worksheet keys and the canonical slugs;
// circles and areas-related-to-circles are DISJOINT pools.
import { describe, expect, it } from "vitest";
import { canonicalQuestionBank } from "./canonicalQuestionBank";
import { selectBankQuestions, resolveCanonicalSlug } from "./bankQuery";

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

describe("bankQuery — canonical resolution over the live bank", () => {
  it("resolves EVERY bank question's topicKey to a topics.ts slug (0 orphans)", () => {
    const orphans = new Set<string>();
    for (const q of canonicalQuestionBank) {
      if (!TOPICS_TS_SLUGS.has(resolveCanonicalSlug(q.topicKey))) orphans.add(q.topicKey);
    }
    expect([...orphans], `raw keys not resolving to a topics.ts slug: ${[...orphans].join(", ")}`).toEqual([]);
  });

  it("the FOUR previously-zero chapters now return questions via the short worksheet keys", () => {
    for (const shortKey of [
      "chemical-reactions-equations", "acids-bases-salts", "metals-non-metals", "reproduction",
    ]) {
      const n = selectBankQuestions({ subject: "Science", topicKeys: [shortKey] }).length;
      expect(n, `${shortKey} returned ${n}`).toBeGreaterThan(0);
    }
  });

  it("the four chapters also return questions via their canonical slugs", () => {
    for (const slug of [
      "chemical-reactions-and-equations", "acids-bases-and-salts",
      "metals-and-non-metals", "how-do-organisms-reproduce",
    ]) {
      expect(selectBankQuestions({ topicKeys: [slug] }).length).toBeGreaterThan(0);
    }
  });

  it("circles and areas-related-to-circles are DISJOINT pools (no shared question ids)", () => {
    const circleIds = new Set(selectBankQuestions({ topicKeys: ["circles"] }).map((q) => q.id));
    const areaIds = new Set(selectBankQuestions({ topicKeys: ["areas-related-to-circles"] }).map((q) => q.id));
    expect(circleIds.size).toBeGreaterThan(0);
    expect(areaIds.size).toBeGreaterThan(0);
    const shared = [...circleIds].filter((id) => areaIds.has(id));
    expect(shared, `shared ids: ${shared.slice(0, 5).join(", ")}`).toEqual([]);
  });

  it("selectBankQuestions honours subject + exact numeric mark-range filters", () => {
    const all = selectBankQuestions({ subject: "Maths", topicKeys: ["trigonometry"] });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((q) => q.subject === "Maths")).toBe(true);
    const band = selectBankQuestions({ topicKeys: ["trigonometry"], marksMin: 3, marksMax: 5 });
    expect(band.every((q) => q.marks >= 3 && q.marks <= 5)).toBe(true);
    expect(band.length).toBeLessThan(all.length);
  });

  it("returns [] for an empty topic list (never the whole bank)", () => {
    expect(selectBankQuestions({ topicKeys: [] })).toEqual([]);
  });
});
