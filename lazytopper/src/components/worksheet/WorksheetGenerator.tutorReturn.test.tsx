// TUTOR-FIX-2 T9 [FU-WORKSHEET-TUTOR-RETURN] - Worksheet: "Ask the tutor why I lost this mark"
// on a SAVED worksheet's scorecard, and the tutor's back arrow returns to THAT scorecard.
//   A  the button renders on a question that lost marks, and not on a full-marks one;
//   B  its hop carries from=<record id>, q=<bank id>, returnTo=<this page>?review=<record id>,
//      and fires tutor_from_scorecard { surface: "worksheet" };
//   C  landing on ?review=<id> (a COLD load: no paper and no grade on this device) reopens the
//      paper through the EXISTING openUploadFor (server snapshot / rebuild) and shows the saved
//      scorecard, strips the param with replace, and makes ZERO grading / recording calls;
//   D  signed out / another account's record -> no reopen, no button.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const auth = vi.hoisted(() => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" } as unknown }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, snapshot: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => null }));
vi.mock("./worksheetPdfExport", () => ({ exportWorksheetPdf: async () => {}, exportGradedWorksheetPdf: async () => {} }));
vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
const track = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: track,
}));
// Grading spies: a reopen must NEVER reach any of these.
const grading = vi.hoisted(() => ({ grade: vi.fn(), ai: vi.fn() }));
vi.mock("../../services/worksheetGradeService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/worksheetGradeService")>()),
  gradeWorksheetAndRecord: grading.grade,
}));
vi.mock("../../ai/aiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../ai/aiClient")>()),
  gradeWorksheet: grading.ai,
}));

const fs = vi.hoisted(() => ({ docs: {} as Record<string, unknown>, writes: [] as Array<{ path: string; data: unknown }> }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    fs.writes.push({ path: ref.path, data });
  }),
  getDoc: vi.fn(async (ref: { path: string }) => {
    const d = fs.docs[ref.path];
    return { exists: () => d != null, data: () => d, metadata: { fromCache: false } };
  }),
  deleteDoc: vi.fn(async () => {}),
}));
const cloud = vi.hoisted(() => ({ list: [] as unknown[], reads: 0, payload: null as unknown }));
const recWrites = vi.hoisted(() => ({ record: vi.fn(), payload: vi.fn() }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: async () => {
      cloud.reads += 1;
      return cloud.list;
    },
    getSessionPerQuestion: async () => (cloud.payload ? { response: cloud.payload } : null),
    writeSessionRecord: recWrites.record,
    writeSessionPerQuestion: recWrites.payload,
  };
});

import WorksheetGenerator from "./WorksheetGenerator";
import { buildWorksheetSessionRecord, type SessionRecord } from "../../services/sessionRecords";

const CODE = "WS-M-REALNUMBERS-07";
const PAGE = "/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers";

function paper(): PersistedWorksheet {
  return {
    worksheetId: "ws-7",
    createdAt: "2026-10-10",
    title: "Real Numbers - Board exam mix",
    subject: "Maths",
    grade: "10",
    sectionFilter: "All",
    totalMarks: 4,
    code: CODE,
    name: "Real Numbers Worksheet #7",
    questions: [
      { qNumber: 1, id: "rn-q-a", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "q1", options: ["1", "2"], answer: "1" },
      { qNumber: 2, id: "rn-q-c", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "q2", solutionSteps: ["a"] },
    ],
  };
}
const grade = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
  qNumber,
  ok: true,
  couldNotRead: false,
  totalMarks,
  marksAwarded,
  percentage: Math.round((marksAwarded / totalMarks) * 100),
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "",
});
function response(q2Awarded = 1) {
  return {
    ok: true as const,
    worksheetId: "ws-7",
    results: [grade(1, 1, 1), grade(2, 3, q2Awarded)],
    totalQuestions: 2,
    gradedCount: 2,
    pendingCount: 0,
    gradedMarksAwarded: 1 + q2Awarded,
    gradedMarksTotal: 4,
    worksheetTotalMarks: 4,
  };
}
function record(over: Partial<SessionRecord> = {}, q2Awarded = 1): SessionRecord {
  return { ...buildWorksheetSessionRecord(paper(), response(q2Awarded) as never, { code: CODE }, "student-1"), ...over };
}

