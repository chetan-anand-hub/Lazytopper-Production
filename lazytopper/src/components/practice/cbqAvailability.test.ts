// CBQ-ENTRY-1 (P6) — which chapters have real Section-E CBQs, from the ASSEMBLED bank.
//
// Real loader, real engine, real bank. The check is Practice's own (a Section-E draw kept
// only through PracticePage.questionMatchesFilters with the Competency preset's filter),
// so the chooser's "coming soon" and the landing's gate cannot disagree. The emptied
// Section-E draw is the CONTROL: it proves the draw — not a list, not a text scan — decides.

import { describe, it, expect, beforeEach, vi } from "vitest";

const flags = vi.hoisted(() => ({ noSectionE: false }));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("./practiceQuestionBuilder", async (importOriginal) => {
  const real = await importOriginal<typeof import("./practiceQuestionBuilder")>();
  return {
    ...real,
    buildPracticeQuestionsFromEngine: (args: Parameters<typeof real.buildPracticeQuestionsFromEngine>[0]) =>
      flags.noSectionE && args.boardPattern === "E" ? [] : real.buildPracticeQuestionsFromEngine(args),
  };
});

import { chapterHasCbqs, chaptersWithCbqs, practiceTopicLabel } from "./cbqAvailability";
import { __resetBankChaptersForTest, isBankChapterLoaded } from "../../data/bankChapters/loader";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";

beforeEach(() => {
  __resetBankChaptersForTest();
  flags.noSectionE = false;
});

describe("CBQ-ENTRY-1 (P6) — chapters with real CBQs", () => {
  it("derives the bank label the way Practice does for a ?topic= slug", () => {
    expect(practiceTopicLabel("Maths", "triangles")).toBe("Triangles");
    expect(practiceTopicLabel("Maths", "pair-of-linear-equations")).toBe("Pair of Linear Equations in Two Variables");
    expect(practiceTopicLabel("Science", "how-do-organisms-reproduce")).toBe("Reproduction");
  });

  it("★ loads the subject and finds the chapters whose Section-E draw passes the Competency filter", async () => {
    const maths = desktopTopicsBySubject("Maths").map((t) => t.slug);
    const found = await chaptersWithCbqs("Maths", maths);
    expect(isBankChapterLoaded("triangles")).toBe(true);
    expect(found.has("triangles")).toBe(true);
    // Only chapters it was asked about, never invented ones.
    for (const slug of found) expect(maths).toContain(slug);
  }, 60000);

  it("CONTROL — with the Section-E draw empty, no chapter has CBQs (the draw decides)", async () => {
    flags.noSectionE = true;
    const maths = desktopTopicsBySubject("Maths").map((t) => t.slug);
    expect((await chaptersWithCbqs("Maths", maths)).size).toBe(0);
    expect(chapterHasCbqs("Maths", "triangles")).toBe(false);
  }, 60000);

  it("a slug with no bank chapter has none", async () => {
    await chaptersWithCbqs("Maths", []);
    expect(chapterHasCbqs("Maths", "not-a-chapter")).toBe(false);
    expect(chapterHasCbqs("Maths", "generic")).toBe(false);
  }, 60000);
});
