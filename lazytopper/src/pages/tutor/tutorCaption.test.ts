// TUTOR-UX-1 (A) — the student caption never leaks the curator's rationale.
import { describe, it, expect } from "vitest";
import { studentCaption } from "./tutorCaption";
import { conceptFigureCatalogue } from "./conceptVisualCatalogue.data";

describe("studentCaption", () => {
  it("shows the figure reference plus the concept label for the live-found Fig 9.9 leak", () => {
    expect(
      studentCaption(
        "NCERT Fig 9.9 — literally 'The New Cartesian Sign Convention for spherical mirrors'.",
        "Sign convention (New Cartesian)",
      ),
    ).toBe("NCERT Fig 9.9 · Sign convention (New Cartesian)");
  });

  it("keeps lettered figure references whole", () => {
    expect(studentCaption("NCERT Fig 6.1a — x", "Similar triangles")).toBe("NCERT Fig 6.1a · Similar triangles");
    expect(studentCaption("NCERT Fig 7.1(a) — x", "Reflection")).toBe("NCERT Fig 7.1(a) · Reflection");
  });

  it("shows only the concept label when the rationale has no NCERT figure reference", () => {
    expect(
      studentCaption(
        "Contains the radius-to-contact-point right angle, but as part of the equal-tangents proof, not isolated.",
        "Tangent perpendicular to radius",
      ),
    ).toBe("Tangent perpendicular to radius");
  });

  it("passes the resolver's own question-figure caption through", () => {
    expect(studentCaption("The figure from this question.", "Anything")).toBe("The figure from this question.");
  });
});

describe("every catalogue entry yields a clean student caption", () => {
  const BANNED = [/literally/i, /exactly/i, /not isolated/i, /contains/i, /["“”‘]/, /(^|[^\p{L}])['’]|['’]($|[^\p{L}])/u];
  // (An apostrophe INSIDE a word, e.g. "Mendel's", is part of a concept label, not a quotation.)
  for (const row of conceptFigureCatalogue) {
    it(`${row.topicKey} / ${row.conceptKey}`, () => {
      const cap = studentCaption(row.best.why, row.conceptLabel);
      for (const re of BANNED) expect(cap, `${re} in "${cap}"`).not.toMatch(re);
      expect(cap.length).toBeLessThanOrEqual(80);
      expect(cap.length).toBeGreaterThan(0);
      // The rationale text is never echoed.
      expect(cap).not.toContain(row.best.why.slice(0, 40).replace(/^NCERT Fig [\d.a-z()]+/, "").trim() || "\u0000");
    });
  }
});
