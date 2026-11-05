// CI-TUTOR-RETURN-1 - which questions of a saved paper the student already asked the tutor about.
// A per-viewer convenience only (sessionStorage, question NUMBERS keyed by the paper code): it survives
// the trip to the tutor and back, holds no answer, phone or email, and every read/write is guarded
// (a private window or blocked storage just means no "asked" marker - the button still works).

const KEY = "lt.scorecardAsked.v1";

function readAll(): Record<string, number[]> {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, number[]>) : {};
  } catch {
    return {};
  }
}

/** Question numbers of paper `code` the student has already asked the tutor about. */
export function askedQuestionsOf(code: string): number[] {
  const list = readAll()[code];
  return Array.isArray(list) ? list.filter((n) => Number.isInteger(n) && n > 0) : [];
}

/** Remember that question `qNumber` of paper `code` was taken to the tutor. */
export function markQuestionAsked(code: string, qNumber: number): void {
  try {
    const all = readAll();
    const next = new Set(askedQuestionsOf(code));
    next.add(qNumber);
    all[code] = [...next].sort((a, b) => a - b);
    window.sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* no storage: no marker, nothing else changes */
  }
}
