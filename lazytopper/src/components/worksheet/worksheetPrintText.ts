// WORKSHEET-FIX-2 — text clean-up for the printed worksheet, applied at print time only (the stored rows are untouched).

/**
 * Many served MCQ options already carry their own letter ("A) 77/6 cm²", "(B) 154/6", "C. Carpel"), and the print doc adds its
 * own "(a)", so the paper showed "(a) (A) …". A leading label is removed ONLY when its letter is the option's own position
 * (so "E. coli …" as the first option is content and stays) and is followed by a space.
 */
export function stripOptionLabel(option: string, index: number): string {
  const s = String(option ?? "");
  const m = s.match(/^\s*(?:\(([A-Ea-e])\)|([A-Ea-e])[).])\s+/);
  if (!m) return s;
  const letter = (m[1] ?? m[2]).toLowerCase();
  return letter === "abcde"[index] ? s.slice(m[0].length) : s;
}

/** A trailing exam-source tag such as "[All India 2017]", "[Delhi 2019]" or "[Foreign 2016]". */
const SOURCE_TAG = /\s*\[\s*(?:All India|Delhi|Foreign|Outside Delhi|Compartment|CBSE)[A-Za-z ]{0,16}(?:19|20)\d\d(?:\s*,\s*(?:19|20)\d\d)*\s*\]\s*/gi;

/** The question text without printed source tags (a printed question must not name the paper it came from). */
export function stripSourceTag(text: string): string {
  return String(text ?? "").replace(SOURCE_TAG, " ").replace(/[ \t]+$/g, "").replace(/\s{2,}$/g, "").trimEnd();
}
