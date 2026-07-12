// resolveTopicDisplayName fallback — [FU-TOPIC-DISPLAY-TITLECASE].
// The fallback (no canonical registry title) must keep connectives lowercase,
// CBSE chapter-title style. Fake slugs exercise the fallback mechanics so the
// tests stay valid even if the real chapters later gain registry titles; the
// two real affected slugs are asserted loosely (no uppercase connective) for
// the same reason.

import { describe, it, expect } from "vitest";
import { resolveTopicDisplayName } from "./topicResolver";
import { getCanonicalChapterBySlug } from "../data/syllabus/cbse10Canonical";

describe("resolveTopicDisplayName fallback (FU-TOPIC-DISPLAY-TITLECASE)", () => {
  it("keeps connectives lowercase in the fallback", () => {
    expect(resolveTopicDisplayName("maths", "pair-of-imaginary-things")).toBe(
      "Pair of Imaginary Things",
    );
    expect(resolveTopicDisplayName("science", "signals-and-imaginary-circuits")).toBe(
      "Signals and Imaginary Circuits",
    );
    expect(resolveTopicDisplayName("maths", "intro-to-the-unknown")).toBe(
      "Intro to the Unknown",
    );
  });

  it("capitalizes a leading connective", () => {
    expect(resolveTopicDisplayName("maths", "the-imaginary-topic")).toBe(
      "The Imaginary Topic",
    );
  });

  it("the FM-legend chapters never render an uppercase connective", () => {
    // These resolve via the registry title when one exists, else the fallback —
    // either way no " Of " / " And " may appear (the defect this FU fixes).
    for (const [subject, slug] of [
      ["maths", "pair-of-linear-equations"],
      ["science", "control-and-coordination"],
    ] as const) {
      const label = resolveTopicDisplayName(subject, slug);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain(" Of ");
      expect(label).not.toContain(" And ");
    }
  });

  it("a canonical registry title still wins over the fallback", () => {
    const canonical = getCanonicalChapterBySlug("real-numbers");
    expect(canonical?.title).toBeTruthy();
    expect(resolveTopicDisplayName("maths", "real-numbers")).toBe(canonical!.title);
  });
});
