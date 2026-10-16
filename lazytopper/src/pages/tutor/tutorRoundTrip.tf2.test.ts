// TUTOR-FIX-2 T6 — a return opener names the RETURNED record's own chapter(s), never the tutor's
// when they differ; a record with no chapter gets a neutral "your sheet". The live defect: the
// tutor on Trigonometry labelled a returned quadratic sheet "that Trigonometry sheet".
// + [FU-PRACTICE-COUNT-PASSTHROUGH]: the practice overlay always carries a count (default 2, cap 10).

import { describe, it, expect } from "vitest";
import {
  buildQuickPracticeRoundTripHref,
  composeCheckImproveRichReturnOpener,
  composeReturnOpener,
  composeScorecardQuestionOpener,
  returnedRecordLabel,
} from "./tutorRoundTrip";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { canonicalSlugMatches } from "../../data/syllabus/canonicalTopicSlug";
import type { SessionRecord } from "../../services/sessionRecords";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

const TRIG = { topicKey: "trigonometry", topicLabel: "Trigonometry" };
const nameOf = (k: string) => desktopTopicBySlug(k)?.name ?? null;
const label = (topicKeys: string[] | undefined, tutor = TRIG) =>
  returnedRecordLabel({ topicKeys } as Pick<SessionRecord, "topicKeys">, tutor, nameOf, canonicalSlugMatches);

const rec = (topicKeys: string[], over: Partial<SessionRecord> = {}) =>
  ({
    id: "CI-1",
    surface: "check-improve",
    topicKeys,
    marksAwarded: 1,
    marksTotal: 3,
    gradedAt: 2000,
    fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    ...over,
  }) as unknown as SessionRecord;

const RESPONSE = {
  results: [
    {
      qNumber: 1,
      ok: true,
      couldNotRead: false,
      totalMarks: 3,
      marksAwarded: 1,
      percentage: 33,
      annotatedSteps: [
        { stepNumber: 1, description: "Discriminant", status: "incorrect", teacherAnnotation: "b^2 - 4ac was taken as b^2 + 4ac." },
      ],
    },
  ],
} as unknown as WorksheetGradeResponse;

describe("T6 · returnedRecordLabel", () => {
  it("★★ the Part 0.4 case: tutor on Trigonometry, returned record = quadratic → Quadratic Equations", () => {
    expect(label(["quadratic-equations"])).toBe(nameOf("quadratic-equations"));
    expect(label(["quadratic-equations"])).toMatch(/Quadratic/);
    expect(label(["quadratic-equations"])).not.toMatch(/Trigonometry/);
  });
  it("the record IS the tutor's chapter → the tutor's own label (copy unchanged)", () => {
    expect(label(["trigonometry"])).toBe("Trigonometry");
  });
  it("two chapters → both named", () => {
    expect(label(["quadratic-equations", "trigonometry"])).toBe(`${nameOf("quadratic-equations")} and Trigonometry`);
  });
  it.each<[string, string[] | undefined]>([
    ["empty topicKeys", []],
    ["no topicKeys at all", undefined],
    ["a mixed paper", ["mixed:maths"]],
    ["more than two chapters", ["trigonometry", "quadratic-equations", "polynomials"]],
    ["an unknown chapter", ["not-a-chapter"]],
  ])("%s → neutral (no chapter claim)", (_n, keys) => {
    expect(label(keys)).toBe("");
  });
});

describe("T6 · the openers carry that label", () => {
  it("★★ C&I rich opener for the quadratic record names Quadratic Equations, not Trigonometry", () => {
    const o = composeCheckImproveRichReturnOpener(rec(["quadratic-equations"]), RESPONSE, label(["quadratic-equations"]));
    expect(o?.text).toContain(`The board marked that ${nameOf("quadratic-equations")} sheet 1 out of 3`);
    expect(o?.text).not.toMatch(/Trigonometry/);
  });
  it("★★ empty topicKeys → 'your sheet', no chapter claim", () => {
    const o = composeCheckImproveRichReturnOpener(rec([]), RESPONSE, label([]));
    expect(o?.text).toContain("The board marked your sheet 1 out of 3");
    expect(o?.text).not.toMatch(/Trigonometry/);
  });
  it("the thin opener's no-marks fallback is neutral too", () => {
    const o = composeReturnOpener(rec([], { marksAwarded: undefined, marksTotal: undefined }), "");
    expect(o.text).toBe("You're back with your graded sheet. Want to go through where it slipped, together?");
  });
  it("the scorecard question opener: named and neutral", () => {
    const result = { qNumber: 2, ok: true, couldNotRead: false, totalMarks: 1, marksAwarded: 0, percentage: 0 } as never;
    expect(composeScorecardQuestionOpener(2, result, "Real Numbers").text).toContain("Q2 on that Real Numbers set cost you 1 mark");
    expect(composeScorecardQuestionOpener(2, result, "").text).toContain("Q2 on your set cost you 1 mark");
  });
});

describe("[FU-PRACTICE-COUNT-PASSTHROUGH] · buildQuickPracticeRoundTripHref always carries a count", () => {
  const href = (count?: number) =>
    new URL(`https://x${buildQuickPracticeRoundTripHref({ returnTo: "/t", subject: "maths", topicKey: "trigonometry", count })}`);
  it.each<[number | undefined, string]>([
    [undefined, "2"],
    [5, "5"],
    [10, "10"],
    [25, "10"],
    [0, "2"],
    [-3, "2"],
  ])("count %s → %s", (count, out) => {
    expect(href(count).searchParams.get("count")).toBe(out);
  });
});