let lastLocation = "";
function Probe() {
  const l = useLocation();
  // eslint-disable-next-line react-hooks/globals -- test probe records the router location
  lastLocation = l.pathname + l.search;
  return null;
}
function mount(at = `${PAGE}&review=${CODE}`) {
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/practice/worksheets" element={<><WorksheetGenerator /><Probe /></>} />
        <Route path="/tutor/:grade/:subject/:topicKey" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}
const askButtons = () => screen.queryAllByRole("button", { name: "Ask the tutor why I lost this mark" });
const noGradingOrRecordingCalls = () => {
  expect(grading.grade).not.toHaveBeenCalled();
  expect(grading.ai).not.toHaveBeenCalled();
  expect(recWrites.record).not.toHaveBeenCalled();
  expect(recWrites.payload).not.toHaveBeenCalled();
  expect(fs.writes).toEqual([]);
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  auth.user = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
  // COLD: nothing on this device; the paper is on the server snapshot, the grade in the record payload.
  fs.docs = { [`sessionRecords/student-1/worksheetPapers/${CODE}`]: { code: CODE, name: paper().name, paper: paper(), savedAt: 1 } };
  fs.writes = [];
  cloud.list = [record()];
  cloud.payload = response();
  cloud.reads = 0;
  lastLocation = "";
  track.mockReset();
  grading.grade.mockReset();
  grading.ai.mockReset();
  recWrites.record.mockReset();
  recWrites.payload.mockReset();
});
afterEach(() => cleanup());

describe("TUTOR-FIX-2 T9 - Worksheet scorecard -> tutor -> the SAME scorecard", () => {
  it("[**] C: a cold ?review=<id> reopens THAT worksheet's scorecard via openUploadFor, strips the param, zero grading/recording calls", async () => {
    mount();
    await screen.findByRole("button", { name: "Read your graded worksheet" }, { timeout: 10000 });
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    await waitFor(() => expect(askButtons()).toHaveLength(1));
    expect(document.body.textContent).toContain("Question 2");
    noGradingOrRecordingCalls();
  });

  it("[**] A+B: ONE button (the lost-marks question) whose hop carries from, q, source and returnTo=...review=<id>", async () => {
    mount();
    await waitFor(() => expect(askButtons()).toHaveLength(1), { timeout: 10000 });
    fireEvent.click(askButtons()[0]);
    await waitFor(() => expect(lastLocation).toMatch(/^\/tutor\/10\/Maths\/real-numbers\?/));
    const q = new URLSearchParams(lastLocation.split("?")[1]);
    expect(q.get("from")).toBe(CODE);
    expect(q.get("q")).toBe("rn-q-c");
    expect(q.get("source")).toBe("scorecard");
    expect(q.get("returnTo")).toBe(`${PAGE}&review=${CODE}`);
    expect(track.mock.calls).toEqual([["tutor_from_scorecard", { surface: "worksheet" }]]);
    noGradingOrRecordingCalls();
  });

  it("[*] A: a fully-marked worksheet reopens with NO button (CONTROL: the scorecard itself still opens)", async () => {
    cloud.list = [record({}, 3)];
    cloud.payload = response(3);
    mount();
    await screen.findByRole("button", { name: "Read your graded worksheet" }, { timeout: 10000 });
    expect(askButtons()).toHaveLength(0);
    expect(document.body.textContent).not.toContain("Where marks slipped");
  });

  it("[*] D: another account's record is never reopened from review=", async () => {
    cloud.list = [record({ dedupKey: `someone-else::${CODE}` })];
    mount();
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    await waitFor(() => expect(cloud.reads).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("button", { name: "Read your graded worksheet" })).toBeNull();
    expect(askButtons()).toHaveLength(0);
    noGradingOrRecordingCalls();
  });

  it("[*] D: signed out -> review= is just stripped; nothing reopened, no button", async () => {
    auth.user = null;
    mount();
    await waitFor(() => expect(lastLocation).toBe(PAGE));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("button", { name: "Read your graded worksheet" })).toBeNull();
    expect(askButtons()).toHaveLength(0);
  });

  it("[*] D: a record whose saved marks differ from the shown grade gets NO button (never a mis-attributed question)", async () => {
    cloud.list = [record({ marksAwarded: 9 })];
    mount();
    await screen.findByRole("button", { name: "Read your graded worksheet" }, { timeout: 10000 });
    expect(askButtons()).toHaveLength(0);
  });
});
