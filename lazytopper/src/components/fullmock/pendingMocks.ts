// TS-FIX-2 - which full-mock records are STILL awaiting an answer sheet.
//
// The banner used to count every record with `status !== "graded"`. A sitting that has been graded can still
// leave an older not-graded record behind (the pending copy the page loaded before the grade, or the record a
// relocated grade left on the first code), so a graded mock kept showing "awaiting your answer sheet".
// A not-graded record is NOT awaiting when (a) it is the sitting the page just graded, or (b) a graded record
// for the SAME paper (worksheetId) exists that is at least as new. A newer not-graded sitting of the same
// fixed paper is still awaiting.

import { isGradedPaperRecord, type SessionRecord } from "../../services/sessionRecords";

export function pendingMockRecords(
  mockRecords: readonly SessionRecord[],
  justGradedCode: string | null = null,
): SessionRecord[] {
  return mockRecords.filter((r) => {
    if (isGradedPaperRecord(r)) return false; // RESULT-LIST-HONEST-1: a partial with a graded written sheet is not awaiting one
    if (justGradedCode && r.id === justGradedCode) return false;
    if (r.worksheetId) {
      const supersededByGrade = mockRecords.some(
        (g) => g.status === "graded" && g.worksheetId === r.worksheetId && g.id !== r.id && (Number(g.gradedAt) || 0) >= (Number(r.gradedAt) || 0),
      );
      if (supersededByGrade) return false;
    }
    return true;
  });
}
