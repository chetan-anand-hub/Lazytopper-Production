// CT-RESUME-2 (a) — the resume screen describes the SAVED paper the student will go back to:
// its question count, marks, section rows and CBQ share. Before, every fact on that screen came
// from the NEW draw hidden behind the resume (and the freshness line described that draw too).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "../test/preloadBankChapters";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return { ...actual, paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }) };
});
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});

import ChapterTestPage from "./ChapterTestPage";
import { __resetUsageClientForTests } from "../services/usageClient";
import { chapterTestNomenclature } from "../services/sessionRecords";
import { selectBankQuestions } from "../data/bankQuery";
import { chapterTestSectionFor } from "../components/chaptertest/chapterTestBlueprint";
import { isCbq } from "../lib/cbq/cbqClassification";

const SLUG = "carbon-and-its-compounds";
const ROUTE = `/chapter-test/10/science/${SLUG}`;

beforeEach(() => {
  __resetUsageClientForTests();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/api/usage/me")
        ? new Response(JSON.stringify({ enforced: false, tier: "trial", trial: {}, premium: null }), { status: 200 })
        : new Response("{}", { status: 404 }),
    ),
  );
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("CT-RESUME-2 · the resume screen shows the SAVED paper's facts", () => {
  it("★★ count, marks, section rows and CBQ share are the saved paper's — and no freshness line for the new draw", async () => {
    // A small saved paper unlike any real draw: 2 Section A objective rows + 1 Section C row.
    const bank = selectBankQuestions({ subject: "Science", topicKeys: [SLUG] });
    const a = bank.filter((q) => chapterTestSectionFor(q) === "A").slice(0, 2);
    const c = bank.filter((q) => chapterTestSectionFor(q) === "C").slice(0, 1);
    const rows = [...a.map((q) => ({ q, section: "A" })), ...c.map((q) => ({ q, section: "C" }))];
    const paper = {
      worksheetId: "ct-saved",
      createdAt: "fixed",
      title: "Carbon · Test #1",
      subject: "Science",
      grade: "10",
      sectionFilter: "A-D",
      totalMarks: 5,
      questions: rows.map(({ q, section }, i) => ({
        qNumber: i + 1,
        id: q.id,
        subject: "Science",
        topicKey: SLUG,
        topicLabel: "Carbon",
        section,
        marks: Number(q.marks),
        questionText: q.questionText,
        options: q.options,
        answer: q.answer,
      })),
    };
    const { code } = chapterTestNomenclature("science", SLUG, "Carbon", 1);
    window.sessionStorage.setItem(
      `lazytopper.ct.progress.${code}`,
      JSON.stringify({ answers: { 1: String(a[0].options?.[0] ?? "") }, flags: [], elapsed: 90, currentQNumber: 2, timerEnabled: true, paper, route: ROUTE }),
    );

    render(
      <MemoryRouter initialEntries={[ROUTE]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId("ct-resume-note");
    const text = document.body.textContent ?? "";
    expect(text).toContain("3 questions");
    expect(text).toContain("5 marks");
    const bp = screen.getByTestId("ct-blueprint").textContent ?? "";
    expect(bp).toContain("2 × 1 = 2");
    expect(bp).toContain("1 × 3 = 3");
    expect(bp).toMatch(/none available yet/); // B and D are empty ON THIS PAPER
    const cbqMarks = paper.questions.filter((q, i) => isCbq(rows[i].q)).reduce((s, q) => s + q.marks, 0);
    expect(text).toContain(`CBQ marks: ${cbqMarks} of 5`);
    expect(screen.queryByTestId("ct-fresh-line")).toBeNull();
  });
});
