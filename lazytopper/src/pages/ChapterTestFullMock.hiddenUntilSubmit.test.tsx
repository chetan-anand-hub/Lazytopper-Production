// PRACTICE-HONESTY-1 · spec item 4 — Chapter Test / Full Mock: solutions stay hidden until
// the paper is submitted AND graded. VERIFY-ONLY: the scout found no leak, so no product code
// changed for this item; these tests pin it so a later change cannot leak one silently.
//
//   setup + taking   → no "Solution key", and no solution-step text of ANY drawn question
//   submitted (partial, written answers not yet graded) → still no "Solution key"
//   fully graded     → "Solution key" IS offered (the CONTROL: proves the probe can see it)
//
// The paper is the REAL draw (the real bank), captured by wrapping the draw function, so the
// step text probed is exactly the text that rides on the paper in client memory.
//
// ★ ONE router per mount — the MemoryRouter stands in for the app's outer router.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { captured, gradeChapterTestUpload, gradeFullMockUpload } = vi.hoisted(() => ({
  captured: { ct: null as null | { paper: { questions: Array<{ qNumber: number; questionText?: string; options?: string[]; solutionSteps?: string[] }> } }, fm: null as null | { paper: { questions: Array<{ qNumber: number; questionText?: string; options?: string[]; solutionSteps?: string[] }> } } },
  gradeChapterTestUpload: { impl: null as null | ((...a: unknown[]) => unknown) },
  gradeFullMockUpload: { impl: null as null | ((...a: unknown[]) => unknown) },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
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
vi.mock("../components/chaptertest/chapterTestBlueprint", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/chaptertest/chapterTestBlueprint")>();
  return {
    ...actual,
    drawChapterTest: (...args: Parameters<typeof actual.drawChapterTest>) => {
      const d = actual.drawChapterTest(...args);
      captured.ct = d as unknown as typeof captured.ct;
      return d;
    },
  };
});
vi.mock("../components/fullmock/fullMockBlueprint", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/fullmock/fullMockBlueprint")>();
  return {
    ...actual,
    drawFullMock: (...args: Parameters<typeof actual.drawFullMock>) => {
      const d = actual.drawFullMock(...args);
      captured.fm = d as unknown as typeof captured.fm;
      return d;
    },
  };
});
vi.mock("../services/chapterTestGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/chapterTestGradeService")>();
  return {
    ...actual,
    gradeChapterTestUpload: (...a: unknown[]) =>
      gradeChapterTestUpload.impl ? gradeChapterTestUpload.impl(...a) : new Promise(() => {}),
  };
});
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return {
    ...actual,
    gradeFullMockUpload: (...a: unknown[]) =>
      gradeFullMockUpload.impl ? gradeFullMockUpload.impl(...a) : new Promise(() => {}),
  };
});

import ChapterTestPage from "./ChapterTestPage";
import FullMockPage from "./FullMockPage";
import { __setGradingJobTimersForTests, type StoredGradingJob } from "../ai/gradingJobs";
import { buildChapterTestResponse } from "../services/chapterTestGradeService";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  captured.ct = null;
  captured.fm = null;
  gradeChapterTestUpload.impl = null;
  gradeFullMockUpload.impl = null;
  __setGradingJobTimersForTests({ now: () => 5_000 });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  __setGradingJobTimersForTests({ now: null });
  window.sessionStorage.clear();
  window.localStorage.clear();
});

type Q = { qNumber: number; questionText?: string; options?: string[]; solutionSteps?: string[] };

/** The probe: step lines that are long, plain (no TeX, so the DOM would carry them
 *  verbatim) and NOT part of any question's own stem/options — so finding one in the
 *  page can only mean a solution leaked. */
function sentinelSteps(questions: Q[]): string[] {
  const visible = questions.map((q) => `${q.questionText ?? ""} ${(q.options ?? []).join(" ")}`).join("\n");
  const out = new Set<string>();
  for (const q of questions) {
    for (const s of q.solutionSteps ?? []) {
      const t = String(s).trim();
      if (t.length < 24 || /[$\\^_{}]/.test(t) || visible.includes(t)) continue;
      out.add(t);
    }
  }
  return [...out];
}

function expectNoLeak(sentinels: string[], where: string) {
  const text = document.body.textContent ?? "";
  expect(text, `${where}: "Solution key" must not be offered`).not.toMatch(/Solution key/);
  expect(text, `${where}: no steps panel`).not.toMatch(/Solution steps|Show steps|Show solution/);
  const leaked = sentinels.filter((s) => text.includes(s));
  expect(leaked, `${where}: solution-step text in the DOM`).toEqual([]);
}

/** Walk every question of the taking phase, probing each screen; then submit. */
async function walkAndSubmit(sentinels: string[], count: number, label: string) {
  for (let i = 1; i <= count; i += 1) {
    expectNoLeak(sentinels, `${label} taking Q${i}`);
    if (i < count) fireEvent.click(screen.getByRole("button", { name: /^Next →$/ }));
  }
  fireEvent.click(screen.getAllByRole("button", { name: /Submit & exit →/ })[0]);
  fireEvent.click(await screen.findByRole("button", { name: /Submit now →/ }));
}

