// CI-TUTOR-RETURN-1 - which questions of a saved paper the student already asked the tutor about.
// A per-viewer convenience only (sessionStorage, question NUMBERS keyed by account + paper code): it
// survives the trip to the tutor and back, holds no answer, phone or email, and never crosses accounts
// on a shared tab. Every read/write is guarded (a private window or blocked storage just means no
// "asked" marker - the button still works). With no uid there is no marker.

const KEY = "lt.scorecardAsked.v2";

const keyOf = (uid: string, code: string) => `${uid}|${code}`;

function readAll(): Record<string, number[]> {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, number[]>) : {};
  } catch {
    return {};
  }
}

/** Question numbers of paper `code` this account has already asked the tutor about. */
export function askedQuestionsOf(uid: string | null | undefined, code: string): number[] {
  if (!uid) return [];
  const list = readAll()[keyOf(uid, code)];
  return Array.isArray(list) ? list.filter((n) => Number.isInteger(n) && n > 0) : [];
}

/** Remember that question `qNumber` of paper `code` was taken to the tutor by this account. */
export function markQuestionAsked(uid: string | null | undefined, code: string, qNumber: number): void {
  if (!uid) return;
  try {
    const all = readAll();
    const next = new Set(askedQuestionsOf(uid, code));
    next.add(qNumber);
    all[keyOf(uid, code)] = [...next].sort((a, b) => a - b);
    window.sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* no storage: no marker, nothing else changes */
  }
}
