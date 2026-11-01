// TUTOR-STICKY-1 — the page-level behaviour, through a mocked session hook (the TutorPage.tf2 harness):
//   · a LIVE reply ends in ONE one-tap check; a restored thread, a truncated reply and an away-cue do not;
//   · a thread opened from the daily card (?fix=) offers the NEXT lost mark once the check is done;
//   · the daily "Fix 3 lost marks" card opens a fresh thread that has no question to anchor on, and only that.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { TutorTurn } from "../../ai/tutorClient";

const H = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  send: vi.fn(),
  fix: null as unknown,
}));

vi.mock("./useTutorSession", () => ({
  useTutorSession: () => ({
    opener: { text: "Electricity - Class 10.", forks: [] },
    messages: [] as TutorTurn[],
    status: "idle",
    error: null,
    errorState: null,
    started: false,
    canRoundTrip: true,
    pending: null,
    returnFollow: null,
    send: H.send,
    retry: () => {},
    openCheckImproveOverlay: () => {},
    checkImproveOverlayOpen: false,
    closeCheckImprove: () => {},
    openQuickPracticeOverlay: () => {},
    quickPracticeOverlayOpen: false,
    closeQuickPractice: () => {},
    quickPracticeHref: "",
    recheckPending: () => {},
    dismissPending: () => {},
    ...H.state,
  }),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("../../components/usage/UsageWarning", () => ({ default: () => null }));
vi.mock("../../components/tutorSticky/useDailyFix", () => ({ useDailyFix: () => H.fix }));
vi.mock("../../components/tutorSticky/TrialTutorSummary", () => ({ default: () => null }));
vi.mock("../../data/bankChapters/loader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/bankChapters/loader")>();
  return { ...actual, ensureBankChapters: vi.fn(async () => undefined) };
});
vi.mock("../../data/bankQuery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/bankQuery")>();
  return {
    ...actual,
    selectBankQuestions: vi.fn(() => [
      {
        id: "Q-CHECK",
        format: "MCQ",
        subtopic: "Ohm's law",
        questionText: "Which unit measures resistance?",
        options: ["volt", "ohm", "ampere", "watt"],
        answer: "ohm",
      },
    ]),
  };
});

import TutorPage from "./TutorPage";

const tree = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
    </Routes>
  </MemoryRouter>
);
const u = (content: string): TutorTurn => ({ role: "user", content });
const t = (over: Partial<TutorTurn> = {}): TutorTurn => ({ role: "tutor", content: "Here is why.", ...over });
const item = (key: string, done = false) => ({
  key,
  line: `Light — concept gap, 1 mark (${key})`,
  path: `/tutor/10/Science/light?fix=${key}`,
  done,
});

beforeEach(() => {
  H.state = {};
  H.send.mockReset();
  H.fix = null;
  localStorage.clear();
});
afterEach(cleanup);

describe("the one-tap check", () => {
  it("a restored thread (no live reply) offers none", async () => {
    H.state = { messages: [u("Why?"), t()] };
    render(tree("/tutor/10/science/electricity"));
    await Promise.resolve();
    expect(screen.queryByTestId("tutor-check")).toBeNull();
  });

  it("a LIVE reply (sending -> idle) ends in one check, graded on the device", async () => {
    H.state = { messages: [u("Why?")], status: "sending" };
    const view = render(tree("/tutor/10/science/electricity"));
    H.state = { messages: [u("Why?"), t()], status: "idle" };
    view.rerender(tree("/tutor/10/science/electricity"));
    await screen.findByTestId("tutor-check");
    fireEvent.click(screen.getByTestId("tutor-check-opt-1"));
    expect(screen.getByTestId("tutor-check-result").textContent).toContain("Right — nice work."); // no concept known: chapter fallback, neutral line
    // no fix param -> no "next lost mark"
    expect(screen.queryByTestId("tutor-next-fix")).toBeNull();
  });

  it("the check goes away when the thread moves on, and a cut-off reply earns none", async () => {
    H.state = { messages: [u("Why?")], status: "sending" };
    const view = render(tree("/tutor/10/science/electricity"));
    H.state = { messages: [u("Why?"), t({ truncated: true })], status: "idle" };
    view.rerender(tree("/tutor/10/science/electricity"));
    await Promise.resolve();
    expect(screen.queryByTestId("tutor-check")).toBeNull();
    H.state = { messages: [u("Why?"), t({ truncated: true }), u("more")], status: "sending" };
    view.rerender(tree("/tutor/10/science/electricity"));
    H.state = { messages: [u("Why?"), t({ truncated: true }), u("more"), t()], status: "idle" };
    view.rerender(tree("/tutor/10/science/electricity"));
    await screen.findByTestId("tutor-check");
    H.state = { messages: [u("Why?"), t({ truncated: true }), u("more"), t(), u("again")], status: "idle" };
    view.rerender(tree("/tutor/10/science/electricity"));
    expect(screen.queryByTestId("tutor-check")).toBeNull();
  });

  it("opened from the daily card (?fix=): once checked, the NEXT lost mark is offered", async () => {
    H.fix = { access: "open", uid: "u1", items: [item("m1"), item("m2")] };
    H.state = { messages: [u("Why?")], status: "sending" };
    const view = render(tree("/tutor/10/science/electricity?fix=m1&q=Q-ANCHOR"));
    H.state = { messages: [u("Why?"), t()], status: "idle" };
    view.rerender(tree("/tutor/10/science/electricity?fix=m1&q=Q-ANCHOR"));
    await screen.findByTestId("tutor-check");
    expect(screen.queryByTestId("tutor-next-fix")).toBeNull(); // not before the check is answered
    fireEvent.click(screen.getByTestId("tutor-check-opt-0"));
    await waitFor(() => expect(screen.getByTestId("tutor-next-fix-go").getAttribute("href")).toBe("/tutor/10/Science/light?fix=m2"));
  });
});

describe("the daily card as the tutor's opening offer", () => {
  it("shows on a fresh thread with no question to anchor on", () => {
    H.fix = { access: "open", uid: "u1", items: [item("m1")] };
    render(tree("/tutor/10/science/electricity"));
    expect(screen.getByTestId("daily-fix-tutor")).toBeTruthy();
  });
  it("is not shown when the thread is already about a question", () => {
    H.fix = { access: "open", uid: "u1", items: [item("m1")] };
    render(tree("/tutor/10/science/electricity?q=Q-1&fix=m1"));
    expect(screen.queryByTestId("daily-fix-tutor")).toBeNull();
  });
  it("is not shown once the thread has started", () => {
    H.fix = { access: "open", uid: "u1", items: [item("m1")] };
    H.state = { messages: [u("hi"), t()] };
    render(tree("/tutor/10/science/electricity"));
    expect(screen.queryByTestId("daily-fix-tutor")).toBeNull();
  });
});
