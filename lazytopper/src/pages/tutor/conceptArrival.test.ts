// TUTOR-UX-1 (B) — pure arrival rules.
import { describe, it, expect } from "vitest";
import { arrivalDividerIndex, arrivalDividerText, shortConcept, starterChips } from "./conceptArrival";
import type { TutorTurn } from "../../ai/tutorClient";

const old: TutorTurn[] = [
  { role: "user", content: "Explain refraction" },
  { role: "tutor", content: "Refraction is the bending of light." },
];

describe("shortConcept / chips / divider text", () => {
  it("cuts at the first formula or parenthesis", () => {
    expect(shortConcept("Mirror formula (1/v + 1/u = 1/f)")).toBe("Mirror formula");
    expect(shortConcept("Mirror formula")).toBe("Mirror formula");
    expect(shortConcept("(odd) label")).toBe("(odd) label");
  });
  it("builds the two starter chips and the divider", () => {
    expect(starterChips("Mirror formula").map((c) => c.text)).toEqual([
      "Explain Mirror formula simply",
      "Where am I losing marks here?",
    ]);
    expect(arrivalDividerText(" Mirror formula ")).toBe("Now on: Mirror formula");
  });
});

describe("arrivalDividerIndex", () => {
  it("is the thread length for a restored thread not about the concept", () => {
    expect(arrivalDividerIndex({ concept: "Mirror formula", messages: old, pending: null })).toBe(2);
  });
  it("is null without a concept, on a fresh thread, or with a pending round trip", () => {
    expect(arrivalDividerIndex({ concept: undefined, messages: old, pending: null })).toBeNull();
    expect(arrivalDividerIndex({ concept: "Mirror formula", messages: [], pending: null })).toBeNull();
    expect(arrivalDividerIndex({ concept: "Mirror formula", messages: old, pending: {} })).toBeNull();
  });
  it("is null when the last turn already covers the concept", () => {
    const about: TutorTurn[] = [...old, { role: "tutor", content: "The mirror formula links u, v and f." }];
    expect(arrivalDividerIndex({ concept: "Mirror formula (1/v + 1/u = 1/f)", messages: about, pending: null })).toBeNull();
  });
  it("is null when the thread ends on a returned-work or away note", () => {
    for (const kind of ["return-result", "away-cue"] as const) {
      const m: TutorTurn[] = [...old, { role: "tutor", content: "x", kind }];
      expect(arrivalDividerIndex({ concept: "Mirror formula", messages: m, pending: null })).toBeNull();
    }
  });
});
