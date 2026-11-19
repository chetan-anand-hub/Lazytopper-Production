import { describe, it, expect } from "vitest";
import { pendingMockRecords } from "./pendingMocks";
import type { SessionRecord } from "../../services/sessionRecords";

const rec = (o: Partial<SessionRecord>): SessionRecord =>
  ({ surface: "full-mock", subject: "maths", title: "t", marksAwarded: 0, marksTotal: 0, gradedAt: 1, topicKeys: [], questionIds: [], ...o }) as SessionRecord;

describe("TS-FIX-2 - the full-mock awaiting banner", () => {
  it("a not-graded record whose paper has since been graded is NOT awaiting", () => {
    const pending = rec({ id: "FM-M-01", worksheetId: "ts-m-1", status: "pending-upload", gradedAt: 10 });
    const graded = rec({ id: "FM-M-02", worksheetId: "ts-m-1", status: "graded", gradedAt: 20 });
    expect(pendingMockRecords([graded, pending])).toEqual([]);
  });
  it("the sitting the page just graded is not awaiting even if its stale partial copy is still loaded", () => {
    const stale = rec({ id: "FM-M-01", worksheetId: "ts-m-1", status: "partial" });
    expect(pendingMockRecords([stale], "FM-M-01")).toEqual([]);
  });
  it("a genuinely awaiting mock, and a NEWER sitting of a previously graded paper, still show", () => {
    const a = rec({ id: "FM-M-03", worksheetId: "ts-m-3", status: "pending-upload" });
    const oldGrade = rec({ id: "FM-M-04", worksheetId: "ts-m-4", status: "graded", gradedAt: 5 });
    const newer = rec({ id: "FM-M-05", worksheetId: "ts-m-4", status: "pending-upload", gradedAt: 50 });
    expect(pendingMockRecords([a, oldGrade, newer]).map((r) => r.id)).toEqual(["FM-M-03", "FM-M-05"]);
  });
});
