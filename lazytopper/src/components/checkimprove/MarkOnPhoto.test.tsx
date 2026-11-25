// MARK-ON-PHOTO-1 — the student points to one answer; only that question is graded and slotted back.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MarkOnPhotoButton, MarkOnPhotoDialog, MARK_ON_PHOTO_NEED_BOX, isAnswerBox } from "./MarkOnPhoto";
import { isMarkableRow, mergeMarkedRow } from "../../services/markOnPhoto";
import type { DecodedPhoto } from "../../services/preparePhoto";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";

const decoded = (file: File): DecodedPhoto => ({
  file, source: {} as CanvasImageSource, geometry: { sourceWidth: 1000, sourceHeight: 1400, orientation: 1 }, fileOrientation: 1, release: vi.fn(),
});
const seams = () => ({
  decode: vi.fn(async (f: File) => decoded(f)),
  prepare: vi.fn(async () => ({ base64: "Q1JPUA==", mimeType: "image/jpeg" as const })),
  renderPreview: vi.fn(() => ({ url: "data:image/jpeg;base64,PREVIEW" })),
});
const PAGE = { id: "p1", prepared: { base64: "UEFHRQ==", mimeType: "image/jpeg" as const }, thumbUrl: "data:image/jpeg;base64,T" };

describe("MarkOnPhotoDialog", () => {
  it("a page of the paper must be boxed: no 'Use whole photo' on a page, and the main button is off until a box is drawn", async () => {
    const s = seams();
    const onSubmit = vi.fn();
    render(<MarkOnPhotoDialog label="Q6" pages={[PAGE]} busy={false} error={null} onSubmit={onSubmit} onClose={() => {}} {...s} />);
    fireEvent.click(screen.getByTestId("mark-on-photo-page"));
    expect(await screen.findByText(/Drag the box around your answer to Q6/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Use whole photo" })).toBeNull();
    const cta = screen.getByTestId("pcs-confirm") as HTMLButtonElement;
    expect(cta.textContent).toBe("Use this part");
    expect(cta.disabled).toBe(true);
    fireEvent.click(cta);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(s.prepare).not.toHaveBeenCalled();
  });

  it("a box must leave part of the page out (at most 90% of its area)", () => {
    expect(isAnswerBox(undefined)).toBe(false);
    expect(isAnswerBox({ left: 0, top: 0, right: 1, bottom: 1 })).toBe(false);
    expect(isAnswerBox({ left: 0.01, top: 0.01, right: 0.99, bottom: 0.99 })).toBe(false);
    expect(isAnswerBox({ left: 0.1, top: 0.2, right: 0.9, bottom: 0.6 })).toBe(true);
  });

  it("a photo of just this answer may be sent whole", async () => {
    const s = seams();
    const onSubmit = vi.fn();
    render(<MarkOnPhotoDialog label="Q6" pages={[]} busy={false} error={null} onSubmit={onSubmit} onClose={() => {}} {...s} />);
    expect(screen.getByText(/Choose a photo of just this answer/)).toBeTruthy();
    const input = screen.getByTestId("mark-on-photo-file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(await screen.findByRole("button", { name: "Use whole photo" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ imageBase64: "Q1JPUA==", imageMimeType: "image/jpeg" }));
  });

  it("shows the host's error, its notice, and a busy line while marking", async () => {
    const { rerender } = render(<MarkOnPhotoDialog label="Q6" pages={[]} busy={false} error={null} notice={<p>LIMIT PANEL</p>} onSubmit={() => {}} onClose={() => {}} {...seams()} />);
    expect(screen.getByText("LIMIT PANEL")).toBeTruthy();
    const input = screen.getByTestId("mark-on-photo-file") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(10)], "a.jpg", { type: "image/jpeg" })] } });
    await screen.findByTestId("pcs-confirm");
    rerender(<MarkOnPhotoDialog label="Q6" pages={[]} busy={true} error={null} onSubmit={() => {}} onClose={() => {}} {...seams()} />);
    expect(screen.getByRole("status").textContent).toBe("Marking Q6…");
    rerender(<MarkOnPhotoDialog label="Q6" pages={[]} busy={false} error="Marking didn't go through" onSubmit={() => {}} onClose={() => {}} {...seams()} />);
    expect(screen.getByRole("alert").textContent).toContain("Marking didn't go through");
  });

  it("the row button never toggles the row it sits on", () => {
    const outer = vi.fn();
    const onClick = vi.fn();
    render(<div onClick={outer}><MarkOnPhotoButton label="Q6" onClick={onClick} /></div>);
    fireEvent.click(screen.getByTestId("mark-on-photo"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });
});

const row = (o: Partial<WorksheetQuestionGrade>): WorksheetQuestionGrade => ({
  qNumber: 1, couldNotRead: false, totalMarks: 2, marksAwarded: 2, percentage: 100, annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "", ...o,
} as WorksheetQuestionGrade);
const paper = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true, results, totalQuestions: results.length, gradedCount: 1, pendingCount: results.length - 1,
  gradedMarksAwarded: 2, gradedMarksTotal: 2, worksheetTotalMarks: 5, summary: "S",
});

