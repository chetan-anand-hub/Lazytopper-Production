// PracticePage — MLT-MUTE-1 · the honest end of the bank.
//
// "More like this" no longer asks the AI to write questions once the verified bank runs out
// (owner ruling 2026-10-22). A set can therefore come back SHORTER than the student asked for.
// When it does, the page says so in plain words — "That's every question we have like this for
// now." — and offers real next steps on routes that exist (Chapter Test, the Practice hub).
//
// RED on the old code: the note did not exist (the AI top-up padded the set instead).
// ★ ONE router — the same seed-location harness as PracticePage.solutionError.test.tsx.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "student-1", isLocalSession: false, email: "s@x.com" },
    loading: false,
    getToken: async () => "tok",
  }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
  recordWrongAnswer: () => {},
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, sessionRotationOffset: () => 0 };
});
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  // MLT-MUTE-2: a narrow filter also merges the chapter's whole served pool; these FIXTURE tests
  // pin the pool to the mocked draw (the real-bank cases live in PracticePage.narrowDraw.test.tsx).
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn(), buildChapterServedPool: () => [] };
});

import PracticePage from "./PracticePage";
import { buildPracticeQuestionsWithAiTopup } from "../components/practice/practiceQuestionBuilder";
import { BANK_END_TITLE, FILTERS_EMPTY_TITLE, FILTERS_EMPTY_BODY } from "../components/practice/PracticeQuestionList";

const mockBuild = vi.mocked(buildPracticeQuestionsWithAiTopup);
type PQ = import("../data/predictionDataService").PracticeQuestion;

function written(n: number): PQ {
  return {
    id: `q-${n}`,
    questionText: `Question ${n}: solve it.`,
    marks: 3,
    section: "C",
    format: "vsa",
    difficulty: "Easy",
    subtopic: "seed",
    topicKey: "real-numbers",
  } as unknown as PQ;
}

afterEach(() => {
  cleanup();
  mockBuild.mockReset();
});

function mount(served: PQ[], query: string, overlay = false) {
  mockBuild.mockResolvedValue(served);
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?${query}`]}>
      <Routes>
        <Route
          path="/practice/:grade/:subject"
          element={overlay ? <PracticePage overlay={{ onClose: () => {} }} /> : <PracticePage />}
        />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

async function openSet(served: PQ[], count: number, extra = "", overlay = false) {
  mount(served, `topic=real-numbers&count=${count}${extra}`, overlay);
  await screen.findAllByText(/^Question \d+: solve it\.$/, {}, { timeout: 30000 });
}

const heroText = () => screen.getByText(/in this set\./).textContent ?? "";

describe("MLT-MUTE-1 · the honest end of the bank", () => {
  it("★★ RED on the old code: a set SHORTER than asked says it is every question we have, with real next steps", async () => {
    await openSet([written(1)], 3);
    const note = await screen.findByTestId("qp-bank-end");
    expect(note).toHaveTextContent(BANK_END_TITLE);
    expect(BANK_END_TITLE).toBe("That's every question we have like this for now.");
    const ct = screen.getByTestId("qp-bank-end-chapter-test");
    expect(ct.getAttribute("href")).toMatch(/^\/chapter-test\/10\/[^/]+\/real-numbers$/);
    expect(screen.getByTestId("qp-bank-end-practice-hub").getAttribute("href")).toBe("/practice-hub");
    // Nothing is invented to fill the gap: exactly the one served question is on the page.
    expect(screen.getAllByText(/^Question \d+: solve it\.$/)).toHaveLength(1);
  });

  it("★ CONTROL: a FULL set (the bank had enough) shows no end-of-bank note", async () => {
    await openSet([written(1), written(2), written(3)], 3);
    expect(screen.getAllByText(/^Question \d+: solve it\.$/)).toHaveLength(3);
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
    // MLT-MUTE-2 control: a full set states the asked-for size, as before.
    expect(heroText()).toContain("3 questions in this set.");
    expect(screen.getByTestId("qp-chip-count")).toHaveTextContent("3 questions");
  });
});

describe("MLT-MUTE-2 · the page states the REAL set size, and an empty filter says so", () => {
  const six = () => [1, 2, 3, 4, 5, 6].map(written);

  it("★★ RED on trunk: 6 of 30 says \"6 questions in this set\" and the chip \"6 questions\" (not 30)", async () => {
    await openSet(six(), 30);
    expect(screen.getAllByText(/^Question \d+: solve it\.$/)).toHaveLength(6);
    expect(heroText()).toContain("6 questions in this set.");
    expect(heroText()).not.toContain("30 questions");
    expect(screen.getByTestId("qp-chip-count")).toHaveTextContent(/^6 questions$/);
    // 1..N-1: the MLT-MUTE-1 note stays exactly as shipped.
    expect(await screen.findByTestId("qp-bank-end")).toHaveTextContent(BANK_END_TITLE);
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
  });

  it("★★ RED on trunk: 0 of 30 after filtering shows the filters-empty state with Edit filters — never the end-of-bank note", async () => {
    // The pool HAS questions (all Easy); the student's diff=Hard matches none of them.
    mount(six(), "topic=real-numbers&count=30&diff=Hard");
    const empty = await screen.findByTestId("qp-filters-empty", {}, { timeout: 30000 });
    expect(empty).toHaveTextContent(FILTERS_EMPTY_TITLE);
    expect(FILTERS_EMPTY_TITLE).toBe("No questions match these filters.");
    expect(empty).toHaveTextContent(FILTERS_EMPTY_BODY);
    expect(FILTERS_EMPTY_BODY).toBe("Try fewer filters, or another chapter.");
    expect(screen.getByTestId("qp-filters-empty-practice-hub")).toHaveTextContent("Practise another chapter");
    expect(screen.getByTestId("qp-filters-empty-practice-hub").getAttribute("href")).toBe("/practice-hub");
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
    expect(screen.queryAllByText(/^Question \d+: solve it\.$/)).toHaveLength(0);
    expect(heroText()).toContain("0 questions in this set.");
    expect(screen.getByTestId("qp-chip-count")).toHaveTextContent(/^0 questions$/);
    // Edit filters opens the SAME filter editor as the toolbar's Edit filters: the built
    // toolbar goes and the five-dimension filter (with its Build button) is back.
    fireEvent.click(screen.getByTestId("qp-filters-empty-edit"));
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
    expect(screen.queryByTestId("qp-chip-count")).toBeNull();
    expect(screen.getByRole("button", { name: /build/i })).toBeInTheDocument();
  });

  it("★ the end-of-bank note is NOT shown inside the tutor overlay (#1295 review follow-up)", async () => {
    await openSet([written(1)], 3, "&source=tutor&backLabel=Back+to+your+tutor", true);
    expect(screen.getAllByText(/^Question \d+: solve it\.$/)).toHaveLength(1);
    expect(screen.queryByTestId("qp-bank-end")).toBeNull();
  });

  it("★ the Chapter Test link encodes the topic key (#1295 review follow-up)", async () => {
    await openSet([written(1)], 3);
    const href = screen.getByTestId("qp-bank-end-chapter-test").getAttribute("href") ?? "";
    const key = href.split("/").pop() ?? "";
    expect(key).toBe(encodeURIComponent(decodeURIComponent(key)));
  });
});
