// TS-THEMES-1 — a Test Series FOCUS SET on the Full Mock page (`?focus=FS-M-LA-1`): the pinned short paper (written questions only),
// its own label / minutes / honest copy (no "3 hours", no unit-marks bar), a Board Pass holder starts it, submits, and goes straight
// to the upload step (no 0/0 objective scorecard); the grade request carries the focus worksheet id + the set's own questions.
// A free account with its one free test used meets the SAME start wall as any series paper (the rule is unchanged).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { focusSetCodeOfWorksheetId } from "../lib/testSeries/focusSets";
import { focusSetSpecOf } from "../lib/testSeries/pinnedFocusSet";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";

const sub = vi.hoisted(() => ({ tier: "premium" as "free" | "premium" }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: sub.tier, isPremium: sub.tier === "premium", isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: sub.tier, plan: sub.tier === "premium" ? "pass_till_boards" : "none" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/packs", async (orig) => ({ ...(await orig<typeof import("../services/packs")>()), fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) }));
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({
    limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false,
    blockPaperStart: () => false, planGrade: () => ({ action: "go" }), showLimit: () => {},
  }),
}));
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list, getSessionPerQuestion: async () => null };
});
vi.mock("../components/chaptertest/ChapterTestUploadPanel", () => ({
  default: (p: { code: string; objective: { awarded: number; total: number }; onGrade: (u: unknown) => void }) => (
    <div data-testid="upload-step">
      {p.code} · objective {p.objective.awarded}/{p.objective.total}
      <button type="button" onClick={() => p.onGrade({ imageBase64: "x", imageMimeType: "application/pdf" })}>
        stub-grade
      </button>
    </div>
  ),
}));
const grade = vi.hoisted(() => ({ calls: [] as Array<{ paper: PersistedWorksheet; subjectiveQuestions: Array<{ id?: unknown }> }> }));
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return {
    ...actual,
    gradeFullMockUpload: vi.fn(async (args: { paper: PersistedWorksheet; subjectiveQuestions: Array<{ id?: unknown }> }) => {
      grade.calls.push(args);
      return { ok: false, response: { ok: false, error: "stubbed" }, miOutcomes: [] };
    }),
  };
});

import FullMockPage from "./FullMockPage";

function mount(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  grade.calls = [];
  records.list = [];
  sub.tier = "premium";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TS-THEMES-1 · a focus set on the Full Mock page", () => {
  it("Board Pass: the set's label, minutes and copy; start, submit -> the upload step; the grade names the focus paper", async () => {
    mount("/full-mock/10/Maths?focus=FS-M-LA-1");
    const label = await screen.findByTestId("fm-series-label", {}, { timeout: 60000 });
    await waitFor(() => expect(label.textContent).toContain("Focus set · Long answers (5 marks) · Set 1 of 5 (FS-M-LA-1)"), { timeout: 60000 });
    const spec = focusSetSpecOf("FS-M-LA-1")!;
    expect((await screen.findByTestId("fm-focus-minutes", {}, { timeout: 60000 })).textContent).toBe(`${spec.minutes} minutes`);
    expect(screen.getByTestId("fm-focus-sub")).toBeTruthy();
    expect(document.body.textContent).not.toContain("Marks per unit");
    expect(document.body.textContent).not.toContain("3-hour");
    expect(document.body.textContent).toContain(`This is a ${spec.minutes}-minute paper.`);
    expect(screen.getByTestId("fm-series-line").textContent).toContain("A Test Series focus set");
    expect(document.body.textContent).toContain(`${spec.marks} marks`);
    fireEvent.click(screen.getByRole("button", { name: /Start the mock/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    for (let i = 0; i < 40 && screen.queryByRole("button", { name: /^Next →$/ }); i += 1) fireEvent.click(screen.getByRole("button", { name: /^Next →$/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /Submit & exit →/ })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now →/ }));
    const step = await screen.findByTestId("upload-step", {}, { timeout: 30000 });
    expect(step.textContent).toContain("objective 0/0");
    // No Section A on a focus set: no partial scorecard dialog over the upload step.
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "stub-grade" }));
    await waitFor(() => expect(grade.calls.length).toBe(1));
    const call = grade.calls[0];
    expect(focusSetCodeOfWorksheetId(call.paper.worksheetId)).toBe("FS-M-LA-1");
    expect(call.subjectiveQuestions.map((q) => String(q.id))).toEqual(spec.ids);
    // The sitting's clock is the set's own (persisted with the session), not the 3-hour Full Mock clock.
    const saved = Object.keys(window.localStorage).filter((k) => k.startsWith("lazytopper.fm.session.v1.")).map((k) => JSON.parse(window.localStorage.getItem(k)!));
    expect(saved.some((x) => x.durationMs === spec.minutes * 60_000)).toBe(true);
  }, 300000);

  it("a free account whose one free test is used meets the same start wall (rule unchanged)", async () => {
    sub.tier = "free";
    records.list = [{ id: "FM-M-01", surface: "full-mock", status: "partial", gradedAt: Date.parse("2026-11-20T10:00:00+05:30"), worksheetId: "fm-x", marksAwarded: 0, marksTotal: 0 }];
    mount("/full-mock/10/Maths?focus=FS-M-CB-2");
    await screen.findByText(/Case-based questions \(4 marks\) · Set 2 of 5/, {}, { timeout: 60000 });
    fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }));
    expect(await screen.findByTestId("series-start-wall", {}, { timeout: 30000 })).toBeTruthy();
    expect(document.querySelector(".lt-ct__exit")).toBeNull();
  }, 300000);

  it("kill switch VITE_TS_FOCUS_SETS_DISABLED: ?focus= is ignored - the ordinary full mock opens", async () => {
    vi.stubEnv("VITE_TS_FOCUS_SETS_DISABLED", "1");
    mount("/full-mock/10/Maths?focus=FS-M-LA-1");
    expect(await screen.findByText(/A complete board paper/, {}, { timeout: 60000 })).toBeTruthy();
    expect(screen.queryByTestId("fm-series-label")).toBeNull();
    expect(screen.queryByTestId("fm-focus-minutes")).toBeNull();
  }, 300000);
});