describe("services/markOnPhoto", () => {
  const notFound = row({ qNumber: 6, couldNotRead: true, totalMarks: 3, marksAwarded: 0, note: "not found on the uploaded pages", topicSlug: "trigonometry", topicLabel: "Trigonometry", section: "C" } as Partial<WorksheetQuestionGrade>);
  const mismatch = row({ qNumber: 7, answerMismatch: true, marksAwarded: 0 } as Partial<WorksheetQuestionGrade>);

  it("only not-found / unreadable / wrong-question rows can be marked", () => {
    expect(isMarkableRow(notFound)).toBe(true);
    expect(isMarkableRow(mismatch)).toBe(true);
    expect(isMarkableRow(row({}))).toBe(false);
    expect(isMarkableRow(row({ notGraded: "timeout", couldNotRead: true } as Partial<WorksheetQuestionGrade>))).toBe(false);
  });

  it("a graded answer replaces the row; totals are recomputed; the question's chapter and section stay", () => {
    const base = paper([row({}), notFound]);
    const out = mergeMarkedRow(base, 1, row({ qNumber: 6, totalMarks: 3, marksAwarded: 2.5 }));
    expect(out.results[1].marksAwarded).toBe(2.5);
    expect([out.gradedCount, out.pendingCount, out.gradedMarksAwarded, out.gradedMarksTotal, out.worksheetTotalMarks]).toEqual([2, 0, 4.5, 5, 5]);
    expect((out.results[1] as unknown as { topicSlug: string; section: string }).topicSlug).toBe("trigonometry");
    expect((out.results[1] as unknown as { section: string }).section).toBe("C");
    // the first reading's summary may say this answer was not found: it is dropped (#1871 rule)
    expect(out.summary).toBe("");
  });

  it("CONTROL: an answer that comes back not graded changes nothing", () => {
    const base = paper([row({}), notFound]);
    expect(mergeMarkedRow(base, 1, row({ qNumber: 6, couldNotRead: true, marksAwarded: 0 }))).toBe(base);
    expect(mergeMarkedRow(base, 1, null)).toBe(base);
    expect(mergeMarkedRow(base, 9, row({}))).toBe(base);
  });
});

describe("page wiring (source guard)", () => {
  const src = readFileSync(join(__dirname, "../../pages/desktop/DesktopCheckImprovePage.tsx"), "utf8");
  it("the button sits on markable rows of a signed-in paper only", () => {
    expect(src).toMatch(/!isFreeMode && isMarkableRow\(g\) && \(\s*<MarkOnPhotoButton/);
  });
  it("the marked answer is graded ALONE, as its own image, and merged back", () => {
    expect(src).toMatch(/uploads: \[\{ qNumber: dq\.questionNumber, imageBase64: image\.imageBase64/);
    expect(src).toMatch(/const merged = mergeMarkedRow\(wsResult, gi, one\)/);
    expect(src).toMatch(/recordCiQuestion\(merged\.results\[gi\], gi, merged\.results, ciQuestionIds\(ciCode, merged\.results\)/);
  });
  const body = src.slice(src.indexOf("async function submitMarkedAnswer"), src.indexOf("async function recordCiQuestion"));
  it("the save carries the question texts again, and a paper the student left is never put back on screen", () => {
    expect(body).toMatch(/noteSessionQuestionTexts\(\s*`ci:\$\{ciCode\}`/);
    expect(body.indexOf("noteSessionQuestionTexts(")).toBeLessThan(body.indexOf("persistCheckImproveSession("));
    expect(body).toMatch(/if \(stillShowing\(\)\) \{\s*setWsResult\(merged\)/);
    expect(src).toMatch(/function resetToInput\(\) \{\s*leaveMarkedPaper\(\);/);
  });
  it("the mark carries the paper's mark pass, so it rides the paper's weekly slot (owner ruling 25 Nov)", () => {
    expect(body).toMatch(/wsResult\.markPass \? \{ \.\.\.CI_GRADE_CALL, markPass: wsResult\.markPass, markQ: dq\.questionNumber \} : CI_GRADE_CALL/);
    const client = readFileSync(join(__dirname, "../../ai/aiClient.ts"), "utf8");
    expect(client).toMatch(/opts\?\.markPass && !opts\.freeCheck \? \{ "X-Lazytopper-Mark-Pass": opts\.markPass, "X-Lazytopper-Mark-Q": String\(opts\.markQ \?\? ""\) \}/);
    expect(body).toMatch(/e\.message === MARK_LIMIT_COPY/);
  });
  it("a refusal is told in its own words, never as 'try again'", () => {
    expect(body).toMatch(/if \(await fairUse\.handleRefusal\(e\)\) return;/);
    expect(body).toMatch(/isPremiumRequiredError\(e\) \|\| isTrialLimitRefusal\(e\)/);
    expect(src).toMatch(/notice=\{fairUse\.limit \? <FairUseLimitPanel limit=\{fairUse\.limit\} \/> : null\}/);
  });
});
