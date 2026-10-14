// WORKSHEET-FIX-2 — text clean-up for the printed worksheet, applied at print time only (the stored rows are untouched).

const LABEL = /^\s*(?:\(([A-Ea-e])\)|([A-Ea-e])[).])\s+/;

/**
 * Many served MCQ options already carry their own letter ("A) 77/6 cm²", "(B) 154/6", "C. Carpel"), and the print doc adds its
 * own "(a)", so the paper showed "(a) (A) …". The labels are removed only when EVERY option of the question carries its own
 * label AND each letter is that option's position (a, b, c …): a question whose options merely start with "(a) and (b)"
 * (a statement-combination MCQ) or "E. coli …" is content and is returned unchanged.
 */
export function stripOptionLabels(options: readonly string[]): string[] {
  const list = options.map((o) => String(o ?? ""));
  if (list.length === 0) return list;
  const matches = list.map((o) => LABEL.exec(o));
  const allLabelled = matches.every((m, i) => m !== null && (m[1] ?? m[2]).toLowerCase() === "abcde"[i]);
  if (!allLabelled) return list;
  return list.map((o, i) => o.slice((matches[i] as RegExpExecArray)[0].length));
}

/** An exam-source tag such as "[All India 2017]", "[Delhi 2019]", "[Foreign 2016]", "[CBSE 2016-17]" or "[Delhi 2017, CBSE 2014]". */
const SOURCE_TAG = /\s*\[\s*(?:All India|Delhi|Foreign|Outside Delhi|Compartment|CBSE)[^\]]{0,40}?(?:19|20)\d\d[^\]]{0,30}\]\s*/gi;

/** The text without printed source tags (a printed question or answer must not name the paper it came from). */
export function stripSourceTag(text: string): string {
  return String(text ?? "").replace(SOURCE_TAG, " ").replace(/[ \t]+$/g, "").trimEnd();
}
