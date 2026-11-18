import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";

const records = vi.hoisted(() => ({ list: [] as unknown[], payloads: [] as unknown[] }));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => records.list),
  getAllSessionPerQuestionFromCloud: vi.fn(async () => records.payloads),
}));

import TestAnalysisPanel from "./TestAnalysisPanel";
import { QUESTION_TIMES_KEY } from "./questionTimes";

const TRI: string[] = [];
for (const [id, m] of bankIndexEntries()) {
  if (m.topicKey === "triangles") TRI.push(id);
  if (TRI.length === 6) break;
}

const g = (qNumber: number, awarded: number, total: number): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  annotatedSteps: [{ step: "x", status: awarded > 0 ? "correct" : "incorrect" } as never],
});
const resp = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: 0,
  gradedMarksTotal: 0,
  worksheetTotalMarks: 0,
});

function renderPanel(uid: string | null, response: WorksheetGradeResponse, ids: string[]) {
  return render(
    <MemoryRouter>
      <TestAnalysisPanel
        surface="chapter-test"
        subject="Maths"
        uid={uid}
        current={{ worksheetId: "ws-now", title: "Triangles #3", response, questionIds: ids, chapterTopicKey: "triangles" }}
        secondsPerMark={72}
        returnTo="/chapter-test/10/Maths/triangles"
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  records.list = [];
  records.payloads = [];
  localStorage.clear();
});

describe("TestAnalysisPanel", () => {
  it("real data: re-attempt button counts only lost questions; time table; weakest chapter; plan; notebook", async () => {
    localStorage.setItem(QUESTION_TIMES_KEY, JSON.stringify({ "ws-now": { at: 1, ms: { "1": 30_000, "2": 200_000 } } }));
    records.list = [
      {
        id: "CT-M-TRI-01",
        worksheetId: "ws-old",
        surface: "chapter-test",
        title: "Triangles #1",
        subject: "maths",
        topicKeys: ["triangles"],
        questionIds: [TRI[3], TRI[4]],
        status: "graded",
        gradedAt: 5,
        perQuestionRef: "ref-old",
      },
    ];
    records.payloads = [{ ref: "ref-old", response: resp([g(1, 0, 5), g(2, 1, 3)]) }];
    renderPanel("uid-1", resp([g(1, 1, 1), g(2, 0, 2), g(3, 1, 3)]), [TRI[0], TRI[1], TRI[2]]);

    const btn = screen.getByRole("link", { name: "Re-attempt my wrong questions (2)" });
    const sp = new URLSearchParams(btn.getAttribute("href")!.split("?")[1]);
    expect(sp.get("focusBankIds")).toBe(`${TRI[1]},${TRI[2]}`);

    expect(screen.getByText("Over time")).toBeTruthy(); // Q2: 200 s > 2 marks x 72 s
    expect(screen.getAllByText("—").length).toBeGreaterThan(0); // Q3 not measured

    expect(await screen.findByText("Triangles")).toBeTruthy(); // 3/14 marks → weakest
    expect(screen.getByRole("link", { name: "Practise this chapter" }).getAttribute("href")).toBe("/practice/10/Maths?topic=triangles");
    expect(screen.getByText("Re-attempt 2 lost-marks questions from Triangles #3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open my mistake notebook (4)" }));
    expect(screen.getAllByRole("link", { name: "Practise again" })).toHaveLength(4);
  });

  it("empty state: nothing lost, nothing measured, too little history", async () => {
    renderPanel("uid-1", resp([g(1, 1, 1)]), [TRI[0]]);
    expect(screen.getByText(/No marks lost/)).toBeTruthy();
    expect(screen.getByText(/was not measured/)).toBeTruthy();
    expect(await screen.findByText(/Not enough graded chapter tests/)).toBeTruthy();
    expect(screen.getByText(/No lost-marks questions/)).toBeTruthy();
    expect(screen.queryByText("This week’s plan")).toBeNull();
  });

  it("nothing graded to analyse (null response) → renders nothing", () => {
    const { container } = render(
      <MemoryRouter>
        <TestAnalysisPanel
          surface="full-mock"
          subject="Maths"
          uid="u"
          current={{ worksheetId: "w", title: "t", response: null, questionIds: [] }}
          secondsPerMark={135}
          returnTo="/full-mock/10/Maths"
        />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("signed out: no history read, honest sign-in line", () => {
    renderPanel(null, resp([g(1, 0, 1)]), [TRI[0]]);
    expect(screen.getByText(/Sign in to see your weakest chapters/)).toBeTruthy();
    expect(screen.queryByText("Mistake notebook")).toBeNull();
  });
});
