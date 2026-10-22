// FILTER-FIX-1 (#1298 review MUST-FIX 1) — Desktop Practice's "PYQ only" opens a PYQ set.
//
// DesktopPracticePage builds `/practice/10/maths?topic=…&count=…&pyq=1&source=practice&returnTo=…`
// (pages/desktop/DesktopPracticePage.tsx: `if (params.pyqOnly) sp.set("pyq", "1")` then
// `sp.set("source", SOURCE)` with SOURCE = "practice", an ORIGIN tag). The first FILTER-FIX-1 head
// read `pyq=1` only when `source` was absent, so with the real desktop URL it never fired.
// `source=practice` opens the preset chooser, and a preset then overwrote the source with its own
// "all". RED on head f0979534: the built set has no PYQ source chip; Customise shows "All questions".

import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
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

import PracticePage, { questionMatchesFilters } from "./PracticePage";
import { buildChapterServedPool } from "../components/practice/practiceQuestionBuilder";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import { ensureBankChapters } from "../data/bankChapters/loader";

let pyqInChapter = 0;

beforeAll(async () => {
  const label = practiceTopicLabel("Maths", "real-numbers");
  await ensureBankChapters([label]);
  pyqInChapter = buildChapterServedPool({ subjectKey: "Maths", topicKey: label })
    .filter((q) => questionMatchesFilters(q, "all", "all", "pyq", "all", null)).length;
}, 90000);

afterEach(() => cleanup());

function openDesktopUrl(extra: string) {
  setMatchMediaMatches(true);
  const returnTo = encodeURIComponent("/practice");
  render(
    <MemoryRouter initialEntries={[`/practice/10/maths?topic=real-numbers&count=5${extra}&source=practice&returnTo=${returnTo}`]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

// `source=practice` is the hub CTA: it lands on the preset chooser (deriveArrivedTargeted), so the
// student picks a set. The PYQ request must survive that pick, and the Customise panel.
async function pickBoardMix() {
  fireEvent.click(await screen.findByText("Board mix", {}, { timeout: 60000 }));
  fireEvent.click(screen.getByRole("button", { name: /Start practising/ }));
  await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
}

describe("FILTER-FIX-1 · Desktop pyq=1 with source=practice (the real desktop URL)", () => {
  it("★★ RED on the first #1298 heads: pyq=1&source=practice → a preset builds a PYQ set", async () => {
    expect(pyqInChapter).toBeGreaterThanOrEqual(8);
    openDesktopUrl("&pyq=1");
    await pickBoardMix();
    expect(screen.getByTestId("qp-chip-source")).toHaveTextContent("Board exam (PYQ)");
  }, 120000);

  it("★★ RED on the first #1298 heads: pyq=1&source=practice → Customise opens with the PYQ source picked", async () => {
    openDesktopUrl("&pyq=1");
    fireEvent.click(await screen.findByRole("button", { name: /Customise/ }, { timeout: 60000 }));
    const pyqChip = await screen.findByRole("button", { name: /Board exam \(PYQ\)/ });
    expect(pyqChip.className).toContain("qp-filter-chip--active");
  }, 120000);

  it("★ CONTROL: the same desktop URL without pyq=1 stays an all-sources set", async () => {
    openDesktopUrl("");
    await pickBoardMix();
    expect(screen.queryByTestId("qp-chip-source")).toBeNull();
  }, 120000);
});
