import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QuestionVisualAid } from "./QuestionVisualAid";
import { getFiguresForQuestion } from "../../data/visualConceptRegistry";

// FIGURE-HONESTY-1 PR-1 — the app must not draw a figure it does not have.
//
// visualConceptRegistry.ts:500-501 states the rule this file enforces:
//   "Exact, id-keyed, and never heuristic: a wrong figure is worse than none."
// It was written when the honest binder landed and never enforced: below the
// bound-figure branch, QuestionVisualAid fell through to inferVisualKind, which
// picks a GENERIC synthetic template from the chapter name and stem words. A
// question that never mentions a figure was shown a plain triangle.
//
// This file pins BOTH directions, because either alone is worthless:
//   (a) a question WITH a bound figure still renders it   — the regression guard
//   (b) a question with NO binding renders nothing        — the fix itself
//
// (b) was proved RED before it was trusted green: inverting the production
// `return null` to fall through to the heuristic makes it fail. See the report.
//
// NOTE ON SCOPE: this removes a DRAWING, never a QUESTION. Nothing here asserts
// anything about which questions are served, because this lane changes that not
// at all.

// A REAL bound id, read from the registry rather than invented — if the binding
// is ever removed, the first assertion below fails loudly instead of passing
// vacuously against a question that never had a figure.
const BOUND_ID = "Z3-RN-003";

describe("QuestionVisualAid — never invents a figure", () => {
  it("the fixture id is genuinely bound (guards against a vacuous test)", () => {
    expect(getFiguresForQuestion(BOUND_ID).length).toBeGreaterThan(0);
  });

  it("(a) renders the bound source figure when the question has one", () => {
    const { container } = render(
      <QuestionVisualAid
        questionId={BOUND_ID}
        topicKey="real-numbers"
        questionText="Any stem at all."
        marks={3}
      />
    );
    expect(container.querySelector("img")).not.toBeNull();
    expect(container.textContent).toContain("Figure from the question paper");
  });

  it("(b) renders NOTHING when the question has no bound figure", () => {
    // topicKey "coordinate-geometry" is one of the ten chapter names that fired
    // the heuristic on the CHAPTER ALONE, and this stem asks for no figure.
    const { container } = render(
      <QuestionVisualAid
        questionId="NO-SUCH-BOUND-ID-000"
        topicKey="coordinate-geometry"
        questionText="Find the distance between the points (1, 2) and (4, 6)."
        marks={3}
      />
    );
    expect(getFiguresForQuestion("NO-SUCH-BOUND-ID-000")).toHaveLength(0);
    expect(container.innerHTML).toBe("");
  });

  it("(b2) renders nothing for a stem full of heuristic trigger words", () => {
    // "prove", "similar", "triangle" are all in the topic regex. Before this
    // change these drew a generic triangle carrying none of the question's
    // labels. The chapter name "triangles" does NOT itself fire the regex
    // (\btriangle\b has no boundary before the plural s) — the stem words do.
    const { container } = render(
      <QuestionVisualAid
        questionId="NO-SUCH-BOUND-ID-001"
        topicKey="triangles"
        questionText="Prove that the two triangles are similar and that the median is perpendicular."
        marks={5}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("(b3) renders nothing when no questionId is supplied at all", () => {
    const { container } = render(
      <QuestionVisualAid topicKey="circles" questionText="Draw a tangent to the circle." marks={2} />
    );
    expect(container.innerHTML).toBe("");
  });
});
