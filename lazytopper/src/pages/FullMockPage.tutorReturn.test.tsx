// FOLLOWUPS-1 B [FU-SCORECARD-TUTOR-REST] — Full Mock: "Ask the tutor why I lost this mark" on a
// SAVED mock's scorecard, and the tutor's back arrow returns to THAT scorecard.
//   A  the button renders only on a question that lost marks AND whose ONE chapter is known
//      (a served bank id); a predicted-sourced id (no chapter) and a full-marks question get none;
//   B  the hop carries from=<record id>, q=<bank id>, the question's own chapter, and
//      returnTo=/full-mock/10/maths?review=<record id>; fires tutor_from_scorecard { full_mock };
//   C  ?review=<id> reopens that scorecard ONCE via the existing reopen (openStored), strips the
//      param with replace, and makes ZERO recording calls;
//   D  another account's record is never reopened.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { SessionRecord } from "../services/sessionRecords";
import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
const setDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc,
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  deleteDoc: vi.fn(async () => {}),
}));
const store = vi.hoisted(() => ({ list: [] as unknown[], response: null as unknown }));
const writes = vi.hoisted(() => ({ record: vi.fn(), payload: vi.fn(), grade: vi.fn(), partial: vi.fn() }));
vi.mock("../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => store.list,
  getSessionPerQuestion: async () => (store.response ? { response: store.response } : null),
  writeSessionRecord: writes.record,
  writeSessionPerQuestion: writes.payload,
}));
vi.mock("../services/fullMockGradeService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/fullMockGradeService")>()),
  gradeFullMockUpload: writes.grade,
  writeFullMockPartialRecord: writes.partial,
}));

import FullMockPage from "./FullMockPage";
import { __resetUsageClientForTests } from "../services/usageClient";

const CODE = "FM-M-02";
const PAGE = "/full-mock/10/maths";
// Two REAL served maths bank ids (their chapters come from the bank index, never guessed).
const served = [...bankIndexEntries()].filter(([, m]) => resolveCanonicalSlug(m.topicKey) === "real-numbers").slice(0, 2);
const [[ID_FULL], [ID_LOST, META_LOST]] = served;
const ID_PRED = "predicted-not-in-bank-zz";
const grade = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks,
  marksAwarded,
  percentage: Math.round((marksAwarded / totalMarks) * 100),
});
const RESPONSE = {
  ok: true,
  results: [grade(1, 1, 1), grade(2, 3, 1), grade(3, 2, 0)],
  gradedMarksAwarded: 2,
  gradedMarksTotal: 6,
  gradedCount: 3,
  totalQuestions: 3,
  pendingCount: 0,
};
function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: CODE,
    worksheetId: "fm-1",
    surface: "full-mock",
    title: "Maths · Mock #2",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: [ID_FULL, ID_LOST, ID_PRED],
    marksAwarded: 2,
    marksTotal: 6,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: Date.UTC(2026, 6, 15),
    perQuestionRef: `fm:${CODE}`,
    dedupKey: `student-1::${CODE}`,
    ...over,
  } as SessionRecord;
}

let lastLocation = "";
function Probe() {
  const l = useLocation();
  lastLocation = l.pathname + l.search;
  return null;
}
function mount(at: string) {
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<><FullMockPage /><Probe /></>} />
        <Route path="/tutor/:grade/:subject/:topicKey" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}
const askButtons = () => screen.queryAllByRole("button", { name: "Ask the tutor why I lost this mark" });

beforeEach(() => {
  window.localStorage.clear();
  __resetUsageClientForTests();
  store.list = [record()];
  store.response = RESPONSE;
  lastLocation = "";
  track.mockReset();
  Object.values(writes).forEach((w) => w.mockReset());
  setDoc.mockClear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FOLLOWUPS-1 B · Full Mock scorecard -> tutor -> the SAME scorecard", () => {
  it("fixture: two served bank ids with a known chapter", () => {
    expect(served).toHaveLength(2);
    expect(META_LOST.topicKey).toBeTruthy();
  });

  it("★★ C+A+B: ?review=<id> reopens THAT mock once (param stripped, zero recording calls); ONE button, on the lost-marks bank question", async () => {
    mount(`${PAGE}?review=${CODE}`);
    await screen.findByRole("button", { name: "Done" }, { timeout: 60000 });
    expect(document.body.textContent).toContain("Maths · Mock #2");
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    // Q1 full marks -> none; Q2 lost + served id -> one; Q3 lost but predicted id (no chapter) -> none.
    await waitFor(() => expect(askButtons()).toHaveLength(1));
    expect(writes.record).not.toHaveBeenCalled();
    expect(writes.payload).not.toHaveBeenCalled();
    expect(writes.grade).not.toHaveBeenCalled();
    expect(writes.partial).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();

    fireEvent.click(askButtons()[0]);
    await waitFor(() => expect(lastLocation).toMatch(/^\/tutor\/10\/Maths\//));
    const [path, search] = lastLocation.split("?");
    expect(decodeURIComponent(path.split("/").pop() ?? "")).toBe(resolveCanonicalSlug(META_LOST.topicKey));
    const q = new URLSearchParams(search);
    expect(q.get("from")).toBe(CODE);
    expect(q.get("q")).toBe(ID_LOST);
    expect(q.get("returnTo")).toBe(`${PAGE}?review=${CODE}`);
    expect(track.mock.calls).toEqual([["tutor_from_scorecard", { surface: "full_mock" }]]);
  }, 90000);

  it("★ D: another account's record is never reopened from review= (param still stripped)", async () => {
    store.list = [record({ dedupKey: `someone-else::${CODE}` })];
    mount(`${PAGE}?review=${CODE}`);
    await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  }, 90000);
});
