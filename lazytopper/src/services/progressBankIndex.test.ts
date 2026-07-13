// @vitest-environment node
//
// PR-B — the pure bank-index concept/section resolver. The heavy canonicalQuestionBank
// is mocked with a tiny fixture so the resolver's honesty rules (unknown id → null,
// chapter-echo suppression, section normalization) are asserted in isolation.

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../data/canonicalQuestionBank", () => ({
  canonicalQuestionBank: [
    { id: "rn-1", subtopic: "HCF and LCM", section: "A", topicKey: "real-numbers" },
    { id: "rn-2", subtopic: "  Irrationality Proofs  ", section: "Section D", topicKey: "Real-Numbers" },
    { id: "lp-1", subtopic: "Chapter Practice — Life Processes", section: "B", topicKey: "life-processes" },
    { id: "pyq-1", subtopic: "General", section: "C", topicKey: "polynomials" },
    { id: "blank", subtopic: "", section: "", topicKey: "" },
  ],
}));

import {
  conceptForQuestionId,
  isChapterEchoSubtopic,
  normalizeSection,
  __resetProgressBankIndexForTest,
} from "./progressBankIndex";

beforeEach(() => {
  __resetProgressBankIndexForTest();
});

describe("conceptForQuestionId", () => {
  it("resolves a real bank id to trimmed {subtopic, section, topicKey}", () => {
    expect(conceptForQuestionId("rn-1")).toEqual({ subtopic: "HCF and LCM", section: "A", topicKey: "real-numbers" });
    // topicKey is lowercased for stable topic-scoped matching.
    expect(conceptForQuestionId("rn-2")).toEqual({ subtopic: "Irrationality Proofs", section: "Section D", topicKey: "real-numbers" });
  });

  it("returns null for an unknown / synthetic / empty id (unknowable — never fabricated)", () => {
    expect(conceptForQuestionId("ws:ws-abc:q1")).toBeNull();
    expect(conceptForQuestionId("does-not-exist")).toBeNull();
    expect(conceptForQuestionId("")).toBeNull();
    expect(conceptForQuestionId(null)).toBeNull();
    expect(conceptForQuestionId(undefined)).toBeNull();
  });
});

describe("isChapterEchoSubtopic", () => {
  it("flags chapter-echo / catch-all / blank placeholders", () => {
    expect(isChapterEchoSubtopic("Chapter Practice — Life Processes")).toBe(true);
    expect(isChapterEchoSubtopic("General")).toBe(true);
    expect(isChapterEchoSubtopic("")).toBe(true);
    expect(isChapterEchoSubtopic(null)).toBe(true);
  });

  it("passes a real concept-grained subtopic", () => {
    expect(isChapterEchoSubtopic("HCF and LCM")).toBe(false);
    expect(isChapterEchoSubtopic("Basic Proportionality Theorem")).toBe(false);
  });
});

describe("normalizeSection", () => {
  it("extracts a single A–E bucket, else honest passthrough", () => {
    expect(normalizeSection("A")).toBe("A");
    expect(normalizeSection("Section D")).toBe("D");
    expect(normalizeSection("e")).toBe("E");
    expect(normalizeSection("")).toBe("");
    expect(normalizeSection("Competency")).toBe("Competency");
  });
});
