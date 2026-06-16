// @vitest-environment node
//
// Claim 2 — auto-detect marks/subject/topic in Check & Improve.
// The grader now determines the topic; this helper canonicalises that detected
// topic into a real topics.ts key for storage (so MI attribution stays clean) and
// applies honest fallbacks. The marks-extraction itself is an LLM-prompt concern
// (not deterministically unit-testable); this locks the deterministic half: the
// detected topic/subject → canonical context mapping.
import { describe, expect, it } from "vitest";
import { resolveDetectedGradeTopic } from "./checkImproveDetection";

describe("resolveDetectedGradeTopic — canonicalises the AI-detected topic", () => {
  it("maps a canonical slug to its topic + subject", () => {
    const r = resolveDetectedGradeTopic({
      detectedTopic: "light-reflection-and-refraction",
      detectedSubject: "Science",
    });
    expect(r.topicSlug).toBe("light-reflection-and-refraction");
    expect(r.subject).toBe("Science");
    expect(r.topicName).toBeTruthy();
  });

  it("canonicalises a non-kebab spelling via the shared resolver (Fix A)", () => {
    // The AI might echo a PascalCase abbreviation; it must still land on the
    // canonical key, not be stored as a fragmenting variant.
    const r = resolveDetectedGradeTopic({
      detectedTopic: "MagneticEffects",
      detectedSubject: "Science",
    });
    expect(r.topicSlug).toBe("magnetic-effects-of-electric-current");
    expect(r.subject).toBe("Science");
  });

  it("prefers the resolved topic's subject over a mismatched detectedSubject", () => {
    const r = resolveDetectedGradeTopic({
      detectedTopic: "quadratic-equations",
      detectedSubject: "Science", // wrong; the resolved topic is authoritative
    });
    expect(r.topicSlug).toBe("quadratic-equations");
    expect(r.subject).toBe("Maths");
  });

  it("falls back to no topicKey (full-subject) when the topic is null/unknown", () => {
    const nullTopic = resolveDetectedGradeTopic({
      detectedTopic: null,
      detectedSubject: "Maths",
    });
    expect(nullTopic.topicSlug).toBe("");
    expect(nullTopic.topicName).toBe("");
    expect(nullTopic.subject).toBe("Maths");

    const unknownTopic = resolveDetectedGradeTopic({
      detectedTopic: "totally-made-up-xyz",
      detectedSubject: "Science",
    });
    expect(unknownTopic.topicSlug).toBe("");
    expect(unknownTopic.subject).toBe("Science"); // honest fallback to AI subject
  });

  it("defaults subject to Maths when nothing resolves", () => {
    const r = resolveDetectedGradeTopic({ detectedTopic: null, detectedSubject: null });
    expect(r.subject).toBe("Maths");
    expect(r.topicSlug).toBe("");
  });
});
