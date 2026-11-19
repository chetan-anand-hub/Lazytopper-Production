// HUB-TS-1 (owner addition 09:41) — a series paper opened from the chooser lands on the REAL Chapter Test page with its
// "Timed (board practice)" toggle, working as today. The chooser adds no timer choice of its own.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "premium", plan: "pass_till_boards" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/sessionRecords", async (orig) => ({ ...(await orig<typeof import("../../services/sessionRecords")>()), getSessionRecordsFromCloud: async () => [] }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) }));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));

import SeriesChooser from "./SeriesChooser";
import ChapterTestPage from "../../pages/ChapterTestPage";

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HUB-TS-1 — the timer toggle survives the chooser", () => {
  it("chooser -> series paper: the page shows 'Timed (board practice)' and the toggle flips", async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<SeriesChooser open onClose={() => {}} />} />
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Timed \(board practice\)/)).toBeNull(); // the chooser offers no timer choice
    fireEvent.click(await screen.findByTestId("ts-chapter-real-numbers"));
    fireEvent.click(screen.getByTestId("ts-go"));
    expect(await screen.findByText(/Timed \(board practice\)/, {}, { timeout: 60000 })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Toggle timer" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  }, 90000);

  it("chooser FRESH chapter option: same page, same toggle", async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<SeriesChooser open onClose={() => {}} />} />
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId("ts-chapter-real-numbers"));
    fireEvent.click(screen.getByTestId("ts-fresh"));
    expect(await screen.findByText(/Timed \(board practice\)/, {}, { timeout: 60000 })).toBeInTheDocument();
  }, 90000);

  // TS-MORE-1: the timer on/off stays exactly as today on the new chapter papers.
  it("TS-MORE-1: chooser -> chapter PAPER 3 (CT-M01-3): the page opens that paper, shows 'Timed (board practice)' and the toggle flips", async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<SeriesChooser open onClose={() => {}} />} />
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId("ts-chapter-real-numbers"));
    fireEvent.click(screen.getByTestId("ts-paper-3"));
    expect(screen.getByTestId("ts-go")).toHaveTextContent("Paper 3");
    fireEvent.click(screen.getByTestId("ts-go"));
    expect(await screen.findByText(/Timed \(board practice\)/, {}, { timeout: 60000 })).toBeInTheDocument();
    expect(screen.getByTestId("ct-series-label")).toHaveTextContent("CT-M01-3");
    expect(screen.getByTestId("ct-series-label")).toHaveTextContent("Paper 3 of 5");
    const toggle = screen.getByRole("button", { name: "Toggle timer" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  }, 90000);
});
