// TUTOR-ANCHOR-KEY-1 (d) - the SURFACE CONTRACT. Every entry that opens the tutor about a specific bank
// question must put that question's id on the tutor URL (`q`): that one param is what the tutor resolves to
// the bank row + official key (useTutorSession -> buildAnchorQuestion). The launch points are large pages,
// so this pins the wiring at the call site: each surface builds its tutor path WITH `questionId`. If a
// surface drops it, the tutor silently loses the key for that surface again (the 30 Oct defect).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildTutorPath } from "./tutorPath";
import { signedOutTutorPath } from "./signedOutScorecardAsk";
import { positionalQuestionId } from "./tutorRoundTrip";

const SRC = resolve(__dirname, "../..");
const calls = (file: string): string[] =>
  (readFileSync(resolve(SRC, file), "utf8").match(/buildTutorPath\(\{[\s\S]*?\}\)/g) ?? []);

// surface -> [file, the number of its tutor launches that name a specific question]
const SURFACES: Array<[string, string, number]> = [
  ["Quick Practice - 'Ask the tutor about this question' (card)", "pages/PracticePage.tsx", 3], // card + live scorecard row + reopened record's rows
  ["Worksheet - graded scorecard 'Ask the tutor why I lost this mark'", "components/worksheet/WorksheetGenerator.tsx", 1],
  ["Chapter Test - scorecard row", "pages/ChapterTestPage.tsx", 1],
  ["Full Mock - scorecard row", "pages/FullMockPage.tsx", 1],
  ["Answer Checker - saved paper row (positional qn:<n>, no bank row)", "pages/desktop/DesktopCheckImprovePage.tsx", 1],
];

describe("every question-specific tutor launch names its question", () => {
  for (const [name, file, expected] of SURFACES) {
    it(`${name}: ${expected} launch(es) in ${file} pass questionId`, () => {
      const withQ = calls(file).filter((c) => /\bquestionId\s*:/.test(c));
      expect(withQ.length).toBe(expected);
    });
  }

  it("Topic Hub / Home / feedback chapter entries are chapter-level on purpose (no q): they open the tutor on a concept, not a question", () => {
    for (const file of ["pages/desktop/DesktopTopicHubPage.tsx", "lib/desktop/homeDestinations.tsx"]) {
      expect(calls(file).filter((c) => /\bquestionId\s*:/.test(c))).toHaveLength(0);
    }
    expect(calls("components/feedback/gradedFeedbackFlow.ts").filter((c) => /\bquestionId\s*:/.test(c))).toHaveLength(0);
  });

  it("the id reaches the URL as q, and the signed-out hop keeps it through sign-up", () => {
    expect(buildTutorPath({ subject: "Science", topicKey: "chemical-reactions-and-equations", questionId: "CHEM-EXMPLR-1-MCQ-002" })).toContain(
      "q=CHEM-EXMPLR-1-MCQ-002",
    );
    expect(
      signedOutTutorPath({ subject: "Science", topicKey: "chemical-reactions-and-equations", questionId: "CHEM-EXMPLR-1-MCQ-002" }),
    ).toContain("q=CHEM-EXMPLR-1-MCQ-002");
  });

  it("Answer Checker hands the tutor a POSITION (qn:<n>), which holds no bank row, so it can never be given a bank key", () => {
    expect(positionalQuestionId(3)).toBe("qn:3");
  });

  it("TutorPage forwards the URL's q to the session hook", () => {
    const page = readFileSync(resolve(SRC, "pages/tutor/TutorPage.tsx"), "utf8");
    expect(page).toMatch(/searchParams\.get\("q"\)/);
    expect(page).toMatch(/fromQuestionId:\s*questionId/);
  });
});