describe("PRACTICE-HONESTY-1 §4 · Chapter Test — solutions hidden until graded", () => {
  it("★★ setup, every taking screen and the submitted (partial) result show NO solution", async () => {
    render(
      <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const start = await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 });
    const questions = (captured.ct?.paper.questions ?? []) as Q[];
    // PRECONDITIONS — a real paper WITH steps on it, and a probe that is not empty.
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q) => (q.solutionSteps ?? []).length > 0)).toBe(true);
    const sentinels = sentinelSteps(questions);
    expect(sentinels.length).toBeGreaterThan(0);
    expectNoLeak(sentinels, "CT setup");

    fireEvent.click(start);
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    // CONTROL — the probe reads rendered question text (so it WOULD see rendered step text).
    expect(document.body.textContent).toMatch(/Q1 of \d+/);
    await walkAndSubmit(sentinels, questions.length, "CT");

    expect((await screen.findAllByText("Chapter Test · Result")).length).toBeGreaterThan(0);
    expectNoLeak(sentinels, "CT submitted (partial)");
  }, 120000);

  it("CONTROL — once FULLY graded, the Solution key IS offered", async () => {
    const PAPER = {
      worksheetId: "ct-stored-1", createdAt: "2026-10-06T00:00:00.000Z", title: "Stored paper",
      subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 3,
      questions: [{ qNumber: 1, id: "q1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove that √2 is irrational." }],
    } as PersistedWorksheet;
    const OBJ = { results: [], awarded: 0, total: 0, answeredCount: 0, totalQuestions: 0 };
    const JOB_ID = "e".repeat(40);
    const job: StoredGradingJob = {
      v: 1, jobId: JOB_ID, idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`, total: 1,
      submittedAt: 4_000, paperKey: PAPER.worksheetId,
      context: { paper: PAPER, objective: OBJ, code: "CT-M-RN-07", name: "Real Numbers · Test 7" },
    } as StoredGradingJob;
    window.sessionStorage.setItem("lazytopper.gradingJob.v1.chapter-test:real-numbers", JSON.stringify(job));
    gradeChapterTestUpload.impl = async () => ({
      ok: true,
      response: buildChapterTestResponse({ paper: PAPER, objective: OBJ, subjectiveQuestions: [], subjectiveResponse: null }),
    });
    render(
      <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(/Solution key/, {}, { timeout: 15000 })).length).toBeGreaterThan(0);
  }, 60000);
});

describe("PRACTICE-HONESTY-1 §4 · Full Mock — solutions hidden until graded", () => {
  it("★★ setup, every taking screen and the submitted (awaiting-upload) result show NO solution", async () => {
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const start = await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 });
    const questions = (captured.fm?.paper.questions ?? []) as Q[];
    expect(questions.length).toBeGreaterThan(0);
    const sentinels = sentinelSteps(questions);
    expect(sentinels.length).toBeGreaterThan(0);
    expectNoLeak(sentinels, "FM setup");

    fireEvent.click(start);
    await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
    await walkAndSubmit(sentinels, questions.length, "FM");

    expect((await screen.findAllByText("Mock · Result")).length).toBeGreaterThan(0);
    expectNoLeak(sentinels, "FM submitted (partial)");
  }, 300000);

  it("CONTROL — once FULLY graded, the Solution key IS offered", async () => {
    const PAPER = {
      worksheetId: "fm-stored-3", createdAt: "2026-10-06T00:00:00.000Z", title: "Stored paper",
      subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 3,
      questions: [{ qNumber: 1, id: "q1", subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "Prove that √2 is irrational." }],
    } as PersistedWorksheet;
    const OBJ = { results: [], awarded: 0, total: 0, answeredCount: 0, totalQuestions: 0 };
    const JOB_ID = "e".repeat(40);
    window.localStorage.setItem(
      "lazytopper.fm.session.v1.student-1.FM-M-03",
      JSON.stringify({
        code: "FM-M-03", name: "Maths Mock 3", subject: "Maths", grade: "10", paper: PAPER,
        startedAt: 1, durationMs: 1, answers: {}, flags: [], currentQNumber: 1, focus: {}, phase: "awaiting-upload",
        objective: OBJ, updatedAt: 1,
        gradingJob: {
          v: 1, jobId: JOB_ID, idempotencyKey: "k-1", pollPath: `/api/grade-worksheet/jobs/${JOB_ID}`, total: 1,
          submittedAt: 4_000, paperKey: PAPER.worksheetId,
        },
      }),
    );
    gradeFullMockUpload.impl = async () => ({
      ok: true,
      response: buildChapterTestResponse({ paper: PAPER, objective: OBJ, subjectiveQuestions: [], subjectiveResponse: null }),
    });
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(/Solution key/, {}, { timeout: 15000 })).length).toBeGreaterThan(0);
  }, 60000);
});
