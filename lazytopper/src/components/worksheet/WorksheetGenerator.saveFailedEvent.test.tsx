// SMALL-FIXES-1 - when a worksheet's save-for-later does not happen, ONE no-PII analytics event goes
// out: `worksheet_save_failed` with a closed reason class only (no code, no id, no text). A save that
// works emits nothing. NO grading behaviour is touched (the grade panel is a stub here).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./WorksheetGradePanel", () => ({
  default: (props: { ws: PersistedWorksheet }) => <div data-testid="grade-panel">{props.ws.code}</div>,
}));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
vi.mock("./worksheetPdfExport", () => ({
  exportWorksheetPdf: async () => {},
  exportGradedWorksheetPdf: async () => {},
}));
const track = vi.hoisted(() => ({ calls: [] as Array<{ name: string; params: unknown }> }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return {
    ...actual,
    trackOnboardingEvent: (name: string, params: unknown) => {
      track.calls.push({ name, params });
    },
  };
});

const fs = vi.hoisted(() => ({ docs: {} as Record<string, unknown>, recordReadFailures: 0 }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async (ref: { path: string }) => {
    if (ref.path.includes("/records/") && fs.recordReadFailures > 0) {
      fs.recordReadFailures--;
      throw new Error("read failed");
    }
    const d = fs.docs[ref.path];
    return { exists: () => d != null, data: () => d, metadata: { fromCache: false } };
  }),
  deleteDoc: vi.fn(async () => {}),
}));
const cloud = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => cloud.list };
});

import WorksheetGenerator from "./WorksheetGenerator";
import { saveWorksheetSession } from "../../services/worksheetSessionStore";
import { buildWorksheetSessionRecord, writeSessionRecord, type SessionRecord } from "../../services/sessionRecords";

function paper(id: string, code: string): PersistedWorksheet {
  return {
    worksheetId: id,
    createdAt: "2026-10-10",
    title: `Real Numbers ${code}`,
    subject: "Maths",
    grade: "10",
    sectionFilter: "All",
    totalMarks: 4,
    code,
    name: `Worksheet ${code}`,
    questions: [
      { qNumber: 1, id: `${id}-a`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "q1", options: ["1", "2"], answer: "1" },
      { qNumber: 2, id: `${id}-c`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "q2", solutionSteps: ["a"] },
    ],
  };
}

function seedPendingRecord(p: PersistedWorksheet) {
  const rec = buildWorksheetSessionRecord(
    p,
    {
      ok: true, worksheetId: p.worksheetId,
      results: p.questions.map((q) => ({ qNumber: q.qNumber, couldNotRead: true, totalMarks: q.marks, note: "x" })),
      totalQuestions: 2, gradedCount: 0, pendingCount: 2, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 4,
    } as never,
    { code: p.code! },
    "student-1",
  ) as SessionRecord;
  writeSessionRecord(USER as never, rec);
  cloud.list = [rec];
  return rec;
}

beforeEach(() => {
  localStorage.clear();
  fs.docs = {};
  fs.recordReadFailures = 0;
  cloud.list = [];
  track.calls = [];
  auth.user = USER;
  auth.loading = false;
});
afterEach(() => cleanup());

async function openReady(p: PersistedWorksheet) {
  seedPendingRecord(p);
  saveWorksheetSession(p);
  render(
    <MemoryRouter initialEntries={[`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`]}>
      <WorksheetGenerator />
    </MemoryRouter>,
  );
  await screen.findByTestId("grade-panel");
}
const dl = () => screen.findByRole("button", { name: /Worksheet \(questions\)/ });
const saveFailed = () => track.calls.filter((c) => c.name === "worksheet_save_failed");

describe("SMALL-FIXES-1 - worksheet_save_failed", () => {
  it("a save that lands emits nothing", async () => {
    const p = paper("ws-ok", "WS-M-REALNUMBERS-0K");
    await openReady(p);
    fireEvent.click(await dl());
    await screen.findByTestId("ws-paper-note");
    expect(saveFailed()).toEqual([]);
  });

  it("a save that cannot land emits one event, reason write_failed, and nothing identifying", async () => {
    const p = paper("ws-f", "WS-M-REALNUMBERS-0F");
    await openReady(p);
    fs.recordReadFailures = 99;
    fireEvent.click(await dl());
    await screen.findByTestId("ws-paper-save-failed", undefined, { timeout: 5000 });
    expect(saveFailed()).toEqual([{ name: "worksheet_save_failed", params: { reason: "write_failed" } }]);
    expect(JSON.stringify(saveFailed())).not.toContain(p.code!);
    expect(JSON.stringify(saveFailed())).not.toContain(p.worksheetId);
  });
});
