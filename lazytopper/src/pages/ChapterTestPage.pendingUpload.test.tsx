// PENDING-UPLOAD-1 PR-1 — "Upload later" on a Chapter Test must be completable.
// Owner-found live bug: the "⏳ Awaiting sheet" card opened a read-only card whose only
// action was Done. These pin the decisions: a pending test re-opens ITS OWN paper on the
// upload step (same code), from this device or the server snapshot; no copy -> an honest
// message, never a rebuilt paper; a graded record still opens read-only.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionRecord } from "../services/sessionRecords";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";
import type { ObjectiveScore } from "../services/chapterTestGradeService";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));

const fs = vi.hoisted(() => ({ snapshot: null as unknown, deleted: [] as string[] }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async () => {}),
  getDoc: vi.fn(async () => ({ exists: () => fs.snapshot != null, data: () => fs.snapshot })),
  deleteDoc: vi.fn(async (ref: { path: string }) => {
    fs.deleted.push(ref.path);
  }),
}));

const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: async () => records.list,
    getSessionPerQuestion: async () => null,
  };
});

import ChapterTestPage from "./ChapterTestPage";
import { storedChapterTestScorecardVariant } from "../components/results/scorecardBankLenses";
import {
  saveChapterTestPaper,
  loadChapterTestPaper,
  deleteChapterTestPaper,
} from "../services/chapterTestPaperStore";

const CODE = "CT-M-REALNUMBERS-07";
const paper: PersistedWorksheet = {
  worksheetId: "ct-pending-1",
  createdAt: "2026-10-10",
  title: "Real Numbers test",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 4,
  code: CODE,
  name: "Real Numbers · Test #7",
  questions: [
    { qNumber: 1, id: "q-a", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "HCF of 6 and 8?", options: ["1", "2", "3", "4"], answer: "2" },
    { qNumber: 2, id: "q-c", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove sqrt(2) is irrational.", solutionSteps: ["a", "b", "c"] },
  ],
};
const objective: ObjectiveScore = {
  results: [{ qNumber: 1, id: "q-a", selected: "2", correct: true, awarded: 1, total: 1 }],
  awarded: 1,
  total: 1,
  answeredCount: 1,
  totalQuestions: 1,
};
function record(status: SessionRecord["status"]): SessionRecord {
  return {
    id: CODE,
    worksheetId: paper.worksheetId,
    surface: "chapter-test",
    title: "Real Numbers · Test #7",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q-a", "q-c"],
    marksAwarded: 1,
    marksTotal: 1,
    status,
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    gradedAt: Date.now(),
    perQuestionRef: `ct:${CODE}`,
    dedupKey: `student-1::${CODE}`,
  } as unknown as SessionRecord;
}

async function mount() {
  render(
    <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const snap = () => ({ code: CODE, name: paper.name ?? "", subject: "Maths" as const, topicKey: "real-numbers", paper, objective });

beforeEach(() => {
  window.localStorage.clear();
  fs.snapshot = null;
  fs.deleted = [];
  records.list = [];
});
afterEach(() => cleanup());

describe("PENDING-UPLOAD-1 · Chapter Test pending card -> upload step", () => {
  it("★ pending card with this device's copy opens the upload step on the SAME paper (same code, no new record)", async () => {
    records.list = [record("pending-upload")];
    saveChapterTestPaper(USER as never, snap());
    await mount();
    fireEvent.click(await screen.findByText(/Awaiting sheet/));
    await waitFor(() => expect(document.body.textContent).toContain(CODE));
    // The upload step, not the read-only card: no "Done"-only dead end.
    await waitFor(() => expect(document.body.textContent).toMatch(/upload/i));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(document.body.textContent).toContain("Real Numbers · Test #7");
  });

  it("★ local storage empty -> the server snapshot is used (and re-seeded locally)", async () => {
    fs.snapshot = { ...snap(), savedAt: 1 };
    const got = await loadChapterTestPaper(USER as never, CODE);
    expect(got?.paper.worksheetId).toBe("ct-pending-1");
    expect(got?.paper.questions).toHaveLength(2);
    expect(JSON.parse(window.localStorage.getItem("lazytopper.ct.papers.v1.student-1") ?? "[]")).toHaveLength(1);
  });

  it("★ no copy anywhere -> the honest message, never a rebuilt paper", async () => {
    records.list = [record("pending-upload")];
    await mount();
    fireEvent.click(await screen.findByText(/Awaiting sheet/));
    await waitFor(() =>
      expect(document.body.textContent).toContain(
        "This paper was opened on another device before we saved papers online. Open it there, or start a new one.",
      ),
    );
    expect(screen.queryByRole("button", { name: /Upload answer sheet/ })).toBeNull();
  });

  it("★ a graded record still opens read-only (no upload step)", async () => {
    records.list = [record("graded")];
    saveChapterTestPaper(USER as never, snap());
    await mount();
    fireEvent.click(await screen.findByText(/Real Numbers · Test #7/));
    await screen.findByRole("button", { name: "Done" });
    expect(screen.queryByRole("button", { name: /Upload answer sheet/ })).toBeNull();
  });

  it("★ submitting a test stores its paper + frozen objective (the thing 'Upload later' returns to)", async () => {
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: /Start the test/ }));
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    fireEvent.click(document.querySelector(".lt-ct__exit") as HTMLElement);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    await waitFor(() => expect(window.localStorage.getItem("lazytopper.ct.papers.v1.student-1")).not.toBeNull());
    const stored = JSON.parse(window.localStorage.getItem("lazytopper.ct.papers.v1.student-1") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].code).toMatch(/^CT-M-/);
    expect(stored[0].paper.questions.length).toBeGreaterThan(5);
    expect(stored[0].objective.totalQuestions).toBeGreaterThan(0);
  });

  it("delete removes this device's copy and the server snapshot; signed-out users store nothing", async () => {
    saveChapterTestPaper(USER as never, snap());
    deleteChapterTestPaper(USER as never, CODE);
    expect(JSON.parse(window.localStorage.getItem("lazytopper.ct.papers.v1.student-1") ?? "[]")).toHaveLength(0);
    expect(fs.deleted).toContain(`sessionRecords/student-1/chapterTestPapers/${CODE}`);
    saveChapterTestPaper({ uid: "x", isLocalSession: true } as never, snap());
    expect(window.localStorage.getItem("lazytopper.ct.papers.v1.x")).toBeNull();
  });
});

describe("PENDING-UPLOAD-1 · stored pending scorecard variant", () => {
  const input = (extra: object) => ({ gradedDateLabel: "10 Oct 2026", response: null, onDone: () => {}, ...extra });
  it("★ has a primary 'Upload answer sheet' action next to Done when a handler is supplied", () => {
    const onUploadSheet = vi.fn();
    const v = storedChapterTestScorecardVariant(record("pending-upload"), input({ onUploadSheet }));
    expect(v.actions.map((a) => a.label)).toEqual(["Upload answer sheet", "Done"]);
    v.actions[0].onClick?.();
    expect(onUploadSheet).toHaveBeenCalledOnce();
  });
  it("without a handler it is exactly as before (Done only) — other callers unchanged", () => {
    const v = storedChapterTestScorecardVariant(record("pending-upload"), input({}));
    expect(v.actions.map((a) => a.label)).toEqual(["Done"]);
  });
});
