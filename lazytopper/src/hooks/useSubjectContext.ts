const STORAGE_KEY = "lazytopper.lastSubjectContext";

export interface SubjectContext {
  grade: string;
  subject: string;
}

const FALLBACK: SubjectContext = { grade: "10", subject: "Maths" };

/**
 * Reads grade/subject context from localStorage.
 * Rule: read key → validate shape → hard fallback {grade:"10",subject:"Maths"}.
 * Never throws. Always returns a valid {grade, subject} object.
 */
export function useSubjectContext(): SubjectContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.grade === "string" &&
        typeof parsed.subject === "string" &&
        parsed.grade.trim().length > 0 &&
        parsed.subject.trim().length > 0
      ) {
        return { grade: parsed.grade.trim(), subject: parsed.subject.trim() };
      }
    }
  } catch {
    // localStorage inaccessible or JSON malformed — use fallback
  }
  return FALLBACK;
}
