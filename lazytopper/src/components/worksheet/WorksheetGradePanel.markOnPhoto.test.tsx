/**
 * MARK-ON-PHOTO-2 — Worksheet: "Mark it on your photo" on a FRESH grade. After the (stubbed) mark the scorecard's headline
 * score moves, the row on the graded sheet is the marked one, and the action is gone; a restored (cached) grade offers none.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, snapshot: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false }),
}));
vi.mock("../results/useDetailLock", () => ({ useDetailLock: () => "open" }));
vi.mock("../qr/QrAnswerHandoff", () => ({
  default: ({ onImageReceived }: { onImageReceived: (v: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" onClick={() => onImageReceived({ imageBase64: "JVBERi0xLjQ=", imageMimeType: "application/pdf" })}>qr-deliver</button>
  ),
}));
vi.mock("../checkimprove/MarkOnPhoto", () => ({
  MarkOnPhotoDialog: (p: { label: string; onSubmit: (i: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" data-testid="stub-mark-submit" onClick={() => p.onSubmit({ imageBase64: "Q1JPUA==", imageMimeType: "image/jpeg" })}>
      submit {p.label}
    </button>
  ),
}));
const svc = vi.hoisted(() => ({ grade: vi.fn(), mark: vi.fn(), cached: null as unknown }));
vi.mock("../../services/worksheetGradeService", () => ({ gradeWorksheetAndRecord: svc.grade, markWorksheetQuestion: svc.mark }));
vi.mock("../../services/worksheetSessionStore", () => ({ getWorksheetGrade: () => svc.cached, listStoredWorksheetsLite: () => [] }));

import WorksheetGradePanel from "./WorksheetGradePanel";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const WS = {
  worksheetId: "ws-1", createdAt: "2026-10-04T00:00:00.000Z", title: "AP worksheet", subject: "Maths", grade: "10", sectionFilter: "All", totalMarks: 6,
  questions: [
    { qNumber: 1, id: "q1", subject: "Maths", topicKey: "arithmetic-progressions", topicLabel: "AP", section: "C", marks: 3, questionText: "Find the 10th term" },
    { qNumber: 2, id: "q2", subject: "Maths", topicKey: "arithmetic-progressions", topicLabel: "AP", section: "C", marks: 3, questionText: "Find the sum" },
  ],
} as PersistedWorksheet;
const row = (qNumber: number, total: number, awarded: number): WorksheetQuestionGrade => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: Math.round((awarded / total) * 100),
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
});
const unread = (qNumber: number, total: number) => ({ qNumber, couldNotRead: true, totalMarks: total, note: "We couldn't read this answer." }) as WorksheetQuestionGrade;
const resp = (rows: WorksheetQuestionGrade[]): WorksheetGradeResponse => {
  const graded = rows.filter((r) => !r.couldNotRead);
  return {
    ok: true, worksheetId: "ws-1", results: rows, totalQuestions: rows.length, gradedCount: graded.length, pendingCount: rows.length - graded.length,
    gradedMarksAwarded: graded.reduce((s, r) => s + (r.marksAwarded ?? 0), 0), gradedMarksTotal: graded.reduce((s, r) => s + (r.totalMarks ?? 0), 0), worksheetTotalMarks: 6,
  };
};
/** Tap the scorecard's mark button until the (lazy) dialog is up. A cold run can re-mount the scorecard subtree after the button
 *  was first found (its own lazy parts resolving), and a tap on the detached node does nothing; a re-tap is harmless. */
async function openMarkDialog(): Promise<HTMLElement> {
  return waitFor(() => {
    const open = screen.queryByTestId("stub-mark-submit");
    if (open) return open;
    fireEvent.click(screen.getByTestId("sc-mark-on-photo-btn"));
    return screen.getByTestId("stub-mark-submit");
  }, { timeout: 45000 });
}
const hero = () => (document.querySelector(".lt-sc__big")?.textContent ?? "").replace(/\s+/g, " ").trim();
const mount = () => render(<MemoryRouter><WorksheetGradePanel ws={WS} /></MemoryRouter>);

// The page opens the dialog with a lazy import(): load the (stubbed) module up front, so a cold run does not spend the wait
// below transforming it.
beforeAll(async () => {
  await import("../checkimprove/MarkOnPhoto");
});

beforeEach(() => {
  svc.grade.mockReset();
  svc.mark.mockReset();
  svc.cached = null;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MARK-ON-PHOTO-2 · Worksheet", () => {
  it("★★ FRESH: the mark grades that row; the scorecard's score, the row and the action move", async () => {
    svc.grade.mockResolvedValue({ response: resp([row(1, 3, 2), unread(2, 3)]), miOutcomes: [] });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "qr-deliver" }));
    fireEvent.click(await screen.findByRole("button", { name: /Grade my answers/ }));
    const btn = await screen.findByTestId("sc-mark-on-photo-btn");
    expect(btn.textContent).toBe("Q2");
    expect(hero()).toMatch(/^2 \/ 3/);
    expect(await screen.findByTestId("wg-mark-on-photo", {}, { timeout: 15000 })).toBeTruthy(); // the row on the graded sheet offers it too
    svc.mark.mockResolvedValue({ kind: "marked", response: resp([row(1, 3, 2), row(2, 3, 3)]) });
    expect(btn).toBeTruthy();
    fireEvent.click(await openMarkDialog());
    await waitFor(() => expect(hero()).toMatch(/^5 \/ 6/), { timeout: 15000 });
    expect(screen.queryByTestId("sc-mark-on-photo")).toBeNull();
    expect(screen.queryByTestId("wg-mark-on-photo")).toBeNull();
    expect(svc.mark.mock.calls[0][0]).toMatchObject({ index: 1, worksheet: { worksheetId: "ws-1" }, image: { imageBase64: "Q1JPUA==" } });
  });

  it("CONTROL: a restored (cached) grade offers no mark — this surface has no 'Upload all pages again' on it", async () => {
    svc.cached = resp([row(1, 3, 2), unread(2, 3)]);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "View scorecard" }));
    await waitFor(() => expect(hero()).toMatch(/^2 \/ 3/), { timeout: 15000 });
    expect(screen.queryByTestId("sc-mark-on-photo")).toBeNull();
    expect(screen.queryByTestId("wg-mark-on-photo")).toBeNull();
  });
});
