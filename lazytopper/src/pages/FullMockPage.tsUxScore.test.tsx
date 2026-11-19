// TS-UX-SCORE-1 - Full Mock: a free account's submit auto-opens the partial scorecard WITHOUT the upload prompt (FullMockPage passes
// uploadNotAllowed: true): Section A's real marks, the B-E range and the two offers. Mirrors the Chapter Test pin in ChapterTestPage.seriesGate.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free", isPremium: false, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "free", plan: "none" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({
    limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false,
    blockPaperStart: () => false, planGrade: () => ({ action: "go" }), showLimit: () => {},
  }),
}));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});
vi.mock("../components/testSeries/WrittenCheckGate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../components/testSeries/WrittenCheckGate")>()),
  useSeriesPaperAccess: () => false,
  useSeriesAccess: () => ({ canCheck: false, canDownload: false, checking: false, failed: false, ownsSeries: false, status: null, retry: () => undefined }),
  useBoardPassHolder: () => false,
}));

import FullMockPage from "./FullMockPage";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TS-UX-SCORE-1 - Full Mock partial scorecard, free account", () => {
  it("no upload prompt; Section A marks, Sections B-E and the two offers", async () => {
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    for (let i = 0; i < 400 && screen.queryByRole("button", { name: /^Next →$/ }); i += 1) fireEvent.click(screen.getByRole("button", { name: /^Next →$/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /Submit & exit →/ })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now →/ }));
    expect(await screen.findByTestId("scorecard-wc-bp", {}, { timeout: 30000 })).toBeTruthy();
    expect(screen.getByTestId("scorecard-wc-ts")).toBeTruthy();
    expect(document.body.textContent).toMatch(/Section A marked: \d+\/\d+\. Your written answers \(Sections B–E\) are checked with the Test Series or the Board Pass\./);
    expect(screen.queryByText(/Upload answer sheet for the full result/)).toBeNull();
    expect(screen.queryByText(/Upload later/)).toBeNull();
  }, 300000);
});
