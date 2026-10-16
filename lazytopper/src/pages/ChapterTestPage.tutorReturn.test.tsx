// FOLLOWUPS-1 B [FU-SCORECARD-TUTOR-REST] — Chapter Test: "Ask the tutor why I lost this mark"
// on a SAVED test's scorecard, and the tutor's back arrow returns to THAT scorecard.
//   A  the button renders on a question that lost marks, and not on a full-marks one;
//   B  its hop carries from=<record id>, q=<bank id>, returnTo=<this page>?review=<record id>,
//      and fires tutor_from_scorecard { surface: "chapter_test" };
//   C  landing on ?review=<id> reopens that scorecard ONCE via the existing reopen
//      (openStored), strips the param with replace, and makes ZERO recording calls;
//   D  signed out / another account's record / misaligned ids -> no button / no reopen.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { SessionRecord } from "../services/sessionRecords";

const auth = vi.hoisted(() => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" } as unknown }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
const setDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc,
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  deleteDoc: vi.fn(async () => {}),
}));

const store = vi.hoisted(() => ({ list: [] as unknown[], response: null as unknown, reads: 0 }));
const writes = vi.hoisted(() => ({ record: vi.fn(), payload: vi.fn(), partial: vi.fn(), grade: vi.fn() }));
vi.mock("../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => {
    store.reads += 1;
    return store.list;
  },
  getSessionPerQuestion: async () => (store.response ? { response: store.response } : null),
  writeSessionRecord: writes.record,
  writeSessionPerQuestion: writes.payload,
}));
vi.mock("../services/chapterTestGradeService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/chapterTestGradeService")>()),
  writeChapterTestPartialRecord: writes.partial,
  gradeChapterTestUpload: writes.grade,
}));

import ChapterTestPage from "./ChapterTestPage";

const CODE = "CT-M-REALNUMBERS-07";
const PAGE = "/chapter-test/10/maths/real-numbers";
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
  results: [grade(1, 1, 1), grade(2, 3, 1)],
  gradedMarksAwarded: 2,
  gradedMarksTotal: 4,
  gradedCount: 2,
  totalQuestions: 2,
  pendingCount: 0,
};
function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: CODE,
    worksheetId: "ct-1",
    surface: "chapter-test",
    title: "Real Numbers · Test #7",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q-a", "q-c"],
    marksAwarded: 2,
    marksTotal: 4,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: 1_790_000_000_000,
    perQuestionRef: `ct:${CODE}`,
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
function mount(at = PAGE) {
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<><ChapterTestPage /><Probe /></>} />
        <Route path="/tutor/:grade/:subject/:topicKey" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}
const askButtons = () => screen.queryAllByRole("button", { name: "Ask the tutor why I lost this mark" });
const noRecordingCalls = () => {
  expect(writes.record).not.toHaveBeenCalled();
  expect(writes.payload).not.toHaveBeenCalled();
  expect(writes.partial).not.toHaveBeenCalled();
  expect(writes.grade).not.toHaveBeenCalled();
  expect(setDoc).not.toHaveBeenCalled();
};

beforeEach(() => {
  window.localStorage.clear();
  auth.user = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
  store.list = [record()];
  store.response = RESPONSE;
  store.reads = 0;
  lastLocation = "";
  track.mockReset();
  Object.values(writes).forEach((w) => w.mockReset());
  setDoc.mockClear();
});
afterEach(() => cleanup());

describe("FOLLOWUPS-1 B · Chapter Test scorecard -> tutor -> the SAME scorecard", () => {
  it("★★ A+B: the saved scorecard shows ONE button (the lost-marks question) whose hop carries from, q and returnTo=…review=<id>", async () => {
    mount();
    fireEvent.click(await screen.findByText(/Real Numbers · Test #7/));
    await screen.findByRole("button", { name: "Done" });
    await waitFor(() => expect(askButtons()).toHaveLength(1));
    expect(document.body.textContent).toContain("Question 2");
    fireEvent.click(askButtons()[0]);
    await waitFor(() => expect(lastLocation).toMatch(/^\/tutor\/10\/Maths\/real-numbers\?/));
    const q = new URLSearchParams(lastLocation.split("?")[1]);
    expect(q.get("from")).toBe(CODE);
    expect(q.get("q")).toBe("q-c");
    expect(q.get("source")).toBe("scorecard");
    expect(q.get("returnTo")).toBe(`${PAGE}?review=${CODE}`);
    expect(track.mock.calls).toEqual([["tutor_from_scorecard", { surface: "chapter_test" }]]);
  });

  it("★★ C: landing on ?review=<id> reopens THAT scorecard once, strips the param with replace, zero recording calls", async () => {
    mount(`${PAGE}?review=${CODE}`);
    await screen.findByRole("button", { name: "Done" });
    expect(document.body.textContent).toContain("Real Numbers · Test #7");
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    expect(askButtons()).toHaveLength(1);
    noRecordingCalls();
  });

  it("★ C: a stale / unknown review id leaves the plain page (param stripped, nothing opened)", async () => {
    mount(`${PAGE}?review=CT-M-NOPE-01`);
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    await waitFor(() => expect(store.reads).toBeGreaterThan(1));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    noRecordingCalls();
  });

  it("★ D: another account's record is never reopened from review=", async () => {
    store.list = [record({ dedupKey: `someone-else::${CODE}` })];
    mount(`${PAGE}?review=${CODE}`);
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    await waitFor(() => expect(store.reads).toBeGreaterThan(1));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  it("★ D: signed out -> review= is just stripped; nothing is read for it", async () => {
    auth.user = null;
    store.list = [];
    mount(`${PAGE}?review=${CODE}`);
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(askButtons()).toHaveLength(0);
  });

  it("★ D: ids that do not align 1:1 with the stored results -> the scorecard opens with NO button", async () => {
    store.list = [record({ questionIds: ["q-c"] })];
    mount();
    fireEvent.click(await screen.findByText(/Real Numbers · Test #7/));
    await screen.findByRole("button", { name: "Done" });
    expect(askButtons()).toHaveLength(0);
  });

  it("★ A: a fully-marked test has no button (CONTROL: the scorecard itself is unchanged)", async () => {
    store.response = { ...RESPONSE, results: [grade(1, 1, 1), grade(2, 3, 3)], gradedMarksAwarded: 4 };
    store.list = [record({ marksAwarded: 4 })];
    mount();
    fireEvent.click(await screen.findByText(/Real Numbers · Test #7/));
    await screen.findByRole("button", { name: "Done" });
    expect(askButtons()).toHaveLength(0);
    expect(document.body.textContent).not.toContain("Where marks slipped");
  });
});
