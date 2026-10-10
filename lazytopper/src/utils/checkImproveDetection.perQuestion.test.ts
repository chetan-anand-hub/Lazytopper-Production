// TOPIC-FIX-1 - the deterministic guard is wired into the MULTI-upload path too (resolvePerQuestionGradeTopics):
// a question whose detect returned no chapter is filed by the guard when it carries one chapter's own words, a
// same-subject model answer is kept, and a question the guard has no rule for stays honestly unfiled.

import { describe, it, expect, vi } from "vitest";

const detect = vi.hoisted(() => ({ answers: new Map<string, { detectedTopic: string | null; detectedSubject: string | null }>() }));
vi.mock("../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: async (req: { question?: string }) => ({
      ok: true,
      detectedMarks: 3,
      marksSource: "inferred",
      ...(detect.answers.get(String(req.question)) ?? { detectedTopic: null, detectedSubject: null }),
    }),
  };
});

import { resolvePerQuestionGradeTopics } from "./checkImproveDetection";

const TRIG = "Prove that (1 + tan²A)/(1 + cot²A) = tan²A";
const QUAD = "Find the roots of 2x² - 5x + 3 = 0 by the quadratic formula.";
const SECTOR = "Find the area of the sector of a circle of radius 7 cm and angle 60°.";

describe("TOPIC-FIX-1 · guard in the multi-upload path", () => {
  it("★★ a trig proof with a NULL detect is filed under Trigonometry; a same-subject answer is kept; an unrelated null stays unfiled", async () => {
    detect.answers.set(TRIG, { detectedTopic: null, detectedSubject: "Maths" });
    detect.answers.set(QUAD, { detectedTopic: "quadratic-equations", detectedSubject: "Maths" });
    detect.answers.set(SECTOR, { detectedTopic: null, detectedSubject: "Maths" });
    const out = await resolvePerQuestionGradeTopics(
      [
        { questionNumber: 1, questionText: TRIG },
        { questionNumber: 2, questionText: QUAD },
        { questionNumber: 3, questionText: SECTOR },
      ],
      [],
    );
    expect(out.map((o) => [o.qNumber, o.topicSlug, o.subject])).toEqual([
      [1, "trigonometry", "Maths"],
      [2, "quadratic-equations", "Maths"],
      [3, "", "Maths"],
    ]);
  });
});
