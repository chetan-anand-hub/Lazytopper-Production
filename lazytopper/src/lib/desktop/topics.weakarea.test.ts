// @vitest-environment node
//
// topicKey-duplication audit — Fix A proof (2026-06-16).
//
// The Me "Topics dragging your score" row resolves each stored (raw, un-
// canonicalised) topic label to a hub slug + subject via
// `desktopTopicForWeakAreaKey`. When that returns undefined the row falls back
// to /exam-trends. The audit found exactly 13 in-bank spellings that the old
// `desktopTopicBySlug` could not resolve (11 PascalCase Science abbreviations +
// 2 `science_*` keys), which silently routed those weak-area rows to Exam Trends
// instead of a practice set. This locks the fix: all 13 must now resolve, an
// arbitrary variant must resolve via the strong candidate bridge, and a
// genuinely-unknown topic must still fall back (honest empty state preserved).
import { describe, expect, it } from "vitest";
import { desktopTopicForWeakAreaKey } from "./topics";

// The 13 previously-failing spellings → their canonical topics.ts slug.
const FORMERLY_BROKEN: Record<string, string> = {
  Light: "light-reflection-and-refraction",
  LifeProcesses: "life-processes",
  AcidsBasesSalts: "acids-bases-and-salts",
  HumanEyeAndColourfulWorld: "human-eye-and-colourful-world",
  CarbonCompounds: "carbon-and-its-compounds",
  ControlAndCoordination: "control-and-coordination",
  MetalsNonMetals: "metals-and-non-metals",
  ChemicalReactions: "chemical-reactions-and-equations",
  MagneticEffects: "magnetic-effects-of-electric-current",
  HeredityEvolution: "heredity",
  OurEnvironment: "our-environment",
  science_light_reflection_refraction: "light-reflection-and-refraction",
  science_reproduction: "how-do-organisms-reproduce",
};

describe("desktopTopicForWeakAreaKey — Fix A (no more silent /exam-trends)", () => {
  it("resolves all 13 previously-failing spellings to a non-null hub slug + subject", () => {
    for (const [spelling, expectedSlug] of Object.entries(FORMERLY_BROKEN)) {
      const meta = desktopTopicForWeakAreaKey(spelling);
      expect(meta, `expected "${spelling}" to resolve, got undefined`).toBeDefined();
      expect(meta?.slug).toBe(expectedSlug);
      expect(meta?.subject).toBeTruthy();
    }
  });

  it("still resolves the spellings that already worked (no regression)", () => {
    // kebab, Title-Case, en-dash (U+2013), and an already-working alias.
    expect(desktopTopicForWeakAreaKey("real-numbers")?.slug).toBe("real-numbers");
    expect(desktopTopicForWeakAreaKey("Real Numbers")?.slug).toBe("real-numbers");
    expect(desktopTopicForWeakAreaKey("Light – Reflection and Refraction")?.slug).toBe(
      "light-reflection-and-refraction",
    );
    expect(desktopTopicForWeakAreaKey("Electricity")?.slug).toBe("electricity");
  });

  it("resolves an arbitrary variant via the strong candidate bridge (Change 1)", () => {
    // "carbon-compounds" is NOT one of the 13 explicit aliases; it only resolves
    // because the candidate expansion (the serving-side resolver) maps it.
    expect(desktopTopicForWeakAreaKey("carbon-compounds")?.slug).toBe(
      "carbon-and-its-compounds",
    );
  });

  it("still falls back (undefined) for a genuinely-unknown topic", () => {
    expect(desktopTopicForWeakAreaKey("totally-made-up-xyz")).toBeUndefined();
    expect(desktopTopicForWeakAreaKey("")).toBeUndefined();
  });
});
