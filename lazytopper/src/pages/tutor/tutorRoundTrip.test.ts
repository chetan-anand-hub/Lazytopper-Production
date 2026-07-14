import { describe, it, expect } from "vitest";
import {
  buildQuickPracticeRoundTripHref,
  matchReturningAttempts,
  composePracticeReturnOpener,
} from "./tutorRoundTrip";
import type { TutorPendingMarker } from "../../services/tutorSessionStore";
import type { PracticeAttempt } from "../../services/practiceInsights";

const marker = (over: Partial<TutorPendingMarker> = {}): TutorPendingMarker => ({
  surface: "practice",
  topicKey: "trigonometry",
  departureTs: 1000,
  ...over,
});

const attempt = (over: Partial<PracticeAttempt> = {}): PracticeAttempt => ({
  id: "a1",
  questionId: "q1",
  topicKey: "trigonometry",
  subject: "maths",
  difficulty: "Medium",
  correct: true,
  timestamp: 2000,
  ...over,
});

describe("buildQuickPracticeRoundTripHref — Fix 1: routes to Quick Practice, not the worksheet builder", () => {
  it("builds /practice/:grade/:subject (NOT /practice/worksheets) with the concept focus", () => {
    const href = buildQuickPracticeRoundTripHref({
      returnTo: "/tutor/10/Maths/trigonometry",
      subject: "maths",
      topicKey: "trigonometry",
      concept: "Heights & distances",
    });
    expect(href).toContain("/practice/10/Maths?");
    expect(href).not.toContain("/practice/worksheets");
    expect(href).toContain("topic=trigonometry");
    expect(href).toContain("focus=Heights+%26+distances");
    expect(href).toContain("subtopicHint=Heights+%26+distances");
    expect(href).toContain("source=tutor");
    expect(href).toContain("returnTo=%2Ftutor%2F10%2FMaths%2Ftrigonometry");
  });

  it("carries NO mark-band (D-TUT-7: the missed concept, not a mark filter)", () => {
    const href = buildQuickPracticeRoundTripHref({
      returnTo: "/x",
      subject: "science",
      topicKey: "life-processes",
    });
    expect(href).toContain("/practice/10/Science?");
    expect(href).not.toContain("marksMin");
    expect(href).not.toContain("marksMax");
  });
});

describe("matchReturningAttempts — Fix 1: practiceInsights return detection", () => {
  const slugMatches = (a: string, b: string) => a === b;

  it("keeps only attempts after departure with a matching canonical topicKey", () => {
    const attempts = [
      attempt({ id: "before", timestamp: 500 }), // pre-departure
      attempt({ id: "other", topicKey: "polynomials", timestamp: 3000 }), // wrong topic
      attempt({ id: "hit", timestamp: 3000 }), // kept
    ];
    const out = matchReturningAttempts(attempts, marker(), slugMatches);
    expect(out.map((a) => a.id)).toEqual(["hit"]);
  });

  it("returns [] when nothing matches (banner stays actionable, never a false opener)", () => {
    expect(matchReturningAttempts([attempt({ timestamp: 500 })], marker(), slugMatches)).toEqual([]);
  });
});

describe("composePracticeReturnOpener — Fix 1: honest, no invented method/presentation split", () => {
  it("celebrates a clean set", () => {
    const opener = composePracticeReturnOpener([attempt(), attempt({ id: "a2" })], "Trigonometry");
    expect(opener.text).toContain("2 out of 2");
    expect(opener.follow?.send).toMatch(/harder/i);
  });

  it("names the misses without fabricating a root cause", () => {
    const opener = composePracticeReturnOpener(
      [attempt(), attempt({ id: "a2", correct: false })],
      "Trigonometry",
    );
    expect(opener.text).toContain("1 of 2");
    expect(opener.text).toMatch(/slipped/i);
    // No fourType language — that split belongs to the grader (C&I), not Practice.
    expect(opener.text).not.toMatch(/presentation|conceptual|calculation/i);
  });
});
