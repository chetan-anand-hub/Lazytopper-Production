// FRESH-SET-TESTS on the REAL Chapter Test page: two tests started in a row share no
// question; the started paper stays the SAME through submit (the "Upload later" copy holds
// exactly the questions that were started); and the honest copy turns into the repeats
// line when the chapter's unseen pool has run out.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "../test/preloadBankChapters";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return {
    ...actual,
    paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }),
  };
});
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list };
});

import ChapterTestPage from "./ChapterTestPage";
import { __resetUsageClientForTests } from "../services/usageClient";
import { selectBankQuestions } from "../data/bankQuery";
import { loadServedLog, servedOwner } from "../lib/freshSet/servedHistory";

const SLUG = "carbon-and-its-compounds";

function stubUsage() {
  const body = {
    enforced: false,
    tier: "trial",
    trial: { checksLeftToday: 5, chapterTestsLeftToday: 5, mocksLeft: 1, worksheetsLeft: 1, resets: {} },
    premium: null,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/api/usage/me")
        ? new Response(JSON.stringify(body), { status: 200 })
        : new Response("{}", { status: 404 }),
    ),
  );
}

async function mountAndStart(): Promise<string[]> {
  render(
    <MemoryRouter initialEntries={[`/chapter-test/10/science/${SLUG}`]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const start = await screen.findByRole("button", { name: /Start the test/ });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  const before = loadServedLog(servedOwner(USER.uid)).length;
  fireEvent.click(start);
  await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
  const log = loadServedLog(servedOwner(USER.uid));
  expect(log).toHaveLength(before + 1);
  return log[log.length - 1].ids;
}

beforeEach(() => {
  __resetUsageClientForTests();
  window.localStorage.clear();
  window.sessionStorage.clear();
  records.list = [];
  stubUsage();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FRESH-SET-TESTS · Chapter Test page", () => {
  it("★★ two Carbon tests started in a row share NO question (device log, no records)", async () => {
    const first = await mountAndStart();
    cleanup();
    const second = await mountAndStart();
    expect(first.length).toBeGreaterThanOrEqual(10);
    expect(second.length).toBe(first.length);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it("★★ cross-device: an earlier test known only from the session records is excluded too", async () => {
    const first = await mountAndStart();
    cleanup();
    window.localStorage.clear(); // a different device: no served log, only the cloud records
    records.list = [
      {
        id: "CT-S-CARBON-01",
        worksheetId: "ct-x",
        surface: "chapter-test",
        title: "Carbon · Chapter Test #1",
        subject: "science",
        topicKeys: [SLUG],
        questionIds: first,
        marksAwarded: 0,
        marksTotal: 0,
        status: "partial",
        fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        gradedAt: 1_700_000_000_000,
        perQuestionRef: "ct:CT-S-CARBON-01",
        dedupKey: "student-1::CT-S-CARBON-01",
      },
    ];
    const second = await mountAndStart();
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it("★★ the started paper is the paper submitted: 'Upload later' keeps EXACTLY the started questions", async () => {
    const started = await mountAndStart();
    fireEvent.click(screen.getAllByRole("button", { name: /Submit & exit/ })[0]);
    fireEvent.click(await screen.findByRole("button", { name: /Submit now/ }));
    await waitFor(() => {
      const raw = window.localStorage.getItem(`lazytopper.ct.papers.v1.${USER.uid}`);
      expect(raw).not.toBeNull();
    });
    const saved = JSON.parse(window.localStorage.getItem(`lazytopper.ct.papers.v1.${USER.uid}`) as string) as Array<{
      paper: { questions: Array<{ id: string }> };
    }>;
    expect(saved[0].paper.questions.map((q) => q.id)).toEqual(started);
  });

  it("★ honest copy: a first-ever test makes NO 'different from your last' claim; the next one does, and it holds", async () => {
    await mountAndStart();
    cleanup();
    render(
      <MemoryRouter initialEntries={[`/chapter-test/10/science/${SLUG}`]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const second = await screen.findByTestId("ct-fresh-line");
    expect(second.getAttribute("data-tone")).toBe("fresh");
    expect(second.textContent).toContain("different questions from your last");
  });

  it("★ honest copy: first-ever line; then 'most of this chapter' only once the whole chapter was served", async () => {
    render(
      <MemoryRouter initialEntries={[`/chapter-test/10/science/${SLUG}`]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const first = await screen.findByTestId("ct-fresh-line");
    expect(first.getAttribute("data-tone")).toBe("first");
    expect(first.textContent).toContain("Each test is a fresh draw");
    expect(first.textContent).not.toContain("your last");
    cleanup();

    // Every Carbon question already served in earlier tests -> repeats are unavoidable, and said.
    const all = selectBankQuestions({ subject: "Science", topicKeys: [SLUG] }).map((q) => String(q.id));
    records.list = [
      {
        id: "CT-S-CARBON-09",
        worksheetId: "ct-y",
        surface: "chapter-test",
        title: "Carbon · Chapter Test #9",
        subject: "science",
        topicKeys: [SLUG],
        questionIds: all,
        marksAwarded: 0,
        marksTotal: 0,
        status: "graded",
        fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        gradedAt: 1_700_000_000_000,
        perQuestionRef: "ct:CT-S-CARBON-09",
        dedupKey: "student-1::CT-S-CARBON-09",
      },
    ];
    render(
      <MemoryRouter initialEntries={[`/chapter-test/10/science/${SLUG}`]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const line = await screen.findByTestId("ct-fresh-line");
    expect(line.getAttribute("data-tone")).toBe("repeats");
    expect(line.textContent).toMatch(/^You've done most of this chapter's questions — \d+ repeats? from your earlier tests (is|are) mixed in\.$/);
    expect(document.body.textContent).not.toContain("different questions from your last");
  });
});
