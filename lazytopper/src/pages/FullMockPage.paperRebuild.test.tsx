// PAPER-REBUILD-1 (cofounder D102/D103a) — test (f): a pending Full Mock whose paper is on neither
// this device nor the server cannot be rebuilt (its Section A result frozen at submit lives only
// with the paper), so the re-open says so honestly and offers a NEW mock — never an upload action.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionRecord } from "../services/sessionRecords";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  deleteDoc: vi.fn(async () => {}),
}));
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list, getSessionPerQuestion: async () => null };
});

import FullMockPage from "./FullMockPage";
import { __resetUsageClientForTests } from "../services/usageClient";

const CODE = "FM-M-02";
function pendingMock(): SessionRecord {
  return {
    id: CODE,
    worksheetId: "fm-old-1",
    surface: "full-mock",
    title: "Maths · Mock #2",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q1", "q2"],
    marksAwarded: 12,
    marksTotal: 20,
    status: "partial",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: Date.UTC(2026, 6, 15),
    perQuestionRef: `fm:${CODE}`,
    dedupKey: `student-1::${CODE}`,
  } as SessionRecord;
}

beforeEach(() => {
  window.localStorage.clear();
  __resetUsageClientForTests();
  records.list = [];
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PAPER-REBUILD-1 (f) · Full Mock with no saved paper", () => {
  it("★ 'Upload now' -> honest line, 'Start a new test' + Done, NO upload action; Start begins a new mock", async () => {
    records.list = [pendingMock()];
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    fireEvent.click(await screen.findByRole("button", { name: /Upload now/ }));
    await waitFor(() => expect(document.body.textContent).toContain("so it can't be uploaded here"));
    expect(screen.queryByRole("button", { name: /Upload answer sheet/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start a new test" }));
    await waitFor(() => expect(document.body.textContent).not.toContain("so it can't be uploaded here"));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Start the mock/ })).toBeNull());
  }, 90000);
});
