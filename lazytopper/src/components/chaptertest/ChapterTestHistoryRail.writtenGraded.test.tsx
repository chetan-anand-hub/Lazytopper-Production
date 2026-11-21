import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ChapterTestHistoryRail from "./ChapterTestHistoryRail";
import FullMockHistoryPanel from "../fullmock/FullMockHistoryPanel";
import { pendingMockRecords } from "../fullmock/pendingMocks";
import { pendingFromSessionRecords } from "../home/pendingPapers";
import type { SessionRecord } from "../../services/sessionRecords";

afterEach(() => cleanup());
const rec = (o: Partial<SessionRecord>): SessionRecord =>
  ({ id: "CT-M-QE-04", title: "Quadratic Equations", surface: "chapter-test", subject: "maths", status: "partial", marksAwarded: 4, marksTotal: 10, gradedAt: 1_700_000_000_000, topicKeys: ["quadratic-equations"], questionIds: [], worksheetId: "ws", fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, ...o }) as unknown as SessionRecord;
const ct = (records: SessionRecord[]) => render(<ChapterTestHistoryRail topicLabel="Quadratic Equations" loading={false} onOpen={() => {}} records={records} />);

describe("RESULT-LIST-HONEST-1 Chapter Test rail", () => {
  it("partial + writtenGraded: graded card with the score and an honest 'not graded' line, never 'Awaiting sheet' / 'Objective'", () => {
    const { container } = ct([rec({ writtenGraded: true })]);
    expect(screen.queryByText(/Awaiting sheet/)).toBeNull();
    expect(container.textContent).not.toMatch(/Objective/);
    expect(screen.getByText("Some questions not graded — tap to see which")).toBeTruthy();
    expect(container.textContent).toContain("4");
  });
  it("partial objective-only (writtenGraded false) keeps today's copy", () => {
    const { container } = ct([rec({ writtenGraded: false })]);
    expect(screen.getByText(/Awaiting sheet/)).toBeTruthy();
    expect(container.textContent).toContain("Objective scored (4/10)");
  });
  it("legacy partial (no field) is unchanged", () => {
    const { container } = ct([rec({})]);
    expect(screen.getByText(/Awaiting sheet/)).toBeTruthy();
    expect(container.textContent).toContain("Objective scored (4/10)");
  });
  it("a fully graded record shows no 'not graded' line", () => {
    ct([rec({ status: "graded", writtenGraded: true })]);
    expect(screen.queryByText(/not graded/)).toBeNull();
  });
});

describe("RESULT-LIST-HONEST-1 Full Mock panel + awaiting consumers", () => {
  const fm = (o: Partial<SessionRecord>) => rec({ id: "FM-M-01", surface: "full-mock", title: "Maths Mock", ...o });
  const panel = (records: SessionRecord[]) =>
    render(<FullMockHistoryPanel records={records} loading={false} defaultSubject="maths" onOpen={() => {}} onClose={() => {}} />);
  it("graded-with-pending renders graded + the line; objective-only and legacy keep 'Awaiting sheet'", () => {
    panel([fm({ writtenGraded: true })]);
    expect(screen.queryByText(/Awaiting sheet/)).toBeNull();
    expect(screen.getByText("Some questions not graded — tap to see which")).toBeTruthy();
    cleanup();
    const a = panel([fm({ writtenGraded: false })]);
    expect(a.container.textContent).toContain("Objective scored 4/10");
    cleanup();
    panel([fm({})]);
    expect(screen.getByText(/Awaiting sheet/)).toBeTruthy();
  });
  it("pendingMockRecords and Home's pending list drop a partial whose written sheet was graded only", () => {
    expect(pendingMockRecords([fm({ writtenGraded: true })])).toEqual([]);
    expect(pendingMockRecords([fm({ writtenGraded: false })]).length).toBe(1);
    expect(pendingMockRecords([fm({})]).length).toBe(1);
    expect(pendingFromSessionRecords([rec({ writtenGraded: true })])).toEqual([]);
    expect(pendingFromSessionRecords([rec({ writtenGraded: false }), fm({})]).length).toBe(2);
  });
});
